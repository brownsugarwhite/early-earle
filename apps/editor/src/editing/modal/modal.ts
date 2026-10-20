// Plan 20.10., V3: G/S/R in den Blättern wie in Blender. Nach der Taste folgt die Auswahl dem Zeiger (ohne Maustaste),
// gerechnet in dem Blatt, in dem die Operation begann, jede Bewegung vom Anfang aus. X/Y/Z sperren, Zahlen geben den Wert,
// Enter/Linksklick bestätigt (ein Undo-Schritt), Esc/Rechtsklick/⌘Z/Fokusverlust bricht ab (Dokument und Auswahl wie
// vorher). Mit O proportional; Mausrad, [ ] und Bild↑/↓ ändern den Einflussradius. Während der Operation fangen
// Fenster-Listener in der Erfassungsphase alle Tasten, Klicks und das Rad ab (kein Zoom, kein Tab, keine Werkzeugtasten).
// Ein Knotenzug mit der Maus läuft mit O als G mit gedrückter Taste (`ziehen`): Loslassen bestätigt.

import type { Ansicht, V2 } from '@ee/shape';
import { useEffect } from 'react';
import { aktuellesNetz } from '../../kern/netzStand';
import { useEditor } from '../../state/editorStore';
import { type KantenAuswahl, type SpantAuswahl, blickVon, useUi } from '../../state/uiStore';
import { istTrackpad } from '../../viewports/ansicht2d';
import { type Abb, type Art, type KnotenGewicht, type Sperre, ABFAELLE, abbildungAus, gewichte, kurvenAbbilden, skalierFaktor, winkelSchritt, zahlLesen, zahlTaste } from './abbildung';
import { blattLokal, blattSvg, zeiger } from './zeiger';
import { type ModalZiel, type ZielArt, gemeinsameAchse, zielFuer } from './ziele';

/** px je Kachel (Vertrag aller Messungen, wie Δ und Saum) */
const PX = 461;
/** Trackpad: so viele Pixel Rad ergeben einen Schritt des Radius */
const RAD_SCHRITT = 40;
const BLAETTER = new Set(['seite', 'front', 'top']);
const MODIFIKATOREN = new Set(['Shift', 'Alt', 'Meta', 'Control', 'CapsLock', 'Fn']);
const ABFALL_NAME = { glatt: 'glatt', kugel: 'Kugel', wurzel: 'Wurzel', spitz: 'spitz', linear: 'linear', konstant: 'konstant' } as const;

type Lauf = {
  art: Art;
  ansicht: Ansicht;
  ziel: ModalZiel;
  /** Zeiger am Anfang, zuletzt und jetzt (Blatt-Koordinaten) */
  start: V2;
  vorher: V2;
  jetzt: V2;
  /** R: aufsummierter Winkel aus dem Zeiger (Bogenmaß) */
  winkel: number;
  sperre: Sperre | null;
  zahl: string;
  /** mit gedrückter Maustaste begonnen (Knotenzug): Loslassen bestätigt */
  ziehen: boolean;
  gewichte: KnotenGewicht[][];
  radius: number;
  radSumme: number;
  /** Auswahl am Anfang (Abbrechen stellt sie wieder her) */
  ui0: { auswahl: Record<Ansicht, number[]>; aktiv: Ansicht | null; kantenAuswahl: KantenAuswahl | null; spantAuswahl: SpantAuswahl | null };
};
let lauf: Lauf | null = null;
/** Kontextmenü bis dahin schlucken (macOS meldet es beim Drücken der rechten Taste, nach dem Abbrechen) */
let kontextBis = 0;

/** Messung für die Prüfskripte: Zeit je Mausbewegung (Rechnung + Store, ohne Zeichnen). */
export const modalMessung = {
  zuege: 0,
  max: 0,
  letzte: 0,
  aktiv: () => lauf !== null,
  ziel: () => lauf?.ziel.art ?? null,
  art: () => lauf?.art ?? null,
  zuruecksetzen() {
    this.zuege = 0;
    this.max = 0;
    this.letzte = 0;
  },
};

