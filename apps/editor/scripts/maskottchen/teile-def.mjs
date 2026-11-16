// Ozzy in Teilen: je Teil eine Folge von Marken (gleich in allen Ansichten) und je Ansicht ihre Lage.
// Koordinaten: Logo (1826 × 1630). Ansichten: Kopf über den Blickwinkel θ (0 = Front, 15 = Logo, 90 = Seite, 180 = hinten),
// Körper über die Richtung ψ (90 = Seite wie im Logo, 0 = Front, 180 = hinten). Negative Winkel rechnet die Laufzeit gespiegelt.
//
// Marken: S(x, y) liegt auf der Nachzeichnung der Ansicht (wird angelegt), P(x, y) frei. Stücke zwischen zwei Marken:
//   's'            längs der Nachzeichnung (kürzerer Weg), ['s', [x, y]] über den Punkt
//   ['f', ...]     frei, glatt durch die angegebenen Punkte (verdeckte Kanten, offene Stellen)
//   'g'            gerade
// Nicht genannte Stücke sind frei ohne Zwischenpunkte.
export const S = (x, y) => ({ s: [x, y] });
export const P = (x, y) => ({ p: [x, y] });

const KOPF_SEITE = [1150, 700];
const KOPF_FRONT = [800, 700];
const KOERPER = [800, 1180];

