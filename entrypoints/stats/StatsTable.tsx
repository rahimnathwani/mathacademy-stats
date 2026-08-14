import { useMemo } from 'react';
import type { Activity, CourseStats } from '@/types/mathacademy';
import { useStoredActivities } from '@/hooks/useStoredActivities';
import { PageStatus } from '@/components/PageStatus';
import { classifyActivity, type ActivityCategory } from '@/utils/classify-activity';
import { generateStats, XP_THRESHOLDS } from '../popup/stats';

const byCategory = (category: ActivityCategory) => (activity: Activity) =>
  classifyActivity(activity) === category;

interface StatsByType {
  all: CourseStats[];
  lesson: CourseStats[];
  review: CourseStats[];
  quiz: CourseStats[];
  multistep: CourseStats[];
  placement: CourseStats[];
  supplemental: CourseStats[];
}

export default function StatsTable() {
  const { activities, loading, error, ready } = useStoredActivities();

  // Generate stats for all activity types
  const statsByType: StatsByType = useMemo(
    () => ({
      all: generateStats(activities),
      lesson: generateStats(activities, byCategory('lesson')),
      review: generateStats(activities, byCategory('review')),
      quiz: generateStats(activities, byCategory('quiz')),
      multistep: generateStats(activities, byCategory('multistep')),
      // Finer-grained than the diagnostic category: these are raw API types
      placement: generateStats(activities, (a) => a.type === 'Placement'),
      supplemental: generateStats(activities, (a) => a.type === 'Supplemental'),
    }),
    [activities]
  );

  if (!ready) {
    return <PageStatus className="container" loading={loading} error={error} />;
  }

  const thresholds = XP_THRESHOLDS;

  const renderStatsSection = (title: string, stats: CourseStats[]) => {
    if (stats.length === 0) {
      return (
        <div key={title} className="stats-section">
          <h2 className="main-section-title">{title}</h2>
          <p className="no-data">No activities of this type found.</p>
        </div>
      );
    }

    return (
      <div key={title} className="stats-section">
        <h2 className="main-section-title">{title}</h2>

        <h3 className="subsection-title">XP per Minute by Course</h3>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Activity Count</th>
              <th>25th Percentile</th>
              <th>50th Percentile (Median)</th>
              <th>75th Percentile</th>
              <th>% Activities ≥ 1 XP/min</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.courseName}>
                <td className="course-name">{stat.courseName}</td>
                <td className="activity-count">{stat.activityCount}</td>
                <td className="percentile">{stat.percentile25.toFixed(2)}</td>
                <td className="percentile">{stat.percentile50.toFixed(2)}</td>
                <td className="percentile">{stat.percentile75.toFixed(2)}</td>
                <td className="percent">{stat.percentAboveOne.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="subsection-title">XP per Minute Thresholds Achievement</h3>
        <p className="description">
          Percentage of activities that achieved at least the specified XP per minute threshold.
        </p>
        <table className="stats-table threshold-table">
          <thead>
            <tr>
              <th>Course Name</th>
              {thresholds.map((threshold) => (
                <th key={threshold}>≥ {threshold.toFixed(2)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.courseName}>
                <td className="course-name">{stat.courseName}</td>
                {thresholds.map((threshold) => (
                  <td key={threshold} className="percent">
                    {stat.thresholdPercentages[threshold].toFixed(1)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container">
      <h1>Math Academy Stats - XP per Minute by Course</h1>
      <p className="description">
        Statistics for activities completed in 2 hours or less, showing XP earned per minute of
        study time.
      </p>

      <div className="note-box">
        <strong>Note:</strong> Activities that took more than 2 hours are excluded from these
        statistics. We assume that if an activity took more than 2 hours, the user didn't work
        continuously on that lesson but had a break, so including those data would be misleading.
        Unfortunately, we can't track exactly when you were working or not.
      </div>

      {renderStatsSection('All Activities', statsByType.all)}
      {renderStatsSection('Lessons Only', statsByType.lesson)}
      {renderStatsSection('Reviews Only', statsByType.review)}
      {renderStatsSection('Quizzes Only', statsByType.quiz)}
      {renderStatsSection('Multistep Only', statsByType.multistep)}
      {renderStatsSection('Placement Only', statsByType.placement)}
      {renderStatsSection('Supplemental Only', statsByType.supplemental)}
    </div>
  );
}