export const modalAktiv = () => lauf !== null;

/** Einflussradius in Profil-Einheiten: Anteil der Körperhöhe wie der Pinsel (eine Größe für Pinsel und Knoten). */
export function einflussRadius(): number {
  let h = aktuellesNetz()?.netz.hoehe ?? 0;
  if (!(h > 0)) {
    const ys = useEditor.getState().dok.profile.seite.knoten.map((k) => k.p.y);
    h = Math.max(...ys) - Math.min(...ys);
  }
  return useUi.getState().pinselRadius * h;
}

const zahlText = (x: number, stellen: number) => x.toFixed(stellen).replace('.', ',').replace(/^-(0,0*)$/, '$1');
const gespiegelt = (ansicht: Ansicht) => {
  const b = blickVon(ansicht, useUi.getState().blick);
  return b === 'hinten' || b === 'unten';
};

/** Blatt für eine Taste: das Blatt unter dem Zeiger; über der Bühne keins; außerhalb aller Felder das zuletzt bearbeitete. */
function tastenBlatt(): Ansicht | null {
  const ui = useUi.getState();
  if (ui.hover && BLAETTER.has(ui.hover)) return ui.hover as Ansicht;
  return ui.hover === null ? ui.aktiv : null;
}

/**
 * G, S oder R starten. Liefert false, wenn im Blatt nichts gewählt ist (dann gilt die alte Belegung: G Pinsel, S Spant),
 * außerhalb der Stufe Körper, in einer Pose oder während einer anderen Geste.
 */
export function modalStarten(art: Art, opt: { ansicht?: Ansicht; ziehen?: { clientX: number; clientY: number; ziel?: ZielArt } } = {}): boolean {
  if (lauf) return false;
  const ui = useUi.getState();
  const ed = useEditor.getState();
  if (ed.gesteStart || ui.ebene !== 'form' || ed.modus !== 'editor' || ui.maulZeichnen || ui.kanteZeichnen || ui.wirbelZeichnen || ui.dialog || ui.menue) return false;
  const ansicht = opt.ansicht ?? tastenBlatt();
  if (!ansicht) return false;
  const ziel = zielFuer(ansicht, opt.ziehen?.ziel);
  if (!ziel) return false;
  if (art === 'r' && !ziel.drehen) {
    ui.zeigeHinweis(`R dreht nur in der eigenen Ansicht eines Punkts — fremde Ringe bewegen G und S (entlang ${gemeinsameAchse(ansicht) ?? 'der gemeinsamen Achse'})`);
    return true;
  }
  const client = opt.ziehen ? { x: opt.ziehen.clientX, y: opt.ziehen.clientY } : zeiger.bekannt ? { x: zeiger.x, y: zeiger.y } : null;
  const start = (client && blattLokal(ansicht, client.x, client.y)) ?? { x: ziel.mitteBlatt.x + 0.1, y: ziel.mitteBlatt.y };
  lauf = {
    art,
    ansicht,
    ziel,
    start,
    vorher: start,
    jetzt: start,
    winkel: 0,
    sperre: null,
    zahl: '',
    ziehen: !!opt.ziehen,
    gewichte: [],
    radius: 0,
    radSumme: 0,
    ui0: { auswahl: ui.auswahl, aktiv: ui.aktiv, kantenAuswahl: ui.kantenAuswahl, spantAuswahl: ui.spantAuswahl },
  };
  gewichteNeu();
  ed.beginGeste();
  anmelden();
  anzeigen();
  return true;
}

function gewichteNeu(): void {
  const l = lauf;
  if (!l) return;
  const p = useUi.getState().proportional;
  l.radius = p.an ? einflussRadius() : 0;
  l.gewichte = gewichte(l.ziel.kurven, { an: p.an, abfall: p.abfall, radius: l.radius, verbunden: p.verbunden });
}

