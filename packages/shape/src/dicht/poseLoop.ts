// Form zuerst (05.11.2026), „Nur Loops“: die Fressen-Pose auf dem dichten Netz (Florian: „Warum kann man in der Pose nicht einfach
// ganz normal die Bézier-Punkte bearbeiten und den Blendshape erstellen?“).
//
// Eine Pose sind zwei Knochen um den Mundwinkel (Unterkiefer öffnet, Schädel kippt) und ein Blendshape: je Punkt der Haut die
// Verschiebung gegen die Grundform, vor den Knochen. Grundform und Pose haben dasselbe Netz (dieselben Punkte und Dreiecke), nur
// andere Lagen. Wie weit ein Punkt mit einem Knochen dreht, sagt der Maulschnitt der Grundform (`maulAmLoop`); das bleibt beim
// Bearbeiten der Pose fest. Je Punkt ist die Drehung starr (ein Winkel um den Mundwinkel in der Seite), darum lässt sie sich genau
// umkehren: Bearbeitet wird die Pose so, wie sie zu sehen ist (posiert, mit denselben Werkzeugen wie die Grundform); danach wird
// zurückgedreht, und der Unterschied zur Grundform ist der Blendshape. Der Mundwinkel selbst dreht nicht mit (dort ist das Gewicht
// null), deshalb ist das Gelenk in der Pose dieselbe Stelle wie in ihrer Ruhe.

import type { V2 } from '../bezier';
import type { Haut } from './kurven';
import type { MaulSchnitt } from './maul';

/** Knochen der Pose in Grad: Unterkiefer öffnet nach unten, Schädel kippt nach oben */
export type Knochen = { kiefer: number; schaedel: number };

/**
 * Drehwinkel je Punkt der Haut (Bogenmaß) für die Knochen der Pose, nach den Gewichten des Maulschnitts. `zuBis` (Grad): so weit
 * darf der Unterkiefer unter die gerechnete Lage schließen (das Maul aus einer Linie ist um diesen Winkel offen gerechnet,
 * `Loop.maulLinie`; bei −`zuBis` liegen seine Lippen aufeinander). Sonst schließt er nicht über die gerechnete Lage hinaus.
 */
export function knochenWinkel(m: MaulSchnitt, k: Knochen, zuBis = 0): Float64Array {
  const n = m.gewicht.length;
  const a = (Math.max(-Math.max(0, zuBis), k.kiefer) * Math.PI) / 180;
  const s = (Math.max(0, k.schaedel) * Math.PI) / 180;
  const theta = new Float64Array(n);
  for (let v = 0; v < n; v++) theta[v] = m.drehsinn * (a * m.gewicht[v]! - s * m.gewichtOben[v]!);
  return theta;
}

/**
 * Lagen drehen: je Punkt um das Gelenk G (Mundwinkel in der Seite) um seinen Winkel, die Tiefe bleibt. `zurueck`: die Drehung
 * rückgängig (von der Pose in ihre Ruhe). Ergebnis: neue Lagen.
 */
export function knochenDrehen(P: ArrayLike<number>, theta: Float64Array, G: V2, zurueck = false): Float64Array {
  const n = P.length / 3;
  const out = new Float64Array(3 * n);
  for (let v = 0; v < n; v++) {
    const t = zurueck ? -theta[v]! : theta[v]!;
    const x = P[3 * v]!;
    const y = P[3 * v + 1]!;
    out[3 * v + 2] = P[3 * v + 2]!;
    if (t === 0) {
      out[3 * v] = x;
      out[3 * v + 1] = y;
      continue;
    }
    const c = Math.cos(t);
    const s = Math.sin(t);
    const dx = x - G.x;
    const dy = y - G.y;
    out[3 * v] = G.x + c * dx - s * dy;
    out[3 * v + 1] = G.y + s * dx + c * dy;
  }
  return out;
}

/**
 * Das Maulinnere in der Pose: starr um das Gelenk, der Boden mit dem Unterkiefer, der Gaumen mit dem Schädel (wie die Lippen, an
 * denen sie hängen: Ihre Gewichte sind genau 1 bzw. 0).
 */
