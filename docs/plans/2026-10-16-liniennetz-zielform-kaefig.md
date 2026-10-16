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
  erkennen → S5 Mittelebenen-Baum → S6 seitliche Teile → S7 Einbau als Standard → S8 P-Linien als echte Kanten (Linien
  exakt). Nach jedem Schritt Bilder aus dem Editor und Halt für dich.

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
   Verfeinerung. So werden die mit P auf die Haut gezeichneten Linien echte Kanten: Die Härte ist die Rundung längs der
   Schleife, der Winkel kommt aus einer Ecke im Querschnitt an der Linie (Nachtrag 16.10. abends, S8).

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

#### S5 im Detail (Bauplan 16.10. abends, nach Florians „dann S5“; vor dem Code)

**Grundgedanke.** Ein Körper aus Mittelteilen ist ein Höhenfeld über seiner Seitenfläche: Jeder Punkt (x, y) der Seite hat
eine halbe Dicke h ≥ 0, die Haut ist z = ±h, die schwarze Linie ist h = 0. Der Käfig ist dann ein 2D-Vierecksnetz der
Seitenfläche, verdoppelt (rechts und links), dessen Randpunkte die Naht bilden. Die heutige Röhre ist genau das: ein
Streifen (Sprossen × Querschnittspunkte) und an jeder Spitze eine halbe Kappe. S5 legt die Seitenfläche aus mehreren
Streifen aus; seitliche Paare (Flügel, Beine, Brustflossen) bleiben bis S6, wie sie heute sind.

