# Übergabe (Stand 16.10.2026 vormittags: Plan „Liniennetz, Zielform, Käfig“ freigegeben, S0 gebaut, Halt für Florian)

Branch `claude/editor-grundlayout`.

## Einstieg

Maßgeblich ist der freigegebene Plan
**[`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)** (Befund, Antwort
auf Florians „Denkfehler?“, Bauweise „Form zuerst, dann der Käfig darüber“, Schritte S0–S8 mit Toren, Stand je Schritt).
Vorgeschichte und alle Messungen der Exploration vom 13.–16.10.:
[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
Gesamtplan (Teile A, H, G, B, L) und Kritik-Register bleiben gültig:
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md),
[`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md).

## Letzter Stand

- Plan freigegeben (16.10. vormittags). Kern-Tests 216/216 grün (zwei Tempo-Tests nur unter Parallellast rot, einzeln
  grün); G2-Reparatur aktiv.
- **Im Editor** unverändert: eine Wirbelsäule je Wesen (24 × 16), alter Maulbau, Kantenlinien als Treppe (auf der alten
  Versuchsfläche S0 gesetzt — wird in S1 behoben), Reifen, Posen B1–B7.
- **S0 gebaut und gemessen (Abnahme offen):** Prüfsatz aus Florians Screenshots (`S0_KOERPER`), Faltenmaß nach Zonen,
  Δ genau aus den Silhouettenkanten (Standard), Erreichbarkeit/Widersprüche aus der Sichthülle; **im Editor** neu: Titel
  „Widerspruch … px“ und rote Stücke unter der schwarzen Linie. Befunde und Bilder: Planseite, Abschnitt Stand.
- **Nächster Schritt:** Florians Blick auf S0, dann S1 (Liniennetz-Ansicht).

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild, dann Halt für Florian. Keine Meldung
  „fertig/bestanden“ ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
