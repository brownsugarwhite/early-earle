// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5 „Mittelebenen-Baum“: Bau eines Körpers aus Streifen der Seitenfläche
// (`ebene.ts`) mit der Topologie aus `kaefig/baumKaefig.ts`.
//
// Zielform (Form zuerst): je Streifen Querschnitt und Maßstab wie in der Röhre (`querschnitteFuer`, Sichthülle von Top und
// Front, S3-Berühren über alle Ringe aller Streifen gemeinsam). Der erste Ring eines angesetzten Kinds ist ein runder Ring auf
// der Sehne (Breite aus Top und Front dort); er ist zugleich das Ende der Elternsprossen darunter, deren Querschnitt im
// oberen Teil weich auf diesen Punkt übergeht (Hohlkehle). Gelöst wird wie in S2: Grenzfläche nahe den Zielen, glatt
// relativ zur Zielform, die feine Naht auf der ganzen schwarzen Linie, Breitenpunkte je Ring. DOM-frei.

import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { type BaumKaefig, type StreifenTopo, baumKaefig } from '../../kaefig/baumKaefig';
import type { Kaefig } from '../../kaefig/halbkanten';
import { type Bedingung, ausgleichsLoeser, kaefigAusgleich } from '../../loeser/grenzflaeche';
import { type Unterteilung, unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { ABLEIT_STANDARD, type AbleitOptionen, type Breite, GLATTE_HAUT, type Querschnitt, type Sprosse, ausgleichsZiele, breiteSoll, glaettemassFuer, kreisQuerschnitt, nahtAnteile, nahtPfad, quadratRing, querschnitteFuer, umparametrisieren, umrissDicht } from '../ableiten';
import { type Breiten, silhouettenBreite } from '../breite';
import { huellenBreite } from '../fuelle';
import type { Zone } from '../pruefen/zonen';
import { frontBeruehren } from '../rand';
import { feinKette } from '../reifen';
import { type Ebene, type StreifenRinge, ebene, ringeAuslegen } from './ebene';
import type { Teilbaum } from './teilbaum';

/** Topologie der Streifen aus Auslegung und Ringen. */
export function streifenTopologie(e: Ebene, ringe: readonly StreifenRinge[]): StreifenTopo[] {
  return e.streifen.map((st, s) => {
    const R = ringe[s]!.sprossen.length;
    if (!st.ansatz) return { R, N: st.N, anfang: { art: 'kappe' }, ende: { art: 'kappe' } };
    const an = st.ansatz;
    const k = ringe[an.eltern]!.kinder.find((x) => x.streifen === s);
    if (!k) throw new Error(`streifenTopologie: Kind ${s} ohne Ringe im Elternstreifen`);
    return { R, N: st.N, anfang: { art: 'seitlich', eltern: an.eltern, seite: an.seite, ring: k.ring }, ende: { art: 'kappe' } };
  });
}

export type BaumOptionen = AbleitOptionen & {
  /** Anteil der Elternsprosse unter einer Sehne, über den ihr Querschnitt auf den Kindring übergeht */
  ansatzUebergang: number;
  /**
   * Querschnitt der Streifen mit Kindern: `kreis` (rund, Breite aus Top/Front, Fülle über S3) oder `lappen` (Front-Lappen wie
   * in der Röhre). Der Lappen endet unter einem Kind an der Sehne abseits der Achse und bekäme eine flache Deckkante (drei
   * Stützstellen auf einer Höhe, Falten bis 167° an der Vase).
   */
  elternQuerschnitt: 'kreis' | 'lappen';
};

export const BAUM_STANDARD: BaumOptionen = { ...ABLEIT_STANDARD, ...GLATTE_HAUT, fuelle: 'mittel', ansatzUebergang: 0.35, elternQuerschnitt: 'kreis' };

export type BaumAbleitung = {
  opt: BaumOptionen;
  ebene: Ebene;
  ringe: StreifenRinge[];
  bk: BaumKaefig;
  /** Käfig mit gelösten Lagen */
  kaefig: Kaefig;
  unterteilung: Unterteilung;
  fein: Float64Array;
  ziele: Float64Array;
  breiten: Breiten;
  /** Zone je Käfigfläche (Faltenmaß): Kappe, Ansatz, frei */
  zone: (f: number) => Zone | undefined;
  /** Querschnitte je Streifen und Ring (nach dem Berühren) */
  querschnitte: Querschnitt[][];
  zeiten: { ebene: number; ringe: number; ziele: number; matrix: number; loeser: number; gesamt: number };
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Maßstab eines Rings wie in der Röhre (Sichthülle: Top bei x, Front an der breitesten Stelle; rund ohne Zeichnung). */
function masstab(sp: Sprosse, q: Querschnitt, breiten: Breiten, letzteW: number): number {
  const rund = 0.5 * Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y);
  let W = breiten.top((sp.o.x + sp.u.x) / 2);
  if (!(W > 0)) W = Math.min(rund, breiten.topMax);
  let wMax = 0;
  for (let j = 1; j + 1 < q.v.length; j++) wMax = Math.max(wMax, q.w[j]!);
  let fBest = 0;
  for (let j = 1; j + 1 < q.v.length; j++) {
    const wj = q.w[j]!;
    if (wj < wMax - 1e-6) continue;
    const y = sp.u.y + (sp.o.y - sp.u.y) * q.v[j]!;
    const fb = breiten.front(y);
    if (fb > 0) fBest = Math.max(fBest, fb / wj);
  }
  if (fBest > 0) W = Math.min(W, fBest);
  else W = Math.min(W, rund);
  if (!(W > 1e-6)) W = letzteW || 0.01 * breiten.topMax;
  return W;
}

/** Punkt j eines Rings (x, y auf der Sprosse, z = w · W, nie breiter als die Front auf seiner Höhe) und seine Höhe v. */
function punkt(sp: Sprosse, q: Querschnitt, W: number, j: number, breiten: Breiten): [number, number, number, number] {
  const hv = q.v[j]!;
  const x = sp.u.x + (sp.o.x - sp.u.x) * hv;
  const y = sp.u.y + (sp.o.y - sp.u.y) * hv;
  let z = q.w[j]! * W;
  const fb = breiten.front(y);
  if (fb > 0 && z > fb) z = fb;
  return [x, y, z, hv];
}

/** Körper aus dem Mittelebenen-Baum bauen. */
export function baumAbleiten(dok: Dokument, optionen: Partial<BaumOptionen> = {}, baum?: Teilbaum): BaumAbleitung {
  const opt: BaumOptionen = { ...BAUM_STANDARD, ...optionen };
  const t0 = jetzt();
  const breiten = silhouettenBreite(dok);
  const e = ebene(dok, baum, breiten);
  const t1 = jetzt();
  const ringe = ringeAuslegen(e, breiten);
  const topo = streifenTopologie(e, ringe);
  const t2 = jetzt();
  const bk0 = baumKaefig(topo);
  const n = bk0.kaefig.n;
  const ziele = new Float64Array(3 * n);
  const gesetzt = new Uint8Array(n);
  const setze = (p: number, x: number, y: number, z: number) => {
    ziele[3 * p] = x;
    ziele[3 * p + 1] = y;
    ziele[3 * p + 2] = z;
    gesetzt[p] = 1;
  };
  // Querschnitte je Streifen; der erste Ring eines Kinds ist rund (seine Punkte liegen genau auf den Sehnenpunkten)
  const qs: Querschnitt[][] = e.streifen.map((st, s) => {
    const rund = st.kinder.length > 0 && opt.elternQuerschnitt === 'kreis';
    const q = querschnitteFuer(ringe[s]!.sprossen, dok, breiten, st.N, rund ? { ...opt, querschnitt: false } : opt);
    if (st.ansatz) q[0] = kreisQuerschnitt(st.N);
    return q;
  });
  const Ws: number[][] = e.streifen.map((_, s) => {
    let letzte = 0;
    return ringe[s]!.sprossen.map((sp, i) => (letzte = masstab(sp, qs[s]![i]!, breiten, letzte)));
  });
  // S3 „Umrisse berühren“ über alle Ringe aller Streifen gemeinsam (je Höhe der Ring, der dort am weitesten reicht)
  const beruehrt = new Set<string>();
  if (opt.fuelle) {
    const alle: { s: number; i: number }[] = [];
    e.streifen.forEach((_, s) => ringe[s]!.sprossen.forEach((__, i) => alle.push({ s, i })));
    const rand = frontBeruehren(
      alle.map(({ s, i }) => ringe[s]!.sprossen[i]!),
      alle.map(({ s, i }) => qs[s]![i]!),
      alle.map(({ s, i }) => Ws[s]![i]!),
      breiten,
      opt.fuelle,
      huellenBreite(dok, breiten),
    );
    alle.forEach(({ s, i }, k) => {
      if (!(i === 0 && e.streifen[s]!.ansatz)) qs[s]![i] = rand.vorlagen[k] as Querschnitt;
    });
    for (const p of rand.punkte) beruehrt.add(`${alle[p.i]!.s}/${alle[p.i]!.i}/${p.j}`);
  }
  // 1. Ringe und Spitzenkappen je Streifen
  e.streifen.forEach((st, s) => {
    const N = st.N;
    const c = N / 4;
    const R = ringe[s]!.sprossen.length;
    for (let i = 0; i < R; i++) {
      if (i === 0 && st.ansatz) continue;
      const sp = ringe[s]!.sprossen[i]!;
      const q = qs[s]![i]!;
      const W = Ws[s]![i]!;
      for (let j = 0; j <= N / 2; j++) {
        const [x, y, z] = punkt(sp, q, W, j, breiten);
        const naht = j === 0 || j === N / 2;
        setze(bk0.ring(s, i, j), x, y, naht ? 0 : z);
        if (naht) {
          const l = bk0.links(bk0.ring(s, i, j));
          if (l !== bk0.ring(s, i, j)) setze(l, x, y, 0);
        } else setze(bk0.ring(s, i, N - j), x, y, -z);
      }
    }
    for (const wo of ['anfang', 'ende'] as const) {
      if ((wo === 'anfang' ? topo[s]!.anfang : topo[s]!.ende).art !== 'kappe') continue;
      const spitze = wo === 'anfang' ? ringe[s]!.spitzen.anfang! : ringe[s]!.spitzen.ende;
      const q0 = qs[s]![wo === 'anfang' ? 0 : R - 1]!;
      const stK = wo === 'anfang' ? ringe[s]!.kappen.anfang : ringe[s]!.kappen.ende;
      setze(bk0.kappe(s, wo, c / 2, c / 2), spitze.x, spitze.y, 0);
      for (let r = 1; r < c / 2; r++) {
        const q = umparametrisieren(q0, 4 * r);
        const sp = stK[r - 1]!;
        const W = masstab(sp, q, breiten, Ws[s]![wo === 'anfang' ? 0 : R - 1]!);
        for (let m = 0; m <= 4 * r; m++) {
          const [a, b] = quadratRing(c, r, m);
          const naht = m === 0 || m === 4 * r;
          const [x, y, z] = punkt(sp, q, W, m, breiten);
          setze(bk0.kappe(s, wo, a, b), x, y, naht ? 0 : z);
          if (!naht) setze(bk0.kappe(s, wo, c - a, b), x, y, -z);
        }
      }
    }
  });
  // 2. erster Ring der Kinder (runder Ring auf der Sehne) — überschreibt die Sprossenenden des Elternstreifens
  e.streifen.forEach((st, s) => {
    if (!st.ansatz) return;
    const N = st.N;
    const sp = ringe[s]!.sprossen[0]!;
    const q = qs[s]![0]!;
    const W = Ws[s]![0]!;
    for (let j = 0; j <= N / 2; j++) {
      const [x, y, z] = punkt(sp, q, W, j, breiten);
      const naht = j === 0 || j === N / 2;
      setze(bk0.ring(s, 0, j), x, y, naht ? 0 : z);
      if (!naht) setze(bk0.ring(s, 0, N - j), x, y, -z);
    }
  });
  // 3. Elternsprossen unter einer Sehne: im oberen Teil (Abstand d < U vom Sehnenende, in Anteilen der Sprosse) geht der
  //    eigene Querschnitt weich in den Punkt des Kindrings über — Hermite von (Wert, Steigung) bei d = U zu (Kindbreite,
  //    Steigung 0: die Fläche läuft senkrecht ins Kind). Addiert statt übergeblendet gab das Schultern mit Flügeln (Vase).
  //    Danach die Punkte der Sprosse nach Bogenlänge neu verteilt: Der runde Querschnitt legt sie oben dicht (für eine
  //    geschlossene Kuppe); offen unter dem Kind lagen die ersten drei fast auf einem Punkt (Vierecke 9 × 78 px).
  const U = opt.ansatzUebergang;
  e.streifen.forEach((st, s) => {
    const h = st.N / 2;
    for (const k of ringe[s]!.kinder) {
      const kind = e.streifen[k.streifen]!;
      const H = kind.N / 2;
      const jEnde = k.seite === 'a' ? 0 : h;
      for (let r = 0; r <= H; r++) {
        const i = k.ring + r;
        const sp = ringe[s]!.sprossen[i]!;
        const pEnde = bk0.ring(s, i, jEnde);
        const zKind = Math.abs(ziele[3 * pEnde + 2]!);
        const q = qs[s]![i]!;
        // Profil (d, z) der rechten Hälfte nach Pass 1, d aufsteigend (d = 0 am Sehnenende, 1 an der Naht gegenüber)
        const prof: { d: number; z: number }[] = [];
        for (let j = 0; j <= h; j++) prof.push({ d: k.seite === 'a' ? 1 - q.v[j]! : q.v[j]!, z: j === jEnde ? zKind : j === 0 || j === h ? 0 : ziele[3 * bk0.ring(s, i, j) + 2]! });
        prof.sort((x, y) => x.d - y.d);
        const zBei = (d: number): number => {
          for (let t = 0; t + 1 < prof.length; t++) {
            const a0 = prof[t]!;
            const a1 = prof[t + 1]!;
            if (d >= a0.d && d <= a1.d) return a1.d > a0.d ? a0.z + ((a1.z - a0.z) * (d - a0.d)) / (a1.d - a0.d) : a0.z;
          }
          return d <= prof[0]!.d ? prof[0]!.z : prof[prof.length - 1]!.z;
        };
        const eps = 1e-3;
        const zU = zBei(U);
        const mU = (zBei(Math.min(1, U + eps)) - zBei(Math.max(0, U - eps))) / (Math.min(1, U + eps) - Math.max(0, U - eps));
        const zProfil = (d: number): number => {
          if (d >= U) return zBei(d);
          const t = 1 - d / U;
          const h00 = 2 * t * t * t - 3 * t * t + 1;
          const h10 = t * t * t - 2 * t * t + t;
          const h01 = -2 * t * t * t + 3 * t * t;
          return Math.max(0, h00 * zU + h10 * (-mU * U) + h01 * zKind);
        };
        // dicht abtasten, nach Bogenlänge (Sprossenlänge × d, z) neu verteilen
        const L = Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y);
        const M = 96;
        const cum = [0];
        let zAlt = zProfil(0);
        for (let m = 1; m <= M; m++) {
          const zn = zProfil(m / M);
          cum.push(cum[m - 1]! + Math.hypot(L / M, zn - zAlt));
          zAlt = zn;
        }
        const vNeu: number[] = [];
        const wNeu: number[] = [];
        const W = Ws[s]![i]! || 1;
        for (let j = 0; j <= h; j++) {
          // Index ab dem Sehnenende
          const jj = k.seite === 'a' ? j : h - j;
          const ziel = (cum[M]! * jj) / h;
          let m = 0;
          while (m < M - 1 && cum[m + 1]! < ziel) m++;
          const dd = cum[m + 1]! - cum[m]!;
          const d = (m + (dd > 0 ? (ziel - cum[m]!) / dd : 0)) / M;
          const v = k.seite === 'a' ? 1 - d : d;
          const z = j === jEnde ? zKind : j === 0 || j === h ? 0 : zProfil(d);
          vNeu.push(v);
          wNeu.push(z / W);
          if (j === jEnde || j === 0 || j === h) continue;
          const x = sp.u.x + (sp.o.x - sp.u.x) * v;
          const y = sp.u.y + (sp.o.y - sp.u.y) * v;
          setze(bk0.ring(s, i, j), x, y, z);
          setze(bk0.ring(s, i, st.N - j), x, y, -z);
        }
        qs[s]![i] = { v: vNeu, w: wNeu, haerte: [], knoten: [] };
      }
    }
  });
  for (let p = 0; p < n; p++) if (!gesetzt[p]) throw new Error(`baumAbleiten: Punkt ${p} ohne Ziel`);
  // Topologie mit Orientierung nach den Zielen
  const bk = baumKaefig(topo, (p) => [ziele[3 * p]!, ziele[3 * p + 1]!, ziele[3 * p + 2]!]);
  const k = bk.kaefig;
  const t3 = jetzt();

  // Lösen
  const u = unterteilung(k, opt.stufen);
  const t4 = jetzt();
  let fein = anwenden3(u.grenze, ziele);
  const nF = fein.length / 3;
  const feinIdx: number[] = [];
  for (let i = 0; i < nF; i++) if (Math.abs(fein[3 * i + 2]!) < 1e-7) feinIdx.push(i);
  const umriss = umrissDicht(dok);
  const letzte = u.stufen[u.stufen.length - 1]!.kaefig;
  const start = bk.kappe(0, 'anfang', 2, 2);
  const pfad = nahtPfad(letzte, feinIdx, start, k.n);
  const nahtFein = Uint32Array.from(pfad.geordnet);
  const anteil = nahtAnteile(pfad.geordnet, k.n, ziele, umriss);
  const breite = baumBreite(e, ringe, qs, bk, u, ziele, breiten, beruehrt, opt);
  const bedingungen: Bedingung[] = [];
  for (let i = 0; i < k.n; i++) bedingungen.push({ zeile: i, gewicht: 1 });
  for (let q = 0; q < nahtFein.length; q++) bedingungen.push({ zeile: nahtFein[q]!, gewicht: opt.nahtGewicht });
  if (breite) for (let q = 0; q < breite.fein.length; q++) bedingungen.push({ zeile: breite.fein[q]!, gewicht: opt.breiteGewicht * (breite.gewicht?.[q] ?? 1) });
  const loeser = ausgleichsLoeser(u.grenze, k.n, bedingungen, undefined, glaettemassFuer(u, k, opt, bk.kappeAb));
  let xyz = kaefigAusgleich(loeser, ausgleichsZiele(k.n, ziele, umriss, nahtFein, anteil, breite, breiten, fein));
  fein = anwenden3(u.grenze, xyz);
  for (let d = 0; breite && d < 2; d++) {
    xyz = kaefigAusgleich(loeser, ausgleichsZiele(k.n, ziele, umriss, nahtFein, anteil, breite, breiten, fein));
    fein = anwenden3(u.grenze, xyz);
  }
  const t5 = jetzt();
  const zone = baumZonen(e, ringe, bk);
  return { opt, ebene: e, ringe, bk, kaefig: { ...k, xyz }, unterteilung: u, fein, ziele, breiten, zone, querschnitte: qs, zeiten: { ebene: t1 - t0, ringe: t2 - t1, ziele: t3 - t2, matrix: t4 - t3, loeser: t5 - t4, gesamt: t5 - t0 } };
}

