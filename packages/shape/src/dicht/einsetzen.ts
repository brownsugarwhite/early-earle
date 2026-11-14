// Form zuerst (05.11.2026), Härte: Ein Loop wird eine Kette von Kanten des Netzes (Florian: Härte wie Edge Crease in Blender, ein
// Knick genau auf der Linie). Solange die Linie nur auf Dreiecken liegt, binden ihre Proben einen ganzen Streifen Dreiecke, und
// in einem Streifen kann sich nichts knicken (gemessen: hart und weich 0,6 Einheiten auseinander). Eingesetzt liegt auf jeder
// Kante, die die Linie kreuzt, ein neuer Punkt; jedes durchlaufene Dreieck wird in drei geteilt. Die Proben des Loops sind dann
// Punkte des Netzes, Härte heißt: Sie glätten nicht über die Linie hinweg.

import { type Haut, type V3, hautAus, hautNormalen } from './kurven';
import { type Loop, type Probe, spiegelProbe } from './loops';

/** Ein Punkt auf einer Kante (u, v) beim Anteil f von u nach v */
type Kantenpunkt = { u: number; v: number; f: number };

const lage = (P: ArrayLike<number>, i: number): V3 => ({ x: P[3 * i]!, y: P[3 * i + 1]!, z: P[3 * i + 2]! });
const schluessel = (n: number, a: number, b: number): number => (a < b ? a * n + b : b * n + a);
const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const punktProd = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const kreuzProd = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/** Netz zum Ablaufen: Dreiecke je Kante, Dreieck je Eckentripel */
type Lauf = { h: Haut; kanten: Map<number, number[]>; dreieck: Map<string, number> };
function laufVon(h: Haut): Lauf {
  const kanten = new Map<number, number[]>();
  const dreieck = new Map<string, number>();
  for (let t = 0; t < h.tri.length / 3; t++) {
    const e = [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];
    dreieck.set([...e].sort((a, b) => a - b).join(), t);
    for (let k = 0; k < 3; k++) {
      const key = schluessel(h.n, e[k]!, e[(k + 1) % 3]!);
      const l = kanten.get(key) ?? [];
      l.push(t);
      kanten.set(key, l);
    }
  }
  return { h, kanten, dreieck };
}
const ecken = (h: Haut, t: number): [number, number, number] => [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];

/** Ein Punkt auf der Haut zum Ablaufen: auf einer Kante oder im Innern eines Dreiecks */
type Ort = { p: V3; kante: Kantenpunkt | null; tri: number };
function ortVon(L: Lauf, pr: Probe): Ort | null {
  const h = L.h;
  const p = { x: 0, y: 0, z: 0 };
  for (let e = 0; e < 3; e++) {
    const q = lage(h.pos, pr.ecken[e]!);
    p.x += pr.b[e]! * q.x;
    p.y += pr.b[e]! * q.y;
    p.z += pr.b[e]! * q.z;
  }
  const tri = L.dreieck.get([...pr.ecken].sort((a, b) => a - b).join());
  if (tri === undefined) return null;
  const nz = [0, 1, 2].filter((e) => pr.b[e]! > 1e-6);
  if (nz.length === 2) {
    const [a, b] = nz as [number, number];
    return { p, kante: { u: pr.ecken[a]!, v: pr.ecken[b]!, f: pr.b[b]! / (pr.b[a]! + pr.b[b]!) }, tri };
  }
  return { p, kante: null, tri };
}

/** Liegt der Ort im Dreieck t (im Innern von t oder auf einer seiner Kanten)? */
function ortIn(h: Haut, o: Ort, t: number): boolean {
  if (o.tri === t) return true;
  if (!o.kante) return false;
  const e = ecken(h, t);
  return e.includes(o.kante.u) && e.includes(o.kante.v);
}

/**
 * Von a nach b über die Dreiecke laufen: in jedem Dreieck in Richtung b (in seiner Ebene) bis zur Kante, über die man es
 * verlässt. Ergebnis: die gekreuzten Kanten (ohne die von a und b selbst), null, wenn b nicht erreicht wird.
 */
function laufen(L: Lauf, a: Ort, b: Ort): Kantenpunkt[] | null {
  const h = L.h;
  // Startdreieck: das von a, bei einem Punkt auf einer Kante das, auf dessen Seite b liegt
  let t = a.tri;
  let ein: number | null = null;
  if (a.kante) {
    const nb = L.kanten.get(schluessel(h.n, a.kante.u, a.kante.v)) ?? [];
    for (const c of nb) if (ortIn(h, b, c)) return [];
    ein = schluessel(h.n, a.kante.u, a.kante.v);
    // die Seite der Kante, auf der b liegt: gemessen quer zur Kante (bis zum 14.11. am Abstand zur dritten Ecke; lief die Linie
    // fast längs der Kante los, etwa an der Kehre einer schmalen Form, fiel die Wahl auf das Dreieck, dessen dritte Ecke weiter
    // hinten lag, und aus ihm führte kein Weg)
    const ku = lage(h.pos, a.kante.u);
    const kante = minus(lage(h.pos, a.kante.v), ku);
    const kl = punktProd(kante, kante) || 1;
    let best = -Infinity;
    for (const c of nb) {
      const e = ecken(h, c);
      const w = e.find((x) => x !== a.kante!.u && x !== a.kante!.v)!;
      const zw = minus(lage(h.pos, w), ku);
      const laengs = punktProd(zw, kante) / kl;
      const quer = { x: zw.x - laengs * kante.x, y: zw.y - laengs * kante.y, z: zw.z - laengs * kante.z };
      const ql = Math.hypot(quer.x, quer.y, quer.z) || 1;
      const d = punktProd(minus(b.p, a.p), quer) / ql;
      if (d > best) {
        best = d;
        t = c;
      }
    }
  }
  const aus: Kantenpunkt[] = [];
  let c = a.p;
  for (let schritt = 0; schritt < 64; schritt++) {
    if (ortIn(h, b, t)) return aus;
    const e = ecken(h, t);
    const q = e.map((i) => lage(h.pos, i));
    const n = kreuzProd(minus(q[1]!, q[0]!), minus(q[2]!, q[0]!));
    // Richtung in der Ebene des Dreiecks
    const nl = Math.hypot(n.x, n.y, n.z) || 1;
    const nn = { x: n.x / nl, y: n.y / nl, z: n.z / nl };
    let d = minus(b.p, c);
    const dn = punktProd(d, nn);
    d = { x: d.x - dn * nn.x, y: d.y - dn * nn.y, z: d.z - dn * nn.z };
    let wahl: { k: number; s: number; f: number } | null = null;
    for (let k = 0; k < 3; k++) {
      const u = e[k]!;
      const v = e[(k + 1) % 3]!;
      const key = schluessel(h.n, u, v);
      if (key === ein) continue;
      // Strahl c + s d gegen die Kante q_u + f (q_v − q_u), in der Ebene (über das Kreuzprodukt mit der Normale)
      const qu = q[k]!;
      const qv = q[(k + 1) % 3]!;
      const kv = minus(qv, qu);
      const w = minus(qu, c);
      const nenner = punktProd(kreuzProd(d, kv), nn);
      if (Math.abs(nenner) < 1e-12) continue;
      const s = punktProd(kreuzProd(w, kv), nn) / nenner;
      const f = punktProd(kreuzProd(w, d), nn) / nenner;
      if (s < -1e-9 || f < -1e-6 || f > 1 + 1e-6) continue;
      if (!wahl || s < wahl.s) wahl = { k, s, f: Math.max(0, Math.min(1, f)) };
    }
    if (!wahl) return null;
    const u = e[wahl.k]!;
    const v = e[(wahl.k + 1) % 3]!;
    aus.push({ u, v, f: wahl.f });
    const key = schluessel(h.n, u, v);
    const nb = (L.kanten.get(key) ?? []).filter((x) => x !== t);
    if (nb.length !== 1) return null;
    const qu = lage(h.pos, u);
    const qv = lage(h.pos, v);
    c = { x: qu.x + wahl.f * (qv.x - qu.x), y: qu.y + wahl.f * (qv.y - qu.y), z: qu.z + wahl.f * (qv.z - qu.z) };
    ein = key;
    t = nb[0]!;
  }
  return null;
}

