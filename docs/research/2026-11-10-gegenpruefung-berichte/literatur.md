# Literatur: Flächen aus Kurven — unabhängige Gegenprüfung (10.11.2026)

Auftrag: prüfen, was die Literatur zu „Linien fest, dazwischen so rund wie möglich, live“ sagt, und ob die andere Sitzung etwas
übersehen hat. Ich habe nichts im Arbeitsbaum geändert und nichts gemessen (meine Aufgabe nennt keine Messskripte). Jede Aussage
trägt eine Marke:

- **gelesen** = steht in der genannten Quelle (URL) oder im Code (Datei:Zeile);
- **abgeleitet** = eigene Rechnung aus Gelesenem, nicht in einer Quelle nachgeschlagen, nicht gemessen;
- **vermutet** = Erwartung für unseren Editor, die erst eine Messung zeigt;
- **Gedächtnis** = Wissen ohne heute gelesene Quelle.

## 0. Kurzfassung

1. **Die Aussage „Lage allein → unendlich viele Formen, die Gleichung braucht Lage und Normale“ ist zu grob.** Sie stimmt für den
   **Rand eines Flächenstücks** (so steht es bei Schneider & Kobbelt) und für den **heutigen Löser** (der die Krümmung an der Linie
   an der Haut abliest). Für **innere Linien einer geschlossenen Haut** stimmt sie als Satz über die Mathematik nicht: Dort ersetzt
   die Bedingung „die Haut läuft knickfrei über die Linie“ die fehlende Angabe, wie bei einer Straklatte durch Nägel. Mehrdeutig
   bleibt nur der Sonderfall einer einzelnen Kreislinie (alle Kugeln durch den Ring) — genau die Kuppel-Probe.
2. **Die Literatur kennt drei Familien, und keine erfüllt alle vier Wünsche zugleich** (sofort, genau rund, ohne Gedächtnis, nur
   Lage an den Linien): lineare Systeme ohne Richtung sind sofort, aber flach; lineare Systeme mit Richtung sind sofort und
   näherungsweise rund; nichtlineare Verfahren (FiberMesh, Schneider & Kobbelt, Willmore) sind rund, rechnen aber in Runden und
   sind als nicht immer konvergent dokumentiert.
3. **Übersehen wurde die zweite Familie** (Repoussé, Andrews/Joshi/Carr 2011, Stanko u. a. 2016): die Richtung an den Linien als
   Angabe, die Haut in zwei bis drei vorab zerlegten linearen Lösungen, ohne Runden. Die Recherche vom 09.11. nennt sie nur als
   „Rückfall“, gemessen wurde sie nie. Sie ist mein Kandidat 1, mit einer klaren Bruchstelle (Rüssel aus Profillinien).
4. Die Befunde der anderen Sitzung zu FiberMesh sind richtig und werden von der Literatur noch verschärft: Der Erstautor des
   linearen Adobe-Systems zeigt FiberMesh-Fälle, die ins Unendliche laufen oder dauerhaft schwingen.
5. Rangliste (Abschnitt 7): (1) linear aus Linien mit Richtung, (2) zwei Netzebenen für die Runden, (3) Sofort-Antwort aus vorab
   gerechneten Basisfunktionen je Bézier-Punkt, (4) Krümmung an Kreuzungen aus den Linien als feste Stützwerte, (5)
   Unterteilungsfläche als Rechenraum (langfristig).

## 1. Was ich gelesen habe und wie

| Quelle | wie gelesen | URL |
| --- | --- | --- |
| Schneider & Kobbelt 2001, Geometric fairing of irregular meshes | Volltext | https://graphics.rwth-aachen.de/media/papers/geom_fair1.pdf |
| Nealen u. a. 2007, FiberMesh | Volltext | https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf |
| Andrews, Joshi, Carr 2011, A Linear Variational System for Modelling From Curves | **nur Abstract** (Eurographics und Wiley 403, Berkeley 404, pushkarjoshi.org Zertifikatsfehler) | https://diglib.eg.org/handle/10.1111/v30i6pp1850-1861 |
| Andrews 2013, Dissertation (Kap. 5, derselbe Erstautor) | Volltext der Kapitel 5.1–5.2 | https://www2.eecs.berkeley.edu/Pubs/TechRpts/2013/EECS-2013-103.pdf |
| Adobe-Patente US 8,379,018 (Carr, Joshi, Andrews), US 8,334,868, US 8,773,431 (Carr, Joshi) | je die ersten 100 000 Zeichen über eine Werkzeug-Zusammenfassung, nicht wörtlich geprüft | https://patents.google.com/patent/US8379018B2/en · https://patents.google.com/patent/US8334868B2/en · https://patents.google.com/patent/US8773431B2/en |
| Joshi & Carr 2008, Repoussé | nur Abstract (Suchtreffer) und Patent US 8,334,868 | https://diglib.eg.org/handle/10.2312/SBM.SBM08.049-055 |
| Baran & Lehtinen 2009, Notes on Inflating Curves | Volltext | https://www.alecjacobson.com/weblog/media/notes-on-inflating-curves-2009-baran.pdf |
| Sorkine & Cohen-Or 2004, Least-squares Meshes | **nicht gelesen** (PDF zu groß für das Werkzeug); Eigenschaften nach FiberMesh Abschnitt 3.2 | — |
| Botsch & Kobbelt 2004, Intuitive Framework for Real-Time Freeform Modeling | Volltext | https://graphics.rwth-aachen.de/media/papers/modeling1.pdf |
| Jacobson u. a. 2010, Mixed Finite Elements | **nur Vortragsfolien** (Zusammenfassung) | https://sambuz.com/doc/mixed-finite-elements-for-variational-surface-modeling-ppt-presentation-718638 |
| Stein u. a. 2018, Natural Boundary Conditions | Volltext | https://arxiv.org/abs/1707.04348 |
| Stein u. a. 2020, Smoothness Energy without Boundary Distortion for Curved Surfaces | Volltext (Abschnitte 6–7) | https://alecjacobson.com/images/a-smoothness-energy-without-boundary-distortion-for-curved-surfaces-acm-tog-compressed-stein-et-al-2020.pdf |
| Wardetzky u. a. 2007, Discrete Quadratic Curvature Energies | Volltext (Abschnitte 2, 3.2) | https://www.cs.columbia.edu/cg/pdfs/1166238667-bendingCAGD.pdf |
| Stanko u. a. 2016, Smooth Interpolation of Curve Networks with Surface Normals (Kurzfassung) | Volltext | http://tiborstanko.sk/assets/2016-eg.pdf |
| Hermann, Peters, Strotman 2009, Geometric Criterion for Smooth Interpolation of Curve Networks | Volltext (Abschnitte 1–2) | https://www.cise.ufl.edu/research/SurfLab/papers/08tamtim.pdf |
| Crane u. a. 2013, Conformal Willmore Flow | nur Abstract/Projektseite über Suchtreffer (Server 503) | https://www.cs.cmu.edu/~kmcrane/Projects/ConformalWillmoreFlow/ |
| Bobenko & Springborn 2007; Sharp & Crane 2020; Cirak u. a. 2000; Grinspun u. a. 2006 | Abstract bzw. Suchzusammenfassung | https://arxiv.org/abs/math/0503219 · https://diglib.eg.org/handle/10.1111/cgf14069 · https://resolver.caltech.edu/CaltechAUTHORS:20171213-090454075 · https://cragl.cs.gmu.edu/midedge/midedge.pdf |
| Pan u. a. 2015 (Flow Aligned Surfacing); Yu u. a. 2021 (CASSIE); Xu u. a. 2014 (True2Form); Bessmeltsev u. a. 2012 | Projektseite bzw. Abstract | https://haopan.github.io/curvenet_surfacing.html · https://em-yu.github.io/research/cassie · https://www.cs.ubc.ca/labs/imager/tr/2014/True2Form/index.htm · https://www.cs.ubc.ca/labs/imager/tr/2012/Quadrangulation |
| Willmore-Energie (Übersicht) | Zusammenfassung | https://en.wikipedia.org/wiki/Willmore_energy |
| Moreton & Séquin 1992; DeRose u. a. 1998; Grinspun u. a. 2003; Bobenko & Schröder 2005; Helfrich; CrossShade | **heute nicht gelesen**; nur über andere Quellen oder Gedächtnis | — |

