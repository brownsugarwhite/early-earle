# Übergabe (Stand 14.10.2026 nachts)

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

## Block 1 und 2 (14.10. abends)

- **Block 1 ruhiges Netz gebaut** (5599ebf, 057ab4d, fe5eb1b): Formen folgen mit gekapptem Achsgriff behoben (Ursache von Florians Wellen nach Pinsel + Verziehen), keine führende Front während Gesten (faltete, blieb im Cache hängen), rund statt Kasten/Grat außerhalb von Top/Front. Florians Komma im Editor glatt, Δ 2,9 / 13,3 / 4,5 px (`docs/progress/editor/ruhiges-netz-komma-pinsel.png`). Florians Test steht aus.
- **Maul auf der Haut** (8d6d993): Lippenbreite aus der Haut × Verhältnis der Knoten, keine Spitze vorn (Florians Rückmeldung), Rot/Blau in Front/Top als wirksame Linien; Kiefer gleich Front 4,2 / Top 4,8 px. **Glätten springt nicht mehr** (ec9c27b): mit Maul kein Folgen nach Pinselstrichen. Offen: Unterbiss, Schnabel, Kringel am Lippenanfang, flaches Lippenband, Kiefer-Spanten.
- **Block 2 Zwischenstand** (465ddc1, 3884b01): Lippenanfänge sind markierte Knoten der schwarzen Linie (Editor und Datenmodell fertig), der Kern kennt den Schlitz (Sehne, offene Naht, Coons-Kinn). Noch nicht sauber: Überbiss ≈ 530 offene Paare (gedrängte vordere Spalten der Unterlippe), Unterbiss schlechter, Lippe als flaches Band. Florian entscheidet den Weiterweg (Planseite, Stand 14.10. abends).

## Kiefer folgen ihrer Linie (14.10. nachts, Florians Rückmeldung mit zwei Bildern)

- **Rot und Blau gelten genau samt Griffen** (cf51792). Neue Linien liegen auf der Haut und beginnen rund (`lippeAnHaut`).
- **Jeder Kiefer folgt als Ganzes seiner Linie:** Die Ringhälfte wird gestreckt. Beim Verbreitern ist sie weich durch Lippe und Vorlage begrenzt.
- **Die schwarze Linie heftet sich in Front und Top an einen breiteren Kiefer** (Umweg, 71e091d).
- **Messung des Unterbisses nach Florians Bild 2:** Δ 1,5 / 3,3 / 2,6 px statt 46 / 20 / 21 px, offen 4–58 Paare.
- Einzelheiten, Zahlen und Offenes stehen auf der Planseite (Stand 14.10. nachts).

## Maul unter der Nase (14.10. spätnachts, 4a2ec83)

- Ringanfang, Anfang am gezeichneten Umrisspunkt, Maulringe, Hautabfrage mit wachsendem Fenster; Nase und Langhals tragen ein Maul (Zahlen und Offenes auf der Planseite).
- **Prüfreihe vor jeder Meldung** (Florian: „sei selbstkritischer“): `cd packages/shape && npx vite-node ../../apps/editor/scripts/pruefen/pruefreihe.ts` (Maße), dann `apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/pruefreihe-bilder.mjs` (Kontaktbogen), Editor-Ablauf `langhals-editor.mjs`.

## Nächster Schritt

1. Flosse und Kerbe am kürzeren Kiefer der Kugel (Kappenanfang).
2. Chip „getrennt“ für Mäuler unter dem Kopf: blauen Anfang hinter den roten legen, nicht an die Kehle.
3. Kehlhaut beim weiten Öffnen (Langhals).
4. Danach Kiefer-Spanten und „Formen folgen“ mit Maul.

## Wo Florian testet

Web-Modus `http://localhost:5180` (`pnpm --filter @ee/editor dev:web`); nach dem Pull den Dev-Server neu starten (HMR-Falle). Rechts in der Tafel **Library ▸ „Prüfwesen · immer der aktuelle Stand“**: Kugel, Rex, Tiger, Langhals, Drache, Ente, Robbe (frisch gebaut bei jedem Klick). Bilder für ihn nur über eigenen Vite (5192) und Playwright, nie über seinen Server.

## Prüfen

- `pnpm typecheck` (grün seit 50c1dd4), `cd packages/shape && npx vitest run src/kern` (67 Tests; der Laufzeittest `beweis3` „Stufe 3“ reißt unter Last, einzeln mit `-t` 140 ms), `cd apps/editor && npx vitest run` (16), `npx eslint <ordner>`.
- Prüfskripte: `apps/editor/scripts/pruefen/README.md` (Kern-Skripte mit `npx vite-node` aus `packages/shape`, Editor-Skripte über `run-check.sh` auf 5192).
- E2E: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e -- kern-ablauf`.
- Nie committen: `assets/fonts/Hippie Movement.otf` (unversioniert, Florians Datei).