/**
 * Geschlossener Weg einer Linie über Kanten: ihre Proben (Orte) der Reihe nach, dazwischen abgelaufen. Proben im Innern eines
 * Dreiecks fallen weg (der Weg besteht nur aus Punkten auf Kanten). Hin und zurück über dieselbe Kante fällt weg.
 */
function wegAus(L: Lauf, orte: readonly Ort[]): Kantenpunkt[] | null {
  const weg: Kantenpunkt[] = [];
  for (let i = 0; i < orte.length; i++) {
    const a = orte[i]!;
    const b = orte[(i + 1) % orte.length]!;
    if (a.kante) weg.push(a.kante);
    const zw = laufen(L, a, b);
    if (!zw) return null;
    weg.push(...zw);
  }
  // gleiche Kante zweimal hintereinander: hin und zurück, beide fallen weg
  const n = L.h.n;
  let geaendert = true;
  while (geaendert && weg.length > 2) {
    geaendert = false;
    for (let i = 0; i < weg.length; i++) {
      const j = (i + 1) % weg.length;
      if (schluessel(n, weg[i]!.u, weg[i]!.v) === schluessel(n, weg[j]!.u, weg[j]!.v)) {
        weg.splice(Math.max(i, j), 1);
        weg.splice(Math.min(i, j), 1);
        geaendert = true;
        break;
      }
    }
  }
  return weg.length >= 3 ? weg : null;
}

/**
 * Offener Weg von der ersten zur letzten Probe (die Hälfte eines Rings, Enden auf der Mittelebene), sonst wie `wegAus`. Die
 * Spiegelhälfte wird nicht abgelaufen, sondern gespiegelt: Rückwärts abgelaufen kreuzte sie andere Kanten (die Richtung wird in
 * jedem Dreieck neu zum Ziel genommen), ihre Punkte hätten keine Spiegelpartner.
 */
function wegOffen(L: Lauf, orte: readonly Ort[]): Kantenpunkt[] | null {
  const weg: Kantenpunkt[] = [];
  for (let i = 0; i + 1 < orte.length; i++) {
    const a = orte[i]!;
    if (a.kante) weg.push(a.kante);
    const zw = laufen(L, a, orte[i + 1]!);
    if (!zw) return null;
    weg.push(...zw);
  }
  const z = orte[orte.length - 1]!;
  if (z.kante) weg.push(z.kante);
  // derselbe Punkt zweimal (ein Ende des Schnitts liegt auf dem ersten Kantenpunkt) bleibt einmal; über dieselbe Kante hin und
  // zurück fällt weg, die Enden bleiben
  const n = L.h.n;
  const gleicheKante = (a: Kantenpunkt, b: Kantenpunkt) => schluessel(n, a.u, a.v) === schluessel(n, b.u, b.v);
  const f = (k: Kantenpunkt) => (k.u < k.v ? k.f : 1 - k.f);
  for (let i = 0; i + 1 < weg.length; ) {
    if (gleicheKante(weg[i]!, weg[i + 1]!) && Math.abs(f(weg[i]!) - f(weg[i + 1]!)) < 1e-9) weg.splice(i + 1, 1);
    else i++;
  }
  for (let i = 1; i + 2 < weg.length; ) {
    if (gleicheKante(weg[i]!, weg[i + 1]!)) {
      weg.splice(i, 2);
      i = Math.max(1, i - 1);
    } else i++;
  }
  return weg.length >= 2 ? weg : null;
}

/**
 * Einen geschlossenen Weg einsetzen: je gekreuzte Kante ein neuer Punkt, jedes Dreieck zwischen zwei Wegpunkten in drei geteilt.
 * Jede Kante und jedes Dreieck höchstens einmal, sonst null.
 */
