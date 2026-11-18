// Plan „Liniennetz, Zielform, Käfig“ (17.10.), S7.1: Deskriptoren des Earle-Materials für den Baum-Körper (mit seitlichen
// Röhren). Wie `kern/deskriptoren.ts` für die Röhre: je Käfigpunkt Bogenlänge s längs der Wirbelsäule, Winkel θ um sie und
// Umfang, mit der Grenzmatrix auf das feine Netz abgebildet (der Winkel über cos/sin, damit die Naht nicht springt). Neu:
// - je Streifen eine eigene Wirbelsäule (die Ringmitten); ein Kind beginnt mit der Bogenlänge seines Eltern-Streifens an der
//   Stelle des Ansatzes, damit Muster längs des Körpers über den Ansatz weiterlaufen;
// - θ aus der Nummer des Punkts im Ring, stetig längs des Streifens: Mittelteile 2πj/N mit θ = 0 auf der Naht, die nach
//   oben und hinten zeigt (Rumpf: Rücken, Hals: Nacken), seitliche Röhren aus ihrem Ellipsenwinkel mit θ = 0 auf der
//   zweiten Halbachse (Flügel oben, Beine außen) — ein Bezug je Ring („oben“ geometrisch) sprang an steilen Hälsen;
// - Punkte, die kein Ring und keine Kappe trägt (Übergänge), nehmen die Werte ihres nächsten Nachbarn.
// Rachen, Maulabstand, Gesichtsmaske und Kanten gibt es auf dem Baum noch nicht (kein Maul, S7.1). DOM-frei.

import { anwenden1 } from '../../subdivision/matrix';
import { DESKRIPTOR_FLOATS } from '../deskriptoren';
import type { BaumAbleitung } from './baumBau';

type V3 = [number, number, number];

