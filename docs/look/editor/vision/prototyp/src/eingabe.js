// Eine Grammatik für alles:
//   ein Finger macht (auf einem Ding: formen; auf Leere/Haut: zeichnen),
//   zwei Finger schauen (ziehen = drehen/schwenken, kneifen = Zoom/Falten, tippen = zurück, still halten + schieben = Zeit),
//   ein ruhender Finger hält (Zirkel für den Einfluss, Knick am Griff),
//   halten zeigt Verborgenes (Röntgen auf der Form, Gestenhilfe auf der Leere).
// Maus und Trackpad sind dieselbe Grammatik: Klick = Tippen, Ziehen = ein Finger, rechte Taste/Trackpad = zwei Finger.
// Zeiten kommen aus `jetzt()` (im Film aus der Filmuhr). Halten wird im Bildtakt geprüft, nicht mit Zeitgebern: So zählt
// eine Bewegung, die verspätet ankommt, noch als Bewegung.

import { clamp } from './mathe.js';

import { PAR } from './parameter.js';
export const HALTEN = +(PAR.get('halten') || 430);
// Variante: ein Finger auf der Leere dreht (wie in Florians Fenstern); Striche beginnen dann auf der Haut
const LEERE_DREHT = PAR.get('leere') === 'drehen';
export const jetzt = () => (window.__filmZeit !== undefined ? window.__filmZeit : performance.now());

