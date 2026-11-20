// Schreibhaken der eigenen Prozesse (Plan 6.3 und 7.5). Jeder eigene Node-Prozess von Studio läuft mit
//   NODE_OPTIONS=--import=<Arbeitsbaum>/apps/studio/scripts/proben/schutz.mjs
// (absoluter Pfad, damit auch Kindprozesse in anderen Ordnern ihn finden). Der Haken umhüllt die schreibenden Funktionen von
// node:fs und node:fs/promises und verweigert jeden Schreibversuch unter Florians Dateien:
//   docs/look/ozzy-figur/   seine Schlüssel und Vorlagen
//   apps/editor/            sein Prototyp (läuft auf 5213 aus diesem Arbeitsbaum)
//   content/studio/         sein Inhaltsordner, solange STUDIO_INHALT nicht ausdrücklich content/studio nennt (2.4: alle anderen
//                           Prozesse arbeiten auf einer Kopie)
// Alle Pfade kommen aus dem Ort dieser Datei; verglichen wird auf echten Pfaden (Verknüpfungen aufgelöst, am Mac ohne Unterschied
// zwischen Groß- und Kleinschreibung wie sein Dateisystem). Ein verweigerter Versuch wirft einen Fehler (code EPERM), geschrieben wird
// nichts; die Meldung (Pfad, Zeit, Prozess) steht auf stderr und in test-results/schutz/meldungen.log. Meldet der Haken etwas, hält
// der Lauf an (6.3).
// Grenzen: Was nicht über Node schreibt (rolldown und esbuild in Vite, die Browser, git), sieht der Haken nicht. Er wirkt im
// Hauptthread und in Kindprozessen (sie erben NODE_OPTIONS), nicht in Worker-Threads von Node (node:worker_threads): Ein Worker hat
// eigene Funktionen von fs und schreibt an der Hülle vorbei, auch mit execArgv ['--import=…/schutz.mjs'] (Prüfung vom 20.11.).
// Deshalb nimmt Studio-Code keine Worker-Threads, und vitest läuft in Kindprozessen (Standard „forks“ von vitest 5, nie
// „threads“ oder „vmThreads“); beides prüft apps/studio/test/grenzen.test.ts.
//
// Nur wenn STUDIO_INHALT=content/studio gilt (Läufe der Integration und der Kindprozess der Übernahme seines Studios), legt der Haken
// beim Start eine Kopie von docs/look/ozzy-figur/schluessel.json nach content/studio/.sicherung/fremd/: nur wenn sie sich seit der
// letzten Kopie geändert hat (SHA-256), nur wenn content/studio/.gitignore den Ordner .sicherung/ ausnimmt, ausgedünnt wie der
// Sicherungsring (die letzten 50, dazu eine Woche lang je Stunde eine).
//
// STUDIO_SCHUTZ_ZUSAETZLICH (absolute Pfade, getrennt durch „:“) schützt weitere Ordner, etwa für Proben des Hakens selbst. Es nimmt
// nie einen Schutz weg.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KENNUNG = Symbol.for('studio.schutz');

if (!globalThis[KENNUNG]) einrichten();

