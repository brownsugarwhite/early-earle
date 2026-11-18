# Kleiner Plan: der Löser neben dem Bild (E2), dazu der Stand von E1

**Stand: Entwurf vom 18.11.2026, früh morgens. Nicht freigegeben, nichts davon gebaut.** Der Plan „Ozzy stabil und schnell“
verlangt für E2 einen eigenen kleinen Plan mit Beweis zuerst. Der Beweis im Kern ist geführt (Abschnitt 3). E1 und E2 sind beide
große Umbauten; ich habe sie in der Nacht nicht begonnen und sage unten, warum und in welcher Reihenfolge ich sie bauen würde.

## 1. Worum es geht

Etappe E heißt „der Zug bei 120“: Auf deinem Bildschirm mit 120 Bildern je Sekunde hat ein Bild 8,3 ms. Heute braucht ein Bild im
Zug rund 11 ms (gemessen im Raum an der Wand der Seite, `ozzy-zug-messen.mjs`, nach D1):

| Form | Rechnen je Bild | davon Werk (Löser) | glatte Haut | Linien | Rest |
| --- | --- | --- | --- | --- | --- |
| strange bird (7 400 Rechenpunkte) | 11,1 ms | 5,1 | 2,5 | 1,5 | 2,0 |
| teat firefish (11 400) | 11,4 ms | 6,3 | 2,3 | 1,9 | 0,9 |
| maul handgemacht test (3 500) | 12,8 ms | 9,0 | 1,2 | 1,4 | 1,2 |

- **E2 nimmt den Löser aus dem Bild** (5 bis 9 ms): Es bleiben 4 bis 6 ms je Bild. Das reicht für 120.
- **E1 nimmt die glatte Haut vom Prozessor** (1,2 bis 2,5 ms) und die Kosten beim Netzwechsel im Zug (11 bis 23 ms je Wechsel).
  Allein reicht es für 120 nicht.

**Meine Empfehlung: E2 zuerst, E1 danach.** Im Plan stehen sie umgekehrt.

## 2. Was du nach E2 siehst

- Zeiger, Linien und Punkte laufen im Zug mit allen Bildern, die dein Bildschirm hat, auch an großen Formen.
- Die Haut folgt, so schnell der Löser rechnet: an deinen Formen in jedem Bild (eine Runde dauert bis 7 ms), an viel größeren
  Formen mit etwas Abstand (bei 43 000 Punkten 32 ms je Runde: Die Haut kommt dann rund 30-mal je Sekunde nach, Zeiger und Linien
  bleiben flüssig).
- Nach dem Loslassen steht die Form wie heute.

## 3. Der Beweis im Kern (geführt)

Probe `form-neben-dem-bild.ts`: derselbe Zug (der höchste Punkt um 40 Einheiten, 45 Zeigerschritte), einmal im Bildtakt wie heute
(je Zeigerschritt eine Runde), einmal mit einem Löser im eigenen Takt. Danach Runden bis zur Ruhe. Kriterium aus dem Plan: Die
Häute liegen am Ende höchstens 0,1 Einheiten auseinander.

| Löser im eigenen Takt | strange bird | teat firefish | maul handgemacht test |
| --- | --- | --- | --- |
| schneller (zwei Runden je Zeigerschritt) | 0,07 | 0,05 | 0,02 |
| unregelmäßig (0 bis 3 Runden je Zeigerschritt) | 0,04 | 0,03 | 0,03 |
| langsamer (eine Runde je 2 Zeigerschritte) | **0,19** | 0,04 | 0,01 |
| langsamer (eine Runde je 4) | **0,49** | 0,07 | 0,05 |
| langsamer (eine Runde je 8) | **0,87** | 0,05 | **0,13** |

- **Hält**, solange der Löser mindestens so oft rechnet, wie der Zeiger sich meldet (deine Formen heute), auch unregelmäßig.
- **Hält an „strange bird“ nicht, wenn der Löser Ziele überspringt** (0,2 bis 0,9 Einheiten). Das liegt nicht am Weg neben dem
  Bild: Dieselbe Rechnung entsteht heute, wenn du doppelt, viermal, achtmal so schnell ziehst. Ein Zug hängt bei uns leicht an
  seinem Weg. Mit einem langen festen Nachlauf (150 Runden) bleibt der Unterschied derselbe.
- Unterwegs läuft die Haut eines achtmal langsameren Lösers bis 19 Einheiten hinter dem Bildtakt her (bei 40 Einheiten Zug): Das
  ist der Abstand, den man an sehr großen Formen sähe.

## 4. Wie es gebaut würde

Der Hintergrund rechnet heute schon das Verfeinern im Zug und das Aufräumen (`verfeinern.worker.ts`), also auch Runden des Lösers.
Dazu käme ein **Zug im Hintergrund**:

1. **Beginnen:** Beim Greifen schickt das Werk Haut, Linien, Schalter und die fertige Zerlegung. Der Hintergrund legt den Löser an
   (das dauert heute beim Greifen 13 bis 20 ms im Fenster und fällt dort weg).
