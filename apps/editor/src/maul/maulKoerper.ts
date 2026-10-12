// Maul-Tab (Versuch 12.10.): 3D-Körper mit Maul aus dem Dokument. Käfig, Anpassung (zu/auf) und Kiefer-Rig werden nur
// neu gebaut, wenn sich Profile oder Lippen ändern (≈ 0,3–0,5 s); die Öffnung (Regler) rechnet nur die Zwischenstufe.

import type { Dokument } from '@ee/shape';
import {
  type KieferRig,
  type MaulKaefig,
  type Netz,
  MAUL_STANDARD,
  bereichUnterteilen,
  kieferRig,
  maulAnpassen,
  maulEingabeAus,
  maulKaefig,
  maulZwischen,
  reissverschluss,
  unterteilen,
  zuDreiecken,
} from '@ee/shape/versuch';
import { create } from 'zustand';
import { flaechenBereiche } from '../versuch/maulVersuch';

export type MaulInfo = {
  art: string;
  winkelOben: number;
  winkelUnten: number;
  restOben: number;
  restUnten: number;
  millisekunden: number;
  hinweise: string[];
};

export const useMaulInfo = create<{ info: MaulInfo | null }>(() => ({ info: null }));

export type MaulBau = { profile: Dokument['profile']; maul: NonNullable<Dokument['maul']>; mk: MaulKaefig; zu: Netz; auf: Netz; rig: KieferRig };

let letzter: MaulBau | null = null;

export function maulBauen(dok: Dokument): MaulBau | null {
  if (!dok.maul) {
    letzter = null;
    useMaulInfo.setState({ info: null });
    return null;
  }
  if (letzter && letzter.profile === dok.profile && letzter.maul === dok.maul) return letzter;
  const t0 = performance.now();
  const mk = maulKaefig(dok, maulEingabeAus(dok.maul), MAUL_STANDARD);
  const zu = maulAnpassen(mk, 'zu', 8, 3);
  const auf = maulAnpassen(mk, 'auf', 8, 3);
  const rig = kieferRig(mk, zu, auf);
  letzter = { profile: dok.profile, maul: dok.maul, mk, zu, auf, rig };
  const grad = (w: number) => (w * 180) / Math.PI;
  useMaulInfo.setState({
    info: {
      art: rig.art,
      winkelOben: grad(rig.gelenkOben.w),
      winkelUnten: grad(rig.gelenkUnten.w),
      restOben: rig.restOben,
      restUnten: rig.restUnten,
      millisekunden: performance.now() - t0,
      hinweise: mk.hinweise,
    },
  });
  return letzter;
}

const FARBE: Record<string, [number, number, number]> = { haut: [1, 1, 1], lippe: [0.96, 0.74, 0.64], tasche: [0.55, 0.12, 0.18] };

/** Dreiecke mit Bereichsfarben bei Öffnung α (Knochen + Korrektur, Reißverschluss). */
export function maulDreiecke(b: MaulBau, alpha: number, stufen = 3): { positionen: Float32Array; normalen: Float32Array; farben: Float32Array; kaefig: Netz } {
  const a = Math.min(1, Math.max(0, alpha));
  const zwischen = a <= 0 ? b.zu : a >= 1 ? b.auf : reissverschluss(b.mk, maulZwischen(b.mk, b.zu, b.auf, a, 'knochen', b.rig), a);
  let n = zwischen;
  let bereich = flaechenBereiche(b.mk, a);
  for (let s = 0; s < stufen; s++) {
    bereich = bereichUnterteilen(n, bereich);
    n = unterteilen(n);
  }
  const d = zuDreiecken(n, 40);
  const farben = new Float32Array(d.positionen.length);
  let o = 0;
  n.flaechen.forEach((f, fi) => {
    const c = FARBE[bereich[fi]!] ?? FARBE.haut!;
    for (let k = 0; k < 3 * (f.length - 2); k++) farben.set(c, (o + k) * 3);
    o += 3 * (f.length - 2);
  });
  return { ...d, farben, kaefig: zwischen };
}
