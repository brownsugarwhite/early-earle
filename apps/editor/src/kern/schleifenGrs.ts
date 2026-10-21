// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.3: G/S/R auf einen gewählten Loop, mit dem Zeiger auf der Bühne
// (wie Blender: die Operation folgt dem Zeiger ohne Maustaste, Enter/Linksklick bestätigt, Esc/Rechtsklick/⌘Z bricht ab).
// Gerechnet wird in den Zeichnungen, denn ein Loop sind seine Knoten: G verschiebt Rücken- und Bauchknoten in der Seite und
// den Knoten im Top längs x (Bildebene der Bühne am Ring auf x/y zurückgerechnet; z bleibt: Spiegel), S skaliert die Sprosse
// um ihre Mitte und die Breite im Top, R kippt die Sprosse in der Seite (um z). X/Y/Z sperren (S mit Y: nur Höhe, mit Z: nur
// Breite), Zahlen geben den Wert (G px, S Faktor, R Grad). Mit O proportional über die Nachbarn (Knoten und andere Loops in
// Seite und Top, Abstand im Blatt; Rad, [ ], Bild↑/↓ ändern den Einfluss). Die anderen Ansichten folgen über die Kopplung wie
// bei einem Zug; ein Undo-Schritt.

import { type Profil, type Profile, type V2, achsenRegeln } from '@ee/shape';
import { type Abb, type GKurve, abbildungAus, gewichte, kurvenAbbilden, punktAbbilden, zahlLesen, zahlTaste } from '../editing/modal/abbildung';
import { modalAktiv } from '../editing/modal/modal';
import { zeiger } from '../editing/modal/zeiger';
import { gekoppeltBerechnen, gekoppeltSetzen } from '../editing/gekoppelt';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { szene } from '../three/instanz';
import { istTrackpad } from '../viewports/ansicht2d';
import { type Gleiten, kernLeiter, schleifeGleiten, schleifeGleitenVorbereiten, stationenAusLeiter, zugBei } from '@ee/shape/kern';
import { aktuellesNetz } from './netzStand';
import { ringMitte, schleifeWaehlen, useSchleife } from './schleifenAuswahl';
import { schleifenAktiv } from './schleifenWerkzeug';

const PX = 461;
const RAD_SCHRITT = 40;
const MODIFIKATOREN = new Set(['Shift', 'Alt', 'Meta', 'Control', 'CapsLock', 'Fn']);

type Art = 'g' | 's' | 'r';
type Lauf = {
  art: Art;
  id: string;
  basis: Profile;
  auswahl: Record<'seite' | 'front' | 'top', number[]>;
  seite: number[];
  /** Breitenknoten: im Top (liegender Ring) oder in der Front (stehender Ring) */
  top: number[];
  front: number[];
  /** Mitte des Rings (Bildschirm, Feldpixel; y nach unten) und Abbildung Profil-x/y → Bildschirm (Spalten, y nach oben) */
  c: V2;
  j: [number, number, number, number];
  start: V2;
  vorher: V2;
  jetzt: V2;
  winkel: number;
  sperre: 'x' | 'y' | 'z' | null;
  zahl: string;
  radius: number;
  radSumme: number;
  hoehe: number;
  /** GG: Gleiten entlang der Form (Loop heraus und zwischen seinen Nachbarn wieder hinein), Bildschirmrichtung je Anteil */
  gleiten: { g: Gleiten; pro: V2 } | null;
};
let lauf: Lauf | null = null;
let kontextBis = 0;

export const schleifeGrsAktiv = () => lauf !== null;
/** Für Prüfskripte. */
export const schleifeGrsMessung = { lauf: () => (lauf ? { art: lauf.art, id: lauf.id, sperre: lauf.sperre, zahl: lauf.zahl } : null) };

function stageRect(): DOMRect | null {
  return document.querySelector<HTMLElement>('.vp-ober[data-view="creation"] .steuerung3d')?.getBoundingClientRect() ?? null;
}

