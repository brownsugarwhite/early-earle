# early earle — Projektgedächtnis

Diese Datei lädt jede Sitzung automatisch und ganz. **Kurz halten (unter 10 KB):** nur Stand, Regeln, Fallen, Landkarte,
Verweise. Verlauf, Messwerte und Florians Rückmeldungen gehören in `docs/` (Plan, Übergabe, Berichte), nicht hierher. Den Stand
unten **ersetzen**, nicht anhängen. Der vollständige Verlauf bis zum 12.11.2026 liegt in
[`docs/verlauf/2026-11-12-projektgedaechtnis-verlauf.md`](docs/verlauf/2026-11-12-projektgedaechtnis-verlauf.md).

## Stand (16.11.2026)

- **Projekt:** levelbasiertes 2048 im Earle-Stil. Prototyp 1 ist abgeschlossen (Archiv-Zweig `prototyp-1`,
  [`docs/prototyp/README.md`](docs/prototyp/README.md)). Die Produktion läuft in vier Teilen (Map, Spielfeld, Charaktere, UI).
  **Gearbeitet wird am Teil Charaktere: dem Editor für die Formen.** Das alte Spiel (Brett, Karte, `packages/genome`,
  `render/src/creature`) bleibt unangetastet.
- **Der Editor heißt Ozzy** (Florian, 16.11.), das Designsystem **liquid drop**: die Studien (Aufblasen, Linien, Ecke/Werft,
  Bleistift) mit dem vollen Kern von Sitzung 4. Seite `apps/editor/ozzy.html`, Code `apps/editor/src/ozzy/`, Plan
  [`docs/plans/2026-11-16-ozzy.md`](docs/plans/2026-11-16-ozzy.md), **Stand: [`docs/look/ozzy/UEBERGABE.md`](docs/look/ozzy/UEBERGABE.md).**
  Gebaut: Stand 0, Phase 1 (Werk `src/form/werk.ts`), 3 (Form aus der Silhouette, Weg A), 5 (Laden, alle Linien auf allen Flächen mit
  der Bedienung der Linien-Studie über `werkBlatt.ts`, P, Freihand, Maul, Pose), 6 (Pinsel „Ziehen“ über O; keine Höhenlinien über der
  Blase). **Plan weiter** [`docs/plans/2026-11-16-ozzy-weiter.md`](docs/plans/2026-11-16-ozzy-weiter.md): S1 bis S9 gebaut (S8 gerade, gebogen ist Kern-Sitzung; S9: ohne Linie an der Spiegelkante ist Standard, im Menü mit); S10 Auffalten als Kistennetz (Standard), S11 Sichern im Menü und ⌘S; S12 erster Schritt (Stift, Finger, Knöpfe) gebaut, sein Urteil am iPad offen; S13 liquid drop: alle zehn Ideen gebaut, sein Urteil offen. **Florian
  (16.11.): Am Rechenkern ändert Ozzy nichts und optimiert nichts, das macht die Kern-Sitzung; kein Unterschied zwischen seinen Kurven
  und dem Modell wie in Sitzung 4.**
- **Der Kern** („Kurven als Wahrheit“, seit 05.11.): Linien (Loops mit Bézier-Punkten und Griffen, Kreuzungen, Kante an/aus) sind
  die Wahrheit; darunter ein dichtes Dreiecksnetz, dessen Haut aus den Linien gerechnet wird; gespiegelt; Maul; Fressen-Pose.
  Rechenkern `packages/shape/src/dicht/` und `loeser/`. Das alte Fenster `kurven.html?gewichte=geometrie` (`src/form/kurven.ts`)
  bleibt Prüffenster. Plan „schnell, glatt, exakt“ mit seinen offenen Punkten (4c Rest der halben Haut, Pose Etappe 4 und 5,
  umgeschlagene Dreiecke an der Mitte, Griff bei Abzweigungen, Punkte ohne Spiegelbild nach dem Verdichten):
  [`docs/plans/2026-11-12-schnell-glatt-exakt.md`](docs/plans/2026-11-12-schnell-glatt-exakt.md), Übergabe von Sitzung 4 (Stand
  14.11.) in [`docs/UEBERGABE.md`](docs/UEBERGABE.md). Das Maul-System bekommt später eine eigene Sitzung; Schritt 7 kommt später.
- **Studien (abgeschlossen, Feinschliff jetzt in Ozzy):** Linien `src/linien/` (`linien.html`, `raum.html`,
  [`docs/look/linien/UEBERGABE.md`](docs/look/linien/UEBERGABE.md)); Aufblasen `src/anfang/` (`anfang.html`,
  [`docs/look/anfang/UEBERGABE.md`](docs/look/anfang/UEBERGABE.md)); Ecke/Werft nur als Konzept im Cloud-Zweig
  `claude/meme-curves-editor-concept-s65kq1`; Bleistift-Kern `packages/shape/src/zeichnen/`.
- **Ruht:** `/editor` (Blaupause), der Käfig-Weg (`packages/shape/src/kern/`, Electron-Editor `pnpm editor`), `form.html`.
- **Florians Testformen:** `wesen/` (teat firefish, strange bird, test_kaputt, maul handgemacht test). Beliebige Tests, kein
  Maßstab für das Tempo.

## Grundidee (Florian, 15.10. und 05.11.)

- **Kurven sind die Wahrheit.** Die Haut entsteht rund aus den Linien; Kanten sind Loops; alles ist ein Netz.
- **Posen = Knochen + Blendshape.** In einer Pose arbeiten alle Werkzeuge wie in der Basis; das Ergebnis ist der Blendshape.
- Fürs Spiel wird am Ende gebacken (höchstens 8 000 Dreiecke je Wesen).

## Wo was läuft

- **Eine Linie: Zweig `claude/ozzy` (seit 16.11.)**, Arbeitsbaum `.claude/worktrees/ozzy`, Port 5205 (im WLAN erreichbar, fürs iPad), Eintrag `ozzy`. Hier wird
  gebaut, auch am Kern. `claude/editor-grundlayout` (Hauptordner) wird per Fast-Forward nachgezogen. `main` steht auf dem 08.10.
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
- Bilanz seit dem 11.10.: `docs/research/2026-11-09-bilanz-wesen-editor.md`.
- Planseite des Kurven-Wegs (chronologisch): `docs/plans/2026-11-06-kurven-als-wahrheit.md`.
- Prototyp-Dokumente (`docs/GDD.md`, `docs/STYLE.md`, `docs/PRODUCTION.md`, ADRs) sind Erfahrungsschatz, kein Auftrag.
