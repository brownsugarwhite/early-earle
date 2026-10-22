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
import { hauptspantStelle, verschiebeKnoten } from '@ee/shape';
import { type NetzSicht, type NetzZug, type NetzZugArt, RAND } from '@ee/shape/kern';
import { inAnsicht2 } from '@ee/shape/versuch';
import { type ReactNode, useEffect } from 'react';
import { dunkel, strichBreite, strichMuster, weiss } from '../kanten/KantenEbene';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { aktiveProfile, uebernehmenAktiv } from '../editing/aktiv';
import { szene } from '../three/instanz';
import { SPANT_HINTEN, SPANT_VORN } from '../spanten/SpantEbene';
import { useEditor } from '../state/editorStore';
import { type NetzPunkt, blickVon, useUi } from '../state/uiStore';
import { gemeinsamerZug, netzJetzt, netzPunktLage, sichtBit, umrissKnotenLage, zugPunkt } from './netzLage';
import { zugProportional } from '../editing/modal/modal';

/** Stil „farbe“: je Ursprungsansicht eine Farbe (Blau, Lila, Türkis heißen nur noch „Umriss von Seite, Front, Top“) */
export const NETZ_FARBE: Record<'seite' | 'front' | 'top', string> = { seite: '#2b50d8', front: '#a03cc8', top: '#0f9e8e' };
const ART_ANSICHT: Partial<Record<NetzZugArt, 'seite' | 'front' | 'top'>> = {
  'kontur-seite': 'seite',
  'kontur-front': 'front',
  'kontur-top': 'top',
  'umriss-seite': 'seite',
  'umriss-front': 'front',
  'umriss-top': 'top',
};
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

/**
 * Umrisslinie (V2) als echte Kurven: Läufe gleicher Sichtbarkeit über die Proben, je Lauf die Kubiken des Zugs zwischen den
 * Kurvenparametern seiner Enden (de Casteljau), in die Ansicht projiziert (die Projektion ist linear, die Kontrollpunkte
 * bleiben Kontrollpunkte).
 */
function kurvenLaeufe(z: NetzZug, ansicht: Ansicht, bit: number, bild: (p: V2) => V2): Lauf[] {
  const K = z.kurve!;
  const par = z.parameter!;
  const n = z.sicht.length;
  const nk = (K.length / 3 - 1) / 3;
  const kp = (j: number): V2 => bild(inAnsicht2([K[3 * j]!, K[3 * j + 1]!, K[3 * j + 2]!], ansicht));
  const mix = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  // Kubik s im Bild, beschnitten auf [t0, t1]
  const stueck = (s: number, t0: number, t1: number): [V2, V2, V2, V2] => {
    let [a, b, c, d] = [kp(3 * s), kp(3 * s + 1), kp(3 * s + 2), kp(3 * s + 3)];
    if (t1 < 1) {
      // vordere Hälfte bis t1
      const ab = mix(a, b, t1);
      const bc = mix(b, c, t1);
      const cd = mix(c, d, t1);
      const abc = mix(ab, bc, t1);
      const bcd = mix(bc, cd, t1);
      [a, b, c, d] = [a, ab, abc, mix(abc, bcd, t1)];
    }
    if (t0 > 0) {
      // hintere Hälfte ab t0 (bezogen auf das schon beschnittene Stück)
      const t = t0 / t1;
      const ab = mix(a, b, t);
      const bc = mix(b, c, t);
      const cd = mix(c, d, t);
      const abc = mix(ab, bc, t);
      const bcd = mix(bc, cd, t);
      [a, b, c, d] = [mix(abc, bcd, t), bcd, cd, d];
    }
    return [a, b, c, d];
  };
  const f = (p: V2) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  // Spiegelbilder (Kennung „…s“) im Stil „ton“ wie die Spiegelhälfte der Kurven
  const rechts = !z.id.endsWith('s');
  const pfad = (p0: number, p1: number): string => {
    let d = '';
    for (let s = Math.max(0, Math.floor(p0)); s < nk && s < p1; s++) {
      const t0 = Math.max(0, p0 - s);
      const t1 = Math.min(1, p1 - s);
      if (t1 - t0 < 1e-6) continue;
      const [a, b, c, e] = stueck(s, t0, t1);
      d += `${d ? '' : `M${f(a)}`}C${f(b)} ${f(c)} ${f(e)}`;
    }
    return d;
  };
  const out: Lauf[] = [];
  let anfang = 0;
  let akt: boolean | null = null;
  for (let i = 0; i + 1 < n; i++) {
    const sicht = (z.sicht[i]! & bit) !== 0 && (z.sicht[i + 1]! & bit) !== 0;
    if (akt === null) akt = sicht;
    else if (sicht !== akt) {
      out.push({ d: pfad(par[anfang]!, par[i]!), sicht: akt, rechts, h: 0 });
      anfang = i;
      akt = sicht;
    }
  }
  if (akt !== null) out.push({ d: pfad(par[anfang]!, par[n - 1]!), sicht: akt, rechts, h: 0 });
  return out.filter((l) => l.d);
}

