# Kanten, Rück- und Untersicht, verbundene Kiefer (12.10.2026 mittags)

> Antwort auf Florians Rückmeldung vom 12.10. mittags (Plan [`docs/plans/2026-10-12-kanten-ansichten.md`](../plans/2026-10-12-kanten-ansichten.md)).
> Alles hier ist **Versuch** im Editor: Es zeigt die Bedienung und die Geometrie, es ist nicht die fertige Bauweise.

## Kurzfassung

1. **Kiefer verbunden:**
   - Ober- und Unterlinie teilen jetzt immer den schwarzen Mundwinkel, im geschlossenen und im offenen Zustand. Vorher drehte der offene Vorschlag die Unterlinie um einen Punkt hinter dem Mundwinkel, deshalb gab es zwei schwarze Punkte.
   - Der Maulanfang klebt an der Seitenkontur, wenn sich die Form ändert.
   - Im Tab Fressen zeigen alle Ansichten den **geöffneten Körper**: Der Umriss läuft an Ober- und Unterlippe entlang bis zum Mundwinkel, die Grundform liegt blass dahinter.
2. **Kantenlinien wie vorgeschlagen:**
   - Der Zeichenstift auf freier Fläche setzt eine Linie, die auf der Fläche liegt.
   - 1 px gestrichelt = mögliche Kante, ganz glatt. Je härter, desto breiter und dunkler; schwarz 3 px = scharf. Die Härte verläuft entlang der Linie.
   - Einstellen über den Regler, die Stufen glatt/weich/fest/scharf, „weich auslaufen“ und das Breitenwerkzeug ⇧W wie in Illustrator.
3. **Ecken der Silhouetten sind Kanten:**
   - Ein Eckpunkt hat eine Härte (Standard 100 %, über Regler oder ⇧W).
   - Im 3D wird er zur Kante, in den anderen Ansichten erscheint er als Linie (Abschnitt 3).
4. **Back und Bottom** als Tab am Viewport-Titel („front · back“, „top · bottom“).
   - Echte Rückansichten: Back ist waagerecht gespiegelt (links/rechts getauscht), Bottom senkrecht.
   - Die Silhouette ist dieselbe. Neu ist, welche Fläche man trifft: Linien auf Rücken, Schwanz oder Bauch zeichnet man dort, Linien der anderen Seite erscheinen blass.
5. **3D:** Kanten und Ecken werden im Käfig zu Kanten mit Schärfe nach der Härte; die Tiefe macht Grate und Rinnen. Befund: Härte macht schärfer, nicht tiefer (Abschnitt 3).
6. **Antworten auf deine Fragen** stehen in Abschnitt 1, die Recherche in Abschnitt 5.

## 1. Deine Fragen

### Lässt sich damit alles darstellen?

**Fast alles, mit drei Ergänzungen.** Was jede Zutat liefert:

| Zutat | liefert | liefert nicht |
|---|---|---|
| Silhouetten (Seite, Front, Top) | die äußere Hülle (visuelle Hülle): alles, was man im Umriss sieht | Mulden, Sattel, eingefallene Wangen, Augenhöhlen, Nüstern: Was nach innen geht, sieht man in keinem Umriss |
| Back, Bottom | **dieselben** Silhouetten (ein Umriss ist von vorn und hinten gleich) | keine neue Form, aber die Rück- und Unterseite als Zeichenfläche für Linien |
| Kantenlinien mit Härte | wo die Fläche knickt und wie scharf, verlaufend | Linien auf der Fläche verschieben die Fläche nicht in die Tiefe; eine Rille oder ein Wulst braucht mehr |
| Ecken in Silhouetten | Kanten genau dort, wo die Form sie zeichnet | – |

Die drei Ergänzungen, damit es wirklich alles wird:

1. **Querschnitte (Spanten)** an gewählten Stellen.
   - Heute gilt ein Front-Querschnitt für den ganzen Körper. Ein kastiger Kopf auf einem runden Bauch geht damit nicht.
   - Im Schiffbau löst das der Spantenriss. Er zeigt die vorderen Spanten auf der einen Seite und die hinteren auf der anderen, genau wie dein Front ↔ Back.
   - Vorschlag: In der Seite eine senkrechte Spantlinie setzen; ihr Querschnitt erscheint in Front (vordere Hälfte) bzw. Back (hintere Hälfte) und lässt sich dort wie ein Profil ziehen. Der Loft läuft dann durch alle Spanten.