/** Abbildung aus Zeiger bzw. Zahl, mit dem Wert für die Anzeige. */
function abbildung(l: Lauf): { abb: Abb; wert: string } {
  const freiB = l.ziel.freiBlatt(l.sperre);
  const frei = l.ziel.freiArbeit(l.sperre) ?? { u: false, v: false };
  const n = zahlLesen(l.zahl);
  const mitZahl = Number.isFinite(n);
  if (l.art === 'g') {
    const sk = useEditor.getState().dok.skalierung;
    let d: V2;
    if (mitZahl) {
      // ohne Sperre waagerecht im Blatt, sonst entlang der einen freien Richtung
      const b = n / (PX * sk);
      d = freiB && !freiB.u && freiB.v ? { x: 0, y: b } : { x: b, y: 0 };
    } else d = { x: l.jetzt.x - l.start.x, y: l.jetzt.y - l.start.y };
    if (freiB) d = { x: freiB.u ? d.x : 0, y: freiB.v ? d.y : 0 };
    const nur = freiB && freiB.u !== freiB.v ? (freiB.u ? d.x : d.y) : null;
    const wert = nur !== null ? `${zahlText(nur * PX * sk, 1)} px` : `${zahlText(d.x * PX * sk, 1)} | ${zahlText(d.y * PX * sk, 1)} px`;
    return { abb: abbildungAus({ art: 'g', c: l.ziel.mitte, frei, versatz: l.ziel.versatz(d) }), wert };
  }
  if (l.art === 's') {
    const f = mitZahl ? n : skalierFaktor(l.ziel.mitteBlatt, l.start, l.jetzt);
    return { abb: abbildungAus({ art: 's', c: l.ziel.mitte, frei, faktor: f }), wert: zahlText(f, 3) };
  }
  // R: positiv = gegen den Uhrzeigersinn, wie man das Blatt sieht (Back und Bottom sind gespiegelt)
  const sp = gespiegelt(l.ansicht) ? -1 : 1;
  const theta = mitZahl ? (sp * n * Math.PI) / 180 : l.winkel;
  return { abb: abbildungAus({ art: 'r', c: l.ziel.mitte, frei, winkel: theta }), wert: `${zahlText((sp * theta * 180) / Math.PI, 1)}°` };
}

function anzeigen(wert?: string): void {
  const l = lauf;
  if (!l) return;
  const ui = useUi.getState();
  const p = ui.proportional;
  const sperre = l.sperre ? `${l.sperre.ohne ? '⇧' : ''}${l.sperre.achse.toUpperCase()}` : null;
  const teile = [{ g: 'G', s: 'S', r: 'R' }[l.art], ...(sperre ? [sperre] : []), l.zahl ? `${l.zahl.replace('.', ',')}▏` : (wert ?? '–')];
  if (p.an) teile.push(`proportional ${ABFALL_NAME[p.abfall]}${p.verbunden ? ', verbunden' : ''}`);
  ui.setzeModal({ art: l.art, ansicht: l.ansicht, mitte: l.ziel.mitteBlatt, zeiger: l.jetzt, sperre: l.sperre, frei: l.ziel.freiBlatt(l.sperre), radius: l.radius, text: teile.join(' · ') });
}

/** Neu rechnen und übernehmen (vom Anfang aus). */
function aktualisieren(): void {
  const l = lauf;
  if (!l) return;
  const t0 = performance.now();
  const { abb, wert } = abbildung(l);
  l.ziel.setzen(kurvenAbbilden(abb, l.ziel.kurven.map((k) => k.knoten), l.gewichte));
  const dt = performance.now() - t0;
  modalMessung.zuege++;
  modalMessung.letzte = dt;
  modalMessung.max = Math.max(modalMessung.max, dt);
  anzeigen(wert);
}

/** Bestätigen: ein Undo-Schritt (danach „Formen folgen“ wie nach einem Zug). */
export function modalBestaetigen(): void {
  if (!lauf) return;
  abmelden();
  lauf = null;
  useUi.getState().setzeModal(null);
  useEditor.getState().endeGeste();
}

