# Zeichnen, Aufblasen, Schneiden, Anbauen: Teddy und FiberMesh mit Illustrator-Werkzeugen

Stand 08.11.2026, **zur Freigabe, noch nichts gebaut**. Branch `claude/nice-lovelace-gxxpux`, aufgesetzt auf `claude/form-zuerst`
(Stand 640c2595, „Stift-Form liegt genau wie gezeichnet“). Recherche im Detail:
[`docs/research/2026-11-08-teddy-fibermesh-stift-loops.md`](../research/2026-11-08-teddy-fibermesh-stift-loops.md).

## Anlass (Florian, 08.11., wörtlich)

> ich würde gerne ein paar frische funktionen in den neuen editor einbauen. die idee stammt von fibermesh und teddy. Bei beidem
> startet man mit dem zeichnen einer grundform von der seite. Das ist gut. Das soll auch mein neuer startpunkt sein.
>
> Ich möchte es aber eher an illustrator angleichen und möchte dazu eine kleine elegante werkzeugleiste mit freihand zeichnen (n in
> illustrator mit sehr geglättetem stroke). Es soll sich anfühlen als würde man in photoshop mit einem harten pinsel mit 100%
> glättung zeichnen. Dabei nur die allernötigsten handlepunkte setzen. Dann werkzeug P von illustrator. Es ist schon gebaut. Aber
> ich will damit bereits die erste form von der seite zeichnen können. Es soll vorgegebene Formen wie kreis und ellipse geben und
> rechteck/quadrat. hier kann man die form von der seite erstellen die dann aufgeblasen wird wie bei teddy oder fibermesh. Ein
> weiterer button fügt saubere meshloops an den optimalen stellen ein (beim kreis z.B mittig von jeder seite). Quadrat mit harten
> kanten. bei organischen formen müssen intelligent die wichtigsten edgeloops gefunden und gesetzt werden. Auch die loops können
> organisch und weich sein.
>
> ich möchte weitere formen abschneiden und und erweitern können wie bei teddy oder fibermesh, indem ich durch edgloops
> abgesteckte bereiche auf dem mesh markieren und löschen kann. Die abschnittstellen bilden saubere harte kanten. ( Ähnlich wie es
> jetzt schon beim maul ist) Beim extrude möchte ich zusätzliche formen an abgeschnittene stellen oder einfach in den freien raum
> malen können wie bei fibermesh, nur mit meinen illustrator tools..die form soll sich dann auch aufblasen und wenn ich direkt an
> edgeloop punkten gezeichnet habe soll die form aus dem loop entstehen auch wie bei teddy oder fibermesh. Ich muss allgemein auch
> punkte mit p oder n(pinselwelkzrug) direkt von punkten des mesh's weiterzeichnen können also dass die linie der neuen form
> direkt an einer kreuzung anfängt und verbunden ist.
>
> Recherchiere erstmal ausgiebig und mache dir einen plan für die umsetzung. es soll dann an die arbeit der aktuell arbeitenden
> session anknüpfen.

## 1. Kurzfassung

**Was entsteht** (alles im Fenster `kurven.html`, der Arbeit der Session „3D mesh workflow simplification“ auf `claude/form-zuerst`):

1. **Werkzeugleiste** links, schmal, wie in Illustrator: Auswahl V, Bleistift N, Zeichenstift P, Ellipse, Rechteck, Loop L, Knopf
   „Loops“, dazu der **Zeichenmodus** „Aufblasen“ oder „Auf die Haut“ (umschalten mit ⇧D wie Illustrators Zeichenmodi).
2. **Bleistift N** wie ein harter Pinsel mit 100 % Glättung: Der Strich folgt der Maus an einer Schnur (Photoshops „Pulled
   String“), beim Loslassen holt er auf und wird eine Bézier-Form mit so wenigen Ankern wie möglich (Kreis → 4).
3. **Startform von der Seite**: Das Fenster beginnt leer. Mit N, P, Ellipse oder Rechteck zeichnet Florian die Seite, sie wird sofort
   rund aufgeblasen (der vorhandene Weg aus `form.html`, Vereinigung der größten Kugeln). Solange es keine Loops gibt, bleibt der
   Umriss bearbeitbar.
4. **Knopf „Loops“** setzt saubere Loops: Der gezeichnete Umriss wird der erste Loop (genau mit Florians Ankern), dazu je Teil der
   Form ein Querloop an der breitesten Stelle, eine Längslinie, wo die Form von oben und vorn am breitesten ist, und Ringe an den
   Einschnürungen zwischen Teilen. Beim Kreis sind das die drei Loops „mittig von jeder Seite“. Rechteck: harte Kanten.