2. **Formlinien mit eigener Tiefe.** Eine Linie, die in zwei Ansichten gezogen wird, hat eine echte 3D-Lage. Die Fläche wird durch sie hindurch gelegt (FiberMesh: glatte oder scharfe Kurven als Bedingung). Damit gehen Mulden, Wülste und Rillen.
3. **Wirbelsäule** für Überhänge (Langhals, eingerollter Schwanz), siehe die Recherche vom Vormittag.

Teile mit eigener Topologie bleiben eigene Tabs: Maul, Zähne, Augen, später Ohren, Beine, Flügel.

### Konturen im eigenen Tab oder im Form-Tab?

**Im Form-Tab, ohne eigene Farbe.** Gründe:

- In deinen Bögen sind Umriss und Kanten eine Zeichnung. Eine Kante gehört zur Form wie ein Umriss.
- Wie in Illustrator liegen alle Pfade auf einer Zeichenfläche. Der Zeichenstift auf dem Umriss setzt einen Punkt, auf freier Fläche beginnt er eine Kante. Ein zweiter Tab hieße ständiges Umschalten.
- Ein Farbton würde „dunkler = härter“ stören. Grau → Schwarz **ist** die Information.
- Eigene Tabs bleiben für Teile mit eigener Bedeutung (Maul, Zähne, Rig, Augen).
- Später sinnvoll: ein Schalter „Kanten ausblenden“, falls es voll wird.

### Ist Dicke plus Strichelung gut, oder geht es besser?

**Gut, mit vier Ergänzungen, die eingebaut sind.**

- **Doppelt kodiert:** Breite (1 → 3 px) und Helligkeit (Grau → Schwarz) zusammen. Eine Breite allein unterscheidet man nur in wenigen Stufen.
- **Verlauf entlang der Linie:** Jeder Knoten hat seine Härte, dazwischen fließend. So läuft eine Kante in die runde Form aus (Verjüngung aus deinem Tiger-Konzept).
- **Breitenwerkzeug ⇧W:** Punkt greifen und ziehen; der Abstand ist die Härte, ein Kreis zeigt sie (0 % am Punkt, 100 % am gestrichelten Rand). Ein Klick zwischen Knoten setzt einen neuen.
- **Zahl auf Wunsch:** Gewählte Punkte zeigen die Härte in Prozent, die Seitenleiste eine Strichvorschau.

**Grenze der Strichelung:** Im technischen Zeichnen heißt gestrichelt „verdeckte Kante“. Deshalb sind verdeckte Linien hier **blass**, nicht gestrichelt. Gestrichelt bleibt allein „möglich, glatt“. In CAD gibt es dafür ein Vorbild, siehe Abschnitt 5.

## 2. Was im Editor steht (zum Ausprobieren)

Web-Modus `pnpm --filter @ee/editor dev:web` (Port 5180) oder `pnpm editor`.

- **Kante zeichnen:** P drücken und auf freie Fläche klicken. Jeder Klick ist ein Punkt auf der Fläche, Enter oder Doppelklick beendet, Esc bricht ab.
- **Bearbeiten:** A (Direktauswahl).
  - Punkt ziehen: Er bleibt auf der Fläche, in jeder Ansicht.
  - Linie anklicken: ganze Linie gewählt.
  - Entf: Punkte löschen.
  - P auf der Linie: Punkt einfügen; P auf einem Punkt: löschen.
- **Härte:** Seitenleiste (Regler, Stufen, „weich auslaufen“) oder ⇧W direkt an der Linie.
- **Ecken:** Eckpunkt wählen, dann Härte über Regler oder ⇧W.
- **Back/Bottom:** auf „back“ bzw. „bottom“ über dem Viewport klicken.
- **Fressen mit Maul:** Der Umriss folgt dem Kiefer.
- **Bilder:**
  - `docs/progress/editor/kanten-tab.png` (Kante mit Verlauf)
  - `kanten-back.png` (Kante auf der Rückseite)
  - `maul-tab-offen.png` (geöffneter Umriss)
- **Tiefe:** Regler „+ Grat / − Rinne“ je Kante; in den Ansichten heller bzw. dunkler Hof (Licht und Schatten).
- **Kantenliste und Ebenenschalter** (zeigen, blass, aus) in der Seitenleiste; die Strichelung ist zoomfest und geht mit wachsender Härte in die Volllinie über.
- **Zebrastreifen** im 3D (gestreifter Punkt oben rechts).
- **Tests:** E2E `apps/editor/e2e/kanten.spec.ts` (2 Tests) und `maul.spec.ts`; Unit-Tests `linie3d.test.ts` (Mundwinkel, Kontur), `umriss3d.test.ts`, `kantenFlaeche.test.ts`, `kanten.test.ts`.

