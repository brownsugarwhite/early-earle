// Spanten (Versuch 12.10.2026 nachmittags, Florian: „Ja, mach das mit den Spanten mal“): Querschnitte an gewählten
// Stellen des Körpers, wie im Spantenriss des Schiffbaus. Die Front ist der Hauptspant an der dicksten Stelle.
//
// - Ein Spant ist ein halbes Profil (Achse senkrecht, rechte Hälfte), normiert auf den Kasten an seiner Stelle: Höhe aus
//   der Seite, Breite aus dem Top. Er hängt damit an den Silhouetten und wächst mit ihnen.
// - Alle Spanten haben die Punktstruktur der Front. Zwischen zwei Spanten wird Punkt für Punkt überblendet (wie
//   „Angleichen“ in Illustrator); so laufen Ecken als Kanten längs durch den Körper.
// - Ohne Spanten ändert sich nichts: `vorlageBei` liefert dann genau den bisherigen Querschnitt aus der Front.

import { type V2, bogenlaenge, punktAuf } from './bezier';
import type { Dokument, Spant } from './dokument';
import { type Knoten, type Profil, einfuegen, kannLoeschen, loeschen, pfadAbtasten, pfadNachLaenge, segmente, vollerPfad } from './profil';


/** Kasten an der Stelle f (Anteil der Länge der Seite): Höhe aus der Seite, halbe Breite aus dem Top (auf die Länge gestreckt). */
export type Kasten = { x: number; yLo: number; yHi: number; w: number };

const umrisse = new WeakMap<Dokument['profile'], { seite: V2[]; top: V2[]; xMin: number; xMax: number; tMin: number; tMax: number }>();

function schnittWerte(poly: readonly V2[], x: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if ((a.x <= x && b.x >= x) || (a.x >= x && b.x <= x)) {
      const d = b.x - a.x;
      out.push(Math.abs(d) < 1e-12 ? (a.y + b.y) / 2 : a.y + ((x - a.x) / d) * (b.y - a.y));
    }
  }
  return out;
}

function umriss(dok: Dokument) {
  let u = umrisse.get(dok.profile);
  if (!u) {
    // nach Bogenlänge (ein formneutral eingefügter Knoten ändert Ausdehnung und Stellen der Spanten nicht; Plan 20.10., V6)
    const seite = pfadNachLaenge(vollerPfad(dok.profile.seite), 120);
    const top = pfadNachLaenge(vollerPfad(dok.profile.top), 120);
    const xs = seite.map((p) => p.x);
    const ts = top.map((p) => p.x);
    u = { seite, top, xMin: Math.min(...xs), xMax: Math.max(...xs), tMin: Math.min(...ts), tMax: Math.max(...ts) };
    umrisse.set(dok.profile, u);
  }
  return u;
}

/** Kasten an der Stelle f (wie im Loft: Seite für Höhe, Top auf die Länge der Seite gestreckt für die Breite). */
export function spantKasten(dok: Dokument, f0: number): Kasten {
  const u = umriss(dok);
  let f = Math.min(1, Math.max(0, f0));
  let vs: number[] = [];
  let ws: number[] = [];
  for (let versuch = 0; versuch < 3; versuch++) {
    vs = schnittWerte(u.seite, u.xMin + (u.xMax - u.xMin) * f);
    ws = schnittWerte(u.top, u.tMin + (u.tMax - u.tMin) * f);
    if (vs.length) break;
    f = f < 0.5 ? f + 1e-6 : f - 1e-6;
  }
  return {
    x: u.xMin + (u.xMax - u.xMin) * f,
    yLo: vs.length ? Math.min(...vs) : 0,
    yHi: vs.length ? Math.max(...vs) : 0,
    w: ws.length ? Math.max(...ws.map(Math.abs)) : 0,
  };
}

/** Stelle f zu einem x der Seite. */
export function stelleVon(dok: Dokument, x: number): number {
  const u = umriss(dok);
  return (x - u.xMin) / (u.xMax - u.xMin || 1);
}

