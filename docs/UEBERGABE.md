# Übergabe (Stand 21.10.2026 früh: V0–V3 gebaut, V4 „Querschnitt aus der Sichthülle“ gebaut — Abnahme offen)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise, Bedienung nach Blender,
Schritte V0–V9. Am Ende **„Stand V4 — Querschnitt aus der Sichthülle“** mit Zahlen, Bildern und dem, was offen ist. Offene
Kritik: [`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md).

Florian 20.10. nachts: „Du musst nicht immer nach 3 Versuchen stoppen. Es gibt für alles eine elegante Lösung! … Wichtig
ist, dass das Mesh später immer schön und smooth aussieht außer bei gewollten Kanten.“ Danach (vor dem Schlafen):
selbstständig weiter, hartnäckig, den ganzen Plan unter höchsten Kriterien; Usability und Ansicht herausragend; das Mesh soll
sich jeder Form intelligent anpassen.

## Letzter Stand: V4 — Querschnitt aus der Sichthülle

- **Im Editor:** Tafel Körper → **„Querschnitt: heute | aus der Hülle (V4)“** (`ausstattung.umrisseExakt`, ein Undo-Schritt;
  Röhre ohne Maul und Beine, sonst gesperrt mit Hinweis). Standard bleibt „heute“, bis Florian geurteilt hat.
- **Kern:** `packages/shape/src/kern/huellenSchnitt.ts` (eingehängt in `zieleBerechnen`/`faltenSetzen`, `kern/ableiten.ts`).
  Je Ring wird die Sichthülle geschnitten statt die ganze Front in den Ring gestaucht; Breite und Scheitel aus der Ansicht
  längs des Rings; gerundet nur, wo keine Zeichnung die Form vorgibt (Fülle der eigenen Front, „Fülle wo nötig“ höchstens
  „mittel“, flache Enden ohne Rundung); ein Reihenplan der ganzen Kette hält Breitenlinie und gezeichnete Ecken auf Reihen, die
  für alle Ringe gleich sind.
- **Gemessen** (Ablauf aus der Startkugel; Kern und Editor stimmen überein): Robbe Δ 4,0/6,3/12,5 → 3,9/4,4/3,5 px, Falte
  10,8 → 10,0°; Giraffe mit Bauch Front 18,9 → 1,6; Hals 1:8 Front 31,6 → 1,4; Kegel Front 7,3 → 3,0, Falte 14 → 11,5°;
  Kugel und Ei unverändert genau. Im Bild aller 39 Körper der Extremreihe: 34 gleich oder besser, **schlechter Keil, Pilz,
  Blatt, Hammerhai, Seestern** (Ecken-Körper: Reihen rutschen, wo sich das Seitenverhältnis der Ringe ändert).
- **Tor nicht erreicht:** Δ ≤ 0,5 px nur bei Kugel und Ei; sonst 2–5 px, weil die glatte Grenzfläche sich zwischen den
  Käfigpunkten hinauswölbt (die Vorlagen selbst liegen auf der Hülle). Bindungen und höhere Gewichte im Löser kosten Glätte
  (gemessen und verworfen, Planseite).
- Bilder: `docs/progress/editor/v4-huelle-beweis-2026-10-20.jpg` (Beweis-Körper heute/Hülle),
  `v4-huelle-mehrteiler-2026-10-20.jpg`, `v4-huelle-kanten-lang-2026-10-20.jpg`, Editor `v4-heute-robbe-editor-…` /
  `v4-huelle-robbe-editor-2026-10-20.jpg`. Prüfskripte: `apps/editor/scripts/pruefen/v4-beweis.ts` (OPT `{"top":false}`),
  `v4-editor.mjs` (echte Klicks und ein Zug, run-check.sh).

Davor (Abnahme offen): **V3** G/S/R und proportional in den Blättern; **V0** Fallen und Bedienfehler; **V1** Prüfstand
„Extremreihe“; **V2** saubere Umrisslinien — nicht abgenommen („sehr sehr wild“), standardmäßig aus.

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. Ein Wesen öffnen (Röhre, ohne Maul), Tafel Körper → „Querschnitt: aus der Hülle (V4)“. Die Δ-Zahlen in den Blatt-Titeln
   und den Lichtsaum vergleichen; ⌘Z nimmt den Schalter zurück.
2. Gut zu sehen an Körpern mit Kopf über dem Rumpf (Robbe), langen Hälsen, Bäuchen vor dem Hals; noch schlechter an
   kantigen Formen mit gezeichneten Ecken (Keil, Pilz).

## Offen

- V4: Grenzfläche dicht an die Vorlagen anpassen (feine Punkte längs der Ringe), Ecken-Körper, Zug-Zeit messen; dann
  Florians Urteil, ob „aus der Hülle“ Standard wird.
- Abnahme V0, V1, V3; V2 nicht abgenommen.
- Später mit Vergleichsbild: Entenflügel (V7), dünne Kanten Klinge oder rund, einfache Form (Stacheln), Überhang.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen
  nicht stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und
  begründet auf die Planseite schreiben.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert.
  Jede Stufe gegen `test:extrem`; Aufräumen bitgleich.
- Mit Florians Ablauf testen (Kugel → umformen → …). Immer sagen, was im Editor ist und was nur im Kern.
- Messen und im Bild prüfen: Das Faltenmaß übertreibt bei Mehrteilern (einzelne scharfe Stellen); Kontaktbögen ansehen.
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180. Während eines E2E-Laufs keine
  Dateien unter `apps/editor/src` ändern; E2E-Läufe überschreiben Bilder in `docs/progress/editor/` — vor dem Commit
  zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