Dazu im Arbeitsbaum: Recherche `docs/research/2026-11-09-fibermesh-monstermash-richtung.md`, Planseite
`docs/plans/2026-11-06-kurven-als-wahrheit.md` (Abschnitte 1–6, 8–18), Bilanz `docs/research/2026-11-09-bilanz-wesen-editor.md`
(Abschnitte 3–8), Code `packages/shape/src/dicht/ausKurven.ts` (Kopf, Zeilen 222–380, 700–1095).

## 2. Frage 1: Braucht die Gleichung Lage und Normale?

### 2.1 Was Schneider & Kobbelt wirklich sagen (gelesen)

- Sie lösen Δ_B H = 0 auf einem **Flächenstück mit Rand** und verlangen am Rand Lage und Einheitsnormale (G1). So ist die
  Aufgabe gestellt (Abschnitte 3 und 7).
- Die Gleichung ist nach eigener Angabe eine **Vereinfachung** der Euler-Lagrange-Gleichung der Biegeenergie
  (Δ_B H = −2H(H² − K)); Kugeln, Zylinder und Minimalflächen sind Lösungen (Abschnitt 3).
- Einen Eindeutigkeitsbeweis gibt es nicht. Der Abstract spricht nur von einer wohldefinierten Lösung, die nicht von der
  Darstellung abhängt.
- **Innere Bindungen behandeln sie nicht.** Im Ausblick (Abschnitt 8) steht, dass Bindungen im Inneren der Fläche noch
  einzubauen wären und vielleicht Gleichungen höherer Ordnung brauchen.
- Auch ihr Verfahren schwingt: Die Krümmung am Rand wird jede Runde am Netz gemessen (mit der bekannten Tangentialebene), der
  Schritt wird auf 0,9 gedämpft, weil Punkte in seltenen Lagen zwischen zwei Stellen wechseln (Abschnitt 7.5). Gerechnet wird mit
  Mehrgitter; die Zeiten von 2001 liegen bei 1,9 bis 57 s für 920 bis 13 308 Punkte (Tabelle 1).

Die Recherche vom 09.11. gibt das im Kern richtig wieder (`…-fibermesh-monstermash-richtung.md:66–74`). Sie überträgt die
Randaussage aber ohne Prüfung auf Linien im Inneren (`:17–19`, `:75–80`).

### 2.2 Rand eines Flächenstücks gegen innere Linie (abgeleitet)

Eine Gleichung vierter Ordnung braucht an jedem Rand zwei Angaben. Entscheidend ist, wer sie liefert:

- **Flächenstück, jede Seite für sich gelöst:** Lage ist eine Angabe, die zweite fehlt. Fehlt sie, bleibt eine ganze Schar. Dazu
  passt Stein u. a. 2018 (gelesen, Abschnitt 4): Die Energie „Laplace im Quadrat“ hat ohne zweite Randangabe einen unendlich
  großen Nullraum, weil es zu jeder Randlage eine harmonische Funktion gibt.
- **Innere Linie einer Haut, als eine Aufgabe gelöst:** An der Linie treffen zwei Seiten zusammen, das sind vier fehlende
  Angaben. Geliefert werden: Lage auf beiden Seiten (2), knickfreier Übergang (1), stetige Krümmung quer über die Linie (1).
  Die letzten beiden sind die **natürlichen Übergangsbedingungen** des Minimierungsproblems; frei bleibt nur der Sprung der
  Ableitung der Krümmung (das ist die Kraft, mit der die Linie die Haut hält). Vier von vier, die Aufgabe ist wohlgestellt.
- Das eindimensionale Gegenstück ist der kubische Spline: Punkte vorgeben reicht, die Steigungen ergeben sich. Nur wer jedes
  Stück einzeln rechnet (Hermite), braucht die Steigung. Die Planseite schreibt das selbst (`…-kurven-als-wahrheit.md:1154–1155`:
  Die mitgelöste Form ergibt in einer Dimension genau den kubischen Spline), zieht aber nicht den Schluss für die Aussage in
  Abschnitt 14.
- Stütze aus der Literatur für die geschlossene Fläche: Stein u. a. 2020 (gelesen, Abschnitt 7.1) interpolieren auf geschlossenen
  gekrümmten Flächen Werte an einzelnen Punkten mit einer quadratischen Glattheitsenergie; ab drei Punkten hat die Aufgabe eine
  Lösung. Für Linien gilt das erst recht.

### 2.3 Je Energie

