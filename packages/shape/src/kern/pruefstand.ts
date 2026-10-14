// Prüfstand „ruhiges Netz“ (Planseite 2026-10-14-ruhiges-netz-und-maulschlitz, Block 1): Fälle aus Florians Bildern und
// Maße, die zeigen, ob das Netz ruhig auf der schwarzen Linie liegt — Δ je Blatt, Falten, Sägezahn, Lokalität beim Ziehen.
// DOM-frei, für Tests und Skripte.
import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { neuesDokument } from '../dokument';
import { maulAnMarken, maulAnfangBewegen, maulMitMarken } from '../maulKnoten';
import { lippeAnHaut } from '../lippeHaut';
import { type Kaefig, alleFlaechen } from '../kaefig/halbkanten';
import type { Profil } from '../profil';
import { pfadAbtasten, vollerPfad } from '../profil';
import type { V3 } from '../versuch/catmullClark';
import { type AbleitOptionen, type Ableitung, ableiten, sprossenVon } from './ableiten';
import { blattAbweichungen } from './abweichung';
import { type MaulAbweichung, type MaulErgebnis, type MaulOptionen, ableitenMitMaul, kieferFlaechen, maulAbweichung, maulOptionenVorlage, maulPose } from './maul';
import { maulLinieAusDokument } from './maulDokument';
import { selbstDurchdringungen } from '../versuch/pruefen';
import { linieDurch as linie3Durch } from '../versuch/linie3d';

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
export function faltenMass(abl: Ableitung, nurFlaeche?: (f: number) => boolean): { max: number; p99: number; ueber20: number; ort: V3 } {
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
    if (nurFlaeche && (!nurFlaeche(f1) || !nurFlaeche(f2))) continue;
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

// ---------- Block 2: Maul-Fälle (Florians Kugel aus seinen Bildern vom 14.10.) ----------

type Linie3Knoten = { p: [number, number, number]; ein: [number, number, number]; aus: [number, number, number]; art: 'glatt' };

/** Glatte 3D-Linie durch Punkte (Seite x, y; Tiefe z aus der Kugel), Griffe ⅙ der Nachbarabstände (wie im Maul-Tab). */
function linieDurch(pts: readonly [number, number][], z: (x: number, y: number) => number): { knoten: Linie3Knoten[] } {
  return {
    knoten: pts.map((p, i) => {
      const vor = pts[Math.max(0, i - 1)]!;
      const nach = pts[Math.min(pts.length - 1, i + 1)]!;
      const t: [number, number] = [(nach[0] - vor[0]) / 6, (nach[1] - vor[1]) / 6];
      return { p: [p[0], p[1], i === 0 ? 0 : z(p[0], p[1])], ein: i === 0 ? [0, 0, 0] : [-t[0], -t[1], 0], aus: i === pts.length - 1 ? [0, 0, 0] : [t[0], t[1], 0], art: 'glatt' };
    }),
  };
}

export type KugelMaulArt = 'gleich' | 'ueberbiss' | 'schnabel' | 'unterbiss' | 'florian';

/**
 * Startkugel mit gezeichnetem Maul wie in Florians Bildern (14.10.): rote Linie ab der Kontur in halber Höhe zum
 * Mundwinkel (0,3 r hinter und unter der Mitte); Überbiss = blaue Linie 0,12 r dahinter und 0,08 r darüber (sein Bild 1:
 * Kinnwand am blauen Anfang); Schnabel = dazu der rote Anfang 0,15 vor dem Körper (sein Bild 2); Unterbiss = blau auf
 * der Kontur, rot 0,3 r dahinter und 0,16 r darunter.
 */
export function kugelMaulDokument(art: KugelMaulArt, mitMarken = false): Dokument {
  if (art === 'florian') return florianUnterbiss(mitMarken);
  const d = neuesDokument(`kugel-${art}`);
  const r = 0.265;
  const xM = 0;
  const yM = r;
  const zAuf = (x: number, y: number) => Math.sqrt(Math.max(0, r * r - (x - xM) ** 2 - (y - yM) ** 2));
  const yR = yM - 0.02 * r;
  const xR = xM - Math.sqrt(Math.max(0, r * r - (yR - yM) ** 2)) + 0.002;
  const ecke: [number, number] = [xM + 0.3 * r, yM - 0.3 * r];
  const vorn: [number, number][] = [[art === 'schnabel' ? xR - 0.15 : xR, yR], [xR + 0.5 * r, yR - 0.08 * r], ecke];
  let oben = linieDurch(vorn, zAuf);
  let unten: { knoten: Linie3Knoten[] } | undefined;
  if (art === 'ueberbiss' || art === 'schnabel') {
    unten = linieDurch([[xR + 0.12 * r, yR + 0.08 * r], [xR + 0.55 * r, yR + 0.04 * r], ecke], (x, y) => 0.9 * zAuf(x, y));
  } else if (art === 'unterbiss') {
    unten = oben;
    oben = linieDurch([[xR + 0.3 * r, yR - 0.16 * r], [xR + 0.55 * r, yR - 0.12 * r], ecke], (x, y) => 0.9 * zAuf(x, y));
  }
  if (unten) unten.knoten[unten.knoten.length - 1]!.p = [...oben.knoten[oben.knoten.length - 1]!.p];
  // wie im Maul-Tab gezeichnet (14.10. nachts): Tiefe und Tiefengriffe von der Haut, runder Anfang (`lippeAnHaut`);
  // die versetzte Kante bleibt 10 % innen
  const aufHaut = (l: { knoten: Linie3Knoten[] }, f: number) => lippeAnHaut(l, (x, y) => f * zAuf(x, y)) as { knoten: Linie3Knoten[] };
  if (art === 'unterbiss' && unten) {
    unten = aufHaut(unten, 1);
    oben = aufHaut(oben, 0.9);
  } else {
    oben = aufHaut(oben, 1);
    if (unten) unten = aufHaut(unten, 0.9);
  }
  if (unten) unten.knoten[unten.knoten.length - 1]!.p = [...oben.knoten[oben.knoten.length - 1]!.p];
  const roh = { ...d, maul: { zu: { oben, ...(unten ? { unten } : {}) } } } as Dokument;
  if (!mitMarken) return roh;
  // Lippenanfänge als markierte Knoten der schwarzen Linie (Block 2): einfügen/trennen, dann die Knoten dorthin ziehen,
  // wo die Linien beginnen — die schwarze Linie geht in Rot und Blau über (Schlitz zwischen den Knoten)
  let mk = maulMitMarken(roh, roh.maul!.zu);
  const zielO = oben.knoten[0]!.p;
  let seite = maulAnfangBewegen(mk.profile.seite, 'oben', { x: zielO[0], y: zielO[1] });
  if (unten) {
    const zielU = unten.knoten[0]!.p;
    seite = maulAnfangBewegen(seite, 'unten', { x: zielU[0], y: zielU[1] });
  }
  mk = maulAnMarken({ ...mk, profile: { ...mk.profile, seite }, maul: roh.maul! });
  return mk;
}

/**
 * Florians Unterbiss nach seinem Bild 2 (14.10. nachts, `docs/progress/editor/florian-2026-10-14-unterbiss-riss.webp`):
 * Startkugel, der rote Anfang auf der Kontur 0,27 r unter der Mitte, der blaue 0,54 r davor und 0,2 r tiefer (der
 * Unterkiefer ragt als Keil vor, die schwarze Linie läuft vom blauen Knoten gerade zum Boden); das Top ist vorn bis zum
 * blauen Anfang gezogen (wie die Kopplung beim Ziehen des Anfangs). Linien wie im Maul-Tab gezeichnet (Catmull-Rom,
 * `linieDurch`): Rot auf der Haut, Blau mit einem Knoten 1,1 r weit (breiter als die Kugel, in Front und Top).
 */
function florianUnterbiss(mitMarken: boolean): Dokument {
  const d = neuesDokument('kugel-florian');
  const r = 0.265;
  const xM = 0;
  const yM = r;
  const haut = (x: number, y: number) => Math.sqrt(Math.max(0, r * r - (x - xM) ** 2 - (y - yM) ** 2));
  const yR = yM - 0.27 * r;
  const xR = xM - Math.sqrt(r * r - (yR - yM) ** 2);
  const ecke: [number, number, number] = [xM + 0.29 * r, yM - 0.14 * r, haut(xM + 0.29 * r, yM - 0.14 * r)];
  const mitteRot: [number, number, number] = [xM - 0.35 * r, yM - 0.21 * r, haut(xM - 0.35 * r, yM - 0.21 * r)];
  // Rot wie mit der neuen Zeichen-Vorgabe (auf der Haut, runder Anfang); Blau bleibt Florians breite Linie, nur der
  // Anfang quer zur Spiegelebene (14.10. nachts)
  const oben = lippeAnHaut(linie3Durch([[xR, yR, 0], mitteRot, ecke]), haut);
  const blauAnfang: [number, number, number] = [xM - 1.5 * r, yM - 0.47 * r, 0];
  const unten = lippeAnHaut(linie3Durch([blauAnfang, [xM - 0.4 * r, yM - 0.25 * r, 1.1 * r], [...ecke]]), haut, false);
  unten.knoten[unten.knoten.length - 1]!.p = [...oben.knoten[oben.knoten.length - 1]!.p];
  const top = { ...d.profile.top, knoten: d.profile.top.knoten.map((k, i) => (i === 0 ? { ...k, p: { x: blauAnfang[0], y: 0 } } : k)) };
  const roh = { ...d, profile: { ...d.profile, top }, maul: { zu: { oben, unten } } } as Dokument;
  if (!mitMarken) return roh;
  let mk = maulMitMarken(roh, roh.maul!.zu);
  let seite = maulAnfangBewegen(mk.profile.seite, 'oben', { x: xR, y: yR });
  seite = maulAnfangBewegen(seite, 'unten', { x: blauAnfang[0], y: blauAnfang[1] });
  mk = maulAnMarken({ ...mk, profile: { ...mk.profile, seite }, maul: roh.maul! });
  return mk;
}

/**
 * Kürzeren Kiefer nach vorn ziehen (Florian 14.10. nachts: „an der kleineren Lippe entsteht eine komische Meshfläche
 * oder Lücke genau an der Spitze, sobald ich Ober- oder Unterkiefer nach vorne ziehe“): Überbiss (Kugel) mit dem blauen
 * Anfang bzw. Florians Unterbiss mit dem roten Anfang um `vor` (Profil-Einheiten) nach vorn gezogen — wie ein Zug am
 * markierten Knoten der schwarzen Linie; der Linienanfang folgt dem Knoten.
 */
export function kieferVorDokument(kiefer: 'unten' | 'oben', vor: number, hoch = 0): Dokument {
  const d = kiefer === 'unten' ? kugelMaulDokument('ueberbiss', true) : florianUnterbiss(true);
  const rolle = kiefer === 'unten' ? 'unten' : 'oben';
  const i = d.profile.seite.knoten.findIndex((k) => k.marke === (rolle === 'unten' ? 'maulUnten' : 'maulOben'));
  const p = d.profile.seite.knoten[i]!.p;
  const seite = maulAnfangBewegen(d.profile.seite, rolle, { x: p.x - vor, y: p.y + hoch });
  return maulAnMarken({ ...d, profile: { ...d.profile, seite } });
}

/** Halbe Hautbreite an einem Seitenpunkt aus dem feinen Netz einer Ableitung (größtes z im Fenster), null außerhalb. */
export function hautAusNetz(abl: Ableitung, fenster = 0.006): (x: number, y: number) => number | null {
  const f = abl.fein;
  // Fenster wächst, bis es Netzpunkte findet (auf einem groben Netz lagen am Langhals-Kopf keine im kleinen Fenster)
  return (x, y) => {
    for (let w = fenster; w <= 8 * fenster; w *= 2) {
      let best = -1;
      for (let i = 0; i + 2 < f.length; i += 3) {
        if (Math.abs(f[i]! - x) > w || Math.abs(f[i + 1]! - y) > w) continue;
        best = Math.max(best, f[i + 2]!);
      }
      if (best > 0) return best;
    }
    return null;
  };
}

/**
 * Langhals mit Maul unter dem Kopf (Florian 14.10. nachts: „beim Langhals kann ich aktuell überhaupt kein Maul setzen,
 * ohne dass es die Form komplett zerreißt oder die Nase zur Mittellinie zusammenfällt“): die Maullinie der Vorlage
 * (Seite + Front, Anfang auf der Kopfunterseite weit hinter der Schnauzenspitze), wie im Maul-Tab gezeichnet (auf der
 * Haut, runder Anfang), Anfang als markierter Knoten der schwarzen Linie.
 */
export function langhalsMaulDokument(roh: Dokument, linieSeite: readonly V2[], linieFront: readonly V2[]): Dokument {
  const haut = hautAusNetz(ableiten(roh, { stufen: 2 }));
  const pts = linieSeite.map((q, i) => [q.x, q.y, i === 0 ? 0 : Math.abs(linieFront[Math.min(i, linieFront.length - 1)]!.x)] as [number, number, number]);
  const oben = lippeAnHaut(linie3Durch(pts), haut);
  const mitLinie = { ...roh, maul: { zu: { oben } } } as Dokument;
  return maulMitMarken(mitLinie, mitLinie.maul!.zu);
}

/**
 * Kugel mit Nase über dem Kiefer nach Florians Bild 3 (14.10. spätnachts, `docs/progress/editor/florian-2026-10-14-nase-
 * ueber-kiefer.webp`): vorderer Seitenknoten nach vorn oben gezogen (senkrechte Griffe), Top vorn mitgezogen; Überbiss
 * mit rotem Anfang auf der Nasenunterseite und blauem dahinter; Linien auf der Haut des Körpers ohne Maul.
 */
export function naseDokument(): Dokument {
  const d = neuesDokument('kugel-nase');
  const r = 0.265;
  const seite = { ...d.profile.seite, knoten: d.profile.seite.knoten.map((k, i) => (i === 3 ? { ...k, p: { x: -1.766 * r, y: r + 0.667 * r }, ein: { x: 0, y: -0.243 * r }, aus: { x: 0.02 * r, y: 0.512 * r } } : k)) };
  const top = { ...d.profile.top, knoten: d.profile.top.knoten.map((k, i) => (i === 0 ? { ...k, p: { x: -1.766 * r, y: 0 } } : k)) };
  const roh = { ...d, profile: { ...d.profile, seite, top } } as Dokument;
  const haut = hautAusNetz(ableiten(roh, { stufen: 2 }));
  const P = (x: number, y: number): [number, number] => [x * r, r + y * r];
  const ecke = P(-0.094, -0.158);
  const rotAnfang = P(-1.108, -0.216);
  const blauAnfang = P(-0.854, -0.327);
  const oben = lippeAnHaut(linie3Durch([[rotAnfang[0], rotAnfang[1], 0], [...P(-0.62, -0.19), 0.1], [ecke[0], ecke[1], 0.2]]), haut);
  const unten = lippeAnHaut(linie3Durch([[blauAnfang[0], blauAnfang[1], 0], [...P(-0.5, -0.25), 0.1], [ecke[0], ecke[1], 0.2]]), (x, y) => {
    const z = haut(x, y);
    return z === null ? null : 0.92 * z;
  });
  unten.knoten[unten.knoten.length - 1]!.p = [...oben.knoten[oben.knoten.length - 1]!.p];
  const mitLinien = { ...roh, maul: { zu: { oben, unten } } } as Dokument;
  let mk = maulMitMarken(mitLinien, mitLinien.maul!.zu);
  let s2 = maulAnfangBewegen(mk.profile.seite, 'oben', { x: rotAnfang[0], y: rotAnfang[1] });
  s2 = maulAnfangBewegen(s2, 'unten', { x: blauAnfang[0], y: blauAnfang[1] });
  mk = maulAnMarken({ ...mk, profile: { ...mk.profile, seite: s2 }, maul: mitLinien.maul! });
  return mk;
}

/**
 * Kiefer trennen wie der Chip „getrennt“ im Editor (`unterkieferKante`): blaue Linie = rote 0,025 höher, Tiefe × 0,85,
 * Anfang 15 % zum zweiten Knoten; dann Marken (blauer Knoten auf der Kinnseite) und Linienanfänge auf die Knoten.
 */
export function kieferGetrennt(dok: Dokument): Dokument {
  const oben = dok.maul!.zu.oben;
  const kn = oben.knoten.map((k) => ({ ...k, p: [k.p[0], k.p[1] + 0.025, k.p[2] * 0.85] as [number, number, number], ein: [k.ein[0], k.ein[1], k.ein[2] * 0.85] as [number, number, number], aus: [k.aus[0], k.aus[1], k.aus[2] * 0.85] as [number, number, number] }));
  if (kn.length >= 2) {
    const a = kn[0]!;
    const b = kn[1]!;
    kn[0] = { ...a, p: [a.p[0] + 0.15 * (b.p[0] - a.p[0]), a.p[1] + 0.15 * (b.p[1] - a.p[1]), a.p[2] + 0.15 * (b.p[2] - a.p[2])] };
  }
  kn[kn.length - 1]!.p = [...oben.knoten[oben.knoten.length - 1]!.p];
  return maulMitMarken(dok, { oben, unten: { knoten: kn } });
}

/** Lippenanfang (Knoten der schwarzen Linie samt Linienanfang) um (dx, dy) verschieben — wie ein Zug im Editor. */
export function anfangVerschieben(dok: Dokument, rolle: 'oben' | 'unten', dx: number, dy: number): Dokument {
  const pr = dok.profile.seite;
  const i = pr.knoten.findIndex((k) => (rolle === 'oben' ? k.marke === 'maulOben' || k.marke === 'maul' : k.marke === 'maulUnten'));
  if (i < 0) return dok;
  const p = pr.knoten[i]!.p;
  return maulAnMarken({ ...dok, profile: { ...dok.profile, seite: maulAnfangBewegen(pr, rolle, { x: p.x + dx, y: p.y + dy }) } });
}

/**
 * Langhals mit Maul wie in Florians Giraffen-Bildern (14.10. spätnachts): Anfang auf der Kopfunterseite (nächster
 * Umrisspunkt zu `anfang`), Linie steigt nach hinten oben in den Kopf (Mundwinkel `ecke`); Tiefe von der Haut.
 */
export function langhalsLinieDokument(roh: Dokument, anfang: V2, mitte: V2, ecke: V2): Dokument {
  const haut = hautAusNetz(ableiten(roh, { stufen: 2 }));
  const sk = roh.skalierung;
  // Anfang genau auf den Umriss legen
  const pts = pfadAbtasten(vollerPfad(roh.profile.seite), 64).map((q) => ({ x: q.x * sk, y: q.y * sk }));
  let a0 = pts[0]!;
  for (const q of pts) if (Math.hypot(q.x - anfang.x, q.y - anfang.y) < Math.hypot(a0.x - anfang.x, a0.y - anfang.y)) a0 = q;
  const z = (q: V2) => haut(q.x, q.y) ?? 0;
  const oben = lippeAnHaut(linie3Durch([[a0.x, a0.y, 0], [mitte.x, mitte.y, z(mitte)], [ecke.x, ecke.y, z(ecke)]]), haut);
  const mitLinie = { ...roh, maul: { zu: { oben } } } as Dokument;
  return maulMitMarken(mitLinie, mitLinie.maul!.zu);
}

const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel'];

/** Region je feiner Fläche: Art des Käfigpunkts mit dem größten Gewicht am ersten Eckpunkt (wie Beweis 2). */
function regionen(abl: MaulErgebnis, flaechen: number[][]): string[] {
  const M = abl.unterteilung.matrix;
  const art = abl.maul.art;
  return flaechen.map((f) => {
    const i = f[0]!;
    const g = new Float64Array(8);
    for (let p = M.start[i]!; p < M.start[i + 1]!; p++) g[art[M.index[p]!]!] = (g[art[M.index[p]!]!] ?? 0) + M.wert[p]!;
    let best = 0;
    for (let a = 1; a < g.length; a++) if (g[a]! > g[best]!) best = a;
    return ARTEN[best] ?? `art${best}`;
  });
}

export type MaulPruefung = {
  delta: { seite: number; front: number; top: number };
  lippen: MaulAbweichung;
  falte: ReturnType<typeof faltenMass>;
  /** Falten nur zwischen Hautflächen (ohne Lippen, Tasche): zeigt Flossen und Kerben am Kiefer (14.10. spätnachts) */
  hautFalte: ReturnType<typeof faltenMass>;
  /** Durchdringungen je Öffnung (0, 25, 50, 75, 100 %), gesamt und nach Bereich */
  paare: { oeffnung: number; paare: number; nachBereich: Record<string, number> }[];
  zeit: number;
  abl: MaulErgebnis;
};

/** Maul eines Dokuments mit gezeichneten Linien bauen und messen (Stufe 2, Vorlage „vorn“). */
export function pruefenMaul(dok: Dokument, opt: Partial<AbleitOptionen> = {}, maulOpt: Partial<MaulOptionen> = {}): MaulPruefung {
  const linie = maulLinieAusDokument(dok);
  if (!linie) throw new Error('kein gezeichnetes Maul');
  const abl = ableitenMitMaul(dok, linie, { stufen: 2, ...opt }, { ...maulOptionenVorlage('vorn'), ...maulOpt });
  const { punkte, flaechen } = feinesNetz(abl);
  const ab = blattAbweichungen(punkte, flaechen, dok, 240, kieferFlaechen(abl, flaechen));
  const bereiche = regionen(abl, flaechen);
  const paare = [0, 0.25, 0.5, 0.75, 1].map((oeffnung) => {
    const pose = maulPose(abl, oeffnung);
    const pts: V3[] = [];
    for (let i = 0; i < pose.fein.length / 3; i++) pts.push([pose.fein[3 * i]!, pose.fein[3 * i + 1]!, pose.fein[3 * i + 2]!]);
    const d = selbstDurchdringungen({ punkte: pts, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
    return { oeffnung, paare: d.paare, nachBereich: d.nachBereich };
  });
  return { delta: { seite: ab.seite.max, front: ab.front.max, top: ab.top.max }, lippen: maulAbweichung(abl, dok, linie), falte: faltenMass(abl), hautFalte: faltenMass(abl, (f) => bereiche[f] === 'haut'), paare, zeit: abl.zeiten.gesamt, abl };
}
