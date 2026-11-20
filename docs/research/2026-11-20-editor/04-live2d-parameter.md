# Live2D, Inochi2D und parameterbasierte Animation

Recherche für den Figureneditor (Arbeitstitel „Studio“), Bericht 04 · Stand 20.11.2026

**Fragen:** Wie arbeiten Live2D Cubism und Inochi2D mit Reglern (Parametern), Schlüsselformen, Verformern, Zusatzformen (Blend
Shapes), Physik, Ausdrücken und Abläufen? Wann ist ein Reglerraum besser als eine Zeitleiste? Wie kombinieren gute Rigs mehrere
Regler (Kopfdrehung X und Y, Maul auf und zu), ohne dass die Zahl der Schlüsselformen explodiert? Was folgt daraus für unsere Posen,
Morphs und die Kopfdrehung über 360° mit Schlüsselformen je Winkel?

**Grundlage:** Handbücher und Quelltexte von Live2D (Editor bis 5.3, SDK 5), Quelltext und Projektseiten von Inochi2D (0.8.7 und
der Umbau zu 0.9) und seinem Ableger nijilive, Dokumentation von Spine 4.2/4.3, Rive und Cartoon Animator, das Paper „Pose Space
Deformation“ (2000), Stimmen aus dem Live2D-Forum, dazu unser Prototyp unter `apps/editor/src/ozzy-figur/`. Was nicht belegt
werden konnte, steht in Abschnitt 11.

---

## Auf einen Blick

1. **Live2D baut alles auf Reglern auf.** Jede Bewegung ist ein benannter Zahlenwert mit Bereich (Winkel X von −30 bis 30, Maul
   von 0 bis 1). Formen bekommen an bestimmten Reglerwerten Schlüsselformen; dazwischen wird gerechnet. Abläufe, Ausdrücke, Physik,
   Blick, Atmen und Lippen schreiben nur in diese Regler. Das ist die eigentliche Erfindung, nicht die Verformer.
2. **Mehrere Regler an einer Form bilden ein volles Raster** (bei k Schlüsseln je Regler und n Reglern k hoch n Schlüsselformen).
   Live2D empfiehlt zwei Regler je Objekt, drei nur im Notfall, nie mehr als vier. Die Explosion wird durch **Schachtelung**
   vermieden (jede Ebene trägt nur ihre Regler: 3 + 3 + 9 = 15 statt 3 × 3 × 9 = 81 Formen für eine Augenbraue) und seit 4.2 durch
   **Zusatzformen** (Differenzen, die addiert werden).
3. **Zwischen Schlüsselformen rechnet Live2D linear.** Drehungen schrumpfen deshalb in der Mitte, und an jedem Schlüssel springt die
   Geschwindigkeit. Abhilfe sind Drehverformer und die „erweiterte Interpolation“, die einen Bogen aus bis zu 20 Zwischenschlüsseln
   nachbaut. Unser Raster mischt schon heute glatter (PCHIP je Anker, Griffe nach Winkel und Länge). Darin sind wir weiter.
4. **Die Physik von Live2D ist bewusst klein:** Pendelketten mit starren Gliedern, Eingänge und Ausgänge sind Regler, vier
   Stellwerte je Glied, Voreinstellungen, feste Rechenrate mit Zwischenwerten. Für Ohren, Bart und Schwanz von Ozzy ist das genau die
   richtige Größe, ergänzt um Eingänge aus der Spielwelt (Beschleunigung, Richtung der Schwerkraft auf dem Rad).
5. **Die neuen Live2D-Hilfen zeigen die Richtung:** Anfasser direkt an der Figur, die mehrere Regler auf einmal stellen, mit „Ziel
   folgen“ für Füße am Boden (5.2); Kreisregler („Repeat“); Vier-Ecken-Automatik; 3D-Drehung mit Tiefenschätzung, KI-Verformer und
   KI-Schwingen (5.1); gespiegeltes Einfügen (5.2).
6. **Inochi2D** (offen, BSD-2) übernimmt das Prinzip und macht drei Dinge klüger: Achsenpunkte frei setzbar, **fehlende Schlüssel
   werden selbst gefüllt**, die Interpolation ist je Bindung wählbar (auch kubisch), und die Versätze mehrerer Regler an einer Fläche
   werden **addiert** statt als Raster multipliziert. Das Projekt steckt aber im Umbau zu 0.9 (Knotengraph aus Quellen und Senken);
   der Ableger nijilive/nijigenerate baut auf 0.8 weiter (AutoRig im Oktober 2026).
7. **Reglerraum schlägt die Zeitleiste** überall, wo Eingaben fortlaufend sind (Gefälle, Tempo, Gleichgewicht, Blickrichtung), wo
   Zustände kombiniert werden und wo Physik und Spiel mitreden. Die Zeitleiste bleibt besser für gespielte Handlungen mit Timing
   (Stolpern, Hinfallen, Sprung). Die Lösung ist kein Entweder-oder: **Regler als gemeinsamer Unterbau, Zeit als ein Regler unter
   anderen.** Spine (Slider in 4.3) und Rive (Blend States, Joysticks) sind genau dorthin gewandert.
8. **Kopfdrehung über 360°:** θ wird ein **Kreisregler** mit periodischer, glatter Mischung. Heute wird der Übergang bei 0°/360°
   einseitig gerechnet; eine Probe zeigt dort Anker, die mit Tempo umkehren (siehe 7.3). Spiegelregel, Faltschlüssel und verborgene
   Wechsel (Sichtbarkeit, Reihenfolge) werden sichtbare Eigenschaften und Schlüsselarten. Nicken und Maul kommen als **Zusätze im
   mitlaufenden Rahmen** dazu, mit wenigen Korrekturschlüsseln statt eines vollen Rasters.
9. **Posen sind Reglerstände, ein Übergang ist ein Weg durch den Reglerraum.** Standard: weiches Überblenden mit Staffelung; für
   jedes Paar kann Florian einen eigenen Übergang formen (Übergangsmatrix). Das deckt den Wunsch „von jeder Pose in jede andere“.
10. **Für das Ozzy-Spiel** ist der Gang ein Kreisregler „Schritt“, den das Spiel nach dem zurückgelegten Weg auf dem Rad vorschiebt
    (keine rutschenden Pfoten), dazu Regler für Tempo, Gefälle und Gleichgewicht. Stolpern und Hinfallen sind Abläufe, die das Spiel
    auslöst; die Physik legt Ohren und Schwanz darüber.

---

## 1 Begriffe

| Live2D / Inochi2D | in diesem Bericht | im Prototyp |
|---|---|---|
| Parameter | **Regler** | θ (Kopf), ψ (Körper), Gewichte der Haltungen |
| Key (Schlüssel auf einem Parameter) | **Schlüssel** | `Schluessel.w` |
| Keyform | **Schlüsselform** | `Schluessel.form` |
| Kombination mehrerer Parameter | **Raster** | (keins) |
| Warp Deformer | **Biegegitter** | (keins) |
| Rotation Deformer | **Drehverformer** | (Knochen fehlen noch) |
| Blend Shape | **Zusatzform** | (keine) |
| Binding (Inochi2D) | **Bindung** | (keine) |
| Motion | **Ablauf** | `Ablauf` in `ablauf.ts` |
| Expression | **Ausdruck** (Stimmung) | (keiner) |
| Physics group, Pendulum | **Pendel** | Federn in der Steuerung |
| Pose (`pose3.json`) | **Teilewechsel** | Bart und Ohrspalt wechseln bei 180° verborgen die Seite |
| Parameter Controller | **Anfasser** | (keiner) |
| Repeat | **Kreisregler** | θ von 0° bis 360° |

---

## 2 Live2D Cubism

### 2.1 Einordnung

- Live2D Cubism ist der Standard für bewegte 2D-Figuren aus gemalten Ebenen (VTuber, Spiele-Porträts, Videos). Aus einer PSD werden
  texturierte Dreiecksnetze (ArtMeshes); Verformer bewegen sie; Regler steuern alles; Physik, Ausdrücke und Abläufe kommen dazu. Zur
  Laufzeit spielt das Cubism SDK die Modelle ab (Web, nativ, Unity, Unreal).
- Der Editor läuft auf Windows und macOS (Apple Silicon und Intel), ausdrücklich **nicht auf Tablets oder Telefonen**. Die
  PRO-Fassung kostet laut Presse ab 2 280 Yen im Monat; die freie Fassung ist eingeschränkt. Für Veröffentlichungen braucht ein
  Unternehmen eine SDK-Lizenz; Einzelpersonen und kleine Firmen sind ausgenommen (außer bei erweiterbaren Anwendungen).
- Versionen, soweit belegt: **4.0** brachte laut SDK-Übersicht die erweiterte Interpolation (die Tabelle dort nennt sie teils schon
  für 3.x), ArtPath (Vektorlinien) und die Formanimation, die beiden letzten ohne SDK-Unterstützung. **4.2** brachte Zusatzformen, Multiplizieren- und Bildschirmfarbe sowie die Rechenrate der Physik
  in der Datei. **5.0** baute die Zusatzformen aus (mehr Parameter, erweiterte Interpolation mit Zusatzformen). **5.1** (30.07.2024)
  brachte Vorlagen je Teil, die Anbindung externer Programme, die 3D-Drehung, KI-Verformer und KI-Schwingen. **5.2** (Februar 2025)
  brachte den Parameter-Controller, das gespiegelte Einfügen von Formen, die Loop-Bearbeitung und das Zurücksetzen von Verformern.
  **5.3** (20.01.2026) brachte Mischmodi (15 Farb- und 5 Alpha-Mischungen), das Offscreen-Zeichnen ganzer Teile und neue Pinsel.
  **5.4** lief von Juli bis Oktober 2026 als Alpha; die Ankündigung nennt keine Inhalte, nur den Parameter-Controller im Zusammenhang
  mit dem SDK.

### 2.2 Regler

