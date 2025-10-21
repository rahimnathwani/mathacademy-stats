import type {
  FrontierTopic,
  KnowledgeGraphResponse,
  EnrichedFrontierTopic,
  FrontierTopicStats
} from '@/types/mathacademy';

// Helper functions
const toNum = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const getReps = (obj: FrontierTopic | null): number | null => {
  if (!obj) return null;
  return toNum(obj?.repetitions ?? obj?.repetition);
};

const median = (arr: number[]): number | null => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const mean = (arr: number[]): number | null => {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
};

const isFrontier = (t: FrontierTopic): boolean => {
  return t?.frontier === 1 || t?.frontier === true || t?.frontier === "1";
};

export async function fetchFrontierTopics(
  courseId: number,
  studentId: number
): Promise<EnrichedFrontierTopic[]> {
  const endpoint = `https://www.mathacademy.com/api/courses/${courseId}/students/${studentId}/knowledge-graph`;

  console.log('[Frontier] Fetching from:', endpoint);

  const res = await fetch(endpoint, {
    credentials: "include",
    headers: { "accept": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data: KnowledgeGraphResponse = await res.json();
  const topicsObj = data?.topics || {};
  const topics = Object.values(topicsObj);
  const byId = new Map(topics.map(t => [Number(t.id), t]));

  console.log('[Frontier] Total topics:', topics.length);

  // Get all unique frontier values to understand the data
  const frontierValues = new Set(topics.map(t => t.frontier));
  console.log('[Frontier] Unique frontier values in response:', Array.from(frontierValues));
  console.log('[Frontier] Sample topics:', topics.slice(0, 5).map(t => ({ name: t.name, frontier: t.frontier })));

  // Build enriched frontier topic records with stats over their prereqs' repetitions
  const frontierTopics = topics.filter(isFrontier);
  console.log('[Frontier] Frontier topics found (frontier===1|true|"1"):', frontierTopics.length);

  if (frontierTopics.length === 0 && topics.length > 0) {
    console.warn('[Frontier] No topics matched the frontier filter. This might mean:');
    console.warn('  1. All frontier topics have been unlocked already');
    console.warn('  2. The frontier field uses different values than expected');
    console.warn('  3. Check the "Unique frontier values" log above to see what values exist');
  }

  const enriched: EnrichedFrontierTopic[] = frontierTopics
    .map(t => {
      const prereqIds = Array.isArray(t.prerequisites) ? t.prerequisites.map(Number) : [];
      const prereqTopics = prereqIds.map(id => byId.get(id) || null);
      const repVals = prereqTopics
        .map(p => getReps(p))
        .filter((v): v is number => v !== null);

      const stats: FrontierTopicStats = {
        min: repVals.length ? Math.min(...repVals) : null,
        max: repVals.length ? Math.max(...repVals) : null,
        median: median(repVals),
        mean: mean(repVals)
      };

      // Sort key = mean of (median, min)
      const sortKey = (stats.median === null || stats.min === null)
        ? -Infinity
        : (stats.median + stats.min) / 2;

      return { topic: t, prereqIds, prereqTopics, repVals, stats, sortKey };
    });

  // Order by sortKey descending
  enriched.sort((a, b) => b.sortKey - a.sortKey);

  return enriched;
}

export function formatNumber(n: number | null): string {
  return n === null ? "n/a" : (Math.round(n * 100) / 100).toString();
}
