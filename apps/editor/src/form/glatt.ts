// Plan vom 12.11.2026, Schritt 1 „glatte Anzeige“ (Florian: „Das Mesh soll dicht genug gezeichnet werden, um richtig glattes
// Shading zu erzeugen; beim Cel-Shading sollen die Stufen aussehen wie eine scharfe Vektorlinie“). Das Rechennetz wird nur für die
// Anzeige verfeinert; an der Rechnung ändert sich nichts. Zwei Bauarten zum Vergleichen:
// - Unterteilung (Loop): Die Rechenpunkte werden vorab so versetzt, dass die fertige Fläche durch sie geht (gewöhnliche
//   Unterteilung zieht nach innen). Harte Linien bleiben Kanten: Ihre Punkte liegen auf jeder Stufe genau auf dem Bézier-Pfad.
// - gekrümmte Dreiecke (PN-Dreiecke, Vlachos u. a. 2001): je Dreieck ein kubisches Flächenstück aus Ecken und Normalen; Kanten auf
//   einer Linie bekommen das exakte Stück des Pfads.
// Ohne DOM und ohne three.js: Die Seite `anzeige.html` und später das Fenster benutzen dieselben Funktionen.
import { type Haut, type Loop, kanteBei, pfadKanten } from '@ee/shape/dicht';

/** Stück des Pfads auf einer Kante: vier Kontrollpunkte (xyz) vom kleineren zum größeren Punkt; `hart`: Kante an */
export type KantenPfad = { k: Float64Array; hart: boolean };
/**
 * Netz der Anzeige: Punkte auf harten Linien sind je Seite doppelt (eigene Normale je Seite). `fest`: Die Lage kommt vom Pfad und
 * bleibt beim Unterteilen. `pfad`: Kanten auf Linien, Schlüssel a · n + b mit a < b.
 */
export type AnzeigeNetz = { pos: Float64Array; tri: Uint32Array; fest: Uint8Array; pfad: Map<number, KantenPfad> };

const schluessel = (a: number, b: number, n: number): number => (a < b ? a * n + b : b * n + a);
const gedreht = (k: Float64Array): Float64Array =>
  Float64Array.of(k[9]!, k[10]!, k[11]!, k[6]!, k[7]!, k[8]!, k[3]!, k[4]!, k[5]!, k[0]!, k[1]!, k[2]!);

/**
 * Das Netz der Anzeige aus Haut und Loops: Punkte auf Linien genau auf ihrem Pfad, harte Linien aufgetrennt, jede Kante auf einer
 * Linie mit ihrem Stück des Pfads. `lagen`: andere Lagen als die der Haut (zum Beispiel an der Spiegelebene abgeschnitten).
 */
