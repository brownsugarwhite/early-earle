// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.3/V6.4: Loops sehen und wählen. Jeder Loop ist ein Ring auf dem
// Körper — auf der Bühne als Ring, in den Blättern als seine Linie (Seite: die nahe Hälfte zwischen Rücken- und Bauchknoten;
// Top, Front, Back, Bottom: der ganze Ring, verdeckte Stücke blass gestrichelt). Überall dieselben Farben: orange, unter dem
// Zeiger pink, gewählt türkis (die Auswahlfarbe des Editors). Klick auf einen Loop wählt ihn (auf der Bühne ohne Bewegung,
// ⌥ wie Blender, ⇧ fügt hinzu bzw. nimmt heraus) — dazu seine Knoten in Seite (Rücken, Bauch) und Top bzw. Front, so dass
// G/S/R auch in den Blättern auf ihn wirken (`schleifenGrs.ts`).

import type { Ansicht, Blick, V2 } from '@ee/shape';
import { type RingDaten, type SchleifenRing, SICHT, type WesenNetz, sichtbarkeit } from '@ee/shape/kern';
import { inAnsicht2 } from '@ee/shape/versuch';
import { useEffect } from 'react';
import { create } from 'zustand';
import { blattLokal } from '../editing/modal/zeiger';
import { kernRaster } from '../netz/netzRaster';
import { useEditor } from '../state/editorStore';
import { blickVon, useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { aktuellesNetz } from './netzStand';

/** Fangradius in Pixeln */
const FANG = 7;
const FARBE: [number, number, number] = [0.93, 0.55, 0.15];
const FARBE_HOVER: [number, number, number] = [1, 0.18, 0.604];
/** gewählt: die Auswahlfarbe des Editors (`--punkt`) */
const FARBE_GEWAEHLT: [number, number, number] = [0, 1, 0.882];
/** dieselben Farben in den Blättern */
export const SCHLEIFE_FARBE = { normal: '#ed8c26', hover: '#ff2e9a', gewaehlt: '#00ffe1' } as const;

/** Mitte und Zeiger einer laufenden G/S/R-Operation auf einem Loop im Blatt (Blatt-Koordinaten), für das Kreuz. */
export type SchleifenAnzeige = { feld: Ansicht; mitte: V2; zeiger: V2; art: 'g' | 's' | 'r'; ziehen: boolean };

/**
 * Gewählter Loop (der, den G/S/R formen), Loop unter dem Zeiger (Kennungen), die Zeile einer laufenden G/S/R-Operation auf
 * ihm (Dock) und ihre Anzeige im Blatt.
 */
export const useSchleife = create<{ gewaehlt: string | null; hover: string | null; text: string | null; anzeige: SchleifenAnzeige | null }>(() => ({ gewaehlt: null, hover: null, text: null, anzeige: null }));

/** Punkte eines Rings auf der Fläche (Welt, mit Maßstab), geschlossen. */
export function ringPunkte(rd: RingDaten, ring: number, sk: number): Float32Array {
  const P = rd.proRing;
  const out = new Float32Array(3 * P);
  for (let q = 0; q < 3 * P; q++) out[q] = rd.verlauf[3 * ring * P + q]! * sk;
  return out;
}

/** Mitte eines Rings (Welt, mit Maßstab). */
export function ringMitte(rd: RingDaten, ring: number, sk: number): [number, number, number] {
  const p = ringPunkte(rd, ring, sk);
  const m: [number, number, number] = [0, 0, 0];
  for (let q = 0; q < p.length; q += 3) for (let c = 0; c < 3; c++) m[c]! += p[q + c]! / (p.length / 3);
  return m;
}

/** Knoten eines Loops je Zeichnung (Seite: Rücken, Bauch; Top bzw. Front: der Breitenknoten). */
export function schleifenKnoten(id: string): Record<Ansicht, number[]> {
  const pr = useEditor.getState().dok.profile;
  const von = (a: Ansicht) => pr[a].knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
  return { seite: von('seite'), front: von('front'), top: von('top') };
}

/** Alle Knoten des Loops sind gewählt (er leuchtet als gewählt). */
function ganzGewaehlt(k: Record<Ansicht, number[]>, a: Record<Ansicht, number[]>): boolean {
  return k.seite.length > 0 && (['seite', 'front', 'top'] as const).every((x) => k[x].every((i) => a[x].includes(i)));
}

/** Kennungen der Loops, deren Knoten alle gewählt sind. */
export function gewaehlteSchleifen(): Set<string> {
  const rd = aktuellesNetz()?.netz.ringe;
  const a = useUi.getState().auswahl;
  const out = new Set<string>();
  for (const s of rd?.schleifen ?? []) if (ganzGewaehlt(schleifenKnoten(s.id), a)) out.add(s.id);
  return out;
}

/** Genau dieser Loop ist gewählt — nichts sonst (dann formen G/S/R in einem Blatt ihn als Ganzes, sonst die Punkte). */
export function nurDieserLoop(id: string): boolean {
  const k = schleifenKnoten(id);
  const a = useUi.getState().auswahl;
  const gleich = (x: number[], y: number[]) => x.length === y.length && x.every((i) => y.includes(i));
  return k.seite.length > 0 && gleich(a.seite, k.seite) && gleich(a.front, k.front) && gleich(a.top, k.top);
}

/** Loops anzeigen (nach jedem Bau, bei Auswahl und Hover) oder ausblenden (andere Stufe, keine Loops). */
export function schleifenAnzeigen(r: Renderer3D, netz: WesenNetz | null, sk: number): void {
  const ui = useUi.getState();
  const rd = netz?.ringe;
  if (!rd || !rd.schleifen.length || ui.ebene !== 'form' || ui.bauweise !== 'kern' || useEditor.getState().modus !== 'editor') {
    r.setzeSchleifen(null, null);
    return;
  }
  // ein gewählter Loop, den es nicht mehr gibt (⌘Z, gelöscht), ist nicht mehr gewählt
  if (useSchleife.getState().gewaehlt && !rd.schleifen.some((s) => s.id === useSchleife.getState().gewaehlt)) useSchleife.setState({ gewaehlt: null });
  const { hover } = useSchleife.getState();
  const gewaehlt = gewaehlteSchleifen();
  const segs: number[] = [];
  const farben: number[] = [];
  for (const s of rd.schleifen) {
    const p = ringPunkte(rd, s.ring, sk);
    const f = s.id === hover ? FARBE_HOVER : gewaehlt.has(s.id) ? FARBE_GEWAEHLT : FARBE;
    const n = p.length / 3;
    for (let q = 0; q < n; q++) {
      const q2 = (q + 1) % n;
      segs.push(p[3 * q]!, p[3 * q + 1]!, p[3 * q + 2]!, p[3 * q2]!, p[3 * q2 + 1]!, p[3 * q2 + 2]!);
      farben.push(...f, ...f);
    }
  }
  r.setzeSchleifen(Float32Array.from(segs), Float32Array.from(farben));
}

/** Farben auffrischen (Auswahl oder Hover geändert). */
export function schleifenFaerben(): void {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (r) schleifenAnzeigen(r, n?.netz ?? null, n?.skalierung ?? 1);
}

function abstandStrecke(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax;
  const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * ex + (py - ay) * ey) / l2)) : 0;
  return Math.hypot(ax + t * ex - px, ay + t * ey - py);
}

