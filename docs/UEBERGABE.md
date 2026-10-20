# Übergabe (Stand 20.10.2026 abends: V0 und V1 gebaut)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise (Umrisse als
Käfigschleifen mit Silhouettenbedingung, Linien gleichzeitig, Härte = Rundungsbreite, Loops = Querschnittslinien), Bedienung
nach Blender (⌘R-Loops, G/S/R, proportional), Schritte V0–V9 mit Toren. Am Ende **„Stand“** mit V0 und V1. Offene Kritik:
[`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus V1“).

Florians Entscheidungen 20.10.: Reihenfolge gemischt; G nach Kontext (Auswahl → Greifen, sonst Pinsel „Ziehen“; S wird
Skalieren, Spanten/Loops setzt ⌘R); ein Loop setzt echte, formneutrale Knoten in Seite und Top. Abends: Die Cloud-Sitzung
„Genauer Zug“ (Branch `claude/sweet-newton-w3ao60`) war ein Versehen — ignorieren, nicht zusammenführen.

## Letzter Stand: V1 Prüfstand „Extremreihe“ gebaut (Abnahme offen)

- **39 Prüfkörper** in sieben Gruppen, darunter dein Kegel vom 20.10. mit stimmigen Maßen (`kern/pruefen/extremreihe.ts`),
  gemessen wie der Editor baut (Röhre und Teile, frisch und aus der Startkugel; `kern/pruefen/extremMessung.ts`): Δ und
  Saum, Widerspruch, Falten nach Zonen, Durchdringungen, Käfiggüte, Rauschen der Netzlinien, P-Linien, Bau- und Zugzeit.
- **Ausgabe:** Tabelle `docs/progress/editor/v1-extremreihe-2026-10-20.md`, Kontaktbögen je Gruppe
  `docs/progress/editor/v1-extremreihe-<gruppe>-2026-10-20.jpg`.
- **Test:** Grundzahlen „nicht schlechter als heute“ mit `pnpm --filter @ee/shape test:extrem` (78 Tests, ≈ 85 s; nach jedem
  Schritt lokal, wöchentlich in CI); schnelle Wächter im normalen Lauf.
- **Editor-Szenarien** `apps/editor/scripts/pruefen/v1-ablauf.mjs` (echte Maus und Tasten): kleine Züge aus der Kugel,
  ⌘Z/⇧⌘Z nach eingefügten Punkten, Körperart umschalten mit Pinsel, ein Teil kommt und geht, Linien setzen/härten/kreuzen.
- **Zufallsreihe** (`v1-zufallszuege.ts`, 200 Züge an Umrissknoten, gekoppelt wie im Editor): kein Bau scheitert; Sprung am
  Gestenende Röhre 8/114 über 0,5 px, Teile 85/86 (Median 16,5 px); 13 Züge klappen einen sauberen Körper neu um; die
  Kopplung erzeugt in 4 Zügen Selbstschnitte im gekoppelten Blatt.
- **Aufräumen bitgleich** (Fingerabdrücke aller 156 Netze gleich): alter G4-Teilbau und acht tote Funktionen entfernt,
  Ring-Maßstab und Querschnittspunkt von Röhre und Baum geteilt; die vier Cholesky-Löser, Laplace-Masken und Sichthüllen
  rechnen verschieden und bleiben bis V4.
- **Behoben** (je Test vorher rot): Stiftlinien zogen den Körper auf die Sehne zwischen ihren Knoten (Kugel mit zwei
  gekreuzten Linien Δ 10,5 → 1,3 px, Falten 111° → 16°); kurze Querlinien hießen „Reihe“ ohne Kante; Absturz der
  Durchdringungsprüfung an langen, dünnen Körpern.
- **Befunde** (Register „Befunde aus V1“): Röhre faltet an Ecken, Buckeln, Sicheln und fast allen Mehrteilern und lässt
  Ohren, Scheren, Arme, Hörner weg; „Teile“ trägt die meisten Mehrteiler besser, versagt an Krabbe, Krake, Pyramide, Keil,
  Blatt und springt am Gestenende um 4–22 px; einteilige Körper verfehlen Front/Top um 7–14 px; Netzlinien rauschen;
  Käfiggüte weit vom Ziel; Treppe auf „Teile“ 6–67 px neben den Linien.

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. Mit dem Stift (P) eine Linie mit drei Klicks quer über die Kugel setzen, Enter, mit ⇧W an jedem Knoten nach außen
   ziehen (100 %), eine zweite Linie kreuzend: Der Körper bleibt auf seinen Umrissen (vorher beulte er bis 10 px aus).
2. Am Kegel oder Vierbeiner eine kurze harte Querlinie: Sie bekommt immer eine Kante (Kantenliste „genau“ oder „Treppe“).
3. Kontaktbögen der Extremreihe ansehen (Bilder oben): Welche Formen sollen als Nächstes sauber werden? Dein Urteil
   bestimmt, was in V2–V7 zuerst kommt.
4. Weiter aus V0: ⌘R lädt nicht neu; [ ] (⌥5/⌥6) Pinselradius; Rückgängig bringt eingefügte Punkte nicht zurück;
   Körper „Teile“: Stift an einer Teilspitze setzt einen Punkt; „Umriss schneidet sich“ im Blatt-Titel.

## Offen für Florian

- Abnahme V0 und V1; danach **V2 „Saubere Linien“** (Netzlinien als glatte Kurven ohne Schleifen, Liniennetz-Farben
  getrennt von den Teilen).
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
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180. Nie `assets/fonts/Hippie
  Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
