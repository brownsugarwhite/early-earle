# Studio, Entwurf A: Florians Werkbank

Stand 20.11.2026. Einer von drei Konzeptentwürfen für „Studio“. Blickwinkel: wie Florian heute im Werkzeug der Kopfdrehung arbeitet
(an einer Stelle formen wie in Illustrator, alle Schlüssel mit Herkunft auf einer Leiste, Zwiebelhaut, J und K). Belege:
„(Gesamtbericht 3.2)“, „(06 §2.6)“; eigene Schätzungen sind markiert. Es gelten die vorläufigen Entscheidungen des Auftrags.

## 0 Kurzfassung

**Studio** ist ein Editor für Vektorfiguren, Posen, Übergänge, Physik und Spiellogik, in dem alles mit fünf Handgriffen geht, die
Florian schon kennt: **hingehen, formen, vergleichen, spielen, zurück**. Leitsatz: *Wer die Kopfdrehung formen kann, kann alles
formen.* Das Spiel läuft auf derselben Bühne mit derselben Laufzeit.

1. **Die Leiste ist der Ort.** Unter der Bühne liegt immer eine Leiste mit einer Achse; ein Tropfen markiert die Stelle. Die Bühne
   wählt Dinge, die Leiste wählt die Stelle, und jeder Zug landet dort. Vor dem Zug zeigt Studio, wo er landet und welche gebauten
   Schlüssel er ersetzt (9.2).
2. **Leisten statt Zeitleiste.** Zeit ist eine von neun Achsen und erscheint nur in gestalteten Übergängen. Ein Schlüssel ist die
   ganze Form eines Teils an einer Stelle; Spuren je Regler gibt es als zweite Ebene (1).
3. **Posenkarten, Brücken, Tafel.** Jede Pose geht über eine Feder (Dauer, Federung) in jede andere; der erste Zug in einem Übergang
   macht ihn zum gestalteten Übergang mit Zwischenposen. Die Tafel zeigt nur Paare, die im Spiel vorkommen (5).
4. **Eine Form, viele Zustände.** Jede Formänderung ist ein Delta auf derselben Ankerliste; P setzt und löscht Anker in allen
   Zuständen. Neue Formen mischen „Rahmen + Rest“; seine Kopfdrehung bleibt, bis ein Vergleichsbild entscheidet (2).
5. **V posiert, A formt.** Mit V zieht Florian Teile, und die Knochen folgen; mit A formt er Anker und Griffe, gespeichert im
   Ruheraum. Knochen sieht er nur zum Riggen: ein Knopf, Probewackeln, Ringe ziehen (3, 4).
6. **In Ruhe ist Ozzy seine Zeichnung.** Physik, Effekte und Übergänge schreiben nur Abweichungen, die in Ruhe null sind; ein
   Ruhe-Wächter prüft jede Vorlage und jede Pose bildgenau (2, 6, 7).
7. **Physik und Logik ohne Code:** Box2D-Welt plus eigene Figurphysik in einem 60-Hz-Takt; Bausteine, Drähte und Regeln in drei
   Satzarten (6, 8).
8. **Spielen und Anhalten auf derselben Bühne.** Angehalten zeigt Studio alle Stellen, die das Bild bestimmen; Florian wählt eine und
   formt. Der Mitschnitt ist wieder eine Leiste (9.5 g).
9. **Demo „Gassirunde“**, ganz mit Studio gebaut (11).

**Besser als Spine und Rive:** vektornativ mit Verschmelzen und Verjüngungen; Übergänge mit Zwischenposen, Kontakten und Marken statt
Mischzeit (Spine) oder Überblenden (Rive); Physik, die in Ruhe null ist (Rive hat keine); kein Setup/Animate- und kein
Design/Animate-Modus; jeder Schlüssel zeigt seine Herkunft; Logik als Sätze statt Graph; Mac und iPad mit Stift. Der Preis: viel
eigener Code und eine Wette auf die Leiste als Ort (14).

## 1 Zeitmodell

Florians Leiste in der Kopfdrehung hat schon den Winkel als Achse, nicht die Zeit: Klick springt, Ziehen dreht, J und K springen, Z
zeigt die Nachbarn, ein Zug wird ein Schlüssel an dieser Stelle (Übergabe ozzy-figur). Das ist ein Reglerraum mit der Bedienung einer
Zeitleiste (04 §5). Studio macht diesen Zwitter zum Prinzip.

### 1.1 Gegenüberstellung

Nach 05 §4.1 und Gesamtbericht 3.1; die letzten beiden Zeilen sind eigene Einschätzung. ++ sehr gut, + gut, o mittel, − schwach,
−− ungeeignet.

| Kriterium | Klassische Zeitleiste (Spine, Rive, After Effects) | Zustandsgraph (Rive, Unity) | Reglerraum allein (Live2D) | Aufnahme (Procreate Dreams) | **Werkbank** |
|---|---|---|---|---|---|
| Reaktion auf das Rad, ohne Ende | −− | + | ++ | − | ++ |
| Jede Pose in jede andere | − | o | o | − | ++ |
| Timing eines Gags | ++ | − | − | ++ | + |
| Viele Teile mit Versatz | ++ | − | − | o | o |
| Gleichlauf mit Ton | ++ | o | − | + | + |
| Bleibt auf seinen Schlüsseln | o | − | ++ | o | ++ |
| iPad mit Stift, iPhone | − | o | + | ++ | + |
| So arbeitet Florian heute | o | − | + | − | ++ |
| Übersicht bei rund 35 Posen | − | − | o | − | + |
| Bauaufwand | gering | mittel | mittel | mittel | mittel bis hoch |

### 1.2 Wo die klassische Zeitleiste gewinnt

- **Viele Teile mit genauem Versatz** („Ohr drei Bilder nach dem Kopf“): dort ein verschobener Schlüssel, in Studio Nachlauf je Teil
  oder eine Spur in der zweiten Ebene, ein Griff mehr.
- **Szenen mit mehreren Dingen** (Ankunft: Ozzy setzt sich, die Kamera zieht auf): Studio nimmt den Regie-Übergang (5.3), eine kleine
  Zeitleiste, bewusst nur dort.
- **Ton genau im Bild:** Marken reichen für Tapp und Plumps; für Lippensynchronität wäre die Zeitleiste besser. Ozzy spricht nicht.
- **Vertrautheit:** Wer aus Spine oder Blender kommt, kennt Spuren.
- **Eine Spanne als Ganzes sehen:** Studio zeigt sie nur innerhalb eines Übergangs.

Für einen Kurzfilm wäre Studio das schlechtere Werkzeug, für eine Spielfigur, die fast nur auf das Rad reagiert, das bessere
(05 §5.1).

### 1.3 Entscheidung: Leisten statt Zeitleiste

**Eine Leiste, neun Achsen**, Zeit ist eine davon:

| Achse | Beispiel | bewegt von | ein Zug mit A legt an |
|---|---|---|---|
| Ansicht (rund) | Kopf θ, Körper ψ | Hand, Pose, Blickziel | Ansichtsschlüssel |
| Gelenk | Kniewinkel | Knochen | Korrekturform |
| frei | Maul, Augen zu | Hand, Pose, Regel | Formziel |
| Physik | Ohr schwingt, Stauchung | Feder | Schlüsselform |
| Spiel | Neigung, Balance | Draht | Schlüsselform |
| Phase (rund) | Schritt, Trab | Weg oder Zeit | Zwischenpose im Zyklus |
| Übergang | Stehen → Sitzen | Zeit | Zwischenpose |
| Mitschnitt | die letzten 20 s im Spiel | Spulen | nichts; Anhalten öffnet die Stellen-Wahl |
| Strecke (rund) | Radwinkel mit den Dingen am Rand | Rad | Lage eines Dings |

- **Überall dieselbe Bedienung** (9.1): Klick springt, Ziehen fährt, Formen setzt an der Stelle einen Schlüssel, J und K springen, Z
  zeigt die Nachbarn, ⇧Z die Bahnen. Ein Feld mit zwei Achsen (Balance; höchstens 3 × 3, 04 §6) bedient sich gleich.
- **Ein Schlüssel ist die ganze Form eines Teils an einer Stelle**, nie eine Koordinate. Die Leiste zeigt eine Summenzeile und die
  Zeile des gewählten Teils; ⌄ klappt alle Teile auf, wie heute.
- **Herkunft** (12 §5.6): ◆ Vorlage, ◇ gebaut, ◈ seins (blau), · Falte, │ Wechsel, ≈ Aufnahme. Seine Schlüssel überschreibt keine
  Automatik.
