// Wirksame Maul-Optionen eines Dokuments für die Tafeln Maul und Posen & Leben (Plan 5.2): Standard, Vorlage der
// Maul-Lage, Prüfwesen, Ausstattung — und das Setzen einzelner Optionen in die Ausstattung (ein Undo-Schritt je Geste).
import type { Dokument } from '@ee/shape';
import { MAUL_STANDARD, type MaulOptionen, maulOptionenVorlage, pruefwesenBauplan } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';

export type MaulLageChip = 'aus' | 'vorn' | 'unten' | 'hals';

/** Lage für die Vorlagen-Optionen: der Chip, oder „vorn“, wenn eine Linie gezeichnet ist (wie der Bauplan). */
export function maulLageFuer(dok: Dokument, chip: MaulLageChip): MaulLageChip {
  const hatLinie = !!dok.maul || !!dok.ausstattung?.maulLinie;
  return chip === 'aus' && hatLinie ? 'vorn' : chip;
}

/** Wirksame Maul-Optionen (wie der Worker sie zusammensetzt). */
export function maulOptionenDok(dok: Dokument, chip: MaulLageChip): MaulOptionen {
  const lage = maulLageFuer(dok, chip);
  return { ...MAUL_STANDARD, ...(lage !== 'aus' ? maulOptionenVorlage(lage) : {}), ...(pruefwesenBauplan(dok.name).maulOptionen ?? {}), ...(dok.ausstattung?.maulOptionen ?? {}) };
}

/** Maul-Optionen in der Ausstattung ändern (Gelenk, Gewichte, Winkel …); Pose-Optionen bauen den Käfig nicht um. */
export function setzeMaulOptionen(patch: Partial<MaulOptionen>): void {
  const s = useEditor.getState();
  const aus = s.dok.ausstattung ?? {};
  s.setzeDokument({ ...s.dok, ausstattung: { ...aus, maulOptionen: { ...(aus.maulOptionen ?? {}), ...patch } } });
}

/** Knochenwerte einer Pose (Grad, Maullängen) und Haps (nur Fressen). */
export type PoseKnochen = { winkelUnten: number; winkelOben: number; kieferZug: [number, number]; zugWeite: number; haps: number };

/**
 * Knochen einer Pose, wie der Kern sie nimmt (B3): ihre Stellung (fehlende Knochen = 0); hat Fressen noch keine eigene
 * Stellung, gelten die Maul-Optionen; Haps aus der Saat, sonst aus den Maul-Optionen (nur Fressen).
 */
export function poseKnochen(dok: Dokument, chip: MaulLageChip, id: string): PoseKnochen {
  const mo = maulOptionenDok(dok, chip);
  const p = dok.posen.find((q) => q.id === id);
  const fressen = p?.art === 'fressen';
  const st = p?.stellung;
  const haps = fressen ? (p?.saat?.haps ?? mo.haps) : 0;
  if (st) return { winkelUnten: st.kiefer?.winkel ?? 0, winkelOben: st.schaedel?.winkel ?? 0, kieferZug: [st.kiefer?.zug?.[0] ?? 0, st.kiefer?.zug?.[1] ?? 0], zugWeite: st.kiefer?.ziehen ?? 0, haps };
  if (fressen) return { winkelUnten: mo.winkelUnten, winkelOben: mo.winkelOben, kieferZug: [mo.kieferZug?.[0] ?? 0, mo.kieferZug?.[1] ?? 0], zugWeite: mo.zugWeite, haps };
  return { winkelUnten: 0, winkelOben: 0, kieferZug: [0, 0], zugWeite: 0, haps };
}

/**
 * Knochen bzw. Haps einer Pose setzen (ein Undo-Schritt bzw. Teil der Geste). Hat die Pose noch keine Stellung, startet
 * sie bei `aktuell` (den gezeigten Werten), sonst sprängen die übrigen Knochen auf 0.
 */