const spantFarbe = (dok: Dokument, id: string): string => {
  const sp = dok.spanten?.[Number(id.slice(2))];
  return sp && sp.f > hauptspantStelle(dok) + 1e-9 ? SPANT_HINTEN : SPANT_VORN;
};

/** Pfade eines Blatts (gemerkt je Netz, Blatt, Blick, Abbildung und Stil: Blätter rendern bei jedem Zeigerzug neu). */
const merker = new WeakMap<NetzSicht, Map<string, ReactNode[]>>();

function netzPfade(ns: NetzSicht, ansicht: Ansicht, blick: Blick, bild: (p: V2) => V2, stil: 'ton' | 'farbe', dok: Dokument, umrisse: boolean): ReactNode[] {
  const k0 = bild({ x: 0, y: 0 });
  const k1 = bild({ x: 1, y: 1 });
  const schluessel = `${ansicht}|${blick}|${stil}|${umrisse ? 'u' : '-'}|${k0.x},${k0.y},${k1.x},${k1.y}|${dok.spanten?.map((s) => s.f).join(',') ?? ''}|${dok.hauptspant ?? ''}`;
  let m = merker.get(ns);
  if (!m) {
    m = new Map();
    merker.set(ns, m);
  }
  const alt = m.get(schluessel);
  if (alt) return alt;
  const bit = sichtBit(blick);
  const out: ReactNode[] = [];
  for (const z of ns.zuege) {
    if (z.art === 'maul') continue; // Maullinien zeichnet die Maulebene
    const quelle = ART_ANSICHT[z.art];
    // Umrisse (V2): in fremden Blättern die Umrisslinie der Zeichnung auf dem Körper als Kurve; im eigenen Blatt ist der
    // äußere Umriss die schwarze Linie, dort zeigen sich nur die inneren Konturstücke (z. B. der Bauch unter dem Kopf im Top)
    const umriss = z.art.startsWith('umriss-');
    if (quelle && umriss === (quelle === ansicht)) continue;
    // Umrisslinien und innere Konturen nur auf Wunsch (Tafel; Standard aus — reine Anzeige)
    if (quelle && !umrisse) continue;
    const ls = umriss && z.kurve && z.parameter ? kurvenLaeufe(z, ansicht, bit, bild) : laeufe(z, ansicht, bit, bild, quelle ? (i) => (z.sicht[i]! & RAND) === 0 : () => true);
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
function useNetz(ansicht: Ansicht): { ns: NetzSicht; blick: Blick; stil: 'ton' | 'farbe'; deck: number; umrisse: boolean } | null {
  useNetzStand((s) => s.version);
  const modus = useEditor((s) => s.modus);
  const bauweise = useUi((s) => s.bauweise);
  const schalter = useUi((s) => s.kantenSicht);
  const stil = useUi((s) => s.netzStil);
  const umrisse = useUi((s) => s.netzUmrisse === 'an');
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  if (bauweise !== 'kern' || modus !== 'editor' || schalter === 'aus') return null;
  const ns = netzJetzt();
  return ns ? { ns, blick, stil, deck: schalter === 'blass' ? 0.35 : 1, umrisse } : null;
}

/** Linien des Netzes (unter der schwarzen Linie). */
export function NetzZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const dok = useEditor((s) => s.dok);
  const n = useNetz(ansicht);
  if (!n) return null;
  const pfade = netzPfade(n.ns, ansicht, n.blick, bild, n.stil, dok, n.umrisse);
  return (
    <g className="netz" data-netz={n.ns.zuege.length} pointerEvents="none" opacity={n.deck}>
      {pfade}
    </g>
  );
}

/** Bedienung aus dem Blatt (wie bei den Profilknoten). */
export type NetzKontext = {
  lokal: (clientX: number, clientY: number) => V2;
  ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void;
};

type Ring = { np: Extract<NetzPunkt, { art: 'umriss' }>; q: V2; sicht: boolean };

/** Ringe der fremden Umrissknoten eines Blatts (gezeichnete Hälfte und Spiegelbild, Achsknoten einmal). */
function ringeVon(dok: Dokument, ns: NetzSicht, ansicht: Ansicht, bit: number, bild: (p: V2) => V2): Ring[] {
  const out: Ring[] = [];
  for (const quelle of ['seite', 'front', 'top'] as const) {
    if (quelle === ansicht) continue;
    const knoten = dok.profile[quelle].knoten;
    for (const spiegel of quelle === 'seite' ? [false] : [false, true]) {
      knoten.forEach((k, index) => {
        // Achsknoten (auf der Spiegelachse) gibt es nur einmal
        if (spiegel && Math.abs(quelle === 'front' ? k.p.x : k.p.y) < 1e-6) return;
        const l = umrissKnotenLage(dok, quelle, index, spiegel, ns);
        if (!l) return;
        // in der Seite deckt die nahe Hälfte (z ≥ 0) die ferne
        if (ansicht === 'seite' && l.p[2] < -1e-6) return;
        out.push({ np: { art: 'umriss', quelle, index, spiegel }, q: bild(inAnsicht2(l.p, ansicht)), sicht: (l.sicht & bit) !== 0 });
      });
    }
  }
  return out;
}

const gleich = (a: NetzPunkt | null, b: NetzPunkt | null) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
let letzterGriff: NetzPunkt | null = null;

/** Umrissknoten unter dem Zeiger in einem Blatt: eigene Knoten und Ringe fremder Knoten, oberster zuerst. */
export function netzPunkteUnter(svg: SVGSVGElement, ansicht: Ansicht, clientX: number, clientY: number): Extract<NetzPunkt, { art: 'umriss' }>[] {
  const out: Extract<NetzPunkt, { art: 'umriss' }>[] = [];
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (!svg.contains(el)) continue;
    const eigen = el.closest('[data-knoten]');
    const ring = el.closest('[data-netz-knoten]');
    let np: Extract<NetzPunkt, { art: 'umriss' }> | null = null;
    if (eigen) np = { art: 'umriss', quelle: ansicht as 'seite' | 'front' | 'top', index: Number(eigen.getAttribute('data-knoten')), spiegel: false };
    else if (ring) {
      const [q, rest] = ring.getAttribute('data-netz-knoten')!.split(':') as ['seite' | 'front' | 'top', string];
      np = { art: 'umriss', quelle: q, index: Number.parseInt(rest, 10), spiegel: rest.endsWith('s') };
    }
    if (np && !out.some((x) => gleich(x, np))) out.push(np);
  }
  return out;
}

