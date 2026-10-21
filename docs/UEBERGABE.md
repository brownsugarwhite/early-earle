# Übergabe (Stand 21.10.2026 mittags: Teil A „Maul als Einsatz“, E1 Kernring als Versuch — vorher V0–V6, Abnahme offen)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix.

## Aktueller Block: Teil A, E1 (Florian 21.10.: „Weiter mit Teil A ‚Maul als Einsatz‘ … glatte Haut, Hülle, Linien exakt und Loops
auch mit Maul“)

- Planseite [`docs/plans/2026-10-21-maul-einsatz-weiter.md`](plans/2026-10-21-maul-einsatz-weiter.md), Abschnitte „Stand E1“ und
  „Nachtrag E1 (mittags)“; Register [`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md), „Befunde aus E1“.
- **Gebaut (Kern, Versuch hinter `gitter: 'kernring'`, alter Weg bitgleich):** Mundwinkel als regulärer Gitterpunkt (Kernring),
  Lippe endet als Falte (`lippeAnpassen(…, { ende: 'falte' })`), Lage in zwei Stufen (innen Auffaltung um c, außen Karte),
  konforme Reihenzahl, Mindestzelle am Mundwinkel, Lippenwulst läuft zur Spitze aus. Tests `einsatz/kernring.test.ts` (Lippe als
  Falte ≤ 1e-12, Topologie an 54 Fällen; Tor als `it.fails`).
- **Gemessen:** Knick am Mundwinkel ≤ 12° in 29 von 39 Fällen (Schleifengitter: keiner unter 131°), Tor (A0 + 2°) in 4–5 von 15.
  Kissen-Vorversuch: Die Kernring-Topologie selbst ist sauber (1,0° bei quadratischen, gleich großen Zellen um c); schon 2 : 1
  gibt 10–16°. Im echten Feld ist die Startlage am Mundwinkel 3–10° (konforme Lage ist um c parabelförmig, E steht zu nah).
- **Nächster Schritt (technisch, meine Wahl):** die Zellen um c als Quadratgitter auf der Haut legen und faltenfrei einbetten
  (Tutte mit Mittelwertgewichten aus einer Ziel-Lage nahe c, Mundwinkelspeiche fest), Lippenstellen zum Mundwinkel hin passend
  stufen, Feld hinter dem Mundwinkel nötigenfalls verlängern; danach schiefe Felder (Übergangsreihe) und die Lippe für
  verwickelte Linien (Bogenlänge statt konform).

## Einstieg (Plan V0–V9)

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

## Neu seit dem Morgen-Zwischenstand (21.10. früh): V6.4 — Loops in den Blättern

- Jedes Blatt zeigt die Loops, wie sie auf dem Körper liegen (Seite: von Rücken- zu Bauchknoten; Top, Front, Back, Bottom: der
  ganze Ring, verdeckt blass gestrichelt). Farben überall gleich: orange, unter dem Zeiger pink (Bühne und alle Blätter
  zugleich), gewählt türkis.
- Wählen: Klick auf die Linie im Blatt oder Klick ohne Bewegung auf den Ring der Bühne (⌥-Klick geht weiter), ⇧ für weitere;
  Klick auf der Bühne daneben hebt auf. Ziehen an der Linie im Blatt verschiebt den Loop.
- G/S/R mit dem Zeiger über einem Blatt formen gewählte Loops als Ganzes (Seite: G x/y; Top: G längs x; Front: G in der Höhe;
  S überall; R nur in der Seite). **Mehrere Loops:** G verschiebt alle gleich, S und R wirken je Loop um seine eigene Mitte —
  Hals über mehrere Loops verjüngen, ohne dass sie zusammenrücken.
- Prüfung im echten Editor: `apps/editor/scripts/pruefen/schleife-blatt.mjs` (alles grün), dazu weiter grün `schleife-grs.mjs`,
  `schleife.mjs`, `modal-2d.mjs`, `v0-tasten.mjs`. Planseite „Stand V6.4“.
- V5-Rest „Härte als Rundungsbreite“: gemessen und zurückgestellt (die Härte ändert die Form auf runder Haut kaum; erst der
  Grat gibt ihr einen Winkel) — Planseite „V5-Rest Härte“.

## Letzter Stand davor: V6 — Loops wie in Blender

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
2. Klick auf den mittleren orangen Ring (Bühne) oder seine Linie in einem Blatt — er wird türkis. Zeiger auf Bühne oder Blatt,
   S und die Maus bewegen (oder 0,7 tippen, Enter) — der Hals wird dort schmaler; O vorher für einen weichen Übergang über die
   Nachbarn, Rad für den Einfluss. ⇧-Klick auf die beiden anderen, S: alle drei werden schmaler, jeder um seine Mitte.
3. G (bzw. G, dann Y) verschiebt, G G gleitet, R kippt; im Seitenblatt die Linie einfach ziehen; ⌘Z nimmt jeden Schritt
   einzeln zurück.

## Offen / nächster Schritt

- V6: jeden Käfigring per ⌥-Klick zum Loop machen (der Grundring stimmt bei Fülle, Breitenlinie und Reihenplan mit ab — ein
  Loop, der weiter abstimmt, wäre der saubere Weg), G/S/R auf Netzknoten der Bühne, geformte Loops gleiten lassen; Loops auf
  „Teile“, mit Maul oder Beinen (V7). Tor „Einfügen formneutral ≤ 0,1 px“ verfehlt (Register).
- V5 offen: Lage der Linien genauer (0,3 px), Grat (dann Härte als Rundungsbreite), Zug schneller; der Sprung, wenn eine Linie
  zur Käfigschleife wird (Kegel 3,1 px).
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
