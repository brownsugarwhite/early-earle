// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.2: Loops mit ⌘R wie Blenders „Loop Cut and Slide“. Über der
// Bühne (oder dem Seitenblatt) zeigt eine gelbe Vorschau den Loop quer zur Längsrichtung zwischen den beiden Ringen unter dem
// Zeiger; Mausrad, Bild↑/↓ oder eine Ziffer ändern die Anzahl (1–16). Mehrere Loops setzt der Klick gleichmäßig verteilt.
// Ein Loop: Der Klick legt das Ringpaar fest, danach gleitet der Loop mit der Maus zwischen den beiden Ringen, der zweite
// Klick (oder Enter) setzt ihn ab; Rechtsklick/Esc setzt ihn in die Mitte. Vor dem ersten Klick bricht Esc/Rechtsklick ab.
// Ein Undo-Schritt. Gerechnet wird mit den Ringdaten des Netzes (`netz.ringe`): Ort aus dem Gerüst, eingefügt im Kern
// (`schleifenEinfuegen`: Knoten formneutral in Seite und Top, ein Käfigring je Loop, Pinsel/Posen/Augen rücken mit).

import type { V2 } from '@ee/shape';
import { type RingDaten, ortImGeruest, ringSprosse, schleifenEinfuegen } from '@ee/shape/kern';
import { useEffect } from 'react';
import { create } from 'zustand';
import { blattLokal, zeiger } from '../editing/modal/zeiger';
import { modalAktiv } from '../editing/modal/modal';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { szene } from '../three/instanz';
import { istTrackpad } from '../viewports/ansicht2d';
import { aktuellesNetz } from './netzStand';
import { trefferDeuten } from './treffer';

/** Trackpad: so viele Pixel Rad ergeben einen Schritt der Anzahl */
const RAD_SCHRITT = 40;
const MAX_ANZAHL = 16;
/** beim Gleiten bleibt der Loop so weit von seinen Nachbarringen weg (Anteil des Abstands) */
const RAND = 0.05;

/** Laufende Operation: Ringpaar k − 1 | k (0 = nichts unter dem Zeiger), Anteil s dazwischen, Anzahl, Gleiten. */
type Lauf = { k: number; s: number; n: number; gleiten: boolean; radSumme: number };
let lauf: Lauf | null = null;
/** Kontextmenü bis dahin schlucken (macOS meldet es beim Drücken der rechten Taste) */
let kontextBis = 0;

/** Vorschau für die Blätter: Sprossen der geplanten Loops (Seitenansicht, Profil-Einheiten), x je Loop für das Top. */
export const useSchleifenVorschau = create<{ sprossen: { o: V2; u: V2 }[] | null; text: string | null; gleiten: boolean }>(() => ({ sprossen: null, text: null, gleiten: false }));

export const schleifenAktiv = () => lauf !== null;

/** Für Prüfskripte: Zustand der Operation. */
export const schleifenMessung = { lauf: () => (lauf ? { ...lauf } : null) };

function ringDaten(): { r: RingDaten; sk: number } | null {
  const n = aktuellesNetz();
  return n?.netz.ringe ? { r: n.netz.ringe, sk: n.skalierung } : null;
}

/** Ringpaar und Anteil unter dem Zeiger auf der Bühne: Käfigfläche des Treffers, Ringnummer ihrer Ecken bilinear gemischt. */
function ortAufBuehne(cx: number, cy: number): { k: number; s: number } | null {
  const el = document.querySelector<HTMLElement>('.vp-ober[data-view="creation"] .steuerung3d');
  const r = szene.aktuell;
  const n = aktuellesNetz();
  if (!el || !r || !n?.netz.ringe) return null;
  const b = el.getBoundingClientRect();
  if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) return null;
  const t = r.treffen('creation', cx - b.left, cy - b.top);
  if (!t) return null;
  const d = trefferDeuten(n.netz, t.dreieck, t.punkt, n.skalierung);
  const tr = n.netz.treffer;
  if (!d || d.flaeche < 0 || !tr) return null;
  const { R, N } = n.netz.ringe;
  const a = tr.kaefig.fStart[d.flaeche]!;
  const e = tr.kaefig.fStart[d.flaeche + 1]!;
  if (e - a !== 4) return null;
  const w = [(1 - d.u) * (1 - d.v), d.u * (1 - d.v), d.u * d.v, (1 - d.u) * d.v];
  let ring = 0;
  let lo = Infinity;
  for (let i = 0; i < 4; i++) {
    const q = tr.kaefig.fVerts[a + i]!;
    // Kappen haben keine Ringe dazwischen
    if (q >= R * N) return null;
    const ri = Math.floor(q / N);
    ring += w[i]! * ri;
    lo = Math.min(lo, ri);
  }
  return { k: lo + 1, s: Math.min(1 - RAND, Math.max(RAND, ring - lo)) };
}

