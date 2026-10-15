// Zufallsreihe (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil V): Körper für die Prüffälle. Florian
// (15.10.): „Die Testwesen sind nur zum Testen … Deine Tests waren sehr, sehr unvollständig.“ Deshalb neben seinen
// nachgezogenen Wesen (Rex, Langhals, Robbe, Tiger, Drache) einfache Grundkörper mit Zufallsvarianten, die die
// Fehlerklassen treffen: hoher Kopf über einem Bauch (Birne), Ei, lang, hoch, flach. DOM-frei.
import type { V2 } from '../../bezier';
import { type Dokument, neuesDokument } from '../../dokument';
import { type Knoten, type Profil, achsenRegeln } from '../../profil';
import langhalsJson from '../../versuch/vorlagen/langhals.json';
import rexJson from '../../versuch/vorlagen/rex.json';
import robbeJson from '../../versuch/vorlagen/robbe.json';
import tigerJson from '../../versuch/vorlagen/tiger.json';
import { type Vorlage, vorlageDokument } from '../../versuch/vorlagen';
import { halsVerbreitern, kastenSpanten } from '../kasten';
import type { Zufall } from './zufall';

export const KOERPER = ['kugel', 'ei', 'wurst', 'turm', 'flunder', 'birne', 'kasten', 'rex', 'langhals', 'robbe', 'drache'] as const;
export type KoerperArt = (typeof KOERPER)[number];

/** Grundkörper (analytisch) oder Florians nachgezogene Vorlage. */
export const GRUNDKOERPER: readonly KoerperArt[] = ['kugel', 'ei', 'wurst', 'turm', 'flunder', 'birne'];

/** Kreis-Griff je Viertelbogen (4/3 · tan(π/8)). */
const K = 0.5523;

function kn(p: V2, ein: V2, aus: V2): Knoten {
  return { p, ein, aus, art: 'glatt' };
}

type Masse = {
  /** Halbachsen der Seite: links (Schnauze, −x), rechts, oben, unten */
  aL: number;
  aR: number;
  bO: number;
  bU: number;
  /** Spitzheit der Schnauze (Griff-Faktor am linken Knoten, 1 = rund) */
  spitz: number;
  /** Front: halbe Breite und ihre Höhe (Anteil der Höhe) */
  wFront: number;
  yFrontAnteil: number;
  /** Top: halbe Breite und ihre Lage (Anteil von links nach rechts) */
  wTop: number;
  xTopAnteil: number;
};

function seiteEllipse(m: Masse): Profil {
  const H = m.bO + m.bU;
  const yM = m.bU;
  return {
    art: 'geschlossen',
    knoten: [
      kn({ x: 0, y: H }, { x: -K * m.aL, y: 0 }, { x: K * m.aR, y: 0 }),
      kn({ x: m.aR, y: yM }, { x: 0, y: K * m.bO }, { x: 0, y: -K * m.bU }),
      kn({ x: 0, y: 0 }, { x: K * m.aR, y: 0 }, { x: -K * m.aL, y: 0 }),
      kn({ x: -m.aL, y: yM }, { x: 0, y: -K * m.spitz * m.bU }, { x: 0, y: K * m.spitz * m.bO }),
    ],
  };
}

function frontHalb(H: number, w: number, yW: number): Profil {
  return achsenRegeln({
    art: 'halb',
    achse: 'senkrecht',
    knoten: [kn({ x: 0, y: H }, { x: -K * w, y: 0 }, { x: K * w, y: 0 }), kn({ x: w, y: yW }, { x: 0, y: K * (H - yW) }, { x: 0, y: -K * yW }), kn({ x: 0, y: 0 }, { x: K * w, y: 0 }, { x: -K * w, y: 0 })],
  });
}

function topHalb(aL: number, aR: number, w: number, xW: number): Profil {
  return achsenRegeln({
    art: 'halb',
    achse: 'waagerecht',
    knoten: [kn({ x: -aL, y: 0 }, { x: 0, y: -K * w }, { x: 0, y: K * w }), kn({ x: xW, y: w }, { x: -K * (xW + aL), y: 0 }, { x: K * (aR - xW), y: 0 }), kn({ x: aR, y: 0 }, { x: 0, y: K * w }, { x: 0, y: -K * w })],
  });
}

function ellipsenDokument(name: string, m: Masse): Dokument {
  const d = neuesDokument(name);
  const H = m.bO + m.bU;
  return {
    ...d,
    profile: {
      seite: seiteEllipse(m),
      front: frontHalb(H, m.wFront, m.yFrontAnteil * H),
      top: topHalb(m.aL, m.aR, m.wTop, -m.aL + m.xTopAnteil * (m.aL + m.aR)),
    },
  };
}

/**
 * Birne: hoher Kopf vorn oben, darunter ein Bauch, der weiter vorsteht (Florians Kugel mit Bauch unter hohem Maul,
 * 15.10.). Seite mit fünf Knoten: oben, hinten, unten, Bauch (vorn unten), Kopf (vorn oben).
 */
