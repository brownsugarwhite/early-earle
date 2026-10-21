# Netz und Linien im Ganzen: Gibt es einen noch eleganteren Weg? (Recherche 21.10.2026, spätabends)

> Florian (21.10. spätabends, nach der Recherche „Feldnetz oder Kernring?“): „Betrifft das ganze nur die Maulproblematik oder
> den Aufbau des gesamten Meshs und der Linien? Kannst du nochmal eine ausführliche Recherche machen, ob es nicht noch eine
> elegantere Lösung gibt, die es sich zu testen lohnt. Wir haben jetzt schon mal einen falschen Weg eingeschlagen, und ich
> möchte nicht, dass wir jetzt die Richtung wechseln und dann wieder etwas nicht funktioniert. Recherchiere nach modernen
> Techniken und Verfahren, die uns helfen können, das Ziel zu erreichen.“
>
> Vorgänger: [`2026-10-21-feldnetz-oder-kernring.md`](2026-10-21-feldnetz-oder-kernring.md). Grundlage hier: das
> Kritik-Register (Befunde V1–V6, S5–S7, A5–E2), die Pläne vom 13.10. bis 21.10. und fünf Recherchen zu Flächen aus
> Kurvennetzen, Topologie aus Linien, Form aus drei Ansichten, sauberen Umrisslinien sowie Produktion, Posen und Spiel-Export
> (Quellen am Ende). Kein Code geändert.

## Kurzantwort

1. **Es betrifft das ganze Netz und die Linien.** Das Maul ist nur die Stelle, an der es am deutlichsten wurde (Abschnitt 1).
2. **Es gibt zwei Wurzeln, nicht eine:**
   - **Topologie:** Das Netz entsteht aus festen Vorlagen (Röhre, Streifen, Kappe, Kernring). Jede Linie (Maul, Kante, Ansatz,
     Loop) muss in diese Vorlagen hineingedrückt werden, und jede Lage, die nicht passt, bekommt eine Sonderregel.
   - **Umrisse:** Der Umriss ist heute ein Nebenprodukt der Einpassung („Körper zuerst“): Er liegt dort, wo der Körper am
     breitesten ist. Wo die Haut flach ist, ist das in der Tiefe schlecht bestimmt. Daher kommen die wilden Linien in den fremden
     Blättern und die Umrisse, die in Front und Top nicht sitzen. Zwei Recherchen haben das unabhängig gleich hergeleitet.
3. **Noch eleganter als das Stücknetz allein ist „ein Liniennetz, ein Löser“:**
   - Die Umrisse kommen zuerst, als geplante 3D-Linien.
   - Umrisse, deine Linien und weiche Hilfslinien aus dem Raster bilden ein Netz.
   - Die Stücke dazwischen werden nach bewiesenen Mustern gefüllt.
   - Ein linearer Löser setzt harte Bedingungen auf alle Linien.
   - Posen und Pinsel hängen an den Linien statt an Punktnummern.
   - Das heutige Raster wird zur Quelle der weichen Linien, der Maul-Einsatz ein Fall davon (Abschnitt 5).
4. **Was nicht passt:**
   - Flächen direkt zwischen den Linien (CAD-Weg): Die Nähte knicken die Farbstufen, und es gibt keine Posen.
   - Ein Feldnetz für den ganzen Körper (QuadWild u. a.): Es braucht Minuten und springt bei kleinen Änderungen.
   - Gelernte Netzerzeuger: Sie sind ungenau.
   - Sichthülle mit Neuvernetzen: Sie hat keine feste Topologie.
5. **Ehrlich:** Jeder Baustein ist veröffentlicht und erprobt, das Gesamtsystem hat noch niemand gebaut. Deshalb kommen zuerst
   drei kurze Beweise mit Abbruchkriterien, zusammen etwa zwei bis zweieinhalb Wochen, danach der Umbau Stück für Stück. Nichts
   wird umgestellt, bevor ein Beweis besteht, und der heutige Stand bleibt als Rückfall (Abschnitt 6).
6. **Reihenfolge:** zuerst P1 „Umriss zuerst“, weil er das Fundament entscheidet und schon nach dem ersten Tag saubere Linien
   zum Ansehen liefert. Danach P2 „Stücknetz im Maulfeld“, dann P3 „Liniennetz am ganzen Körper“.

## 1. Betrifft es nur das Maul? Nein.

Das Maul ist nur die Stelle, an der es am deutlichsten wurde. Dasselbe Muster zieht sich durch das ganze Netz und die
Linien: Eine feste Vorlage wird über die Form gelegt, und jede Lage, die nicht in die Vorlage passt, bekommt eine eigene
Sonderkonstruktion.

| Bereich | Vorlage heute | Sonderkonstruktionen (Auswahl) | offen (Register) |
|---|---|---|---|
| Maul | Kernring: das halbe Maulfeld auf einem Rechteck | Fächer, zwei Stufen, Naht-Umrechnung, Leiter, Spitzen; gut 20 Schalter | Haut-Tor 41 von 43; Rex mittel gerade, Robbe hoch J |
| P-Linien | Reihe oder Ring der Röhre | Einordnen längs/quer/schräg, Treppe, verzogene Reihe, mitgedrehte Ringe (3, 5 oder 8), Endringe, Auslauf über drei Ringe, Höhenfeld | Linie 0,4–2,0 px statt 0,3; Krake bleibt Treppe; „echte Diagonalen bräuchten Pole“ |
| Umrisse Front/Top | Breitenlinie (Reihe N/4), Frontlinie aus Ringstücken, Hüllschnitt je Ring | Fülle wo nötig, Reihenplan, Schultern, „berühren“ | Δ ≤ 0,5 px nur bei Kugel und Ei; Robbe 3,5–4,4 px, Tiger 5,4 px; Frontlinie angehalten |
| Teile und Ansätze | Baum aus Streifen, Fenster, Kragen | Kragen, Klinge, Fensterkehle, Übergang 2:1; Y-Stück und „Kopf als Glied“ fehlen | Krabbe, Krake, Pyramide, Seestern kaputt; Sprung am Gestenende 4–22 px; Ente, Fisch, Giraffe über den Toren |
| Kappen und Ecken | Kappe mit 8 Punkten und Polen | „Kappen nach Endform“ geplant | Würfel 172°, dünne Stadionform 112°, Kappen sind die größte Faltenquelle |
| Loops (⌘R) | neuer Ring der Röhre | formneutral einfügen, Mindest-Einfluss, nur ohne Maul und Beine | Haut am Loop 1,8–4,5 px; mit Maul oder Beinen nicht möglich |
| Augenhöhle | Inset-Schleifen um einen Ringpunkt | eigene Höhle je Auge | Brauenwulst nach drei Anläufen ungelöst |
| Linien in fremden Blättern | Nulldurchgänge von Normale · Blick, geglättet | Strahlpaare, Fit | „sehr sehr wild“ (Florian 20.10.), V2 nicht abgenommen |

