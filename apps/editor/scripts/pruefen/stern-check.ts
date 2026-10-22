// Tiger Mercedesstern: Durchdringungen je Variante der Ableit-Optionen, plus Zugzeit (ziehen) für Kugel/Rex
import tigerJson from '../../../../packages/shape/src/versuch/vorlagen/tiger.json';
import rexJson from '../../../../packages/shape/src/versuch/vorlagen/rex.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { neuesDokument } from '../../../../packages/shape/src/dokument';
import { selbstDurchdringungen } from '../../../../packages/shape/src/versuch/pruefen';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { ableitenMitMaul, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
import { kastenSpanten } from '../../../../packages/shape/src/kern/kasten';
import { umrissAusNetz } from '../../../../packages/shape/src/versuch/umriss3d';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { ableiten, ziehen, type AbleitOptionen } from '../../../../packages/shape/src/kern/ableiten';
const roh = vorlageDokument(tigerJson as unknown as Vorlage, 'zu', 'tiger');
const dok = { ...roh, spanten: kastenSpanten(roh.profile.front, 0.02, 0.15, 0.25, 0.85) };
const linie = { fv: [{ f: 0, v: 0.5 }, { f: 0.032, v: 0.28 }, { f: 0.06, v: 0.25 }], unterSpitze: 0 };
const maulOpt = { ...maulOptionenVorlage('vorn'), winkelUnten: 30, winkelOben: 26, band: 1, rille: 0.006, reihen: 2, tiefe: 0.5 };
const varianten: [string, Partial<AbleitOptionen>][] = [['Standard (Maulbau ohne Breitenzeilen)', {}]];
for (const [name, opt] of varianten) {
  const abl = ableitenMitMaul(dok, linie, { stufen: 2, ...opt }, maulOpt);
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  const aus: string[] = [];
  for (const o of [0, 0.5, 1]) {
    const pose = maulPose(abl, o);
    const punkte: [number, number, number][] = [];
    for (let i = 0; i < pose.fein.length / 3; i++) punkte.push([pose.fein[3 * i]!, pose.fein[3 * i + 1]!, pose.fein[3 * i + 2]!]);
    const d = selbstDurchdringungen({ punkte, flaechen, schaerfe: new Map() }, 1e-4);
    aus.push(`${Math.round(o * 100)} %: ${d.paare}`);
    if (o === 0) {
      const netz = { punkte, flaechen, schaerfe: new Map<string, number>() };
      const sk = dok.skalierung;
      for (const a of ['seite', 'front', 'top'] as const) {
        const soll = pfadAbtasten(vollerPfad(dok.profile[a]), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
        const ist = umrissAusNetz(netz, a, 400);
        const abstand = (p: { x: number; y: number }, zug: readonly { x: number; y: number }[]) => { let best = Infinity; for (let i = 0; i < zug.length; i++) { const q = zug[i]!, r = zug[(i + 1) % zug.length]!; const dx = r.x - q.x, dy = r.y - q.y, l2 = dx * dx + dy * dy; const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - q.x) * dx + (p.y - q.y) * dy) / l2)) : 0; best = Math.min(best, Math.hypot(q.x + t * dx - p.x, q.y + t * dy - p.y)); } return best; };
        let m = 0;
        for (const z of ist) for (const p of z) m = Math.max(m, abstand(p, soll));
        for (const p of soll) m = Math.max(m, Math.min(...ist.map((z) => abstand(p, z))));
        aus.push(`${a} max ${(m * 461).toFixed(1)} px`);
      }
    }
  }
  console.log(`${name}: ${aus.join(' | ')}`);
}
for (const [name, d] of [['Kugel', neuesDokument('Kugel')], ['Rex', vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex')]] as const) {
  const abl = ableiten(d, { stufen: 3 });
  const d2 = { ...d, profile: { ...d.profile, seite: { ...d.profile.seite, knoten: d.profile.seite.knoten.map((k, i) => (i === 0 ? { ...k, p: { x: k.p.x, y: k.p.y + 0.01 } } : k)) } } };
  let best = Infinity;
  for (let w = 0; w < 5; w++) { const t = performance.now(); ziehen(abl, d2); best = Math.min(best, performance.now() - t); }
  console.log(`${name}: Zug Stufe 3 bester Schritt ${best.toFixed(1)} ms (Ableitung ${abl.zeiten.gesamt.toFixed(0)} ms, Breitenzeilen ${abl.breite?.fein.length ?? 0})`);
}
