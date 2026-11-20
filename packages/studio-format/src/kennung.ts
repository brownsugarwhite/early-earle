// Kennungen (Bauplan 3.3): `<vorsilbe>_<10 Zeichen aus 0–9, A–Z, a–z>`, fest über Umbenennen. Das Format kennt keinen globalen
// Zufall (Befund 30 a): Der Store gibt Zufallszahlen herein (`kennungAusZahlen`); Übernahme und Inhalt-Skripte machen Kennungen stabil
// aus einem Pfad (`kennungAusPfad`), damit ein zweiter Lauf dieselben Kennungen erzeugt und Diffs klein bleiben.
import { sha256 } from '@ee/studio-rechnen/sha256';
import type { Id, Vorsilbe } from './typen/grund';

/** Name des Datensatztyps je Vorsilbe (für Meldungen); der Typ erzwingt, dass jede Vorsilbe genau einmal vorkommt */
const NAMEN: { readonly [V in Vorsilbe]: string } = {
  prj: 'Projekt', vl: 'Vorlage', kl: 'Klang', sf: 'Schrift',
  fig: 'Figur', teil: 'Teil', an: 'Anker', gr: 'Gruppe',
  rg: 'Regler', bd: 'Bindung', sl: 'Schlüssel', we: 'Wechsel',
  kn: 'Knochen', af: 'Aufhängung', km: 'Körpermodell',
  sch: 'Schicht', po: 'Pose', ue: 'Übergang', zy: 'Zyklus',
  ch: 'Physik-Chip', vb: 'Verbindung', ef: 'Effekt', kc: 'Klang-Chip',
  welt: 'Welt', sz: 'Szene', di: 'Ding',
  bs: 'Baustein', dr: 'Draht', re: 'Regel', au: 'Aufgabe',
};

/** alle Vorsilben in der Reihenfolge von 3.2 */
export const VORSILBEN: readonly Vorsilbe[] = Object.keys(NAMEN) as Vorsilbe[];
/** Ziffern der Kennungen in Codepunkt-Reihenfolge: 0–9, A–Z, a–z (Basis 62) */
export const KENNUNG_ZEICHEN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** Zeichen nach dem Unterstrich */
export const KENNUNG_LAENGE = 10;
/** Form jeder Kennung (3.3); die Vorsilbe prüft `istKennung` dazu gegen die Liste */
export const KENNUNG_MUSTER = /^[a-z]{2,4}_[0-9A-Za-z]{10}$/;
/** so viele Zufallszahlen gibt der Store je Kennung herein: 10 reichen fast immer; mit 16 fehlen welche mit einer Wahrscheinlichkeit
 *  unter 1e-58 (dann wirft `kennungAusZahlen`) */
export const KENNUNG_ZAHLEN = 16;
/** größtes Vielfaches von 62 bis 2³² (4 294 967 292): Die Zahlen darunter verteilen sich genau gleich auf die 62 Zeichen (je
 *  69 273 666); die vier darüber würden 0, 1, 2 und 3 bevorzugen und werden verworfen */
const GRENZE = 62 * 69273666;

export function istVorsilbe(v: string): v is Vorsilbe {
  return Object.hasOwn(NAMEN, v);
}

/** Name des Datensatztyps einer Vorsilbe, etwa „Teil“ für 'teil' */
export function vorsilbenName(v: Vorsilbe): string {
  return NAMEN[v];
}

/** Form nach 3.3 und eine bekannte Vorsilbe */
export function istKennung(id: string): boolean {
  return KENNUNG_MUSTER.test(id) && istVorsilbe(id.slice(0, id.indexOf('_')));
}

/** Kennung mit genau dieser Vorsilbe */
export function istKennungVon<V extends Vorsilbe>(v: V, id: string): id is Id<V> {
  return istKennung(id) && id.startsWith(`${v}_`);
}

