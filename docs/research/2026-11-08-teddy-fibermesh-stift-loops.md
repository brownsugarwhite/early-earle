# Recherche: Teddy, FiberMesh, Monster Mash · Bleistift mit Glättung · Loops von selbst

Stand 08.11.2026, für den Plan [`docs/plans/2026-11-08-zeichnen-aufblasen-anbauen.md`](../plans/2026-11-08-zeichnen-aufblasen-anbauen.md).
Gesammelt in drei parallelen Recherchen; Paper-Server (Princeton, Tokio, arXiv, ETH) waren aus der Cloud gesperrt, Quellcode über
GitHub-Rohdateien und npm war lesbar.

**Markierung der Belege:** [P] Primärquelle selbst gelesen (Code, Hilfetext, Paper) · [PS] Wortlaut der Primärquelle nur als
Suchausschnitt gesehen · [S] Sekundärquelle (Reimplementierung, Vorlesung, Handbuch) · [G] aus dem Gedächtnis, nicht bestätigt.
Zwei Kernaussagen zu FiberMesh (Kurventyp je Operation, ebener Deckel) wurden zusätzlich mit eigenen Suchen gegengeprüft.

## A. Löschen, Schneiden, Extrudieren, Anbauen in skizzenbasierten Modellierern

### A1 Teddy (Igarashi, Matsuoka, Tanaka 1999) und Nachfolger

- **Erzeugen:** Anfang und Ende des Strichs werden verbunden → ebenes Polygon; Constrained Delaunay; Rückgrat = Chordal Axis
  (Mittelpunkte der inneren Kanten); Enddreiecke werden beschnitten (Halbkreis-Test) und als Fächer trianguliert; Rückgratpunkte
  werden proportional zum Abstand vom Polygon angehoben; jede innere Fächerkante wird ein Viertel-Oval, Querschnitte sind Ovale
  [PS T1, S T2]. Selbstschneidende Striche werden abgewiesen [PS T1].
- **Extrudieren (zwei Striche):** ein geschlossener Strich auf der Fläche ist der Basisring (Normale aus seiner Ausgleichsebene);
  der Extrusionsstrich wird auf eine Ebene senkrecht zur Fläche durch den Ring projiziert; Kopien des Rings laufen den Strich entlang,
  etwa senkrecht zur Richtung, auf die Strichbreite skaliert; **die Polygone im Ring werden gelöscht, die Ringkopien vernäht** [PS T1,
  S T4].
- **Schneiden:** ein Strich quer über das Objekt löscht die eine Seite; der Querschnitt wird aus ebenen Stücken zusammengesetzt
  (**Deckel stückweise eben**); danach kann man **direkt aus dem Schnitt extrudieren** [PS T1, S T3].
- **Glätten:** Polygone in einem Ring löschen und das Loch glatt neu füllen [PS T1].
- **Smooth Teddy** (Igarashi und Hughes 2003): nachträglich fast gleichseitige Dreiecke und Verfeinern über lokale Quadriken; nur
  kugelartige Topologie [PS T5, S T2].

### A2 FiberMesh (Nealen, Igarashi, Sorkine, Alexa 2007)

- Die Striche bleiben als Steuerkurven auf der Fläche und sind die Griffe; die Fläche entsteht aus einer Fairness-Optimierung mit
  glatt verteilten Krümmungsbeträgen und Lagebedingungen an den Kurven [PS F1] (deckt sich mit Abschnitt 2 der Planseite
  „Kurven als Wahrheit“).
- **Kurventyp je Operation** (gegengeprüft): Erzeugen → glatte Kurve; **Schnitt → scharfe Kurve**; **Extrusion → eine scharfe Kurve an
  der Basis und eine glatte entlang der Silhouette**; eine neu auf die Fläche gezeichnete Kurve ist zunächst glatt; der Typ ist
  umschaltbar [PS F1].
- **Schnitt:** „the system flattens the intersection (it is always developable) and generates a 2D mesh inside“ → **ebener Deckel** mit
  scharfer Kante (gegengeprüft) [PS F1].
- **Extrusion:** geschlossener Strich auf der Fläche, dann Silhouettenstrich (wie Teddy); **Tunnel:** geschlossener Strich, dann ein
  Strich auf der Gegenseite [PS F1].
- **Neu vernetzt** wird nach Erzeugen, Schnitt und Extrusion, jeweils am Ende der Operation; Kurven dürfen beliebige Topologie haben
  und unverbunden sein [PS F1].

