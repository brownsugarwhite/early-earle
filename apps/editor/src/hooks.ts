import { useEffect } from 'react';
import { ansichtUnterMausZuruecksetzen, gewaehltePunkteLoeschen, gewaehltePunkteVerschieben, maximiereUnterMaus, neuesWesen, speichern } from './aktionen';
import { kantenKnotenLoeschen } from './kanten/KantenEbene';
import { setzeLayoutZiel } from './layout/animation';
import { berechneLayout } from './layout/layout';
import { editorApi } from './library/speicher';
import { useEditor } from './state/editorStore';
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
      } else if (!cmd && !e.altKey && (k === 'a' || k === 'v')) {
        ui.setzeWerkzeug('auswahl');
      } else if (!cmd && !e.altKey && k === 'p') {
        ui.setzeWerkzeug('stift');
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
        if (!kantenKnotenLoeschen()) gewaehltePunkteLoeschen();
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
