# Wesen-Editor: Grundlayout, Navigation und Kurven (eigene Desktop-App)

## Kontext

Florian baut den Charaktereditor grundlegend neu: weg von Reglern, hin zu einem Shape-/3D-Editor. Er zieht drei 2D-Profile (Seite, Front, Top) wie in Illustrator, und daraus entsteht live das 3D-Wesen. Diese Session liefert die Oberfläche, die Navigation und das Bearbeiten der Kurven als eigenständige Desktop-App. Die echte Bauweise der Wesen folgt nächste Woche in einer großen Session auf diesem Gerüst.

**Vorlagen:**
- Bild 1 (Layout)
- Bild 2 (Eckknöpfe)
- `~/Desktop/2048/editorRefs/figmaScreenshot.png`, 3456×2322 = 2× bei 1728×1161 CSS-px

Stil: „Eyvind Earle meets Neo-Brutalismus in a liquid glass“. Keine Konturen.

**Entschieden (Fragerunde 11.10.):**
- Umfang: Layout + Navigation + Kurven bearbeiten + Platzhalter-3D
- App `apps/editor` im Monorepo
- Speichern und Library funktionieren echt
- Der maximierte Viewport bleibt auf seiner Seite

**Bestehender Code:** Der alte Silhouetten-Editor (`apps/game/src/lab/wesen/SeitenprofilEditor.tsx`) ist ein fester SVG-Kasten ohne Griffe, Ecken, Zoom und Einfügen.
- Übernommen wird nur sein Zieh-Muster (`setPointerCapture` plus Listener am Fenster) und das Gesten-Undo (`beginGeste`/`endeGeste` in `wesenStore.ts`).
- `three` 0.186.1, React 19, Vite 8, zustand 5 und zod 4 sind im Repo gesetzt; der Editor nutzt dieselben Versionen.
- Altes Spiel, `packages/creature` und `packages/render` bleiben unangetastet.

## Antworten auf Florians Fragen (für die Chat-Antwort)

- **Repo:** Der Editor wird eine eigene App im Monorepo.
  - Das Format liegt im DOM-freien Paket `packages/shape`.
  - Der Editor bekommt eine eigene `apps/editor/CLAUDE.md`.
  - Grund: Das Spiel lädt später genau dieses Format; geteilte Technik bleibt nutzbar.
  - Abspalten geht jederzeit mit Historie.
- **Desktop:** Electron.
  - Chromium bedeutet WebGPU wie in unseren Tests, dazu Dateizugriff.
  - Tauri würde Safari-WebKit mit den bekannten Fallen nutzen.
  - Der Renderer läuft zusätzlich im Browser (Web-Modus) für Vorschau und Playwright.
- **Automatische Punkte:** teilweise richtig.
  - Neue Punkte bei zu langen Segmenten: ja. Sie werden formtreu per De-Casteljau eingefügt, die Form springt nicht.
  - Die Symmetrie kommt von der Spiegelung, nicht von der Verteilung.
  - Für Posen und Blendshapes zählt eine gemeinsame Punktstruktur: Das Netz hat eine feste Auflösung, in Posen werden Punkte nur verschoben, und Einfügungen gelten formtreu für alle Posen.
  - Bestehende Punkte beim Ziehen wandern zu lassen, empfehle ich nicht.

## Gestaltung (Maße aus der Vorlage, CSS-px bei 1728×1161)

**Farben und Schrift:**
- Grund `#19232B`
- Pillen `#75005C`, aktiv `#FF0095`, weiß
- Schrift Irish Grover (Apache-2.0, `@fontsource/irish-grover`). Umlaute prüfen; fehlen sie, Florian Alternativen zeigen.

**Verlauf:**
- `#B5BB72` (unten links) → `#D0FF47` (oben rechts)
- Ein Verlauf für alle Viewports: `background-attachment: fixed`, die Viewports sind Fenster hinein
- Deshalb keine Transforms auf Vorfahren

**Raster und Menüleiste:**
- Rand und Lücken je 40 px
- Pillen y 21–47, Abstand 10 px
- Viewports ab y 84, je (B−120)/2 × (H−164)/2, flüssig
- Titel „side / front / top / creation“ weiß in der Lücke darüber
- Richtungslabels unten in Tinte

**Eckknöpfe:**
- Ø≈19 px, `#A67F2C`, `#0090FF`, `#FF00FF`
- Im 3D-Viewport nur Pink; Braun und Blau sind vorerst ohne Funktion
- Der blaue Rahmen in Bild 2 ist vermutlich Figmas Auswahl, kein Gestaltungselement

**Kachel:**
- Quadrat mit Kante 0,925 × Viewporthöhe (Grundansicht)
- Seite/Front: Boden 20 px über der Unterkante, Verlauf 10 % Schwarz → 0 nach oben
- Top: zentriert, gleichmäßig 10 %

