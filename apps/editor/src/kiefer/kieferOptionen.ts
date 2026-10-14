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

/** Gelenk, Übergang und Reichweite auf die Automatik zurück (Gelenk am Mundwinkel). */
export function kieferAutomatik(): void {
  setzeMaulOptionen({ gelenk: [...MAUL_STANDARD.gelenk], kieferWinkel: [...MAUL_STANDARD.kieferWinkel], kieferReichweite: [...MAUL_STANDARD.kieferReichweite] });
}
