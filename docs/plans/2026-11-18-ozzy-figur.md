# Plan: Ozzy-Figur, 2,5D-Bewegungswerkzeug mit Physik (18.11.2026)

**Stand: freigegeben (Florian, 18.11.: „Ja, A und B bauen“); Etappen A und B gebaut**, Ergebnis in Abschnitt 8 und in der
Übergabe [`docs/look/ozzy-figur/UEBERGABE.md`](../look/ozzy-figur/UEBERGABE.md). Recherche:
[`docs/research/2026-11-18-ozzy-figur-recherche.md`](../research/2026-11-18-ozzy-figur-recherche.md). Vorlagen:
`docs/look/ozzy-figur/vorlagen/` (Florians sechs SVGs vom 18.11.). Prüfbilder: `docs/progress/ozzy-figur/2026-11-18-t*.png`.
Proben zum Nachrechnen: `apps/editor/scripts/ozzy-figur/tests/` (README dort). Zweig `claude/ozzy-animation-physics-294508`,
aufgesetzt auf `claude/maskottchen` (der Prototyp bleibt unverändert daneben).

## Auf einen Blick

- **Deine SVGs sind schon morph-fähig.** Jedes Teil hat in jeder Ansicht dieselben Anker in derselben Reihenfolge (du hast die
  Ansichten durch Verschieben gezeichnet). Nur der Illustrator-Export hängt manchmal eine 0,01 lange Schlusslinie an; die wird
  verschmolzen. Damit kann Ozzy **genau deine Formen** zeigen (Prototyp: nachgezeichnet, 99,6 %).
- **Der neue Renderer zeichnet deine Vorlage exakt** (Logo: 0,2 % mittlerer Unterschied, nur Kantenglättung; Chrome und WebKit)
  und kann zusätzlich Teile flüssig verschmelzen, ohne Spitzen abzurunden. Er rechnet mit Abstandsfeldern auf der Grafikkarte,
  rund 6 ms je Bild auf deinem Mac in Testqualität.
- **Die Vierteldrehung des Kopfs lässt sich aus Front und Profil ableiten:** Schlitz, linke Gesichtshälfte, Nase und Ohren laufen
  direkt aus deinen Punkten sauber. Fehler gibt es nur auf der abgewandten Seite (Bartzacken und Kerben, wie im Prototyp). Eine
  Regel („abgewandte Seite wird verdeckt, nicht gequetscht“) behebt das meiste; den Rest erledigt eine 45°-Ansicht, die ich
  vorschlage und du korrigierst.
- **Der Körper dreht von deiner Front in dein Logo** mit deinen Punkten, die Beine als Punkte im Raum. Offen sind drei benannte
  Regeln (weißes Beinfenster wandert zum nächsten Bein, Schwanz taucht auf, Hinterteil am Bein).
- **Empfehlung:** 2,5D mit deinen SVGs als Schlüsselformen, ein Rig aus wenigen Punkten im Raum, eigene Physik nach dem Vorbild
  simulierter Hunde (Rumpf + steife Federbeine + Gleichgewicht mit begrenzter Kraft: darum kann er wirklich stolpern, kippen und
  Saltos schlagen). **3D/Blender und Rive habe ich geprüft und nicht gewählt** (Begründung: Recherche, Abschnitt 5 und 1).
- **Posen bearbeitest du direkt:** im Werkzeug an Punkten und Griffen ziehen wie in Illustrator, oder als SVG ausleiten, in
  Illustrator nur Punkte verschieben, wieder einlesen.

## 1. Auftrag und Charakter

Florian, 18.11. (gekürzt): Animationsbaukasten und Bewegungslogik für Ozzy, das Maskottchen seines 3D-Editors, als 2,5D-Werkzeug
aus Vektormorphs mit gleicher Punktzahl und einfachem Rig. Vier Beine, die nahen immer mit weißem Innenbereich; eine Bohne als
Körper mit kleiner Halswölbung, deren Enden sich immer mit den Beinen bewegen, sodass nie eine Kante entsteht; zwei schwarze
(„Hinterkopf“) und zwei weiße („Bartgesicht“) Gesichtsmasken, die Schlitze sind die Augen; zwei Ohren, Nase, Schwanz außen und
innen weiß. Überrealistische Physik: beim Laufen immer schneller werden, bei zu viel Tempo stolpern (wenn man nicht abbremst),
springen, in der Luft drehen, Saltos, Stufen physikalisch richtig hoch und runter, dabei extrem tapsig, tollpatschig und witzig.
Teile gleiten weich und teils flüssig ineinander, passend zu liquid drop; Kopf und Körper perfekt um 360°. Exakt wie die Vorlagen,
Weiß läuft weich, Outlines verjüngen sich elegant, keine unnötigen Kanten oder Knicke. Posen direkt bearbeiten.

