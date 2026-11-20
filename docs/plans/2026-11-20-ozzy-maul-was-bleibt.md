# Ozzy, Maul: was für den Feinschliff bleibt

**Stand 20.11.2026.** Florian: „Du musst mir nicht immer Vergleiche und Tests zeigen. Starte Etappe 1. Wir behalten es im Kopf und
machen dann einen großen Feinschlifflauf am Ende. Uns wird noch mehr auffallen. Oftmals findet man am Ende elegantere Lösungen,
wenn man mehrere Bugs auf einmal angeht.“

Diese Liste ist das Gedächtnis dafür: alles Offene am Maul, nummeriert, in der Reihenfolge, in der es auffiel. Nichts davon wird
einzeln zur Entscheidung vorgelegt; am Ende gibt es einen Lauf über alle. Konzept und Proben:
[`2026-11-20-ozzy-maul-zaehne-zunge.md`](2026-11-20-ozzy-maul-zaehne-zunge.md) (Abschnitt 12).

## Was gebaut ist

**Etappe 1, erste Scheibe (20.11.):** In der Seite mit P eine Linie vom Leeren vor der Form bis zum Mundwinkel in ihr, ↩. Die
Linie bleibt stehen und bekommt an ihrem Ende den Tropfen „Maul“. Der Tropfen macht daraus das Maul: Die Tasche ist Haut der Form,
die Lippe eine Linie mit Kante, ihre Punkte gelten für beide Lippen (zieht man einen, geht sein Zwilling mit), im Maul liegen die
Mitte von Gaumen und Boden und die Rachenlinie, Linien der Form sind an der Lippe geschnitten. Gerechnet wird das Maul zu. ⌘Z
nimmt es zurück, Esc verwirft die wartende Linie.

## Was offen ist

### Am geschlossenen Maul

1. **Zu ist das Maul fast, aber nicht ganz unsichtbar.** Im Wachs liegt an der Lippe eine feine Kante im Licht. Sie kommt von
   der harten Kante: Neben einer harten Linie rundet jede Seite für sich (an „teat firefish“ außen am Unterkiefer bis 1,6 neben
   der Form von vorher; Gegenprobe ohne Schnitt: genauso). Soll „zu“ genau die Form von vorher sein, muss die Rechnung lernen, dass
   die Haut über eine geschlossene Lippe glatt weiterläuft (Rechenkern).
2. **Der Haarspalt.** Die Lippen stehen in der gerechneten Lage um 0,03° offen (vorn rund 0,06 Einheiten auseinander, am
   Mundwinkel null). Grund: Der Kern liest die Spiegelpaare an mehreren Stellen aus den Lagen neu (`kantenTeilen`, das Laden);
   zwei Punkte am selben Ort bekämen den falschen Partner. Führt der Kern die Paare mit, kann der Spalt auf null.
3. **Am Netz sind die zwei Lippen verschieden unterteilt** (Rest bis 0,14 an „teat firefish“). Die Linie selbst ist genau.

### An der Bedienung

4. **Die Lippe trägt mehr Punkte, als gezeichnet wurden** (an einer frischen Form 17 statt 3): Ihr Pfad wird aus dem Netz
   angelegt. Die gezeichneten Anker sollten ihre Punkte werden.
5. **Die Linie muss ein Stück vor der Form beginnen.** Dicht am Umriss fängt P die Linie der Mitte, und es beginnt eine
   Abzweigung statt der Maullinie.
6. **Nur von der Seite, nur mit P.** Freihand fehlt; Front und Top fehlen; die Linie muss von außen in die Form laufen (ein Maul,
   das die Form vorn nicht erreicht, geht nicht).
7. **Der Tropfen „Maul“** hängt unter dem Ende der Linie und kann die Form verdecken. Die Vorschau als Schnitt (wie in der Studie),
   bevor man bestätigt, fehlt.
8. **Ein Maul je Form, nur an der gespiegelten Form.** Ein zweites Maul und die freie Form sind gesperrt.

### Was noch nicht da ist (die Etappen)

9. **Öffnen** (Etappe 2): Knochen, die nur die Anzeige drehen; welcher Kiefer ein Punkt ist, liest `kieferSeiten` aus den Linien.
   Der alte Tropfen „Maul“ und „Fressen“ sind an der neuen Lippe aus.
10. **„Lippen trennen“** (Etappe 3), Über- und Unterbiss. Zu zieht ein Punkt beide Lippen; das geht.
11. **Die Ebene „Maul“** im Paint-Modus (Etappe 4), Zähne (5), Zunge (6), Posen und Backen.

### Nicht geprüft

12. **Im Maul arbeiten:** neue Linien über das Maul oder in der Tasche, Punkte der Lippe löschen, K an der Lippe (weich fiele die
    Tasche zusammen), die zwei Linien im Maul ziehen.
13. **Sichern und Laden** einer Form mit Maul in Ozzy (im Kern lädt der Stand; das Fenster ist nicht geprüft).
14. **Die Pose** an einer Form mit dem neuen Maul, und **Verschmelzen oder Abziehen** mit ihr (nicht gesperrt, nicht geprüft).
15. **Andere Formen:** geprüft sind „teat firefish“ und ein frisches Oval mit Start-Loops.

### Kleines

16. **Kreuzungen an der Lippe:** Die zwei Stücke einer geschnittenen Linie enden am selben Ort, eines an jeder Lippe. Für die
    Kreuzungssuche des Werks gilt das jetzt nicht mehr als neue Kreuzung (`ueberDasMaul`); ob die Enden beim Ziehen der Linie
    selbst zusammenbleiben, ist nicht geprüft.
17. **Ein weit gezogener Lippenpunkt zwischen dichten Nachbarn wird eine Klinge** (Probe P2); an der frischen Form zählte die alte
    Zählung nach einem Zug von 8 Einheiten 2 umgeschlagene Dreiecke (nicht angesehen).
18. **Die Zwillingsregel des Kerns** kennt nur Enden auf der Spiegelebene; an einem hängenden Ende setzt sie einen Griff nach außen
    (`maulEcht.ts` setzt ihn zurück). Gehört in den Kern.
19. **Im Code:** `Profil` liegt noch in der Studie (`src/maulstudie/schnitt.ts`); der Kern gibt für den Baustein eine vorhandene
    Funktion nach außen (`kantenTeilenMit`, eine Zeile im Index, an der Rechnung nichts geändert).