Die gemeinsame Ursache: Das Netz entsteht aus wenigen festen Gittern (Röhre, Streifen, Kappe, Kernring), und alles, was eine
Linie ist (Maul, Kante, Umriss, Ansatz, Loop), muss in diese Gitter hineingedrückt werden. Liegt die Linie schräg zum Gitter,
quer zu einer Kappe oder zu dicht an einer anderen, braucht es eine neue Regel.

## 2. Was das Ziel technisch verlangt (Prüfliste für jeden Kandidaten)

Aus den Plänen vom 13.10. (Wesen-Editor 2), 17.10. (Zielbild Vektorillustration), 20.10. (V-Plan) und Teil B (Posen):

1. **Umriss:** In jeder Ansicht liegt der Körper auf der schwarzen Linie, Δ ≤ 0,5 px, außer an echten Widersprüchen der
   Zeichnungen.
2. **Linien:** glatte Vektorkurven mit deinen Knoten, ≤ 0,3 px auf der Haut, derselbe Punkt in allen Ansichten; Silhouette und
   Kantenlinie sind dasselbe Ding mit einer Härte.
3. **Haut:** glatt und schön, Falten nur dort, wo du sie zeichnest; das Netz passt sich jeder Form an.
4. **Bedienung:** wie Blender auf der Bühne und wie Illustrator in den Blättern; ≤ 16 ms je Mausbewegung, ≤ 250 ms am
   Gestenende; das Netz springt beim Ziehen nicht.
5. **Posen:** Knochen und Blendshapes, alle Werkzeuge auch in der Pose, extreme Formänderungen (kleines Maul → großes rundes).
6. **Spiel:** höchstens 8 000 Dreiecke, Morph-Ziele, 60 fps auf dem iPhone.
7. **Robustheit:** Eine neue Lage braucht keine neue Regel.

## 3. Was die Forschung bietet

### 3.1 Flächen direkt zwischen den Linien (der CAD-Weg)

- **Was es gibt:** Coons-, Gordon- und Gregory-Flächen sowie mehrseitige Flächen (Várady, Salvi u. a.; offene Bibliothek
  `transfinite`). Sie spannen eine Fläche zwischen Randkurven auf und treffen die Kurven exakt, und eine Änderung am Rand wirkt
  nur auf die angrenzenden Flächen. Das klingt genau nach deinem Zielbild.
- **Wo es hakt (belegt):**
  - Das Innere einer Fläche ergibt sich nur aus ihren Rändern. Eine Steuerung im Inneren (Fülle, Kontrollpunkte) kam erst
    später als Zusatz dazu.
  - An jeder Naht zwischen zwei Flächen ist die Fläche nur tangentenstetig. Zebrastreifen knicken dort (Rhino-Doku). Bei deinem
    Earle-Look mit harten Farbstufen würden die Stufengrenzen an jeder Naht knicken (gefolgert). Krümmungsstetige Nähte
    brauchen aufwendige Zusatzbedingungen an jedem Knoten, und gezeichnete Kurven erfüllen sie meist nicht.
  - Lose endende Linien (P-Linien, Mundwinkel, T-Stöße) passen nicht ins Schema geschlossener Randzyklen.
  - Eine stufenlose Härte gibt es nicht, nur „scharf“, „tangentenstetig“ oder „krümmungsstetig“.
  - Ein Posen-System für solche Flächen hat die Recherche nicht gefunden.
- **Praxis:** Rhino (NetworkSrf), Alias und Plasticity rechnen am Ende NURBS-Flächen mit einer Toleranz. Im Prinzip ist das
  dasselbe wie unser Käfig mit dem Ausgleichslöser.
- **Urteil:** nicht als Wahrheit für den Körper. Übernehmen lässt sich die Idee, dass die Linien die Gliederung des Netzes
  bestimmen.

### 3.2 Unterteilungsflächen, die Linien genau treffen

- **Was Catmull-Clark kann:** Entlang einer Kantenkette entsteht genau ein kubischer B-Spline; eine scharfe Kette ist exakt der
  B-Spline ihrer Punkte (am offenen Ende mit einem gespiegelten Hilfspunkt, dort ohne Krümmung). Bézier-Pfade aus Illustrator
  (mit Ecken und Krümmungssprüngen) lassen sich damit nicht genau, aber mit genug Punkten beliebig genau annähern. **0,3 px ist
  also eine Frage der Auflösung entlang der Linie, nicht des Verfahrens.** Die Lippe zeigt das schon: Sie ist eine eigene
  scharfe Kette mit eigener Auflösung und liegt bei höchstens 0,44 px. Die P-Linien liegen bei 0,4–2,0 px, vermutlich weil sie
  keine eigenen Ketten mit eigener Auflösung sind (Treppe, weit stehende Ringe am Hals, Linienenden).
- **Schaefer, Warren, Zorin (2004), „Lofting curve networks using subdivision surfaces“:** Ein Kurvennetz gliedert die Fläche;
  jede Fläche wird nach Muster in Vierecke geteilt; dann wird der Käfig unter linearen Kurvenbedingungen geglättet (ein dünn
  besetztes Gleichungssystem). Abseits der Netzknoten gilt gewöhnliches Catmull-Clark. Das ist fast wörtlich der Stücknetz-Weg,
  und zwar für den ganzen Körper. Dazu eine nützliche Regel aus dem Artikel: Eine Fläche mit k Seiten braucht mindestens
  |k − 4| Pole, wenn keiner mehr als fünf Kanten haben soll.