## 3. 3D: wie die Kanten entstehen (`packages/shape/src/versuch/kanten.ts`, im Editor `src/kanten/kantenKoerper.ts`)

Sobald es Kantenlinien oder sichtbare Ecken in einem Profil gibt, baut das 3D statt des Platzhalter-Lofts einen **Catmull-Clark-Käfig aus den Profilen** (Shapes → Loft → Käfig). Die Anzeige unten links heißt dann „Versuch: Kanten im Käfig“.

**So wird aus einer Linie eine Kante:**
- **Längslinien** (überwiegend vorn → hinten, z. B. Wange): Ringpunkte werden genau auf die Linie geschoben. Die Kante läuft entlang einer Längsschleife des Käfigs.
- **Querlinien** (z. B. ein Band um den Hals): Ein Ring wird auf die Linie gelegt und darf kippen. Freie Nachbarringe neigen sich mit, der Käfig faltet nie.
- **Ecken der Silhouetten:**
  - Front-Ecke: Längskante über die ganze Länge, zu den Polen auslaufend. Ein spitzer First oben in der Front wird so ein Grat entlang des Rückens.
  - Ecke in Seite oder Top: Kante quer um den Körper, auf der Seite, zu der die Ecke zeigt.
  - In den anderen Ansichten erscheinen sie als Linie. Ein Klick darauf wählt die Ecke.
- **Härte → Kantenschärfe:** 0 … 3 Unterteilungsstufen, entlang der Linie verlaufend. Freie Enden laufen auf dem letzten Ringabstand aus, sonst entsteht eine Kerbe.
- **Tiefe:** Die Ziele des Käfigs entlang der Linie wandern entlang der Normalen nach außen (Grat) oder innen (Rinne), dann wird neu angepasst. Mit Härte 0 entsteht ein weicher Wulst bzw. eine weiche Mulde, mit 100 % ein scharfer Grat bzw. eine scharfe Rinne (`docs/progress/editor/kanten-tiefe.png`).

**Messwerte** (Ei, 18 Ringe × 16; Tests `kanten.test.ts`, 14 grün):

| Messung | Ergebnis |
|---|---|
| Bau + Anpassen / 3 Stufen | 96–123 ms / 10–14 ms; im Editor während Gesten schnell (3 Durchgänge) |
| Netz | immer geschlossen, einheitlich orientiert, keine Durchdringungen |
| Front-Ecke (Schulter), Höhe | 0,02 px |
| Wangenkante (Längslinie) | 0,84 px neben der gezeichneten Linie |
| Band (Querlinie, Ring 9,2 px gekippt) | 0,05 px |
| Härte 0 gegen Fläche ohne Linie | 0,46 px (Wange), 0,11 px (Band): bleibt glatt |
| Knick an der Kante bei Härte 0 / ⅓ / ⅔ / 1 | 2,9° / 4,2° / 7,3° / 13,3° |
| Seitenumriss | 0,16–0,33 px |
| Kinn (Ecke in der Seite) in der Front | 0,00 px neben der Kinnhöhe |

**Wichtigster Befund: Härte macht eine Kante schärfer, aber nicht tiefer.**
- Das Anpassen hält die Loft-Punkte fest, Härte 1 sammelt nur die vorhandene Rundung in der Kante.
- Über acht feine Flächen gemessen knickt die Fläche bei Härte 0 um 22,6°, bei Härte 1 um 20,3°.
- Eine **tiefe** Kante entsteht deshalb auf zwei Wegen: als **Ecke in einer Silhouette** (die Form selbst knickt) oder mit **Tiefe** an der Linie (Grat bzw. Rinne). Das ist die Antwort auf die Frage, ob Linien allein reichen.

**Zebrastreifen** (Punkt oben rechts im 3D): Die Streifen knicken am First und an der Wange und fließen über die glatten Flächen (`kanten-3d-zebra.png`). Für harte Kanten schattiert das 3D mit kleinem Glättungswinkel (10°), sonst verschwände ein 13°-Knick in der Schattierung.

**Grenzen** (alle geschlossen, ohne Falten, mit Hinweis):
- Schräge Linien (45°) liegen bis 3,3 px neben der Linie, die Fläche wird schon bei Härte 0 um 2,3 px wellig. Steile Linien (70°) bis 12 px.
- Linien im Gesicht, in der Front gezeichnet: 2,6 px, Beulen bis 1,3 px. Um die vordere Kappe laufen die Ringe konzentrisch, beliebige Linien schräg dazu.
- Linien über die Kappe werden am Kappenrand gekürzt. Zwei Querlinien auf demselben Ring: Die zweite bekommt keine Kante.
- Kreuzungen funktionieren (0,4–0,5 px).
- **Noch nicht gebaut:** Kanten zusammen mit dem Maul-Käfig. Mit Maul zeigt das 3D die Kanten noch nicht.
- Für beliebige Linien braucht es später ein Netz, das sich nach den Linien richtet (Quad-Netz entlang eines Kurvennetzes, Recherche [40, 41]) statt fester Ringe.

