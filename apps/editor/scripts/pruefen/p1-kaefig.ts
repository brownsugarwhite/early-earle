// P1 Tag 2–3, zweiter Anlauf, Messung: der Käfig aus den Schleifen (`schleifenKaefig`) gegen den heutigen Bau an den Einteilern
// (`pruefen/einteiler.ts`). Je Fall: Achse, Ring der Ringschleife, Bögen, Δ je Blatt (heute → neu, Raster 1920), Rest an den
// Schleifen, Silhouette, Innen, Überstand, Kippung, nach innen gekehrte Flächen, Falten frei/Kappe, Knicke Stufe 1, Flachband,
// Wendepunkte, Falten des Käfigs, Zeit. Umgebung: FAELLE, ACHSE, FAIR, INNEN, TANGENTE, GEWICHT, KIPPEN, EBEN (1 = Ringe eben).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/p1-kaefig.ts
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { EINTEILER, einteiler } from '../../../../packages/shape/src/kern/pruefen/einteiler';
import { faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { flachband, knickeStufe1, nachInnen, punkteVon, wendepunkte } from '../../../../packages/shape/src/kern/pruefen/koerperMass';
import { schleifenKaefig } from '../../../../packages/shape/src/kern/schleifenKaefig';
import { umrissPlan } from '../../../../packages/shape/src/kern/umrissPlan';

const faelle = (process.env.FAELLE ?? EINTEILER.map((e) => e.name).join(',')).split(',');
const opt = {
  ...(process.env.ACHSE ? { achse: process.env.ACHSE as 'x' | 'y' } : {}),
  fair: Number(process.env.FAIR ?? 30),
  innen: Number(process.env.INNEN ?? 1),
  tangente: Number(process.env.TANGENTE ?? 1e3),
  gewicht: Number(process.env.GEWICHT ?? 1e3),
  kippen: Number(process.env.KIPPEN ?? 1),
  ...(process.env.EBEN ? { eben: process.env.EBEN === '1' } : {}),
};
const f1 = (x: number) => x.toFixed(1);
console.log(`Optionen ${JSON.stringify(opt)}`);
console.log('Fall | Achse · Ring | Bögen vorn · hinten (px) | Δ S/F/T heute → neu (px) | Rest | Silhouette | innen | Überstand F/T | Kippung | nach innen | Falten frei/Kappe heute → neu | Knicke Stufe 1 95 %/max | Flachband S/F/T (%) | Wende | Falten Ringe/Reihen/Spitzen | ms');
for (const name of faelle) {
  const dok0 = einteiler(name).dok();
  const bau = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
  const abl = bau.stand.abl;
  const dok = { ...bau.dok, skalierung: 1 };
  const r = schleifenKaefig(abl, umrissPlan(dok), dok, opt);
  const b = r.bericht;
  if (!b.ok) {
    console.log(`${name}: nicht gebaut — ${b.grund}`);
    continue;
  }
  const flaechen = alleFlaechen(r.abl.unterteilung.stufen[r.abl.unterteilung.stufen.length - 1]!.kaefig);
  const vor = punkteVon(abl.fein);
  const nach = punkteVon(r.abl.fein);
  const dAlt = blattAbweichungen(vor, alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig), dok, 1920);
  const dNeu = blattAbweichungen(nach, flaechen, dok, 1920);
  const fAlt = faltenNachZonenRoehre(abl);
  const fNeu = faltenNachZonenRoehre(r.abl);
  const kNeu = knickeStufe1(r.abl, r.abl.fein);
  const fl = flachband(nach, flaechen);
  const wende = wendepunkte(r.abl, r.abl.fein, b.achse);
  const innen = nachInnen(nach, flaechen, r.abl, b.achse);
  console.log(
    `${name} | ${b.achse} · ${b.ringF} (${b.schritte.vorn}/${b.schritte.hinten}) | ${b.bogen.vorn.map(f1).join('/')} · ${b.bogen.hinten.map(f1).join('/')} | ${f1(dAlt.seite.max)}/${f1(dAlt.front.max)}/${f1(dAlt.top.max)} → ${f1(dNeu.seite.max)}/${f1(dNeu.front.max)}/${f1(dNeu.top.max)} | ${f1(b.rest.max)} (${f1(b.rest.mittel)}) | ${f1(b.silhouette)}° | ${f1(b.innen.max)} (${f1(b.innen.mittel)}) | ${f1(b.ueberstand.front)}/${f1(b.ueberstand.top)} | ${f1(b.kippung)} | ${innen.zahl}${innen.zahl ? ` (${innen.wo})` : ''} | ${f1(fAlt.zonen.frei.max)}/${f1(fAlt.zonen.kappe.max)}° → ${f1(fNeu.zonen.frei.max)}/${f1(fNeu.zonen.kappe.max)}° | ${f1(kNeu.p95)}/${f1(kNeu.max)}° | ${f1(fl.seite)}/${f1(fl.front)}/${f1(fl.top)} | ${wende} | ${JSON.stringify(b.falten.ringe)}/${JSON.stringify(b.falten.reihen)}/${JSON.stringify(b.falten.spitzen)} | ${b.ms.toFixed(0)} (Unterteilung ${b.msUnterteilung.toFixed(0)}, Lösen ${b.msLoeser.toFixed(0)})`,
  );
}
