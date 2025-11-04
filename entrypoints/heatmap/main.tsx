import { createRoot } from 'react-dom/client';
import HeatmapPage from './HeatmapPage';
import './heatmap.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<HeatmapPage />);
}
