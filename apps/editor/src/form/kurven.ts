// Form zuerst (05.11.2026), Schritt 1 „Nur Loops“ (Fenster `kurven.html`, Florian): Die Kugel hat am Anfang keine Loops. Loops
// werden quer über den Körper geschnitten (in Seite, Front und Top) oder als geschlossene Form gezeichnet; es gibt keine offenen
// Linien. Griffe sind Kreuzungen von Loops (entstehen von selbst) und Punkte, die er auf eine Linie setzt (Doppelklick) oder mit
// einer Form zeichnet; sie lassen sich löschen. Ein ganzer Loop wird angeklickt und gezogen oder mit G/S/R geformt, mit O
// (Einflusskreis) wie in Blender. Der Umriss ist nur Shader. Die Haut löst `LoopZug` im Einflussbereich. Start: `?form=kugel|bohne`.
// (Der Beweis davor, „Kurven als Wahrheit“ mit dem Startumriss als Loop 0, steht in Commit bb0c837d.)
// Griffe (Florian, 05.11.): Jeder gewählte Punkt zeigt seine Bézier-Griffe (gespeichert, Teil A 06.11.); ein Griff biegt nur
// sein Stück. Glatt ● hält die Griffe gegenüber, an einer Ecke ◆ darf die Linie knicken (Doppelklick oder ⌥-Klick schaltet um);
// die Kreuzung mit einer Kante wird von selbst eine Ecke. Kante an/aus ist eine eigene Einstellung (Taste K). Wie in
// Illustrator gehen die Griffe mit ihrem Punkt (S/R drehen und skalieren sie mit), ein Punkt ändert nur die zwei Stücke bis zu
// seinen Nachbarn. Jedes Blatt hat einen eigenen Ausschnitt (Rad/Pinch zoomt, zwei Finger/mittlere Taste verschieben, Pos1).
// Das Netz verdichtet sich selbst (`verdichten`): nach jedem Zug, und bei weiten Zügen in Stufen, in denen der Bereich mitwächst.
// Spiegelpunkte (Ende eines Rings auf der Mittelebene) zeigen beide Griffe, der zweite ist das Spiegelbild; beide sind frei
// ziehbar (die Linie knickt dort spiegelgleich, der Punkt wird eine Ecke), glatt steht der Griff senkrecht zur Mittelebene.
// Doppelklick auf einen Griff schaltet seinen Punkt um (an Kreuzungen liegt oft der Punkt des anderen Loops obenauf).
// Maul (Florian: „Mund = Loop“): eine schmale Form ums Maul (F, vorn über den Umriss oder über die Mitte) wird mit dem Regler „Maul“
// im 3D-Blatt das Maul. Ihr Inneres ist die Öffnung, ihr fernster Punkt der Mundwinkel ◆; die Lippen bleiben Loops wie die anderen.
// Das Netz bleibt geschlossen (die Öffnung wird nicht gezeigt), die Grundform zeigt das Maul zu, so wie es gezeichnet ist.
// Die Linie ist ihr Pfad (07.11., Florian: „ja genau zur Bézier-Kurve machen“): In der Grundform liegt jede Linie genau auf dem
// Bézier-Pfad aus ihren Punkten und Griffen, die Haut folgt; ein neuer Loop springt beim Anlegen örtlich darauf (ohne Zusatzpunkte;
// `?punkte=noetig` zum Vergleich), eine Kreuzung ist ein Ort, O formt über Punkte und Griffspitzen. Die Blätter zeichnen die Linie als
// ihren Bézier-Pfad, und nach einem Zug wird das Netz an den Linien so fein, dass es höchstens MK/40 von ihrer Kurve abweicht (08.11.,
// kleine Details waren eckig).
// Fressen-Pose (Florian: „in der Pose ganz normal die Bézier-Punkte bearbeiten und den Blendshape erstellen“): Knopf „Fressen“ oder
// die Regler Maul und Kopf (Unterkiefer und Schädel als Knochen) zeigen die Pose. Darin wirken alle Werkzeuge wie in der Grundform
// auf das, was zu sehen ist; gespeichert wird der Unterschied zur Grundform vor den Knochen (Blendshape, `poseLoop.ts`). Grundform
// und Pose haben dasselbe Netz; neue Punkte oder Loops gibt es in beiden, die Grundform ändern sie nicht.

import {
  type Ansicht,
  type GriffVersatz,
  type HautArt,
  type Einbettung,
  type HautGewichte,
  type HautVorlage,
  type Kurve,
  type Loop,
  type LoopPunkt,
  LoopZug,
  MAUL_WINKEL_MAX,
  type MaulAmLoop,
  type UmrissPunkt,
  type V3,
  type ZeichnungsStueck,
  bereichUm,
  eckenAuto,
  einfluss,
  ergaenzen,
  festlegen,
  formAusZeichnung,
  griffeAbbilden,
  griffeAnlegen,
  griffeAusZeichnung,
  griffeAusrichten,
  griffeBei,
  griffeErgaenzen,
  griffeNach,
  griffeUebernehmen,
  griffZiehen,
  griffeProportional,
  type Haut,
  hatGriffe,
  hatPfad,
  kanteBei,
  kantenKnicken,
  istEcke,
  istSichtbar,
  istEckeVonSelbst,
  hautAus,
  hautNormalen,
  innenPosieren,
  knickWinkel,
  knochenDrehen,
  knochenWinkel,
  kreuzungenZwischen,
  kurveAbtasten,
  loopAusSchnitt,
  loopEinsetzen,
  maulAmLoop,
  mittlereKante,
  mundwinkelProbe,
  pfadAbweichung,
  pfadParameter,
  pfadVersatz,
  punktEinfuegen,
  punkteLoeschen,
  ringEnde,
  rundAusSeite,
  stueckNaechstes,
  stueckPunkt,
  verdichten,
  type Verdichtet,
  type ZerlegungsDaten,
  einbettungAuswerten,
  systemAusDaten,
  verschiebungLaengs,
} from '@ee/shape/dicht';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  GreaterDepth,
  HemisphereLight,
  LessEqualDepth,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  RedFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { V2 } from '@ee/shape';
import { istTrackpad, radFaktor } from '../viewports/ansicht2d';
import {
  type AufraeumAuftrag,
  type AufraeumErgebnis,
  type VerdichtenOptionen,
  type VerfeinerAuftrag,
  type VerfeinerErgebnis,
  type Zwischenstand,
  gewichteAusFlach,
  hautAusFlach,
  hautFlach,
  nachbarnFlach,
} from './verfeinern';

/** Auswahl: ein Punkt (i ≥ 0) oder ein ganzer Loop (i = −1), Loop über seine Kennung */
type Wahl = { l: number; i: number };

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
const KURVE = 0x0e9f8e;
const KURVE_WAHL = 0x0a5f56;
const LIPPE = 0xb0413a;
const MAULFARBE = 0x7a3431;
/** So viele Welteinheiten passen in die kürzere Seite eines Blatts. */
const SICHT = 560;
/** bestellte Dreiecke der Haut (Surface Nets geben etwa das 1,5-Fache); `?dreiecke=` für Messungen mit feineren Netzen */
const DREIECKE = Number(new URLSearchParams(location.search).get('dreiecke') ?? 6000);
/** Runden je Mausbewegung und beim Loslassen */
const RUNDEN_ZUG = 2;
const RUNDEN_ENDE = 4;
/**
 * Aus den Kurven (über die ganze Haut) rechnet der Löser im Bildtakt, nicht im Mausereignis (10.11., Gegenprüfung Schritt G3,
 * `zugRechnen`): je Bild mindestens eine Runde und so viele weitere, wie in `BUDGET_MS` passen; auch wenn die Maus ruht, bis sich
 * die Form in einer Runde um weniger als `RUHE` Einheiten bewegt (0,05 Einheiten = 0,14 px bei 300 %; gemessen längs der
 * Flächennormalen, `rundeMitWeg`). Vorher gab es je Mausbewegung eine Runde (eine zweite nur bei kleinen Netzen) und beim Loslassen
 * vier auf einmal: Der Rest wurde genau beim Loslassen sichtbar.
 */
const BUDGET_MS = 12;
const RUHE = 0.05;

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
/** Kopf über Bauch: zwischen ihnen eine Einbuchtung von vorn (Schnauze links) */
const BOHNE: UmrissPunkt[] = [
  { x: 150, y: 0 },
  { x: 80, y: 130 },
  { x: -40, y: 150 },
  { x: -150, y: 120 },
  { x: -200, y: 60 },
  { x: -170, y: 22 },
  { x: -110, y: 24 },
  { x: -50, y: 15 },
  { x: -110, y: 4 },
  { x: -180, y: -40 },
  { x: -120, y: -130 },
  { x: 0, y: -150 },
  { x: 110, y: -110 },
];
const FORMEN: Record<string, UmrissPunkt[]> = { kugel: kreis(150), bohne: BOHNE };
const startUmriss = FORMEN[new URLSearchParams(location.search).get('form') ?? 'kugel'] ?? kreis(150);

// ---------- Haut und Loops ----------

const netz = rundAusSeite(startUmriss, { dreiecke: DREIECKE });
/** die Haut; jeder neue Loop wird als Kette von Kanten eingesetzt (die Haut wird dabei ersetzt) */
let haut: Haut = hautAus(netz.positionen, netz.indizes);
const MK = mittlereKante(haut);
/** so nah müssen sich zwei Loops kommen, damit sie sich kreuzen */
const TOL = 0.25 * MK;

let loops: Loop[] = [];
let naechsteId = 1;
let naechsteKreuzung = 1;
let auswahl: Wahl[] = [];
let modus: 'frei' | 'loop' | 'form' | 'stift' = 'frei';
let oAn = false;
let radius = 90;
let meldung = '';
/** Das Maul: der Loop, dessen schmale Form die Öffnung ist. Der Mundwinkel ist ein Punkt dieses Loops (`mundwinkel`). */
type MaulZustand = { id: number } | null;
let maul: MaulZustand = null;
/**
 * Die Fressen-Pose: Knochen (Grad) und Blendshape, je Punkt der Haut die Verschiebung gegen die Grundform vor den Knochen (null:
 * keiner).
 */
type PoseStand = { kiefer: number; schaedel: number; delta: Float64Array | null };
let pose: PoseStand = { kiefer: 30, schaedel: 0, delta: null };
/** In der Pose: die Grundform. `haut` und `loops` sind dann die Pose, wie sie zu sehen ist (dasselbe Netz, posierte Lagen). */
let grund: { haut: Haut; loops: Loop[] } | null = null;
/** nach jedem Zug verdichten (`?verdichten=0` schaltet es zum Vergleich ab) */
const VERDICHTEN = new URLSearchParams(location.search).get('verdichten') !== '0';
/** die Krümmung der Haut folgt den Loops (`?kruemmung=0`: jeder Punkt behält seine, zum Vergleich) */
const KRUEMMUNG = new URLSearchParams(location.search).get('kruemmung') !== '0';
/**
 * Wie die Haut zwischen den Loops entsteht (Beweis B, 06.11.): aus den Kurven = bei jedem Zug über die ganze Haut neu aus den Loops
 * gerechnet, ohne Gedächtnis (`HautAusKurven`, wie FiberMesh); `?haut=gedaechtnis` = jeder Punkt behält die Krümmung beim Anfassen, so
 * weit die Loops sie nicht vorgeben, gelöst im Bereich des Zugs (bis 06.11., zum Vergleich). In der Pose immer mit Gedächtnis.
 */
const HAUT: HautArt = new URLSearchParams(location.search).get('haut') === 'gedaechtnis' ? 'gedaechtnis' : 'kurven';
/**
 * Wie die Haut aus den Kurven die Krümmung misst und verteilt (08.11., Beweis, Florian: „Form unabhängig vom Netz, Sprung beim
 * Loslassen höchstens ein halber Bildpunkt“): `?gewichte=geometrie` = nach der Geometrie (Laplace–Beltrami auf der intrinsischen
 * Delaunay-Triangulierung); dann hängt die Form nicht mehr am Netz und springt nicht, wenn es sich nach dem Zug verdichtet. Standard
 * bleibt bis zu Florians Wort das Mittel der Nachbarn (Ohr bei schnellem Zug und Linse damit etwas schlechter, Planseite).
 */
const GEWICHTE: HautGewichte = new URLSearchParams(location.search).get('gewichte') === 'geometrie' ? 'geometrie' : 'gleich';
/**
 * Beweis „Linien mit Richtung“ (09.11.): `?richtung=1` = jede Linie gibt der Haut ihre Richtung vor (aus den Kreuzungen und der
 * Mittelebene, dazwischen gleichmäßig; `dicht/richtung.ts`), die Krümmung wird je Seite der Linie gemessen, die Punkte neben der Linie
 * liegen auf ihrer Ebene. Nur aus den Kurven.
 */
const RICHTUNG = new URLSearchParams(location.search).get('richtung') === '1';
/** Weg a (09.11.): `?maxnormalen=1` = im Maß des Lösers die Normalen nach Max (sonst wie heute) */
const MAXNORMALEN = new URLSearchParams(location.search).get('maxnormalen') === '1';
const RICHTUNG_OPT: { richtung?: boolean; maxNormalen?: boolean } = {
  ...(RICHTUNG ? { richtung: true } : {}),
  ...(MAXNORMALEN ? { maxNormalen: true } : {}),
};
/** Der Zug löst nur einen Bereich um die bewegten Stellen (mit Gedächtnis und in der Pose); aus den Kurven die ganze Haut */
const mitBereich = (): boolean => grund !== null || HAUT !== 'kurven';
/**
 * Die Linie ist ihr Pfad (07.11., Florian: „ja genau zur Bézier-Kurve machen“): In der Grundform ist das Ziel jeder Probe eines Loops
 * mit Pfad genau der Pfad an ihrer Stelle, die Haut folgt, und die Punkte bleiben, wohin sie gezogen werden. In der Pose (ihre Linien
 * sind gedrehte Linien der Grundform, die Griffe daran abgelesen) folgen die Linien wie bisher den Änderungen ihres Pfads.
 */
const exakt = (l: Loop): boolean => grund === null && hatPfad(l);
/**
 * Zum Vergleich (`?punkte=noetig`): Ein geschnittener oder mit F gezeichneter Loop bekommt beim Anlegen Punkte, bis seine Linie höchstens
 * 0,05 Kanten (≈ 0,4) neben ihrem Pfad liegt. Florians Wahl ist ohne Zusatzpunkte.
 */
const PUNKTE_NOETIG = new URLSearchParams(location.search).get('punkte') === 'noetig';
/** Nach einem Schritt: Ruhe der Linien; die Punkte bleiben (Grundform) oder werden von der Linie abgelesen (Pose) */
function festlegenAlle(): void {
  for (const l of loops) festlegen(haut, l, !exakt(l));
}
/** Runden, wenn die Haut ohne Zug neu gerechnet wird (nach einer Kante oder dem Löschen) */
const RUNDEN_NEU = 12;
/**
 * auch verdichten, wo sich die Fläche stark dreht (`?winkel=1`, Versuch): an einem langen Lappen gemessen schlechter (14 statt 4
 * umgeschlagene Dreiecke), an einem dicken gleich; deshalb aus
 */
const WINKEL = new URLSearchParams(location.search).get('winkel') === '1';
/**
 * Kanten kürzer als dieser Anteil der Startkante werden nach einem Zug zusammengelegt, auf einer Linie (Kette) nur unter der
 * Hälfte davon (`?kurz=0` schaltet es zum Vergleich ab). Gemessen mit der Maus (`form-explosion-probe.mjs`, Knicke über 60° /
 * umgeklappt): langer Hammer 79/26 → 7/0, Schlaufe 46/16 → 14/2, Rüssel mit gedrehtem Griff 36/6 → 13/0; mit ⅓ bzw. 0,4 im Kern
 * schwächer.
 */
const KURZ = Number(new URLSearchParams(location.search).get('kurz') ?? 0.5);
/**
 * Genauigkeit der Linien im Netz als Anteil der Startkante (08.11., Florian: „warum es ungenau und eckig wird, wenn ich kleine Details
 * rausziehe“): Nach einem Zug wird eine Kante einer Linie geteilt, wo die Linie zwischen ihren zwei Netzpunkten weiter als MK/40 (≈ 0,2,
 * bei 307 % ≈ 0,6 Bildpunkte) von ihrer Kurve abweicht, und nur zusammengelegt, wo die Abweichung danach höchstens halb so groß ist
 * (`verdichten`, `genau`). `?genau=0` zum Vergleich.
 *
 * Die Haut zwischen den Linien ebenso fein zu machen (`?genauHaut=1`, Versuch) macht sie am Ohr rund (0,21 statt 0,99), aber weite Züge
 * schlechter: Rüssel mit gedrehtem Griff 108 Knicke über 60° und 46 umgeklappt statt 31 / 0, Fressen-Pose 8 umgeklappt statt 0 (der Löser
 * aus den Kurven verträgt die vielen geteilten Dreiecke dort nicht). Auch gleich nach dem Anlegen eines Loops zu teilen war schlechter
 * (ohne Setzen danach klappten Splitter um).
 */
const GENAU = Number(new URLSearchParams(location.search).get('genau') ?? 1 / 40);
const GENAU_HAUT = new URLSearchParams(location.search).get('genauHaut') === '1';
/**
 * Verfeinern im Zug (08.11., Schritt 3, Florian: „Netz und Linien schon während des Zugs verfeinern, Zerlegung im Hintergrund“): Wird
 * die Haut beim Ziehen gestreckt (eine Kante länger als `LIVE_KANTE` Startkanten), wird der Zug festgehalten, das Netz wie nach dem Zug
 * verdichtet (Teilen, Zusammenlegen, Linien genau) und der Zug auf dem neuen Netz weitergeführt. Nur nach der Geometrie
 * (`?gewichte=geometrie`): Dort hängt die Form nicht am Netz, das Einwechseln springt nicht. `?live=0` zum Vergleich.
 */
const LIVE = new URLSearchParams(location.search).get('live') !== '0';
const LIVE_KANTE = Number(new URLSearchParams(location.search).get('liveKante') ?? 2);
/** Linien: verfeinern, sobald sie um so viel Mal die Genauigkeit nach dem Zug (`GENAU`) von ihrer Kurve abweichen */
const LIVE_GENAU = Number(new URLSearchParams(location.search).get('liveGenau') ?? 1);
/**
 * Eine Linie wird im Zug ungenau: Ihre Ziele liegen auf ihrem Pfad; weicht ein Ziel von der Sehne seiner Nachbarn um d ab, weicht die
 * Kette dort etwa um d/4 von der Kurve ab. Ab `LIVE_GENAU` mal der Genauigkeit nach dem Zug (`GENAU`) wird verfeinert.
 */
function linieUngenau(z: Zug): boolean {
  if (!(GENAU > 0)) return false;
  const grenze = 4 * LIVE_GENAU * GENAU * MK;
  for (let li = 0; li < loops.length; li++) {
    const l = loops[li]!;
    const L = z.lagen[li];
    if (!L || !exakt(l)) continue;
    const n = l.proben.length;
    const zu = l.art !== 'ring';
    for (let j = zu ? 0 : 1; j < (zu ? n : n - 1); j++) {
      const a = lageAus(L, (j - 1 + n) % n);
      const b = lageAus(L, j);
      const c = lageAus(L, (j + 1) % n);
      const ux = c.x - a.x;
      const uy = c.y - a.y;
      const uz = c.z - a.z;
      const u2 = ux * ux + uy * uy + uz * uz;
      if (!(u2 > 1e-12)) continue;
      const t = Math.max(0, Math.min(1, ((b.x - a.x) * ux + (b.y - a.y) * uy + (b.z - a.z) * uz) / u2));
      const d = Math.hypot(b.x - a.x - t * ux, b.y - a.y - t * uy, b.z - a.z - t * uz);
      if (d > grenze) return true;
    }
  }
  return false;
}

/** eine Kante der Haut ist länger als `LIVE_KANTE` Startkanten */
function gestreckt(): boolean {
  const P = haut.pos;
  const T = haut.tri;
  const g = (LIVE_KANTE * MK) ** 2;
  for (let t = 0; t < T.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = T[t + e]!;
      const b = T[t + ((e + 1) % 3)]!;
      const dx = P[3 * a]! - P[3 * b]!;
      const dy = P[3 * a + 1]! - P[3 * b + 1]!;
      const dz = P[3 * a + 2]! - P[3 * b + 2]!;
      if (dx * dx + dy * dy + dz * dz > g) return true;
    }
  return false;
}
let letzteVerdichtung: { neu: number; gelegt: number; ms: number } | null = null;

/**
 * Was der Hintergrund für den Stand noch tun soll (G4.4, über die ganze Haut nach der Geometrie). null: nichts offen, höchstens die
 * Zerlegung für das nächste Greifen fehlt. Gehört zum Stand: Rückgängig bringt es mit zurück.
 * - `setzen`: Die Haut steht nicht zum Stand (nach einer Kante, dem Löschen, einem neuen Loop), der Auftrag setzt sie zuerst;
 *   `ziele`: dabei je Loop ohne Pfad seine Verschiebung.
 * - `nurInRuhe`: Das Setzen gilt nur, wenn die Haut dabei zur Ruhe kommt (nach einem neuen Loop: Dort muss nichts geschehen, und
 *   mit einem einzigen Loop hält nichts die Haut). Nach Kante und Löschen gilt es immer (wie bisher im Fenster).
 * - `verdichten`: danach aufräumen wie nach einem Zug (verdichten, wo die Haut gedehnt oder gestaucht ist, und wieder setzen).
 */
type RuheOffen = { setzen: boolean; nurInRuhe: boolean; verdichten: boolean; ziele: (Float64Array | null)[] | null };
let ruheOffen: RuheOffen | null = null;

type Schnappschuss = {
  haut: Haut;
  loops: Loop[];
  pos: Float64Array;
  auswahl: Wahl[];
  ids: [number, number];
  maul: MaulZustand;
  pose: PoseStand;
  grund: { haut: Haut; pos: Float64Array; loops: Loop[] } | null;
  ruhe: RuheOffen | null;
};
const zurueck: Schnappschuss[] = [];
const kopieLoop = (l: Loop): Loop => ({
  ...l,
  ruhe: Float64Array.from(l.ruhe),
  punkte: l.punkte.map((p) => {
    const q = { ...p, ref: { ...p.ref }, cur: { ...p.cur } };
    if (p.ein) q.ein = { ...p.ein };
    if (p.aus) q.aus = { ...p.aus };
    return q;
  }),
});
const poseKopie = (p: PoseStand): PoseStand => ({ ...p, delta: p.delta ? Float64Array.from(p.delta) : null });
const schnappschuss = (): Schnappschuss => ({
  loops: loops.map(kopieLoop),
  haut,
  pos: Float64Array.from(haut.pos),
  auswahl: [...auswahl],
  ids: [naechsteId, naechsteKreuzung],
  maul: maul ? { ...maul } : null,
  pose: poseKopie(pose),
  grund: grund ? { haut: grund.haut, pos: Float64Array.from(grund.haut.pos), loops: grund.loops.map(kopieLoop) } : null,
  ruhe: ruheOffen ? { ...ruheOffen } : null,
});
/** Wiederherstellen samt Ziel: ein Schritt aus der Pose führt in die Pose zurück, einer aus der Grundform in die Grundform */
function wiederherstellen(s: Schnappschuss): void {
  loops = s.loops;
  haut = s.haut;
  haut.pos.set(s.pos);
  if (s.grund) {
    s.grund.haut.pos.set(s.grund.pos);
    grund = { haut: s.grund.haut, loops: s.grund.loops };
  } else grund = null;
  pose = s.pose;
  ruheOffen = s.ruhe ? { ...s.ruhe } : null;
  geometrieNeu();
  auswahl = s.auswahl;
  [naechsteId, naechsteKreuzung] = s.ids;
  maul = s.maul;
  reglerZeigen();
  allesZeigen();
}

const loopNr = (id: number): number => loops.findIndex((l) => l.id === id);
const lageAus = (L: Float64Array, i: number): V3 => ({ x: L[3 * i]!, y: L[3 * i + 1]!, z: L[3 * i + 2]! });
const spiegeln = (p: V3): V3 => ({ ...p, z: -p.z });
const abstand = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const abstandSym = (a: V3, b: V3): number => Math.min(abstand(a, b), abstand(a, spiegeln(b)));

/**
 * Kreuzungen suchen (nur mit `nur`, sonst alle Paare); neue werden Punkte auf beiden Loops. In der Grundform ist eine Kreuzung genau
 * ein Ort: Hat ein Loop schon einen Pfad, liegt der Punkt dort, wo er geteilt wird, und der andere bekommt denselben Ort (haben beide
 * einen, die Mitte; sonst kreuzten sich die zwei Pfade nicht genau, und die Haut an der Kreuzung hätte zwei Ziele).
 */
function kreuzungenSuchen(nur?: Loop): number {
  let zahl = 0;
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      const A = loops[i]!;
      const B = loops[j]!;
      if (nur && A !== nur && B !== nur) continue;
      for (const f of kreuzungenZwischen(A, A.ruhe, B, B.ruhe, TOL)) {
        const schon = A.punkte.some((p) => p.kreuzung !== undefined && abstand(p.ref, f.p) < 8 * TOL && B.punkte.some((q) => q.kreuzung === p.kreuzung));
        if (schon) continue;
        const k = naechsteKreuzung++;
        const ea = exakt(A);
        const eb = exakt(B);
        const pa = punktEinfuegen(A, f.sa, k, ea);
        const pb = punktEinfuegen(B, f.sb, k, eb);
        if (ea || eb) {
          const c = ea && eb ? { x: (pa.ref.x + pb.ref.x) / 2, y: (pa.ref.y + pb.ref.y) / 2, z: (pa.ref.z + pb.ref.z) / 2 } : ea ? pa.ref : pb.ref;
          for (const p of [pa, pb]) {
            p.ref = { ...c };
            p.cur = { ...c };
          }
        }
        zahl++;
      }
    }
  }
  return zahl;
}

// ---------- Darstellung ----------

