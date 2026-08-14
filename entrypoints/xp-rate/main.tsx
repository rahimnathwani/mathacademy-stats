import { createRoot } from 'react-dom/client';
import XPRatePage from './XPRatePage';
import './xp-rate.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<XPRatePage />);
}
