/**
 * Florians Farben fürs Maul (Feinschlifflauf, Block D, 21.11.2026), gemessen an seinem Blatt `docs/look/editor/05-maul-detail.png`:
 * Solange die Punkte der Lippe für beide Lippen gelten und das Maul zu ist, sind sie türkis und die Linie bleibt in Tinte. Offen
 * (Pose, Blick ins Maul) oder mit getrennten Lippen ist die Oberlippe rosa und die Unterlippe blau, Linie und Punkte. Der
 * Mundwinkel bleibt schwarz. Dieselben Farben tragen die zwei Tropfen der Kiefer (`ozzy.css`, `--maul-oben`, `--maul-unten`) und
 * die Perlen der Reihen in der Linse.
 */
export const MAUL_FARBEN = { beide: '#00d3c5', oben: '#ff336c', unten: '#0600f9' } as const;

/** die Nummern der Farben in der Anzeige der Linien (`Szene.farben`); die höhere liegt vorn: oben vor unten, Punkte vor Linien */
export const LIPPEN_NR = { linieUnten: 1, linieOben: 2, punktUnten: 3, punktOben: 4 } as const;

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const mischen = (a: readonly number[], b: readonly number[], f: number): number[] => a.map((v, i) => v + (b[i]! - v) * f);

/**
 * Die Palette für die Anzeige der Linien (je Nummer aus `LIPPEN_NR` drei Werte). `offen`: 0 = zu und beide Lippen eins (Punkte
 * türkis, Linie in Tinte), 1 = offen oder getrennt (rosa und blau); dazwischen gehen die Farben über.
 */
export function lippenPalette(offen: number, tinte: readonly [number, number, number]): number[] {
  const f = Math.max(0, Math.min(1, offen));
  const beide = rgb(MAUL_FARBEN.beide);
  const oben = rgb(MAUL_FARBEN.oben);
  const unten = rgb(MAUL_FARBEN.unten);
  return [...mischen(tinte, unten, f), ...mischen(tinte, oben, f), ...mischen(beide, unten, f), ...mischen(beide, oben, f)];
}
