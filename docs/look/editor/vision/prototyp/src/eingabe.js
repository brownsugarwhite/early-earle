// Eine Grammatik für alles:
//   ein Finger macht (auf einem Ding: formen; auf Leere/Haut: zeichnen),
//   zwei Finger schauen (ziehen = drehen/schwenken, kneifen = Zoom/Falten, tippen = zurück, still halten + schieben = Zeit),
//   ein ruhender Finger hält (Zirkel für den Einfluss, Knick am Griff),
//   halten zeigt Verborgenes (Röntgen auf der Form, Gestenhilfe auf der Leere).
// Maus und Trackpad sind dieselbe Grammatik: Klick = Tippen, Ziehen = ein Finger, rechte Taste/Trackpad = zwei Finger.

import { clamp } from './mathe.js';

export function eingabeAnbinden(app, el) {
  const zeiger = new Map(); // id → { x, y, x0, y0, t0, typ }
  let einer = null;
  let zwei = null;
  let haltFinger = null; // id des ruhenden Fingers
  let tipps = { n: 0, t: 0, x: 0, y: 0 };
  let drei = null;
  const SLOP = (typ) => (typ === 'mouse' ? 4 : 10);

  const pos = (e) => {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  function einerStart(id, x, y, typ, knopf) {
    const ziel = app.treffer(x, y);
    einer = { id, x0: x, y0: y, x, y, t0: performance.now(), typ, ziel, art: null, bewegt: false, knopf };
    if (knopf === 2 || knopf === 1) {
      einer.art = knopf === 2 ? 'drehen' : 'schwenken';
      return;
    }
    einer.timer = setTimeout(() => {
      if (einer && !einer.bewegt && !einer.art) {
        einer.art = 'halten';
        app.haltenStart(einer.ziel, einer.x, einer.y);
      }
    }, 430);
  }

  function zweiStart() {
    const ids = [...zeiger.keys()].slice(0, 2);
    const [a, b] = ids.map((i) => zeiger.get(i));
    zwei = {
      ids,
      c: [(a.x + b.x) / 2, (a.y + b.y) / 2],
      d: Math.hypot(a.x - b.x, a.y - b.y),
      w: Math.atan2(b.y - a.y, b.x - a.x),
      t0: performance.now(),
      weg: 0,
      dreh: 0,
      art: null,
      still: setTimeout(() => {
        if (zwei && zwei.weg < 8 && !zwei.art) {
          zwei.art = 'zeit';
          app.spulenStart();
        }
      }, 380),
    };
    app.zweiFinger = true;
    app.schwung = null;
  }

  function einerAbbrechen() {
    if (!einer) return;
    clearTimeout(einer.timer);
    if (einer.art === 'strich') {
      app.strich = null;
    } else if (einer.art === 'zug') app.zugEnde();
    else if (einer.art === 'halten') app.haltenEnde();
    einer = null;
  }

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    zeiger.set(e.pointerId, { x, y, x0: x, y0: y, t0: performance.now(), typ: e.pointerType });
    app.letzteFingerZeit = performance.now();
    if (app.ton && app.ton.wecken) app.ton.wecken();
    const n = zeiger.size;
    if (n === 1) {
      einerStart(e.pointerId, x, y, e.pointerType, e.button);
      return;
    }
    if (n === 2 && einer) {
      const jetzt = performance.now();
      // Ein Zug läuft: der neue Finger ist der ruhende Halt (Zirkel)
      if (einer.art === 'zug') {
        haltFinger = e.pointerId;
        app.halt = { x, y };
        app.zirkel(einer, x, y);
        return;
      }
      // Röntgen offen: der zweite Finger arbeitet im Durchblick
      if (einer.art === 'halten' && app.linse) {
        haltFinger = einer.id;
        einerStart(e.pointerId, x, y, e.pointerType, 0);
        clearTimeout(einer.timer);
        return;
      }
      // erster Finger ruht schon eine Weile: er hält fest, der zweite handelt
      if (!einer.bewegt && jetzt - einer.t0 > 220 && einer.ziel.art !== 'leer' && einer.ziel.art !== 'nichts') {
        clearTimeout(einer.timer);
        haltFinger = einer.id;
        app.halt = { x: einer.x, y: einer.y, ziel: einer.ziel };
        einerStart(e.pointerId, x, y, e.pointerType, 0);
        return;
      }
      einerAbbrechen();
      zweiStart();
      return;
    }
    if (n === 3) {
      drei = { t0: performance.now(), weg: 0 };
      if (zwei) { clearTimeout(zwei.still); zwei.art = 'drei'; }
    }
  });

  el.addEventListener('pointermove', (e) => {
    const [x, y] = pos(e);
    const z = zeiger.get(e.pointerId);
    if (!z) {
      // Maus ohne Taste: Nähe zeigen
      if (e.pointerType === 'mouse' && !app.zug) {
        app.mausX = x;
        app.mausY = y;
        if (!app._nahPlan) {
          app._nahPlan = true;
          requestAnimationFrame(() => {
            app._nahPlan = false;
            const t = app.treffer(app.mausX, app.mausY);
            app.nah = t.art === 'punkt' || t.art === 'linie' || t.art === 'griff' ? t : null;
            el.style.cursor = t.art === 'punkt' || t.art === 'griff' ? 'grab' : t.art === 'linie' ? 'pointer' : t.art === 'haut' || t.art === 'leer' ? 'crosshair' : 'default';
            if (app.tasten.has('Alt')) app.haltenBewegen(x, y);
          });
        }
      }
      return;
    }
    const dx = x - z.x, dy = y - z.y;
    z.x = x;
    z.y = y;
    if (drei) drei.weg += Math.hypot(dx, dy);
    if (zwei && zwei.ids.includes(e.pointerId)) return zweiBewegen();
    if (e.pointerId === haltFinger) {
      if (app.halt) { app.halt.x = x; app.halt.y = y; }
      if (einer && einer.art === 'zug') app.zirkel(einer, x, y);
      if (app.linse) app.haltenBewegen(x, y);
      return;
    }
    if (!einer || einer.id !== e.pointerId) return;
    einer.x = x;
    einer.y = y;
    if (einer.art === 'drehen') return app.drehen(dx, dy), (app._letzteDrehung = [dx, dy]);
    if (einer.art === 'schwenken') return app.schwenken(dx, dy);
    if (!einer.bewegt) {
      if (Math.hypot(x - einer.x0, y - einer.y0) < SLOP(einer.typ)) return;
      einer.bewegt = true;
      clearTimeout(einer.timer);
      if (einer.art === 'halten') {
        // Röntgen offen: die Linse folgt dem Finger
      } else {
        const a = einer.ziel.art;
        if (a === 'punkt' || a === 'griff' || a === 'linie' || a === 'maul') {
          einer.art = 'zug';
          app.zugStart(einer.ziel, einer.x0, einer.y0);
        } else if (a === 'haut' || a === 'leer') {
          einer.art = 'strich';
          app.strichStart(einer.ziel, einer.x0, einer.y0);
        } else einer.art = 'nichts';
      }
    }
    if (einer.art === 'zug') app.zugBewegen(x, y);
    else if (einer.art === 'strich') app.strichWeiter(x, y);
    else if (einer.art === 'halten') app.haltenBewegen(x, y);
  });

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
    if (zwei.art === 'zeit') {
      app.spulen(dc[0]);
    } else if (zwei.art !== 'drei') {
      if (zwei.weg > 6 && !zwei.art) {
        clearTimeout(zwei.still);
        zwei.art = 'blick';
      }
      if (zwei.art === 'blick') {
        if (d > 10 && zwei.d > 10) app.zoomen(d / zwei.d, c[0], c[1]);
        const lay = app.lay;
        if (lay && lay.art === 'blick') {
          // im Blick: kräftiges Ziehen dreht aus der Ansicht heraus in den Raum, sonst schwenken
          zwei.dreh += dw;
          zwei.zieh = (zwei.zieh || 0) + Math.hypot(dc[0], dc[1]);
          if (Math.abs(zwei.dreh) > 0.6) {
            app.wenden(Math.sign(zwei.dreh));
            zwei.dreh = 0;
          } else app.schwenken(dc[0], dc[1]);
        } else if (lay && lay.art === 'blatt') app.schwenken(dc[0], dc[1]);
        else {
          app.drehen(dc[0], dc[1]);
          app._letzteDrehung = dc;
        }
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
        if (drei.weg < 30 && performance.now() - drei.t0 < 400) app.vor();
        drei = null;
        zwei = null;
        einer = null;
        app.zweiFinger = false;
      }
      return;
    }
    if (zwei && zwei.ids.includes(e.pointerId)) {
      clearTimeout(zwei.still);
      if (zeiger.size === 0 || !zwei.ids.some((i) => zeiger.has(i))) {
        const dauer = performance.now() - zwei.t0;
        if (!zwei.art && dauer < 320) app.zurueck();
        if (zwei.art === 'zeit') app.spulenEnde();
        if (zwei.art === 'blick' && app.lay && (app.lay.art === 'raum' || app.lay.art === 'blickRaum')) {
          const l = app._letzteDrehung || [0, 0];
          if (Math.hypot(l[0], l[1]) > 2) app.schwung = [l[0], l[1]];
          else app.einrastenPruefen(true);
        }
        zwei = zeiger.size ? zwei : null;
        if (!zeiger.size) { zwei = null; app.zweiFinger = false; }
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
    clearTimeout(einer.timer);
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
      const jetzt = performance.now();
      if (jetzt - tipps.t < 330 && Math.hypot(x - tipps.x, y - tipps.y) < 26) tipps.n++;
      else tipps.n = 1;
      tipps.t = jetzt;
      tipps.x = x;
      tipps.y = y;
      app.tippen(tipps.n >= 2 ? app.treffer(x, y) : e1.ziel, tipps.n, x, y);
    }
  }
  el.addEventListener('pointerup', hoch);
  el.addEventListener('pointercancel', hoch);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  // Rad und Trackpad: Rad = Zoom; Trackpad mit zwei Fingern = drehen/schwenken; Kneifen (ctrl) = Zoom.
  // Während eines Zugs stellt das Rad den Einfluss ein (wie O in Blender).
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = pos(e);
    if (app.zug && app.zug.art === 'punkt') {
      app.einfluss = clamp((app.einfluss || 0.25 * app.groesse) * Math.exp(e.deltaY * 0.0025), 0, 3 * app.groesse);
      if (app.einfluss < 0.05 * app.groesse) app.einfluss = 0;
      app.einflussAnwenden();
      app.zugBewegen(einer ? einer.x : x, einer ? einer.y : y);
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
