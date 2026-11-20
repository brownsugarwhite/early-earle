# Übergabe: Studio (Stand 20.11.2026 spät: M0 Verträge fertig, Commit e032014c; als Nächstes M1 und M2 Welle A)

**Studio** ist ein Editor für 2D-Vektorfiguren, der zugleich die Laufzeit ist, die sie im Spiel abspielt. Florian bringt seine Formen als
SVG mit oder zeichnet sie, legt ihre Zustände auf Leisten, formt Posen und Übergänge selbst und verknüpft Physik, Effekte, Klang und
Spiellogik ohne Code. Editor und Spiel laden dieselbe Datei und rechnen mit demselben Code. Ozzy ist das Beispiel; die Demo
„Gassirunde“ entsteht nur mit den Mitteln des Editors.

Die Integration schreibt diese Übergabe am Ende jeder Etappe neu (Plan 5.1 Nr. 4, Abschnitt 10).

## Wo was steht

- **Bauplan** (verbindlich): [`docs/plans/2026-11-20-studio-plan.md`](../../plans/2026-11-20-studio-plan.md), Etappen M0 bis M11
- **Konzept:** [`docs/plans/2026-11-20-studio-konzept.md`](../../plans/2026-11-20-studio-konzept.md)
- **Entscheidungsblatt** (F1 bis F7, Befunde der Kritik):
  [`docs/plans/2026-11-20-studio/entscheidungen-zur-kritik.md`](../../plans/2026-11-20-studio/entscheidungen-zur-kritik.md)
- **Liste für Florian** „Studio: Was bleibt“ (A vorläufig entschieden, B Proben, C großer Feinschliff):
  [`docs/plans/2026-11-20-studio-was-bleibt.md`](../../plans/2026-11-20-studio-was-bleibt.md)
- **Recherche:** [`docs/research/2026-11-20-editor-recherche.md`](../../research/2026-11-20-editor-recherche.md)
- **Bilder, Aufnahmen, Aufwand:** `docs/progress/studio/` (`m0-leer.png`; `aufwand.json`: je Welle ein Eintrag mit Etappe, Welle,
  Paketen, Agenten, Dauer; Plan 5.1, F7)

Gebaut wird in diesem Arbeitsbaum (`.claude/worktrees/ozzy-animation-physics-294508`, Zweig `claude/ozzy-animation-physics-294508`).
Sein Prototyp (`apps/editor`, Port 5213) und seine Dateien in `docs/look/ozzy-figur/` liegen hier und bleiben unberührt.

## Pakete und Apps (Plan 2.1)

| Ordner | Inhalt |
|---|---|
| `packages/studio-rechnen` | eigene Winkel- und Exponentialfunktionen, PCHIP, Bézier, Zufall, Prüfsumme, SHA-256, Zahlen schreiben |
| `packages/studio-format` | Typen und Schemas des Formats v1, Kennungen, Schreiber, Laden, Migrationen, Arten, SVG-Import |
| `packages/studio-store` | Datensätze, Transaktionen, Diffs, Verlauf, Herkunfts- und Schutzregel, Zusammenführen |
| `packages/studio-ablage` | Dateien mit Revision, Sicherungsring, Ereignisse, Sitzungsschlüssel, Live, Merker, Vite-Plugin (Node) |
| `packages/studio-laufzeit` | Verträge, Bauplan, Regler, Form, Knochen, Posen, Figurphysik, Bausteine, Logik, Takt, Editor-Kern |
| `packages/studio-welt` | Box2D hinter `WeltAdapter` |
| `packages/studio-bild` | WebGL2-Renderer mit Abstandsfeldern, Effekte, Kostenampel |
| `packages/studio-ton` | Klangplaner, Ausgabe, Musik |
| `packages/studio-autorig` | Autorig als reine Funktion |
| `apps/studio` | der Editor, Messseite, Prüfseite, Seite P1, Server-Erweiterungen beider Apps |
| `apps/ozzy-spiel` | die Demo „Gassirunde“ |
| `tools/studio-uebernahme` | Übernahme aus dem Prototyp als Daten; Vergleichsserver 5294 |
| `tools/studio-inhalt` | Inhalt der Demo über die Handgriffe, Probe-Projekte |