### A3 Monster Mash (Dvorožňák u. a. 2020), Quellcode gelesen

Das Vorbild, das unserem Arbeiten in der Seite am nächsten kommt [P, `github.com/google/monster-mash`]:

- **Zeichnen:** jede Region ein Strich; **Zeichenreihenfolge = Tiefenreihenfolge**; geschlossener Strich = Körper; **offener Strich =
  angesetztes Teil, die Lücke schließt eine gerade Sehne, die die Naht markiert**; rechte Maustaste zeichnet hinter die überstrichenen
  Teile; **Doppelklick dupliziert ein Teil und legt es hinter alle anderen** (so entstehen Beine und Augen beider Seiten) [P M4, M7].
- **Aufblasen:** Poisson mit Kotangens-Laplace, rechte Seite = Aufblasstärke (Standard 2), z = 0 am Umriss, **an der Naht frei**,
  danach z ← √z [P M1]. Nachgerechnet: Bei gleicher Stärke c wird eine Scheibe nur mit c = 4 eine Halbkugel, ein Streifen nur mit c = 2
  ein Halbkreis — Kugeln und Röhren sind also nicht zugleich rund. **Unsere Vereinigung der größten Kugeln (`rund.ts`) ist für beide
  genau rund** und bleibt deshalb das Aufblasen.
- **Annähen:** Die Nahtpunkte eines Teils werden als feste Punkte ins Netz des Elternteils eingefügt, die Elterndreiecke daran auf das
  Teil umgehängt (Schlitz und Naht) [P M3]. **Grenze:** nicht wasserdicht — die Rückseite des Teils bleibt im Körper offen, die
  Achselnaht ist experimentell [P M1, M3, M7]. Für unsere eine geschlossene Haut braucht es eine geschlossene Nahtschleife.
- **Tiefe** entsteht nur über Ungleichungen in der späteren Verformung; ohne sie durchdringen sich Teile [P M5, PS M8].

### A4 Weitere Systeme (kurz)

- **RigMesh** (Borosán u. a. 2012): Verschmelzen ergibt eine **wasserdichte Vereinigung mit geschlossener Schnittschleife**, danach
  geglättet; Schnitt mit offener Kurve, glatt oder scharf [PS R1].
- **ShapeShop** (2005): implizit (BlobTree), Anfügen per Blend — keine Nähte, aber Verschmelzen (bei uns ausgeschlossen) [PS D1].
- **SmoothSketch** (2006): ergänzt verdeckte Konturen an T-Kreuzungen [PS D2]. **B-Mesh** (2010) und Blenders Skin-Modifier: Netz aus
  Skelett und Kugeln, Abzweigungen über konvexe Hüllen [PS D3, P D4].
- **UI heutiger Werkzeuge:** Nomad Sculpt hat Lathe, Tube und Trim, aber kein „Lasso aufblasen“; ZBrush ZSpheres/ZSketch bauen über
  ein Gerüst [S E1, E2]. Das klarste Vorbild für die Seitenansicht bleibt Monster Mash.

### A5 Netztechniken

- **Loch füllen:** Liepa 2003 (triangulieren, verfeinern, fairen) [PS X1]; eben wie Teddy/FiberMesh: Rand in eine Ebene legen, 2D
  vernetzen [PS T1, F1].
- **Ringe ungleicher Punktzahl verbinden:** Fuchs, Kedem, Uselton 1977 (kürzeste Kachelung als dynamische Programmierung) [PS X3];
  Blenders „Bridge Edge Loops“: kürzeren Ring auffüllen, beste Drehung, triangulieren, Querkanten umklappen [P X4].
- **Neu vernetzen:** Botsch und Kobbelt 2004 (teilen über 4/3 L, zusammenlegen unter 4/5 L, Wertigkeit 6, tangential entspannen)
  [PS X2]; unser `verdichten.ts` macht die ersten drei Schritte schon.
- **Harte Kante im Löser** nur, wenn die Glättung über die Kante entkoppelt ist; sonst blutet Krümmung in den Deckel [G X5] — bei uns
  ist das „Kante an“ (Gewicht 0 über die Linie).

### A6 Was wir übernehmen

1. **Kurventypen wie FiberMesh vorbelegen:** Startform → glatt; Schnitt/Löschen → Kante; Anbau → Ansatz wie sein Loop (am Schnitt
   Kante, an einer frei entstandenen Naht weich wie RigMesh), Silhouette glatt; danach mit K umschaltbar.
