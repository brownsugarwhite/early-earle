// Phase 1 / M3: Reifen auf der Bühne — Spanten als Ringe mit Perlen auf dem Körper (Plan 4.2, 9.6). Ein Reifen ist der
// Käfigring, der auf die Station des Spants gerastet ist (Kern: `stationenWaehlen`); seine Perlen sind die Ringpunkte
// der Spant-Knoten. Anzeige, Treffer und Ziehen laufen im Hauptthread aus `WesenNetz.reifen`; jede Änderung geht in
// `dok.spanten` — dieselben Daten, die Front/Back als Kurve zeigen. Perle ziehen = Querschnitt formen (in der Ringebene),
// Band ziehen = Reifen entlang der Achse schieben, ⌃R oder Werkzeug S auf dem Körper = neuer Reifen an der Stelle.

import { type SpantTeil, spantEinfuegen, spantKasten, spantTeilProfil, stelleVon, umwandeln, verschiebeKnoten, weltNachSpant } from '@ee/shape';
import { type WesenNetz, mitTeilProfil } from '@ee/shape/kern';
import { create } from 'zustand';
import { sortieren, spantWaehlen } from '../spanten/SpantEbene';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { aktuellesNetz, reifenAufTeilen, werkzeugGesperrt } from './kernBau';
import { useTreffer } from './treffer';

/** Was unter dem Zeiger liegt: eine Perle (Spant-Knoten, beim Kiefer-Spant mit Teil) oder das Band eines Reifens. */
export type ReifenHover = { reifen: number; knoten: number | null; teil?: SpantTeil } | null;
export const useReifen = create<{ hover: ReifenHover }>(() => ({ hover: null }));

const FARBE_REIFEN: [number, number, number] = [0.541, 0.486, 1];
const FARBE_GEWAEHLT: [number, number, number] = [0.957, 0.945, 0.894];
const FARBE_HOVER: [number, number, number] = [1, 0.18, 0.604];
/** Fangradien in Pixeln */
const FANG_PERLE = 10;
const FANG_BAND = 6;

export type Perle = { reifen: number; spant: number; knoten: number; teil: SpantTeil; j: number; pos: [number, number, number] };

/**
 * Perlen aller Reifen (Welt, skaliert): je Spant-Knoten rechts und gespiegelt links (Achspunkte einmal). Kiefer-Spant
 * (14.10., „zwei Perlenreihen“): Oberkiefer-Knoten über der Lippe, Unterkiefer-Knoten darunter (Teil `unten`).
 */
export function perlenVon(netz: WesenNetz, sk: number): Perle[] {
  const rf = netz.reifen;
  const tr = netz.treffer;
  if (!rf || !tr) return [];
  const { N } = tr.vorlage;
  const out: Perle[] = [];
  rf.liste.forEach((r, ri) => {
    for (const [teil, zeilen] of [
      ['oben', rf.knoten[ri] ?? []],
      ['unten', rf.knotenUnten?.[ri] ?? []],
    ] as const) {
      zeilen.forEach((j, k) => {
        if (j < 0) return;
        for (const jj of j === 0 || j === N / 2 ? [j] : [j, N - j]) {
          const i = r.ring * N + jj;
          out.push({ reifen: ri, spant: r.spant, knoten: k, teil, j: jj, pos: [rf.ringLagen[3 * i]! * sk, rf.ringLagen[3 * i + 1]! * sk, rf.ringLagen[3 * i + 2]! * sk] });
        }
      });
    }
  });
  return out;
}

function reifenFarben(netz: WesenNetz): Float32Array {
  const rf = netz.reifen!;
  const farben = new Float32Array(rf.verlauf.length);
  const auswahl = useUi.getState().spantAuswahl;
  const hover = useReifen.getState().hover;
  rf.liste.forEach((r, i) => {
    const f = auswahl?.spant === r.spant ? FARBE_GEWAEHLT : hover?.reifen === i && hover.knoten === null ? FARBE_HOVER : FARBE_REIFEN;
    for (let k = rf.verlaufStart[i]!; k < rf.verlaufStart[i + 1]!; k += 3) {
      farben[k] = f[0];
      farben[k + 1] = f[1];
      farben[k + 2] = f[2];
    }
  });
  return farben;
}