5. **Fangen und Weiterzeichnen**: N und P beginnen und enden genau an Punkten, Kreuzungen oder Linien des Netzes und bleiben
   dort angeschlossen. Neu dafür: **Zweige**, Linien von Punkt zu Punkt (keine losen Enden).
6. **Bereiche löschen**: Klick auf die Haut wählt den Bereich zwischen den Loops (samt Spiegelbild), ⌫ schneidet ihn ab. Die
   Schnittstelle wird ein ebener **Deckel mit harter Kante** (wie Teddys Schnitt).
7. **Anbauen**: Im Modus „Aufblasen“ an zwei Punkten eines Loops beginnen und enden: Das neue Teil wächst **aus dem Loop** und
   ist rund aufgeblasen (Teddys Extrusion). Frei über den Körper gezeichnet: Die Naht entsteht von selbst, wo die neue Form den
   Körper trifft (wie Monster Mash), auf der Mitte oder als Paar.

**Reihenfolge** (Abschnitt 6): Z0 Leiste und Bleistift → Z1 Startform → Z2 Knopf „Loops“ → Z3 Fangen und Zweige → Z4 Bereiche und
Deckel → Z5 Anbauen aus dem Loop → Z6 Anbauen frei und Paare. Z0–Z2 hängen nicht am Löser; Z4–Z6 setzen den **netzunabhängigen
Löser** voraus, den die laufende Session als Nächstes beweisen will. Grob 10–14 Arbeitstage, jeder Schritt mit Bildern und Toren.

**Zu entscheiden** (Abschnitt 7): Rechteck als Kissen mit hartem Rand oder als Kasten; Tasten (L für Loop oder für Ellipse);
Zeichenmodus ausdrücklich oder geraten; Deckel eben oder gewölbt; Reihenfolge gegenüber dem Löser-Beweis.

## 2. Anknüpfung: Was es auf `claude/form-zuerst` schon gibt

Fenster `apps/editor/kurven.html` (`src/form/kurven.ts`), Kern `packages/shape/src/dicht/` (`@ee/shape/dicht`). Stand 08.11. abends
laut Projektgedächtnis und Planseite [`2026-11-06-kurven-als-wahrheit.md`](2026-11-06-kurven-als-wahrheit.md):

| Vorhanden | Wo | Nutzen für diesen Plan |
| --- | --- | --- |
| Startform aus dem Seitenumriss: Vereinigung der größten Kugeln, Surface Nets, Punkte genau auf der Fläche; Kreis → Kugel, Streifen → Röhre | `rund.ts` `rundAusSeite` (in `kurven.ts` fest `?form=kugel\|bohne`) | Aufblasen der Startform und angebauter Teile |
| Seite zeichnen mit Vektorpunkten, sofort runde Form (grob ≈ 15 ms im Zug, fein 0,15–0,35 s) | `form.html`, `src/form/main.ts` | Startform-Bedienung übernehmen |
| Wo die Form von vorn und von oben am breitesten ist (Linien mit wenigen Punkten) | `raumlinien.ts` `konturAusTiefe`, `umrissLinie` | Längs- und Querloops des Knopfs „Loops“ |
| Einbuchtungen des Umrisses mit Spitze, Öffnung, Tiefe; kürzeste Sehne als Naht | `teile.ts` `einbuchtungen`, `anEinbuchtungTeilen` | Ringe an Einschnürungen (Grenzen zwischen Teilen) |
| Größte Kugel je Umrisspunkt (Mittelachse und Radius) | `kugeln.ts` | Teile, Bäuche, Hälse finden |
| Loops `mitte`/`ring`/`paar`, Punkte mit gespeicherten Bézier-Griffen, Kreuzung = ein Punkt, Kante an/aus | `loops.ts` | Datenmodell; wird um Zweige erweitert |
| Loop schneiden (Ebene durch Linie und Blickrichtung), Form auf die Haut legen | `loopAusSchnitt`, `formAusZeichnung` | Loops von selbst, Haut-Modus |
| Loop als Kantenkette ins Netz einsetzen (spiegelgleich) | `einsetzen.ts` `loopEinsetzen` | Rand für Bereiche, Ansatz für Anbauten |
| Maul: Öffnung = kleinere Seite des Rings (Fluten der Dreiecke), Inneres | `maulLoop.ts` | Bereiche finden und wegnehmen |
| Haut aus den Kurven über die ganze Haut (wie FiberMesh), Krümmung mit Richtung, Zerlegung mit verschachtelter Ordnung | `ausKurven.ts`, `kruemmung.ts`, `loeser/zerlegung.ts` | Form nach jedem Schritt |
| Verdichten, Drehen, Zusammenlegen, Linien genau (MK/40); Werte je Punkt umordnen (`alt`) | `verdichten.ts` | Netz nach Schnitt und Anbau |
| Stift P wie Illustrator; Zeichnung genau auf der Haut (`griffeAusZeichnung`) | `kurven.ts` `stift…`, `loops.ts` | P für Startform und Anbau, gleiche Anker-Daten für N |
| Schneider-Anpassung mit Eckenerkennung | `packages/shape/src/fit.ts` | Bleistift N |
| Prüfungen mit der Maus (Playwright) und Haken `__kurven.*` | `apps/editor/scripts/pruefen/form-*.mjs` | Tore je Schritt |