function wegEinsetzen(L: Lauf, weg: readonly Kantenpunkt[]): { pos: number[]; tri: number[]; neu: number[]; geteilt: Map<number, number> } | null {
  const h = L.h;
  const pos = Array.from(h.pos);
  const tri = Array.from(h.tri);
  const geteilt = new Map<number, number>();
  const neu: number[] = [];
  for (const k of weg) {
    const key = schluessel(h.n, k.u, k.v);
    if (geteilt.has(key)) return null;
    const f = Math.max(0.03, Math.min(0.97, k.f));
    const a = lage(h.pos, k.u);
    const b = lage(h.pos, k.v);
    const w = pos.length / 3;
    pos.push(a.x + f * (b.x - a.x), a.y + f * (b.y - a.y), a.z + f * (b.z - a.z));
    geteilt.set(key, w);
    neu.push(w);
  }
  const benutzt = new Set<number>();
  for (let i = 0; i < weg.length; i++) {
    const p = weg[i]!;
    const q = weg[(i + 1) % weg.length]!;
    const kp = L.kanten.get(schluessel(h.n, p.u, p.v)) ?? [];
    const kq = L.kanten.get(schluessel(h.n, q.u, q.v)) ?? [];
    const t = kp.find((x) => kq.includes(x));
    if (t === undefined || benutzt.has(t)) return null;
    benutzt.add(t);
    const e = ecken(h, t);
    // Spitze = die gemeinsame Ecke beider Kanten; in Umlaufrichtung: Spitze, nächste, vorige
    const gemein = [p.u, p.v].find((x) => x === q.u || x === q.v);
    if (gemein === undefined) return null;
    const i0 = e.indexOf(gemein);
    const spitze = e[i0]!;
    const naechste = e[(i0 + 1) % 3]!;
    const vorige = e[(i0 + 2) % 3]!;
    const wN = geteilt.get(schluessel(h.n, spitze, naechste));
    const wV = geteilt.get(schluessel(h.n, spitze, vorige));
    if (wN === undefined || wV === undefined) return null;
    tri[3 * t] = spitze;
    tri[3 * t + 1] = wN;
    tri[3 * t + 2] = wV;
    // Viereck (wN, nächste, vorige, wV): an der kürzeren Diagonale teilen; das Spiegelbild wählt so die gespiegelte. Ist das
    // Viereck sein eigenes Spiegelbild (gleich lange Diagonalen), bekommt es einen Mittelpunkt, sonst wäre das Netz schief
    const at = (i: number) => ({ x: pos[3 * i]!, y: pos[3 * i + 1]!, z: pos[3 * i + 2]! });
    const d1 = Math.hypot(at(wN).x - at(vorige).x, at(wN).y - at(vorige).y, at(wN).z - at(vorige).z);
    const d2 = Math.hypot(at(naechste).x - at(wV).x, at(naechste).y - at(wV).y, at(naechste).z - at(wV).z);
    if (Math.abs(d1 - d2) < 1e-6 * (d1 + d2)) {
      const m = pos.length / 3;
      const c = [wN, naechste, vorige, wV].map(at);
      pos.push((c[0]!.x + c[1]!.x + c[2]!.x + c[3]!.x) / 4, (c[0]!.y + c[1]!.y + c[2]!.y + c[3]!.y) / 4, (c[0]!.z + c[1]!.z + c[2]!.z + c[3]!.z) / 4);
      tri.push(wN, naechste, m, naechste, vorige, m, vorige, wV, m, wV, wN, m);
    } else if (d1 <= d2) tri.push(wN, naechste, vorige, wN, vorige, wV);
    else tri.push(wN, naechste, wV, naechste, vorige, wV);
  }
  return { pos, tri, neu, geteilt };
}

/**
 * Nach dem Einsetzen: die Punkte neben der Linie in der Fläche entspannen (zum Mittel ihrer Nachbarn, ohne die Normalrichtung),
 * damit keine Splitterdreiecke bleiben; sie kippten, sobald die Linie sie beim Ziehen überholt. Punkte auf Linien bleiben.
 */
function entspannen(h: Haut, fest: ReadonlySet<number>, start: readonly number[], ringe = 2, runden = 3): void {
  const bereich = new Set<number>();
  let rand = [...start];
  for (let k = 0; k < ringe; k++) {
    const neu: number[] = [];
    for (const v of rand) {
      for (const u of h.nachbarn[v]!) {
        if (bereich.has(u) || fest.has(u)) continue;
        bereich.add(u);
        neu.push(u);
      }
    }
    rand = neu;
  }
  const P = h.pos;
  for (let r = 0; r < runden; r++) {
    const nor = hautNormalen(h);
    const neu = new Map<number, V3>();
    for (const v of bereich) {
      const nb = h.nachbarn[v]!;
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (const u of nb) {
        ax += P[3 * u]!;
        ay += P[3 * u + 1]!;
        az += P[3 * u + 2]!;
      }
      const d = nb.length || 1;
      let dx = ax / d - P[3 * v]!;
      let dy = ay / d - P[3 * v + 1]!;
      let dz = az / d - P[3 * v + 2]!;
      const dn = dx * nor[3 * v]! + dy * nor[3 * v + 1]! + dz * nor[3 * v + 2]!;
      dx -= dn * nor[3 * v]!;
      dy -= dn * nor[3 * v + 1]!;
      dz -= dn * nor[3 * v + 2]!;
      neu.set(v, { x: P[3 * v]! + 0.5 * dx, y: P[3 * v + 1]! + 0.5 * dy, z: P[3 * v + 2]! + 0.5 * dz });
    }
    for (const [v, q] of neu) {
      P[3 * v] = q.x;
      P[3 * v + 1] = q.y;
      P[3 * v + 2] = q.z;
    }
  }
}

/** Probe eines Punkts des Netzes */
const punktProbe = (w: number): Probe => ({ ecken: [w, w, w], b: [1, 0, 0] });
const istPunktProbe = (p: Probe): boolean => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2];

/** Loop aus einer Kette von Punkten des Netzes neu vermessen (Bogenlänge, Ruhe), Punkte an ihre Stelle */
function loopNeu(h: Haut, l: Loop, kette: readonly number[]): Loop {
  const p = kette.map((w) => lage(h.pos, w));
  if (l.art === 'mitte') p.forEach((q) => (q.z = 0));
  if (l.art === 'ring') {
    p[0]!.z = 0;
    p[p.length - 1]!.z = 0;
  }
  const n = p.length;
  const s = new Float64Array(n);
  for (let i = 1; i < n; i++) s[i] = s[i - 1]! + Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y, p[i]!.z - p[i - 1]!.z);
  const laenge = s[n - 1]! + (l.art === 'ring' ? 0 : Math.hypot(p[0]!.x - p[n - 1]!.x, p[0]!.y - p[n - 1]!.y, p[0]!.z - p[n - 1]!.z));
  const ruhe = new Float64Array(3 * n);
  p.forEach((q, i) => {
    ruhe[3 * i] = q.x;
    ruhe[3 * i + 1] = q.y;
    ruhe[3 * i + 2] = q.z;
  });
  // Punkte: an die nächste Stelle der neuen Kette
  const punkte = l.punkte.map((pt) => {
    let best = Infinity;
    let bs = pt.s;
    for (let i = 0; i < (l.art === 'ring' ? n - 1 : n); i++) {
      const j = (i + 1) % n;
      const a = p[i]!;
      const b = p[j]!;
      const ab = minus(b, a);
      const L2 = punktProd(ab, ab) || 1;
      const t = Math.max(0, Math.min(1, punktProd(minus(pt.ref, a), ab) / L2));
      const d = Math.hypot(a.x + t * ab.x - pt.ref.x, a.y + t * ab.y - pt.ref.y, a.z + t * ab.z - pt.ref.z);
      if (d < best) {
        best = d;
        bs = s[i]! + t * ((j > i ? s[j]! : laenge) - s[i]!);
      }
    }
    return { ...pt, s: bs };
  });
  punkte.sort((a, b) => a.s - b.s);
  return { ...l, proben: kette.map(punktProbe), s, laenge, ruhe, punkte };
}