function perlenZustand(perlen: Perle[]): Uint8Array {
  const auswahl = useUi.getState().spantAuswahl;
  const hover = useReifen.getState().hover;
  return Uint8Array.from(
    perlen.map((p) => (hover && hover.reifen === p.reifen && hover.knoten === p.knoten && (hover.teil ?? 'oben') === p.teil ? 2 : auswahl && auswahl.spant === p.spant && auswahl.knoten.includes(p.knoten) && (auswahl.teil ?? 'oben') === p.teil ? 1 : 0)),
  );
}

/** Reifen und Perlen anzeigen (nach jedem Bau, bei Auswahl und Hover) oder ausblenden (andere Stufe, keine Spanten). */
export function reifenAnzeigen(r: Renderer3D, netz: WesenNetz | null, sk: number): void {
  const ui = useUi.getState();
  const rf = netz?.reifen;
  if (!netz || !rf || ui.ebene !== 'form' || ui.bauweise !== 'kern') {
    r.setzeReifen(null, null);
    r.setzePerlen(null, null);
    return;
  }
  const verlauf = new Float32Array(rf.verlauf.length);
  for (let i = 0; i < verlauf.length; i++) verlauf[i] = rf.verlauf[i]! * sk;
  r.setzeReifen(verlauf, reifenFarben(netz));
  const perlen = perlenVon(netz, sk);
  const lagen = new Float32Array(perlen.length * 3);
  perlen.forEach((p, i) => lagen.set(p.pos, 3 * i));
  r.setzePerlen(lagen, perlenZustand(perlen), netz.hoehe * sk);
}

/** Nur Farben und Perlenzustände auffrischen (Auswahl oder Hover geändert). */
export function reifenFaerben(r: Renderer3D): void {
  const n = aktuellesNetz();
  reifenAnzeigen(r, n?.netz ?? null, n?.skalierung ?? 1);
}

function abstandStrecke(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1e-12;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}

/** Perle oder Band unter dem Zeiger (Feldpixel der Bühne); Perlen haben Vorrang. */
export function reifenUnter(px: number, py: number): ReifenHover {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const rf = n?.netz.reifen;
  if (!r || !n || !rf) return null;
  const perlen = perlenVon(n.netz, n.skalierung);
  const lagen = new Float32Array(perlen.length * 3);
  perlen.forEach((p, i) => lagen.set(p.pos, 3 * i));
  const pp = r.projizierenViele('creation', lagen);
  let best: ReifenHover = null;
  let dBest = FANG_PERLE;
  perlen.forEach((p, i) => {
    if (pp[3 * i + 2]! <= 0) return;
    const d = Math.hypot(pp[3 * i]! - px, pp[3 * i + 1]! - py);
    if (d < dBest) {
      dBest = d;
      best = { reifen: p.reifen, knoten: p.knoten, teil: p.teil };
    }
  });
  if (best) return best;
  const verlauf = new Float32Array(rf.verlauf.length);
  for (let i = 0; i < verlauf.length; i++) verlauf[i] = rf.verlauf[i]! * n.skalierung;
  const vp = r.projizierenViele('creation', verlauf);
  dBest = FANG_BAND;
  for (let i = 0; i < rf.liste.length; i++) {
    for (let k = rf.verlaufStart[i]! / 3; k + 1 < rf.verlaufStart[i + 1]! / 3; k += 2) {
      if (vp[3 * k + 2]! <= 0 || vp[3 * k + 5]! <= 0) continue;
      const d = abstandStrecke(px, py, vp[3 * k]!, vp[3 * k + 1]!, vp[3 * k + 3]!, vp[3 * k + 4]!);
      if (d < dBest) {
        dBest = d;
        best = { reifen: i, knoten: null };
      }
    }
  }
  return best;
}

type V3 = [number, number, number];