/**
 * Breitenpunkte aller Streifen (wie `breitenSchleife`): je Ring die breitesten Punkte der Vorlage (und die Berührpunkte aus
 * S3), dazu die feinen Punkte längs der Kanten zwischen zwei Breitenpunkten derselben Schleife. Nicht im Übergang unter
 * einer Sehne (dort gibt der Kindring die Breite vor).
 */
function baumBreite(e: Ebene, ringe: readonly StreifenRinge[], qs: readonly Querschnitt[][], bk: BaumKaefig, u: Unterteilung, ziele: Float64Array, breiten: Breiten, beruehrt: ReadonlySet<string>, opt: BaumOptionen): Breite | null {
  if (!(opt.breiteGewicht > 0)) return null;
  const fein: number[] = [];
  const vorzeichen: number[] = [];
  const faktor: number[] = [];
  const gewicht: number[] = [];
  e.streifen.forEach((st, s) => {
    const N = st.N;
    const R = ringe[s]!.sprossen.length;
    // Übergang unter Sehnen: Ringe und Seite
    const uebergang = new Map<number, 'a' | 'b'>();
    for (const k of ringe[s]!.kinder) for (let r = 0; r <= e.streifen[k.streifen]!.N / 2; r++) uebergang.set(k.ring + r, k.seite);
    const breit: Float64Array[] = [];
    for (let i = 0; i < R; i++) {
      const zeile = new Float64Array(N);
      breit.push(zeile);
      if (i === 0 && st.ansatz) continue;
      const q = qs[s]![i]!;
      let wBest = 0;
      for (let j = 1; j < N / 2; j++) wBest = Math.max(wBest, q.w[j] ?? 0);
      if (!(wBest > 0)) continue;
      const seite = uebergang.get(i);
      for (let j = 1; j < N / 2; j++) {
        if (seite) {
          const d = seite === 'a' ? 1 - q.v[j]! : q.v[j]!;
          if (d < opt.ansatzUebergang) continue;
        }
        const p = bk.ring(s, i, j);
        const beruehrPunkt = beruehrt.has(`${s}/${i}/${j}`);
        let f = (q.w[j] ?? 0) / wBest;
        if (beruehrPunkt) {
          const B = breiteSoll(breiten, ziele[3 * p]!, ziele[3 * p + 1]!, ziele[3 * p + 2]!);
          f = B > 1e-9 ? Math.min(1, Math.abs(ziele[3 * p + 2]!) / B) : 0;
        }
        if (f < 0.95 && !(beruehrPunkt && f > 0)) continue;
        if (!(breiten.top(ziele[3 * p]!) > 0) || !(breiten.front(ziele[3 * p + 1]!) > 0)) continue;
        zeile[j] = beruehrPunkt ? 0 : f;
        fein.push(p, bk.ring(s, i, N - j));
        vorzeichen.push(1, -1);
        faktor.push(f, f);
        const g = beruehrPunkt ? (opt.randGewicht ?? 0.25) : 1;
        gewicht.push(g, g);
      }
    }
    for (let i = 0; i + 1 < R; i++) {
      for (let j = 1; j < N / 2; j++) {
        const f0 = breit[i]![j]!;
        const f1 = breit[i + 1]![j]!;
        if (!(f0 > 0) || !(f1 > 0)) continue;
        for (const [jj, sg] of [
          [j, 1],
          [N - j, -1],
        ] as const) {
          const kette = feinKette(u, bk.kaefig, bk.ring(s, i, jj), bk.ring(s, i + 1, jj));
          for (let t = 1; t + 1 < kette.length; t++) {
            fein.push(kette[t]!);
            vorzeichen.push(sg);
            faktor.push(f0 + ((f1 - f0) * t) / (kette.length - 1));
            gewicht.push(1);
          }
        }
      }
    }
  });
  return fein.length ? { fein: Uint32Array.from(fein), vorzeichen: Int8Array.from(vorzeichen), faktor: Float64Array.from(faktor), ...(gewicht.some((g) => g !== 1) ? { gewicht: Float64Array.from(gewicht) } : {}) } : null;
}

