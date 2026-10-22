// Kiefer-Spanten im Kern (14.10., Florian: „von vorne einen Spant für Ober- und einen für Unterkiefer, wenn der Spant von
// der Seite über beide liegt“): In Maulringen gilt unter der Lippe der Querschnitt `unten`, darüber `profil`.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import type { Profil } from '../profil';
import { spantEinfuegen } from '../spanten';
import { kieferSchnitt, knotenImTeil, teilZug } from './kieferSpant';
import { ableitenMitMaul, maulOptionenVorlage } from './maul';
import { maulLinieAusDokument } from './maulDokument';
import { kugelMaulDokument, mitStationenVon, pruefenMaul } from './pruefstand';

const bauen = (d: Dokument) => {
  const g = d.kaefig?.stationen;
  return ableitenMitMaul(d, maulLinieAusDokument(d)!, { stufen: 2, ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
};
const breiter = (pr: Profil, k: number): Profil => ({ ...pr, knoten: pr.knoten.map((n) => ({ ...n, p: { x: n.p.x * k, y: n.p.y }, ein: { x: n.ein.x * k, y: n.ein.y }, aus: { x: n.aus.x * k, y: n.aus.y } })) });

describe('Kiefer-Spanten im Kern', () => {
  const roh = kugelMaulDokument('ueberbiss', true);
  const basis = mitStationenVon({ ...roh, spanten: spantEinfuegen(roh, 0.22).spanten }, { ...roh, spanten: spantEinfuegen(roh, 0.22).spanten });
  const sp = basis.spanten![0]!;
  const mitUnten = (u: Profil): Dokument => ({ ...basis, spanten: [{ ...sp, unten: u }] });
  const a0 = bauen(basis);
  const N = 16;

  it('Unterkiefer als unveränderte Kopie: Netz identisch', () => {
    const a = bauen(mitUnten({ ...sp.profil, knoten: sp.profil.knoten.map((k) => ({ ...k })) }));
    let d = 0;
    for (let i = 0; i < a.fein.length; i++) d = Math.max(d, Math.abs(a.fein[i]! - a0.fein[i]!));
    expect(d).toBeLessThan(1e-12);
  });

  it('breiterer Unterkiefer: nur die untere Ringhälfte des Reifens wird breiter, Lippe und Oberkiefer bleiben; offen keine Durchdringungen', () => {
    const d = mitUnten(breiter(sp.profil, 1.3));
    const a = bauen(d);
    const ring = a0.reifen.find((r) => r.spant === 0)!.ring;
    const jL = a0.maul.lage.jL;
    expect(ring).toBeLessThanOrEqual(a0.maul.lage.k);
    const z = (abl: typeof a, j: number) => Math.abs(abl.kaefig.xyz[3 * (ring * N + j) + 2]!);
    for (let j = 1; j <= jL; j++) expect(z(a, j), `Zeile ${j}`).toBeCloseTo(z(a0, j), 6); // der Ausgleich koppelt nur im Rauschen (3e-9)
    let breiterUnten = 0;
    for (let j = jL + 1; j < N / 2; j++) if (z(a, j) > z(a0, j) + 1e-4) breiterUnten++;
    expect(breiterUnten).toBeGreaterThan(0);
    // Ringe hinter dem Mundwinkel bleiben (bis auf die Kopplung im Ausgleich, < 0,05 px)
    let hinten = 0;
    for (let i = a0.maul.lage.k + 1; i < 24; i++) for (let j = 0; j < N; j++) for (let c = 0; c < 3; c++) hinten = Math.max(hinten, Math.abs(a.kaefig.xyz[3 * (i * N + j) + c]! - a0.kaefig.xyz[3 * (i * N + j) + c]!));
    expect(hinten * 461).toBeLessThan(0.05);
    const r = pruefenMaul(d);
    for (const p of r.paare.slice(1)) expect(p.paare, `Öffnung ${p.oeffnung}`).toBe(0);
  }, 60_000);

  it('Schnitthöhe und Teilkurven (Front, Bühne): über dem Maul eine Höhe, sonst null; Oberkiefer endet, Unterkiefer beginnt auf ihr', () => {
    const c = kieferSchnitt(basis, sp.f);
    expect(c).not.toBeNull();
    expect(c!).toBeGreaterThan(0.2);
    expect(c!).toBeLessThan(0.8);
    expect(kieferSchnitt(basis, 0.9)).toBeNull(); // hinter dem Mundwinkel
    expect(kieferSchnitt(roh, 0.22)).not.toBeNull();
    const o = teilZug(sp.profil, c!, 'oben');
    const u = teilZug(sp.profil, c!, 'unten');
    expect(o[0]!.y).toBeCloseTo(1, 9);
    expect(o[o.length - 1]!.y).toBeCloseTo(c!, 12);
    expect(u[0]!.y).toBeCloseTo(c!, 12);
    expect(u[u.length - 1]!.y).toBeCloseTo(0, 9);
    expect(o[o.length - 1]!.x).toBeCloseTo(u[0]!.x, 12);
    // Achspunkte: oben gehört zum Oberkiefer, unten zum Unterkiefer
    const n = sp.profil.knoten.length;
    expect(knotenImTeil(sp.profil, 0, c!, 'oben')).toBe(true);
    expect(knotenImTeil(sp.profil, n - 1, c!, 'unten')).toBe(true);
  });
});