| Energie / Gleichung | Lage allein an inneren Linien | Kugel bleibt Kugel? | Quelle |
| --- | --- | --- | --- |
| Dünne Platte mit **fester Metrik** (Δ²x = 0, Laplace einmal aus einem Bezugsnetz) | **eindeutig** (quadratisch, Kern nur Konstanten), aber: Liegen alle Linien in einer Ebene, liegt die ganze Lösung in der Ebene; sonst sammelt sich die Krümmung an den Linien | **nein**. Abgeleitet: Auf der Kugel ist Δx = −2x/R², also Δ²x ≠ 0; die Lösung wird zwischen den Linien flacher | FiberMesh 3.2 und Bild 11/12 (gelesen); Andrews 2013, 5.1.1 (gelesen); Stanko 2016, Bild 2: ohne Normalen Sprünge der mittleren Krümmung an den Kreuzungen (gelesen) |
| Dieselbe Platte mit Bezugskrümmung auf der rechten Seite (Δᵏx = Δᵏx_alt) | eindeutig | ja, weil die alte Form gespeichert ist: Das ist das **Gedächtnis** | Andrews 2013, 5.2 (gelesen) |
| ΔH = 0 (Schneider & Kobbelt, FiberMesh, unser Löser) | als Übergangsaufgabe örtlich bestimmt; **Schar bei einer einzelnen Kreislinie**: Jede Kugel durch den Ring hat konstante Krümmung und ist Lösung | ja, aber nicht als einzige, wenn nur ein Ring da ist | abgeleitet; gemessen von der anderen Sitzung (`…-kurven-als-wahrheit.md:1165–1166`) |
| Willmore-Energie ∫(H² − K) dA | Minimierung mit natürlichen Übergangsbedingungen; **nicht eindeutig, wo eine Möbius-Abbildung die Linien fest lässt**. Bei einem Kreis ist das eine einparametrige Schar (das Kugelbüschel durch den Kreis). Sobald die Linien nicht auf einem gemeinsamen Kreis liegen, gibt es keine solche Abbildung mehr | ja: Die Kugel hat Energie 0; liegen die Linien auf einer Kugel und nicht auf einem Kreis, ist sie das einzige absolute Minimum | Invarianz und Minimum: Übersicht Willmore-Energie (gelesen); der Rest abgeleitet |
| Kleinste Krümmungsänderung (Moreton & Séquin) | wie Willmore mehrdeutig beim einzelnen Ring (Kugeln kosten nichts) | ja | Baran & Lehtinen (gelesen): Energie null für die Kugel, Kreisquerschnitt beim Zylinder; Stanko 2016 (gelesen): erlaubt Normalen und Hauptkrümmungen an Kurven, ist aber stark nichtlinear |

Zusätzlich abgeleitet: Die größenfreien Energien (Willmore, ΔH = 0) haben **keine Vorliebe für eine Größe**. Eine Kappe zwischen
Linien darf sich fast kostenlos aufblasen. Das passt zu den Fällen „bläst sich auf“ und „läuft weg“ auf der Planseite und zu
Andrews 2013 (gelesen, Bild 5.2): FiberMesh läuft dort in einem einfachen Fall ins Unendliche.

### 2.4 Warum die Aussage beim heutigen Löser trotzdem praktisch stimmt (gelesen im Code, Größenordnung vermutet)

- Jeder Punkt hat eine Laplace-Zeile, auch die Linienpunkte (`ausKurven.ts:268–285`); die Linienpunkte hängen zusätzlich mit
  Gewicht 100 an ihrem Ziel (`:225`, `:300`).
- Linienpunkte sind Quellen der Krümmung (`:362–371`) und behalten jede Runde den Wert, der gerade an der Haut gemessen wird
  (`:718`, `:812–813`). Ihre eigene Laplace-Zeile bekommt denselben Wert als Ziel (`:936`). Am Stillstand ist diese Zeile immer
  erfüllt, sie verlangt nichts.
- Damit steckt die Bedingung „knickfrei über die Linie“ nur in einer einzigen gemessenen Zahl am Linienpunkt. Ein kleiner Knick
  und eine echte Wölbung sind in dieser Zahl nicht zu unterscheiden. Grobe Rechnung (vermutet): Bei 8 Einheiten Kantenlänge
  entspricht ein Knick von rund 6° derselben Messzahl wie die ganze Krümmung der Kugel mit Radius 150. Auf den sehr kurzen Kanten
  neben eingesetzten Linien wird es entsprechend schlimmer; die Planseite misst dort 9–225 % (`:942–946`).
- Folge: Bei endlicher Kantenlänge hat der Löser an jeder Linie eine fast freie Richtung. Wo er darin zur Ruhe kommt, hängt vom
  Netz ab. Das ist eine Eigenschaft **dieser Rechenweise**, nicht der Gleichung.

Dass die sauber gekoppelte Variante („Krümmung an den Linien mitgelöst“, Planseite Abschnitt 18) nach dem Einschwingen steht
und beim einzelnen Ring genau eine Kugel aus dem Büschel liefert, passt zu dieser Lesart.

### 2.5 Was macht die Lösung eindeutig?

| Zusatz | Wirkung | Preis | Stand bei uns |
| --- | --- | --- | --- |
| Normale an den Linien | macht jede Seite für sich bestimmt | die Normale muss stimmen; zwischen Kreuzungen ist sie eine Annahme | gemessen (Abschnitt 15): eindeutig, aber die Messung je Seite war nicht robust |
| Netz aus mindestens zwei sich kreuzenden Loops | nimmt die Kugelschar weg (abgeleitet) | keiner | im Editor der Normalfall; die Kuppel-Probe prüft den Sonderfall |
| Feste Metrik (lineares System) | eindeutig, sofort | flach zwischen den Linien, außer mit Richtung oder Gedächtnis | Gedächtnis-Löser `HautZiele` |
| Flächenspannung, Volumen (Helfrich-Energie) | bricht die Größenfreiheit | zwei Stellgrößen; die Kugel bleibt nur bei passendem Druck Kugel (Gedächtnis, nicht gelesen) | nicht gebaut; ich empfehle es nicht |
| Bindung an den letzten Stand (Dämpfung, „so gebogen wie jetzt“) | hält die Form ruhig | Form hängt vom Weg ab, kriecht | heute im Löser (`ausKurven.ts:73`, `:80`, `:941`) |

### 2.6 Urteil zu Frage 1

- **Richtig** ist: Schneider & Kobbelt verlangen Lage und Normale; der heutige Löser legt die Form zwischen den Linien nicht
  fest; mit vorgegebener Richtung wird sie eindeutig.
- **Zu grob** ist der Satz als allgemeine Mathematik. Für innere Linien ersetzt der knickfreie Übergang die Normale. Unendlich
  viele Formen gibt es nur (a) beim einzelnen Kreis und (b) als Folge der Rechenweise, die Knick und Krümmung an der Linie in
  einer Messzahl vermengt.
- **Folge für die Planung:** Der Beweis „Linien mit Richtung“ hat versucht, die Normale über dieselbe Messstelle einzubringen,
  die schon das Problem war. Die Bilanz erkennt das Muster selbst (`…-kurven-als-wahrheit.md:1028–1029`). Die Literatur bringt
  die Richtung anders ein: als Daten auf der rechten Seite eines linearen Systems (Abschnitt 3).

## 3. Frage 2: Lineare und fast lineare Verfahren