function schnittMitEbene(strahl: { o: V3; d: V3 } | null, mitte: V3, normale: V3): V3 | null {
  if (!strahl) return null;
  const nenner = strahl.d[0] * normale[0] + strahl.d[1] * normale[1] + strahl.d[2] * normale[2];
  if (Math.abs(nenner) < 1e-9) return null;
  const t = ((mitte[0] - strahl.o[0]) * normale[0] + (mitte[1] - strahl.o[1]) * normale[1] + (mitte[2] - strahl.o[2]) * normale[2]) / nenner;
  if (t < 0) return null;
  return [strahl.o[0] + strahl.d[0] * t, strahl.o[1] + strahl.d[1] * t, strahl.o[2] + strahl.d[2] * t];
}

/** Ringebene eines Reifens: Mitte und Normale aus den posierten Ringlagen (Welt, skaliert). */
function ringEbene(netz: WesenNetz, sk: number, reifen: number): { mitte: V3; normale: V3 } {
  const rf = netz.reifen!;
  const { N } = netz.treffer!.vorlage;
  const ring = rf.liste[reifen]!.ring;
  const p = (j: number): V3 => {
    const i = ring * N + (j % N);
    return [rf.ringLagen[3 * i]! * sk, rf.ringLagen[3 * i + 1]! * sk, rf.ringLagen[3 * i + 2]! * sk];
  };
  const mitte: V3 = [0, 0, 0];
  for (let j = 0; j < N; j++) {
    const q = p(j);
    mitte[0] += q[0] / N;
    mitte[1] += q[1] / N;
    mitte[2] += q[2] / N;
  }
  const n: V3 = [0, 0, 0];
  for (let j = 0; j < N; j++) {
    const a = p(j);
    const b = p(j + 1);
    const ax = a[0] - mitte[0];
    const ay = a[1] - mitte[1];
    const az = a[2] - mitte[2];
    const bx = b[0] - mitte[0];
    const by = b[1] - mitte[1];
    const bz = b[2] - mitte[2];
    n[0] += ay * bz - az * by;
    n[1] += az * bx - ax * bz;
    n[2] += ax * by - ay * bx;
  }
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return { mitte, normale: [n[0] / l, n[1] / l, n[2] / l] };
}

function ziehen(e: React.PointerEvent, el: HTMLElement, bewegen: (ev: PointerEvent) => void, ende: () => void): void {
  el.setPointerCapture(e.pointerId);
  const auf = () => {
    window.removeEventListener('pointermove', bewegen);
    window.removeEventListener('pointerup', auf);
    window.removeEventListener('pointercancel', auf);
    ende();
  };
  window.addEventListener('pointermove', bewegen);
  window.addEventListener('pointerup', auf);
  window.addEventListener('pointercancel', auf);
}

/**
 * Zeiger auf der Bühne (linke Taste, Stufe Körper): fasst eine Perle oder ein Band und zieht es; true = Geste läuft.
 * Perle: der Spant-Knoten folgt dem Zeiger in der Ringebene (Front-Koordinaten: Breite |z|, Höhe y, normiert auf den
 * Kasten des Spants); Band: die Stelle f folgt dem x des Zeigers in der Ebene durch die Ringmitte, die zur Kamera zeigt.
 */