- **Genaue Interpolation beliebiger Kurven** gibt es nur mit geänderten Regeln (Levin 1999, „combined subdivision“). Das bricht
  die Verträglichkeit mit Standard-Catmull-Clark und ist für uns nicht nötig, solange die Auflösung reicht.
- **Formneutrale Loops:** In gewöhnlichem Catmull-Clark verschiebt ein eingefügter Loop die Grenzfläche ein wenig. Bei
  nicht-uniformen Varianten (NURSS 1998, T-NURCCs 2003) lässt das Einfügen die Fläche unverändert. Das ist eine mögliche
  Ursache dafür, dass Loops die Haut um 1,8–4,5 px verschieben; die andere ist der Löser, der mit mehr Auflösung näher an die
  Hülle rückt (Register V6). Nicht-uniforme Regeln brauchen einen eigenen Auswerter; das ist eine spätere Frage.

### 3.3 Topologie aus Linien und Schleifen

- **Takayama u. a. 2013 (SketchRetopo):** Man zeichnet Kurven auf eine vorhandene Fläche. Jede Kreuzung wird ein Punkt, jede
  geschlossene Masche ein Stück, und jedes Stück wird nach Muster gefüllt; T-Stöße sind erlaubt. Profis bauten damit
  Figurennetze mit 808–6 287 Vierecken in 0,8–2,5 Stunden. Fünfseitige Stücke versagten in Extremfällen.
- **Takayama u. a. 2014 und Tarini 2022:** Die Füllung ist für Stücke mit 2–6 Seiten bewiesen (gerade Summe), höchstens etwa
  30 ms je Stück. Tarini gibt geschlossene Bedingungen für Füllungen mit genau einem Pol; sie sind linear und gehen direkt in
  den Ganzzahl-Schritt.
- **Marcias u. a. 2015 („Data-Driven Interactive Quadrangulation“):** 477 567 Muster aus 40 Blender-Filmfiguren gelernt. Das
  ergibt einen Kantenfluss wie von Hand, mit Schleifen um Augen und Mund. Eine Garantie gibt es dabei nicht (2 Fehler auf
  10 000 Anfragen). Die bewiesenen Minimalmuster allein trafen den gewünschten Fluss ums Auge nicht.
- **QuadWild und QuadMixer** liefern die Gültigkeitsregeln für Stücke (Scheibe, 3–6 Seiten, keine konkaven Ecken) und den
  festen Rand im Ganzzahl-Schritt.
- **Usai u. a. 2015 (Skelett → Vierecksnetz):** An jedem Abzweig sitzt ein Kasten, entlang der Äste laufen Röhren. Das ist
  interaktiv und braucht nur Pole mit drei und fünf Kanten, anders als ältere Verfahren (SQM, B-Mesh, PAM) mit hohen Valenzen
  an Abzweigen. Ein eingepasster Unterteilungskäfig steht dort nur als künftige Arbeit.
- **Regel für die Pollage** (Karčiauskas, Peters, Reif 2004): Fünferpole gehören dorthin, wo die Form ein Sattel ist, Dreierpole
  auf Kuppen. Beide sollen fern von Linien und von Zonen liegen, die sich stark verformen. Das ist eine allgemeine Regel, die
  wir messen können (Gauß-Krümmung von A0).
- **Gelernte Netzerzeuger** (MeshGPT, MeshAnything, Meshtron, DeepMesh, QuadGPT, Q-MAGIC aus dem Oktober 2026) arbeiten mit
  Zufallsstichproben, ungenau und ohne feste Bedingungen. Für uns sind sie nicht brauchbar.
- **Das Gesamtsystem gibt es nirgends:** von drei Umrissen über Linien zu einem eingepassten Catmull-Clark-Käfig mit
  Live-Bearbeitung. Die Teile sind veröffentlicht und erprobt; das Zusammensetzen ist unsere Arbeit, und die Stabilität beim
  Ziehen nennen selbst die QuadMixer-Autoren ein offenes Problem.
- **Wichtigste Einsicht:** Unser Raster ist schon ein Stücknetz. Ringe × Reihen sind Stücke mit vier Seiten, Kappen und Kragen
  sind Stücke mit drei bis fünf Seiten. Der Unterschied zum Stücknetz liegt nur darin, woher die Linien kommen. Daraus folgt eine
  einfache Ordnung:
  - **weiche Linien** kommen aus dem Raster: Ringe, Reihen, Kappen, Kragen;
  - **harte Linien** sind deine: die Umrisse (die Naht ist der Seitenumriss, dazu Front und Top, siehe 3.4), Kanten, die
    Maullinie samt Verlängerung, Augen, Loops;
  - eine weiche Linie weicht, wo sie zusammen mit einer harten ein ungültiges Stück ergäbe. Das ist eine einzige Regel statt
    „längs, quer, schräg, Treppe“.

### 3.4 Form aus drei Ansichten: „Umriss zuerst“ statt „Körper zuerst“

- **Rivers, Durand, Igarashi 2010 („3D Modeling with Silhouettes“):** Jedes Teil ist die Sichthülle seiner zwei oder drei
  Ansichten, zusammengesetzt wie Boolesche Formen. Das ist exakt und robust; bei Widersprüchen gewinnt die strengere Ansicht.
  Nachteile: Nach jeder Änderung wird neu vernetzt (keine feste Topologie), geglättet wird schrittweise mit festgehaltenen
  Umrisspunkten, und für organische Formen ist es laut den Autoren „nicht gut geeignet“.