- **Zeit nur, wo erzählt wird.** Reaktionen haben Federn (5.2); Zeit gibt es nur in Übergang, Phase und Mitschnitt. **Aufnahme** ist
  eine Eingabe: ● scharf schalten, abspielen, am Anfasser ziehen; Studio glättet und dünnt aus (05 §5.9). **Zeit als Raum** zeigen
  Bahnen, Zwiebelhaut und die Spur der Zukunft (12 §6.13).

## 2 Formen und Morph

- **Form:** geschlossener Pfad aus Ankern (glatt oder Ecke). Griffe liegen relativ zum Anker: am glatten Anker ein Winkel und zwei
  Längen, an der Ecke je Griff Winkel und Länge; so steht die Glätte im Format (Gesamtbericht 3.8). Dazu die **Linie mit
  Breitenprofil** für Maul und Lider (10 §8.3).
- **Eine Form, viele Zustände** (06 §10): Alle Formänderungen sind Deltas auf derselben Ankerliste; die Zuordnung ist Identität.
- **Anker mit P** wie in Illustrator: Auf der Kurve setzt P einen Anker in allen Zuständen an derselben Stelle (Stück, Parameter),
  formtreu nach de Casteljau (06 §1.2). Auf einem Anker löscht P ihn; vorher zeigt die Leiste die Abweichung je Schlüssel rot. Ein ⌘Z.
- **Fremde Formen:** eine SVG auf eine Stelle der Leiste fallen lassen; ein Assistent gleicht Laufrichtung, Startanker und
  Ankerzahl an (06 §1.2), farbige Paarmarken lassen sich umsetzen.
- **Zwei Mischarten, bewusst:** „heute“ (PCHIP je Koordinate) für seine Kopfdrehung, „Rahmen + Rest“ (06 §2.6) für alles Neue;
  gewechselt wird nur nach Vergleichsbild und auf sein Wort (Gesamtbericht 3.2 a). Runde Achsen mischen periodisch, seine
  Kopfdrehung erst nach seinem Blick auf die langsame Drehung über die Front (04 §7.3).
- **Falten** sind verschiebbare, formbare Punkte auf der Leiste; Wächter setzen rote Striche und reparieren nie still (06 §3).
  **Wechsel** sind Schlüssel mit Breite, 0 = hart an verdeckter Stelle (Gesamtbericht 4.6 Nr. 21). **Spiegeln** ist eine Eigenschaft
  der Achse, je Teil abschaltbar.
- **Mehr Achsen ohne Explosion:** eine volle Hauptachse je Teil; Maul und Augen als Zusätze im mitlaufenden Rahmen (04 §7.4); streiten
  zwei Achsen, hilft ein Kreuzschlüssel (03 §11.5).
- **Fang:** Ein Zug im Fang eines Schlüssels ändert diesen, sonst entsteht ein neuer; bei θ 4° wie heute, sonst rund 1 % des Bereichs
  (eigene Schätzung). Gebaute Schlüssel im Fang fallen weg und sind vorher rot umrandet; seine nie.
- **Ruhe ist Zeichnung:** Ein Ruhe-Wächter vergleicht beim Speichern jede Vorlage und jede Pose in Ruhe bildgenau mit dem freigegebenen
  Bild, wie Probe A des Prototyps (Übergabe ozzy-figur).

## 3 Knochen und Gewichte

- **Drei Knochenarten nach Teil** (Gesamtbericht 3.2 c): starr (Kopf, Nase, Bart; die Naht schließt das Verschmelzen), Biegeachse mit
  fester Länge und dem Ende als Ziel (Beine, Schwanz, Ohren ohne Schlüssel, Rumpf; das Rückgrat des Prototyps verallgemeinert),
  gewichtete Knochen mit Drehzentren (Bohne, Hals; lineares Mischen als Schalter). Höchstens vier Knochen je Anker.
- **Gewichte, eine Regel** (Gesamtbericht 3.3): Griffe erben die Abbildung ihres Ankers. Weicht Florian ab, bekommt ein glatter Anker
  einen Satz für sein Griffpaar (er bleibt exakt glatt), eine Ecke einen je Griff. Glätte-Schutz nur, wo eine Stufe die Glätte
  verletzt; Vorschläge aus dem Kurvenpunkt bei t = 1/3 und 2/3.
- **Gewichte sehen und ändern** (Linse Knochen): Knochen antippen, nur er leuchtet; Anker zeigen Füllringe, die Fläche Wärme
  (01 §5.3). Anker senkrecht ziehen ändert das Gewicht. Ein Schloss am Anker heißt „Griffe erben“; Tippen gibt dem Griffpaar einen
  eigenen Satz. W malt als Fachwerkzeug.
- **Zusammenspiel** in fester Reihenfolge (Gesamtbericht 4.4): Ansichts-Morph → Gelenke reiten auf der gemorphten Elternform
  (07 Schritt 7) → Deltas im Ruheraum → Skinning → flüchtige Schritte (in Ruhe null) → Wächter → Bild. Die Physik läuft vor den
  Korrekturen, damit ein schwingender Schwanz seine Korrektur auslöst (Gesamtbericht 4.6 Nr. 11).
- **Für Florian heißt das nur: Er formt, wo er sieht; Studio speichert in der Ruhe** (03 §11.4). Eine Korrektur am Knie dreht mit dem
  Unterschenkel.
- **Korrekturform**, bedient wie die Kopfdrehung: den Gelenkwinkel in den Eigenschaften auf die Leiste holen, mit V auf 90° biegen,
  mit A formen. Streiten zwei Achsen, bietet der Geltungs-Chip „nur in dieser Kombination“ an (Kreuzschlüssel).
- **Posieren mit V** (Linse Form): Ein Teil folgt dem Zeiger, so weit sein Gelenk es zulässt (starr: Drehung; Biegeachse: Ende als
  Ziel, Länge bleibt; Wurzel: verschiebt). **Anfasser:** Ein Ring an der Nase stellt θ, einer an der Pfote setzt ein Ziel (04 §7.9).
- **Später:** „Pose zeichnen, Studio zerlegt“ (06 §6.4) als Chip „als Drehung in den Knochen legen“.

## 4 Autorig

- **Verfahren** nach 07 §4: Teile-Graph (Aufsatz, Verbund, Füllteil, Gelenk), Vorlage als Daten (Vierbeiner zuerst), Achse je Teil;
  Rollen über die Ungarische Methode in beiden Blickrichtungen; Namen nur als Hinweis.
- **Gewichte:** Biegeachsen ohne Gewichte (Lage längs und quer), Ketten mit weichen Stufen so breit wie das Glied dick, Wärme für runde
  Teile, BBW nur bei Bedarf (Gesamtbericht 3.4 b). Aufsätze und Füllteile erben; einen Anker fügt er nur nach einem Ja ein.
- **Nebenprodukte:** Fußziele, Federketten, Masse und Schwerpunkt, Seiten und Paare, Rollen als Adressen für Regeln.
- **Bedienung:** ein Knopf, Probewackeln, Fragezeichen nur bei Unsicherheit, Ringe ziehen, Stecknadeln, ein ⌘Z (9.5 b). **Er rechnet
  nie von selbst nach** (13); der Prüfer meldet Gelenke, die nach einer Formänderung nicht mehr passen.
- **Technik und Zeitpunkt:** deterministisch im Worker, Budget 50 ms (14c §6.3, nicht gemessen). Bis zur Spielwiese trägt Ozzys
  Handrig aus `haltung.ts`; der Autorig kommt mit der Katze (Gesamtbericht 4.7). Probe nach 07 §9.

## 5 Posen und Übergänge

### 5.1 Posen

- **Pose** = benannter Stand der Regler und Knochen einer Schicht, wahlweise mit Posenkorrektur; die **Grundform** ist die erste
  Posenkarte.
- **Drei Schichten:** Körper, Kopf und Blick, Gesicht; darüber die Physik, die nicht posiert wird (05 §5.6). Eine Gesichtspose mischt
  sich mit jeder Körperpose: 12 statt 60 Posen (05 §4.5).
- **Posen-Reihe** über der Leiste, je Schicht; in der Schicht Körper nach Zustand des Vierbeiners gruppiert (Stehen, Gang, Sprung,
  Panne, Erholung), damit rund 35 Posen lesbar bleiben.
- **Posen wie Folien** (Keynote; 12 §2.4): ＋ hält fest, Halten verdoppelt, Antippen geht über den Übergang hin, nach oben ziehen
  mischt stufenlos; die Karte **Probe** speichert nie.

### 5.2 Standardübergang

