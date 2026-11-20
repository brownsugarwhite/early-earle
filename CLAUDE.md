# early earle — Projektgedächtnis

Diese Datei lädt jede Sitzung automatisch und ganz. **Kurz halten (unter 10 KB):** nur Stand, Regeln, Fallen, Landkarte,
Verweise. Verlauf, Messwerte und Florians Rückmeldungen gehören in `docs/` (Plan, Übergabe, Berichte), nicht hierher. Den Stand
unten **ersetzen**, nicht anhängen. Der vollständige Verlauf bis zum 12.11.2026 liegt in
`docs/verlauf/2026-11-12-projektgedaechtnis-verlauf.md`.

## Stand (20.11.2026)

- **Projekt:** levelbasiertes 2048 im Earle-Stil. Prototyp 1 ist abgeschlossen (Archiv-Zweig `prototyp-1`,
  [`docs/prototyp/README.md`](docs/prototyp/README.md)). Die Produktion läuft in vier Teilen (Map, Spielfeld, Charaktere, UI).
  **Gearbeitet wird am Teil Charaktere: dem Editor für die Formen.** Das alte Spiel (Brett, Karte, `packages/genome`,
  `render/src/creature`) bleibt unangetastet.
- **Der Editor heißt Ozzy** (Florian, 16.11.), das Designsystem **liquid drop**. Seite `apps/editor/ozzy.html`, Code
  `apps/editor/src/ozzy/`. **Einstieg: [`docs/look/ozzy/UEBERGABE.md`](docs/look/ozzy/UEBERGABE.md).**
  Gebaut nach [`docs/plans/2026-11-17-ozzy-stabil-schnell.md`](docs/plans/2026-11-17-ozzy-stabil-schnell.md): A, B1 bis B3, C1, C2,
  C4, D1 Teil 1 und 2. C3 Gleiten: zurückgestellt. E nicht gebaut, D2 ruht. **Nach seinem ersten Test (18.11.) gilt
  [`…-18-ozzy-nach-dem-ersten-test.md`](docs/plans/2026-11-18-ozzy-nach-dem-ersten-test.md) (nichts daraus
  ohne sein Wort bauen).** Gebaut daraus: Aufblasen, frische Form größer, Vier Ansichten ohne Einrasten, Umriss der Seite, alle
  Materialien (`material.ts`, `gast.ts`, `gruen.ts`). Offene Fragen und Urteile:
  `docs/plans/2026-11-17-ozzy-feinschliff.md`. Es bleibt: kein Unterschied zwischen seinen Kurven und dem Modell.
- **Sitzung „Maul, Zähne, Zunge“ (20.11.):** Zweig `claude/ozzy-maul` (vom Paint-Zweig), Fenster 5205.
  **Etappe 1 und 2 gebaut** (Offenes: `…-maul-was-bleibt.md`, Feinschliff am Ende):
  [`…-20-ozzy-maul-zaehne-zunge.md`](docs/plans/2026-11-20-ozzy-maul-zaehne-zunge.md); Studie `maul.html`.
  Einstieg: [`docs/look/ozzy/maul/UEBERGABE.md`](docs/look/ozzy/maul/UEBERGABE.md).
- **Sitzung „Objekte, Spiegel und Nähte“ (18./19.11., ruht):** Zweig `claude/ozzy-donut-mirror-system-7a31b7`, Fenster 5211.
  Plan: [`…-18-ozzy-objekte-spiegel-naehte.md`](docs/plans/2026-11-18-ozzy-objekte-spiegel-naehte.md) (gebaut: Etappe 0
  bis 5, Verbund; **Formen beginnen mit drei Loops**; offen: Sitz der Loops, Hilfsloop greifen).
