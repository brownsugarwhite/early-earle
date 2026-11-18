# Ozzy: Objekte, Spiegel und Nähte (Plan, 18.11.2026)

Sitzung „Objekte und Spiegel“, Zweig `claude/ozzy-donut-mirror-system-7a31b7` (von `claude/ozzy`, Stand `6bef9f17`), eigener
Arbeitsbaum, eigenes Fenster: `http://localhost:5211/ozzy.html` (Eintrag `ozzy-objekte`). Dein Fenster 5205 bleibt, wie es ist.
Dein Auftrag steht wörtlich im Anhang A.

**Gebaut wird der Reihe nach (Abschnitt 6).** Wo ich etwas für dich entschieden habe, steht es in Abschnitt 7; was gebaut ist,
steht in Abschnitt 10.

## 1. Warum der Donut in Ozzy nicht geht

Im Prüffenster (`kurven.html`, dein Fenster 5194) besteht der Donut aus drei Dingen. Ozzy hat nur das erste übernommen:

| Teil | Prüffenster | Ozzy |
| --- | --- | --- |
| Die Rechnung: Linien und Haut dürfen durch die Spiegelebene; „fest machen“ schneidet und verbindet (`mitteFestmachen`) | ja | ja (dasselbe Werk) |
| Die Anzeige schneidet jede Hälfte an der Spiegelebene ab (je Bildpunkt, im Material) | ja | **fehlt**: Ozzy hat eigene Materialien (Seifenhaut, Solid, …), der Schnitt steckte im Material des Prüffensters |
| Punkte an den Kreuzungen mit der Mitte, der gezogene Punkt markiert, Löschen macht fest | ja | **fehlt**: Das zeichneten die Blätter des Prüffensters, Ozzy zeichnet seine Linien selbst |

Nachgestellt an „strange bird“ (Punkt an der Seite in der Top-Ansicht 188 über die Mitte gezogen): Die Hälften laufen ungeschnitten
durcheinander. Bilder: [`2026-11-18-donut-vorher-seifenhaut.png`](../progress/ozzy/2026-11-18-donut-vorher-seifenhaut.png),
[`…-solid.png`](../progress/ozzy/2026-11-18-donut-vorher-solid.png). Es ist also nichts kaputtgegangen; der sichtbare Teil ist nie
nach Ozzy gekommen.

## 2. Die Idee: Objekte, Teile und die Naht

Drei Wörter tragen alles, was du beschrieben hast.

- **Objekt:** was der dunkle Zeiger (V) wählt. Es hat einen Namen, seinen eigenen Spiegel und besteht aus einem oder mehreren
  **Teilen**. Ein Teil ist eine geschlossene Haut mit ihren Linien (das, was Ozzy heute als ganze Form kennt).
- **Teil:** was der weiße Zeiger (A) bearbeitet: Punkte, Linien, Griffe. L wählt alles, was zum Teil unter dem Zeiger gehört.
- **Naht:** die Linie, an der zwei Häute sich treffen. Sie ist ein Loop wie jeder andere: zuerst eine Kante, mit K rund, ihre
  Punkte lassen sich ziehen. Was hinter der Naht liegt, wird nicht gezeigt.

Die Naht ist der Kern. **Donut, Clipping am Spiegel, Verschmelzen und Abziehen sind dieselbe Sache**, nur mit einem anderen
Gegenüber:

| Was sich trifft | Wo die Naht liegt | Was wegfällt |
| --- | --- | --- |
| eine Hälfte und ihr Spiegelbild (Clipping, Donut) | in der Spiegelebene | was hinter der Ebene liegt |
| zwei Objekte, die verschmelzen | auf der Schnittkurve der beiden Häute | was im jeweils anderen steckt |
| ein Objekt und eines, das abzieht | auf derselben Schnittkurve | was im Abziehenden steckt, und er selbst (seine Innenseite bleibt als Wand) |

