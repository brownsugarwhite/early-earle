# Übergabe (Stand 14.10.2026 nachmittags)

Branch `claude/editor-grundlayout`. Die große Sitzung ist für diese Woche aufgebraucht und brach mitten in der Arbeit ab; ihr ungespeicherter Stand ist gesichert. Es gilt der Fahrplan [`docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md`](plans/2026-10-14-ruhiges-netz-und-maulschlitz.md) (von Florian freigegeben): **Block 1 ruhiges Netz auf der schwarzen Linie → Block 2 Maulschlitz an der schwarzen Linie, getrennte Kiefer mit eigenen Spanten → Block 3 weiter nach Phase 2.** Datumshinweis: Einträge „15.10.“ der vorigen Sitzung stammen laut Commits vom 13./14.10.; ab hier gilt das echte Datum.

## Florians Regel seit heute

Die schwarze Linie ist sein Werkzeug und damit die Wahrheit für den Umriss: Das Netz (gelber Saum) liegt ruhig und geglättet auf ihr, auch wenn er stark verzieht; Rot und Blau gehen von der Seite direkt in die schwarze Linie über (echter Maulschlitz); jeder Kiefer folgt nur seiner eigenen schwarzen Linie, seiner Lippenlinie und seinem eigenen Spant. Wörtlich und mit Bildbeschreibungen auf der Planseite.

## Heute gesichert (Block 0)

1. **Ungespeicherter Stand der großen Sitzung** in drei Commits: führende Front wirkt örtlich (235662c), Kinnwand mit einem Bezugsring (c296736), Formen folgen am Gestenende ohne eingefügte Knoten, nur nach Pinselstrichen (50c1dd4; Florian: „Das Springen wurde gerade schon besser“).
2. **Typfehler** seit 61146ed behoben (`pnpm typecheck` war rot): `bauplanAus` führt die Linie als Kern-Typ `MaulLinie`, `Ausstattung.maulLinie` kennt `oben`.
3. **Prüfskripte** aus dem flüchtigen Scratchpad nach `apps/editor/scripts/pruefen/` (README dort).
4. **Doku:** Florians fünf Rückmeldungen im Kritik-Register, Stand auf „Zeichnung ist Form“, neue Planseite mit Code-Karte des getrennten Kiefers (Ursachen von Wand, Kniffen, Brett, Stufen).

## Was vorher gebaut wurde (Kurzfassung, Einzelheiten auf den Planseiten)

- **Zeichnung ist Form** ([Planseite](plans/2026-10-15-zeichnung-ist-form.md)): Sichthülle und Breitenpunkte (Top an der Kurve), Lippe auf der gezeichneten Linie, Δ und Saum je Blatt, eingefrorene Stationen, Formen folgen nach Pinselstrichen.
- **Phase 2** ([Planseite](plans/2026-10-15-phase-2-maul.md)): M1 Plattenmaul (Tiger-Stern), M2 Kiefer getrennt (jede Lippenlinie mit eigenem Anfang, Kanten exakt auf den gezeichneten 3D-Linien, Unterbiss; Darstellung noch nicht sauber), M3 erste Stufe (automatischer Haps).

## Offen (ehrlich)

- **Netz wirft Wellen und Falten beim Verziehen** (Florians Komma: Sägezahn Δ 33 / 26 px in Front/Top, Faltengrat) — Block 1.
- **Maul:** Rot/Blau hängen nicht an der schwarzen Linie; der kürzere Kiefer endet als ebene Wand, ein vorgezogener roter Anfang zieht einen Schnabel; Lippe als flaches Brett, Stufen in der Tasche; keine Kiefer-Spanten — Block 2.
- Folgen nach Kurven-, Spant- und Maulgesten; Widersprüche der Zeichnungen (Rex-Front 11 px) werden angezeigt, nicht gelöst.
- Register offener Kritik mit Phase je Punkt: [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md).

## Nächster Schritt

Block 1, Schritt 1: Prüfstand (Florians Komma nachgebaut, Langhals mit gebogenem Hals, Kugel mit getrennten Kiefern; Wächter Kugel/Rex/Tiger/Langhals) mit Δ je Blatt, Faltenmaß, Sägezahnmaß, Lokalität; Bilder des heutigen Stands als Ausgangslage. Dann Diagnose je Ring und Umbau in kleinen, gemessenen Schritten. Abbruchregel: nach drei gemessenen Fehlanläufen anhalten und Florian Befund und Wege zeigen.

## Wo Florian testet

Web-Modus `http://localhost:5180` (`pnpm --filter @ee/editor dev:web`); nach dem Pull den Dev-Server neu starten (HMR-Falle). Rechts in der Tafel **Library ▸ „Prüfwesen · immer der aktuelle Stand“**: Kugel, Rex, Tiger, Langhals, Drache, Ente, Robbe (frisch gebaut bei jedem Klick). Bilder für ihn nur über eigenen Vite (5192) und Playwright, nie über seinen Server.

## Prüfen

- `pnpm typecheck` (grün seit 50c1dd4), `cd packages/shape && npx vitest run src/kern` (67 Tests; der Laufzeittest `beweis3` „Stufe 3“ reißt unter Last, einzeln mit `-t` 140 ms), `cd apps/editor && npx vitest run` (16), `npx eslint <ordner>`.
- Prüfskripte: `apps/editor/scripts/pruefen/README.md` (Kern-Skripte mit `npx vite-node` aus `packages/shape`, Editor-Skripte über `run-check.sh` auf 5192).
- E2E: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e -- kern-ablauf`.
- Nie committen: `assets/fonts/Hippie Movement.otf` (unversioniert, Florians Datei).