## 4. Offene Punkte

- **Spanten** (Querschnitte an gewählten Stellen) sind noch nicht gebaut, nur skizziert: Spantlinien in der Seite, vordere Querschnitte in der Front, hintere in der Back-Ansicht, der Loft läuft durch alle.
- Kanten zusammen mit dem Maul-Käfig; schräge Linien und Linien im Gesicht (siehe Abschnitt 3).

- Am Übergang Schädel/Oberkiefer knickt der offene Umriss leicht. Das ist die Grenze der Kiefergewichte im 3D; die Abhilfe gehört zur Mundwinkel-Zone und Kehlkette der großen Sitzung.
- Eigene Pose-Profile (Fressen mit selbst gezogenem Umriss) fehlen. Heute folgt der Körper dem Kiefer automatisch.

## 5. Recherche (Hintergrund-Recherche 12.10. mittags, mit Quellen)

**Kurzantworten der Recherche:**
- **Komplett in Shapes?** Mit Silhouetten und Kanten allein nicht. Kugel und Steinmetz-Körper (Schnitt dreier Zylinder) sehen in allen sechs Ansichten gleich aus, der Steinmetz-Körper hat aber Grate und rund 12 % mehr Volumen [52]. Erst Spanten und Kanten mit eigener Tiefe machen die Beschreibung vollständig.
- **Eigener Tab?** Nein. Alle Vorbilder halten Form und Kanten in derselben Ansicht.
- **Dicke und Strichelung?** Gut begründet (Lichtkante, CAD-Tangentenkante, „gestrichelt = unsicher“). Vier Korrekturen machen sie besser: sichtbare Stufen, Strichelung nur bei 0 %, verdeckte Linien blass, Härte als Radius denken.

### Befunde

**1. Technisches Zeichnen**
- **Breiten:** ISO 128-20 nutzt eine Reihe von 0,13 bis 2 mm im Verhältnis 1 : √2. Extra breite, breite und schmale Linien stehen im Verhältnis 4 : 2 : 1; eine Linie ist überall gleich breit; benachbarte Breiten müssen eindeutig unterscheidbar bleiben [1].
- **Strichmaße hängen an der Breite d:** Punkt ≤ 0,5 d, Lücke 3 d, kurzer Strich 6 d, Strich 12 d, langer Strich 24 d. Strichlinien sollen sich an einem Strich treffen [1].
- **Bedeutungen:** breite Volllinie = sichtbare Kanten und Umrisse; schmale Strichlinie = verdeckte Kanten; Strichpunktlinie = Mittellinien; Strich-Zweipunktlinie = angrenzende Teile und Endlagen [2].
- **Lichtkanten:** Gerundete Übergänge haben keine klare Kante. Man zeichnet sie als schmale Volllinie, die vor den Körperkanten endet [2, 3]. Eine scharfe Kante bekommt dieselbe breite Linie wie der Umriss [2].
- **Tangentenkanten in CAD:** Onshape zeigt sie durchgezogen, gestrichelt („Phantom“) oder gar nicht [4]; SOLIDWORKS bietet eine eigene Linienart und das Ausblenden der Enden [5]; Inventor kürzt sie auf Wunsch [6] – die Lichtkante in Software.
- **Folge für „gestrichelt = glatt“:** CAD zeichnet glatte Übergänge tatsächlich gestrichelt. Die Norm vergibt die Strichlinie aber an verdeckte Kanten. Eine Kollision entsteht, sobald eine Ansicht verdeckte Linien zeigt, also in Back und Bottom.