- Ein Regler hat Name, ID, Minimum, Standardwert, Maximum, eine Beschreibung, die Schalter „Wiederholen“ (Repeat) und
  „Zusatzform“ und gehört zu einer Gruppe.
- Live2D empfiehlt eine **Standardliste** mit festen IDs und Bereichen: Winkel X, Y und Z des Kopfs von −30 bis 30 (für weitere
  Drehung −45 bis 45), Körperdrehung von −10 bis 10, Augen offen von 0 bis 1 (Standard 1), Maul offen von 0 bis 1, Mundform von −1
  bis 1, Atmen von 0 bis 1, Haarschwingen vorn, seitlich und hinten von −1 bis 1 (meist von der Physik gesetzt). Der Zweck: Abläufe
  lassen sich zwischen Modellen tauschen, weil alle dieselben Regler haben.
- **Repeat (Kreisregler):** verbindet die beiden Enden eines Reglers zu einer Schleife. Für eine volle Umdrehung eines
  Drehverformers braucht es auch am rechten Ende einen Schlüssel mit dem Startwinkel plus 360°, sonst dreht er rückwärts. Nicht
  erlaubt für Blinzeln und Lippen. Zur Laufzeit erst ab dem Cubism 5 SDK R4; das SDK hat Schalter je Modell und je Regler.

### 2.3 Schlüsselformen, Raster und Interpolation

- Ein Objekt (ArtMesh oder Verformer) bekommt an einem Regler Schlüssel (meist zwei oder drei: „2 Keyforms hinzufügen“, „3 Keyforms
  hinzufügen“). An jedem Schlüssel speichert es eine **Schlüsselform**.
- **Mehrere Regler an einem Objekt bilden ein volles Raster.** Das Handbuch zeigt es am Augapfel: Augapfel X und Y mit je drei
  Schlüsseln ergeben 3 × 3 = 9 Schlüsselformen. Kommt Y dazu, sind die obere und untere Reihe zuerst Kopien der vorhandenen Spalten;
  die Ecken stellt man von Hand oder mit der Vier-Ecken-Automatik ein. Eine Kette am Regler zeigt beide als Feld mit neun Punkten
  (nur die Anzeige ändert sich).
- **Grenzen:** zwei Regler je Objekt, drei nur wenn unbedingt nötig, nicht mehr als vier, weil die Rechenlast steigt. Ein
  Prüfwerkzeug färbt Objekte mit drei Reglern gelb und mit vier oder mehr rot bzw. rosa.
- **Interpolation:** Das Handbuch sagt knapp: „Normally, the interpolation between the keyforms of the parameters is linear.“ Bei zwei
  Reglern ist das bilinear im Raster. Folgen: Ein Punkt, der sich drehen soll, läuft auf der Sehne und die Form schrumpft in der
  Mitte; und wenn ein Regler gleichmäßig über einen Schlüssel läuft, ändert sich die Geschwindigkeit dort sprunghaft. Live2D
  verdeckt das im Ablauf mit weichen Zeitkurven (der Animator glättet zwischen Keyframes von selbst) und mit mehr Schlüsseln.

### 2.4 Verformer und Schachtelung

- **Biegegitter (Warp Deformer):** bearbeitet wird ein Bézier-Gitter mit 2 × 2 oder 3 × 3 Feldern (Punkte mit Griffen), gerechnet
  wird über ein feineres Umrechnungsgitter (empfohlen 5 × 5; mehr kostet Rechenzeit). Alle Kinder verformen sich mit. Ist das
  Umrechnungsgitter ein ganzzahliges Vielfaches (mindestens 2) des Bézier-Gitters, lässt sich die Ausgangsform fast verlustfrei
  wiederherstellen. Seit 5.3 sind die Griffe glatter. Es gibt drei Bearbeitungsstufen (nur Gitterpunkte, Punkte mit Griffen, nur der
  Rahmen).
- **Drehverformer:** dreht seine Kinder um einen Punkt, mit Größe und Deckkraft. Das Handbuch rät für jede größere Drehung dazu,
  weil die lineare Interpolation ein gedrehtes Netz oder Gitter schrumpfen lässt.
- **Schachtelung:** Kinder werden im Raum ihres Eltern-Verformers beschrieben und folgen ihm. So trägt jede Ebene nur ihre eigenen
  Regler. Das Beispiel im Handbuch, eine Augenbraue: Form (3 Schlüssel) am Netz selbst, Winkel (3) an einem Biegegitter darüber,
  Lage X und Y (9) an einem weiteren Biegegitter. Zusammen **15 statt 81** Schlüsselformen. Das ist das wichtigste Mittel gegen die
  Explosion.
- **Glue:** klebt die überlappenden Punkte zweier Netze aneinander; ein Gewicht je Punkt bestimmt, welches Netz stärker zieht.
  Nutzer wünschen sich Zahleneingabe und Schlüssel für dieses Gewicht.
- **Skinning:** Man zeichnet einen Pfad über ein langes Netz (Haar, Band); Live2D legt eine Kette von Drehverformern an, zerteilt das
  Netz an den Gelenken und klebt die Stücke mit Glue zusammen; je Glied entsteht ein Regler (±30° oder ±45°). Gewichtsmalen gibt es
  nicht; das Handbuch nennt freies Skinning eine spätere Funktion.

### 2.5 Erweiterte Interpolation

- Wählbar je Objekt: **Ellipse** (Bahn mit Größe und Punktzahl einstellbar) oder **SNS** (nur die Punktzahl). Mindestens drei
  Schlüssel.
- Live2D rechnet beim Bearbeiten Zwischenschlüssel auf der Bahn aus; **zur Laufzeit wird zwischen ihnen wieder linear gemischt.**
  Höchstens 20 Punkte, Abstand mindestens 0,03; bei zwei Reglern besser unter 10 Punkte, denn die erzeugten Schlüsselformen
  multiplizieren sich (größere Datei, längeres Laden).
- **Lehre:** Live2D erkauft Glätte mit mehr Schlüsseln statt mit einer besseren Kurve.

### 2.6 Zusatzformen (Blend Shapes)

- Seit 4.2, in 5 erweitert. Ein Zusatzform-Regler läuft meist von 0 bis 1, sein Grundschlüssel liegt bei 0. Gespeichert wird **die
  Differenz** zur Grundform; die Wirkung ist Gewicht (nach Abstand vom Grundschlüssel, 0 bis 100 %) mal Differenz, addiert auf das
  Ergebnis der normalen Regler. Wirkt auf ArtMeshes, Biegegitter, Drehverformer, Teile, ArtPaths und Glue.
- **Vorteil:** keine Vervielfachung. Jeder Zusatz kostet genau seine eigenen Schlüssel, egal wie viele Regler das Objekt schon hat.
- **Grenzen:** Zusatzformen lassen sich nicht im Raster-Dialog bearbeiten. Die Grundform darf man danach nicht mehr ändern (sonst
  ändern sich alle Zusätze mit); das Handbuch rät, alle Standardwerte zu verschlüsseln und die Grundformen zu sperren. Mehrere Zusätze,
  die dieselbe Eigenschaft ändern, heben sich auf oder verzerren die Form (Beispiel: Achteck und Dreieck gleichzeitig auf ein
  Quadrat). Summen werden auf die Bereiche geklemmt (Deckkraft 0 bis 100 %, Winkel ±3600° und so weiter).
- **Gewichtsgrenzen** gegen Konflikte: Ein Graph über einem anderen Regler senkt das Gewicht eines Zusatzes (bis zu fünf
  Stützpunkte; bei mehreren Grenzen gilt die kleinste; eine Rangfolge regelt Zusätze am selben Regler). Beispiel: Die Mundformen „a,
  e, i, o, u“ brechen, wenn andere Regler gleichzeitig wirken.

### 2.7 Was eine Schlüsselform alles trägt

- Punkte (ArtMesh), Gitterpunkte (Biegegitter), Winkel, Größe und Lage (Drehverformer), Deckkraft, **Zeichenreihenfolge** (0 bis
  1000, am Regler einstellbar; für ganze Teile rät das Handbuch zu Reihenfolge-Gruppen), Multiplizieren- und Bildschirmfarbe,
  Strichbreite (ArtPath), Glue-Stärke. Seit 5.3 kommen Mischmodi und Offscreen-Teile dazu.
- **ArtPath** sind Vektorlinien (Strichbreite je Punkt, bleibt beim Skalieren erhalten), aber nur mit der Zielversion „SDK (N/A) /
  neuestes Cubism“, also für Videos aus dem Editor, nicht zur Laufzeit. Auch die **Formanimation** (seit 4.0) unterstützt das SDK
  nicht. Füllflächen als Vektoren gibt es nicht; Live2D bleibt eine Technik für gemalte Texturen.
- **Teilewechsel** (`pose3.json`): Gruppen ähnlicher Teile (Arm A, Arm B), von denen immer nur eines sichtbar ist, mit
  Überblendzeit. Gesteuert über Regler mit der ID des Teils; Stufenkurven werden empfohlen. Der Teilewechsel läuft als letzter
  Schritt nach den Abläufen.

### 2.8 Physik

**Aufbau im Editor:** Physikgruppen mit Eingängen, Ausgängen und einem Pendel.

- **Eingänge** sind Regler (Voreinstellungen: Winkel X und Z des Kopfs, Körperdrehung X und Z; frei wählbar, etwa Körper Y, damit das
  Haar beim Sprung hochfliegt), je als Verschiebung (X oder Y) oder als Winkel, mit Einfluss in Prozent und einem Umkehrschalter.
- **Ausgänge** sind wieder Regler. Jeder liest ein Glied der Kette (Nummer des Pendels) und hat einen **Ausschlagfaktor**; der Editor
  zeigt, wie weit der Zielregler ausgenutzt wird, und stellt den Faktor auf Knopfdruck so ein, dass 100 % erreicht werden. Wird ein
  Regler von mehreren Gruppen getrieben, darf die Summe der Einflüsse 100 % nicht übersteigen (sonst ruckelt es).