export function anzeigeNetz(h: Haut, loops: readonly Loop[], lagen: ArrayLike<number> = h.pos): AnzeigeNetz {
  const n = h.n;
  const tri = h.tri;
  const F = tri.length / 3;
  // Kanten der Haut mit Pfad (`a`: an diesem Punkt beginnen die Kontrollpunkte)
  const hautPfad = new Map<number, { a: number; k: Float64Array; hart: boolean }>();
  const eintragen = (a: number, b: number, k: Float64Array, hart: boolean): void => {
    if (a === b) return;
    const s = schluessel(a, b, n);
    const alt = hautPfad.get(s);
    if (alt && (alt.hart || !hart)) return;
    hautPfad.set(s, { a, k, hart });
  };
  for (const l of loops) {
    const pk = pfadKanten(l);
    if (!pk) continue;
    const hd = kanteBei(l, loops);
    for (const e of pk) {
      const k = new Float64Array(12);
      e.k.forEach((p, i) => {
        k[3 * i] = p.x;
        k[3 * i + 1] = p.y;
        k[3 * i + 2] = p.z;
      });
      const hart = hd[e.ja] === 1 && hd[e.jb] === 1;
      eintragen(e.a, e.b, k, hart);
      if (l.art !== 'mitte') {
        const ks = Float64Array.from(k);
        for (let i = 2; i < 12; i += 3) ks[i] = -ks[i]!;
        eintragen(h.spiegel[e.a]!, h.spiegel[e.b]!, ks, hart);
      }
    }
  }
  // Punkte auf Linien genau auf den Pfad
  const pos = Float64Array.from(lagen);
  const hartPunkt = new Uint8Array(n);
  for (const [s, e] of hautPfad) {
    const a = e.a;
    const b = Math.floor(s / n) === a ? s % n : Math.floor(s / n);
    for (let c = 0; c < 3; c++) {
      pos[3 * a + c] = e.k[c]!;
      pos[3 * b + c] = e.k[9 + c]!;
    }
    if (e.hart) hartPunkt[a] = hartPunkt[b] = 1;
  }
  // harte Linien auftrennen: Um jeden ihrer Punkte bilden die Dreiecke, die über weiche Kanten zusammenhängen, eine Seite
  const um: number[][] = Array.from({ length: n }, () => []);
  for (let f = 0; f < F; f++) for (let e = 0; e < 3; e++) um[tri[3 * f + e]!]!.push(f);
  const index = Uint32Array.from(tri);
  const quelle: number[] = Array.from({ length: n }, (_, i) => i);
  for (let v = 0; v < n; v++) {
    if (!hartPunkt[v]) continue;
    const fs = um[v]!;
    const eltern = fs.map((_, i) => i);
    const finde = (i: number): number => {
      while (eltern[i] !== i) {
        eltern[i] = eltern[eltern[i]!]!;
        i = eltern[i]!;
      }
      return i;
    };
    const bei = new Map<number, number>();
    fs.forEach((f, i) => {
      for (let e = 0; e < 3; e++) {
        const w = tri[3 * f + e]!;
        if (w === v) continue;
        const j = bei.get(w);
        if (j === undefined) bei.set(w, i);
        else if (hautPfad.get(schluessel(v, w, n))?.hart !== true) eltern[finde(i)] = finde(j);
      }
    });
    const erste = finde(0);
    const neu = new Map<number, number>();
    fs.forEach((f, i) => {
      const r = finde(i);
      if (r === erste) return;
      let d = neu.get(r);
      if (d === undefined) {
        d = quelle.length;
        quelle.push(v);
        neu.set(r, d);
      }
      for (let e = 0; e < 3; e++) if (tri[3 * f + e] === v) index[3 * f + e] = d;
    });
  }
  const N = quelle.length;
  const P = new Float64Array(3 * N);
  const fest = new Uint8Array(N);
  for (let d = 0; d < N; d++) {
    const q = quelle[d]!;
    P[3 * d] = pos[3 * q]!;
    P[3 * d + 1] = pos[3 * q + 1]!;
    P[3 * d + 2] = pos[3 * q + 2]!;
    fest[d] = hartPunkt[q]!;
  }
  const pfad = new Map<number, KantenPfad>();
  for (let f = 0; f < F; f++)
    for (let e = 0; e < 3; e++) {
      const a = tri[3 * f + e]!;
      const b = tri[3 * f + ((e + 1) % 3)]!;
      const p = hautPfad.get(schluessel(a, b, n));
      if (!p) continue;
      const da = index[3 * f + e]!;
      const db = index[3 * f + ((e + 1) % 3)]!;
      const s = schluessel(da, db, N);
      if (pfad.has(s)) continue;
      const vonA = p.a === a ? p.k : gedreht(p.k);
      pfad.set(s, { k: da < db ? vonA : gedreht(vonA), hart: p.hart });
    }
  return { pos: P, tri: index, fest, pfad };
}

/** Kanten eines Netzes: je Kante ihre Enden (a < b) und die gegenüberliegenden Punkte (d = −1: Rand), je Dreiecksseite ihre Kante */
function kantenVon(tri: Uint32Array, n: number): { a: Int32Array; b: Int32Array; c: Int32Array; d: Int32Array; seite: Uint32Array } {
  const F = tri.length / 3;
  const nr = new Map<number, number>();
  const a: number[] = [];
  const b: number[] = [];
  const c: number[] = [];
  const d: number[] = [];
  const seite = new Uint32Array(3 * F);
  for (let f = 0; f < F; f++)
    for (let e = 0; e < 3; e++) {
      const p = tri[3 * f + e]!;
      const q = tri[3 * f + ((e + 1) % 3)]!;
      const r = tri[3 * f + ((e + 2) % 3)]!;
      const s = schluessel(p, q, n);
      let i = nr.get(s);
      if (i === undefined) {
        i = a.length;
        nr.set(s, i);
        a.push(Math.min(p, q));
        b.push(Math.max(p, q));
        c.push(r);
        d.push(-1);
      } else d[i] = r;
      seite[3 * f + e] = i;
    }
  return { a: Int32Array.from(a), b: Int32Array.from(b), c: Int32Array.from(c), d: Int32Array.from(d), seite };
}

