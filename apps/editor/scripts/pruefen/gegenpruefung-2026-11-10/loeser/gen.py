# Gegenprüfung „Löser-Mathematik“: erzeugt eine Messkopie von dicht/ausKurven.ts im Scratchpad (der Arbeitsbaum bleibt unberührt).
# Die Kopie rechnet mit den Standardwerten von PROBE bitgleich wie das Original (geprüft in mess3.ts) und hat zusätzlich:
#   HALT einstellbar · Dämpfung der Krümmungskorrektur auch für „gleich“ (fest oder je Punkt) · Quellen merken/festhalten ·
#   geometrie: Korrektur mit m.kante2 statt geo.kante2 · Defekt je Runde · feinere Uhren
import sys

import os

HIER = os.path.dirname(os.path.abspath(__file__))
W = os.path.normpath(os.path.join(HIER, '../../../../../../packages/shape/src'))
S = HIER
src = open(W + '/dicht/ausKurven.ts', encoding='utf8').read()


def ers(alt, neu, anzahl=1):
    global src
    n = src.count(alt)
    if n != anzahl:
        sys.exit(f'Anker {anzahl}× erwartet, {n}× gefunden: {alt[:70]!r}')
    src = src.replace(alt, neu)


ers("from '../loeser/", f"from '{W}/loeser/", 2)
ers("from './", f"from '{W}/dicht/", 3)

ers(
    "const HALT = 1e-6;",
    """let HALT = 1e-6;
export function haltSetzen(x: number): void {
  HALT = x;
}
/** Messkopie: Schalter und Diagnose (Standardwerte = Original) */
export const PROBE = {
  beta: 1,
  adaptiv: false,
  quellen: 'frei' as 'frei' | 'merken' | 'fest',
  kante2M: false,
  /** Anteil, mit dem die an den Linien gemessene Krümmung je Runde übernommen wird (1 = Original) */
  quellenBeta: 1,
  sammeln: false,
  defektMax: 0,
  defektRms: 0,
  defektWo: -1,
  verh: [] as number[],
  t: { kruemmung: 0, rhs: 0, spiegel: 0 },
};""",
)

ers(
    "  letzteKruemmung: Float64Array | null = null;",
    """  letzteKruemmung: Float64Array | null = null;
  qMerk: Float64Array | null = null;
  qVor: Float64Array | null = null;
  betaG: Float64Array | null = null;
  dVorG: Float64Array | null = null;""",
)

# Quellen merken / festhalten (gleich)
ers(
    """    if (seiten) for (const [v, w] of seiten.mittel) c[v] = w;
    for (let v = 0; v < h.n; v++) if (this.nr[v]! < 0) c[v] = this.ruhe.kap[v]!;""",
    """    if (seiten) for (const [v, w] of seiten.mittel) c[v] = w;
    for (let v = 0; v < h.n; v++) if (this.nr[v]! < 0) c[v] = this.ruhe.kap[v]!;
    if (PROBE.quellen === 'merken') {
      this.qMerk = Float64Array.from(kap);
      PROBE.quellen = 'fest';
    }
    if (PROBE.quellen === 'fest' && this.qMerk) for (let v = 0; v < h.n; v++) if (this.quelle[v]! >= 0) c[v] = this.qMerk[v]!;
    if (PROBE.quellenBeta < 1) {
      if (!this.qVor) this.qVor = Float64Array.from(kap);
      for (let v = 0; v < h.n; v++) {
        if (this.quelle[v]! < 0 || this.nr[v]! < 0) continue;
        this.qVor[v] = this.qVor[v]! + PROBE.quellenBeta * (kap[v]! - this.qVor[v]!);
        c[v] = this.qVor[v]!;
      }
    }""",
)
# Quellen merken / festhalten (geometrie)
ers(
    """c[v] = this.ruhe.kap[v]!;
    if (seiten) for (const [v, w] of seiten.mittel) c[v] = w;""",
    """c[v] = this.ruhe.kap[v]!;
    if (seiten) for (const [v, w] of seiten.mittel) c[v] = w;
    if (PROBE.quellen === 'merken') {
      this.qMerk = Float64Array.from(kap);
      PROBE.quellen = 'fest';
    }
    if (PROBE.quellen === 'fest' && this.qMerk) for (let v = 0; v < h.n; v++) if (this.quelle[v]! >= 0) c[v] = this.qMerk[v]!;
    if (PROBE.quellenBeta < 1) {
      if (!this.qVor) this.qVor = Float64Array.from(kap);
      for (let v = 0; v < h.n; v++) {
        if (this.quelle[v]! < 0 || this.nr[v]! < 0) continue;
        this.qVor[v] = this.qVor[v]! + PROBE.quellenBeta * (kap[v]! - this.qVor[v]!);
        c[v] = this.qVor[v]!;
      }
    }""",
)

