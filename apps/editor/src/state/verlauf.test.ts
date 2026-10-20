// B7 (Plan Teil B, Entwurf Posen §5): Undo und Redo stellen das Dokument her und wechseln dorthin, wo der Schritt geschah,
// mit einem Hinweis „↶ Fressen: Form“. Gesten gehören zum Ziel beim Gestenbeginn.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '@ee/shape';
import { schrittName, setzeGesteEndeHaken, useEditor } from './editorStore';
import { useUi } from './uiStore';

const ed = () => useEditor.getState();
const form = (id: string) => ed().dok.posen.find((p) => p.id === id)?.form.length ?? -1;
const hinweis = () => useUi.getState().hinweis?.text ?? null;

describe('B7: Undo mit Zielwechsel', () => {
  it('Schritt in Fressen, Undo und Redo aus dem Editor-Tab wechseln nach Fressen', () => {
    ed().neu();
    ed().setzeZiel('fressen');
    ed().poseSetzen('fressen', (p) => ({ ...p, form: [{ punkt: 3, d: [0.01, 0, 0] }] }));
    expect(form('fressen')).toBe(1);
    ed().setzeZiel('editor');
    ed().rueckgaengig();
    expect(ed().modus).toBe('fressen');
    expect(form('fressen')).toBe(0);
    expect(hinweis()).toBe('↶ Fressen: Form');
    // Fressen zeigt die volle Pose (B1: Ziel setzt Öffnung und Modus in einem Zug)
    expect(useUi.getState().oeffnung).toBe(1);
    ed().setzeZiel('editor');
    ed().wiederholen();
    expect(ed().modus).toBe('fressen');
    expect(form('fressen')).toBe(1);
    expect(hinweis()).toBe('↷ Fressen: Form');
  });

  it('Grundform-Schritt, Undo aus einer Pose wechselt in den Editor-Tab', () => {
    ed().neu();
    ed().setzeName('Testwesen');
    ed().setzeZiel('idle');
    ed().rueckgaengig();
    expect(ed().modus).toBe('editor');
    expect(ed().dok.name).not.toBe('Testwesen');
    expect(hinweis()).toBe('↶ Editor: Name');
    expect(useUi.getState().oeffnung).toBe(0);
  });

  it('Undo einer neuen Pose, deren Tab offen ist: zurück in den Editor-Tab', () => {
    ed().neu();
    ed().poseHinzu('p_test', 'Pose 3');
    expect(ed().modus).toBe('p_test');
    ed().rueckgaengig();
    expect(ed().dok.posen.some((p) => p.id === 'p_test')).toBe(false);
    expect(ed().modus).toBe('editor');
    expect(hinweis()).toBe('↶ Editor: Pose „Pose 3“ neu');
  });

  it('Pose gelöscht: Undo bringt sie zurück und wechselt in sie', () => {
    ed().neu();
    ed().poseHinzu('p_weg', 'Weg');
    ed().poseEntfernen('p_weg');
    expect(ed().modus).toBe('editor');
    expect(ed().dok.posen.some((p) => p.id === 'p_weg')).toBe(false);
    ed().rueckgaengig();
    expect(ed().dok.posen.some((p) => p.id === 'p_weg')).toBe(true);
    expect(ed().modus).toBe('p_weg');
    expect(hinweis()).toBe('↶ Weg: Pose „Weg“ gelöscht');
  });

  it('Vorschau endet beim Bearbeiten und beim Zielwechsel', () => {
    ed().neu();
    useUi.getState().setzeVorschau({ fressen: 0.4, idle: 0.2 });
    expect(useUi.getState().vorschau).toEqual({ fressen: 0.4, idle: 0.2 });
    ed().setzeName('anders');
    expect(useUi.getState().vorschau).toBeNull();
    useUi.getState().setzeVorschau({ fressen: 0.4 });
    ed().setzeZiel('idle');
    expect(useUi.getState().vorschau).toBeNull();
    expect(useUi.getState().poseStaerke).toBe(1);
    useUi.getState().setzeVorschau({ idle: 0.5 });
    ed().beginGeste();
    expect(useUi.getState().vorschau).toBeNull();
    ed().endeGeste();
  });

  it('Geste: der Schritt gehört zum Ziel beim Gestenbeginn', () => {
    ed().neu();
    ed().setzeZiel('idle');
    ed().beginGeste();
    ed().poseSetzen('idle', (p) => ({ ...p, form: [{ punkt: 5, d: [0, 0.02, 0] }] }));
    ed().poseSetzen('idle', (p) => ({ ...p, form: [{ punkt: 5, d: [0, 0.03, 0] }] }));
    ed().endeGeste();
    expect(ed().verlauf.length).toBe(1);
    expect(ed().verlauf[0]!.ziel).toBe('idle');
    ed().setzeZiel('fressen');
    ed().rueckgaengig();
    expect(ed().modus).toBe('idle');
    expect(form('idle')).toBe(0);
    expect(hinweis()).toBe('↶ Idle: Form');
  });

  it('Geste ohne Wirkung (gleicher Inhalt, neue Objekte) schreibt keinen Undo-Schritt', () => {
    ed().neu();
    ed().setzeZiel('idle');
    const vorher = ed().dok;
    ed().beginGeste();
    ed().poseSetzen('idle', (p) => ({ ...p, form: [{ punkt: 4, d: [0, 0.01, 0] }] }));
    ed().poseSetzen('idle', (p) => ({ ...p, form: [] }));
    ed().endeGeste();
    expect(ed().verlauf.length).toBe(0);
    expect(ed().dok).toBe(vorher);
  });

  it('Name eines Schritts: andere Pose mit Namen davor, Knochen, Grundform', () => {
    const a = neuesDokument();
    const b = { ...a, posen: a.posen.map((p) => (p.id === 'idle' ? { ...p, stellung: { kiefer: { winkel: 10 } } } : p)) };
    expect(schrittName(a, b, 'idle')).toBe('Knochen');
    expect(schrittName(a, b, 'editor')).toBe('Idle · Knochen');
    expect(schrittName(a, { ...a, skalierung: a.skalierung * 1.1 }, 'editor')).toBe('Größe');
    expect(schrittName(a, { ...a, kaefig: { deltas: [{ punkt: 1, d: [0, 0, 0.01] }] } }, 'editor')).toBe('Pinsel');
  });
});

