# Übergabe: Studio (Stand 20.11.2026 abends: M0 Verträge gebaut, Nacharbeit nach der Prüfung)

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

Beide zeigen einen festen Stand, den nur die Integration am Ende einer Etappe neu baut. **Noch gibt es keinen Stand;** beide starten
erst nach dem ersten `pnpm studio:stand` (Abschluss von M0).

## Prüfen

Aus dem Wurzelordner, nacheinander, nie während einer Welle (Plan 7.4):

| Befehl | was |
|---|---|
| `pnpm studio:pruefen [-- <schritt …> <paket …>]` | Typen, Lint, Tests und Lizenzen der Studio-Pakete nacheinander, je Schritt eine Zeile (Schritte `typen`, `lint`, `tests`, `lizenzen`; Pakete als Ordner oder Name; ohne Angabe alles); leert vor den Tests `test-results/bau/inhalt`; ganze Ausgaben in `test-results/studio-pruefen/` |
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
- **Schreibhaken** für jeden eigenen Node-Prozess: `NODE_OPTIONS=--import=<Arbeitsbaum>/apps/studio/scripts/proben/schutz.mjs`
  (absoluter Pfad). Er wirkt im Hauptthread und in Kindprozessen, nicht in Worker-Threads von Node; Studio-Code nimmt deshalb keine
  (`node:worker_threads` meldet `apps/studio/test/grenzen.test.ts`), und vitest läuft in Kindprozessen (`forks`).
- **Simulationspfad** (rechnen, format, laufzeit, welt, autorig; ohne Tests): ESLint verbietet `Math.sin` und Verwandte, `Math.random`,
  `**`, `Date` und `performance`. Math gilt nur direkt als `Math.<Name>` (kein `const M = Math`, kein `Math[name]`); `globalThis`,
  `global`, `self`, `window` und `crypto` gibt es dort nicht.
- **Grenzen** (`grenzen.test.ts`): Die Matrix aus Plan 2.1 gilt für `src/`. Konfiguration, Tests, `e2e/`, `scripts/` und `server/`
  dürfen die Werkzeuge ihres Pakets importieren (vite, @vitejs/*, vitest, fast-check, @playwright/test, webdriverio, typescript, Node,
  die devDependencies) und Pakete, die `src/` nur als Typ nimmt, auch als Wert; `src/` der beiden Werkzeuge darf Node.

## Ports (Plan 2.4, F4)

5213 sein Prototyp (nie anfassen) · 5217 Studio aus dem festen Stand · 5261 Spiel aus dem festen Stand · 5263 und 5265 Entwicklungsserver
der Integration · 5270 bis 5289 Probe-Ports der Bau-Agenten (je zwei, `STUDIO_PORT` und `SPIEL_PORT`) · 5291 und 5292 Playwright ·
5294 Vergleichsserver · 5219 Shader-Sitzung (belegt). Vor jedem Start `lsof -nP -iTCP:<port>`.

## Stand

**M0 Verträge gebaut; nach der Prüfung läuft die Nacharbeit.** Angelegt sind alle Pakete, beide Apps und beide Werkzeuge mit
Konfiguration und Abhängigkeiten; `studio-rechnen` im Umfang von M0 (PCHIP bitgleich zum Prototyp, `kurvenAbstand`, SHA-256 als eigene
Umsetzung, `zahlText`; `winkel.ts` und `exp.ts` vorläufig über `Math` bis nach M1 Welle A, Selbsttest und Port der fdlibm in M1.1); `studio-format` mit Typen und Schemas des Formats v1, Arten (die fünf Effekte
von M1), `kennung.ts`, `versionen.ts`, `anker.ts` und den Prüfdaten (`ozzy-rollen.json`, `testfigur.json`, seine Schlüssel als
Prüfdatei); `studio-store/src/typen.ts`; in `studio-laufzeit` alle Verträge samt `weltAttrappe.ts`, fertig `bauplan/ordnung.ts` und
`bauplan/regler.ts`, leer die Zusammenbau-Dateien; leer das Effekt-Register von `studio-bild`. `apps/studio` hat die vier Seiten, Vite mit
festen Ständen, Playwright, die leer zusammengesetzten Server-Erweiterungen, `main.ts` (Papier, Titel „Studio“ in Lobster, leere
Bühne), Schreibhaken, Grenzen-Test und Probe M0; das Spiel Seite, Vite, Playwright, `main.ts` und `keinSpielcode.test.ts`.

**Probe M0 (a)** (20.11., 21:39, `m0-vertrag.mjs`; alle vier Teile wie erwartet):

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

**Prüfungen** (20.11. abends): Lint über alle 15 Studio-Pfade (118 Dateien) und Lizenzen (208 Pakete, 10 Ausnahmen mit Grund) grün;
Typen und Tests von `apps/studio` (9 Tests), `apps/ozzy-spiel` (4) und beider Werkzeuge grün; e2e Studio 10 von 10 und Spiel 2 von 2 in
Chromium und WebKit. Die übrigen Pakete prüft die Integration nach der Nacharbeit mit `pnpm studio:pruefen`.

**webdriverio unter Node 25.8.1** (Plan 5.3 „Ehrlich“): Es lädt (10.2.0 nennt Node 22, 24 oder ab 26.12.1) und läuft bis zur
Verbindung mit dem Treiber (`remote()` gegen einen Port ohne Treiber endet mit „Unable to connect …“). Eine Sitzung im echten Safari
braucht `safaridriver --enable` (Florian, B6); bis dahin bleibt es bei WebKit von Playwright. Kein Eintrag in Teil C nötig.

**Offen für die Integration:** Commit „M0 Vertrag“; `studio-laufzeit/src/bauplan/bauen.test.ts` (4.3) mit Ordnung und Regler beginnen;
`aufwand.json` (die Zeile für M0 ist aus Zeitstempeln nachgetragen; durch die Werte des Workflows ersetzen, Prüfung und Nacharbeit
dazu); im Plan nachtragen: 2.1 und 2.3 Nr. 6 (Erweiterungen der Grenzen oben), 6.3 (Grenze Worker-Threads), 7.1 (drei weitere
Lizenz-Ausnahmen: `@promptbook/utils` CC-BY-4.0 und die glob-Familie BlueOak-1.0.0 über webdriverio, `lightningcss` MPL-2.0 über
Vite), 2.2 (`e2e/seiten.spec.ts`, `scripts/proben/m0-vertrag.mjs`, `apps/ozzy-spiel/playwright.config.ts` und `e2e/seite.spec.ts`);
`pool: 'forks'` ausdrücklich in die `vitest.config.ts` der Pakete; Hinweis bei B6 zu webdriverio.

**An seiner Figur hat sich nichts geändert;** für Florian gibt es in M0 nichts zu prüfen.

## Fallen

- `pnpm --filter <name>` mit einem Namen, den es nicht gibt, läuft still mit Exitcode 0. Die Skripte rufen Pakete deshalb mit
  `pnpm -C <ordner>` oder mit `--fail-if-no-match` auf.
- pnpm 12 installiert vor `pnpm run` und `pnpm exec` von selbst, sobald eine `package.json` eine neue Abhängigkeit oder ein neues
  Paket nennt (Lockdatei und `node_modules` ändern sich; am 20.11. an einer Kopie nachgeprüft). Das verhindert erst
  `verifyDepsBeforeRun: error` in `pnpm-workspace.yaml`; bis dahin ändert nur der Vertragsschritt Abhängigkeiten und installiert gleich.
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
