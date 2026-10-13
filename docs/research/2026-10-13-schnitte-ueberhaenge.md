# Echte Schnitte, Überhänge, Einbuchtungen: Denkfehler oder Grenze des Netzes? (13.10.2026)

> Florian (13.10. morgens, mit drei Bildern, gesichert als `docs/look/editor/07-ueberhang-spant-3d.webp`, `08-spant-acht.webp`, `09-top-haken-3d.webp`):
> „Was wenn wir Spanten auch wirklich die Form darstellen würden, also in dem Fall meines Screenshots müssten es in der Front 2 Ringe sein für Schnauze und ‚Bauch‘. Wäre es eine Möglichkeit, Spanten dynamischer zu machen? So könnte ich Kanten vielleicht genau zeichnen. Also wenn ich z. B. eine Kante mit P an der Seite einzeichne, so ist sie erst mal ganz flach, da sie auf einer runden Seitenfläche liegt. Jeder Punkt auf der Kantenlinie ist auch ein Punkt im Spant. In der Vorderansicht kann ich diesen knicken und so eine richtige Kante erzeugen. Wenn ich also einen Spant wie bei Screenshot 2 forme, sollten die beiden Teile clippen und zu 2 Formen oben und unten werden. Der Teil, der in der Mitte überlappt, sollte weg, wodurch ein Bauch/Schnauze oder sogar ein Loch entstehen kann. Wenn ich in der Seite eine Schnauze oder einen Überhang einzeichne, sollte das eigentlich doch auch gehen, ohne dass es im 3D-Modell so komisch ausgeblockt wird, und das auch ohne Wirbelsäule. Auch in Screenshot 3 verstehe ich nicht, warum die Form an den Stellen, die wieder nach innen laufen, ausgeblockt wird. Ich habe das Gefühl, die 3 Formen können viel besser zusammenspielen. Teste das bitte ausgiebig und untersuche, ob ich einen Denkfehler habe. Eventuell ist das Mesh auch falsch aufgebaut, um so etwas zu können? Gibt es bessere Lösungen? Vielleicht direkt in Lofts?“

## Kurzantwort

1. **Kein Denkfehler.** Alle fünf Wünsche sind geometrisch stimmig. Ein Schnitt durch deinen Körper bei S1 besteht wirklich aus zwei Teilen. Eine Acht ergibt wirklich zwei Formen; dafür braucht es allerdings die Hälften-Regel, nicht Gerade-Ungerade (Abschnitt 4). Ein Knick in einem Schnitt ergibt wirklich eine Kante. Überhänge und Haken sind echte Formen.
2. **Das Netz ist für diese Formen falsch aufgebaut.**
   - Der Körper ist eine Röhre mit **einem Ring je Stelle**. Jeder Ring nimmt aus der Seite nur die äußerste Ober- und Unterkante und aus dem Top nur die größte Breite.
   - Den Querschnitt holt jeder Ring aus der Front bzw. den Spanten, auf ihren Kasten normiert und Punkt für Punkt überblendet.
   - Ein Schnitt aus zwei Teilen, ein Loch oder eine Kerbe im Top lassen sich so nicht darstellen. Sie werden zugefüllt („ausgeblockt“). Eine Acht wird ein Ring, der sich selbst durchdringt.
   - Das steht sogar im Code: `packages/shape/src/platzhalter/loft.ts` („Überhänge und nicht monotone Seitenprofile werden nur angenähert“) und `packages/shape/src/versuch/tigerKaefig.ts`, `ringKontext().ring` (`yLo = min(...)`, `yHi = max(...)`, `w = max(...)`).
3. **Besser: ein Loft aus echten Schnitten.** Jede Stelle bekommt einen Schnitt als Fläche, der beliebig viele Teile und Löcher haben darf. Dazwischen wird über Abstandsfelder überblendet; so geht ein Teil stetig in zwei über. Das ist „direkt in Lofts“, nur ohne die Beschränkung auf einen Ring. Ein Versuch dazu läuft (Abschnitt 4).

## 1. Wie Ansichten und Schnitte zusammenhängen