- **Trägheits-Ausgleich im Reglerraum mit Feder** (05 §4.3): Versatz und Geschwindigkeit beim Wechsel klingen ab, das Ziel läuft
  unverändert. Jede Zwischenstellung liegt auf seinen Schlüsseln; jeder Wechsel ist umlenkbar und behält den Schwung.
- **Dauer und Federung** (0 % = kein Überschwingen; Gesamtbericht 4.6 Nr. 7), global und je Paar; Start wie heute 0,7 s, weich
  (`steuerung.ts`).
- **Nachlauf je Teil** (Kopf, Ohren, Schwanz, Bart kommen später an) gibt Überlappung ohne Schlüssel (05 §5.5). Runde Achsen nehmen
  den kürzeren Weg; jede Achse hat eine Höchstgeschwindigkeit (Kopf 160°/s wie heute).

### 5.3 Gestalteter Übergang

**Er entsteht durch den ersten Zug** an einer Stelle eines Standardübergangs; dort liegt dann eine Zwischenpose, und die Leiste zählt
Sekunden. Einen Schritt „Übergang anlegen“ gibt es nicht.

```
Übergang Stehen -> Sitzen, Variante "mit Hüpfer"               0,54 s, Nachklang 0,7 s
Posen     [Stehen] -- weich 0,20 s -- [Ausholen] -- linear 0,34 s -- [Sitzen]
Zusätze                                 Hüpfer _/^\_             Plumps v
steht     === alle Pfoten ===           ====== Vorderpfoten ============
Marken                                                           (Tropfen) Plumps: Klang, Ereignis
v Spuren  (Kopf θ, Ohr A schwingt)
```

Nach seinem Ablauf „huepfer“ in `ablauf.ts`; „Ausholen“ ist dort 72 % Stehen und 28 % Hocke.

- **Zwischenposen** sind Karten auf der Zeit; jeder Zug legt eine an oder ändert die im Fang. Sie tragen Regler, Knochen und
  Formdeltas; eine eigene Übergangsform gibt es nicht (13).
- **Abschnitte:** Dauer durch Ziehen der Kante, Kurvenart durch Halten (weich, fallen, auf, linear, Feder), ein Verteilungs-Regler
  statt Kurvengriffen (05 §5.5).
- **Zusätze** (Hüpfer, Plumps, Seufzer, Wedeln) als Blöcke; **„steht“** als Balken je Pfote, die Figur verschiebt sich als Ganzes;
  **Marken** mit Klang und Ereignis, die erst ab halbem Gewicht feuern (14d §3.3); **Spuren** als zweite Ebene.
- **Unterbrechen:** sofort (Standard), am nächsten Halt, nie. **Umkehren** nur als Option. **Varianten** mit Gewicht.
- **Regie-Übergang:** Er darf Spuren beliebiger Regler tragen (Kamera, Himmel, Katze): die kleine Zeitleiste für Szenen.
- **Feder nur beim Wechsel:** Heute läuft jede Haltung hinter einer Feder mit 16/s her, die Zeiten um rund 0,125 s verschiebt
  (05 §7). In Studio folgen gestaltete Übergänge ihrer Zeit genau; der Plumps sitzt im Bild des Bodenkontakts.

### 5.4 Jede Pose in jede andere: die Tafel

Gespeichert wird „Standard plus Ausnahmen“ (Gesamtbericht 3.1); die Brücken der Posen-Reihe zeigen die Ausnahmen, die **Tafel** ▦
die Paare.

```
von \ nach   Stehen     Hocke    Sitzen     Liegen      Diener
Stehen       ~ Atmen    .        G2         G2          .
Hocke        .          ~        .          > Diener    .
Sitzen       G          .        ~          G           .
Liegen       G          #        G          ~           .
.  Standard   Gn  gestaltet, n Varianten   > X  über X   ~  Verweilen   #  kommt nicht vor
```

Nach den fünf Haltungen und acht Abläufen des Prototyps (`ablaufFuer`).

- **Die Diagonale ist das Verweilen** (Atmen, Schnüffeln, Wedeln; 05 §5.5).
- **Nur erreichbare Paare:** Studio leitet aus den Zuständen des Vierbeiners (08 §9.6) und den Regeln ab, welche Paare vorkommen
  können; die übrigen Zellen sind gerastert. Was das Spiel nie verlangt, muss Florian nicht gestalten.
- **Zellen** zeigen einen Filmstreifen; Antippen spielt, Doppeltippen öffnet auf der Leiste. „Über X“ setzt Wege zusammen (05 §5.5).
  Läuft das Spiel, wechselt Antippen einer Karte die Pose aus jeder Lage (12 §6.9). Auf dem iPhone ist die Tafel eine Liste.

### 5.5 Zyklen und Gang

Ein **Zyklus** ist eine Posenkarte mit ↻; seine Leiste ist die Phase. Die Balken „steht“ darin sind die Kontaktphasen der Pfoten:
Der Schrittplaner setzt die echten Kontakte, die Phase wird bei jedem Aufsetzen auf die gezeichnete Stelle gezogen, Standpfoten
rutschen nie (Gesamtbericht 4.6 Nr. 16). Der Gang läuft nach dem Weg auf dem Rad (04 §7.8); ein Draht von Ozzys Tempo mischt Schritt,
Trab und Galopp.

## 6 Physik

- **Ziel, Feder, Wirklichkeit** (08 §9.1): Posen geben Ziele, die Physik ist die Wirklichkeit, Federn mit Spannung verbinden beides.
  In Ruhe ist jede Abweichung null.
- **Weg B** (Gesamtbericht 3.5, 14a): Box2D 3.2 rechnet Rad (dynamisch, Radgewicht), Finger, Brust, Becken und Kopf mit
  Gelenkzielen, Federbeine, Vortrieb als Kräftepaar, Sturz und lose Dinge; eine eigene XPBD-Schicht rechnet Ohren, Bart, Schwanz,
  Stauchung, Gelee. Ein 60-Hz-Takt mit vier Teilschritten; Freigabe nach P1, Rückfälle Rapier, dann B′.
- **Physik als Chips** mit denselben zwei Reglern wie Übergänge, Dauer und Federung (innen f = 1/Dauer, ζ = 1 − Federung;
  Gesamtbericht 4.3 Punkt 7, zu prüfen): **Schwingen** (Pendel zwischen seinen Schlüsseln, 9.5 e), **Kette**, **Stauchen**,
  **Gelee** (nie im Gesicht), **fest, lose, schwer**. Startwerte aus 08 §9.7, ungemessen (Ohren: Dauer 0,4 s, Federung 65 %); drei
  Charakter-Regler bündeln Werte.
- **Körper auf dem Rad:** Die Lage ist das Gaspedal; Bremskraft und Haftung sind Regler je Welt (Garten 0,3 g); eine Schwerkraft je
  Welt (Gesamtbericht 4.6 Nr. 22). Stürze sind eine aktive Ragdoll auf seine Sturzposen, das Aufstehen passt zur Lage (08 §7).
- **Prüfstand in der Linse Physik:** Unter dem Finger liegt der Körper; Ziehen stößt an, Ziehen am Ohr schnippt es. Dazu Schütteln,
  Wind, Röntgen, Zeitlupe, Einzeltakt, Spulen, „zehnmal gleich“. **Z zeigt hier die Spur der Zukunft.** **Aufnehmen** macht aus einem
  Physiklauf einen gestalteten Übergang mit Schlüsseln der Herkunft „Aufnahme“, die er nachformt.
- **Beim Formen ruht die flüchtige Schicht;** ihre Abweichung bleibt als blasser Umriss stehen und wird nie gespeichert
  (Gesamtbericht 4.4).

## 7 Effekte und Rendern

- **Renderer:** der Abstandsfeld-Renderer des Prototyps nach Stufe 1 (10 §8.5): Felder nur im Rahmen jeder Figur, feste Stückzahl,
  Verschmelz- und Ebenenmodell als Daten. Halbe Feldauflösung nur nach Vorher-Nachher-Bild; WebGL2 jetzt, WebGPU später
  (Gesamtbericht 3.6).
- **Effekte als Chips:** Wo (eine Auswahl), Profil über dem Abstand, Antrieb (fest, Schlüssel, Pose, Spielwert; 10 §8.4). Zuerst
  Stärke und Weichheit, das Profil unter „Mehr“; schlüsselbar wie alles.
