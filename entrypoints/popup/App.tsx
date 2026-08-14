import { useState } from 'react';
import './App.css';
import { fetchAllActivities, getCachedActivities, clearActivityCache } from './fetchActivities';
import { downloadJSON, downloadCSV } from './downloads';
import { storeActivities } from '@/utils/storage';
import type { Activity } from '@/types/mathacademy';
import type { PublicPath } from 'wxt/browser';

interface ReportPage {
  path: PublicPath;
  label: string;
  description: string;
  /** Frontier topics are fetched live from the API, not from stored activities. */
  needsData: boolean;
}

const REPORT_PAGES: ReportPage[] = [
  {
    path: '/overview.html',
    label: 'Daily Overview',
    description: 'Charts & activity timeline',
    needsData: true,
  },
  {
    path: '/stats.html',
    label: 'XP/Minute Stats',
    description: 'Performance by course',
    needsData: true,
  },
  {
    path: '/histograms.html',
    label: 'Performance Histograms',
    description: 'XP/min distributions',
    needsData: true,
  },
  {
    path: '/daily-xp.html',
    label: 'Daily XP Distribution',
    description: 'Histogram of daily XP totals',
    needsData: true,
  },
  {
    path: '/heatmap.html',
    label: 'Activity Heatmap',
    description: 'GitHub-style learning calendar',
    needsData: true,
  },
  {
    path: '/task-types.html',
    label: 'Task Types Analysis',
    description: 'Lessons, reviews, quizzes breakdown',
    needsData: true,
  },
  {
    path: '/weekday.html',
    label: 'Weekday Patterns',
    description: 'Activity by day of week',
    needsData: true,
  },
  {
    path: '/frontier.html',
    label: 'Upcoming Topics',
    description: 'Frontier topics by prerequisite strength',
    needsData: false,
  },
];

function App() {
  const [activities, setActivities] = useState<Activity[]>(getCachedActivities);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(() => {
    const cachedCount = activities.length;
    return cachedCount > 0 ? `Loaded ${cachedCount} cached activities.` : '';
  });
  const [error, setError] = useState('');

  const hasData = activities.length > 0;

  const handleGetData = async () => {
    setLoading(true);
    setError('');
    setProgress('Starting...');

    try {
      const data = await fetchAllActivities((msg) => setProgress(msg));
      setActivities(data);
      setProgress(`Successfully loaded ${data.length} activities!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    clearActivityCache();
    setActivities([]);
    setProgress('Cache cleared.');
    setError('');
  };

  const openReport = async (report: ReportPage) => {
    if (report.needsData && !hasData) return;

    try {
      if (report.needsData) {
        await storeActivities(activities);
      }
      await browser.tabs.create({ url: browser.runtime.getURL(report.path) });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to open ${report.label}`);
    }
  };

  return (
    <div className="app">
      <h1>Math Academy Stats</h1>

      {!hasData && (
        <div className="welcome-message">
          <p>Welcome! Get started by fetching your activity data from Math Academy.</p>
        </div>
      )}

      {hasData && (
        <div className="info">
          <p>
            <strong>{activities.length}</strong> activities loaded
          </p>
        </div>
      )}

      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}

      <div className="section">
        <h2 className="section-title">📊 View Reports</h2>
        <div className="button-group">
          {REPORT_PAGES.map((report) => (
            <button
              key={report.path}
              onClick={() => openReport(report)}
              disabled={(report.needsData && !hasData) || loading}
              className="report-button"
            >
              <span className="button-label">{report.label}</span>
              <span className="button-description">{report.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">💾 Data Management</h2>
        <div className="button-group">
          <button onClick={handleGetData} disabled={loading} className="primary-button">
            {loading ? 'Fetching...' : hasData ? 'Refresh Activity Data' : 'Fetch Activity Data'}
          </button>

          <button onClick={handleClearCache} disabled={loading} className="secondary-button">
            Clear Cached Data
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">📥 Export</h2>
        <div className="button-group">
          <button
            onClick={() => downloadJSON(activities)}
            disabled={!hasData || loading}
            className="export-button"
          >
            <span className="button-label">Export as JSON</span>
            <span className="button-description">For developers & analysis</span>
          </button>

          <button
            onClick={() => downloadCSV(activities)}
            disabled={!hasData || loading}
            className="export-button"
          >
            <span className="button-label">Export as CSV</span>
            <span className="button-description">For Excel & spreadsheets</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
