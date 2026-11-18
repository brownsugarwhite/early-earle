// Plan vom 12.11.2026, Schritt 4: gemeinsame Teile der Proben zum Donut (`form-donut.ts`, `form-donut-regel.ts`): die heutige
// Rechnung bis zur Ruhe, das Abschneiden der Hälfte an der Spiegelebene und Verbinden mit ihrem Spiegelbild, Schnitte durch die Haut,
// Maße am Rand des Lochs.
import { type Haut, hautAus, hautSeiten } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug } from '../../../../packages/shape/src/dicht/loops';

export const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
export const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
export const kopie = (h: Haut): Haut => ({ ...h, pos: Float64Array.from(h.pos) });
export const loopsKopie = (loops: readonly Loop[]): Loop[] => loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));
export const fz = (h: Haut): string => {
  const f = falten(h);
  return `Knicke über 60° ${f.ueber60}, umgestülpt ${f.umgeklappt}`;
};

/** die heutige Rechnung: Zug in Schritten zu den neuen Lagen der Linien, dann Runden bis zur Ruhe; zurück: Runden am Ende, steht sie? */
export function heute(h: Haut, loops: readonly Loop[], lagen: readonly Float64Array[], schritte = 30, ende = 200): { runden: number; steht: boolean; weg: number } {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l, i) => Float64Array.from(lagen[i]!, (x, k) => x - l.ruhe[k]!));
  let bewegt = false;
  for (const d of versch) for (let k = 0; k < d.length; k++) if (d[k] !== 0) bewegt = true;
  if (bewegt) for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  const anfang = Float64Array.from(h.pos);
  let r = 0;
  let steht = false;
  for (; r < ende; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(versch, 1);
    let w = 0;
    for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
    if (!Number.isFinite(w)) throw new Error('die Haut ist nicht endlich');
    if (w < 0.02) {
      steht = true;
      break;
    }
  }
  let weg = 0;
  for (let i = 0; i < anfang.length; i += 3) weg = Math.max(weg, Math.hypot(h.pos[i]! - anfang[i]!, h.pos[i + 1]! - anfang[i + 1]!, h.pos[i + 2]! - anfang[i + 2]!));
  return { runden: r + 1, steht, weg };
}

/**
 * Die Hälfte z ≥ 0 der Haut an der Spiegelebene abschneiden und mit ihrem Spiegelbild zu einer Haut verbinden. Welche Punkte zur
 * Hälfte gehören, steht am Netz (`hautSeiten`), nicht an der Lage: Was davon unter die Ebene geraten ist, fällt weg, die Kanten,
 * die die Ebene kreuzen, bekommen dort einen Punkt (z = 0). Die Loops werden an denselben Stellen geteilt; ihre Stücke über der
 * Ebene bleiben Linien (Ringe mit Enden auf der Ebene). `rand`: die neuen Punkte auf der Ebene (der Rand des Lochs); `von`: je Loop
 * des Ergebnisses der Loop, aus dem er stammt (Index; −1: der Rand des Lochs).
 *
 * `fangen` (Anteil einer Kante, 0: aus): Würde eine Kante näher als dieser Anteil an einem ihrer Enden geschnitten, kommt dieser
 * Punkt selbst auf die Ebene, und an ihm wird nicht geschnitten. Sonst entstehen dicht neben solchen Punkten schmale Dreiecke und
 * sehr kurze Kanten am Rand; auf einem feinen Netz kam die heutige Rechnung daran nicht zur Ruhe (13.11.).
 */
