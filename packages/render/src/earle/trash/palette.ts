import { PaletteAtlas } from '../palette';

/**
 * Müll-Paletten je Stil (Serigrafie-Rampen, Index 0 = Tinte der Welt, damit Eigenschatten und Schlagschatten auf dem
 * Boden eine Tintenform bleiben). Neongrün `#b8ff2a` ist der Akzent des Mülls; alles andere bleibt gedämpft, damit
 * der Akzent trägt.
 */
export type TrashStyle = 'rost' | 'sirup' | 'nebel' | 'schnee' | 'wald';

/** Materialzeilen des Mülls (Reihenfolge = Zeilenversatz je Welt). */
export const TRASH_MATERIALS = ['heap', 'ruin', 'rust', 'bone', 'teal', 'dark', 'glass', 'neon', 'bloom'] as const;
export type TrashMaterialName = (typeof TRASH_MATERIALS)[number];

interface StyleRamps {
  /** Lichtstufen (dunkel → hell) ohne Tinte, je Material. */
  ramps: Record<TrashMaterialName, string[]>;
  /** Farbe der Moose/Überwucherung (Lichtseite, Schattenseite). */
  moss: [string, string];
  /** Schneekappen (Welt 06) statt Moos auf den Oberseiten. */
  snow?: boolean;
}

/** Neon-Rampe (Schleim, Moos, Sporen, Schleier): tief → hell. */
const NEON = ['#1c4a0c', '#3f8412', '#8fdc1a', '#b8ff2a', '#e6ffa8'];

const STYLES: Record<TrashStyle, StyleRamps> = {
  // Startwelt Tjorizo (Goldene Wiese): Rost-Umbra-Berge vor goldener Wiese, Türkis-Stein, Neon als einziger Akzent
  rost: {
    ramps: {
      heap: ['#34200e', '#6a3416', '#a24e24', '#cc6e32', '#e8a058'],
      ruin: ['#1e3a3a', '#2f5a4a', '#4f8c78', '#8cc4a8', '#cfe8cc'],
      rust: ['#3a1c0c', '#7a3416', '#c8542a', '#e8864a', '#f4b476'],
      bone: ['#4a4a34', '#7c7a58', '#b4b084', '#dcd8ae', '#f4f0cc'],
      teal: ['#10302c', '#16605a', '#22baa9', '#6adccb', '#b4f2e4'],
      dark: ['#161e12', '#24301c', '#3a4a2a', '#56663a', '#7a8a50'],
      glass: ['#1c4a0c', '#3f8412', '#8fdc1a', '#b8ff2a', '#e6ffa8'],
      neon: NEON,
      bloom: ['#f7f6d8', '#f0dc78', '#e5aed4', '#b8e0c8', '#f4b476'],
    },
    moss: ['#b8ff2a', '#4f8f14'],
  },
  // Syrup (Violette Hänge): Pflaumen-Violett mit Bernstein-Licht, Rohre und Fässer, Neon gedämpfter
  sirup: {
    ramps: {
      heap: ['#221a3a', '#3a2a5a', '#5a3e7a', '#a0703a', '#e0a452'],
      ruin: ['#2a2f7a', '#3f4a9c', '#6f7cc8', '#a8b4e6', '#e2e8ff'],
      rust: ['#3a1a10', '#7a3016', '#c85a24', '#f17023', '#f8b070'],
      bone: ['#4a4630', '#8a8656', '#c2bc84', '#e8dcaa', '#f6efbe'],
      teal: ['#1a2a5a', '#2f45c0', '#4f7de0', '#8fa8f0', '#e2e8ff'],
      dark: ['#14122a', '#221e40', '#343058', '#4c4674', '#6c6494'],
      glass: ['#2a1a4a', '#5a3a8a', '#f17023', '#f8a040', '#fce0a0'],
      neon: NEON,
      bloom: ['#f6efbe', '#f8b070', '#e2e8ff', '#d8d8a0', '#f17023'],
    },
    moss: ['#b8ff2a', '#4f8f14'],
  },
  // Luzz (Nebelhügel): Käfigruinen in Blaugrau, blassgrünes Leuchtmoos
  nebel: {
    ramps: {
      heap: ['#10262a', '#1c3e46', '#2f5e6a', '#5f96a4', '#a8d0d8'],
      ruin: ['#123a44', '#1f5a66', '#3f8a96', '#8cc4cc', '#e2f3ea'],
      rust: ['#2a1a10', '#5a2e16', '#8a4a24', '#c8542a', '#e8a070'],
      bone: ['#3a4a44', '#6a7e74', '#a4b8aa', '#d2e2d4', '#eaf6f4'],
      teal: ['#0c3a5a', '#1f5f8c', '#2f7fc0', '#6fbcd8', '#b8e6ec'],
      dark: ['#0a1a14', '#12281e', '#1e3a2c', '#2e5040', '#466a56'],
      glass: ['#1c4a0c', '#3f8412', '#8fdc1a', '#b8ff2a', '#e6ffa8'],
      neon: NEON,
      bloom: ['#eaf6f4', '#d6f05a', '#b8e6ec', '#a8d66a', '#e6d24a'],
    },
    moss: ['#c6ff5a', '#3f7a24'],
  },
  // Tjorizo Rückseite (Schneekiefern): dunkle Halden mit Schneekappen, wenig Neon
  schnee: {
    ramps: {
      heap: ['#12161e', '#1e2636', '#2e3a56', '#4a5a86', '#8fa0c8'],
      ruin: ['#1a2a58', '#2a4ec0', '#3f6fe0', '#8fb0f0', '#e8ecf0'],
      rust: ['#2a140c', '#5a2614', '#9a4020', '#c8542a', '#e8906a'],
      bone: ['#5a6070', '#8a94a8', '#b8c4d8', '#e0e6f0', '#f7f6ee'],
      teal: ['#0a2a40', '#12506a', '#22889a', '#6ac4d0', '#c8ecf0'],
      dark: ['#0a0d14', '#12161e', '#1c2230', '#2a3244', '#3e485e'],
      glass: ['#1c4a0c', '#3f8412', '#8fdc1a', '#b8ff2a', '#e6ffa8'],
      neon: NEON,
      bloom: ['#f7f6ee', '#c8d8f0', '#eef2f8', '#9ab0d0', '#e5aed4'],
    },
    moss: ['#f7f6ee', '#9ab0d0'],
    snow: true,
  },
  // Wooding: alte, grün überwachsene Steinruinen, kein Neon
  wald: {
    ramps: {
      heap: ['#1a2a1c', '#2c4430', '#46663c', '#6e8a4a', '#a8b870'],
      ruin: ['#2a3a3c', '#46585a', '#6e8480', '#a4b4aa', '#dce4d4'],
      rust: ['#2a1e14', '#4a3222', '#6e4a2e', '#9a6a3e', '#c89a60'],
      bone: ['#4a4a3c', '#7a7a64', '#a8a88e', '#d4d2b8', '#eeecd8'],
      teal: ['#10302c', '#1c4a44', '#2f6a60', '#5f9a8a', '#a8d0c0'],
      dark: ['#12180e', '#1c2616', '#2a3820', '#3c4e2c', '#56683e'],
      glass: ['#12301a', '#1f5a2a', '#35b43e', '#8fd93c', '#d6f05a'],
      neon: ['#12301a', '#1f5a2a', '#35b43e', '#8fd93c', '#d6f05a'],
      bloom: ['#f2e34a', '#f4f4ef', '#d92f2b', '#a894ff', '#7ed321'],
    },
    moss: ['#8fd93c', '#1f5a2a'],
  },
};