function birneDokument(name: string, z: Zufall): Dokument {
  const d = neuesDokument(name);
  const H = 0.53 * z.faktor(0.2);
  const aR = 0.26 * z.faktor(0.2);
  const aB = 0.3 * z.faktor(0.2);
  const aH = aB * z.zwischen(0.6, 0.85);
  const yB = 0.3 * H;
  const yH = 0.74 * H;
  const seite: Profil = {
    art: 'geschlossen',
    knoten: [
      kn({ x: -0.05 * H, y: H }, { x: -K * aH * 0.9, y: 0 }, { x: K * aR, y: 0 }),
      kn({ x: aR, y: 0.45 * H }, { x: 0, y: K * 0.55 * H }, { x: 0, y: -K * 0.45 * H }),
      kn({ x: 0, y: 0 }, { x: K * aR, y: 0 }, { x: -K * aB * 0.8, y: 0 }),
      kn({ x: -aB, y: yB }, { x: 0, y: -K * yB }, { x: 0, y: 0.3 * (yH - yB) }),
      kn({ x: -aH, y: yH }, { x: 0, y: -0.3 * (yH - yB) }, { x: 0, y: K * (H - yH) }),
    ],
  };
  const w = 0.25 * z.faktor(0.2);
  return { ...d, profile: { seite, front: frontHalb(H, w, 0.35 * H), top: topHalb(aB, aR, w, -0.05) } };
}

const vorlagen: Record<string, Vorlage> = {
  rex: rexJson as unknown as Vorlage,
  langhals: langhalsJson as unknown as Vorlage,
  robbe: robbeJson as unknown as Vorlage,
  tiger: tigerJson as unknown as Vorlage,
};

/** Florians nachgezogene Vorlage (Seite, Front, Top geschlossen). */
export function vorlageVon(name: 'rex' | 'langhals' | 'robbe' | 'tiger'): Vorlage {
  return vorlagen[name]!;
}

/**
 * Körper eines Prüffalls. Grundkörper mit Zufallsvarianten (Länge/Höhe ±30 %, Kopf, Bauch, Schnauze); die Vorlagen
 * bleiben, wie Florian sie gezeichnet hat.
 */
export function koerperDokument(art: KoerperArt, z: Zufall): Dokument {
  const name = `reihe-${art}`;
  switch (art) {
    case 'kugel':
      return neuesDokument(name);
    case 'ei': {
      // Front und Top teilen die halbe Breite (sonst widersprechen sich die Ansichten schon ohne Maul)
      const a = 0.27 * z.faktor(0.3);
      const w = 0.23 * z.faktor(0.2);
      return ellipsenDokument(name, { aL: a * 1.12, aR: a * 0.92, bO: 0.24 * z.faktor(0.2), bU: 0.22 * z.faktor(0.2), spitz: z.zwischen(0.55, 0.8), wFront: w, yFrontAnteil: 0.45, wTop: w, xTopAnteil: 0.58 });
    }
    case 'wurst': {
      const b = 0.17 * z.faktor(0.3);
      const w = b * z.zwischen(0.9, 1.2);
      return ellipsenDokument(name, { aL: 0.42 * z.faktor(0.3), aR: 0.42 * z.faktor(0.3), bO: b, bU: b, spitz: 1, wFront: w, yFrontAnteil: 0.5, wTop: w, xTopAnteil: 0.5 });
    }
    case 'turm': {
      const a = 0.18 * z.faktor(0.3);
      const w = a * z.zwischen(0.9, 1.2);
      return ellipsenDokument(name, { aL: a, aR: a, bO: 0.36 * z.faktor(0.3), bU: 0.34 * z.faktor(0.3), spitz: 1, wFront: w, yFrontAnteil: 0.5, wTop: w, xTopAnteil: 0.5 });
    }
    case 'flunder': {
      const b = 0.12 * z.faktor(0.3);
      const w = 0.32 * z.faktor(0.2);
      return ellipsenDokument(name, { aL: 0.34 * z.faktor(0.3), aR: 0.34 * z.faktor(0.3), bO: b, bU: b, spitz: 1, wFront: w, yFrontAnteil: 0.5, wTop: w, xTopAnteil: 0.5 });
    }
    case 'birne':
      return birneDokument(name, z);
    case 'kasten': {
      const dok = vorlageDokument(vorlagen.tiger!, 'zu', name);
      return { ...dok, spanten: kastenSpanten(dok.profile.front, 0.02, 0.15, 0.25, 0.85) };
    }
    case 'rex':
    case 'langhals':
    case 'robbe':
      return vorlageDokument(vorlagen[art]!, 'zu', name);
    case 'drache':
      return halsVerbreitern(vorlageDokument(vorlagen.langhals!, 'zu', name), 2, 0.3, 0.585);
  }
}