/**
 * Ein anderer Loop, dessen Kette beim Einsetzen neue Punkte bekam (je geteilte Kante einer): Die alten Proben behalten ihre Stelle
 * s, eine neue liegt auf ihrer Kante dazwischen (s nach dem Anteil), die Punkte bleiben. Bis zum 07.11. wurde s neu als Bogenlänge
 * vermessen; seit die Linie genau ihr Pfad ist, hat jede Probe dort ihren festen Platz (t im Stück), und neu vermessen rutschten die
 * Proben auf dem Pfad längs, eine Kreuzung lag dann bis einige Einheiten neben der Stelle, an der sich die Linien wirklich kreuzen.
 */
function loopErgaenzt(h: Haut, l: Loop, kette: readonly number[]): Loop {
  const alt = new Map<number, number>();
  l.proben.forEach((p, i) => alt.set(p.ecken[0], i));
  const n = kette.length;
  const p = kette.map((w) => lage(h.pos, w));
  if (l.art === 'mitte') p.forEach((q) => (q.z = 0));
  if (l.art === 'ring') {
    p[0]!.z = 0;
    p[n - 1]!.z = 0;
  }
  const s = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const i = alt.get(kette[k]!);
    if (i !== undefined) {
      s[k] = l.s[i]!;
      continue;
    }
    // neu: zwischen der alten Probe davor und der danach (beim geschlossenen Loop hinter der letzten die erste, eine Länge weiter)
    const ia = alt.get(kette[k - 1]!)!;
    const ib = k + 1 < n ? alt.get(kette[k + 1]!)! : 0;
    const sa = l.s[ia]!;
    const sb = k + 1 < n ? l.s[ib]! : l.s[0]! + l.laenge;
    const a = p[k - 1]!;
    const ab = minus(p[(k + 1) % n]!, a);
    const f = Math.max(0, Math.min(1, punktProd(minus(p[k]!, a), ab) / (punktProd(ab, ab) || 1)));
    s[k] = sa + f * (sb - sa);
  }
  const ruhe = new Float64Array(3 * n);
  p.forEach((q, i) => {
    ruhe[3 * i] = q.x;
    ruhe[3 * i + 1] = q.y;
    ruhe[3 * i + 2] = q.z;
  });
  return { ...l, proben: kette.map(punktProbe), s, ruhe };
}

/**
 * Die Kette der Punkte der Mittelebene schließen: Jede Kante zwischen einem Punkt und seinem Spiegelbild, deren beide Dreiecke
 * ihre dritte Ecke in der Mittelebene haben, wird gedreht (danach verbindet sie diese beiden Ecken, längs der Mitte). Die Lagen
 * bleiben; zurück die neue Haut, null, wenn nichts zu drehen war.
 */
function mitteKetteSchliessen(h: Haut, auf: ReadonlySet<number>): Haut | null {
  const tri = Uint32Array.from(h.tri);
  // je Kante quer über die Mitte (a < b, b das Spiegelbild von a): ihre Dreiecke
  const quer = new Map<number, number[]>();
  for (let t = 0; t < tri.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e]!;
      const b = tri[t + ((e + 1) % 3)]!;
      if (auf.has(a) || auf.has(b) || h.spiegel[a] !== b) continue;
      const k = Math.min(a, b) * h.n + Math.max(a, b);
      const liste = quer.get(k);
      if (liste) liste.push(t);
      else quer.set(k, [t]);
    }
  let gedreht = 0;
  for (const ts of quer.values()) {
    if (ts.length !== 2) continue;
    const [t1, t2] = ts as [number, number];
    // t1 = (x, y, c) mit der Kante x→y, t2 = (y, x, d)
    const e1 = [tri[t1]!, tri[t1 + 1]!, tri[t1 + 2]!];
    const ic = e1.findIndex((v) => auf.has(v));
    if (ic < 0) continue;
    const c = e1[ic]!;
    const x = e1[(ic + 1) % 3]!;
    const y = e1[(ic + 2) % 3]!;
    const d = [tri[t2]!, tri[t2 + 1]!, tri[t2 + 2]!].find((v) => v !== x && v !== y);
    if (d === undefined || !auf.has(d) || d === c || h.nachbarn[c]!.includes(d)) continue;
    tri[t1] = x;
    tri[t1 + 1] = d;
    tri[t1 + 2] = c;
    tri[t2] = y;
    tri[t2 + 1] = c;
    tri[t2 + 2] = d;
    gedreht++;
  }
  return gedreht ? hautAus(h.pos, tri) : null;
}

/**
 * Kanten, die ein Weg mehr als einmal kreuzt (hin und zurück hintereinander hat `wegOffen` schon entfernt): je Kante die Stelle
 * mitten zwischen ihren beiden ersten Kreuzungen (u < v, f von u nach v). So läuft die Linie am spitzen Ende einer schmalen Form
 * (am Mundwinkel eines Keils kommen beide Lippen durch dieselben Dreiecke). Null, wenn zwei Kreuzungen an derselben Stelle liegen
 * (dann lässt sich die Kante nicht zwischen ihnen teilen).
 */
