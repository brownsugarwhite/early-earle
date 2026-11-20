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

**Etappe 2 (20.11.):** Mit dem Maul gibt es die Pose „Fressen“ (oben 8°, unten 34°) und an jeder Kieferspitze einen Tropfen an
einer Haarlinie zum Mundwinkel, rosa oben, blau unten. Ziehen dreht den Kiefer; knapp vor „zu“ rastet er zu. In der Grundform
öffnet Halten das Maul für einen Blick, Loslassen schließt es; „Fressen“ lässt es offen. Nach dem Schneiden zeigt sich das Maul
einmal. Die Knochen drehen nur die Anzeige; die Linien liegen auch geöffnet auf der Haut.

**Etappe 3 (20.11.):** Ist ein Punkt der Lippe gewählt, hängt hinter dem Mundwinkel „Lippen trennen“. Danach hat jede Lippe ihre
eigenen Punkte; wo sie noch aufeinanderliegen, greifst du über der Linie die Oberlippe, darunter die Unterlippe. So entstehen
Überbiss, Unterbiss und Lücken, auch geschlossen. Jeder Kiefer hat seinen Tropfen an seiner eigenen Spitze. „Lippen verbinden“
legt die Unterlippe wieder auf die Oberlippe.

**Etappe 4 (20.11.):** Mit dem Maul gibt es im Paint-Modus die Ebene „Maul“: innen dunkelrot, längs der Lippe ein hellerer Ring
für das Zahnfleisch, dazwischen eine Farblinie zum Bearbeiten. Zu sieht man davon nichts; offen steht die Farbe im Maul. Ist im
Paint-Modus die Ebene „Maul“ gewählt, öffnet sich das Maul zum Hineinmalen. Die Farbe bleibt im Maul, auch wenn du an den Lippen
ziehst.

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

9. ~~Öffnen (Etappe 2)~~ gebaut; was daran offen ist, steht unter „An den Kiefern“.
10. ~~„Lippen trennen“ (Etappe 3)~~ gebaut; was daran offen ist, steht unter „An den Lippen“.
11. ~~Die Ebene „Maul“ (Etappe 4)~~ gebaut; was daran offen ist, steht unter „An der Ebene Maul“. Es fehlen Zähne (5),
    Zunge (6), Posen und Backen.

### Nicht geprüft

12. **Im Maul arbeiten:** neue Linien über das Maul oder in der Tasche, Punkte der Lippe löschen, K an der Lippe (weich fiele die
    Tasche zusammen), die zwei Linien im Maul ziehen.
13. **Sichern und Laden** einer Form mit Maul in Ozzy (im Kern lädt der Stand; das Fenster ist nicht geprüft). Ein Stand von
    Etappe 1 bekommt beim Laden sein Maul und die Pose nachgetragen.
14. **In der Pose arbeiten** an einer Form mit dem neuen Maul: Die Lippe wird in der Pose nicht gezogen (wie am Maul aus einer
    Linie vom 14.11.); alles andere läuft wie am geformten Maul und ist hier nicht geprüft.
15. **Andere Formen:** geprüft sind „teat firefish“ und ein frisches Oval mit Start-Loops.

### An den Kiefern (Etappe 2)

20. **Reichweite und Scharnier:** Der Tropfen auf der Haarlinie für die Reichweite fehlt, ebenso das verschiebbare Scharnier. Ein
    Kiefer reicht 1,15 Längen der Lippe um den Mundwinkel; was dahinter liegt (ein Horn, eine Flosse), biegt sich im Auslauf mit.
21. **Weit geöffnet geht viel von der Form mit.** Damit nichts faltet, werden die Ausläufe mit dem Winkel breiter (bei 70° reicht
    der Auslauf bis zum 3,4-Fachen der Reichweite, hinter dem Mundwinkel beginnt er schon 55° vor der Geraden nach hinten). Ob das
    so aussehen soll oder der Kiefer lieber enger bleibt und die Pose den Rest formt, zeigt sich an deinen Formen.
22. **Hinter dem Mundwinkel wird die Haut nur gestaucht** (bis auf 30 %); eine Backe, die sich wölbt, gibt es nicht.
23. **Die Tafel „Fressen“ mit ihren zwei Reglern** steht noch neben den Tropfen (dieselben zwei Winkel). Die Posen als Tropfen in
    einer Reihe (Grundform, Fressen, Plus) fehlen.
24. **Von oben liegen die zwei Tropfen übereinander** (dann zählt der Weg des Zeigers nach oben und unten); in den Vier Ansichten
    gibt es sie nicht; mit P, Freihand und im Paint-Modus sind sie aus.
25. **Innen ist das Maul Wachs wie außen;** die Haarlinien der Knochen liegen über der Form (sie laufen in der Mitte des Kopfs).
26. **Mit einem Maul sind jetzt gesperrt:** Spiegel aus, der Schnitt an der Mitte (die Naht beim Ziehen über die Mitte), Verschmelzen
    und Abziehen. Das Werk sperrt das für jedes Maul; für das neue ist keins davon geprüft.
27. **Der Umriss in der Seite zackt** bei weitem Öffnen an einem groben Netz (frische Form) leicht.
28. **Im Übergang ist ein Griff nicht genau die Tangente der gezeigten Linie,** und ein Klick auf die Linie trifft dort die Kurve
    aus gedrehten Punkten und Griffen (gezeichnet wird sie jetzt genau).
