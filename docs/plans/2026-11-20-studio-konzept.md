# Studio: Produktkonzept

Stand 20.11.2026. Verbindliches Konzept für den Editor „Studio“ und seine Demo „Gassirunde“. Grundlage sind der
[Gesamtbericht der Recherche](../research/2026-11-20-editor-recherche.md), die 17 [Einzelberichte](../research/2026-11-20-editor/), die
Entwürfe [A „Florians Werkbank“](2026-11-20-studio/entwurf-a-werkbank.md), [B „Eine Laufzeit“](2026-11-20-studio/entwurf-b-laufzeit.md)
und [C „Die Demo baut den Editor“](2026-11-20-studio/entwurf-c-demo.md) sowie die Urteile dreier Richter (Linsen Florian, Technik,
Spiel). Je Bereich ist der stärkste Entwurf die Grundlage; die besten Ideen der anderen sind übernommen, jeder schwere Fehler ist
behoben, Widersprüche sind ausdrücklich aufgelöst. Wer was beigetragen hat, steht in Abschnitt 16.

**Überarbeitet am 20.11.** nach der Vollständigkeitskritik ([`kritik.json`](2026-11-20-studio/kritik.json), 30 Befunde) und dem
[Entscheidungsblatt](2026-11-20-studio/entscheidungen-zur-kritik.md) mit den Festlegungen F1 bis F7: Studio wird selbstständig und
parallel durchgebaut; was eigentlich Florian entscheidet, steht als vorläufige Entscheidung in der Liste
[Studio: Was bleibt](2026-11-20-studio-was-bleibt.md).

Belege stehen in der Form „(06 §2.6)“, „(Gesamtbericht 4.4)“ oder „(Entwurf B §3.5)“; „Befund 12“ und „F5“ verweisen auf das
Entscheidungsblatt, „A1“ und „B3“ auf die Liste; eigene Schätzungen sind markiert. Für Studio ist noch nichts gebaut oder gemessen, auf
dem iPhone gar nichts. „Bestanden“ sagt nur Florian. Typen und Signaturen stehen im [Bauplan](2026-11-20-studio-plan.md); Konzept und
Bauplan zählen die Etappen gleich, M0 bis M11.

**Inhalt:** 0 Kurzfassung · 1 Zeitmodell · 2 Formen und Morph · 3 Knochen und Gewichte · 4 Autorig · 5 Posen und Übergänge ·
6 Physik · 7 Effekte und Rendern · 8 Spiellogik ohne Code · 9 Bedienung · 10 Technik · 11 Spielkonzept für Ozzy · 12 Umsetzung ·
13 Was bewusst nicht gebaut wird · 14 Vorläufige Entscheidungen für Florian · 15 Begriffe · 16 Herkunft

---

## 0 Kurzfassung

**Was Studio ist.** Ein Editor für 2D-Vektorfiguren, der zugleich die Laufzeit ist, die sie im Spiel abspielt. Florian bringt seine
Formen als SVG mit oder zeichnet sie, legt ihre Zustände auf Leisten, formt Posen und jeden Übergang selbst, hängt Physik, Effekte und
Klang als Chips an und verknüpft alles mit Spiellogik in kurzen Sätzen, ohne Code. Editor und Spiel laden dieselbe Datei und rechnen mit
demselben Code. Gearbeitet wird am Mac und am iPad mit Stift, gespielt und geprüft am iPhone. Ozzy ist das Beispiel; die Demo
„Gassirunde“ entsteht nur mit den Mitteln des Editors. Was ihr fehlt, ist eine Lücke im Editor, kein Spielcode.

**Die Grundgesetze**

1. **Eine Form, viele Zustände.** Jede Schlüsselform ist eine Bearbeitung derselben Anker; die Zuordnung wird nie geraten.
2. **In Ruhe ist jede Figur exakt ihre Zeichnung.** Ruhe heißt: Die Pose steht; Physik, Ausgleich, Verweilen und alle Effekte, die nur in
   Bewegung wirken, sind null.
   Ozzy ist dann auf ebenem Boden genau sein Logo (auf dem runden Hügel biegen sich seine Beine minimal, A27).
3. **Alles, was sich bewegt, hängt an Reglern.** Pose, Physik, Regeln und Hand stellen dieselben Werte.
4. **Geändert wird an der aktiven Stelle.** Die Bühne wählt Dinge, die Leiste wählt die Stelle; vor jedem Zug sieht man, wo er landet.
5. **Seine Schlüssel gehören ihm.** Keine Automatik, keine Sitzung und keine Migration ändert die Gestalt seiner Schlüssel oder löscht
   sie. Migrationen dürfen nur ihre Schreibweise ändern; das wird geprüft.
6. **Zeit nur, wo erzählt wird.** Reaktionen sind Regler und Federn; Zeit gibt es in gestalteten Übergängen und im Mitschnitt.
7. **Eine Laufzeit für Editor und Spiel.** Der Editor zeigt das Spiel, angehalten: dieselbe Datei, derselbe Code, derselbe Takt.
8. **Eine Grammatik überall, ohne Ausnahme.** Tippen wählt und geht hin, Ziehen ändert, Halten zeigt mehr, Doppeltippen geht hinein.
9. **Nichts springt.** Jeder Sprung eines Sollwerts läuft über den Ausgleich; Wächter melden Knicke, Falten und Kerben, statt still zu
   reparieren.
10. **Die Demo bestimmt den Umfang.** Was die Gassirunde braucht, wird gebaut und an ihr geprüft; der Rest wartet.

**Was Studio besser macht als Spine und Rive** (01, 02)

| | Spine 4.3 | Rive | Studio |
|---|---|---|---|
| Grundlage | Bilder auf Dreiecksnetzen | Vektorpfade | Vektorpfade, jeder Anker mit Kennung |
| Verschmelzen, Verjüngungen statt Outline | nein | nein | ja, aus dem Abstandsfeld |
| Morph | Netzpunkte auf geraden Bahnen | Stände eines Pfads | „Rahmen + Rest“: exakt an Schlüsseln, schrumpft nicht, glatt bleibt glatt |
| Gewichte auf Ankern und Griffen | auf Netzpunkten | je Anker und Griff | je Anker und Griffpaar, auch an Biegeachsen; Glätte garantiert |
| Korrekturformen an Gelenken | über Slider | über Joysticks | jeder Gelenkwinkel ist eine Leiste |
| Übergänge | Mischzeit je Paar | Überblendung mit Dauer | Zwischenposen, Kontakte, Marken, „bis Ereignis“ |
| Physik | Versatz je Knochen | keine eingebaute | Welt und Figur, in Ruhe null |
| Logik | im Spielcode | Zustandsautomat | Bausteine, Drähte, Regeln als Sätze, „Warum?“ |
| Modi, iPad | Setup/Animate; kein iPad | Design/Animate; kein iPad | kein Modus; iPad mit Stift |
| **Wo die anderen gewinnen** | Reife, Laufzeiten für viele Engines | Reife, Teamarbeit, viele Abspieler | Studio ist zuerst ein Werkzeug für Ozzy; vieles ist eigener Code |

**Der Preis:** grob 155 bis 240 Arbeitstage bis zur ganzen Demo (eigene Schätzung, Abschnitt 12); parallele Wellen verkürzen die
Kalenderzeit, nicht den Verbrauch von Florians Wochenlimit (F7). Dazu zwei Wetten, die früh geprüft werden: Trägt die aktive Stelle ohne
Modi (Ort-Probe in M3, Werkbank-Proben in M3 und M4), und schafft das iPhone 16 den Abstandsfeld-Renderer in 8 ms Grafikzeit
(Ersatzszenen auf der Messseite in M2)? Der Bau wartet nicht auf Florians Urteile; Ergebnisse sammelt die Liste, und wo eine Wette
fällt, wählt der Bau den vorher festgelegten Rückfall (Abschnitt 12).

---

## 1 Zeitmodell

**Entscheidung:** Keine klassische Zeitleiste als Ordnung, sondern eine Leiste für jede Achse, bedient wie Florians heutige Zeitleiste
der Kopfdrehung; Zeit ist eine Achse unter neun und erscheint nur, wo erzählt wird.

**Gibt es ein besseres System als die klassische Zeitleiste?** Für eine Spielfigur wie Ozzy: ja. Ozzy reagiert fast immer auf das Rad
(Neigung, Tempo, Launen, Stürze). Eine Zeitleiste müsste jede Reaktion als Clip vorwegnehmen und überblenden; die Zwischenstände lägen
dann nicht mehr auf seinen Schlüsseln. Im Reglerraum ist jeder Zwischenstand eine Stelle auf einer Leiste, an der seine Schlüssel gelten
(04 §5, 05 §4.1). Spine (Slider) und Rive (Joysticks) sind selbst dorthin gewandert. Für einen Kurzfilm wäre Studio das schlechtere
Werkzeug; wo genau, sagt 1.2.

### 1.1 So funktioniert es

**Eine Leiste, ein Bauteil**, gebaut aus der heutigen Zeitleiste (Übergabe ozzy-figur): Klick springt, Ziehen fährt, ein Zug auf der
Bühne setzt an der Stelle einen Schlüssel, J und K springen zum Schlüssel davor und danach, Z zeigt die Zwiebelhaut, ⇧Z die Bahnen der
Anker, ● nimmt auf. Ein Tropfen markiert die Stelle. Die Farben nach Herkunft bleiben (schwarze Raute Vorlage, helle gebaut, blaue
„dein“, Punkt Falte, Strich Wechsel, Welle Aufnahme).

| Achse | Beispiel | bewegt von | ein Zug legt an |
|---|---|---|---|
| Ansicht (rund) | Kopf θ 0° bis 360°, Körper ψ | Hand, Pose, Blickziel | Ansichtsschlüssel |
| Gelenk | Winkel des Hinterbeins | Knochen | Korrekturform |
| frei | Brauenbogen, Ohr angelegt | Hand, Pose, Regel | Formziel |
| Physik | Ohr schwingt, Stauchung | Feder | Schlüsselform |
| Spiel | Balance | Draht | Schlüsselform |
| Phase (rund) | Schritt, Trab, Galopp | Weg oder Zeit | Zwischenpose im Zyklus |
| Übergang (Taktleiste) | Stehen → Sitzen | Zeit | Zwischenpose |
| Strecke (rund) | Lage auf dem Hügel mit den Dingen | Rad | Lage eines Dings |
| Mitschnitt | die letzten 20 s im Spiel | Spulen | nichts; Anhalten öffnet die Stellen-Wahl (9.4) |

- **Ein Schlüssel ist die ganze Form eines Teils an einer Stelle**, nie eine Koordinate (Entwurf A §1.3). Die Leiste zeigt eine
  Summenzeile und die Zeile des gewählten Teils; ⌄ klappt alle Teile auf. Spuren je Regler gibt es nur als zweite Ebene.
- **Felder mit zwei Achsen** (Balance, Gang: Phase × Tempo) bedienen sich wie die Leiste, höchstens 3 × 3 Schlüssel (04 §6).
- **Der Mitschnitt zeigt den Werteverlauf sofort** (Entwurf C §1): Kurven der Werte des gewählten Dings mit Schwellen, Rückwegen und
  Ereignismarken.
- **Aufnahme ist eine Eingabe:** ● scharf schalten, abspielen, am Anfasser ziehen; Studio glättet und dünnt aus (05 §5.9).
- **Zeit in der Laufzeit** (Entwurf B §1): Zeit ist die Taktnummer, Dauern stehen in Sekunden in der Datei, Zeitlupe ändert nur das
  Takt-Tempo. Spulen mit Physik springt zum letzten Schlüsselstand (alle 16 Takte) und rechnet höchstens 15 Takte nach.
- **Umfang, gezählt an der Demo** (Entwurf C §1, Listen in 11.7): rund 25 gestaltete Übergänge von 0,3 bis 3 s, 11 Zyklen, 2
  Regie-Übergänge bis 6 s. Eine Mehrspur-Zeitleiste kommt erst, wenn ein Moment mehrere Figuren länger als 6 s in fester Zeit braucht.
  Bis dahin trägt der **Regie-Übergang** (5.2) Spuren beliebiger Regler: die kleine Zeitleiste, bewusst nur dort.

### 1.2 Gegenüberstellung

Nach 05 §4.1, Gesamtbericht 3.1 und Entwurf A §1.1. Die Spalte „Studio“ ist eine Erwartung, keine Erfahrung; sie wird an der
Werkbank-Probe und der Bedienprobe gemessen.

| Kriterium | Klassische Zeitleiste | Zustandsgraph | Reglerraum allein (Live2D) | Aufnahme | **Studio: Leisten** |
|---|---|---|---|---|---|
| Reaktion auf das Rad, ohne Ende | −− | + | ++ | − | ++ |
| Jede Pose in jede andere | − | o | o | − | ++ |
| Timing eines Gags | ++ | − | − | ++ | + |
| Viele Teile mit genauem Versatz | ++ | − | − | o | o |
| Gleichlauf mit Ton | ++ | o | − | + | + |
| Zwischenstände auf seinen Schlüsseln | o | − | ++ | o | ++ |
| iPad mit Stift, iPhone | − | o | + | ++ | + |
| So arbeitet Florian heute | o | − | + | − | ++ |
| Bauaufwand | gering | mittel | mittel | mittel | mittel bis hoch |

**Wo die klassische Zeitleiste gewinnt:** viele Teile mit genauem Versatz („Ohr drei Bilder nach dem Kopf“; Studio braucht Nachlauf oder
eine Spur), Szenen mit mehreren Dingen (Studio: Regie-Übergang), Ton genau im Bild (für Lippensynchronität; Ozzy spricht nicht),
Vertrautheit für Leute aus Spine oder Blender, der Blick auf eine lange Spanne als Ganzes. **Urteil:** Der Reglerraum ist der Unterbau,
Zeit ein Antrieb unter anderen. Die Zeitleiste bleibt als Taktleiste und Regie-Übergang. Der Zustandsgraph ist nur eine Ansicht.
Motion Matching und KI-Zwischenbilder: nein.

**Verweise:** Gesamtbericht 3.1, 4.2 Nr. 4; 04 §5; 05 §4.1, §5; 12 §6.13; Entwurf A §1, B §1, C §1.

---

## 2 Formen und Morph

**Entscheidung:** Jede Schlüsselform ist eine Bearbeitung derselben Anker; neue Formen mischen „Rahmen + Rest“, Zusatzformen liegen im
mitlaufenden Rahmen, und Florians Kopfdrehung kommt in ihrer heutigen Mischart als Daten nach Studio, geprüft im 0,5°-Raster an
Kurvenpunkten gegen den Prototyp; seine Datei bleibt die Wahrheit, bis er umzieht.

### 2.1 Formen und Bindungen

- **Form:** geschlossener Pfad aus Ankern mit fester Kennung, glatt oder Ecke. Griffe liegen relativ zum Anker mit absolutem Winkel; der
  glatte Anker hat einen Winkel und zwei Längen, die Ecke je Griff Winkel und Länge. So steht die Glätte im Format (Entwurf B §2.2). Dazu
  Linien mit Breitenprofil (Lider, später vielleicht ein Maul).
- **Import seiner SVGs:** Beim Einlesen neuer Zeichnungen wird ein Anker nur glatt, wenn seine Griffe höchstens 0,2° neben einer Geraden
  liegen und sich dabei kein Kurvenpunkt um mehr als 0,0002 Einheiten ändert; sonst bleibt er eine Ecke mit genau seinen Winkeln. Fast
  glatte Anker nennt der Importbericht; glatt macht er sie selbst mit ⇧C (A29). Übernahme und Migrationen glätten nie: Seine
  Kopfdrehung und seine Schlüssel kommen als Ecken mit genau seinen Winkeln nach Studio. **Gemessen wird immer an Kurvenpunkten,** nicht
  an Griffen: je Kurvenstück t = 0, 1/8, …, 1, Abweichung ist der größte Abstand zweier Kurvenpunkte mit gleichem t (Befund 11).
  **Geschrieben wird ungerundet,** in der kürzesten Darstellung, die beim Lesen dieselbe Zahl ergibt: Eine Rundung träfe an Kurvenpunkten
  auch die Grifflängen, und das Mischen seiner Kopfdrehung verstärkt jede kleine Änderung zwischen dicht liegenden Schlüsseln (in der
  Prüfung gemessen bis 0,012 Einheiten und bis 0,57, wo eine Rundung kurze Griffe auf Länge 0 setzt). So bleibt der Rundweg bitgleich,
  und die Parität (2.3) erwartet unter 10⁻⁶ bei der Schwelle 0,001.
- **Bindung** (Entwurf B §2.1): Ein Teil hängt mit Schlüsseln an einem oder zwei Reglern. Die **Ansicht** ersetzt die Gestalt (genau eine
  Hauptachse je Teil, etwa Kopf θ oder Körper ψ). Eine **Zusatzform** addiert einen Versatz und ist an der Ruhestelle ihrer Achse null.
  Was sie ist, sagt ihre Achse: **Formziel** (freier Regler), **Korrekturform** (Gelenkwinkel), **Kreuzschlüssel** (zwei Regler),
  **Posenkorrektur** (Gewicht einer Pose), **Nachschwingen** (Ausgang einer Feder).
- **Zwei Achsen, eine Regel** (Felder und Kreuzschlüssel, Befund 16 f): Die Schlüssel liegen auf einem Gitter; fehlende Gitterpunkte
  ergänzt der Bauplan, nie die Datei. Gemischt wird längs der ersten Achse, dann längs der zweiten; exakt an jedem Schlüssel.
- **Zusatzformen liegen im mitlaufenden Rahmen** der gezeigten Form, einem Bezugsrahmen für alle (3.1): je Anker längs und quer zur
  Richtung vom vorigen zum nächsten Anker, geteilt durch die örtliche Größe (halber Abstand dieser beiden Nachbarn; an Ecken und glatten
  Ankern gleich), dazu Winkel- und Längenversatz der Griffe, die Längen ebenso geteilt (04 §7.4; Formel im Bauplan). Ändert Florian
  später einen Ansichtsschlüssel, folgt die Zusatzform; eine in der Front gezeichnete Braue zeigt auch bei 90° und in der gespiegelten
  Hälfte richtig.
- **Die Welt ist auch eine Form** (Entwurf C §2): Der Hügel ist ein geschlossener Pfad, Buckel und Gräben sind Bearbeitungen davon; die
  Ruhe der Pfütze zeichnet Florian, die Physik bewegt nur ihre oberen Anker.

### 2.2 Mischarten

PCHIP (monoton, ohne Überschwingen) bleibt die Kurve über die Schlüssel; die Mischarten unterscheiden sich darin, welche Größen gemischt
werden. Die Mischart steht als kleines Wort an der Leiste (Entwurf C §2).

- **„Rahmen + Rest“**, Standard für alles Neue: Drehung und Größe des Teils, gemischt über Winkel und Logarithmus, dazu ein kleiner Rest;
  Griffe relativ zur örtlichen Tangente (06 §2.6). Exakt an den Schlüsseln, schrumpft beim Drehen nicht.
- **„je Koordinate“** für seine Kopfdrehung: genau `formAusSchluesseln` aus `raster.ts`. Gewechselt wird nur auf sein Wort; das
  Vergleichsbild in derselben Ansicht entsteht in M1 (B2), vorläufig bleibt „je Koordinate“ (A2). **„linear“** nur als Rückfall.
- **Kreisregler mischen periodisch** (06 §2.5); seine Kopfdrehung bleibt über die Front wie heute (vorläufig, A3). Das Video über die
  Front mit und ohne entsteht in M1 (B2; 04 §7.3); gewechselt wird nur auf sein Wort.
- **Spitzenführung** (aus `spitzenFuehren`) ist eine Einstellung jeder Bindung: Gewählte Anker werden zwischen zwei Schlüsseln im Rahmen
  ihrer Nachbarn geführt und ziehen sich auf die Kante zurück, statt durch den Nachbarn zu klappen. Bei Ozzy: Bart, Masken und Ohren
  zwischen 45° und 90°. **Sie ruht, solange zwischen ihren Grenzen ein Schlüssel dieser Bindung liegt,** Stützen (2.3) ausgenommen
  (Befund 13; in der gespiegelten Hälfte gilt die Führung des Partners). So ist jede Form an jedem Schlüssel exakt, und die Übernahme
  bleibt gleich dem Prototyp; heute ruht sie deshalb am Bart. Legt ein Zug dort einen Schlüssel an, ruht die Führung im selben
  Rückgängig-Schritt; die Vorschau sagt es vorher.

### 2.3 Seine Kopfdrehung kommt als Daten

`raster.ts` wird nicht portiert; Studio enthält keinen Code, der ein Teil von Ozzy nennt (Arbeitsregel 7). Ein Übernahme-Werkzeug (Node)
schreibt Studio-Daten (Entwurf B §2.3, ergänzt): alle übrigen Schlüssel der Kopfteile mit Herkunft und Grund (Vorlagen, gebaute,
Falten; heute rund 140 Einträge der Leiste, gespiegelte mitgezählt), seine (am 20.11. 16) nicht: Die setzt der Server beim Laden ein
(nächster Absatz); die **Abschnitte** genau wie im Prototyp (0° bis 90° und 270° bis 360° aus einer eigenen Liste mit Anschluss hinter
90°, dazwischen die Drehung nach hinten; den Anschluss bilden **Stützen**, verborgene Schlüssel, die nur die Steigung formen). Die zweite
Hälfte ist keine Spiegelung der ersten: In den Listen stehen dort die gespiegelten Schlüssel des Partners als Einträge, dazu sein
eigener Rücken bei 180° und seine eigene Front bei 360° (Rücken und Front sind nicht spiegelgleich; eine reine Spiegelung wiche bis
55 Einheiten ab); nur die Teile ohne Rücken (Bart, Ohrspalt) spiegeln zwischen 180° und 270° ihren Partner. Die **Spiegelregel** (A und B
getauscht, Nase umnummeriert) ordnet dort nur Malreihenfolge, Wechsel und mitgespiegelte Regler, nie die Gestalt. Dazu kommen die
**Spitzenführung** (45° bis 90°, gespiegelt 270° bis 315°); die **Klemmen** der Fenster; zwei starre **Knochen**
„Hals“ und „Kopf“ mit Verschiebung, an denen die Kopfschlüssel in ihren eigenen Koordinaten hängen, und vier **Drähte** mit Kennlinien
aus den heutigen Werten (θ → Kopfversatz, ψ → Halslage, je x und y); die **Wechsel** der Malreihenfolge (Nase bei 140°, Fenster bei ψ
22,5° und 67,5°, Tausch ab 180°). Starre Knochen und Drähte kommen deshalb schon in M1 (Befund 1).

**Seine Datei bleibt die Wahrheit, bis er umzieht** (Befund 5, A1). Bis dahin ist `docs/look/ozzy-figur/schluessel.json` eine fremde
Quelle: Studio liest sie bei jedem Laden direkt aus dem Arbeitsbaum, also immer seinen aktuellen Stand, und setzt seine Schlüssel als
Datensätze mit Herkunft „dein“ ein, ohne sie zu speichern; geschrieben wird die Datei nie. Speichert er im Prototyp, startet die
Übernahme des Kopfs neu und schreibt nur, wenn Werte und Parität halten. In Studio ist sein Kopf bis dahin zum Ansehen (Leiste fahren,
Zwiebelhaut, Vergleich); formen kann er ihn im Prototyp oder in einem Probe-Projekt. Die Übernahme führt datensatzweise zusammen: Sie
ändert nur Datensätze mit Herkunft „gebaut“ oder „vorlage“; einen Datensatz mit Herkunft „dein“ lässt sie stehen, wie er ist, schreibt
den Rest und meldet, was sie stehen gelassen hat (für die Inhalt-Skripte gilt dasselbe, Plan 4.9). Der
**Umzug** ist ein Befehl, „Kopfdrehung übernehmen“, den nur er auslöst; danach formt er den Kopf in Studio, und seine Datei bleibt, wie
sie ist. Der Umzug setzt in `projekt.json` den Vermerk `umgezogen`: Danach lässt jede Übernahme, auch der volle Lauf am Etappenende, die
Quelle und den Kopf aus, und was er danach im Prototyp formt, kommt nicht mehr nach Studio (A1). Vorläufig gibt es keinen Umzug.

