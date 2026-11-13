// Grammatik der Werkstatt, zuerst für Maus und Tastatur (Florian, 13.11.: „vor allem mit Maus und Tastatur“), dazu iPad.
//
//   Links ziehen auf Leere oder Haut    drehen (wie heute im Editor), beim Loslassen nahe einer Achse einrasten
//   Links auf Punkt, Griff, Linie       wählen und ziehen; Doppelklick: Linie = Punkt setzen, Punkt = Ecke ↔ glatt
//   Rechts ziehen (oder ⌥ + links, P)  zeichnen: quer über den Umriss = Loop, geschlossen = Form, Zickzack = weg
//   Rad                                 Zoom am Zeiger; während eines Zugs: Einfluss (wie O in Blender)
//   Mitte, Leertaste oder ⇧ + Leere     schwenken
//   Tasten                              1/3/7/0, ⌘Z, ⇧⌘Z, ⌫, K, F, X (Röntgen halten), P (Stift), ?, Esc, Tab
//   iPad                                Finger wie die linke Taste, Pencil zeichnet, zwei Finger zoomen und schwenken,
//                                       zwei Finger tippen = zurück, drei = vor, lange drücken und ziehen = zeichnen
//
// Die Ebene, die das Layout liefert (App): treffer, layoutTreffer, zugStart/zugBewegen/zugEnde, strichStart/Weiter/Ende,
// klick, drehen/drehenEnde, schwenken, zoomen, trackpad, layoutZug*, ansichtTaste, layoutTaste, vorfuehren.

import { clamp } from '../mathe.js';
import { zeigerSetzen } from './zeiger.js';

export const jetzt = () => (window.__filmZeit !== undefined ? window.__filmZeit : performance.now());
const SLOP = { mouse: 3, pen: 4, touch: 9 };
const LANG = 450; // ms: lange drücken (Finger) = Stift