/** 16 Floats je feinem Punkt (Reihenfolge wie `deskriptoren`). */
export function baumDeskriptoren(b: BaumAbleitung): Float32Array {
  const bk = b.bk;
  const k = bk.kaefig;
  const n = k.n;
  const z = b.ziele;
  const P = (p: number): V3 => [z[3 * p]!, z[3 * p + 1]!, z[3 * p + 2]!];
  const abst = (a: V3, c: V3) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
  const kS = new Float64Array(n);
  const kC = new Float64Array(n);
  const kSi = new Float64Array(n);
  const kU = new Float64Array(n);
  const gesetzt = new Uint8Array(n);
  const setze = (p: number, s: number, th: number, U: number, fest = false) => {
    if (gesetzt[p] && !fest) return;
    kS[p] = s;
    kC[p] = Math.cos(th);
    kSi[p] = Math.sin(th);
    kU[p] = U;
    gesetzt[p] = 1;
  };
  // Bogenlänge je Streifen und Ring (für Kinder: Startwert am Ansatz)
  const sRing: number[][] = [];
  const seitlich = (s: number) => bk.streifen[s]!.anfang.art === 'fenster';
  bk.streifen.forEach((T, s) => {
    const R = T.R;
    const N = T.N;
    // Ringpunkte (alle vorhandenen) und Mitten
    const ringe: number[][] = [];
    for (let i = 0; i < R; i++) {
      const r: number[] = [];
      for (let j = 0; j < N; j++) if (bk.existiert(s, i, j)) r.push(bk.ring(s, i, j));
      ringe.push(r);
    }
    const mitten = ringe.map((r) => {
      const m: V3 = [0, 0, 0];
      for (const p of r) for (let d = 0; d < 3; d++) m[d]! += z[3 * p + d]! / Math.max(1, r.length);
      return m;
    });
    const umfang = ringe.map((r) => {
      let U = 0;
      for (let q = 0; q < r.length; q++) U += abst(P(r[q]!), P(r[(q + 1) % r.length]!));
      return U;
    });
    // Startwert: Kappe am Anfang → Abstand Spitze–erster Ring; Kind → Bogenlänge des Eltern-Streifens am Ansatz
    const a = T.anfang;
    let s0 = 0;
    if (a.art === 'kappe') {
      const c = N / 4;
      s0 = abst(P(bk.kappe(s, 'anfang', c / 2, c / 2)), mitten[0]!);
    } else if (a.art === 'kragen' || a.art === 'seitlich' || a.art === 'fenster') {
      const e = sRing[a.eltern];
      const mitteRing = a.art === 'fenster' ? a.ring + a.w / 2 : a.art === 'kragen' ? a.ring + (N / 2 - 2 * a.tiefe) / 2 : a.ring + N / 4;
      if (e?.length) {
        const i0 = Math.max(0, Math.min(e.length - 1, Math.floor(mitteRing)));
        const i1 = Math.min(e.length - 1, i0 + 1);
        s0 = e[i0]! + (e[i1]! - e[i0]!) * (mitteRing - i0);
      }
    } else if (a.art === 'fortsetzung') {
      const e = sRing[a.eltern];
      if (e?.length) s0 = a.ende === 'ende' ? e[e.length - 1]! : e[0]!;
    }
    const sr: number[] = [s0];
    for (let i = 1; i < R; i++) sr.push(sr[i - 1]! + abst(mitten[i - 1]!, mitten[i]!));
    sRing[s] = sr;
    // Winkel je Ringpunkt aus seiner Nummer: Mittelteile mit θ = 0 auf der Naht nach oben/hinten (Ausrichtung je Streifen),
    // seitliche Röhren aus dem Ellipsenwinkel (θ = 0 auf der zweiten Halbachse: Flügel oben, Beine außen)
    let dreh = 0;
    if (!seitlich(s)) {
      let w = 0;
      for (let i = 0; i < R; i++) {
        if (!bk.existiert(s, i, 0) || !bk.existiert(s, i, N / 2)) continue;
        const A = P(bk.ring(s, i, 0));
        const B = P(bk.ring(s, i, N / 2));
        w += (A[1] - B[1]) + 0.5 * (A[0] - B[0]);
      }
      if (w < 0) dreh = Math.PI;
    }
    const ausr = seitlich(s) ? b.seitenAusrichtung[s - (bk.streifen.length - b.seitenAusrichtung.length)] : undefined;
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < N; j++) {
        if (!bk.existiert(s, i, j)) continue;
        const p = bk.ring(s, i, j);
        const th = ausr ? (2 * Math.PI * (ausr.versatz + ausr.richtung * j)) / N - Math.PI / 2 : (2 * Math.PI * j) / N + dreh;
        setze(p, sr[i]!, th, umfang[i]!);
        // seitliche Röhre: der Zwilling links mit gespiegeltem Winkel
        if (ausr && i > 0) setze(bk.spiegel[p]!, sr[i]!, -th, umfang[i]!);
      }
    }
    // Kappen: Bogenlänge vom Endring zur Spitze, Winkel im Kappengitter, Umfang zur Spitze hin kleiner
    for (const wo of ['anfang', 'ende'] as const) {
      if ((wo === 'anfang' ? T.anfang : T.ende).art !== 'kappe') continue;
      const c = N / 4;
      const iEnd = wo === 'anfang' ? 0 : R - 1;
      const spitze = bk.kappe(s, wo, c / 2, c / 2);
      const s1 = sr[iEnd]!;
      const sTip = wo === 'anfang' ? Math.max(0, s1 - abst(P(spitze), mitten[iEnd]!)) : s1 + abst(P(spitze), mitten[iEnd]!);
      // Spitze: unten (Bauchflosse, Fuß) Bauch, sonst Rücken; Kappengitter wie die Ringpunkte (Randwinkel atan2(u, w) = 2πj/N)
      const tipUnten = P(spitze)[1] < mitten[iEnd]![1] - 0.25 * abst(P(spitze), mitten[iEnd]!);
      for (let aa = 1; aa < c; aa++) {
        for (let bb = 1; bb < c; bb++) {
          const p = bk.kappe(s, wo, aa, bb);
          const uu = aa - c / 2;
          const ww = bb - c / 2;
          const r = Math.max(Math.abs(uu), Math.abs(ww)) / (c / 2);
          const thGitter = Math.atan2(uu, ww);
          const th = r === 0 ? (tipUnten ? Math.PI : 0) : ausr ? (2 * Math.PI * ausr.versatz) / N + ausr.richtung * thGitter - Math.PI / 2 : thGitter + dreh;
          const sv = sTip + (s1 - sTip) * r;
          setze(p, sv, th, umfang[iEnd]! * Math.max(0.05, r));
          if (seitlich(s)) setze(bk.spiegel[p]!, sv, -th, umfang[iEnd]! * Math.max(0.05, r));
        }
      }
    }
  });
  // Ansätze weich: Der Hals setzt auf dem Rücken des Rumpfs an, seine Kehle (Bauch) beginnt dort — ohne Überblendung lag
  // zwischen Ring 0 (Elternwerte) und Ring 1 eine harte Kante hell/dunkel. Ringe 1–3 eines Kinds mischen den Winkel des
  // Elternpunkts derselben Spalte zu (¾, ½, ¼)
  bk.streifen.forEach((T, s) => {
    const a = T.anfang.art;
    if (a !== 'kragen' && a !== 'fenster' && a !== 'seitlich') return;
    for (let i = 1; i <= 3 && i < T.R - 1; i++) {
      const w = i / 4;
      for (let j = 0; j < T.N; j++) {
        if (!bk.existiert(s, i, j)) continue;
        const p = bk.ring(s, i, j);
        const q = bk.ring(s, 0, j);
        const mische = (pp: number, qq: number) => {
          kC[pp] = (1 - w) * kC[qq]! + w * kC[pp]!;
          kSi[pp] = (1 - w) * kSi[qq]! + w * kSi[pp]!;
        };
        mische(p, q);
        if (seitlich(s)) mische(bk.spiegel[p]!, bk.spiegel[q]!);
      }
    }
  });
  // übrige Punkte (Übergänge): Werte des nächsten gesetzten Nachbarn, in Wellen über die Käfigkanten
  let offen = true;
  for (let runde = 0; offen && runde < 64; runde++) {
    offen = false;
    const neu: number[] = [];
    for (let p = 0; p < n; p++) {
      if (gesetzt[p]) continue;
      for (let h = k.vKStart[p]!; h < k.vKStart[p + 1]!; h++) {
        const e = k.vKanten[h]!;
        const q = k.eA[e] === p ? k.eB[e]! : k.eA[e]!;
        if (!gesetzt[q]) continue;
        kS[p] = kS[q]!;
        kC[p] = kC[q]!;
        kSi[p] = kSi[q]!;
        kU[p] = kU[q]!;
        neu.push(p);
        break;
      }
      if (!neu.length || neu[neu.length - 1] !== p) offen = true;
    }
    for (const p of neu) gesetzt[p] = 1;
  }
  const g = b.unterteilung.grenze;
  const fS = anwenden1(g, kS);
  const fC = anwenden1(g, kC);
  const fSi = anwenden1(g, kSi);
  const fU = anwenden1(g, kU);
  const m = g.zeilen;
  const out = new Float32Array(m * DESKRIPTOR_FLOATS);
  for (let i = 0; i < m; i++) {
    const o = i * DESKRIPTOR_FLOATS;
    const th = Math.atan2(fSi[i]!, fC[i]!);
    out[o] = fS[i]!;
    out[o + 1] = th;
    out[o + 2] = Math.max(1e-4, fU[i]!);
    out[o + 3] = Math.cos(th);
    out[o + 5] = 10; // Abstand zur Maulkante: weit weg (kein Maul)
  }
  return out;
}
