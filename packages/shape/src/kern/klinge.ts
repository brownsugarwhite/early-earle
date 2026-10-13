// Wesen-Editor 2, Beweis 5 „Feuer, Gas, Fell-Blob“ (14.10.2026): die Klinge (Plan 7) als Käfig.
//
// Eine Klinge ist ein kleiner geschlossener Käfig: eine Röhre aus R Ringen × 8 Punkten mit Kappen, deren Ringe ein
// Flammen-, Zacken- oder Tropfenprofil tragen (Breite nach Höhe), mit Linsenquerschnitt (flach) und scharfer Spitze
// (Punktschärfe). Alle Klingen eines Wesens teilen die Topologie, also auch Unterteilungsmatrix und Löser; nur die
// Ziele je Klinge unterscheiden sich. Angesetzt wird eine Klinge an einem Fußpunkt der Haut mit Achse (Normale,
// gekämmt nach oben) und Querrichtung; ihr unterster Ring steckt im Körper. Das Wehen ist eine Pose: Jeder Ring dreht
// um den Fuß in der Wehrichtung, mit dem Quadrat seines Höhenanteils und einer Phase je Klinge; die Matrix liefert das
// feine Netz (Plan 7: „Bewegung im Vertex-Shader (Gewicht t², Zufallsphase)“, hier auf dem Käfig).

import { type Kaefig, type V3 } from '../kaefig/halbkanten';
import { type Roehre, roehre } from '../kaefig/roehre';
import { type GrenzLoeser, grenzLoeser, kaefigDurchZiele } from '../loeser/grenzflaeche';
import { type Unterteilung, unterteilung } from '../subdivision/catmullClark';
import { anwenden3 } from '../subdivision/matrix';

export type KlingenProfil = 'flamme' | 'zacke' | 'tropfen' | 'schwade';

export type KlingenForm = {
  /** Ringe der Röhre (ohne Kappen) */
  ringe: number;
  profil: KlingenProfil;
  /** Dicke quer zur Fläche als Anteil der Breite (Linse) */
  dicke: number;
  /** Anteil der Länge, der im Körper steckt */
  einsenken: number;
  /** Biegung: seitlicher Versatz der Spitze als Anteil der Länge (S-Schwung) */
  biegung: number;
  /** Unterteilungsstufen des feinen Netzes */
  stufen: number;
};

export const KLINGE_FLAMME: KlingenForm = { ringe: 6, profil: 'flamme', dicke: 0.35, einsenken: 0.18, biegung: 0.25, stufen: 2 };
export const KLINGE_BUESCHEL: KlingenForm = { ringe: 4, profil: 'flamme', dicke: 0.45, einsenken: 0.3, biegung: 0.15, stufen: 1 };
export const KLINGE_SCHWADE: KlingenForm = { ringe: 6, profil: 'schwade', dicke: 0.5, einsenken: 0.2, biegung: 0.5, stufen: 2 };

/** Lage einer Klinge: Fußpunkt auf der Haut, Achse (Länge 1), Querrichtung (Breite, Länge 1), Länge und Breite (Welt), Phase. */
export type KlingenLage = { fuss: V3; achse: V3; quer: V3; laenge: number; breite: number; phase: number };

/** Breite (0 … 1) bei Höhenanteil t je Profil; die Spitze ist immer 0. */
export function profilBreite(profil: KlingenProfil, t: number): number {
  const s = Math.min(1, Math.max(0, t));
  switch (profil) {
    case 'flamme':
      return Math.pow(Math.max(0, Math.sin(Math.PI * (0.15 + 0.85 * s))), 0.7);
    case 'zacke':
      return 1 - s;
    case 'tropfen':
      return Math.pow(Math.max(0, Math.sin(Math.PI * (0.05 + 0.95 * s))), 1.3);
    default:
      return Math.pow(Math.max(0, Math.sin(Math.PI * (0.25 + 0.75 * s))), 0.45);
  }
}

export type KlingenVorlage = { form: KlingenForm; vorlage: Roehre; unterteilung: Unterteilung; loeser: GrenzLoeser };

/** Topologie, Matrix und Löser einer Klingenform (einmal je Wesen); die Spitze ist ein scharfer Eckpunkt. */
export function klingenVorlage(form: KlingenForm): KlingenVorlage {
  const vorlage = roehre(Math.max(3, form.ringe), 8);
  vorlage.kaefig.vSchaerfe[vorlage.naht.spitzeHinten] = 1e6;
  const u = unterteilung(vorlage.kaefig, form.stufen);
  return { form, vorlage, unterteilung: u, loeser: grenzLoeser(u.grenze, vorlage.kaefig.n) };
}

const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const kreuz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Ziele einer Klinge (Käfig der Vorlage) für Wehwinkel `wehen` (rad, um die Querrichtung am Fuß, mit t² je Ring).
 * Ring r liegt bei Höhenanteil t = r/(R−1) entlang der (gebogenen, wehenden) Achse, Breite nach Profil, Dicke als Linse;
 * Ring 0 steckt um `einsenken` im Körper, die Spitze (hintere Kappe) ist der Endpunkt, die vordere Kappe sitzt im Körper.
 */
