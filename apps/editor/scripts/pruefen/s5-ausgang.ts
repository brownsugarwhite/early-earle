// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5 Vorbereitung: Ausgangsstand der S5-Prüfkörper (Standard neuer Wesen:
// glatte Haut + Umrisse berühren mittel) und ihre Teilbäume aus S4 (Mittelteile, Sehne, läuft der Elternteil über die Sehne
// hinaus weiter?). Umgebung: KOERPER (Komma-Liste). Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/s5-ausgang.ts
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { neuesDokument } from '../../../../packages/shape/src/dokument';
import { GLATTE_HAUT, ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { feinesNetz, mitStationenVon } from '../../../../packages/shape/src/kern/pruefstand';
import { faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';
import { teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';

const PX = 461;
const liste = (process.env.KOERPER ?? 'langhals,drache,s-hals,giraffe-bauch,ueberhang,vase,ente,fisch').split(',');
const kugel = neuesDokument();
for (const name of liste) {
  const roh: Dokument = teilSatzDokument(name);
  for (const ablauf of ['frisch', 'kugel0'] as const) {
    const dok = ablauf === 'frisch' ? roh : mitStationenVon(roh, kugel);
    const opt = { ...GLATTE_HAUT, fuelle: 'mittel' as const, ...(dok.kaefig?.stationen ? { stationen: dok.kaefig.stationen } : {}) };
    const abl = ableiten(dok, opt);
    const z = faltenNachZonenRoehre(abl).zonen;
    const { punkte, flaechen } = feinesNetz(abl);
    const ab = blattAbweichungen(punkte, flaechen, dok);
    console.log(`${(name + '/' + ablauf).padEnd(22)} frei ${z.frei.max.toFixed(1).padStart(5)}° (${z.frei.ueber20}) kappe ${z.kappe.max.toFixed(1).padStart(5)}° (${z.kappe.ueber20}) ansatz ${z.ansatz.max.toFixed(1)}° | Δ ${[ab.seite.max, ab.front.max, ab.top.max].map((x) => x.toFixed(1)).join(' / ')} | ${abl.zeiten.gesamt.toFixed(0)} ms`);
  }
  const b = teilbaum(roh);
  const sk = roh.skalierung;
  for (const t of b.teile) {
    const s = t.erkannt.seite;
    const ch = s ? s.schnitt.map((p) => `(${(p.x * PX).toFixed(0)},${(p.y * PX).toFixed(0)})`).join('–') : '';
    console.log(`   ${t.id.padEnd(6)} ${t.art.padEnd(5)} eltern ${t.eltern} ${t.richtung.padEnd(8)} quelle ${s?.quelle ?? '-'} sehne ${ch} länge ${s ? (Math.hypot(s.schnitt[0].x - s.schnitt[1].x, s.schnitt[0].y - s.schnitt[1].y) * PX).toFixed(0) : '-'} px seitlich ${t.seitlich?.toFixed(2) ?? '-'} erkannt ${Object.keys(t.erkannt).join(',')} ${sk}`);
  }
}
