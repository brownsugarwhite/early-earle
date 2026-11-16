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
Grundwert: Florian entscheidet.

**S10 Auffalten zur Viereransicht.** Die drei Wände der Ecke klappen um ihre Kanten flach (Boden nach unten, Seitenwand zur Seite,
nach der Projektionsmethode 1), ihre Linien gehen mit, weil sie auf der Wand liegen; die Kamera wird dabei parallel; die Blase gleitet
ins vierte Feld. Nichts wird zweimal gezeigt oder übergeben. Zurück faltet es sich genauso. *Zuerst ein Film als Beweis* (vorher und
nachher, gleiche Ansicht), dann der Bau. *Probe:* Film; in keinem Bild eine Linie doppelt, kein Sprung in Lage oder Größe; Florian
sieht.

**S11 Sichern.** Im Menü „Ozzy“: Sichern unter einem Namen (neu), Überschreiben nur nach Frage; ⌘S. *Probe:* sichern, neu laden,
gleich.

**S12 iPad mit Stift (Schritt für Schritt, gemeinsam).** Erst: Stift = Zeiger (mit Schweben über dem Bildschirm, wo das iPad es kann),
zwei Finger drehen, schwenken und zoomen, Tasten als kleine Knöpfe (Ansichten, Vier, Zurück, Löschen, Kante, Werkzeuge); dann Florians
Rückmeldung am Gerät. *Probe:* am iPad im Simulator und an seinem Gerät.

**S13 liquid drop weiter** (Florian wählt aus Abschnitt 5).

Nicht in Ozzy: Pinsel Aufblasen, Absaugen, Glätten (Kern-Sitzung), das Maul-System (eigene Sitzung), iPhone.

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
