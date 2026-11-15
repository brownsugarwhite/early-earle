# Anfang einer Form und Seifenhaut: Konzept (15.11.2026)

Eigener Strang neben „Linien, Punkte, Zeiger“ (der Look der Linien kommt von dort, [Plan vom 14.11.](2026-11-14-linien-zeiger-tropfen.md)
im Zweig `claude/look-linien`). Hier: wie eine neue Form beginnt, wie sie aufgeblasen wird und aus welchem Material ihre Haut ist.
Florians schneller Entwurf der Materialien (keine feste Vorlage): `docs/look/anfang/2026-11-15-entwurf-materialien.webp`.

## Florians Auftrag (15.11., wörtlich)

> „Hier möchte ich den Start in die Szene und das Basismaterial für mein Mesh/Wesen erstellen.
>
> Eine neue Form soll man immer von der Seite beginnen. Man hat eine fast leere Seite vor sich und wird mit dem Text draw a
> silhouette in der Mitte des Bildschirms begrüßt. Ähnlich wie bei einem neuen Chat in der Claude KI App, nur soll man zeichnen
> statt einen Prompt einzugeben.
>
> Dazu hat man das Illustrator-Werkzeug wie „P“ oder ein Freihandtool zur Verfügung, mit dem man einen geschlossenen Loop erzeugt.
> Alles soll dem Look entsprechen „liquid drop“, den wir gerade in der Session „Mesh und Linien Interaktivität“ erarbeiten: feine
> Haarlinien, Punkte als Tropfen und alles bewegt sich dynamisch und harmonisch zusammen. Das Freihandwerkzeug machen wir später.
>
> Wenn ich eine geschlossene Form gezeichnet habe und diese mit Enter bestätigt habe, zieht sich die Silhouette zurück und die
> Kamera dreht sich leicht. Das Zurückziehen der Silhouette soll sein, als würde man einen mit Seifenhaut überzogenen Seifenring
> nach hinten bewegen, und aus der Haut wird durch den Fahrtwind das 3D-Objekt mit einer eleganten, wobbeligen Animation
> aufgeblasen. Es soll sehr intuitiv und dynamisch wirken. Das Seifenblasenmaterial soll wunderschön geshaded sein. Es soll
> einerseits schlicht und elegant aussehen, dabei mit der Aufspaltung der Farben arbeiten. Es kann gerne abstrahiert sein und auch
> zum Eyvind-Earle-Stil passen. Teste gerne mehrere verschiedene Versionen gegeneinander und sei maximal kreativ.
>
> Angehängt ist ein schneller Entwurf von Materialien mit GPT. Du darfst gerne eine bessere Lösung entwickeln. Es ist keine feste
> Referenz. Am besten sollten die materialeigenen Effekte zur intuitiven Bearbeitung beitragen, falls du hier eine coole Idee hast,
> bin ich sehr dankbar.
>
> Entwickle ein richtig cooles und gleichzeitig elegantes und sehr minimalistisches Konzept für die Anfangsanimation des Aufblasens
> und des Materials.“

## Die Idee in drei Sätzen

Eine neue Form beginnt auf einem leeren Blatt: In der Mitte steht „draw a silhouette“, am Zeiger hängt der Tropfen von P. Schließt
sich der Loop, spannt sich in ihm eine Seifenhaut; ↩ zieht den Ring nach hinten, der Fahrtwind bläst die Haut zur Form auf, sie
schwingt nach und kommt zur Ruhe, während die Kamera ein Stück um sie herumgeht. Die Farben der Haut entstehen wie bei einer echten
Seifenhaut aus ihrer Dicke: Wo sie gedehnt wird, wird sie dünner und wechselt die Farbe, so zeigt das Material beim Bearbeiten,
was mit der Haut geschieht.

## Ablauf

1. **Leeres Blatt.** Weißes Papier, in der Mitte klein und ruhig „draw a silhouette“. Sonst nichts. Der Zeiger ist P: an der Feder
   hängt ein Tropfen (wie im Konzept „Auswahl und Werkzeug P“, Bild 1).
