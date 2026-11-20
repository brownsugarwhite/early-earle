# Spieldesign: Ozzy auf dem Rad

Recherche vom 20.11.2026 · Thema 13 der Editor-Recherche („Studio“) · Grundlage: Florians Idee vom 20.11., die Berichte 05
(Posen, Übergänge, Zeit) und 08 (Figurenphysik) dieses Ordners, Spiele und Aussagen ihrer Entwickler, Richtlinien und Studien zur
Bedienung auf dem iPhone, Theorien des Humors (Quellen in Abschnitt 13).

Hinweis zur Quellenlage: Die Websuche war für alle Recherchen dieses Tages auf ein gemeinsames Kontingent begrenzt, das zu Beginn
dieser Arbeit schon aufgebraucht war. Ich habe deshalb nur bekannte Seiten direkt abgerufen (vor allem Wikipedia mit den dort
belegten Kritiken und Entwickleraussagen, Hersteller-Dokumentation von Apple, MDN und Capacitor, einen Fachartikel, eine Studie).
Stimmen von Spielern und Kritikern stammen daher überwiegend aus den in diesen Artikeln zitierten Rezensionen. Was nur aus eigener
Kenntnis stammt, ist mit „(eigene Kenntnis)“ markiert. Alle Zahlen zum Spiel sind Startwerte zum Prüfen, nicht gemessen. Weitere
Suchen (Entwicklervorträge, Foren) sind in einer Folgerunde möglich.

---

## Kurzfassung

1. **Die Wölbung ist ein Rad in Schwerkraft nach unten, kein kleiner Planet mit Anziehung zur Mitte.** Auf einem Planeten wie in
   Super Mario Galaxy ist jeder Punkt „oben“, es gibt keine Hänge. Florians Mechanik (oben stehen, seitlich bergab tapsen) entsteht
   nur, wenn die Schwerkraft nach unten zeigt. Das Bild der kleinen Welt mit rundem Horizont übernehmen wir, ihre Physik nicht.
2. **Ozzys Lage auf dem Rad ist das Gaspedal.** Ganz oben steht er, etwas daneben tapst er, weiter unten trabt und galoppiert er,
   noch weiter reicht seine Bremskraft nicht mehr und er stolpert. Der Spieler steuert also nicht Ozzy, sondern wo auf der
   Krümmung er steht. Das ist sichtbar, physikalisch richtig und erklärt sich ohne Text.
3. **Spielerisch ist das Besen-Balancieren mit einem Hund** (ein umgekehrtes Pendel der Länge R). Jeder kennt das Gefühl. Die
   Schwierigkeit hängt an drei Reglern der Welt: Radius (große Räder kippen langsam), Schwerkraft und Haftung. Startwert für die
   Kippzeit: 0,7 bis 0,9 Sekunden.
4. **Die besten Vorbilder bewegen die Welt statt der Figur** (LocoRoco, Super Monkey Ball, Kirby Tilt 'n' Tumble, Rolando, And Yet
   It Moves) und lassen Hänge den Schwung machen (Tiny Wings). Gemeinsamer Erfolg: ein Verb, sofort verständlich. Gemeinsame
   Gefahren: Wiederholung (Hauptkritik an LocoRoco) und Härte (TumbleSeed verkaufte sich laut seinem Designer auch wegen des Rufs
   der Schwierigkeit schlecht).
