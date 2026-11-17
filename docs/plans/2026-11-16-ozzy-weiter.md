# Ozzy: wie es weitergeht (16.11.2026, nachmittags)

Plan zur Freigabe. Grundlage: der Plan [`2026-11-16-ozzy.md`](2026-11-16-ozzy.md) (Phasen 0 bis 6 gebaut, Stand in
[`docs/look/ozzy/UEBERGABE.md`](../look/ozzy/UEBERGABE.md)), Florians Rückmeldung unten und ein zweiter Blick in alle Studien.

## 1. Florians Rückmeldung (wörtlich)

> „mir fehlt, dass ich nicht in alen ansichten gleich einlocke und wieder rausdrehen kann. Jede ansicht soll so bedienbar sein wie
> bei "mesh und linien interaktivität". Die pinselwerkzeuge an der bubble mache ich mit [der Kern-Sitzung] weiter. Man dreht in jeder
> ansicht mit maus auch aus den eingerasteten ansichten dreht man mit maus. im leeren raum zieht man den rahmen oder noch besser man
> hat ein lassonwerkzeug. mit "L"
>
> Bei der animation zur viereransicht hätte ich gerne ein echtes aufklappen der raum ecken ohne springen oder dass etwas zweimal
> angezeigt oder übergeben wird. Es muss alles super smooth und wie aus einem guss laufen.
>
> Hats du noch ideen für mehr einsatz von liquid drop? Schau nochmal in den anderen sessions ob du noch etwas vergessen hast oder ob
> wir wirklich schon alles haben.
>
> In den 3 ansichten fände ich es cool wenn man diese auch wenden kann. gerne auch shift
>
> Es fehlen noch sachen wie die handledrehung über shift und die animationen an punkten und linien und alle regler sollen wie in
> "mesh und linien interaktivität" sein. Am iphone muss es nicht funktionieren, aber am ipad mit stift wäre gut wenn es sehr gut
> bedienbar ist.
>
> Das Shading der Seifenblasenhaut muss immer supersmooth und elegant mitgleiten. Es wirkt ab und zu springend. Beim aufblasen auch.
> das kriegst du noch besser hin.
>
> Nach dem aufblasen hat die form schon einen edgloop an der spiegelkante. Könnte ich auch ohne starten wie im editor bei der 4.
> session. Was ich dem editor der 4ten session mit l mache will ich jetzt mit p machen können, indem ich entweder von linie zu linie
> oder im leeren raum über die konturen eine linie ziehe.
>
> Gehe alles nochmal in ruhe durch und mache einen plan wie wir weiter vorgehen. genau bedienung und ipad mussen wir erst
> astüfteln, das kommt step by step dazu. Die performance muss hervorragend sein überall!“

Gelesen als: „einlocke“ = einraste; „wenden“ = eine Ansicht von der Gegenseite sehen (Seite von links und von rechts, Front von
vorn und hinten, Top von oben und unten); „handledrehung über shift“ = das Kippen der Richtung mit ⇧ aus der Linien-Studie (dort im
Raum: der Ring schwenkt um die Linie des Griffs aus der Haut).

## 2. Was der zweite Blick in die Studien gefunden hat

Durchgesehen: Linien-Studie (Übergabe, Pläne „Auswahl und Stift“, „Richtungen statt Griffe“), Aufblas-Studie (Übergabe, Runde 5),
Ecke und Werft (Cloud-Zweig, `KONZEPT.md`, `VISION-4.md`, `PLAN-4.md`), Zeichenwerkzeuge, Sitzung 4 (L, O, Maul, Pose).

**In Ozzy vergessen oder nur halb übernommen:**

| Was | Woher | In Ozzy |
| --- | --- | --- |
| Ziehen ins Leere dreht, auch aus dem Eingerasteten heraus; Einrasten beim Loslassen nahe einer Achse | Werft, Aufblasen | eingerastet und in den Feldern zieht es einen Rahmen; heraus nur mit 0 oder Esc |
| Kippen der Richtung mit ⇧ (auch während des Haltens), der Ring schwenkt | Linien-Studie, Raum | fehlt: die Nadel dreht nur in der Ebene der Ansicht |
| Verdecktes grün (`#b9d1b4`, 0,25 px): Linien hinter der Form | Linien-Studie | alle Linien gleich, auch die hinter der Form |
| Die Welle beim Schließen, der Tropfen, der fällt, die Schwellung im Anflug | Linien-Studie | da, aber an den Wänden im Raum winzig; nicht Bild für Bild verglichen |
| Florians Werte der Feinregler (Linien und Punkte) | Linien-Studie (gespeichert im Browser unter Port 5199) | Ozzy hat eigene Schlüssel und beginnt mit den Grundwerten: seine Werte aus der Studie kommen nicht mit |
| Auffalten der Ecke zur Viereransicht: Die Wände klappen um ihre Kanten, die Form gleitet in ihr Feld (Projektionsmethode 1) | Ecke, Runde 1 und 4 | Linien gleiten von der Wand ins Feld, während die Wand ausblendet: zweimal zu sehen |
| Ordnungslinien: Fasst man einen Punkt, zeigen Strahlen sein Bild in den anderen Ansichten (Straken) | Ecke | fehlt |
| Lichtring: Vorschau des Loops rundum, bevor er entsteht | Ecke | fehlt |
| Röntgen: ⌥ halten macht Linien hinter der Form greifbar | Ecke | fehlt |
| Zwei Finger schauen (drehen, schwenken, kneifen = Zoom und Auffalten), ein Finger macht | Ecke | fehlt (iPad) |
| Mehr tippen, mehr nehmen: 1× Punkt, 2× Loop, 3× alles | Ecke | 2× Loop über das Verhalten; 3× fehlt |
| Pose ohne Regler: ins Maul greifen und aufziehen; Passer (Grundform gegen Pose) | Ecke | Regler oben rechts |
| L (Linie quer über den Körper): Loop rundum | Sitzung 4 | P kann es nur als Form über die Mitte bzw. den Umriss; offen im Leeren begonnen nicht |
| Start ohne Linie (die Startkugel hat keine) | Sitzung 4 | die Silhouette wird die Linie der Mitte |
| Würfel mit ebenen Flächen | Aufblasen | nur sein Umriss (bläst wie ein Kissen auf) |
| Sichern | Sitzung 4 | fehlt |

Bewusst nicht übernommen (unverändert): Druckfarben und Schatten an den Wänden (Ozzy zeigt Linien), Höhenlinien über der Blase
(Florian: „too much“), Nacht.

## 3. Grundsätze für die nächsten Schritte

1. **Eine Bedienung für jede Ansicht.** Raum, eingerastete Ansicht, Felder der Vier Ansichten und Wände bedienen sich wie die
   Linien-Studie, mit denselben Gesten und Animationen. Ziehen ins Leere dreht überall; Auswählen ist das Lasso (L).
2. **Aus einem Guss.** Kein Element wird zweimal gezeigt oder von einem Bild an ein anderes übergeben. Jeder Wechsel ist eine
   einzige Bewegung derselben Dinge (die Wand klappt, ihre Linien gehen mit; die Blase verdunstet in ihren Umriss).
3. **Tempo überall.** Am Mac 120 Bilder je Sekunde: Bildzeit im Median höchstens 6 ms, bei 95 % höchstens 8 ms, in jedem Ablauf an
   seinen drei Formen. Was sich nicht ändert, wird nicht neu gebaut. Gemessen wird vor und nach jedem Schritt.
4. **Die Haut gleitet.** Die Seifenhaut springt nie: nicht beim Aufblasen, nicht an der Übergabe, nicht wenn das Werk sein Netz
   verfeinert oder aufräumt. Keine Muster oder Linien über der Blase.
5. **Rechnung wie bisher.** Am Werk und am Kern ändert Ozzy nichts; die Pinsel an der Blase macht die Kern-Sitzung. Ozzy behält
   „Ziehen“ über O.
6. **Bedienung und iPad entstehen Schritt für Schritt mit Florian**: je Schritt ein kleiner Bau, den er ausprobiert, bevor der
   nächste kommt.

## 4. Schritte

Je Schritt eine vorher festgelegte, sichtbare Probe; bei Aussehen und Gefühl entscheidet Florian. Reihenfolge nach Vorschlag, er kann
umstellen.

**S1 Messen (Grundlage für Tempo und Ruhe).** Feste Abläufe an „teat firefish“, „strange bird“, „maul handgemacht test“: Laden und
Aufblasen, Drehen, Einrasten und heraus, Vier Ansichten auf und zu, Zug an Wand und Feld, P, Pose mit Regler, Pinsel. Je Ablauf
Bildzeit (Median, 95 %), Bilder je Sekunde im echten Fenster, und Sprünge der Seifenhaut (Unterschied zweier Bilder ohne Bewegung der
Form). *Probe:* ein Messblatt mit Bildern der Sprünge; daraus die Liste, was S2 und S3 beheben.

**S2 Die Seifenhaut gleitet.** Ursachen, die ich vermute (S1 bestätigt oder widerlegt): Wechselt das Netz des Werks (Verfeinern,
Aufräumen), rechnet die Anzeige Lage im Blatt und Dehnung je Punkt neu, und das Muster springt; die Anzeige wechselt zwischen zwei
und drei Stufen der Verfeinerung; an der Übergabe von der Blase zum Werk wechselt das Muster. Abhilfe: Lage und Dehnung stetig über
Netzwechsel weiterreichen (das Werk hat dafür `weiterreichen`), die Stufe nicht wechseln, solange man hinsieht, an der Übergabe
dieselben Werte wie die Blase. *Probe:* Film der Abläufe aus S1; kein Sprung über der Schwelle aus S1, Florian sieht keinen.

**S3 Tempo.** Was S1 als teuer zeigt, zuerst (vermutet: alle Linien auf allen Flächen jedes Bild neu bauen, Kopien der Pose je
Bild, Strahl gegen die ganze Haut bei jeder Mausbewegung, das Netz der Seifenhaut nach jedem Schritt des Werks). *Probe:* dieselben
Abläufe, Ziel aus Grundsatz 3.

