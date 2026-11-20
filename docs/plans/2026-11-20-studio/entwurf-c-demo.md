# Studio, Entwurf C: Die Demo baut den Editor

Stand 20.11.2026. Einer von drei Konzeptentwürfen. Blickwinkel: Zuerst steht das Spiel; jede Funktion des Editors muss sich an
einem Moment der Demo beweisen. Geschrieben wurde von Abschnitt 11 aus. Die Bereiche 6, 8 und 11 sind ausführlich, die übrigen
knapp. Belege in der Form „(Gesamtbericht 3.2)“ oder „(06 §2.6)“. Zahlen ohne Beleg sind eigene Schätzungen und so markiert. Gebaut
und gemessen ist nichts.

## 0 Kurzfassung

**Was Studio ist.** Ein Editor für 2D-Vektorfiguren, die sich zwischen Florians gezeichneten Formen bewegen, Physik haben und
Spiellogik tragen. Editor und Spiel benutzen dieselbe Laufzeit und dieselbe Datei (Gesamtbericht 4.1). In Ruhe ist jede Figur
exakt ihre Zeichnung; Ozzy ist dann genau sein Logo.

**Was die Demo ist.** „Gassirunde: ein Tag auf Ozzys Hügel“. Ozzy steht auf einem runden Hügel, den der Bildrand unten
abschneidet; der Spieler dreht den Hügel mit einem Finger. Ozzys Lage ist sein Gaspedal, zu schnell heißt stolpern, und Ozzy hat
seinen eigenen Kopf. Statt drei Welten (Recherche) gibt es einen Hügel und drei Runden: Morgen, Mittag, Abend nach dem Regen. Jede
Runde bringt eine neue physikalische Idee und ist zugleich die Abnahme einer Stufe des Editors.

**Die wichtigsten Entscheidungen**

1. Keine Zeitleiste als Ordnung, sondern eine Leiste mit vier Gesichtern: Regler, Taktleiste eines Übergangs, Strecke der Runde,
   Werteverlauf des Spiels (1).
2. Ein Baustein für Bewegung: der Regler mit Schlüsseln. Kopfwinkel, Ohren, Gangphase, Spannung, Tageszeit und Wasserstand sind
   Regler (2, 5).
3. Posen, Standardübergang mit Trägheit und gestaltete Übergänge mit Zwischenposen, Zusätzen, Marken und Abschnitten, die an
   einem Ereignis enden („Flug bis Landung“) (5).
4. Knochen nur, wo sich etwas biegt: starre Teile, Biegeachsen, Drehzentren; Gewichte je Anker und je Griffpaar; Korrekturen im
   Ruheraum (3). Autorig mit einem Knopf, gebaut, wenn die Katze als zweite Figur kommt (4).
5. Physik: Box2D für Rad, Körper und lose Dinge, eine eigene XPBD-Schicht für Ohren, Bart, Schwanz und Bohne, ein Takt (6).
6. Logik ohne Code: Bausteine, Drähte, drei Kartenarten, fünf Bänder. Kamera, Musik und Himmel sind Dinge mit Posen wie Ozzy (8).
7. Eine aktive Stelle statt Modi, vier Linsen, vier Gesten (9).
8. Die Demo legt den Umfang fest: Was kein Moment der Demo braucht, wartet (11.13). Die Spiel-App enthält keinen Spielcode; ein
   Test prüft das (10).

**Besser als Spine und Rive** (01, 02): vektornativ mit Verschmelzen und Verjüngungen statt Bildern auf Netzen; Übergänge mit
eigenen Zwischenposen, Kontakten und Ereignis-Enden statt Überblendung mit Dauer; Physik eingebaut, die in sichtbare Regler
schreibt (Rive hat keine); Logik als Sätze am Ding statt Zustandsgraph; Gewichte auch für Bézier-Griffe mit Glätte-Garantie; keine
Trennung „Setup“ gegen „Animieren“; ein Editor für Mac und iPad mit Stift.

**Aufwand:** bis zur spielbaren Morgenrunde grob 3 bis 4,5 Monate, bis zum ganzen Tag 6 bis 9 Monate (eigene Schätzung, 12.1).

---

## 1 Zeitmodell

**Entscheidung:** Zeit wird nur gezeigt, wo sie gestaltet wird (05 §5.1). Die Demo zählt nach (Listen in 11.12): rund 25
gestaltete Übergänge von 0,3 bis 3 s, elf Zyklen, zwei Regie-Abläufe von 4 bis 6 s; alles andere sind Reaktionen, also Regler, die
Physik und Spiel bewegen. Kein Moment der Demo braucht mehrere Figuren in fester Zeit länger als 6 s.

| Ordnung | trägt die Demo? | Preis | Urteil |
|---|---|---|---|
| Klassische Zeitleiste, Spuren je Eigenschaft (Spine, Rive, After Effects) | nur die gestalteten Übergänge; die Reaktionen gar nicht | Dutzende Spuren für etwas, das ein Regler ist; ein Modus „Animieren“ | als Expertenspur im Übergang |
| Zustandsgraph (Rive, Unity) | Übergänge ja, Formen nein | unübersichtlich ab etwa acht Zuständen (05 §2.2) | nur als Ansicht |
| Regler, Posen, Übergänge (Gesamtbericht 3.1) | alles außer langen Szenen mit mehreren Figuren | Bau mittel bis hoch | **gewählt** |
| Aufnahme, Vorspielen (Procreate Dreams) | Timing, schnell | Zittern, keine Struktur | Eingabe in jede Leiste |

**Eine Leiste, vier Gesichter.** Dasselbe Bauteil, dieselben Gesten wie heute in Florians Werkzeug: Klick springt, Ziehen fährt,
J und K springen zum Schlüssel davor und danach, Z zeigt die Zwiebelhaut, ⇧Z die Bahnen der Anker, ● nimmt auf.

| Gesicht | Achse | Was darauf liegt | Beispiel |
|---|---|---|---|
| Regler | Wert, gerade oder rund | Schlüsselformen, Faltschlüssel | Kopf 0° bis 360°, Ohr hoch bis angelegt |
| Taktleiste | Zeit eines gestalteten Übergangs | Zwischenposen, Zusätze, Marken, Balken „bleibt stehen“ | Hinsetzen mit Hüpfer |
| Strecke | Winkel auf dem Hügel, 0° bis 360° | Dinge, gefärbt nach dem Tempo, das sie verlangen | Morgenrunde |
| Werteverlauf | Spielzeit, letzte 20 s | Kurven mit Schwellen, Ereignismarken | Kipp-Reserve vor einem Sturz |

**Regie ohne Mehrspur-Zeitleiste.** Abgang über den Rand und Ankunft sind gestaltete Übergänge des Dings „Rahmen“; ihre Marken
starten Übergänge anderer Dinge (Kamera, Musik, Ozzy). Ehrliche Gegenrede: Ein Vorspann von 30 s mit fünf Figuren wäre so mühsam.
Dann braucht es eine Mehrspur-Zeitleiste; sie wartet, weil kein Moment der Demo sie verlangt.

## 2 Formen und Morph

- **Grundgesetz:** eine Form, viele Zustände. Alle Schlüsselformen einer Form sind Bearbeitungen derselben Anker; die Zuordnung
  wird nie geraten (Gesamtbericht 1, 3.2). Automatische Zuordnung gibt es nur beim Import fremder SVGs (wie heute
  `ankerErgaenzen`).
- **Anker** tragen eine feste Kennung und die Art glatt oder Ecke. Griffe liegen relativ zum Anker; ein glatter Anker hat einen
  Winkel und zwei Längen, so steht die Glätte im Format (Gesamtbericht 3.8).
- **Mischart je Regler,** als kleines Wort an der Leiste sichtbar: „Rahmen + Rest“ ist Standard für alles Neue (06 §2.6);
  Florians Kopfdrehung behält „je Koordinate“, bis ein Vergleichsbild in derselben Ansicht und sein Wort anders entscheiden.
  Kreisregler mischen periodisch.
- **Anker hinzufügen:** P auf die Linie. Studio teilt das Stück in allen Schlüsseln an derselben Stelle (de Casteljau); keine
  Form ändert sich. **Anker löschen:** Studio zeigt vorher je Schlüssel die größte Abweichung als roten Umriss und fragt nur, wenn
  sie irgendwo über 0,5 Bildpunkte liegt (eigene Regel).
- **Falten** bleiben Faltschlüssel, aber als Punkt auf der Leiste, verschiebbar und formbar. Drei Wächter (Sehnenumkehr,
  Schlaufe, Selbstschnitt) markieren rot und reparieren nie still (06 §3).
- **Erscheinen, Verschwinden, Malreihenfolge:** Schlüsselart „Wechsel“ mit einer Breite (0 = hart). Was verschwindet, läuft auf
  einen Punkt, nie auf eine Linie (Falle aus der Übergabe der Ozzy-Figur).
- **Für die Demo** (Liste in 11.12): Der Hügel ist ein geschlossener Pfad; Buckel, Mulden und Graben sind Bearbeitungen davon. Die
  Ruhe der Pfütze zeichnet Florian, die Physik verschiebt nur ihre oberen Anker.

**Ein Mechanismus, bewusst zwei Rechenarten** (06 §6.2):

| Art | ausgelöst von | gemischt | in der Demo |
|---|---|---|---|
| Ansichtsschlüssel | Ansichtsregler | Rahmen + Rest, exakt an den Schlüsseln | Kopfdrehung, Kehrtwende |
| Formziel | Regler 0 bis 1 | additiv | Stauchung, Brauen, Ohrstellung |
| Korrekturform | Gelenk- oder Biegewinkel | im Ruheraum, PCHIP über den Winkel | Katzenbuckel, Bohne beim Purzeln |
| Übergangsform | Mitte eines Übergangs | Glocke über dem Übergang | Streckung im Hüpfer |

Gleich ist: gezeichnet mit denselben Werkzeugen, gespeichert als Versatz je Anker, gezeigt auf derselben Leiste. Verschieden ist
nur die Rechnung, weil gerades Addieren Drehungen schrumpft (06 §2.1): Drehartiges im Rahmen, Additives gerade.

## 3 Knochen und Gewichte

- **Drei Arten je Teil** (Gesamtbericht 3.2c): *starr* (Kopf mit Masken, Nase, Bart; die Form des Kopfs ändert die Ansicht, nicht
  ein Knochen), *Biegeachse* (Beine, Schwanz, Ohren ohne Schlüsselformen, Rumpf mit zwei Abschnitten; die Länge bleibt, die Achse
  ist zugleich die IK; verallgemeinert das „Rückgrat“ des Prototyps), *gewichtet mit Drehzentren* (Bohne beim Purzeln, Hals;
  lineares Mischen als Schalter).
