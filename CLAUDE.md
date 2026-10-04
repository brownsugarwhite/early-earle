# early earle — Projektgedächtnis

Diese Datei lädt jede Claude-Session automatisch. Sie hält den Stand, die Arbeitsregeln und die bekannten Fallen fest. Bei jedem größeren Schritt aktuell halten (kurz, Verweise statt Wiederholung).

## Stand: Prototyp 1 abgeschlossen, Produktion beginnt

- **2026-10-04: Prototyp 1 ist abgeschlossen** (Git-Tag `prototyp-1`). Er diente zum Lernen. Florian: „Der Prototyp war sehr gut und aufschlussreich und hat bewiesen, dass die Spielidee toll ist.“ Viele Entscheidungen sind gefallen; die Gesamtdynamik und einige grafische Elemente haben ihm gefallen.
- **Jetzt beginnt die eigentliche Produktion mit dem finalen Look.** Grundlage wird **Florians neuer Plan mit neuem Hauptprompt**: Story, Charaktere und Map arbeitet er genauer aus und trägt sie in Dokumenten und Screenshots zusammen. Es folgen mehrere Runden und Iterationen.
- **Bis der neue Plan da ist:** keine Produktionsarbeit auf Basis der alten Pläne beginnen und den Prototyp-Code nicht eigenmächtig weiterbauen. Florian führt zwischendurch eigene Tests durch (u. a. KI-3D-Werkzeuge in der Cloud).
- Die vorhandenen Dokumente (`docs/GDD.md`, `docs/STYLE.md`, `docs/PRODUCTION.md`, ADRs) beschreiben den **Prototyp**. Sie sind Erfahrungsschatz und Ausgangsmaterial, kein Auftrag. Wo der neue Plan abweicht, gilt der neue Plan.
- **Vor jeder Planung lesen:** [`docs/prototyp/README.md`](docs/prototyp/README.md) (Abschluss, Entscheidungen, Lehren, offene Punkte) und die aktuelle Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md).

## Menschen

- **Florian** (illudiy): Art Direction, alle Entscheidungen, Blender, GPT-Entwürfe, Tests auf dem iPhone 16 („eyePhone (2)“) und dem Mac (M3 Pro). Arbeitet oft von unterwegs über die Claude-App und hat ein Wochenlimit.
- **Nicole**: Tests (Versuche pro Level), Kalibrierdaten, Content.
- Kommunikation **auf Deutsch**, kurz und konkret. Rückfragen nur bei echten Entscheidungen.

## Arbeitsregeln (aus Prototyp 1 gelernt)

1. **Look zuerst beweisen, dann bauen.** Vor größerem Code ein Vergleichsbild bauen (Vorlage und Render nebeneinander, gleiche Ansicht, gleicher Maßstab) und Florian zeigen. Nie Look-Gleichheit versprechen, ohne es getestet zu haben. Wenn ein fertiges Werkzeug (z. B. Meshy) den Look schneller trifft, das früh sagen. (Der prozedurale Wesen-Baukasten kostete einen Tag und blieb weit hinter einem Meshy-Test zurück, den Florian in Minuten gemacht hatte.)
2. **Früh und oft committen und pushen.** Der Cloud-Container ist flüchtig, Sessions enden abrupt am Nutzungslimit. Nach jedem abgeschlossenen Teilschritt pushen; am Ende jedes Arbeitsblocks `docs/UEBERGABE.md` überschreiben (Stand, offen, nächster Schritt). Lokale Sessions auf Florians Mac: nichts ungepusht liegen lassen.
3. **Pläne sofort ins Repo.** Lange Pläne erst als Datei unter `docs/` committen, dann zur Freigabe vorlegen. (Der Plan „Wesen-Baukasten v4“ lag nur in `~/.claude/plans` und wäre mit der Session verloren gegangen.)
4. **Florian testet live.** Den Dev-Server `game-dev` (`.claude/launch.json`, HTTPS 5173) startet Florian; Agenten starten ihn nicht ungefragt. Test-Fenster absprechen, sonst stören Änderungen seine Sitzung.
5. **Parallele Baustellen** in eigenen Git-Arbeitsbäumen mit Zuständigkeit nach Pfaden; Integration durch die Leitung; danach gemeinsam prüfen.
6. **Jede Änderung isoliert prüfen:** `pnpm typecheck`, `pnpm test`, `pnpm lint`, betroffene E2E. GPU-Tests (`e2e/webgpu.spec.ts`, `karte-perf-webgpu.spec.ts`) laufen nur lokal mit echter GPU; CI hat keine GPU (Smoke mit WebGL2/SwiftShader).
7. **Messen statt schätzen.** Leistungsaussagen mit Perf-Badge (fps, p99, Draw Calls) bzw. `?bench=…`; Ziele: iPhone ≥ 58 fps, p99 < 20 ms, 36 Wesen auf dem Brett, Draw Calls ≤ 100.
8. **Texte:** Deutsch, klare Sätze, keine Modellnamen in Commits, Docs oder Code. Nachträge mit Datum statt Altes zu überschreiben (außer `UEBERGABE.md`). Screenshots in `docs/progress/`.

