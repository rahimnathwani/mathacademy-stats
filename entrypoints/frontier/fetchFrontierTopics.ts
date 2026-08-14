import type {
  FrontierTopic,
  KnowledgeGraphResponse,
  KnowledgeGraphTopic,
  EnrichedFrontierTopic,
  FrontierTopicStats,
} from '@/types/mathacademy';

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** A topic from either the knowledge graph or the legacy frontier shape. */
export type TopicLike = KnowledgeGraphTopic | FrontierTopic;

/** The API uses `repetition` or `repetitions` depending on the topic shape. */
export function getTopicRepetitions(topic: TopicLike | null): number | null {
  if (!topic) return null;
  const raw = ('repetitions' in topic ? topic.repetitions : undefined) ?? topic.repetition;
  return raw == null ? null : toFiniteNumber(raw);
}

export function getTopicHalfLife(topic: TopicLike | null): number | null {
  if (!topic || !('halfLife' in topic)) return null;
  return toFiniteNumber(topic.halfLife);
}

const median = (arr: number[]): number | null => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const mean = (arr: number[]): number | null => {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
};

const isFrontier = (t: TopicLike): boolean => {
  return t.frontier === 1 || t.frontier === true || t.frontier === '1';
};

export async function fetchFrontierTopics(
  courseId: number,
  studentId: number,
  hostname: string = 'mathacademy.com'
): Promise<EnrichedFrontierTopic[]> {
  const endpoint = `https://${hostname}/api/courses/${courseId}/students/${studentId}/knowledge-graph`;

  const res = await fetch(endpoint, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data: KnowledgeGraphResponse = await res.json();
  const topics = Object.values(data?.topics || {});
  const byId = new Map(topics.map((t) => [Number(t.id), t]));

  const frontierTopics = topics.filter(isFrontier);

  if (frontierTopics.length === 0 && topics.length > 0) {
    console.warn(
      '[Math Academy Stats] No topics matched the frontier filter. Either all frontier topics ' +
        'are unlocked already, or the API now encodes `frontier` differently. Values seen:',
      Array.from(new Set(topics.map((t) => t.frontier)))
    );
  }

  // Build enriched frontier topic records with stats over their prereqs' repetitions
  const enriched: EnrichedFrontierTopic[] = frontierTopics.map((t) => {
    const prereqIds = Array.isArray(t.prerequisites) ? t.prerequisites.map(Number) : [];
    const prereqTopics = prereqIds.map((id) => byId.get(id) || null);
    const repVals = prereqTopics
      .map((p) => getTopicRepetitions(p))
      .filter((v): v is number => v !== null);

    const halfLifeVals = prereqTopics
      .map((p) => getTopicHalfLife(p))
      .filter((v): v is number => v !== null);

    const stats: FrontierTopicStats = {
      min: repVals.length ? Math.min(...repVals) : null,
      max: repVals.length ? Math.max(...repVals) : null,
      median: median(repVals),
      mean: mean(repVals),
      halfLifeMin: halfLifeVals.length ? Math.min(...halfLifeVals) : null,
      halfLifeMax: halfLifeVals.length ? Math.max(...halfLifeVals) : null,
      halfLifeMedian: median(halfLifeVals),
      halfLifeMean: mean(halfLifeVals),
    };

    // Sort key = mean of (halfLifeMedian, halfLifeMin) - higher half-life means more solid knowledge
    const sortKey =
      stats.halfLifeMedian === null || stats.halfLifeMin === null
        ? -Infinity
        : (stats.halfLifeMedian + stats.halfLifeMin) / 2;

    return { topic: t, prereqIds, prereqTopics, repVals, halfLifeVals, stats, sortKey };
  });

  // Order by sortKey descending (higher half-life = more solid prerequisites)
  enriched.sort((a, b) => b.sortKey - a.sortKey);

  return enriched;
}

export function formatNumber(n: number | null): string {
  return n === null ? 'n/a' : (Math.round(n * 100) / 100).toString();
}
