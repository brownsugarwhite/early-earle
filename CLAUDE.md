# early earle — Projektgedächtnis

Diese Datei lädt jede Claude-Session automatisch. Sie hält den Stand, die Arbeitsregeln und die bekannten Fallen fest. Bei jedem größeren Schritt aktuell halten (kurz, Verweise statt Wiederholung).

## Stand: Prototyp 1 abgeschlossen, Produktion beginnt

- **2026-10-04: Prototyp 1 ist abgeschlossen** (Archiv-Branch `prototyp-1`). Er diente zum Lernen. Florian: „Der Prototyp war sehr gut und aufschlussreich und hat bewiesen, dass die Spielidee toll ist.“ Viele Entscheidungen sind gefallen; die Gesamtdynamik und einige grafische Elemente haben ihm gefallen.
- **Jetzt beginnt die eigentliche Produktion mit dem finalen Look.** Grundlage wird **Florians neuer Plan mit neuem Hauptprompt**: Story, Charaktere und Map arbeitet er genauer aus und trägt sie in Dokumenten und Screenshots zusammen. Es folgen mehrere Runden und Iterationen.
- **Bis der neue Plan da ist:** keine Produktionsarbeit auf Basis der alten Pläne beginnen und den Prototyp-Code nicht eigenmächtig weiterbauen. Florian führt zwischendurch eigene Tests durch (u. a. KI-3D-Werkzeuge in der Cloud).
- **2026-10-05: Look-Beweis Grundblobs + Mischwesen** (Branch `claude/grundblobs`, Artefakt https://claude.ai/artifact/JfvK1CAf11oqfJXAiLyf5p): 13 Grundformen aus Florians Vorlage in Jelly/fest/Fell, Meshy-Modelle in Module zerlegt. Stand, Werkzeuge, Lücken: [`docs/look/grundblobs/README.md`](docs/look/grundblobs/README.md). Florian: Die Grundform der Blobs soll auch die Tierthemen tragen. **Urteil:** Mischwesen aus zerschnittenen ganzen Meshy-Tieren sehen „ganz ganz schlimm“ aus (Maßstab, Pose, Stil und Nähte passen nicht) – so nicht weiterverfolgen. Verworfen ist dieser Zusammenbau, nicht Meshy: Florians ganze Meshy-Modelle treffen den Look weiterhin „fast perfekt“. Test beendet mit einem **Modulsystem** (Elemente, Andockringe, Sockel, Editor): [`docs/look/modulsystem/SYSTEM.md`](docs/look/modulsystem/SYSTEM.md); Schnittlinien noch nicht abgenommen („meistens viel zu wenig geschnitten“).
- **2026-10-08: Wesen-Werkstatt, Blöcke 1–9 + Shader** (Lippenschnitt, Kieferrig mit Schädelkippung, Silhouetten- und Maul-Editor, Raubkatzenkopf mit Kastenmaul und Nasenrampe, Musterzonen, Jelly-Lavalampe): Stand, Befunde und offene Punkte in [`docs/UEBERGABE.md`](docs/UEBERGABE.md); Florians Rückmeldungen chronologisch im Gedächtnis der Leitung. Harness-Bilder nur über `apps/game/e2e/wesen-shots.spec.ts` (Optionen in `docs/progress/wesen-lab-README.md`).
- **2026-10-07: Produktion beginnt mit Teil „Charaktere“.** Florian hat den Prototyp abgehakt und die Produktion in vier Teile gegliedert (Map, Spielfeld/Spielmechanik, Charaktere, UI). Zuerst entsteht die **Wesen-Werkstatt** (prozedurales Kreaturen-System + Charaktereditor) nach dem freigegebenen Plan [`docs/plans/2026-10-07-wesen-werkstatt.md`](docs/plans/2026-10-07-wesen-werkstatt.md): ein Bauplan je Wesen → implizite Form (Maul herausgeschnitten) → Skinned Mesh (Surface Nets im Worker) → gemaltes Earle-Wesen-Material nach Look-Vertrag; Phase 1 = Grundformen-Beweis mit Live-Reglern in `/lab/wesen`. **Das alte Spiel (Brett, Karte, Setzkasten, `packages/genome`, `render/src/creature`) bleibt unangetastet**, bis der Teil „Spielfeld“ umstellt. Neue Pakete: `packages/creature`, `packages/render/src/creature2`, `apps/game/src/lab/wesen`.
- Die vorhandenen Dokumente (`docs/GDD.md`, `docs/STYLE.md`, `docs/PRODUCTION.md`, ADRs) beschreiben den **Prototyp**. Sie sind Erfahrungsschatz und Ausgangsmaterial, kein Auftrag. Wo der neue Plan abweicht, gilt der neue Plan.
- **Vor jeder Planung lesen:** [`docs/prototyp/README.md`](docs/prototyp/README.md) (Abschluss, Entscheidungen, Lehren, offene Punkte) und die aktuelle Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md).

