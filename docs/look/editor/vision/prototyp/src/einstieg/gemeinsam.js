// Gemeinsamer Einstieg der Vollbild-Prototypen: Form (Standard: strange bird), Maus anbinden, Ton, losleben.
import { mausAnbinden } from '../werkstatt/maus.js';
import { Ton } from '../ton.js';
import { PAR } from '../parameter.js';

export function starten(Layout, opt = {}) {
  if (!PAR.get('form')) PAR.set('form', opt.form || 'vogel');
  if (opt.grund) document.body.style.background = opt.grund;
  const leinwand = document.getElementById('leinwand');
  const app = new Layout(leinwand, document.getElementById('oben'));
  mausAnbinden(app, leinwand);
  app.ton = PAR.get('ton') === '1' ? new Ton() : null;
  app.tonUmschalten = () => {
    app.ton = app.ton ? null : new Ton();
    if (app.ton) app.ton.wecken();
  };
  app.start();
  window.__app = app;
  addEventListener('hashchange', () => location.reload());
  return app;
}
