# Wesen-Editor — Gedächtnis

Wird geladen, sobald eine Sitzung in `apps/editor` arbeitet (zusätzlich zur Root-`CLAUDE.md`). Kurz halten, Nachträge mit Datum.

## Auftrag und Entscheidungen (Florian, 11.10.2026)

- Der Charaktereditor wird ein **kompletter Shape-/3D-Editor** und ein großer, eigenständiger Teil des Projekts: Florian zieht drei Profile (Seite, Front, Top) wie in Illustrator, daraus entsteht live das Wesen. Ziel: der Look seiner 19 Referenzbögen und von Eyvind Earle; „der beste Charaktereditor auf dem Markt“.
- **Desktop-App (Electron), eigenes App-Verzeichnis im Monorepo**, kein eigenes Repo (das Spiel lädt später dasselbe Format; geteilte Technik). Nicht für Mobilgeräte.
- Blender-Navigation: Rad = Zoom, mittlere Taste = Verschieben (alle Viewports), rechte Taste ziehen = Drehen (nur 3D).
- Layout exakt nach [`docs/look/editor/figmaScreenshot.png`](../../docs/look/editor/figmaScreenshot.png) (2× bei 1728×1161). Stil: „Eyvind Earle meets Neo-Brutalismus in a liquid glass“, **keine Konturen**.
- Vorgaben im Chat: Kurvenkontur **3 px**, Punkte **rund Ø 10 px**, Bézier-Griffe **6-px-Quadrate**, Farben wie im Screenshot (Punkte `#00FFE1`, editierbare Hälfte schwarz, Spiegelhälfte weiß).
- **Jedes neue Wesen startet als Kugel** aus drei Kreisen (Größe 100 %).
- Maximierter Viewport bleibt auf seiner Seite; Speichern und Library funktionieren echt.
- Die **echte Bauweise** (Profile → Körper, Augen, Flügel, Posen/Blendshapes) folgt in einer großen Sitzung ab 12.10. Bis dahin ist der 3D-Körper der **Platzhalter-Loft** in `packages/shape/src/platzhalter/loft.ts`: Die Seite bestimmt Länge und Höhe, das Top die Breitenverteilung (auf die Länge der Seite gestreckt), die Front den Querschnitt. Feste Vertexzahl.
- **Nachtrag 11.10. nachmittags — ein Objekt:** „Es soll ja alles ein und dasselbe Objekt sein. Wenn ich im Frontview etwas verschiebe, muss das auch in den anderen Shapes passieren, live.“ Umsetzung: Die geteilten Ausdehnungen sind gekoppelt (Seite ↔ Front y, Seite ↔ Top x, Front ↔ Top z, gemessen an der Kurve, nicht nur an den Knoten). Die andere Ansicht folgt mit proportionalem Abfall (Exponent 2), gerechnet vom Gestenbeginn. Code: `packages/shape/src/kopplung.ts`, `src/editing/gekoppelt.ts`. Direkte Züge bleiben Illustrator-artig (nur der gezogene Punkt bewegt sich).
- **Nachtrag 11.10. — 3D drehen:** „3D-View lässt sich noch nicht drehen“ (vermutlich Trackpad). Jetzt dreht die linke oder rechte Taste, ebenso ⌃-Klick und Zwei-Finger-Wischen. ⇧ verschiebt, Pinch und Mausrad zoomen. Trackpad-Erkennung: `istTrackpad` (Chrome: wheelDeltaY = −3 · deltaY).
- Automatische Punkte: nur formtreues Teilen zu langer Segmente (0,2 Kachel), nie Punkte wandern lassen. Für Posen gilt später: gemeinsame Punktstruktur, Einfügen formtreu in allen Posen, Netz mit fester Auflösung.

## Arbeitsweise

- **Look-Beweis:** `node apps/editor/scripts/vergleich.mjs` (Web-Modus muss laufen) → `docs/progress/editor/vergleich-grundlayout.png` (Vorlage | Render). Render und Differenz liegen unter `apps/editor/test-results/vergleich/`.
- **E2E:** `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e` (echte GPU, eigener Port). Die Tests schreiben Bilder nach `docs/progress/editor/`.
- **Ports:** 5180 Web-Modus (`editor-web` in `.claude/launch.json`), 5181 Electron-Dev, 5190+ E2E.
- **Desktop-Rauchtest:** `EDITOR_SELBSTTEST=<png> EDITOR_BIBLIOTHEK=<ordner>`. Nie in Florians echte Bibliothek schreiben (`~/Documents/early earle Editor/Bibliothek`).
- Test-Zugriff: `window.__stores` (editor, ui, rahmen) und `window.__editor` (backend, vertices).

## Fallen (nicht wiederholen)

- **macOS unterscheidet keine Groß-/Kleinschreibung:** `View2D.tsx` neben `view2d.ts` bricht tsc (TS1149). Deshalb heißt die Mathe-Datei `ansicht2d.ts`.
- **CSS-Reihenfolge:** `.glas` darf kein `position` setzen. Es überschrieb `position: absolute/fixed` von Aufklappmenü und Kontextmenü, die Menüleiste verrutschte.
- **Ein Verlauf für alle Viewports** über `background-attachment: fixed` (Position/Größe = Bühne). Kein `transform`, `filter` oder `will-change` auf Vorfahren der Viewports, sonst bricht er. Animiert wird deshalb über left/top/width/height.
- **Unsichtbarer Tab = keine Animation:** rAF läuft im verdeckten Vorschau-Tab nicht. Animationen per Playwright prüfen, nicht im versteckten Browser-Pane.
- **three r186 `setViewport`/`setScissor`:** Der Ursprung ist oben links, in beiden Backends (das WebGL-Backend dreht selbst). Vor dem Scissor-Render voll löschen (`setScissorTest(false); clear()`), dann mit `autoClear = false` rendern.
- **Schattenkarte:** `material.shadowSide = FrontSide`. Mit den Rückseiten (Standard) blieb am Bodenkontakt ein heller Fleck. Karte 4096, Frustum ±1,8.
- **Matcap** ist eine quadratische Funktion der Blicknormalen, an die Kugel der Vorlage angepasst (`three/matcap.ts`). Kein Blender-Bild verwenden (Lizenz).
- **Sonne** (nur Schatten): von hinten (+X), 42° hoch, aus dem Schattenwurf der Vorlage zurückgerechnet. **Kamera**: Azimut −45°, Höhe 15°, Abstand 2,15, Ziel y 0,18, FOV 30°, an die Kachelecken der Vorlage angepasst.
- **Electron:** Preload muss CJS sein (Fenster mit `sandbox`), Hauptprozess ESM. electron-vite kann kein Vite 8, deshalb vite-plugin-electron. pnpm braucht `allowBuilds: electron: true`. CI setzt `ELECTRON_SKIP_BINARY_DOWNLOAD=1`. `.app` mit `identity: "-"` und `hardenedRuntime: false`, sonst Startprobleme bei Ad-hoc-Signatur.
- **macOS:** `contextmenu` kommt beim Drücken der rechten Taste, nicht beim Loslassen. Im 3D deshalb `contextmenu` immer verhindern und das Menü beim Loslassen ohne Bewegung öffnen.
- Irish Grover (Apache-2.0, `@fontsource/irish-grover`) hat Umlaute, aber kein ▼. Das Dreieck ist SVG.