Importiert wird je Modul, ohne Sammeldatei: `import { pchipWert } from '@ee/studio-rechnen/pchip'`.

## Starten

Florian, aus dem Wurzelordner des Arbeitsbaums (Einträge `studio` und `gassirunde` in `.claude/launch.json`):

```bash
pnpm studio        # Editor, Messseite und P1: http://localhost:5217/
pnpm gassirunde    # Spiel fürs iPhone im selben Netz: http://<Adresse des Macs>:5261/
```

Beide zeigen einen festen Stand, den nur die Integration am Ende einer Etappe neu baut. Heute ist das `m0-20261120-2207`: Papier,
Titel „Studio“ in Lobster, leere Bühne. Zu sehen gibt es erst mit M1 etwas (seine Kopfdrehung in Studio).

## Prüfen

Aus dem Wurzelordner, nacheinander, nie während einer Welle (Plan 7.4):

| Befehl | was |
|---|---|
| `pnpm studio:pruefen [-- <schritt …> <paket …>]` | Typen, Lint, Tests und Lizenzen der Studio-Pakete nacheinander, je Schritt eine Zeile (Schritte `typen`, `lint`, `tests`, `lizenzen`; Pakete als Ordner oder Name; ohne Angabe alles); leert vor den Tests `test-results/bau/inhalt`; ganze Ausgaben in `test-results/studio-pruefen/` |
| `pnpm --filter <paket> typecheck` | Typen eines Pakets in zwei Schritten (`scripts/studio-typen.mjs`): `tsconfig.json` mit Tests, dann bei den Paketen ohne Node `tsconfig.quellen.json` nur über die Quellen, ohne Node-Typen (Plan 2.3 Nr. 1) |
| `pnpm --filter <paket> test` | vitest des Pakets in Kindprozessen (`forks`) mit Schreibhaken, den die `vitest.config.ts` selbst einhängt |
| `pnpm --filter @ee/studio e2e [<spec …>]` | Playwright für Studio in Chromium und WebKit, eigener Server auf `STUDIO_PORT` (Standard 5291) mit Schreibhaken; heute `e2e/seiten.spec.ts` (die vier Seiten, Lobster, COOP und COEP nur auf der Messseite) |
| `pnpm --filter @ee/ozzy-spiel e2e` | dasselbe für das Spiel auf `SPIEL_PORT` (Standard 5292), WebKit im Format des iPhone 16; heute `e2e/seite.spec.ts` |
| `NODE_OPTIONS=--import=$PWD/apps/studio/scripts/proben/schutz.mjs node apps/studio/scripts/proben/m0-vertrag.mjs` | Probe M0 (a): Bild auf 5263 und die drei roten Proben (unter „Stand“); Ausgaben in `test-results/proben/m0-vertrag/` |
| `pnpm studio:stand -- m<n>` | baut beide Apps nach `apps/<app>/dist/m<n>-<JJJJMMTT-HHMM>/`, schreibt erst danach `dist/aktuell`, löscht ältere Stände außer dem vorigen; Ausgaben in `test-results/studio-stand/` |
| `pnpm studio:bau` | Studio im Entwicklungsserver auf 5263 (Eintrag `studio-bau`), Inhalt als Kopie in `test-results/bau/inhalt` |
| `pnpm --filter @ee/studio-uebernahme uebernehmen [-- --kopf]` | Übernahme aus dem Prototyp (in M0: meldet „noch nichts gebaut“) |
| `pnpm --filter @ee/studio-inhalt inhalt [-- <name>]`, `… probeprojekt -- <name>` | Inhalt-Skripte und Probe-Projekte (in M0: meldet „noch nichts gebaut“) |
| `pnpm --filter @ee/studio-uebernahme vergleich` | Prototyp als Vergleich auf 5294, nur in Proben der Integration |

## Für Bau-Agenten

- **Ports:** je zwei aus 5270 bis 5289, `STUDIO_PORT` (gerade) und `SPIEL_PORT` (ungerade), immer mit `--strictPort`. Vorher
  `lsof -nP -iTCP:<port>`; ist er belegt, nicht ausweichen, sondern melden. Eigene Server am Ende beenden.
