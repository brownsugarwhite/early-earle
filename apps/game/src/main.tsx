import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { parseGullMode, setGullMode } from '@ee/core';
import { App } from './App';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/app.css';

// Test builds only (simulator screenshots without taps): VITE_START_ROUTE=/werkstatt?test=1 opens that route at launch;
// several routes separated by "|" are visited in turn (VITE_START_TOUR_MS apart, default 15 s).
const tour = ((import.meta.env.VITE_START_ROUTE as string | undefined) ?? '').split('|').filter((r) => r.startsWith('/'));
if (tour.length && location.pathname === '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  history.replaceState(null, '', base + tour[0]);
  let i = 0;
  if (tour.length > 1)
    setInterval(() => {
      i = (i + 1) % tour.length;
      history.pushState(null, '', base + tour[i]);
      dispatchEvent(new PopStateEvent('popstate'));
    }, Number(import.meta.env.VITE_START_TOUR_MS) || 15000);
}

// Test switch for the gull (`?gull=always|off|auto`): every spawn, none, or the rhythm rule (default).
const gullMode = parseGullMode(new URLSearchParams(location.search).get('gull'));
if (gullMode) setGullMode(gullMode);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