## Cloud-Umgebung: Grenzen

- Keine echte GPU (Chromium mit SwiftShader), kein Blender (das pip-Paket `bpy` 5.0.1 wäre installierbar, ungetestet), iPhone nicht erreichbar.
- Netz über einen Proxy: CDNs wie `cdn.jsdelivr.net` und viele Websites (z. B. meshy.ai, tripo3d.ai, costbench.com) sind gesperrt. npm-Registry und pip gehen. Für Artefakte three.js lokal per npm installieren und im Playwright-Test die CDN-URLs auf die lokale Kopie umleiten.
- Playwright: global unter `/opt/node-tools/node_modules/playwright`, Chromium unter `/opt/pw-browsers` (nicht `playwright install` ausführen).

## Bekannte technische Fallen (nicht wiederholen)

- **WebGPU braucht HTTPS**, sonst stiller WebGL2-Fallback. Der Perf-Badge zeigt das Backend; `?backend=webgl` erzwingt den Fallback. Der iOS-Simulator kann nur WebGL2; WebGPU nur auf dem Gerät.
- **TSL-Funktions-Cache pro Builder** (`packages/render/src/common/tslFunctionCache.ts`). three.js baut TSL-Layout-Funktionen sonst einmal pro Backend und gibt sie an spätere Pipelines ohne deren Puffer weiter (WGSL „unresolved value NodeBuffer“): Plateau und Wesen waren unsichtbar.
- **three r186 Schatten:** `ShadowNode` zeichnet höchstens einmal je `frameId` und Kamera; mehrere `render()` in einer Aufgabe zeichnen den Schatten nur im ersten. Benchmarks müssen `nodeFrame` je Bild weiterschalten.
- **Draw Calls wachsen mit der Wesen-Vielfalt:** `CreatureMeshBodies.variantFor()` legt ein Mesh pro Formschlüssel an, `PartPool` ein InstancedMesh pro Modul. `BatchedMesh` zeichnet in three r186 (WebGPU) pro Instanz. Der `BlobParamBlock` liegt nahe der 16-KB-Uniform-Grenze. Die Produktions-Architektur muss Vielfalt tragen (ein Draw Call für alle Körper, Zustand als Datentextur).
- **Karte:** `rebuildContent` beim Schwenken ist der größte Hauptthread-Posten; Schattenpässe verdoppeln die Draw Calls (Mac-Baseline `docs/progress/karte-perf-mac-baseline.md`, iPhone-Protokoll `karte-perf-iphone16.md`).
- **E2E:** `E2E_PORT` für parallele Läufe; Fetch-Sperrports wie 4190 meiden; Wartezeiten an SwiftShader anpassen.
- **Schrift:** Caprasimo (OFL) mit `unicode-range`, ihre Mathe-Zeichen sind Platzhalter.
- **iPhone-Deploy:** `IOS_TEAM_ID=R67BLW649H IOS_DEVICE="eyePhone (2)" pnpm --filter @ee/game ios:device` (Florians Mac); Details in `docs/IOS.md`.

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