**Nächste Schritte der laufenden Session** (08.11. abends, Florian: „ok, machen wir es so“): Stift-Form genau über Linien (gebaut),
dann **Löser netzunabhängig als Beweis** (Gewichte aus der Geometrie, Kotangens auf intrinsischer Delaunay-Triangulierung,
Verteilung getrennt), dann **Haut fein und live** (Netzschritte im Zug). Offen: Florians Wahl „Punkte wo nötig“.

**Was das für diesen Plan heißt:** Schneiden und Anbauen ändern das Netz (andere Dichte am Deckel und am neuen Teil). Mit dem
heutigen Löser (gleich gewichtetes Mittel der Nachbarn, „glatt“ hängt vom Netz ab, Planseite Abschnitt 8) würde die Haut nach
jedem Schnitt und Anbau springen. Deshalb kommen Z4–Z6 erst nach dem Löser-Beweis. Z0–Z2 ändern weder Löser noch Netz-Topologie
nach dem Start und können sofort beginnen.

**Florians Regeln, die gelten bleiben** (Klarstellungen 05.11., Nachrichten 2 und 3): ein dichtes Netz, das sich selbst erzeugt;
nach dem Start ist das Netz die Wahrheit, Linien und Loops formen es; Kanten und Edgeloops sind dieselbe Idee; nichts verschmilzt
zum Donut, ein Ende steckt im anderen; „so rund wie möglich“; keine losen Linienenden; Bézier-Griffe wie in Illustrator.

## 3. Recherche (Kurzfassung)

*(wird nach Abschluss der Recherche eingetragen)*

## 4. Bedienung

### 4.1 Werkzeugleiste

Senkrecht am linken Fensterrand über dem Blatt „Seite“, 36 px breit, im Stil der Regler-Leiste (Papier, keine Konturen),
Symbole 20 px, Tooltip mit Name und Taste, aktives Werkzeug gefüllt. Die Werkzeuge wirken in allen drei Blättern (Seite, Front, Top),
die Startform entsteht in der Seite.

| Werkzeug | Taste | Was es tut |
| --- | --- | --- |
| Auswahl | V (wie bisher „frei“) | Punkte, Griffe, Linien wählen und ziehen; **neu:** Klick auf die Haut wählt einen Bereich |
| Bleistift | N | Freihand mit Schnur-Glättung → Bézier mit wenigen Ankern (ersetzt F; F bleibt zweite Taste) |
| Zeichenstift | P | wie heute; neu auch für Startform und Anbau, fängt an Punkten |
| Ellipse | E (Vorschlag, siehe 7.2) | Ziehen von Ecke zu Ecke, ⇧ Kreis, ⌥ aus der Mitte, Leertaste verschiebt |
| Rechteck | M | wie Ellipse, ⇧ Quadrat |
| Loop schneiden | L | wie heute |
| Loops | Knopf (⇧L) | setzt Loops von selbst (Abschnitt 5.5) |
| Zeichenmodus | ⇧D | **Aufblasen** (die Form wird ein Körper oder ein Anbau) oder **Auf die Haut** (die Form wird ein Loop auf der Haut, wie heute F und P) |

Warum ein ausdrücklicher Zeichenmodus: Eine Form, die in der Seite vorn über den Umriss hinausgeht, ist heute ein Ring ums Maul.
Dieselbe Geste soll künftig auch einen Kopf anbauen können. Raten aus dem Strich wäre bei genau diesen Fällen falsch. Illustrator
kennt das Muster (Zeichenmodi „Normal / Dahinter / Innen“, ⇧D). Standard: ohne Körper „Aufblasen“, danach der zuletzt benutzte.

### 4.2 Ablauf

1. Leeres Fenster → Ellipse ziehen (oder mit N/P zeichnen) → runde Form in allen Ansichten.
2. Umriss nachbessern (Punkte, Griffe), die Form bläst sich mit auf.
3. „Loops“ → Umriss-Loop, Quer- und Längsloops; ab jetzt formt Florian über Loops, Punkte und Griffe wie heute.
4. Bereich anklicken, ⌫ → abgeschnitten, ebener Deckel mit harter Kante.
5. Modus „Aufblasen“, mit P an einem Punkt des Schnitt-Loops ansetzen, Hals und Kopf zeichnen, am anderen Punkt des Loops enden →
   der Kopf wächst aus dem Loop, rund aufgeblasen. „Loops“ setzt auch am neuen Teil die wichtigsten Loops.
