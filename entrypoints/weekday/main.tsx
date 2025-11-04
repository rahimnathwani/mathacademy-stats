import { createRoot } from 'react-dom/client';
import WeekdayPage from './WeekdayPage';
import './weekday.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<WeekdayPage />);
}
