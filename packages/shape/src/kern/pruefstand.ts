// Prüfstand „ruhiges Netz“ (Planseite 2026-10-14-ruhiges-netz-und-maulschlitz, Block 1): Fälle aus Florians Bildern und
// Maße, die zeigen, ob das Netz ruhig auf der schwarzen Linie liegt — Δ je Blatt, Falten, Sägezahn, Lokalität beim Ziehen.
// DOM-frei, für Tests und Skripte.
import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { neuesDokument } from '../dokument';
import { type Kaefig, alleFlaechen } from '../kaefig/halbkanten';
import type { Profil } from '../profil';
import type { V3 } from '../versuch/catmullClark';
import { type AbleitOptionen, type Ableitung, ableiten, sprossenVon } from './ableiten';
import { blattAbweichungen } from './abweichung';

/** Pixel je Kachel (Blatt-Maßstab der Messungen) */
export const PX = 461;

function knotenSetzen(pr: Profil, i: number, p: V2): Profil {
  return { ...pr, knoten: pr.knoten.map((k, j) => (j === i ? { ...k, p } : k)) };
}

/**
 * Florians Komma (Bild vom 14.10.): Startkugel, der hintere Seitenknoten hoch und nach hinten gezogen (Griffe senkrecht
 * wie bei der Kugel), Front oben bis zur Höhe der Spitze und breiter, Top hinten bis zur Spitze und breiter. Im Editor
 * zeigte das Front Δ 33,4 px und Top Δ 26,5 px mit Sägezahn an den Flanken und einem Faltengrat auf dem Rücken.
 */
export function kommaDokument(): Dokument {
  const d = neuesDokument('komma');
  return {
    ...d,
    profile: {
      seite: knotenSetzen(d.profile.seite, 1, { x: 0.479, y: 0.769 }),
      front: knotenSetzen(knotenSetzen(d.profile.front, 0, { x: 0, y: 0.796 }), 1, { x: 0.319, y: 0.276 }),
      top: knotenSetzen(knotenSetzen(d.profile.top, 1, { x: 0, y: 0.32 }), 2, { x: 0.479, y: 0 }),
    },
  };
}

/** Feine Punkte und Flächen der letzten Stufe. */
export function feinesNetz(abl: Ableitung): { punkte: V3[]; flaechen: number[][]; kaefig: Kaefig } {
  const kaefig = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: V3[] = [];
  for (let i = 0; i < abl.fein.length / 3; i++) punkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
  return { punkte, flaechen: alleFlaechen(kaefig), kaefig };
}

/**
 * Faltenmaß: Winkel zwischen den Normalen benachbarter feiner Flächen (Grad). Kanten mit Schärfe in der letzten Stufe
 * (gezeichnete Kanten, Ecken) zählen nicht. Ein glatter Körper bleibt auf Stufe 2–3 deutlich unter 20°.
 */
export function faltenMass(abl: Ableitung): { max: number; p99: number; ueber20: number; ort: V3 } {
  const { punkte, kaefig } = feinesNetz(abl);
  const normalen = new Float64Array(3 * kaefig.nF);
  for (let f = 0; f < kaefig.nF; f++) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const a = kaefig.fStart[f]!;
    const b = kaefig.fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const p = punkte[kaefig.fVerts[h]!]!;
      const q = punkte[kaefig.fVerts[h + 1 < b ? h + 1 : a]!]!;
      nx += (p[1] - q[1]) * (p[2] + q[2]);
      ny += (p[2] - q[2]) * (p[0] + q[0]);
      nz += (p[0] - q[0]) * (p[1] + q[1]);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    normalen[3 * f] = nx / l;
    normalen[3 * f + 1] = ny / l;
    normalen[3 * f + 2] = nz / l;
  }
  const winkel: number[] = [];
  let max = 0;
  let ort: V3 = [0, 0, 0];
  for (let e = 0; e < kaefig.nE; e++) {
    if (kaefig.eFlaechen[e] !== 2 || kaefig.eSchaerfe[e]! > 0) continue;
    const h = kaefig.eHalb[e]!;
    const t = kaefig.hTwin[h]!;
    if (t < 0) continue;
    const f1 = kaefig.hFace[h]!;
    const f2 = kaefig.hFace[t]!;
    const c = normalen[3 * f1]! * normalen[3 * f2]! + normalen[3 * f1 + 1]! * normalen[3 * f2 + 1]! + normalen[3 * f1 + 2]! * normalen[3 * f2 + 2]!;
    const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    winkel.push(w);
    if (w > max) {
      max = w;
      ort = punkte[kaefig.eA[e]!]!;
    }
  }
  winkel.sort((x, y) => x - y);
  return { max, p99: winkel[Math.floor(0.99 * (winkel.length - 1))] ?? 0, ueber20: winkel.filter((w) => w > 20).length, ort };
}

/** Ring-Tabelle für die Diagnose: Sprossenmitte, Neigung |dy|/|dx|, halbe Breite und Höhe der Grenzlagen je Ring. */
export type RingZeile = { i: number; mitte: V2; neigung: number; breite: number; hoehe: number };