/**
 * Die Rechenpunkte so versetzen, dass die Grenzfläche der Unterteilung durch sie geht (gewöhnliche Unterteilung zieht nach innen:
 * am Körper rund 0,4, am dünnen Horn 1,7 Einheiten). Je Runde wandert jeder freie Punkt um das, was seiner Grenzlage zum Rechenpunkt
 * fehlt. Feste Punkte und Ränder bleiben.
 */
export function durchPunkte(net: AnzeigeNetz, runden = 2): AnzeigeNetz {
  const N = net.pos.length / 3;
  const K = kantenVon(net.tri, N);
  const frei = new Uint8Array(N).fill(1);
  const zahl = new Uint16Array(N);
  for (let i = 0; i < K.a.length; i++) {
    zahl[K.a[i]!] = zahl[K.a[i]!]! + 1;
    zahl[K.b[i]!] = zahl[K.b[i]!]! + 1;
    if (K.d[i]! < 0) frei[K.a[i]!] = frei[K.b[i]!] = 0;
  }
  for (let v = 0; v < N; v++) if (net.fest[v]) frei[v] = 0;
  const P = net.pos;
  const C = Float64Array.from(P);
  const sum = new Float64Array(3 * N);
  for (let r = 0; r < runden; r++) {
    sum.fill(0);
    for (let i = 0; i < K.a.length; i++) {
      const a = K.a[i]!;
      const b = K.b[i]!;
      for (let x = 0; x < 3; x++) {
        sum[3 * a + x] = sum[3 * a + x]! + C[3 * b + x]!;
        sum[3 * b + x] = sum[3 * b + x]! + C[3 * a + x]!;
      }
    }
    for (let v = 0; v < N; v++) {
      if (!frei[v]) continue;
      const k = zahl[v]!;
      // Grenzlage eines Punkts mit k Nachbarn (Gewichte nach Warren: β = 3/(8k), bei k = 3: 3/16)
      const chi = k === 3 ? 1 / 5 : 1 / (2 * k);
      for (let x = 0; x < 3; x++) {
        const grenz = (1 - k * chi) * C[3 * v + x]! + chi * sum[3 * v + x]!;
        C[3 * v + x] = C[3 * v + x]! + P[3 * v + x]! - grenz;
      }
    }
  }
  return { ...net, pos: C };
}

/**
 * Eine Stufe Unterteilung (Loop). Feste Punkte bleiben, wo sie sind; der neue Punkt einer harten Kante mit Pfad liegt auf dem Pfad
 * (mit `alleLinien` auch der einer weichen). Jede Hälfte einer Kante mit Pfad trägt ihre Hälfte des Pfads weiter.
 */