function einrichten() {
  const HIER = path.dirname(fileURLToPath(import.meta.url));
  const WURZEL = path.resolve(HIER, '../../../..');
  const INHALT = path.join(WURZEL, 'content/studio');
  const FREMD_QUELLE = path.join(WURZEL, 'docs/look/ozzy-figur/schluessel.json');
  const FREMD_ZIEL = path.join(INHALT, '.sicherung/fremd');
  const MELDUNGEN = path.join(WURZEL, 'test-results/schutz/meldungen.log');
  const OHNE_GROSS_KLEIN = process.platform === 'darwin' || process.platform === 'win32';
  const STUNDE = 3_600_000;
  const WOCHE = 7 * 24 * STUNDE;
  const RING = 50;
  /** Name einer Kopie: Zeit (UTC, ms) und die ersten 16 Zeichen der SHA-256 */
  const KOPIE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z-[0-9a-f]{16}\.json$/;

  // Unveränderte Funktionen für den Haken selbst
  const ur = {
    realpath: fs.realpathSync.native ?? fs.realpathSync,
    exists: fs.existsSync,
    readFile: fs.readFileSync,
    readdir: fs.readdirSync,
    mkdir: fs.mkdirSync,
    writeFile: fs.writeFileSync,
    appendFile: fs.appendFileSync,
    rename: fs.renameSync,
    unlink: fs.unlinkSync,
  };

  const vergleichbar = (p) => (OHNE_GROSS_KLEIN ? p.normalize('NFC').toLowerCase() : p);

  /** Echter Pfad: der längste vorhandene Anfang aufgelöst, der Rest angehängt (auch für Dateien, die erst entstehen). */
  function echterPfad(p) {
    const rest = [];
    let jetzt = path.resolve(p);
    for (;;) {
      try {
        return path.join(ur.realpath(jetzt), ...rest.reverse());
      } catch {
        const oben = path.dirname(jetzt);
        if (oben === jetzt) return path.resolve(p);
        rest.push(path.basename(jetzt));
        jetzt = oben;
      }
    }
  }

  const geschuetzt = [];
  const schuetzen = (name, pfad) => geschuetzt.push({ name, echt: vergleichbar(echterPfad(pfad)) });
  schuetzen('docs/look/ozzy-figur/', path.join(WURZEL, 'docs/look/ozzy-figur'));
  schuetzen('apps/editor/', path.join(WURZEL, 'apps/editor'));
  const inhaltRoh = process.env.STUDIO_INHALT ?? '';
  const inhaltGilt = inhaltRoh !== '' && vergleichbar(echterPfad(path.resolve(WURZEL, inhaltRoh))) === vergleichbar(echterPfad(INHALT));
  if (!inhaltGilt) schuetzen('content/studio/', INHALT);
  for (const extra of (process.env.STUDIO_SCHUTZ_ZUSAETZLICH ?? '').split(path.delimiter)) {
    if (extra !== '' && path.isAbsolute(extra)) schuetzen(extra, extra);
  }

  const unter = (echt, ordner) => echt === ordner || echt.startsWith(ordner.endsWith(path.sep) ? ordner : ordner + path.sep);

  /** Pfad aus einem Argument von fs (Text, file-URL, Buffer); null für Dateinummern, FileHandle und alles andere. */
  function alsPfad(x) {
    try {
      if (typeof x === 'string') return x;
      if (Buffer.isBuffer(x)) return x.toString();
      if (x instanceof URL) return x.protocol === 'file:' ? fileURLToPath(x) : null;
      if (x !== null && typeof x === 'object' && typeof x.href === 'string' && x.protocol === 'file:') return fileURLToPath(x.href);
    } catch {
      // ungültige URL: fs meldet den Fehler selbst
    }
    return null;
  }

  /**
   * Prüft ein Pfad-Argument. folgen: wie die Funktion selbst Verknüpfungen auflösen (Schreiben in eine Datei); sonst zählt der Eintrag
   * im Ordner (Löschen, Umbenennen, Verknüpfung anlegen). baum: verweigert auch, wenn ein geschützter Ordner darin liegt (Löschen und
   * Umbenennen eines Elternordners). quelle: beim Kopieren in einen Elternordner zählt, ob die Quelle dort etwas hineinlegen würde.
   */
  function pruefe(roh, { folgen, baum = false, quelle = null }) {
    const p = alsPfad(roh);
    if (p === null) return null;
    const abs = path.resolve(p);
    const echt = vergleichbar(folgen ? echterPfad(abs) : path.join(echterPfad(path.dirname(abs)), path.basename(abs)));
    for (const s of geschuetzt) {
      if (unter(echt, s.echt)) return { schutz: s.name, pfad: abs };
      if (baum && unter(s.echt, echt)) return { schutz: s.name, pfad: abs };
      if (quelle !== null && unter(s.echt, echt) && ur.exists(path.join(path.resolve(quelle), path.relative(echt, s.echt)))) {
        return { schutz: s.name, pfad: abs };
      }
    }
    return null;
  }

  const ZIEL = { folgen: true };
  const EINTRAG = { folgen: false };
  const BAUM = { folgen: false, baum: true };
  const { O_WRONLY, O_RDWR, O_CREAT, O_TRUNC, O_APPEND } = fs.constants;
  /** Öffnet `flags` zum Schreiben? Ohne Angabe gilt 'r'. */
  function schreibtFlags(flags) {
    if (flags === undefined || flags === null || typeof flags === 'function') return false;
    if (typeof flags === 'number') return (flags & (O_WRONLY | O_RDWR | O_CREAT | O_TRUNC | O_APPEND)) !== 0;
    return /[wa+]/.test(String(flags));
  }

  // Prüfung je Funktion: bekommt die Argumente, gibt den Verstoß oder null
  const PRUEFUNGEN = {
    writeFile: (a) => pruefe(a[0], ZIEL),
    appendFile: (a) => pruefe(a[0], ZIEL),
    mkdir: (a) => pruefe(a[0], ZIEL),
    mkdtemp: (a) => pruefe(a[0], ZIEL),
    rm: (a) => pruefe(a[0], BAUM),
    rmdir: (a) => pruefe(a[0], BAUM),
    unlink: (a) => pruefe(a[0], EINTRAG),
    rename: (a) => pruefe(a[0], BAUM) ?? pruefe(a[1], BAUM),
    copyFile: (a) => pruefe(a[1], ZIEL),
    cp: (a) => pruefe(a[1], { folgen: true, quelle: alsPfad(a[0]) }),
    symlink: (a) => pruefe(a[1], EINTRAG),
    // eine harte Verknüpfung auf eine seiner Dateien wäre ein zweiter Weg hinein
    link: (a) => pruefe(a[0], ZIEL) ?? pruefe(a[1], EINTRAG),
    truncate: (a) => pruefe(a[0], ZIEL),
    open: (a) => (schreibtFlags(a[1]) ? pruefe(a[0], ZIEL) : null),
    utimes: (a) => pruefe(a[0], ZIEL),
    lutimes: (a) => pruefe(a[0], EINTRAG),
    chmod: (a) => pruefe(a[0], ZIEL),
    lchmod: (a) => pruefe(a[0], EINTRAG),
    chown: (a) => pruefe(a[0], ZIEL),
    lchown: (a) => pruefe(a[0], EINTRAG),
  };

  function befehl() {
    const teile = [process.argv0, ...process.execArgv, ...process.argv.slice(1)].map((t) => (/\s/.test(t) ? JSON.stringify(t) : t));
    const text = teile.join(' ');
    return text.length > 300 ? `${text.slice(0, 300)} …` : text;
  }

  function hinweis(text) {
    try {
      process.stderr.write(`[schutz] ${text}\n`);
    } catch {
      // ohne stderr bleibt nur die Datei
    }
  }

  function melden(name, v) {
    const zeile =
      `verweigert: ${name} unter ${v.schutz} · ${v.pfad} · ${new Date().toISOString()} · ` +
      `Prozess ${process.pid} (Eltern ${process.ppid}): ${befehl()} · Ordner ${process.cwd()}`;
    hinweis(zeile);
    try {
      ur.mkdir(path.dirname(MELDUNGEN), { recursive: true });
      ur.appendFile(MELDUNGEN, `${zeile}\n`);
    } catch {
      // die Meldung auf stderr reicht
    }
  }

  function verweigern(name, art, v, args) {
    const fehler = Object.assign(new Error(`Schreibhaken: ${name} unter ${v.schutz} verweigert (${v.pfad})`), {
      code: 'EPERM',
      errno: -1,
      syscall: name,
      path: v.pfad,
    });
    melden(name, v);
    if (art === 'promise') return Promise.reject(fehler);
    if (art === 'callback') {
      const rueckruf = args.findLast((x) => typeof x === 'function');
      if (rueckruf) {
        process.nextTick(rueckruf, fehler);
        return undefined;
      }
    }
    throw fehler;
  }

  function umhuellen(ziel, name, art, pruefen) {
    const ursprung = ziel?.[name];
    if (typeof ursprung !== 'function' || ursprung[KENNUNG]) return;
    const huelle = {
      [name](...args) {
        let v = null;
        try {
          v = pruefen(args);
        } catch {
          v = null; // eine Prüfung, die an ungültigen Argumenten scheitert: fs meldet den Fehler selbst
        }
        if (v) return verweigern(name, art, v, args);
        return Reflect.apply(ursprung, this, args);
      },
    }[name];
    for (const k of Reflect.ownKeys(ursprung)) {
      if (k === 'length' || k === 'name' || k === 'prototype') continue;
      try {
        Object.defineProperty(huelle, k, Object.getOwnPropertyDescriptor(ursprung, k));
      } catch {
        // nicht übertragbar: ohne
      }
    }
    Object.defineProperty(huelle, 'length', { value: ursprung.length, configurable: true });
    Object.defineProperty(huelle, KENNUNG, { value: true });
    try {
      ziel[name] = huelle;
    } catch {
      Object.defineProperty(ziel, name, { value: huelle, writable: true, configurable: true, enumerable: true });
    }
  }

  for (const [name, pruefen] of Object.entries(PRUEFUNGEN)) {
    umhuellen(fs, `${name}Sync`, 'sync', pruefen);
    umhuellen(fs, name, 'callback', pruefen);
    umhuellen(fsp, name, 'promise', pruefen);
    if (fs.promises !== fsp) umhuellen(fs.promises, name, 'promise', pruefen);
  }
  umhuellen(fs, 'createWriteStream', 'sync', (a) => {
    const o = a[1];
    if (o !== null && typeof o === 'object' && o.fd !== undefined && o.fd !== null) return null; // schreibt in eine offene Datei
    return pruefe(a[0], ZIEL);
  });
  // benannte ESM-Importe (import { writeFileSync } from 'node:fs') sehen sonst die alten Funktionen
  syncBuiltinESMExports();

  Object.defineProperty(globalThis, KENNUNG, {
    value: Object.freeze({ wurzel: WURZEL, geschuetzt: Object.freeze(geschuetzt.map((s) => s.name)), inhaltGilt }),
  });

  // Kopie seiner schluessel.json, nur in den Läufen mit STUDIO_INHALT=content/studio
  if (!inhaltGilt) return;
  try {
    fremdSichern();
  } catch (e) {
    hinweis(`Kopie seiner schluessel.json gescheitert: ${e instanceof Error ? e.message : String(e)}`);
  }

  function sha(daten) {
    return createHash('sha256').update(daten).digest('hex');
  }

  /** 2026-11-20T18:33:12.123Z → 20261120T183312123Z */
  function zeitText(d) {
    return d.toISOString().replace(/[-:.]/g, '');
  }

  /** Vorhandene Kopien, die neueste zuerst */
  function kopien() {
    const liste = [];
    for (const name of ur.readdir(FREMD_ZIEL)) {
      const m = KOPIE.exec(name);
      if (!m) continue;
      const [j, mo, t, h, mi, s, ms] = m.slice(1).map(Number);
      liste.push({ name, zeit: Date.UTC(j, mo - 1, t, h, mi, s, ms) });
    }
    return liste.sort((a, b) => b.zeit - a.zeit || (a.name < b.name ? 1 : -1));
  }

  function fremdSichern() {
    const gitignore = path.join(INHALT, '.gitignore');
    let ausgenommen = false;
    try {
      ausgenommen = /^\/?\.sicherung\/?\s*$/m.test(String(ur.readFile(gitignore, 'utf8')));
    } catch {
      ausgenommen = false;
    }
    if (!ausgenommen) {
      hinweis('keine Kopie seiner schluessel.json: content/studio/.gitignore nimmt .sicherung/ nicht aus (legt die Ablage an, M1.6)');
      return;
    }
    if (!ur.exists(FREMD_QUELLE)) return;
    const daten = ur.readFile(FREMD_QUELLE);
    const hash = sha(daten);
    ur.mkdir(FREMD_ZIEL, { recursive: true });
    const vorhanden = kopien();
    if (vorhanden.length > 0 && sha(ur.readFile(path.join(FREMD_ZIEL, vorhanden[0].name))) === hash) return;
    const jetzt = new Date();
    const name = `${zeitText(jetzt)}-${hash.slice(0, 16)}.json`;
    const neben = path.join(FREMD_ZIEL, `.${name}.${process.pid}.neu`);
    ur.writeFile(neben, daten, { flag: 'wx' });
    ur.rename(neben, path.join(FREMD_ZIEL, name));
    hinweis(`Kopie seiner schluessel.json: content/studio/.sicherung/fremd/${name}`);
    ausduennen(jetzt.getTime());
  }

  /** Die letzten 50 bleiben, dazu für eine Woche je Stunde die neueste; alles andere geht. */
  function ausduennen(jetzt) {
    const liste = kopien();
    const bleiben = new Set(liste.slice(0, RING).map((k) => k.name));
    const stunden = new Set();
    for (const k of liste) {
      if (jetzt - k.zeit > WOCHE) continue;
      const stunde = Math.floor(k.zeit / STUNDE);
      if (stunden.has(stunde)) continue;
      stunden.add(stunde);
      bleiben.add(k.name);
    }
    for (const k of liste) if (!bleiben.has(k.name)) ur.unlink(path.join(FREMD_ZIEL, k.name));
  }
}