- **Jede Ansicht ist eine Projektion des Körpers:**
  - Die **Seite** zeigt bei der Stelle x alle Höhen, die der Schnitt bei x irgendwo erreicht. Hat der Schnitt zwei Teile übereinander mit Luft dazwischen, zeigt die Seite dort zwei Intervalle, wie bei deiner Schnauze über dem Bauch.
  - Das **Top** zeigt bei x alle Breiten des Schnitts. Ein Haken im Top heißt: Der Schnitt hat dort seitlich eine Lücke.
  - Die **Front** zeigt die Vereinigung **aller** Schnitte. Sie ist ein Umriss, kein Schnitt. Deshalb kann sie zwei Ringe bei S1 nicht zeigen, ein Spant schon.
- **Daraus folgt eine Regel, die der Editor einhalten muss:** Ein Spant mit zwei Ringen übereinander passt nur zu einer Seite, die an dieser Stelle zwei Intervalle hat.
  - In deinem Bild stimmt das: Die Seite hat bei S1 Schnauze und Bauch.
  - Zeichnet man die Acht dort, wo die Seite durchgehend ist, widersprechen sich Spant und Seite. Dann muss der Editor entweder die Seite örtlich mitnehmen oder den Widerspruch zeigen. Das ist zu entscheiden; bisher ist es nirgends geregelt.

## 2. Florians Ideen einzeln

| Idee | stimmig? | Was zu beachten ist |
|---|---|---|
| **Spanten zeigen die echte Form** (zwei Ringe für Schnauze und Bauch) | ja | Jeder Ring braucht seine Ober- und Unterkante auf dem Seitenumriss (gemeinsame Punkte). Die Front bleibt ein Umriss; der echte Schnitt erscheint beim Spant, z. B. gestrichelt, sobald man ihn wählt. |
| **Dynamische Spanten für Kanten** (jeder Punkt der Kantenlinie ist ein Punkt im Spant, in der Front knicken) | ja | Das ist die Regel „Eine Kante ist eine Ecke in einem Shape“, wobei der Shape der Schnitt an der Stelle des Punktes ist. Läuft die Kantenlinie schräg, hat jeder Punkt seinen eigenen Schnitt; dazwischen läuft der Knick entlang der Linie weiter (Kantenlinie als Schiene, Schnitte als Profile). |
| **Acht clippt zu zwei Formen, Überlappung fällt weg, Loch möglich** | ja, mit der richtigen Regel | Korrektur nach dem Versuch (Abschnitt 4): Nicht Gerade-Ungerade, sondern die **Hälften-Regel** liefert das (jede Hälfte gilt nur auf ihrer Seite der Achse). Eine Acht in **einem** Spant wirkt bis zu den Nachbarspanten; dazwischen entsteht eine Gabelung von einem zu zwei Teilen. Ein Loch nur in einem Spant wird ein unsichtbarer Hohlraum. Ein Durchgang braucht das Loch über mehrere Spanten bis an eine Oberfläche. |
| **Überhang in der Seite ohne Wirbelsäule** | ja, für Schnauze über Bauch | Ein Schnitt mit mehreren Teilen löst das ohne Wirbelsäule. Bei stehenden Teilen (Langhals) schneidet ein Schnitt quer zur Länge den Hals der Länge nach; seine runde Form steckt dann in Front und Top. Die Wirbelsäule bleibt nützlich für Posen und Spanten quer zum Hals. |
| **Top-Haken nicht ausblocken** | ja | Bisher zählt nur die größte Breite. Mit echten Schnitten bleibt die Kerbe. |

## 3. Bessere Bauweisen

| Bauweise | Teile und Löcher | Kanten | feste Topologie | Einschätzung |
|---|---|---|---|---|
| Röhre mit einem Ring je Stelle (heute) | nein | ja (Crease) | ja | gut für einfache Körper, falsch für Überhänge, Kerben, Achten |
| Wirbelsäule | nein (nur Biegungen) | ja | ja | löst Hälse und Biegungen, keine Überhänge wie Schnauze über Bauch |
| **Loft aus echten Schnitten (implizit)** | **ja** | weich; scharf erst mit Dual Contouring | nein, erst über eine Vorlage | trägt alle fünf Wünsche; Versuch läuft |
| Verzweigter Käfig aus Schnitten (Contour Tiling) | ja | ja | je Form | fehleranfällig an Gabelungen, viel Code |
| Sichtbare Hülle (Schnitt der drei Umriss-Prismen) | ja | zu kantig | nein | drei Kreise ergeben keine Kugel, sondern den kantigen Steinmetz-Körper; nur als Grenze brauchbar |