**Parität** (M1): Kopfdrehung von 0° bis 360° in Schritten von 0,5° mit Kopfversatz und Halslage, jeder Kurvenpunkt unter 0,001
Abweichung (2.1), dazu ein Video neben dem Prototyp an seinen Problemstellen (Verklumpen bei 156° bis 180°, Rutschen; B1); sechs Winkel
reichen nicht. Einen Rückfall gibt es dafür nicht: Die Listen sind schon die des Prototyps samt gespiegelter Einträge, und nichts wird
gerundet (2.1). Eine Abweichung ist ein Baufehler, gesucht an der Tabelle der größten Abweichung je Teil (Abschnitt 12).

### 2.4 Anker, Fang, Falten, Wechsel

- **P in allen Zuständen** (Entwurf A §2): P auf der Kurve setzt einen Anker in jedem Schlüssel an derselben Stelle (de Casteljau), ohne
  eine Form zu ändern; P auf einem Anker löscht ihn. Vorher zeigt die Leiste je Schlüssel die Abweichung rot; gefragt wird nur über 0,5
  Bildpunkte (Entwurf C §2). Ein ⌘Z. Anker in seinen Schlüsseln löscht nur er. P ändert keine Herkunft eines Schlüssels: „dein“ wird
  dabei nur das Teil selbst (seine Ankerliste), damit keine Automatik sie überschreibt (Befund 3).
- **Fang wie heute: Jeder Zug landet am Tropfen**, gerundet auf das Raster der Leiste (Kopf 0,5°, sonst 1/200 des Bereichs, eigene
  Schätzung). Liegt dort ein Schlüssel, wird er geändert, sonst entsteht einer mit Herkunft „dein“. Gebaute Schlüssel desselben Teils,
  die näher als 4° an einem seiner Schlüssel liegen, **ruhen** (Entwurf B §2.5, heute `KORREKTUR_NAH`), und zwar in jeder Liste des
  Teils und als gespiegelter Eintrag beim Partner; Faltschlüssel, Stützen und gebaute Schlüssel an den Stellen gezeichneter Ansichten
  ruhen nie (der Prototyp lässt sie stehen, sonst kämen die Falten zurück), und ein Schlüssel „dein“ an genau derselben Stelle lässt auch
  einen Vorlage-Schlüssel ruhen. Ruhende Schlüssel mischen nicht mehr mit und kommen zurück, wenn sein Schlüssel geht. Seine
  Schlüssel ändert nur ein Zug genau an ihrer Stelle. Eingerastet wird nur beim Hingehen, wie heute; vor dem Zug
  zeigen rote Ringe, was ruhen würde. (Entwurf A lenkte Züge auf Nachbarschlüssel um; ein Zug bei 2° hätte seinen Logo-Schlüssel bei 0°
  geändert.)
- **Falten** sind Schlüssel der Art Falte, als Punkt auf der Leiste verschiebbar und formbar. Drei Wächter je Bild (Sehnenumkehr,
  Schlaufe, Selbstschnitt) setzen rote Striche, nie eine stille Reparatur; „Falte setzen“ schlägt einen Faltschlüssel vor (06 §3).
- **Wechsel** schalten Sichtbarkeit, Malreihenfolge oder Teile, mit einer Breite (0 = hart an verdeckter Stelle); „Teil tauschen“ sind
  zwei Wechsel an derselben Stelle mit derselben Breite, angelegt in einem Schritt (Befund 16 l). Was verschwindet, läuft auf einen Punkt,
  nie auf eine Linie; ein Wächter meldet Formen ohne Breite (Falle aus der Übergabe ozzy-figur).
- **Fremde Formen:** eine SVG auf eine Stelle der Leiste fallen lassen; ein Assistent gleicht Laufrichtung, Startanker und Ankerzahl an,
  Paarmarken lassen sich umsetzen, „Vorlage darüber“ zeigt rot, ob sie exakt getroffen ist (Entwurf A §2). Fällt eine Zeichnung auf eine
  Stelle der gespiegelten Hälfte (etwa Körper ψ unter 0°), wird sie dort eine eigene Ansicht, und die Spiegelung dieser Teile endet in
  dieser Hälfte (die Vorschau sagt es vorher); den Partner auf der anderen Seite ändert sie nie (A18).
- **Ruhe-Wächter:** Nach jeder Änderung prüft Studio im Hintergrund rechnerisch, ob jede Vorlage und jede Pose in Ruhe ihre Anker trifft
  (jeder Kurvenpunkt unter 0,001); der Bildvergleich mit dem freigegebenen Bild läuft auf Knopf und am Etappenende. Repariert wird nichts.

### 2.5 Gegenüberstellung

Nach Gesamtbericht 3.2 a und 06 §9.1.

| Mischart | exakt an Schlüsseln | Drehung ohne Schrumpfen | Kosten | Urteil |
|---|---|---|---|---|
| gerade Bahnen (After Effects, Lottie, Spine, Live2D) | ja | nein: 71 % bei 90° | trivial | Rückfall |
| Anker gerade, Griffe polar (Rive) | ja | nur die Griffe | gering | als Teilschritt enthalten |
| je Koordinate mit 100°-Ausnahme (Prototyp) | ja | nur bei dichten Schlüsseln | vorhanden | **bleibt für seine Kopfdrehung** |
| **Rahmen + Rest** (06 §2.6) | ja | ja | klein | **Standard für alles Neue** |
| ARAP-Interpolation (Cavalry „Rigid“) | ja | ja, auch Biegung im Teil | mittel bis groß | später als Mischart „biegen“ |
| über Abstandsfelder (Cavalry „Implicit“) | Anker gehen verloren | – | mittel | nein |

**Wo „je Koordinate“ gewinnt:** Seine dichten Schlüssel sehen heute richtig aus, und jeder Wechsel könnte seine Formen ändern; deshalb wird
nie still gewechselt. **Urteil:** „Rahmen + Rest“ ist PCHIP auf besseren Größen. Ob es am Kopf schöner ist, zeigt das Vergleichsbild an
einem Ohr, das sich zwischen zwei Schlüsseln um 120° dreht, und an der Stirnfranse zwischen 52° und 82° (06 §11), gebaut in M1 (B2); bis
zu seinem Wort bleibt der Kopf, wie er ist (A2).
**Verweise:** Gesamtbericht 3.2, 3.8, 4.6 Nr. 8, 9, 21; 04 §7; 06 §1 bis §3, §8; Entwurf A §2, B §2, C §2.

---

## 3 Knochen und Gewichte

**Entscheidung:** Knochen nur, wo sich etwas biegt (starre Teile, Biegeachsen, Gewichte mit Drehzentren; Gewichte je Anker und
Griffpaar an Biegeachsen wie an gewichteten Teilen); jeder Knochenwinkel ist ein Regler, Formänderungen werden in einem Bezugsrahmen vor
den Knochen gespeichert und drehen mit, und bedient wird mit drei Handgriffen: Anfasser posieren, V verschiebt, A formt.

### 3.1 So funktioniert es

**Drei Aufhängungen.** Wie ein Teil an Knochen hängt, heißt seine Aufhängung (Fachwort Skinning; „Haut“ bleibt im Projekt die Fläche aus
den Linien).

| Aufhängung | Bewegung | bei Ozzy |
|---|---|---|
| **starr** | ganz an einem Knochen; die Naht schließt der Renderer durch Verschmelzen | alle Kopfteile am Kopfknochen (Masken, Ohren, Ohrspalt, Nase, Bart); vorläufig die Bohne (A5) |
| **Biegeachse** | Bézier-Achse von der Wurzel zum Ende, Länge bleibt; zugleich die IK, kein Einfallen; Gewichte je Anker zwischen Achse und Elternknochen | Beine und Schwanz; Fenster und Keile hängen an der Achse ihres Beins, das Schwanzweiß an der des Schwanzes (w = 1); bei der Katze auch der Rumpf |
| **Gewichte** | bis vier Knochen je Anker, Drehzentren (Le und Hodgins 2016); lineares Mischen als Schalter | bei Ozzy vorerst keins; die Bohne nur auf sein Wort (Video in M9, B14); Teile der Katze |

- **Jeder Knochenwinkel ist ein Regler** (Entwurf B §3.2): Pose, IK, Physik und Anfasser stellen denselben Wert; jeder Winkel hat eine
  Leiste, Korrekturformen hängen daran wie Ansichtsschlüssel am Kopfwinkel.
- **Gelenke reiten auf der gemorphten Elternform** (Anheftung, 07 Schritt 7): Verformt sich das Elternteil, wandert ein Gelenk ohne
  Schlüssel mit, etwa die Ohrgelenke der Katze auf ihrem Kopf. „Anheftung“ gilt nur für Gelenke; ein Teil ohne eigenen Knochen hängt über
  seine Aufhängung am Knochen seines Elternteils. Ozzys Ohren und Bart haben keine eigenen Knochen: Sie hängen starr am Kopfknochen und
  schwingen über ihren Chip „Schwingen“ nach (Nachschwingen an seinem Physik-Regler, 6.4).
- **Zeichen- und Physikmodell sind getrennt** (Gesamtbericht 4.6 Nr. 15): gezeichnet werden Biegeachsen und starre Teile, gerechnet
  Rumpf vorn, Rumpf hinten, Kopf und vier Federbeine; das Körpermodell ist ein Datensatz der Figur (6.3).
- **Ozzys Rig kommt als Daten:** `rueckgratBauen` wird die Biegeachse (geprüft mit `haltung.test.ts`); `ELTER` („Teile, die am Knochen
  eines anderen hängen“) wird die Aufhängung dieser Teile an der Achse ihres Elternteils (Fenster und Keile am Bein, das Schwanzweiß am
  Schwanz, w = 1); die Haltungen werden Posen. Der Schwanz wird eine Biegeachse (aus dem starren Knochen des Prototyps eine Achse mit
  Biegung 0, die Parität an den Haltungen bleibt; A6). Alle Korrekturen je Haltung, auch die von Schwanz, Fenstern, Keilen und
  Schwanzweiß, werden Posenkorrekturen. Kein Code mit Teilnamen.

**Gewichte auf Ankern und Griffen, eine Regel** (Gesamtbericht 3.3), an gewichteten Teilen wie an Biegeachsen (Befund 17; dort teilt das
Gewicht eines Ankers zwischen Achse und Elternknochen, die Lage auf der Achse bleibt abgeleitet). So wirken Knochen auf einzelne Anker
verschieden stark und, wo es Sinn macht, auf einzelne Griffe, ohne dass eine glatte Kurve knickt: (1) Griffe **erben** die Abbildung
ihres Ankers. (2) Weicht Florian ab, bekommt ein glatter Anker **einen** Satz für sein Griffpaar (bleibt exakt glatt), eine Ecke einen je
Griff. (3) Der **Glätte-Schutz** greift nur, wo eine Stufe die Glätte nicht selbst hält (flüchtige Physik), nie an Ecken, nie in der
Datei. (4) **Vorschläge** des Autorigs kommen aus dem Kurvenpunkt bei t = 1/3 und 2/3, nie aus der Lage des Griffs. **Sehen und ändern**
(Linse Knochen): Knochen oder Biegeachse antippen, die Fläche zeigt Wärme, jeder Anker einen Füllring; Anker senkrecht ziehen ändert das
Gewicht; Halten → Schloss („Griffe erben“ aus) gibt dem Griffpaar einen eigenen Satz (9.5); W malt, als Fachwerkzeug.

**Zusammenspiel von Morph und Knochen**, je Bild in fester Folge (10.3): Ansicht → Anheftung → Zusatzformen im Ruheraum, auch
Korrekturen an Winkeln, die die Physik schon bewegt hat (sonst löst ein schwingender Schwanz seine Korrektur nicht aus; Gesamtbericht 4.6
Nr. 11) → Knochen → flüchtige Schritte, in Ruhe null → Wächter → Bild. Für Florian heißt das nur: Er formt, wo er sieht; Studio speichert
in der Ruhe, und eine Korrektur am Knie dreht mit dem Bein.

- **Rückrechnen** (Entwurf B §3.5): Der Editor hat keine eigene Geometrie. Jeder Zug wird durch die Knochen zurück in den Ruheraum
  gerechnet, und eine Zielregel wählt aus der aktiven Stelle den Datensatz (Ansichtsschlüssel, Posenkorrektur, Zwischenpose,
  Korrekturform). Jeder Schritt nach dem Mischen wird dabei behandelt (Befund 13): Flüchtige Schritte sind beim Formen aus (Ist = Soll),
  Knochen werden exakt umgekehrt, das Ziel ist immer ein Schlüssel an der Stelle. Wirken an einem Ansichtsschlüssel Zusatzformen, bestimmt
  ein Fixpunkt die neue Gestalt (höchstens acht Schritte, sonst eine Meldung statt des Zugs); in der gespiegelten Hälfte ist der Schlüssel
  des Partners das Ziel. Eigenschaftstest: Der gezogene Punkt liegt auf 10⁻⁶ am Ziel, kein Schlüssel an einer anderen Stelle ändert sich.
  Dass sich die Gestalt zwischen Schlüsseln ändert (ruhende Schlüssel, ruhende Spitzenführung), ist gewollt und steht vorher in der
  Vorschau.
- **Ein Bezugsrahmen für alle Zusatzformen** (Befund 12, A10): der mitlaufende Rahmen der gezeigten Form im Ruheraum, vor den Knochen
  (2.1); die Knochen tragen den Versatz mit, ob starr, Biegeachse oder Gewichte mit Drehzentren. Gewählt, weil eine Regel für alles
  reicht, die Datei klein bleibt und Drehzentren das Schrumpfen am Gelenk schon verhindern. Eine Speicherung je Knochen-Einfluss wie bei
  Spine (Gesamtbericht 4.6 Nr. 9) gibt es nicht; ein Vergleichsbild in M9 zeigt beide Arten an einem gewichteten Teil der Katze, um 90°
  gebogen (B14).
- **Bedienung:** **Anfasser** posieren: kleine Ringe an Nase (θ und Blick), Pfoten (Ziel der Biegeachse), Schwanz- und Ohrspitzen und
  Körpermitte; sie entstehen aus den Rollen und erscheinen am gewählten Teil und beim Schweben. **V verschiebt** das Teil als Ganzes, wie
  heute im Werkzeug; an einem Teil mit Knochen ist das eine Formänderung an der Stelle, keine Pose. **A formt** Anker und Griffe. Eine
  **Korrekturform** legt Florian an wie die Kopfdrehung: Gelenkwinkel „auf die Leiste“ holen, mit dem Anfasser biegen, mit A formen;
  streiten zwei Achsen, bietet der Geltungs-Chip „nur in dieser Kombination“ an.
- **Proben aus der Demo** (Entwurf C §3): Die Ohrgelenke der Katze wandern mit, wenn sich ihr Kopf verformt; Katzenbuckel (Biegeachse
  plus Korrekturform); Ozzy in Rückenlage ohne Einschnürung der Bohne; die Schwanzkette löst ihre Korrekturform aus. Für die Bohne zeigt
  ein Video in M9 starr, lineares Mischen und Drehzentren, je im Purzeln und in der Rückenlage (B14); bis zu Florians Wort bleibt sie
  starr (A5). Später: „Pose zeichnen, Studio zerlegt“ (06 §6.4).

### 3.2 Gegenüberstellung

Nach Gesamtbericht 3.2 c.

| Art | Gelenk bleibt voll | Kosten | Urteil |
|---|---|---|---|
| starr | Naht schließt der Renderer | minimal | **Standard** für die meisten Teile Ozzys |
| Biegeachse | ja, IK von selbst | gering | **Standard** für längliche Teile |
| lineares Mischen (Rive, Spine) | nein, schrumpft auf cos(φ/2) | minimal | Schalter; gewinnt, wo Florian es an der Bohne schöner findet |
| Drehzentren | ja, kaum Ausbeulen | klein, vorgerechnet | **Standard** für gewichtete Teile |
| dual-komplexe Zahlen | ja | klein | nein: beult am Gelenk aus |
| Netz-Verformer (ARAP, Gitter) | ja | Netz, Vektorgenauigkeit geht verloren | nur als Werkzeug „Biegen“; das Ergebnis wird ein Schlüssel |

| Bezugsrahmen der Zusatzformen | für | gegen | Urteil |
|---|---|---|---|
| **mitlaufender Rahmen vor den Knochen** (Entwurf B) | eine Regel für alle Aufhängungen; kleine Datei; dreht mit | eigene Herleitung, an gewichteten Teilen noch ungeprüft | **gewählt**; Bild in M9 (B14) |
| je Knochen-Einfluss (Spine) | bewährt; an jedem Knochen genau | ein Versatz je Einfluss, größere Datei, zweite Regel | nein |

**Urteil:** Bei Ozzy entschärft sich die Frage, weil die meisten Teile starr sind. Ein Netz-Verformer gewinnt beim freien Biegen großer
Flächen; diesen Preis zahlt Studio nur im Werkzeug, nie in der Laufzeit.

**Verweise:** Gesamtbericht 3.2, 3.3, 4.6 Nr. 9 bis 15; 03 §10, §11; 06 §4, §6; 07 Schritt 6 und 7; Entwurf A §3, B §3, C §3.

---

## 4 Autorig

**Entscheidung:** Ein Knopf „Knochen vorschlagen“ riggt aus Teile-Graph, Vorlage und einer Achse je Teil, deterministisch im Worker; das
Ergebnis ist eine gewöhnliche Änderung mit einem Rückgängig-Schritt, die nie von selbst nachrechnet und nie Florians Datensätze anrührt,
und das Spiel enthält keinen Autorig.

- **Verfahren** (07 §4): Teile-Graph aus Überlappung, Enthaltensein und Kontakt; Vorlage als Daten (zuerst „Vierbeiner“, sonst
  „Allgemein“); Achse je Teil; Rollen über die Ungarische Methode in beiden Blickrichtungen; Namen aus Illustrator nur als Hinweis.
  Gewichte: An Biegeachsen folgen alle Anker der Achse ganz; nur nahe der Wurzel schlägt der Autorig eine weiche Stufe vor (so breit wie
  das Glied dick); Ketten ebenso weiche Stufen, runde Teile Wärme-Gewichte; Bounded Biharmonic Weights nur bei sichtbarem Bedarf.
- **Nebenprodukte** (Entwurf C §4): das Körpermodell der Figur (6.3: Rumpf als Kapsel, in der Mitte geteilt, Kopf als Kreis,
  Federbeine mit Vorspannung, Glieder für den Sturz), Masse und Schwerpunkt aus den Flächen, Federketten, Füße mit Sohlenrichtung, Seiten
  und Paare, Anfasser und Rollen als Adressen für Regeln („alle Pfoten“).
- **Ablauf:** Knopf → die Knochen wachsen in 0,5 s vom Rumpf nach außen → 3 s Probewackeln → Fragezeichen nur bei echtem Zweifel (zwei
  Vorschauen, ein Tippen) → Gelenkringe ziehen (Mitte verschiebt, Rand macht weicher oder härter), ein Teil auf ein anderes ziehen heftet
  an → jede Korrektur bekommt eine Stecknadel und bleibt beim nächsten Lauf → der ganze Vorschlag ist ein ⌘Z.
- **Er rechnet nie von selbst nach** (Entwurf A §4); nach einer Formänderung meldet der Prüfer Gelenke, die nicht mehr passen. So springt
  kein Rig, während Florian formt.
- **Technik** (Entwurf B §4): reine Funktion im Paket `studio-autorig` in einem dauerhaften Worker, Budget 50 ms (14c §5.5, nicht
  gemessen). Den ganzen Vorschlag rechnet der Autorig nur auf den Knopf. Nach dem Loslassen eines Gelenkrings rechnet der Worker nur die
  Gewichte an diesem Gelenk neu (Florians Zug), nach einer Formänderung und 150 ms Pause nur die Prüfung, welche Gelenke nicht mehr
  passen (für den Prüfer; sie ändert nichts). Quelle „Automatik“; die Schutzregel hält Gepinntes und seine Datensätze fest. Das Spiel lädt
  nur das Ergebnis.
- **Zeitpunkt und Probe:** Ozzys Rig kommt als Daten (3.1); der Autorig kommt mit der Katze (Mittagsrunde, M9; vorläufig, A9), weil
  erst zwei Figuren und fremde SVGs ihn beweisen. An Ozzy ohne Teilnamen trifft er alle Einträge von `ELTER` und `PARTNER` und hängt alle
  Kopfteile starr an den Kopfknochen; für die Katze braucht das Skript höchstens drei Ringzüge, Florian zählt selbst nach (B14); ein
  Vogel und ein Fisch aus fremden SVGs laufen nur zur Probe mit (07 §9). **Ozzys Rig ersetzt er erst nach einem Vergleichsvideo und
  Florians Wort.**

| Ansatz | kann gut | scheitert an | Urteil |
|---|---|---|---|
| Handarbeit (Spine) | alles, genau | Zeit, Fachwissen | nur als Korrektur |
| Achse der ganzen Silhouette | Glieder einer Form | Scheinäste, überlappende Teile | je Teil ja |
| Posenschätzung mit neuronalem Netz | Bilder ohne Struktur | nur trainierte Körper, nicht erklärbar | nein |
| **Teile-Graph + Vorlage + Achse** (07) | nutzt die Teile, schnell, erklärbar, korrigierbar | Figuren aus einem Umriss; neue Körperbaupläne brauchen eine Vorlage | **ja** |
| lebendig, rechnet nach jeder Formänderung nach (07 §5) | Rig passt immer | das Rig springt beim Formen | nein; der Prüfer meldet statt dessen |

**Wo die Handarbeit gewinnt:** an einer fertig gerigten Figur wie Ozzy; deshalb behält er sein Rig. **Urteil:** Der Autorig lohnt sich ab
der zweiten Figur; zwei Figuren sind ein dünner Beweis, darum laufen fremde SVGs mit. **Verweise:** Gesamtbericht 3.4, 4.7; 07 §3 bis §5,
§9; Entwurf A §4, B §4, C §4.

---

## 5 Posen und Übergänge

**Entscheidung:** Eine Pose ist ein Stand der Regler einer Schicht; jede Pose geht über den Ausgleich in jede andere, und der erste Zug in
einem Übergang macht ihn zum gestalteten Übergang mit Taktleiste, Zwischenposen, Abschnitten (auch „bis Ereignis“), Zusatzbewegungen,
Marken und Spannung.

### 5.1 Posen und Ausgleich

- **Pose** = benannter Stand der Regler und Knochen einer Schicht; die **Grundform** ist die erste Posenkarte. **Vier Schichten:** Körper;
  Kopf und Blick; Gesicht; Physik (immer oben, nie posiert). Eine Gesichtspose mischt sich mit jeder Körperpose (12 statt 60 Posen,
  05 §4.5).
- **Posen-Reihe** über der Leiste; in der Schicht Körper nach Zuständen des Vierbeiners gruppiert (Stehen, Gang, Sprung, Panne, Erholung),
  damit rund 35 Posen lesbar bleiben. **Posen wie Folien:** ＋ hält fest; Tippen macht eine Pose zur Stelle, und die Figur fließt über den
  Übergang hinüber, so sieht man ihn; Halten zeigt mehr (verdoppeln, spiegeln, umbenennen, nur Teile, als Zyklus, löschen); nach oben
  ziehen mischt stufenlos. Die Posenkarte **„Ausprobieren“** speichert nie (in der Recherche „Probe“; umbenannt, weil „Probe“ die Abnahme
  einer Etappe heißt): Dort stellen nur Anfasser Regler, A, V und P sind gesperrt (die Statuszeile sagt warum), und Halten → „als Pose
  behalten“ macht eine Pose daraus.