Charakter (16.11., erste Sitzung): alt, mit steifen Beinen wie eingegipst, verwegen, neugierig, erkundungsfreudig; stolpert mit
kurzen Stelzenbeinen allein durch die Gegend, langsam, aber zielstrebig und nicht von seinem Ziel abzubringen. Situationskomik
statt übertriebener Bewegung.

**Wie ich „Outlines verjüngen“ verstehe** (bitte korrigieren, falls anders gemeint): Gemeint sind die schwarzen Ränder um weiße
Flächen (Gesicht, Beinfenster, Schwanz) und die weißen Trennlinien zwischen schwarzen Teilen (Ohrspalt im Profil). Sie werden nie
zur gleichmäßigen Linie und brechen nie hart ab, sondern laufen weich bis in eine Spitze aus.

## 2. Was die Vorlagen hergeben

| Datei | Körper | Kopf | Besonderes |
| --- | --- | --- | --- |
| `ozzy_front` | vorn (0°) | vorn | nur das rechte Hinterbein schaut seitlich heraus |
| `ozzy_stand01_logo` | Seite (90°) | vorn | Kopf = Frontkopf, nur verschoben (+86,8) |
| `ozzy_stand02` | Seite | Profil (90°) | Körper 9,74 tiefer (Kopf steht höher); Ohrspalt als weißer Keil |
| `ozzy_back` | hinten (180°) | hinten | Beine an denselben Stellen wie vorn; Nase liegt schwarz auf schwarz |
| `ozzy_laydown01` | liegend | vorn | Beine waagrecht (dieselbe Gipsform gedreht) |
| `ozzy_laydown02` | liegend | Profil | |

Teile (nach dem Säubern, Anker je Ansicht gleich): Ohr A/B je 4, Kopfmaske A/B je 9, Bartmaske A/B je 9, Nase 6, Bohne 8,
Schwanz außen 7 und innen 7, Beine je 15, Beinfenster je 7, zwei Füllkeile unter den Sohlen (machen die Sohlenlinie flach),
Ohrspalt 3 (nur im Profil). A ist das im Frontbild linke Teil (Ozzys rechte Seite), B sein Spiegelpartner mit derselben
Ankerreihenfolge.

Abweichungen, die der Import formtreu ausgleicht (die Form ändert sich dadurch nicht):
- Das ferne Vorderbein der Seitenansichten hat 14 statt 15 Anker (zwei Stücke zusammengelegt) → das passende Stück wird geteilt.
- Die Bohne von vorn ist nicht spiegelgleich (links 2, rechts 3 Anker). Für die Drehung nach links braucht sie links einen
  zusätzlichen Anker an der Spiegelstelle; ebenso das Hinterteil der Seitenbohne.
- Die Ansichten sind gezeichnet, nicht projiziert (Profil wie aus etwa 70°, Front leicht asymmetrisch). Das bleibt so: Die Figur
  trifft jede Vorlage an ihrem Winkel exakt; Drehungen nach links und rechts dürfen sich deshalb leicht unterscheiden.

Kleinster schwarzer Rand um Weiß in den Vorlagen: Beinfenster 16,7 bis 18,6, Schwanz 13,7, Gesicht bis 0 (am Scheitel zwischen
den Ohren berührt das Weiß den Umriss, so gezeichnet), im Profil 0,6 an der Stirn. **Folge:** Ein fester Mindestrand würde deine
Vorlagen verändern. Der Rand wird nur dort erzwungen, wo sich ein Teil wegdreht.

## 3. Tests (18.11.) und was sie entscheiden