- **Auf Ozzy** nur, was das Logo erhält: Verschmelzen, Dickenregel (Verjüngungen statt Outline), Kantenglättung mit Spitzenregel,
  Kontaktschatten, Beinschattierung in Bewegung. Schmierbild, Aufprallbild und Velocity Skinning bleiben auf der Figur aus, bis er sie
  will (Gesamtbericht 4.6 Nr. 19). **Um ihn herum frei:** Staub und Tropfen als verschmelzende Kreise, Pfütze als Zone mit Höhenfeld
  (14a Empf. 11), Himmel. Keine Nachbearbeitung.
- **Kostenampel „iPhone“** oben (14c Empf. 12), bis zur Messung nach der Regel aus 14c §6.4. **Export** zuerst als Bildfolgen,
  Vektor nur mit gebackener Kontur.

## 8 Spiellogik ohne Code

Das Modell aus 14b (Gesamtbericht 3.9):

- **Bausteine** mit Reglern, Messwerten, Zuständen, Ereignissen, Befehlen: Vierbeiner, Rad, Ding, Zone, Zähler, Uhr, Kamera, Musik.
  Den inneren Automaten des Vierbeiners baut Florian nicht; er sieht ihn als Zustandsbild und hängt Posen an dessen Zustände.
- **Drähte:** Messwert → Kennlinie → Glätten → Regler. Vom Ausgang auf einen Regler ziehen legt den Draht; die Leiste des Reglers sagt
  dann „getrieben von Neigung“. Drähte schreiben nie Zustände.
- **Regeln** in drei Satzarten: **Sobald** (ein Ereignis, feuert einmal), **Solange** (Zustand, gibt den Kanal von selbst zurück),
  **Laune** (Ankündigung → Wirkung → Ende → danach, Ruhezeit; nur Sollwerte und Posen). Gebaut durch Tippen auf Dinge und Hineinziehen
  von Posenkarten in Lücken (9.5 f).
- **Vorrang** über fünf sichtbare Bänder (Körper, Regie, Spieler, Laune, Grund), kanalweise; das Rad ist kein Band. **Takt** mit
  Schnappschuss, Folgen im nächsten Takt, Zufall mit Saat je Regel, Schwellen mit Rückweg (14b §7.5 bis §7.9).
- **Stolpern** kommt aus der Physik des Vierbeiners, nie aus einer geschriebenen Tempo-Schwelle (14b §7.10).
- **Sehen:** Regeln leuchten nach Lage, eine Gedankenblase über Ozzy zeigt die Laune (nur im Editor), „Warum?“ und „Warum nicht?“ an
  jeder Änderung, „hier anhalten“ an jeder Regel. Der Prüfer meldet Kreise, Sobald mit Dauerwirkung und Launen ohne Ankündigung
  (14b §7.13). **Aufgaben** sind Sätze über Zähler mit Beweis-Lauf.

## 9 Bedienung

### 9.1 Grammatik

| Verb | Mac | iPad mit Stift | iPhone |
|---|---|---|---|
| hingehen | Klick auf Leiste, Karte, Raute; J, K; Komma und Punkt (⇧ fünffach) | Stift oder Finger auf Leiste und Karten | Finger |
| formen | Ziehen auf der Bühne mit V, A, P | Stift | Finger, grob |
| vergleichen | Z, ⇧Z | Knöpfe an der Leiste | Knöpfe |
| spielen | Leertaste spielt die Leiste; ▶ oben startet das Spiel | ▶ | ▶ |
| zurück | ⌘Z, ⇧⌘Z | zwei, drei Finger tippen; Pfeile | Pfeile |

- **Vier Gesten** (12 §6.2): Tippen wählt, Ziehen ändert an der Stelle, Halten zeigt mehr (am Mac auch Rechtsklick; ein Ringmenü),
  Doppeltippen geht hinein (Figur → Teil → Anker); Esc oder Tippen ins Leere geht hinaus.
- **Z zeigt die Nachbarn der Stelle:** Schlüssel davor und danach, die vorige Pose, die Nachbar-Zwischenposen, in der Linse Physik die
  Zukunft, im Mitschnitt die Ereignisse. Davor warm, danach kalt, wie heute.
- **Die Leertaste spielt, was die Leiste zeigt:** eine Achse fährt sie langsam ab (wie „Drehen ▶“), Übergang und Zyklus laufen in
  Schleife, der Mitschnitt läuft weiter oder hält an. Gehalten verschiebt sie die Ansicht, wie heute.
- **Werkzeuge** (12 §6.6): V posiert und bewegt Teile, A formt Anker und Griffe, P setzt (Anker; in der Linse Knochen Gelenke; in der
  Linse Spiel Zonen), ⇧C wandelt um, L ist das Lasso, W malt Gewichte. ⇧ rastet ein und wählt hinzu, ⌥ bricht Griffe. Griffe
  erscheinen als Nadel und erst beim Halten als Haarlinie mit Perle, wie in der Linien-Studie.
- **Vier Linsen** (Form, Knochen, Physik, Spiel; Tasten 1 bis 4) bestimmen nur, was unter dem Finger liegt, nie, was eine Geste
  bedeutet; Halten schaut kurz hin.
- **B** blendet Griffe, Zwiebelhaut und Bahnen aus (reines Bild; formen geht immer). ⇥ blendet die Eigenschaften aus, ⌘K sucht
  Befehle, ? zeigt die Gesten. Alles kommt aus einem Befehlsregister (11 §10); die Belegung entscheidet Florian.
- **Schlüsselpunkt** neben jedem Wert der Eigenschaften (wie Rive): ○ ändert sich längs der Achse nicht, ◌ ändert sich, ● hier liegt
  ein Schlüssel. Einen Zustand „geändert, aber nicht gesetzt“ gibt es nicht.

### 9.2 Die Stelle: wohin ein Zug geht

**Die Bühne wählt Dinge, die Leiste wählt die Stelle.** Ein Teil antippen wechselt die Stelle nie; sie wechselt nur in der Leiste, der
Posen-Reihe, der Tafel oder an einem Wert der Eigenschaften. So kann Florian wählen, ohne zu verrutschen. Hängt das gewählte Teil nicht
an der Achse der Leiste (ein Bein am Kopfwinkel), landet der Zug in der aktiven Pose seiner Schicht; beides steht vor dem Zug in der
Statuszeile.

| Stelle | gewählt über | ein Zug mit A legt an | ein Zug mit V legt an |
|---|---|---|---|
| Grundform | erste Posenkarte | Änderung der Grundform | Ruhelage der Knochen |
| Pose | Posenkarte | Posenkorrektur | Stand der Pose |
| Achse und Wert | Leiste, Raute, J, K | Ansichtsschlüssel, Korrekturform, Formziel | Knochenstand an diesem Wert |
| Übergang und Zeitpunkt | Brücke, Zelle | Zwischenpose | Zwischenpose |
| dazu „nur in Pose X“ | Geltungs-Chip | Kreuzschlüssel | Kreuzschlüssel |

**Vier Signale:** (1) der **Tropfen** auf der Leiste, der beim Wechsel mit einer Feder hinüberfließt (liquid drop); (2) der **Rand**
der Bühne in der Farbe der Stellenart; (3) die **Statuszeile** wie heute („ändert: Kopf 150° · alle Posen“); (4) die **Vorschau vor
dem Zug**: Schwebt Maus oder Stift über einem Anker oder Teil, pulsiert der Tropfen, und Schlüssel, die der Zug ersetzen würde,
bekommen rote Ringe (heute die rote Zeile). Mit dem Finger erscheint das beim Aufsetzen.

**Geltungs-Chip** nach dem Zug, drei Sekunden: Wer ihn übergeht, behält, was die Leiste sagte. Er bietet nur weiter oder enger an:
„nur in Pose Sitzen“, „in allen Posen“, „am Knie bei 90°, überall“ (wenn das Teil an einem gebeugten Gelenk hängt), in der Grundform
„Posen gehen mit“ oder „Posen bleiben, wie sie aussehen“ (01 §5.3). Eine andere Stelle wählen verwirft nichts; die Karte Probe
speichert nie.

### 9.3 Bildschirmaufbau

**Mac.** Die Bühne nimmt mindestens drei Viertel ein; feste, einklappbare Bereiche, nichts schwebt (12 §5.3). Rechts die
Eigenschaften des Gewählten (häufige Werte mit Schlüsselpunkt, darunter „Mehr“); unten Posen-Reihe (= ist eine Brücke) und Leiste.

