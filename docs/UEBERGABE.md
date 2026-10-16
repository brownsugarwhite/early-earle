# Übergabe (Stand 16.10.2026 nachts: S5-Reste R1/R2 gebaut — Kragen statt Sehne, Flossen-Paare; Halt für Florians Blick)

Branch `claude/editor-grundlayout`.

## Einstieg

Maßgeblich ist der freigegebene Plan
**[`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)** (Befund,
Florians Klarstellung „3D-Liniennetz = einzige Wahrheit“, Bauweise „Form zuerst, dann der Käfig darüber“, Schritte S0–S8
mit Toren, Bauplan S5, **S5-Reste** mit Befund und Stand). Vorgeschichte:
[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
Gesamtplan und Kritik-Register bleiben gültig:
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md),
[`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus den S5-Resten“).

## Letzter Stand

- **S0–S5** gebaut (Widersprüche rot, Liniennetz in allen Blättern, Kopplung jedes Punkts, glatte Haut, Front berühren,
  Teile erkennen, Mittelebenen-Baum als Geist im Editor). Florian zu S4: „Die Einordnung passt.“
- **S5-Reste** (Florian nach S5: „ok, du kannst weiter machen“; Abnahme offen):
  - **R1 Kragen statt Sehne** (Standard im Baum): Der erste Kindring ist eine U-Schleife auf der Rumpfhaut. Damit gibt es
    keine Punkte mit sechs Kanten mehr auf der Naht; das war die Ursache der Hohlkehlen-Falten. Ansatz: Giraffe 20,5 → 11,2°,
    S-Hals 23,4 → 13,4°, Ente 24,6 → 16,4°. Δ wie vorher, kleinster Käfigwinkel bis 28°.
  - **R2 Rücken- und Bauchflosse über denselben Rumpfringen:** Die Fisch-Bauchflosse ist jetzt ein eigener Streifen. Fisch
    frei 31,8 → 21,9°, Δ 1,6/7,2/4,5 → 1,5/4,7/2,3 px. Kappen sind mindestens 0,8 Kantenlängen lang (Ente-Schwanz 77 → 53°).
  - **R3 Übergang höher am Hals:** gemessen, nicht anwendbar (über der Halstaille hängt der Kopf, 63 % des Rumpfumfangs).
  - **R4 Überhang-Grat:** nach drei gemessenen Fehlanläufen angehalten (Querschnitt je Ring, geglättet, Spant); Wege im
    Kritik-Register.
  - Im Editor: Der Geist (Tafel Körper → „Teile (Geist)“) baut mit Kragen, `s5-editor.mjs` grün (Fisch 262 ms > 250).
  - Bilder: [`s5-reste-kragen-bogen-2026-10-16.jpg`](progress/editor/s5-reste-kragen-bogen-2026-10-16.jpg) (Sehne | Kragen
    mit Zebra-Nahansicht), [`s5-reste-kragen-zebra-2026-10-16.jpg`](progress/editor/s5-reste-kragen-zebra-2026-10-16.jpg),
    [`s5-reste-kragen-auslegung-2026-10-16.jpg`](progress/editor/s5-reste-kragen-auslegung-2026-10-16.jpg),
    [`s5-reste-kragen-editor-2026-10-16.jpg`](progress/editor/s5-reste-kragen-editor-2026-10-16.jpg).
- **Noch nicht auf dem Baum:** P-Linien (`dok.kanten`), Maul, Posen, Pinsel — der Einbau ist S7.
- Prüfungen: Kern-Tests `baumKaefig.test.ts` (Kragen-Topologie), `baumBau.test.ts` (Kragen, Flossen-Paar); Skripte
  `apps/editor/scripts/pruefen/s5-mess.ts`, `s5-bogen.ts` (neu: `VARIANTEN`, `NAH`), `s5-auslegung.ts` (`ANSATZ`),
  `s5-editor.mjs`. `pnpm typecheck` grün, Kern-Tests 446/446, Lint ohne Fehler.

## Entschieden (16.10.)

- „glatt“ und „Umrisse berühren: mittel“ sind Standard für neue Wesen.
- **P-Linien als echte Kanten** (Florian, abends; Planseite S7/S8): Reihenfolge bleibt — S8 „P-Linien als echte Kanten
  (Linien exakt)“ nach S7, in Klartext mit seinem Ablauf (P zeichnen, ⇧W Härte, ⌥-Ecke für den Winkel, Bearbeiten in allen
  Ansichten und auf der Bühne, Posen) und zehn Toren. Bis dahin **kein Rückschritt**: Auf mehrteiligen Körpern wirken
  P-Linien in S7 mindestens wie heute als Treppenfalte (je Streifen und über die Ansätze).

## Offen für Florian

- **Den Geist mit Kragen ansehen** (Tafel Körper → „Teile (Geist)“), am besten an einem eigenen Wesen mit Hals.
- **Dünne Kanten:** Flossen- und Schwanzkanten als Klinge (scharfe Kante) oder rund? (Fisch-Rückenflosse 22–26° an der
  Hinterkante, Entenschwanz Kappe 53°.)
- **Wie weiter:** S6 (seitliche Teile: Flügel, Brustflossen, Beine) oder erst der Überhang (Kopf als eigener Streifen,
  Gabel oder Querschnitt aus der Sichthülle, s. Kritik-Register)?
- Mehrdeutige Ausbuchtungen (Rex-Schwanz und -Stirnwülste, Robbenkopf, Tiger-Schnauze, Vierbeiner-Kopf) — Teil oder nicht?
- **Angleichen** an alten Zeichnungen: Verhalten ok (die Ansicht mit dem Knopf führt)?

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild, dann Halt für Florian. Keine Meldung
  „fertig/bestanden“ ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern. Florian nach dem Pull: Dev-Server neu starten.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
