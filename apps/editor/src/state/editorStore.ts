// Dokument-Zustand mit Rückgängig/Wiederholen. Ein Zieh-Vorgang ist ein Schritt (Geste wie in der
// alten Werkstatt: beginGeste … endeGeste), Einzelaktionen sind je ein Schritt.

import { type Ansicht, type Dokument, type PoseName, type Profil, SKALIERUNG_MAX, SKALIERUNG_MIN, neuesDokument } from '@ee/shape';
import { create } from 'zustand';

export type Modus = 'editor' | 'fressen' | PoseName;

type EditorState = {
  dok: Dokument;
  /** Datei in der Bibliothek, null = noch nie gespeichert */
  datei: string | null;
  geaendert: boolean;
  modus: Modus;
  verlauf: Dokument[];
  zukunft: Dokument[];
  gesteStart: Dokument | null;

  beginGeste(): void;
  endeGeste(): void;
  setzeProfil(ansicht: Ansicht, profil: Profil): void;
  setzeProfile(profile: Dokument['profile']): void;
  setzeSkalierung(s: number): void;
  setzeName(name: string): void;
  rueckgaengig(): void;
  wiederholen(): void;
  neu(): void;
  laden(dok: Dokument, datei: string | null): void;
  gespeichert(datei: string): void;
  setzeModus(m: Modus): void;
  poseHinzu(p: PoseName): void;
  poseEntfernen(p: PoseName): void;
};

const MAX_VERLAUF = 200;

export const useEditor = create<EditorState>((set, get) => {
  /** Änderung am Dokument; außerhalb einer Geste wird sie sofort ein Undo-Schritt. */
  const aendern = (f: (d: Dokument) => Dokument) => {
    const { dok, gesteStart, verlauf } = get();
    const neu = f(dok);
    if (neu === dok) return;
    if (gesteStart) set({ dok: neu, geaendert: true });
    else set({ dok: neu, geaendert: true, verlauf: [...verlauf, dok].slice(-MAX_VERLAUF), zukunft: [] });
  };

  return {
    dok: neuesDokument(),
    datei: null,
    geaendert: false,
    modus: 'editor',
    verlauf: [],
    zukunft: [],
    gesteStart: null,

    beginGeste() {
      if (!get().gesteStart) set({ gesteStart: get().dok });
    },
    endeGeste() {
      const { gesteStart, dok, verlauf } = get();
      if (!gesteStart) return;
      if (gesteStart !== dok) set({ gesteStart: null, verlauf: [...verlauf, gesteStart].slice(-MAX_VERLAUF), zukunft: [] });
      else set({ gesteStart: null });
    },
    setzeProfil(ansicht, profil) {
      aendern((d) => ({ ...d, profile: { ...d.profile, [ansicht]: profil } }));
    },
    setzeProfile(profile) {
      aendern((d) => (d.profile === profile ? d : { ...d, profile }));
    },
    setzeSkalierung(s) {
      const v = Math.min(SKALIERUNG_MAX, Math.max(SKALIERUNG_MIN, s));
      aendern((d) => (d.skalierung === v ? d : { ...d, skalierung: v }));
    },
    setzeName(name) {
      aendern((d) => (d.name === name ? d : { ...d, name }));
    },
    rueckgaengig() {
      const { verlauf, zukunft, dok } = get();
      const vorher = verlauf[verlauf.length - 1];
      if (!vorher) return;
      set({ dok: vorher, verlauf: verlauf.slice(0, -1), zukunft: [dok, ...zukunft], geaendert: true, gesteStart: null });
    },
    wiederholen() {
      const { verlauf, zukunft, dok } = get();
      const nach = zukunft[0];
      if (!nach) return;
      set({ dok: nach, verlauf: [...verlauf, dok], zukunft: zukunft.slice(1), geaendert: true, gesteStart: null });
    },
    neu() {
      // Jedes neue Wesen startet als Kugel aus drei Kreisen (Florian, 11.10.2026)
      set({ dok: neuesDokument(), datei: null, geaendert: false, verlauf: [], zukunft: [], gesteStart: null, modus: 'editor' });
    },
    laden(dok, datei) {
      set({ dok, datei, geaendert: false, verlauf: [], zukunft: [], gesteStart: null, modus: 'editor' });
    },
    gespeichert(datei) {
      set({ datei, geaendert: false });
    },
    setzeModus(m) {
      set({ modus: m });
    },
    poseHinzu(p) {
      aendern((d) => (d.posen.includes(p) ? d : { ...d, posen: [...d.posen, p] }));
      set({ modus: p });
    },
    poseEntfernen(p) {
      aendern((d) => ({ ...d, posen: d.posen.filter((x) => x !== p) }));
      if (get().modus === p) set({ modus: 'editor' });
    },
  };
});