- **Prasad, Zisserman, Fitzgibbon 2006; Cashman, Fitzgibbon 2013:** In einer orthografischen Ansicht kennt man die Normale am
  Umriss aus der Zeichnung: Sie steht quer zur Blickrichtung. Lage und Tangente am Umriss sind dann **lineare** Bedingungen,
  sofern feststeht, welche Kurve des Netzes den Umriss bildet. Das ist ein einziges dünn besetztes Gleichungssystem mit
  globalem Optimum. Cashman und Fitzgibbon machen das mit einer Unterteilungsfläche fester Topologie (Delfine aus Fotos).
- **Monster Mash 2020** (Dvorožňák u. a.) arbeitet aus einer einzigen Ansicht und liefert sofort animierbare Netze.
- **Kein System** erzeugt drei orthografische Vektorzeichnungen exakt als glatte Fläche mit fester Topologie. Auch das wäre
  unsere eigene Verbindung erprobter Teile.
- **Befund zu unserem Weg (gefolgert, gut begründet):** Heute ist der Umriss ein Ergebnis der Einpassung. Er liegt dort, wo der
  fertige Körper am breitesten ist („Körper zuerst“). Auf flachen Flanken ist diese Stelle schlecht bestimmt: Sie wandert etwa
  mit dem Kehrwert der Krümmung quer zum Umriss, auf einer flachen Wand ist sie ein ganzer Streifen. Das erklärt die wilden
  Linien in den fremden Blättern und den Zusatzaufwand für Front und Top. Ringe senkrecht zur Wirbelsäule können außerdem
  Umrisse nicht tragen, die an T-Stößen springen (Kopf über der Brust), und zerfallen bei Stern-, Pilz- und Krakenformen.
- **„Umriss zuerst“** (Vorschlag der Recherche, gebaut aus Prasad, Rivers, Furukawa/Ponce und Cashman):
  1. Aus der Sichthülle je Teil die erlaubten Tiefen jeder Umrisslinie und die Widersprüche bestimmen. Das geht exakt in 2D;
     ein Widerspruch ist entweder ein Punkt, an dem sich zwei Umrisse treffen und nicht zusammenpassen, oder ein leerer Bereich.
     Beides lässt sich genau rot anzeigen.
  2. Die Tiefe jeder Umrisslinie glatt innerhalb dieser Bereiche wählen. Sie springt nur an T-Stößen und läuft durch die
     Punkte, an denen sich zwei Umrisse treffen.
  3. Das Netz um die Umrisse bauen: Die Naht ist der Seitenumriss, Front- und Top-Umriss sind Schleifen, die sich an der
     breitesten Stelle kreuzen. Die Dreierpole liegen in den Vierteln dazwischen, nie auf einem Umriss; das ist die klassische
     Viereck-Kugel. Teile werden über Kragen verbunden.
  4. Ein linearer Löser: harte Bedingungen auf den Umrissschleifen, entlang der ganzen Schleife und nicht nur an Proben.
     Möglich ist das, weil im regulären Catmull-Clark-Gitter die Tangente quer zu einer Schleife linear in den Nachbarreihen
     ist. Dazu Glätte zur Fülle, scharfe Kanten auf den Schnittlinien der Hülle bei kastigen Teilen und wenige Ungleichungen,
     damit nichts über den Umriss hinaussteht.
  5. In den fremden Blättern die geplanten Umrisslinien zeigen, statt Linien aus dem Körper zu schneiden. Sie sind dann von
     sich aus sauber.
- **Das passt mit dem Stücknetz zusammen.** Die Umrisse werden die Hauptlinien des Netzes, deine Kanten, Maul, Augen und Loops
  kommen dazu, und die Stücke dazwischen werden nach Mustern gefüllt. Das Liniennetz deiner Vektorillustration ist dann
  wörtlich das Netz des Käfigs.

### 3.5 Produktion, Posen und Spiel-Export

- **Erzeugte Topologie verformt sich nicht von sich aus schlechter.** Entscheidend sind drei Dinge:
  - wo die Pole liegen: nicht ein oder zwei Ringe um einen Mundwinkel, der stark gedehnt wird;
  - wie viele Spannen die Lippe hat: 6–8 reichen für ein rundes offenes Maul (die Welligkeit eines Rings liegt bei 0,4 % bzw.
    0,1 %, OpenSubdiv nennt sechs Spannen für genaue Kreise);
  - ob Posen und Pinseldaten einen Neubau der Topologie überstehen.
- **Was die Industrie macht, passt zu unserem Weg:**
  - Pixar hat für weite, runde Mäuler den Mund vom Gesichtsnetz gelöst (Vortrag 2023), weil die Topologie um Nase und Wangen
    sich sonst verzog. Das ist unser Maul-Einsatz.
  - Pixars „Profile Mover“ (Turning Red, 2022; Elemental, 2023) steuert Figuren über gezeichnete Kurvennetze, unabhängig von der
    Verbindung der Netzpunkte. Für uns heißt das: Das Liniennetz ist der Meister, die Verschiebungen je Käfigpunkt sind nur ein
    Zwischenspeicher.
  - MetaHuman hält bedeutungsvolle Schleifen (Lider, Nasolabialfalte) fest, damit jede Anpassung sie behält.
  - Posen: Kieferknochen, eine Korrektur im Ruheraum und Zwischenstufen (etwa bei 40 % und 70 %), damit sich die Lippen beim
    Überblenden nicht kreuzen. glTF wendet Morph-Ziele vor dem Skinning an, genau in unserer Reihenfolge.
- **Echte Risiken:**
  - Pole dicht am Mundwinkel unter starker Dehnung.
  - Beim Übertragen nach Nähe tauschen sich am geschlossenen Schlitz Ober- und Unterlippe; Autodesk dokumentiert genau das und
    rät, vorher den Mund zu öffnen. Abhilfe: Übertragen über Stück und Lage im Stück, getrennt nach Ober- und Unterkiefer, oder
    in einer geöffneten Bezugspose.
  - Verschiebungen nie direkt zwischen Käfigen verschiedener Dichte kopieren, sondern auf der Grenzfläche übertragen und immer
    vom gespeicherten Original aus, nie Übertrag auf Übertrag.
  - Muster, die die Zahl der Pole nur kleinhalten, statt sie gut zu legen; dafür gilt die Pol-Regel aus 3.3.
