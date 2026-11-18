// Gleichlauf unter Last (22.10.): S0 (Kugel, Kugel mit breiterer Front, Tiger) und ihre Strahlraster mehrmals im selben
// Prozess bauen. Fläche bitgleich zur ersten Runde? Ursprung und Zellgröße jedes Rasters aus den Grenzen genau seiner Ansicht?
// Vor der Korrektur in `strahlRaster` (Closures über lokale Variablen) kamen unter Last in 2–5 von 96 Prozessen Raster mit den
// Grenzen einer anderen Ansicht zurück (V8, nach einem On-Stack-Replacement); nur viele Prozesse zugleich zeigen das.
// Aus packages/shape: PROZESSE=24 DURCHGAENGE=4 npx vite-node ../../apps/editor/scripts/pruefen/raster-gleichlauf.ts
// Umgebung: PROZESSE (gleichzeitig, Standard 24), DURCHGAENGE (nacheinander, Standard 4), RUNDEN (je Prozess, Standard 4).
import { spawn } from 'node:child_process';
import tiger from '../../public/versuch/tiger/tiger.json';
import type { V2 } from '../../../../packages/shape/src/bezier';
import { type Dokument, dokumentLesen, neuesDokument } from '../../../../packages/shape/src/dokument';
import { abgleichen } from '../../../../packages/shape/src/kopplung';
import { dreiecksFlaeche, flaecheS0, rasterAlle, treffer, trefferOhneRaster } from '../../../../packages/shape/src/versuch/flaechenlinie';
import { TIGER_STANDARD, type TigerOptionen } from '../../../../packages/shape/src/versuch/tigerKaefig';


if (!process.env.GLEICHLAUF_KIND) {
  // Leitung: Prozesse starten, Ergebnisse zählen
  const prozesse = Number(process.env.PROZESSE ?? 24);
  const durchgaenge = Number(process.env.DURCHGAENGE ?? 4);
  let betroffen = 0;
  let gesamt = 0;
  const datei = process.argv[process.argv.length - 1]!;
  for (let d = 0; d < durchgaenge; d++) {
    const laeufe = Array.from(
      { length: prozesse },
      () =>
        new Promise<string>((fertig) => {
          let aus = '';
          const kind = spawn('npx', ['vite-node', datei], { env: { ...process.env, GLEICHLAUF_KIND: '1' } });
          kind.stdout.on('data', (b: Buffer) => (aus += b.toString()));
          kind.stderr.on('data', (b: Buffer) => (aus += b.toString()));
          kind.on('close', () => fertig(aus));
        }),
    );
    for (const aus of await Promise.all(laeufe)) {
      gesamt++;
      if (!aus.includes('gleichlauf ok')) {
        betroffen++;
        console.log(aus.trim().split('\n').slice(0, 4).join('\n'));
      }
    }
  }
  console.log(`${betroffen} von ${gesamt} Prozessen mit Abweichung`);
  process.exit(betroffen ? 1 : 0);
}

const KUGEL: TigerOptionen = { ...TIGER_STANDARD, kastenBis: 0, uebergang: 1e-6, schaerfe: 0 };
const breit = () => {
  const dok = neuesDokument();
  const skal = (v: V2): V2 => ({ x: v.x * 1.1, y: v.y });
  const front = { ...dok.profile.front, knoten: dok.profile.front.knoten.map((k) => ({ ...k, p: skal(k.p), ein: skal(k.ein), aus: skal(k.aus) })) };
  dok.profile = abgleichen({ ...dok.profile, front }, 'front');
  return dok;
};
const tigerDok = () =>
  dokumentLesen({ format: 'ee-wesen', version: 0, name: 'Tiger', profile: { seite: tiger.profile.seite, front: tiger.profile.front, top: tiger.profile.top }, skalierung: 1, posen: [] });
const FAELLE: [string, () => Dokument, TigerOptionen][] = [
  ['kugel', neuesDokument, KUGEL],
  ['breit', breit, KUGEL],
  ['tiger', tigerDok, TIGER_STANDARD],
];
const ACHSEN = { seite: [0, 1], front: [2, 1], top: [0, 2] } as const;
const erste = new Map<string, Float64Array>();
const befunde: string[] = [];
const RUNDEN = Number(process.env.RUNDEN ?? 4);
for (let runde = 0; runde < RUNDEN; runde++) {
  for (const [name, dok, opt] of FAELLE) {
    const fl = dreiecksFlaeche(flaecheS0(dok(), opt));
    const ref = erste.get(name);
    if (!ref) erste.set(name, fl.punkte);
    else if (ref.length !== fl.punkte.length || ref.some((x, i) => !Object.is(x, fl.punkte[i]))) befunde.push(`Runde ${runde} ${name}: Fläche anders als in Runde 0`);
    const ras = rasterAlle(fl);
    for (const a of ['seite', 'front', 'top'] as const) {
      const r = ras[a];
      let uMin = Infinity;
      let uMax = -Infinity;
      let vMin = Infinity;
      let vMax = -Infinity;
      for (let i = 0; i < fl.punkte.length / 3; i++) {
        const x = fl.punkte[3 * i + ACHSEN[a][0]]!;
        const y = fl.punkte[3 * i + ACHSEN[a][1]]!;
        if (x < uMin) uMin = x;
        if (x > uMax) uMax = x;
        if (y < vMin) vMin = y;
        if (y > vMax) vMax = y;
      }
      const rand = 1e-9 * Math.max(1e-9, uMax - uMin, vMax - vMin);
      const soll = [uMin - rand, vMin - rand, (uMax - uMin + 2 * rand) / r.n, (vMax - vMin + 2 * rand) / r.n];
      const ist = [r.x0, r.y0, r.zb, r.zh];
      if (ist.some((x, i) => x !== soll[i])) befunde.push(`Runde ${runde} ${name} ${a}: Raster ${ist.map((x) => x.toFixed(6)).join(' ')} statt ${soll.map((x) => x.toFixed(6)).join(' ')}`);
      let falsch = 0;
      for (let k = 0; k < 40; k++) {
        const q = { x: r.x0 + ((k * 0.618034) % 1) * r.n * r.zb, y: r.y0 + ((k * 0.41421) % 1) * r.n * r.zh };
        if (treffer(r, q).length !== trefferOhneRaster(r, q).length) falsch++;
      }
      if (falsch) befunde.push(`Runde ${runde} ${name} ${a}: ${falsch} von 40 Strahlen mit anderer Trefferzahl als ohne Raster`);
    }
  }
}
console.log(befunde.length ? befunde.join('\n') : 'gleichlauf ok');