- **Ausgleich je Regler** (Entwurf B §5.2): Springt das Soll eines Reglers, egal wodurch (Pose, Regel, Klick, Draht), übernimmt er den
  Unterschied als Versatz und führt ihn mit einer kritisch gedämpften Feder auf null; das neue Soll läuft ungebremst. Jeder Zwischenstand
  liegt auf seinen Schlüsseln, jeder Wechsel ist umlenkbar und behält den Schwung. Das ersetzt die Feder mit 16/s des Prototyps, die jede
  gestaltete Bewegung um rund 0,125 s verschob (05 §7). Beim Formen gilt Ist = Soll.
- **Vorrang** (Befund 16 c): Ein gestalteter Übergang stellt die Regler seiner Taktleiste selbst; der Ausgleich greift dort nur, wenn er
  unterbrochen wird oder mit einem Sprung beginnt. Jeder andere Sprung (Regel, Draht, Hand im Spiel, Laune, Ende eines Übergangs, Wechsel
  der Spiegelhälfte) läuft über den Ausgleich des Reglers.
- **Standardübergang:** **Dauer** und **Federung** (0 % = kein Überschwingen), global und je Paar. Den globalen Standard trägt der
  Übergang „jede → jede“ jeder Schicht (Startwert wie heute 0,7 s, Federung 0 %); Ausnahmen gelten für ein Paar, „nach Y“ oder „von X“,
  das genaueste gewinnt. **Nachlauf** (0 bis 0,5 s) hat jeder Regler; in den Eigenschaften eines Teils stellt er die Regler seiner
  eigenen Knochen: Bei Ozzy kommen so Kopf und Schwanz später an (Überlappung ohne Schlüssel). Ohren und Bart haben keine eigenen Knochen
  (3.1); sie kommen über ihren Chip „Schwingen“ später an. Runde Achsen nehmen den kürzeren Weg; Höchsttempo je Achse (Kopf 160°/s wie
  heute).

### 5.2 Gestalteter Übergang

**Er entsteht durch den ersten Zug** an einer Stelle eines Standardübergangs; einen Schritt „Übergang anlegen“ gibt es nicht (Entwurf A
§5.3). Er übernimmt Dauer und Verlauf der Standardfeder, damit sich nur die geformte Stelle ändert; ab dann zählt die Leiste Sekunden.

```
Übergang Trab -> Sprung -> Trab, Variante „normal“                       (Schicht Körper; Nachklang 0,7 s)
Posen           [Trab]-weich 0,15-[Ausholen]-auf 0,10-[Strecken]- - bis Landung, höchstens 1,5 - -[Flug]-fallen 0,25-[Landung]
Zusatzbewegung                                                                         Plumps (Stärke aus der Landung)
steht           == Hinterpfoten ============                                           == alle Pfoten ==
Spannung        100 % ................................................................ 80 % kurz, dann 100 %
Marken                                     * Absprung                                  * Tapp, Staub
v Spuren        Kopf θ, Ohr A schwingt
```

- **Zwischenposen** sind Posenkarten auf der Zeit; ein Zug legt eine an oder ändert die an der Stelle. Eine eigene Übergangsform als Glocke
  gibt es nicht.
- **Abschnitte:** Dauer durch Ziehen der Kante, Kurvenart durch Halten (weich, fallen, auf, linear, Feder). **Abschnitte „bis Ereignis“**
  (Flug bis Landung, Rutschen bis Stillstand, Liegen bis Ruhe) enden an einem Ereignis der Physik, mit Höchstdauer, gestrichelt (Entwurf C
  §5). Ohne sie liefen Landepose und Landung auseinander. Die Taktleiste zeigt sie mit der zuletzt gespielten Dauer; der Prüfstand spielt
  sie echt, Spulen nach 1.1.
- **Zusatzbewegungen** (Hüpfer, Plumps, Seufzer, Wedeln) addieren auf Regler; **Balken „steht“** je Pfote: Was steht, bleibt in der Welt
  stehen, die Figur verschiebt sich als Ganzes. **Marken** tragen Klang und Ereignisse und feuern erst ab halbem Gewicht (14d §3.3).
- **Spannung ist ein Regler der Figur** (0 bis 1, Standard 1; Entwurf C §5, Befund 16 h): wie fest jedes Teil seiner Zielpose folgt; je
  Rolle der Knochen kann ein eigener Regler sie verfeinern, beide multiplizieren sich. Posen setzen sie, gestaltete Übergänge führen sie
  als Spur. So ist der Sturz eine Kurve im Übergang, kein zweites System.
- **Unterbrechen** je Übergang: sofort (Standard), am nächsten Halt oder nie. **Umkehren** als Option, **Varianten** mit Gewicht.
- **Regie-Übergang:** Ein gestalteter Übergang des Dings „Rahmen“ trägt Spuren beliebiger Regler (Kamera, Himmel, Katze, Musik): die
  kleine Zeitleiste für Abgang und Ankunft. **Kamera, Musik, Himmel und Rahmen sind Dinge mit Posen und Übergängen** wie Ozzy; Rahmen,
  Kamera und Musik sind dafür Figuren ohne Teile (nur Regler, Schichten, Posen, Übergänge), die Uhr ist ein Baustein am Rahmen
  (Befund 16 d).

### 5.3 Jede Pose in jede andere: die Tafel

Gespeichert wird „Standard plus Ausnahmen“; Ausnahmen dürfen „von jeder“ oder „nach jeder“ Pose gelten (Entwurf B §5.1). Die Brücken der
Posen-Reihe zeigen die Ausnahmen, die **Tafel** ▦ alle Paare einer Schicht (nach den Haltungen und Abläufen des Prototyps):

```
von \ nach   Stehen     Hocke    Sitzen     Liegen      Diener
Stehen       ~          .        G2         G2          .
Hocke        .          ~        .          > Diener    .
Sitzen       G          .        ~          G           .
Liegen       G          .        G          ~           .
.  Standard   Gn  gestaltet, n Varianten   > X  über X   x  gesperrt   ~  Verweilen
```

Die Diagonale ist das Verweilen einer Pose (etwa Schnüffeln, Schlafatmen). Stehen hat vorläufig keins, damit Ozzy im Stand genau sein
Logo ist (Grundgesetz 2, A28). „Über X“ setzt Wege zusammen und ersetzt `weg()`. **Filter statt Erreichbarkeitsanalyse:** Standard ist
„mit Ausnahmen“ (Entwurf C §5); ein zweiter Filter „im Spiel gesehen“ zählt aus Mitschnitt und Lauf-Dateien, welche Paare vorkamen. Alle
Zellen bleiben formbar. Zellen zeigen einen Filmstreifen; Schweben spielt ihn ab (Mac, Stift), Tippen macht den Übergang zur Stelle und
die Leiste zeigt ihn als Taktleiste, Doppeltippen zeigt die Zelle groß. Auf dem iPhone ist die Tafel eine Liste je Pose.

### 5.4 Zyklen, Gang, Kehrtwende

Ein **Zyklus** ist eine Posenkarte mit ↻; seine Leiste ist die Phase, angetrieben von Zeit (Atmen) oder Weg (Gang). Der Gang ist ein Feld
aus Phase und Tempo mit den Zeilen Schritt, Trab, Galopp; die Balken „steht“ sind die Kontaktphasen. **Der Planer bestimmt die Kontakte,
der Zyklus das Aussehen** (Gesamtbericht 4.6 Nr. 16): Bei jedem geplanten Aufsetzen wird die Phase auf die gezeichnete Kontaktstelle
gezogen; Standpfoten rutschen nie.

**Die Kehrtwende am Scheitel** ist beim Balancieren der häufigste Übergang (Spiel-Richter). Vorläufig dreht sie den Körper über die Front
(A4): ψ von 90° über 0° auf −90°, links gespiegelt wie die zweite Hälfte der Kopfdrehung (A18), ein gestalteter Übergang der Schicht
Körper von 0,5 s, jederzeit unterbrechbar. Gewählt, weil sein Stehen bei 0°, 45° und 90° gezeichnet ist und die Spiegelung den Rest
trägt; über den Rücken müsste der Körper von 90° bis 180° erst gebaut werden wie beim Kopf (Befund 8).

- **Gang und Posen:** Während der Wende ruht der Gang (Phase hält, Standpfoten stehen, Wunschtempo 0). Gewendet wird nur aus „Stehen“,
  weil nur Stehen eine Vorderansicht hat; aus jeder anderen Pose, auch aus „Schritt“, geht der Planer zuerst über den Ausgleich nach
  „Stehen“. Andere Posen bekommen eine Vorderansicht erst, wenn Florian eine Zeichnung auf „Körper 0°“ fallen lässt.
- **Körper:** Die beiden Rumpfkörper (6.3) rücken über ihr Gelenkziel zusammen (gezeichneter Abstand mal |sin ψ|, mindestens die halbe
  Rumpfbreite); keine Hülle wird je Takt umgeformt; die Beinachsen gleichen Pfotenhöhen am Hang aus.
- **Kopf:** In der gespiegelten Hälfte von ψ werden die Regler mitgespiegelt, die die Spiegelregel nennt (bei Ozzy θ, Nicken, Kopf
  schief). Posen und Regeln nennen θ relativ zur Laufrichtung; θ = 0° bleibt der Blick in die Kamera, und die Taktleiste der Kehrtwende
  führt θ beim Durchgang durch ψ = 0° über 0°.
- **Wann:** Kleine Korrekturen am Scheitel werden Schritte rückwärts: Ozzy wendet erst, wenn er länger als 0,3 s jenseits des Scheitels
  ist (eigene Schätzung, Regler „Wenden nach“ am Vierbeiner; A17). Die Spielwiese prüft das zuerst. Gesprungen wird, wenn der Planer es
  aus dem Tempo entscheidet; ein Schalter „Springen auf Tippen“ am Vierbeiner (vorläufig aus) lässt ihn zusätzlich springen, wenn man
  neben ihn tippt; ein Tippen auf ihn weckt und tröstet ihn wie immer (11.2, A17, A21).

### 5.5 Gegenüberstellung

| Modell | eigene Zwischenposen | Kontakte | an Physik-Ereignisse gebunden | unterbrechbar mit Schwung | Übersicht bei 35 Posen | Aufwand |
|---|---|---|---|---|---|---|
| Mischzeit je Paar (Spine) | nein | nein | nein | Überblenden | gut | gering |
| Überblendung mit Dauer (Rive) | nein | nein | nein | Überblenden | Graph wird unübersichtlich | mittel |
| Zustandsgraph mit Wegsuche (Unity, Godot) | Clips | Fußkontakte | über Parameter | ja | bis etwa 8 Zustände | mittel |
| **Standard plus Ausnahmen mit Taktleiste** | ja | ja | ja | ja | Tafel mit Filter | mittel bis hoch |

**Wo die anderen gewinnen:** Spines Mischzeit ist in Minuten eingestellt; Rives Graph zeigt einen Ablauf von Zuständen auf einen Blick.
**Urteil:** Nur das gewählte Modell lässt Florian Übergänge selbst formen, ohne dass etwas springt. Den Graphen gibt es als Zustandsbild
des Vierbeiners zum Ansehen. **Verweise:** Gesamtbericht 3.1, 4.2 Nr. 5, 6, 4.6 Nr. 16, 17; 05 §2.7, §4, §5, §7; Prototyp `ablauf.ts`,
`steuerung.ts`; Entwurf A §5, B §5, C §5.

---

## 6 Physik

**Entscheidung:** Ziel, Feder, Wirklichkeit: Posen geben Ziele, die Welt rechnet Box2D 3.2, die Figur eine eigene XPBD-Schicht, beide in
einem 60-Hz-Takt; Federn schreiben nur in sichtbare Regler, in Ruhe ist alles null, und über den Weg entscheiden die Kriterien K1 bis K9
der Probe P1 „Rad mit Gewicht“, gemessen in M2 (vorläufig, A12).

### 6.1 Grundsatz und Rechner

Physik schreibt nur in sichtbare Regler (Ohr-Schwung, Stauchung, Balance) und in Abweichungen der Knochen, und die nur über die Regler,
die das Körpermodell nennt (6.3); nach dem Ausschwingen ist Ozzy exakt seine Zeichnung (Eigenschaftstest, höchstens 10⁻⁶ je Anker).
Bahnen, Kontakte und Schwung sind immer echt; Cartoon gibt es nur in der Zeit, in den Posen und hinter dem Bildrand (13 §5.5).

| Rechner | rechnet in der Demo | warum dort |
|---|---|---|
| Box2D 3.2 als WebAssembly | Hügel am Scharnier; Rumpf vorn, Rumpf hinten und Kopf mit Motor-Gelenken; im Sturz zehn Glieder; Ball, Wurst, Andenken, Wippe | Ruhe und Reibung echter Kontakte (14a §3b) |
| eigene XPBD-Schicht | Ohren, Bart, Schwanzkette, Stauchung, Kopf ruhig halten | Federn auf seinen Formen, in Ruhe null |
| Felder in TypeScript | Staub, Spritzer, Pfützenfläche, Fühler | nur sichtbar, ohne Rückwirkung |

Die Schnittstelle `WeltAdapter` (Entwurf B §6) hat rund 25 Funktionen in unseren Begriffen, liest mit einem gesammelten Aufruf über die
WebAssembly-Grenze und hat eine Attrappe für Tests; Rapier ist der Rückfall dahinter. **Eine Quelle, drei Ableitungen** (14a §6.3): Aus
dem gezeichneten Hügel entstehen beim Bearbeiten die Kette für Box2D, das Abstandsfeld für Fühler und die Strecken des Renderers; Zeichnung
und Kette liegen höchstens 0,5 Bildpunkte auseinander. Haltungen wirken über Gelenkziele, nie durch Umformen einer Hülle je Takt.

### 6.2 Hügel und Finger

Startwerte, nicht gemessen (13 §2, 14a §3a, Entwurf C §6.3); L ist Ozzys Körperlänge.

| Größe | Startwert | Wirkung |
|---|---|---|
| Radius | 14 L | Kippzeit √(R/g) = 0,84 s; Rundenlänge 88 L; Bildrand bei rund 28° |
| Schwerkraft | 20 L/s², eine je Welt | Kippzeit, Sprung, Fall |
| Radgewicht | Randmasse 5 × Ozzy; Stufen 1 ×, 5 ×, 20 ×, „Boden“ | wie stark seine Schritte den Hügel mitdrehen |
| Lagerreibung | Motor mit Tempo 0; Auslauf aus 30°/s in rund 2,5 s (eigene Schätzung) | Schwung nach dem Loslassen |
| Griff des Fingers | Feder 4 Hz, Dämpfung 1, Höchstkraft 1 × Ozzys Gewicht (eigene Schätzung) | Halten hält, Rucken verpufft |

Halten, Ziehen und Loslassen sind drei Zustände desselben Motor-Gelenks. Läuft Ozzy stärker an, als der Griff hält, rutscht der Hügel
sichtbar weg: ein ehrliches „er zieht ganz schön“.

### 6.3 Ozzys Körper

- **Das Körpermodell ist ein Datensatz der Figur** (Befund 6), einer je Figur, damit es in jeder Szene und jedem Probe-Projekt dasselbe
  ist; Bausteine (Vierbeiner, Schläfer) nehmen es von der Figur ihres Dings. Es hat drei feste Körper mit Rollen, **Rumpf vorn** und
  **Rumpf hinten** (die Bohne als Kapsel längs ihrer Hauptachse, in der Mitte geteilt) und **Kopf** (Kreis um die Kopfmitte), mit
  Motor-Gelenken, deren Höchstkraft die Spannung ist; **vier Federbeine** aus Strahlen an den Wurzeln der Beinachsen, mit Vorspannung
  (unter dem Gewicht, das sie tragen, haben sie genau ihre gezeichnete Länge); zehn Glieder nur für den Sturz. Für Ozzy schreibt das
  Inhalt-Skript diese Werte, für neue Figuren, auch die Katze, der Autorig.
- **Kopplung an die Zeichnung:** Der Wurzelknochen folgt immer dem Körper „Rumpf hinten“ (Lage und Drehung der Figur). Jeder andere
  Körper schreibt seine Abweichung vom Gelenkziel nur in die Regler, die das Körpermodell nennt (bei Ozzy: Rumpf vorn längs → Stauchung,
  Kopf Winkel → Nicken). Die Abweichung wirkt mit einem Anteil, der über eine Feder auf null geht, sobald alle Körper seit 0,5 s fast
  stillstehen: In Ruhe zeigt die Figur genau Pose und Zeichnung, auch wenn die Motor-Gelenke unter der Schwerkraft nachgeben. Hängt an
  einem Regler ein Chip der Figurphysik (Schwingen, Kette, Stauchen, Ruhig halten), gewinnt der Chip; die Abweichung eines Box2D-Körpers
  zählt dort nur im Sturz. Test: 10 s Stehen auf ebenem Boden, jeder Anker auf 10⁻⁶ wie gezeichnet. Auf dem runden Hügel stellen die
  vorgespannten Federbeine die Pfoten auf den Rand (für die Wurzel gilt nur die eine Regel oben), den Rest der Krümmung (unter 0,005 L)
  gleichen die Beinachsen aus; dort ist Ozzy in Ruhe also nicht ganz genau seine Zeichnung (vorläufig, A27; der Prüfstand zeigt die
  größte Abweichung als Zahl).
- **Antrieb als Kräftepaar** (14a §3b): Die Pfotenkraft folgt dem Unterschied zwischen Wunschtempo und Tempo, begrenzt durch Bremskraft
  und Haftung, und wirkt gegengleich auf den Hügel. Daraus folgt die **Stehzone** tan α ≤ min(Bremskraft/g, Haftung): 0,3 g auf Gras
  ergibt ±17°, Matsch (Haftung 0,1) ±6°, ohne Sonderregel.
- **Wunschtempo aus dem Hang ist ein Draht** mit Kennlinie: bis 3° Stand, bis 8° Schritt (1 bis 2 L/s), bis 13° Trab (2 bis 4 L/s), bis
  17° Galopp (4 bis 6 L/s) (13 §2.2). **Ihre Steigung ist die erste Schwierigkeitsschraube** (Spiel-Richter, nachgerechnet): In der
  Gehzone bestimmt sie das Kippen, nicht √(R/g); bei festgehaltenem Rad läuft Ozzy in rund 1,2 s von 3° bis 17° (Zeitkonstante rund
  0,7 s). Der Prüfstand zeigt sie, die Spielwiese prüft sie zuerst. Grob spielbar ist sie schon in M2: P1 hat einen Modus „Tapsen“
  (dieser Draht, ein Kräftepaar mit 0,3 g Bremskraft, Ozzys Logo starr auf den Körpern, ein Wippen im Schritttakt statt des Gangs), den
  Nicole auf dem iPhone ohne Erklärung probiert (Befund 10, B5).
- **Schrittplaner** (08 §5.2): Standpfoten stehen fest und rutschen nie; ein Schritt kommt im Takt der Gangart, bei überschrittener
  Reichweite oder wenn der Kipppunkt die Stützstrecke verlässt; Ziel nach Raibert, Schritthöhe 0,18 L (eigene Schätzung).
- **Sprung aus der Fähigkeit:** Sprunghöhe 0,5 L ergibt 4,5 L/s Absprung und 0,45 s Flug. Der Planer springt, wenn die Bahn das Ding
  überdeckt, sonst verweigert er (zu langsam) oder streift (zu schnell). So verlangt jedes Ding von selbst ein Tempo, ohne Regel je Ding.
- **Stolpern** löst der Vierbeiner aus gemessenen Größen aus (Hängenbleiben, Rutschen, Überrennen, Überkippen, harte Landung über 6 L/s).
  Die Regie darf ein Stolpern anfordern; es läuft durch dieselbe Rechnung. Ein Befehl „Wurf“ ist gebaut, der Rückwurf kommt nur auf sein
  Wort (vorläufig aus, A20).
- **Sturz:** Fangschritte bis 0,5 s → Entscheidung → Spannung in 0,1 s auf 30 %, Ziel „Purzeln“ → Liegen mit 5 % → Ruhe erkannt → Lage
  einordnen → gestaltetes Aufstehen dieser Lage, Spannung in 0,4 s auf 100 % → Schütteln (08 §6, §7). Die Spannungskurve ist ein Regler im
  Übergang; der Sturz ist kein zweites System.

### 6.4 Chips, Prüfstand, Blick voraus

- **Physik als Chips** mit Dauer und Federung wie bei Übergängen; innen f = 1/Dauer, ζ = 1 − Federung (eigene Umrechnung nach Apple 2023,
  zu prüfen). Vorgriff, Schwerkraft-Anteil, Wind und Grenzen unter „Mehr“; Spines gekoppeltes Paar Stärke und Masse entfällt. Arten:
  Schwingen (Pendel zwischen seinen Extremen), Kette (rechnet innen Glieder und schreibt in die drei Regler einer Biegeachse, damit sie
  eine glatte Kurve bleibt und ihre Korrekturform auslöst), Stauchen, Ruhig halten, fest, lose, Gelenk, Wasser, Teilchen; **Gelee** (Federn
  auf einzelnen Ankern) nur für wabbelige Dinge; an Teilen, die wie gezeichnet bleiben (alle Teile Ozzys), wirkt er nur, wenn Florian ihn
  selbst anschaltet (Regel für Ozzy in 7). Drei Charakter-Regler der Figur bündeln Werte (schwer–leicht, fest–wabbelig,
  geschickt–tollpatschig, je −1 bis 1); Bausteine lesen sie, statt eigene zu führen (Befund 16 i). Startwerte in 11.7.
- **Prüfstand in der Linse Physik:** Unter dem Finger liegt der Körper; Ziehen stößt an, ein Ohr greifen schnippt es. Dazu Schütteln, Wind,
  Dinge fallen lassen, Launen per Knopf, Zeitlupe, Einzeltakt, Spulen, „zehnmal gleich“ und Röntgen (Schwerpunkt, Kipppunkt, Hüllen,
  Sprungfenster, Kennlinie). **„Extreme formen“** holt die Achse eines Chips auf die Leiste. **Aufnehmen** macht aus einem Stück Mitschnitt
  einen gestalteten Übergang mit Zwischenposen der Herkunft „Aufnahme“. **Beim Formen ruht die flüchtige Schicht** als blasser Umriss.
- **Blick voraus** (in der Recherche „Spur der Zukunft“; umbenannt, weil „Spuren“ die Leisten im Regie-Übergang sind): Umrisse der nächsten
  1 bis 2 s beim Ziehen an einem Physik-Regler. Er kommt erst, wenn die Messseite Luft zeigt: Federn über ihre geschlossene Lösung, Ketten
  und Welt in einer Kopie im Worker, höchstens 1 ms im Hauptthread; ohne das kostet er 18 bis 84 ms je Ziehbild (14c §5.5). Bis dahin
  zeigt der Werteverlauf, wie ein Regler nachschwingt.

### 6.5 Gegenüberstellung

Nach Gesamtbericht 3.5 a und 14a §4.

| Kriterium (Gewicht) | A: eigener XPBD-Kern | **B: Box2D + XPBD** | B′: Welt steht, Schwerkraft dreht | C: Rapier + XPBD |
|---|---|---|---|---|
| Ruhe und Reibung echter Kontakte (hoch) | − | ++ | ++ | ++ |
| Sturz mit 10 bis 14 Körpern (hoch) | o | + | + | ++ |
| Dynamisches Rad mit Rückwirkung (hoch) | ++ | + | o | + |
| Morphende Hüllen (mittel) | + | o | o | + |
| Aufwand bis zur Probe (mittel) | −− (Wochen) | + (4 bis 6 Tage) | o | + |
| Pflege über Jahre (hoch) | − | + | + | o |