**2. Schiffbau: Linienriss**
- Der Linienriss zeigt die Rumpfform in drei Ebenen: Längsschnitte im Seitenriss, waagerechte Schnitte im Wasserlinienriss, Querschnitte im Spantenriss [7, 8]. Jeder Schnitt zeigt in seiner Ansicht die wahre Form, in den beiden anderen ist er ein gerader Strich [9].
- Im Spantenriss steht wegen der Symmetrie nur je ein halber Spant: Achterschiff links, Vorschiff rechts [7, 9]. Eine Ansicht trägt so Vorder- und Rückseite zugleich.
- **Knick (Chine, Knuckle):** eine scharfe Winkeländerung im Querschnitt. Ein harter Knick ist kaum gerundet, ein weicher gerundet, trennt aber noch zwei Flächen [10]. Ein Knick ist in jedem Spant eine Ecke und in Seite und Draufsicht eine Linie [11] – genau Florians „Ecke in der Silhouette = Kante in den anderen Ansichten“.
- **Härte mit Verlauf gibt es wirklich:** In einem Gleitboot-Patent werden die Knicke nach vorn allmählich weicher, bis sie am Steven verschwinden [12].
- **Straken:** Ein Riss gilt als gestrakt, wenn Spantenriss, Seite und Draufsicht an allen Messpunkten übereinstimmen [11]; im Autobau heißt Straken, Beulen und S-Schläge herauszuarbeiten [13].

**3. Autodesign**
- Charakterlinien beschreibt man über **Winkel und Radius**: Linien mit mehr als 155° und weniger als 48 mm Radius heißen „subtil“ [14]; die kleinsten pressbaren Radien lagen bei 20, 8, 7 und 4 mm für 175°, 170°, 165° und 160° [15]; für Haubenlinien bis 20 mm bei mindestens 130° [16]. Schärfe ist also Radius plus Knickwinkel; ein fast flacher Knick wird zwangsläufig weich.
- Schärfe zeigt man über Licht: scharfe Falten geben „knackige, enge“ Glanzlichter [17]; die Flächengüte prüft man mit Zebrastreifen (G0 springen, G1 knicken, G2 fließen) [18]. Eine Regel „Strichstärke = Schärfe“ fand sich im Autodesign nicht.
- Tape-Drawings entstehen 1 : 1 mit schwarzem Klebeband und liefern lange, glatte Linien [17, 19].

**4. Werkzeuge**
- **Blender:** Kantenschärfe (⇧E) und Bevel-Gewicht im normalen Bearbeitungsmodus, Wert oben im Viewport und in der Seitenleiste [20]; gezeichnet als farbiger Saum (Schärfe magenta, Bevel blau) mit Deckkraft nach Wert [21, 22].
- **Maya:** eigenes Crease-Werkzeug mit Einblendung; geschärfte Kanten erscheinen als dickere Linien, der Wert zählt die Stufen, die scharf bleiben [23]; ein Fenster verwaltet Kanten-Sätze und färbt Blau (0) bis Rot (≥ 4) [24].
- **Fusion (T-Splines):** Crease/UnCrease; weicher über zusätzliche Kanten; an Sternpunkten enden Falten abrupt [25].
- **Plasticity:** Rundung auf gewählten Kanten, Ziehen am Griff setzt den Abstand, Zwischenpunkte mit wechselndem Abstand [26]. **Gravity Sketch:** Falten auf Kanten oder Ringen, schärfer durch zusätzliche Ringe [27]. **Shapr3D** und **Nomad** kennen keine wechselnden Radien bzw. keine Kantenschärfe [28, 29].
- **Illustrator-Breitenwerkzeug (⇧W):** Klick setzt einen Breitenpunkt, Ziehen ändert die Breite, ⌥ nur eine Seite; Profile lassen sich speichern und auf andere Pfade legen [30].
- **Gemeinsames Muster:** Kein Werkzeug hat einen eigenen Arbeitsbereich für Kanten. Form und Kanten liegen in derselben Ansicht, Kanten bekommen ein Werkzeug oder einen Befehl auf die Auswahl, eine Zahlenanzeige und eine Überlagerung; den Überblick geben Listen wie Mayas Satz-Fenster [24].

**5. Forschung**
- **FiberMesh:** Gezeichnete Kurven bleiben Griffe, glatt (blau) oder scharf (rot); die Art lässt sich auch nur für ein Stück wechseln; offene scharfe Kurven mitten auf glatter Fläche sind möglich [31].
- **Teddy** bläst Umrisse auf, Falten nennen die Autoren als künftige Funktion [32]; **Monster Mash** arbeitet aus einer Ansicht, mehrere Ansichten sind Ausblick [33]; **SmoothSketch** ergänzt verdeckte Konturen [34].
- **OpenSketch** (über 400 Designer-Skizzen): Beschreibende Linien sind Silhouetten, Falten und **Querschnitte**. Falten sind scharf wie Würfelkanten oder glatt wie der Übergang von flach zu gekrümmt. Die Krümmung glatter Flächen klären Designer mit Querschnittslinien [35].
- **Kurven zu Flächen:** True2Form [36], Lifting [37], CrossShade (Normalen aus kreuzenden Querschnitten) [38], BendSketch (Umriss, Biegelinien, Grate, Täler, scharfe Kanten) [39], Fließlinien und Quad-Netze aus Kurvennetzen [40, 41].
- **Halbscharfe Kanten (Pixar):** N Stufen scharf, danach glatt; Bruchwerte stufenlos, auch entlang einer Kante; echte Objekte haben auch an scharfen Stellen einen endlichen Radius [42]. **OpenSubdiv:** Schärfe 0–10, Chaikin-Regel glättet wechselnde Schärfe entlang einer Kette [43].