**Kurven (Florians Vorgabe 11.10.):**
- Kontur **3 px**, editierbar schwarz, gespiegelte Hälfte weiß
- Punkte **rund Ø 10 px**, cyan `#00FFE1`
- Bézier-Griffe als **6-px-Quadrate** an einer 1-px-Linie: cyan, gespiegelt weiß; nur am gewählten Punkt
- Achse gepunktet
- Alle Maße bleiben bei jedem Zoom gleich groß

**Startform (Florian 11.10.):** Jedes neue Wesen startet immer als Kugel wie im Screenshot, also drei Kreise. Das gilt beim App-Start und bei „Neues Wesen“, eine gespeicherte Vorlage hat darauf keinen Einfluss.
- Seite: ganzer Kreis, 12 Punkte
- Front und Top: Halbkreis, 7 Punkte, editierbar rechts bzw. oben
- Durchmesser 0,53 Kachel, steht auf dem Boden

**3D:**
- Erzeugte Matcap im hellen „Blender-Solid“-Look: Licht hängt an der Ansicht, unabhängig vom Schatten
- Kachel als 10-%-Raute
- Harter Schatten von einem eigenen Sonnenlicht von rechts (Schattenkarte 2048, `ShadowNodeMaterial`)
- Kamera schräg über die Kachelecke wie in der Vorlage
- Transparenter Canvas über dem Verlauf

**Mein Entwurf zur Abnahme (nicht in der Vorlage):**
- Library-Panel, Posen-Dropdown und Rechtsklickmenü als Liquid Glass (Chromium `backdrop-filter` mit SVG-Verdrängung, Glanzkante, ohne Kontur)
- Größen-Regler als Pille im Button-Stil
- Neo-brutale Akzente: Flächen, harter Versatzschatten, fette Schrift

## Architektur

```
packages/shape/            @ee/shape, DOM-frei, Vitest
  src/bezier.ts            Auswerten, Teilen (De Casteljau), Länge, nächster Kurvenpunkt
  src/profil.ts            Knoten {p, ein, aus, art: glatt|ecke}, Profil (geschlossen | Halbprofil mit Spiegelachse),
                           Startkreise, Achsregeln, Auto-Teilung, Einfügen/Löschen/Glätten
  src/dokument.ts          zod-Schema v0: {version, name, profile{seite,front,top}, skalierung, posen[]}
  src/platzhalter/loft.ts  PLATZHALTER-Körper (klar benannt), feste Auflösung
apps/editor/               @ee/editor
  electron/main.ts         Fenster 1728×1117, dunkle Titelleiste, App-Menü mit Kürzeln, IPC Bibliothek
  electron/preload.ts      contextBridge → window.editorApi (contextIsolation, sandbox)
  vite.config.ts           vite-plugin-electron (Vite ≥ 6; electron-vite kann kein Vite 8);
                           EDITOR_WEB=1 → reiner Web-Modus (Port 5180, http; localhost ist sicherer Kontext)
  src/state/               editorStore (Dokument + Undo per Gesten), uiStore (Auswahl, Ansichten, Layout)
  src/layout/layout.ts     reine Funktion: Fenstergröße + Modus + Library → Rechtecke (getestet)
  src/layout/springs.ts    Federanimation der Rechtecke per rAF, schreibt direkt ins DOM
  src/menu/                MenuBar, PoseDropdown, ScaleSlider
  src/viewports/           Viewport (Rahmen, Titel, Eckknöpfe), View2D (SVG), view2d.ts (Pan/Zoom), Tile2D
  src/three/               Renderer3D (ein Vollfenster-Canvas, Scissor auf das Creation-Rechteck,
                           nur bei Änderung rendern), matcap.ts, orbit.ts
  src/editing/             Zieh-Logik, ContextMenu
  src/library/             LibraryPanel, Speicher (Electron-IPC, sonst localStorage)
  e2e/editor.spec.ts, playwright.config.ts, CLAUDE.md, README.md
```

**Renderer:**
- `WebGPURenderer` aus `three/webgpu` (WebGL2-Rückfall automatisch, `?backend=webgl` zum Prüfen) für Parität mit dem Spiel und dem späteren Earle-Material
- Ein Vollfenster-Canvas vermeidet Canvas-Resizes während der Animationen
- Rückfall, falls Scissor zickt: Canvas im Viewport plus ResizeObserver

**Platzhalter-Loft:**
- Stationen entlang vorn → hinten (Kosinus-Abstände)
- Seite liefert die Höhe (unten/oben je Station), Top die Halbbreite, Front die normierte Querschnittsform
- Drei Kreise ergeben eine Kugel
- Ecken aus jedem Profil bleiben als Knick sichtbar
- Etwa 96×96 Vertices, feste Anzahl, synchron bei jedem Zug
- Grenze: Überhänge bzw. nicht monotone Seitenprofile werden nur angenähert; das löst die Session nächste Woche