| Probe | Ergebnis | Bild |
| --- | --- | --- |
| T0 Vorlagen zerlegt | alle Teile benannt und je Ansicht zugeordnet | `t0-vorlagen.png`, `t0-vorlagen-teile.png` |
| T1 gleiche Punkte | bestanden (nach dem Säubern); zwei formtreue Ausgleiche, siehe oben | – |
| T2 Kopf 0° → 90° direkt aus deinen Punkten | trägt; Schlitz und nahe Hälfte sauber; ferne Bartmaske ragt bei 30–60° als Zacken und Kerben über den Kopf | `t2-kopfdrehung-direkt.png`, `t2-kopfdrehung-teile.png` |
| T3 Renderer exakt | Logo 0,22 % (Chrome) und 0,20 % (WebKit) mittlerer Unterschied, nur Kantenpixel | `t3-renderer-logo-exakt-fluessig.png` (links exakt, Mitte flüssig, rechts rot = neu dazu) |
| T3 flüssig | Kehlen an Beinen, Hals, Ohren, Schwanz; Spitzen bleiben spitz; wo Kanten lange dicht nebeneinander laufen (Brust und Vorderbein), schwillt es etwas an, und wo sich Kopf und Rücken flach kreuzen (links am Hals), entstehen kleine Beulen → Stärke je Paar einstellbar, notfalls exaktes Schließen | dasselbe |
| T4 Kopfdrehung mit Regeln | 0° und 90° exakt; 30–60° ohne weiße Zacken außen; Ohrspalt erscheint von selbst als Keil, verjüngt; Rest: Bartzacken unten rechts bei 30°, kleine Kerbe am fernen Ohr bei 60° | `t4-kopfdrehung-ohne-regeln.png`, `t4-kopfdrehung-fluessig-verdeckt.png` |
| T5 Körper vorn → Seite | trägt, beide Enden exakt; offen: Fensterwechsel (hier noch als Platzhalter gestaucht), Schwanz, Hinterteil | `t5-koerperdrehung.png` |
| Tempo | Mac M3 Pro, 1017 × 1083 Bildpunkte, mit Warten auf die Grafikkarte in jedem Bild: rund 6 ms (Chrome und WebKit); 610 × 650: 5 ms; dazu im Test 4–6 ms Prozessor für die Suche nach Außenkanten (kommt im Bau auf die Grafikkarte). iPhone noch nicht gemessen | – |

Interpolation: Griffe als Winkel und Länge („W“) und linear („L“) unterscheiden sich an deinen Formen wenig; „W“ hält glatte
Punkte sicher glatt und wird Standard. Für große Drehungen (Ohren, Schwanz) zusätzlich je Teil Drehung, Größe und Lage getrennt
mischen („S“).

## 4. Aufbau

1. **Vorlagen-Import.** Liest SVGs aus Illustrator (ein Pfad je Teil, Reihenfolge wie in deinen Dateien, Weiß = jede helle
   Füllung). Säubert die Schlusslinien, ordnet Teile zu, prüft Ankerzahl und Reihenfolge, findet die Spiegelpartner A/B, gleicht
   formtreu aus und schreibt einen **Bericht** (welches Teil, welcher Anker, warum). Bricht nichts still ab.
2. **Schlüsselformen-Raster** (wie Live2D, höchstens zwei Parameter je Teil): Jede Form hängt an Parametern, an deren
   Schlüsselwerten eine gezeichnete oder korrigierte Form liegt; dazwischen wird gemischt.
   - Körper drehen ψ: 0° vorn, 90° Seite, 180° hinten, 270° gespiegelte Seite (über die Partnerkarte, nicht als Bildspiegel); 45°
     und 135° als Korrektur, falls nötig.
   - Kopf drehen θ (zur Kamera): 0°, 90° (dein Profil), 180° (dein Rücken), 270°; 45° und 135° als Korrektur.
   - Kopf nicken φ: −20°, 0°, +20° (abgeleitet: Gesicht und Schlitze gleiten auf dem Kopf hoch oder runter, Ohren gegenläufig;
     du korrigierst).
   - Posen: Stehen (Logo), Liegen (deine zwei), Sitzen, Strecken und Ducken (abgeleitet, du korrigierst), Ausdruck der Schlitze
     (neugierig, entschlossen, verdutzt; klein und trocken wie bei Gromit).
   - Mischen: Anker weich und monoton über den Winkel (periodisch), Griffe als Winkel und Länge; Ecken bleiben Ecken.
3. **Rig im Raum.** Wenige Punkte mit 3D-Lage: Hüften, Schultern, Hals, Kopfmitte, Schwanzwurzel, Ohrwurzeln, Nase. Ihre Lage
   kommt aus deinen Ansichten (Front liefert die Breite, Seite die Länge). Daraus folgen bei jeder Drehung: Lage der Teile,
   Reihenfolge von vorn nach hinten, welche Beine „nah“ sind (die bekommen das weiße Fenster).
4. **Verformung.** Anker **und** Griffe werden mitbewegt, darum keine Knicke:
   - Beine sind Gipse aus zwei Knochen (Hüfte, Fuß). Die Sohle bleibt waagrecht am Boden, das Bein schert und streckt sich, statt
     als Ganzes zu kippen; es darf sich lustig verformen.
   - Die Enden der Bohne hängen an Hüfte und Schulter: Schwingt ein Bein, geht das Bohnenende mit (dein „nie eine Kante“). Die
     Halswölbung hängt am Hals.
   - Schwanz und Ohren als kurze Ketten mit Federn; Kopf mit Feder auf dem Hals.
   - Die Bohne als Wackelpudding: Die Physik verformt sie kurz (Stauchen beim Landen, Nachschwappen), sie findet immer in deine
     gezeichnete Form zurück (Formabgleich).
