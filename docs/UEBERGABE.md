# Übergabe (Stand 20.10.2026 nachts: V0–V3 gebaut)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise (Umrisse als
Käfigschleifen mit Silhouettenbedingung, Linien gleichzeitig, Härte = Rundungsbreite, Loops = Querschnittslinien), Bedienung
nach Blender (⌘R-Loops, G/S/R, proportional), Schritte V0–V9 mit Toren. Am Ende **„Stand“** mit V0–V3. Offene Kritik:
[`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus V3“).

Florians Entscheidungen 20.10.: Reihenfolge gemischt; G nach Kontext (Auswahl → Greifen, sonst Pinsel „Ziehen“; S wird
Skalieren, Spanten/Loops setzt ⌘R); ein Loop setzt echte, formneutrale Knoten in Seite und Top. Die Cloud-Sitzung „Genauer
Zug“ (Branch `claude/sweet-newton-w3ao60`) war ein Versehen — ignorieren, nicht zusammenführen.

## Letzter Stand: V3 „G/S/R und proportionales Bearbeiten in den Blättern“ gebaut (Abnahme offen)

- **G, S, R wie in Blender** (`apps/editor/src/editing/modal/`): Punkte in einem Blatt wählen, Zeiger aufs Blatt, Taste —
  die Auswahl folgt dem Zeiger ohne Maustaste. Greifen: eigene Umrissknoten, Knoten einer P-Linie (bleiben auf der Haut),
  Spantpunkte (Front/Back), Ringe fremder Knoten (nur in der gemeinsamen Koordinate). X/Y/Z sperren, ⇧X/⇧Y/⇧Z „alles
  außer“, Zahlen (G px, S Faktor, R Grad), Enter oder Klick übernimmt, Esc, Rechtsklick, ⌘Z oder Fokusverlust nehmen genau
  zurück. Ohne Auswahl wie bisher: G = Pinsel, S = Spant-Werkzeug (bis V6).
- **Proportional:** O an/aus, ⇧O Abfall, ⌥O „nur verbunden“ (längs der Kurve); Radius = Pinselradius, Mausrad und [ ]
  ändern ihn während G/S/R und beim Ziehen eines Punkts (mit O wirkt auch der Zug proportional). Kreis im Blatt, Zeile im
  Dock.
- **Tore erfüllt:** S 2 und R 90° exakt (Abweichung 0), glatte Griffe auf einer Geraden, Abbrechen JSON-gleich, ein
  Undo-Schritt, ≤ 6,4 ms je Mausbewegung (Rechnung und Store), ⌘R lädt nicht neu. Prüfskripte `modal-2d.mjs` (38) und
  `proportional.mjs` (22) grün, Unit-Tests 38 grün.
- **Bilder:** `docs/progress/editor/v3-g-y-kegel-2026-10-20.jpg` (G mit Y-Sperre, Achsenlinie, Dock),
  `docs/progress/editor/v3-proportional-langhals-2026-10-20.jpg` (O am Langhals, Einflusskreis).
- **Befunde** (Register): Spantpunkte unter deckungsgleichen Front-Knoten sind nicht greifbar (alt); `e2e/spanten.spec.ts`
  ist rot an einer Erwartung der alten Versuchs-Bauweise, unabhängig von V3; G/S/R fehlen noch in Posen und auf der Bühne.

Davor (Abnahme offen): **V0** Fallen und Bedienfehler; **V1** Prüfstand „Extremreihe“; **V2** saubere Umrisslinien — von
Florian **nicht abgenommen** („Die Linien wirken immer noch sehr sehr wild“), vor dem nächsten Anlauf an seinem Bild klären,
welche Linien er meint.

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. Neues Wesen; in der Seite zwei, drei Punkte wählen (Klick, ⇧-Klick oder Rahmen), Zeiger aufs Blatt, **G** — die Punkte
   folgen der Maus ohne Taste. **Y** sperrt auf die Höhe (grüne Linie), **2 0 Enter** schiebt genau 20 px. **Esc** oder
   Rechtsklick nimmt alles zurück.
2. In der Front alle Punkte mit einem Rahmen wählen, **S 2 Enter**: Die Front wird genau doppelt so groß (symmetrisch, die
   Mitte liegt auf der Achse). **R 9 0 Enter** in der Seite dreht um 90°.
3. **O** einschalten, einen Punkt am Hals greifen (mit **G** oder einfach ziehen) und das **Mausrad** drehen: Der Kreis
   wächst, die Nachbarn gehen weich mit. **⌥O** (nur verbunden): Die Brust bleibt, auch wenn sie im Kreis liegt. **⇧O**
   wechselt den Abfall.
4. Einen Ring eines fremden Knotens greifen (z. B. ein Front-Knoten in der Seite), dann **G**: Er wandert nur in der
   gemeinsamen Richtung.
5. Dein Urteil zu V3 (und, wenn du magst, ein Bild davon, welche Linien aus V2 dir wild vorkommen), dann geht es mit V4
   „Exakte Umrisse“ weiter.

## Offen für Florian

- Abnahme V0, V1, V3; **V2 nicht abgenommen** — welche Linien wirken wild?
- Nächster Schritt nach Plan: **V4 „Exakte Umrisse“** (erst der Beweis mit Abbruchkriterium: Kugel, Ei, Robbe, Tiger,
  Vase, einfache Form, dein Kegel, künstlicher Widerspruch).
- Weiter offen (mit Vergleichsbild, wenn der Schritt sie braucht): Entenflügel flach oder Schale an der Glockenflanke (V7);
  dünne Kanten Klinge oder rund; einfache Form — Stacheln als Paar oder im Rumpf; Überhang (Kopf als Teil mit Kragen oder
  Y-Stück).

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild und Halt. Keine Meldung „fertig/bestanden“
  ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Jede Korrektur mit einem Test, der vorher rot ist (Gegenprobe mit dem alten Code); verfehlte Tore als `it.fails` mit
  Registereintrag, nie still gelockert. Jede Stufe gegen `test:extrem`; Verbesserungen als neue Grundzahlen
  (`GRUNDZAHLEN=1`, mit `KOERPER` nur deren Einträge), Aufräumen bitgleich (`HASH=1` vorher/nachher).
- Mit Florians Ablauf testen (Kugel → umformen → …): `imAblauf`/`editorBauen` im Kern, echte Züge im Editor. Immer sagen,
  was im Editor ist und was nur im Kern.
- Zeiten nur als Minimum mehrerer Läufe messen (die Maschine läuft oft unter Last bis 26); Zeittests der Suite einzeln
  nachprüfen, bevor man sie einer Änderung zuschreibt.
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180. Während eines E2E-Laufs keine
  Dateien unter `apps/editor/src` ändern (Hot Reload); E2E-Läufe überschreiben Bilder in `docs/progress/editor/` — vor dem
  Commit zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
