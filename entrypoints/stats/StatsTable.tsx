import { useEffect, useState } from 'react';
import type { CourseStats } from '@/types/mathacademy';

export default function StatsTable() {
  const [stats, setStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load stats from browser storage
    browser.storage.local.get('statsData').then((result) => {
      if (result.statsData) {
        setStats(result.statsData);
        setLoading(false);
      } else {
        setError('No stats data found. Please generate stats from the popup first.');
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

  if (stats.length === 0) {
    return (
      <div className="container">
        <h1>Math Academy Stats</h1>
        <p>No stats available.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Math Academy Stats - XP per Minute by Course</h1>
      <p className="description">
        Statistics for activities completed in 2 hours or less, showing XP earned per minute of study time.
      </p>
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
    </div>
  );
}