export function reifenZeiger(e: React.PointerEvent, px: number, py: number, el: HTMLElement): boolean {
  const h = reifenUnter(px, py);
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (!h || !r || !n?.netz.reifen) return false;
  // B7: Perlen der Vorschau liegen nicht, wo die Grundform sie hat
  if (werkzeugGesperrt()) return true;
  const reifen = n.netz.reifen.liste[h.reifen]!;
  const ed = useEditor.getState();
  const sp = ed.dok.spanten?.[reifen.spant];
  if (!sp) return false;
  const sk = n.skalierung;
  const rr = el.getBoundingClientRect();
  const spanten = () => useEditor.getState().dok.spanten ?? [];
  const teil: SpantTeil = h.teil ?? 'oben';
  // ⌥-Klick auf eine Perle: Ecke ↔ glatt (wie der Stift mit ⌥ in Front/Back), ein Undo-Schritt
  if (e.altKey) {
    if (h.knoten === null) return false;
    const liste = spanten().slice();
    liste[reifen.spant] = mitTeilProfil(sp, teil, umwandeln(spantTeilProfil(sp, teil), h.knoten));
    ed.setzeSpanten(liste);
    spantWaehlen(reifen.spant, [h.knoten], teil);
    return true;
  }
  const { mitte, normale } = ringEbene(n.netz, sk, h.reifen);
  if (h.knoten !== null) {
    const knoten = h.knoten;
    spantWaehlen(reifen.spant, [knoten], teil);
    const kasten = spantKasten(ed.dok, sp.f);
    const basis = spantTeilProfil(sp, teil);
    const start = schnittMitEbene(r.strahlFuer('creation', px, py), mitte, normale);
    if (!start) return false;
    const p0 = weltNachSpant(kasten, { x: Math.abs(start[2]) / sk, y: start[1] / sk });
    ed.beginGeste();
    ziehen(
      e,
      el,
      (ev) => {
        const hit = schnittMitEbene(r.strahlFuer('creation', ev.clientX - rr.left, ev.clientY - rr.top), mitte, normale);
        if (!hit) return;
        const pn = weltNachSpant(kasten, { x: Math.abs(hit[2]) / sk, y: hit[1] / sk });
        const liste = spanten().slice();
        const jetzt = liste[reifen.spant];
        if (!jetzt) return;
        liste[reifen.spant] = mitTeilProfil(jetzt, teil, verschiebeKnoten(basis, [knoten], { x: pn.x - p0.x, y: pn.y - p0.y }));
        useEditor.getState().setzeSpanten(liste);
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }
  // Band: Ebene durch die Ringmitte, die die Achse (x) enthält und zur Kamera zeigt
  spantWaehlen(reifen.spant);
  const blick = r.blickrichtung('creation') ?? [0, 0, 1];
  let en: V3 = [0, blick[1], blick[2]];
  const l = Math.hypot(en[1], en[2]);
  en = l > 1e-6 ? [0, en[1] / l, en[2] / l] : [0, 0, 1];
  ed.beginGeste();
  ziehen(
    e,
    el,
    (ev) => {
      const hit = schnittMitEbene(r.strahlFuer('creation', ev.clientX - rr.left, ev.clientY - rr.top), mitte, en);
      if (!hit) return;
      const dok = useEditor.getState().dok;
      const f = Math.min(0.98, Math.max(0.02, stelleVon(dok, hit[0] / sk)));
      const liste = spanten().slice();
      const jetzt = liste[reifen.spant];
      if (!jetzt) return;
      liste[reifen.spant] = { ...jetzt, f };
      useEditor.getState().setzeSpanten(liste);
    },
    () => {
      sortieren(reifen.spant);
      useEditor.getState().endeGeste();
    },
  );
  return true;
}

/** Neuer Reifen an der Stelle x (Profil-Einheiten): Spant aus der Fläche (formneutral), gewählt. */
export function reifenNeuBei(x: number): boolean {
  if (reifenAufTeilen()) return true;
  const ed = useEditor.getState();
  const f = stelleVon(ed.dok, x);
  if (f <= 0.01 || f >= 0.99) {
    useUi.getState().zeigeHinweis('Reifen liegen innerhalb des Körpers');
    return false;
  }
  const r = spantEinfuegen(ed.dok, f);
  ed.setzeSpanten(r.spanten);
  spantWaehlen(r.index);
  return true;
}

/** Neuer Reifen am Treffer unter dem Zeiger (Feldpixel der Bühne). */
export function reifenNeu(px: number, py: number): boolean {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (!r || !n) return false;
  const t = r.treffen('creation', px, py);
  if (!t) return false;
  return reifenNeuBei(t.punkt[0] / n.skalierung);
}

/** ⌃R: neuer Reifen am zuletzt getroffenen Punkt der Bühne (Hover). */
export function reifenNeuAmZeiger(): boolean {
  const t = useTreffer.getState();
  const n = aktuellesNetz();
  if (t.feld !== 'creation' || !t.treffer || !n) return false;
  return reifenNeuBei(t.treffer.punkt[0] / n.skalierung);
}