const feld = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Feld fehlt: ${id}`);
  return e;
};
const felder = { seite: feld('feld-seite'), front: feld('feld-front'), top: feld('feld-top'), drei: feld('feld-3d') };
const blaetter: Record<Ansicht, SVGSVGElement> = {
  seite: document.getElementById('blatt-seite') as unknown as SVGSVGElement,
  front: document.getElementById('blatt-front') as unknown as SVGSVGElement,
  top: document.getElementById('blatt-top') as unknown as SVGSVGElement,
};
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;
const statusZeile = document.getElementById('status') as HTMLSpanElement;
const knopfLoop = document.getElementById('knopf-loop') as HTMLButtonElement;
const knopfO = document.getElementById('knopf-o') as HTMLButtonElement;

const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.autoClear = false;
const szene = new Scene();
const stufen = new DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, RedFormat);
stufen.minFilter = NearestFilter;
stufen.magFilter = NearestFilter;
stufen.needsUpdate = true;
const umrissMaterial = new ShaderMaterial({
  uniforms: { uBreite: { value: 2.5 }, uAufloesung: { value: new Vector2(1, 1) }, uFarbe: { value: new Color(TINTE) } },
  vertexShader: /* glsl */ `
    uniform float uBreite;
    uniform vec2 uAufloesung;
    void main() {
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      vec2 richtung = (projectionMatrix * vec4(n, 0.0)).xy;
      float l = length(richtung);
      richtung = l > 1e-9 ? richtung / l : vec2(0.0);
      float kipp = clamp(length(n.xy) / 0.35, 0.0, 1.0);
      clip.xy += richtung * kipp * uBreite * 2.0 / uAufloesung * clip.w;
      gl_Position = clip;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uFarbe;
    void main() { gl_FragColor = vec4(uFarbe, 1.0); }
  `,
  side: BackSide,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});
/** Kurven im 3D: Bänder mit fester Pixelbreite, sichtbar kräftig, verdeckt blass */
const bandMaterial = (farbe: number, deckung: number): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      uAufloesung: { value: new Vector2(1, 1) },
      uDpr: { value: 1 },
      uFarbe: { value: new Color(farbe) },
      uDeckung: { value: deckung },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aAnderer;
      attribute float aSeite;
      attribute float aRichtung;
      attribute float aBreite;
      uniform vec2 uAufloesung;
      uniform float uDpr;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(aAnderer, 1.0);
        vec2 d = (b.xy / b.w - a.xy / a.w) * uAufloesung;
        float l = length(d);
        d = l > 1e-6 ? d / l : vec2(1.0, 0.0);
        vec2 quer = vec2(-d.y, d.x) * aRichtung;
        a.xy += quer * aSeite * aBreite * uDpr / uAufloesung * a.w;
        gl_Position = a;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFarbe;
      uniform float uDeckung;
      void main() { gl_FragColor = vec4(uFarbe, uDeckung); }
    `,
    transparent: deckung < 1,
    depthWrite: false,
    depthFunc: deckung < 1 ? GreaterDepth : LessEqualDepth,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
// Kurven türkis, gewählte dunkler, Kanten schwarz und breit
const bandMaterialien = [
  bandMaterial(KURVE, 1),
  bandMaterial(KURVE, 0.25),
  bandMaterial(KURVE_WAHL, 1),
  bandMaterial(KURVE_WAHL, 0.3),
  bandMaterial(TINTE, 1),
  bandMaterial(TINTE, 0.3),
  bandMaterial(LIPPE, 1),
  bandMaterial(LIPPE, 0.3),
];

let hautGeometrie = new BufferGeometry();
let hautLagen = new Float32Array(0);
let hautNormalenPuffer = new Float32Array(0);
const koerper = new Mesh(hautGeometrie, new MeshToonMaterial({ color: KOERPER, gradientMap: stufen }));
const umriss = new Mesh(hautGeometrie, umrissMaterial);
/**
 * Anzeige wie Edge Crease mit Auto Smooth: Ein Netzpunkt auf einer harten Linie wird doppelt gezeigt, jede Seite der Linie mit
 * eigener Normale. Sonst mittelt die Schattierung über den Knick hinweg.
 */
let anzeigeQuelle = new Int32Array(0);
let anzeigeKante = new Float32Array(0);
let anzeigeIndex = new Uint32Array(0);
function teilungNeu(): void {
  const n = haut.n;
  const tri = haut.tri;
  const um: number[][] = Array.from({ length: n }, () => []);
  for (let f = 0; f < tri.length / 3; f++) for (let e = 0; e < 3; e++) um[tri[3 * f + e]!]!.push(f);
  const index = Uint32Array.from(tri);
  const quelle = Array.from({ length: n }, (_, i) => i);
  const kante: number[] = new Array<number>(n).fill(0);
  const hat = (f: number, x: number) => tri[3 * f] === x || tri[3 * f + 1] === x || tri[3 * f + 2] === x;
  /** Fächer um w von der Kante (w, vor) bis zur Kante (w, nach) = eine Seite; die andere Seite bekommt den Doppelpunkt */
  const teilen = (w: number, vor: number, nach: number, h: number) => {
    const faecher = um[w]!;
    const start = faecher.find((g) => hat(g, vor));
    if (start === undefined) return;
    let f: number = start;
    const seite = new Set<number>();
    let kommt = vor;
    for (let k = 0; k < faecher.length; k++) {
      seite.add(f);
      if (hat(f, nach)) break;
      const jetzt: number = f;
      const weiter: number = [tri[3 * jetzt]!, tri[3 * jetzt + 1]!, tri[3 * jetzt + 2]!].find((x) => x !== w && x !== kommt)!;
      const g: number | undefined = faecher.find((x) => x !== jetzt && hat(x, weiter));
      if (g === undefined) return;
      kommt = weiter;
      f = g;
    }
    if (seite.size === faecher.length) return;
    const d = quelle.length;
    quelle.push(w);
    kante.push(h);
    kante[w] = Math.max(kante[w]!, h);
    for (const g of faecher) if (!seite.has(g)) for (let e = 0; e < 3; e++) if (index[3 * g + e] === w) index[3 * g + e] = d;
  };
  for (const l of loops) {
    if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) continue;
    const hd = kanteBei(l, loops);
    const kette = l.proben.map((p) => p.ecken[0]);
    const m = kette.length;
    const zu = l.art !== 'ring';
    for (let j = 0; j < m; j++) {
      if (!hd[j]) continue;
      const h = 1;
      const w = kette[j]!;
      // an den Enden eines Rings geht die Linie in ihre Spiegelhälfte über
      const vor = j > 0 ? kette[j - 1]! : zu ? kette[m - 1]! : haut.spiegel[kette[1]!]!;
      const nach = j < m - 1 ? kette[j + 1]! : zu ? kette[0]! : haut.spiegel[kette[m - 2]!]!;
      teilen(w, vor, nach, h);
      const ws = haut.spiegel[w]!;
      if (l.art !== 'mitte' && ws >= 0 && ws !== w) teilen(ws, haut.spiegel[vor]!, haut.spiegel[nach]!, h);
    }
  }
  anzeigeQuelle = Int32Array.from(quelle);
  anzeigeKante = Float32Array.from(kante);
  anzeigeIndex = index;
}

/** Puffer für eine neue Haut oder neue Kanten (nach dem Einsetzen eines Loops, einer Kante oder ⌘Z) */
function geometrieNeu(): void {
  teilungNeu();
  const alt = hautGeometrie;
  hautGeometrie = new BufferGeometry();
  hautLagen = new Float32Array(3 * anzeigeQuelle.length);
  hautNormalenPuffer = new Float32Array(3 * anzeigeQuelle.length);
  hautGeometrie.setAttribute('position', new BufferAttribute(hautLagen, 3));
  hautGeometrie.setAttribute('normal', new BufferAttribute(hautNormalenPuffer, 3));
  hautGeometrie.setIndex(new BufferAttribute(anzeigeIndex, 1));
  koerper.geometry = hautGeometrie;
  umriss.geometry = hautGeometrie;
  alt.dispose();
}
geometrieNeu();
umriss.renderOrder = 1;
const baender = bandMaterialien.map((m, i) => {
  const b = new Mesh(new BufferGeometry(), m);
  b.renderOrder = 2 + i;
  return b;
});
const maulInnen = new Mesh(new BufferGeometry(), new MeshToonMaterial({ color: MAULFARBE, gradientMap: stufen }));
maulInnen.visible = false;
szene.add(koerper, umriss, maulInnen, ...baender);
const sonne = new DirectionalLight(0xffffff, 2.4);
sonne.position.set(0.9, 1.4, 1.1);
szene.add(sonne, new HemisphereLight(0xfff6e8, 0x9c8a74, 1.1));

const ortho = (x: number, y: number, zz: number, oben: [number, number, number]): OrthographicCamera => {
  const k = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  k.position.set(x, y, zz);
  k.up.set(...oben);
  k.lookAt(0, 0, 0);
  return k;
};
// Schnauze links: Seite von +z, Front von −x (vorn), Top von oben mit +z nach unten
const kameras: Record<Ansicht, OrthographicCamera> = {
  seite: ortho(0, 0, 3000, [0, 1, 0]),
  front: ortho(-3000, 0, 0, [0, 1, 0]),
  top: ortho(0, 3000, 0, [0, 0, -1]),
};
const dreiKamera = new PerspectiveCamera(30, 1, 20, 20000);
const steuerung = new OrbitControls(dreiKamera, felder.drei);
const BLICK = new Vector3(-0.5, 0.32, 0.8).normalize();
{
  const r = felder.drei.getBoundingClientRect();
  const fovV = (dreiKamera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (r.width / Math.max(1, r.height)));
  const abstand = (260 / Math.sin(Math.min(fovV, fovH) / 2)) * 1.12;
  dreiKamera.position.copy(BLICK).multiplyScalar(abstand);
  steuerung.target.set(0, 0, 0);
  steuerung.update();
}
let neuZeichnen = true;
steuerung.addEventListener('change', () => {
  neuZeichnen = true;
});

/**
 * Ausschnitt je Blatt: Mitte in Blattkoordinaten und Zoom (1 = SICHT Welteinheiten auf der kürzeren Seite der Seitenansicht, so
 * zeigen alle Blätter ungezoomt denselben Maßstab). Rad und Pinch zoomen zum Zeiger, zwei Finger und die mittlere Taste
 * verschieben, Pos1 setzt zurück.
 */
const ausschnitt: Record<Ansicht, { cx: number; cy: number; zoom: number }> = {
  seite: { cx: 0, cy: 0, zoom: 1 },
  front: { cx: 0, cy: 0, zoom: 1 },
  top: { cx: 0, cy: 0, zoom: 1 },
};
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 40;
/** Bildpunkte je Welteinheit im Blatt */
const skala = (a: Ansicht): number => {
  const r = felder.seite.getBoundingClientRect();
  return Math.max(1e-6, Math.min(r.width, r.height) / SICHT) * ausschnitt[a].zoom;
};

/** Weltpunkt → Blattkoordinaten (Welteinheiten, y nach unten) */
const imBlatt = (a: Ansicht, p: V3): [number, number] => (a === 'seite' ? [p.x, -p.y] : a === 'front' ? [p.z, -p.y] : [p.x, p.z]);
/** Verschiebung im Blatt → Verschiebung in der Welt */
const inWelt = (a: Ansicht, dx: number, dy: number): V3 =>
  a === 'seite' ? { x: dx, y: -dy, z: 0 } : a === 'front' ? { x: 0, y: -dy, z: dx } : { x: dx, y: 0, z: dy };
const blattPunkt = (a: Ansicht, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[a].getBoundingClientRect();
  const s = skala(a);
  return [(e.clientX - r.left - r.width / 2) / s + ausschnitt[a].cx, (e.clientY - r.top - r.height / 2) / s + ausschnitt[a].cy];
};

/** Zoom um den Faktor k, der Blattpunkt unter (clientX, clientY) bleibt stehen */
function zoomen(a: Ansicht, k: number, clientX: number, clientY: number): void {
  const v = ausschnitt[a];
  const vorher = blattPunkt(a, { clientX, clientY });
  v.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom * k));
  const nachher = blattPunkt(a, { clientX, clientY });
  v.cx += vorher[0] - nachher[0];
  v.cy += vorher[1] - nachher[1];
  ausschnittGeaendert(a);
}
/** Verschieben um Bildpunkte (wie das Papier unter dem Zeiger) */
function schieben(a: Ansicht, dx: number, dy: number): void {
  const s = skala(a);
  ausschnitt[a].cx -= dx / s;
  ausschnitt[a].cy -= dy / s;
  ausschnittGeaendert(a);
}
const NAMEN: Record<Ansicht, string> = { seite: 'Seite', front: 'Front', top: 'Top' };
function ausschnittGeaendert(a: Ansicht): void {
  const kopf = felder[a].querySelector('header');
  const z = ausschnitt[a].zoom;
  if (kopf) kopf.textContent = Math.abs(z - 1) < 1e-3 ? NAMEN[a] : `${NAMEN[a]} · ${Math.round(z * 100)} %`;
  blattZeichnen(a);
  neuZeichnen = true;
}

// ---------- Maul ----------

const maulRegler = document.getElementById('maul-oeffnung') as HTMLInputElement;
maulRegler.max = String(MAUL_WINKEL_MAX);
const kopfRegler = document.getElementById('kopf-oeffnung') as HTMLInputElement;
const knopfPose = document.getElementById('knopf-pose') as HTMLButtonElement;
/** zuletzt geschnittenes Maul der Grundform: gilt für diese Haut, diese Kette und diesen Mundwinkel, bei dieser Lage der Haut (`fp`) */
let maulStand: { haut: Haut; proben: Loop['proben']; ecke: number; fp: number; m: MaulAmLoop } | null = null;
/**
 * Das Maul, wie es gezeigt wird: der Schnitt der Grundform (Öffnung, Gewichte) und das Innere — in der Grundform zu, in der Pose aus
 * der Ruhe der Pose geschnitten und mit den Knochen gedreht.
 */
let maulGezeigt: { m: MaulAmLoop; innenPositionen: Float32Array; innenNormalen: Float32Array; innenIndizes: Uint32Array } | null = null;
let maulIndex: { aus: Uint32Array; offen: Uint8Array; index: Uint32Array } | null = null;

/** Fingerabdruck der Lagen: ändert sich die Haut, wird das Maul neu geschnitten */
function fingerabdruck(P: Float64Array): number {
  let f = 0;
  for (let i = 0; i < P.length; i++) f += P[i]! * ((i % 7) + 1);
  return f;
}

/** Probe des Mundwinkels: am Punkt `mundwinkel` (fehlt er, dort, wo der Loop am weitesten von der Mitte seiner Enden liegt) */
function mundwinkelVon(l: Loop): number {
  const p = l.punkte.find((q) => q.mundwinkel);
  if (!p) return mundwinkelProbe(l);
  let best = Infinity;
  let wo = -1;
  for (let i = 1; i < l.proben.length - 1; i++) {
    const d = Math.abs(l.s[i]! - p.s);
    if (d < best) {
      best = d;
      wo = i;
    }
  }
  return wo;
}

/**
 * Der Maulschnitt der Grundform (in der Pose die gemerkte Grundform): Öffnung und Gewichte der Knochen. Neu geschnitten wird nur,
 * wenn sich Haut, Kette, Mundwinkel oder Lagen geändert haben; in einem Zug in der Grundform gelten die Gewichte vom Anfang weiter
 * (nur Lagen und Inneres neu), danach wird ganz neu geschnitten.
 */
function maulAktuell(): MaulAmLoop | null {
  if (!maul) return null;
  const id = maul.id;
  const h = grund ? grund.haut : haut;
  const l = (grund ? grund.loops : loops).find((x) => x.id === id);
  if (!l || l.art !== 'ring') return null;
  const ecke = mundwinkelVon(l);
  const fp = fingerabdruck(h.pos);
  const st = maulStand;
  const gleich = st !== null && st.haut === h && st.proben === l.proben && st.ecke === ecke;
  if (gleich && st.fp === fp) return st.m;
  const imZug = gleich && zug !== null && !grund;
  const m = maulAmLoop(h, l, ecke, { zelle: MK / 2, wieVorher: imZug ? st.m : null });
  maulStand = m ? { haut: h, proben: l.proben, ecke, fp: imZug ? st.fp : fp, m } : null;
  return m;
}

/** Die gezeigten Dreiecke ohne die Öffnung (je Dreieck des Netzes eins in `anzeigeIndex`) */
function indexOhneOeffnung(offen: Uint8Array): Uint32Array {
  if (maulIndex && maulIndex.aus === anzeigeIndex && maulIndex.offen === offen) return maulIndex.index;
  const I = anzeigeIndex;
  const neu: number[] = [];
  for (let f = 0; f < I.length / 3; f++) if (!offen[f]) neu.push(I[3 * f]!, I[3 * f + 1]!, I[3 * f + 2]!);
  maulIndex = { aus: anzeigeIndex, offen, index: new Uint32Array(neu) };
  return maulIndex.index;
}

/** Inneres zeigen (oder verstecken) */
function innenZeigen(): void {
  const o = maulGezeigt;
  maulInnen.visible = o !== null;
  if (!o) return;
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(o.innenPositionen, 3));
  g.setAttribute('normal', new BufferAttribute(o.innenNormalen, 3));
  g.setIndex(new BufferAttribute(o.innenIndizes, 1));
  g.computeBoundingSphere();
  maulInnen.geometry.dispose();
  maulInnen.geometry = g;
}

/**
 * Das Maul anlegen, falls es noch keins gibt: am gewählten Ring (eine schmale Form, mit F über die Mitte oder vorn über den Umriss
 * gezeichnet). Sein Mundwinkel wird ein Punkt (Ecke ◆): der vorhandene an der Stelle, die am weitesten von der Mitte der beiden
 * Enden liegt, sonst ein neuer.
 */
function maulAnlegen(): boolean {
  if (maul && loops[loopNr(maul.id)]?.art === 'ring') return true;
  const l = auswahl.map((w) => loops[loopNr(w.l)]).find((x) => x?.art === 'ring');
  if (!l) {
    meldung = 'Kein Maul: erst mit F eine schmale Form ums Maul zeichnen (vorn über den Umriss oder über die Mitte) und wählen';
    maul = null;
    return false;
  }
  const s = l.s[mundwinkelProbe(l)]!;
  const p = l.punkte.find((q) => Math.abs(q.s - s) < MK) ?? punktEinfuegen(l, s, undefined, exakt(l));
  p.mundwinkel = true;
  if (p.ecke === undefined) p.ecke = true;
  maul = { id: l.id };
  meldung = '';
  return true;
}

// ---------- Fressen-Pose ----------

/**
 * Knochen der Pose: der Maulschnitt der Grundform (seine Gewichte), der Drehwinkel je Punkt und das Gelenk. Das Gelenk ist der
 * Mundwinkel, wie er jetzt liegt (er dreht selbst nicht mit: in der Pose liegt er dort, wo in ihrer Ruhe).
 */
function poseKnochen(): { m: MaulAmLoop; theta: Float64Array; G: V2; l: Loop; ecke: number } | null {
  const m = maulAktuell();
  if (!m || !maul) return null;
  const l = loops[loopNr(maul.id)];
  if (!l) return null;
  const ecke = mundwinkelVon(l);
  const v = l.proben[ecke]!.ecken[0];
  return { m, theta: knochenWinkel(m, pose), G: { x: haut.pos[3 * v]!, y: haut.pos[3 * v + 1]! }, l, ecke };
}

/**
 * In die Pose: Die Grundform wird gemerkt; gezeigt und bearbeitet wird die Pose, wie sie zu sehen ist (Grundform + Blendshape, mit
 * den Knochen gedreht). Die Loops sind Kopien mit derselben Kette.
 */
function poseBetreten(): boolean {
  if (grund) return true;
  if (!maulAnlegen()) return false;
  const m = maulAktuell();
  const l = maul ? loops[loopNr(maul.id)] : undefined;
  if (!m || !l) {
    meldung = 'Das Maul schneidet nicht (ist die Form als Kette ins Netz eingesetzt?)';
    return false;
  }
  const v = l.proben[mundwinkelVon(l)]!.ecken[0];
  const d = pose.delta && pose.delta.length === haut.pos.length ? pose.delta : null;
  const ruhe = d ? Float64Array.from(haut.pos, (x, i) => x + d[i]!) : Float64Array.from(haut.pos);
  const g = { haut, loops };
  grund = g;
  haut = { ...g.haut, pos: knochenDrehen(ruhe, knochenWinkel(m, pose), { x: ruhe[3 * v]!, y: ruhe[3 * v + 1]! }) };
  loops = g.loops.map((x) => {
    const c = kopieLoop(x);
    festlegen(haut, c);
    // die Griffe der gedrehten Linien (ohne neue Ecken: was in der Pose knickt, gehört der Pose)
    if (hatGriffe(c)) griffeAnlegen(c, c.ruhe);
    return c;
  });
  geometrieNeu();
  meldung = '';
  return true;
}

/** Nach einem Schritt in der Pose: Blendshape (zurückgedreht minus Grundform) merken */
function poseSichern(): void {
  if (!grund) return;
  const k = poseKnochen();
  if (!k) return;
  const ruhe = knochenDrehen(haut.pos, k.theta, k.G, true);
  const d = new Float64Array(ruhe.length);
  for (let i = 0; i < d.length; i++) d[i] = ruhe[i]! - grund.haut.pos[i]!;
  pose.delta = d;
}

/**
 * Loops der Grundform aus denen der Pose: dieselbe Kette und dieselben Punkte, Lagen der Grundform. Griffe: wo der Punkt in der
 * Grundform schon war, seine (`alt`); neue Punkte und die Nachbarn gelöschter lesen sie aus der Linie der Grundform ab.
 */
function grundLoopsAus(h: Haut, alt: readonly Loop[]): Loop[] {
  return loops.map((l) => {
    const c = kopieLoop(l);
    festlegen(h, c);
    if (!hatGriffe(c)) return c;
    const vorher = alt.find((x) => x.id === c.id);
    const eps = 1e-6 * Math.max(1, c.laenge);
    const neu = new Set<number>();
    c.punkte.forEach((p, i) => {
      const q = vorher?.punkte.find((x) => Math.abs(x.s - p.s) <= eps && x.ein && x.aus);
      if (q) {
        p.ein = { ...q.ein! };
        p.aus = { ...q.aus! };
        // und ihren Ort (die Linie der Grundform liegt genau auf ihrem Pfad; von ihr abgelesen wanderte er um den Rest des Lösers)
        p.ref = { ...q.ref };
        p.cur = { ...q.ref };
      } else neu.add(i);
    });
    // in der Pose gelöschte Punkte: ihre Nachbarn neu
    for (const q of vorher?.punkte ?? []) {
      if (c.punkte.some((p) => Math.abs(p.s - q.s) <= eps)) continue;
      const nach = c.punkte.findIndex((p) => p.s > q.s);
      const m = c.punkte.length;
      if (nach >= 0) neu.add(nach);
      neu.add(nach > 0 ? nach - 1 : m - 1);
    }
    if (neu.size) griffeErgaenzen(c, c.ruhe, neu);
    return c;
  });
}

/** Zurück in die Grundform: Was in der Pose an Punkten, Ecken, Kanten oder Loops dazukam, gilt dort auch (die Form bleibt). */
function poseVerlassen(): void {
  if (!grund) return;
  poseSichern();
  const basis = grund.haut;
  loops = grundLoopsAus(basis, grund.loops);
  haut = basis;
  grund = null;
  geometrieNeu();
  // was in der Pose an Punkten oder Loops dazukam, liest seine Griffe an der Linie der Grundform ab: auch diese Linien genau auf ihren Pfad
  linienAufPfad();
}

/** Zuordnung für ein Netz, das nur gewachsen ist: die alten Punkte bleiben vorn, neue ab `nAlt` */
const nurGewachsen = (n: number, nAlt: number): Int32Array => Int32Array.from({ length: n }, (_, i) => (i < nAlt ? i : -1));

/**
 * Das Netz hat sich geändert (verdichtet, zu kurze Kanten zusammengelegt, Loop eingesetzt). `alt`: je neuer Punkt seine Nummer im
 * alten Netz (−1: neu); die gebliebenen alten stehen vorn in ihrer Reihenfolge. In der Pose bekommt die Grundform dieselben Punkte —
 * die alten bleiben, wo sie sind, die neuen liegen dort, wo sie in der Pose liegen, zurückgedreht und um den Blendshape ihrer
 * Nachbarn verschoben. In der Grundform bekommt der Blendshape Werte für die neuen Punkte. `vorher`: Knochen vor der Änderung.
 */
function netzGewachsen(nAlt: number, alt: Int32Array, vorher: { theta: Float64Array; G: V2 } | null): void {
  let m = 0;
  while (m < alt.length && alt[m]! >= 0) m++;
  /** Werte je alter Punkt (k je Punkt) in der neuen Reihenfolge der gebliebenen */
  const umordnen = (w: ArrayLike<number>, k: number): Float64Array => {
    const out = new Float64Array(k * m);
    for (let i = 0; i < m; i++) for (let c = 0; c < k; c++) out[k * i + c] = w[k * alt[i]! + c]!;
    return out;
  };
  const g = grund;
  if (g && vorher) {
    const theta = ergaenzen(haut, umordnen(vorher.theta, 1), m, 1);
    const ruhe = knochenDrehen(haut.pos, theta, vorher.G, true);
    const dAlt = umordnen(g.haut.pos, 3);
    for (let i = 0; i < dAlt.length; i++) dAlt[i] = ruhe[i]! - dAlt[i]!;
    const d = ergaenzen(haut, dAlt, m, 3, true);
    const basis = Float64Array.from(ruhe, (x, i) => x - d[i]!);
    const gh: Haut = { pos: basis, tri: haut.tri, n: haut.n, nachbarn: haut.nachbarn, spiegel: haut.spiegel };
    grund = { haut: gh, loops: grundLoopsAus(gh, g.loops) };
    pose.delta = d;
    // die Gewichte gelten für das neue Netz (neu geschnitten); die Pose daraus neu gedreht
    const k = poseKnochen();
    if (k) haut.pos.set(knochenDrehen(ruhe, k.theta, k.G));
    for (const l of loops) festlegen(haut, l);
  } else if (pose.delta && pose.delta.length === 3 * nAlt) pose.delta = ergaenzen(haut, umordnen(pose.delta, 3), m, 3, true);
}

/** Knochen setzen (Grad); in die Pose, falls nötig. Die Ruhe der Pose bleibt, die Pose wird neu gedreht. */
function knochenSetzen(kiefer: number, schaedel: number): boolean {
  if (!poseBetreten()) return false;
  const vor = poseKnochen();
  if (!vor) return false;
  const ruhe = knochenDrehen(haut.pos, vor.theta, vor.G, true);
  pose.kiefer = kiefer;
  pose.schaedel = schaedel;
  haut.pos.set(knochenDrehen(ruhe, knochenWinkel(vor.m, pose), vor.G));
  for (const l of loops) {
    festlegen(haut, l);
    // die Linien sind mitgedreht: ihre Griffe auch (neu abgelesen)
    if (hatGriffe(l)) griffeAnlegen(l, l.ruhe);
  }
  return true;
}

/** Regler und Knopf nach dem Stand der Pose */
function reglerZeigen(): void {
  maulRegler.value = String(pose.kiefer);
  kopfRegler.value = String(pose.schaedel);
  knopfPose.setAttribute('aria-pressed', String(grund !== null));
}

let vorRegler: Schnappschuss | null = null;
for (const r of [maulRegler, kopfRegler]) {
  r.addEventListener('pointerdown', () => {
    vorRegler = schnappschuss();
  });
  r.addEventListener('input', () => {
    vorRegler ??= schnappschuss();
    if (!knochenSetzen(Number(maulRegler.value), Number(kopfRegler.value))) {
      reglerZeigen();
      statusZeigen();
      return;
    }
    reglerZeigen();
    hautZeigen();
    baenderZeigen();
    for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
    statusZeigen();
  });
  r.addEventListener('change', () => {
    const v = vorRegler;
    vorRegler = null;
    const anders = v && (v.pose.kiefer !== pose.kiefer || v.pose.schaedel !== pose.schaedel || (v.grund === null) !== (grund === null) || JSON.stringify(v.maul) !== JSON.stringify(maul));
    if (v && anders) zurueck.push(v);
    allesZeigen();
  });
}
knopfPose.addEventListener('click', () => {
  if (zug) return;
  if (grund) poseVerlassen();
  else poseBetreten();
  reglerZeigen();
  allesZeigen();
});