**S4 Drehen und Einrasten in jeder Ansicht.** Ziehen ins Leere dreht überall, auch aus der eingerasteten Ansicht heraus (sie löst
sich weich, die Blase kommt zurück); beim Loslassen nahe einer Achse rastet es ein, mit Schwung (das Ziel wird vorausberechnet).
Gleich für Seite, Front, Top und ihre Gegenseiten. **Wenden** (Abschnitt 6): ⇧ + Ziehen dreht das Blatt, Loslassen gleitet zurück;
über die Hälfte dreht der schwarze Grund als harte, flüssige Kante herein und es rastet gewendet ein (Linien weiß); ⇧ + Doppelklick
und ⇧ + 1/3/7 wenden ebenso. *Probe:* Film: Raum → Seite (durch Drehen) → heraus
→ Front → wenden → Top → Raum, Größe der Form bleibt (±2 %), kein Sprung, eingerastet liegt der Umriss genau auf der Linie.
*Gebaut (16.11. abends, `95528538`, `f7afd001`):* Ziehen ins Leere dreht in jeder Ansicht (eingerastet löst sie sich; im flachen Feld
klappen die Vier zurück); Einrasten in alle sechs Ansichten (Gegenseiten = gewendet); Schwung mit vorausberechnetem Ziel, mit Schwung
fängt eine Ansicht im Umkreis von 20°. Beim Wechsel zwischen zwei Ansichten (1 → 3) löst sich das Blatt unterwegs ein Stück (die
Blase kommt kurz zurück), das alte Blatt dreht sich mit und verblasst; vorher war mittendrin nichts zu sehen. **Wenden, erste Fassung**
(`f7afd001`): Das Schwarz floss als gewellte Kante von der Seite herein (Overlay mit `mix-blend-mode: difference`). Florian danach:
„das wenden wirkt noch nicht gut. man sollte in alle richtungen drehen können und es snapt dann in der entsprechenden position zurück
oder gewendet. bitte doch als harte kante die andere farbe einblenden und genauso wie wir das vorher schonmal gemacht hatten. Das hatte
mir besser gefallen. Die überblende zurück in den editor gefällt mir noch nicht. Sollten wir dort vllt auch mit der harten kante
arbeiten wenn ich zur bottom, side (other side) back perspektive in der projektionsansicht drehe? Wir könnten es mal versuchen.“
**Zweite Fassung** (`258a9f85`): die Kante der Blaupause (`sigmaWerte` in `/editor`): Beim Drehen wandert eine gerade harte Kante
durchs Bild, bei 90° durch die Mitte der Form; dahinter tauschen Papier und Tinte (Grund in Tinte, Linien hell, die Seifenhaut spiegelt
wie in der Nacht der Aufblas-Studie, je Bildpunkt). ⇧ + Ziehen dreht in jede Richtung, losgelassen zurück oder auf die Rückseite, was
näher ist; ⇧ + Doppelklick und ⇧ + 1/3/7. Im Raum gilt dieselbe Kante gegen seine Hausansicht: von unten, von der anderen Seite und
von hinten wird es dunkel. *Probe* `ozzy-ansichten-fenster.mjs` (acht Kriterien, alles gut), *Film*
[`2026-11-16-wenden.mp4`](../progress/ozzy/2026-11-16-wenden.mp4) (`scripts/ozzy/wenden-film.mjs`, Bild für Bild), *Bild*
[`2026-11-16-kante.png`](../progress/ozzy/2026-11-16-kante.png). Danach Florian: „Ja, auch dort“ (harte Kante auch zwischen Raum und
Ansicht), „aber bitte so timen, dass die entsprechenden projektionen auch schwarze wände haben wenn ich dahin gedreht habe. bei manchen
dreht sich die farbe beim einrasten dann um“, „ich glaube du musst dazu nur front und back tauschen, oder?“ **Dritte Fassung**
(`49df2266`): Front und Rückseite der Front getauscht (die Front schaut nach −x, von der Seite, von der der Raum in seine Ecke schaut;
die Vier Ansichten mit); im Raum ist jede Wand, deren Projektion man von hinten sieht, eine dunkle Fläche mit harten Rändern; beim
Einrasten wächst die Wand der Ansicht zum ganzen Blatt, ihre Zeichnung wandert zur Mitte der Form und wird das Blatt, und ein Blatt
schiebt sich durch die Blase (sie verdunstet nicht mehr). So hat jede Projektion schon die Farbe, die sie eingerastet hat. Probe:
acht Kriterien (neu: Hausansicht ohne dunkle Wand, vor der Front von hinten ihre Wand dunkel und eingerastet dunkel, von unten die
Decke), Film neu. Danach Florian: „ich meinte nicht dass die wände
schwarz sein sollen, das war vorher schon richtig mit der kante auch im raum. aber back war weiß und front war schwarz und beim
einrasten hat es gewechselt. daher wollte ich die beiden ansichten tauschen.“ **Vierte Fassung** (`7c0cbbf8`): wieder die Kante im
Raum (gegen seine Hausansicht, bei Fahrten gedreht), keine schwarzen Wände; der Tausch bleibt, ebenso das Blatt, das beim Einrasten durch
die Blase schneidet, und die wandernde Zeichnung. Bild [`2026-11-16-kante-raum.png`](../progress/ozzy/2026-11-16-kante-raum.png).

**S5 Lasso (L).** Ein Werkzeug „Lasso“: Ziehen zeichnet eine flüssige Schlinge (eine Linie der Anzeige, die sich am Ende wie ein
Tropfen schließt); gewählt ist, was sie umschließt, auf allen Flächen; ⇧ nimmt dazu, ⌥ nimmt weg. *Probe:* an „strange bird“ in der
Seite, an einer Wand und in einem Feld; gewählt sind genau die umschlossenen Punkte; Film.
*Gebaut (16.11. abends, `4608e8b8`):* Knopf ganz links in der Leiste und Taste L (V oder L zurück); Ziehen zeichnet überall eine
Schlinge als Haarlinie (auch über Punkten, dreht nicht), gewählt ist schon beim Ziehen, was sie umschließt (nur Sichtbares), ⇧ dazu,
⌥ weg; beim Loslassen fließt ein Tropfen in die Naht, die Schlinge zieht sich zur Auswahl zusammen und vergeht. Ein Punkt, den sie an
einer Wand umfährt, ist im Werk gewählt und auf allen Flächen markiert. *Probe* `ozzy-lasso-fenster.mjs` (sechs Kriterien, alles
gut), *Film* [`2026-11-16-lasso.mp4`](../progress/ozzy/2026-11-16-lasso.mp4), *Bild* [`2026-11-16-lasso.png`](../progress/ozzy/2026-11-16-lasso.png).
Sein Urteil steht aus. Noch nicht: Gewähltes quillt kurz (Idee 3), der Zeiger als Schlinge (Idee 8).

**S6 Richtungen wie in der Studie.** ⇧ kippt die Richtung aus der Ebene der Ansicht (auch während des Haltens; der Ring schwenkt um
die Linie des Griffs), wie im Raum der Linien-Studie, gerechnet als Griff des Werks; ⌥ knickt auch während des Drehens. Dazu die
Animationen an Punkten und Linien: Vergleich Bild für Bild mit der Studie an derselben Form, was fehlt, nachziehen. **Regler wie in
der Studie:** Florian kopiert seine Werte in der Studie („Werte kopieren“), Ozzy nimmt sie als Grundwerte (und künftig liegen die
Werte im Repo, nicht nur im Browser). *Probe:* Film Studie neben Ozzy, gleiche Bewegung; die Werte gleich.
*Gebaut (16.11. abends):* **S6a** (`f89955ce`): ⌥ knickt auch während des Drehens einer Richtung (nur Handgriffe des Werks: Zug endet,
Ecke, neuer Zug am Griff; für ⌘Z ein Schritt). Probe `ozzy-richtung-fenster.mjs` (alles gut). **S6b** (`660c2b29`): ⇧ kippt eine Richtung aus der
Ebene der Ansicht (auch erst während des Drehens): Ziehen quer zum Griff neigt ihn, Länge und Richtung in der Ebene bleiben; ⇧ los dreht
wieder in der Ebene; ein ⌘Z. Dafür im Werk ein neuer Handgriff aus bestehenden, `zugGriffRaum` (Florian: „Ja, ergänzen“; die Rechnung
bleibt). **S6c** (`c12ee4b6`): Beim Kippen schwenkt der Ring um die Linie des Griffs (Feder wie in der Studie);
eingerastet eine schmale Ellipse längs des Griffs, die Spitze läuft auf ihr. Die übrigen Animationen (Punkte, Linien, Tropfen, Nadeln,
Auswahl) zeichnet Ozzy mit demselben Verhalten wie die Studie. **S6d:** Florian (16.11. abends): „lass die reglerwerte erstmal wie den
standard der anderen session. Das muss ich erst noch festlegen.“ Ozzy nimmt die Grundwerte der Studie.

**S7 Verdecktes grün.** Linien hinter der Form zeigt jede Ansicht grün und fein (wie die Studie), die vorderen schwarz; an Kreuzungen
mit dem Umriss wechselt es weich. Gerechnet je Probe aus der Haut des Werks (Strahl in Blickrichtung der Ansicht). *Probe:* Bild der
drei Ansichten an „strange bird“ neben der Studie.
*Gebaut (16.11. abends, `26de280e`):* Jede Fläche weiß, welche Seite zum Betrachter zeigt (`Flaeche.vorn`); aus der gezeigten Haut des
Werks je Achse eine Tiefenkarte (128 × 128, im Zug höchstens alle 150 ms neu); Proben und Punkte hinter der Haut sind grün und fein
(Schicht 1), der Umriss bleibt schwarz. *Probe* `ozzy-verdeckt-fenster.mjs` (alles gut), *Bild*
[`2026-11-16-verdeckt.png`](../progress/ozzy/2026-11-16-verdeckt.png) (Front und Top). Neben der Studie verglichen ist es nicht (sie lädt
seine Formen nicht).

**S8 P statt L.** Zwei Wege, eine Linie rundum zu ziehen: von Linie zu Linie (gibt es: Abzweigung) und **im Leeren beginnen, über die
Form, im Leeren enden**: Dann wird es ein Loop rundum, dessen Ansicht genau die gezeichnete Linie ist (gerade wie L, gebogen wie
gezeichnet). Vorher zeigt ein Lichtring, wo er um die Form läuft. *Beweis zuerst:* gerade gezogen gibt es denselben Loop wie L im
Prüffenster (`loopSchneiden`); gebogen liegt die Seite des Rings höchstens 0,5 px neben der Zeichnung; nichts springt. Hält der
gebogene Fall mit den Handgriffen des Werks nicht, sage ich es (dann ist es ein Punkt für die Kern-Sitzung).
*Gebaut (16.11. abends, `f7c50fa9`):* Gerade: P, Klick im Leeren, Klick im Leeren auf der anderen Seite, ↩ → `werk.loopSchneiden` wie L
(außerhalb der Form prüft die Tiefenkarte aus S7). *Beweis* `ozzy-p-schnitt-fenster.mjs`: neuer Ring an „strange bird“ höchstens
0,11 px neben der Geraden, ein ⌘Z. **Gebogen hält nicht:** Der Kern kennt nur den ebenen Schnitt (`loopAusSchnitt`); ein Schnitt längs
einer gebogenen Zeichnung ist ein Punkt für die Kern-Sitzung. Ozzy meldet es. Noch nicht: der Lichtring vorher.

