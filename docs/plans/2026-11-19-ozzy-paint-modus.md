# Ozzy: Paint-Modus mit Ebenen, Ebenen-Ansicht und neuem Material (Plan, 19.11.2026)

**Stand (19.11., 15:15 Uhr): Etappe 2 ist gebaut, dein Urteil steht aus.** Farblinien bedienen wie Linien: P direkt auf der
Form, Punkte und Richtungen mit A, offen und gekreuzt, die Mitte. Was gebaut und gemessen ist und was fehlt, steht in Abschnitt 11
(Bildblatt: [`2026-11-19-paint-etappe-2-bogen.jpg`](../progress/ozzy/2026-11-19-paint-etappe-2-bogen.jpg), Film an deiner Form
„strange bird“: [`2026-11-19-paint-etappe-2.mp4`](../progress/ozzy/2026-11-19-paint-etappe-2.mp4)). Davor: Etappe 1 (Abschnitt 9,
dein Wort dazu: „Etappe 2 starten“), das Material „Wachs“ (Abschnitt 2) und der Schalter „Dreiecke zeigen“. Etappe 3 bis 7 warten
auf dein Wort. Zweig `claude/reverent-feynman-1efdd3` (baut auf dem Stand „Objekte, Spiegel und Nähte“ auf, nicht
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
| **2** Farblinien bedienen wie Linien | A, P, Freihand, Formen, Lasso, Löschen an Farblinien; offene Farblinien, Kreuzungen, Anschluss an die Mitte | **gebaut (19.11.)**; Schritte in Abschnitt 10, Messwerte und Lücken in Abschnitt 11; Film an „strange bird“; dein Urteil steht aus |
| **3** Füllen mit dem Farbtropfen | Farbe wählen, in eine Farbfläche tippen: Die Farbe läuft als Tropfen über die Haut bis an die Farblinien | zuerst ein Film der Animation für dein Urteil, dann gebaut |
| **4** Weichheit an Linien und Punkten | K hart oder weich, Tropfen an der Farblinie für die Breite, `[` `]` | zuerst ein Bild der Bedienung (zwei Fassungen zur Wahl), dann gebaut |
| **5** Ebenen | Ebene anlegen, ordnen, aus- und einblenden; Muster über Verläufen | ein Verlauf auf Ebene 1, Punkte auf Ebene 2, an deiner Form |
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
