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

/** Knochenwerte einer Pose (Grad, Maullängen; B3b: Gieren, Rollen, Seite) und Haps (nur Fressen). */
export type PoseKnochen = {
  winkelUnten: number;
  winkelOben: number;
  kieferZug: [number, number];
  zugWeite: number;
  gierenUnten: number;
  rollenUnten: number;
  seitUnten: number;
  gierenOben: number;
  rollenOben: number;
  haps: number;
};
const DREI_D_NULL = { gierenUnten: 0, rollenUnten: 0, seitUnten: 0, gierenOben: 0, rollenOben: 0 };

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
  if (st)
    return {
      winkelUnten: st.kiefer?.winkel ?? 0,
      winkelOben: st.schaedel?.winkel ?? 0,
      kieferZug: [st.kiefer?.zug?.[0] ?? 0, st.kiefer?.zug?.[1] ?? 0],
      zugWeite: st.kiefer?.ziehen ?? 0,
      gierenUnten: st.kiefer?.gieren ?? 0,
      rollenUnten: st.kiefer?.rollen ?? 0,
      seitUnten: st.kiefer?.seit ?? 0,
      gierenOben: st.schaedel?.gieren ?? 0,
      rollenOben: st.schaedel?.rollen ?? 0,
      haps,
    };
  if (fressen) return { winkelUnten: mo.winkelUnten, winkelOben: mo.winkelOben, kieferZug: [mo.kieferZug?.[0] ?? 0, mo.kieferZug?.[1] ?? 0], zugWeite: mo.zugWeite, ...DREI_D_NULL, haps };
  return { winkelUnten: 0, winkelOben: 0, kieferZug: [0, 0], zugWeite: 0, ...DREI_D_NULL, haps };
}

/**
 * Knochen bzw. Haps einer Pose setzen (ein Undo-Schritt bzw. Teil der Geste). Hat die Pose noch keine Stellung, startet
 * sie bei `aktuell` (den gezeigten Werten), sonst sprängen die übrigen Knochen auf 0.
 */
export function setzePoseKnochen(id: string, patch: Partial<PoseKnochen>, aktuell: Omit<PoseKnochen, 'haps'>): void {
  useEditor.getState().poseSetzen(id, (p) => {
    const knochen = Object.keys(patch).some((k) => k !== 'haps');
    let q = p;
    if (knochen) {
      const st = p.stellung ?? {
        kiefer: { winkel: aktuell.winkelUnten, zug: [aktuell.kieferZug[0], aktuell.kieferZug[1]] as [number, number], ziehen: aktuell.zugWeite, gieren: aktuell.gierenUnten, rollen: aktuell.rollenUnten, seit: aktuell.seitUnten },
        schaedel: { winkel: aktuell.winkelOben, gieren: aktuell.gierenOben, rollen: aktuell.rollenOben },
      };
      const kiefer = {
        ...(st.kiefer ?? {}),
        ...(patch.winkelUnten !== undefined ? { winkel: patch.winkelUnten } : {}),
        ...(patch.kieferZug ? { zug: [patch.kieferZug[0], patch.kieferZug[1]] as [number, number] } : {}),
        ...(patch.zugWeite !== undefined ? { ziehen: patch.zugWeite } : {}),
        ...(patch.gierenUnten !== undefined ? { gieren: patch.gierenUnten } : {}),
        ...(patch.rollenUnten !== undefined ? { rollen: patch.rollenUnten } : {}),
        ...(patch.seitUnten !== undefined ? { seit: patch.seitUnten } : {}),
      };
      const schaedel = {
        ...(st.schaedel ?? {}),
        ...(patch.winkelOben !== undefined ? { winkel: patch.winkelOben } : {}),
        ...(patch.gierenOben !== undefined ? { gieren: patch.gierenOben } : {}),
        ...(patch.rollenOben !== undefined ? { rollen: patch.rollenOben } : {}),
      };
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
export function griffSetzen(patch: Partial<MaulOptionen>, gezeigt: { winkelUnten: number; winkelOben: number; zug: [number, number]; zugWeite: number; gierenUnten: number; rollenUnten: number; seitUnten: number; gierenOben: number; rollenOben: number }): void {
  const { winkelUnten, winkelOben, kieferZug, ...rig } = patch;
  if (Object.keys(rig).length) setzeMaulOptionen(rig);
  if (winkelUnten === undefined && winkelOben === undefined && kieferZug === undefined) return;
  const ed = useEditor.getState();
  const ziel = ed.modus === 'editor' ? 'fressen' : ed.modus;
  setzePoseKnochen(ziel, { ...(winkelUnten !== undefined ? { winkelUnten } : {}), ...(winkelOben !== undefined ? { winkelOben } : {}), ...(kieferZug ? { kieferZug: [kieferZug[0], kieferZug[1]] as [number, number] } : {}) }, { winkelUnten: gezeigt.winkelUnten, winkelOben: gezeigt.winkelOben, kieferZug: gezeigt.zug, zugWeite: gezeigt.zugWeite, gierenUnten: gezeigt.gierenUnten, rollenUnten: gezeigt.rollenUnten, seitUnten: gezeigt.seitUnten, gierenOben: gezeigt.gierenOben, rollenOben: gezeigt.rollenOben });
}

/** Gelenke, Übergang und Reichweite auf die Automatik zurück (Kiefergelenk am Mundwinkel, Schädelgelenk dahinter). */
export function kieferAutomatik(): void {
  setzeMaulOptionen({ gelenk: [...MAUL_STANDARD.gelenk], kieferWinkel: [...MAUL_STANDARD.kieferWinkel], kieferReichweite: [...MAUL_STANDARD.kieferReichweite], schaedelGelenk: [...MAUL_STANDARD.schaedelGelenk] });
}

/** Pose wieder spiegelgleich: Gieren, Rollen und seitlicher Versatz der Knochen auf 0 (Winkel und Zug bleiben). */
export function poseSymmetrisch(id: string): void {
  useEditor.getState().poseSetzen(id, (p) => {
    const st = p.stellung;
    if (!st) return p;
    const kiefer = { ...(st.kiefer ?? {}) };
    const schaedel = { ...(st.schaedel ?? {}) };
    delete kiefer.gieren;
    delete kiefer.rollen;
    delete kiefer.seit;
    delete schaedel.gieren;
    delete schaedel.rollen;
    return { ...p, stellung: { ...st, kiefer, schaedel } };
  });
}