**S9 Start ohne Linie an der Spiegelkante (Wahl).** Nach dem Aufblasen ohne Linie, wie Sitzung 4 an ihrer Startkugel: Die Haut ist
dann genau die aufgeblasene und bleibt es, bis die erste Linie kommt. *Beweis:* Die Haut steht, nichts kriecht; was die erste Linie
mit P tut (so rechnet Sitzung 4: aus einer einzigen Linie die ganze Haut). Florian entscheidet, was der Grundwert ist.
*Gebaut zur Wahl (16.11. abends, `5759cbcc`):* `?ohneLinie=1` löscht nach dem Aufblasen die Linie der Mitte (Handgriff des Werks). *Beweis*
`ozzy-ohne-linie-fenster.mjs`: Haut steht (3 s, 0,00), die erste Linie mit P (Ring) lässt sie stehen, der erste Zug baut das Netz neu.
Gefunden: In der eingerasteten Seite ist ohne Linie nichts von der Form zu sehen (der Umriss der Seite ist die Linie der Mitte); wird
„ohne“ der Grundwert, braucht die Seite einen Umriss aus der Haut wie Front und Top. Bild [`2026-11-16-ohne-linie.png`](../progress/ozzy/2026-11-16-ohne-linie.png).
Florian: „beides. ohne linie als standard und ein schalter im menü für mit linie“ → gebaut: ohne ist Standard, Menü „Linie an der Spiegelkante“, die Seite zeigt ohne Linie der Mitte den Umriss der Haut.

**S10 Auffalten zur Viereransicht.** Die drei Wände der Ecke klappen um ihre Kanten flach (Boden nach unten, Seitenwand zur Seite,
nach der Projektionsmethode 1), ihre Linien gehen mit, weil sie auf der Wand liegen; die Kamera wird dabei parallel; die Blase gleitet
ins vierte Feld. Nichts wird zweimal gezeigt oder übergeben. Zurück faltet es sich genauso. *Zuerst ein Film als Beweis* (vorher und
nachher, gleiche Ansicht), dann der Bau. *Probe:* Film; in keinem Bild eine Linie doppelt, kein Sprung in Lage oder Größe; Florian
sieht.

*Vor dem Film (16.11. abends):* Die Ecke im Raum liegt spiegelverkehrt zu den Feldern. In der Hausansicht des Raums (Kamera bei +x, +y,
+z) steht die Wand der Front links, die der Seite rechts, der Boden unten. Klappt man die Ecke geometrisch auf (die Wand der Seite bleibt,
die der Front klappt um ihre Kante, der Boden nach unten), landet die Front **links** der Seite und das Top **unter** der Seite. Das ist
Projektionsmethode 1 für die Front seit dem Tausch (sie schaut von +x, also von rechts: Methode 1 legt sie links hin). Die Felder liegen
heute anders: Seite oben links, Front oben rechts, Top unten links, Raum unten rechts. Für ein echtes Auffalten ohne Sprung brauchen die
Felder die Lage der aufgeklappten Ecke: Front oben links, Seite oben rechts, Top unten rechts (unter der Seite), Raum unten links.
Florian: „ja anpassen“ → die Felder liegen seit `2d2d88a3` so. Film als Beweis (`?auffalten=1`, noch nicht Standard):
[vorher](../progress/ozzy/2026-11-16-vier-vorher.mp4), [nachher](../progress/ozzy/2026-11-16-vier-auffalten.mp4). Die Wände klappen um ihre
Kanten im Raum (ohne Zusammenziehen), ab drei Fünfteln setzen sie sich in ihre Felder; nichts doppelt. Zu sehen: Der Boden verlässt
beim Aufklappen kurz den Bildrand. Sein Urteil entscheidet, ob es Standard wird.
Florian zum Film: „das aufklappen sieht nicht gut aus. Die seiten müssen wirklich aufklappen und die projektionen dabei auf der fläche in
position sliden. Das muss alles in einer gleichmäßigen bewegung erfolgen. Momentan wackelt es und ist von der dynamik schlechter als
vorher“. **Neuer Ansatz:** Die Felder sind ein aufgeklapptes Kistennetz (Seite, links an der senkrechten Teilerlinie die Front, unten an
der waagrechten das Top). Eine eigene Kamera für die Zeichnungen fährt in einer Bewegung (eine Kurve für alles) vom Raum in die
parallele Ansicht auf dieses Netz; Front und Boden drehen dabei um ihre Kanten, deren Lage von der Ecke zur Teilerlinie gleitet, und
jede Zeichnung gleitet auf ihrer Wand an ihren Platz. Am Ende liegt alles genau in den Feldern (kein Nachschieben). Die Blase gleitet
mit der Kamera des Raums ins Raumfeld. Die Ränder der Wände sind unterwegs als Haarlinien zu sehen.
*Zweite Fassung gebaut (zum Ansehen, `?auffalten=1`):* Eine eigene Kamera der Zeichnungen dreht vom Raum gerade auf die Seite, wird
parallel und wächst auf den Maßstab der Felder; die Mitte der Wand der Seite gleitet dabei auf gerader Bahn in ihr Feld. Front und Boden
klappen um ihre Kanten (die Kanten gleiten zu den Teilern), ihre Zeichnungen gleiten auf der Wand so, dass ihre Mitte im Bild ebenfalls
gerade an ihren Platz gleitet (ohne das liefen sie erst nach außen und dann zurück: das war das Wackeln). Die Ränder der Wände sind
Haarlinien, die drei Kanten der Ecke gehen in sie über; die Teiler liegen auf den Kanten und gleiten mit (nichts doppelt). Alles hängt an
einer Zahl. Probe `ozzy-auffalten-fenster.mjs`: im ersten Bild noch auf den Wänden (0,1 px), am Ende ohne Nachschieben, jede Zeichnung
mit genau einem Gipfel der Geschwindigkeit, hin und zurück. Filme: [echt](../progress/ozzy/2026-11-16-vier-kistennetz.mp4),
[dreifach langsamer](../progress/ozzy/2026-11-16-vier-kistennetz-zeitlupe.mp4); vorher wie oben. Florian: „ja standard“ → Tab faltet
jetzt immer so auf (der Schalter `?auffalten` und die alte Überblendung sind weg). **S10 abgeschlossen.**

**S11 Sichern.** Im Menü „Ozzy“: Sichern unter einem Namen (neu), Überschreiben nur nach Frage; ⌘S. *Probe:* sichern, neu laden,
gleich.
*Bau (Florian: „ok s11“):* Dieselbe Ablage und dasselbe Format wie das Prüffenster (`wesen/<Name>.eewesen` über den Dev-Server, der ganze
Stand des Werks: Linien, Punkte, Griffe, Kanten, Haut, Maul, Pose); was gesichert ist, zeigt „Laden“ und lädt es genau so wieder. Am Werk
ändert sich nichts (es gibt seinen Stand schon her). Im Menü über „Laden“ ein Feld „Sichern“: Name (vorbelegt mit dem Namen der Form, wenn
sie geladen oder schon gesichert ist) und Knopf, ↩ sichert, Esc schließt. Ein Name, den es schon gibt und der nicht der eigene ist, wird
erst beim zweiten Druck überschrieben (der Knopf heißt dann „Überschreiben“, die Meldung sagt es). ⌘S sichert unter dem Namen der Form
ohne Frage (wie im Prüffenster); hat sie noch keinen, öffnet ⌘S das Feld. Rechnet das Werk nach einem Zug noch, wird danach gesichert;
ein Stand, der nicht in Ordnung ist, wird nicht gesichert (er überschriebe eine gute Datei). *Probe* `ozzy-sichern-fenster.mjs`: unter
zwei neuen Namen sichern, die Frage beim fremden Namen (Datei unverändert bis zum zweiten Druck), einen Punkt ziehen, ⌘S, neu laden:
Linien, Punkte, Griffe und Haut gleich; die Probedateien werden danach gelöscht.
*Gebaut (erster Teil):* Feld, Frage und ⌘S wie beschrieben, Bild [`2026-11-16-sichern.png`](../progress/ozzy/2026-11-16-sichern.png); Probe
1 und 2 halten. *Gefunden:* Nach einem Zug legt der Kern beim Verdichten manchmal einen Punkt nahe der Mitte ohne Spiegelpartner an
(strange bird, ein Punkt der Seite 30 px nach oben: 1 von 7 727 Punkten, bei z = 0,86). Die Prüfung der Ablage (`ablage.ts`, Sitzung 4)
lehnt solche Stände beim Sichern und beim Laden ab („Haut: Spiegelpartner fehlt“); das Prüffenster scheitert bei demselben Zug genauso.
Der Kern selbst kennt Punkte ohne Spiegelbild (`verdichten`, `mitteSchnitt`). Frage an Florian: die Prüfung lockern (nur diese eine
Bedingung, am Rechnen ändert sich nichts) oder das der Kern-Sitzung überlassen. Florian: „Ja, lockern“ → `ablage.ts` erlaubt −1 (ohne
Spiegelbild), weist nur noch einen Verweis ins Leere ab; Test in `ablage.test.ts`. Probe 1 bis 5 halten: nach dem Zug ⌘S, neu geladen
sind Linien, Punkte, Griffe und Haut genau gleich (Unterschied 0). Die Ursache im Verdichten steht im Plan des Kerns (A.4). **S11
abgeschlossen.**

**S12 iPad mit Stift (Schritt für Schritt, gemeinsam).** Erst: Stift = Zeiger (mit Schweben über dem Bildschirm, wo das iPad es kann),
zwei Finger drehen, schwenken und zoomen, Tasten als kleine Knöpfe (Ansichten, Vier, Zurück, Löschen, Kante, Werkzeuge); dann Florians
Rückmeldung am Gerät. *Probe:* am iPad im Simulator und an seinem Gerät.
*Erster Schritt (Florian: „Ja, S12“), Vorschlag, den er am Gerät beurteilt:*
- **Stift = Zeiger:** Der Stift macht alles wie die Maus (Punkte, Linien, Griffe, P, Lasso, ins Leere ziehen dreht). Schwebt er über dem
  Bildschirm (iPad mit Schweben), zeigt Ozzy den Zeiger und das Anschwellen wie bei der Maus.
