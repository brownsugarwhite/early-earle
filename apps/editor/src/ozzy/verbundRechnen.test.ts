// Der Verbund (Etappe 5): das Nötigste am Rechner. Zwei Kugeln verschmolzen und abgezogen, mit Kante und rund.
import { beforeAll, describe, expect, it } from 'vitest';
import { type Wasm, manifoldLaden } from '../form/naht';
import { type VerbundAuftrag, type VerbundNetz, VerbundSpeicher, type VerbundTeil, verbundRechnen } from './verbundRechnen';

/** eine Kugel aus einem Zwanzigflach, `stufen`-mal geteilt; `innen`: die Dreiecke andersherum (wie manche Anzeige) */
function kugel(cx: number, cy: number, cz: number, r: number, stufen: number, innen = false): VerbundNetz {
  const t = (1 + Math.sqrt(5)) / 2;
  let P: number[][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  let F: number[][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let s = 0; s < stufen; s++) {
    const mitte = new Map<string, number>();
    const m = (a: number, b: number): number => {
      const k = a < b ? `${a}.${b}` : `${b}.${a}`;
      let i = mitte.get(k);
      if (i === undefined) {
        i = P.length;
        P.push([(P[a]![0]! + P[b]![0]!) / 2, (P[a]![1]! + P[b]![1]!) / 2, (P[a]![2]! + P[b]![2]!) / 2]);
        mitte.set(k, i);
      }
      return i;
    };
    const G: number[][] = [];
    for (const [a, b, c] of F as [number, number, number][]) {
      const ab = m(a, b);
      const bc = m(b, c);
      const ca = m(c, a);
      G.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    F = G;
  }
  P = P.map((p) => {
    const l = Math.hypot(p[0]!, p[1]!, p[2]!);
    return [p[0]! / l, p[1]! / l, p[2]! / l];
  });
  const N = P.length;
  const pos = new Float32Array(3 * N);
  const normal = new Float32Array(3 * N);
  P.forEach((p, i) => {
    normal.set(p, 3 * i);
    pos.set([cx + r * p[0]!, cy + r * p[1]!, cz + r * p[2]!], 3 * i);
  });
  const index = Uint32Array.from(F.flatMap(([a, b, c]) => (innen ? [a!, c!, b!] : [a!, b!, c!])));
  return { pos, normal, index, hoehe: new Float32Array(N), blatt: new Float32Array(2 * N), dehnung: new Float32Array(N).fill(1) };
}

function inhalt(n: VerbundNetz): number {
  let v = 0;
  const P = n.pos;
  for (let t = 0; t < n.index.length; t += 3) {
    const a = 3 * n.index[t]!;
    const b = 3 * n.index[t + 1]!;
    const c = 3 * n.index[t + 2]!;
    v += P[a]! * (P[b + 1]! * P[c + 2]! - P[b + 2]! * P[c + 1]!) + P[a + 1]! * (P[b + 2]! * P[c]! - P[b]! * P[c + 2]!) + P[a + 2]! * (P[b]! * P[c + 1]! - P[b + 1]! * P[c]!);
  }
  return v / 6;
}

/** jede Kante hat genau zwei Dreiecke (nach der Lage der Punkte gezählt): Das Netz ist geschlossen, nichts ist aufgerissen */
function offeneKanten(n: VerbundNetz): number {
  const schl = (v: number): string => `${n.pos[3 * v]},${n.pos[3 * v + 1]},${n.pos[3 * v + 2]}`;
  const zahl = new Map<string, number>();
  for (let t = 0; t < n.index.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = schl(n.index[t + k]!);
      const b = schl(n.index[t + ((k + 1) % 3)]!);
      if (a === b) continue;
      const s = a < b ? `${a}|${b}` : `${b}|${a}`;
      zahl.set(s, (zahl.get(s) ?? 0) + 1);
    }
  let offen = 0;
  for (const z of zahl.values()) if (z !== 2) offen++;
  return offen;
}

/** mittlerer Abstand der Naht von der Achse x (ihr Halbmesser, für zwei Kugeln auf der Achse) */
function nahtHalbmesser(naht: Float32Array): number {
  let s = 0;
  for (let i = 0; i < naht.length; i += 3) s += Math.hypot(naht[i + 1]!, naht[i + 2]!);
  return s / (naht.length / 3);
}

/** Dreiecke, die gegen ihre Normalen zeigen (umgeklappt), und ihr Anteil an der Fläche */
function umgeklappt(n: VerbundNetz): { zahl: number; flaeche: number } {
  let zahl = 0;
  let um = 0;
  let alle = 0;
  const P = n.pos;
  const N = n.normal;
  for (let t = 0; t < n.index.length; t += 3) {
    const a = 3 * n.index[t]!;
    const b = 3 * n.index[t + 1]!;
    const c = 3 * n.index[t + 2]!;
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    const f = Math.hypot(fx, fy, fz) / 2;
    alle += f;
    if (fx * (N[a]! + N[b]! + N[c]!) + fy * (N[a + 1]! + N[b + 1]! + N[c + 1]!) + fz * (N[a + 2]! + N[b + 2]! + N[c + 2]!) < 0) {
      zahl++;
      um += f;
    }
  }
  return { zahl, flaeche: um / alle };
}

/** wie weit die Punkte der Naht in ihrem Abstand von der Achse x und längs der Achse auseinanderliegen (ein ruhiger Ring: beides fast null) */
function nahtUnruhe(naht: Float32Array): number {
  let r0 = Infinity;
  let r1 = -Infinity;
  let x0 = Infinity;
  let x1 = -Infinity;
  for (let i = 0; i < naht.length; i += 3) {
    const r = Math.hypot(naht[i + 1]!, naht[i + 2]!);
    r0 = Math.min(r0, r);
    r1 = Math.max(r1, r);
    x0 = Math.min(x0, naht[i]!);
    x1 = Math.max(x1, naht[i]!);
  }
  return Math.max(r1 - r0, x1 - x0);
}

const teil = (id: number, netz: VerbundNetz, mehr: Partial<VerbundTeil> = {}): VerbundTeil => ({ id, schl: 'a', netz, spiegelbild: false, abzieher: false, rund: 0, ...mehr });
const kugelInhalt = (r: number): number => (4 / 3) * Math.PI * r ** 3;
/** Kugelkappe der Höhe h */
const kappe = (r: number, h: number): number => (Math.PI * h * h * (3 * r - h)) / 3;

describe('Verbund (Etappe 5): der Rechner', () => {
  let w: Wasm;
  beforeAll(async () => {
    w = await manifoldLaden();
  });
  const rechne = (a: Omit<VerbundAuftrag, 'nr'>, sp = new VerbundSpeicher()): ReturnType<typeof verbundRechnen> => verbundRechnen(w, { nr: 1, ...a }, sp);
  // zwei Kugeln auf der Achse x: Halbmesser 1 um 0 und 0,7 um 1,1; ihre Schnittebene und die Kappen
  const R = 1;
  const r = 0.7;
  const D = 1.1;
  const xs = (D * D + R * R - r * r) / (2 * D);
  const linse = kappe(R, R - xs) + kappe(r, r - (D - xs));
  const ring = Math.sqrt(R * R - xs * xs);

  it('verschmelzen mit Kante: ein geschlossenes Netz, die Naht liegt auf beiden Kugeln', () => {
    const e = rechne({ teile: [teil(1, kugel(0, 0, 0, R, 4)), teil(2, kugel(D, 0, 0, r, 4))], koerper: [{ halten: [1, 2], abziehen: [] }] });
    expect(e.fehler).toBeUndefined();
    const n = e.netz!;
    expect(offeneKanten(n)).toBe(0);
    expect(inhalt(n)).toBeGreaterThan(0.985 * (kugelInhalt(R) + kugelInhalt(r) - linse));
    expect(inhalt(n)).toBeLessThan(kugelInhalt(R) + kugelInhalt(r) - linse);
    expect(e.naht.length).toBeGreaterThan(60);
    for (let i = 0; i < e.naht.length; i += 3) {
      expect(Math.abs(Math.hypot(e.naht[i]!, e.naht[i + 1]!, e.naht[i + 2]!) - R)).toBeLessThan(0.01);
      expect(Math.abs(Math.hypot(e.naht[i]! - D, e.naht[i + 1]!, e.naht[i + 2]!) - r)).toBeLessThan(0.01);
    }
    expect(Math.abs(nahtHalbmesser(e.naht) - ring)).toBeLessThan(0.01);
    // Umrisse von allen drei Achsen
    for (const u of e.umriss) expect(u.length).toBeGreaterThan(60);
  });

  it('eine Haut mit Dreiecken andersherum gibt dasselbe', () => {
    const a = rechne({ teile: [teil(1, kugel(0, 0, 0, R, 3)), teil(2, kugel(D, 0, 0, r, 3))], koerper: [{ halten: [1, 2], abziehen: [] }] });
    const b = rechne({ teile: [teil(1, kugel(0, 0, 0, R, 3, true)), teil(2, kugel(D, 0, 0, r, 3))], koerper: [{ halten: [1, 2], abziehen: [] }] });
    expect(inhalt(b.netz!)).toBeCloseTo(inhalt(a.netz!), 5);
  });

  it('abziehen: Die Wand des Lochs zeigt in das Loch, und der Abzieher beißt', () => {
    const e = rechne({ teile: [teil(1, kugel(0, 0, 0, R, 4)), teil(2, kugel(D, 0, 0, r, 4), { abzieher: true })], koerper: [{ halten: [1], abziehen: [2] }] });
    const n = e.netz!;
    expect(e.beisst).toEqual([2]);
    expect(offeneKanten(n)).toBe(0);
    expect(inhalt(n)).toBeGreaterThan(0.98 * (kugelInhalt(R) - linse));
    expect(inhalt(n)).toBeLessThan(1.01 * (kugelInhalt(R) - linse));
    let wand = 0;
    for (let v = 0; v < n.pos.length / 3; v++) {
      const dx = D - n.pos[3 * v]!;
      const dy = -n.pos[3 * v + 1]!;
      const dz = -n.pos[3 * v + 2]!;
      // ein Punkt auf der Wand des Lochs (auf der kleinen Kugel, deutlich in der großen)
      if (Math.abs(Math.hypot(dx, dy, dz) - r) > 1e-3 || Math.hypot(n.pos[3 * v]!, n.pos[3 * v + 1]!, n.pos[3 * v + 2]!) > R - 0.05) continue;
      wand++;
      expect(dx * n.normal[3 * v]! + dy * n.normal[3 * v + 1]! + dz * n.normal[3 * v + 2]!).toBeGreaterThan(0.9 * r);
    }
    expect(wand).toBeGreaterThan(50);
    // weit weg: nichts
    const fern = rechne({ teile: [teil(1, kugel(0, 0, 0, R, 3)), teil(2, kugel(5, 0, 0, r, 3), { abzieher: true })], koerper: [{ halten: [1], abziehen: [2] }] });
    expect(fern.beisst).toEqual([]);
    expect(inhalt(fern.netz!)).toBeGreaterThan(0.97 * kugelInhalt(R));
  });

  it('rund: nichts reißt, fern der Naht bleibt alles, grob und fein geben dieselbe Rundung', () => {
    const k = 0.3;
    const mit = (stufen: number, abzieher: boolean, rund: number): ReturnType<typeof verbundRechnen> =>
      rechne({ teile: [teil(1, kugel(0, 0, 0, R, stufen)), teil(2, kugel(D, 0, 0, r, stufen), { abzieher, rund })], koerper: [abzieher ? { halten: [1], abziehen: [2] } : { halten: [1, 2], abziehen: [] }] });
    const kante = mit(4, false, 0);
    const rund = mit(4, false, k);
    expect(offeneKanten(rund.netz!)).toBe(0);
    // verschmolzen füllt die Rundung die Kehle: mehr Inhalt, die Naht liegt weiter außen
    expect(inhalt(rund.netz!)).toBeGreaterThan(inhalt(kante.netz!) + 0.01);
    const h4 = nahtHalbmesser(rund.naht);
    expect(h4).toBeGreaterThan(ring + 0.03);
    expect(h4).toBeLessThan(ring + 0.2);
    // kein Dreieck klappt um (an der Naht liegen hauchdünne: Sie müssen genau mit ihr mitgehen)
    expect(umgeklappt(kante.netz!).zahl).toBe(0);
    expect(umgeklappt(rund.netz!).zahl).toBe(0);
    expect(umgeklappt(mit(3, false, k).netz!).zahl).toBe(0);
    // die Naht bleibt ein ruhiger Ring (an ihr liegen die Punkte sehr ungleich dicht: Nichts davon darf sich in ihrer Lage zeigen)
    expect(nahtUnruhe(kante.naht)).toBeLessThan(0.01);
    expect(nahtUnruhe(rund.naht)).toBeLessThan(0.012);
    expect(nahtUnruhe(mit(3, false, k).naht)).toBeLessThan(0.02);
    // dieselbe Rundung am gröberen Netz (beim Ziehen grob, in Ruhe fein: kein Sprung)
    const h3 = nahtHalbmesser(mit(3, false, k).naht);
    expect(Math.abs(h3 - h4)).toBeLessThan(0.012);
    // fern der Naht (die abgewandte Seite der großen Kugel) hat sich kein Punkt bewegt
    const a = kante.netz!;
    const b = rund.netz!;
    let fern = 0;
    const lagen = new Set<string>();
    for (let v = 0; v < a.pos.length / 3; v++) if (a.pos[3 * v]! < -0.2) lagen.add(`${a.pos[3 * v]},${a.pos[3 * v + 1]},${a.pos[3 * v + 2]}`);
    for (let v = 0; v < b.pos.length / 3; v++)
      if (b.pos[3 * v]! < -0.2) {
        fern++;
        expect(lagen.has(`${b.pos[3 * v]},${b.pos[3 * v + 1]},${b.pos[3 * v + 2]}`)).toBe(true);
      }
    expect(fern).toBeGreaterThan(200);
    // die Normalen bleiben Einheiten und zeigen nach außen (zum Betrachter hin, weg von der Achse oder den Mitten)
    for (let v = 0; v < b.normal.length; v += 3) expect(Math.abs(Math.hypot(b.normal[v]!, b.normal[v + 1]!, b.normal[v + 2]!) - 1)).toBeLessThan(1e-3);
    // abgezogen nimmt die Rundung am Rand des Lochs weg: weniger Inhalt, nichts reißt
    const lochKante = mit(4, true, 0);
    const lochRund = mit(4, true, k);
    expect(offeneKanten(lochRund.netz!)).toBe(0);
    expect(umgeklappt(lochRund.netz!).zahl).toBe(0);
    expect(inhalt(lochRund.netz!)).toBeLessThan(inhalt(lochKante.netz!) - 0.005);
    expect(inhalt(lochRund.netz!)).toBeGreaterThan(0.9 * inhalt(lochKante.netz!));
  });

  it('ein Hals, der schmaler wird: etwa doppelt so dick wie der Schnittkreis, und mit ihm gegen null', () => {
    // (Abstand der Mitten kurz vor dem Trennen bei 1,7; `ring`: der Schnittkreis der zwei Kugeln, `hals`: die Naht nach der Rundung)
    const mit = (abstand: number): { ring: number; hals: number; unruhe: number } => {
      const e = rechne({ teile: [teil(1, kugel(0, 0, 0, R, 4)), teil(2, kugel(abstand, 0, 0, r, 4), { rund: 0.3 })], koerper: [{ halten: [1, 2], abziehen: [] }] });
      const x = (abstand * abstand + R * R - r * r) / (2 * abstand);
      expect(umgeklappt(e.netz!).flaeche).toBeLessThan(1e-5);
      return { ring: Math.sqrt(Math.max(0, R * R - x * x)), hals: nahtHalbmesser(e.naht), unruhe: nahtUnruhe(e.naht) };
    };
    const eng = mit(1.62);
    const fast = mit(1.69);
    const hauch = mit(1.698);
    for (const m of [eng, fast, hauch]) {
      expect(m.hals).toBeGreaterThan(m.ring);
      expect(m.hals).toBeLessThan(2.4 * m.ring + 0.02);
      expect(m.unruhe).toBeLessThan(0.03);
    }
    expect(fast.hals).toBeLessThan(eng.hals);
    expect(hauch.hals).toBeLessThan(fast.hals);
    expect(hauch.hals).toBeLessThan(0.12);
  });

  it('abgebildet statt neu angelegt: derselbe Verbund (ein Zug am ganzen Objekt schickt nur noch die Abbildung)', () => {
    const sp = new VerbundSpeicher();
    const gross = teil(1, kugel(0, 0, 0, R, 4), { schl: 'g' });
    // das kleine an seinem Ort …
    const dort = rechne({ teile: [gross, teil(2, kugel(D, 0.2, 0.1, r, 4), { schl: 'dort', abzieher: true, rund: 0.2 })], koerper: [{ halten: [1], abziehen: [2] }] }, sp);
    // … und dasselbe aus dem Ursprung, um die Achse z um 90 Grad gedreht und dorthin geschoben (Spalten der Drehung, dann der Versatz)
    const basis = teil(2, kugel(0, 0, 0, r, 4), { schl: 'basis', abzieher: true, rund: 0.2 });
    const hin = rechne({ teile: [{ ...gross, netz: null }, { ...basis, abbildung: [0, 1, 0, -1, 0, 0, 0, 0, 1, D, 0.2, 0.1] }], koerper: [{ halten: [1], abziehen: [2] }] }, sp);
    expect(hin.fehler).toBeUndefined();
    expect(hin.beisst).toEqual([2]);
    expect(offeneKanten(hin.netz!)).toBe(0);
    expect(umgeklappt(hin.netz!).flaeche).toBeLessThan(1e-5);
    // (das gedrehte Netz schneidet an anderen Stellen: derselbe Körper, nicht dieselben Punkte)
    expect(Math.abs(inhalt(hin.netz!) / inhalt(dort.netz!) - 1)).toBeLessThan(2e-3);
    // die Wand des Lochs zeigt in das Loch, auch gedreht
    const n = hin.netz!;
    let wand = 0;
    for (let v = 0; v < n.pos.length / 3; v++) {
      const dx = D - n.pos[3 * v]!;
      const dy = 0.2 - n.pos[3 * v + 1]!;
      const dz = 0.1 - n.pos[3 * v + 2]!;
      if (Math.abs(Math.hypot(dx, dy, dz) - r) > 1e-3 || Math.hypot(n.pos[3 * v]!, n.pos[3 * v + 1]!, n.pos[3 * v + 2]!) > R - 0.15) continue;
      wand++;
      expect(dx * n.normal[3 * v]! + dy * n.normal[3 * v + 1]! + dz * n.normal[3 * v + 2]!).toBeGreaterThan(0.9 * r);
    }
    expect(wand).toBeGreaterThan(30);
    // noch einmal an anderem Ort: Das Netz muss nicht wieder kommen
    const weiter = rechne({ teile: [{ ...gross, netz: null }, { ...basis, netz: null, abbildung: [1, 0, 0, 0, 1, 0, 0, 0, 1, 5, 0, 0] }], koerper: [{ halten: [1], abziehen: [2] }] }, sp);
    expect(weiter.beisst).toEqual([]);
    expect(weiter.fehlt).toEqual([]);
    sp.leeren();
  });

  it('Spiegelbild und Speicher: das Spiegelbild gehört dazu, ein bekanntes Netz muss nicht noch einmal kommen', () => {
    const sp = new VerbundSpeicher();
    const a = teil(1, kugel(0, 0, 0.5, R, 3), { spiegelbild: true, schl: 's1' });
    const b = teil(2, kugel(D, 0, 0, r, 3), { schl: 's1' });
    const e = rechne({ teile: [a, b], koerper: [{ halten: [1, 2], abziehen: [] }] }, sp);
    const n = e.netz!;
    expect(offeneKanten(n)).toBe(0);
    // spiegelgleich: so viel Inhalt wie zwei Kugeln im Abstand 1 (und mehr als eine)
    expect(inhalt(n)).toBeGreaterThan(1.3 * kugelInhalt(R));
    // die Normalen des Spiegelbilds zeigen von seiner Mitte weg
    let unten = 0;
    for (let v = 0; v < n.pos.length / 3; v++) {
      if (n.pos[3 * v + 2]! > -1.2 || n.pos[3 * v]! > 0.3) continue;
      unten++;
      expect(n.pos[3 * v]! * n.normal[3 * v]! + n.pos[3 * v + 1]! * n.normal[3 * v + 1]! + (n.pos[3 * v + 2]! + 0.5) * n.normal[3 * v + 2]!).toBeGreaterThan(0.9 * R);
    }
    expect(unten).toBeGreaterThan(20);
    // derselbe Stand ohne Netze: aus dem Speicher
    const wieder = rechne({ teile: [{ ...a, netz: null }, { ...b, netz: null }], koerper: [{ halten: [1, 2], abziehen: [] }] }, sp);
    expect(inhalt(wieder.netz!)).toBeCloseTo(inhalt(n), 6);
    // ein unbekannter Stand ohne Netz: Der Rechner sagt, was fehlt
    const fehlt = rechne({ teile: [{ ...a, netz: null, schl: 's2' }, { ...b, netz: null }], koerper: [{ halten: [1, 2], abziehen: [] }] }, sp);
    expect(fehlt.netz).toBeNull();
    expect(fehlt.fehlt).toEqual([1]);
    sp.leeren();
  });
});