export function unterteilen(net: AnzeigeNetz, alleLinien = false): AnzeigeNetz {
  const N = net.pos.length / 3;
  const tri = net.tri;
  const F = tri.length / 3;
  const P = net.pos;
  const K = kantenVon(tri, N);
  const E = K.a.length;
  const M = N + E;
  const sum = new Float64Array(3 * N);
  const randSum = new Float64Array(3 * N);
  const zahl = new Uint16Array(N);
  const randZahl = new Uint8Array(N);
  for (let i = 0; i < E; i++) {
    const a = K.a[i]!;
    const b = K.b[i]!;
    zahl[a] = zahl[a]! + 1;
    zahl[b] = zahl[b]! + 1;
    const rand = K.d[i]! < 0;
    if (rand) {
      randZahl[a] = randZahl[a]! + 1;
      randZahl[b] = randZahl[b]! + 1;
    }
    for (let x = 0; x < 3; x++) {
      sum[3 * a + x] = sum[3 * a + x]! + P[3 * b + x]!;
      sum[3 * b + x] = sum[3 * b + x]! + P[3 * a + x]!;
      if (rand) {
        randSum[3 * a + x] = randSum[3 * a + x]! + P[3 * b + x]!;
        randSum[3 * b + x] = randSum[3 * b + x]! + P[3 * a + x]!;
      }
    }
  }
  const Q = new Float64Array(3 * M);
  const fest = new Uint8Array(M);
  for (let v = 0; v < N; v++) {
    const k = zahl[v]!;
    for (let x = 0; x < 3; x++) {
      const p = P[3 * v + x]!;
      if (net.fest[v]) Q[3 * v + x] = p;
      else if (randZahl[v]) Q[3 * v + x] = randZahl[v] === 2 ? 0.75 * p + 0.125 * randSum[3 * v + x]! : p;
      else {
        const beta = k === 3 ? 3 / 16 : 3 / (8 * k);
        Q[3 * v + x] = (1 - k * beta) * p + beta * sum[3 * v + x]!;
      }
    }
    fest[v] = net.fest[v]!;
  }
  const pfad = new Map<number, KantenPfad>();
  for (let i = 0; i < E; i++) {
    const a = K.a[i]!;
    const b = K.b[i]!;
    const m = N + i;
    const p = net.pfad.get(a * N + b);
    const aufPfad = p !== undefined && (p.hart || alleLinien);
    for (let x = 0; x < 3; x++) {
      if (aufPfad) Q[3 * m + x] = (p.k[x]! + 3 * p.k[3 + x]! + 3 * p.k[6 + x]! + p.k[9 + x]!) / 8;
      else if (K.d[i]! < 0) Q[3 * m + x] = 0.5 * (P[3 * a + x]! + P[3 * b + x]!);
      else Q[3 * m + x] = 0.375 * (P[3 * a + x]! + P[3 * b + x]!) + 0.125 * (P[3 * K.c[i]! + x]! + P[3 * K.d[i]! + x]!);
    }
    if (!p) continue;
    if (aufPfad) fest[m] = 1;
    // der Pfad in zwei Hälften (de Casteljau bei ½): von a zur Mitte und von b zur Mitte
    const links = new Float64Array(12);
    const rechts = new Float64Array(12);
    for (let x = 0; x < 3; x++) {
      const k0 = p.k[x]!;
      const k1 = p.k[3 + x]!;
      const k2 = p.k[6 + x]!;
      const k3 = p.k[9 + x]!;
      const mitte = (k0 + 3 * k1 + 3 * k2 + k3) / 8;
      links[x] = k0;
      links[3 + x] = (k0 + k1) / 2;
      links[6 + x] = (k0 + 2 * k1 + k2) / 4;
      links[9 + x] = mitte;
      rechts[x] = k3;
      rechts[3 + x] = (k2 + k3) / 2;
      rechts[6 + x] = (k1 + 2 * k2 + k3) / 4;
      rechts[9 + x] = mitte;
    }
    pfad.set(a * M + m, { k: links, hart: p.hart });
    pfad.set(b * M + m, { k: rechts, hart: p.hart });
  }
  const T = new Uint32Array(12 * F);
  for (let f = 0; f < F; f++) {
    const a = tri[3 * f]!;
    const b = tri[3 * f + 1]!;
    const c = tri[3 * f + 2]!;
    const ab = N + K.seite[3 * f]!;
    const bc = N + K.seite[3 * f + 1]!;
    const ca = N + K.seite[3 * f + 2]!;
    T.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], 12 * f);
  }
  return { pos: Q, tri: T, fest, pfad };
}

/**
 * Normalen beruhigen: Jede Normale wandert `runden`-mal um die Hälfte zum Mittel ihrer Nachbarn (über harte Linien hinweg gibt es
 * keine Nachbarn, die Kante bleibt). Kleine Unebenheiten der Rechenpunkte kippen die Normalen um Bruchteile eines Grads; an einer
 * Farbstufe sieht man das als Wellen. Die Lagen bleiben, wie sie sind.
 */