- **Finger:** Ein Finger dreht (wie Ziehen ins Leere). Solange noch kein Stift da war, macht ein Finger alles wie die Maus (ohne Stift
  bleibt Ozzy bedienbar); ab dem ersten Stift ändern Finger nichts mehr an der Form (eine aufgelegte Hand zieht keinen Punkt).
- **Zwei Finger:** auseinander und zusammen zoomt (zu den Fingern hin), gemeinsam verschieben schwenkt, verdrehen dreht um die Hochachse
  (wie Apples Vorschau für 3D); beim Loslassen rastet es nahe einer Ansicht ein wie mit der Maus. Schwenken ist neu (auch am Mac nicht da):
  ein Versatz des Bilds, den „Einpassen“ (Pos1) zurücksetzt; in den Vier Ansichten gilt er nicht.
- **Tasten als kleine Knöpfe** (nur auf Geräten mit Berührung): Raum, Seite, Front, Top, Vier · ↩, Esc · Zurück, Löschen, Kante,
  Einpassen; die Werkzeuge stehen schon in der Leiste. Die Knöpfe lösen genau das aus, was die Taste tut.
- *Probe:* im iPad-Simulator (Safari) ein Bild mit den Knöpfen und je eine Geste (ein Finger dreht, zwei Finger zoomen und schwenken,
  Knopf „Seite“ rastet ein); dazu in Chromium mit nachgestellter Berührung und Stift: Finger ändert nach dem Stift keinen Punkt, Stift
  zieht einen Punkt, zwei Finger zoomen, schwenken und drehen. Für sein iPad muss der Server im WLAN erreichbar sein (Frage an Florian).
*Gebaut (erster Schritt):* wie oben; Safaris eigene Gesten für zwei Finger sind auf der Seite abgeschaltet, auf Geräten mit Berührung
zeigt die Hinweiszeile nur Meldungen (die Tastenhinweise gelten dort nicht). Probe `ozzy-ipad-fenster.mjs` (Chromium, nachgestellt): 1
bis 7 halten. Im iPad-Simulator (Safari, iPad Pro 13 Zoll): Knöpfe stehen unten, „Seite“ rastet ein, zwei Finger zoomen zu den Fingern hin,
„Einpassen“ setzt zurück, verdreht dreht den Raum; Bild [`2026-11-16-ipad.png`](../progress/ozzy/2026-11-16-ipad.png). Der Simulator
zeichnet langsam und die Seifenhaut blass (Grenze des Simulators); Schweben und Druck des Stifts gibt es dort nicht, das zeigt erst sein
Gerät.

**S13 liquid drop weiter** (Florian wählt aus Abschnitt 5).
*Begonnen (Florian, 17.11.: „S13 liquid drop“).* Reihenfolge nach dem, was beim Arbeiten am meisten zu sehen ist: erst 6 (⌘Z fließt
zurück) und 8 (Zeiger in Form des Werkzeugs), dann 7 (Meldungen tropfen), 5 (Kante wie Tusche), 4 (Kreuzungen verschmelzen), 1
(Menüs als Tropfen), 2 (Regler als Tropfen), 9 (Ordnungslinien), 10 (Ansichts-Tropfen). Die 3 (Lasso als Faden) ist seit S5 drin.
Jede Idee nur in der Anzeige; am Werk ändert sich nichts.
- **6, ⌘Z fließt zurück:** Das Werk springt wie bisher in den Stand davor; nur die Anzeige gleitet: Linien, Punkte und Griffe auf
  allen Flächen gehen in etwa 0,2 s von ihrer Lage vor ⌘Z in die neue (je Stück einer Linie an derselben Stelle, so bleiben die Linien
  an ihren Punkten). Was es danach nicht mehr gibt, verschwindet, was neu ist, ist gleich da. Die Haut springt zuerst wie bisher (sie
  gleiten zu lassen, ist ein eigener Schritt, wenn er es will). *Probe:* Film vorher/nachher (gleiche Ansicht, strange bird, ein Punkt
  gezogen, dann ⌘Z); Messung: im ersten Bild nach ⌘Z ist der Punkt noch nahe der alten Lage, nach 0,25 s genau in der neuen, dazwischen
  ein Gipfel der Geschwindigkeit.
  *Gebaut:* `werkBlatt.rueckfluss` merkt die Anzeige vor ⌘Z, `fliessen` gleitet 0,22 s (gleich los, sanft am Ziel). Gemessen im Film
  (dreifach langsamer, Punkt 60 px gezogen): im ersten Bild nach ⌘Z 7 % des Wegs, nach 0,25 s genau angekommen, ein Gipfel. Filme
  [vorher](../progress/ozzy/2026-11-17-zurueck-vorher.mp4) (`?fluss=0`, springt in einem Bild) und
  [nachher](../progress/ozzy/2026-11-17-zurueck-fliesst.mp4); die Linien bleiben dabei an ihren Punkten.
- **8, Zeiger in Form des Werkzeugs:** *Gebaut:* Pfeil bei der Auswahl, Spitze bei P und Freihand (gefüllt wie der Pfeil), Schlinge beim
  Lasso und Ring beim Pinsel über der Haut (nur die Linie; der Ring so groß wie der Einfluss des Pinsels, [ und ] ändern ihn). Beim
  Wechsel gleitet der Umriss in etwa 0,1 s in die neue Form, die Spitze bleibt, wo sie ist. Die flüssige Anzeige zeichnet dafür einen
  Umriss aus 64 Punkten statt des Dreiecks (`zeigerUmriss`, nur in Ozzy; die Studien bleiben beim Dreieck). Bild
  [`2026-11-17-zeiger.png`](../progress/ozzy/2026-11-17-zeiger.png), Film [`2026-11-17-zeiger.mp4`](../progress/ozzy/2026-11-17-zeiger.mp4)
  (zweifach langsamer); Proben Lasso und iPad halten.
- **7, Meldungen tropfen** (Florian, 17.11.: „Ja, weiter“): Eine neue Meldung fällt als Tropfen von oben in die Hinweiszeile (gestreckt im
  Fallen, kurz gestaucht beim Landen) und verdunstet am Ende (wird weich, steigt ein wenig und vergeht); danach kommt der Hinweis leise
  zurück. Nur die Hinweiszeile (Text), am Werk nichts. *Probe:* Film einer Meldung (Sichern), Kommen und Gehen.
  *Gebaut:* `hinweisSetzen` mit CSS-Bewegungen (`#hinweis.tropfen`, `.verdunsten`, `.leise`), das Verdunsten zählt die Uhr der Anzeige.
  Film [`2026-11-17-meldung.mp4`](../progress/ozzy/2026-11-17-meldung.mp4) (zweifach langsamer, Ausschnitt um die Hinweiszeile).
- **5, Kante wie Tusche:** K macht die Linie vom gewählten Punkt aus dicker, als liefe Tusche in sie hinein (etwa 0,45 s bis an ihre
  Enden); „Kante aus“ zieht sie zum Punkt zurück. Ist eine ganze Linie gewählt, fließt es von allen ihren Punkten aus. Ändert die Kante
  die Lage der Linie (Ecken), gleitet sie dabei wie nach ⌘Z. Nur die Anzeige der Linien; die Haut rechnet das Werk wie bisher.
  *Probe:* Film vorher/nachher (K an einem Punkt, dann wieder aus), gemessen: die Breite am Punkt ist zuerst dick, am fernen Ende
  zuletzt.
  *Gebaut:* `werkBlatt.tuscheMerken`/`tuscheFliessen` (die alten Breiten je Stück und Stelle; die Front läuft nur über den Teil, dessen
  Breite sich ändert, schnell los, dann langsamer; `?fluss=0` aus). Gemessen (strange bird, Punkt der Seite, dreifach langsamer): nach
  0,12 s ist die Linie nahe am Punkt ganz dick, an den fernen Enden noch nicht; beim Ausschalten umgekehrt. Filme
  [vorher](../progress/ozzy/2026-11-17-tusche-vorher.mp4) und [nachher](../progress/ozzy/2026-11-17-tusche.mp4). An einem einzelnen Punkt
  ist die Strecke kurz (die Kante reicht bis zu den Nachbarpunkten); an einer ganzen gewählten Linie fließt es von allen Punkten aus.
- **4, Kreuzungen verschmelzen** (Florian, 17.11.: „ok, mach weiter“): Legt das Werk eine neue Kreuzung an (P, L, Freihand, Formen),
  fließen auf ihren beiden Linien zwei Tropfen zu ihr hin und verschmelzen dort, der Punkt quillt dabei kurz auf (etwa 0,5 s). Nur
  Kreuzungen, die neu entstehen; beim Laden und nach ⌘Z nicht. Nur die Anzeige. *Probe:* Film: eine Gerade mit P quer über die Form.
  *Gebaut:* `werkBlatt.kreuzungenNeu` (Kennungen der Kreuzungen im Werk; neue, höchstens 24 auf einmal, beginnen zu verschmelzen),
  `verschmelzenTropfen` (je Linie ein Tropfen, der 24 px auf ihr zur Kreuzung fließt, der Punkt quillt beim Ankommen auf; die flüssige
  Anzeige lässt sie ineinanderfließen). Film [`2026-11-17-kreuzung.mp4`](../progress/ozzy/2026-11-17-kreuzung.mp4) (dreifach langsamer):
  9 neue Kreuzungen, 27 Tropfen zugleich. Probe zu S8 hält.
- **1, Menüs als Tropfen:** Das Menü wächst als Tropfen aus dem Wort „Ozzy“ und fließt beim Schließen dorthin zurück; der Knopf
  „Maul“ quillt aus der gewählten Linie, „Fressen“ aus dem Knopf „Maul“. *Probe:* Film (Menü auf und zu, Maul und Fressen).
  *Gebaut:* Menü (`reglerZeigen`, CSS `regler-auf`/`regler-zu`: ein runder Ausschnitt wächst aus der Mitte von „Ozzy“ und schrumpft
  dorthin zurück, mit leichtem Nachfedern); Knopf „Maul“ (`maul-quellen`, wächst aus dem Punkt der Linie darüber; nebenbei behoben: die
  alte Bewegung schob ihn am Ende ein Stück zur Seite); „Fressen“ (`fressenQuellen`, fliegt als Tropfen von dort, wo „Maul“ hing, an
  seinen Platz und wird zur Tafel). Film [`2026-11-17-menue.mp4`](../progress/ozzy/2026-11-17-menue.mp4) (zweifach langsamer; für das
  Maul im Film die Linie erst mit K hart gemacht). Probe Sichern hält.