/** Kopf: Teile über θ, gezeichnet in dieser Reihenfolge (hinten → vorn) */
export const kopf = [
  {
    name: 'ohrH', // hinteres Ohr im Profil = linkes Ohr im Logo (rechtes Ohr des Hundes)
    farbe: 'schwarz',
    marken: ['a', 'b', 'c', 'd', 'e'],
    ecken: ['a', 'c', 'e'],
    spiegel: 'ohrV',
    ansichten: {
      15: { quelle: 'logo', anker: KOPF_SEITE, m: { a: S(616, 642), b: S(733, 68), c: S(1089, 385), d: P(860, 620), e: S(653, 626) }, s: { 'a-b': 's', 'b-c': 's', 'e-a': 's', 'c-d': ['f', [990, 520]] } },
      0: { quelle: 'front', anker: KOPF_FRONT, m: { a: S(214, 642), b: S(330, 68), c: S(707, 384), d: P(470, 620), e: S(249, 628) }, s: { 'a-b': 's', 'b-c': 's', 'e-a': 's', 'c-d': ['f', [610, 520]] } },
      90: { quelle: 'seite', anker: KOPF_SEITE, m: { a: S(619, 642), b: S(701, 64), c: S(925, 186), d: P(840, 560), e: S(654, 627) }, s: { 'a-b': 's', 'b-c': 's', 'e-a': 's', 'c-d': ['f', [900, 380]] } },
    },
  },
  {
    name: 'ohrV', // vorderes Ohr im Profil = rechtes Ohr im Logo
    farbe: 'schwarz',
    marken: ['a', 'b', 'c', 'd', 'e'],
    ecken: ['a', 'c', 'e'],
    spiegel: 'ohrH',
    ansichten: {
      15: { quelle: 'logo', anker: KOPF_SEITE, m: { a: S(1753, 598), b: S(1629, 48), c: S(1290, 335), d: P(1460, 560), e: S(1717, 591) }, s: { 'a-b': 's', 'b-c': 's', 'e-a': 's', 'c-d': ['f', [1360, 470]] } },
      0: { quelle: 'front', anker: KOPF_FRONT, m: { a: S(1389, 641), b: S(1268, 67), c: S(926, 334), d: P(1130, 620), e: S(1353, 628) }, s: { 'a-b': 's', 'b-c': 's', 'e-a': 's', 'c-d': ['f', [990, 520]] } },
      90: {
        quelle: 'seite',
        anker: KOPF_SEITE,
        m: { a: S(1250, 168), b: S(1086, 30), c: S(925, 186), d: P(1080, 385), e: P(1190, 330) },
        s: { 'a-b': 's', 'b-c': 's', 'c-d': ['f', [990, 320]], 'e-a': ['f', [1220, 250]] },
      },
    },
  },
  {
    name: 'schopf',
    farbe: 'schwarz',
    marken: ['a', 'b', 'c', 'd', 'e'],
    ecken: ['a', 'b', 'c'],
    spiegel: 'selbst',
    ansichten: {
      15: { quelle: 'logo', anker: KOPF_SEITE, m: { a: S(1183, 394), b: S(1140, 214), c: S(1290, 335), d: P(1300, 455), e: P(1190, 465) }, s: { 'a-b': 's', 'b-c': 's' } },
      0: { quelle: 'front', anker: KOPF_FRONT, m: { a: S(796, 387), b: S(769, 205), c: S(926, 334), d: P(935, 455), e: P(800, 465) }, s: { 'a-b': 's', 'b-c': 's' } },
      90: { quelle: 'seite', anker: KOPF_SEITE, m: { a: P(1069, 123), b: P(1056, 69), c: P(1101, 105), d: P(1104, 141), e: P(1071, 144) }, s: { 'a-b': ['f', [1060, 95]], 'b-c': ['f', [1082, 78]] } },
    },
  },
  {
    // schwarzer Kopf als eine Fläche: Streifen hinten, Backenbart (im Profil das Band über der Schnauze), oben hinter den Ohren
    name: 'kopf',
    farbe: 'schwarz',
    marken: ['eH', 'N', 'X1', 'X2', 'F', 'eV', 'TR', 'T', 'TL'],
    ecken: { eH: 1, N: 1, F: { 0: 1, 15: 1, 90: 0 }, eV: { 0: 1, 15: 1, 90: 0 } },
    spiegel: 'selbst',
    paare: [['eH', 'eV'], ['N', 'F'], ['X1', 'X2'], ['TL', 'TR']],
    ansichten: {
      15: {
        quelle: 'logo',
        anker: KOPF_SEITE,
        m: { eH: S(653, 626), N: S(638, 770), X1: P(760, 1010), X2: P(1360, 1060), F: S(1681, 966), eV: S(1717, 591), TR: P(1520, 360), T: P(1180, 422), TL: P(860, 442) },
        s: { 'eH-N': 's', 'N-X1': ['f', [660, 900]], 'X1-X2': ['f', [1050, 1120]], 'X2-F': ['f', [1460, 975], [1600, 945]], 'F-eV': 's', 'eV-TR': ['f', [1660, 450]], 'TR-T': ['f', [1350, 380]], 'TL-eH': ['f', [720, 520]] },
      },
      0: {
        quelle: 'front',
        anker: KOPF_FRONT,
        m: { eH: S(249, 628), N: S(294, 1017), X1: P(430, 1120), X2: P(1170, 1120), F: S(1306, 1017), eV: S(1353, 628), TR: P(1150, 420), T: P(800, 410), TL: P(450, 420) },
        s: { 'eH-N': 's', 'N-X1': ['f', [360, 1060]], 'X1-X2': ['f', [800, 1180]], 'X2-F': ['f', [1240, 1060]], 'F-eV': 's', 'eV-TR': ['f', [1290, 500]], 'TL-eH': ['f', [310, 500]] },
      },
      90: {
        quelle: 'seite',
        anker: KOPF_SEITE,
        m: { eH: S(654, 627), N: S(640, 770), X1: P(760, 1010), X2: P(1360, 1060), F: S(1494, 683), eV: S(1250, 168), TR: P(1120, 150), T: P(920, 245), TL: P(715, 365) },
        s: { 'eH-N': 's', 'N-X1': ['f', [660, 900]], 'X1-X2': ['f', [1050, 1120]], 'X2-F': ['f', [1450, 880], [1480, 760]], 'F-eV': 's', 'eV-TR': ['f', [1190, 140]], 'T-TL': ['f', [820, 290]], 'TL-eH': ['f', [670, 490]] },
      },
    },
  },
  {
    // weißes Gesicht als eine Fläche, mit beiden Schlitzen als Kerben, Wangen, Bart; oben offen (weiß auf weiß)
    name: 'gesicht',
    farbe: 'weiss',
    marken: ['A2', 'B', 'C', 'D', 'E', 'F', 'G1', 'G2', 'H', 'I', 'J', 'K', 'L', 'M', 'A'],
    ecken: {
      A2: { 0: 0, 15: 0, 90: 1 },
      B: { 0: 1, 15: 1, 90: 0 },
      C: { 0: 1, 15: 1, 90: 0 },
      D: 1,
      E: 1,
      F: { 0: 0, 15: 1, 90: 0 },
      G1: { 0: 1, 15: 0, 90: 0 },
      G2: 1,
      H: 1,
      I: 1,
      J: 1,
      L: 1,
      M: 1,
      A: 1,
    },
    spiegel: 'selbst',
    paare: [['A2', 'B'], ['C', 'A'], ['D', 'M'], ['E', 'L'], ['F', 'K'], ['G1', 'J'], ['G2', 'I']],
    ansichten: {
      15: {
        quelle: 'logo',
        anker: KOPF_SEITE,
        m: { A2: P(1136, 378), B: S(1183, 394), C: S(1257, 410), D: S(1660, 771), E: S(1462, 705), F: S(1681, 966), G1: P(1560, 1010), G2: S(1488, 991), H: S(1224, 1216), I: S(973, 1062), J: S(870, 1139), K: S(787, 975), L: S(999, 707), M: S(725, 873), A: S(1089, 385) },
        s: { 'B-C': 's', 'C-D': 's', 'D-E': 's', 'E-F': 's', 'F-G1': ['f', [1625, 1000]], 'G1-G2': 'g', 'G2-H': 's', 'H-I': 's', 'I-J': 's', 'J-K': 's', 'K-L': 's', 'L-M': 's', 'M-A': 's' },
      },
      0: {
        quelle: 'front',
        anker: KOPF_FRONT,
        m: { A2: P(752, 392), B: S(796, 387), C: S(886, 415), D: S(1279, 872), E: S(1006, 708), F: S(1208, 1000), G1: S(1135, 1139), G2: S(1030, 1063), H: S(800, 1208), I: S(570, 1063), J: S(468, 1138), K: S(392, 1000), L: S(595, 708), M: S(323, 870), A: S(707, 384) },
        s: { 'B-C': 's', 'C-D': 's', 'D-E': 's', 'E-F': 's', 'F-G1': 's', 'G1-G2': 's', 'G2-H': 's', 'H-I': 's', 'I-J': 's', 'J-K': 's', 'K-L': 's', 'L-M': 's', 'M-A': 's' },
      },
      90: {
        quelle: 'seite',
        anker: KOPF_SEITE,
        m: { A2: S(1146, 205), B: S(1224, 246), C: S(1321, 429), D: S(1482, 738), E: P(1478, 772), F: P(1500, 830), G1: P(1497, 890), G2: S(1490, 931), H: S(1391, 1157), I: S(1032, 1047), J: S(943, 1139), K: S(806, 962), L: S(1113, 708), M: S(727, 870), A: S(1174, 369) },
        s: { 'A2-B': 's', 'B-C': 's', 'C-D': 's', 'D-E': 'g', 'E-F': 'g', 'F-G1': 'g', 'G1-G2': 'g', 'G2-H': 's', 'H-I': 's', 'I-J': 's', 'J-K': 's', 'K-L': 's', 'L-M': 's', 'M-A': 's', 'A-A2': 's' },
      },
    },
  },
  {
    name: 'nase',
    farbe: 'schwarz',
    marken: ['T', 'R', 'U', 'L'],
    ecken: [],
    spiegel: 'selbst',
    paare: [['R', 'L']],
    ansichten: {
      15: { quelle: 'logo', anker: KOPF_SEITE, m: { T: S(1241.5, 743.3), R: S(1334.9, 783.1), U: S(1242.5, 871.2), L: S(1148.5, 784.3) }, s: { 'T-R': 's', 'R-U': 's', 'U-L': 's', 'L-T': 's' } },
      0: { quelle: 'front', anker: KOPF_FRONT, m: { T: S(815.8, 743.8), R: S(911.8, 783.4), U: S(819.2, 872.3), L: S(724.3, 785.4) }, s: { 'T-R': 's', 'R-U': 's', 'U-L': 's', 'L-T': 's' } },
      90: { quelle: 'seite', anker: KOPF_SEITE, m: { T: S(1482, 738), R: S(1585.8, 778.2), U: S(1530.2, 870.9), L: S(1429.4, 788) }, s: { 'T-R': ['f', [1545, 728]], 'R-U': 's', 'U-L': 's', 'L-T': 's' } },
    },
  },
];