export function ringTabelle(abl: Ableitung): RingZeile[] {
  const v = abl.vorlage;
  const sprossen = sprossenVon(abl.altLeiter, abl.stationen);
  const out: RingZeile[] = [];
  for (let i = 0; i < v.R; i++) {
    let breite = 0;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let j = 0; j < v.N; j++) {
      const p = v.ringPunkt(i, j);
      breite = Math.max(breite, Math.abs(abl.fein[3 * p + 2]!));
      yMin = Math.min(yMin, abl.fein[3 * p + 1]!);
      yMax = Math.max(yMax, abl.fein[3 * p + 1]!);
    }
    const s = sprossen[i]!;
    out.push({ i, mitte: { x: (s.o.x + s.u.x) / 2, y: (s.o.y + s.u.y) / 2 }, neigung: Math.abs(s.o.y - s.u.y) / Math.max(1e-9, Math.abs(s.o.x - s.u.x)), breite, hoehe: yMax - yMin });
  }
  return out;
}

/**
 * Sägezahnmaß: Zahl der Richtungswechsel der Ringbreiten entlang der Wirbelsäule (Schwelle 0,5 px). Ein ruhiger Körper hat
 * einen bis drei (dick in der Mitte, Kopf/Schwanz); jeder Zahn bringt zwei dazu.
 */
export function saegezahn(abl: Ableitung): { wechsel: number; breiten: number[] } {
  const breiten = ringTabelle(abl).map((z) => z.breite);
  const schwelle = 0.5 / PX;
  let wechsel = 0;
  let richtung = 0;
  for (let i = 1; i < breiten.length; i++) {
    const d = breiten[i]! - breiten[i - 1]!;
    if (Math.abs(d) < schwelle) continue;
    const r = Math.sign(d);
    if (richtung !== 0 && r !== richtung) wechsel++;
    richtung = r;
  }
  return { wechsel, breiten };
}

export type PruefErgebnis = { delta: { seite: number; front: number; top: number }; falte: ReturnType<typeof faltenMass>; saege: number; zeit: number };

/** Alle Maße eines Körpers (Δ je Blatt in px bei 461 je Kachel, Falten in Grad, Sägezahn als Wechselzahl, Ableitungszeit). */
export function pruefen(dok: Dokument, opt: Partial<AbleitOptionen> = {}): PruefErgebnis & { abl: Ableitung } {
  const abl = ableiten(dok, opt);
  const { punkte, flaechen } = feinesNetz(abl);
  const ab = blattAbweichungen(punkte, flaechen, dok);
  return { delta: { seite: ab.seite.max, front: ab.front.max, top: ab.top.max }, falte: faltenMass(abl), saege: saegezahn(abl).wechsel, zeit: abl.zeiten.gesamt, abl };
}

/**
 * Lokalität (Florian: „ein Knoten gezogen ändert nur die Stelle“): Stationen aus dem ersten Bau einfrieren (wie im
 * Editor), einen Knoten eines Blatts um `versatz` (Kacheleinheiten) verschieben, neu ableiten. Liefert die größte
 * Verschiebung feiner Punkte weiter als `ferne` vom Knoten (px) und die größte überhaupt.
 */
export function lokalitaet(dok: Dokument, ansicht: 'seite' | 'front' | 'top', knoten: number, versatz: V2, opt: Partial<AbleitOptionen> = {}, ferne = 0.25): { fern: number; gesamt: number } {
  const a0 = ableiten(dok, opt);
  const gefroren = { ...opt, stationen: a0.gefroren };
  const b0 = ableiten(dok, gefroren);
  const pr = dok.profile[ansicht];
  const k = pr.knoten[knoten]!;
  const dok2: Dokument = { ...dok, profile: { ...dok.profile, [ansicht]: knotenSetzen(pr, knoten, { x: k.p.x + versatz.x, y: k.p.y + versatz.y }) } };
  const b1 = ableiten(dok2, gefroren);
  const sk = dok.skalierung;
  // Lage des Knotens im Raum: Seite (x, y), Front (z, y), Top (x, z)
  const kx = ansicht === 'front' ? NaN : k.p.x * sk;
  const ky = ansicht === 'top' ? NaN : k.p.y * sk;
  const kz = ansicht === 'front' ? k.p.x * sk : ansicht === 'top' ? k.p.y * sk : NaN;
  let fern = 0;
  let gesamt = 0;
  const n = Math.min(b0.fein.length, b1.fein.length) / 3;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(b1.fein[3 * i]! - b0.fein[3 * i]!, b1.fein[3 * i + 1]! - b0.fein[3 * i + 1]!, b1.fein[3 * i + 2]! - b0.fein[3 * i + 2]!);
    gesamt = Math.max(gesamt, d);
    const x = b0.fein[3 * i]!;
    const y = b0.fein[3 * i + 1]!;
    const z = Math.abs(b0.fein[3 * i + 2]!);
    const abstand = Math.hypot(Number.isNaN(kx) ? 0 : x - kx, Number.isNaN(ky) ? 0 : y - ky, Number.isNaN(kz) ? 0 : z - kz);
    if (abstand > ferne) fern = Math.max(fern, d);
  }
  return { fern: fern * PX, gesamt: gesamt * PX };
}
