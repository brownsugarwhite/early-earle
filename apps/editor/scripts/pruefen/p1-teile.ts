// P1 Tag 4–5 „Teile an der Naht“, Messung: Rumpf mit Kindern über Fenster auf dem Schleifen-Käfig (`schleifenKaefig` →
// `schleifenTeile`) gegen den heutigen Bau an Langhals, Robbe, Ente und Pilz (Extremreihe, Florians Ablauf aus der Startkugel).
// Je Fall: gefundene Kinder (Quelle, Rumpf längs : quer, Sehne zur Achse), Fenster (Art, Reihen λ, Seite, Spalten bzw. Ring),
// Ringe × Punkte, Δ je Blatt (heute → neu, Raster 1920), Rest, Silhouette, Überstand, Nahtknick (Stufe 1 an den Fensterrändern; frei = die Zeichnung ist dort in jeder Ansicht glatt, Ecken = an T-Stößen der Zeichnung),
// nach innen je Teil, Knicke Stufe 1, Zeit. Umgebung: FAELLE (Standard langhals,robbe,ente,pilz), FAIR, INNEN, TANGENTE, GEWICHT, NAHTGLATT (0 = aus), SCHUB (1 = Scheitelschub, Versuch), RUMPFKIPPEN, KLEMME (0 = Hülle nicht als Obergrenze), HRING (0 = Ellipsen statt Hüllenschnitte), ENDSTUECK (0 = Endstück aus: Streifen statt Fortsetzung des Röhrenendes), ENDHART (0 = Endstück-Ringe nur an Naht und Seiten hart), SPALTEN (feste Spaltenzahl eines Streifens, Versuch).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/p1-teile.ts
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { extremKoerper } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { knickeStufe1, nachInnenTeile, punkteVon } from '../../../../packages/shape/src/kern/pruefen/koerperMass';
import { schleifenKaefig, teileFinden } from '../../../../packages/shape/src/kern/schleifenKaefig';
import { umrissPlan } from '../../../../packages/shape/src/kern/umrissPlan';

const faelle = (process.env.FAELLE ?? 'langhals,robbe,ente,pilz').split(',');
const opt = { fair: Number(process.env.FAIR ?? 30), innen: Number(process.env.INNEN ?? 1), tangente: Number(process.env.TANGENTE ?? 1e3), gewicht: Number(process.env.GEWICHT ?? 1e3), nahtGlatt: process.env.NAHTGLATT !== '0', scheitelSchub: process.env.SCHUB === '1', rumpfKippen: Number(process.env.RUMPFKIPPEN ?? 0), huelleKlemmt: process.env.KLEMME !== '0', huellenRing: process.env.HRING !== '0', endstueck: process.env.ENDSTUECK !== '0', endstueckHart: process.env.ENDHART !== '0', spalten: Number(process.env.SPALTEN ?? 0) };
const f1 = (x: number) => x.toFixed(1);
console.log(`Optionen ${JSON.stringify(opt)}`);
console.log('Fall | Kinder (Quelle, Rumpf, Sehne) | ausgelassen | Achse | Fenster | Ringe × Punkte | Δ S/F/T heute → neu (px) | Rest | Silhouette | Überstand F/T | Nahtknick frei / an gezeichneten Ecken (Kanten frei/Ecken) | nach innen (Rumpf / Kinder; Zahl und Flächenanteil) | Knicke Stufe 1 95 %/max | Punkte | ms');
for (const name of faelle) {
  const dok0 = extremKoerper(name).dok();
  const bau = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
  const abl = bau.stand.abl;
  const dok = { ...bau.dok, skalierung: 1 };
  const plan = umrissPlan(dok);
  const fund = teileFinden(dok, plan, abl.gefroren);
  const kinder = fund.kinder.map((k) => `${k.name} (${k.quelle}, ${k.laenglich.toFixed(2)} : 1, ${k.sehneWinkel.toFixed(0)}°)`).join(', ') || '–';
  const r = schleifenKaefig(abl, plan, dok, opt);
  const b = r.bericht;
  if (!b.ok || !b.teile) {
    console.log(`${name} | ${kinder} | ${fund.ausgelassen.map((a) => `${a.name}: ${a.grund}`).join('; ') || '–'} | nicht gebaut — ${b.grund}`);
    continue;
  }
  const flaechen = alleFlaechen(r.abl.unterteilung.stufen[r.abl.unterteilung.stufen.length - 1]!.kaefig);
  const nach = punkteVon(r.abl.fein);
  const dAlt = blattAbweichungen(punkteVon(abl.fein), alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig), dok, 1920);
  const dNeu = blattAbweichungen(nach, flaechen, dok, 1920);
  const kNeu = knickeStufe1(r.abl, r.abl.fein);
  const innen = nachInnenTeile(nach, flaechen, r.abl, b.achse, b.teile.teilVonFlaeche ?? new Int16Array(0), b.teile.kinder);
  const fenster = b.teile.kinder.map((k) => `${k.name} ${k.art} λ ${k.fenster.lamA}…${k.fenster.lamB} ${k.fenster.seite} ${k.art === 'streifen' ? `${k.fenster.c} Spalten` : `Ring ${k.fenster.c}`}`).join('; ');
  const ringe = b.teile.kinder.map((k) => `${k.ringe} × ${k.punkte}`).join('; ');
  console.log(
    `${name} | ${kinder} | ${b.teile.ausgelassen.map((a) => `${a.name}: ${a.grund}`).join('; ') || '–'} | ${b.achse} | ${fenster} | ${ringe} | ${f1(dAlt.seite.max)}/${f1(dAlt.front.max)}/${f1(dAlt.top.max)} → ${f1(dNeu.seite.max)}/${f1(dNeu.front.max)}/${f1(dNeu.top.max)} | ${f1(b.rest.max)} | ${f1(b.silhouette)}° | ${f1(b.ueberstand.front)}/${f1(b.ueberstand.top)} | ${f1(b.teile.nahtKnick)}°${b.teile.nahtKnickEcken !== null ? ` / Ecken ${f1(b.teile.nahtKnickEcken)}°` : ''} (${b.teile.nahtKanten.frei}/${b.teile.nahtKanten.ecken} Kanten) | ${innen.rumpf} (${f1(innen.anteil.rumpf)} %) / ${innen.kinder.map((z, i) => `${z} (${f1(innen.anteil.kinder[i]!)} %)`).join(', ')} | ${f1(kNeu.p95)}/${f1(kNeu.max)}° | ${r.abl.kaefig.n} (${abl.kaefig.n}) | ${b.ms.toFixed(0)} (Unterteilung ${b.msUnterteilung.toFixed(0)}, Lösen ${b.msLoeser.toFixed(0)})`,
  );
}