```
+--------------------------------------------------------------------------------------+
| Ozzy > Kopf > Ohr A   1 Form 2 Knochen 3 Physik 4 Spiel   iPhone grün  ▶  ⌘K  ...    |
+----+---------------------------------------------------------------+-----------------+
| V  | ändert: Kopf 150° · alle Posen                                | Ohr A           |
| A  | hier liegt: mein Schlüssel „Ohr dreht weg“                    | Form          ● |
| P  |                                                               | Verschmelzen  ◌ |
| ⇧C |                       B Ü H N E                               | Schwingen     ○ |
| L  |          (schmaler Rand in der Farbe der Stelle)              | + Verhalten     |
|    |                                                               | + Effekt, Klang |
|    |                                                               | Mehr            |
+--------------------------------------------------------------------------------------+
| Körper ▾  [Grundform] [Stehen]=[Sitzen] [Liegen] [Erschrecken] [Probe]  +    ▦ Tafel |
| Kopf θ ▾  ◆---◇--·--◆--◇--◈--◇---◈--◆----◇----◆     150°     J  K   Z  ⇧Z   ●   ⌄    |
|                                ▲ Tropfen                                             |
+--------------------------------------------------------------------------------------+
```

**iPad quer mit Stift** (zuerst als Safari-Web-App; 11 §8). Der Stift formt und wählt; ist ein Stift erkannt, bewegt der Finger nur
noch die Ansicht und bedient Leiste, Karten und Knöpfe (Gesamtbericht 4.6 Nr. 25). Ein zweiter Finger während des Stiftzugs rastet
ein; ⌥ ist ein Knopf links; Schweben zeigt die Vorschau; Trefferflächen 44 pt bei kleinen sichtbaren Punkten.

```
+----------------------------------------------------------------------------+
| Ozzy > Erschrecken   1 Form  2 Knochen  3 Physik  4 Spiel        ▶   ...   |
+-----+----------------------------------------------------+-----------------+
| V   | ändert: Übergang Stehen → Erschrecken · 0,24 s     | Zwischenpose 1  |
| A   |                                                    | Dauer   0,24 s  |
| P   |                  B Ü H N E                         | Kurve   weich   |
| ⇧C  |       Stift formt · Finger bewegt die Ansicht      | + Zusatz        |
| L   |   zweiter Finger beim Stiftzug: einrasten          | Mehr            |
| ↶ ↷ |                                                    |                 |
| ⌥   |                                                    |                 |
+----------------------------------------------------------------------------+
| Körper ▾  [Grundform] [Stehen]=[Erschrecken] [Sitzen] [Probe]  +         ▦ |
| Übergang  [Stehen]-- weich --[1]---- auf ----[Erschrecken]   ▶ J K Z ⇧Z    |
|                              ▲                                             |
+----------------------------------------------------------------------------+
```

**iPhone:** quer zum Spielen, hochkant zum Ansehen und für kleine Korrekturen (12 §5.9). Keine Werkzeuge: Der Finger posiert wie V,
Anker erscheinen nach Doppeltippen in ein Teil. Die Eigenschaften kommen als Blatt von unten, die Tafel ist eine Liste je Pose.
Angehalten setzt ein Knopf einen **Merker** (Saat, Eingaben, Takt), den der Prüfer am Mac mit „Zeigen“ genau nachspielt. Rechts die
Stellen-Wahl beim Anhalten, gleich auf allen Geräten (* Ereignis im Mitschnitt).

```
+--------------------------+    angehalten im Spiel (alle Geräte):
| Ozzy > Sitzen      ▶ ... |    +----------------------------------------------------+
|                          |    | angehalten bei 34,2 s        ▶ weiter   nochmal    |
|         BÜHNE            |    | Stelle: [Übergang Trab → Stolpern · 37 %]          |
|                          |    |    [Pose Stolpern 2] [Kopf θ 12°] [Ohr A 0,8]      |
| [Stehen][Sitzen][Liegen] |    | Mitschnitt --*------*---*--▲------     Merker      |
| ◆--◈--◇---◆   J  K  Z    |    +----------------------------------------------------+
+--------------------------+
```

### 9.4 Ding × Geste

Alles, was man anfassen kann. J, K und Z wirken immer auf das, was die Leiste zeigt.

| Ding | sieht man als (Linse) | Tippen | Ziehen | Halten | Doppeltippen |
|---|---|---|---|---|---|
| Figur | die Figur | wählt | V verschiebt, ⌥ dreht | Posen, Vorlage darüber, Export | Teile |
| Teil | Fläche (Form) | wählt; seine Zeile erscheint auf der Leiste | V posiert über das Gelenk | Verschmelzen, Ebene, Spiegeln, Chips, an Achse hängen | Anker |
| Anker | kleiner Punkt (Form) | wählt (⇧, L) | A verschiebt samt Griffen | glatt oder Ecke, löschen | – |
| Griff | Nadel (Form) | wählt | Richtung, Länge; ⌥ bricht | koppeln | rundet |
| Kurvenstück | Linie zwischen Ankern (Form) | wählt das Teil | A biegt es | Anker setzen | Anker setzen |
| Anfasser | Ring an Nase, Pfote (Form) | zeigt seine Achse | stellt θ oder das Ziel | lösen | – |
| Gelenkring | Ring (Knochen) | wählt den Knochen | verschiebt das Gelenk; am Rand weich oder hart | Rolle, starr, biegsam, Knie | Gewichte malen |
| Biegeachse | sich verjüngende Linie (Knochen) | wählt | biegt | Knie, Federkette | – |
| Anker mit Gewicht | Füllring (Knochen) | – | senkrecht: Gewicht | Schloss, spiegeln | – |
| Leiste | Lineal | springt hin | fährt den Wert | Bereich, rund, Spiegeln, wer treibt, Fang | groß |
| Schlüssel, Falte, Wechsel | Raute, Punkt, Strich | springt hin, wählt das Teil | verschiebt auf der Achse | Kurvenart, kopieren, spiegeln, löschen; Breite | Form allein |
| Posenkarte | Karte mit Bild | wird die Stelle | nach oben mischen, seitlich ordnen | umbenennen, verdoppeln, spiegeln, nur Teile | groß |
| Brücke, Zelle | Bogen, Feld mit Filmstreifen | zeigt oder spielt den Übergang | Dauer | Art, Unterbrechen, Varianten | Taktleiste groß |
| Zwischenpose, Zusatz, Balken „steht“ | Karte, Block, Balken auf der Taktleiste | springt hin, wählt | verschiebt; Kante = Dauer | Kurvenart, Stärke, Pfoten, löschen | – |
| Marke | Tropfen | spielt an | verschiebt | Klang, Ereignis, Chance | – |
| Chip | Chip am Teil oder Knochen | zwei Regler | Stärke | an, aus, auf Partner, in Schlüssel umwandeln | Expertenwerte |
| Wert in den Eigenschaften | Zeile mit ○ ◌ ● | Schlüssel setzen; Achse auf die Leiste | ändert an der Stelle | Kurve, wer treibt | – |
| Ausgang, Draht | Stutzen, Linie (Spiel) | Kennlinie zeigen | Draht legen, Kennlinie formen | glätten, lösen | – |
| Regel | Satz am Ding (Spiel) | Beteiligte leuchten | in ein anderes Band | bearbeiten, aus, hier anhalten, Warum? | öffnen |
| Baustein | Zeichen am Ding (Spiel) | Regler zeigen | – | Zustandsbild | – |
| Welt-Ding, Zone | Fläche, Bogen am Rand (Spiel) | wählt | auf dem Rand verschieben; Bereich | Material, Baustein, Regeln, verdoppeln | Form |
| Weltpfad | Rand des Rads (Form) | wählt | A formt Hügel und Lücken | – | Anker |
| Mitschnitt | Leiste im Spiel | springt in den Takt | spult | Saat, zehnmal gleich, aufnehmen | – |
| Prüfer-Hinweis | Zeile, roter Strich auf der Leiste | Zeigen | – | übergehen | – |

Wer zwei Zeilen kennt, errät die übrigen (12 §6.3).

### 9.5 Abläufe aus Florians Sicht

**(a) Aus seinen SVGs eine neue Figur.** (1) SVGs auf Studio ziehen; die erste wird die Grundform, Ebenen-Namen aus Illustrator
werden Teilnamen. (2) Weitere Dateien auf die Leiste fallen lassen: eine Ansicht auf „Ansicht 90°“, eine Pose auf ＋. (3) Studio
paart die Teile und gleicht die Anker an; Farbmarken zeigen die Paare, er kann sie umsetzen. (4) „Vorlage darüber“ zeigt, dass jede
Datei exakt getroffen ist. (5) Seine Dateien stehen als schwarze Rauten auf der Leiste, Studio baut helle Zwischenschlüssel; er fährt
ab, schaut mit Z und ⇧Z und formt, wo es ihm nicht gefällt.