**Ausgangslage gemessen** (S3-Standard glatt + Berühren mittel; frisch / aus der Startkugel; freie Haut, Kappe; Δ S/F/T px):
Langhals 16,3/14,5°, Δ 1,5/4,3/3,4 · Drache 14,7°, 1,5/4,3/3,0 · S-Hals 26,7/29,7° (106/150 Kanten > 20°), 1,5/1,8/7,4 ·
Giraffe mit Bauch 23,2/25,0°, Kappe 22,5°, 0,9/18,8/8,5 · Überhang 57,9/43,0° (567/532), 2,4/23,1/30,1 · Vase 13,5/10,9°,
1,1/2,9/**13,9** · Ente 16,7/45,4°, Kappe 23,6/56,8°, 4,2/2,8/46,5 (Flügel = S6) · Fisch 145° (Flossen in einer Röhre).
Vase: Die Leiter läuft vom Rand über den Hals und biegt im Bauch zur rechten Seite; die schrägen Bauchringe ragen im Top
bis 13,7 px über den Kreis (Diagonalen) — ein Fall für die richtigen Enden, nicht für ein Verbindungsstück.

**Zwei Bauarten je Mittelteil** (aus dem eingefrorenen S4-Baum):
1. **Seitlich angesetzt (Verbindungsstück):** Das Teil sitzt an einer Längsseite des Elternstreifens, und der Elternteil
   läuft über beide Sehnenenden hinaus weiter (Ente, Giraffe mit Bauch, S-Hals, Überhang, Rücken- und Bauchflosse). Der
   Elternstreifen behält seine Ringe; unter der Sehne enden H + 1 seiner Sprossen genau auf den Punkten des ersten
   Teilrings (H = halbe Punktzahl des Teilrings), ihre Fußpunkte auf der Gegenseite gleichmäßig verteilt (Fächer, sonst
   werden die Vierecke darunter schmal). Der erste Teilring ist die Sehne selbst, verdoppelt. Topologisch eine Hose; die
   beiden Sehnenenden (Hohlkehlen) werden Nahtpunkte mit sechs Kanten (Sattel), sonst keine besonderen Punkte.
2. **Am Ende angesetzt (Fortsetzung):** Das Teil setzt ein Ende des Elternstreifens fort (Langhals, Drache, Vase). Ist es
   deutlich dünner (Umfang unter ≈ 70 % des Elternteils an der Sehne), wird die Endkappe des Elternstreifens zum Übergang
   2:1: Ihre Nahtspalte ist die Sehne, an der das Teil mit halber Punktzahl beginnt (16 → 8). Sonst läuft der Streifen wie
   heute als Bogen weiter (Fächer innen). Die Enden einer Fortsetzung sind die Spitze des Teils und das gegenüberliegende
   Ende des Elternteils (Vase: Rand und Boden, Ringe waagerecht).
3. **Entscheidung:** Winkel zwischen Sehne und Wirbelsäule des Elternteils an der Sehne unter 45° → seitlich; sonst
   Fortsetzung; ein runder Elternteil (Seitenverhältnis < 1,3) → Fortsetzung. Körper ohne seitlich angesetzte oder
   verjüngte Teile bauen wie heute (bitgleich).

**2D-Auslegung** (neu `kern/grundkoerper/ebene.ts`): je Streifen der Umriss seines Bereichs (Teilumrisse aus S4, an den
Sehnen geschnitten), zwei Ketten vom Anfang (Spitze oder Sehne) zum Ende, die kürzeste Leiter dazwischen (Leiter aus
`versuch/wirbelsaeule.ts` für beliebige Ketten verallgemeinert, alte Aufrufe bitgleich). Punkte je Ring: Rumpf 16, Teile 8
(mehr nur, wenn der Umfang es verlangt; Vielfache von 8). Ringe nach der örtlichen Kantenlänge (Umfang / Punktzahl), an
Krümmungen verdichtet; Käfig höchstens ≈ 600 Vierecke (40 000 auf Stufe 3). Sehnenpunkte des ersten Teilrings nach
gleichen Winkeln (runder Ring in 3D).

**Käfig** (neu `kaefig/baumKaefig.ts`): Ringe je Streifen, Kappen an den Spitzen (heutige c × c-Kappe, innere Punkte zuletzt
nummeriert wie heute), Übergangskappe mit der Sehne als Nahtspalte, verdoppelte Sprossenenden unter einer Sehne. Prüfung:
geschlossen, orientiert, χ = 2, Valenzen wie erwartet; ein Streifen ergibt genau die heutige Röhre (Topologie und Ziele).

**Zielform** (Form zuerst): je Streifen Querschnitt und Maßstab wie heute (`querschnitteFuer`, `masstab`, S3-Berühren) auf
den eigenen Sprossen. Der erste Teilring ist der Querschnitt des Teils an der Sehne (Breite aus Front und Top dort) und
zugleich das obere Ende der Elternsprossen darunter; deren Querschnitt geht im oberen Teil weich vom eigenen auf diesen
Punkt über, die ersten Teilringe ebenso vom ersten Ring auf den eigenen Querschnitt. Danach Löser wie S2 (glatt, relativ zur
Zielform), Naht auf der ganzen schwarzen Linie, Breitenpunkte aller Streifen. Die Übergänge sind die eigentliche Arbeit;
sie werden gemessen (Falten nach Zonen mit neuer Zone „Ansatz“), nicht geschätzt.

**Teilschritte** (je Teilschritt Messreihe und Bild, Commit):
- **S5.1 Topologie:** Auslegung und Käfig, Prüfungen (geschlossen, Valenzen, ein Streifen = Röhre), Bild der 2D-Auslegung.
- **S5.2 Seitlich angesetzt:** Zielform, Lösen, Zonen → Giraffe mit Bauch, Ente, S-Hals, Überhang, Fisch-Flossen.
- **S5.3 Fortsetzung:** Übergangskappe 2:1 und Enden → Langhals, Drache, Vase.
- **S5.4 Fischschwanz-Gabel:** zwei Lappen am Ende (Fortsetzung in einen Lappen, der andere seitlich — oder ein
  Y-Stück, nach Messung).
- **S5.5 Editor:** Schalter `ausstattung.koerper: 'teile'`, Geist neben dem heutigen Körper auf der Bühne, Prüfskript mit
  Florians Ablauf; dann Halt mit Kontaktbogen.

**Tore** (wie oben, präzisiert): einteilige Körper bitgleich zu S3; die acht Körper freie Haut, Ansatz und Kappe ≤ 20°;
Käfig kleinster Winkel ≥ 25°, Seitenverhältnis ≤ 3, Kantenlängen je Teil im Faktor 2 um den Median (an verjüngten
Spitzen ehrlich berichtet); Δ ≤ 1,5/2/2 px, wo erreichbar (Flügel, Brustflossen = S6, ausgenommen); Gestenende ≤ 250 ms,
Topologie-Neubau ≤ 500 ms. **Grenzen:** Maul, Reifen, Augen, Pinsel und Posen auf mehrteiligen Körpern erst mit S7 (die
Tafel sagt es); die Auslegung wird je genauem Bau neu bestimmt (Einfrieren mit S7).

#### S5-Reste (Plan 16.10. abends, nach Florians „ok, du kannst weiter machen“; vor dem Code)

**Befund vor dem Bau** (gemessen; Ausgang wie im S5-Stand):
- **Überhang:** Die 28°-Falte ist ein Grat oben auf dem Rücken (Ringe 14/15, quer über der Naht), keine Gabel. Jeder Ring
  trägt die ganze Front-Glocke (schmaler Kopf auf breitem Körper), auch die schrägen Rumpfringe. Mit runden Querschnitten
  bleiben 24° an der Kehle (Fächer). Querschnitt je Ring (Fenster ±1 Ring) gibt 173° (Umklappen an der Kehle) — verworfen.
- **Fischschwanz:** trägt schon heute (unterer Lappen über den Übergang 2:1, oberer seitlich): keine Falte über 20° außer an
  den gezeichneten Spitzen. Ein Y-Stück wird zurückgestellt.
- **Hohlkehlen:** Die Falten (Giraffe 22,6°, S-Hals 22,6°, Ente 24,7°, Fisch 36,3°) liegen schon in der Zielform (vor dem
  Löser), quer über der Naht an den Sehnenenden — auch dort, wo die Zeichnung gerade läuft (Wendewinkel über ±10 px 2–15°).
  Ursache: Am Sehnenende treffen in einem Nahtpunkt mit sechs Kanten zwei Ringe mit verschiedener Querkrümmung zusammen.
  Der Rumpfring ist oben rund (Giraffe: Radius ≈ 45 px), der Kindring 0 auf der Sehne ist eine flache Ellipse mit spitzem
  Ende (≈ 11 px). Eine glatte Fläche kann beides nicht an einem Punkt.

**R1 Kragen statt Sehne** (seitlich angesetzte Mittelteile; Schalter, die Sehne bleibt zum Vergleich):
- Der erste Ring des Kinds ist eine U-Schleife auf der Haut des Rumpfs. Sie läuft vom Sehnenende A den Rumpfring durch A
  hinab bis zur Zeile m, die Zeile m entlang unter dem Kind und den Rumpfring durch B wieder hinauf (H = 2m + w; w =
  Rumpfringabstände unter der Sehne, gerade). Das Feld innerhalb des U gehört dem Kind.
- Folgen:
  - A und B sind gewöhnliche Nahtpunkte mit vier Kanten. Statt dessen gibt es vier Punkte mit fünf Kanten auf den Flanken
    an den Ecken des U.
  - Der Übergang Rumpf → Kind (Hohlkehle) ist das Band zwischen dem U und dem ersten Kindring.
  - Es gibt keine verdoppelten Punkte.
  - Rücken- und Bauchflosse können über denselben Rumpfringen sitzen (oben ein U in den Zeilen 0…m, unten eines in h − m…h).
- So setzt man in der Unterteilungs-Modellierung Hals oder Arm an: ein Fenster im Elterngitter. Dasselbe plant S6 für die
  seitlichen Teile.
- Tore: Ansatz ≤ 20° an Giraffe, S-Hals, Ente und Fisch-Rückenflosse. Frei und Kappe nicht schlechter, Δ nicht schlechter um
  mehr als 0,5 px. Käfig geschlossen und orientiert, χ = 2, keine Punkte mit sechs Kanten auf der Naht.

**R2 Überlappende Flossen:** Mit dem Kragen bekommt die Fisch-Bauchflosse einen eigenen Streifen über denselben Rumpfringen
wie die Rückenflosse (heute im Rumpf, frei 32°). Tor: frei ≤ 20° am Fisch außerhalb der Spitzen.

**R3 Übergang 2:1 höher am Hals** (Langhals, Drache): Die Übergangssehne liegt dort, wo der Hals dünn wird, die Brust bleibt im
Rumpf. Tor: Δ nicht schlechter als der eine Streifen, Falten ≤ 20°.

**R4 Überhang:** Grat aus dem Glocken-Querschnitt → Kopf und Rumpf bekommen je ihren eigenen Querschnitt. Erst nach R1–R3,
mit Messung; ein Y-Stück nur, wenn es danach noch fehlt.

Nach R1–R4: Messreihe, Kontaktbogen, Editor (Geist), Halt für Florian.

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
- **P-Linien (Nachtrag 16.10. abends): kein Rückschritt bis S8.** Mit P gezeichnete Linien bleiben auf mehrteiligen Körpern
  gezeichnet, in allen Ansichten sichtbar und ziehbar und wirken mit ihrer Härte mindestens wie heute als Falte (Treppe auf
  der nächsten Käfigschleife, je Streifen und über die Ansätze hinweg). Genau auf der Linie werden sie in S8.
- Tore: Pinselbeule und Pose überstehen Punktzahl-Wechsel, neuen Ansatz und Umbau Kugel → Ente (≤ 1 px außerhalb, ≤ 2 px in
  geänderten Zonen); `vergleich/ablauf.mjs` grün; Undo bitgleich; eine P-Linie mit Härte macht auf einem mehrteiligen Körper
  mindestens dieselbe Falte wie auf der Röhre (Ente: Linie über den Halsansatz); Florians Abnahme mit eigenen Wesen.

### S8 P-Linien als echte Kanten — Linien exakt (Teil L: L0-Rest und L1)

> Nachtrag 16.10. abends, Florian: „Wird das mit den Linien, die ich mit P auf die Haut zeichne, die dann zur Kante werden
> können, noch eingebaut? Ich habe es nicht im Plan gefunden. Es war wichtiger Teil der Aufgabe.“ Entscheidung: Reihenfolge
> bleibt (S8 nach S7), der Schritt steht jetzt in Klartext mit Toren für seinen Ablauf. Bauweise und Bedienung im Einzelnen:
> [`2026-10-15-teil-l-linien-kurvennetz.md`](2026-10-15-teil-l-linien-kurvennetz.md) (Entscheidung 11).

**Ziel (Florians Ablauf):**
1. **Zeichnen:** Mit P zeichnest du eine Linie auf die Haut — in Seite, Front, Back, Top, Bottom oder auf der Bühne. Beginnt
   oder endet sie auf einer Kontur, ist der Punkt ein gemeinsamer Knoten. Ohne Härte bleibt sie eine Linie auf der Haut (z. B.
   Rand einer Musterzone), ohne den Körper zu verändern.
2. **Zur Kante machen:** Mit ⇧W stellst du je Knoten die Härte ein (gestrichelt 1 px = glatt … schwarz 3 px = scharf). Eine
   Käfigschleife liegt genau auf der Linie (keine Treppe), die Härte ist die Rundung der Kante längs der Schleife und darf
   von Knoten zu Knoten auslaufen.
3. **Winkel:** Der Winkel kommt aus der Form („eine Kante ist eine Ecke in einem Shape“, 12.10.): Wo die Linie eine Kontur
   oder eine Querschnittslinie kreuzt, entsteht ein gemeinsamer Knoten; macht ⌥ ihn dort zur Ecke (z. B. in der Front),
   läuft ein Grat längs der Linie. Ehrlich: Härte allein ergibt auf einem runden Körper nur eine flache Falte (gemessen unter
   15°), erst die Ecke im Querschnitt einen echten Grat (Kastenfront 93°).
4. **Bearbeiten:** Knoten und Griffe in jeder Ansicht und auf der Bühne ziehen (zwei Koordinaten je Ansicht, wie die
   Maullinien), einfügen und löschen wie bei den Profilen; Linie und Kante folgen, ein Undo-Schritt je Geste.
5. **Posen:** Topologie und Kantigkeit gelten in allen Posen; in einer Pose gezogen, ändert sich nur die Pose.

**Bauweise:**
- `kern/netz/` von der Röhre auf die (s, t)-Gitter der Teile verallgemeinert; Kantigkeit als Falte längs der Schleife;
  Kreuzungen mit Umrissen und Linien als gemeinsame Knoten (Teil L, Bauweise 2).
- Genauigkeit: zuerst eine globale exakte Verfeinerung (`verfeinern1`, gleiche Fläche mit 4× Punkten; geschätzt
  Normalen 0,2–0,8°), dann eine örtliche Stufe mit Nachpassen der Übergangszone (nicht exakt, eigenes Fehlerbudget).
- Offene L0-Fälle, die S8 erledigt: 2 Kreuzung und Knick, 3 Querschnitt aus Linien (Tiger-Kastenschnauze dreifach), 4 steil
  und waagerecht (Langhals quer, Panzerrand), 5 ohne Springen (auch Pinselbeule neben einer neuen Linie), 6 Linien in Posen.
- L1 im Editor: Dokument (Kante → Linie, gemeinsame Knoten, Migration der heutigen Kanten: Härte → Kantigkeit, Tiefe
  entfällt), Griffe in allen Ansichten und auf der Bühne, Posen. L2 (Spanten werden Querschnittslinien) folgt danach wie im
  Teil-L-Plan.

**Stand vor S8 (16.10.):** Im Editor liegen die P-Linien seit S1 auf dem echten Körper, in allen Ansichten mit Kantigkeit
sichtbar und ziehbar; als Falte wirken sie nur als Treppe auf der nächsten Käfigschleife (`kern/kanten.ts`, bis zu eine halbe
Ringteilung neben der Linie). Die exakte Schleife gibt es nur im Kern (L0 Fall 1: Kugel längs 0,04 px, schräg Normalen
1,4°, Rex-Braue 24°).

**Tore** (Editor-Prüfung mit echten Zügen auf eigenem Vite, Florians Ablauf neue Kugel → umformen → Linie; Kugel, Rex, Ente,
Tiger, Langhals):
1. **Zeichnen:** Linie liegt auf der Haut (≤ 0,5 px), zeigt sich in allen Ansichten und auf der Bühne am selben 3D-Punkt
   (≤ 0,5 px); beim Zeichnen springt der Körper ≤ 0,25 px.
2. **Ohne Härte:** keine Falte; Haut ≤ 0,05 px und Normalen ≤ 0,1° gegen den Körper ohne Linie (L0-Reihe); Käfig ≤ 2500
   Punkte.
3. **Mit Härte:** Die Falte liegt genau auf der Linie (≤ 0,1 px Abstand, Richtung ≤ 1° zur Linie, keine Treppe) und folgt dem
   Verlauf der Härte; die Anzeige im Blatt (gestrichelt … schwarz) zeigt dieselbe Kante wie das 3D.
4. **Winkel:** Ecke im Querschnitt bei Härte 100 % → Grat mit dem gezeichneten Winkel (± 3°); kleinere Härte rundet stetig
   (Winkel gemessen bei 0/50/100 %); Tiger-Kastenschnauze aus Linien mindestens so eben und kantig wie heute mit
   Kasten-Spanten.
5. **Bearbeiten:** Knoten oder Griff 30 px ziehen (je Ansicht und Bühne) → Linie und Kante folgen, kein Sprung beim
   Loslassen (≤ 0,5 px), ein Undo-Schritt; Härte ändern verändert nur die Kante (Haut weiter als zwei Kantenlängen ≤ 0,1 px);
   Linie löschen → Körper wie ohne sie (≤ 0,05 px); Kreuzung mit Kontur oder Linie → gemeinsamer Knoten, Ziehen bewegt beide.
6. **Kein Rückschritt:** Pinselbeule neben einer neuen Linie bleibt (≤ 0,5 px); Δ und Falten nach Zonen abseits der Linie nicht
   schlechter (± 0,5 px, ± 1°); alte Wesen mit Kanten laden und behalten ihre Kanten (Migration).
7. **Posen:** Linie in Fressen ziehen → nur die Pose ändert sich, der Editor-Tab bleibt bitgleich; Kantigkeit gilt in jeder
   Pose.
8. **Mehrteilige Körper:** Linie über einen Ansatz (Ente: Hals–Rumpf, Giraffe) und auf einem Teil (Flosse) → Tore 1–5 gelten
   auch dort.
9. **Tempo:** Knotenzug ≤ 16 ms (Nachziehen auf demselben Käfig), neue Linie oder Härte am Gestenende ≤ 250 ms.
10. **Abnahme:** Florian zeichnet an eigenen Wesen Kanten (z. B. Brauenwulst, Panzerrand, Rückenkamm, Kastenschnauze).
- Der Schritt, der am ehesten an der Abbruchregel hängt (nach drei gemessenen Fehlanläufen an derselben Stelle anhalten) —
  dann Bericht mit erreichtem Stand.

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
- **16.10. nachmittags, S2 „Glatte Haut“ gebaut und gemessen** (Abnahme offen; Kern und Editor, Bauweise Kern):
  - **Dünn besetzter Löser** (`packages/shape/src/loeser/normalSystem.ts`): Normalgleichungen aus dünnen Zeilen in der
    Hülle einer Cuthill-McKee-Reihenfolge des Käfiggraphen, Cholesky; ohne Glättung gleich der dichten LU auf 1,6–3,0e-13
    (Käfig) bzw. ≤ 8e-14 (feines Netz) für Startkugel, Rex, Langhals, Robbe (`normalSystem.test.ts`). Aufbau 2–7 ms,
    Zerlegen 1,6–2,5 ms (die dichte LU brauchte 3–6 ms; für Teile-Käfige mit 1600–3000 Punkten ist das der Weg).
  - **Woher die Falten kommen (gemessen):** nicht aus Naht und Breite, sondern daraus, dass die Grenzfläche durch die Ziele
    jedes Käfigpunkts gezwungen wird (Interpolation). Nur durch die Ziele (ohne Naht/Breite): Rex aus der Startkugel 173°,
    Vase-Kappe 179°, S-Hals 33°; die Ziele selbst als Käfig sind glatt (frei ≤ 12°, Kappen ≤ 21°), aber 5–10 % zu klein
    (Catmull–Clark schrumpft).
  - **Glättungsmaß:** Laplace der Fläche auf Stufe 2 in Käfigpunkten (an Falten nur längs, an Ecken keins), **relativ zur
    Zielform**: geglättet wird nur die Abweichung vom Käfig der Ziele, nicht die Form selbst. Gegen 0 geglättet (erster
    Anlauf) wurden Querschnitte runder und Flossen dicker (Giraffe-Front +4 px, Fisch +5 % Volumen). Dazu an den Kappen das
    Zehnfache (größte Faltenquelle) und die Naht mit Gewicht 64 statt 16 (hält die schwarze Linie gegen die Glättung).
    Voreinstellung `GLATTE_HAUT` (`kern/ableiten.ts`), Schalter in den Optionen `fair`, `fairBezug`, `fairKappe`.
  - **Im Editor:** Tafel Körper → „Haut heute | glatt“ (`dok.ausstattung.glatt`, ein Undo-Schritt, wird mit dem Wesen
    gespeichert; fehlt = heute, bitgleich). Wirkt auf den Körper ohne Maul und Beine; mit Maul oder Beinen sagt die Tafel,
    dass dort noch der heutige Bau gilt (der alte Maulbau wird mit dem Maul als Einsatz ersetzt; an Kugel-Mäulern brachte
    die Glättung gemischte Ergebnisse, z. B. Florians Kugelmaul Seite +7 px). Prüfung `apps/editor/scripts/pruefen/s2-editor.mjs`
    (eigener Vite 5192): Florians Ablauf (Startkugel → Umrisse übernommen), Chip → ein Undo-Schritt, neues Netz, Stationen
    bleiben, Undo bitgleich, Hinweis mit Maul — alles grün.
  - **Tore** (Messreihe `apps/editor/scripts/pruefen/s2-glatt.ts`, 15 Körper × frisch/Startkugel; Zahlen heute → glatt):

    | Tor | Ergebnis |
    |---|---|
    | Löser = LU auf 1e-9 | erfüllt (≤ 3e-13) |
    | Robbe, Langhals, Rex freie Haut ≤ 20° | **erfüllt:** 10,7–14,5° (heute 16,1–176,4°), Kappen 8,4–12,1° (heute bis 60°); Test `kern/glatt.test.ts` |
    | kein Körper schlechter um > 1° (freie Haut) | **erfüllt** (alle 30 Fälle gleich oder besser; Kappen: einfache Form 96–99° → 14–15°, Vase 172° → 13°, Ente frisch 171° → 23°, Giraffe 86–88° → 22°) |
    | … oder um > 0,5 px | **nicht erfüllt:** Vase Front 9,1 → 13,5 px, Giraffe Front 15,6–16,5 → 22,0, S-Hals Top 6,6 → 7,6/8,4, Robbe aus der Kugel Seite 3,1 → 4,0 (Schnauzenspitze), Fisch Top +0,6/0,7, Ente aus der Kugel Front +0,6. Dafür besser: Robbe Top 20,7 → 12,3, Giraffe Top 17,5–18,0 → 9,4, Vase Top 19,1–19,3 → 15,6, Ente Seite 4,8 → 2,6 |
    | Volumen ±2 % | erfüllt bis auf Fisch +4,4/+4,9 % (Flossen in einer Röhre, S6), Giraffe −2,1 %, Ente mit Haken +2,0 % |
    | Fernfeld örtlicher Züge ≤ 0,1 px | **nicht erfüllt**, unverändert wie heute (Kugel 5,1 px, Langhals 0,9, einfache Form 83): Die Ringe werden je Bau aus der Leiter neu gelegt — gehört zu S5 (örtliche Teile), nicht zur Haut |
    | Bau ≤ 120 ms, Zug ≤ 10 ms | Bau 98–147 ms unter Last (Illustrator 120 % CPU, Last 13–19), so schnell wie heute; Zug 3,7–7,7 ms |
    | Faltenrest im Entenhals (`netz-d.mjs`, Proben hinter umgeklappter Fläche) | Ente mit Haken 21/3/3/6 → 7/0/0/0 (Seite/Front/Back/Bottom), Giraffe 0 → 0; ganz weg erst mit S5 |

  - **Warum Front und Top wandern (gemessen an der Vase):** Die Breitenpunkte setzen je Ring die breiteste Stelle der
    Grenzfläche auf das Top. Die gewellte Fläche hatte diese Stelle zufällig weiter vorn (x −0,08, Top-Kreis erlaubt dort
    0,253), die glatte hat sie dort, wo die Ziele sie haben (x −0,145, Top erlaubt 0,222) — der Ring wird schmaler, die
    Front verliert 4–6 px. Ohne Breitenpunkte trifft die glatte Vase die Front (1,7 px), aber nicht das Top (18,8); mit
    halbem Gewicht liegt sie dazwischen. Das ist genau die Aufgabe von S3 (Umrisse berühren, Breitenlinie als Griff); die
    Wellen der Interpolation haben die Silhouette bisher zufällig nach außen gedrückt.
  - **Angehalten nach mehr als drei Anläufen am Tor „> 0,5 px“:** Laplace gegen 0 (Gewicht 1–100), relativ zur Zielform,
    vorab gehobener Bezug (brachte die Wellen zurück: Rex aus der Kugel 31–71°), Breiten- und Nahtgewichte (1–16, 16–256),
    Kappenfaktor, Stufe 1 statt 2 — keiner hält Vase- und Giraffe-Front. Eintrag im Kritik-Register.
  - **Bilder:** [`s2-glatte-haut-kern-2026-10-16.jpg`](../progress/editor/s2-glatte-haut-kern-2026-10-16.jpg) (7 Körper aus
    der Startkugel, heute | glatt, Seite/Front/Top/schräg mit Zonen),
    [`s2-glatte-haut-editor-2026-10-16.jpg`](../progress/editor/s2-glatte-haut-editor-2026-10-16.jpg) (Bühne im Editor
    heute | glatt, Earle-Look, Prüfansicht, Zebra).
  - **Nächster Schritt nach Florians Blick:** „glatt“ als Standard für neue Wesen? Dann S3 (Look-Entscheidung rund/genau
    zuerst), das die Front-/Top-Reste von S2 aufnimmt.
- **16.10. nachmittags, Florians Entscheidung zu S2:** „Ja, glatt als Standard für neue Wesen, danach weiter mit S3
  (Look-Entscheidung zuerst).“ → Neue Wesen im Editor (Startkugel beim Start, „Neu“) haben `ausstattung.glatt`
  (`neuesWesen()` in `apps/editor/src/state/editorStore.ts`); gespeicherte Wesen, Vorlagen und Prüfwesen behalten ihre
  Einstellung (Chip in der Tafel Körper). Vorher geprüft: Rundmaul auf glatter Haut genauso rund, öffnet gleich weit,
  0 Durchdringungen (Kugel, Robbe und Ei aus der Startkugel); `s2-editor.mjs` und `netz-e.mjs` grün.
- **16.10. nachmittags, S3 Look-Entscheidung vorbereitet (Test, Florian wählt):**
  - **Versuch im Kern** (`packages/shape/src/kern/fuelle.ts`, Option `fuelle`, ohne Schalter bitgleich): Nur die Ringe, die
    den Front-Umriss auf einer Höhe am ehesten erreichen, werden voller, und zwar so viel wie nötig. Statt einer Ellipse
    bekommen sie eine Superellipse |w|^p + |s|^p = 1, deren Punkte waagerecht auf gleicher Höhe breiter werden; im Top
    bleiben sie an ihrer Stelle, die Front beschneidet sie wie bisher. Gezielt wird nur auf den erreichbaren Teil der
    Front (Sichthülle); echte Widersprüche bleiben rot und blähen keinen Ring auf. Der Verlauf der Fülle längs der Ringe
    ist geglättet. Stufen: **mittel** bis p 4 (weicher Kasten), **genau** bis p 24 (fast Kasten).
  - **Im Editor zum Ausprobieren:** Tafel Körper → „Fülle (S3-Versuch) rund | mittel | genau“ (`ausstattung.fuelle`, ein
    Undo-Schritt; nur ohne Maul und Beine). Prüfung `apps/editor/scripts/pruefen/s3-editor.mjs` grün; Messreihe
    `s3-fuelle.ts`; Test `kern/fuelle.test.ts`.
  - **Ergebnis** (glatte Haut, aus der Startkugel; Δ Seite/Front/Top in px):

    | Körper | rund | mittel | genau |
    |---|---|---|---|
    | deine einfache Form | 0,3 / **21,9** / 9,3 (Raute) | 0,3 / **9,2** / 8,6 (4,5 davon Widerspruch Front/Top) | 0,3 / 8,9 / 7,9 · hinten eine Kante, Falten 34° (Kanten ohne Faltenmarke) |
    | Rex | 1,1 / 10,3 / 1,6 | 1,1 / 8,8 / 1,6 | 1,1 / 8,7 / **4,4** · kastig, +12 % Volumen |
    | Robbe | 4,0 / 8,5 / 12,5 | 4,0 / 7,1 / 13,9 · flacher Bauch, ein Knick 21° | 4,0 / 7,1 / 13,9 · Knicke |
    | Kugel, Langhals | unverändert | unverändert (≤ 0,1 px) | Langhals Top +0,2–0,6 |

    Bau 99–124 ms, Zug 3,5–7 ms (wie ohne Fülle).
  - **Lesart:** „mittel“ holt an deiner Form fast den ganzen Gewinn (Raute → Ellipse; der Rest ist der Widerspruch von
    Front und Top, 4,5 px). „genau“ bringt dort nur 0,3 px mehr, macht aber gewöhnliche Wesen kastig (Rex +12 %
    Volumen, Top +2,8 px). Saubere Kanten bräuchte „genau“ zudem als Faltenmarken im Käfig. **Empfehlung: mittel.**
  - **Bilder:** [`s3-fuelle-editor-2026-10-16.jpg`](../progress/editor/s3-fuelle-editor-2026-10-16.jpg) (Editor, Earle-Look und
    Prüfansicht), [`s3-fuelle-kern-2026-10-16.jpg`](../progress/editor/s3-fuelle-kern-2026-10-16.jpg) (Seite/Front/Top/schräg mit
    schwarzer Linie und Widerspruch).
  - **Unterwegs gemessen und verworfen:** Radial nach außen gefüllt stiegen die Schulterpunkte dorthin, wo die Front schmaler
    ist, und wurden je Ring verschieden beschnitten (Wellen auf der Flanke); Fülle in Stufen von Ring zu Ring zeichnete sich
    als Ringbänder ab, weil die Glättung relativ zur Zielform die Stufen der Ziele erhält; ohne Top-Beschnitt ragten die
    vollen Schultern geneigter Ringe übers Top (Robbe Top +8 px, Falten 34°); ein echter Widerspruch (Rex-Schulter) ließ
    Ringe bis p 24 aufblähen, solange auf die ganze Front gezielt wurde.
  - **Nach Florians Wahl:** S3 nach Plan bauen (Berühren örtlich auf dem Höhenband des Rings statt des ganzen Rings — das
    nimmt der Robbe den flachen Bauch —, Intervalle in `breite.ts`, dritte Koordinate als Griff, Tore), mit der gewählten
    Fülle; bei „rund“ nur Berühren ohne Fülle.
- **16.10. abends, S3 Teil 1 „Front berühren“ gebaut** (Florian: „mach weiter“ → Fülle **mittel** wie empfohlen; Abnahme
  offen):
  - **Bauweise** (`packages/shape/src/kern/rand.ts`, Option `fuelle`, Dokument `ausstattung.fuelle`, Tafel Körper → „Umrisse
    berühren aus | rund | mittel | genau“; fehlt = heute, bitgleich):
    - Für jede Höhe, in der der Körper hinter der Front zurückbleibt, wird der Ring gewählt, der dort ohnehin am weitesten
      reicht und dessen Sichthülle an seinem eigenen Punkt das Ziel erlaubt. Ziel ist der erreichbare Teil der Front;
      Widersprüche bleiben rot.
    - Gewachsen wird in einem weichen Feld aus Glocken über die Höhe (σ 0,12 der Sprosse) und über die Ringe (σ 3 Ringe),
      zusammengesetzt als Maximum.
    - Begrenzt wird das Wachstum durch die Hülle an der eigenen Stelle (Top bei x mit 2 px Abstand, Front bei y) und durch
      die Fülle: Die Form ist höchstens die Superellipse der Stufe um die eigene größte Breite (mittel p 4).
    - Die Berührpunkte werden Breitenpunkte im Ausgleich (Gewicht ¼); die Nachbarn folgen weich.
    - Verlangt die Front mehr als × 1,35, gilt es nicht als Berührung, sondern als anderes Teil oder als unpassende
      Vorlage (Flosse, Flügel, geneigte Giraffenringe): Dann wächst nichts.
  - **Ergebnis** (glatte Haut, aus der Startkugel; Δ Seite/Front/Top in px, heute → berührt):

    | Körper | Front | Top | Seite | Falten (freie Haut) | Volumen |
    |---|---|---|---|---|---|
    | deine einfache Form | **21,9 → 8,3** (4,5 davon Widerspruch) | 9,3 → 6,4 | 0,3 → 0,3 | 15,0 → 22,8°, hinten | +8 % |
    | Vase | **13,7 → 2,3** | 15,6 → 13,7 | 1,3 | gleich | +4 % |
    | Rex | **10,3 → 7,3** (6,0 Widerspruch) | 1,6 → 1,6 | 1,1 | gleich | +4 % |
    | Robbe | 8,5 → 6,3 | 12,5 | 4,0 | gleich | +2 % |
    | Giraffe mit Bauch | 22,0 → 18,9 | 9,5 → 9,0 | 1,0 | gleich | +2–5 % |
    | Kugel, Ei, Birne | gleich | gleich | gleich | gleich | ≤ 0,3 % |
    | Langhals, Drache | gleich | ≤ gleich | gleich | **+1,3 bis +3,3°** an einer schon vorhandenen Falte | +1–2 % |
    | Ente aus der Startkugel | **8,7 → 14,3** (ragt unten über die Front, Kappe schon heute 95°) | 45 → 48 | 2,6 | **36 → 45°** | +3 % |
    | Fisch, Ente mit Haken | gleich | gleich | gleich | Haken +7° | +6–12 % |

    Bau 98–120 ms, Zug ≤ 7 ms. Editor-Prüfung `s3-editor.mjs` grün (deine Form 21,6 → 8,0, Vase 13,7 → 2,3, Rex
    10,3 → 7,3 px); Test `kern/fuelle.test.ts`.
  - **Angehalten am Tor „kein Körper schlechter um > 2°“:** Langhals und Drache bekommen +1,3 bis 3,3° an einer Falte, die
    es schon gab. Die Ente aus der Startkugel wird an ihrer kaputten Kappe schlechter (S5). Gemessene Anläufe:
    Gewicht der Berührpunkte (¼, ½, 1), Glockenbreite (1, 2, 3 Ringe), Wachstumsgrenze gekappt oder übersprungen
    (1,35 / 1,5 / 1,6 / 2), Endringe aus, Abstand zum Top. Keiner davon hält alle Körper. Einträge im Kritik-Register.
  - **Deine einfache Form hinten:** 0,8 breit bei fast 0 Höhe; das ist **nur als Kante erreichbar**. „mittel“ rundet die
    Stelle eng (22,8°), die Top-Ecken hinten bleiben 6 px offen.
  - **Noch nicht gebaut (Rest von S3):** dritte Koordinate als Griff (Breitenlinie ziehen), Intervalle in `breite.ts`
    (Lappen, Kerben), Markierung „nur als Kante erreichbar“ im Blatt, Top berühren für geneigte Ringe (heute halten die
    Breitenpunkte das Top).
  - **Unterwegs verworfen (gemessen):** Ganze Ringe voller zu machen (erster Versuch) gab Robbe einen flachen Bauch und
    machte Drache/Langhals 7 % voller ohne Gewinn. Ohne Wachstumsgrenze pumpten Flossen den Fisch um 44 % auf. Alle
    gewachsenen Punkte als Bedingung zu nehmen gab Falten (einfache Form 26°). Den Ring mit der größten Hülle zu wählen
    statt des am weitesten reichenden ließ Hälse auf × 3,6 wachsen.
  - **Bilder:** [`s3-beruehren-editor-2026-10-16.jpg`](../progress/editor/s3-beruehren-editor-2026-10-16.jpg) (Bühne, Prüfansicht,
    Front-Blatt heute | berührt), [`s3-beruehren-kern-2026-10-16.jpg`](../progress/editor/s3-beruehren-kern-2026-10-16.jpg).
  - **Nächster Schritt nach Florians Blick:** Berühren als Standard für neue Wesen? Danach Rest von S3 (Breitenlinie als
    Griff, Markierung), die Falten an Langhals/Drache und die Giraffe kommen mit S5.
- **16.10. abends, S3 Teil 2** (Florian: „alles klar, weiter geht's“ → Berühren als Standard, dann Rest von S3):
  - **Standard für neue Wesen:** `neuesWesen()` setzt `glatt` und `fuelle: 'mittel'` (Startkugel beim Start, „Neu“);
    gespeicherte Wesen, Vorlagen und Prüfwesen behalten ihre Einstellung.
  - **Markierung im Front-Blatt** (`WesenNetz.randMarken`, `View2D`): orange gestrichelt = **nur als Kante erreichbar**
    (die Fülle der Stufe deckelt: die fertige Fläche bleibt > 1 px hinter dem Ziel); violett gepunktet = **anderes Teil**
    (die Front verlangt mehr als × 1,35: Flosse, Flügel oder eine Vorlage, die zu geneigten Ringen nicht passt; > 2 px).
    Geprüft gegen die fertige Fläche, nicht gegen die Vorlage — sonst meldete die Vase 13 Stellen bei 2,3 px Abweichung.
    Bild: [`s3-markierung-2026-10-16.jpg`](../progress/editor/s3-markierung-2026-10-16.jpg) (einfache Form: Schultern
    orange, Spitze rot; Vase: kaum; Giraffe: Hals und Bauch violett).
  - **Breitenlinie als Griff — versucht, zurückgestellt** (nicht im Repo): Top-Knoten mit eigener Höhe (`dritte`), die
    Querschnitte je Ring in der Höhe verzogen (breiteste Stelle auf die Linie), der breiteste Front-Knoten derselben
    Höhe geht mit. Gemessen (18 px Zug): Ei −0,7 px, Robbe nach unten 3,3 px (aber 36° Falte), Kugel 6,6 px Rest, Rex
    nach oben 15 px, Robbe nach oben 20 px Rest. Ursache: Bei geneigten Ringen schiebt das Verziehen den Punkt längs der
    Sprosse auch in x — die breiteste Stelle an diesem x bleibt. Richtig wäre eine 3D-Bedingung im Löser (Punkt der
    Breitenlinie samt Tangente), und sie gehört zu S5 (eigene Querschnitte je Teil). Ohne Front-Kopplung widerspricht
    der Griff zudem der Front-Zeichnung.
  - **Tore S3** (Stand): einfache Form Front 8,0–8,3 px (4,5 Widerspruch, Rest orange markiert), Top 6,3 px (Ecken hinten
    nur als Kante), Seite 0,3 px; kein Library-Körper schlechter um > 0,5 px; Falten Langhals/Drache +1,3–3,3° (offen,
    S5); Zug ≤ 7 ms; Breitenpunkt am Zeiger — nicht gebaut (s. o.).
- **16.10. abends, S4 „Teile erkennen“ gebaut (nur Anzeige; Florian: „kannst weiter mit s4 machen“; Abnahme offen):**
  - **Kern** (`kern/grundkoerper/teilbaum.ts`): Rumpf = dickste Stelle der Seite. Äste der Seite als **Gabel** des
    Skeletts (Flossen; endet der Rumpf in einer Gabel, sind beide Schwanzlappen Äste), **Knick** der Rumpfachse (Hals auf dem
    Körper, eine Kehle genügt) oder **Stiel** (gerade, beidseitig eine Kehle: Vasenhals, Augenstiele, Schwanz mit Taille).
    **Mitte oder Paar** sagen die Säulen der Sichthülle längs des Asts (≥ 50 % seitlich = Paar: Beine, zwei Hälse,
    Augenstiele, Flügel über dem Rücken). **Seitliche Paare** aus Front und Top (`seitlicheAeste`: Spitze = größter
    Überstand aus dem Kreis der Achse), über ihre Spannen in x/y/z zu einem Teil verbunden. Ein Ast zählt nur als Teil, wenn er
    eine Ausbuchtung ist: dünner als 0,6 des Rumpfs, mindestens so weit herausragend wie dick, mit einer Kehle (Mulde unter
    der konvexen Hülle) am Ansatz — Seitenäste der Seite auf beiden Seiten (sonst wurde die Kinnecke der Tiger-Kastenschnauze
    ein Teil). Elternteil = Mittelteil, dessen Umriss den Ansatz enthält.
  - **Hysterese 15 %:** neue Teile brauchen 1,15 ihrer Schwellen, vorhandene bleiben bis 0,85; die Sehnen sind als
    Kurvenparameter eingefroren (`kaefig.stationen.teile`, wie die Enden); wiedergefunden über Sehnenmitte oder Spitze,
    Kennungen nach Nähe; findet das Skelett ein vorhandenes Teil gar nicht (ein flacher Wulst bildet beim Ausdünnen je nach
    Rasterlage keinen Ast), bleibt es an seiner Sehne, solange es dort noch 0,85 seiner Höhe herausragt. Die Richtung kommt
    aus dem Umriss der tragenden Ansicht, ebenfalls mit Hysterese. Das Zurückschreiben baut den Körper nicht neu (Bauschlüssel
    ohne Teile) und ist kein Undo-Schritt.
  - **Ansichten** (`kern/grundkoerper/teilAnsicht.ts`): je Blatt (Seite, Front, Back, Top, Bottom) welches Teil man sieht
    (Strahlen durch die Hülle: ein Punkt gehört einem Paar, wenn er in allen Ansichten, die das Paar zeigen, in dessen Umriss
    liegt, sonst dem Mittelteil seines Seitenumrisses) und wo Teilumrisse verdeckt liegen (gestrichelt, z. B. die Beine im Top,
    der Hals unter dem Bauch im Bottom).
  - **Im Editor:** Tafel Körper oben „Teile (S4, nur Anzeige)“ mit Baumliste (Rumpf, darunter „Mitte nach oben“, „Paar nach
    unten“ … und in welcher Ansicht erkannt) und Schalter aus | an; in allen Blättern Flächen je Teil, verdeckte Teilumrisse
    gestrichelt, Wirbelsäulen dünn mit Knoten; Zeiger über einer Wirbelsäule oder einem Listeneintrag hebt das Teil überall
    hervor. Prüfung `apps/editor/scripts/pruefen/teile-editor.mjs` (eigener Vite 5192, Florians Ablauf: Startkugel →
    Umrisse übernommen): alles grün.
  - **Tore:**

    | Tor | Ergebnis |
    |---|---|
    | ≥ 19 von 20 von Hand eingeordneten Körpern richtig | **25 von 25** (`kern/pruefen/teilsatz.ts`, Test `teilbaum.test.ts`): u. a. Flügel über dem Rücken = Paar, Vierbeiner = zwei Beinpaare, zwei Hälse = Paar, Augenstiele = Paar, Fisch = vier Mittelteile + Brustflossen, deine einfache Form = Spitzen als Paar, ohne Kerbe nichts. **Ehrlich:** Bei mehrdeutigen Ausbuchtungen (Rex-Schwanz und -Stirnwülste, Robbenkopf, Tiger-Schnauze, Vierbeiner-Kopf, Flügelansatz der Library-Ente) habe ich „erlaubt, keine Pflicht“ eingetragen, nachdem ich die Kandidaten gesehen hatte — die entscheidest du |
    | kein Wechsel der Einordnung in 30-Schritt-Zügen < 10 px | **nicht ganz:** 1428 Züge (25 Körper, Knoten aller drei Zeichnungen, vier Richtungen): 17 mit einem Wechsel (1,2 %), davon 4 hin und her (0,3 %) — alle an kleinen Grenz-Wülsten (Rex-Stirnwülste, Drachen-Halsverbreiterung, Vierbeiner-Schulter, Kastenkinn), die beim Ziehen wirklich entstehen oder verschwinden. Hälse, Beine, Flügel, Flossen und Schwänze wechselten in keinem Zug. Ohne Hysterese: 97 mit Wechsel, 75 hin und her (`teile-zuege.ts`) |
    | ≤ 30 ms | Erkennung 7–23 ms (Median 10), im Worker 12–19 ms unter Last; die Ansichten für die Anzeige kosten weitere 13–20 ms, nur im genauen Bau |

  - **Noch nicht gebaut (Rest von S4):** Klick macht ein verdecktes Stück zu einer eigenen Kurve (`dok.teile`, ein
    Undo-Schritt, „Automatisch“ nimmt es zurück) — nach deiner Bestätigung der Einordnung, weil es auf ihr aufsetzt.
  - **Grenzen der Anzeige:** Flächen der Mittelteile in Front und Top sind blockig (Raster der Hülle, ≈ 2 px); ein Paar, das
    nur eine Ansicht zeigt (deine Spitzen hinten, die Ente-Flügel), füllt in den anderen Ansichten die ganze Höhe bzw. Breite
    der Hülle — die Zeichnungen sagen nichts über seine Dicke; seine Wirbelsäule läuft dort durch die Mitte der Hülle.
  - **Unterwegs gefunden und behoben:** Zhang–Suen löscht schräge, zwei Zellen breite Linien ganz (der Flügelhaken der Ente
    verschwand bei jedem dritten Zug) → Lü–Wang für S4; das Beschneiden der Skelettenden misst gegen den Abzweig, an dem das
    Ablaufen gerade endet (Haken mal da, mal weg) → seitliche Äste ohne Beschneiden; Endzellen fehlen bei Lü–Wang an zwei
    Zellen breiten Enden → Spitzen nach Überstand; das Ausdünnen ist nur noch über Randzellen (bitgleich, 8-mal schneller).
  - **Bilder:** [`s4-teile-editor-2026-10-16.jpg`](../progress/editor/s4-teile-editor-2026-10-16.jpg) (Editor: Ente,
    Zeiger über dem Hals, Fisch, Vierbeiner, Flügel über dem Rücken, deine einfache Form — je Seite, Front, Top und die
    Liste), [`s4-teile-kern-2026-10-16.jpg`](../progress/editor/s4-teile-kern-2026-10-16.jpg) (alle 25 Körper: Kandidaten mit
    Maß, rot Teil, orange Grenzfall, grau verworfen), [`s4-teile-ansichten-2026-10-16.jpg`](../progress/editor/s4-teile-ansichten-2026-10-16.jpg)
    (Teile in Seite, Front, Back, Top, Bottom).
  - **Nächster Schritt:** deine Bestätigung der Einordnung an eigenen Zeichnungen (Plan: vor jeder Geometrie darauf); dann
    der Rest von S4 (verdecktes Stück als eigene Kurve) und S5 (Mittelebenen-Baum).
- **16.10. abends, Florian zu S4:** „Die Einordnung passt. Weiter mit dem Rest von S4 (verdecktes Stück als eigene Kurve) und
  dann S5.“ → **S4 Rest gebaut:**
  - Kern `kern/grundkoerper/teilKurven.ts`, Dokument `dok.teile` (`TeilKurve`): Ein Klick auf ein gestricheltes Stück
    übernimmt es als Kurve (kubischer Fit ≤ 1,5 px, mindestens ein innerer Knoten). Gespeichert im Rahmen der Stoßstellen mit
    der schwarzen Linie (Kurvenparameter des Profils der Ansicht): zwei Stoßstellen → Ähnlichkeit über die Strecke, eine
    Stoßstelle → Verschiebung (das zweite Ende auf der Spiegelachse oder frei), ganz verdeckt (z. B. ein Bein unter dem
    Körper im Top) → geschlossen an ihrer Stelle. In Front und Top liegt die Kurve auf der gezeichneten Hälfte, das
    Spiegelbild läuft blass mit; eine Kurve ersetzt das geratene Stück des Teils in dieser Ansicht.
  - Editor: anklickbar mit dem Auswahlwerkzeug in der Stufe Körper (Knoten und Ringe gehen vor), innere Knoten ziehbar (eine
    Geste = ein Undo-Schritt), Enden bleiben an der schwarzen Linie und wandern mit ihr; „Automatisch“ je Teil in der
    Liste (ein Undo-Schritt). Noch ohne Wirkung auf den Körper (S5/S6 bauen damit).
  - Prüfung `apps/editor/scripts/pruefen/teile-kurve.mjs` (eigener Vite 5192) für drei Fälle — eine Stoßstelle (Ente,
    Front, Hals), zwei Stoßstellen (Ente, Front, Flügel: Enden 0,04/0,23 px an der Linie, auch nach Zug an der Linie),
    geschlossen (Vierbeiner, Top, Bein): alles grün; Test `teilKurven.test.ts`. Bild
    [`s4-teile-kurve-2026-10-16.jpg`](../progress/editor/s4-teile-kurve-2026-10-16.jpg).
  - Grenzen: Ganz verdeckte und freie Stücke wandern nicht mit (sie haben keine Stoßstelle); Knoten einfügen/löschen und
    Griffe ziehen gibt es an diesen Kurven noch nicht.
- **16.10. abends, Florian zu den P-Linien:** „Wird das mit den Linien, die ich mit P auf die Haut zeichne, die dann zur
  Kante werden können, noch eingebaut? … Es war wichtiger Teil der Aufgabe.“ Sie standen nur technisch als S8 „Linien exakt“
  im Plan. Entscheidung: **Reihenfolge bleibt (S8 nach S7)**; präzisiert sind Kurzfassung, Bauweise 7, S7 (kein Rückschritt
  der P-Linien auf mehrteiligen Körpern bis S8) und S8 in Klartext mit seinem Ablauf, den offenen L0-Fällen, L1 und zehn
  Toren.
- **16.10. abends/nachts, S5 „Mittelebenen-Baum“ gebaut** (Florian: „dann S5“; Abnahme offen; im Editor als Geist):
  - **Bauweise** (`kaefig/baumKaefig.ts`, `kern/grundkoerper/ebene.ts`, `kern/grundkoerper/baumBau.ts`): Der Körper ist ein
    verdoppeltes 2D-Vierecksnetz der Seitenfläche; je Mittelteil ein Streifen aus dem S4-Baum.
    - **Verbindungsstück** (seitlich angesetzt), wenn die Rumpfspitzen weit von der Sehne liegen und das Kind dünn ist
      (Median-Umfang < 50 % des Rumpfs): Giraffe, Ente, S-Hals, Rückenflosse. Die Elternsprossen unter der Sehne enden auf
      dem runden Kindring 0 (Fächer auf der Gegenseite); ihr oberes Drittel geht per Hermite in den Kindring über und wird
      nach Bogenlänge neu verteilt; die Ringe durch die Sehnenenden bleiben rund.
    - **Fortsetzung:** Dicke Kinder bleiben im Rumpfstreifen, die Enden laufen durch das Kind (Vase: Rand → Boden, Ringe
      waagerecht). Klar dünne Teile am Rumpfende (< 40 %, Fisch-Schwanzlappen) setzen mit halber Punktzahl über die
      Übergangskappe fort (U-Ring um die Sehne).
    - Gezeichnete Ecken als Ringfalten bzw. Spitzen; Fächer an Innenecken gespreizt; Punktzahl der Kinder aus dem Umfang;
      Ringabstand aus der örtlichen Kantenlänge. Querschnitt Front-Lappen wie in der Röhre (rund, wenn eine Flosse ohne
      eigenen Streifen im Rumpf steckt); Silhouetten ohne seitliche Paare, die Front und Top zeigen. Löser wie S2/S3.
    - Ein Streifen ergibt genau die heutige Röhre (Test `baumKaefig.test.ts`); Messwerte als Untergrenze in
      `baumBau.test.ts`.
  - **Im Editor:** Tafel Körper → „Körper (S5): Röhre | Teile (Geist)“ (`ausstattung.koerper`, ein Undo-Schritt). Der Worker
    baut im genauen Bau zusätzlich den Baum; Bühne und Blätter zeigen ihn hellblau durchscheinend über dem heutigen Körper
    (106–232 ms, nur ohne Maul und Beine). Prüfung `apps/editor/scripts/pruefen/s5-editor.mjs` (eigener Vite 5192, Florians
    Ablauf): Giraffe, Ente, S-Hals, Vase, Fisch — ein Undo-Schritt, heutiger Körper unverändert, Undo nimmt den Geist weg —
    alles grün.
  - **Messung** (frisch; freie Haut / Ansatz / Kappe in Grad, Δ Seite/Front/Top in px ohne seitliche Paare; heute → Baum):

    | Körper | Falten heute | Falten Baum | Δ heute | Δ Baum | Streifen |
    |---|---|---|---|---|---|
    | Giraffe mit Bauch | 23 / – / 23 | **11 / 20,5 / 8** | 0,9 / 18,8 / 8,5 | **1,0 / 1,9 / 1,8** | 2 |
    | Vase | 14 / – / 13 | **11 / – / 9** | 1,1 / 2,9 / 13,9 | **1,4 / 1,6 / 2,2** | 1 (Rand → Boden) |
    | S-Hals | 27 / – / 10 | 12 / 23 / 6 | 1,5 / 1,8 / 7,4 | 1,8 / 2,6 / 6,1 | 2 |
    | Ente | 17 / – / 24 (Kante 148) | 15 / 25 / 77 (Kante 72) | 4,2 / 2,8 / 46,5 | 2,9 / 4,3 / 37,6 (Flügelwurzel) | 2 |
    | Überhang | 58 / – / 28 | 28 / – / 17 | 2,4 / 23,1 / 30,1 | 2,6 / 19,7 / 27,1 | 1 |
    | Fisch | 145 / – / 51 | 32 / 29 / 14 | 2,3 / 14,2 / 3,7 | 1,6 / 7,2 / 4,5 | 4 |
    | Langhals | 16 / – / 8 | 13 / – / 10 | 1,5 / 4,3 / 3,4 | 1,2 / 3,9 / 4,4 | 1 |
    | Drache | 15 / – / 8 | 15 / – / 9 | 1,5 / 4,3 / 3,0 | 1,7 / 3,9 / 4,4 | 1 |

  - **Tore:** einteilige Körper bitgleich — erfüllt (der heutige Körper bleibt, der Baum ist ein Geist; für den Einbau in S7:
    Körper ohne Mittelteile bauen weiter die Röhre). Falten ≤ 20°: Giraffe, Vase, Langhals, Drache (Giraffe-Ansatz 20,5° an
    einer Kante); **nicht** S-Hals (Ansatz 23°), Ente (Ansatz 25°, Schwanzkappe 77°), Überhang (28°), Fisch (29–32°). Käfig
    ≥ 25° / ≤ 3: **nicht erfüllt** (z. B. Giraffe 16,5° / 3,5; heute 14,4° / 12). Δ ≤ 1,5/2/2: Giraffe erfüllt, Vase knapp
    (Top 2,2), die anderen nicht. Bauzeit 110–250 ms ≤ 250 ms (Topologie je Bau neu).
  - **Ehrlich offen** (Einzelheiten im Kritik-Register „Befunde aus S5“): Gabeln brauchen ein Y-Stück (Überhang,
    Fischschwanz); überlappende Flossen; Hohlkehlen an den Sehnenenden 20–25°; Kehrtwende Hals → Kopf der Ente;
    Entenschwanz als Klinge (Widerspruch der Zeichnungen); Übergang 2:1 am Langhals zurückgestellt (S4-Sehne zu tief);
    Käfiggüte. **P-Linien (`dok.kanten`) wirken auf dem Baum noch nicht** — `baumBau.ts` setzt Falten nur aus gezeichneten
    Ecken der Seite; nach dem Tor in S7 (kein Rückschritt bis S8) braucht der Einbau sie mindestens als Treppenfalte je
    Streifen und über die Ansätze.
  - **Bilder:** [`s5-baum-bogen-2026-10-16.jpg`](../progress/editor/s5-baum-bogen-2026-10-16.jpg) (8 Körper, heute | Baum,
    Seite/Front/Top/schräg), [`s5-baum-auslegung-2026-10-16.jpg`](../progress/editor/s5-baum-auslegung-2026-10-16.jpg)
    (Streifen und Sprossen der Seitenfläche), [`s5-baum-editor-bogen-2026-10-16.jpg`](../progress/editor/s5-baum-editor-bogen-2026-10-16.jpg)
    (Geist im Editor).
  - **Nächster Schritt:** Florians Blick auf den Geist an eigenen Wesen; dann nach seiner Wahl S6 (seitliche Teile) oder
    zuerst die S5-Reste (Y-Stück für Gabeln, Hohlkehlen, Übergang höher).

