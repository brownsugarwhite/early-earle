# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-11 mittags, Sitzung „Wesen-Editor: Grundlayout“ (Florians Mac). Branch `claude/editor-grundlayout`, gepusht; Merge nach `main` nach Florians Abnahme. Plan: [`docs/plans/2026-10-11-editor-grundlayout.md`](plans/2026-10-11-editor-grundlayout.md). Gedächtnis des Editors: [`apps/editor/CLAUDE.md`](../apps/editor/CLAUDE.md), Bedienung: [`apps/editor/README.md`](../apps/editor/README.md).

Vorheriger Stand (Wesen-Werkstatt in `/lab/wesen`, Blöcke 1–11, 09.10.): `git show 6029362:docs/UEBERGABE.md`. Die Werkstatt bleibt unangetastet, bis Florian entscheidet, was der neue Editor von ihr übernimmt.

## Was steht

Florian baut den Charaktereditor neu: Er zieht drei Profile (Seite, Front, Top), und daraus entsteht live das Wesen. Diese Sitzung lieferte die Oberfläche als **eigenständige Desktop-App** (`apps/editor`, Electron 44 + Vite 8 + React + three r186 WebGPU) und das DOM-freie Formatpaket `packages/shape`.

- **Layout** exakt nach Florians Figma-Vorlage: Menüleiste, vier Viewports mit gemeinsamem Verlauf `#B5BB72` → `#D0FF47`, Kachelquadrat, Spiegelachse, Eckknöpfe, Richtungslabels, Irish Grover. Vergleichsbild: [`docs/progress/editor/vergleich-grundlayout.png`](progress/editor/vergleich-grundlayout.png).
- **Navigation wie Blender:** Rad zoomt (2D zum Cursor), mittlere Taste verschiebt, rechte Taste dreht im 3D; Pos1 setzt zurück, ⌃Leertaste maximiert.
- **Animationen** mit Federn:
  - Der pinke Knopf macht den Viewport quadratisch auf volle Höhe, er bleibt auf seiner Seite.
  - Die Library gleitet von rechts herein, die Viewports werden schmaler.
- **Kurven:**
  - Kontur 3 px, Punkte Ø 10 px, Griffe als 6-px-Quadrate
  - ⌥ am Griff macht eine Ecke
  - Rechtsklick fügt Punkte ein, löscht oder glättet sie
  - Punkte von Hand wie in Illustrator (Zeichenstift P, + / −, ⌥-Klick wandelt um); keine automatischen Punkte (von Florian verworfen); Löschen passt die Nachbargriffe an
  - Spiegelhälfte weiß, Achspunkte auf der Achse
  - Startkreis mit 4 Punkten (Seite) bzw. 3 (Front, Top)
  - Auswahlrechteck und ⇧-Klick wie Illustrator, gewählte Punkte ziehen gemeinsam, Pfeiltasten verschieben (⇧ zehnfach)
  - Auswahl je Viewport, ⌘Z/⇧⌘Z
- **Ein Objekt, drei Ansichten** (Florians Nachtrag): Geteilte Ausdehnungen sind gekoppelt. Ziehen in einer Ansicht bewegt die anderen live mit, mit proportionalem Abfall wie in Blender; ein Rückgängig-Schritt.
- **3D drehen** auch mit linker Taste, ⌃-Klick und Trackpad (zwei Finger); Pinch zoomt.
- **3D:** Matcap im Blender-Solid-Look, an die Kugel der Vorlage angepasst; Kachel; harter Schatten mit eigener Sonne. Der Körper ist der **Platzhalter-Loft** und live aus den drei Profilen gebaut. Drei Kreise ergeben eine Kugel, ein herausgezogener Seitenpunkt eine runde Spitze. Die Vertexzahl ist fest.
- **Menü:**
  - Editor/Fressen-Tabs, „Neue Pose ▼“ (Ruhen, Laufen, Inklusion; Rechtsklick entfernt)
  - Größenregler 25–300 %
  - „Neues Wesen“ startet immer als Kugel, mit Rückfrage bei Änderungen
  - „Speichern“ schreibt JSON plus Vorschau-PNG nach `~/Documents/early earle Editor/Bibliothek/`
  - Die Library zeigt die gespeicherten Wesen als Karten, ein Klick lädt sie.
- **Eigene Entwürfe zur Abnahme** (nicht in der Vorlage):
  - Liquid Glass für Library, Menüs, Dialoge und Hinweise
  - Earle-Ornament am Fuß der Library
  - Größenregler als Pille