- **2, Regler als Tropfen:** *Gebaut:* `reglerTropfen.ts` (eine Feder je Regler, solange er sich bewegt, in kleinen Schritten gerechnet;
  setzt `--dehn-x`, `--dehn-y`), CSS mit `@property` (der Knopf wächst beim Darüberfahren weich und dehnt sich beim Ziehen in Zugrichtung,
  schmaler dabei). Die Regler von „Fressen“ haben jetzt denselben Faden und Tropfen. Gemessen (schnell hin und her, echte Zeit): bis 1,69
  gedehnt, losgelassen schwingt er bis 0,75 nach, am Ende rund. Film [`2026-11-17-regler.mp4`](../progress/ozzy/2026-11-17-regler.mp4).
- **9, Ordnungslinien:** *Gebaut:* `ordnungslinien()` in `main.ts`: solange Punkte gezogen werden (höchstens zwölf), in den Vier
  Ansichten feine Fäden von der Seite waagrecht zur Front und senkrecht zum Top, im Raum vom Punkt auf der Haut zu seinen Bildern an den
  Wänden; grün und fein wie Verdecktes. Film [`2026-11-17-ordnung.mp4`](../progress/ozzy/2026-11-17-ordnung.mp4).
- **10, Ansichts-Tropfen** (Florian: „Ja, Entwurf zeigen“). *Entwurf*, Bild
  [`2026-11-17-ansichts-tropfen-entwurf.png`](../progress/ozzy/2026-11-17-ansichts-tropfen-entwurf.png): unten rechts, 88 px, ein runder
  Tropfen (Papier, Haarlinie) mit einem Achsenkreuz. S, F, T sind gefüllte Tropfen mit Buchstaben, die Gegenseiten leere Tropfen; was zum
  Betrachter zeigt, ist Tinte, was abgewandt ist, grün und fein wie Verdecktes. Er dreht sich mit der Kamera (rastet eine Ansicht ein,
  fließt ihr Tropfen in die Mitte). Über einem Tropfen quillt er auf, ein Schild sagt, wohin er führt („Front · 3“, „von hinten · ⇧3“).
  Ziehen an ihm dreht wie Ziehen ins Leere, Tippen auf einen Tropfen rastet dort ein, ⇧ und Tippen die Gegenseite, Tippen in die Mitte
  führt zurück in den Raum. In den Vier Ansichten zeigt er den Raum. Nur Anzeige und Bedienung, am Werk nichts. Florian: „Ja, so bauen“.
  *Gebaut:* `ansichtsTropfen.ts` (SVG, je Bild aus der Kamera; Tropfen nach Tiefe geordnet, Aufquellen über dem Zeiger, Schild mit Faden),
  in `main.ts` verdrahtet; das Drehen von Hand ist dafür in `drehenBeginnen`/`drehenZiehen`/`drehenLos` herausgelöst (Ziehen ins Leere,
  ein Finger und der Tropfen drehen gleich). Probe `ozzy-ansichts-tropfen-fenster.mjs` 1 bis 8 halten; Bilder
  [`2026-11-17-ansichts-tropfen.png`](../progress/ozzy/2026-11-17-ansichts-tropfen.png),
  [`…-ueber.png`](../progress/ozzy/2026-11-17-ansichts-tropfen-ueber.png). **Alle zehn Ideen aus S13 sind gebaut.**

Nicht in Ozzy: Pinsel Aufblasen, Absaugen, Glätten (Kern-Sitzung), das Maul-System (eigene Sitzung), iPhone.

**S14 Röntgen** (Florian, 17.11.: „Röntgen zuerst“; aus dem Konzept der Ecke: „⌥ halten macht Linien hinter der Form greifbar“). Solange ⌥
gehalten wird, greift man auch, was hinter der Form liegt (Punkte und Linien, die S7 grün zeigt): wählen, ziehen, löschen, Kante. Dazu sieht
man es besser: Die Haut wird durchsichtiger, die grünen Linien bekommen ihre volle Breite zurück (sie bleiben grün). Loslassen von ⌥ beendet
es; ein Zug, der begonnen hat, läuft weiter. Auf dem iPad (ohne ⌥) ein Knopf „Röntgen“ unten, der es an- und ausschaltet. Am Werk nichts;
in der Bedienung der Linien-Studie nur: im Raum greift sie Verdecktes, wenn Ozzy es sagt (`Raum.roentgen`). *Probe:* ein Punkt hinter der
Form in der eingerasteten Seite: ohne ⌥ nicht zu greifen, mit ⌥ wird er gezogen; ⌘Z; der Knopf auf dem iPad; Bild vorher/nachher.
*Gebaut:* In der Bedienung der Linien-Studie (`kandidat`) gewinnt im Röntgen das Nähere, ein Punkt leicht vor einer Linie (eine Nadel direkt
unter dem Zeiger bleibt vorn, ⌥ knickt sie weiter). In Ozzy: `roentgen` (⌥ gehalten oder Knopf, weich), `werkBlatt.roentgenWert`; die Haut
zu etwa 70 % durchsichtiger, das Grün des Verdeckten kräftiger (`#5e8f57`), verdeckte Linien knapp doppelt so breit; Hinweis „Röntgen …“,
in den Hinweisen „⌥ Röntgen“. Probe `ozzy-roentgen-fenster.mjs` 1 bis 5 halten (mit ⌥ wird der Punkt dahinter 89 Einheiten gezogen);
Probe zu den Richtungen (⌥ knickt beim Drehen) hält. Bild [`2026-11-17-roentgen.png`](../progress/ozzy/2026-11-17-roentgen.png) (oben Raum,
unten Front; links ohne, rechts mit ⌥).


**S15 Lichtring** (Florian, 17.11.: „Ja, Lichtring“; aus S8 und dem Konzept der Ecke). Zieht man mit P eine Gerade im Leeren quer über die
Form (der erste Punkt im Leeren, der Zeiger oder der zweite Punkt im Leeren, noch vor ↩), zeigt ein Lichtring, wo der Loop rundum laufen
wird: auf allen Flächen (Wände im Raum, Felder der Vier Ansichten) als feine grüne Linie, dazu auf der Blase im Raum, und ein Tropfen läuft
auf ihm herum. Gerechnet wird er mit derselben Rechnung, die ↩ benutzt (`loopAusSchnitt` des Kerns, nur gelesen, nichts eingesetzt): Er
zeigt genau den Loop, der entsteht. Gebogen gezogen (das Werk kann es noch nicht) und in der Pose zeigt er nichts. *Probe:* in den Vier
Ansichten mit P über die Seite: der Ring erscheint in Front und Top, liegt dort auf dem Loop, den ↩ dann anlegt (höchstens 1 px
daneben); ohne zweiten Klick folgt er dem Zeiger; Bild.
*Gebaut:* `werkBlatt.lichtring()` (gemerkt je Entwurf, Zeiger und Stand), `lichtringZeichnen()` in `main.ts` (grün, dreimal so breit wie
Verdecktes, mit Spiegelbild; ein Tropfen läuft herum, auf dem Spiegelbild gegenläufig). Probe `ozzy-lichtring-fenster.mjs` 1 bis 5 halten:
168 Proben, folgt dem Zeiger, der neue Loop liegt höchstens 0,11 px neben dem Ring. Bild
[`2026-11-17-lichtring.png`](../progress/ozzy/2026-11-17-lichtring.png) (Vier Ansichten: Front, Top und Raum zeigen den Ring).

**Rückmeldung vom 17.11. (Florian, wörtlich):** „dreimal tippen würde ic erstmal weglassen. pose kommt zur maulsitzung. du hast gute
arbeit geleistet. Eines hätte ich noch gern. in der viereransicht soll man auch die ansichten zoomen und bewegen können, momentan kann ich
das nicht. auch mit wenden wie bei der vollansicht. Um die vier ansichten zu verknüpfen, hätte ich gerbenden schnittpunkt der vier
ansichten auch bei der einzelansicht an der jeweiligen ecke eingeblendet. daran kann ic die anderen ansichten ins bild ziehen um smooth in
dieviereransicht zu gleiten. In der projektionsansichr soll auch die ecke einen punkt haben. Wenn ich an diesem ziehe soll es smooth an
die bewegung gekoppelt zur viereransicht aufklappen. es wird dann eine haarlinie eingezeichnet, die anzeigt ab wann die ansicht komplett
zur viereransicht aufgeklappt ist. Bei doppelklick auf den punkt wechselt es von alleine zur letzt gewählten proportion der vier ansichten.
Wenn ich ziehe kann i ch quasi auch gleich bestimmen welches der felder am größten wird. Außerdem ist der übergang zur viereransicht bei
schwarzem hintergrund nicht schön und die ansichten drehen sich nicht schön. lässt sich das beheben?“
Damit fallen weg: dreimal Tippen (S12) und „Pose ohne Regler“ (gehört zur Maul-Sitzung). Neu sind S16 bis S19, in seiner Reihenfolge,
die Behebung zuerst. Alle vier hängen an einem Ding: **der Kreuzung der Vier Ansichten** (dem Tropfen, an dem die Teiler sich kreuzen).
Im Raum ist sie die Ecke der Kiste, in einer Einzelansicht die Ecke des Bilds, in den Vier Ansichten der Tropfen.

