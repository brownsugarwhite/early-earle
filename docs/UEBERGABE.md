# Übergabe (Stand 02.11.2026: Gegenprüfung und Prüfplan P0–P3 liegen Florian zur Freigabe vor)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix. **Diese Datei ist der Einstieg für eine frische Sitzung.** Kein Code und
kein Umbau seit dem 22.10.; alles Neue sind Dokumente, Recherchen und eine Messung.

## Was am 02.11. passiert ist (Schritt 2 des Vorgehens vom 21.10.)

1. **Florians Klarstellungen, Teil 1** wörtlich gespeichert: [`docs/plans/2026-10-22-klarstellungen.md`](plans/2026-10-22-klarstellungen.md).
   Kern: Die drei Ansichten sind **Outline-Illustrationen je Teil** (verdeckte Linien blass/gestrichelt und bearbeitbar; der
   Bauch läuft von oben unter dem Kopf durch, die zwei Zusatzpunkte der Vereinigungs-Silhouette entfallen), **Loops sind
   gezeichnete Linien** („die meisten Kanten Edgeloops“), Härte = Strich 0–3 px, ohne Kante **„so rund wie möglich“**, zu viel
   Fokus auf Spanten und Silhouetten → Werkzeuge prüfen, **Spielqualität von Anfang an umschaltbar**. Teil 2 (Bausteine) kommt
   später: Platzhalter [`docs/plans/2026-10-22-bausteine-wuensche.md`](plans/2026-10-22-bausteine-wuensche.md).
2. **Gegenprüfung** [`docs/plans/2026-11-02-gegenpruefung-liniennetz.md`](plans/2026-11-02-gegenpruefung-liniennetz.md):
   „Ein Liniennetz, ein Löser“ bleibt das Zielbild; die Klarstellungen machen es einfacher — Umrissschleifen je Teil statt einer
   Silhouette, Loops als Linien (Spant, Reifen, ⌘R werden eins), Fairness ohne Zielform statt Füllung aus der Sichthülle, der
   Käfig ist das Spielnetz. Zehn Lücken/Denkfehler (Abschnitt 4), Werkzeugtabelle (zwölf Dinge entfallen, Abschnitt 5),
   13 Ideen (Abschnitt 6), acht Entscheidungen für Florian (Abschnitt 10).
3. **Prüfplan P0–P3** [`docs/plans/2026-11-02-pruefplan-p0-p3.md`](plans/2026-11-02-pruefplan-p0-p3.md): P0a Spielstufe im
   Editor (1–2 Tage), P0b iPhone (mit Florian), P1 „Ansichten als Illustration“ (4–5 Tage), P2 „Stücknetz im Maulfeld“ mit
   Budget-Tor (3–5 Tage), P3 „Loops und Linien am ganzen Körper“ (4–5 Tage); je Fälle, Maße, Tore, Bilder, Abbruch, „Was du
   siehst“. Zusammen 14–19 Arbeitstage.
4. **Recherchen und Inventar:** [`docs/research/2026-11-02-recherche-linienzeichnung-3d.md`](research/2026-11-02-recherche-linienzeichnung-3d.md)
   (kein veröffentlichtes System deckt das Zielbild ganz ab; Zutaten belegt: Prasad/Cashman, Schaefer 2004, Monster Mash,
   Dual Strip Weaving, ConTesse), [`docs/research/2026-11-02-recherche-spielnetz.md`](research/2026-11-02-recherche-spielnetz.md)
   (Stufe 1 mit Grenzflächen-Lagen und -Normalen, Fehler gegen die Grenzfläche, Budgetregel 8 · Käfigflächen),
   [`docs/research/2026-11-02-inventar-editor.md`](research/2026-11-02-inventar-editor.md) (alle Werkzeuge, Chips, Linienstile).
5. **Messung Spielstufe** (heutiger Käfig auf Stufe 1): [`docs/progress/editor/spielstufe-2026-11-02.md`](progress/editor/spielstufe-2026-11-02.md),
   Skript `apps/editor/scripts/pruefen/spielstufe.ts` (+ `spielstufe-bild.mjs`); Zahlen in der Gegenprüfung, Abschnitt 8. Kern:
   Stufe 1 trägt das Budget nur ohne Maul (3 200–6 288 Dreiecke; der Einsatz auf K2 liegt beim 2,4–3,2-Fachen schon auf
   Stufe 0); der Spiel-Umriss ist auf der Grenzlage 0,4–2,8 px polygonal; die Facetten abseits der Falten (Rex 133°, Langhals
   53°) sind Käfigfehler, die Stufe 3 verdeckt; **flache Flanken kommen aus den gezeichneten Querschnitten, nicht aus
   „berühren mittel“** (≤ 3,2 Punkte) — Korrektur an der Recherche vom 21.10.
6. Nebenbei committet: die am 22.10. liegengebliebene Korrektur des Strahlrasters (V8-Fehler, `rasterZelle`,
   `raster-gleichlauf.ts`; Test grün).

## Entscheidungen, die Florian treffen muss (Gegenprüfung, Abschnitt 10)