export function verschmelzen(h: Haut, loops: readonly Loop[], randLinie: boolean, weich = false, fangen = 0): { h: Haut; loops: Loop[]; rand: number[]; von: number[] } {
  const seite = hautSeiten(h);
  if (!seite) throw new Error('die Mittelkante trennt das Netz nicht');
  const P = fangen > 0 ? Float64Array.from(h.pos) : h.pos;
  const gefangen = new Uint8Array(h.n);
  if (fangen > 0) {
    for (let v = 0; v < h.n; v++) {
      const z = h.pos[3 * v + 2]!;
      if (!(seite[v]! > 0)) continue;
      // ein Nachbar der Hälfte auf der anderen Seite der Ebene, und der Schnitt läge dicht an diesem Punkt
      const nah = h.nachbarn[v]!.some((j) => {
        const zj = h.pos[3 * j + 2]!;
        return seite[j]! > 0 && (z > 0 ? zj < 0 : zj > 0) && Math.abs(z) < fangen * (Math.abs(z) + Math.abs(zj));
      });
      if (nah) gefangen[v] = 1;
    }
    // kein Dreieck darf ganz in der Ebene liegen: Dann bleibt der Punkt, der am weitesten von ihr entfernt war, wo er ist
    for (let nochmal = true; nochmal; ) {
      nochmal = false;
      for (let t = 0; t < h.tri.length; t += 3) {
        const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
        if (!e.every((v) => seite[v] === 0 || gefangen[v]) || !e.some((v) => gefangen[v])) continue;
        let weit = -1;
        for (const v of e) if (gefangen[v] && (weit < 0 || Math.abs(h.pos[3 * v + 2]!) > Math.abs(h.pos[3 * weit + 2]!))) weit = v;
        gefangen[weit] = 0;
        nochmal = true;
      }
    }
    for (let v = 0; v < h.n; v++) if (gefangen[v]) P[3 * v + 2] = 0;
  }
  const aufEbene = (v: number): boolean => seite[v] === 0 || gefangen[v] === 1;
  const pos: number[] = [];
  const neuNr = new Int32Array(h.n).fill(-1);
  const schnitt = new Map<number, number>();
  const rand: number[] = [];
  // gebliebene Punkte der Hälfte: auf der Mittelkante, über der Ebene oder auf sie gelegt (die gehören zum Rand des Lochs)
  for (let v = 0; v < h.n; v++) {
    if (seite[v]! < 0) continue;
    if (aufEbene(v) || P[3 * v + 2]! > 0) {
      neuNr[v] = pos.length / 3;
      if (gefangen[v]) rand.push(neuNr[v]!);
      pos.push(P[3 * v]!, P[3 * v + 1]!, aufEbene(v) ? 0 : P[3 * v + 2]!);
    }
  }
  const schnittPunkt = (a: number, b: number): number => {
    // a liegt über der Ebene, b darunter (beide aus der Hälfte)
    const key = Math.min(a, b) * h.n + Math.max(a, b);
    const da = schnitt.get(key);
    if (da !== undefined) return da;
    const za = P[3 * a + 2]!;
    const zb = P[3 * b + 2]!;
    const t = za / (za - zb);
    const nr = pos.length / 3;
    pos.push(P[3 * a]! + t * (P[3 * b]! - P[3 * a]!), P[3 * a + 1]! + t * (P[3 * b + 1]! - P[3 * a + 1]!), 0);
    schnitt.set(key, nr);
    rand.push(nr);
    return nr;
  };
  const oben = (v: number): boolean => neuNr[v]! >= 0;
  const tri: number[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    if (e.some((v) => seite[v]! < 0)) continue;
    const drin = e.map(oben);
    const zahl = drin.filter(Boolean).length;
    if (zahl === 0) continue;
    if (zahl === 3) {
      tri.push(neuNr[e[0]!]!, neuNr[e[1]!]!, neuNr[e[2]!]!);
      continue;
    }
    // das Vieleck des Dreiecks über der Ebene, in seiner Umlaufrichtung
    const vieleck: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = e[k]!;
      const b = e[(k + 1) % 3]!;
      if (oben(a)) vieleck.push(neuNr[a]!);
      if (oben(a) !== oben(b)) {
        // Punkte der Mittelkante (und auf die Ebene gelegte) liegen schon auf der Ebene: kein neuer Punkt
        if (oben(a) && aufEbene(a)) continue;
        if (oben(b) && aufEbene(b)) continue;
        vieleck.push(oben(a) ? schnittPunkt(a, b) : schnittPunkt(b, a));
      }
    }
    for (let k = 1; k + 1 < vieleck.length; k++) if (vieleck[0] !== vieleck[k] && vieleck[k] !== vieleck[k + 1] && vieleck[0] !== vieleck[k + 1]) tri.push(vieleck[0]!, vieleck[k]!, vieleck[k + 1]!);
  }
  // Punkte, an denen über der Ebene kein Dreieck hängt (ein auf die Ebene gelegter Punkt ohne Nachbarn darüber), fallen weg
  {
    const nVor = pos.length / 3;
    const benutzt = new Uint8Array(nVor);
    for (const v of tri) benutzt[v] = 1;
    if (benutzt.includes(0)) {
      const um = new Int32Array(nVor).fill(-1);
      const dicht: number[] = [];
      for (let v = 0; v < nVor; v++) {
        if (!benutzt[v]) continue;
        um[v] = dicht.length / 3;
        dicht.push(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!);
      }
      pos.length = 0;
      for (const x of dicht) pos.push(x);
      for (let i = 0; i < tri.length; i++) tri[i] = um[tri[i]!]!;
      for (let v = 0; v < h.n; v++) if (neuNr[v]! >= 0) neuNr[v] = um[neuNr[v]!]!;
      for (const [k, nr] of [...schnitt]) {
        if (um[nr]! < 0) schnitt.delete(k);
        else schnitt.set(k, um[nr]!);
      }
      const bleibt = rand.filter((v) => um[v]! >= 0).map((v) => um[v]!);
      rand.length = 0;
      for (const v of bleibt) rand.push(v);
    }
  }
  // das Spiegelbild: Punkte über der Ebene noch einmal mit −z, Punkte der Ebene gehören beiden
  const nHalb = pos.length / 3;
  const gegen = new Int32Array(nHalb);
  for (let v = 0; v < nHalb; v++) {
    if (pos[3 * v + 2] === 0) gegen[v] = v;
    else {
      gegen[v] = pos.length / 3;
      pos.push(pos[3 * v]!, pos[3 * v + 1]!, -pos[3 * v + 2]!);
    }
  }
  const nT = tri.length;
  for (let t = 0; t < nT; t += 3) tri.push(gegen[tri[t]!]!, gegen[tri[t + 2]!]!, gegen[tri[t + 1]!]!);
  const neu = hautAus(pos, tri);
  // die Loops: Kette ihrer Punkte, an der Ebene geteilt; Stücke über der Ebene bleiben
  const aus: Loop[] = [];
  const von: number[] = [];
  let herkunft = -1;
  let id = 1;
  const stueck = (art: Loop['art'], kette: number[], ohneWoelbung = false): void => {
    if (kette.length < 2) return;
    const ruhe = new Float64Array(3 * kette.length);
    const s = new Float64Array(kette.length);
    kette.forEach((v, i) => {
      for (let c = 0; c < 3; c++) ruhe[3 * i + c] = neu.pos[3 * v + c]!;
      if (i > 0) s[i] = s[i - 1]! + Math.hypot(ruhe[3 * i]! - ruhe[3 * i - 3]!, ruhe[3 * i + 1]! - ruhe[3 * i - 2]!, ruhe[3 * i + 2]! - ruhe[3 * i - 1]!);
    });
    let laenge = s[kette.length - 1]!;
    if (art !== 'ring') laenge += Math.hypot(ruhe[0]! - ruhe[3 * kette.length - 3]!, ruhe[1]! - ruhe[3 * kette.length - 2]!, ruhe[2]! - ruhe[3 * kette.length - 1]!);
    // `ohneWoelbung`: an jeder Probe ein Punkt mit Ecke. Die heutige Rechnung liest an einer Ecke keine Wölbung ab und gibt keine
    // weiter; die Linie hält dann nur den Ort, wie die Haut über sie läuft, folgt aus der Umgebung.
    const punkte = ohneWoelbung ? kette.map((_, i) => ({ s: s[i]!, ref: { x: ruhe[3 * i]!, y: ruhe[3 * i + 1]!, z: ruhe[3 * i + 2]! }, cur: { x: ruhe[3 * i]!, y: ruhe[3 * i + 1]!, z: ruhe[3 * i + 2]! }, ecke: true })) : [];
    aus.push({ id: id++, art, proben: kette.map((v) => ({ ecken: [v, v, v], b: [1, 0, 0] })), s, laenge, ruhe, punkte });
    von.push(herkunft);
  };
  for (const l of loops) {
    herkunft++;
    const kette = l.proben.map((p) => p.ecken[0]);
    if (l.art === 'mitte') {
      stueck('mitte', kette.map((v) => neuNr[v]!));
      continue;
    }
    // (ein Paar, das die Ebene kreuzt, zerfällt wie ein Ring in Stücke mit Enden auf der Ebene)
    const n = kette.length;
    const zu = l.art === 'paar';
    let jetzt: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = kette[i]!;
      if (oben(a)) jetzt.push(neuNr[a]!);
      const j = i + 1 < n ? i + 1 : zu ? 0 : -1;
      if (j < 0) break;
      const b = kette[j]!;
      if (oben(a) !== oben(b)) {
        const key = Math.min(a, b) * h.n + Math.max(a, b);
        const sp = schnitt.get(key);
        if (sp !== undefined) {
          if (oben(a)) {
            jetzt.push(sp);
            stueck('ring', jetzt);
            jetzt = [];
          } else jetzt = [sp];
        } else if (oben(a)) {
          // ohne Schnittpunkt: Der Punkt selbst liegt auf der Ebene, das Stück endet an ihm (und beginnt am nächsten solchen)
          stueck('ring', jetzt);
          jetzt = [];
        } else jetzt = [];
      }
    }
    if (zu && jetzt.length && aus.length === 0) stueck('paar', jetzt);
    else stueck('ring', jetzt);
  }
  // der Rand des Lochs als Loop der Mittelebene: die neuen Punkte auf der Ebene, der Reihe nach über ihre Kanten
  herkunft = -1;
  if (randLinie && rand.length > 2) {
    const imRand = new Set(rand);
    // Nachbarn längs des Rands: über die Kanten der Hälfte, an denen nur ein Dreieck liegt (zwei Randpunkte können auch quer über ein
    // Dreieck verbunden sein, das ist keine Kante des Rands)
    const zahl = new Map<number, number>();
    const nGanz = neu.n;
    for (let t = 0; t < nT; t += 3)
      for (let k = 0; k < 3; k++) {
        const a = tri[t + k]!;
        const b = tri[t + ((k + 1) % 3)]!;
        if (!imRand.has(a) || !imRand.has(b)) continue;
        const key = Math.min(a, b) * nGanz + Math.max(a, b);
        zahl.set(key, (zahl.get(key) ?? 0) + 1);
      }
    const neben = new Map<number, number[]>();
    for (const [key, z] of zahl) {
      if (z !== 1) continue;
      const a = Math.floor(key / nGanz);
      const b = key % nGanz;
      neben.set(a, [...(neben.get(a) ?? []), b]);
      neben.set(b, [...(neben.get(b) ?? []), a]);
    }
    const besucht = new Set<number>();
    for (const anfang of rand) {
      if (besucht.has(anfang)) continue;
      const kette = [anfang];
      besucht.add(anfang);
      for (;;) {
        const letzter = kette[kette.length - 1]!;
        const weiter = (neben.get(letzter) ?? []).find((u) => !besucht.has(u));
        if (weiter === undefined) break;
        kette.push(weiter);
        besucht.add(weiter);
      }
      if (kette.length > 2) stueck('mitte', kette, weich);
    }
  }
  return { h: neu, loops: aus, rand, von };
}