export function normalenBeruhigen(net: AnzeigeNetz, normalen: ArrayLike<number>, runden = 2): Float64Array {
  const N = net.pos.length / 3;
  const K = kantenVon(net.tri, N);
  let nor = Float64Array.from(normalen);
  const sum = new Float64Array(3 * N);
  const zahl = new Uint16Array(N);
  for (let i = 0; i < K.a.length; i++) {
    zahl[K.a[i]!] = zahl[K.a[i]!]! + 1;
    zahl[K.b[i]!] = zahl[K.b[i]!]! + 1;
  }
  for (let r = 0; r < runden; r++) {
    sum.fill(0);
    for (let i = 0; i < K.a.length; i++) {
      const a = K.a[i]!;
      const b = K.b[i]!;
      for (let x = 0; x < 3; x++) {
        sum[3 * a + x] = sum[3 * a + x]! + nor[3 * b + x]!;
        sum[3 * b + x] = sum[3 * b + x]! + nor[3 * a + x]!;
      }
    }
    const neu = new Float64Array(3 * N);
    for (let v = 0; v < N; v++) {
      const k = zahl[v] || 1;
      let l = 0;
      for (let x = 0; x < 3; x++) {
        const h = 0.5 * nor[3 * v + x]! + (0.5 * sum[3 * v + x]!) / k;
        neu[3 * v + x] = h;
        l += h * h;
      }
      l = Math.sqrt(l) || 1;
      for (let x = 0; x < 3; x++) neu[3 * v + x] = neu[3 * v + x]! / l;
    }
    nor = neu;
  }
  return nor;
}

/**
 * Ruhige Normalen je Punkt: die Normalen des Netzes, nachdem jeder freie Punkt auf seine Grenzlage der gewöhnlichen Unterteilung
 * gerückt ist (halb er selbst, halb das Mittel seiner Nachbarn; feste Punkte und Ränder bleiben). Das ist die Schattierung von
 * Subsurf an den Rechenpunkten und kostet so viel wie die Normalen von heute. Die Lagen der Anzeige ändert es nicht.
 */
export function ruhigeNormalen(net: AnzeigeNetz): Float64Array {
  const N = net.pos.length / 3;
  const K = kantenVon(net.tri, N);
  const P = net.pos;
  const frei = new Uint8Array(N).fill(1);
  const zahl = new Uint16Array(N);
  const sum = new Float64Array(3 * N);
  for (let i = 0; i < K.a.length; i++) {
    const a = K.a[i]!;
    const b = K.b[i]!;
    zahl[a] = zahl[a]! + 1;
    zahl[b] = zahl[b]! + 1;
    if (K.d[i]! < 0) frei[a] = frei[b] = 0;
    for (let x = 0; x < 3; x++) {
      sum[3 * a + x] = sum[3 * a + x]! + P[3 * b + x]!;
      sum[3 * b + x] = sum[3 * b + x]! + P[3 * a + x]!;
    }
  }
  const Q = Float64Array.from(P);
  for (let v = 0; v < N; v++) {
    if (!frei[v] || net.fest[v]) continue;
    const k = zahl[v]!;
    const chi = k === 3 ? 1 / 5 : 1 / (2 * k);
    for (let x = 0; x < 3; x++) Q[3 * v + x] = (1 - k * chi) * P[3 * v + x]! + chi * sum[3 * v + x]!;
  }
  return netzNormalen(Q, net.tri);
}

/** Normale je Punkt, nach der Fläche der Dreiecke gewichtet (Länge 1) */
export function netzNormalen(pos: ArrayLike<number>, tri: ArrayLike<number>): Float64Array {
  const nor = new Float64Array(pos.length);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t]!;
    const b = tri[t + 1]!;
    const c = tri[t + 2]!;
    const ux = pos[3 * b]! - pos[3 * a]!;
    const uy = pos[3 * b + 1]! - pos[3 * a + 1]!;
    const uz = pos[3 * b + 2]! - pos[3 * a + 2]!;
    const vx = pos[3 * c]! - pos[3 * a]!;
    const vy = pos[3 * c + 1]! - pos[3 * a + 1]!;
    const vz = pos[3 * c + 2]! - pos[3 * a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      nor[3 * v] = nor[3 * v]! + nx;
      nor[3 * v + 1] = nor[3 * v + 1]! + ny;
      nor[3 * v + 2] = nor[3 * v + 2]! + nz;
    }
  }
  for (let v = 0; v < nor.length; v += 3) {
    const l = Math.hypot(nor[v]!, nor[v + 1]!, nor[v + 2]!) || 1;
    nor[v] = nor[v]! / l;
    nor[v + 1] = nor[v + 1]! / l;
    nor[v + 2] = nor[v + 2]! / l;
  }
  return nor;
}