/** normiert (u = Breite 0…1, v = Höhe 0…1) → Welt der Front (z, y) im Kasten an der Stelle. */
export const spantNachWelt = (k: Kasten, p: V2): V2 => ({ x: p.x * k.w, y: k.yLo + p.y * (k.yHi - k.yLo) });
/** Welt der Front (z, y) → normiert im Kasten. */
export const weltNachSpant = (k: Kasten, p: V2): V2 => ({ x: k.w > 1e-12 ? p.x / k.w : 0, y: k.yHi - k.yLo > 1e-12 ? (p.y - k.yLo) / (k.yHi - k.yLo) : 0 });
/** Richtung (Griff) normiert ↔ Welt. */
export const spantRichtungNachWelt = (k: Kasten, d: V2): V2 => ({ x: d.x * k.w, y: d.y * (k.yHi - k.yLo) });
export const weltRichtungNachSpant = (k: Kasten, d: V2): V2 => ({ x: k.w > 1e-12 ? d.x / k.w : 0, y: k.yHi - k.yLo > 1e-12 ? d.y / (k.yHi - k.yLo) : 0 });

/** Ein Profil mit einer affinen Abbildung je Achse umrechnen (Punkte und Griffe). */
function abbilden(pr: Profil, p: (q: V2) => V2, d: (q: V2) => V2): Profil {
  const knoten = pr.knoten.map((k): Knoten => ({ ...k, p: p(k.p), ein: d(k.ein), aus: d(k.aus) }));
  return { ...pr, knoten };
}

const normSpeicher = new WeakMap<Profil, Profil>();

/** Die Front als Hauptspant, normiert auf ihre Ausdehnung (Breite 0…1 ab der Achse, Höhe 0…1). */
export function hauptspantProfil(dok: Dokument): Profil {
  const front = dok.profile.front;
  let n = normSpeicher.get(front);
  if (!n) {
    const pts = pfadAbtasten(segmente(front), 32);
    const zMax = Math.max(...pts.map((p) => p.x), 1e-9);
    const yMin = Math.min(...pts.map((p) => p.y));
    const H = Math.max(...pts.map((p) => p.y)) - yMin || 1;
    n = abbilden(
      front,
      (q) => ({ x: q.x / zMax, y: (q.y - yMin) / H }),
      (q) => ({ x: q.x / zMax, y: q.y / H }),
    );
    normSpeicher.set(front, n);
  }
  return n;
}

/** Stelle des Hauptspants: eingestellt oder die dickste Stelle (größtes Höhe × Breite). */
export function hauptspantStelle(dok: Dokument): number {
  if (dok.hauptspant !== undefined) return dok.hauptspant;
  let best = 0.5;
  let bestA = -1;
  for (let i = 1; i < 50; i++) {
    const f = i / 50;
    const k = spantKasten(dok, f);
    const a = (k.yHi - k.yLo) * k.w;
    if (a > bestA + 1e-12) {
      bestA = a;
      best = f;
    }
  }
  return best;
}

export type SpantStuetze = { f: number; profil: Profil; index: number };

/** Teil eines Querschnitts: `oben` = `profil` (ganzer Querschnitt bzw. Oberkiefer), `unten` = Unterkiefer eines Kiefer-Spants. */
export type SpantTeil = 'oben' | 'unten';

/** Profil eines Spants für einen Teil: der Unterkiefer nimmt `unten`, sofern vorhanden und von gleicher Struktur. */
export function spantTeilProfil(s: Spant, teil: SpantTeil): Profil {
  return teil === 'unten' && s.unten && s.unten.knoten.length === s.profil.knoten.length ? s.unten : s.profil;
}

/** Gibt es einen Kiefer-Spant (eigener Unterkiefer-Querschnitt)? */
export function hatKieferSpanten(dok: Dokument): boolean {
  return !!dok.spanten?.some((s) => s.unten && s.unten.knoten.length === s.profil.knoten.length);
}

/** Stützen der Überblendung, nach f sortiert: Hauptspant (index −1) und Spanten mit der Punktstruktur der Front. */
export function spantStuetzen(dok: Dokument, teil: SpantTeil = 'oben'): SpantStuetze[] {
  const haupt = hauptspantProfil(dok);
  const n = haupt.knoten.length;
  const out: SpantStuetze[] = [{ f: hauptspantStelle(dok), profil: haupt, index: -1 }];
  (dok.spanten ?? []).forEach((s, index) => {
    if (s.profil.knoten.length === n) out.push({ f: s.f, profil: spantTeilProfil(s, teil), index });
  });
  return out.sort((a, b) => a.f - b.f || a.index - b.index);
}