Das ist auch die Antwort auf deine Frage, wie sich Womp und Plasticity auf Kurven übertragen: In Plasticity wird die Schnittkurve
zweier Flächen eine echte Kante, die man danach abrundet. In Womp rundet ein Regler („Goop“) den Übergang. Bei uns ist die
Schnittkurve eine **Linie mit Punkten und Griffen**, „Kante an“ ist die saubere Kante, „Kante aus“ (K) die Rundung, und weil die Haut
ohnehin rund aus den Linien entsteht, ist die Rundung keine eigene Fläche, sondern dieselbe Rechnung wie überall. Wie breit die
Rundung ausfällt, bestimmen die Linien daneben (wie bei jeder weichen Linie heute).

**Zwei Zustände je Naht**, damit nichts stockt:

- **lose** (während du ziehst oder ein Objekt verschiebst): Nichts wird gerechnet oder geschnitten. Die Anzeige blendet die
  Überschneidung je Bildpunkt aus. Das kostet fast nichts und folgt der Hand ohne Verzögerung.
- **fest** (beim Loslassen): Die Häute werden an der Naht geschnitten und verbunden, die Naht wird eine Linie und ist gewählt.

## 3. Bedienung

| Taste | Zeiger | Was |
| --- | --- | --- |
| **V** | dunkel (bleibt dunkel, auch auf der dunklen Rückseite; dort mit hellem Rand) | Objekte: Klick wählt, Ziehen verschiebt, G S R, ⌫ löscht das Objekt, Doppelklick wechselt zu A an diesem Objekt |
| **A** | weiß mit dunklem Rand (bleibt weiß, auch auf Weiß) | Punkte, Linien, Griffe, Felder wie heute |
| **P** | Feder | Linien zeichnen wie heute |
| **L** | | wählt alles Verbundene am Teil unter dem Zeiger (ohne Klick, wie in Blender); ⇧ + L nimmt es aus der Auswahl |
| **Q** | | Lasso (bisher L; in Illustrator liegt das Lasso auf Q) |
| **K** | | Kante an und aus, auch an einer Naht |
| **+** in der Leiste | | neues Objekt: Die Seitenansicht öffnet sich als Blatt, die vorhandenen Objekte stehen blass darin; zeichnen, ↩ bläst auf |
| **Spiegel** in der Leiste | | der Knopf mit drei Zuständen für das gewählte Objekt (Abschnitt 4) |

Leiste: `V A | Lasso P Freihand Formen | + Spiegel | Mülleimer`. Das Plus sitzt in der Leiste und nicht oben rechts, weil dort schon
„Fressen“ wächst und alles, was mit Objekten zu tun hat, an einer Stelle bleiben soll.

Beim ersten Zeichnen und nach dem Plus gilt: **Jede geschlossene Linie, die in keiner anderen liegt, wird ein Objekt.** Alle blasen
zusammen auf, jedes mit seinem eigenen Hals und Schnalz.

## 4. Der Spiegel-Knopf

Ein Tropfen mit drei Zuständen, ein Klick schaltet weiter; ⌥ + Klick wendet an.

| Zustand | Was du siehst | Bewegen mit V |
| --- | --- | --- |
| **aus** | ein ganzes Objekt, kein Spiegelbild; beide Seiten lassen sich verschieden formen | frei, in alle Richtungen |
| **an** | das Objekt und sein Spiegelbild; sie dürfen sich überragen, nichts verschmilzt | frei; das Spiegelbild geht gegengleich mit |
| **an mit Clipping** | an der Spiegelebene verschmelzen die beiden; die Naht ist ein Loop in der Ebene | in der Ebene (längs, hoch, drehen, skalieren) |
| **anwenden** (⌥ + Klick) | das Spiegelbild wird echt: ein ganzes Netz (oder zwei Teile, wenn nichts verschmolzen war), danach „aus“ | |

Die Regeln dazu:

1. **Clipping ein** (oder ein Zug, der mit Clipping über die Ebene führt): Beim Loslassen entsteht die Naht von selbst, als Kante,
   und ist gewählt. K macht sie rund. Kein markierter Punkt, kein Löschen. ⌘Z nimmt Zug und Naht zusammen zurück.
2. **Erst ohne Clipping ineinanderschieben, dann Clipping ein:** Die Überschneidung zieht sich in etwa 0,4 s in die Ebene zurück
   (die Anzeige schneidet erst weit hinter der Ebene und wandert zur Ebene), dann steht die Naht.
