 
// Gegenprüfung „Lineare Algebra“ (10.11.2026): gemeinsame Hilfen der Messskripte. Liest nur aus dem Arbeitsbaum.
const W = '../../../../../../packages/shape/src';
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { KETTE_K, type KruemmungsKetten } from '../../../../../../packages/shape/src/dicht/kruemmung';
import { type Bindungen, type Haut, gewichteAus, hautAus } from '../../../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  bindungenAus,
  griffeAnlegen,
  kantenGewichte,
  kreuzungenZwischen,
  kruemmungsKetten,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
} from '../../../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../../../packages/shape/src/dicht/rund';
import type { NormalZeile } from '../../../../../../packages/shape/src/loeser/normalSystem';

export const WURZEL = W;
void KETTE_K;

export type Stand = { h: Haut; loops: Loop[] };

export function kugel(dreiecke: number): Haut {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  return hautAus(n.positionen, n.indizes);
}

/** Kugel mit drei Loops wie `form-netzunabhaengig.ts` (Ring waagerecht, Mitte, Ring senkrecht), eingesetzt, mit Kreuzungen und Griffen */
export function dreiLoops(dreiecke: number, anzahl = 3): Stand {
  let h = kugel(dreiecke);
  let loops: Loop[] = [];
  const schnitte = [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const;
  for (const [a, A, B] of schnitte.slice(0, anzahl)) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let j = 0; j < loops.length; j++) {
    for (let i = 0; i < j; i++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
    griffeAnlegen(loops[j]!);
  }
  return { h, loops };
}

export type Systeme = {
  bind: Bindungen;
  ketten: KruemmungsKetten;
  gew: Float64Array[];
  /** Lagen: Laplace-Zeilen + Bindungen (wie ausKurven.ts 266–301, ganze Haut) */
  lagen: NormalZeile[];
  /** Zahl der Laplace-Zeilen am Anfang von `lagen` */
  nLaplace: number;
  /** Krümmung „gleich“ (wie ausKurven.ts 362–415) */
  quelle: Float64Array;
  cFrei: Int32Array;
  cNr: Int32Array;
  cDiag: Float64Array;
  kruemmung: NormalZeile[];
};

export const HALT = 1e-6;

/** Die Zeilen, die `HautAusKurven` (Art „gleich“, ganze Haut) zerlegt — nachgebaut aus ausKurven.ts, damit die Matrix messbar ist */
export function systemeAus(s: Stand, gewicht = 100, halt = HALT): Systeme {
  const { h, loops } = s;
  const n = h.n;
  const plan = bindungenAus(h, loops);
  const bind = plan.bind;
  const ketten = kruemmungsKetten(plan, loops);
  const kanten = kantenGewichte(h, loops);
  const gew = gewichteAus(h, kanten);
  const lagen: NormalZeile[] = [];
  for (let i = 0; i < n; i++) {
    const nb = h.nachbarn[i]!;
    const g = gew[i]!;
    const index: number[] = [i];
    const wert: number[] = [1];
    nb.forEach((j, k) => {
      if (g[k] === 0) return;
      index.push(j);
      wert.push(-g[k]!);
    });
    lagen.push({ index, wert, gewicht: 1 });
  }
  const nLaplace = lagen.length;
  const m = bind.ecken.length / 3;
  for (let j = 0; j < m; j++) {
    const index: number[] = [];
    const wert: number[] = [];
    for (let e = 0; e < 3; e++) {
      if (bind.b[3 * j + e] === 0) continue;
      index.push(bind.ecken[3 * j + e]!);
      wert.push(bind.b[3 * j + e]!);
    }
    if (index.length === 0) continue;
    lagen.push({ index, wert, gewicht });
  }
  const quelle = new Float64Array(n).fill(-1);
  for (let j = 0; j < m; j++) {
    const v = bind.ecken[3 * j]!;
    if (bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v || !ketten.kette[j]) continue;
    const w = ketten.ecke[j] || ketten.kante[j] ? 0 : 1;
    quelle[v] = quelle[v]! < 0 ? w : Math.min(quelle[v]!, w);
  }
  const cNr = new Int32Array(n).fill(-1);
  const cFrei: number[] = [];
  for (let v = 0; v < n; v++) {
    if (quelle[v]! >= 0) continue;
    cNr[v] = cFrei.length;
    cFrei.push(v);
  }
  const cDiag = Float64Array.from(cFrei, (v) => {
    const g = gew[v]!;
    let d = 1;
    h.nachbarn[v]!.forEach((w, k) => {
      const q = quelle[w]!;
      if (q >= 0) d -= g[k]! * (1 - q);
    });
    return d;
  });
  const kruemmung: NormalZeile[] = [];
  cFrei.forEach((v, u) => {
    const g = gew[v]!;
    const index: number[] = [u];
    const wert: number[] = [cDiag[u]!];
    h.nachbarn[v]!.forEach((w, k) => {
      if (cNr[w]! < 0 || g[k] === 0) return;
      index.push(cNr[w]!);
      wert.push(-g[k]!);
    });
    kruemmung.push({ index, wert, gewicht: 1 });
    if (halt > 0) kruemmung.push({ index: [u], wert: [1], gewicht: halt });
  });
  return { bind, ketten, gew, lagen, nLaplace, quelle, cFrei: Int32Array.from(cFrei), cNr, cDiag, kruemmung };
}

/** Graph der Matrix Σ aᵀa: je Unbekannte ihre Nachbarn (sortiert, ohne Doppelte, ohne sich selbst), CSR */
export type Graph = { n: number; st: Int32Array; nb: Int32Array };
export function graphAus(n: number, zeilen: readonly NormalZeile[]): Graph {
  const sets: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (const z of zeilen) {
    const m = z.index.length;
    for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) if (z.index[a] !== z.index[b]) sets[z.index[a]!]!.add(z.index[b]!);
  }
  const st = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) st[i + 1] = st[i]! + sets[i]!.size;
  const nb = new Int32Array(st[n]!);
  for (let i = 0; i < n; i++) {
    const a = Int32Array.from(sets[i]!).sort();
    nb.set(a, st[i]!);
  }
  return { n, st, nb };
}

