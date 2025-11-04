import { createRoot } from 'react-dom/client';
import TaskTypesPage from './TaskTypesPage';
import './task-types.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<TaskTypesPage />);
}