- **Sitzung „Paint-Modus“ (19.11., ruht):** Zweig `claude/reverent-feynman-1efdd3` (enthält die Objekte), Fenster 5215.
  Einstieg: [`docs/look/ozzy/paint/UEBERGABE.md`](docs/look/ozzy/paint/UEBERGABE.md) („Wachs“, Etappe 1 bis 6). Was bleibt:
  `docs/plans/2026-11-19-ozzy-paint-was-bleibt.md`. **In `claude/ozzy` ist nichts zusammengeführt** (erst auf sein Wort).
- **Der Kern** („Kurven als Wahrheit“, seit 05.11.): Linien (Loops mit Bézier-Punkten und Griffen, Kreuzungen, Kante an/aus) sind
  die Wahrheit; darunter ein dichtes Dreiecksnetz, dessen Haut aus den Linien gerechnet wird; gespiegelt; Maul; Fressen-Pose.
  Rechenkern `packages/shape/src/dicht/` und `loeser/`. Das alte Fenster `kurven.html?gewichte=geometrie` (`src/form/kurven.ts`)
  bleibt Prüffenster. Plan „schnell, glatt, exakt“ mit seinen offenen Punkten (Rest von 4c, Pose Etappe 4 und 5, Griff bei
  Abzweigungen): [`docs/plans/2026-11-12-schnell-glatt-exakt.md`](docs/plans/2026-11-12-schnell-glatt-exakt.md), Übergabe von
  Sitzung 4 (14.11.) in [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **Studien (abgeschlossen, Feinschliff in Ozzy):** Linien `src/linien/` (`linien.html`, `raum.html`); Aufblasen `src/anfang/`
  (`anfang.html`); Ecke/Werft nur als Konzept im Cloud-Zweig `claude/meme-curves-editor-concept-s65kq1`; Bleistift-Kern
  `packages/shape/src/zeichnen/`. Übergaben unter `docs/look/`.
- **Ruht:** `/editor` (Blaupause), der Käfig-Weg (`packages/shape/src/kern/`, Electron-Editor `pnpm editor`), `form.html`.
- **Florians Testformen:** `wesen/` (teat firefish, strange bird, test_kaputt, maul handgemacht test). Beliebige Tests, kein
  Maßstab für das Tempo.

## Grundidee (Florian, 15.10. und 05.11.)

- **Kurven sind die Wahrheit.** Die Haut entsteht rund aus den Linien; Kanten sind Loops; alles ist ein Netz.
- **Posen = Knochen + Blendshape.** In einer Pose arbeiten alle Werkzeuge wie in der Basis; das Ergebnis ist der Blendshape.
- Fürs Spiel wird am Ende gebacken (höchstens 8 000 Dreiecke je Wesen).

## Wo was läuft

- **Eine Linie: Zweig `claude/ozzy` (seit 16.11.)**, Arbeitsbaum `.claude/worktrees/ozzy`, Port 5205 (im WLAN erreichbar, fürs iPad), Eintrag `ozzy`. Hier wird
  gebaut, auch am Kern. **Seit dem 20.11. steht der Arbeitsbaum auf `claude/ozzy-maul`**; `claude/ozzy` bleibt auf dem 18.11. `claude/editor-grundlayout` (Hauptordner) wird per Fast-Forward nachgezogen. `main` steht auf dem 08.10.
  und bleibt unberührt.
- **`.claude/worktrees/form-alt`** (Zweig `claude/form-spiegel`, Port 5194, Eintrag `kurven-alt`): **Florians altes Fenster**
  (`kurven.html` ohne Maul formen und Pose vom 13./14.11.). Nichts ändern ohne sein Wort.
- **Ruhen** (letzter Stand, nicht weiterbauen): `form-bau` (Sitzung 4 bis 14.11., Port 5197), `look-linien` (5199), `anfang`
  (5203).
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
- Planseite des Kurven-Wegs (chronologisch): `docs/plans/2026-11-06-kurven-als-wahrheit.md`.
- Prototyp-Dokumente (`docs/GDD.md`, `docs/STYLE.md`, `docs/PRODUCTION.md`, ADRs) sind Erfahrungsschatz, kein Auftrag.
