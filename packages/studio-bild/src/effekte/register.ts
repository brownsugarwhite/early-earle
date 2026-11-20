// Registerliste der Effektarten im Renderer (Bauplan 2.2, 4.5, 4.6). Zusammenbau-Datei: Nur die Integration trägt hier Arten ein,
// nach M1 Welle A die fünf Effekte von M1 (verschmelzen, dicke, kanten, verdecken, weissNachgeben), nach M6 und M10 die weiteren. Eine
// neue Art ist eine eigene Datei unter effekte/ und eine Zeile in EFFEKT_ZEICHNUNGEN. Schema, Version und `aufGezeichnet` einer Art
// stehen im Register der Arten des Formats (@ee/studio-format/arten/register.ts, Familie 'effekt'); hier steht nur, wie der Renderer
// sie zeichnet. M0 legt die Liste leer an und den Typ fest, gegen den M1.4 die Effektdateien und die Übersetzung baut.
//
// Eine Effektart gibt nur GLSL-Text: Der Zeichner übersetzt seine Shader nur bei einer Strukturänderung neu (4.6), und was sich je
// Bild ändert (Stärke, Weichheit), kommt als Uniform aus Reglern. Welche Einhängestellen ein Shader hat und welche Namen dort gelten,
// legt die Übersetzung fest (uebersetzen.ts, M1.4); der Typ hält nur die Form des Beitrags fest.
import type { ZeichenModell } from '@ee/studio-laufzeit/vertrag/zeichenmodell';
import type { ShaderQuellen } from '../zeichner';

/** die drei Shader des Zeichners (`shaderUebersetzen`): 'strecken', 'felder', 'bild' */
export type ShaderStufe = keyof ShaderQuellen;
/** ein Effekt im Zeichenmodell: Art, Wo (Teile), Uniforms von Stärke und Weichheit, Profil, Daten der Art */
export type ModellEffekt = ZeichenModell['effekte'][number];

/** GLSL, das ein Effekt zu einem Shader beiträgt */
export interface ShaderBeitrag {
  /** auf oberster Ebene: Konstanten, Funktionen, eigene Uniforms; gleicher Text mehrerer Effekte steht nur einmal im Shader */
  readonly oben?: string;
  /** im Rumpf, je Einhängestelle des Shaders (Namen aus der Übersetzung); mehrere Effekte in der Folge von ZeichenModell.effekte */
  readonly stellen?: Readonly<Record<string, string>>;
}

/** wie der Renderer eine Effektart zeichnet */
export interface EffektZeichnung {
  /** Name der Art wie im Register der Arten (Schlüssel 'effekt:<art>') */
  readonly art: string;
  /**
   * was ein Effekt dieser Art zu den Shadern beiträgt, je Shader höchstens ein Beitrag. Nur Text, ohne Zustand und deterministisch:
   * gleicher Effekt und gleiche Nummer ergeben denselben Text. `nr` ist seine Stelle in `ZeichenModell.effekte` und macht eigene
   * Namen eindeutig; Werte je Bild liest der Text über die Uniforms des Modells (`e.uniformStaerke`, `e.uniformWeichheit`).
   */
  shader(e: ModellEffekt, nr: number): Readonly<Partial<Record<ShaderStufe, ShaderBeitrag>>>;
}

/** Registerliste: je Effektart ihre Zeichnung */
export const EFFEKT_ZEICHNUNGEN: readonly EffektZeichnung[] = [];

const register = new Map<string, EffektZeichnung>();

/**
 * trägt eine Effektart ein (auch zur Laufzeit, etwa im Erweiterungstest, Befund 28). Dieselbe Art zweimal ist ein Fehler, außer es
 * ist derselbe Eintrag (wie `artEintragen` im Format).
 */
export function effektZeichnungEintragen(z: EffektZeichnung): void {
  const da = register.get(z.art);
  if (da !== undefined && da !== z) throw new RangeError(`effektZeichnungEintragen: ${JSON.stringify(z.art)} ist schon eingetragen`);
  register.set(z.art, z);
}

/** Zeichnung einer Effektart; undefined, wenn keine eingetragen ist */
export function effektZeichnungVon(art: string): EffektZeichnung | undefined {
  return register.get(art);
}

for (const z of EFFEKT_ZEICHNUNGEN) effektZeichnungEintragen(z);