- **Playwright** mit eigenem Ordner: `STUDIO_PORT=<gerade> SPIEL_PORT=<ungerade> STUDIO_INHALT=test-results/<paket>/inhalt
  pnpm --filter @ee/studio e2e <eigene Specs>`. Die Inhaltskopie liegt dann in `test-results/<paket>/inhalt`, die Ausgaben in
  `test-results/<paket>/ausgaben`; ohne `STUDIO_INHALT` nimmt Playwright `test-results/playwright-<port>/`. Playwright leert den Ordner
  `ausgaben` zu Beginn jedes Laufs: nie den Ordner eines anderen Pakets nennen. Ein `STUDIO_INHALT` außerhalb von `test-results/`
  bricht ab (Plan 7.5). Dasselbe gilt für `apps/ozzy-spiel` (Port aus `SPIEL_PORT`).
- **Befehle** immer mit `pnpm_config_verify_deps_before_run=error` davor (pnpm 12 installiert sonst still nach, sobald eine
  `package.json` nicht zur Lockdatei passt): Typen `pnpm --filter <paket> typecheck` (nie nur `exec tsc`), Tests
  `pnpm --filter <paket> test` oder `pnpm --filter <paket> exec vitest run <datei>`, Lint `pnpm exec eslint <eigene Pfade>`, Grenzen
  `pnpm --filter @ee/studio exec vitest run test/grenzen.test.ts`. Ausgaben nach `test-results/<paket>/`.
- **Schreibhaken** für jeden eigenen Node-Prozess: `NODE_OPTIONS=--import=<Arbeitsbaum>/apps/studio/scripts/proben/schutz.mjs`
  (absoluter Pfad). vitest hängt ihn selbst ein (`execArgv` in jeder `vitest.config.ts`), die Skripte `dev`, `uebernehmen`, `inhalt`,
  `probeprojekt` und `vergleich` ebenso. Er wirkt im Hauptthread und in Kindprozessen, nicht in Worker-Threads von Node; Studio-Code
  nimmt deshalb keine (`node:worker_threads` meldet `apps/studio/test/grenzen.test.ts`), und vitest läuft in Kindprozessen (`forks`).
- **Kein Node** in `src/` von rechnen, format, store, laufzeit, welt, bild, ton und autorig (ohne Tests): keine Node-Typen
  (`tsconfig.quellen.json`) und keine Node-Globalen wie `process`, `Buffer`, `require`, `__dirname`, `setImmediate` (ESLint). Hilfen nur
  für Tests, die Node brauchen, heißen `*.testhilfe.ts`.
- **Simulationspfad** (rechnen, format, laufzeit, welt, autorig; ohne Tests): ESLint verbietet `Math.sin` und Verwandte, `Math.random`,
  `**`, `Date`, `performance` und Zeitgeber (`setTimeout`, `setInterval`, `requestAnimationFrame`). Math gilt nur direkt als
  `Math.<Name>` (kein `const M = Math`, kein `Math[name]`); `globalThis`, `global`, `self`, `window` und `crypto` gibt es dort nicht.