| Verfahren | Was wird gelöst | Woher kommt die Rundung | Richtung/Krümmung an Kurven | Netzunabhängig | Grenzen |
| --- | --- | --- | --- | --- | --- |
| Least-squares Meshes (2004) | Δ²x = 0 mit gleich gewichtetem Laplace, Lagen als Bindung (nach FiberMesh; Original nicht gelesen) | gar nicht | keine | nein | flach bei ebenen Linien; Krümmung sammelt sich an den Linien (FiberMesh 3.2, gelesen) |
| Botsch & Kobbelt 2004 | Δᵏx = 0 im Stützbereich, k = 1…3; Antwort auf den Griff als **vorab gerechnete Basisfunktionen**, daher Echtzeit auch bei großen Netzen | aus der alten Fläche (es ist ein Verformungswerkzeug) | Randglätte C⁰ bis C² über k + 1 Ringe fester Punkte | Laplace nach der Geometrie möglich | braucht Ringe fester Punkte statt Linien; an Kreuzungen von Linien unklar (Stanko 2016, gelesen) |
| Repoussé / Patent US 8,334,868 | **ein** dünn besetztes lineares System Δ²x = 0; Kotangens-Gewichte einmal auf dem flachen Netz gerechnet und festgehalten | mittlere Krümmung an Randpunkten als Stellgröße; sie wirkt als Kraft längs der **Anfangs**normale | Lage glatt oder scharf (Gewicht 0…1), Krümmung als Zahl | nur so gut wie das feste Bezugsnetz | laut Patent kann die Näherung deutlich von der richtigen Lösung abweichen; fällt bei ebenen Stützpunkten in die Ebene; Dehnung zählt wie Krümmung |
| Patente US 8,379,018 und US 8,773,431 (Carr, Joshi, Andrews) | dasselbe System; Rücksubstitution, wenn sich nur die rechte Seite ändert | **Normalenbindung** über Hilfspunkte neben der Kurve: ein Winkel und eine „Streckung“, die laut Patent wie das Schieben eines Bézier-Punkts längs der Tangente wirkt | Normalen auch an inneren Kurven, je Seite verschieden für Kanten | wie oben | nicht so glatt wie die nichtlineare Lösung; keine Zeiten genannt |
| Andrews, Joshi, Carr 2011 | lineares System höherer Laplace-Ordnung (nur Abstract gelesen) | neue Form der **Cauchy-Bindung** (Lage und Ableitung quer), hergeleitet aus der Verwandtschaft mit Hermite-Splines | ja, das ist der Kern | nicht geprüft | Volltext nicht gelesen |
| Andrews 2013, Kap. 5 | Δᵏp = 0, k = 2 oder 3; Kotangens-Gewichte durch Voronoi-Fläche, im festen Ausgangsgebiet gerechnet und festgehalten; Cholesky | aus dem Ausgangsnetz; mit Δᵏp = Δᵏp_alt bleibt Detail erhalten | — | Ausgangsnetz als Gebiet | k = 2 lässt Röhren leicht einfallen, k = 3 nicht; ebene Stützpunkte geben eine Falte |
| Jacobson u. a. 2010 | bi- und triharmonisch mit linearen Elementen und Hilfsgröße (gemischte Elemente) | — | Kurve mit Lage; Kurve mit Lage und Tangenten; Bereich; Kurve mit Krümmungen führt zu singulären Systemen (Folien) | biharmonisch fast optimale Konvergenz (Folien) | nur Folien gelesen |
| Stein u. a. 2018 / 2020 | Hesse-Energie statt Laplace im Quadrat | — | natürliche Randbedingungen: „am Rand so linear wie möglich“ | Konvergenzversuche | betrifft offene Ränder; auf geschlossenen Flächen verhält sich Laplace im Quadrat gut (2020, 7.1) |
| **Stanko u. a. 2016** | drei lineare Schritte: (1) Normalen von den Kurven biharmonisch über das Netz, (2) mittlere Krümmung aus diesen Normalen, (3) Lagen aus min ‖L²V‖² + w₁‖LV − 2Hn‖² mit Kurven fest | aus den **Normalen an den Kurven** | Normalen sind Eingabe (dort von Sensoren) | Kotangens-Laplace der ebenen Vernetzung je Feld, festgehalten | geschlossenes Kurvennetz nötig; Gewicht w₁ = 15 000 in den Beispielen; rund 0,1 s für 10 000 Punkte und 1 000 Bindungen; Kugel-Beispiel mit Krümmung 0,97–1,03 (Skala in Bild 2) |
| Baran & Lehtinen 2009 (Grundlage von Monster Mash) | Poisson-Gleichung ∇²h = −4 über dem ebenen Gebiet, dann z = √h | aus der Wurzel: Kreisscheibe gibt genau die Kugel, Streifen eine Ellipse | Normale am Umriss liegt von selbst in der Zeichenebene | geschlossene Formel | nur Höhenfeld über einer ebenen Zeichnung; für freie Flächen offen (steht so in den Notizen) |

**Was passt zu „Linien fest, dazwischen so rund wie möglich, Kugel bleibt Kugel“?**

- Ohne Richtung und ohne Gedächtnis: **keines** der linearen Verfahren. Das ist belegt (FiberMesh, Andrews, Stanko) und folgt aus
  der Rechnung in 2.3.
- Mit Richtung: Stanko 2016 und die Adobe-Familie. Die Kugel wird im gelesenen Beispiel bis auf etwa 3 % der Krümmung getroffen,
  nicht genau.
- Wichtig für uns: In diesen Systemen ist „wie stark wölbt sich die Haut zwischen zwei Linien“ **eine Angabe** (Streckung der
  Hilfspunkte, Gewicht, Betrag der Querableitung), kein Ergebnis. Bei Florians Rüssel aus zwei Profillinien entscheidet genau
  diese Angabe über flach oder rund. Die Planseite hat dasselbe von der anderen Seite gefunden („quer trägt die Linie nichts“,
  `:938–941`).
- FiberMesh hat die linearen Verfahren aus genau diesem Grund verworfen und schreibt, das Problem ließe sich lösen, wenn der
  Nutzer Normalen an den Kurven vorgäbe; das wollten sie der Bedienung nicht zumuten (3.2, gelesen). Bei uns liegt die Richtung
  aus dem Liniennetz schon vor (`dicht/richtung.ts:1–9`, Kugel mit drei Loops höchstens 0,52° daneben laut Planseite `:986`).

## 4. Frage 3: Netzunabhängige Diskretisierungen