/** Härte einer Ecke als Kante (glatte Punkte 0). */
export const eckHaerte = (k: Knoten): number => (k.art === 'ecke' ? Math.min(1, Math.max(0, k.haerte ?? 1)) : 0);

const lerp2 = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Zwei Profile gleicher Struktur Punkt für Punkt überblenden; die Härte der Ecken mit. */
export function mischeProfile(a: Profil, b: Profil, t: number): Profil {
  const knoten = a.knoten.map((ka, i): Knoten => {
    const kb = b.knoten[i]!;
    const h = eckHaerte(ka) + (eckHaerte(kb) - eckHaerte(ka)) * t;
    const art = ka.art === 'ecke' || kb.art === 'ecke' ? 'ecke' : 'glatt';
    const k: Knoten = { p: lerp2(ka.p, kb.p, t), ein: lerp2(ka.ein, kb.ein, t), aus: lerp2(ka.aus, kb.aus, t), art };
    if (art === 'ecke') k.haerte = h;
    return k;
  });
  return { ...a, knoten };
}

/** Querschnitt (normiertes Halbprofil) an der Stelle f: linear überblendet zwischen den Nachbar-Stützen. */
export function spantProfilBei(dok: Dokument, f: number, teil: SpantTeil = 'oben'): Profil {
  const st = spantStuetzen(dok, teil);
  if (st.length === 1 || f <= st[0]!.f) return st[0]!.profil;
  const letzte = st[st.length - 1]!;
  if (f >= letzte.f) return letzte.profil;
  let i = 0;
  while (i + 1 < st.length && st[i + 1]!.f < f) i++;
  const a = st[i]!;
  const b = st[i + 1]!;
  const t = b.f - a.f > 1e-9 ? (f - a.f) / (b.f - a.f) : 0;
  // linear: Ein neuer Spant auf der Überblendung ändert die Form nicht (eine weiche Kurve würde sie verschieben). Die
  // kleinen Knicke an den Spanten glättet der Catmull-Clark-Käfig.
  return mischeProfile(a.profil, b.profil, t);
}

export type SpantVorlage = { q: V2[]; knoten: number[] };

/** Stützstellen je Segment nach Bogenlänge (mindestens eine, Summe genau n), wie `querschnitt`. */
function anteileVon(pr: Profil, n: number): number[] {
  const laengen = segmente(pr).map(bogenlaenge);
  const summe = laengen.reduce((a, b) => a + b, 0) || 1;
  const ideal = laengen.map((x) => (n * x) / summe);
  const anteile = ideal.map((x) => Math.max(1, Math.round(x)));
  let diff = anteile.reduce((a, b) => a + b, 0) - n;
  while (diff !== 0) {
    let wahl = -1;
    let best = -Infinity;
    anteile.forEach((a, i) => {
      const gewinn = diff > 0 ? (a > 1 ? a - ideal[i]! : -Infinity) : ideal[i]! - a;
      if (gewinn > best) {
        best = gewinn;
        wahl = i;
      }
    });
    if (wahl < 0) break;
    anteile[wahl]! += diff > 0 ? -1 : 1;
    diff += diff > 0 ? -1 : 1;
  }
  return anteile;
}

/** Abtastung mit festen Stützstellen je Segment (Knoten und Ecken liegen auf Stützstellen). */
export function spantAbtasten(pr: Profil, n: number, anteile?: readonly number[]): SpantVorlage {
  const segs = segmente(pr);
  const pts: V2[] = [];
  const knoten: number[] = [];
  if (segs.length > n) {
    for (let k = 0; k <= n; k++) {
      const g = (k / n) * segs.length;
      const si = Math.min(segs.length - 1, Math.floor(g));
      pts.push(punktAuf(segs[si]!, g - si));
    }
    for (let i = 0; i <= segs.length; i++) knoten.push((i * n) / segs.length);
    return { q: pts, knoten };
  }
  const a = anteile ?? anteileVon(pr, n);
  knoten.push(0);
  segs.forEach((seg, si) => {
    const m = a[si] ?? 1;
    for (let k = si === 0 ? 0 : 1; k <= m; k++) pts.push(punktAuf(seg, k / m));
    knoten.push(pts.length - 1);
  });
  return { q: pts, knoten };
}

