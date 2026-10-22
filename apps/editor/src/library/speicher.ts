// Bibliothek: in Electron Dateien unter ~/Documents/early earle Editor/Bibliothek (über window.editorApi),
// im Web-Modus der localStorage (nur zum Prüfen; kein dauerhafter Speicher).

import { create } from 'zustand';
import type { BibliothekEintrag, EditorApi, SpeicherAuftrag } from './api';

declare global {
  interface Window {
    editorApi?: EditorApi;
  }
}

export const editorApi: EditorApi | null = typeof window !== 'undefined' ? (window.editorApi ?? null) : null;

const SCHLUESSEL = 'ee-editor-bibliothek';
type WebEintrag = { name: string; json: string; vorschau: string | null; geaendert: number };

function webLesen(): Record<string, WebEintrag> {
  try {
    return JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '{}') as Record<string, WebEintrag>;
  } catch {
    return {};
  }
}

function webSchreiben(d: Record<string, WebEintrag>) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(d));
  } catch {
    // voller oder gesperrter Speicher: im Web-Modus nur ein Prüfweg, Fehler wird oben gemeldet
    throw new Error('Speichern im Browser nicht möglich');
  }
}

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'wesen'
  );
}

export async function bibliothekListe(): Promise<BibliothekEintrag[]> {
  if (editorApi) return editorApi.bibliothekListe();
  return Object.entries(webLesen())
    .map(([datei, e]) => ({ datei, name: e.name, vorschau: e.vorschau, geaendert: e.geaendert }))
    .sort((a, b) => b.geaendert - a.geaendert);
}

export async function bibliothekSpeichern(a: SpeicherAuftrag): Promise<{ datei: string }> {
  if (editorApi) return editorApi.bibliothekSpeichern(a);
  const d = webLesen();
  let datei = a.datei;
  if (!datei) {
    const basis = slug(a.name);
    datei = basis;
    for (let i = 2; d[datei]; i++) datei = `${basis}-${i}`;
  }
  d[datei] = { name: a.name, json: a.json, vorschau: a.vorschau, geaendert: Date.now() };
  webSchreiben(d);
  return { datei };
}

export async function bibliothekLaden(datei: string): Promise<string> {
  if (editorApi) return editorApi.bibliothekLaden(datei);
  const e = webLesen()[datei];
  if (!e) throw new Error(`Nicht gefunden: ${datei}`);
  return e.json;
}

export const useBibliothek = create<{ eintraege: BibliothekEintrag[]; geladen: boolean; neuLaden(): Promise<void> }>((set) => ({
  eintraege: [],
  geladen: false,
  async neuLaden() {
    set({ eintraege: await bibliothekListe(), geladen: true });
  },
}));
