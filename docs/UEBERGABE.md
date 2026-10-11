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
  - automatisch neue Punkte (formtreu) bei Segmenten über 0,2 Kachel
  - Spiegelhälfte weiß, Achspunkte auf der Achse
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
- Typen, Lint und Unit-Tests: `packages/shape` 22, `apps/editor` 6
- E2E 10/10 auf echter GPU
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

## Nächster Schritt

Florian testet die App und gibt Rückmeldung. Danach beginnt die große Sitzung zur Bauweise auf diesem Gerüst. Ihr Einstieg:
- `packages/shape` (Profile, Format)
- `apps/editor/src/three/Renderer3D.ts` (`setzeNetz`)
- `packages/shape/src/platzhalter/loft.ts` (wird ersetzt)