const vorlageSpeicher = new WeakMap<Dokument['profile'], Map<string, SpantVorlage & { haerte: number[] }>>();

/**
 * Querschnitt-SpantVorlage an der Stelle f: n + 1 Punkte von oben (Achse) nach unten (Achse), normiert (Breite 0…1, Höhe
 * 0…1), Stützstelle je Knoten, Härte der Ecken je Knoten. Ohne Spanten genau wie bisher (`querschnitt`).
 */
export function vorlageBei(dok: Dokument, f: number, n: number, teil: SpantTeil = 'oben'): SpantVorlage & { haerte: number[] } {
  let speicher = vorlageSpeicher.get(dok.profile);
  if (!speicher || speicherSpanten.get(dok.profile) !== dok.spanten || speicherHaupt.get(dok.profile) !== dok.hauptspant) {
    speicher = new Map();
    vorlageSpeicher.set(dok.profile, speicher);
    speicherSpanten.set(dok.profile, dok.spanten);
    speicherHaupt.set(dok.profile, dok.hauptspant);
  }
  const schluessel = `${teil}:${f}:${n}`;
  const alt = speicher.get(schluessel);
  if (alt) return alt;
  let v: SpantVorlage & { haerte: number[] };
  if (!dok.spanten?.length) {
    // bisheriger Weg: Front abtasten und auf die Ausdehnung der Stützstellen normieren
    const roh = spantAbtasten(dok.profile.front, n);
    let uMax = 0;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (const p of roh.q) {
      uMax = Math.max(uMax, p.x);
      vMin = Math.min(vMin, p.y);
      vMax = Math.max(vMax, p.y);
    }
    const H = vMax - vMin || 1;
    v = { q: roh.q.map((p) => ({ x: uMax > 1e-9 ? p.x / uMax : 0, y: (p.y - vMin) / H })), knoten: roh.knoten, haerte: dok.profile.front.knoten.map(eckHaerte) };
  } else {
    // Stützstellen je Segment wie die Front selbst (gleiche Knoten-Stützstellen wie ohne Spanten und wie im Käfig)
    const anteile = anteileVon(dok.profile.front, n);
    const pr = spantProfilBei(dok, f, teil);
    const s = spantAbtasten(pr, n, anteile);
    v = { ...s, haerte: pr.knoten.map(eckHaerte) };
  }
  speicher.set(schluessel, v);
  return v;
}
const speicherSpanten = new WeakMap<Dokument['profile'], Dokument['spanten']>();
const speicherHaupt = new WeakMap<Dokument['profile'], number | undefined>();

/** Neuer Spant an der Stelle f: die Überblendung an dieser Stelle (die Form ändert sich beim Einfügen nicht). */
export function spantNeu(dok: Dokument, f: number): Spant {
  const kopie = (pr: Profil): Profil => ({ ...pr, knoten: pr.knoten.map((k) => ({ ...k })) });
  const pr = spantProfilBei(dok, f);
  // mit Kiefer-Spanten auch die Überblendung des Unterkiefers (sonst änderte der neue Spant die Form)
  return hatKieferSpanten(dok) ? { f, profil: kopie(pr), unten: kopie(spantProfilBei(dok, f, 'unten')) } : { f, profil: kopie(pr) };
}

/** Teilprofile eines Spants mit derselben Änderung der Punktstruktur (Einfügen, Löschen) umrechnen. */
function beideTeile(sp: Spant, f: (pr: Profil) => Profil): Spant {
  return sp.unten ? { ...sp, profil: f(sp.profil), unten: f(sp.unten) } : { ...sp, profil: f(sp.profil) };
}