2. **Deckel eben** (Teddy, FiberMesh): Randkette in die Ausgleichsebene, innen 2D vernetzen, im Löser ohne Krümmungsquelle.
3. **Extrudieren aus dem Loop** wie Teddy: Ringkopien längs der Mittelachse der Zeichnung, nach außen rund, Inneres des Loops weg.
4. **Anbauen frei** wie RigMesh-Verschmelzen bzw. Monster Mash mit geschlossener Naht: Schnittschleife mit dem Körper berechnen, das
   Innere verwerfen, an der Schleife vernähen. Paare wie Monster Mashs Duplikat (bei uns der Spiegelzwilling).
5. **Fangen** über dieselbe Ecke (Monster Mash: Steiner-Punkt = Nahtpunkt), nie über eine Nachbarsuche; Knoten des Kurvennetzes beim
   Neuvernetzen nie verschieben.
6. **Neu vernetzen nur nach Topologie-Schritten** (FiberMesh), die Hälfte z ≥ 0 mit Kurven als festen Kanten, dann spiegeln.

## B. Bleistift mit Glättung, wenige Anker

### B1 Vorbilder

- **Illustrator-Bleistift:** Optionen Treue (fünf Stufen Genau ↔ Glatt), neue Striche füllen, Auswahl beibehalten, ⌥ schaltet zum
  Glätten-Werkzeug, „Pfade schließen, wenn Enden innerhalb … px“ (laut Forum Standard 15 px), „Ausgewählte Pfade bearbeiten innerhalb
  … px“ [S A1, A3]. Bis CS6 zwei Regler (Treue 0,5–20 px, Glättung 0–100 %), seit CC 2014 einer: „glattere, einfachere Linien mit
  weniger Punkten“, ein Test zählte bei „Glatt“ **3 Anker** für eine Kurve [S A2, A4, A5]. Weiterzeichnen am Endpunkt, Verbinden mit ⌘
  auf einen anderen Endpunkt, Umzeichnen nahe am gewählten Pfad [S A2]. Das Verfahren ist nicht veröffentlicht; das Adobe-Patent
  US 6,304,677 beschreibt Ecken über eine Krümmungsschwelle, Glätten je Abschnitt zwischen Ecken und Bézier-Anpassung mit Treuetest
  und rekursiver Teilung [S A6] — dass Illustrator heute so arbeitet, ist nur eine Vermutung.
- **Photoshop-Glättung** (0–100 %, seit 2017): Modi „Faden“ (es wird nur gemalt, wenn der Faden gespannt ist; Bewegung im Radius
  hinterlässt nichts), „Nachziehen“ (der Strich läuft in Pausen zum Zeiger weiter), „Nachziehen am Strichende“, „Zoom anpassen“. Der
  Standardmodus ist undokumentiert und verhält sich wie ein zeitbasierter Nachlauf; bei hohen Werten entstehen **Spitzen, wenn der
  Faden länger ist als der Kurvenradius** [S P1].
- **Krita** (Quelltext gelesen): „gewichtet“ = Gauß über die Bogenlänge; Stabilisator = Mittel der letzten Proben im 15-ms-Takt, holt
  deshalb in Pausen auf [P K1]. **Affinity:** Seil (scharfe Ecken durch Umlenken des Seils) und Fenster; **Procreate** StreamLine;
  **Clip Studio** Stabilisierung und Nachkorrektur; **Lazy Nezumi** Faden und Mittelwerte [S O1–O4].

### B2 Offene Verfahren (Quelltext gelesen)

- **Schneider** (Graphics Gems 1990) in paper.js `simplify`, fit-curve, `FitCurves.c` und unserem `packages/shape/src/fit.ts`: Der
  Fehler wird als **Abstandsquadrat** verglichen (paper.js-Vorgabe 2,5 = 1,58 px; `fitkubik` dokumentiert „err = Fehler² in px²“), und
  geteilt wird **gierig rekursiv** [P C1, C2, C8].
- **Inkscape-Bleistift:** Toleranz in Bildschirm-Pixeln, exponentiell am Glättungsregler; Endtangente aus dem ersten Punkt jenseits der
  Toleranz; ein „Haken“-Test erzwingt Ecken [P C6, C7].
