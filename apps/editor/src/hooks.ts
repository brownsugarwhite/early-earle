import { useEffect } from 'react';
import { ansichtUnterMausZuruecksetzen, gewaehltePunkteLoeschen, gewaehltePunkteVerschieben, maximiereUnterMaus, neuesWesen, speichern } from './aktionen';
import { kantenKnotenLoeschen } from './kanten/KantenEbene';
import { spantLoeschen } from './spanten/SpantEbene';
import { rundSpantLoeschen } from './rund/RundSpantEbene';
import { setzeLayoutZiel } from './layout/animation';
import { berechneLayout } from './layout/layout';
import { editorApi } from './library/speicher';
import { useEditor } from './state/editorStore';
import { reifenNeuAmZeiger } from './kern/reifen';
import { STUFEN } from './stamm/stufen';
import { useUi } from './state/uiStore';

/** Fenstergröße + Maximieren → Ziel-Layout (animiert, bei Fenstergröße sofort). */
export function useLayoutSteuerung() {
  useEffect(() => {
    const ziel = (sofort: boolean) => {
      const { maximiert } = useUi.getState();
      setzeLayoutZiel(berechneLayout({ breite: window.innerWidth, hoehe: window.innerHeight, maximiert }), sofort);
    };
    ziel(true);
    const groesse = () => ziel(true);
    window.addEventListener('resize', groesse);
    const ab = useUi.subscribe((s, v) => {
      if (s.maximiert !== v.maximiert) ziel(false);
    });
    return () => {
      window.removeEventListener('resize', groesse);
      ab();
    };
  }, []);
}

/** Grund der Bühne (Plan 9.7) als Attribut am Dokument: CSS-Variablen für Verlauf und Kurvenfarben. */
export function useGrund() {
  useEffect(() => {
    const anwenden = (g: string) => {
      document.documentElement.dataset.grund = g;
    };
    anwenden(useUi.getState().grund);
    return useUi.subscribe((s, v) => s.grund !== v.grund && anwenden(s.grund));
  }, []);
}

const PFEILE: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

/** Regler und Haken behalten nach dem Klick den Fokus: ⌘-Kürzel (⌘Z) wirken dort trotzdem, Pfeiltasten bleiben beim Regler. */
const KEIN_TEXT = new Set(['range', 'checkbox', 'radio', 'button']);
const istRegler = (t: EventTarget | null) => t instanceof HTMLInputElement && KEIN_TEXT.has(t.type);
const istEingabe = (t: EventTarget | null) => (t instanceof HTMLInputElement && !KEIN_TEXT.has(t.type)) || t instanceof HTMLTextAreaElement;