- **Pendel:** Voreinstellungen für Haare mit 2, 3, 10 oder 20 Gliedern. Stellwerte im Editor: Dauer (kleiner schwingt schneller),
  Schwingfreude (Faustregel 0,7 bis 0,99), Reaktion (1 neutral, darüber flinker) und Beruhigung (1 neutral, darüber schneller still).
  In der Datei heißen die Werte je Glied Radius, Mobility, Delay und Acceleration; die Zuordnung zu den Namen im Editor schließe ich
  aus Wertebereichen und Quelltext, belegt ist sie nicht.

**Mechanik (aus dem Quelltext des Web-Rahmenwerks):**

- Die Wurzel der Kette sitzt fest, jedes weitere Glied hängt in fester Länge (Radius) am Vorgänger.
- Eingänge werden aus dem Reglerbereich in einen normierten Bereich übertragen (Lage und Winkel, je mit Minimum, Standard und
  Maximum) und gewichtet summiert. Verschiebungs-Eingänge bewegen die Wurzel, Winkel-Eingänge drehen die Richtung der Schwerkraft
  gegenüber der Kette.
- Je Schritt wirkt auf jedes Glied die Schwerkraftrichtung mal Acceleration plus Wind. Das Glied wird um Geschwindigkeit mal
  Zeitfaktor und Kraft mal Zeitfaktor zum Quadrat verschoben (Zeitfaktor = Delay × Schrittzeit × 30) und danach auf die feste Länge
  zurückgesetzt. Die neue Geschwindigkeit ist die Verschiebung durch den Zeitfaktor mal Mobility (Anteil, der erhalten bleibt). Ein
  kleiner Totbereich unterdrückt Zittern.
- Ausgabe je Glied: die X- oder Y-Komponente der Strecke vom Vorgänger oder ihr Winkel gegen die Richtung des Vorgängers, mal
  Ausschlagfaktor, geklemmt auf den Zielregler, nach Gewicht mit dessen bisherigem Wert gemischt.
- **Feste Rechenrate (seit 4.2):** Die Rate steht in der Physikdatei. Das Rahmenwerk sammelt Zeit, rechnet in festen Schritten
  (höchstens 5 s Rückstand), verteilt die Eingänge über die Schritte und zeigt einen Zwischenwert zwischen den letzten beiden
  Schritten. So sieht die Physik bei 30, 60 oder 120 Bildern je Sekunde gleich aus.
- Schwerkraft (Standard nach unten) und Wind kommen zur Laufzeit über Optionen und lassen sich jederzeit ändern.

**Bewertung:** klein, verständlich, für Nicht-Programmierer gut bedienbar; Voreinstellungen und „Ausschlag auf 100 %“ sind gute
Ideen. Schwächen: Die Physik kennt nur Regler, nicht die Welt (Weltbewegung muss das Programm in Regler oder in die Schwerkraft
übersetzen); keine Kollision; Einstellen ist Probieren. Im Forum wünschen sich Nutzer, Pendelwerte gesammelt bearbeiten zu können.

### 2.9 Abläufe, Ausdrücke und die Reihenfolge der Schichten

- **Ablauf (`motion3.json`):** Kurven je Regler (und je Deckkraft eines Teils), Abschnitte linear, Bézier, Stufe oder umgekehrte
  Stufe, Schleife, Ereignisse (Zeit und Text) für das Programm. Die Datei vermerkt, ob die Bézier-Griffe in der Zeitrichtung
  beschränkt sind; beschränkt liegen die Zeitwerte der beiden inneren Punkte bei einem und zwei Dritteln der Strecke (so beschreibt es
  die Spezifikation). Dann läuft die Zeit in der Kurve linear, und der Wert lässt sich ohne Gleichungslösen ausrechnen (schnell und
  robust).
- **Ein- und Ausblenden:** Fade-Zeiten je Kurve, je Modell oder je Ablauf (Standard 1 s). Startet ein neuer Ablauf, blendet der alte
  aus. Laufen zwei Ablauf-Manager auf demselben Regler, gewinnt der zuletzt gerechnete; für unabhängige Körperteile empfiehlt das
  Handbuch getrennte Manager. Prioritäten werden nur vermerkt, durchsetzen muss sie das Programm.
- **Ausdruck (`exp3.json`):** ein Satz Reglerwerte mit Mischregel je Regler: **Addieren** (Standard), **Multiplizieren** oder
  **Überschreiben**, mit Ein- und Ausblenden. Multiplizieren erhält das Blinzeln, Überschreiben schaltet es ab.
- **Automatische Schichten:** Blinzeln (Zustände offen, schließen, zu, öffnen; Standardzeiten 0,1 s, 0,05 s und 0,15 s; der
  nächste Lidschlag kommt bei einem Standardabstand von 4 s zufällig nach 0 bis 7 s; **setzt** den Wert), Atmen (Sinus mit Versatz,
  Spitze, Periode und Gewicht; wird **addiert**), Blick (Ziehen), Lippen nach Lautstärke, Motion-Sync (Laute aus Audio, anfangs nur
  Unity).
- **Reihenfolge je Bild** (Beispielprogramm): gesicherte Reglerwerte laden, Ablauf rechnen, Werte sichern, dann eine Liste von
  Zusatzschichten (Ausdruck, Physik, Teilewechsel, Blinzeln, Atmen, Lippen, Blick; die genaue Reihenfolge legt eine Sortierung fest),
  am Ende das Modell. **Wichtig ist das Sichern:** Jedes Bild beginnt beim Stand nach dem Ablauf, die Zusätze werden jedes Mal neu
  daraufgelegt und summieren sich nicht über die Bilder auf. Rive kennt dasselbe als „Capture Base State“.

### 2.10 Automatische Hilfen

| Hilfe | seit | was sie tut | Lehre für uns |
|---|---|---|---|
| Vier-Ecken-Automatik | lange, 4.2 verbessert | erzeugt die vier Diagonalen eines X-Y-Rasters aus links, rechts, oben, unten; Bezug Mitte oder Standardwert; überschreibt Handarbeit | Ecken füllen, Handarbeit schützen |
| Gesichtsbewegung automatisch | 5 | legt Gesichts-Biegegitter an und erzeugt Winkel X/Y und Ecken; Stärke von Verschiebung und Verformung im Dialog | Vorschläge mit zwei Reglern statt vieler Werte |
| 3D-Drehung anwenden | 5.1 | Objekt flach in den Raum legen, drehen (Kamera, Drehpunkt, Perspektive, Winkelbereich), Tiefe aus einer nicht frontalen Schlüsselform schätzen, Schlüsselformen erzeugen | Bogen-Hilfe für Zwischenschlüssel (7.3) |
| KI-Verformer | 5.1 | Verformerbaum für eine ganze menschliche Figur aus der PSD | Autorig als Vorschlag |
| KI-Schwingen | 5.1 | Schlüsselformen an einem Biegegitter für Haar-Schwingen oder Hängen nach Winkel Z; Ausschlag aus Lage und Größe geschätzt, Weichheit, Drehpunkt oben/unten/links/rechts | Pendel aus einem Teil anlegen |
| Vorlagen je Teil | 5.1 | fertige Bewegungen auf einzelne Teile übertragen | Bewegungsbausteine |
| Gespiegeltes Einfügen | 5.2 | fertige Form rechts kopieren, links gespiegelt einfügen | unsere Spiegelregel |
| Loop-Bearbeitung | 5.2 | Schlüssel vor und nach der Szene verknüpft verdoppeln, damit Schleifen nahtlos sind | Kreisregler in der Zeit |
| Parameter-Controller | 5.2 | Punkt oder Richtung auf einem Netz anfassen; die Regler werden aus der Lage geschätzt; Schlüssel entstehen beim Ziehen; „Ziel folgen“ hält eine Pfote auf einer Wippe; Rechenreihenfolge in Gruppen; Gewicht 0 bis 100 | Anfasser an der Figur (7.9) |
| Biegegitter wächst mit | 5.3 | Ragt ein Kind aus seinem Biegegitter, wird das Gitter vergrößert, das Verhalten bleibt | stille Hilfe ohne Dialog |

### 2.11 Stärken und Schwächen

**Stärken**

- Eine Grammatik für alles: Regler. Abläufe sind übertragbar, Physik und Programm sprechen dieselbe Sprache.
- Schachtelung und Zusatzformen halten große Rigs beherrschbar.
- Kleine, gut einstellbare Physik mit fester Rate.
- Neue Bedienung zum direkten Anfassen (Anfasser, Ziel folgen) und viele Automatiken.
- Großes Umfeld (Laufzeiten, Tracking-Programme, Vorlagen).

**Schwächen**

- **Lineare Interpolation:** Schrumpfen bei Drehung, Geschwindigkeitssprünge an Schlüsseln; Glätte nur über mehr Schlüssel.
- **Raster-Explosion:** harte Empfehlung „höchstens zwei, notfalls drei Regler je Objekt“. Im Forum melden Nutzer die Warnung „zu
  viele Parameter“ und danach Ruckeln bis Absturz bei tief geschachtelten Armen (rund zehn Hand-Verformer); eine Frage nach mehr als
  drei Reglern am Mund blieb ohne Antwort.
- **Konflikte der Zusatzformen** und die Pflicht, die Grundform einzufrieren.
- **Viel Oberfläche:** Paletten, Dialoge, drei Bearbeitungsstufen, Sonderfälle (ArtPath und Formanimation nur im Editor). Im Forum
  geht es um aufklappbare Hinweise, eine klarere Teileanzeige und leichteres Verschieben von Keyframes.
- **Bildwölbung als Grundtechnik:** Der typische Live2D-Look entsteht, indem ein gemaltes Bild mit Biegegittern gewölbt wird. Für
  Ozzy ist das genau das „wie ein Blatt drehen“, das Florian ablehnt.
