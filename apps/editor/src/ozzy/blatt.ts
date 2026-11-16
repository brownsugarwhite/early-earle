/**
 * Ozzy: das Blatt, auf dem eine Form beginnt (Plan, Abschnitt 5, Schritt 1 bis 3).
 *
 * Alle Werkzeuge schreiben in dasselbe Netz aus Linien und Punkten der Linien-Studie (`../linien/netz.ts`), und dieselbe Anzeige mit
 * demselben Verhalten zeigt es (Grundsatz G7 „P ist die Linie“):
 * - **P** ist das Werkzeug der Linien-Studie, unverändert (`Verhalten` mit `Stift2D`): Klick Ecke, Ziehen rund, ⌥ bricht, Ring am
 *   ersten Punkt, ↩ schließt, ⌫ letzter Punkt zurück, Esc bricht ab.
 * - **Freihand** wie im Zeichen-Fenster (Florians Einstellung: Glättung 100 %, Treue 4 px, Nachlauf): Der Pinsel läuft dem Zeiger nach
 *   (`Nachlauf`) oder hängt am Faden (`Faden`); beim Loslassen wird der Strich ein Pfad mit den wenigsten Ankern (`anpassen`), ein
 *   offener Strich schließt sich mit einer Geraden (wie Teddy).
 * - **Ellipse** und **Würfel** (vorerst sein Umriss von der Seite, ein Rechteck): Ziehen, ⇧ rund oder gleichseitig, ⌥ aus der Mitte.
 *
 * Auf dem Blatt ist jede Linie ein Umriss (1 px): Die Anzeige liest die Breite „innen“ hier als „Umriss“. Die Silhouette ist die
 * größte geschlossene Linie. Einheit: CSS-Pixel des Blatts, y nach unten.
 */

import { Faden, fadenRund, type Glaettung, Nachlauf, anpassen, ellipse, rechteck, type Pfad } from '@ee/shape/zeichnen';
import { type Linie, type Netz, bezier, kontrollpunkte, netzKopie } from '../linien/netz';
import { type Ansicht, Verhalten, type Werte as LinienWerte } from '../linien/verhalten';
import type { Kapseln } from './kapseln';

export type Werkzeug = 'p' | 'frei' | 'ellipse' | 'wuerfel' | 'auswahl';

/** Anker der Silhouette: Lage und Griffe relativ zum Punkt (ein = zur vorigen Linie, aus = zur nächsten) */
export interface Anker {
  x: number;
  y: number;
  ein: [number, number];
  aus: [number, number];
}

export interface FreihandWerte {
  /** 0 … 1 (Florian: 100 %) */
  glaettung: number;
  /** größte Abweichung des Pfads vom geglätteten Strich (px; Florian: 4) */
  treue: number;
  /** 0 = Nachlauf (Florian), 1 = Faden */
  faden: number;
}

export const FREIHAND_GRUNDWERTE: FreihandWerte = { glaettung: 1, treue: 4, faden: 0 };

const NACHLAUF_MS = 140;
const FADEN_PX = 24;
const SCHRITT_PX = 2;
const SCHLIESSEN_PX = 15;

type V = { x: number; y: number };

const leeresNetz = (): Netz => ({ punkte: [], linien: [] });

/** Fläche (mit Vorzeichen) eines Vielecks */
function flaeche(x: number[], y: number[]): number {
  let a = 0;
  for (let i = 0, j = x.length - 1; i < x.length; j = i++) a += (x[j]! - x[i]!) * (y[j]! + y[i]!);
  return a / 2;
}