2. **Zeichnen mit P** wie in Illustrator: Klick setzt eine Ecke, Ziehen gibt Schwung (Griffe als Haarlinien mit Perlen), ⌥ bricht
   den Griff, ⌫ nimmt den letzten Punkt zurück, Esc verwirft. Vom letzten Punkt zur Feder spannt sich der Faden. Mit dem ersten Punkt
   blasst der Text aus. Umriss 1 px, Punkte 2,5 px, Tinte wie in der Linien-Probe.
3. **Schließen.** Am ersten Punkt öffnet sich ein Ring, Klick schließt, eine Welle läuft einmal um den Loop. Im selben Moment
   spannt sich die Haut: ein zarter Schimmer mit fließenden Farben im Loop, wie die Seifenhaut in einem Ring. Ein leiser Hinweis „↩“.
   Punkte und Griffe lassen sich noch ziehen.
4. **Aufblasen (↩).** Der Ring weicht nach hinten aus, die Haut bleibt im Fahrtwind zurück und wölbt sich nach vorn, dann schlägt die
   hintere Hälfte durch und schließt die Form (spiegelgleich). Die Haut schwingt zwei, drei Mal nach (Feder, kein Abspann), die
   Kamera dreht sich dabei etwa 30° zur Seite und ein wenig von oben. Beim Dehnen wird die Haut dünner: Die Farben laufen über die
   Form und beruhigen sich. Dauer etwa 1,5 s. Der Loop bleibt als Haarlinie auf der Form, das Verdeckte grün wie in der Raum-Probe.
5. **Ruhe.** Die Form schwebt, die Farben fließen sehr langsam. ⌫ oder Esc lässt die Luft wieder heraus (zurück zum Loop auf dem
   Blatt, zum Ändern und neu Aufblasen).

## Material: Fassungen gegeneinander

Alle Fassungen rechnen dieselbe Physik der dünnen Schicht (Farbe aus Dicke und Blickwinkel, eine Farbtafel wie die Interferenzfarben
nach Michel-Lévy); sie unterscheiden sich darin, wie viel davon man sieht und wie abstrakt es ist.

1. **Seifenhaut:** durchsichtig, Farben nur in der Spiegelung, weiche Lichter, am Rand stärker. Am nächsten an einer echten Blase.
2. **Irisdruck:** deckend wie Perlmutt, drei harte Lichtstufen mit Verlauf in jeder Stufe (wie bei Earle), die Farben der Schicht
   darauf wie ein Irisdruck im Siebdruck, in Bändern.
3. **Horizont:** eine gläserne Blase, die einen abstrakten Horizont spiegelt (heller Himmel, dunkles Land, harte Kante mit Verlauf
   in jeder Fläche, wie Earle). Nur an dieser Kante spaltet sich das Licht in Farben auf.
4. **Höhenlinien:** die Farbringe folgen der Form wie Höhenlinien auf einer Karte. Man liest die Wölbung direkt ab; zieht man an der
   Haut, drängen sich die Ringe zusammen (wie bei Spannungsoptik).

Grund jeweils Papier (wie der Editor) oder Nacht (dunkel, wie der Entwurf).

## Das Material hilft beim Bearbeiten

- **Spannung:** Wird die Haut gedehnt, wird sie dünner und ändert die Farbe, dort und nur dort. Man sieht beim Ziehen, wie weit die
  Haut nachgibt; danach beruhigt sich die Farbe langsam.
- **Hauch:** Der Zeiger haucht die Haut an. Unter ihm wird sie ein wenig dünner, die Farben weichen zur Seite. So zeigt die Haut
  selbst, wo der Zeiger auf ihr liegt, ohne Zeichen.
- **Fahrtwind:** Dreht man die Ansicht, fließen die Farben gegen die Bewegung und kommen danach zur Ruhe.
- **Zu dünn:** Eine echte Seifenhaut wird vor dem Platzen golden, dann silbern, dann schwarz. Dieselbe Folge kann zeigen, wo die
  Haut zu stark gedehnt ist.