function doppeltGekreuzt(h: Haut, weg: readonly Kantenpunkt[]): Kantenpunkt[] | null {
  const bei = new Map<number, { u: number; v: number; f: number[] }>();
  for (const k of weg) {
    const [u, v, f] = k.u < k.v ? [k.u, k.v, k.f] : [k.v, k.u, 1 - k.f];
    const e = bei.get(u * h.n + v);
    if (e) e.f.push(f);
    else bei.set(u * h.n + v, { u, v, f: [f] });
  }
  const aus: Kantenpunkt[] = [];
  for (const e of bei.values()) {
    if (e.f.length < 2) continue;
    const f = [...e.f].sort((x, y) => x - y);
    const a = lage(h.pos, e.u);
    const b = lage(h.pos, e.v);
    const lang = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if ((f[1]! - f[0]!) * lang < 1e-6 * Math.max(1, lang)) return null;
    aus.push({ u: e.u, v: e.v, f: (f[0]! + f[1]!) / 2 });
  }
  return aus;
}

/**
 * Kanten teilen (je Kante ein neuer Punkt bei f von u nach v; jedes Dreieck an ihr wird zu zweien), spiegelgleich: mit jeder Kante
 * auch ihr Spiegelbild; eine Kante in der Mittelebene ist ihr eigenes. Null, wenn eine Kante quer über die Mitte läuft und nicht in
 * ihrer Mitte geteilt werden soll (das Netz bliebe nicht spiegelgleich) oder eine Ecke kein Spiegelbild hat. Zurück: die neue Haut
 * und je geteilte Kante (Schlüssel im alten Netz) ihr neuer Punkt.
 */
function kantenTeilen(h: Haut, teile: readonly Kantenpunkt[]): { haut: Haut; geteilt: Map<number, number> } | null {
  const pos = Array.from(h.pos);
  const tri = Array.from(h.tri);
  const geteilt = new Map<number, number>();
  const teilen = (u: number, v: number, f: number): void => {
    const key = schluessel(h.n, u, v);
    if (geteilt.has(key)) return;
    const m = pos.length / 3;
    for (let x = 0; x < 3; x++) pos.push(pos[3 * u + x]! + f * (pos[3 * v + x]! - pos[3 * u + x]!));
    geteilt.set(key, m);
    const T = tri.length / 3;
    for (let t = 0; t < T; t++)
      for (let e = 0; e < 3; e++) {
        const a = tri[3 * t + e]!;
        const b = tri[3 * t + ((e + 1) % 3)]!;
        if (!((a === u && b === v) || (a === v && b === u))) continue;
        const c = tri[3 * t + ((e + 2) % 3)]!;
        tri[3 * t] = a;
        tri[3 * t + 1] = m;
        tri[3 * t + 2] = c;
        tri.push(m, b, c);
        break;
      }
  };
  for (const k of teile) {
    const su = h.spiegel[k.u]!;
    const sv = h.spiegel[k.v]!;
    if (su < 0 || sv < 0) return null;
    if (su === k.v && sv === k.u) {
      // quer über die Mitte: nur in ihrer Mitte (der neue Punkt liegt dann auf der Mittelebene)
      if (Math.abs(k.f - 0.5) > 0.2) return null;
      teilen(k.u, k.v, 0.5);
      pos[pos.length - 1] = 0;
      continue;
    }
    teilen(k.u, k.v, k.f);
    if (su !== k.u || sv !== k.v) teilen(su, sv, k.f);
  }
  return { haut: hautAus(pos, tri), geteilt };
}

/**
 * Ein Dreieck an einem Ort in seinem Innern in drei teilen (neuer Punkt dort), spiegelgleich mit seinem Spiegelbild. Null, wenn das
 * Dreieck sein eigenes Spiegelbild ist oder eine Ecke keins hat. Zurück: die neue Haut und der neue Punkt.
 */
function dreieckTeilen(h: Haut, t: number, P: V3): { haut: Haut; w: number } | null {
  const e = ecken(h, t);
  const se = e.map((v) => h.spiegel[v]!);
  if (se.some((v) => v < 0)) return null;
  const gleich = se.every((v) => e.includes(v));
  if (gleich) return null;
  const pos = Array.from(h.pos);
  const tri = Array.from(h.tri);
  const teilen = (tt: number, Q: V3): number => {
    const [a, b, c] = [tri[3 * tt]!, tri[3 * tt + 1]!, tri[3 * tt + 2]!];
    const w = pos.length / 3;
    pos.push(Q.x, Q.y, Q.z);
    tri[3 * tt] = a;
    tri[3 * tt + 1] = b;
    tri[3 * tt + 2] = w;
    tri.push(b, c, w, c, a, w);
    return w;
  };
  // das Spiegelbild: das Dreieck mit den gespiegelten Ecken
  const sk = [...se].sort((x, y) => x - y).join();
  let ts = -1;
  for (let k = 0; k < h.tri.length / 3; k++)
    if (ecken(h, k)
      .sort((x, y) => x - y)
      .join() === sk) {
      ts = k;
      break;
    }
  if (ts < 0) return null;
  const w = teilen(t, P);
  teilen(ts, { x: P.x, y: P.y, z: -P.z });
  return { haut: hautAus(pos, tri), w };
}

/**
 * Die Loops nach `kantenTeilen` nachführen: Ein eingesetzter bekommt die neuen Punkte auf seinen Kettenkanten in seine Kette, bei
 * einem aufliegenden kommen die Proben in die neuen Dreiecke. Null, wenn eine Probe ihren Ort nicht wiederfindet.
 */
function loopsNachTeilen(alt: Haut, neu: Haut, geteilt: ReadonlyMap<number, number>, loops: readonly Loop[], ausser = -1): Loop[] | null {
  const aus: Loop[] = [];
  for (let i = 0; i < loops.length; i++) {
    const x = loops[i]!;
    if (i === ausser) {
      aus.push(x);
      continue;
    }
    if (!x.proben.every(istPunktProbe)) {
      const q = x.proben.map((p) => probeUmlegen(alt, neu, p));
      if (q.some((p) => !p)) return null;
      aus.push({ ...x, proben: q as Probe[] });
      continue;
    }
    const kette: number[] = [];
    const m = x.proben.length;
    for (let k = 0; k < m; k++) {
      const v = x.proben[k]!.ecken[0];
      kette.push(v);
      if (x.art === 'ring' && k === m - 1) break;
      const w = geteilt.get(schluessel(alt.n, v, x.proben[(k + 1) % m]!.ecken[0]));
      if (w !== undefined) kette.push(w);
    }
    aus.push(kette.length === m ? x : loopErgaenzt(neu, x, kette));
  }
  return aus;
}