**Wo die anderen gewinnen:** der eigene Kern beim Rad mit Rückwirkung und bei morphenden Hüllen, Rapier bei Mehrkörpergelenken.
**Urteil:** Weg B, weil gerade die Schwächen eigener Kontakte (Zittern, Kriechen, Hüpfer) die Bilder sind, die Florian als Fehler sieht.
Über den Weg entscheiden K1 bis K9, gemessen in P1 (Halten, Rückwirkung, Auslauf, Hinsetzen am Hang, Popo-Rutschen, Sturz, Spulen, Tempo,
Treue; 14a §7.2). Ist K5 oder K6 rot, wählt der Bau selbst B′ (Welt steht, Schwerkraft und Kamera drehen), dann Rapier hinter
`WeltAdapter`, und trägt es in die Liste ein; Florians Blick auf das Rad folgt in B4 (A12). **Verweise:** Gesamtbericht 2.8, 2.9, 3.5,
4.6 Nr. 1 bis 7, 22, 23; 08 §5 bis §9; 13 §2; 14a §3 bis §8; Entwurf A §6, B §6, C §6.

---

## 7 Effekte und Rendern

**Entscheidung:** Der Abstandsfeld-Renderer des Prototyps wird zu einem Zeichenmodell als Daten verallgemeinert (Verbindungen, Fugen,
Dickenregel, Wechsel, Effekte); auf Ozzy kommt nur, was sein Logo erhält, alles andere geschieht um ihn herum.

- **Abstand ist die Sprache** (10 §8.1): Verschmelzen, Verjüngungen statt Outline, weiche Ränder, Schein und Kontaktschatten sind
  Funktionen des Abstands zur Kante. Kein fertiger Renderer verschmilzt Flächen.
- **Zeichenmodell als Daten** (Entwurf B §7): Eine **Verbindung** zwischen zwei Teilen oder Gruppen heißt „verschmelzen“ oder „Fuge“, ihr
  Maß ist ein Regler. Ein **Effekt** hat ein Wo, ein Profil über dem Abstand und eine Stärke als Regler. Daraus wird der Bildshader
  übersetzt, neu nur bei einer Strukturänderung. **Übersetzung des Prototyps:** `FLUESSIG` je Paar wird Verbindungen, `durchbruch` die
  Dickenregel, `deckung` ein Wechsel mit Breite, der Verdecker ein Effekt (bei Ozzy mit Stärke 0 wie heute), die Klemmen Regler; die
  Gewichte von Verdecken (|sin 4θ| vorn) und Durchbruch (|sin 4θ| vorn, |sin 2θ| hinten) werden Drähte über θ. Der Ohrspalt bleibt ein
  Teil wie heute (ein weißes Teil; der Keil des Renderers ist im Prototyp aus); Fugen gibt es für neue Figuren. So bleibt Ozzy nach dem
  Umzug exakt sein Logo.
- **Stufe 1** (10 §8.5, 14c): Felder nur im Rahmen jeder Figur, feste Stückzahl beim Abflachen (Wang: je Kurvenstück aus dem größten
  Kontrollpolygon über alle Schlüssel, je Zoomstufe; neu nur bei einer Strukturänderung oder einer anderen Zoomstufe, nie je Bild),
  Reichweite je Flächenpaar, Spitzenregel, unter 100 WebGL-Aufrufe je Bild, Neuaufbau nach Kontextverlust, alle Shader beim Laden.
  Kachel-Durchgang und WebGPU sind Reserve. Halbe Feldauflösung verändert seinen Look: nur mit seinem Wort und erst, wenn die übrigen
  Rückfälle für das Tempo nicht reichen (Abschnitt 12).
- **Wer einen eigenen Feldsatz bekommt** (Technik-Richter): Im Datenmodell ist alles Gezeichnete eine Figur. Einen Feldsatz bekommen nur
  Figuren, deren Form sich bewegt (Ozzy, Katze, Schmetterling). Dinge, die nur als Ganzes bewegt werden (Steinchen, Stamm, Ball, Wurst,
  Brett, Körbchen), werden je Form in eine Feldtextur gebacken und gedreht gezeichnet. Der Hügel ist gebacken oder analytisch, Pfützen
  und „Kamera nass“ sind analytisch (ohne Brechung). Der Rückblick zeigt höchstens sechs Ozzys. Die Messseite misst das in M2 vor dem
  Bau, mit Ersatzszenen aus seinen SVGs: Ozzy einmal und sechsmal, eine Ersatz-Spielwiese, zwei bewegte Figuren (Befund 10).
- **Eine Grammatik:** Jeder Effekt ist ein Chip mit Stärke und Weichheit; das Profil steht unter „Mehr“; angetrieben fest, über Schlüssel,
  Pose oder Draht.
- **Regel für Ozzy, in den Daten** (Befund 9, 30 d; A7): Auf seinem Körper erscheint nur Verschmelzen, Dickenregel (Weiß läuft über die
  Outline), Kantenglättung mit Spitzenregel, Weiß nachgeben (ein weißes Teil gibt dem Schwarz darüber weich nach, statt hart
  abzuschneiden, wie heute an den Beinfenstern) und die Beinschattierung in Bewegung; Stauchen ist ein Regler zwischen seiner Zeichnung und
  gebauten Schlüsseln, die er nachformen kann. **Verdecken ist bei Ozzy aus** (Stärke 0 wie heute: Durchbruch statt Verdecken); eine
  andere Stärke stellt nur er ein. **Schatten fallen auf Boden und Welt, nie von selbst auf Ozzy;** auf ihm schaltet sie nur Florian an.
  Die Übernahme markiert jedes Teil Ozzys als „wie gezeichnet“, und jede Effekt- und Chipart sagt in ihrem Register, wie sie an solchen
  Teilen wirkt: immer mit ihrer Stärke (Verschmelzen, Dickenregel, Kantenglättung, Verdecken, Weiß nachgeben; Chips Schwingen, Kette,
  Stauchen, Ruhig halten), nur in
  Bewegung und in Ruhe null (Beinschattierung) oder nur, wenn Florian sie selbst anschaltet (alle übrigen samt Kontakt- und Bodenschatten;
  Standard für jede neue Art).
  Keine Regel nennt ein Teil. **Gebaut, aber auf Ozzy aus, bis er sie will:** Schmierbild, Aufprallbild, Verformung nach Tempo, Zittern,
  Bewegungslinien, Schein, Auflösen und der Chip Gelee (Gesamtbericht 4.6 Nr. 19). Effekte der Demo in 11.7.
- **Zeitpunkt** (Befund 22, A8): Die Effekte der Spielwiese (Staub, Bodenschatten, Dithering, Linien, Beinschattierung) kommen mit dem
  Renderer in M6, zuerst gezeigt an einer Testfigur, vorher und nachher in gleicher Ansicht (B10); die Effekte für besondere Momente
  kommen in der Abendrunde (M10, B15).
- **Kostenampel „iPhone“** oben im Editor; bis zur Messung am iPhone mit der Umrechnungsregel (Prozessor mal 1, Grafik mal 3 bis 4; 14c
  §6.4), gemessen am Mac in Safari, sobald Florian dort die Automation eingeschaltet hat (B6), bis dahin in WebKit: ein Hinweis, keine
  iPhone-Messung.
- **Klang und Haptik als Chips an der Ursache** (14d §3): an einer Marke, an einem Kontakt mit Aufprallstärke, an einem Zustand oder über
  einen Draht (Rumpeln nach Drehtempo). Was hinter dem Bildrand passiert, kommt im Dreiklang aus Klang, Bild am Rand und Stoß, weil
  niemand den Stummschalter lesen kann.
- **Export:** zuerst Bildfolgen und Sprite-Sheets aus derselben Laufzeit, auch als erster Weg ins Hauptspiel (10.5); Vektor-Export nur
  mit gebackener Kontur, als Notausgang.

| Weg | Verschmelzen, Dickenregel | Form ändert sich jedes Bild | iPhone | vektorgenauer Export | Urteil |
|---|---|---|---|---|---|
| **eigener Abstandsfeld-Renderer** | ja | sehr gut | WebGL2; Tempo zu messen | nur über Backen | **wählen** |
| Rive, Vello, Skia | nein | gut | gut bis schwer (Größe, WebGPU) | – | nein |
| PixiJS v8 | nein | Neu-Zerlegung je Bild | gut | – | nein |
| geometrisch (paper.js, Clipper2) | nur ähnlich | boolesche Operationen je Bild | Prozessorlast | **ja** | als Backen für Export und Logo-Vergleich prüfen |

**Wo die anderen gewinnen:** Rive und Vello zeichnen große Szenen exakt ohne Feldkosten; der geometrische Weg liefert als einziger eine
vektorgenaue Kontur. **Urteil:** Nur ein Renderer, der Abstände kennt, liefert Florians Look aus einem Wert; das Risiko ist das Tempo,
deshalb misst die Messseite zuerst. **Verweise:** Gesamtbericht 2.10, 3.6, 4.6 Nr. 19 bis 21, 27; 10 §7 bis §9; 14c §5, §6; 14d §3, §4;
Entwurf A §7, B §7, C §7.

---

## 8 Spiellogik ohne Code

**Entscheidung:** Fertige Bausteine (Verhalten in Code), Drähte (stetige Kopplung) und Regeln in drei Satzarten (Sobald, Solange, Laune),
Vorrang über fünf sichtbare Bänder, ausgeführt im Takt mit „Warum?“; eine neue Verhaltensart ist eine registrierte Bausteinart, alles
andere baut Florian selbst.

- **Bausteine** haben Regler, Messwerte, Zustände, Ereignisse und Befehle (14b §7.2). Sie sind **registrierte Arten mit Version, Schema
  und Migrationen**; ihre Anschlüsse erscheinen ohne weiteren Code in Bedienung, Regeln und Prüfer (Entwurf B §8). Den inneren Automaten
  des Vierbeiners sieht Florian als Zustandsbild und hängt Posen an dessen Zustände. Bausteine der Demo in 11.7.
- **Drähte:** Quelle → Kennlinie → Glätten → Regler. Gelegt wird ein Draht, indem man in der Linse Spiel vom Ausgang auf den Regler zieht;
  die Kennlinie erscheint, beim Spielen läuft ein Punkt auf ihr mit, und die Leiste des Reglers sagt „getrieben von Neigung“ (Entwurf A
  §8). Drähte bilden einen Graphen ohne Kreis und schreiben nie Zustände.
- **Regeln** sind Sätze am Ding; die Lücken füllt Florian durch Tippen auf Dinge, aus kurzen Listen oder indem er Posenkarten hineinzieht:

```
Sobald   [genau ein Ereignis]   falls [Zustände]   dann [Einmal-Aktionen, Befehle]   höchstens alle [n s]
Solange  [Zustände]             halte [Kanal] auf [Wert, Pose, Wunsch]                mindestens [n s]
Laune    [Name]  wenn [Ereignis]  falls [Zustände]  Häufigkeit [nach Launen-Regler]
         Ankündigung [Pose, ~1 s]  Wirkung [Sollwerte, Pose, Dauer]  Ende  danach [Pose]  Ruhezeit [n s]
```

- **Eine Laune ändert nur Sollwerte und Posen, nie die Physik**, und ohne Ankündigung lässt der Prüfer keine zu. Dinge bieten Launen an:
  Halten auf der Duftstelle → „Laune anbieten“ legt eine vorbelegte Regel an (Entwurf C §8.5).
- **Regeln gelten für eine Ding-Art oder ein einzelnes Ding.** Eine Regel an „Duftstelle“ gilt für alle Duftstellen, jede mit eigenem
  Gedächtnis (14b §7.8); verdoppelt Florian eine, gilt die Regel mit, und ändert er das Schnüffeln, folgen alle. Soll eine Stelle anders
  sein, trennt der Geltungs-Chip „nur dieses Ding“ sie ab, mit derselben Bedienung wie beim Formen.
- **Bänder** (14b §7.5): Körper vor Regie vor Spieler vor Laune vor Grund. Ein höheres Band gewinnt jeden **Kanal**, den es beansprucht;
  im selben Band gewinnt die obere Regel. Ein Kanal ist ein Eingang eines Dings, um den Regeln streiten (Befund 16 e): jeder Regler seines
  Bausteins (Wunschtempo, Bremskraft, Blickziel …) und je Schicht seiner Figur die Pose (Körper, Gesicht …; bei Kamera und Musik ihre
  Pose), dazu der Zeitfaktor der Szene. Die Bänder sind waagrechte Streifen; eine Regel zieht man in ein anderes. Einmal-Aktionen
  beanspruchen keinen Kanal. **Das Rad ist kein Band:** Der Finger wirkt immer über die Physik. **Grundwert** eines Kanals ist sein
  Regler samt Draht und Hand (oder eine feste Zahl), bei Posen die Pose, die der Baustein verlangt, sonst die zuletzt angeforderte, sonst
  die Grundform; jede Regel ist stärker.
- **Ein Regler hat mehrere Quellen:** Sein Soll kommt aus Pose, Regel, Draht und Hand, sein Ist zusätzlich aus Ausgleich und Physik.
  **„Warum?“** zeigt die Zusammensetzung auch für Regler („Ohr links: Pendel + Pose Erschrecken + Draht von Neigung“).
- **Im Takt** (Reihenfolge in 10.3): Alle Regeln prüfen gegen den Stand des vorigen Takts; Folgen gelten im nächsten Takt; Zufall nur bei
  Entscheidungen, mit Saat und einem Strom je Regel und Quelle (xoshiro128**). Drähte rechnen nach Regeln und Posen (Entwurf B), damit sie
  innerhalb der Figur ohne Verzug folgen; weil Regeln ohnehin den vorigen Stand lesen, ändert das an ihnen nichts.
- **Das Stolpern löst der Vierbeiner aus**, nie eine geschriebene Tempo-Schwelle (14b §7.10).
- **Aufgaben** sind Sätze über Zähler mit Beweis-Lauf; die Beweise laufen als Tests, und nach einer Änderung meldet Studio, welche noch
  gelten. Im Spiel führt ein Baustein am Rahmen, welche erfüllt sind, und stellt die Haken auf dem Zettel über Regler (11.6).
- **Sehen:** Regeln leuchten nach Lage; eine Gedankenblase zeigt im Editor die laufende Laune; „Warum?“ und „Warum nicht?“ an jeder
  Änderung; „hier anhalten“ an jeder Regel. Der Prüfer meldet Kreise, Sobald-Regeln mit Dauerwirkung („Soll das danach zurück? Dann ist es
  eine Solange-Regel.“), Launen ohne Ankündigung, Aufgaben ohne Beweis und Klänge ohne sichtbares Gegenstück.
- **Ehrliche Grenze:** keine Variablen, Formeln, Schleifen, freien Graphen oder Skripte. Eine neue Art Verhalten (ein Vogel, der auf Ozzy
  landet) braucht eine neue Bausteinart in Code.

| Modell | Florian baut es | findet Fehler | Launen mit Ankündigung | passt zur Physik | Urteil |
|---|---|---|---|---|---|
| Ereignisblatt (Construct, GDevelop) | ●●○ | ●●○ | ●○○ | ●●○ | als Satzform übernommen |
| Zustandsgraph mit Datenbindung (Rive) | ●○○ | ●●○ | ●●○ | ●○○ | nur als Ansicht |
| Drähte und Bauteile (Dreams) | ●●○ | ●○○ | ●●○ | ●●○ | Drähte nur für stetige Kopplung |
| Regeln am Objekt (Super Mario Maker) | ●●● | ●●● | ●○○ | ●●● | Grundlage: fertige Bausteine |
| Verhaltensbaum (Halo 2, Unreal) | ●○○ | ●●○ | ●●○ | ●●○ | nur im Inneren eines Bausteins |
| **Bausteine, Drähte, Regeln** (14b) | ●●● erwartet | ●●● erwartet | ●●● | ●●● | **wählen** |

**Wo die anderen gewinnen:** Ein Graph zeigt einen langen Ablauf auf einen Blick; Skripte können alles. **Urteil:** Die Mischung trägt die
Demo (rund 35 Regeln) und hält die Fehler klein, die Laien nachweislich machen (Ereignis und Zustand verwechseln, Dauerwirkung nicht
zurücknehmen; 14b §3). **Verweise:** Gesamtbericht 2.14, 3.9, 4.6 Nr. 17, 24; 14b §3, §6, §7; Entwurf A §8, B §8, C §8.

---

## 9 Bedienung

**Entscheidung:** Eine Grammatik auf drei Geräten, kein globaler Modus: Die Bühne wählt Dinge, die Leiste wählt die Stelle, vor jedem Zug
zeigt Studio, wo er landet, und jede Funktion trägt sich in die Tabelle „Ding × Geste“ ein, sonst wird sie umgebaut.

### 9.1 Grammatik

| Verb | Mac | iPad mit Stift | iPhone |
|---|---|---|---|
| hingehen | Klick auf Leiste, Posenkarte, Raute; J, K; Komma, Punkt | Stift oder Finger auf Leiste und Posenkarten | Finger |
| formen | Ziehen auf der Bühne (Anfasser, V, A, P) | Stift | Finger, grob |
| vergleichen | Z, ⇧Z | Knöpfe an der Leiste | Knöpfe |
| spielen | Leertaste kurz spielt die Leiste; ▶ startet das Spiel | ▶ | ▶ |
| zurück | ⌘Z, ⇧⌘Z | zwei oder drei Finger tippen; Pfeile | Pfeile |

Vier Gesten (12 §6.2), **ohne Ausnahme** (Befund 24): **Tippen** wählt und geht hin; es spielt nie und ändert nie. **Ziehen** ändert an
der Stelle. **Halten** zeigt mehr (am Mac auch Rechtsklick); dort stehen auch Verdoppeln, Runden, Anker setzen und Teil tauschen.
**Doppeltippen** geht hinein: Figur → Teil → Anker; Gelenkring → seine Gewichte; Leiste, Posenkarte, Zelle → groß; Chip → „Mehr“;
Regel → öffnen. Am Kurvenstück und am Griff tut es nichts. Esc oder Tippen ins Leere geht hinaus. Tasten kürzen ab: P setzt Anker (am
iPad ein Knopf am linken Rand), ⇧C rundet, W malt Gewichte, ⌫ löscht die Auswahl (wie Halten → „löschen“). Z zeigt immer die Nachbarn der Stelle (davor warm, danach kalt, wie heute).
**Leertaste kurz** (unter 250 ms, ohne Bewegung) spielt, was die Leiste zeigt; **Leertaste halten und ziehen** verschiebt die Ansicht wie
in Illustrator und seinem Werkzeug (A15). Schweben (Mac, Stift) spielt den Filmstreifen einer Zelle der Tafel ab.

### 9.2 Die Stelle

**Die Bühne wählt Dinge, die Leiste wählt die Stelle** (Entwurf A §9.2). Ein Teil antippen wechselt die Stelle nie; sie wechselt nur in
Leiste, Posen-Reihe, Tafel oder an einem Wert der Eigenschaften. Hängt das gewählte Teil nicht an der Achse der Leiste (ein Bein am
Kopfwinkel), landet der Zug in der aktiven Pose seiner Schicht. Die Stelle ist ein Datum der Sitzung und die Eingabe der Zielregel
(3.1); Werkzeuge schreiben nur über sie und den Store.

| Stelle | gewählt über | ein Zug legt an |
|---|---|---|
| Grundform | erste Posenkarte | Änderung der Grundform (Anfasser: Ruhelage der Knochen) |
| Pose | Posenkarte | Posenkorrektur (Anfasser: Stand der Pose) |
| Achse und Wert | Leiste, Raute, J, K | Ansichtsschlüssel, Korrekturform, Formziel |
| Übergang und Zeitpunkt | Brücke, Zelle | Zwischenpose |
| dazu „nur in Pose X“ | Geltungs-Chip | Kreuzschlüssel |
| Ausprobieren | Posenkarte „Ausprobieren“ | nichts; nur Anfasser stellen Regler, A, V und P sind gesperrt; Halten → „als Pose behalten“ |

**Vier Signale:** der **Tropfen** auf der Leiste, der beim Wechsel mit einer Feder hinüberfließt; der **Rand** der Bühne in der Farbe der
Stellenart; die **Statuszeile** wie heute („ändert: Kopf 150° · alle Posen“, „hier liegt: dein Schlüssel“); die **Vorschau vor dem
Zug**: Beim Schweben über einem Anker pulsiert der Tropfen, und gebaute Schlüssel, die ruhen würden, bekommen rote Ringe (mit dem Finger
beim Aufsetzen). Der Fang ist der von heute (2.4). Der **Geltungs-Chip** bietet nach dem Zug drei Sekunden lang nur weiter oder enger an
(„nur in Pose Sitzen“, „in allen Posen“, „am Knie bei 90°, überall“; in der Grundform „Posen gehen mit“ oder „Posen bleiben, wie sie
aussehen“); wer ihn übergeht, behält, was die Leiste sagte. Dieselbe Bedienung trennt eine Regel von ihrer Ding-Art (8).

### 9.3 Werkzeuge, Linsen, Look

- **Anfasser** posieren. **V** verschiebt Teile als Ganzes, wie heute. **A** formt Anker und Griffe. **P** setzt, was die Linse zeigt
  (Anker, Gelenke, Zonen). **⇧C** wandelt Anker um, **L** ist das Lasso, **W** malt Gewichte; ⇧ rastet ein, ⌥ bricht Griffe. Griffe
  erscheinen als Nadel und erst beim Halten als Haarlinie mit Perle, wie in der Linien-Studie. **B** zeigt das reine Bild ohne Hilfen
  (heute schaltet B das Bearbeiten an; in Studio ist Bearbeiten immer an; A30). ⌘K sucht Befehle, ? zeigt die Gesten; alles kommt aus einem
  Befehlsregister, die Belegung entscheidet Florian. Jeder Handgriff der Laufzeit ist dort ein Befehl mit Geste oder Taste (9.5).
- **Vier Linsen** (Form, Knochen, Physik, Spiel; Tasten 1 bis 4) bestimmen nur, was greifbar ist, nie, was eine Geste bedeutet; Halten
  schaut kurz hinein. Ein **Schlüsselpunkt** neben jedem Wert: ○ ändert sich längs der Achse nicht, ◌ ändert sich, ● Schlüssel.
- **Erweiterbar, ohne dass die Oberfläche wächst:** Feste Orte sind Bühne, Posen-Reihe, Leiste, Eigenschaften (häufige Werte, „Mehr“),
  Bibliothek (＋), Prüfer und Befehlssuche. Neues kommt nur als Achse, Bausteinart, Chip, Vorlage des Autorigs oder Herkunft; kein neues
  Panel, kein Modus, keine neue Geste. **Geprüft** (Befund 28): Je Familie (Zusatzbewegungen, Chips, Effekte, Bausteine) trägt ein Test zur
  Laufzeit eine Test-Art ein (Schema, Version, Anschlüsse) und prüft ohne weiteren Code Format, Bauplan, Bedienung, Prüfer und „Warum?“.
  Die neuen Arten der Abendrunde entstehen streng so; am Diff wird geprüft, dass nur ihre Dateien, ihre Schemas und je eine Registerzeile
  dazukommen.
- **Look:** Designsystem liquid drop: Papier, Tinte, Haarlinien, Lobster für Namen und Überschriften, brutalistischer Kontrast; der Tropfen
  fließt (12 §6.16).

### 9.4 Bildschirme

**Mac:** Die Bühne nimmt mindestens drei Viertel ein; feste, einklappbare Bereiche, nichts schwebt (12 §5.3).

```
+-------------------------------------------------------------------------------------------+
| Ozzy > Kopf > Ohr A    1 Form  2 Knochen  3 Physik  4 Spiel    iPhone: grün   ▶   ⌘K  ... |
+----+----------------------------------------------------------------+---------------------+
| V  | ändert: Kopf 150° · alle Posen                                 | Ohr A               |
| A  | hier liegt: mein gebauter Schlüssel „Ohr dreht weg“            | Form              ● |
| P  |                                                                | Verschmelzen      ◌ |
| ⇧C |                          B Ü H N E                             | Schwingen         ○ |
| L  |             (schmaler Rand in der Farbe der Stelle)            | + Verhalten, Effekt |
|    |                                                                | Mehr                |
+-------------------------------------------------------------------------------------------+
| Körper ▾  [Grundform] [Stehen]=[Sitzen] [Liegen] [Erschrecken] [Ausprobieren]  +  ▦ Tafel  |
| Kopf θ ▾  ◆---◇--·--◆--◇--◈--◇---◈--◆----◇----◆     150°  je Koordinate  J K  Z ⇧Z  ●  ⌄  |
|                                ▲ Tropfen                                                  |
+-------------------------------------------------------------------------------------------+
```

