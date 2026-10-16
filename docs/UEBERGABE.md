# Übergabe (Stand 16.10.2026 morgens: neue Sitzung für Falten, Wirbelsäulen und Kantenlinien)

Branch `claude/editor-grundlayout`.

## Einstieg

Florian startet eine frische Sitzung für **Falten, Wirbelsäulen und Kantenlinien**. Alles aus der Exploration vom 13. bis
16.10. zu diesen Themen steht geordnet in
**[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md)**:
Florians Ziele und Entscheidungen, was im Editor läuft und was nur im Kern, Messungen, Ursachen, Lehren, Regeln,
Code-Landkarte, Werkzeuge und eine Empfehlung für den Start.

Maßgeblich bleibt der freigegebene Plan
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md) (Teile A, H, G,
B, L mit Stand je Schritt) samt Kritik-Register [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md).
Der Plan [„Formgerechte Topologie“](plans/2026-10-16-formgerechte-topologie.md) ist zur Freigabe vorgelegt, nicht freigegeben.

## Letzter Stand (16.10. morgens)

- **Regression G2 behoben** (00681e29): Eingefrorene Wirbelsäulen-Enden blieben nach dem Umformen an der alten
  Kugelstelle (Florians Schnabel mit Unterbiss Seite Δ 32 px, Vase quer). Mit Maul jetzt bitgleich wie vor G2, ohne Maul
  gelten eingefrorene Enden nur, solange sie die Form tragen. Regressionstests in `kern/grundkoerper/enden.test.ts`.
  Befund und Regel im Kritik-Register und in `CLAUDE.md`. **Florian muss nach dem Pull den Dev-Server neu starten.**
- **Im Editor:** eine Wirbelsäule je Wesen (24 × 16), alter Maulbau, Kantenlinien als Treppe, Reifen, Posen B1–B7.
- **Nur im Kern:** Maul als Einsatz A1–A7 (angehalten am Mundwinkel und an der Lippenauflösung), Linien als Reihe/Ring
  (L0.1, Fall 4, Fall 5 teilweise; Normalen schräger Linien 1,4–6,6°, für Florian nicht genau genug), Wirbelsäulen-Baum
  (Mittelachse, Zerlegung, Baum Schritt 2/3, Knoten v1 — Ansatz und Knick noch nicht gelöst).
- **Werkzeuge** für Florians Ablauf und Regressionsvergleiche: `apps/editor/scripts/pruefen/vergleich/` (README-Nachtrag 16.10.).

## Offen (Auswahl, Details im Einstiegsdokument)

- Falten an sichtbaren Stellen: Langhals-Nacken, Rex-Schnauze, Robbe, Überhang, kleine Mäuler, Schnabel mit Unterbiss, Vase.
- Wirbelsäulen-Baum automatisch und faltenfrei (Ansatz, Knick, flache Äste, Gabeln, senkrechte Wesen).
- Linien exakt (Florian: Haut ≤ 0,05 px, Normalen ≤ 0,1° als Ziel), Fälle 2, 3, 6, Panzerrand, L1/L2.
- Maul als Einsatz in den Editor (nach Lösung von Mundwinkel und Übergangsreihe).
- B8–B10 (Posen), Teil H (Werkzeug-Harmonie): nicht Thema der neuen Sitzung.

## Arbeitsregeln

- Keine Meldung „fertig/bestanden“ ohne Florians Abnahme; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