/** G, S oder R auf den gewählten Loop starten (Zeiger über der Bühne). false: kein Loop gewählt oder es geht hier nicht. */
export function schleifeGrsStarten(art: Art): boolean {
  if (lauf || modalAktiv() || schleifenAktiv()) return false;
  const id = useSchleife.getState().gewaehlt;
  const ui = useUi.getState();
  const ed = useEditor.getState();
  if (!id || ui.hover !== 'creation' || ui.ebene !== 'form' || ed.modus !== 'editor' || ed.gesteStart) return false;
  const n = aktuellesNetz();
  const rd = n?.netz.ringe;
  const sr = rd?.schleifen.find((s) => s.id === id);
  const r = szene.aktuell;
  const rect = stageRect();
  if (!n || !rd || !sr || !r || !rect) return false;
  const pr = ed.dok.profile;
  const seite = pr.seite.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
  const top = pr.top.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
  const front = pr.front.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
  if (seite.length !== 2) return false;
  // Abbildung am Ring: Bildschirmversatz je Profil-Einheit in x und y (y nach oben)
  const sk = n.skalierung;
  const m = ringMitte(rd, sr.ring, sk);
  const eps = 0.01;
  const q = r.projizierenViele('creation', Float32Array.from([...m, m[0] + eps * sk, m[1], m[2], m[0], m[1] + eps * sk, m[2]]));
  const c = { x: q[0]!, y: q[1]! };
  const j: [number, number, number, number] = [(q[3]! - c.x) / eps, (q[6]! - c.x) / eps, -(q[4]! - c.y) / eps, -(q[7]! - c.y) / eps];
  if (Math.abs(j[0] * j[3] - j[1] * j[2]) < 1e-6) {
    ui.zeigeHinweis('Die Bühne blickt längs des Loops: Ansicht drehen oder in den Blättern formen');
    return true;
  }
  const start = zeiger.bekannt ? { x: zeiger.x - rect.left, y: zeiger.y - rect.top } : { x: c.x + 40, y: c.y };
  const ys = pr.seite.knoten.map((k) => k.p.y);
  lauf = { art, id, basis: pr, auswahl: { seite, front, top }, seite, top, front, c, j, start, vorher: start, jetzt: start, winkel: 0, sperre: null, zahl: '', radius: 0, radSumme: 0, hoehe: Math.max(...ys) - Math.min(...ys), gleiten: null };
  ui.setzeAuswahl({ seite, front, top }, 'seite');
  ed.beginGeste();
  anmelden();
  aktualisieren();
  return true;
}

/** Abbildungen in Seite und am Breitenknoten (Top oder Front) aus Zeiger bzw. Zahl, mit dem Wert für die Anzeige. */
function abbildungen(l: Lauf): { seite: Abb | null; top: Abb | null; front: Abb | null; wert: string } {
  const pr = l.basis;
  const a = pr.seite.knoten[l.seite[0]!]!.p;
  const b = pr.seite.knoten[l.seite[1]!]!.p;
  const mitte = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const n = zahlLesen(l.zahl);
  const mitZahl = Number.isFinite(n);
  const sk = useEditor.getState().dok.skalierung;
  const topKnoten = l.top.length ? pr.top.knoten[l.top[0]!]!.p : null;
  const frontKnoten = l.front.length ? pr.front.knoten[l.front[0]!]!.p : null;
  if (l.art === 'g') {
    let dx: number;
    let dy: number;
    if (mitZahl) {
      const w = n / (PX * sk);
      dx = l.sperre === 'y' ? 0 : w;
      dy = l.sperre === 'y' ? w : 0;
    } else {
      // Bildschirmversatz (y nach oben) → Profil-x/y über die Abbildung am Ring
      const su = l.jetzt.x - l.start.x;
      const sv = -(l.jetzt.y - l.start.y);
      const [j0, j1, j2, j3] = l.j;
      if (l.sperre === 'x') {
        dx = (j0 * su + j2 * sv) / (j0 * j0 + j2 * j2);
        dy = 0;
      } else if (l.sperre === 'y') {
        dx = 0;
        dy = (j1 * su + j3 * sv) / (j1 * j1 + j3 * j3);
      } else {
        const det = j0 * j3 - j1 * j2;
        dx = (j3 * su - j1 * sv) / det;
        dy = (-j2 * su + j0 * sv) / det;
      }
    }
    if (l.sperre === 'z') {
      dx = 0;
      dy = 0;
    }
    const wert = `${(dx * PX * sk).toFixed(1).replace('.', ',')} | ${(dy * PX * sk).toFixed(1).replace('.', ',')} px`;
    return {
      seite: abbildungAus({ art: 'g', c: mitte, frei: { u: true, v: true }, versatz: { x: dx, y: dy } }),
      // im Top wandert der Breitenknoten mit x, in der Front mit der Höhe
      top: topKnoten ? abbildungAus({ art: 'g', c: topKnoten, frei: { u: true, v: false }, versatz: { x: dx, y: 0 } }) : null,
      front: frontKnoten ? abbildungAus({ art: 'g', c: frontKnoten, frei: { u: false, v: true }, versatz: { x: 0, y: dy } }) : null,
      wert,
    };
  }
  if (l.art === 's') {
    const d0 = Math.hypot(l.start.x - l.c.x, l.start.y - l.c.y);
    const f = mitZahl ? n : d0 > 1e-6 ? Math.hypot(l.jetzt.x - l.c.x, l.jetzt.y - l.c.y) / d0 : 1;
    // Y: nur die Höhe (Sprosse), Z: nur die Breite (Top), X: die Sprosse längs x (Neigung bleibt nicht) — wie Blender je Achse
    const seite = l.sperre === 'z' ? null : abbildungAus({ art: 's', c: mitte, frei: { u: l.sperre !== 'y', v: l.sperre !== 'x' }, faktor: f });
    const breite = l.sperre === null || l.sperre === 'z';
    const top = topKnoten && breite ? abbildungAus({ art: 's', c: { x: topKnoten.x, y: 0 }, frei: { u: false, v: true }, faktor: f }) : null;
    const front = frontKnoten && breite ? abbildungAus({ art: 's', c: { x: 0, y: frontKnoten.y }, frei: { u: true, v: false }, faktor: f }) : null;
    return { seite, top, front, wert: f.toFixed(3).replace('.', ',') };
  }
  // R: Kippen in der Seite um z; Drehsinn wie man die Bühne sieht (Abbildung mit negativer Determinante spiegelt)
  const spiegel = l.j[0] * l.j[3] - l.j[1] * l.j[2] < 0 ? -1 : 1;
  const theta = mitZahl ? (n * Math.PI) / 180 : spiegel * l.winkel;
  return { seite: abbildungAus({ art: 'r', c: mitte, frei: { u: true, v: true }, winkel: theta }), top: null, front: null, wert: `${((theta * 180) / Math.PI).toFixed(1).replace('.', ',')}°` };
}