/** Körper über ψ: Rumpf und Schwanz (Beine rechnet die Laufzeit als Kästen) */
export const koerper = [
  {
    name: 'rumpf',
    farbe: 'schwarz',
    marken: ['NB', 'TT', 'TB', 'RU', 'BL', 'BT', 'BR', 'CH', 'CF', 'CF2', 'NF'],
    ecken: ['NB', 'TT', 'TB'],
    spiegel: 'selbst',
    paare: [['NB', 'NF'], ['TT', 'CF2'], ['TB', 'CF'], ['RU', 'CH'], ['BL', 'BR']],
    ansichten: {
      90: {
        quelle: 'logo',
        anker: KOERPER,
        m: { NB: S(638, 770), TT: S(478, 838), TB: S(304, 1043), RU: S(312, 1335), BL: S(749, 1390), BT: S(803.8, 1315.3), BR: S(851, 1390), CH: S(1291, 1335), CF: P(1340, 1225), CF2: P(1330, 1100), NF: P(1180, 900) },
        s: {
          'NB-TT': 's',
          'TT-TB': ['f', [380, 930]],
          'TB-RU': 's',
          'RU-BL': ['f', [530, 1300]],
          'BL-BT': 's',
          'BT-BR': 's',
          'BR-CH': ['f', [1070, 1300]],
          'CH-CF': ['f', [1310, 1270]],
          'CF2-NF': ['f', [1270, 980]],
          'NF-NB': ['f', [900, 790]],
        },
      },
      0: {
        quelle: 'front',
        anker: KOERPER,
        m: { NB: S(315, 991), TT: S(339, 1078), TB: S(379, 1160), RU: S(372, 1300), BL: S(761, 1390), BT: S(802.2, 1340.8), BR: S(842, 1390), CH: S(1228, 1300), CF: S(1221, 1160), CF2: S(1261, 1078), NF: S(1285, 994) },
        s: {
          'NB-TT': 's',
          'TT-TB': 's',
          'TB-RU': 's',
          'RU-BL': ['f', [570, 1300]],
          'BL-BT': 's',
          'BT-BR': 's',
          'BR-CH': ['f', [1030, 1300]],
          'CH-CF': 's',
          'CF-CF2': 's',
          'CF2-NF': 's',
          'NF-NB': ['f', [1000, 920], [600, 920]],
        },
      },
      180: {
        quelle: 'front',
        anker: KOERPER,
        m: { NB: P(420, 840), TT: P(345, 960), TB: P(338, 1120), RU: P(372, 1300), BL: P(761, 1390), BT: P(800, 1341), BR: P(839, 1390), CH: P(1228, 1300), CF: P(1262, 1120), CF2: P(1255, 960), NF: P(1180, 840) },
        s: {
          'RU-BL': ['f', [570, 1300]],
          'BL-BT': ['f', [770, 1352]],
          'BT-BR': ['f', [830, 1352]],
          'BR-CH': ['f', [1030, 1300]],
          'NF-NB': ['f', [1000, 790], [800, 775], [600, 790]],
        },
      },
    },
  },
  {
    name: 'kehle', // Brustlinie vor dem Bart: gehört zum Körper (im Profil liegt sie fast genau wie im Logo)
    farbe: 'schwarz',
    marken: ['t', 'o', 'i', 'u'],
    ecken: ['t'],
    spiegel: 'selbst',
    ansichten: {
      90: { quelle: 'logo', anker: KOERPER, m: { t: S(1488, 991), o: S(1291, 1320), i: P(1250, 1300), u: P(1330, 1120) }, s: { 't-o': 's', 'i-u': ['f', [1290, 1200]] } },
      0: { quelle: 'front', anker: KOERPER, m: { t: P(800, 1010), o: P(812, 1200), i: P(800, 1215), u: P(788, 1100) } },
      180: { quelle: 'front', anker: KOERPER, m: { t: P(800, 1010), o: P(812, 1200), i: P(800, 1215), u: P(788, 1100) } },
    },
  },
  {
    name: 'schwanz',
    farbe: 'schwarz',
    marken: ['TT', 'O', 'L', 'U', 'TB', 'I'],
    ecken: ['TT', 'TB'],
    spiegel: 'selbst',
    ansichten: {
      90: {
        quelle: 'logo',
        anker: [400, 950],
        m: { TT: S(478, 838), O: S(300, 709), L: S(136.2, 834), U: P(215, 1015), TB: S(304, 1043), I: P(420, 960) },
        s: { 'TT-O': 's', 'O-L': 's', 'L-U': 's', 'U-TB': 's', 'TB-I': ['f', [360, 1010]], 'I-TT': ['f', [470, 900]] },
      },
    },
  },
  {
    name: 'schwanzloch',
    farbe: 'weiss',
    marken: ['E', 'T', 'R', 'U'],
    ecken: ['E'],
    spiegel: 'selbst',
    ansichten: {
      90: {
        quelle: 'logo',
        anker: [400, 950],
        m: { E: S(210, 796), T: S(300.2, 776.8), R: S(409, 860), U: S(300, 973) },
        s: { 'E-T': 's', 'T-R': 's', 'R-U': 's', 'U-E': 's' },
      },
    },
  },
];