- **Spiel:** WebGPU hat keine Tessellierungsstufe. Wir backen je Wesen ein festes Netz mit Morph-Zielen (glTF verlangt dieselbe
  Punktzahl in jeder Pose). Das passt zu jeder der hier besprochenen Topologien.

### 3.6 Saubere Linien in den fremden Blättern und Vektor-Ausgabe

- **Was es gibt:** genaue Verfahren für Umrisse glatter Flächen mit richtiger Topologie und Sichtbarkeit (Hertzmann, Zorin
  2000; Bénard, Hertzmann, Kass 2014; ConTesse 2023; „Algebraic Smooth Occluding Contours“ 2023). Sie brauchen Sekunden je
  Ansicht (ConTesse 12–28 s) und kennen keine scharfen Kanten.
- **Wichtiger Befund, von zwei Recherchen unabhängig gleich hergeleitet:** Die wilden Linien sind kein Rechenrauschen, sondern
  schlecht bestimmt.
  - Ein kleiner Fehler in der Normalen verschiebt einen Umriss in seiner eigenen Ansicht kaum. In der Tiefe verschiebt er ihn
    aber stark, umgekehrt proportional zur Krümmung quer zum Umriss.
  - Genau diese Tiefe zeigen die fremden Blätter: Die Front-Linie im Seitenblatt ist die Tiefe des Front-Umrisses.
  - Flache Krümmung ist bei uns eingebaut. Superellipsen aus „berühren mittel“ haben am breitesten Punkt die Krümmung null.
    Wo ein Körper die Sichthülle berührt, ist der Umriss ein Streifen statt einer Linie. Dazu kommen Röhren von vorn gesehen,
    flache Rücken an der Mittelebene und Pole.
  - Glätten macht den Fehler nur langwelliger. Das passt zu „1968 → 18 Knicke, wirkt immer noch wild“ (V2).
- **Folge:** Genaue Verfahren würden die Wildheit nur genau abbilden. Sauber wird es, wenn der Umriss eine geplante Linie ist
  („Umriss zuerst“, 3.4).
- **Zwischenlösung ohne Umbau:** eine besser bestimmte Wahl des Umrisses. In der Seite nimmt man die Naht (sie ist wegen der
  Spiegelung immer ein Umriss). In Front und Top nimmt man die Mitte des Streifens, an dem der Blick streift, gewichtet nach
  der Bestimmtheit, mit Lücken statt Zacken. Das lässt sich in ein bis zwei Tagen prüfen; der Prüfstein ist, ob die Linie bei
  einem winzigen Wackeln des Käfigs ruhig bleibt.
- **Vektor-Ausgabe (SVG):** Das Standardrezept ist bekannt: Kurven sammeln, an Spitzen und Kreuzungen teilen, Sichtbarkeit je
  Stück bestimmen, verketten, vereinfachen, als Bézier an deinen Knoten anpassen. Ausgegeben werden gefüllte, sich verjüngende
  Konturen und gestrichelte verdeckte Linien. In TypeScript sind das etwa 2 000–3 500 Zeilen mit offenen Bibliotheken
  (three-mesh-bvh, robust-predicates, perfect-freehand). Scharfe Ketten und die Naht sind bei Catmull-Clark exakte B-Splines
  und lassen sich ohne Anpassung in Bézier umrechnen.

## 4. Die Kandidaten im Vergleich

| Kandidat | Umrisse genau | Linien genau | Haut glatt | neue Lage ohne neue Regel | Posen und Spiel | stabil beim Ziehen | Urteil |
|---|---|---|---|---|---|---|---|
| A Raster + Sonderregeln (heute) | nur Kugel und Ei ≤ 0,5 px | 0,4–2 px | gut, außer an Kappen und Ansätzen | nein | ja | Röhre ja, Teile nein (4–22 px) | so nicht weiter |
| B Raster + Stücknetz für Einsätze (Empfehlung von vorhin) | wie heute | ja, eigene Auflösung je Linie | ja | für alles Örtliche | ja | ja (eingefroren) | erster Schritt |
| C Umriss zuerst + Liniennetz + ein Löser (neu) | ja, lineare Bedingungen über die ganze Schleife | ja | ja, mit Pol-Regel | ja | ja, Daten an den Linien | Topologie ändert sich nur an Kreuzungen von Linien | Zielbild, erst beweisen |
| D Flächen zwischen den Linien (CAD) | am Rand exakt | exakt | Nähte knicken die Farbstufen | ja | kein Posen-System bekannt | – | nein |
| E Feldnetz für den ganzen Körper (QuadWild u. a.) | nicht vorgesehen | ja | ja | ja | ja | springt, Minuten je Lauf | nein |
| F Sichthülle + Neuvernetzen (Rivers 2010) | exakt | nicht vorgesehen | nur schrittweise geglättet | ja | keine feste Topologie | nein | nur als Prüfwerkzeug |
| G gelernte Netzerzeuger | nein | nein | – | – | – | nein | nein |

## 5. Empfehlung: ein Liniennetz, ein Löser

**Das Zielbild (Kandidat C):**
- **Umrisse zuerst.** Seite, Front und Top werden zuerst zu 3D-Linien auf dem Körper: die Naht in der Mittelebene und die
  Front- und Top-Umrisse mit einer glatten Tiefe aus der Sichthülle. Widersprüche der Zeichnungen sind dann exakt bestimmt
  und rot.
- **Ein Netz aus Linien.** Umrisse, deine Kanten, die Maullinie samt Verlängerung, Augen und Loops sind harte Linien. Dazu
  kommen weiche Linien aus dem heutigen Raster (Ringe, Reihen, Kappen, Kragen), die weichen, wo sie stören. Die Stücke
  dazwischen werden nach bewiesenen Mustern gefüllt; Pole liegen nach der Regel „Sattel oder Kuppe, fern von Linien“.
- **Ein Löser.** Ein dünn besetztes lineares System: harte Bedingungen auf allen Linien (Lage, bei Umrissen auch die
  Tangente), Glätte relativ zur Fülle, wenige Ungleichungen gegen Überstand. Das ist der heutige Löser mit festen statt
  gewichteten Bedingungen.
