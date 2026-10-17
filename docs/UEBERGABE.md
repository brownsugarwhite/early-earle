# Übergabe (Stand 17.10.2026 früh: S7.1, S7.2, S7.4 — der Baum ist mit „Körper: Teile“ der Körper, folgt dem Zug, trägt P-Linien)

Branch `claude/editor-grundlayout`.

## Einstieg

Maßgeblich ist der freigegebene Plan
**[`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)** (Befund,
Florians Klarstellung „3D-Liniennetz = einzige Wahrheit“, Bauweise „Form zuerst, dann der Käfig darüber“, Schritte S0–S8
mit Toren; Abschnitte **S5-Reste**, **R5 Höhenfeld**, **Klinge**, **S6 im Detail** und **Stand S6**). Vorgeschichte:
[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
Gesamtplan und Kritik-Register bleiben gültig:
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md),
[`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus S6“).

## Letzter Stand

Florians Auftrag (16.10. nachts): „Mach so weiter wie es die beste Reihenfolge für dich ist. Hauptsache am Ende geht alles
sauber. Suche immer nochmal nach eleganteren Möglichkeiten.“ Gewählte Reihenfolge: R5 Höhenfeld → dünne Kanten → S6 → S7 → S8.

- **S0–S5 und S5-Reste** gebaut (Kragen statt Sehne, Flossen-Paare über denselben Rumpfringen; Florian zu S4: „Die
  Einordnung passt.“).
- **R5 Höhenfeld:** als Versuch gebaut, nicht Standard (Schalter `hebung: 'feld'`). Glatter an Vase und Drache, vorn 3–7 px
  ungenauer an Giraffe, Ente und Fisch.
- **Dünne Kanten als Klinge** (Standard im Baum `klinge: 0.4`): schmale Linsen-Ringe bekommen eine scharfe Naht, dünne Enden
  eine scharfe Kappenspalte (Entenschwanz 53 → 4°, Fisch-Spitzen 118 → 33°).
- **S6 seitliche Teile** (Schalter `paare`, im Editor-Geist an; Abnahme offen; Stand mit Tabelle auf der Planseite):
  - Jedes Paar (Flügel, Beine, Brustflossen, zweiter Hals) ist eine Röhre entlang seiner Achse, angesetzt über ein Fenster
    in der Rumpfhaut genau auf seinem Fußabdruck. Die Säume liegen im Löser auf dem gezeichneten Umriss, gezeichnete Ecken
    an der Spitze werden scharf.
  - Zeigt nur eine Ansicht das Teil (Entenflügel nur im Top), nimmt es Lage und Dicke aus dem Überschuss der Front über den
    Rumpf: Die Flanken der Enten-Glocke sind die Flügel.
  - Ente Top 37,4 → 1,7 px, frei/Ansatz/Kappe 17,5/15,4/4,1°; Fisch Front/Top 42,6 → 3,5/2,9 px; Vierbeiner Front 52 →
    16 px, Ansatz 19,9° (Kehle an Bein und Hals); Zweihals Seite 3,4 px (Kopf da), Ansatz 14,8°. 0 Durchdringungen, ohne
    Paare bitgleich.
  - **Nicht erreicht** (Wege im Kritik-Register): Ente Front 7,8 px (untere Glockenflanken, Rumpf mit „mittel“), einfache
    Form (Stacheln sind ein großer Teil des Körpers), Zweihals Top 27 px (Brust zwischen den Hälsen: Rumpf oder Hals?),
    Fisch 290–346 ms.
  - Bilder: [`s6-seitenteile-2026-10-16.jpg`](progress/editor/s6-seitenteile-2026-10-16.jpg) (je Körper ohne | mit
    seitlichen Teilen, mit Zebra-Nahansicht am Ansatz), [`s6-editor-geist-2026-10-16.jpg`](progress/editor/s6-editor-geist-2026-10-16.jpg).
- **S7.1 (17.10. früh, Florian: „Versuche mal noch weiter zu machen, so weit du kommst“; Plan „S7 im Detail“):** Mit Tafel
  Körper → „Teile“ ist der Baum mit seitlichen Teilen **der Körper** im Editor (Earle-Look über `baumDeskriptoren`, Atlas, Δ,
  Saum, Liniennetz vom Baum; kein Geist mehr). Während einer Geste folgt die Röhre dem Zug, am Gestenende kommt der Baum
  (bis S7.2). Pinsel, Augen, Reifen, Maul und Zähne wirken noch auf die Röhre und sind auf dem Baum aus (S7.3). Prüfung
  `apps/editor/scripts/pruefen/s7-editor.mjs` grün; Bild [`s7-baum-als-koerper-2026-10-17.jpg`](progress/editor/s7-baum-als-koerper-2026-10-17.jpg).