## Probe

- Arbeitsbaum `.claude/worktrees/anfang`, Zweig `claude/anfang` (von `claude/form-spiegel`, 23aa8e7d), Eintrag `anfang` in
  `.claude/launch.json`, Port 5203, Seite `anfang.html`. Code in `apps/editor/src/anfang/`. Die flüssige Anzeige der Linien ist eine
  Kopie von `src/linien/fluessig.ts` (Stand d762e508); am Look der Linien wird hier nichts entschieden.
- Die Haut der Probe ist ein eigenes Netz (Loop → Dreiecke → Wölbung aus der Poisson-Gleichung, Wurzel davon wie bei Monster Mash);
  der Editor und sein Löser bleiben unberührt. Wie die aufgeblasene Form in den Editor kommt, entscheidet Florian nach der Probe.
- **Festgelegte Probe:**
  1. Übergang vom Blatt in den Raum ohne Sprung: Im ersten Bild nach ↩ liegt der Loop auf weniger als einen halben Bildpunkt genau
     dort, wo er gezeichnet wurde.
  2. Der Rand bleibt geschlossen, keine Falten, keine Spitzen; die Form steht nach höchstens 2 s still.
  3. 60 Bilder je Sekunde am Mac während des Aufblasens.
  4. Film des Ablaufs und ein Bildstreifen je Fassung an derselben Form, gleiche Ansicht: `docs/progress/anfang/`.
- Später, nicht jetzt: Freihandwerkzeug; Einbau in den Editor; Platzen und Schatten auf dem Papier, falls die Probe sie braucht.

## Gebaut (15.11.2026, abends)

Probe `http://localhost:5203/anfang.html` (Eintrag `anfang`), Zweig `claude/anfang`. Sein Urteil steht aus.

- **Blatt und P:** leeres Papier, „draw a silhouette“ in der Mitte (Serifenschrift, verblasst mit dem ersten Punkt). P wie in
  Illustrator: Klick Ecke, Ziehen rund (Griffe als Haarlinien mit Perlen), ⌥ bricht den Griff, am ersten Punkt öffnet sich ein Ring,
  Klick oder ↩ schließt, eine Welle läuft einmal um den Loop; ⌫ nimmt den letzten Punkt zurück (ist der Loop zu: öffnet ihn), Esc
  verwirft. Der Faden schwillt zum Tropfen an der Feder an; der Tropfen hängt als Feder am Zeiger. Linien, Punkte und Zeiger zeichnet
  eine Kopie der flüssigen Anzeige des Linien-Strangs (Stand d762e508). Geschlossen spannt sich die Haut im Loop (0,6 s).
- **Aufblasen (↩):** Der Ring weicht nach hinten aus (20 % des Kameraabstands), die Haut bleibt zurück und wölbt sich nach vorn
  (eine Fläche), nach 0,24 s löst sich die hintere Hälfte und schlägt zum Spiegelbild durch. Beides gedämpfte Federn (vorn 2,1 Hz,
  hinten 1,8 Hz, rund 25 % Überschwingen), dazu Stauchen in der Ebene beim Überschwingen und eine Welle vom Rand zur Mitte. Die Kamera
  dreht sich in 1,8 s um 32° zur Seite und 13° nach oben. Der Loop bleibt als Haarlinie auf der Form, Verdecktes grün.
- **Haut aus dem Loop:** flaches Netz (Rand, Reihen am Rand nach dem Bogen, Gitter innen, Delaunay), Wölbung √h mit −Δh = 4
  (Kotangens, PCG). Am Fisch: 5 806 Punkte, 11 310 Dreiecke je Seite, 45–90 ms, keine fehlende Randkante.
