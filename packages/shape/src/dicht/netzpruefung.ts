// Form zuerst (04.11.2026): Prüfungen an fertigen Netzen (für Tests und Prüfskripte).

/** Teile nach Lage verschweißt: Gehört jede Kante zu genau zwei Dreiecken? (offen = Kanten mit einem, mehr = mit mehr als zwei) */
export function dichtNachLage(teile: readonly { p: Float32Array; i: Uint32Array }[]): { offen: number; mehr: number } {
  const id = new Map<string, number>();
  const kanten = new Map<string, number>();
  const nr = (p: Float32Array, v: number) => {
    const k = `${p[3 * v]!.toFixed(3)},${p[3 * v + 1]!.toFixed(3)},${p[3 * v + 2]!.toFixed(3)}`;
    let n = id.get(k);
    if (n === undefined) id.set(k, (n = id.size));
    return n;
  };
  for (const { p, i } of teile) {
    for (let t = 0; t < i.length; t += 3) {
      const e = [nr(p, i[t]!), nr(p, i[t + 1]!), nr(p, i[t + 2]!)];
      if (e[0] === e[1] || e[1] === e[2] || e[2] === e[0]) continue;
      for (let k = 0; k < 3; k++) {
        const a = e[k]!;
        const b = e[(k + 1) % 3]!;
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        kanten.set(key, (kanten.get(key) ?? 0) + 1);
      }
    }
  }
  let offen = 0;
  let mehr = 0;
  for (const n of kanten.values()) {
    if (n < 2) offen++;
    if (n > 2) mehr++;
  }
  return { offen, mehr };
}

/** Dreiecke, deren Fläche gegen ihre Punktnormalen zeigt (umgeklappt). */
export function umgeklappt(p: Float32Array, n: Float32Array, ind: Uint32Array): number {
  let z = 0;
  for (let t = 0; t < ind.length; t += 3) {
    const a = ind[t]!;
    const b = ind[t + 1]!;
    const c = ind[t + 2]!;
    const abx = p[3 * b]! - p[3 * a]!;
    const aby = p[3 * b + 1]! - p[3 * a + 1]!;
    const abz = p[3 * b + 2]! - p[3 * a + 2]!;
    const acx = p[3 * c]! - p[3 * a]!;
    const acy = p[3 * c + 1]! - p[3 * a + 1]!;
    const acz = p[3 * c + 2]! - p[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    const sx = n[3 * a]! + n[3 * b]! + n[3 * c]!;
    const sy = n[3 * a + 1]! + n[3 * b + 1]! + n[3 * c + 1]!;
    const sz = n[3 * a + 2]! + n[3 * b + 2]! + n[3 * c + 2]!;
    if (fx * sx + fy * sy + fz * sz < 0) z++;
  }
  return z;
}