| Baustein | Aussage | Stabilität ohne Normalen an Kurven |
| --- | --- | --- |
| Kotangens + Masse auf der intrinsischen Delaunay-Triangulierung (Bobenko & Springborn; Sharp & Crane) | Der Operator hängt nur von der inneren Geometrie ab, die Kantengewichte sind nicht negativ; Sharp & Crane liefern das auch für sehr schlechte Netze (Abstracts, gelesen) | keine Aussage. Es ist ein Maß, kein Löser. Die andere Sitzung hat das mit `dicht/intrinsisch.ts` schon; ich habe dazu nichts Besseres gefunden |
| Gleich gewichteter Laplace (FiberMesh, unser Standard) | FiberMesh schreibt selbst, das Ergebnis sei nicht ganz unabhängig von der Vernetzung (3.2, gelesen) | stabil, weil er nicht auf die Geometrie reagiert |
| Diskrete quadratische Krümmungsenergien (Wardetzky u. a. 2007) | Unter der Annahme fast längentreuer Verformung ist die Biegeenergie quadratisch in den Lagen, die Hesse-Matrix konstant und einmal zerlegbar; als Kern eines ungenauen Newton-Verfahrens für den Willmore-Fluss: 16 Schritte in 7,5 s bei 44 928 Dreiecken (2006) | Der Text nennt als Geltungsbereich geschlossene Flächen und Ränder mit Lage **und** Normale (3.2, gelesen). Eine Aussage „ohne Normalen instabil“ habe ich dort nicht gefunden; sie stammt aus FiberMesh, das dieses Verfahren mit Kurven ohne Normalen ausprobiert hat und es langsamer und instabil fand |
| Konformer Willmore-Fluss (Crane u. a. 2013) | Rechnet im Krümmungsraum, stabil für Zeitschritte unter 1 auch auf unregelmäßigen Netzen, ohne Neuvernetzen (Projektseite über Suchtreffer) | Bindungen der Lage an Kurven sind dort nicht vorgesehen (Gedächtnis, nicht gelesen). Für feste Linien ungeeignet |
| Diskrete Schalen / Scharnier-Energie (Grinspun u. a. 2003, 2006) | Das Scharniermodell hängt vom Netz ab und konvergiert auf allgemeinen Netzen nicht gegen den vollen Krümmungsoperator (Zusammenfassungen zu Grinspun 2006) | — |
| Unterteilungsflächen als Ansatzfunktionen (Cirak u. a. 2000) | Loop-Unterteilung gibt Verschiebungsfelder mit endlicher Biegeenergie; Unbekannte sind nur Punktlagen, keine Drehungen; optimale Konvergenz in den Standardtests; Knicke und Ränder über angepasste Regeln (Abstract, gelesen) | In diesem Rechenraum ist „knickfrei über die Linie“ eingebaut statt gemessen (abgeleitet). Das ist die saubere Form von 2.2, verlangt aber ein Kontrollnetz |
| Halbscharfe Kanten (DeRose u. a. 1998) | Schärfe als Zahl von Unterteilungsschritten mit scharfer Regel (Gedächtnis) | macht „Härte 0–3“ netzunabhängig; die Bilanz sieht das auch (`…-bilanz-wesen-editor.md:269`) |

Kurz: Für das Maß ist die andere Sitzung auf dem Stand der Literatur. Die Literatur bietet keinen netzunabhängigen
**nichtlinearen** Löser, der mit Linien ohne Normalen als interaktiv und stabil beschrieben wäre. Andrews 2013 schreibt
ausdrücklich, ihm sei kein interaktiver nichtlinearer Löser bekannt, der immer konvergiert (5.1.1, gelesen).

## 5. Frage 4: Flächen über Kurvennetzen aus der Skizzen-Forschung

| Arbeit | Woher die Normalen | Ergebnis | Tempo, live? |
| --- | --- | --- | --- |
| CrossShade 2012 | an Kreuzungen von Querschnittslinien, dann längs und zwischen den Linien weitergereicht (nach der Recherche vom 09.11., heute nicht neu gelesen) | Normalenfeld zum Schattieren einer 2D-Skizze, keine 3D-Fläche | nicht geprüft |
| True2Form 2014 | — | nur 3D-**Kurven** aus der 2D-Skizze (Projektseite, gelesen) | keine Angabe |
| Bessmeltsev u. a. 2012 | aus Flusslinien zwischen passenden Kurvenstücken | Vierecksnetz über geschlossenen 3D-Kurven (Abstract) | keine Laufzeit gefunden |
| Pan u. a. 2015 | Flusslinien des Netzes geben die Hauptkrümmungsrichtungen vor; das Netz wird angepasst, bis das Krümmungsfeld dazu passt (Projektseite, gelesen) | glatte Fläche | Verfahren mit Anpassen des Netzes; keine Laufzeit gefunden, nichts deutet auf live |
| Stanko u. a. 2016 | Eingabe (Sensoren) | glatte Fläche über geschlossenem Netz | rund 0,1 s bei 10 000 Punkten; die Autoren nennen es interaktiv und planen schrittweises Hinzufügen von Kurven (gelesen) |
| CASSIE 2021 | — | Flächenstücke je erkanntem Zyklus, nur C⁰, während des Zeichnens (Projektseite, gelesen) | live, aber nicht glatt über die Linien |

Kurz: Live und glatt zugleich ist in dieser Reihe nur der lineare Weg mit gegebenen Normalen (Stanko). Die Arbeiten, die
Normalen aus den Kurven gewinnen, tun das an Kreuzungen und reichen sie längs der Linien weiter. So arbeitet auch
`dicht/richtung.ts`.

## 6. Frage 5: Krümmung aus den Kurven selbst (Euler, Meusnier)

- **Was eine Linie mit Richtung hergibt (abgeleitet, Lehrbuchstoff):** Kennt man längs einer Linie die Flächennormale, so liefert
  die Linie zwei der drei Zahlen der Krümmung an jedem Punkt: die Normalkrümmung längs der Linie und die geodätische Torsion (wie
  schnell die Normale um die Linie dreht). Die dritte Zahl, die Krümmung quer, fehlt.
- **An einer Kreuzung** liefert die zweite Linie die fehlende Zahl. Bei rechtem Winkel ist die mittlere Krümmung einfach das
  Mittel der beiden Normalkrümmungen (Satz von Euler). Bei schiefem Winkel braucht man die Torsion dazu; dann sind es vier Zahlen
  für drei Unbekannte, eine bleibt als Gegenprobe.
- **Zwei Richtungen allein bestimmen die Krümmung nicht.** Schneider & Kobbelt schätzen die Krümmung über den Satz von Euler aus
  den Kantenrichtungen (nach Moreton & Séquin) und beweisen, dass die Schätzung genau dann versagt, wenn alle Richtungen auf zwei
  Geraden liegen (Lemma 1, gelesen). Zwei kreuzende Linien sind genau dieser Fall.
- **Zwei kreuzende glatte Linien widersprechen sich nie.** In der CAD-Literatur heißt die Verträglichkeitsbedingung an Knoten
  „vertex enclosure“; sie hängt mit dem Satz von Euler zusammen und ist bei vier Ästen in X-Form von selbst erfüllt (Hermann,
  Peters, Strotman 2009, Lemma 3, gelesen). Unsere Kreuzungen sind X-Formen.
- **Was die Literatur daraus macht:** ein Krümmungsmaß am Netzpunkt (Moreton & Séquin, Schneider & Kobbelt) und eine
  Zulässigkeitsprüfung für Kurvennetze vor dem Flächenbau (CAD). Ein Verfahren, das aus Kreuzungen allein die Krümmung längs
  ganzer Linien gewinnt, habe ich nicht gefunden.