- **Gewichte auf Ankern und Griffen** (Gesamtbericht 3.3): bis zu vier Knochen je Anker; Griffe erben die Abbildung ihres Ankers.
  Weicht Florian ab, bekommt ein glatter Anker **einen** Gewichtssatz für sein Griffpaar (bleibt exakt glatt), eine Ecke einen je
  Griff. Der Glätte-Schutz greift nur, wo eine Stufe die Glätte verletzt (Physik, eigene Gewichte je Griff an einem glatten
  Anker). Vorschläge kommen aus dem Kurvenpunkt bei t = 1/3 und 2/3, nie aus der Lage des Griffs (07 Schritt 6).
- **Zeigen und ändern:** Knochen antippen zeigt Wärme auf der Fläche und einen Füllring an jedem Anker; senkrecht am Anker
  ziehen ändert das Gewicht, die Zahl erscheint nur beim Ziehen; das Schloss am Anker gibt dem Griffpaar eigene Gewichte; der
  Pinsel W ist ein Fachwerkzeug (12 §6.10).
- **Zusammenspiel von Morph und Knochen** in fester Reihenfolge (Gesamtbericht 4.4): Ansichts-Morph → Gelenke reiten auf der
  gemorphten Elternform (starre MLS) → im Ruheraum Formziele, Posen-Versätze, Korrekturformen an den *physikalisch bewegten*
  Winkeln, Übergangsformen → Skinning → flüchtig Formabgleich und Glätte-Schutz → Wächter. Geformt wird immer am Gezeigten; Studio
  rechnet den Zug durch das Skinning zurück in den Ruheraum (03 §10.2). Jede Korrektur dreht so mit ihrem Knochen.
- **Vier Demo-Momente beweisen es:** (a) Die Ohrgelenke wandern bei der Kopfdrehung mit, während die Ohren pendeln. (b) Der
  Katzenbuckel: Biegeachse des Rumpfs plus Korrekturform am Biegewinkel. (c) Ozzy in Rückenlage: Die Bohne biegt sich über
  Drehzentren ohne Einschnürung. (d) Die schwingende Schwanzkette löst ihre Korrekturform aus (03 Probe 3).
- **Ehrlich:** Ozzy braucht Gewichte mit Mischung nur an zwei Stellen (Bohne, Hals). Ob dort lineares Mischen oder Drehzentren
  schöner sind und ob Griffgewichte nötig werden, entscheidet Florian an zwei Videos nebeneinander (Gesamtbericht 3.2c).

## 4 Autorig

- **Verfahren** (07, Gesamtbericht 3.4): Teile-Graph (Aufsatz, Verbund, Füllteil, Gelenk) plus Vorlage als Daten („Vierbeiner“,
  „Allgemein“) plus Achse je Teil. Gewichte über die Achsen-Koordinate, runde Teile über Wärme. Deterministisch, in einem Worker,
  geschätzt unter 50 ms (07 §5).
- **Er liefert auch Physik und Spiel:** Hüllen für Box2D (Brust als Kapsel, Becken und Kopf als Kreise), Masse aus den Flächen,
  Federketten für Schwanz und Ohren, Füße mit Sohlenrichtung, Rollen und Seiten als Adressen für Karten („alle Pfoten“, „Ohr
  links“). So entsteht der Körper für die Physik ohne Handarbeit (07 Schritt 8).
- **Bedienung:** Knopf „Knochen vorschlagen“ in der Linse Knochen; die Knochen wachsen in 0,5 s vom Rumpf nach außen; 3 s
  Probewackeln; Fragezeichen nur bei Unsicherheit; Gelenkring ziehen verschiebt, Rand des Rings ziehen macht hart oder weich, Teil
  auf ein anderes ziehen heftet an; Gepinntes bleibt beim nächsten Lauf; der Lauf ist ein Rückgängig-Schritt (07 §5).
- **Wann:** Die Demo braucht ihn erst mit der Katze (Mittagsrunde, Etappe E5). Bis dahin läuft Ozzy auf seinem Handrig aus
  `haltung.ts`, übernommen als gepinntes Rig. Prüfstein: Der Autorig findet an Ozzy ohne Teilnamen `ELTER`, `PARTNER` und die
  Kopfteile (07 §9) und riggt die Katze so, dass Florian höchstens drei Gelenkringe zieht. Danach ersetzt sein Ergebnis das
  Handrig, Florians Pins bleiben.
- **Ehrlich:** Zwei Figuren sind ein dünner Beweis. Deshalb laufen zusätzlich zwei fremde SVGs durch (Schmetterling und ein Vogel
  aus dem Netz mit freier Lizenz), nur zum Prüfen, nicht für die Demo.

## 5 Posen und Übergänge

- **Pose** = Stand der Regler und Knochen einer Schicht. Vier feste Schichten: Körper; Kopf und Blick; Gesicht (Ohren, Brauen,
  Bart); Physik, immer oben (05 §5.6). Eine Teilpose ist einfach die Pose einer Schicht.
- **Standardübergang:** Trägheits-Ausgleich mit Feder, zwei Regler Dauer und Federung (Gesamtbericht 4.6 Punkt 7), Nachlauf je
  Teil (Kopf, Ohren, Schwanz kommen später an). Er ersetzt die Feder von 16/s des Prototyps, die jede gestaltete Bewegung um
  0,125 s verschiebt (05 §7). Startwert: 0,35 s, Federung 0 % (eigene Schätzung).
- **Gestalteter Übergang** = Taktleiste: Zwischenposen als Karten; Abschnitte mit Dauer und Kurve (weich, fallen, auf, linear,
  Feder); **neu: Abschnitte „bis Ereignis“** (Flug bis Landung, Rutschen bis Stillstand, Liegen bis Ruhe) mit einer Höchstdauer
  als Sicherung, auf der Leiste gestrichelt; Zusätze (Hüpfer, Plumps, Seufzer, Wedeln), die auf Regler addieren; Balken „bleibt
  stehen“ je Teil; Marken als Ereignisse für Ton, Staub und Karten, die nur über 50 % Gewicht feuern (14d §3.3); **Spannung als
  Regler mit Schlüsseln**, damit der Übergang in den Sturz eine Spannungskurve ist und kein zweites System; Varianten mit Gewicht
  (Hinsetzen normal 70 %, mit Hüpfer 30 %).
- **Tafel „von × nach“** je Schicht: leer = Standard, ◆ gestaltet, „über X“ = Wegsuche, × gesperrt; die Diagonale ist das
  Verweilen (Atmen, Schnarchen, Schnüffeln). Ozzys rund 30 Körperposen ergeben 900 Paare; davon sind rund 25 gestaltet (11.12),
  der Rest ist Standard oder „über X“. Die Tafel zeigt deshalb gefiltert nur Posen mit Ausnahmen; auf dem iPhone eine Liste je Pose.
- **Unterbrechen** je Übergang: sofort (Standard; der Rest per Trägheit), am nächsten Halt oder nie (Stolpern bis zur Entscheidung).
- **Zyklen** sind Kreisregler, die Zeit oder Weg vorschieben. Der Gang ist ein Feld aus Phase und Tempo mit drei Zeilen (Schritt,
  Trab, Galopp); bei jedem geplanten Aufsetzen wird die Phase auf die gezeichnete Kontaktstelle gezogen (Gesamtbericht 4.6 Punkt 16).
- **Ein Mechanismus für alles, was Zustände wechselt:** Kamera (nah, weit, folgen, Aufzug), Musik (Stücke), Himmel (Schlüssel der
  Tageszeit) und der Rahmen (Spiel, Abgang, Ankunft, Rückblick, Tagebuch) haben Posen und Übergänge wie Ozzy. Florian lernt das
  einmal.

## 6 Physik

### 6.1 Grundsatz

Die Animation gibt Ziele, die Physik ist die Wirklichkeit, Federn mit Spannung verbinden beides (08 §9.1). Physik schreibt nur in
sichtbare Regler (Ohr-Schwung, Stauchung, Balance) und in Versätze der Knochen; in Ruhe ist alles null, und Ozzy ist exakt seine
Zeichnung. Bahnen, Kontakte und Schwung sind immer echt; Cartoon gibt es nur in der Zeit (Zeitlupe), in den Posen und hinter dem
Bildrand (13 §5.5).

### 6.2 Drei Rechner, ein Takt

Weg B, freigegeben erst nach Probe P1 (14a §7): 60 Hz mit je vier Teilschritten, Darstellung zwischen zwei Takten gemischt,
Zeitlupe nur über das Takt-Tempo, nie über die Taktlänge.

| Rechner | rechnet in der Demo | warum dort |
|---|---|---|
| Box2D 3.2 (WebAssembly) | Hügel am Scharnier; Ozzys Brust, Becken, Kopf mit Motor-Gelenken; Ragdoll aus 10 Körpern (vorab angelegt, nur geschaltet); Ball, Wurst, Andenken, Brett, Wippe, Sprung der Katze | Ruhe und Reibung echter Kontakte: Sitzen, Popo-Rutschen, Liegen, Sturz (14a §3b) |
| eigene XPBD-Schicht (TypeScript) | Ohren, Bart, Schwanzkette, Stauchung, Kopf ruhig halten | Federn auf Florians Formen, in Ruhe null |
| Felder in TypeScript | Staub, Spritzer, Tropfen gegen das Abstandsfeld; Pfützenfläche als Höhenfeld; Fühler und Fußnormalen | nur sichtbar, ohne Rückwirkung (14a §3g) |

**Eine Quelle, drei Ableitungen:** Aus dem Pfad des Hügels entstehen beim Bearbeiten die Kette für Box2D, das Abstandsfeld und die
Strecken des Renderers. Zeichnung und Anschlag liegen höchstens 0,5 Bildpunkte auseinander (14a §3c, Kriterium K9).

### 6.3 Hügel und Finger

| Größe | Startwert | Wirkung |
|---|---|---|
| Radius | 14 L (L = Ozzys Körperlänge) | Kippzeit √(R/g) = 0,84 s, Rundenlänge 88 L (13 §2.3) |
| Schwerkraft | 20 L/s² | Kippzeit, Sprung, Fall |
| Radgewicht | Randmasse 5 × Ozzy („mittel“); Stufen 1 ×, 5 ×, 20 ×, „Boden“ (kinematisch) | wie stark Ozzys Schritte den Hügel mitdrehen (14a §3a) |
| Nachlauf | Lagerreibung als Motor mit Tempo 0; Auslauf aus 30°/s in rund 2,5 s (eigene Schätzung) | Schwung nach dem Loslassen |
| Griff | Fingerfeder 4 Hz, Dämpfung 1, Höchstkraft 1 × Ozzys Gewichtskraft (eigene Schätzung) | Halten hält, grobes Rucken verpufft |