5. **Komik aus Physik trägt, wenn das Missgeschick harmlos bleibt und die Figur es ernst meint** (Theorie der harmlosen Verletzung;
   Chuck Jones' Regeln für den Kojoten; Fall Guys: ohne das Ragdoll-Verhalten geht die Komik verloren). Bahnen, Kontakte und
   Schwung bleiben echt, Cartoon gibt es nur in der Zeit (kurze Zeitlupe), in den Posen und hinter dem Bildrand.
6. **Ozzys eigener Kopf wird eine Mechanik aus Launen** (Schnüffeln, Sturkopf, Flitzen, Jagen, Müde, Angst, Kratzen, Übermut,
   Gier). Eine Laune ändert nur Sollwerte, nie die Physik, und kündigt sich immer etwa eine Sekunde vorher am Körper an. The Last
   Guardian zeigt die Gefahr: Eigenwille ohne Ankündigung fühlt sich wie eine träge Steuerung an.
7. **Steuerung: ein Finger, drei Gesten derselben Physik.** Halten (das Rad steht wie Boden), Ziehen (das Rad folgt dem Finger über
   eine Feder mit Kraftgrenze), Loslassen (das Rad läuft mit Schwung weiter). Anfassen überall auf dem Bildschirm, weil unten der
   Home-Balken liegt. Neigen nur als Zusatzmodus (im Browser Erlaubnis nötig, ungenau, im Liegen unpraktisch), zwei Daumen als
   Hilfsmodus. Kein Knopf im Spiel.
8. **Fünf Richtungen:** A „Gassirunde“ (eine Runde um eine kleine Welt vor Sonnenuntergang), B „Die Kugelnummer“ (Zirkus, Pannen
   bringen Lacher), C „Platsch!“ (Baumstamm-Duell gegen einen Biber), D „Ozzy will nicht“ (Rätsel mit Sturkopf und Ködern),
   E „Agility-Pokal“ (Hundesport-Parcours auf dem Rad).
9. **Empfehlung für die erste Demo: A „Gassirunde“**, ergänzt um den Pannen-Rückblick aus B und die klare Hindernis-Grammatik aus E.
   Drei kurze Welten (Garten, Park, Winter) zu je 60 bis 90 Sekunden und eine Spielwiese. Sie setzt Florians Idee am direktesten
   um, braucht keine zweite Figur mit eigenem Gleichgewicht, keinen Takt und keine Rätsellogik und zeigt trotzdem jede Fähigkeit
   des Editors.
10. **Jedes Hindernis verlangt genau ein Tempo:** Steinchen langsam (sonst Stolperstein), Stamm im Trab (Sprungfenster), Lücke
    schnell, Hügel mit Halten am Gipfel, Wippe mit Stopp in der Mitte. Ozzys Gangart zeigt sein Tempo, eine Anzeige ist unnötig.
    Das Fenster entsteht aus Ozzys Sprungkraft und Schrittlänge, nicht aus einer Regel je Hindernis.
11. **Scheitern beendet nie das Spiel.** Stolpern, Plumps, Aufstehen, Schütteln, Blick in die Kamera; es kostet Zeit, weil die Sonne
    weiter sinkt. Wer über den Bildrand fällt, ist nur zu hören und kommt mit einem Andenken auf dem Kopf zurück. Am Ende spielt ein
    Rückblick alle Stürze gleichzeitig ab (wie Super Meat Boy), Ozzys Tagebuch fasst die Runde zusammen.
12. **Die Demo ist die Abnahmeprüfung für Studio:** die Welt als Vektorpfad mit Hügeln und Lücken, rund 35 Posen (5 gibt es schon),
    gestaltete und automatische Übergänge, Physik (Rad, Körper, Sturz, lose Dinge, Flüssiges), Logik als Verhaltens-Vorlagen und
    Wenn-dann-Karten (kein Pfeil-Graph als Pflicht), Effekte, Ton, Prüfstand. Was die Demo braucht und Studio nicht kann, ist eine
    Lücke im Editor.
13. **Florian baut Inhalte und Regeln, keine Löser.** Gehen, Gleichgewicht und Sturz kommen als fertiges Verhalten „Vierbeiner“ mit
    Reglern (so wie GDevelop vorgefertigte Verhaltensbausteine an Objekte hängt). Wir legen alle Teile und Abläufe zuerst grob an,
    er stellt Look, Posen, Wege und Timing im Editor ein.

---

## 1. Auftrag und Rahmen

### 1.1 Florians Idee (zusammengefasst)

Ozzy steht oben auf einer großen Scheibe, die der Bildrand unten abschneidet. Wo es bergab geht, tapst er los. Der Spieler dreht
das Rad vorsichtig und steuert ihn so. Wird Ozzy zu schnell, stolpert er und fällt lustig hin. Ist er in Balance, führt man ihn
behutsam in eine Richtung; unterwegs springt er über Dinge und überläuft kleine Hindernisse, immer physikalisch richtig und als
Antwort auf seine Umgebung. An Erhöhungen und an manchen Stellen muss man besonders fein balancieren, zum Beispiel weil Ozzy einen
eigenen Kopf hat, irgendwo stehen bleibt oder von selbst das Tempo wechselt. Daraus soll ein wirklich witziges Spielkonzept werden,
das komplett mit den Mitteln des Editors entsteht und als Demo und Beispielprojekt dient. Der Look ist zunächst zweitrangig,
solange Florian ihn später im Editor selbst perfekt einstellen kann.

### 1.2 Was das Spiel leisten soll

- **Witzig sein**, und zwar durch Ozzys Körper und Charakter, nicht durch Texte.
- **Komplett mit dem Editor gebaut:** Formen, Posen, Übergänge, Physik, Spiellogik, Effekte. Kein Spielcode, der nur für dieses
  Spiel geschrieben wird; was fehlt, wird ein allgemeiner Baustein des Editors.
- **Zeigen, was Studio kann:** weichste Morphs und Posenübergänge, Physik, Spiellogik, Verschmelzen von Flächen.
- **Ohne Anleitung verständlich**, mit einem Finger auf dem iPhone spielbar, auf dem Mac mit Trackpad oder Maus.
- **Ozzy bleibt exakt wie das Logo.** Effekte spielen um ihn herum; was auf seinem Körper geschieht, entscheidet Florian.

### 1.3 Abgrenzung zu den anderen Berichten

Bericht 08 beschreibt, wie Ozzy auf dem Rad physikalisch steht, geht, stolpert, fällt und aufsteht (Schichten, Körpermodell mit
begrenzter Bremskraft, Kipppunkt, Zustände, Regler, Prüfstand, Etappen). Bericht 05 beschreibt die Bediengrammatik aus Posen,
Reglern, Wegen, Ebenen, Spielwerten und Regeln je Pose und skizziert in Abschnitt 6 schon, wie Ozzy auf dem Rad damit läuft. Dieser
Bericht baut darauf auf und beschreibt das **Spiel**: die Mechanik als Erlebnis, Steuerung, Komik, Ozzys Persönlichkeit, Struktur,
fünf Richtungen, die empfohlene Demo und was Studio dafür können muss.

---

## 2. Das Rad als Spielmechanik

### 2.1 Schwerkraft nach unten, nicht zur Mitte

In Super Mario Galaxy hat jede kleine Welt ihre eigene Anziehung zur Mitte. Mario kann sie ganz umrunden, fällt nicht über den
Rand und kommt zurück zum Start, wenn er geradeaus läuft; das Team nannte genau das als Vorteil (man fällt nicht herunter und
verirrt sich nicht). Auf so einer Welt gibt es aber **keine Hänge**: Unter Marios Füßen ist es überall eben.

Florians Idee braucht das Gegenteil: eine Scheibe in gewöhnlicher Schwerkraft nach unten. Nur der Scheitel ist eben; nach beiden
Seiten wird es steiler, am Bildrand sehr steil. Für die Geschichte heißt das: Die Scheibe ist ein Rad, eine Riesenkugel, eine
Trommel, ein Baumstamm oder ein runder Hügel. Worauf sie steht, sieht man nie, weil der Bildrand sie abschneidet. Das Bild der
kleinen Welt (runder Horizont, man kommt einmal herum) passt trotzdem, wenn die Welt wie ein Globus im Cartoon behandelt wird, auf
dem man oben läuft.

### 2.2 Die Lage ist das Gaspedal

Ozzys Winkel φ vom Scheitel ist zugleich die Neigung unter ihm. Nach dem Körpermodell aus Bericht 08 haben seine Beine eine
begrenzte Bremskraft a_max (in g gemessen):

- **Stehzone:** Solange tan φ ≤ a_max / g, kann er stehen und jedes Tempo halten, das er will.
- **Gehzone:** Ozzy will bergab tapsen, umso schneller, je steiler es ist. Das ist sein Verhalten, also ein Sollwert, und die Beine
  setzen ihn um.
- **Außerhalb der Stehzone** reicht die Bremskraft nicht: Er wird schneller, ob er will oder nicht, und je weiter weg vom Scheitel,
  desto schneller. Übersteigt das nötige Schritttempo sein höchstes, stolpert er.

Bericht 08 schlägt als realistischen Startwert a_max = 0,15 g vor (Stehzone etwa ±8,5°). Für eine erste Demo empfehle ich mehr
Spielraum, 0,3 g im Garten (Stehzone etwa ±17°), weil das die wichtigste Stellschraube der Schwierigkeit ist. Daraus ergibt sich
(Startwerte, nicht gemessen):

| Lage vom Scheitel | Hang | Ozzy | Gangart (Körperlänge L je Sekunde) | Der Spieler … |
|---|---|---|---|---|
| 0° bis 3° | fast eben | steht, atmet, schaut sich um | Stand | lässt ihn |
| 3° bis 8° | leicht | tapst gemütlich bergab | Schritt (1 bis 2 L/s) | hält ihn dort |
| 8° bis 13° | mittel | eilt | Trab (2 bis 4 L/s) | zieht den Boden nach |
| 13° bis 17° | steil | rennt, noch beherrscht | Galopp (4 bis 6 L/s) | holt ihn zurück |
| über 17° | zu steil | wird schneller, als er kann | Stolpern, dann Fallen | ist zu spät |

```
        ← Ozzy tapst nach links            Ozzy tapst nach rechts →
 Stolpern | Galopp | Trab | Schritt | Stand | Schritt | Trab | Galopp | Stolpern
   >17°    13–17°   8–13°    3–8°    ±3°     3–8°    8–13°   13–17°    >17°
 ═════════════════ Bildrand (das Rad läuft unsichtbar weiter) ═════════════════
```

Läuft Ozzy über den Scheitel auf die andere Seite, kehrt er um (eigene Pose „Kehrtwende“). Mehr braucht die Steuerung nicht: Die
Seite bestimmt die Richtung, der Abstand vom Scheitel das Tempo.

### 2.3 Balancieren wie ein Besen

Für Ozzys Lage gilt (Bericht 08): φ̇ = ω_Rad + v/R, mit ω_Rad der Drehgeschwindigkeit des Rads, v Ozzys Tempo relativ zur
Radoberfläche und R dem Radius. Ohne Bremse wächst eine kleine Abweichung wie bei einem umgekehrten Pendel der Länge R:

```
φ̈ ≈ ω̇_Rad + (g/R) · φ          Kippzeit τ = √(R/g)
```

Aus der Ruhe heraus verdoppelt sich eine kleine Abweichung in etwa 1,3 Kippzeiten, danach wächst sie je Kippzeit auf das
2,7-Fache. Das ist das bekannte Besen-Balancieren; Wikipedia nennt
genau dieses Beispiel und hält fest: „Tall pendulums fall more slowly than short ones.“ Für uns: **Große Räder kippen langsam,
kleine schnell.** Mit Ozzys Körperlänge L = 1 und g = 20 L/s² (das entspricht der echten Schwerkraft, wenn Ozzy einen halben Meter
lang ist) gilt:

| Radius R | Kippzeit τ | Rundenlänge 2πR | Gefühl |
|---|---|---|---|
| 8 L | 0,63 s | 50 L | nervös, für Könner |
| 11 L | 0,74 s | 69 L | lebendig |
| 14 L | 0,84 s | 88 L | gutmütig, zum Lernen |
| 20 L | 1,00 s | 126 L | fast flach, kaum Spannung |

Die Kippzeit sollte deutlich über der menschlichen Reaktionszeit liegen (grob 0,2 bis 0,3 s, eigene Kenntnis). Die Stehzone wirkt
zusätzlich als Puffer: Innerhalb von ihr kippt nichts.

Wichtig für die Bedienung ist eine Eigenheit aller umgekehrten Pendel, die Wikipedia beim Wagen mit Stab beschreibt: Kippt der Stab
nach rechts, muss der Wagen nach rechts beschleunigen, und wer den Wagen nach rechts bringen will, muss ihn zuerst kurz nach links
bewegen. Übersetzt: **Kippt Ozzy nach rechts, zieht man den Boden unter ihm zurück zum Scheitel** (das Rad nach links drehen). **Wer
ihn nach rechts schicken will, lässt ihn erst ein wenig nach rechts kippen** und zieht dann den Boden so nach, dass er auf der
Stelle tapst und die Welt unter ihm vorbeizieht wie ein Laufband. Das lernt man in Sekunden, meistert es aber erst mit Übung.

### 2.4 Drei Gesten, eine Physik

- **Halten:** Der Finger liegt still auf dem Rad. Eine Feder hält die angefasste Stelle unter dem Finger fest; das Rad steht wie
  fester Boden, auch wenn Ozzy dagegen läuft.
- **Ziehen:** Die angefasste Stelle folgt dem Finger über eine kritisch gedämpfte Feder mit Kraftgrenze (Bericht 08: etwa 4 Hz,
  Dämpfung 1). Ruckt der Finger, kommt das Rad träge hinterher. Vorsicht wird belohnt, ohne dass eine Regel sie erzwingt.
- **Loslassen:** Das Rad läuft mit seinem Schwung weiter und wird durch Lagerreibung langsamer. Wer wischt und loslässt, gibt
  Schwung wie bei einem Glücksrad.

Dazu kommt die **Rückwirkung** (Bericht 08, offene Frage 2): Jeder Schritt drückt die Radoberfläche nach hinten. Ein leichtes Rad
dreht Ozzy beim Laufen selbst unter sich weg wie ein Baumstamm im Wasser; ein schweres verhält sich wie Boden. Der Regler
„Radgewicht“ entscheidet, wie viel der Spieler selbst drehen muss. Für die Gassirunde empfehle ich ein mittleres Rad (Ozzy dreht
spürbar mit, der Spieler korrigiert), für das Baumstamm-Duell ein leichtes.

Diese drei Gesten sind das ganze Vokabular. Es gibt keinen Knopf; selbst der Start ist ein Anfassen des Rads (Ozzy sitzt oben und
steht auf, sobald der Finger das Rad berührt).

### 2.5 Drei Regler je Welt

| Regler | wirkt auf | Garten | Park | Winter |
|---|---|---|---|---|
| Radius R | Kippzeit, Rundenlänge, Steilheit am Bildrand | 14 L | 11 L | 12 L |
| Schwerkraft g | Kippzeit, Sprunghöhe und Flugdauer | 20 L/s² | 20 L/s² | 20 L/s² |
| Haftung / Standfestigkeit | Stehzone | 0,3 g → ±17° | 0,25 g → ±14° | Schnee 0,3 g, Eis 0,1 g → ±6° |
| Radgewicht | wie stark Ozzy das Rad mitdreht | mittel | mittel | mittel |
| Lagerreibung | wie lange Schwung anhält | mittel | mittel | gering |

Bei einer sichtbaren Breite von etwa 13 L im Querformat liegt der Bildrand im Garten bei arcsin(6,5/14) ≈ 28° vom Scheitel, im Park
bei etwa 36°. Die gefährlichen Hänge sind also immer zu sehen. Eine Runde (2πR) dauert bei durchschnittlich 1,5 L/s im Garten etwa
eine Minute, mit Hindernissen, Launen und Pannen 60 bis 90 Sekunden. Das ist die richtige Länge für ein Handyspiel (kurze Level
nennen die Entwickler von Super Meat Boy als Mittel gegen Frust).

Eis zeigt den Wert der physikalischen Lösung: Es braucht **keine Sonderregel**. Die Haftung sinkt, also schrumpft die Stehzone, also
rutscht Ozzy früher, also muss feiner balanciert werden.

### 2.6 Erhöhungen, Lücken, Stopps: woher das besondere Balancieren kommt

- **Hügel auf dem Rand:** Die Neigung unter Ozzy ist die Summe aus der Lage auf dem Rad und dem Hang des Hügels. Am Hügelgipfel
  steht er auf einem zweiten, kleineren Scheitel, der schneller kippt (Kippzeit aus dem kleineren Hügelradius). Wer ihn dort halten
  will, muss den Gipfel genau an den Radscheitel bringen und halten. Das ist Florians „besonderes Ausbalancieren an Erhöhungen“,
  ohne eine einzige Sonderregel.
- **Lücken und Stufen** verlangen Schwung. Der Spieler muss Ozzy kurz vorher schneller werden lassen, also nahe an den Rand der
  Stehzone bringen. Risiko und Belohnung liegen dicht beieinander.
- **Stopps:** Bleibt Ozzy stehen (Schnüffeln, Sturkopf), während das Rad als Laufband dreht, nimmt das Rad ihn mit; er wird aus der
  Stehzone getragen und beginnt zu rutschen. Der Spieler muss das Rad im richtigen Moment anhalten und die Stelle oben halten.
- **Tempowechsel** (Flitzen, Müdigkeit) ändern schlagartig, wie schnell das Laufband laufen muss.

### 2.7 Oben auf dem Rad oder innen im Laufrad?

Innen in einem Laufrad (Hamsterrad) liegt der tiefste Punkt stabil: Ozzy pendelt immer dorthin zurück, das Spiel wäre entspannt
und rhythmisch. Oben auf dem Rad ist der Scheitel instabil, das Spiel wird Balance und Können. Florians Idee ist eindeutig „oben“.
Das Laufrad bleibt eine Idee für ein Bonus-Spiel (etwa im Zirkus), nicht für den Kern.

---

## 3. Vorbilder: was die besten Spiele tun

### 3.1 Die Welt bewegen statt die Figur

- **LocoRoco** (PSP, 2006, Tsutomu Kouno): Die Schultertasten kippen den Planeten, die weichen Blasen rollen in Kipprichtung; beide
  Tasten drücken und loslassen ist der Sprung; die Gruppe teilt sich per Taste und verschmilzt wieder; jede gefressene Beere bringt
  eine weitere Figur, und die Musik bekommt mit jeder eine Stimme mehr. Die Idee entstand, als Kouno eine Skizze auf einem PDA im
  Zug drehte. Ziele: leicht zu spielen, auch für Kinder und international, mit Tiefe beim Sammeln. Kritik: Nach Rollen und Springen
  kommt keine neue Mechanik dazu, die Level wiederholen sich. **Für uns:** Ein Verb trägt ein ganzes Spiel, aber jede Welt braucht
  eine neue physikalische Idee. Musik, die mit dem Erfolg wächst, ist ein stiller Zähler. LocoRoco ist auch das wichtigste
  Vorbild für weiche, verschmelzende Vektorformen (Bericht 08).
- **Super Monkey Ball** (2001, Toshihiro Nagoshi): Der Spieler kippt den ganzen Boden, die Kugel rollt; Zeitlimit; wer herunterfällt,
  verliert ein Leben. Nagoshi wollte etwas sofort Verständliches. Einfache Kugeln waren in Bewegung schwer zu lesen, deshalb kam ein
  Affe hinein. Kritik: Kamera, für Gelegenheitsspieler zu schwer. **Für uns:** Eine Figur macht Physik lesbar. Ozzys Körper ist
  unser Tacho.
- **Kirby Tilt 'n' Tumble** (Game Boy Color, 2000): Ein Beschleunigungssensor steckt im Modul; man kippt das Gerät, Kirby rollt. Ein
  kurzer Ruck zum Körper hin (wie beim Pfannkuchenwenden) wirft ihn in die Luft. Game Informer lobte die enorme Spannung. **Für
  uns:** Ein Sprung kann aus derselben Geste kommen wie das Steuern; das prüfe ich in 4.2 und verwerfe es für die Demo.
- **Rolando** (iPhone, 2008, HandCircus/ngmoco, Physik mit Box2D): Neigen rollt die Figuren, Wischen nach oben lässt die gewählten
  springen, Gruppen wählt man mit einem Rahmen, Aufzüge und Bänder bewegt man direkt. Kritik: Ähnlichkeit mit LocoRoco; IGN fand,
  die Steuerung brauche lange, bis man sie meistert. **Für uns:** Neigen funktioniert auf dem iPhone, Feinsteuerung bleibt schwer.
- **And Yet It Moves** (2009): Man dreht die ganze Welt in 90°-Schritten, die Schwerkraft zeigt immer zum Bildschirmboden, die Figur
  behält ihren Schwung; ein zu tiefer Fall ist tödlich; auf der Wii dreht man frei durch Kippen der Fernbedienung. **Für uns:**
  Weltdrehen mit erhaltenem Schwung wird intuitiv verstanden.
- **TumbleSeed** (2017): Ein schräger Rankenast trägt einen rollenden Samen; zwei Sticks heben und senken die beiden Enden. Kritiker
  fanden die Schwierigkeit hart und ungleichmäßig, Eurogamer nannte die Steuerung zugleich zum Verzweifeln und faszinierend. Der
  Designer Greg Wohlwend führte die schwachen Verkäufe auf diesen Ruf zurück; ein Update machte das Spiel einen Monat nach Erscheinen
  leichter. **Für uns:** Feines Balancieren ist reizvoll, Härte vertreibt Spieler. Hilfen von Anfang an einplanen, nicht nachrüsten.
- **Lemmings** (1991): Die Figuren laufen von selbst; der Spieler ändert ihr Verhalten nur über zugewiesene Fähigkeiten. Amiga Power
  nannte es das erste große Spiel mit „indirekter Steuerung“. **Für uns:** Indirekte Steuerung macht den Spieler zum Planer, nicht
  zum Piloten. Ozzy läuft selbst; der Spieler formt den Boden.

### 3.2 Hänge, Schwung, ein Finger

- **Tiny Wings** (iOS, 2011, Andreas Illiger): Drücken macht den Vogel schwer, er holt bergab Schwung; Loslassen macht ihn leicht,
  er gleitet den nächsten Hügel hinauf und hebt ab. Geht die Sonne unter, schläft der Vogel ein; das ist die Zeitgrenze. Die Hügel
  sind prozedural und sehen jeden Tag anders aus; Aufgaben verbessern das Nest. Illiger wollte positive Gefühle wecken und ein Spiel,
  das schon ein Kind mit anderthalb Jahren spielen kann. **Für uns:** Hang gleich Tempo versteht jeder. Der Sonnenuntergang ist eine
  Uhr ohne Zahlen. Beides übernehmen.
- **Alto's Adventure** (2015) und **Alto's Odyssey** (2018): Die Figur fährt von selbst; Tippen springt, Halten macht einen Salto.
  Von 180 Zielen sind immer nur drei gleichzeitig aktiv. Tageszeit und Wetter wechseln. Odyssey bietet einen Zen-Modus, in dem man
  nach Stürzen weiterfährt. Für Odyssey wurde ein Enterhaken gestrichen, weil er das Spiel mit einem Finger verkompliziert hätte. **Für uns:**
  drei Ziele zur Zeit; ein entspannter Modus; jede neue Fähigkeit gegen die Einfachheit abwägen.
- **Doodle Jump** (2009): Neigen nach links und rechts, die Figur hüpft von Plattform zu Plattform; zehn Millionen Verkäufe bis Ende
  2011.
  **Für uns:** Neigen trägt, wenn es nur eine Achse und eine gutmütige Physik steuert.

### 3.3 Kleine Welten

- **Super Mario Galaxy** (2007): Die Kugelwelten stammen aus der Technikdemo „Super Mario 128“ (2000); Yoshiaki Koizumi hielt sie
  lange für technisch unmöglich. Im Team galten Kugeln zunächst als schlechte Wahl für ein Sprungspiel; das Ergebnis wirkte dann
  völlig frisch. Die eigene Schwerkraft jeder Kugel verhindert das Herunterfallen und das Verirren. **Für uns:** Den runden Horizont
  übernehmen, die Anziehung zur Mitte nicht (siehe 2.1).

### 3.4 Komik aus Physik

- **QWOP** (2008, Bennett Foddy): Vier Tasten steuern Oberschenkel und Waden eines Sprinters einzeln; Stürze als Slapstick. Foddy
  verzichtete auf Bestenliste und Sollzeit, weil er fürchtete, viele würden sonst aus Frust aufhören. **Für uns:** Unbeholfenheit
  ist lustig, aber Glieder direkt zu steuern ist für die meisten zu schwer. Bei uns steuert der Spieler den Boden, nicht die Beine.
- **Getting Over It** (2017, Foddy): Ein Hammer an der Maus, keine Zwischenstände, jeder Fehler kann allen Fortschritt kosten. Foddy
  sagte, er habe es für eine bestimmte Art Mensch gemacht, um ihr wehzutun. Interessant: Er plante erst eine spöttische Erzählstimme und wählte dann
  eine ermutigende, weil die Spieler ohnehin frustriert sein würden. **Für uns:** der Gegenpol. Rückschlag ja (Ozzy rollt ein Stück
  zurück), Grausamkeit nein; Trost gehört in die Figur.
- **Human: Fall Flat** (2016, Tomas Sakalauskas): wackelige Physik, die Arme greifen einzeln. Der Sohn des Entwicklers spielte beim
  Testen lieber mit der Physik als mit den Rätseln; daraufhin wurden die Rätsel lockerer und lassen mehrere Lösungen zu. IGN fand es
  teils unterhaltsamer zum Zuschauen; verkauft wurde es über 50 Millionen Mal. **Für uns:** Platz für Unfug lassen und Aufgaben
  stellen, die zum Spielen mit der Physik einladen.
- **Octodad: Dadliest Catch** (2014): Arme und Beine werden einzeln gesteuert, Alltagsaufgaben werden zur Farce. Die Kritik war
  gespalten: Game Informer nannte die Steuerung furchtbar, GameSpot gerade deshalb komisch. **Für uns:** Komik aus absichtlich
  schlechter Steuerung spaltet. Unsere Komik kommt von Ozzy, die Steuerung selbst muss sich gut anfühlen.
- **Goat Simulator** (2014): aus einem einmonatigen Witz-Prototyp entstanden; die Entwickler ließen Physikfehler im Spiel, weil sie
  lustig waren, und behoben nur Abstürze. Kritik: seicht. **Für uns:** Unfug allein trägt nicht lange; er braucht Ziele.
- **Fall Guys** (2020): Bohnenfiguren, die absichtlich nicht sportlich sind. Die Entwickler fanden schlicht, „falling over is funny“,
  und der leitende Designer Joe Walsh sagte sinngemäß, ohne das Ragdoll-Verhalten der Figur gehe die Komik verloren. **Für uns:**
  Stürze müssen jedes Mal etwas anders aussehen; Physik statt Konserve.
- **Snake Pass** (2017): Ein Schlangenkörper aus vielen physikalischen Gliedern; einzigartige, aber steile Steuerung. Die Idee entstand
  aus einem Seil, das der Entwickler festzumachen vergaß. Der realistische Look wirkte unheimlich und wich einem Cartoon; eine
  Wachsen-Mechanik wurde gestrichen. **Für uns:** Neue Steuerungen brauchen einen sanften Einstieg; Cartoon macht Physik sympathisch.
- **Pikuniku** (2019): eine Figur mit langen Beinen, Treten und Rollen, verspielter Ton; GameSpot fand es durchgehend charmant und
  witzig, mit gelegentlichem Frust beim Treten.
- **Clumsy Ninja** (2013): das erste Handyspiel mit der Physik-Animation „Euphoria“; man trainiert einen tollpatschigen Ninja;
  zehn Millionen Downloads in der ersten Woche. **Für uns:** Eine physikalisch reagierende Figur kann auf dem Handy ein ganzes Spiel
  tragen.
- **Wobbledogs** (2022): physikalisch wackelnde Hunde in einer Haustier-Simulation; PC Gamer fand es eher Zuschauen als Rätseln.
  **Für uns:** Ohne Aufgabe wird Physik zum Aquarium.

### 3.5 Begleiter mit eigenem Willen

- **The Last Guardian** (2016, Fumito Ueda): Das Tier Trico gehorcht anfangs kaum und lernt nach und nach Befehle; Streicheln
  beruhigt es. Ueda wollte tierhaftes Verhalten statt künstlicher Niedlichkeit. Lob: eine der besten Begleiterfiguren überhaupt.
  Kritik: verzögerte Reaktionen auf Befehle, Ungeduld und Frust; Trico handle manchmal ohne Eingabe, die Steuerung fühle sich
  wirkungslos an. **Für uns:** Eigenwille braucht Ankündigung, kurze Dauer und Regeln, die man lernen kann; nie in einem Moment, in
  dem der Spieler sich ausgeliefert fühlt.
- **Nintendogs** (2005): Streicheln, Spielen und Gassigehen über den Touchscreen, Kunststücke per Stimme, Wettbewerbe in Frisbee,
  Agility und Gehorsam, kein Ende; knapp 24 Millionen verkauft. **Für uns:** Der Alltag mit einem Hund ist schon ein Spiel; Agility
  ist als Hunde-Wettkampf bekannt.
- **Haunting Ground** (2005): Der Hund Hewie gehorcht erst, wenn man durch Loben und Füttern Vertrauen aufbaut; man kann ihn auch
  tadeln. Ein Teil der Kritik fand die Mechanik wiederholend. **Für uns:** Vertrauen als langsamer Fortschritt ist denkbar, aber
  sparsam dosieren.
- **Talking Tom** (seit 2010): Die Figur reagiert auf Anstupsen und Kitzeln; über 18 Milliarden Downloads, ein Familienpublikum.
  **Für uns:** Antippen der Figur ist die natürlichste zweite Geste auf einem Touchscreen.

### 3.6 Struktur und Belohnung

- **Untitled Goose Game** (2019): Jedes Gebiet hat eine Aufgabenliste mit Streichen; die Gans hupt, greift und flattert; die
  Dorfbewohner reagieren. Gewalt wurde gestrichen, damit Situationen als Witz funktionieren. Die Musik besteht aus Debussy-Préludes,
  die Dan Golding in je zwei Fassungen in kurze Stücke nach Intensität geschnitten hat; das Spiel wählt sie passend zu den Aktionen,
  was als komisches Timing gelobt wurde. Kritik: Die Aufgaben fühlen sich teils wie Pflichten an. **Für uns:** eine Aufgabenliste
  mit absurden Zielen, Musik, die mitspielt, und Reaktionen anderer Figuren.
- **Super Meat Boy** (2010): sofortiger Neustart, kurze Level, unendlich viele Versuche. Nach dem Level spielt ein Rückblick alle
  Versuche gleichzeitig ab; das habe den Tod laut Wikipedia „transformed death into a form of reward“. **Für uns:** der
  Pannen-Rückblick am Ende jeder Runde.
- **Rhythm Heaven:** kurze Minispiele von ein bis zwei Minuten mit Hörzeichen, drei Bewertungen; nach drei Fehlversuchen in Folge
  darf man meist überspringen. **Für uns:** Hilfe nach drei Fehlversuchen; kurze Stücke.

### 3.7 Vorbilder aus der wirklichen Welt

- **Baumstammrollen (Logrolling, Birling):** Zwei Leute stehen auf einem schwimmenden Stamm, drehen und treten ihn, bis einer fällt;
  wer zuerst mit beiden Füßen den Kontakt verliert, verliert den Durchgang; gespielt wird auf drei von fünf. Stämme gibt es in
  Größen (im US-Profibereich der Männer 12 bis 15 Zoll Durchmesser). Physikalisch kippt ein dünner Stamm schneller (2.3). Das ist Ozzys Rad mit Wasser
  darunter.
- **Hunde-Agility:** Hürden, Reifen, Tunnel, A-Wand, Steg, Wippe, Slalom (5 bis 12 Stangen) und ein Tisch, auf dem der Hund etwa
  fünf Sekunden sitzen oder liegen muss. An A-Wand, Steg und Wippe muss eine Pfote die farbige Kontaktzone berühren. Fehler gibt es
  für fallende Stangen, Zeitfehler für Sekunden über der Sollzeit. Der Hundeführer darf weder Hund noch Geräte berühren, nur Stimme
  und Körpersprache helfen. Das ist indirekte Steuerung in Reinform.
- **Springreiten:** Eine Verweigerung (das Pferd stoppt oder läuft vorbei) kostet vier Fehler, auf höchster Stufe führt die zweite
  zum Ausschluss. Der Reiter plant Linie und Galoppsprünge, das Pferd springt; ein gehetzter Anlauf führt zu Verweigerungen und
  Abwürfen. **Für uns:** Der Spieler ist der Reiter. Er bestimmt Anlauf und Tempo, Ozzy springt oder verweigert.
- **Flitzen (Zoomies):** plötzliche Ausbrüche wilden Rennens mit Drehungen, Sprüngen und abrupten Stopps, oft nach dem Baden oder im
  Spiel; sie dauern Sekunden bis Minuten und enden oft abrupt im Hinlegen; normales Verhalten. **Für uns:** ein echter,
  wiedererkennbarer Tempowechsel.
- **Besen-Balancieren und Kugellaufen:** Das umgekehrte Pendel ist das Lehrbeispiel der Regelungstechnik; Wikipedia erwähnt auch das
  Pendel auf einer Kugel. Die Laufkugel im Zirkus, auf der ein Artist mit kleinen Schritten balanciert und sie so fortbewegt, ist
  dasselbe Prinzip mit vertauschten Rollen (eigene Kenntnis): Dort läuft der Artist, bei uns dreht der Spieler.

### 3.8 Übersicht: übernehmen und vermeiden

| Vorbild | Kernmechanik | Übernehmen | Vermeiden |
|---|---|---|---|
| LocoRoco | Welt kippen, Figur rollt | ein Verb; Musik wächst mit; Verschmelzen | gleiche Mechanik ohne neue Ideen |
| Super Monkey Ball | Boden kippen, Kugel rollt | Figur macht Physik lesbar | schwere Kamera, harte Leben |
| Kirby Tilt 'n' Tumble | Gerät kippen, Ruck = Sprung | Spannung aus Feinsteuerung | Bewegung als einzige Eingabe |
| Rolando | Neigen plus Wischen | Touch und Physik auf dem iPhone | Feinsteuerung nur per Neigen |
| TumbleSeed | Balken an zwei Enden | feines Balancieren | Härte ohne Hilfen |
| Lemmings | Figuren laufen selbst | indirekte Steuerung | – |
| Tiny Wings | Hang gleich Schwung, Sonnenuntergang | Tempo aus dem Hang, Uhr ohne Zahlen | – |
| Alto | ein Finger, drei Ziele, Zen-Modus | Zielstruktur, entspannter Modus | Ziele, die nur Sammeln sind |
| QWOP, Octodad | Glieder einzeln steuern | Unbeholfenheit ist lustig | absichtlich schlechte Steuerung |
| Getting Over It | Rückschlag als Prinzip | ermutigender Ton | Grausamkeit |
| Human: Fall Flat | wackelige Physik, offene Lösungen | Platz für Unfug | Rätsel, die die Physik bekämpfen |
| Fall Guys | Hinfallen ist der Witz | Physik statt Konserve | – |
| The Last Guardian | Begleiter mit eigenem Willen | Tierhaftigkeit, Streicheln | Eigenwille ohne Ankündigung |
| Untitled Goose Game | Aufgabenliste, Reaktionsmusik | absurde Ziele, Musik als Timing | Pflichtgefühl |
| Super Meat Boy | Rückblick aller Versuche | Pannen-Rückblick | – |
| Agility, Springreiten | Anlauf und Tempo, Verweigerung | Hindernis-Grammatik | – |

---

## 4. Steuerung auf iPhone und Mac

### 4.1 Was Studien und Richtlinien sagen

- **Wie Menschen Handys halten** (Steven Hoober, 1.333 Beobachtungen, davon 780 beim Berühren): 49 % einhändig, 36 % in einer Hand
  gehalten und mit der anderen bedient, 15 % mit beiden Händen. Die Griffe wechseln oft, manchmal alle paar Sekunden. Später ergänzte
  Hoober, dass die Mitte des Bildschirms schneller und genauer getroffen wird als Ränder und Ecken. Finger verdecken, was unter ihnen
  liegt.
- **Apple, Game controls:** Direkte Interaktion mit Spielelementen wirkt oft immersiver als virtuelle Knöpfe. Eingabeflächen so groß
  wie möglich; einen Daumenstick dort zeigen, wo der Daumen landet; Steuerelemente weg vom Home-Balken und der Dynamic Island;
  Mechaniken umbauen, die mehrere Knöpfe gleichzeitig verlangen; Varianten über Halten oder Doppeltippen; jeder Druck braucht einen
  sichtbaren und spürbaren Zustand mit Ton und Haptik. Zu Neigesteuerung sagt die Seite nichts.
- **Systemgesten:** Am unteren Rand liegt der Home-Balken. Eine native App kann iOS bitten, die eigenen Gesten an einem Rand
  vorzuziehen (`preferredScreenEdgesDeferringSystemGestures`, seit iOS 11); Apple rät, das nur für immersive Apps zu nutzen. Im
  Browser gibt es nichts Vergleichbares.
- **Neigen im Browser:** Safari liefert Lagesensoren erst nach einer Erlaubnisfrage, die durch eine Nutzerhandlung (Antippen)
  ausgelöst werden muss, und nur über HTTPS.
- **Vibration:** Safari unterstützt die Vibrations-Schnittstelle nicht, weder auf iOS noch auf dem Mac. Haptik gibt es nur in einer
  App-Hülle; Capacitor Haptics bietet Stöße (leicht, mittel, schwer), Auswahl-Ticks und Meldungen und nutzt unter iOS die
  Feedback-Generatoren von UIKit.

### 4.2 Gegenüberstellung der Steuerungen

| Steuerung | Wie | Stärken | Schwächen | Für Ozzy |
|---|---|---|---|---|
| Ziehen direkt am Rad | Finger fasst die Radoberfläche an, das Rad folgt über eine Feder | sofort verständlich, analog fein, gleich auf iPhone und Mac, keine Erlaubnis | Finger verdeckt einen Teil des Rands; unten Konflikt mit dem Home-Balken; Nachfassen auf langen Strecken | Kern |
| Ziehen überall | ganze Fläche ist Eingabe, eine Fingermarke erscheint auf dem Radrand | größte Fläche (Apple), kein Konflikt mit dem Home-Balken, Daumen in der genauen Mitte (Hoober) | etwas weniger „direkt“ | **Standard** |
| Schwung | wischen und loslassen, das Rad läuft weiter | spart Nachfassen, Glücksrad-Gefühl | grob | Teil des Standards |
| Neigen | Gerät kippen dreht das Rad oder kippt die Schwerkraft | körperliches Balance-Gefühl, Bildschirm frei | Erlaubnis im Browser; ungenau; im Liegen und im Bus unpraktisch; Mac hat keinen Sensor | Zusatzmodus zum Ausprobieren |
| Zwei Daumen | links halten dreht nach links, rechts nach rechts, beide bremsen | einfach, barrierearm, nichts verdeckt | digital, Balance wird grob | Hilfsmodus |
| Virtueller Drehknopf | kleiner Knopf in einer Ecke | präzise | Umweg, abstrakt, gegen Apples Rat | nein |
| Antippen von Ozzy | Zuwendung: streicheln, ermutigen | natürlich (Talking Tom, Nintendogs, Trico) | zweites Verb, Fehltipps | optional, prüfen |
| Ruck nach oben | das Rad federt hoch, Ozzy springt (wie Kirby) | ein Verb bleibt | schwer zu entdecken, braucht eine gefederte Achse | nein, höchstens im Zirkus |

### 4.3 Empfehlung

- **Eine Hand, ein Verb: Ziehen.** Anfassen überall. Beim Aufsetzen erscheint am Radrand senkrecht über dem Finger eine kleine
  Tropfenmarke; sie zeigt, welche Stelle des Rands der Finger hält. Halten bremst, Loslassen gibt Schwung.
- **Feder mit Kraftgrenze** macht grobes Rucken wirkungslos. Ozzy quittiert grobes Rucken mit einem Blick zum Finger, ohne Strafe.
- **Kein Knopf im Spiel.** Auch Start und Weltwahl sind ein Rad (siehe 9.2).
- **Mac:** Ziehen mit Maus oder Trackpad; waagrechtes Wischen mit zwei Fingern dreht ebenfalls. Vorsicht: macOS liefert beim
  Trackpad eigenen Nachlauf, der sich mit unserem Schwung doppeln kann; einen der beiden abschalten (prüfen).
- **Haptik nur in der App-Hülle:** feine Ticks alle paar Grad beim Drehen (wie ein Zahnrad), ein Stoß bei Landung und Plumps. Im
  Browser fehlt sie, das Spiel muss ohne sie verständlich sein.
- **Neigen und zwei Daumen** als Schalter in den Einstellungen; ob Neigen Freude macht, entscheidet ein kurzer Test.

### 4.4 Hoch- oder Querformat

Der Spieler muss das nächste Hindernis früh genug sehen, um das Tempo anzupassen. Im Querformat zeigt der Bildschirm etwa 13 L Breite,
also bei 2 L/s rund drei Sekunden Vorschau zu jeder Seite; im Hochformat etwa 6 L, also rund anderthalb Sekunden. Tiny Wings und
Alto spielen im Querformat. **Empfehlung:** Querformat für die Demo; ein einhändiger Hochformat-Modus mit weiter entfernter Kamera
lässt sich später prüfen.

---

## 5. Spielgefühl und Komik

### 5.1 Steve Swinks sechs Bausteine, angewandt

Swink definiert Spielgefühl als Echtzeit-Steuerung virtueller Dinge in einem simulierten Raum, betont durch Feinschliff, und nennt
sechs Bausteine:

| Baustein | Bei Ozzy auf dem Rad |
|---|---|
| Eingabe | Ziehen, Halten, Loslassen; analog und direkt („natürliche Zuordnung“) |
| Antwort | das Rad folgt über eine Feder, Ozzy über Gangart und Neigung |
| Kontext | die Krümmung und die Abstände der Hindernisse; Swink: „constraints define sensation“ |
| Feinschliff | Staub, Ohren, Stauchen, Ton, Haptik |
| Metapher | ein Hund auf einer Kugel: Jeder weiß, was Hunde tun (schnüffeln, Wasser meiden, Würste lieben) |
| Regeln | eine Runde vor Sonnenuntergang, drei Aufgaben |

Swink rät, Bewegung zuerst in einem „Garten“ mit verschiedenen Formen zu stimmen, wie Miyamoto es vor dem Bau der Level tat. Genau
das ist unsere **Spielwiese** (9.2) und zugleich der Prüfstand aus Bericht 08.

### 5.2 Saft je Ereignis

„Saft“ (Juice) heißt seit dem Vortrag von Martin Jonasson und Petri Purho (2012), Ereignisse durch Bild, Ton und Bewegung zu
betonen; Nicolae Berbece widmete 2015 einen ganzen Vortrag der Frage, warum Todesanimationen oft enttäuschen. Für Ozzy:

| Ereignis | Bild | Ton | Haptik (App) |
|---|---|---|---|
| Pfote setzt auf | winzige Staubtropfen, die verschmelzen | Tapp | – |
| Rad dreht | Dinge am Rand ziehen vorbei | Rumpeln, Tonhöhe mit dem Tempo | Tick alle 5° |
| Ausholen | Hocke, Ohren zurück | – | – |
| Absprung | Streckung, Ohren fliegen, Schatten wird kleiner | Wusch | leicht |
| Landung | Stauchen ohne Flächenverlust, Staubring | Plumps, laut nach Fallhöhe | mittel |
| Stolpern | 0,3 s Zeitlupe (Zeitfaktor 0,4), große Augen, Ohren hoch | kurzes Fiepen | – |
| Plumps | Physik; Sterne nur bei hartem Aufprall | Plumps, Musik stockt | schwer |
| Aufstehen | Schütteln, Staub oder Tropfen fliegen | Schüttelgeräusch | – |
| Runde geschafft | Kamera zieht auf, die ganze Welt wird sichtbar, Sonnenuntergang | Schlussakkord | Erfolg |

Der Kontaktschatten (Bericht 10) ist kein Schmuck: Ohne ihn liest man Sprunghöhe und Landepunkt schlecht. Effekte auf Ozzys Körper
selbst (Nässe-Glanz, Schmierbilder) nur, wenn Florian sie will; Ozzy bleibt wie das Logo.

### 5.3 Warum etwas lustig ist

- **Inkongruenz:** Humor entsteht, wenn eine Erwartung bricht und sich auflöst. **Harmlose Verletzung** (McGraw und Warren 2010):
  Etwas verletzt, wie die Welt sein sollte, wirkt aber zugleich harmlos, und beides wird gleichzeitig wahrgenommen. Ein Hund, der
  würdevoll über einen Stamm springen will und dahinter in der Pfütze landet, erfüllt alle drei Bedingungen, solange ihm nichts
  passiert.
- **Chuck Jones' Regeln für den Kojoten** (in „Chuck Amuck“ veröffentlicht): Der Kojote ist immer „more humiliated than harmed“, und
  die Schwerkraft ist sein größter Feind. Ein Mitautor der frühen Filme bestritt, dass es diese Regeln damals gab; als Leitlinie sind
  sie trotzdem brauchbar.
- **Fall Guys:** Hinfallen ist der Witz, und er hängt an der Physik.
- **Die Prinzipien der Disney-Animation** (Thomas und Johnston): Ausholen, Stauchen und Strecken, Nachschwingen, Timing, Übertreibung,
  klare Inszenierung, Ausstrahlung. Florian formt sie in den Posen und Wegen; die Physik liefert die Abwandlung.

### 5.4 Zehn Witz-Regeln für Ozzy

1. **Blamiert, nie verletzt.** Nach jedem Plumps steht Ozzy auf, schüttelt sich und tut, als wäre nichts gewesen.
2. **Ozzy meint es ernst.** Er grinst nicht über seine Pannen; der Witz liegt im Abstand zwischen Würde und Ergebnis.
3. **Ahnung, Pause, Folge.** Jede Panne hat einen Moment, in dem man sie kommen sieht (Ohren hoch, kurze Zeitlupe), dann die Folge.
4. **Der Blick.** Nach einer Panne schaut Ozzy in die Kamera (Kopfdrehung zur Front, die genaueste Ansicht, weil sie das Logo ist).
   Nach grobem Rucken schaut er auf den Finger.
5. **Wiedererkennbar.** Echtes Hundeverhalten: schnüffeln, flitzen, sich stur hinsetzen, kratzen, Wasser meiden.
6. **Physik statt Konserve.** Jeder Sturz sieht etwas anders aus; die Posen geben den Ausdruck, die Physik die Abwandlung.
7. **Ketten.** Ein Ding stößt das nächste an: Der Ball rollt den Hang hinab, die Katze wacht auf, beide purzeln.
8. **Hinter dem Bildrand ist alles Ton.** Was jenseits des Rands geschieht, hört man nur (Scheppern, Miau, Platsch); dann kommt Ozzy
   mit einem Andenken auf dem Kopf zurück. Das ist ein alter Cartoon-Kniff und spart Animation.
9. **Musik spielt mit.** Sie stockt beim Plumps und setzt mit Ozzys Gang wieder ein (wie in Untitled Goose Game).
10. **Kein Spott, keine Strafe.** Scheitern kostet Zeit, nie die Lust weiterzuspielen.

### 5.5 Physikalisch richtig und trotzdem Cartoon

Cartoon-Physik lässt Figuren in der Luft hängen, bis sie es merken. Das widerspricht Florians Wunsch, dass Ozzy sich immer
physikalisch korrekt bewegt, und es würde das Spiel unlernbar machen: Wer Tempo und Lage planen soll, muss sich auf Bahnen verlassen
können. **Urteil:** Bahnen, Kontakte und Schwung sind immer echt. Cartoon gibt es nur

- in der **Zeit:** Beim Stolpern verlangsamt sich die ganze Welt kurz; die Bahn bleibt dieselbe, sie wird nur langsamer gezeigt;
- in den **Posen:** Übertreibung, Stauchen ohne Flächenverlust, Ausholen;
- **hinter dem Bildrand**, wo nur Ton ist.

---

## 6. Ozzys Persönlichkeit als Mechanik

### 6.1 Grundsatz

- Eine **Laune** setzt Sollwerte (Wunschtempo, Bremskraft, Gangart, Sprungbereitschaft, Blickziel) und wählt Posen. Die Physik
  bleibt dieselbe (Bericht 08: „Die Absicht verändert nur Sollwerte“).
- Jede Laune hat eine **Ankündigung** von etwa einer Sekunde am Körper: Ohren, Schwanz, Kopf, Haltung.
- Launen hängen **meist an einem Ort** (Duftstelle, Pfütze, Katze), damit der Spieler sie vorhersehen und Florian sie platzieren kann;
  seltener an Ozzys Zustand (müde nach dem Flitzen, übermütig nach Erfolgen).
- Sie sind **kurz** (zwei bis fünf Sekunden), nie zwei gleichzeitig und nie ohne Ankündigung kurz vor einem Hindernis. Bericht 05
  schlug vor, Launen nur auf ebenen Stücken zuzulassen; für die Erhöhungen, an denen Florian ausdrücklich besonderes Balancieren
  will, kommt die Fairness hier aus der Ankündigung, nicht aus dem Ort.

### 6.2 Launen-Katalog

| Laune | Auslöser | Ankündigung | Wirkung (nur Sollwerte) | Antwort des Spielers | Witz, wenn es schiefgeht | Posen und Wege |
|---|---|---|---|---|---|---|
| Schnüffeln | Duftstelle | Nase sinkt, Schwanz wird langsamer, Tempo sinkt | Wunschtempo 0 für 2 bis 4 s, Bremskraft hoch | Rad anhalten, die Stelle oben halten | Nasen-Pflug: wird mit der Nase im Gras weitergeschoben, schaut beleidigt | Schnüffeln, Nasen-Pflug |
| Sturkopf | Ungeliebtes voraus (Wasser, Gartenzwerg); nach vielen Stürzen | Ohren zurück, Blick weg, setzt sich langsam | Sitzen, Bremskraft höchste, Schwerpunkt tiefer | warten, langsam heranführen, streicheln | Popo-Rutschen: sitzt aufrecht, rutscht bei Gefälle mit unbewegter Miene | Sitzen (vorhanden), Hinsetzen (vorhanden) |
| Flitzen | nach dem Schütteln, nach langer Ruhe (selten) | Spielverbeugung, Hinterteil wackelt, Augen weit | Galopp, kehrt evtl. einmal um, endet abrupt im Hinlegen | schnell gegendrehen, beim Stopp sofort halten | rennt über den Bildrand, Scheppern, kommt mit einem Blatt auf dem Kopf zurück | Diener (vorhanden), Galopp, Kehrtwende, Hinplumpsen |
| Jagen | Schmetterling, Eichhörnchen | Kopf schief, Ohren hoch, Kopf folgt dem Ziel | Tempo zum Ziel, Sprung nach oben | darunter halten oder ziehen lassen | Hochsprung, verfehlt, landet auf dem Rücken und strampelt | Kopf schief, Jagdsprung, Rückenlage |
| Müde | nach dem Flitzen, gegen Sonnenuntergang | Gähnen, Gang wird langsam | legt sich hin; liegend ist er rund und rollt | genau oben halten, bis er aufwacht | Schlafwalze: rollt schlafend den Hang hinab und schnarcht weiter | Gähnen, Liegen (vorhanden), Rollen |
| Angst | Rasensprenger, Krähe; nach hartem Sturz | Schwanz eingezogen, geduckt, zittert | weicht zurück, verweigert Hindernisse | langsam heranführen, streicheln | Schrecksprung mit allen Vieren gespreizt | Ducken, Zittern (Feder), Schrecksprung |
| Kratzen | selten, auf ebenen Stücken | bleibt stehen, Hinterbein hebt sich | steht auf drei Beinen, die Stützfläche wird kleiner | ganz still halten | kippt um und kratzt im Liegen weiter | Kratzen stehend und liegend |
| Übermut | drei saubere Sprünge in Folge | Brust raus, Schwanz hoch, federnder Gang | etwas schneller, springt zu weit | zügeln | landet hinter dem Stamm in der Pfütze | Stolzieren |
| Gier | Wurst auf der Strecke | schnuppert in die Luft, ein Sabbertropfen | rennt aufs Futter zu, übersieht Steinchen | Tempo drosseln | Bauchrutscher auf die Wurst zu | Schnuppern, Bauchrutscher |

Für die Demo genügen Schnüffeln, Sturkopf, Flitzen und Jagen, dazu Müde am Abend. Die anderen kommen mit späteren Welten.

### 6.3 Charakter-Regler

Fünf Regler bestimmen, wie oft und wie lange Launen auftreten: **Neugier** (Schnüffeln, Jagen), **Mut** (Angst, Verweigerung),
**Sturheit** (Dauer des Sturkopfs), **Energie** (Flitzen, Müdigkeit), **Verfressenheit** (Gier). Dazu die drei Regler aus Bericht 08
für den Körper: schwer bis leicht, fest bis wabbelig, geschickt bis tollpatschig. Jede weitere Figur (Katze, Biber) bekommt
dieselben Regler. So wird das System erweiterbar, ohne neue Regeln.

### 6.4 Stimmung als sanfte Schwierigkeitsanpassung

- Nach mehreren Stürzen wird Ozzy **vorsichtiger**: langsamer, öfter stur. Er ist leichter zu halten, und man sieht es am
  eingezogenen Schwanz.
- Nach einer Serie wird er **übermütig**: schneller, Sprünge zu weit. Er wird schwerer zu halten, und man sieht es am Stolzieren.

Das Spiel passt sich an, ohne Anzeige und ohne dass es sich wie Hilfe anfühlt. Grenze: nie so stark, dass Können nicht mehr zählt.

### 6.5 Der Spieler als Komplize

Ozzy ist die Anzeige. Er schaut zum Finger, wenn der Spieler ruckt, in die Kamera nach einer Panne, und wedelt, wenn er gut gehalten
wird. Optional (zu prüfen) gibt es eine zweite Geste, **Antippen** als Zuwendung: Bei Angst beruhigt es, beim Zögern vor einem
Hindernis ermutigt es („Hopp!“), sonst wedelt er nur. Das ist ein soziales Verb, keine Fernsteuerung.

---

## 7. Fünf Konzeptrichtungen

Alle fünf nutzen dasselbe Rad, dieselbe Physik, dieselben Launen und dieselbe Steuerung. Sie unterscheiden sich in Fiktion, Ziel und
Ton.

### A „Gassirunde“: eine Runde um die kleine Welt

**In einem Satz:** Ozzy dreht vor Sonnenuntergang eine Runde um seine kleine runde Welt, und der Spieler dreht die Welt.

- **Fiktion:** Jede Welt ist eine kleine runde Welt (Garten, Park, Winter, später Strand, Stadt, Jahrmarkt), die nur oben aus dem
  Bildrand ragt. Ein Fähnchen markiert Start und Ziel, die dieselbe Stelle sind. „Gassirunde“ ist wörtlich gemeint.
- **Kernschleife:**
  - *Sekunden:* das nächste Ding lesen, Ozzys Lage und damit sein Tempo wählen, er meistert es (Schritt, Sprung, Schnüffeln, Laune),
    die Lage wieder fangen.
  - *Eine Runde (60 bis 90 s):* vor Sonnenuntergang ankommen, Leckerli einsammeln, drei Aufgaben erfüllen.
  - *Über Tage:* neue Welten, Tagebuchseiten, Andenken-Sammlung, Halsbänder und Mützen; später eine „Tagesrunde“, die für alle
    gleich ist.
- **Steuerung:** Ziehen, Halten, Schwung; optional Streicheln.
- **Ozzy:** Launen nach 6.2; die Stimmung passt die Schwierigkeit sanft an.
- **Hindernisse:** Steinchen, Stamm, Lücke, Hügel, Pfütze, Wippe, Trampolin, Ball (rollt selbst den Hang hinab), schlafende Katze,
  Wurst, Schmetterling, Laubhaufen, Rasensprenger, Eisfläche, Schneeball (wächst beim Rollen).
- **Scheitern:** Stolpern und Fallen kosten Zeit; wer über den Bildrand fällt, ist nur zu hören und kommt mit einem Andenken zurück;
  wer den Hang hinunterrollt, verliert Strecke. Kein Spielende: Geht die Sonne unter, zeigt das Tagebuch, wie weit er kam.
- **Fortschritt:** Sterne für Aufgaben schalten Welten frei; **Andenken** (Blumentopf, Socke, Eimer, Blatt), die er von hinter dem
  Bildrand mitbringt, füllen eine Kiste. So belohnt sogar das Scheitern.
- **Witz-Momente:** Popo-Rutschen bis an die Pfütze, Nasen-Pflug, Schlafwalze, Flucht rückwärts vor der aufgeweckten Katze,
  Übermuts-Plumps, ein Vogel landet auf Ozzys Kopf und balanciert mit.
- **Stärken:** am nächsten an Florians Idee; gemütlich und witzig; jede Welt ist neuer Inhalt aus dem Editor; zeigt alles; braucht
  weder Gegner noch Rätsellogik.
- **Schwächen:** Gefahr der Gleichförmigkeit (LocoRoco), Balancieren kann Gelegenheitsspielern zu schwer sein (TumbleSeed).
- **Editor zusätzlich:** Welt als Vektorpfad mit Dingen auf dem Rand, abgewickelte Streckenansicht, Himmel als Uhr, Aufgabenliste,
  Tagebuchkarte, Rückblick.

### B „Die Kugelnummer“: Zirkus

**In einem Satz:** Ozzy ist der Star einer Zirkusnummer auf einer Riesenkugel; der Spieler dreht sie, das Publikum klatscht für
Kunststücke und lacht über Pannen.

- **Fiktion:** Manege, Scheinwerfer, ein Direktor als Silhouette gibt Zeichen, das Publikum sitzt als Silhouetten im Dunkeln. Die
  Kugel ragt aus dem Bildrand wie aus einer Versenkung.
- **Kernschleife:**
  - *Sekunden:* ein Zeichen kommt (ein Reifen wird hochgehalten, der Clown wirft einen Ball), der Spieler bringt Ozzy rechtzeitig in
    Lage und Tempo, Ozzy macht sein Kunststück (Sprung durch den Reifen, Ball auf der Nase, Männchen), Applaus.
  - *Eine Nummer (45 bis 90 s):* zu Musik, mit zwei Zählern: **Applaus** für Können, **Lacher** für Pannen. Zum Schluss Vorhang und
    Verbeugung (der vorhandene „Diener“).
  - *Über Tage:* neue Nummern, Kostüme, ein größeres Zelt, eine Tournee.
- **Steuerung:** Ziehen; optional Antippen als Zeichen „Hopp!“, nach dem Ozzy beim nächsten passenden Moment springt.
- **Ozzy:** Rampensau (bei viel Applaus übermütig, macht ungefragt Kunststücke), Lampenfieber (wenn es still ist, zögert er),
  Ablenkung durch die Wurst des Clowns.
- **Requisiten:** Reifen, Bälle, die Bananenschale des Clowns, eine Wippe mit der Katze als Partnerin, eine Konfettikanone, ein
  Scheinwerferkegel, in dem Ozzy bleiben will.
- **Scheitern:** Pannen bringen Lacher, also Punkte. Nur Langeweile (weder Applaus noch Lacher) senkt den Vorhang früher.
- **Witz-Momente:** Verbeugung nach jedem Plumps; der Clown rutscht auf der eigenen Schale aus; ein Ball prallt von Ozzys Kopf ins
  Publikum.
- **Stärken:** Stürze werden belohnt, Frust bleibt aus; kurze Sitzungen; Musik gibt Struktur; zeigt Kostüme, Posen und Licht.
- **Schwächen:** braucht Takt und Musik, Publikumsreaktionen und mehr Inhalte; Gefahr des Geskripteten; die Physik kennt keinen Takt,
  also nur weiche Zeitfenster.
- **Editor zusätzlich:** Musik-Zeitachse mit Zeichen, Zähler als Formen, Publikum als Menge von Instanzen mit Varianz, Lichtkegel.

### C „Platsch!“: Baumstamm-Duell

**In einem Satz:** Ozzy und ein Biber stehen auf demselben schwimmenden Stamm; der Spieler dreht ihn so, dass Ozzy oben bleibt und
der Biber ins Wasser fällt.

- **Fiktion:** ein See; die Wasserlinie ist der Bildrand, die Wölbung ist also ehrlich abgeschnitten. Gegner: Biber, Ente, Otter,
  später die Katze.
- **Kernschleife:**
  - *Sekunden:* Beide stehen an verschiedenen Stellen der Wölbung, also auf verschiedenen Hängen. Eine Drehung, die Ozzy zum Scheitel
    bringt, schiebt den Biber hangabwärts. Der Biber läuft selbst gegen, bremst abrupt, kehrt um, und jeder seiner Schritte dreht den
    leichten Stamm mit (Rückwirkung).
  - *Eine Runde (20 bis 40 s):* drei von fünf Durchgängen wie im echten Logrolling.
  - *Über Tage:* eine Gegnerleiter mit eigenen Tricks; die Stämme werden dünner (Größen I bis V), kippen also schneller.
- **Steuerung:** Ziehen; der Stamm ist leicht.
- **Ozzy:** Ehrgeiz; er bellt den Biber an und bleibt dabei stehen; nach dem Bad schüttelt er sich.
- **Hindernisse:** der Gegner, Wellen, die den Stamm anstoßen, Seerosen, eine Ente, die auf dem Stamm landet und ihn beschwert.
- **Scheitern:** Platsch, Hundepaddeln, zurückklettern, Durchgang verloren.
- **Witz-Momente:** beide fallen gleichzeitig; der Biber nagt eine Kerbe in den Stamm (eine neue Stufe auf der Wölbung); Ozzy schüttelt
  sich direkt neben dem Biber.
- **Stärken:** glasklares Ziel, kurze Runden, Wettkampf; zeigt Rückwirkung und Wasser (Verschmelzen, Spritzer); später zwei Spieler.
- **Schwächen:** braucht eine zweite Figur mit eigenem Gleichgewichts-Verhalten (doppelter Aufwand für Formen, Posen und Physik), eine
  Gegner-KI und viel Abstimmung; wenig Hindernisvielfalt; weniger Gassi-Gefühl.
- **Editor zusätzlich:** zweite Figur mit Gleichgewichts-Verhalten, Gegner-Taktiken als Regeln, Wasser mit Oberfläche und Spritzern,
  Wertung nach Durchgängen.

### D „Ozzy will nicht“: Sturkopf-Rätsel

**In einem Satz:** Ozzy soll ins Bad, zum Tierarzt oder ins Körbchen und will nicht; der Spieler überlistet ihn mit dem Rad und ein
paar Ködern.

- **Fiktion:** kleine Alltagswelten (Badezimmer-Rad, Wartezimmer-Rad); das Ziel ist ein Ort auf dem Rand.
- **Kernschleife:**
  - *Sekunden:* Ozzys Wünsche lesen (Kopf, Ohren, Nase), das Rad drehen, Köder legen (Wurst, Quietschball, Pfeife), Dinge auf dem Rand
    nutzen (der Ball rollt den Hang hinab und lockt ihn; die Wippe schleudert eine Wurst).
  - *Ein Rätsel (1 bis 3 min):* Sterne für wenige Köder.
  - *Über Tage:* eine Besorgungsliste, neue Köder, neue Ängste.
- **Ozzy:** Bedürfnisse (Hunger, Neugier, Angst, Energie) mit klaren Zeichen; er durchschaut einen Köder auch einmal.
- **Hindernisse:** Mechanismen (Wippe, Eimer, Tür, Seil) und andere Tiere.
- **Scheitern:** weich; ein Tippen setzt zurück.
- **Witz-Momente:** der Klassiker Hund gegen Mensch; Ozzy riecht die versteckte Tablette in der Wurst und schaut in die Kamera.
- **Stärken:** Persönlichkeit im Mittelpunkt; wenig Reflexe nötig, also breites Publikum; zeigt die Logik des Editors stark.
- **Schwächen:** Rätselbau je Level ist aufwendig; das Balancieren tritt zurück; das Verhalten muss sehr lesbar sein (Risiko wie bei
  Trico); Köder sind ein zweites Verb mit eigener Bedienung.
- **Editor zusätzlich:** Bedürfnis-Modell, Köder als Dinge mit Reizradius, Rätselzustände, Zurücksetzen.

### E „Agility-Pokal“: Hundesport auf dem Rad

**In einem Satz:** Ozzy läuft einen Agility-Parcours, der auf dem Rand des Rads aufgebaut ist; der Spieler ist der Hundeführer, der
ihn nur über das Rad lenkt.

- **Fiktion:** ein Turnier mit Richter und Stoppuhr, Publikum, Medaillen.
- **Kernschleife:**
  - *Sekunden:* Jedes Gerät verlangt ein Tempo und eine Lage: Hürde und Reifen im Trab; Tunnel (Ozzy verschwindet, das Tempo muss
    blind gehalten werden); A-Wand als Erhöhung; Steg schmal und hoch, also langsam; Wippe (in der Mitte warten, bis sie kippt);
    Slalom (das Rad im Rhythmus hin und her); Tisch (fünf Sekunden stillhalten, auf einer Wölbung!); Kontaktzonen (eine Pfote auf die
    Farbe).
  - *Ein Lauf (40 bis 90 s):* Fehler für fallende Stangen, Verweigerungen, Vorbeilaufen und verpasste Kontaktzonen, dazu Zeitfehler;
    nach drei Verweigerungen Ausschluss (so in den gängigen Agility-Regeln, eigene Kenntnis); sofortiger Neustart.
  - *Über Tage:* Klassen, Medaillen, der „Geist“ des besten Laufs als Gegner, ein Tagesparcours.
- **Ozzy:** verweigert bei falschem Anlauf, lässt sich von der Wurst am Rand ablenken, stolziert nach einem fehlerfreien Lauf.
- **Witz-Momente:** die ernste Sportwelt gegen Ozzys Unsinn; Ozzy kommt mit Spinnweben aus dem Tunnel; die Wippe katapultiert ihn.
- **Stärken:** klare Regeln aus dem echten Sport; jedes Gerät eine eigene Fähigkeit; hoher Wiederspielwert (Zeit, Geist); die Geräte
  sind ein idealer Baukasten.
- **Schwächen:** wettkämpferisch und präzise statt gemütlich; der Geist braucht eine Physik, die auf jedem Gerät genau gleich abläuft
  (Bericht 08); die Komik muss bewusst hinein, sonst wird es Sport.
- **Editor zusätzlich:** Geräte als Dinge mit Regeln (Kontaktzone, Wippe), Zeitmessung, Fehlerzählung, Aufnahme und Wiedergabe als
  Geist, Parcours-Ansicht.

---

## 8. Gegenüberstellung der Richtungen

| Kriterium | A Gassirunde | B Kugelnummer | C Platsch! | D Ozzy will nicht | E Agility-Pokal |
|---|---|---|---|---|---|
| Nähe zu Florians Idee | sehr hoch | mittel | mittel | mittel | hoch |
| Witz | hoch (Alltag, Launen) | sehr hoch (Pannen werden Lacher) | hoch (Platsch) | hoch (Sturkopf) | mittel, muss gewollt werden |
| Verständlich ohne Text | sehr gut | gut (Zeichen lernen) | sehr gut | mittel | gut (Regeln kennt man) |
| Tiefe, Wiederspielwert | mittel bis hoch | mittel | hoch (Gegner) | mittel | hoch (Zeit, Geist) |
| Neue Systeme nötig | wenige | Takt, Publikum | zweite Figur, Gegner-KI, Wasser | Bedürfnisse, Köder, Rätsel | Regeln, Zeit, Geist |
| Zeigt den Editor | alles | Posen, Kostüme, Licht | Physik, Wasser | Logik | Physik, Logik |
| Frust-Risiko | niedrig bis mittel | sehr niedrig | mittel | mittel | mittel bis hoch |
| Passt aufs iPhone (kurz, eine Hand) | gut | sehr gut | sehr gut | gut | gut |
| Aufwand für Florian (Inhalte) | mittel | hoch | mittel (plus zweite Figur) | hoch (Rätsel) | mittel |

Ehrlich gesagt ist B die witzigste Richtung und C die klarste, aber beide brauchen große Systeme, die mit Ozzy auf dem Rad nichts zu
tun haben (Takt und Publikum, eine zweite Figur mit Gleichgewicht). A ist die Richtung, in der jede gebaute Fähigkeit später allen
anderen dient.

---

## 9. Empfehlung: die Demo „Gassirunde“

### 9.1 Warum

1. Sie setzt Florians Idee eins zu eins um: oben stehen, bergab tapsen, vorsichtig drehen, stolpern, springen, überlaufen, an
   Erhöhungen besonders balancieren, Eigensinn.
2. Sie braucht die wenigsten neuen Systeme: keine zweite Figur mit Gleichgewicht, keinen Takt, keine Rätsellogik, keine exakt
   wiederholbare Physik.
3. Sie zeigt trotzdem jede Fähigkeit des Editors: Morphs und Posen, gestaltete Übergänge, Physik vom Nachschwingen bis zum Sturz,
   Spiellogik mit Launen und Aufgaben, Verschmelzen in Pfützen und Staub.
4. Scheitern ist witzig statt hart (TumbleSeed-Lehre): kein Spielende, Andenken und Rückblick belohnen Pannen.
5. Alles, was für sie gebaut wird, dient später B bis E: Kunststücke für den Zirkus, Wasser und Rückwirkung fürs Duell, Ozzys
   Bedürfnisse fürs Rätsel, Hindernis-Grammatik für Agility.

Aus den anderen Richtungen übernimmt sie zwei Dinge: den **Pannen-Rückblick** (B, Super Meat Boy) und die **Hindernis-Grammatik**
(E, Springreiten): Jedes Ding verlangt genau ein Tempo.

### 9.2 Umfang

- **Spielwiese:** eine Welt ohne Ziel mit allen Dingen; im Editor lassen sich Launen per Knopf auslösen und Dinge fallen lassen
  (Ball, Wurst, Eimer Wasser). Sie ist Prüfstand (Bericht 08) und Spielzeug zugleich und entsteht zuerst.
- **Welt 1 „Garten“** (R 14 L, Rasen, Stehzone ±17°): Steinchen, Stamm, zwei Duftstellen, Schmetterling, ein kleiner Hügel, eine
  Wurst. Man lernt: Die Lage ist das Tempo, der Stamm will Trab.
- **Welt 2 „Park“** (R 11 L, Stehzone ±14°): großer Hügel, Pfütze, Wippe, schlafende Katze, ein Bachlauf als Lücke, ein Ball. Man
  lernt: Launen und Halten an Erhöhungen.
- **Welt 3 „Winter“** (R 12 L, Schnee und Eisflächen, Stehzone auf Eis ±6°): Eis, ein Schneeball, der beim Rollen wächst, ein
  Schneemann, vor dem Ozzy Angst hat. Man lernt: Rutschen.
- **Rahmen:** Startbild (Ozzy sitzt oben und wartet; das Anfassen des Rads startet), Himmel als Uhr, Fähnchen, Aufgabenzettel (drei
  je Welt), Rückblick, Tagebuchkarte (Überschriften in Lobster, der Projektschrift), Weltwahl als großes Rad mit den drei Welten auf
  dem Rand: Auch das Menü wird gedreht.

### 9.3 Ablauf einer Runde im Garten (Beispiel)

| Zeit | Was passiert | Was der Spieler tut |
|---|---|---|
| 0 s | Ozzy sitzt oben, Morgensonne | fasst das Rad an; Ozzy steht auf und schaut zum Finger |
| 0 bis 10 s | Steinchen | lässt ihn im Schritt gehen; wer zu schnell ist, sieht den ersten Stolperer |
| 10 bis 18 s | Duftstelle | hält das Rad an; Ozzy schnüffelt, der Schwanz kommt wieder in Fahrt |
| 18 bis 32 s | Stamm | bringt ihn in den Trab; Ozzy holt aus und springt |
| 32 bis 42 s | Schmetterling | lässt ihn jagen oder hält ihn darunter; Hochsprung |
| 42 bis 55 s | kleiner Hügel | bringt den Gipfel an den Scheitel und hält; das Gipfel-Wackeln |
| 55 bis 65 s | Wurst | drosselt die Gier; Bauchrutscher, wenn nicht |
| 65 bis 80 s | Heimweg, Sonne tief | Ozzy wird müde, gähnt; das Fähnchen kommt in Sicht |
| Ziel | Ankunft | die Kamera zieht auf, die ganze Welt im Abendlicht, dann Rückblick und Tagebuch |

### 9.4 Hindernis-Grammatik

| Ding | verlangt | zu langsam | zu schnell | Witz |
|---|---|---|---|---|
| Steinchen (0,15 L hoch) | Schritt | nichts | Stolperstein: Fangschritte, Ohrenflattern | Fangschritte mit großen Augen |
| Stamm (0,4 L hoch) | Trab | bleibt stehen, schnuppert, verweigert | springt zu früh, streift, purzelt drüber | Bauchlandung auf dem Stamm, rutscht ab |
| Lücke (1 L breit) | kurz vorher Galopp | bleibt an der Kante stehen und wackelt | harte Landung | fällt hinein, kraxelt mit Erde auf der Nase heraus |
| Hügel | Gipfel oben halten | rutscht zurück | fliegt über den Gipfel | Gipfel-Wackeln, der Schwanz rudert |
| Pfütze | Sprung im Trab oder Sturkopf überwinden | Sturkopf, Popo-Rutschen | platscht hinein | Schütteln, Tropfen auf der Kamera |
| Wippe | in der Mitte halten, bis sie kippt | – | die Wippe schlägt hoch, Ozzy fliegt | Katapult |
| Schlafende Katze | Schritt (leise) | – | Katze wacht auf, faucht, jagt ihn | Flucht rückwärts |
| Ball | nichts, er rollt mit dem Hang | – | – | Ozzy jagt ihn den Hang hinab |
| Trampolin | beliebig | kleiner Hüpfer | großer Bogen | Salto wider Willen |
| Eisfläche | Schritt, kaum Lage | – | rutscht in den Spagat | Pinguin-Bauchrutscher |

Das Tempofenster ist **keine Regel je Hindernis**. Es entsteht aus Ozzys Fähigkeiten: Sprungkraft und Schrittlänge bestimmen, ob
die Flugbahn über das Ding reicht (zu langsam: er sieht, dass es nicht reicht, und verweigert) und ob der Schrittplaner einen guten
Absprungpunkt findet (zu schnell: die Schritte sind zu lang, er springt zu früh oder streift). So bleibt Arbeitsregel 7 erfüllt
(keine Sonderregel, die einen Körper oder eine Lage nennt), und jedes neue Hindernis funktioniert sofort.

**Wer löst den Sprung aus?** Ozzy selbst, wenn das Tempo passt; der Spieler ist der Reiter, der den Anlauf macht. Das hält das
Spiel bei einem Verb und macht Verweigerungen zu Charakter. Als Prüfschalter in der Spielwiese gibt es „Springen auf Tippen“, damit
Florian beide Fassungen vergleichen kann.

### 9.5 Aufgaben (drei je Welt, gemischt aus Können und Unfug)

- **Garten:** eine Runde ohne Plumps · dem Schmetterling hinterherspringen · an beiden Duftstellen schnüffeln lassen
- **Park:** über die schlafende Katze springen, ohne dass sie aufwacht · Ozzy auf dem Hintern bis zur Pfütze rutschen lassen · die
  Wurst erwischen, bevor sie den Hang hinabrollt
- **Winter:** auf dem Bauch über das ganze Eis rutschen · einen Schneeball so groß wie Ozzy rollen · vor Sonnenuntergang ankommen

Unfug-Aufgaben laden dazu ein, mit der Physik zu spielen (Lehre aus Human: Fall Flat), und lehren nebenbei die Mechanik.

### 9.6 Scheitern und Hilfen

- Keine Leben, kein Spielende. Ein Sturz kostet mit Aufstehen zwei bis vier Sekunden, ein Abgang über den Bildrand fünf bis sechs.
- **Hilfe nach drei Fehlversuchen** am selben Ding (wie Rhythm Heaven): Es erscheint eine sichtbare Hilfe, etwa ein Brett über der
  Lücke; man darf sie ignorieren.
- **Zen-Runde** (wie bei Alto) ohne Sonnenuntergang.
- **Spieltempo 80 %** als Schalter.
- Die **Stimmung** wirkt als stille Anpassung (6.4).

### 9.7 Etappen mit vorher festgelegten Proben

Die Physik-Etappen 1 bis 5 aus Bericht 08 sind die Grundlage; die Demo-Etappen liegen darüber. Jede endet mit einem Bild oder einer
Aufnahme für Florian; „bestanden“ sagt nur er.

| Etappe | Inhalt | Probe |
|---|---|---|
| D0 Spielwiese | Rad mit Halten, Ziehen, Schwung; Ozzy steht, tapst, trabt, stolpert (Etappen 1 bis 3 aus 08); Lage gleich Tempo | 60 Sekunden auf dem iPhone: Ozzy lässt sich mit kleinen Bewegungen oben halten und in Schritt, Trab und Galopp bringen; grobes Rucken bringt ihn zum Stolpern |
| D1 Garten | Steinchen, Stamm, Duftstelle, Schmetterling, Hügel; Sprung aus dem Tempo; Fähnchen und Runde | eine Runde ist für Nicole ohne Erklärung zu schaffen; Florian erkennt jede Laune an ihrer Ankündigung |
| D2 Komik | Sturz, Aufstehen je Lage, Schütteln, Blick in die Kamera, Abgang über den Bildrand mit Andenken | drei Stürze, drei verschiedene Bilder, jedes Mal Aufstehen ohne Sprung in der Form |
| D3 Rahmen | Himmel als Uhr, Aufgaben, Rückblick, Tagebuch, Aufziehen der Kamera, Weltwahl als Rad | eine ganze Runde von 60 bis 90 Sekunden mit Endkarte |
| D4 Park und Winter | Pfütze (Verschmelzen), Wippe, Katze, Lücke, Eis, Schneeball | Vorher-nachher-Bilder der Effekte in derselben Ansicht |
| D5 Feinschliff | Ton, Musikstücke nach Gangart, Haptik in der App-Hülle | Florian spielt die Demo auf dem iPhone 16 |

### 9.8 Risiken und Gegenmittel

| Risiko | Gegenmittel |
|---|---|
| zu schwer (umgekehrtes Pendel) | großer Radius, große Stehzone, mittleres Radgewicht, Hilfen nach drei Fehlversuchen; früh mit Nicole testen |
| eintönig (wie LocoRoco) | jede Welt bringt eine neue physikalische Idee (Tempo, Erhöhungen und Launen, Rutschen) |
| Eigensinn wirkt unfair (wie Trico) | immer ankündigen, kurz halten, an Orte binden, nie zwei Launen zugleich |
| Stürze wiederholen sich | Physik für die Abwandlung, mehrere Sturz- und Liegeposen, Andenken |
| Tempo schwer zu lesen | Gangart als Tacho, Kontaktschatten, Hindernisse mit eindeutiger Form |
| Home-Balken stört | Anfassen überall; in der App-Hülle Systemgesten unten zurückstellen |
| Umfang wächst | feste Teileliste (10.11), weitere Richtungen erst nach der Demo |

---

## 10. Was Studio dafür können muss

Grundsatz: Die Demo wird komplett mit dem Editor gebaut. Was dafür als Code entsteht, ist ein allgemeiner Baustein (Löser,
Verhalten, Karten-System, Laufzeit), nie Spielcode nur für Ozzy. Die Begriffe folgen Bericht 05 (Posen, Regler, Wege, Ebenen,
Spielwerte, Verbindungen, Regeln je Pose) und Bericht 08 (Bremskraft, Haftung, Spannung, Prüfstand).

### 10.1 Formen

- **Ozzy (vorhanden):** alle Teile, Kopfdrehung 360°, die fünf Haltungen. **Neu:** Gesichtsausdrücke als Schlüsselformen (Augen offen,
  zu, groß, müde; Stirn neugierig, besorgt, beleidigt, stolz; Maul zu, hechelnd mit Zunge, gähnend, bellend), Ohrstellungen und
  Schwanzformen als Regler (hoch, zurück, eingezogen, wedelnd).
- **Die Welt:** ein geschlossener Vektorpfad. Hügel, Lücken und Stufen sind Bearbeitungen dieses Pfads (Punkte und Griffe ziehen),
  keine eigenen Objekte. Dazu ein Oberflächenband (Gras, Schnee, Eis) als zweite Form und Dekor auf dem Rand (Halme, Blumen) als
  Instanzen mit leichter Varianz.
- **Dinge:** Steinchen, Stamm, Pfütze, Wippe (Brett und Bock), Trampolin, Ball, Wurst, Schmetterling (zwei Flügelschlüssel), Katze
  (schläft, blinzelt, Buckel, rennt, sitzt), Vogel (optional), Laubhaufen, Rasensprenger, Schneeball, Schneemann, Fähnchen,
  Duftstellen (Blume oder unsichtbar), Andenken (Blatt, Blumentopf, Socke, Eimer).
- **Effekte als Formen:** Staubtropfen, Wassertropfen, Sterne, Schweißtropfen, Tropfen auf der Kamera, Konfetti.
- **Rahmen:** Himmel (Verlauf), Sonne, Wolken, ferne Hügel (Parallaxe), Aufgabenzettel, Tagebuchseite, Weltwahl-Rad, Schrift Lobster.

### 10.2 Posen

| Gruppe | Posen | Stand |
|---|---|---|
| Grund | Stehen, Hocke, Sitzen, Liegen, Diener (als Spielverbeugung) | vorhanden |
| Gang | Schritt, Trab, Galopp als Zyklen über die Phase; Bremsen und Stemmen; Kehrtwende | neu |
| Balance | Feld aus Kippen vor und zurück mal Wackeln; Schwanz als Gegengewicht | neu (Bericht 05) |
| Sprung | Ausholen, Absprung, Flug, Landung; Jagdsprung; Schrecksprung | neu |
| Laune | Schnüffeln, Kopf schief, Gähnen, Schlafen, Ducken und Zittern, Kratzen stehend und liegend, Stolzieren, Schnuppern, Bellen | neu |
| Panne | Stolpern (zwei bis drei Zwischenposen), Purzeln, Bauchlage, Seitenlage, Rückenlage mit Strampeln, Bauchrutscher, Kanten-Wackeln | neu |
| Erholung | Aufstehen je Lage (drei Wege), Schütteln (Zyklus), Blick in die Kamera (Kopfdrehung mit Ausdruck) | neu |
| Andere Figuren | Katze (fünf), Schmetterling (zwei), Vogel (zwei) | neu |

Rund 35 Posen für Ozzy, davon fünf vorhanden. Viele sind kleine Abwandlungen. Popo-Rutschen braucht keine eigene Pose: Es ist
Sitzen plus Physik.

### 10.3 Übergänge

- **Standardweg** zwischen allen Posen: Trägheits-Übergang und Federn (Bericht 05).
- **Gestaltete Wege**, die Florian selbst formt (wie heute die Kopfdrehung im Werkzeug): Hinsetzen, Aufstehen, Umlegen (vorhanden);
  neu Stehen → Ausholen → Sprung → Landung, Stolpern → Purzeln, Aufstehen je Lage, Diener → Galopp (Start des Flitzens),
  Galopp → Hinplumpsen (Ende), Kehrtwende, Schreck.
- **Unterbrechbar** an Haltepunkten (Stolpern mitten im Hinsetzen); Zyklen über die Phase (Gangart aus dem Tempo).
- **Ebenen:** Körper, Kopf, Gesicht, Ohren und Schwanz (Physik); ein Ausdruck läuft unabhängig von der Körperpose.

### 10.4 Physik

- **Rad:** starrer Körper an einer Achse; Feder zum Finger mit Kraftgrenze; Trägheit (Radgewicht), Lagerreibung, Rückwirkung von
  Ozzys Schritten; Schwerkraft und Material je Welt; Kollision am Abstandsfeld des Weltpfads (dieselbe Form, die gezeichnet wird).
- **Ozzy:** das Körpermodell aus Bericht 08 (Körperbrocken, Federbeine, begrenzte Bremskraft, Schrittplaner, Sprung, Stolper-Auslöser,
  aktive Ragdoll mit Spannungskurve, Aufstehen je Lage) und das Nachschwingen von Ohren, Bart, Schwanz und Bauch.
- **Dinge:** fest (Stamm, Steinchen), lose (Ball, Wurst, Schneeball, der beim Rollen wächst), weich (Gelee, später), flüssig
  (Pfütze als Fläche, Spritzer als Tropfen, die verschmelzen), Gelenke (Wippe, Trampolinfeder), einfache Flugbahnen (Schmetterling).
- **Fühler:** Zonen auf dem Rand (Duftstelle, Angstzone), Blick voraus (Hindernis: Art, Abstand, Höhe), Kontakte (gelandet,
  gestoßen, gefallen).
- **Zeit:** fester Takt, Zeitfaktor für Zeitlupe, Aufnahme für den Rückblick.

### 10.5 Logik

- **Verhaltens-Vorlagen** mit Reglern, die man an Dinge hängt (wie GDevelops Verhaltensbausteine): „Vierbeiner“ (alles aus 10.4 für
  Ozzy und die Katze), „Rad“, „Ding“ (fest, lose, weich, flüssig), „Flieger“ (Schmetterling), „Schläfer“ (wacht bei Lärm oder Tempo
  auf).
- **Spielwerte** (Bericht 05): Neigung unter Ozzy, Tempo, Kippen, Kontakt je Pfote, Hindernis voraus, Laune, Rundenfortschritt,
  Tageszeit.
- **Verbindungen:** Spielwert zu Regler über eine gezeichnete Kennlinie (Neigung zu Balance, Tempo zu Gangphase, Tageszeit zu
  Himmelsverlauf, Gangart zu Musikstück).
- **Launen-Karten:** „Wenn [Auslöser] und [Bedingung] → Ankündigung [Pose, Ausdruck, Dauer] → Laune [Sollwerte, Pose, Dauer] → Ende
  [Bedingung] → danach [Pose]“. Häufigkeit über die Charakter-Regler (6.3).
- **Ereignis-Karten** wie in Construct oder GDevelop: „Wenn [Ereignis] → [Aktionen]“ (Klang, Effekt, Zähler, Kamera, Haptik).
  Construct beschreibt sein Ereignissystem als für Nicht-Programmierer viel leichter als Skripte; Bericht 02 zeigt, dass der
  Zustandsautomat bei Rive für Gestalter der schwerste Teil ist. Deshalb Karten an der Figur und an den Dingen (Regeln je Pose aus
  Bericht 05) als Liste; ein Graph höchstens als Ansicht.
- **Zähler, Ziele, Uhr:** Aufgaben als Bedingungen über Ereignisse und Zähler („springt über die Katze, und sie schläft weiter“);
  Tageszeit als Uhr; Ende der Runde.
- **Kamera-Regeln:** Rahmen mit unten abgeschnittenem Rad, leicht zurückziehen bei hohem Tempo, folgen beim Absturz, Aufziehen am Ende.
- **Speichern:** Fortschritt, Sterne, Andenken.

### 10.6 Welt und Bühne

- **Welt gleich Rad:** Radius, Schwerkraft, Material, Radgewicht als sichtbare Regler an der Welt.
- **Dinge auf den Rand ziehen:** Sie rasten auf der Oberfläche ein und richten sich nach ihr aus.
- **Abgewickelte Strecke:** die ganze Runde als Band unter der Bühne. Dinge lassen sich darauf verschieben; Farben zeigen, welches
  Tempo jede Stelle verlangt. Das Band funktioniert wie eine Zeitleiste der Runde und folgt derselben Grammatik (Klick springt,
  Ziehen fährt).
- **Himmel:** Verlauf nach Tageszeit, Sonnenstand.
- **Sofort spielen:** jederzeit auf der Bühne mit denselben Gesten spielen, auf Mac und iPad.

### 10.7 Effekte (Bericht 10)

Weiches Verschmelzen (Pfützen, Spritzer, Staub, Schlamm), Kontaktschatten, Stauchen und Strecken ohne Flächenverlust, Sterne auf
einer Kreisbahn, Tropfen auf der Kamera, Himmelsverlauf. Schmierbilder bei schnellen Bewegungen nur nach Florians Wort.

### 10.8 Ton und Haptik

Klang an Ereignissen und Posen (Tapp, Plumps, Fiepen, Schütteln, Rumpeln nach Tempo); Musik in Stücken, die nach einem Spielwert
gewählt werden (Gangart, Stimmung) wie in Untitled Goose Game; Haptik-Ereignisse (Ticks beim Drehen, Stöße bei Landung und Sturz),
die nur in der App-Hülle wirken.

### 10.9 Prüfstand

Röntgenansicht (Schwerpunkt, Stützstrecke, Kipppunkt, Tempofenster des nächsten Dings), Launen per Knopf, Zeitlupe und
Einzelschritt, Regler live während des Spiels, Aufnahme und Rückblick, Dinge fallen lassen, Schalter für die Steuerungsvarianten
(Neigen, zwei Daumen, Springen auf Tippen).

### 10.10 Ausgabe

Eine Web-Laufzeit für iPhone und Mac (WebGL2, Bericht 10), später eine App-Hülle mit Capacitor für Haptik und das Zurückstellen der
Systemgesten am unteren Rand. Leistung nach den Budgets der Berichte 08 und 10.

### 10.11 Teileliste der Demo

| Bereich | Muss (D0 bis D3) | Soll (D4) | Kann (später) |
|---|---|---|---|
| Ozzy | Grund, Gang, Balance, Sprung, Schnüffeln, Sturkopf, Stolpern, Purzeln, drei Liegeposen, Aufstehen, Schütteln, Blick | Flitzen, Jagen, Müde, Angst | Kratzen, Übermut, Gier, Bellen |
| Welt | Garten | Park, Winter | Strand, Stadt, Jahrmarkt |
| Dinge | Steinchen, Stamm, Hügel, Duftstelle, Fähnchen, Wurst | Pfütze, Wippe, Lücke, Katze, Ball, Schmetterling, Eis, Schneeball | Trampolin, Vogel, Rasensprenger, Laubhaufen |
| Rahmen | Himmel als Uhr, Endkarte | Aufgaben, Rückblick, Tagebuch, Weltwahl-Rad, Andenken | Tagesrunde, Halsbänder |
| Effekte | Staub, Kontaktschatten, Stauchen | Pfütze und Spritzer, Tropfen auf der Kamera, Sterne | Schmierbilder |
| Ton | Tapp, Plumps, Rumpeln | Musikstücke, Fiepen, Schütteln | Haptik in der App |

### 10.12 Wer macht was

- **Wir bauen einmal (Code):** Löser, Verhaltens-Vorlagen, Karten-System, Laufzeit, Prüfstand.
- **Wir legen zuerst an (im Editor, grob):** alle Formen, Posen, Wege, Launen, Welten und Aufgaben der Teileliste.
- **Florian stellt ein:** Look, Posen, gestaltete Wege, Timing, Regler, Häufigkeit der Launen, Aufbau der Welten.

---

## 11. Gegenüberstellungen kompakt

| Frage | Möglichkeiten | Urteil |
|---|---|---|
| Welche Richtung für die erste Demo? | A Gassirunde, B Kugelnummer, C Platsch!, D Ozzy will nicht, E Agility-Pokal | **A**, mit Pannen-Rückblick aus B und Hindernis-Grammatik aus E |
| Wohin zeigt die Schwerkraft? | zur Mitte (Planet), nach unten (Rad) | **nach unten**, sonst gibt es keine Hänge |
| Oben auf dem Rad oder innen im Laufrad? | oben (instabil, Balance), innen (stabil, Pendel) | **oben**; das Laufrad höchstens als Bonus |
| Wie steuert man das Rad? | Ziehen am Rad, Ziehen überall, Neigen, zwei Daumen, Drehknopf | **Ziehen überall** mit Fingermarke am Rand, Halten und Schwung; Neigen und zwei Daumen als Schalter |
| Wer löst den Sprung aus? | Ozzy aus dem Tempo, Tippen, Ruck am Rad | **Ozzy aus dem Tempo**; Tippen als Prüfschalter |
| Woher kommt das Tempofenster? | Regel je Hindernis, Ozzys Sprungkraft und Schrittlänge | **aus Ozzys Fähigkeiten**, keine Sonderregel |
| Wie hart ist Scheitern? | weich, Rückschlag, Neustart | **weich** plus physikalischer Rückschlag; kein Spielende |
| Wie kommt der Eigensinn? | Zufall, angekündigt, an Orte gebunden | **angekündigt und meist an Orte gebunden**, kurz |
| Physik oder Cartoon? | echte Bahnen, Cartoon-Physik | **echte Bahnen**; Cartoon nur in Zeit, Posen und hinter dem Bildrand |
| Anzeigen? | Leisten und Zahlen, Körper und Himmel | **Körper und Himmel**; Text nur auf der Endkarte |
| Format? | Querformat, Hochformat | **Querformat** für die Demo, Hochformat später prüfen |
| Länge einer Welt? | eine Runde, langes Band, Kette von Rädern | **eine Runde von 60 bis 90 s**; Ketten später |
| Logik im Editor? | Pfeil-Graph, Ereignis-Karten, Verhaltens-Vorlagen | **Vorlagen mit Reglern plus Karten**; Graph nur als Ansicht |
| Rad-Rückwirkung? | keine, mittel, stark | **mittel** in der Gassirunde, **stark** im Duell |

---

## 12. Offene Fragen an Florian

1. **Richtung:** Fühlt sich die Gassirunde am meisten nach Ozzy an, oder reizt dich der Zirkus (Pannen werden Lacher) oder das Duell
   mit dem Biber mehr?
2. **Sprung:** Soll Ozzy selbst springen, wenn das Tempo passt (der Spieler ist der Reiter), oder auf Tippen?
3. **Eigensinn:** selten und charmant oder häufig und herausfordernd?
4. **Bildrand:** Darf Ozzy über den Bildrand verschwinden, nur hörbar sein und mit einem Andenken zurückkommen?
5. **Streicheln:** Soll man Ozzy antippen können (beruhigen, ermutigen), oder bleibt es bei einem Verb?
6. **Rad:** Soll Ozzy das Rad beim Laufen spürbar mitdrehen (wie einen Baumstamm im Wasser) oder fast nicht (wie Boden)?
7. **Hang:** Wie früh soll Ozzy losdappeln: Stehzone ±8° (realistisch, schwerer) oder ±17° (gutmütig)?
8. **Format:** Querformat oder Hochformat auf dem iPhone?
9. **Fiktion der Scheibe:** kleine Welt (Garten, Park, Winter), Riesenkugel, Trommel oder Baumstamm?
10. **Weitere Figuren:** Katze, Schmetterling und Vogel brauchen eigene Formen und Posen. In der Demo oder später?
11. **Ton und Musik:** schon in der Demo?
12. **Neigen:** als Zusatzmodus ausprobieren?
13. **Name:** „Gassirunde“?

---

## 13. Quellen

**Spiele: die Welt bewegen, Hänge, kleine Welten**

- LocoRoco: https://en.wikipedia.org/wiki/LocoRoco
- Super Monkey Ball: https://en.wikipedia.org/wiki/Super_Monkey_Ball_(video_game)
- Kirby Tilt 'n' Tumble: https://en.wikipedia.org/wiki/Kirby_Tilt_%27n%27_Tumble
- Rolando: https://en.wikipedia.org/wiki/Rolando_(video_game)
- And Yet It Moves: https://en.wikipedia.org/wiki/And_Yet_It_Moves
- TumbleSeed: https://en.wikipedia.org/wiki/TumbleSeed
- Lemmings: https://en.wikipedia.org/wiki/Lemmings_(video_game)
- Tiny Wings: https://en.wikipedia.org/wiki/Tiny_Wings · https://de.wikipedia.org/wiki/Tiny_Wings
- Alto's Adventure: https://en.wikipedia.org/wiki/Alto%27s_Adventure · Alto's Odyssey: https://en.wikipedia.org/wiki/Alto%27s_Odyssey
- Doodle Jump: https://en.wikipedia.org/wiki/Doodle_Jump
- Super Mario Galaxy: https://en.wikipedia.org/wiki/Super_Mario_Galaxy

**Spiele: Komik aus Physik**

- QWOP: https://en.wikipedia.org/wiki/QWOP
- Getting Over It with Bennett Foddy: https://en.wikipedia.org/wiki/Getting_Over_It_with_Bennett_Foddy
- Human: Fall Flat: https://en.wikipedia.org/wiki/Human_Fall_Flat
- Octodad: Dadliest Catch: https://en.wikipedia.org/wiki/Octodad:_Dadliest_Catch
- Goat Simulator: https://en.wikipedia.org/wiki/Goat_Simulator
- Fall Guys: https://en.wikipedia.org/wiki/Fall_Guys
- Snake Pass: https://en.wikipedia.org/wiki/Snake_Pass_(video_game)
- Pikuniku: https://en.wikipedia.org/wiki/Pikuniku
- Clumsy Ninja: https://en.wikipedia.org/wiki/Clumsy_Ninja
- Wobbledogs: https://en.wikipedia.org/wiki/Wobbledogs

**Spiele: Begleiter, Struktur, Belohnung**

- The Last Guardian: https://en.wikipedia.org/wiki/The_Last_Guardian
- Nintendogs: https://en.wikipedia.org/wiki/Nintendogs
- Haunting Ground: https://en.wikipedia.org/wiki/Haunting_Ground
- Talking Tom and Friends: https://en.wikipedia.org/wiki/Talking_Tom_and_Friends
- Untitled Goose Game: https://en.wikipedia.org/wiki/Untitled_Goose_Game
- Super Meat Boy: https://en.wikipedia.org/wiki/Super_Meat_Boy
- Rhythm Heaven: https://en.wikipedia.org/wiki/Rhythm_Heaven

**Wirkliche Welt**

- Logrolling: https://en.wikipedia.org/wiki/Logrolling_(sport)
- Hunde-Agility: https://en.wikipedia.org/wiki/Dog_agility
- Springreiten: https://en.wikipedia.org/wiki/Show_jumping
- Flitzen (Zoomies): https://en.wikipedia.org/wiki/Zoomies
- Umgekehrtes Pendel: https://en.wikipedia.org/wiki/Inverted_pendulum

**Spielgefühl, Animation, Humor**

- Steve Swink, Game Feel: The Secret Ingredient: https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient
- Spielgefühl (mit „Juice it or lose it“ und Berbece, „Why Your Death Animation Sucks“): https://en.wikipedia.org/wiki/Game_feel
- Zwölf Prinzipien der Animation (Thomas und Johnston): https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
- Theorien des Humors (Inkongruenz, harmlose Verletzung nach McGraw und Warren 2010): https://en.wikipedia.org/wiki/Theories_of_humor
- Chuck Jones' Regeln (Wile E. Coyote and the Road Runner): https://en.wikipedia.org/wiki/Wile_E._Coyote_and_the_Road_Runner

**Bedienung auf iPhone und Mac**

- Steven Hoober, How Do Users Really Hold Mobile Devices? (UXmatters 2013): https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- Apple Human Interface Guidelines, Game controls: https://developer.apple.com/design/human-interface-guidelines/game-controls
- Apple, preferredScreenEdgesDeferringSystemGestures: https://developer.apple.com/documentation/uikit/uiviewcontroller/preferredscreenedgesdeferringsystemgestures
- MDN, DeviceOrientationEvent.requestPermission(): https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
- Can I use, Vibration API: https://caniuse.com/vibration
- Capacitor Haptics: https://capacitorjs.com/docs/apis/haptics

**Spiellogik ohne Code**

- GDevelop, Behaviors: https://wiki.gdevelop.io/gdevelop5/behaviors/
- Construct 3, How events work: https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/events/how-events-work

**Berichte dieses Ordners**

- 02 Rive, Lottie, Vektor (Zustandsautomat als größte Hürde für Gestalter): `02-rive-lottie-vektor.md`
- 05 Posen, Übergänge und Zeit (Bediengrammatik, Skizze Ozzy auf dem Rad): `05-posen-uebergaenge-zeit.md`
- 08 Figurenphysik (Körpermodell, Bremskraft, Zustände, Prüfstand, Etappen): `08-figurenphysik.md`
- 10 Rendern und Shader (Verschmelzen, Kontaktschatten, Stauchen, Schmierbilder): `10-rendern-shader.md`
