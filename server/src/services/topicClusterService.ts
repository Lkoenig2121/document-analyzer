import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import {
  DEFAULT_FUZZY_TOPIC_THRESHOLD,
  topicSimilarityScore,
} from '../lib/topicSimilarity.js';
import {
  normalizeTopic,
  normalizeTopics,
  topicKey,
} from '../lib/topicNormalization.js';
import { embedTexts } from './embeddingService.js';
import { env } from '../config/env.js';

export interface TopicCluster {
  canonical: string;
  members: string[];
}

function pickCanonicalLabel(labels: string[]): string {
  const counts = new Map<string, number>();

  for (const label of labels) {
    const canonical = normalizeTopic(label);

    if (!canonical) {
      continue;
    }

    counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].length - right[0].length;
  });

  return ranked[0]?.[0] ?? normalizeTopic(labels[0] ?? '');
}

function mergeClusterMembers(clusters: TopicCluster[]): TopicCluster {
  const members = [...new Set(clusters.flatMap((cluster) => cluster.members))];

  return {
    canonical: pickCanonicalLabel(members),
    members,
  };
}

function clusterTopicsFuzzy(
  topics: string[],
  threshold: number = DEFAULT_FUZZY_TOPIC_THRESHOLD,
): TopicCluster[] {
  const unique = [...new Set(topics.map((topic) => topic.trim()).filter(Boolean))];

  if (unique.length === 0) {
    return [];
  }

  const parent = unique.map((_, index) => index);

  function find(index: number): number {
    if (parent[index] !== index) {
      parent[index] = find(parent[index] ?? index);
    }

    return parent[index] ?? index;
  }

  function union(left: number, right: number): void {
    const rootLeft = find(left);
    const rootRight = find(right);

    if (rootLeft !== rootRight) {
      parent[rootRight] = rootLeft;
    }
  }

  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      const left = unique[i] ?? '';
      const right = unique[j] ?? '';

      if (topicsAreSimilarPair(left, right, threshold)) {
        union(i, j);
      }
    }
  }

  const grouped = new Map<number, string[]>();

  for (let index = 0; index < unique.length; index += 1) {
    const root = find(index);
    const bucket = grouped.get(root) ?? [];
    bucket.push(unique[index] ?? '');
    grouped.set(root, bucket);
  }

  return [...grouped.values()].map((members) => ({
    canonical: pickCanonicalLabel(members),
    members,
  }));
}

function topicsAreSimilarPair(a: string, b: string, threshold: number): boolean {
  if (topicSimilarityScore(a, b) >= threshold) {
    return true;
  }

  return topicSimilarityScore(normalizeTopic(a), normalizeTopic(b)) >= threshold;
}

function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);

  if (length === 0) {
    return 0;
  }

  let dot = 0;

  for (let index = 0; index < length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }

  return dot;
}

async function mergeClustersByEmbedding(
  clusters: TopicCluster[],
  threshold: number,
): Promise<TopicCluster[]> {
  if (clusters.length <= 1) {
    return clusters;
  }

  const labels = clusters.map((cluster) => cluster.canonical);
  const embeddings = await embedTexts(labels, { forStorage: true });
  const parent = clusters.map((_, index) => index);

  function find(index: number): number {
    if (parent[index] !== index) {
      parent[index] = find(parent[index] ?? index);
    }

    return parent[index] ?? index;
  }

  function union(left: number, right: number): void {
    const rootLeft = find(left);
    const rootRight = find(right);

    if (rootLeft !== rootRight) {
      parent[rootRight] = rootLeft;
    }
  }

  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      const similarity = cosineSimilarity(
        embeddings[i]?.embedding ?? [],
        embeddings[j]?.embedding ?? [],
      );

      if (similarity >= threshold) {
        union(i, j);
      }
    }
  }

  const grouped = new Map<number, TopicCluster[]>();

  for (let index = 0; index < clusters.length; index += 1) {
    const root = find(index);
    const bucket = grouped.get(root) ?? [];
    bucket.push(clusters[index] ?? { canonical: '', members: [] });
    grouped.set(root, bucket);
  }

  return [...grouped.values()].map((group) => mergeClusterMembers(group));
}

