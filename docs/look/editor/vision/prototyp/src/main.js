// Einstieg: Raum aufbauen, Grammatik anbinden, losleben.
import { App } from './bild.js';
import './werkzeuge.js';
import { eingabeAnbinden } from './eingabe.js';
import { Ton } from './ton.js';
import { filmAnbinden } from './film.js';

const app = new App(document.getElementById('leinwand'), document.getElementById('oben'));
eingabeAnbinden(app, document.getElementById('leinwand'));
app.ton = new URLSearchParams(location.search).get('ton') === '1' ? new Ton() : null;
app.tonUmschalten = () => {
  app.ton = app.ton ? null : new Ton();
  if (app.ton) app.ton.wecken();
};
const film = filmAnbinden(app);
if (film.film) app.startOhneTakt();
else app.start();
window.__app = app;