- **Potrace und kurbo** (Levien): **erst die kleinste Zahl an Stücken, dann der kleinste Fehler** (dynamische Programmierung bzw.
  optimale Teilung). Halbieren liefert bis zu 1,5-mal zu viele Stücke. Lange Griffe machen Beulen trotz kleinem Abstandsfehler; kurbo
  bestraft Arm/Sehne ab 0,65 [P C9, C10, C11].
- **Faden** (lazy-brush: der Pinsel rückt um d − R nach) [P C5]; **Mittelung je Probe** (perfect-freehand `streamline`) hängt von
  der Abtastrate ab [P C4]; **1€-Filter**: Grenzfrequenz steigt mit dem Tempo, wenig Zittern langsam, wenig Nachlauf schnell [P C16].
- **Ecken:** ShortStraw (gleichabständig abtasten, „Strohhalm“-Minima), Sezgin (Tempo-Minima und Krümmungsmaxima) [P/S C14, C15].
- **Eingabe:** `getCoalescedEvents()` liefert alle Zwischenpunkte der Maus [S W1].

### B3 Eigene Simulation (synthetische Striche, noch nicht Florians Hand) [E]

- Ohne Vorglättung zerfällt Schneider bei zittriger Eingabe (ε 2 px: 137–186 Stücke); mit Faden 10–20 px: 5–10.
- Dynamische Programmierung statt rekursiver Teilung: 30–60 % weniger Stücke.
- Der Faden (12–20 px) weicht 1,4–5 px von der gemeinten Form ab, **unabhängig vom Tempo**; ein zeitbasierter Nachlauf (140 ms)
  4–24 px, **je schneller, desto mehr**.
- Mit Armgrenze 0,65 und ε 2–6 px: Ellipse 3–5 Anker, S-Kurve 2–3 Stücke.
- Skripte im Scratchpad der Recherche (nicht im Repo): `sim.py`, `sim2.py`, `kreis.py`.

### B4 Empfehlung (Startwerte, an Florians echten Strichen zu bestätigen)

Alle Maße in Bildschirm-Pixeln, für das Modell durch den Zoom geteilt.

| Schritt | Empfehlung |
| --- | --- |
| Eingabe | Pointer Events mit `getCoalescedEvents`, `setPointerCapture`, Zeitstempel |
| Fangen beim Aufsetzen | **vor** dem Stabilisator, 10 px; Rangfolge Endpunkt > Anker > Kreuzung > Punkt auf einer Linie; der Strich beginnt genau dort |
| Stabilisator | **Faden** als Standard: R = Glättung × 24 px (100 % = 24 px), Kreis und Faden sichtbar; eine Ecke entsteht durch Umlenken des Fadens; Variante „Nachlauf“ (1€-Filter) für den Vergleich mit Photoshop |
| Strichende | gerade zum Loslasspunkt nachziehen (beim Faden tangential) |
| Abtastung | gleichabständig alle 2 px |
| Ecken | auf der geglätteten Spur: Drehung ≥ 40° über ±8 px als örtliches Maximum, Abstand ≥ 24 px; oder Verweilen ≥ 120 ms mit ≥ 25° |
| Tangenten | an Enden und Ecken Ausgleichsgerade über 10 px Bogenlänge |
| Anpassen | dynamische Programmierung über Kandidaten alle 6–8 px mit `stueckAnpassen` (`dicht/pfad.ts`): erst wenigste Anker, dann kleinster Fehler; Treue ε in fünf Stufen 1/2/3/4/6 px, Standard 4; zulässig nur Arm/Sehne ≤ 0,65 und Drehung ≤ 150° je Stück |
| Geschlossen | Naht an einer Ecke, sonst beste von 4–8 Kandidaten (Extrempunkte) |
| Nacharbeit | glatte Anker probeweise entfernen, solange der Fehler ≤ ε bleibt; G1 genau; gerade Stücke ohne Griffe |
| Schließen, Verbinden | Ende ≤ 15 px vom Anfang → geschlossen (Naht glatt unter 35°); Anfang auf einem Endpunkt → weiterzeichnen; Fangpunkte als Verweis speichern |
| Vorlagen | Kreis/Ellipse: vier Anker, Griffe κ · Halbachse mit **κ = 0,5519150** (größter Fehler ±0,0196 %; 0,5522847 gibt +0,0273 %); Rechteck: vier Ecken; ⇧, ⌥, Leertaste wie Illustrator; runde Ecken später (je Ecke zwei Anker, Griffe κ·r) |

