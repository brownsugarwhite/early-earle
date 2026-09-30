import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { IS_NATIVE } from './target';

export type ShareOutcome = 'geteilt' | 'abgebrochen' | 'heruntergeladen' | 'fehler';

/** Pretty JSON exactly like the dev endpoint writes non-level files (2 spaces, trailing newline). */
export function jsonText(json: unknown): string {
  return JSON.stringify(json, null, 2) + '\n';
}

function isCancel(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (e instanceof DOMException && e.name === 'AbortError') || /cancel|abgebrochen/i.test(msg);
}

/**
 * Hands a JSON file to the system: the iOS share sheet in the app (written to the cache folder first — AirDrop to
 * the Mac, Files, Mail …), the Web Share API where it can share files (Safari on the iPhone), else a download.
 */
export async function shareJson(filename: string, json: unknown, title?: string): Promise<ShareOutcome> {
  const text = typeof json === 'string' ? json : jsonText(json);
  if (IS_NATIVE) {
    try {
      const { uri } = await Filesystem.writeFile({ path: `export/${filename}`, data: text, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
      await Share.share({ title: title ?? filename, files: [uri] });
      return 'geteilt';
    } catch (e) {
      return isCancel(e) ? 'abgebrochen' : 'fehler';
    }
  }
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function') {
    try {
      const file = new File([text], filename, { type: 'application/json' });
      if (nav.canShare?.({ files: [file] })) await nav.share({ files: [file], title: title ?? filename });
      else await nav.share({ title: title ?? filename, text });
      return 'geteilt';
    } catch (e) {
      if (isCancel(e)) return 'abgebrochen';
      // fall through to the download
    }
  }
  return downloadJson(filename, text) ? 'heruntergeladen' : 'fehler';
}

/** Browser download of a JSON file (not available in the iOS app's web view — use shareJson there). */
export function downloadJson(filename: string, json: unknown): boolean {
  try {
    const text = typeof json === 'string' ? json : jsonText(json);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}

/** German one-liner for a share outcome (toasts). */
export function shareMessage(outcome: ShareOutcome, filename: string): string {
  switch (outcome) {
    case 'geteilt':
      return `Geteilt: ${filename}`;
    case 'heruntergeladen':
      return `Heruntergeladen: ${filename}`;
    case 'abgebrochen':
      return 'Teilen abgebrochen';
    default:
      return 'Teilen ging schief';
  }
}
