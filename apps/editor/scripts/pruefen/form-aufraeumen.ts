// C1 im Plan „Ozzy stabil und schnell“ (18.11.2026): das Aufräumen des Fensters im Kern, ohne Fenster. Lädt einen gesicherten Stand
// (eine Datei, wie das Fenster sie sichert; aus Ozzy über den Haken `standGepackt`) und gibt denselben Auftrag, den
// `werk.aufraeumenStarten` an den Hintergrund gibt: (zuerst setzen;) verdichten, setzen bis zur Ruhe, nachverfeinern, aufrichten.
// Je Schritt eine Zeile: was er tat, Punkte, umgeschlagene Dreiecke, Punkte ohne Spiegelbild; am Ende Rauminhalt und Dicke vorher
// und nachher. Damit lässt sich in Sekunden nachstellen, was im Fenster Minuten braucht (so wurde gefunden, warum eine Form mit nur
// einer Linie davonlief: siehe `ausKurven.ts`, `SCHRITT_MAX` und `festGefaltet`).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-aufraeumen.ts <datei> [<datei> …]
//   ZUERST=0 (ohne die Vorstufe „zuerst setzen“)   HALB=0 (über die ganze Haut)   SCHRITT=0 (ohne die Schrittweite)
//   MITTE=0 (Kanten der Mittelebene frei, wie bis zum 17.11.)   NACH=<n> (so oft nachverfeinern, Standard 3)
import path from 'node:path';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { hatPfad } from '../../../../packages/shape/src/dicht/loops';
import { aufraeumen, hautFlach } from '../../src/form/verfeinern';
import { formLadenDatei } from './form-direkt-faelle';

const MK = 8.64 * Math.sqrt(3);
const umgeschlagen = (h: Haut): number => {
  const P = h.pos;
  const vn = new Float64Array(P.length);
  const fn = new Float64Array(h.tri.length);
  for (let i = 0; i < h.tri.length; i += 3) {
    const [a, b, c] = [3 * h.tri[i]!, 3 * h.tri[i + 1]!, 3 * h.tri[i + 2]!];
    const f = [(P[b + 1]! - P[a + 1]!) * (P[c + 2]! - P[a + 2]!) - (P[b + 2]! - P[a + 2]!) * (P[c + 1]! - P[a + 1]!), (P[b + 2]! - P[a + 2]!) * (P[c]! - P[a]!) - (P[b]! - P[a]!) * (P[c + 2]! - P[a + 2]!), (P[b]! - P[a]!) * (P[c + 1]! - P[a + 1]!) - (P[b + 1]! - P[a + 1]!) * (P[c]! - P[a]!)];
    for (let x = 0; x < 3; x++) {
      fn[i + x] = f[x]!;
      for (const v of [a, b, c]) vn[v + x] = vn[v + x]! + f[x]!;
    }
  }
  let z = 0;
  for (let i = 0; i < h.tri.length; i += 3) {
    let d = 0;
    for (let x = 0; x < 3; x++) d += fn[i + x]! * (vn[3 * h.tri[i]! + x]! + vn[3 * h.tri[i + 1]! + x]! + vn[3 * h.tri[i + 2]! + x]!);
    if (d < 0) z++;
  }
  return z;
};
const ohnePartner = (h: Haut): number => {
  let n = 0;
  for (let v = 0; v < h.n; v++) if (!(h.spiegel[v]! >= 0 && h.spiegel[h.spiegel[v]!] === v)) n++;
  return n;
};
const mass = (pos: Float64Array, tri: Uint32Array): string => {
  let v = 0;
  let dick = 0;
  for (let i = 0; i < tri.length; i += 3) {
    const [a, b, c] = [3 * tri[i]!, 3 * tri[i + 1]!, 3 * tri[i + 2]!];
    v += (pos[a]! * (pos[b + 1]! * pos[c + 2]! - pos[b + 2]! * pos[c + 1]!) - pos[a + 1]! * (pos[b]! * pos[c + 2]! - pos[b + 2]! * pos[c]!) + pos[a + 2]! * (pos[b]! * pos[c + 1]! - pos[b + 1]! * pos[c]!)) / 6;
  }
  for (let i = 2; i < pos.length; i += 3) dick = Math.max(dick, Math.abs(pos[i]!));
  return `Rauminhalt ${(v / 1e6).toFixed(2)} Mio., halbe Dicke ${dick.toFixed(1)}`;
};

for (const datei of process.argv.slice(2)) {
  const { h, loops } = formLadenDatei(datei, false);
  const opt = (nurTeilen: boolean) => ({ verborgen: null, kurz: nurTeilen ? 0 : 0.5 * MK, genau: MK / 40, genauHaut: true, genauFlaeche: MK / 16, flachSchutz: true });
  console.log(`${path.basename(datei)}: ${h.n} Punkte, ${loops.length} Linie(n); ${mass(h.pos, h.tri)}`);
  const t0 = performance.now();
  const e = aufraeumen(
    {
      art: 'aufraeumen',
      id: 1,
      haut: hautFlach(h),
      loops,
      exakt: loops.map(hatPfad),
      verdichten: true,
      aufrichten: true,
      maxKante: 1.75 * MK,
      opt: opt(false),
      optNurTeilen: opt(true),
      nachverfeinern: Number(process.env.NACH ?? 3),
      kruemmung: true,
      gewichte: 'geometrie',
      loeserOpt: {
        ...(process.env.HALB === '0' ? {} : { halb: true }),
        ...(process.env.SCHRITT === '0' ? { schritt: false } : {}),
        ...(process.env.MITTE === '0' ? { mitteFest: false } : {}),
      } as { halb?: boolean },
      ruhe: 0.05,
      maxRunden: 12,
      zuerstSetzen: process.env.ZUERST !== '0',
      ziele: null,
      maxRundenZuerst: 33,
      nurInRuhe: false,
    },
    undefined,
    (schritt, haut) => console.log(`   ${schritt}: ${haut.n} Punkte, umgeschlagen ${umgeschlagen(haut)}, ohne Spiegelbild ${ohnePartner(haut)}`),
  );
  console.log(`   fertig in ${(performance.now() - t0).toFixed(0)} ms: Vorstufe ${e.vorstufe}${e.abgebrochen ? ', ABGEBROCHEN (die Haut lief davon; es gilt der Stand davor)' : ''}${e.haut ? `; ${mass(e.haut.pos, e.haut.tri)}` : ''}`);
}