- Keine Vektorflächen zur Laufzeit, keine Spiellogik, kein Tablet, Lizenz für Firmen.

---

## 3 Inochi2D und der Ableger nijilive

### 3.1 Stand des Projekts

- Inochi2D ist ein offener Standard mit Referenzbibliothek (BSD-2, in D geschrieben), dazu der Editor Inochi Creator (noch Beta) und
  Inochi Session für VTuber. Die letzte Version mit Tag ist **0.8.7**.
- Der Hauptzweig ist ein **Umbau zu 0.9**: Die Parameter liegen in neuen Modulen, Teile davon sind noch Platzhalter (die Mischung
  zwischen Schlüsseln gibt im Hauptzweig noch einen Leerwert zurück). Die letzten Einträge (Oktober bis November 2026) bauen einen
  Knotengraph aus **Quellen und Senken**; ein Regler ist dort eine Senke mit bis zu vier Achsen, die sich nicht von einem anderen
  Regler treiben lassen soll.
- NLnet hat 0.9 von Februar 2024 bis September 2025 gefördert (Portierbarkeit für Godot und Unity, eigenes Bedienpaket, Web über
  WebAssembly, WebGL und WebGPU). Ob alles fertig wurde, sagt die Seite nicht.
- **nijilive** ist eine Bibliothek mit eigenem Puppenformat; ihr Editor **nijigenerate** ist nach eigener Angabe aus der Technik
  von Inochi2D 0.8 abgeleitet. Es gibt nur Nachtbauten; im Oktober 2026 kamen ein **AutoRig**-Feld und einmalige Gitter- und
  Pfadverformungen mit Punktauswahl dazu.

### 3.2 Regler und Bindungen (0.8.7)

- Ein Regler ist **ein- oder zweidimensional**. Seine Achsenpunkte (Schlüssel) liegen **frei** zwischen 0 und 1 und lassen sich
  einfügen, verschieben, löschen und spiegeln; der erste und letzte bleiben.
- Eine **Bindung** verbindet einen Regler mit einer Eigenschaft eines Knotens (Verformung der Punkte oder ein Wert wie Lage oder
  Deckkraft). Sie speichert ein Raster von Werten über allen Achsenpunkten, dazu je Punkt, ob er **gesetzt** ist.
- **Lücken füllen statt Raster ausfüllen:** Nach jeder Änderung füllt die Bindung alle nicht gesetzten Punkte selbst: zuerst durch
  Interpolation längs einer Achse, dann der anderen (wo sich beide treffen, wird gemittelt), dann durch Hochrechnen fehlender Ecken
  aus ihren Nachbarn, zuletzt durch Fortsetzen der nächsten gesetzten Werte nach außen. Der Nutzer setzt also nur die Punkte, die er
  braucht.
- **Interpolation je Bindung:** Nächster Punkt, Linear (bei 2D bilinear) oder **Kubisch** (bei 2D über eine 4 × 4-Nachbarschaft, am
  Rand geklemmt). Standard ist linear.
- **Mehrere Regler an einer Fläche werden addiert:** Jede Verformungsbindung legt ihre Punktversätze auf einen Stapel der Fläche; der
  Stapel wird je Bild auf null gesetzt und summiert alle Versätze ohne eigene Gewichtung. Es gibt also kein Raster über Regler
  hinweg, nur innerhalb eines 2D-Reglers.
- **Eingänge mischen:** Werte, die in einen Regler geschoben werden (Tracking, Physik), haben einen Mischmodus: Erzwingen (setzt),
  Addieren (Summe), Multiplizieren (Mittel der Faktoren), Gewichtet und „Durchreichen“ (nimmt den Modus des Reglers).

### 3.3 Physik

- Ein Physik-Treiber (SimplePhysics) hängt an einem Knoten und liest dessen **Anker in der Welt**: Bewegt sich der Knoten, schwingt das
  Pendel mit. Es gibt das starre Pendel (Winkel und Winkelgeschwindigkeit) und das Federpendel (Lage und Geschwindigkeit in 2D,
  Steifigkeit aus einer Frequenz).
- Stellwerte: Schwerkraft (in Pixeln je Meter umgerechnet), Länge, Frequenz, Winkel- und Längendämpfung, Ausgabefaktor; dazu eine
  Abbildung als Winkel und Länge oder als X und Y und ein Schalter „nur lokal“.
- Gerechnet wird in festen Schritten von 10 ms; das Ergebnis wird mit „Erzwingen“ in den Regler geschrieben.

### 3.4 Live2D und Inochi2D im Vergleich

| | Live2D Cubism | Inochi2D 0.8.7 |
|---|---|---|
| Regler | 1D, mehrere werden zum Raster; Kreisregler (Repeat) | 1D oder 2D, freie Achsenpunkte |
| Mehrere Regler an einer Form | volles Raster (Empfehlung höchstens 2) oder Schachtelung oder Zusatzformen | Versätze werden addiert |
| Fehlende Schlüssel | werden beim Hinzufügen kopiert; Ecken per Automatik | werden ständig selbst gefüllt |
| Interpolation | linear; erweiterte Interpolation mit Zwischenschlüsseln | je Bindung: nächster, linear, kubisch |
| Verformer | Biegegitter, Drehverformer, Glue, Skinning | Netze, Gruppen; im Umbau Gitter- und Netzverformer |
| Physik | Pendelketten auf Reglern, feste Rate aus der Datei | Pendel oder Federpendel am Weltanker, 10-ms-Schritte |
| Mischregeln | Ausdrücke: Addieren, Multiplizieren, Überschreiben | Eingänge: Erzwingen, Addieren, Multiplizieren, Gewichtet |
| Reife | sehr hoch, kommerziell | 0.8 nutzbar, 0.9 im Umbau, Ableger auf 0.8 |
| Plattform | Windows, macOS | Desktop (D, OpenGL); Web geplant |

**Was wir von Inochi2D lernen:** freie Achsenpunkte, selbstständiges Füllen der Lücken, wählbare Interpolation und additive
Versätze sind genau die Bausteine, mit denen ein Raster klein bleibt. Der Knotengraph aus Quellen und Senken in 0.9 ist ein Hinweis,
wie Spiellogik an Regler andockt.

---

## 4 Andere parameterbasierte Ansätze, kurz

- **Spine 4.3, Slider:** Ein Slider bindet ein Skelett an eine Animation und zeigt ein bestimmtes Bild daraus. Das Bild kommt von
  Hand (einschlüsselbar) oder aus einem **Steuerknochen**: Ein Bereich seiner Drehung, Verschiebung, Größe oder Scherung wird auf einen
  Bereich von Bildern abgebildet. Dazu Schleife, additiv oder ersetzend, Mischung in Prozent. Im Beispiel „Look around“ treibt die
  Maus über einen Slider Gesicht und Körper, wechselt Mundbilder und ändert die Zeichenreihenfolge. Damit hat Spine eine Animation zu
  einem Regler gemacht. Slider kamen in der Beta vom April 2025; 4.3 ist inzwischen veröffentlicht. **Spine 4.2** brachte
  Physik-Constraints auf Knochen (Trägheit, Stärke, Dämpfung, Masse, Wind, Schwerkraft, Geschwindigkeitsgrenze, Rechenrate;
  wirken auf Lage, Drehung, Größe und Scherung).
- **Rive:** Zustände spielen eine Zeitleiste oder mischen mehrere: **1D-Blend** (jede Zeitleiste hat einen Wert, an dem sie voll
  gilt; ein Zahlenwert mischt dazwischen) und **additiver Blend** (jede Zeitleiste mit eigener Menge, fest oder aus den Daten).
  **Joysticks** legen je Achse eine Zeitleiste fest und scrubben sie mit einem Griff, für Kopf und Augen zusammen. Übergänge haben
  Dauer, Kurve, Ausstiegszeit und lassen sich unterbrechen.
- **Cartoon Animator, 360-Kopf:** Kopfdrehung über Winkelpunkte: schnell mit 4 Winkeln, genauer mit 9, frei mit bis zu 25. Je Punkt
  werden Lage, Verformung (Gitter von 2 × 2 bis 5 × 5) und Bildwechsel der Teile gesetzt; Einstellungen lassen sich spiegeln,
  Nachbarn als Zwiebelhaut einblenden, zwei Punkte mitteln. Eine volle Drehung braucht waagrechte und senkrechte Winkel.
- **Pose Space Deformation** (Lewis, Cordner, Fong, SIGGRAPH 2000): Formkorrekturen werden an beliebigen Stellen eines Posenraums
  gesetzt (Knochenwinkel oder abstrakte Regler), als **Abweichung im lokalen Rahmen** des Punkts gespeichert und mit radialen
  Basisfunktionen (Gauß) **verstreut** interpoliert; der Animator wählt den Ort und die Reichweite. Kein Raster, neue Dimensionen
  jederzeit. Das Paper zeigt auch, warum Formgewichte schlechter sind: Neutral → halbes Lächeln → volles Lächeln verlangt als
  Gewichte ein Zickzack (das halbe Lächeln geht auf 1 und wieder auf 0) und läuft stückweise linear, als Weg durch einen Posenraum
  dagegen monoton und glatt.

---

## 5 Reglerraum oder Zeitleiste?

Eine Zeitleiste beschreibt Form als Funktion der Zeit. Ein Reglerraum beschreibt Form als Funktion von Reglern; die Zeit kommt erst
durch Abläufe dazu, die Regler über die Zeit führen. Live2D ist ganz Reglerraum (Abläufe sind Kurven über Reglern), Spine war bis 4.2
ganz Zeitleiste und hat mit den Slidern eine Brücke gebaut, Rive mischt beides.

