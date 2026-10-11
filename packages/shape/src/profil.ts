// Profile des Wesen-Editors: eine Bézier-Kurve je Ansicht (Seite geschlossen, Front und Top als
// editierbare Hälfte mit Spiegelachse). Alle Operationen sind rein und geben ein neues Profil zurück.
//
// Ansichtskoordinaten (u nach rechts, v nach oben), Einheit Kachelkante:
// - Seite: u = hinten (vorn links), v = oben, v = 0 ist der Boden, u = 0 die Kachelmitte.
// - Front: u = rechts (Achse u = 0, editierbar u ≥ 0), v = oben, v = 0 ist der Boden.
// - Top:   u = hinten (vorn links), v = Bildschirm oben (Achse v = 0, editierbar v ≥ 0).

import { type Kubik, type V2, abstand, bogenlaenge, laengeV, mal, minus, naechsterAufKubik, normiert, plus, teilen } from './bezier';

export type KnotenArt = 'glatt' | 'ecke';

/** Ein Kurvenpunkt; `ein`/`aus` sind die Bézier-Griffe relativ zu `p`. */
export type Knoten = { p: V2; ein: V2; aus: V2; art: KnotenArt };

/** senkrecht: Spiegelung an u = 0 (Front); waagerecht: Spiegelung an v = 0 (Top). */
export type Achse = 'senkrecht' | 'waagerecht';

export type Profil = { art: 'geschlossen'; knoten: Knoten[] } | { art: 'halb'; achse: Achse; knoten: Knoten[] };

export type GriffSeite = 'ein' | 'aus';

/** Größte Segmentlänge, bevor beim Ziehen automatisch formtreu geteilt wird (Kachel-Einheiten). */
export const MAX_SEGMENT = 0.2;
export const MIN_KNOTEN_GESCHLOSSEN = 4;
export const MIN_KNOTEN_HALB = 3;

/** Startkugel: Durchmesser 0,53 Kachel, steht auf dem Boden (Florians Vorlage). */
export const START_RADIUS = 0.265;

const k = (p: V2, ein: V2, aus: V2, art: KnotenArt = 'glatt'): Knoten => ({ p, ein, aus, art });

export function spiegeln(v: V2, achse: Achse): V2 {
  return achse === 'senkrecht' ? { x: -v.x, y: v.y } : { x: v.x, y: -v.y };
}

export function knotenAnzahl(pr: Profil): number {
  return pr.knoten.length;
}

export function segmentAnzahl(pr: Profil): number {
  return pr.art === 'geschlossen' ? pr.knoten.length : pr.knoten.length - 1;
}

export function istAchsKnoten(pr: Profil, i: number): boolean {
  return pr.art === 'halb' && (i === 0 || i === pr.knoten.length - 1);
}

/** Welcher Griff eines Achsknotens editierbar ist (der andere ist sein Spiegelbild). */
export function editierbarerGriff(pr: Profil, i: number): GriffSeite | 'beide' {
  if (pr.art !== 'halb') return 'beide';
  if (i === 0) return 'aus';
  if (i === pr.knoten.length - 1) return 'ein';
  return 'beide';
}

export function segment(pr: Profil, s: number): Kubik {
  const n = pr.knoten.length;
  const a = pr.knoten[s]!;
  const b = pr.knoten[(s + 1) % n]!;
  return [a.p, plus(a.p, a.aus), plus(b.p, b.ein), b.p];
}

export function segmente(pr: Profil): Kubik[] {
  const out: Kubik[] = [];
  const m = segmentAnzahl(pr);
  for (let s = 0; s < m; s++) out.push(segment(pr, s));
  return out;
}

/** Die gespiegelte Hälfte in Laufrichtung (vom letzten Achsknoten zurück zum ersten). */
export function gespiegelteSegmente(pr: Profil): Kubik[] {
  if (pr.art !== 'halb') return [];
  const segs = segmente(pr);
  const out: Kubik[] = [];
  for (let s = segs.length - 1; s >= 0; s--) {
    const [p0, p1, p2, p3] = segs[s]!;
    out.push([spiegeln(p3, pr.achse), spiegeln(p2, pr.achse), spiegeln(p1, pr.achse), spiegeln(p0, pr.achse)]);
  }
  return out;
}

/** Geschlossener Umriss: bei Halbprofilen editierbare Hälfte plus Spiegelbild. */
export function vollerPfad(pr: Profil): Kubik[] {
  return pr.art === 'halb' ? [...segmente(pr), ...gespiegelteSegmente(pr)] : segmente(pr);
}

export function pfadAbtasten(segs: readonly Kubik[], proSegment: number): V2[] {
  const out: V2[] = [];
  segs.forEach((seg, si) => {
    for (let i = si === 0 ? 0 : 1; i <= proSegment; i++) {
      const t = i / proSegment;
      const s = 1 - t;
      const [p0, p1, p2, p3] = seg;
      const a = s * s * s;
      const b = 3 * s * s * t;
      const c = 3 * s * t * t;
      const d = t * t * t;
      out.push({ x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y });
    }
  });
  return out;
}