Halten, Ziehen und Loslassen sind drei Zustände desselben Motor-Gelenks am Fingerkörper. Läuft Ozzy stärker gegen den Finger an,
als der Griff hält, rutscht der Hügel sichtbar unter dem Finger weg: ein ehrliches „er zieht ganz schön“.

### 6.4 Ozzys Körper

- **Drei feste Teile** (Brust, Becken, Kopf) mit Motor-Gelenken; *Spannung* ist ihre Höchstkraft. Haltungen entstehen über
  Gelenkziele, nie durch Umformen einer Hülle je Takt (14a §3d).
- **Vier Federbeine** aus Strahlen, am Hügel gehängt. Die Pfoten sind keine Kontakte, sondern ein Antriebsgesetz mit Kräftepaar:
  `F = begrenze(m·k·(v_soll − v_rel), ± min(Bremskraft·cos α, Haftung·N))`, gegengleich am Fußpunkt auf den Hügel (14a §3b).
  Daraus folgt die Stehzone: tan α ≤ min(Bremskraft / g, Haftung). Mit Bremskraft 0,3 g auf Gras sind das ±17°, auf Matsch
  (Haftung 0,1) ±6°. Keine Sonderregel für Matsch.
- **Wunschtempo aus dem Hang ist ein Draht,** dessen Kennlinie Florian zieht (8.3): 0° bis 3° steht er, 3° bis 8° Schritt
  (1 bis 2 L/s), 8° bis 13° Trab (2 bis 4 L/s), 13° bis 17° Galopp (4 bis 6 L/s) (13 §2.2). Jenseits der Stehzone wird er
  schneller, als er will.
- **Schrittplaner** (08 §5.2): Standpfoten fest in Hügelkoordinaten (sie rutschen nie, außer die Haftung reißt); Schritt bei Takt
  der Gangart, überschrittener Reichweite oder Kipppunkt außerhalb der Stützstrecke; Ziel nach Raibert; Schritthöhe 0,18 L
  (eigene Schätzung); das Bein ist die Biegeachse zur Pfote.
- **Sprung aus der Fähigkeit, nicht je Ding:** Sprunghöhe 0,5 L ergibt mit g = 20 ein Absprungtempo von 4,5 L/s und 0,45 s Flug
  (eigene Rechnung). Der Planer springt, wenn die Bahn das Ding überdeckt und ein Absprungpunkt passt; sonst verweigert er (zu
  langsam) oder streift (zu schnell). Steinchen unter der Schritthöhe überläuft er. So verlangt jedes Ding von selbst ein Tempo
  (13 §9.4), ohne Regel je Ding (Arbeitsregel 7).
- **Stolper-Auslöser** im Baustein Vierbeiner (08 §6.1): Hängenbleiben, Rutschen, Überrennen, Überkippen, harte Landung
  (Aufprall über 6 L/s, eigene Schätzung). Die Regie darf ein Stolpern anfordern; es läuft als kleiner Stoß durch dieselbe Rechnung
  (14b §7.10).
- **Wurf** (neu, für den Rückwurf in 11.7): Befehl „von A nach B in t Sekunden“. Er setzt nur das Anfangstempo; danach ist alles
  echte Physik, und der Spieler kann die Landung fangen.

### 6.5 Sturz, Liegen, Aufstehen

Fangschritte bis 0,5 s → Entscheidung (Kipppunkt wieder in Reichweite?) → Spannung von 100 % auf 30 % in 0,1 s, Ziel ist die
Purzel-Pose → der Aufprall treibt die Stauchung → Liegen mit 5 % → Ruhe erkannt (Bewegung unter einer Schwelle für 0,4 s, eigene
Schätzung) → Lage einordnen (Bauch, Seite, Rücken) → gestaltetes Aufstehen dieser Lage, Spannung in 0,4 s zurück auf 100 % →
Schütteln (08 §6.2, §7.2, §9.7). Die Ragdoll-Körper starten mit Lage und Tempo der Animation (08 §7.1). Die Spannungskurve ist ein
Regler im Übergang (5); der Sturz ist also kein zweites System.

### 6.6 Physik-Chips der Demo

Jeder Chip zeigt zwei Regler, alles Weitere unter „Mehr“. Bei Federn heißen sie Dauer und Federung; innen gilt f = 1/Dauer und
ζ = 1 − Federung (Gesamtbericht 4.3 Punkt 7, beim Bau zu prüfen).

| Chip | an | Startwerte | Quelle |
|---|---|---|---|
| Schwingen | Ohren, als Regler zwischen Florians Ohrformen | Dauer 0,4 s, Federung 65 %, Schwerkraft-Anteil 30 % | 08 §9.7 |
| Schwingen | Bart | 0,25 s, 55 % | 08 §9.7 |
| Kette | Schwanz, sechs Glieder auf der Biegeachse | 0,5 s, 70 %, Spitze weicher | 08 §9.7 |
| Stauchen | Bohne, Regler zwischen gestaucht und gestreckt | 0,2 s, 50 % | 08 §9.7 |
| Ruhig halten | Kopf, Ziel in Weltrichtung | 0,17 s, 0 % | 08 §9.7 |
| Vierbeiner | Ozzy | Bremskraft 0,3 g, Sprunghöhe 0,5 L, Mut 0,5, tollpatschig 0,3, Spannung im Sturz 30 %, im Liegen 5 % | 08, 13 |
| Rad | Hügel | Tabelle 6.3 | 14a |
| Boden | Abschnitte des Hügels | Haftung Gras 0,6, nasses Gras 0,2, Matsch 0,1, Holz 0,5 (eigene Schätzung) | 13 §2.5 |
| Fest | Steinchen, Stamm, Körbchen, Bock der Wippe | gerundete Polygone am Hügel, höchstens 8 Ecken | 14a §3c |
| Lose | Ball (Kreis 0,35 L, Rollwiderstand 0,02), Wurst, Andenken, Brett | als Bullets | 14a §3g |
| Gelenk | Brett der Wippe | Scharnier, Grenzen ±18°, Dämpfung 0,3 (eigene Schätzung) | 14a §3g |
| Wasser | Pfütze | Höhenfeld aus 24 Säulen, 3 Hz, Federung 90 %, Spiegel waagrecht in der Welt | 14a §3g |
| Teilchen | Staub, Spritzer, Tropfen | 8 bis 20 bzw. 30 bis 80 Tropfen, 0,6 s Lebensdauer (eigene Schätzung) | 14a §3g |
| Gelee | wartet, kein Ding der Demo ist wabbelig | – | Gesamtbericht 4.6 Punkt 5 |

### 6.7 Prüfstand

Die Spielwiese ist ein Tag ohne Uhr mit allen Dingen. Dort: Schubsen, Schütteln, Wind, Dinge fallen lassen, Launen per Knopf,
Zeitlupe, Einzeltakt, Spulen über Schlüsselstände alle 16 Takte, „zehnmal gleich“, Röntgen (Schwerpunkt, Stützstrecke, Kipppunkt,
Hüllen über der Zeichnung, Sprungfenster des nächsten Dings) und „Aufnehmen“, das eine Physik-Szene in Schlüssel backt, die Florian
nachformt (08 §9.8, 14a §6.4). Die Spur der Zukunft (12 §6.13) kommt nur, wenn die Messseite Luft zeigt.

### 6.8 Einheitlich, wo es geht; zwei, wo es muss

Eine Federsprache (Dauer, Federung) gilt für Chips, Standardübergang, Finger, Kamera und Musikwechsel. Ein Drahttyp verbindet Hang
und Wunschtempo ebenso wie Drehtempo und Rumpeln. Bewusst zwei Löser, weil Kontakte und Federn verschiedene Stärken brauchen
(14a §2), und zwei Klangquellen: Marke für Gestaltetes, Kontakt für das, was die Physik entscheidet (14d §3.4).

## 7 Effekte und Rendern

- **Renderer:** der Abstandsfeld-Renderer des Prototyps, verallgemeinert zu Stufe 1 (10 §8.5): Felder nur im Rahmen jeder Figur,
  feste Stückzahl beim Abflachen, Verschmelz- und Ebenenmodell als Daten, je Figur ein Feldsatz; halbe Feldauflösung nur nach
  Vorher-Nachher-Bild; WebGL2; keine Nachbearbeitung. Budget auf dem kalten iPhone 16: Grafik höchstens 8 ms, Hauptthread
  höchstens 6 ms (14c).
- **Eine Grammatik:** Ein Effekt ist Wo (Auswahl) + Profil über dem Abstand + Antrieb (fest, Schlüssel, Pose oder Draht)
  (10 §8.4), bedient als Chip mit zwei Reglern wie die Physik.
- **Regel für Ozzy:** Auf seinem Körper erscheint nur, was er zeichnet, plus die Beinschattierung in Bewegung. Alles andere
  geschieht um ihn herum.

| Effekt | in der Demo | Standard |
|---|---|---|
| Verschmelzen | Ozzys Teile (Regler je Paar, heute „exakt/flüssig“), Staub, Spritzer mit der Pfütze | an |
| Dickenregel, Kantenglättung mit Spitzenregel | Weiß über Schwarz, alle Kanten | an |
| Kontakt- und Bodenschatten | Pfoten, Körper, Dinge; macht Sprunghöhe lesbar | an |
| Beinschattierung | ferne Beine in Bewegung | an |
| Staubwölkchen | Tapp im Galopp, Bremsen, Plumps | an |
| Spritzer und Wasserfläche | Pfütze | an |
| Tropfen auf der Kamera, analytisch, ohne Brechung | Schütteln nach der Pfütze, Regen | an |
| Regen | Beginn der Abendrunde | an |
| Himmelsverlauf mit Dithering | Tageszeit | an |
| Sterne | nur nach harter Landung; Formen auf einer Kreisbahn (ein Zyklus), kein Shader | an |
| Bewegungslinien | Flitzen, Wippen-Katapult | aus, auf Florians Wort |
| Aufprallbild, Schmierbild, Zittern | auf Ozzy | aus, nur auf Florians Wort |