| Frage | Reglerraum | Zeitleiste |
|---|---|---|
| Fortlaufende Eingaben aus Spiel und Physik (Gefälle, Tempo, Neigung, Blick) | stark: Eingang setzt den Regler | schwach: nur Auslösen und Überblenden |
| Unabhängige Bewegungen kombinieren (Kopf × Maul × Haltung) | stark: Regler kombinieren sich | mittel: Spuren und additive Animationen |
| Gespielte Handlung mit Timing, Vorbereitung, Nachschwingen (Stolpern, Hinfallen) | schwach | stark |
| Übergang zwischen beliebigen Zuständen | von selbst (Interpolation) | n × n Übergänge oder Überblenden |
| Wiederverwenden über Figuren | stark (gleiche Regler-IDs) | mittel |
| Physik einbinden | natürlich (Regler hinein und hinaus) | nachträglich |
| Verständlich für einen Art Director | mittel (abstrakter, braucht gute Anzeige) | hoch (vertraut) |
| typischer Fehler | Raster-Explosion, verwaschene Mitte | Rutschen und Brüche beim Überblenden |

**Ergebnis:** Für einen Figuren- und Physik-Spieleditor ist der Reglerraum die bessere **Grundlage**, die Zeitleiste das bessere
**Werkzeug für Handlungen**. Beides wird eins, wenn Abläufe Regler animieren und die Zeit selbst wie ein Regler bedient wird (7.9).
Unser Prototyp zeigt das schon: Die „Zeitleiste“ im Werkzeug ist in Wahrheit eine Leiste über θ (Ziehen dreht den Kopf).

---

## 6 Mehrere Regler kombinieren, ohne dass die Schlüsselformen explodieren

Rechnung: Ein volles Raster braucht k hoch n Schlüsselformen (3 Regler mit 3 Schlüsseln: 27, vier: 81). Die bekannten Auswege:

| Verfahren | Wer | Kosten | Stärke | Schwäche |
|---|---|---|---|---|
| Volles Raster | Live2D, Inochi2D (2D-Regler) | k hoch n | jede Kombination genau formbar | explodiert ab 3 Reglern |
| Schachtelung | Live2D (Verformerbaum) | Summe statt Produkt (15 statt 81) | Details folgen dem Rahmen | nur für Bewegungen, die sich als Verformung eines Rahmens beschreiben lassen |
| Zusatzformen (additiv) | Live2D 4.2+, Inochi2D, 3D-Blendshapes, Rive additiv | je Regler nur seine Schlüssel | billig, beliebig viele | Konflikte, gilt nur in der Ansicht, in der er geformt wurde |
| Ecken automatisch | Live2D Vier-Ecken | Raster, aber nur Ränder von Hand | spart Handarbeit | ungenau, überschreibt Handarbeit |
| Lücken selbst füllen | Inochi2D | nur gesetzte Punkte | Nutzer setzt nur, was nötig ist | Füllung ist grob (linear, Mittelwerte) |
| Verstreute Korrekturen | Pose Space Deformation | eine Korrektur je gewählter Pose | kein Raster, glatt, beliebige Dimension | Reichweite wählen, Rechnung aufwendiger |
| Gewichtsgrenzen | Live2D | ein Graph je Konflikt | löst Überschneidungen | weitere Stellschrauben |

**Bei uns:** Die Kopfdrehung über 360° lässt sich nicht als Verformung eines Rahmens beschreiben (Ohren wandern hinter den Kopf, die
Reihenfolge wechselt, der Bart verschwindet). Sie bleibt deshalb eine **Hauptachse mit Schlüsselformen je Teil**. Alles Weitere
(Nicken, Maul, Augen, Ohrstellung) gehört nicht ins Raster, sondern als **Zusatz im mitlaufenden Rahmen** dazu, mit wenigen
Korrekturen an Stellen, die Florian wählt. Größenordnung für ein Teil wie das Maul, wenn längs θ 16 Schlüssel liegen:

| Aufbau | Schlüsselformen für das Maul |
|---|---|
| volles Raster θ (16) × Nicken (3) × Maul (2) | 96 |
| Hauptachse θ (16) + Nicken als Korrektur bei 0°, 90°, 180° (je oben und unten: 6) + Maul als Zusatz (1) mit zwei Korrekturen | etwa 25 |

---

## 7 Was das für unseren Editor heißt

### 7.1 Abgleich mit dem Prototyp

| Konzept | Prototyp heute | Empfehlung |
|---|---|---|
| Regler mit Schlüsselformen | `raster.ts`: θ (Kopf), ψ (Körper), Schlüssel je Teil | als allgemeines Bauteil herauslösen: jeder Regler, jedes Teil |
| Interpolation | PCHIP je Ankerkoordinate (monoton, ohne Überschwingen), Griffe nach Winkel und Länge, bei Schwenk über 100° kartesisch | behalten; glatter als Live2D (linear) und anders als eine gewöhnliche kubische Mischung ohne Überschwingen |
| Kreisregler | θ von 0° bis 360°, Schlüssel bei 360° = Schlüssel bei 0° | periodisch rechnen (7.3) |
| Spiegeln | zweite Hälfte = erste gespiegelt, Partner getauscht (fest im Code) | Spiegelregel als Eigenschaft des Reglers |
| vorbeilaufende Punkte | Faltschlüssel (verborgen) | als Schlüsselart in der Leiste zeigen und anfassbar machen |
| Teilewechsel, Reihenfolge | Bart und Ohrspalt wechseln bei 180° verborgen die Seite | Schlüsselart „Wechsel“ (Sichtbarkeit, Reihenfolge, Teil) |
| Zusatzformen | fehlen | Maul, Augen, Nicken als Zusätze im mitlaufenden Rahmen (7.4) |
| Ausdrücke | fehlen | Stimmungen als Reglersätze mit Mischregel |
| Posen | `haltung.ts`: Gewichte über benannte Haltungen, Wege über Zwischenhaltungen | Pose = Reglerstand; Übergangsmatrix (7.5) |
| Abläufe | `ablauf.ts`: Abschnitte mit Ziel, Dauer, Zeitkurve, Zusatzbewegungen, „steht“ | Abläufe animieren beliebige Regler, nicht nur Haltungsgewichte |
| Ziel folgen | „steht“ im Ablauf (Pfoten bleiben, Ozzy verschiebt sich als Ganzes) | auch als Ziel eines Anfassers |
| Zeitleiste im Werkzeug | Leiste über θ mit Schlüsselarten und Zwiebelhaut | eine Leiste für jede Achse, Zeit eingeschlossen |
| Physik | Federn in der Steuerung | Pendel, deren Ausgänge Regler sind |

### 7.2 Der Regler als Grundbaustein

Ein Vorschlag für das Datenmodell, in unseren Wörtern:

```ts
// Regler: der einzige Ort, an dem Bewegung als Zahl lebt
interface Regler {
  id: string; name: string;
  art: 'linie' | 'kreis' | 'feld';          // feld = zwei Achsen (Kopf X/Y, Gang × Tempo)
  min: number; max: number; standard: number;
  spiegel?: { mitte: number; partner: Record<string, string> };  // zweite Hälfte = erste gespiegelt
}
// Schlüsselform eines Teils an einer Stelle der Hauptachse(n)
interface Schluesselform { teil: string; an: Record<string, number>; form: Anker[]; art: 'vorlage' | 'dein' | 'gebaut' | 'falte' | 'wechsel' }
// Zusatz: Versatz je Anker im mitlaufenden Rahmen, mit Korrekturen an gewählten Stellen der Hauptachse
interface Zusatz { teil: string; regler: string; versatz: RahmenVersatz[]; korrekturen: { an: Record<string, number>; versatz: RahmenVersatz[] }[] }
// Pose, Übergang, Ablauf, Pendel
interface Pose { name: string; werte: Record<string, number> }             // Teilmenge der Regler
interface Uebergang { von: string; nach: string; art: 'weich' | 'weg' | 'eigen'; dauer: number; staffelung?: Record<string, number>; ablauf?: string }
interface Ablauf { spuren: Record<string, Kurve>; ereignisse: { zeit: number; name: string }[] }
interface Pendel { eingaenge: { quelle: string; gewicht: number }[]; glieder: Glied[]; ausgaenge: { regler: string; glied: number; faktor: number }[] }
```

Alles, was eine Zahl ist, kann an einem Regler hängen: Anker und Griffe, Knochenwinkel, Deckkraft, Reihenfolge, Werte der Shader
(Stärke des Verschmelzens, Glanz, Farbe), Stellwerte der Physik. Live2D macht das mit Deckkraft, Farbe und Reihenfolge vor.

### 7.3 Kopfdrehung über 360°

**Was heute läuft** (`raster.ts`): Schlüssel je Kopfteil bei 0°, 45°, 90° und 180° (Florians Vorlagen), gebaute Zwischenschlüssel,
Florians eigene Schlüssel aus dem Werkzeug, Faltschlüssel; die zweite Hälfte ist die erste gespiegelt; Anker per PCHIP, Griffe nach
Winkel und Länge.

**Vergleich:**

- Live2D dreht den Kopf üblicherweise ±30° in einem 3 × 3-Raster, indem es das Bild mit Biegegittern wölbt; eine volle Drehung
  braucht Teilewechsel, Reihenfolge am Regler und einen Kreisregler. Die 3D-Drehung mit Tiefenschätzung erzeugt Schlüsselformen mit
  Perspektive. Für Florians Stil ungeeignet: Gewölbte Flächen sind das „wie ein Blatt drehen“.
- Cartoon Animator setzt Winkelpunkte (bis 25) mit Lage, Verformung und Bildwechsel je Punkt. Das ist unserem Weg am nächsten, aber
  mit Bildern statt Vektorformen.
- Unser Weg (echte Formen je Winkel, gleiche Anker in allen Schlüsseln, glatt gemischt) ist für einen Vektor-Look der stärkste. Die
  Live2D-Erfahrung bestätigt die Bausteine, die wir schon haben: Kreisregler, Spiegeln, Teilewechsel.

**Empfehlungen:**