- **Folge:** Der Befund der Planseite, dass eine Linie quer nichts trägt (`:938–941`), ist richtig und durch die Literatur
  gedeckt. Aus den Linien allein ist die Krümmung nur an Kreuzungen vollständig. Zwischen den Kreuzungen muss jemand entscheiden:
  die Haut (heute), eine Regel, oder ein Normalenfeld (Kandidat 1).

## 7. Rangliste

Vor jedem Kandidaten steht, was die Planseite dazu schon gemessen hat.

### 1. Linear aus Linien mit Richtung („die Form ist eine Funktion der Linien“)

- **Idee.** Die Richtung an den Linien kommt wie heute aus dem Liniennetz (`dicht/richtung.ts`). Daraus entstehen in zwei bis drei
  vorab zerlegten linearen Lösungen erst die Normalen der ganzen Haut, dann die Wölbung, dann die Lagen (Stanko u. a. 2016; im
  Geist auch Andrews/Joshi/Carr 2011 und die Adobe-Patente). An der Haut wird nichts mehr abgelesen, Runden gibt es nicht.
- **Schon gemessen?** Nein. Die Recherche nennt den Weg als Rückfall (`…-fibermesh-monstermash-richtung.md:129`, `:145`), der
  Beweis vom 09.11. wurde davor angehalten. Gemessen und verworfen wurde etwas anderes: die Richtung über die Krümmungsmessung je
  Seite (Abschnitt 15) und die Krümmung aus der Linie mit „quer wie längs“ (Abschnitt 13, Anlauf 1).
- **Nachjustieren nach dem Loslassen:** entfällt der Bauart nach, solange der Operator steht. Dieselben Linien geben dieselbe
  Haut, hin und zurück genau. Eine umgestülpte Stelle kann sich nicht selbst bestätigen, weil außen von den Linien kommt. Offen
  (vermutet): Wird der Operator aus der verformten Haut neu gebaut (Verfeinern, nächstes Greifen), ändert sich die Lösung um
  den Anteil der Metrik. Das ist die Stelle, an der ein kleiner Rest bleiben kann.
- **Ungenau und stockend:** je Mausbewegung zwei bis drei Rücksubstitutionen, also etwa der Aufwand einer heutigen Runde, aber
  jedes Bild fertig. Stanko nennt rund 0,1 s für 10 000 Punkte samt Aufbau (2016).
- **Belegte Grenzen.** Die Kugel wird nur genähert (Krümmung 0,97–1,03 im Beispiel). Das Bezugsnetz ist fest, die Patente
  warnen vor deutlichen Abweichungen bei starker Dehnung. Ein Gewicht ist zu wählen (15 000 bei Stanko). Linien ohne Kreuzung
  haben keine eigene Richtung. **Bruchstelle:** ein Rüssel aus zwei Profillinien; dazwischen zeigen die Normalen der Linien
  gegeneinander, die Wölbung quer ist in linearen Systemen eine Angabe (Abschnitt 3). Ohne gute Antwort darauf wird der Rüssel
  flach.
- **Aufwand grob:** Kern-Probe ein Tag (Bausteine vorhanden: `linienRichtung`, `normalSystemZerlegt`, `intrinsischeGewichte`,
  Prüffälle); Einbau ins Fenster drei bis fünf Tage (Schätzung).
- **Messung für einen Tag (nur Kern, kein Fenster):**
  1. Kugel mit drei Loops, nichts gezogen: größter Abstand vom Radius 150 und Streuung der Krümmung. Kriterium ≤ 0,5 Einheiten.
  2. Hals, Ohr, Rüssel mit den Zielen aus `form-netzunabhaengig.ts`: dieselbe Rechnung auf 6 000, 12 000 und 24 000 Dreiecken
     und auf dem Netz beim Greifen gegen das verdichtete. Kriterium ≤ 0,5 Einheiten.
  3. Operator aus dem Ergebnis neu bauen und noch einmal lösen, dreimal: Wie weit bewegt sich die Haut je Durchgang? Das ist
     das verbleibende Nachjustieren. Kriterium ≤ ½ Bildpunkt nach dem ersten Durchgang.
  4. Rüssel-Querschnitt: Höhe zu Breite. Kriterium ≥ 0,8. Dazu die Ohrspitze gegen den heutigen fertig gerechneten Stand.
  5. Hörner 170: umgestülpte Dreiecke zählen.
  6. Rücksubstitutionen je Mausschritt zählen (statt Zeiten).
  - Verwerfen, wenn 1 über 2 Einheiten liegt oder 4 unter 0,5 bleibt. Dann taugt der Weg höchstens als Vorhersage (Kandidat 3).

### 2. Zwei Netzebenen für die Runden (Mehrgitter nach Schneider & Kobbelt)

- **Idee.** Die Runden des heutigen Wegs „nach der Geometrie“ laufen auf einem gröberen Netz, wo eine Runde einen Bruchteil
  kostet; die feine Haut folgt über die vorhandene Einbettung (`dicht/einbettung.ts:131`, `:239`) und bekommt nur eine glättende
  Runde. Schneider & Kobbelt bauen ihr Verfahren genau so auf und begründen es damit, dass schon ein grobes Netz die Form trifft
  (Abschnitt 7.4, gelesen).
- **Schon gemessen?** Nein (Suche nach „Mehrgitter“ auf der Planseite: kein Treffer). Die Voraussetzung ist gemessen: Mit dem Maß
  nach der Geometrie liegen 6 000 und 12 000 Dreiecke nur 0,51 und 0,26 Einheiten neben 24 000 (`…-kurven-als-wahrheit.md:677`);
  mit gleichen Gewichten gilt das nicht (0,86 und 3,64).
- **Nachjustieren:** Die Form bleibt dieselbe wie beim besten gemessenen Stand; kleiner wird das Nachhinken. Rechnung
  (vermutet): Holt eine Runde am Ohr 0,65–0,77 auf (`:758–759`), dann bleiben nach vier groben Runden je Bewegung etwa 0,2–0,35
  statt 0,65–0,77 des Fehlers.
- **Ungenau und stockend:** mehr Runden je Bewegung ohne schnelleren Rechenkern; es ergänzt die Tempo-Empfehlung der Bilanz.
- **Belegte Grenzen.** Bei Schneider & Kobbelt war es trotz Mehrgitter nicht interaktiv (Sekunden, 2001). Die Linien müssen auch
  auf dem groben Netz liegen; an der Rüsselspitze weichen grob und fein um 2,5 Einheiten ab (`:680`). Mehr Mechanik.
