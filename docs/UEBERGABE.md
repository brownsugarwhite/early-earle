# Übergabe (Stand 14.10.2026 spätnachts)

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

## Kugel: Kerbe, Flosse, Klinge, Stationen (14.10. spätnachts)

- **Kerbe und Flosse an der Spitze des kürzeren Kiefers** (Florians Bilder 1/2, ac7fbcf): Stirn des kürzeren Kiefers mindestens 40 % seiner Linie, Kappenspalten der Schlitzlippe nach Bogenlänge. Vordere Haut in allen Zugschritten (Anfang 1–6 % vor, beide Kiefer) zu/50/100 % ≤ 6,3° (vorher bis 178°). Bild vorher/nachher: `docs/progress/editor/maul-kerbe-flosse-scharnier-2026-10-14.png`.
- **Klinge an der Unterlippe** (c5c15c9): Die Ecken der Schlitzsehne zogen Ringe an (drei Ringe auf 0,015); die markierten Lippenknoten zählen in der Ringverteilung nicht mehr als Krümmung (Florians Unterbiss 147° → 17,5°).
- **Editor-Fehler beim Laden** (a9bc9e1): Ein noch laufender Bau schrieb seine Ringverteilung in das gerade geladene Wesen (z. B. Prüfwesen mit den Ringen der Startkugel). Jetzt friert der Editor nur Stationen aus dem Bau des aktuellen Dokuments ein. Seit dem Fehler gespeicherte Wesen können falsche Stationen tragen → Tafel Körper „Neu ableiten“.
- **Prüfreihe misst jetzt wie der Editor:** eingefrorene Stationen (`mitStationenVon`, `KUGEL0=1` = Stationen der Startkugel, `ZUG=1` = Zugschritte), Falten offen (Haut vorn, Lippe, Haut ganz je 0/50/100 %), Faltenorte (`falten-orte.ts`), Schnittbilder (`maul-schnitt.ts`, `EBENE=x` quer), gezielte Bilder (`kamera-bilder.mjs`), Editor-Prüfung geladener Fälle (`editor-dok-check.mjs`). Ausgaben in `apps/editor/pruefen-ausgabe/` (Playwright leert `test-results/` bei jedem E2E-Lauf).

### Danach (14.10. spätnachts, nach Florians Fragen zum Gelenk)

- **Leiter ohne Rückknick am Schlitz** (5cd89ee): Liegt der blaue Anfang über dem roten (Überbiss) bzw. der rote unter dem blauen (Unterbiss), lief die Schlitzsehne zurück und die Leiter faltete sich vorn (Ring 0 als Sprosse am Pol). Die Leiter nimmt jetzt die sichtbare Silhouette (`seiteFuerLeiter`), Naht und Kieferumriss die echte Linie. Fast bündiger Kiefer: Lippe 45–65° → 7°, das „W“ im Oberlippenband ist weg; geschlossen schaut die Unterlippe mittig als runder Tropfen unter der Oberlippe hervor (die Unterlippe liegt dort direkt hinter der Haut), an den Bandenden kleine rosa Spitzen.
- **Kiefergelenk nach Plan 5.2, Gewichte nach Winkel und Reichweite um das Gelenk** (60e9bfa): die Naht hinter dem Mundwinkel ist weg (Kugel 254 → 0, Florians Unterbiss 174 → 0, Langhals 304 → 0 haut/haut-Paare bei 25–100 %; Rex, Tiger, Nase unverändert 0). Abweichung vom Plan: Übergang über den Winkel statt ±1–2 Ringe (Begründung, Zahlen und Verworfenes auf der Planseite Phase 2, Eintrag „Kiefergelenk und Gewichte“). Bilder: `docs/progress/editor/kiefergelenk-winkelgewichte-2026-10-14.png`.

### Noch offen

- Weiche Stauchfalte hinter einem Mundwinkel, der hinter der Körpermitte liegt (Kugel offen 43–100°): mit dem Gelenk-Griff je Wesen lösbar (Gelenk weiter hinten), die Tasche muss dem Gelenk dann folgen.
- Langhals: blauer Anfang an der Kehle (Chip „getrennt“) und die kleine Vorlagen-Linie; Durchdringungen im Maul (Tasche) 60–100 Paare.
- Ein älterer E2E-Test schlägt fehl (`kern-ablauf` „Körper … Pinsel G“; eigene Aufgabe).

## Nächster Schritt

1. Fressen-Tab nach Plan 5.2: Gelenk als Griff (Seite und Bühne), Kieferlinie als zweiter Griff (Reichweite), Übergangswinkel, Gewichte als Farbverlauf; danach Kehlkette und Bodengrenze.
2. Chip „getrennt“ für Mäuler unter dem Kopf: blauen Anfang hinter den roten legen, nicht an die Kehle.
3. Danach Kiefer-Spanten und „Formen folgen“ mit Maul.

## Wo Florian testet

Web-Modus `http://localhost:5180` (`pnpm --filter @ee/editor dev:web`); nach dem Pull den Dev-Server neu starten (HMR-Falle). Rechts in der Tafel **Library ▸ „Prüfwesen · immer der aktuelle Stand“**: Kugel, Rex, Tiger, Langhals, Drache, Ente, Robbe (frisch gebaut bei jedem Klick). Bilder für ihn nur über eigenen Vite (5192) und Playwright, nie über seinen Server.

## Prüfen

- `pnpm typecheck`, `cd packages/shape && npx vitest run src/kern` (77 Tests; die Laufzeittests `beweis1` „Zugschritt“ und `beweis3` „Stufe 3“ reißen unter Last, einzeln mit `-t` grün), `cd apps/editor && npx vitest run` (16), `npx eslint <ordner>`.
- Prüfskripte: `apps/editor/scripts/pruefen/README.md` (Kern-Skripte mit `npx vite-node` aus `packages/shape`, Editor-Skripte über `run-check.sh` auf 5192); Ausgaben in `apps/editor/pruefen-ausgabe/`.
- E2E: `cd apps/editor && E2E_PORT=5191 EE_GPU=1 npx playwright test e2e/kern-ablauf.spec.ts --reporter=list` (`pnpm --filter @ee/editor e2e -- kern-ablauf` filtert nicht: alle Specs, 10 min, und sie überschreiben `docs/progress/editor/*.png` → vor dem Commit zurücksetzen).
- Nie committen: `assets/fonts/Hippie Movement.otf` (unversioniert, Florians Datei).