Was wartet: Auflösen, Schein, Halbton, Papierkorn, Kachel-Durchgang, WebGPU. Ehrlich: Der Rückblick zeigt bis zu sechs Ozzys
zugleich, also sechs Feldsätze. Das misst die Messseite in E0, bevor es gebaut wird.

## 8 Spiellogik ohne Code

### 8.1 Entscheidung

Bausteine, Drähte, Karten (14b, Gesamtbericht 3.9). Drei Ergänzungen, die aus der Demo kommen:

1. **Alles, was an einem Ding hängt, ist ein Chip:** Physik, Effekt, Klang und Baustein. Ein Baustein ist ein großer Chip mit
   Zuständen, Messwerten, Ereignissen und Befehlen. Es gibt einen Weg zum Anhängen: ＋ öffnet die Bibliothek, Ziehen auf das Ding.
2. **Kamera, Musik, Himmel und Rahmen sind Dinge mit Posen und Übergängen.** Ein Kamerawunsch ist eine Solange-Karte, die eine
   Kamerapose hält; die Überblendung ist ihr Übergang (14b §7.12 sagt dasselbe mit anderen Worten).
3. **Karten nennen immer ein bestimmtes Ding,** nie „irgendein Ding“. Zwei Duftstellen tragen zwei Karten mit getrenntem
   Gedächtnis (14b §7.8).

### 8.2 Bausteine der Demo

| Baustein | an | Regler | Messwerte, Ereignisse | Befehle |
|---|---|---|---|---|
| Vierbeiner | Ozzy | Bremskraft, Sprunghöhe, Mut, tollpatschig; Neugier, Sturheit, Energie, Verfressenheit | Hang, Tempo, Kipp-Reserve, Lage auf dem Hügel, Gangart; Pfote setzt auf, springt, überspringt [Ding], landet (Stärke), stolpert, plumpst, liegt (Lage), ist aufgestanden, fällt über den Rand | Wunschtempo, Stolpern anfordern, Wurf |
| Rad | Hügel | 6.3 | Winkel, Drehtempo, Griff an der Grenze; Finger fasst an, lässt los | – |
| Ding | Steinchen bis Brett | fest oder lose | Tempo; Kontakt mit Stärke | zeigen, verbergen, anstoßen |
| Zone | Duftstelle, Pfütze, Körbchen, Graben, Matsch | Breite | betritt, verlässt | – |
| Schläfer | Katze | Weckschwelle: Landung über 0,6 oder Tempo über 2 L/s im Umkreis von 2 L | wacht auf, faucht, springt weg | wecken |
| Flieger | Schmetterling | Bahn um den Heimpunkt, Scheu 1,5 L | flieht | – |
| Zähler | Plumpse, Plumpse der letzten 30 s, Sprünge in Folge, Fehlversuche je Ding, Andenken | Ziel | Ziel erreicht | +1, setzen |
| Uhr | Rahmen | Rundenlänge 120 s | Tageszeit; Runde vorbei | – |

### 8.3 Drähte der Demo

| Quelle | Kennlinie (Startwert) | Ziel |
|---|---|---|
| Hang unter Ozzy | 0° bis 3° → 0; 3° bis 17° → 1 bis 6 L/s | Wunschtempo |
| zurückgelegter Weg | Schrittlänge | Phase des Gangfelds |
| Kipp-Reserve | 1 → 0 | Balance-Feld; Spannungsschicht der Musik |
| Drehtempo des Hügels | 0 bis 90°/s → stumm bis −6 dB, ±5 Halbtöne | Rumpeln |
| Landestärke | 0 bis 1 | Größe des Staubs, Lautstärke des Plumps |
| Tageszeit | 0 bis 1 | Himmel, Licht, Wahrscheinlichkeit von Müde |
| Nässe (Abendrunde) | 0 bis 1 | Wasserstand der Pfützen; Haftung Gras 0,6 → 0,2, Erde → Matsch 0,1 |

Drähte schreiben nur Regler, nie Zustände (14b §7.3).

### 8.4 Karten, Bänder, Takt

Drei Kartenarten: **Sobald** (genau ein Ereignis, feuert einmal), **Solange** (hält einen Kanal und gibt ihn von selbst zurück),
**Laune** (Ankündigung, Wirkung, Ende, danach, Ruhezeit). Fünf Bänder: Körper vor Regie vor Spieler vor Laune vor Grund; im selben
Band gewinnt die obere Karte. Alle Bedingungen eines Takts werden gegen denselben Stand geprüft, Folgen gelten im nächsten Takt;
Zufall nur mit Saat, je Karte ein eigener Strom (14b §7.4 bis §7.9).

### 8.5 So legt Florian es an

**A. Duftstelle mit Schnüffeln.** (1) Linse Spiel, ＋ → „Zone“ auf den Hügel ziehen; sie rastet auf der Oberfläche ein, der Rand
macht sie breiter. (2) Halten auf der Zone → „Laune anbieten“ → Schnüffeln; die Karte erscheint am Ding im Band Laune, alle Felder
vorbelegt. (3) Tippen auf „Ankündigung“ springt in die Pose „Nase sinkt“; er zieht die Nase tiefer, der Tropfen zeigt „ändert:
Pose Nase sinkt“. (4) ▶: Ozzy läuft durch, ohne zu schnüffeln. Antippen der Karte: „Warum nicht? Gangart war Trab (erlaubt:
höchstens Schritt).“ Er stellt „höchstens Trab“ ein. (5) Halten → „verdoppeln“, an die zweite Stelle ziehen.

**B. Abgang über den Rand.** (1) Rahmen antippen, ＋ Karte: „Sobald Ozzy · fällt über den Rand → Rahmen · Abgang“ (Band Regie).
(2) Doppeltippen auf „Abgang“ öffnet dessen Taktleiste: bei 0 s Kamerapose „folgen“; bei 0,6 s Marke mit Klang „Scheppern“, Studio
schlägt die Geschwister „Bild?“ und „Stoß?“ vor (14d §3.7), er zieht „Staubwolke über dem Rand“ und „dreimal hart“ darauf; bei
1,2 s Marke „Hepp“ mit dem Befehl „Wurf“ an Ozzy (von unter dem Rand zum Scheitel, 1 s); bei 1,7 s Marke „Andenken fallen lassen“
(eines aus vier, Zufall dieser Karte). (3) Er verschiebt „Hepp“ auf 1,5 s, spielt und hört die Pause wachsen.

**C. Die Katze weckt Angst (zwei Dinge).** (1) ＋ „Schläfer“ auf die Katze; Weckschwelle mit dem Regler. (2) Karte an der Katze:
„Sobald Katze wacht auf → Katze · Buckel und Fauchen, dann Wegspringen“. (3) Halten auf der Katze → „Laune anbieten“ → Angst, für
Ozzy: wenn „Sobald Katze faucht, falls Abstand unter 4 L“; Ankündigung Ducken und Schwanz einziehen 0,6 s (davor liegt der Buckel
der Katze, zusammen über 1 s); Wirkung Wunschtempo −2 L/s, nach 1 s Kehrtwende und 4 L/s; Ende bei Abstand über 6 L oder wenn der
Spieler Ozzy antippt; Ruhezeit 20 s. (4) Aufgabe aus der Vorlage „[Ereignis] während [Zustand]“: „Ozzy überspringt Katze, während
sie schläft“.

**D. Ein Draht.** In der Linse Spiel zeigt Ozzy kleine Ausgänge. Vom Ausgang „Hang“ auf den Regler „Wunschtempo“ ziehen; die
Kennlinie erscheint, er zieht ihre Punkte; beim Spielen läuft ein Punkt auf der Kurve mit.

### 8.6 Alle Karten der Demo

| Ding | Karte | Band | Runde |
|---|---|---|---|
| Ozzy | Sobald plumpst → Staub (aus der Stärke), Klang Plumps, Musik stockt, Zähler Plumpse +1; höchstens alle 0,3 s | Grund | alle |
| Ozzy | Sobald stolpert → Klang Fiep, Zeitlupe 0,3 s mal 0,4, Ohren hoch | Körper | alle |
| Ozzy | Sobald landet, falls Stärke über 0,9 → Sterne 1,2 s | Grund | alle |
| Ozzy | Sobald ist aufgestanden → Schütteln, dann Blick in die Kamera (Chance 60 %) oder Niesen (25 %) | Grund | alle |
| Ozzy | Solange steht → Blick zum Finger | Grund | alle |
| Ozzy | Sobald Hügel · Griff an der Grenze länger als 0,3 s → Blick zum Finger 1 s, Brauen beleidigt | Grund | alle |
| Ozzy | Solange Plumpse der letzten 30 s mindestens 3 → Wunschtempo mal 0,8, Schwanz eingezogen | Grund | alle |
| Ozzy | Solange auf Matsch → Gesicht vorsichtig, Ohren zurück | Grund | 3 |
| Ozzy | Laune Müde: Solange Tageszeit über 80 %, Chance 5 % je Sekunde | Laune | 3 |
| Ozzy | Laune Flitzen: Sobald hat sich nass geschüttelt, Chance 50 % (Energie) | Laune | 3 |
| Ozzy | Sobald Spieler tippt Ozzy, falls Laune Angst oder Sturkopf → Laune endet, Gesicht getröstet | Spieler | 2, 3 |
| Duftstelle (2) | Laune Schnüffeln | Laune | 1 |
| Schmetterling, Ball | Laune Jagen (Ball: sobald er schneller als 1 L/s rollt, Abstand unter 5 L) | Laune | 2 |
| Wurst | Laune Gier · Sobald Ozzy berührt Wurst → Schnappen, Zähler Wurst +1, Wurst verbergen | Laune · Grund | 2 |
| Katze | Sobald wacht auf → Buckel und Fauchen, dann Wegspringen · Laune Angst für Ozzy | Grund · Laune | 2 |
| Pfütze (2) | Laune Sturkopf: Sobald Wasser unter 2 L voraus, falls Gangart höchstens Trab · Sobald Ozzy betritt → Spritzer, Platsch | Laune · Grund | 3 |
| Graben, Stamm, Pfütze, Katze | Sobald Fehlversuch hier → Zähler +1 · Sobald Zähler hier = 3 → Hilfe (Brett, Zögern, Trittstein, tiefer Schlaf) | Regie | 1 bis 3 |
| Rahmen | Sobald Finger fasst den Hügel zum ersten Mal an → Ozzy · Aufwachen; Musik · Stück der Runde | Regie | alle |
| Rahmen | Sobald Ozzy fällt über den Rand → Rahmen · Abgang | Regie | alle |
| Rahmen | Sobald Ozzy betritt Körbchen nach mindestens 300° → Rahmen · Ankunft (Einkringeln, Aufzug, Schlussakkord, Rückblick, Tagebuch) | Regie | alle |
| Rahmen | Sobald Uhr · Runde vorbei → Laune Müde ohne Würfel; Ende nach dem Einschlafen | Regie | alle |
| Rahmen | Sobald Abendrunde beginnt → Regen 6 s; Nässe von 0 auf 1 in 5 s | Regie | 3 |
| Kamera | Solange Ozzy galoppiert → weit · Solange Ozzy unter dem Rand → folgen | Grund · Körper | alle |
| Musik | Solange Kipp-Reserve unter 0,2 → Spannungsschicht · Solange Tageszeit über 80 % → Stück Abend | Grund | alle |