3. **Clipping aus an einer verschmolzenen Form:** Die Form bleibt ganz. Es gibt dann wieder das ganze Objekt und sein Spiegelbild,
   genau übereinander; schiebst du es zur Seite, laufen sie auseinander. (Eine verschmolzene Form hat keine zwei Hälften mehr, die
   man einzeln zeigen könnte; in Blender bliebe eine offene Schale.)
4. Das erste Objekt und jedes neue beginnen wie heute: in der Mitte, **an mit Clipping**.

## 5. Was bewiesen ist und was nicht

| Frage | Stand | Beleg |
| --- | --- | --- |
| Trägt die Rechnung eine Form ohne Spiegel (aus, anwenden, einseitig formen)? | **Ja.** Kugel mit drei Loops, Spiegel angewendet: bleibt in Ruhe (0,00), ein Punkt nur auf einer Seite 40 hinaus: Die Haut folgt, die andere Seite bleibt (höchstens 2,2 weit weg), nichts umgeschlagen, 4 Runden bis zur Ruhe. Alle 190 Tests des Kerns halten. | `form-frei.ts`, `packages/shape/src/dicht/frei.ts` |
| Dazu fehlt noch | Das Netz räumt an einer freien Form nicht auf (`verdichten` arbeitet nur mit Spiegelpaaren und lässt sie heute, wie sie ist). Die Werkzeuge, die Linien anlegen (P quer, Form auf der Haut, Abzweigung), schneiden spiegelgleich und brauchen eine Fassung ohne Spiegel. | gemessen in derselben Probe |
| Eine Falle dabei | Eine freie Form muss bleiben, wo sie ist: Weit vom Ursprung weg gerechnet wandert die Haut (bei 3 000 Einheiten um 13 in 400 Runden, bei 20 000 läuft sie davon). | `DZ=3000 … form-frei.ts` |
| Naht an der Spiegelebene | **Ja**, das ist der Donut vom 13.11. (`mitteFestmachen`). Für ein Objekt ohne Paare, das an die Ebene geschoben wird, braucht es eine kleine Erweiterung. | Test `mitteSchnitt.test.ts` |
| Naht zwischen zwei Objekten (verschmelzen, abziehen) | **Nicht bewiesen.** Ich teste es im Kern: zwei aufgeblasene Formen, geschnitten und verbunden. Kriterium: Die Haut ist geschlossen, die Naht ist ein Loop mit Punkten an den Kreuzungen mit den Linien beider Objekte, nichts umgeschlagen, die Linien beider Objekte liegen danach höchstens 0,5 Einheiten neben ihren Pfaden; mit K ist der Knick quer über die Naht unter der Hälfte. Für den Schnitt zweier Netze gibt es eine fertige, robuste Bibliothek (Manifold, auch in Blender 4.5); die nehme ich, statt den Schnitt selbst zu schreiben. | Etappe 4 |
| Auseinanderziehen wie zwei Seifenblasen (Hals wird schmaler, reißt ab) | **Nicht bewiesen**, und der schwerste Punkt. Zwei Wege, beide zuerst als Film: (a) Die Naht bleibt eine echte Linie und folgt beim Verschieben der Schnittkurve; die heutige Rechnung zieht den Hals von selbst glatt (so schnell wie ein gewöhnlicher Zug). (b) Nur die Anzeige rundet den Übergang, gerechnet wird beim Loslassen. Kriterium: 60 Bilder je Sekunde im Zug an zwei Formen mit je 3 000 Punkten, kein Sprung beim Loslassen. | Etappe 5 |
| Den Hilfsloop bearbeiten, und beide Objekte passen sich an | **Nicht bewiesen.** Vorschlag: Die Naht gehört keinem der beiden Objekte; ihre Verformung von Hand wird gegen die gerechnete Schnittkurve gemerkt und lebt und vergeht mit ihr. | Etappe 5 |
| Mehrere Objekte in Ozzy | nicht gebaut, kein Beweis nötig: Das Werk rechnet immer an einem Teil; die anderen stehen als fertige Häute im Bild und werden beim Anfassen eingewechselt (der Stand eines Teils ist dasselbe wie eine gesicherte Form). Offen ist nur das Tempo des Einwechselns (Ziel: unter einem Bild für Formen bis 3 000 Punkte). | Etappe 3 |