**6. Wahrnehmung**
- **Breite** ist das am feinsten lesbare Linienmerkmal: bis 7 px liegt die Unterschiedsschwelle bei etwa 0,7 px; bis 30 px 23 Stufen, für Strichelung 13, für Helligkeit 11, auf farbigem Grund weniger [44].
- **1, 2, 3 px:** nebeneinander unterscheidbar, eine einzelne Linie auf 10 % genau lesen geht nicht; vorsichtiger gemessen 3 Stufen für Strichelung, 4 für Helligkeit [44].
- **Helligkeit zusätzlich zur Breite** beschleunigt Trennen und Gruppieren in dichten Bildern [45].
- **Strichelung:** Für Unsicherheit zeichnen Menschen am liebsten gestrichelt, „längere Striche = sicherer“ [44]; nur für lange Linien; das Muster in Bildschirm-Pixeln halten, sonst verschmilzt es beim Zoomen [46, 47].
- **Was Linien zeigen:** Linienbilder zeigen kastige Formen gut, glatte schlecht (Neigung um 15° bzw. 35–40° falsch geschätzt) [48]; Menschen setzen Linien sehr einheitlich, vor allem an Umrissen [49].

**7. Grenzen der Darstellung**
- Ein Objekt lässt sich genau dann aus Silhouetten rekonstruieren, wenn es mit seiner visuellen Hülle übereinstimmt [50, 51]; die Hülle füllt Mulden auf, als striche man Knetmasse mit einem Lineal glatt [51].
- Front und Back haben gespiegelt denselben Umriss, ebenso Top und Bottom; die Seite braucht wegen der Symmetrie keine Gegenansicht.
- Drei Umrisse legen höchstens den Schnitt dreier Extrusionen fest; was dazwischen liegt, entscheidet die Loft-Regel (eigene Rechnung, Beispiel Steinmetz-Körper [52]).
- Unsichtbar für Umrisse: Mulden und Sättel, Hohlformen und Löcher, verdeckte Bereiche (zwischen Beinen und Bauch), die Querschnittsform zwischen den Umrissen. Querschnitte zeigen die wahre Form eines Schnitts, Linien mit eigener Tiefe setzen Grate und Täler mitten in die Fläche [7, 8, 31, 35].

### Was heißt das für uns
- **Spanten:** halbe Querschnitte an frei gewählten Stellen, gezeichnet in Front oder Back, in Seite und Top ein gerader Strich [7, 35]. Optional eine **Spantenriss-Ansicht**: rechts die vordere Hälfte, links die hintere, wie im Schiffbau [7, 9].
- **Kanten mit Tiefe:** ein wahlweiser Versatz zur Fläche (+ Grat, − Rinne); mit 0 % eine weiche Mulde, mit 100 % eine scharfe Rinne [31].
- **Darstellung:** Die Daten bleiben stufenlos, sichtbar sind etwa vier Stufen (glatt gestrichelt, weich 1 px, fest 2 px, scharf 3 px schwarz); Helligkeit läuft mit; Zahlen nur bei Auswahl und Hover; Strichelung zoomfest in Bildschirm-Pixeln, nur nahe 0 %, mit wachsender Härte längere Striche; verdeckte Linien blass, nie gestrichelt; weiche Kanten enden 2–3 px vor dem Umriss (Lichtkante), harte stoßen an.
- **Bedienung:** Kantenliste in der Seitenleiste (wie Mayas Satz-Fenster), Ebenenschalter (Kanten zeigen, dämpfen, sperren); Farbe nur für Zustände (Hover, Auswahl, abgeleitet); beim Zeigen den Knickwinkel aus dem 3D nennen.
- **3D:** **Härte als Radius denken.** Die Schärfe einer Catmull-Clark-Kante hängt an der Käfigdichte (Rundungsbreite ≈ Käfigabstand / 2^s, eigene Faustregel); besser einen Zielradius relativ zur Körpergröße speichern und die Schärfe daraus rechnen [14, 15, 23, 42]. 100 % muss nicht unendlich scharf sein [42]. Kanten liegen nur auf Ringen oder Längslinien des Käfigs; kurze oder schräge Kanten brauchen eingefügte Ringe [25]. Zum Prüfen eine Zebra- oder Glanzlicht-Ansicht [18, 48].
- **Tests:** Vergleichsbild Florians Bogen | Editor mit 0, 30, 70, 100 %; Lesetest (Florian sortiert 8 Kanten ohne Zahlen nach Härte, höchstens ein Tausch); Zoomtest 50–400 %; Rundreise 3D → Silhouetten + Kanten (+ Spanten) → 3D mit Abweichung in Zahlen.

