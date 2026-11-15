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

## Runde 2 (15.11.2026, abends): Florians Rückmeldung (wörtlich)

> „Sehr gut gemacht schonmal. Die Materialien sind gut. Seifenhaut und Höhenlinien gefallen mir auch am besten. Auf dunklem
> Grund ist es noch nicht sehr gut.
>
> Bei der Introanimation bin ich noch nicht überzeugt. Das Ziehen an der Blase in der Mitte gefällt mir als Idee sehr gut, das
> möchte ich weiterentwickeln.
>
> Kannst du die Schrift am Anfang gegen die Schriftart Lobster ersetzen. Lobster wird die Schrift für Editor und das Game werden.
> Für Überschriften und Ähnliches …
>
> Nach der Eingabe mit Enter soll das Aufblasen anders laufen. In einer anderen Sitzung haben wir mit Projektionen gearbeitet. Die
> gezeichnete Linie soll sich wie der Schatten von der Seite zu seiner Position bewegen und die Projektionsflächen sollen sich als
> leichter Schatten an den Wänden der vier Kanten absetzen. An den Projektionen sind bei Hover über die entsprechende Wand die
> Linien zu sehen. In der Mitte ist die Seifenblase. Es soll alles ganz fein und elegant sein und Lobster soll als brutalistisches
> Element einen Kontrast erzeugen.
>
> Die Seifenblase in der Mitte selbst soll keine Bedienlinien anzeigen (auch nicht die Spiegellinie) und nur durch Ziehen,
> Aufblasen, Glätten usw. bedienbar sein … das kommt im Detail später …
>
> An den Projektionen bediene ich die Kurven. Bei Drehung zu einer Projektion morpht die Blase zur jeweiligen Ansicht mit Kurven,
> wie wir es in der anderen Session schon erarbeitet haben.
>
> Die gezeichnete Spiegellinie bewegt sich also zu ihrer Wand und wird da zum Schatten. Die Seifenblase bläst sich dabei
> physikalisch korrekt an Ort und Stelle aus der Silhouette auf. Das muss noch deutlich besser, organischer und realistischer
> werden. Als würde man wirklich eine Form, die mit Seife bespannt ist, in eine Richtung bewegen, und durch den Fahrtwind bläst sich
> dadurch eine Blase in der Form auf. Die Seifenblase muss beim Zurückfahren noch eine Weile an der Outline hängen, während der
> vordere Teil sich aufbläst, und dann, wenn die Spannung zu groß ist, zur Blase werden. Das soll so realistisch wie möglich
> animiert sein.“

Die „andere Sitzung“ ist die Vision „Kurven-Editor, Runde 4: Die Ecke“ (Cloud-Zweig `claude/meme-curves-editor-concept-s65kq1`,
`docs/look/editor/vision/PLAN-4.md`): Seite, Front und Top als Projektionen an unsichtbaren Wänden, auf den Achsen der Morph zur
flachen Ansicht, Start mit P und Aufblasen.

### Wie ich es lese (Vorschlag)

- **Der Raum ist ein Kasten**, in den man von vorn hineinschaut: die Rückwand hinter der Blase, vier Wände an den vier Rändern des
  Bildes (links, rechts, Boden, Decke). Die Wände selbst sind nicht gezeichnet; man sieht sie nur an den leichten Schatten.
  Rückwand = Seite (dorthin wandert die gezeichnete Linie), links und rechts = Front und Rück, Boden und Decke = Top und Unten
  (je Achse dieselbe Form gespiegelt). Der Kasten öffnet sich mit einem Dolly-Zoom: Die Blase bleibt gleich groß, die Tiefe
  erscheint.
- **Der Film reißt ab wie beim Seifenblasenmachen.** Der Rahmen (die gezeichnete Linie) fährt nach hinten zur Rückwand. Die Haut
  hängt an ihm; vorn bläst sie sich auf, dazwischen spannt sich ein Schlauch. Wird er zu lang (wie beim Katenoid zwischen zwei
  Ringen, ab etwa dem 0,66-Fachen des Durchmessers), schnürt er sich ein, bis der Hals reißt. Die Blase schließt sich hinten
  (erst spitz, dann rund) und schwingt nach; der Rest der Haut schnappt zurück in den Rahmen, fährt mit ihm zur Rückwand und wird
  dort zum Schatten der Seite. Die Blase bleibt an Ort und Stelle.