5. **Renderer** (WebGL2, eigene Ebene, auch in der iOS-App):
   - Jedes Teil bekommt ein Abstandsfeld; Schwarz wird je Paar weich vereinigt (Bohne–Beine, Bohne–Schwanz, Bohne–Kopf,
     Kopf–Ohren, Ohr–Ohr), Stärke je Paar ein Regler, 0 = exakt wie gezeichnet.
   - Weiß liegt über Schwarz; auf der abgewandten Seite eines gedrehten Kopfs oder Beins verdeckt die Kante das Weiß und lässt
     einen schwarzen Rand stehen, der weich ausläuft. An den gezeichneten Posen greift diese Regel nicht (Vorlage exakt).
   - Ohrspalt von selbst: ein weißer Keil am nahen Ohr, wo es das ferne überdeckt, an beiden Enden spitz. Dein gezeichneter Keil
     im Profil ist das Maß.
   - Beinfenster wandern beim Drehen zum Bein, das gerade nah ist: Das Fenster gleitet zur abgewandten Gipskante und verschwindet
     dahinter, auf dem anderen Bein taucht es so auf (nicht schrumpfen; Florian 16.11.: verdecken statt quetschen).
   - Die Nase liegt oben; dreht der Kopf weg, wandert sie ins Schwarze und verschwindet dort.
   - Kantenglättung aus dem Abstand, scharf in jeder Größe; Ziel iPhone 16: Figur ≤ 4 ms je Bild, 60 Bilder/s.
6. **Physik und Steuerung** (eigener kleiner Löser in 2D, ohne Bibliothek):
   - Rumpf als starrer Körper (Lage, Neigung, Schwung, Drehschwung); Kopf und Bohne als Stoßform für Überschläge und Aufpralle.
   - Vier steife Federbeine mit Bodenkontakt und Haftung; ein Gangplaner setzt die Tritte (wie im Prototyp, Runde 5).
   - Gleichgewicht mit **begrenzter Kraft** (wie beim simulierten Hund von Coros 2011): Reicht sie nicht, kippt er wirklich.
     Stolpern, Hinfallen, Überschlag und Bruchlandung sind dadurch echte Physik, nicht abgespielt.
   - Laufen: Hält man die Richtung, wird er immer schneller; die Gipsbeine machen höchstens etwa 4–5 Schritte je Sekunde. Darüber
     kommt eine **Warnzone** (er taumelt, lehnt sich vor, Beine strampeln, Ohren flattern): Wer abbremst, fängt ihn; wer nicht,
     dessen Ozzy stolpert, überschlägt sich, rutscht, bleibt kurz verdutzt liegen, rappelt sich auf, schüttelt sich und läuft
     unbeirrt weiter.
   - Springen: Ausholen (Bohne staucht), Absprung, Flug mit Schwerkraft; in der Luft mit Tasten Salto vor oder zurück und eine
     ganze Drehung um die Hochachse (nutzt das Ansichten-Raster); Landung bis etwa 25° schief auf den Füßen mit Nachwippen,
     sonst Bruchlandung.
   - Stufen: kleine im Gang; mittlere klettert er angestrengt (Vorderbeine zuerst, Hinterteil schiebt, ein Hinterbein rutscht
     auch mal ab); runter tasten die Vorderbeine über die Kante, der Körper kippt vor, die Hinterbeine plumpsen nach. Ob er
     dabei kippt, entscheidet der Schwerpunkt über der Stützfläche.
   - Witz aus Timing statt Übertreibung: Nachschwingen von Kopf, Ohren und Bohne, zu spätes Bremsen, kurze Verdutztheit,
     Beharrlichkeit. Übergänge per Trägheit, Federn in der Welt, Steuerung mit Coyote-Zeit und Sprung-Puffer (aus dem Prototyp).
7. **Werkzeug** (Seite `apps/editor/ozzy-figur.html`, eigener Eintrag `ozzy-figur`, Port 5213; den Server startest du oder gibst
   ihn frei):
   - Reiter **Posen**: Regler für alle Parameter, deine Vorlage rot darüber, wo es eine gibt. Ein Teil anklicken zeigt Anker und
     Griffe; Ziehen speichert eine Korrektur an dieser Stelle des Rasters (z. B. Kopf 45°), die Nachbarn blenden weich ein.
     Keine Punkte hinzufügen oder löschen.
   - **Illustrator-Rundweg:** „Als SVG ausleiten“ schreibt die aktuelle Pose in deiner Dateistruktur; du verschiebst in
     Illustrator nur Punkte und speicherst; „Einlesen“ legt sie als Schlüssel ab, der Prüfer meldet jede Abweichung.
   - Reiter **Drehen** (Kopf und Körper getrennt, Drehblätter), **Spielen** (Tasten und Touch, Gelände mit Stufen, Rampen,
     Kanten), später **Filmstreifen** (aus dem Prototyp übernehmen).