## 6. Etappen

Jede Etappe endet mit einer sichtbaren Probe (Film oder Bild, vorher und nachher) und ist für sich benutzbar.

| | Was | Probe |
| --- | --- | --- |
| **0** | **Donut in Ozzy, neue Regel.** Die Anzeige schneidet beim Ziehen über die Mitte jede Hälfte an der Ebene ab (Seifenhaut, Solid, Zebra). Beim Loslassen entsteht die Naht von selbst und ist gewählt, K macht sie rund, ⌘Z nimmt beides zurück. | `ozzy-donut-fenster.mjs`, Film |
| **1** | **V, A, P und die zwei Zeiger; L wählt Verbundenes, Q ist das Lasso.** V wählt und verschiebt das Objekt (mit einem Objekt: in der Ebene). | `ozzy-modi-fenster.mjs`, Film der Zeiger auf Weiß und auf der Rückseite |
| **2** | **Der Spiegel-Knopf am Objekt:** an mit Clipping ↔ an ↔ aus, anwenden; freie Form im Werk (Netz räumt auf, Linien zeichnen ohne Spiegel); Spiegelbild als Anzeige; die Fahrt beim Einschalten des Clippings. | Film: Kugel, Clipping aus, zur Seite, wieder ein; einseitig formen |
| **3** | **Mehrere Objekte:** Plus in der Leiste, mehrere Silhouetten auf dem ersten Blatt, Aufblasen je Objekt, Wählen und Verschieben mit V, Bearbeiten mit A, ⌘Z über alle Objekte, Sichern und Laden. | Film: Körper, dann Ohr und Bein dazu |
| **4** | **Naht zwischen Objekten, fest:** Beweis im Kern, dann „verschmelzen“ und „abziehen“ als Schalter je Objekt; die Naht als Kante, mit K rund. | Kern-Probe mit Bild, dann Film |
| **5** | **Naht lebt:** verschmolzene Objekte wieder verschieben und auseinanderziehen (Hals, Abriss), die Naht bearbeiten. | Film in echter Geschwindigkeit |
| **6** | Danach, wie du geschrieben hast: Seifenhaut, Tempo und Bedienung ansehen (Liste in Abschnitt 8). | Messblatt |

## 7. Was ich für dich entschieden habe (sag, wenn du es anders willst)

- Lasso auf **Q**, damit L frei wird.
- Das Plus in der Leiste statt oben rechts.
- „Clipping aus“ an einer verschmolzenen Form lässt sie ganz (Regel 3 oben).
- Neue Objekte beginnen in der Mitte mit Clipping, wie das erste.
- Nach dem Aufblasen bist du wie heute bei den Punkten (A); V ist der Schritt zurück zum ganzen Objekt.

**Die eine Frage, die für Etappe 2 zählt:** Was soll „Spiegel aus“ an einer Form bedeuten, die an der Ebene verschmolzen ist?
Mein Vorschlag steht oben (sie bleibt ganz und ist ab dann frei, also dasselbe wie „anwenden“). Die andere Lesart wäre: Es bleibt
nur die halbe Form, an der Ebene offen oder flach verschlossen. Ohne dein Wort baue ich den Vorschlag.

## 8. Noch ausstehend (nicht in diesen Etappen)

**Aus dieser Sitzung:**
- Jelly, helles Solid und Grün schneiden beim Ziehen über die Mitte noch nicht ab (sie laufen in fremden Renderern). Nach dem
  Loslassen stimmt das Bild in allen Materialien, weil die Naht dann fest ist.
- Die Wände im Raum und der weiße Körper der Linienansichten zeigen während des Zugs noch beide Hälften ganz.
- Abzweigungen (hängende Linien) lassen sich beim Anwenden des Spiegels noch nicht ausschreiben.
- Drehen eines Objekts quer zur Spiegelebene, Material je Objekt, Objektliste mit Namen.
- Das Maul als abziehendes Objekt (deine Idee): erst nach Etappe 4 und nach deiner Beschreibung der Fälle.

