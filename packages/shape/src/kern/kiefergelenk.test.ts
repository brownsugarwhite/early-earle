// Kiefergelenk (Plan 5.2, 14.10. spätnachts): Gelenk, Übergang und Reichweite wirken ohne Umbau (Fressen-Tab), die
// Gewichte nach Winkel um das Gelenk halten die Haut hinter dem Mundwinkel durchdringungsfrei.
import { describe, expect, it } from 'vitest';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import { MAUL_STANDARD, ableitenMitMaul, gelenkGewicht, kieferGelenk, kieferGewichteSetzen, maulLinieVorlage, maulOptionenVorlage, maulPose } from './maul';
import { kugelMaulDokument, pruefenMaul } from './pruefstand';
import { wesenBauen } from './wesen';

const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');

describe('Kiefergelenk', () => {
  it('Gewicht nach Winkel: voll vorn, null hinten, Reichweite begrenzt (Kieferlinie)', () => {
    const g = { x: 0, y: 0 };
    const opt = { kieferWinkel: [30, 150] as [number, number], kieferReichweite: [1.2, 2] as [number, number] };
    // Schnauze bei kleinerem x (vorn = −1 wie im Kern: Vorzeichen von Anfang − Winkel)
    expect(gelenkGewicht(-0.5, -0.1, g, -1, 1, opt)).toBe(1); // vorn unten
    expect(gelenkGewicht(0, -0.5, g, -1, 1, opt)).toBeCloseTo(0.5, 5); // senkrecht unter dem Gelenk
    expect(gelenkGewicht(0.5, -0.01, g, -1, 1, opt)).toBe(0); // hinten
    expect(gelenkGewicht(-3, -0.1, g, -1, 1, opt)).toBe(0); // jenseits der Reichweite
  });

  it('Gelenk verschieben setzt Gelenk und Gewichte neu, Standard gibt die Ableitung wieder', () => {
    const abl = ableitenMitMaul(rex, maulLinieVorlage(rex, 'vorn'), { stufen: 1 }, maulOptionenVorlage('vorn'));
    const m = abl.maul;
    const vorher = Float64Array.from(m.gewichtUnten);
    const opt = { ...MAUL_STANDARD, ...maulOptionenVorlage('vorn') };
    const g0 = kieferGelenk(m, opt);
    expect(m.scharnier.x).toBeCloseTo(g0.x, 12);
    kieferGewichteSetzen(m, { ...opt, gelenk: [0.2, 0.1] });
    expect(m.scharnier.x).toBeCloseTo(g0.x - m.vorn * 0.2 * m.laenge, 12);
    expect(m.scharnier.y).toBeCloseTo(g0.y + 0.1 * m.laenge, 12);
    let geaendert = 0;
    for (let i = 0; i < vorher.length; i++) if (Math.abs(m.gewichtUnten[i]! - vorher[i]!) > 1e-9) geaendert++;
    expect(geaendert).toBeGreaterThan(0);
    kieferGewichteSetzen(m, opt);
    for (let i = 0; i < vorher.length; i++) expect(m.gewichtUnten[i]).toBeCloseTo(vorher[i]!, 12);
    // Pose läuft mit den neuen Gewichten
    expect(maulPose(abl, 1).fein.length).toBe(abl.fein.length);
  });

  it('Fressen-Tab ohne Umbau: Gelenk, Übergang, Reichweite, Winkel, Zug und Haps bauen nicht neu; Rille baut neu', () => {
    const dok = { ...rex, ausstattung: { maul: 'vorn' as const, maulLinie: maulLinieVorlage(rex, 'vorn') } };
    const plan = { maul: 'vorn' as const, gewichte: { fressen: 0.6 }, earle: false };
    const a = wesenBauen(dok, plan, null);
    expect(a.netz.info.ableitung).toBeGreaterThan(0);
    expect(a.netz.maul?.rig.winkel).toBe(true);
    const mitOpt = (mo: object) => ({ ...dok, ausstattung: { ...dok.ausstattung, maulOptionen: mo } });
    const b = wesenBauen(mitOpt({ gelenk: [0.1, 0.05], kieferWinkel: [20, 160], kieferReichweite: [1, 2.5], winkelUnten: 40, haps: 0.3, kieferZug: [0.15, -0.05] }), { ...plan, maulOptionen: { gelenk: [0.1, 0.05], kieferWinkel: [20, 160], kieferReichweite: [1, 2.5], winkelUnten: 40, haps: 0.3, kieferZug: [0.15, -0.05] } }, a.stand);
    expect(b.netz.info.ableitung).toBe(0);
    expect(b.netz.maul!.rig.gelenkVersatz).toEqual([0.1, 0.05]);
    expect(b.netz.maul!.knochen.zug).toEqual([0.15, -0.05]);
    expect(b.netz.maul!.knochen.winkelUnten).toBe(40);
    let d = 0;
    for (let i = 0; i < a.netz.positionen.length; i++) d = Math.max(d, Math.abs(a.netz.positionen[i]! - b.netz.positionen[i]!));
    expect(d).toBeGreaterThan(1e-3);
    const c = wesenBauen(dok, { ...plan, maulOptionen: { rille: 0.02 } }, b.stand);
    expect(c.netz.info.ableitung).toBeGreaterThan(0);
  });

  it('Schädelgelenk als Pose-Option (Plan 5.2): versetzt den Drehpunkt ohne Umbau, zu unverändert, offen anders; Standard = Automatik', () => {
    const dok = { ...rex, ausstattung: { maul: 'vorn' as const, maulLinie: maulLinieVorlage(rex, 'vorn') } };
    const plan = { maul: 'vorn' as const, gewichte: { fressen: 1 }, earle: false };
    const a = wesenBauen(dok, plan, null);
    const versatz: [number, number] = [0.4, 0.2];
    const b = wesenBauen({ ...dok, ausstattung: { ...dok.ausstattung, maulOptionen: { schaedelGelenk: versatz } } }, { ...plan, maulOptionen: { schaedelGelenk: versatz } }, a.stand);
    expect(b.netz.info.ableitung).toBe(0);
    const rA = a.netz.maul!.rig;
    const rB = b.netz.maul!.rig;
    expect(rB.schaedelVersatz).toEqual(versatz);
    expect(rB.schaedelBasis).toEqual(rA.schaedelBasis);
    // Knochen: Basis um den Versatz in Maullängen (x nach hinten = −vorn)
    const L = a.netz.maul!.laenge;
    expect(b.netz.maul!.knochen.schaedel.x).toBeCloseTo(rA.schaedelBasis.x - rA.vorn * versatz[0] * L, 9);
    expect(b.netz.maul!.knochen.schaedel.y).toBeCloseTo(rA.schaedelBasis.y + versatz[1] * L, 9);
    let d = 0;
    for (let i = 0; i < a.netz.positionen.length; i++) d = Math.max(d, Math.abs(a.netz.positionen[i]! - b.netz.positionen[i]!));
    expect(d).toBeGreaterThan(1e-3);
    // geschlossen wirkt der Versatz nicht
    const z0 = wesenBauen(dok, { ...plan, gewichte: {} }, b.stand);
    const z1 = wesenBauen({ ...dok, ausstattung: { ...dok.ausstattung, maulOptionen: { schaedelGelenk: versatz } } }, { ...plan, gewichte: {}, maulOptionen: { schaedelGelenk: versatz } }, z0.stand);
    let dz = 0;
    for (let i = 0; i < z0.netz.positionen.length; i++) dz = Math.max(dz, Math.abs(z0.netz.positionen[i]! - z1.netz.positionen[i]!));
    expect(dz).toBeLessThan(1e-9);
  });

  it('Gewichte als Farbe je Ecke', () => {
    const dok = { ...rex, ausstattung: { maul: 'vorn' as const, maulLinie: maulLinieVorlage(rex, 'vorn') } };
    const r = wesenBauen(dok, { maul: 'vorn', gewichte: {}, earle: false, gewichteZeigen: true }, null);
    expect(r.netz.gewichtFarben).not.toBeNull();
    expect(r.netz.gewichtFarben!.length).toBe(r.netz.positionen.length);
  });

  it('Kugel mit Maul: Haut hinter dem Mundwinkel bleibt offen durchdringungsfrei (vorher 20/64/78/92 Paare)', () => {
    const r = pruefenMaul(kugelMaulDokument('gleich', true));
    for (const p of r.paare.slice(1)) expect(p.nachBereich['haut/haut'] ?? 0, `Öffnung ${p.oeffnung}`).toBeLessThanOrEqual(2);
  }, 60_000);
});