**(b) Knochen vorschlagen und korrigieren.** (1) Linse Knochen, Knopf „Knochen vorschlagen“. (2) Knochen wachsen vom Rumpf nach
außen, Schilder nennen die Teile. (3) Drei Sekunden Probewackeln: Beine treten, Schwanz wedelt, Ohren schlackern. (4) Fragezeichen nur
bei Unsicherheit („Keil am Bein oder am Rumpf?“): zwei Vorschauen, ein Tippen. (5) Ring ziehen verschiebt ein Gelenk, der Ringrand
macht weicher oder härter, ein Teil auf ein anderes ziehen heftet an. (6) Jede Korrektur bekommt eine Stecknadel; der Vorschlag ist
ein ⌘Z. (7) In der Linse Form zieht er mit V an der Pfote, und das Bein folgt.

**(c) Eine Pose formen.** (1) „Stehen“ halten → verdoppeln → „Erschrecken“; die Karte ist die Stelle. (2) V: Vorderpfoten hoch, Kopf
zurück, Schwanzspitze hoch, Nase am Anfasser zur Kamera. (3) A: Ohren steiler; das wird Posenkorrektur im Ruheraum. (4) Der Chip
bietet „nur hier“, „am Knie bei 90°, überall“ oder „in der Grundform“. (5) Z zeigt „Stehen“ als Umriss; Karten antippen zeigt den
Übergang hin und zurück. (6) Halten → „nur Kopf und Gesicht“ macht eine Gesichtspose daraus.

**(d) Einen Übergang gestalten.** (1) „Stehen“ antippen, dann die Brücke zu „Erschrecken“: Die Leiste zeigt 0 bis 100 % mit der
Standardfeder. (2) Bei 30 % hängt der Kopf; er zieht ihn mit V hoch. Jetzt ist der Übergang gestaltet, bei 30 % liegt eine blaue
Zwischenpose, die Leiste zählt Sekunden. (3) Bei 10 % formt er ein Ausholen; Kanten ziehen ändert Dauern, Halten die Kurvenart.
(4) ＋ Hüpfer, ein Balken „steht“ für die Hinterpfoten, eine Marke mit Klang bei der Landung. (5) Die Leertaste spielt in Schleife,
⇧Z zeigt, ob Pfoten rutschen. (6) Halten auf der Brücke: „am nächsten Halt“, ＋ Variante. (7) Zehnmal schnell zwischen den Karten
tippen: Nichts springt.

**(e) Ohren nachschwingen.** (1) Ohr antippen, ＋ Verhalten → „Schwingen“: ein Chip mit Dauer und Federung. (2) Studio legt die Achse
„Ohr schwingt“ an, seine Zeichnung ist die Mitte; ein Knopf „Extreme formen“ holt sie auf die Leiste, er formt ganz vorn und ganz
hinten. Bis dahin biegt die Biegeachse. (3) Linse Physik: Ozzy anstoßen, das Ohr schnippen; Z zeigt die Spur der Zukunft.
(4) Ausgeschwungen steht das Ohr exakt wie gezeichnet. (5) Halten auf dem Chip → „auf Ohr B übertragen“.

**(f) Eine Laune als Regel.** (1) Linse Spiel, mit P zwei Punkte auf den Rand: eine Zone „Duftstelle“. (2) Zone antippen, ＋ Regel →
Laune. (3) Lücken füllen durch Tippen auf Dinge, kurze Listen oder Hineinziehen von Posenkarten: Laune **Schnüffeln** · wenn **Ozzy
die Stelle betritt** · falls **Gangart höchstens Trab** · Häufigkeit **nach Neugier** · Ankündigung **„Nase sinkt“, 1 s** · Wirkung
**Wunschtempo 0, Bremskraft hoch, „Schnüffeln“, 2 bis 4 s** · Ende **Zeit um oder Rad dreht schnell** · danach **Stehen** · Ruhezeit
**10 s** (14b §7.4). (4) „Laune jetzt“ probiert sie aus; die Regel leuchtet, die Gedankenblase zeigt die Phase. (5) Feuert sie nicht:
„Warum nicht?“ → „Gangart war Galopp.“ (6) Zone verdoppeln: Die Regel kommt mit eigenem Gedächtnis mit.

**(g) Spielen und anhalten, um nachzuformen.** (1) ▶: Die Bühne wird das Spiel, die Leiste der Mitschnitt mit Ereignismarken.
(2) Jede Berührung gehört dem Spiel; am iPad dreht der Finger das Rad, der Stift hält an. (3) Beim Stolpern sticht das Ohr durch den
Kopf: Leertaste. (4) Die Stellen-Wahl zeigt alle beteiligten Stellen, die wahrscheinlichste vorgewählt (der laufende Übergang).
(5) Er formt mit A; die Physik-Abweichung blendet aus und bleibt als blasser Umriss. (6) „Weiter“ spielt ab diesem Takt; Klick in den
Mitschnitt spult, „nochmal“ spielt mit gleicher Saat und gleichen Eingaben. Was im Spiel geformt wird, bleibt (12 §6.12).

### 9.6 Ein Mechanismus für vieles, bewusst zwei

| Ein Mechanismus | trägt |
|---|---|
| die Leiste | neun Achsen, auch Zeit, Spulen und die Strecke der Welt |
| die Stelle | jeden Zug, auch im angehaltenen Spiel |
| ein Delta auf derselben Ankerliste | Ansichtsschlüssel, Formziel, Korrekturform, Posenkorrektur, Zwischenpose, Kreuzschlüssel |
| der Regler | Form, Knochenwinkel, Deckkraft, Reihenfolge, Effekt, Physik- und Spielwert |
| eine Feder (Dauer, Federung) | Standardübergang, Nachschwingen, Finger am Rad, Kamera, Glätten der Drähte |
| der Chip mit zwei Reglern | Verhalten, Effekt, Klang |
| die Herkunft | alle Schlüssel und den Schutz seiner Schlüssel |
| Z | Schlüssel, Zwischenposen, vorige Pose, Zukunft, Ereignisse |
| der Satz mit Lücken | Regeln, Aufgaben, Kamera, Musik |
| eine Laufzeit, ein Takt | Editor und Spiel |

| Bewusst zwei | warum |
|---|---|
| Achse ohne Zeit, Übergang mit Zeit | Reaktion gegen erzählte Bewegung (04 §5) |
| V posiert, A formt | Knochenstand und Form sind zwei Dinge; Illustrator trennt genauso |
| Draht und Regel; Sobald und Solange | stetig gegen Ereignis; Laien verwechseln Ereignis und Zustand (14b §3.2) |
| Box2D-Welt, XPBD-Figur | ruhige Kontakte gegen Federn auf seinen Formen (14a); dieselbe Federsprache |
| Mischart „heute“, „Rahmen + Rest“ | seine Kopfdrehung ändert sich nie still |
| Stift und Finger am iPad | Inhalt gegen Ansicht |
| Spiel läuft, Spiel steht | im Spiel gehört jede Berührung dem Spiel; der einzige Zustand, in dem eine Geste etwas anderes bedeutet |

### 9.7 Unendlich erweiterbar, ohne dass die Oberfläche wächst

- **Feste Orte, die nie mehr werden:** Bühne, Posen-Reihe, Leiste, Eigenschaften (zwei Ebenen), Bibliothek (＋), Prüfer,
  Befehlssuche.
- **Neues kommt in fünf Formen:** eine Achse (erscheint als Leiste), ein Baustein (seine Anschlüsse erscheinen in den Lücken der
  Sätze), ein Chip (zwei Regler und „Mehr“; Effekte als Profil über dem Abstand), eine Vorlage für den Autorig (Daten), eine Herkunft
  (ein Zeichen auf der Leiste).
- **Prüfregel:** Jede neue Fähigkeit trägt sich in die Tabelle 9.4 ein, sonst wird sie umgebaut (12 §10). Kein neues Panel, kein
  Modus, keine neue Geste.
- **Format:** Versionen je Baustein mit eigenen Migrationen (11 §5.2); Skripte höchstens später als abgeschotteter Notausgang
  (02 Empf. 14).

## 10 Technik