6. Ein Bein frei über den Bauch zeichnen (⌥ beim Loslassen = Paar) → Naht von selbst, beide Seiten.

## 5. Bausteine

### 5.1 Werkzeugleiste und Zeichenmodus

Eigenes Modul `src/form/leiste.ts` (Aufbau, Zustand, Tasten), in `kurven.ts` nur angebunden (`modus` wird zu `werkzeug` +
`zeichenmodus`). Die Tasten L, F, P, K, G/S/R, O, ⌘Z bleiben, wie sie sind. Erst ein Bild der Leiste zur Abnahme (Arbeitsregel 1).

### 5.2 Bleistift N

Kern DOM-frei in `packages/shape/src/zeichnen/` (neu): `schnur.ts` (Glättung) und `anpassen.ts` (Bézier mit wenigen Ankern),
Tests mit aufgezeichneten Strichen. *(Einzelheiten und Standardwerte nach der Recherche, Abschnitt 3.)*

- **Eingabe:** `pointermove` mit `getCoalescedEvents()` (volle Abtastrate), in Bildschirm-Pixeln gerechnet, damit sich die Glättung
  bei jedem Zoom gleich anfühlt.
- **Schnur:** Der Pinselpunkt folgt dem Zeiger erst, wenn die Schnur straff ist (Länge R Bildschirm-Pixel); kleine Zitterbewegungen
  hinterlassen nichts. Beim Loslassen holt der Strich gerade bis zum Zeiger auf. Gezeigt wird ein harter Strich (2 px Tinte) am
  Pinselpunkt und die Schnur dünn zum Zeiger.
- **Ecken:** aus dem geglätteten Strich nur, wo die Richtung über wenige Proben stark dreht; ein kurzes Innehalten setzt bewusst eine
  Ecke (Vorschlag, im Test zu bestätigen).
- **Anpassen:** Bézier-Kette mit Fehlerschranke in Bildschirm-Pixeln, danach Anker herausnehmen, solange die Schranke hält
  (glatte Anker G1, Griffe auf einer Geraden); geschlossene Formen beginnen an einer Ecke oder an der stärksten Krümmung.
- **Schließen und Fangen:** Ende nah am Anfang (10 px) → geschlossen; Anfang oder Ende an Punkt, Kreuzung oder Linie (8 px) →
  angeschlossen (5.6).
- **Ergebnis:** dieselben Anker-Daten wie beim Stift P (`StiftAnker` mit Griffen), also gleiche Weiterverarbeitung: auf die Haut
  (`formAusZeichnung` + `griffeAusZeichnung`) oder aufblasen.

### 5.3 Ellipse und Rechteck

Ellipse: vier glatte Anker an den Scheiteln, Griffe κ · Halbachse (κ aus der Recherche). Rechteck: vier Ecken, gerade Stücke
(Griff ⅓ der Sehne wie beim Stift). Im Modus „Auf die Haut“ wie eine P-Form, im Modus „Aufblasen“ wie eine Startform oder ein Anbau.
Während des Ziehens zeigt das 3D die grobe Form (≈ 15 ms), beim Loslassen die feine.

### 5.4 Startform zeichnen und aufblasen

- `kurven.html` startet ohne Körper (`?form=kugel|bohne` bleibt für die Prüfungen). Die erste geschlossene Form im Modus „Aufblasen“
  ist die Startform: `rundAusSeite` → Haut, Front/Top/3D zeigen sie sofort.
- **Kern:** `UmrissPunkt` bekommt gespeicherte Griffe (`ein`, `aus`); `umrissStuecke` nimmt sie, wenn vorhanden, sonst wie heute
  (für alle bisherigen Aufrufer bitgleich, Test).
- **Bearbeitbar bis „Loops“:** Punkte und Griffe des Umrisses ziehen, Punkte einfügen und löschen (wie in `form.html`), die Form
  bläst sich neu auf. Mit dem ersten Loop beginnt die Phase „Netz ist die Wahrheit“ (Klarstellung 05.11.).
- **Rechteck:** siehe Entscheidung 7.1. Aufgeblasen ist es zunächst ein Kissen (Ecken im Umriss, Querschnitte rund); „harte
  Kanten“ kommen mit dem Knopf „Loops“.

### 5.5 Knopf „Loops“

Grundsatz aus Florians Nachricht 3 (05.11.): „ich gebe kopf und bauch ein edgloop und über diesen steuer ich die breite von oben oder
von vorne“. Ein Loop lohnt sich also dort, wo er eine Breite trägt oder zwei Teile trennt. *(Regeln und Schwellen werden nach der
Recherche festgelegt; Entwurf:)*