# Uhr für die Krümmung bei „gleich“
ers(
    "        c = this.kruemmung(m.kap, seiten);",
    """        const tk = jetzt();
        c = this.kruemmung(m.kap, seiten);
        PROBE.t.kruemmung += jetzt() - tk;""",
)

ers(
    """      const rhs = new Float64Array(3 * nf);
      for (const i of this.zeilen) {""",
    """      const tr0 = jetzt();
      let dMax = 0;
      let dSum = 0;
      let dN = 0;
      let dWo = -1;
      const rhs = new Float64Array(3 * nf);
      for (const i of this.zeilen) {""",
)

ers(
    """        let k = m.kante2[i]! * c[i]!;
        if (geo) {""",
    """        let k = m.kante2[i]! * c[i]!;
        {
          const dd = geo ? geo.kante2[i]! * (c[i]! - geo.kap[i]!) : m.kante2[i]! * (c[i]! - m.kap[i]!);
          if (Math.abs(dd) > dMax) {
            dMax = Math.abs(dd);
            dWo = i;
          }
          dSum += dd * dd;
          dN++;
          if (geo && PROBE.sammeln) PROBE.verh.push(geo.kante2[i]! / m.kante2[i]!);
        }
        if (!geo && (PROBE.beta < 1 || PROBE.adaptiv)) {
          const d = m.kante2[i]! * (c[i]! - m.kap[i]!);
          let bb = PROBE.beta;
          if (PROBE.adaptiv) {
            if (!this.betaG) {
              this.betaG = new Float64Array(h.n).fill(PROBE.beta);
              this.dVorG = new Float64Array(h.n);
            }
            bb = d * this.dVorG![i]! < 0 ? Math.max(0.02, 0.5 * this.betaG[i]!) : Math.min(PROBE.beta, 1.25 * this.betaG[i]!);
            this.betaG[i] = bb;
            this.dVorG![i] = d;
          }
          k = m.kante2[i]! * m.kap[i]! + bb * d;
        }
        if (geo) {""",
)

ers(
    "          const d = geo.kante2[i]! * (c[i]! - geo.kap[i]!);",
    "          const d = (PROBE.kante2M ? m.kante2[i]! : geo.kante2[i]!) * (c[i]! - geo.kap[i]!);",
)

ers(
    """      const tl = jetzt();
      const x = this.sys!.loesen(rhs);
      this.zeiten.loesen += jetzt() - tl;
      this.zeiten.runden++;""",
    """      PROBE.defektMax = dMax;
      PROBE.defektRms = Math.sqrt(dSum / Math.max(1, dN));
      PROBE.defektWo = dWo;
      const tl = jetzt();
      PROBE.t.rhs += tl - tr0;
      const x = this.sys!.loesen(rhs);
      this.zeiten.loesen += jetzt() - tl;
      this.zeiten.runden++;
      const ts0 = jetzt();""",
)

ers(
    """        P[3 * w] = mx;
        P[3 * w + 1] = my;
        P[3 * w + 2] = -mz;
      }
    }
  }
}""",
    """        P[3 * w] = mx;
        P[3 * w + 1] = my;
        P[3 * w + 2] = -mz;
      }
      PROBE.t.spiegel += jetzt() - ts0;
    }
  }
}""",
)

ers("export class HautAusKurven {", "export class HautAusKurvenP {")

open(S + '/ausKurvenKopie.ts', 'w', encoding='utf8').write(src)
print('geschrieben:', S + '/ausKurvenKopie.ts', len(src))
