import { useEffect, useState } from 'react';
import {
  fetchFrontierTopics,
  formatNumber,
  getTopicRepetitions,
  getTopicHalfLife,
} from './fetchFrontierTopics';
import { getMathAcademyIds } from './getMathAcademyIds';
import type { EnrichedFrontierTopic } from '@/types/mathacademy';
import './frontier.css';

function FrontierPage() {
  const [topics, setTopics] = useState<EnrichedFrontierTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadTopics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get studentId, courseId, and hostname from the Math Academy page
        const { studentId, courseId, hostname, error: idsError } = await getMathAcademyIds();

        if (idsError || !studentId || !courseId || !hostname) {
          throw new Error(
            idsError ||
              'Could not find studentId or courseId. Please make sure you have a Math Academy tab open and are logged in.'
          );
        }

        setTopics(await fetchFrontierTopics(courseId, studentId, hostname));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load frontier topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  const toggleTopic = (topicId: number) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="frontier-page">
        <div className="loading">Loading frontier topics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="frontier-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="frontier-page">
      <header className="page-header">
        <h1>Upcoming Topics</h1>
        <p className="subtitle">
          Frontier topics ordered by prerequisite solidity (based on half-life)
        </p>
        <div className="topic-count">{topics.length} topics ready to unlock</div>
      </header>

      <div className="topics-list">
        {topics.map(({ topic, prereqIds, prereqTopics, stats }) => {
          const isExpanded = expandedTopics.has(topic.id);
          const hasPrereqs = prereqIds.length > 0;

          // Sort prerequisites by half-life descending (most solid first)
          const sortedPrereqs = prereqIds
            .map((id, idx) => ({
              id,
              name: prereqTopics[idx]?.name ?? `[missing topic #${id}]`,
              reps: getTopicRepetitions(prereqTopics[idx]),
              halfLife: getTopicHalfLife(prereqTopics[idx]),
            }))
            .sort((a, b) => {
              if (a.halfLife === null && b.halfLife === null) return a.name.localeCompare(b.name);
              if (a.halfLife === null) return 1;
              if (b.halfLife === null) return -1;
              return b.halfLife - a.halfLife || a.name.localeCompare(b.name);
            });

          return (
            <div key={topic.id} className="topic-card">
              <div
                className={`topic-header ${hasPrereqs ? 'clickable' : ''}`}
                onClick={() => hasPrereqs && toggleTopic(topic.id)}
              >
                <div className="topic-main">
                  <h2 className="topic-name">{topic.name}</h2>
                  <div className="topic-stats">
                    <div className="stat-group">
                      <span className="stat-group-label">Half-Life (days):</span>
                      <span className="stat-item">
                        <span className="stat-label">Mean:</span>
                        <span className="stat-value">{formatNumber(stats.halfLifeMean)}</span>
                      </span>
                      <span className="stat-item">
                        <span className="stat-label">Median:</span>
                        <span className="stat-value">{formatNumber(stats.halfLifeMedian)}</span>
                      </span>
                      <span className="stat-item">
                        <span className="stat-label">Min:</span>
                        <span className="stat-value">{formatNumber(stats.halfLifeMin)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                {hasPrereqs && <div className="expand-icon">{isExpanded ? '▼' : '▶'}</div>}
              </div>

              {isExpanded && hasPrereqs && (
                <div className="prerequisites">
                  <h3 className="prereq-header">Prerequisites ({prereqIds.length})</h3>
                  <ul className="prereq-list">
                    {sortedPrereqs.map(({ id, name, reps, halfLife }) => (
                      <li key={id} className="prereq-item">
                        <span className="prereq-name">{name}</span>
                        <span className="prereq-stats">
                          <span className="prereq-half-life">
                            {halfLife === null ? '?' : formatNumber(halfLife)} days
                          </span>
                          <span className="prereq-reps">({reps === null ? '?' : reps} reps)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasPrereqs && <div className="no-prereqs">No prerequisites</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FrontierPage;
