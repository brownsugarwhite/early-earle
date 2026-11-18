// Je Ring: Soll-Breite (Top bei x, Front auf Höhe des breitesten Punkts), Grenzlage des breitesten Punkts, Silhouette von oben bei x
import tigerJson from '../../../../packages/shape/src/versuch/vorlagen/tiger.json';
import rexJson from '../../../../packages/shape/src/versuch/vorlagen/rex.json';
import langhalsJson from '../../../../packages/shape/src/versuch/vorlagen/langhals.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { umrissAusNetz } from '../../../../packages/shape/src/versuch/umriss3d';
import { type Dokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { ableiten, querschnitteFuer, sprossenVon, ABLEIT_STANDARD } from '../../../../packages/shape/src/kern/ableiten';
import { silhouettenBreite } from '../../../../packages/shape/src/kern/breite';
import { kastenSpanten } from '../../../../packages/shape/src/kern/kasten';
const PX = 461;
const name = process.argv[2] ?? 'tiger';
const dok: Dokument = name === 'tiger'
  ? (() => { const r = vorlageDokument(tigerJson as unknown as Vorlage, 'zu', 'tiger'); return { ...r, spanten: kastenSpanten(r.profile.front, 0.02, 0.15, 0.25, 0.85) }; })()
  : name === 'rex' ? vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex') : vorlageDokument(langhalsJson as unknown as Vorlage, 'zu', 'langhals');
const sk = dok.skalierung;
for (const a of ['seite', 'front', 'top'] as const) {
  const pts = pfadAbtasten(vollerPfad(dok.profile[a]), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
  console.log(`${a}: x ${Math.min(...xs).toFixed(3)} … ${Math.max(...xs).toFixed(3)}, y ${Math.min(...ys).toFixed(3)} … ${Math.max(...ys).toFixed(3)}`);
}
const abl = ableiten(dok, { stufen: 2 });
const v = abl.vorlage; const { R, N } = v;
const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
const punkte: [number, number, number][] = [];
for (let i = 0; i < abl.fein.length / 3; i++) punkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
const netz = { punkte, flaechen: alleFlaechen(letzte), schaerfe: new Map<string, number>() };
const topIst = umrissAusNetz(netz, 'top', 400).flat();
const frontIst = umrissAusNetz(netz, 'front', 400).flat();
const breiten = silhouettenBreite(dok);
const opt = { ...ABLEIT_STANDARD, stufen: 2 };
const qs = querschnitteFuer(sprossenVon(abl.altLeiter, abl.stationen), dok, breiten, N, opt);
console.log(`Breite-Zeilen: ${abl.breite?.fein.length ?? 0}; Naht-Zeilen ${abl.naht.fein.length}; Käfig n ${v.kaefig.n}`);
const sprossen = sprossenVon(abl.altLeiter, abl.stationen);
console.log('ring |   x    |  top(x) | front(y) | Wsoll(min) | zGrenz  | silh|z|@x | Δsilh px | zKäfig | u.y→o.y | j* v* y* | zZiel');
for (let i = 0; i < R; i++) {
  const q = qs[i]!;
  let jBest = -1, wBest = 0;
  for (let j = 1; j < N / 2; j++) { const w = q.w[j] ?? 0; if (w > wBest + 1e-9) { wBest = w; jBest = j; } }
  const p = v.ringPunkt(i, jBest);
  const x = abl.ziele[3 * p]!, y = abl.ziele[3 * p + 1]!;
  const zG = abl.fein[3 * p + 2]!; const zK = abl.kaefig.xyz[3 * p + 2]!;
  const t = breiten.top(x), f = breiten.front(y);
  let silh = 0; for (const s of topIst) if (Math.abs(s.x - x) < 0.004) silh = Math.max(silh, Math.abs(s.y));
  const sp = sprossen[i]!;
  console.log(`${String(i).padStart(4)} | ${x.toFixed(3).padStart(6)} | ${t.toFixed(4)} | ${f.toFixed(4)} | ${Math.min(t, f).toFixed(4)}     | ${zG.toFixed(4)} | ${silh.toFixed(4)}   | ${((silh - t) * PX).toFixed(1).padStart(6)} | ${zK.toFixed(4)} | ${sp.u.y.toFixed(3)}→${sp.o.y.toFixed(3)} | ${jBest} ${q.v[jBest]!.toFixed(2)} ${y.toFixed(3)} | ${abl.ziele[3 * p + 2]!.toFixed(4)}`);
}
// Welche feinen Punkte liegen bei x ≈ −0,29 und |z| > 0,15? (Tiger-Wand)
if (name === 'tiger') {
  const n0 = v.kaefig.n;
  const treffer: string[] = [];
  const ueber: { i: number; d: number }[] = [];
  for (let i = 0; i < punkte.length; i++) { const [x, , z] = punkte[i]!; const t = breiten.top(x); if (t > 0 && Math.abs(z) - t > 0.0033) ueber.push({ i, d: Math.abs(z) - t }); }
  ueber.sort((a, b) => b.d - a.d);
  console.log(`Feine Punkte > 1,5 px breiter als Top: ${ueber.length}`);
  for (let i = 0; i < punkte.length; i++) {
    const [x, y, z] = punkte[i]!;
    if (ueber.slice(0, 14).some((o) => o.i === i)) {
      let lage = `fein ${i}`;
      if (i < n0) { let gef = false; for (let r = 0; r < R && !gef; r++) for (let j = 0; j < N; j++) if (v.ringPunkt(r, j) === i) { lage = `Ring ${r} j ${j}`; gef = true; break; } if (!gef) lage = `Käfig ${i} (Kappe/Maul)`; }
      const inBreite = abl.breite ? Array.from(abl.breite.fein).includes(i) : false;
      treffer.push(`${lage}${inBreite ? ' [Breitenzeile]' : ''}: x ${x.toFixed(3)} y ${y.toFixed(3)} z ${z.toFixed(3)} soll ${breiten.top(x).toFixed(3)}`);
    }
  }
  console.log(`Punkte bei x −0,30…−0,28 mit |z| > 0,15: ${treffer.length}`);
  for (const t of treffer.slice(0, 24)) console.log('  ' + t);
  // Ring 6, 7, 8: alle Ringpunkte (Grenzlage)
  for (const r of [5, 6, 7, 8, 9]) {
    const zeile: string[] = [];
    for (let j = 0; j <= N / 2; j++) { const p = v.ringPunkt(r, j); zeile.push(`j${j}:(${abl.fein[3 * p]!.toFixed(3)},${abl.fein[3 * p + 1]!.toFixed(3)},${abl.fein[3 * p + 2]!.toFixed(3)})`); }
    console.log(`Ring ${r}: ` + zeile.join(' '));
  }
  // Querschnitt-Vorlage Ring 6/7: v und w
  for (const r of [6, 7, 8]) console.log(`Vorlage Ring ${r}: w = ${qs[r]!.w.map((w) => w.toFixed(2)).join(' ')} | v = ${qs[r]!.v.map((w) => w.toFixed(2)).join(' ')}`);
}