**S16 Aufklappen von hinten.** *Befund* (Film: „strange bird“ von hinten, um 150° gedreht, dann Tab und zurück): (1) Das Schwarz der
Rückseite ist im ersten Bild nach Tab ganz weg und kommt im letzten Bild des Rückwegs auf einmal zurück (`hintenRechnen` gibt ab
`vier` > 0,02 nichts mehr). (2) Die Kamera dreht beim Aufklappen in einem Zug von der Lage im Raum auf die Seite, von hinten um 110° bis
150°. Dabei stehen die Wände nacheinander auf der Kante (ihre Zeichnungen werden zu Strichen), und weil von hinten die Wand der Front rechts
liegt, wandert ihr Scharnier quer über die Seite nach links. Dasselbe von unten (der Boden ist dann oben) und schon von vorn links. Nur von
vorn rechts oben (dort liegt die Hausansicht) liegen die Wände so, wie die Kiste aufklappt.
*Behebung:* (1) Steht die Kamera nicht auf dieser Seite der Kiste, dreht sich zuerst der Raum, auf dem kürzesten Weg und wie beim Drehen von
Hand, bis die Wände so liegen (sie wechseln dabei weich wie beim Drehen, die Kante des Schwarz wandert aus dem Bild). Kurz bevor die
Drehung endet, klappt die Kiste auf wie bisher. Zurück klappt sie in diese Lage zu, nicht wieder nach hinten. (2) Das Schwarz wird beim
Aufklappen mit der Kamera des Aufklappens gerechnet, „vorn“ dreht dabei von der Hausansicht zur Seite: Die Kante wandert aus dem Bild,
statt zu springen. Am Werk nichts.
*Probe* (`ozzy-auffalten-hinten-fenster.mjs`): von hinten und von unten je Tab hin und zurück, Bild für Bild: (1) Das Schwarz ändert sich
je Bild um höchstens 15 % der Fläche (kein Sprung), am Ende ist es weg. (2) Wenn die Kiste aufzuklappen beginnt, steht die Kamera vorn
rechts oben. (3) Beim Aufklappen ein Gipfel der Geschwindigkeit je Bezugspunkt (wie die Probe zu S10). (4) Zurück kein Schwarz. Dazu hält
die Probe zu S10 von vorn (dort dreht nichts vorher). Film vorher und nachher.
*Gebaut (17.11.):* `vorDreh` (die Drehung von Hand, als Fahrt), `vorderseiteZiel` (die nächste Lage, in der die Kamera 0,07 vor allen drei
Wänden steht), `vierWarten` (aufgeklappt wird, sobald sie 0,01 davor steht: Die alte Wand ist dann ausgeblendet; so überlappen Drehen und
Aufklappen um drei bis vier Bilder), `hintenRechnen` mit der Kamera des Aufklappens. Wer selbst dreht, bricht ab. Die Drehung dauert je
nach Winkel 0,25 bis 0,55 s (bei 114° 0,46 s), dazu das Aufklappen wie bisher (0,6 s). Probe `ozzy-auffalten-hinten-fenster.mjs` 1 bis 6
halten: von hinten (Schwarz vorher 98 % der Fläche) größte Änderung des Schwarz je Bild 7 %, von unten 10 %, das Aufklappen beginnt erst
vorn rechts oben, nach dem Drehen ein Gipfel je Punkt, zurück ohne Schwarz; die Probe zu S10 hält. Zwischen Drehen und Aufklappen wird es kurz
langsamer (die Drehung bremst, das Aufklappen beginnt, Tiefpunkt rund 2 px je Bild gegen 13 und 10 px davor und danach): Es bleiben zwei
Bewegungen. Ganz ohne das ginge es nur, wenn der Raum ein Stück über die Seite hinaus dreht und zurückschwingt, während die Kiste aufklappt.
Film [`2026-11-17-vier-hinten-vorher-nachher.mp4`](../progress/ozzy/2026-11-17-vier-hinten-vorher-nachher.mp4) (links vorher, rechts
nachher, zweifach langsamer), dazu [`2026-11-17-vier-hinten.mp4`](../progress/ozzy/2026-11-17-vier-hinten.mp4) groß.

**S17 Zoomen, Schwenken und Wenden in den Vier Ansichten.** *Entschieden (Florian, 17.11.): „Jedes Feld für sich“* (statt gekoppelt wie
eine technische Zeichnung). Jedes der vier Felder hat seinen eigenen Zoom und seine eigene Verschiebung. Zoomt man in einem Feld, bleibt
dort liegen, was unter dem Zeiger liegt; die anderen Felder bleiben, wie sie sind (die Ordnungslinien zwischen den Feldern laufen dann
schräg, bis „Einpassen“). Im Feld des Raums zoomt und schwenkt die Blase in ihrem Feld; Ziehen ins Leere dreht dort wie bisher. Jedes Feld
schneidet ab, was über seinen Rand ragt. Bedienung wie in der Vollansicht: Mausrad oder Kneifen zoomt (in den Vier Ansichten zum Zeiger
hin), auf dem iPad zwei Finger zoomen und schwenken im Feld, wo sie liegen; am Mac schwenkt Leertaste + Ziehen (wie in Illustrator; dann
auch in der Vollansicht); „Einpassen“ (Pos1) setzt alle Felder zurück. Zoom und Verschiebung bleiben beim Wechsel in den Raum und zurück
erhalten; Auf- und Zuklappen landen genau im gezoomten Feld (die Zeichnung gleitet und wächst dabei auf ihrer Wand, die Wand schneidet ab).
Wenden wie in der Vollansicht: ⇧ + Ziehen in einem Feld dreht es mit der harten Kante (die Kante bleibt in ihrem Feld), ⇧ + Doppelklick
wendet ganz; ein gewendetes Feld zeigt die Gegenseite, die Felder bleiben, wo sie sind; beim Zuklappen drehen gewendete Felder zurück.
In zwei Teilen: **S17a** Zoomen und Schwenken je Feld, mit Schnitt am Rand und Landen beim Aufklappen; **S17b** Wenden je Feld.
*Probe:* in der Seite zum Kopf hin zoomen: der Punkt unter dem Zeiger bleibt (höchstens 1 px), Front, Top und Raum bleiben unverändert;
schwenken in jedem Feld; nichts ragt über einen Feldrand; Tab zurück und wieder hin: am Ende genau das gezoomte Feld (höchstens 1 px), kein
Sprung unterwegs; ein Punkt im gezoomten Feld lässt sich greifen und ziehen; die Front wenden; Bild.
*S17a gebaut (17.11.):* `feldBlick` (Zoom und Verschiebung je Feld), `imFeld`/`ausFeld` mit ihnen, `feldZoomen` (zum Punkt hin), Rad über
einem Feld, Leertaste + Ziehen (kurz getippt bläst die Leertaste weiter noch einmal auf), zwei Finger im Feld (im Raum dreht das Verdrehen
weiter), Pos1 setzt alles zurück. Abschneiden am Feldrand in der Anzeige selbst (`fluessig.ts`: jede Kapsel kann einem konvexen Bereich
gehören und wird an seinen vier Kanten genau geschnitten; Art + 8 · Bereich; die Linien-Studie gibt den Bereich je Linie und Punkt über
`Raum.bereich` weiter). Beim Auf- und Zuklappen sind die Bereiche die Wände, die sich aufklappen; die Zeichnung gleitet und wächst auf
ihnen (`faltPunkt`). Die Blase bleibt in ihrem Feld (die Haut wird ab der Hälfte des Aufklappens am Feld abgeschnitten). Probe
`ozzy-feld-zoom-fenster.mjs` 1 bis 7 halten: der Ort unter dem Zeiger 0,0 px daneben bei 4,2-fachem Zoom, Front, Top und Raum unverändert
(0,0 / 0,0 / 0,3 % der Bildpunkte), Schwenken 0,0 px, ein Punkt der gezoomten Seite folgt der Maus (0,0 px), Tab zurück und hin ohne
Nachschieben, ein Gipfel je Punkt, am Ende 0,0 px; die Proben zu S10, S16 und zum Bearbeiten halten, beide Studien laufen. Bild
[`2026-11-17-feld-zoom.png`](../progress/ozzy/2026-11-17-feld-zoom.png) (links offen, rechts die Seite gezoomt und die Front geschwenkt).
*S17b gebaut (17.11.):* `feldWende` (Winkel je Feld; Seite und Front drehen um die Hochachse, der Top um die Querachse), in `imFeld` und
`ausFeld` als Stauchung mit cos; ⇧ + Ziehen in einem flachen Feld dreht (so schnell wie das Wenden in der Vollansicht), los fährt es zur
näheren Seite, ⇧ + Doppelklick wendet ganz; über einem Punkt oder einer Linie gilt ⇧ weiter der Auswahl. Die Rückseite wie in der
Vollansicht: die Kante (`feldHinten`, Formel von `kanteMitHeim`) wandert quer durchs Feld und bleibt in ihm, gewendet ist das Feld dunkel,
die Linien hell (die Anzeige der Linien füllt das Dunkel selbst, `dunkelFuellen`); Verdecktes von der anderen Seite gerechnet (`vorn`).
Tab wendet gewendete Felder erst zurück, dann klappt die Kiste zu. Probe `ozzy-feld-wenden-fenster.mjs` 1 bis 6 halten (bei 45° quer
0,71; gewendet 0,00 px gespiegelt, ganz dunkel; ein Punkt der gewendeten Front folgt der Maus; der Top wendet mit ⇧ + Doppelklick; Tab
wendet zurück, die Kiste bleibt bis dahin offen); die Proben zu S17a, S10 und zu den Ansichten halten. Ein Punkt auf der Mittelebene, der von
der Gegenseite hinter der Form liegt, ist dort verdeckt und wie überall nur mit Röntgen zu greifen. Bild
[`2026-11-17-feld-wenden.png`](../progress/ozzy/2026-11-17-feld-wenden.png) (links die Front halb gedreht, rechts Front und Top gewendet).

**S18 Der Tropfen an der Ecke einer Einzelansicht.** In der eingerasteten Seite, Front und Top sitzt der Tropfen der Kreuzung an der Ecke
des Bilds, an der in den Vier Ansichten ihre Kreuzung liegt: Seite unten links, Front unten rechts (der Ansichts-Tropfen rückt dafür nach
oben), Top oben links (unter „Ozzy“). Zieht man ihn ins Bild, folgt die Kreuzung dem Zeiger: Die Teiler kommen als Haarlinien mit, die
anderen drei Ansichten gleiten von den Rändern herein, die eigene Ansicht wird zu ihrem Feld; Maßstab und Lage gleiten dabei von der
Einzelansicht zu den Vier Ansichten. Eine Haarlinie zeigt, ab wo es ganz die Vier Ansichten sind: der Rand des Bereichs, in dem die
Kreuzung liegen darf (18 % bis 82 % des Bilds). Loslassen davor gleitet zurück in die Einzelansicht, dahinter bleiben die Vier Ansichten
mit der Kreuzung dort. Doppelklick auf den Tropfen: wie Tab, mit den zuletzt gewählten Proportionen. Eine gewendete Einzelansicht bleibt im
Feld gewendet (S17). *Probe:* in der Seite den Tropfen von unten links zur Mitte ziehen: nichts springt (höchstens 2 px je Bild), Front,
Top und Raum gleiten herein; vor der Haarlinie losgelassen gleitet es zurück, dahinter liegt die Kreuzung unter dem Zeiger; Doppelklick;
Film.