/** Gewichte (proportional) in einer Zeichnung: gewählt = die Knoten des Loops. */
/**
 * Gewichte in einer Zeichnung: gewählt = die Knoten des Loops. Ein Loop wirkt mindestens über das Dreifache seiner größten
 * Verschiebung, glatt längs des Umrisses (`MINDEST_EINFLUSS`): Loops liegen oft dicht (⌘R mit mehreren), und ein allein
 * skalierter Loop setzte seine Knoten 30 px tief neben Nachbarn in 3–10 px Abstand — der Umriss bekam V-Kerben, Sprossen
 * kreuzten, die Fläche klappte um (Langhals in der Biegung, 175°). Mit O gilt der größere Einfluss und der eigene Abfall.
 */
function gewichteIn(pr: Profil, gewaehlt: number[], radius: number, abb: Abb | null) {
  const p = useUi.getState().proportional;
  const k: GKurve = { knoten: pr.knoten, geschlossen: pr.art === 'geschlossen', gewaehlt: new Set(gewaehlt) };
  let weg = 0;
  if (abb) for (const i of gewaehlt) {
    const q = pr.knoten[i]!.p;
    const t = punktAbbilden(abb, q, 1);
    weg = Math.max(weg, Math.hypot(t.x - q.x, t.y - q.y));
  }
  const mindest = MINDEST_EINFLUSS * weg;
  if (!p.an && !(mindest > 0)) return gewichte([k], { an: false, abfall: p.abfall, radius: 0, verbunden: false });
  return p.an ? gewichte([k], { an: true, abfall: p.abfall, radius: Math.max(radius, mindest), verbunden: p.verbunden }) : gewichte([k], { an: true, abfall: 'glatt', radius: mindest, verbunden: true });
}

/** Mindest-Einfluss eines Loops als Vielfaches seiner größten Verschiebung (längs des Umrisses) */
const MINDEST_EINFLUSS = 3;

