 
// Gegenprüfung „Löser-Mathematik“: Messung 1 mit dem unveränderten Löser (LoopZug, Art `kurven`).
//  A  Anteile einer Runde (Feld `zeiten` + Uhr außen), Größe der Zerlegungen, PCG-Schritte
//  B  wie genau die Haut auf den Linien liegt (Bindung weich, Gewicht 100): |B·x − Ziel| je Mausschritt und nach dem Ausrechnen
//  C  Konvergenz nach dem Zug: Bewegung je Runde, Kosinus aufeinander folgender Schritte
// FALL=hals|ohr|ruessel  GEWICHTE=gleich|geometrie  DREIECKE=6000  SCHRITTE=30  JE=1  NACH=200
import { LoopZug, zieleAus } from '../../../../../../packages/shape/src/dicht/loops';
import { dreiLoops, f2, f3, punktAbstand, zugFuer } from './gemeinsam';

const fall = process.env.FALL ?? 'hals';
const gewichte = (process.env.GEWICHTE ?? 'gleich') as 'gleich' | 'geometrie';
const dreiecke = Number(process.env.DREIECKE ?? 6000);
const SCHRITTE = Number(process.env.SCHRITTE ?? 30);
const JE = Number(process.env.JE ?? 1);
const NACH = Number(process.env.NACH ?? 200);

const st = dreiLoops(dreiecke);
const zug = zugFuer(st, fall);
const t0 = performance.now();
const z = new LoopZug(st.h, st.loops, null, true, 'kurven', gewichte, {});
const tAnlegen = performance.now() - t0;
const L = z.loeser as unknown as {
  zeiten: Record<string, number>;
  sys: { huelle: number; n: number } | null;
  sysC: { huelle: number; n: number } | null;
  cVor: { huelle: number; n: number } | null;
  quelle: Float64Array;
  letzteKruemmung: Float64Array | null;
};
const h = st.h;
let kanten = 0;
for (let v = 0; v < h.n; v++) kanten += h.nachbarn[v]!.length;
console.log(
  `\n=== ${fall}, ${gewichte}, ${h.n} Punkte (${h.tri.length / 3} Dreiecke), Anlegen ${tAnlegen.toFixed(0)} ms ===`,
);
let quellen = 0;
let hart = 0;
for (let v = 0; v < h.n; v++) {
  if (L.quelle[v]! > 0) quellen++;
  else if (L.quelle[v] === 0) hart++;
}
console.log(
  `  Unbekannte Lagen ${L.sys?.n} (×3 Spalten), Einträge in L (Lagen) ${L.sys?.huelle}; Krümmung: ${L.sysC ? `zerlegt, n ${L.sysC.n}, Einträge ${L.sysC.huelle}` : `PCG, Vorkonditionierer n ${L.cVor?.n}, Einträge ${L.cVor?.huelle}`}; Quellen (weiche Linienpunkte) ${quellen}, harte/Ecken ${hart}; Bindungen ${z.plan.loop.length}; Kanten ${kanten / 2}`,
);

// Bindungen: Hautpunkt beim Anlegen und Ziel beim Anlegen
const { ecken, b } = z.plan.bind;
const m = ecken.length / 3;
const hautPunkt = (P: Float64Array, j: number, c: number) => b[3 * j]! * P[3 * ecken[3 * j]! + c]! + b[3 * j + 1]! * P[3 * ecken[3 * j + 1]! + c]! + b[3 * j + 2]! * P[3 * ecken[3 * j + 2]! + c]!;
const haut0 = new Float64Array(3 * m);
for (let j = 0; j < m; j++) for (let c = 0; c < 3; c++) haut0[3 * j + c] = hautPunkt(h.pos, j, c);
const ziel0 = zieleAus(z.plan, z.start);
let versatz0 = 0;
for (let j = 0; j < m; j++) versatz0 = Math.max(versatz0, Math.hypot(haut0[3 * j]! - ziel0[3 * j]!, haut0[3 * j + 1]! - ziel0[3 * j + 1]!, haut0[3 * j + 2]! - ziel0[3 * j + 2]!));
const bindRest = (d: (Float64Array | null)[]) => {
  const ziele = zieleAus(z.plan, z.lagen(d));
  let max = 0;
  let sum = 0;
  for (let j = 0; j < m; j++) {
    const r = Math.hypot(
      hautPunkt(h.pos, j, 0) - (haut0[3 * j]! + ziele[3 * j]! - ziel0[3 * j]!),
      hautPunkt(h.pos, j, 1) - (haut0[3 * j + 1]! + ziele[3 * j + 1]! - ziel0[3 * j + 1]!),
      hautPunkt(h.pos, j, 2) - (haut0[3 * j + 2]! + ziele[3 * j + 2]! - ziel0[3 * j + 2]!),
    );
    max = Math.max(max, r);
    sum += r;
  }
  return { max, mittel: sum / m };
};