**Messgrößen:** Ankerzahl gegen das Minimum und gegen Florians Illustrator-Ergebnis; größte Abweichung in px; Krümmungskamm
(Sprünge an glatten Ankern werden nach dem Aufblasen ein Lichtknick); Zeit vom Ereignis bis zum sichtbaren Strich und für das
Anpassen beim Loslassen; aufgezeichnete Striche (x, y, t) als Wiedergabetests.

## C. Loops von selbst

### C1 Wo Loops hingehören

- **2D-Teile:** Minima-Regel (Hoffman und Richards 1984: Grenzen an negativen Krümmungsminima), Short-cut-Regel (Singh, Seyranian,
  Hoffman 1999: so kurz wie möglich schneiden), Hals = Minimum des Inkreisradius (Siddiqi und Kimia 1995), Mittelachse mit
  Astbeschnitt (Teddy; Nachbau gelesen) [S, P]. Stabil und mit wenigen Zahlen erklärbar sind die Mittelachse mit dem Radius R(s)
  (Hals = Minimum, Bauch = Maximum, Abzweig) und Taschen mit kürzester Sehne; Konvexzerlegungen zerhacken gebogene Wülste.
- **3D am Netz:** konkavitätsbewusste Felder (Au, Zheng, Tai, Cohen-Or 2012; Nachbau gelesen): harmonisches Feld mit kleinen
  Kantengewichten über konkaven Kanten, Isolinien sammeln sich in Kerben, bewertet nach Gradient und zweiter Differenz der
  Isolinienlänge [P, S]. Mesh Scissoring, Shape Diameter Function, skelettgeführte Schnitte [S].
- **Skelett → Netz:** SQM (Bærentzen u. a. 2012), FEQ (2022, Code gelesen), Blenders Skin-Modifier (Code gelesen): **ein Ring je
  Skelettknoten, Ringabstand etwa der Radius, Pole an Abzweigen und Spitzen** [P].
- **Modellierer:** Loops an Teilansätzen, um Gelenke, an der dicksten Stelle, konzentrisch um Augen und Maul. Die Mittelloops einer
  Quad-Kugel sind drei Großkreise — genau Florians „mittig von jeder Seite“. Ein Kasten hat zwölf harte Kanten mit Dreier-Ecken [S].

### C2 Was das für unsere Form heißt (eigene Herleitung, nachgerechnet)

- Die Startform (Vereinigung der größten Kugeln) ist abseits der Abzweige eine **Kanalfläche**. Der ebene Schnitt durch die
  **Berührsehne** einer Kugel (Sehne zwischen ihren zwei Berührpunkten mit dem Umriss, Ebene durch Sehne und Blickrichtung z) ist genau
  ein Kreis: Mitte c − R·R′·t, Radius R·√(1 − R′²) (t Richtung der Achse, R′ = dR/ds). An Bauch und Hals (R′ = 0) ist es ein Großkreis,
  am Hals zugleich die örtlich kürzeste Schleife. **Deshalb genügt die Analyse des Seitenumrisses**, und Querringe sind exakte Kreise.
- Der Scheitel jedes dieser Kreise (Höhe z = R·√(1 − R′²) über der Achse) ist die Stelle, an der die Form von oben (liegende Teile)
  bzw. von vorn (stehende Teile) am breitesten ist. Die Linie durch alle Scheitel, die **Scheitellinie**, ist damit genau Florians
  „über diesen steuer ich die breite von oben oder von vorne“ (Klarstellung 05.11.).
- Kreis: Die Achse ist ein Punkt; Umriss, senkrechter und waagerechter Großkreis sind die drei Mittelloops.

### C3 Vorschlag (Regel und Ablauf)

**Regel:** Ein Loop liegt dort, wo die Form aus einer Blickrichtung ihren Umriss hat, oder dort, wo ein Teil ansetzt. Vier Arten:
Seitenumriss (`mitte`), Scheitellinie (längs der Rumpfachse, weich, nicht eben), Querring an der dicksten Stelle jedes Teils (eben),
Ansatzring je Teil.

1. **Achse:** vorhandenes `kern/grundkoerper/skelett.ts` (Raster, Ast zählt ab 0,45 R Überstand aus dem Abzweigkreis, Rumpfachse durch
   die dickste Stelle; Falle aus dem Editor-Gedächtnis: Zhang–Suen verliert schräge Linien, Lü–Wang nehmen) oder die genauen Kugeln
   aus `dicht/kugeln.ts`; zusätzlich Astfläche ≥ 1 % des Umrisses; R(s) über 0,5 R glätten. Alle Zahlen relativ zum örtlichen R.