1. **Umriss-Loop** (`mitte`): genau der gezeichnete Pfad mit Florians Ankern und Griffen (die Linie ist ihr Pfad, die Haut bleibt).
2. **Teile finden** in der Seite: Mittelachse aus den größten Kugeln je Umrisspunkt (`kugeln.ts`), Radius längs der Achse.
   Maxima = Bäuche, Minima zwischen zwei Maxima = Einschnürungen, Verzweigungen = Ansätze (Beine, Schwanz). Einbuchtungen des
   Umrisses (`einbuchtungen`) bestätigen eine Grenze, ihre kürzeste Sehne ist der Schnitt.
3. **Je Teil ein Querloop** an der breitesten Stelle: Ring quer zur Achse (in der Seite eine Gerade von Umriss zu Umriss durch die
   Kugelmitte).
4. **Je Teil eine Längslinie**, wo das Teil von oben bzw. vorn am breitesten ist (über der Achse in Höhe des Kugelradius;
   `umrissLinie` rechnet das heute für die ganze Form). Folgt die Achse einem Bogen, ist die Längslinie gebogen: **organisch und
   weich**. Schnitt dafür neu: `loopAusKurve`, die Fläche durch eine Kurve im Blatt und die Blickrichtung (Verallgemeinerung von
   `loopAusSchnitt`).
5. **Je Grenze ein Ring** längs der kürzesten Sehne (weich, der spätere Ansatz).
6. **Kreis:** Die Achse ist ein Punkt → senkrechter und waagerechter Ring durch die Mitte = „mittig von jeder Seite“ (die drei
   Achsen-Loops der Tests). **Ellipse:** dieselben drei, gestreckt.
7. **Rechteck:** Entscheidung 7.1 (Kissen: Umriss-Loop als Kante mit vier Ecken plus zwei Mittelringe; Kasten: Paar-Loop als Rand
   der Seitenflächen plus vier Kanten in der Tiefe als Zweige, alles Kante).
8. **Wenige Punkte:** Ring = zwei Enden auf dem Umriss + Scheitel; Längslinie = Enden + Scheitel (+ Wendepunkte). Griffe so, dass der
   Pfad auf der Haut liegt (vorhanden: `griffeAnlegen`, `linienAufPfad`).
9. **Noch einmal drücken** setzt nur, wo noch keine Loops sind (etwa am neuen Teil nach einem Anbau). Höchstzahl je Teil, damit es
   sauber bleibt (Entwurf: 1 Quer + 1 Längs + Ringe an Grenzen).

### 5.6 Fangen und Weiterzeichnen, Zweige

- **Fangpunkte** für N, P, Ellipse, Rechteck, L: Punkte der Loops (eigene, Kreuzungen, Ringenden auf dem Umriss), Linien (dort
  entsteht ein neuer Punkt), im Modus „Aufblasen“ auch der Umriss. Anzeige wie Illustrators intelligente Hilfslinien: kleiner Ring und
  ein Wort („Kreuzung“, „Punkt“, „Linie“). Fangradius 8 px.
- **Haut-Modus:** Eine geschlossene Form durch einen gefangenen Punkt kreuzt genau dort. Eine **offene** Linie von einem gefangenen
  Punkt zu einem anderen wird ein **Zweig**: eine Linie auf der Haut, deren Enden Kreuzungen auf anderen Linien sind. So teilt Florian
  einen Bereich, ohne einen ganzen Loop um den Körper zu legen (und der Kasten bekommt seine Kanten in der Tiefe).
- **Datenmodell:** `Loop.art` um `zweig` erweitern (offen, Enden = Kreuzungen; auf der Mittelebene oder als Paar mit Zwilling). Ein
  `ring` ist der Sonderfall „beide Enden auf der Mittelebene“. Funktionen in `loops.ts`, die heute `geschlossen()` oder `ringEnde`
  fragen, lernen Enden auf Kreuzungen (Griffe an den Enden wie an Ringenden). Das ist der größte Eingriff in den Kern der laufenden
  Session und wird mit ihr abgestimmt (Abschnitt 8).

### 5.7 Bereiche wählen, löschen, Deckel mit harter Kante

- **Bereich** = zusammenhängende Dreiecke zwischen den Loop-Ketten (dasselbe Fluten wie die Öffnung des Mauls, `maulLoop.ts`).
  Neu im Kern: `bereiche(haut, loops)` → je Dreieck eine Bereichsnummer, dazu der Spiegelbereich.
- **Wählen** (V): Klick auf die Haut (nicht auf Linie oder Punkt) wählt den Bereich, ⇧ fügt hinzu, Esc hebt auf; Schwebe tönt ihn
  leicht, gewählt deutlich (Farbe je Dreieck im 3D und in den Blättern). Das Spiegelbild ist immer dabei.