- **Die Blase zeigt keine Linien** (auch nicht die Spiegellinie). Die Linien zeigen sich an den Wänden beim Darüberfahren, mit dem
  Namen der Ansicht in Lobster.
- **Lobster** für den Gruß und die Namen der Wände: groß, schwer, gegen die feinen Haarlinien.
- Material: Seifenhaut und Höhenlinien bleiben vorn; Nacht wird nicht weiter verfolgt.

### Probe (festgelegt)

1. Im Film sieht man nacheinander: Haut hängt am Rahmen, vorn bläst sie sich auf, Schlauch, Hals, Abriss, hinten schließt sie
   sich, Nachschwingen; der Rest schnappt in den Rahmen und wird an der Rückwand zum Schatten.
2. Kein Sprung beim Abriss: Zwischen dem letzten Bild davor und dem ersten danach bewegt sich kein Punkt der Haut mehr als 2 px.
3. 60 Bilder je Sekunde beim Aufblasen.
4. Gruß in Lobster; Schatten an Rückwand und vier Wänden; beim Darüberfahren die Linien der Wand.

### Nicht in dieser Runde

Bedienen der Kurven an den Wänden und der Morph der Blase zur Ansicht beim Drehen (aus der Ecke übernehmen, eigener Schritt);
Ziehen, Aufblasen, Glätten an der Blase (kommt im Detail später).

### Gebaut (Runde 2, 15.11. abends)

- **Lobster** liegt im Repo (`assets/fonts/lobster/`, Lizenz SIL OFL, aus dem Repository von Google Fonts): der Gruß
  „draw a silhouette“ (46 px) und die Namen der Wände (Seite, Hinten, Front, Top, Unten).
- **Abriss wie beim Seifenblasenmachen:** drei Flächen auf demselben flachen Netz (vorn die Kuppel; hinten erst die Hälfte des
  Schlauchs bis zum Hals, nach dem Abriss die Rückseite der Blase; der Rest im Rahmen). Der Hals ist die Linie gleicher Wölbung
  u = `schnitt`, dahinter ist der Schlauch offen. Er schnürt sich langsam ein, solange der Schlauch kürzer als 1,45 × Halbmesser
  ist, danach fällt er in 0,16 s zusammen (Abriss am Fisch bei 0,97 s). Weil beide Hälften des Schlauchs beim Abriss genau die
  beiden Trichter sind, mit denen es danach weitergeht, gibt es keinen Sprung. Danach: Rückseite erst spitz, dann rund (Feder
  2,7 Hz), Kuppel mit Stoß und Nachschwingen (2,3 Hz), die Blase federt etwas nach vorn (der Zug des Schlauchs ist weg), der Rest
  schnappt in den Rahmen (5,5 Hz) und fährt mit ihm zur Rückwand. Gedehnte Haut wird dünner und färbt sich, am Hals am stärksten.
- **Kasten:** Dolly-Zoom von 26° auf 46° (die Blase bleibt gleich groß), Kamera am Ende 34° zur Seite und 13° von oben, im Kasten.
  Kanten des Kastens als feinste Haarlinien. Rückwand: der Rest im Rahmen wird zum Schatten der Seite. Links, rechts, Boden, Decke:
  leichte Schatten der Blase von der Seite, von vorn und von oben (etwa 7 % dunkler als Weiß, Feinregler), etwas nach hinten
  gerückt, damit sie mitten auf ihrer Wand liegen.
- **Die Blase zeigt keine Linien.** Fährt man über eine Wand, erscheinen ihre Linien (Rückwand: die gezeichnete Linie mit ihren
  Punkten; sonst der Umriss der Blase von dieser Achse) und ihr Name in Lobster. An der Blase ziehen dehnt sie (wie Runde 1),
  daneben ziehen dreht die Ansicht.
- Feinregler (R) neu: Rahmen, Hängen und Abreißen, Kuppel, nach dem Abriss, Kamera, Form, Material, Schatten, Kanten.

**Probe (festgelegt):**