- **Daten an den Linien.** Posen, Pinsel und Zonen hängen an Stücken und Lagen darin, nicht an Punktnummern. Übertragen wird
  auf der Grenzfläche, getrennt nach Ober- und Unterkiefer, immer vom gespeicherten Original aus.

**Was aus dem heute Gebauten wird:**
- Das Raster wird zur Quelle der weichen Linien.
- Der Maul-Einsatz wird ein Fall des Stücknetzes.
- Löser, Messungen, Prüffälle, Extremreihe und Tore bleiben.
- Wegfallen würden, sobald die Beweise halten: Kernring, Leiter, Treppe, Frontlinie aus Ringstücken, die meisten Sonderfälle
  an Fenstern und Kragen.

**Warum das nicht der nächste Fehlweg ist** (ehrlich, ohne Garantie):
- Ersetzt wird genau der Mechanismus, der uns aufgehalten hat: feste Vorlage plus Sonderregel je Lage. An seine Stelle tritt
  eine allgemeine Regel, deren schwierigster Teil bewiesen ist (Musterfüllung, Takayama 2014) oder linear lösbar
  (Umriss-Bedingungen, Prasad 2006).
- Die Bausteine sind einzeln erprobt (QuadMixer, SketchRetopo, Prasad/Cashman, Schaefer–Warren–Zorin, Pixars Profile Mover).
  Neu ist nur das Zusammensetzen, und genau das prüfen drei kurze Beweise mit harten Abbruchkriterien, bevor irgendetwas
  umgestellt wird.
- Der heutige Stand bleibt bitgleich als Rückfall; die Messlatte (Tore, Extremreihe, 54 Maulfälle) bleibt dieselbe.
- Eine Garantie gibt es nicht: Ein Gesamtsystem dieser Art hat noch niemand veröffentlicht.

## 6. Prüfphase: drei Beweise mit Abbruchkriterien

Alles im Kern hinter Schaltern, ohne Schalter bitgleich; der Kernring bleibt eingefroren; im Editor ändert sich bis zur
Entscheidung nichts. Nach jedem Beweis: Kontaktbögen, Zahlen, deine Entscheidung.

**P1 „Umriss zuerst“ (3–4 Arbeitstage).**
- Körper aus einem Teil: Kugel, Ei, Würfel, Stadionform, Pilz, Robbe, Tiger-Schnauzenblock, dazu zwei Zeichnungen mit
  Widerspruch.
- Tag 1, nur die Umrisslinien: keine ungeplanten Sprünge; zwischen zwei Punkten, an denen sich Umrisse treffen, höchstens zwei
  Krümmungswechsel (mindestens fünfmal ruhiger als die V2-Linien); die Widersprüche stimmen mit der Rückprojektion der
  Sichthülle überein.
- Tag 2–3, Käfig um die Umrisse (Viereck-Kugel je Teil), ein linearer Löser:
  - Δ ≤ 0,5 px in allen drei Ansichten an jedem widerspruchsfreien Körper;
  - nichts steht mehr als 0,5 px über einen Umriss hinaus;
  - keine umgeklappte Fläche, freie Haut ohne Falten über der heutigen Grenze;
  - ein Umrissknoten in 20 Schritten 20 px gezogen: Δ bleibt ≤ 0,5 px, keine Topologieänderung, kein Sprung;
  - ≤ 50 ms je Lösung bei etwa 2 000 Käfigpunkten.
- Bestanden bei mindestens 6 von 7 Körpern, darunter Würfel, Stadion und Pilz. Abbruch, wenn ein widerspruchsfreier Körper
  über 1 px bleibt: Dann trägt die lineare Umrissbedingung nicht, und die Umrisse bleiben wie heute. Für die Anzeige kommt dann
  die besser bestimmte Wahl des Umrisses aus 3.6 als Zwischenlösung.
- Was du nach Tag 1 sehen kannst: die geplanten Umrisslinien in allen drei Blättern neben den heutigen, an denselben Körpern.

**P2 „Stücknetz im Maulfeld“ (3–5 Arbeitstage).** Wie in der Recherche „Feldnetz oder Kernring?“, Abschnitt 6: die schwersten
Maulfälle plus Tigerkopf, dieselben Tore wie heute, keine Regel, die einen Körper oder eine Lage benennt, ±2 px Linienbewegung
ohne Topologieänderung, Muster erschöpfend geprüft. Abbruch: Dann bleibt der eingefrorene Kernring.

**P3 „Liniennetz am ganzen Körper“ (3–4 Arbeitstage).**
- Fälle: Kugel, Langhals, Rex mittel J mit zwei P-Linien, Robbe hoch J, Ente, Tiger, Kegel mit schräger Linie, Seestern.
- Vorab, ohne Code (2–4 Stunden): die Liniennetze auf Bildern der Fälle von Hand einzeichnen, Stücke und Seiten zählen.
  Abbruch, wenn mehr als jedes zehnte Stück eine Sonderbehandlung bräuchte.
- Tore:
  - alle Stücke gültig ohne fallbezogene Regel, nur Vierecke, Spiegel exakt;
  - Kugel und Langhals ohne Linien mindestens so gut wie heute;
  - Umrisse und Linien wie in P1/P2, Falten nicht schlechter als heute;
  - Pole mit drei oder fünf Kanten nur abseits der Naht, nicht in der ersten Reihe um Linien, Mundwinkel und Augen, Fünferpole
    an Sätteln, Dreierpole auf Kuppen;
  - ±2 px Bewegung einer Linie (je 20 Versuche): Topologie in mindestens 90 % gleich; wenn sie wechselt, bleiben mindestens
    95 % der Flächen außerhalb der Nachbarstücke gleich; übertragene Posen weichen ≤ 0,5 px ab;
  - Neuplanung ≤ 150 ms, mit Einpassen ≤ 300 ms bis 2 000 Käfigpunkte.