/**
 * Das Netz einmal verfeinern, ohne es zu glätten: Jede Kante bekommt einen Punkt in der Mitte ihrer gewölbten Kante (auf einer Linie
 * die Mitte ihres Pfadstücks, sonst die Mitte der Kurve, die an beiden Enden senkrecht auf der Normale steht), die alten Punkte
 * bleiben, jedes Dreieck wird zu vier. Die Fläche geht weiter durch alle Rechenpunkte, nichts schwingt über. Auf dem feineren Netz
 * lassen sich ruhigere Normalen rechnen (`ruhigeNormalen`), bevor die gekrümmten Dreiecke gezeichnet werden.
 */
export function verfeinernGekruemmt(net: AnzeigeNetz, normalen: ArrayLike<number>): AnzeigeNetz {
  const N = net.pos.length / 3;
  const tri = net.tri;
  const F = tri.length / 3;
  const P = net.pos;
  const K = kantenVon(tri, N);
  const E = K.a.length;
  const M = N + E;
  const Q = new Float64Array(3 * M);
  Q.set(P);
  const fest = new Uint8Array(M);
  fest.set(net.fest);
  const pfad = new Map<number, KantenPfad>();
  for (let i = 0; i < E; i++) {
    const a = K.a[i]!;
    const b = K.b[i]!;
    const m = N + i;
    const p = net.pfad.get(a * N + b);
    if (p) {
      const links = new Float64Array(12);
      const rechts = new Float64Array(12);
      for (let x = 0; x < 3; x++) {
        const k0 = p.k[x]!;
        const k1 = p.k[3 + x]!;
        const k2 = p.k[6 + x]!;
        const k3 = p.k[9 + x]!;
        const mitte = (k0 + 3 * k1 + 3 * k2 + k3) / 8;
        Q[3 * m + x] = mitte;
        links[x] = k0;
        links[3 + x] = (k0 + k1) / 2;
        links[6 + x] = (k0 + 2 * k1 + k2) / 4;
        links[9 + x] = mitte;
        rechts[x] = k3;
        rechts[3 + x] = (k2 + k3) / 2;
        rechts[6 + x] = (k1 + 2 * k2 + k3) / 4;
        rechts[9 + x] = mitte;
      }
      pfad.set(a * M + m, { k: links, hart: p.hart });
      pfad.set(b * M + m, { k: rechts, hart: p.hart });
      if (p.hart) fest[m] = 1;
      continue;
    }
    let wa = 0;
    let wb = 0;
    for (let x = 0; x < 3; x++) {
      const d = P[3 * b + x]! - P[3 * a + x]!;
      wa += d * normalen[3 * a + x]!;
      wb -= d * normalen[3 * b + x]!;
    }
    // Mitte der kubischen Kante mit den inneren Kontrollpunkten (2a + b − wa·na)/3 und (2b + a − wb·nb)/3
    for (let x = 0; x < 3; x++) Q[3 * m + x] = 0.5 * (P[3 * a + x]! + P[3 * b + x]!) - 0.125 * (wa * normalen[3 * a + x]! + wb * normalen[3 * b + x]!);
  }
  const T = new Uint32Array(12 * F);
  for (let f = 0; f < F; f++) {
    const a = tri[3 * f]!;
    const b = tri[3 * f + 1]!;
    const c = tri[3 * f + 2]!;
    const ab = N + K.seite[3 * f]!;
    const bc = N + K.seite[3 * f + 1]!;
    const ca = N + K.seite[3 * f + 2]!;
    T.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], 12 * f);
  }
  return { pos: Q, tri: T, fest, pfad };
}