export function innenPosieren(m: MaulSchnitt, k: Knochen): { positionen: Float32Array; normalen: Float32Array } {
  const ip = m.innen.positionen;
  const inn = m.innen.normalen;
  const positionen = new Float32Array(ip.length);
  const normalen = new Float32Array(inn.length);
  const unten = (m.drehsinn * Math.max(0, k.kiefer) * Math.PI) / 180;
  const oben = (-m.drehsinn * Math.max(0, k.schaedel) * Math.PI) / 180;
  const G = m.gelenk;
  for (let v = 0; v < ip.length / 3; v++) {
    const t = m.innenUnten[v] === 1 ? unten : oben;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const dx = ip[3 * v]! - G.x;
    const dy = ip[3 * v + 1]! - G.y;
    positionen[3 * v] = G.x + c * dx - s * dy;
    positionen[3 * v + 1] = G.y + s * dx + c * dy;
    positionen[3 * v + 2] = ip[3 * v + 2]!;
    normalen[3 * v] = c * inn[3 * v]! - s * inn[3 * v + 1]!;
    normalen[3 * v + 1] = s * inn[3 * v]! + c * inn[3 * v + 1]!;
    normalen[3 * v + 2] = inn[3 * v + 2]!;
  }
  return { positionen, normalen };
}

/**
 * Werte je Punkt (`k` Zahlen je Punkt) für neue Punkte des Netzes ergänzen (Nummern ab `nAlt`, etwa nach dem Verdichten oder dem
 * Einsetzen eines Loops): Jeder neue Punkt nimmt das Mittel seiner Nachbarn, zuerst die, die an alten Punkten liegen, dann
 * nach außen; danach drei Runden geglättet (nur die neuen). Spiegelgleich: Mit `spiegelZ` ist der dritte Wert eine Tiefe (beim
 * Spiegelbild umgekehrt), sonst sind die Werte beim Spiegelbild gleich.
 */
export function ergaenzen(h: Haut, werte: ArrayLike<number>, nAlt: number, k: number, spiegelZ = false): Float64Array {
  const n = h.n;
  const out = new Float64Array(k * n);
  for (let i = 0; i < Math.min(werte.length, k * nAlt); i++) out[i] = werte[i]!;
  if (n <= nAlt) return out;
  const bekannt = new Uint8Array(n);
  bekannt.fill(1, 0, nAlt);
  let rand: number[] = [];
  for (let v = nAlt; v < n; v++) if (h.nachbarn[v]!.some((w) => w < nAlt)) rand.push(v);
  // Ring um Ring von den alten Punkten nach innen
  while (rand.length) {
    const neu: number[] = [];
    for (const v of rand) {
      let zahl = 0;
      for (let c = 0; c < k; c++) out[k * v + c] = 0;
      for (const w of h.nachbarn[v]!) {
        if (!bekannt[w]) continue;
        for (let c = 0; c < k; c++) out[k * v + c] = out[k * v + c]! + out[k * w + c]!;
        zahl++;
      }
      if (zahl) for (let c = 0; c < k; c++) out[k * v + c] = out[k * v + c]! / zahl;
    }
    for (const v of rand) bekannt[v] = 1;
    for (const v of rand) for (const w of h.nachbarn[v]!) if (!bekannt[w] && !neu.includes(w)) neu.push(w);
    rand = neu;
  }
  for (let runde = 0; runde < 3; runde++) {
    for (let v = nAlt; v < n; v++) {
      const nb = h.nachbarn[v]!;
      if (nb.length === 0) continue;
      for (let c = 0; c < k; c++) {
        let s = 0;
        for (const w of nb) s += out[k * w + c]!;
        out[k * v + c] = s / nb.length;
      }
    }
  }
  // spiegelgleich: je Paar das Mittel
  for (let v = nAlt; v < n; v++) {
    const w = h.spiegel[v]!;
    if (w < nAlt) continue;
    for (let c = 0; c < k; c++) {
      const um = spiegelZ && c === 2 ? -1 : 1;
      const m = 0.5 * (out[k * v + c]! + um * out[k * w + c]!);
      out[k * v + c] = m;
      out[k * w + c] = um * m;
    }
    if (w === v && spiegelZ && k > 2) out[k * v + 2] = 0;
  }
  return out;
}