/** Zonen je Käfigfläche: Spitzenkappen, Ansatz (Elternringe um die Sehne auf ihrer Seite, die ersten zwei Kindringe), sonst frei. */
function baumZonen(e: Ebene, ringe: readonly StreifenRinge[], bk: BaumKaefig): (f: number) => Zone | undefined {
  const k = bk.kaefig;
  const ansatz = new Uint8Array(k.nF);
  // Ringflächen je Streifen liegen in der Reihenfolge (i, j)
  let f = 0;
  e.streifen.forEach((st, s) => {
    const N = st.N;
    const R = ringe[s]!.sprossen.length;
    const bereiche = ringe[s]!.kinder.map((kd) => ({ von: kd.ring - 1, bis: kd.ring + e.streifen[kd.streifen]!.N / 2 + 1, seite: kd.seite }));
    for (let i = 0; i + 1 < R; i++) {
      for (let j = 0; j < N; j++) {
        if (st.ansatz && i < 2) ansatz[f] = 1;
        for (const b of bereiche) {
          if (i < b.von || i >= b.bis) continue;
          const oben = j < N / 4 || j >= (3 * N) / 4;
          if ((b.seite === 'a') === oben) ansatz[f] = 1;
        }
        f++;
      }
    }
  });
  return (fl: number) => (bk.flaecheArt[fl] === 'kappe' ? 'kappe' : ansatz[fl] ? 'ansatz' : 'frei');
}