- **Aufwand grob:** Kern-Probe zwei Tage, Einbau eine Woche (Schätzung).
- **Messung für einen Tag:** Ohr und Rüssel, 30 Mausschritte im Kern. Variante A wie heute (eine feine Runde), Variante B (k grobe
  Runden, Übertrag, eine feine Runde). Aufwand als Zahl der Rücksubstitutionen mal Nichtnull-Einträge der Zerlegung, nicht als
  Zeit. Kriterien: Nachhinken höchstens ein Drittel bei gleichem Aufwand; Rest nach einer feinen Runde ≤ ½ Bildpunkt.

### 3. Sofort-Antwort aus vorab gerechneten Basisfunktionen je Bézier-Punkt

- **Idee.** Beim Greifen wird für jeden Punkt, der sich bewegen kann (Anker oder Griff, ein bis vier Stück), einmal die Antwort
  der Haut auf eine Einheitsverschiebung gelöst. Während des Zugs ist die Haut dann Ausgangslage plus Antwort mal Verschiebung,
  ohne Löser im Bild; der eigentliche Löser korrigiert im Hintergrund. So erreichen Botsch & Kobbelt 2004 Echtzeit auch bei
  großen Netzen (Abstract und Abschnitt 3, gelesen).
- **Schon gemessen?** Nein. Verwandt und verworfen sind Schwung und Anderson-Beschleunigung (`:716`, `:904`); das waren
  Beschleuniger der Runden, keine Vorhersage aus dem Griff.
- **Nachjustieren:** wird nicht beseitigt. Sichtbar bleibt der Abstand zwischen Vorhersage und fertig gerechneter Haut.
- **Ungenau und stockend:** kein Stocken mehr, auch bei 26 000 Punkten, weil je Bild nur Vektoren addiert werden.
- **Grenzen.** Die Vorhersage ist linear und entspricht dem Gedächtnis-Löser; wie weit sie vom Löser „aus den Kurven“ abliegt,
  ist nicht gemessen (vermutet: bei kleinen Griffbewegungen wenig, bei weiten Zügen viel).
- **Aufwand grob:** zwei bis drei Tage.
- **Messung für einen Tag:** für Hals, Ohr und einen Griffzug den Abstand Vorhersage gegen fertig gerechnet bei 5, 20 und 70
  Einheiten Verschiebung. Kriterium: ≤ ½ Bildpunkt bis 20 Einheiten. Sonst verwerfen.

### 4. Krümmung an den Kreuzungen aus den Linien als feste Stützwerte

- **Idee.** An jeder Kreuzung folgt die mittlere Krümmung aus den beiden Linien und ihrer Richtung (Abschnitt 6). Diese Werte
  werden nicht mehr an der Haut gemessen, sondern stehen fest. Zwischen den Kreuzungen bleibt der Löser wie heute.
- **Schon gemessen?** Teilweise. Mit überall festen Linienwerten steht der Löser nach drei Runden (`:890`); „quer wie längs“ ist
  verworfen (`:931`); „von kreuzenden Linien“ wird als Möglichkeit genannt (`:940`), gebaut wurde es nicht.
- **Versprechen:** klein. Es nimmt die Messung an den Stellen weg, an denen das Netz am unruhigsten ist (dort treffen zwei
  eingesetzte Linien zusammen), und verankert die Höhe der Krümmung. Gegen Nachhinken hilft es nur, wenn die Kreuzungen den
  Fehler tragen (vermutet).
- **Belegte Grenzen.** Zwischen den Kreuzungen gibt es aus den Linien nichts (Schneider & Kobbelt Lemma 1; Hermann u. a. Lemma 3).
  Ohrspitze und Rüssel liegen fern von Kreuzungen.
- **Aufwand grob:** ein Tag.
- **Messung für einen Tag:** Kugel mit drei Loops: Krümmung an den sechs Kreuzungen aus den Linien gegen 1/R (Kriterium ±3 %).
  Dann Ohr und Hals mit festen Kreuzungswerten: Runden bis zum Stillstand und Sprung nach dem Verfeinern gegen heute.

### 5. Unterteilungsfläche als Rechenraum (langfristig)

- **Idee.** Die Haut ist die Grenzfläche einer Loop-Unterteilung, gerechnet wird in deren Ansatzfunktionen (Cirak u. a. 2000),
  Kanten über Knickregeln (DeRose u. a. 1998). Knickfreiheit über die Linien ist dann eingebaut statt gemessen, und gleichmäßiges
  Verfeinern nach der Unterteilungsregel ändert die Grenzfläche gar nicht (Eigenschaft der Unterteilung, Gedächtnis).
- **Schon geprüft?** Die Bilanz verwirft den „Käfig aus dem Kurvennetz“ für die Form (`…-bilanz-wesen-editor.md:268`). Das hier
  ist etwas anderes: Das dichte Netz selbst wäre das Kontrollnetz, nicht ein grober Käfig aus Feldern.
- **Versprechen:** trifft Florians Frage aus Abschnitt 17 („warum nimmt das verdichtete Netz eine andere Form an?“) an der
  Wurzel; immer glatt bei jedem Zoom; Härte 0–3 würde echt.
- **Grenzen.** Örtliches Verfeinern ist in diesem Rahmen schwer (Gedächtnis: braucht hierarchische Ansätze). Linien müssten als
  Bindungen an die Grenzlage formuliert werden. Die Runden für „so rund wie möglich“ bleiben. Großer Umbau.
- **Aufwand grob:** Wochen.
- **Messung für einen Tag:** entscheidet den Weg nicht. Kleinster sinnvoller Test: die Krümmung an Linienpunkten aus den
  Grenzflächen-Masken statt aus dem Ein-Ring lesen (Kugel mit drei Loops; heute 9–225 %, `:942`). Kriterium 90–110 %.

## 8. Geprüft und nicht empfohlen

| Weg | Warum nicht | Beleg |
| --- | --- | --- |
| Willmore-Energie mit ungenauem Newton und fester Hesse-Matrix | FiberMesh hat genau das im selben Einsatz versucht: deutlich langsamer, mit Kurven ohne Normalen instabil; die eigenen Messungen mit Operator nach der Geometrie zeigen dasselbe | FiberMesh 3.2 (gelesen); Planseite Abschnitte 9, 12, 18 |
| Konformer Willmore-Fluss | arbeitet im Krümmungsraum, feste Linien passen nicht hinein | Projektseite (gelesen), Rest Gedächtnis |
| Flächenspannung oder Volumen als Zusatzterm | bricht die Mehrdeutigkeit, bringt aber Regler, und die Kugel bleibt nur bei passendem Druck Kugel | Gedächtnis, nicht gelesen |
| Lineares System ohne Richtung (auch triharmonisch) | flach zwischen den Linien; Sprünge der Krümmung an Kreuzungen | FiberMesh, Andrews 2013, Stanko 2016 (gelesen) |
| Poisson und Wurzel (Monster Mash) für freie 3D-Linien | nur für Höhenfelder über einer ebenen Zeichnung hergeleitet | Baran & Lehtinen (gelesen) |
| Implizite Flächen, CAD-Flächenstücke | schon in der Recherche vom 09.11. mit Grund verworfen; nichts gefunden, das dem widerspricht | `…-fibermesh-monstermash-richtung.md:126–127` |