describe('V3: Geste abbrechen (Esc, Rechtsklick, ⌘Z während G/S/R)', () => {
  it('stellt das Dokument des Gestenbeginns her, ohne Verlaufseintrag und mit dem alten „geändert“', () => {
    ed().neu();
    const vorher = ed().dok;
    const json = JSON.stringify(vorher);
    ed().beginGeste();
    ed().setzeName('Zwischenstand');
    ed().setzeSkalierung(1.5);
    expect(ed().geaendert).toBe(true);
    ed().abbrechenGeste();
    expect(ed().dok).toBe(vorher);
    expect(JSON.stringify(ed().dok)).toBe(json);
    expect(ed().verlauf.length).toBe(0);
    expect(ed().zukunft.length).toBe(0);
    expect(ed().gesteStart).toBeNull();
    expect(ed().geaendert).toBe(false);
  });

  it('der Haken am Gestenende („Formen folgen“) läuft nicht, die nächste Geste ist ein eigener Schritt', () => {
    ed().neu();
    ed().setzeName('Erster Schritt');
    const nach1 = ed().dok;
    let haken = 0;
    setzeGesteEndeHaken(() => {
      haken++;
      return false;
    });
    try {
      ed().beginGeste();
      const nr = ed().gesteNr;
      ed().setzeSkalierung(2);
      ed().abbrechenGeste();
      expect(haken).toBe(0);
      expect(ed().dok).toBe(nach1);
      expect(ed().verlauf.length).toBe(1);
      expect(ed().geaendert).toBe(true);
      ed().beginGeste();
      expect(ed().gesteNr).toBe(nr + 1);
      ed().setzeSkalierung(0.5);
      ed().endeGeste();
      expect(haken).toBe(1);
      expect(ed().verlauf.length).toBe(2);
      ed().rueckgaengig();
      expect(ed().dok).toBe(nach1);
    } finally {
      setzeGesteEndeHaken(null);
    }
  });

  it('ohne laufende Geste tut Abbrechen nichts', () => {
    ed().neu();
    ed().setzeName('bleibt');
    const d = ed().dok;
    ed().abbrechenGeste();
    expect(ed().dok).toBe(d);
    expect(ed().verlauf.length).toBe(1);
  });
});
