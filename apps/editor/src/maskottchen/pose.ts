// Die Pose: alles, was Ozzy in einem Augenblick ausmacht, als flache Liste von Zahlen. Alle Clips liefern Posen (ganz oder in
// Teilen), der Mischer rechnet in diesem Raum (darum morphen Animationen sauber ineinander: nie Geometrie gegen Geometrie,
// immer Zahl gegen Zahl, und die Formen folgen daraus).
//
// Winkel in Grad. Bezug: Ozzy schaut nach rechts (wie im Logo). `spiegel` dreht das ganze Bild (nach links schauen).

export interface Pose {
  /** Weltlage des Körperankers (im Logo bei 800, 1180; Boden bei y = 1573) */
  x: number;
  y: number;
  /** nach links schauend */
  spiegel: number; // 0 oder 1 (als Zahl, damit es sich mischen lässt; gezeichnet wird ab 0,5 gespiegelt)
  /** Richtung des Körpers: 90 = Seite (Logo), 0 = Front, 180 = von hinten */
  psi: number;
  /** Körper kippen (+ = vorn runter) */
  nicken: number;
  /** seitlich wiegen (+ = nahe Seite runter) */
  rollen: number;
  /** Körper anheben (Bildpunkte, + = hoch); der Boden-Löser setzt das selbst, wenn `boden` > 0 */
  heben: number;
  /** Strecken (+, höher und schmaler) / Stauchen (−, flacher und breiter) des Rumpfs um die Hüftlinie, Anteil */
  stauchen: number;
  /** Rumpf biegen wie eine Bohne (+ = Rücken rund nach oben, − = durchhängen), in Bildpunkten in der Mitte */
  biegen: number;
  /** Kinnstück (Bart) als Pendel vor/zurück (Grad, + = Spitze nach vorn; sichtbar von der Seite) */
  bartDreh: number;
  /** Atem 0…1 */
  atmen: number;
  /** Beine: Schwung um die Hüfte (+ = Fuß nach vorn); V/H = vorn/hinten, N/F = nah/fern */
  beinVN: number;
  beinVF: number;
  beinHN: number;
  beinHF: number;
  /** Bein anheben (Bildpunkte), wenn es in der Luft schwingt */
  hubVN: number;
  hubVF: number;
  hubHN: number;
  hubHF: number;
  /** Höhe des Bodens unter jedem Fuß (Bildpunkte über dem Grundboden): Stufen hoch- und hinuntersteigen */
  stufeVN: number;
  stufeVF: number;
  stufeHN: number;
  stufeHF: number;
  /** Bahn eines schwingenden Fußes über seinem Boden (Bildpunkte): mindestens so hoch geht die ganze Sohle über das Gelände */
  bahnVN: number;
  bahnVF: number;
  bahnHN: number;
  bahnHF: number;
  /** Kopf: Blickwinkel (0 = Front, 15 = Logo, 90 = Profil, 180 = Hinterkopf) */
  theta: number;
  kopfNicken: number;
  kopfNeigen: number;
  kopfX: number;
  kopfY: number;
  /** Ohren drehen um ihre Wurzel (+ = nach außen/hängen, − = spitzen) */
  ohrH: number;
  ohrV: number;
  schopf: number;
  /** Schlitze heben (+, neugierig) / senken (−) */
  brauen: number;
  /** Schlitze kippen (+ = Spitzen runter, entschlossen; − = Spitzen hoch, besorgt) */
  brauenKipp: number;
  /** Nase: Schnüffeln (Anteil) */
  nase: number;
  /** Kinnstück (Bart) als Pendel seitwärts (Grad; sichtbar von vorn) */
  bart: number;
  /** Schwanz drehen (Grad, + = hoch) und Ring drehen (Grad um die eigene Achse) */
  schwanz: number;
  schwanzDreh: number;
  /** Boden-Löser an (1) oder aus (0): an, wenn Ozzy steht oder läuft; aus beim Springen */
  boden: number;
}

export const RUHE: Pose = {
  x: 800,
  y: 1180,
  spiegel: 0,
  psi: 90,
  nicken: 0,
  rollen: 0,
  heben: 0,
  stauchen: 0,
  biegen: 0,
  bartDreh: 0,
  atmen: 0,
  beinVN: 0,
  beinVF: 0,
  beinHN: 0,
  beinHF: 0,
  hubVN: 0,
  hubVF: 0,
  hubHN: 0,
  hubHF: 0,
  stufeVN: 0,
  stufeVF: 0,
  stufeHN: 0,
  stufeHF: 0,
  bahnVN: 0,
  bahnVF: 0,
  bahnHN: 0,
  bahnHF: 0,
  theta: 15,
  kopfNicken: 0,
  kopfNeigen: 0,
  kopfX: 0,
  kopfY: 0,
  ohrH: 0,
  ohrV: 0,
  schopf: 0,
  brauen: 0,
  brauenKipp: 0,
  nase: 0,
  bart: 0,
  schwanz: 0,
  schwanzDreh: 0,
  boden: 1,
};

export type PoseTeil = Partial<Pose>;
export const POSE_SCHLUESSEL = Object.keys(RUHE) as (keyof Pose)[];

/** Winkel, die über den kürzesten Weg gemischt werden müssten — hier bewusst nicht: Ozzy dreht den Kopf auch 360° weit. */
export function posKopie(p: Pose): Pose {
  return { ...p };
}

/** a + (b − a)·t für alle Schlüssel, die in b stehen */
export function mischen(a: Pose, b: PoseTeil, t: number, out: Pose = { ...a }): Pose {
  for (const k of POSE_SCHLUESSEL) {
    const vb = b[k];
    if (vb === undefined) out[k] = a[k];
    else out[k] = a[k] + (vb - a[k]) * t;
  }
  return out;
}