## Bedienung

**Navigation (wie Blender, wirkt auf den Viewport unter der Maus):**
- Mausrad zoomt; in 2D zum Cursor hin, in 3D zum Drehpunkt
- Mittlere Taste ziehen verschiebt die Ansicht, in allen Viewports
- Rechte Taste ziehen dreht die Szene, nur in 3D
- Zusätzlich:
  - Pos1 setzt die Ansicht zurück
  - ⌃Leertaste maximiert (wie Blender)
  - ⌘Z / ⇧⌘Z
  - Entf löscht den Punkt
  - Esc hebt die Auswahl auf
  - ⌘S speichert
  - ⌘N legt ein neues Wesen an

**Kurven:**
- Klick wählt einen Punkt und zeigt seine Griffe
- Ziehen bewegt Punkt oder Griff; Griffe bleiben ohne Option eine Linie durch den Punkt (Längen frei, wie Illustrator)
- ⌥ beim Griff-Ziehen bricht die Linie und macht eine Ecke
- Achspunkte bleiben auf der Achse, glatt mit Griff quer zur Achse
- Segmente über der Höchstlänge werden beim Ziehen automatisch formtreu geteilt
- Rechtsklick auf einen Punkt: „Punkt einfügen“, „Punkt löschen“, „Punkt glätten“ (nur bei Ecken)
- Rechtsklick auf die Kurve: „Punkt hier einfügen“
- Mindestpunktzahl 4 (geschlossen) bzw. 3 (halb)
- Jeder Zug ist ein Undo-Schritt
- Das 3D-Fenster folgt live

**Pinker Knopf:**
- Der Viewport wird quadratisch auf volle Höhe und bleibt auf seiner Seite
- Die drei anderen rutschen in Lesereihenfolge in die freie Spalte
- Erneut drücken stellt das 2×2-Raster wieder her; Pink an einem kleinen Viewport tauscht
- Der Inhalt wächst mit, die Zoomstufe ist relativ zur Viewporthöhe
- Federanimation ohne Überschwingen (Panel leicht federnd); der Ziel-Viewport liegt während der Bewegung oben

**Library:**
- Das Glaspanel (≈ 400 px) gleitet von rechts herein, die Viewports verlieren weich an Breite
- Kategorien „Wesen“ (gespeicherte) plus leere Fächer: Augen, Flügel, Mäuler, Beine, Schwänze, Ohren, Muster
- Karten mit Vorschaubild auf dem Verlauf; Klick lädt ein Wesen

**Menüleiste:**
- Editor und Fressen sind Tabs
- „Neue Pose ▼“ bietet Ruhen, Laufen und Inklusion; die Wahl fügt einen Tab rechts neben Fressen an
- Rechtsklick auf einen Pose-Tab: „Pose entfernen“
- Pose-Tabs werden im Dokument gespeichert; das echte Pose-Bearbeiten folgt nächste Woche, bis dahin zeigen alle Tabs die Grundform
- Größen-Regler (25–300 %) skaliert das Wesen in allen Ansichten relativ zur festen Kachel
- „Neues Wesen“ startet immer mit der Kugel aus drei Kreisen und Größe 100 %; ungespeicherte Änderungen werden vorher bestätigt
- „Speichern“ schreibt `<name>.json` plus ein Vorschau-PNG (gerendert aus der Creation-Kamera in ein RenderTarget, auf den Verlauf gesetzt)
  - Ordner: `~/Documents/early earle Editor/Bibliothek/`
  - Menüpunkt „Im Finder zeigen“
  - Den Umzug ins Repo-`content/` entscheiden wir, wenn das Spiel Wesen lädt

## Schritte (nach jedem Schritt committen und pushen, Branch `claude/editor-grundlayout`)

0. **Sichern:**
   - Diesen Plan nach `docs/plans/2026-10-11-editor-grundlayout.md` kopieren
   - Vorlagen nach `docs/look/editor/`: `figmaScreenshot.png`, `01-grundlayout.webp`, `02-eckknoepfe.png`
1. **Gerüst:**
   - `packages/shape` und `apps/editor` anlegen
   - Electron-Fenster plus Web-Modus
   - Schrift und Tokens
   - Root:
     - Skript `"editor"`
     - `pnpm-workspace.yaml` `allowBuilds: electron: true`
     - ESLint-Ignores `apps/editor/{dist,dist-electron,release}`
     - `.claude/launch.json` `editor-web` (Port 5180)
     - CI-Umgebung `ELECTRON_SKIP_BINARY_DOWNLOAD=1` in `.github/workflows/web.yml`
   - Electron-Version mindestens zwei Wochen alt (pnpm-Mindestalter beachten)
