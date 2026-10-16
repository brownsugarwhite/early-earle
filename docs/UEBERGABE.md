# Übergabe (Stand 16.10.2026 nachmittags: S1 Liniennetz und S1c Kopplung jedes Punkts gebaut, Florians Entscheidungen umgesetzt)

Branch `claude/editor-grundlayout`.

## Einstieg

Maßgeblich ist der freigegebene Plan
**[`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)** (Befund, Antwort
auf Florians „Denkfehler?“, Florians Klarstellung „3D-Liniennetz = einzige Wahrheit“, Bauweise „Form zuerst, dann der Käfig
darüber“, Schritte S0–S8 mit Toren, Stand je Schritt). Vorgeschichte:
[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
Gesamtplan und Kritik-Register bleiben gültig:
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md),
[`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus S1/S1c“).

## Letzter Stand

- **S0** gebaut (Widersprüche rot im Editor, genaues Δ, Faltenmaß nach Zonen).
- **S1 und S1c gebaut, alles im Editor** (Bauweise Kern, Editor-Tab): Liniennetz in allen Blättern (fremde Umrisse als
  3D-Linien, Knoten als Ringe, Kantenlinien und Falten auf dem echten Körper, verdeckt blass; Stil „netz ton/farbe“ in der
  Tafel Körper), Kantenlinien auf dem Kern-Körper ohne versteckte Schreibvorgänge, derselbe Punkt mit Hover-Marke in allen
  Blättern und auf der Bühne, fremde Knoten greifen und entlang der gemeinsamen Koordinate ziehen (⌥ wechselt),
  **Kopplung jedes Punkts** in jeder Formgeste und „angleichen“ im Blatt-Titel bei alten Widersprüchen.
- Tore gemessen (Tabelle auf der Planseite): derselbe Punkt 0,00 px, Sichtbarkeit 100 %, Formgeste nur Profile und ein
  Undo-Schritt, nach jeder Geste Widerspruch ≤ 1 px (Kern: 323/325 Zufallsgesten, Rest = zu wenige Knoten in der folgenden
  Ansicht), Worker 17–18 ms (Vierbeiner 33,5 ms).
- Kontaktbogen: [`docs/progress/editor/s1-liniennetz-2026-10-16.jpg`](progress/editor/s1-liniennetz-2026-10-16.jpg).
- Kern-Tests 385/385 grün, Editor-Tests 25/25, `pnpm typecheck` grün.

## Entschieden (16.10. nachmittags) und umgesetzt

- **Stil:** „farbig ist erstmal besser“ → „netz farbe“ ist Standard (Chips bleiben zum Vergleichen).
- **Fehlende Knoten:** „einfügen, aber nur wenn wirklich notwendig“ → die Kopplung teilt bei einem Rest über 1 px ein
  Segment der folgenden Ansicht (höchstens zwei je Zug, nur wenn es hilft; Spanten und Auswahl gehen mit). Kern:
  325/325 Zufallsgesten stimmig, 2 nötige Punkte; Editor: `netz-e.mjs` grün.

## Offen für Florian

- **Angleichen** an alten Zeichnungen: Verhalten ok (die Ansicht mit dem Knopf führt)?
- **Nächster Schritt:** S2 (glatte Haut: dünn besetzter Löser, Glättungsmaß; Kappen und der Faltenrest im Entenhals sind
  die Prüffälle).

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild, dann Halt für Florian. Keine Meldung
  „fertig/bestanden“ ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern. Florian nach dem Pull: Dev-Server neu starten.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
