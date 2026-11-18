# Ozzy: Liste für den Feinschliff

Florian, 17.11.2026, 23 Uhr 30: „ok dann c. Ich muss nun etwas schlafen. Du kannst selbstständig bis einschließlich E Tempo II
weitermachen. Fragen an mich und details die dir auffallen und nicht gleich behoben/entschieden werden müssen kommen in den
feinschliff.“

Hier steht, was warten kann: Fragen an Florian, Zurückgestelltes aus dem Plan
[`2026-11-17-ozzy-stabil-schnell.md`](2026-11-17-ozzy-stabil-schnell.md) und Beobachtungen. Jeder Eintrag mit Datum und Ort. Was
gebaut ist, steht im Plan je Schritt unter „Gebaut“, nicht hier.

## 0. Nach seinem ersten Test (18.11., vormittags)

Florian hat getestet. Ursachen und Plan zur Behebung stehen in
[`2026-11-18-ozzy-nach-dem-ersten-test.md`](2026-11-18-ozzy-nach-dem-ersten-test.md) (Entwurf, nicht freigegeben). Seine Antworten
zu dieser Liste:

- **Gleiten (C3):** zurückgestellt („Dann stellen wir das gleiten“). Nicht bauen, bevor er es wieder aufruft.
- **Tempo im Zug (D1):** „Das Tempo beim Zug ist schon besser geworden“, „beim zug ist das Tempo ok“.
- **Zeiger (B1):** „ich bin mir nicht sicher ob mich da etwas stört oder ob ich es sehe“: nichts zu entscheiden, das Dreieck bleibt.
- **Reihenfolge:** Maul, Posen und Teile (Beine anfügen und verschmelzen) will er in einer neuen Sitzung beginnen; E1, E2, Gleiten,
  D1 Teil 3 und 4 und der Spiegel-Schalter können danach kommen.
- **Die Frage „Spitze ohne Dicke“ (C1) ist jetzt dringender:** Sein Aufblasen zeigt dieselbe Schwäche (mit keiner oder einer Linie
  hat die Rechnung keinen festen Ausgang). Sie ist Schritt 1 des neuen Plans.

## 1. Fragen an Florian (keine hält die Arbeit auf)

- **Zeiger (B1):** Soll der Zeiger des Systems (`?zeiger=system`) Standard werden, so bleiben oder anders werden (zum Beispiel über
  der Haut Pfeil vom System plus Ring)? Er, 17.11.: „Muss ich noch mehr testen.“
- **Seifenhaut (A2):** sein Urteil. Er, 17.11.: „sieht besser aus aber muss ich noch genau anschauen.“
- **Esc (B4):** Heute führt Esc im Raum ohne Werkzeug zurück zur Zeichnung auf dem Blatt; das passiert leicht aus Versehen. Vorschlag:
  Esc verlässt nur Werkzeug, Auswahl und Ansicht; zurück aufs Blatt geht es mit ⌫ ohne Auswahl. Er, 17.11.: „verstehe ich nicht. muss
  ich das jetzt entscheiden?“ Also später, mit einem Bild erklären.
- **Kurvennetz im Raum (B3):** In dieser Ansicht sind die Zeichnungen an den Wänden ausgeblendet (sie lägen sonst über dem weißen
  Körper). Soll das so bleiben?
- **Wenden (B2):** Die Linien der abgewandten Seite sind beim Wenden blass zu sehen. Er, 17.11.: „kann erstma so bleiben.“

- **Eine Spitze ohne Dicke (C1, 18.11.):** Ziehst du einen einzelnen Punkt der Linie der Mitte weit hinaus, entsteht eine Klinge:
  Nichts gibt ihr Dicke, die zwei Seiten der Haut liegen aufeinander (Bild
  [`2026-11-18-spitze-ohne-dicke.png`](../progress/ozzy/2026-11-18-spitze-ohne-dicke.png), „teat firefish“, ein Punkt 30 Bildpunkte
  an der Wand gezogen). Die Rechnung kommt dort nicht zur Ruhe, im Netz bleiben umgeschlagene Dreiecke (jetzt 12 statt 46). Was soll
  eine solche Spitze sein: so dünn, wie sie ist (dann braucht sie eine saubere Regel für „keine Dicke“), oder rund wie ein Horn
  (dann müsste die Form dort von selbst Dicke bekommen, etwa so breit, wie die Spitze in der Seite ist)? Mit einer Linie rundum
  bestimmst du die Dicke heute schon selbst.