/** Schnitt der Haut mit der Ebene y = 0: Strecken (x, z) */
export function schnittY(h: Haut): number[] {
  const P = h.pos;
  const aus: number[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    const pt: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = e[k]!;
      const b = e[(k + 1) % 3]!;
      const ya = P[3 * a + 1]!;
      const yb = P[3 * b + 1]!;
      if (ya > 0 !== yb > 0) {
        const u = ya / (ya - yb);
        pt.push(P[3 * a]! + u * (P[3 * b]! - P[3 * a]!), P[3 * a + 2]! + u * (P[3 * b + 2]! - P[3 * a + 2]!));
      }
    }
    if (pt.length === 4) aus.push(...pt);
  }
  return aus;
}

/** Knick quer über den Rand des Lochs (Grad): zwischen den beiden Dreiecken an jeder Kante aus zwei Randpunkten; Mittel, größter */
export function randKnick(h: Haut, rand: readonly number[]): { mittel: number; max: number; kanten: number } {
  const imRand = new Set(rand);
  const P = h.pos;
  const normale = (t: number): [number, number, number] => {
    const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    const u = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
    const v = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    return [n[0]! / l, n[1]! / l, n[2]! / l];
  };
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = h.tri[t + k]!;
      const b = h.tri[t + ((k + 1) % 3)]!;
      if (!imRand.has(a) || !imRand.has(b)) continue;
      const key = Math.min(a, b) * h.n + Math.max(a, b);
      kanten.set(key, [...(kanten.get(key) ?? []), t]);
    }
  let s = 0;
  let m = 0;
  let z = 0;
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const p = normale(ts[0]!);
    const q = normale(ts[1]!);
    const w = (Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) * 180) / Math.PI;
    s += w;
    m = Math.max(m, w);
    z++;
  }
  return { mittel: z ? s / z : 0, max: m, kanten: z };
}
/** Halbmesser des Lochs: Abstand der Randpunkte von der Achse durch ihre Mitte (kleinster, größter) */
export function lochMass(h: Haut, rand: readonly number[]): string {
  if (rand.length === 0) return 'kein Loch';
  let cx = 0;
  let cy = 0;
  for (const v of rand) {
    cx += h.pos[3 * v]!;
    cy += h.pos[3 * v + 1]!;
  }
  cx /= rand.length;
  cy /= rand.length;
  let a = Infinity;
  let b = 0;
  for (const v of rand) {
    const r = Math.hypot(h.pos[3 * v]! - cx, h.pos[3 * v + 1]! - cy);
    a = Math.min(a, r);
    b = Math.max(b, r);
  }
  return `Loch mit Halbmesser ${z1(a)} bis ${z1(b)}`;
}