Rund 35 Karten für den ganzen Tag. Gehen, Gleichgewicht, Stolpern, Fallen und Aufstehen kommen aus dem Baustein, nicht aus Karten.

### 8.7 Aufgaben (Sätze über Zähler, jede mit Beweis-Lauf, 14b §7.11)

Morgen: eine Runde ohne Plumps · an beiden Duftstellen schnüffeln lassen · den Stamm überspringen, ohne ihn zu berühren.
Mittag: die Katze überspringen, während sie schläft · den Schmetterling im Sprung erwischen · die Wurst schnappen.
Abend: auf dem Hintern in die Pfütze rutschen · Ozzy schlafend oben halten, bis er aufwacht · vor Sonnenuntergang im Körbchen.

### 8.8 Fehlersuche und Grenzen

Leuchten an jeder Karte, Gedankenblase über Ozzy nur im Editor, der Werteverlauf als viertes Gesicht der Leiste, „Warum?“ und
„Warum nicht?“ an jeder Änderung, Anhalten an einer Karte, Einzeltakt, Spulen (14b §7.13). Der Prüfer meldet beim Bearbeiten
Kreise, Sobald-Karten mit Dauerwirkung, Launen ohne Ankündigung, Aufgaben ohne Beweis und Klänge ohne sichtbares Geschwister.
**Bewusst nicht:** Variablen, Formeln, Schleifen, freie Graphen, Skripte. Ehrlich: Hier endet „unendlich erweiterbar“ für
Florian allein. Neue Inhalte baut er selbst; eine neue Art Verhalten (etwa ein Vogel, der auf Ozzy landet) braucht einen neuen
Baustein in Code.

## 9 Bedienung

- **Grammatik** (12 §6.2): Tippen wählt, Ziehen ändert an der aktiven Stelle, Halten zeigt mehr, Doppeltippen geht hinein, Esc
  oder Tippen ins Leere geht hinaus. Jede Funktion muss in die Tabelle der Dinge und Griffe passen (12 §6.3), sonst wird sie umgebaut.
- **Aktive Stelle statt Modi:** Grundform, Pose, Stelle auf einem Regler oder in einem Übergang. Zwei Signale (Tropfen in der
  Leiste, Randfarbe der Bühne mit „ändert: Pose Nasen-Pflug · Kopf 37°“), der Geltungs-Chip „nur hier · in allen Posen · in der
  Grundform“ und die Karte „Probe“, die nie speichert. So arbeitet Florian schon im Werkzeug der Kopfdrehung (Gesamtbericht 4.2).
- **Schlüsselpunkt** mit drei Zuständen (grau, Ring, gefüllt) an jeder Eigenschaft, an Ankern und auf der Leiste.
- **Vier Linsen** (Form, Knochen, Physik, Spiel): Tippen wechselt, Halten schaut kurz hin. Eine Geste bedeutet überall dasselbe.
- **Bildschirm, Mac und iPad quer:** oben Ort, Linsen, ▶; links V, A, P, L, ⇧C (Linse Knochen: B, W); Mitte die Bühne, mindestens
  drei Viertel; rechts das Feld des Gewählten, fest und einklappbar, „Mehr“ als zweite und letzte Ebene; unten die Posenkarten mit
  Brücken und die Leiste in ihren vier Gesichtern. **iPhone:** Bühne und Leiste; spielen, ansehen, Stellen markieren, grob ziehen.
- **iPad mit Stift:** Der Stift formt, der Finger bewegt die Ansicht und bedient Leisten; ein zweiter Finger rastet ein; ein
  Modify-Knopf ersetzt ⌥ (Gesamtbericht 4.6 Punkt 25).
- **Spielen auf derselben Bühne:** Im Spiel gehört jede Berührung dem Spiel, wie später auf dem iPhone. Leertaste, ▶ oder der Stift
  halten an; geformt wird an der Stelle, an der angehalten wurde (Gesamtbericht 4.6 Punkt 26).
- **Die Strecke** (Linse Spiel) zeigt den Hügel abgewickelt unter der Bühne. Dinge darauf ziehen setzt sie auf den Hügel; die Farbe
  zeigt das Tempo, das jede Stelle verlangt, gerechnet aus dem Sprungfenster (13 §10.6).
- **Bedienprobe aus der Demo** (12 §9), ohne Erklärung: (1) beim Bergabgehen die Ohren anlegen, (2) die Pose „Nasen-Pflug“ anlegen
  und den Übergang aus „Schnüffeln“ nachformen, (3) den Schwanz nachschwingen lassen, (4) eine zweite Duftstelle mit Schnüffeln
  anlegen, (5) mit dem Prüfer die Stelle finden, an der die Nase beim Kopfdrehen rutscht. Kriterium: vier von fünf ohne Hilfe und
  kein unbemerkter Patzer an der aktiven Stelle; sonst folgt die Gegenprobe mit zwei Modi.

## 10 Technik

- **Pakete:** `@ee/studio-format` (Typen, zod, Migrationen, deterministischer Schreiber), `@ee/studio-laufzeit` (Regler, Morph,
  Knochen, Posen, Übergänge, Logik, Takt; ohne DOM und ohne Uhr), `@ee/studio-welt` (Schnittstelle `welt` mit rund 25 Funktionen,
  Box2D-Adapter, XPBD-Schicht), `@ee/studio-bild` (Renderer), `@ee/studio-ton`. Apps: `apps/studio` (Vite, Port 5217) und
  `apps/gassirunde`. Das alte `@ee/physics` bleibt unberührt.
- **Regel „Die Demo hat keinen Spielcode“** (eigene Regel, prüfbar gemacht): `apps/gassirunde` enthält nur Laden, Vollbild,
  Eingabe, Freigabe des Tons und die Hülle für Capacitor. Ein Test schlägt fehl, wenn dort mehr als 300 Zeilen stehen oder etwas
  anderes als die fünf Pakete eingebunden wird. Was die Demo braucht, muss als Baustein in die Laufzeit.
- **Datenmodell** (Auszug, Namen nicht endgültig):

```ts
interface Regler     { id: Kennung; name: string; bereich: [number, number]; rund: boolean;
                       mischart: 'rahmenRest' | 'jeKoordinate'; treiber: 'hand' | 'pose' | 'zeit' | 'weg' | 'draht' | 'physik' }
interface Schluessel { regler: Kennung; stelle: number; form: Kennung; versatz: AnkerVersatz[];
                       herkunft: 'vorlage' | 'gebaut' | 'seins' | 'falte' }
interface Abschnitt  { nach: Kennung; dauer: number | { bis: Ereignis; hoechstens: number };
                       kurve: 'weich' | 'fallen' | 'auf' | 'linear' | 'feder'; zusaetze: Zusatz[];
                       bleibt?: Kennung[]; marken: Marke[] }
interface Karte      { art: 'sobald' | 'solange' | 'laune'; ding: Kennung; band: Band; /* Felder je Art */ }
```

- **Wie in der Recherche** (Gesamtbericht 3.7, 3.8, 4.3): eigener Store mit Datensätzen und Kennungen (auch für Anker),
  Datensatz-Diffs, eine Geste ein Rückgängig-Schritt; JSON mit Versionen je Baustein und Migrationen nur vorwärts, gleiche Bytes
  bei gleichem Inhalt, nichts Abgeleitetes in der Datei; Takt 60 Hz mal vier mit Saat, Prüfsumme und Schlüsselständen; Budget
  Hauptthread 6 ms, Grafik 8 ms, GPU-Speicher 150 MB; heiße Flächen (Bühne, Leiste, Posenkarten) in eigenem Code, kühle mit
  React 19.3 und Zag; vitest, fast-check, Bildvergleich in Chromium und WebKit. Florians `schluessel.json` wird beim Import zu
  Schlüsseln mit Herkunft „seins“ und selbst nie verändert.
- **Rückblick ohne Nachrechnen:** Je Sturz werden die gezeigten Regler- und Knochenwerte gespeichert (rund 100 Zahlen je Takt,
  zehn Stürze zu 4 s rund 1 MB, eigene Schätzung) und als Daten abgespielt, unabhängig vom experimentellen Snapshot.
- **Die Beweis-Läufe der Aufgaben laufen als Tests mit.** Kein Test ersetzt Florians Auge.

## 11 Spielkonzept für Ozzy

### 11.1 Die Idee: ein Tag auf Ozzys Hügel

Jeden Tag dieselbe Gassirunde, jeden Tag ein anderes Drama. Ozzy steht oben auf seinem runden Hügel, den der Bildrand unten
abschneidet. Der Spieler dreht den Hügel und bringt Ozzy einmal herum, vom Körbchen zum Körbchen, bevor die Sonne ihr Stück Himmel
durchlaufen hat. Drei Runden: Morgen, Mittag, Abend.

| | Drei Welten (Recherche: Garten, Park, Winter) | **Ein Tag auf dem Hügel** (dieser Entwurf) | Zirkus (13, Richtung B) |
|---|---|---|---|
| Nähe zu Florians Idee | sehr hoch | sehr hoch | mittel |
| Witz | hoch | hoch; der vertraute Ort macht Pannen zu Running Gags (derselbe Stamm, dreimal anders) | sehr hoch |
| Abwechslung | hoch, drei Bilder | mittel: ein Ort, drei Lichter, Regen | mittel |
| Inhalt für Florian | drei Hügel, drei Dekore | ein Hügel, ein Dekor, Tageszeit als Regler | Publikum, Takt, Requisiten |
| Zeigt Studio | alles; Welten sind Inhalt | alles, dazu „Regler treiben die Welt“ (Tageszeit, Nässe) | Posen, Licht |
| Neue Systeme | Eis, wachsender Schneeball | Wasserstand und Haftung aus einem Draht | Takt, Publikum |
| Gefahr | Umfang | Gleichförmigkeit | Geskriptetes |