**Aus der Übergabe von Ozzy (unverändert offen):** Schritt 1, 3 und 5 nach deinem ersten Test (Loops vorzeichnen, Seifenhaut im
Zug, flüssig drehen) samt den Wänden; E Tempo II (Löser neben dem Bild); Tempo am Mac und am iPhone nie gemessen (Ziel 120 Bilder
je Sekunde: Median 6 ms, 95 % 8 ms); iPad am echten Gerät; Gleiten; der Bauch im Grün; `main.ts` aufteilen (6 549 Zeilen). Siehe
[`docs/look/ozzy/UEBERGABE.md`](../look/ozzy/UEBERGABE.md), Abschnitt 7 und 8.

**Was mir beim Lesen aufgefallen ist** (nichts davon gebaut):
- Mit mehreren Objekten wächst die Anzeige (jede Haut verfeinert, jedes Spiegelbild doppelt). Die Stufen der Anzeige sollten sich
  dann je Objekt nach seiner Größe im Bild richten, und ruhende Objekte sollten gar nicht neu gerechnet werden.
- Die Seifenhaut zeichnet heute ein Netz. Bei durchsichtigen Materialien sieht man an überlappenden Objekten das Innere; das löst
  die lose Naht (Ausblenden je Bildpunkt), sie gehört deshalb zu Etappe 4 und nicht erst zum Feinschliff.

## 9. Recherche

- **FiberMesh** (Nealen, Igarashi, Sorkine, Alexa 2007): Kurven sind die Griffe, die Fläche wird durch sie gerechnet; neue Teile
  entstehen durch einen geschlossenen Strich auf der Fläche und einen Umriss-Strich (Extrusion), die Kurve am Ansatz ist weich oder
  scharf. Kein Verschmelzen getrennter Objekte. Unser Kern ist dieser Ansatz.
- **Plasticity** (NURBS, Parasolid): Vereinigen, Abziehen, Schneiden; die Werkzeuge können bleiben („Keep Tools“); die Schnittkurven
  sind danach echte Kanten, die man direkt abrundet. Lehre: Schnittkurve = Kante = etwas, das man danach anfassen kann.
- **Womp**: Formen aus Abstandsfeldern; jedes Objekt ist „positiv“ oder „negativ“, „Goop“ stellt ein, wie weich es mit den anderen
  verläuft; die Reihenfolge in der Liste bestimmt, wen ein negatives Objekt trifft. Lehre: Verschmelzen und Abziehen als Eigenschaft
  des Objekts, nicht als einmaliger Befehl; alles bleibt verschiebbar.
- **ZBrush Live Boolean, Blender (Boolean- und Mirror-Modifier, Metaballs):** erst eine schnelle Vorschau in der Anzeige, dann auf
  Wunsch das echte Netz. Das ist „lose“ und „fest“.
- **Manifold** (`manifold-3d`, Apache 2.0): robuster Schnitt zweier geschlossener Netze, merkt je Dreieck, aus welchem Netz es stammt.

