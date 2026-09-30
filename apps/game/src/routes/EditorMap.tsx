import { MapEditor } from '../editor/map/MapEditor';
import '../styles/editor.css';

/**
 * `/editor/map` — Map-Editor: Zonen (`content/zones/*.json`) und die zehn Earle-Welten (`content/zones/worlds/`),
 * Farben, Werte, Texte und JSON; speichert auf dem Mac oder lokal (siehe docs/IOS.md, Werkstatt).
 */
export function EditorMap() {
  return <MapEditor />;
}
