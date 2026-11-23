# Ozzy als Suite, Teil 4: Eine Grammatik für alles

Stand 23.11.2026, abends. Reines Brainstorming; nichts gebaut, nichts getestet. Vorher: Teil 1
([Recherche und Konzept](2026-11-23-ozzy-suite-recherche-und-konzept.md)), Teil 2 ([Tempo, Ansichten](2026-11-23-ozzy-suite-teil-2-tempo-ansichten.md)),
Teil 3 ([Storyboard](2026-11-23-ozzy-suite-teil-3-storyboard.md)).

**Deine Worte (23.11.):** „Alles gute Ideen, aber es reicht mir noch nicht als komplettes Konzept.“ Zum Schnitt: „Wenn nur wenige
Punkte auf der Linie sind, wie bearbeitet man dann den Querschnitt an beliebiger Stelle, ohne ungewisse Ergebnisse zu erhalten, je
nachdem wo die Ecken vor oder hinter dem Querschnitt liegen? Oder dient das nur der Ansicht?“ Und: „Ich hätte gerne ein noch
allgemeineres Konzept. Ob Häuser, Autos oder etwas ganz Abstraktes, alles soll im Grunde gleich funktionieren. Rundes wird als Blase
aufgeblasen. Eckiges aus dem Boden gezogen. Beides lässt sich im Anschluss rund oder eckig machen. Eckig hat ein schönes Stein- oder
metallisches Material, rund die Bubble. Beides lässt sich kombinieren. Wie Material und Shader zusammenspielen, ist noch nicht ganz
ausgefeilt. Man sollte immer volle Kontrolle über alles haben, auch bei Posen, Animationen und Partikeln.“

## 0 Kurzfassung

1. **Der Schnitt ist zuerst eine Ansicht.** Bearbeitbar wird er nur über eindeutige Regeln. Bei gezogenen Körpern bearbeitet man im
   Schnitt Profil und Maße. Bei geblasenen setzt der erste Zug eine neue Linie genau in die Schnittebene, und nur bis zu den
   Nachbarlinien ändert sich etwas. Ecken vor oder hinter dem Schnitt bleiben, wo sie sind.
2. **Eine Grammatik für alles, vier Wörter: Linie, Körper, Rundung, Verbindung.** Jede Form beginnt als Linie. Ein Körper entsteht
   durch Blasen (rund) oder Ziehen (eckig: hoch, entlang, rundum). Ein Regler Rundung führt stufenlos von eckig zu rund, je Körper, je
   Kante und je Naht. Körper verschmelzen, setzen an oder schneiden aus.
3. **Hochziehen und Aufblasen sind zwei Enden desselben Reglers.** Rundung 0 ist ein Prisma mit scharfen Kanten, Rundung 1 eine Blase
   mit runden Querschnitten; dazwischen liegen Kissen und Kiesel.
4. **Aussehen in vier Schichten:** Werkstoff (was es ist, je Körper), Bemalung (wo welche Farbe und welcher Werkstoff, in Ebenen), Stil
   (wie gezeichnet wird, je Szene), Licht (Stimmung, je Szene). Aus den vier baut Ozzy den Shader. Die 94 Shader werden in Werkstoffe
   und Stile sortiert.
5. **Bewegung:** Alles, was sich ändern kann, ist ein Regler; Animation ist ein Regler über die Zeit. Das gilt für Posen, Bahnen,
   Verhalten, Ströme (Partikel), Physik, sogar für Rundung und Werkstoff. Jede Automatik lässt sich als bearbeitbare Kurve festhalten.
6. **Morgen als Erstes:** aus Teil 1 bis 4 ein einziges Gesamtkonzept mit dieser Grammatik als Mitte. Danach als erster Beweis der
   Regler Rundung an einem Umriss, daneben die Tempo-Messseite (20 Minuten mit deinem iPhone).

## 1 Der Querschnitt: Ansicht oder Werkzeug?

**Zuerst Ansicht.** Die Ebene am Tropfen zeigt das Innere (Räume, Maul) und blendet aus, was davor liegt.

**Bearbeiten im Schnitt, ohne ungewisse Ergebnisse:**