/**
 * ⌥-Klick mit der Auswahl: wechselt zwischen übereinanderliegenden Punkten (eigener Knoten und Ringe fremder Knoten, in
 * der Reihenfolge von oben). Liefert den gewählten Punkt; null = nur einer da (normal weiter).
 */
export function naechsterUnter(svg: SVGSVGElement, ansicht: Ansicht, clientX: number, clientY: number): Extract<NetzPunkt, { art: 'umriss' }> | null {
  const alle = netzPunkteUnter(svg, ansicht, clientX, clientY);
  if (alle.length < 2) return null;
  const jetzt = alle.findIndex((x) => gleich(x, letzterGriff));
  const np = alle[(jetzt + 1) % alle.length]!;
  letzterGriff = np;
  return np;
}

/**
 * Fremden Umrissknoten greifen: wählt ihn in seiner Zeichnung und zieht ihn entlang der gemeinsamen Koordinate (ein
 * Undo-Schritt, Kopplung wie beim Ziehen in der eigenen Ansicht).
 */
export function netzKnotenGreifen(e: React.PointerEvent, ansicht: Ansicht, np: Extract<NetzPunkt, { art: 'umriss' }>, ctx: NetzKontext) {
  e.stopPropagation();
  const ui = useUi.getState();
  letzterGriff = np;
  const { quelle, index, spiegel } = np;
  ui.auswahlLeeren();
  ui.waehle(quelle, [index]);
  ui.setzeNetzHover(np);
  // V3: mit O proportional (G mit gedrückter Taste, nur die gemeinsame Koordinate)
  if (zugProportional(e, ansicht, 'fremd')) return;
  const start = ctx.lokal(e.clientX, e.clientY);
  const basis = aktiveProfile();
  const auswahlBasis = useUi.getState().auswahl;
  useEditor.getState().beginGeste();
  ctx.ziehen(
    e,
    (ev) => {
      const p = ctx.lokal(ev.clientX, ev.clientY);
      const d = gemeinsamerZug(ansicht, quelle, { x: p.x - start.x, y: p.y - start.y }, spiegel);
      uebernehmenAktiv(quelle, verschiebeKnoten(basis[quelle], [index], d), [index], basis, auswahlBasis);
    },
    () => useEditor.getState().endeGeste(),
  );
}

