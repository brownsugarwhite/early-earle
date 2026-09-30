import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { earleGradients, setGradientAmount } from '@ee/render';
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

// Earle-Verläufe vergleichen: ?verlauf=0 zeigt die alten harten Siebdruckstufen, 1 (Standard) die Verläufe.
const verlauf = new URLSearchParams(location.search).get('verlauf');
if (verlauf !== null && verlauf !== '' && Number.isFinite(Number(verlauf))) setGradientAmount(Number(verlauf));
// Dev hook for scripted A/B checks (surface, air, dither separately): window.__earleGradients
if (import.meta.env.DEV) (window as unknown as { __earleGradients?: typeof earleGradients }).__earleGradients = earleGradients;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
