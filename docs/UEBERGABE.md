# Übergabe (Stand 20.10.2026 nachts: V0–V3 gebaut, V4-Beweis angehalten)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise (Umrisse als
Käfigschleifen mit Silhouettenbedingung, Linien gleichzeitig, Härte = Rundungsbreite, Loops = Querschnittslinien), Bedienung
nach Blender (⌘R-Loops, G/S/R, proportional), Schritte V0–V9 mit Toren. Am Ende **„Stand“** mit V0–V3 und dem angehaltenen
V4-Beweis. Offene Kritik: [`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus V4“).

Florians Entscheidungen 20.10.: Reihenfolge gemischt; G nach Kontext (Auswahl → Greifen, sonst Pinsel „Ziehen“; S wird
Skalieren, Spanten/Loops setzt ⌘R); ein Loop setzt echte, formneutrale Knoten in Seite und Top. Die Cloud-Sitzung „Genauer
Zug“ (Branch `claude/sweet-newton-w3ao60`) war ein Versehen — ignorieren, nicht zusammenführen. Nach V3: weiter mit V4; die
farbigen Umrisslinien aus V2 stören ihn → standardmäßig aus (Tafel Körper → „umrisse aus | an“).

## Letzter Stand: V4 „Exakte Umrisse“ — Beweis angehalten (Entscheidung offen)

- **Gebaut, nur im Kern** (Schalter `ausstattung.umrisseExakt`, nicht in der Tafel; ohne ihn bitgleich): Löser je Achse
  (`packages/shape/src/loeser/achsen.ts`), Breitenlinie (`packages/shape/src/kern/umrisse.ts`: Reihe N/4 durch die Kappen,
  Lage und Tangente, Vorlagen mit der breitesten Stelle auf N/4), Frontlinie und Ungleichung als Versuche (nur auf Wunsch).
- **Gemessen** (`apps/editor/scripts/pruefen/v4-beweis.ts`, Bogen `docs/progress/editor/v4-beweis-breitenlinie-2026-10-20.jpg`):
  Die Breitenlinie bringt das Top an runden Körpern auf die Linie (Kugel 0,1, Robbe 12,5 → 1,2, Kegel 2,6 → 0,6 px), bricht
  aber an Kappen mit Kasten, stehendem Ende oder Kerbe (Tiger, Vase, einfache Form; Falten bis 177°).
- **Frontlinie: drei gemessene Fehlanläufe, angehalten** (Ringstücke an den nächsten Punkt; Ringstücke waagerecht; äußerster
  Punkt je Linienstück). Ursache: Die Röhre hat an der Front-Silhouette keine Käfigkurve (die Silhouette liegt zwischen
  Ringen, auf der Kappe oder an kastigen Enden); einzelne Punkte hart zu binden kämpft gegen den Käfig.
- **Entscheidung für Florian:** A (Empfehlung) — die Struktur folgt den Umrissen: zuerst der Kern von V6 (Loop = neuer
  Käfigring an genauer Stelle, formneutral), dann V4 mit einem Ring an der breitesten Stelle der Front und Kappen nach
  Endform. B — der Löser bindet entlang der Normalen (gekoppeltes System, einseitige Ungleichung), allgemeiner, Ausgang offen.

Davor (Abnahme offen): **V3** G/S/R und proportional in den Blättern (gebaut, Tore erfüllt; Testanleitung unten);
**V0** Fallen und Bedienfehler; **V1** Prüfstand „Extremreihe“; **V2** saubere Umrisslinien — nicht abgenommen („die
Linien wirken immer noch sehr sehr wild“), jetzt ausgeblendet; V4 macht genau diese Linien später zu Käfigschleifen.

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. Die farbigen Umrisslinien der anderen Ansichten sind weg; die Ringe deiner Knoten bleiben. Tafel Körper → „umrisse an“
   bringt sie zurück.
2. V3: Punkte in einem Blatt wählen, Zeiger aufs Blatt, **G** (folgt ohne Maustaste), **Y** sperrt, **2 0 Enter** = 20 px,
   **Esc** oder Rechtsklick nimmt zurück; **S 2 Enter** über der ganzen Front verdoppelt sie symmetrisch; **R 9 0 Enter**
   dreht. **O** schaltet proportional ein, das Mausrad ändert den Einfluss (auch beim Ziehen eines Punkts), **⌥O** = nur
   verbunden (am Langhals bleibt die Brust).
3. Den V4-Bogen ansehen: Wo die Kappen zerknittern (Tiger, Vase), sieht man, warum die Front nicht an festen Ringen hängen
   kann.

## Offen für Florian

- **V4: Weg A oder B** (siehe oben; Planseite „V4 — Beweis angehalten“).
- Abnahme V0, V1, V3; V2 nicht abgenommen.
- Weiter offen (mit Vergleichsbild, wenn der Schritt sie braucht): Entenflügel flach oder Schale an der Glockenflanke (V7);
  dünne Kanten Klinge oder rund; einfache Form — Stacheln als Paar oder im Rumpf; Überhang (Kopf als Teil mit Kragen oder
  Y-Stück).

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild und Halt. Keine Meldung „fertig/bestanden“
  ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten (V4-Frontlinie: angehalten).
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