/**
 * Clusters topics with fuzzy matching first, then optional embedding merge
 * for semantically similar labels that string matching would miss.
 */
export async function clusterTopicsHybrid(
  topics: string[],
  options: {
    fuzzyThreshold?: number;
    embeddingThreshold?: number;
    useEmbeddings?: boolean;
  } = {},
): Promise<TopicCluster[]> {
  const fuzzyThreshold = options.fuzzyThreshold ?? DEFAULT_FUZZY_TOPIC_THRESHOLD;
  const embeddingThreshold =
    options.embeddingThreshold ?? env.TOPIC_EMBEDDING_SIMILARITY_THRESHOLD;
  const useEmbeddings = options.useEmbeddings ?? true;

  let clusters = clusterTopicsFuzzy(topics, fuzzyThreshold);

  if (!useEmbeddings || clusters.length <= 1) {
    return clusters;
  }

  try {
    clusters = await mergeClustersByEmbedding(clusters, embeddingThreshold);
  } catch (error) {
    logger.warn({ err: error }, 'Topic embedding clustering failed; using fuzzy clusters only');
  }

  return clusters;
}

export async function fetchDistinctUserTopics(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ topic: string }>>`
    SELECT DISTINCT topic
    FROM "DocumentAnalysis" a
    INNER JOIN "Document" d ON d.id = a."documentId"
    CROSS JOIN LATERAL unnest(a.topics) AS topic
    WHERE d."userId" = ${userId}
      AND topic <> ''
    ORDER BY topic ASC
  `;

  return rows.map((row) => row.topic);
}

export function findClusterForTopic(
  clusters: TopicCluster[],
  topic: string,
): TopicCluster | null {
  const key = topicKey(topic);
  const normalizedKey = topicKey(normalizeTopic(topic));

  for (const cluster of clusters) {
    const matches = cluster.members.some((member) => {
      const memberKey = topicKey(member);
      const memberNormalizedKey = topicKey(normalizeTopic(member));

      return (
        memberKey === key ||
        memberNormalizedKey === key ||
        memberKey === normalizedKey ||
        memberNormalizedKey === normalizedKey
      );
    });

    if (matches || topicKey(cluster.canonical) === key) {
      return cluster;
    }
  }

  return null;
}

export function expandTopicClusterValues(
  clusters: TopicCluster[],
  topic: string,
): string[] {
  const cluster = findClusterForTopic(clusters, topic);

  if (!cluster) {
    const canonical = normalizeTopic(topic);
    return canonical ? [canonical, topic.trim()].filter(Boolean) : [];
  }

  return [...new Set([cluster.canonical, ...cluster.members])];
}

/**
 * Maps newly analyzed topics onto the user's existing topic vocabulary
 * so near-duplicates do not accumulate in the database.
 */
export async function finalizeTopicsForUser(
  userId: string,
  topics: string[],
): Promise<string[]> {
  const batchNormalized = normalizeTopics(topics);
  const existingRaw = await fetchDistinctUserTopics(userId);

  if (existingRaw.length === 0) {
    return batchNormalized;
  }

  const clusters = await clusterTopicsHybrid([...existingRaw, ...batchNormalized]);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const topic of batchNormalized) {
    const cluster = findClusterForTopic(clusters, topic);
    const canonical = cluster?.canonical ?? normalizeTopic(topic);
    const key = topicKey(canonical);

    if (!canonical || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(canonical);
  }

  return result;
}

/**
 * Distinct canonical topics for filter chips, merged across the user's corpus.
 */
export async function listCanonicalUserTopics(userId: string): Promise<string[]> {
  const rawTopics = await fetchDistinctUserTopics(userId);
  const clusters = await clusterTopicsHybrid(rawTopics);

  return clusters
    .map((cluster) => cluster.canonical)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Builds cluster-aware filter variants for one selected topic chip.
 */
export async function expandTopicFilterForUser(
  userId: string,
  topic: string,
): Promise<string[]> {
  const rawTopics = await fetchDistinctUserTopics(userId);
  const clusters = await clusterTopicsHybrid(rawTopics);
  const expanded = expandTopicClusterValues(clusters, topic);

  if (expanded.length > 0) {
    return expanded;
  }

  const canonical = normalizeTopic(topic);
  return canonical ? [canonical] : [];
}