2. **Rund-Test:** Achse kürzer als 0,3 R_max (Kreis, Quadrat, fast rund) → senkrechter Querring und waagerechte Scheitellinie durch die
   Mitte der größten Kugel; fertig.
3. **Ansatzring je Ast** im Fenster vom Austritt aus dem Abzweigkreis bis 1,5 R_Ast; die erste passende Regel gewinnt: (a) Taschen auf
   beiden Seiten (Tiefe/Öffnung ≥ 0,15), ihre Sehne ≤ 1,3 × kürzeste Sehne im Fenster; (b) Hals: R-Minimum mit ≥ 15 % Einschnürung →
   Berührsehne dort; (c) eine Tasche → kürzeste Sehne von ihrer Spitze (wie `anEinbuchtungTeilen`); (d) sonst Berührsehne am
   Fensteranfang (wie `kern/grundkoerper/zerlegung.ts`). Kreuzen sich Sehnen, gewinnt die kürzere.
4. **Querring** je Teil an der dicksten Stelle (argmax R), senkrecht zur Achse, nur wenn die Teilachse ≥ R lang ist und der Ring
   ≥ 0,75 R von anderen Loops liegt.
5. **Scheitellinie** längs der Rumpfachse samt Kopf und Schwanz (Beine bekommen keine), Punkte aus der Formel in C2, an den Enden bis
   zum Umriss verlängert, auf die Haut gelegt.
6. **Gelenke** (Schalter, Standard aus): Knick ≥ 25° oder Dickensprung ≥ 20 % → Ring, höchstens einer je Gliedmaß.
7. **Eben oder weich:** eben sind Querringe, Hälse, Gelenke. Weich sind Scheitellinie und Ansatzringe aus Taschen: Isolinie eines
   konkavitätsgewichteten harmonischen Feldes in einem Band ± 0,6 R um den ebenen Schnitt (Kantengewicht × 0,1 über konkaven Kanten);
   länger als 1,15 × eben oder außerhalb des Bandes → eben.
8. **Hart** wird nur, was eckig gezeichnet ist: Liegen beide Enden eines Rings auf Ecken des Umrisses, wird er Kante; der Umriss-Loop
   behält seine Ecken. Organisch keine Kanten („so rund wie möglich“).
9. **Anzahl:** Vorrang Ansatzringe > Scheitellinie > Querringe > Gelenke; höchstens **12 neue Loops**, Abstand ≥ 0,75 R; ein Regler
   „Feinheit“ verschiebt Beschnitt und Höchstzahl.
10. **Rückfall** (geht immer): Umriss plus senkrechter und waagerechter Ring durch die größte Kugel.

**Fehlerfälle:** Scheinäste durch Zittern (Beschnitt, Mindestfläche); ein glatt auslaufender Schwanz ohne Tasche und Hals (Ring als
„vermutet“ zeigen); dichte Abzweige (Bein unter dem Hals) mit kreuzenden Sehnen; die Maulkerbe als Tasche (Lippenpunkte ausnehmen);
nach freiem Verformen beschreibt der Umriss den Körper nicht mehr — dann dieselben Regeln am Netz (Au u. a.).

### C4 Kasten

Die Kugeln machen aus einem Quadrat ein **Kissen** (Eckäste fallen im heutigen Beschnitt knapp weg: 0,41 R Überstand gegen die
Schwelle 0,45 R — ein Test soll das absichern). Ein **Kasten** braucht einen eckigen Querschnitt, also einen eigenen Grundkörper. Ein
Würfel hat an jeder Ecke drei Kanten; seine zwölf Kanten zerfallen deshalb nicht in getrennte geschlossene Loops (jede Ecke hat
ungerade Wertigkeit). Ohne doppelt laufende Loops braucht es Linien, die auf anderen Linien enden: zwei Paar-Loops (Seitenflächen)
plus vier Zweige in der Tiefe von Ecke zu Ecke, alle hart.

### C5 Testumrisse

