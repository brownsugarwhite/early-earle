import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { parseGullMode, setGullMode } from '@ee/core';
import { earleGradients, setGradientAmount } from '@ee/render';
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

// Test switch for the gull (`?gull=always|off|auto`): every spawn, none, or the rhythm rule (default).
const gullMode = parseGullMode(new URLSearchParams(location.search).get('gull'));
if (gullMode) setGullMode(gullMode);
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
// Earle-Verläufe vergleichen: ?verlauf=0 zeigt den reinen Siebdruck (nur die harten Stufen), 1 (Standard) die Stufen
// plus Verlauf innen.
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