export function klingenZiele(kv: KlingenVorlage, lage: KlingenLage, wehen = 0): Float64Array {
  const { vorlage: v, form } = kv;
  const { R, N, c } = v;
  const ziele = new Float64Array(3 * v.kaefig.n);
  const achse = norm(lage.achse);
  let quer = norm(lage.quer);
  // Querrichtung senkrecht zur Achse halten
  const dq = quer[0] * achse[0] + quer[1] * achse[1] + quer[2] * achse[2];
  quer = norm([quer[0] - dq * achse[0], quer[1] - dq * achse[1], quer[2] - dq * achse[2]]);
  const dick = kreuz(achse, quer);
  const L = lage.laenge;
  const setze = (idx: number, p: V3) => {
    ziele[3 * idx] = p[0];
    ziele[3 * idx + 1] = p[1];
    ziele[3 * idx + 2] = p[2];
  };
  // Mittellinie: Fuß − einsenken·L … Spitze, mit S-Biegung in Dickenrichtung und Wehen (Drehung um die Querachse, t²)
  const mitte = (t: number): V3 => {
    const h = (-form.einsenken + (1 + form.einsenken) * t) * L;
    const bieg = form.biegung * L * Math.sin(Math.PI * t) * t;
    const w = wehen * t * t;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    // Achse um die Querrichtung drehen: Komponenten (achse, dick) → (achse·cw + dick·sw, −achse·sw + dick·cw)
    const ax: V3 = [achse[0] * cw + dick[0] * sw, achse[1] * cw + dick[1] * sw, achse[2] * cw + dick[2] * sw];
    const dk: V3 = [dick[0] * cw - achse[0] * sw, dick[1] * cw - achse[1] * sw, dick[2] * cw - achse[2] * sw];
    return [lage.fuss[0] + ax[0] * h + dk[0] * bieg, lage.fuss[1] + ax[1] * h + dk[1] * bieg, lage.fuss[2] + ax[2] * h + dk[2] * bieg];
  };
  for (let r = 0; r < R; r++) {
    const t = r / (R - 1);
    const m = mitte(t);
    const b = (profilBreite(form.profil, t) * lage.breite) / 2;
    const d = b * form.dicke;
    for (let j = 0; j < N; j++) {
      const th = (2 * Math.PI * j) / N;
      const q = Math.cos(th) * b;
      const dd = Math.sin(th) * d;
      setze(v.ringPunkt(r, j), [m[0] + quer[0] * q + dick[0] * dd, m[1] + quer[1] * q + dick[1] * dd, m[2] + quer[2] * q + dick[2] * dd]);
    }
  }
  // Kappen: vorn (im Körper) leicht eingezogen, hinten die Spitze
  const mv = mitte(-0.1);
  const mh = mitte(1.02);
  for (let a = 1; a < c; a++) for (let b = 1; b < c; b++) {
    setze(v.kappe('vorn', a, b), mv);
    setze(v.kappe('hinten', a, b), mh);
  }
  return ziele;
}

export type Klinge = { lage: KlingenLage; xyz: Float64Array; fein: Float64Array };

/** Klingen lösen (Käfig durch die Ziele) und fein rechnen; `wehen` in rad je Klinge (Phase wird außen gemischt). */
export function klingenBauen(kv: KlingenVorlage, lagen: readonly KlingenLage[], wehen: (lage: KlingenLage, i: number) => number = () => 0): Klinge[] {
  return lagen.map((lage, i) => {
    const xyz = kaefigDurchZiele(kv.loeser, klingenZiele(kv, lage, wehen(lage, i)));
    return { lage, xyz, fein: anwenden3(kv.unterteilung.grenze, xyz) };
  });
}

/** Feines Netz der Klingen-Topologie (Stufe L der Vorlage) für die Dreiecke. */
export function klingenNetz(kv: KlingenVorlage): Kaefig {
  return kv.unterteilung.stufen[kv.unterteilung.stufen.length - 1]!.kaefig;
}

// ---------- Verteilungen ----------

/** Fußpunkte und Normalen der Kugel-Oberfläche aus dem feinen Netz: nächster Punkt zu einer Richtung vom Mittelpunkt. */
export type Haut = { punkte: Float64Array; normalen: Float64Array; mitte: V3 };

/** Haut aus feinen Lagen: Mittelpunkt = Schwerpunkt, Normale ≈ Richtung vom Mittelpunkt (für Blobs ausreichend). */
export function hautAus(fein: Float64Array): Haut {
  const n = fein.length / 3;
  const mitte: V3 = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! + fein[3 * i + d]! / n;
  const normalen = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const nv = norm([fein[3 * i]! - mitte[0], fein[3 * i + 1]! - mitte[1], fein[3 * i + 2]! - mitte[2]]);
    normalen.set(nv, 3 * i);
  }
  return { punkte: fein, normalen, mitte };
}