/**
 * Knoten der anderen Zeichnungen als Ringe an ihrem 3D-Punkt (über der schwarzen Linie). Im Körper-Tab greifbar: Ziehen
 * wirkt nur in der Koordinate, die beide Ansichten teilen; verdeckte Ringe (blass) ebenso, z. B. der Bauchpunkt unter der
 * Nase im Top.
 */
export function NetzKnotenZeichnung({ ansicht, bild, aktiv, ctx }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean; ctx: NetzKontext }) {
  const dok = useEditor((s) => s.dok);
  const auswahl = useUi((s) => s.auswahl);
  const hover = useUi((s) => s.netzHover);
  const n = useNetz(ansicht);
  if (!n) return null;
  const ringe = ringeVon(dok, n.ns, ansicht, sichtBit(n.blick), bild);
  return (
    <g className="netz-knoten" pointerEvents={aktiv ? 'auto' : 'none'} opacity={n.deck}>
      {ringe.map((r) => {
        const { quelle, index, spiegel } = r.np;
        const gewaehlt = auswahl[quelle].includes(index);
        const schwebt = gleich(hover, r.np);
        const farbe = n.stil === 'farbe' ? NETZ_FARBE[quelle] : 'var(--punkt)';
        return (
          <g
            key={`${quelle}${index}${spiegel ? 's' : ''}`}
            data-netz-knoten={`${quelle}:${index}${spiegel ? 's' : ''}`}
            data-sicht={r.sicht ? 1 : 0}
            className="netz-ring"
            onPointerEnter={() => useUi.getState().setzeNetzHover(r.np)}
            onPointerLeave={() => gleich(useUi.getState().netzHover, r.np) && useUi.getState().setzeNetzHover(null)}
            onPointerDown={(e) => {
              // ⌥ (Wechsel zwischen übereinanderliegenden Punkten) entscheidet das Blatt
              if (e.button !== 0 || e.altKey) return;
              netzKnotenGreifen(e, ansicht, r.np, ctx);
            }}
          >
            <circle cx={r.q.x} cy={r.q.y} r={9} fill="transparent" />
            <circle cx={r.q.x} cy={r.q.y} r={schwebt ? 5.5 : 4} fill={gewaehlt ? farbe : 'none'} stroke={farbe} strokeWidth={2} opacity={r.sicht ? 1 : 0.35} />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Der Netzpunkt unter dem Zeiger, in jedem Blatt an seinem 3D-Punkt markiert (auch in seiner eigenen Ansicht und am
 * Spiegelbild); das Seitenblatt setzt dazu die Marke auf der Bühne (die Blätter rendern dieselbe Szene, dort erscheint sie
 * ebenso).
 */
export function NetzHoverZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const dok = useEditor((s) => s.dok);
  const hover = useUi((s) => s.netzHover);
  const n = useNetz(ansicht);
  const l = n && hover ? netzPunktLage(dok, hover, n.ns) : null;
  useEffect(() => {
    if (ansicht !== 'seite') return;
    const netz = aktuellesNetz();
    const r = szene.aktuell;
    if (!r || !netz) return;
    const sk = dok.skalierung;
    r.setzeMarke(l ? [l.p[0] * sk, l.p[1] * sk, l.p[2] * sk] : null, netz.netz.hoehe * netz.skalierung);
  }, [ansicht, l?.p[0], l?.p[1], l?.p[2], dok.skalierung]);
  if (!n || !l) return null;
  const q = bild(inAnsicht2(l.p, ansicht));
  const sicht = (l.sicht & sichtBit(n.blick)) !== 0;
  return <circle data-netz-hover="" data-sicht={sicht ? 1 : 0} cx={q.x} cy={q.y} r={10} fill="none" stroke="#ff2e9a" strokeWidth={2} strokeDasharray={sicht ? undefined : '3 3'} pointerEvents="none" />;
}