In der Linse Spiel zeigt die Leiste die **Strecke**: den Hügel abgewickelt, die Dinge darauf, gefärbt nach dem Tempo, das jede Stelle
verlangt (aus dem Sprungfenster, Entwurf C §9). Ein Ding auf der Strecke ziehen setzt es auf dem Hügel um.

```
| Strecke  0° Körbchen   45° Duft   70° Stamm   140° Buckel   190° Brett   240° Duft   360° |
|          ~~~~~~ Schritt ~~~~~~ Trab ~~~~~~~ halten ~~~~~~~ Galopp ~~~~~~ Schritt ~~~~~~   |
```

**iPad quer mit Stift** (zuerst als Safari-Web-App): dieselbe Aufteilung. Ist ein Stift erkannt, formt nur er; der Finger bewegt die
Ansicht und bedient Leiste, Posenkarten und Knöpfe (Gesamtbericht 4.6 Nr. 25). Ein zweiter Finger während eines Stiftzugs rastet ein; P,
⌥ und ↶ ↷ sind Knöpfe am linken Rand; Schweben zeigt die Vorschau; Trefferflächen 44 pt bei kleinen sichtbaren Punkten.

**iPhone:** quer zum Spielen, hochkant zum Ansehen und für kleine Korrekturen (12 §5.9). Keine Werkzeugleiste: Der Finger zieht Anfasser,
Doppeltippen in ein Teil zeigt seine Anker; die Eigenschaften kommen als Blatt von unten, die Tafel ist eine Liste je Pose. Im Spiel setzt
ein Knopf einen **Merker** (Lauf-Datei), den der Prüfer am Mac mit „Zeigen“ genau nachspielt; das trägt, weil der Simulationspfad eigene
Winkelfunktionen hat (10.3). **Angehalten** zeigt Studio auf allen Geräten die Stellen-Wahl:

```
+--------------------------+   +---------------------------------------------------------+
| Ozzy > Sitzen      ▶ ... |   | angehalten bei 34,2 s            ▶ weiter    nochmal    |
|         BÜHNE            |   | Stelle: [Übergang Trab → Stolpern · 37 %]  (vorgewählt) |
| [Stehen][Sitzen][Liegen] |   |   [Pose Stolpern 2]  [Kopf θ 12°]  [Ohr A schwingt 0,8] |
| ◆--◈--◇---◆   J  K  Z    |   | Mitschnitt --*------*---*--▲------          Merker      |
+--------------------------+   +---------------------------------------------------------+
```

### 9.5 Ding × Geste

Alles, was man anfassen kann (Entwurf A §9.4, ergänzt). Jede Zeile hält die vier Gesten ohne Ausnahme (9.1). J, K und Z wirken immer
auf das, was die Leiste zeigt.

| Ding | sieht man als (Linse) | Tippen | Ziehen | Halten | Doppeltippen |
|---|---|---|---|---|---|
| Figur | Figur | wählt | V verschiebt, ⌥ dreht | Posen, Vorlage darüber, Export, löschen | Teile |
| Teil | Fläche (Form) | wählt; seine Zeile auf der Leiste | V verschiebt | Verschmelzen, Fuge, Ebene, Spiegeln, an Achse hängen, + Verhalten, Effekt, Klang, umbenennen, löschen | Anker |
| Anker | Punkt (Form) | wählt | A verschiebt samt Griffen | glatt, Ecke, rund, löschen | – |
| Griff | Nadel (Form) | wählt | Richtung, Länge; ⌥ bricht | koppeln | – |
| Kurvenstück | Linie (Form) | wählt das Teil | A biegt | Anker setzen | – |
| Anfasser | Ring an Nase, Pfote, Spitze (Form) | zeigt seine Achse | posiert | lösen | – |
| Gelenkring | Ring (Knochen) | wählt den Knochen | verschiebt das Gelenk; Rand: weich, hart | Rolle, starr, biegsam, Knie, löschen | seine Gewichte (Füllringe) |
| Biegeachse | Linie (Knochen) | wählt; Füllringe an ihren Ankern | biegt | Knie, Federkette | – |
| Anker mit Gewicht | Füllring (Knochen) | – | senkrecht: Gewicht | Schloss, spiegeln | – |
| Leiste | Lineal | springt hin | fährt den Wert | Bereich, rund, Spiegeln, Mischart, wer treibt, Wechsel hier, Teil tauschen | groß |
| Schlüssel, Falte, Wechsel | Raute, Punkt, Strich | springt hin, wählt das Teil | verschiebt auf der Achse | Mischart, kopieren, spiegeln, löschen, Breite | Form allein |
| Posenkarte | Karte mit Bild | wird die Stelle; die Figur fließt über den Übergang hinüber | mischen (nach oben), ordnen, in eine Satzlücke | umbenennen, verdoppeln, spiegeln, nur Teile, als Zyklus, als Pose behalten, löschen | groß |
| Brücke, Zelle | Bogen, Filmstreifen | der Übergang wird die Stelle; die Leiste zeigt ihn | Dauer | Art, Unterbrechen, Varianten, löschen (zurück zum Standard) | groß |
| Zwischenpose, Abschnitt, Zusatzbewegung, „steht“ | Posenkarte, Kante, Block, Balken | springt hin | verschiebt; Kante = Dauer | Kurvenart, „bis Ereignis“, Stärke, löschen | – |
| Marke | Sternchen | springt hin | verschiebt | Klang, Ereignis, Chance, löschen | – |
| Chip | Chip am Teil | zwei Regler | Stärke | an, aus, auf Partner, Extreme formen, in Schlüssel, löschen | Mehr |
| Wert in den Eigenschaften | Zeile mit ○ ◌ ● | holt seine Achse auf die Leiste | ändert an der Stelle (dort entsteht der Schlüssel) | Kurve, wer treibt, Warum?, Schlüssel hier | – |
| Ausgang, Draht | Stutzen, Linie (Spiel) | Kennlinie | Draht legen, Kennlinie formen | glätten, lösen | – |
| Regel | Satz am Ding (Spiel) | Beteiligte leuchten | in ein anderes Band | bearbeiten, aus, hier anhalten, Warum?, nur dieses Ding, löschen | öffnen |
| Baustein | Zeichen am Ding (Spiel) | Regler | – | Zustandsbild | – |
| Ding, Zone | Fläche, Bogen (Spiel) | wählt | auf dem Rand verschieben; Rand = Breite | Material, Laune anbieten, verdoppeln, + Verhalten, Effekt, Klang, löschen | Form |
| Weltpfad | Rand des Hügels (Form) | wählt | A formt Buckel, Gräben | Anker setzen | Anker |
| Strecke | abgewickelter Hügel (Spiel) | dreht dorthin | Ding umsetzen | Tempo, Sprungfenster | Ding öffnen |
| Mitschnitt | Leiste im Spiel | springt in den Takt | spult | Saat, zehnmal gleich, aufnehmen, als Beweis, Merker | Werteverlauf groß |
| Prüfer-Hinweis | Zeile, roter Strich | Zeigen | – | übergehen, wiederherstellen | – |

Neues entsteht über ＋ (Bibliothek: Figur, Szene, Stoff, Ding, Zone, Regel, Aufgabe, Text; Posen-Reihe: Pose, Halten → neue Schicht;
Feld: Zeile) oder indem man eine Datei auf Bühne, Leiste oder Bibliothek fallen lässt. **Jeder Handgriff ist ein Befehl dieser Tabelle**
(Befund 14): Alles, was die Laufzeit an Änderungen kennt, hat eine Geste oder Taste, und die Inhalt-Skripte der Demo bauen nur über
diese Handgriffe, so wie Florian es von Hand könnte. Ein Test prüft beides; er wächst ab M3 mit.

### 9.6 Abläufe aus Florians Sicht

**(a) Neue Figur aus seinen SVGs.** (1) SVGs auf Studio ziehen; die erste wird die Grundform. Trägt ein Pfad einen Namen in der Datei
(in Illustrator der Name des Objekts), wird er der Teilname; sonst nummeriert Studio die Teile in der Reihenfolge der Datei, und Florian
benennt sie mit Halten → „umbenennen“ (seine Ozzy-Dateien tragen nur die Gruppen „Ebene_2“ und „Ebene_4“). (2) Weitere
Dateien auf die Leiste fallen lassen (eine Ansicht auf „Körper 90°“) oder auf ＋ (eine Pose). (3) Studio paart die Teile und ergänzt Anker
formtreu; Paarmarken lassen sich umsetzen. (4) „Vorlage darüber“ zeigt, dass jede Datei exakt getroffen ist. (5) Seine Dateien stehen als
schwarze Rauten auf der Leiste; dazwischen mischt „Rahmen + Rest“, Falten meldet ein Wächter. Er fährt ab, schaut mit Z und ⇧Z und formt,
wo es ihm nicht gefällt.

**(b) Knochen vorschlagen.** (1) Linse Knochen, „Knochen vorschlagen“. (2) Knochen wachsen vom Rumpf nach außen, drei Sekunden
Probewackeln. (3) Fragezeichen nur bei Zweifel: zwei Vorschauen, ein Tippen. (4) Gelenkring ziehen, Ringrand weicher oder härter, ein Teil
auf ein anderes ziehen heftet an; jede Korrektur bekommt eine Stecknadel; der Vorschlag ist ein ⌘Z. (5) In der Linse Form zieht er den
Anfasser an der Pfote, und das Bein folgt, ohne länger zu werden.

**(c) Pose formen.** (1) „Stehen“ halten → verdoppeln → „Erschrecken“; die neue Posenkarte ist die Stelle. (2) Mit den Anfassern: Vorderpfoten hoch,
Nase zur Kamera. (3) Mit A: Ohren steiler (eine Posenkorrektur). (4) Der Chip bietet „nur hier“, „am Knie bei 90°, überall“ oder „in der
Grundform“. (5) Z zeigt „Stehen“ als Umriss. (6) Halten → „nur Kopf und Gesicht“ macht eine Gesichtspose daraus.

**(d) Übergang gestalten.** (1) „Stehen“ antippen (die Figur fließt hinüber), dann die Brücke zu „Erschrecken“ antippen: Der Übergang
wird die Stelle, die Leiste zeigt 0 bis 100 % mit der Standardfeder.
(2) Bei 30 % hängt der Kopf; er zieht den Nasen-Anfasser hoch. Jetzt ist der Übergang gestaltet: Dort liegt eine blaue Zwischenpose, die
Leiste zählt Sekunden, sonst hat sich nichts geändert. (3) Bei 10 % formt er ein Ausholen; Kanten ziehen ändert Dauern, Halten die
Kurvenart. (4) ＋ Hüpfer, ein Balken „steht“ für die Hinterpfoten, eine Marke mit Klang bei der Landung. (5) Leertaste kurz spielt in
Schleife, ⇧Z zeigt, ob Pfoten rutschen. (6) Zehnmal schnell zwischen den Posenkarten tippen: Nichts springt.

**(e) Nachschwingen.** (1) Ohr antippen, ＋ Verhalten → „Schwingen“. (2) Seine Zeichnung ist die Mitte; „Extreme formen“ holt die Achse auf
die Leiste, er formt ganz vorn und ganz hinten. (3) Linse Physik: Ozzy anstoßen, das Ohr schnippen; der Werteverlauf zeigt das
Nachschwingen, danach steht das Ohr exakt wie gezeichnet. (4) Halten auf dem Chip → „auf Ohr B übertragen“.

**(f) Laune als Regel.** (1) Linse Spiel, ＋ → „Zone“ auf den Hügel ziehen, Name „Duftstelle“. (2) Halten → „Laune anbieten“ →
Schnüffeln: Die Regel erscheint vorbelegt im Band Laune. (3) Tippen auf „Ankündigung“ springt in die Pose „Nase sinkt“; er zieht die Nase
tiefer. (4) ▶: Ozzy läuft durch. Regel antippen: „Warum nicht? Gangart war Trab (erlaubt: höchstens Schritt).“ Er stellt „höchstens Trab“
ein. (5) Zone verdoppeln: Die Regel gilt mit, jede Stelle hat ihr eigenes Gedächtnis.

**(g) Spielen und nachformen.** (1) ▶: Die Bühne wird das Spiel, die Leiste der Mitschnitt; jede Berührung gehört dem Spiel (am iPad
dreht der Finger das Rad, der Stift hält an). (2) Beim Stolpern sticht das Ohr durch den Kopf: Leertaste. (3) Die Stellen-Wahl zeigt alle
beteiligten Stellen, der laufende Übergang ist vorgewählt. (4) Er formt mit A; die Physik-Abweichung bleibt als blasser Umriss. (5)
„Weiter“ spielt ab diesem Takt, „Nochmal“ mit gleicher Saat und gleichen Eingaben. Was im Spiel geformt wird, bleibt.

### 9.7 Gegenüberstellung und Proben

| Frage | Möglichkeit | für | gegen | Urteil |
|---|---|---|---|---|
| Wohin geht ein Zug? | zwei Modi „Formen“, „Bewegen“ (Rive) | klar getrennt | Modusfehler sind die häufigste Klage über Spine und Rive | nur Gegenprobe |
| | aktive Stelle, Chip danach (12 §6.4) | kein Modus | Fehler erst nach dem Zug sichtbar | Teil der Lösung |
| | **Leiste wählt die Stelle, Vorschau davor** (Entwurf A) | Fehler vor dem Zug sichtbar; so arbeitet er heute | ein Tippen mehr; ohne Schweben Vorschau erst beim Aufsetzen | **gewählt** (A13) |
| Was tut V? | V posiert (Entwurf A) | schnell beim Posieren | heute verschiebt V das Teil; Umlernen | Rückfall |
| | **V verschiebt, Anfasser posieren** | wie Illustrator und heute | Anfasser müssen gefunden werden | **gewählt** (A14) |
| Anhalten im Spiel | Chip schlägt danach eine Stelle vor | schnell | ein Spielbild hat vier bis sechs Stellen; Raten ist riskant | nein |
| | **Stellen-Wahl vorher, vorgewählt** | sicher | einen Blick langsamer | **gewählt** |

**Urteil:** Die aktive Stelle ist eine Wette gegen Rives Erfahrung mit zwei Modi; sie wird früh geprüft, zuerst vom Bau selbst
(Befund 10). **Ort-Probe** (automatisch ab M3, auf einer Kopie, mit echten Zeigerereignissen für Maus und Stift): 200 Züge an zufälligen
Stellen (Leiste, Posenkarte, Brücke) und Teilen; vor jedem Zug werden Statuszeile, rote Ringe und Tropfen gelesen, danach der Diff.
Kriterium: Die Vorschau nennt genau die Datensätze, die sich ändern, und kein anderer ändert sich; ein Fehler ist ein Baufehler. Sie läuft
wieder nach jeder Änderung an Werkzeugen oder Zielregel.

Die Proben mit Florian laufen in **Probe-Projekten** seines Studios, Kopien, die der Bau anlegt; sein Projekt bleibt unberührt (Befund
26). Sie liegen in der Liste bereit, der Bau wartet nicht darauf. **Werkbank-Probe 1** (M3, B7; der Kopf ist dort formbar): Ohr bei 150°
glätten; mit P einen Anker setzen; bei 210° formen und sehen, dass sich der Partner bei 150° ändert; vor dem Zug die roten Ringe sehen
und einen gebauten Schlüssel ruhen lassen; die rutschende Nase mit ⇧Z finden. **Werkbank-Probe 2** (M4, B8): aus „Stehen“ eine Pose
machen; einen Übergang nachformen; eine Vorderpfote mit dem Ring nach vorn setzen (das Bein wird nicht länger); ohne Code eine Dauer, eine
Zwischenpose und einen Hüpfer ändern; zehnmal schnell zwischen Posen tippen. **Bedienprobe** (M7, B12; Entwurf C §9; die Kopie hat keine
Pose „Nasen-Pflug“, keinen Übergang aus „Schnüffeln“ und keine zweite Duftstelle): Ohren beim Bergabgehen anlegen; die Pose
„Nasen-Pflug“ anlegen und den Übergang aus „Schnüffeln“ nachformen; den Schwanz nachschwingen lassen; eine zweite Duftstelle anlegen;
die Stelle finden, an der die Nase beim Kopfdrehen rutscht. Kriterium jedes Mal: vier von fünf ohne Hilfe, am Mac und am iPad, kein
unbemerkter Zug an falscher Stelle. Scheitert eine Probe mit Florian oder Nicole, baut die nächste Welle die Gegenprobe mit zwei Modi
(Rückfall nach Abschnitt 12).

**Verweise:** Gesamtbericht 2.12, 4.2, 4.6 Nr. 18, 25, 26; 11 §9; 12 §5, §6, §9; Übergabe ozzy-figur; Entwurf A §9, B §9, C §9.

---

## 10 Technik

**Entscheidung:** Neun Pakete, zwei Apps und zwei Werkzeuge mit erzwungenen Grenzen, ein eigener Store mit Datensatz-Diffs und
Schutzregel, eine Ablage über den Server mit Sicherung, deterministisches JSON, ein Bauplan in gepackten Feldern und ein 60-Hz-Takt mit
eigenen Winkelfunktionen; das Spiel ist dieselbe Laufzeit ohne Editor. Der Grundweg ist das Web (10.5).

### 10.1 Pakete und Grenzen

| Paket | Inhalt | darf importieren |
|---|---|---|
| `@ee/studio-rechnen` | eigene Winkel- und Exponentialfunktionen (Port der fdlibm), PCHIP, Bernstein, Wang, Zufall, Prüfsumme | nichts |
| `@ee/studio-format` | Datensätze, zod-Schemas, Migrationen, deterministischer Schreiber, SVG-Import | rechnen |
| `@ee/studio-store` | Diffs, Verlauf, Schutzregel, Zusammenführen | format |
| `@ee/studio-laufzeit` | Bauplan, Regler, Form, Knochen, Posen, Logik, Figurphysik, Takt; `editor/` mit Rückrechnung und Wächtern | rechnen, format |
| `@ee/studio-welt`, `-bild`, `-ton` | Box2D hinter `WeltAdapter`; WebGL2-Renderer; Ton über Web Audio | Typen der Laufzeit |
| `@ee/studio-autorig` | Autorig im Worker | format, rechnen |
| `@ee/studio-ablage` | Ablage über den Server (Node, F5): Dateien mit Revision, atomar; Sicherungsring; Fassungen; Beobachter; Sitzungsschlüssel; Weitergabe von Live-Änderungen und Merkern; Erweiterung für die Server von Studio und Spiel | kein Format; Haken setzt der Zusammenbau |
| `apps/studio` | Editor (Vite; Florians fester Stand auf Port 5217, gebaut wird auf 5263): heiße Flächen in eigenem Code, Felder und Menüs mit React 19.3 | alle Pakete |
| `apps/ozzy-spiel` | die Demo (fester Stand auf 5261, fürs iPhone im selben Netz), später mit Capacitor | laufzeit, welt, bild, ton |
| `tools/studio-uebernahme`, `tools/studio-inhalt` | Übernahme des Prototyps; Inhalt der Demo über Handgriffe; die einzigen Orte mit Teilnamen Ozzys | Pakete; schreiben nur über die Ablage |

Das Werkzeug erzwingt die Grenzen (Entwurf B §10.2): Pakete ohne DOM haben kein DOM in der Typbibliothek; im Simulationspfad verbietet
eine Lint-Regel `Math.sin`, `cos`, `atan2`, `exp`, `log`, `pow`, `hypot`, `random` und Uhren; das Spiel importiert weder Store noch
`laufzeit/editor` noch React; kein Paket importiert aus einer App. Aus `apps/editor` wird kopiert, nie importiert, und `apps/editor`
importiert nie etwas aus Studio (sonst lädt sein Fenster neu). Ein Test prüft: **Die Spiel-App hat keinen Spielcode** (höchstens
300 Zeilen für Laden, Vollbild, Eingabe, Freigabe des Tons und die Hülle; Entwurf C §10).

### 10.2 Datenmodell, Store, Format

- **Flache Datensätze mit Kennung** (Typvorsilbe, auch für Anker), Eltern als Zeiger am Kind, Reihenfolge über Bruchindizes (11 §5.2).
  **Alles Gezeichnete ist eine Figur**; ein Ding stellt eine Figur mit einer Rolle (fest, lose, Zone, Bild) in eine Welt, jedes Ding hat
  eine; Rahmen, Kamera und Musik sind Figuren ohne Teile. Jeder Datensatz trägt eine Herkunft (Vorlage, dein, gebaut, Aufnahme), jeder
  Schlüssel dazu seine Art (Form, Falte). **Herkunftsregel** (Befund 3): „dein“ bekommt genau der Datensatz, auf den Florians Geste
  zielt; Folgeänderungen derselben Geste (etwa die neue Zeile in jedem Schlüssel nach P) behalten ihre Herkunft. Ablage unter `content/studio/ozzy/`
  (`projekt.json`, `figuren/`, `szenen/`, `vorlagen/<hash>.svg`, `laeufe/`), Probe-Projekte daneben unter `content/studio/<probe>/`;
  seine `schluessel.json` liest Studio als fremde Quelle, bis er umzieht (2.3), und schreibt sie nie.
- **Eigener Store** wie bei tldraw: Jede Änderung ist ein Diff mit fünf Abnehmern (Verlauf; Speichern 300 ms nach der letzten Änderung
  über die Ablage des Servers mit Revision je Datei; Journal je Gerät in IndexedDB; Live-Verbindung zum Spiel unter 0,5 s über den
  Server des Spiels, auch zur App im selben Netz; Bauplan). Eine Geste ist ein Schritt samt Folgeänderungen.
- **Schutzregel im Code:** Jede Änderung hat eine Quelle (Florian, Automatik, Sitzung, Migration). Nur „Florian“ darf Datensätze mit
  Herkunft „dein“ und gepinnte Werte ändern oder löschen und Datensätze „dein“ anlegen; sonst lehnt der Store ab und nennt sie. Einzige
  Ausnahme ist die Dateikopie eines Probe-Projekts, in der seine Schlüssel „dein“ bleiben. Die Quelle „Florian“ vergibt nur sein Server
  auf 5217 über einen Sitzungsschlüssel; die Seite holt ihn nach jedem Wiederverbinden neu, und ein ungültiger Schlüssel (etwa nach einem
  Neustart des Servers) ergibt „neu verbinden“, nie still eine andere Quelle. Bau- und Probe-Server, Tests und Skripte bekommen sie nie
  (Befund 21). Ehrlich: Das schützt gegen Versehen, nicht gegen Absicht; dagegen hilft die Sicherung.
- **Zwei Geräte und Sicherung** (F5, A25): Fremde Änderungen werden je Datensatz zusammengeführt, nie in seinen Verlauf. Ändern Mac und
  iPad denselben Datensatz, gewinnt der spätere; der frühere bleibt unter „Fassungen“ sichtbar (als eigene Datei) und lässt sich mit
  einem Schritt wiederherstellen. Jedes Speichern legt die vorige Fassung der Datei in einen Ring (die letzten 50 je Datei, dazu eine
  Woche lang je Stunde eine; `content/studio/.sicherung/`, nicht im Git). Übernahme und
  Inhalt-Skripte schreiben über dieselbe Ablage und Schutzregel, nur Datensätze mit Herkunft „gebaut“ oder „vorlage“ unter eigenen
  Kennungen; das gilt für jeden Datensatztyp, und `projekt.json` wird feldweise zusammengeführt. Server, die nicht ausdrücklich auf seinem
  Inhalt laufen (5217, 5261, Läufe der Integration), arbeiten von selbst auf einer frischen Kopie.
