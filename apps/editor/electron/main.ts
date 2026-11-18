// Hauptprozess des Wesen-Editors: ein Fenster, App-Menü, Bibliothek auf der Platte.
// Tastenkürzel verarbeitet der Renderer selbst (auch im Web-Modus); das Menü zeigt sie nur an.

import { BrowserWindow, Menu, type MenuItemConstructorOptions, app, ipcMain, nativeTheme, screen, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BibliothekEintrag, MenueBefehl, SpeicherAuftrag } from '../src/library/api';

const hier = path.dirname(fileURLToPath(import.meta.url));
// EDITOR_BIBLIOTHEK: anderer Ordner (Tests). EDITOR_SELBSTTEST=<datei.png>: Fenster laden, Bibliothek
// prüfen, Bildschirmfoto schreiben, Ergebnis ausgeben und beenden (Rauchtest der Desktop-App).
const BIBLIOTHEK = process.env.EDITOR_BIBLIOTHEK ?? path.join(app.getPath('documents'), 'early earle Editor', 'Bibliothek');
const SELBSTTEST = process.env.EDITOR_SELBSTTEST;

let fenster: BrowserWindow | null = null;

function sende(befehl: MenueBefehl) {
  fenster?.webContents.send('menue', befehl);
}

function erzeugeFenster() {
  nativeTheme.themeSource = 'dark';
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  fenster = new BrowserWindow({
    width: Math.min(1728, width),
    height: Math.min(1161, height),
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#19232b',
    title: 'early earle Editor',
    show: false,
    webPreferences: {
      preload: path.join(hier, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  fenster.once('ready-to-show', () => fenster?.show());
  fenster.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  if (SELBSTTEST) {
    fenster.webContents.once('did-finish-load', () => void selbsttest(SELBSTTEST));
  }
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void fenster.loadURL(devUrl);
  else void fenster.loadFile(path.join(hier, '../dist/index.html'));
  fenster.on('closed', () => {
    fenster = null;
  });
}

function menue() {
  const eintrag = (label: string, befehl: MenueBefehl, accelerator?: string): MenuItemConstructorOptions => ({
    label,
    click: () => sende(befehl),
    ...(accelerator ? { accelerator, registerAccelerator: false } : {}),
  });
  const vorlage: MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    {
      label: 'Ablage',
      submenu: [
        eintrag('Neues Wesen', 'neu', 'CmdOrCtrl+N'),
        eintrag('Speichern', 'speichern', 'CmdOrCtrl+S'),
        { type: 'separator' },
        { label: 'Bibliothek im Finder zeigen', click: () => void zeigeBibliothek() },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Bearbeiten',
      submenu: [
        eintrag('Rückgängig', 'rueckgaengig', 'CmdOrCtrl+Z'),
        eintrag('Wiederholen', 'wiederholen', 'Shift+CmdOrCtrl+Z'),
        { type: 'separator' },
        eintrag('Direktauswahl', 'werkzeug-auswahl', 'A'),
        eintrag('Zeichenstift', 'werkzeug-stift', 'P'),
        eintrag('Ankerpunkt hinzufügen', 'werkzeug-plus', 'Plus'),
        eintrag('Ankerpunkt löschen', 'werkzeug-minus', '-'),
        eintrag('Breitenwerkzeug (Kantenhärte)', 'werkzeug-breite', 'Shift+W'),
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einsetzen' },
        { role: 'selectAll', label: 'Alles auswählen' },
      ],
    },
    {
      label: 'Darstellung',
      submenu: [
        eintrag('Library ein/aus', 'library', 'CmdOrCtrl+L'),
        eintrag('Viewport maximieren', 'maximieren', 'Ctrl+Space'),
        eintrag('Ansicht zurücksetzen', 'ansicht-zuruecksetzen', 'Home'),
        { type: 'separator' },
        // ⌘R gehört dem Editor (Reifen bzw. Loop wie Blender ⌃R); neu laden nur noch mit ⇧⌘R (Plan 20.10., V0)
        { role: 'reload', label: 'Neu laden', accelerator: 'Shift+CmdOrCtrl+R' },
        { role: 'toggleDevTools', label: 'Entwicklerwerkzeuge' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
      ],
    },
    { role: 'windowMenu', label: 'Fenster' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(vorlage));
}

async function selbsttest(datei: string) {
  const f = fenster;
  if (!f) return;
  await new Promise((ok) => setTimeout(ok, 3000));
  const ergebnis: unknown = await f.webContents.executeJavaScript(`(async () => {
    const api = window.editorApi;
    const gespeichert = await api.bibliothekSpeichern({ datei: null, name: 'Selbsttest', json: '{"name":"Selbsttest"}', vorschau: null });
    const liste = await api.bibliothekListe();
    return { backend: window.__editor && window.__editor.backend, vertices: window.__editor && window.__editor.vertices(), gespeichert, liste: liste.map((e) => e.datei) };
  })()`);
  const bild = await f.webContents.capturePage();
  await fs.writeFile(datei, bild.toPNG());
  console.log(`[selbsttest] ${JSON.stringify(ergebnis)}`);
  app.quit();
}

// ---------- Bibliothek ----------

const ERLAUBT = /^[a-z0-9äöüß-]+$/;

function sicher(datei: string): string {
  if (!ERLAUBT.test(datei)) throw new Error(`Ungültiger Dateiname: ${datei}`);
  return datei;
}

function slug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'wesen';
}

async function freierName(basis: string): Promise<string> {
  for (let i = 1; ; i++) {
    const kandidat = i === 1 ? basis : `${basis}-${i}`;
    try {
      await fs.access(path.join(BIBLIOTHEK, `${kandidat}.json`));
    } catch {
      return kandidat;
    }
  }
}

async function liste(): Promise<BibliothekEintrag[]> {
  await fs.mkdir(BIBLIOTHEK, { recursive: true });
  const dateien = (await fs.readdir(BIBLIOTHEK)).filter((d) => d.endsWith('.json'));
  const eintraege = await Promise.all(
    dateien.map(async (d): Promise<BibliothekEintrag | null> => {
      const datei = d.slice(0, -5);
      try {
        const voll = path.join(BIBLIOTHEK, d);
        const [text, stat] = await Promise.all([fs.readFile(voll, 'utf8'), fs.stat(voll)]);
        const name = (JSON.parse(text) as { name?: unknown }).name;
        let vorschau: string | null = null;
        try {
          vorschau = `data:image/png;base64,${(await fs.readFile(path.join(BIBLIOTHEK, `${datei}.png`))).toString('base64')}`;
        } catch {
          vorschau = null;
        }
        return { datei, name: typeof name === 'string' ? name : datei, vorschau, geaendert: stat.mtimeMs };
      } catch {
        return null;
      }
    }),
  );
  return eintraege.filter((e): e is BibliothekEintrag => e !== null).sort((a, b) => b.geaendert - a.geaendert);
}

async function speichern(a: SpeicherAuftrag): Promise<{ datei: string }> {
  await fs.mkdir(BIBLIOTHEK, { recursive: true });
  const datei = a.datei ? sicher(a.datei) : await freierName(slug(a.name));
  await fs.writeFile(path.join(BIBLIOTHEK, `${datei}.json`), a.json, 'utf8');
  if (a.vorschau?.startsWith('data:image/png;base64,')) {
    await fs.writeFile(path.join(BIBLIOTHEK, `${datei}.png`), Buffer.from(a.vorschau.slice(22), 'base64'));
  }
  return { datei };
}

async function zeigeBibliothek() {
  await fs.mkdir(BIBLIOTHEK, { recursive: true });
  await shell.openPath(BIBLIOTHEK);
}

ipcMain.handle('bibliothek:liste', () => liste());
ipcMain.handle('bibliothek:speichern', (_e, a: SpeicherAuftrag) => speichern(a));
ipcMain.handle('bibliothek:laden', (_e, datei: string) => fs.readFile(path.join(BIBLIOTHEK, `${sicher(datei)}.json`), 'utf8'));
ipcMain.handle('bibliothek:zeigen', () => zeigeBibliothek());

void app.whenReady().then(() => {
  menue();
  erzeugeFenster();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) erzeugeFenster();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