- Fallen Tore in zwei oder mehr Fällen: Das Raster bleibt, das Stücknetz wird nur für Einsätze genommen (Kandidat B).

**Danach, freiwillig: Maul öffnen im Vergleich (2 Tage, dazu 2–3 Stunden von dir in Blender).** Du baust für Rex den
Maulbereich so, wie du ihn von Hand bauen würdest; wir vergleichen ihn mit dem erzeugten bei gleich vielen Punkten im weit
offenen Maul (Falten, Verzerrung, Rundheit, Zwischenstufen, Übertrag nach einem Neubau). Am Ende urteilst du blind an
Zebra- und Matcap-Drehbildern.

**Reihenfolge:** P1 und P2 hängen nicht voneinander ab; P3 braucht beide. Vorschlag: P1 zuerst, weil er über das Fundament aller
anderen Schritte entscheidet (wie der Körper ohne Maul gebaut wird) und am schnellsten etwas zeigt; P2 als Zweites, weil der
Maul-Einsatz auf jedem Körper arbeitet, ob mit oder ohne P1. Insgesamt etwa zwei bis zweieinhalb Wochen Arbeitstage, kalendarisch
je nach Wochenlimit. Was danach kommt, ersetzt Arbeit, die ohnehin ansteht (Teile als ein Körper, exakte Umrisse, Linien exakt,
Maul in den Editor), statt sie zu vermehren. Eine belastbare Zahl für den Umbau gibt es erst nach den Beweisen.

**Wenn es schneller gehen soll:** nur P2 und danach E3/E4 (Kandidat B). Dann bleiben die Umrisse und die wilden Linien, wie sie
sind, bis später.

## 7. Was wir nicht tun

- Keine Flächen zwischen den Linien als Wahrheit (CAD-Weg): Die Nähte knicken die Farbstufen, und für Posen gibt es kein
  Vorbild.
- Kein Neuvernetzen des ganzen Körpers mit einem Richtungsfeld: Das dauert Minuten, springt bei kleinen Änderungen, kennt keinen
  festen Rand und garantiert keine Spiegelung.
- Keine gelernten Netzerzeuger.
- Kein fremder Code unter GPL (QuadWild, QuadMixer, Takayamas Muster); wir bauen nach den Veröffentlichungen.
- Kein Komplettumbau vor den Beweisen.

## Nicht nachgeprüft

- Einige Arbeiten konnten die Recherchen nur als Kurzfassung lesen, darunter Dual Loops (2012), Dual Strip Weaving (2014),
  die G2-Arbeiten von Salvi und Várady, Stanko u. a. 2016, Levin 1999 und mehrere Produktionsvorträge. Die Aussagen dazu
  stehen in den Abschnitten als Kurzfassung oder Schluss.
- Ein Gesamtsystem „drei Umrisse + Linien → eingepasster Catmull-Clark-Käfig mit Live-Bearbeitung“ hat keine der Recherchen
  gefunden. Das ist ein Befund über die Suche, kein Beweis, dass es keines gibt.
- Die Erklärung der wilden Linien (Umriss wandert auf flachen Flanken mit dem Kehrwert der Krümmung) ist hergeleitet und
  plausibel, aber an unseren Körpern noch nicht gemessen; P1, Tag 1 misst sie.
- Alle Aufwandszahlen sind Schätzungen.

## Quellen

**Flächen aus Kurvennetzen, Unterteilung**
- Várady, Salvi: New multi-sided patches for curve network-based design. KÉPAF 2013.
  https://kepaf2013.mik.uni-pannon.hu/proceedings/pdfs/F10_04.pdf · Bibliothek: https://github.com/salvipeter/transfinite
- Salvi, Várady: Multi-sided surfaces with curvature continuity. CGF 33(7), 2014. https://doi.org/10.1111/cgf.12483
- Schaefer, Warren, Zorin: Lofting curve networks using subdivision surfaces. SGP 2004.
  https://people.engr.tamu.edu/schaefer/research/lofting.pdf
- Levin: Combined subdivision schemes for the design of surfaces satisfying boundary conditions. CAGD 16, 1999.
  http://www.math.tau.ac.il/~levin/adi/paper7.htm
- Halstead, Kass, DeRose: Efficient, fair interpolation using Catmull-Clark surfaces. SIGGRAPH 1993.
  https://doi.org/10.1145/166117.166121
- Sederberg u. a.: Non-uniform recursive subdivision surfaces (NURSS). SIGGRAPH 1998; T-NURCCs. ACM TOG 22(3), 2003.
- DeRose, Kass, Truong: Subdivision surfaces in character animation. SIGGRAPH 1998. https://doi.org/10.1145/280814.280826
- Nealen, Igarashi, Sorkine, Alexa: FiberMesh. ACM TOG 26(3), 2007. https://doi.org/10.1145/1239451.1239492
- Pan u. a.: Flow aligned surfacing of curve networks. ACM TOG 34(4), 2015. https://doi.org/10.1145/2766990
- Bessmeltsev, Wang, Sheffer, Singh: Design-driven quadrangulation of closed 3D curves. ACM TOG 31(6), 2012.
  https://www.cs.ubc.ca/labs/imager/tr/2012/Quadrangulation/
- Rhino NetworkSrf: https://docs.mcneel.com/rhino/8/help/en-us/commands/networksrf.htm · Plasticity Patch:
  https://doc.plasticity.xyz/solid/patch

**Topologie aus Linien**
- Takayama, Panozzo, Sorkine-Hornung, Sorkine-Hornung: Sketch-based generation and editing of quad meshes. ACM TOG 32(4), 2013.
  https://igl.ethz.ch/projects/sketch-retopo/
- Takayama, Panozzo, Sorkine-Hornung: Pattern-based quadrangulation for N-sided patches. CGF 33(5), 2014.
  https://cims.nyu.edu/gcl/papers/pattern-based-quadrangulation.pdf
- Tarini: Closed-form quadrangulation of N-sided patches. Computers & Graphics 107, 2022. https://arxiv.org/abs/2101.11569
- Marcias u. a.: Data-driven interactive quadrangulation. ACM TOG 34(4), 2015.
  https://vcgdata.isti.cnr.it/Publications/2015/MTPPSPC15/DDQ-Paper.pdf
