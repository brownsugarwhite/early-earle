// P1 Tag 2–3, Messung: Körper aus den Schleifen (`schleifenKoerper`) gegen den heutigen Bau an den Prüfkörpern des Plans.
// Je Fall: Δ je Blatt (heute → neu), Rest der Bindungen, Überstand, Falten frei/Kappe, Knicke Stufe 1 (95 % / max), Flachband
// je Ansicht, Wendepunkte der Ringe, Zeit. Umgebung: FAELLE, FAIR, GEWICHT, TANGENTE, RUNDEN.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/p1-koerper.ts
import { alleFlaechen, mitLagen, volumen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { extremKoerper } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { schleifenKoerper } from '../../../../packages/shape/src/kern/schleifenKoerper';
import { umrissPlan } from '../../../../packages/shape/src/kern/umrissPlan';
import { flachband, knickeStufe1, punkteVon, umgeklappt, wendepunkte } from '../../../../packages/shape/src/kern/pruefen/koerperMass';

const PX = 461;
const faelle = (process.env.FAELLE ?? 'kugel,ei,kegel,wuerfel,pilz,robbe,rex,tigerkopf,langhals,ente,vase').split(',');
const opt = { fair: Number(process.env.FAIR ?? 30), ziel: Number(process.env.ZIEL ?? 1), gewicht: Number(process.env.GEWICHT ?? 1e3), tangente: Number(process.env.TANGENTE ?? 1e3), runden: Number(process.env.RUNDEN ?? 6), kaefig: Number(process.env.KAEFIG ?? 0), ring: Number(process.env.RING ?? 0), reihe: Number(process.env.REIHE ?? 0), laengs: Number(process.env.LAENGS ?? 0), anker: Number(process.env.ANKER ?? 0), ...(process.env.NUR ? { nur: process.env.NUR.split(',') as ('naht' | 'top' | 'front')[] } : {}) };

const f1 = (x: number) => x.toFixed(1);

console.log(`Optionen ${JSON.stringify(opt)}`);
console.log('Fall | Δ S/F/T heute → neu (px) | Rest F/T max (mittel) | Überstand F/T | Falten frei/Kappe heute → neu | Knicke Stufe 1 95 %/max heute → neu | Flachband S/F/T heute → neu (%) | Wendepunkte heute → neu | umgeklappt | Volumen | ms');
for (const name of faelle) {
  const dok = extremKoerper(name).dok();
  const bau = editorBauen(imAblauf(dok, 'roehre', 'kugel'), editorPlan('roehre'));
  const abl = bau.stand.abl;
  const dokBau = bau.dok;
  const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
  const plan = umrissPlan({ ...dokBau, skalierung: 1 });
  let r;
  try {
    r = schleifenKoerper(abl, plan, { ...dokBau, skalierung: 1 }, opt);
  } catch (e) {
    console.log(`${name}: FEHLER ${String(e).slice(0, 200)}`);
    continue;
  }
  const vor = punkteVon(abl.fein);
  const nach = punkteVon(r.abl.fein);
  const dAlt = blattAbweichungen(vor, flaechen, { ...dokBau, skalierung: 1 });
  const dNeu = blattAbweichungen(nach, flaechen, { ...dokBau, skalierung: 1 });
  const fAlt = faltenNachZonenRoehre(abl);
  const fNeu = faltenNachZonenRoehre(r.abl);
  const kAlt = knickeStufe1(abl, abl.fein);
  const kNeu = knickeStufe1(r.abl, r.abl.fein);
  const flAlt = flachband(vor, flaechen);
  const flNeu = flachband(nach, flaechen);
  const wAlt = wendepunkte(abl, abl.fein);
  const wNeu = wendepunkte(r.abl, r.abl.fein);
  const um = umgeklappt(vor, nach, flaechen, abl);
  const fk = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const volAlt = volumen(mitLagen(fk, abl.fein));
  const volNeu = volumen(mitLagen(fk, r.abl.fein));
  const b = r.bericht;
  console.log(
    `${name} | ${f1(dAlt.seite.max)}/${f1(dAlt.front.max)}/${f1(dAlt.top.max)} → ${f1(dNeu.seite.max)}/${f1(dNeu.front.max)}/${f1(dNeu.top.max)} | ${f1(b.rest.front.max)} (${f1(b.rest.front.mittel)}) / ${f1(b.rest.top.max)} (${f1(b.rest.top.mittel)}) | ${f1(b.ueberstand.front)}/${f1(b.ueberstand.top)} | ${f1(fAlt.zonen.frei.max)}/${f1(fAlt.zonen.kappe.max)}° → ${f1(fNeu.zonen.frei.max)}/${f1(fNeu.zonen.kappe.max)}° | ${f1(kAlt.p95)}/${f1(kAlt.max)}° → ${f1(kNeu.p95)}/${f1(kNeu.max)}° | ${f1(flAlt.seite)}/${f1(flAlt.front)}/${f1(flAlt.top)} → ${f1(flNeu.seite)}/${f1(flNeu.front)}/${f1(flNeu.top)} | ${wAlt} → ${wNeu} | ${um.zahl}${um.zahl ? ` (${um.wo})` : ''} | ${(100 * (volNeu / volAlt - 1)).toFixed(0)} % | ${b.ms.toFixed(0)} (Zuordnung ${b.zuordnung.map((z) => `${f1(z.max)}/${f1(z.mittel)}`).join(' ')} px; gebunden F ${b.proben.front.gebunden}/${b.proben.front.gezeichnet}, T ${b.proben.top.gebunden}/${b.proben.top.gezeichnet}; fern > 4 px: F ${b.fern.front.zahl}${b.fern.front.zahl ? ` (x ${b.fern.front.xVon.toFixed(0)}…${b.fern.front.xBis.toFixed(0)})` : ''}, T ${b.fern.top.zahl}${b.fern.top.zahl ? ` (x ${b.fern.top.xVon.toFixed(0)}…${b.fern.top.xBis.toFixed(0)})` : ''}; aufgegeben F ${b.aufgegeben.front}, T ${b.aufgegeben.top}; weich F ${b.weich.front}, T ${b.weich.top}; Bewegung ${f1(b.bewegung)} px)`,
  );
}