| Körper | Was der Schnitt zeigt | Was man darin bearbeitet |
| --- | --- | --- |
| gezogen (Stein, Metall) | Profil und Höhen | Im waagrechten Schnitt das Profil; es gilt für den ganzen Körper wie ein Grundriss. Im senkrechten Schnitt Höhen und Dicken (Wandhöhe, Deckenstärke, Brüstung). Soll sich die Form nur ab einer Höhe ändern, entsteht dort sichtbar ein neues Profil („ab hier“), nie stillschweigend. |
| geblasen (Seifenhaut) | den Umriss der Haut in der Ebene | Der erste Zug setzt eine neue Linie genau in die Schnittebene, auf die heutige Haut; beim Einsetzen ändert sich nichts. Sie bekommt so viele Punkte, wie die Form dort braucht, Ecken werden Knickpunkte. Bearbeitet wird diese Linie. Die Änderung reicht nur bis zu den Nachbarlinien davor und dahinter, und die leuchten vorher auf. |
| zusammengesetzt | jedes Teil in eigener Farbe | Man bearbeitet das Teil, das man berührt; die Naht folgt. |

**Warum es eindeutig bleibt:** Eine Änderung wirkt immer auf eine Linie, die genau in der Ebene liegt. Was davor und dahinter liegt,
halten die vorhandenen Linien fest, und den Einflussbereich sieht man, bevor man zieht. Ozzy kennt das schon: Der Lichtring zeigt vor
dem Einfügen, wo ein Loop rundum laufen wird. Der Schnitt ist derselbe Weg, nur mit einer Ebene, die man frei setzt.

**Für Architektur heißt das:** Im Schnitt bearbeitet man Maße und Profile der Bauteile, keine freien Flächen. So arbeiten auch
Architekturprogramme: Der Schnitt ist eine Ansicht auf Bauteile mit Maßen.

## 2 Die Grammatik: vier Wörter

| Wort | Was es ist | Beispiele |
| --- | --- | --- |
| **Linie** | Alles beginnt als Linie: geschlossen ein Umriss, offen ein Weg. Punkte, Griffe und Knicke wie heute. | Silhouette, Grundriss, Seitenprofil eines Autos, Bahn |
| **Körper** | Aus einer Linie wird ein Körper: **blasen** (rund) oder **ziehen** (eckig). Ziehen geht hoch (aus dem Boden), entlang einer Linie (Schlauch, Leiste) oder rundum (Drehen: Rad, Vase). | Glimm wird geblasen, ein Haus hochgezogen, ein Rad gedreht, ein Schwanz entlang gezogen |
| **Rundung** | ein Regler von eckig bis rund, je Körper, je Kante und je Naht, jederzeit änderbar | eckige Blase = Seifenwürfel, runder Stein = Kiesel, Auto mit weichen Kanten |
| **Verbindung** | Körper verschmelzen (weich), setzen an (hart) oder schneiden aus (Fenster, Maul, Löcher). Auch die Naht hat eine Rundung. | Horn am Kopf, Fenster in der Wand, Kuppel auf dem Turm |

**Die Rundung, genau gesagt:** Jeder Körper hat an jeder Stelle eine halbe Dicke, also den Weg von seinem Rand bis zu seiner Mitte.
Rundung ist der Anteil dieser halben Dicke, der gerundet wird. Bei 0 bleiben scharfe Kanten (hochgezogen). Bei 1 ist der Querschnitt
überall rund (aufgeblasen), und die Höhe wird zur Stärke des Aufblasens. Dazwischen liegen Kissen. Damit sind Hochziehen und Aufblasen
zwei Enden desselben Reglers, und „im Anschluss rund oder eckig machen“ ist ein einziger Griff. Einzelne Kanten (K wie heute) und
einzelne Nähte bekommen eigene Werte.

**Rundung und Griffe (Nachtrag).** Deine Frage: „Wäre die durch den Rundungsregler erzeugte Kurve/Ecke auch mit den Bezierhandles zu
bearbeiten?“ Ja, und das muss so sein; sonst wäre die Rundung eine versteckte Rechnung neben den Linien.

- **Zwei Arten von Rundung, beide echte Linien.** Ecken im Umriss (in der Ebene der Linie) werden normale Punkte mit Griffen, wie die
  Live-Ecken in Illustrator. Kanten des Körpers (zwischen Deckel und Wand) bekommen ein kleines Profil aus zwei Punkten mit Griffen,
  sichtbar im Schnitt, an der Wand der Projektionsecke und in den flachen Ansichten.