export type Symbolik = {
  eltern: Int32Array;
  /** Einträge je Spalte von L (mit Diagonale), in neuer Reihenfolge */
  anzahl: Int32Array;
  nnzL: number;
  /** Multiplikationen-und-Additionen der Zerlegung: Σ c(c−1)/2 */
  flops: number;
  /** größte Spalte, Tiefe des Baums */
  maxSpalte: number;
};

/** Symbolische Zerlegung für eine Reihenfolge (perm: neu → alt): Eliminationsbaum und Spaltenlängen (wie zerlegung.ts 210–236) */
export function symbolik(g: Graph, perm: Int32Array): Symbolik {
  const { n, st, nb } = g;
  const ip = new Int32Array(n);
  for (let k = 0; k < n; k++) ip[perm[k]!] = k;
  const eltern = new Int32Array(n).fill(-1);
  const vorfahr = new Int32Array(n).fill(-1);
  for (let k = 0; k < n; k++) {
    const a = perm[k]!;
    for (let p = st[a]!; p < st[a + 1]!; p++) {
      let i = ip[nb[p]!]!;
      if (i >= k) continue;
      while (i !== -1 && i < k) {
        const weiter = vorfahr[i]!;
        vorfahr[i] = k;
        if (weiter === -1) eltern[i] = k;
        i = weiter;
      }
    }
  }
  const merk = new Int32Array(n).fill(-1);
  const anzahl = new Int32Array(n).fill(1);
  for (let k = 0; k < n; k++) {
    merk[k] = k;
    const a = perm[k]!;
    for (let p = st[a]!; p < st[a + 1]!; p++) {
      let i = ip[nb[p]!]!;
      if (i >= k) continue;
      while (merk[i] !== k) {
        anzahl[i] = anzahl[i]! + 1;
        merk[i] = k;
        i = eltern[i]!;
      }
    }
  }
  let nnzL = 0;
  let flops = 0;
  let maxSpalte = 0;
  for (let j = 0; j < n; j++) {
    const c = anzahl[j]!;
    nnzL += c;
    flops += (c * (c - 1)) / 2;
    if (c > maxSpalte) maxSpalte = c;
  }
  return { eltern, anzahl, nnzL, flops, maxSpalte };
}

/** Einträge der unteren Hälfte der Matrix (mit Diagonale) */
export const nnzUnten = (g: Graph): number => g.n + g.nb.length / 2;

// ---------------------------------------------------------------------------------------------------------------------------------
// Reihenfolgen