/** Ringpaar und Anteil unter dem Zeiger im Seitenblatt: Lage längs der Sprossenmitten. */
function ortImSeitenblatt(cx: number, cy: number): { k: number; s: number } | null {
  const ui = useUi.getState();
  if (ui.hover !== 'seite') return null;
  const p = blattLokal('seite', cx, cy);
  const rd = ringDaten();
  if (!p || !rd) return null;
  const R = rd.r.stationen.length / 2;
  const mitten: V2[] = [];
  for (let i = 0; i < R; i++) {
    const sp = ringSprosse(rd.r, i);
    mitten.push({ x: (sp.o.x + sp.u.x) / 2, y: (sp.o.y + sp.u.y) / 2 });
  }
  let best = Infinity;
  let wahl: { k: number; s: number } | null = null;
  for (let k = 1; k < R; k++) {
    const a = mitten[k - 1]!;
    const b = mitten[k]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l2 = ex * ex + ey * ey;
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2)) : 0.5;
    const dd = Math.hypot(a.x + t * ex - p.x, a.y + t * ey - p.y);
    if (dd < best) {
      best = dd;
      wahl = { k, s: Math.min(1 - RAND, Math.max(RAND, t)) };
    }
  }
  return wahl;
}

function ortUnterZeiger(cx: number, cy: number): { k: number; s: number } | null {
  return ortAufBuehne(cx, cy) ?? ortImSeitenblatt(cx, cy);
}

/** Anteile der geplanten Loops: einer bei s, mehrere gleichmäßig. */
const anteile = (l: Lauf) => (l.n === 1 ? [l.s] : Array.from({ length: l.n }, (_, i) => (i + 1) / (l.n + 1)));

function anzeigen(): void {
  const l = lauf;
  const r = szene.aktuell;
  const rd = ringDaten();
  if (!l || !rd || l.k < 1) {
    r?.setzeSchleifenVorschau(null);
    useSchleifenVorschau.setState({ sprossen: null, text: l ? statusText(l) : null, gleiten: !!l?.gleiten });
    return;
  }
  const { r: g, sk } = rd;
  const P = g.proRing;
  const segs: number[] = [];
  const sprossen: { o: V2; u: V2 }[] = [];
  for (const s of anteile(l)) {
    const a = 3 * (l.k - 1) * P;
    const b = 3 * l.k * P;
    for (let q = 0; q < P; q++) {
      const q2 = (q + 1) % P;
      for (const qq of [q, q2]) for (let c = 0; c < 3; c++) segs.push((g.verlauf[a + 3 * qq + c]! * (1 - s) + g.verlauf[b + 3 * qq + c]! * s) * sk);
    }
    const o = ortImGeruest(g, l.k, s, false);
    if (o) sprossen.push({ o: o.o, u: o.u });
  }
  r?.setzeSchleifenVorschau(Float32Array.from(segs));
  useSchleifenVorschau.setState({ sprossen, text: statusText(l), gleiten: l.gleiten });
}

function statusText(l: Lauf): string {
  if (l.k < 1) return `⌘R: Zeiger auf den Körper (Bühne oder Seite) · ${l.n} Loop${l.n > 1 ? 's' : ''}`;
  if (l.gleiten) return `Loop gleitet: ${Math.round(l.s * 100)} % zwischen Ring ${l.k} und ${l.k + 1}`;
  return `${l.n} Loop${l.n > 1 ? 's' : ''} zwischen Ring ${l.k} und ${l.k + 1}`;
}

/**
 * ⌘R starten (Bühne oder Seitenblatt). Liefert false, wenn es hier nicht geht (dann ein Hinweis): außerhalb der Stufe Körper,
 * in einer Pose, während einer anderen Geste, ohne Netz oder auf einem Körper ohne Loop-Ringe (Maul, Beine, Teile).
 */
export function schleifenStarten(): boolean {
  if (lauf || modalAktiv()) return false;
  const ui = useUi.getState();
  const ed = useEditor.getState();
  if (ui.ebene !== 'form' || ui.bauweise !== 'kern' || ed.gesteStart || ui.dialog || ui.menue) return false;
  if (ed.modus !== 'editor') {
    ui.zeigeHinweis('Loops gehören zur Grundform: im Editor-Tab einziehen');
    return true;
  }
  const rd = ringDaten();
  if (!rd) {
    ui.zeigeHinweis('Loops gehen bisher auf dem Körper „Röhre“');
    return true;
  }
  if (!rd.r.aktiv) {
    ui.zeigeHinweis('Loops gehen bisher auf dem Körper ohne Maul und Beine');
    return true;
  }
  lauf = { k: 0, s: 0.5, n: 1, gleiten: false, radSumme: 0 };
  if (zeiger.bekannt) {
    const o = ortUnterZeiger(zeiger.x, zeiger.y);
    if (o) Object.assign(lauf, o);
  }
  if (lauf.k < 1) ui.zeigeHinweis('⌘R: Zeiger auf den Körper (Bühne oder Seite) — Esc bricht ab');
  anmelden();
  anzeigen();
  return true;
}