**Entscheidung: ein Tag auf dem Hügel.** Halber Inhalt, dieselbe Lehre (jede Runde eine neue physikalische Idee), und die Fiktion
stimmt wörtlich. Ehrlich: Für eine Vorführung nach außen wirken drei Welten stärker. Weitere Tage (Winter mit Eis, Strand) sind
später reiner Inhalt ohne neue Funktion und damit die Probe auf „unendlich erweiterbar“.

### 11.2 Mechanik

- **Schwerkraft nach unten,** nur der Scheitel ist eben (13 §2.1). **Die Lage ist das Gaspedal:** Stehzone ±17° (Bremskraft
  0,3 g, Gras), Gangarten aus dem Draht in 6.4; der Bildrand liegt bei rund 28°, die gefährlichen Hänge sind also immer zu sehen.
- **Laufband:** Wer Ozzy voranbringen will, lässt ihn etwas kippen und zieht den Hügel nach; Ozzy tapst auf der Stelle, die Welt
  zieht vorbei. **Besen:** Außerhalb der Stehzone kippt es wie ein Besen, Kippzeit 0,84 s (13 §2.3).
- **Rückwirkung mittel:** Ozzys Schritte drehen den Hügel spürbar mit. Bleibt er schnüffelnd stehen, trägt ihn ein drehender
  Hügel aus der Stehzone.
- **Besonderes Balancieren ohne Sonderregel:** Buckel (zweiter Scheitel, Krümmungsradius 4 L, Kippzeit 0,45 s, eigene
  Schätzung), Graben (Schwung vorher), Matsch (Stehzone ±6°), Launen (Stopps und Tempowechsel).

### 11.3 Steuerung

Ein Finger, überall auf dem Bildschirm; über dem Finger sitzt eine Tropfenmarke am Rand. Halten bremst, Ziehen dreht über die
Feder, Loslassen gibt Schwung. Kein Knopf im Spiel, auch nicht zum Start. Querformat. Mac: Maus oder Trackpad, waagrechtes Wischen
mit zwei Fingern dreht (den Nachlauf von macOS abschalten, 13 §4.3). Einstellungen: zwei Daumen, Spieltempo 80 %, Zen-Runde;
Neigen nur als Probe. Antippen von Ozzy tröstet bei Angst und Sturkopf (Florian entscheidet, ob es bleibt).

### 11.4 Der Hügel und die drei Runden

Radius 14 L, Rundenlänge 88 L (1 L sind rund 4°), Uhr 120 s je Runde, Stern unter 90 s (eigene Schätzung). Lage auf dem Rund,
0° ist das Körbchen:

| Lage | Morgen (Tau) | Mittag (Sonne) | Abend (nach dem Regen) |
|---|---|---|---|
| 0° | Körbchen, Start und Ziel | Körbchen | Körbchen |
| 0° bis 25° | frei zum Lernen | Ball bei 20° | Pfütze 1 in der Mulde bei 30° |
| 45° bis 110° | Duftstelle 1 (45°), Stamm (70°), zwei Steinchen | Schmetterling (40° bis 70°), Stamm, Wurst (110°) | Matsch (80° bis 110°), Stamm nass oben |
| 140° | Buckel, 0,5 L hoch | Katze schläft auf dem Buckel | Buckel |
| 190° bis 240° | Duftstelle 2, Graben unter einem Brett | Wippe (190°), Graben offen (1 L breit, 0,5 L tief) | Pfütze 2 (200°), Graben mit Matsch |
| 300° bis 360° | Steinchen, Heimweg | Heimweg | Heimweg, Ozzy wird müde |

Neue Idee je Runde: Morgen „Lage ist Tempo“ und Halten; Mittag Erhöhungen, Ketten und Launen; Abend wenig Haftung und Müdigkeit.
Das Brett über dem Graben nimmt mittags „jemand“ mit; nach drei Fehlversuchen liegt es wieder da (die Hilfe ist ein Ding).

### 11.5 Die Dinge

Das Tempofenster entsteht aus Sprunghöhe und Schrittlänge (6.4), nicht aus einer Regel je Ding.

| Ding | verlangt | zu langsam | zu schnell | Witz |
|---|---|---|---|---|
| Steinchen, 0,15 L | Schritt | – | Stolperstein, Fangschritte | große Fangschritte, Ohren flattern |
| Stamm, 0,4 × 0,6 L | Trab | verweigert, beschnüffelt ihn | springt zu früh, streift | Bauchlandung auf dem Stamm, rutscht ab |
| Buckel | Gipfel oben halten | rutscht zurück | fliegt über den Gipfel | Gipfel-Wackeln, Schwanz rudert |
| Graben, 1 L | Trab bis Galopp kurz davor | Kanten-Wackeln | harte Landung | fällt hinein, hüpft heraus, Erdkrümel fallen von der Nase |
| Ball | – | – | – | rollt den Hang hinab, Ozzy jagt ihn |
| Wippe | in der Mitte warten, bis sie kippt | – | Brett schlägt hoch | Katapult auf echter Bahn |
| Katze | leise vorbei, Schritt | – | sie wacht auf, faucht | Flucht rückwärts, Kehrtwende |
| Schmetterling | darunter halten | – | – | Hochsprung, verfehlt, Rückenlage mit Strampeln |
| Wurst | Tempo drosseln | – | Gier | Bauchrutscher auf die Wurst zu |
| Pfütze | Sprung im Trab oder Sturkopf lösen | Sturkopf, Popo-Rutschen | platscht hinein | Schütteln, Tropfen auf der Kamera |
| Matsch | Schritt, kaum Lage | – | rutscht in den Spagat | Schlitterpartie mit ernster Miene |
| Körbchen | ankommen | – | läuft vorbei | Einkringeln, Plumps, Seufzer |

### 11.6 Launen

Nie zwei zugleich, Launenpause 4 s, Beginn nur mit 1,5 s Vorlauf vor dem nächsten Ding, Häufigkeit über die Charakter-Regler
(14b §7.8). Jede Laune ändert nur Sollwerte und Posen, nie die Physik (13 §6.1).

| Laune | angeboten von | Ankündigung, etwa 1 s | Wirkung | Dauer · Ruhezeit | wenn es schiefgeht |
|---|---|---|---|---|---|
| Schnüffeln | Duftstelle | Nase sinkt, Schwanz langsamer | Wunschtempo 0, Bremskraft hoch | 2 bis 4 s · 10 s | Nasen-Pflug |
| Sturkopf | Pfütze; drei Plumpse in 30 s | Ohren zurück, Blick weg, setzt sich langsam | Sitzen, Bremskraft am höchsten | 3 bis 6 s · 15 s | Popo-Rutschen |
| Jagen | Schmetterling, Ball | Kopf schief, Ohren hoch, Kopf folgt dem Ziel | Wunschtempo zum Ziel, Sprung nach oben | 2 bis 4 s · 12 s | Jagdsprung verfehlt, Rückenlage |
| Angst (Soll) | Katze | Buckel der Katze, dann Ducken, Schwanz eingezogen | rückwärts, Kehrtwende, weg | 2 bis 3 s · 20 s | Schrecksprung, Flucht über den Rand |
| Gier (Soll) | Wurst | schnuppert in die Luft | Wunschtempo hoch, übersieht Steinchen | bis zur Wurst · 30 s | Bauchrutscher |
| Flitzen | Ozzy, nass geschüttelt | Spielverbeugung, Hinterteil wackelt | Galopp, eine Kehrtwende, abrupt Hinplumpsen | 3 s · 30 s | rennt über den Rand |
| Müde | Ozzy, Tageszeit über 80 % | gähnt mit Kopf, Ohren, Brauen und Ton; Gang wird langsam | legt sich hin, schläft, liegend rund | 4 bis 8 s · 15 s | Schlafwalze |

### 11.7 Komik-Momente mit Ablauf

Jeder folgt „Ahnung, Pause, Folge“, Ozzy meint es ernst und wird blamiert, nie verletzt (13 §5.4). Zeiten sind Startwerte.

1. **Nasen-Pflug** (Morgen): Ozzy schnüffelt, der Spieler dreht weiter. 0 s Nase am Boden, der Hügel schiebt ihn, Hinterteil hoch ·
   0,5 s Furche im Gras (Teilchen) · 1,5 s Niesen, er sitzt plötzlich auf dem Hintern · 2,2 s Blick zum Finger, Brauen beleidigt ·
   er geht weiter, als wäre nichts gewesen.
2. **Popo-Rutschen** (Abend): Sturkopf vor der Pfütze, der Hang wird steiler. Ozzy sitzt aufrecht mit unbewegter Miene, das Becken
   rutscht (wenig Reibung, Physik); die Kamera bleibt ruhig · Platsch, er sitzt im Wasser · 0,8 s Pause · Blick in die Kamera ·
   Aufstehen, Schütteln, Tropfen auf der Kamera · Spielverbeugung: Flitzen kündigt sich an.
3. **Schlafwalze** (Abend): Er gähnt und legt sich hin. Hält der Spieler nicht genau oben, rollt der runde, schlafende Ozzy bergab;
   das Schnarchen läuft weiter, die Ohren schlackern · am Rand der Abgang (Nr. 5); er fliegt schlafend zurück, erst das Andenken
   weckt ihn.
4. **Katzenflucht** (Mittag): zu schnell am Buckel · Ohr der Katze zuckt 0,2 s · Buckel 0,4 s · Fauchen · Ozzy duckt sich, läuft
   rückwärts, Kehrtwende, flitzt zurück; der Spieler muss ihn auf der anderen Seite fangen · die Katze springt über den Rand, man
   hört es scheppern.
5. **Abgang und Rückwurf:** Ozzy verschwindet unter dem Rand · 0,4 s Stille · 0,6 s Scheppern, Staubwolke über dem Rand, Stoß ·
   1,2 s „Hepp!“ · Ozzy fliegt auf echter Bahn herein; landet er schlecht, purzelt er · 0,5 s nach der Landung trifft ihn das
   Andenken am Kopf („Bonk“), springt ab und kullert davon · Blick in die Kamera. Kostet 5 bis 6 s.
6. **Übermut-Plumps** (Mittag, Abend): drei saubere Sprünge, er stolziert · der nächste Sprung gerät zu weit, hinter dem Stamm
   wartet die Pfütze · Spritzer · Blick in die Kamera.