- **Löschen** (⌫): Die Dreiecke des Bereichs fallen weg. Jeder Rand ist eine Loop-Kette und wird **Kante** (FiberMesh: ein Schnitt
  erzeugt eine scharfe Kurve). Das Loch bekommt einen **Deckel** wie bei FiberMesh („flattens the intersection … and generates a 2D
  mesh inside“) und Teddy (stückweise eben): Kette auf ihre Ausgleichsebene legen, die Hälfte z ≥ 0 mit der vorhandenen Delaunay-
  Triangulierung mit erzwungenen Kanten (`versuch/dreiecke2d.ts`) im Abstand der mittleren Kante füllen, spiegeln, danach
  `verdichten`. Über eine Kante fließt keine Krümmung, also bleibt der Deckel eben, bei einer gewölbten Randkette so glatt wie
  möglich. Wölben durch Ziehen (Entscheidung 7.4).
- **Linien im Bereich:** Was ganz im Bereich liegt, fällt weg. Ein Loop, der den Bereich nur kreuzt, läuft gerade über den Deckel
  weiter und bleibt geschlossen (Florians Regel „keine offenen Linien“); der Umriss-Loop ist dann genau der Schnitt der Form mit der
  Mittelebene, samt Deckelkante. Fällt das Maul in den Bereich, ist es weg (mit Hinweis, ⌘Z holt es zurück).
- **Danach:** Werte je Punkt umordnen (Blendshape der Fressen-Pose, Knochenwinkel, Proben der Loops), Spiegel neu, Löser neu zerlegen.
- **Schere** (später, optional): eine Linie quer über den Körper ziehen = Ring schneiden und kleinere Seite löschen in einem Schritt.

### 5.8 Anbauen aus einem Loop

- **Auslöser** (Modus „Aufblasen“): N oder P beginnt an Punkt A eines Loops und endet an Punkt B desselben Loops (beide gefangen).
  Die Zeichnung und die Ansicht des Loops zwischen A und B (auf der Seite der Zeichnung) schließen die Fläche des neuen Teils.
- **Geometrie** (wie Teddys Extrusion, rund wie die Startform): Teddy legt Kopien des Basisrings längs des Strichs, auf die
  Strichbreite skaliert, löscht die Polygone im Ring und vernäht die Kopien. Bei uns: Achse = Mittelachse der neuen Fläche vom
  Mittelpunkt des Loops zur Spitze; Querschnitte längs der Achse, am Ansatz genau die Kette des Loops (dieselben Netzpunkte), nach
  außen ein Kreis mit der halben Breite der Zeichnung als Radius, dazwischen überblendet, am Ende eine runde Kappe. Teile auf der
  Mittelebene liegen spiegelgleich (z = 0), Paare in der Tiefe des Loops.
- **Zwei Lagen des Ansatzes:** Sieht das Blatt den Loop von der Kante (ein Schnitt-Ring, in der Seite gezogen), liegt die Zeichnung in
  der Ebene, in die das Teil wächst — genau Teddys Fall. Sieht das Blatt den Loop von vorn (ein Paar-Loop an der Flanke, in der Seite
  gezeichnet), tritt das Teil erst senkrecht aus der Flanke und biegt dann in die Zeichnung (Achse mit Bogen). Prüffall: Bein aus
  einem Kreis an der Flanke.
- **Offener Strich:** Liegen beide Enden eines offenen Strichs auf demselben Loop, schließt der Loop die Fläche; liegen sie im Körper
  (5.9), schließt eine gerade Sehne (wie Monster Mash).
- **Netz:** Ringe im Abstand der mittleren Kante, je Ring so viele Punkte wie die Kette, Dreiecke als Streifen, danach `verdichten`
  und Zusammenlegen; der Bereich im Loop (Deckel oder Haut) fällt weg.
- **Linien:** Der Ansatz bleibt ein Loop und behält seine Art: am Schnitt eine Kante (FiberMesh macht die Basis einer Extrusion
  immer scharf), an einer frei entstandenen Naht weich (5.9); K schaltet um. Die Zeichnung wird eine glatte Linie des neuen Teils
  (FiberMesh: Silhouette glatt): auf der Mittelebene ersetzt sie im Umriss-Loop die Deckelkante (A und B werden Kreuzungen mit dem
  Ansatz, der Umriss-Loop bleibt geschlossen), bei einem Paar wird sie ein Zweig von A nach B. Loops, die über den Deckel liefen,
  enden am Ansatz (Zweige). Danach setzt „Loops“ die Quer- und Längslinie des neuen Teils, sonst hält der Löser seine Rundung nicht
  (Abschnitt 8).