## 9. Was die andere Sitzung sauber gelöst oder richtig erkannt hat

- FiberMesh rechnet in Runden, hält die Form mit einer Bindung an den letzten Stand, ist nicht ganz netzunabhängig und lief mit
  600–2000 Punkten: stimmt mit dem Volltext überein (3.2, 4).
- „Quer trägt die Linie nichts“: richtig, von der Literatur gedeckt (Abschnitt 6).
- Intrinsische Delaunay-Triangulierung mit Kotangens-Gewichten ist die Standardantwort auf Netzabhängigkeit.
- Die Kuppel über einem Ring ist als Test mehrdeutig (Bilanz 4.2): richtig; die Ursache ist die Kugelschar durch einen Kreis.
- Neue Punkte beim Verdichten liegen auf einer gewölbten Kurve nach den Endnormalen, nicht auf der Sehne
  (`dicht/verdichten.ts:275`). Daran liegt der Sprung also nicht.

## 10. Was ich nicht prüfen konnte

- Den Volltext von Andrews, Joshi, Carr 2011. Meine Aussagen dazu stützen sich auf den Abstract, die Dissertation des Erstautors
  und drei Patente derselben Gruppe. Wie die Cauchy-Bindung dort genau gebaut ist und ob eine Kugel getroffen wird, weiß ich
  nicht.
- Least-squares Meshes, Jacobson u. a. 2010, Crane u. a. 2013, Pan u. a. 2015 und CASSIE im Volltext; Laufzeiten von Pan und
  Bessmeltsev.
- Ob Stankos Skala 0,97–1,03 in Bild 2 zu seinem Verfahren oder zum Vergleichsbild gehört, ist aus dem ausgelesenen Text nicht
  sicher; ich lese sie als Wert seines Verfahrens.
- Alles unter „vermutet“ und „abgeleitet“ für unseren Editor, vor allem die Größenordnung in 2.4 und das Verhalten von
  Kandidat 1 am Rüssel. Ich habe nichts gemessen.

## 11. Quellen

- R. Schneider, L. Kobbelt: Geometric fairing of irregular meshes for free-form surface design. CAGD 18(4), 2001.
  https://graphics.rwth-aachen.de/media/papers/geom_fair1.pdf
- A. Nealen, T. Igarashi, O. Sorkine, M. Alexa: FiberMesh. SIGGRAPH 2007.
  https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf
- J. Andrews, P. Joshi, N. Carr: A Linear Variational System for Modelling From Curves. CGF 30(6), 2011.
  https://diglib.eg.org/handle/10.1111/v30i6pp1850-1861 (nur Abstract)
- J. Andrews: User-Guided Inverse 3D Modeling. Dissertation, UC Berkeley 2013.
  https://www2.eecs.berkeley.edu/Pubs/TechRpts/2013/EECS-2013-103.pdf
- Adobe-Patente: https://patents.google.com/patent/US8379018B2/en · https://patents.google.com/patent/US8334868B2/en ·
  https://patents.google.com/patent/US8773431B2/en
- I. Baran, J. Lehtinen: Notes on Inflating Curves. 2009.
  https://www.alecjacobson.com/weblog/media/notes-on-inflating-curves-2009-baran.pdf
- M. Botsch, L. Kobbelt: An Intuitive Framework for Real-Time Freeform Modeling. SIGGRAPH 2004.
  https://graphics.rwth-aachen.de/media/papers/modeling1.pdf
- A. Jacobson, E. Tosun, O. Sorkine, D. Zorin: Mixed Finite Elements for Variational Surface Modeling. SGP 2010 (Folien).
  https://sambuz.com/doc/mixed-finite-elements-for-variational-surface-modeling-ppt-presentation-718638
- O. Stein, E. Grinspun, M. Wardetzky, A. Jacobson: Natural Boundary Conditions for Smoothing in Geometry Processing. 2018.
  https://arxiv.org/abs/1707.04348
- O. Stein u. a.: A Smoothness Energy without Boundary Distortion for Curved Surfaces. ACM TOG 2020.
  https://alecjacobson.com/images/a-smoothness-energy-without-boundary-distortion-for-curved-surfaces-acm-tog-compressed-stein-et-al-2020.pdf
- M. Wardetzky, M. Bergou, D. Harmon, D. Zorin, E. Grinspun: Discrete Quadratic Curvature Energies. CAGD 2007.
  https://www.cs.columbia.edu/cg/pdfs/1166238667-bendingCAGD.pdf
- T. Stanko, S. Hahmann, G.-P. Bonneau, N. Saguin-Sprynski: Smooth Interpolation of Curve Networks with Surface Normals.
  Eurographics 2016 Short Papers. http://tiborstanko.sk/assets/2016-eg.pdf
- T. Hermann, J. Peters, T. Strotman: A Geometric Criterion for Smooth Interpolation of Curve Networks. SPM 2009.
  https://www.cise.ufl.edu/research/SurfLab/papers/08tamtim.pdf
- K. Crane, U. Pinkall, P. Schröder: Robust Fairing via Conformal Curvature Flow. SIGGRAPH 2013.
  https://www.cs.cmu.edu/~kmcrane/Projects/ConformalWillmoreFlow/
- A. Bobenko, B. Springborn: A Discrete Laplace-Beltrami Operator for Simplicial Surfaces. https://arxiv.org/abs/math/0503219
- N. Sharp, K. Crane: A Laplacian for Nonmanifold Triangle Meshes. SGP 2020. https://diglib.eg.org/handle/10.1111/cgf14069
- F. Cirak, M. Ortiz, P. Schröder: Subdivision surfaces: a new paradigm for thin-shell finite-element analysis. 2000.
  https://resolver.caltech.edu/CaltechAUTHORS:20171213-090454075
- E. Grinspun, Y. Gingold, J. Reisman, D. Zorin: Computing discrete shape operators on general meshes. 2006.
  https://cragl.cs.gmu.edu/midedge/midedge.pdf
- H. Pan u. a.: Flow Aligned Surfacing of Curve Networks. SIGGRAPH 2015. https://haopan.github.io/curvenet_surfacing.html
- E. Yu u. a.: CASSIE. CHI 2021. https://em-yu.github.io/research/cassie
- B. Xu u. a.: True2Form. SIGGRAPH 2014. https://www.cs.ubc.ca/labs/imager/tr/2014/True2Form/index.htm
- M. Bessmeltsev u. a.: Design-Driven Quadrangulation of Closed 3D Curves. SIGGRAPH Asia 2012.
  https://www.cs.ubc.ca/labs/imager/tr/2012/Quadrangulation
- Willmore-Energie, Übersicht: https://en.wikipedia.org/wiki/Willmore_energy