export function natuerlich(n: number): Int32Array {
  const p = new Int32Array(n);
  for (let i = 0; i < n; i++) p[i] = i;
  return p;
}

/** Reverse Cuthill-McKee (wie glattLoeser.ts 41–62) */
export function rcm(g: Graph): Int32Array {
  const { n, st, nb } = g;
  const grad = (k: number) => st[k + 1]! - st[k]!;
  const besucht = new Uint8Array(n);
  const reihenfolge: number[] = [];
  const offen = Array.from({ length: n }, (_, k) => k).sort((a, b) => grad(a) - grad(b));
  for (const s of offen) {
    if (besucht[s]) continue;
    besucht[s] = 1;
    const schlange = [s];
    for (let q = 0; q < schlange.length; q++) {
      const k = schlange[q]!;
      reihenfolge.push(k);
      const nachbarn: number[] = [];
      for (let p = st[k]!; p < st[k + 1]!; p++) if (!besucht[nb[p]!]) nachbarn.push(nb[p]!);
      nachbarn.sort((a, b) => grad(a) - grad(b));
      for (const x of nachbarn) {
        besucht[x] = 1;
        schlange.push(x);
      }
    }
  }
  return Int32Array.from(reihenfolge.reverse());
}

/** Hülle (Profil) einer Reihenfolge: Σ (p − erste Spalte + 1), wie `normalSystem` sie belegt */
export function huelle(g: Graph, perm: Int32Array): number {
  const { n, st, nb } = g;
  const ip = new Int32Array(n);
  for (let k = 0; k < n; k++) ip[perm[k]!] = k;
  let s = 0;
  for (let k = 0; k < n; k++) {
    let lo = k;
    const a = perm[k]!;
    for (let p = st[a]!; p < st[a + 1]!; p++) lo = Math.min(lo, ip[nb[p]!]!);
    s += k - lo + 1;
  }
  return s;
}

/**
 * Genauer kleinster Grad auf dem Eliminationsgraphen (ohne Näherungen; langsam, nur als Vergleichsreihenfolge). `knoten`: nur dieser
 * Teilgraph (Kanten nach außen zählen nicht). Liefert die Knoten in Eliminationsreihenfolge.
 */
export function kleinsterGrad(g: Graph, knoten?: Int32Array): Int32Array {
  const { st, nb } = g;
  const liste = knoten ?? natuerlich(g.n);
  const m = liste.length;
  const lokal = new Map<number, number>();
  if (knoten) liste.forEach((v, i) => lokal.set(v, i));
  const adj: (Set<number> | null)[] = new Array(m);
  for (let i = 0; i < m; i++) {
    const v = liste[i]!;
    const s = new Set<number>();
    for (let p = st[v]!; p < st[v + 1]!; p++) {
      const u = knoten ? lokal.get(nb[p]!) : nb[p]!;
      if (u !== undefined) s.add(u);
    }
    adj[i] = s;
  }
  // Eimer je Grad, träge gepflegt
  const eimer: number[][] = [];
  const grad = new Int32Array(m);
  const lege = (v: number) => {
    const d = adj[v]!.size;
    grad[v] = d;
    (eimer[d] ??= []).push(v);
  };
  for (let i = 0; i < m; i++) lege(i);
  const aus = new Int32Array(m);
  let fertig = 0;
  let dMin = 0;
  const weg = new Uint8Array(m);
  while (fertig < m) {
    // kleinster gültiger Eintrag
    let v = -1;
    for (; dMin < eimer.length; dMin++) {
      const e = eimer[dMin];
      if (!e) continue;
      while (e.length) {
        const x = e.pop()!;
        if (!weg[x] && grad[x] === dMin && adj[x]!.size === dMin) {
          v = x;
          break;
        }
      }
      if (v >= 0) break;
    }
    if (v < 0) break;
    const N = Array.from(adj[v]!);
    // der Rest ist eine Clique: Reihenfolge egal
    if (N.length === m - fertig - 1) {
      aus[fertig++] = v;
      weg[v] = 1;
      for (const u of N) {
        aus[fertig++] = u;
        weg[u] = 1;
      }
      break;
    }
    aus[fertig++] = v;
    weg[v] = 1;
    adj[v] = null;
    for (const u of N) adj[u]!.delete(v);
    for (let a = 0; a < N.length; a++) {
      const sa = adj[N[a]!]!;
      for (let b = a + 1; b < N.length; b++) {
        const ub = N[b]!;
        if (!sa.has(ub)) {
          sa.add(ub);
          adj[ub]!.add(N[a]!);
        }
      }
    }
    let kleinstes = Infinity;
    for (const u of N) {
      lege(u);
      if (grad[u]! < kleinstes) kleinstes = grad[u]!;
    }
    if (kleinstes < dMin) dMin = kleinstes;
  }
  return knoten ? aus.map((i) => liste[i]!) : aus;
}

