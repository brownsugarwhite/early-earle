// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.3/V6.4: G/S/R auf einen gewählten Loop, mit dem Zeiger auf der
// Bühne oder einem Blatt (wie Blender: die Operation folgt dem Zeiger ohne Maustaste, Enter/Linksklick bestätigt,
// Esc/Rechtsklick/⌘Z bricht ab; im Blatt auch als Ziehen an der Loop-Linie, Loslassen bestätigt).
// Gerechnet wird in den Zeichnungen, denn ein Loop sind seine Knoten: G verschiebt Rücken- und Bauchknoten in der Seite und
// den Knoten im Top längs x (Bildebene der Bühne am Ring auf x/y zurückgerechnet; z bleibt: Spiegel), S skaliert die Sprosse
// um ihre Mitte und die Breite im Top, R kippt die Sprosse in der Seite (um z). Im Blatt wirkt G in seiner Ebene, soweit der
// Loop spiegelgleich bleibt (Seite x und y, Top nur x, Front nur y), S überall gleich (Faktor aus dem Abstand zur Mitte im
// Blatt), R nur in der Seite. X/Y/Z sperren (S mit Y: nur Höhe, mit Z: nur Breite), Zahlen geben den Wert (G px, S Faktor,
// R Grad). Mit O proportional über die Nachbarn (Knoten und andere Loops in Seite und Top, Abstand im Blatt; Rad, [ ],
// Bild↑/↓ ändern den Einfluss). Die anderen Ansichten folgen über die Kopplung wie bei einem Zug; ein Undo-Schritt.

import { type Ansicht, type Profil, type Profile, type V2, achsenRegeln } from '@ee/shape';
import { type Abb, type GKurve, abbildungAus, gewichte, kurvenAbbilden, punktAbbilden, zahlLesen, zahlTaste } from '../editing/modal/abbildung';
import { modalAktiv } from '../editing/modal/modal';
import { blattLokal, zeiger } from '../editing/modal/zeiger';
import { gekoppeltBerechnen, gekoppeltSetzen } from '../editing/gekoppelt';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { szene } from '../three/instanz';
import { istTrackpad } from '../viewports/ansicht2d';
import { type Gleiten, kernLeiter, schleifeGleiten, schleifeGleitenVorbereiten, stationenAusLeiter, zugBei } from '@ee/shape/kern';
import { aktuellesNetz } from './netzStand';
import { type SchleifenAnzeige, nurDieserLoop, ringMitte, schleifeAmZeiger, schleifeImBlattWaehlen, schleifenKnoten, schleifeWaehlen, useSchleife } from './schleifenAuswahl';
import { schleifenAktiv } from './schleifenWerkzeug';

const PX = 461;
const RAD_SCHRITT = 40;
const MODIFIKATOREN = new Set(['Shift', 'Alt', 'Meta', 'Control', 'CapsLock', 'Fn']);
const BLAETTER = new Set(['seite', 'front', 'top']);