- **P quer über die Mitte (C2, 18.11.):** Zeichnest du in Front oder Top einen Strich quer über die Mitte, wird der Loop
  spiegelgleich: Es gilt die längere Hälfte deines Strichs (von einem Ende bis zur Mitte) und ihr Spiegelbild. Ein schräger gerader
  Strich wird so ein flaches V. Bis zum 17.11. wurde ein gerader Strich dort waagerecht gelegt (in der Höhe, in der er die Mitte
  kreuzte). Passt dir die neue Regel, oder soll ein gerader Strich weiter waagerecht werden?
- **P längs der Mitte (C2, 18.11.):** Kreuzt ein Strich die Mitte mehr als einmal (zum Beispiel im Top eine geschwungene Linie längs
  des Rückens), gibt es keinen Loop, nur eine Meldung. Was soll daraus werden: eine Linie auf einer Seite (und ihr Spiegelbild),
  die Linie der Mitte, oder soll es so bleiben?

- **Gleiten (C3, 18.11.): Die Form bleibt dabei nicht stehen.** Deine Linien tragen die Form (löscht man eine weiche Linie, setzt
  sich die Haut um 9 bis 66 Einheiten um). Rückt eine Linie auf der Haut weiter, verliert die alte Stelle ihren Halt: bei 1 bis 2
  Einheiten Weg bewegt sich die Haut um weniger als etwa 1 Einheit, bei 10 um 2 bis 6, bei 30 um 5 bis 19 (an der stärksten
  Stelle; der größte Teil der Form steht). Zum Maß: Deine Formen sind 730 bis 1 480 Einheiten lang, 10 Einheiten sind bei
  normaler Größe etwa 5 Bildpunkte. Auch ein Punkt, der auf seiner eigenen Linie weiterrückt, ändert die Linie (bei 10
  Einheiten um 1 bis 4). Bild [`2026-11-18-gleiten-beweis.png`](../progress/ozzy/2026-11-18-gleiten-beweis.png), Zahlen im Plan
  unter C3. Gebaut ist deshalb nichts. Drei Wege:
  - **A. Gleiten, die Form geht leicht mit** (wie das Verschieben einer Kante in Blender): ⌘ + Ziehen schiebt Punkt oder Linie auf
    der Haut, du siehst dabei, wie sich die Form umsetzt, und hörst auf, wenn es dir zu viel wird. Für kleine Wege fast nichts.
  - **B. Gleiten legt eine Kopie:** Die Linie bleibt, wo sie ist, und hält die Form; eine zweite liegt an der neuen Stelle auf der
    Haut. Löschst du später die alte, setzt sich die Form um, so viel, wie die alte Linie trug.
  - **C. Kein Gleiten:** An der neuen Stelle mit P zeichnen, wie heute.

  Mein Vorschlag: A. Genau stehen bleibt die Form nur, wenn an der alten Stelle eine Linie bleibt (B).

- **Felder (C4, 18.11.): die Farbe und zwei Regeln.** Ein gewähltes Feld ist hellgrün getönt (das Grün der verdeckten Linien, zur
  Hälfte), auf der dunklen Rückseite dunkelgrün; Bild
  [`2026-11-18-feld-waehlen-ziehen.png`](../progress/ozzy/2026-11-18-feld-waehlen-ziehen.png). Passt die Farbe? Und zwei Regeln, die
  ich gesetzt habe: (1) Ein Feld reicht bis an die Linie der Mitte; sein Spiegelbild ist immer mitgewählt. Ziehst du es, gehen
  auch die Punkte der Mitte auf seinem Rand mit (der Umriss ändert sich). (2) In den Vier Ansichten schließt ein Klick auf die
  Form die Ansichten nicht mehr (er wählt das Feld); ein Klick ins Leere schließt sie wie bisher.

- **Halbe Haut, der große Umbau (D1, Teil 4, 18.11.): bauen oder streichen?** Die Rechnung läuft jetzt fast ganz auf der Hälfte
  (Löser seit dem 13.11., Gewichte und Vermessen seit heute). Das Netz selbst zur Hälfte umzubauen brächte noch höchstens rund ein
  Zehntel einer Runde, ist aber der größte und heikelste Umbau im Plan, und die Pose mit zwei freien Seiten und „Clipping aus“
  im Spiegel-Schalter brauchen das ganze Netz. Ich habe ihn nicht begonnen. Mein Vorschlag: streichen; das Tempo für große Formen
  kommt aus E2 (der Löser rechnet neben dem Bild). Zahlen im Plan unter D1.

- **Etappe E (18.11.): Reihenfolge und Freigabe.** E1 (Haut auf der Grafikkarte) und E2 (Löser neben dem Bild) sind nicht
  gebaut. Für 120 Bilder je Sekunde im Zug muss der Löser aus dem Bild (E2); E1 allein reicht nicht und ändert den Look der Haut
  (anderes Flächenstück als heute). Kleiner Plan mit Messung und Beweis:
  [`2026-11-18-ozzy-loeser-neben-dem-bild.md`](2026-11-18-ozzy-loeser-neben-dem-bild.md). Mein Vorschlag: E2 zuerst, E1 danach
  mit Vergleichsbild.

