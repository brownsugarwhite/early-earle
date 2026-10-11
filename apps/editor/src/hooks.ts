import { useEffect } from 'react';
import { ansichtUnterMausZuruecksetzen, gewaehltenPunktLoeschen, maximiereUnterMaus, neuesWesen, speichern } from './aktionen';
import { setzeLayoutZiel } from './layout/animation';
import { berechneLayout } from './layout/layout';
import { editorApi } from './library/speicher';
import { useEditor } from './state/editorStore';
import { useUi } from './state/uiStore';

/** Fenstergröße + Maximieren + Library → Ziel-Layout (animiert, bei Fenstergröße sofort). */
export function useLayoutSteuerung() {
  useEffect(() => {
    const ziel = (sofort: boolean) => {
      const { maximiert, library } = useUi.getState();
      setzeLayoutZiel(berechneLayout({ breite: window.innerWidth, hoehe: window.innerHeight, maximiert, library }), sofort);
    };
    ziel(true);
    const groesse = () => ziel(true);
    window.addEventListener('resize', groesse);
    const ab = useUi.subscribe((s, v) => {
      if (s.maximiert !== v.maximiert || s.library !== v.library) ziel(false);
    });
    return () => {
      window.removeEventListener('resize', groesse);
      ab();
    };
  }, []);
}

const istEingabe = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

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
      } else if (!cmd && !e.altKey && (e.key === '+' || e.key === '=')) {
        ui.setzeWerkzeug('plus');
      } else if (!cmd && !e.altKey && (e.key === '-' || e.key === '–')) {
        ui.setzeWerkzeug('minus');
      } else if (e.key === 'Home') {
        e.preventDefault();
        ansichtUnterMausZuruecksetzen();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        gewaehltenPunktLoeschen();
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
