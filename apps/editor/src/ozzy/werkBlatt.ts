/**
 * Ozzy, Phase 5.2 (16.11.2026): die Linien des Werks auf den Flächen des Raums (Wände, Felder, eingerastete Ansicht), bedient wie in
 * der Linien-Studie. Die Studie hängt ihre Bedienung über die Schnittstelle `Raum` an ein fremdes Modell (so lief ihre 3D-Probe); hier
 * ist das Modell das Werk. Jedes Bild legt `bauen` alle Linien des Werks auf alle Flächen (je Fläche das Blatt ihrer Achse: Seite,
 * Front, Top, wie die Blätter des Prüffensters, `werk.imBlatt`), als ein Netz in Bildschirmpunkten: Ein Punkt des Werks ist auf jeder
 * Fläche ein eigener Anker, an einer Kreuzung teilen sich die Linien den Anker, in Front und Top kommt das Spiegelbild dazu. Ziehen,
 * Drehen, Löschen und ⌘Z werden Handgriffe des Werks (`zugStarten`, `griffZugStarten`, `zugBewegen`, `zugEnde`, `eckeUmschalten`,
 * `loeschen`), mit den Blattkoordinaten der Fläche, auf der gegriffen wurde. Am Werk und am Kern ändert dieses Modul nichts.
 *
 * Gezeichnet wird die genaue Linie: Jedes Stück ist im Blatt ein Bézier-Stück (das Blatt bildet linear ab) und wird dort abgetastet,
 * dann auf die Fläche gebracht (an einer Wand perspektivisch). Die Griffe im Netz sind die abgebildeten Spitzen, sie dienen nur dem
 * Drehen der Richtungen.
 */
import { type Ansicht, type LoopPunkt, hatGriffe, istSichtbar, loopAusSchnitt } from '@ee/shape/dicht';
import * as werk from '../form/werk';
import { type Art, type Breiten, type Linie, type LinienProben, type Netz, type Punkt, type Stueck, armGriff } from '../linien/netz';
import { Feder1 } from '../linien/feder';
import { type DrehBild, Dreher2D, type RichtungZiel } from '../linien/richtung';
import type { EntwurfInfo, FadenEnde, FadenProben, StiftOrt, V2 } from '../linien/stift';
import type { Raum, Ziel } from '../linien/verhalten';
import type { Pfad } from '@ee/shape/zeichnen';

type V3 = { x: number; y: number; z: number };

/** Eine Fläche, auf der die Linien des Werks liegen: das Blatt ihrer Achse und wie es auf den Bildschirm kommt (CSS-Pixel) */
export interface Flaeche {
  a: Ansicht;
  /** Blatt (Einheiten des Werks, wie `werk.imBlatt`) → Bildschirm */
  hin(X: number, Y: number): [number, number];
  /** Bildschirm → Blatt; null, wo es die Fläche nicht trifft */
  her(x: number, y: number): [number, number] | null;
  /** 0 … 1: Linien werden mit ihr dünner; unter der Hälfte sind Punkte nicht zu sehen und nicht zu greifen */
  staerke: number;
  /** Breite der Linien mal diesem Maß (Wände) */
  breite: number;
  /** liegt der Bildschirmpunkt auf der Fläche (Wand: in ihrem Viereck; Feld: in seinem Rahmen; eingerastet: überall) */
  enthaelt(x: number, y: number): boolean;
  /** S7: welche Seite ihrer Achse zum Betrachter zeigt (+1 oder −1); was dahinter unter der Haut liegt, ist verdeckt (grün, fein) */
  vorn?: number;
  /** S17: Bereich der Anzeige (Feld der Vier Ansichten), an dessen Rand ihre Linien und Punkte abgeschnitten werden; fehlt: keiner */
  bereich?: number;
  /**
   * S20: Liegt in dieser Fläche der weiße Körper (wie in der Studie), die Tiefe eines Orts des Werks zum Betrachter, wie der Körper sie in
   * die Anzeige schreibt: Verdeckt ist dann, was je Bildpunkt hinter ihm liegt. Fehlt: verdeckt nach der Tiefenkarte (S7).
   */
  tiefe?: (p: { x: number; y: number; z: number }) => number;
}

/** S7: Tiefenkarte der Haut längs einer Achse: je Zelle die vorderste Tiefe (zum Betrachter hin), für verdeckte Linien */
type Karte = { a: number; u: number; v: number; vorn: number; u0: number; v0: number; zelle: number; n: number; d: Float32Array; toleranz: number; stand: string; zeit: number };
/** so weit (Tiefe) muss eine Probe hinter der Haut liegen, um als verdeckt zu gelten: Anteil der Ausdehnung; Raster der Karte */
const VERDECKT_TOLERANZ = 0.03;
const KARTE_N = 128;
/** verdeckt im Shader der Anzeige: weit hinter jeder Tiefe (ohne Körper ist sie 1e9, die Duldung 1e6) */
const HINTEN_Z = 4e9;

/**
 * Was mit P gerade gezeichnet wird (Etappe 5.3), auf einer Fläche, im Blatt ihrer Achse: eine Form (frei begonnen; fertig legt das Werk
 * sie auf die Haut, `stiftFertig`) oder eine Abzweigung (auf einem Punkt oder einer Linie begonnen; sie endet an einem Punkt oder einer
 * Linie, `abzweigungErstellen`). Anker im Blatt, Griffe gleich lang nach beiden Seiten (so nimmt das Werk sie).
 */
type Entwurf = { fl: number; a: Ansicht; anker: werk.StiftAnker[]; abzweig: boolean; nach: werk.AbzweigOrt | null };
/** S15: ein Lichtring (Lage im Werk, 3 je Probe; geschlossen; mit Spiegelbild zu zeigen) */
export type Lichtring = { pos: Float64Array; zu: boolean; spiegeln: boolean };

/** eine Linie, die (noch) kein Bézier-Pfad ist: nur zu sehen, als Streckenzug auf ihrer Fläche (Bildschirm) */
export interface RoheLinie {
  fl: number;
  x: number[];
  y: number[];
}

type WerkPunkt = { id: number; i: number };
/** je Anker: seine Fläche, Spiegelbild oder nicht, die Punkte des Werks dort (an einer Kreuzung mehrere), Florian sieht ihn */
type AnkerInfo = { fl: number; m: boolean; werk: WerkPunkt[]; zuSehen: boolean };
/** je Linie des Netzes: Fläche, Loop des Werks (Kennung), Spiegelbild; die Stelle k im Netz ist der Punkt k des Loops */
type LinienInfo = { fl: number; id: number; m: boolean };

/** Punkte so nah an der Mittelebene liegen auf ihr (dort teilt die Linie den Anker mit ihrem Spiegelbild) */
const MITTE = 1e-6;
/** so weit (Bildschirmpunkte) muss die Maus gehen, bis aus dem Drücken ein Zug wird (wie `KLICK_WEG` der Studie) */
const KLICK_WEG = 3;

const plus = (p: V3, v: V3): V3 => ({ x: p.x + v.x, y: p.y + v.y, z: p.z + v.z });
/** ⇧ beim Drehen einer Richtung (S6b): Der Griff kippt aus der Ebene der Fläche; seine Richtung in der Ebene und seine Länge bleiben */
type Kipp = { h0: V3; ebene: V3; n: V3; L: number; b0: number; w: [number, number]; sx: number; sy: number; k: number };
/** die Tiefe einer Fläche (gezeigte Lage): senkrecht zu ihrem Blatt */
const TIEFE: Record<Ansicht, V3> = { seite: { x: 0, y: 0, z: 1 }, front: { x: 1, y: 0, z: 0 }, top: { x: 0, y: 1, z: 0 } };
/**
 * S13 (liquid drop, Idee 6): ⌘Z fließt zurück. Das Werk springt in den Stand davor; die Anzeige gleitet in dieser Zeit (s) von ihrer Lage
 * vor ⌘Z in die neue: Punkte nach ihrem Schlüssel, Linien je Stück an derselben Stelle (so bleiben sie an ihren Punkten), Griffe mit.
 * `?fluss=0` schaltet es ab (für den Film vorher).
 */
const FLUSS_DAUER = new URLSearchParams(location.search).get('fluss') === '0' ? 0 : 0.22;
type FlussStueck = { t: number[]; x: number[]; y: number[] };
type FlussLinie = { stuecke: FlussStueck[]; g: number[] };
/** die Lage auf einem gemerkten Stück an der Stelle t (0 … 1) */
function flussBei(st: FlussStueck, t: number): [number, number] | null {
  const T = st.t;
  const n = T.length;
  if (!n) return null;
  if (t <= T[0]!) return [st.x[0]!, st.y[0]!];
  for (let i = 1; i < n; i++) {
    if (t <= T[i]!) {
      const a = (t - T[i - 1]!) / Math.max(1e-9, T[i]! - T[i - 1]!);
      return [st.x[i - 1]! + (st.x[i]! - st.x[i - 1]!) * a, st.y[i - 1]! + (st.y[i]! - st.y[i - 1]!) * a];
    }
  }
  return [st.x[n - 1]!, st.y[n - 1]!];
}

/**
 * S13 (liquid drop, Idee 5): Kante wie Tusche. K macht die Linie vom gewählten Punkt aus dicker, als liefe Tusche in sie hinein (so lange,
 * bis es an ihren Enden ist, s); „Kante aus“ zieht sie zum Punkt zurück. Nur die Breite der Anzeige; das Werk rechnet wie bisher.
 * `?fluss=0` schaltet es ab (wie das Gleiten nach ⌘Z).
 */
const TUSCHE_DAUER = new URLSearchParams(location.search).get('fluss') === '0' ? 0 : 0.45;
/** je Stück die Breiten vor K an ihren Stellen (t, halb im Wechsel); die Punkte, von denen die Tusche kommt (−1: alle) */
type TuscheLinie = { stuecke: number[][]; punkte: number[] };
/** die Breite auf einem gemerkten Stück an der Stelle t */
function tuscheBei(st: number[], t: number): number | null {
  const n = st.length >> 1;
  if (!n) return null;
  if (t <= st[0]!) return st[1]!;
  for (let i = 1; i < n; i++) {
    if (t <= st[2 * i]!) {
      const a = (t - st[2 * i - 2]!) / Math.max(1e-9, st[2 * i]! - st[2 * i - 2]!);
      return st[2 * i - 1]! + (st[2 * i + 1]! - st[2 * i - 1]!) * a;
    }
  }
  return st[2 * n - 1]!;
}

