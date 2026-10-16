# Übergabe (Stand 16.10.2026 abends: S4 „Teile erkennen“ gebaut — nur Anzeige; Halt für Florians Bestätigung der Einordnung)

Branch `claude/editor-grundlayout`.

## Einstieg

Maßgeblich ist der freigegebene Plan
**[`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)** (Befund, Antwort
auf Florians „Denkfehler?“, Florians Klarstellung „3D-Liniennetz = einzige Wahrheit“, Bauweise „Form zuerst, dann der Käfig
darüber“, Schritte S0–S8 mit Toren, Stand je Schritt). Vorgeschichte:
[`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
Gesamtplan und Kritik-Register bleiben gültig:
[`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md),
[`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus S4“).

## Letzter Stand

- **S0–S3** gebaut (Widersprüche rot, Liniennetz in allen Blättern, Kopplung jedes Punkts, glatte Haut, Front berühren;
  „glatt“ und „Umrisse berühren: mittel“ sind Standard für neue Wesen). Einzelheiten und Tore auf der Planseite.
- **S4 „Teile erkennen“ gebaut (nur Anzeige, Abnahme offen):**
  - Kern `packages/shape/src/kern/grundkoerper/teilbaum.ts`: Rumpf = dickste Stelle der Seite; Äste der Seite als Gabel
    (Flossen, beide Schwanzlappen), Knick (Hals) oder Stiel (Vasenhals, Augenstiele, Schwanz mit Taille); Mitte oder Paar über
    die Säulen der Sichthülle; seitliche Paare aus Front und Top. Ein Teil braucht eine Kehle am Ansatz (Seitenäste der
    Seite beidseitig). Hysterese 15 %, Sehnen als Kurvenparameter eingefroren (`kaefig.stationen.teile`), vom Skelett
    verlorene Teile an der Sehne mitgenommen, Richtung aus dem Umriss der tragenden Ansicht.
  - Ansichten `kern/grundkoerper/teilAnsicht.ts`: welches Teil man je Blatt sieht, verdeckte Teilumrisse (Seite, Front,
    Back, Top, Bottom). Worker: `WesenNetz.teile` im genauen Bau; das Zurückschreiben des eingefrorenen Stands baut den
    Körper nicht neu und ist kein Undo-Schritt.
  - Editor: Tafel Körper oben „Teile (S4, nur Anzeige)“ mit Baumliste und Schalter aus | an; Flächen je Teil, verdeckte
    Umrisse gestrichelt, Wirbelsäulen mit Knoten in allen Blättern; Zeiger hebt ein Teil überall hervor
    (`apps/editor/src/teile/`).
  - Tore: Prüfsatz **25 von 25** wie von Hand eingeordnet (mehrdeutige Ausbuchtungen als „erlaubt“ — nachträglich
    eingetragen, Florian entscheidet sie); Züge: 17 von 1428 mit einem Wechsel, 4 hin und her, alle an kleinen Grenz-Wülsten
    (ohne Hysterese 97/75) — Tor nicht ganz erfüllt; Erkennung 7–23 ms, Ansichten weitere 13–20 ms.
  - Nicht gebaut: verdecktes Stück per Klick als eigene Kurve (`dok.teile`) — nach Florians Bestätigung.
  - Bilder: [`s4-teile-editor-2026-10-16.jpg`](progress/editor/s4-teile-editor-2026-10-16.jpg),
    [`s4-teile-kern-2026-10-16.jpg`](progress/editor/s4-teile-kern-2026-10-16.jpg),
    [`s4-teile-ansichten-2026-10-16.jpg`](progress/editor/s4-teile-ansichten-2026-10-16.jpg).
- Prüfungen: `kern/grundkoerper/teilbaum.test.ts` (Prüfsatz, Einfrieren, Hysterese, kein Flackern), Prüfsatz
  `kern/pruefen/teilsatz.ts`, Skripte `apps/editor/scripts/pruefen/teile-s4.ts` (Kandidaten), `teile-ansichten.ts`,
  `teile-zuege.ts` (Zugprüfung, `OHNE=1` zum Vergleich), Editor `teile-editor.mjs` (grün). `pnpm typecheck` grün, Kern-Tests
  427/427, Editor-Tests 25/25, Lint ohne Befund. Das Ausdünnen im Skelett ist bitgleich 8-mal schneller.

## Entschieden (16.10.)

- „glatt“ und „Umrisse berühren: mittel“ sind Standard für neue Wesen.

## Offen für Florian

- **S4 bestätigen:** Liest die Einordnung deine Zeichnungen richtig (Mitte/Paar, was ein Teil ist)? Mehrdeutige Fälle:
  Rex-Schwanz und -Stirnwülste, Robbenkopf, Tiger-Schnauze, Vierbeiner-Kopf — Teil oder nicht?
- Danach: Rest von S4 (verdecktes Stück als eigene Kurve) und S5 (Mittelebenen-Baum, Breitenlinie als 3D-Bedingung).
- **Angleichen** an alten Zeichnungen: Verhalten ok (die Ansicht mit dem Knopf führt)?

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild, dann Halt für Florian. Keine Meldung
  „fertig/bestanden“ ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Mit Florians Ablauf testen (neue Kugel → umformen → Maul; `KUGEL0=1`); sichtbare Falten über 20° sind Fehler; immer
  sagen, was im Editor ist und was nur im Kern. Florian nach dem Pull: Dev-Server neu starten.
- Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports, nie Florians 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