// ---------- Startformen ----------

/** Griff-Länge für einen Kreisbogen mit Winkel Δ (Bézier-Kreisnäherung). */
const griffFuerBogen = (r: number, delta: number) => (4 / 3) * Math.tan(delta / 4) * r;

function kreisKnoten(mitte: V2, r: number, winkel: number, h: number): Knoten {
  const p = { x: mitte.x + r * Math.cos(winkel), y: mitte.y + r * Math.sin(winkel) };
  // Lauf im Uhrzeigersinn (Winkel nimmt ab): Vorwärtstangente (sin, −cos)
  const vor = { x: Math.sin(winkel), y: -Math.cos(winkel) };
  return k(p, mal(vor, -h), mal(vor, h));
}

/** Geschlossener Kreis, oben beginnend, im Uhrzeigersinn. */
export function startKreis(mitte: V2, r: number, n = 12): Profil {
  const h = griffFuerBogen(r, (2 * Math.PI) / n);
  const knoten: Knoten[] = [];
  for (let i = 0; i < n; i++) knoten.push(kreisKnoten(mitte, r, Math.PI / 2 - (i * 2 * Math.PI) / n, h));
  return { art: 'geschlossen', knoten };
}

/** Halbkreis auf der editierbaren Seite der Achse, `segs` Segmente (segs + 1 Knoten). */
export function startHalbkreis(mitte: V2, r: number, achse: Achse, segs = 6): Profil {
  const h = griffFuerBogen(r, Math.PI / segs);
  const start = achse === 'senkrecht' ? Math.PI / 2 : Math.PI;
  const knoten: Knoten[] = [];
  for (let i = 0; i <= segs; i++) knoten.push(kreisKnoten(mitte, r, start - (i * Math.PI) / segs, h));
  return achsenRegeln({ art: 'halb', achse, knoten });
}

// ---------- Regeln ----------

function aufHaelfte(achse: Achse, v: V2): V2 {
  return achse === 'senkrecht' ? { x: Math.max(0, v.x), y: v.y } : { x: v.x, y: Math.max(0, v.y) };
}

function aufAchse(achse: Achse, v: V2): V2 {
  return achse === 'senkrecht' ? { x: 0, y: v.y } : { x: v.x, y: 0 };
}

/** Griff eines glatten Achsknotens: quer zur Achse, in die editierbare Hälfte. */
function querZurAchse(achse: Achse, rel: V2): V2 {
  return achse === 'senkrecht' ? { x: Math.max(0, rel.x), y: 0 } : { x: 0, y: Math.max(0, rel.y) };
}

/** Stellt die Achsregeln her: Achsknoten auf der Achse, Spiegelgriff = Spiegelbild, glatt = quer. */
export function achsenRegeln(pr: Profil): Profil {
  if (pr.art !== 'halb') return pr;
  const n = pr.knoten.length;
  const knoten = pr.knoten.map((kn, i) => {
    if (i !== 0 && i !== n - 1) return { ...kn, p: aufHaelfte(pr.achse, kn.p) };
    const p = aufAchse(pr.achse, kn.p);
    if (i === 0) {
      const aus = kn.art === 'glatt' ? querZurAchse(pr.achse, kn.aus) : aufHaelfte(pr.achse, kn.aus);
      return { ...kn, p, aus, ein: spiegeln(aus, pr.achse) };
    }
    const ein = kn.art === 'glatt' ? querZurAchse(pr.achse, kn.ein) : aufHaelfte(pr.achse, kn.ein);
    return { ...kn, p, ein, aus: spiegeln(ein, pr.achse) };
  });
  return { ...pr, knoten };
}

function ersetze(pr: Profil, i: number, kn: Knoten): Profil {
  const knoten = pr.knoten.slice();
  knoten[i] = kn;
  return achsenRegeln({ ...pr, knoten });
}

// ---------- Bearbeiten ----------

export function bewegeKnoten(pr: Profil, i: number, ziel: V2): Profil {
  const kn = pr.knoten[i];
  if (!kn) return pr;
  return ersetze(pr, i, { ...kn, p: ziel });
}

/**
 * Zieht einen Griff an die absolute Position `ziel`.
 * Ohne `brechen` bleiben die Griffe eines glatten Punkts eine Linie durch den Punkt (Längen frei, wie
 * Illustrator); mit `brechen` (⌥) wird der Punkt zur Ecke und der Griff bewegt sich allein.
 */
