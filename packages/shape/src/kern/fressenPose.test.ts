// Fressen wie Editor (Florian 15.10.: „Blendshapes und Bones kombinieren, um ganz extreme Posen und Verformungen zu
// schaffen“; Plan docs/plans/2026-10-15-fressen-wie-editor.md): Die Pose hat eigene Griffe; der Kern leitet daraus einen
// zweiten Käfig mit gleicher Topologie ab und überblendet ihn vor den Knochen. Fallmatrix: Körper ohne Maul, Kugel mit
// Maul gleich / Überbiss / Unterbiss, Rex (Überbiss, Augäpfel), Tiger (Plattenmaul, Kasten), Langhals; Griffe: Umriss
// oben, Front-Breite, Maullinie der Pose; Öffnung 0 (genau die Grundform), ½, 1 (genau die Pose mit Knochen).
import { describe, expect, it } from 'vitest';
import { type Dokument, type Lippen, type Linie3, type PoseForm, neuesDokument } from '../dokument';
import { formAusGrundform } from '../poseForm';
import { bewegeKnoten } from '../profil';
import { selbstDurchdringungen } from '../versuch/pruefen';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexRoh from '../versuch/vorlagen/rex.json';
import tigerRoh from '../versuch/vorlagen/tiger.json';
import langRoh from '../versuch/vorlagen/langhals.json';
import { type MaulErgebnis, ableitenMitMaul, maulOptionenVorlage, maulPose } from './maul';
import { maulLinieAusDokument } from './maulDokument';
import { feinesNetz, kugelMaulDokument, regionen } from './pruefstand';
import { abgleichen } from '../kopplung';
import { type Bauplan, maulMitPose, poseStationen, pruefwesenBauplan, wesenBauen } from './wesen';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;

/** höchster Punkt (y) eines Netzes */
const hoechster = (p: Float32Array) => {
  let m = -Infinity;
  for (let i = 1; i < p.length; i += 3) m = Math.max(m, p[i]!);
  return m;
};
/** größte Abweichung zweier gleich langer Netze */
const abweichung = (a: Float32Array, b: Float32Array) => {
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i]! - b[i]!));
  return a.length === b.length ? m : Infinity;
};

/** Index des höchsten Knotens der Seite */
function obenIndex(d: Dokument): number {
  let best = 0;
  d.profile.seite.knoten.forEach((k, i) => {
    if (k.p.y > d.profile.seite.knoten[best]!.p.y) best = i;
  });
  return best;
}

/** Pose-Form: Seite oben um dy höher (der Schädel wird höher) */
function poseObenHoeher(d: Dokument, dy: number): PoseForm {
  const i = obenIndex(d);
  const k = d.profile.seite.knoten[i]!;
  return { ...formAusGrundform(d), profile: { ...d.profile, seite: bewegeKnoten(d.profile.seite, i, { x: k.p.x, y: k.p.y + dy }) } };
}

/** Linie um (dx, dy) ab dem Knoten `ab` verschieben (Mundwinkel nach hinten/unten ziehen) */
function linieZiehen(l: Linie3, ab: number, dx: number, dy: number): Linie3 {
  return { knoten: l.knoten.map((k, i) => (i >= ab ? { ...k, p: [k.p[0] + dx, k.p[1] + dy, k.p[2]] as [number, number, number] } : k)) };
}

