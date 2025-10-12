import { useState } from 'react';
import './App.css';
import { fetchAllActivities } from './fetchActivities';
import { downloadJSON, downloadCSV } from './downloads';
import { generateStats } from './stats';
import type { Activity } from '@/types/mathacademy';

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
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

  return (
    <div className="app">
      <h1>Math Academy Stats</h1>
      
      <div className="button-group">
        <button 
          onClick={handleGetData} 
          disabled={loading}
          className="primary-button"
        >
          {loading ? 'Loading...' : 'Get Activity Data'}
        </button>
        
        <button 
          onClick={handleDownloadJSON} 
          disabled={!hasData || loading}
        >
          Download JSON
        </button>
        
        <button 
          onClick={handleDownloadCSV} 
          disabled={!hasData || loading}
        >
          Download CSV
        </button>
        
        <button 
          onClick={handleGenerateStats} 
          disabled={!hasData || loading}
        >
          Generate Stats
        </button>
      </div>
      
      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}
      
      {hasData && (
        <div className="info">
          <p><strong>{activities.length}</strong> activities loaded</p>
        </div>
      )}
    </div>
  );
}

export default App;