export type NdOpt = {
  blatt: number;
  /** Blätter: wie sie sind (Code) oder nach kleinstem Grad im Blatt */
  blaetter: 'roh' | 'grad';
  /** Trenner: mittlere Ebene der Breitensuche (Code) oder Koordinatenschnitt (längste Achse, Median) */
  trenner: 'ebene' | 'koordinate';
  /** Lagen je Unbekannte (3 je Knoten) für den Koordinatenschnitt */
  lage?: Float64Array;
};

/** Verschachtelte Zerlegung: Nachbau von zerlegung.ts 335–443 mit Stellschrauben (Blattgröße, Blattordnung, Trenner) */
export function verschachtelt(g: Graph, o: NdOpt): Int32Array {
  const { n, st, nb } = g;
  const ordnung = new Int32Array(n);
  let frei = 0;
  const teil = new Int32Array(n);
  let teile = 0;
  const besucht = new Int32Array(n).fill(-1);
  let stempel = 0;
  const ebene = new Int32Array(n);
  const q = new Int32Array(n);
  const breite = (r: number, t: number): [number, number] => {
    const s = ++stempel;
    let kopf = 0;
    let ende = 0;
    q[ende++] = r;
    besucht[r] = s;
    ebene[r] = 0;
    let tief = 0;
    while (kopf < ende) {
      const v = q[kopf++]!;
      const e = ebene[v]! + 1;
      for (let p = st[v]!; p < st[v + 1]!; p++) {
        const u = nb[p]!;
        if (teil[u] !== t || besucht[u] === s) continue;
        besucht[u] = s;
        ebene[u] = e;
        if (e > tief) tief = e;
        q[ende++] = u;
      }
    }
    return [ende, tief];
  };
  const blattLegen = (knoten: Int32Array) => {
    const k = o.blaetter === 'grad' && knoten.length > 2 ? kleinsterGrad(g, knoten) : knoten;
    ordnung.set(k, frei);
    frei += knoten.length;
  };
  const zerlegen = (knoten: Int32Array): void => {
    if (knoten.length <= o.blatt) {
      blattLegen(knoten);
      return;
    }
    const t = ++teile;
    for (let i = 0; i < knoten.length; i++) teil[knoten[i]!] = t;
    const [m] = breite(knoten[0]!, t);
    if (m < knoten.length) {
      const stuecke: Int32Array[] = [];
      for (let i = 0; i < knoten.length; i++) {
        const v = knoten[i]!;
        if (teil[v] !== t) continue;
        const stueck = q.slice(0, breite(v, t)[0]);
        for (let j = 0; j < stueck.length; j++) teil[stueck[j]!] = -1;
        stuecke.push(stueck);
      }
      for (const s of stuecke) zerlegen(s);
      return;
    }
    const vorn: number[] = [];
    const hinten: number[] = [];
    const trenner: number[] = [];
    if (o.trenner === 'koordinate' && o.lage) {
      // längste Achse, Median; Trenner = Knoten der vorderen Seite mit einem Nachbarn auf der hinteren
      const L = o.lage;
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < knoten.length; i++)
        for (let c = 0; c < 3; c++) {
          const x = L[3 * knoten[i]! + c]!;
          if (x < lo[c]!) lo[c] = x;
          if (x > hi[c]!) hi[c] = x;
        }
      let c = 0;
      for (let k = 1; k < 3; k++) if (hi[k]! - lo[k]! > hi[c]! - lo[c]!) c = k;
      const werte = Float64Array.from(knoten, (v) => L[3 * v + c]!).sort();
      const med = werte[werte.length >> 1]!;
      const seite = (v: number) => (L[3 * v + c]! < med ? 0 : 1);
      for (let i = 0; i < knoten.length; i++) {
        const v = knoten[i]!;
        if (seite(v) === 1) {
          hinten.push(v);
          continue;
        }
        let trennt = false;
        for (let p = st[v]!; p < st[v + 1]! && !trennt; p++) {
          const u = nb[p]!;
          if (teil[u] === t && seite(u) === 1) trennt = true;
        }
        (trennt ? trenner : vorn).push(v);
      }
      if (vorn.length === 0 || hinten.length === 0) {
        vorn.length = 0;
        hinten.length = 0;
        trenner.length = 0;
      }
    }
    if (vorn.length === 0 && hinten.length === 0) {
      let r = q[m - 1]!;
      let tief = breite(r, t)[1];
      for (let runde = 0; runde < 4; runde++) {
        const r2 = q[m - 1]!;
        const t2 = breite(r2, t)[1];
        if (t2 > tief) {
          r = r2;
          tief = t2;
        } else {
          breite(r, t);
          break;
        }
      }
      if (tief < 2) {
        blattLegen(knoten);
        return;
      }
      const zahl = new Int32Array(tief + 1);
      for (let i = 0; i < m; i++) zahl[ebene[q[i]!]!] = zahl[ebene[q[i]!]!]! + 1;
      let k = 0;
      for (let summe = 0; k <= tief; k++) {
        summe += zahl[k]!;
        if (2 * summe >= m) break;
      }
      k = Math.max(1, Math.min(tief - 1, k));
      for (let i = 0; i < m; i++) {
        const v = q[i]!;
        const e = ebene[v]!;
        if (e > k) hinten.push(v);
        else if (e < k) vorn.push(v);
        else {
          let trennt = false;
          for (let p = st[v]!; p < st[v + 1]! && !trennt; p++) {
            const u = nb[p]!;
            if (teil[u] === t && ebene[u] === k + 1) trennt = true;
          }
          (trennt ? trenner : vorn).push(v);
        }
      }
    }
    zerlegen(Int32Array.from(vorn));
    zerlegen(Int32Array.from(hinten));
    // der Trenner gehört beim Zerlegen der Seiten nicht mehr zum Teil
    ordnung.set(trenner, frei);
    frei += trenner.length;
  };
  zerlegen(natuerlich(n));
  return ordnung;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Matrix anwenden, Eigenwerte