7. **Wippen-Katapult** (Mittag): zu schnell auf das Brett · es schlägt hoch · echte Flugbahn · Landung, oft direkt vor der Katze.

### 11.8 Sturz und Aufstehen

Ein Sturz kostet 2 bis 4 s, ein Abgang 5 bis 6 s, nie ein Leben (13 §9.6). Ablauf: Stolpern (Fiep, Zeitlupe 0,3 s mal 0,4, Ohren
hoch) → Fangschritte → Fangen mit Wackeln oder Sturz (Plumps, Musik stockt) → Liegen → Aufstehen je Lage (Bauch 1,2 s, Seite
1,6 s, Rücken 2,0 s über die Seite) → Schütteln 0,6 s → Blick in die Kamera (60 %), Niesen (25 %) oder beleidigt weiter → der
erste Schritt fällt auf den Schlag, die Musik setzt ein. Jeder Sturz sieht anders aus, weil die Physik ihn rechnet (13 §5.4).
Sterne gibt es nur nach hartem Aufprall.

### 11.9 Lernkurve und Hilfen

- **Die ersten 10 s:** Ozzy schläft im Körbchen, die Tropfenmarke atmet am Rand, kein Text; Berühren weckt ihn.
- **Morgen:** die ersten 25° ohne Dinge, der erste Stolperer ist harmlos; man lernt Lage gleich Tempo, Halten, Trab vor dem Stamm.
  **Mittag:** Erhöhung halten, Ketten (Ball), Launen lesen. **Abend:** wenig Haftung, Pfützen, genau oben halten.
- **Hilfe nach drei Fehlversuchen** am selben Ding, sichtbar und ignorierbar: Brett über dem Graben, Ozzy zögert vor dem Stamm,
  die Katze schläft tiefer, ein Trittstein in der Pfütze (13 §9.6).
- **Stimmung als stille Anpassung:** drei Plumpse in 30 s machen Ozzy vorsichtig (Tempo mal 0,8, Schwanz eingezogen); drei
  saubere Sprünge machen ihn übermütig (13 §6.4). Dazu Spieltempo 80 % und die Zen-Runde ohne Uhr.

### 11.10 Rahmen: Start, Uhr, Ziel, Rückblick

- **Start:** Morgendämmerung, Ozzy schläft eingerollt im Körbchen. Der Zettel mit den drei Aufgaben (Lobster) liegt 1,5 s im Bild.
  Berühren → Aufwachen: Ohr zuckt, Kopf hoch, Gähnen, Strecken, Aufstehen, Schütteln, Blick zum Finger.
- **Uhr:** Die Sonne wandert ihr Drittel des Himmels, ohne Zahl. Ist es vorbei, wird Ozzy müde und schläft, wo er ist; das
  Tagebuch zeigt, wie weit er kam. Kein Spielende. Erfüllte Aufgaben fliegen als kleiner Tropfen in die Ecke.
- **Ziel:** nach mindestens 300° zurück im Körbchen: Einkringeln (Körperansicht ψ einmal herum), Plumps, Seufzer; die Kamera zieht
  auf, der ganze Hügel im Licht der Tageszeit, Schlussakkord.
- **Rückblick:** alle Stürze der Runde gleichzeitig, höchstens sechs, als Geister auf dem ganzen Hügel; jeder Plumps ein Ton einer
  aufsteigenden Tonleiter (14d §3.6). Scheitern wird zum Vergnügen (Super Meat Boy, 13 §3.6).
- **Tagebuch:** eine Seite je Runde mit Überschrift in Lobster, gezeichneten Zeichen für Plumpse, Andenken und Sterne; nach dem
  Abend die Doppelseite des Tages. **Andenken** (Blumentopf, Socke, Gießkanne, Gartenhandschuh) fallen beim Rückwurf hinterher
  und sammeln sich in einer Kiste. Sie liegen nie auf Ozzy; sein Bild bleibt das Logo.

### 11.11 Ton

Kontakte (Chips an Fühlern): Tapp je Pfote nach Material (Gras, Holz, Matsch, Wasser), Plumps in drei Stärken, Ball, Brett.
Marken in Übergängen: Fiep, Gähnen, Niesen, Seufzer, Schütteln, Hepp, Bonk. Solange an Posen: Schnarchen, Schnüffeln,
Katzenschnurren. Regler: Rumpeln aus dem Drehtempo. Musik: ein Stück je Runde; Schichten nach Gangart, über einen Schlag
eingeblendet; Spannungsschicht bei knapper Kipp-Reserve; Stille beim Stehen; Bandstopp in 0,25 s beim Plumps, danach 0,6 bis
1 s Stille; Wiedereinsatz auf den ersten Schritt; Schlussakkord (14d §3.6). Alles hinter dem Rand im Dreiklang aus Klang,
Rand-Bild und Stoß; die Stumm-Probe verlangt, dass jede Pointe ohne Ton ankommt (14d §3.7).

### 11.12 Vollständige Listen

**Posen.** Ozzy, Schicht Körper:

| Gruppe | Posen | Stand |
|---|---|---|
| Grund | Stehen, Hocke, Sitzen, Liegen, Diener | vorhanden |
| Schlaf, Gang | eingerollt; Gangfeld Schritt, Trab, Galopp mit je vier Kontaktposen; Bremsen; Kante | neu |
| Balance | Feld Kippen vor und zurück mal Wackeln, fünf Schlüssel | neu |
| Sprung | Ausholen, Strecken, Flug, Landung; Jagdsprung; Schrecksprung | neu |
| Laune | Schnüffeln, Nasen-Pflug, Ducken, Schnappen (Spielverbeugung ist der Diener mit Wackeln) | neu |
| Panne, Erholung | Stolpern 1 bis 3, Purzeln, Seitenlage, Rückenlage, Bauchrutscher, Spagat; Zwischenposen des Aufstehens | neu |

Regler mit Schlüsseln: Kopfwinkel 0° bis 360° (vorhanden), Nicken ±20°, Kopf schief ±15°, Ohren (hoch, zurück, angelegt),
Brauenbogen der Maske (neugierig, besorgt, beleidigt, müde), Bart, Schwanz (hoch, waagrecht, eingezogen), Stauchung. Gähnen und
Bellen bräuchten ein Maul, das das Logo nicht hat; bis Florian eins zeichnet, gähnt Ozzy mit Kopf, Ohren, Brauen und Ton.
Katze: schlafend eingerollt, Ohr zuckt, Buckel, Fauchen, Absprung, Flug. Schmetterling: Flügel auf, zu. Kamera: nah, weit, folgen,
Aufzug, Rückblick. Himmel: Morgen, Mittag, Abend, Nacht. Rahmen: Spiel, Abgang, Ankunft, Rückblick, Tagebuch.

**Gestaltete Übergänge** (alle übrigen Paare nehmen den Standardübergang):

| Übergang | Abschnitte (Startwerte in s) | Besonderes |
|---|---|---|
| die acht Abläufe des Prototyps | wie in `ablauf.ts` | übernommen |
| Aufwachen, Körbchen → Stehen | Ohr 0,3 · Kopf 0,4 · Strecken 0,8 · Aufstehen 0,6 · Schütteln 0,6 | Marke Gähnen |
| Einkringeln, Stehen → Körbchen | Drehen 1,0 · Plumps 0,4 · Seufzer | |
| Sprung, Jagdsprung, Schrecksprung | Ausholen 0,15 · Strecken 0,1 · Flug **bis Landung** (höchstens 1,5) · Landung 0,25 | Plumps nach Stärke |
| Stolpern | drei Zwischenposen in 0,5, Unterbrechen „nie“ bis zur Entscheidung | Marke Fiep bei 30 % |
| Fangen; Sturz | Wackeln 0,4; Spannung 100 → 30 % in 0,1, Purzeln **bis Ruhe** | Übergabe an die Physik |
| Aufstehen aus Bauch, Seite, Rücken | 1,2; Abrollen 0,4 + 1,2; Strampeln 0,5, dann „über Seite“ | Wegsuche |
| Schütteln; Blick in die Kamera | vier Umläufe in 0,6; Kopf auf 0° in 0,25, halten 0,8, zurück 0,3 | Schicht Kopf |
| Kehrtwende | Körperansicht ψ über die Front, 0,5 | |
| Flitzen und Hinplumpsen | Wackeln 0,6, Start 0,2; Galopp → Liegen 0,5 | |
| Schnüffeln, Nasen-Pflug, Ducken, Kante | je 0,3 bis 0,4 | |
| Bauchrutscher | 0,3, dann **bis Stillstand** | |
| Schnappen | 0,2, Kauen 1,5 | Marke Schmatz |
| Katze: Buckel und Fauchen, Wegspringen | 0,2 · 0,4 · 0,5; Flug bis über den Rand | |

**Zyklen:** Gangfeld (vom Weg), Atmen 0,3 Hz, Schlafatmen 0,2 Hz, Wedeln 3 Hz (Stärke aus der Stimmung), Schütteln 4,5 Hz,
Strampeln 3 Hz, Schnüffeln 6 Hz (klein), Kauen 3 Hz, Hinterteil wackeln 2,5 Hz, Flügelschlag 8 Hz, Schlafatmen der Katze 0,25 Hz.
**Physik-Chips:** 6.6. **Effekte:** 7. **Karten und Aufgaben:** 8.6 und 8.7.

### 11.13 Was der Editor daraus können muss

Der kleinste vollständige Editor ist die Summe dieser Zeilen; jede Funktion entsteht mit dem Moment, der sie braucht.

| Funktion | gebraucht für | Etappe |
|---|---|---|
| Formen wie Illustrator, Anker formtreu einfügen, Import seiner SVGs und Schlüssel, Regler, Leiste, Zwiebelhaut, Mischarten | jede Pose | E1 |
| starre Teile, Biegeachsen, Handrig übernommen; Chips Schwingen, Kette, Stauchen, Ruhig halten; Rad, Vierbeiner, Prüfstand | Ozzy steht auf dem Hügel | E2 |
| Posen, Standardübergang, Taktleiste mit Ereignis-Abschnitten, Tafel; Karten, Launen, Bänder, Leuchten; Zone, Zähler, Uhr, Rahmen, Strecke | Morgenrunde | E3 |
| Ragdoll mit Spannungskurve, Aufstehen je Lage, Wurf, Rückblick | Pannen | E4 |
| Autorig, Gewichte mit Drehzentren, Korrekturformen; Gelenk, Lose, Schläfer, Flieger; Werteverlauf, „Warum?“, Spulen | Mittagsrunde | E5 |
| Wasser, Teilchen, Material, Drähte der Nässe; Aufgaben mit Beweis-Lauf; Tagebuch | Abendrunde | E6 |
| Klang-Chips, Musik als Ding, Haptik | der ganze Tag | E7 |