**S19 Der Punkt an der Ecke im Raum.** Im Raum sitzt an der Ecke, an der die drei Wände zusammenstoßen, ein Punkt: der Tropfen der
Kreuzung, solange die Kiste zu ist. Zieht man an ihm, klappt die Kiste auf, gekoppelt an den Zug. Der Punkt bleibt unter dem Zeiger und wird
zur Kreuzung der Teiler; wo man ihn hinzieht, liegt am Ende die Kreuzung (so bestimmt man gleich, welches Feld am größten wird). Beim
Ziehen erscheint eine Haarlinie: ein Kreis um die Ecke, auf ihm ist die Kiste ganz aufgeklappt. Loslassen davor klappt weich wieder zu,
dahinter bleiben die Vier Ansichten. Doppelklick auf den Punkt klappt von selbst auf, mit den zuletzt gewählten Proportionen. Von hinten oder
von unten liegt die Ecke der Wände nicht dort, wo die Kiste aufklappt: Dort zeigt der Raum den Punkt nicht, Tab klappt auf wie in S16.
*Probe:* Ecke ziehen: der Punkt bleibt unter dem Zeiger (höchstens 2 px), die Haarlinie erscheint, auf ihr ist die Kiste ganz offen;
Loslassen davor und dahinter; die Proportionen danach entsprechen dem Loslassen; Doppelklick; Film.

*Rückweg* (Florian, 17.11.: „und ja auch mit rückweg“): In den Vier Ansichten den Tropfen in eine Ecke ziehen, dann füllt die Ansicht
dieser Ecke das Bild (Seite unten links, Front unten rechts, Top oben links; oben rechts der Raum, die Kiste klappt dabei zu). Der
umgekehrte Weg von S18 und S19, mit derselben Haarlinie; wird mit ihnen gebaut.

*S18, S19 und der Rückweg gebaut (17.11., Florian: „S18 und S19 zuerst“):* Ein Zug an der Kreuzung (`eckZug`), der über den erlaubten
Bereich hinaus darf (`kreuzFrei`): Die Felder richten sich nach der freien Kreuzung, der Maßstab nach ihrer Lage im erlaubten Bereich; das
Feld der Einzelansicht gleitet mit dem Anteil, um den die Kreuzung in ihre Ecke gerückt ist, zur Abbildung der Einzelansicht (`blickIn`:
Zoom geometrisch, die Mitte der Form auf gerader Bahn; in der Ecke zeigt es genau sie, gewendet bleibt gewendet). **S18:** In der
eingerasteten Seite, Front und Top sitzt der Tropfen an der Ecke (unten links, unten rechts, oben links; in der Front rückt der
Ansichts-Tropfen nach oben); gezogen gleiten die anderen Ansichten von den Rändern herein, der Rand des erlaubten Bereichs ist die
Haarlinie; davor losgelassen fährt die Kreuzung zurück in die Ecke (wieder die Einzelansicht, die Kamera hat sich nicht bewegt), dahinter
bleiben die Vier Ansichten und das Feld des Raums dreht in den Raum. **S19:** Im Raum (nur vorn rechts oben, S16) sitzt der Punkt an der
Ecke der Kiste; gezogen klappt sie mit dem Abstand vom Anfang auf (auf dem Kreis ganz), die Ecke der Kiste liegt dabei unter dem Zeiger
(`faltAnker` in `faltRechnen`) und wird zur Kreuzung; davor losgelassen klappt sie zu, die Ecke fährt an ihren Platz. **Rückweg:** Der
Tropfen der Vier Ansichten über die Haarlinie hinaus wird ein Zug zur nächsten Ecke: unten links die Seite, unten rechts die Front, oben
links der Top (die Kamera rastet dort ein, während die Kreuzung in die Ecke fährt), oben rechts der Raum (die Kiste klappt zu; nur, wenn
kein Feld gewendet ist). Doppelklick auf den Tropfen an der Ecke wie Tab. Nebenbei behoben: Beim Ziehen am Tropfen der Kreuzung rechnete
der Zug waagrecht mit der Länge statt mit der Tiefe (seit S10): Die Kreuzung lief dem Zeiger davon, jetzt liegt sie unter ihm. Probe
`ozzy-ecke-fenster.mjs` 1 bis 11 halten (Drücken 0,0 px, größter Schritt der Seite 3,1 px bei 4 px Zug, zurück 0,0 px, Kreuzung unter dem
Loslassen 0,0 px, Rückweg ohne Sprung beim Wechsel 0,0 px, S19 Tropfen unter dem Zeiger 0,0 px, wieder zu 0,0 px, Doppelklick); die
Proben zu S10, S16, S17, den Ansichten und dem Ansichts-Tropfen halten. Film in echter Geschwindigkeit
[`2026-11-17-ecke.mp4`](../progress/ozzy/2026-11-17-ecke.mp4) (Seite → Vier → Seite, Raum → Vier → Raum), Bild
[`2026-11-17-ecke.png`](../progress/ozzy/2026-11-17-ecke.png).

**Rückmeldung vom 17.11., zweite (Florian, wörtlich):** „Noch eines: der look bei den linienansichten unterscheidet sich noch deutlich. in
dr studie ist mehr verdeckt und die linien laufen sauber durch verjüngung in form. Können die kanten im raum statt auszufaden auch durch
verjüngung und verdickung an ihre stelle gleiten? wenn ich den raum drehe und auch beim aufziehen in die 4ere ansicht. das würde gut zum
liquid drop design passen.“ Seine Bilder (dieselbe Form von vorn):
[Studie](../look/ozzy/2026-11-17-florian-linien-studie.png), [Ozzy](../look/ozzy/2026-11-17-florian-linien-ozzy.png).

**S20 Linienansichten wie in der Studie.** *Befund:* Die Studie zeichnet den Körper zuerst weiß in einen eigenen Puffer, mit seiner Tiefe
je Bildpunkt (`fluessig.ts`, `Koerper`). Ihr Umriss ist eine Hülle, von der nur die Rückseiten gezeichnet werden: Sie schaut nur am Rand und
an Falten hinter der Haut hervor, wird dort von selbst schmaler und läuft in die Form aus. Jede Linie wird je Bildpunkt gegen diese Tiefe
geprüft: davor Tinte, dahinter grün. Ozzy zeichnet in den flachen Ansichten keinen Körper; der Umriss sind Striche aus allen Kanten, an
denen sich die Haut wegdreht, auch hinter der Form (die dicken Bögen im Bauch und am Hals in seinem Bild), und die Linien werden nur gegen
eine grobe Tiefenkarte je Achse geprüft (S7). *Vorschlag:* in den eingerasteten Ansichten und den drei Feldern denselben Weg wie die
Studie, mit derselben Anzeige: die Haut des Werks als weißer Körper mit Tiefe, Umriss als Hülle, Verdecktes je Bildpunkt; in den Feldern je
Feld mit seiner Abbildung (S17). Die Seifenhaut bleibt im Raum. *Probe:* seine Form in derselben Ansicht wie sein Bild, Studie neben Ozzy:
die Bögen hinter der Form sind weg, die Linien dahinter grün, der Umriss läuft verjüngt in die Form; Tempo je Bild.
*Gebaut (17.11., Florian: „Ja, S20“):* Beweis zuerst, Bild [`2026-11-17-linien-koerper.png`](../progress/ozzy/2026-11-17-linien-koerper.png)
(„teat firefish“ von vorn: links die Studie, in der Mitte Ozzy vorher, rechts nachher). Die Anzeige (`fluessig.ts`) kann den Körper jetzt
durchsichtig zeichnen (außerhalb liegt die Seifenhaut), in mehreren Ansichten mit je eigenem Rechteck und eigener Tiefe (`gl_FragDepth`
aus der Tiefe zum Betrachter) und mit einer Deckung; auf der Rückseite tauschen Körper und Umriss die Farben wie die Linien. In Ozzy:
`linienKoerper` (die glatte Haut des Werks, eingerastet mit der Kamera, in den Vier Ansichten je flaches Feld mit `feldAnsicht`: genau
`imFeld` mit Zoom, Verschiebung und Wenden, die Tiefe von der Seite, von der das Feld geschaut wird); die Flächen geben ihren Linien die
echte Tiefe (`Flaeche.tiefe`, `tiefeDerKamera`, `tiefeImFeld`), die Anzeige entscheidet je Bildpunkt (Duldung 2 % des Halbmessers wie in
der Studie). Der Körper blendet weich ein, sobald eine flache Ansicht ruht (0,25 s), der alte Umriss dabei aus; während Fahrten und beim
Aufklappen bleibt es wie bisher. Die Breite der Linien (fein, wenn verdeckt) kommt weiter aus der Tiefenkarte (S7). `?koerper=0` schaltet
es ab. Probe `ozzy-linien-koerper-fenster.mjs` 1 bis 5 halten: in der Front Tinte 67 % von vorher (die Bögen weg), Grün 1,3-fach; der
Körper blendet in 15 Bildern ein; drei Felder mit Körper, das Feld des Raums unverändert; Rechnen je Bild 2,1 statt 5,8 ms (der alte
Umriss entfällt). Die Proben zu S7, S10, S16, S17, S18/S19, zu den Ansichten, zum Bearbeiten und zum Röntgen halten, beide Studien laufen.
Vier Ansichten vorher und nachher: [`2026-11-17-linien-koerper-vier.png`](../progress/ozzy/2026-11-17-linien-koerper-vier.png). Offen:
an Linien, die fast genau auf der Haut verlaufen, entstehen vereinzelt kurze Striche (vorn und verdeckt wechseln je Bildpunkt); beim
Aufklappen und Einrasten springt der Look am Ende (weich eingeblendet, nicht mitgeführt).
*Nachgeschärft (17.11., Florian: „Erst S20 nachschärfen“):* (1) Die kurzen Striche kamen nicht von den Linien, sondern von der Hülle: An
flachen Knicken der Haut (harte Kanten des Werks) schaute sie stückweise hervor. Sie liegt jetzt 6 % des Halbmessers hinter der Haut
(`huelleTiefe`, eigene Tiefe auch eingerastet) und zeigt sich nur am Rand und an tiefen Falten. Bild
[`2026-11-17-linien-koerper-kinn.png`](../progress/ozzy/2026-11-17-linien-koerper-kinn.png) (unter dem Kinn, links vorher, rechts nachher).
(2) Die Breite folgt jetzt derselben Tiefe wie die Farbe: Mit dem Körper bekommt eine Linie ihre volle und ihre feine Breite
(`LinienProben.fein`, in der Kapsel die Felder 10 und 11), die Anzeige entscheidet je Bildpunkt weich: Je weiter hinter der Haut (über
2,5 % des Halbmessers), desto schmaler die Tinte und desto breiter das feine Grün; die Linie verjüngt sich ins Grün, statt zu wechseln. Die
Schicht nach der Tiefenkarte bleibt fürs Greifen (ohne Röntgen nur Vorderes). (3) Der Körper geht mit den Fahrten: beim Auf- und Zuklappen
liegt er auf den Wänden, die sich aufklappen (`wandAnsicht`: dieselbe Abbildung wie ihre Zeichnung, nur in ihrem Viereck), seine Deckung
wächst mit dem Stand (ab 35 % ganz); beim Einrasten blendet er im letzten Teil der Fahrt ein (ab 60 %), beim Lösen umgekehrt; die
Verdeckung kommt mit ihm (die Duldung ist groß, solange er blass ist), der alte Umriss blendet dabei aus. Probe
`ozzy-linien-koerper-fenster.mjs` 1 bis 8 halten (an den Stellen der Striche keine Tinte; beim Aufklappen 24 Bilder mit Körper auf den
Wänden, am Ende 0,0 % der Seite anders; Einrasten mit der Fahrt, voll mit ihrem Ende; Grün jetzt 1,26-fach, die Schwelle von 1,3 auf 1,2
gesenkt, weil sich eine Linie knapp hinter der Haut erst verjüngt, bevor sie grün ist), dazu alle Proben von S7 bis S19, zum Bearbeiten
und zum Röntgen; beide Studien laufen. Film [`2026-11-17-linien-koerper-fahrt.mp4`](../progress/ozzy/2026-11-17-linien-koerper-fahrt.mp4)
(auf, zu, Front einrasten und lösen; echte Geschwindigkeit).

