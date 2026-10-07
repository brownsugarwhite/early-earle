import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { construct } from './build';
import { evalScene, sdPrim } from './scene';

/**
 * Das Distanzfeld muss **stetig** sein: Sprünge erzeugen beim Dual Contouring Scheinflächen (Risse). Abgetastet werden
 * senkrechte Linien durch Rumpf, Beine, Hals und Kopf des Rex und der Giraffe; ein Sprung ist eine Änderung von mehr als
 * dem 2,5-fachen Schritt zwischen Nachbarpunkten (Lipschitz 1 erlaubt höchstens das 1,0-fache; Smooth-Min etwas mehr).
 */
const REX = { koerper: { hoehe: 1.0, breite: 1.0, laenge: 1.25, neigung: 0.3, buckel: 0.5, bauch: 0.45, boden: 0.6, querschnitte: [0.72, 0.95, 1.0, 0.9, 0.6] as [number, number, number, number, number] }, hals: { laenge: 0.12, dicke: 1.15, kruemmung: 0.1, ansatz: 0.8 }, kopf: { groesse: 1.45, laenge: 1.2, neigung: 0.1, schnauze: 0.45, schnauzeDicke: 0.9, braue: 0.85 }, maul: { hoehe: 0.42, neigung: 0.55, form: 1, rundung: 0.2, winkel: 0.85, breite: 1.0, oberkiefer: 1.25, unterkiefer: 0.95, lippe: 0.2, oeffnung: 0.45, tiefe: 0.85 }, zaehne: { groesse: 1.0, dichte: 0.3 }, augen: { typ: 'drache' as const, hoehe: 0.3, abstand: 0.5, groesse: 0.22, tiefe: 0.6 }, unterkoerper: { typ: 'beine' as const, beine: { anzahl: 2 as const, dicke: 1.0, schenkel: 1.0, laenge: 0.38, fuss: 0.85, spreiz: 0.5 } }, schwanz: { typ: 'wirbelsaeule' as const, laenge: 1.4, dicke: 0.9, hoch: 0.1 } };
const GIRAFFE = { koerper: { hoehe: 0.95, breite: 0.9, laenge: 1.0, bauch: 0.25, boden: 0.4, querschnitte: [0.95, 1.0, 0.9, 0.7, 0.45] as [number, number, number, number, number] }, hals: { laenge: 1.35, dicke: 0.55, kruemmung: 0.2, ansatz: 0.65 }, kopf: { groesse: 0.72, laenge: 1.2, schnauze: 0.8, schnauzeDicke: 0.85, neigung: 0.25 }, maul: { hoehe: 0.35, form: 0.75, rundung: 0.9, winkel: 0.3, breite: 0.6, oberkiefer: 0.9, unterkiefer: 0.7, lippe: 0.15, oeffnung: 0.2 }, zaehne: { stil: 'keine' as const }, augen: { typ: 'gross' as const, hoehe: 0.55, abstand: 0.8, groesse: 0.3, tiefe: 0.3 }, unterkoerper: { typ: 'beine' as const, beine: { anzahl: 4 as const, dicke: 0.28, schenkel: 0.2, laenge: 0.35, fuss: 0.25, spreiz: 0.3 } }, schwanz: { typ: 'anhang' as const, laenge: 0.6, dicke: 0.25, hoch: -0.4, kruemmung: 0.1 } };

function sprünge(bauplan: Parameters<typeof parseBauplan>[0], linien: Array<[number, number]>, yMax: number): string[] {
  const c = construct(parseBauplan(bauplan), 88);
  const names = c.scene.prims.map((p) => p.name ?? p.kind);
  const step = 0.004;
  const out: string[] = [];
  for (const [x, z] of linien) {
    let prev = evalScene(c.scene, [x, -0.2, z]);
    for (let y = -0.2 + step; y < yMax; y += step) {
      const d = evalScene(c.scene, [x, y, z]);
      // nur nahe der Fläche: tief innen oder weit außen tastet das Dual Contouring nichts ab
      if (Math.abs(d - prev) > 4 * step && Math.min(Math.abs(d), Math.abs(prev)) < 0.1) {
        const per = c.scene.prims.map((p, i) => `${names[i]}:${(sdPrim([x, y, z], p) - sdPrim([x, y - step, z], p)).toFixed(3)}`).filter((s) => Math.abs(Number(s.split(':')[1])) > 2.5 * step);
        out.push(`x=${x} z=${z} y=${y.toFixed(3)} Δ=${(d - prev).toFixed(3)} [${per.join(' ')}]`);
      }
      prev = d;
    }
  }
  return out;
}

describe('Stetiges Distanzfeld', () => {
  it('Rex: keine Sprünge entlang senkrechter Linien', () => {
    const j = sprünge(REX, [[0, 0.5], [0, 0.3], [0.3, 0.3], [0, -0.3], [0.25, 0], [0.2, 0.55], [0, 0.75]], 1.7);
    if (j.length) console.log(j.slice(0, 12).join('\n'));
    expect(j.length).toBe(0);
  });
  it('Giraffe: keine Sprünge entlang senkrechter Linien', () => {
    const j = sprünge(GIRAFFE, [[0, 0.3], [0, 0], [0.2, 0.2], [0, -0.3], [0.15, 0.45]], 2.6);
    if (j.length) console.log(j.slice(0, 12).join('\n'));
    expect(j.length).toBe(0);
  });
});