**Prüfungen:**
- Typen, Lint und Unit-Tests: `packages/shape` 25, `apps/editor` 6
- E2E 12/12 auf echter GPU
- WebGL2-Rückfall geprüft
- Electron im Dev- und Produktionsmodus sowie die gepackte `.app` per Rauchtest (WebGPU, Speichern auf Platte)

## Offen

- **Florians Abnahme**: Vergleichsbild, Bedienung im echten Fenster (`pnpm editor`), seine Entwürfe (Glas, Ornament, Regler).
- Die **echte Bauweise** (große Sitzung nächste Woche): Profile → Körper ersetzt den Platzhalter-Loft. Danach Module aus der Library (Augen, Flügel …) und Posen/Blendshapes; das Format `ee-wesen` v0 wächst mit.
- **Posen** sind nur Tabs; Bearbeiten folgt.
- Braune und blaue Eckknöpfe sind ohne Funktion.
- Kein Schließen-Schutz für ungespeicherte Änderungen beim Beenden der App.
- Trackpad: Zwei-Finger-Wischen zoomt (wie das Mausrad); Blender-artiges Drehen per Trackpad ist nicht eingebaut.
- Kein App-Icon (Standard-Electron-Icon).
- Bibliotheksordner im Repo (`content/`) statt unter Dokumente: entscheiden, wenn das Spiel Wesen lädt.

## Machbarkeit Tiger-Konzept (11.10. abends)

Florians Konzept: Silhouetten plus Kantenlinien in jeder Ansicht, Maul zu und offen als Blendshape mit Kieferknochen. Ergebnis: [`docs/research/2026-10-11-silhouetten-kanten-machbarkeit.md`](research/2026-10-11-silhouetten-kanten-machbarkeit.md), als Seite: https://claude.ai/artifact/L2T2sGQUfnfxExAmorkoY9

- **Machbar** mit vier Leitplanken:
  - Linien sind 3D-Linien, gekoppelt über alle Ansichten.
  - Eine Kante braucht einen Winkel aus einer Silhouette.
  - Darunter liegt ein fester Grundkäfig mit Catmull-Clark und halbscharfen Kanten.
  - Das Maul bekommt Kieferknochen plus Korrektur-Blendshape und eine Naht mit Reißverschluss.
- **Versuche** (`packages/shape/src/versuch/`, im Editor `?versuch=subd&fall=…&form=…`, Bilder `docs/progress/editor/versuch-subdivision.png`):
  - Ein angepasster Käfig trifft die Kugel auf unter 0,4 px; ungepasst ist sie 4–15 px zu klein.
  - Ein Kasten mit verjüngten Kanten zeigt scharf vorn oben, rund nach hinten.
- **Literatur:** Die Recherche stützt den Grundkäfig mit Creases (Gravity Sketch, Blender, OpenSubdiv). Es gibt keine JavaScript-Bibliothek mit Kanten, die eigene Umsetzung steht. Flächen aus Kurvennetzen können auslaufende Linien nicht.

## Tiger-Käfig Schritt für Schritt (12.10.)

Florian fragte, wie aus Silhouetten und Kanten genau das Netz entsteht, und ob Edgeloops und Polyverteilung an seine Formen angepasst werden können. Antwort als Seite: https://claude.ai/artifact/VqxsA1sx2EMnZUFiqPDpqd

- Versuch `packages/shape/src/versuch/tigerKaefig.ts`:
  - Ringe aus Seite, Top und Front, vorn ein Kasten-Querschnitt
  - Stirnfläche als 4×4-Gitter, hinten ein Pol
  - Kanten verjüngt
  - Anpassung per inverser Unterteilung
  - `formStationen` setzt Ringe auf Eckpunkte und verteilt sie nach Krümmung
- Im Editor: `?versuch=tigerkaefig&schritt=1…7`. Bilder `docs/progress/editor/tiger-schritt-*.png`, Skript `apps/editor/scripts/tiger-schritte.mjs`.
- **Behoben** im Renderer:
  - Die Fläche bleibt unsichtbar, bis sie Geometrie hat. Sonst übersetzt WebGPU den Shader ohne Positionen („Vertex attribute position not found“) und behält diesen Stand.
  - Neue Geometrie wird neu angelegt, statt Attribute auszutauschen.
  - Nach dem Übersetzen (`compileAsync`) wird noch einmal gezeichnet.

## Nächster Schritt

Florian testet die App und gibt Rückmeldung. Danach beginnt die große Sitzung zur Bauweise auf diesem Gerüst. Ihr Einstieg:
- `packages/shape` (Profile, Format)
- `apps/editor/src/three/Renderer3D.ts` (`setzeNetz`)
- `packages/shape/src/platzhalter/loft.ts` (wird ersetzt)