- Ein Teil je Strich; verzweigte Zeichnungen (Hand mit Fingern) erst später.

### 5.9 Anbauen frei (Naht von selbst) und Paare

- Eine Form im Modus „Aufblasen“, die den Körper überlappt, ohne an Punkten zu beginnen (geschlossen, oder offen mit beiden Enden im
  Körper und einer Sehne dazwischen wie in Monster Mash): Das neue Teil wird für sich aufgeblasen. Seine Fläche ist bekannt:
  F(p) = (z − z₀)² − g(x, y) mit g aus seinen Kugeln (wie `rundAusSeite`). Die **Naht** sind die Nullstellen von F auf der Haut (über
  die Dreiecke der Haut abgelaufen), sie wird als weicher Loop eingesetzt; danach wie 5.8 mit der Naht als Ansatz. Das ist RigMeshs
  Verschmelzen (wasserdichte Vereinigung mit geschlossener Schnittschleife, danach geglättet), nicht Monster Mashs Schlitz (dort
  bleibt die Rückseite des Teils im Körper offen).
- **Mitte oder Paar:** Standard Mitte (z₀ = 0: Kopf, Schwanz, Kamm). ⌥ beim Loslassen oder Schalter = Paar: z₀ so, dass das Teil an
  der Flanke aus dem Körper kommt; das Spiegelbild entsteht mit (bei Monster Mash dupliziert ein Doppelklick ein Teil und legt es
  hinter alle anderen — bei uns ist das der Spiegelzwilling, ohne eigenen Schritt). Die Tiefe ist danach in Front und Top
  verschiebbar (G mit Z).
- Fallback, falls die eigene Naht an Sonderfällen scheitert: robuste Netz-Vereinigung mit `manifold-3d` (3.5.4, Apache-2.0, WASM),
  die Naht aus den Herkunftskennungen der Dreiecke. Erst prüfen, wenn nötig.
- Ganz außerhalb des Körpers gezeichnet: ein eigenes Stück im selben Netz (Entscheidung 7.5).

### 5.10 Netz und Löser nach Topologie-Änderungen

- Spiegelgleich bauen: die Hälfte z ≥ 0 rechnen, spiegeln; Punkte auf der Mittelebene genau z = 0 (sonst findet `hautAus` die
  Partner nicht, Falle aus `einsetzen.ts`).
- Werte je Punkt mit `alt` umordnen, neue Punkte ergänzen (`ergaenzen` aus `poseLoop.ts`).
- Schneiden und Anbauen nur in der Grundform; in der Pose gesperrt mit Hinweis.
- Löser einmal je Schritt neu zerlegen (0,1–0,5 s), danach Ruhe wie heute (`nachLoesenOffen`).
- Voraussetzung: netzunabhängiger Löser (laufende Session), sonst springt die Haut, wo der Deckel oder das neue Teil eine andere
  Dichte hat.

## 6. Schritte mit Toren

Jeder Schritt endet mit Bildern in `docs/progress/editor/` (Vorlage bzw. Erwartung neben Ergebnis), einer Maus-Prüfung unter
`apps/editor/scripts/pruefen/` und Kern-Tests unter `src/dicht/` bzw. `src/zeichnen/`; die vorhandenen Proben (Explosion, Hammer,
Rüssel, Boden, Pilz, Maul, Fressen-Pose, Stift über Linien) bleiben gleich oder besser.

| Schritt | Inhalt | Tore (Entwurf) | Aufwand |
| --- | --- | --- | --- |
| Z0 | Leiste, Zeichenmodus, Bleistift N, Ellipse, Rechteck (zunächst im Modus „Auf die Haut“) | Kreis aus der Hand → 4 Anker, ≤ 2 px neben dem geglätteten Strich; zwischen Loslassen und fertiger Form kein sichtbarer Sprung (≤ 1 px); ≤ 4 ms je Mausbewegung; **Florian zeichnet und sagt, ob es sich wie Photoshop 100 % anfühlt** | 1–1,5 Tage |
| Z1 | Startform im leeren Fenster, Umriss mit Griffen, aufblasen, bearbeitbar bis „Loops“ | Kreis → Kugel (≤ 0,5 % Abweichung), alte Aufrufer von `rundAusSeite` bitgleich, grob ≤ 20 ms im Zug, fein ≤ 0,4 s | 0,5–1 Tag |
| Z2 | Knopf „Loops“ | Haut beim Einsetzen unverändert (≤ 0,1); Kreis/Ellipse genau die drei Loops; sechs Prüfumrisse (Kreis, Ellipse, Rechteck, Bohne, Langhals, Vierbeiner-Umriss) mit erwarteten Loops als Bild, Florian nimmt ≥ 5 von 6 an; Zug am Kopf-Loop der Bohne: Bauch bleibt (≤ 1) | 1,5–2 Tage |
| Z3 | Fangen, Zweige | Anfang/Ende genau am Punkt (0,00), Zweig teilt einen Bereich, Haut beim Anlegen ≤ 0,1, ⌘Z genau; alle 103 Tests unter `src/dicht/` grün | 1,5–2 Tage |
| Z4 | Bereiche, Löschen, Deckel | 0 offene Kanten, spiegelgleich (10⁻⁸), Deckel eben (≤ 1 % der Breite), Knick an der Kante ≥ 80° bei einem Kugelschnitt, ⌘Z genau, ≤ 0,5 s | 1,5–2 Tage |
| Z5 | Anbauen aus dem Loop | Kopf aus dem Schnitt-Loop: 0 umgeklappt, Knicke über 60° = 0, Naht weich (≤ 5° quer) oder hart, Teil rund (Querschnitt ≤ 5 % vom Kreis), Spiegel genau | 2–3 Tage |
| Z6 | Anbauen frei, Paare | Naht geschlossen, Bein als Paar spiegelgleich, 0 umgeklappt, Ohr auf dem Kopf; Zeit ≤ 1 s | 2–3 Tage |

