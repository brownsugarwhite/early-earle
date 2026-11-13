# Runde 4 (13.11.2026): Florians Vision, geprüft

## Florians Vision (wörtlich, gekürzt um Tippfehler nicht korrigiert)

> „Statt der silhouette am boden sollen die 3 ansichten in cmy (ohne k) an die seiten projeziert sein. Nicht wieder den style
> aus den alten versuchen benutzen. sie sind aber nicht fest projeziert sonder verschieben sich mit der bewegung im raum. Genau
> in der seiten front und topansivht wird die ansicht mit einem morph zur seitenansicht. Dreht man das mesh dass man von schräg
> oben darauf schaut liegen alle 3 ansichten übereinander und einfahrt genau das mesh. Sie bewegen sich beim drehen unddrehen
> sich ebenfalls so dass von einer 3d ansicht alle 3 formen konkruent sind undgenau die form des 3d meshes bilden. … Wenn mann
> dreht und die 3 ineinander laufen entsteht an der schnittfläche das material der 3d figur. Es gibt 2 optionen zu drehen. Den
> kompletten raum. alles dreht sich. Das material des 3d models ist immer enthalten und dieprojektionen bleiben an ihrer stelle
> und einmal nur das model und das licht bleibt dann an seiner stelle und die projektionen haben den beschriebenen effekt. Wie
> bei deiner ersten version soll man auch zur viereransicht wechseln können. … Das 3d objekt hat 2 zustände. Wireframe, wenn
> die projektionen die seiten anzeigen und ein optimales 3d material mit perfekt lesbaren linien und griffen. … Start: … von der
> seitenansicht … zeichne meine form mit dem vektorwerkzeug p ein. Bei bestätigung der form zieht sich die ansicht nach hinten.
> Die spiegelkante bleibt stehen und das mesh zieht sich wobbelig auf. als würde das wegziehen der seitenansicht einen windzug
> erzeugen … Man sieht dann das wireframe und die 3 seitenansichten als projektion an jede wand der ecke. Die wand selbst aber
> nicht einzeichnen … auf dem boden eine quadratische form die ein feld des späteren 2048 games andeutet.“

## Was eindeutig ist

1. Eine Raumecke ohne Wände. Auf den drei unsichtbaren Wänden liegen Seite, Front und Top als Projektionen in Cyan, Magenta,
   Gelb. Auf dem Boden ein Quadrat (Feld des 2048-Spiels).
2. Zwei Zustände des Wesens: Drahtmodell (wenn die Projektionen die Ansichten zeigen) und ein Material mit sehr gut lesbaren
   Linien und Griffen.
3. Raum drehen: alles dreht sich, die Projektionen bleiben auf ihren Wänden, das Wesen zeigt sein Material.
4. Auf einer Achse (Seite, Front, Top) wird das Bild mit einem Morph zur flachen Ansicht.
5. Wechsel zur Viereransicht wie in Runde 1 (Falten), alles weich animiert.
6. Start: in der Seitenansicht mit dem Stift (P) den Umriss zeichnen, bestätigen, die Ansicht zieht sich zurück, die Spiegelkante
   bleibt, das Wesen bläst sich wackelnd auf wie von einem Windzug, dann Drahtmodell und Projektionen in der Ecke.
7. Elegant und ruhig: kein Glühen, kein Science-Fiction-Schein; jede Animation erklärt eine Veränderung.

## Prüfung auf Denkfehler (ehrlich)