/**
 * Gekrümmte Dreiecke: je Dreieck ein kubisches Flächenstück aus Ecken und Normalen, in `stufe` Schritten je Kante ausgewertet
 * (stufe² Dreiecke je Dreieck). Kanten mit Pfad nehmen dessen Kontrollpunkte. Die Normalen sind je Flächenstück quadratisch
 * gemischt (stetig über die Kanten, an harten Linien je Seite eigene). `normalen`: je Punkt des Netzes (sonst nach der Fläche der
 * Dreiecke gemittelt); sie bestimmen die Wölbung der Kanten und die Schattierung.
 */
export function gekruemmt(
  net: AnzeigeNetz,
  stufe = 4,
  normalen?: ArrayLike<number>,
): { pos: Float32Array; nor: Float32Array; index: Uint32Array } {
  const N = net.pos.length / 3;
  const tri = net.tri;
  const F = tri.length / 3;
  const P = net.pos;
  const Nor = normalen ?? netzNormalen(P, tri);
  const jePatch = ((stufe + 1) * (stufe + 2)) / 2;
  const pos = new Float32Array(3 * jePatch * F);
  const nor = new Float32Array(3 * jePatch * F);
  const index = new Uint32Array(3 * stufe * stufe * F);
  // Kontrollpunkte einer Kante von p nach q: die zwei inneren (bei p, bei q)
  const kante = (p: number, q: number, aus: Float64Array, ab: number): void => {
    const e = net.pfad.get(schluessel(p, q, N));
    if (e) {
      const vor = p < q;
      for (let x = 0; x < 3; x++) {
        aus[ab + x] = e.k[(vor ? 3 : 6) + x]!;
        aus[ab + 3 + x] = e.k[(vor ? 6 : 3) + x]!;
      }
      return;
    }
    let wp = 0;
    let wq = 0;
    for (let x = 0; x < 3; x++) {
      const d = P[3 * q + x]! - P[3 * p + x]!;
      wp += d * Nor[3 * p + x]!;
      wq -= d * Nor[3 * q + x]!;
    }
    for (let x = 0; x < 3; x++) {
      aus[ab + x] = (2 * P[3 * p + x]! + P[3 * q + x]! - wp * Nor[3 * p + x]!) / 3;
      aus[ab + 3 + x] = (2 * P[3 * q + x]! + P[3 * p + x]! - wq * Nor[3 * q + x]!) / 3;
    }
  };
  // Normale in der Mitte einer Kante (quadratisch, PN-Dreiecke): n_p + n_q, gespiegelt an der Ebene quer zur Kante
  const kantenNormale = (p: number, q: number, aus: Float64Array, ab: number): void => {
    let dd = 0;
    let dn = 0;
    for (let x = 0; x < 3; x++) {
      const d = P[3 * q + x]! - P[3 * p + x]!;
      dd += d * d;
      dn += d * (Nor[3 * p + x]! + Nor[3 * q + x]!);
    }
    const v = dd > 0 ? (2 * dn) / dd : 0;
    let l = 0;
    for (let x = 0; x < 3; x++) {
      const h = Nor[3 * p + x]! + Nor[3 * q + x]! - v * (P[3 * q + x]! - P[3 * p + x]!);
      aus[ab + x] = h;
      l += h * h;
    }
    l = Math.sqrt(l) || 1;
    for (let x = 0; x < 3; x++) aus[ab + x] = aus[ab + x]! / l;
  };
  const b = new Float64Array(18);
  const nk = new Float64Array(9);
  let pv = 0;
  let pi = 0;
  for (let f = 0; f < F; f++) {
    const i1 = tri[3 * f]!;
    const i2 = tri[3 * f + 1]!;
    const i3 = tri[3 * f + 2]!;
    // b[0..5]: Kante 1→2 (b210, b120), b[6..11]: Kante 2→3 (b021, b012), b[12..17]: Kante 3→1 (b102, b201)
    kante(i1, i2, b, 0);
    kante(i2, i3, b, 6);
    kante(i3, i1, b, 12);
    kantenNormale(i1, i2, nk, 0);
    kantenNormale(i2, i3, nk, 3);
    kantenNormale(i3, i1, nk, 6);
    const anfang = pv;
    for (let i = 0; i <= stufe; i++)
      for (let j = 0; j <= stufe - i; j++) {
        const u = i / stufe;
        const v = j / stufe;
        const w = 1 - u - v;
        let nl = 0;
        for (let x = 0; x < 3; x++) {
          const p1 = P[3 * i1 + x]!;
          const p2 = P[3 * i2 + x]!;
          const p3 = P[3 * i3 + x]!;
          const e = (b[x]! + b[3 + x]! + b[6 + x]! + b[9 + x]! + b[12 + x]! + b[15 + x]!) / 6;
          const mitte = e + (e - (p1 + p2 + p3) / 3) / 2;
          pos[3 * pv + x] =
            p1 * w * w * w +
            p2 * u * u * u +
            p3 * v * v * v +
            3 * (b[x]! * w * w * u + b[3 + x]! * w * u * u + b[6 + x]! * u * u * v + b[9 + x]! * u * v * v + b[12 + x]! * w * v * v + b[15 + x]! * w * w * v) +
            6 * mitte * u * v * w;
          const h =
            Nor[3 * i1 + x]! * w * w + Nor[3 * i2 + x]! * u * u + Nor[3 * i3 + x]! * v * v + nk[x]! * w * u + nk[3 + x]! * u * v + nk[6 + x]! * w * v;
          nor[3 * pv + x] = h;
          nl += h * h;
        }
        nl = Math.sqrt(nl) || 1;
        nor[3 * pv] = nor[3 * pv]! / nl;
        nor[3 * pv + 1] = nor[3 * pv + 1]! / nl;
        nor[3 * pv + 2] = nor[3 * pv + 2]! / nl;
        pv++;
      }
    // Gitter: Zeile i beginnt bei anfang + i · (stufe + 1) − i · (i − 1) / 2
    const zeile = (i: number): number => anfang + i * (stufe + 1) - (i * (i - 1)) / 2;
    for (let i = 0; i < stufe; i++)
      for (let j = 0; j < stufe - i; j++) {
        const a = zeile(i) + j;
        const c = zeile(i + 1) + j;
        index[pi++] = a;
        index[pi++] = c;
        index[pi++] = a + 1;
        if (j < stufe - i - 1) {
          index[pi++] = a + 1;
          index[pi++] = c;
          index[pi++] = c + 1;
        }
      }
  }
  return { pos, nor, index };
}