export function isTrashStyle(s: unknown): s is TrashStyle {
  return typeof s === 'string' && s in STYLES;
}

/** Zeilen einer Welt im Müll-Atlas (Index je Material) plus Stil-Eigenschaften. */
export interface TrashWorldRows {
  rows: Record<TrashMaterialName, number>;
  snow: boolean;
  /** Moosfarben als exakte Palettenfarben: Zeile + Stufe (Licht, Schatten). */
  mossRow: number;
}

/**
 * Eigener kleiner Atlas für den Müll (die Planetenzeilen bleiben unberührt): je Welt mit Müll acht Materialzeilen
 * (Tinte der Welt + fünf Lichtstufen) und eine Moos-Zeile.
 */
export class TrashPalette {
  readonly atlas = new PaletteAtlas();
  private readonly byWorld = new Map<number, TrashWorldRows>();

  /** Zeilen für Welt `world` mit Tinte `ink` im Stil `style` (einmal je Welt). */
  add(world: number, ink: string, style: TrashStyle): TrashWorldRows {
    const existing = this.byWorld.get(world);
    if (existing) return existing;
    const s = STYLES[style];
    const rows = {} as Record<TrashMaterialName, number>;
    for (const m of TRASH_MATERIALS) rows[m] = this.atlas.addRow({ name: `w${world}/${m}`, steps: [ink, ...s.ramps[m]] });
    const mossRow = this.atlas.addRow({ name: `w${world}/moss`, steps: [ink, s.moss[0], s.moss[1]] });
    const out: TrashWorldRows = { rows, snow: s.snow === true, mossRow };
    this.byWorld.set(world, out);
    return out;
  }

  get(world: number): TrashWorldRows | undefined {
    return this.byWorld.get(world);
  }

  dispose(): void {
    this.atlas.dispose();
  }
}