Die Recherche fand auf den besuchten Seiten keine Anweisungen an KI-Agenten. Nur über Suchtreffer oder Zusammenfassung geprüft: [5] (Seite lädt per JavaScript), [37], [38], [45]; OpenSketch über die 2,3-MB-Kopie auf delftdesigndrawing.com.

### Quellen
1. ISO 128-20:1996, identisch als IS 10714 (Part 20):2001 – https://law.resource.org/pub/in/bis/S01/is.10714.20.2001.pdf
2. Maschinenbau-Wissen: Linienarten in technischen Zeichnungen – https://www.maschinenbau-wissen.de/skript3/konstrkution-entwicklung/technisches-zeichnen/190-linienarten
3. tec.Lehrerfreund: Schnitte nach DIN ISO 128-40 (Lichtkanten) – https://www.lehrerfreund.de/technik/1s/schnitte-din-iso-128-40/3041
4. Onshape-Hilfe: Tangent Edges Visible, Phantom, and Removed – https://cad.onshape.com/help/Content/View/tangent_edges_visible_phantom_and_removed.htm
5. SOLIDWORKS-Hilfe 2025: Tangent Edge Display Overview – https://help.solidworks.com/2025/English/SolidWorks/Sldworks/c_tangent_edge_display_overview.htm
6. Inventor-LT-Hilfe: Drawing View (Tangent Edges, Foreshortened) – https://help.autodesk.com/cloudhelp/2015/ENU/InventorLT-Help/files/GUID-99E6D0FB-D4C9-44A8-B479-F33C134730F8.htm
7. Wikipedia: Linienriss – https://de.wikipedia.org/wiki/Linienriss
8. Wärtsilä Encyclopedia: Lines plan – https://wartsila.com/encyclopedia/term/lines-lines-plan
9. Maritime Page: Ship hull construction, main plans and drawings – https://maritimepage.com/ship-hull-construction-main-plans-and-drawings/
10. Wikipedia: Chine (boating) – https://en.wikipedia.org/wiki/Chine_(boating)
11. FAO: Lofting-Handbuch, Kapitel 2 – https://www.fao.org/4/V9468E/v9468e05.htm
12. US-Patent 4,774,902: Mid-planing hull – https://patents.google.com/patent/US4774902A/en
13. Wikipedia: Strak – https://de.wikipedia.org/wiki/Strak
14. Effects of the material properties and thickness on the minimum formable radius in the subtle feature forming process (PMC) – https://pmc.ncbi.nlm.nih.gov/articles/PMC10070667/
15. Lee, Yu, Youn, Chung 2021: The Minimum Formable Radius of Subtle Feature Lines in Automotive Outer Panel Stamping – https://pure.seoultech.ac.kr/en/publications/the-minimum-formable-radius-of-subtle-feature-lines-in-automotive/
16. US-Patent 12,168,477: Method for manufacturing press-formed product – https://patents.google.com/patent/US12168477
17. Car Design News: Glossary of automotive design terms – https://www.cardesignnews.com/designers/a-is-fora-comprehensive-glossary-of-automotive-design-terms/506932
18. Rhino 8: Zebra – https://docs.mcneel.com/rhino/8/help/en-us/commands/zebra.htm
19. Buxton: Tape Drawing – https://billbuxton.com/tapeDrawing.htm
20. Blender-Handbuch: Edge Data – https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/edge_data.html
21. Blender-Quelltext: overlay_edit_mesh_common_lib.glsl (v4.2) – https://github.com/blender/blender/blob/v4.2.0/source/blender/draw/engines/overlay/shaders/overlay_edit_mesh_common_lib.glsl
22. Blender-Quelltext: userdef_default_theme.c (v4.2) – https://github.com/blender/blender/blob/v4.2.0/release/datafiles/userdef/userdef_default_theme.c
23. Maya-Hilfe: Crease polygonal edges and vertices – https://help.autodesk.com/cloudhelp/2022/ENU/Maya-Modeling/files/GUID-DEB060F9-A4B1-4F73-8B4D-B18A13D0E54B.htm
24. Maya-Hilfe: Crease Set Editor menus – https://help.autodesk.com/cloudhelp/2017/ENU/Maya/files/GUID-2E832B39-59DC-4A6D-8077-10C076F2A6C1.htm
25. Fusion-Hilfe: Form Modify Tools – https://help.autodesk.com/cloudhelp/ENU/Fusion-Sculpt/files/FRM-MODIFY-TOOLS.htm
26. Plasticity: Fillet Shell – https://doc.plasticity.xyz/solid/fillet-shell
27. Gravity Sketch: Crease – https://help.gravitysketch.com/hc/en-us/articles/5913003925533-Crease
28. Shapr3D-Forum: Variable fillet radius – https://discourse.shapr3d.com/t/is-it-possible-to-add-a-variable-fillet-radius-to-the-chamfer-filet-feature/30300
29. Nomad-Forum: Edge crease options to control subdivision – https://forum.nomadsculpt.com/t/edge-crease-options-to-control-subdivision/24073
30. Peachpit: Width Tool and Stroke Profiles (Illustrator) – https://www.peachpit.com/articles/article.aspx?p=2979069
31. Nealen et al. 2007: FiberMesh – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/fibermesh
32. Igarashi et al. 1999: Teddy – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf
33. Dvorožňák et al. 2020: Monster Mash – https://dcgi.fel.cvut.cz/~sykorad/monster_mash.html
34. Karpenko, Hughes 2006: SmoothSketch – https://cs.brown.edu/people/jhughes/papers/Karpenko-S3F-2006/main.htm
35. Gryaditskaya et al. 2019: OpenSketch – https://ns.inria.fr/d3/OpenSketch/
36. Xu et al. 2014: True2Form – https://www.cs.ubc.ca/labs/imager/tr/2014/True2Form/index.htm
37. Gryaditskaya et al. 2020: Lifting Freehand Concept Sketches into 3D – https://hal-univ-tlse3.archives-ouvertes.fr/INRIA/hal-02952509
38. Shao et al. 2012: CrossShade – https://hal-univ-tlse3.archives-ouvertes.fr/INRIA/hal-00703202
39. Li et al. 2017: BendSketch – https://history.siggraph.org/?p=102447
40. Bessmeltsev et al. 2012: Design-Driven Quadrangulation of Closed 3D Curves – https://www.cs.ubc.ca/labs/imager/tr/2012/Quadrangulation/
41. Pan et al. 2015: Flow Aligned Surfacing of Curve Networks – https://doi.org/10.1145/2766990
42. DeRose, Kass, Truong 1998: Subdivision Surfaces in Character Animation – https://graphics.pixar.com/library/Geri/paper.pdf
43. OpenSubdiv: Subdivision Surfaces (Semi-Sharp Creases, Chaikin Rule) – https://github.com/PixarAnimationStudios/OpenSubdiv/blob/release/documentation/subdivision_surfaces.rst
44. Sterzik et al. 2023: Perception of Line Attributes for Visualization – https://arxiv.org/abs/2308.04150
45. Nothelfer, Gleicher, Franconeri 2017: Redundant encoding strengthens segmentation and grouping in visual displays of data – https://graphics.cs.wisc.edu/Papers/2017/NGF17/
46. QCAD-Forum: Dashed lines become continuous – https://forum.qcad.org/t/solved-dashed-lines-become-continuous-in-printed-layout-viewport/7192
47. AutoCAD-LT-Hilfe: Linetype scaling (PSLTSCALE) – https://help.autodesk.com/cloudhelp/2018/ENU/AutoCAD-LT/files/GUID-4323BBAD-2757-4E92-B2E4-E0E550BB37CB.htm
48. Cole et al. 2009: How Well Do Line Drawings Depict Shape? – https://www.cs.princeton.edu/~funk/cole09.pdf
49. Cole et al. 2008: Where Do People Draw Lines? – https://pixl.cs.princeton.edu/pubs/Cole_2008_WDP/index.php
50. Laurentini 1994: The Visual Hull Concept for Silhouette-Based Image Understanding – https://cgvg.polito.it/vhull.html
51. Bottino, Laurentini: The Visual Hull of Smooth Curved Objects – https://cgvg.polito.it/Articles/The%20Visual%20Hull%20of%20Curved%20Objects.pdf
52. Wikipedia: Steinmetz solid – https://en.wikipedia.org/wiki/Steinmetz_solid