- **Format:** JSON mit Versionen je Block und Bausteinart, Migrationen nur vorwärts mit Prüfdatei aus Florians Ozzy. Eine Migration ändert
  nur die Schreibweise seiner Schlüssel, nie ihre Gestalt: Migrationen runden und glätten nicht, vorher und nachher liegen alle
  Kurvenpunkte seiner Datensätze höchstens 10⁻⁶ auseinander, sonst öffnet Studio die Datei nur zum Lesen und meldet es; vor jeder
  Migration kommt die alte Datei in die Sicherung. Deterministisch geschrieben (Zahlen ungerundet in der kürzesten Darstellung, −0 als 0,
  eine Zeile je Anker, atomar): zweimal speichern ergibt dieselben Bytes. Nichts Abgeleitetes in der Datei. **Eine eigene Spielfassung
  gibt es nicht** (Befund 2): Das Spiel lädt dieselben Dateien mit denselben Schemas über seinen Server, nur ohne SVG-Vorlagen und
  Lauf-Dateien, also immer Florians aktuellen Stand; fremde Quellen setzen die Server von Studio und Spiel beim Ausliefern als gewöhnliche
  Datensätze ein, nur die App bekommt sie beim Bauen eingesetzt; der Code des Spiels liest nie `docs/look/`. Merker vom iPhone schreibt
  der Spiel-Server als neue Dateien nach `laeufe/`; Live-Änderungen gehen nur an das Spiel desselben Server-Paars, von Florians Studio
  also nur an sein Spiel auf 5261.

### 10.3 Bauplan, Rechenkette, Takt

Der **Bauplan** übersetzt Datensätze in gepackte Felder und baut nur neu, was von einem geänderten Datensatz abhängt (Test: schrittweise
= voll). Die Rechenkette (Gesamtbericht 4.4, als Module nach Entwurf B §10.7) legt im Bildtakt keinen Speicher an:

```
Je Takt n (1/60 s; Zeitlupe ändert nur, wie schnell Takte folgen; höchstens 5 Takte je Bild)
 1 Eingabe ins Protokoll   2 Postfach aus n−1   3 Regeln gegen den Stand von n−1, je Kanal auflösen, Einmal-Aktionen
 4 Posen und Übergänge fortschreiben   5 Drähte in der Folge ihres Graphen   6 Regler: Soll, Ausgleich bei Sprüngen
 7 Welt: Box2D, 4 Teilschritte   8 Figur: XPBD, 4 Teilschritte   9 Prüfsumme; alle 16 Takte ein Schlüsselstand
Je Bild (Regler und Körperlagen zwischen zwei Takten gemischt, nie Formen)
10 Ansicht je Teil   11 Anheftung   12 Zusatzformen im mitlaufenden Rahmen, Korrekturen an den bewegten Winkeln
13 Knochen   14 flüchtig, in Ruhe null   15 Wächter (nur im Editor)   16 Abflachen → Felder je Figur → ein Bilddurchgang
```

Die Schritte 10 bis 16 sind reine Funktionen; weil Formen einmal je Bild aus gemischten Reglern entstehen, liegen sie immer auf seinen
Schlüsseln. **Ohne laufenden Takt** (beim Formen, beim Fahren einer Leiste) rechnet die Laufzeit einen Durchlauf ohne Zeit: Drähte
(Schritt 5, ohne Glätten) und Regler (Schritt 6, Ist = Soll); im Takt laufen dieselben Funktionen mit der Zeit, so sehen Werkbank und Spiel
dieselben Werte (Befund 1). **Auswerten** rechnet die Schritte 10 bis 16 aus gegebenen Reglerwerten und Körperlagen, ohne den Lauf zu
ändern; Zwiebelhaut, Bahnen, Posenkarten, Filmstreifen der Tafel und die Geister des Rückblicks nutzen es, im Editor wie im Spiel
(Befund 16 j). **Eigene Winkelfunktionen ab Tag eins** (Entwurf B §13; die Recherche wollte sie erst bei Bedarf, 14a Empf. 10): Das kostet
ein bis zwei Tage und vielleicht etwas Tempo (die Messseite vergleicht), dafür läuft ein Merker vom iPhone am Mac genau nach, und jeder
Fehlerbericht wird ein Test. Eine **Lauf-Datei** (Ausgangslage, Saat, Eingaben) ist Beweis, Fehlerbericht, Merker und Regressionstest;
Box2D-Snapshots werden nie Dateien. **Rückblick und Geist** spielen gespeicherte gezeigte Werte über „Auswerten“ ab (rund 100 Zahlen je
Takt), weil eine Lauf-Datei nach jeder Änderung am Inhalt anders nachläuft (Entwurf C §10); der Rückblick ist ein Baustein der Laufzeit,
damit das Spiel ihn ohne eigenen Code zeigt (11.6). **Tempo-Budget** (14c §6, iPhone 16 kalt): Hauptthread höchstens 6 ms, Grafik 8 ms,
GPU-Speicher 150 MB, erstes Bild 2 s; Auswerten 0,5 ms, Abflachen 0,3 ms, Felder Ozzy 3 ms, Bühne 5 ms, Physik und Logik 1,5 ms.

### 10.4 Tests und Übernahme

| Ebene | prüft |
|---|---|
| Rechnen, Determinismus | Bitgleichheit der eigenen Funktionen und Prüfsumme nach 1 200 Takten in Node, Chromium, WebKit; alle Lauf-Dateien |
| Format, Store | Rundweg byteweise gleich; Migrationen; Geste = ein Schritt; ⌘Z exakt; Schutzregel; Ort-Probe (ein Zug an Stelle S ändert nur S) |
| Eigenschaften (fast-check) | exakt an Schlüsseln, kein Sprung, glatt bleibt glatt, Ruhe = Zeichnung, Rückrechnung landet genau |
| Parität | Kopfdrehung gegen den Prototyp, 0° bis 360° in 0,5°, mit Kopfversatz und Halslage, jeder Kurvenpunkt unter 0,001; Editor und Spiel liefern bitgleiche Anker |
| Handgriffe, Erweiterung | jeder Handgriff hat einen Befehl mit Geste oder Taste (9.5); je Familie läuft eine Test-Art ohne weiteren Code durch (9.3) |
| Würfe, Verträge, Bild | Speicher über 10 000 Bilder; Box2D-Adapter gegen Attrappe; Ausschnitte gegen freigegebene Bilder |

Tests, Proben und der Bau-Server arbeiten an Kopien des Inhalts. Ein **Schreibhaken** in jedem Prozess des Baus (Proben, Werkzeuge,
Bau-, Probe-, Prüf- und Vergleichsserver) verweigert und meldet jeden Schreibversuch in Florians Dateien (`docs/look/ozzy-figur/`,
`apps/editor/`): Geprüft wird der Schreibweg der Studio-Prozesse, nicht ob sich die Dateien geändert haben, denn seine `schluessel.json`
ändert er im Prototyp selbst. Meldet der Haken etwas, hält der Lauf an; zurückgesetzt wird nie von selbst. Der Vergleichsserver mit dem
Prototyp hat eine eigene Konfiguration ohne Schreibwege und mit eigenem Zwischenspeicher. Seinen Stand
in `content/studio/` schreiben sein Studio auf 5217 und die Übernahme laufend; dort schützt seine Datensätze die Schutzregel des Stores
(10.2), kein Vergleich von Prüfsummen. Kein Test ersetzt sein Auge.
**Übernahme des Prototyps:** `form.ts` wird kopiert und auf Felder umgebaut; `raster.ts` kommt als Daten (2.3); `renderer.ts` ist der
Ausgangspunkt von `studio-bild`; `haltung.ts` wird Biegeachse, Posen und Aufhängungen (3.1); die acht Abläufe werden gestaltete Übergänge,
Hüpfer, Wedeln und Kopf-Nachfedern Zusatzbewegungen, die gerechnete Stauchung ein Regler mit gebauten Schlüsseln, die Florian nachformen
kann; `werkzeug.ts` ist das Vorbild der Bedienung, der SVG-Import bleibt fast gleich.

| Frage | gewählt | Alternative | wo sie gewinnt | Urteil |
|---|---|---|---|---|
| Rückgängig | Datensatz-Diffs | Befehle; CRDT | Befehle sparen Speicher; CRDT trägt mehrere Geräte offline | Diffs; CRDT erst bei Bedarf |
| Format | JSON mit Migrationen | binär wie Rive | kleiner, überspringt Unbekanntes | JSON; binär nur fürs Spiel bei Bedarf |
| Oberfläche | eigener Code plus React 19.3 | Preact 11 mit Signals | leichter, Live-Werte direkt | React (im Repo); Preact als Rückfall |
| Winkelfunktionen | eigene ab Tag eins | `Math` bis zum Bedarf | schneller, kein Port | eigene: wiederholbar über Geräte |

### 10.5 Grundweg

Die Unterfragen oben setzen einen Grundweg voraus; hier der ehrliche Vergleich (Befund 25). Ob das Web auf dem iPhone trägt, misst die
Messseite in M2 (B3); bis dahin sind alle Tempo-Angaben Schätzungen.

| Grundweg | gewinnt | verliert | Urteil |
|---|---|---|---|
| **Web:** TypeScript, WebGL2, Vite; iPad als Safari-Web-App, das Spiel zusätzlich als Capacitor-App | eine Laufzeit für Mac, iPad und iPhone, für Editor und Spiel; Prototyp, Renderer und Erfahrung sind da; ein neuer Stand ist in Sekunden auf allen Geräten; Proben mit Playwright; Florian öffnet nur eine Adresse | die Zeichenfläche läuft in Safari nahe 60 Hz statt 120 Hz; der Stift nur über Pointer Events (Druck und Neigung ja, keine Pencil-Gesten); WebGL2 statt Metal, das Tempo muss die Messseite zeigen; Speicher unter iOS knapp | **gewählt** |
| **nativ:** Swift, Metal, PencilKit und die Stift-Schnittstellen, eigene Apps | 120 Hz auf Mac und iPad mit ProMotion; alle Stiftgesten; Metal-Tempo; offline | alles neu oder zwei Laufzeiten (Editor nativ, Spiel anders); jeder Stand über Xcode; Proben schwerer; nichts aus dem Prototyp | nein; später eine Hülle fürs iPad, wenn er ohne Mac formen will |
| **Spiel-Engine mit fertiger Laufzeit** (Godot, Unity) | Gerüst, Editor-Rahmen, Physik, Export auf viele Geräte | keine Bézier-Formen mit Morph, kein Verschmelzen über Abstände; sein Look nur mit eigenem Shader und eigenem Morph, also mit dem halben Studio noch einmal; Godot ruht (Stack-Gate) | nein |
| **fertige Werkzeuge** (Spine, Rive) | reif, viele Laufzeiten, Teamarbeit | kein Verschmelzen, keine Verjüngungen; „exakt sein Logo“ nicht erreichbar; Logik und Physik fehlen | nein |

**Wo die anderen gewinnen:** Nativ gewinnt beim Gefühl am iPad (120 Hz, alle Stiftgesten) und beim Tempo; das iPhone 16 zeigt ohnehin
60 Hz. Eine Engine gewinnt beim Gerüst und beim Export, Spine und Rive bei Reife und Laufzeiten. **Urteil: Web bleibt (A23).**
Entscheidend sind zwei Dinge, die nur der Web-Weg ohne zwei Codebasen kann: Editor und Spiel sind dieselbe Laufzeit (Grundgesetz 7),
und jeder Stand läuft sofort auf allen drei Geräten. Reicht das Tempo nicht, greifen zuerst die Rückfälle aus Abschnitt 12 und WebGPU als
Reserve (7); ein Wechsel des Grundwegs wäre ein Neubau und käme nur auf sein Wort.

**Hauptspiel und Stack-Gate:** Ins Hauptspiel `apps/game` (three.js mit WebGPU) kommen Studio-Figuren zuerst als Bildfolgen und
Sprite-Sheets aus derselben Laufzeit (Export in M11); lebendig mit Physik erst, wenn das Hauptspiel sie braucht: Dann rechnet die
Studio-Laufzeit dort mit, und gezeichnet wird über einen nachgebauten three.js-Zeichner oder eine zweite Zeichenfläche (A24). Das offene
Stack-Gate (ADR-0001: three.js und Capacitor sind der Arbeits-Track, Godot ruht) entscheidet Studio nicht. Studio liegt auf derselben
Seite (Web, Capacitor), nutzt aber kein three.js, sondern einen eigenen WebGL2-Zeichner; fällt das Gate anders aus, kommen die Figuren
auch dort als Bildfolgen an.

**Verweise:** Gesamtbericht 2.11, 3.7, 3.8, 4.3, 4.4; 11 §3 bis §6, §11, §12; 14a §3e, §6; 14c §5, §6; Entwurf A §10, B §10, C §10;
Befund 25; ADR-0001.

---

## 11 Spielkonzept für Ozzy

**Entscheidung:** Die Demo ist „Gassirunde: ein Tag auf Ozzys Hügel“: Ozzy steht auf einem runden Hügel, den der Bildrand abschneidet,
der Spieler dreht den Hügel mit einem Finger, Ozzys Lage ist sein Gaspedal, und Ozzy hat seinen eigenen Kopf. Code sind nur die
Bausteinarten, Chiparten und Effektarten; alles andere ist mit dem Editor gemacht.

### 11.1 Die Idee

Jeden Tag dieselbe Gassirunde, jeden Tag ein anderes Drama: Der Spieler bringt Ozzy einmal herum, vom Körbchen zum Körbchen, bevor die
Sonne ihr Stück Himmel durchlaufen hat. Drei Runden (Morgen, Mittag, Abend nach dem Regen) bringen je eine neue physikalische Idee und
sind zugleich die Abnahme einer Stufe des Editors (Entwurf C §11). Ozzy wird blamiert, nie verletzt, und meint es immer ernst.

| | drei Welten (Gesamtbericht 5.3) | **ein Tag auf dem Hügel** (Entwurf C) | Zirkus (13, Richtung B) |
|---|---|---|---|
| Witz | hoch | hoch; der vertraute Ort macht Pannen zu Running Gags | sehr hoch |
| Abwechslung | hoch, drei Bilder | mittel: drei Lichter, Regen | mittel |
| Inhalt für Florian | drei Hügel, drei Dekore | ein Hügel, Tageszeit und Nässe als Regler | Publikum, Takt |
| Gefahr | Umfang | Gleichförmigkeit | Geskriptetes |

**Urteil (vorläufig, A16):** ein Tag auf dem Hügel: halber Inhalt, dieselbe Lehre, und „Regler treiben die Welt“ zeigt Studio besser.
Für eine Vorführung nach außen wirken drei Welten stärker; Winter und Park kommen später als reiner Inhalt. „Unendlich erweiterbar“ wird
schon in Fassung 1 geprüft (Befund 28): durch die Erweiterungstests je Familie (9.3), durch die neuen Arten der Abendrunde, die streng als
Erweiterung entstehen, und durch eine Probe, in der Florian ein neues Ding samt Regel nur im Editor baut (B16). Ein Satz von ihm kippt die
Wahl.

### 11.2 Mechanik und Steuerung

- **Die Lage ist das Gaspedal** (13 §2): bis 3° vom Scheitel Stand, bis 8° Schritt, bis 13° Trab, bis 17° Galopp, darüber Stolpern. Der
  Bildrand liegt bei rund 28°; die gefährlichen Hänge sind immer zu sehen.
- **Laufband und Besen:** Wer Ozzy voranbringen will, lässt ihn etwas kippen und zieht den Hügel nach; Ozzy tapst auf der Stelle, die Welt
  zieht vorbei. Außerhalb der Stehzone kippt es wie ein Besen (0,84 s), in der Gehzone nach der Kennlinie (6.3). Rückwirkung mittel: Bleibt
  er schnüffelnd stehen, trägt ihn ein drehender Hügel aus der Stehzone.
- **Besonderes Balancieren ohne Sonderregel:** Buckel (zweiter Scheitel, Krümmungsradius 4 L, Kippzeit 0,45 s), Graben (Schwung vorher),
  Matsch (Stehzone ±6°), Launen (Stopps, Tempowechsel).
- **Steuerung:** ein Finger überall; eine **Fingermarke** am Rand zeigt, wo er greift. Halten bremst, Ziehen dreht über die Feder,
  Loslassen gibt Schwung; kein Knopf, Querformat. Einstellungen: zwei Daumen, Spieltempo 80 %, Zen-Runde, Bewegung reduzieren.
  **Antippen** weckt Ozzy, weil Safari den Ton erst beim Loslassen der ersten Berührung freigibt (14d §4.1); es tröstet ihn auch bei Angst
  und Sturkopf (A21). Die Stehzone von ±17° und das selbstständige Springen sind vorläufig (A17); ein Schalter „Springen auf Tippen“
  (vorläufig aus) ließe ihn zusätzlich springen, wenn man neben ihn tippt.

### 11.3 Der Hügel und die Runden

Radius 14 L, Rundenlänge 88 L (1 L ≈ 4°), Uhr 120 s je Runde, ein Stern unter 90 s (eigene Schätzung); 0° ist das Körbchen.

| Lage | Morgen (Tau) | Mittag (Sonne) | Abend (nach dem Regen) |
|---|---|---|---|
| 0° bis 25° | Körbchen; frei zum Lernen | Ball bei 20° | Pfütze 1 bei 30° |
| 45° bis 110° | Duftstelle 1 (45°), Stamm (70°), zwei Steinchen | Schmetterling (40° bis 70°), Stamm, Wurst (110°) | Matsch (80° bis 110°), Stamm nass |
| 140° | Buckel, 0,5 L hoch | Katze schläft auf dem Buckel | Buckel |
| 190° bis 240° | Duftstelle 2, Graben unter einem Brett | Wippe (190°), Graben offen (1 L) | Pfütze 2 (200°), Graben mit Matsch |
| 300° bis 360° | Steinchen, Heimweg | Heimweg | Heimweg, Ozzy wird müde |

Morgens lernt man „Lage ist Tempo“ und Halten, mittags Erhöhungen, Ketten von Ursache und Wirkung und Launen, abends wenig Haftung und
Müdigkeit. Das Brett über dem Graben nimmt mittags „jemand“ mit; nach drei Fehlversuchen liegt es wieder da.

### 11.4 Dinge und Launen

Das Tempofenster jedes Dings entsteht aus Sprunghöhe und Schrittlänge, nicht aus einer Regel je Ding.

| Ding | verlangt | zu langsam | zu schnell | Witz |
|---|---|---|---|---|
| Steinchen (0,15 L) | Schritt | – | Fangschritte | Ohren flattern |
| Stamm (0,4 × 0,6 L) | Trab | verweigert, nimmt Anlauf | springt zu früh | Bauchlandung, rutscht ab |
| Buckel | oben halten | rutscht zurück | fliegt drüber | Gipfel-Wackeln |
| Graben (1 L) | Trab bis Galopp | Kanten-Wackeln | harte Landung | Erdkrümel an der Nase |
| Wippe | Mitte, warten | – | Brett schlägt hoch | Katapult auf echter Bahn |
| Katze | leise, Schritt | – | sie faucht | Flucht rückwärts |
| Schmetterling, Ball | darunter halten | – | – | Hochsprung, Rückenlage; Jagd bergab |
| Wurst | Tempo drosseln | – | Gier | Bauchrutscher |
| Pfütze | Sprung im Trab | Sturkopf, Popo-Rutschen | platscht hinein | Schütteln, die Kamera wird nass |
| Matsch | Schritt | – | Spagat | Schlitterpartie mit ernster Miene |
| Körbchen | ankommen | – | läuft vorbei | Einkringeln, Plumps, Seufzer |

Launen: nie zwei zugleich, Launenpause 4 s, Beginn nur mit 1,5 s Vorlauf vor dem nächsten Ding, Häufigkeit über die Launen-Regler des
Vierbeiners Neugier, Mut, Sturheit, Energie, Verfressenheit (14b §7.8; „Charakter“ heißen nur die drei Regler der Figur, 6.4).

| Laune | angeboten von | Ankündigung (etwa 1 s) | Wirkung | Dauer · Ruhe | wenn es schiefgeht |
|---|---|---|---|---|---|
| Schnüffeln | Duftstelle | Nase sinkt, Schwanz langsamer | Wunschtempo 0, Bremskraft hoch | 2–4 s · 10 s | Nasen-Pflug |
| Sturkopf | Pfütze; drei Plumpse in 30 s | Ohren zurück, setzt sich | Sitzen, Bremskraft am höchsten | 3–6 s · 15 s | Popo-Rutschen |
| Jagen | Schmetterling, Ball | Kopf schief, Ohren hoch | zum Ziel, Sprung | 2–4 s · 12 s | Rückenlage |
| Angst | Katze | Buckel der Katze, Ducken | rückwärts, Kehrtwende | 2–3 s · 20 s | Flucht über den Rand |
| Gier | Wurst | schnuppert in die Luft | Wunschtempo hoch | bis zur Wurst · 30 s | Bauchrutscher |
| Flitzen | Ozzy, nass geschüttelt | Spielverbeugung | Galopp, Kehrtwende, Hinplumpsen | 3 s · 30 s | rennt über den Rand |
| Müde | Ozzy, Tageszeit über 80 % | Gähnen mit Kopf, Ohren, Brauen | legt sich hin, schläft | 4–8 s · 15 s | Schlafwalze |

### 11.5 Komik-Momente

Jeder folgt „Ahnung, Pause, Folge“ (13 §5.4); Zeiten sind Startwerte.

1. **Nasen-Pflug:** Ozzy schnüffelt, der Spieler dreht weiter · Nase am Boden, Hinterteil hoch · 1,5 s Niesen, er sitzt plötzlich ·
   2,2 s Blick zum Finger, Brauen beleidigt · weiter, als wäre nichts gewesen.
2. **Popo-Rutschen:** Sturkopf vor der Pfütze, der Hang wird steiler · er rutscht sitzend mit unbewegter Miene · Platsch · 0,8 s Pause ·
   Blick in die Kamera · Schütteln, die Kamera wird nass · Flitzen kündigt sich an.
3. **Schlafwalze:** Er schläft ein; hält der Spieler nicht genau oben, rollt der runde Ozzy schnarchend bergab.
4. **Katzenflucht:** zu schnell am Buckel · Ohr der Katze zuckt · Buckel · Fauchen · Ozzy flitzt rückwärts davon, der Spieler fängt ihn
   drüben.
5. **Abgang über den Rand:** Ozzy verschwindet hinter dem Bildrand · 0,4 s Stille · Scheppern, Staubwolke über dem Rand, Stoß · er klettert
   zurück (Ohren zuerst), ein Andenken kullert hinterher · Blick in die Kamera. Beim Zurückklettern hält eine Regie-Regel Haftung und
   Bremskraft hoch, bis er in der Gehzone ist; es bleibt Physik. Der **Rückwurf** aus Entwurf C („Hepp!“, Flug auf echter Bahn, „Bonk“
   durch das Andenken) kommt nur auf Florians Wort; eine Aufnahme, wie er aussähe, liegt in M8 bereit (B13), vorläufig ist er aus (A20).
6. **Übermut-Plumps:** drei saubere Sprünge, er stolziert · der nächste gerät zu weit, hinter dem Stamm wartet die Pfütze.
7. **Wippen-Katapult:** zu schnell aufs Brett · echte Flugbahn · Landung direkt vor der Katze.
8. **Anlauf nehmen** (Spiel-Richter): Nach einer Verweigerung geht Ozzy zwei Schritte zurück, das Hinterteil wackelt, los.

### 11.6 Sturz, Hilfen, Rahmen, Ton

- **Sturz** kostet 2 bis 4 s, ein Abgang 5 bis 6 s, nie ein Leben: Stolpern (Fiep, Zeitlupe 0,3 s mal 0,4) → Fangschritte → Sturz
  (Plumps, die Musik stockt) → Aufstehen je Lage (Bauch 1,2 s, Seite 1,6 s, Rücken 2,0 s) → Schütteln → Blick in die Kamera (60 %) oder
  Niesen (25 %) → der erste Schritt fällt auf den Schlag. **Der Blick in die Kamera ist die Front des Kopfs, also sein Logo.**
