// Teil G, G4 (Beweis): Rumpf und Teile bauen. Der Rumpf ist die Röhre aus den geöffneten Silhouetten (`teile.ts`: dünne
// Teile fallen weg); jedes seitliche Teil aus dem Top (Flügelspitzen der Ente, Brustflossen des Fischs) wird eine
// nahtlose Ausstülpung wie die Beine aus Beweis 3: Um einen Ringpunkt des Rumpfs liegt ein Feld aus 2 × 2 Flächen, sein
// Rand bleibt am Körper und wird Ring 0, die vier Flächen wandern als Spitze ans Ende, dazwischen Ringe aus je 8 Punkten.
// Anders als beim Bein folgt die Achse der Mittellinie des Teils im Top (gebogen), und die Ringe sind flache Ellipsen:
// Breite aus dem Top, Dicke aus dem Teil der Front (Fisch) oder halb so dick wie breit (Ente: in der Front kein dünnes Teil).
// Gespiegelt auf beiden Seiten. Ohne Teile: `ableiten` unverändert.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { knotenNachWelt, profilHalb } from '../../fit';
import { type Profil, achsenRegeln } from '../../profil';
import { type Kaefig, type V3, alleFlaechen, kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../../kaefig/halbkanten';
import { type Roehre, roehre } from '../../kaefig/roehre';
import { grenzLoeser, kaefigDurchZiele } from '../../loeser/grenzflaeche';
import { type Unterteilung, unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { ABLEIT_STANDARD, type AbleitOptionen, type Ableitung, ableiten, faltenSetzen, fertigstellen, kernLeiter, stationenWaehlen, zieleBerechnen } from '../ableiten';
import { type Breiten, silhouettenBreite } from '../breite';
import { type AnsichtTeile, type Raster, type TeilFleck, teileVon } from './teile';

export type TeilInfo = {
  /** Mittellinie (Welt, rechte Seite), halbe Breite (quer in der Waagerechten) und halbe Dicke (senkrecht) je Punkt */
  linie: V3[];
  breite: number[];
  dicke: number[];
  ansatz: { ring: number; j: number };
};

/** Angestecktes Teil: eigene Röhre (8 Punkte je Ring), vorn verdeckt im Rumpf, mit eigenem feinem Netz. */
export type GestecktesTeil = { kaefig: Kaefig; fein: Float64Array; unterteilung: Unterteilung };

export type TeilErgebnis = Ableitung & { teile: TeilInfo[]; rumpfBreiten: Breiten; gesteckt: GestecktesTeil[] };

/** Bauart der Teile: nahtlos aus dem Rumpf (Ausstülpung) oder als eigene Röhre, die verdeckt im Rumpf beginnt */
export type TeilArt = 'verschmolzen' | 'angesteckt';

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

const TEIL_RINGE = 7;
const SCHULTER = 2;

/**
 * Breite je Stelle aus einem Raster: das erste zusammenhängende Stück von der Achse nach außen (positive Seite), geglättet
 * und linear dazwischen. Nicht der äußerste Punkt: Hinter einer Kerbe (Ente: Flügelspitze neben dem Schwanz) gehört das
 * äußere Stück zum Teil, nicht zum Rumpf.
 */
function rasterBreite(R: Raster, an: Uint8Array, laengsX: boolean): (l: number) => number {
  const { W, H, h } = R;
  const n = laengsX ? W : H;
  const roh = new Float64Array(n).fill(-Infinity);
  for (let k = 0; k < n; k++) {
    // Zelle auf der Achse (quer = 0) und nach außen (positive Seite) bis zur ersten Lücke
    const achse = laengsX ? Math.floor((0 - R.oy) / h) : Math.floor((0 - R.ox) / h);
    const zelle = (q: number) => (laengsX ? q * W + k : k * W + q);
    const grenze = laengsX ? H : W;
    let q = Math.max(0, achse);
    // die Achse kann knapp neben einer besetzten Zelle liegen
    if (q < grenze && !an[zelle(q)] && q + 1 < grenze && an[zelle(q + 1)]) q++;
    if (q >= grenze || !an[zelle(q)]) continue;
    while (q + 1 < grenze && an[zelle(q + 1)]) q++;
    roh[k] = (laengsX ? R.oy : R.ox) + (q + 1) * h;
  }
  // gleitendes Mittel über 5 Zellen (nur über besetzte Zellen)
  const glatt = new Float64Array(n).fill(-Infinity);
  for (let k = 0; k < n; k++) {
    if (!(roh[k]! > -Infinity)) continue;
    let s = 0;
    let m = 0;
    for (let d = -2; d <= 2; d++) {
      const v = roh[k + d];
      if (v !== undefined && v > -Infinity) {
        s += v;
        m++;
      }
    }
    glatt[k] = s / m;
  }
  const o = laengsX ? R.ox : R.oy;
  return (l: number) => {
    const x = (l - o) / h - 0.5;
    const k0 = Math.floor(x);
    const f = x - k0;
    const a = glatt[k0];
    const b = glatt[k0 + 1];
    if (a === undefined || b === undefined || !(a > -Infinity) || !(b > -Infinity)) return a !== undefined && a > -Infinity ? a : b !== undefined && b > -Infinity ? b : -Infinity;
    return a + (b - a) * f;
  };
}

/** Mittellinie eines Teils im Top: vom Ansatz (Zellen am Rumpf) zum fernsten Punkt (Weg innen), geglättet. */
function mittellinie(R: Raster, rumpf: Uint8Array, f: TeilFleck): { linie: V2[]; breite: number[]; ansatz: V2 } | null {
  const { W, H, h } = R;
  const im = new Uint8Array(W * H);
  for (const i of f.zellen) im[i] = 1;
  const welt = (i: number): V2 => {
    const r = Math.floor(i / W);
    return { x: R.ox + (i - r * W + 0.5) * h, y: R.oy + (r + 0.5) * h };
  };
  const ansatz: number[] = [];
  for (const i of f.zellen) {
    const r = Math.floor(i / W);
    const c = i - r * W;
    let amRumpf = false;
    for (let dr = -1; dr <= 1 && !amRumpf; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < H && cc < W && rumpf[rr * W + cc]) {
          amRumpf = true;
          break;
        }
      }
    if (amRumpf) ansatz.push(i);
  }
  if (!ansatz.length) return null;
  // Weg innen vom Ansatz (Mehrquellen-Dijkstra, einfache Liste)
  const d = new Float64Array(W * H).fill(Infinity);
  const vor = new Int32Array(W * H).fill(-1);
  const offen: number[] = [];
  for (const i of ansatz) {
    d[i] = 0;
    offen.push(i);
  }
  while (offen.length) {
    let bi = 0;
    for (let k = 1; k < offen.length; k++) if (d[offen[k]!]! < d[offen[bi]!]!) bi = k;
    const i = offen.splice(bi, 1)[0]!;
    const r = Math.floor(i / W);
    const c = i - r * W;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue;
        const j = rr * W + cc;
        if (!im[j]) continue;
        const nd = d[i]! + (dr && dc ? Math.SQRT2 : 1);
        if (nd < d[j]!) {
          if (d[j] === Infinity) offen.push(j);
          d[j] = nd;
          vor[j] = i;
        }
      }
  }
  let spitze = f.zellen[0]!;
  for (const i of f.zellen) if (d[i]! > d[spitze]! && Number.isFinite(d[i]!)) spitze = i;
  const pfad: V2[] = [];
  for (let i = spitze; i >= 0; i = vor[i]!) pfad.push(welt(i));
  pfad.reverse();
  if (pfad.length < 4) return null;
  // glätten und nach Bogenlänge auf TEIL_RINGE + 1 Punkte
  const glatt = pfad.map((_, k) => {
    let sx = 0;
    let sy = 0;
    let m = 0;
    for (let e = -3; e <= 3; e++) {
      const p = pfad[Math.min(pfad.length - 1, Math.max(0, k + e))]!;
      sx += p.x;
      sy += p.y;
      m++;
    }
    return { x: sx / m, y: sy / m };
  });
  glatt[0] = pfad[0]!;
  glatt[glatt.length - 1] = pfad[pfad.length - 1]!;
  const L = [0];
  for (let k = 1; k < glatt.length; k++) L.push(L[k - 1]! + Math.hypot(glatt[k]!.x - glatt[k - 1]!.x, glatt[k]!.y - glatt[k - 1]!.y));
  const linie: V2[] = [];
  const m = TEIL_RINGE;
  for (let s = 0; s <= m; s++) {
    const t = (L[L.length - 1]! * s) / m;
    let k = 0;
    while (k + 2 < L.length && L[k + 1]! < t) k++;
    const u = L[k + 1]! > L[k]! ? (t - L[k]!) / (L[k + 1]! - L[k]!) : 0;
    linie.push({ x: glatt[k]!.x + (glatt[k + 1]!.x - glatt[k]!.x) * u, y: glatt[k]!.y + (glatt[k + 1]!.y - glatt[k]!.y) * u });
  }
  // halbe Breite quer zur Linie (im Teil, Schritte von einer halben Zelle)
  const drin = (p: V2) => {
    const c = Math.floor((p.x - R.ox) / h);
    const r = Math.floor((p.y - R.oy) / h);
    // nur im Teil: mit dem Rumpf gemessen wurden die Ringe am Ansatz breiter als die Zeichnung (Ente: Front Δ 24 px)
    return c >= 0 && r >= 0 && c < W && r < H && im[r * W + c] === 1;
  };
  const breite = linie.map((p, k) => {
    const a = linie[Math.max(0, k - 1)]!;
    const b = linie[Math.min(linie.length - 1, k + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
    let w1 = 0;
    let w2 = 0;
    while (w1 < 0.3 && drin({ x: p.x + n.x * w1, y: p.y + n.y * w1 })) w1 += 0.5 * h;
    while (w2 < 0.3 && drin({ x: p.x - n.x * w2, y: p.y - n.y * w2 })) w2 += 0.5 * h;
    return Math.max(h, 0.5 * (w1 + w2));
  });
  return { linie, breite, ansatz: welt(ansatz[Math.floor(ansatz.length / 2)]!) };
}

/** Höhe und halbe Dicke eines seitlichen Teils aus der Front (Teil der Front bei gleicher seitlicher Lage), sonst null. */
function ausFront(front: AnsichtTeile, z: number): { y: number; dicke: number } | null {
  const R = front.raster;
  const { W, h } = R;
  let best: TeilFleck | null = null;
  for (const f of front.teile) if (f.schwerpunkt.x > 0 && f.ausdehnung.x0 <= z + 2 * h && f.ausdehnung.x1 >= z - 2 * h) best = f;
  if (!best) return null;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const i of best.zellen) {
    const r = Math.floor(i / W);
    const x = R.ox + (i - r * W + 0.5) * h;
    if (Math.abs(x - z) > 1.5 * h) continue;
    const y = R.oy + (r + 0.5) * h;
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  if (!(y1 >= y0)) return { y: best.schwerpunkt.y, dicke: 0.5 * (best.ausdehnung.y1 - best.ausdehnung.y0) };
  return { y: 0.5 * (y0 + y1), dicke: 0.5 * (y1 - y0) + 0.5 * h };
}

/**
 * Halbprofil aus der Breite eines Rasters (Rumpf): Breite je Stelle längs, von Achse zu Achse, mit dem Fit des
 * Nachzeichnens (Profil-Einheiten: Welt / Skalierung).
 */
function profilAusRaster(R: Raster, an: Uint8Array, laengsX: boolean, sk: number): Profil {
  const breite = rasterBreite(R, an, laengsX);
  const { h } = R;
  const n = laengsX ? R.W : R.H;
  const o = laengsX ? R.ox : R.oy;
  const pts: [number, number][] = [];
  let erste = -1;
  let letzte = -1;
  for (let k = 0; k < n; k++) {
    const l = o + (k + 0.5) * h;
    if (breite(l) > 0) {
      if (erste < 0) erste = k;
      letzte = k;
    }
  }
  const l0 = o + (erste + 0.5) * h - 0.5 * h;
  const l1 = o + (letzte + 0.5) * h + 0.5 * h;
  // Front: von oben nach unten (y fällt), Top: von vorn nach hinten (x steigt)
  const schritte = Math.max(24, Math.round((l1 - l0) / (0.5 * h)));
  for (let s2 = 0; s2 <= schritte; s2++) {
    const l = laengsX ? l0 + ((l1 - l0) * s2) / schritte : l1 - ((l1 - l0) * s2) / schritte;
    const w = s2 === 0 || s2 === schritte ? 0 : Math.max(0, breite(l));
    pts.push(laengsX ? [l * 461, w * 461] : [w * 461, l * 461]);
  }
  const kn = profilHalb(pts, 1.2, !laengsX);
  return achsenRegeln({ art: 'halb', achse: laengsX ? 'waagerecht' : 'senkrecht', knoten: knotenNachWelt(kn, (p) => ({ x: p[0] / 461 / sk, y: p[1] / 461 / sk }), 1 / 461 / sk) });
}

/** Rumpf-Dokument: Front und Top ohne Teile (geöffnete Silhouetten), wenn die Ansicht Teile zeigt; sonst unverändert. */
export function rumpfDokument(dok: Dokument, t = teileVon(dok)): Dokument {
  const sk = dok.skalierung;
  const top = t.top.teile.length ? profilAusRaster(t.top.raster, t.top.rumpf, true, sk) : dok.profile.top;
  const front = t.front.teile.length ? profilAusRaster(t.front.raster, t.front.rumpf, false, sk) : dok.profile.front;
  return top === dok.profile.top && front === dok.profile.front ? dok : { ...dok, profile: { ...dok.profile, top, front } };
}

/** Ableitung mit Teilen: Rumpf aus den geöffneten Silhouetten, Teile als Ausstülpungen oder angesteckt. Ohne Teile wie `ableiten`. */
export function ableitenMitTeilen(dok: Dokument, optionen: Partial<AbleitOptionen> = {}, art: TeilArt = 'verschmolzen'): TeilErgebnis {
  const t = teileVon(dok);
  const breitenVoll = silhouettenBreite(dok);
  if (!t.top.teile.length && !t.front.teile.length) return { ...ableiten(dok, optionen), teile: [], rumpfBreiten: breitenVoll, gesteckt: [] };
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const t0 = jetzt();
  const rumpf = rumpfDokument(dok, t);
  const l = kernLeiter(rumpf);
  const t1 = jetzt();
  const breiten = silhouettenBreite(rumpf);
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, rumpf);
  faltenSetzen(vorlage, st, l, rumpf, breiten, opt);
  const roh = zieleBerechnen(vorlage, l, st, breiten, rumpf, opt);
  // Teile aus dem Top (rechte Seite: Schwerpunkt mit z > 0; die linke entsteht gespiegelt)
  const infos: TeilInfo[] = [];
  for (const f of t.top.teile) {
    if (f.schwerpunkt.y <= 0) continue;
    const m = mittellinie(t.top.raster, t.top.rumpf, f);
    if (!m) continue;
    // Höhe: Teil der Front bei gleicher seitlicher Lage, sonst die Höhe der größten Rumpfbreite am Ansatz
    const vorneZ = m.linie[Math.floor(m.linie.length / 2)]!.y;
    const fr = ausFront(t.front, vorneZ);
    const ansatzX = m.ansatz.x;
    // Ansatz: der Ringpunkt (rechte Hälfte, ohne Naht- und Kappennähe), der dem Ansatz im Top (x, z) am nächsten liegt —
    // nicht nur nach x: beim S-Hals liegen Hals und Körper an derselben Stelle x übereinander (die Flügel saßen am Hals)
    let ring = 1;
    let j = 1;
    let dBest = Infinity;
    for (let i = 1; i < vorlage.R - 1; i++)
      for (let jj = 1; jj <= vorlage.N / 2 - 2; jj++) {
        const p = vorlage.ringPunkt(i, jj);
        const d = (roh.ziele[3 * p]! - ansatzX) ** 2 + (roh.ziele[3 * p + 2]! - m.ansatz.y) ** 2 + (fr ? (roh.ziele[3 * p + 1]! - fr.y) ** 2 : 0);
        if (d < dBest) {
          dBest = d;
          ring = i;
          j = jj;
        }
      }
    const pAnsatz = vorlage.ringPunkt(ring, j);
    const y = fr ? fr.y : roh.ziele[3 * pAnsatz + 1]!;
    const linie: V3[] = m.linie.map((p) => [p.x, y, p.y]);
    const dicke = m.breite.map((b, k) => (fr ? Math.min(fr.dicke, 0.9 * b + fr.dicke * 0.1) : 0.5 * b) * (k === m.breite.length - 1 ? 0.6 : 1));
    infos.push({ linie, breite: m.breite, dicke, ansatz: { ring, j } });
  }
  if (!infos.length) {
    const abl = fertigstellen({ opt, vorlage, kaefig: vorlage.kaefig, ziele: roh.ziele, hoehe: roh.hoehe, l, st, breiten, dok: rumpf, zeiten: { t0, t1, t2 } });
    return { ...abl, teile: [], rumpfBreiten: breiten, gesteckt: [] };
  }
  if (art === 'angesteckt') {
    const abl = fertigstellen({ opt, vorlage, kaefig: vorlage.kaefig, ziele: roh.ziele, hoehe: roh.hoehe, l, st, breiten, dok: rumpf, zeiten: { t0, t1, t2 } });
    const gesteckt: GestecktesTeil[] = [];
    for (const info of infos) for (const spiegel of [false, true]) gesteckt.push(teilGesteckt(info, roh.ziele, vorlage.ringPunkt(info.ansatz.ring, info.ansatz.j), spiegel, opt.stufen));
    return { ...abl, teile: infos, rumpfBreiten: breiten, gesteckt };
  }
  const b = teileAnsetzen(vorlage, vorlage.kaefig, roh.ziele, roh.hoehe, infos);
  const abl = fertigstellen({ opt, vorlage, kaefig: b.kaefig, ziele: b.ziele, hoehe: b.hoehe, l, st, breiten, dok: rumpf, haut: b.haut, zeiten: { t0, t1, t2 } });
  return { ...abl, teile: infos, rumpfBreiten: breiten, gesteckt: [] };
}

/** Feldrand um den Ringpunkt (i, j) im Umlauf. */
function feldRand(v: Roehre, i: number, j: number): number[] {
  const p = v.ringPunkt;
  return [p(i - 1, j - 1), p(i - 1, j), p(i - 1, j + 1), p(i, j + 1), p(i + 1, j + 1), p(i + 1, j), p(i + 1, j - 1), p(i, j - 1)];
}

function feldFlaechen(v: Roehre, i: number, j: number): Set<string> {
  const p = v.ringPunkt;
  const f = (a: number, b: number) => [p(a, b), p(a, b + 1), p(a + 1, b + 1), p(a + 1, b)].sort((x, y) => x - y).join(',');
  return new Set([f(i - 1, j - 1), f(i - 1, j), f(i, j - 1), f(i, j)]);
}

/** Teile als Ausstülpungen an den Rumpf-Käfig setzen (rechts wie angegeben, links gespiegelt). */
function teileAnsetzen(v: Roehre, kaefigV: Kaefig, zieleV: Float64Array, hoeheV: Float64Array, infos: readonly TeilInfo[]): { kaefig: Kaefig; ziele: Float64Array; hoehe: Float64Array; haut: Uint8Array } {
  const { N } = v;
  const n0 = kaefigV.n;
  const flaechen = alleFlaechen(kaefigV).map((f) => [...f]);
  const schluessel = (f: readonly number[]) => [...f].sort((x, y) => x - y).join(',');
  type Seite = { info: TeilInfo; ring: number; j: number; spiegel: boolean };
  const alle: Seite[] = [];
  for (const info of infos) {
    alle.push({ info, ring: info.ansatz.ring, j: info.ansatz.j, spiegel: false });
    alle.push({ info, ring: info.ansatz.ring, j: N - info.ansatz.j, spiegel: true });
  }
  const entfernen = new Set<string>();
  for (const a of alle) for (const k of feldFlaechen(v, a.ring, a.j)) entfernen.add(k);
  const koerper = flaechen.filter((f) => !entfernen.has(schluessel(f)));
  const original = new Map<string, number[]>();
  for (const f of flaechen) if (entfernen.has(schluessel(f))) original.set(schluessel(f), f);
  let naechster = n0;
  const ziel: { idx: number; p: V3 }[] = [];
  const neueFlaechen: number[][] = [];
  const P = (idx: number): V3 => [zieleV[3 * idx]!, zieleV[3 * idx + 1]!, zieleV[3 * idx + 2]!];
  for (const a of alle) {
    const s = a.spiegel ? -1 : 1;
    const linie: V3[] = a.info.linie.map((q) => [q[0], q[1], s * q[2]]);
    const rand = feldRand(v, a.ring, a.j);
    const mitte = v.ringPunkt(a.ring, a.j);
    const basis = P(mitte);
    // Achse: vom Ansatzpunkt auf dem Rumpf entlang der Mittellinie (die erste Stelle der Linie liegt am Rumpfrand)
    const pfad: V3[] = [basis, ...linie.slice(1)];
    const R = pfad.length;
    // Rahmen je Ring: Tangente, waagerechte Quere u1, senkrecht u2
    const rahmen = pfad.map((_, k) => {
      const a0 = pfad[Math.max(0, k - 1)]!;
      const b0 = pfad[Math.min(R - 1, k + 1)]!;
      const tg: V3 = [b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]];
      const tl = Math.hypot(...tg) || 1;
      const t3: V3 = [tg[0] / tl, tg[1] / tl, tg[2] / tl];
      // u2 = senkrecht ohne Tangentenanteil, u1 = u2 × t
      const up: V3 = [-t3[1] * t3[0], 1 - t3[1] * t3[1], -t3[1] * t3[2]];
      const ul = Math.hypot(...up) || 1;
      const u2: V3 = [up[0] / ul, up[1] / ul, up[2] / ul];
      const u1: V3 = [u2[1] * t3[2] - u2[2] * t3[1], u2[2] * t3[0] - u2[0] * t3[2], u2[0] * t3[1] - u2[1] * t3[0]];
      return { t3, u1, u2 };
    });
    // Winkel der Randpunkte im Rahmen des ersten Rings
    const r0 = rahmen[0]!;
    const winkelRand = rand.map((idx) => {
      const q = P(idx);
      const d3: V3 = [q[0] - basis[0], q[1] - basis[1], q[2] - basis[2]];
      return Math.atan2(d3[0] * r0.u2[0] + d3[1] * r0.u2[1] + d3[2] * r0.u2[2], d3[0] * r0.u1[0] + d3[1] * r0.u1[1] + d3[2] * r0.u1[2]);
    });
    const umlauf = Math.sign(((winkelRand[1]! - winkelRand[0]! + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) || 1;
    let sx = 0;
    let sy = 0;
    for (let q = 0; q < 8; q++) {
      const d = winkelRand[q]! - (umlauf * q * Math.PI) / 4;
      sx += Math.cos(d);
      sy += Math.sin(d);
    }
    const versatz = Math.atan2(sy, sx);
    const ringe: number[][] = [];
    for (let r = 1; r < R; r++) {
      const ring: number[] = [];
      const sch = Math.min(1, r / SCHULTER);
      const c = pfad[r]!;
      const fr = rahmen[r]!;
      const w = a.info.breite[r]!;
      const d = a.info.dicke[r]!;
      for (let q = 0; q < 8; q++) {
        const idx = naechster++;
        ring.push(idx);
        const th = versatz + (umlauf * q * Math.PI) / 4;
        const ell: V3 = [c[0] + w * Math.cos(th) * fr.u1[0] + d * Math.sin(th) * fr.u2[0], c[1] + w * Math.cos(th) * fr.u1[1] + d * Math.sin(th) * fr.u2[1], c[2] + w * Math.cos(th) * fr.u1[2] + d * Math.sin(th) * fr.u2[2]];
        const rp = P(rand[q]!);
        const versch: V3 = [rp[0] + c[0] - basis[0], rp[1] + c[1] - basis[1], rp[2] + c[2] - basis[2]];
        ziel.push({ idx, p: [versch[0] + (ell[0] - versch[0]) * sch, versch[1] + (ell[1] - versch[1]) * sch, versch[2] + (ell[2] - versch[2]) * sch] });
      }
      ringe.push(ring);
    }
    // Spitze = Feldmittelpunkt, etwas hinter dem letzten Ring
    const ende = pfad[R - 1]!;
    const vor = pfad[R - 2]!;
    const dl = Math.hypot(ende[0] - vor[0], ende[1] - vor[1], ende[2] - vor[2]) || 1;
    ziel.push({ idx: mitte, p: [ende[0] + ((ende[0] - vor[0]) / dl) * 0.5 * a.info.dicke[R - 1]!, ende[1], ende[2] + ((ende[2] - vor[2]) / dl) * 0.5 * a.info.dicke[R - 1]!] });
    // Umlaufsinn aus der Körperfläche am Rand
    let richtung = 1;
    for (const f of koerper) {
      const i0 = f.indexOf(rand[0]!);
      const i1 = f.indexOf(rand[1]!);
      if (i0 < 0 || i1 < 0) continue;
      richtung = (i0 + 1) % f.length === i1 ? -1 : 1;
      break;
    }
    const Rg = (r: number, q: number) => (r === 0 ? rand[q % 8]! : ringe[r - 1]![q % 8]!);
    for (let r = 0; r + 1 < R; r++)
      for (let q = 0; q < 8; q++) {
        const f = [Rg(r, q), Rg(r, q + 1), Rg(r + 1, q + 1), Rg(r + 1, q)];
        neueFlaechen.push(richtung > 0 ? f : f.reverse());
      }
    const ersatz = new Map<number, number>();
    rand.forEach((idx, q) => ersatz.set(idx, ringe[R - 2]![q]!));
    for (const k of feldFlaechen(v, a.ring, a.j)) neueFlaechen.push(original.get(k)!.map((idx) => ersatz.get(idx) ?? idx));
  }
  const n = naechster;
  const ziele = new Float64Array(3 * n);
  ziele.set(zieleV);
  const hoehe = new Float64Array(n);
  hoehe.set(hoeheV);
  for (const z of ziel) {
    ziele[3 * z.idx] = z.p[0];
    ziele[3 * z.idx + 1] = z.p[1];
    ziele[3 * z.idx + 2] = z.p[2];
  }
  const haut = new Uint8Array(n);
  for (let i = 0; i < n0; i++) haut[i] = 1;
  for (const a of alle) haut[v.ringPunkt(a.ring, a.j)] = 0;
  const kaefig = kaefigAusFlaechen(ziele, [...koerper, ...neueFlaechen]);
  const pr = pruefeKaefig(kaefig);
  if (!pr.ok) throw new Error(`Teile: Käfig nicht konsistent: ${pr.fehler.slice(0, 3).join('; ')}`);
  for (let e = 0; e < kaefigV.nE; e++) {
    const sch = kaefigV.eSchaerfe[e]!;
    if (sch <= 0) continue;
    const ke = kanteZwischen(kaefig, kaefigV.eA[e]!, kaefigV.eB[e]!);
    if (ke >= 0) kaefig.eSchaerfe[ke] = sch;
  }
  for (let i = 0; i < n0; i++) if (kaefigV.vSchaerfe[i]! > 0) kaefig.vSchaerfe[i] = kaefigV.vSchaerfe[i]!;
  return { kaefig, ziele, hoehe, haut };
}

/**
 * Angestecktes Teil (wie die angesteckten Beine aus Beweis 3): eigene Röhre aus 8 Punkten je Ring entlang der
 * Mittellinie, Ringe als flache Ellipsen (Breite aus dem Top, Dicke aus der Front oder halb so dick), vorn um die
 * Ansatzbreite verdeckt in den Rumpf verlängert, Kappen an beiden Enden; links gespiegelt (Umlauf umgekehrt, damit die
 * Flächen nach außen zeigen). Der Käfig wird durch die Ziele gelöst.
 */
function teilGesteckt(info: TeilInfo, zieleRumpf: Float64Array, ansatz: number, spiegel: boolean, stufen: number): GestecktesTeil {
  const s = spiegel ? -1 : 1;
  const basis: V3 = [zieleRumpf[3 * ansatz]!, zieleRumpf[3 * ansatz + 1]!, s * zieleRumpf[3 * ansatz + 2]!];
  const linie: V3[] = info.linie.map((q) => [q[0], q[1], s * q[2]]);
  // vorn verdeckt in den Rumpf: vom Ansatz gegen die Richtung der Linie um die doppelte Ansatzbreite
  const r0: V3 = [linie[1]![0] - linie[0]![0], linie[1]![1] - linie[0]![1], linie[1]![2] - linie[0]![2]];
  const rl = Math.hypot(...r0) || 1;
  const innen = 2 * Math.max(info.breite[0]!, info.breite[1]!);
  const start: V3 = [basis[0] - (r0[0] / rl) * innen, basis[1], basis[2] - (r0[2] / rl) * innen];
  const pfad: V3[] = [start, basis, ...linie.slice(1)];
  const breite = [info.breite[1]!, info.breite[1]!, ...info.breite.slice(1)];
  const dicke = [info.dicke[1]!, info.dicke[1]!, ...info.dicke.slice(1)];
  const R = pfad.length;
  const vorlage = roehre(R, 8);
  const ziele = new Float64Array(3 * vorlage.kaefig.n);
  const setze = (idx: number, p: V3) => {
    ziele[3 * idx] = p[0];
    ziele[3 * idx + 1] = p[1];
    ziele[3 * idx + 2] = p[2];
  };
  for (let r = 0; r < R; r++) {
    const a0 = pfad[Math.max(0, r - 1)]!;
    const b0 = pfad[Math.min(R - 1, r + 1)]!;
    const tg: V3 = [b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]];
    const tl = Math.hypot(...tg) || 1;
    const t3: V3 = [tg[0] / tl, tg[1] / tl, tg[2] / tl];
    const up: V3 = [-t3[1] * t3[0], 1 - t3[1] * t3[1], -t3[1] * t3[2]];
    const ul = Math.hypot(...up) || 1;
    const u2: V3 = [up[0] / ul, up[1] / ul, up[2] / ul];
    const u1: V3 = [u2[1] * t3[2] - u2[2] * t3[1], u2[2] * t3[0] - u2[0] * t3[2], u2[0] * t3[1] - u2[1] * t3[0]];
    const c = pfad[r]!;
    const w = breite[r]! * (r === R - 1 ? 0.7 : 1);
    const d = dicke[r]! * (r === R - 1 ? 0.7 : 1);
    for (let j = 0; j < 8; j++) {
      const th = (s * 2 * Math.PI * j) / 8;
      setze(vorlage.ringPunkt(r, j), [c[0] + w * Math.cos(th) * u1[0] + d * Math.sin(th) * u2[0], c[1] + w * Math.cos(th) * u1[1] + d * Math.sin(th) * u2[1], c[2] + w * Math.cos(th) * u1[2] + d * Math.sin(th) * u2[2]]);
    }
  }
  const ende = pfad[R - 1]!;
  const vor = pfad[R - 2]!;
  const el = Math.hypot(ende[0] - vor[0], ende[1] - vor[1], ende[2] - vor[2]) || 1;
  setze(vorlage.kappe('vorn', 1, 1), [start[0] - (r0[0] / rl) * 0.3 * innen, start[1], start[2] - (r0[2] / rl) * 0.3 * innen]);
  setze(vorlage.kappe('hinten', 1, 1), [ende[0] + ((ende[0] - vor[0]) / el) * 0.5 * dicke[R - 1]!, ende[1], ende[2] + ((ende[2] - vor[2]) / el) * 0.5 * dicke[R - 1]!]);
  const u = unterteilung(vorlage.kaefig, stufen);
  const loeser = grenzLoeser(u.grenze, vorlage.kaefig.n);
  const xyz = kaefigDurchZiele(loeser, ziele);
  const kaefig = { ...vorlage.kaefig, xyz };
  return { kaefig, fein: anwenden3(u.grenze, xyz), unterteilung: u };
}
