# early earle — Projektgedächtnis

Diese Datei lädt jede Sitzung automatisch und ganz. **Kurz halten (unter 10 KB):** nur Stand, Regeln, Fallen, Landkarte,
Verweise. Verlauf, Messwerte und Florians Rückmeldungen gehören in `docs/` (Plan, Übergabe, Berichte), nicht hierher. Den Stand
unten **ersetzen**, nicht anhängen. Der vollständige Verlauf bis zum 12.11.2026 liegt in
[`docs/verlauf/2026-11-12-projektgedaechtnis-verlauf.md`](docs/verlauf/2026-11-12-projektgedaechtnis-verlauf.md).

## Stand (14.11.2026)

- **Projekt:** levelbasiertes 2048 im Earle-Stil. Prototyp 1 ist abgeschlossen (Archiv-Zweig `prototyp-1`,
  [`docs/prototyp/README.md`](docs/prototyp/README.md)). Die Produktion läuft in vier Teilen (Map, Spielfeld, Charaktere, UI).
  **Gearbeitet wird am Teil Charaktere: dem Wesen-Editor.** Das alte Spiel (Brett, Karte, `packages/genome`,
  `render/src/creature`) bleibt unangetastet.
- **Der Wesen-Editor ist `kurven.html?gewichte=geometrie`** („Kurven als Wahrheit“, seit 05.11.): Linien (Loops mit
  Bézier-Punkten und Griffen, Kreuzungen, Kante an/aus) sind die Wahrheit; darunter liegt ein dichtes Dreiecksnetz, dessen Haut
  aus den Linien gerechnet wird; gespiegelt; Maul als Loop; Fressen-Pose. Fenster: `apps/editor/src/form/kurven.ts`, Rechenkern:
  `packages/shape/src/dicht/` und `packages/shape/src/loeser/`.
- **Gültiger Plan:** [`docs/plans/2026-11-12-schnell-glatt-exakt.md`](docs/plans/2026-11-12-schnell-glatt-exakt.md), von Florian
  am 12.11. freigegeben („Ok, fangen wir an“). Schritte: 0 Aufräumen, 1 glatte Anzeige, 2 kleines Rechennetz, 3 Beweis „Haut
  direkt aus den Linien“, 4 echte Spiegelung und neue Rechnung ins Fenster, 5 Posen wie die Basis, 6 Maul als eigene Geometrie,
  7 Auswahl wie in Blender. Fest vorgemerkt ist **4c, der Rest der halben Haut** (Florian, 13.11.: „es soll nicht vergessen
  werden“; das Tempo wird für Shader, Materialien, Fell und Zusatzteile gebraucht). **Reihenfolge seit dem 14.11. (Florian):**
  zuerst der Zwischenschritt „Abzweigungen“ (mit P von jedem Punkt und jeder Linie aus eine verbundene Linie ziehen), dann
  Schritt 5, dann 4c. Schritt 6 (Maul) ist angehalten und bekommt eine eigene Sitzung, vielleicht zusammen mit Zähnen: zuerst
  beschreibt er die Fälle, dann wird gebaut. Schritt 7 kommt später, ob und wie ist offen. **Wo wir stehen und was als Nächstes
  kommt: [`docs/UEBERGABE.md`](docs/UEBERGABE.md).**
- **Design-Strang daneben (eigene Sitzung):** `/editor` (`apps/editor/editor.html`, `src/form/editor.ts`,
  `src/form/blaupause.ts`) zeigt denselben Editor im Layout der Blaupause. Einstieg:
  [`docs/look/editor/blaupause/UEBERGABE.md`](docs/look/editor/blaupause/UEBERGABE.md). `editor.ts` ist eine Kopie von
  `kurven.ts` und wird erst nach Schritt 7 nachgezogen.
- **Eingefroren (Wissen, nicht weiterbauen):** der Käfig-Weg vom 13.10. bis 04.11. (`packages/shape/src/kern/`, der alte
  Electron-Editor `pnpm editor`) und `form.html`.
