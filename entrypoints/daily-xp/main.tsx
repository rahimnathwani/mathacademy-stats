import { createRoot } from 'react-dom/client';
import DailyXPPage from './DailyXPPage';
import './daily-xp.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<DailyXPPage />);
}