/**
 * Schnitt der Haut mit der senkrechten Ebene durch (cx, cy), um `grad` gegen die x-Achse gedreht: Strecken (Weg längs der Ebene, z).
 * 0° durch (0, 0) ist `schnittY`.
 */
export function schnittDurch(h: Haut, cx: number, cy: number, grad: number): number[] {
  const c = Math.cos((grad * Math.PI) / 180);
  const s = Math.sin((grad * Math.PI) / 180);
  const P = h.pos;
  const laengs = (v: number): number => (P[3 * v]! - cx) * c + (P[3 * v + 1]! - cy) * s;
  const quer = (v: number): number => -(P[3 * v]! - cx) * s + (P[3 * v + 1]! - cy) * c;
  const aus: number[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    const pt: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = e[k]!;
      const b = e[(k + 1) % 3]!;
      const wa = quer(a);
      const wb = quer(b);
      if (wa > 0 !== wb > 0) {
        const f = wa / (wa - wb);
        pt.push(laengs(a) + f * (laengs(b) - laengs(a)), P[3 * a + 2]! + f * (P[3 * b + 2]! - P[3 * a + 2]!));
      }
    }
    if (pt.length === 4) aus.push(...pt);
  }
  return aus;
}

function normaleVon(h: Haut, t: number): [number, number, number] {
  const P = h.pos;
  const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
  const u = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
  const v = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
  const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
  return [n[0]! / l, n[1]! / l, n[2]! / l];
}

