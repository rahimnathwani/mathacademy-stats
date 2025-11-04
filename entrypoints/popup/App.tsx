import { useEffect, useState } from 'react';
import './App.css';
import { fetchAllActivities, getCachedActivities, clearActivityCache } from './fetchActivities';
import { downloadJSON, downloadCSV } from './downloads';
import { generateStats } from './stats';
import type { Activity } from '@/types/mathacademy';

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const hasData = activities.length > 0;

  useEffect(() => {
    const cached = getCachedActivities();
    if (cached.length > 0) {
      setActivities(cached);
      setProgress(`Loaded ${cached.length} cached activities.`);
    }
  }, []);

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

  const handleDownloadJSON = () => {
    if (hasData) {
      downloadJSON(activities);
    }
  };

  const handleDownloadCSV = () => {
    if (hasData) {
      downloadCSV(activities);
    }
  };

  const handleGenerateStats = async () => {
    if (!hasData) return;
    
    try {
      const stats = generateStats(activities);
      
      // Store both stats and raw activities in browser storage
      await browser.storage.local.set({ 
        statsData: stats,
        activitiesData: activities 
      });
      
      // runtime.getURL resolves to the fully qualified chrome-extension:// URL
      // for this extension, so we don't need to hardcode the scheme or ID.
      const statsUrl = browser.runtime.getURL('/stats.html');

      browser.tabs.create({ url: statsUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate stats');
    }
  };

  const handleGenerateOverview = async () => {
    if (!hasData) return;

    try {
      // Store activities in browser storage
      await browser.storage.local.set({
        activitiesData: activities
      });

      const overviewUrl = browser.runtime.getURL('/overview.html');
      browser.tabs.create({ url: overviewUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate overview');
    }
  };

  const handleTopicsComingSoon = async () => {
    try {
      const frontierUrl = browser.runtime.getURL('/frontier.html');
      browser.tabs.create({ url: frontierUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open topics page');
    }
  };

  const handleGenerateHistograms = async () => {
    if (!hasData) return;

    try {
      // Store activities in browser storage
      await browser.storage.local.set({
        activitiesData: activities
      });

      const histogramsUrl = browser.runtime.getURL('/histograms.html');
      browser.tabs.create({ url: histogramsUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate histograms');
    }
  };

  const handleOpenDailyXP = async () => {
    if (!hasData) return;

    try {
      await browser.storage.local.set({
        activitiesData: activities
      });

      const dailyXPUrl = browser.runtime.getURL('/daily-xp.html');
      browser.tabs.create({ url: dailyXPUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Daily XP page');
    }
  };

  const handleOpenHeatmap = async () => {
    if (!hasData) return;

    try {
      await browser.storage.local.set({
        activitiesData: activities
      });

      const heatmapUrl = browser.runtime.getURL('/heatmap.html');
      browser.tabs.create({ url: heatmapUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Heatmap page');
    }
  };

  const handleOpenTaskTypes = async () => {
    if (!hasData) return;

    try {
      await browser.storage.local.set({
        activitiesData: activities
      });

      const taskTypesUrl = browser.runtime.getURL('/task-types.html');
      browser.tabs.create({ url: taskTypesUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Task Types page');
    }
  };

  const handleOpenWeekday = async () => {
    if (!hasData) return;

    try {
      await browser.storage.local.set({
        activitiesData: activities
      });

      const weekdayUrl = browser.runtime.getURL('/weekday.html');
      browser.tabs.create({ url: weekdayUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Weekday page');
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
          <p><strong>{activities.length}</strong> activities loaded</p>
        </div>
      )}

      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}

      <div className="section">
        <h2 className="section-title">📊 View Reports</h2>
        <div className="button-group">
          <button
            onClick={handleGenerateOverview}
            disabled={!hasData || loading}
            className="report-button"
          >
            <span className="button-label">Daily Overview</span>
            <span className="button-description">Charts & activity timeline</span>
          </button>

          <button
            onClick={handleGenerateStats}
            disabled={!hasData || loading}
            className="report-button"
          >
            <span className="button-label">XP/Minute Stats</span>
            <span className="button-description">Performance by course</span>
          </button>

          <button
            onClick={handleGenerateHistograms}
            disabled={!hasData || loading}
            className="report-button"
          >
            <span className="button-label">Performance Histograms</span>
            <span className="button-description">XP/min distributions</span>
          </button>

          <button
            onClick={handleOpenDailyXP}
            disabled={!hasData || loading}
            className="report-button"
          >
            <span className="button-label">Daily XP Distribution</span>
            <span className="button-description">Histogram of daily XP totals</span>
          </button>

          <button
            onClick={handleOpenHeatmap}
            disabled={!hasData || loading}
            className="report-button"
          >
            <span className="button-label">Activity Heatmap</span>
            <span className="button-description">GitHub-style learning calendar</span>
          </button>

          <button
            onClick={handleOpenTaskTypes}
            disabled={!hasData || loading}
            className="report-button"
          >
            <span className="button-label">Task Types Analysis</span>
            <span className="button-description">Lessons, reviews, quizzes breakdown</span>
          </button>

          <button
            onClick={handleOpenWeekday}
            disabled={!hasData || loading}
            className="report-button"
          >
            <span className="button-label">Weekday Patterns</span>
            <span className="button-description">Activity by day of week</span>
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">💾 Data Management</h2>
        <div className="button-group">
          <button
            onClick={handleGetData}
            disabled={loading}
            className="primary-button"
          >
            {loading ? 'Fetching...' : hasData ? 'Refresh Activity Data' : 'Fetch Activity Data'}
          </button>

          <button
            onClick={handleClearCache}
            disabled={loading}
            className="secondary-button"
          >
            Clear Cached Data
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">📥 Export</h2>
        <div className="button-group">
          <button
            onClick={handleDownloadJSON}
            disabled={!hasData || loading}
            className="export-button"
          >
            <span className="button-label">Export as JSON</span>
            <span className="button-description">For developers & analysis</span>
          </button>

          <button
            onClick={handleDownloadCSV}
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
