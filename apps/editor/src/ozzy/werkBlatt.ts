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
import { type Ansicht, type LoopPunkt, hatGriffe, istSichtbar } from '@ee/shape/dicht';
import * as werk from '../form/werk';
import { type Art, type Breiten, type Linie, type LinienProben, type Netz, type Punkt, type Stueck, armGriff } from '../linien/netz';
import { type DrehBild, Dreher2D, type RichtungZiel } from '../linien/richtung';
import type { EntwurfInfo, FadenProben } from '../linien/stift';
import type { Raum, Ziel } from '../linien/verhalten';

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
}

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
const glatt = (a: number, b: number, x: number): number => {
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
  flaechen: Flaeche[] = [];
  anker: AnkerInfo[] = [];
  linien: LinienInfo[] = [];
  /** Kennzahl des Aufbaus (Flächen, Loops, Punkte): Ändert sie sich, gelten die Nummern im Netz nicht mehr */
  struktur = '';
  private dreher: Dreher2D;
  /** Zug an einem Punkt, einer Linie oder mehreren Punkten: Fläche, Spiegelbild, Stelle beim Drücken (Bildschirm), schon im Werk? */
  private zg: { fl: number; m: boolean; sx: number; sy: number; los: boolean } | null = null;
  /** Drehen einer Richtung: Linie und Stelle im Netz, Punkt und Seite im Werk, Spitze des Griffs im Blatt beim Drücken */
  private dz: { li: number; k: number; pi: number; seite: 'ein' | 'aus'; fl: number; m: boolean; id: number; i: number; X0: number; Y0: number; los: boolean } | null = null;
  /** ein Klick ohne Zug: Die Studie ruft danach `rueckgaengig`, das hier nichts tun darf */
  private klickRueck = false;
  private gezeigteAuswahl = new Set<number>();
  private auswahlStruktur = '';

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
  bauen(flaechen: Flaeche[]): void {
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
                punkte.push({ x, y, sichtbar: sichtbar && istSichtbar(p), verdeckt: false, z: 0 });
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
            }
            linien.push({ zu, punkte: idx, stuecke, knick: P.map((_, i) => werk.eckeGezeigt(li, i)) });
            infos.push({ fl, id: l.id, m });
            proben.push(this.abtasten(F, kontroll, stuecke, br));
          }
        });
      });
    });
    this.netz = { punkte, linien };
    this.proben = proben;
    this.anker = anker;
    this.linien = infos;
    this.roh = roh;
    this.flaechen = flaechen;
    this.struktur = `${flaechen.map((f) => f.a).join(',')}|${werk.loops.map((l) => `${l.id}.${l.punkte.length}.${werk.exakt(l) && hatGriffe(l) ? 1 : 0}`).join(',')}`;
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
    this.dz = { li: z.li, k: z.k, pi: z.pi, seite: z.seite, fl: I.fl, m: I.m, id: I.id, i: z.k, X0, Y0, los: false };
    this.geaendert();
    return spitze;
  }

  drehenZiehen(cx: number, cy: number, alt: boolean, dt: number): void {
    this.dreher.drehenZiehen(cx, cy, alt, dt);
  }

  /** die Studie hat die Richtung gedreht (im Netz): die Spitze des Griffs im Werk dorthin */
  private drehenSetzen(n: Netz): void {
    const d = this.dz;
    if (!d) return;
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
    this.dreher.drehenEnden();
    if (!d?.los) return;
    if (werk.G.gegriffen) werk.G.gegriffen = null;
    else if (werk.zug && !werk.zug.modal) werk.zugEnde(true);
    this.geaendert();
  }

  drehBild(): DrehBild | null {
    return this.dreher.drehBild();
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

  // ---------- Werkzeug P (kommt mit Etappe 5.3) ----------

  entwurf(): EntwurfInfo | null {
    return null;
  }
  ortFrei(): { x: number; y: number; mitte: boolean } | null {
    return null;
  }
  mittePunkte(): number[] {
    return [];
  }
  beginnen(): number | null {
    return null;
  }
  weiter(): number | null {
    return null;
  }
  griffeLetzter(): void {}
  griffeErster(): void {}
  knickSetzen(): void {}
  letztenVerschieben(): void {}
  schliessen(): void {}
  fertig(): number {
    return -1;
  }
  abbrechen(): void {}
  zurueck(): boolean {
    return false;
  }
  faden(): FadenProben | null {
    return null;
  }
}
