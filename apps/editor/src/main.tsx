import '@fontsource/irish-grover';
import './styles/tokens.css';
import './styles/editor.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