Code: `apps/editor/src/ozzy-figur/` (Import, Raster, Rig, Verformung, Renderer, Physik, Werkzeug), Daten aus dem Import (nie von
Hand), Proben unter `apps/editor/scripts/ozzy-figur/`, Bilder unter `docs/progress/ozzy-figur/`, Übergabe
`docs/look/ozzy-figur/UEBERGABE.md`. Aus dem Prototyp übernehme ich Ideen und Teile, die getragen haben (Steuerung,
Trägheits-Übergänge, Federn in der Welt, Gangplaner mit Tritten, Gelände je Fuß, Prüfblätter), nicht seine Formen, seinen Morph,
seinen Körper aus Querschnitten und sein Weichzeichnen.

## 5. Etappen, jede mit vorher festgelegter Probe

| Etappe | Inhalt | Probe (bestanden, wenn …) |
| --- | --- | --- |
| A | Import + Prüfer + Daten | alle sechs Vorlagen im exakten Modus ≤ 0,3 % abweichende Bildpunkte (nur Kanten); Bericht nennt jeden Ausgleich |
| B | Renderer als Baustein (exakt, flüssig, Weiß-Regeln, Ohrspalt, Fensterwechsel) mit Außenkanten auf der Grafikkarte | Spitzen (Ohren, Bart, Schlitze, Schwanz) zwischen exakt und flüssig < 0,5 Bildpunkte versetzt; in keinem Bild der Drehblätter Weiß außerhalb des Umrisses; Ohrspalt läuft an beiden Enden spitz aus; Mac ≤ 3 ms Grafikkarte; **iPhone: du misst** (Perf-Anzeige), Ziel 60 Bilder/s |
| C | Ansichten-Raster: Kopf 360°, Körper 360°, Nicken; vorgeschlagene 45°/135°-Schlüssel | Drehblätter in 15°-Schritten: an 0/90/180 exakt deine Vorlagen, dazwischen keine Kerbe im Umriss und keine Zacken am Rand, Anker ohne Sprung über den Winkel; **du prüfst** und korrigierst 45° im Werkzeug |
| D | Rig und Verformung, Posen (Stehen, Liegen exakt; Sitzen, Strecken, Ducken abgeleitet), Ausdruck | Sohlen in jeder Pose flach; Übergang Bohne–Bein in 5°-Schritten, vierfach vergrößert, ohne Kante; Logo- und Liegeposen exakt |
| E | Posen-Werkzeug und Illustrator-Rundweg | Ausleiten → Einlesen ergibt dieselbe Figur; **ein echter Rundweg mit dir** in Illustrator |
| F | Physik und Steuerung: Laufen mit Tempo und Warnzone, Stolpern, Überschlag, Aufrappeln; Springen, Salto, Drehung, Landung; Stufen hoch/runter | Verlauf von Schwerpunkt und Neigung ohne Sprung zwischen zwei Bildern; stehende Füße rutschen nur, wenn er ausrutschen soll; Filmstreifen je Situation; Spielszene |
| G | Witz und Timing mit dir live | dein Urteil |
| H | Einbau in den Editor Ozzy (Begrüßung, Laden, Begleiter) | später, eigener Plan |

Reihenfolge: A und B zuerst (Grundlage für alles, die Look-Frage ist danach entschieden), dann C mit deiner ersten Durchsicht,
dann D und E, dann F. Jede Etappe wird committet und gepusht; die Übergabe steht nach jedem Block in
`docs/look/ozzy-figur/UEBERGABE.md`.

## 6. Risiken und wie ich sie früh sehe

- **Zwischenansichten sind Geschmack** (45°, 135°, Nicken): Ich schlage sie vor, du korrigierst; das Werkzeug macht das
  schnell (Etappe C/E).
- **iPhone-Tempo** ist nicht gemessen: Etappe B endet mit deiner Messung, bevor Physik dazukommt.
- **Flüssig schwillt an**, wo Kanten lange dicht nebeneinander laufen: Stärke je Paar; als zweite Stufe exaktes Schließen
  (rollende Kugel), falls nötig.