/** y = (Σ g aᵀa + ε) x */
export function anwenden(zeilen: readonly NormalZeile[], eps: number, x: Float64Array, y: Float64Array): void {
  for (let i = 0; i < x.length; i++) y[i] = eps * x[i]!;
  for (const z of zeilen) {
    let s = 0;
    for (let t = 0; t < z.index.length; t++) s += z.wert[t]! * x[z.index[t]!]!;
    s *= z.gewicht;
    for (let t = 0; t < z.index.length; t++) y[z.index[t]!] = y[z.index[t]!]! + s * z.wert[t]!;
  }
}

const norm = (x: Float64Array) => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s);
};

/** größter Eigenwert (Potenzmethode) */
export function groessterEigenwert(n: number, zeilen: readonly NormalZeile[], eps: number, schritte = 200): number {
  let x = Float64Array.from({ length: n }, (_, i) => Math.sin(1 + 7.3 * i) + 0.1);
  const y = new Float64Array(n);
  let lam = 0;
  for (let k = 0; k < schritte; k++) {
    const nx = norm(x);
    for (let i = 0; i < n; i++) x[i] = x[i]! / nx;
    anwenden(zeilen, eps, x, y);
    let l = 0;
    for (let i = 0; i < n; i++) l += x[i]! * y[i]!;
    lam = l;
    x = Float64Array.from(y);
  }
  return lam;
}

/** kleinster Eigenwert (inverse Iteration mit einem Löser für eine Spalte) */
export function kleinsterEigenwert(n: number, loesen: (b: Float64Array) => Float64Array, zeilen: readonly NormalZeile[], eps: number, schritte = 60): number {
  let x = Float64Array.from({ length: n }, (_, i) => Math.cos(2 + 3.1 * i) + 0.2);
  const y = new Float64Array(n);
  let lam = 0;
  for (let k = 0; k < schritte; k++) {
    const nx = norm(x);
    for (let i = 0; i < n; i++) x[i] = x[i]! / nx;
    anwenden(zeilen, eps, x, y);
    let l = 0;
    for (let i = 0; i < n; i++) l += x[i]! * y[i]!;
    lam = l;
    x = loesen(x);
  }
  return lam;
}

export const median = (a: number[]): number => {
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1]!;
};
export const f = (x: number, d = 0): string => x.toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });
