// Liegen die Proben der Loops auf Netzpunkten und aufeinanderfolgende auf einer Netzkante? (Vorbereitung: Felder zwischen den Linien)
import { laden } from './formen';
for (const name of ['strange bird', 'teat firefish']) {
  const f = laden(name);
  let proben = 0, aufPunkt = 0, paare = 0, kante = 0;
  for (const l of f.loops) {
    const v = l.proben.map((p) => { const i = p.b.indexOf(1); return i >= 0 ? p.ecken[i]! : -1; });
    proben += v.length;
    aufPunkt += v.filter((x) => x >= 0).length;
    const m = l.art === 'ring' ? v.length - 1 : v.length;
    for (let j = 0; j < m; j++) {
      const a = v[j]!, b = v[(j + 1) % v.length]!;
      paare++;
      if (a >= 0 && b >= 0 && (a === b || f.haut.nachbarn[a]!.includes(b))) kante++;
    }
  }
  console.log(`${name}: ${proben} Proben, davon ${aufPunkt} auf Netzpunkten; ${paare} Nachbarpaare, davon ${kante} auf einer Netzkante`);
}
