// Form zuerst (06.11.2026), Beweis B (Florian: „Haut im Einflussbereich bei jedem Zug neu aus den Kurven rechnen (wie FiberMesh,
// gleichmäßiges Netz), mit den Kriterien aus dem Dokument“, `docs/plans/2026-11-06-kurven-als-wahrheit.md`). Je Fall beide Löser:
// `gedaechtnis` (HautZiele, das Fenster) und `kurven` (HautAusKurven, die Haut aus den Kurven neu). Fälle in `kurvenFaelle.ts`.
// Ergebnis: Die Kante kommt aus den Linien, nicht aus dem Löser. Knicken die Querlinien am harten Rand, machen beide die Kante der
// Form; knicken sie nicht (heute nach einem Zug am untersten Punkt), macht keiner eine.
import { describe, expect, it } from 'vitest';
import type { V3 } from './kurven';
import { AUGE, type BFall, R, bFall, falten, knick, rundheit } from './kurvenFaelle';
import type { HautArt } from './loops';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const zahl = (x: number) => x.toFixed(1);
const ARTEN: HautArt[] = ['gedaechtnis', 'kurven'];
const imAuge = (p: V3) => Math.hypot(p.x - AUGE.x, p.y - AUGE.y) < AUGE.r + 10 && p.z > 0;

/** je Fall und Löser einmal gerechnet */
const gemerkt = new Map<string, ReturnType<typeof bFall>>();
const fall = (f: BFall, art: HautArt) => {
  const k = `${f}:${art}`;
  if (!gemerkt.has(k)) gemerkt.set(k, bFall(f, art));
  return gemerkt.get(k)!;
};
const randKnick = (f: BFall, art: HautArt) => {
  const { h, loops } = fall(f, art);
  const k = knick(h, loops[0]!);
  const fa = falten(h);
  log(`${f} ${art}: Knick quer über den Rand Median ${zahl(k.median)}°, 10 % ${zahl(k.p10)}°, größter ${zahl(k.max)}°; über 60° ${fa.ueber60}, umgeklappt ${fa.umgeklappt}`);
  return { ...k, ...fa };
};

describe('Beweis B: Haut aus den Kurven', () => {
  it('Kugel mit drei Loops, nichts gezogen: bleibt rund (< 1 %)', () => {
    for (const art of ARTEN) {
      const r = rundheit(fall('kugel', art).h);
      log(`Kugel ${art}: Abstand zur Kugel größter ${r.max.toFixed(3)}, mittlerer ${r.mittel.toFixed(3)} (1 % = 1,5)`);
      expect(r.max).toBeLessThan(0.01 * R);
    }
  });

  it('Linse (Querlinien auf zwei Kappen, am Rand geknickt, Soll ≈ 67°): hart die Kante, weich rund', () => {
    for (const art of ARTEN) {
      const hart = randKnick('linse-hart', art);
      const weich = randKnick('linse-weich', art);
      expect(hart.median).toBeGreaterThan(60);
      expect(hart.umgeklappt).toBe(0);
      expect(weich.median).toBeLessThan(30);
    }
  });

  it('Pilz mit Querlinien, die am harten Rand knicken (Soll ≈ 78°): beide Löser machen die Kante', () => {
    for (const art of ARTEN) {
      const k = randKnick('pilz-geknickt', art);
      expect(k.median).toBeGreaterThan(70);
      expect(k.umgeklappt).toBe(0);
    }
  });

  it('Pilz wie heute im Fenster (unten hinauf, die Querlinien knicken nicht): keine Kante, mit keinem Löser', () => {
    // nur gemessen: Ändert sich, wie eine Ecke von selbst die Linie formt, ändert sich das hier
    for (const art of ARTEN) {
      randKnick('pilz-hart', art);
      randKnick('pilz-weich', art);
    }
  });

  it('Härte nachträglich und Linie löschen: wirken erst, wenn neu gerechnet wird, dann mit beiden Lösern', () => {
    for (const art of ARTEN) {
      const n = fall('nachtraeglich', art);
      const v = knick(n.vorher!, n.loops[0]!);
      const k = knick(n.h, n.loops[0]!);
      const fn = falten(n.h);
      log(`nachträglich ${art}: Knick weich ${zahl(v.median)}° → hart und neu gerechnet ${zahl(k.median)}° (größter ${zahl(k.max)}°); über 60° ${fn.ueber60}, umgeklappt ${fn.umgeklappt}`);
      const l = fall('loeschen', art);
      const g = rundheit(l.vorher!, imAuge);
      const r = rundheit(l.h, imAuge);
      const fl = falten(l.h);
      log(`löschen ${art}: Abstand zur Kugel an der Form hinausgezogen ${zahl(g.max)}, gelöscht und neu gerechnet ${zahl(r.max)} (mittel ${r.mittel.toFixed(2)}); über 60° ${fl.ueber60}, umgeklappt ${fl.umgeklappt}`);
      expect(k.median).toBeGreaterThan(v.median);
      expect(r.max).toBeLessThan(0.5 * g.max);
    }
  });
});