/** Hautpunkt in Richtung `richtung` vom Mittelpunkt (größtes Skalarprodukt). */
export function hautPunkt(haut: Haut, richtung: V3): { p: V3; n: V3 } {
  const r = norm(richtung);
  let best = -Infinity;
  let bi = 0;
  const n = haut.punkte.length / 3;
  for (let i = 0; i < n; i++) {
    const d = haut.normalen[3 * i]! * r[0] + haut.normalen[3 * i + 1]! * r[1] + haut.normalen[3 * i + 2]! * r[2];
    if (d > best) {
      best = d;
      bi = i;
    }
  }
  return { p: [haut.punkte[3 * bi]!, haut.punkte[3 * bi + 1]!, haut.punkte[3 * bi + 2]!], n: [haut.normalen[3 * bi]!, haut.normalen[3 * bi + 1]!, haut.normalen[3 * bi + 2]!] };
}

/** Einfacher Zufall mit Saat (mulberry32). */
export function zufall(saat: number): () => number {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Achse einer Klinge: Normale, nach oben gekämmt (`kamm` 0 = Normale, 1 = senkrecht nach oben). */
export function gekaemmt(normale: V3, kamm: number): V3 {
  return norm([normale[0] * (1 - kamm), normale[1] * (1 - kamm) + kamm, normale[2] * (1 - kamm)]);
}

/**
 * Flammenzungen am Scheitel: eine große Hauptzunge oben, `anzahl` kleinere im Kranz bei Polwinkel `polGrad`;
 * Längen als Anteil der Körperhöhe H.
 */
export function zungenAmScheitel(haut: Haut, H: number, anzahl: number, polGrad: number, saat: number): KlingenLage[] {
  const zf = zufall(saat);
  const lagen: KlingenLage[] = [];
  const oben = hautPunkt(haut, [0, 1, 0]);
  lagen.push({ fuss: oben.p, achse: gekaemmt(oben.n, 0.6), quer: [1, 0, 0], laenge: 0.62 * H, breite: 0.42 * H, phase: zf() * Math.PI * 2 });
  const pol = (polGrad * Math.PI) / 180;
  for (let i = 0; i < anzahl; i++) {
    const az = (2 * Math.PI * i) / anzahl + 0.3;
    const r: V3 = [Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az)];
    const hp = hautPunkt(haut, r);
    const quer = norm(kreuz([0, 1, 0], hp.n));
    lagen.push({ fuss: hp.p, achse: gekaemmt(hp.n, 0.55), quer, laenge: (0.28 + 0.2 * zf()) * H, breite: (0.2 + 0.1 * zf()) * H, phase: zf() * Math.PI * 2 });
  }
  return lagen;
}

/** Büschel über die ganze Haut (Fibonacci-Verteilung), nach oben gekämmt, Größe als Anteil von H. */
export function bueschelAufHaut(haut: Haut, H: number, anzahl: number, groesse: number, kamm: number, saat: number): KlingenLage[] {
  const zf = zufall(saat);
  const lagen: KlingenLage[] = [];
  const gold = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < anzahl; i++) {
    const y = 1 - (2 * (i + 0.5)) / anzahl;
    const rad = Math.sqrt(1 - y * y);
    const phi = gold * i;
    const r: V3 = [Math.cos(phi) * rad, y, Math.sin(phi) * rad];
    const hp = hautPunkt(haut, r);
    const a = gekaemmt(hp.n, kamm * (0.5 + 0.5 * Math.abs(hp.n[1])));
    const quer = norm(kreuz(a, [Math.sin(phi * 3.1), 0.2, Math.cos(phi * 3.1)]));
    const g = groesse * (0.75 + 0.5 * zf());
    lagen.push({ fuss: hp.p, achse: a, quer, laenge: g * H, breite: 0.55 * g * H, phase: zf() * Math.PI * 2 });
  }
  return lagen;
}

/** Abgelöste Flämmchen/Bläschen: kleine Klingen über dem Scheitel, die aufsteigen und schrumpfen (Anteil `t` des Umlaufs). */
export function flaemmchen(haut: Haut, H: number, anzahl: number, saat: number, umlauf: number): KlingenLage[] {
  const zf = zufall(saat);
  const lagen: KlingenLage[] = [];
  for (let i = 0; i < anzahl; i++) {
    const az = zf() * Math.PI * 2;
    const pol = (20 + 35 * zf()) * (Math.PI / 180);
    const r: V3 = [Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az)];
    const hp = hautPunkt(haut, r);
    const t = (umlauf + zf()) % 1;
    const hoch = (0.12 + 0.5 * t) * H;
    const gr = (1 - t) * (0.1 + 0.08 * zf()) * H;
    lagen.push({ fuss: [hp.p[0] + hp.n[0] * hoch, hp.p[1] + hp.n[1] * hoch, hp.p[2] + hp.n[2] * hoch], achse: [0, 1, 0], quer: [1, 0, 0], laenge: Math.max(1e-4, gr), breite: 0.7 * gr, phase: zf() * 6 });
  }
  return lagen;
}