## Menschen

- **Florian** (illudiy): Art Direction, alle Entscheidungen, Blender, GPT-Entwürfe, Tests auf dem iPhone 16 („eyePhone (2)“) und dem Mac (M3 Pro). Arbeitet oft von unterwegs über die Claude-App und hat ein Wochenlimit.
- **Nicole**: Tests (Versuche pro Level), Kalibrierdaten, Content.
- Kommunikation **auf Deutsch**, kurz und konkret. Rückfragen nur bei echten Entscheidungen.

## Arbeitsregeln (aus Prototyp 1 gelernt)

1. **Look zuerst beweisen, dann bauen.** Vor größerem Code ein Vergleichsbild bauen (Vorlage und Render nebeneinander, gleiche Ansicht, gleicher Maßstab) und Florian zeigen. Nie Look-Gleichheit versprechen, ohne es getestet zu haben. Wenn ein fertiges Werkzeug (z. B. Meshy) den Look schneller trifft, das früh sagen. (Der prozedurale Wesen-Baukasten kostete einen Tag und blieb weit hinter einem Meshy-Test zurück, den Florian in Minuten gemacht hatte.) Nachtrag 2026-10-05: Bei unbewiesenen Ansätzen nicht „kann ich“ sagen, sondern „ich teste es, Kriterium X“; einen schnellen Test als Test zeigen und nicht als Ergebnis verkaufen (die Mischwesen wurden als „Meshy-Look“ angekündigt und waren unterirdisch).
2. **Früh und oft committen und pushen, Limits einplanen.** Das 5-Stunden-Limit teilen sich alle Sitzungen und Unteragenten (die nach der Limit-Meldung weiterlaufen); bei ≈ 90 % Übergabe schreiben und Agenten committen lassen. Der Cloud-Container ist flüchtig, Sessions enden abrupt am Nutzungslimit. Nach jedem abgeschlossenen Teilschritt pushen; am Ende jedes Arbeitsblocks `docs/UEBERGABE.md` überschreiben (Stand, offen, nächster Schritt). Lokale Sessions auf Florians Mac: nichts ungepusht liegen lassen.
3. **Pläne sofort ins Repo.** Lange Pläne erst als Datei unter `docs/` committen, dann zur Freigabe vorlegen. (Der Plan „Wesen-Baukasten v4“ lag nur in `~/.claude/plans` und wäre mit der Session verloren gegangen.)
4. **Florian testet live.** Den Dev-Server `game-dev` (`.claude/launch.json`, HTTPS 5173) startet Florian; Agenten starten ihn nicht ungefragt. Test-Fenster absprechen, sonst stören Änderungen seine Sitzung.
5. **Parallele Baustellen** in eigenen Git-Arbeitsbäumen mit Zuständigkeit nach Pfaden; Integration durch die Leitung; danach gemeinsam prüfen.
6. **Jede Änderung isoliert prüfen:** `pnpm typecheck`, `pnpm test`, `pnpm lint`, betroffene E2E. GPU-Tests (`e2e/webgpu.spec.ts`, `karte-perf-webgpu.spec.ts`) laufen nur lokal mit echter GPU; CI hat keine GPU (Smoke mit WebGL2/SwiftShader).
7. **Messen statt schätzen.** Leistungsaussagen mit Perf-Badge (fps, p99, Draw Calls) bzw. `?bench=…`; Ziele: iPhone ≥ 58 fps, p99 < 20 ms, 36 Wesen auf dem Brett, Draw Calls ≤ 100.
8. **Texte:** Deutsch, klare Sätze, keine Modellnamen in Commits, Docs oder Code. Nachträge mit Datum statt Altes zu überschreiben (außer `UEBERGABE.md`). Screenshots in `docs/progress/`.

## Cloud-Umgebung: Grenzen