- **Lernen und Hilfen:** Die ersten 10 s ohne Hilfetext; nur der Aufgabenzettel liegt beim Start kurz im Bild. Nach drei Fehlversuchen
  am selben Ding kommt eine Hilfe als Ding (Brett, Zögern vor dem Stamm, tieferer Schlaf der Katze, Trittstein); drei Plumpse in 30 s
  machen Ozzy vorsichtig, drei saubere Sprünge übermütig.
- **Start:** Morgendämmerung, Ozzy schläft eingerollt; der Aufgabenzettel (Lobster) liegt 1,5 s im Bild; Antippen → Aufwachen. **Uhr:** Die
  Sonne wandert ohne Zahl; ist es vorbei, schläft Ozzy, wo er ist. **Ziel:** nach mindestens 300° zurück im Körbchen: **Einkringeln** mit
  zwei Kehrtwenden über die Front (ψ 90° → −90° → 90°), Plumps, Seufzer, Schlussakkord. (Eine Drehung um 360° ginge noch nicht: Gezeichnet
  ist seine Rückansicht bei 180° (`ozzy_back.svg`), aber der Weg des Körpers von 90° bis 180° ist nicht gebaut.)
- **Rückblick:** alle Stürze der Runde gleichzeitig, höchstens sechs Geister, jeder Plumps ein Ton einer Tonleiter. **Tagebuch:** eine
  Seite je Runde in Lobster. **Andenken** sammeln sich in einer Kiste und liegen nie auf Ozzy. Später: ein Geist des besten Laufs.
- **Zettel, Rückblick und Tagebuch gehören zur Laufzeit** (Befund 7), sonst sähe der Spieler sie nie: Die Bausteine „Rückblick“ (spielt
  bis sechs gespeicherte Stürze der Runde über „Auswerten“ ab) und „Aufgaben“ (führt, welche erfüllt sind, und stellt Haken über Regler)
  hängen am Rahmen; gezeigt werden sie als Posen des Rahmens („Zettel“, „Rückblick“, „Tagebuch“), gezeichnet wie alles. **Text ist eine
  Figur, kein zweiter Zeichenweg** (A11): Der Befehl „Text“ legt aus einer Zeichenfolge eine Figur aus Lobster-Buchstaben an, je Buchstabe
  ein Teil in Textfarbe, je Innenraum (o, e, a) ein Teil in Papierfarbe darüber. So ist jeder Buchstabe formbar, verschmelzbar und mit
  Wechseln steuerbar wie jede Form, und das Spiel braucht keinen Schriftcode. Wechselnde Zahlen sind Ziffern-Figuren (zehn Teile mit
  Wechseln an einem Regler); ein Zähler liefert Einer und Zehner, Drähte stellen die Regler. Text auf anderem Grund als Papier braucht
  echte Löcher (später).
- **Ton:** Tapp je Pfote nach Material, Plumps in drei Stärken, Marken für Fiep, Gähnen, Niesen, Seufzer, Schmatz, Schnarchen solange er
  schläft, Rumpeln nach Drehtempo. Musik ist ein Ding mit Posen: ein Stück je Runde, Schichten nach Gangart, Spannung bei knapper
  Kipp-Reserve, Stille beim Stehen, Stopp beim Plumps, Einsatz auf seinen ersten Schritt (14d §3.6). Jede Pointe muss ohne Ton ankommen.
  Zuerst gebaut werden nur Tapp, Plumps und Rumpeln.

### 11.7 Vollständige Listen

**Posen** (Ozzy, Schicht Körper, rund 35): *Grund* Stehen, Hocke, Sitzen, Liegen, Diener (vorhanden) · *Schlaf, Gang* eingerollt;
Gangfeld Schritt, Trab, Galopp mit je vier Kontaktposen; Bremsen; Kante · *Balance* Feld Kippen mal Wackeln, fünf Schlüssel · *Sprung*
Ausholen, Strecken, Flug, Landung; Jagdsprung; Schrecksprung · *Laune* Schnüffeln, Nasen-Pflug, Ducken, Schnappen; Spielverbeugung (Diener
mit Wackeln) · *Panne, Erholung* Stolpern 1 bis 3, Purzeln, Seitenlage, Rückenlage, Bauchrutscher, Spagat, Klettern am Rand,
Zwischenposen des Aufstehens.

**Regler mit Schlüsseln:** Kopf θ 0° bis 360° (vorhanden), Körper ψ −90° bis 90° (links gespiegelt), Nicken ±20°, Kopf schief ±15°,
Ohren (hoch, zurück, angelegt), Brauenbogen der Masken (neugierig, besorgt, beleidigt, müde), Bart, Schwanz (hoch, waagrecht,
eingezogen), Stauchung, Spannung. Kein Maul, solange Florian keins zeichnet. **Andere Dinge mit Posen:** Katze (eingerollt, Ohr zuckt,
Buckel, Fauchen, Absprung, Flug), Schmetterling (Flügel auf, zu), Kamera (nah, weit, folgen, Aufzug, Rückblick), Himmel (Morgen, Mittag,
Abend, Nacht), Rahmen (Spiel, Zettel, Abgang, Ankunft, Rückblick, Tagebuch), Musik (Stücke der Runden, Schluss). Rahmen, Kamera und Musik
sind Figuren ohne Teile.

**Gestaltete Übergänge** (alle übrigen Paare nehmen den Ausgleich; Sekunden):

| Übergang | Abschnitte |
|---|---|
| acht Abläufe des Prototyps (Hinsetzen, mit Hüpfer, Rutschen, gemütlich, Umlegen, Aufsetzen, zwei Aufstehen) | wie in `ablauf.ts` |
| Aufwachen | Ohr 0,3 · Kopf 0,4 · Strecken 0,8 · Aufstehen 0,6 · Schütteln 0,6; Marke Gähnen |
| Einkringeln | zwei Kehrtwenden 1,0 · Plumps 0,4 · Seufzer |
| Sprung, Jagdsprung, Schrecksprung | Ausholen 0,15 · Strecken 0,1 · Flug **bis Landung** (höchstens 1,5) · Landung 0,25; Plumps nach Stärke |
| Stolpern | drei Zwischenposen in 0,5, Unterbrechen „nie“ bis zur Entscheidung; Marke Fiep |
| Fangen; Sturz | Wackeln 0,4; Spannung 100 → 30 % in 0,1, Purzeln **bis Ruhe** |
| Aufstehen aus Bauch, Seite, Rücken | 1,2; Abrollen 0,4 + 1,2; Strampeln 0,5, dann „über Seite“ |
| Schütteln; Blick in die Kamera | vier Umläufe in 0,6; Kopf auf 0° in 0,25, halten 0,8, zurück 0,3 |
| Kehrtwende; Anlauf nehmen | ψ über die Front 0,5, unterbrechbar; zwei Schritte zurück 0,6 · Wackeln 0,4 · Start 0,2 |
| Flitzen; Schnüffeln, Nasen-Pflug, Ducken, Kante | Wackeln 0,6 · Start 0,2, Galopp → Liegen 0,5; je 0,3 bis 0,4 |
| Bauchrutscher; Klettern am Rand; Schnappen | 0,3 dann **bis Stillstand**; Ohren 0,3 · Kopf 0,4 · Pfoten 0,8; 0,2, Kauen 1,5 |
| Katze: Buckel und Fauchen, Wegspringen | 0,2 · 0,4 · 0,5; Flug bis über den Rand |
| Regie: Abgang, Ankunft | Spuren für Kamera, Himmel, Musik, Ozzy; 4 bis 6 |

**Zyklen:** Gangfeld (vom Weg), Atmen 0,3 Hz (angelegt, im Stehen vorläufig aus, A28), Schlafatmen 0,2 Hz, Wedeln 3 Hz, Schütteln
4,5 Hz, Strampeln 3 Hz, Schnüffeln 6 Hz, Kauen 3 Hz, Hinterteil wackeln 2,5 Hz, Flügelschlag 8 Hz, Schlafatmen der Katze 0,25 Hz, Sterne
nach harter Landung (Formen auf einer Kreisbahn).

**Physik-Chips** (08 §9.7 in Dauer und Federung; nicht gemessen): Schwingen an den Ohren 0,4 s, 65 %, Schwerkraft-Anteil 30 % · Schwingen
am Bart 0,25 s, 55 % · Kette am Schwanz (sechs Glieder innen, geschrieben in die drei Regler seiner Biegeachse) 0,5 s, 70 %, Spitze
weicher · Stauchen an der Bohne 0,2 s, 50 % · Ruhig halten am Kopf 0,17 s, 0 % · Vierbeiner: Bremskraft 0,3 g, Sprunghöhe 0,5 L, Mut 0,5,
tollpatschig 0,3 (Charakter-Regler der Figur), Spannung im Sturz 30 %, im Liegen 5 % ·
Rad: Tabelle 6.2 · Boden: Haftung Gras 0,6, nasses Gras 0,2, Matsch 0,1, Holz 0,5 · Fest: Steinchen, Stamm, Körbchen, Bock der Wippe
(gerundete Vielecke, höchstens 8 Ecken) · Lose: Ball (Kreis 0,35 L, Rollwiderstand 0,02), Wurst, Andenken, Brett · Gelenk: Wippe
(±18°, Dämpfung 0,3) · Wasser: Pfütze (24 Säulen, 3 Hz, Federung 90 %) · Teilchen: Staub 8 bis 20, Spritzer 30 bis 80, 0,6 s.
Werte ohne Quelle sind eigene Schätzungen.

**Effekte:** an sind Verschmelzen (Ozzys Teile, Staub, Spritzer mit der Pfütze), Dickenregel und Kantenglättung, Kontakt- und
Bodenschatten (machen die Sprunghöhe lesbar; Schatten fallen auf Boden und Welt, nie von selbst auf Ozzy), Beinschattierung in
Bewegung, Staubwölkchen, Spritzer und Wasserfläche, „Kamera nass“ und Regen, Himmelsverlauf mit Dithering. **Aus**, bis Florian sie will:
Verdecken an Ozzy (Stärke 0), Schatten auf Ozzy, Bewegungslinien, Aufprallbild, Schmierbild, Zittern, Verformung nach Tempo, Gelee auf
Ozzy.

**Bausteine:**

| Baustein | an | Regler | Messwerte, Ereignisse | Befehle |
|---|---|---|---|---|
| Vierbeiner | Ozzy | Bremskraft, Sprunghöhe, Mut, Wenden nach (0,3 s; 5.4), Schalter „Springen auf Tippen“ (aus; A17); Launen-Regler Neugier, Sturheit, Energie, Verfressenheit (dazu Mut); liest „tollpatschig“ aus dem Charakter der Figur | Hang, Tempo, Kipp-Reserve, Lage, Gangart; setzt auf, springt, überspringt, landet, stolpert, plumpst, liegt, steht auf, fällt über den Rand | Wunschtempo, Stolpern anfordern, Wurf |
| Rad | Hügel | Radius, Gewicht, Lagerreibung, Griff | Winkel, Drehtempo, Griff an der Grenze; fasst an, lässt los, tippt | – |
| Ding, Zone | Steinchen bis Brett; Duftstelle, Pfütze, Körbchen, Graben, Matsch | fest/lose; Breite | Kontakt mit Stärke; betritt, verlässt | zeigen, verbergen, anstoßen |
| Schläfer, Flieger | Katze, Schmetterling | Weckschwelle (Landung über 0,6 oder über 2 L/s in 2 L); Scheu 1,5 L | wacht auf, faucht, springt weg; flieht | wecken |
| Zähler, Uhr | Plumpse, Sprünge, Fehlversuche je Ding, Andenken; Rahmen | Ziel; Rundenlänge 120 s | Ziel erreicht; Einer und Zehner für Ziffern-Figuren; Tageszeit, Runde vorbei | +1, setzen |
| Rückblick, Aufgaben | Rahmen | höchstens sechs Geister | spielt die gespeicherten Stürze der Runde ab; welche Aufgaben erfüllt sind, Haken über Regler | zeigen |
| Kamera, Musik | Rahmen | Posen wie jedes Ding | – | Pose wünschen |

Das Körpermodell (Körper, Hüllen, Gelenke, Federbeine mit Vorspannung, Glieder für den Sturz) ist ein Datensatz der Figur; Vierbeiner und
Schläfer nehmen es von ihr (6.3).

**Drähte:** Hang (0° bis 3° → 0; 3° bis 17° → 1 bis 6 L/s) → Wunschtempo · Weg → Phase des Gangs · Tempo → Zeile des Gangs ·
Kipp-Reserve → Balance und Spannungsschicht der Musik · Drehtempo des Hügels (0 bis 90°/s) → Rumpeln (bis −6 dB, ±5 Halbtöne) ·
Landestärke → Staub und Plumps · Tageszeit → Himmel und Wahrscheinlichkeit von Müde · Nässe → Pfützen, Haftung (Gras 0,6 → 0,2, Erde →
Matsch) · θ → Verdecken und Durchbruch.

**Regeln** (rund 35; Gehen, Gleichgewicht, Stolpern, Fallen und Aufstehen kommen aus dem Baustein):

| Ding | Regel | Band |
|---|---|---|
| Ozzy | Sobald plumpst → Staub, Plumps, Musik stockt, Zähler +1 (höchstens alle 0,3 s) | Grund |
| Ozzy | Sobald stolpert → Fiep, Zeitlupe 0,3 s mal 0,4, Ohren hoch | Körper |
| Ozzy | Sobald landet, falls Stärke über 0,9 → Sterne 1,2 s | Grund |
| Ozzy | Sobald ist aufgestanden → Schütteln, dann Blick in die Kamera (60 %) oder Niesen (25 %) | Grund |
| Ozzy | Solange steht → Blick zum Finger · Sobald Griff an der Grenze über 0,3 s → Blick zum Finger, Brauen beleidigt | Grund |
| Ozzy | Solange Plumpse der letzten 30 s mindestens 3 → Wunschtempo mal 0,8, Schwanz eingezogen | Grund |
| Ozzy | Solange auf Matsch → Gesicht vorsichtig, Ohren zurück | Grund |
| Ozzy | Laune Müde (Tageszeit über 80 %, 5 % je s) · Laune Flitzen (nass geschüttelt, 50 %) | Laune |
| Ozzy | Sobald Spieler tippt Ozzy, falls Angst oder Sturkopf → Laune endet, Gesicht getröstet | Spieler |
| Duftstelle | Laune Schnüffeln | Laune |
| Schmetterling, Ball | Laune Jagen (Ball schneller als 1 L/s, näher als 5 L) | Laune |
| Wurst | Laune Gier · Sobald Ozzy berührt Wurst → Schnappen, Zähler +1, Wurst verbergen | Laune, Grund |
| Katze | Sobald wacht auf → Buckel, Fauchen, Wegspringen · Laune Angst für Ozzy | Grund, Laune |
| Pfütze | Laune Sturkopf (Wasser unter 2 L voraus, höchstens Trab) · Sobald Ozzy betritt → Spritzer, Platsch | Laune, Grund |
| Stamm | Sobald Ozzy verweigert → Anlauf nehmen | Grund |
| Graben, Stamm, Pfütze, Katze | Sobald Fehlversuch hier → Zähler +1 · Sobald Zähler hier = 3 → Hilfe | Regie |
| Rahmen | Sobald Spieler tippt zum ersten Mal → Aufwachen, Musik der Runde | Regie |
| Rahmen | Sobald Ozzy fällt über den Rand → Abgang · Solange er zurückklettert → Haftung und Bremskraft hoch | Regie |
| Rahmen | Sobald Ozzy betritt Körbchen nach mindestens 300° → Ankunft, Rückblick, Tagebuch | Regie |
| Rahmen | Sobald Runde vorbei → Müde ohne Würfel · Sobald Abendrunde beginnt → Regen 6 s, Nässe 0 → 1 in 5 s | Regie |
| Kamera, Musik | Solange Galopp → weit; hinter dem Rand → folgen · Solange Kipp-Reserve unter 0,2 → Spannungsschicht | Grund, Körper |

**Aufgaben** (Sätze über Zähler, jede mit Beweis-Lauf): *Morgen* eine Runde ohne Plumps · an beiden Duftstellen schnüffeln · den Stamm
überspringen, ohne ihn zu berühren. *Mittag* die Katze überspringen, während sie schläft · den Schmetterling im Sprung erwischen · die
Wurst schnappen. *Abend* auf dem Hintern in die Pfütze rutschen · Ozzy schlafend oben halten, bis er aufwacht · vor Sonnenuntergang im
Körbchen.

**Teil der Demo → Studio-Mittel** (Entwurf A §11): Gang → Gangfeld, Drähte, Balken „steht“ · Stehen am Hang, Stolpern → Vierbeiner ·
Balancieren sichtbar → Feld Balance an einem Draht · Sprung → Fähigkeit plus Übergang „bis Landung“ · Sturz → Spannung als Regler ·
Launen → Laune-Regeln an Ding-Arten · Buckel, Graben → Weltpfad mit A · Himmel, Regen → Uhr, Drähte, Himmel als Ding · Abgang, Ankunft →
Regie-Übergänge · Aufgaben, Rückblick → Bausteine am Rahmen, Zähler, Beweis-Läufe, gespeicherte Werte über „Auswerten“ · Zettel,
Tagebuch → Text als Figur, Posen des Rahmens · Ton → Klang-Chips, Musik als Ding. Jedes dieser Mittel ist ein Handgriff mit Geste oder
Taste (9.5); die Inhalt-Skripte bauen die Demo nur über diese Handgriffe. Probe in M11: Florian baut ein neues kleines Ding samt Regel
nur im Editor (B16).

**Verweise:** Gesamtbericht 5; 13 §2 bis §11; 14b §7; 14d §3, §4; Entwurf A §11, B §11, C §6, §8, §11.

---

## 12 Umsetzung (Grundzüge)

Der [Bauplan](2026-11-20-studio-plan.md) nennt Typen, Verträge, Pakete und Wellen. Reihenfolge: zuerst der Kern mit seiner Kopfdrehung
als Daten und dem Vergleichsbild „Rahmen + Rest“ (Entwurf B), daneben Messseite und P1 mit dem ersten spielbaren Stand; dann die Werkbank
an seiner Kopfdrehung (Entwurf A); dann je Etappe ein Moment der Demo als Probe (Entwurf C). Die Etappen heißen M0 bis M11 wie im
Bauplan. Jede Probe ist vorher festgelegt und endet mit Bild oder Aufnahme: Die eigenen Prüfungen laufen automatisch, die Proben für
Florian, Nicole und die Geräte stehen in Teil B der Liste.

| Etappe | Inhalt | eigene Prüfung (automatisch) | in der Liste | Tage (grob) |
|---|---|---|---|---|
| M0 Verträge | alle Pakete, Apps und Werkzeuge mit Grenzen; Typen und Schnittstellen; gemeinsame Dateien | Typen grün, Grenzen erzwungen | – | 4–5 |
| M1 Kern, Kopf, Vergleichsbild | eigene Winkelfunktionen, Format, Form-Laufzeit, Renderer-Grundstufe; Store-Kern und Ablage; starre Knochen und Drähte; Kopfdrehung als Daten mit Kopfversatz und Halslage; „Rahmen + Rest“ | Kopfdrehung in 0,5° an Kurvenpunkten unter 0,001; zweimal speichern, gleiche Bytes; gleiche Prüfsumme in Node, Chromium, WebKit | B1 Kopfdrehung neben dem Prototyp; B2 Bild (ein Ohr dreht sich zwischen zwei Schlüsseln um 120°; Stirnfranse), Video über die Front | 12–18 |
| M2 Messen, P1, Tapsen (neben M1) | Messseite mit Ersatzszenen aus seinen SVGs; P1 „Rad mit Gewicht“ mit Box2D; Modus „Tapsen“ | K1 bis K9 gemessen; Messseite am Mac (Hinweis, keine iPhone-Messung) | B3 Messseite auf seinen Geräten; B4 Rad mit Gewicht; B5 erster spielbarer Stand mit Nicole; B6 Safari-Automation | 8–11 |
| M3 Werkbank | Bühne, Leiste, Stelle, Vorschau, Zwiebelhaut; Speichern über die Ablage, Rückgängig, Schutz, zwei Geräte; sein Kopf zum Ansehen; Probe-Projekte | Ort-Probe; 100 Züge, ein ⌘Z; eine Sitzung kann seinen Schlüssel nicht löschen; jeder Handgriff hat eine Geste | B7 Werkbank-Probe 1 | 9–13 |
| M4 Posen, Übergänge, Knochen | Ausgleich, Taktleiste, Tafel; Biegeachsen mit Gewichten je Anker; Anfasser und Füllringe; seine Haltungen und Abläufe als Daten; Schwanz als Biegeachse | 300 Zufallsklicks ohne Sprung; Plumps im Bild des Bodenkontakts; Parität an den Haltungen | B8 Werkbank-Probe 2, Abläufe neben dem Prototyp | 15–21 |
| M5 Physik am Mac | Takt, Welt, Vierbeiner mit Körpermodell, Kennlinie und Kehrtwende; Chips; Prüfstand; Spielwiese | 10 s Stehen, jeder Anker auf 10⁻⁶ wie gezeichnet; gleiche Prüfsumme in drei Umgebungen | B9 Tapsen bergab | 15–22 |
| M6 Spielwiese auf dem iPhone | Spiel-App, Live-Verbindung, Renderer Stufe 1 mit den Effekten der Spielwiese, Korrekturformen und Geltungs-Chip, Strecke | Editor und Spiel liefern bitgleiche Anker; Messseite mit der Spielwiese am Mac (Hinweis) | B10 60 s auf dem iPhone 16, Knie mit und ohne Korrektur, Effekte an einer Testfigur | 11–16 |
| M7 Morgenrunde | Regeln, Launen, Drähte und Bausteine der Welt, Sprung, Schnüffeln, Ton, Text als Figur, Rahmen und Zettel | Erweiterungstest der Bausteine; jeder neue Handgriff hat eine Geste | B11 Nicole spielt die Morgenrunde; B12 Bedienprobe | 22–32 |
| M8 Pannen | Sturz mit Spannung, Aufstehen je Lage, Abgang, Rückblick in der Laufzeit, Aufnahme | drei Stürze, jedes Aufstehen ohne Sprung; Rückblick im Budget (am Mac ein Hinweis) | B13 Pannen, Rückblick auf dem iPhone, Rückwurf als Aufnahme | 10–15 |
| M9 Mittagsrunde | Autorig mit der Katze, Gewichte mit Drehzentren und W, Wippe, Ball, „Warum?“ | Autorig trifft an Ozzy `ELTER`, `PARTNER` und die Kopfteile; höchstens drei Ringzüge für die Katze | B14 Katze riggen, Bohne, Bezugsrahmen, „Warum?“ | 22–35 |
| M10 Abendrunde (darf neben M9 laufen) | Regen, Nässe, Pfützen, Matsch, Müde, Aufgaben mit Beweisen, Tagebuch, Effekte für Momente | neue Arten nur als Erweiterung (am Diff); Studio meldet, welche Beweise nach einer Änderung noch gelten | B15 Nicole spielt die Abendrunde; Effekte vorher und nachher | 16–26 |
| M11 Ton, App, großer Feinschliff | Musik, Haptik, App-Hülle, Export; großer Feinschlifflauf über die ganze Liste | alle Tests, Beweise und Lauf-Dateien grün | B16 der ganze Tag in der App, stumm, ein Ding selbst bauen; danach sagt Florian „bestanden“ oder was fehlt | 12–20, dazu der Feinschliff |

Summe grob 155 bis 240 Arbeitstage (eigene Schätzung): mehr als die 120 bis 200 der Recherche, weil M1 die Kopfdrehung als Daten übernimmt
und die Demo vollständiger ist. Parallele Wellen verkürzen die Kalenderzeit, nicht den Verbrauch. Nach M3 wird mit gemessener Bauzeit neu
geschätzt. Hebel: Abendrunde und Musik später.

