import { describe, expect, it } from 'vitest';
import { FISCH } from './eineLinie.fisch';
import { loopEinsetzen } from './einsetzen';
import { intrinsischeGewichte } from './intrinsisch';
import { type Haut, hautAus } from './kurven';
import { type Loop, LoopZug, loopAusSchnitt, mittlereKante } from './loops';

// C1 im Plan „Ozzy stabil und schnell“ (18.11.2026): eine Form frisch aus der Silhouette, nur mit der Linie der Mitte. Bis dahin lief
// ein neuer Löser an ihr „empfindlich an“: An der flachen Schwanzflosse des Fischs schoss ein Punkt in einer Runde Hunderte Einheiten
// hinaus, das Setzen nach dem Anlegen wurde verworfen, das Aufräumen brach ab oder blähte die Form zum Ballon. Zwei Ursachen, beide
// in `ausKurven.ts` beschrieben: Die intrinsische Triangulierung klappte Kanten der Mittelebene (`festGefaltet`: auf der Hälfte
// gerechnet passten die zwei Seiten dann nicht zueinander), und ein Schritt der Korrektur war nicht begrenzt (`SCHRITT_MAX`).
// Die Vorlage ist der Stand aus dem Fenster (`eineLinie.fisch.ts`); an einer hier nachgebauten Form zeigte sich der Fehler nicht.

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);

/** die Haut der Vorlage, die Linie der Mitte neu geschnitten (sie liegt schon im Netz) */
function fisch(): { h: Haut; loops: Loop[] } {
  let h = hautAus(FISCH.pos, FISCH.tri);
  const mk = mittlereKante(h);
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let v = 0; v < h.n; v++) {
    yMin = Math.min(yMin, h.pos[3 * v + 1]!);
    yMax = Math.max(yMax, h.pos[3 * v + 1]!);
  }
  const l = loopAusSchnitt(h, 'front', [0, -(yMax + 2 * mk)], [0, -(yMin - 2 * mk)], 1, 1)!;
  const r = loopEinsetzen(h, [l], 0)!;
  h = r.haut;
  return { h, loops: r.loops };
}

const inhalt = (h: Haut): number => {
  let v = 0;
  const P = h.pos;
  for (let i = 0; i < h.tri.length; i += 3) {
    const [a, b, c] = [3 * h.tri[i]!, 3 * h.tri[i + 1]!, 3 * h.tri[i + 2]!];
    v += (P[a]! * (P[b + 1]! * P[c + 2]! - P[b + 2]! * P[c + 1]!) - P[a + 1]! * (P[b]! * P[c + 2]! - P[b + 2]! * P[c]!) + P[a + 2]! * (P[b]! * P[c + 1]! - P[b + 1]! * P[c]!)) / 6;
  }
  return v;
};

/** 33 Runden ohne Zug (die Linie bleibt, wo sie liegt), wie das Setzen nach dem Anlegen */
function setzen(opt: Record<string, unknown>): { max: number; inhalt: number; start: number; weg: number; linien: string } {
  const { h, loops } = fisch();
  const start = inhalt(h);
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', opt);
  let max = 0;
  let weg = 0;
  const vor = new Float64Array(h.pos.length);
  for (let k = 0; k < 33; k++) {
    vor.set(h.pos);
    z.schritt(
      loops.map(() => null),
      1,
    );
    weg = 0;
    for (let i = 0; i < vor.length; i++) {
      const d = Math.abs(h.pos[i]! - vor[i]!);
      if (!(d <= weg)) weg = d;
      const a = Math.abs(h.pos[i]!);
      if (!(a <= max)) max = a;
    }
    if (!Number.isFinite(weg) || weg > 1e6) break;
  }
  return { max, inhalt: inhalt(h), start, weg, linien: loops.map((l) => l.art).join(',') };
}

describe('Form mit nur einer Linie (frisch aus der Silhouette)', () => {
  it('wie bis zum 17.11. (Kanten der Mitte frei, Schritt unbegrenzt) läuft die Haut davon', () => {
    const r = setzen({ halb: true, mitteFest: false, schritt: false });
    log(`Fisch wie bis zum 17.11.: größte Koordinate im Verlauf ${r.max.toFixed(0)} (die Form reicht bis 150)`);
    expect(r.linien).toBe('mitte');
    // gemessen: 8 898
    expect(r.max > 1000 || Number.isNaN(r.max)).toBe(true);
  });

  it('auf der Hälfte gerechnet bleibt die Form, wie sie ist, und kommt zur Ruhe', () => {
    const r = setzen({ halb: true });
    log(`Fisch, halb: Rauminhalt ${(r.start / 1e6).toFixed(2)} → ${(r.inhalt / 1e6).toFixed(2)} Mio., größte Koordinate im Verlauf ${r.max.toFixed(1)}, letzte Runde ${r.weg.toFixed(2)}`);
    // gemessen: Rauminhalt 2,69 → 2,83 Mio. (die Linie hat hier keinen Pfad; im Fenster, mit Pfad und Aufräumen, 2,69 → 2,69),
    // größte Koordinate 170,6, letzte Runde 0,42
    expect(r.max).toBeLessThan(200);
    expect(Math.abs(r.inhalt / r.start - 1)).toBeLessThan(0.1);
    expect(r.weg).toBeLessThan(1);
  });

  it('die Schrittweite allein hält die Haut auch über die ganze Haut gerechnet', () => {
    const r = setzen({});
    log(`Fisch, ganz: Rauminhalt ${(r.start / 1e6).toFixed(2)} → ${(r.inhalt / 1e6).toFixed(2)} Mio., größte Koordinate im Verlauf ${r.max.toFixed(1)}, letzte Runde ${r.weg.toFixed(2)}`);
    // gemessen: Rauminhalt 2,69 → 2,79 Mio., größte Koordinate 175,4
    expect(r.max).toBeLessThan(200);
    expect(Math.abs(r.inhalt / r.start - 1)).toBeLessThan(0.1);
  });

  it('mit festen Kanten der Mittelebene läuft keine Kante der Triangulierung über die Ebene', () => {
    const { h } = fisch();
    const sp = h.spiegel;
    /** Kanten der intrinsischen Triangulierung von einem Punkt zu einem der anderen Seite (ein Punkt der Mitte liegt auf keiner) */
    const quer = (ig: ReturnType<typeof intrinsischeGewichte>): number => {
      let n = 0;
      for (let v = 0; v < h.n; v++) for (let k = ig.start[v]!; k < ig.start[v + 1]!; k++) if (ig.nb[k]! > v && h.pos[3 * v + 2]! * h.pos[3 * ig.nb[k]! + 2]! < 0) n++;
      return n;
    };
    const frei = intrinsischeGewichte(h);
    const fest = intrinsischeGewichte(h, (a, b) => sp[a] === a && sp[b] === b);
    log(`Fisch: Kanten quer über die Mittelebene ${quer(frei)} (frei, ${frei.flips} geklappt), ${quer(fest)} (Kanten der Mitte fest, ${fest.flips} geklappt)`);
    expect(quer(frei)).toBeGreaterThan(0);
    expect(quer(fest)).toBe(0);
  });
});