export function eingabeAnbinden(app, el) {
  const zeiger = new Map(); // id → { x, y, x0, y0, t0, typ }
  let einer = null;
  let zwei = null;
  let haltFinger = null;
  let tipps = { n: 0, t: 0, x: 0, y: 0 };
  let drei = null;
  const SLOP = (typ) => (typ === 'mouse' ? 4 : 10);
  app.finger = zeiger;

  const pos = (e) => {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const zielVon = (e1) => {
    if (!e1.ziel) e1.ziel = app.treffer(e1.x0, e1.y0);
    return e1.ziel;
  };

  // Zeitstempel des Ereignisses (nicht der Verarbeitung): unter Last kommen zwei gleichzeitige Finger sonst als
  // „erst einer, dann der andere“ an
  const stempel = (e) => (window.__filmZeit !== undefined ? window.__filmZeit : e.timeStamp || performance.now());
  function einerStart(id, x, y, typ, knopf, tE) {
    einer = { id, x0: x, y0: y, x, y, t0: jetzt(), tE: tE ?? jetzt(), typ, ziel: null, art: null, bewegt: false, knopf };
    if (knopf === 2 || knopf === 1) einer.art = knopf === 2 ? 'drehen' : 'schwenken';
  }

  function zweiStart() {
    const ids = [...zeiger.keys()].slice(0, 2);
    const [a, b] = ids.map((i) => zeiger.get(i));
    zwei = { ids, c: [(a.x + b.x) / 2, (a.y + b.y) / 2], d: Math.hypot(a.x - b.x, a.y - b.y), w: Math.atan2(b.y - a.y, b.x - a.x), t0: jetzt(), weg: 0, dreh: 0, art: null };
    app.zweiFinger = true;
    app.schwung = null;
  }

  function einerAbbrechen() {
    if (!einer) return;
    if (einer.art === 'strich') app.strich = null;
    else if (einer.art === 'zug') app.zugEnde();
    else if (einer.art === 'halten') app.haltenEnde(true);
    einer = null;
  }

  // im Bildtakt: Halten erkennen (ein Finger still → Röntgen/Hilfe; zwei Finger still → Zeit)
  app.eingabeTakt = () => {
    const t = jetzt();
    if (einer && !einer.bewegt && !einer.art && t - einer.t0 >= HALTEN) {
      einer.art = 'halten';
      einer.haltSeit = t;
      app.haltenStart(zielVon(einer), einer.x, einer.y);
    }
    if (zwei && !zwei.art && zwei.weg < 8 && t - zwei.t0 >= HALTEN * 0.9) {
      zwei.art = 'zeit';
      zwei.zeitSeit = t;
      app.spulenStart();
    }
  };

  function runter(e) {
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* künstliche Zeiger im Film */ }
    const [x, y] = pos(e);
    zeiger.set(e.pointerId, { x, y, x0: x, y0: y, t0: jetzt(), typ: e.pointerType });
    if (app.ton && app.ton.wecken) app.ton.wecken();
    const n = zeiger.size;
    const tE = stempel(e);
    if (n === 1) return einerStart(e.pointerId, x, y, e.pointerType, e.button, tE);
    if (n === 2 && !einer && !zwei) return zweiStart();
    if (n === 2 && einer) {
      // Ein Zug läuft: der neue Finger ist der ruhende Halt (Zirkel, Knick)
      if (einer.art === 'zug') {
        haltFinger = e.pointerId;
        app.halt = { x, y };
        app.zirkel(einer, x, y);
        return;
      }
      // Röntgen offen: der zweite Finger arbeitet im Durchblick
      if (einer.art === 'halten' && app.linse) {
        haltFinger = einer.id;
        return einerStart(e.pointerId, x, y, e.pointerType, 0, tE);
      }
      // erster Finger ruht schon eine Weile auf einem Ding: er hält, der zweite handelt
      if (!einer.bewegt && tE - einer.tE > 220) {
        const z0 = zielVon(einer);
        if (z0.art !== 'leer' && z0.art !== 'nichts') {
          if (einer.art === 'halten') app.haltenEnde(true);
          haltFinger = einer.id;
          app.halt = { x: einer.x, y: einer.y, ziel: z0 };
          return einerStart(e.pointerId, x, y, e.pointerType, 0, tE);
        }
      }
      einerAbbrechen();
      return zweiStart();
    }
    if (n === 3) drei = { t0: jetzt(), weg: 0 };
  }

  function bewegen(e) {
    const [x, y] = pos(e);
    const z = zeiger.get(e.pointerId);
    if (!z) {
      if (e.pointerType === 'mouse' && !app.zug) mausNaehe(x, y);
      return;
    }
    const dx = x - z.x, dy = y - z.y;
    z.x = x;
    z.y = y;
    if (drei) { drei.weg += Math.hypot(dx, dy); return; }
    if (zwei && zwei.ids.includes(e.pointerId)) { zwei.letzterStempel = stempel(e); return zweiBewegen(); }
    if (e.pointerId === haltFinger) {
      if (app.halt) { app.halt.x = x; app.halt.y = y; }
      if (einer && einer.art === 'zug') app.zirkel(einer, x, y);
      if (app.linse && (!einer || einer.id !== e.pointerId)) app.haltenBewegen(x, y);
      return;
    }
    if (!einer || einer.id !== e.pointerId) return;
    einer.x = x;
    einer.y = y;
    if (einer.art === 'drehen') { app.drehen(dx, dy); app._letzteDrehung = [dx, dy]; return; }
    if (einer.art === 'schwenken') return app.schwenken(dx, dy);
    if (!einer.bewegt) {
      if (Math.hypot(x - einer.x0, y - einer.y0) < SLOP(einer.typ)) return;
      einer.bewegt = true;
      // Halten ausgelöst, aber die Bewegung war schon vorher unterwegs (Seite unter Last)? Dann war es kein Halten.
      if (einer.art === 'halten' && einer.haltSeit && stempel(e) < einer.haltSeit) {
        app.haltenEnde(true);
        einer.art = null;
      }
      if (einer.art !== 'halten') {
        const a = zielVon(einer).art;
        if (a === 'punkt' || a === 'griff' || a === 'linie' || a === 'maul') {
          einer.art = 'zug';
          app.zugStart(einer.ziel, einer.x0, einer.y0);
        } else if (a === 'leer' && LEERE_DREHT) {
          einer.art = 'drehen';
        } else if (a === 'haut' || a === 'leer') {
          einer.art = 'strich';
          app.strichStart(einer.ziel, einer.x0, einer.y0);
          if (e.getCoalescedEvents) for (const c of e.getCoalescedEvents()) { const q = pos(c); app.strichWeiter(q[0], q[1]); }
        } else einer.art = 'nichts';
      }
    }
    if (einer.art === 'zug') app.zugBewegen(x, y);
    else if (einer.art === 'strich') app.strichWeiter(x, y);
    else if (einer.art === 'halten') app.haltenBewegen(x, y);
  }

  function mausNaehe(x, y) {
    app.mausX = x;
    app.mausY = y;
    if (app._nahPlan) return;
    app._nahPlan = true;
    requestAnimationFrame(() => {
      app._nahPlan = false;
      const t = app.treffer(app.mausX, app.mausY);
      app.nah = t.art === 'punkt' || t.art === 'linie' || t.art === 'griff' ? t : null;
      el.style.cursor = t.art === 'punkt' || t.art === 'griff' ? 'grab' : t.art === 'linie' ? 'pointer' : t.art === 'haut' || t.art === 'leer' ? 'crosshair' : 'default';
      if (app.tasten.has('Alt')) app.haltenBewegen(app.mausX, app.mausY);
    });
  }

  function zweiBewegen() {
    const [a, b] = zwei.ids.map((i) => zeiger.get(i));
    if (!a || !b) return;
    const c = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const w = Math.atan2(b.y - a.y, b.x - a.x);
    const dc = [c[0] - zwei.c[0], c[1] - zwei.c[1]];
    let dw = w - zwei.w;
    if (dw > Math.PI) dw -= 2 * Math.PI;
    if (dw < -Math.PI) dw += 2 * Math.PI;
    zwei.weg += Math.hypot(dc[0], dc[1]) + Math.abs(d - zwei.d);
    if (zwei.art === 'zeit' && zwei.zeitSeit && zwei.letzterStempel !== undefined && zwei.letzterStempel < zwei.zeitSeit && zwei.weg > 8) {
      app.spulenEnde();
      zwei.art = null;
    }
    if (zwei.art === 'zeit') app.spulen(dc[0]);
    else {
      if (zwei.weg > 6 && !zwei.art) zwei.art = 'blick';
      if (zwei.art === 'blick') {
        if (d > 10 && zwei.d > 10) app.zoomen(d / zwei.d, c[0], c[1]);
        const lay = app.lay;
        if (lay && lay.art === 'blick') {
          // hineingezoomt: schwenken; sonst dreht man sich aus der flachen Ansicht heraus in den Raum
          zwei.dreh += dw;
          zwei.zieh = (zwei.zieh || 0) + Math.hypot(dc[0], dc[1]);
          if (Math.abs(zwei.dreh) > 0.6) { app.wenden(Math.sign(zwei.dreh)); zwei.dreh = 0; }
          else if (app.raum.blickZoom > 1.15) app.schwenken(dc[0], dc[1]);
          else if (zwei.zieh > 26) { app.ausBlick(); app.drehen(dc[0], dc[1]); }
        } else if (lay && lay.art === 'blatt') app.schwenken(dc[0], dc[1]);
        else { app.drehen(dc[0], dc[1]); app._letzteDrehung = dc; }
      }
    }
    zwei.c = c;
    zwei.d = d;
    zwei.w = w;
  }

  function hoch(e) {
    const z = zeiger.get(e.pointerId);
    zeiger.delete(e.pointerId);
    if (!z) return;
    const [x, y] = pos(e);
    if (drei) {
      if (zeiger.size === 0) {
        if (drei.weg < 30 && jetzt() - drei.t0 < 400) app.vor();
        drei = null; zwei = null; einer = null;
        app.zweiFinger = false;
      }
      return;
    }
    if (zwei && zwei.ids.includes(e.pointerId)) {
      if (!zwei.ids.some((i) => zeiger.has(i))) {
        if (!zwei.art && jetzt() - zwei.t0 < 320) app.zurueck();
        if (zwei.art === 'zeit') app.spulenEnde();
        if (zwei.art === 'blick' && app.lay && (app.lay.art === 'raum' || app.lay.art === 'blickRaum')) {
          const l = app._letzteDrehung || [0, 0];
          if (Math.hypot(l[0], l[1]) > 2) app.schwung = [l[0], l[1]];
          else app.einrastenPruefen(true);
        }
        zwei = null;
        app.zweiFinger = false;
      }
      return;
    }
    if (e.pointerId === haltFinger) {
      haltFinger = null;
      app.halt = null;
      if (app.linse && (!einer || einer.art !== 'halten')) app.haltenEnde();
      return;
    }
    if (!einer || einer.id !== e.pointerId) return;
    const e1 = einer;
    einer = null;
    if (e1.art === 'drehen') {
      const l = app._letzteDrehung || [0, 0];
      if (Math.hypot(l[0], l[1]) > 2) app.schwung = [l[0], l[1]];
      else app.einrastenPruefen(true);
      return;
    }
    if (e1.art === 'zug') { app.zugEnde(); app.einfluss = 0; return; }
    if (e1.art === 'strich') return app.strichEnde();
    if (e1.art === 'halten') return app.haltenEnde();
    if (!e1.bewegt) {
      const t = jetzt();
      if (t - tipps.t < 330 && Math.hypot(x - tipps.x, y - tipps.y) < 26) tipps.n++;
      else tipps.n = 1;
      tipps.t = t;
      tipps.x = x;
      tipps.y = y;
      app.tippen(tipps.n >= 2 ? app.treffer(x, y) : zielVon(e1), tipps.n, x, y);
    }
  }

  el.addEventListener('pointerdown', runter);
  el.addEventListener('pointermove', bewegen);
  el.addEventListener('pointerup', hoch);
  el.addEventListener('pointercancel', hoch);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  app.zeigerEreignis = { runter, bewegen, hoch };

  // Rad und Trackpad: Rad = Zoom; Trackpad mit zwei Fingern = drehen/schwenken; Kneifen (ctrl) = Zoom.
  // Während eines Zugs stellt das Rad den Einfluss ein (wie O in Blender; Rad hoch = größer).
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = pos(e);
    if (app.zug && app.zug.art === 'punkt') {
      app.einfluss = clamp((app.einfluss || 0.2 * app.groesse) * Math.exp(-e.deltaY * 0.0035), 0, 3 * app.groesse);
      if (app.einfluss < 0.05 * app.groesse) app.einfluss = 0;
      app.einflussAnwenden();
      if (einer) app.zugBewegen(einer.x, einer.y);
      return;
    }
    if (e.ctrlKey) return app.zoomen(Math.exp(-e.deltaY * 0.01), x, y);
    const trackpad = Math.abs(e.deltaX) > 0.5 || (e.deltaMode === 0 && !Number.isInteger(e.deltaY));
    if (trackpad) {
      const lay = app.lay;
      if (lay && (lay.art === 'raum' || lay.art === 'blickRaum')) {
        app.drehen(-e.deltaX, -e.deltaY);
        clearTimeout(app._radRast);
        app._radRast = setTimeout(() => app.einrastenPruefen(true), 180);
      } else if (lay && lay.art === 'blick' && Math.abs(e.deltaX) > 30) app.wenden(Math.sign(e.deltaX));
      else app.schwenken(-e.deltaX, -e.deltaY);
      return;
    }
    app.zoomen(Math.exp(-e.deltaY * 0.0016), x, y);
  }, { passive: false });

  addEventListener('keydown', (e) => {
    app.tasten.add(e.key);
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') {
      e.preventDefault();
      return e.shiftKey ? app.vor() : app.zurueck();
    }
    if (e.key === 'Alt') {
      e.preventDefault();
      if (!app.linse) app.haltenStart({ art: 'haut' }, app.mausX || app.W / 2, app.mausY || app.H / 2);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      app.modusSetzen(app.raum.modus === 'blatt' ? 'raum' : 'blatt');
    }
    if (k === '1') app.modusSetzenDirekt('seite');
    if (k === '3') app.modusSetzenDirekt('front');
    if (k === '7') app.modusSetzenDirekt('top');
    if (k === '0') app.modusSetzen('raum');
    if (k === 'm' && app.tonUmschalten) app.tonUmschalten();
    if (k === 'h') {
      if (app.hilfe) app.hilfe = null;
      else app.haltenStart({ art: 'leer', sicht: app.raum.sichten.raum }, app.W / 2, app.H / 2);
    }
    if (e.key === 'Backspace' || e.key === 'Delete') app.auswahlLoeschen();
    if (k === 'k') app.auswahlKante();
  });
  addEventListener('keyup', (e) => {
    app.tasten.delete(e.key);
    if (e.key === 'Alt') app.haltenEnde();
  });
  addEventListener('blur', () => app.tasten.clear());
}
