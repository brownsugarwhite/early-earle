// B7 (Plan Teil B, Entwurf Posen §6): Überblenden „von → nach“ mit Schieber und Abspielen im Pingpong. Die Stelle t wird
// zur Vorschau w_von = 1 − t, w_nach = t (Grundform = keine Gewichte, Festlegung 11: standardmäßig von Idle aus). Abspielen
// endet, sobald jemand die Vorschau beendet oder ändert (Bearbeiten, Greifen, Esc, Ziel- oder Stufenwechsel).
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

/** Gewichte der Überblendung bei t (Grundform 'editor' trägt kein Gewicht). */
export function ueberblendenGewichte(von: string, nach: string, t: number): Record<string, number> {
  const g: Record<string, number> = {};
  const add = (id: string, w: number) => {
    if (id === 'editor' || w <= 0) return;
    g[id] = (g[id] ?? 0) + w;
  };
  add(von, 1 - t);
  add(nach, t);
  return g;
}

/** Gibt es das Ziel (Grundform oder Pose) im Dokument? */
const da = (id: string) => id === 'editor' || useEditor.getState().dok.posen.some((p) => p.id === id);

/** Von und nach, wie sie gelten (fehlt eine Pose, Idle bzw. Fressen bzw. Grundform). */
export function ueberblendenPaar(): { von: string; nach: string } {
  const u = useUi.getState().ueberblenden;
  const von = da(u.von) ? u.von : da('idle') ? 'idle' : 'editor';
  const nach = da(u.nach) ? u.nach : da('fressen') ? 'fressen' : 'editor';
  return { von, nach };
}

/** zuletzt vom Überblenden gesetzte Vorschau (daran erkennt das Abspielen, ob jemand anders sie geändert hat) */
let gesetzt: Record<string, number> | null = null;
let rahmen = 0;

/** Stelle t setzen: Vorschau aus der Überblendung. */
export function ueberblendenSetzen(t: number): void {
  const ui = useUi.getState();
  const tt = Math.min(1, Math.max(0, t));
  const { von, nach } = ueberblendenPaar();
  ui.setzeUeberblenden({ t: tt });
  ui.setzeVorschau(ueberblendenGewichte(von, nach, tt));
  gesetzt = useUi.getState().vorschau;
}

/** Abspielen anhalten (die Vorschau bleibt bei der erreichten Stelle). */
export function anhalten(): void {
  if (rahmen) cancelAnimationFrame(rahmen);
  rahmen = 0;
  if (useUi.getState().ueberblenden.spielt) useUi.getState().setzeUeberblenden({ spielt: false });
}

/** Abspielen im Pingpong ab der aktuellen Stelle (aufwärts); Dauer = ein Durchlauf von → nach. */
export function abspielen(): void {
  anhalten();
  const ui = useUi.getState();
  ui.setzeUeberblenden({ spielt: true });
  let phase = ui.ueberblenden.t;
  let zuletzt = performance.now();
  ueberblendenSetzen(phase);
  const schritt = (jetzt: number) => {
    const s = useUi.getState();
    // jemand hat die Vorschau beendet oder geändert (Bearbeiten, Greifen, Esc, Ziel- oder Stufenwechsel): anhalten
    if (!s.ueberblenden.spielt || s.vorschau !== gesetzt) return anhalten();
    const dt = (jetzt - zuletzt) / 1000;
    zuletzt = jetzt;
    phase = (phase + dt / Math.max(0.1, s.ueberblenden.dauer)) % 2;
    ueberblendenSetzen(phase <= 1 ? phase : 2 - phase);
    rahmen = requestAnimationFrame(schritt);
  };
  rahmen = requestAnimationFrame(schritt);
}

/** ⇧Leertaste und ▶: abspielen bzw. anhalten. */
export function abspielenUmschalten(): void {
  if (useUi.getState().ueberblenden.spielt) anhalten();
  else abspielen();
}