2. **Ziehen:** Bei jeder Bewegung schickt das Werk die Ziele der Linien (wenige Zahlen). Der Hintergrund rechnet Runde um Runde
   zum jeweils neuesten Ziel und schickt nach jeder Runde die Lagen der Haut (bei 11 400 Punkten 270 KB, ohne Kopie übergeben),
   dazu, wie weit sie sich bewegt hat und ob der Löser unruhig ist.
3. **Zeigen:** Das Bild nimmt die neuesten Lagen. Linien und Punkte zeigt es sofort am Ziel (sie sind die Wahrheit), die Haut, wenn
   sie kommt.
4. **Loslassen:** Der Hintergrund rechnet zu Ende (Nachlauf bis zur Ruhe) und schickt den Stand; das Werk legt die Linien fest und
   räumt auf wie heute.

**Heikel** (jeder Punkt mit eigener Probe):

- **Netzwechsel im Zug:** Verfeinert wird im selben Hintergrund. Der Zug dort wird auf das feinere Netz gesetzt, das Fenster
  bekommt Netz und Lagen zusammen. Das Fenster rechnet dabei nichts mehr selbst (heute: der Zug setzt im Fenster neu auf).
- **Der Stand:** ⌘Z, Sichern und die Probe-Haken lesen den Stand des Fensters. Er ist während des Zugs einen Schritt alt; beim
  Loslassen muss er genau der des Hintergrunds sein (gleiche Lagen bis auf die letzte Stelle).
- **Davongelaufen, Vorsicht bei Unruhe:** Der Schutz misst heute im Fenster. Er muss dorthin, wo gerechnet wird, und das Fenster
  nimmt nur die Meldung.
- **Die Pose** rechnet anders (um die Stelle herum, mit Gedächtnis): bleibt zuerst im Fenster wie heute.
- **Griffe, Pinsel, G, S, R, Felder:** alle über denselben Zug des Werks; sie gehen mit, wenn der Zug mitgeht.

**Schritte, jeder für sich prüfbar, hinter einem Schalter (`?loeser=neben`), bis alle Proben mit ihm halten:**

1. Zug in der Grundform ohne Verfeinern im Zug. Probe: derselbe Zug mit und ohne Schalter, gleiche Form bis 0,1; Rechnen je Bild
   im Zug höchstens 5 / 7 ms (Median / 95 %).
2. Nachlauf, Davonlaufen, Vorsicht.
3. Verfeinern im Zug (Netzwechsel).
4. Griffe, Pinsel mit O, G, S, R.
5. Alle 30 Fenster-Proben mit Schalter; dann Standard, der alte Weg bleibt als `?loeser=bild` zum Vergleichen.

**Aufwand:** zwei bis drei Tage. Risiko mittel: Die Rechnung selbst ändert sich nicht, aber `werk.ts` hält heute an vielen Stellen
Haut und Löser im selben Faden für selbstverständlich.

## 5. E1: die Haut auf der Grafikkarte (Stand)

Nicht begonnen. Was ich dazu gemessen und gelesen habe:

- Heute rechnet der Prozessor die glatte Haut in Stufen (`glattPlan.ts`): je Kante ein Punkt in der Mitte ihrer gewölbten Kante,
  auf einer Linie in der Mitte ihres Pfadstücks; die Normalen aus der gewöhnlichen Unterteilung. Das kostet im Zug 1,2 bis 2,6 ms
  je Bild und bei jedem Netzwechsel im Zug 11 bis 23 ms (die Stufen neu anlegen).
- Auf der Grafikkarte wäre es eine andere Rechnung: je Dreieck ein gewölbtes Flächenstück aus seinen drei Punkten und Normalen,
  so fein gezeichnet, wie es im Bild groß ist. Sie gibt nicht dieselbe Fläche wie die Stufen von heute. **Das ist eine Frage des
  Looks**, kein reines Tempo: Die Seifenhaut hängt an den Normalen. Deshalb gehört vor den Bau das Vergleichsbild, und dein Auge.
- An der glatten Haut hängen heute der Umriss für die Linienansichten, das Kurvennetz im Raum, die Tönung der Felder (C4), die
  Tiefenkarten und die fünf Durchgänge der Seifenhaut. Jeder dieser Teile liest die feinen Punkte vom Prozessor.
- **Beweis, der zuerst käme:** der weiße Körper einer Linienansicht mit dem Flächenstück der Grafikkarte neben dem von heute:
  Umriss höchstens einen halben Bildpunkt auseinander, Linien genau auf ihrem Pfad, harte Kanten hart; dann die Seifenhaut im
  selben Vergleich. Aufwand für den Beweis ein Tag, für den Umbau danach drei bis vier Tage.

## 6. Frage an dich

Reihenfolge und Freigabe: **E2 zuerst** (bringt die 120 Bilder), E1 danach (nimmt die Stöße beim Netzwechsel und macht die Haut bei
jedem Zoom glatt), oder wie im Plan E1 zuerst, oder E1 streichen, solange dir die Haut so gefällt?