export function mausAnbinden(app, el) {
  const zeiger = new Map();
  let einer = null; // die laufende Geste eines Zeigers
  let zwei = null; // zwei Finger
  let drei = null;
  let klicks = { n: 0, t: -1e9, x: 0, y: 0 };
  let leertaste = false;
  let stift = false; // P: Stift bleibt an
  let schwebe = null; // letzte Lage der Maus ohne Taste
  let schwebeNeu = false;
  app.maus = { x: -1, y: -1, drin: false };
  app.stiftAn = () => stift || app.tasten.has('Alt');

  const pos = (e) => {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const mods = (e) => ({ shift: !!e.shiftKey, alt: !!e.altKey, meta: !!(e.metaKey || e.ctrlKey) });

  function zielHolen(x, y) {
    return app.layoutTreffer(x, y) || app.treffer(x, y, { sofort: true });
  }
  const istDing = (a) => a === 'punkt' || a === 'griff' || a === 'linie' || a === 'maul' || (a === 'haut' && !!app.hautFormbar);

  // ---------------- Zeiger runter ----------------
  function runter(e) {
    if (app.vorfuehrungStoppen && !e.geist) app.vorfuehrungStoppen();
    try { if (!e.geist) el.setPointerCapture(e.pointerId); } catch (_) { /* künstlicher Zeiger */ }
    const [x, y] = pos(e);
    const typ = e.pointerType || 'mouse';
    zeiger.set(e.pointerId, { x, y, x0: x, y0: y, t0: jetzt(), typ });
    if (app.ton && app.ton.wecken) app.ton.wecken();
    // zweiter Finger
    if (typ === 'touch' && zeiger.size >= 2) {
      if (zeiger.size >= 3) { drei = { t0: jetzt(), weg: 0 }; return; }
      if (einer && einer.art === 'zug') {
        // ein Zug läuft: der zweite Finger ist der Zirkel (Einfluss)
        einer.zirkel = e.pointerId;
        return app.zirkel(einer, x, y);
      }
      abbrechen();
      const ids = [...zeiger.keys()].slice(0, 2);
      const [a, b] = ids.map((i) => zeiger.get(i));
      zwei = { ids, c: [(a.x + b.x) / 2, (a.y + b.y) / 2], d: Math.hypot(a.x - b.x, a.y - b.y), t0: jetzt(), weg: 0 };
      return;
    }
    const knopf = e.button ?? 0;
    einer = { id: e.pointerId, typ, knopf, x0: x, y0: y, x, y, lx: x, ly: y, t0: jetzt(), art: 'warten', ziel: null, mod: mods(e), v: [0, 0] };
    if (typ === 'mouse' && knopf === 1) return beginne(app.mitteDreht ? 'drehen' : 'schwenken');
    if (typ === 'mouse' && knopf === 2) return beginne('strich');
    if (typ === 'mouse' && e.altKey && app.altDreht) return beginne('drehen');
    if (typ === 'mouse' && (stift || e.altKey)) return beginne('strich');
    einer.ziel = zielHolen(x, y);
    const a = einer.ziel.art;
    if (typ === 'mouse' && (leertaste || (e.shiftKey && !istDing(a) && a !== 'layout'))) return beginne('schwenken');
    // Pencil zeichnet überall außer auf Punkt, Griff, Linie (auch auf der Haut, wo der Finger sie formt)
    if (typ === 'pen' && !['punkt', 'griff', 'linie', 'maul', 'layout'].includes(a)) return beginne('strich');
    zeigerArt();
  }

  function beginne(art) {
    const g = einer;
    g.art = art;
    if (art === 'strich') {
      const z = g.ziel || app.treffer(g.x0, g.y0);
      if (z.art === 'nichts' || !z.sicht) { g.art = 'nichts'; return; }
      app.strichStart(z, g.x0, g.y0);
    } else if (art === 'zug') {
      app.zugStart(g.ziel, g.x0, g.y0);
    } else if (art === 'layout') {
      app.layoutZugStart(g.ziel, g.x0, g.y0);
    } else if (art === 'drehen') {
      if (app.drehenStart) app.drehenStart(g.x0, g.y0, g.ziel);
    }
    zeigerArt();
  }

  // ---------------- bewegen ----------------
  function bewegen(e) {
    const [x, y] = pos(e);
    app.maus.x = x;
    app.maus.y = y;
    app.maus.drin = true;
    // während der Vorführung schwebt nur der Geist
    if (app.vorfuehrung && !e.geist) return;
    const z = zeiger.get(e.pointerId);
    if (!z) {
      // schweben (Maus ohne Taste): einmal je Bild auswerten
      schwebe = [x, y];
      schwebeNeu = true;
      return;
    }
    z.x = x;
    z.y = y;
    if (drei) { drei.weg += 1; return; }
    if (zwei && zwei.ids.includes(e.pointerId)) return zweiBewegen();
    if (einer && einer.zirkel === e.pointerId) return app.zirkel(einer, x, y);
    if (!einer || einer.id !== e.pointerId) return;
    const g = einer;
    const dx = x - g.lx, dy = y - g.ly;
    g.lx = x;
    g.ly = y;
    g.x = x;
    g.y = y;
    if (g.art === 'warten' || g.art === 'langBereit') {
      if (Math.hypot(x - g.x0, y - g.y0) < SLOP[g.typ]) return;
      if (g.art === 'langBereit') beginne('strich');
      else {
        const a = g.ziel.art;
        if (a === 'layout') beginne('layout');
        else if (istDing(a)) beginne('zug');
        else if (a === 'nichts') g.art = 'nichts';
        else beginne('drehen');
      }
      // der Weg bis hierher zählt schon
      if (g.art === 'drehen') { app.drehen(x - g.x0, y - g.y0); g.v = [x - g.x0, y - g.y0]; return; }
    }
    if (g.art === 'zug') app.zugBewegen(x, y);
    else if (g.art === 'drehen') {
      app.drehen(dx, dy);
      g.v = [g.v[0] * 0.5 + dx * 0.5, g.v[1] * 0.5 + dy * 0.5];
    } else if (g.art === 'schwenken') app.schwenken(dx, dy);
    else if (g.art === 'strich') {
      if (e.getCoalescedEvents) for (const c of e.getCoalescedEvents()) { const q = pos(c); app.strichWeiter(q[0], q[1]); }
      else app.strichWeiter(x, y);
    } else if (g.art === 'layout') app.layoutZugBewegen(x, y);
  }

  function zweiBewegen() {
    const [a, b] = zwei.ids.map((i) => zeiger.get(i));
    if (!a || !b) return;
    const c = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const dc = [c[0] - zwei.c[0], c[1] - zwei.c[1]];
    zwei.weg += Math.hypot(dc[0], dc[1]) + Math.abs(d - zwei.d);
    if (zwei.weg > 6) {
      if (d > 10 && zwei.d > 10) app.zoomen(d / zwei.d, c[0], c[1]);
      app.schwenken(dc[0], dc[1]);
    }
    zwei.c = c;
    zwei.d = d;
  }

  // ---------------- hoch ----------------
  function hoch(e) {
    const z = zeiger.get(e.pointerId);
    zeiger.delete(e.pointerId);
    if (!z) return;
    const [x, y] = pos(e);
    if (drei) {
      if (zeiger.size === 0) { if (drei.weg < 12 && jetzt() - drei.t0 < 420) app.vor(); drei = null; zwei = null; einer = null; }
      return;
    }
    if (zwei && zwei.ids.includes(e.pointerId)) {
      if (!zwei.ids.some((i) => zeiger.has(i))) {
        if (zwei.weg < 10 && jetzt() - zwei.t0 < 320) app.zurueck();
        zwei = null;
      }
      return;
    }
    if (einer && einer.zirkel === e.pointerId) { einer.zirkel = null; return; }
    if (!einer || einer.id !== e.pointerId) return;
    const g = einer;
    einer = null;
    if (g.art === 'zug') { app.zugEnde(); app.einfluss = 0; }
    else if (g.art === 'drehen') app.drehenEnde(g.v);
    else if (g.art === 'strich') app.strichEnde();
    else if (g.art === 'layout') app.layoutZugEnde(x, y);
    else if (g.art === 'schwenken') { if (app.schwenkenEnde) app.schwenkenEnde(); }
    else if (g.art === 'warten' || g.art === 'langBereit') {
      // Klick: Doppelklick über Zeit und Ort
      const t = jetzt();
      if (t - klicks.t < 380 && Math.hypot(x - klicks.x, y - klicks.y) < 8) klicks.n++;
      else klicks.n = 1;
      klicks.t = t;
      klicks.x = x;
      klicks.y = y;
      if (g.typ === 'mouse' && g.knopf !== 0) { /* rechts/mitte geklickt: nichts */ }
      else if (g.ziel && g.ziel.art === 'layout') app.layoutKlick(g.ziel, klicks.n, x, y, g.mod);
      else app.klick(klicks.n >= 2 ? app.treffer(x, y, { sofort: true }) : g.ziel, klicks.n, x, y, g.mod);
      // nach einem Doppelklick beginnt das Zählen neu (der nächste Doppelklick ist eine eigene Handlung)
      if (klicks.n >= 2) klicks.n = 0;
    }
    schwebe = [x, y];
    schwebeNeu = true;
    zeigerArt();
  }

  function abbrechen() {
    if (!einer) return;
    if (einer.art === 'strich') app.strich = null;
    else if (einer.art === 'zug') app.zugEnde();
    else if (einer.art === 'layout') app.layoutZugEnde(einer.x, einer.y);
    einer = null;
  }

  // ---------------- im Bildtakt: Schweben auswerten, lange drücken erkennen ----------------
  app.eingabeTakt = () => {
    if (einer && einer.typ === 'touch' && einer.art === 'warten' && jetzt() - einer.t0 > LANG) {
      const a = einer.ziel && einer.ziel.art;
      if (a === 'leer' || a === 'haut') {
        einer.art = 'langBereit';
        app.fx.push({ art: 'stiftBereit', x: einer.x0, y: einer.y0, t: 0, dauer: 0.5 });
        if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) { /* egal */ }
      }
    }
    if (schwebeNeu && !einer && !zwei) {
      schwebeNeu = false;
      const [x, y] = schwebe;
      app.schweben(x, y);
      zeigerArt();
    } else if (!einer && !zwei && app.schwebenNachfuehren) app.schwebenNachfuehren();
  };

  // ---------------- Zeiger zeigt die Wirkung ----------------
  function zeigerArt() {
    let art = 'drehen';
    if (einer) {
      art = { zug: 'ziehen', drehen: 'drehen', schwenken: 'schwenken', strich: 'stift', layout: app.layoutZeiger ? app.layoutZeiger(einer.ziel) : 'passer', langBereit: 'stift' }[einer.art] || 'drehen';
      if (einer.art === 'warten') art = istDing(einer.ziel.art) ? (einer.ziel.art === 'haut' ? 'formen' : 'ziehen') : einer.ziel.art === 'layout' ? (app.layoutZeiger ? app.layoutZeiger(einer.ziel) : 'passer') : 'drehen';
      if (einer.art === 'zug' && einer.ziel && einer.ziel.art === 'haut') art = 'formen';
    } else if (leertaste) art = 'schwenken';
    else if (app.stiftAn()) art = 'stift';
    else {
      const n = app.nahZiel;
      if (n && n.art === 'layout') art = app.layoutZeiger ? app.layoutZeiger(n) : 'passer';
      else if (n && (n.art === 'punkt' || n.art === 'griff' || n.art === 'maul')) art = 'greifen';
      else if (n && n.art === 'linie') art = 'perle';
      else if (n && n.art === 'haut' && app.hautFormbar) art = 'formen';
      else if (n && n.art === 'nichts') art = 'zeigen';
    }
    zeigerSetzen(el, art);
  }
  app.zeigerArt = zeigerArt;

  // ---------------- Rad und Trackpad ----------------
  function rad(e) {
    if (e.preventDefault) e.preventDefault();
    if (app.vorfuehrungStoppen && !e.geist) app.vorfuehrungStoppen();
    const [x, y] = pos(e);
    if (app.zug && app.radImZug && app.radImZug(e.deltaY)) {
      if (einer) app.zugBewegen(einer.x, einer.y);
      return;
    }
    if (app.zug && app.zug.art === 'punkt') {
      app.einfluss = clamp((app.einfluss || 0.18 * app.groesse) * Math.exp(-e.deltaY * 0.0035), 0, 3 * app.groesse);
      if (app.einfluss < 0.05 * app.groesse) app.einfluss = 0;
      app.einflussAnwenden();
      if (einer) app.zugBewegen(einer.x, einer.y);
      return;
    }
    if (e.ctrlKey) return app.zoomen(Math.exp(-e.deltaY * 0.01), x, y);
    const trackpad = !e.geist && (Math.abs(e.deltaX) > 0.5 || (e.deltaMode === 0 && !Number.isInteger(e.deltaY)));
    if (trackpad) return app.trackpad(-e.deltaX, -e.deltaY, x, y);
    app.zoomen(Math.exp(-e.deltaY * 0.0016), x, y);
  }

  // ---------------- Tasten ----------------
  function taste(e) {
    if (app.vorfuehrungStoppen && !e.geist && e.key !== '?') app.vorfuehrungStoppen();
    app.tasten.add(e.key);
    const k = (e.key || '').toLowerCase();
    const cmd = e.metaKey || e.ctrlKey;
    if (cmd && k === 'z') { e.preventDefault && e.preventDefault(); return e.shiftKey ? app.vor() : app.zurueck(); }
    if (cmd && k === 'y') { e.preventDefault && e.preventDefault(); return app.vor(); }
    if (cmd && k === 'a') { e.preventDefault && e.preventDefault(); return app.allesWaehlen(); }
    if (cmd) return;
    if (e.key === ' ') { e.preventDefault && e.preventDefault(); leertaste = true; return zeigerArt(); }
    if (e.key === 'Alt') { e.preventDefault && e.preventDefault(); return zeigerArt(); }
    if (e.key === 'Escape') {
      if (einer) abbrechen();
      else app.auswahl.clear();
      stift = false;
      return zeigerArt();
    }
    if (e.key === 'Backspace' || e.key === 'Delete') return app.auswahlLoeschen();
    if (e.key === 'Tab') { e.preventDefault && e.preventDefault(); return app.layoutTaste && app.layoutTaste('Tab'); }
    if (e.key === 'Home') return app.einpassen();
    if (e.key === '?' || (e.shiftKey && k === 'ß')) return app.vorfuehren && app.vorfuehren();
    if (e.repeat) return;
    if (k === 'p') { stift = !stift; return zeigerArt(); }
    if (k === 'x') return app.haltenStart({ art: 'haut' }, app.maus.x, app.maus.y);
    if (k === 'k') return app.auswahlKante();
    if (k === 'f') return app.einpassen();
    const ansicht = { 1: 'seite', 3: 'front', 7: 'top', 0: 'raum' }[k];
    if (ansicht) return app.ansichtDruck ? app.ansichtDruck(ansicht) : app.ansichtTaste(ansicht);
    if (k === 'm' && app.tonUmschalten) return app.tonUmschalten();
    if (app.layoutTaste) app.layoutTaste(e.key);
  }
  function tasteHoch(e) {
    app.tasten.delete(e.key);
    if (e.key === ' ') { leertaste = false; zeigerArt(); }
    if (e.key === 'Alt') zeigerArt();
    if ((e.key || '').toLowerCase() === 'x') app.haltenEnde();
    const ansicht = { 1: 'seite', 3: 'front', 7: 'top', 0: 'raum' }[(e.key || '').toLowerCase()];
    if (ansicht && app.ansichtLos) app.ansichtLos(ansicht);
  }

  el.addEventListener('pointerdown', runter);
  el.addEventListener('pointermove', bewegen);
  el.addEventListener('pointerup', hoch);
  el.addEventListener('pointercancel', hoch);
  el.addEventListener('pointerleave', () => { app.maus.drin = false; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('wheel', rad, { passive: false });
  addEventListener('keydown', taste);
  addEventListener('keyup', tasteHoch);
  addEventListener('blur', () => { app.tasten.clear(); leertaste = false; });
  // für die Geistermaus und Filme
  app.eingabe = { runter, bewegen, hoch, rad, taste, tasteHoch, laeuft: () => !!einer || !!zwei };
  zeigerArt();
}