/** Spanten nach f sortiert einfügen; Rückgabe: neue Liste und Index des neuen Spants. */
export function spantEinfuegen(dok: Dokument, f: number): { spanten: Spant[]; index: number } {
  const neu = spantNeu(dok, f);
  const spanten = [...(dok.spanten ?? []), neu].sort((a, b) => a.f - b.f);
  return { spanten, index: spanten.indexOf(neu) };
}

/** Punkt in allen Querschnitten einfügen (Front und Spanten, formtreu an derselben Stelle s, t). */
export function spantenPunktEinfuegen(dok: Dokument, s: number, t: number): { dok: Dokument; index: number } {
  const r = einfuegen(dok.profile.front, s, t);
  const spanten = dok.spanten?.map((sp) => beideTeile(sp, (pr) => einfuegen(pr, s, t).profil));
  const d: Dokument = { ...dok, profile: { ...dok.profile, front: r.profil } };
  if (spanten) d.spanten = spanten;
  return { dok: d, index: r.index };
}

/**
 * Teilungen der Front (S1c: Punkte, die die Kopplung eingefügt hat) in allen Spanten nachvollziehen: gleiche Segmente, gleiche
 * Lage, in derselben Reihenfolge — die Spanten behalten die Punktstruktur der Front, formneutral.
 */
export function spantenTeilen(spanten: readonly Spant[], teilungen: readonly (readonly [number, number])[]): Spant[] {
  if (!teilungen.length) return spanten as Spant[];
  return spanten.map((sp) => beideTeile(sp, (pr) => teilungen.reduce((p, [s, t]) => einfuegen(p, s, t).profil, pr)));
}

/** Punkt in allen Querschnitten löschen (Achspunkte bleiben). null, wenn er nicht gelöscht werden kann. */
export function spantenPunktLoeschen(dok: Dokument, i: number): Dokument | null {
  if (!kannLoeschen(dok.profile.front, i)) return null;
  const spanten = dok.spanten?.map((sp) => beideTeile(sp, (pr) => loeschen(pr, i)));
  const d: Dokument = { ...dok, profile: { ...dok.profile, front: loeschen(dok.profile.front, i) } };
  if (spanten) d.spanten = spanten;
  return d;
}

const gleich = (a: V2, b: V2) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;

/**
 * Punktstruktur der Spanten an eine geänderte Front angleichen (Punkt in der Front eingefügt oder gelöscht, z. B. mit
 * dem Zeichenstift): dieselbe Stelle in jedem Spant. Andere Änderungen lassen die Spanten unverändert.
 */
export function spantenAngleichen(alt: Profil, neu: Profil, spanten: readonly Spant[]): Spant[] {
  const a = alt.knoten;
  const b = neu.knoten;
  if (a.length === b.length || !spanten.length) return spanten as Spant[];
  if (b.length === a.length + 1) {
    // eingefügt: erster Knoten, der nicht mehr an seiner Stelle steht
    let i = 0;
    while (i < a.length && gleich(a[i]!.p, b[i]!.p)) i++;
    const s = Math.max(0, i - 1);
    const seg = segmente(alt)[s];
    if (!seg) return spanten as Spant[];
    let bestT = 0.5;
    let bestD = Infinity;
    for (let k = 1; k < 200; k++) {
      const t = k / 200;
      const p = punktAuf(seg, t);
      const d = Math.hypot(p.x - b[i]!.p.x, p.y - b[i]!.p.y);
      if (d < bestD) {
        bestD = d;
        bestT = t;
      }
    }
    return spanten.map((sp) => beideTeile(sp, (pr) => einfuegen(pr, s, bestT).profil));
  }
  // gelöscht: Knoten der alten Front, die in der neuen fehlen (Reihenfolge bleibt)
  const weg: number[] = [];
  let j = 0;
  for (let i = 0; i < a.length; i++) {
    if (j < b.length && gleich(a[i]!.p, b[j]!.p)) j++;
    else weg.push(i);
  }
  if (a.length - weg.length !== b.length) return spanten as Spant[];
  return spanten.map((sp) =>
    beideTeile(sp, (pr0) => {
      let pr = pr0;
      for (const i of [...weg].sort((x, y) => y - x)) pr = loeschen(pr, i);
      return pr;
    }),
  );
}