export function setzePoseKnochen(id: string, patch: Partial<PoseKnochen>, aktuell: Omit<PoseKnochen, 'haps'>): void {
  useEditor.getState().poseSetzen(id, (p) => {
    const knochen = patch.winkelUnten !== undefined || patch.winkelOben !== undefined || patch.kieferZug !== undefined || patch.zugWeite !== undefined;
    let q = p;
    if (knochen) {
      const st = p.stellung ?? { kiefer: { winkel: aktuell.winkelUnten, zug: [aktuell.kieferZug[0], aktuell.kieferZug[1]] as [number, number], ziehen: aktuell.zugWeite }, schaedel: { winkel: aktuell.winkelOben } };
      const kiefer = { ...(st.kiefer ?? {}), ...(patch.winkelUnten !== undefined ? { winkel: patch.winkelUnten } : {}), ...(patch.kieferZug ? { zug: [patch.kieferZug[0], patch.kieferZug[1]] as [number, number] } : {}), ...(patch.zugWeite !== undefined ? { ziehen: patch.zugWeite } : {}) };
      const schaedel = { ...(st.schaedel ?? {}), ...(patch.winkelOben !== undefined ? { winkel: patch.winkelOben } : {}) };
      q = { ...q, stellung: { ...st, kiefer, schaedel } };
    }
    if (patch.haps !== undefined) q = { ...q, saat: { ...(p.saat ?? {}), haps: patch.haps } };
    return q;
  });
}

/** Knochen und Haps einer Pose auf den Standard zurück (Fressen: Maul-Optionen; sonst Ruhe). */
export function poseKnochenZuruecksetzen(id: string): void {
  useEditor.getState().poseSetzen(id, (p) => {
    if (!p.stellung && p.saat?.haps === undefined) return p;
    const neu = { ...p };
    delete neu.stellung;
    delete neu.saat;
    return neu;
  });
}

/**
 * Zug an einem Griff übernehmen (B3, Plan Teil B: Stellung je Pose, Rig gemeinsam): Knochen (Kieferwinkel, Kieferzug,
 * Schädelwinkel) gehen in die Stellung der Pose im Tab (im Editor-Tab: Fressen), Rig-Werte (Gelenke, Übergang,
 * Reichweite) in die Maul-Optionen für alle Posen. Hat die Pose noch keine Stellung, startet sie bei den gezeigten Knochen.
 */
export function griffSetzen(patch: Partial<MaulOptionen>, gezeigt: { winkelUnten: number; winkelOben: number; zug: [number, number]; zugWeite: number }): void {
  const { winkelUnten, winkelOben, kieferZug, ...rig } = patch;
  if (Object.keys(rig).length) setzeMaulOptionen(rig);
  if (winkelUnten === undefined && winkelOben === undefined && kieferZug === undefined) return;
  const ed = useEditor.getState();
  const ziel = ed.modus === 'editor' ? 'fressen' : ed.modus;
  setzePoseKnochen(ziel, { ...(winkelUnten !== undefined ? { winkelUnten } : {}), ...(winkelOben !== undefined ? { winkelOben } : {}), ...(kieferZug ? { kieferZug: [kieferZug[0], kieferZug[1]] as [number, number] } : {}) }, { winkelUnten: gezeigt.winkelUnten, winkelOben: gezeigt.winkelOben, kieferZug: gezeigt.zug, zugWeite: gezeigt.zugWeite });
}

/** Gelenke, Übergang und Reichweite auf die Automatik zurück (Kiefergelenk am Mundwinkel, Schädelgelenk dahinter). */
export function kieferAutomatik(): void {
  setzeMaulOptionen({ gelenk: [...MAUL_STANDARD.gelenk], kieferWinkel: [...MAUL_STANDARD.kieferWinkel], kieferReichweite: [...MAUL_STANDARD.kieferReichweite], schaedelGelenk: [...MAUL_STANDARD.schaedelGelenk] });
}