/** GG: vom Verschieben ins Gleiten wechseln (Blender: G zweimal). false, wenn der Loop geformt ist. */
function gleitenStarten(l: Lauf): boolean {
  const ed = useEditor.getState();
  const start = ed.gesteStart ?? ed.dok;
  const N = aktuellesNetz()?.netz.ringe?.N ?? 16;
  const g = schleifeGleitenVorbereiten(start, l.id, N);
  if (!g) {
    useUi.getState().zeigeHinweis('Ein geformter Loop gleitet nicht — Gleiten geht, solange er auf dem Umriss liegt (⌘Z bis dahin)');
    return false;
  }
  // Richtung der Wirbelsäule am Loop auf dem Bildschirm (y nach oben), je Anteil der Wirbelsäule
  const lt = kernLeiter(g.ohne);
  const [a, b] = stationenAusLeiter(lt, [g.fVor, g.fNach]);
  const mitte = (s: { a: number; b: number }) => {
    const o = zugBei(lt.ruecken, s.a);
    const u = zugBei(lt.bauch, s.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  };
  const m0 = mitte(a!);
  const m1 = mitte(b!);
  const dx = (m1.x - m0.x) / (g.fNach - g.fVor);
  const dy = (m1.y - m0.y) / (g.fNach - g.fVor);
  const [j0, j1, j2, j3] = l.j;
  l.gleiten = { g, pro: { x: j0 * dx + j1 * dy, y: j2 * dx + j3 * dy } };
  if (ed.gesteStart) ed.setzeDokument(ed.gesteStart);
  l.start = l.jetzt;
  l.vorher = l.jetzt;
  l.zahl = '';
  return true;
}

function gleitenAktualisieren(l: Lauf): void {
  const gl = l.gleiten!;
  const n = zahlLesen(l.zahl);
  let f: number;
  if (Number.isFinite(n)) f = gl.g.fVor + n * (gl.g.fNach - gl.g.fVor);
  else {
    const su = l.jetzt.x - l.start.x;
    const sv = -(l.jetzt.y - l.start.y);
    const p2 = gl.pro.x * gl.pro.x + gl.pro.y * gl.pro.y;
    f = gl.g.f0 + (p2 > 1e-9 ? (su * gl.pro.x + sv * gl.pro.y) / p2 : 0);
  }
  const neu = schleifeGleiten(gl.g, f);
  if (neu) useEditor.getState().setzeDokument(neu);
  const rand = 0.05 * (gl.g.fNach - gl.g.fVor);
  const anteil = (Math.min(gl.g.fNach - rand, Math.max(gl.g.fVor + rand, f)) - gl.g.fVor) / (gl.g.fNach - gl.g.fVor);
  useSchleife.setState({ text: `G G Loop gleitet · ${l.zahl ? `${l.zahl.replace('.', ',')}▏` : `${Math.round(anteil * 100)} %`} zwischen den Nachbarn` });
}

function aktualisieren(): void {
  const l = lauf;
  if (!l) return;
  if (l.gleiten) return gleitenAktualisieren(l);
  const ui = useUi.getState();
  l.radius = ui.proportional.an ? ui.pinselRadius * l.hoehe : 0;
  const { seite, top, front, wert } = abbildungen(l);
  const pr = l.basis;
  const seiteNeu = seite ? achsenRegeln({ ...pr.seite, knoten: kurvenAbbilden(seite, [pr.seite.knoten], gewichteIn(pr.seite, l.seite, l.radius, seite))[0]! as Profil['knoten'] }) : pr.seite;
  // die anderen Ansichten folgen der Seite über die Kopplung (wie bei einem Zug); dann der Loop-Knoten im Top
  const g = gekoppeltBerechnen('seite', seiteNeu, pr, l.auswahl);
  const breitenknoten = (pr0: Profil, abb: Abb | null): Profil => {
    if (!abb) return pr0;
    const idx = pr0.knoten.flatMap((k, i) => (k.schleife === l.id ? [i] : []));
    return idx.length ? achsenRegeln({ ...pr0, knoten: kurvenAbbilden(abb, [pr0.knoten], gewichteIn(pr0, idx, l.radius, abb))[0]! as Profil['knoten'] }) : pr0;
  };
  gekoppeltSetzen({ profile: { ...g.profile, top: breitenknoten(g.profile.top, top), front: breitenknoten(g.profile.front, front) }, ...(g.spanten ? { spanten: g.spanten } : {}) });
  const sperre = l.sperre ? l.sperre.toUpperCase() : null;
  const teile = [{ g: 'G', s: 'S', r: 'R' }[l.art] + ' Loop', ...(sperre ? [sperre] : []), l.zahl ? `${l.zahl.replace('.', ',')}▏` : wert];
  if (ui.proportional.an) teile.push('proportional');
  useSchleife.setState({ text: teile.join(' · ') });
}

export function schleifeGrsBestaetigen(): void {
  const l = lauf;
  if (!l) return;
  abmelden();
  lauf = null;
  useSchleife.setState({ text: null });
  useEditor.getState().endeGeste();
  // nach dem Gleiten stehen die Knoten des Loops an anderer Stelle der Zeichnungen: Auswahl neu
  if (l.gleiten) schleifeWaehlen(l.id);
}

export function schleifeGrsAbbrechen(): void {
  const l = lauf;
  if (!l) return;
  abmelden();
  lauf = null;
  useSchleife.setState({ text: null });
  useEditor.getState().abbrechenGeste();
  useUi.getState().setzeAuswahl(l.auswahl, 'seite');
}

// ---------- Ereignisse (Erfassungsphase am Fenster) ----------

function taste(e: KeyboardEvent): void {
  const l = lauf;
  if (!l || MODIFIKATOREN.has(e.key)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const cmd = e.metaKey || e.ctrlKey;
  const k = e.key.toLowerCase();
  if (e.key === 'Escape' || (cmd && k === 'z')) return schleifeGrsAbbrechen();
  if (e.key === 'Enter') return schleifeGrsBestaetigen();
  if (cmd) return;
  if (e.code === 'KeyO') {
    const ui = useUi.getState();
    ui.setzeProportional({ an: !ui.proportional.an });
    return aktualisieren();
  }
  if (e.key === '[' || e.key === ']' || e.key === 'PageUp' || e.key === 'PageDown') {
    const ui = useUi.getState();
    ui.setzePinselRadius(ui.pinselRadius * (e.key === ']' || e.key === 'PageUp' ? 1.1 : 1 / 1.1));
    return aktualisieren();
  }
  if (!e.altKey && (k === 'x' || k === 'y' || k === 'z')) {
    if (!e.repeat) l.sperre = l.sperre === k ? null : k;
    return aktualisieren();
  }
  if (!e.altKey && !e.shiftKey && (k === 'g' || k === 's' || k === 'r')) {
    // G zweimal: Gleiten entlang der Form (wie Blenders „Edge Slide“)
    if (!e.repeat && k === 'g' && l.art === 'g' && !l.gleiten) {
      gleitenStarten(l);
      return aktualisieren();
    }
    if (l.gleiten) return;
    if (!e.repeat && k !== l.art) {
      l.art = k;
      l.start = l.jetzt;
      l.vorher = l.jetzt;
      l.winkel = 0;
      l.zahl = '';
    }
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
  const rect = stageRect();
  if (!l || !rect) return;
  const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  if (l.art === 'r') {
    // Winkel um die Mitte (Bildschirm, y nach oben): fortlaufend aufsummiert
    const a0 = Math.atan2(-(l.vorher.y - l.c.y), l.vorher.x - l.c.x);
    const a1 = Math.atan2(-(p.y - l.c.y), p.x - l.c.x);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d <= -Math.PI) d += 2 * Math.PI;
    l.winkel += d;
  }
  l.vorher = p;
  l.jetzt = p;
  aktualisieren();
}

function runter(e: PointerEvent): void {
  if (!lauf) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.button === 2) {
    kontextBis = performance.now() + 1500;
    return schleifeGrsAbbrechen();
  }
  if (e.button === 0) schleifeGrsBestaetigen();
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
  if (!useUi.getState().proportional.an) return;
  const ui = useUi.getState();
  const schritt = (s: number) => ui.setzePinselRadius(useUi.getState().pinselRadius * (s > 0 ? 1.1 : 1 / 1.1));
  if (istTrackpad(e)) {
    l.radSumme += e.deltaY;
    while (Math.abs(l.radSumme) >= RAD_SCHRITT) {
      const s = Math.sign(l.radSumme);
      l.radSumme -= s * RAD_SCHRITT;
      schritt(-s);
    }
  } else schritt(e.deltaY < 0 ? 1 : -1);
  aktualisieren();
}

function kontext(e: MouseEvent): void {
  if (lauf || performance.now() < kontextBis) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

const fokusWeg = () => schleifeGrsAbbrechen();

function anmelden(): void {
  window.addEventListener('keydown', taste, true);
  window.addEventListener('pointermove', bewegen, true);
  window.addEventListener('pointerdown', runter, true);
  window.addEventListener('pointerup', schlucken, true);
  window.addEventListener('wheel', rad, { capture: true, passive: false });
  window.addEventListener('contextmenu', kontext, true);
  window.addEventListener('blur', fokusWeg);
}

function abmelden(): void {
  window.removeEventListener('keydown', taste, true);
  window.removeEventListener('pointermove', bewegen, true);
  window.removeEventListener('pointerdown', runter, true);
  window.removeEventListener('pointerup', schlucken, true);
  window.removeEventListener('wheel', rad, { capture: true });
  // das Kontextmenü kommt nach dem Rechtsklick: noch kurz schlucken
  setTimeout(() => window.removeEventListener('contextmenu', kontext, true), 1600);
  window.removeEventListener('blur', fokusWeg);
}