- **Der Regler bestimmt die Größe, die Griffe den Charakter:** Kreis (Griffe etwa 55 % des Radius), weiche Ecke wie bei Apple (längere
  Griffe, ohne Sprung in der Krümmung), Fase (gerade) oder Hohlkehle (nach innen).
- **Hand schlägt Regler, und der Regler bleibt wirksam:** Jede Ecke hat eine Größe (Regler mal eigener Faktor, Standard 1) und eine
  Form (Standard Kreis). Die Griffe ändern Form und Faktor. Der Regler ändert danach weiter alle Größen zugleich und skaliert deine Form,
  ohne sie zu überschreiben. Auch bei 0 bleibt sie gemerkt und kommt zurück, wenn der Regler wieder steigt. Ein Schloss nimmt eine Ecke
  ganz aus dem Regler heraus (etwa für ein festes Maß); ein Tippen auf ihr Zeichen stellt sie zurück auf „folgt dem Regler“.
- **Ein Profil für alle Kanten oder je Kante:** Zuerst gilt eines für den ganzen Körper; einzelne Kanten dürfen abweichen.
- **Für Metall und Autos** gibt es einen Schalter für die glattere Rundung, bei der Glanzlichter ohne Knick über die Kante laufen.
- **Der knifflige Teil:** Wo zwei Kanten mit verschiedenen Profilen an einer Ecke zusammentreffen, muss Ozzy vermitteln (in CAD heißt
  das Eckübergang). Das gehört in die Rundungs-Probe.

**Was gleich bleibt, egal ob Haus, Auto oder Abstraktes:** dieselben Werkzeuge (P, ziehen, Lasso, G, S, R), dieselben Ansichten
(Projektionsecke, Wand kommt zu dir, Vier Ansichten, Schnitt), dieselbe Bibliothek, dieselben Regler, dieselbe KI.

## 3 Aussehen: Werkstoff, Bemalung, Stil, Licht

| Schicht | gehört zu | bestimmt | Beispiele |
| --- | --- | --- | --- |
| **Werkstoff** | dem Körper | was es ist: Farbe, Glanz, Rauheit, Durchsicht, Struktur; dazu, wie es sich beim Ziehen anfühlt und in der Physik verhält | Seifenhaut, Knete, Stein, Metall, Glas, Holz, Haut, Schuppen, Fell |
| **Bemalung** | dem Körper, in Ebenen | wo welche Farbe und welcher Werkstoff gilt (Masken durch Malen) | Bauch heller, Rücken mit Schuppen, Rost am Auto |
| **Stil** | der Szene (je Objekt überschreibbar) | wie alles gezeichnet wird: Stufen, Tinte, Raster, Pinsel | Earle, Comicdruck, Ghibli, Manga, Spider-Verse, realistisch |
| **Licht** | der Szene | Tageszeit, Stimmung, Schatten | Abend, Nebel, Neon |

- **Standard nach deinem Wort:** Gezogenes beginnt als Stein oder Metall, Geblasenes als Seifenhaut. Die Rundung ändert die Form, nicht
  den Stoff: Runder Stein ist ein Kiesel, eine eckige Blase ein Seifenwürfel.
- **Ein Stil je Szene** hält alles zusammen: Haus, Auto und Glimm sehen aus wie aus einem Film. Ein einzelnes Objekt kann bewusst einen
  anderen Stil tragen.
- **An einer weichen Naht** gehen die Werkstoffe über die Breite der Naht ineinander über, wie bei Tropfen; an einer harten Naht trennt
  eine Kante.
- **Der Shader entsteht aus den vier Schichten.** Ozzy baut je Objekt ein Programm für die Grafikkarte aus Werkstoff, Bemalung, Stil und
  Licht, jeweils in den drei Stufen Ziehen, Live und Ruhe (Teil 2).
- **Die 94 Shader werden sortiert.** Stoffe (Schuppen, Fell, Opal, Stein, Metall, Glas, Schleim, Trencadís) werden Werkstoffe;
  Zeichenweisen (Comicdruck, Earle, Ghibli, Manga, Sin City, Spider-Verse, Ukiyo-e) werden Stile. Gemischte wie „Drache Glut im
  Spider-Verse-Stil“ teilen sich in beides. Der Shader-Strang geht diesen Weg schon (Stil-Regler der Tiere, Häute mit Stilen).
- **Die Streifen-Ansicht bekommt zwei Fächer:** Werkstoffe auf dem gewählten Körper, Stile über die ganze Szene.