## 2. Kurvennetz im Raum: Unterschiede zur Studie

Er, 17.11.: „Ist erstmal ok so. Ich seh noch unterschiede zur studie in der ich es erarbeitet habe. Aber notiere das für den
feinschliff.“ Vergleichsbild und meine Liste (von ihm nicht bestätigt) stehen im Plan unter B3. Zuerst an dem Bild mit ihm
durchgehen, nicht raten.

## 3. Zurückgestellt aus den Etappen A und B

- **A4:** die gedrehte Haut in der Pose merken (statt rund zwölfmal je Bild zu drehen); Vergleichsbild zum Weichzeichner.
- **A2:** Vergleichsbild zu den Spiegelungen (rundere Normalen).
- **B2:** der weiße Körper auch an den Wänden des Raums (Vergleichsbild zuerst); beim Drehen der Ansicht nur die Lagen der Linien
  durch die Abbildung schicken, statt alles neu zu bauen; Wand und Kistennetz auf dieselbe Art Abbildung.
- **B3:** mit P auf der Form im Raum zeichnen; das Feld des Raums in den Vier Ansichten; auf der Fahrt in eine Ansicht bleibt das
  Kurvennetz (heute blendet es aus, die Seifenhaut übernimmt); Linien ziehen und Richtungen drehen im Raum eigens prüfen.
- **B4:** Hinweiszeile (nur, was unter dem Zeiger gerade möglich ist); Meldungen, die mit ihrem Anlass verschwinden; ↩ an der
  Silhouette hält 110 bis 220 ms an (vorher rechnen); Drehen und Aufklappen als eine Bewegung; die Enden eines Rings in Front und Top
  löschen; ein Klick an einer Kreuzung wählt den Punkt der anderen Linie (dann fehlt der Tropfen „Maul“; gehört zur Sitzung für das
  Maul).
- **B1:** Mit einem schwebenden Stift (iPad) sitzt der gezeichnete Zeiger nach dem Loslassen neben der Spitze, bis sie sich bewegt:
  nicht geprüft, nicht angefasst. Der Knopf „Netz“ ist am Gerät nicht geprüft.

- **C1 (18.11.), Zug mit dem Einfluss O:** Sein Ergebnis hängt davon ab, wann das feinere Netz eingewechselt wird (1,4 Einheiten
  auf 119). Ursache: Der Zug wird beim Einwechseln vom verformten Stand neu gestartet und vermisst den Einfluss neu. Lösung: Der
  neu gestartete Zug behält die Gewichte vom ersten Greifen (Plan, C1, „Offen“). Greift tief in den Zug ein; nicht gebaut.
- **C1 (18.11.), Rechnung über die ganze Haut:** Sie ist nur noch Rückfall (ein Punkt ohne Spiegelbild, `?halb=0`) und klappt die
  Kanten der Mittelebene weiter wie bis zum 17.11. Mit D1 (das Netz als Hälfte) fällt sie weg.
- **C1 (18.11.), Nadeln:** An der Spitze einer flachen Flosse bleibt ein fast flächenloses Dreieck, dessen Gewicht nach der
  Geometrie riesig wird (112 gegen sonst 0,2 bis 3). Die Schrittweite fängt es auf; sauberer wäre, solche Dreiecke gar nicht
  entstehen zu lassen (das Netz teilt an stark gekrümmten, dünnen Rändern bis auf Kanten um 1 Einheit herunter).

- **C2 (18.11.), Richtungen beim Zeichnen mit P:** Ungleich lange und mit ⌥ geknickte Richtungen gehen im Entwurf des Werks
  verloren (je Punkt eine Richtung nach beiden Seiten oder eine Ecke). Zu bauen: der Entwurf (`StiftAnker`) mit eigener Richtung
  je Seite, `werkBlatt.griffeLetzter`, `griffeErster` und `knickSetzen` füllen sie, `stiftStueck` liest sie; danach prüfen, dass
  eine geschlossene Form (`griffeAusZeichnung`) den Knick als Ecke nimmt.
- **C2 (18.11.), Vier Ansichten:** Im Feld der Front (und für manche Striche im Feld des Top) ist neben der Form kein Platz für
  einen Anfang im Leeren; ein Strich quer über die Form lässt sich dort nicht beginnen. Abhilfe wäre ein Rand um die Form im Feld
  oder ein Strich, der am Rand des Felds beginnen darf.