/**
 * Ausnahme für das Δ-Maß in S5: Bereiche seitlicher Paare (S4) in Front und Top (beide Seiten, 3 px Rand) — Flügel, Beine,
 * Brustflossen baut erst S6.
 */
export function paarAusnahme(b: Teilbaum, rand = 3 / 461): (a: 'seite' | 'front' | 'top', p: V2) => boolean {
  const flaechen: { blatt: 'front' | 'top'; poly: V2[] }[] = [];
  for (const t of b.teile) {
    if (t.art !== 'paar') continue;
    for (const blatt of ['front', 'top'] as const) {
      const e = t.erkannt[blatt];
      if (!e) continue;
      flaechen.push({ blatt, poly: e.umriss });
      flaechen.push({ blatt, poly: e.umriss.map((q) => (blatt === 'front' ? { x: -q.x, y: q.y } : { x: q.x, y: -q.y })) });
    }
  }
  const nah = (poly: readonly V2[], q: V2) => {
    let drin = false;
    let d = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const c = poly[j]!;
      if (a.y > q.y !== c.y > q.y && q.x < ((c.x - a.x) * (q.y - a.y)) / (c.y - a.y || 1e-12) + a.x) drin = !drin;
      const ab = { x: c.x - a.x, y: c.y - a.y };
      const f = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
      d = Math.min(d, Math.hypot(a.x + ab.x * f - q.x, a.y + ab.y * f - q.y));
    }
    return drin || d < rand;
  };
  return (a, p) => a !== 'seite' && flaechen.some((f) => f.blatt === a && nah(f.poly, p));
}

/** Punkte und Vierecke des feinen Netzes (für Maße und Bilder). */
export function baumFeinesNetz(b: BaumAbleitung): { punkte: [number, number, number][]; flaechen: number[][] } {
  const k = b.unterteilung.stufen[b.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: [number, number, number][] = [];
  for (let i = 0; i < b.fein.length / 3; i++) punkte.push([b.fein[3 * i]!, b.fein[3 * i + 1]!, b.fein[3 * i + 2]!]);
  const flaechen: number[][] = [];
  for (let f = 0; f < k.nF; f++) {
    const q: number[] = [];
    for (let h = k.fStart[f]!; h < k.fStart[f + 1]!; h++) q.push(k.fVerts[h]!);
    flaechen.push(q);
  }
  return { punkte, flaechen };
}

export type { V2 };