2. **Statisches Layout exakt nach Vorlage**, inklusive Kugel, Kachel und Schatten. Danach **Vergleichsbild** Vorlage | Render bei 1728×1161 @2×:
   - ablegen als `docs/progress/editor/vergleich-grundlayout.png`
   - Florian per SendUserFile schicken (Look zuerst beweisen), Abweichungen nachziehen
3. **Navigation:** Zoom, Pan, Orbit, Pos1, feste Griffgröße.
4. **Animationen:** Maximieren und Library mit Federn.
5. **Kurven bearbeiten** in `packages/shape` mit Tests, Interaktion und Kontextmenü, Undo, Platzhalter-Loft live im 3D.
6. **Menüfunktionen:** Posen-Tabs, Größen-Regler, Neues Wesen, Speichern, Library-Inhalt.
7. **Abschluss:**
   - Tests
   - `.app` paketieren mit `electron-builder --mac --dir` → `apps/editor/release/mac-arm64/early earle Editor.app` (unsigniert, lokal gebaut)
   - `apps/editor/CLAUDE.md` und `README.md`
   - `docs/UEBERGABE.md` überschreiben
   - `CLAUDE.md` „Stand“ und Landkarte ergänzen
   - Gedächtnis aktualisieren
   - Merge nach `main` nach Florians Abnahme

`packages/shape` (Schritt 5, Mathe plus Tests) kann parallel zu Schritt 2–4 ein Agent im eigenen Arbeitsbaum bauen (Zuständigkeit nur `packages/shape/**`).

## Prüfung

- **Pro Schritt:** `pnpm typecheck`, `pnpm test`, `pnpm lint`.
- **Unit (`packages/shape`):**
  - Teilen ist formtreu (Stichproben < 1e-9)
  - Auto-Teilung über der Schwelle
  - Achs- und Glatt/Ecke-Regeln
  - Löschgrenzen
  - zod-Rundreise
  - Loft: drei Kreise ergeben eine Kugel (Radiusfehler < 2 %), Vertexzahl konstant über verschiedene Formen
- **Unit (`apps/editor`):**
  - Layout-Rechtecke: Raster, jede Maximierung, Library offen, Lücken 40, großes Feld quadratisch
  - Zoom zum Cursor hält den Weltpunkt fest
- **E2E** (`apps/editor/e2e`, Web-Modus, eigener `E2E_PORT`, ruhige Maschine):
  - 4 Viewports vorhanden
  - Rad zoomt, Mitteltaste verschiebt
  - Pink maximiert (quadratisch, volle Höhe) und kehrt zurück
  - Library öffnet, die Viewports werden schmaler
  - Punkt ziehen ändert den Pfad und das 3D bei gleicher Vertexzahl
  - ⌥-Griff ergibt eine Ecke
  - Kontextmenü: Punktzahl ±1
  - Speichern erzeugt eine Library-Karte
  - Bilder nach `docs/progress/editor/`
- **Live:**
  - Vorschau-Tool mit `editor-web` (eigener Port; stört Florians `game-dev` nicht)
  - Konsole ohne Fehler
  - Backend-Anzeige WebGPU, Gegenprobe `?backend=webgl`
  - Animationen per Screenshot-Serie prüfen
  - Am Ende einmal das Electron-Fenster starten (vorher ankündigen) und Speichern auf Platte prüfen

## Risiken

- **Irish Grover ohne Umlaute:** Glyphen früh prüfen.
- **Scissor-Ursprung** WebGPU vs. WebGL2: beide Backends testen, sonst Rückfall Canvas im Viewport.
- **Überlappung beim Maximieren:** Weil alle Viewports denselben Verlauf zeigen, verschmelzen sie kurz. z-Reihenfolge und Timing am Bild prüfen.
- **`background-attachment: fixed`** bricht bei Transforms. Animationen deshalb über left/top/width/height, nicht über Transforms.

## Nachträge (11.10. nachmittags, nach Florians erstem Test)

- **Ein Objekt, drei Ansichten:** Geteilte Ausdehnungen sind gekoppelt (Seite↔Front Höhe, Seite↔Top Länge, Front↔Top Breite). Die andere Ansicht folgt live mit proportionalem Abfall.
- **3D drehen** auch mit linker Taste und Trackpad.
- **Automatische Punkte verworfen:** Punkte setzt Florian von Hand wie in Illustrator (Zeichenstift P, + / −, Rechtsklickmenü).
- **Startkreis mit 4 Punkten** statt 12; Auswahlrechteck, ⇧-Klick und Pfeiltasten wie in Illustrator.