/** die Normalen der Haut, wie sie zuletzt gezeigt wurde (für das Maß, ob die Form noch in Bewegung ist: `rundeMitWeg`) */
let normalenGezeigt: { haut: Haut; nor: Float64Array } | null = null;
function hautZeigen(): void {
  const m = maulAktuell();
  maulGezeigt = null;
  if (m && maul) {
    if (grund) {
      // das Innere aus der Ruhe der Pose geschnitten (die Gewichte der Grundform gelten weiter), dann mit den Knochen gedreht
      const k = poseKnochen();
      const mr = k ? maulAmLoop({ ...haut, pos: knochenDrehen(haut.pos, k.theta, k.G, true) }, k.l, k.ecke, { zelle: MK / 2, wieVorher: m }) : null;
      if (mr) {
        mr.drehsinn = m.drehsinn;
        const innen = innenPosieren(mr, pose);
        maulGezeigt = { m, innenPositionen: innen.positionen, innenNormalen: innen.normalen, innenIndizes: mr.innen.indizes };
      }
    } else maulGezeigt = { m, innenPositionen: m.innen.positionen, innenNormalen: m.innen.normalen, innenIndizes: m.innen.indizes };
  }
  innenZeigen();
  const nor = hautNormalen(haut);
  normalenGezeigt = { haut, nor };
  const P = haut.pos;
  const I = maulGezeigt ? indexOhneOeffnung(maulGezeigt.m.offen) : anzeigeIndex;
  if (hautGeometrie.index?.array !== I) hautGeometrie.setIndex(new BufferAttribute(I, 1));
  const N = anzeigeQuelle.length;
  // Normale je gezeigtem Punkt aus seinen Dreiecken (bei doppelten nur die seiner Seite)
  const eigen = new Float64Array(3 * N);
  for (let f = 0; f < I.length / 3; f++) {
    const [a, b, c] = [anzeigeQuelle[I[3 * f]!]!, anzeigeQuelle[I[3 * f + 1]!]!, anzeigeQuelle[I[3 * f + 2]!]!];
    const abx = P[3 * b]! - P[3 * a]!;
    const aby = P[3 * b + 1]! - P[3 * a + 1]!;
    const abz = P[3 * b + 2]! - P[3 * a + 2]!;
    const acx = P[3 * c]! - P[3 * a]!;
    const acy = P[3 * c + 1]! - P[3 * a + 1]!;
    const acz = P[3 * c + 2]! - P[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    for (let e = 0; e < 3; e++) {
      const d = I[3 * f + e]!;
      eigen[3 * d] = eigen[3 * d]! + fx;
      eigen[3 * d + 1] = eigen[3 * d + 1]! + fy;
      eigen[3 * d + 2] = eigen[3 * d + 2]! + fz;
    }
  }
  for (let d = 0; d < N; d++) {
    const q = anzeigeQuelle[d]!;
    const h = anzeigeKante[d]!;
    const el = Math.hypot(eigen[3 * d]!, eigen[3 * d + 1]!, eigen[3 * d + 2]!) || 1;
    let nx = (1 - h) * nor[3 * q]! + (h * eigen[3 * d]!) / el;
    let ny = (1 - h) * nor[3 * q + 1]! + (h * eigen[3 * d + 1]!) / el;
    let nz = (1 - h) * nor[3 * q + 2]! + (h * eigen[3 * d + 2]!) / el;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    hautLagen[3 * d] = P[3 * q]!;
    hautLagen[3 * d + 1] = P[3 * q + 1]!;
    hautLagen[3 * d + 2] = P[3 * q + 2]!;
    hautNormalenPuffer[3 * d] = nx;
    hautNormalenPuffer[3 * d + 1] = ny;
    hautNormalenPuffer[3 * d + 2] = nz;
  }
  hautGeometrie.attributes.position!.needsUpdate = true;
  hautGeometrie.attributes.normal!.needsUpdate = true;
  hautGeometrie.computeBoundingSphere();
  neuZeichnen = true;
}

function bandGeometrie(linien: readonly { p: readonly V3[]; breite: number }[]): BufferGeometry {
  const pos: number[] = [];
  const anderer: number[] = [];
  const seite: number[] = [];
  const richtung: number[] = [];
  const breite: number[] = [];
  const ind: number[] = [];
  for (const l of linien) {
    for (let i = 0; i + 1 < l.p.length; i++) {
      const a = l.p[i]!;
      const b = l.p[i + 1]!;
      const v = pos.length / 3;
      for (const [p, q, r] of [
        [a, b, 1],
        [b, a, -1],
      ] as const) {
        for (const sd of [1, -1]) {
          pos.push(p.x, p.y, p.z);
          anderer.push(q.x, q.y, q.z);
          seite.push(sd);
          richtung.push(r);
          breite.push(l.breite);
        }
      }
      ind.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aAnderer', new BufferAttribute(new Float32Array(anderer), 3));
  g.setAttribute('aSeite', new BufferAttribute(new Float32Array(seite), 1));
  g.setAttribute('aRichtung', new BufferAttribute(new Float32Array(richtung), 1));
  g.setAttribute('aBreite', new BufferAttribute(new Float32Array(breite), 1));
  g.setIndex(ind);
  return g;
}

const knopfForm = document.getElementById('knopf-form') as HTMLButtonElement;
const knopfStift = document.getElementById('knopf-stift') as HTMLButtonElement;
/** Blattkoordinaten → (u, v) des Kerns: Seite (x, y), Front (z, y), Top (x, z) */
const uvAus = (a: Ansicht, X: number, Y: number): [number, number] => (a === 'top' ? [X, Y] : [X, -Y]);

/** Linien eines Loops zum Zeichnen: Ring = gespeicherte Hälfte und Spiegelhälfte, Paar = Loop und Zwilling, Mitte geschlossen */
function linienVon(l: Loop, L: Float64Array): V3[][] {
  const p = Array.from({ length: l.proben.length }, (_, i) => lageAus(L, i));
  if (l.art === 'ring') return [p, p.map(spiegeln)];
  if (l.art === 'mitte') return [[...p, p[0]!]];
  const zu = [...p, p[0]!];
  return [zu, zu.map(spiegeln)];
}

const aktuelleLagen = (): Float64Array[] => (zug ? zug.lagen : loops.map((l) => l.ruhe));

/** Lage einer Probe zum Zeigen (Grundform und Pose liegen so, wie sie zu sehen sind); `sp`: Spiegelhälfte bzw. Zwilling */
function zeigeLage(L: Float64Array, i: number, sp: boolean): V3 {
  const p = lageAus(L, i);
  return sp ? spiegeln(p) : p;
}

/** Liegt die Strecke zwischen zwei Proben in der Öffnung des Mauls (dann wird sie nicht gezeigt)? */
function streckeOffen(l: Loop, j: number, k: number, sp: boolean): boolean {
  const o = maulGezeigt;
  if (!o) return false;
  const a = l.proben[j]!;
  const b = l.proben[k]!;
  if (a.ecken[0] !== a.ecken[1] || a.ecken[1] !== a.ecken[2] || b.ecken[0] !== b.ecken[1] || b.ecken[1] !== b.ecken[2]) return false;
  const u = sp ? haut.spiegel[a.ecken[0]]! : a.ecken[0];
  const v = sp ? haut.spiegel[b.ecken[0]]! : b.ecken[0];
  if (u < 0 || v < 0) return false;
  return o.m.kantenOffen.has(u < v ? u * haut.n + v : v * haut.n + u);
}

function baenderZeigen(): void {
  const lagen = aktuelleLagen();
  const normal: { p: V3[]; breite: number }[] = [];
  const gewaehlt: { p: V3[]; breite: number }[] = [];
  const lippe: { p: V3[]; breite: number }[] = [];
  // Kanten: je Strecke ein breites Band (Spiegelhälfte und Zwilling ebenso)
  const hart: { p: V3[]; breite: number }[] = [];
  loops.forEach((l, li) => {
    const L = lagen[li]!;
    const gew = auswahl.some((w) => w.l === l.id);
    const ziel = gew ? gewaehlt : maul?.id === l.id ? lippe : normal;
    const hd = kanteBei(l, loops);
    const n = l.proben.length;
    // Ring: gespeicherte Hälfte und Spiegelhälfte, Paar: Loop und Zwilling, Mitte geschlossen
    for (const sp of l.art === 'mitte' ? [false] : [false, true]) {
      const pkt = Array.from({ length: n }, (_, i) => zeigeLage(L, i, sp));
      let lauf: V3[] = [];
      const schluss = () => {
        if (lauf.length > 1) ziel.push({ p: lauf, breite: gew ? 3 : 2 });
        lauf = [];
      };
      for (let j = 0; j < (l.art === 'ring' ? n - 1 : n); j++) {
        const k = (j + 1) % n;
        if (streckeOffen(l, j, k, sp)) {
          schluss();
          continue;
        }
        if (lauf.length === 0) lauf.push(pkt[j]!);
        lauf.push(pkt[k]!);
        if (hd[j] && hd[k]) hart.push({ p: [pkt[j]!, pkt[k]!], breite: 4 });
      }
      schluss();
    }
  });
  const gN = bandGeometrie(normal);
  const gW = bandGeometrie(gewaehlt);
  const gH = bandGeometrie(hart);
  const gL = bandGeometrie(lippe);
  for (const [i, g] of [gN, gN, gW, gW, gH, gH, gL, gL].entries()) {
    baender[i]!.geometry.dispose();
    baender[i]!.geometry = g;
  }
  neuZeichnen = true;
}

const NS = 'http://www.w3.org/2000/svg';
const element = (art: string, klasse: string, attr: Record<string, string | number>): SVGElement => {
  const e = document.createElementNS(NS, art);
  e.setAttribute('class', klasse);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  return e;
};
const pfad = (a: Ansicht, p: readonly V3[]): string =>
  p
    .map((q, i) => {
      const [x, y] = imBlatt(a, q);
      return `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
const plus3 = (p: V3, v: V3): V3 => ({ x: p.x + v.x, y: p.y + v.y, z: p.z + v.z });
/**
 * Der Bézier-Pfad eines Loops im Blatt (08.11., Florian: „Die Linie wird ganz kantig. Der Punkt sitzt nicht mehr exakt auf der Linie“):
 * Das Blatt bildet linear ab, ein Bézier-Stück bleibt ein Bézier-Stück aus den abgebildeten Punkten und Griffen. So ist die Linie bei
 * jedem Zoom glatt und läuft genau durch ihre Punkte wie in Illustrator; das Netz liegt höchstens `GENAU` daneben. `sp`: Spiegelhälfte
 * bzw. Zwilling. Ein Ring läuft vom ersten zum letzten Punkt (seine Enden sind Punkte), ein geschlossener Loop ringsum.
 * Während eines Zugs (10.11., Gegenprüfung Schritt G2) derselbe Pfad aus den Punkten, wo sie gerade sind, und den Griffen, wie sie
 * danach sind (`zug.griffeNeu`, `li` = Nummer des Loops): Die Linie ist im Zug und nach dem Loslassen dieselbe Kurve; vorher zeigte
 * das Blatt im Zug einen Streckenzug durch die Proben.
 */
function pfadKurven(a: Ansicht, l: Loop, sp: boolean, li = -1): string {
  const P = l.punkte;
  const m = P.length;
  const zu = l.art !== 'ring';
  const B = (v: V3): string => {
    const [x, y] = imBlatt(a, sp ? spiegeln(v) : v);
    return `${x.toFixed(3)} ${y.toFixed(3)}`;
  };
  const neu = zug && li >= 0 ? zug.griffeNeu[li] : null;
  const ort = (p: LoopPunkt): V3 => (zug && !zug.griff ? p.cur : p.ref);
  let d = `M ${B(ort(P[0]!))}`;
  for (let i = 0; i < (zu ? m : m - 1); i++) {
    const k = (i + 1) % m;
    const A = P[i]!;
    const E = P[k]!;
    d += ` C ${B(plus3(ort(A), neu?.[i]?.aus ?? A.aus!))} ${B(plus3(ort(E), neu?.[k]?.ein ?? E.ein!))} ${B(ort(E))}`;
  }
  return zu ? `${d} Z` : d;
}

/** Mitte der Auswahl (für den Einflusskreis) */
function auswahlMitte(): V3 | null {
  const q: V3[] = [];
  for (const w of auswahl) {
    const l = loops[loopNr(w.l)];
    if (!l) continue;
    if (w.i >= 0) {
      const p = l.punkte[w.i];
      if (p) q.push(zug ? p.cur : p.ref);
    } else {
      const L = aktuelleLagen()[loopNr(w.l)]!;
      for (let j = 0; j < l.proben.length; j++) q.push(lageAus(L, j));
    }
  }
  if (q.length === 0) return null;
  const m = q.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }), { x: 0, y: 0, z: 0 });
  return { x: m.x / q.length, y: m.y / q.length, z: m.z / q.length };
}

/**
 * Griffe zum Zeigen: die der gewählten Punkte, an einer gewählten Kreuzung auch die des anderen Loops (relativ zum Punkt). Die
 * gespeicherten; während eines Zugs, wie sie danach sind, den gerade gezogenen Griff genau (gespeichert + Versatz).
 * Griffe werden in wahrer Länge gezeigt, wie in Illustrator (Florian, 10.11.: „Die Griffe bleiben in wahrer Länge wie in
 * Illustrator“): Die Spitze ist der Kontrollpunkt der Kurve, die Maus wirkt 1:1, beim Loslassen ändert sich nichts. Bis zum 10.11.
 * wurden kurze Griffe auf mindestens 28 px gestreckt gezeigt, mit einem Faktor je Punkt, der nach jedem Zug neu gerechnet wurde
 * (die Spitze sprang, in der Probe um 42 px).
 */
function griffeZumZeigen(): { li: number; i: number; ein: V3 | null; aus: V3 | null }[] {
  const wahl: { li: number; i: number }[] = [];
  const kreuz = new Set<number>();
  for (const w of auswahl) {
    const li = loopNr(w.l);
    const p = loops[li]?.punkte[w.i];
    if (w.i < 0 || !p) continue;
    wahl.push({ li, i: w.i });
    if (p.kreuzung !== undefined) kreuz.add(p.kreuzung);
  }
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      if (p.kreuzung !== undefined && kreuz.has(p.kreuzung) && !wahl.some((x) => x.li === li && x.i === i)) wahl.push({ li, i });
    }),
  );
  const plus = (a: V3 | null, b: V3 | undefined): V3 | null => (a && b ? { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z } : a);
  return wahl.map(({ li, i }) => {
    const l = loops[li]!;
    const g = zug?.griff;
    // gespeicherte Griffe: während eines Zugs, wie sie danach sind
    const neu = zug?.griffeNeu[li]?.[i];
    if (neu && hatGriffe(l)) return { li, i, ein: neu.ein, aus: neu.aus };
    if (g && g.li === li && g.i === i) {
      const r = griffeBei(l, i);
      return { li, i, ein: plus(r.ein, zug!.griffVersatz.ein), aus: plus(r.aus, zug!.griffVersatz.aus) };
    }
    return { li, i, ...griffeBei(l, i) };
  });
}

let entwurf: { a: Ansicht; x0: number; y0: number; x1: number; y1: number } | null = null;
let spur: { a: Ansicht; p: [number, number][] } | null = null;

function blattZeichnen(a: Ansicht): void {
  const el = blaetter[a];
  const r = felder[a].getBoundingClientRect();
  const s = skala(a);
  const w = r.width / s;
  const h = r.height / s;
  const { cx, cy } = ausschnitt[a];
  el.setAttribute('viewBox', `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);
  el.classList.toggle('loop', modus === 'loop');
  el.classList.toggle('form', modus === 'form');
  el.replaceChildren();
  const rp = 4.5 / s;
  const lagen = aktuelleLagen();
  loops.forEach((l, li) => {
    const gew = auswahl.some((x) => x.l === l.id);
    linienVon(l, lagen[li]!).forEach((pts, m) => {
      // in der Seite liegen Spiegelhälfte und Zwilling genau hinter dem Gespeicherten
      if (m === 1 && a === 'seite') return;
      // in der Grundform der Bézier-Pfad (die Linie ist ihr Pfad), auch während eines Zugs; in der Pose und ohne Pfad die Linie,
      // wie sie gerade liegt
      const d = exakt(l) ? pfadKurven(a, l, m === 1, li) : pfad(a, pts);
      el.append(element('path', `kurve${gew ? ' gewaehlt' : ''}${maul?.id === l.id ? ' maul' : ''}${m ? ' spiegel' : ''}`, { d }));
      const t = element('path', 'kurve-treffer', { d });
      t.setAttribute('data-l', String(l.id));
      if (m) t.setAttribute('data-m', '1');
      el.append(t);
    });
  });
  // Kanten schwarz und breit
  loops.forEach((l, li) => {
    const hd = kanteBei(l, loops);
    const L = lagen[li]!;
    const n = l.proben.length;
    for (const m of a === 'seite' || l.art === 'mitte' ? [false] : [false, true]) {
      for (let j = 0; j < (l.art === 'ring' ? n - 1 : n); j++) {
        const k = (j + 1) % n;
        if (!hd[j] || !hd[k]) continue;
        const p = lageAus(L, j);
        const q = lageAus(L, k);
        const [x1, y1] = imBlatt(a, m ? spiegeln(p) : p);
        const [x2, y2] = imBlatt(a, m ? spiegeln(q) : q);
        el.append(element('line', `kante-hart${m ? ' spiegel' : ''}`, { x1, y1, x2, y2 }));
      }
    }
  });
  // Griffe der gewählten Punkte: Linie vom Punkt zur Spitze, Spitze als kleines Quadrat (unter den Punkten)
  for (const { li, i, ein, aus } of griffeZumZeigen()) {
    const l = loops[li]!;
    const p = l.punkte[i]!;
    const q = zug && !zug.griff ? p.cur : p.ref;
    const [px, py] = imBlatt(a, q);
    for (const [seite, v] of [
      ['ein', ein],
      ['aus', aus],
    ] as const) {
      // ein Griff der Länge null (Ecke, mit dem Stift geklickt) ist nicht zu sehen
      if (!v || Math.hypot(v.x, v.y, v.z) < 1e-9) continue;
      const [gx, gy] = imBlatt(a, { x: q.x + v.x, y: q.y + v.y, z: q.z + v.z });
      el.append(element('line', 'griff-linie', { x1: px, y1: py, x2: gx, y2: gy }));
      const g = element('rect', 'griff', { x: gx - rp * 0.75, y: gy - rp * 0.75, width: rp * 1.5, height: rp * 1.5 });
      g.setAttribute('data-l', String(l.id));
      g.setAttribute('data-i', String(i));
      g.setAttribute('data-g', seite);
      el.append(g);
    }
  }
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      // ein Ende von selbst (Ring ohne Kreuzung dort) hält nur Griffe: nicht zu sehen, nicht zu greifen
      if (!istSichtbar(p)) return;
      const q = zug ? p.cur : p.ref;
      for (const m of a === 'seite' || Math.abs(q.z) < 1e-6 ? [false] : [false, true]) {
        const [x, y] = imBlatt(a, m ? spiegeln(q) : q);
        const gew = auswahl.some((x2) => x2.l === l.id && x2.i === i);
        const kreuz = p.kreuzung !== undefined;
        const klasse = `kpunkt${kreuz ? ' kreuz' : ''}${gew ? ' gewaehlt' : ''}${m ? ' spiegel' : ''}`;
        const r = kreuz ? rp * 1.2 : rp;
        // Ecke als Raute, glatt als Kreis (an einer Kreuzung: Ecke, sobald einer ihrer Loops dort eine hat)
        const c = eckeGezeigt(li, i)
          ? element('polygon', `${klasse} ecke`, { points: `${x},${y - 1.35 * r} ${x + 1.35 * r},${y} ${x},${y + 1.35 * r} ${x - 1.35 * r},${y}` })
          : element('circle', klasse, { cx: x, cy: y, r });
        c.setAttribute('data-l', String(l.id));
        c.setAttribute('data-i', String(i));
        if (m) c.setAttribute('data-m', '1');
        el.append(c);
      }
    }),
  );
  if (oAn) {
    const c = zug?.mitte ?? auswahlMitte();
    if (c) {
      const [x, y] = imBlatt(a, c);
      el.append(element('circle', 'einfluss', { cx: x, cy: y, r: radius }));
    }
  }
  if (entwurf && entwurf.a === a) el.append(element('line', 'entwurf', { x1: entwurf.x0, y1: entwurf.y0, x2: entwurf.x1, y2: entwurf.y1 }));
  if (spur && spur.a === a) el.append(element('polyline', 'entwurf', { points: spur.p.map((q) => q.join(',')).join(' ') }));
  if (stift && stift.a === a) stiftZeichnen(el, a, rp);
}

function allesZeigen(): void {
  // ist der Loop des Mauls gelöscht, ist auch das Maul weg
  if (maul && loopNr(maul.id) < 0) {
    poseVerlassen();
    maul = null;
    reglerZeigen();
  }
  // Ecken an Kreuzungen mit Kanten folgen den Kanten und den Kreuzungen
  eckenAuto(loops);
  hautZeigen();
  baenderZeigen();
  for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
  knopfLoop.setAttribute('aria-pressed', String(modus === 'loop'));
  knopfForm.setAttribute('aria-pressed', String(modus === 'form'));
  knopfStift.setAttribute('aria-pressed', String(modus === 'stift'));
  knopfO.setAttribute('aria-pressed', String(oAn));
  knopfO.textContent = oAn ? `Einfluss O · ${Math.round(radius)}` : 'Einfluss O';
  statusZeigen();
  vorrechnenPlanen();
}

/**
 * Über die ganze Haut hängt die Matrix des Lösers nur am Netz, an den Gewichten und an den Loops, nicht an den Lagen. Nach jeder
 * Änderung wird sie deshalb schon vorgerechnet, sobald nichts gezogen wird (der Kern merkt sie sich): Das nächste Greifen findet
 * sie fertig (gemessen 7–31 ms statt 0,3–1,5 s bei 5 000–28 000 Punkten). Greift man, bevor sie fertig ist, wartet das Greifen
 * nur noch den Rest. Hat ein Zug verdichtet, setzt sich das neue Netz dabei auch gleich (`nachLoesenOffen`).
 */
let vorrechnenUhr: ReturnType<typeof setTimeout> | null = null;
/** das verdichtete Netz des letzten Zugs, das sich noch setzen soll */
let nachLoesenOffen: Haut | null = null;
/**
 * Wie oft sich das Netz nach einem Zug noch verfeinert hat: Gesetzt liegen die Linien etwas anders als beim Teilen (die neuen Punkte
 * lagen nur rund zwischen den alten), dann wird es dort noch einmal feiner und setzt sich noch einmal, höchstens dreimal (nur geteilt,
 * nichts zusammengelegt).
 */
let nachVerfeinert = 0;
/** das Setzen rechnet, bis die Form steht (Vergleich: `?setzen=4`) */
const SETZEN_RUHE = new URLSearchParams(location.search).get('setzen') !== '4';
function vorrechnenPlanen(): void {
  vorrechnenAus();
  if (mitBereich() || zug) return;
  // nach dem Loslassen rechnet erst der Nachlauf; er gibt das Aufräumen dann selbst in den Hintergrund
  if (nachlauf) return;
  vorrechnenUhr = setTimeout(() => {
    vorrechnenUhr = null;
    if (mitBereich() || zug || nachlauf) return;
    // über die ganze Haut nach der Geometrie rechnet der Hintergrund, was für den Stand offen ist (G4.4)
    if (ruheImHintergrund()) return;
    // ohne Hintergrund rechnet das Fenster selbst, was offen ist (wie bis G4)
    if (ruheOffen) {
      const r = ruheOffen;
      ruheOffen = null;
      if (r.setzen && !r.nurInRuhe) {
        hautNeuRechnen(r.ziele ?? loops.map(() => null), true);
        geometrieNeu();
        allesZeigen();
        return;
      }
      if (r.verdichten) aufraeumenImFenster();
    }
    // die bereite Zerlegung ist für genau diesen Stand gerechnet (sie kam aus dem Hintergrund): nichts zu tun
    if (GEWICHTE === 'geometrie' && vorlageBereit && vorlageStand === standZahl()) return;
    const t0 = performance.now();
    const z = new LoopZug(haut, loops, null, KRUEMMUNG, 'kurven', GEWICHTE, RICHTUNG_OPT);
    letztesVorrechnen = Math.round(performance.now() - t0);
    if (GEWICHTE === 'geometrie' && z.vorlage) {
      vorlageBereit = z.vorlage;
      vorlageStand = standZahl();
    }
    if (nachLoesenOffen !== haut) return;
    nachLoesenOffen = null;
    const ziele = loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : null));
    // nach der Geometrie, bis die Form steht (`?setzen=4`: wie bis zum 10.11. genau vier Runden): Ein neuer Löser schwingt in den
    // ersten Runden über (seine Bremse je Punkt beginnt von vorn), nach genau vier Runden blieb davon ein Rest stehen
    if (GEWICHTE === 'geometrie' && SETZEN_RUHE) {
      for (let k = 0; k < RUNDEN_NEU; k++) if (rundeMitWeg(z, ziele) < RUHE) break;
    } else z.schritt(ziele, RUNDEN_ENDE);
    festlegenAlle();
    if (GENAU > 0 && nachVerfeinert < 3) {
      const vor = haut;
      nachVerdichten(true);
      if (haut !== vor) {
        nachVerfeinert++;
        nachLoesenOffen = haut;
        vorrechnenPlanen();
      }
    }
    letztesNachLoesen = Math.round(performance.now() - t0);
    hautZeigen();
    baenderZeigen();
    for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
    statusZeigen();
  }, 30);
}
function vorrechnenAus(): void {
  if (vorrechnenUhr) clearTimeout(vorrechnenUhr);
  vorrechnenUhr = null;
}
let letztesVorrechnen = 0;
let letztesNachLoesen = 0;

// ---------- Messen ----------

const zeiten: number[] = [];
/**
 * Messen, wo die Zeit im Zug bleibt (10.11., G4): Arbeit je Bild (Runden und Anzeige der Haut), je Mausbewegung (Ziele und Blätter),
 * je Auslösen und je Einwechseln beim Verfeinern im Zug (alles im Hauptthread, ms)
 */
const messung = { bild: [] as number[], maus: [] as number[], ausloesen: [] as number[], einwechseln: [] as number[], nachlauf: [] as number[] };
function merke(liste: number[], ms: number): void {
  liste.push(ms);
  if (liste.length > 600) liste.shift();
}
let letzteZerlegung = 0;
let letzterBereich = 0;
function statusZeigen(): void {
  const z = zeiten.slice(-20);
  const ms = z.length ? z.reduce((s, v) => s + v, 0) / z.length : 0;
  const punkte = loops.reduce((s, l) => s + l.punkte.length, 0);
  const kreuz = new Set(loops.flatMap((l) => l.punkte.filter((p) => p.kreuzung !== undefined).map((p) => p.kreuzung))).size;
  // was gerade noch rechnet: auch hinter einer Meldung (nach K steht dort „Kante“, die Haut folgt aus dem Hintergrund erst danach)
  const rechnet =
    zug?.offen || nachlauf ? ' (rechnet)' : gegriffen ? ' (der Griff wartet, bis die Haut steht)' : aufraeumen?.setzen ? ' (rechnet im Hintergrund)' : aufraeumen?.verdichten ? ' (verfeinert im Hintergrund)' : '';
  statusZeile.textContent =
    (meldung ? meldung + rechnet : '') ||
    `${loops.length} Loops · ${punkte} Punkte (${kreuz} Kreuzungen) · Zug ${ms.toFixed(1)} ms${rechnet} · zerlegen ${letzteZerlegung} ms · ` +
      `Bereich ${letzterBereich} von ${haut.n}` +
      (letzteVerdichtung
        ? ` · verdichtet +${letzteVerdichtung.neu}${letzteVerdichtung.gelegt ? ` −${letzteVerdichtung.gelegt}` : ''} (${letzteVerdichtung.ms} ms)`
        : '') +
      (maul ? (!maulGezeigt ? ' · Maul: Loop schneidet nicht (als Kette eingesetzt?)' : grund ? ` · Fressen: Maul ${pose.kiefer}°, Kopf ${pose.schaedel}°` : ' · Grundform') : '');
}