/**
 * Wie weit der Pfad der weichen Linien nach dem Unterteilen neben der Fläche liegt. Gemessen an den Punkten der Linienkanten: `quer`
 * längs der Normale der Fläche dort (so weit schwebt die Linie über der Haut oder liegt darunter), `gleiten` in der Fläche (so weit
 * ist der Punkt des Netzes längs der Haut vom Pfad weggerutscht; das ändert die Form nicht). Je größter und mittlerer Wert.
 */
export function linienAbstand(
  net: AnzeigeNetz,
  nor: ArrayLike<number>,
): { quer: { groesster: number; mittel: number }; gleiten: { groesster: number; mittel: number }; kanten: number } {
  const N = net.pos.length / 3;
  let qMax = 0;
  let qSum = 0;
  let gMax = 0;
  let gSum = 0;
  let zahl = 0;
  const messen = (v: number, k: Float64Array, ab: number): void => {
    const dx = k[ab]! - net.pos[3 * v]!;
    const dy = k[ab + 1]! - net.pos[3 * v + 1]!;
    const dz = k[ab + 2]! - net.pos[3 * v + 2]!;
    const q = Math.abs(dx * nor[3 * v]! + dy * nor[3 * v + 1]! + dz * nor[3 * v + 2]!);
    const g = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - q * q));
    qMax = Math.max(qMax, q);
    gMax = Math.max(gMax, g);
    qSum += q;
    gSum += g;
    zahl++;
  };
  for (const [s, e] of net.pfad) {
    if (e.hart) continue;
    messen(Math.floor(s / N), e.k, 0);
    messen(s % N, e.k, 9);
  }
  const m = zahl || 1;
  return { quer: { groesster: qMax, mittel: qSum / m }, gleiten: { groesster: gMax, mittel: gSum / m }, kanten: zahl / 2 };
}