/** Loops einfügen (ein Undo-Schritt) und beenden. */
function setzen(s?: number): void {
  const l = lauf;
  if (!l) return;
  const rd = ringDaten();
  beenden();
  if (!rd || l.k < 1) return;
  const ed = useEditor.getState();
  const r = schleifenEinfuegen(ed.dok, rd.r, l.k, l.n, s ?? l.s, rd.r.aktiv);
  if (!r) {
    useUi.getState().zeigeHinweis('Der Loop trifft den Umriss hier nicht an zwei Stellen');
    return;
  }
  ed.setzeDokument(r.dok);
  useUi.getState().zeigeHinweis(`${r.ids.length} Loop${r.ids.length > 1 ? 's' : ''} eingezogen (⌘Z nimmt ${r.ids.length > 1 ? 'sie' : 'ihn'} zurück)`);
}

/** Abbrechen: nichts ändert sich. */
export function schleifenAbbrechen(): void {
  if (!lauf) return;
  beenden();
}

function beenden(): void {
  abmelden();
  lauf = null;
  szene.aktuell?.setzeSchleifenVorschau(null);
  useSchleifenVorschau.setState({ sprossen: null, text: null, gleiten: false });
}

function anzahlSchritt(d: number): void {
  const l = lauf;
  if (!l || l.gleiten) return;
  l.n = Math.min(MAX_ANZAHL, Math.max(1, l.n + d));
  anzeigen();
}

// ---------- Ereignisse (Erfassungsphase am Fenster: kein Zoom, kein Drehen, keine Werkzeugtasten) ----------

function taste(e: KeyboardEvent): void {
  const l = lauf;
  if (!l || ['Shift', 'Alt', 'Meta', 'Control', 'CapsLock', 'Fn'].includes(e.key)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const cmd = e.metaKey || e.ctrlKey;
  if (cmd && e.key.toLowerCase() === 'z') return schleifenAbbrechen();
  if (e.key === 'Escape') return l.gleiten ? setzen(0.5) : schleifenAbbrechen();
  if (e.key === 'Enter') return setzen();
  if (e.key === 'PageUp' || e.key === '+') return anzahlSchritt(1);
  if (e.key === 'PageDown' || e.key === '-') return anzahlSchritt(-1);
  if (/^[1-9]$/.test(e.key) && !l.gleiten) {
    l.n = Number(e.key);
    anzeigen();
  }
}

function bewegen(e: PointerEvent): void {
  const l = lauf;
  if (!l) return;
  const o = ortUnterZeiger(e.clientX, e.clientY);
  if (l.gleiten) {
    // zwischen den beiden festgelegten Ringen: weiter vorn bzw. hinten heißt an den Rand
    if (o) l.s = o.k === l.k ? o.s : o.k < l.k ? RAND : 1 - RAND;
  } else if (o) {
    l.k = o.k;
    l.s = o.s;
  } else l.k = 0;
  anzeigen();
}

function runter(e: PointerEvent): void {
  const l = lauf;
  if (!l) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.button === 2) {
    kontextBis = performance.now() + 1500;
    return l.gleiten ? setzen(0.5) : schleifenAbbrechen();
  }
  if (e.button !== 0) return;
  if (l.k < 1) return;
  if (l.n > 1 || l.gleiten) return setzen();
  l.gleiten = true;
  anzeigen();
}

function schlucken(e: Event): void {
  if (!lauf) return;
  e.preventDefault();
  e.stopImmediatePropagation();
}

function rad(e: WheelEvent): void {
  const l = lauf;
  if (!l) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  // Mausrad: eine Raste je Ereignis; Trackpad: gesammelt (rauf = mehr, wie Blender)
  if (istTrackpad(e)) {
    l.radSumme += e.deltaY;
    while (Math.abs(l.radSumme) >= RAD_SCHRITT) {
      const s = Math.sign(l.radSumme);
      l.radSumme -= s * RAD_SCHRITT;
      anzahlSchritt(-s);
    }
  } else anzahlSchritt(e.deltaY < 0 ? 1 : -1);
}

const fokusWeg = () => schleifenAbbrechen();

function anmelden(): void {
  window.addEventListener('keydown', taste, true);
  window.addEventListener('pointermove', bewegen, true);
  window.addEventListener('pointerdown', runter, true);
  window.addEventListener('pointerup', schlucken, true);
  window.addEventListener('wheel', rad, { capture: true, passive: false });
  window.addEventListener('blur', fokusWeg);
}

function abmelden(): void {
  window.removeEventListener('keydown', taste, true);
  window.removeEventListener('pointermove', bewegen, true);
  window.removeEventListener('pointerdown', runter, true);
  window.removeEventListener('pointerup', schlucken, true);
  window.removeEventListener('wheel', rad, { capture: true });
  window.removeEventListener('blur', fokusWeg);
}

/** Dauerhaft: das Kontextmenü während ⌘R und kurz nach einem Rechtsklick schlucken. */
export function useSchleifenKontext() {
  useEffect(() => {
    const kontext = (e: MouseEvent) => {
      if (lauf || performance.now() < kontextBis) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('contextmenu', kontext, true);
    return () => window.removeEventListener('contextmenu', kontext, true);
  }, []);
}