// ---------- Ziehen und G/S/R ----------

type Zug = {
  /** null: direkt gezogen (wie G) */
  modal: 'g' | 's' | 'r' | null;
  achse: 'x' | 'y' | 'z' | null;
  ansicht: Ansicht;
  /** auf einer Spiegelhälfte gegriffen: die Tiefe läuft umgekehrt */
  spiegel: boolean;
  x0: number;
  y0: number;
  pivot: V3;
  vorher: Schnappschuss;
  loeser: LoopZug;
  /** ganz bewegte Loops (Index) */
  ganze: Set<number>;
  /** mit O: Gewicht je Probe der anderen Loops (für den Bereich; Loops ohne Pfad bewegen sich danach je Probe) */
  probenW: (Float64Array | null)[];
  /** Gewicht je Punkt („Loop:Punkt“) */
  punktW: Map<string, number>;
  /** mit O: Gewichte der Griffspitzen der Punkte, die nicht gewählt sind (Loops mit Pfad; Blender: jede Spitze für sich) */
  griffW: Map<string, { ein: number; aus: number }>;
  /** in der Grundform je Loop mit Pfad, was seiner Linie beim Anfang zu ihrem Pfad fehlte (kommt zu jeder Verschiebung dazu) */
  rest: (Float64Array | null)[];
  lagen: Float64Array[];
  versch: (Float64Array | null)[];
  bewegt: boolean;
  mitte: V3 | null;
  /** ein Griff wird gezogen (statt Punkte): Loop (Index), Punkt, Seite; dazu der Versatz der Griffe des Punkts */
  griff: { li: number; i: number; seite: 'ein' | 'aus' } | null;
  griffVersatz: GriffVersatz;
  /** Radius des Bereichs beim Anfang; wie weit schon gezogen wurde (vor dieser Stufe, insgesamt) */
  radius: number;
  weite0: number;
  weite: number;
  /** je Loop die Griffe seiner Punkte, wie sie nach dem Zug sind (null: unverändert); gesetzt erst beim Übernehmen */
  griffeNeu: ({ ein: V3; aus: V3 }[] | null)[];
  /** mit O verschobene Loops (je Probe, nicht über ihre Punkte): ihre Griffe werden danach aus der Linie neu abgelesen */
  neuAblesen: Set<number>;
  /**
   * Über die ganze Haut rechnet der Löser im Bildtakt (`zugRechnen`). `zielNeu`: Die Ziele haben sich seit der letzten Runde geändert
   * (die Linien liegen noch nicht auf ihnen). `offen`: Die Haut steht noch nicht. `nachRunden`: Runden seit der letzten Mausbewegung.
   */
  zielNeu: boolean;
  offen: boolean;
  nachRunden: number;
};
let zug: Zug | null = null;

/** Abbildung des Zugs für die Maus an (X, Y) im Blatt: Verschieben, Skalieren (um die Mitte der Auswahl) oder Drehen (um die Blickachse) */
function abbildung(z: Zug, X: number, Y: number): (p: V3) => V3 {
  const a = z.ansicht;
  const [cx, cy] = imBlatt(a, z.pivot);
  if (z.modal === 's') {
    const k = Math.hypot(X - cx, Y - cy) / Math.max(1e-6, Math.hypot(z.x0 - cx, z.y0 - cy));
    const c = z.pivot;
    return (p) => ({
      x: !z.achse || z.achse === 'x' ? c.x + k * (p.x - c.x) : p.x,
      y: !z.achse || z.achse === 'y' ? c.y + k * (p.y - c.y) : p.y,
      z: !z.achse || z.achse === 'z' ? c.z + k * (p.z - c.z) : p.z,
    });
  }
  if (z.modal === 'r') {
    const phi = Math.atan2(Y - cy, X - cx) - Math.atan2(z.y0 - cy, z.x0 - cx);
    const co = Math.cos(phi);
    const si = Math.sin(phi);
    return (p) => {
      const [px, py] = imBlatt(a, p);
      const nx = cx + (px - cx) * co - (py - cy) * si;
      const ny = cy + (px - cx) * si + (py - cy) * co;
      const d = inWelt(a, nx - px, ny - py);
      return { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z };
    };
  }
  const d = inWelt(a, X - z.x0, Y - z.y0);
  if (z.spiegel) d.z = -d.z;
  if (z.achse) for (const k of ['x', 'y', 'z'] as const) if (k !== z.achse) d[k] = 0;
  // spiegelgleiche Loops als Ganzes nicht aus der Mitte schieben
  if ([...z.ganze].some((li) => loops[li]!.art !== 'paar')) d.z = 0;
  return (p) => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });
}

/** Punkt einer Linie in der Mittelebene bzw. am Ende eines Rings: z bleibt 0; Ringe nicht unter die Mitte */
function zFest(l: Loop, s: number): boolean {
  return l.art === 'mitte' || (l.art === 'ring' && (s <= 1e-6 || s >= l.laenge - 1e-6));
}

/** größter Abstand der Proben eines Loops von seiner ersten */
function ausdehnung(l: Loop): number {
  let m = 0;
  for (let j = 0; j < l.proben.length; j += 4) m = Math.max(m, abstand(lageAus(l.ruhe, j), lageAus(l.ruhe, 0)));
  return m;
}

/**
 * Die zwei Stücke um Punkt k (bis zum vorigen und zum nächsten Punkt) in `mark` setzen; Ergebnis: Mindestradius des
 * Einflussbereichs (halber Abstand zum ferneren Nachbarpunkt, ein Punkt allein auf einem geschlossenen Loop: der ganze Loop).
 */
function stueckUm(l: Loop, k: number, mark: Uint8Array): number {
  const P = l.punkte;
  const n = l.proben.length;
  const zu = l.art !== 'ring';
  if (zu && P.length === 1) {
    mark.fill(1);
    return 0.6 * ausdehnung(l);
  }
  const s0 = k > 0 ? P[k - 1]!.s : zu ? P[P.length - 1]!.s - l.laenge : 0;
  const s1 = k < P.length - 1 ? P[k + 1]!.s : zu ? P[0]!.s + l.laenge : l.laenge;
  for (let j = 0; j < n; j++) {
    const s = l.s[j]!;
    if ((s > s0 && s < s1) || (zu && (s - l.laenge > s0 || s + l.laenge < s1))) mark[j] = 1;
  }
  const vor = k > 0 ? P[k - 1]!.ref : zu ? P[P.length - 1]!.ref : lageAus(l.ruhe, 0);
  const nach = k < P.length - 1 ? P[k + 1]!.ref : zu ? P[0]!.ref : lageAus(l.ruhe, n - 1);
  return 0.5 * Math.max(abstand(P[k]!.ref, vor), abstand(P[k]!.ref, nach));
}

/**
 * Haut für den Löser: in der Pose ohne die Öffnung des Mauls (dieselben Lagen, dieselbe Spiegelung). Die verborgene Fläche der
 * Öffnung überspannt in der Pose das offene Maul und klappt um, wo sich die Lippen weit trennen; mit ihr schaukelte sich der Löser
 * bei einem Maul aus der Front auf (gemessen: ein Punkt 10 000 Einheiten weit). `aus`: Punkte nur in der Öffnung (bleiben stehen).
 */
let loeserHautStand: { haut: Haut; offen: Uint8Array; h: Haut; aus: Uint8Array } | null = null;
function loeserHaut(): { h: Haut; aus: Uint8Array | null } {
  const m = grund ? maulAktuell() : null;
  if (!m || m.offen.length !== haut.tri.length / 3) return { h: haut, aus: null };
  const st = loeserHautStand;
  if (st && st.haut === haut && st.offen === m.offen) return { h: { ...st.h, pos: haut.pos }, aus: st.aus };
  const tri: number[] = [];
  for (let t = 0; t < haut.tri.length / 3; t++) if (!m.offen[t]) tri.push(haut.tri[3 * t]!, haut.tri[3 * t + 1]!, haut.tri[3 * t + 2]!);
  const nachbarn: number[][] = Array.from({ length: haut.n }, () => []);
  const aus = new Uint8Array(haut.n).fill(1);
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e]!;
      const b = tri[t + ((e + 1) % 3)]!;
      aus[a] = 0;
      if (!nachbarn[a]!.includes(b)) nachbarn[a]!.push(b);
      if (!nachbarn[b]!.includes(a)) nachbarn[b]!.push(a);
    }
  }
  const h: Haut = { pos: haut.pos, tri: Uint32Array.from(tri), n: haut.n, nachbarn, spiegel: haut.spiegel };
  loeserHautStand = { haut, offen: m.offen, h, aus };
  return { h, aus };
}

/**
 * Löser eines Zugs: Einflussbereich um die bewegten Stellen (Radius r) samt den Ecken ihrer Proben. In der Pose behält jeder Punkt
 * seine Krümmung (die Krümmung, die die Loops tragen, gilt für die geschlossene Grundform; am Rand der Öffnung passt sie nicht, die
 * Haut unter einem Maul aus der Front verknitterte, gemessen: ein Punkt 146 Einheiten weit, 16 Dreiecke umgeklappt). Aus den Kurven
 * (`?haut=kurven`) immer über die ganze Haut, wie FiberMesh: Mit einem Bereich trug dessen Rand die alte Wölbung als Krümmung ins
 * Feld (gemessen: Lappen unter einem Pilzrand, 12 umgeklappt; über die ganze Haut keine).
 */
function loeserFuer(bewegt: readonly V3[], r: number, ecken: Iterable<number>): LoopZug {
  const { h, aus } = loeserHaut();
  const art: HautArt = mitBereich() ? 'gedaechtnis' : 'kurven';
  const bereich = mitBereich() ? bereichUm(h, bewegt, r, ecken) : null;
  if (aus && bereich) for (let v = 0; v < h.n; v++) if (aus[v]) bereich[v] = 0;
  // die Zerlegung: die vom Einwechseln im Zug, sonst die bereite (letzter Zug oder Hintergrund; der Kern nimmt sie nur, wenn ihre
  // Struktur passt, sonst zerlegt er selbst)
  const vorlage = mitBereich() ? null : (naechsteVorlage ?? (GEWICHTE === 'geometrie' ? vorlageBereit : null));
  naechsteVorlage = null;
  return new LoopZug(h, loops, bereich, KRUEMMUNG && !grund, art, GEWICHTE, vorlage ? { vorlage, ...RICHTUNG_OPT } : RICHTUNG_OPT);
}

/** Löser für die Stücke um Punkt k des Loops li (Griff ziehen oder ausrichten) */
function stueckLoeser(li: number, k: number): LoopZug {
  const l = loops[li]!;
  const mark = new Uint8Array(l.proben.length);
  const r = Math.max(2 * MK, stueckUm(l, k, mark));
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  for (let j = 0; j < mark.length; j++) {
    if (!mark[j]) continue;
    if (j % 2 === 0) bewegt.push(lageAus(l.ruhe, j));
    for (const v of l.proben[j]!.ecken) ecken.add(v);
  }
  return loeserFuer(bewegt, r, ecken);
}

/** Verschiebung je Probe eines Loops aus dem Versatz der Griffe von Punkt k (die Punkte bleiben) */
function griffVerschiebung(l: Loop, S: Float64Array, k: number, v: GriffVersatz): Float64Array {
  const d = verschiebungLaengs(
    l,
    l.punkte.map(() => ({ x: 0, y: 0, z: 0 })),
    l.punkte.map((_, i) => (i === k ? v : undefined)),
  );
  zGrenzen(l, S, d);
  return d;
}

/** In der Grundform je Loop mit Pfad: was seiner Linie beim Anfang eines Zugs (`start`) zu ihrem Pfad fehlt; sonst null */
function restZumPfad(z: LoopZug): (Float64Array | null)[] {
  return loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : null));
}

/**
 * Verschiebung je Probe im Zug, mit dem Rest zum Pfad: Die Verschiebungen sind die Änderung des Pfads (`verschiebungLaengs`), mit dem
 * Rest liegt das Ziel jeder Probe genau auf dem neuen Pfad (auch für Loops, die sich nicht bewegen).
 */
function mitRest(z: Zug, li: number, d: Float64Array | null): Float64Array | null {
  const r = z.rest[li];
  if (!r) return d;
  const out = new Float64Array(r.length);
  for (let k = 0; k < r.length; k++) out[k] = r[k]! + (d ? d[k]! : 0);
  zGrenzen(loops[li]!, z.loeser.start[li]!, out);
  return out;
}

/** Mittelebene und Enden eines Rings bleiben auf z = 0, ein Ring geht nicht unter die Mittelebene */
function zGrenzen(l: Loop, S: Float64Array, d: Float64Array): void {
  const n = l.proben.length;
  for (let j = 0; j < n; j++) {
    if (l.art === 'mitte' || (l.art === 'ring' && (j === 0 || j === n - 1))) d[3 * j + 2] = 0;
    else if (l.art === 'ring') d[3 * j + 2] = Math.max(d[3 * j + 2]!, -S[3 * j + 2]!);
  }
}

/** Griff `seite` von Punkt i des Loops li ziehen */
function griffZugStarten(a: Ansicht, X: number, Y: number, spiegel: boolean, li: number, i: number, seite: 'ein' | 'aus'): boolean {
  const p = loops[li]?.punkte[i];
  if (!p) return false;
  const loeser = stueckLoeser(li, i);
  zug = {
    modal: null,
    achse: null,
    ansicht: a,
    spiegel,
    x0: X,
    y0: Y,
    pivot: p.ref,
    vorher: schnappschuss(),
    loeser,
    ganze: new Set(),
    probenW: loops.map(() => null),
    punktW: new Map(),
    griffW: new Map(),
    rest: restZumPfad(loeser),
    lagen: loeser.start,
    versch: loops.map(() => null),
    bewegt: false,
    mitte: null,
    griff: { li, i, seite },
    griffVersatz: {},
    radius: 0,
    weite0: 0,
    weite: 0,
    griffeNeu: loops.map(() => null),
    neuAblesen: new Set(),
    zielNeu: false,
    offen: false,
    nachRunden: 0,
  };
  letzteZerlegung = loeser.loeser.zeitZerlegen;
  letzterBereich = loeser.loeser.anzahl;
  meldung = '';
  return true;
}

/** Punkte an derselben Kreuzung wie Punkt i von Loop li, samt ihm (Loop-Index, Punkt); ohne Kreuzung nur er */
function punkteAnKreuzung(li: number, i: number): [number, number][] {
  const p = loops[li]?.punkte[i];
  if (!p) return [];
  if (p.kreuzung === undefined) return [[li, i]];
  const out: [number, number][] = [];
  loops.forEach((l, lj) =>
    l.punkte.forEach((q, j) => {
      if (q.kreuzung === p.kreuzung) out.push([lj, j]);
    }),
  );
  return out;
}

/**
 * Wie der Punkt gezeigt wird: An einer Kreuzung liegen die Punkte der Loops übereinander, für Florian ist es ein Punkt. Er ist eine
 * Ecke ◆, sobald einer seiner Loops dort eine hat (z. B. von selbst, wo der andere hart ist), und dann knicken alle seine Griffe.
 */
function eckeGezeigt(li: number, i: number): boolean {
  return punkteAnKreuzung(li, i).some(([lj, j]) => istEcke(loops[lj]!.punkte[j]!));
}

/**
 * Glatt ↔ Ecke umschalten (von Hand; zweimal = wieder automatisch), an einer Kreuzung für alle ihre Loops (gemessen: die 3 auf der
 * Kreuzung macht den angeklickten Loop hart, der andere wird dort von selbst eine Ecke; die sichtbaren Griffe gehörten oft dem
 * glatten, er knickte nicht). Wird eine Ecke mit Knick glatt, kommen ihre Griffe auf eine Gerade und die Haut folgt.
 */
function eckeUmschalten(id: number, i: number): void {
  const li0 = loopNr(id);
  if (!loops[li0]?.punkte[i]) return;
  const vorher = schnappschuss();
  const alle = punkteAnKreuzung(li0, i);
  const neu = !eckeGezeigt(li0, i);
  const vorherEcken = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
  for (const [lj, j] of alle) {
    const q = loops[lj]!.punkte[j]!;
    if (neu === (q.autoEcke ?? false)) delete q.ecke;
    else q.ecke = neu;
  }
  // wird ein Punkt wieder eine Ecke von selbst, knickt er wie bei K (jede Seite rund); hört er auf, eine zu sein, wird er glatt
  const knick = kantenKnicken(loops, vorherEcken);
  // (im Fenster: Das Ausrichten der Griffe gleich danach rechnet auf diesem Stand weiter)
  if (knick.some((d) => d)) hautNeuRechnen(knick, true);
  // gemessen: ein Schritt bringt 58° auf 0,4°; ein zweiter nur, falls die Haut weit vom Ziel blieb. Liegen die Griffe schon auf
  // einer Geraden, nichts tun: glatte Linien bleiben beim Umschalten unberührt.
  let ausgerichtet = false;
  for (const [li, j] of neu ? [] : alle) {
    const l = loops[li]!;
    for (let runde = 0; runde < 2; runde++) {
      const v = griffeAusrichten(l, j);
      if (!v) break;
      const loeser = stueckLoeser(li, j);
      const d = griffVerschiebung(l, loeser.start[li]!, j, v);
      // in der Grundform dazu, was der Linie noch zu ihrem Pfad fehlt
      const rest = exakt(l) ? pfadVersatz(l, loeser.start[li]!) : null;
      const stufe = (f: number) => d.map((x, k) => f * x + (rest ? rest[k]! : 0));
      for (let s = 1; s <= 3; s++) loeser.schritt(loops.map((_, k) => (k === li ? stufe(s / 3) : null)), RUNDEN_ZUG);
      loeser.schritt(loops.map((_, k) => (k === li ? stufe(1) : null)), RUNDEN_ENDE);
      griffeUebernehmen(
        l,
        l.punkte.map(() => ({ x: 0, y: 0, z: 0 })),
        l.punkte.map((_, k) => (k === j ? v : undefined)),
      );
      festlegenAlle();
      ausgerichtet = true;
    }
  }
  if (ausgerichtet) {
    kreuzungenSuchen();
    poseSichern();
  }
  zurueck.push(vorher);
  auswahl = [{ l: id, i }];
  meldung = neu ? 'Ecke: die Linie darf hier knicken' : ausgerichtet ? 'glatt: Griffe auf einer Geraden' : 'glatt';
  allesZeigen();
}

function zugStarten(modal: Zug['modal'], a: Ansicht, X: number, Y: number, spiegel: boolean, rMin = 0): boolean {
  if (auswahl.length === 0) return false;
  const ganze = new Set<number>();
  const punktW = new Map<string, number>();
  const kreuzWahl = new Set<number>();
  const zentren: V3[] = [];
  for (const w of auswahl) {
    const li = loopNr(w.l);
    const l = loops[li];
    if (!l) continue;
    if (w.i < 0) {
      ganze.add(li);
      l.punkte.forEach((p, i) => {
        punktW.set(`${li}:${i}`, 1);
        if (p.kreuzung !== undefined) kreuzWahl.add(p.kreuzung);
      });
      for (let j = 0; j < l.proben.length; j += 2) zentren.push(lageAus(l.ruhe, j));
    } else {
      const p = l.punkte[w.i];
      if (!p) continue;
      punktW.set(`${li}:${w.i}`, 1);
      zentren.push(p.ref);
      if (p.kreuzung !== undefined) kreuzWahl.add(p.kreuzung);
    }
  }
  if (zentren.length === 0) return false;
  if (modal === 'r' && a !== 'seite' && [...ganze].some((li) => loops[li]!.art !== 'paar')) {
    meldung = 'Spiegelgleiche Loops dreht man in der Seite';
    statusZeigen();
    return false;
  }
  // an einer Kreuzung geht der Punkt im anderen Loop ganz mit
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      if (p.kreuzung !== undefined && kreuzWahl.has(p.kreuzung)) punktW.set(`${li}:${i}`, 1);
    }),
  );
  const probenW: (Float64Array | null)[] = loops.map(() => null);
  const griffW = new Map<string, { ein: number; aus: number }>();
  if (oAn) {
    const gewicht = (q: V3): number => {
      let d = Infinity;
      for (const c of zentren) d = Math.min(d, abstandSym(q, c));
      return einfluss(d, radius);
    };
    loops.forEach((l, li) => {
      if (ganze.has(li)) return;
      const w = new Float64Array(l.proben.length);
      let irgend = false;
      for (let j = 0; j < l.proben.length; j++) {
        w[j] = gewicht(lageAus(l.ruhe, j));
        if (w[j]! > 0) irgend = true;
      }
      if (irgend) probenW[li] = w;
      // Loops mit Pfad formt O wie Blender eine Kurve: Punkte (auch die Enden eines Rings) und Griffspitzen je nach ihrem Abstand; ein
      // gewählter Punkt geht ganz mit, seine Griffe mit ihm
      const pfad = hatPfad(l);
      l.punkte.forEach((p, i) => {
        const k = `${li}:${i}`;
        if (punktW.has(k) || (!istSichtbar(p) && !pfad)) return;
        const g = gewicht(p.ref);
        if (g > 0) punktW.set(k, g);
        if (!pfad) return;
        const r = griffeBei(l, i);
        const spitze = (v: V3 | null) => (v ? gewicht({ x: p.ref.x + v.x, y: p.ref.y + v.y, z: p.ref.z + v.z }) : 0);
        const ge = spitze(r.ein);
        const ga = spitze(r.aus);
        if (g > 0 || ge > 0 || ga > 0) griffW.set(k, { ein: ge, aus: ga });
      });
    });
  }
  // was sich bewegt: ganze Loops, mit O die Proben im Kreis, sonst die Stücke um die bewegten Punkte bis zu ihren Nachbarn
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  let r = oAn ? radius : Math.max(2 * MK, rMin);
  loops.forEach((l, li) => {
    const n = l.proben.length;
    const mark = new Uint8Array(n);
    // ein ganzer Loop nimmt sein Inneres mit (Bereich über seine Mitte hinaus), sonst verdreht sich die Haut auf kurzem Weg
    if (ganze.has(li)) {
      mark.fill(1);
      if (!oAn) r = Math.max(r, 0.6 * ausdehnung(l));
    } else if (probenW[li]) {
      for (let j = 0; j < n; j++) if (probenW[li]![j]! > 0) mark[j] = 1;
    } else if (!oAn) {
      l.punkte.forEach((_, k) => {
        if (punktW.has(`${li}:${k}`)) r = Math.max(r, stueckUm(l, k, mark));
      });
    }
    for (let j = 0; j < n; j++) {
      if (!mark[j]) continue;
      if (j % 2 === 0) bewegt.push(lageAus(l.ruhe, j));
      for (const v of l.proben[j]!.ecken) ecken.add(v);
    }
  });
  const loeser = loeserFuer(bewegt, r, ecken);
  const pivot = zentren.reduce((s, p) => ({ x: s.x + p.x / zentren.length, y: s.y + p.y / zentren.length, z: s.z + p.z / zentren.length }), { x: 0, y: 0, z: 0 });
  if (ganze.size > 0 && [...ganze].every((li) => loops[li]!.art !== 'paar')) pivot.z = 0;
  zug = {
    modal,
    achse: null,
    ansicht: a,
    spiegel,
    x0: X,
    y0: Y,
    pivot,
    vorher: schnappschuss(),
    loeser,
    ganze,
    probenW,
    punktW,
    griffW,
    rest: restZumPfad(loeser),
    lagen: loeser.start,
    versch: loops.map(() => null),
    bewegt: false,
    mitte: zentren.length === 1 ? { ...zentren[0]! } : pivot,
    griff: null,
    griffVersatz: {},
    radius: r,
    weite0: 0,
    weite: 0,
    griffeNeu: loops.map(() => null),
    neuAblesen: new Set(),
    zielNeu: false,
    offen: false,
    nachRunden: 0,
  };
  letzteZerlegung = loeser.loeser.zeitZerlegen;
  letzterBereich = loeser.loeser.anzahl;
  meldung = '';
  return true;
}

/** Wohin Punkt p mit dem Gewicht g unter der Abbildung f geht (Mittelebene und Enden eines Rings auf z = 0, ein Ring nicht darunter) */
function punktNach(l: Loop, p: LoopPunkt, g: number, f: (p: V3) => V3): V3 {
  const q = f(p.ref);
  const c = { x: p.ref.x + g * (q.x - p.ref.x), y: p.ref.y + g * (q.y - p.ref.y), z: p.ref.z + g * (q.z - p.ref.z) };
  if (zFest(l, p.s)) c.z = 0;
  else if (l.art === 'ring') c.z = Math.max(0, c.z);
  return c;
}

/**
 * Verschiebung je Probe je Loop für die Abbildung f (die Änderung seines Pfads; `mitRest` legt das Ziel in der Grundform genau auf
 * den neuen Pfad); dazu je Loop die Griffe, wie sie danach sind (`z.griffeNeu`). Ein Loop mit Pfad bewegt sich über seine Punkte und
 * Griffe: Ein ganzer Loop dreht und skaliert sie mit, gezogene Punkte nehmen sie mit (`griffeNach`), mit O gehen Punkte und
 * Griffspitzen je mit ihrem Gewicht (`griffeProportional`). Ein Loop ohne Pfad (geschlossen, höchstens ein Punkt) folgt je Probe.
 */
function verschiebungen(z: Zug, f: (p: V3) => V3): (Float64Array | null)[] {
  return loops.map((l, li) => {
    const n = l.proben.length;
    const S = z.loeser.start[li]!;
    let d: Float64Array | null = null;
    z.griffeNeu[li] = null;
    const ganz = z.ganze.has(li);
    if (!hatPfad(l) && (ganz || z.probenW[li])) {
      if (ganz && hatGriffe(l)) {
        const D = l.punkte.map((p) => {
          const q = f(p.ref);
          return { x: q.x - p.ref.x, y: q.y - p.ref.y, z: q.z - p.ref.z };
        });
        z.griffeNeu[li] = griffeNach(
          l,
          D,
          l.punkte.map((_, i) => griffeAbbilden(l, i, f, 1)),
        );
      } else if (!ganz) z.neuAblesen.add(li);
      const w = ganz ? null : z.probenW[li];
      d = new Float64Array(3 * n);
      for (let j = 0; j < n; j++) {
        const g = w ? w[j]! : 1;
        if (!g) continue;
        const p = lageAus(S, j);
        const q = f(p);
        d[3 * j] = g * (q.x - p.x);
        d[3 * j + 1] = g * (q.y - p.y);
        d[3 * j + 2] = g * (q.z - p.z);
      }
    } else {
      let irgend = false;
      const D = l.punkte.map((p, i) => {
        const g = z.punktW.get(`${li}:${i}`);
        if (!g) return { x: 0, y: 0, z: 0 };
        irgend = true;
        const q = punktNach(l, p, g, f);
        return { x: q.x - p.ref.x, y: q.y - p.ref.y, z: q.z - p.ref.z };
      });
      // wie in Illustrator: Beim Drehen und Skalieren drehen und skalieren die Griffe der Punkte mit (beim Verschieben gehen sie
      // nur mit, ohne Versatz); mit O jede Griffspitze nach ihrem eigenen Gewicht
      const griffe = l.punkte.map((_, i) => {
        const k = `${li}:${i}`;
        const o = z.griffW.get(k);
        if (o) {
          irgend = true;
          return griffeProportional(l, i, f, z.punktW.get(k) ?? 0, o.ein, o.aus);
        }
        const g = z.punktW.get(k);
        return g && (ganz || z.modal === 's' || z.modal === 'r') ? griffeAbbilden(l, i, f, g) : undefined;
      });
      if (irgend) {
        d = verschiebungLaengs(l, D, griffe);
        if (hatGriffe(l)) z.griffeNeu[li] = griffeNach(l, D, griffe);
      }
    }
    if (d) zGrenzen(l, S, d);
    return d;
  });
}