type Art = 'g' | 's' | 'r';
/** Wo die Operation läuft: auf der Bühne oder in einem Blatt */
type Feld = 'creation' | Ansicht;
type Lauf = {
  art: Art;
  id: string;
  feld: Feld;
  /** als Ziehen an der Loop-Linie begonnen (Blatt): Loslassen bestätigt */
  ziehen: boolean;
  basis: Profile;
  auswahl: Record<'seite' | 'front' | 'top', number[]>;
  seite: number[];
  /** Breitenknoten: im Top (liegender Ring) oder in der Front (stehender Ring) */
  top: number[];
  front: number[];
  /**
   * Mitte des Loops und Zeiger: auf der Bühne Feldpixel (y nach unten), im Blatt Blatt-Koordinaten (Profil-Einheiten, y nach
   * oben). `j`: Abbildung Profil-x/y → Bildschirm (Spalten, y nach oben); im Blatt seine Achsen (Seite x/y, Top x, Front y).
   */
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

/** Zeigerlage im Feld: Feldpixel der Bühne bzw. Blatt-Koordinaten (null, wenn das Feld nicht da ist). */
function punktIm(feld: Feld, clientX: number, clientY: number): V2 | null {
  if (feld !== 'creation') return blattLokal(feld, clientX, clientY);
  const r = stageRect();
  return r ? { x: clientX - r.left, y: clientY - r.top } : null;
}

/** Richtung von der Mitte zu p mit y nach oben (Bühne: Bildschirm, Blatt: Profil-Einheiten). */
function vonMitte(l: Lauf, p: V2): V2 {
  return l.feld === 'creation' ? { x: p.x - l.c.x, y: -(p.y - l.c.y) } : { x: p.x - l.c.x, y: p.y - l.c.y };
}

/** Zeigerversatz seit dem Anfang, y nach oben. */
function versatz(l: Lauf): V2 {
  return l.feld === 'creation' ? { x: l.jetzt.x - l.start.x, y: -(l.jetzt.y - l.start.y) } : { x: l.jetzt.x - l.start.x, y: l.jetzt.y - l.start.y };
}

/**
 * G, S oder R auf den gewählten Loop starten: mit dem Zeiger über der Bühne, oder über einem Blatt, wenn genau dieser Loop
 * gewählt ist (sonst formen G/S/R dort die gewählten Punkte, V3). `feld` und `ziehen` setzt das Ziehen an einer Loop-Linie.
 * false: kein Loop gewählt oder es geht hier nicht.
 */
export function schleifeGrsStarten(art: Art, opt: { feld?: Ansicht; ziehen?: { clientX: number; clientY: number } } = {}): boolean {
  if (lauf || modalAktiv() || schleifenAktiv()) return false;
  const id = useSchleife.getState().gewaehlt;
  const ui = useUi.getState();
  const ed = useEditor.getState();
  const feld: Feld | null = opt.feld ?? (ui.hover === 'creation' ? 'creation' : ui.hover && BLAETTER.has(ui.hover) ? (ui.hover as Ansicht) : null);
  if (!id || !feld || ui.ebene !== 'form' || ed.modus !== 'editor' || ed.gesteStart) return false;
  if (feld !== 'creation' && !nurDieserLoop(id)) return false;
  const n = aktuellesNetz();
  const rd = n?.netz.ringe;
  const sr = rd?.schleifen.find((s) => s.id === id);
  if (!n || !rd || !sr) return false;
  const pr = ed.dok.profile;
  const { seite, top, front } = schleifenKnoten(id);
  if (seite.length !== 2) return false;
  let c: V2;
  let j: [number, number, number, number];
  let start: V2;
  if (feld === 'creation') {
    const r = szene.aktuell;
    const rect = stageRect();
    if (!r || !rect) return false;
    // Abbildung am Ring: Bildschirmversatz je Profil-Einheit in x und y (y nach oben)
    const sk = n.skalierung;
    const m = ringMitte(rd, sr.ring, sk);
    const eps = 0.01;
    const q = r.projizierenViele('creation', Float32Array.from([...m, m[0] + eps * sk, m[1], m[2], m[0], m[1] + eps * sk, m[2]]));
    c = { x: q[0]!, y: q[1]! };
    j = [(q[3]! - c.x) / eps, (q[6]! - c.x) / eps, -(q[4]! - c.y) / eps, -(q[7]! - c.y) / eps];
    if (Math.abs(j[0] * j[3] - j[1] * j[2]) < 1e-6) {
      ui.zeigeHinweis('Die Bühne blickt längs des Loops: Ansicht drehen oder in den Blättern formen');
      return true;
    }
    start = zeiger.bekannt ? { x: zeiger.x - rect.left, y: zeiger.y - rect.top } : { x: c.x + 40, y: c.y };
  } else {
    // R dreht in der Bildebene: im Top um y, in der Front um x — der Loop bliebe nicht spiegelgleich
    if (art === 'r' && feld !== 'seite') {
      ui.zeigeHinweis('R kippt einen Loop in der Seite oder auf der Bühne — im Top und in der Front bliebe er nicht spiegelgleich');
      return true;
    }
    const a = pr.seite.knoten[seite[0]!]!.p;
    const b = pr.seite.knoten[seite[1]!]!.p;
    const m = ringMitte(rd, sr.ring, 1);
    c = feld === 'seite' ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : feld === 'top' ? { x: m[0], y: 0 } : { x: 0, y: m[1] };
    j = feld === 'seite' ? [1, 0, 0, 1] : feld === 'top' ? [1, 0, 0, 0] : [0, 0, 0, 1];
    const client = opt.ziehen ? { x: opt.ziehen.clientX, y: opt.ziehen.clientY } : zeiger.bekannt ? { x: zeiger.x, y: zeiger.y } : null;
    start = (client && blattLokal(feld, client.x, client.y)) ?? { x: c.x + 0.1, y: c.y };
  }
  const ys = pr.seite.knoten.map((k) => k.p.y);
  lauf = { art, id, feld, ziehen: !!opt.ziehen, basis: pr, auswahl: { seite, front, top }, seite, top, front, c, j, start, vorher: start, jetzt: start, winkel: 0, sperre: null, zahl: '', radius: 0, radSumme: 0, hoehe: Math.max(...ys) - Math.min(...ys), gleiten: null };
  ui.setzeAuswahl({ seite, front, top }, feld === 'creation' ? 'seite' : feld);
  ed.beginGeste();
  anmelden();
  aktualisieren();
  return true;
}

/**
 * Blatt: Zeiger auf einer Loop-Linie (Werkzeug Auswahl). Klick wählt den Loop (⇧: hinzu bzw. heraus); Ziehen verschiebt ihn —
 * als G mit gedrückter Taste (Loslassen bestätigt, Esc bricht ab), mit derselben Rechnung wie die Taste G im Blatt.
 */
export function schleifenBlattZeiger(e: { target: EventTarget | null; clientX: number; clientY: number; shiftKey: boolean; button: number; stopPropagation(): void }, ansicht: Ansicht): boolean {
  if (e.button !== 0 || useUi.getState().werkzeug !== 'auswahl') return false;
  if (!(e.target as Element | null)?.closest?.('[data-schleife-linie]')) return false;
  // die nächste Linie, nicht die zuletzt gezeichnete (dichte Loops überlappen)
  const id = schleifeAmZeiger(ansicht, e.clientX, e.clientY);
  if (!id) return false;
  e.stopPropagation();
  schleifeImBlattWaehlen(id, ansicht, e.shiftKey);
  if (e.shiftKey) return true;
  const x0 = e.clientX;
  const y0 = e.clientY;
  const ende = () => {
    window.removeEventListener('pointermove', weiter, true);
    window.removeEventListener('pointerup', ende, true);
    window.removeEventListener('pointercancel', ende, true);
  };
  const weiter = (ev: PointerEvent) => {
    if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 3) return;
    ende();
    // die Fenster-Listener der Operation sehen dieses Ereignis nicht mehr: einmal selbst nachführen
    if (schleifeGrsStarten('g', { feld: ansicht, ziehen: { clientX: x0, clientY: y0 } })) bewegen(ev);
  };
  window.addEventListener('pointermove', weiter, true);
  window.addEventListener('pointerup', ende, true);
  window.addEventListener('pointercancel', ende, true);
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
    // im Blatt frei: Seite x und y, Top nur x, Front nur y (sonst bliebe der Loop nicht spiegelgleich); X/Y sperren darauf
    const xFrei = l.feld === 'creation' || l.feld === 'seite' || l.feld === 'top' ? l.sperre !== 'y' : false;
    const yFrei = l.feld === 'creation' || l.feld === 'seite' || l.feld === 'front' ? l.sperre !== 'x' : false;
    if (mitZahl) {
      // längs x, mit Y-Sperre (oder in der Front) längs y
      const w = n / (PX * sk);
      const nachY = l.feld === 'front' || l.sperre === 'y';
      dx = !nachY && xFrei ? w : 0;
      dy = nachY && yFrei ? w : 0;
    } else if (l.feld !== 'creation') {
      const d = versatz(l);
      dx = xFrei ? d.x : 0;
      dy = yFrei ? d.y : 0;
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
  const pro = { x: j0 * dx + j1 * dy, y: j2 * dx + j3 * dy };
  // in der Front läuft ein liegender Loop quer zum Blick (die Wirbelsäule zeigt in die Tiefe)
  if (pro.x * pro.x + pro.y * pro.y < 1e-12) {
    useUi.getState().zeigeHinweis('Hier läuft der Loop in die Tiefe: Gleiten in der Seite, im Top oder auf der Bühne');
    return false;
  }
  l.gleiten = { g, pro };
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
    const d = versatz(l);
    const p2 = gl.pro.x * gl.pro.x + gl.pro.y * gl.pro.y;
    f = gl.g.f0 + (p2 > 1e-12 ? (d.x * gl.pro.x + d.y * gl.pro.y) / p2 : 0);
  }
  const neu = schleifeGleiten(gl.g, f);
  if (neu) useEditor.getState().setzeDokument(neu);
  const rand = 0.05 * (gl.g.fNach - gl.g.fVor);
  const anteil = (Math.min(gl.g.fNach - rand, Math.max(gl.g.fVor + rand, f)) - gl.g.fVor) / (gl.g.fNach - gl.g.fVor);
  useSchleife.setState({ text: `G G Loop gleitet · ${l.zahl ? `${l.zahl.replace('.', ',')}▏` : `${Math.round(anteil * 100)} %`} zwischen den Nachbarn`, anzeige: anzeigeVon(l) });
}