## 4 Bewegung: alles ist ein Regler über die Zeit

- **Was sich ändern kann, ist ein Regler:** Pose, Lage auf einer Bahn, Rundung, Werkstoff-Werte (Glut), Licht, Stärke eines Stroms, die
  Stufe der Leiter.
- **Bewegung kommt aus fünf Quellen,** die alle in dieselben Regler schreiben: Vorspielen, Posenfeld, Bahn, Verhalten und Physik.
- **Posen** sind Stände der Linien und Regler, bearbeitet mit denselben Werkzeugen (wie heute im Maul-Strang).
- **Ströme (Partikel) folgen derselben Grammatik.** Ein Strom hat eine Quelle (Punkt, Linie oder Fläche eines Körpers), einen Weg (Linie
  oder Physik) und ein Teilchen: einen kleinen Körper, geblasen oder gezogen, mit Werkstoff. Dazu kommt ein Lebenslauf: Regler über das
  Alter (Größe, Farbe, Rundung) als kleine Kurven, wie die Wachstumskurven der Leiter.
- **Rundung über die Zeit** ergibt Verwandlungen, die es so nirgends gibt: Ein Steinwürfel schmilzt zur Blase, eine Blase erstarrt zum
  Kristall. Für early earle passt das zum Verschmelzen.

## 5 Volle Kontrolle: fünf Regeln

1. **Alles ist Linie, Punkt oder Regler.** Es gibt keinen versteckten Zustand.
2. **Jede Automatik lässt sich festhalten:** Geister, Zwischenstufen der Leiter, Verhalten, Physik und Ströme werden auf Wunsch zu Linien
   und Kurven, die man bearbeitet.
3. **Jeder Wert steht dort, wo er wirkt** (Tropfen am Faden am Objekt), für Profis zusätzlich in einer Liste mit Zahlen.
4. **Jeder Schritt lässt sich zurücknehmen;** im Verlauf steht, wer ihn gemacht hat, du oder Ozzy.
5. **Zahlen auf Abruf:** Maße und Bezüge erscheinen, wenn man sie braucht, und sind dann genau.

## 6 Vier Beispiele, eine Grammatik

| | Linie | Körper | Rundung | Verbindung | Werkstoff | Bewegung |
| --- | --- | --- | --- | --- | --- | --- |
| Glimm | Silhouette | blasen | 1 | Hörner ansetzen und verschmelzen, Maul ausschneiden | Haut, Schuppen | Posen, Leiter, Atmen |
| Haus | Grundriss | hochziehen | 0, Dachkante 0,1 | Dach ansetzen, Fenster ausschneiden | Stein, Holz, Glas | Tür öffnen, Rauch als Strom |
| Auto | Seitenprofil | quer ziehen | 0,4 | Räder (gedreht) ansetzen, Fenster ausschneiden | Lack (Metall), Glas, Gummi | Bahn, Räder rollen, Federn |
| Abstrakt | zwei Kreise | einer geblasen, einer gezogen | 0,8 und 0 | verschmelzen, Naht 0,6 | Opal und Metall | Atmen, Rundung pulsiert, Blasen-Strom |

## 7 Womit ich morgen anfangen würde

1. **Ein Gesamtkonzept in einem Dokument.** Teil 1 bis 4 zusammenführen, mit der Grammatik als Mitte, dazu ein Bild der Grammatik.
   Das ist reines Denken mit wenig Aufwand und verhindert, dass wir in die falsche Richtung bauen. Danach dein Wort.
2. **Der erste sichtbare Beweis: der Regler Rundung.** Ein Umriss und ein Regler von hochgezogen bis aufgeblasen, dazu eine Naht zwischen
   zwei Körpern von hart bis weich. Kriterium: Für dich fühlen sich Hochziehen und Aufblasen wie ein einziges Werkzeug an, und jede
   Stufe dazwischen sieht gut aus. Dieser Regler trägt die ganze Grammatik.
3. **Daneben die Tempo-Messseite** (20 Minuten mit deinem iPhone), bevor größere Teile gebaut werden.

## 8 Offene Fragen (deine)

1. Passt die Grammatik (Linie, Körper, Rundung, Verbindung) als Mitte des Konzepts?
2. Passt die Trennung von Werkstoff (je Körper) und Stil (je Szene)?
3. Womit morgen anfangen: mit dem Gesamtkonzept oder mit der Rundungs-Probe?