/** Loop unter dem Zeiger (Feldpixel der Bühne): der nächste Ring innerhalb des Fangradius. */
export function schleifeUnter(px: number, py: number): string | null {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const rd = n?.netz.ringe;
  if (!r || !rd || !rd.schleifen.length || useUi.getState().ebene !== 'form' || useEditor.getState().modus !== 'editor') return null;
  let best = FANG;
  let wahl: string | null = null;
  for (const s of rd.schleifen) {
    const q = r.projizierenViele('creation', ringPunkte(rd, s.ring, n.skalierung));
    const m = q.length / 3;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      if (!q[3 * i + 2] || !q[3 * j + 2]) continue;
      const d = abstandStrecke(px, py, q[3 * i]!, q[3 * i + 1]!, q[3 * j]!, q[3 * j + 1]!);
      if (d < best) {
        best = d;
        wahl = s.id;
      }
    }
  }
  return wahl;
}

/** Loop unter dem Zeiger setzen (Bühne oder Blatt); `null` nur, wenn er es gerade noch ist (Verlassen). */
export function schleifeHover(id: string | null, nurWenn?: string): void {
  if (nurWenn !== undefined && useSchleife.getState().hover !== nurWenn) return;
  if (id === useSchleife.getState().hover) return;
  useSchleife.setState({ hover: id });
  schleifenFaerben();
}

/** Hover auf der Bühne setzen (aus dem Schweben der Steuerung); true, wenn ein Loop unter dem Zeiger liegt. */
export function schleifenSchweben(px: number, py: number): boolean {
  const h = schleifeUnter(px, py);
  schleifeHover(h);
  return h !== null;
}

const HINWEIS = 'Loop gewählt: G verschieben (G G gleiten), S skalieren, R kippen — Zeiger auf der Bühne oder einem Blatt; im Blatt auch ziehen';

/**
 * Loop wählen (null: keinen): seine Knoten in Seite und Top bzw. Front werden die Auswahl der Blätter, damit G/S/R dort auf ihn
 * wirken. `aktiv` = das Blatt, in dem gewählt wurde.
 */
