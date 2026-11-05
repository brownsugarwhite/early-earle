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
    let best = -Infinity;
    for (const c of nb) {
      const e = ecken(h, c);
      const w = e.find((x) => x !== a.kante!.u && x !== a.kante!.v)!;
      const d = punktProd(minus(b.p, a.p), minus(lage(h.pos, w), a.p));
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
 * Einen Loop ins Netz einsetzen (samt Spiegelbild: der Ring als ganzer Ring, das Paar mit seinem Zwilling). Danach ist jede
 * seiner Proben ein Punkt des Netzes. Andere eingesetzte Loops bekommen die Punkte auf ihren geteilten Kanten dazu. Ergebnis:
 * die neue Haut und alle Loops (in derselben Reihenfolge), null, wenn der Weg nicht aufgeht (dann bleibt alles, wie es war).
 */
export function loopEinsetzen(h: Haut, loops: readonly Loop[], nr: number): { haut: Haut; loops: Loop[] } | null {
  const l = loops[nr];
  if (!l) return null;
  let haut = h;
  let liste = [...loops];
  const alleNeu: number[] = [];
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
      return kette.length === m ? x : loopNeu(haut, x, kette);
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
    const L = laufVon(haut);
    const orte = l.proben.map((p) => ortVon(L, p));
    if (orte.some((o) => !o)) return null;
    const halb = wegOffen(L, orte as Ort[]);
    if (!halb) return null;
    const sp = (w: number) => haut.spiegel[w]!;
    const innen = halb.slice(1, -1);
    if (innen.some((k) => sp(k.u) < 0 || sp(k.v) < 0)) return null;
    const neu = einsetzenWeg(L, [...halb, ...innen.reverse().map((k) => ({ u: sp(k.u), v: sp(k.v), f: k.f }))]);
    if (!neu) return null;
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
  entspannen(haut, fest, alleNeu);
  return { haut, loops: liste };
}