| | Ergebnis |
| --- | --- |
| 1 · Ablauf im Film | Hängen, Schlauch, Abriss, hinten schließen, Nachschwingen, Rest wird an der Rückwand zum Schatten: `2026-11-15-r2-film-seifenhaut.mp4`, Nahbilder `…-r2-abriss-nah.png` |
| 2 · kein Sprung beim Abriss | gehalten, aber anders als vorher formuliert: Die Vorderseite bewegt sich über den Abriss 1 px; der Hals selbst ist schnell (rund 30 px je Bild davor, 26 px über den Abriss, 32 px danach), also gleichmäßig, ohne Sprung. Die Grenze „2 px für jeden Punkt“ war falsch gewählt: Ein Hals reißt in Millisekunden. Messung: `__anfang.abriss()` |
| 3 · 60 Bilder je Sekunde | gehalten: in allen vier Fassungen 95 % der Bilder unter 16,8 ms (`takt.mjs`), nachdem alle Shader vorab übersetzt werden; vorher stockte ein Bild, als die Wände sichtbar wurden |
| 4 · Lobster, Schatten, Darüberfahren | gehalten (im Browser mit echter Maus geprüft: Rückwand „Seite“ mit Linie und Punkten, Boden „Top“ mit Umriss, linke Wand „Hinten“) |

**Bilder und Filme (Runde 2):** `2026-11-15-r2-film-seifenhaut.mp4` und `…-r2-film-hoehenlinien.mp4` (leeres Blatt, Fisch mit P,
↩, Abriss, Kasten, über Rückwand und Boden fahren, an der Blase ziehen, drehen), `…-r2-ablauf-papier.png` (zehn Momente je
Fassung), `…-r2-ruhe-papier.png`, `…-r2-abriss-nah.png`.

**Was ich sehe (ehrlich):** Die Kette stimmt und läuft flüssig; der Schlauch ist aber mit der sehr durchsichtigen Seifenhaut
zart, und mit 34° liegt der Hals zum Teil hinter der Blase. Von der Seite (Feinregler „zur Seite“ höher) sieht man ihn besser.
Schatten haben harte Kanten. Im hohen, schmalen Fenster (Handy) liegt die linke Wand außerhalb des Bildes.

**Fragen an Florian (Runde 2):**
1. Ist der Kasten so gemeint (Rückwand mit der Seite, vier Wände an den Rändern), oder eher die Ecke aus der anderen Sitzung (zwei
   Wände und Boden)?
2. Kanten des Kastens als Haarlinien: ja, oder nur die Schatten?
3. Abriss: so, langsamer hängen, oder die Kamera mehr zur Seite, damit man den Hals sieht?
4. Als Nächstes der Morph zur Ansicht beim Drehen zu einer Wand und das Bedienen der Kurven dort (aus der Ecke übernehmen)?

## Runde 3 (15.11.2026, spätabends): Ecke statt Kasten

Florian (wörtlich, „janice“ gelesen als „ja, ich“): „janice meinte ecke und die beschriftung soll auch auf den boden projeziert sein“

**Gebaut:**
- **Ecke wie in der Vision „Ecke“:** drei unsichtbare Flächen, die sich hinter der Blase in einem Punkt treffen: Rückwand mit der
  Seite (dorthin fährt der Rahmen und wird Schatten), linke Wand mit der Front, Boden mit Top. Rechte Wand und Decke sind weg. Statt
  der Kanten des Kastens drei feinste Haarlinien vom Eckpunkt aus.
- **Namen auf dem Boden:** Seite, Front und Top liegen in Lobster flach auf dem Boden, vor ihrer Wand (Front längs der linken Wand,
  Seite vor der Rückwand, Top vor dem Schatten von oben), in der Tiefe gestreckt wie Schrift auf einer Straße, damit sie sich von
  schräg oben lesen. Grau wie ein Schatten, dunkel, solange der Zeiger über ihrer Wand oder auf dem Namen liegt; dann zeigt die
  Wand auch ihre Linien.
- **Kamera:** 32° zur Seite, 22° von oben (vorher 13°; sonst liest man den Boden nicht). Der Abstand am Ende wird so gesucht, dass
  Blase, Schatten, Ecke und Namen ins Bild passen, in jedem Format (auch hoch und schmal).
- Probe: 60 Bilder je Sekunde (95 % unter 16,8 ms), Übergang 0,19 px; Darüberfahren im Film und im Browser geprüft.

**Bilder und Film:** `docs/progress/anfang/2026-11-15-r3-film-ecke.mp4` (ganzer Ablauf mit Darüberfahren), `…-r3-ecke.png`
(unterwegs und in Ruhe), `…-r3-ecke-darueber.png` (Seite, Front, Top beim Darüberfahren).

**Offen (Fragen an Florian):** Namen immer grau sichtbar oder nur beim Darüberfahren; das Quadrat am Boden aus der Vision (Feld des
2048-Spiels) dazu; als Nächstes der Morph zur Ansicht beim Drehen zu einer Wand und das Bedienen der Kurven dort.