1. **θ als Kreisregler mit periodischer Mischung.** `pchip` in `form.ts` nimmt an den Enden die einseitige Steigung (erste bzw.
   letzte Sehne), und die Liste der Kopfschlüssel läuft von 0° bis 360° mit dem Frontschlüssel an beiden Enden. An inneren
   Schlüsseln (etwa 180°) sind die Steigungen beidseitig gleich. An der Front (0°/360°) dagegen: Für seitliche Bewegungen passen die
   beiden einseitigen Steigungen wegen der Spiegelung zufällig zusammen. Für Werte, die links und rechts der Front gleich sind (etwa
   die Höhe eines Ankers), bekommt der Anker aber **entgegengesetzte** Steigungen: Seine Bahn hat genau in der Frontansicht einen
   Knick, ein kurzes Abprallen. **Probe** (mit Florians Schlüsseln, Stand heute, Skript nur im Arbeitsordner): Anker 3 von `kopfB`
   sinkt bis 360° um rund 1,1 Einheiten je Grad und steigt ab 0° sofort wieder um rund 0,8 je Grad (in der Szene dieselbe V-Form);
   bei `kopfA`, `bartA` und `bartB` kehren einzelne Anker an der Front ebenfalls mit Tempo um, `ohrA` knickt um 78°, die Nase kaum
   (6°). Ob man das sieht, entscheidet Florian an einer langsamen Drehung über die Front. Abhilfe: die Schlüssel vor dem Mischen um
   ±360° fortsetzen, damit jede Steigung aus beiden Nachbarn kommt; PCHIP setzt sie dort, wo die Seiten im Vorzeichen widersprechen,
   auf null (weich umkehren statt abprallen).
2. **Spiegelregel als Eigenschaft des Reglers** statt fest im Code; abschaltbar für Teile, die nicht spiegelgleich sind.
3. **Schlüsselarten sichtbar in der Leiste:** Vorlage, dein, gebaut, Falte, Wechsel. Live2D kennt keine Faltschlüssel; dort löst man
   vorbeilaufende Punkte mit Teilewechseln. Unsere Faltschlüssel haben sich bewährt und sollten anfassbar werden.
4. **Nicken nur, wenn das Spiel es braucht,** und dann dünn: Korrekturen bei wenigen θ (etwa 0°, 90°, 180°), dazwischen gefüllt.
   Ein volles Raster (16 × 3 = 48 Formen je Teil) ist zum Zeichnen zu viel.
5. **Bogen-Hilfe nur als Vorschlag:** Erweiterte Interpolation und 3D-Tiefenschätzung zeigen, dass Punkte einer Drehung auf Bögen
   laufen. Für gebaute Zwischenschlüssel kann das helfen (ein Nasenanker läuft von 0° bis 90° ungefähr wie ein Sinus), aber nie gegen
   Florians Schlüssel: Seine Ansichten sind keine Projektionen.
6. **Bahnen der Anker zeigen.** Nebenbefund derselben Probe: Zwischen 176° und 184° liegen bei `kopfA` viele Schlüssel dicht
   beieinander (Florians bei 176°, 176,5° und 178°, ein Faltschlüssel bei 179,1°, die Vorlage bei 180°, seiner bei 184°). Jeder
   stimmt für sich, aber Anker 0 läuft dazwischen hin und her: in der Szene von 190,9 (176°) auf 200,5 (178°), zurück auf 192,3
   (180°) und weiter auf 207,6 (184°). Ob das sichtbar ist, hängt davon ab, ob der Anker an einer sichtbaren Kante liegt. PCHIP
   verhindert Überschwingen zwischen zwei Schlüsseln, aber kein Zickzack, das die Schlüssel selbst vorgeben. Live2D hat dafür keine
   Hilfe; Zeichenprogramme zeigen Bewegungsbahnen. Die Leiste sollte beim Bearbeiten die Bahnen der gewählten Anker über die Nachbarn
   zeigen, damit Florian ein Zickzack sieht, bevor er den nächsten Schlüssel setzt.

### 7.4 Zusätze im mitlaufenden Rahmen

- **Problem:** Ein Zusatz „Maul auf“ als fester Versatz in Bildkoordinaten passt nur in der Ansicht, in der er geformt wurde. Live2D
  löst das durch Schachtelung (Maul im Raum des Gesichts), Pose Space Deformation durch Abweichungen im lokalen Rahmen.
- **Für Vektorformen:** Der Versatz eines Ankers wird im Rahmen gespeichert, den die aktuelle Hauptform an dieser Stelle hat
  (Richtung der Kurve am Anker, ihre Normale, dazu die örtliche Größe des Teils). Ändert θ die Form, dreht und dehnt sich der Rahmen
  mit, und der Zusatz wirkt weiter plausibel. Wo nicht (Maul im Profil), setzt Florian bei diesem θ eine Korrektur des Zusatzes;
  dazwischen wird der Zusatz längs θ gemischt.
- **Konflikte:** Bewegen zwei Zusätze dieselben Anker (Maul auf und Lächeln), zeigt das Werkzeug die Überschneidung; Abhilfe ist eine
  Begrenzung über einen Regler (wie in Live2D) oder eine Korrektur an der Kombination.
- **Die Grundform darf sich ändern:** Weil der Zusatz relativ zum Rahmen gespeichert ist, folgt er, wenn Florian später einen
  θ-Schlüssel korrigiert. Live2D warnt genau davor, weil dort Differenzen in festen Koordinaten liegen.

### 7.5 Posen und Übergänge

- **Pose = benannter Reglerstand,** auch nur eine Teilmenge („Sitzen“ setzt Haltung und Körperachsen und lässt Kopf und Ohren frei).
  Das ist dieselbe Form wie ein Live2D-Ausdruck.
- Unsere **Haltungsgewichte** sind schon ein Reglerraum (Mischung benannter Haltungen). Die Lehre aus Pose Space Deformation:
  Zwischenhaltungen besser als Orte in einem Raum denn als eigene Gewichte führen, damit Wege monoton und glatt laufen.
- **Übergangsmatrix:** Für jedes Paar (von, nach) gilt eine von drei Arten:
  - **weich:** alle Regler gleichzeitig mit einer Zeitkurve, dazu eine **Staffelung** je Regler (Kopf führt, Schwanz folgt). Das ist
    Überlappen und Nachziehen als Standard, was weder Live2D noch Rive von selbst tun;
  - **Weg:** über Zwischenposen (Liegen → Sitzen → Stehen), wie heute `weg()`;
  - **eigen:** ein Ablauf, den Florian formt (Zeitleiste über Reglern, mit Zusatzbewegungen wie Hüpfer, Plumps, Seufzer).
- **Unterbrechen:** Ein Übergang kann jederzeit abbrechen; der neue beginnt beim aktuellen Stand (Rive erlaubt den Ausstieg während
  eines Übergangs, Live2D blendet den alten Ablauf aus).

### 7.6 Knochen und Regler

- Ein Knochenwinkel ist ein Regler. Regler können Knochen stellen (eine Haltung setzt Winkel), und Knochen können Regler treiben
  (Spine-Slider: ein Steuerknochen stellt eine Animation). Für Florian heißt das: Er zieht an der Figur, nicht an Schiebern.
- Das beste Zusammenspiel aus Morph und Knochen ist das Prinzip von Pose Space Deformation, das Live2D mit Drehverformer plus
  Netzschlüsseln nachbildet: **Knochen bewegen starr und ohne Schrumpfen, Schlüsselformen korrigieren die Form über den
  Knochenwinkeln, gespeichert im Rahmen des Knochens.** Gewichte je Anker und je Griff gehören in den Bericht über Knochen.

### 7.7 Physik als Regler

- Pendelketten nach dem Live2D-Muster für Ohren, Bart und Schwanz: vier Stellwerte je Glied, Voreinstellungen („Ohr weich“, „Schwanz
  drei Glieder“), ein Knopf „Ausschlag auf 100 %“.
- **Eingänge** sind Regler (θ, Haltung, Schritt) **und Größen aus der Welt**: Beschleunigung des Körpers, Drehung des Rads und die
  Richtung der Schwerkraft relativ zu Ozzy (auf dem gewölbten Rad ändert sich, wo „unten“ ist). Live2D kann Schwerkraft und Wind zur
  Laufzeit setzen; Inochi2D hängt das Pendel an den Weltanker. Beides brauchen wir.
- **Ausgänge** sind Regler (Ohrwinkel, Schwanzwinkel, ein Zusatz „Ohr flattert“), damit Florian die Wirkung als Form gestaltet.
- **Feste Rechenrate** mit Zwischenwerten (etwa 120 Hz), damit 60-Hz- und 120-Hz-Bildschirme (iPhone 16, MacBook Pro) gleich
  aussehen.

### 7.8 Spiellogik liest und schreibt Regler

- **Gang als Kreisregler „Schritt“:** Das Spiel schiebt ihn nach dem zurückgelegten Weg auf dem Rad vor (Weg durch Schrittlänge),
  nicht nach der Zeit. So rutschen die Pfoten nie, egal wie vorsichtig gedreht wird. Ein Feld „Schritt × Tempo“ mischt Tapsen und
  Traben.
- **Weitere Regler:** Tempo, Gefälle unter den Pfoten (bergauf, bergab), Gleichgewicht (Lehnen), Stimmung („eigener Kopf“: stur,
  neugierig, ängstlich als Ausdrücke mit Mischregel).
- **Abläufe als Handlungen:** Stolpern, Hinfallen, Springen, Aufrappeln löst das Spiel aus (Regeln wie „Tempo über Grenze →
  Stolpern“); Ereignisse in Abläufen melden zurück („Pfote setzt auf“ → Staub, Ton).

### 7.9 Bedienung

- **Eine Leiste für alles:** Die Leiste aus dem Werkzeug wird allgemein. Sie zeigt die Schlüssel eines Teils längs der gewählten
  Achse, Zeit eingeschlossen. Ziehen in der Leiste stellt den Regler; J und K springen; die Zwiebelhaut zeigt Nachbarn längs derselben
  Achse.