- **Florians Testformen:** `wesen/` (teat firefish, strange bird, test_kaputt). Fertige Wesen gibt es nicht; die Formen sind
  beliebige Tests und kein Maßstab für das Tempo.

## Grundidee (Florian, 15.10. und 05.11.)

- **Kurven sind die Wahrheit.** Die Haut entsteht rund aus den Linien; Kanten sind Loops; alles ist ein Netz.
- **Posen = Knochen + Blendshape.** In einer Pose arbeiten alle Werkzeuge wie in der Basis; das Ergebnis ist der Blendshape.
- Fürs Spiel wird am Ende gebacken (höchstens 8 000 Dreiecke je Wesen).

## Wo was läuft

- **Eine Linie: Zweig `claude/form-spiegel`.** `claude/editor-grundlayout` (Hauptordner) hat denselben Inhalt und wird nur per
  Fast-Forward nachgezogen. `main` steht auf dem 08.10. und bleibt unberührt.
- **`.claude/worktrees/form-alt`** (Zweig `claude/form-spiegel`, Port 5194, Eintrag `kurven-alt`): **Florians Fenster.** Dort
  arbeitet auch die Design-Sitzung an `/editor`. An `kurven.ts` und am Rechenkern dort nichts ändern; nur geprüfte Stände
  hineinführen und Florian vorher sagen, dass sich sein Fenster ändert.
- **`.claude/worktrees/form-bau`** (Zweig `claude/form-bau`, Port 5197, Eintrag `kurven-bau`): hier wird der Plan gebaut.
- `early-earle-meshy` (Nachbarordner) sind Florians Meshy-Tests. Alte Stände liegen als Zweige `bergung/…`.

## Menschen

- **Florian** (illudiy): Art Direction, alle Entscheidungen, Blender, Tests auf iPhone 16 und Mac (M3 Pro). Arbeitet oft von
  unterwegs über die Claude-App und hat ein **Wochenlimit**.
- **Nicole:** Tests, Kalibrierdaten, Content.
- Kommunikation auf Deutsch, kurz und konkret. Rückfragen nur bei echten Entscheidungen.

## Arbeitsregeln

1. **Look zuerst beweisen, dann bauen.** Vor größerem Code ein Vergleichsbild (vorher und nachher, gleiche Ansicht) zeigen. Bei
   Unbewiesenem „ich teste es, Kriterium X“ sagen, nie „kann ich“.
2. **Budget schonen.** Keine Messreihen im Hintergrund, keine Fächer aus Agenten und keine Workflows ohne Rückfrage. Je Schritt
   eine vorher festgelegte sichtbare Probe; Prüfläufe im Vordergrund mit kurzer Ausgabe. Hält ein Beweis nach dem geschätzten
   Aufwand nicht: anhalten und es sagen.
3. **Nie unter Florians Fenster bauen** (siehe „Wo was läuft“). Den Dev-Server des Spiels (`game-dev`) startet Florian.
4. **Sein Auge entscheidet.** Geprüft wird an seinem Fall, in seiner Reihenfolge, an seinen Formen. Widerspricht eine Zählung
   dem, was er sieht, zuerst die Zählung prüfen. Nie „bestanden“ melden ohne Florian. Nennt er eine Strukturidee, die stimmt:
   bauen, nicht weiter belegen.
5. **Meldungen:** zuerst, was sich an seiner Form geändert hat, dann was bleibt. Frage und Wahlmöglichkeiten gehören in die
   Abschlussnachricht (er liest oft per Fernsteuerung).
6. **Klare Begriffe:** dichtes Netz, Linien, Loops, Punkte, Griffe, Haut, Rechennetz, Anzeige. Keine Käfig-Wörter, nie
   „Loop-Netz“. Er hat „Formen“, keine „Wesen“.