function zugBewegen(X: number, Y: number): void {
  const z = zug;
  if (!z) return;
  const tm = performance.now();
  letzteMaus = [X, Y];
  if (!z.bewegt && Math.hypot(X - z.x0, Y - z.y0) * skala(z.ansicht) < 2) return;
  z.bewegt = true;
  if (z.griff) {
    // Griff: in der Ebene des Blatts verschoben (die Tiefe bleibt), nur sein Loop bewegt sich. Eine Ecke von selbst wird dabei
    // eine Ecke von Hand (ihre Griffe sind dann frei, wie in Blender ein automatischer Griff, den man anfasst). Am Spiegelpunkt geht
    // das Spiegelbild des Griffs mit; schräg zur Mittelebene knickt die Linie dort, der Punkt wird eine Ecke.
    const { li, i, seite } = z.griff;
    const l = loops[li]!;
    const p = l.punkte[i]!;
    // ein glatter Punkt wird eine Ecke, wenn er als Ecke zu sehen ist (an einer Kreuzung mit einer Ecke) oder am Spiegelpunkt liegt
    if (istEckeVonSelbst(p) || (!istEcke(p) && (ringEnde(l, i) || eckeGezeigt(li, i)))) p.ecke = true;
    const d = inWelt(z.ansicht, X - z.x0, Y - z.y0);
    if (z.spiegel) d.z = -d.z;
    z.griffVersatz = griffZiehen(l, i, seite, d);
    z.versch = loops.map((_, k) => mitRest(z, k, k === li ? griffVerschiebung(l, z.loeser.start[li]!, i, z.griffVersatz) : null));
    const versatz = l.punkte.map((_, k) => (k === i ? z.griffVersatz : undefined));
    z.griffeNeu = loops.map((_, k) => (k === li && hatGriffe(l) ? griffeNach(l, l.punkte.map(() => ({ x: 0, y: 0, z: 0 })), versatz) : null));
  } else {
    const f = abbildung(z, X, Y);
    z.versch = verschiebungen(z, f).map((d, li) => mitRest(z, li, d));
    loops.forEach((l, li) =>
      l.punkte.forEach((p, i) => {
        const g = z.punktW.get(`${li}:${i}`) ?? 0;
        p.cur = g ? punktNach(l, p, g, f) : { ...p.ref };
      }),
    );
    if (z.mitte) z.mitte = f(z.pivot);
  }
  z.lagen = z.loeser.lagen(z.versch);
  // wie weit die Loops in diesem Zug schon gezogen sind (über alle Stufen)
  let weit = 0;
  for (const d of z.versch) if (d) for (let j = 0; j < d.length; j += 3) weit = Math.max(weit, Math.hypot(d[j]!, d[j + 1]!, d[j + 2]!));
  z.weite = z.weite0 + weit;
  if (!mitBereich()) {
    // über die ganze Haut: Hier werden nur die Ziele gesetzt und die Kurven gezeichnet (Punkte, Griffe, Pfad); die Haut rechnet im
    // Bildtakt nach (`zugRechnen`), auch wenn die Maus ruht
    z.zielNeu = true;
    z.offen = true;
    z.nachRunden = 0;
    for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
    merke(messung.maus, performance.now() - tm);
    return;
  }
  const t0 = performance.now();
  z.loeser.schritt(z.versch, RUNDEN_ZUG);
  zeiten.push(performance.now() - t0);
  if (zeiten.length > 200) zeiten.shift();
  // reicht der Zug über den halben Bereich hinaus, eine neue Stufe: der Bereich wächst mit, dabei wird verdichtet
  if (!z.griff && !oAn && weit > 0.5 * z.radius) zugStufe(z, X, Y);
  hautZeigen();
  baenderZeigen();
  for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
  statusZeigen();
}

/**
 * Runden ohne neue Mausbewegung, nach denen der Löser auf jeden Fall aufhört: nach der Geometrie kommt er vorher zur Ruhe (`RUHE`),
 * mit gleichen Gewichten pendelt er, dort bleibt es bei so vielen Runden wie bisher am Ende
 */
const NACH_RUNDEN = GEWICHTE === 'geometrie' ? 60 : RUNDEN_ENDE;
let rundeVorher: Float64Array | null = null;
/**
 * Eine Löserrunde über die ganze Haut zu den Zielen `versch`; zurück kommt, wie weit sich die Form dabei höchstens bewegt hat: die
 * Bewegung der Punkte längs der Flächennormalen. Längs der Fläche gleiten die Punkte nach der Geometrie stetig weiter, ohne dass
 * sich die Form ändert (gemessen im Kern, `gegenpruefung-2026-11-10/loeser/mess7.ts`: bei 23 400 Punkten 0,04 Einheiten je Runde,
 * über 400 Runden gleich, die Form steht nach 25); gegen die ganze Bewegung gemessen käme der Löser dort nie zur Ruhe.
 */
function rundeMitWeg(loeser: LoopZug, versch: readonly (Float64Array | null)[]): number {
  const P = haut.pos;
  if (!rundeVorher || rundeVorher.length !== P.length) rundeVorher = new Float64Array(P.length);
  rundeVorher.set(P);
  const N = normalenGezeigt?.haut === haut ? normalenGezeigt.nor : hautNormalen(haut);
  loeser.schritt(versch, 1);
  let m = 0;
  for (let k = 0; k < P.length; k += 3) {
    const d = Math.abs((P[k]! - rundeVorher[k]!) * N[k]! + (P[k + 1]! - rundeVorher[k + 1]!) * N[k + 1]! + (P[k + 2]! - rundeVorher[k + 2]!) * N[k + 2]!);
    if (d > m) m = d;
  }
  return m;
}

/**
 * Der Löser eines Zugs über die ganze Haut, einmal je Bild (10.11., Gegenprüfung Schritt G3): Runden, solange die Haut nicht steht,
 * auch wenn die Maus ruht; dann die Haut zeigen. So ist beim Loslassen nichts mehr nachzuholen, und die Zahl der Runden hängt nicht
 * an der Zahl der Mausereignisse. Verfeinert wird wie bisher nur nach einer Mausbewegung (nach deren Runden: Die Linien liegen dann
 * auf ihren Zielen und können festgelegt werden). Beim Halten kommt kein weiterer Netzwechsel dazu: Auf einem dichten Netz legt
 * jeder Durchgang auch fern vom Zug zu kurze Kanten zusammen (gemessen bei 23 400 Punkten: Das Startnetz hat 1 442 Kanten unter der
 * halben mittleren Länge; danach Punkte mit drei und vier Nachbarn, an denen die Haut unruhig bleibt, `netz/m7-unruhige-stelle.mjs`).
 */
function zugRechnen(): void {
  const z = zug;
  if (!z || !z.offen || mitBereich()) return;
  const neuesZiel = z.zielNeu;
  const t0 = performance.now();
  for (;;) {
    const tr = performance.now();
    z.zielNeu = false;
    const weg = rundeMitWeg(z.loeser, z.versch);
    z.nachRunden++;
    if (weg < RUHE || z.nachRunden >= NACH_RUNDEN) {
      z.offen = false;
      break;
    }
    const jetzt = performance.now();
    if (jetzt - t0 + (jetzt - tr) > BUDGET_MS) break;
  }
  zeiten.push(performance.now() - t0);
  if (zeiten.length > 200) zeiten.shift();
  // über die ganze Haut nach der Geometrie: verfeinern, sobald sie gestreckt wird
  if (neuesZiel && LIVE && GEWICHTE === 'geometrie' && !z.griff && !verfeinerung && !eingetroffen && letzteMaus && (gestreckt() || linieUngenau(z))) {
    const [X, Y] = letzteMaus;
    if (HINTERGRUND) stufeImHintergrund(z, X, Y);
    else zugStufe(z, X, Y);
  }
  hautZeigen();
  baenderZeigen();
  statusZeigen();
  merke(messung.bild, performance.now() - t0);
}

/**
 * Nach dem Neuaufsetzen eines Zugs über die ganze Haut (Stufe, Einwechseln): Die Ziele der Linien sind ihre Pfade von jetzt, wie nach
 * einer Mausbewegung um null. Der Löser rechnet im Bildtakt weiter, bevor die nächste Mausbewegung kommt; ohne das hielte er die
 * Linien bis dahin dort, wo sie auf dem Netz gerade liegen (auf einem eben feineren Netz: auf den Sehnen des alten).
 */
function zieleVonJetzt(z: Zug): void {
  z.versch = loops.map((_, li) => mitRest(z, li, null));
  z.lagen = z.loeser.lagen(z.versch);
}

/**
 * Zug in Stufen: Reicht der Zug über den halben Bereich hinaus, wird der Stand festgehalten, verdichtet und der Zug von hier aus
 * weitergeführt (Verschieben, Skalieren und Drehen setzen sich so zusammen), mit einem Bereich, der mindestens so weit reicht, wie
 * schon gezogen wurde (wie das Abziehen in FiberMesh). Sonst hielte der feste Rand des Bereichs, was mitgehen soll (gemessen: die
 * Kappe vor einem Ring blieb 44 Einheiten zurück und faltete sich ein), und die Dehnung läge auf den alten Dreiecken. Stufen schon
 * bei Dehnung der Haut machten es schlechter (jede Stufe nimmt den Stand als neue Ruhe, Ansätze von Falten blieben). ⌘Z und Esc
 * nehmen den ganzen Zug zurück.
 */
function zugStufe(z: Zug, X: number, Y: number): void {
  const t0 = performance.now();
  zugGriffeUebernehmen(z);
  festlegenAlle();
  zugGriffeAblesen(z);
  nachVerdichten();
  zug = null;
  // der Bereich wächst mit dem Zug (wie das Abziehen in FiberMesh): mindestens so weit, wie schon gezogen wurde
  if (!zugStarten(z.modal, z.ansicht, X, Y, z.spiegel, z.weite)) {
    zug = z;
    return;
  }
  const neu = zug as Zug | null;
  if (!neu) return;
  neu.vorher = z.vorher;
  neu.bewegt = true;
  neu.achse = z.achse;
  neu.weite0 = z.weite;
  neu.weite = z.weite;
  // das neue Netz muss sich setzen (über die ganze Haut im Bildtakt)
  if (!mitBereich()) {
    neu.offen = true;
    zieleVonJetzt(neu);
  }
  zugStufen++;
  letzteStufeMs = Math.round(performance.now() - t0);
}
/**
 * Verfeinern im Zug im Hintergrund (`?hintergrund=0`: wie `zugStufe` im Vordergrund):
 * 1. Haut (flach, mit einer Kopie der Lagen) und Loops gehen an den Worker (`verfeinern.worker.ts`), die Loops als Kopie, festgelegt
 *    auf den Stand von jetzt. Der Zug selbst läuft mit seinem Löser unverändert weiter. (Bis zum 10.11. wurde er hier festgehalten
 *    und mit einem neuen Löser weitergeführt, und Verdichten, Einbetten und Zeilenaufbau liefen im Hauptthread: je Auslösen 40–290 ms
 *    bei 5 200–23 400 Punkten; nur die Zerlegung lief im Hintergrund.)
 * 2. Der Worker verdichtet, merkt sich für jeden Punkt des feineren Netzes seine Stelle auf der alten Haut, baut die Zeilen der
 *    Matrix und zerlegt sie.
 * 3. Ist das Ergebnis zurück, wird mitten im Zug eingewechselt (`einwechseln`): Erst dort wird der Zug festgehalten.
 */
function stufeImHintergrund(z: Zug, X: number, Y: number): void {
  // ein Aufräumen von vor diesem Zug ist verfallen (der Zug hat den Stand geändert); rechnet der Worker noch daran oder an einem
  // verfallenen Auftrag des letzten Zugs, wird er neu angelegt (der neue Auftrag wartete sonst dahinter)
  aufraeumen = null;
  aufgeraeumt = null;
  zwischenstand = null;
  const w = auftraegeOffen > 0 ? hintergrundFrei() : zerleger();
  if (!w) {
    zugStufe(z, X, Y);
    return;
  }
  // nichts zu tun: Verdichten ist aus, oder auf diesem Netz fand der letzte Auftrag in diesem Zug nichts zu verfeinern
  if (!VERDICHTEN || nichtsZuVerfeinern === haut) return;
  const t0 = performance.now();
  // die Loops, wie sie nach dem Festhalten wären, als Kopie (die echten gehören dem laufenden Zug)
  const echte = loops;
  loops = echte.map(kopieLoop);
  zugGriffeUebernehmen(z);
  festlegenAlle();
  zugGriffeAblesen(z);
  const festgelegt = loops;
  loops = echte;
  const t1 = performance.now();
  const id = ++verfeinerungsNr;
  if (nachbarnGemerkt?.haut !== haut) nachbarnGemerkt = { haut, flach: nachbarnFlach(haut) };
  const auftrag: VerfeinerAuftrag = {
    id,
    haut: hautFlach(haut, nachbarnGemerkt.flach),
    loops: festgelegt,
    maxKante: 1.75 * MK,
    opt: verdichtenOptionen(),
    kruemmung: KRUEMMUNG && !grund,
    gewichte: GEWICHTE,
    loeserOpt: RICHTUNG_OPT,
  };
  verfeinerung = { id, netz: haut, t0: performance.now() };
  auftraegeOffen++;
  w.postMessage(auftrag, [auftrag.haut.pos.buffer]);
  ausloesungTeile = [t1 - t0, performance.now() - t1].map(Math.round);
  letzteAusloesungMs = Math.round(performance.now() - t0);
  merke(messung.ausloesen, performance.now() - t0);
}

/** Das im Hintergrund verfeinerte und zerlegte Netz einwechseln: Zug festhalten, die Punkte des feineren Netzes auf der Haut von jetzt, weiter */
function einwechseln(f: Verfeinert, daten: ZerlegungsDaten[]): void {
  const z = zug;
  if (!z || !letzteMaus) return;
  const t0 = performance.now();
  letzteVerdichtung = { neu: f.neu, gelegt: f.gelegt, ms: 0 };
  // der Löser rechnet im Bildtakt: Kam seit der letzten Runde eine Mausbewegung, liegen die Linien noch nicht auf ihren Zielen
  if (z.zielNeu && !mitBereich()) {
    z.zielNeu = false;
    rundeMitWeg(z.loeser, z.versch);
  }
  zugGriffeUebernehmen(z);
  festlegenAlle();
  zugGriffeAblesen(z);
  const t1 = performance.now();
  const nAlt = haut.n;
  const pos = einbettungAuswerten(f.einbettung, haut);
  const t2 = performance.now();
  const neu: Haut = { ...f.haut, pos };
  // die Linien des feineren Netzes (ihre Proben) mit dem Stand ihrer Punkte von jetzt
  const neueLoops = f.loops.map((l, li) => {
    const jetzt = loops[li]!;
    return { ...jetzt, proben: l.proben, s: l.s, ruhe: l.ruhe, punkte: jetzt.punkte.map((p) => ({ ...p })) };
  });
  haut = neu;
  loops = neueLoops;
  netzGewachsen(nAlt, f.alt, null);
  geometrieNeu();
  festlegenAlle();
  const t3 = performance.now();
  zug = null;
  naechsteVorlage = { gew: f.gew, sys: systemAusDaten(daten[0]!), cVor: daten[1] ? systemAusDaten(daten[1]) : null };
  const [X, Y] = letzteMaus;
  if (!zugStarten(z.modal, z.ansicht, X, Y, z.spiegel, z.weite)) {
    naechsteVorlage = null;
    zug = null;
    return;
  }
  const t4 = performance.now();
  const n2 = zug as Zug | null;
  if (n2) {
    n2.vorher = z.vorher;
    n2.bewegt = true;
    n2.achse = z.achse;
    n2.weite0 = z.weite;
    n2.weite = z.weite;
    // das feinere Netz muss sich setzen
    if (!mitBereich()) {
      n2.offen = true;
      zieleVonJetzt(n2);
    }
  }
  hintergrundStufen++;
  letzteEinwechslungMs = Math.round(performance.now() - t0);
  letzteHintergrundMs = Math.round(performance.now() - f.t0);
  hautZeigen();
  baenderZeigen();
  for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
  statusZeigen();
  merke(messung.einwechseln, performance.now() - t0);
  einwechslungTeile = [t1 - t0, t2 - t1, t3 - t2, t4 - t3, performance.now() - t4].map(Math.round);
}

