import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { EditorApi, MenueBefehl, SpeicherAuftrag } from '../src/library/api';

const api: EditorApi = {
  bibliothekListe: () => ipcRenderer.invoke('bibliothek:liste'),
  bibliothekSpeichern: (auftrag: SpeicherAuftrag) => ipcRenderer.invoke('bibliothek:speichern', auftrag),
  bibliothekLaden: (datei: string) => ipcRenderer.invoke('bibliothek:laden', datei),
  bibliothekZeigen: () => ipcRenderer.invoke('bibliothek:zeigen'),
  aufMenue(fn) {
    const h = (_e: IpcRendererEvent, befehl: MenueBefehl) => fn(befehl);
    ipcRenderer.on('menue', h);
    return () => ipcRenderer.off('menue', h);
  },
};

contextBridge.exposeInMainWorld('editorApi', api);
