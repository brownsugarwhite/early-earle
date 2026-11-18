// Abweichung des Kern-Körpers von den gezeichneten Umrissen je Ansicht (px bei 461 px je Kachel) für Kugel, Rex, Tiger, Langhals
import tigerJson from '../../../../packages/shape/src/versuch/vorlagen/tiger.json';
import rexJson from '../../../../packages/shape/src/versuch/vorlagen/rex.json';
import langhalsJson from '../../../../packages/shape/src/versuch/vorlagen/langhals.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { umrissAusNetz } from '../../../../packages/shape/src/versuch/umriss3d';
import { neuesDokument, type Dokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { kastenSpanten } from '../../../../packages/shape/src/kern/kasten';
const PX = 461;
type V2 = { x: number; y: number };
function soll(dok: Dokument, a: 'seite' | 'front' | 'top'): V2[] {
  const sk = dok.skalierung;
  const pts = pfadAbtasten(vollerPfad(dok.profile[a]), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  if (a !== 'top' || !process.env.STRECKEN) return pts;
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  const xMin = Math.min(...seite.map((p) => p.x)); const xMax = Math.max(...seite.map((p) => p.x));
  const tMin = Math.min(...pts.map((p) => p.x)); const tMax = Math.max(...pts.map((p) => p.x));
  return pts.map((p) => ({ x: xMin + ((p.x - tMin) / (tMax - tMin)) * (xMax - xMin), y: p.y }));
}
function abstand(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  for (let i = 0; i < zug.length; i++) {
    const a = zug[i]!; const b = zug[(i + 1) % zug.length]!;
    const dx = b.x - a.x; const dy = b.y - a.y; const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y));
  }
  return best;
}
const faelle: [string, Dokument][] = [
  ['Kugel', neuesDokument('Kugel')],
  ['Rex', vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex')],
  ['Tiger (Kasten-Spanten)', (() => { const r = vorlageDokument(tigerJson as unknown as Vorlage, 'zu', 'tiger'); return { ...r, spanten: kastenSpanten(r.profile.front, 0.02, 0.15, 0.25, 0.85) }; })()],
  ['Langhals', vorlageDokument(langhalsJson as unknown as Vorlage, 'zu', 'langhals')],
];
for (const [name, dok] of faelle) {
  const extra = process.env.OPT ? (JSON.parse(process.env.OPT) as Record<string, number | boolean>) : {};
  const abl = ableiten(dok, { stufen: 2, ...extra });
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: [number, number, number][] = [];
  for (let i = 0; i < abl.fein.length / 3; i++) punkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
  const netz = { punkte, flaechen: alleFlaechen(letzte), schaerfe: new Map<string, number>() };
  const aus: string[] = [];
  for (const a of ['seite', 'front', 'top'] as const) {
    const ist = umrissAusNetz(netz, a, 400);
    const s = soll(dok, a);
    const d: number[] = [];
    for (const z of ist) for (const p of z) d.push(abstand(p, s));
    const dSoll: number[] = [];
    for (const p of s) dSoll.push(Math.min(...ist.map((z) => abstand(p, z))));
    const alle = [...d, ...dSoll];
    {
      // Verteilung Kurve→Körper je Zehntel der Hauptachse (Seite/Top: x vorn → hinten; Front: y unten → oben)
      const achse = (p: V2) => (a === 'front' ? p.y : p.x);
      const ws = s.map(achse); const wMin = Math.min(...ws); const wMax = Math.max(...ws);
      const faecher: number[] = new Array(10).fill(0);
      s.forEach((p, k) => { const f = Math.min(9, Math.floor(((achse(p) - wMin) / (wMax - wMin)) * 10)); faecher[f] = Math.max(faecher[f]!, dSoll[k]! * PX); });
      // und Körper→Kurve je Zehntel
      const faecher2: number[] = new Array(10).fill(0);
      let k2 = 0; for (const z of ist) for (const p of z) { const f = Math.min(9, Math.max(0, Math.floor(((achse(p) - wMin) / (wMax - wMin)) * 10))); faecher2[f] = Math.max(faecher2[f]!, d[k2]! * PX); k2++; }
      console.log(`  ${a} Zehntel Kurve→Körper: ${faecher.map((v) => v.toFixed(1)).join(' | ')}\n  ${a} Zehntel Körper→Kurve: ${faecher2.map((v) => v.toFixed(1)).join(' | ')}`);
    }
    if (a === 'top' && name.startsWith('Tiger') && process.env.TIGER) {
      // Verteilung der Abweichung Kurve→Körper entlang x (10 Fächer)
      const xs = s.map((p) => p.x); const xMin = Math.min(...xs); const xMax = Math.max(...xs);
      const faecher: number[] = new Array(10).fill(0);
      s.forEach((p, k) => { const f = Math.min(9, Math.floor(((p.x - xMin) / (xMax - xMin)) * 10)); faecher[f] = Math.max(faecher[f]!, dSoll[k]! * PX); });
      console.log('  Top-Abweichung je Zehntel der Länge (vorn → hinten, px): ' + faecher.map((v) => v.toFixed(1)).join(' | '));
      // Breite: Top-Kurve gegen Körper, rechts (y > 0) und links getrennt
      const rechts = s.filter((p) => p.y > 0); const links = s.filter((p) => p.y < 0);
      const dR = rechts.map((p) => Math.min(...ist.map((z) => abstand(p, z))) * PX); const dL = links.map((p) => Math.min(...ist.map((z) => abstand(p, z))) * PX);
      console.log(`  Top rechts max ${Math.max(...dR).toFixed(1)} px, links max ${Math.max(...dL).toFixed(1)} px; Körper-Breite max ${(Math.max(...ist.flat().map((p) => Math.abs(p.y))) * 2).toFixed(3)}, Kurve max ${(Math.max(...s.map((p) => Math.abs(p.y))) * 2).toFixed(3)}`);
    }
    aus.push(`${a}: Mittel ${((alle.reduce((x, y) => x + y, 0) / alle.length) * PX).toFixed(1)} px, max ${(Math.max(...alle) * PX).toFixed(1)} px (Körper→Kurve max ${(Math.max(...d) * PX).toFixed(1)}, Kurve→Körper max ${(Math.max(...dSoll) * PX).toFixed(1)})`);
  }
  console.log(`== ${name}\n  ${aus.join('\n  ')}`);
}