| # | Umriss | erwartet |
| --- | --- | --- |
| 1 | Kreis (`kugel`) | zwei Ringe als Großkreise, Kreuzung bei (c, z = R) |
| 2 | Ellipse 2:1, liegend | Querring in der Mitte, Scheitellinie = waagerechter Ring |
| 3 | Ei | Querring an der dicken Seite, Scheitellinie gerade |
| 4 | Quadrat mit vier Ecken | Kissen: wie Kreis, Umriss mit Ecken; Kasten: zwei Paar-Loops und vier Zweige, hart |
| 5 | Erdnuss (R, 0,8 R, Hals 0,5 R) | Halsring (eben), zwei Querringe, Scheitellinie gerade |
| 6 | Banane (Bogen 120°) | Scheitellinie gebogen, nicht eben; ein schräger Querring; keine Teilgrenze |
| 7 | Wurst mit flachem Höcker (Höhe < halbe Breite) | kein Teil für den Höcker |
| 8 | Blob mit Kopf, zwei Beinen, Schwanz | weiche Ansatzringe an Hals, Beinen, Schwanz; Querringe Rumpf und Kopf; Scheitellinie Schwanz–Kopf: 7 neue Loops |

## Quellen

### Teil A

- T1 Teddy-Paper: https://www.cs.toronto.edu/~jacobson/seminar/igarashi-et-al-1999.pdf (Ausschnitte)
- T2 Reimplementierung zeyap/teddy: https://raw.githubusercontent.com/zeyap/teddy/master/README.md
- T3 Teddy-Handbuch: http://obado.free.fr/teddy/manual/tutorial5.html
- T4 UMBC-Vorlesung: https://courses.cs.umbc.edu/graduate/635/spring13/lectures/07_TeddyIntro.pdf
- T5 Smooth Teddy: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/smoothteddy/index.html
- F1 FiberMesh: https://igl.ethz.ch/projects/FiberMesh/fibermesh.pdf,
  https://people.eecs.berkeley.edu/~sequin/CS285/PAPERS/SIGGRAPH_07/041-nealen_FibreMesh.pdf
- M1–M7 Monster Mash, `github.com/google/monster-mash` (Branch main): M1 `src/reconstruction.cpp`, M3
  `third_party/ir3d-utils/MeshBuilder.cpp`, M4 `src/mainwindow.cpp`, M5 `src/defengarapl.cpp`, M7 `src/ui/myshell.html`
- M8 Google-Research-Blog 2021: https://research.google/blog/monster-mash-a-sketch-based-tool-for-casual-3d-modeling-and-animation/
- R1 RigMesh: https://cragl.cs.gmu.edu/rigmesh/rigmesh-small.pdf
- D1 ShapeShop: https://cspages.ucalgary.ca/~blob/webpapers/05/shapeshop_hires.pdf · D2 SmoothSketch:
  https://cs.brown.edu/~jhughes/papers/Karpenko-IDO-2006/main.htm · D3 B-Mesh: https://diglib.eg.org/xmlui/handle/10.2312/CGF.v29i7pp2169-2177
  · D4 Blender Skin-Modifier: `source/blender/modifiers/intern/MOD_skin.cc`
- E1 Nomad: https://forum.nomadsculpt.com/t/lathe-tool-feature/1900 · E2 ZBrush Unified Skin:
  https://help.maxon.net/zbr/en-us/Content/html/reference-guide/tool/zsphere/unified-skin/unified-skin.html
- X1 Liepa 2003: https://diglib.eg.org:443/xmlui/handle/10.2312/SGP.SGP03.200-206 · X2 Botsch und Kobbelt 2004:
  https://cg.cs.tu-dortmund.de/downloads/publications/2004/sgp04_slides.pdf · X3 Fuchs, Kedem, Uselton 1977:
  https://history.siggraph.org/?p=103213 · X4 Blender Bridge: `source/blender/bmesh/operators/bmo_bridge.cc` · X5 Botsch und
  Sorkine 2008: https://cg.cs.tu-dortmund.de/publications/2008-survey.pdf

### Teil B

