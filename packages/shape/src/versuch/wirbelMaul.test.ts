// Maul auf der Wirbelsäule (Versuch 12.10. nachts): Langhals, Robbe, Rex, Tiger – Umriss, Lippenkante, geschlossenes Netz,
// im Vergleich zum Maul-Käfig entlang x (Pixel = Kachel · 461).
import { describe, expect, it } from 'vitest';
import langhals from '../../../../apps/editor/public/versuch/langhals/langhals.json';
import rex from '../../../../apps/editor/public/versuch/rex/rex.json';
import robbe from '../../../../apps/editor/public/versuch/robbe/robbe.json';
import tiger from '../../../../apps/editor/public/versuch/tiger/tiger.json';
import type { V2 } from '../bezier';
import { pfadAbtasten, vollerPfad } from '../profil';
import { type V3, unterteilenMehrfach } from './catmullClark';
import { maulAnpassen, maulKaefig } from './maul';
import { geschlossen } from './tigerKaefig';
import { umrissAusNetz } from './umriss3d';
import { type Vorlage, vorlageDokument, vorlageMaul } from './vorlagen';
import { maulKaefigAufWirbel, wirbelraum } from './wirbelMaul';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now: () => number };
const PX = 461;

function zumZug2(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  for (let k = 0; k < zug.length; k++) {
    const a = zug[k]!;
    const b = zug[(k + 1) % zug.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y));
  }
  return best;
}
const umrissAbw = (a: readonly V2[], b: readonly V2[]) => Math.max(...a.map((p) => zumZug2(p, b)), ...b.map((p) => zumZug2(p, a))) * PX;
function zumZug3(p: V3, zug: readonly V3[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < zug.length; k++) {
    const a = zug[k]!;
    const b = zug[k + 1]!;
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = d[0]! ** 2 + d[1]! ** 2 + d[2]! ** 2 || 1;
    const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * d[0]! + (p[1] - a[1]) * d[1]! + (p[2] - a[2]) * d[2]!) / l2));
    best = Math.min(best, Math.hypot(a[0] + d[0]! * t - p[0], a[1] + d[1]! * t - p[1], a[2] + d[2]! * t - p[2]));
  }
  return best;
}

describe('Maul auf der Wirbelsäule', () => {
  it('gestreckter Raum: hin und zurück ergibt den Punkt (im Körper)', () => {
    const dok = vorlageDokument(langhals as unknown as Vorlage, 'zu', 'Langhals');
    const raum = wirbelraum(dok);
    const pts = pfadAbtasten(vollerPfad(dok.profile.seite), 8);
    let max = 0;
    for (const p of pts) {
      const q = raum.inWelt(raum.inGestreckt(p));
      max = Math.max(max, Math.hypot(q.x - p.x, q.y - p.y));
    }
    console.log(`Langhals: Umriss hin und zurück max ${(max * PX).toFixed(2)} px, Länge ${(raum.laenge * PX).toFixed(0)} px`);
    expect(max * PX).toBeLessThan(1);
  });

  it('Langhals, Robbe, Rex, Tiger: Netz geschlossen, Umriss und Lippenkante (Messung, Vergleich zu x)', () => {
    for (const [name, v] of [['Langhals', langhals], ['Robbe', robbe], ['Rex', rex], ['Tiger', tiger]] as const) {
      const vorlage = v as unknown as Vorlage;
      const dok = vorlageDokument(vorlage, 'zu', name);
      const { eingabe } = vorlageMaul(vorlage);
      const soll = pfadAbtasten(vollerPfad(dok.profile.seite), 24);
      const zeile = (art: string, bau: () => ReturnType<typeof maulKaefig>) => {
        const t0 = performance.now();
        const mk = bau();
        const zu = maulAnpassen(mk, 'zu', 8, 3);
        const ms = performance.now() - t0;
        const fein = unterteilenMehrfach(zu, 2);
        const um = umrissAusNetz(fein, 'seite', 400)[0]!;
        const lippe = Math.max(...mk.nahtOben.slice((mk.nahtOben.length - 1) / 2).map((i) => zumZug3(mk.zielZu[i]!, eingabe.zu.oben))) * PX;
        return { text: `${art}: ${ms.toFixed(0)} ms, Umriss Seite max ${umrissAbw(um, soll).toFixed(1)} px, Lippenkante max ${lippe.toFixed(1)} px, Netz geschlossen ${geschlossen(mk.netz)}`, mk };
      };
      const x = zeile('x', () => maulKaefig(dok, eingabe));
      const w = zeile('Wirbelsäule', () => maulKaefigAufWirbel(dok, eingabe));
      console.log(`${name}: ${x.text} | ${w.text}`);
      expect(geschlossen(w.mk.netz)).toBe(true);
      expect(w.mk.netz.punkte.length).toBe(x.mk.netz.punkte.length);
      expect(w.mk.zielZu.every((p) => p.every(Number.isFinite))).toBe(true);
    }
  }, 60_000);
});
