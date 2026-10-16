// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1: das 3D-Liniennetz in jedem Blatt. Florian: „Jeder Punkt/jede
// Kantenlinie, die ich erstelle, erscheint auch in jeder Ansicht … Ihre Dicke und Farbe beschreibt wie bisher ihre
// Kantigkeit … Wenn etwas unter einem Objekt liegt, ist es farblich dezenter.“
// Gezeichnet wird, was der Worker auf dem echten Körper findet (`WesenNetz.netzSicht`, Profil-Einheiten der Ruhelage):
// - die Umrisse der anderen Ansichten als 3D-Linien auf dem Körper (in der Seite z. B. die Breitenlinie = der Top-Umriss
//   und der Front-Umriss), dünn, verdeckte Stücke gestrichelt und blass; im eigenen Blatt die inneren Konturstücke
//   (z. B. der Bauch unter dem Kopf im Top), der äußere Umriss ist die schwarze Linie;
// - die Knoten der anderen Zeichnungen als Ringe an ihrem 3D-Punkt;
// - Kantenlinien auf der Haut (Kantigkeit wie bisher), Falten aus scharfen Käfigkanten (statt der Eckkanten des alten
//   Lofts) und Spantringe.
// Nur Bauweise Kern und Grundform. Die Linien liegen unter der schwarzen Linie, die Ringe darüber.

import type { Ansicht, Blick, Dokument, V2 } from '@ee/shape';
import { hauptspantStelle } from '@ee/shape';
import { type NetzSicht, type NetzZug, type NetzZugArt, RAND } from '@ee/shape/kern';
import { inAnsicht2 } from '@ee/shape/versuch';
import type { ReactNode } from 'react';
import { dunkel, strichBreite, strichMuster, weiss } from '../kanten/KantenEbene';
import { useNetzStand } from '../kern/netzStand';
import { SPANT_HINTEN, SPANT_VORN } from '../spanten/SpantEbene';
import { useEditor } from '../state/editorStore';
import { blickVon, useUi } from '../state/uiStore';
import { netzJetzt, sichtBit, zugPunkt } from './netzLage';

/** Kontur der eigenen Blickachse (sichtbar = der Umriss, gezeigt wird nur Verdecktes) */
const EIGENE: Record<Blick, NetzZugArt> = { seite: 'kontur-seite', front: 'kontur-front', hinten: 'kontur-front', top: 'kontur-top', unten: 'kontur-top' };
/** Stil „farbe“: je Ursprungsansicht eine Farbe */
export const NETZ_FARBE: Record<'seite' | 'front' | 'top', string> = { seite: '#2b50d8', front: '#a03cc8', top: '#0f9e8e' };
const ART_ANSICHT: Partial<Record<NetzZugArt, 'seite' | 'front' | 'top'>> = { 'kontur-seite': 'seite', 'kontur-front': 'front', 'kontur-top': 'top' };
/** Verdeckt: blass und gestrichelt */
const VERDECKT = 0.3;

type Lauf = { d: string; sicht: boolean; rechts: boolean; h: number };

/**
 * Proben eines Zugs in Läufe gleicher Sichtbarkeit, Seite und Kantigkeitsstufe (je ein Pfad); Stücke, deren Proben
 * `nimm` nicht erfüllen, fallen weg.
 */