**Was wartet,** weil kein Moment der Demo es braucht: Mehrspur-Zeitleiste, Gelee, Mischart „biegen“ (ARAP), Kurven-Ausgleich nach
Liu, Bounded Biharmonic Weights, „Pose zeichnen, Studio zerlegt“, Kachel-Durchgang, WebGPU, Vektor-Export, Vorlagen Zweibeiner und
Vogel, Arbeiten auf mehreren Geräten, Pencil-Erweiterung, eine zweite Figur mit eigenem Gleichgewicht.

## 12 Umsetzung

### 12.1 Etappen, jede mit einem Moment der Demo als Probe

„Bestanden“ sagt nur Florian. Aufwand in Arbeitstagen, eigene grobe Schätzung auf Grundlage von Gesamtbericht 4.7.

| Etappe | Inhalt | Probe (vorher festgelegt) | Tage |
|---|---|---|---|
| E0 Messen | Messseite `tempo.html` (14c §7), Probe P1 „Rad mit Gewicht“ (14a §7) | Ampeln auf seinen drei Geräten, dazu ein Block mit sechs Ozzys; K1 bis K9; Aufnahme vom iPhone | 7 bis 10 |
| E1 Gerüst, Formkern | Format, Store, Leiste, Import seiner SVGs und Schlüssel, Rahmen + Rest | seine Kopfdrehung in Studio bildgleich zum Prototyp; Ohr bei 120° und Stirnfranse heute gegen Rahmen + Rest nebeneinander; 100 Züge, ein ⌘Z; zweimal speichern, gleiche Bytes | 10 bis 15 |
| E2 Ozzy steht auf dem Hügel | Spielwiese, Rad, Vierbeiner bis zum Stolpern, Chips, Renderer Stufe 1, Takt | 60 s auf dem iPhone: oben halten, Schritt, Trab, Galopp, Stolpern; Ohren stehen nach dem Schubsen exakt wie gezeichnet; gleiche Prüfsumme nach 600 Takten | 25 bis 35 |
| E3 Morgenrunde | Posen, Übergänge, Sprung, Karten, Schnüffeln, Rahmen, Strecke; Bedienprobe Aufgaben 1 bis 3 | Nicole schafft die Runde ohne Erklärung; Florian baut eine Duftstelle ohne Hilfe; „Hinsetzen mit Hüpfer“: der Plumps sitzt im Bild des Bodenkontakts | 20 bis 30 |
| E4 Pannen | Ragdoll, Aufstehen je Lage, Schütteln, Blick, Abgang und Rückwurf, Rückblick | drei Stürze, drei Bilder, jedes Aufstehen ohne Sprung in der Form; Rückblick im Budget | 10 bis 15 |
| E5 Mittagsrunde | Autorig, Katze, Gewichte, Wippe, Ball, Graben, Schmetterling, Jagen, Angst, Werteverlauf, „Warum?“; volle Bedienprobe | Autorig trifft Ozzys Handdaten und riggt die Katze mit höchstens drei Ringzügen; ein falsch sortiertes Kartenpaar findet Florian mit „Warum?“ in unter zwei Minuten | 25 bis 40 |
| E6 Abendrunde | Regen, Nässe, Pfützen, Matsch, Müde, Flitzen, Aufgaben mit Beweis, Tagebuch | Vorher-Nachher-Bilder der Effekte in derselben Ansicht; nach einer Änderung am Sprung meldet Studio, welche Beweise noch gelten | 15 bis 25 |
| E7 Ton, Feinschliff | Klang-Chips, Musik, Haptik in der App-Hülle | Florian spielt den ganzen Tag auf dem iPhone 16; Stumm-Probe ohne verlorene Pointe | 12 bis 20 |

Summe 124 bis 190 Tage, also grob 6 bis 9 Monate; bis zur Morgenrunde (E0 bis E3) 62 bis 90 Tage. Die Unsicherheit ist groß; der
Engpass sind Florians Prüfrunden, nicht die Zeilen Code. Nach E1 wird mit der gemessenen Bauzeit neu geschätzt.

### 12.2 Parallel bauen

In E1 werden zuerst die Schnittstellen festgeschrieben: Typen in `studio-format`, die Schnittstelle `welt`, die Laufzeitfunktion
„Regler → Formen“ und der Eingang des Renderers (Anker je Fläche). Danach sind sechs Spuren getrennt baubar: Oberfläche und Store,
Form und Knochen, Welt und Vierbeiner, Bild, Logik und Takt, Ton (ab E5). Jede Spur arbeitet in eigenem Arbeitsbaum und Zweig, mit
Vertragstests gegen die Schnittstellen; zusammengeführt wird nur nach grüner Probe. Nach Arbeitsregel 2 laufen mehrere Agenten
erst nach Florians Ja, höchstens zwei bis drei zugleich (in E2 Welt und Bild, in E3 Logik und Oberfläche). Seine Fenster bleiben
unberührt; Studio läuft für ihn aus einem festen Stand auf Port 5217.

### 12.3 Risiken und Abbruchregeln

| Risiko | Gegenmittel | Abbruchregel |
|---|---|---|
| Umfang wächst | nur, was 11.13 nennt | hält eine Probe nach dem 1,5-fachen Aufwand nicht: anhalten und berichten |
| Tempo auf dem iPhone | E0 zuerst, Kostenampel im Editor | Grafik über 8 ms trotz der vier Maßnahmen aus 14c: Kachel-Durchgang vorziehen, Rückblick auf drei Geister |
| Kette auf dem drehenden Hügel | P1, Kriterien K5 und K6 | scheitern sie: Weg B′, dann Rapier (14a §5) |
| aktive Stelle trägt nicht | Bedienprobe in E3 | ein unbemerkter Patzer: Gegenprobe mit zwei Modi |
| Spiel zu schwer | großer Radius, Hilfen, Nicole früh | schafft sie die Morgenrunde nicht in drei Versuchen: Bremskraft 0,35 g, Radius 16 L |
| ein Hügel zu eintönig | jede Runde eine neue Idee | will Nicole nach dem Mittag nicht weiter: zweiter Hügel als Inhalt |
| neue Mischart verändert seine Formen | nie still wechseln, Vergleichsbild | – |

## 13 Abweichungen von der Recherche

| Punkt | Recherche sagt | ich sage | warum | ehrliche Gegenrede |
|---|---|---|---|---|
| Aufbau der Demo | drei Welten: Garten, Park, Winter (Gesamtbericht 5.3) | ein Hügel, ein Tag, drei Runden | halber Inhalt, Fiktion wörtlich, Tageszeit zeigt Drähte | drei Welten zeigen mehr Look; die LocoRoco-Kritik trifft einen Ort stärker |
| Winter | Eis, wachsender Schneeball, Schneemann | Matsch und Pfützen nach dem Regen | dieselbe Lehre (Haftung sinkt), kein wachsender Körper | Eis ist das klarere Bild; der Schneeball zeigte Formwachstum |
| Rückkehr vom Rand | „kommt mit Andenken zurück“ (13 §5.4) | Rückwurf auf echter Bahn, Andenken fällt hinterher | bleibt Physik, der Spieler fängt die Landung, zweite Pointe | ein geworfener Hund kann grob wirken; Florian entscheidet am Bild |
| Katze | „Soll“, als Vierbeiner (13 §10.11) | „Muss“ mittags, als Schläfer ohne Gleichgewicht | Prüfstein des Autorigs, klein gehalten | zeigt den Vierbeiner nicht an einer zweiten Figur |
| Abschnitte | Dauer in Sekunden (05 §5.5) | auch „bis Ereignis“ mit Höchstdauer | Flug, Rutschen, Liegen dauern so lange, wie die Physik sagt | schwerer zu lesen; die Leiste zeigt sie gestrichelt |
| Kamera, Musik, Himmel | Wünsche als Karten mit eigener Überblendliste (14b §7.12) | Dinge mit Posen und Übergängen | eine Grammatik weniger | ihre Tafeln bleiben fast leer |
| Regie | nicht beschrieben | gestaltete Übergänge des Rahmens mit Marken | keine Mehrspur-Zeitleiste nötig | für lange Szenen zu eng |
| Text im Spiel | nur auf der Endkarte (13 §11) | auch der Aufgabenzettel, 1,5 s | Aufgaben sind sonst schwer zu erraten | bricht die Sprachfreiheit |
| Gesicht | neue Formen für Maul hechelnd, gähnend, bellend (13 §10.1) | kein Maul ohne Florians Zeichnung | Logo-Regel | Gähnen ohne Maul ist schwächer |
| Rückblick | Aufnahme und Nachrechnen (13 §10.4, 14a §3e) | gezeigte Werte als Daten, höchstens sechs Geister | billig, unabhängig vom experimentellen Snapshot | keine neue Kamera im Rückblick möglich |
| kein Spielcode | Grundsatz (13 §10) | Test: Spiel-App höchstens 300 Zeilen, nur die fünf Pakete | macht die Regel prüfbar | eine feste Zahl lädt zu Umwegen ein |
| Stimmung | stille Anpassung (13 §6.4) | Solange-Karte über einem gleitenden Zähler | sichtbar und änderbar | lädt zum Überdrehen ein |

## 14 Unsicherheiten und was sie klärt

| Unsicherheit | was sie klärt |
|---|---|
| Fühlt sich das Balancieren gut an (Kippzeit 0,84 s, Stehzone ±17°, Radgewicht mittel)? | P1 und E2 auf dem iPhone, dann Nicole |
| Trägt ein Hügel drei Runden? | Nicole nach der Mittagsrunde |
| Ist der Rückwurf komisch oder grob? | Florians Blick auf die Aufnahme in E4 |
| Liest man Abschnitte „bis Ereignis“? | Bedienprobe in E3 |
| Passen sechs Geister ins Budget? | Block der Messseite in E0 |
| Hält die Kette auf dem drehenden Hügel? | P1, K5 und K6 |
| Trägt die aktive Stelle ohne Modi? | Bedienproben in E3 und E5 |
| Findet der Autorig die Katze? | E5 |
| Stimmt die Umrechnung Dauer und Federung in Frequenz und Dämpfung? | E2, Ohren nebeneinander |
| Gähnen ohne Maul; Text auf dem Zettel; Streicheln | Florians Wort |
| Aufwand | gemessene Bauzeit von E0 und E1, danach neu schätzen |