export function bewegeGriff(pr: Profil, i: number, seite: GriffSeite, ziel: V2, brechen: boolean): Profil {
  const kn = pr.knoten[i];
  if (!kn) return pr;
  const rel = minus(ziel, kn.p);
  const art: KnotenArt = brechen ? 'ecke' : kn.art;
  if (istAchsKnoten(pr, i)) {
    // achsenRegeln setzt Querlage bzw. Spiegelgriff
    return ersetze(pr, i, { ...kn, art, [seite]: rel });
  }
  if (art === 'ecke') return ersetze(pr, i, { ...kn, art, [seite]: rel });
  const gegen: GriffSeite = seite === 'ein' ? 'aus' : 'ein';
  const gl = laengeV(kn[gegen]);
  const richtung = normiert(rel);
  const gegenRel = mal(richtung, -(gl > 1e-9 ? gl : laengeV(rel)));
  return ersetze(pr, i, { ...kn, art, [seite]: rel, [gegen]: gegenRel });
}

/** Macht aus einer Ecke wieder einen glatten Punkt: Griffe werden eine Linie durch den Punkt. */
export function glaetten(pr: Profil, i: number): Profil {
  const kn = pr.knoten[i];
  if (!kn) return pr;
  const n = pr.knoten.length;
  const vorher = pr.knoten[(i - 1 + n) % n]!;
  const nachher = pr.knoten[(i + 1) % n]!;
  const lEin = laengeV(kn.ein) > 1e-9 ? laengeV(kn.ein) : abstand(kn.p, vorher.p) / 3;
  const lAus = laengeV(kn.aus) > 1e-9 ? laengeV(kn.aus) : abstand(kn.p, nachher.p) / 3;
  if (pr.art === 'halb' && istAchsKnoten(pr, i)) {
    const l = i === 0 ? lAus : lEin;
    const rel = pr.achse === 'senkrecht' ? { x: l, y: 0 } : { x: 0, y: l };
    return ersetze(pr, i, { ...kn, art: 'glatt', ein: rel, aus: rel });
  }
  let dir = normiert(minus(kn.aus, kn.ein));
  if (laengeV(dir) < 0.5) dir = normiert(minus(nachher.p, vorher.p));
  return ersetze(pr, i, { ...kn, art: 'glatt', ein: mal(dir, -lEin), aus: mal(dir, lAus) });
}

/** Fügt formtreu einen Punkt in Segment `s` bei `t` ein (De Casteljau). Gibt den neuen Index zurück. */
export function einfuegen(pr: Profil, s: number, t: number): { profil: Profil; index: number } {
  const n = pr.knoten.length;
  if (s < 0 || s >= segmentAnzahl(pr)) return { profil: pr, index: -1 };
  const [l, r] = teilen(segment(pr, s), t);
  const ia = s;
  const ib = (s + 1) % n;
  const a = pr.knoten[ia]!;
  const b = pr.knoten[ib]!;
  const m = l[3];
  const neu: Knoten = k(m, minus(l[2], m), minus(r[1], m));
  const knoten = pr.knoten.slice();
  knoten[ia] = { ...a, aus: minus(l[1], a.p) };
  knoten[ib] = { ...b, ein: minus(r[2], b.p) };
  knoten.splice(s + 1, 0, neu);
  return { profil: achsenRegeln({ ...pr, knoten }), index: s + 1 };
}

export function kannLoeschen(pr: Profil, i: number): boolean {
  if (istAchsKnoten(pr, i)) return false;
  const min = pr.art === 'geschlossen' ? MIN_KNOTEN_GESCHLOSSEN : MIN_KNOTEN_HALB;
  return pr.knoten.length > min && i >= 0 && i < pr.knoten.length;
}

export function loeschen(pr: Profil, i: number): Profil {
  if (!kannLoeschen(pr, i)) return pr;
  const knoten = pr.knoten.slice();
  knoten.splice(i, 1);
  return achsenRegeln({ ...pr, knoten });
}

/**
 * Teilt alle Segmente, die länger als `max` sind, formtreu in der Mitte. `folge` ist der Index eines
 * Knotens, dessen neue Position zurückgegeben wird (z. B. der gerade gezogene Punkt).
 */
export function autoTeilen(pr: Profil, max = MAX_SEGMENT, folge = -1): { profil: Profil; folge: number } {
  let profil = pr;
  let f = folge;
  for (let runde = 0; runde < 64; runde++) {
    const m = segmentAnzahl(profil);
    let geteilt = false;
    for (let s = 0; s < m; s++) {
      if (bogenlaenge(segment(profil, s)) > max) {
        const r = einfuegen(profil, s, 0.5);
        profil = r.profil;
        if (f >= r.index) f += 1;
        geteilt = true;
        break;
      }
    }
    if (!geteilt) break;
  }
  return { profil, folge: f };
}

export type KurvenTreffer = { segment: number; t: number; punkt: V2; abstand: number };

/** Nächster Punkt auf der editierbaren Kurve. */
export function naechsterAufProfil(pr: Profil, p: V2): KurvenTreffer | null {
  let best: KurvenTreffer | null = null;
  segmente(pr).forEach((seg, s) => {
    const tr = naechsterAufKubik(seg, p);
    if (!best || tr.abstand < best.abstand) best = { segment: s, t: tr.t, punkt: tr.punkt, abstand: tr.abstand };
  });
  return best;
}
