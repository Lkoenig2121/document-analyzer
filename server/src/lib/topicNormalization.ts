import {
  DEFAULT_FUZZY_TOPIC_THRESHOLD,
  topicSimilarityScore,
} from './topicSimilarity.js';

/**
 * Collapses near-duplicate AI topic labels into a single canonical form.
 * Applied on analysis save, topic listing, and DB backfill.
 */

/** Lowercase, hyphen/space-insensitive lookup key → display label. */
const TOPIC_ALIASES: Record<string, string> = {
  // Career / resume cluster
  career: 'Career',
  'career details': 'Career',
  'career history': 'Career',
  'career resume': 'Career',
  resume: 'Career',

  // Full-stack cluster
  'full stack development': 'Full-Stack Development',
  'full-stack development': 'Full-Stack Development',
  'fullstack development': 'Full-Stack Development',
  'full stack engineering': 'Full-Stack Development',
  'full-stack engineering': 'Full-Stack Development',
  'fullstack engineering': 'Full-Stack Development',
  'full stack': 'Full-Stack Development',
  'full-stack': 'Full-Stack Development',

  // Mobile cluster
  'mobile application development': 'Mobile Development',
  'mobile app development': 'Mobile Development',
  'mobile development': 'Mobile Development',
  mobile: 'Mobile Development',

  // Typography cluster
  typography: 'Typography',
  typefaces: 'Typography',
  typeface: 'Typography',
  fonts: 'Typography',
  'font scales': 'Typography',

  // Design cluster
  'ui/ux design': 'UI/UX Design',
  'ui ux design': 'UI/UX Design',
  'ux design': 'UI/UX Design',
  'ui design': 'UI/UX Design',

  // Web
  'web development': 'Web Development',
  web: 'Web Development',
};

export function topicKey(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Title-case fallback when no alias matches; preserves known acronyms like UI/UX. */
function titleCaseTopic(topic: string): string {
  const ACRONYMS = new Set(['ui', 'ux', 'api', 'ai', 'ml', 'cv', 'pdf', 'sql', 'hr']);

  return topic
    .trim()
    .split(/(\s+|\/)/)
    .map((part) => {
      if (part === '/' || /^\s+$/.test(part)) {
        return part;
      }
      if (ACRONYMS.has(part.toLowerCase())) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

/** Maps one topic string to its canonical display label. */
export function normalizeTopic(topic: string): string {
  const trimmed = topic.trim();
  if (!trimmed) {
    return '';
  }

  const key = topicKey(trimmed);
  return TOPIC_ALIASES[key] ?? titleCaseTopic(trimmed);
}

/**
 * Merges fuzzy near-duplicates within one topic list (same document batch).
 */
function mergeSimilarTopicsInBatch(
  topics: string[],
  threshold: number = DEFAULT_FUZZY_TOPIC_THRESHOLD,
): string[] {
  const result: string[] = [];

  for (const topic of topics) {
    const matchIndex = result.findIndex(
      (existing) => topicSimilarityScore(existing, topic) >= threshold,
    );

    if (matchIndex === -1) {
      result.push(topic);
      continue;
    }

    const existing = result[matchIndex] ?? topic;
    result[matchIndex] = pickShorterCanonical(existing, topic);
  }

  return result;
}

function pickShorterCanonical(left: string, right: string): string {
  const leftCanonical = normalizeTopic(left);
  const rightCanonical = normalizeTopic(right);

  if (leftCanonical.length === rightCanonical.length) {
    return leftCanonical;
  }

  return leftCanonical.length < rightCanonical.length ? leftCanonical : rightCanonical;
}

/**
 * Normalizes a list of topics, drops empties, and de-duplicates
 * (case/alias/fuzzy insensitive) while preserving first-seen order.
 */
export function normalizeTopics(topics: string[]): string[] {
  const seen = new Set<string>();
  const aliasNormalized: string[] = [];

  for (const topic of topics) {
    const canonical = normalizeTopic(topic);
    if (!canonical) {
      continue;
    }

    const key = topicKey(canonical);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    aliasNormalized.push(canonical);
  }

  return mergeSimilarTopicsInBatch(aliasNormalized);
}

/**
 * All known labels (including aliases) that normalize to the same canonical topic.
 * Used so filters still match pre-backfill rows.
 */
export function expandTopicFilterValues(topic: string): string[] {
  const canonical = normalizeTopic(topic);
  if (!canonical) {
    return [];
  }

  const canonicalKey = topicKey(canonical);
  const variants = new Set<string>([canonical]);

  for (const [aliasKey, aliasCanonical] of Object.entries(TOPIC_ALIASES)) {
    if (topicKey(aliasCanonical) === canonicalKey) {
      variants.add(titleCaseTopic(aliasKey));
    }
  }

  // Explicit raw spellings that appear in Gemini / legacy rows
  if (canonicalKey === 'full-stack development') {
    variants.add('Full Stack Development');
    variants.add('Full-Stack Development');
    variants.add('Full-Stack Engineering');
    variants.add('Full Stack Engineering');
  }
  if (canonicalKey === 'career') {
    variants.add('Career Details');
    variants.add('Career History');
    variants.add('Career Resume');
    variants.add('Resume');
    variants.add('Career');
  }
  if (canonicalKey === 'mobile development') {
    variants.add('Mobile Application Development');
    variants.add('Mobile Development');
  }
  if (canonicalKey === 'typography') {
    variants.add('Typography');
    variants.add('Typefaces');
    variants.add('Font Scales');
  }

  return [...variants];
}