- **Feld für zwei Achsen:** Schlüssel als Punkte (wie das Neun-Punkte-Feld in Live2D, der Joystick in Rive, die Winkelpunkte im
  Cartoon Animator); gefüllte Stellen werden anders gezeichnet als gesetzte.
- **Anfasser an der Figur:** Nase ziehen stellt θ (und Nicken), Pfote ziehen stellt das Bein, mit „Ziel folgen“ (Pfote bleibt auf dem
  Rad). Schlüssel entstehen beim Ziehen wie im Live2D-Controller.
- **Übergangsmatrix** als Gitter der Posen; jede Zelle zeigt weich, Weg oder eigen.
- **Reglerliste knapp:** Namen, Schieber erscheinen erst beim Anfassen; Florian muss Regler-IDs nie sehen.

### 7.10 Reihenfolge und Mischregeln

Je Bild: gesicherten Grundstand laden → Pose und Übergang → Abläufe → Ausdrücke (Addieren, Multiplizieren, Überschreiben) →
Eingänge des Spiels → Physik → Teilewechsel und Reihenfolge → Formen auswerten. Jede Quelle hat ihre Mischregel; das Ergebnis eines
Bilds wird nie die Grundlage des nächsten (wie das Sichern in Live2D).

---

## 8 Ehrliche Gegenüberstellungen für unseren Fall

Unser Fall: Charakter- und Physik-Spieleditor, ein Art Director ohne Programmierkenntnisse, Mac sowie iPad und iPhone, Vektorformen,
Ozzy als Beispiel und Testspiel.

### 8.1 Ein fertiges Werkzeug nutzen oder selbst bauen?

| Kriterium | Live2D | Inochi2D / nijigenerate | Spine 4.3 | Rive | eigener Editor mit Reglerkern |
|---|---|---|---|---|---|
| Vektorflächen zur Laufzeit | nein (Texturen; Vektorlinien nur im Editor) | nein (Texturen) | nein (Bilder, Netze) | ja | ja |
| Morph-Güte für Florians Formen | linear, Bildwölbung | linear oder kubisch | Netzverformung, linear | Punkte animiert | PCHIP, Faltschlüssel, Verschmelzen über Abstandsfelder |
| Bedienbar ohne Programmieren | ja, aber viel Oberfläche | ja, aber unfertig | ja, viel Oberfläche | ja | so einfach, wie wir es bauen |
| Mac, iPad, iPhone | Editor nur Windows/macOS | Desktop | Desktop | Editor im Browser und Desktop | Web-Technik, alle drei |
| Physik | Pendel auf Reglern | Pendel am Weltanker | Physik auf Knochen | nicht Teil dieses Berichts | Pendel + Welt, nach Bedarf |
| Spiellogik | keine | Knotengraph im Umbau | über Code | Zustandsmaschine, Daten | eigene, visuell |
| Lizenz, Abhängigkeit | Abo, SDK-Lizenz für Firmen | offen (BSD-2) | Lizenz | Abo | eigen |
| Risiko | gering, passt aber nicht | hoch (Umbau) | gering, passt nicht | mittel | Bauaufwand |

**Urteil:** Selbst bauen, die Konzepte übernehmen. Kein fertiges Werkzeug verbindet Vektorflächen, Florians Morph-Ansprüche, iPad
und Spiellogik. Live2D liefert die Grammatik (Regler, Schachtelung, Zusätze, Pendel, Ausdrücke, Anfasser), Inochi2D die Füllung der
Lücken und die additiven Versätze, Spine die Idee „Knochen treibt Regler“, Rive die Mischzustände und Joysticks.

### 8.2 Entscheidungen im eigenen Editor

| Frage | Möglichkeiten | Urteil |
|---|---|---|
| Grundform der Animation | nur Zeitleiste · nur Reglerraum · Regler als Unterbau mit Zeit als Regler | **Regler als Unterbau**, Abläufe animieren Regler |
| Mehrere Regler an einem Teil | volles Raster · Schachtelung · Zusätze · dünne Korrekturen mit Füllung · verstreute Korrekturen | **Hauptachse voll, Rest als Zusatz im mitlaufenden Rahmen, Korrekturen nur wo gesetzt**; verstreute Korrekturen erst, wenn es mehr als zwei Achsen gibt |
| Interpolation | linear · linear mit Zwischenschlüsseln · kubisch · PCHIP mit Griffen nach Winkel und Länge | **PCHIP behalten**, an Kreisreglern periodisch; Bogen-Hilfe nur als Vorschlag |
| Kopfdrehung 360° | Bildwölbung + Teilewechsel · Winkelpunkte mit Bildern · Vektorformen je Winkel · 3D-Schätzung | **Vektorformen je Winkel** als Kreisregler, Faltschlüssel und Wechsel als Schlüsselarten |
| Physik | Pendel auf Reglern · Pendel am Weltanker · Physik auf Knochen · Weichkörper | **Pendel mit Reglern und Welt als Eingang, Regler als Ausgang**; Weichkörper nur für Effekte |
| Posenübergänge | Überblenden · Wege über Zwischenposen · eigene Abläufe je Paar · Posenraum | **Übergangsmatrix** mit weich (gestaffelt), Weg und eigen |
| Mischen der Quellen | zuletzt gewinnt · Mischregel je Ausdruck · Mischmodus je Eingang | **Mischregel je Quelle, feste Reihenfolge, jedes Bild ab Grundstand** |

---

## 9 Empfehlungen

1. **Regler als einziges Bauteil, an dem Bewegung hängt** (Formen, Knochen, Deckkraft, Reihenfolge, Shader, Physik). Drei Arten:
   Linie, Kreis, Feld.
2. **Eine Leiste für alles:** die θ-Leiste des Werkzeugs auf jede Achse verallgemeinern, Zeit eingeschlossen; Schlüsselarten
   (Vorlage, dein, gebaut, Falte, Wechsel), Zwiebelhaut längs jeder Achse und die Bahnen der gewählten Anker über die Nachbarn.
3. **θ periodisch mischen:** Die Probe zeigt an der Front Anker, die mit Tempo umkehren (V-förmige Bahn). Zuerst sieht Florian sich
   eine langsame Drehung über die Front an, dann wird periodisch gerechnet.
4. **Spiegelregel als Eigenschaft** eines Reglers, abschaltbar je Teil.
5. **Höchstens eine volle Hauptachse je Teil;** Maul, Augen, Nicken als Zusätze im mitlaufenden Rahmen; Korrekturen nur dort, wo
   Florian sie setzt; Lücken füllt das System sichtbar als „gebaut“.
6. **Konflikte zeigen und begrenzen,** wenn zwei Zusätze dieselben Anker bewegen.
7. **Posen als Reglerstände, Übergangsmatrix** mit weich (gestaffelt), Weg und eigenem Ablauf je Paar; Übergänge jederzeit
   unterbrechbar.
8. **Abläufe als Kurven über Reglern** mit Bézier-Zeitgriffen auf ein Drittel und zwei Drittel (schnell auszuwerten) und Ereignissen
   für das Spiel.
9. **Pendel nach Live2D-Mechanik** mit Welt-Eingängen (Beschleunigung, Schwerkraft entlang des Rads), Reglern als Ausgang, fester Rate
   mit Zwischenwerten, Voreinstellungen und „Ausschlag auf 100 %“.
10. **Anfasser an der Figur** (Nase, Pfote) mit „Ziel folgen“; Florian bedient Regler, ohne Schieber zu suchen.
11. **Automatiken schlagen nur vor:** Ecken füllen, Spiegeln, Zwischenschlüssel, Pendel aus einem Teil, Blinzeln und Atmen als
    Standardzusätze. Florians Schlüssel sind fest, gebaute weich.
12. **Für das Spiel:** Kreisregler „Schritt“ nach Weg, Regler Tempo, Gefälle, Gleichgewicht, Stimmung; Stolpern und Hinfallen als
    Abläufe, die das Spiel auslöst.
13. **Eine Standardliste der Regler für Vierbeiner** festlegen (IDs und Bereiche), damit Abläufe zwischen Figuren tauschbar sind.
14. **Nicht übernehmen:** lineare Interpolation, Bildwölbung als Grundtechnik, volle Raster über mehr als zwei Achsen, Dialogfülle.

---

## 10 Offene Fragen

1. Braucht Ozzy im Spiel ein Nicken (Kopf hoch und runter) als zweite Kopfachse, oder reichen Haltung und Neigen?
2. Will Florian Übergänge lieber in der Matrix mit wenigen Werten (Dauer, Staffelung) oder als Ablauf mit Zeitleiste formen? Das
   klärt eine Bedienprobe.
3. Wie weit gilt die Spiegelregel? Für den Kopf ja; beim Laufen ist die Schrittfolge nicht spiegelgleich.
4. Reicht ein Zusatz im mitlaufenden Rahmen für Maul und Augen zwischen 45° und 135°, oder braucht es je Viertel eine Korrektur?
   Probe an seiner Form.
5. Welche Teile bekommen Physik (Ohren, Bart, Schwanz, Backen), und darf die Physik Formen ändern (Zusätze) oder nur Winkel?
6. Sieht Florian das Abprallen an der Front und das Hin und Her bei 176° bis 184° (7.3), oder liegen die Anker an Stellen, die das
   Verschmelzen verdeckt?
7. Inochi2D 0.9: ob und wann der Umbau fertig wird, ist offen. Nur als Ideenquelle nutzen.
8. Live2D 5.4: Inhalte unbekannt (Alpha bis Oktober 2026). Später prüfen, besonders den Parameter-Controller zur Laufzeit.
9. Zeichenreihenfolge in Live2D: ob sie am Regler stufenweise oder an der Mitte zwischen Schlüsseln wechselt, ist nicht belegt. Für
   uns selbst festlegen (Wechsel als eigener Schlüssel mit genauer Stelle).

