# Plan: Ein Liniennetz, eine Zielform, ein Käfig darüber — Wirbelsäulen-Baum, Kantenlinien und glatte Haut (16.10.2026)

> **Freigegeben von Florian am 16.10.2026** (Planmodus; ins Repo gelegt vor dem ersten Code). Setzt Teil G (G3–G5) und
> Teil L (L1, L0-Rest) des freigegebenen Plans [`2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md)
> um und löst den nicht freigegebenen Plan [`2026-10-16-formgerechte-topologie.md`](2026-10-16-formgerechte-topologie.md) ab.
> Einstieg und Vorgeschichte: [`2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
> Code gelesen mit drei Suchagenten, Entwurf von zwei Planungsagenten gegengeprüft (Geometrie, Editor), eigene Messungen
> unten. Stand je Schritt am Ende dieser Seite.

## Kontext

Florian (16.10.) will drei zusammengehörige Ansätze weiterführen und einbauen — ich lese „ins Game“ als: in den Editor, den
er benutzt (das Spiel lädt später dasselbe Format; das alte Spiel bleibt laut `CLAUDE.md` unangetastet):
1. **Intelligentes Netz:** Der Wirbelsäulen-Baum entsteht automatisch aus Überhängen und Ausbuchtungen in jeder Ansicht
   (Langhals, Flossen, Flügel, mehrere Stellen); bauchige Wesen, Vasen und seitliche Flügel ohne Zerreißen und Falten.
2. **Liniennetz in allen Ansichten:** Jeder Punkt und jede Linie erscheint synchron in jeder Ansicht (derselbe 3D-Punkt),
   Dicke und Farbe = Kantigkeit, Verdecktes dezenter. Beispiel Langhals: Im Top sieht und bearbeitet man den vorderen
   Bauchpunkt unter der Nase, und die Bauchlinien laufen genau dort zusammen.
3. **Glatt und genau:** keine Falten außer gewollten, Topologie optimal, keine Abweichung von der schwarzen Linie.

Screenshots: (1) Ente mit Flügeln in Top/Front: Flügel fehlen, Kopf eingedrückt, Top Δ 31,6 / Front 23,1 px.
(2, 3) Einfache Form aus der Kugel (Seite Kreis, Front breite Ellipse, Top Pfeil mit Kerbe hinten): Top Δ 59–81 px, Front
zeigt eine Raute statt der Ellipse (Δ 7,5–22 px).

Stand: Branch `claude/editor-grundlayout` = GitHub (efbffb8e, Reparatur G2 enthalten), kein Pull nötig. Meine Prüfungen
laufen immer auf einem frisch gestarteten eigenen Vite (5192, `run-check.sh`). Florian startet seinen Server (5180) nach
jedem Pull selbst neu.

## Kurzfassung

- **Kein Denkfehler im Ziel.** Dein Bauchpunkt-Beispiel trifft den Kern: Drei Umrisse zeigen nur das Sichtbare. Jede
  Ansicht braucht auch die verdeckten Linien der Teile, dezent gezeigt und änderbar — dafür ist das 3D-Liniennetz da.
- **Die drei Screenshot-Fehler haben eine Wurzel:** Die heutige Röhre nimmt aus jeder Ansicht je Ring nur eine Zahl und
  eine Form (äußerste Breite, ein Front-Querschnitt für alle Ringe), und die Front ist nur eine Obergrenze.
- **Eine Grenze, die du kennen solltest:** Manche Zeichnungen gehen nur mit einem kantigen Körper auf (Screenshot 2:
  hinten eine Kante). Dann musst du wählen, ob „rund“ oder „genau auf der Linie“ gewinnt — mit Vergleichsbild.
- **Lösung:** erst die Form, dann das Netz darüber. Teile auf der Mittelebene (Kopf, Hals, Rumpf, Schwanz, Flossen auf der
  Mitte) werden als verzweigte Fläche in der Seitenansicht ausgelegt und nach beiden Seiten gehoben — die schwarze
  Seitenlinie ist die Naht, auch die Hohlkehlen sind gezeichnet und damit genau. Seitliche Teile (Flügel, Flossen, Beine)
  setzen mit einem Ring-Einsatz an (dieselbe Maschine wie das Maul). Ein Glättungsmaß im Löser hält die Haut faltenfrei.
- **Reihenfolge:** S0 Ausgangslage → S1 Liniennetz-Ansicht → S2 glatte Haut → S3 Umrisse als 3D-Kurven → S4 Teile
  erkennen → S5 Mittelebenen-Baum → S6 seitliche Teile → S7 Einbau als Standard → S8 Linien exakt. Nach jedem Schritt
  Bilder aus dem Editor und Halt für dich.

## Befund (Code gelesen, eigene Messungen 16.10.)

**Die drei Screenshot-Fehler** (eine Wurzel: je Ring eine Zahl und eine Form):
1. **Flügel und Kerben fehlen:** Das Top wird je Ring auf die äußerste Breite reduziert (`packages/shape/src/kern/breite.ts:22`
   `schnittMax`; ein Maßstab W je Ring, `kern/ableiten.ts:1285/1325`). Lappen, Kerben und Flügel werden zugefüllt.
2. **Kopf eingedrückt:** Alle liegenden Ringe eines Abschnitts teilen einen Querschnitt aus dem Front-Umriss
   (`querschnitteFuer`/`lappenQuerschnitt`, auf die breiteste Stelle normiert). Die Front der Ente ist eine Glocke (Hals
   auf Körper), also erbt der Kopf die schmale Halsspitze.
3. **Raute statt Ellipse:** Die Front wirkt nur als Obergrenze (`ableiten.ts:1299/1312`, Breitenziel min(Top, Front)).
   Nachgerechnet (Seite Kreis, Front Ellipse, Top hinten am breitesten): Ellipsen-Ringe bleiben bis **42 px** hinter der
   Front zurück. Ein Körper, der die Ellipse genau trifft, braucht hinten fast rechteckige Querschnitte (Superellipse mit
   Exponent 4–16 statt 2); ganz hinten ist er nur noch eine waagerechte Kante.

**Weitere Befunde:**
4. **P-Linien liegen auf der falschen Fläche:** Tiefe, Ziehen und Verdeckung der Kantenlinien rechnen auf der alten
   Versuchsfläche S0 (`apps/editor/src/kanten/kantenFlaeche.ts` → `maul/maulFlaeche.ts` `strahlen` → `flaecheS0`). Nach
   jeder Formgeste legt `kantenAnFlaeche` (`state/editorStore.ts` `mitFormVerbunden`, `endeGeste`, `setzeSpanten`) alle
   Knoten still dorthin zurück. Die Eckkanten in den Blättern kommen ebenfalls vom alten Loft (`versuch/kanten.ts`
   `eckKanten`). Maullinien nutzen schon das Kern-Netz (`punktAufKern`); Spanten und Maullinien haben keine Verdeckung.
   Einheiten: `Szene3D.tsx`, `punktAufKern` und `trefferDeuten` rechnen bei Größe ≠ 100 % verschieden mit `skalierung`.
5. **Falten (Kern, heute):** Überhang 68°/669 Kanten > 20°, Langhals 23°/32 (Knick Hals → Kopf), Robbe 34°/118, Rex 93°/77
   an der gezeichneten Schnauzenecke, Schnabel 116°/40, Schnabel + Unterbiss Haut 177° und 268 Durchdringungen (alter
   Maulbau), Vase 75°/378 (Skript ohne Kopplung, neu messen). Das Faltenmaß zählt gewollte Spitzen und halbscharfe Kanten
   mit (Schärfe < 1 ist auf Stufe 3 abgebaut); Δ kommt aus einem Raster mit ≈ 1,9 px je Zelle — beides zu grob für Tore
   von 1–2 px.
6. **Linien (L0, heute nachgemessen, nur Kern):** Linie 0,04–0,29 px, Haut 0,03–0,41 px, Normalen 0,2–24°. Am Langhals-Hals
   sind die Vierecke schon ohne Linie 21-mal so lang wie breit (16 Punkte je Ring um einen dünnen Hals).
7. **Löser:** dichte LU-Zerlegung (402 Punkte: 3–6 ms). Für Teile-Käfige mit 1600–3000 Punkten wären das Sekunden.
8. **Geschichte:** Ansätze des Baums dreimal gefaltet (`baum.ts`, `knoten.ts`: 133–178°): Form und Topologie wurden je
   Ring gemeinsam aus der Wirbelsäule abgeleitet, am Ansatz gab es keine Zielform, und das Fenster passte nicht zum Hals
   (lang und schmal gegen rund). „Schnitt-Loft“ (sichtbare Hülle) war „zerrissen, kantig“, „rund“ (Aufblasen) rund, aber
   Top/Front bis 37 px daneben.
9. G2-Reparatur aktiv; Kern-Tests 216/216 grün (zwei Tempo-Tests nur unter Parallellast rot, einzeln grün).

## Antwort auf „Denkfehler?“

**Das Ziel stimmt.** Vier Präzisierungen und zwei Fehler von uns:
1. **Drei Umrisse zeigen nur das Sichtbare.** Bei Überhängen fehlt Information: der Bauch unter der Nase (Top), der Rumpf
   hinter den Flügeln (Front), der Hals hinter dem Kopf. Jede Ansicht braucht deshalb neben dem sichtbaren Umriss die
   **verdeckten Linien der Teile** — automatisch ergänzt, dezent gezeigt, von dir änderbar.
2. **Ein Umrisspunkt ist ein besonderer 3D-Punkt:** Er liegt dort, wo sich die Haut von der Blickrichtung wegdreht; seine
   dritte Koordinate folgt aus der Form. In der Seite liegen die Top-Punkte auf der **Breitenlinie** (wo der Körper am
   breitesten ist). Zieht man sie dort hoch oder runter, verschiebt man die breiteste Stelle — ein neues Werkzeug, das
   viele Spanten ersetzt. Seitenpunkte liegen im Top auf der Mittellinie (nur längs ziehbar). Linienpunkte (P) sind feste
   Hautpunkte.
3. **„Das Netz glättet sich selbst“** heißt: Das Netz ordnet sich auf der Zielform neu, und der Löser bevorzugt die
   glatteste Haut, die alle Linien genau trifft. Die Form wird nicht weichgespült; sie würde sonst schrumpfen und von der
   schwarzen Linie weggehen.
4. **Manche Zeichnungen verlangen einen kantigen Körper.** Siehe Befund 3: „rund“ und „genau auf der Linie“ schließen sich
   bei Screenshot 2 aus. Das ist eine Look-Entscheidung (S3, mit Vergleichsbild). Echte Widersprüche (zwei Ansichten
   erlauben nicht, was die dritte zeigt) markiert der Editor auf der schwarzen Linie, statt still zu entscheiden.
5. **Unser Fehler 1:** Form und Netz wurden in einem Schritt je Ring aus der Wirbelsäule abgeleitet. Richtig ist: erst die
   Form, dann das Netz darüber, wie in ZBrush (ZSpheres → Haut → auf die Form → entspannen).
6. **Unser Fehler 2:** Alle Ansätze wurden als 3D-Problem behandelt. Für Teile auf der Mittelebene ist es ein 2D-Problem auf
   der Seitenfläche — dort ist die gezeichnete Linie die Naht, auch an der Hohlkehle. Nur seitliche Teile brauchen 3D.

## Nachtrag 16.10. vormittags: Florians Klarstellung (gilt vor dem Text darunter)

> Florian (nach S0): „Wenn jeder Punkt in jeder Ansicht sichtbar ist, dann haben wir doch absolut alle Informationen und es
> kann keine Widersprüche geben.“ Und: „Die schwarze Linie soll genau den Ist-Zustand des Meshes zeigen.“

- **Das 3D-Liniennetz ist die einzige Wahrheit.** Jeder Umrisspunkt ist ein 3D-Punkt; die schwarze Linie jeder Ansicht ist
  seine Projektion, also der echte Umriss des Körpers (nicht mehr drei unabhängige Zeichnungen, wie unter Bauweise 1 und S1
  ursprünglich geplant).
- **Die bearbeitete Ansicht führt, die anderen folgen am entsprechenden Punkt** — die heutige Kopplung der Außenmaße wird
  zur Kopplung jedes Punkts (S1c). Widersprüche zwischen den Ansichten entstehen beim Zeichnen nicht mehr.
- **Rot** (Widerspruch) bleibt nur für Altes und Fremdes (gespeicherte Wesen, Vorlagen, nachgezeichnete Bögen) mit einer
  Aktion „angleichen“. **Gelb** (Saum) ist reine Baukontrolle.
- Die Look-Frage aus S3 bleibt, wird aber anders gestellt: Was macht der Körper, wenn eine Ansicht etwas verlangt, das nur
  kantig geht (einfache Form) — wird er kantig, oder folgt die andere Ansicht dem runden Körper?
- **Ergänzung 16.10. mittags** (dieselbe Klarstellung, von einer abgezweigten Sitzung zur Sicherheit weitergegeben):
  - **S3: Die dritte Koordinate jedes Umrissknotens gehört ins Dokument** (Knotenfeld `dritte`, siehe S3) — erst dann ist
    jeder Umrisspunkt wirklich ein gespeicherter 3D-Punkt. Die Kopplung jedes Punkts (S1c, gebaut) verallgemeinert „Kopplung
    nur am entsprechenden Punkt“ (12.10.) und „die Formen folgen immer“ (15.10.); ab S3 entstehen auch in der dritten
    Koordinate keine neuen Widersprüche.
  - **Gelb (Δ) soll leer sein.** Ehrlich für den Übergang: Bis S5/S6 kann der Körper nicht jeder stimmigen Linie folgen
    (Hälse, Bauch vor der Nase, Flügel); bis dahin zeigt Gelb, wo der Bau noch nicht nachkommt.
  - **Ente (gemessen in der Abzweigung am Nachbau `ente-haken`):** In den ersten ≈ 50 px hinter der Schnabelspitze hat die
    Seite nur den Schnabel (Höhe 0,51–0,62); das Top will dort 30–84 px Halbbreite, die Front erlaubt ≈ 37 px. Ab ≈ 60 px
    liegt darunter der Bauch (Front erlaubt 129 px), dort ist nichts rot. Mit der Kopplung jedes Punkts wäre diese Zeichnung
    nie entstanden: Die Front wäre beim Zeichnen des Tops in Schnabelhöhe mitgegangen (S1c; mit nur einem freien Front-Knoten
    bleibt ein Rest im Top, siehe Stand).

## Die Bauweise: Form zuerst, dann ein Käfig darüber

1. **Liniennetz (3D):** Umrisse, verdeckte Teillinien, P-Linien, Querschnittslinien und Wirbelsäulen sind 3D-Kurven mit
   gemeinsamen Knoten. Jede Ansicht zeigt alle: sichtbar kräftig, verdeckt dezent, Kantigkeit wie heute; überall
   bearbeitbar. ~~Die Wahrheit bleibt in den Zeichnungen~~ (überholt, Nachtrag oben: das 3D-Liniennetz ist die einzige
   Wahrheit, die schwarze Linie seine Projektion); alles Abgeleitete rechnet der Worker und schreibt es nie heimlich ins
   Dokument.
2. **Teile lesen** aus den Mittelachsen aller drei Ansichten plus einer groben 3D-Sichthülle: Hat eine Säule der Hülle
   (bei x, y) ein Stück durch die Mitte, gehört sie zur Mittelebene; zwei getrennte Stücke links und rechts sind ein
   seitliches Paar (Flügel, Flossen, Beine, Ohren). Eingefroren mit Hysterese.
3. **Mittelebenen-Baum:** Die Seitenfläche wird in 2D zerlegt — ein Leiterstreifen je Ast (wie heute die eine Leiter),
   Bögen als ein Streifen mit Fächer nur innen, Verbindungsstücke, wo Streifen sich treffen (Hals am Rumpf, Gabel am
   Fischschwanz). Daraus wird die Haut nach beiden Seiten gehoben: Streifen mit ihren Querschnitten, Verbindungsstücke
   aufgeblasen und weich zwischen den Nachbarquerschnitten überblendet. Die heutige Röhre ist genau der Fall „ein Streifen“
   und bleibt bitgleich.
4. **Seitliche Teile:** derselbe Streifen im geneigten Rahmen des Teils (Querschnitt Linse, Mittelfläche aus der Front),
   angesetzt mit einem Ring-Einsatz auf dem feinen Netz des Rumpfs: Fenster nach dem Fußabdruck des Teils, Ringe faltenfrei
   über eine Karte gelegt (Teil-A-Maschine `karte.ts`), Übergangsreihen mit 3/5-Polen, wo sich die Punktzahl ändert (die
   braucht auch das Maul).
5. **Umrisse berühren:** Wo der Körper hinter Front oder Top zurückbleibt, wird nur der Ring, der dort ohnehin am weitesten
   reicht, örtlich hinausgeschoben, bis er die Linie berührt; die dritte Koordinate jedes Umrisspunkts wird ein Griff.
6. **Glätte und Tempo:** Glättungsmaß (dünne Platte) auf der Grenzfläche im Löser, dünn besetzter Löser nur für die rechte
   Hälfte. Falten bleiben nur an gewollten Kanten.
7. **Linien** als Schleifen genau auf der Linie (L0 auf die Gitter der Teile verallgemeinert), Genauigkeit über die exakte
   Verfeinerung.

Warum das die eleganteste Lösung ist: Die heutige Röhre wird nicht ersetzt, sondern verallgemeinert; jede Linie, die du
zeichnest, bleibt die Wahrheit (die Hohlkehle am Hals ist Teil der schwarzen Linie); 3D-Einsätze gibt es nur dort, wo
wirklich etwas seitlich absteht, und dieselbe Maschine trägt Ansätze, Linien und Maul.

## Schritte

Je Schritt: Kern-Tests mit harten Zahlen, Kontaktbogen, Bild aus dem Editor, dann Halt für Florian. Jeder neue Weg hängt an
einem Schalter; mit Schalter aus bleiben alle Library-Körper und Florians Ablauf (`KUGEL0=1`) bitgleich. Nach drei
gemessenen Fehlanläufen am selben Tor: anhalten, Kritik-Register, Bericht.

### S0 Ausgangslage und ehrliches Maß
- Prüfkörper ergänzen (`packages/shape/src/kern/pruefen/grundkoerper.ts`): **Florians einfache Form** (Screenshot 2/3),
  **Ente mit Flügeln wie Screenshot 1**, Vase aus der Kugel mit Kopplung, Vierbeiner, Zweihals, Augenstiele, Flügel über dem
  Rücken; dazu die bisherigen (Giraffe mit Bauch, Langhals, S-Hals, Fisch, Kugel, Ei, Rex, Robbe, Tiger) — immer über
  Florians Ablauf (Startkugel eingefroren → umformen).
- Faltenmaß nach Zonen (neu `kern/pruefen/zonen.ts`, Variante von `faltenMass` in `kern/pruefstand.ts`): freie Haut,
  Ansatz, Kappe, Spitze, Kante, Maul. Ausgenommen nur geometrisch Gewolltes (Kanten aus scharfen Käfigkanten jeder Schärfe,
  radiale Kanten im ersten Ring um eine gezeichnete Spitze).
- Δ genau aus der Kontur der Stufe 4 statt aus dem Raster (`kern/abweichung.ts`; die Δ-Zahl und der gelbe Saum im Editor
  werden damit genauer); Erreichbarkeit je Umrissstück und grobe 3D-Hülle (neu `kern/grundkoerper/huelle.ts`):
  Widersprüche und „nur als Kante erreichbar“ werden markiert.
- Tore: Zonen ergeben die alten Summen minus Ausgenommenes; genaues Δ ≤ Raster-Δ + 1 px; künstliche Widersprüche zu 100 %
  erkannt, stimmige Fälle ohne Fehlalarm. Im Editor: Widerspruchsstücke farbig auf der schwarzen Linie.

### S1 Liniennetz-Ansicht im Editor (ohne Formänderung)
- **Vorab** eine Umrechnung Kern ↔ Blatt (`apps/editor/src/netz/einheiten.ts`), geprüft bei 100 % und 150 %.
- **Worker** (neu `packages/shape/src/kern/netzSicht.ts`, am Ende von `wesenBauen`, Ausgabe `WesenNetz.netzSicht`):
  Konturen je Blickachse auf dem feinen Netz; Umrisse der Zeichnung auf ihre Kontur gehoben (dritte Koordinate je Knoten);
  Konturen, die niemand gezeichnet hat, als „Rand“; P-Linien per Strahl aus ihrer Zeichenansicht als Hautpunkte (Dreieck +
  Lage, gehen mit Posen mit); Maullinien; Spanten als echter Ringverlauf (`kern/reifen.ts`); Faltenlinien aus scharfen
  Käfigkanten (ersetzt die Eckkanten vom alten Loft); Sichtbarkeit je Probe für Seite, Front, Back, Top, Bottom über
  `versuch/flaechenlinie.ts` `strahlRaster` auf dem Kern-Netz. Jeder Netzpunkt hat eine Kennung und genau einen 3D-Punkt.
- **Keine versteckten Schreibvorgänge:** `kantenAnFlaeche` in der Bauweise Kern aus; Setzen und Ziehen von P-Knoten auf dem
  Kern-Netz (`apps/editor/src/netz/netzRaster.ts` statt `strahlen()`/S0).
- **Anzeige** (`apps/editor/src/netz/NetzEbene.tsx` in `viewports/View2D.tsx`, Muster wie `posen/umrisse.tsx`): eigener
  Umriss wie heute; fremde Umrisse 2 px mit ihren Knoten als Ringe am 3D-Punkt; P-Linien und Falten mit Kantigkeit wie
  heute; verdeckt gestrichelt mit Deckkraft ≈ 0,25–0,3. Hover und Auswahl markieren denselben Punkt in allen Ansichten und
  auf der Bühne. Zwei Stilvarianten als Vergleichsbild für Florian.
- **S1c Kopplung jedes Punkts** (Nachtrag oben): Ein Zug in einer Ansicht passt die anderen Ansichten am entsprechenden
  Punkt an, so dass jeder Umrisspunkt erreichbar bleibt (heute nur die Außenmaße, `kopplung.ts`); keine neuen Knoten (Florian
  11.10.). Rot nur noch für alte Zeichnungen, dazu „angleichen“. Tor: nach jeder Geste Widerspruch ≤ 1 px in allen Blättern.
- **Bearbeiten in fremden Ansichten** (gemeinsame Koordinate, auch verdeckte Punkte wie der Bauchpunkt unter der Nase):
  Top-Punkt in der Seite längs = x, in der Front quer = z; Seitenpunkt im Top längs = x. Läuft über denselben Weg wie ein Zug
  in der eigenen Ansicht (Kopplung, ein Undo-Schritt); ⌥-Klick wechselt zwischen übereinanderliegenden Punkten.
- Tore: derselbe Punkt in allen Ansichten und auf der Bühne ≤ 0,5 px (auch bei 150 % und in Back/Bottom); Sichtbarkeit
  gegen den Strahltest der Bühne ≥ 99,5 % (außer ±1,5 px an Sichtwechseln); eine Formgeste schreibt nur `profile` und
  genau einen Undo-Schritt, `dok.kanten` bleibt gleich; Worker ≤ 30 ms je genauem Bau, ≤ 10 ms während Gesten; Netz
  bitgleich mit und ohne Liniennetz.
- Ehrlich: Bei Überhang-Wesen zeigt die Ansicht den heutigen Körper (eine Röhre); die Bauchlinien unter der Nase laufen
  erst ab S5 am Bauchpunkt zusammen.

### S2 Glatte Haut: Löser und Glättungsmaß (Schalter `fair`)
- Dünn besetzter Löser (RCM + Hüllen-Cholesky, aus `loeser/glattLoeser.ts` verallgemeinert) statt dichter LU, nur rechte
  Hälfte; Glättungsmaß „dünne Platte“ auf der Grenzfläche der Stufe 2, weiche Ziele, dazu die heutigen Naht- und
  Breitenbedingungen.
- Tore: Löser = LU auf 1e-9; Robbe, Langhals, Rex freie Haut ≤ 20°; kein Körper schlechter als S0 um > 1° (freie Haut) oder
  > 0,5 px; Volumen ±2 %; Fernfeld bei örtlichen Zügen ≤ 0,1 px; Bau ≤ 120 ms, Zug ≤ 10 ms.

### S3 Umrisse als 3D-Kurven: Front und Top berühren (Schalter `rand`)
- **Look-Entscheidung zuerst** (Vergleichsbild an Florians einfacher Form): rund (heute, Raute) / genau (hinten kantig bis
  zur Kante) / Mittelweg (Fülle bis „weicher Kasten“, darüber als Widerspruch markiert). Florian wählt, dann bauen.
- `kern/breite.ts`: Intervalllisten je Höhe und je x statt nur der äußersten Breite (Lappen und Kerben bleiben erhalten).
- Neu `kern/rand.ts`: je Umrissprobe die erreichbaren Stellen (Seite und Top bzw. Front erlauben sie); Fehlbetrag gegen den
  Körper ohne Hebung; nur wo > 0,5 px fehlt, wird die Stelle gewählt (glatt längs des Umrisses, Viterbi) und nur der dort
  ohnehin weiteste Ring örtlich hinausgeschoben, begrenzt durch Top und Seite; im Löser Lage, Tangente und Grenzen als
  Bedingungen. Ohne Fehlbetrag bitgleich. Top-Intervalle ohne die Mitte sind seitliche Teile (S6), kein Heben.
- **Dritte Koordinate als Griff** (Knotenfeld `dritte` in `profil.ts`/`dokument.ts`, Doppelklick = wieder automatisch):
  Top-Punkt in der Seite hoch/runter verschiebt die Breitenlinie (Querschnitt jedes Rings monoton verzogen, ohne Eingriff
  bitgleich); Front-Punkt in der Seite vor/zurück legt fest, wo der Körper die Front berührt.
- Tore: Florians einfache Form (ohne Kerbe) Front ≤ 2 px (heute 7–22), Top ≤ 2 px, Seite ≤ 1,5 px bzw. nach Florians Wahl
  markiert; kein Library-Körper schlechter um > 0,5 px oder 2°; Zug ≤ 16 ms; ein gezogener Breitenpunkt liegt nach dem
  Bau ≤ 1 px am Zeiger.

### S4 Teile erkennen (nur Anzeige)
- Neu `kern/grundkoerper/teilbaum.ts` aus `skelett.ts` (Front/Top gespiegelt), `zerlegung.ts`, `teile.ts` und der Hülle aus
  S0; Schnittsehnen eingefroren als Kurvenparameter wie die Enden in `enden.ts`; Hysterese 15 %.
- Im Editor: Wirbelsäulen in allen Ansichten (dünn, mit Knoten; Hover hebt das Teil hervor), Teile farbig je Ansicht, eine
  Baumliste in der Tafel Körper; verdeckte Teillinien dezent und gestrichelt, ihre Enden genau an den Stoßstellen mit der
  schwarzen Linie (die Bauchlinien unter der Nase enden am gehobenen Bauchpunkt der Seite — derselbe 3D-Punkt). Ein Klick
  macht ein verdecktes Stück zu einer eigenen Kurve (`dok.teile`, ein Undo-Schritt, im Rahmen seiner Stoßstellen
  gespeichert), „Automatisch“ nimmt das zurück.
- Tore: mindestens 19 von 20 von Hand eingeordneten Körpern richtig gelesen (u. a. Flügel über dem Rücken, Vierbeiner, zwei
  Hälse, Augenstiele); kein Wechsel der Einordnung in 30-Schritt-Zügen unter 10 px; ≤ 30 ms. **Florian bestätigt die
  Einordnung an eigenen Zeichnungen, bevor Geometrie darauf gebaut wird.**

### S5 Mittelebenen-Baum (Schalter `koerper: teile`)
- Neu `kern/grundkoerper/ebene.ts` (Streifen je Ast aus der Leiter `versuch/wirbelsaeule.ts`, Bögen mit Fächer innen
  `leiterInnenEntfaechern`, 2D-Verbindungsstücke; während Gesten Mittelwert-Koordinaten, am Gestenende harmonische Karte
  `loeser/cg.ts`) und `kaefig/baumKaefig.ts`; Heben mit Querschnitten wie heute, Verbindungsstücke aufgeblasen
  (`versuch/aufblasen.ts`) und harmonisch überblendet; Löser aus S2, Berührung aus S3. Ein Verbindungsstück nur dort, wo
  der Elternteil über die Sehne hinaus weitergeht (Bauch vor der Nase, Ente, S-Hals); sonst läuft der Ast als Bogen weiter.
- Punkte je Ring aus dem Umfang (Vielfache von 8), Ringabstand ähnlich der Kantenlänge, höchstens 40 000 feine Vierecke.
- Tore: einteilige Körper bitgleich zu S3; Langhals, Drache, S-Hals, Giraffe mit Bauch, Überhang, Vase (Florians Ablauf),
  Ente ohne Flügel, Fischschwanz-Gabel: freie Haut, Ansatz und Kappe ≤ 20°; Käfig kleinster Winkel ≥ 25°, Seitenverhältnis
  ≤ 3, Kantenlängen je Teil innerhalb Faktor 2 um den Median; Δ ≤ 1,5/2/2 px (Seite/Front/Top) wo erreichbar;
  Gestenende ≤ 250 ms, Topologie-Neubau ≤ 500 ms im Hintergrund.
- Im Editor zuerst als Geist neben dem heutigen Körper, dann zum Einschalten für Wesen ohne Pinsel-/Pose-Daten.

### S6 Seitliche Teile: Flügel, Flossen, Beine, Ohren
- Neu `kern/grundkoerper/seitenteil.ts` (Streifen im geneigten Rahmen: Naht = Top-Lappen, Mittelfläche aus der
  Front-Mittelachse, Linsen-Querschnitt, N = 8, flache Kappe) und `ansatz.ts` (Fenster als Rechteck im exakt verfeinerten
  Elterngitter nach dem Fußabdruck, Seitenverhältnis ±30 %, Abstand zur Mitte und zu anderen Fenstern; Ringe faltenfrei
  über `kern/einsatz/karte.ts`; Übergangsreihen K = 1–3 mit 3/5-Polen ≥ 2 Kanten auseinander; Hohlkehle als Streifen
  zwischen zwei Schnittlinien mit Radius aus der gezeichneten Innenecke; Lösen wie `einsatz/loesen.ts`; rechte Hälfte +
  Spiegel). Wiederverwendet: `einsatz/verfeinern.ts`, `feld.ts`, Nummernregel aus `topologie.ts`, `knoten.ts`
  `astVerlaengert`.
- Tore: Florians Ente Top ≤ 2 px (heute 50), Front ≤ 2 px, Ansatz ≤ 20°, 0 umgeklappte Flächen; Florians einfache Form mit
  Kerbe Top ≤ 2 px (heute 59–81); Fisch-Brustflossen; außerhalb Fenster + Kragen bitgleich.

### S7 Einbau als Standard
- Schalter `Ausstattung.koerper?: 'roehre' | 'teile'` (fehlt = heutige Röhre), Chip in der Tafel Körper, Umschalten = ein
  Undo-Schritt; eingefroren in `dok.kaefig.baum` (Teile, Ansätze, Punktzahlen, Fenster), gültig nur, solange es die Form
  trägt (Lehre G2); `kaefig.stationen` bleibt, Zurückschalten ist exakt.
- Anker statt Punktnummern für Pinsel und Posen (`kern/posen/uebertrag.ts`; Klassen Teil (s, t), Verbindungsstück (u, v),
  Ring-Einsatz (u, θ) nach dem Posen-Entwurf 3.2); der stille Rückfall auf Punktnummern wird ein Fehler.
- Auf mehrteiligen Körpern noch nicht: Maul (kommt mit Teil A; Maullinien bleiben gezeichnet und bearbeitbar, die Tafel
  sagt es), Reifen auf der Bühne, Augen über Ring/Spalte, Kieferknopf, Zähne — mit Hinweis. Einteilige Körper behalten alles.
- Tore: Pinselbeule und Pose überstehen Punktzahl-Wechsel, neuen Ansatz und Umbau Kugel → Ente (≤ 1 px außerhalb, ≤ 2 px in
  geänderten Zonen); `vergleich/ablauf.mjs` grün; Undo bitgleich; Florians Abnahme mit eigenen Wesen.

### S8 Linien exakt (Teil L, L1)
- `kern/netz/` von der Röhre auf die (s, t)-Gitter der Teile verallgemeinert; Kantigkeit als Falte längs der Schleife;
  Kreuzungen mit Umrissen und Linien als gemeinsame Knoten (Teil L, Bauweise 2).
- Genauigkeit: zuerst eine globale exakte Verfeinerung (`verfeinern1`, gleiche Fläche mit 4× Punkten; geschätzt
  Normalen 0,2–0,8°), dann eine örtliche Stufe mit Nachpassen der Übergangszone (nicht exakt, eigenes Fehlerbudget).
- Tore (Florian): Haut ≤ 0,05 px, Normalen ≤ 0,1° auf der L0-Reihe; Käfig ≤ 2500 Punkte. Der Schritt, der am ehesten an der
  Abbruchregel hängt — dann Bericht mit erreichtem Stand.

## Wiederverwendet

- Röhre/Streifen: `kern/ableiten.ts` (Leiter, Stationen, `zieleBerechnen`, `breitenSchleife`, `fertigstellen`),
  `versuch/wirbelsaeule.ts`, `kaefig/roehre.ts`, `subdivision/catmullClark.ts`, `kern/grundkoerper/enden.ts`.
- Teile: `kern/grundkoerper/skelett.ts`, `zerlegung.ts`, `teile.ts`, `baum.ts` (`baumTeile`), `knoten.ts`; `fit.ts`;
  `kopplung.ts`.
- Karten und Einsätze: `kern/einsatz/verfeinern.ts`, `flaeche.ts`, `feld.ts`, `karte.ts`, `topologie.ts`, `loesen.ts`;
  `loeser/cg.ts`, `loeser/glattLoeser.ts`, `versuch/aufblasen.ts`.
- Linien: `kern/netz/` (`gitter`, `einpassen`, `ringEinpassen`, `ausgleichGleiten`), `kern/kanten.ts`, `kern/reifen.ts`.
- Anzeige: `versuch/flaechenlinie.ts`, `kern/abweichung.ts`, `apps/editor/src/kanten/KantenEbene.tsx` (Kantigkeits-Stil),
  `posen/umrisse.tsx` (Worker-Umrisse im Blatt), `viewports/View2D.tsx`, `three/Renderer3D.ts`.
- Daten: Ankertabelle aus `docs/plans/2026-10-15-entwurf-posen.md` (3.2), `kern/posen/uebertrag.ts`.

## Risiken und Grenzen (ehrlich)

- Teilerkennung kann bei kleinen Beulen kippen → Mindestgröße, Hysterese, Einfrieren, Florians Bestätigung in S4.
- Flügel über dem Rücken, Vierbeiner-Beine und Köpfe, die den Rücken berühren, sind Sonderfälle der Erkennung (Hülle
  entscheidet; Berührung mit sich selbst wird gemeldet).
- Vierecksgüte am Ring-Einsatz hängt am Fensterzuschnitt (Lehre A5) → Fenster nach dem Fußabdruck, Übergangsreihen.
- Größere Käfige kosten bei Posen Zeit (heute 55 ms je Gewichtswechsel bei 25 000 Vierecken) → Obergrenze 40 000.
- Widersprüchliche Ansichten bleiben sichtbar markiert, werden nicht still gelöst.
- Maul auf mehrteiligen Körpern erst mit Teil A; bis S7 behalten einteilige Körper alle heutigen Werkzeuge.

## Arbeitsregeln

- Ein Schritt nach dem anderen (Florians Regel); nach jedem Schritt Halt mit Kontaktbogen und Editor-Bild.
- Immer Florians Ablauf (neue Kugel → umformen → Knoten einfügen → …); sagen, was im Editor ist und was nur im Kern; keine
  Meldung „bestanden“ ohne Florian.
- Eigener Vite auf 5192 (`run-check.sh`), nie 5180; `assets/fonts/Hippie Movement.otf` nie committen.
- Jeder Commit: `pnpm typecheck`, `pnpm test`, `pnpm lint`; nach jedem Teilschritt pushen; `docs/UEBERGABE.md` am Blockende;
  `CLAUDE.md` mit Verweis auf diesen Plan.

## Verifikation

- Kern-Tests je Schritt mit den Toren oben (Prüfsatz aus S0), Faltenmaß nach Zonen, genaues Δ aus der Kontur, Bitgleichheit
  bei ausgeschaltetem Schalter für alle Library-Körper und `KUGEL0=1`.
- Kontaktbögen (Seite, Front, Top mit schwarzer Linie und Markierungen, schräg, Zebra) über `grundkoerper-g.ts` und
  Nachfolger; ich sehe jeden Bogen selbst durch, bevor er zu Florian geht.
- Editor mit echten Zügen (Playwright über `run-check.sh`): `netz-a.mjs` (Linie in allen Ansichten, Sichtbarkeit, derselbe
  Punkt, keine versteckten Schreibvorgänge), `netz-b.mjs` (Ziehen in fremden Ansichten, Breitenlinie), `teile-*.mjs`
  (Schalter, Florians Ablauf, Undo/Laden); bestehende Prüfungen grün (`kern-ablauf`, `kanten.spec.ts`, `posen-b3` …
  `posen-b7`, `tab-wechsel`, `vergleich/ablauf.mjs`).

## Stand

- **16.10. vormittags:** Plan freigegeben und ins Repo gelegt. Nächster Schritt S0 (Ausgangslage und ehrliches Maß).
- **16.10. vormittags, S0 „Ausgangslage und ehrliches Maß“ gebaut und gemessen** (Abnahme offen):
  - **Prüfsatz** (`kern/pruefen/grundkoerper.ts`, `S0_KOERPER`): Florians einfache Form aus Screenshot 2/3 (mit und ohne
    Kerbe), Ente mit Flügelhaken aus Screenshot 1 (Library-Vorlage samt Spant S1, sein Top abgelesen), Vase aus der Kugel
    mit Kopplung, dazu für S4 Vierbeiner, Zweihals, Augenstiele, Flügel über dem Rücken (Ausdehnungen gekoppelt wie im
    Editor). Der heutige Bau stellt die Screenshots nach (einfache Form Front 21,7 / Top 77,5 px; Ente mit Haken Front
    22,0 / Top 49,4 px).
  - **Faltenmaß nach Zonen** (`kern/pruefen/zonen.ts`): Tor erfüllt (Zonen + neu Ausgenommenes = altes Maß, 9 Körper).
    Rex 93° liegt an der gezeichneten Schnauzenspitze, freie Haut 20,3°; **Kappen sind die größte Faltenquelle** (einfache
    Form 99°, Vase 172°, Ente 171°, Ente mit Haken 138°); echte Falten auf freier Haut: Robbe 25°/68, Langhals 23°/32
    (Knick Hals → Kopf), Ente 58°/172, Ente mit Haken 58°/875.
  - **Δ genau** aus den Silhouettenkanten des Netzes (`kern/abweichung.ts`, Standard jetzt genau, auch im Editor): Tor
    erfüllt (genau ≤ Raster + 1 px, 16 Körper), Unterschiede ≤ 0,6 px — das Raster war brauchbar, Tore von 1–2 px sind jetzt
    belastbar.
  - **Erreichbarkeit / Widersprüche** (`kern/grundkoerper/huelle.ts`): Tor erfüllt (künstlicher Widerspruch zu 100 % erkannt,
    stimmige Kugel ohne Fehlalarm). Befunde (Widerspruch / Δ in px):

    | Körper | Seite | Front | Top | Lesart |
    |---|---|---|---|---|
    | Ente mit Haken (Screenshot 1) | 1,2 / 2,2 | 7,1 / 22,0 | **36,7 / 49,4** | Kopf im Top breiter, als die Glocke der Front in seiner Höhe erlaubt — der „eingedrückte Kopf“ ist vor allem ein Widerspruch der Zeichnung |
    | Einfache Form (Screenshot 2) | 1,8 / 0,4 | 7,7 / 21,7 | 0,7 / 77,5 | Front 7,7 px breiter als das Top; Raute (≈ 14 px) und Kerbe (77 px) sind Baufehler |
    | Rex | 0,5 / 1,3 | 6,0 / 11,1 | 0,0 / 1,2 | 6 von 11 px Front sind Widerspruch |
    | Robbe, Giraffe mit Bauch, Vierbeiner, Zweihals, Augenstiele, Flügel oben | ≈ 0 | ≈ 0 | ≈ 0 | ganzes Δ ist Baufehler |
  - **Im Editor:** Titel „Δ … · Widerspruch … px“ und die nicht erreichbaren Stücke rot unter der schwarzen Linie
    (`viewports/View2D.tsx`, `Viewport.tsx`, Worker `WesenNetz.widerspruch`); geprüft mit
    `apps/editor/scripts/pruefen/s0-editor.mjs` (eigener Vite 5192): Zahlen wie im Kern.
  - **Bilder:** [`s0-ausgangslage-2026-10-16.jpg`](../progress/editor/s0-ausgangslage-2026-10-16.jpg) (16 Körper, Widersprüche
    rot, Zonen im Text), [`s0-editor-ente-haken-2026-10-16.jpg`](../progress/editor/s0-editor-ente-haken-2026-10-16.jpg),
    [`s0-editor-einfach-2026-10-16.jpg`](../progress/editor/s0-editor-einfach-2026-10-16.jpg),
    [`s0-editor-rex-2026-10-16.jpg`](../progress/editor/s0-editor-rex-2026-10-16.jpg).
  - **Folgen für die nächsten Schritte:** S2 muss die Kappen einschließen (größte Faltenquelle); die Look-Entscheidung in S3
    betrifft auch Widersprüche (welche Ansicht gewinnt, wenn zwei sich widersprechen); der Kopf der Ente wird erst rund und
    zugleich genau, wenn Florian Front oder Top an dieser Stelle anpasst.
  - Nächster Schritt nach Florians Blick: S1 (Liniennetz-Ansicht).
- **16.10. mittags, S1 „Liniennetz-Ansicht“ und S1c „Kopplung jedes Punkts“ gebaut und gemessen** (Abnahme offen; alles
  im Editor, Bauweise Kern, Editor-Tab/Grundform):
  - **Vorab Einheiten:** Der Kern rechnet immer in Profil-Einheiten, der Größenregler gilt nur für die Anzeige
    (`wesenBauen`/`formenFolgen` normieren `skalierung`); Test `kern/einheiten.test.ts` (150 % bitgleich zu 100 %).
  - **Worker** (`kern/netzSicht.ts`, `WesenNetz.netzSicht`, nur im genauen Bau, ohne Beine/Hebung): Konturen je Blickachse
    auf dem feinen Netz, je Probe ob sie den äußeren Umriss ihrer eigenen Ansicht bildet (`RAND`), Umrissknoten als
    3D-Punkte, Kantenlinien per Strahl aus ihrer Zeichenansicht auf die Haut (samt Spiegelbild), Spantringe, Falten aus
    scharfen Käfigkanten, Sichtbarkeit je Probe für Seite/Front/Back/Top/Bottom. Zeit 17–18 ms (Ente, Giraffe), Vierbeiner
    33,5 ms (74 Faltenzüge, knapp über dem Budget 30 ms); während Gesten 0 ms (der letzte genaue Stand bleibt).
  - **Anzeige** (`apps/editor/src/netz/`): in jedem Blatt die Umrisse der anderen Ansichten als 3D-Linien (nur die Stücke,
    die dort den Umriss bilden; im eigenen Blatt die inneren Konturstücke), Knoten der anderen Zeichnungen als Ringe,
    Kantenlinien und Falten mit der Kantigkeit wie bisher (statt der Eckkanten des alten Lofts), Spantringe; verdeckt
    gestrichelt und blass. Zwei Stile zum Vergleichen: Chips „netz ton“ / „netz farbe“ in der Tafel Körper (Kanten).
  - **Kantenlinien auf dem echten Körper:** Setzen und Ziehen über ein Strahlraster des Kern-Netzes (`netz/netzRaster.ts`
    statt der Versuchsfläche S0), Knoten in allen Blättern am Netzpunkt; `kantenAnFlaeche` schreibt in der Bauweise Kern
    nichts mehr (keine versteckten Schreibvorgänge).
  - **Derselbe Punkt überall:** Hover über einem Knoten (eigener, Ring oder Kantenknoten) markiert ihn in allen Blättern
    und auf der Bühne; Ringe fremder Knoten sind greifbar (auch verdeckte), Ziehen wirkt nur in der gemeinsamen Koordinate
    (Seite↔Front y, Seite↔Top x, Front↔Top z), ein Undo-Schritt; ⌥-Klick wechselt zwischen übereinanderliegenden Punkten
    (der eigene Knoten geht beim Klick vor).
  - **S1c Kopplung jedes Punkts** (`packages/shape/src/kopplungPunkte.ts`, `gekoppelt` in jeder Formgeste): Die bearbeitete
    Ansicht führt; die Breiten der anderen folgen am entsprechenden Punkt (Projektion der Sichthülle über die Spanne der
    Seite, mit Intervallen — Flügelhaken, Beine, Hälse nebeneinander), kleinste Knotenbewegung quer zur Achse, keine neuen
    Knoten, alte Widersprüche bleiben, bis man angleicht. „angleichen“ im Blatt-Titel neben „Widerspruch … px“ (diese
    Ansicht führt, ein Undo-Schritt). Zug 0,2–4 ms (Mittel), höchstens ≈ 14 ms.
  - **Tore (gemessen):**

    | Tor | Ergebnis | Prüfung |
    |---|---|---|
    | derselbe Punkt Blatt ↔ Kamera des Blatts ≤ 0,5 px, auch 150 % und Back/Bottom | **0,00 px** (Kugel, Giraffe; 4 × 6 Blätter) | `netz-b.mjs` |
    | Sichtbarkeit gegen den Strahltest der Bühne ≥ 99,5 % | **100 %** in allen 5 Blicken (Kugel, einfache Form, Giraffe, Ente-Haken) | `netz-d.mjs` |
    | Formgeste schreibt nur Profile, ein Undo-Schritt, `dok.kanten` gleich | erfüllt (4 Körper mit Kantenlinie) | `netz-d.mjs` |
    | nach jeder Geste Widerspruch ≤ 1 px (stimmiger Anfang) | Editor: 6 Mauszüge an der Kugel 0,0 px; Kern: 323 von 325 Zufallsgesten ≤ 1 px, folgende Ansichten immer ≤ 0,97 px, die führende nie schlechter als ohne | `netz-c.mjs`, `kopplungPunkte.test.ts` |
    | angleichen alter Zeichnungen | 12 von 13 Prüfkörpern 0,0 px; Ente-Haken: Front führt 36,7 → 0,0 px, Top führt bleibt 36,3 px (siehe unten) | `kopplungPunkte.test.ts`, `netz-c.mjs` |
    | Worker ≤ 30 ms je genauem Bau | 17–18 ms; Vierbeiner 33,5 ms | `netzSicht.test.ts` |

  - **Ehrlich offen / Befunde:**
    - **Zu wenige Knoten in der folgenden Ansicht:** Verlangt die führende Ansicht etwas, das die folgende nur mit einem
      zusätzlichen Punkt kann (Ente-Haken: Kopf im Top breiter, die Front hat einen einzigen freien Knoten am Bauch), bleibt
      die folgende stimmig und der Rest rot in der führenden. Lösung heute: an der Stelle des Rings einen Punkt setzen.
      **Frage an Florian:** Darf die Kopplung in diesem Fall einen Punkt am entsprechenden Ring einfügen (11.10.: nie)?
    - **Angleichen ändert die Zeichnung sichtbar** (Ente, Front führt: Top-Kopf so schmal wie die Front, Flügel spitzer);
      der heutige Körper folgt dem erst mit S3 genauer (Front-Δ danach 44 px).
    - **Kantenlinien-Falten sind Treppen** (Kern-Zuordnung auf die nächste Käfigschleife) — jetzt in allen Blättern zu sehen;
      genau wird es mit S8. Der Front-Umriss wackelt an einer solchen Falte leicht (echte Wirkung der Falte).
    - **Faltenrest im Entenhals:** 21 Proben liegen in der Seite hinter einer umgeklappten Fläche (≈ 2 px), die die Bühne
      nicht zeichnet (Rückseite) — ein Körperfehler für S2, keine Netzfrage.
    - Bei Überhang-Wesen zeigt das Netz den heutigen Körper (eine Röhre); die Bauchlinien unter der Nase laufen erst ab S5
      am Bauchpunkt zusammen. Maullinien zeichnet weiter die Maulebene (ohne Verdeckung). In Posen ist das Netz aus.
  - **Bilder:** [`s1-liniennetz-2026-10-16.jpg`](../progress/editor/s1-liniennetz-2026-10-16.jpg) (Kugel mit Kantenlinie,
    Ente Ton/Farbe, derselbe Punkt in allen Blättern und auf der Bühne, Ziehen im Top, Angleichen vorher/nachher).
  - **Nächster Schritt:** Florians Blick (Stil Ton/Farbe, Verhalten der Kopplung beim Zeichnen, Frage zu neuen Punkten),
    dann S2 (glatte Haut, dünn besetzter Löser).
- **16.10. nachmittags, Florians Entscheidungen zu S1/S1c umgesetzt:** „farbig ist erstmal besser“ → Stil „netz farbe“ ist
  Standard (die Chips bleiben zum Vergleichen). „Wenn Knoten fehlen, kannst du sie einfügen, aber nur wenn wirklich
  notwendig“ → die Kopplung löst zuerst mit den vorhandenen Knoten; bleibt mehr als 1 px Widerspruch (mit dem Spielraum
  der Erreichbarkeit, ±0,5 px), teilt sie das Segment der folgenden Ansicht an der Stelle des größten Rests formneutral und
  löst neu — höchstens zwei Punkte je Zug, und ein Punkt bleibt nur, wenn er den Rest um mindestens 0,5 px verkleinert
  (an Spitzen, Sohlen und Gabeln hilft er nicht). Im Editor bleibt ein eingefügter Punkt für den Rest der Geste, die
  Spanten bekommen denselben Punkt (Punktstruktur der Front), die Auswahl rückt mit; ein Undo-Schritt.
  - **Gemessen:** Kern-Zufallsreihe mit Einfügen 325 von 325 Gesten stimmig (≤ 1 px), 2 Punkte eingefügt, beide nötig
    (ohne: 6,0 und 3,2 px), keiner unnötig; Angleichen der Ente-Haken mit führendem Top 36,3 → 0,0 px mit einem Front-Punkt;
    stimmige Körper bekommen nie einen Punkt. Editor (`netz-e.mjs`): Angleichen im Top → Front 3 → 4 Punkte, Spant S1
    ebenso, 0,0 px; Kopf im Top 36 px breiter → Front bekommt Kopf, Hals und Körper (2 Punkte), 0,0 px, Undo stellt alles
    wieder her; gewöhnliche Züge an der Kugel ohne neue Punkte.
  - **Unterwegs behoben:** Bei widersprüchlichen Forderungen an Ansichten mit mehreren Teilen sprang der Löser in eine
    kaputte Lösung (Vierbeiner: Knoten übereinander, 300 px) → jeder Schritt gilt nur, wenn der gesamte Widerspruch kleiner
    wird (sonst halbiert, zuletzt verworfen). Forderungen und Fehler werden so fein abgetastet wie die Erreichbarkeit
    (24 Proben je Segment), Schnitte über einen Kantenindex: Zug im Mittel 0,4–8,5 ms, höchstens ≈ 14 ms.
  - Ohne Einfügen (Kern-Option) bleibt der Rest eines unerfüllbaren Zugs in der führenden Ansicht; die folgende bleibt
    stimmig. Die Front der Ente zeigt danach Kopf, Hals und Körper — der heutige Körper folgt dem erst mit S3/S5.