/** Nach einer Runde wieder nah am Anfang? Nummer der nächsten Stelle, sonst −1 (Überschießen fällt weg) */
function schlussStelle(P: readonly V[]): number {
  let weg = 0;
  let best = -1;
  let bestD = Infinity;
  for (let i = 1; i < P.length; i++) {
    weg += Math.hypot(P[i]!.x - P[i - 1]!.x, P[i]!.y - P[i - 1]!.y);
    if (weg < 4 * SCHLIESSEN_PX) continue;
    const d = Math.hypot(P[i]!.x - P[0]!.x, P[i]!.y - P[0]!.y);
    if (d < SCHLIESSEN_PX && d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** ein geschlossener Pfad (Anker mit Griffen relativ, fehlende Griffe: ein Drittel der Sehne) als Linie ins Netz */
function pfadInsNetz(n: Netz, pfad: Pfad): void {
  const A = pfad.anker;
  const m = A.length;
  if (m < 2) return;
  const basis = n.punkte.length;
  for (const a of A) n.punkte.push({ x: a.x, y: a.y, sichtbar: true, verdeckt: false });
  const l: Linie = { zu: true, punkte: A.map((_, i) => basis + i), stuecke: [], knick: A.map((a) => a.ecke) };
  for (let i = 0; i < m; i++) {
    const a = A[i]!;
    const b = A[(i + 1) % m]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const g1 = a.aus ?? { x: dx / 3, y: dy / 3 };
    const g2 = b.ein ?? { x: -dx / 3, y: -dy / 3 };
    l.stuecke.push({ g1x: g1.x, g1y: g1.y, g2x: g2.x, g2y: g2.y, art: 'umriss' });
  }
  n.linien.push(l);
}

/** Proben einer Linie des Netzes (für Flächen und die Silhouette) */
function linieProben(n: Netz, li: number, schritt: number): { x: number[]; y: number[]; anker: number[] } {
  const l = n.linien[li]!;
  const x: number[] = [];
  const y: number[] = [];
  const anker: number[] = [];
  for (let si = 0; si < l.stuecke.length; si++) {
    const k = kontrollpunkte(n, l, si);
    const grob = Math.hypot(k[2] - k[0], k[3] - k[1]) + Math.hypot(k[4] - k[2], k[5] - k[3]) + Math.hypot(k[6] - k[4], k[7] - k[5]);
    const m = Math.max(2, Math.ceil(grob / schritt));
    anker.push(x.length);
    for (let j = 0; j < m; j++) {
      const [px, py] = bezier(k, j / m);
      x.push(px);
      y.push(py);
    }
  }
  return { x, y, anker };
}

export class Blatt {
  readonly verhalten: Verhalten;
  werkzeug: Werkzeug = 'p';
  readonly ansicht: Ansicht = { z: 1, ox: 0, oy: 0, dpr: 1, wachsen: false };
  private strich: { g: Glaettung; spur: V[]; roh: V[]; zeiger: V } | null = null;
  private aufzug: { von: V; bis: V } | null = null;
  umschalt = false;
  alt = false;
  zeigerX = -1e6;
  zeigerY = -1e6;
  zeigerDa = false;

  constructor(
    linienWerte: LinienWerte,
    readonly freihand: FreihandWerte,
  ) {
    // Auf dem Blatt ist jede Linie ein Umriss: „innen“ liest hier die Breite des Umrisses (Feinregler wirken weiter)
    const blattWerte = new Proxy(linienWerte, {
      get: (t, k) => (k === 'innen' ? t.umriss : Reflect.get(t, k)),
    });
    this.verhalten = new Verhalten(leeresNetz(), blattWerte);
    this.verhalten.stiftSchalten(true);
  }

  get netz(): Netz {
    return this.verhalten.netz;
  }

  /** zeichnet gerade (P mit offener Linie, Freihand oder Form im Zug) */
  get zeichnet(): boolean {
    return !!this.verhalten.werk.entwurf() || !!this.strich || !!this.aufzug;
  }

  get leer(): boolean {
    return this.netz.linien.length === 0 && !this.zeichnet;
  }

  /** Nummer der Silhouette (größte geschlossene Linie) oder −1 */
  silhouetteNr(): number {
    let best = -1;
    let bestA = 0;
    this.netz.linien.forEach((l, li) => {
      if (!l.zu || l.stuecke.length < 2) return;
      const p = linieProben(this.netz, li, 4);
      const a = Math.abs(flaeche(p.x, p.y));
      if (a > bestA) {
        bestA = a;
        best = li;
      }
    });
    return best;
  }

  get geschlossen(): boolean {
    return this.silhouetteNr() >= 0;
  }

  /** die Anker der Silhouette (CSS-Pixel des Blatts) oder null */
  silhouette(): Anker[] | null {
    const li = this.silhouetteNr();
    if (li < 0) return null;
    const n = this.netz;
    const l = n.linien[li]!;
    const m = l.punkte.length;
    return l.punkte.map((pi, k) => {
      const p = n.punkte[pi]!;
      const aus = l.stuecke[k % l.stuecke.length]!;
      const ein = l.stuecke[(k - 1 + m) % m]!;
      return { x: p.x, y: p.y, ein: [ein.g2x, ein.g2y], aus: [aus.g1x, aus.g1y] };
    });
  }

  /** Kennzahl der Silhouette: ändert sich mit jedem Punkt und Griff */
  get stand(): number {
    const A = this.silhouette();
    if (!A) return 0;
    let h = A.length * 7919;
    for (const a of A) h = (h * 31 + a.x * 13.37 + a.y * 7.13 + a.ein[0] * 3.1 + a.ein[1] * 2.3 + a.aus[0] * 1.7 + a.aus[1] * 1.1) % 1e9;
    return h;
  }

  /** Anker i der Silhouette an eine neue Lage (Griffe gehen mit) */
  ankerSetzen(i: number, x: number, y: number): void {
    const li = this.silhouetteNr();
    if (li < 0) return;
    const pi = this.netz.linien[li]!.punkte[i];
    if (pi === undefined) return;
    const p = this.netz.punkte[pi]!;
    p.x = x;
    p.y = y;
    this.verhalten.abtasten();
  }

  werkzeugSetzen(w: Werkzeug): void {
    if (this.strich || this.aufzug) return;
    if (this.verhalten.werk.entwurf() && w !== 'p') this.verhalten.eingabe('esc');
    this.werkzeug = w;
    this.verhalten.stiftSchalten(w === 'p');
  }

  /** Mülleimer: das Blatt leeren (⌘Z holt es zurück) */
  leeren(): void {
    this.strich = null;
    this.aufzug = null;
    if (this.verhalten.werk.entwurf()) this.verhalten.eingabe('esc');
    if (this.netz.linien.length) this.verhalten.netzErsetzen(leeresNetz());
  }

  rueckgaengig(): boolean {
    if (this.strich || this.aufzug) return false;
    return this.verhalten.rueckgaengig();
  }

  // ---------- Zeiger ----------

  zeiger(x: number, y: number, dt: number): void {
    this.zeigerX = x;
    this.zeigerY = y;
    this.zeigerDa = true;
    this.verhalten.alt = this.alt;
    this.verhalten.umschalt = this.umschalt;
    if (this.werkzeug === 'p' || this.werkzeug === 'auswahl') this.verhalten.zeigerSetzen(x, y, x, y, dt);
    else this.verhalten.zeigerWeg();
  }

  weg(): void {
    this.zeigerDa = false;
    if (!this.strich && !this.aufzug) this.verhalten.zeigerWeg();
  }

  druecken(x: number, y: number, t: number): void {
    this.zeiger(x, y, 0);
    if (this.werkzeug === 'frei') {
      const tau = this.freihand.glaettung * NACHLAUF_MS;
      const g: Glaettung = this.freihand.faden >= 0.5 ? new Faden(this.freihand.glaettung * FADEN_PX) : new Nachlauf(tau);
      const p = { x, y };
      this.strich = { g, spur: [g.anfang(p, t)], roh: [p], zeiger: p };
    } else if (this.werkzeug === 'ellipse' || this.werkzeug === 'wuerfel') {
      this.aufzug = { von: { x, y }, bis: { x, y } };
    } else this.verhalten.druecken();
  }

  bewegen(x: number, y: number, t: number, dt: number): void {
    this.zeiger(x, y, dt);
    const st = this.strich;
    if (st) {
      const p = { x, y };
      st.zeiger = p;
      st.roh.push(p);
      st.spur.push(...st.g.folge(p, t));
    }
    if (this.aufzug) this.aufzug.bis = { x, y };
  }

  loslassen(): void {
    if (this.strich) this.strichEnde();
    else if (this.aufzug) this.aufzugEnde();
    else this.verhalten.loslassen();
  }

  /** Tasten: true, wenn das Blatt sie genommen hat */
  eingabe(taste: 'enter' | 'esc' | 'loeschen'): boolean {
    if (this.strich || this.aufzug) {
      if (taste === 'esc') {
        this.strich = null;
        this.aufzug = null;
        return true;
      }
      return false;
    }
    return this.verhalten.eingabe(taste);
  }

  /** ein Bild weiter; true: es bewegt sich noch etwas */
  schritt(dt: number): boolean {
    const st = this.strich;
    if (st) st.spur.push(...st.g.takt(performance.now()));
    return this.verhalten.schritt(dt) || !!st || !!this.aufzug;
  }

  private strichEnde(): void {
    const st = this.strich;
    this.strich = null;
    if (!st) return;
    st.spur.push(...st.g.ende(st.zeiger, SCHRITT_PX));
    let laenge = 0;
    for (let i = 1; i < st.spur.length; i++) laenge += Math.hypot(st.spur[i]!.x - st.spur[i - 1]!.x, st.spur[i]!.y - st.spur[i - 1]!.y);
    if (laenge < 12) return;
    let spur: V[];
    const schluss = schlussStelle(st.roh);
    if (schluss > 0 && this.freihand.faden >= 0.5 && this.freihand.glaettung > 0) spur = fadenRund(st.roh.slice(0, schluss + 1), this.freihand.glaettung * FADEN_PX);
    else {
      const b = schlussStelle(st.spur);
      spur = b > 0 ? st.spur.slice(0, b + 1) : st.spur;
    }
    const a = anpassen(spur, { treue: Math.max(0.5, this.freihand.treue), schritt: SCHRITT_PX, geschlossen: true });
    if (a.pfad.anker.length < 2) return;
    const n = netzKopie(this.netz);
    pfadInsNetz(n, { anker: a.pfad.anker, geschlossen: true });
    this.verhalten.netzErsetzen(n);
  }

  private formPfad(): Pfad | null {
    const z = this.aufzug;
    if (!z) return null;
    let dx = z.bis.x - z.von.x;
    let dy = z.bis.y - z.von.y;
    if (this.umschalt) {
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * m;
      dy = Math.sign(dy || 1) * m;
    }
    const ausMitte = this.alt;
    const cx = ausMitte ? z.von.x : z.von.x + dx / 2;
    const cy = ausMitte ? z.von.y : z.von.y + dy / 2;
    const rx = ausMitte ? Math.abs(dx) : Math.abs(dx) / 2;
    const ry = ausMitte ? Math.abs(dy) : Math.abs(dy) / 2;
    if (rx < 3 || ry < 3) return null;
    return this.werkzeug === 'ellipse' ? ellipse(cx, cy, rx, ry) : rechteck(cx, cy, rx, ry);
  }

  private aufzugEnde(): void {
    const pfad = this.formPfad();
    this.aufzug = null;
    if (!pfad) return;
    const n = netzKopie(this.netz);
    pfadInsNetz(n, pfad);
    this.verhalten.netzErsetzen(n);
  }

  // ---------- Anzeige ----------

  /** die Szene des Blatts (Gerätepunkte) in K: Linien, Punkte, Tropfen und Zeiger der Linien-Studie, dazu Strich und Form im Zug */
  szene(K: Kapseln, dpr: number): ReturnType<Verhalten['szene']> {
    this.ansicht.dpr = dpr;
    this.verhalten.setzeAnsicht(this.ansicht);
    const sz = this.verhalten.szene(this.ansicht);
    K.leeren();
    K.uebernehmen(sz);
    const w = this.verhalten.werte;
    const r = (w.umriss / 2) * dpr;
    const st = this.strich;
    if (st && st.spur.length > 1) {
      K.zug(
        st.spur.map((p) => p.x * dpr),
        st.spur.map((p) => p.y * dpr),
        r,
        false,
      );
      // der Faden vom Pinsel zum Zeiger: eine Haarlinie, an der der Strich hängt
      const b = st.spur[st.spur.length - 1]!;
      K.push(b.x * dpr, b.y * dpr, st.zeiger.x * dpr, st.zeiger.y * dpr, (w.innen / 2) * dpr * 0.5, (w.innen / 2) * dpr * 0.5, K.neueGruppe(), 0, false);
      K.punkt(b.x * dpr, b.y * dpr, w.punktRadius * dpr);
    }
    const pfad = this.formPfad();
    if (pfad) {
      const n: Netz = { punkte: [], linien: [] };
      pfadInsNetz(n, pfad);
      const p = linieProben(n, 0, 2);
      K.zug(
        p.x.map((v) => v * dpr),
        p.y.map((v) => v * dpr),
        r,
        true,
      );
      for (const a of pfad.anker) K.punkt(a.x * dpr, a.y * dpr, w.punktRadius * dpr);
    }
    // Werkzeuge ohne Zeiger der Linien-Studie: ein Tropfen am Zeiger zeigt die Stelle
    if ((this.werkzeug === 'frei' || this.werkzeug === 'ellipse' || this.werkzeug === 'wuerfel') && this.zeigerDa) {
      K.punkt(this.zeigerX * dpr, this.zeigerY * dpr, w.punktRadius * w.tropfen * dpr);
    }
    return { ...sz, prim: K.puffer, anzahl: K.n, felder: K.felder };
  }
}