/** Vorsilbe einer Kennung (auch eines Messwerts '<Kennung>.<name>'); wirft bei einer unbekannten Vorsilbe */
export function vorsilbeVon(id: string): Vorsilbe {
  const i = id.indexOf('_');
  const v = i > 0 ? id.slice(0, i) : '';
  if (!istVorsilbe(v)) throw new RangeError(`vorsilbeVon: keine Kennung: ${JSON.stringify(id)}`);
  return v;
}

/**
 * Kennung aus Zufallszahlen (Basis 62, Verwerfen gegen Modulo-Schieflage): jede Zahl unter `GRENZE` gibt ein Zeichen (Rest bei
 * Teilung durch 62), jede darüber wird übersprungen. Der Store füllt `zahlen` aus seinem Zufall (Editor und Server
 * `crypto.getRandomValues`, Tests ein Strom mit Saat; empfohlen `KENNUNG_ZAHLEN` Zahlen) und prüft Kollisionen.
 */
export function kennungAusZahlen<V extends Vorsilbe>(v: V, zahlen: Uint32Array): Id<V> {
  if (!istVorsilbe(v)) throw new RangeError(`kennungAusZahlen: unbekannte Vorsilbe ${JSON.stringify(v)}`);
  let zeichen = '';
  for (let i = 0; i < zahlen.length && zeichen.length < KENNUNG_LAENGE; i++) {
    const zahl = zahlen[i]!;
    if (zahl >= GRENZE) continue;
    zeichen += KENNUNG_ZEICHEN.charAt(zahl % 62);
  }
  if (zeichen.length < KENNUNG_LAENGE)
    throw new RangeError(`kennungAusZahlen: ${zahlen.length} Zufallszahlen reichen nicht (mindestens ${KENNUNG_LAENGE}, empfohlen ${KENNUNG_ZAHLEN})`);
  return `${v}_${zeichen}`;
}

/**
 * Stabile Kennung aus einem Pfad, etwa `kennungAusPfad('teil', 'ozzy/teil/<name>')`: die ersten 10 Zeichen der Basis-62-Darstellung
 * von SHA-256 des Pfads (UTF-8; der Hashwert als Zahl mit dem ersten Byte vorn, höchste Stelle zuerst, ohne führende Nullen).
 */
export function kennungAusPfad<V extends Vorsilbe>(v: V, pfad: string): Id<V> {
  if (!istVorsilbe(v)) throw new RangeError(`kennungAusPfad: unbekannte Vorsilbe ${JSON.stringify(v)}`);
  const ziffern = basis62(sha256(utf8(pfad))).padStart(KENNUNG_LAENGE, '0');
  return `${v}_${ziffern.slice(0, KENNUNG_LAENGE)}`;
}

/** Basis-62-Darstellung einer vorzeichenlosen Zahl aus Bytes (erstes Byte höchstwertig), höchste Stelle zuerst; schriftliches Teilen */
function basis62(bytes: Uint8Array): string {
  const zahl = Array.from(bytes);
  let anfang = 0;
  while (anfang < zahl.length && zahl[anfang] === 0) anfang++;
  let ziffern = '';
  while (anfang < zahl.length) {
    let rest = 0;
    for (let i = anfang; i < zahl.length; i++) {
      const x = rest * 256 + zahl[i]!;
      zahl[i] = Math.floor(x / 62);
      rest = x % 62;
    }
    ziffern = KENNUNG_ZEICHEN.charAt(rest) + ziffern;
    while (anfang < zahl.length && zahl[anfang] === 0) anfang++;
  }
  return ziffern === '' ? '0' : ziffern;
}

/** UTF-8 ohne TextEncoder (das Format hat kein DOM und keine Node-Typen); eine einzelne Ersatzhälfte wird U+FFFD wie dort */
function utf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const zeichen of text) {
    let c = zeichen.codePointAt(0)!;
    if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return Uint8Array.from(bytes);
}