**S21 Kanten gleiten statt auszublenden.** *Heute:* Dreht man den Raum über eine Wand hinweg, wird ihre Zeichnung samt den Kanten der Ecke
gleichmäßig dünner bis zur Haarlinie (Stärke der Wand), die Punkte verschwinden auf einmal, auf der anderen Seite kommt alles ebenso
zurück. Beim Aufklappen verschwinden die Wände des Raums im ersten Bild, die Felder übernehmen. *Vorschlag:* Keine Linie blendet aus. Muss
eine Zeichnung die Seite wechseln, gleitet sie durch den Raum zur anderen Wand, unterwegs verjüngt (an den Enden zuerst, in der Mitte des
Wegs am schmalsten) und am Ziel wieder voll; die drei Kanten der Ecke gleiten genauso zur neuen Ecke, die Punkte fließen mit. Beim
Aufklappen gehen die Kanten der Wände und die Teiler durch Verjüngung und Verdickung ineinander über. *Probe:* zuerst ein Film (Raum um
360° gedreht, Aufklappen), vorher und nachher; keine Linie wird blasser, nur schmaler und breiter.
*Gebaut (17.11., Florian: „Ja, S21“):* `wandGleiten`: Jede Wand liegt stetig dort, wo sie gerade hin gleitet: Steht die Kamera weiter als
0,2 (Anteil der Richtung) vor ihrer Ebene, bei ±L wie bisher; dreht die Kamera über die Ebene, fährt sie in einer weichen Kurve durch den
Raum auf die andere Seite (auf der Kante als feiner Strich durch die Blase), ihre Linien und Punkte werden dabei schmaler (in der Mitte des
Wegs ein Viertel) und am Ziel wieder voll. Die Ecke gleitet mit: Jede ihrer drei Kanten liegt in zwei Wänden, spannt über die ganze Kiste
und ist so schmal wie die schmalere der beiden. Punkte auf einer gleitenden Wand schrumpfen mit (`Punkt.gross`, `Punkt.zeigen` in der
Linien-Studie), statt unter halber Stärke zu verschwinden; gegriffen werden sie wie bisher erst ab halber Stärke. Das Aufklappen beginnt bei
den Wänden, wo sie gerade sind. Beim Aufklappen werden die vier Kanten an der Ecke selbst zu den Armen der Teiler (sie sind es am Ende
genau): ihre Breite geht stetig von der Kante im Raum in die des Teilers über; die durchgehenden Teiler, die bisher daneben aus dem Nichts
wuchsen, gibt es dabei nicht mehr. Probe `ozzy-gleiten-fenster.mjs` 1 bis 5 halten (die Front gleitet in 12 Bildern von −L nach +L, größter
Schritt 0,25 L statt 2 L in einem Bild; schmalste Breite 25 %; 42 Punkte der Front bleiben zu sehen; beim Aufklappen keine Linie außerhalb
der Wände); die Proben zu S7, S10, S16 bis S20, zu den Ansichten, zum Bearbeiten, zum Röntgen und zum Lichtring halten. Filme
[`2026-11-17-raum-gleiten-vorher-nachher.mp4`](../progress/ozzy/2026-11-17-raum-gleiten-vorher-nachher.mp4) (links vorher, rechts nachher:
360° um die Hochachse, unter den Boden und zurück, Tab auf und zu; echte Geschwindigkeit) und
[`2026-11-17-raum-gleiten.mp4`](../progress/ozzy/2026-11-17-raum-gleiten.mp4) groß; Bild der ersten Kreuzung
[`2026-11-17-raum-gleiten-kreuzung.png`](../progress/ozzy/2026-11-17-raum-gleiten-kreuzung.png) (oben vorher, unten nachher).

Reihenfolge: S17, S18 und S19 (mit dem Rückweg), dann S20 und S21.


## 5. Ideen für mehr liquid drop

Alles in derselben flüssigen Anzeige, die Linien und Punkte schon zeichnet (weiches Vereinigen, Federn):

1. **Menüs wachsen als Tropfen** aus ihrem Ursprung (aus dem Wort „Ozzy“, aus der gewählten Linie für „Maul“) und fließen beim
   Schließen dorthin zurück; „Fressen“ quillt aus dem Tropfen „Maul“.
2. **Regler als Tropfen auf einem Faden:** Der Knopf ist ein Tropfen, der sich beim Ziehen dehnt und am Ende nachschwingt.
3. **Lasso als Faden,** der sich am Ende wie ein Tropfen schließt; Gewähltes leuchtet nicht, es quillt kurz.
4. **Neue Kreuzungen verschmelzen:** Zwei Tropfen fließen ineinander, wenn eine Linie eine andere kreuzt.
5. **Kante wie Tusche:** K lässt die Linie vom Punkt aus dicker fließen, „Kante aus“ zieht sie zurück.
6. **⌘Z fließt zurück:** Linien gleiten in ihre alte Lage (kurz, 150 bis 250 ms), statt zu springen.
7. **Meldungen tropfen** von oben in die Hinweiszeile und verdunsten.
8. **Der Zeiger nimmt die Form des Werkzeugs an:** Spitze bei P, Schlinge beim Lasso, Ring beim Pinsel, fließend beim Wechsel.
9. **Ordnungslinien als feine Fäden** zwischen den Ansichten, solange ein Punkt gefasst ist.
10. **Ein Ansichts-Tropfen** in der Ecke zeigt, von wo man schaut; ziehen dreht, Tippen auf eine Seite rastet ein, ⇧ wendet.

## 6. Entschieden (Florian, 16.11. nachmittags)

> „wenden auch gerne so: mit shift+maus soll sich das blatt drehen aber beim loslassen wieder zurück in die blattansicht gleiten. Wie
> in vorherigen editor layouts, soll der hintergrund als schwarze harte kante reindrehen wenn ich über die hälfte drehe und dann da
> einrasten. schift doppelklick ist auch gut zusätzlich. das netz nimmt dann die kontrastfarbe weiß an. mal sehen wie das wirkt.
> Gerne die harte kante auch wie eine flüssigkeit reinkommen lassen beim wenden. Es soll sehr elegant sein und intuitive bedienung
> erleichtern. Sonst gerne alle ideeen zu liquid drop einbauen. je mehr desto besser:)“

- **Wenden (F2):** ⇧ + Ziehen dreht das Blatt um seine senkrechte Achse; beim Loslassen gleitet es zurück in die Blattansicht. Ist
  es über die Hälfte gedreht (über 90°), dreht der Grund als **schwarze, harte Kante** herein, wie eine Flüssigkeit, die über das
  Blatt läuft, und es rastet auf der Rückseite ein: schwarzer Grund, Linien und Punkte in der Gegenfarbe Weiß (wie „von hinten
  dunkel“ in der Blaupause). ⇧ + Doppelklick wendet ebenso. Zurück genauso. „Mal sehen, wie das wirkt“: zuerst als Film.
- **liquid drop (F6):** alle Ideen aus Abschnitt 5, „je mehr, desto besser“ (S13, über die Schritte verteilt, wo sie hingehören).
- **F1, F3, F4, F5:** wie vorgeschlagen (kein Rahmen neben dem Lasso; in einem flachen Feld faltet Ziehen ins Leere zurück in den
  Raum und dreht; Start ohne Linie als Wahl; zuerst S1 bis S3).

## 7. Zu entscheiden (Stand vor seiner Antwort)

| | Frage | Vorschlag |
| --- | --- | --- |
| F1 | Rahmen neben dem Lasso? | nein: L ist Lasso; der Rahmen fällt weg (Ziehen ins Leere dreht) |
| F2 | Wenden | ⇧ + 1/3/7; eingerastet auch ⇧ + Doppelklick ins Leere |
| F3 | Ziehen ins Leere in einem flachen Feld der Vier Ansichten | die Vier Ansichten falten sich zurück in den Raum und es dreht (die Felder sind die aufgeklappten Wände) |
| F4 | Start ohne Linie an der Spiegelkante | als Wahl im Menü; Grundwert nach dem Beweis S9 |
| F5 | Reihenfolge | S1 bis S3 zuerst (Tempo und ruhige Haut sind die Grundlage), dann S4 bis S7 (Bedienung), dann S8 bis S12 |
| F6 | Welche Ideen aus Abschnitt 5 | Florian wählt |
