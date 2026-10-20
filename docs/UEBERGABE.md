# Übergabe (Stand 20.10.2026 nachts: V0, V1 und V2 gebaut)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise (Umrisse als
Käfigschleifen mit Silhouettenbedingung, Linien gleichzeitig, Härte = Rundungsbreite, Loops = Querschnittslinien), Bedienung
nach Blender (⌘R-Loops, G/S/R, proportional), Schritte V0–V9 mit Toren. Am Ende **„Stand“** mit V0, V1 und V2. Offene
Kritik: [`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus V2“).

Florians Entscheidungen 20.10.: Reihenfolge gemischt; G nach Kontext (Auswahl → Greifen, sonst Pinsel „Ziehen“; S wird
Skalieren, Spanten/Loops setzt ⌘R); ein Loop setzt echte, formneutrale Knoten in Seite und Top. Abends: Die Cloud-Sitzung
„Genauer Zug“ (Branch `claude/sweet-newton-w3ao60`) war ein Versehen — ignorieren, nicht zusammenführen.

## Letzter Stand: V2 „Saubere Linien“ gebaut (Abnahme offen)

- **Umrisslinien statt Konturen** (`packages/shape/src/kern/umrissKurven.ts`, Züge `umriss-*` im Liniennetz): entlang
  deiner Zeichnung auf die Silhouette geschoben, Tiefe glatt aus den Strahlpaaren, kubische 3D-Kurven mit deinen Knoten als
  Stützstellen. Im Editor erscheinen die Umrisse der anderen Ansichten als echte Kurven, die Ringe deiner Knoten sitzen
  auf ihrer Linie (≤ 0,5 px) und folgen beim Ziehen; die Teile haben warme Farben.
- **Gemessen an der ganzen Extremreihe** (vorher/nachher auf denselben Netzen): Knicke 1968 → 18 (+58 auf Falten des
  Körpers, dort knickt die Silhouette selbst), Schleifen 4 → 0, Stücke 1373 → 707, Linie auf der Haut ≤ 1 px; dein Kegel
  vorn 4 Stücke / 8 Knicke → 2 / 0. V2 ändert keine Form (Δ, Falten, Durchdringungen aller 78 Fälle gleich).
- **Tor nicht ganz erfüllt** (Register „Befunde aus V2“): 63 von 78 Fällen ganz sauber; 18 Knicke an 10 Fällen, 7 Fälle
  0,5–0,85 px neben der Silhouette (fast alle Röhre mit Falten oder Teile, die die Zeichnung zeigt und der Körper nicht);
  Liniennetz im Median 18 ms, an 7 Fällen 31–36 ms (Tor 30 ms, vorher bis 48 ms).
- **Bilder:** Editor vorher/nachher `docs/progress/editor/v2-editor-{kegel,wuerfel,vierbeiner,ente}-2026-10-20.jpg`,
  Kontaktbögen `docs/progress/editor/v2-linien-<gruppe>-2026-10-20.jpg`, Tabelle `docs/progress/editor/v2-linien-2026-10-20.md`.
- **Tests:** `umrissKurven.test.ts` (mit dem alten Liniennetz 6 von 6 rot), Editor `v2-editor.mjs` (alt rot, jetzt grün),
  neue Grundzahlen und Tor V2 in `pnpm --filter @ee/shape test:extrem` (79 grün, das volle Tor als erwarteter Fehler).

Davor (Abnahme offen): **V0** Fallen und Bedienfehler (⌘R lädt nicht neu, [ ] mit ⌥, Rückgängig nach eingefügten Punkten,
Klickfang der Teile, Doppelbau, Stadionform, S8a-Rückschritte, CI grün); **V1** Prüfstand „Extremreihe“ (39 Körper, beide
Körperarten, dein Ablauf; Grundzahlen-Test, Editor-Szenarien `v1-ablauf.mjs`, Zufallsreihe; Aufräumen bitgleich).

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. Neues Wesen, dann deinen Kegel nachziehen (oder einen Körper mit flachen Flanken): In Seite und Top läuft die lila
   Front-Linie jetzt als ruhige Kurve über den Körper, in der Front die blaue Seiten-Linie — vorher Zickzack.
2. Einen Knotenring einer anderen Ansicht greifen (z. B. einen Front-Knoten im Seitenblatt) und ziehen: Der Ring sitzt auf
   der Linie und wandert mit; der oberste Front-Knoten folgt nur zur Hälfte (die Kopplung der Außenmaße bremst ihn, schon
   vor V2 so).
3. Körper „Teile“ mit einem Mehrteiler (Ente, Vierbeiner): Die Teile sind jetzt warm gefärbt; Blau, Lila, Türkis heißen
   nur noch „Umriss von Seite, Front, Top“.
4. Kontaktbögen und Editor-Bilder ansehen (oben): Wo stören dich Linien noch? Dein Urteil zu V0–V2, dann geht es mit V3
   weiter.
5. Weiter aus V0/V1: ⌘R lädt nicht neu; [ ] (⌥5/⌥6) Pinselradius; Rückgängig bringt eingefügte Punkte nicht zurück;
   Stiftlinien liegen auf der Haut (zwei gekreuzte Linien beulen nicht mehr aus).

## Offen für Florian

- Abnahme V0, V1 und V2; danach **V3 „G/S/R und proportionales Bearbeiten in den Blättern“**.
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
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180. Nie `assets/fonts/Hippie
  Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