/** Verfeinern im Hintergrund (`?hintergrund=0`: im Vordergrund) */
const HINTERGRUND = new URLSearchParams(location.search).get('hintergrund') !== '0';
/** der Auftrag, der gerade im Hintergrund läuft: seine Nummer und das Netz, zu dem er gehört */
type Verfeinerung = { id: number; netz: Haut; t0: number };
/** sein Ergebnis: das feinere Netz mit Loops, jeder Punkt als Stelle auf der alten Haut, die Gewichte der Matrix */
type Verfeinert = { haut: Haut; loops: Loop[]; alt: Int32Array; einbettung: Einbettung; gew: Float64Array[]; neu: number; gelegt: number; t0: number };
let verfeinerung: Verfeinerung | null = null;
let verfeinerungsNr = 0;
/** auf diesem Netz fand der letzte Auftrag nichts zu verfeinern (bis zum Loslassen nicht noch einmal fragen) */
let nichtsZuVerfeinern: Haut | null = null;
/** die Nachbarn der Haut als flaches Feld (hängt nur am Netz; je Netz einmal gebaut) */
let nachbarnGemerkt: { haut: Haut; flach: ReturnType<typeof nachbarnFlach> } | null = null;
/** das Ergebnis eines Auftrags, das im nächsten Bild eingewechselt wird */
let eingetroffen: { netz: Haut; fertig: Verfeinert; daten: ZerlegungsDaten[] } | null = null;
/** die Zerlegung für den nächsten Löser (statt zu zerlegen) */
let naechsteVorlage: HautVorlage | null = null;
let letzteMaus: [number, number] | null = null;
let zerlegerWorker: Worker | null = null;
let hintergrundStufen = 0;
let letzteAusloesungMs = 0;
/** Auslösen im Hauptthread in Teilen (ms): Loops kopieren und festlegen, Auftrag packen und abschicken */
let ausloesungTeile: number[] = [];
/** der letzte Auftrag im Hintergrund in Teilen (ms): verdichten, einbetten, Zeilen, zerlegen */
let hintergrundTeile: number[] = [];
let letzteEinwechslungMs = 0;
/** das letzte Einwechseln in Teilen (ms): Linien festlegen, Punkte auf die Haut von jetzt, neues Netz übernehmen, Löser anlegen, zeigen */
let einwechslungTeile: number[] = [];
/** Auspacken des letzten Ergebnisses aus dem Hintergrund (ms) */
let letztesAuspacken = 0;
let letzteHintergrundMs = 0;
function zerleger(): Worker | null {
  if (!HINTERGRUND || hintergrundAus) return null;
  if (zerlegerWorker) return zerlegerWorker;
  try {
    zerlegerWorker = new Worker(new URL('./verfeinern.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  zerlegerWorker.onmessage = (e: MessageEvent<VerfeinerErgebnis | AufraeumErgebnis | Zwischenstand | { id: number; fehler: string }>) => {
    const d = e.data;
    // ein Zwischenstand (die gesetzte Haut nach der Vorstufe): Der Auftrag rechnet weiter; angewendet wird im nächsten Bild (`schleife`)
    if ('art' in d && d.art === 'zwischen') {
      if (aufraeumen && d.id === aufraeumen.id) zwischenstand = d;
      return;
    }
    auftraegeOffen = Math.max(0, auftraegeOffen - 1);
    // das Aufräumen: Das Ergebnis wird im nächsten Bild angewendet (`schleife`), wenn der Stand noch derselbe ist
    if (aufraeumen && d.id === aufraeumen.id) {
      if ('fehler' in d) {
        // dieser Auftrag ist gescheitert: Was für den Stand offen war, rechnet das Fenster selbst (wie ohne Hintergrund), wenn er noch
        // derselbe ist; für diesen Stand beginnt kein neuer Auftrag
        const f = aufraeumen;
        aufraeumen = null;
        aufgeraeumt = null;
        zwischenstand = null;
        if (!zug && !grund && f.netz === haut && f.stand === standZahl()) {
          const r = ruheOffen;
          ruheOffen = null;
          if (r?.setzen && !r.nurInRuhe) {
            hautNeuRechnen(r.ziele ?? loops.map(() => null), true);
            geometrieNeu();
          } else if (r?.verdichten) aufraeumenImFenster();
          hintergrundGescheitert = standZahl();
        }
        meldung = `Rechnen im Hintergrund fehlgeschlagen (${d.fehler}): im Fenster gerechnet`;
        if (zug) statusZeigen();
        else allesZeigen();
      } else if ('art' in d) aufgeraeumt = d;
      return;
    }
    const f = verfeinerung;
    if (!f || d.id !== f.id || 'art' in d) return;
    verfeinerung = null;
    if ('fehler' in d) {
      // der Zug läuft auf dem alten Netz weiter; verdichtet wird dann beim Loslassen
      nichtsZuVerfeinern = haut;
      meldung = `Verfeinern im Hintergrund fehlgeschlagen: ${d.fehler}`;
      statusZeigen();
      return;
    }
    hintergrundTeile = d.ms.map(Math.round);
    if (d.leer) {
      nichtsZuVerfeinern = haut;
      return;
    }
    if (f.netz !== haut) return;
    const ta = performance.now();
    const fertig: Verfeinert = { haut: hautAusFlach(d.haut), loops: d.loops, alt: d.alt, einbettung: d.einbettung, gew: gewichteAusFlach(d.gewStart, d.gewWert), neu: d.neu, gelegt: d.gelegt, t0: f.t0 };
    letztesAuspacken = Math.round(performance.now() - ta);
    // eingewechselt wird im nächsten Bild, an Stelle der Löserrunde (`schleife`): Beides in einem Bild hielte den Zug doppelt so lang an
    eingetroffen = { netz: f.netz, fertig, daten: d.daten };
  };
  zerlegerWorker.onerror = (e) => {
    // der Worker selbst ist ausgefallen (nicht ein einzelner Auftrag): ab jetzt ohne Hintergrund, alles im Fenster wie bis G4
    hintergrundAus = true;
    zerlegerWorker?.terminate();
    zerlegerWorker = null;
    auftraegeOffen = 0;
    verfeinerung = null;
    eingetroffen = null;
    nichtsZuVerfeinern = haut;
    aufraeumen = null;
    aufgeraeumt = null;
    zwischenstand = null;
    // was für den Stand offen ist (setzen, aufräumen), rechnet das Fenster gleich in der Ruhe selbst (`vorrechnenPlanen`)
    meldung = `Rechnen im Hintergrund ausgefallen (${e.message || 'Worker nicht geladen'}): weiter ohne Hintergrund`;
    if (zug) statusZeigen();
    else allesZeigen();
  };
  return zerlegerWorker;
}
/** der Worker selbst ist ausgefallen: Bis zum Neuladen läuft alles im Fenster (wie mit `?hintergrund=0`) */
let hintergrundAus = false;
/** Aufträge, an denen der Worker noch rechnet (auch verfallene) */
let auftraegeOffen = 0;
/**
 * Der Worker für einen neuen Auftrag: Rechnet er noch an einem verfallenen (der Zug wurde losgelassen, oder man hat nach dem Loslassen
 * gleich wieder gegriffen), wird er beendet und neu angelegt; der neue Auftrag wartete sonst dahinter (bei 23 400 Punkten Sekunden).
 */
function hintergrundFrei(): Worker | null {
  if (zerlegerWorker && auftraegeOffen > 0) {
    zerlegerWorker.terminate();
    zerlegerWorker = null;
    auftraegeOffen = 0;
  }
  return zerleger();
}

// ---------- Nach dem Loslassen und nach jeder Änderung: Nachlauf im Bildtakt, Rechnen im Hintergrund (G4.2, G4.3, G4.4) ----------

/**
 * Nach dem Loslassen (10.11., Gegenprüfung G4.2 und G4.3; über die ganze Haut nach der Geometrie; `?nachlauf=0`: wie bis dahin):
 * 1. **Nachlauf.** Steht die Haut beim Loslassen noch nicht, rechnet der Löser des Zugs im Bildtakt weiter, bis sie steht (vorher:
 *    höchstens vier Runden auf einmal, der Rest blieb liegen bis zum nächsten Greifen).
 * 2. **Aufräumen im Hintergrund** (`verfeinern.ts`, `aufraeumen`): verdichten, setzen bis zur Ruhe, nachverfeinern, zerlegen. Das
 *    Fenster zeigt so lange die Haut, wie sie ist, und wechselt einmal ein. Vorher lief das im Hauptthread und in Stufen: verdichten
 *    beim Loslassen, 30 ms später zerlegen (0,1–1,2 s Stillstand) und setzen, bis zu dreimal nachverfeinern und wieder zerlegen
 *    und setzen; jede Stufe war zu sehen, auch mitten im Anlauf des neuen Lösers.
 * 3. Die Zerlegung kommt mit (`vorlageBereit`): Das nächste Greifen zerlegt nicht. Greift man vorher, verfällt der Auftrag, und der
 *    Zug nimmt die Zerlegung des letzten Zugs (der Kern prüft, ob ihre Struktur noch passt).
 * Ändert inzwischen jemand den Stand (Rückgängig, ein Werkzeug, ein neuer Zug), enden Nachlauf und Auftrag ohne Wirkung; geprüft
 * wird am Stand selbst (`standZahl`), nicht an jeder Stelle, die ihn ändern kann.
 *
 * Nach jeder anderen Änderung (G4.4): Was für den Stand offen ist (`ruheOffen`), geht in der Ruhe an denselben Auftrag
 * (`ruheImHintergrund`, 30 ms nach der Änderung):
 * - **Kante an oder aus, Löschen** (`hautNeuRechnen`) und **ein neuer Loop**: Die Haut steht nicht mehr zum Stand. Der Auftrag
 *   zerlegt und setzt zuerst (Vorstufe) und meldet die gesetzte Haut samt Zerlegung als Zwischenstand (`zwischenAnwenden`); danach
 *   räumt er auf wie nach dem Loslassen. Bis dahin rechnete das Fenster selbst: Kante an hielt es 0,4 / 0,9 / 2,5 s an (5 200 /
 *   11 000 / 23 400 Punkte), und nach einem neuen Loop setzte erst der erste Griff die Haut, sichtbar als Ruck über die ganze Haut
 *   (5 bis 26 Einheiten je Bild, drei Bilder lang).
 * - **Sonst** (Punkt gesetzt, Rückgängig): nur die Zerlegung für das nächste Greifen (im Fenster 0,1 / 0,3 / 1 s Stillstand).
 * Verfällt ein Auftrag, weil sich der Stand geändert hat, beginnt in der Ruhe einer für den neuen Stand; was offen war, bleibt offen.
 */
const NACHLAUF = new URLSearchParams(location.search).get('nachlauf') !== '0';
const mitNachlauf = (): boolean => NACHLAUF && HINTERGRUND && !mitBereich() && GEWICHTE === 'geometrie';
/** der Löser des losgelassenen Zugs, der noch rechnet; Netz, Lagen und Loops, wie er sie zuletzt hinterlassen hat */
let nachlauf: { loeser: LoopZug; versch: (Float64Array | null)[]; runden: number; netz: Haut; lagen: number; loops: number } | null = null;
/**
 * der Auftrag im Hintergrund: seine Nummer und der Stand, zu dem er gehört (nach dem Zwischenstand der gesetzte Stand); `setzen`:
 * seine Vorstufe läuft noch, `verdichten`: er räumt auf (sonst nur die Zerlegung)
 */
let aufraeumen: { id: number; netz: Haut; stand: string; t0: number; setzen: boolean; nurInRuhe: boolean; verdichten: boolean } | null = null;
/** sein Zwischenstand und sein Ergebnis, bis sie im nächsten Bild angewendet werden */
let zwischenstand: Zwischenstand | null = null;
let aufgeraeumt: AufraeumErgebnis | null = null;
/** für diesen Stand ist ein Auftrag gescheitert: Das Fenster rechnet ihn selbst zu Ende */
let hintergrundGescheitert = '';
/** für diesen Stand ist ein Ergebnis angewendet: nichts mehr zu tun, solange nichts Neues offen ist */
let standFertig = '';
/**
 * Die Zerlegung, die zum Stand passt: die des letzten Zugs oder die aus dem Hintergrund. Das nächste Greifen bietet sie dem Löser an
 * (`loeserFuer`); er nimmt sie nur, wenn ihre Struktur passt. `vorlageStand`: der Stand, für den sie genau gerechnet ist (leer: nur
 * ungefähr, mit den Lagen von früher).
 */
let vorlageBereit: HautVorlage | null = null;
let vorlageStand = '';
/** der letzte Auftrag und der letzte Zwischenstand (zum Messen) */
let letzterAuftrag: {
  nr: number;
  geaendert: boolean;
  vorstufe: string;
  abgebrochen: boolean;
  neu: number;
  gelegt: number;
  durchgaenge: number;
  runden: number;
  ms: number[];
  gesamt: number;
  einwechseln: number;
  angewendet: boolean;
} | null = null;
let letzterZwischenstand: { nr: number; runden: number; ms: number[]; gesamt: number; einwechseln: number } | null = null;
let nachlaufRunden = 0;

const streu = new Float64Array(1);
const streuBits = new Uint32Array(streu.buffer);
/** Streuwert über Lagen (jedes Bit zählt) */
function lagenZahl(P: Float64Array): number {
  const u = new Uint32Array(P.buffer, P.byteOffset, 2 * P.length);
  let a = 2166136261;
  for (let i = 0; i < u.length; i++) a = Math.imul(a ^ u[i]!, 16777619);
  return a >>> 0;
}
/** Streuwert über die Loops: Punkte, Griffe, Kanten, Ecken, Zahl der Proben; dazu Maul und Pose */
function loopsZahl(): number {
  let a = 2166136261;
  const mische = (x: number) => {
    a = Math.imul(a ^ x, 16777619);
  };
  const zahl = (x: number) => {
    streu[0] = x;
    mische(streuBits[0]!);
    mische(streuBits[1]!);
  };
  mische(loops.length);
  for (const l of loops) {
    mische(l.id);
    mische(l.proben.length);
    zahl(l.laenge);
    mische((l.kante ? 1 : 0) | (l.pfad ? 2 : 0));
    mische(l.punkte.length);
    for (const p of l.punkte) {
      zahl(p.s);
      zahl(p.ref.x);
      zahl(p.ref.y);
      zahl(p.ref.z);
      mische((p.kante === undefined ? 2 : p.kante ? 1 : 0) | (p.ecke === undefined ? 8 : p.ecke ? 4 : 0) | (p.autoEcke ? 16 : 0) | (p.vonSelbst ? 32 : 0) | (p.mundwinkel ? 64 : 0));
      mische(p.kreuzung ?? -1);
      for (const g of [p.ein, p.aus]) {
        mische(g ? 1 : 0);
        if (g) {
          zahl(g.x);
          zahl(g.y);
          zahl(g.z);
        }
      }
    }
  }
  mische(grund ? 1 : 0);
  mische(maul ? maul.id : -1);
  return a >>> 0;
}
/** Der Stand, an dem Nachlauf und Auftrag hängen: Netz, Lagen, Loops */
const standZahl = (): string => `${haut.n}:${lagenZahl(haut.pos)}:${loopsZahl()}`;

/** Nachlauf: je Bild Runden des losgelassenen Zugs, bis die Form steht; dann geht das Aufräumen in den Hintergrund */
function nachlaufRechnen(): void {
  const n = nachlauf;
  if (!n) return;
  // ein neuer Zug bewegt sich, oder jemand hat den Stand geändert: Der Nachlauf endet, wo er ist
  if (zug?.bewegt || grund || n.netz !== haut || n.lagen !== lagenZahl(haut.pos) || n.loops !== loopsZahl()) {
    nachlauf = null;
    statusZeigen();
    // ohne neuen Zug: die Zerlegung für das nächste Greifen wie sonst in der Ruhe vorrechnen
    if (!zug) vorrechnenPlanen();
    return;
  }
  const t0 = performance.now();
  let steht = false;
  for (;;) {
    const tr = performance.now();
    const weg = rundeMitWeg(n.loeser, n.versch);
    n.runden++;
    nachlaufRunden++;
    if (weg < RUHE || n.runden >= NACH_RUNDEN) {
      steht = true;
      break;
    }
    const jetzt = performance.now();
    if (jetzt - t0 + (jetzt - tr) > BUDGET_MS) break;
  }
  if (steht) {
    nachlauf = null;
    festlegenAlle();
    aufraeumenStarten(ruheOffen ?? { setzen: false, nurInRuhe: false, verdichten: true, ziele: null });
    // ohne Hintergrund hat das Fenster selbst verdichtet: alles neu zeigen (und in der Ruhe setzen)
    if (!aufraeumen) allesZeigen();
    else for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
  } else n.lagen = lagenZahl(haut.pos);
  hautZeigen();
  baenderZeigen();
  statusZeigen();
  merke(messung.nachlauf, performance.now() - t0);
}

/** Aufräumen ohne Hintergrund, wie bis G4.1 im Fenster: verdichten jetzt, setzen in der Ruhe (`vorrechnenPlanen`) */
function aufraeumenImFenster(): void {
  const vor = haut;
  nachVerdichten();
  if (haut !== vor) {
    nachLoesenOffen = haut;
    nachVerfeinert = 0;
  }
}

/**
 * In der Ruhe nach einer Änderung (G4.4): Was für den Stand noch zu rechnen ist, geht in den Hintergrund: setzen, wenn die Haut nicht
 * steht, aufräumen nach einem Zug, sonst nur die Zerlegung für das nächste Greifen. Wahr, wenn der Hintergrund zuständig ist (dann
 * rechnet das Fenster hier nichts).
 */
function ruheImHintergrund(): boolean {
  if (!mitNachlauf() || !zerleger()) return false;
  const stand = standZahl();
  if (hintergrundGescheitert === stand) return false;
  // der Hintergrund rechnet schon für diesen Stand
  if (aufraeumen && aufraeumen.stand === stand) return true;
  // das Fenster hat selbst verdichtet (ohne Hintergrund gerechnet, z. B. beim Umschalten einer Ecke): Das Setzen danach übernimmt der
  // Hintergrund
  if (nachLoesenOffen === haut) {
    nachLoesenOffen = null;
    ruheOffen = { setzen: true, nurInRuhe: false, verdichten: true, ziele: null };
  }
  if (ruheOffen) aufraeumenStarten(ruheOffen);
  else if (standFertig !== stand && !(vorlageBereit && vorlageStand === stand)) aufraeumenStarten({ setzen: false, nurInRuhe: false, verdichten: false, ziele: null });
  else if (aufraeumen) {
    // ein Auftrag für einen früheren Stand läuft noch, und für diesen ist nichts zu tun: Er verfällt
    aufraeumen = null;
    aufgeraeumt = null;
    zwischenstand = null;
    statusZeigen();
  }
  return true;
}

/**
 * Den Auftrag an den Hintergrund geben: (`setzen`: zerlegen und setzen, Zwischenstand;) (`verdichten`: verdichten, setzen bis zur
 * Ruhe, nachverfeinern;) zerlegen. Siehe `RuheOffen`.
 */
function aufraeumenStarten(opt: RuheOffen): void {
  const w = hintergrundFrei();
  if (!w) {
    // kein Hintergrund: im Fenster wie bis G4 (nach einem neuen Loop geschah dort nichts)
    ruheOffen = null;
    if (opt.setzen && !opt.nurInRuhe) {
      hautNeuRechnen(opt.ziele ?? loops.map(() => null), true);
      geometrieNeu();
    } else if (opt.verdichten) aufraeumenImFenster();
    return;
  }
  const id = ++verfeinerungsNr;
  if (nachbarnGemerkt?.haut !== haut) nachbarnGemerkt = { haut, flach: nachbarnFlach(haut) };
  // die Verschiebungen gelten nur für die Loops, für die sie gerechnet sind
  const ziele = opt.ziele && opt.ziele.length === loops.length && opt.ziele.every((d, i) => !d || d.length === 3 * loops[i]!.proben.length) ? opt.ziele : null;
  const verdichtet = opt.verdichten && VERDICHTEN;
  const auftrag: AufraeumAuftrag = {
    art: 'aufraeumen',
    id,
    haut: hautFlach(haut, nachbarnGemerkt.flach),
    loops,
    exakt: loops.map(exakt),
    verdichten: verdichtet,
    maxKante: 1.75 * MK,
    opt: verdichtenOptionen(false),
    optNurTeilen: verdichtenOptionen(true),
    nachverfeinern: GENAU > 0 ? 3 : 0,
    kruemmung: KRUEMMUNG,
    gewichte: GEWICHTE,
    loeserOpt: RICHTUNG_OPT,
    ruhe: RUHE,
    maxRunden: RUNDEN_NEU,
    zuerstSetzen: opt.setzen,
    ziele,
    maxRundenZuerst: NACH_RUNDEN,
    nurInRuhe: opt.nurInRuhe,
  };
  aufraeumen = { id, netz: haut, stand: standZahl(), t0: performance.now(), setzen: opt.setzen, nurInRuhe: opt.nurInRuhe, verdichten: verdichtet };
  aufgeraeumt = null;
  zwischenstand = null;
  auftraegeOffen++;
  w.postMessage(auftrag, [auftrag.haut.pos.buffer]);
  statusZeigen();
}

/**
 * Der Zwischenstand aus dem Hintergrund (G4.4): die gesetzte Haut auf demselben Netz, samt ihrer Zerlegung für das nächste Greifen.
 * Der Auftrag räumt von diesem Stand aus weiter auf.
 */
function zwischenAnwenden(): void {
  const f = aufraeumen;
  const d = zwischenstand;
  zwischenstand = null;
  if (!f || !d || d.id !== f.id) return;
  // inzwischen hat jemand den Stand geändert: Der Auftrag gehört nicht mehr dazu (sein Ergebnis verfällt dann auch)
  if (grund || f.netz !== haut || d.pos.length !== haut.pos.length || f.stand !== standZahl()) return;
  const t0 = performance.now();
  haut.pos.set(d.pos);
  festlegenAlle();
  // wie nach jedem Neurechnen: neue Kreuzungen suchen (nach dem Löschen eines Punkts kann eine Linie eine andere schneiden)
  const kreuzungNeu = kreuzungenSuchen() > 0;
  if (d.gewStart && d.gewWert && d.daten.length) {
    vorlageBereit = { gew: gewichteAusFlach(d.gewStart, d.gewWert), sys: systemAusDaten(d.daten[0]!), cVor: d.daten[1] ? systemAusDaten(d.daten[1]) : null, struktur: d.struktur };
    vorlageStand = kreuzungNeu ? '' : standZahl();
  }
  if (kreuzungNeu) {
    // die Loops haben neue Punkte: Der Auftrag rechnet für den Stand ohne sie weiter und verfällt; in der Ruhe beginnt ein neuer
    ruheOffen = { setzen: true, nurInRuhe: f.nurInRuhe, verdichten: f.verdichten, ziele: null };
  } else {
    // die Haut steht; offen ist höchstens noch das Aufräumen, der Auftrag rechnet von diesem Stand aus weiter
    f.stand = standZahl();
    f.setzen = false;
    ruheOffen = f.verdichten ? { setzen: false, nurInRuhe: false, verdichten: true, ziele: null } : null;
  }
  letzterZwischenstand = { nr: d.id, runden: d.runden, ms: d.ms.map(Math.round), gesamt: Math.round(performance.now() - f.t0), einwechseln: 0 };
  allesZeigen();
  letzterZwischenstand.einwechseln = Math.round(performance.now() - t0);
}

/**
 * Ein Griff, der wartet (G4.4): Wer greift, während der Hintergrund für genau diesen Stand noch rechnet (gleich nach einem neuen Loop,
 * einer Kante, einem gesetzten Punkt, Rückgängig), bekäme einen Löser ohne fertige Zerlegung und, nach Loop oder Kante, auf einer
 * Haut, die nicht steht: Das Fenster zerlegte selbst (gemessen 0,15 / 0,3–0,5 / 0,9–2,5 s Stillstand beim Drücken bei 5 200 /
 * 11 000 / 23 400 Punkten), und die ersten Runden schlügen über die ganze Haut aus (5 / 8 / 25 Einheiten je Bild). Der Griff
 * wartet deshalb, bis der Hintergrund die gesetzte Haut bzw. die Zerlegung gebracht hat (gemessen 0,3 / 0,8 / 1,3 s nach einem
 * neuen Loop), und beginnt dann dort, wo die Maus inzwischen ist. Nach einem Zug wartet er nicht (dort gilt die Zerlegung des
 * letzten Zugs, G4.3). Dauert es länger als `GRIFF_WARTEN_MS`, beginnt er wie früher.
 */
let gegriffen: { a: Ansicht; X: number; Y: number; m: boolean; griff: { id: number; i: number; seite: 'ein' | 'aus' } | null; seit: number } | null = null;
const GRIFF_WARTEN_MS = 4000;
/** der Hintergrund bringt für genau diesen Stand noch, was der Griff braucht (die gesetzte Haut, die Zerlegung), oder beginnt gleich damit */
const griffWartet = (): boolean => {
  if (grund || !mitNachlauf() || hintergrundAus) return false;
  const stand = standZahl();
  if (hintergrundGescheitert === stand) return false;
  const f = aufraeumen && aufraeumen.netz === haut && aufraeumen.stand === stand ? aufraeumen : null;
  // die Haut wird gerade gesetzt, oder das steht an (30 ms nach der Änderung)
  if (f ? f.setzen : ruheOffen !== null && ruheOffen.setzen) return true;
  // offen ist nur das Aufräumen (nach einem Zug, nach dem Zwischenstand): Die Zerlegung dazu ist da
  if (ruheOffen) return false;
  // sonst fehlt höchstens die Zerlegung für diesen Stand; der Hintergrund rechnet sie (oder beginnt gleich)
  return !(vorlageBereit && vorlageStand === stand) && standFertig !== stand;
};
/** den wartenden Griff beginnen (die gesetzte Haut ist da, oder der Auftrag ist verfallen): von der Stelle des Drückens zur Maus von jetzt */
function griffNachholen(): void {
  const g = gegriffen;
  gegriffen = null;
  if (!g || zug) return;
  const ok = g.griff ? griffZugStarten(g.a, g.X, g.Y, g.m, loopNr(g.griff.id), g.griff.i, g.griff.seite) : auswahl.length > 0 && zugStarten(null, g.a, g.X, g.Y, g.m);
  if (ok && maus && maus.a === g.a && (maus.X !== g.X || maus.Y !== g.Y)) zugBewegen(maus.X, maus.Y);
  statusZeigen();
}

/** Das Ergebnis des Aufräumens anwenden: einmal einwechseln, die Zerlegung für das nächste Greifen merken */
function aufgeraeumtAnwenden(): void {
  const f = aufraeumen;
  const d = aufgeraeumt;
  if (!f || !d) return;
  aufraeumen = null;
  aufgeraeumt = null;
  const t0 = performance.now();
  // inzwischen hat jemand den Stand geändert: Das Ergebnis gehört nicht mehr dazu (was offen war, bleibt offen: In der Ruhe beginnt
  // ein Auftrag für den neuen Stand)
  const gilt = !grund && f.netz === haut && f.stand === standZahl();
  let neueHaut = false;
  if (gilt) {
    if (d.geaendert && d.haut && d.loops) {
      const fertig = d.loops;
      if (d.alt) {
        const nAlt = haut.n;
        haut = hautAusFlach(d.haut);
        // die Linien des feineren Netzes (ihre Proben) mit den Punkten von jetzt
        loops = loops.map((jetzt, li) => ({ ...jetzt, proben: fertig[li]!.proben, s: fertig[li]!.s, ruhe: fertig[li]!.ruhe, punkte: jetzt.punkte.map((p) => ({ ...p })) }));
        netzGewachsen(nAlt, d.alt, null);
        geometrieNeu();
        letzteVerdichtung = { neu: d.neu, gelegt: d.gelegt, ms: Math.round(d.ms[0]!) };
      } else haut.pos.set(d.haut.pos); // dasselbe Netz, gesetzt
      festlegenAlle();
      neueHaut = true;
    }
    if (d.gewStart && d.gewWert && d.daten.length) {
      vorlageBereit = { gew: gewichteAusFlach(d.gewStart, d.gewWert), sys: systemAusDaten(d.daten[0]!), cVor: d.daten[1] ? systemAusDaten(d.daten[1]) : null, struktur: d.struktur };
      vorlageStand = standZahl();
    }
    ruheOffen = null;
    standFertig = standZahl();
  }
  letzterAuftrag = {
    nr: f.id,
    geaendert: d.geaendert,
    vorstufe: d.vorstufe,
    abgebrochen: d.abgebrochen,
    neu: d.neu,
    gelegt: d.gelegt,
    durchgaenge: d.durchgaenge,
    runden: d.runden,
    ms: d.ms.map(Math.round),
    gesamt: Math.round(performance.now() - f.t0),
    einwechseln: 0,
    angewendet: gilt,
  };
  // hat sich an der Haut nichts geändert (nur die Zerlegung kam), bleibt alles, wie es gezeigt ist
  if (neueHaut || !gilt) allesZeigen();
  else statusZeigen();
  letzterAuftrag.einwechseln = Math.round(performance.now() - t0);
}

let zugStufen = 0;
let letzteEndrunden = 0;
let letzteStufeMs = 0;

/** Die Griffe übernehmen, wie der Zug sie verändert hat (vor dem Festlegen der Linien) */
function zugGriffeUebernehmen(z: Zug): void {
  loops.forEach((l, li) => {
    const g = z.griffeNeu[li];
    if (!g || !hatGriffe(l) || g.length !== l.punkte.length) return;
    l.punkte.forEach((p, i) => {
      p.ein = g[i]!.ein;
      p.aus = g[i]!.aus;
    });
  });
}

/** Mit O je Probe verschobene Loops: ihre Griffe aus der neuen Linie ablesen (nach dem Festlegen) */
function zugGriffeAblesen(z: Zug): void {
  for (const li of z.neuAblesen) {
    const l = loops[li];
    if (l && hatGriffe(l)) griffeAnlegen(l, l.ruhe);
  }
}

function zugEnde(ok: boolean): void {
  const z = zug;
  if (!z) return;
  const tLos = performance.now();
  zug = null;
  // eine Verfeinerung, die noch im Hintergrund rechnet oder noch nicht eingewechselt ist, verfällt (nach dem Zug wird wie bisher
  // verdichtet)
  verfeinerung = null;
  eingetroffen = null;
  nichtsZuVerfeinern = null;
  if (!ok) {
    wiederherstellen(z.vorher);
    return;
  }
  if (z.bewegt) {
    // zum Messen: wie weit sich die Haut in den Runden am Ende noch bewegt (so weit hinkte der Löser im Zug nach)
    const vorEnde = Float64Array.from(haut.pos);
    // nach dem Loslassen im Hintergrund weiter (Nachlauf, Aufräumen)?
    const imHintergrund = mitNachlauf() && zerleger() !== null;
    // über die ganze Haut hat der Löser im Bildtakt mitgerechnet: Runden am Ende nur, wenn die Haut noch nicht steht
    if (mitBereich()) z.loeser.schritt(z.versch, RUNDEN_ENDE);
    else if (imHintergrund) {
      // nur so weit, dass die Linien auf ihren Zielen liegen (dann können sie festgelegt werden); den Rest rechnet der Nachlauf
      if (z.zielNeu) {
        z.zielNeu = false;
        z.nachRunden++;
        if (rundeMitWeg(z.loeser, z.versch) < RUHE) z.offen = false;
      }
    } else for (let k = 0; z.offen && k < RUNDEN_ENDE; k++) if (rundeMitWeg(z.loeser, z.versch) < RUHE) z.offen = false;
    letzteEndrunden = 0;
    for (let k = 0; k < vorEnde.length; k += 3)
      letzteEndrunden = Math.max(letzteEndrunden, Math.hypot(haut.pos[k]! - vorEnde[k]!, haut.pos[k + 1]! - vorEnde[k + 1]!, haut.pos[k + 2]! - vorEnde[k + 2]!));
    zugGriffeUebernehmen(z);
    festlegenAlle();
    zugGriffeAblesen(z);
    kreuzungenSuchen();
    if (imHintergrund) {
      // ein geschlossener Loop, der durch eine neue Kreuzung seinen zweiten Punkt (und damit einen Pfad) bekam: genau auf ihn
      const aufPfad = linienAufPfad();
      poseSichern();
      zurueck.push(z.vorher);
      // die Zerlegung dieses Zugs für ein Greifen, das vor dem Ende des Aufräumens kommt (ungefähr: mit den Lagen vom Greifen)
      vorlageBereit = z.loeser.vorlage ?? vorlageBereit;
      vorlageStand = '';
      // die Ecken an Kreuzungen folgen den Kanten (wie gleich in `allesZeigen`): Erst danach steht der Stand, an dem der Nachlauf hängt
      eckenAuto(loops);
      aufgeraeumt = null;
      aufraeumen = null;
      zwischenstand = null;
      // offen ist jetzt das Aufräumen (der Löser des Zugs hat die Haut zu den Pfaden gerechnet, mit der Struktur von jetzt)
      ruheOffen = { setzen: false, nurInRuhe: false, verdichten: true, ziele: null };
      // hat `linienAufPfad` die Haut örtlich neu gelegt, gelten die Ziele des Zugs dort nicht mehr: gleich aufräumen
      if (z.offen && !aufPfad) nachlauf = { loeser: z.loeser, versch: z.versch, runden: z.nachRunden, netz: haut, lagen: lagenZahl(haut.pos), loops: loopsZahl() };
      else {
        nachlauf = null;
        aufraeumenStarten(ruheOffen);
      }
    } else {
      const vorVerdichten = haut;
      nachVerdichten();
      // aus den Kurven: das verdichtete Netz setzt sich gleich danach in der Ruhe (die neuen Punkte liegen erst nur rund zwischen den
      // alten); beim Loslassen zu lösen hieß, dort auf das Zerlegen des neuen Netzes zu warten (0,6 s bei 15 000 Punkten)
      if (!mitBereich() && haut !== vorVerdichten) {
        nachLoesenOffen = haut;
        nachVerfeinert = 0;
      }
      // ein geschlossener Loop, der durch eine neue Kreuzung seinen zweiten Punkt (und damit einen Pfad) bekam: genau auf ihn
      linienAufPfad();
      poseSichern();
      zurueck.push(z.vorher);
    }
  } else {
    for (const l of loops) for (const p of l.punkte) p.cur = { ...p.ref };
  }
  allesZeigen();
  letztesLoslassen = Math.round(performance.now() - tLos);
}
/** so lange hielt das letzte Loslassen den Hauptthread an (ms, zum Messen) */
let letztesLoslassen = 0;

/**
 * Nach einem Zug: Wo Kanten länger als 1,75 Kanten des Startnetzes geworden sind (dort ist die Haut gedehnt), wird das Netz feiner,
 * die neuen Punkte liegen rund (`verdichten`); wo Kanten kürzer als ½ geworden sind (dort ist sie gestaucht), werden sie
 * zusammengelegt. Im unberührten Netz ist keine Kante so lang (Startkugel höchstens 1,67) und kaum eine so kurz (0,1 % unter ½).
 * Dazu wird geteilt, wo das Netz eine Linie ungenauer als `GENAU` wiedergibt. `nurTeilen` (nach dem Setzen): nur das, ohne
 * Zusammenlegen. Mit `?winkel=1` auch, wo sich die Fläche über eine Kante um mehr als 25° dreht (bis ⅓ Startkante; Versuch, dann ohne
 * Zusammenlegen).
 */
function nachVerdichten(nurTeilen = false): void {
  const t0 = performance.now();
  const vorher = grund ? poseKnochen() : null;
  const nAlt = haut.n;
  const v = verdichtetesNetz(nurTeilen);
  if (!v) return;
  haut = v.haut;
  loops = v.loops;
  netzGewachsen(nAlt, v.alt, vorher);
  geometrieNeu();
  letzteVerdichtung = { neu: v.neu, gelegt: v.gelegt, ms: Math.round(performance.now() - t0) };
}

/** Wie verdichtet wird (für `verdichten`, im Fenster und im Hintergrund); `nurTeilen`: nichts zusammenlegen */
function verdichtenOptionen(nurTeilen = false): VerdichtenOptionen {
  // die Öffnung des Mauls wird nicht gezeigt und nicht verdichtet (in der Pose überspannt sie das offene Maul)
  const m = maulAktuell();
  const verborgen = m && m.offen.length === haut.tri.length / 3 ? m.offen : null;
  // nur in der Grundform: Dort ist die Linie ihr Pfad. In der Pose liegt sie neben ihm (die Punkte werden von der posierten Linie
  // abgelesen, die Griffe sind die der Grundform); nach dem Pfad geteilt wurde dort laufend neu vernetzt (Fressen-Probe: 572 neue,
  // 741 zusammengelegte Punkte, danach 2 umgeklappt)
  const genau = GENAU > 0 && grund === null ? { genau: GENAU * MK, genauHaut: GENAU_HAUT } : {};
  return WINKEL ? { winkel: 25, minKante: MK / 3, verborgen } : { verborgen, kurz: nurTeilen ? 0 : KURZ * MK, ...genau };
}

/** Das verdichtete Netz zum Stand jetzt (wie `nachVerdichten`, ohne es zu übernehmen) */
function verdichtetesNetz(nurTeilen = false): Verdichtet | null {
  if (!VERDICHTEN) return null;
  return verdichten(haut, loops, 1.75 * MK, verdichtenOptionen(nurTeilen));
}

// ---------- Loops schneiden, Formen zeichnen, Punkte setzen und löschen ----------

function loopSchneiden(a: Ansicht, A: [number, number], B: [number, number]): void {
  const l = loopAusSchnitt(haut, a, A, B, naechsteId, 10 / skala(a));
  if (!l) {
    meldung = 'Kein Loop: die Linie quer über den Körper ziehen';
    return;
  }
  if (l.art === 'mitte' && loops.some((x) => x.art === 'mitte')) {
    meldung = 'Den Loop in der Mitte gibt es schon';
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  einsetzenLetzten(PUNKTE_NOETIG);
  linienAufPfad(loops[loops.length - 1]);
  ruheNoetig();
  auswahl = [{ l: l.id, i: -1 }];
}

/**
 * Nach einem neuen Loop steht die Haut nicht mehr zum Stand (neues Netz an seiner Kette, eine Linie mehr, die ihre Krümmung trägt): Der
 * Hintergrund setzt sie (G4.4). Bis dahin setzte sie erst der erste Griff, sichtbar als Ruck über die ganze Haut.
 */
function ruheNoetig(): void {
  if (!LOOP_SETZEN || !mitNachlauf() || !zerleger()) return;
  // Erst wenn sich Loops kreuzen, halten sie die Haut. Mit einem einzelnen Ring ist die Form nicht bestimmt: Gemessen schwingt ein
  // neuer Löser dann bis 149 Einheiten je Runde aus, braucht 23 bis 36 Runden und landet je nach Netz woanders (bei 11 000 Punkten
  // im Fenster 11 Einheiten neben der Kugel, bei 5 200 nur 2); die nächsten Loops lägen dann auf der verzogenen Haut. Ohne Kreuzung
  // bleibt die Haut deshalb, wie sie ist (wie bis G4.3).
  if (!loops.some((l) => l.punkte.some((p) => p.kreuzung !== undefined))) return;
  // War schon etwas offen, bleibt es dabei (eine Kante muss sich setzen, ein Zug wird aufgeräumt). Der neue Loop allein setzt nur,
  // wenn die Haut dabei zur Ruhe kommt, und räumt nicht auf (jedes Aufräumen begänne wieder mit einem neuen Löser).
  const alt = ruheOffen;
  ruheOffen = { setzen: true, nurInRuhe: !(alt?.setzen && !alt.nurInRuhe), verdichten: alt?.verdichten ?? false, ziele: alt?.ziele ?? null };
}
/** `?loopsetzen=0`: nach einem neuen Loop setzt sich die Haut nicht von selbst (wie bis G4.3; dann setzt sie der erste Griff) */
const LOOP_SETZEN = new URLSearchParams(location.search).get('loopsetzen') !== '0';

/**
 * Den neuesten Loop als Kette von Kanten ins Netz einsetzen (dann kann er hart werden), danach seine Kreuzungen suchen. Geht der
 * Weg nicht auf, bleibt er auf der Haut liegen.
 */
function einsetzenLetzten(punkteNoetig = false): void {
  const vorher = grund ? poseKnochen() : null;
  const nAlt = haut.n;
  const r = loopEinsetzen(haut, loops, loops.length - 1);
  if (r) {
    haut = r.haut;
    loops = r.loops;
    netzGewachsen(nAlt, nurGewachsen(haut.n, nAlt), vorher);
    geometrieNeu();
    meldung = '';
  } else meldung = 'Loop liegt nur auf der Haut (nicht ins Netz eingesetzt): eine Kante wirkt dort kaum';
  // erst die Kreuzungen (in den anderen Loops teilen sie ein Stück), dann liest der neue Loop alle seine Griffe aus der Linie (wo
  // er eine Kante kreuzt, als Ecke je Seite, wie die Linie dort verläuft); ab jetzt speichert er sie. In der Grundform genau
  // (`griffeAnlegen` mit `genau`): Danach legt `linienAufPfad` die Linie auf ihren Pfad, die Haut folgt; in der Pose ändert sich nichts.
  kreuzungenSuchen(loops[loops.length - 1]);
  eckenAuto(loops);
  const neu = loops[loops.length - 1]!;
  griffeAnlegen(neu, neu.ruhe, !grund, punkteNoetig && !grund ? 0.05 * MK : 0);
}

/**
 * Kante der Auswahl an oder aus (Taste K): ein ganzer Loop samt seinen Punkten, sonst die gewählten Punkte. Eine Kante reicht von
 * einem Punkt bis zu seinen Nachbarpunkten, dort läuft der Knick in der Form aus. Sind schon alle gewählten an, gehen sie aus.
 */
function kanteSetzen(): void {
  if (auswahl.length === 0) return;
  const ist = (w: Wahl): boolean => {
    const l = loops[loopNr(w.l)];
    if (!l) return false;
    return w.i < 0 ? !!l.kante && l.punkte.every((p) => p.kante !== false) : (l.punkte[w.i]?.kante ?? l.kante ?? false);
  };
  const an = !auswahl.every(ist);
  zurueck.push(schnappschuss());
  // Ecken von selbst vorher: Wer eine wird, knickt (jede Seite so rund wie möglich), wer keine mehr ist, wird wieder glatt
  const vorher = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
  for (const w of auswahl) {
    const l = loops[loopNr(w.l)];
    if (!l) continue;
    if (w.i < 0) {
      l.kante = an;
      for (const p of l.punkte) p.kante = an;
    } else {
      const p = l.punkte[w.i];
      if (p) p.kante = an;
    }
  }
  meldung = an ? 'Kante' : 'keine Kante';
  eckenAuto(loops);
  hautNeuRechnen(kantenKnicken(loops, vorher));
  geometrieNeu();
  allesZeigen();
}

/**
 * Nach einer Kante an oder aus oder dem Löschen von Loops oder Punkten die Haut neu rechnen, über die ganze Haut, bis sie steht:
 * Ohne Zug blieb sie, wie sie war (eine Kante wirkte erst beim nächsten Zug, eine gelöschte Linie hinterließ ihre Form). `versch`: um
 * so viel bewegen sich die Linien dabei (gelöschte Punkte, je Loop 3 je Probe). In der Pose nur, wenn sich Linien bewegen.
 */
function hautNeuRechnen(versch: readonly (Float64Array | null)[] = loops.map(() => null), sofort = false): void {
  if (grund) {
    // in der Pose nur, wenn Linien sich bewegt haben (gelöschte Punkte): um sie herum
    if (!versch.some((d) => d)) return;
    const bewegt: V3[] = [];
    const ecken = new Set<number>();
    let weit = 0;
    loops.forEach((l, li) => {
      const d = versch[li];
      if (!d) return;
      for (let j = 0; j < l.proben.length; j++) {
        const w = Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!);
        if (w < 1e-9) continue;
        weit = Math.max(weit, w);
        bewegt.push(lageAus(l.ruhe, j));
        for (const v of l.proben[j]!.ecken) ecken.add(v);
      }
    });
    const z = loeserFuer(bewegt, Math.max(2 * MK, 3 * weit), ecken);
    z.schritt(versch, RUNDEN_NEU);
    festlegenAlle();
    kreuzungenSuchen();
    poseSichern();
    return;
  }
  vorrechnenAus();
  eckenAuto(loops);
  // über die ganze Haut nach der Geometrie rechnet das der Hintergrund (G4.4, `ruheImHintergrund`): Das Fenster hielt hier 0,4 / 0,9 /
  // 2,5 s an (Kante an bei 5 200 / 11 000 / 23 400 Punkten). `sofort`: im Fenster wie bis dahin (wer gleich danach weiterrechnet)
  if (!sofort && mitNachlauf() && zerleger()) {
    ruheOffen = { setzen: true, nurInRuhe: false, verdichten: true, ziele: versch.some((d) => d) ? [...versch] : null };
    return;
  }
  const t0 = performance.now();
  const z = new LoopZug(haut, loops, null, KRUEMMUNG, HAUT, GEWICHTE, RICHTUNG_OPT);
  // Punkte und Griffe sind schon die neuen: Das Ziel jeder Linie mit Pfad ist genau ihr Pfad
  z.schritt(
    loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : versch[li]!)),
    RUNDEN_NEU,
  );
  festlegenAlle();
  kreuzungenSuchen();
  const vorVerdichten = haut;
  nachVerdichten();
  if (!mitBereich() && haut !== vorVerdichten) {
    nachLoesenOffen = haut;
    nachVerfeinert = 0;
  }
  letzteZerlegung = z.loeser.zeitZerlegen;
  letzterBereich = z.loeser.anzahl;
  letztesNeuRechnen = Math.round(performance.now() - t0);
}
let letztesNeuRechnen = 0;