---

## 11 Grenzen dieser Recherche

- Das gemeinsame Kontingent der Websuche war während der Arbeit aufgebraucht. Danach wurden nur noch bekannte Seiten direkt
  abgerufen (Handbücher, Quelltexte, Projektseiten). Deshalb fehlen breite Nutzerstimmen außerhalb des Live2D-Forums (Reddit,
  Rezensionen) und ein unabhängiger Beleg zum Stand von Inochi2D 0.9.
- Nicht belegt: die genaue Zuordnung der Pendel-Stellwerte im Editor zu den Werten in der Datei, das Wechselverhalten der
  Zeichenreihenfolge zwischen Schlüsseln, die Interpolation zwischen den Winkelpunkten im Cartoon Animator, die Inhalte von Live2D 5.4.
- Toon Boom Harmony (Master Controller) und Moho (Smart Bones) sind weitere parameterbasierte Vektorwerkzeuge; sie wurden hier nicht
  untersucht.

---

## 12 Quellen

**Live2D, Handbuch des Editors**

- Parameter: <https://docs.live2d.com/en/cubism-editor-manual/parameter/>
- Repeat (Kreisregler): <https://docs.live2d.com/en/cubism-editor-manual/repeat/>
- Standardliste der Parameter: <https://docs.live2d.com/en/cubism-editor-manual/standard-parameter-list/>
- Schlüsselformen und Schachtelung (Augenbrauen-Beispiel, Empfehlung zur Zahl der Parameter):
  <https://docs.live2d.com/en/cubism-editor-manual/keyform-parent-chilid-relation/>
- Schlüssel hinzufügen und löschen: <https://docs.live2d.com/en/cubism-editor-manual/edit-parameters/>
- X- und Y-Bewegung (3 × 3-Raster): <https://docs.live2d.com/en/cubism-editor-manual/keyform-xydirection/>
- Verformer: <https://docs.live2d.com/en/cubism-editor-manual/deformer/>
- Biegegitter: <https://docs.live2d.com/en/cubism-editor-manual/making-and-placement-of-warp-deformer/>
- Erweiterte Interpolation: <https://docs.live2d.com/en/cubism-editor-manual/extended-interpolation/>
- Zusatzformen: <https://docs.live2d.com/en/cubism-editor-manual/blend-shape/>
- Gewichtsgrenzen der Zusatzformen: <https://docs.live2d.com/en/cubism-editor-manual/limit-settings-for-blend-shape-weights/>
- Vier-Ecken-Automatik: <https://docs.live2d.com/en/cubism-editor-manual/synthesize-corners/>
- Gesichtsbewegung automatisch: <https://docs.live2d.com/en/cubism-editor-manual/face-auto-edit>
- 3D-Drehung anwenden: <https://docs.live2d.com/en/cubism-editor-manual/apply-3d-rotation-expression/>
- KI-Schwingen: <https://docs.live2d.com/en/cubism-editor-manual/auto-generation-of-sway-motion/>
- Skinning: <https://docs.live2d.com/en/cubism-editor-manual/skinning/>
- Glue: <https://docs.live2d.com/en/cubism-editor-manual/glue>
- Zeichenreihenfolge: <https://docs.live2d.com/en/cubism-editor-manual/draworder/>
- ArtPath: <https://docs.live2d.com/en/cubism-editor-manual/artpath/>
- Physik einstellen: <https://docs.live2d.com/en/cubism-editor-manual/physical-operation-setting/>
- Physik prüfen (Rechenrate seit 4.2): <https://docs.live2d.com/en/cubism-editor-manual/check-the-physics>
- Parameter-Controller: <https://docs.live2d.com/en/cubism-editor-manual/about-the-parameter-controller/>
- Ziel folgen: <https://docs.live2d.com/en/cubism-editor-manual/parameter-controller-target-setting/>
- Controller-Tipps (Rechenreihenfolge): <https://docs.live2d.com/en/cubism-editor-tutorials/parameter-controller-tips/>
- Neuerungen 5.1: <https://docs.live2d.com/en/cubism-editor-manual/new-function5-1/>
- Neuerungen 5.2: <https://docs.live2d.com/en/cubism-editor-manual/new-function5-2/>
- Neuerungen 5.3: <https://docs.live2d.com/en/cubism-editor-manual/new-function5-3/>

**Live2D, SDK und Quelltext**

- Physik im SDK: <https://docs.live2d.com/en/cubism-sdk-manual/physics>
- Repeat im SDK: <https://docs.live2d.com/en/cubism-sdk-manual/parameter-repeat/>
- Abläufe: <https://docs.live2d.com/en/cubism-sdk-manual/motion/>
- Ausdrücke: <https://docs.live2d.com/en/cubism-sdk-manual/expression>
- Teilewechsel: <https://docs.live2d.com/en/cubism-sdk-manual/pose/>
- Atmen: <https://docs.live2d.com/en/cubism-sdk-manual/breath/>
- Neuerungen 4 / 4.2 / 5 im SDK: <https://docs.live2d.com/en/cubism-sdk-manual/cubism-4-new-functions/>,
  <https://docs.live2d.com/en/cubism-sdk-manual/cubism-4-2-new-functions/>,
  <https://docs.live2d.com/en/cubism-sdk-manual/cubism-5-new-functions/>
- Format `motion3.json`: <https://github.com/Live2D/CubismSpecs/blob/master/FileFormats/motion3.json.md>
- Physik-Quelltext: <https://github.com/Live2D/CubismWebFramework/blob/develop/src/physics/cubismphysics.ts>
- Atmen und Blinzeln: <https://github.com/Live2D/CubismWebFramework/blob/develop/src/effect/cubismbreath.ts>,
  <https://github.com/Live2D/CubismWebFramework/blob/develop/src/effect/cubismeyeblink.ts>
- Reihenfolge je Bild im Beispielprogramm: <https://github.com/Live2D/CubismWebSamples/blob/develop/Samples/TypeScript/Demo/src/lappmodel.ts>

**Live2D, Produkt und Stimmen**

- Download (Plattformen): <https://www.live2d.com/en/cubism/download/editor/>
- SDK-Lizenz: <https://www.live2d.com/en/sdk/license/>
- 5.4-Alpha: <https://www.live2d.com/en/information/cubism-5_4-alpha/>
- Presse zu 5.1 (Preis, KI-Funktionen): <https://automaton-media.com/articles/newsjp/20240730-303793/>
- Forum: zu viele Parameter, Ruckeln und Absturz: <https://community.live2d.com/discussion/1459/keyforms-lag-and-crash>
- Forum: mehr als drei Parameter: <https://community.live2d.com/discussion/1216/more-parameters>
- Forum: Ecken erzeugen: <https://community.live2d.com/discussion/30/synthesizing-corners>
- Forum: lineare Interpolation im Animator: <https://community.live2d.com/discussion/51/linear-interpolation-between-keyframes-in-the-animator>
- Forum: Wünsche an den Editor: <https://community.live2d.com/categories/cubism-editor-feature-requests>
- Forum: Wünsche zu Glue: <https://community.live2d.com/discussion/2006/additional-glue-controls>

**Inochi2D und nijilive**

- Bibliothek: <https://github.com/Inochi2D/inochi2d>
- Bindungen 0.8.7: <https://github.com/Inochi2D/inochi2d/blob/v0.8.7/source/inochi2d/core/param/binding.d>
- Regler 0.8.7: <https://github.com/Inochi2D/inochi2d/blob/v0.8.7/source/inochi2d/core/param/package.d>
- Verformungsstapel 0.8.7: <https://github.com/Inochi2D/inochi2d/blob/v0.8.7/source/inochi2d/core/nodes/defstack.d>
- Physik 0.8.7: <https://github.com/Inochi2D/inochi2d/blob/v0.8.7/source/inochi2d/core/nodes/drivers/simplephysics.d>
- Umbau 0.9 (Regler als Senke, Platzhalter): <https://github.com/Inochi2D/inochi2d/blob/main/source/inochi2d/ctrl/sinks/param.d>,
  <https://github.com/Inochi2D/inochi2d/blob/main/source/inochi2d/param/utils.d>
- Förderung: <https://nlnet.nl/project/Inochi2D/>
- Editor: <https://github.com/Inochi2D/inochi-creator>, Projektseite: <https://inochi2d.com/>
- nijilive und nijigenerate: <https://github.com/nijigenerate/nijilive>, <https://github.com/nijigenerate/nijigenerate>
  (AutoRig: Pull Requests 199 und 205)

**Andere**

- Spine Slider: <https://esotericsoftware.com/spine-sliders>
- Spine Physik: <https://esotericsoftware.com/spine-physics-constraints>
- Spine 4.3: <https://esotericsoftware.com/blog/Spine-4.3-released>, Änderungsliste: <https://esotericsoftware.com/spine-changelog>
- Spine 4.2: <https://esotericsoftware.com/blog/Spine-4.2-The-physics-revolution>
- Rive Zustände: <https://rive.app/docs/editor/state-machine/states>, Übergänge:
  <https://rive.app/docs/editor/state-machine/transitions>, Joysticks: <https://rive.app/docs/editor/manipulating-shapes/joysticks>
- Cartoon Animator 360-Kopf: <https://www.reallusion.com/cartoon-animator/360-head-creator.html>
- J. P. Lewis, M. Cordner, N. Fong: Pose Space Deformation, SIGGRAPH 2000: <https://www.scribblethink.org/Work/PSD/PSD.pdf>

**Im Repo**

- `apps/editor/src/ozzy-figur/raster.ts` (Schlüsselformen je Winkel, Faltschlüssel, Spiegeln), `form.ts` (`pchip`),
  `haltung.ts`, `ablauf.ts`, `werkzeug.ts`
- Plan des Werkzeugs: `docs/plans/2026-11-19-ozzy-figur-werkzeug.md`
