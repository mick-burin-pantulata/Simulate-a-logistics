import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';

// StrictMode is omitted: its double-mount recreates the WebGL context in dev.
createRoot(document.getElementById('root')!).render(<App />);
