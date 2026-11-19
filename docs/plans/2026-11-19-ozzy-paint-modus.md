# Ozzy: Paint-Modus mit Ebenen, Ebenen-Ansicht und neuem Material (Plan, 19.11.2026)

**Stand (19.11., 19:50 Uhr): Etappe 5 ist gebaut (dein Wort: „Etappe 5 starten“), dein Urteil steht aus.** Ebenen: Am rechten
Rand steht ein Stapel liegender Tropfen, je Ebene eine Linse in ihren Farben; oben liegt, was deckt. Das Plus legt eine Ebene an,
antippen wählt, wo du malst, der Punkt daneben blendet aus und ein, ziehen ordnet, auf den Mülleimer gezogen ist sie gelöscht.
Bildblatt [`2026-11-19-paint-etappe-5-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-5-bogen.jpg), Film an „strange bird“
[`2026-11-19-paint-etappe-5.mp4`](../progress/ozzy/2026-11-19-paint-etappe-5.mp4); was gebaut, gemessen und für dich entschieden
ist und was fehlt, steht in Abschnitt 16. Davor: Etappe 4, weiche Kanten (Abschnitt 14 und 15), Etappe 3 (Abschnitt 12 und 13),
Etappe 2 (Abschnitt 11), Etappe 1 (Abschnitt 9), das Material „Wachs“ (Abschnitt 2), der Schalter „Dreiecke zeigen“. Etappe 6
und 7 warten auf dein Wort. Zweig `claude/reverent-feynman-1efdd3` (baut auf dem Stand „Objekte, Spiegel und Nähte“ auf, nicht
zusammengeführt), eigenes Fenster `http://localhost:5215/ozzy.html` (Eintrag `ozzy-paint`). Übergabe des Strangs:
[`docs/look/ozzy/paint/UEBERGABE.md`](../look/ozzy/paint/UEBERGABE.md).

## Dein Auftrag (19.11.2026, wörtlich)

> Statt des maules würde ich jetzt gerne erstmal einen paint mode einbauen.
>
> Ich bin überzeugt, das maul bekommen wir gut hin.
> Im paint mode will ich mit gewohnten tools linien auf die haut einzeichnen. Unabhängig von den linen des liniennetzes.
> So erstelle ich verschiedene bereiche für bauch oder schnauze, augenränder und und und. Die flächen zwischen den linien kann ich dann exkat wie bei procreate mit einer coolenn liquid drop fill animation einfärben und sie haben dann eine harte kante an den zwischen den bereichen. Ich kann dann einstellen, dass kanten verschwimmen und so übergänge von einer in die andere farbe zu verläufen werden. Die verlaufsstärke stelle ich direkt an linien und punkten ein, so dass eine linie mit verschiedener weichheit übergehen kann oder der verlauf fließend zur kante wird. Dafür brauche ich eine optimale visuelle bedienung. Die sich perfekt in das liquid drop konzept einfügt. Es soll sehr intuitiv und elegant funktionieren. ich möchte auch verschiedene Ebenen anlegen, um z.B Muster übergeordnet über verläufe zeichnen zu können.
>
> Wenn ich mehrere ebenen habe möchte ich diese  auffächern können. dazu brauche ich eine neue ansicht oder noch besser etwas vorhandenes benutzen bzw weiterentwickeln. In der layeransicht sollen alle layer als 3d model nebeneinander oder schräg versetzt in der gleichen ansicht nebeneinander sein und man dreht sie mit der maus simultan. Das modell fährt dann auseinander zu mehreren modellen mit je einem layer der haut. Das alles mit einer tollen passenden animation. Man kann dann die einzelnen layer bearbeiten.
>
> Im Paint mode kannst du dich von procreate und illustrator inspirieren lassen.
>
> Als Basismaterial für den paint mode kannst du erstmal das helle solid benutzen und außerdem häte ich gerne noch ein weiteres material. Das Basismaterial, so wie es Z-Brush benutz, aber mehr in magenta statt rot. Recherchiere genau wie das material bei z-Brush gemacht ist.

Dein Bild dazu: [`docs/look/ozzy/paint/2026-11-19-zbrush-matcap-red-wax.png`](../look/ozzy/paint/2026-11-19-zbrush-matcap-red-wax.png).

## Deine Antworten (19.11.2026, 10:10 Uhr, wörtlich)

> 1. Ja, pinsel machn wir vllt später
> 2. -40 sieht gut aus. Bei z-Brush sieht man ja die kleinen vierecke auf der haut und unsere ist ganz glatt. Liegt das an der dichte bei uns oder ist das weichgezeichnet. Ich hätte gerne einen schalter der die dreiecke so zeichnet wie z-brush die vierecke.
>
> Du kannst dann mit Etappe 1 starten.

Daraus: Im Paint-Modus gelten deine Werkzeuge aus Ozzy, ein Pinsel vielleicht später. Der Farbton −40 des Wachses gilt. Der
Schalter ist gebaut (Menü „Dreiecke zeigen“; Antwort auf deine Frage in der Recherche, Abschnitt 8). Dein zweites Bild:
[`2026-11-19-zbrush-red-wax-vierecke.webp`](../look/ozzy/paint/2026-11-19-zbrush-red-wax-vierecke.webp).

## 1. Kurz: was ich vorschlage

- **Zwei Arten von Linien, zwei Wörter.** Die „Linien“ bleiben die Wahrheit der Form. Was du im Paint-Modus zeichnest, heißt
  **Farblinie**: Sie liegt auf der Haut, formt sie aber nie. Die Fläche zwischen Farblinien ist eine **Farbfläche**.
- **Dieselben Werkzeuge, anderer Modus.** Im Paint-Modus zeichnen P, Freihand und die Formen Farblinien statt Linien; A greift ihre
  Punkte und Richtungen, wie du es kennst. Ein neues Werkzeug kommt dazu: der **Farbtropfen** zum Füllen.
- **Die Kante zwischen zwei Farben verhält sich wie die Naht zwischen zwei Objekten:** K schaltet hart und weich, `[` und `]`
  stellen die Breite. Dazu ein Tropfen direkt an der Farblinie, den du von ihr wegziehst: je weiter, desto breiter der Verlauf an
  diesem Punkt. Zwischen den Punkten fließt die Breite, bis hinunter zur harten Kante.
- **Farbe ist Vektor, kein Bild.** Gespeichert werden Farblinien, Füllungen und Weichheit, keine Bildpunkte. Darum bleibt eine
  Kante bei jedem Zoom scharf, und die Bemalung geht mit, wenn du die Form änderst.
- **Ebenen** liegen übereinander wie in Procreate (Muster über Verläufen). Die **Ebenen-Ansicht** ist keine neue Ansicht: Der Raum
  selbst fächert auf, eine Kopie der Form je Ebene, alle drehen zusammen (Abschnitt 5.5).
- **Reihenfolge:** zuerst der Beweis an einer Form (eine Farblinie, eine Füllung, harte Kante, bleibt beim Umformen auf der Haut).
  Erst wenn der hält, kommen Werkzeuge, Füllen, Weichheit, Ebenen, Ebenen-Ansicht, mehrere Objekte.

## 2. Schon gebaut: das Material „Wachs“

Recherche mit Quellen: [`docs/research/2026-11-19-zbrush-grundmaterial.md`](../research/2026-11-19-zbrush-grundmaterial.md).

- ZBrushs Grundmaterial („MatCap Red Wax“) rechnet kein Licht. Es ist das Bild einer Kugel; die Farbe eines Punkts wird daraus
  nachgeschlagen, je nachdem, wohin seine Fläche vom Betrachter aus zeigt. Ozzy macht es genauso.
- Das Kugelbild ist an deinem Bild ausgemessen. Im Rot der Vorlage liegt Ozzys Kugel im Mittel 1,5 von 255 Stufen neben ZBrush.
- In Ozzy: Menü oder Taste M, „Wachs“. Grundwert Magenta (Farbton −40 gegen ZBrushs Rot); den Farbton stellst du im Feinregler
  unter „Material Wachs“.
- Bild: [`2026-11-19-wachs-vergleich.png`](../progress/ozzy/2026-11-19-wachs-vergleich.png) (ZBrush neben Ozzy, sechs Farbtöne),
  an deiner Form [`2026-11-19-wachs-strange-bird.png`](../progress/ozzy/2026-11-19-wachs-strange-bird.png).
- **Dein Urteil (19.11.):** „-40 sieht gut aus.“ Dazu dein Wunsch nach den sichtbaren Dreiecken: gebaut als Schalter „Dreiecke
  zeigen“ im Menü (bei Solid, Zebra, Wachs: das Netz der Rechnung, jedes Dreieck in einer Farbe). Bild:
  [`2026-11-19-dreiecke-zeigen.png`](../progress/ozzy/2026-11-19-dreiecke-zeigen.png).

## 3. Etappen

Jede Etappe endet mit einem Bild oder Film und der Frage nach deinem Urteil. Sichern, Laden und ⌘Z gehen in jeder Etappe mit. Jede
Geste wird von Anfang an auch für iPad und Stift gebaut (dort gibt es kein ⌥).

| Etappe | Was du siehst und anfasst | Probe und Kriterium |
| --- | --- | --- |
| **0** Material „Wachs“ | das neue Material | gebaut; Vergleichsbild liegt vor |
| **1** Der Beweis: eine Farblinie, eine Füllung | Paint-Modus einschalten; mit P eine geschlossene Farblinie auf die Form zeichnen; ein Klick füllt sie; zurück zur Form, umformen: Die Bemalung geht mit | **gebaut (19.11.)**; Kriterien in 3.1, Messwerte in Abschnitt 9; dein Wort: „Etappe 2 starten“ |
| **2** Farblinien bedienen wie Linien | A, P, Freihand, Formen, Lasso, Löschen an Farblinien; offene Farblinien, Kreuzungen, Anschluss an die Mitte | **gebaut (19.11.)**; Schritte in Abschnitt 10, Messwerte und Lücken in Abschnitt 11; Film an „strange bird“; dein Wort: „Etappe 3 starten“ |
| **3** Füllen mit dem Farbtropfen | Farbe wählen, in eine Farbfläche tippen: Die Farbe läuft als Tropfen über die Haut bis an die Farblinien | **gebaut (19.11.):** das Einlaufen (dein Wort: „Tinte“; Abschnitt 12), dann Farben als Tropfen unter der Leiste, Farbtropfen F, Pipette I (Abschnitt 13); Bildblatt und Film an „strange bird“; dein Wort danach: „Etappe 4 starten“ |
| **4** Weichheit an Linien und Punkten | K hart oder weich, Tropfen an der Farblinie für die Breite, `[` `]` | **gebaut (19.11.):** das Bild der Bedienung (Abschnitt 14), dein Wort „Fassung 1“, dann der Bau (Abschnitt 15: der Tropfen am Faden, K, `[` `]`); alle sieben Kriterien halten; Bildblatt und Film an „strange bird“; dein Wort danach: „Etappe 5 starten“ |
| **5** Ebenen | Ebene anlegen, ordnen, aus- und einblenden; Muster über Verläufen | **gebaut (19.11.):** der Stapel am rechten Rand (Abschnitt 16); alle zehn Kriterien halten; Bildblatt und Film an „strange bird“ (ein Verlauf auf Ebene 1, Punkte auf Ebene 2); dein Urteil steht aus |
| **6** Ebenen-Ansicht | die Form fächert auf, je Ebene eine Kopie; drehen, eine Kopie wählen und dort malen | zuerst ein Film (nebeneinander und schräg versetzt zur Wahl), dann gebaut |
| **7** Mehrere Objekte, Spiegel, Verbund | jedes Objekt mit eigener Bemalung; Spiegel aus; Verschmelzen und Abziehen zeigen die Farben | Bild an zwei bemalten Objekten im Verbund |

### 3.1 Etappe 1: der Beweis

Das ist der größte Brocken und das größte Risiko. Darum zuerst, an einer Form allein, mit einer Ebene und nur harter Kante.

**Was gebaut wird:** der Schalter für den Paint-Modus; P zeichnet eine geschlossene Farblinie auf die Haut (im Raum und
eingerastet); ein Klick füllt ihr Inneres (noch ohne Animation); die Farbe ist auf beiden Gründen zu sehen (helles Solid und
Wachs); gespiegelt wie die Form; Sichern, Laden, ⌘Z.

**Kriterien** (gemessen von einer Probe im Fenster, dazu ein Film für dein Auge):

1. **Scharf bei jedem Zoom.** Die Kante der Farbfläche ist bei 1-, 4- und 16-facher Vergrößerung höchstens 1,5 Gerätepunkte breit
   und liegt höchstens einen halben Gerätepunkt neben der gezeichneten Kurve, auf der groben Anzeige (im Zug) wie auf der feinen.
2. **Bleibt auf der Haut.** Einen Punkt der Form weit ziehen und wieder zurück: Die Farblinie liegt danach höchstens 0,5 Einheiten
   neben ihrer Lage davor (bei einer Form von rund 300 Einheiten). Während des Zugs liegt sie in jedem Bild auf der Haut. Fern vom
   Zug bewegt sie sich nicht. Auch über Netzwechsel und das Aufräumen im Hintergrund springt sie in keinem Bild weiter, als die
   Haut sich dort bewegt.
3. **Formt nicht.** Dieselben Züge mit und ohne Farblinien geben dieselbe Form, Zahl für Zahl.
4. **Tempo.** Beim Ziehen an der Form kostet die Bemalung im Median höchstens 1 ms je Bild; beim Drehen kein Bild über 16,7 ms.
5. **Sichern, Laden, ⌘Z.** Nach Sichern und Laden liegt die Farblinie an derselben Stelle; ⌘Z nimmt Füllung und Farblinie in der
   Reihenfolge zurück, in der sie entstanden, auch gemischt mit Schritten an der Form.

Hält ein Kriterium nach einem ehrlichen Versuch nicht, halte ich an und sage es dir, mit Zahlen und dem Ausweg.

### 3.2 Etappe 2 bis 7 in je drei Zeilen

- **2 Bedienen.** Farblinien bekommen dieselbe Bedienung wie Linien: Schwellen unter dem Zeiger, Tropfen an Punkten, Nadel für
  die Richtung, P mit Faden, Lasso. Anders als Linien dürfen Farblinien offen enden. Kreuzen sich zwei, teilen sie einen Punkt.
- **3 Füllen.** Farben als kleine Tropfen in der Leiste; die gewählte Farbe hängt als Tropfen am Zeiger. Tippen in eine Farbfläche:
  Der Tropfen fällt, die Farbe läuft über die Haut und staut sich an den Farblinien. Ist eine Fläche nicht geschlossen, läuft sie
  aus; das sieht man in der Animation. Farbe von der Form aufnehmen (Pipette). Ändert sich eine Farblinie, folgt die Füllung.
- **4 Weichheit.** Jeder Punkt einer Farblinie trägt eine Breite (0 = hart). An einem gewählten Punkt erscheint quer zur Farblinie
  ein Tropfen; ihn wegziehen macht den Verlauf dort breiter, ihn in die Linie zurückschieben macht sie hart. Der Verlauf selbst ist
  die Vorschau. K schaltet eine ganze Farblinie oder die gewählten Punkte hart und weich, `[` und `]` ändern die Breite.
- **5 Ebenen.** Eine Ebene hat ihre eigenen Farblinien und Füllungen. Was oben liegt, deckt, was darunter liegt. Die Ebenen stehen
  als Stapel kleiner Tropfen am Rand; Plus legt eine an, ziehen ordnet, tippen blendet aus und ein.
- **6 Ebenen-Ansicht.** Abschnitt 5.5.
- **7 Objekte.** Abschnitt 5.3.

## 4. Was ich für dich entschieden habe (sag, wenn du es anders willst)

- **Das Wort „Farblinie“** (und „Farbfläche“). Andere Wörter, die gingen: „Grenze“, „Mallinie“.
- **„Gewohnte Tools“ lese ich als deine Werkzeuge in Ozzy:** A, P, Freihand (N), Ellipse und Würfel (e, E), Lasso (Q), K, ⌫, ⌘Z.
  Kein freier Pinsel wie in Procreate. (Frage 2 unten.)
- **Gemalt wird, wo du die Haut siehst:** im Raum direkt auf der Form und in den eingerasteten Ansichten. Eingerastet zeige ich
  die Farben flach, wie eine Illustration; im Raum mit dem Material. Das zeige ich dir in Etappe 1 als Bild.
- **Bemalung ist gespiegelt, solange das Objekt gespiegelt ist.** Eine Farblinie über die Mitte beginnt und endet auf der Mitte,
  wie ein Ring der Form.
- **Nur Farblinien begrenzen Farbflächen.** Die Linien der Form tun es nicht (du wolltest sie unabhängig). Eine Linie der Form als
  Farblinie zu übernehmen, wäre später ein kleiner Handgriff.
- **Tasten (Vorschlag, deine Belegung kommt später):** B schaltet den Paint-Modus, F ist der Farbtropfen, I die Pipette.
- **Am Zeiger hängt im Paint-Modus ein Tropfen in der gewählten Farbe.** So ist immer klar, in welchem Modus du bist (wie der
  dunkle und der weiße Zeiger bei V und A).
- **Auf Wachs färbt das Material die Farbe nicht ein.** In ZBrush sähe gemaltes Weiß auf Red Wax rot aus. In Ozzy gilt die Farbe
  des Wachses nur, wo nichts gemalt ist; Gemaltes bekommt vom Wachs Hell, Dunkel und Glanz. Bild dazu in Etappe 1.

## 5. Antworten auf die Grundfragen

### 5.1 Woran hängen Farblinien und Farben, wenn sich die Form ändert?

**An der Haut selbst.** Jeder Punkt einer Farblinie merkt sich sein Dreieck im dichten Netz und seine Lage darin. Seine Richtungen
(Griffe) stehen im Maß dieses Dreiecks. Bewegt sich die Haut, bewegt sich der Punkt mit, ohne Rechnung.

Was das dichte Netz dafür hergibt (nachgelesen im Kern und im Werk):

- **Solange du ziehst, ist es dasselbe Netz.** Dieselben Punkte, dieselben Dreiecke; nur ihre Lagen ändern sich. Auch V
  (verschieben, drehen, skalieren) bildet nur die Lagen ab. Hier ist das Mitgehen genau und kostet nichts.
- **Neu vernetzt wird:** nach einem Zug und manchmal mitten im Zug (lange Kanten werden geteilt, kurze zusammengelegt, Kanten
  gedreht); beim Aufräumen im Hintergrund; wenn eine Linie der Form eingesetzt wird; bei Naht und Clipping an der Spiegelebene;
  bei „Spiegel aus“; beim Anwenden von Verschmelzen und Abziehen; beim Laden; bei ⌘Z.
- **Was beim Neuvernetzen bleibt:** Die meisten Punkte des Netzes bleiben, wo sie sind; der Kern weiß, welcher neue Punkt welcher
  alte war, neue kommen dahinter. Ein Punkt einer Farblinie, dessen Dreieck bleibt, ändert sich gar nicht. Ist sein Dreieck
  geteilt oder gedreht worden, wird er an die neue Haut übergeben: an die Stelle, die ihm am nächsten liegt. Beim Verdichten sind
  alte und neue Haut dieselbe Fläche, nur anders unterteilt. So wandert heute schon das Muster der Seifenhaut über jeden
  Netzwechsel.
- **⌘Z** stellt einen alten Stand der Haut wieder her; die Bemalung von damals kommt mit ihm zurück (sie wird je Schritt gemerkt).
- **Luft ablassen und wieder aufblasen:** Die Form bleibt dabei dieselbe, also bleibt auch ihre Bemalung (zu sehen ist sie wieder,
  sobald die Form steht). Erst wenn du die Zeichnung auf dem Blatt änderst, entsteht eine neue Form; ihre Bemalung beginnt leer,
  wie ihre Linien.

**Gemessen in Etappe 1 (Abschnitt 9):** Der Netzwechsel selbst und das Aufräumen verschieben die Bemalung nicht merklich (0,05 bis
0,12 Einheiten). Die Zuordnung „alter Punkt → neuer Punkt“ braucht dafür keinen Zusatz im Werk: Es lässt die gebliebenen Punkte
vorn und in ihrer Reihenfolge stehen, daran erkennt die Bemalung sie wieder. Was bleibt, ist ein langsames Kriechen bei großen
Zügen (Abschnitt 9.3): Das Werk rechnet die Haut nach jedem Zug neu aus den Linien, und ihre Punkte liegen danach leicht anders
auf derselben Fläche.

### 5.2 Scharfe Kanten, bei jedem Zoom, unabhängig vom Netz

**Nachtrag (19.11., gebaut): Geschnitten wird nicht.** Einfacher und genauso scharf: Die Grafikkarte rechnet je Bildpunkt, wie
weit er von der Farblinie liegt und auf welcher Seite, und färbt ihn danach. Die Kante ist damit bei jedem Zoom und auf jeder
Stufe der Anzeige einen Bildpunkt breit; an der Anzeige selbst ändert sich nichts. Die ersten drei Punkte unten beschreiben den
Weg, den ich nicht gegangen bin; der Rest gilt.

- **Die Farblinie wird in die Anzeige geschnitten, nicht ins Rechennetz.** Die glatte Anzeige der Haut besteht aus feinen
  Dreiecken. Wo eine Farblinie darüberläuft, werden diese Dreiecke längs der Farblinie geteilt. Die Kante zwischen zwei Farben ist
  damit eine echte Kante im Bild: so scharf wie der Umriss der Form, bei jedem Zoom, ohne Bildpunkte, die sichtbar werden könnten.
- **Rund bleibt sie durch ihre eigene Abtastung.** Die Kurve wird so fein unterteilt, wie der Zoom es verlangt, unabhängig davon,
  wie dicht das Netz dort ist. Ecken der Farblinie sind genaue Ecken.
- **Das Rechennetz erfährt davon nichts.** Geschnitten wird nur, was gezeigt wird. Darum formt eine Farblinie nie (Kriterium 3).
- **Weichheit:** Jeder Punkt trägt eine Breite; längs der Farblinie fließt sie von Punkt zu Punkt. Der Verlauf wird je Bildpunkt
  aus dem Abstand zur Farblinie gerechnet, nicht aus Bildpunkten einer Textur. Bei Breite 0 bleibt genau die Kante. Dazwischen
  wird der Verlauf schmaler und schmaler, bis er zur Kante wird. Gemessen wird der Abstand längs der Haut, damit ein Verlauf nicht
  durch ein dünnes Teil auf die Rückseite schlägt.
- **Unbewiesen:** das Tempo des Schneidens, wenn mitten im Zug neu vernetzt wird (heute kostet so ein Bild schon 25 bis 55 ms). Ich
  messe es in Etappe 1 (Kriterium 4).

### 5.3 Mehrere Objekte, Spiegel, Verbund

- **Die Bemalung gehört zum Objekt.** Jedes Objekt hat seine Haut und darauf seine Ebenen. Gemalt wird am aktiven Objekt.
- **Spiegel:** Bei einem gespiegelten Objekt malst du eine Hälfte, die andere zeigt dasselbe. „Spiegel aus“ macht aus der Bemalung
  zwei unabhängige Hälften, wie aus der Form.
- **Verbund (Verschmelzen, Abziehen):** Der Verbund wird aus den gezeigten Häuten abgeleitet. Mein Weg: Er wird aus den gezeigten
  *bemalten* Häuten abgeleitet, dann trägt er die Farben von selbst, auch im gerundeten Streifen an der Naht. An der Naht treffen
  zwei Bemalungen aufeinander, wie heute zwei Muster. Das braucht einen Zusatz am Verbund; **ich frage dich vor Etappe 7**, der
  Verbund bleibt bis dahin, wie er ist.
- **Über die Naht hinweg malen** (eine Farbfläche über zwei Objekte) geht erst, wenn du anwendest (⌥ + Klick: eine Form). Die
  Bemalung beider Objekte geht dabei auf die neue Form über.
- **Etappe 1 bis 6 arbeiten an einer Form allein.** Bis Etappe 7 zeigt ein Objekt im Verbund seine Farbe nicht.

### 5.4 Sichern, Laden, Zurück, Backen

- **Datei:** Die Bemalung steht als zusätzlicher Teil im Stand der Form (`ablage.ts`), je Objekt: Ebenen, darin Farblinien (Punkte
  mit Ort auf der Haut, Richtungen, Knick, Breite) und Füllungen (ein Ort in der Fläche und die Farbe). Alte Dateien bleiben
  lesbar, das Prüffenster überliest den Teil. An vorhandenen Feldern ändert sich nichts.
- **⌘Z:** Schritte am Bemalen stehen im gemeinsamen Rückweg neben den Schritten an der Form, in der Reihenfolge, in der sie
  geschahen.
- **Backen fürs Spiel** (höchstens 8 000 Dreiecke je Form) ist nicht Teil dieses Strangs. Weil die Bemalung Vektor ist, bleiben
  beide Wege offen: ein Bild fester Größe je Form, oder Farben an den Punkten mit geschnittenen Kanten. Das entscheidet sich mit
  der Bauweise der Formen im Spiel.

### 5.5 Die Ebenen-Ansicht aus Vorhandenem

Ich habe mir die drei Kandidaten angesehen:

| Kandidat | Was es ist | Taugt für die Ebenen? |
| --- | --- | --- |
| Die „Reihe“ | bläst mehrere Objekte nacheinander auf | nein: ein Ablauf, keine Anordnung |
| Vier Ansichten, Kistennetz | vier Felder mit je eigener Sicht, die Ecke klappt auf | zum Teil: Die Felder können, was eine Kopie braucht (zeichnen, greifen, malen an versetzter Stelle). Aber sie zeigen vier verschiedene Blicke in Rahmen; du willst denselben Blick mehrfach, frei im Bild. |
| Der Raum mit mehreren Objekten | mehrere Formen stehen im selben Raum | ja: als Bühne |

**Vorschlag: Der Raum selbst fächert auf.** Keine neue Ansicht. Auf einen Griff teilt sich die Form in eine Kopie je Ebene; die
Kopien gleiten auseinander, schräg versetzt oder nebeneinander, in einer gleichmäßigen Bewegung. Jede Kopie zeigt ihre Ebene auf
dem Grund. Ziehen ins Leere dreht alle zugleich: Jede Kopie dreht um ihre eigene Mitte und bleibt an ihrem Platz im Bild. Ein Klick
auf eine Kopie macht ihre Ebene zur aktiven; dort malst du. Derselbe Griff schiebt sie wieder zu einer Form zusammen.

Weiterverwendet wird: die Kamera und das Drehen des Raums; aus den Vier Ansichten die Technik, an versetzter Stelle zu zeichnen
und zu greifen; aus dem Kistennetz die Regel „eine Zahl für alles, eine Bewegung“. Die Form wird nicht kopiert: dieselbe Haut,
mehrfach gezeichnet.

Skizze der zwei Anordnungen (zusammengesetzt aus einem Bild deiner Form, nicht gebaut):
[`2026-11-19-ebenen-ansicht-skizze.png`](../progress/ozzy/2026-11-19-ebenen-ansicht-skizze.png). Die Animation und die Anordnung
zeige ich dir als Film, bevor ich baue.

### 5.6 Der Grund: helles Solid und Wachs

- Du hast zwei Gründe genannt. Im Paint-Modus wählst du zwischen ihnen (M).
- **Helles Solid** bleibt, wie du es erarbeitet hast (der Blaupause-Renderer als Gast, unverändert). Die Farbe wird darübergelegt
  und mit seinem Hell und Dunkel verrechnet; Verlauf, Lavendel und Kante bleiben. Wie das aussieht, zeigt Etappe 1 als Bild.
- **Wachs:** siehe Abschnitt 4, letzter Punkt.
- Die Seifenhaut und die anderen Materialien zeigen die Bemalung zunächst nicht.

## 6. Fragen, die den nächsten Schritt aufhalten

Beide beantwortet am 19.11. (oben, „Deine Antworten“): Der Plan ist für Etappe 1 frei; „gewohnte Tools“ sind deine Werkzeuge aus
Ozzy, ein Pinsel vielleicht später. Offen ist nichts, was Etappe 1 aufhält.

## 7. Bauweise (für die Sitzung, die baut)

**Grundsätze:** eigener Code unter `apps/editor/src/ozzy/farbe/`, in `main.ts` nur schmale Nahtstellen (der Zweig wird erst am
Schluss zusammengeführt, `main.ts` ändern alle). Am Rechenkern (`packages/shape`), am Verbund, am Sitz der Loops und am Aufblasen
nichts ohne Florians Wort. Keine Messreihen im Hintergrund; je Etappe eine Probe `scripts/pruefen/ozzy-farbe-*-fenster.mjs`.

**Modell** (je Objekt, je Ebene):

- *Ort auf der Haut* (gebaut, `ort.ts`): ein Dreieck des Rechennetzes, seine drei Punktnummern und drei Gewichte. (Die Nummer des
  Dreiecks überlebt keinen Netzwechsel, die Punkte schon: an ihnen wird das Dreieck wiedergefunden.)
- *Farblinie:* in Etappe 1 eine dichte Folge von Orten (höchstens 1,5 Einheiten auseinander, höchstens 0,02 neben der
  gezeichneten Kurve), geschlossen. Ab Etappe 2 dazu ihre Punkte zum Anfassen: Ort, zwei Richtungen im Maß ihres Dreiecks
  (Anteile zweier Kanten: so gehen sie mit, wenn sich das Dreieck dehnt oder dreht), Knick, Breite; offen oder geschlossen; an
  Kreuzungen geteilte Punkte; Enden auf der Mitte.
- *Füllung:* eine Saat (Ort tief in der Fläche) und eine Farbe. Die Farbfläche wird von der Saat aus bis an die Farblinien
  gefüllt und nach jeder Änderung neu (das Muster von `werkFelder.ts`: Feld = Saat, nach jedem Netzwechsel neu gefüllt).

**Mitgehen** (gebaut, `ort.ts`, `farbwerk.ts`): Zwischen Netzwechseln ist die Lage eines Orts die gewichtete Lage seiner drei
Punkte, auf der glatten Anzeige die entsprechende Stelle im unterteilten Dreieck (`fein.ts`; `GlattPlan` teilt je Stufe in vier
Kinder in fester Reihenfolge). Ein Netzwechsel wird daran erkannt, dass `werk.haut` oder seine Dreiecke ein anderes Objekt sind;
die alte Haut hält ihre letzten Lagen. Übergabe in zwei Teilen: (1) `punkteZuordnen`: Das Werk lässt die gebliebenen Punkte vorn
und in ihrer Reihenfolge stehen (`netzGewachsen`); die zwei Reihen werden nebeneinander abgeschritten, und ein Paar gilt nur, wenn
der neue Punkt am Ort des alten liegt (näher als ein Viertel seiner kürzesten Kante). (2) `orteUebergeben`: Bilden die drei Punkte
eines Orts im neuen Netz wieder ein Dreieck, bleibt er mit denselben Gewichten darin; sonst geht er an die nächste Stelle der
neuen Haut (`naechster.ts`). Haben zwei Netze nichts miteinander zu tun (unter einem Fünftel zugeordnet), wird jeder Ort gesucht.
Ohne Eingriff ins Werk. ⌘Z: Jeder Handgriff am Bemalen ist ein Eintrag im gemeinsamen Rückweg von Ozzy (`{ art: 'farbe' }`); stellt
das Werk ein älteres Netz wieder her, kommt die Bemalung zurück, wie sie auf diesem Netz war (`jeNetz`). „Luft ablassen“ behält die
Form des Werks (`werkFormAnlegen` legt nur neu an, wenn sich das Blatt geändert hat).

**Flächen** (gebaut, `ketten.ts`, `flaechen.ts`): Zwischen zwei Orten läuft die Farblinie gerade über die Haut (`spur`: der
Schnitt mit der Ebene durch beide Orte und ihre mittlere Normale). Daraus je Dreieck des Rechennetzes eine Kette (ein Linienzug in
seinen Gewichten, von Kante zu Kante). Gefüllt wird im Groben: Dreiecke ohne Kette gehören ganz zu einer Fläche, Dreiecke mit
Ketten zerfallen in Zellen; verbunden wird über die Kanten. Bei gespiegelten Formen wird auf der Hälfte z ≥ 0 gemalt, Ketten und
Saaten bekommen ihr Spiegelbild. Neu gerechnet wird nach jedem Netzwechsel und jeder Änderung der Bemalung, nicht je Bild.

**Zeichnen** (gebaut, `anzeige.ts`): **nichts wird geschnitten.** Ein eigener Durchgang mit der Kamera des Raums. Das Innere
einer Farbfläche ist eine Dreiecksliste auf den Punkten der Anzeige (wie `Koerper.toenung`). Die feinen Dreiecke der groben
Dreiecke, durch die eine Farblinie läuft, liegen in einem eigenen Puffer; für sie rechnet der Fragment-Shader je Bildpunkt den
Abstand zur nächsten Kette (in Bildpunkten, über die Ableitungen der Gewichte) und die Seite, und mischt über einen Bildpunkt von
der einen Füllung in die andere. Die Ketten stehen in einer Datentextur. Verdecktes über die Tiefe der Haut. Auf Wachs im Ziel
der festen Materialien (`FesteWerte.danach`; Farbe mal Helligkeit des Wachses plus Glanz, `wachsLicht`), auf hellem Solid über dem
Bild des Gasts (`GastWerte.ueberzug`, multipliziert). Das Ziel der festen Materialien hält seit dem 19.11. 16 Bit je Kanal
(wichtig für Verläufe). Eingerastet, an den Wänden und in den Feldern stehen bisher nur die Farblinien als feine Striche
(`ruheLinien`); die Farbe selbst dort kommt später (über `feldAbbildung`). Für die Weichheit (Etappe 4) ist der Abstand je
Bildpunkt schon da; er muss dann längs der Haut über Dreiecke hinweg reichen.

**Bedienung** (Etappe 1: P, Freihand und Formen geben ihre fertige Zeichnung über `werkBlatt.stiftZiel` an das Farbwerk; das
Folgende ist der Plan für Etappe 2): Die Linien-Studie hängt ihre Bedienung über die Schnittstelle `Raum` an ein Modell (`src/linien/verhalten.ts`);
für die Linien der Form ist das `werkBlatt.ts`. Für Farblinien kommt ein zweites Modell derselben Schnittstelle dazu
(`farbBlatt.ts`): Farblinien als Netz in Bildschirmpunkten mit Tiefe, Ziehen als „Strahl auf die Haut“. Im Paint-Modus bekommt das
Verhalten dieses Netz; die Linien der Form stehen dann als feine Striche ohne Punkte (wie im Objekt-Modus).

**Füllen als Tropfen:** Das Füllen läuft ohnehin von der Saat über die Haut; der Abstand von der Saat je Punkt ist die Uhr der
Animation (die Farbe ist dort zu sehen, wo die Front schon war).

**Datei:** `WesenStand.farbe` (fehlt in alten Dateien), gepackt wie alles andere; `pruefen` weist nur Orte ab, die auf Punkte
zeigen, die es nicht gibt.

## 8. Nicht in diesem Strang

- Das Maul (eigene Sitzung, nach deinem Wort).
- Backen fürs Spiel.
- Freies Malen mit dem Pinsel, Bilder als Textur, Farblinien als sichtbarer Strich (Ornament), Muster von selbst wiederholen.
- Die Vertiefungen des ZBrush-Materials (Recherche, Abschnitt 6).
- Zusammenführen mit `claude/ozzy` und dem Zweig der Objekte: erst auf dein Wort, am Schluss.

## 9. Etappe 1: was gebaut ist, was gemessen ist, was fehlt (19.11.2026)

### 9.1 Was du anfassen kannst

- **B** schaltet den Paint-Modus (auch der Knopf „Farbe“ am iPad). Ist weder helles Solid noch Wachs gewählt, wechselt Ozzy auf
  das helle Solid. Oben erscheint die Farbe; M wechselt den Grund.
- **P, Ellipse (E) und Freihand (N)** zeichnen an einer Wand oder eingerastet eine Farblinie statt einer Linie der Form. Die
  Zeichnung wird längs der Blickachse auf die Haut gelegt, von der Seite, von der du schaust. Sie ist immer geschlossen (P: auf
  dem ersten Punkt klicken oder ↩). Was über die Mitte hinausragt, endet an der Mitte.
- **Ein Klick auf die Form im Raum füllt** die Fläche dort mit der gewählten Farbe, bis an die Farblinien (auch außerhalb einer
  Farblinie: dann den Rest der Form). Mit Weg wird stattdessen gedreht.
- **Gespiegelt** wie die Form. **⌘Z** nimmt Farblinie und Füllung zurück, in der Reihenfolge mit den Schritten an der Form.
  **Sichern und Laden** tragen die Bemalung. Mit mehreren Objekten hat jedes seine eigene (gebaut, im Fenster noch nicht geprüft).
- **B zurück:** Die Farbe bleibt auf der Form stehen, die dunkle Farblinie nicht. Umformen nimmt die Bemalung mit.

### 9.2 Die fünf Kriterien (Probe `scripts/pruefen/ozzy-farbe-fenster.mjs`, an einer Kugel mit vier Linien)

| Kriterium | gemessen | hält? |
| --- | --- | --- |
| 1 scharf bei jedem Zoom | Kante 0,83 Gerätepunkte breit (10 % bis 90 %), breitestes Stück 0,90; höchstens 0,06 neben der Farblinie; die Farblinie 0,00 neben den Klicks. Bei 1-, 2- und 4-fach und im Zug gleich. | ja. Ozzy zoomt nur bis 4-fach: 16-fach ließ sich nicht messen. |
| 2 bleibt auf der Haut | Netzwechsel: 99 % der Orte bleiben in ihrem Dreieck, der Rest liegt höchstens 0,11 Einheiten neben der neuen Haut. Fern vom Zug bewegt sich die Bemalung wie die Haut dort (3,1 zu 2,9 Einheiten). Hin und zurück: bei 15 Einheiten Zug 0,3 daneben, bei 55 Einheiten 0,6 bis 0,7 (verlangt: 0,5). | **bei weiten Zügen nicht** (9.3) |
| 3 formt nicht | Prüfsumme der Form (Lagen, Dreiecke, Linien) nach jedem Handgriff am Bemalen Zahl für Zahl gleich. | ja |
| 4 Tempo | Beim Ziehen kostet die Bemalung 0,2 bis 0,5 ms je Bild (Median), ein Bild mit Netzwechsel 6 bis 10 ms. Beim Drehen kostet ein Bild 1,8 ms, das teuerste 4,8 ms. | ja |
| 5 Sichern, Laden, ⌘Z | sechs Schritte der Reihe nach zurück (Füllung, Zug, Zug, Farblinie, Füllung, Farblinie); danach und nach dem Laden 0,00 Einheiten neben der Lage davor. | ja |

**An deiner Form „strange bird“** (`ozzy-farbe-form.mjs`; 7 437 Punkte im Rechennetz): drei Farblinien, drei Füllungen, keine
verliert ihren Weg. Beim Drehen kostet ein Bild 1,7 bis 2,0 ms (das teuerste 4,9 bis 9,5), beim Ziehen die Bemalung 0,1 ms, ein
Netzwechsel 6 bis 8 ms. Hin und zurück ließ sich dort nicht gegen 0,5 prüfen: An dieser Form kommt die Haut selbst nach einem Zug
von 20 Einheiten nicht an ihren Platz zurück (bis 4,5 Einheiten daneben, auch nach einem ersten Zug zum Setzen); die Bemalung
liegt mit ihr dort (4,9).

### 9.3 Was nicht hält: Die Bemalung kriecht bei weiten Zügen

Ein Punkt der Kugel 55 Einheiten hinaus und zurück (ein Fünftel der Form): Die Haut liegt wieder, wo sie war (0,03 bis 0,14), die
Farblinie an der gezogenen Stelle 0,6 bis 0,7 Einheiten daneben, fern davon 0,35. Dreimal hintereinander: 1,7 Einheiten an der
gezogenen Stelle, fern 0,3. Bei 15 Einheiten: 0,3, und drei Runden ändern daran fast nichts (0,34). Bei normaler Ansicht ist eine
Einheit knapp zwei Gerätepunkte.

**Woher es kommt:** nicht vom Netzwechsel (Ruck dort 0,05 bis 0,12) und nicht vom Aufräumen (0,05). Das Werk rechnet die Haut bei
jedem Zug neu aus den Linien; es hat kein Gedächtnis dafür, welche Stelle der Haut welche war. Seine Punkte liegen nach einem Zug
hin und zurück leicht anders auf derselben Fläche, und die Bemalung sitzt an den Punkten. ⌘Z ist davon nicht betroffen (genau
zurück).

**Auswege**, wenn es dich stört (keiner ist gebaut oder bewiesen):

1. So lassen: Bei Korrekturen bis etwa 15 Einheiten bleibt es unter einem halben Gerätepunkt.
2. Die Bemalung nach jedem Zug an den Linien der Form neu ausrichten (zwischen zwei Linien der Form eine feste Einteilung der
   Haut, die nur von den Linien abhängt). Das wäre ein eigener Brocken; ich würde es zuerst an deiner Form messen.

### 9.4 Was Etappe 1 nicht hat

(Stand nach Etappe 1. Etappe 2 hat davon gebaut: P direkt auf der Form im Raum, Punkte zum Anfassen, offene Farblinien, Löschen,
Kreuzungen; Abschnitt 11.)

- **Die Farbe steht nur im Raum.** Eingerastet, an den Wänden und in den Vier Ansichten siehst du die Farblinien als feine Linien,
  keine Farbe. (Im Plan stand für Etappe 1 ein Bild „flach wie eine Illustration“: noch nicht gebaut.)
- **P zeichnet nicht direkt auf die Form im Raum**, nur an einer Wand oder eingerastet (wie die Linien der Form).
- Nur geschlossene Farblinien, keine Punkte zum Anfassen, kein Löschen einzelner Farblinien (nur ⌘Z); Kreuzungen sind nicht
  geprüft. Das ist Etappe 2.
- Eine Ebene, harte Kante, keine Animation beim Füllen.
- Nicht zu sehen ist die Bemalung: mit einem anderen Material als hellem Solid und Wachs, mit „Dreiecke zeigen“, in der Pose, im
  Verbund (Verschmelzen, Abziehen) und an ruhenden Objekten (sie behalten sie). Beim Anwenden von Verschmelzen geht die Bemalung
  des aufgenommenen Objekts verloren. An einer freien Form mit Spiegelbild steht die Farbe nur auf der echten Hälfte.
- Fast Weiß sieht man auf dem hellen Solid kaum (die Farbe wird dort mit seinem Bild multipliziert).
- Der Zeiger rastet mit P auch im Paint-Modus auf Punkte und Linien der Form ein; der Punkt der Farblinie liegt dann dort, wo der
  Zeiger steht.
- Am iPad mit Stift ist nichts davon geprüft (gebaut ist es mit denselben Gesten: Knopf „Farbe“, Werkzeuge der Leiste, Tippen
  füllt).

### 9.5 Aufgefallen, nicht vom Paint-Modus

- Die Kanten der hinteren Raumecke und die Zeichnungen an den Wänden liegen bei allen festen Materialien als feine Linien über der
  Form; über einer Farbfläche fällt das mehr auf (Bildblatt, Bild 4 ist daneben ausgeschnitten).
- Unter einem gewählten Ring hängt der Tropfen „Maul formen“; an der Wand des Tops kann er genau über einem Anfasser liegen. Und
  hinter der Form liegt der Griff der Raumecke: Ein Klick auf die Form genau dort klappt auf, statt zu füllen.

## 10. Etappe 2: Schritte (begonnen am 19.11.2026, auf dein Wort „Etappe 2 starten“)

Farblinien bedienen wie Linien. Jeder Schritt hat seine Probe; nach 2b und am Ende bekommst du Bild oder Film.

| Schritt | Was du anfassen kannst | Probe |
| --- | --- | --- |
| **2a** Punkte und Richtungen | noch nichts Neues zu sehen: Jede Farblinie bekommt Punkte mit zwei Richtungen (wie eine Linie der Form) und behält sie über Umformen, Netzwechsel, Sichern und Laden | Tests |
| **2b** P direkt auf der Form | im Raum und eingerastet: Klick setzt einen Punkt, Ziehen zieht die Richtungen, der Faden zeigt die Farblinie, wie sie wird; auf dem ersten Punkt schließen, ↩ beendet offen, ⌫ nimmt den letzten Punkt zurück, Esc bricht ab | im Fenster mit einzelnen Klicks: Die Punkte liegen unter den Klicks |
| **2c** A greift | Punkt ziehen (er gleitet über die Haut), Richtung drehen (Nadel und Ring), Doppelklick Knick oder rund, mit P einen Punkt auf die Farblinie setzen, ⌫ löscht; Rahmen, Lasso, Doppelklick wählt die ganze Farblinie | im Fenster; die Füllung folgt der Farblinie |
| **2d** Offen und gekreuzt | eine offene Farblinie begrenzt nur, wo sie liegt (die Füllung läuft um ihr Ende); zwei Farblinien, die sich kreuzen, trennen vier Flächen | Test und Fenster |
| **2e** Die Mitte | P rastet auf die Mitte ein; eine Farblinie von der Mitte zur Mitte schließt sich mit ihrem Spiegelbild; auch auf der Spiegelseite zu greifen | im Fenster |

**Am Ende:** Bauch, Schnauze und Augenrand an „strange bird“, jede Geste mit einzelnen Klicks, als Film.

**Stand:** 2a bis 2e sind gebaut (Abschnitt 11).

**Wie eine Farblinie zwischen zwei Punkten läuft:** Sind beide Punkte zu sehen, entsteht die Kurve im Bild, so wie du sie ziehst
(aus den zwei Punkten und den Bildern ihrer Richtungen), und wird längs des Blicks auf die Haut gelegt. Nur wenn ein Punkt nicht
zu sehen ist, entsteht sie im Raum und wird auf die Haut gelegt (wie in deiner Vorlage `raum.html`; an einer Form mit Falten
verläuft sich das, darum die Regel davor). Danach gehen ihre Orte mit der Haut mit. Neu gerechnet wird ein Stück nur, wenn du
einen seiner zwei Punkte oder dessen Richtung anfasst; alles andere bleibt, wie es liegt.

**Bauweise:** Eine Richtung steht im Maß des Dreiecks ihres Punkts (drei Zahlen zu seinen drei Ecken, Summe null: So dreht und
dehnt sie sich mit der Haut, und beim Netzwechsel geht sie wie die Gewichte mit). Bedient wird über ein zweites Verhalten der
Linien-Studie mit einem eigenen Modell (`farbe/farbBlatt.ts`, Schnittstelle `Raum` wie `werkBlatt.ts`): Im Paint-Modus gehören
A und P den Farblinien, die Linien der Form stehen still. Die Farblinien zeichnet dann das Verhalten selbst (mit Schwellen,
Tropfen und Nadel); verdeckt wird über die Tiefe des Körpers.

## 11. Etappe 2: was gebaut ist, was gemessen ist, was fehlt (19.11.2026)

Bildblatt: [`2026-11-19-paint-etappe-2-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-2-bogen.jpg). Film (42 Sekunden, deine
Form „strange bird“ von vorn): [`2026-11-19-paint-etappe-2.mp4`](../progress/ozzy/2026-11-19-paint-etappe-2.mp4).

### 11.1 Was du anfassen kannst

- **P direkt auf der Form** (im Raum): Ein Klick setzt einen Punkt, Klicken und Ziehen einen runden Punkt mit zwei Richtungen; der
  Faden zeigt die Farblinie, wie sie wird. Auf dem ersten Punkt klicken schließt sie, ↩ beendet sie offen, ⌫ nimmt den letzten
  Punkt zurück, Esc bricht ab.
- **A greift:** einen Punkt ziehen (er gleitet über die Haut); nahe an einem runden Punkt die Richtung drehen (Nadel und Ring wie
  bei den Linien, ⌥ knickt, Doppelklick schaltet zwischen Knick und rund); ⌫ löscht gewählte Punkte; ⌘Z nimmt jeden Handgriff
  zurück. Die Füllung folgt der Farblinie.
- **Offen und gekreuzt:** Eine offene Farblinie begrenzt nur, wo sie liegt (die Füllung läuft um ihr Ende). Zwei Farblinien, die
  sich kreuzen, trennen vier Flächen.
- **Die Mitte:** Mit P zeigt sie sich nahe am Zeiger als Punktreihe auf der Haut; ein Klick nah an ihr rastet ein. Auf der Mitte
  begonnen und auf der Mitte beendet, ist die Farblinie von selbst fertig, und ihr Spiegelbild schließt sie: So zeichnest du
  Bauch oder Schnauze als eine Hälfte. Zeichnest du geschlossen quer über die Mitte, bleibt der längere Teil und endet an der
  Mitte; was hinausragt, fällt weg (wie bei einem Ring der Form). Ein Spiegelbild greifst du wie die Farblinie selbst.
- Im Paint-Modus gehören A und P den Farblinien; die Linien der Form stehen still.

### 11.2 Was die Probe an deiner Form geändert hat

„strange bird“ hat Falten und Überhänge (ein Körperteil verdeckt die Falte dahinter). An der Kugel hielt alles, an deiner Form
hielt die erste Fassung nicht. Behoben:

1. **Die Kurve zwischen zwei Punkten wird im Bild gelegt,** so wie du sie ziehst, nicht mehr im Raum. An einer steilen Stelle
   ist eine Richtung im Raum viel länger als ihr Bild; dort verlief sich die Kurve über die Haut.
2. **Über den Rand eines Körperteils hinweg** (die Kurve springt im Bild auf die Haut dahinter) führt die Farblinie verdeckt
   hinter dem Rand weiter, im Bild genau unter der Kurve.
3. **An der Mitte lief die Füllung aus,** wenn eine Farblinie dort ihr Spiegelbild kreuzte.
4. **Bevor irgendetwas gemalt war,** zeigte der erste Entwurf auch, was hinter der Form liegt (ein Namenskonflikt in Ozzys
   Bildfunktion); mit Ellipse und Freihand fehlte im Raum die dunkle Farblinie.

### 11.3 Gemessen

Zwei Proben: `ozzy-farbe-bedienen-fenster.mjs` (an einer Kugel, alle Gesten mit einzelnen Klicks) und
`ozzy-farbe-mitte-fenster.mjs` (an „strange bird“). Dazu 36 Tests ohne Fenster. Die Probe der Etappe 1 hält weiter.

| Was | gemessen | hält? |
| --- | --- | --- |
| P direkt auf der Form | Die Punkte liegen 0,00 Gerätepunkte neben den Klicks, die Farblinie läuft glatt (Zacken 0,00). | ja |
| Ziehen rundet; ⌫, ↩, Esc | Die Richtungen stehen im Bild, wie gezogen (25; 0 und −25; 0). | ja |
| A zieht einen Punkt | 0,00 Gerätepunkte neben dem Ziel, die anderen Punkte bewegen sich nicht; ein Klick ohne Weg ist kein Schritt für ⌘Z. | ja |
| Richtung drehen | 0,00° neben dem Zeiger; die Gegenseite dreht mit, mit ⌥ knickt sie. | ja |
| Füllen, Löschen, ⌘Z | Die Füllung folgt; sieben Schritte der Reihe nach zurück; die Form bleibt Zahl für Zahl dieselbe. | ja |
| gekreuzt und offen | Gefüllt wird nur die Überlappung; um das Ende einer offenen Farblinie läuft die Füllung. | ja |
| von hinten, verdeckt | Von hinten gesehen und hinter einem anderen Teil der Form ist kein Punkt zu greifen. | ja |
| über einen Überhang („strange bird“) | Jede Kurve wird im Bild gelegt; größter Schritt der Farblinie im Bild 2,0 CSS-Pixel; 138 von 240 Proben liegen hinter der Form und sind nicht zu sehen. | ja |
| die Mitte („strange bird“) | Die Enden liegen 0,00 Einheiten neben der Spiegelebene; ein Klick füllt beide Hälften; quer über die Mitte bleibt der längere Teil. | ja |
| Tempo („strange bird“, rund 1 000 Orte gemalt) | Punkt ziehen und Richtung drehen: je Schritt 0,9 ms für die Kurven und 0,9 ms für das Netz; die Bemalung je Bild dabei 2,8 ms (95 %: 3,4 ms, das teuerste 11,3 ms). | ja |

### 11.4 Was Etappe 2 nicht hat

- **Ein Stück an der Farblinie selbst ziehen** (zwischen zwei Punkten greifen): tut nichts.
- **An einer Kreuzung teilen zwei Farblinien keinen Punkt** (im Plan stand das so). Die Flächen stimmen.
- **P auf einem Punkt oder einer Farblinie schließt nicht an sie an:** Dort entsteht ein neuer Punkt an derselben Stelle. Einen
  Punkt mit P auf eine Farblinie setzen ist gebaut, im Fenster aber nicht geprüft; ebenso Rahmen, Lasso und Doppelklick (die ganze
  Farblinie wählen).
- **Nur im Raum.** Eingerastet und in den Vier Ansichten gilt weiter Etappe 1 (über die Wand gezeichnet, keine Farbe dort). P
  zeichnet im Paint-Modus im Raum nicht mehr an einer Wand; Ellipse und Freihand tun es weiter.
- **Ein Punkt, den du mit A über die Mitte ziehst,** beendet die Farblinie dort nicht: Sie kreuzt dann ihr Spiegelbild (die
  Flächen stimmen).
- **Der Entwurf zeigt sein Spiegelbild erst, wenn er fertig ist.**
- **Über einen Überhang, in dessen Falte die Mitte verdeckt liegt** (schräg gesehen, von einer Körperhälfte auf die andere
  gezeichnet): Die Farblinie endet auch dann an der Mitte. Der kürzere Teil fällt weg, der längere erscheint gespiegelt auf der
  anderen Hälfte. Das überrascht. Von vorn gesehen, die Mitte im Blick, tritt es nicht auf.
- **Das Kriechen der Bemalung bei weiten Zügen an der Form** (9.3) ist unverändert.
- **Am iPad mit Stift ist nichts davon geprüft.**

### 11.5 Für die Sitzung, die baut

- `farbe/farbBlatt.ts`: das Modell der Farblinien für das Verhalten der Linien-Studie (`Raum`, `Dreher`, `StiftWerk`); `legen`
  (im Bild oder im Raum), `alsLinien` (endet an der Mitte), `mittePunkte`, `frei` (verdeckt?).
- `farbe/kurve.ts`: `stueckImBild` (im Bild gelegt, Sprünge über `bruecke`), `stueckLegen` (im Raum, durch Halbieren),
  `orteAusSpur`. `farbe/treffer.ts`: `BildTreffer` (Raster der Dreiecke im Bild; `trefferFein` trifft die glatte Anzeige wie ein
  Klick). `farbe/ort.ts`: `spur` mit gegebener Ebene, `spurImVorhang` (der kürzere der zwei Wege um den Ring).
- `farbe/bemalung.ts`: `linienAusTreffern` (über die Mitte: der längere Teil gilt; ein Ort genau in der Spiegelebene gehört zu
  beiden Hälften). `farbe/flaechen.ts`: zwei Ketten an derselben Stelle des Rands werden nach ihrer Richtung geordnet.
- Haken für Proben: `farbPunkte` (mit Abstand `z` zur Spiegelebene), `farbNetz` (samt Spiegelbildern und Entwurf, `zuSehen`),
  `farbTiefe`, `farbRaster`, `farbGelegt` (wie gelegt, was es kostet), `farbMitte`, `farbOrtFrei`, `farbVerdeckung`.
- Fallen: `apps/editor/CLAUDE.md`, Eintrag „Paint-Modus, Etappe 2“.

## 12. Etappe 3, erster Schritt: Die Farbe läuft ein (19.11.2026, auf dein Wort „Etappe 3 starten“)

Wie vereinbart zuerst zur Ansicht, bevor der Rest der Etappe gebaut wird. Bildblatt:
[`2026-11-19-paint-etappe-3-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-3-bogen.jpg). Filme in echter Zeit an „strange
bird“ (je rund 20 Sekunden): [„Tinte“](../progress/ozzy/2026-11-19-paint-etappe-3-tinte.mp4),
[„Honig“](../progress/ozzy/2026-11-19-paint-etappe-3-honig.mp4).

**Dein Wort dazu (19.11.): „Tinte“.** Sie ist eingestellt. „Honig“ bleibt erreichbar (`?fuellen=honig`, Feinregler „Füllen“).

### 12.1 Was du siehst und anfassen kannst

- **Der Farbtropfen hängt am Zeiger:** im Paint-Modus mit A, über der Form, wo ein Klick füllen würde, in der gewählten Farbe.
- **Klick:** Der Tropfen fällt auf die Haut, und von dort läuft die Farbe über die Haut, auf beiden Hälften zugleich, bis an die
  Farblinien. An einer geschlossenen Farblinie staut sie sich. Um das Ende einer offenen Farblinie und durch eine Lücke läuft sie
  herum: So siehst du, wo eine Fläche offen ist. Wo schon Farbe liegt, läuft die neue über die alte.
- **Zwei Fassungen zur Wahl:**
  - **„Tinte“** (eingestellt): schnell, feine Front. Eine kleine Fläche in einer Drittelsekunde, der sichtbare Körper von
    „strange bird“ in gut einer halben Sekunde.
  - **„Honig“:** zäh, die Front welliger, dahinter ein dicker Wulst, der mehr Licht und Glanz fängt. Am Körper rund
    zweieinhalbmal so lang (der sichtbare Teil etwa 1,6 Sekunden), eine kleine Fläche 0,6 Sekunden.
- **Selbst einstellen:** Menü, Feinregler „Füllen“: Tempo der Front, Stoß am Anfang, Dauer mindestens und höchstens, Welle der
  Front, Breite und Stärke des Wulstes; der erste Regler schaltet das Einlaufen ab. Für die zwei Fassungen:
  `?fuellen=tinte` oder `?fuellen=honig` an die Adresse hängen.
- Auf Wachs und auf dem hellen Solid. ⌘Z nimmt eine Füllung auch mitten im Einlaufen ganz zurück.

### 12.2 Gemessen

Probe `ozzy-farbe-fliessen-fenster.mjs` (an einer Kugel, Fassung „Tinte“), dazu fünf Tests ohne Fenster. Die Proben der Etappen 1
und 2 halten weiter.

| Was | gemessen | hält? |
| --- | --- | --- |
| Die Farbe läuft von der Stelle des Klicks aus | gefärbt am Klick nach 0,01 s, 18 Pixel daneben nach 0,06 s, 36 Pixel nach 0,15 s; hinter der geschlossenen Farblinie nie; am Ende 0 von 255 Unterschied zum Bild ohne Einlaufen | ja |
| Eine offene Farblinie staut | hinter der Spitze eines Winkels nach 0,17 s, gleich weit entfernt im Freien nach 0,07 s | ja |
| Die Front läuft rund (nicht in Sechsecken längs der Kanten des Netzes) | die Weite gegen den wahren Weg über die Kugel: höchstens 4 % daneben, im Mittel unter 1,5 % | ja |
| Tempo | Vorbereiten 4 ms an der Kugel, 3 bis 24 ms an „strange bird“ (der ganze Körper); die Bemalung je Bild beim Einlaufen 0,1 ms | ja |
| ⌘Z mitten im Einlaufen | die Füllung ist sofort ganz zurück | ja |
| Der Farbtropfen am Zeiger | mit A über der Form zu sehen, neben der Form und mit P nicht | ja |
| Im gewöhnlichen Browser, ohne Angabe in der Adresse | „Tinte“ läuft: an „strange bird“ 1,05 s für den ganzen Körper, Vorbereiten 9 ms, keine Fehler in der Konsole | ja |

### 12.3 Was nach diesem Schritt noch fehlte

- **Farben als Tropfen in der Leiste** (statt des einen Farbfelds), **Taste F** als eigenes Werkzeug „Farbtropfen“, die
  **Pipette** (I: Farbe von der Form aufnehmen): **gebaut auf dein Wort „Tinte“, Abschnitt 13.**
- **Am iPad** gibt es keinen Zeiger, also keinen hängenden Tropfen (dafür seit Abschnitt 13 das Ziehen eines Tropfens aus der
  Leiste); das Einlaufen selbst ist dort ungeprüft.
- **Eingerastet und in den Vier Ansichten** steht weiter keine Farbe (Lücke aus Etappe 1).
- **Die Dauer richtet sich nach der fernsten Stelle der Fläche,** auch wenn sie auf der Rückseite liegt: Bei „Tinte“ läuft es am
  ganzen Körper von „strange bird“ nach dem sichtbaren Teil noch eine halbe Sekunde unsichtbar weiter (das stört nicht, ein neuer
  Klick beendet es).
- **Ein Streifen zwischen zwei Farblinien, schmaler als ein Dreieck des Netzes,** füllt sich erst am Schluss auf einen Schlag.

### 12.4 Für die Sitzung, die baut

- `farbe/fliessen.ts`: `flussWeiten` (die Weite jeder Stelle von der Saat, innerhalb der Fläche; Wellenfront von Dreieck zu
  Dreieck), `weiteImDreieck` (rund statt eben gemischt), `fuellungBei`. `farbe/flaechen.ts`: je Dreieck mit Farblinien die Zelle
  jeder Ecke (`ecken`, `eckFarben`) und jeder Seite einer Kette (`zl`, `zr`).
- `farbe/anzeige.ts`: `FlussBild`, `flussSetzen`; im Shader `fluss` (Front, Welle, Wulst) und `weiteRund`. Die Datentextur hat je
  Kette drei Zeilen Kopf (Zahl der Punkte und Füllungen; Weiten links; Weiten rechts), je Dreieck im Kopf sein Maß.
- `farbe/farbwerk.ts`: `FLIESSEN` (die zwei Fassungen), `fliessWerte`, `fliessen(dt)` je Bild, `fliesst`, `flussStand`.
  `main.ts`: Feinregler „Füllen“ (`fuellWerte`), `farbTropfenZeigen`, `farbTropfenFallen`, Haken `farbFluss`, `farbFliessen`.
- Im Testbrowser ist das Einlaufen ohne `fuellen=` in der Adresse aus (die Proben lesen die Farbe gleich nach dem Klick).

## 13. Etappe 3, zweiter Schritt: Farben als Tropfen, Farbtropfen, Pipette (19.11.2026, auf dein Wort „Tinte“)

Bildblatt: [`2026-11-19-paint-etappe-3-farben-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-3-farben-bogen.jpg). Film in
echter Zeit an „strange bird“ (29 Sekunden):
[`2026-11-19-paint-etappe-3-farben.mp4`](../progress/ozzy/2026-11-19-paint-etappe-3-farben.mp4).

### 13.1 Was du siehst und anfassen kannst

- **Die Farben hängen als kleine Tropfen unter der Leiste,** sobald du mit B im Paint-Modus bist. Der gewählte hängt tiefer und
  ist größer.
  - **Antippen** wählt eine Farbe.
  - **Den gewählten noch einmal antippen** ändert seine Farbe (der Farbwähler des Systems).
  - **Der hohle Tropfen mit dem Plus** legt eine neue Farbe an.
  - **Ziehen:** Der Tropfen hängt am Zeiger. Über der Form losgelassen, fällt er und füllt dort, wie Farbe ziehen in Procreate.
    Das geht mit jedem Werkzeug und braucht keinen Zeiger, also auch mit dem Stift. Auf dem Mülleimer losgelassen, ist die Farbe
    verworfen. Sonst kehrt er zurück.
  - Deine Farben bleiben über das Neuladen.
- **Farbtropfen (F, oder sein Zeichen in der Leiste):** Die gewählte Farbe hängt am Zeiger, überall über der Form, auch über
  einer Farblinie. Jeder Klick auf die Form füllt; Punkte und Farblinien lassen sich damit nicht greifen. Das Zeichen in der
  Leiste trägt die gewählte Farbe. ⌥ + Klick nimmt die Farbe unter dem Zeiger auf. F noch einmal oder A: zurück zu den Punkten.
- **Pipette (I, oder ihr Zeichen in der Leiste):** Am Zeiger steht ein Ring in der Farbe, die unter ihm liegt (gestrichelt und
  leer, wo keine liegt). Ein Klick nimmt sie auf: Steht sie schon bei den Tropfen, ist ihr Tropfen gewählt, sonst kommt sie als
  neuer dazu. Danach gilt gleich der Farbtropfen.
- **Der Tropfen am Zeiger und die Tropfen der Leiste haben dieselbe Form** wie das Zeichen des Farbtropfens (bis dahin war der am
  Zeiger eckiger).

### 13.2 Gemessen

Probe `ozzy-farbe-tropfen-fenster.mjs` (an einer Kugel, mit echten Klicks). Die Proben der Etappen 1 und 2 und die zum Einlaufen
halten weiter. Eine Zeile riss einmal: das Tempo beim Drehen aus Etappe 1, als drei Proben hintereinander liefen; allein
wiederholt hielt sie (teuerstes Bild 3,5 ms).

| Was | gemessen | hält? |
| --- | --- | --- |
| Nur im Paint-Modus | vor B: keine Farben und keine zwei Werkzeuge in der Leiste, F und I tun nichts (mit Hinweis); nach B ist beides da | ja |
| F hängt überall und greift nichts | mit A am Punkt einer Farblinie hängt der Punkt am Zeiger, kein Tropfen; mit F dort der Tropfen und sonst nichts; ein Klick dort: eine Füllung mehr, nichts gewählt, die Farblinie unverändert | ja |
| Antippen wählt, F füllt mit der Farbe | Blau angetippt: gewählt #3f7fd0, das Zeichen in der Leiste ist blau; im Fünfeck steht danach Blau | ja |
| Pipette | Ring über Blau in Blau, über freier Haut leer; Klick auf freie Haut: nichts ändert sich (mit Hinweis); Klick auf Blau: sein Tropfen ist gewählt (weiter 8 Tropfen), es gilt der Farbtropfen; eine Farbe, die nicht in der Leiste stand, kommt als neunter Tropfen dazu | ja |
| ⌥ + Klick mit dem Farbtropfen | nimmt die Farbe auf, füllt nicht | ja |
| Ziehen | im Zug hängt der Tropfen am Zeiger, in der Leiste bleibt die Hülle; auf der Form losgelassen: eine Füllung mehr in dieser Farbe; neben der Form: nichts; auf dem Mülleimer: ein Tropfen weniger, keine Füllung | ja |
| Farbe ändern, Neuladen | der gewählte Tropfen bekommt die neue Farbe; nach dem Neuladen stehen dieselben Farben da | ja |
| B aus dem Farbtropfen heraus | zurück bei den Punkten, die Farben sind weg | ja |
| Der Farbwähler | der zweite Tipp auf den gewählten Tropfen und das Plus öffnen ihn ohne Fehler (einmal geprüft; was man darin wählt, nicht) | ja |
| Im gewöhnlichen Browser | im Fenster 5215 mit echten Klicks an „strange bird“: Blau antippen, Farbtropfen wählen, Klick füllt (läuft 1,04 s ein), keine Fehler | ja |

### 13.3 Für dich entschieden (sag, wenn du es anders willst)

- **Mit A füllt ein Klick auf freie Haut weiter wie bisher.** Stört dich das beim Bearbeiten (ein Klick knapp neben einen Punkt
  füllt), nehme ich das Füllen aus A heraus; dann füllen nur der Farbtropfen und das Ziehen.
- **Acht Farben am Anfang** (hell, Gelb, Orange, Rot, Magenta, Blau, Grün, fast Schwarz): Platzhalter. Deine kommen über das Plus
  und den Farbwähler; höchstens 14 Tropfen.
- **Die Farben gehören zum Browser, nicht zur Form.** Jede Form zeigt dieselben Tropfen. Die Farben einer geladenen Form holst du
  mit der Pipette.
- **Nach der Pipette gilt der Farbtropfen** (aufnehmen, dann füllen).
- **F und I gelten nur im Paint-Modus.** Mit dem Farbtropfen gibt es kein Röntgen: ⌥ nimmt dort die Farbe auf.

### 13.4 Was fehlt

- **Am iPad ungeprüft.** Gebaut ist es für den Stift (die Werkzeuge als Knöpfe in der Leiste, Ziehen ohne Zeiger), gesehen habe
  ich es dort nicht.
- **Der Farbwähler ist der des Systems** (am Mac ein kleines Fenster, am iPad der von iPadOS). Ein eigener im Stil von Ozzy wäre
  ein eigener Schritt.
- **Eingerastet und in den Vier Ansichten** steht weiter keine Farbe (Lücke aus Etappe 1); Füllen und Aufnehmen gehen dort nicht.
- **Die Pipette nimmt nur die Farbe von Füllungen,** nicht den Ton des Materials und nicht, was das Licht daraus macht.
- Aus Abschnitt 12.3 unverändert: die Dauer nach der fernsten Stelle, der Streifen schmaler als ein Dreieck.

### 13.5 Für die Sitzung, die baut

- `farbe/farbLeiste.ts` (`FarbLeiste`): die Tropfen, Wählen, Ziehen, Farbwähler, `localStorage` (`ozzy.farben`). Was beim Wählen,
  Ziehen und Fallen geschieht, bestimmt `main.ts` (`FarbZiele`). Das Farbfeld `#farbe-farbe` bleibt unsichtbar in der Seite: Es
  öffnet den Farbwähler, und Proben und Filme setzen darüber die gewählte Farbe.
- `leiste.ts`: `LeistenWerkzeug` (die Werkzeuge des Blatts, dazu `tropfen` und `pipette`), `malZeigen`, `farbeZeigen`,
  `muellKnopf`. `main.ts`: `raumWerkzeug` hat diesen Typ; `farbWerkzeug()` (Farbtropfen oder Pipette: Der Zeiger geht nicht an
  das Verhalten der Linien, wie bei Freihand und Formen); `farbWerkzeugTaste`, `farbAufnehmenBei`, `farbUnter`, `farbZug`; Haken
  `farbLeiste`, `farbUnter`. `farbwerk.ts`: `farbeBei`.
- Film: `scripts/ozzy/paint-farben-film.mjs`. Bilder der Leiste in dreifacher Schärfe: `scripts/ozzy/paint-farben-blick.mjs`.

## 14. Etappe 4, erster Schritt: weiche Kanten, zwei Fassungen der Bedienung zur Wahl (19.11.2026, auf dein Wort „Etappe 4 starten“)

Bildblatt: [`2026-11-19-paint-etappe-4-bedienung-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-4-bedienung-bogen.jpg).
Wie vereinbart zuerst ein Bild der Bedienung. **Gebaut ist davon noch nichts.**

### 14.1 Was am Bild echt ist

- **Echt:** deine Form „strange bird“ auf Wachs, von der Seite; eine Farblinie mit vier Punkten (ein Fleck auf der Flanke); die
  Haut in zwei Aufnahmen aus dem Fenster, einmal ganz in Blau, einmal ganz in Hell.
- **Gemischt:** der weiche Übergang. Je Bildpunkt sind die zwei Aufnahmen nach seinem Abstand zur Farblinie gemischt. Das ist die
  Rechnung, die später die Grafikkarte macht; nur misst das Bild den Abstand im Bild, gebaut wird er längs der Haut gemessen.
- **Gezeichnet:** der Tropfen am Faden, der Ring, der Zeiger daran.

### 14.2 Was in beiden Fassungen gleich ist

- Die Farblinie bleibt, wo sie ist. Der Verlauf liegt zu beiden Seiten von ihr, gleich weit.
- Die Breite kann sich längs der Farblinie ändern und bis auf null gehen: Dort ist die Kante hart, dazwischen fließt die Breite.
- Farbe bleibt Vektor: Gespeichert wird die Breite, kein Bild. Bei jedem Zoom wird der Verlauf neu gerechnet.
- K schaltet weich und hart, ⌘Z nimmt jeden Schritt zurück.

### 14.3 Fassung 1: Tropfen ziehen

- An einem gewählten Punkt sitzt quer zur Farblinie ein kleiner Tropfen an einem Faden. **Wegziehen:** Der Verlauf öffnet sich an
  diesem Punkt, so weit wie der Faden. **Zurückschieben:** Die Kante ist wieder hart. Hohl heißt hart, gefüllt heißt weich.
- Die Breite gehört den Punkten der Farblinie; zwischen zwei Punkten fließt sie. Soll sich die Weichheit zwischen zwei Punkten
  ändern, setzt P dort einen Punkt.
- Mehrere Punkte oder die ganze Farblinie gewählt: K schaltet weich und hart, `[` und `]` machen den Verlauf breiter und schmaler.
- **Dafür spricht:** genau und wiederholbar (eine Breite je Punkt); es ist, was du beschrieben hast („direkt an linien und
  punkten“); derselbe Anfasser wie die Nadel an einem Punkt, wie das Breitenwerkzeug in Illustrator.
- **Dagegen:** Jede Stelle mit eigener Weichheit braucht einen Punkt.

### 14.4 Fassung 2: Wasser

- Ein Werkzeug: ein klarer Tropfen in der Leiste, neben dem Farbtropfen. Der Zeiger ist ein Ring; so breit wird der Verlauf
  (`[` und `]` ändern ihn). **Über die Kante fahren** macht sie nass: Sie verschwimmt, so breit wie der Ring. **⌥ + fahren**
  trocknet: Die Kante ist dort wieder hart.
- Die Weichheit hängt nicht an den Punkten der Farblinie. Man malt sie längs der Kante.
- **Dafür spricht:** schnell und malerisch, nah am Wischen in Procreate; es braucht keine Punkte.
- **Dagegen:** weniger genau zu wiederholen; ein Werkzeug mehr; die Breite steht nirgends an einem Punkt.

### 14.5 Mein Vorschlag

**Fassung 1 zuerst.** Sie ist, was du beschrieben hast, sie ist genau, und sie ist der kleinere Bau. Fassung 2 lässt sich später
daraufsetzen: Das Wasser stellt dann dieselben Breiten ein und setzt, wo es nötig ist, selbst Punkte.

### 14.6 Wie gebaut wird (nach deiner Wahl) und woran ich es messe

- **Modell:** Jeder Punkt einer Farblinie bekommt eine Breite (Einheiten des Werks, 0 = hart). Die Datei bekommt eine neue
  Version; alte bleiben lesbar.
- **Zeichnen:** In den Dreiecken, durch die eine Farblinie läuft, rechnet die Grafikkarte den Abstand zur Farblinie schon je
  Bildpunkt. Für breitere Verläufe trägt jeder Punkt des Rechennetzes den Abstand zur nächsten Farblinie, ihre Breite dort und
  die Farbe jenseits: dieselbe Rechnung wie beim Einlaufen (Abschnitt 12), von den Farblinien aus statt vom Klick, und nur so
  weit, wie der breiteste Verlauf reicht.
- **Kriterien, vor dem Bau festgelegt:**
  1. Breite null gibt genau das Bild von heute (0 von 255 Unterschied).
  2. Der Verlauf ist an jeder Stelle so breit wie eingestellt (höchstens 1 Gerätepunkt oder 5 % daneben), bei 1-, 4- und
     16-facher Vergrößerung.
  3. Längs der Farblinie fließt die Breite stetig von Punkt zu Punkt; an einem Punkt mit Breite null ist die Kante einen
     Gerätepunkt breit.
  4. Kein Verlauf schlägt auf die Rückseite oder über eine andere Farblinie.
  5. Tempo an „strange bird“: die Bemalung je Bild im Median höchstens 1 ms, das Neurechnen nach einem Handgriff höchstens 30 ms.
  6. Sichern, Laden und ⌘Z halten die Breiten.
  7. Geprüft an einer deiner Formen, mit Film.

### 14.7 Für die Sitzung, die baut

- Die Szene des Bildblatts: `scripts/ozzy/paint-weich-szene.mjs <ordner>` (nimmt Haut und Linien getrennt auf und schreibt
  `szene.js`); das Blatt: `scripts/ozzy/paint-weich-bogen.mjs <ordner>` setzt `paint-weich-bogen.html` (mischt und zeichnet).
- Neu für Filme und Bilder: `__ozzy.blickSetzen({ gier, neigung, zoom, schwenkX, schwenkY })` setzt den Blick ohne Schwung. Mit
  der Maus gedreht, läuft die Form je nach Takt des Loslassens verschieden weit nach, und das Bild steht jedes Mal anders.

## 15. Etappe 4, gebaut: weiche Kanten mit dem Tropfen am Faden (19.11.2026, auf dein Wort „Fassung 1“)

Bildblatt: [`2026-11-19-paint-etappe-4-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-4-bogen.jpg) (alles echt, aus dem
Fenster). Film in echter Zeit an „strange bird“ (43 Sekunden):
[`2026-11-19-paint-etappe-4.mp4`](../progress/ozzy/2026-11-19-paint-etappe-4.mp4).

### 15.1 Was du siehst und anfassen kannst

- **Punkt wählen (A, im Paint-Modus):** Quer zur Farblinie sitzt an ihm ein kleiner Tropfen an einem kurzen Faden. Hohl heißt:
  harte Kante.
- **Den Tropfen wegziehen:** Die Kante wird an diesem Punkt weich, so weit wie der Faden reicht, zu beiden Seiten der Farblinie
  gleich. Der Tropfen ist dann gefüllt. Zu den Nachbarpunkten hin läuft der Verlauf fließend aus, bis zur harten Kante, wenn der
  Nachbar hart ist.
- **Zurückschieben** bis an die Farblinie macht die Kante wieder hart.
- **Mehrere Punkte gewählt** (⇧ + Klick, Rahmen, Lasso, ⌘A): Jeder zeigt seinen Tropfen. **K** schaltet weich und hart (weich
  mit der zuletzt eingestellten Breite). **]** macht den Verlauf breiter, **[** schmaler.
- **Ein Punkt, mit P auf die Farblinie gesetzt,** übernimmt die Breite, die dort schon gilt. So bekommt eine Stelle zwischen zwei
  Punkten ihre eigene Weichheit.
- Jeder Handgriff ist ein Schritt für ⌘Z. Sichern und Laden halten die Breiten. Auf Wachs und auf dem hellen Solid.
- Die Breite gehört zur Form, nicht zum Bild: Vergrößert bleibt der Verlauf auf der Haut gleich breit.

### 15.2 Gemessen (die Kriterien aus Abschnitt 14.6)

Probe `ozzy-farbe-weich-fenster.mjs` (an einer Kugel und an „strange bird“), dazu zehn Tests ohne Fenster. Alle Proben der
Etappen 1 bis 3 halten weiter.

| Kriterium | gemessen | hält? |
| --- | --- | --- |
| 1 Breite null gibt genau das Bild von vorher | kein Bildpunkt anders (0 von 255), auch nachdem eine Breite gesetzt und wieder genommen wurde | ja |
| 2 Der Verlauf ist so breit wie eingestellt (höchstens 1 Gerätepunkt oder 5 % daneben), 1-, 4-, 16-fach | 1-fach: 19,26 Pixel eingestellt, 18,94 gemessen; 4-fach: 110,98 und 109,58; 16-fach (4-fach vergrößert bei vierfacher Pixeldichte, in Gerätepunkten): 443,85 und 438,52. Die Mitte des Verlaufs liegt höchstens 2,8 Gerätepunkte neben der Farblinie (von 444) | ja |
| 3 Die Breite fließt stetig von Punkt zu Punkt; an einem Punkt mit Breite null ist die Kante einen Gerätepunkt breit | vom weichen zum harten Punkt: 23,3 → 20,8 → 18,8 → 15,8 → 14,8 → 9,5 → 4,2 → 0,5 → 0,2 Pixel; die Kante am harten Punkt: 1,1 Pixel | ja |
| 4 Kein Verlauf schlägt über eine andere Farblinie oder auf die Rückseite | eine harte Farblinie mitten im Verlauf: davor 28 % der Farbe von jenseits, 8 und 14 Pixel dahinter 0 %; Rückseite: an einer flachen Linse (Test ohne Fenster) steht genau unter der Farblinie, 8 Einheiten durch die Form, nichts | ja |
| 5 Tempo an „strange bird“ | Neurechnen beim Ziehen am Tropfen 2,9 bis 10,8 ms je Schritt (erlaubt 30); die Bemalung je Bild beim Drehen im Median 0,1 ms (erlaubt 1) | ja |
| 6 Sichern, Laden, ⌘Z halten die Breiten | geladen dieselben vier Breiten; ⌘Z nimmt Ziehen und Zurückschieben einzeln zurück | ja |
| 7 An einer deiner Formen, mit Film | „strange bird“: Bildblatt und Film | ja |
| Der Tropfen am Faden | hohl am gewählten Punkt, Faden 12 Pixel; 30 Pixel gezogen: Breite 43,61 Einheiten (erwartet 43,61); zurückgeschoben: wieder hart, das Bild wie vorher (0 von 255) | ja |
| K, ] und [ | K: weich; ]: mal 1,25; zweimal [: durch 1,25²; K: hart; alle gewählt, K: alle weich, K: alle hart | ja |

### 15.3 Für dich entschieden (sag, wenn du es anders willst)

- **Der Verlauf liegt zu beiden Seiten der Farblinie gleich weit,** an der Farblinie steht die Mitte der zwei Farben. (Nur nach
  einer Seite wäre eine eigene Einstellung.)
- **Die Breite an einer Stelle ist die Breite der Farblinie an dem Punkt, der ihr am nächsten liegt.**
- **K macht weich mit der zuletzt eingestellten Breite** (am Anfang 16 Einheiten); die Klammern ändern um ein Viertel.
- **Der Tropfen sitzt nur an gewählten Punkten,** die zu sehen sind. Bei einer geschlossenen Farblinie zeigt er von ihr weg nach
  außen.
- **Beim Füllen einer Fläche mit weicher Kante** läuft die Farbe ein wie sonst; der Verlauf steht von Anfang an.

### 15.4 Was fehlt

- **Trifft ein Verlauf auf eine andere Farblinie, endet er etwas zu früh:** schon in den Dreiecken des Netzes, durch die sie
  läuft, bis zu ein Dreieck vor ihr, statt genau an ihr.
- **Überlappen sich zwei Verläufe** (zwei weiche Farblinien dicht beieinander, oder ein Fleck schmaler als sein Verlauf), gilt
  der nähere; dort kann eine Stufe stehen.
- **Während du an der Form ziehst,** geht der Verlauf mit der Haut mit und wird erst nach dem Zug neu gerechnet (ungeprüft, wie
  das aussieht).
- **Am iPad ungeprüft.** Der Tropfen lässt sich mit dem Stift ziehen; für K gibt es den Knopf „Kante“, für die Klammern keinen.
- **Eingerastet und in den Vier Ansichten** steht weiter keine Farbe (Lücke aus Etappe 1), also auch kein Verlauf und kein Tropfen.
- **Fassung 2 „Wasser“** ist nicht gebaut; sie ließe sich daraufsetzen (Abschnitt 14.5).

### 15.5 Für die Sitzung, die baut

- **Modell:** `FarbPunkt.breite` (`kurve.ts`), `breitenLaengs` (`bemalung.ts`: die Breite je Ort, zwischen zwei Punkten weich
  gemischt), Datei Version 3 (`b` je Punkt). Die Ketten tragen `w` je Punkt (`ketten.ts`), `RandKette` dazu `ein`, `aus`.
- **Feld:** `weich.ts`, `weichFeld`: je Punkt des Rechennetzes Abstand zur nächsten Stelle einer weichen Farblinie am Rand seiner
  Fläche, die Breite dort, die Füllung jenseits; je Dreieck mit Kette (`rand`) der Abstand der drei Ecken mit Vorzeichen und die
  Breite an den drei Ecken. Gerechnet in `FarbWerk.ableiten` (nur wenn sich Bemalung oder Netz ändern).
- **Anzeige:** `anzeige.ts`, `WeichBild`. Innen: je Ecke der Anzeige `aWeich` (Abstand, Breite) und `aFremd` (Farbe jenseits),
  eigene Materialien für die Dreiecke im Verlauf (`weichMat`, `leerMat` für Flächen ohne Füllung, `flussWeichMat`). Am Rand: je
  Kette zwei Zeilen mehr in der Datentextur (die Punkte beginnen jetzt bei `z + 5`), `uWeich`.
- **Bedienung:** `farbBlatt.breitenGriffe` (Stelle, Richtung quer, Pixel je Einheit), in `main.ts` `weichGriffe`,
  `weichGriffeZeichnen`, `weichZug`, `weichTaste`; Haken `farbBreite`, `farbWeichGriffe`, `farbWeich`.
- Film: `scripts/ozzy/paint-weich-film.mjs`; Standbilder: `scripts/ozzy/paint-weich-blick.mjs`.

## 16. Etappe 5, gebaut: Ebenen (19.11.2026, auf dein Wort „Etappe 5 starten“)

Bildblatt: [`2026-11-19-paint-etappe-5-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-5-bogen.jpg) (alles echt, aus dem
Fenster). Film in echter Zeit an „strange bird“ (58 Sekunden):
[`2026-11-19-paint-etappe-5.mp4`](../progress/ozzy/2026-11-19-paint-etappe-5.mp4).

### 16.1 Was du siehst und anfassen kannst

- **Der Stapel am rechten Rand** (nur im Paint-Modus): je Ebene eine kleine Linse, ein liegender Tropfen, in den Farben ihrer
  Füllungen (leer: weiß). Oben liegt, was deckt.
- **Das Plus** (die hohle Linse über dem Stapel) legt eine neue, leere Ebene an: über der, an der du gerade malst. An der neuen
  malst du dann.
- **Eine Linse antippen:** An dieser Ebene malst du jetzt. Ihre Linse ist größer und steht vor. Nur ihre Farblinien sind zu
  sehen und zu greifen; P, Füllen, K und der Tropfen am Faden gelten ihr.
- **Der Punkt neben der Linse** blendet die Ebene aus und wieder ein. Ausgeblendet ist die Linse hohl und der Punkt ein Ring.
- **Eine Linse ziehen** ordnet: Sie geht mit dem Zeiger, die anderen rücken, und die Form zeigt sofort, was dann oben liegt.
- **Eine Linse zur Seite aus dem Stapel und auf den Mülleimer ziehen:** Die Ebene ist mit allem darauf gelöscht (die letzte
  bleibt). ⌘Z holt sie zurück.
- **Muster über Verläufen:** Was auf einer oberen Ebene liegt, deckt, was darunter liegt; wo sie nichts hat, scheint die untere
  durch. Eine weiche Kante einer oberen Ebene läuft in die Farbe der Ebene darunter aus.
- ⌘Z nimmt Anlegen, Löschen und Ordnen zurück. Sichern und Laden halten die Ebenen, ihre Reihenfolge, was ausgeblendet ist und
  wo du malst. Auf Wachs und auf dem hellen Solid.
- Die Pipette nimmt die Farbe, die du siehst (die der obersten Ebene an der Stelle). Liegt beim Füllen eine Ebene darüber, die
  dort deckt, sagt es die Zeile unten.

### 16.2 Gemessen

Probe `ozzy-farbe-ebenen-fenster.mjs` (an einer Kugel und an „strange bird“, der Stapel mit echten Klicks), dazu zwölf Tests ohne
Fenster. Alle Proben der Etappen 1 bis 4 und die der Materialien halten weiter.

| Kriterium | gemessen | hält? |
| --- | --- | --- |
| 60 Eine leere oder ausgeblendete Ebene ändert keinen Bildpunkt | mit einer leeren Ebene darüber und mit einer ausgeblendeten: 0 von 255, auf Wachs und auf hellem Solid | ja |
| 61 Oben deckt unten | ein roter Fleck auf der oberen Ebene über einer blauen: im Fleck 100,00 % Rot, daneben 0,00 %; das Innere des Flecks ist dasselbe Bild wie ohne die untere Ebene (0 von 255, beide Gründe); helles Solid: im Fleck steht 252, 0, 0 (nicht mit dem Blau vermischt) | ja |
| 62 Ordnen | die Ebene mit dem Fleck nach unten: das Bild ist das der blauen Ebene allein (0 von 255, beide Gründe); ⌘Z legt sie zurück (0 von 255 gegen vorher) | ja |
| 63 Aus- und einblenden | ausgeblendet gegen das Bild ohne sie: 0 von 255; wieder eingeblendet gegen das Bild mit ihr: 0 von 255 | ja |
| 64 Eine weiche Kante der oberen Ebene läuft in die untere aus, so breit wie eingestellt | eingestellt 19,26 Pixel zu jeder Seite, gemessen 18,96; die Mitte liegt 0,33 Pixel neben der Farblinie; gemischt wie innerhalb einer Ebene | ja |
| 65 Gemalt wird auf der aktiven Ebene | P und Füllen an der unteren Ebene kommen dort an (eine Farblinie, zwei Füllungen), die obere bleibt; zu greifen sind nur die Farblinien der aktiven Ebene | ja |
| 66 ⌘Z, Sichern, Laden | ⌘Z nimmt Anlegen und Löschen zurück (die gelöschte Ebene kommt mit Farblinie und Füllung wieder); geladen: dieselben Ebenen, dieselbe Reihenfolge, dieselbe ausgeblendet, an derselben wird gemalt | ja |
| 67 Der Stapel mit echten Klicks | Plus, Antippen, der Punkt, Ziehen und der Mülleimer tun, was sie sollen; ein Zug hin und zurück ist kein Schritt; schräg aus dem Stapel gelöscht, legt ⌘Z die Ebene wieder an ihren Platz | ja |
| 68 Tempo an „strange bird“ mit drei Ebenen | ein Handgriff rechnet nur seine Ebene neu: 2,6 bis 4,7 ms (erlaubt 30); ein Bild samt Grafikkarte bei 2880 × 1800: eine Ebene 11,4 ms, drei Ebenen mit harten Kanten 11,8 ms, die oberste weich 15,1 ms; die Bemalung kostet den Prozessor je Bild 0,3 ms (erlaubt 1) | ja |
| 69 Keine Fehler in der Konsole | keine | ja |
| An einer deiner Formen, mit Film | „strange bird“: ein Verlauf auf Ebene 1, vier Punkte auf Ebene 2 | ja |

### 16.3 Für dich entschieden (sag, wenn du es anders willst)

- **Antippen wählt, der Punkt blendet aus.** Im Plan stand „tippen blendet aus und ein“. Dann fehlte ein Griff, um zu sagen, wo
  gemalt wird; darum hat jede Ebene zwei Stellen: die Linse und den Punkt.
- **Der Stapel steht am rechten Rand, auf halber Höhe.** Die Linsen sind so klein wie die Farbtropfen.
- **Eine neue Ebene liegt über der, an der du malst** (nicht immer ganz oben).
- **Zu sehen und zu greifen sind nur die Farblinien der Ebene, an der du malst.** Die der anderen Ebenen stehen nicht im Bild.
- **Wer an einer ausgeblendeten Ebene malt, blendet sie damit ein.**
- **Aus- und Einblenden und die Wahl der Ebene sind keine Schritte für ⌘Z** (wie eine Auswahl). Anlegen, Löschen und Ordnen sind
  Schritte.
- **Höchstens zwölf Ebenen.**
- **Zwischen zwei Ebenen mischt eine weiche Kante wie innerhalb einer Ebene.** (Ohne Zutun mischte sie auf Wachs heller.)
- **Die Namen zählen von selbst** („Ebene 1“, „Ebene 2“). Sie stehen nur im Hinweis unter dem Zeiger.

### 16.4 Was fehlt

- **Umbenennen, zusammenlegen, verdoppeln und eine Deckkraft je Ebene** gibt es nicht.
- **Am iPad ungeprüft.** Linse und Punkt lassen sich mit dem Stift treffen; für einen Finger sind sie klein (30 × 12 Punkte).
- **Kein Tastenkürzel** für die Ebenen.
- **Mehrere Ebenen brauchen Platz auf der Grafikkarte:** über dem hellen Solid immer, auf Wachs, sobald eine obere Ebene weiche
  Kanten hat, ein bis zwei Bilder mehr in der Größe des Fensters. Beim ersten Mal ruckt es einmal (rund eine Viertelsekunde).
  Am iPad ungeprüft.
- **Auf Wachs, solange eine Füllung einläuft,** mischt eine weiche Kante einer oberen Ebene für diese Sekunde etwas heller in
  die Ebene darunter als danach.
- **Je Ebene gilt weiter, was an Etappe 4 fehlt:** Ein Verlauf endet etwas vor einer anderen Farblinie derselben Ebene, zwei
  Verläufe können sich an einer Stufe treffen.
- **Die Ebenen-Ansicht** (die Form fächert auf) ist Etappe 6.
- **Eingerastet und in den Vier Ansichten** steht weiter keine Farbe; der Stapel steht dort, und P zeichnet auf die Ebene, an
  der du malst.

### 16.5 Für die Sitzung, die baut

- **Modell:** `Bemalung.ebenen` zählt von unten nach oben; `Ebene.aus` (ausgeblendet). `bemalung.ts`: `ebeneNeu`,
  `ebeneLoeschen`, `ebeneOrdnen`, `sichtUebernehmen` (was man sieht und wo man malt, geht in einen früheren Stand über:
  `FarbWerk.zurueck` und der Weg zurück auf ein altes Netz), `EBENEN_HOECHSTENS`. Datei: Version 3 bleibt, `aus` fehlt, wenn die
  Ebene zu sehen ist.
- **Farbwerk:** je Ebene, die gezeichnet wird (zu sehen und nicht leer), ein `EbeneStand` (Flächen, Farben, weiche Kanten).
  Neu gerechnet wird nur, was sich geändert hat: `geaendert()` meint die aktive Ebene (`altNur`), `alt` alle; `sichtAlt` merkt,
  wenn eine Ebene aus- oder eingeblendet, gelöscht oder leer geworden ist. `merken(h, zeigen)` blendet die aktive Ebene ein.
  `ebeneNeu`, `ebeneLoeschen`, `ebeneOrdnen` (Schritte), `ebeneWaehlen`, `ebeneZeigen` (keine Schritte), `ebenenStand()` (für den
  Stapel, von oben nach unten), `bedienbar` (die Farblinien der aktiven Ebene, solange sie zu sehen ist), `farbeBei` (von oben
  nach unten), `deckerUeber`.
- **Anzeige:** `anzeige.ts`. `FarbAnzeige` ist jetzt die Bemalung einer Ebene, `FarbStapel` hält sie, ordnet sie (`renderOrder`,
  alle Materialien stehen in der Reihe der durchscheinenden Dinge) und zeichnet alle in einem Durchgang. Über dem hellen Solid
  mit mehreren Ebenen immer, auf Wachs nur, wenn eine Ebene über der untersten weiche Kanten hat und keine Füllung einläuft,
  wird gesammelt (`sammeln`): alle Ebenen in ein eigenes Bild (Bildschirmwerte, oben deckt unten), dann der Körper selbst mit
  diesem Bild über den Grund (helles Solid: multipliziert, Tiefe gleich der zuvor geschriebenen; Wachs: mit Hell, Dunkel und
  Glanz, die Deckung am Umriss aus einem zweiten Bild). Die Felder der glatten Anzeige teilen alle Ebenen (`gemeinsam`).
- **Bedienung:** `farbe/ebenenStapel.ts` (das Element `#ebenen`; `EbenenZiele`), Stile in `ozzy.css`; in `main.ts`
  `ebenenStapel`, `ebeneWaehlen`, `ebeneZeigen`, `ebeneNeu`, `ebeneOrdnen`, `ebeneLoeschen`, `ebenenGeaendert`. Haken für Proben:
  `farbEbenen()` (Ebenen von oben nach unten, was die Anzeige zuletzt tat, wie viele Ebenen neu gerechnet wurden),
  `farbEbene(was, id, wert)`, `farbSammeln(an)` (für Messungen: auf Wachs nie sammeln). `farbe().ebenen` zählt von unten.
- Film: `scripts/ozzy/paint-ebenen-film.mjs`; Standbilder: `scripts/ozzy/paint-ebenen-blick.mjs`; beide bauen die Szene mit
  `scripts/ozzy/paint-ebenen-szene.mjs` (ein kleines Fenster, 760 × 560: Leiste, Form und Stapel stehen zusammen im Bild).