// ---------- der Zug: SCHRITTE Mausschritte mit JE Runden ----------
let d: (Float64Array | null)[] = [];
const tz = performance.now();
const reste: string[] = [];
let schrittWeite = 0;
for (let k = 1; k <= SCHRITTE; k++) {
  const dn = zug(k / SCHRITTE);
  if (k === 1) for (const x of dn) if (x) for (let j = 0; j < x.length; j += 3) schrittWeite = Math.max(schrittWeite, Math.hypot(x[j]!, x[j + 1]!, x[j + 2]!));
  d = dn;
  z.schritt(d, JE);
  if (k === 1 || k === Math.round(SCHRITTE / 2) || k === SCHRITTE) {
    const r = bindRest(d);
    reste.push(`Schritt ${k}: größter ${f3(r.max)}, Mittel ${f3(r.mittel)}`);
  }
}
const tZug = performance.now() - tz;
const zt = { ...L.zeiten };
const r = zt.runden || 1;
const jeRunde = tZug / r;
const rest = jeRunde - (zt.vermessen! + zt.intrinsisch! + zt.kruemmung! + zt.loesen!) / r;
const pz = (x: number) => `${((100 * x) / r / jeRunde).toFixed(0)} %`;
console.log(`A Kosten (${r} Runden im Zug, außen gemessen ${jeRunde.toFixed(2)} ms je Runde; Maschine geteilt, nur Anteile verwenden):`);
console.log(
  `  vermessen (mit Normalen) ${pz(zt.vermessen!)} · intrinsisch ${pz(zt.intrinsisch!)} · Krümmung verteilen ${pz(zt.kruemmung!)} (PCG-Schritte je Runde ${(zt.schritte! / r).toFixed(2)}) · Lagen lösen ${pz(zt.loesen!)} · Rest (rechte Seite, Spiegel${gewichte === 'gleich' ? ', Krümmung verteilen: bei „gleich“ nicht eigens gemessen' : ''}) ${((100 * rest) / jeRunde).toFixed(0)} %`,
);
console.log(`  absolut (Vorbehalt): vermessen ${(zt.vermessen! / r).toFixed(2)}, intrinsisch ${(zt.intrinsisch! / r).toFixed(2)}, Krümmung ${(zt.kruemmung! / r).toFixed(2)}, lösen ${(zt.loesen! / r).toFixed(2)}, Rest ${rest.toFixed(2)} ms`);
console.log(`B Liniengenauigkeit (Abstand Hautpunkt der Bindung ↔ sein Ziel; Zielschritt je Mausschritt bis ${f2(schrittWeite)}; Versatz Haut↔Linie beim Anlegen bis ${f3(versatz0)}):`);
for (const s of reste) console.log(`  ${s}`);

// ---------- C: Konvergenz nach dem Zug ----------
const marken = new Set([1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400]);
let vor = Float64Array.from(h.pos);
const anfang = Float64Array.from(h.pos);
let dVor: Float64Array | null = null;
const zeilen: string[] = [];
const schritte: number[] = [];
for (let k = 1; k <= NACH; k++) {
  z.schritt(d, 1);
  const jetzt = Float64Array.from(h.pos);
  const a = punktAbstand(vor, jetzt);
  schritte.push(a.max);
  const dd = jetzt.map((x, i) => x - vor[i]!);
  let cos = NaN;
  if (dVor) {
    let ab = 0;
    let aa = 0;
    let bb = 0;
    for (let i = 0; i < dd.length; i++) {
      ab += dd[i]! * dVor[i]!;
      aa += dd[i]! * dd[i]!;
      bb += dVor[i]! * dVor[i]!;
    }
    cos = ab / Math.sqrt(aa * bb);
  }
  dVor = dd;
  if (marken.has(k)) zeilen.push(`Runde ${k}: größte Bewegung ${a.max.toFixed(4)} (rms ${a.rms.toFixed(4)}), cos zum Schritt davor ${cos.toFixed(2)}, seit Zugende ${f3(punktAbstand(anfang, jetzt).max)}`);
  vor = jetzt;
}
console.log(`C Konvergenz nach dem Zug (Ziele fest, je eine Runde):`);
for (const s of zeilen) console.log(`  ${s}`);
const rb = bindRest(d);
console.log(`  Liniengenauigkeit nach ${NACH} Runden: größter ${rb.max.toFixed(4)}, Mittel ${rb.mittel.toFixed(4)}`);
// mittlerer Kontraktionsfaktor über Fenster
const faktor = (a: number, bb: number) => (schritte[bb - 1]! > 0 && schritte[a - 1]! > 0 ? Math.pow(schritte[bb - 1]! / schritte[a - 1]!, 1 / (bb - a)) : NaN);
if (NACH >= 100) console.log(`  Faktor je Runde (größte Bewegung): Runden 2→10 ${f3(faktor(2, 10))}, 10→30 ${f3(faktor(10, 30))}, 30→100 ${f3(faktor(30, 100))}${NACH >= 200 ? `, 100→200 ${f3(faktor(100, 200))}` : ''}`);