function laeufe(z: NetzZug, ansicht: Ansicht, bit: number, bild: (p: V2) => V2, nimm: (i: number) => boolean): Lauf[] {
  const n = z.sicht.length;
  const out: Lauf[] = [];
  const q = Array.from({ length: n }, (_, i) => bild(inAnsicht2(zugPunkt(z, i), ansicht)));
  let pts: V2[] = [];
  let hs: number[] = [];
  let schluessel = '';
  let akt: { sicht: boolean; rechts: boolean } | null = null;
  const schliessen = () => {
    if (akt && pts.length >= 2) {
      const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
      out.push({ d, sicht: akt.sicht, rechts: akt.rechts, h: hs.reduce((a, x) => a + x, 0) / hs.length });
    }
    pts = [];
    hs = [];
    akt = null;
    schluessel = '';
  };
  for (let i = 0; i + 1 < n; i++) {
    if (!nimm(i) || !nimm(i + 1)) {
      schliessen();
      continue;
    }
    const sicht = (z.sicht[i]! & bit) !== 0 && (z.sicht[i + 1]! & bit) !== 0;
    const rechts = z.punkte[3 * i + 2]! + z.punkte[3 * i + 5]! >= -2e-4;
    const h = z.haerte ? (z.haerte[i]! + z.haerte[i + 1]!) / 2 : 0;
    // Kantigkeit in Zehnteln: Breite und Grau ändern sich stufenweise entlang der Linie
    const k = `${sicht ? 1 : 0}${rechts ? 1 : 0}${z.haerte ? `${strichMuster(h) ?? '-'}${Math.round(h * 10)}` : ''}`;
    if (k !== schluessel) {
      schliessen();
      akt = { sicht, rechts };
      schluessel = k;
      pts.push(q[i]!);
    }
    pts.push(q[i + 1]!);
    hs.push(h);
  }
  schliessen();
  return out;
}

const spantFarbe = (dok: Dokument, id: string): string => {
  const sp = dok.spanten?.[Number(id.slice(2))];
  return sp && sp.f > hauptspantStelle(dok) + 1e-9 ? SPANT_HINTEN : SPANT_VORN;
};

/** Pfade eines Blatts (gemerkt je Netz, Blatt, Blick, Abbildung und Stil: Blätter rendern bei jedem Zeigerzug neu). */
const merker = new WeakMap<NetzSicht, Map<string, ReactNode[]>>();

function netzPfade(ns: NetzSicht, ansicht: Ansicht, blick: Blick, bild: (p: V2) => V2, stil: 'ton' | 'farbe', dok: Dokument): ReactNode[] {
  const k0 = bild({ x: 0, y: 0 });
  const k1 = bild({ x: 1, y: 1 });
  const schluessel = `${ansicht}|${blick}|${stil}|${k0.x},${k0.y},${k1.x},${k1.y}|${dok.spanten?.map((s) => s.f).join(',') ?? ''}|${dok.hauptspant ?? ''}`;
  let m = merker.get(ns);
  if (!m) {
    m = new Map();
    merker.set(ns, m);
  }
  const alt = m.get(schluessel);
  if (alt) return alt;
  const bit = sichtBit(blick);
  const eigen = EIGENE[blick];
  const out: ReactNode[] = [];
  for (const z of ns.zuege) {
    if (z.art === 'maul') continue; // Maullinien zeichnet die Maulebene
    const quelle = ART_ANSICHT[z.art];
    // Konturen: in fremden Blättern nur die Stücke, die in ihrer eigenen Ansicht den Umriss bilden (die Linie der
    // Zeichnung in 3D); im eigenen Blatt nur die inneren (der äußere Umriss ist die schwarze Linie)
    const rand = (i: number) => (z.sicht[i]! & RAND) !== 0;
    const nimm = !quelle ? () => true : z.art === eigen ? (i: number) => !rand(i) : rand;
    const ls = laeufe(z, ansicht, bit, bild, nimm);
    ls.forEach((l, i) => {
      const key = `${z.id}.${i}`;
      if (quelle) {
        const farbe = stil === 'farbe' ? NETZ_FARBE[quelle] : l.rechts ? 'var(--kurve)' : 'var(--kurve-spiegel)';
        out.push(
          <path
            key={key}
            data-netz-zug={z.id}
            data-sicht={l.sicht ? 1 : 0}
            d={l.d}
            fill="none"
            stroke={farbe}
            strokeWidth={l.sicht ? 1.5 : 1.25}
            strokeDasharray={l.sicht ? undefined : '3 4'}
            strokeOpacity={l.sicht ? 0.9 : VERDECKT}
            strokeLinecap="round"
            strokeLinejoin="round"
          />,
        );
      } else if (z.art === 'reifen') {
        out.push(<path key={key} data-netz-zug={z.id} data-sicht={l.sicht ? 1 : 0} d={l.d} fill="none" stroke={spantFarbe(dok, z.id)} strokeWidth={1.5} strokeDasharray={l.sicht ? undefined : '3 4'} strokeOpacity={l.sicht ? 0.9 : VERDECKT} strokeLinejoin="round" />);
      } else {
        // Kantenlinien und Falten: Kantigkeit wie bisher (1 px gestrichelt = glatt … 3 px schwarz = scharf)
        out.push(
          <path
            key={key}
            data-netz-zug={z.id}
            data-sicht={l.sicht ? 1 : 0}
            d={l.d}
            fill="none"
            stroke={l.rechts ? dunkel(l.h) : weiss(l.h)}
            strokeWidth={strichBreite(l.h)}
            strokeDasharray={strichMuster(l.h)}
            opacity={l.sicht ? 1 : 0.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />,
        );
      }
    });
  }
  if (m.size > 24) m.clear();
  m.set(schluessel, out);
  return out;
}

/** Gemeinsame Bedingungen beider Teile: Bauweise Kern, Grundform, Kanten-Schalter. */
function useNetz(ansicht: Ansicht): { ns: NetzSicht; blick: Blick; stil: 'ton' | 'farbe'; deck: number } | null {
  useNetzStand((s) => s.version);
  const modus = useEditor((s) => s.modus);
  const bauweise = useUi((s) => s.bauweise);
  const schalter = useUi((s) => s.kantenSicht);
  const stil = useUi((s) => s.netzStil);
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  if (bauweise !== 'kern' || modus !== 'editor' || schalter === 'aus') return null;
  const ns = netzJetzt();
  return ns ? { ns, blick, stil, deck: schalter === 'blass' ? 0.35 : 1 } : null;
}

/** Linien des Netzes (unter der schwarzen Linie). */
export function NetzZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const dok = useEditor((s) => s.dok);
  const n = useNetz(ansicht);
  if (!n) return null;
  const pfade = netzPfade(n.ns, ansicht, n.blick, bild, n.stil, dok);
  return (
    <g className="netz" data-netz={n.ns.zuege.length} pointerEvents="none" opacity={n.deck}>
      {pfade}
    </g>
  );
}