29. **Das Vorstellen nach dem Schneiden** (einmal auf und zu, anderthalb Sekunden) ist geschätzt, ebenso das Tempo beim Blick.

### An den Lippen (Etappe 3)

30. **Die Farben der Lippen fehlen** (zu türkis, oben rosa, unten blau, Mundwinkel schwarz, dein Blatt 05): Die Anzeige der Linien
    kennt nur eine Tinte (`src/linien/fluessig.ts`). Welche Lippe welche ist, zeigen bisher nur die zwei Tropfen.
31. **Welche Lippe du greifst, wo beide noch aufeinanderliegen,** sagt die Seite des Zeigers (über der Linie die obere). Am Zeiger
    ist das nicht zu sehen; und er „klebt“ am zuletzt gegriffenen Punkt, wenn der dicht daneben liegt (so ist das Verhalten der
    Linien gebaut).
32. **Einen Kiefer als Ganzes rücken** (sein Knochen lässt sich schieben) fehlt. Alle Punkte einer Lippe wählen und mit G oder S
    ziehen: nicht ausprobiert.
33. **„Lippen verbinden“ nimmt die Oberlippe als Vorlage;** die eigene Form der Unterlippe geht verloren (⌘Z holt sie zurück). Die
    Linien in der Tasche behalten ihre Form: Innen liegt das Maul danach nicht mehr genau aufeinander (an der frischen Form zählte
    das Werk danach 10 umgeschlagene Dreiecke, nicht angesehen).
34. **Nach einem Überbiss zählt das Werk 4 bis 6 umgeschlagene Dreiecke,** an der Lippe und in der Tasche am Mundwinkel, außen
    keins. Nicht einzeln angesehen (verwandt mit Punkt 17, der Klinge).
35. **Die Unterseite des Oberkiefers, die beim Überbiss frei wird,** ist die Wand der Tasche (der Gaumen): Haut der Form, gehalten
    von Lippe, Mitte und Rachenlinie. Ob sie sich so formen lässt, wie dein Rex es braucht (der Oberkiefer als Deckel über dem
    Unterkiefer), ist nicht ausprobiert; dein Blatt 06 ist nicht nachgebaut.
36. **In der Pose lässt sich eine getrennte Lippe ziehen** (gesperrt ist dort nur der zusammengeklappte Loop): nicht geprüft.
37. **Die Abstände der Tropfen im Bild** sind geschätzt: „Lippen trennen“ 82 Bildpunkte hinter dem Mundwinkel (unter ihm verdeckte
    er die Punkte der Unterlippe), die Kiefertropfen 36 vor und 18 neben ihrer Spitze (sonst verdecken sie die Punkte dort).
38. **Im Code:** Welche Hälfte der Lippe die untere ist, merkt sich das Maul beim Schneiden (`G.maul.ersteUnten`). Wer die Kette
    der Lippe je umdreht, dreht das mit.
39. **K an einer getrennten Lippe, Punkte auf nur einer Lippe setzen oder löschen, Kreuzungen neuer Linien mit einer Lippe:** nicht
    geprüft.

### An der Ebene „Maul“ (Etappe 4)

40. **Die Farben sieht man nur auf Wachs und hellem Solid** (wie alle Bemalung), nicht auf der Seifenhaut.
41. **Die zwei Farben sind geschätzt** (innen `#6b1425`, Zahnfleisch `#cf5a72`); auf Wachs wirkt das Dunkelrot bräunlich (es liegt
    unter dem Licht des Materials). Nach hinten wird das Innere nicht dunkler.
42. **Die Zahnfleischlinie entsteht einmal,** beim Anlegen. Danach geht sie mit der Haut wie jede Farblinie, aber nicht mehr mit
    der Lippe: Wer die Lippe stark umformt, bekommt ein ungleich breites Zahnfleisch. Löschst du die Ebene, legt Ozzy sie frisch an.
43. **Bei einem Überbiss liegt die Unterseite des Oberkiefers frei** und zeigt die Farben des Mauls nach außen.
44. **Zum Malen öffnet das Maul mit den Winkeln von „Fressen“;** die Tropfen der Kiefer sind im Paint-Modus aus. In der
    Ebenen-Ansicht (X) klappt das Maul nicht auf wie ein Buch.
45. **Ein Klick außen bei gewählter Ebene „Maul“** füllt die Form außen (auf dieser Ebene): Die Tasche ist für diese Ebene eine
    Grenze in beide Richtungen.
46. **Die Ebene wird an ihrem Namen erkannt** („Maul“). In der Pose wird sie nicht neu angelegt.
47. **Malen in der Pose:** Am Maul als echte Form steht die Bemalung jetzt auch in der Pose im Bild und lässt sich dort
    bearbeiten; geprüft ist nur das Zeigen.
48. **Die Zahnfleischlinie kann beim Netzwechsel die Wand wechseln** (Gaumen und Boden liegen zu aufeinander): Dann liefen Inneres
    und Zahnfleisch ineinander, beides bliebe im Maul. In den Proben kam es nicht vor (bis 17 Netzwechsel).
49. **Rillen am Gaumen, Farben für Zähne und Zunge:** Rillen lassen sich als Farblinien ziehen (nicht ausprobiert); Zähne und Zunge
    gibt es noch nicht.

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
