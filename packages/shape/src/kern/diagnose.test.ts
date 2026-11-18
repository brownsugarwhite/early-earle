import { describe, it } from 'vitest';
import type { V2 } from '../bezier';
import { type Dokument, neuesDokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import { alleFlaechen } from '../kaefig/halbkanten';
import type { V3 } from '../versuch/catmullClark';
import { umrissAusNetz } from '../versuch/umriss3d';
import rexRoh from '../versuch/vorlagen/rex.json';
import langhalsRoh from '../versuch/vorlagen/langhals.json';
import { type Vorlage, vorlageDokument } from '../versuch/vorlagen';
import { ableiten } from './ableiten';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;

function kasten(): Dokument {
  const dok = neuesDokument('Kasten');
  const r = 0.265;
  const o = { x: 0, y: 0 };
  const front: Dokument['profile']['front'] = {
    art: 'halb',
    achse: 'senkrecht',
    knoten: [
      { p: { x: 0, y: 2 * r }, ein: o, aus: o, art: 'glatt' },
      { p: { x: 0.8 * r, y: 2 * r }, ein: o, aus: o, art: 'ecke', haerte: 1 },
      { p: { x: 0.8 * r, y: 0 }, ein: o, aus: o, art: 'ecke', haerte: 1 },
      { p: { x: 0, y: 0 }, ein: o, aus: o, art: 'glatt' },
    ],
  };
  return { ...dok, profile: { ...dok.profile, front } };
}

function frontDiagnose(name: string, dok: Dokument, ansicht: 'front' | 'top' = 'front') {
  const abl = ableiten(dok);
  const v = abl.vorlage;
  const z = abl.ziele;
  const zeilen: string[] = [];
  for (const i of [0, 4, 8, 12, 16, 20, 23]) {
    let zMax = 0;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let j = 0; j < v.N; j++) {
      const p = v.ringPunkt(i, j);
      zMax = Math.max(zMax, Math.abs(z[3 * p + 2]!));
      yMin = Math.min(yMin, z[3 * p + 1]!);
      yMax = Math.max(yMax, z[3 * p + 1]!);
    }
    const o = v.ringPunkt(i, 0);
    zeilen.push(`Ring ${i}: x ${z[3 * o]!.toFixed(3)} y ${yMin.toFixed(3)}…${yMax.toFixed(3)} |z|max ${zMax.toFixed(3)} (Top ${abl.breiten.top(z[3 * o]!).toFixed(3)})`);
  }
  const fein = abl.fein;
  const punkte: V3[] = [];
  let feinZ = 0;
  for (let i = 0; i < fein.length / 3; i++) {
    punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
    feinZ = Math.max(feinZ, Math.abs(fein[3 * i + 2]!));
  }
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const um = umrissAusNetz({ punkte, flaechen: alleFlaechen(letzte), schaerfe: new Map() }, ansicht, 900)[0] ?? [];
  const kurve = pfadAbtasten(vollerPfad(dok.profile[ansicht]), 160);
  let kMax = 0;
  for (const p of kurve) kMax = Math.max(kMax, Math.abs(p.x));
  let uMax = 0;
  for (const p of um) uMax = Math.max(uMax, Math.abs(p.x));
  // Ort der größten Abweichung Umriss → Kurve
  let worst = { d: 0, p: { x: 0, y: 0 } as V2 };
  for (const p of um) {
    let best = Infinity;
    for (let i = 0; i < kurve.length; i++) {
      const a = kurve[i]!;
      const b = kurve[(i + 1) % kurve.length]!;
      const abx = b.x - a.x, aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
      best = Math.min(best, Math.hypot(a.x + abx * t - p.x, a.y + aby * t - p.y));
    }
    if (best > worst.d) worst = { d: best, p };
  }
  console.log(`${name} (${ansicht}): Kurve |x|max ${kMax.toFixed(3)}, Umriss |x|max ${uMax.toFixed(3)}, fein |z|max ${feinZ.toFixed(3)}; größte Abweichung ${(worst.d * PX).toFixed(1)} px bei (${worst.p.x.toFixed(3)}, ${worst.p.y.toFixed(3)})\n  ${zeilen.join('\n  ')}`);
}

describe('Diagnose Front', () => {
  it('Kasten-Kugel und Rex', () => {
    frontDiagnose('Kasten-Kugel', kasten());
    frontDiagnose('Rex', vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex'));
    frontDiagnose('Langhals', vorlageDokument(langhalsRoh as unknown as Vorlage, 'zu', 'langhals'), 'front');
    frontDiagnose('Langhals', vorlageDokument(langhalsRoh as unknown as Vorlage, 'zu', 'langhals'), 'top');
  });
});