- Marcias u. a.: Animation-aware quadrangulation. CGF 32(5), 2013. https://doi.org/10.1111/cgf.12183
- Pietroni u. a.: Reliable feature-line driven quad-remeshing (QuadWild). ACM TOG 40(4), 2021.
  https://doi.org/10.1145/3450626.3459941
- Nuvoli u. a.: QuadMixer. ACM TOG 38(6), 2019. https://opus.lib.uts.edu.au/bitstream/10453/137672/4/quadmixeR.pdf
- Usai u. a.: Extraction of the quad layout of a triangle mesh guided by its curve skeleton (Skelett → Vierecke). ACM TOG, 2015.
  https://vcgdata.isti.cnr.it/Publications/2015/ULPTS15/skel_to_quad.pdf
- Peng, Zhang, Kobayashi, Wonka: Connectivity editing for quadrilateral meshes. ACM TOG 30(6), 2011.
- Campen, Bommes, Kobbelt: Dual loops meshing. ACM TOG 31(4), 2012; Campen, Kobbelt: Dual strip weaving. ACM TOG 33(6), 2014.
- Reberol, Georgiadis, Remacle: Quasi-structured quadrilateral meshing in Gmsh. https://arxiv.org/abs/2103.04652
- Karčiauskas, Peters, Reif: Shape characterization of subdivision surfaces — case studies. CAGD 21, 2004.
  https://www.cise.ufl.edu/research/SurfLab/papers/03part2.pdf
- Gelernte Netzerzeuger (geprüft, nicht brauchbar): MeshGPT https://arxiv.org/abs/2311.15475 · MeshAnything
  https://arxiv.org/abs/2406.10163 · Meshtron https://arxiv.org/abs/2412.09548 · DeepMesh https://arxiv.org/abs/2503.15265 ·
  QuadGPT https://arxiv.org/abs/2509.21420 · NeurCross https://arxiv.org/abs/2405.13745

**Form aus Ansichten**
- Rivers, Durand, Igarashi: 3D modeling with silhouettes. ACM TOG 29(4), 2010.
  https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/alec_siggraph2010_silhouette.pdf
- Prasad, Zisserman, Fitzgibbon: Single view reconstruction of curved surfaces. CVPR 2006. https://doi.org/10.1109/CVPR.2006.281
- Cashman, Fitzgibbon: What shape are dolphins? Building 3D morphable models from 2D images. IEEE TPAMI 35(1), 2013.
- Oswald, Töppe, Nieuwenhuis, Cremers: A review of geometry recovery from a single image (2013).
  https://cvg.cit.tum.de/_media/spezial/bib/oswald-et-al_2011-survey.pdf
- Dvorožňák u. a.: Monster Mash. ACM TOG 39(6), 2020. https://dcgi.fel.cvut.cz/~sykorad/monster_mash.html
- Sinha, Pollefeys: Multi-view reconstruction using photo-consistency and exact silhouette constraints. ICCV 2005.

**Umrisslinien und Vektor-Ausgabe**
- Hertzmann, Zorin: Illustrating smooth surfaces. SIGGRAPH 2000.
  https://mrl.cs.nyu.edu/publications/illustrating-smooth/hertzmann-zorin.pdf
- Bénard, Hertzmann, Kass: Computing smooth surface contours with accurate topology. ACM TOG 33(2), 2014.
  https://doi.org/10.1145/2558307
- Liu, Bénard, Hertzmann, Hoshyari: ConTesse — accurate occluding contours for subdivision surfaces. ACM TOG 42(1), 2023.
  https://dgp.toronto.edu/~hertzman/contesse/
- Capouellez, Dai, Hertzmann, Zorin: Algebraic smooth occluding contours. SIGGRAPH 2023. https://arxiv.org/abs/2306.01973
- Bénard, Hertzmann: Line drawings from 3D models — a tutorial. 2019. https://arxiv.org/abs/1810.01175
- Furukawa, Ponce: Carved visual hulls for image-based modeling. ECCV 2006. https://doi.org/10.1007/11744023_44
- Bibliotheken: https://github.com/gkjohnson/three-mesh-bvh · https://github.com/mourner/robust-predicates ·
  https://github.com/steveruizok/perfect-freehand

**Produktion, Posen, Export**
- OpenSubdiv: Subdivision surfaces und Modeling tips. https://opensubdiv.org/docs/subdivision_surfaces.html ·
  https://opensubdiv.org/docs/mod_notes.html
- Lykkegaard, Lacaze, Page: Eyes without a face (Pixar, SIGGRAPH Talks 2023). https://history.siggraph.org/?p=129531
- de Goes, Sheffler, Fleischer: Character articulation through profile curves (Pixar, 2022).
  https://history.siggraph.org/?p=117913
- Lewis, Cordner, Fong: Pose space deformation. SIGGRAPH 2000. https://www.scribblethink.org/Work/PSD/PSD.pdf
- Lewis u. a.: Practice and theory of blendshape facial models. Eurographics STAR 2014.
  https://scribblethink.org/Work/Pdfs/blendshapes_MAIN.pdf
- Sumner, Popović: Deformation transfer for triangle meshes. SIGGRAPH 2004.
  https://people.csail.mit.edu/sumner/research/deftransfer/
- Abdrashitov u. a. (Epic): Robust skin weights transfer via weight inpainting, 2023.
  https://www.dgp.toronto.edu/~rinat/projects/RobustSkinWeightsTransfer/
- Autodesk Maya: Bake Topology to Targets (geschlossener Mund):
  https://download.autodesk.com/us/maya/2011help/files/Edit_Deformers__Blend_Shape__Bake_Topology_To_Targets.htm
- MetaHuman, Vorlagen-Topologie: https://dev.epicgames.com/documentation/metahuman/from-template-mesh
- glTF 2.0, Morph-Ziele: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- WebGPU, Tessellierung offen: https://github.com/gpuweb/gpuweb/issues/445