7. **Keine Sonderregel, die einen Körper oder eine Lage nennt.** Ab der dritten neuen Regel in einem Block die Struktur prüfen.
8. **Pläne sofort ins Repo** (`docs/plans/`), dann zur Freigabe. Früh und oft committen und pushen; am Ende jedes Blocks
   `docs/UEBERGABE.md` überschreiben.
9. **Mehrere Sitzungen arbeiten im selben Repo.** Vor jedem Commit `git status` und `git log` ansehen, nur eigene Dateien
   stagen, kein bare `git stash`. Nie andere Sitzungen von sich aus anschreiben.
10. **Prüfen:** Typen und die betroffenen Tests (Befehle in `apps/editor/CLAUDE.md`). Nicht die ganze Testreihe von `@ee/shape`
    (die Zeittests des eingefrorenen Kerns reißen unter Last).
11. **Texte:** Deutsch, klare Sätze, keine Modellnamen in Docs oder Code (die Co-Autor-Zeile der Commits bleibt wie bisher).
    Bilder nach `docs/progress/`.

## Fallen

- Jede Änderung unter `apps/editor/src` oder `packages/shape/src` lädt das Fenster des Arbeitsbaums neu.
- `cd` in einem Bash-Befehl verschiebt das Arbeitsverzeichnis der Sitzung: `git -C <pfad>` und absolute Pfade benutzen.
- macOS: kein `timeout`, BSD-`sed` (kein `\b`, `-i ''`); das Dateisystem unterscheidet Groß- und Kleinschreibung nicht.
- JSON-Inhalte nie neu serialisieren (formatiert um), gezielt Zeilen ersetzen.
- Fallen des Editors: `apps/editor/CLAUDE.md`. Cloud, Spiel und Renderer (WebGPU, iOS, Schatten, Draw Calls):
  [`docs/FALLEN.md`](docs/FALLEN.md).

## Landkarte

- `packages/shape` Wesen-Editor: `dicht/` (dichtes Netz, Linien, Haut aus den Kurven, Maul, Pose), `loeser/` (dünn besetzte
  Zerlegung), `kern/` (eingefrorener Käfig).
- `apps/editor` Fenster des Editors (`kurven.html`, `editor.html`), Proben unter `scripts/pruefen/`, alte Electron-App.
- `packages/core` Regeln und Solver · `packages/genome` Wesen-Daten (alt) · `packages/physics` · `packages/world` Karte ·
  `packages/render` three.js WebGPU/TSL · `apps/game` Vite + React + Capacitor · `apps/godot` ruht.
- `content/` Inhalte als JSON · `tools/` Blender-Skripte · `assets/` Referenzen, Schriften.
- `docs/plans/` Pläne · `docs/research/` Berichte · `docs/progress/` Bilder und Messungen · `docs/look/` Vorlagen ·
  `docs/verlauf/` Archiv.
- Befehle: `pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm dev` (Spiel), `pnpm editor` (alte Electron-App).

## Offene Grundsatzentscheidungen

- **Wesen-Pipeline:** eigener Editor (dieser Weg), KI-3D (Meshy/Tripo) oder eine Mischung; Florian testet weiter
  (`docs/research/ki-3d-tools-2026-10.md`).
- **Stack-Gate** (ADR-0001) formal offen: three.js + Capacitor ist der Arbeits-Track, Godot ruht.
- Erlösmodell, Name „early earle“ (Markenrecht), Tierschutz-Modell (GDD §11–12, §15).

## Verweise

- Florians Klarstellungen wörtlich: `docs/plans/2026-10-22-klarstellungen.md`.
- Gegenprüfung vom 10.11. (G1–G6, Wege A–D, Werkzeugliste): `docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`.
- Bilanz seit dem 11.10.: `docs/research/2026-11-09-bilanz-wesen-editor.md`.
- Planseite des Kurven-Wegs (chronologisch): `docs/plans/2026-11-06-kurven-als-wahrheit.md`.
- Prototyp-Dokumente (`docs/GDD.md`, `docs/STYLE.md`, `docs/PRODUCTION.md`, ADRs) sind Erfahrungsschatz, kein Auftrag.