/**
 * In der Grundform liegt jede Linie genau auf ihrem Pfad. Ein neuer Loop (`neu`) und jeder, dessen Linie spürbar neben ihrem Pfad liegt
 * (ein geschlossener Loop, der gerade seinen zweiten Punkt bekam; Punkte oder Loops aus der Pose), bekommt seine Stellen auf dem Pfad
 * (`pfadParameter`, dann springen die Proben nur quer zur Linie), und die Haut folgt (Florian, 07.11.: ohne Zusatzpunkte, die Haut darf
 * sich beim Anlegen leicht ändern). Örtlich und mit Gedächtnis (jeder Punkt behält seine Krümmung): Aus den Kurven über die ganze Haut
 * gerechnet zog schon der erste Ring die Kugel um 10 Einheiten weg (mit einem Loop hält nichts sie rund; gemessen an der Kugel nach drei
 * Loops: so bis 2,2, im Mittel 0,4; aus den Kurven bis 8,9, im Mittel 3,5). Was nur um den Rest des Lösers daneben liegt, holt der
 * nächste Zug.
 */
function linienAufPfad(neu?: Loop): boolean {
  if (grund) return false;
  const versch: (Float64Array | null)[] = loops.map(() => null);
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  let weit = 0;
  loops.forEach((l, li) => {
    if (!exakt(l) || (l !== neu && pfadAbweichung(l) < 0.05 * MK)) return;
    pfadParameter(l);
    const d = pfadVersatz(l)!;
    versch[li] = d;
    for (let j = 0; j < l.proben.length; j++) {
      const w = Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!);
      if (w < 1e-9) continue;
      weit = Math.max(weit, w);
      bewegt.push(lageAus(l.ruhe, j));
      for (const v of l.proben[j]!.ecken) ecken.add(v);
    }
  });
  if (bewegt.length === 0) return false;
  vorrechnenAus();
  const t0 = performance.now();
  const z = new LoopZug(haut, loops, bereichUm(haut, bewegt, Math.max(2 * MK, 3 * weit), ecken), false, 'gedaechtnis');
  z.schritt(versch, RUNDEN_NEU);
  festlegenAlle();
  kreuzungenSuchen();
  letztesNeuRechnen = Math.round(performance.now() - t0);
  return true;
}

/** Ramer–Douglas–Peucker: Nummern der Punkte, die bleiben */
function vereinfachen(p: readonly [number, number][], tol: number): number[] {
  const bleibt = new Uint8Array(p.length);
  bleibt[0] = 1;
  bleibt[p.length - 1] = 1;
  const stapel: [number, number][] = [[0, p.length - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop()!;
    const [ax, ay] = p[a]!;
    const [bx, by] = p[b]!;
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1;
    let wo = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - p[i]![1]) - (ax - p[i]![0]) * (by - ay)) / L;
      if (d > best) {
        best = d;
        wo = i;
      }
    }
    if (best > tol) {
      bleibt[wo] = 1;
      stapel.push([a, wo], [wo, b]);
    }
  }
  return [...bleibt.keys()].filter((i) => bleibt[i]);
}