**Vorschlag (geschärft durch die Recherche, Abschnitt 5):** „Das Feld entscheidet, der Loft baut.“
- Ein Abstandsfeld aus Ansichten und Spanten bestimmt je Stelle die Teile, also wo sie sich teilen und wo Löcher sind.
- Jedes Teil wird wie heute geloftet: exakte Umrisse, runde Formen, Kanten als Falten mit Härte.
- An Gabelungen setzt der Käfig ein Hosenstück.

Die Topologie wechselt nur, wenn sich die Zahl der Teile ändert. Rig und Maul hängen deshalb an Teil, Stelle und Winkel. Das reine Feld dient der schnellen Vorschau.

## 3a. Nachfrage (13.10. morgens): bessere Lösung? Braucht es die Kantenregler noch?

Florian: „Hältst du das für die bessere Lösung? Und brauche ich die Kantenregler dann noch? Das mache ich ja dann komplett über die Spanten und die eingezeichneten Kantenlinien.“

- **Für die Form ja, mit zwei Vorbehalten.** Echte Schnitte sind das einzige der getesteten Modelle, das alle fünf Fälle ohne Sonderweg trägt. Die Ansichten werden dabei zu Projektionen derselben Schnitte, wie im Linienriss.
  - Vorbehalt 1: Scharfe Kanten brauchen einen Vernetzer, der Ecken hält (Dual Contouring oder ein Netz entlang der gezeichneten Linien).
  - Vorbehalt 2: Animation, Maul und Varianten brauchen das feste Vorlagen-Netz darüber.

  Beides prüft der Versuch (Abschnitt 4), deshalb noch keine Zusage.
- **Kantenregler als eigene Regler: nein.**
  - Der **Winkel** einer Kante entsteht, wenn man den Punkt der Kantenlinie im Spant knickt.
  - Übrig bleibt nur, **wie rund** die Ecke ist. Das wird gezeichnet statt geregelt: als Radius an der Ecke wie Illustrators Live-Ecken (Eckenwidget ziehen) oder mit ⇧W entlang der Linie für Kanten, die in runde Formen auslaufen.
  - Tiefe (Grat/Rinne), Knickwinkel und die Härte-Stufen fallen als eigene Bedienelemente weg.
  - Ein Zahlenfeld für den Radius der gewählten Ecke in der Seitenleiste reicht, wie Illustrators Eckenradius im Steuerungsbedienfeld.

## 4. Versuch „Schnitt-Loft“ (gebaut 13.10.)

**Code:** `packages/shape/src/versuch/schnittLoft.ts` (Tests `schnittLoft.test.ts`), im Editor `apps/editor/src/schnitte/`, dritter Tab „schnitte“ am 3D-Fenster.
- Aufruf: `?versuch=schnitte&wesen=ueberhang|kugel|rex|tiger|robbe|langhals`, optional `&bauweise=bisher`, `&regel=gerade-ungerade`, `&ueberblenden=punkte`, `&spanten=0`.
- Florians Ente liegt als Prüfwesen in `apps/editor/public/versuch/ueberhang/ueberhang.json`, mit Overlay auf seine Kurven gelegt.

**So rechnet er:**
1. Je Scheibe entsteht die sichtbare Hülle aus allen Intervallen von Seite und Top und aus der Front.
2. Je Teil wird die Vorlage (Front bzw. Spant) in den Hüllkasten gerundet.
3. Daraus entstehen Abstandsfeld, Surface Nets und Taubin-Glättung. Im Editor rechnet er während Gesten im 56er Raster, beim Loslassen im 112er.
4. `schnittBei(f)` liefert den echten Schnitt; er erscheint in der Front gestrichelt beim gewählten Spant.

**Messwerte** (px bei 461 px je Kachel, Mittel/Max, bisher → schnitte):