- **S7.2 (gebaut):** Während eines Zugs bleibt der Baum der Körper: Der Käfig des letzten genauen Baus folgt der Zeichnung
  über Mittelwert-Koordinaten der Seitenlinie und die Breitenverhältnisse aus Front und Top (`baumZiehen` in
  `kern/wesen.ts`), am Gestenende genauer Neubau. Zug 24–62 ms; der Baum-Körper überspringt Netz, Look und Δ der
  unsichtbaren Röhre. `s7-editor.mjs` zieht einen Seitenknoten (alle Zwischenstände Baum, Undo bitgleich).
- **S7.4 (gebaut):** P-Linien (`dok.kanten`) als Treppenfalte auf dem Baum (`kern/grundkoerper/baumKanten.ts`): nächster
  Käfigpunkt je Linienpunkt, kürzester Weg im Käfig über Streifen und Ansätze, Härte als Schärfe, gespiegelt. Ente, Linie
  über den Halsansatz: Knick 36,7° gegen 43,6° auf der Röhre (84 %); genau auf der Linie erst mit S8.
- **Noch nicht auf dem Baum:** Pinsel und Posen (S7.3), Augen, Reifen, Maul, Zähne.
- Prüfungen: Kern-Tests `baumBau.test.ts` (neu: „S6 seitliche Teile“ für Ente, Fisch, Zweihals), `baumKaefig.test.ts`
  (Fenster-Topologie); Skripte `apps/editor/scripts/pruefen/s5-bogen.ts` (Δ mit gebauten Paaren ohne Ausnahme),
  `s5-editor.mjs` (`SEITEN=ente:1,fisch:1,vierbeiner:2,zweihals:1`). `pnpm typecheck` grün, Kern-Tests 452/453 (ein
  Tempo-Test nur unter Parallellast rot, einzeln grün), Lint ohne Fehler.

## Entschieden (16.10.)

- „glatt“ und „Umrisse berühren: mittel“ sind Standard für neue Wesen.
- **P-Linien als echte Kanten** (Florian, abends; Planseite S7/S8): Reihenfolge bleibt — S8 „P-Linien als echte Kanten
  (Linien exakt)“ nach S7, in Klartext mit seinem Ablauf (P zeichnen, ⇧W Härte, ⌥-Ecke für den Winkel, Bearbeiten in allen
  Ansichten und auf der Bühne, Posen) und zehn Toren. Bis dahin **kein Rückschritt**: Auf mehrteiligen Körpern wirken
  P-Linien in S7 mindestens wie heute als Treppenfalte (je Streifen und über die Ansätze).

## Offen für Florian

- **Den Geist mit seitlichen Teilen ansehen** (Tafel Körper → „Teile (Geist)“), am besten an eigenen Wesen mit Flügeln oder
  Beinen. Nach dem Pull den Dev-Server neu starten.
- **Entenflügel:** Die Front-Glocke macht die Flügel zu dicken Lappen an den Flanken (so trifft der Körper Top und Front).
  Passt das, oder sollen Flügel, die die Front nicht eigens zeigt, flach bleiben?
- **Einfache Form:** Stacheln als Paar bauen (heute: große Lappen, Ansatz 36°) oder in den Rumpf nehmen (Top 77 px wie S5)?
- **Dünne Kanten:** Klinge als Standard ok?
- Überhang (Kopf als eigener Streifen, Gabel oder Querschnitt aus der Sichthülle), mehrdeutige Ausbuchtungen, „Angleichen“.

## Nächster Schritt

S7.3 Pinsel und Posen auf dem Baum (Treffer auf dem Baum-Käfig, eigene Deltas mit Anker, ohne Umbau angewandt), dann
S7.5 Standard; danach S8. Wochenlimit stand am 16.10. spätnachts bei 99 %.

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild. Keine Meldung „fertig/bestanden“ ohne
  Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern. Florian nach dem Pull: Dev-Server neu starten.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