/** Abbrechen: Dokument und Auswahl wie vor der Operation (auch die von der Kopplung eingefügten Punkte sind weg). */
export function modalAbbrechen(): void {
  const l = lauf;
  if (!l) return;
  abmelden();
  lauf = null;
  useUi.getState().setzeModal(null);
  useEditor.getState().abbrechenGeste();
  useUi.setState({ auswahl: l.ui0.auswahl, aktiv: l.ui0.aktiv, kantenAuswahl: l.ui0.kantenAuswahl, spantAuswahl: l.ui0.spantAuswahl });
}

/** O an/aus, ⇧O Abfall weiterschalten, ⌥O „nur verbunden“ (auch außerhalb einer Operation). */
export function proportionalTaste(e: { shiftKey: boolean; altKey: boolean }): void {
  const ui = useUi.getState();
  const p = ui.proportional;
  if (e.altKey) {
    ui.setzeProportional({ verbunden: !p.verbunden });
    ui.zeigeHinweis(`Proportional: ${!p.verbunden ? 'nur verbunden (längs der Kurve)' : 'Luftlinie'}`);
  } else if (e.shiftKey) {
    const abfall = ABFAELLE[(ABFAELLE.indexOf(p.abfall) + 1) % ABFAELLE.length]!;
    ui.setzeProportional({ abfall });
    ui.zeigeHinweis(`Proportional: Abfall ${ABFALL_NAME[abfall]}`);
  } else {
    ui.setzeProportional({ an: !p.an });
    ui.zeigeHinweis(`Proportional ${!p.an ? 'an (Mausrad, [ ] ändern den Einfluss)' : 'aus'}`);
  }
}

/** Einflussradius ändern (Rad, [ ], Bild↑/↓): ×1,1 je Schritt, derselbe Radius wie der Pinsel. */
function radiusSchritt(richtung: number): void {
  const ui = useUi.getState();
  ui.setzePinselRadius(ui.pinselRadius * (richtung > 0 ? 1.1 : 1 / 1.1));
}

function sperreSetzen(achse: 'x' | 'y' | 'z', ohne: boolean): void {
  const l = lauf;
  if (!l) return;
  const ui = useUi.getState();
  if (l.art === 'r') {
    ui.zeigeHinweis('R dreht im Blatt immer um die Blickachse');
    return;
  }
  const neu = l.sperre && l.sperre.achse === achse && l.sperre.ohne === ohne ? null : { achse, ohne };
  if (neu && !l.ziel.freiBlatt(neu)) {
    ui.zeigeHinweis(l.ziel.art === 'fremd' ? `Fremde Ringe bewegen sich nur entlang ${gemeinsameAchse(l.ansicht) ?? 'der gemeinsamen Achse'}` : `${achse.toUpperCase()} steht quer zu diesem Blatt`);
    return;
  }
  l.sperre = neu;
}

function artWechseln(art: Art): void {
  const l = lauf;
  if (!l || art === l.art) return;
  if (art === 'r' && !l.ziel.drehen) {
    useUi.getState().zeigeHinweis('R dreht nur in der eigenen Ansicht eines Punkts');
    return;
  }
  // vom Anfang aus, die neue Art beginnt am Zeiger
  l.art = art;
  l.start = l.jetzt;
  l.vorher = l.jetzt;
  l.winkel = 0;
  l.zahl = '';
  if (art === 'r') l.sperre = null;
}

// ---------- Ereignisse (Erfassungsphase am Fenster) ----------