function formErstellen(a: Ansicht, roh: [number, number][]): void {
  if (roh.length < 8) return;
  const s = skala(a);
  // geschlossen: in zwei Hälften vereinfachen (Anfang bis zum fernsten Punkt und zurück), sonst fällt die erste Strecke auf
  // Länge null und es bleiben keine Punkte
  let fern = 0;
  roh.forEach((q, i) => {
    if (Math.hypot(q[0] - roh[0]![0], q[1] - roh[0]![1]) > Math.hypot(roh[fern]![0] - roh[0]![0], roh[fern]![1] - roh[0]![1])) fern = i;
  });
  const vorn = vereinfachen(roh.slice(0, fern + 1), 4 / s);
  const hinten = vereinfachen([...roh.slice(fern), roh[0]!], 4 / s).map((i) => i + fern);
  let idx = [...new Set([...vorn, ...hinten])].filter((i) => i < roh.length).sort((a, b) => a - b);
  if (idx.length < 4) idx = [0, 1, 2, 3].map((k) => Math.floor((k * roh.length) / 4));
  const k: Kurve = {
    art: 'mitte',
    punkte: idx.map((i) => {
      const [u, v] = uvAus(a, roh[i]![0], roh[i]![1]);
      return { x: u, y: v, z: 0 };
    }),
  };
  const { p, t } = kurveAbtasten(k, 0.6 * MK);
  const uv = p.map((q): [number, number] => [q.x, q.y]);
  const knoten = t.map((x, i) => (x === 0 ? i : -1)).filter((i) => i >= 0);
  const l = formAusZeichnung(haut, a, uv, knoten, naechsteId);
  if (!l) {
    meldung = 'Keine Form: ganz auf dem Körper zeichnen oder einmal über die Mitte (Front, Top) bzw. vorn über den Umriss (Seite)';
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  einsetzenLetzten(PUNKTE_NOETIG);
  linienAufPfad(loops[loops.length - 1]);
  ruheNoetig();
  auswahl = [{ l: l.id, i: -1 }];
}

/**
 * Stelle s auf dem Bézier-Pfad eines Loops, die im Blatt dem Klick (X, Y) am nächsten liegt: je Stück grob abgetastet, dann nach Newton
 * auf dem abgebildeten Stück (das Blatt bildet linear ab, Tiefe 0). `m`: auf der Spiegelhälfte bzw. dem Zwilling.
 */
function stelleAmPfad(a: Ansicht, l: Loop, X: number, Y: number, m: boolean): number {
  const P = l.punkte;
  const n = P.length;
  const zu = l.art !== 'ring';
  const flach = (v: V3): V3 => {
    const [x, y] = imBlatt(a, m ? spiegeln(v) : v);
    return { x, y, z: 0 };
  };
  const q = { x: X, y: Y, z: 0 };
  let best = Infinity;
  let bs = 0;
  for (let i = 0; i < (zu ? n : n - 1); i++) {
    const A = P[i]!;
    const E = P[(i + 1) % n]!;
    const [p0, ga, gb, p3] = [flach(A.ref), flach(A.aus!), flach(E.ein!), flach(E.ref)];
    let t0 = 0;
    let d0 = Infinity;
    for (let k = 0; k <= 32; k++) {
      const c = stueckPunkt(p0, ga, gb, p3, k / 32);
      const d = Math.hypot(c.x - X, c.y - Y);
      if (d < d0) {
        d0 = d;
        t0 = k / 32;
      }
    }
    const t = stueckNaechstes(p0, ga, gb, p3, q, t0);
    const c = stueckPunkt(p0, ga, gb, p3, t);
    const d = Math.hypot(c.x - X, c.y - Y);
    if (d < best) {
      best = d;
      bs = A.s + t * ((i + 1 < n ? E.s : E.s + l.laenge) - A.s);
    }
  }
  return zu && bs >= l.laenge ? bs - l.laenge : bs;
}

/**
 * Doppelklick auf eine Linie: dort ein Punkt, genau auf der gezeichneten Linie (in Ruhe ihr Bézier-Pfad). Nur nicht dort, wo schon ein
 * Punkt liegt (im Blatt näher als 3 Bildpunkte). Vorher galt „nicht näher als eine Startkante in s“: s ist aber die Stelle beim Anlegen,
 * nach einem weiten Zug lagen in diesem Abstand bis 25 Einheiten Linie (am herausgezogenen Ohr ließ sich neben den Punkten keiner setzen).
 */
function punktAmKlick(a: Ansicht, id: number, X: number, Y: number, m: boolean): void {
  const l = loops[loopNr(id)];
  if (!l) return;
  let bs = 0;
  if (exakt(l)) bs = stelleAmPfad(a, l, X, Y, m);
  else {
    const n = l.proben.length;
    let best = Infinity;
    for (let j = 0; j < (l.art === 'ring' ? n - 1 : n); j++) {
      const k = (j + 1) % n;
      const p = lageAus(l.ruhe, j);
      const q = lageAus(l.ruhe, k);
      const [x0, y0] = imBlatt(a, m ? spiegeln(p) : p);
      const [x1, y1] = imBlatt(a, m ? spiegeln(q) : q);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const t = Math.max(0, Math.min(1, ((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(X - x0 - t * dx, Y - y0 - t * dy);
      if (d < best) {
        best = d;
        bs = l.s[j]! + t * ((k > j ? l.s[k]! : l.laenge) - l.s[j]!);
      }
    }
  }
  const s = skala(a);
  if (
    l.punkte.some((p) => {
      const [x, y] = imBlatt(a, m ? spiegeln(p.ref) : p.ref);
      return Math.hypot(x - X, y - Y) * s < 3;
    })
  )
    return;
  zurueck.push(schnappschuss());
  const p = punktEinfuegen(l, bs, undefined, exakt(l));
  linienAufPfad();
  auswahl = [{ l: id, i: l.punkte.indexOf(p) }];
  allesZeigen();
}

function loeschen(): void {
  const punkte = auswahl.filter((w) => w.i >= 0).map((w) => loops[loopNr(w.l)]?.punkte[w.i]);
  const ganz = new Set(auswahl.filter((w) => w.i < 0).map((w) => w.l));
  const eigene = new Set(punkte.filter((p) => p && p.kreuzung === undefined));
  if (eigene.size === 0 && ganz.size === 0) {
    if (punkte.length) meldung = 'Kreuzungen bleiben, solange sich die Loops kreuzen';
    statusZeigen();
    return;
  }
  zurueck.push(schnappschuss());
  // Ecken von selbst vorher: Geht eine Kante mit ihrem Loop, werden ihre Kreuzungen in den anderen wieder glatt (wie Kante aus)
  const vorherEcken = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
  // wie in Illustrator: Die Nachbarn verbinden sich über ihre Griffe, die Linie folgt
  const versch = loops.map((l) => (ganz.has(l.id) ? null : punkteLoeschen(l, eigene as Set<LoopPunkt>)));
  const wegKreuz = new Set<number>();
  for (const l of loops) if (ganz.has(l.id)) for (const p of l.punkte) if (p.kreuzung !== undefined) wegKreuz.add(p.kreuzung);
  const bleiben = loops.map((l) => !ganz.has(l.id));
  loops = loops.filter((_, i) => bleiben[i]);
  const verschBleiben = versch.filter((_, i) => bleiben[i]);
  // Kreuzungen mit einem gelöschten Loop werden gewöhnliche Punkte: Die anderen Loops behalten ihre Linie und ihre Griffe
  for (const l of loops) for (const p of l.punkte) if (p.kreuzung !== undefined && wegKreuz.has(p.kreuzung)) delete p.kreuzung;
  eckenAuto(loops);
  kantenKnicken(loops, vorherEcken).forEach((d, li) => {
    if (!d) return;
    const v = verschBleiben[li];
    if (!v) verschBleiben[li] = d;
    else for (let k = 0; k < d.length; k++) v[k] = v[k]! + d[k]!;
  });
  auswahl = [];
  hautNeuRechnen(verschBleiben);
  allesZeigen();
}

// ---------- Stift P ----------

/**
 * Stift P (Teil A, 06.11.; Florian: „danach A mit echten Griffen und Stift P“): wie in Illustrator, in einem Blatt. Ein Klick setzt
 * eine Ecke, Klicken und Ziehen einen glatten Punkt (der Griff folgt der Maus, sein Gegenüber zeigt zurück), ein Klick auf den ersten
 * Punkt oder ⏎ schließt die Form; ⌫ nimmt den letzten Punkt zurück, Esc bricht ab. Die geschlossene Form wird wie mit F auf die Haut
 * gelegt (über die Mitte gezeichnet ein Ring, in der Seite vorn über den Umriss auch); ihre Punkte sind die geklickten. Die Linie liegt
 * auf der Haut, wie sie im Blatt gezeichnet ist; die Griffe der glatten Punkte sind die gezogenen, in die Fläche gehoben (im Blatt
 * genau, wie gezeichnet).
 */
type StiftAnker = { X: number; Y: number; aus: [number, number] | null };
let stift: { a: Ansicht; anker: StiftAnker[]; zieht: boolean } | null = null;

/** Druck mit dem Stift: neuer Punkt, oder am ersten Punkt die Form schließen. Wahr, solange gezogen wird */
function stiftDruecken(a: Ansicht, X: number, Y: number): boolean {
  if (stift && stift.a !== a) return false;
  if (!stift) stift = { a, anker: [], zieht: false };
  const erster = stift.anker[0];
  if (erster && stift.anker.length >= 3 && Math.hypot(X - erster.X, Y - erster.Y) * skala(a) < 8) {
    stiftFertig();
    return false;
  }
  stift.anker.push({ X, Y, aus: null });
  stift.zieht = true;
  blattZeichnen(a);
  return true;
}

/** Ziehen nach dem Druck: der Griff des neuen Punkts (unter 3 px eine Ecke) */
function stiftBewegen(X: number, Y: number): void {
  const st = stift;
  if (!st?.zieht) return;
  const p = st.anker[st.anker.length - 1]!;
  const dx = X - p.X;
  const dy = Y - p.Y;
  p.aus = Math.hypot(dx, dy) * skala(st.a) > 3 ? [dx, dy] : null;
}

/** Bézier-Stück von Anker p zu q im Blatt: die vier Kontrollpunkte (eine Ecke ohne Griff) */
const stiftStueck = (p: StiftAnker, q: StiftAnker): [number, number][] => [
  [p.X, p.Y],
  [p.X + (p.aus?.[0] ?? 0), p.Y + (p.aus?.[1] ?? 0)],
  [q.X - (q.aus?.[0] ?? 0), q.Y - (q.aus?.[1] ?? 0)],
  [q.X, q.Y],
];

function stiftZeichnen(el: SVGElement, a: Ansicht, rp: number): void {
  const st = stift!;
  const A = st.anker;
  let d = '';
  A.forEach((p, i) => {
    if (i === 0) d += `M ${p.X} ${p.Y}`;
    else {
      const c = stiftStueck(A[i - 1]!, p);
      d += ` C ${c[1]![0]} ${c[1]![1]} ${c[2]![0]} ${c[2]![1]} ${p.X} ${p.Y}`;
    }
  });
  // Gummiband zur Maus, solange nicht gezogen wird (wie in Illustrator)
  const letzt = A[A.length - 1];
  if (letzt && !st.zieht && maus && maus.a === a) d += ` C ${letzt.X + (letzt.aus?.[0] ?? 0)} ${letzt.Y + (letzt.aus?.[1] ?? 0)} ${maus.X} ${maus.Y} ${maus.X} ${maus.Y}`;
  if (d) el.append(element('path', 'entwurf stift', { d }));
  if (letzt?.aus) {
    for (const k of [1, -1]) {
      const gx = letzt.X + k * letzt.aus[0];
      const gy = letzt.Y + k * letzt.aus[1];
      el.append(element('line', 'griff-linie', { x1: letzt.X, y1: letzt.Y, x2: gx, y2: gy }));
      el.append(element('rect', 'griff', { x: gx - rp * 0.75, y: gy - rp * 0.75, width: rp * 1.5, height: rp * 1.5 }));
    }
  }
  A.forEach((p, i) => el.append(element('rect', `stift-anker${i === 0 ? ' erster' : ''}`, { x: p.X - rp, y: p.Y - rp, width: 2 * rp, height: 2 * rp })));
}

/** Form des Stifts schließen: abtasten, auf die Haut legen (wie F), Punkte an den Ankern; Griffe wie gezogen, Ecken als Ecken */
function stiftFertig(): void {
  const st = stift;
  stift = null;
  modus = 'frei';
  if (!st || st.anker.length < 3) {
    meldung = 'Stift: mindestens drei Punkte, dann den ersten anklicken (oder ⏎)';
    allesZeigen();
    return;
  }
  const a = st.a;
  const A = st.anker;
  const uv: [number, number][] = [];
  const knoten: number[] = [];
  for (let i = 0; i < A.length; i++) {
    const c = stiftStueck(A[i]!, A[(i + 1) % A.length]!);
    let lang = 0;
    for (let k = 0; k < 3; k++) lang += Math.hypot(c[k + 1]![0] - c[k]![0], c[k + 1]![1] - c[k]![1]);
    const n = Math.max(4, Math.ceil(lang / (0.6 * MK)));
    knoten.push(uv.length);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      const x = b[0]! * c[0]![0] + b[1]! * c[1]![0] + b[2]! * c[2]![0] + b[3]! * c[3]![0];
      const y = b[0]! * c[0]![1] + b[1]! * c[1]![1] + b[2]! * c[2]![1] + b[3]! * c[3]![1];
      uv.push(uvAus(a, x, y));
    }
  }
  const l = formAusZeichnung(haut, a, uv, knoten, naechsteId);
  if (!l) {
    meldung = 'Keine Form: ganz auf dem Körper zeichnen oder einmal über die Mitte (Front, Top) bzw. vorn über den Umriss (Seite)';
    allesZeigen();
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  einsetzenLetzten();
  const neu = loops.find((x) => x.id === l.id);
  // Griffe genau aus der Zeichnung: Kreuzungen teilen die gezeichneten Stücke (de Casteljau), jeder Griff in der Fläche der Haut. Passt
  // ein Anker nicht (er lag nicht auf dem Körper), bleiben die aus der Linie abgelesenen Griffe
  if (neu && hatGriffe(neu)) {
    const zeichnung = A.map((p, i) => stiftStueck(p, A[(i + 1) % A.length]!).map(([x, y]) => uvAus(a, x, y)) as unknown as ZeichnungsStueck);
    griffeAusZeichnung(haut, neu, a, zeichnung);
  }
  // die Linie genau auf den Pfad (im Blatt ist er genau die gezeichnete Form)
  if (neu) linienAufPfad(neu);
  ruheNoetig();
  auswahl = [{ l: l.id, i: -1 }];
  meldung = '';
  allesZeigen();
}

// ---------- Maus und Tasten ----------

let maus: { a: Ansicht; X: number; Y: number } | null = null;

/**
 * Doppelklick selbst zählen: das Blatt wird beim Drücken neu gezeichnet, `dblclick` kommt dann nicht an. Gezählt wird die Zeit des
 * Ereignisses (`t`), nicht die der Bearbeitung: Der erste Klick startet einen Zug, dessen Löser bis einige Hundert Millisekunden
 * zerlegt, der zweite käme sonst zu spät an.
 */
const letzterKlick = { t: 0, X: 0, Y: 0, was: '' };
function doppelklick(a: Ansicht, was: string, X: number, Y: number, t: number): boolean {
  const jetzt = t;
  const ja = was === letzterKlick.was && jetzt - letzterKlick.t < 400 && Math.hypot(X - letzterKlick.X, Y - letzterKlick.Y) * skala(a) < 6;
  Object.assign(letzterKlick, { t: ja ? 0 : jetzt, X, Y, was });
  return ja;
}

/** mittlere Taste gedrückt: das Blatt verschieben (wie in Blender) */
let schwenk: { a: Ansicht; x: number; y: number } | null = null;

function druecken(a: Ansicht, e: PointerEvent): void {
  const [X, Y] = blattPunkt(a, e);
  if (zug && zug.modal) {
    zugEnde(e.button === 0);
    return;
  }
  if (e.button === 1) {
    schwenk = { a, x: e.clientX, y: e.clientY };
    blaetter[a].setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  if (modus === 'loop') {
    entwurf = { a, x0: X, y0: Y, x1: X, y1: Y };
    blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  if (modus === 'form') {
    spur = { a, p: [[X, Y]] };
    blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  if (modus === 'stift') {
    if (stiftDruecken(a, X, Y)) blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  const ziel = e.target as SVGElement;
  const l = ziel.getAttribute('data-l');
  if (l === null) {
    auswahl = [];
    meldung = '';
    allesZeigen();
    return;
  }
  const i = Number(ziel.getAttribute('data-i') ?? -1);
  const m = ziel.getAttribute('data-m') === '1';
  const g = ziel.getAttribute('data-g');
  if (g === 'ein' || g === 'aus') {
    // Doppelklick auf einen Griff: sein Punkt Ecke ↔ glatt (an einer Kreuzung liegt oft der Punkt des anderen Loops obenauf)
    if (doppelklick(a, `g${l}:${i}`, X, Y, e.timeStamp)) {
      eckeUmschalten(Number(l), i);
      return;
    }
    if (griffWartet()) {
      gegriffen = { a, X, Y, m, griff: { id: Number(l), i, seite: g }, seit: performance.now() };
      maus = { a, X, Y };
      blaetter[a].setPointerCapture(e.pointerId);
      statusZeigen();
    } else if (griffZugStarten(a, X, Y, m, loopNr(Number(l)), i, g)) blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  if (i < 0 && doppelklick(a, `${l}:${m}`, X, Y, e.timeStamp)) {
    punktAmKlick(a, Number(l), X, Y, m);
    return;
  }
  // Doppelklick oder ⌥-Klick auf einen Punkt: Ecke ↔ glatt
  if (i >= 0 && (doppelklick(a, `p${l}:${i}`, X, Y, e.timeStamp) || e.altKey)) {
    eckeUmschalten(Number(l), i);
    return;
  }
  const w = { l: Number(l), i };
  const drin = auswahl.some((x) => x.l === w.l && x.i === w.i);
  if (e.shiftKey) auswahl = drin ? auswahl.filter((x) => x.l !== w.l || x.i !== w.i) : [...auswahl, w];
  else if (!drin) auswahl = [w];
  allesZeigen();
  if (auswahl.length && griffWartet()) {
    gegriffen = { a, X, Y, m, griff: null, seit: performance.now() };
    maus = { a, X, Y };
    blaetter[a].setPointerCapture(e.pointerId);
    statusZeigen();
  } else if (auswahl.length && zugStarten(null, a, X, Y, m)) blaetter[a].setPointerCapture(e.pointerId);
}

function bewegen(a: Ansicht, e: PointerEvent): void {
  if (schwenk && schwenk.a === a) {
    schieben(a, e.clientX - schwenk.x, e.clientY - schwenk.y);
    schwenk = { a, x: e.clientX, y: e.clientY };
    return;
  }
  const [X, Y] = blattPunkt(a, e);
  maus = { a, X, Y };
  if (entwurf && entwurf.a === a) {
    entwurf = { ...entwurf, x1: X, y1: Y };
    blattZeichnen(a);
    return;
  }
  if (spur && spur.a === a) {
    const [lx, ly] = spur.p[spur.p.length - 1]!;
    if (Math.hypot(X - lx, Y - ly) * skala(a) > 2) spur.p.push([X, Y]);
    blattZeichnen(a);
    return;
  }
  if (stift && stift.a === a) {
    stiftBewegen(X, Y);
    blattZeichnen(a);
    return;
  }
  if (zug && !zug.modal && zug.ansicht === a) zugBewegen(X, Y);
}

function loslassen(a: Ansicht): void {
  if (schwenk && schwenk.a === a) {
    schwenk = null;
    return;
  }
  if (entwurf && entwurf.a === a) {
    const { x0, y0, x1, y1 } = entwurf;
    entwurf = null;
    modus = 'frei';
    if (Math.hypot(x1 - x0, y1 - y0) * skala(a) > 6) loopSchneiden(a, uvAus(a, x0, y0), uvAus(a, x1, y1));
    allesZeigen();
    return;
  }
  if (spur && spur.a === a) {
    const p = spur.p;
    spur = null;
    modus = 'frei';
    formErstellen(a, p);
    allesZeigen();
    return;
  }
  if (stift && stift.a === a && stift.zieht) {
    stift.zieht = false;
    blattZeichnen(a);
    return;
  }
  // losgelassen, bevor der Griff beginnen konnte: ein Klick (die Auswahl steht schon)
  if (gegriffen && gegriffen.a === a) {
    gegriffen = null;
    statusZeigen();
    return;
  }
  if (zug && !zug.modal) zugEnde(true);
}

for (const a of ['seite', 'front', 'top'] as const) {
  const el = blaetter[a];
  el.addEventListener('pointerdown', (e) => druecken(a, e));
  el.addEventListener('pointermove', (e) => bewegen(a, e));
  el.addEventListener('pointerup', () => loslassen(a));
  el.addEventListener('pointercancel', () => loslassen(a));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  // Rad und Pinch zoomen zum Zeiger, zwei Finger auf dem Trackpad verschieben (wie im Editor); nicht passiv, sonst zoomt die Seite
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (istTrackpad(e)) schieben(a, -e.deltaX, -e.deltaY);
      else zoomen(a, radFaktor(e), e.clientX, e.clientY);
    },
    { passive: false },
  );
  // die mittlere Taste soll nicht das automatische Rollen des Browsers starten
  el.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });
}
// G/S/R folgt der Maus überall im Fenster
window.addEventListener('pointermove', (e) => {
  if (!zug || !zug.modal) return;
  const [X, Y] = blattPunkt(zug.ansicht, e);
  zugBewegen(X, Y);
});

// Knöpfe und Regler im 3D-Blatt: Die Kamerasteuerung des Blatts fängt sonst den Zeiger (der Klick kam nie am Knopf an)
const reglerLeiste = document.querySelector('.regler-leiste');
for (const art of ['pointerdown', 'wheel'] as const) reglerLeiste?.addEventListener(art, (e) => e.stopPropagation());

knopfLoop.addEventListener('click', () => {
  modus = modus === 'loop' ? 'frei' : 'loop';
  allesZeigen();
});
knopfForm.addEventListener('click', () => {
  modus = modus === 'form' ? 'frei' : 'form';
  allesZeigen();
});
knopfStift.addEventListener('click', () => {
  modus = modus === 'stift' ? 'frei' : 'stift';
  stift = null;
  allesZeigen();
});
knopfO.addEventListener('click', () => {
  oAn = !oAn;
  allesZeigen();
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (zug && zug.modal) {
    if (e.key === 'Escape') zugEnde(false);
    else if (e.key === 'Enter') zugEnde(true);
    else if (k === 'x' || k === 'y' || k === 'z') {
      zug.achse = zug.achse === k ? null : k;
      if (maus) zugBewegen(maus.X, maus.Y);
    }
    e.preventDefault();
    return;
  }
  if (zug) return;
  // beim Zeichnen mit dem Stift: ⏎ schließt, ⌫ nimmt den letzten Punkt zurück, Esc bricht ab
  if (stift) {
    if (e.key === 'Enter') {
      stiftFertig();
      e.preventDefault();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      stift.anker.pop();
      if (stift.anker.length === 0) stift = null;
      allesZeigen();
      e.preventDefault();
      return;
    }
  }
  if ((e.metaKey || e.ctrlKey) && k === 'z') {
    const s = zurueck.pop();
    if (s) wiederherstellen(s);
    e.preventDefault();
  } else if (k === 'g' || k === 's' || k === 'r') {
    if (maus && zugStarten(k, maus.a, maus.X, maus.Y, false)) allesZeigen();
  } else if (k === 'l') {
    modus = modus === 'loop' ? 'frei' : 'loop';
    allesZeigen();
  } else if (k === 'f') {
    modus = modus === 'form' ? 'frei' : 'form';
    allesZeigen();
  } else if (k === 'p') {
    modus = modus === 'stift' ? 'frei' : 'stift';
    stift = null;
    allesZeigen();
  } else if (k === 'o') {
    oAn = !oAn;
    allesZeigen();
  } else if (e.key === 'Home') {
    // Pos1: alle Blätter wieder ganz zeigen
    for (const a of ['seite', 'front', 'top'] as const) {
      Object.assign(ausschnitt[a], { cx: 0, cy: 0, zoom: 1 });
      ausschnittGeaendert(a);
    }
  } else if (e.key === '[' || e.key === ']') {
    radius = Math.max(10, Math.min(600, radius * (e.key === ']' ? 1.2 : 1 / 1.2)));
    allesZeigen();
  } else if (e.key === 'Escape') {
    modus = 'frei';
    entwurf = null;
    spur = null;
    stift = null;
    auswahl = [];
    meldung = '';
    allesZeigen();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    loeschen();
  } else if (k === 'k') {
    kanteSetzen();
  }
});

// ---------- Zeichnen ----------

function rendern(): void {
  const hoehe = window.innerHeight;
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setClearColor(PAPIER, 1);
  renderer.clear();
  renderer.setScissorTest(true);
  const liste: [keyof typeof felder, OrthographicCamera | PerspectiveCamera][] = [
    ['seite', kameras.seite],
    ['front', kameras.front],
    ['top', kameras.top],
    ['drei', dreiKamera],
  ];
  for (const [name, kamera] of liste) {
    const r = felder[name].getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const y = hoehe - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height);
    renderer.setScissor(r.left, y, r.width, r.height);
    if (kamera instanceof OrthographicCamera && name !== 'drei') {
      // Blattkoordinaten (x, y nach unten) und Kamera: rechts = Blatt-x, oben = −Blatt-y, in allen drei Ansichten
      const s = skala(name);
      const w = r.width / s / 2;
      const h = r.height / s / 2;
      const { cx, cy } = ausschnitt[name];
      kamera.left = cx - w;
      kamera.right = cx + w;
      kamera.top = -cy + h;
      kamera.bottom = -cy - h;
    } else if (kamera instanceof PerspectiveCamera) {
      kamera.aspect = r.width / r.height;
    }
    kamera.updateProjectionMatrix();
    // die Kurven zeichnen in den Blättern die SVG-Ebenen, im 3D die Bänder
    for (const b of baender) b.visible = name === 'drei';
    umrissMaterial.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
    umrissMaterial.uniforms.uBreite!.value = 2.5 * dpr;
    for (const m of bandMaterialien) {
      m.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
      m.uniforms.uDpr!.value = dpr;
    }
    renderer.clearDepth();
    renderer.render(szene, kamera);
  }
}

function schleife(): void {
  // ein fertig verfeinertes Netz aus dem Hintergrund wird an Stelle der Löserrunde dieses Bilds eingewechselt
  const e = eingetroffen;
  eingetroffen = null;
  if (e && zug && e.netz === haut) einwechseln(e.fertig, e.daten);
  else zugRechnen();
  // nach dem Loslassen: der Nachlauf; danach, was aus dem Hintergrund gekommen ist (nicht, solange eine Maustaste einen Zug hält)
  nachlaufRechnen();
  if (zwischenstand && !zug && !nachlauf) zwischenAnwenden();
  if (aufgeraeumt && !zug && !nachlauf) aufgeraeumtAnwenden();
  // ein wartender Griff beginnt, sobald die gesetzte Haut da ist (oder nichts mehr für diesen Stand gesetzt wird)
  if (gegriffen && !zug) {
    if (!griffWartet() || performance.now() - gegriffen.seit > GRIFF_WARTEN_MS) griffNachholen();
    else if (!aufraeumen && vorrechnenUhr === null) vorrechnenPlanen();
  }
  if (neuZeichnen) {
    neuZeichnen = false;
    rendern();
  }
  requestAnimationFrame(schleife);
}
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  allesZeigen();
});

reglerZeigen();
allesZeigen();
schleife();

// Prüfhaken für Skripte: Loops, Lagen, Bildschirmpunkte, Zeiten
(window as unknown as { __kurven: unknown }).__kurven = {
  /** Prüfung im laufenden Zug über die ganze Haut: n weitere Runden zu den Zielen von jetzt; zurück kommt, wie weit sich die Haut dabei bewegt */
  weiterrechnen: (n: number): number | null => {
    const z = zug;
    if (!z || mitBereich()) return null;
    const vor = Float64Array.from(haut.pos);
    z.loeser.schritt(z.versch, n);
    let m = 0;
    for (let k = 0; k < vor.length; k += 3) m = Math.max(m, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
    hautZeigen();
    baenderZeigen();
    return m;
  },
  /** Prüfung: der Worker fällt aus (wie ein Fehler beim Laden oder ein Absturz); danach läuft alles im Fenster */
  ausfall: () => zerleger()?.onerror?.(new ErrorEvent('error', { message: 'Probe' })),
  /** Prüfung: der laufende Auftrag nach dem Loslassen meldet einen Fehler; das Fenster räumt dann selbst auf */
  auftragFehler: () => {
    const w = zerleger();
    if (w && aufraeumen) w.onmessage?.(new MessageEvent('message', { data: { id: aufraeumen.id, fehler: 'Probe' } }));
  },
  /** Prüfung: n weitere Runden über die ganze Haut (wie das Setzen in der Ruhe), ohne Verdichten; ist die Haut fertig gerechnet? */
  nachrechnen: (n: number) => {
    if (mitBereich() || zug) return;
    const z = new LoopZug(haut, loops, null, KRUEMMUNG, 'kurven', GEWICHTE, RICHTUNG_OPT);
    z.schritt(
      loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : null)),
      n,
    );
    festlegenAlle();
    hautZeigen();
    baenderZeigen();
  },
  loops: () =>
    loops.map((l) => ({
      id: l.id,
      art: l.art,
      proben: l.proben.length,
      laenge: l.laenge,
      punkte: l.punkte.map((p) => ({
        s: p.s,
        ref: p.ref,
        sichtbar: istSichtbar(p),
        kreuzung: p.kreuzung ?? null,
        ecke: istEcke(p),
        autoEcke: p.autoEcke ?? false,
        kante: p.kante ?? null,
        mundwinkel: p.mundwinkel ?? false,
        ein: p.ein ?? null,
        aus: p.aus ?? null,
      })),
      pfad: hatGriffe(l),
      kante: l.kante ?? null,
      ruhe: Array.from(l.ruhe),
      s: Array.from(l.s),
    })),
  auswahl: () => auswahl,
  /** je Loop: wie weit seine Linie höchstens neben ihrem Pfad liegt (an gleicher Stelle; 0 ohne Pfad) */
  pfadRest: (): number[] => loops.map((l) => pfadAbweichung(l)),
  /** Knick der Linie an einem Punkt (Grad): Richtung hinein gegen hinaus, je Seite für sich gemessen */
  knickAm: (id: number, i: number): number => {
    const l = loops[loopNr(id)];
    if (!l?.punkte[i]) return NaN;
    const g = griffeBei(l, i);
    if (!g.ein || !g.aus) return NaN;
    const c = -(g.ein.x * g.aus.x + g.ein.y * g.aus.y + g.ein.z * g.aus.z) / (Math.hypot(g.ein.x, g.ein.y, g.ein.z) * Math.hypot(g.aus.x, g.aus.y, g.aus.z));
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  },
  /** Griffspitzen eines Punkts in der Welt, wie gezeigt (wahre Länge; `faktor` ist seit dem 10.11. immer 1, für ältere Proben) */
  griffe: (id: number, i: number): { ein: V3 | null; aus: V3 | null; faktor: number } => {
    const l = loops[loopNr(id)];
    const p = l?.punkte[i];
    if (!l || !p) return { ein: null, aus: null, faktor: 1 };
    const g = griffeBei(l, i);
    const spitze = (v: V3 | null) => (v ? { x: p.ref.x + v.x, y: p.ref.y + v.y, z: p.ref.z + v.z } : null);
    return { ein: spitze(g.ein), aus: spitze(g.aus), faktor: 1 };
  },
  /** 3D-Kamera setzen (für Nahbilder) */
  kamera: (pos: V3, ziel: V3) => {
    dreiKamera.position.set(pos.x, pos.y, pos.z);
    steuerung.target.set(ziel.x, ziel.y, ziel.z);
    steuerung.update();
    neuZeichnen = true;
  },
  /** Knick quer über einen Loop je Probe (Grad) */
  knick: (id: number): number[] => {
    const l = loops[loopNr(id)];
    return l ? Array.from(knickWinkel(haut, l)) : [];
  },
  /** umgeschlagene Dreiecke (Normale gegen die mittlere Normale ihrer Ecken) */
  umgeschlagen: (): number => {
    const P = haut.pos;
    const t = haut.tri;
    const vn = new Float64Array(P.length);
    const fn: number[][] = [];
    for (let i = 0; i < t.length; i += 3) {
      const [a, b, c] = [t[i]!, t[i + 1]!, t[i + 2]!];
      const ab = [P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!, P[3 * b + 2]! - P[3 * a + 2]!];
      const ac = [P[3 * c]! - P[3 * a]!, P[3 * c + 1]! - P[3 * a + 1]!, P[3 * c + 2]! - P[3 * a + 2]!];
      const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
      fn.push(f);
      for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + f[k]!;
    }
    let z = 0;
    for (let i = 0; i < t.length; i += 3) {
      const f = fn[i / 3]!;
      const m = [0, 1, 2].map((k) => vn[3 * t[i]! + k]! + vn[3 * t[i + 1]! + k]! + vn[3 * t[i + 2]! + k]!);
      if (f[0]! * m[0]! + f[1]! * m[1]! + f[2]! * m[2]! < 0) z++;
    }
    return z;
  },
  /** das Maul: Loop, Öffnung, Dreiecke der Öffnung und des Inneren, umgeschlagene Dreiecke und offene Kanten wie gezeigt */
  maul: (orte = false) => {
    const g = maulGezeigt;
    if (!maul || !g) return maul ? { ...maul, geschnitten: false } : null;
    const o = { m: g.m, positionen: Float32Array.from(haut.pos), innenPositionen: g.innenPositionen };
    const wo: number[][] = [];
    const umg = (P: Float32Array, I: Uint32Array, ruhe: Float32Array): number => {
      const vn = new Float64Array(P.length);
      const fn: number[][] = [];
      for (let i = 0; i < I.length; i += 3) {
        const [a, b, c] = [I[i]!, I[i + 1]!, I[i + 2]!];
        const ab = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
        const ac = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
        const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
        fn.push(f);
        for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + f[k]!;
      }
      let z = 0;
      for (let i = 0; i < I.length; i += 3) {
        const f = fn[i / 3]!;
        const mm = [0, 1, 2].map((k) => vn[3 * I[i]! + k]! + vn[3 * I[i + 1]! + k]! + vn[3 * I[i + 2]! + k]!);
        if (f[0]! * mm[0]! + f[1]! * mm[1]! + f[2]! * mm[2]! >= 0) continue;
        z++;
        if (orte) wo.push([0, 1, 2].map((k) => Math.round((ruhe[3 * I[i]! + k]! + ruhe[3 * I[i + 1]! + k]! + ruhe[3 * I[i + 2]! + k]!) / 3)));
      }
      return z;
    };
    // Kanten mit mehr oder weniger als zwei Dreiecken (Haut und Inneres). Punkte innerhalb eines Hundertstels gelten als einer: Die
    // Haut wird in Float64 gedreht, das Innere in Float32, gerundet fielen gleiche Punkte an Rundungsgrenzen auseinander
    const zellen = new Map<string, { x: number; y: number; z: number; id: number }[]>();
    let ids = 0;
    const nr = (x: number, y: number, z: number): number => {
      const cx = Math.floor(x / 0.05);
      const cy = Math.floor(y / 0.05);
      const cz = Math.floor(z / 0.05);
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++)
          for (let c = -1; c <= 1; c++)
            for (const q of zellen.get(`${cx + a},${cy + b},${cz + c}`) ?? []) if (Math.hypot(q.x - x, q.y - y, q.z - z) < 0.01) return q.id;
      const k = `${cx},${cy},${cz}`;
      const liste = zellen.get(k) ?? [];
      zellen.set(k, liste);
      liste.push({ x, y, z, id: ids });
      return ids++;
    };
    const zahl = new Map<string, number>();
    const dazu = (P: Float32Array, I: Uint32Array) => {
      for (let i = 0; i < I.length; i += 3) {
        const e = [0, 1, 2].map((k) => {
          const v = I[i + k]!;
          return nr(P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!);
        });
        for (let k = 0; k < 3; k++) {
          const a = Math.min(e[k]!, e[(k + 1) % 3]!);
          const b = Math.max(e[k]!, e[(k + 1) % 3]!);
          if (a !== b) zahl.set(`${a},${b}`, (zahl.get(`${a},${b}`) ?? 0) + 1);
        }
      }
    };
    dazu(o.positionen, o.m.indizes);
    dazu(o.innenPositionen, g.innenIndizes);
    return {
      ...maul,
      geschnitten: true,
      oeffnung: o.m.offen.reduce((a, b) => a + b, 0),
      innen: g.innenIndizes.length / 3,
      umgeschlagenHaut: umg(o.positionen, o.m.indizes, o.m.positionen),
      umgeschlagenInnen: umg(o.innenPositionen, g.innenIndizes, o.innenPositionen),
      offeneKanten: [...zahl.values()].filter((z) => z !== 2).length,
      gelenk: o.m.gelenk,
      ...(orte ? { umgeschlagenWo: wo } : {}),
    };
  },
  zeiten: () => ({
    zug: [...zeiten],
    zerlegen: letzteZerlegung,
    bereich: letzterBereich,
    verdichtung: letzteVerdichtung,
    punkte: haut.n,
    stufen: zugStufen,
    endrunden: letzteEndrunden,
    /** der Löser eines laufenden Zugs rechnet noch (die Haut steht nicht); Runden seit der letzten Mausbewegung */
    offen: zug?.offen ?? false,
    nachRunden: zug?.nachRunden ?? 0,
    hintergrund: hintergrundStufen,
    /** Arbeit im Hauptthread (ms): je Bild im Zug, je Mausbewegung, je Auslösen und je Einwechseln beim Verfeinern */
    messung: { bild: [...messung.bild], maus: [...messung.maus], ausloesen: [...messung.ausloesen], einwechseln: [...messung.einwechseln], nachlauf: [...messung.nachlauf] },
    /** nach dem Loslassen: Der Nachlauf rechnet noch (Runden bisher, über alle Züge); der Auftrag im Hintergrund läuft; der letzte Auftrag */
    nachlauf: nachlauf !== null,
    nachlaufRunden,
    aufraeumen: aufraeumen !== null,
    auftrag: letzterAuftrag,
    hintergrundAus,
    loslassen: letztesLoslassen,
    /** was für den Stand offen ist; der letzte Zwischenstand; rechnet noch etwas oder steht etwas an (Zug, Nachlauf, Hintergrund, Uhr) */
    ruheOffen: ruheOffen ? (ruheOffen.setzen ? 'setzen' : 'aufraeumen') : null,
    auftragNr: aufraeumen ? aufraeumen.id : null,
    zwischen: letzterZwischenstand,
    beschaeftigt: zug !== null || nachlauf !== null || aufraeumen !== null || vorrechnenUhr !== null || gegriffen !== null,
    griffWartet: gegriffen !== null,
    ausloesung: letzteAusloesungMs,
    ausloesungTeile,
    /** der letzte Auftrag im Hintergrund (ms): verdichten, einbetten, Zeilen, zerlegen */
    hintergrundTeile,
    /** das letzte Einwechseln (ms): Auspacken; festlegen, Punkte auf die Haut von jetzt, Netz übernehmen, Löser anlegen, zeigen */
    auspacken: letztesAuspacken,
    einwechslungTeile,
    einwechslung: letzteEinwechslungMs,
    hintergrundMs: letzteHintergrundMs,
    stufeMs: letzteStufeMs,
    neuRechnen: letztesNeuRechnen,
    vorrechnen: letztesVorrechnen,
    nachLoesen: letztesNachLoesen,
  }),
  lagen: () => Array.from(haut.pos),
  /** die Felder der Haut selbst, ohne Kopie (nur für Proben, die im Fenster mitlesen) */
  roh: () => ({ pos: haut.pos, tri: haut.tri }),
  /** Lagen der Grundform (in der Pose die gemerkte) */
  grundLagen: () => Array.from((grund ? grund.haut : haut).pos),
  /** Stand der Pose: an, Knochen, größte Verschiebung des Blendshapes */
  pose: () => {
    let max = 0;
    const d = pose.delta;
    if (d) for (let i = 0; i < d.length; i += 3) max = Math.max(max, Math.hypot(d[i]!, d[i + 1]!, d[i + 2]!));
    return { an: grund !== null, kiefer: pose.kiefer, schaedel: pose.schaedel, blendshape: max, punkte: haut.n };
  },
  dreiecke: () => Array.from(haut.tri),
  meldung: () => meldung,
  bild: (a: Ansicht, p: V3): { x: number; y: number } => {
    const r = felder[a].getBoundingClientRect();
    const s = skala(a);
    const [x, y] = imBlatt(a, p);
    return { x: r.left + r.width / 2 + (x - ausschnitt[a].cx) * s, y: r.top + r.height / 2 + (y - ausschnitt[a].cy) * s };
  },
  /** Ausschnitt eines Blatts setzen bzw. lesen (Mitte in Blattkoordinaten, Zoom) */
  ausschnitt: (a: Ansicht, v?: { cx: number; cy: number; zoom: number }) => {
    if (v) {
      Object.assign(ausschnitt[a], v);
      ausschnittGeaendert(a);
    }
    return { ...ausschnitt[a] };
  },
  felder: () =>
    Object.fromEntries(
      Object.entries(felder).map(([k, f]) => {
        const r = f.getBoundingClientRect();
        return [k, { x: r.left, y: r.top, w: r.width, h: r.height }];
      }),
    ),
  setzeRadius: (r: number) => {
    radius = r;
    allesZeigen();
  },
  symmetrie: (): number => {
    let m = 0;
    const P = haut.pos;
    for (let v = 0; v < haut.n; v++) {
      const w = haut.spiegel[v]!;
      if (w >= 0) m = Math.max(m, Math.hypot(P[3 * v]! - P[3 * w]!, P[3 * v + 1]! - P[3 * w + 1]!, P[3 * v + 2]! + P[3 * w + 2]!));
    }
    return m;
  },
  masse: (): number[] => {
    const m = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (let v = 0; v < haut.n; v++) {
      for (let c = 0; c < 3; c++) {
        m[2 * c] = Math.min(m[2 * c]!, haut.pos[3 * v + c]!);
        m[2 * c + 1] = Math.max(m[2 * c + 1]!, haut.pos[3 * v + c]!);
      }
    }
    return m.map((x) => Math.round(x * 10) / 10);
  },
};
