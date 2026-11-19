# Ozzy: Paint-Modus mit Ebenen, Ebenen-Ansicht und neuem Material (Plan, 19.11.2026)

**Stand:** Plan zur Freigabe. Gebaut ist bisher nur das neue Material (Abschnitt 2). Der Paint-Modus selbst beginnt nach deinem
Wort. Zweig `claude/reverent-feynman-1efdd3` (baut auf dem Stand „Objekte, Spiegel und Nähte“ auf, nicht zusammengeführt),
eigenes Fenster `http://localhost:5215/ozzy.html` (Eintrag `ozzy-paint`). Übergabe des Strangs:
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
- **Dein Urteil steht aus:** ob es ZBrush trifft, und welcher Farbton.

## 3. Etappen

Jede Etappe endet mit einem Bild oder Film und der Frage nach deinem Urteil. Sichern, Laden und ⌘Z gehen in jeder Etappe mit. Jede
Geste wird von Anfang an auch für iPad und Stift gebaut (dort gibt es kein ⌥).

| Etappe | Was du siehst und anfasst | Probe und Kriterium |
| --- | --- | --- |
| **0** Material „Wachs“ | das neue Material | gebaut; Vergleichsbild liegt vor |
| **1** Der Beweis: eine Farblinie, eine Füllung | Paint-Modus einschalten; mit P eine geschlossene Farblinie auf die Form zeichnen; ein Klick füllt sie; zurück zur Form, umformen: Die Bemalung geht mit | siehe 3.1 |
| **2** Farblinien bedienen wie Linien | A, P, Freihand, Formen, Lasso, Löschen an Farblinien; offene Farblinien, Kreuzungen, Anschluss an die Mitte | du zeichnest Bauch, Schnauze, Augenrand an einer deiner Formen; jede Geste geht mit einzelnen Klicks |
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

**Was unbewiesen ist:** wie weit eine Farblinie über viele Netzwechsel hinweg wandert, und ob das Aufräumen im Hintergrund (dabei
setzt sich die Haut) sie sichtbar verschiebt. Das misst Etappe 1 (Kriterium 2). Ausweg, falls es nicht reicht: Das Werk reicht bei
jedem Netzwechsel die Zuordnung „alter Punkt → neuer Punkt“ heraus (der Kern kennt sie). Das wäre ein kleiner Zusatz im Werk, kein
Eingriff in die Rechnung; ich frage dich, bevor ich ihn baue.

### 5.2 Scharfe Kanten, bei jedem Zoom, unabhängig vom Netz

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

1. **Gibst du den Plan frei?** Dann beginne ich mit Etappe 1 (dem Beweis).
2. **Stimmt meine Lesart von „gewohnte Tools“?** Ich baue im Paint-Modus deine Werkzeuge aus Ozzy (A, P, Freihand, Ellipse, Lasso,
   K), keinen freien Pinsel. Sagst du nichts dazu, baue ich es so.

Kein Aufhalten, aber dein Urteil steht aus: das Material „Wachs“ (trifft es ZBrush, welcher Farbton).

## 7. Bauweise (für die Sitzung, die baut)

**Grundsätze:** eigener Code unter `apps/editor/src/ozzy/farbe/`, in `main.ts` nur schmale Nahtstellen (der Zweig wird erst am
Schluss zusammengeführt, `main.ts` ändern alle). Am Rechenkern (`packages/shape`), am Verbund, am Sitz der Loops und am Aufblasen
nichts ohne Florians Wort. Keine Messreihen im Hintergrund; je Etappe eine Probe `scripts/pruefen/ozzy-farbe-*-fenster.mjs`.

**Modell** (je Objekt, je Ebene):

- *Ort auf der Haut:* drei Punktnummern des Rechennetzes und drei Gewichte (nicht die Nummer des Dreiecks: Die ändert sich beim
  Verdichten, Punktnummern überleben über `alt`).
