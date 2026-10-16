# Übergabe (Stand 16.10.2026 nachts: S5 „Mittelebenen-Baum“ gebaut, im Editor als Geist; Halt für Florians Blick)

Branch `claude/editor-grundlayout`.

## Einstieg

Maßgeblich ist der freigegebene Plan
**[`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)** (Befund,
Florians Klarstellung „3D-Liniennetz = einzige Wahrheit“, Bauweise „Form zuerst, dann der Käfig darüber“, Schritte S0–S8
mit Toren, Bauplan S5 im Detail, Stand je Schritt). Vorgeschichte:
[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
Gesamtplan und Kritik-Register bleiben gültig:
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md),
[`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus S5“).

## Letzter Stand

- **S0–S4** gebaut (Widersprüche rot, Liniennetz in allen Blättern, Kopplung jedes Punkts, glatte Haut, Front berühren,
  Teile erkennen; „glatt“ und „Umrisse berühren: mittel“ sind Standard für neue Wesen). **Florian zu S4: „Die Einordnung
  passt.“** Verdeckte Stücke lassen sich per Klick als eigene Kurve übernehmen (`dok.teile`, noch ohne Wirkung).
- **S5 „Mittelebenen-Baum“ gebaut (Abnahme offen):**
  - Körper = verdoppeltes 2D-Vierecksnetz der Seitenfläche, ein Streifen je Mittelteil aus dem S4-Baum
    (`packages/shape/src/kaefig/baumKaefig.ts`, `kern/grundkoerper/ebene.ts`, `kern/grundkoerper/baumBau.ts`).
  - Dünne Teile mitten am Rumpf als Verbindungsstück (Giraffe, Ente, S-Hals, Rückenflosse), dicke Teile im Rumpfstreifen
    mit Enden durch das Kind (Vase: Rand → Boden), klar dünne Teile am Rumpfende mit Übergang 2:1 (Fisch-Schwanzlappen).
    Ecken als Ringfalten, Fächer gespreizt, Punktzahl aus dem Umfang.
  - **Im Editor als Geist:** Tafel Körper → „Körper (S5): Röhre | Teile (Geist)“ (`ausstattung.koerper`, ein Undo-Schritt);
    Bühne und Blätter zeigen den Baum hellblau durchscheinend über dem heutigen Körper (nur ohne Maul und Beine).
  - Messung (heute → Baum): Giraffe Falten 23 → 11°, Δ 18,8/8,5 → 1,9/1,8 px (alle Δ-Tore erfüllt); Vase Top 13,9 →
    2,2 px, alle Zonen ≤ 11°; S-Hals 27 → 12°; Überhang 58 → 28°; Fisch 145 → 32°; Langhals/Drache etwa wie heute. Tabelle,
    Tore und Grenzen auf der Planseite (S5), Befunde im Kritik-Register.
  - **Noch nicht auf dem Baum:** P-Linien (`dok.kanten`) — der Baum faltet nur an gezeichneten Ecken der Seite; S7 braucht
    sie mindestens als Treppenfalte (Entscheidung unten).
  - Bilder: [`s5-baum-bogen-2026-10-16.jpg`](progress/editor/s5-baum-bogen-2026-10-16.jpg),
    [`s5-baum-auslegung-2026-10-16.jpg`](progress/editor/s5-baum-auslegung-2026-10-16.jpg),
    [`s5-baum-editor-bogen-2026-10-16.jpg`](progress/editor/s5-baum-editor-bogen-2026-10-16.jpg).
- Prüfungen: Kern-Tests `baumKaefig.test.ts`, `baumBau.test.ts`; Skripte `apps/editor/scripts/pruefen/s5-mess.ts`
  (Messreihe), `s5-bogen.ts` (Kontaktbogen), `s5-auslegung.ts` (2D-Auslegung), `s5-editor.mjs` (Editor, grün).
  `pnpm typecheck` grün, Kern-Tests 440 (drei Tempo-Tests nur unter Parallellast rot, einzeln grün), Editor-Tests 25/25.

## Entschieden (16.10.)

- „glatt“ und „Umrisse berühren: mittel“ sind Standard für neue Wesen.
- **P-Linien als echte Kanten** (Florian, abends, in einer abgezweigten Sitzung; Planseite S7/S8): Reihenfolge bleibt — S8
  „P-Linien als echte Kanten (Linien exakt)“ nach S7, jetzt in Klartext mit seinem Ablauf (P zeichnen, ⇧W Härte, ⌥-Ecke für
  den Winkel, Bearbeiten in allen Ansichten und auf der Bühne, Posen) und zehn Toren. Bis dahin **kein Rückschritt**: Auf
  mehrteiligen Körpern wirken P-Linien in S7 mindestens wie heute als Treppenfalte (je Streifen und über die Ansätze).

## Offen für Florian

- **S5 ansehen:** Geist an eigenen Wesen (Tafel Körper → „Teile (Geist)“). Danach: S6 (seitliche Teile) oder erst die
  S5-Reste (Y-Stück für Gabeln wie Überhang und Fischschwanz, Hohlkehlen, Übergang 2:1 höher am Hals)?
- **Entenschwanz:** Die Zeichnungen verlangen eine senkrechte Klinge (Top 2–9 px breit, Seite 47 px hoch) — rund oder Klinge?
- Mehrdeutige Ausbuchtungen (Rex-Schwanz und -Stirnwülste, Robbenkopf, Tiger-Schnauze, Vierbeiner-Kopf) — Teil oder nicht?
- **Angleichen** an alten Zeichnungen: Verhalten ok (die Ansicht mit dem Knopf führt)?

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild, dann Halt für Florian. Keine Meldung
  „fertig/bestanden“ ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern. Florian nach dem Pull: Dev-Server neu starten.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