/**
 * Knick eine Reihe neben dem Rand des Lochs (Grad, Mittel): an den Kanten zwischen zwei Punkten der ersten Reihe über der Ebene (sie
 * laufen längs des Rands wie er). Läuft die Haut glatt durch die Ebene, ist der Knick quer über den Rand etwa so groß wie dieser (beide
 * messen, wie stark sich die Haut quer zum Rand von einem Dreiecksband zum nächsten wölbt); ein Grat am Rand ist deutlich größer.
 */
export function knickDaneben(h: Haut, rand: readonly number[]): number {
  const imRand = new Set(rand);
  const P = h.pos;
  const reihe = new Set<number>();
  for (const v of rand) for (const j of h.nachbarn[v]!) if (!imRand.has(j) && P[3 * j + 2]! > 0) reihe.add(j);
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = h.tri[t + k]!;
      const b = h.tri[t + ((k + 1) % 3)]!;
      if (!reihe.has(a) || !reihe.has(b)) continue;
      const key = Math.min(a, b) * h.n + Math.max(a, b);
      const liste = kanten.get(key);
      if (liste) liste.push(t);
      else kanten.set(key, [t]);
    }
  let s = 0;
  let z = 0;
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const p = normaleVon(h, ts[0]!);
    const q = normaleVon(h, ts[1]!);
    s += (Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) * 180) / Math.PI;
    z++;
  }
  return z ? s / z : 0;
}