Quellen: [FiberMesh](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf) ·
[Womp, Goop](https://www.womp.com/blogs/the-ultimate-guide-to-goop-liquid-3d-modeling-thats-changing-everything) ·
[Plasticity, Fillet](https://doc.plasticity.xyz/sketch/fillet) ·
[Plasticity, Boolean (inoffiziell)](https://plasticity-unofficial-document-nakcinpm5-shinjiesaki.vercel.app/solid/boolean) ·
[Manifold, Mesh](https://manifoldcad.org/jsdocs/classes/manifold.Mesh.html) · [manifold-3d](https://npmjs.com/package/manifold-3d)

## 10. Gebaut

| Etappe | Was | Probe, Bild |
| --- | --- | --- |
| Beweis 1 | Freie Form im Kern (`frei.ts`: `spiegelAnwenden`; `hautFrei`, `hautAus` mit `ohnePaare`; Einsetzen und Verdichten geben die Freiheit weiter) | `form-frei.ts`: alles gut |
| 0 | **Donut in Ozzy.** Im Zug schneidet die Anzeige jede Hälfte an der Spiegelebene ab (Seifenhaut, Solid, Zebra; nur dort, wo eine Hälfte wirklich über die Ebene reicht, damit längs der Mitte kein Streifen frei bleibt). Beim Loslassen entsteht die Naht von selbst (`werk.mitteFest(true)` aus `zugEnde`, Schalter `G.clipping`), ist gewählt (als Ganzes und mit ihren Punkten, damit man es sieht), K macht sie rund, ein ⌘Z nimmt Zug und Naht zurück. | `ozzy-donut-fenster.mjs` (an „strange bird“ und mit `KUGEL=1` an einer frischen Kugel: alles gut). Bilder: [vorher](../progress/ozzy/2026-11-18-donut-0-vorher.png), [im Zug](../progress/ozzy/2026-11-18-donut-1-im-zug.png), [Naht](../progress/ozzy/2026-11-18-donut-2-naht.png), [rund](../progress/ozzy/2026-11-18-donut-3-rund.png) |
| 1 | **Zwei Zeiger, Objekt-Modus, L und Q.** V: dunkler Zeiger, die Linien stehen still (keine Punkte, nichts zu greifen), Klick auf die Form wählt sie (darunter hängt ein dunkles Schild mit ihrem Namen), Klick daneben wählt ab, Doppelklick wechselt zu ihren Punkten, ⌫ löscht nur ein gewähltes Objekt. A: weißer Zeiger, alles wie bisher. Keiner tauscht auf der dunklen Rückseite die Farbe (`Szene.zeigerFarbe` in `fluessig.ts`). L wählt alle Punkte des Teils unter dem Zeiger, ⇧ + L nimmt sie heraus; das Lasso liegt auf Q. Leiste: `V A | Lasso P Freihand Formen | Mülleimer`. | `ozzy-modi-fenster.mjs`: alles gut. Bild: [die vier Zeiger](../progress/ozzy/2026-11-18-zeiger.png) |

**Was an Etappe 1 offen bleibt:** (1) Mit einem einzigen Objekt gibt es für V noch wenig zu tun: Verschieben, Skalieren und Drehen
eines Objekts sieht man erst mit dem Spiegel-Knopf und mit mehreren Objekten (der Raum richtet sich nach der Form aus). Ziehen an
der Form dreht deshalb vorerst wie Ziehen ins Leere. (2) An der Seifenhaut zeigt nur das Schild, was gewählt ist; ein Umriss am
gewählten Objekt kommt mit Etappe 3 (dann je Objekt). (3) Auf dem Blatt gilt V noch wie A (weißer Zeiger): Ganze Linien verschieben
kommt mit den mehreren Silhouetten in Etappe 3.

**Was an Etappe 0 offen bleibt:** (1) Wo die Hälften flach aufeinandertreffen, ist die Naht als Kante eine Schneide; direkt an ihr
zählt die Probe an „strange bird“ 8 sehr schmale umgeschlagene Dreiecke (das größte ein Achtel eines mittleren Dreiecks), mit K sind
es 0. Zu sehen ist davon nichts. (2) Mit einem Maul und in der Pose entsteht keine Naht (so war es schon am 13.11.); die Form bleibt
dann lose, und die Statuszeile sagt es. (3) Reicht das Loch bis an die Linie der Mitte (ein Zug dicht am Umriss), kann der Kern
nicht schneiden; auch dann bleibt die Form lose. (4) Jelly, helles Solid, Grün, die Wände und der weiße Körper zeigen im Zug noch
beide Hälften ganz.

## Anhang A: Dein Auftrag (18.11.2026, wörtlich)

> […] in dieser session möchte ich ein paar coole features einbauen. Aktuell geht in Ozzy der donut effekt nichtmehr. Ich
> weiß nicht warum die andere session ihn nicht übernommen hat.
>
> Ich möchte hier ein elegantes system erarbeiten um weitere objekte einzufügen und an der spiegelung arbeiten.
>
> Was dazu alles nötig ist:
>
> 1. Wie bei blender oder illustrator brauche ich einen object mode. bei meinem fall dargestellt von einem dunklen statt weißen
>    cursor. auf schwarz darf es also nicht die farbe tauschen. damit man mit weißem und schwarzem cursor nicht durcheinander kommt.
> 2. V ist schwarzer cursor für das ganze objekt und A ist weißer cursor für die punkte (edit) wie bei illustrator. P bleibt das
>    linienwerkzeug
> 3. Wie bei blender kann ein objekt auch aus mehrerer meshes bestehen und diese kann ich ebenfalls wie bei blender mit l auswählen
>    wenn ich darüber fahre. deselektieren auch wie bei blender. L ist aktuell das lasso werkzeug. Das belegen wir dann anders.
> 4. Ich möchte einen multifunktionsknopf für den mirrormodifier. jedes objekt kann unabhängig voneinander verschiedene
>    mirroreinstellungen haben.
> 5. Der knopf: der knopf kann folgende states haben. mirror an, mirror aus, mirror an mit clipping. Ich möchte auch dass der donut
>    wieder sauber funktioniert und dass ich mirror modifier applien kann, dann ist es nichtmehr gespiegelt sondern ein ganzes mesh
>    und ich kann asymetrische dinge gestalten. Ohne mirror kann ich ein objekt frei bewegen. mit mirror spiegelt es sich und die
>    seiten können sich überragen. Mit clipping verschmelzen die spiegelkanten zu einem edgeloop. Wie beim donut soll dann erstmal
>    eine harte kante entstehen. Die regel vom donut, dass man den rot markierten punkt dann erst löschen muss entfällt. nach dem
>    loslassen entsteht der edgeloop an der spiegelkante von selbst und ist ausgewählt. mit k macht an ihn smooth.
> 6. Ich kann mirrorhälften erst ohne clipping ineienanderschieben und dann clipping einschalten um sie zu verschmelzen. Gerne mit
>    einer schönen animation.
> 7. neue objekte sollen auf genauso coole weise wie das erste objekt ins spiel aufgeblasen werden und auch beim ersten einzeichnen
>    können bereits mehrere objekte eingezeichnet werden die dann aufgeblasen werden. Ich will einen klinen + button oben rechts.
>    Überlege dir bitte die optimale bedienung für das erstellen zusätzlicher objekte. Vielleicht über ein + in der werkzeugleiste
>    statt rechts oben. wenn man es klickt öffnet sich die seitenansicht.
> 8. Objekte sollen genau wie beim mirror auch über einen edgeloop verschmelzen können. Ich kann sie frei platzieren und
>    ineinanderschieben. wenn ich die beiden selectireten objekte dann verschmelzerundet der edgloop ab. Es soll aber nur eine art
>    hilfsedgeloop sein, der smooth entsteht wenn ich objekte ineinanderschiebe. Ich kann ihn auch ein und ausschalten pro objekt.
>    wenn er eingeschaltet ist wird der hilfsedgkoop bedienbar und rund. die überschneidung ist ausgeblendet. wenn ich den hilfsloop
>    bearbeite, verändert das beide meshes so dass es immer passt. ich kann objekte dann auch einfach wieder auseinanderschieben und
>    der hilfsedgloop verschwindet. Das auseinanderziehen wirkt dann als würden sich zwei seifenblasen über einen schmaler werdenden
>    hals trennen.
> 9. Ich würde gerne auch objekte voneinander subtrahieren können, so dass es eine saubere kante ergibt. Das könnten wir später dann
>    vllt auch für das maul nutzen. Als vorbild dafür gelten womp 3d und plasticty. Wie können wir ein solches system optimal auf
>    unsere kurven übertragen?
> 10. Wichtig ist dass immer alles exakt den kurven folgt und neue edgeloops beim verschmelzen smooth sind und die form genau an den
>     kurven anliegt. Auch komplexe formen mit teuren materialien wie blasenhaut sollen immer und bei jeder zoomstufe smooth aussehen
>     und die bedienung muss immer flüssig und ohne stocken, verzögerung oder dämpfung arbeiten.
>
> Sei bitte wirklich kreativ und ehrlich und suche dabei immer die eleganteste und optimale lösung. Du kannst gerne auch
> recherchieren wie andere programme wie plasticity so etwas machen oder fibermesh und nurbs editoren.
>
> Eine Andere Sitzung hat bereits viel an Ozzy opzimiert aber es gibt vor allem für Performance und Anzeige noch sehr viel zu tun.
> Ließ genau den stand nach und schau auch selbst nochmal ob man etwas besser machen kann. Lass uns erstmal die becshriebenen
> features einbauen und dann sehen wo wir mit seifenhaut, performance und bedienung stehen. Halte alle offenen punkte aber klar als
> noch ausstehend fest.