export function schleifeWaehlen(id: string | null, aktiv: Ansicht = 'seite'): void {
  useSchleife.setState({ gewaehlt: id });
  if (id) useUi.getState().setzeAuswahl(schleifenKnoten(id), aktiv);
  schleifenFaerben();
}

/** ⇧-Klick: Loop zur Auswahl hinzufügen bzw. herausnehmen (die übrige Auswahl bleibt). */
export function schleifeUmschalten(id: string, aktiv: Ansicht = 'seite'): void {
  const k = schleifenKnoten(id);
  const a = useUi.getState().auswahl;
  const drin = ganzGewaehlt(k, a);
  const neu = (x: Ansicht) => (drin ? a[x].filter((i) => !k[x].includes(i)) : [...a[x], ...k[x].filter((i) => !a[x].includes(i))]);
  useUi.getState().setzeAuswahl({ seite: neu('seite'), front: neu('front'), top: neu('top') }, aktiv);
  if (!drin) useSchleife.setState({ gewaehlt: id });
  schleifenFaerben();
}

/** ⌥-Klick auf der Bühne: Loop wählen (true = übernommen). */
export function schleifenZeiger(e: { altKey: boolean; shiftKey?: boolean }, px: number, py: number): boolean {
  const id = schleifeUnter(px, py);
  if (e.altKey && id) {
    if (e.shiftKey) schleifeUmschalten(id);
    else schleifeWaehlen(id);
    useUi.getState().zeigeHinweis(HINWEIS);
    return true;
  }
  return false;
}

/**
 * Klick ohne Bewegung auf der Bühne (Auswahl): auf einem Loop wählt er ihn (⇧: hinzu bzw. heraus); daneben hebt er die Wahl
 * eines Loops auf (wie Blender). true = übernommen.
 */
export function schleifenKlick(umschalten: boolean, px: number, py: number): boolean {
  const id = schleifeUnter(px, py);
  if (id) {
    if (umschalten) schleifeUmschalten(id);
    else schleifeWaehlen(id);
    useUi.getState().zeigeHinweis(HINWEIS);
    return true;
  }
  if (!umschalten && useSchleife.getState().gewaehlt) {
    useUi.getState().auswahlLeeren();
    useSchleife.setState({ gewaehlt: null });
    schleifenFaerben();
    return true;
  }
  return false;
}

/** Blatt: Klick auf eine Loop-Linie wählt den Loop (⇧: hinzu bzw. heraus). */
export function schleifeImBlattWaehlen(id: string, ansicht: Ansicht, umschalten: boolean): void {
  if (umschalten) schleifeUmschalten(id, ansicht);
  else schleifeWaehlen(id, ansicht);
  useUi.getState().zeigeHinweis(HINWEIS);
}

/**
 * Dauerhaft: Ändert sich die Auswahl der Blätter so, dass die Knoten des gewählten Loops nicht mehr alle dabei sind, ist er
 * nicht mehr gewählt; die Farben der Loops folgen jeder Auswahl (auch Rechteck und Klick auf Knoten).
 */
export function useSchleifenAuswahlAbgleich() {
  useEffect(
    () =>
      useUi.subscribe((s, v) => {
        if (s.auswahl === v.auswahl) return;
        const id = useSchleife.getState().gewaehlt;
        if (id && !ganzGewaehlt(schleifenKnoten(id), s.auswahl)) useSchleife.setState({ gewaehlt: null });
        if (aktuellesNetz()?.netz.ringe?.schleifen.length) schleifenFaerben();
      }),
    [],
  );
}

// ---------- Loops in den Blättern ----------

/** Ein Stück eines Loops im Blatt: Punkte (Blatt-Koordinaten, Profil-Einheiten) gleicher Sichtbarkeit. */
export type SchleifenStueck = { punkte: V2[]; sicht: boolean };
/** Ein Loop im Blatt: seine Stücke und der ganze Zug (Trefferfläche). */
export type SchleifeImBlatt = { id: string; stuecke: SchleifenStueck[]; alle: V2[] };

/**
 * Sichtbarkeit der Ringpunkte je Loop (Bits aus `SICHT`), auf demselben Strahlraster wie das Liniennetz. Während einer Geste
 * gilt die vom Gestenbeginn: Das Raster bleibt dann stehen, der Ring wandert mit — ein verkleinerter Loop läge sonst „hinter“
 * der alten Haut und spränge beim Loslassen von blass auf kräftig.
 */
let sichtMerk: { netz: object; bits: Map<string, Uint8Array> } | null = null;