- **Grenzen** (`grenzen.test.ts`): Die Matrix aus Plan 2.1 gilt für `src/`. Konfiguration, Tests, `e2e/`, `scripts/` und `server/`
  dürfen die Werkzeuge ihres Pakets importieren (vite, @vitejs/*, vitest, fast-check, @playwright/test, webdriverio, typescript, Node,
  die devDependencies) und Pakete, die `src/` nur als Typ nimmt, auch als Wert; `src/` der beiden Werkzeuge darf Node.

## Ports (Plan 2.4, F4)

5213 sein Prototyp (nie anfassen) · 5217 Studio aus dem festen Stand · 5261 Spiel aus dem festen Stand · 5263 und 5265 Entwicklungsserver
der Integration · 5270 bis 5289 Probe-Ports der Bau-Agenten (je zwei, `STUDIO_PORT` und `SPIEL_PORT`) · 5291 und 5292 Playwright ·
5294 Vergleichsserver · 5219 Shader-Sitzung (belegt). Vor jedem Start `lsof -nP -iTCP:<port>`.

## Stand

**M0 Verträge fertig** (Commit e032014c, gepusht). Angelegt sind alle Pakete, beide Apps und beide Werkzeuge mit
Konfiguration und Abhängigkeiten; `studio-rechnen` im Umfang von M0 (PCHIP bitgleich zum Prototyp, `kurvenAbstand`, SHA-256 als eigene
Umsetzung, `zahlText`; `winkel.ts` und `exp.ts` vorläufig über `Math` bis nach M1 Welle A, Selbsttest und Port der fdlibm in M1.1); `studio-format` mit Typen und Schemas des Formats v1, Arten (die fünf Effekte
von M1), `kennung.ts`, `versionen.ts`, `anker.ts` und den Prüfdaten (`ozzy-rollen.json`, `testfigur.json`, seine Schlüssel als
Prüfdatei); `studio-store/src/typen.ts`; in `studio-laufzeit` alle Verträge samt `weltAttrappe.ts`, fertig `bauplan/ordnung.ts` und
`bauplan/regler.ts`, leer die Zusammenbau-Dateien; leer das Effekt-Register von `studio-bild`. `apps/studio` hat die vier Seiten, Vite mit
festen Ständen, Playwright, die leer zusammengesetzten Server-Erweiterungen, `main.ts` (Papier, Titel „Studio“ in Lobster, leere
Bühne), Schreibhaken, Grenzen-Test und Probe M0; das Spiel Seite, Vite, Playwright, `main.ts` und `keinSpielcode.test.ts`.

**Nacharbeit der Integration** (nach dem Workflow mit 12 Agenten, 40 Befunden, keiner hoch offen): Typprüfung zweigeteilt
(`tsconfig.quellen.json`, `scripts/studio-typen.mjs`); ESLint verbietet Node-Globale in den Paketen ohne Node und Zeitgeber im
Simulationspfad; jede `vitest.config.ts` läuft mit `forks` und Schreibhaken (geprüft: ein Test ohne `NODE_OPTIONS` sieht den Haken und
bekommt `EPERM` unter `apps/editor/`, im Paket und aus der Wurzel); Paket-Skripte `dev`, `uebernehmen`, `inhalt`, `probeprojekt`,
`vergleich` mit Haken; `pnpm_config_verify_deps_before_run=error` in den Studio-Skripten; `@types/node` in den devDependencies der
Pakete mit Node, `@ee/studio-rechnen` als devDependency des Stores; DOM-Typen für die Übernahme (sie liest den Raster des Prototyps);
Hüllen im Format: Vielecke 3 bis 8 Punkte (`VIELECK_HOECHSTENS`, gleich `VIELECK_PUNKTE` der Welt), Ketten ab 2, Schleifen ab 3;
`content/studio/.gitignore` (`.sicherung/`) liegt an. Die Vertragsergänzungen der Agenten trägt ein eigener Workflow in den Plan nach
(Abschnitt „Nachtrag nach M0“ am Ende des Plans).

**Probe M0 (a)** (20.11., 22:06, `m0-vertrag.mjs`, nach der Nacharbeit; alle vier Teile wie erwartet). Dazu rot, wie gewollt: ein
`process.env` in `studio-laufzeit/src` in der Typprüfung der Quellen (TS2591) und in ESLint (`no-restricted-globals`):

- **Bild** [`docs/progress/studio/m0-leer.png`](../../progress/studio/m0-leer.png): die Seite auf 5263 nach `data-schrift="geladen"`,
  Papier, „Studio“ in Lobster, leere Bühne, keine Fehler der Seite.
- **Rot: `Math.sin` in studio-laufzeit.** ESLint über stdin unter dem Namen `packages/studio-laufzeit/src/m0-probe-rot.ts` (geschrieben
  wird nichts): `Math.sin` → `no-restricted-properties`; ebenso rot `**`, `Date.now`, `const M = Math`, `globalThis.Math` und
  `crypto.getRandomValues`; `Math.sqrt(r) * Math.PI` bleibt grün.
- **Rot: Import von `@ee/studio-store` im Spiel.** Eine Probedatei `apps/ozzy-spiel/src/m0-probe-rot.ts` mit
  `import * as speicher from '@ee/studio-store/typen'`:
  tsc des Spiels `error TS2307: Cannot find module '@ee/studio-store/typen'`;
  `keinSpielcode.test.ts` `src/m0-probe-rot.ts:2: @ee/studio-store/typen (der Store gehört in den Editor)`;
  `grenzen.test.ts` `… @ee/studio-store ist für src/ von @ee/ozzy-spiel nicht erlaubt (Matrix 2.1)`.
  Danach ist die Datei weg und das Spiel wieder grün.
- **Rot: Schreibhaken unter `apps/editor/`.** `writeFileSync` (über `require`) und `writeFile` aus `node:fs/promises` (benannter
  ESM-Import) in Kindprozessen: beide verweigert (`EPERM`), je eine Meldung `verweigert: … unter apps/editor/ · <Pfad> · <Zeit> ·
  Prozess …` auf stderr und in `test-results/schutz/meldungen.log`; geschrieben wurde nichts (`git status apps/editor` leer).

**Prüfungen** (20.11., 22:05): `pnpm studio:pruefen` grün, 29 Schritte in 27 s: Typen aller 13, Lint (121 Dateien, 0 Fehler),
Tests (rechnen 60, format 140, laufzeit 62, bild 4, studio 9, Spiel 4; die übrigen noch ohne Tests), Lizenzen (208 Pakete, 10 Ausnahmen
mit Grund). e2e Studio 10 von 10 und Spiel 2 von 2 in Chromium und WebKit. Stand `m0-20261120-2207` gebaut. Der Schreibhaken hat
außer den Proben nichts verweigert (die Meldungen der Proben liegen in `test-results/m0/integration/`).

**webdriverio unter Node 25.8.1** (Plan 5.3 „Ehrlich“): Es lädt (10.2.0 nennt Node 22, 24 oder ab 26.12.1) und läuft bis zur
Verbindung mit dem Treiber (`remote()` gegen einen Port ohne Treiber endet mit „Unable to connect …“). Eine Sitzung im echten Safari
braucht `safaridriver --enable` (Florian, B6); bis dahin bleibt es bei WebKit von Playwright. Kein Eintrag in Teil C nötig.

**Pause seit 20.11., 22:40 (Florians Wunsch).** Der Plan-Nachtrag nach M0 ist geschrieben (26 Abschnitte, Abschnitt „Nachtrag nach
M0 (20.11.)“ am Ende des Plans; der Plan wuchs von 282 auf 364 KB) und committet, aber noch **nicht gegengeprüft**: Der Workflow
wf_285c5b1d-7d5 wurde nach dem Schreiber angehalten, bevor die drei Prüfer (Verträge, Aufträge M1/M2, Regeln und Abläufe) und die
Nacharbeit liefen. **Wiederaufnahme:** in derselben Sitzung den Workflow mit `resumeFromRunId: "wf_285c5b1d-7d5"` fortsetzen (Skript
`studio-m0-plan-nachziehen-wf_285c5b1d-7d5.js` im Ordner `workflows/scripts/` der Sitzung 28a29b68); der Schreiber kommt aus dem
Zwischenspeicher, nur Prüfung und Nacharbeit laufen neu. In einer neuen Sitzung geht das nicht: dann nur die drei Prüfer und die
Nacharbeit neu starten, der Nachtrag selbst steht im Plan. Danach Welle A. Offen aus dem Nachtrag, vor Welle A zu entscheiden: (1) 4.2 Schritt 13 nennt `aufhaengen(plan.knochen, matrizen, anker)`, 4.4
`aufhaengen(p, matrizen, achsen, anker)` (älter als M0); (2) der Prüfer-Hinweis zum Umlaufsinn (3.6 Nr. 12) hat noch kein Paket (M1.2
nehmen); (3) die Typen `Schritt` und `Skript` in `uebernahme.ts` und `inhalt.ts` exportieren, damit M1.8 und M5.6 sie nicht nachbilden;
(4) in den Aufträgen sagen, dass beim `typecheck` des ganzen Pakets nur Fehler in eigenen Dateien zählen (studio-laufzeit teilen sich
M1.3, M1.7, M2.2); (5) die Attrappe entscheidet die Seite eines Vielecks an einer Kette am Mittel der Ecken, der Vertrag am Schwerpunkt
(an `welt.ts` angleichen); (6) `kennung.ts` und `anker.ts` auf `utf8` und `radZuGrad` aus studio-rechnen umstellen.

**Danach:** M1 und M2 Welle A in einem Workflow mit neun Bau-Agenten (M1.1 Rechnen, M1.2 Format, M1.3 Form-Laufzeit, M1.4 Bild,
M1.5 Store-Kern, M1.6 Ablage, M1.7 Knochen und Drähte, M2.1 Welt, M2.2 Figurphysik), je mit Prüfung und Nacharbeit; danach verdrahtet
die Integration (`winkel.ts` und `exp.ts` auf den Port der fdlibm, `bauplan/bauen.ts`, `fassade.ts`, Register der Effekte,
`server/plugins.ts`) und beginnt `studio-laufzeit/src/bauplan/bauen.test.ts` (4.3) mit Ordnung und Regler. Dann Welle B (M1.8
Übernahme des Kopfs, M1.9 Betrachter und Vergleichsproben, M2.3 P1 mit „Tapsen“, M2.4 Messseite).

**An seiner Figur hat sich nichts geändert;** für Florian gibt es in M0 nichts zu prüfen.

## Fallen

- `pnpm --filter <name>` mit einem Namen, den es nicht gibt, läuft still mit Exitcode 0. Die Skripte rufen Pakete deshalb mit
  `pnpm -C <ordner>` oder mit `--fail-if-no-match` auf.
- pnpm 12 installiert vor `pnpm run` und `pnpm exec` von selbst, sobald eine `package.json` eine neue Abhängigkeit oder ein neues
  Paket nennt (Lockdatei und `node_modules` ändern sich; am 20.11. an einer Kopie nachgeprüft). Die Studio-Skripte der Wurzel und
  `studio:pruefen` setzen deshalb `pnpm_config_verify_deps_before_run=error`, Bau-Agenten ebenso. Nicht in `pnpm-workspace.yaml` oder
  `.npmrc`: Das träfe Florians Start auf 5213.
- Die Typen von vitest bringen Node mit: Wer `vitest.config.ts` in eine tsconfig aufnimmt, sieht `process` und `Buffer` überall. Darum
  prüft `tsconfig.quellen.json` die Quellen der Pakete ohne Node getrennt (Pakete ohne Quellen überspringen den Schritt, sonst TS18003).
- pnpm 12 reicht Argumente hinter dem Skriptnamen direkt weiter: `pnpm --filter @ee/studio e2e --list`. Hinter `--` gelten sie für
  Playwright als Dateifilter, nicht als Optionen.
- Playwright legt `webServer.env` über `process.env` (was die Konfiguration setzt, gilt; deshalb liest sie `STUDIO_INHALT` selbst), leert
  `outputDir` zu Beginn jedes Laufs und endet ohne Specs mit „No tests found“ (Exitcode 1).
- `document.fonts.check()` ist auch wahr, wenn eine Schrift gar nicht eingetragen ist. Proben warten auf `data-schrift="geladen"`; das
  setzen beide `main.ts`, sobald Lobster geladen ist („fehlt“, wenn nicht).
- `apps/<app>/dist/aktuell` enthält nur den Namen des Stands, ohne Zeilenumbruch. Ein Stand-Ordner wird nie überschrieben; einen Stand,
  aus dem 5217 oder 5261 noch liefert, lässt `studio:stand` beim Aufräumen stehen.
- ESLint meldet bei jedem Lauf `MODULE_TYPELESS_PACKAGE_JSON` (die `package.json` der Wurzel hat kein `"type"`); harmlos.
- Kein eigener Prozess schreibt unter `apps/editor/` oder `docs/look/ozzy-figur/`, und nach `content/studio/` nur, wo
  `STUDIO_INHALT=content/studio` ausdrücklich steht (Schreibhaken `apps/studio/scripts/proben/schutz.mjs`, Plan 6.3, 2.4). Worker-Threads
  von Node schreiben an ihm vorbei.