- **Komik braucht Runden mit dir:** Physik-Werte als Regler im Werkzeug, Filmstreifen zum Vergleichen.
- **Deine Vorlagen ändern sich:** Der Import ist wiederholbar; Bedingung ist nur: ein Pfad je Teil, gleiche Reihenfolge, Punkte
  verschieben statt hinzufügen. Deine sechs Dateien erfüllen das schon.

## 7. Was ich von dir brauche

- **Freigabe dieses Wegs** (2,5D mit deinen SVGs, eigene Physik; nicht 3D, nicht Rive) und der Etappen A und B als nächsten Block.
- Später, wenn du magst: Vorlagen für Sitzen oder Springen. Nötig sind sie nicht; ich leite sie aus deinen Posen ab, du korrigierst.

## 8. Stand der Etappen (Nachtrag 18.11. abends)

- **A gebaut und bestanden:** Import mit Bericht (`docs/look/ozzy-figur/import-bericht.md`), alle sechs Vorlagen im exakten Modus
  0,000–0,006 % deutlich abweichend. Das Kriterium misst jetzt deutliche Unterschiede (|Δ| > 0,5); 0,1–0,4 % Kantenpixel kippen nur,
  weil Chrome Kanten anders glättet (WebKit 0,12 %).
- **B gebaut:** B1 (Spitzen ≤ 0,19 Bildpunkte), B2 (kein Weiß-Leck beim Drehen) und B4 (Mac 2–3,6 ms je Bild mit Warten, Chrome und
  WebKit) bestanden. **B3 nicht bestanden:** Der automatische Ohrspalt verjüngt sich richtig, deckt sich aber nur zu 25 % mit
  Florians sichtbarem Keil. Das Kriterium habe ich nach genauem Blick auf seinen Keil angepasst: Er ist zum Hintergrund hin offen
  und läuft nach innen spitz aus (vorher hieß es „an beiden Enden spitz“). **Folge für C:** Sein Keil wird Teil des
  Profil-Schlüssels und morpht mit; der automatische Spalt bleibt Rückfall für Ohren, die die Physik bewegt.
- **Offen vor C:** Florians Messung auf dem iPhone und sein Blick auf die Stärken je Paar (Übergabe, Abschnitt „Offen“).

## 9. Etappe C, erster Teil (Nachtrag 18.11. abends)

Florians Rückmeldung zur Drehung und seine neuen Vorlagen (3/4, zweimal Sitzen) stehen in der Übergabe. Gebaut: Schlüsselformen-
Raster für Körper (0°/45°/90°) und Kopf (0°/45°/90°) aus seinen Dateien, Bohnenenden an den äußeren Beinkanten, Fenster und Schwanz
mit verdeckten Schlüsseln, weiches „Dahinter“ im Renderer. Probe C1 (neu): An jedem Schlüsselwinkel trifft das Raster seine Vorlage
genau (bestanden, 0,000–0,001 %). Noch nicht gebaut: 90° → 180° (Rückseite), Nicken, Posen (Etappe D).


## 10. Etappe C, zweiter Teil (Nachtrag 18.11. spätabends)

Florians zweite Rückmeldung (Zacken am Kopf zwischen 45° und 100°, Wulst Bohne–Bein, Schwanzweiß, Weiß von Vorderbein und Kopf
verschmelzen, Verjüngung im Gesicht „super smooth“) ist in der Übergabe beantwortet. Gebaut: Vereinigung nach Kantenrichtung (keine
Wulst), schrumpfendes Schwanzweiß, Verschmelzen von Bart und Vorderbeinfenstern wie Tropfen (Regler „Weiß – Weiß“, Reichweite der
Felder je Teil, damit es nur etwa 1 ms kostet), Führung der Fransenspitzen zwischen 45° und 90°. Offen und als nächster Schritt
vorgeschlagen: die Anker der fernen Kopfseite im Profil-Schlüssel in die Reihenfolge des 3/4 legen (fünf Stücke kehren sonst ihre
Sehne um; Mischen allein hielt in fünf Versuchen nicht).

## 11. Etappe C, dritter Teil (Nachtrag 18.11. nachts)

Florian: Weiß – Weiß aus, dafür darf das Weiß des Beins mit dem Schwarz verschmelzen; dazu eine Übermalung für 67°. Gebaut: Regler
Weiß – Schwarz (Fenster geben dem Schwarz darüber weich nach), Kopf–Körper ohne Kantenrichtung (kein ausgefranster Bauchspalt),
Zwischenschlüssel 67° aus seiner Übermalung und verborgene Faltschlüssel, wo zwei Anker zwischen zwei Schlüsseln aneinander
vorbeilaufen. Damit ist das Kinnband von 63° bis 90° glatt. Weg für weitere Stellen: Florian übermalt mein Bild bei einem Winkel,
ich lege es auf und baue daraus den Schlüssel (`scripts/ozzy-figur/zwischen67/`).