function rexDok(): Dokument {
  return { ...vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex'), ausstattung: pruefwesenBauplan('rex') };
}
function tigerDok(): Dokument {
  return { ...vorlageDokument(tigerRoh as unknown as Vorlage, 'zu', 'tiger'), ausstattung: pruefwesenBauplan('tiger') };
}

/** Bauplan wie im Editor (ohne Look für Tempo), mit der gezeichneten bzw. der Prüfwesen-Maullinie */
function planFuer(d: Dokument, oeffnung: number, formPose = false): Partial<Bauplan> {
  const aus = d.ausstattung ?? {};
  const linie = maulLinieAusDokument(d) ?? aus.maulLinie;
  const maul = linie ? (aus.maul && aus.maul !== 'aus' ? aus.maul : 'vorn') : 'aus';
  return { ...aus, maul, oeffnung, beine: 'aus', schwung: 0, stil: 'fest', earle: false, kaefigLinien: false, ...(linie ? { maulLinie: linie } : {}), ...(formPose ? { formPose } : {}) };
}

describe('Fressen wie Editor: Blendshape der Pose + Knochen', () => {
  it('Körper ohne Maul: zu genau die Grundform, offen der höhere Schädel der Pose, halb die Hälfte; Δ gegen die Pose klein', () => {
    const d0 = neuesDokument('kugel');
    const dok: Dokument = { ...d0, posenForm: { fressen: poseObenHoeher(d0, 0.05) } };
    const basis = wesenBauen(d0, planFuer(d0, 1), null).netz;
    const zu = wesenBauen(dok, planFuer(dok, 0), null);
    const offen = wesenBauen(dok, planFuer(dok, 1, true), zu.stand);
    const halb = wesenBauen(dok, planFuer(dok, 0.5), offen.stand);
    expect(abweichung(zu.netz.positionen, wesenBauen(d0, planFuer(d0, 0), null).netz.positionen)).toBeLessThan(1e-9);
    expect(offen.netz.info.pose).toEqual({ form: true, passt: true });
    const h0 = hoechster(basis.positionen);
    const dOffen = hoechster(offen.netz.positionen) - h0;
    const dHalb = hoechster(halb.netz.positionen) - h0;
    console.log(`ohne Maul: offen +${(dOffen * PX).toFixed(1)} px, halb +${(dHalb * PX).toFixed(1)} px, Δ Seite gegen Pose ${offen.netz.info.blatt?.seite.max.toFixed(1)} px`);
    expect(dOffen).toBeGreaterThan(0.04);
    expect(dOffen).toBeLessThan(0.06);
    expect(dHalb).toBeCloseTo(dOffen / 2, 2);
    expect(offen.netz.info.blatt!.seite.max).toBeLessThan(3);
    // der Käfig der Pose ist gemerkt: ein zweiter Bau ohne Änderung leitet nicht neu ab
    const nochmal = wesenBauen(dok, planFuer(dok, 1, true), offen.stand);
    expect(nochmal.stand.pose?.abl).toBe(offen.stand.pose?.abl);
  }, 60_000);

  // Kugel mit gezeichnetem Maul (wie Florians Bilder), Rex mit Überbiss und Augäpfeln, Tiger mit Plattenmaul, Langhals
  const faelle: [string, () => Dokument][] = [
    ['Kugel gleich', () => kugelMaulDokument('gleich', true)],
    ['Kugel Überbiss', () => kugelMaulDokument('ueberbiss', true)],
    ['Kugel Unterbiss', () => kugelMaulDokument('unterbiss', true)],
    ['Rex', rexDok],
    ['Tiger', tigerDok],
  ];
  for (const [name, mk] of faelle) {
    it(`${name}: Schädel der Pose höher — zu genau die Grundform, offen höher, Topologie passt, Δ gegen die Pose klein`, () => {
      const d0 = mk();
      const dok: Dokument = { ...d0, posenForm: { fressen: poseObenHoeher(d0, 0.04) } };
      const zuBasisBau = wesenBauen(d0, planFuer(d0, 0), null);
      const zuBasis = zuBasisBau.netz;
      const deltaBasis = zuBasisBau.netz.info.blatt!.seite.max;
      const offenBasis = wesenBauen(d0, planFuer(d0, 1), null).netz;
      const zu = wesenBauen(dok, planFuer(dok, 0), null);
      const offen = wesenBauen(dok, planFuer(dok, 1, true), zu.stand);
      expect(abweichung(zu.netz.positionen, zuBasis.positionen)).toBeLessThan(1e-9);
      expect(offen.netz.info.pose).toEqual({ form: true, passt: true });
      const dh = hoechster(offen.netz.positionen) - hoechster(offenBasis.positionen);
      console.log(`${name}: offen +${(dh * PX).toFixed(1)} px höher, Δ Seite gegen Pose ${offen.netz.info.blatt?.seite.max.toFixed(1)} px (Grundform gegen ihre Kurve ${deltaBasis.toFixed(1)} px)`);
      expect(dh).toBeGreaterThan(0.02);
      // die Pose trifft ihre Kurve so gut wie die Grundform ihre (der Unterbiss der Kugel misst schon in der Grundform 8 px)
      expect(offen.netz.info.blatt!.seite.max).toBeLessThan(deltaBasis + 1.5);
    }, 120_000);
  }

  it('Durchdringungen: die Überblendung fügt nichts hinzu — Mischung ≤ max(Grundform, Pose allein) bei ¼, ½, 1 (Kugel gleich/Überbiss/Unterbiss, Rex)', () => {
    // Befund 15.10.: Der Maulbau selbst ist zerbrechlich — schon der Rex mit 18 px höherem Schädel hat abgeleitet (auch frei,
    // ohne Pose) offen 44–78 Paare an Lippe und Haut, die Grundform 0. Das ist kein Fehler der Pose (Kritik-Register,
    // „Maulbau zerbrechlich“); hier wird geprüft, dass die Überblendung keine neuen Durchdringungen macht.
    const zeilen: string[] = [];
    const zaehlen = (fein: Float64Array, flaechen: number[][], bereiche: string[]) => {
      const pts: [number, number, number][] = [];
      for (let i = 0; i < fein.length / 3; i++) pts.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
      return selbstDurchdringungen({ punkte: pts, flaechen, schaerfe: new Map() }, 1e-4, bereiche).paare;
    };
    for (const [name, mk] of faelle.filter(([n]) => n !== 'Tiger')) {
      const d0 = mk();
      const linie = maulLinieAusDokument(d0) ?? d0.ausstattung?.maulLinie;
      const aus = d0.ausstattung ?? {};
      const mo = { ...maulOptionenVorlage('vorn'), ...(aus.maulOptionen ?? {}) };
      const g = d0.kaefig?.stationen;
      const A = ableitenMitMaul(d0, linie as never, { stufen: 2, ...(g ? { stationen: g } : {}), ...(aus.ring ? { ring: aus.ring } : {}) }, mo);
      const dp: Dokument = { ...d0, profile: poseObenHoeher(d0, 0.04).profile };
      const B = ableitenMitMaul(dp, linie as never, { stufen: 2, stationen: poseStationen(A), ...(aus.ring ? { ring: aus.ring } : {}) }, mo) as MaulErgebnis;
      expect(B.kaefig.n).toBe(A.kaefig.n);
      const { flaechen } = feinesNetz(A);
      const bereiche = regionen(A, flaechen);
      const fB = feinesNetz(B);
      const bereicheB = regionen(B, fB.flaechen);
      const o3 = [0.25, 0.5, 1];
      const misch = o3.map((o) => zaehlen(maulMitPose(A, B, o, []).fein, flaechen, bereiche));
      const basis = o3.map((o) => zaehlen(maulPose(A, o).fein, flaechen, bereiche));
      const allein = o3.map((o) => zaehlen(maulPose(B, o).fein, fB.flaechen, bereicheB));
      zeilen.push(`${name}: Mischung ${misch.join('/')} · Grundform ${basis.join('/')} · Pose allein ${allein.join('/')}`);
      misch.forEach((m, i) => expect(m, `${name} bei ${o3[i]}`).toBeLessThanOrEqual(Math.max(basis[i]!, allein[i]!)));
    }
    console.log(`Durchdringungen (¼, ½, 1): ${zeilen.join(' · ')}`);
  }, 240_000);

  it('Maullinie der Pose: Mundwinkel 15 px nach hinten unten — offen wandert der Mundwinkel, die Topologie bleibt (Kugel gleich, Rex)', () => {
    for (const [name, mk] of [faelle[0]!, faelle[3]!] as const) {
      const d0 = mk();
      if (!d0.maul) {
        // Rex: Prüfwesen-Linie aus der Ausstattung, keine gezeichnete — Linie der Pose nicht prüfbar
        continue;
      }
      const l = d0.maul.zu.oben;
      const zuNeu: Lippen = { ...d0.maul.zu, oben: linieZiehen(l, l.knoten.length - 1, 15 / PX, -8 / PX) };
      const pose: PoseForm = { ...formAusGrundform(d0), maul: { ...d0.maul, zu: zuNeu } };
      const dok: Dokument = { ...d0, posenForm: { fressen: pose } };
      const offenBasis = wesenBauen(d0, planFuer(d0, 1), null).netz;
      const offen = wesenBauen(dok, planFuer(dok, 1, true), null).netz;
      expect(offen.info.pose, name).toEqual({ form: true, passt: true });
      const w0 = offenBasis.maul!.winkel;
      const w1 = offen.maul!.winkel;
      const dx = (w1[0] - w0[0]) * PX;
      console.log(`${name}: Mundwinkel offen ${dx.toFixed(1)} px längs x, ${((w1[1] - w0[1]) * PX).toFixed(1)} px längs y`);
      // der Mundwinkel der Pose liegt 15 px weiter hinten: offen wandert er mit (der Winkelring der Pose rückt nach)
      expect(dx).toBeGreaterThan(10);
    }
  }, 120_000);

  it('Langhals: Front der Pose breiter — offen breiter, zu unverändert, Topologie passt', () => {
    const d0 = vorlageDokument(langRoh as unknown as Vorlage, 'zu', 'langhals');
    const f = d0.profile.front;
    let iw = 0;
    f.knoten.forEach((k, i) => {
      if (Math.abs(k.p.x) > Math.abs(f.knoten[iw]!.p.x)) iw = i;
    });
    const kw = f.knoten[iw]!;
    // wie im Editor: die Front koppelt an das Top (gleiche Breite), sonst begrenzt das Top die Breite
    const pose: PoseForm = { ...formAusGrundform(d0), profile: abgleichen({ ...d0.profile, front: bewegeKnoten(f, iw, { x: kw.p.x * 1.2, y: kw.p.y }) }, 'front', d0.profile) };
    const dok: Dokument = { ...d0, posenForm: { fressen: pose } };
    const zu = wesenBauen(dok, planFuer(dok, 0), null);
    const offen = wesenBauen(dok, planFuer(dok, 1, true), zu.stand);
    expect(offen.netz.info.pose).toEqual({ form: true, passt: true });
    const breit = (p: Float32Array) => {
      let m = 0;
      for (let i = 2; i < p.length; i += 3) m = Math.max(m, Math.abs(p[i]!));
      return m;
    };
    const b0 = breit(zu.netz.positionen);
    const b1 = breit(offen.netz.positionen);
    console.log(`Langhals: Breite zu ${(b0 * PX).toFixed(1)} px, offen ${(b1 * PX).toFixed(1)} px, Δ Front gegen Pose ${offen.netz.info.blatt?.front.max.toFixed(1)} px`);
    expect(b1).toBeGreaterThan(b0 * 1.1);
    expect(offen.netz.info.blatt!.front.max).toBeLessThan(6);
  }, 60_000);
});