- *Farblinie:* Punkte mit Ort, zwei Richtungen im Maß ihres Dreiecks (Anteile zweier Kanten: so gehen sie mit, wenn sich das
  Dreieck dehnt oder dreht), Knick, Breite; offen oder geschlossen; an Kreuzungen geteilte Punkte; Enden auf der Mitte.
- *Füllung:* eine Saat (Ort tief in der Fläche) und eine Farbe. Die Farbfläche wird von der Saat aus bis an die Farblinien
  gefüllt und nach jeder Änderung neu (das Muster von `werkFelder.ts`: Feld = Saat, nach jedem Netzwechsel neu gefüllt).

**Mitgehen:** Zwischen Netzwechseln ist die Lage eines Orts die gewichtete Lage seiner drei Punkte, auf der glatten Anzeige die
entsprechende Stelle im unterteilten Dreieck (`GlattPlan`: jedes Dreieck wird je Stufe in vier geteilt, Reihenfolge `triFein`; der
Weg vom groben Dreieck zum feinen ist reine Rechnung). Ein Netzwechsel wird daran erkannt, dass `werk.haut` ein anderes Objekt ist
(wie `werkFelder`); die alte Haut hält ihre letzten Lagen. Übergabe: Orte, deren drei Punkte noch ein Dreieck bilden, bleiben; die
übrigen gehen an den nächsten Ort der neuen Haut (`dreieckSuche` in `werkHaut.ts` tut das für die Muster; herausführen). Zuerst
ohne Eingriff ins Werk; der Ausweg mit `alt` steht in 5.1. ⌘Z: je Schritt des Werks der Stand der Bemalung daneben, wie `marken`
für den Spiegel. „Luft ablassen“ behält die Form des Werks (`werkFormAnlegen` legt nur neu an, wenn sich das Blatt geändert hat).

**Schneiden:** Die Farblinie wird auf der Haut abgetastet (Bézier zwischen den Orten, Zwischenpunkte auf die Anzeige gelegt), so
fein, wie der Zoom es verlangt. Je feinem Dreieck der Anzeige, durch das sie läuft: die Stücke eintragen und das Dreieck neu
aufteilen (Punkte auf Kanten in beiden Nachbarn, Punkte im Inneren, Ecken der Farblinie genau; nahe an einer Ecke oder Kante
einrasten, damit keine Splitter entstehen). Jeder Schnittpunkt ist eine gewichtete Lage aus drei Punkten der Anzeige und geht je
Bild mit. Neu geschnitten wird, wenn sich das Netz der Anzeige ändert (Netzwechsel, andere Stufe), eine Farblinie sich ändert
oder der Zoom sich verdoppelt. Grobe Dreiecke, die keine Farblinie berührt, gehören ganz zu einer Farbfläche: gefüllt wird zuerst
im Groben, fein nur an den Farblinien.

**Zeichnen:** ein eigener Durchgang mit der Kamera des Raums. Das Innere einer Farbfläche ist eine Dreiecksliste auf den Punkten
der Anzeige (wie `Koerper.toenung`); die geschnittenen Dreiecke und die Dreiecke im Verlauf liegen in einem eigenen kleinen
Puffer mit Werten je Ecke (eigene Farbe, Farbe gegenüber, Abstand zur Farblinie, Breite). Verdecktes über die Tiefe der Haut.
Ebenen nacheinander, obere über untere. Auf Wachs im Renderer der Haut (`material.ts`), auf hellem Solid im Renderer des Gasts
(`gast.ts`, nach seinem Bild, multipliziert): Die Dinge von three lassen sich in beiden Zeichenflächen zeichnen. Eingerastet und in
den Feldern über `feldAbbildung`. Das Ziel der festen Materialien hält seit dem 19.11. 16 Bit je Kanal (wichtig für Verläufe).

**Bedienung:** Die Linien-Studie hängt ihre Bedienung über die Schnittstelle `Raum` an ein Modell (`src/linien/verhalten.ts`);
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