- **Selbstständig durchbauen** (F1): Die Etappen laufen nacheinander durch, ohne auf Florians Urteil zu warten. Wo eine Entscheidung
  eigentlich seine wäre, gilt eine vorläufige; sie steht nummeriert, in seinen Wörtern und mit „So änderst du es“ in Teil A der Liste
  [Studio: Was bleibt](2026-11-20-studio-was-bleibt.md), und der Bau ist so angelegt, dass Kippen billig bleibt. Proben, die sein Auge,
  Nicole, das iPhone 16 oder das iPad brauchen, liegen vollständig vorbereitet in Teil B (Seite, Ablauf, Kriterium, Ablage der Aufnahme
  unter `docs/progress/studio/proben/`); der Bau wartet nicht darauf, und wie viele zugleich offen sind, ist nicht begrenzt. Eigene
  Prüfungen laufen automatisch und sind vorher festgelegt: Typen, Tests, Eigenschaftstests, Playwright in Chromium und WebKit, Bilder und
  Aufnahmen in `docs/progress/studio/`. Messungen am Mac sind Hinweise, keine iPhone-Messungen. Vergleichsbilder, die einen Weg
  entscheiden, werden trotzdem gemacht; der Bau nimmt die vorläufige Entscheidung, das Bild kommt in die Liste. Jede Etappe endet grün,
  committet und mit einer kurzen Meldung an Florian: was er jetzt in Studio tun kann, Verweis auf die Liste. „Bestanden“ sagt nur er. Die
  letzte Etappe vor seiner Abnahme ist ein großer Feinschlifflauf über die ganze Liste (M11), weil man am Ende oft elegantere Lösungen
  findet.
- **Nie ohne sein ausdrückliches Wort:** seine Schlüssel oder Dateien ändern (`docs/look/ozzy-figur/`); seinen Prototyp ändern
  (`apps/editor/`); seine Kopfdrehung in Studio zur Wahrheit machen (2.3); Effekte auf Ozzys Körper außer den erlaubten anschalten (7);
  ebenso Mischart oder periodische Mischung seiner Kopfdrehung wechseln (A2, A3), Ozzys Rig durch den Autorig ersetzen (A9), der Bohne
  Gewichte geben (A5), die Feldauflösung halbieren, den Rückwurf anschalten (A20).
- **Seine Arbeit in Studio** (F4, F5): Sein Studio läuft aus einem festen Stand auf Port 5217, nie vom Entwicklungsserver, an dem gebaut
  wird (5263); das Spiel aus dem festen Stand auf 5261, fürs iPhone im selben Netz. Er startet beide mit `pnpm studio` und
  `pnpm gassirunde`; 5219 gehört einer anderen Sitzung. Den festen Stand baut die Integration am Etappenende neu, in einen neuen Ordner
  je Stand, damit seine offene Seite nichts verliert, und startet 5217 nur neu, wenn sein Journal nichts Ungespeichertes hält. Sein Studio schreibt über die Ablage nach `content/studio/`; Bau-Server, Proben und
  Tests arbeiten immer auf einer Kopie. Am Ende jeder Etappe kommt sein Stand als eigener Commit „Florians Stand in Studio“ ins Repo,
  getrennt vom Code und nur, wenn er sich geändert hat. Zwei Geräte, Sicherung und Schutzregel: 10.2.
- **Parallel bauen** (F2, F3): Ultracode ist Florians Zusage für Workflows mit vielen Agenten. M0 legt Verträge und gemeinsame Dateien fest
  (Typen, Schnittstellen, Prüfdaten, Attrappen, Konfiguration, Lockdatei); danach laufen die Pakete einer Welle parallel, höchstens etwa
  zehn Agenten je Workflow, jeder mit dem stärksten Modell und höchstem Aufwand. Gebaut wird im Arbeitsbaum
  `.claude/worktrees/ozzy-animation-physics-294508` (Zweig `claude/ozzy-animation-physics-294508`), ohne eigenen Integrations-Arbeitsbaum,
  ohne Zweige je Paket, ohne Zusammenführen: Sein Prototyp und seine `schluessel.json` liegen dort und sind lebendig, Studio liest sie
  direkt. Pakete einer Welle ändern getrennte Dateien und hängen nicht voneinander ab; Bau-Agenten committen nicht und installieren nichts,
  alle Abhängigkeiten einer Etappe installiert ihr Vertragsschritt. Verträge und Zusammenbau-Dateien ändert nur die Integration; sie prüft
  nach jeder Welle alles zusammen, committet nur eigene Dateien und pusht am Ende jeder Etappe. Tabu sind `apps/editor/`, `packages/shape/`,
  `docs/look/ozzy-figur/` und alles, was andere Stränge bauen.
- **Wochenlimit, ehrlich** (F7): Parallele Wellen verbrauchen Florians Wochenlimit schneller als eine einzelne Sitzung; er hat mit Ultracode
  zugestimmt. Jede Welle hinterlässt einen grünen, committeten Stand, damit der Bau an jeder Wellengrenze anhalten und später weiterlaufen
  kann. Je Welle steht eine Zeile in `docs/progress/studio/aufwand.json` (Etappe, Welle, Pakete, Agenten, Dauer); nach M3 wird der Rest mit
  gemessener Bauzeit neu geschätzt und in der Meldung genannt. Bremsen kann er mit einem Wort: „langsamer“ oder „anhalten“ (A26).

**Rückfälle statt Abbruch** (F1): Fällt eine technische Wette, wählt der Bau den Rückfall selbst nach einem vorher festgelegten Kriterium
und trägt ihn in die Liste ein.

| Wette | Kriterium | Rückfall |
|---|---|---|
| Parität der Kopfdrehung (M1) | jeder Kurvenpunkt unter 0,001 im 0,5°-Raster | kein Rückfall: Die Listen des Prototyps samt gespiegelter Einträge sind die Festlegung (2.3), nichts wird gerundet; eine Abweichung ist ein Baufehler, nach dem Anderthalbfachen der Schätzung anhalten und berichten |
| P1 mit Box2D (M2) | K1 bis K9 gemessen | K5 oder K6 rot: B′ (Welt steht, Schwerkraft und Kamera drehen), dann Rapier hinter `WeltAdapter` |
| Tempo (M2, M6, M8, M10) | Messseite rot (am Mac umgerechnet ein Hinweis, am iPhone eine Messung) | in dieser Reihenfolge: Welt gebacken und Teilchen als analytische Kreise, drei statt sechs Geister, Kachel-Durchgang als eigene Welle; halbe Feldauflösung nur mit seinem Wort |
| Wiederholbarkeit über Browser (M1, M5) | gleiche Prüfsumme in Node, Chromium, WebKit | Merker nur am selben Gerät; die abweichende Funktion wird benannt; der Editor wartet nicht |
| Aktive Stelle (M3, M4) | Ort-Probe; Werkbank- oder Bedienprobe unter vier von fünf, sobald ihr Ergebnis da ist | ein Fehler der Ort-Probe ist ein Baufehler; scheitert eine Probe mit Florian oder Nicole, baut die nächste Welle die Gegenprobe „zwei Modi“ |
| Spielbarkeit (M2, M7, M10) | Nicole in höchstens drei Versuchen, sobald ihr Ergebnis da ist | Bremskraft 0,35 g und Radius 16 L, dann erneut |

Angehalten und berichtet wird nur noch, wenn für ein Scheitern kein Rückfall im Plan steht, der Rückfall selbst scheitert, eine Probe ohne
Rückfall das Anderthalbfache der Schätzung überschreitet oder ein Prozess des Baus versucht, Florians Dateien zu schreiben (der
Schreibhaken meldet es; seine eigenen Änderungen lösen nie ein Anhalten aus, zurückgesetzt wird nur auf sein Wort). Zweimal dasselbe
Kriterium verfehlt: Ansatz prüfen. „Gefällt nicht“: umbauen, nicht belegen.

**Größte Risiken** (Gesamtbericht 6.1): Umfang und Wochenlimit, Tempo auf dem iPhone, die aktive Stelle, die Web-Bindung von Box2D, eine
Mischart, die seine Formen ändert, ein Autorig, der nur Ozzy kann, ein zu schweres oder eintöniges Spiel. Die Gegenmittel stehen in den
Bereichen.

---

## 13 Was bewusst nicht gebaut wird (vorerst)

- **Mehrspur-Zeitleiste, freier Zustandsgraph, Knoteneditor, Skripte:** kein Moment der Demo braucht sie; neue Verhaltensarten sind
  Bausteine, Skripte höchstens später als abgeschotteter Notausgang.
- **Zwei globale Modi, schwebende Panels:** nur als Gegenprobe (12 §5).
- **Blick voraus:** erst, wenn die Messseite Luft zeigt (6.4).
- **Rückwurf und Andenken-Bonk:** nur auf Florians Wort, nach der Aufnahme in M8 (11.5, A20).
- **Wenden über den Rücken (Körper ψ 90° bis 180°):** Seine Rückansicht ist gezeichnet (`ozzy_back.svg`, Körper und Kopf bei 180°), der
  Weg des Körpers von der Seite dorthin ist nicht gebaut; erst auf sein Wort (5.4, A4).
- **Maul:** nicht gezeichnet; erst mit seiner Zeichnung (A19).
- **Gelee an Ozzy, Schatten und andere Effekte auf seinem Körper außer den erlaubten:** Logo-Regel; anschalten kann sie nur er (7, A7).
- **Formen mit Löchern:** später; Text auf anderem Grund als Papier braucht sie (11.6, A11).
- **Park und Winter:** später als reiner Inhalt; „unendlich erweiterbar“ prüfen in Fassung 1 die Erweiterungstests und die Ding-Probe
  (9.3, B16).
- **ARAP-Mischart, Kurven-Ausgleich nach Liu, Bounded Biharmonic Weights, „Pose zeichnen, Studio zerlegt“:** spätere Stufen.
- **Vorlagen Zweibeiner und Vogel, zweite Figur mit eigenem Gleichgewicht:** die Katze ist ein Schläfer.
- **Kachel-Durchgang, WebGPU, Bloom, Weichzeichner:** Reserve nach Messung; halbe Feldauflösung nur mit seinem Wort.
- **Vektor-Export, Export nach Spine oder Rive:** ohne gebackene Kontur sähe es nicht aus wie das Logo; Bildfolgen zuerst.
- **Lebende Studio-Figuren im Hauptspiel:** erst, wenn das Hauptspiel sie braucht; zuerst Bildfolgen (10.5, A24).
- **CRDT, Cloud, mehrere Geräte offline, eigene Mac- oder iPad-App:** erst bei echtem Bedarf (10.5, A23); eine Hülle fürs iPad, wenn
  Florian ohne Mac formen will. Zwei Geräte zugleich führt Studio schon je Datensatz zusammen (10.2, A25).
- **Motion Matching, KI-Zwischenbilder, Rasterbilder auf Netzen, Erreichbarkeitsanalyse der Tafel.**

---

## 14 Vorläufige Entscheidungen für Florian

Florian hat gesagt, ich soll selbst entscheiden und das komplette Produkt bauen. Entscheidungen, die eigentlich seine wären, trifft der Bau
vorläufig. Sie stehen nicht mehr hier, sondern gesammelt für ihn in der Liste [Studio: Was bleibt](2026-11-20-studio-was-bleibt.md),
nummeriert, in seinen Wörtern, je mit Grund und „So änderst du es“. Jede kann er jederzeit mit einem Satz oder im Editor kippen; der Bau
wartet auf keine davon.

- **Teil A, vorläufige Entscheidungen (A1 bis A30):** seine Kopfdrehung (A1 bis A3), Ozzys Körper, Knochen und Effekte (A4 bis A10), Text
  (A11), Physik (A12), Bedienung (A13 bis A15), das Spiel (A16 bis A21), Wörter (A22), Technik und Geräte (A23 bis A25), Bau und
  Wochenlimit (A26), Ozzy in Ruhe auf dem Hügel und im Stehen (A27, A28), fast glatte Anker und Taste B (A29, A30).
- **Teil B, Proben (B1 bis B16):** alles, wofür es sein Auge, Nicole, das iPhone 16 oder das iPad braucht, je Etappe vorbereitet;
  Ergebnisse folgen, wenn er Zeit hat.
- **Teil C, offene Punkte:** was jeder Etappe auffällt, für den großen Feinschlifflauf am Ende (M11).

Die beiden Fragen vor dem Start sind erledigt: Viele Agenten bauen parallel in Workflows dieser Sitzung, das ist seine Zusage mit
Ultracode (Abschnitt 12); was das für sein Wochenlimit heißt, steht in A26. Die Messseite auf seinem iPhone 16, seinem iPad und seinem
Mac und die Frage, welches iPad er hat, sind Probe B3.

---

## 15 Begriffe

Nach Gesamtbericht 4.5, angepasst; Florian entscheidet die Wörter (A22).

| Begriff | Bedeutung | vermeidet |
|---|---|---|
| Form, Anker, Griff | geschlossener Pfad; Anker glatt oder Ecke | „Mesh“ |
| Figur, Teil, Ding | Figur aus Teilen; ein Ding stellt eine Figur mit einer Rolle in eine Welt | „Wesen“ |
| Regler | benannter Wert mit Bereich: Leiste, Feld, Kreisregler | „Parameter“, „Slider“ |
| Bindung, Zusatzform | Teil hängt mit Schlüsseln an einem Regler: Ansicht (ersetzt) oder Zusatzform (addiert: Formziel, Korrekturform, Kreuzschlüssel, Posenkorrektur, Nachschwingen) | „Blendshape“, „Übergangsform“ |
| Schlüssel, Herkunft, Art, Stütze | Gestalt eines Teils an einer Stelle; Vorlage, dein, gebaut, Aufnahme; Form, Falte, Wechsel; verborgener Schlüssel, der nur die Steigung formt | „Keyform“ |
| Mischart, Spitzenführung | Rahmen + Rest, je Koordinate, linear; Spitzen im Rahmen der Nachbarn | – |
| Knochen, Aufhängung, Anheftung | Winkel als Regler; wie ein Teil an Knochen hängt: starr, Biegeachse, Gewichte; ein Gelenk reitet auf der gemorphten Elternform (nur Gelenke, nie Teile) | „Skinning“, „Haut“ |
| Anfasser, Gelenkring | Ring zum Posieren; Ring zum Riggen | – |
| Pose, Grundform, Schicht | Stand der Regler einer Schicht; erste Pose; Körper, Kopf und Blick, Gesicht, Physik | „Setup“, „Haltung“ (Prototyp) |
| Posenkarte, „Ausprobieren“, Tafel | Bild einer Pose; Posenkarte, die nie speichert; „von × nach“ | „Karte“ allein |
| Übergang, Ausgleich | Standard (Ausgleich), gestaltet (Taktleiste), Regie (mit Spuren); Soll springt, eine Feder führt den Rest auf null | „Mix“, „Ablauf“ (Prototyp) |
| Zwischenpose, Abschnitt, Zusatzbewegung, Marke, Spur | Posenkarte auf der Zeit; Dauer oder „bis Ereignis“; Hüpfer, Plumps; Ereignis; Leiste im Regie-Übergang | „Event“, „Track“ |
| Zyklus, Phase, Verweilen | Kreisregler von Zeit oder Weg; seine Stelle; was eine Pose tut, solange sie gilt | – |
| Leiste, Tropfen, Stelle, Geltungs-Chip | Bauteil jeder Achse; Marke der Stelle; wohin ein Zug geht; Angebot danach | „Modus“, „Timeline“ |
| Taktleiste, Strecke, Mitschnitt, Werteverlauf | Leiste eines Übergangs; abgewickelter Hügel; letzte 20 s; Kurven darauf | – |
| Zwiebelhaut, Bahnen, Blick voraus | Nachbarn als Umriss; Wege der Anker; Umrisse der nächsten Sekunden | „Spur der Zukunft“ |
| Linse, Chip | Sicht, die festlegt, was greifbar ist; Verhalten, Effekt oder Klang mit zwei Reglern | „Behavior“ |
| Feder: Dauer, Federung | Zeitsprache; 0 % Federung = kein Nachwippen | Tempo als Federmaß |
| Tempo, Wunschtempo, Spannung | Ozzys Geschwindigkeit; was er laufen will; wie fest ein Teil der Pose folgt | – |
| Charakter, Launen-Regler | drei Regler der Figur (schwer, wabbelig, tollpatschig), die Bausteine lesen; Regler des Vierbeiners, die die Häufigkeit der Launen stellen (Neugier, Mut, Sturheit, Energie, Verfressenheit) | „Charakter“ für die Launen-Regler |
| Baustein, Draht, Kennlinie, Regel | Verhalten in Code; stetige Kopplung; ihre Kurve; Satz „Sobald“, „Solange“, „Laune“ | „Karte“ als Logikwort |
| Band, Kanal, Zone, Fühler | Vorrang; Eingang eines Dings, um den Regeln streiten; Bereich; Messstelle | Prioritätszahlen |
| Prüfstand, Prüfer, Wächter, Ruhe-Wächter | Testszene; Hinweisliste; Prüfung je Bild; Prüfung „Ruhe = Zeichnung“ | – |
| Takt, Schlüsselstand, Lauf-Datei, Merker | 1/60 s; Stand alle 16 Takte; Ausgangslage, Saat, Eingaben; Lauf-Datei vom iPhone | „Takt“ der Musik heißt „Musiktakt“ |
| Bauplan, Übernahme, Parität | gepackte Felder; Prototyp als Daten; Gleichheit mit dem Prototyp | – |
| Bremskraft, Haftung, Stehzone, Gehzone, Kippzeit, Radgewicht | Größen des Spiels | – |
| Hügel, Rad, Fingermarke, Spielwiese, Runde | Rad der Demo; Baustein; Marke, wo der Finger greift; Welt ohne Ziel; Morgen, Mittag, Abend | „Tropfen“ im Spiel |
| Staub, Spritzer, „Kamera nass“ | Teilchen aus Erde und Wasser; Effekt nasser Kamera | „Tropfen“ (heißt nur die Marke der Stelle) |
| Körpermodell, „wie gezeichnet“ | Datensatz der Figur mit Körpern, Hüllen, Gelenken, Federbeinen und Gliedern, den Bausteine lesen; Merkmal eines Teils, an dem Effekte nur nach ihrer Art wirken | Teilnamen in Regeln |
| Weiß nachgeben | ein weißes Teil gibt dem Schwarz, das in der Malreihenfolge darüber liegt, weich nach, statt hart abzuschneiden (heute an den Beinfenstern) | – |
| Ablage, Fassung, Sicherung, Schreibhaken | wo sein Studio über den Server speichert; verdrängter Stand eines Datensatzes, wiederherstellbar, als eigene Datei; Ring der letzten 50 Stände je Datei, dazu eine Woche lang je Stunde einer; Hülle um das Schreiben jedes Prozesses des Baus, die Florians Dateien schützt | „Backup“, „Konflikt“, „Schutz-Probe“ |
| Quelle, fremde Quelle, Umzug | wer eine Änderung macht (Florian, Automatik, Sitzung, Migration); seine `schluessel.json`, die Studio bis zum Umzug nur liest; Befehl „Kopfdrehung übernehmen“ | – |
| Liste, vorläufige Entscheidung, Probe-Projekt, Ort-Probe | „Studio: Was bleibt“ mit A, B, C; Entscheidung, die er mit einem Satz kippt; Kopie seines Projekts für eine Probe; automatische Probe „ein Zug ändert nur, was die Vorschau nennt“ | „Tor“ |
| Etappe, Welle, Probe, Ebene | Bauabschnitt M0 bis M11; Pakete, die parallel gebaut werden; vorher festgelegte Prüfung mit Bild oder Aufnahme; Platz in der Malreihenfolge | „Probe“ als Karte; „Ebene“ für Schichten |

---

## 16 Herkunft

**Die Richter** gaben insgesamt: Florian-Linse A 8, B 7, C 7; Technik A 6, B 8, C 7; Spiel A 7, B 6, C 8. Alle drei empfahlen,
nach Rollen zusammenzusetzen: **A die Oberfläche, B den Unterbau, C das Spiel und die Abnahme.**

| Bereich | Grundlage | übernommen | behobener schwerer Fehler |
|---|---|---|---|
| 1 | A | B: Taktnummer, Spulen; C: Zählung, Werteverlauf | – |
| 2 | B | A: P in allen Zuständen, SVG auf die Leiste, Ruhe-Wächter; C: 0,5 Bildpunkte, Mischart an der Leiste, „Punkt, nie Linie“, Welt als Form | A: Fang lenkte Züge auf seine Schlüssel um; B: Spitzenführung fehlte, Glätte-Schnappen bis 0,05; C: Formziele ohne mitlaufenden Rahmen |
| 3 | A | B: Regler je Winkel, `rueckrechnen`, ein Bezugsrahmen für alle Zusatzformen; C: vier Demo-Momente, Video der Bohne | V posiert → V verschiebt; „Haut“ → „Aufhängung“ |
| 4 | A | B: reine Funktion, kein Autorig im Spiel; C: Nebenprodukte, drei Ringzüge, fremde SVGs | C: ersetzte das Handrig ohne Vergleich |
| 5 | A | C: „bis Ereignis“, Spannung, Dinge mit Posen, Übergangsliste; B: Ausgleich je Regler, „jede“, „über X“; Spiel-Richter: Kehrtwende, Anlauf | A: Tafel nur „erreichbarer“ Paare |
| 6 | C | A: Prüfstand-Gesten, Extreme formen, Aufnehmen, ruhende flüchtige Schicht; B: `WeltAdapter`, Eigenschaftstest; Spiel-Richter: Kennlinie | A: Blick voraus ohne Plan |
| 7 | B | C: Effekt-Tabelle, Sterne als Formen, sechs Geister messen; A: Stärke und Weichheit, Kostenampel, Bildfolgen | Technik-Richter: offen, wer einen Feldsatz bekommt |
| 8 | C | A: Posenkarten in Lücken, „getrieben von“; B: registrierte Bausteinarten, „Warum?“ für Regler | C: „Karte“ für Regeln; ein Treiber je Regler; Regel je Ding gegen je Art |
| 9 | A | C: Strecke, Bedienprobe aus der Demo; B: Werkzeuge nur über `rueckrechnen` und Store | A: Fang; A: V |
| 10 | B | C: Spiel-App ohne Spielcode, Beweis-Läufe als Tests, Rückblick aus gezeigten Werten; A: Ort-Probe, Schutz seiner Dateien (heute als Schreibhaken), Ablage | A: Code-Kopie von `raster.ts` und `haltung.ts` mit Teilnamen |
| 11 | C | A: Teil → Studio-Mittel, Blick in die Kamera = Logo; B: Geist des besten Laufs | C: Einkringeln um 360°; Berühren statt Antippen; Rückwurf als Standard |
| 12 | B | A: Umzug erst auf sein Wort, frühe Werkbank-Probe; C: Demo-Momente als Proben, Neuschätzung, Rückfall an Nicoles Tests | B: M1 ohne Spitzenführung; M1 auf 12 bis 18 Tage |

**Verworfen, kurz begründet:** Code-Kopien des Prototyps in der Laufzeit (Teilnamen, Arbeitsregel 7; die gerechnete Stauchung wäre eine
Form, die er nicht gezeichnet hat); Fang über Nachbarschlüssel (ein Zug bei 2° hätte seinen Logo-Schlüssel bei 0° geändert); ein Treiber
je Regler; „Karte“ als Logikwort; Blick voraus und Nachspielen ohne Plan (würden still versagen); Übergangsform als Glocke (06 §6.5,
ersetzt durch Zwischenposen).

**Überarbeitung nach der Vollständigkeitskritik** (20.11.): Jeder der 30 Befunde ist im Entscheidungsblatt entschieden und hier
eingearbeitet, dazu die Festlegungen F1 bis F7 (selbstständig durchbauen, parallel bauen, Ort, Ports, seine Arbeit in Studio, Logo-Regel,
Wochenlimit). Neu sind unter anderem der Grundweg (10.5), das Körpermodell der Figur (6.3), Text als Figur (11.6), ein Bezugsrahmen
für alle Zusatzformen (3.1), Gewichte an Biegeachsen (3.1), die vier Gesten ohne Ausnahme (9.1), Messung an Kurvenpunkten (2.1), die
Liste statt der Tore (12, 14) und die Zählung M0 bis M11.
