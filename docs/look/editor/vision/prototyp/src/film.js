// Vorführungen: Geisterfinger führen die echten Gesten vor (dieselbe Grammatik, künstliche Zeigerereignisse).
// Dient zweierlei: als Einführung ohne Text (der Editor zeigt einmal, was geht) und für Filme der Präsentation
// (`?film=<name>`: Filmuhr, Bild für Bild weitergeschaltet von außen).

import { spiegel } from './mathe.js';

const PAR = new URLSearchParams(location.search);

export function filmAnbinden(app) {
  const finger = new Map(); // id → { x, y, spur: [[x,y]], an }
  let naechsteId = 900;
  const ereignis = (art, id, x, y) => {
    const e = { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0, timeStamp: window.__filmZeit ?? performance.now(), getCoalescedEvents: null };
    app.zeigerEreignis[art](e);
  };
  const runter = (id, x, y) => { finger.set(id, { x, y, spur: [[x, y]], an: true }); ereignis('runter', id, x, y); };
  const bewegen = (id, x, y) => { const f = finger.get(id); if (f) { f.x = x; f.y = y; f.spur.push([x, y]); if (f.spur.length > 24) f.spur.shift(); } ereignis('bewegen', id, x, y); };
  const hoch = (id) => { const f = finger.get(id); if (f) { f.an = false; f.aus = 0; ereignis('hoch', id, f.x, f.y); } };

  // ---- Bausteine einer Vorführung: jede Szene hat eine Dauer und eine Funktion f(u) mit u ∈ [0, 1] ----
  const sz = [];
  const warte = (s) => sz.push({ s, f: () => {} });
  const tue = (fn) => sz.push({ s: 0, f: (u, k) => { if (!k.getan) { k.getan = true; fn(); } } });
  // ein Finger auf einem Weg (Punkte relativ zur Szene, zu Beginn ausgewertet)
  const zieh = (weg, s, opt = {}) => sz.push({ s, start: () => ({ w: weg(), id: naechsteId++ }), f: (u, k) => {
    const w = k.w;
    const p = punktAufWeg(w, opt.glatt === false ? u : glatt(u));
    if (!k.an) { runter(k.id, w[0][0], w[0][1]); k.an = true; if (opt.halten) k.halt = true; }
    else bewegen(k.id, p[0], p[1]);
    if (u >= 1 && !k.aus) { k.aus = true; if (!opt.liegenLassen) hoch(k.id); }
  } });
  const zwei = (wegA, wegB, s) => sz.push({ s, start: () => ({ a: wegA(), b: wegB(), ia: naechsteId++, ib: naechsteId++ }), f: (u, k) => {
    const g = glatt(u);
    const pa = punktAufWeg(k.a, g), pb = punktAufWeg(k.b, g);
    if (!k.an) { runter(k.ia, k.a[0][0], k.a[0][1]); runter(k.ib, k.b[0][0], k.b[0][1]); k.an = true; }
    else { bewegen(k.ia, pa[0], pa[1]); bewegen(k.ib, pb[0], pb[1]); }
    if (u >= 1 && !k.aus) { k.aus = true; hoch(k.ia); hoch(k.ib); }
  } });
  const tipp = (wo, n = 1) => sz.push({ s: 0.12 * n + 0.1, start: () => ({ p: wo(), id: naechsteId++ }), f: (u, k) => {
    const schritte = Math.floor(u * n * 2 + 1e-6);
    while ((k.z || 0) < Math.min(schritte, n * 2)) {
      const z = k.z || 0;
      if (z % 2 === 0) runter(k.id, k.p[0], k.p[1]);
      else hoch(k.id);
      k.z = z + 1;
    }
  } });
  const zweiTipp = (wo) => sz.push({ s: 0.25, start: () => ({ p: wo(), ia: naechsteId++, ib: naechsteId++ }), f: (u, k) => {
    if (!k.an) { runter(k.ia, k.p[0] - 22, k.p[1]); runter(k.ib, k.p[0] + 22, k.p[1] + 6); k.an = true; }
    if (u > 0.4 && !k.aus) { k.aus = true; hoch(k.ia); hoch(k.ib); }
  } });
  const halte = (wo, s) => sz.push({ s, start: () => ({ p: wo(), id: naechsteId++ }), f: (u, k) => {
    if (!k.an) { runter(k.id, k.p[0], k.p[1]); k.an = true; }
    if (u >= 1 && !k.aus) { k.aus = true; hoch(k.id); }
  } });

  // ---- Orte auf dem Bildschirm ----
  const sicht = () => app.lay && (app.lay.art === 'blick' ? app.raum.sichten[app.lay.vorn] : app.raum.sichten.raum);
  const proj = (p, s) => (s || sicht()).projizieren(p);
  const mitte = (wahl) => () => {
    const L = app.linien.find((x) => x.art === 'mitte');
    const P = L.punkte.reduce((a, b) => (wahl === 'vorn' ? (b.p[0] < a.p[0] ? b : a) : wahl === 'hinten' ? (b.p[0] > a.p[0] ? b : a) : wahl === 'unten' ? (b.p[1] < a.p[1] ? b : a) : (b.p[1] > a.p[1] ? b : a)));
    return proj(P.p);
  };
  const formRahmen = () => {
    const s = sicht(), P = app.netz.pos;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < P.length; i += 27) {
      const q = s.projizieren([P[i], P[i + 1], P[i + 2]]);
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
    }
    return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
  };
  const W = () => app.W, H = () => app.H;

  const FILME = {
    // Der Raum: drehen, einrasten (die Form wird zu ihrem Schatten), zurück, auffalten zum Blatt
    raum() {
      warte(0.6);
      zwei(() => [[W() * 0.38, H() * 0.72], [W() * 0.62, H() * 0.72]], () => [[W() * 0.62, H() * 0.72], [W() * 0.86, H() * 0.72]], 0.01);
      sz.pop();
      zwei(() => [[W() * 0.35, H() * 0.75], [W() * 0.5, H() * 0.75]], () => [[W() * 0.52, H() * 0.75], [W() * 0.67, H() * 0.75]], 1.4);
      warte(0.5);
      zwei(() => [[W() * 0.5, H() * 0.75], [W() * 0.62, H() * 0.78]], () => [[W() * 0.66, H() * 0.75], [W() * 0.78, H() * 0.78]], 1.0);
      warte(1.6);
      zwei(() => [[W() * 0.42, H() * 0.7], [W() * 0.3, H() * 0.62]], () => [[W() * 0.58, H() * 0.7], [W() * 0.46, H() * 0.62]], 1.0);
      warte(0.8);
      zwei(() => [[W() * 0.35, H() * 0.5], [W() * 0.47, H() * 0.5]], () => [[W() * 0.65, H() * 0.5], [W() * 0.53, H() * 0.5]], 1.1);
      warte(2.2);
    },
    // Formen: ziehen mit Ordnungslinien und Seifenhaut, schneiden mit Lichtring, Zirkel mit zwei Fingern
    formen() {
      warte(0.5);
      zieh(() => { const p = mitte('vorn')(); return [p, [p[0] - W() * 0.16, p[1] - H() * 0.02]]; }, 1.3);
      warte(0.5);
      zieh(() => { const p = mitte('oben')(); return [p, [p[0] + W() * 0.02, p[1] - H() * 0.12]]; }, 1.0);
      warte(0.5);
      zieh(() => { const r = formRahmen(); const x = r.x0 + r.w * 0.3; return [[x - 10, r.y0 - 60], [x + 4, (r.y0 + r.y1) / 2], [x + 14, r.y1 + 60]]; }, 1.5);
      warte(0.8);
      zieh(() => { const p = mitte('hinten')(); return [p, [p[0] + W() * 0.14, p[1] - H() * 0.06]]; }, 1.2);
      warte(1.2);
    },
    zeichnen() {
      warte(0.4);
      // Form (Auge): geschlossener Kreis auf der Haut
      zieh(() => { const r = formRahmen(); const c = [r.x0 + r.w * 0.28, r.y0 + r.h * 0.38], R = Math.min(r.w, r.h) * 0.09; const w = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2 * 1.02; w.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R * 0.9]); } return w; }, 1.6, { glatt: false });
      warte(0.8);
      // Kritzeln über den hinteren Punkt
      zieh(() => { const p = mitte('hinten')(); const w = []; for (let i = 0; i <= 14; i++) w.push([p[0] - 18 + (i % 2) * 36, p[1] - 22 + i * 3]); return w; }, 1.0, { glatt: false });
      warte(0.9);
      zweiTipp(() => [W() * 0.5, H() * 0.82]);
      warte(1.2);
    },
    zeit() {
      warte(0.4);
      sz.push({ s: 2.6, start: () => ({ ia: naechsteId++, ib: naechsteId++, c: [W() * 0.5, H() * 0.8] }), f: (u, k) => {
        if (!k.an) { runter(k.ia, k.c[0] - 25, k.c[1]); runter(k.ib, k.c[0] + 25, k.c[1]); k.an = true; }
        if (u > 0.22) { const x = -Math.sin(((u - 0.22) / 0.78) * Math.PI) * W() * 0.22; bewegen(k.ia, k.c[0] - 25 + x, k.c[1]); bewegen(k.ib, k.c[0] + 25 + x, k.c[1]); }
        if (u >= 1 && !k.aus) { k.aus = true; hoch(k.ia); hoch(k.ib); }
      } });
      warte(1.0);
    },
    roentgen() {
      warte(0.4);
      halte(() => { const r = formRahmen(); return [r.x0 + r.w * 0.55, r.y0 + r.h * 0.45]; }, 2.2);
      warte(0.6);
      halte(() => [W() * 0.82, H() * 0.18], 3.6);
      warte(0.6);
    },
  };

  // ---- Abspielen ----
  let k = null, i = -1, t0 = 0;
  const start = (name) => {
    sz.length = 0;
    (FILME[name] || (() => {}))();
    i = -1;
    k = null;
  };
  const takt = (t) => {
    if (!sz.length) return false;
    if (i < 0 || (k && t - t0 >= sz[i].s * 1000)) {
      if (i >= 0) sz[i].f(1, k);
      i++;
      if (i >= sz.length) { sz.length = 0; return false; }
      t0 = t;
      k = sz[i].start ? sz[i].start() : {};
    }
    const s = sz[i];
    s.f(s.s > 0 ? Math.min(1, (t - t0) / (s.s * 1000)) : 1, k);
    return true;
  };

  // Geisterfinger zeichnen (in die Überlagerung)
  app.geisterFinger = (ctx, dt) => {
    for (const [id, f] of finger) {
      if (!f.an) { f.aus = (f.aus || 0) + dt; if (f.aus > 0.35) { finger.delete(id); continue; } }
      const a = f.an ? 1 : 1 - f.aus / 0.35;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let j = 1; j < f.spur.length; j++) {
        ctx.globalAlpha = a * (j / f.spur.length) * 0.35;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10 * (j / f.spur.length);
        ctx.beginPath();
        ctx.moveTo(f.spur[j - 1][0], f.spur[j - 1][1]);
        ctx.lineTo(f.spur[j][0], f.spur[j][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  const name = PAR.get('film') || PAR.get('vorfuehren');
  if (PAR.get('film')) {
    // Filmuhr: von außen Bild für Bild
    window.__filmZeit = 0;
    let gestartet = false;
    window.__film = {
      schritt(ms = 1000 / 30) {
        window.__filmZeit += ms;
        if (!gestartet && window.__filmZeit > 400) { start(name); gestartet = true; }
        const laeuft = gestartet ? takt(window.__filmZeit) : true;
        app.bild(window.__filmZeit);
        return laeuft || finger.size > 0;
      },
    };
    return { film: true };
  }
  if (name) {
    setTimeout(() => start(name), 900);
    app.filmTakt = (t) => takt(t);
  }
  return { film: false };
}

function glatt(u) {
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
}
function punktAufWeg(w, u) {
  if (w.length === 1) return w[0];
  const n = w.length - 1;
  const x = Math.min(n - 1e-9, u * n);
  const i = Math.floor(x), f = x - i;
  return [w[i][0] + (w[i + 1][0] - w[i][0]) * f, w[i][1] + (w[i + 1][1] - w[i][1]) * f];
}

export { spiegel };