- Keine echte GPU (Chromium mit SwiftShader), kein Blender (das pip-Paket `bpy` 5.0.1 wäre installierbar, ungetestet), iPhone nicht erreichbar.
- Git-Push geht auf Branches, **Tags lehnt der Proxy mit 403 ab** (Archiv deshalb als Branch, z. B. `prototyp-1`); **Branches löschen geht aus der Cloud auch nicht** (Florian löscht auf GitHub). Node 22 reicht für `pnpm install --frozen-lockfile`; Playwright im Repo erwartet eine andere Chromium-Version → `executablePath` auf `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; Screenshots mit DPR 1.
- Netz über einen Proxy: CDNs wie `cdn.jsdelivr.net` und viele Websites (z. B. meshy.ai, tripo3d.ai, costbench.com) sind gesperrt. npm-Registry und pip gehen. Für Artefakte three.js lokal per npm installieren und im Playwright-Test die CDN-URLs auf die lokale Kopie umleiten.
- Playwright: global unter `/opt/node-tools/node_modules/playwright`, Chromium unter `/opt/pw-browsers` (nicht `playwright install` ausführen). CDN-Skripte im Test per `route.fulfill` aus der lokalen Kopie liefern (`route.continue` auf http geht nicht).
- **Artefakte liefern kein `.glb` aus** (nur Web-Typen wie .json/.txt/.jpg/.png). Meshes deshalb gepackt als gzip+base64-`.txt` laden (`DecompressionStream`), siehe `docs/look/grundblobs/tools/packen.py`.
- **pymeshlab** (texturtreues Ausdünnen) braucht `apt-get install libopengl0 libglu1-mesa`; es liest GLB mit Wedge-UVs, kann Texturen aber nicht schreiben (Textur direkt aus dem GLB lesen) und liefert UVs mit Ursprung unten links (`flipY = true`). Bedingungen in muparser kennen kein `!` (`(...) == 0`).
- Meshy-GLBs mit 1,5 Mio. Dreiecken sprengen den Speicher bei `trimesh.split`: erst ausdünnen, dann schneiden; Nähte (UV) vor Komponenten- und Randberechnung verschweißen.

## Bekannte technische Fallen (nicht wiederholen)

- **iOS-App ≠ Safari:** Die App läuft unter `capacitor://localhost` (kein HTTPS) und bekommt vermutlich WebGL2 statt WebGPU. Fehler „nur in der App“ zuerst im WebGL2/WebKit-Pfad suchen (`?backend=webgl`, `?shadowcompat=manual`). In der App höchstens 60 fps. Auf dem Gerät gibt es keine Sicht auf GPU-/Shaderfehler → Fehleranzeige im Spiel einplanen, sonst Safari-Web-Inspektor mit Debug-Build. (Offener Fall: Kartenboden fehlte nur in der App, `docs/prototyp/README.md` §7.2.)
- **WebKit-Schatten:** `sampler2DShadow` liefert immer 0 → manueller Tiefenvergleich mit `textureLoad` (three r186 erzeugt `textureLod` ohne `.x`; Fix `019cf25`). Ein kaputter Vergleich färbt den Boden in Tinte `#081b25` = Hintergrundfarbe, der Boden wirkt verschwunden.
- **WebGPU braucht HTTPS**, sonst stiller WebGL2-Fallback. Der Perf-Badge zeigt das Backend; `?backend=webgl` erzwingt den Fallback. Der iOS-Simulator kann nur WebGL2; WebGPU nur auf dem Gerät.
- **TSL-Funktions-Cache pro Builder** (`packages/render/src/common/tslFunctionCache.ts`). three.js baut TSL-Layout-Funktionen sonst einmal pro Backend und gibt sie an spätere Pipelines ohne deren Puffer weiter (WGSL „unresolved value NodeBuffer“): Plateau und Wesen waren unsichtbar.
- **three r186 Schatten:** `ShadowNode` zeichnet höchstens einmal je `frameId` und Kamera; mehrere `render()` in einer Aufgabe zeichnen den Schatten nur im ersten. Benchmarks müssen `nodeFrame` je Bild weiterschalten.
- **Draw Calls wachsen mit der Wesen-Vielfalt:** `CreatureMeshBodies.variantFor()` legt ein Mesh pro Formschlüssel an, `PartPool` ein InstancedMesh pro Modul. `BatchedMesh` zeichnet in three r186 (WebGPU) pro Instanz. Der `BlobParamBlock` liegt nahe der 16-KB-Uniform-Grenze. Die Produktions-Architektur muss Vielfalt tragen (ein Draw Call für alle Körper, Zustand als Datentextur).
- **Draw Calls messen** per Hook auf `renderer.info` (nicht am Perf-Badge), erst nach dem Brett-Warmup, Median/Max über 10 Bilder. Große Objekte per Horizont-Formel `acos(R/(R+H))` kullen.
- **Schatten:** Florian will echte, scharfe Schatten ohne Wackeln bei 60 fps; **keine Decal-/aufgelegten Schatten**, Sonne kameragebunden 10°/70°. Wackeln kommt vom Refit je Bild → eingerastete Karte, Slide statt Refit. Bandsplitter bei tiefer Sonne sind keine Risse.
- **Karte:** `rebuildContent` beim Schwenken ist der größte Hauptthread-Posten; Schattenpässe verdoppeln die Draw Calls (Mac-Baseline `docs/progress/karte-perf-mac-baseline.md`, iPhone-Protokoll `karte-perf-iphone16.md`).
- **E2E:** `E2E_PORT` für parallele Läufe; Fetch-Sperrports wie 4190 meiden; nur auf ruhiger Maschine (SwiftShader unter Last → Timeouts); während eines Laufs keine Dateien im Vite-Root ändern (Hot Reload); echte GPU `EE_GPU=1` ist Referenz. CI pro Push nur Typen, Unit-Tests, Lint, Build; E2E wöchentlich oder auf Knopfdruck.
- **Werkzeuge:** JSON-Inhalte nie per `json.dumps` neu schreiben (formatiert die Datei um), gezielt Zeilen ersetzen. macOS: BSD-`sed` (kein `\b`, `-i ''`) → Python; Dateisystem unterscheidet keine Groß-/Kleinschreibung. Vorschau-Tool kann selbstsigniertes HTTPS nicht öffnen → Konfiguration `game-dev-http` (Port 5174).
- **Schrift:** Caprasimo (OFL) mit `unicode-range`, ihre Mathe-Zeichen sind Platzhalter.
- **TSL-Werte in `If`-Zweigen:** Ein Node, den mehrere `If`-Zweige teilen, wird nur im ersten Zweig gebaut, der ihn benutzt — in den anderen ist er 0 (Schuppen, Platten, Punkte, Rosetten, Flecken wurden deshalb nie gezeichnet). Gemeinsame Werte **vor** den Zweigen mit `.toVar()` festhalten. Außerdem macht `hash()` aus three/tsl negative Eingaben zu 0, und die Zellkennung `x + 57·y + 113·z` kollidiert (Streifen im Korn) → `hashPos`/`hash3` in `material/muster.ts` benutzen.
- **three.js-Lichter sind ebenengefiltert:** Wer mit `camera.layers` getrennte Pässe rendert (z. B. Hintergrund für Jelly-Brechung), muss den Lichtern `layers.enableAll()` geben, sonst ist der Pass schwarz. Eine eigene Klasse `Blob` verdeckt das globale `Blob` (TDZ-Fehler) – nicht so nennen.
- **Grundform aus Zeichnung:** Silhouette an der Standlinie spiegeln und per Poisson aufblasen (Dicke ~ √Randabstand), glattes Abstandsfeld statt Voxel (sonst Treppen), weicher Betrag statt |z| (sonst Kante am Rand), nach Marching Cubes nur die größte Komponente behalten (sonst Splitter → Taubin zieht Spitzen). Details, die *vor* dem Körper gezeichnet sind (Füße Stufe 13), liegen nicht in der Silhouette und brauchen Zusatzformen.
- **iPhone-Deploy:** `IOS_TEAM_ID=R67BLW649H IOS_DEVICE="eyePhone (2)" pnpm --filter @ee/game ios:device` (Florians Mac; iPhone entsperrt lassen, sonst nur Installation ohne Start); Details in `docs/IOS.md`. Ein gemeinsamer Deploy am Ende eines Arbeitsblocks, mit parallelen Sessions abgestimmt.