- **C2 (18.11.), sehr flache Kreuzung:** Streift ein neuer Loop eine vorhandene Linie fast längs, bleiben zwischen den Linien
  schmale Dreiecke, die verkehrt liegen können (alle Ecken auf Linien). Sauber wäre, den neuen Loop dort ein Stück auf der alten
  Linie laufen zu lassen oder die zwei Punkte zu verschmelzen.

- **C4 (18.11.), Felder im Raum:** An der Seifenhaut im Raum gibt es keine Felder (dort zieht der Pinsel). Zu bauen wären der
  Treffer mit dem Strahl der Kamera (`werkHautTreffen` gibt es) und eine Tönung auf der Seifenhaut (ihr Netz ist dasselbe).
- **C4 (18.11.), Zeichen unter dem Zeiger:** Über einem Feld zeigt nichts, dass ein Klick es wählen würde (über Punkten und Linien
  hängt ein Tropfen). Ein leichter Hauch der Tönung unter dem Zeiger wäre ein Treffer je Bild (0,2 bis 0,5 ms bei 25 000
  Dreiecken); nicht gebaut.
- **C4 (18.11.), iPad:** Tippen wählt ein Feld, Ziehen bewegt es (wie mit der Maus; am Gerät nicht geprüft). Für G, S, R fehlen
  Knöpfe unten.
- **C4 (18.11.), ⌘Z:** Nach ⌘Z ist nichts mehr gewählt (das Verhalten räumt die Auswahl auf, wie bei Punkten); das Feld muss neu
  geklickt werden.
- **C4 (18.11.), R um 90°:** Dreht man die Punkte eines Felds weit (in der Probe 90°), verknoten sich die Linien mit ihren
  Nachbarn, und die Punkte landen nicht mehr starr gedreht. Bei 30° ist die Drehung genau. Wie bei jedem weiten Zug.
- **C4 (18.11.), Ziehen während einer Fahrt der Ansicht:** Läuft gerade eine Fahrt in eine Ansicht (nach 1, 3, 7 oder nach dem
  Wenden), dreht ein Ziehen nicht (die Fahrt setzt die Drehung in jedem Bild neu). Das war schon so; aufgefallen, weil ⇧ + Klick bis
  heute immer eine solche Fahrt auslöste (jetzt nicht mehr, wenn er ein Feld umschaltet).

- **D1 (18.11.), Greifen:** Das Bild beim Drücken auf einen Punkt und das erste Bild des Zugs brauchen zusammen 60 bis 100 ms
  (Plan, D1 Teil 2). Vor der Bewegung der Hand, aber zu spüren, wenn man es weiß.
- **D1 (18.11.), Einwechseln im Zug:** Jeder Wechsel auf ein feineres Netz kostet ein Bild von 25 bis 55 ms. An „maul handgemacht
  test“ kommen am Anfang eines Zugs zwei bis drei solche Wechsel (dort kommen Punkte dazu). Den größten Posten nimmt E1.
- **D1 (18.11.), Tiefenkarten:** Im Zug baut jetzt höchstens eine Karte je Bild neu (3 ms). Halb so teuer wäre sie, wenn nur die
  Dreiecke gezeichnet würden, die zum Betrachter zeigen.

## 4. Beobachtungen

- **17.11., Kurvennetz im Raum:** Der Umriss des weißen Körpers zeigt an „strange bird“ zwischen den Finnen einen kurzen Strich und
  einen Punkt, die für sich stehen (ein Stück innerer Umriss; Bild im Verlauf der Sitzung). Nicht untersucht.
- **17.11., ⌘Z:** Die Spitze eines sehr schmalen Zugs beginnt ihr Zurückfließen etwas runder, als sie war (Umriss und Linie liegen im
  ersten Bild knapp auseinander).
- **17.11., Zeiger-Film:** eine Nachstellung; wie viele Bilder ein gezeichneter Zeiger wirklich nachhängt, ist nicht gemessen.
- **18.11., gekreuzte Linie:** Zieht man einen Punkt weit über seinen Nachbarn hinaus, schlägt die Linie eine Schlaufe; das Werk
  meldet es und räumt mit Absicht nicht auf (Regel vom 11.11.). In der Probe der gewöhnlichen Züge passiert das bei zwei von neun
  Zügen schon mit 12 Bildpunkten an der Wand (am Schnabel von „strange bird“, an einer Flosse von „teat firefish“). Wenn dir das
  beim Arbeiten oft begegnet: sagen, dann lohnt ein Blick darauf, ob die Meldung deutlich genug ist.
- **18.11., frische Form:** Nach dem ersten Zug an einer Form mit nur einer Linie liegen manchmal 2 winzige Dreiecke verkehrt
  (Probe „werk“, 2 von 3 Läufen); das nächste Aufräumen richtet sie auf.