/**
 * Kanten der Haut teilen (je Kante ein neuer Punkt bei f von u nach v, spiegelgleich mit ihrem Spiegelbild) und die Loops
 * mitnehmen. Die alten Punkte behalten ihre Nummern, die neuen stehen hinten; ihre Lagen sind die auf der Kante. Null, wenn es so
 * nicht geht (eine Kante quer über die Mitte außerhalb ihrer Mitte, eine Probe ohne Ort).
 */
export function kantenTeilenMit(h: Haut, loops: readonly Loop[], teile: readonly { u: number; v: number; f: number }[]): { haut: Haut; loops: Loop[] } | null {
  const r = kantenTeilen(h, teile);
  if (!r) return null;
  const neu = loopsNachTeilen(h, r.haut, r.geteilt, loops);
  return neu ? { haut: r.haut, loops: neu } : null;
}

/** Eine Probe, deren Dreieck geteilt wurde, in das Dreieck des neuen Netzes legen, in dem ihr Ort liegt (ihr Ort bleibt) */
function probeUmlegen(alt: Haut, neu: Haut, p: Probe): Probe | null {
  if (istPunktProbe(p)) return p;
  const q = { x: 0, y: 0, z: 0 };
  for (let e = 0; e < 3; e++) {
    const c = lage(alt.pos, p.ecken[e]!);
    q.x += p.b[e]! * c.x;
    q.y += p.b[e]! * c.y;
    q.z += p.b[e]! * c.z;
  }
  let best: Probe | null = null;
  let gut = -Infinity;
  const kandidat = new Set(p.ecken);
  for (let t = 0; t < neu.tri.length / 3; t++) {
    const e = ecken(neu, t);
    // nur Dreiecke, die aus dem alten entstanden sind: ihre Ecken sind alte Ecken dieses Dreiecks oder neue Punkte
    if (e.some((v) => v < alt.n && !kandidat.has(v))) continue;
    const [A, B, C] = e.map((v) => lage(neu.pos, v)) as [V3, V3, V3];
    const n = kreuzProd(minus(B, A), minus(C, A));
    const nn = punktProd(n, n);
    if (nn < 1e-18) continue;
    // nicht in der Ebene des Dreiecks: ein anderes Dreieck mit denselben alten Ecken
    const hoch = punktProd(minus(q, A), n) / Math.sqrt(nn);
    if (Math.abs(hoch) > 1e-6 * Math.max(1, Math.sqrt(Math.sqrt(nn)))) continue;
    const b1 = punktProd(kreuzProd(minus(C, B), minus(q, B)), n) / nn;
    const b2 = punktProd(kreuzProd(minus(A, C), minus(q, C)), n) / nn;
    const b3 = 1 - b1 - b2;
    const m = Math.min(b1, b2, b3);
    if (m > gut) {
      gut = m;
      best = { ecken: e, b: [Math.max(0, b1), Math.max(0, b2), Math.max(0, b3)] };
    }
  }
  return gut > -1e-6 ? best : null;
}

/** Warum das letzte `loopEinsetzen` eines Rings null ergab (zum Nachsehen; leer, wenn es ging oder der Grund nicht erfasst ist) */
export let einsetzenGrund = '';

/**
 * Einen Loop ins Netz einsetzen (samt Spiegelbild: der Ring als ganzer Ring, das Paar mit seinem Zwilling). Danach ist jede
 * seiner Proben ein Punkt des Netzes. Andere eingesetzte Loops bekommen die Punkte auf ihren geteilten Kanten dazu. Ergebnis:
 * die neue Haut und alle Loops (in derselben Reihenfolge), null, wenn der Weg nicht aufgeht (dann bleibt alles, wie es war).
 */