## Projekt-Landkarte

- `packages/core` Regeln und Solver (DOM-frei, gemeinsamer Vertrag) · `packages/genome` Wesen-Daten (SDF-Körper, Module, Vererbung, Fortbewegung) · `packages/physics` · `packages/world` Karte (unendliche Ebene, Route) · `packages/render` three.js WebGPU/TSL.
- `apps/game` Vite + React + Capacitor (Routen `/`, `/play`, `/lab/*`, `/editor/*`, Werkstatt in der App) · `apps/godot` Vergleichstrack (ruht).
- `content/` alle Inhalte als JSON mit zod-Schemas (Level, Zonen, Route, Genom, REX, Klassik) · `tools/` Blender-Skripte, Export, Level-Werkzeuge · `assets/` Blender-Bibliothek, Florians Referenzen, Schriften.
- `docs/` Pläne (Prototyp-Stand), `docs/prototyp/` Abschluss, `docs/research/` Recherchen, `docs/progress/` Bilder und Messungen.
- Befehle: `pnpm install`, `pnpm dev` (HTTPS), `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm e2e`, `pnpm assets:blender`.

## Offene Grundsatzentscheidungen für die Produktion

- **Wesen-Pipeline:** KI-3D (Meshy/Tripo) + Zerlegen in Module + Farbe/Muster im Shader, oder prozedural, oder eine Mischung. Florian testet noch. Material: `docs/research/ki-3d-tools-2026-10.md`, `docs/prototyp/wesen-v4-plan-unbestaetigt.md`.
- **Stack-Gate** (ADR-0001) formal offen: three.js + Capacitor ist der Arbeits-Track und erfüllte auf dem iPhone 16 die Bildratenziele; Godot ruht als Fallback.
- Erlösmodell, Name „early earle“ (Markenrecht), Tierschutz-Modell (GDD §11–12, §15).