function taste(e: KeyboardEvent): void {
  const l = lauf;
  if (!l || MODIFIKATOREN.has(e.key)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const cmd = e.metaKey || e.ctrlKey;
  const k = e.key.toLowerCase();
  if (e.key === 'Escape' || (cmd && k === 'z')) return modalAbbrechen();
  if (e.key === 'Enter') return modalBestaetigen();
  if (cmd) return;
  if (e.code === 'KeyO') {
    proportionalTaste(e);
    gewichteNeu();
    return aktualisieren();
  }
  if (e.key === '[' || e.key === ']' || e.key === 'PageUp' || e.key === 'PageDown') {
    radiusSchritt(e.key === ']' || e.key === 'PageUp' ? 1 : -1);
    gewichteNeu();
    return aktualisieren();
  }
  if (!e.altKey && (k === 'x' || k === 'y' || k === 'z')) {
    if (!e.repeat) sperreSetzen(k, e.shiftKey);
    return aktualisieren();
  }
  if (!e.altKey && !e.shiftKey && (k === 'g' || k === 's' || k === 'r')) {
    if (!e.repeat) artWechseln(k);
    return aktualisieren();
  }
  const z = zahlTaste(l.zahl, e.key);
  if (z !== null) {
    l.zahl = z;
    aktualisieren();
  }
}

function bewegen(e: PointerEvent): void {
  const l = lauf;
  if (!l) return;
  const p = blattLokal(l.ansicht, e.clientX, e.clientY);
  if (!p) return;
  if (l.art === 'r') l.winkel += winkelSchritt(l.ziel.mitteBlatt, l.vorher, p);
  l.vorher = p;
  l.jetzt = p;
  aktualisieren();
}

function runter(e: PointerEvent): void {
  const l = lauf;
  if (!l) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.button === 2) {
    kontextBis = performance.now() + 1500;
    return modalAbbrechen();
  }
  // Linksklick bestätigt (beim Knotenzug: ein verpasstes Loslassen)
  if (e.button === 0) modalBestaetigen();
}

function hoch(e: PointerEvent): void {
  const l = lauf;
  if (!l?.ziehen || e.button !== 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  modalBestaetigen();
}

function rad(e: WheelEvent): void {
  const l = lauf;
  if (!l) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (!useUi.getState().proportional.an) return;
  // Mausrad: eine Raste je Ereignis; Trackpad: gesammelt (rauf = größer, wie Blender)
  if (istTrackpad(e)) {
    l.radSumme += e.deltaY;
    let schritte = 0;
    while (Math.abs(l.radSumme) >= RAD_SCHRITT) {
      const s = Math.sign(l.radSumme);
      l.radSumme -= s * RAD_SCHRITT;
      schritte -= s;
    }
    if (!schritte) return;
    for (let i = 0; i < Math.abs(schritte); i++) radiusSchritt(schritte);
  } else radiusSchritt(e.deltaY < 0 ? 1 : -1);
  gewichteNeu();
  aktualisieren();
}

const fokusWeg = () => modalAbbrechen();

function anmelden(): void {
  window.addEventListener('keydown', taste, true);
  window.addEventListener('pointermove', bewegen, true);
  window.addEventListener('pointerdown', runter, true);
  window.addEventListener('pointerup', hoch, true);
  window.addEventListener('wheel', rad, { capture: true, passive: false });
  window.addEventListener('blur', fokusWeg);
}

function abmelden(): void {
  window.removeEventListener('keydown', taste, true);
  window.removeEventListener('pointermove', bewegen, true);
  window.removeEventListener('pointerdown', runter, true);
  window.removeEventListener('pointerup', hoch, true);
  window.removeEventListener('wheel', rad, { capture: true });
  window.removeEventListener('blur', fokusWeg);
}

/** Dauerhaft: das Kontextmenü während einer Operation und kurz nach dem Abbrechen per Rechtsklick schlucken. */
export function useModalKontext() {
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

/** Knotenzug mit der Maus bei eingeschaltetem O: als G mit gedrückter Taste (true = übernommen). */
export function zugProportional(e: React.PointerEvent | PointerEvent, ansicht: Ansicht, ziel: ZielArt): boolean {
  if (!useUi.getState().proportional.an) return false;
  if (!modalStarten('g', { ansicht, ziehen: { clientX: e.clientX, clientY: e.clientY, ziel } })) return false;
  blattSvg(ansicht)?.setPointerCapture(e.pointerId);
  return true;
}