| Wesen | Seite | Front | Top | Teile max | Bau bisher / schnitte |
|---|---|---|---|---|---|
| Kugel | 0,1/0,3 → 0,7/2,6 | 0,1/0,3 → 0,1/0,4 | 0,1/0,3 → 0,7/2,6 | 1 | 7 / 164 ms |
| **Florians Überhang** | 3,8/**55** → 1,3/**8,3** | 7,4/26 → 4,7/14 | 2,7/26 → 2,9/29 | 3 | 194 / 78 ms |
| Rex | 0,7/3,6 → 0,9/5,8 | 5,5/11 → 4,5/9,3 | 0,4/3,0 → 0,7/4,8 | 1 | 165 / 48 ms |
| Tiger | 0,8/6,0 → 1,3/4,2 | 1,0/2,3 → 0,8/1,8 | 0,4/1,5 → 1,2/4,2 | 1 | 169 / 122 ms |
| Robbe | 1,0/10,5 → 0,8/4,0 | 1,3/2,9 → 1,4/3,1 | 1,6/11 → 0,9/9,1 | 1 | 135 / 100 ms |
| **Langhals** (ohne Wirbelsäule) | 7,3/**37** → 1,6/**6,6** | 7,6/20 → 2,4/11 | 1,3/3,8 → 1,8/4,8 | 2 | 158 / 50 ms |

- Bauzeit warm: 13–40 ms im 56er Raster, 64–116 ms im 112er (Kugel 165 ms).
- Kugel: Radiusfehler im Mittel 0,2 px, maximal 2,3 px. Die reine Hülle (Steinmetz-Körper) läge 26 px daneben.
- Teile:
  - Ente bei S1: 2 Teile, auch ohne Acht.
  - Haken: 3 Teile (Körper und zwei Flossen). Die Kerbe bleibt offen; bisher war sie gefüllt.
- Kanten (gezeichnet ≈ 94°):
  - An den Spanten: 41° im Schnitt, 30–38° im Netz.
  - Halbwegs zwischen zwei Spanten: Bei Felder-Überblendung 3°, die Ecke verschwindet. Bei Punkt-Überblendung 51° im Schnitt, 23° im Netz.

**Bilder** (`docs/progress/editor/`):
- `schnitte-ueberhang-vergleich.png` (bisher gegen schnitte: seitlich, von oben, schräg)
- `schnitte-ueberhang-editor.png` (echter Schnitt bei S1 mit zwei Teilen)
- `schnitte-acht.png`, `schnitte-haken.png`, `schnitte-kugel.png`, `schnitte-rex.png`, `schnitte-langhals.png`

**Was der Versuch zu Florians Ideen zeigt:**
1. **Zwei Ringe:** bestätigt. Bei S1 ergibt schon die Seite zwei Teile.
2. **Acht clippen:** Eine Korrektur gegenüber Abschnitt 2.
   - Gerade-Ungerade wie in Illustrator entfernt die Mitte der **gespiegelten** Acht nicht: Sie ist nur einmal umschlossen, nur gegenläufig. Gemessen: Die Acht auf der Kugel ergibt mit Gerade-Ungerade 1 Teil, die Mitte bleibt gefüllt.
   - Florians Erwartung erfüllt die **Hälften-Regel**: Jede Hälfte gilt nur auf ihrer Seite der Achse, was hinüberläuft, schneidet weg. Damit ergibt die Acht 2 Teile.
   - Ein Loch geht: Die Acht auf der Kugel ergibt einen Durchgang, den man im Seitenumriss sieht.
   - Ein Spant wirkt bis zum Nachbarspant; vor S1 wird die obere Linse zur Schnauze.
   - Beide Regeln sind in der Seitenleiste umschaltbar.
3. **Kanten über Spant-Punkte:** stimmig, braucht aber gemeinsame Punkte zwischen den Spanten. Mit Felder-Überblendung verschwindet die Ecke, mit Punkt-Überblendung läuft sie als Kante weiter. Scharf wird sie erst als Kantenlinie im Netz (Falte); im Feld wird sie rund.
4. **Überhang ohne Wirbelsäule:** ja. Ente und Langhals sind deutlich genauer (Seite 55 → 8 px bzw. 37 → 7 px).
5. **Top-Haken:** ja, die Kerbe bleibt offen.

**Grenzen (deutlich):**
- **Kanten werden rund** (Raster und Glättung); die Kastenschnauze des Tigers ist weich.
- **Jedes Teil bekommt die volle Breite aus dem Top.** Bei mehreren Teilen sagen die Ansichten nicht, welches Teil wie breit ist. Deshalb beginnt der Bauch der Ente vorn mit einer flachen Wand. Abhilfe: eigene Spanten je Teil.
- **Widerspruch in der Zeichnung:** Die Glocke in der Front ist oben schmaler, als das Top die Schnauze zeigt. Die Schnauze wird deshalb schmaler (Top bis 29 px). Der Editor sollte solche Widersprüche zeigen; der gestrichelte 3D-Umriss tut das schon.
- **Die Kerbe des Hakens geht durch die ganze Höhe**, die Flossen werden senkrechte Platten.
- **Am Schnauzenansatz bleibt eine sichtbare Naht.** Die Rundung je Teil ist nur geglättet, nicht stetig.
- **Fehlt:** Maul, Kanten-Härte, Biegen. Die Punktzahl wechselt mit jeder Änderung; für Posen und Spiel braucht es ein Netz mit fester Punktzahl darüber.

**Fazit:** Der Versuch bestätigt die Richtung „Das Feld entscheidet, der Loft baut“ (Abschnitt 5). Für den Loft je Teil gilt:
- Zwischen Spanten werden Punkte überblendet (Kanten bleiben).
- Die Teilung folgt der Hälften-Regel.
- Darüber kommt ein Netz mit fester Punktzahl und Falten für die Härte.
- Die Rundung im Hüllkasten wird durch eine stetige ersetzt.

## 5. Recherche (13.10. morgens, 40 Quellen)

### Befunde

- **Schnitte verbinden (Contour Tiling):**
  - Fuchs, Kedem, Uselton verbinden zwei Umrisse mit Dreiecken kleinster Fläche, aber nur einen Umriss je Schnitt [1]. Boissonnat verbindet mehrere über Delaunay-Tetraeder [2].
  - Bajaj, Coyle, Lin füllen Verzweigungen und Löcher über die Mittelachse; die Mittelachse bildet zwischen zwei Schnitten den Sattel [3].
  - Barequet, Sharir erlauben beliebig verschachtelte Umrisse [4]. Neuere Verfahren lassen Teilezahl und Löcher vorgeben [5, 6].
  - Aus Schnitten lässt sich der **Reeb-Graph** bauen: der Stammbaum der Teile entlang der Achse. An einem Sattel teilt sich ein Teil wie ein Y [7, 8].
  - Gängige CAD-Lofts verzweigen nicht. McNeel rät dafür zu SubD [9], Onshape kann nicht von einem auf zwei Profile loften [10], NetworkSrf braucht ein Gitter sich kreuzender Kurven [11].
- **Abstandsfelder:**
  - Formbasierte Interpolation speichert je Schnitt den vorzeichenbehafteten Randabstand, interpoliert ihn und nimmt den nichtnegativen Bereich als Körper [12, 13]. Teilung und Löcher entstehen von selbst. Verschobene Teile richtet man vorher aus [14].
  - Paarweise Interpolation knickt an jedem Schnitt; eine gemeinsame variationelle Funktion bleibt glatt [15].
- **Silhouetten:**
  - Die sichtbare Hülle ist der größte Körper mit denselben Umrissen; Mulden, die kein Umriss zeigt, fehlen [16].
  - Drei Kreise ergeben den kantigen Steinmetz-Körper, etwa 12 % voluminöser als die Kugel [17].
  - Rivers, Durand, Igarashi: Reine Schnittkörper aus Ansichten haben „immer scharfe Kanten“ und taugen schlecht für organische Formen [18]. Aus drei Ansichten sind mehrere Körper möglich [19], bei mehreren Teilen auch Geisterteile [20].
  - Teddy legt die Achse auf die Mittelachse des Umrisses [21]; Monster Mash bläst per Poisson-Gleichung auf [22].
- **Kanten und Kurvennetze:**
  - Beim Vernetzen eines Feldes bleiben scharfe Kanten nur mit Normalen erhalten (Dual Contouring, Extended Marching Cubes) [23, 24]. Eine Abstufung zwischen scharf und glatt kennen diese Verfahren nicht.
  - Halbscharfe Falten in Unterteilungsflächen reichen stufenlos von glatt bis scharf [25, 26].
  - Im Schiffbau besteht der Linienriss aus Spanten, Wasserlinien und Längsschnitten [27]. DELFTship baut Rümpfe als Unterteilungsfläche mit Knicklinien und rechnet den Linienriss aus dem 3D [28]. Eine Kimmkante kann abschnittsweise hart und weich sein [29].
  - Gordon-Flächen verlangen gemeinsame Punkte von Profilen und Führungen [30, 31]. In Fusion müssen Schienen jeden Schnitt treffen [32]. Rhino „Section“ leitet Schnitte aus dem Körper ab [33].
- **Feste Topologie:**
  - Shrinkwrap und Wrap legen ein Netz auf ein Ziel; die Topologie bleibt die der Vorlage [34, 35]. Partikel lassen sich auf einer impliziten Fläche halten [36].
  - Ein Catmull-Clark-Käfig lässt sich so lösen, dass die Grenzfläche durch gegebene Punkte geht [37].
  - Kantenlinien lassen sich zu Grenzen eines Vierecknetzes machen [38]. SQM setzt an Verzweigungen ein Knotenstück [39].

### Was heißt das für uns

**Die Wünsche sind stimmig, mit vier Präzisierungen:**
1. **Echter Schnitt:**
   - Was der Spant in der Höhe abdeckt, zeigt die Seite an seiner Station, nicht mehr und nicht weniger. Dasselbe gilt für die Breite im Top, und der Spant liegt ganz in der Front.
   - Teile übereinander (Schnauze über Bauch) brauchen eine Lücke in der Seite, Teile nebeneinander eine im Top, schräg versetzte Teile keine.
   - Zeigen beide Ansichten Lücken, entscheidet der Spant, welche Teile echt sind [20].
   - Ein Loch sieht man in keiner Ansicht, solange es nicht durchgeht; nur der Spant kennt es [16].
2. **Gerade-Ungerade** ist eindeutig, in Illustrator wie in SVG [40].
   - Eine Acht ergibt zwei Teile mit einem Berührpunkt. Das ist genau der Schnitt durch den Sattel, an dem sich ein Teil teilt.
   - Für die Acht wirken beide Füllregeln gleich. Erst bei einer Schleife nach innen entscheidet Gerade-Ungerade: Dort entsteht ein Loch am Rand, der Anfang einer Tasche.
3. **Kante durch Knick:** So entstehen Kimmkanten, und so verlangen es Gordon-Flächen. Bedingung: Die Kantenlinie trifft jeden Spant, den sie überspannt, in einem gemeinsamen Punkt. Die Härte gehört als **halbscharfe Falte ins Netz**, nicht ins Feld. Das passt zu „Rundung zeichnen statt regeln“ (Abschnitt 3a).
4. **Überhang ohne Wirbelsäule** geht, denn ein Überhang quer zur Achse ist nur ein Schnitt mit zwei Teilen.
   - Grenze: Glieder, die steil von der Längsachse weglaufen (Hals nach oben, eingerollter Schwanz), schneiden die Spanten der Länge nach.
   - Solche Glieder brauchen eine eigene Achse, abgeleitet wie bei Teddy aus der Mittelachse des Umrisses.
   - Die gezeichnete Wirbelsäule bleibt für Pose und Biegen.

**Bauweise: Ja, direkt im Loft, aber mehrteilig. Das Feld entscheidet, der Loft baut.**
- **Teile:** Ein Abstandsfeld aus Ansichten (alle Intervalle) und Spanten bestimmt je Station die Teile. Über die Überlappung zwischen Stationen entsteht der Reeb-Graph: Wo Teile entstehen, sich teilen, enden und Löcher beginnen. Acht und Schleife setzen die Sättel.
- **Form je Teil:** ein Loft wie heute, aber je Teil.
  - Die Spanten des Teils werden über gemeinsame Punkte interpoliert; ohne Spant gilt die Front-Form.
  - Dann wird in die Intervalle des Teils eingepasst. So bleiben die Umrisse exakt, die Formen rund und die Ecken an gemeinsamen Punkten.
- **Übergänge:** Die Teile werden als Abstandsfelder glatt vereinigt. Das liefert die Sattelform, den berechneten Schnitt und eine schnelle Vorschau (Surface Nets im Worker).
- **Käfig:**
  - Je Teil und Station ein Ring mit fester Punktzahl, Kantenpunkte auf festen Indizes, Längskanten als Falten mit Härte.
  - Am Sattel ein Hosenstück (vergleichbar SQM), an den Enden Kappen, Löcher als innere Ringfolge.
  - Der Käfig wird so gelöst, dass die Grenzfläche durch die Ringpunkte geht [37].
  - Die Topologie wechselt nur, wenn sich der Reeb-Graph ändert. Rig und Maul hängen an (Teil, Station, Winkel) statt an Punktnummern.
- **Anzeige:** Jeder Spant zeigt den berechneten Schnitt neben der gezeichneten Linie und markiert Abweichungen, wie ein aus dem 3D gerechneter Linienriss [28, 33].

**Warum nicht anders:**
- Reines Contour Tiling liefert Dreiecke und viele Sonderfälle [3, 4].
- Ein reines Feld liefert kein festes Netz und keine Härte.
- Remeshing entlang der Linien [38] wechselt bei jeder Bearbeitung die Topologie und taugt nur als Rückfall.
- Ein Vorlagen-Netz per Wrap hält die Topologie nur innerhalb einer Klasse.

**Erster Test (kein Ergebnis):** Schnauze über Bauch, Acht-Spant und Haken im Top als Vergleichsbild. Kriterien:
- Die Umrisse decken sich mit den Zeichnungen.
- Der berechnete Schnitt deckt sich mit dem Spant.
- Die Punktzahl bleibt beim Ziehen gleich.
- Die Kante zeigt ihre Härte.

### Quellen

1. Fuchs, Kedem, Uselton: Optimal surface reconstruction from planar contours. CACM 20(10), 1977. https://doi.org/10.1145/359842.359846
2. Boissonnat: Shape reconstruction from planar cross sections. CVGIP 44(1), 1988. https://doi.org/10.1016/S0734-189X(88)80028-8
3. Bajaj, Coyle, Lin: Arbitrary topology shape reconstruction from planar cross sections. GMIP 58(6), 1996. https://doi.org/10.1006/gmip.1996.0044
4. Barequet, Sharir: Piecewise-linear interpolation between polygonal slices. CVIU 63(2), 1996. https://doi.org/10.1006/cviu.1996.0018
5. Zou, Holloway, Carr, Ju: Topology-constrained surface reconstruction from cross-sections. ACM TOG 34(4), 2015. https://doi.org/10.1145/2766976
6. Huang, Zou, Carr, Ju: Topology-controlled reconstruction of multi-labelled domains from cross-sections. ACM TOG 36(4), 2017. https://www.cs.wustl.edu/~taoju/zhiyang/Topo.html
7. Shinagawa, Kunii: Constructing a Reeb graph automatically from cross sections. IEEE CG&A 11(6), 1991. https://doi.org/10.1109/38.103393
8. Reeb graph (Wikipedia). https://en.wikipedia.org/wiki/Reeb_graph
9. McNeel-Forum: Creating 3D surface from cross sectional curves. https://discourse.mcneel.com/t/creating-3d-surface-from-cross-sectional-curves/33889
10. Onshape-Forum: Loft mit mehreren Profilen. https://forum.onshape.com/discussion/comment/120776/
11. Rhino 8: NetworkSrf. https://docs.mcneel.com/rhino/8/help/en-us/commands/networksrf.htm
12. Raya, Udupa: Shape-based interpolation of multidimensional objects. IEEE TMI 9(1), 1990. https://doi.org/10.1109/42.52980
13. Herman, Zheng, Bucholtz: Shape-based interpolation. IEEE CG&A 12(3), 1992. https://doi.org/10.1109/38.135915
14. Zukić u. a.: nD morphological contour interpolation. Insight Journal, 2016. https://insight-journal.org/pdfs/977.pdf
15. Turk, O'Brien: Shape transformation using variational implicit functions. SIGGRAPH 1999. https://faculty.cc.gatech.edu/~turk/my_papers/schange.pdf
16. Laurentini: The visual hull concept for silhouette-based image understanding. IEEE PAMI 16(2), 1994. https://doi.org/10.1109/34.273735
17. Steinmetz solid (Wikipedia). https://en.wikipedia.org/wiki/Steinmetz_solid
18. Rivers, Durand, Igarashi: 3D modeling with silhouettes. ACM TOG 29(4), 2010. https://doi.org/10.1145/1778765.1778846
19. Wesley, Markowsky: Fleshing out projections. IBM J. Res. Dev. 25(6), 1981. https://doi.org/10.1147/rd.256.0934
20. Bogomjakov, Gotsman: Reduced depth and visual hulls of complex 3D scenes. CGF 27(2), 2008. https://researchwith.njit.edu/en/publications/reduced-depth-and-visual-hulls-of-complex-3d-scenes/
21. Igarashi, Matsuoka, Tanaka: Teddy. SIGGRAPH 1999. https://doi.org/10.1145/311535.311602
22. Dvorožňák u. a.: Monster Mash. ACM TOG 39(6), 2020. https://dcgi.fel.cvut.cz/~sykorad/monster_mash.html
23. Ju, Losasso, Schaefer, Warren: Dual contouring of Hermite data. ACM TOG 21(3), 2002. https://www.cs.wustl.edu/~taoju/research/dualContour.pdf
24. Kobbelt, Botsch, Schwanecke, Seidel: Feature sensitive surface extraction from volume data. SIGGRAPH 2001. https://doi.org/10.1145/383259.383265
25. DeRose, Kass, Truong: Subdivision surfaces in character animation. SIGGRAPH 1998. https://doi.org/10.1145/280814.280826
26. OpenSubdiv: Modeling Tips. https://github.com/PixarAnimationStudios/OpenSubdiv/blob/release/documentation/mod_notes.rst
27. Linienriss (Wikipedia). https://de.wikipedia.org/wiki/Linienriss
28. DELFTship (Unterteilungsflächen, Knicklinien, Linienriss aus dem 3D). https://directory.boatdesign.net/detail/7414.htm
29. US 10 988 210 B2: Hybrid chine boat hull. https://patents.google.com/patent/US10988210B2/en
30. Siggel u. a.: TiGL (Gordon-Flächen). Mathematics in Computer Science, 2019. https://arxiv.org/abs/1810.10795
31. Coons: Surfaces for computer-aided design of space forms. MIT MAC-TR-41, 1967. https://dspace.mit.edu/handle/1721.1/149362
32. Autodesk Fusion: Loft (Form), Schienen und Mittellinie. https://help.autodesk.com/cloudhelp/ENU/Fusion-Sculpt/files/FRM-REF-LOFT-DLG.htm
33. Rhino: Section. https://docs.mcneel.com/rhino/5/help/en-us/commands/section.htm
34. Blender-Handbuch: Shrinkwrap. https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/shrinkwrap.html
35. R3DS Wrap 3.4. https://www.cgchannel.com/2019/06/r3ds-ships-wrap-3-4/
36. Witkin, Heckbert: Using particles to sample and control implicit surfaces. SIGGRAPH 1994. https://doi.org/10.1145/192161.192227
37. Halstead, Kass, DeRose: Efficient, fair interpolation using Catmull-Clark surfaces. SIGGRAPH 1993. https://doi.org/10.1145/166117.166121
38. Pietroni u. a.: Reliable feature-line driven quad-remeshing (QuadWild). ACM TOG 40(4), 2021. https://doi.org/10.1145/3450626.3459941
39. Bærentzen, Misztal, Wełnicka: Converting skeletal structures to quad dominant meshes (SQM). Computers & Graphics 36(5), 2012. https://doi.org/10.1016/j.cag.2012.03.016
40. W3C SVG 2: fill-rule. https://www.w3.org/TR/SVG2/painting.html#FillRuleProperty

Hinweise der Recherche:
- Im Volltext gelesen wurden [3], [14], [15], [18], [21], [22] und [30], die übrigen nach Abstract, Doku oder Sekundärquelle; alle DOIs sind über Crossref geprüft.
- Eigene Schlüsse sind die Projektionsregel in Punkt 1, „Acht = Sattel“, die Grenze bei steilen Gliedern und der Bauweise-Vorschlag.