| Bereich | Entscheidung | Beleg |
|---|---|---|
| Pakete | `studio-format`, `studio-laufzeit`, `studio-welt`, `studio-bild`, `studio-ton`; `apps/studio` (Port 5217), `apps/ozzy-spiel` | 11 §12.1 |
| Ausgangscode | Kopien aus `apps/editor/src/ozzy-figur/` (Form, Raster, Haltung, Abläufe, Renderer, Werkzeug, Import); der Prototyp bleibt unberührt | Auftrag |
| Datenmodell, Format | flache Datensätze mit Kennung (auch Anker); JSON mit Versionen je Baustein, Migrationen nur vorwärts, deterministischer Schreiber, zod; nichts Abgeleitetes in der Datei | Gesamtbericht 3.8 |
| Ablage | `content/studio/ozzy/projekt.json` mit `assets/`; seine `schluessel.json` wird nur gelesen | eigene Entscheidung |
| Store | Datensatz-Diffs; eine Geste ist ein Schritt; die Auswahl reist mit; fremde Änderungen nie in seinem ⌘Z | 11 §4.2 |
| Laufzeit, Takt | ohne DOM, deterministisch; 60 Hz, vier Teilschritte, gemischte Darstellung, Saat, Prüfsumme | Gesamtbericht 4.3 |
| Oberfläche | heiße Flächen in eigenem Code (WebGL2, Canvas 2D), kühle in React 19.3; Befehlsregister; Pointer Events mit Zwischenproben | 11 §3, §9, §10 |
| Tempo | iPhone 16 kalt: Hauptthread ≤ 6 ms, Grafik ≤ 8 ms; Editor ≤ 6 bis 8 ms; Autorig ≤ 50 ms im Worker; keine Würfe im Bildtakt | 14c §6 |
| Tests | vitest, fast-check („kein Sprung“, „Rückgängig ist exakt“), Hash je Takt, Bildvergleich, Playwright mit Uhr | 11 §11 |

```ts
type Herkunft = 'vorlage' | 'dein' | 'gebaut' | 'falte' | 'wechsel' | 'aufnahme';
type Stelle =
  | { art: 'grundform' }
  | { art: 'pose'; pose: PoseId }
  | { art: 'achse'; regler: ReglerId; wert: number; nurIn?: PoseId }
  | { art: 'uebergang'; uebergang: UebergangId; zeit: number };
interface Schluessel { id: SchluesselId; teil: TeilId; stelle: Stelle; herkunft: Herkunft; delta: AnkerDelta[] }
```

- **Die Stelle ist ein Datum** der Sitzung; jede Transaktion eines Werkzeugs bekommt sie als Ziel. So wird „wohin landet ein Zug“
  prüfbar.
- **Zwei Werkbank-Tests:** die Ort-Probe (Eigenschaftstest: Ein Zug an Stelle S ändert nur Datensätze von S) und die Schutz-Probe
  (keine Automatik schreibt Herkunft „dein“; Proben speichern über eine Attrappe; seine Dateien bleiben unberührt, wie heute).
- **Live zum iPhone** über den Websocket des Dev-Servers (11 §12.3); Florians Fenster läuft aus einem festen Stand.

## 11 Spielkonzept für Ozzy

**„Gassirunde“: Ozzy dreht vor Sonnenuntergang eine Runde um seine kleine Welt, und der Spieler dreht die Welt** (13 §9;
Gesamtbericht 5.3).

- **Mechanik:** ein Rad in gewöhnlicher Schwerkraft, unten vom Bildrand abgeschnitten. Die Lage ist das Gaspedal: oben steht Ozzy,
  tiefer tapst, trabt und galoppiert er, noch tiefer stolpert er (Garten: bis etwa 3°, 8°, 13°, 17°; 13 §2.2). Gespielt wird
  Besen-Balancieren, Kippzeit τ = √(R/g), bei 14 Körperlängen rund 0,84 s. Ein Finger hält, zieht, lässt los. Jedes Ding verlangt
  genau ein Tempo; Ozzy springt selbst, der Spieler ist der Reiter (13 §9.4).
- **Eigener Kopf:** Schnüffeln, Sturkopf, Flitzen, Jagen und Müde ändern nur Sollwerte, kündigen sich eine Sekunde vorher am Körper an
  und hängen meist an Orten. An Erhöhungen wird das zum besonderen Balancieren: Auf dem Hügel bleibt er schnüffelnd stehen, und das
  Rad trägt ihn aus der Stehzone, wenn der Spieler nicht still hält.
- **Witz** (13 §5.4): blamiert, nie verletzt; Ahnung, Pause, Folge; danach der Blick in die Kamera, in die Front, die genau sein Logo
  ist; hinter dem Bildrand nur Ton, dann kommt er mit einem Andenken zurück. Popo-Rutschen, Nasen-Pflug, Schlafwalze, Gipfel-Wackeln.
- **Welten:** Spielwiese (Prüfstand und Spielzeug), Garten (Radius 14 L, Stehzone ±17°), Park (11 L, ±14°: Pfütze, Wippe, Katze,
  Bach), Winter (12 L, auf Eis ±6°: Schneeball, Schneemann).
- **Rahmen:** Ozzy wartet oben, Anfassen startet; der Himmel ist die Uhr; ein Fähnchen ist Start und Ziel; drei Aufgaben je Welt;
  Pannen-Rückblick und Tagebuchseite in Lobster; die Weltwahl ist ein Rad. Kein Spielende, Hilfe nach drei Fehlversuchen, Zen-Runde
  (13 §9.6).

**Die Demo entsteht nur aus Studio-Mitteln**; was fehlt, ist eine Lücke im Editor, kein Spielcode (13 §10):

| Teil | Studio-Mittel |
|---|---|
| Gang | drei Zyklen; Draht Tempo → Mischung; Balken „steht“ als Kontakte |
| Stehen am Hang, Tapsen, Stolpern | Baustein Vierbeiner (Bremskraft, Haftung); Stolpern als Reflex |
| Balancieren sichtbar | Feld Balance mit seinen Schlüsseln; Draht Neigung → Balance |
| Sprung | Absprung aus dem Tempo; gestalteter Übergang Ausholen → Flug → Landung |
| Sturz, Aufstehen, Schütteln | Ragdoll auf seine Sturzposen; Aufstehen je Lage; Schütteln als Zyklus |
| Launen | Laune-Regeln an Zonen; Charakter-Regler Neugier, Mut, Sturheit, Energie, Verfressenheit |
| Hügel, Lücke | Weltpfad mit A formen; Kette und Feld daraus abgeleitet (14a §6.3) |
| Pfütze, Staub | Zone, Effekt Verschmelzen, Sobald-Regel |
| Himmel, Abend | Baustein Uhr, Draht Tageszeit → Himmel; Solange-Regel für die Musik |
| Ankunft | Regie-Regel und Regie-Übergang mit Spuren für Kamera und Himmel |
| Aufgaben, Rückblick | Zähler, Aufgaben mit Beweis-Lauf, Mitschnitt |
| Tapp, Plumps, Rumpeln | Klang-Chips an Fühlern und Marken; Draht Drehgeschwindigkeit des Rads → Tonhöhe |

## 12 Umsetzung

### 12.1 Etappen

Je Etappe eine vorher festgelegte, sichtbare Probe; „bestanden“ sagt nur Florian. Tage nach Gesamtbericht 4.7, sonst markiert.

| Etappe | Inhalt | Probe | Tage |
|---|---|---|---|
| E0a | Messseite `tempo.html` (14c §7) | zehn Blöcke mit Ampeln | 2–4 |
| E0b | P1 „Rad mit Gewicht“ (14a §7), parallel | K1 bis K9, Aufnahme vom iPhone | 4,5–6 |
| E1 | Werkbank-Gerüst: Format, Store, Leiste mit Stelle, Herkunft, Zwiebelhaut, Bahnen, Vorschau; Import seiner Kopfdrehung (seine Datei nur lesend) | bildgleich zum Prototyp bei 0°, 45°, 90°, 150°, 180°, 210°; dieselben Rauten; 100 Züge an einem Griff = ein ⌘Z; zweimal speichern = gleiche Bytes; seine Datei unberührt | 8–12 (eigene Schätzung) |
| E2 | Form-Kern im Vergleich | Ohr 120°, Stirnfranse 52°–82°, Drehung über die Front: heute neben „Rahmen + Rest“ | 2–4 |
| E3 | Posen-Reihe, Brücken, Übergänge als Daten, Tafel; seine fünf Haltungen und acht Abläufe | „Hinsetzen mit Hüpfer“: Plumps im Bild des Bodenkontakts, zehn schnelle Klicks ohne Sprung; er ändert ohne Code eine Dauer, eine Zwischenpose, einen Zusatz | 8–14 |
| E4 | Werkbank-Probe: Ohr bei 150° glätten; Pose aus „Stehen“; Übergang nachformen; Pfote mit V auf einen Stein; rutschende Nase mit ⇧Z finden | vier von fünf ohne Hilfe, Mac und iPad; keine unbemerkte Änderung an falscher Stelle | 2–3 |
| E5 | Linse Knochen mit seinem Handrig, Posieren mit V, Anfasser, Korrekturform | Korrektur am Knie dreht mit, ohne Ruck (06 §11 Probe 5) | 6–10 (eigene Schätzung) |
| E6 | Spielwiese D0: Welt, Vierbeiner, Renderer Stufe 1, Chips, Spielen, Stellen-Wahl, Mitschnitt | 60 s auf dem iPhone wie S6 in Gesamtbericht 4.7; Ohren nach dem Anstoßen exakt; gleicher Hash nach 600 Takten; er hält an und formt nach | 30–50 |
| E7 | Logik und Garten D1 bis D3, danach die volle Bedienprobe (12 §9) | Nicole schafft eine Runde ohne Erklärung; jede Laune an ihrer Ankündigung erkennbar; Runde mit Endkarte | 30–50 |
| E8 | Autorig mit der Katze | 07 §9 | 15–25 |
| E9 | Park, Winter, Effekte, Ton, Haptik | Vorher-Nachher-Bilder; Stumm-Probe; er spielt auf dem iPhone 16 | 20–30 |

