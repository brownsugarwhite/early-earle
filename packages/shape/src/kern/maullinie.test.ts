// Plan „Zeichnung ist Form“ (15.10.), Schritt 2: Die Lippe liegt dort, wo die Linie gezeichnet ist, auch vorn. Florian:
// „Wenn ich ein ganz gerades Maul einzeichne, hat es immer diese komische Kerbe vorne.“ Eine gerade Linie von der Kontur
// nach hinten muss ein gerades Maul ergeben: Lippenpfad auf der Linie, Anfang an der Naht auf dem gezeichneten Anfang.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import { selbstDurchdringungen } from '../versuch/pruefen';
import { alleFlaechen } from '../kaefig/halbkanten';
import { MAUL_STANDARD, ableitenMitMaul, maulLinieAusPunkten, maulOptionenVorlage, maulPose } from './maul';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;
/** Die Lippe liegt in der Rille (MAUL_STANDARD.rille), nicht auf der Haut: so weit darf ihr Anfang vom gezeichneten Anfang liegen */
const RILLE_PX = MAUL_STANDARD.rille * PX;
type V2 = { x: number; y: number };

function abstandSegment(p: V2, a: V2, b: V2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
}

/** Gerade Linie S → E (Welt, Seitenansicht) als Maul: Lippenpfad gegen die Linie, Anfang gegen S, Durchdringungen. */
function geradesMaul(name: string, dok: Dokument, s: V2, e: V2) {
  const punkte: V2[] = [];
  for (let i = 0; i <= 24; i++) punkte.push({ x: s.x + ((e.x - s.x) * i) / 24, y: s.y + ((e.y - s.y) * i) / 24 });
  const linie = maulLinieAusPunkten(dok, punkte);
  const abl = ableitenMitMaul(dok, linie, { stufen: 2 }, maulOptionenVorlage('vorn'));
  const m = abl.maul;
  let lippeMax = 0;
  for (const idx of m.pfad) lippeMax = Math.max(lippeMax, abstandSegment({ x: abl.fein[3 * idx]!, y: abl.fein[3 * idx + 1]! }, s, e) * PX);
  const a0 = m.pfad[0]!;
  const anfang = Math.hypot(abl.fein[3 * a0]! - s.x, abl.fein[3 * a0 + 1]! - s.y) * PX;
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  // Region je feiner Fläche (Art des Käfigpunkts mit dem größten Gewicht am ersten Eckpunkt), wie Beweis 2
  const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel'];
  const M = abl.unterteilung.matrix;
  const bereiche = flaechen.map((f) => {
    const g = new Float64Array(ARTEN.length);
    for (let q = M.start[f[0]!]!; q < M.start[f[0]! + 1]!; q++) g[m.art[M.index[q]!]!] = (g[m.art[M.index[q]!]!] ?? 0) + M.wert[q]!;
    let best = 0;
    for (let a = 1; a < g.length; a++) if (g[a]! > g[best]!) best = a;
    return ARTEN[best]!;
  });
  const paare: number[] = [];
  const berichte: string[] = [];
  for (const o of [0, 0.5, 1]) {
    const pose = maulPose(abl, o);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < pose.fein.length / 3; i++) pts.push([pose.fein[3 * i]!, pose.fein[3 * i + 1]!, pose.fein[3 * i + 2]!]);
    const d = selbstDurchdringungen({ punkte: pts, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
    paare.push(d.paare);
    if (d.paare) berichte.push(`${Math.round(o * 100)} %: ` + Object.entries(d.nachBereich).map(([k, n]) => `${k} ${n} (${(d.orteNachBereich[k] ?? [])[0]?.map((x) => x.toFixed(3)).join(',') ?? ''})`).join(', '));
  }
  console.log(`${name}: Stützen ${linie.fv.length} (Anfang f ${linie.fv[0]!.f.toFixed(4)} v ${linie.fv[0]!.v.toFixed(2)}, unterSpitze ${linie.unterSpitze}), Lippe→Linie max ${lippeMax.toFixed(2)} px, Anfang→S ${anfang.toFixed(2)} px, Durchdringungen 0/50/100 %: ${paare.join('/')}${berichte.length ? ' [' + berichte.join('; ') + ']' : ''}, Umbau ${abl.zeiten.gesamt.toFixed(0)} ms`);
  return { linie, abl, lippeMax, anfang, paare };
}

describe('Zeichnung ist Form, Schritt 2: Lippe auf der gezeichneten Linie', () => {
  const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
  it('Rex, gerade Linie von der Schnauzenfront (zwischen Spitze und Kinnecke) nach hinten: gerades Maul, Anfang auf dem gezeichneten Anfang', () => {
    // Spitze (−0,375, 0,286), Kinnecke (−0,324, 0,271); Kontur bei y = 0,279 vorn bei x ≈ −0,35
    const r = geradesMaul('Rex gerade', rex, { x: -0.35, y: 0.279 }, { x: -0.2, y: 0.279 });
    expect(r.linie.fv[0]!.v).toBe(0);
    expect(r.linie.unterSpitze).toBe(1);
    // 2,1 px: Die Lippe liegt in der Rille (vorn am tiefsten, 0,012 · H · (1 − (t/m)²)), auf der schrägen Unterseite des
    // Rex zeigt „nach innen“ in der Seitenansicht nach oben. Ohne Rille läge sie auf der Linie; die Kerbe (10–14 px) ist weg.
    expect(r.lippeMax).toBeLessThan(2.5);
    expect(r.anfang).toBeLessThan(RILLE_PX + 1);
    for (const p of r.paare) expect(p).toBe(0);
  });
  it('Rex, gerade Linie hinter der Kinnecke (y 0,256): Ring 0 rückt hinter den Anfang, Kinnecke ohne Ring', () => {
    const r = geradesMaul('Rex hinter Kinn', rex, { x: -0.318, y: 0.256 }, { x: -0.2, y: 0.256 });
    expect(r.linie.fv[0]!.v).toBe(0);
    expect(r.lippeMax).toBeLessThan(3);
    expect(r.anfang).toBeLessThan(RILLE_PX + 1);
    for (const p of r.paare) expect(p).toBe(0);
  });
  it('Rex, Linie aus der scharfen Spitze: Überbiss (unterSpitze 1), Lippe auf der Linie', () => {
    const r = geradesMaul('Rex Spitze', rex, { x: -0.375, y: 0.286 }, { x: -0.2, y: 0.25 });
    expect(r.linie.unterSpitze).toBe(1);
    expect(r.lippeMax).toBeLessThan(3);
    for (const p of r.paare) expect(p).toBe(0);
  });
  it('Kugel, gerade Linie 0,03 unter der Spitze: gerades Maul', () => {
    const r = geradesMaul('Kugel gerade', neuesDokument('Kugel'), { x: -0.263, y: 0.235 }, { x: -0.1, y: 0.235 });
    expect(r.linie.fv[0]!.v).toBe(0);
    expect(r.lippeMax).toBeLessThan(2);
    expect(r.anfang).toBeLessThan(RILLE_PX + 1);
    for (const p of r.paare) expect(p).toBe(0);
  });
});