1. **Drei Ansichten können aus einem schrägen Blick nicht deckungsgleich sein.** Seite, Front und Top sind drei verschiedene
   flache Formen in drei verschiedenen Ebenen. Von schräg oben gesehen wird jede anders verkürzt; sie können weder einander noch
   dem Umriss des Wesens gleichen. Es gibt nur zwei saubere Wege, das Bild „sie laufen ineinander und bilden das Wesen“ wahr zu
   machen:
   - **Lichtbündel:** Jede Ansicht wird entlang ihrer Achse durch den Raum verlängert. Die drei Bündel schneiden sich im Wesen;
     ihre Schnittmenge heißt in der Bildverarbeitung „visuelle Hülle“ (Laurentini 1994) und ist das Prinzip der Schattenskulpturen
     (Mitra und Pauly 2009). Aber: Die Schnittmenge ist immer etwas größer als das Wesen. Mulden und Einbuchtungen, die in keiner
     der drei Ansichten zu sehen sind, fehlen; eine Kugel wird zu einem abgerundeten Würfel. „Genau die Form“ gilt also nur
     ungefähr. Florians Satz „an der Schnittfläche entsteht das Material“ löst das elegant: Wo sich alle drei schneiden, zeigt sich
     nicht die Hülle, sondern das echte Wesen in seinem Material.
   - **Anamorphose** (die Ecken-Illusion aus Videos): Die Ansichten werden vom Auge aus auf die Wände geworfen. Aus dem aktuellen
     Blick decken sie sich immer genau mit dem Wesen, beim Drehen verziehen sie sich. Aber: Wenn das Auge die Kamera ist, decken
     sie sich immer, man sieht also nie Neues, nur das Wesen ein zweites Mal. Sichtbar wird der Effekt nur, wenn die Projektion
     dem Blick hinterherläuft.
2. **CMY übereinander wird fast schwarz.** Gedruckt ergibt Cyan + Magenta + Gelb ein trübes Schwarz (deshalb gibt es K). Wo sich
   alle drei Projektionen decken, entstünde ein dunkler Fleck, der mit Linien und Griffen konkurriert. Lösung wie oben: Dort
   erscheint das Material des Wesens.
3. **CMY braucht hellen Grund.** Druckfarben mischen sich nur auf hellem Papier (subtraktiv). Auf dunklem Grund wirken Cyan,
   Magenta und Gelb wie Leuchtfarben, also genau der Science-Fiction-Schein, den Florian nicht will.
4. **Zwei Arten zu drehen sind ein Modus.** Beide Gesten müssen sich in der Hand unterscheiden (nicht nur im Ergebnis), sonst
   verwechselt man sie. Vorschlag: Leere ziehen dreht den Raum (wie heute), mit gedrückter Leertaste oder der rechten Taste
   dreht man nur das Wesen; das Licht bleibt dabei stehen, das sieht man an der wandernden Schattierung.
5. **Drahtmodell eines Netzes ist Rauschen.** Das Netz hat Zehntausende Dreiecke. „Drahtmodell“ sollte das Kurvennetz sein
   (Kiel, Spanten, Formen) plus die Umrisslinie, nicht die Dreiecke.

## Was ich daraus machen würde (Vorschlag, offen zur Entscheidung)

- **Grund:** hell, ein warmes Weiß; die Projektionen als Druckfarben (multipliziert), mit feinem, ruhigem Rand.
- **Projektionen beim Drehen des Wesens:** offen, siehe Frage an Florian (Schatten an den Wänden, Lichtbündel, Anamorphose).
- **Material:** ruhig, matt, mit einer Schattierung von kühl nach warm wie in technischen Illustrationen (Gooch et al. 1998:
  Wenn Linien gezeichnet werden, braucht das Innere wenig Helligkeitsumfang, dann bleiben die Linien lesbar). Linien dunkel und
  klar, Griffe als weiße Scheiben mit dunklem Ring.
- **Animation:** jede Bewegung erklärt eine Veränderung (Chang und Ungar 1993: Kontinuität statt Sprung; Heer und Robertson
  2007: Übergänge helfen, Veränderungen zu verfolgen; Thomas und Calder 2001: Verformung und Nachschwingen machen direkte
  Bearbeitung verständlicher). Kurz (150 bis 450 ms), unterbrechbar, keine Schleifen ohne Anlass.