/** Kreuz im Blatt (Mitte, Zeiger); auf der Bühne zeigt der Ring selbst, was geschieht. */
function anzeigeVon(l: Lauf): SchleifenAnzeige | null {
  return l.feld === 'creation' ? null : { feld: l.feld, mitte: l.c, zeiger: l.jetzt, art: l.gleiten ? 'g' : l.art, ziehen: l.ziehen };
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
  useSchleife.setState({ text: teile.join(' · '), anzeige: anzeigeVon(l) });
}

export function schleifeGrsBestaetigen(): void {
  const l = lauf;
  if (!l) return;
  abmelden();
  lauf = null;
  useSchleife.setState({ text: null, anzeige: null });
  useEditor.getState().endeGeste();
  // nach dem Gleiten stehen die Knoten des Loops an anderer Stelle der Zeichnungen: Auswahl neu
  if (l.gleiten) schleifeWaehlen(l.id);
}

export function schleifeGrsAbbrechen(): void {
  const l = lauf;
  if (!l) return;
  abmelden();
  lauf = null;
  useSchleife.setState({ text: null, anzeige: null });
  useEditor.getState().abbrechenGeste();
  useUi.getState().setzeAuswahl(l.auswahl, l.feld === 'creation' ? 'seite' : l.feld);
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
  if (!l) return;
  const p = punktIm(l.feld, e.clientX, e.clientY);
  if (!p) return;
  if (l.art === 'r') {
    // Winkel um die Mitte (y nach oben): fortlaufend aufsummiert
    const v0 = vonMitte(l, l.vorher);
    const v1 = vonMitte(l, p);
    const a0 = Math.atan2(v0.y, v0.x);
    const a1 = Math.atan2(v1.y, v1.x);
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

/** Loslassen: bestätigt ein Ziehen an der Loop-Linie, sonst nur geschluckt. */
function los(e: PointerEvent): void {
  const l = lauf;
  if (!l) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (l.ziehen && e.button === 0) schleifeGrsBestaetigen();
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
  window.addEventListener('pointerup', los, true);
  window.addEventListener('wheel', rad, { capture: true, passive: false });
  window.addEventListener('contextmenu', kontext, true);
  window.addEventListener('blur', fokusWeg);
}

function abmelden(): void {
  window.removeEventListener('keydown', taste, true);
  window.removeEventListener('pointermove', bewegen, true);
  window.removeEventListener('pointerdown', runter, true);
  window.removeEventListener('pointerup', los, true);
  window.removeEventListener('wheel', rad, { capture: true });
  // das Kontextmenü kommt nach dem Rechtsklick: noch kurz schlucken
  setTimeout(() => window.removeEventListener('contextmenu', kontext, true), 1600);
  window.removeEventListener('blur', fokusWeg);
}