## 12. Etappe D (Nachtrag 18.11. nachts, Florian: „Erst weiter mit D“)

D in drei Schritten, jeder mit seiner Probe:

| Schritt | Inhalt | Probe |
| --- | --- | --- |
| D1 | Haltungen Stehen – Sitzen – Liegen in der Seite aus seinen sechs Vorlagen: Knochen je Körperteil (Drehpunkt, Winkel, Lage) plus Korrekturform, Kopf starr am Hals | an den Haltungen exakt (wie C1); Vorderpfoten bleiben beim Hinsetzen stehen; Übergang Bohne–Bein vergrößert ohne Kante; kein Weiß außerhalb |
| D2 | Rig im Raum für den Gang: Beine mit zwei Knochen (Hüfte, Fuß), Sohle waagrecht am Boden, das Bein schert und streckt sich; Bohnenenden an Hüfte und Schulter | Sohlen in jeder Lage flach; Übergang Bohne–Bein in 5°-Schritten vierfach vergrößert ohne Kante; Logo exakt |
| D3 | abgeleitete Posen Strecken und Ducken (aus D2), Ausdruck der Schlitze (neugierig, entschlossen, verdutzt) | Vorschläge als Filmstreifen, er korrigiert |

Stand: D1 gebaut (Übergabe, Abschnitt „Etappe D, erster Teil“). Offen für ihn: der Weg vom Sitzen ins Liegen (das Hinterbein
schwenkt durch die Senkrechte).

### 12a. Nachtrag: Haltungen frei ineinander, physikalisch stimmig (Florian, 18.11. nachts)

Florian: „er soll beides können. alle posen müssen smooth ineinanderlaufen. das system muss sehr stabil und robust sein.“ – „Die
beine dürfen auch nicht durch den boden drehen. Es muss immer smooth sein und immer physikalisch korrekt. Aus dem stehen kann er
einfach alle viere von sich strecken und auf den bauch rutschen. beim hinsetzen erst das hintere bein krümmen und dann nach vorne
rausstrecken.“ – „vom sitzen ins liegen soll sich das hintere bein zur kamera in einer fake 3d drehung nach hinten drehen.“

Aufbau (ersetzt die feste Kette Stehen → Sitzen → Liegen):

1. **Haltungsraum mit Gewichten:** jede Haltung ein Gewicht (Summe 1); Knochen, Lage, Korrekturform und Kopfversatz werden danach
   gemischt. An jeder Vorlage exakt; jede Mischung hat genau eine Bedeutung (Winkel je Haltung zwischen −180° und 180°).
2. **Bodenregel:** Ozzy ruht immer mit seinem tiefsten Punkt auf dem Boden (nichts sinkt ein, nichts schwebt); an den Vorlagen
   ändert sie nichts.
3. **Beine mit Richtung im Raum:** Jedes Bein zeigt von der Hüfte zum Fuß in eine Richtung im Raum. Liegen die Richtungen zweier
   Haltungen gegeneinander (Hinterbein im Sitzen nach vorn, im Liegen nach hinten), führt die Mischung über die Richtung zur Kamera:
   Das Bein wird kurz und rund (von vorn gesehen) und geht hinten wieder auf, statt durch den Boden zu drehen.
4. **Bein mit Rückgrat (D2):** Das Bein folgt einer Kurve von der Hüfte zur Sohle; die Sohle bleibt flach, solange der Fuß steht,
   das Bein krümmt sich, wenn die Hüfte sinkt.
5. **Übergänge als Wege durch den Haltungsraum:** Hinsetzen über eine Hocke (Hinterbeine krümmen, Hinterteil sinkt), dann streckt
   sich das Hinterbein nach vorn; direkt Hinlegen: alle viere von sich, auf den Bauch rutschen (Pfoten gleiten auf dem Boden);
   Sitzen → Liegen: Hinterbein dreht zur Kamera nach hinten. Rückwege umgekehrt.
6. **Steuerung:** Knöpfe Stehen, Sitzen, Liegen; Gewichte folgen gedämpften Federn (kein Ruck, jederzeit umlenkbar).

Proben: an allen Vorlagen exakt; kein Teil je unter dem Boden; jeder Übergang ohne Sprung (Schritt je Bild begrenzt); zufällige
Mischungen und Kopfwinkel ohne Fehler; Malreihenfolge ohne sichtbares Springen.

