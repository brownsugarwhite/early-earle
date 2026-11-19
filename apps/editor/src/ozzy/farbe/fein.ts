/**
 * Ozzy, Paint-Modus: die feinen Dreiecke der glatten Anzeige in ihrem Dreieck des Rechennetzes. `GlattPlan` teilt jedes Dreieck je
 * Stufe in vier (Ecke a, Ecke b, Ecke c, Mitte) und reiht die feinen Dreiecke eines groben hintereinander. Hier steht, wo die drei
 * Ecken jedes feinen Dreiecks im groben liegen (Gewichte b, c): Damit wird aus einem Treffer auf der glatten Anzeige ein Ort auf der
 * Haut, und die Anzeige der Farbe gibt jedem Bildpunkt seine Lage im groben Dreieck.
 */

const jeStufe: Float32Array[] = [];

/** je feinem Dreieck der Stufe (4^stufen Stück, in der Reihenfolge der Anzeige) sechs Zahlen: (b, c) seiner drei Ecken */
export function feinEcken(stufen: number): Float32Array {
  const da = jeStufe[stufen];
  if (da) return da;
  type P = [number, number];
  let dreiecke: [P, P, P][] = [
    [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  ];
  const m = (p: P, q: P): P => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  for (let s = 0; s < stufen; s++) {
    const neu: [P, P, P][] = [];
    for (const [a, b, c] of dreiecke) {
      const ab = m(a, b);
      const bc = m(b, c);
      const ca = m(c, a);
      neu.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    dreiecke = neu;
  }
  const aus = new Float32Array(dreiecke.length * 6);
  dreiecke.forEach((d, i) => d.forEach((p, e) => aus.set(p, 6 * i + 2 * e)));
  jeStufe[stufen] = aus;
  return aus;
}

/** das feine Dreieck der Stufe, in dem die Stelle (b, c) eines groben Dreiecks liegt, und ihre Gewichte dort */
export function feinBei(stufen: number, b: number, c: number): { j: number; w: [number, number, number] } {
  let w: [number, number, number] = [1 - b - c, b, c];
  let j = 0;
  for (let s = 0; s < stufen; s++) {
    const [wa, wb, wc] = w;
    // (dieselbe Reihenfolge der Kinder wie oben; die Ecken jedes Kinds in seiner Reihenfolge)
    if (wa >= 0.5) {
      j = 4 * j;
      w = [2 * wa - 1, 2 * wb, 2 * wc];
    } else if (wb >= 0.5) {
      j = 4 * j + 1;
      w = [2 * wb - 1, 2 * wc, 2 * wa];
    } else if (wc >= 0.5) {
      j = 4 * j + 2;
      w = [2 * wc - 1, 2 * wa, 2 * wb];
    } else {
      j = 4 * j + 3;
      w = [1 - 2 * wc, 1 - 2 * wa, 1 - 2 * wb];
    }
  }
  return { j, w };
}
