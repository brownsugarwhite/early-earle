# Übergabe (Stand 21.10.2026 abends: V0–V5 gebaut, V6 „Loops (⌘R)“ gebaut — Abnahme offen)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise, Bedienung nach Blender,
Schritte V0–V9. Am Ende „Stand V4“, „Stand V5“, **„V6 im Detail“, „Stand V6.1“, „Stand V6.2“, „Stand V6.3“** mit Zahlen,
Bildern und dem, was offen ist. Offene Kritik: [`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) („Befunde
aus V5“, „Befunde aus V6“).

Florian 20.10. nachts: „Du musst nicht immer nach 3 Versuchen stoppen. Es gibt für alles eine elegante Lösung! … Wichtig
ist, dass das Mesh später immer schön und smooth aussieht außer bei gewollten Kanten.“ Danach (vor dem Schlafen):
selbstständig weiter, hartnäckig, den ganzen Plan unter höchsten Kriterien; Usability und Ansicht herausragend; das Mesh soll
sich jeder Form intelligent anpassen.

## Letzter Stand: V6 — Loops wie in Blender

- **⌘R oder ⌃R** (Stufe Körper, Editor-Tab, Körper „Röhre“ ohne Maul und Beine): Zeiger über die Bühne oder das Seitenblatt —
  gelbe Vorschau der Loops (Bühne: Ringe auf dem Körper; Seite: Sprosse mit den künftigen Knoten; Top bzw. Front: Strich).
  Mausrad / Bild↑↓ / Ziffer = Anzahl. Klick setzt mehrere gleichmäßig; ein Loop gleitet nach dem ersten Klick, der zweite setzt
  ihn (Esc/Rechtsklick: Mitte). Ein Undo-Schritt. Die Dock-Zeile sagt, was entsteht.
- **Ein Loop** = Rücken- und Bauchknoten in der Seite plus ein Breitenknoten dort, wo sein Ring den Umriss berührt (Top für
  liegende, Front samt Spanten für stehende Ringe wie am Hals), alle formneutral (de Casteljau), und ein eigener Käfigring
  durch die beiden Seitenknoten. Pinsel- und Posen-Deltas, Bezugs-Käfige und Augen rücken mit.
- **Sehen, wählen, formen:** Loops sind orange Ringe auf der Bühne; ⌥-Klick wählt einen (seine Knoten in den Blättern sind
  dann gewählt). Mit dem Zeiger über der Bühne: G verschieben, G G gleiten (entlang der Form), S skalieren (Y nur Höhe, Z nur
  Breite), R kippen; X/Y/Z,
  Zahlen, O proportional, Enter/Klick, Esc/Rechtsklick/⌘Z wie in den Blättern. Ein Loop wirkt mindestens über das Dreifache
  seiner Verschiebung (glatte Taille statt Kerbe).
- **Mit Maul oder Beinen** lösen sich Loops in gewöhnliche Knoten auf (ein Undo-Schritt, Hinweis) — dort gibt es noch keine
  Loop-Ringe.
- **Unterwegs behoben (je Test vorher rot):** formneutral eingefügte Knoten (Stift, Kopplung, Loop) änderten den Körper
  (Langhals 1,8 px, Tiger 1,2 px mit zwei aufeinanderliegenden Ringen, Vase 3,4 px, Ei 1,3 px) — jetzt ≤ 0,5 px; Loops kippten
  kettenweite Entscheidungen (Fülle, Breitenlinie, Reihenplan, Berühren); geformte Loops kreuzten die übrigen Ringe (Leiter
  jetzt an den Loops festgeheftet); Breitenknoten am Hals im falschen Blatt. Grundzahlen von Schlange, Sichel, Augenstiele
  und Flügel oben nachgezogen (doppelte Ringe weg: Schlange Falten 178 → 4°, Sichel 180 → 25°).
- **Tests:** `packages/shape/src/kern/schleifen.test.ts` (Knoten formneutral, Loops einfügen/löschen/auflösen, Deltas,
  Breitenknoten, Hals verjüngen ohne Falte; 1 Tor als `it.fails`), 526 Kern-Tests grün. Editor: `schleife.mjs`,
  `schleife-grs.mjs` (Florians Ablauf mit echten Tasten), dazu `v0-tasten.mjs`, `modal-2d.mjs` grün.
- **Bilder:** `docs/progress/editor/v6-schleife-*.jpg`.

Davor (Abnahme offen): **V5** P-Linien als Käfigschleifen (mit „Querschnitt aus der Hülle“), **V4** Querschnitt aus der
Sichthülle, **V3** G/S/R in den Blättern, **V0**, **V1** Prüfstand „Extremreihe“; **V2** nicht abgenommen („sehr sehr wild“).

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. Ein Wesen öffnen (Röhre, ohne Maul), Zeiger auf den Hals in der Bühne, ⌘R: gelber Ring. Zwei Rasten am Mausrad → drei
   Ringe, Klick. Oder ein Loop: Klick, Maus gleiten lassen, zweiter Klick.
2. ⌥-Klick auf den mittleren orangen Ring, Zeiger auf der Bühne lassen, S und die Maus bewegen (oder 0,7 tippen, Enter) —
   der Hals wird dort schmaler; O vorher für einen weichen Übergang über die Nachbarn, Rad für den Einfluss.
3. G (bzw. G, dann Y) verschiebt den Loop, R kippt ihn; ⌘Z nimmt jeden Schritt einzeln zurück.

## Offen / nächster Schritt

- V6: jeden Käfigring per ⌥-Klick zum Loop machen, G/S/R auf Netzknoten der Bühne, geformte Loops gleiten lassen; Loops auf
  „Teile“, mit Maul oder Beinen (V7). Tor „Einfügen formneutral ≤ 0,1 px“ verfehlt (Register).
- V5 offen: Lage der Linien genauer (0,3 px), Härte als Rundungsbreite, Grat, Zug schneller.
- Danach V7 (ein Körper), V8 (Vektor-Ausgabe), V9 (Abnahme).
- Abnahme V0, V1, V3, V4, V5, V6; V2 nicht abgenommen.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen
  nicht stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und
  begründet auf die Planseite schreiben.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert.
  Jede Stufe gegen `test:extrem`; Aufräumen bitgleich. Grundzahlen nur mit Begründung nachziehen (Commit und Register).
- Mit Florians Ablauf testen (Kugel → umformen → …). Immer sagen, was im Editor ist und was nur im Kern. **Im echten Editor
  messen** (eigene Prüfskripte mit echten Tasten): Die Kern-Messung allein übersah mehrfach, was der Editor zeigt (V5 Front
  +2–5 px; V6 S am Halsansatz).
- **Formneutral heißt formneutral:** Ein Knoten, der die Kurve nicht ändert, darf den Körper nicht ändern — Entscheidungen über
  Ringgrenzen (harte Schwellen, Rasterstufen, Ringnummern) sind die üblichen Ursachen; stetig machen statt Schwellen
  verschieben.
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180. Während eines E2E-Laufs keine
  Dateien unter `apps/editor/src` ändern; E2E-Läufe überschreiben Bilder in `docs/progress/editor/` — vor dem Commit
  zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