Gesamt rund 128 bis 208 Arbeitstage (eigene grobe Schätzung: Gesamtbericht 4.7 plus der Umzug der Kopfdrehung); der Engpass sind
seine Prüfrunden. **Umzug:** Erst wenn er E1 bildgleich gesehen hat, entscheidet er, ab wann er in Studio formt; bis dahin liest Studio
seine Datei nur.

### 12.2 Parallel bauen

Mehrere Agenten nur mit Florians Freigabe (Arbeitsregel 2), dann in sechs Spuren: Werkbank, Laufzeit, Bild, Welt, Logik mit Ton,
Autorig. **Verträge zuerst:** die Typen in `studio-format` (Datensätze, Stelle, Herkunft) und vier Schnittstellen (`auswerten`,
`takt`, `zeichnen`, `welt` nach 14a §6.2); jede Spur testet gegen Attrappen der anderen. E0a und E0b laufen neben E1 bis E3, die
seriell bleiben, weil sie die Stelle teilen; E8 läuft neben E9. Je Spur ein Arbeitsbaum und ein Port; zusammengeführt wird je Etappe.

### 12.3 Risiken und Abbruchregeln

| Risiko | Gegenmittel |
|---|---|
| Umfang über das Wochenlimit | die Demo bestimmt den Umfang (13 §10.11); Autorig erst in E8 |
| die Leiste als Ort trägt nicht | Vorschau, Geltungs-Chip, sicheres ⌘Z; E4 früh |
| Tempo auf dem iPhone verfehlt | E0a zuerst; Rahmen je Figur; Kachel-Durchgang |
| Box2D-Bindung, Kette am drehenden Rad | schmale Schnittstelle `welt`; Rapier, dann B′ |
| neue Mischart ändert seine Formen | nie still; E2 |

**Abbruch:** Hält eine Probe am oberen Rand der Schätzung nicht, wird angehalten und berichtet (Arbeitsregel 2; P1 nach sechs Tagen,
14a §7.3). Scheitert E4, kommt vor E5 die Gegenprobe mit zwei Modi. Zeigt E0a die Szene rot, kommt der Kachel-Durchgang vor E6.
Gefällt ihm „Rahmen + Rest“ nicht besser, bleibt die heutige Mischart Standard. Hält der Autorig an der Katze nicht, bleibt der
Handrig mit Vorlage.

## 13 Abweichungen von der Recherche

| Punkt | Recherche sagt | ich sage | warum | ehrliche Gegenrede |
|---|---|---|---|---|
| Wohin ein Zug geht | aktive Stelle; danach ein Geltungs-Chip (12 §6.4) | die Bühne wählt Dinge, die Leiste die Stelle; Vorschau vor dem Zug; der Chip erweitert nur | Fehler vor dem Zug verhindern statt danach melden; Florian arbeitet heute so | ein Tippen mehr für die Achse eines Teils; ohne Schweben kommt die Vorschau erst beim Aufsetzen |
| Anhalten im Spiel | der Chip schlägt danach die wahrscheinlichste Stelle vor (Gesamtbericht 4.6 Nr. 26) | Stellen-Wahl vor dem Formen, vorgewählt | ein Spielbild hat oft vier bis sechs Stellen (eigene Schätzung); Raten ist hier am riskantesten | langsamer; wer nicht liest, landet wie beim Chip an der Vorwahl |
| Posieren | in der Linse Knochen dreht Ziehen, in der Linse Form verschiebt es (12 §6.3) | V posiert in der Linse Form über die Knochen; die Linse Knochen dient nur dem Riggen | er denkt in Teilen; V bewegt in Illustrator Objekte | frei aus dem Rig schieben nur über A; V wirkt an Teilen ohne Knochen anders |
| Werkzeuge der Linse Knochen | B zeichnet Knochen, der Schalter B entfällt (12 §6.6) | P setzt, was die Linse zeigt; B bleibt seine Taste, ohne Modus | ein Werkzeug weniger; seine Gewohnheit | P ist mehrdeutig, wovor 12 §3.1 warnt; das Verb „setzen“ bleibt gleich |
| Autorig lebendig | rechnet nach jeder Formänderung nach (07 §5) | nur auf Knopfdruck; der Prüfer meldet unpassende Gelenke | „nichts darf springen“ | veraltete Gelenke bleiben, bis er tippt |
| Reihenfolge der Proben | Bedienprobe nach der Spielwiese (Gesamtbericht 4.7) | Werkbank-Probe E4 nach den Übergängen, an seiner Kopfdrehung | der Entwurf ruht auf dieser Wette (Gesamtbericht 6.1); früh prüfen ist billig | deckt Physik und Logik nicht ab |
| Übersicht der Übergänge | volle Tafel und Posenkarte mit Pfeilen (05 §4.2) | Brücken und eine Tafel nur mit erreichbaren Paaren | bei 35 Posen über 1 000 Zellen, die meisten kommen nie vor | Erreichbarkeit ändert sich mit den Regeln; eine freie Karte zeigt Gruppen schöner |
| Werteverlauf, Spur der Zukunft | eigene Leiste und eigene Anzeige (14b §7.13, 12 §6.13) | der Mitschnitt ist die Leiste im Spiel, Kurven auf Halten; die Zukunft ist Z in der Linse Physik | eine Leiste, eine Grammatik | Messwertkurven sind beim Fehlersuchen zentral und kosten nun einen Griff |
| Übergangsform | eigene Glocke über dem Übergang (06 §6.5) | jeder Zug im Übergang wird eine Zwischenpose mit Formdeltas | ein Ding weniger | eine Korrektur über den ganzen Übergang braucht eine passende Kurvenart |

## 14 Unsicherheiten und was sie klärt

| Unsicherheit | was sie klärt | wann |
|---|---|---|
| Trägt „die Leiste wählt die Stelle“, wenn mehrere Achsen zugleich wirken? | E4, Kriterium: keine unbemerkte Änderung an falscher Stelle; sonst Gegenprobe mit zwei Modi | nach E3 |
| Reicht die Vorschau ohne Schweben (Finger)? | Technikprobe am iPad | E4 |
| Erwartet er bei V „verschieben“ statt „posieren“? | Aufgabe „Pfote auf einen Stein“ | E4 |
| Ist die Stellen-Wahl beim Anhalten zu umständlich? | volle Bedienprobe | nach E7 |
| Schafft das iPhone 16 die Szene in 8 ms Grafikzeit? | Messseite | E0a |
| Trägt Weg B Halten, Rückwirkung, Hinsetzen, Sturz und Spulen? | P1 | E0b |
| Ist „Rahmen + Rest“ schöner oder nur anders? | Vergleichsbild | E2 |
| Wie groß wird die Tafel der erreichbaren Paare? | Zählung im Garten | E7 |
| Formt er die Extreme der Ohren selbst, oder genügt die Biegeachse? | beides im Prüfstand | E6 |
| Trifft „Dauer und Federung“ sein Gefühl, und stimmt die Umrechnung? | dieselbe Feder in beiden Beschreibungen | E6 |
| Hält der Autorig an einer zweiten Figur? | Katze, Vogel, Fisch | E8 |
| Wann zieht seine Kopfdrehung um? | sein Wort nach E1 | nach E1 |

Vorab muss Florian nichts beantworten. Sein Wort brauchen nur der Umzug der Kopfdrehung nach E1 und die Freigabe paralleler Spuren.
