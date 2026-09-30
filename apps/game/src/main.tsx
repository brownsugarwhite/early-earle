import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { boot } from './boot/bootProgress';
import type { EeBoot } from './boot/bootInline';
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

// Loader aus index.html übernehmen (gleicher Stamm, keine Lücke); das Bündel läuft.
const inlineBoot = (window as unknown as { __eeBoot?: EeBoot }).__eeBoot;
boot.adopt(inlineBoot);
boot.done('bundle');
if (import.meta.env.DEV) (window as unknown as { __eeBootProgress?: unknown }).__eeBootProgress = boot;
void boot.track('font', document.fonts?.load('64px "EE Heavy"') ?? Promise.resolve());
// Nur `/` zeigt Loader und Splash; andere Einstiegsrouten (/play, Labs, Editoren) räumen ihn sofort weg.
{
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = (location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname) || '/';
  if (path !== '/') {
    inlineBoot?.stop();
    boot.detach();
    document.getElementById('ee-splash')?.remove();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