E1 verdeckt = blass (gestrichelt = weich) · E2 verdeckte Umrissstücke und Ansatzlinien als Vorschlagslinie, gebaut wird nur, was
im Dokument steht · E3 Spanten/Reifen entfallen zugunsten gezeichneter Loops · E4 kantig nur durch harte Linien, sonst rund und
Widerspruch rot · E5 Spielstufe 1, Budget 8 000 Dreiecke samt Maul, Dreieckszahl sichtbar · E6 seine Wesen als Prüfwesen zuerst ·
E7 Loops in Front/Back als Projektion bearbeitbar · E8 Strichbreite = Rundung (nicht Winkel). Ohne Antwort gelten die Vorschläge.

## Nächster Schritt

**Florian liest Gegenprüfung und Prüfplan und gibt frei** (oder ändert). Danach Schritt 3: die Beweise, streng nach Prüfplan,
beginnend mit P0a. Start-Prompt zum Einfügen:

> Lies `CLAUDE.md`, `docs/UEBERGABE.md`, die Gegenprüfung `docs/plans/2026-11-02-gegenpruefung-liniennetz.md` und den
> freigegebenen Prüfplan `docs/plans/2026-11-02-pruefplan-p0-p3.md`. Meine Entscheidungen E1–E8: […]. Führe P0a aus, dann
> P1, P2, P3 — streng nach Plan: im Kern hinter Schaltern, ohne Schalter bitgleich, der Kernring bleibt eingefroren, im Editor
> nur neue Anzeigen hinter Schaltern; am ersten Tag jedes Beweises ein Bild aus dem Editor, nach jedem Beweis Kontaktbögen,
> Zahlen, Planseite „Stand“, Register, Übergabe, Commit und Push; Abbruchkriterien strikt; nichts als bestanden melden. Nach
> jedem Beweis anhalten und mir die Bilder zeigen.

Falls Florian Teil 2 (Bausteine) schickt: wörtlich nach `docs/plans/2026-10-22-bausteine-wuensche.md`, nicht planen; nur prüfen,
was das Fundament bereitstellen muss (Anker im Prüfplan: Zahnfleischreihe in P2, Augenschleife mit Brauenwulst in P3).

## Falls Florian beim Kernring bleibt (unwahrscheinlich)

Der Stand von Teil A (E1–E2.6, Haut-Tor 41 von 43, Mundwinkel 43 von 43) steht auf der Planseite
[`docs/plans/2026-10-21-maul-einsatz-weiter.md`](plans/2026-10-21-maul-einsatz-weiter.md) („E2.6 Leiter — Bauplan“, „Stand
E2.6“, Nachträge E1), im Register „Befunde aus E1/E2“ und in der Übergabe vom 21.10. (Git-Verlauf, Commit 772b5c27). Offen dort:
Rex mittel gerade (Knick an der Kreuzung), Robbe hoch J (Engstelle), E2.4, E3–E6. Der Kernring passt in kein Spiel-Budget
(Stufe 1: 76 000–104 000 Dreiecke); das müsste zuerst gelöst werden.

## Werkzeuge und Prüfskripte (Auswahl)

- Kern-Tests `pnpm --filter @ee/shape test`; Extremreihe `pnpm --filter @ee/shape test:extrem` (wöchentlich in CI);
  Kernring-Reihe `npx vitest run -c vitest.extrem.config.ts src/kern/einsatz/kernring.extrem.ts` aus `packages/shape` (≈ 5 min).
- Messskripte aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<datei>.ts` — `dreieck-budget.ts`
  (Dreiecke je Stufe, Maul-Einsatz), `spielstufe.ts` (Stufe 1 gegen Grenzfläche, Facettierung, flache Bänder),
  `teilA/e1-reihe-k2.ts` (Kernring-Reihe), `einsatz-loesen.ts` (Mundwinkel nah), `raster-gleichlauf.ts` (V8-Gegenprobe unter Last).
- Editor-Prüfungen (Playwright, eigener Vite auf 5192): `apps/editor/scripts/pruefen/run-check.sh <skript.mjs>`; Liste in
  `apps/editor/scripts/pruefen/README.md`.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen nicht
  stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und
  begründet auf die Planseite schreiben. Maßstab: Netz immer glatt und schön außer an gewollten Kanten.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert. Neue
  Wege hinter Schaltern, ohne sie bitgleich.
- Mit Florians Ablauf testen (Kugel → umformen → Linien → Loops). Immer sagen, was im Editor ist und was nur im Kern.
- Eigener Vite auf 5192 (`run-check.sh`), nie Florians 5180, seinen Dev-Server nicht starten. Während eines E2E-Laufs keine Dateien
  unter `apps/editor/src` oder `packages/shape` ändern; E2E-Läufe überschreiben Bilder in `docs/progress/editor/` — vor dem Commit
  zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen; nie in `~/Documents/early earle Editor/Bibliothek` schreiben.
- macOS hat kein `timeout`: lange Läufe im Hintergrund mit Ausgabe in eine Datei; ein `timeout …`-Aufruf scheitert still mit
  Exit 127 (am 02.11. passiert — Testlauf war gar nicht gelaufen).
- Keine Modellnamen in Commits, Docs oder Code. Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks
  überschreiben.
