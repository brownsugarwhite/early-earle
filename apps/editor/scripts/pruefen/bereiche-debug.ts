// Paare nach Bereichen: Kugel-Unterbiss (wie das Editor-Skript) und Rex-Überbiss, mit Orten der haut-Paare
import { neuesDokument } from '../../../../packages/shape/src/dokument';
import rexJson from '../../../../packages/shape/src/versuch/vorlagen/rex.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { selbstDurchdringungen } from '../../../../packages/shape/src/versuch/pruefen';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { type MaulErgebnis, ableitenMitMaul, maulLinieAusPunkten, maulLinieUntenAusPunkten, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
import { pruefwesenBauplan } from '../../../../packages/shape/src/kern/wesen';
const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel'];
function messen(name: string, abl: MaulErgebnis, oeffnungen = [0, 0.25, 0.5]) {
  const m = abl.maul;
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  const M = abl.unterteilung.matrix;
  const feinArt = (i: number): string => { const g = new Float64Array(ARTEN.length); for (let p = M.start[i]!; p < M.start[i + 1]!; p++) g[m.art[M.index[p]!]!]! += M.wert[p]!; let best = 0; for (let a = 1; a < g.length; a++) if (g[a]! > g[best]!) best = a; return ARTEN[best]!; };
  const bereiche = flaechen.map((f) => feinArt(f[0]!));
  for (const o of oeffnungen) {
    const pose = maulPose(abl, o);
    const punkte: [number, number, number][] = [];
    for (let i = 0; i < pose.fein.length / 3; i++) punkte.push([pose.fein[3 * i]!, pose.fein[3 * i + 1]!, pose.fein[3 * i + 2]!]);
    const d = selbstDurchdringungen({ punkte, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
    const teile = Object.entries(d.nachBereich).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}${true ? ' z. B. ' + (d.orteNachBereich[k] ?? []).slice(0, 3).map((p) => '(' + p.map((x) => x.toFixed(3)).join(',') + ')').join(' ') : ''}`).join('; ');
    console.log(`${name} ${o}: ${d.paare} Paare — ${teile}`);
  }
}
// Kugel-Unterbiss wie im Editor-Skript
const kugel = neuesDokument();
const sk = kugel.skalierung;
const xs = kugel.profile.seite.knoten.map((k) => k.p.x), ys = kugel.profile.seite.knoten.map((k) => k.p.y);
const xM = (Math.min(...xs) + Math.max(...xs)) / 2, yM = (Math.min(...ys) + Math.max(...ys)) / 2, r = (Math.max(...xs) - Math.min(...xs)) / 2;
const zAuf = (x: number, y: number) => Math.sqrt(Math.max(0, r * r - (x - xM) ** 2 - (y - yM) ** 2));
const yB = yM - 0.08 * r;
const xB = xM - Math.sqrt(Math.max(0, r * r - (yB - yM) ** 2)) + 0.002;
const ecke: [number, number] = [xM + 0.24 * r, yM - 0.4 * r];
const P3 = (x: number, y: number, f: number): [number, number, number] => [x * sk, y * sk, zAuf(x, y) * f * sk];
const blau = [P3(xB, yB, 1), P3(xB + 0.55 * r, yB - 0.02 * r, 1), P3(ecke[0], ecke[1], 1)];
const rot = [P3(xB + 0.3 * r, yB - 0.16 * r, 0.82), P3(xB + 0.65 * r, yB - 0.18 * r, 0.85), P3(ecke[0], ecke[1], 1)];
const schlitz = maulLinieAusPunkten(kugel, blau.map((p) => ({ x: p[0], y: p[1] })), blau[2]![2]);
const linieU = { ...schlitz, oben: maulLinieUntenAusPunkten(kugel, rot) };
console.log('Kugel Unterbiss Stützen oben:', JSON.stringify(linieU.oben.map((q) => ({ f: +q.f.toFixed(3), v: +q.v.toFixed(3), z: q.z === undefined ? undefined : +q.z.toFixed(3) }))));
messen('Kugel Unterbiss', ableitenMitMaul(kugel, linieU, { stufen: 2 }, { ...maulOptionenVorlage('vorn') }));
// Rex-Überbiss (Prüfwesen)
const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
const plan = pruefwesenBauplan('rex');
messen('Rex Überbiss', ableitenMitMaul(rex, plan.maulLinie!, { stufen: 2 }, { ...maulOptionenVorlage('vorn'), ...(plan.maulOptionen ?? {}) }));
// Rex-Unterbiss wie im Test
const rotU = { ...plan.maulLinie! } as Record<string, unknown>;
delete rotU.unten;
const linieRexU = { ...(rotU as object), oben: [{ f: 0.09, v: 0.3, innen: 0.15 }, { f: 0.14, v: 0.33, innen: 0.2 }, { f: 0.2, v: 0.32, innen: 0.2 }, { f: 0.28, v: 0.36, innen: 0.12 }, { f: 0.337, v: 0.45, innen: 0 }] } as Parameters<typeof ableitenMitMaul>[1];
messen('Rex Unterbiss', ableitenMitMaul(rex, linieRexU, { stufen: 2 }, { ...maulOptionenVorlage('vorn'), ...(plan.maulOptionen ?? {}) }), [0, 0.25]);
