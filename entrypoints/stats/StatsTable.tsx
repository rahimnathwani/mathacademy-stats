import { useEffect, useState } from 'react';
import type { CourseStats, Activity } from '@/types/mathacademy';
import { generateStats } from '../popup/stats';

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
  const [statsByType, setStatsByType] = useState<StatsByType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load activities from browser storage
    browser.storage.local.get('activitiesData').then((result) => {
      if (result.activitiesData) {
        const activities = result.activitiesData as Activity[];
        
        // Generate stats for all activity types
        const stats: StatsByType = {
          all: generateStats(activities),
          lesson: generateStats(activities, 'Lesson'),
          review: generateStats(activities, 'Review'),
          quiz: generateStats(activities, 'Quiz'),
          multistep: generateStats(activities, 'Multistep'),
          placement: generateStats(activities, 'Placement'),
          supplemental: generateStats(activities, 'Supplemental'),
        };
        
        setStatsByType(stats);
        setLoading(false);
      } else {
        setError('No activities data found. Please generate stats from the popup first.');
        setLoading(false);
      }
    }).catch((err) => {
      setError(`Error loading stats: ${err.message}`);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="container">
        <h1>Math Academy Stats</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Math Academy Stats</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!statsByType) {
    return (
      <div className="container">
        <h1>Math Academy Stats</h1>
        <p>No stats available.</p>
      </div>
    );
  }

  const thresholds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

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
        Statistics for activities completed in 2 hours or less, showing XP earned per minute of study time.
      </p>
      
      <div className="note-box">
        <strong>Note:</strong> Activities that took more than 2 hours are excluded from these statistics. 
        We assume that if an activity took more than 2 hours, the user didn't work continuously on that 
        lesson but had a break, so including those data would be misleading. Unfortunately, we can't track 
        exactly when you were working or not.
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