/** Tastenkürzel (wirken auf den Viewport unter der Maus, wie in Blender). */
export function useTastatur() {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      const cmd = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') {
        if (ui.menue) ui.oeffneMenue(null);
        else if (ui.dialog) ui.oeffneDialog(null);
        else if (ui.werkzeug !== 'auswahl') ui.setzeWerkzeug('auswahl');
        else ui.auswahlLeeren();
        return;
      }
      if (istEingabe(e.target) || ui.dialog) return;
      if (istRegler(e.target) && !cmd) return;
      const k = e.key.toLowerCase();
      // Layout (Plan 9.2): Tab wechselt zwischen „Riss“ (vier Felder) und „Bühne“ (große Bühne)
      if (e.key === 'Tab' && !cmd && !e.altKey) {
        e.preventDefault();
        ui.maximieren('creation');
        return;
      }
      // Stamm (Plan 9.3): ⌘1 … ⌘9, ⌘0 springen zur Stufe (Taste der Stufe)
      if (cmd && !e.shiftKey && !e.altKey && e.key >= '0' && e.key <= '9') {
        const st = STUFEN.find((x) => String(x.taste) === e.key);
        if (st) {
          e.preventDefault();
          ui.setzeEbene(st.id);
        }
        return;
      }
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        maximiereUnterMaus();
      } else if (cmd && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) useEditor.getState().wiederholen();
        else useEditor.getState().rueckgaengig();
      } else if (cmd && k === 's') {
        e.preventDefault();
        speichern();
      } else if (cmd && k === 'n') {
        e.preventDefault();
        neuesWesen();
      } else if (cmd && k === 'l') {
        e.preventDefault();
        ui.libraryUmschalten();
      } else if (e.altKey && !cmd && e.code === 'KeyB') {
        // Pauspapier (Plan 9.8): ⌥B blendet den Bogen aus und ein
        e.preventDefault();
        const pp = ui.pauspapier;
        if (pp) ui.pauspapierAendern({ sichtbar: !pp.sichtbar });
        else ui.zeigeHinweis('Kein Bogen: PNG auf ein Blatt ziehen oder in der Tafel „Bogen hinlegen“');
      } else if (e.ctrlKey && !e.metaKey && !e.altKey && k === 'r') {
        // M3: neuer Reifen am Zeiger auf der Bühne (Blender ⌃R)
        e.preventDefault();
        if (!reifenNeuAmZeiger()) ui.zeigeHinweis('⌃R: Zeiger auf den Körper in der Bühne halten');
      } else if (!cmd && !e.altKey && (k === 'a' || k === 'v')) {
        ui.setzeWerkzeug('auswahl');
      } else if (!cmd && !e.altKey && k === 'p') {
        ui.setzeWerkzeug('stift');
      } else if (!cmd && !e.altKey && !e.shiftKey && k === 's') {
        // Spant-Werkzeug: Klick in Seite oder Top setzt einen Querschnitt
        ui.setzeWerkzeug('spant');
      } else if (!cmd && !e.altKey && !e.shiftKey && k === 'g') {
        // Pinsel (M3, Blender auf der Bühne): G ziehen, I aufblasen, ⇧ beim Ziehen glättet, [ ] Radius
        ui.setzeWerkzeug('ziehen');
      } else if (!cmd && !e.altKey && !e.shiftKey && k === 'i') {
        ui.setzeWerkzeug('aufblasen');
      } else if (!cmd && !e.altKey && (e.key === '[' || e.key === ']')) {
        ui.setzePinselRadius(ui.pinselRadius * (e.key === '[' ? 0.8 : 1.25));
      } else if (!cmd && !e.altKey && e.shiftKey && k === 'w') {
        // Breitenwerkzeug wie in Illustrator (⇧W): breiter = härtere Kante
        ui.setzeWerkzeug('breite');
      } else if (!cmd && !e.altKey && (e.key === '+' || e.key === '=')) {
        ui.setzeWerkzeug('plus');
      } else if (!cmd && !e.altKey && (e.key === '-' || e.key === '–')) {
        ui.setzeWerkzeug('minus');
      } else if (e.key === 'Home') {
        e.preventDefault();
        ansichtUnterMausZuruecksetzen();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (!rundSpantLoeschen() && !spantLoeschen() && !kantenKnotenLoeschen()) gewaehltePunkteLoeschen();
      } else if (!cmd && e.key.startsWith('Arrow')) {
        // Pfeiltasten verschieben die gewählten Punkte wie in Illustrator, ⇧ = zehnfach
        e.preventDefault();
        const r = PFEILE[e.key];
        if (r) gewaehltePunkteVerschieben(r[0]!, r[1]!, e.shiftKey);
      }
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, []);
}

/** App-Menü von Electron → dieselben Befehle wie die Kürzel. */
export function useMenueBruecke() {
  useEffect(() => {
    if (!editorApi) return;
    return editorApi.aufMenue((befehl) => {
      const ui = useUi.getState();
      switch (befehl) {
        case 'neu':
          return neuesWesen();
        case 'speichern':
          return speichern();
        case 'rueckgaengig':
          return useEditor.getState().rueckgaengig();
        case 'wiederholen':
          return useEditor.getState().wiederholen();
        case 'library':
          return ui.libraryUmschalten();
        case 'maximieren':
          return maximiereUnterMaus();
        case 'ansicht-zuruecksetzen':
          return ansichtUnterMausZuruecksetzen();
        case 'werkzeug-auswahl':
          return ui.setzeWerkzeug('auswahl');
        case 'werkzeug-stift':
          return ui.setzeWerkzeug('stift');
        case 'werkzeug-plus':
          return ui.setzeWerkzeug('plus');
        case 'werkzeug-minus':
          return ui.setzeWerkzeug('minus');
        case 'werkzeug-breite':
          return ui.setzeWerkzeug('breite');
      }
    });
  }, []);
}

/** Ungespeicherte Änderungen im Fenstertitel zeigen (macOS-Konvention: Punkt im Schließknopf). */
export function useTitel() {
  useEffect(() => {
    const setze = () => {
      const { dok, geaendert } = useEditor.getState();
      document.title = `${geaendert ? '• ' : ''}${dok.name} – early earle Editor`;
    };
    setze();
    return useEditor.subscribe(setze);
  }, []);
}