/** S13 (liquid drop, Idee 4): so lange (s) fließen die Tropfen zu einer neuen Kreuzung und verschmelzen; so weit her kommen sie (px) */
const VERSCHMELZEN_DAUER = new URLSearchParams(location.search).get('fluss') === '0' ? 0 : 0.5;
const VERSCHMELZEN_WEG = 24;

const glatt =(a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bez = (k: readonly number[], t: number): [number, number] => {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return [b0 * k[0]! + b1 * k[2]! + b2 * k[4]! + b3 * k[6]!, b0 * k[1]! + b1 * k[3]! + b2 * k[5]! + b3 * k[7]!];
};

export class WerkBlatt implements Raum {
  netz: Netz = { punkte: [], linien: [] };
  proben: LinienProben[] = [];
  roh: RoheLinie[] = [];
  /** S13 (6): die Anzeige vor ⌘Z und wann (Uhr der Anzeige); Schlüssel der Punkte und Linien des zuletzt gebauten Netzes */
  private fluss: { t0: number; punkte: Map<string, [number, number]>; linien: Map<string, FlussLinie> } | null = null;
  /** S13 (5): die Breiten vor K je Linie und wo die Tusche herkommt (Bogenlänge, CSS-Pixel), Anfang auf der Uhr der Anzeige */
  private tusche: { t0: number; linien: Map<string, TuscheLinie> } | null = null;
  /** S13 (4): Kreuzungen, die es schon gab (nur neue verschmelzen; null: noch keine Form gesehen), und die laufenden Verschmelzungen */
  private bekannteKreuzungen: Set<number> | null = null;
  private verschmelzen: { id: number; t0: number }[] = [];
  private uhr = 0;
  private punktSchl: string[] = [];
  private linienSchl: string[] = [];
  flaechen: Flaeche[] = [];
  anker: AnkerInfo[] = [];
  linien: LinienInfo[] = [];
  /** Kennzahl des Aufbaus (Flächen, Loops, Punkte): Ändert sie sich, gelten die Nummern im Netz nicht mehr */
  struktur = '';
  private dreher: Dreher2D;
  /** Zug an einem Punkt, einer Linie oder mehreren Punkten: Fläche, Spiegelbild, Stelle beim Drücken (Bildschirm), schon im Werk? */
  private zg: { fl: number; m: boolean; sx: number; sy: number; los: boolean } | null = null;
  /** Drehen einer Richtung: Linie und Stelle im Netz, Punkt und Seite im Werk, Spitze des Griffs im Blatt beim Drücken */
  private dz: { li: number; k: number; pi: number; seite: 'ein' | 'aus'; fl: number; m: boolean; id: number; i: number; X0: number; Y0: number; los: boolean; knick?: boolean; zurueck0?: number; gekippt?: boolean; kipp?: Kipp | null } | null = null;
  /** ein Klick ohne Zug: Die Studie ruft danach `rueckgaengig`, das hier nichts tun darf */
  private klickRueck = false;
  private gezeigteAuswahl = new Set<number>();
  private auswahlStruktur = '';
  private ent: Entwurf | null = null;
  /** Nummern des Entwurfs im zuletzt gebauten Netz: seine Linie (−1: noch keine Verbindung), erster und letzter Anker */
  private entNetz = { li: -1, erster: -1, letzter: -1 };

  constructor(
    private readonly breiten: () => Breiten,
    /** der Zeiger jetzt (CSS-Pixel) */
    private readonly zeiger: () => [number, number],
    /** ⌥ gehalten */
    private readonly alt: () => boolean,
    /** so viele Schritte für ⌘Z hat das Werk mindestens (davor geht ⌘Z nicht) */
    private readonly zurueckBis: () => number,
    /** nach jeder Änderung am Werk */
    private readonly geaendert: () => void,
  ) {
    this.dreher = new Dreher2D(
      () => this.netz,
      (n) => this.drehenSetzen(n),
    );
  }

  // ---------- Aufbau ----------

  /** Netz und Proben aller Linien des Werks auf diesen Flächen (Bildschirm, CSS-Pixel) */
  bauen(flaechen: Flaeche[], jetzt?: number): void {
    if (jetzt !== undefined) this.uhr = jetzt;
    const pSchl: string[] = [];
    const lSchl: string[] = [];
    const punkte: Punkt[] = [];
    const linien: Linie[] = [];
    const proben: LinienProben[] = [];
    const anker: AnkerInfo[] = [];
    const infos: LinienInfo[] = [];
    const roh: RoheLinie[] = [];
    const br = this.breiten();
    werk.alsAnzeige(() => {
      const L = werk.loops;
      const zug = werk.zug;
      const lagen = werk.aktuelleLagen();
      flaechen.forEach((F, fl) => {
        const a = F.a;
        const sichtbar = F.staerke >= 0.5;
        const schluessel = new Map<string, number>();
        const karte = F.vorn ? this.karteFuer(a, F.vorn) : null;
        L.forEach((l, li) => {
          const P = l.punkte;
          for (const m of a !== 'seite' && l.art !== 'mitte' ? [false, true] : [false]) {
            const blatt = (v: V3): [number, number] => werk.imBlatt(a, m ? werk.spiegeln(v) : v);
            // ohne Pfad (noch keine Griffe): nur zu sehen, durch die Proben
            if (!werk.exakt(l) || !hatGriffe(l) || P.length < 2 || !P.every((p) => p.ein && p.aus)) {
              const Lg = lagen[li];
              if (!Lg) continue;
              const xs: number[] = [];
              const ys: number[] = [];
              const n = Lg.length / 3;
              for (let j = 0; j <= (l.art === 'ring' ? n - 1 : n); j++) {
                const q = j % n;
                const [x, y] = F.hin(...blatt({ x: Lg[3 * q]!, y: Lg[3 * q + 1]!, z: Lg[3 * q + 2]! }));
                xs.push(x);
                ys.push(y);
              }
              roh.push({ fl, x: xs, y: ys });
              continue;
            }
            const neu = zug ? zug.griffeNeu[li] : null;
            const ort = (p: LoopPunkt): V3 => (zug && !zug.griff ? p.cur : p.ref);
            const idx: number[] = [];
            P.forEach((p, i) => {
              const q = ort(p);
              const sm = m && Math.abs(q.z) > MITTE;
              const k = `${p.kreuzung !== undefined ? `k${p.kreuzung}` : `${l.id}.${i}`}|${sm ? 1 : 0}`;
              let pi = schluessel.get(k);
              if (pi === undefined) {
                const [x, y] = F.hin(...blatt(q));
                pi = punkte.length;
                const q3 = m ? werk.spiegeln(q) : q;
                const hin = this.hinten(karte, q3);
                punkte.push({ x, y, sichtbar: sichtbar && istSichtbar(p), verdeckt: hin, z: F.tiefe ? F.tiefe(q3) : hin ? HINTEN_Z : 0 });
                pSchl.push(`${fl}|${k}`);
                anker.push({ fl, m: sm, werk: [], zuSehen: istSichtbar(p) });
                schluessel.set(k, pi);
              } else if (istSichtbar(p)) {
                anker[pi]!.zuSehen = true;
                if (sichtbar) punkte[pi]!.sichtbar = true;
              }
              anker[pi]!.werk.push({ id: l.id, i });
              idx.push(pi);
            });
            const zu = l.art !== 'ring';
            const n = P.length;
            const stuecke: Stueck[] = [];
            const kontroll: number[][] = [];
            const k3: V3[][] = [];
            const zeigen = (v: V3): V3 => (m ? werk.spiegeln(v) : v);
            const hart = (p: LoopPunkt): boolean => p.kante ?? l.kante ?? false;
            for (let i = 0; i < (zu ? n : n - 1); i++) {
              const j = (i + 1) % n;
              const A = ort(P[i]!);
              const E = ort(P[j]!);
              const b0 = blatt(A);
              const b1 = blatt(plus(A, neu?.[i]?.aus ?? P[i]!.aus!));
              const b2 = blatt(plus(E, neu?.[j]?.ein ?? P[j]!.ein!));
              const b3 = blatt(E);
              const s0 = F.hin(...b0);
              const s1 = F.hin(...b1);
              const s2 = F.hin(...b2);
              const s3 = F.hin(...b3);
              const art: Art = hart(P[i]!) || hart(P[j]!) ? 'kante' : l.art === 'mitte' && a === 'seite' ? 'umriss' : 'innen';
              stuecke.push({ g1x: s1[0] - s0[0], g1y: s1[1] - s0[1], g2x: s2[0] - s3[0], g2y: s2[1] - s3[1], art });
              kontroll.push([...b0, ...b1, ...b2, ...b3]);
              k3.push([zeigen(A), zeigen(plus(A, neu?.[i]?.aus ?? P[i]!.aus!)), zeigen(plus(E, neu?.[j]?.ein ?? P[j]!.ein!)), zeigen(E)]);
            }
            linien.push({ zu, punkte: idx, stuecke, knick: P.map((_, i) => werk.eckeGezeigt(li, i)) });
            lSchl.push(`${fl}|${l.id}|${m ? 1 : 0}`);
            infos.push({ fl, id: l.id, m });
            const PR = this.abtasten(F, kontroll, stuecke, br);
            this.verdeckteProben(PR, k3, stuecke, karte, br, F.tiefe);
            proben.push(PR);
          }
        });
      });
    });
    this.entNetz = { li: -1, erster: -1, letzter: -1 };
    const E = this.ent;
    const FE = E ? flaechen[E.fl] : undefined;
    if (E && FE) {
      // der Anfang einer Abzweigung ist ein Punkt des Werks (sein Anker auf dieser Fläche); dann die gesetzten Anker
      const idx: number[] = [];
      const kontroll: number[][] = [];
      const stuecke: Stueck[] = [];
      const start = E.abzweig ? werk.G.abzweig?.start : null;
      const blattAnker: werk.StiftAnker[] = [];
      if (start) {
        const li = werk.loopNr(start.id);
        const i = werk.loops[li]?.punkte.indexOf(start.p) ?? -1;
        const pi = anker.findIndex((A) => A.fl === E.fl && A.m === (start.m && Math.abs(start.p.ref.z) > MITTE) && A.werk.some((w) => w.id === start.id && w.i === i));
        if (pi >= 0) {
          idx.push(pi);
          const [X, Y] = werk.imBlatt(E.a, start.m ? werk.spiegeln(start.p.ref) : start.p.ref);
          blattAnker.push({ X, Y, aus: null });
        }
      }
      for (const k of E.anker) {
        const [x, y] = FE.hin(k.X, k.Y);
        idx.push(punkte.length);
        punkte.push({ x, y, sichtbar: true, verdeckt: false, z: 0 });
        pSchl.push('');
        anker.push({ fl: E.fl, m: false, werk: [], zuSehen: true });
        blattAnker.push(k);
      }
      if (idx.length) {
        this.entNetz.erster = idx[0]!;
        this.entNetz.letzter = idx[idx.length - 1]!;
      }
      if (idx.length >= 2) {
        for (let k = 0; k + 1 < blattAnker.length; k++) {
          const c = werk.stiftStueck(blattAnker[k]!, blattAnker[k + 1]!);
          const s0 = FE.hin(...c[0]!);
          const s1 = FE.hin(...c[1]!);
          const s2 = FE.hin(...c[2]!);
          const s3 = FE.hin(...c[3]!);
          stuecke.push({ g1x: s1[0] - s0[0], g1y: s1[1] - s0[1], g2x: s2[0] - s3[0], g2y: s2[1] - s3[1], art: 'innen' });
          kontroll.push(c.flat());
        }
        this.entNetz.li = linien.length;
        linien.push({ zu: false, punkte: idx, stuecke });
        lSchl.push('');
        infos.push({ fl: E.fl, id: -1, m: false });
        proben.push(this.abtasten(FE, kontroll, stuecke, br));
      }
    }
    this.fliessen(punkte, linien, proben, pSchl, lSchl);
    this.tuscheFliessen(proben, lSchl);
    this.kreuzungenNeu();
    this.punktSchl = pSchl;
    this.linienSchl = lSchl;
    this.netz = { punkte, linien };
    this.proben = proben;
    this.anker = anker;
    this.linien = infos;
    this.roh = roh;
    this.flaechen = flaechen;
    this.struktur = `${flaechen.map((f) => f.a).join(',')}|${werk.loops.map((l) => `${l.id}.${l.punkte.length}.${werk.exakt(l) && hatGriffe(l) ? 1 : 0}`).join(',')}`;
  }

  // ---------- S13 (6): ⌘Z fließt zurück ----------

  /** Merkt die Anzeige von jetzt (auch mitten in einem Gleiten); die nächsten Bilder gleiten von ihr in den neuen Stand */
  rueckfluss(): void {
    const N = this.netz;
    const punkte = new Map<string, [number, number]>();
    N.punkte.forEach((p, i) => {
      const k = this.punktSchl[i];
      if (k) punkte.set(k, [p.x, p.y]);
    });
    const linien = new Map<string, FlussLinie>();
    this.proben.forEach((PR, li) => {
      const k = this.linienSchl[li];
      const L = N.linien[li];
      if (!k || !L) return;
      const stuecke: FlussStueck[] = L.stuecke.map(() => ({ t: [], x: [], y: [] }));
      for (let j = 0; j < PR.n; j++) {
        const st = stuecke[PR.si[j]!];
        if (!st) continue;
        // ein Stück beginnt am Ende des vorigen (die Probe dort gehört zum vorigen)
        if (!st.t.length && j > 0) {
          st.t.push(0);
          st.x.push(PR.x[j - 1]!);
          st.y.push(PR.y[j - 1]!);
        }
        st.t.push(PR.t[j]!);
        st.x.push(PR.x[j]!);
        st.y.push(PR.y[j]!);
      }
      linien.set(k, { stuecke, g: L.stuecke.flatMap((g) => [g.g1x, g.g1y, g.g2x, g.g2y]) });
    });
    this.fluss = { t0: this.uhr, punkte, linien };
  }

  /** gleitet die Anzeige gerade, fließt Tusche oder verschmilzt eine Kreuzung (dann braucht sie Bilder) */
  get fliesst(): boolean {
    return this.fluss !== null || this.tusche !== null || this.verschmelzen.length > 0;
  }

  /** eine neue Form (geladen, aus der Silhouette, neu): Ihre Kreuzungen gelten als bekannt, keine verschmilzt */
  neueForm(): void {
    this.bekannteKreuzungen = null;
    this.verschmelzen = [];
  }

  /** S13 (4): Kreuzungen, die das Werk neu angelegt hat, beginnen zu verschmelzen (bei sehr vielen auf einmal nicht: dann ist es Laden) */
  private kreuzungenNeu(): void {
    const jetzt = new Set<number>();
    for (const l of werk.loops) for (const p of l.punkte) if (p.kreuzung !== undefined) jetzt.add(p.kreuzung);
    const B = this.bekannteKreuzungen;
    if (B) {
      const neu = [...jetzt].filter((k) => !B.has(k));
      if (neu.length <= 24) for (const id of neu) this.verschmelzen.push({ id, t0: this.uhr });
      for (const k of jetzt) B.add(k);
    } else this.bekannteKreuzungen = jetzt;
    this.verschmelzen = this.verschmelzen.filter((v) => this.uhr - v.t0 < VERSCHMELZEN_DAUER);
  }

  /**
   * S13 (4): die Tropfen dieses Bilds (CSS-Pixel, Halbmesser): Auf jeder Linie durch eine neue Kreuzung fließt einer zu ihr hin; kommen
   * sie an, quillt der Punkt kurz auf. Die flüssige Anzeige lässt sie ineinanderfließen.
   */
  verschmelzenTropfen(r0: number): { x: number; y: number; r: number }[] {
    const aus: { x: number; y: number; r: number }[] = [];
    for (const v of this.verschmelzen) {
      const u = Math.min(1, Math.max(0, (this.uhr - v.t0) / Math.max(1e-6, VERSCHMELZEN_DAUER)));
      const g = glatt(0, 1, Math.min(1, u / 0.8));
      const quell = Math.sin(Math.PI * glatt(0, 1, (u - 0.55) / 0.45));
      const marke = `|k${v.id}|`;
      this.punktSchl.forEach((k, pi) => {
        const P = this.netz.punkte[pi];
        if (!k.includes(marke) || !P?.sichtbar) return;
        this.netz.linien.forEach((L, li) => {
          const PR = this.proben[li];
          if (!L.punkte.includes(pi) || !PR || PR.n < 3) return;
          // die Probe am Punkt, dann auf der Linie so weit, wie der Tropfen noch weg ist
          let j0 = 0;
          let best = Infinity;
          for (let j = 0; j < PR.n; j++) {
            const d = (PR.x[j]! - P.x) ** 2 + (PR.y[j]! - P.y) ** 2;
            if (d < best) {
              best = d;
              j0 = j;
            }
          }
          const rund = L.zu;
          const richtung = !rund && j0 >= PR.n - 2 ? -1 : 1;
          let rest = VERSCHMELZEN_WEG * (1 - g);
          let j = j0;
          let x = PR.x[j0]!;
          let y = PR.y[j0]!;
          for (let schritt = 0; schritt < PR.n && rest > 0; schritt++) {
            let k2 = j + richtung;
            if (k2 < 0 || k2 >= PR.n) {
              if (!rund) break;
              k2 = (k2 + PR.n) % PR.n;
            }
            const dx = PR.x[k2]! - x;
            const dy = PR.y[k2]! - y;
            const d = Math.hypot(dx, dy);
            if (d >= rest) {
              x += (dx * rest) / Math.max(1e-9, d);
              y += (dy * rest) / Math.max(1e-9, d);
              rest = 0;
              break;
            }
            rest -= d;
            x = PR.x[k2]!;
            y = PR.y[k2]!;
            j = k2;
          }
          aus.push({ x, y, r: r0 * (1 - 0.35 * g) * (u < 0.98 ? 1 : 0) });
        });
        aus.push({ x: P.x, y: P.y, r: r0 * 0.9 * quell });
      });
    }
    return aus.filter((t) => t.r > 0.05);
  }

  /** S13 (5): vor K die Breiten aller Linien merken und, je gewählter Linie, die Stellen, von denen die Tusche fließt */
  tuscheMerken(auswahl: readonly werk.Wahl[]): void {
    const linien = new Map<string, TuscheLinie>();
    this.proben.forEach((PR, li) => {
      const k = this.linienSchl[li];
      const I = this.linien[li];
      if (!k || !I) return;
      const punkte = auswahl.filter((w) => w.l === I.id).map((w) => w.i);
      if (!punkte.length) return;
      // je Stück die Breiten an ihren Stellen (ein Stück beginnt am Ende des vorigen)
      const stuecke: number[][] = Array.from({ length: PR.stueckS.length - 1 }, () => []);
      for (let j = 0; j < PR.n; j++) {
        const st = stuecke[PR.si[j]!];
        if (!st) continue;
        if (!st.length && j > 0) st.push(0, PR.halb[j - 1]!);
        st.push(PR.t[j]!, PR.halb[j]!);
      }
      linien.set(k, { stuecke, punkte });
    });
    this.tusche = linien.size ? { t0: this.uhr, linien } : null;
  }

  /** die Breiten in diesem Bild: Dicker wird es von den Stellen der Tusche aus, dünner zieht es sich zu ihnen zurück */
  private tuscheFliessen(proben: LinienProben[], lSchl: string[]): void {
    const T = this.tusche;
    if (!T) return;
    const u = (this.uhr - T.t0) / TUSCHE_DAUER;
    if (!(u >= 0 && u < 1)) {
      this.tusche = null;
      return;
    }
    // wie Tusche: schnell los, dann langsamer
    const e = 1 - (1 - u) * (1 - u);
    proben.forEach((PR, li) => {
      const a = lSchl[li] ? T.linien.get(lSchl[li]!) : undefined;
      if (!a || a.stuecke.length !== PR.stueckS.length - 1) return;
      const L = PR.laenge;
      const zu = PR.stueckS.length > 1 && Math.hypot(PR.x[0]! - PR.x[PR.n - 1]!, PR.y[0]! - PR.y[PR.n - 1]!) < 1e-3;
      // die Stellen der Tusche: die gewählten Punkte, wo sie jetzt auf der Linie liegen
      const ursprung = a.punkte.includes(-1) ? Array.from(PR.stueckS) : a.punkte.map((i) => PR.stueckS[Math.min(i, PR.stueckS.length - 1)] ?? 0);
      const abstand = (s: number): number => {
        let d = Infinity;
        for (const o of ursprung) {
          const g = Math.abs(s - o);
          d = Math.min(d, zu ? Math.min(g, L - g) : g);
        }
        return d;
      };
      // nur, wo sich die Breite ändert: so weit läuft die Tusche (die Front ist ein Fünftel davon weich)
      const alte: (number | null)[] = [];
      const ab: number[] = [];
      let weit = 0;
      for (let j = 0; j < PR.n; j++) {
        const st = a.stuecke[PR.si[j]!];
        const alt = st ? tuscheBei(st, PR.t[j]!) : null;
        alte.push(alt);
        const d = abstand(PR.s[j]!);
        ab.push(d);
        if (alt !== null && Math.abs(PR.halb[j]! - alt) >= 1e-4) weit = Math.max(weit, d);
      }
      const weich = Math.max(2, 0.2 * weit);
      const vor = e * (weit + weich) - weich / 2;
      const rueck = (1 - e) * (weit + weich) - weich / 2;
      for (let j = 0; j < PR.n; j++) {
        const alt = alte[j];
        if (alt === null || alt === undefined) continue;
        const neu = PR.halb[j]!;
        if (Math.abs(neu - alt) < 1e-4) continue;
        const d = ab[j]!;
        const g = neu > alt ? glatt(0, 1, (vor - d) / weich + 0.5) : 1 - glatt(0, 1, (rueck - d) / weich + 0.5);
        PR.halb[j] = alt + (neu - alt) * g;
      }
    });
  }

  /** das Gleiten in diesem Bild: von der gemerkten Lage in die neue, gleich los und sanft am Ziel */
  private fliessen(punkte: Punkt[], linien: Linie[], proben: LinienProben[], pSchl: string[], lSchl: string[]): void {
    const f = this.fluss;
    if (!f) return;
    const u = (this.uhr - f.t0) / FLUSS_DAUER;
    if (!(u >= 0 && u < 1)) {
      this.fluss = null;
      return;
    }
    const e = 1 - Math.pow(1 - u, 3);
    const w = 1 - e;
    punkte.forEach((p, i) => {
      const a = pSchl[i] ? f.punkte.get(pSchl[i]!) : undefined;
      if (!a) return;
      p.x = a[0] * w + p.x * e;
      p.y = a[1] * w + p.y * e;
    });
    proben.forEach((PR, li) => {
      const a = lSchl[li] ? f.linien.get(lSchl[li]!) : undefined;
      const L = linien[li];
      if (!a || !L || a.stuecke.length !== L.stuecke.length) return;
      for (let j = 0; j < PR.n; j++) {
        const st = a.stuecke[PR.si[j]!];
        const q = st ? flussBei(st, PR.t[j]!) : null;
        if (!q) continue;
        PR.x[j] = q[0] * w + PR.x[j]! * e;
        PR.y[j] = q[1] * w + PR.y[j]! * e;
      }
      L.stuecke.forEach((g, si) => {
        g.g1x = a.g[4 * si]! * w + g.g1x * e;
        g.g1y = a.g[4 * si + 1]! * w + g.g1y * e;
        g.g2x = a.g[4 * si + 2]! * w + g.g2x * e;
        g.g2y = a.g[4 * si + 3]! * w + g.g2y * e;
      });
    });
  }

  // ---------- S7: Verdecktes grün ----------

  private karten = new Map<string, Karte>();

  /**
   * Tiefenkarte der gezeigten Haut längs der Achse einer Fläche (je Zelle die vorderste Tiefe zum Betrachter hin). Neu, wenn sich die
   * Haut ändert; im Zug höchstens alle 150 ms. Die Haut des Werks ist ganz (beide Hälften), die Linien liegen auf ihr.
   */
  private karteFuer(a: Ansicht, vorn: number): Karte | null {
    const achse = a === 'seite' ? 2 : a === 'front' ? 0 : 1;
    const schl = `${achse}|${vorn}`;
    const alt = this.karten.get(schl);
    const jetzt = performance.now();
    const stand = werk.standZahl();
    if (alt && (alt.stand === stand || (werk.zug && jetzt - alt.zeit < 150))) return alt;
    const P = werk.haut.pos;
    const T = werk.haut.tri;
    if (!P?.length || !T?.length) return null;
    const u = (achse + 1) % 3;
    const v = (achse + 2) % 3;
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
      u0 = Math.min(u0, P[i + u]!);
      u1 = Math.max(u1, P[i + u]!);
      v0 = Math.min(v0, P[i + v]!);
      v1 = Math.max(v1, P[i + v]!);
    }
    const span = Math.max(u1 - u0, v1 - v0, 1e-6);
    const n = KARTE_N;
    const rand = span * 0.02;
    const zelle = (span + 2 * rand) / n;
    u0 -= rand;
    v0 -= rand;
    const d = new Float32Array(n * n).fill(-Infinity);
    for (let t = 0; t + 2 < T.length; t += 3) {
      const i0 = 3 * T[t]!;
      const i1 = 3 * T[t + 1]!;
      const i2 = 3 * T[t + 2]!;
      const ax = (P[i0 + u]! - u0) / zelle;
      const ay = (P[i0 + v]! - v0) / zelle;
      const bx = (P[i1 + u]! - u0) / zelle;
      const by = (P[i1 + v]! - v0) / zelle;
      const cx = (P[i2 + u]! - u0) / zelle;
      const cy = (P[i2 + v]! - v0) / zelle;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-12) continue;
      const az = vorn * P[i0 + achse]!;
      const bz = vorn * P[i1 + achse]!;
      const cz = vorn * P[i2 + achse]!;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
      const x1 = Math.min(n - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
      const y1 = Math.min(n - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den;
          const w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
          const z = w0 * az + w1 * bz + w2 * cz;
          const k = y * n + x;
          if (z > d[k]!) d[k] = z;
        }
      }
    }
    const K: Karte = { a: achse, u, v, vorn, u0, v0, zelle, n, d, toleranz: VERDECKT_TOLERANZ * span, stand, zeit: jetzt };
    this.karten.set(schl, K);
    return K;
  }

  /** S15, Lichtring: gemerkt je Entwurf, Zeiger und Stand des Werks */
  private lichtSpeicher: { schl: string; ring: Lichtring | null } | null = null;

  /**
   * S15, Lichtring: der Loop rundum, den ↩ aus der Geraden mit P anlegen würde (im Leeren begonnen, der Zeiger oder der zweite Punkt im
   * Leeren): seine Lage (Werk, 3 je Probe), ob er geschlossen ist und ob er gespiegelt zu zeigen ist. Gerechnet mit derselben Rechnung wie
   * ↩ (`loopAusSchnitt`, nur gelesen). null: keiner (kein solcher Entwurf, gebogen, in der Pose, die Gerade trifft die Form nicht).
   */
  lichtring(): Lichtring | null {
    const E = this.ent;
    if (!E || E.abzweig || werk.grund || E.anker.length < 1 || E.anker.length > 2) return null;
    const A = E.anker[0]!;
    if (E.anker.some((k) => k.aus && Math.hypot(k.aus[0], k.aus[1]) > 1e-9)) return null;
    let B: { X: number; Y: number };
    if (E.anker.length === 2) B = E.anker[1]!;
    else {
      const F = this.flaechen[E.fl];
      if (!F) return null;
      const [zx, zy] = this.zeiger();
      const XY = F.her(zx, zy);
      if (!XY) return null;
      B = { X: XY[0], Y: XY[1] };
    }
    if (Math.hypot(B.X - A.X, B.Y - A.Y) * werk.anzeige.skala(E.a) < 12) return null;
    if (!this.aussen(E.a, A.X, A.Y) || !this.aussen(E.a, B.X, B.Y)) return null;
    const schl = `${E.a}|${A.X.toFixed(1)},${A.Y.toFixed(1)}|${B.X.toFixed(1)},${B.Y.toFixed(1)}|${werk.standZahl()}`;
    if (this.lichtSpeicher?.schl === schl) return this.lichtSpeicher.ring;
    const l = loopAusSchnitt(werk.haut, E.a, werk.uvAus(E.a, A.X, A.Y), werk.uvAus(E.a, B.X, B.Y), -1, 10 / werk.anzeige.skala(E.a));
    const ring = l && l.ruhe.length >= 6 ? { pos: Float64Array.from(l.ruhe), zu: l.art !== 'ring', spiegeln: l.art !== 'mitte' } : null;
    this.lichtSpeicher = { schl, ring };
    return ring;
  }

  /** S8: liegt eine Stelle im Blatt außerhalb der Form (dort zeigt die Tiefenkarte keine Haut) */
  private aussen(a: Ansicht, X: number, Y: number): boolean {
    const K = werk.alsAnzeige(() => this.karteFuer(a, 1));
    if (!K) return false;
    const w = werk.inWelt(a, X, Y);
    const c = [w.x, w.y, w.z];
    const iu = Math.floor((c[K.u]! - K.u0) / K.zelle);
    const iv = Math.floor((c[K.v]! - K.v0) / K.zelle);
    if (iu < 0 || iv < 0 || iu >= K.n || iv >= K.n) return true;
    return !Number.isFinite(K.d[iv * K.n + iu]!);
  }

  /** liegt ein Punkt (gezeigte Lage, Werk) hinter der Haut, von der Seite der Fläche aus gesehen */
  private hinten(K: Karte | null, p: V3): boolean {
    if (!K) return false;
    const c = [p.x, p.y, p.z];
    const iu = Math.floor((c[K.u]! - K.u0) / K.zelle);
    const iv = Math.floor((c[K.v]! - K.v0) / K.zelle);
    if (iu < 0 || iv < 0 || iu >= K.n || iv >= K.n) return false;
    const D = K.d[iv * K.n + iu]!;
    return Number.isFinite(D) && K.vorn * c[K.a]! < D - K.toleranz;
  }

  /** Proben hinter der Haut: grün und fein (Schicht 1, im Shader hinter jeder Tiefe); der Umriss bleibt immer vorn */
  /** S14, Röntgen (0 … 1, weich): Verdecktes ist greifbar (ab der Hälfte) und bekommt seine volle Breite zurück */
  roentgenWert = 0;
  roentgen(): boolean {
    return this.roentgenWert > 0.5;
  }

  /** S17: der Bereich der Anzeige je Linie oder Punkt des Netzes: der ihrer Fläche (Feld der Vier Ansichten), sonst keiner */
  bereich(art: 'linie' | 'punkt', i: number): number {
    const fl = art === 'linie' ? this.linien[i]?.fl : this.anker[i]?.fl;
    return fl === undefined ? 0 : (this.flaechen[fl]?.bereich ?? 0);
  }

  private verdeckteProben(P: LinienProben, k3: V3[][], stuecke: Stueck[], K: Karte | null, br: Breiten, tiefe?: (p: V3) => number): void {
    if (!K) return;
    const z = P.z ?? new Float32Array(P.n);
    for (let k = 0; k < P.n; k++) {
      const si = P.si[k]!;
      const C = k3[si];
      const st = stuecke[si];
      let hin = false;
      let ort: V3 | null = null;
      if (C && st && st.art !== 'umriss') {
        const t = P.t[k]!;
        const s = 1 - t;
        const b0 = s * s * s;
        const b1 = 3 * s * s * t;
        const b2 = 3 * s * t * t;
        const b3 = t * t * t;
        ort = {
          x: b0 * C[0]!.x + b1 * C[1]!.x + b2 * C[2]!.x + b3 * C[3]!.x,
          y: b0 * C[0]!.y + b1 * C[1]!.y + b2 * C[2]!.y + b3 * C[3]!.y,
          z: b0 * C[0]!.z + b1 * C[1]!.z + b2 * C[2]!.z + b3 * C[3]!.z,
        };
        hin = this.hinten(K, ort);
      }
      // S20: mit dem Körper entscheidet die Anzeige je Bildpunkt (die Tiefe des Orts); die Linie des Umrisses bleibt vorn
      z[k] = tiefe ? (ort ? tiefe(ort) : 0) : hin ? HINTEN_Z : 0;
      P.schicht[k] = hin ? 1 : 0;
      if (hin) {
        // fein wie Verdecktes; im Röntgen so breit wie vorn, mindestens knapp das Doppelte der feinen Linie
        const fein = Math.min(P.halb[k]!, br.innen / 2);
        const roent = Math.max(P.halb[k]!, br.innen * 0.9);
        P.halb[k] = fein + (roent - fein) * this.roentgenWert;
      }
    }
    P.z = z;
  }

  /** Proben einer Linie wie `linieAbtasten` der Studie, aber auf der Fläche: im Blatt abgetastet, dann abgebildet */
  private abtasten(F: Flaeche, kontroll: number[][], stuecke: Stueck[], br: Breiten): LinienProben {
    const m = stuecke.length;
    const xs: number[] = [];
    const ys: number[] = [];
    const ss: number[] = [];
    const sis: number[] = [];
    const ts: number[] = [];
    const stueckS = new Float32Array(m + 1);
    let s = 0;
    let px = 0;
    let py = 0;
    for (let si = 0; si < m; si++) {
      const k = kontroll[si]!;
      // Länge auf dem Bildschirm grob aus dem Kontrollpolygon: etwa alle 2,5 Bildschirmpunkte eine Probe
      let grob = 0;
      let [qx, qy] = F.hin(k[0]!, k[1]!);
      for (let c = 1; c < 4; c++) {
        const [rx, ry] = F.hin(k[2 * c]!, k[2 * c + 1]!);
        grob += Math.hypot(rx - qx, ry - qy);
        qx = rx;
        qy = ry;
      }
      const anzahl = Math.max(2, Math.min(160, Math.ceil(grob / 2.5)));
      for (let j = si === 0 ? 0 : 1; j <= anzahl; j++) {
        const t = j / anzahl;
        const [x, y] = F.hin(...bez(k, t));
        if (xs.length) s += Math.hypot(x - px, y - py);
        px = x;
        py = y;
        xs.push(x);
        ys.push(y);
        ss.push(s);
        sis.push(si);
        ts.push(t);
      }
      stueckS[si + 1] = s;
    }
    const laenge = s;
    const n = xs.length;
    const halb = new Float32Array(n);
    // Läufe von Kanten-Stücken: verjüngt zu ihren Enden hin (wie in der Studie)
    const lauf = new Float32Array(m * 2).fill(-1);
    for (let si = 0; si < m; si++) {
      if (stuecke[si]!.art !== 'kante' || lauf[si * 2]! >= 0) continue;
      let b = si;
      while (b + 1 < m && stuecke[b + 1]!.art === 'kante') b++;
      for (let q = si; q <= b; q++) {
        lauf[q * 2] = stueckS[si]!;
        lauf[q * 2 + 1] = stueckS[b + 1]!;
      }
    }
    const mass = F.breite * Math.min(1, F.staerke);
    for (let i = 0; i < n; i++) {
      const st = stuecke[sis[i]!]!;
      let h = br.innen / 2;
      if (st.art === 'umriss') h = br.umriss / 2;
      else if (st.art === 'kante') {
        const s0 = lauf[sis[i]! * 2]!;
        const s1 = lauf[sis[i]! * 2 + 1]!;
        const T = Math.min((s1 - s0) * 0.5, 48);
        const f = glatt(0, T, ss[i]! - s0) * glatt(0, T, s1 - ss[i]!);
        h = (br.kanteMin + (br.kanteMax - br.kanteMin) * f) / 2;
      }
      halb[i] = h * mass;
    }
    return {
      n,
      x: Float32Array.from(xs),
      y: Float32Array.from(ys),
      s: Float32Array.from(ss),
      si: Int32Array.from(sis),
      t: Float32Array.from(ts),
      halb,
      schicht: new Uint8Array(n),
      laenge,
      stueckS,
      z: new Float32Array(n),
    };
  }

  // ---------- Auswahl ----------

  /**
   * Auswahl abgleichen: Was die Studie an Ankern gewählt oder abgewählt hat, wird die Auswahl des Werks (je Punkt des Werks); zurück
   * kommen alle Anker dieser Punkte auf allen Flächen (ein gewählter Punkt ist überall gewählt).
   */
  auswahlAbgleichen(auswahl: ReadonlySet<number>): Set<number> {
    const schl = (w: WerkPunkt): string => `${w.id}.${w.i}`;
    const im = new Set(werk.G.auswahl.filter((w) => w.i >= 0).map((w) => `${w.l}.${w.i}`));
    if (this.auswahlStruktur === this.struktur) {
      const dazu = [...auswahl].filter((p) => !this.gezeigteAuswahl.has(p));
      const weg = [...this.gezeigteAuswahl].filter((p) => !auswahl.has(p));
      if (dazu.length || weg.length) {
        for (const p of weg) for (const w of this.anker[p]?.werk ?? []) im.delete(schl(w));
        for (const p of dazu) {
          const w = this.anker[p]?.werk[0];
          if (w) im.add(schl(w));
        }
        werk.G.auswahl = [...im].map((k) => {
          const [l, i] = k.split('.').map(Number);
          return { l: l!, i: i! };
        });
      }
    }
    const neu = new Set<number>();
    this.anker.forEach((A, pi) => {
      if (A.werk.some((w) => im.has(schl(w)))) neu.add(pi);
    });
    this.gezeigteAuswahl = neu;
    this.auswahlStruktur = this.struktur;
    return new Set(neu);
  }

  // ---------- Ziehen (Schnittstelle Raum) ----------

  /** Punkte des Werks zu Ankern, jeder einmal */
  private werkPunkte(pis: readonly number[]): werk.Wahl[] {
    const g = new Set<string>();
    const aus: werk.Wahl[] = [];
    for (const p of pis) {
      const w = this.anker[p]?.werk[0];
      if (!w || g.has(`${w.id}.${w.i}`)) continue;
      g.add(`${w.id}.${w.i}`);
      aus.push({ l: w.id, i: w.i });
    }
    return aus;
  }

  ziehenBeginnen(ziel: Ziel): void {
    this.klickRueck = false;
    this.zg = null;
    if (ziel.art === 'punkt') {
      const A = this.anker[ziel.pi];
      const p = this.netz.punkte[ziel.pi];
      if (!A || !p || !A.werk.length) return;
      werk.G.auswahl = this.werkPunkte([ziel.pi]);
      this.zg = { fl: A.fl, m: A.m, sx: p.x, sy: p.y, los: false };
    } else if (ziel.art === 'linie') {
      // eine Linie greifen: der ganze Loop geht mit (wie im Prüffenster)
      const I = this.linien[ziel.li];
      const st = this.stelle(ziel);
      if (!I || !st) return;
      werk.G.auswahl = [{ l: I.id, i: -1 }];
      this.zg = { fl: I.fl, m: I.m, sx: st[0], sy: st[1], los: false };
    }
    this.geaendert();
  }

  ziehen(dx: number, dy: number): void {
    const z = this.zg;
    if (!z) return;
    if (!z.los && Math.hypot(dx, dy) < KLICK_WEG) return;
    const F = this.flaechen[z.fl];
    if (!F) return;
    const a = F.a;
    if (!z.los) {
      const XY0 = F.her(z.sx, z.sy);
      if (!XY0) return;
      z.los = true;
      werk.G.maus = { a, X: XY0[0], Y: XY0[1] };
      if (werk.griffWartet()) werk.G.gegriffen = { a, X: XY0[0], Y: XY0[1], m: z.m, griff: null, seit: performance.now() };
      else werk.zugStarten(null, a, XY0[0], XY0[1], z.m);
    }
    const XY = F.her(z.sx + dx, z.sy + dy);
    if (!XY) return;
    werk.G.maus = { a, X: XY[0], Y: XY[1] };
    if (werk.zug && !werk.zug.modal && werk.zug.ansicht === a) werk.zugBewegen(XY[0], XY[1]);
    this.geaendert();
  }

  ziehenEnden(): void {
    const z = this.zg;
    this.zg = null;
    if (!z) return;
    if (!z.los) {
      this.klickRueck = true;
      return;
    }
    if (werk.G.gegriffen) werk.G.gegriffen = null;
    else if (werk.zug && !werk.zug.modal) werk.zugEnde(true);
    this.geaendert();
  }

  stelle(ziel: Ziel): [number, number] | null {
    if (ziel.art === 'punkt' || ziel.art === 'richtung') {
      const p = this.netz.punkte[ziel.pi];
      return p ? [p.x, p.y] : null;
    }
    const P = this.proben[ziel.li];
    if (!P || P.n === 0) return null;
    // die Probe am Stück si beim Parameter t (die Proben eines Stücks liegen hintereinander)
    let vor = -1;
    for (let j = 0; j < P.n; j++) {
      if (P.si[j] !== ziel.si) continue;
      if (P.t[j]! <= ziel.t) vor = j;
      else {
        if (vor < 0) return [P.x[j]!, P.y[j]!];
        const f = (ziel.t - P.t[vor]!) / Math.max(1e-9, P.t[j]! - P.t[vor]!);
        return [P.x[vor]! + (P.x[j]! - P.x[vor]!) * f, P.y[vor]! + (P.y[j]! - P.y[vor]!) * f];
      }
    }
    return vor >= 0 ? [P.x[vor]!, P.y[vor]!] : null;
  }

  punkteZiehenBeginnen(pis: number[]): void {
    this.klickRueck = false;
    this.zg = null;
    // gezogen wird auf der Fläche des Ankers unter dem Zeiger (die Auswahl hat auf jeder Fläche einen)
    const [x, y] = this.zeiger();
    let best = -1;
    let bd = Infinity;
    for (const p of pis) {
      const q = this.netz.punkte[p];
      if (!q) continue;
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    const A = this.anker[best];
    const q = this.netz.punkte[best];
    if (!A || !q) return;
    werk.G.auswahl = this.werkPunkte(pis);
    this.zg = { fl: A.fl, m: A.m, sx: q.x, sy: q.y, los: false };
    this.geaendert();
  }

  punkteZiehen(dx: number, dy: number): void {
    this.ziehen(dx, dy);
  }

  punkteZiehenEnden(): void {
    this.ziehenEnden();
  }

  punkteLoeschen(pis: number[]): boolean {
    const w = this.werkPunkte(pis);
    if (!w.length || werk.zug) return false;
    werk.G.auswahl = w;
    werk.loeschen();
    this.geaendert();
    return true;
  }

  ankerZuSehen(): boolean {
    return true;
  }

  /** alle Punkte im Netz, die denselben Punkt des Werks zeigen (auf allen Flächen); je Aufbau einmal gerechnet */
  gleiche(pi: number): number[] {
    if (this.gleicheStruktur !== this.struktur) {
      this.gleicheStruktur = this.struktur;
      const nach = new Map<string, number[]>();
      this.anker.forEach((A, k) => {
        for (const w of A.werk) {
          const key = `${w.id}.${w.i}`;
          const l = nach.get(key);
          if (l) l.push(k);
          else nach.set(key, [k]);
        }
      });
      this.gleicheListe = this.anker.map((A, k) => {
        const s = new Set<number>([k]);
        for (const w of A.werk) for (const q of nach.get(`${w.id}.${w.i}`) ?? []) s.add(q);
        return [...s];
      });
    }
    return this.gleicheListe[pi] ?? [pi];
  }
  private gleicheStruktur = '';
  private gleicheListe: number[][] = [];

  bias(): number {
    return 1e6;
  }

  rueckgaengig(): boolean {
    if (this.klickRueck) {
      this.klickRueck = false;
      return true;
    }
    if (werk.zug || werk.zurueck.length <= this.zurueckBis()) return false;
    const s = werk.zurueck.pop();
    if (!s) return false;
    this.rueckfluss();
    werk.wiederherstellen(s);
    werk.anzeige.allesZeigen();
    this.geaendert();
    return true;
  }

  /** Werkzeug P auf einer Linie: ein Punkt an der Stelle (im Werk `punktAufLinie`); zurück seine Nummer im neuen Netz */
  punktEinsetzen(li: number, si: number, t: number): number | null {
    const I = this.linien[li];
    const F = I ? this.flaechen[I.fl] : undefined;
    const st = this.stelle({ art: 'linie', li, si, t, s: 0 });
    if (!I || !F || !st) return null;
    const XY = F.her(st[0], st[1]);
    const l = werk.loops[werk.loopNr(I.id)];
    if (!XY || !l) return null;
    const r = werk.punktAufLinie(F.a, l, XY[0], XY[1], I.m);
    werk.anzeige.allesZeigen();
    this.geaendert();
    const i = l.punkte.indexOf(r.p);
    this.bauen(this.flaechen);
    const pi = this.anker.findIndex((A) => A.fl === I.fl && A.werk.some((w) => w.id === I.id && w.i === i));
    return pi >= 0 ? pi : null;
  }

  // ---------- Richtungen (Schnittstelle Dreher) ----------

  drehenBeginnen(z: RichtungZiel, kippen: boolean, hebel: number): [number, number] | null {
    const I = this.linien[z.li];
    const F = I ? this.flaechen[I.fl] : undefined;
    const li = I ? werk.loopNr(I.id) : -1;
    const l = werk.loops[li];
    const p = l?.punkte[z.k];
    if (!I || !F || !l || !p) return null;
    const spitze = this.dreher.drehenBeginnen(z, kippen, hebel);
    if (!spitze) return null;
    // ⌥ beim Drücken: Knick (der Punkt wird eine Ecke, die Gegenseite bleibt stehen)
    if (this.alt() && !werk.eckeGezeigt(li, z.k)) werk.eckeUmschalten(I.id, z.k);
    const g = z.seite === 'ein' ? p.ein : p.aus;
    if (!g) return null;
    const [X0, Y0] = werk.alsAnzeige(() => {
      const q = werk.loops[li]!.punkte[z.k]!;
      const h = (z.seite === 'ein' ? q.ein : q.aus) ?? g;
      const tip = plus(q.ref, h);
      return werk.imBlatt(F.a, I.m ? werk.spiegeln(tip) : tip);
    });
    werk.G.auswahl = [{ l: I.id, i: z.k }];
    this.dz = { li: z.li, k: z.k, pi: z.pi, seite: z.seite, fl: I.fl, m: I.m, id: I.id, i: z.k, X0, Y0, los: false, zurueck0: werk.zurueck.length };
    this.geaendert();
    return spitze;
  }

  drehenZiehen(cx: number, cy: number, alt: boolean, dt: number, kippen?: boolean): void {
    const d = this.dz;
    // ⇧ (S6b, wie im Raum der Studie, auch erst während des Drehens): Der Griff kippt aus der Ebene; ⇧ los: weiter in der Ebene drehen
    if (d && kippen && !d.kipp) this.kippenBeginnen(d, cx, cy);
    if (d && !kippen && d.kipp) this.kippenEnden(d);
    this.schwenkSchritt(dt, !!d?.kipp);
    if (d?.kipp) {
      this.kippenZiehen(d, d.kipp, cx, cy, alt, dt);
      return;
    }
    // ⌥ während des Drehens (S6, wie in der Studie): Der Punkt wird eine Ecke, wie mit ⌥ beim Drücken. Der laufende Zug am Griff
    // endet, die Ecke wird gesetzt, und es geht als neuer Zug am Griff weiter, von der Stelle, an der die Spitze jetzt ist (nur
    // Handgriffe des Werks; zwei Schritte für ⌘Z)
    if (d && alt && !d.knick) {
      const li = werk.loopNr(d.id);
      if (werk.eckeGezeigt(li, d.i)) d.knick = true;
      else {
        // ein laufender Zug endet und setzt danach neu an; ein wartender Griff (das Werk rechnet noch) bleibt und holt nach
        if (d.los && werk.zug && !werk.zug.modal) {
          werk.zugEnde(true);
          d.los = false;
        }
        if (!werk.zug) {
          werk.eckeUmschalten(d.id, d.i);
          if (!d.los) {
            const sp = this.griffSpitze(d);
            if (sp) [d.X0, d.Y0] = sp;
          }
          d.knick = true;
          this.geaendert();
        }
      }
    }
    this.dreher.drehenZiehen(cx, cy, alt, dt);
  }

  /** Kippen beginnen: ein laufender Zug am Griff endet, ein neuer beginnt an der Spitze von jetzt (dort wird im Raum gezogen) */
  private kippenBeginnen(d: NonNullable<WerkBlatt['dz']>, cx: number, cy: number): void {
    const F = this.flaechen[d.fl];
    const li = werk.loopNr(d.id);
    if (!F || werk.G.gegriffen || werk.griffWartet()) return;
    if (d.los && werk.zug && !werk.zug.modal) werk.zugEnde(true);
    if (werk.zug) return;
    const sp = this.griffSpitze(d);
    // der Griff und sein Punkt, wie gezeigt (am Spiegelbild gespiegelt)
    const h = werk.alsAnzeige(() => {
      const q = werk.loops[li]?.punkte[d.i];
      const g = q ? (d.seite === 'ein' ? q.ein : q.aus) : null;
      return g ? { x: g.x, y: g.y, z: d.m ? -g.z : g.z } : null;
    });
    const ort = werk.alsAnzeige(() => {
      const q = werk.loops[li]?.punkte[d.i];
      return q ? werk.imBlatt(F.a, d.m ? werk.spiegeln(q.ref) : q.ref) : null;
    });
    if (!sp || !h || !ort) return;
    if (!werk.griffZugStarten(F.a, sp[0], sp[1], d.m, li, d.i, d.seite)) return;
    const n = TIEFE[F.a];
    const L = Math.hypot(h.x, h.y, h.z);
    const hn = h.x * n.x + h.y * n.y + h.z * n.z;
    let e: V3 = { x: h.x - n.x * hn, y: h.y - n.y * hn, z: h.z - n.z * hn };
    const le = Math.hypot(e.x, e.y, e.z);
    e = le < 1e-9 * Math.max(1, L) ? (n.x ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }) : { x: e.x / le, y: e.y / le, z: e.z / le };
    // im Bild: vom Punkt zur Spitze; quer dazu kippt das Ziehen (ein Viertelkreis auf die Länge des Griffs, mindestens 40 Punkte)
    const P = F.hin(ort[0], ort[1]);
    const T = F.hin(sp[0], sp[1]);
    const ux = T[0] - P[0];
    const uy = T[1] - P[1];
    const lu = Math.max(1e-6, Math.hypot(ux, uy));
    const R = Math.max(40, lu);
    const b0 = Math.atan2(hn, Math.max(1e-9, le));
    d.kipp = { h0: h, ebene: e, n, L, b0, w: [-uy / lu, ux / lu], sx: cx, sy: cy, k: Math.PI / 2 / R };
    d.los = true;
    d.gekippt = true;
    // der Ring schwenkt um die Linie des Griffs (die Feder läuft weiter, wenn er gerade zurückschwenkt)
    this.schwenk = { p: [P[0], P[1]], u: [ux / lu, uy / lu], w: [-uy / lu, ux / lu], R: lu / Math.max(0.25, Math.cos(b0)), beta: b0, f: this.schwenk?.f ?? new Feder1(0) };
  }

  private kippenZiehen(d: NonNullable<WerkBlatt['dz']>, K: Kipp, cx: number, cy: number, alt: boolean, dt: number): void {
    const s = (cx - K.sx) * K.w[0] + (cy - K.sy) * K.w[1];
    const b = Math.max(-1.48, Math.min(1.48, K.b0 + s * K.k));
    if (this.schwenk) this.schwenk.beta = b;
    const c = Math.cos(b) * K.L;
    const t = Math.sin(b) * K.L;
    const h = { x: K.ebene.x * c + K.n.x * t, y: K.ebene.y * c + K.n.y * t, z: K.ebene.z * c + K.n.z * t };
    werk.zugGriffRaum({ x: h.x - K.h0.x, y: h.y - K.h0.y, z: h.z - K.h0.z });
    // die Anzeige der Studie zeigt die Spitze, wie der gekippte Griff im Bild liegt
    const F = this.flaechen[d.fl];
    const sp = this.griffSpitze(d);
    if (F && sp) {
      const T = F.hin(sp[0], sp[1]);
      this.dreher.drehenZiehen(T[0], T[1], alt, dt);
    }
    this.geaendert();
  }

  /** ⇧ los: Der Zug im Raum endet, weiter wird in der Ebene gedreht (ein neuer Zug am Griff von der Spitze von jetzt) */
  private kippenEnden(d: NonNullable<WerkBlatt['dz']>): void {
    d.kipp = null;
    if (werk.zug && !werk.zug.modal) werk.zugEnde(true);
    d.los = false;
    const sp = this.griffSpitze(d);
    if (sp) [d.X0, d.Y0] = sp;
  }

  /** die Spitze des gedrehten Griffs jetzt (Blatt der Fläche, wie gezeigt) */
  private griffSpitze(d: { fl: number; id: number; i: number; seite: 'ein' | 'aus'; m: boolean }): [number, number] | null {
    const F = this.flaechen[d.fl];
    const li = werk.loopNr(d.id);
    if (!F || !werk.loops[li]?.punkte[d.i]) return null;
    return werk.alsAnzeige(() => {
      const q = werk.loops[li]!.punkte[d.i]!;
      const h = d.seite === 'ein' ? q.ein : q.aus;
      if (!h) return null;
      const tip = plus(q.ref, h);
      return werk.imBlatt(F.a, d.m ? werk.spiegeln(tip) : tip);
    });
  }

  /** die Studie hat die Richtung gedreht (im Netz): die Spitze des Griffs im Werk dorthin */
  private drehenSetzen(n: Netz): void {
    const d = this.dz;
    if (!d || d.kipp) return;
    const F = this.flaechen[d.fl];
    const l = n.linien[d.li];
    const P = n.punkte[d.pi];
    if (!F || !l || !P) return;
    const g = armGriff(l, d.k, d.seite);
    if (!g) return;
    const XY = F.her(P.x + g[0], P.y + g[1]);
    if (!XY) return;
    if (!d.los) {
      d.los = true;
      werk.G.maus = { a: F.a, X: d.X0, Y: d.Y0 };
      if (werk.griffWartet()) werk.G.gegriffen = { a: F.a, X: d.X0, Y: d.Y0, m: d.m, griff: { id: d.id, i: d.i, seite: d.seite }, seit: performance.now() };
      else werk.griffZugStarten(F.a, d.X0, d.Y0, d.m, werk.loopNr(d.id), d.i, d.seite);
    }
    werk.G.maus = { a: F.a, X: XY[0], Y: XY[1] };
    if (werk.zug && werk.zug.griff && werk.zug.ansicht === F.a) werk.zugBewegen(XY[0], XY[1]);
    this.geaendert();
  }

  drehenEnden(): void {
    const d = this.dz;
    this.dz = null;
    this.schwenk = null;
    this.dreher.drehenEnden();
    if (!d?.los) return;
    if (werk.G.gegriffen) werk.G.gegriffen = null;
    else if (werk.zug && !werk.zug.modal) werk.zugEnde(true);
    // ⌥ mitten im Drehen gab drei Schritte (Zug, Ecke, Zug): für ⌘Z einer, der Stand vor der Geste
    if ((d.knick || d.gekippt) && d.zurueck0 !== undefined && werk.zurueck.length > d.zurueck0 + 1) werk.zurueck.splice(d.zurueck0 + 1);
    this.geaendert();
  }

  drehBild(): DrehBild | null {
    const b = this.dreher.drehBild();
    const S = this.schwenk;
    if (!b || !S || S.f.x < 0.002) return b;
    // ⇧ (S6c, wie im Raum der Studie): Der Ring schwenkt um die Linie des Griffs aus der Ebene; eingerastet sieht man ihn dann fast von
    // der Kante (eine schmale Ellipse), die Spitze läuft auf ihm, wie weit der Griff gekippt ist
    const f = Math.min(1, Math.max(0, S.f.x));
    const sq = 1 - f * (1 - 0.14);
    const { p, u, w, R } = S;
    const ring: number[] = [];
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const a = (2 * Math.PI * i) / n;
      ring.push(p[0] + R * (Math.cos(a) * u[0] + Math.sin(a) * sq * w[0]), p[1] + R * (Math.cos(a) * u[1] + Math.sin(a) * sq * w[1]), 0);
    }
    const be = S.beta;
    const spitze: [number, number, number] = [p[0] + R * (Math.cos(be) * u[0] + Math.sin(be) * sq * w[0]), p[1] + R * (Math.cos(be) * u[1] + Math.sin(be) * sq * w[1]), 0];
    return { ...b, ring, nabe: [p[0], p[1], 0], spitze };
  }

  /** der Ring beim Kippen: Mitte, Richtung des Griffs und quer dazu (Bild), Halbmesser, Winkel des Griffs aus der Ebene, Feder des Schwenks */
  private schwenk: { p: [number, number]; u: [number, number]; w: [number, number]; R: number; beta: number; f: Feder1 } | null = null;

  /** der Schwenk folgt ⇧ (eine Feder wie in der Studie); nach dem Loslassen von ⇧ schwenkt er zurück */
  private schwenkSchritt(dt: number, an: boolean): void {
    const S = this.schwenk;
    if (!S) return;
    S.f.ziel = an ? 1 : 0;
    S.f.schritt(dt, 5, 0.9);
    if (!an && S.f.x < 0.002) this.schwenk = null;
  }

  /** Doppelklick auf eine Richtung: Knick ↔ rund (im Werk Ecke ↔ glatt); zurück: jetzt rund */
  knickUmschalten(z: RichtungZiel): boolean | null {
    const I = this.linien[z.li];
    const li = I ? werk.loopNr(I.id) : -1;
    if (!I || !werk.loops[li]?.punkte[z.k] || werk.zug) return null;
    const vorher = werk.eckeGezeigt(li, z.k);
    werk.eckeUmschalten(I.id, z.k);
    werk.anzeige.allesZeigen();
    this.geaendert();
    const jetzt = werk.eckeGezeigt(werk.loopNr(I.id), z.k);
    return jetzt === vorher ? null : !jetzt;
  }

  /** das Werk richtet beim Runden gleich aus */
  ausrichten(): void {}

  // ---------- Werkzeug P (Etappe 5.3, Schnittstelle StiftWerk) ----------

  /** Bildschirm → Blatt der Fläche des Entwurfs; ein Griff (Vektor im Bildschirm am Punkt) → Vektor im Blatt */
  private blattVon(fl: number, x: number, y: number): [number, number] | null {
    return this.flaechen[fl]?.her(x, y) ?? null;
  }
  private griffImBlatt(fl: number, k: werk.StiftAnker, g: V2): [number, number] | null {
    const F = this.flaechen[fl];
    if (!F) return null;
    const [px, py] = F.hin(k.X, k.Y);
    const q = F.her(px + g[0], py + g[1]);
    return q ? [q[0] - k.X, q[1] - k.Y] : null;
  }
  /** Griff eines Ankers im Bildschirm (vom Punkt aus) */
  private griffImBild(fl: number, k: werk.StiftAnker): V2 {
    const F = this.flaechen[fl];
    if (!F || !k.aus) return [0, 0];
    const [px, py] = F.hin(k.X, k.Y);
    const [qx, qy] = F.hin(k.X + k.aus[0], k.Y + k.aus[1]);
    return [qx - px, qy - py];
  }
  /** die Fläche unter dem Zeiger, auf der P ansetzen kann (die stärkste, die ihn enthält); −1: keine */
  flaecheUnter(x: number, y: number): number {
    let best = -1;
    this.flaechen.forEach((F, fl) => {
      if (F.staerke >= 0.5 && F.enthaelt(x, y) && (best < 0 || F.staerke > this.flaechen[best]!.staerke)) best = fl;
    });
    return best;
  }
  /** ein Ort des Netzes als Ort des Werks für die Abzweigung (Punkt: seine Nummer; Linie: −1 und die Stelle im Blatt) */
  private abzweigOrt(o: StiftOrt, fl: number): werk.AbzweigOrt | null {
    if (o.art === 'punkt') {
      const A = this.anker[o.pi];
      const p = this.netz.punkte[o.pi];
      const w = A?.werk[0];
      const XY = A && p ? this.blattVon(A.fl, p.x, p.y) : null;
      if (!A || !w || !XY || (fl >= 0 && A.fl !== fl)) return null;
      return { id: w.id, i: w.i, m: A.m, X: XY[0], Y: XY[1] };
    }
    if (o.art === 'linie') {
      const I = this.linien[o.li];
      const st = this.stelle({ art: 'linie', li: o.li, si: o.si, t: o.t, s: 0 });
      const XY = I && st ? this.blattVon(I.fl, st[0], st[1]) : null;
      if (!I || I.id < 0 || !XY || (fl >= 0 && I.fl !== fl)) return null;
      return { id: I.id, i: -1, m: I.m, X: XY[0], Y: XY[1] };
    }
    return null;
  }
  /** Anker eines Punkts des Werks auf einer Fläche im neu gebauten Netz */
  private ankerVon(fl: number, id: number, i: number, m: boolean): number | null {
    this.bauen(this.flaechen);
    const pi = this.anker.findIndex((A) => A.fl === fl && A.m === m && A.werk.some((w) => w.id === id && w.i === i));
    return pi >= 0 ? pi : null;
  }

  /**
   * Freihand und Formen im Raum (Etappe 5.3): ein geschlossener Pfad auf einer Fläche (Bildschirm) wird wie eine Form mit P auf die Haut
   * gelegt (`stiftFertig`). Das Werk kennt je Anker nur gleich lange Griffe nach beiden Seiten: genommen wird der Griff nach vorn.
   * Zurück: ob eine Linie dazukam.
   */
  pfadAufHaut(fl: number, pfad: Pfad): boolean {
    const F = this.flaechen[fl];
    if (!F || werk.zug || werk.G.abzweig || this.ent) return false;
    const anker: werk.StiftAnker[] = [];
    for (const k of pfad.anker) {
      const XY = F.her(k.x, k.y);
      if (!XY) return false;
      const g = k.aus && !k.ecke ? F.her(k.x + k.aus.x, k.y + k.aus.y) : null;
      anker.push({ X: XY[0], Y: XY[1], aus: g ? [g[0] - XY[0], g[1] - XY[1]] : null });
    }
    if (anker.length < 3) return false;
    const vorher = werk.loops.length;
    werk.G.stift = { a: F.a, anker, zieht: false };
    werk.stiftFertig();
    werk.anzeige.allesZeigen();
    this.bauen(this.flaechen);
    this.geaendert();
    return werk.loops.length > vorher;
  }

  entwurf(): EntwurfInfo | null {
    const E = this.ent;
    if (!E || this.entNetz.erster < 0) return null;
    const letzter = E.anker[E.anker.length - 1];
    const erster = E.anker[0];
    const aus = letzter ? this.griffImBild(E.fl, letzter) : ([0, 0] as V2);
    const g0 = erster && !E.abzweig ? this.griffImBild(E.fl, erster) : ([0, 0] as V2);
    return {
      li: this.entNetz.li,
      zwilling: -1,
      erster: this.entNetz.erster,
      letzter: this.entNetz.letzter,
      anzahl: E.anker.length,
      haengt: E.abzweig,
      aus,
      einErster: [-g0[0], -g0[1]],
    };
  }

  ortFrei(x: number, y: number): { x: number; y: number; mitte: boolean } | null {
    const fl = this.ent ? (this.flaechen[this.ent.fl]?.enthaelt(x, y) ? this.ent.fl : -1) : this.flaecheUnter(x, y);
    return fl >= 0 ? { x, y, mitte: false } : null;
  }

  mittePunkte(): number[] {
    return [];
  }

  beginnen(o: StiftOrt): number | null {
    if (werk.zug || werk.G.abzweig) return null;
    if (o.art === 'frei') {
      const fl = this.flaecheUnter(o.x, o.y);
      const F = this.flaechen[fl];
      const XY = F?.her(o.x, o.y);
      if (!F || !XY) return null;
      this.ent = { fl, a: F.a, anker: [{ X: XY[0], Y: XY[1], aus: null }], abzweig: false, nach: null };
      this.bauen(this.flaechen);
      this.geaendert();
      return this.entNetz.erster;
    }
    // auf einem Punkt oder einer Linie: eine Abzweigung (im Werk beginnt sie dort; auf einer Linie entsteht der Punkt sofort)
    const fl = o.art === 'punkt' ? (this.anker[o.pi]?.fl ?? -1) : (this.linien[o.li]?.fl ?? -1);
    const F = this.flaechen[fl];
    const von = this.abzweigOrt(o, fl);
    if (!F || !von) return null;
    werk.G.abzweig = { a: F.a, von, zieht: false, start: null, vorher: null, anker: [], ankerZieht: false };
    werk.abzweigBeginnen();
    const st = werk.G.abzweig?.start;
    if (!st) {
      werk.G.abzweig = null;
      return null;
    }
    this.ent = { fl, a: F.a, anker: [], abzweig: true, nach: null };
    werk.anzeige.allesZeigen();
    this.bauen(this.flaechen);
    this.geaendert();
    return this.entNetz.erster >= 0 ? this.entNetz.erster : null;
  }

  weiter(o: StiftOrt): number | null {
    const E = this.ent;
    if (!E) return null;
    const F = this.flaechen[E.fl];
    if (!F) return null;
    // eine Abzweigung endet an einem Punkt oder einer Linie derselben Fläche
    if (E.abzweig && o.art !== 'frei') {
      const nach = this.abzweigOrt(o, E.fl);
      if (!nach) return null;
      if (nach.i < 0) {
        // auf der Linie: der Punkt entsteht jetzt (so zeigt die Studie ihn gleich); fertig verbindet dorthin
        const l = werk.loops[werk.loopNr(nach.id)];
        if (!l) return null;
        const r = werk.punktAufLinie(F.a, l, nach.X, nach.Y, nach.m);
        nach.i = l.punkte.indexOf(r.p);
      }
      E.nach = nach;
      return this.ankerVon(E.fl, nach.id, nach.i, nach.m && Math.abs(werk.loops[werk.loopNr(nach.id)]?.punkte[nach.i]?.ref.z ?? 0) > MITTE);
    }
    // sonst ein neuer Punkt. Hat P dabei Vorhandenes gefangen (die Studie fängt Linien im Umkreis), zählt in einer Form der Ort der
    // Maus: Die Kreuzung mit der Linie legt das Werk selbst an; ein Punkt genau auf der Linie läge sonst gleich neben ihr
    const xy = o.art === 'frei' ? ([o.x, o.y] as const) : this.zeiger();
    const XY = F.her(xy[0], xy[1]);
    if (!XY || !Number.isFinite(XY[0])) return null;
    E.anker.push({ X: XY[0], Y: XY[1], aus: null });
    this.bauen(this.flaechen);
    this.geaendert();
    return this.entNetz.letzter;
  }

  griffeLetzter(aus: V2 | null): void {
    const E = this.ent;
    const k = E?.anker[E.anker.length - 1];
    if (!E || !k || !aus) return;
    k.aus = Math.hypot(aus[0], aus[1]) < 1e-6 ? null : this.griffImBlatt(E.fl, k, aus);
    this.geaendert();
  }

  griffeErster(aus: V2 | null): void {
    const E = this.ent;
    const k = E && !E.abzweig ? E.anker[0] : undefined;
    if (!E || !k || !aus) return;
    k.aus = Math.hypot(aus[0], aus[1]) < 1e-6 ? null : this.griffImBlatt(E.fl, k, aus);
    this.geaendert();
  }

  /** das Werk kennt je Anker nur gleich lange Griffe nach beiden Seiten oder eine Ecke: Knick bleibt beim gezogenen Griff */
  knickSetzen(): void {}

  letztenVerschieben(x: number, y: number): void {
    const E = this.ent;
    const k = E?.anker[E.anker.length - 1];
    const XY = E ? this.blattVon(E.fl, x, y) : null;
    if (!k || !XY) return;
    k.X = XY[0];
    k.Y = XY[1];
    this.geaendert();
  }

  /** eine Form schließt immer (das Werk legt geschlossene Formen auf die Haut) */
  schliessen(): void {}

  fertig(): number {
    const E = this.ent;
    this.ent = null;
    if (!E) return -1;
    const vorher = werk.loops.length;
    if (E.abzweig) {
      const ab = werk.G.abzweig;
      werk.G.abzweig = null;
      if (!ab?.start) return -1;
      werk.abzweigungErstellen(E.a, ab.von, E.nach, ab.start, ab.vorher, E.anker);
    } else {
      // S8 (P statt L): im Leeren begonnen, über die Form, im Leeren geendet (zwei Klicks, ↩): ein Loop rundum wie L im Prüffenster
      if (E.anker.length === 2 && this.aussen(E.a, E.anker[0]!.X, E.anker[0]!.Y) && this.aussen(E.a, E.anker[1]!.X, E.anker[1]!.Y)) {
        const [A, B] = E.anker as [werk.StiftAnker, werk.StiftAnker];
        const gerade = (k: werk.StiftAnker): boolean => !k.aus || Math.hypot(k.aus[0], k.aus[1]) < 1e-9;
        if (gerade(A) && gerade(B)) werk.loopSchneiden(E.a, werk.uvAus(E.a, A.X, A.Y), werk.uvAus(E.a, B.X, B.Y));
        else werk.G.meldung = 'Gebogen um die Form schneiden kann das Werk noch nicht (gerade geht: zwei Klicks, ↩)';
        werk.anzeige.allesZeigen();
        this.bauen(this.flaechen);
        this.geaendert();
        if (werk.loops.length <= vorher) return -1;
        const id = werk.loops[werk.loops.length - 1]!.id;
        return this.linien.findIndex((I) => I.fl === E.fl && I.id === id && !I.m);
      }
      if (E.anker.length < 3) {
        this.bauen(this.flaechen);
        this.geaendert();
        return -1;
      }
      werk.G.stift = { a: E.a, anker: E.anker, zieht: false };
      werk.stiftFertig();
    }
    werk.anzeige.allesZeigen();
    this.bauen(this.flaechen);
    this.geaendert();
    if (werk.loops.length <= vorher) return -1;
    const id = werk.loops[werk.loops.length - 1]!.id;
    return this.linien.findIndex((I) => I.fl === E.fl && I.id === id && !I.m);
  }

  abbrechen(): void {
    const E = this.ent;
    this.ent = null;
    if (E?.abzweig) {
      werk.abzweigAbbrechen();
      werk.anzeige.allesZeigen();
    }
    this.bauen(this.flaechen);
    this.geaendert();
  }

  zurueck(): boolean {
    const E = this.ent;
    if (!E) return false;
    if (E.anker.length <= (E.abzweig ? 0 : 1)) {
      this.abbrechen();
      return false;
    }
    E.anker.pop();
    this.bauen(this.flaechen);
    this.geaendert();
    return true;
  }

  /** Vorschau vom letzten Punkt (mit seinem Griff) zum Ende mit Griff `gEnde`, im Bildschirm abgetastet */
  faden(ende: FadenEnde, gEnde: V2): FadenProben | null {
    const e = this.entwurf();
    const L = e ? this.netz.punkte[e.letzter] : undefined;
    if (!e || !L) return null;
    let E: [number, number] | null = null;
    if (ende.art === 'schluss') {
      const P = this.netz.punkte[e.erster];
      E = P ? [P.x, P.y] : null;
    } else if (ende.art === 'frei') E = [ende.x, ende.y];
    else if (ende.art === 'punkt') {
      const P = this.netz.punkte[ende.pi];
      E = P ? [P.x, P.y] : null;
    } else E = this.stelle({ art: 'linie', li: ende.li, si: ende.si, t: ende.t, s: 0 });
    if (!E) return null;
    const k = [L.x, L.y, L.x + e.aus[0], L.y + e.aus[1], E[0] + gEnde[0], E[1] + gEnde[1], E[0], E[1]];
    const n = 48;
    const x = new Float32Array(n + 1);
    const y = new Float32Array(n + 1);
    const s = new Float32Array(n + 1);
    for (let j = 0; j <= n; j++) {
      const [px, py] = bez(k, j / n);
      x[j] = px;
      y[j] = py;
      if (j) s[j] = s[j - 1]! + Math.hypot(px - x[j - 1]!, py - y[j - 1]!);
    }
    return { n: n + 1, x, y, s, laenge: s[n]!, z: new Float32Array(n + 1) };
  }
}
