# Übergabe (Stand 16.10.2026 nachmittags: S2 gebaut, „glatt“ Standard; S3-Look-Entscheidung vorbereitet, Halt für Florians Wahl)

Branch `claude/editor-grundlayout`.

## Einstieg

Maßgeblich ist der freigegebene Plan
**[`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)** (Befund, Antwort
auf Florians „Denkfehler?“, Florians Klarstellung „3D-Liniennetz = einzige Wahrheit“, Bauweise „Form zuerst, dann der Käfig
darüber“, Schritte S0–S8 mit Toren, Stand je Schritt). Vorgeschichte:
[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
Gesamtplan und Kritik-Register bleiben gültig:
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md),
[`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus S2“).

## Letzter Stand

- **S0, S1, S1c** gebaut (Widersprüche rot, genaues Δ, Faltenmaß nach Zonen; Liniennetz in allen Blättern, derselbe Punkt
  überall, Kopplung jedes Punkts, Punkte einfügen nur wenn nötig, Stil „netz farbe“).
- **S2 „Glatte Haut“ gebaut** (Kern und Editor):
  - Dünn besetzter Löser (`loeser/normalSystem.ts`) = dichte LU auf ≤ 3e-13.
  - Glättungsmaß relativ zur Zielform (Laplace der Stufe 2, nur die Abweichung vom Käfig der Ziele), Kappen × 10,
    Naht 64: Voreinstellung `GLATTE_HAUT` in `kern/ableiten.ts`.
  - Im Editor: Tafel Körper → „Haut heute | glatt“ (`dok.ausstattung.glatt`, ein Undo-Schritt, fehlt = heute bitgleich);
    wirkt ohne Maul und Beine, mit Maul/Beinen Hinweis in der Tafel.
  - Ergebnis: Rex, Robbe, Langhals freie Haut 10,7–14,5° (heute bis 176°), Kappen 8–12°; Kappen der einfachen Form
    96–99° → 14–15°, Vase 172° → 13°; kein Körper auf der freien Haut schlechter.
  - **Nicht erfüllt** (angehalten, Kritik-Register): Front von Vase (+4,4 px) und Giraffe (+5,5–6,4 px), S-Hals-Top
    (+1–1,8 px), Robbenschnauze aus der Startkugel (+0,9 px) — die Wellen hatten die Silhouette zufällig nach außen
    gedrückt; gehört zu S3. Fernfeld unverändert (S5), Fisch-Volumen +4,4–4,9 % (S6).
  - Bilder: [`s2-glatte-haut-editor-2026-10-16.jpg`](progress/editor/s2-glatte-haut-editor-2026-10-16.jpg),
    [`s2-glatte-haut-kern-2026-10-16.jpg`](progress/editor/s2-glatte-haut-kern-2026-10-16.jpg).
- Prüfungen: `kern/glatt.test.ts`, `loeser/normalSystem.test.ts`, Messreihe `apps/editor/scripts/pruefen/s2-glatt.ts`,
  Editor `s2-editor.mjs` grün, `netz-d.mjs` mit `GLATT=1`; `pnpm typecheck` grün, `pnpm test` grün bis auf vier
  Tempo-Tests unter Last (einzeln grün), `pnpm lint` ohne Fehler.

- **S3 Look-Entscheidung vorbereitet (Test):** Fülle der Querschnitte rund | mittel | genau (`kern/fuelle.ts`, Option
  `fuelle`, ohne Schalter bitgleich; im Editor Tafel Körper → „Fülle (S3-Versuch)“, nur ohne Maul/Beine). Einfache Form:
  Front 21,9 → 9,2 (mittel) / 8,9 px (genau), 4,5 px davon Widerspruch; Rex mit „genau“ kastig (+12 % Volumen, Top +2,8 px);
  Robbe mit „mittel“ flacher Bauch (ein Knick 21°). Empfehlung: mittel. Bilder
  [`s3-fuelle-editor-2026-10-16.jpg`](progress/editor/s3-fuelle-editor-2026-10-16.jpg),
  [`s3-fuelle-kern-2026-10-16.jpg`](progress/editor/s3-fuelle-kern-2026-10-16.jpg).

## Entschieden (16.10. nachmittags)

- **„glatt“ ist Standard für neue Wesen** (Startkugel, „Neu“; `neuesWesen()` im Editor-Store). Gespeicherte Wesen,
  Vorlagen und Prüfwesen behalten ihre Einstellung.

## Offen für Florian

- **Angleichen** an alten Zeichnungen: Verhalten ok (die Ansicht mit dem Knopf führt)?
- **S3 Look-Entscheidung:** rund / mittel / genau (Bilder oben). Danach S3 nach Plan mit der gewählten Fülle (Berühren
  örtlich im Höhenband, Intervalle in `breite.ts`, dritte Koordinate als Griff, Tore).

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild, dann Halt für Florian. Keine Meldung
  „fertig/bestanden“ ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern. Florian nach dem Pull: Dev-Server neu starten.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
