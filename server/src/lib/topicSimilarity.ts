import { topicKey } from './topicNormalization.js';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'for',
  'in',
  'on',
  'to',
  'with',
  'by',
  'from',
]);

/** Tokenize a topic for overlap-based similarity. */
export function topicTokens(topic: string): string[] {
  return topicKey(topic)
    .replace(/[^a-z0-9\s/+.-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1;
  }

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

/** Share of the smaller token set contained in the larger set. */
function containmentScore(a: Set<string>, b: Set<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];

  if (small.size === 0) {
    return 0;
  }

  let contained = 0;

  for (const token of small) {
    if (large.has(token)) {
      contained += 1;
    }
  }

  return contained / small.size;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j] ?? 0;
    }
  }

  return previous[b.length] ?? 0;
}

function normalizedLevenshtein(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(a, b) / maxLength;
}

/**
 * Returns a score in [0, 1] where higher means more likely the same topic.
 * Combines token overlap, substring matches, and normalized edit distance.
 */
export function topicSimilarityScore(a: string, b: string): number {
  const keyA = topicKey(a);
  const keyB = topicKey(b);

  if (!keyA || !keyB) {
    return 0;
  }

  if (keyA === keyB) {
    return 1;
  }

  if (keyA.includes(keyB) || keyB.includes(keyA)) {
    const shorter = Math.min(keyA.length, keyB.length);
    const longer = Math.max(keyA.length, keyB.length);

    // Avoid merging unrelated short substrings (e.g. "ai" inside "training").
    if (shorter >= 4 || shorter / longer >= 0.6) {
      return 0.92;
    }
  }

  const tokensA = new Set(topicTokens(a));
  const tokensB = new Set(topicTokens(b));
  const jaccardScore = jaccard(tokensA, tokensB);
  const containment = containmentScore(tokensA, tokensB);
  const editScore = normalizedLevenshtein(
    keyA.replace(/\s+/g, ''),
    keyB.replace(/\s+/g, ''),
  );

  return Math.max(jaccardScore, containment * 0.95, editScore * 0.85);
}

export function topicsAreSimilar(
  a: string,
  b: string,
  threshold: number = DEFAULT_FUZZY_TOPIC_THRESHOLD,
): boolean {
  return topicSimilarityScore(a, b) >= threshold;
}

export const DEFAULT_FUZZY_TOPIC_THRESHOLD = 0.62;