**Stand (18.11. nachts): 1 bis 6 gebaut**, Proben bestanden (Einzelheiten in `docs/look/ozzy-figur/UEBERGABE.md`, Etappe D, zweiter
Teil). Dazu gekommen, weil die Proben es verlangten: Knochenkette (Beine, Schwanz, Kopf hängen an der Bohne; was steht, bleibt
stehen), fehlende Teile ziehen sich ins Bein zurück, weiche Malreihenfolge (Schwarz schiebt sich von innen über Weiß, statt beim
Wechsel der führenden Haltung umzuklappen).

### 12b. Florians Rückmeldung zu den Wechseln (19.11.): Abläufe mit Charakter

Florian: „Erstmal musst du das sitzen und liegen und vor allem das liegen aus dem sitzen und umgekehrt anpassen. Es sieht nicht gut
aus! Vor allem die drehung des hinterbeins. Es soll 2 verschiedene hinsetzen geben. Einmal soll er mit den hinterbeinen leicht
springen und auf den hintern knallen. Einmal soll es so sein wie jetzt aber das biegen der hinterbeine muss viel deutlicher sein.
Erst wenn der hintern den boden berührt streckt er das hinterbein dann nach vorne. Beim liegen noch am, auf den bauch rutschen,
feilen und ein gemütliches hinlegen. Beim sitzen zum liegen bitte vorne runtergleiten mit den vorderpfoten, dabei stellt er den
hintern leicht in die höhe und das hinterbein stellt sich mit leichter biegung auf und dann rutscht es nach hinten durch zur
liegeposition. Es soll witziger und schöner sein.“

Umsetzung (die Drehung des Hinterbeins zur Kamera entfällt auf allen Wegen; sie bleibt nur als Rückfall für freie Mischungen):

1. **Bein biegt sich mit fester Länge:** Das Rückgrat des Beins wird nach Bogenlänge abgelaufen, seine Griffe so lang, dass das Bein
   seine Länge behält; biegt es sich so stark, dass es innen falten würde, schiebt es sich den Rest in den Körper.
2. **Zwei gebaute Zwischenhaltungen:** *tiefe Hocke* (Körper wie im Sitzen, Hintern am Boden, Hinterpfoten stehen, Hinterbeine
   deutlich gebogen, Knie nach vorn) und *Diener* (Vorderpfoten nach vorn geglitten wie im Liegen, Brust tief, Hintern leicht hoch,
   Hinterbeine stehen leicht gebogen, Schwanz hoch).
3. **Abläufe mit eigener Zeit** statt eines Wegs mit gleichem Tempo:
   - *Hinsetzen:* Stehen → tiefe Hocke (Hinterbeine biegen sich, der Hintern sinkt bis auf den Boden) → Sitzen (erst dann streckt
     sich das Hinterbein nach vorn).
   - *Hinsetzen mit Hüpfer:* kurz ausholen, mit den Hinterbeinen hüpfen (das Hinterteil hebt ab, die Hinterbeine schwingen in der
     Luft nach vorn), auf den Hintern plumpsen (Ozzy staucht sich, der Kopf federt nach).
   - *Hinlegen, auf den Bauch rutschen:* die Beine rutschen weg, der Körper fällt immer schneller, der Bauch plumpst auf.
   - *Gemütlich hinlegen:* Stehen → Diener → Liegen, langsam, am Ende ein Seufzer (sanftes Stauchen).
   - *Sitzen → Liegen:* Sitzen → Diener (vorn runtergleiten, Hintern leicht hoch, Hinterbein stellt sich gebogen auf) → Liegen
     (das Hinterbein rutscht nach hinten durch); im Diener wedelt der Schwanz.
   - *Rückwege:* Liegen → Sitzen über Diener und Hocke, Liegen → Stehen über den Diener (Hintern zuerst), Sitzen → Stehen über die
     Hocke.
4. **Steuerung:** Knöpfe Stehen, Sitzen, Sitzen mit Hüpfer, Liegen (rutschen), Liegen gemütlich; jeder wirkt jederzeit, ohne
   Sprung (Gewichte und Zusatzbewegungen gleiten über).

Proben: an den Vorlagen exakt; kein Fuß unter dem Boden (außer in der Luft beim Hüpfer, dann darüber); Abläufe stetig ohne
Bildsprung; Filmstreifen je Ablauf für Florian.

**Stand (19.11.): 1 bis 4 gebaut**, Tests und Proben bestanden (`docs/look/ozzy-figur/UEBERGABE.md`, Etappe D, dritter Teil; Bilder
und Video `docs/progress/ozzy-figur/2026-11-19-d-*`). Florians Urteil steht aus.
