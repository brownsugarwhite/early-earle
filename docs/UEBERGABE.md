# Übergabe (Stand 21.10.2026 vormittags: V0–V4 gebaut, V5 „Linien exakt“ gebaut — Abnahme offen)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise, Bedienung nach Blender,
Schritte V0–V9. Am Ende **„Stand V4“** und **„Stand V5 — Linien exakt“** mit Zahlen, Bildern und dem, was offen ist. Offene
Kritik: [`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) („Befunde aus V5“).

Florian 20.10. nachts: „Du musst nicht immer nach 3 Versuchen stoppen. Es gibt für alles eine elegante Lösung! … Wichtig
ist, dass das Mesh später immer schön und smooth aussieht außer bei gewollten Kanten.“ Danach (vor dem Schlafen):
selbstständig weiter, hartnäckig, den ganzen Plan unter höchsten Kriterien; Usability und Ansicht herausragend; das Mesh soll
sich jeder Form intelligent anpassen.

## Letzter Stand: V5 — P-Linien als Käfigschleifen (mit „Querschnitt aus der Hülle“)

- **Im Editor:** Tafel Körper → „Querschnitt: aus der Hülle (V4/V5)“. Dann wird jede P-Linie eine Käfigschleife: längs eine
  Reihe des Reihenplans (Enden je ein Ring durch den Endpunkt, Reihe läuft über drei Ringe aus), quer ein eigener Ring, in die
  Linie gedreht; schräge Linien eine verzogene Reihe (kreuzen sie die Breitenlinie, werden sie die Breitenlinie). Alle Linien zugleich genau, auch während eines Zugs. Ohne den Schalter bleibt
  die Einpassung je Linie von S8a (bitgleich).
- **Form zuerst:** Mit Linien wird erst der Körper ohne Linien gebaut; der Körper mit Linien bindet sich dort an ihn, wo die
  Linien den Käfig verschoben haben. Die Linie legt die Käfigschleife fest, nicht die Form (Winkel nur, wo die Form ihn
  verlangt). Gedrehte Ringe tasten das Höhenfeld der natürlichen Ringe ab.
- **Gemessen** gegen heute (S8a): Robbe Falte 172° → 10°, Haut 4,4 → 1,4 px; Kegel vorher gar keine Kante, jetzt Ring 0,7 px;
  Rex Haut 0,7 → 0,3; Kugel mit Kreuz 1,0 → 0,7; Bau ≈ 1 s → 0,35 s; Umrisse mit Linien höchstens 0,1–0,7 px anders.
  Schlechter: die Lage in der Zeichenansicht (0,4–2,0 px statt 0–0,3); Krake (Querlinie neben Ecken-Ringen) bleibt Treppe.
  Zug mit Linien 42–57 ms.
- **Tests:** `packages/shape/src/kern/linienSchleifen.test.ts` (9 grün, am alten Code 6 davon rot; 2 Tore als `it.fails`),
  volle Kern-Reihe 509 grün + 5 bekannt rot. Editor: `apps/editor/scripts/pruefen/v5-editor.mjs` (alles ok; Linien vorher mit
  `v5-linien-vorbereiten.ts`).
- **Bilder:** `docs/progress/editor/v5-linien-huelle-{grund,kanten,lang,mehrteiler}-2026-10-21.jpg`,
  `v5-linien-heute-grund-2026-10-21.jpg`, `v5-editor-kugel-kreuz-zebra-2026-10-21.jpg`, `v5-editor-robbe-riss-2026-10-21.jpg`.

Davor (Abnahme offen): **V4** Querschnitt aus der Sichthülle (Robbe Δ 4,0/6,3/12,5 → 3,9/3,7/3,0 px, Giraffe Front 18,9 →
1,6, Hals 1:8 31,6 → 1,4; schlechter an Ecken-Körpern); **V3** G/S/R und proportional in den Blättern; **V0** Fallen und
Bedienfehler; **V1** Prüfstand „Extremreihe“; **V2** saubere Umrisslinien — nicht abgenommen („sehr sehr wild“), standardmäßig
aus.

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. Ein Wesen öffnen (Röhre, ohne Maul), Tafel Körper → „Querschnitt: aus der Hülle (V4/V5)“.
2. Mit P Linien auf die Haut zeichnen, mit ⇧W die Härte hochziehen: längs (über den Körper) und quer (um den Körper). Die
   Kantenliste zeigt „genau“; im Zebra (Matcap) läuft die Kante auf der Linie, die Form bleibt. Beim Ziehen an den Umrissen
   bleibt die Kante sichtbar.
3. Auch schräge Linien werden Schleifen (verzogene Reihe); nur Querlinien direkt neben gezeichneten Ecken bleiben Treppe.

## Offen / nächster Schritt

- V5 weiter: Lage genauer (Tor 0,3 px; Rest an den Enden und zwischen weit stehenden Ringen), Härte als Rundungsbreite (3.4),
  Grat (`Kante.tiefe`), Zug schneller.
- Danach V6 (⌘R-Loops, G/S/R auf der Bühne): Das Einfügen eines Rings nutzt dieselbe Maschine (Ring rastet ein, Nachbarn
  verziehen sich, die Form bleibt dank „Form zuerst“).
- Abnahme V0, V1, V3, V4, V5; V2 nicht abgenommen.
- Später mit Vergleichsbild: Entenflügel (V7), dünne Kanten Klinge oder rund, einfache Form (Stacheln), Überhang.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen
  nicht stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und
  begründet auf die Planseite schreiben.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert.
  Jede Stufe gegen `test:extrem`; Aufräumen bitgleich.
- Mit Florians Ablauf testen (Kugel → umformen → …). Immer sagen, was im Editor ist und was nur im Kern. **Im echten Editor
  messen:** Die Kern-Messung „Haut an der Linie“ übersah, dass Linien den Front-Umriss um 2–5 px verschoben — erst
  `v5-editor.mjs` zeigte es.
- Messen und im Bild prüfen: Das Faltenmaß übertreibt bei Mehrteilern; Kontaktbögen ansehen (`v1-extremreihe.ts` mit
  `NAH_LINIE=1 FALTEN=1 GROESSE=420` für Nahbilder der Linien).
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180. Während eines E2E-Laufs keine
  Dateien unter `apps/editor/src` ändern; E2E-Läufe überschreiben Bilder in `docs/progress/editor/` — vor dem Commit
  zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
