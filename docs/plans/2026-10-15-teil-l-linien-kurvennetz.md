# Plan: Linien als Kurvennetz mit Konturen und Kanten (Teil L, 15.10.2026 nachts)

Teil L des Plans „Maul als Einsatz, Werkzeug-Harmonie und Posen“ ([`2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md)), von Florian am 15.10.2026 nachts freigegeben („ok, akzeptiert“).

## Kontext

Florian nach B5: Die Linien, die er mit P auf die Haut zeichnet, haben heute keine Funktion („dumm gestrichelt“). Seine Idee in drei Nachrichten:
1. Die Punkte einer Linie sind 3D-Griffe: in jeder Ansicht verschieben, das Netz geht mit. Kantigkeit je Punkt wie Edge Crease in Blender, der Knick entsteht aus dem Winkel, angezeigt über die Linie. In jeder Pose bearbeitbar. Tiger-Kastenschnauze, Rex-Augenwülste, Schildkrötenpanzer. Können Linien die Spanten ersetzen?
2. Die Linie hat eine eigene Topologie und liegt genau auf einer Linie im Netz, ohne Treppe; die Topologie kommt dynamisch dazu, ohne dass das Netz springt oder verrutscht.
3. (Rückmeldung zum ersten Planentwurf) Kein Regler für die Wirkbreite. **Kontur und Linie spielen zusammen:** Eine Linie kann an einer Kontur beginnen. Ein Spant entsteht aus Linien: in der Seite ein Punkt oben an der Kontur mit einem Punkt unten verbinden, im Top die beiden seitlichen Konturpunkte — von vorn ist das der Querschnitt durch die vier Punkte, den man wie bisher knickt (Kasten). Kreuzt eine Linie den Hauptquerschnitt, entsteht dort ein Punkt; in der Front liegt er genau, wo die Linie an die Kontur läuft, und dort lässt sich ein sauberer Knick setzen — auch bei schrägen und steilen Linien (Langhals). Ebenso Querschnitte, die man von oben oder unten kantig macht.

Im Planmodus wurde nur recherchiert und Code gelesen. **Die Tests sind Schritt L0 direkt nach der Freigabe, mit harten Kriterien; L1 und L2 gelten nur, wenn L0 besteht.** Eine kritische Gegenprüfung des ersten Entwurfs (Linien als Korrekturschicht mit Wirkbreite und eingesetztem Band) ist eingearbeitet; Florian hat diesen ersten Entwurf als zu kompliziert zurückgewiesen und das Kurvennetz beschrieben.

## Antwort: kein Denkfehler — ein Kurvennetz

- Das Prinzip ist bewährt: Netzflächen in CAD (Kurven als Rahmen, die Fläche spannt sich dazwischen), FiberMesh (SIGGRAPH 2007: gezeichnete Kurven bleiben als Griffe, glatte und scharfe Kurven; [Projektseite](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/fibermesh)), Biermann u. a. 2001 (scharfe Kanten auf Catmull-Clark, indem der Käfig auf die Kurve gelegt wird; [NYU](https://mrl.cs.nyu.edu/publications/sharpfeatures/)).
- **Es passt zu unserem Käfig:** Er ist schon ein Netz aus Ringen (Querschnitte, laufen der Wirbelsäule nach — am Langhals schräg) und Längsreihen. Eine Linie wird eine dieser Schleifen, genau auf die Linie gelegt: Querlinien werden Ringe, Längslinien Längsreihen, ein Rand ums Tier eine Längsschleife durch die Kappen. Kreuzungen sind Käfigpunkte. So gibt es keine Treppe, und die Kante liegt genau auf der Linie.
- **Der Plan „Wesen-Editor 2“ sah das schon vor** („eine Kantenschleife wird auf die Linie gelegt, Härte je Punkt“, „Schleifen einrasten statt Freischnitt“, „Ringe als Spanten, örtlich, exakt“); gebaut wurde nur eine erste Stufe (`kern/kanten.ts`: Treppe auf vorhandenen Kanten, formt nichts).
- **Kein Wirkbreiten-Regler:** Die Fläche zwischen Linien und Konturen ergibt sich wie heute zwischen zwei Spanten; wie weit ein Knotenzug wirkt, bestimmen die Nachbarlinien.
- **Spanten gehen in den Linien auf:** Ein Querschnitt ist eine geschlossene Linie durch die Konturpunkte (Florians Weg) oder direkt in der Front gezeichnet; von vorn bearbeitet und geknickt wie bisher ein Spant. Damit gilt auch, was Spanten heute können (flache Wände, Überblendung zum nächsten Querschnitt, Ecken genau auf einer Reihe), und was sie nicht können, geht jetzt: Querschnitte quer zum Hals, Querschnitte, die man von oben oder unten bearbeitet (Florians „vertikale Spanten“, z. B. ein Rand ums Tier), Längskanten.
- **Der Knick kommt aus dem Querschnitt:** Ecke am Kreuzungsknoten (in der Front, wie heute eine Spant-Ecke) → Falte längs der Linie durch diesen Punkt. Eine Schärfe allein macht auf einem runden Körper kaum einen Grat (gemessen: unter 15°), die Ecke im Querschnitt schon (Kastenfront 93°).
- **Grenzen, ehrlich:** Linien, die sich schließen, ohne einem Ring oder einer Längsreihe zu folgen (Kreis ums Auge, J-Haken), brauchen eine eingesetzte Schleife — das kommt mit dem Maul als Einsatz (Teil A). Florians Achter-Querschnitt (Bogen 08) teilt den Körper in zwei Teile; das gehört zu Teil G (Grundkörper für jede Form).

## Bauweise (Kern)

1. **Linie = Bézier wie Profile und Maullinien:** Knoten mit besitzender Ansicht (dort zwei Koordinaten, die dritte von der Haut, nächste Lösung zur vorigen Tiefe), Kantigkeit je Knoten, Art glatt/Ecke. Linien bleiben, wo gezeichnet (Entscheidung 6). Gespiegelt wie die Maullinien: eine Hälfte gespeichert, Knoten auf der Naht bei z = 0; Asymmetrie nur in Posen.
2. **Gemeinsame Knoten:** Linienenden an einer Kontur sind Knoten dieser Kontur (markiert wie die Maulanfänge). Kreuzt eine Linie eine Kontur oder eine andere Linie, wird an der Kreuzung in beide Kurven formneutral ein gemeinsamer Knoten eingefügt (de Casteljau; Front-Kreuzungen auch in alle Querschnitte, wie heute `spantenAngleichen`). Ziehen bewegt beide Kurven; wird die Linie gelöscht, verschwinden ihre unbewegten Kreuzungsknoten wieder.
3. **Topologie folgt dem Netz, ohne neue Punktnummern:** Jede Linie bekommt die nächste freie Schleife — eine Querlinie einen Ring (wie heute ein Spant seinen Reifen; Station und Sprossenrichtung aus der Linie, am Hals schräg), eine Längslinie eine Längsreihe j*. Die Schleife wird in der Ableitung genau auf die Linie gelegt: je Ring kommt der Punkt j* auf die Kreuzung mit der Linie, die Nachbarpunkte werden örtlich auf derselben Querschnittskurve umverteilt (nicht mit fester Punktzahl über/unter wie das alte Maul — dort klappten Bäuche zur Flosse). Hinter den Linienenden läuft die Reihe weich in ihre normale Lage zurück.
4. **Querschnitt je Ring:** Kurve durch die Knoten des Rings — Konturpunkte (oben/unten aus der Seite, seitlich aus dem Top), Kreuzungen mit Längslinien —, dazwischen wie heute aus Front und Querschnittslinien überblendet. Ecke + Härte am Kreuzungsknoten → Längsfalte auf j* (das bestehende `faltenSetzen`), längs der Linie mit ihrer Kantigkeit auslaufend.
5. **Damit nichts springt:**
   - Eine neu gezeichnete Linie liegt auf der Haut; das Umlegen der Schleife verschiebt die Haut höchstens 0,25 px.
   - Schleifenzuordnung eingefroren wie die Stationen (`kaefig.stationen`): Ein Zug verschiebt nur Lagen; neu zugeordnet wird nur am Gestenende mit Abstand zur Schwelle.
   - Neue Punktnummern gibt es nicht. Sind Linien dichter als eine Schleifenteilung, kommt am Gestenende eine Schleife hinzu (Loop-Cut), und Pinsel- und Pose-Daten werden über ihre Lage übertragen (wie der Übertrag aus der Umgebung in B2).
6. **Posen:** Linienknoten sind Griffe am posierten Körper (das B4/B5-Muster: Versatz gegen die natürliche Pose, Löser im Ruheraum); Topologie und Kantigkeit gelten in allen Posen (wie in Blender).
7. **Tempo:** Ein Knotenzug ist ein Nachziehen auf demselben Käfig (wie ein Profilzug heute); Neuzuordnung, Kantigkeit und neue Linien am Gestenende.
8. **Bezug:** Ersetzt den Abschnitt „Kanten“ im Entwurf zu Teil H (4.7). Das Maul wird später „Linie mit Schlitz“ desselben Netzes (Teil A); Linien enden bis dahin vor dem Maul (heute schneidet die Lippe jede Falte ab). Keine versteckten Schreibvorgänge mehr (`kantenAnFlaeche` legte Knoten still auf die alte Versuchsfläche S0).

## Bedienung (Editor)

- P zeichnet eine Linie (Start auch auf einer Kontur, dann gemeinsamer Knoten); Enter beendet. Knoten und Griffe in jeder Ansicht ziehen (zwei Koordinaten je Ansicht).
- Querschnitt: geschlossene Linie aus Konturpunkten (Seite oben→unten, Top links→rechts) oder in der Front gezeichnet; in Front/Back (bzw. Top/Bottom für waagerechte) bearbeiten wie bisher den Spant.
- Knick: ⌥ macht den Knoten zur Ecke (Illustrator), ⇧W stellt die Härte direkt an der Linie ein (gibt es schon); Anzeige längs der Linie wie heute (gestrichelt 1 px glatt bis schwarz 3 px scharf).
- Werkzeug S und die Reifen gehen im Linienwerkzeug auf (L2). In einer Pose schreiben dieselben Griffe die Pose.

## Schritte und Zeitpunkt

**L0 Beweis (direkt nach der Freigabe, vor B6):** Kernmodul und Kern-Tests, Bilderskript, dann Halt für Florian. Fälle und harte Kriterien:
1. **Längslinie als Reihe** (Kugel, Rex, Tiger): Linie aus der Seite bzw. dem Top, auch schräg (Rex-Brauenwulst; Bögen 5 und 11; in M5 mit der Augenhöhle nach drei Anläufen ungelöst). Reihe ≤ 0,5 px auf der Linie (dicht), keine Treppe, Haut ≤ 0,25 px und Normalen ≤ 1° gegen ohne Linie, kleinster Flächenwinkel ≥ 20°, Seitenverhältnis ≤ 4.
2. **Kreuzung und Knick:** Längslinie über den Hauptquerschnitt → Knoten in der Front genau an der Kontur (Front-Δ unverändert); Ecke 0/50/100 % → Falte längs der Linie, Winkel gemessen.
3. **Querschnitt aus Linien:** Ring durch vier Konturpunkte (Florians Weg), in der Front zum Kasten geknickt. **Tiger-Kastenschnauze dreifach:** heutige Kasten-Spanten / Querschnitt + vier Längslinien / nur Längslinien — Ebenheit der Wände, Kantenwinkel.
4. **Steil und waagerecht:** Langhals-Querschnitt quer zum Hals; Panzerrand rundum (Ei als Schildkröte; Längsschleife durch die Kappen — geht nur auf bestimmten Reihen, wird gemessen).
5. **Ohne Springen:** Linie zeichnen → Sprung ≤ 0,25 px; Knoten 30 px ziehen → keine Neuzuordnung, kein Sprung beim Loslassen (≤ 0,5 px); zwei Linien dichter als eine Reihe → eine Schleife mehr, Sprung ≤ 0,25 px. Eine Pinselbeule neben einer neuen Linie bleibt an ihrer Stelle (≤ 0,5 px) — Pinsel-Deltas hängen heute an Punktnummern und rutschen mit, wenn Ringpunkte umverteilt werden; reißt das, kommt die Lösung aus Teil H (Relief folgt der Haut) und wird vorgezogen.
6. **Pose:** Linienknoten in Fressen (Rex) ziehen; Editor-Tab bitgleich.
- Abbruch: nach drei gemessenen Fehlanläufen an derselben Stelle anhalten und berichten; je Hälfte ein Zeitrahmen.

**L1 Linien im Editor** (in B6, statt „Reifen in der Pose“): Dokument (Kante → Linie, gemeinsame Knoten, Migration der heutigen Kanten: Härte → Kantigkeit, Tiefe entfällt), Kern, Griffe in allen Ansichten und auf der Bühne, Posen. B6 wird: schwarze Linien in Front/Top der Pose + Linien in der Pose + Matrix „jedes Werkzeug × jede Pose“.

**L2 Spanten werden Querschnittslinien:** Migration (jeder Spant wird eine geschlossene Linie an seiner Stelle mit Kantigkeit je Punkt; Tiger-Prüfwesen), Werkzeug S und Reifen entfallen.

**Teil A danach:** Das Maul als Einsatz nutzt dasselbe Netz („Linie mit Schlitz“), dazu eingesetzte Schleifen für Linien, die keinem Ring und keiner Reihe folgen.

**Warum dieser Zeitpunkt (Florian hat ihn mir überlassen):** L0 jetzt, weil das Ergebnis B6 ändert (Reifen in der Pose entfallen, wenn Querschnitte Linien sind), weil es nur den Kern berührt und weil Florian die Linien „direkt mit einbringen“ will. L1 in B6, L2 danach, das Maul in Teil A.

## Dateien

**Neu (L0):** `packages/shape/src/kern/netz/` — `linie.ts` (Linie, Abtasten, Kreuzungen mit Konturen und Linien, gemeinsame Knoten), `schleifen.ts` (Zuordnung Linie → Ring/Längsreihe, eingefroren, Umlegen in der Ableitung), Tests; Skripte `apps/editor/scripts/pruefen/netz-l0.ts` (Zahlen) und `netz-l0.mjs` (Bilder).

**Wiederverwendet:** `kern/ableiten.ts` (`stationenWaehlen`/`stationenNachfuehren` mit Reifen, `querschnitteFuer`, `faltenSetzen`, `umparametrisieren` als Ausgangspunkt fürs örtliche Umverteilen), `spanten.ts` (Überblenden, `spantenAngleichen`, formneutrales Einfügen), `kern/kanten.ts` (Abtasten), `profil.ts` (Knoten einfügen, de Casteljau), `versuch/linie3d.ts` (Griffe), `kern/posen/linien.ts` und `loeser/glattLoeser.ts` (Griffe in Posen), `kern/posen/uebertrag.ts` (Daten bei neuer Schleife übertragen), `kern/pruefstand.ts`, `kern/abweichung.ts`.

**Ab L1 geändert:** `dokument.ts`, `kern/ableiten.ts`, `kern/wesen.ts`, `state/editorStore.ts` (`mitFormVerbunden`: Kreuzungsknoten), Editor `src/kanten/` → `src/linien/`, `src/spanten/` (L2).

## Verifikation

- L0: Kern-Tests mit den Kriterien oben, Zahlen je Fall, Bilder (Tiger dreifach, Rex-Braue neben den Bögen, Langhals, Schildkröte, Kreuzung in der Front, Pose), eigener Vite auf 5192 (`run-check.sh`), dann Halt für Florian. „Bestanden“ sagt Florian.
- Jeder Commit: `pnpm typecheck`, `pnpm test`, `pnpm lint`; B3/B3b/B4/B5-Prüfungen und `kern-ablauf` grün.

## Stand

- **15.10. nachts, L0.1 „Längslinie als Reihe“ gebaut und gemessen, Tor nicht erreicht, nach vier Anläufen angehalten** (Regel: nach drei gemessenen Fehlanläufen an derselben Stelle berichten):
  - **Gebaut:**
    - `packages/shape/src/kern/netz/reihen.ts`: Längslinie → Reihe j*. Die Stützstelle j* kommt je gekreuztem Ring auf die Kreuzung, die Nachbarn rücken örtlich auf derselben Querschnittskurve nach, an den Enden läuft es über zwei Ringe aus. Kantigkeit als Falte längs der Reihe.
    - Eingehängt in `zieleBerechnen` über `AbleitOptionen.netzLinien`; ohne Linien bitgleich wie vorher.
    - Messung in `kern/netz/reihen.test.ts`.
  - **Gemessen** (Reihe gegen die Linie / Haut gegen den Körper ohne Linie / Falten):

    | Fall | Reihe auf der Linie | Haut | Falten |
    |---|---|---|---|
    | Kugel waagerecht | 0,12 px (ohne Umlegen 10,7) | 0,86 px | 6,7° → 7,0° |
    | Ei-Bogen | 0,74 px (18,3) | 0,87 px | gleich |
    | Kugel schräg über die breiteste Stelle | 7,9 px | 7,8 px | 6,7° → 17,4° |
    | Rex-Braue | 1,3 px | 1,5 px | — |

    Die Rex-Braue kreuzt nur 2 Ringe. Tor war: Reihe ≤ 0,5 px, Haut ≤ 0,25 px.
  - **Befunde (Ursachen):**
    1. Die Breitenpunkte (sie halten die Top-Silhouette) hängen an Stützstellen-Nummern. Eine umgelegte Stützstelle, die auf 95 % der größten Breite rückt, wurde selbst Breitenpunkt; ihr Soll nimmt Front-Breite × Anteil doppelt → Beule 5–9 px. Behoben, indem die Breitenpunkte der Vorlage stehen bleiben.
    2. Folge daraus: Eine Linie, die schräg über die breiteste Stelle läuft, kommt mit ihrer Reihe nicht an der festen Stützstelle vorbei. Lösung: Breitenpunkte an der breitesten Stelle der Querschnittskurve, nicht an einer Stützstelle.
    3. Das Umlegen verschiebt Stützstellen auf der Kurve; die Fläche zwischen ihnen ändert sich dadurch um 0,5–0,9 px. Für ≤ 0,25 px braucht es einen formtreuen Ausgleich (Fläche auf die alte legen, Reihe hart auf der Linie) — so hatte es die Gegenprüfung vorhergesagt.
    4. Kurze Linien kreuzen auf dem groben Käfig nur wenige Ringe (Rex-Braue 2). Dort braucht es mehr Ringe (Verdichtung am Gestenende).
  - **Vorschlag für den nächsten Anlauf** (Florians Entscheidung): (a) Breitenpunkte an der Kurve statt an Stützstellen; (b) formtreuer Ausgleich mit Hautbedingungen in Normalenrichtung, 2–3 Durchgänge; (c) Verdichtung um kurze Linien. Oder Florian entscheidet, dass unter 1 px Hautbewegung beim Zeichnen genügt.