function ringSicht(rd: RingDaten, s: SchleifenRing, netz: object): Uint8Array {
  const imZug = !!useEditor.getState().gesteStart;
  if (!sichtMerk || (sichtMerk.netz !== netz && !imZug)) sichtMerk = { netz, bits: new Map() };
  const alt = sichtMerk.bits.get(s.id);
  if (alt && alt.length === rd.proRing) return alt;
  const r = kernRaster();
  const P = rd.proRing;
  const bits = new Uint8Array(P).fill(31);
  if (r)
    for (let q = 0; q < P; q++) {
      const o = 3 * (s.ring * P + q);
      bits[q] = sichtbarkeit(r, [rd.verlauf[o]!, rd.verlauf[o + 1]!, rd.verlauf[o + 2]!], 1.5);
    }
  sichtMerk.bits.set(s.id, bits);
  return bits;
}

/** Nahe Hälfte eines Rings in der Seite (z ≥ 0, längster zusammenhängender Lauf in Ringreihenfolge): Sie deckt die ferne genau. */
function naheHaelfte(rd: RingDaten, ring: number): number[] {
  const P = rd.proRing;
  const vorn = (q: number) => rd.verlauf[3 * (ring * P + ((q + P) % P)) + 2]! >= -1e-6;
  let start = -1;
  let laenge = 0;
  for (let q = 0; q < P; q++) {
    if (!vorn(q) || vorn(q - 1)) continue;
    let l = 0;
    while (l < P && vorn(q + l)) l++;
    if (l > laenge) {
      laenge = l;
      start = q;
    }
  }
  return start < 0 ? [...Array(P).keys()] : Array.from({ length: laenge }, (_, i) => (start + i) % P);
}

const blattMerk = new WeakMap<object, Map<string, SchleifeImBlatt[]>>();

/** Die Loops in einem Blatt (gemerkt je Netz und Blick; leer ohne Loops, außerhalb der Stufe Körper oder in einer Pose). */
export function schleifenImBlatt(ansicht: Ansicht, blick: Blick): SchleifeImBlatt[] {
  const n = aktuellesNetz();
  const rd = n?.netz.ringe;
  const ui = useUi.getState();
  if (!n || !rd || !rd.schleifen.length || !rd.aktiv || ui.ebene !== 'form' || ui.bauweise !== 'kern' || useEditor.getState().modus !== 'editor') return [];
  let m = blattMerk.get(n.netz);
  if (!m) {
    m = new Map();
    blattMerk.set(n.netz, m);
  }
  const schluessel = `${ansicht}|${blick}`;
  const alt = m.get(schluessel);
  if (alt) return alt;
  const bit = SICHT[blick];
  const P = rd.proRing;
  const out = rd.schleifen.map((s): SchleifeImBlatt => {
    const bits = ringSicht(rd, s, n.netz);
    // Seite: die nahe Hälfte (offen); sonst der ganze Ring (geschlossen)
    const idx = ansicht === 'seite' ? naheHaelfte(rd, s.ring) : [...Array(P).keys(), 0];
    const alle = idx.map((q) => {
      const o = 3 * (s.ring * P + q);
      return inAnsicht2([rd.verlauf[o]!, rd.verlauf[o + 1]!, rd.verlauf[o + 2]!], ansicht);
    });
    const stuecke: SchleifenStueck[] = [];
    let akt: SchleifenStueck | null = null;
    for (let i = 0; i + 1 < idx.length; i++) {
      const sicht = (bits[idx[i]!]! & bit) !== 0 && (bits[idx[i + 1]!]! & bit) !== 0;
      if (!akt || akt.sicht !== sicht) {
        akt = { punkte: [alle[i]!], sicht };
        stuecke.push(akt);
      }
      akt.punkte.push(alle[i + 1]!);
    }
    return { id: s.id, stuecke, alle };
  });
  m.set(schluessel, out);
  return out;
}

/**
 * Loop am nächsten zum Zeiger in einem Blatt (Abstand zur Linie in Blatt-Koordinaten). Dicht gesetzte Loops liegen im Blatt oft
 * nur wenige Pixel auseinander, ihre Trefferlinien überlappen — es zählt die nächste Linie, nicht die zuletzt gezeichnete.
 */
export function schleifeAmZeiger(ansicht: Ansicht, clientX: number, clientY: number): string | null {
  const p = blattLokal(ansicht, clientX, clientY);
  if (!p) return null;
  let best = Infinity;
  let wahl: string | null = null;
  for (const s of schleifenImBlatt(ansicht, blickVon(ansicht, useUi.getState().blick))) {
    for (let i = 0; i + 1 < s.alle.length; i++) {
      const a = s.alle[i]!;
      const b = s.alle[i + 1]!;
      const d = abstandStrecke(p.x, p.y, a.x, a.y, b.x, b.y);
      if (d < best) {
        best = d;
        wahl = s.id;
      }
    }
  }
  return wahl;
}