export function loopEinsetzen(h: Haut, loops: readonly Loop[], nr: number): { haut: Haut; loops: Loop[] } | null {
  einsetzenGrund = '';
  const ohne = (grund: string): null => {
    einsetzenGrund = grund;
    return null;
  };
  const l = loops[nr];
  if (!l) return null;
  let haut = h;
  let liste = [...loops];
  const alleNeu: number[] = [];
  /** die zwei Punkte an jeder Kehre (vor und hinter der Spitze): Das Entspannen am Ende lässt sie stehen (es zöge den vorderen hinter die Spitze) */
  const kehrenFest: number[] = [];
  const einsetzen = (proben: readonly Probe[]): number[] | null => {
    const L = laufVon(haut);
    const orte = proben.map((p) => ortVon(L, p));
    if (orte.some((o) => !o)) return null;
    const weg = wegAus(L, orte as Ort[]);
    if (!weg) return null;
    return einsetzenWeg(L, weg);
  };
  function einsetzenWeg(L: Lauf, weg: readonly Kantenpunkt[]): number[] | null {
    const r = wegEinsetzen(L, weg);
    if (!r) return null;
    haut = hautAus(r.pos, r.tri);
    // andere eingesetzte Loops: Punkte auf geteilten Kanten einfügen
    liste = liste.map((x, i) => {
      if (i === nr || !x.proben.every(istPunktProbe)) return x;
      const alt = x.proben.map((p) => p.ecken[0]);
      const kette: number[] = [];
      const m = alt.length;
      for (let k = 0; k < m; k++) {
        kette.push(alt[k]!);
        if (x.art === 'ring' && k === m - 1) break;
        const w = r.geteilt.get(schluessel(L.h.n, alt[k]!, alt[(k + 1) % m]!));
        if (w !== undefined) kette.push(w);
      }
      return kette.length === m ? x : loopErgaenzt(haut, x, kette);
    });
    alleNeu.push(...r.neu);
    return r.neu;
  }
  if (l.art === 'mitte') {
    // Das Netz hat Punkte genau auf der Mittelebene (sonst wäre es nicht spiegelgleich zu triangulieren): Die Mitte läuft schon
    // über Kanten. Ihre Kette: die Punkte auf z = 0, der Reihe nach über ihre Kanten.
    const auf = new Set<number>();
    for (let v = 0; v < h.n; v++) if (Math.abs(h.pos[3 * v + 2]!) < 1e-9) auf.add(v);
    if (auf.size < 3) return null;
    // Wo zwischen zwei Punkten der Mittelebene statt der Kante längs eine Kante quer über die Mitte läuft (ein Punkt und sein
    // Spiegelbild; so drehte das Verdichten bis zum 11.11. Kanten der Mittelebene), ist die Kette offen: zurückdrehen.
    const geheilt = mitteKetteSchliessen(h, auf);
    if (geheilt) {
      haut = geheilt;
      h = geheilt;
    }
    const start = [...auf][0]!;
    const kette = [start];
    let vor = -1;
    let jetzt = start;
    for (let k = 0; k < auf.size; k++) {
      const weiter = h.nachbarn[jetzt]!.filter((x) => auf.has(x) && x !== vor);
      if (weiter.length === 0) return null;
      // beim ersten Schritt eine Richtung wählen, danach die Kette weiter
      const n = weiter[0]!;
      if (n === start) break;
      if (kette.includes(n)) return null;
      kette.push(n);
      vor = jetzt;
      jetzt = n;
    }
    if (kette.length !== auf.size) return null;
    liste[nr] = loopNeu(haut, l, kette);
    return { haut, loops: liste };
  }
  if (l.art === 'ring') {
    // ganzer Ring: die Hälfte von Ende zu Ende abgelaufen, dazu ihr Spiegelbild zurück (ohne die Enden auf der Mitte)
    let proben: readonly Probe[] = l.proben;
    // Kehren (14.11.): Wo die Linie umkehrt (die Spitze einer schmalen Form, der Mundwinkel eines Keils), liegt ihre Probe mitten in
    // einem Dreieck, und der Weg lief bisher über dieselbe Kante hinein und hinaus: Hin und Zurück fielen weg, die Spitze war
    // abgeschnitten (gemessen bis 14 Einheiten), und später wurde ihr Endpunkt quer über fremde Dreiecke zur Spitze gezogen (dort
    // verhedderte sich das Netz). Jetzt bekommt das Netz genau an der Kehre einen Punkt (das Dreieck wird in drei geteilt) und vor
    // ihr einen zweiten: Die Kante zwischen beiden läuft längs der Spitze. Der Weg kreuzt sie dicht an der Kehre; die eine Lippe
    // kommt von der einen Seite, die andere geht auf der anderen, und keine Speiche des neuen Punkts wird zweimal gekreuzt.
    {
      const ort = (pr: Probe): V3 => {
        const q = { x: 0, y: 0, z: 0 };
        for (let e = 0; e < 3; e++) {
          const c = lage(haut.pos, pr.ecken[e]!);
          q.x += pr.b[e]! * c.x;
          q.y += pr.b[e]! * c.y;
          q.z += pr.b[e]! * c.z;
        }
        return q;
      };
      for (let j = 1; j + 1 < proben.length; j++) {
        const pr = proben[j]!;
        if (istPunktProbe(pr) || pr.b.some((x) => x < 1e-3)) continue;
        const [A, B, C] = [ort(proben[j - 1]!), ort(pr), ort(proben[j + 1]!)];
        const ein = minus(B, A);
        const aus = minus(C, B);
        const le = Math.hypot(ein.x, ein.y, ein.z);
        const la = Math.hypot(aus.x, aus.y, aus.z);
        if (le < 1e-9 || la < 1e-9 || punktProd(ein, aus) / (le * la) > Math.cos((140 * Math.PI) / 180)) continue;
        const t = laufVon(haut).dreieck.get([...pr.ecken].sort((x, y) => x - y).join());
        if (t === undefined) continue;
        const alt = haut;
        const eAlt = ecken(alt, t);
        // die Richtung der Spitze: von der Mitte der beiden Nachbarn zur Kehre, in der Ebene des Dreiecks
        const q = eAlt.map((v) => lage(alt.pos, v));
        const nor = kreuzProd(minus(q[1]!, q[0]!), minus(q[2]!, q[0]!));
        const nl = Math.hypot(nor.x, nor.y, nor.z) || 1;
        const nn = { x: nor.x / nl, y: nor.y / nl, z: nor.z / nl };
        let achse = { x: B.x - (A.x + C.x) / 2, y: B.y - (A.y + C.y) / 2, z: B.z - (A.z + C.z) / 2 };
        const an = punktProd(achse, nn);
        achse = { x: achse.x - an * nn.x, y: achse.y - an * nn.y, z: achse.z - an * nn.z };
        const al = Math.hypot(achse.x, achse.y, achse.z);
        if (al < 1e-9) continue;
        achse = { x: achse.x / al, y: achse.y / al, z: achse.z / al };
        // die Kante des Dreiecks vor der Spitze und wie weit es bis zu ihr ist
        let vor: { k: number; f: number; s: number } | null = null;
        for (let k = 0; k < 3; k++) {
          const qu = q[k]!;
          const kv = minus(q[(k + 1) % 3]!, qu);
          const w0 = minus(qu, B);
          const nenner = punktProd(kreuzProd(achse, kv), nn);
          if (Math.abs(nenner) < 1e-12) continue;
          const sx = punktProd(kreuzProd(w0, kv), nn) / nenner;
          const f = punktProd(kreuzProd(w0, achse), nn) / nenner;
          if (sx <= 1e-9 || f < -1e-6 || f > 1 + 1e-6) continue;
          if (!vor || sx < vor.s) vor = { k, f: Math.max(0.1, Math.min(0.9, f)), s: sx };
        }
        if (!vor) continue;
        // 1. der Punkt genau an der Kehre
        const r1 = dreieckTeilen(alt, t, B);
        if (!r1) continue;
        // 2. der Punkt vor ihr: im Teil des Dreiecks, das vor der Spitze liegt (an der Kante `vor`), ein Stück längs der Richtung; liegt
        // die Kehre dicht an dieser Kante, wird stattdessen die Kante dort geteilt, wo die Richtung sie trifft
        const u = eAlt[vor.k]!;
        const v = eAlt[(vor.k + 1) % 3]!;
        const mass = (Math.hypot(...Object.values(minus(q[1]!, q[0]!))) + Math.hypot(...Object.values(minus(q[2]!, q[1]!))) + Math.hypot(...Object.values(minus(q[0]!, q[2]!)))) / 3;
        let h2: Haut | null = null;
        let w2 = -1;
        let geteilt2: ReadonlyMap<number, number> = new Map();
        if (vor.s >= 0.1 * mass) {
          const d = Math.min(0.25 * mass, 0.5 * vor.s);
          let t2 = -1;
          for (let k = 0; k < r1.haut.tri.length / 3 && t2 < 0; k++) {
            const e = ecken(r1.haut, k);
            if (e.includes(r1.w) && e.includes(u) && e.includes(v)) t2 = k;
          }
          const r2 = t2 >= 0 ? dreieckTeilen(r1.haut, t2, { x: B.x + d * achse.x, y: B.y + d * achse.y, z: B.z + d * achse.z }) : null;
          if (r2) {
            h2 = r2.haut;
            w2 = r2.w;
          }
        } else {
          const r2 = kantenTeilen(r1.haut, [{ u, v, f: vor.f }]);
          const w = r2?.geteilt.get(schluessel(r1.haut.n, u, v));
          if (r2 && w !== undefined) {
            h2 = r2.haut;
            w2 = w;
            geteilt2 = r2.geteilt;
          }
        }
        if (!h2 || w2 < 0 || !h2.nachbarn[r1.w]!.includes(w2)) continue;
        haut = h2;
        const um = proben.map((p, k) => {
          if (k === j) return p;
          const p1 = probeUmlegen(alt, r1.haut, p);
          return p1 ? probeUmlegen(r1.haut, haut, p1) : null;
        });
        if (um.some((p) => !p)) return ohne('Kehre: eine Probe findet ihr Dreieck nicht');
        // die Kehre selbst: dicht am Punkt an der Kehre, auf der Kante nach vorn
        const dritte = haut.nachbarn[r1.w]!.find((x) => x !== w2 && haut.nachbarn[w2]!.includes(x));
        if (dritte === undefined) return ohne('Kehre: die neue Kante hat kein Dreieck');
        um[j] = { ecken: [r1.w, w2, dritte], b: [0.97, 0.03, 0] };
        proben = um as Probe[];
        const a1 = loopsNachTeilen(alt, r1.haut, new Map(), liste, nr);
        const andere = a1 ? loopsNachTeilen(r1.haut, haut, geteilt2, a1, nr) : null;
        if (!andere) return ohne('Kehre: ein anderer Loop lässt sich nicht nachführen');
        liste = andere;
        kehrenFest.push(r1.w, w2);
      }
    }
    let L = laufVon(haut);
    let halb: Kantenpunkt[] | null = null;
    let ganz: Kantenpunkt[] = [];
    const sp = (w: number) => haut.spiegel[w]!;
    // Am spitzen Ende einer schmalen Form (am Mundwinkel eines Keils) läuft der Ring zweimal durch dieselben Dreiecke: Jede Kante,
    // die er zweimal kreuzt, wird vorher zwischen den beiden Kreuzungen geteilt (14.11.; bis dahin ließ sich so ein Ring nur
    // einsetzen, wenn das Netz zufällig passte: 8° nie, 20° je nach Netz).
    for (let runde = 0; ; runde++) {
      const orte = proben.map((p) => ortVon(L, p));
      if (orte.some((o) => !o)) return ohne(`Runde ${runde}: eine Probe hat kein Dreieck`);
      halb = wegOffen(L, orte as Ort[]);
      if (!halb) return ohne(`Runde ${runde}: der Weg lässt sich nicht ablaufen`);
      const innen = halb.slice(1, -1);
      if (innen.some((k) => sp(k.u) < 0 || sp(k.v) < 0)) return null;
      ganz = [...halb, ...innen.reverse().map((k) => ({ u: sp(k.u), v: sp(k.v), f: k.f }))];
      const doppelt = doppeltGekreuzt(haut, ganz);
      if (!doppelt) return ohne(`Runde ${runde}: zwei Kreuzungen an derselben Stelle einer Kante`);
      if (doppelt.length === 0) break;
      if (runde >= 12) return ohne('nach zwölf Runden kreuzt der Weg noch Kanten doppelt');
      const alt = haut;
      const r = kantenTeilen(alt, doppelt);
      if (!r) return ohne(`Runde ${runde}: eine doppelt gekreuzte Kante läuft quer über die Mitte`);
      haut = r.haut;
      const um = proben.map((p) => probeUmlegen(alt, haut, p));
      if (um.some((p) => !p)) return ohne(`Runde ${runde}: eine Probe findet ihr Dreieck nicht`);
      proben = um as Probe[];
      // die anderen Loops: eingesetzte bekommen die neuen Punkte in ihre Kette, aufliegende ihre Proben in die neuen Dreiecke
      const andere = loopsNachTeilen(alt, haut, r.geteilt, liste, nr);
      if (!andere) return null;
      liste = andere;
      alleNeu.push(...r.geteilt.values());
      L = laufVon(haut);
    }
    const neu = einsetzenWeg(L, ganz);
    if (!neu) return ohne('der Weg lässt sich nicht einsetzen (eine Kante oder ein Dreieck käme zweimal vor)');
    // die Hälfte z ≥ 0: die ersten Punkte des Wegs, ihre Enden genau auf der Mitte
    const kette = neu.slice(0, halb.length);
    if (kette.slice(1, -1).some((w) => haut.pos[3 * w + 2]! < -1e-6)) return null;
    for (const w of [kette[0]!, kette[kette.length - 1]!]) haut.pos[3 * w + 2] = 0;
    liste[nr] = loopNeu(haut, l, kette);
  } else {
    const neu = einsetzen(l.proben);
    if (!neu) return null;
    liste[nr] = loopNeu(haut, l, neu);
    // der Zwilling auf der anderen Seite (seine Dreiecke sind vom Einsetzen unberührt)
    const sp = l.proben.map((p) => spiegelProbe(h, p));
    if (sp.some((p) => !p) || !einsetzen(sp as Probe[])) return null;
  }
  // Splitter neben der neuen Linie entspannen; Punkte aller Linien (samt Spiegelbild) bleiben
  const fest = new Set<number>();
  for (const x of liste) {
    if (!x.proben.every(istPunktProbe)) continue;
    for (const p of x.proben) {
      fest.add(p.ecken[0]);
      const s = haut.spiegel[p.ecken[0]]!;
      if (s >= 0) fest.add(s);
    }
  }
  for (const v of kehrenFest) {
    fest.add(v);
    const sv = haut.spiegel[v]!;
    if (sv >= 0) fest.add(sv);
  }
  entspannen(haut, fest, alleNeu);
  return { haut, loops: liste };
}