- A1 Illustrator, Bleistift-Optionen: https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/draw-shapes/pencil-tool-options.html
- A2 Illustrator CS3/CS4-Handbuch: https://www.manualsdir.com/manuals/753918/adobe-illustrator-cs4.html?page=69
- A3 Schließabstand: https://community.adobe.com/t5/illustrator-discussions/closing-paths-drawn-by-the-pencil-tool-in-illustrator-cc-2017/m-p/8999715
- A4 Bleistift seit 2014/2025: https://community.adobe.com/t5/illustrator-discussions/please-please-adobe-the-new-pencil-tool-has-become-unusuble-to-me/m-p/5771663/highlight/true
- A5 CC 2014: https://design.tutsplus.com/tutorials/how-to-use-the-new-pencil-tool-in-adobe-illustrator--vector-23310
- A6 Patent US 6,304,677: https://patents.google.com/patent/US6304677
- P1 Photoshop-Glättung: https://bwillcreative.com/how-to-smooth-brush-strokes-in-photoshop/ ,
  https://community.adobe.com/t5/photoshop-ecosystem-discussions/photoshop-lines-aren-t-smooth-with-smoothing-on/td-p/10090680
- K1 Krita: https://raw.githubusercontent.com/KDE/krita/master/libs/ui/tool/kis_tool_freehand_helper.cpp
- O1 Procreate: https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings · O2 Clip Studio:
  https://support.clip-studio.com/en-us/faq/articles/20200030 · O3 Affinity:
  https://affinity.help/designer2/en-US.lproj/pages/CurvesShapes/draw_pencilLines.html · O4 Lazy Nezumi: https://sozai.app/transcript/lazy-nezumi-pro-take-2/
- C1 paper.js: https://raw.githubusercontent.com/paperjs/paper.js/develop/src/path/PathFitter.js
- C2 npm fit-curve 0.2.0 · C4 npm perfect-freehand 1.2.3 · C5 npm lazy-brush 2.0.2 · C9 npm potrace 2.1.8 · C16 npm 1eurofilter 1.3.0,
  https://gery.casiez.net/1euro/
- C6 Inkscape: https://gitlab.com/inkscape/inkscape/-/raw/master/src/ui/tools/pencil-tool.cpp · C7 lib2geom:
  https://gitlab.com/inkscape/lib2geom/-/raw/master/src/2geom/bezier-utils.cpp
- C8 Graphics Gems: https://raw.githubusercontent.com/erich666/GraphicsGems/master/gems/FitCurves.c
- C10 Levien 2023: https://raphlinus.github.io/curves/2023/04/18/bezpath-simplify.html · C11 kurbo:
  https://raw.githubusercontent.com/linebender/kurbo/main/kurbo/src/fit.rs
- C14 ShortStraw: https://raw.githubusercontent.com/SFRL/shortstraw/main/shortstraw.py · C15 Sezgin 2001:
  https://groups.csail.mit.edu/mug/pubs/Sezgin2001Sketchbased.pdf
- W1 `getCoalescedEvents` in WebKit: https://bugs.webkit.org/show_bug.cgi?id=277185
- M1 Bézier-Kreis: https://spencermortensen.com/articles/bezier-circle/

### Teil C

- Hoffman und Singh 1997 (Salienz): https://sites.socsci.uci.edu/~ddhoff/1997-41-Salience.pdf
- Short-cut-Regel: https://sites.socsci.uci.edu/~ddhoff/scr.pdf , Luo u. a. 2015: https://arxiv.org/abs/1409.2104
- Siddiqi und Kimia 1995: https://doi.org/10.1109/34.368189
- Teddy-Nachbau (Beschnitt): https://github.com/zeyap/teddy (`pruneTrianglesAndElevateVertices.js`)
- RigMesh: https://cragl.cs.gmu.edu/rigmesh/
- Au u. a. 2012, Nachbau: https://github.com/FlorianTeich/concavity-aware-fields · Paper: https://pubmed.ncbi.nlm.nih.gov/21788668/
- Mesh Scissoring: https://faculty.runi.ac.il/arik/site/mesh-scissor-minima.asp · SDF (CGAL): https://doc.cgal.org/latest/Surface_mesh_segmentation/
- Piovarči 2014 (SQM): https://misop.github.io/projects/basemeshes/files/Piovarci2014.pdf
- FEQ: https://github.com/janba/GEL (`src/GEL/HMesh/skeleton_to_FEQ.cpp`)
- Blender Skin-Modifier: https://github.com/blender/blender (`source/blender/modifiers/intern/MOD_skin.cc`)
- Usai u. a. 2015: https://vcg.isti.cnr.it/Publications/2015/ULPTS15 · QuadWild: https://github.com/nicopietroni/quadwild/
- Topologie-Praxis: https://polycount.com/discussion/comment/2383491 · OpenSubdiv: https://graphics.pixar.com/opensubdiv/docs/mod_notes.html