Abbruch je Schritt: wenn ein Tor nach dem zweiten Anlauf verfehlt ist, Befund und Wege an Florian, nicht mit Sonderregeln weiterbauen
(Lehre vom 06.11.: „machen wir wieder sonderregeln gerade?“).

## 7. Entscheidungen für Florian

1. **Rechteck „mit harten Kanten“:** (a) Kissen: Umriss wird eine Kante mit vier Ecken, Vorder- und Rückseite gewölbt; (b) Kasten:
   flache Seiten, zwölf harte Kanten (braucht Zweige aus Z3). Vorschlag: beide in Z2 als Bild, dann wählen; mein Tipp (b), weil es
   zum Kastenmaul passt.
2. **Tasten:** L bleibt „Loop schneiden“, Ellipse auf E (Vorschlag) — oder Illustrator-treu L = Ellipse und Loop auf ⌘R (wie im alten
   Editor). Achtung: ⌘R lädt im Browser-Fenster die Seite neu, ohne Speichern ginge alles verloren.
3. **Zeichenmodus** ausdrücklich (⇧D) statt Raten aus dem Strich. Vorschlag: ausdrücklich.
4. **Deckel** nach dem Löschen eben (Teddy) oder leicht gewölbt (FiberMesh)? Vorschlag: eben, wölben durch Ziehen.
5. **Freie Teile** ganz außerhalb des Körpers (eigenes Stück, später anbauen) erlauben? Vorschlag: erst nach Z6.
6. **Paar oder Mitte** beim freien Anbau: Standard Mitte, ⌥ = Paar. Vorschlag so.
7. **Reihenfolge:** Z0–Z2 sofort (vor dem Löser-Beweis) oder erst nach ihm? Vorschlag: Löser-Beweis zuerst fertig (er ist
   angefangen), dann Z0–Z6 in dieser Session.

## 8. Risiken

- **Zweige berühren den Kern** (`loops.ts`, 2 500 Zeilen): Rückschritte bei Griffen, Kreuzungen, Pfad. Gegenmittel: Zweig als
  eigener Fall neben `ring`, alle Proben und 103 Tests vor und nach dem Umbau.
- **Neue Teile ohne Querloops** halten ihre Rundung im Löser aus den Kurven nicht (Krümmung quer kommt nur von Loops, die quer
  laufen). Gegenmittel: „Loops“ setzt sie beim Anbau; Tor in Z5.
- **Anbau an stark gekrümmten oder schrägen Ansätzen** (Bein an der Flanke, Strich in einer anderen Richtung als die Normale des
  Loops): Falten am Ansatz. Gegenmittel: Überblenden über eine Ansatzlänge, Löser glättet; Tor „Knicke über 60°“.
- **Gefühl des Bleistifts** ist nicht messbar: Florian testet in Z0 am ersten Tag, Schnurlänge und Fehlerschranke als Regler.
- **Automatische Loops** an komplizierten Umrissen (Vierbeiner in einem Strich): die Regeln finden nicht alles. Fallback: Umriss,
  Längslinie und Querloops an den zwei größten Bäuchen, den Rest zieht Florian mit L.
- **Parallele Arbeit:** `kurven.ts` ist eine Datei mit 3 100 Zeilen; zwei Sessions darin gleichzeitig geben Konflikte. Diese Schritte
  laufen deshalb in der Session, die das Fenster schon führt, nacheinander.

## 9. Quellen

*(wird nach Abschluss der Recherche eingetragen)*