/** Richtungsänderung längs einer geschlossenen Linie von Probe zu Probe (Grad): Mittel und größte (eine Ecke ragt weit über das Mittel) */
export function richtungswechsel(L: ArrayLike<number>): { mittel: number; max: number } {
  const n = L.length / 3;
  let s = 0;
  let m = 0;
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n;
    const b = (i + 1) % n;
    const u = [0, 1, 2].map((k) => L[3 * i + k]! - L[3 * a + k]!);
    const v = [0, 1, 2].map((k) => L[3 * b + k]! - L[3 * i + k]!);
    const lu = Math.hypot(u[0]!, u[1]!, u[2]!);
    const lv = Math.hypot(v[0]!, v[1]!, v[2]!);
    if (!(lu > 1e-9) || !(lv > 1e-9)) continue;
    const w = (Math.acos(Math.max(-1, Math.min(1, (u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / (lu * lv)))) * 180) / Math.PI;
    s += w;
    m = Math.max(m, w);
  }
  return { mittel: n ? s / n : 0, max: m };
}

/**
 * Halbmesser eines Lochs aus seinem Rand der Reihe nach (3 je Punkt, in der Ebene z = 0): Abstand der Randpunkte vom Schwerpunkt der
 * umschlossenen Fläche (kleinster, größter). Anders als `lochMass` hängt das nicht daran, wie gleichmäßig die Punkte auf dem Rand liegen.
 */
export function lochRund(L: ArrayLike<number>): string {
  const n = L.length / 3;
  if (n < 3) return 'kein Loch';
  let fl = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const k = L[3 * i]! * L[3 * j + 1]! - L[3 * j]! * L[3 * i + 1]!;
    fl += k;
    cx += (L[3 * i]! + L[3 * j]!) * k;
    cy += (L[3 * i + 1]! + L[3 * j + 1]!) * k;
  }
  if (Math.abs(fl) < 1e-9) return 'kein Loch';
  cx /= 3 * fl;
  cy /= 3 * fl;
  let a = Infinity;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(L[3 * i]! - cx, L[3 * i + 1]! - cy);
    a = Math.min(a, r);
    b = Math.max(b, r);
  }
  return `Loch mit Halbmesser ${z1(a)} bis ${z1(b)}`;
}
