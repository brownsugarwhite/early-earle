// Einstieg: Raum aufbauen, Grammatik anbinden, losleben.
import { App } from './bild.js';
import './werkzeuge.js';
import { eingabeAnbinden } from './eingabe.js';
import { Ton } from './ton.js';
import { filmAnbinden } from './film.js';
import { PAR } from './parameter.js';

const app = new App(document.getElementById('leinwand'), document.getElementById('oben'));
eingabeAnbinden(app, document.getElementById('leinwand'));
app.ton = PAR.get('ton') === '1' ? new Ton() : null;
app.tonUmschalten = () => {
  app.ton = app.ton ? null : new Ton();
  if (app.ton) app.ton.wecken();
};
const film = filmAnbinden(app);
if (film.film) app.startOhneTakt();
else app.start();
window.__app = app;
// andere Einstellung im Anker → neu laden (Links der Präsentation)
addEventListener('hashchange', () => location.reload());
