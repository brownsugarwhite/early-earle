# early earle Wesen-Editor

Eigenständige Desktop-App (Electron) für den Shape-/3D-Editor der Wesen. Drei 2D-Profile (Seite, Front, Top) werden wie in Illustrator gezogen, daraus entsteht live das 3D-Wesen. Stand 11.10.2026: Grundlayout, Navigation und Kurven-Bedienung; das 3D zeigt einen **Platzhalter-Körper**, die echte Bauweise folgt.

Plan: [`docs/plans/2026-10-11-editor-grundlayout.md`](../../docs/plans/2026-10-11-editor-grundlayout.md) · Vorlagen: [`docs/look/editor/`](../../docs/look/editor/) · Bilder: [`docs/progress/editor/`](../../docs/progress/editor/)

## Starten

```bash
pnpm editor
```

Das startet Vite (Port 5181) und das Electron-Fenster mit Hot Reload. Die fertige App baut:

```bash
pnpm editor:app
```

Das Ergebnis liegt unter `apps/editor/release/mac-arm64/early earle Editor.app` (lokal gebaut, ad-hoc signiert, ≈ 310 MB). Die App lässt sich in den Programme-Ordner ziehen.

Nur der Renderer im Browser (Vorschau, Tests), Port 5180, http (localhost ist ein sicherer Kontext, WebGPU läuft):

```bash
pnpm --filter @ee/editor dev:web
```

Fehlt nach `pnpm install` das Electron-Binary (`Electron failed to install correctly`), einmal `node node_modules/electron/install.js` in `apps/editor` ausführen.

## Bedienung

| Was | Wie |
|---|---|
| Zoomen | Mausrad (2D zum Cursor hin, 3D zum Drehpunkt) |
| Verschieben | mittlere Maustaste ziehen (alle Viewports) |
| Drehen (3D) | linke oder rechte Maustaste ziehen, ⌃-Klick ziehen, Trackpad: zwei Finger wischen |
| Verschieben (3D) | mittlere Taste oder ⇧ + Ziehen, Trackpad: ⇧ + zwei Finger |
| Trackpad 2D | zwei Finger verschieben, Pinch zoomt |
| Ansicht zurücksetzen | Pos1 (Viewport unter der Maus) oder Rechtsklick auf freie Fläche |
| Maximieren | pinker Knopf oder ⌃Leertaste (wie Blender) |
| Punkt wählen / ziehen | Klick / Ziehen; ⇧-Klick wählt dazu oder ab; gewählte Punkte ziehen gemeinsam; jede Ansicht hat ihre eigene Auswahl |
| Auswahlrechteck | auf freier Fläche ziehen (⇧ schaltet die Punkte im Rechteck um), Klick ins Leere hebt die Auswahl auf |
| Punkte verschieben per Tastatur | Pfeiltasten (1 Schritt = 0,002 Kachel ≈ 1 px in der Grundansicht), ⇧ + Pfeil = zehnfach; jeder Schritt ein Rückgängig |
| Griff ziehen | bleibt eine Linie durch den Punkt (Längen frei) |
| Ecke | ⌥ beim Griff-Ziehen |
| Zeichenstift | P: Klick auf die Kurve setzt einen Punkt, Klick auf einen Punkt löscht ihn, ⌥-Klick wandelt um (glatt ↔ Ecke); ⌘ hält die Direktauswahl |
| Ankerpunkt hinzufügen / löschen | + / − (wie Illustrator) |
| Direktauswahl | A oder V, Esc |
| Punkt einfügen, löschen, glätten | auch per Rechtsklick auf Punkt bzw. „Punkt hier einfügen“ auf der Kurve |
| Punkte löschen | Entf/⌫ (gewählte Punkte im Viewport unter der Maus) |
| Rückgängig / Wiederholen | ⌘Z / ⇧⌘Z (ein Zug = ein Schritt) |
| Speichern / Neues Wesen / Library | ⌘S / ⌘N / ⌘L |

- **Ein Objekt, drei Ansichten:** Je zwei Ansichten teilen eine Achse: Seite und Front die Höhe, Seite und Top die Länge, Front und Top die Breite. Ändert ein Zug die Ausdehnung auf einer geteilten Achse, folgt die andere Ansicht live. Ihr äußerster Punkt geht genau mit, die übrigen abgestuft (wie proportionales Bearbeiten in Blender, quadratischer Abfall). Ein Zug ist ein Rückgängig-Schritt für alle drei Ansichten. Geladene Wesen werden beim Öffnen stimmig gemacht.
- **Punkte wie in Illustrator:** Es entstehen keine Punkte von selbst; Punkte setzt und löscht man von Hand. Beim Löschen behalten die Nachbarn ihre Griffrichtungen, ihre Grifflängen passen sich der alten Form an.
- **Spiegelung:** Front und Top sind nur auf einer Hälfte editierbar (rechts bzw. oben). Achspunkte bleiben auf der Achse; ein glatter Achspunkt hat seinen Griff quer zur Achse.
- **Größe:** Der Regler in der Menüleiste skaliert das ganze Wesen relativ zur festen Kachel (25–300 %). Doppelklick setzt 100 %.
- **Posen:** „Neue Pose“ legt Ruhen, Laufen oder Inklusion als Tab an. Rechtsklick auf einen Tab entfernt die Pose. Das Bearbeiten der Posen kommt mit der Bauweise; bis dahin zeigen alle Tabs die Grundform.
- **Bibliothek:** „Speichern“ schreibt `<name>.json` plus Vorschau-PNG nach `~/Documents/early earle Editor/Bibliothek/`. Im Web-Modus speichert der Editor nur im localStorage (zum Prüfen).
- **Neues Wesen:** Jedes neue Wesen startet als Kugel aus drei Kreisen mit 4 Punkten (Seite) bzw. 3 (Front, Top: zwei Achspunkte und die Flanke), Größe 100 %.

## Aufbau

- `electron/` Hauptprozess (Fenster, Menü, Bibliothek auf der Platte) und Preload (`window.editorApi`).
- `src/layout/` Rechenfunktion für die Viewport-Rechtecke und die Federanimation (rAF, außerhalb von React).
- `src/viewports/` 2D als SVG in Bildpunkten (Griffe bleiben gleich groß) und die 3D-Eingabe.
- `src/three/` ein Vollfenster-Canvas mit Scissor auf das Creation-Rechteck. Er rendert nur bei Änderung, Matcap, harter Schatten.
- `src/state/` Dokument mit Rückgängig (zustand) und Oberflächen-Zustand.
- `packages/shape` (DOM-frei): Bézier-Mathematik, Profile, Kopplung der Ansichten (`kopplung.ts`), Dokumentformat v0, Platzhalter-Loft.
- `src/editing/gekoppelt.ts` wendet die Kopplung beim Ziehen an, immer vom Stand am Gestenbeginn aus.

## Prüfen

```bash
pnpm --filter @ee/editor typecheck
```

```bash
npx vitest run --project shape --project editor
```

```bash
E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e
```

Das Vergleichsbild Vorlage | Render braucht einen laufenden Web-Modus:

```bash
node apps/editor/scripts/vergleich.mjs
```

Rauchtest der Desktop-App ohne Florians Bibliothek (Fenster öffnet sich kurz):

```bash
EDITOR_SELBSTTEST=/tmp/editor.png EDITOR_BIBLIOTHEK=/tmp/bib apps/editor/node_modules/.bin/electron apps/editor
```

Davor `pnpm --filter @ee/editor build` ausführen.