- **Material:** Farbtafel der dünnen Schicht spektral gerechnet (`duennschichtTafel`), vier Fassungen, Grund Papier oder Nacht (N).
  Gedehnte Haut wird dünner und wechselt die Farbe (beim Aufblasen blühen die Farben auf und beruhigen sich danach), der Zeiger haucht
  die Haut an, Drehen der Ansicht schiebt die Farben (Fahrtwind). An der Haut ziehen dehnt sie (weiches Feld, spiegelgleich, weich
  begrenzt, damit sie nie faltet).
- **Feinregler (R):** Rückweg, Federn vorn und hinten, Stauchen, Welle, Kamera, Fülle, Dicke der Haut, „Dehnung färbt“, Farben der
  Seifenhaut; im Browser behalten, „Werte kopieren“ für die Weitergabe.

**Probe (festgelegt, alle gehalten):**

| | Ergebnis |
| --- | --- |
| 1 · Übergang vom Blatt in den Raum | Anker 0,00 px, Rand höchstens 0,19 px vom gezeichneten Loop (Grenze 0,5 px) |
| 2 · Rand, Falten, Ruhe | Rand geschlossen (Vorder- und Rückseite teilen die Lage), keine Falten beim Aufblasen, sichtbar still nach etwa 2 s |
| 3 · Bildtakt beim Aufblasen | Median 16,7 ms, 95 % 16,7 ms in allen vier Fassungen (1440 × 900, doppelte Dichte, GPU) |
| 4 · Film und Bilder | `docs/progress/anfang/` (unten) |

Skripte in `apps/editor/scripts/anfang/`: `bilder.mjs` (Bildstreifen je Fassung, Ruhe groß), `film.mjs` (ganzer Ablauf mit
echten Mausereignissen; `KURZ=1` nur Aufblasen und Drehen), `takt.mjs` (Probe 1 und 3).

**Bilder und Filme:**
- `2026-11-15-film-ablauf.mp4`: leeres Blatt, Fisch mit P, schließen, ↩, Zeiger auf der Haut, an der Haut ziehen, drehen (17 s).
- `2026-11-15-film-vergleich.mp4`: die vier Fassungen nebeneinander, Aufblasen und Drehen (5,7 s).
- `2026-11-15-ablauf-papier.png`, `…-ablauf-nacht.png`: je Fassung sechs Momente (geschlossen, 0,2 / 0,4 / 0,7 / 1,1 / 2,6 s).
- `2026-11-15-ruhe-papier.png`, `…-ruhe-nacht.png`: die vier Fassungen in Ruhe, groß.

**Was ich sehe (ehrlich):** Seifenhaut und Höhenlinien tragen am weitesten; Horizont ist auf Papier am stärksten und am meisten
Earle (hartes Land, heller Himmel, Regenbogen nur an der Kante); Irisdruck wirkt wie Perlmutt, ist aber am unruhigsten. Nacht trägt
die Seifenhaut (Farben nur in den Lichtern) und die Höhenlinien; Horizont und Irisdruck sind dort schwach. Der Hauch ist zart (auf
Standbildern kaum zu sehen), die Spannung beim Ziehen deutlich. Die Kanten der Spiegelung zeigen an manchen Stellen noch das
Dreiecksnetz (Horizont am ehesten).

**Grenzen:** Die Haut der Probe ist ein eigenes Netz, nicht der Löser des Editors; Ziehen an der Haut ist ein weiches Feld, kein
Werkzeug des Editors (dort kommt die Dehnung aus den Linien). Ein Loop, der sich selbst kreuzt, wird nach gerade/ungerade gefüllt.
Freihand, Platzen und Schatten auf dem Papier fehlen noch.

**Fragen an Florian:**
1. Welche Fassung (oder welche Mischung) soll das Grundmaterial werden?
2. Papier oder Nacht als Grund für den Anfang?
3. Nachschwingen und Rückweg: so lassen, mehr oder weniger (die Feinregler zeigen die Werte)?
4. Soll die Kamera nach dem Aufblasen näher heran, damit die Form größer zum Bearbeiten ist?