/** Knoten der anderen Zeichnungen als Ringe an ihrem 3D-Punkt (über der schwarzen Linie). */
export function NetzKnotenZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const n = useNetz(ansicht);
  if (!n) return null;
  const bit = sichtBit(n.blick);
  const ringe: ReactNode[] = [];
  for (const quelle of ['seite', 'front', 'top'] as const) {
    if (quelle === ansicht) continue;
    const pts = n.ns.knoten[quelle];
    const vis = n.ns.knotenSicht[quelle];
    const anzahl = vis.length;
    const halb = quelle === 'seite' ? anzahl : anzahl / 2;
    for (let i = 0; i < anzahl; i++) {
      const p = [pts[3 * i]!, pts[3 * i + 1]!, pts[3 * i + 2]!] as const;
      if (!Number.isFinite(p[0])) continue;
      // gespiegelte Hälfte: Achsknoten gibt es nur einmal; in der Seite deckt die nahe Hälfte die ferne
      if (i >= halb && Math.abs(p[2]) < 1e-6) continue;
      if (ansicht === 'seite' && p[2] < -1e-6) continue;
      const q = bild(inAnsicht2([p[0], p[1], p[2]], ansicht));
      const sicht = (vis[i]! & bit) !== 0;
      ringe.push(
        <circle
          key={`${quelle}${i}`}
          data-netz-knoten={`${quelle}:${i < halb ? i : i - halb}${i < halb ? '' : 's'}`}
          data-sicht={sicht ? 1 : 0}
          cx={q.x}
          cy={q.y}
          r={4}
          fill="none"
          stroke={n.stil === 'farbe' ? NETZ_FARBE[quelle] : 'var(--punkt)'}
          strokeWidth={2}
          opacity={sicht ? 1 : 0.35}
        />,
      );
    }
  }
  return (
    <g className="netz-knoten" pointerEvents="none" opacity={n.deck}>
      {ringe}
    </g>
  );
}
