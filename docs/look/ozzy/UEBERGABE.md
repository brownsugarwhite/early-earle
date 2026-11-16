# Übergabe: Ozzy (Stand 16.11.2026, mittags)

Ozzy ist der Editor für Florians Formen aus einem Guss (Florian, 16.11.: Name „Ozzy“, Designsystem „liquid drop“). Plan mit seinem
Auftrag wörtlich, Bestandsaufnahme, acht Grundsätzen und acht Phasen: [`docs/plans/2026-11-16-ozzy.md`](../../plans/2026-11-16-ozzy.md).
**Florians Ziel für den 17.11.:** mit einer neuen Sitzung auf dem neuen Design und dem neuesten Stand weiterarbeiten. Es gibt keine
parallele Arbeit an `kurven.ts` mehr; auch die offenen Punkte des Kerns werden hier, im Zweig `claude/ozzy`, weitergeführt.

## Wo was liegt

| Was | Ort |
| --- | --- |
| Arbeitsbaum | `.claude/worktrees/ozzy`, Zweig `claude/ozzy` (von `claude/form-bau`, dazu `claude/look-linien`, `claude/anfang`, der Bleistift-Kern aus `origin/claude/nice-lovelace-gxxpux`) |
| Server | Eintrag `ozzy` in `.claude/launch.json` (auch uncommittet im Hauptordner, dort liest das Vorschauwerkzeug), Port 5205 |
| Seite | `http://localhost:5205/ozzy.html` (`?info=1` Takt, `?bild=1` ohne Bedienung, `?film=1` ohne Bedienung mit Zeiger) |
| Code | `apps/editor/src/ozzy/`: `main.ts` (Ablauf, Raum, Kamera, Wände, Ansichten, Vier Ansichten, Eingaben, Feinregler, Test-Haken `__ozzy`), `blatt.ts` (Blatt: P, Freihand, Formen in einem Netz), `leiste.ts` (Werkzeugleiste mit Tropfen), `kamera.ts` (Perspektive als Zahl), `kapseln.ts` (Puffer der flüssigen Anzeige), `regler.ts` (Feinregler), `ozzy.css` |
| Studien (benutzt, nicht kopiert) | `src/linien/` (Anzeige `fluessig.ts`, `verhalten.ts`, `stift.ts`, `netz.ts` …), `src/anfang/` (Blase `form.ts`, Seifenhaut `haut.ts`, Ablauf `aufblasen.ts`, Regler) |
| Kern | `packages/shape/src/dicht/`, `loeser/` (Sitzung 4, unverändert), `zeichnen/` (Bleistift: Faden, Nachlauf, Anpassen, Formen) |
| Altes Fenster des Kerns | `kurven.html?gewichte=geometrie` im selben Server (5205): voller Stand von Sitzung 4 mit Maul und Pose |
| Vorlagen, Bilder | `docs/look/ozzy/` (Florians Bleistift-Einstellung), `docs/progress/ozzy/` (Skizze des Plans) |

## Stand 0 (16.11., gebaut und im Browser geprüft)

- **Blatt:** „draw something“ in Lobster, darunter die Leiste: P · Freihand · Formen ▾ (Ellipse, Würfel) · Mülleimer. Unter dem
  gewählten Werkzeug hängt ein Tropfen, der beim Wechsel mit einer Feder hinüberfließt und sich dabei dehnt; die Formen klappen als
  Tropfen auf. Mit dem ersten Strich blasst der Gruß aus, die Leiste gleitet an den oberen Rand.
- **P** ist das Werkzeug der Linien-Studie, unverändert (`Verhalten` mit `Stift2D`). **Freihand** wie im Zeichen-Fenster
  (Glättung 100 %, Treue 4 px, Nachlauf; geprüft: ein Kreis wird ein Pfad mit 5 Ankern). **Ellipse, Würfel**: Ziehen, ⇧ gleich, ⌥
  aus der Mitte (der Würfel ist vorerst sein Umriss von der Seite). Alles schreibt in dasselbe Netz; auf dem Blatt ist jede Linie
  ein Umriss (1 px). Die Silhouette ist die größte geschlossene Linie.
- **↩ bläst auf** mit dem Ablauf der Aufblas-Studie (Runde 5); der Rahmen fährt zur Rückwand und bleibt dort als Zeichnung der
  Seite stehen, Front und Top erscheinen auf ihren Wänden. **Raum:** in der Mitte die Seifenblase, an den drei abgewandten Wänden
  die Linien der Ansichten (keine Schatten), die drei Kanten der fernen Ecke.
- **Kamera** (`kamera.ts`): Maßstab und Perspektive sind getrennt. Beim Einrasten (1, 3, 7, Drehen nahe einer Achse unter 9°)
  bleibt der Maßstab genau gleich (geprüft: 0,665 vorher und nachher), am Ende ist die Kamera genau parallel (`OrthographicCamera`),
  und die Linie der Seite liegt auf dem Umriss der Blase.
- **Tab: Vier Ansichten** in Flucht: Seite oben links, Front oben rechts, Top unten links, Raum unten rechts. Ein Maßstab für die
  drei flachen Felder, Spalten und Zeilen nach den Maßen der Form; die Felder zeigen nur Linien, das vierte nur die Blase. Zwei
  Haarlinien, an ihrer Kreuzung ein Tropfen, der die Felder einstellt (Florians Abweichung bleibt, die Lage folgt weich der Form).
  Beim Auf- und Zuklappen gleiten die Linien von ihren Wänden in die Felder.
- **Bearbeiten (vorläufig):** Punkte der Silhouette ziehen (eingerastete Seite, Feld der Seite, Wand der Seite), die Blase folgt;
  an der Blase ziehen (weiche Verformung der Studie). Alles andere kommt mit dem Werk.
- **Feinregler** hinter dem Wort „Ozzy“ oben links (⌘,): 77 Regler in 18 Gruppen (Linien und Punkte, Freihand, Seifenhaut und
  Aufblasen, Raum und Ansichten), Fassung der Haut (M), „Werte kopieren“, „Grundwerte“. Eigene Schlüssel im Browser
  (`ozzy-…`), die Studien behalten ihre.

## Phase 1: das Werk (16.11. vormittags, gebaut)

`apps/editor/src/form/kurven.ts` ist geteilt in **`werk.ts`** (Zustand und Handgriffe einer Form, Bildtakt `bildRechnen`, Hintergrund,
Maul, Pose, Behalten; ohne DOM und ohne three.js) und die **Hülle `kurven.ts`** (three.js, SVG-Blätter, Knöpfe, Tasten, Zeiger,
Startcode, Test-Haken `__kurven`). Verhaltensgleich: dieselben neun Fenster-Proben vorher und nachher (Tabelle unten).

**Wie es gebaut ist** (mit einem Werkzeug, das `kurven.ts` mit dem TypeScript-Compiler liest und jede Anweisung auf oberster Ebene
zuordnet; keine Zeile von Hand umgeschrieben außer der Sperre der Eingaben beim Maul):
- **Werk** ist jede Anweisung, die weder DOM noch three.js braucht; Daten bleiben im Werk, außer nur die Hülle braucht sie. Der Startcode
  des Fensters bleibt in der Hülle (gleiche Reihenfolge wie vorher). Das Werk gibt alles nach außen (`export`).
- **Haken** (`anzeige` im Werk, Typ `Anzeige`): Wo das Werk die Anzeige ruft, ruft es `anzeige.…` (`geometrieNeu`, `reglerZeigen`,
  `allesZeigen`, `skala`, `ausschnittGeaendert`, `statusZeigen`, `eingabenSperren`, `hautZeigen`, `baenderZeigen`, `blattZeichnen`,
  `glattInRuhe`, `rendern`). Die Hülle setzt sie gleich nach `skala` (`Object.assign(anzeige, …)`); vorher sind es leere Haken
  (`skala` gibt 1).
- **Geteilter Zustand `G`** (im Werk): 23 Größen, die Werk und Hülle beide setzen (Auswahl, Werkzeugmodus, Meldung, Einfluss O,
  Radius, Zeichnung im Gang, die Stände des Hintergrunds, `maul`, `neuZeichnen` …). Überall `G.name` statt `name`.
- **Achtung:** `allesZeigen` steht in der Hülle und tut dort auch Werk-Arbeit (ein gelöschtes Maul aufräumen, `eckenAuto`,
  `vorrechnenPlanen`, `behaltenPlanen`). Wer das Werk ohne `kurven.ts` benutzt (Ozzy), muss diese vier Dinge in seinem
  `anzeige.allesZeigen` auch tun, oder das Werk bekommt dafür eine eigene Funktion `geaendert()` (nächster kleiner Schritt).

**Belegt** ([`docs/progress/ozzy/2026-11-16-werk-proben.md`](../../progress/ozzy/2026-11-16-werk-proben.md)): Typen, Lint, die 24 Tests des Fensters; die neun
Fenster-Proben vorher und nachher mit denselben Urteilen (die 2 umgeschlagenen Dreiecke einer ersten Abzweigungs-Probe vorher kamen in
3 weiteren Läufen des alten Stands nicht wieder: Streuung der Uhr).

## Florians Regel (16.11. vormittags)

„Hauptsache am Rechenkern wird nicht verändert […] Der Kern ist noch nicht perfekt und das muss [Sitzung 4] machen, also daran nichts
ändern oder optimieren.“ Und: „Ich will aber keinen Unterschied zwischen meinen Kurven und dem Modell, wie es bei Sitzung 4 ist.“
Ozzy benutzt die Rechnung, wie sie ist (`packages/shape` und die Rechnung im Werk); was sie nicht kann, ist Arbeit für die
Kern-Sitzung. Der Vorschlag „Formschicht“ (eine Schicht über der Haut aus den Linien) ist damit vom Tisch.

**Zur Frage, ob die Trennung nötig war:** `claude/ozzy` ist eine Abzweigung vom Stand der wartenden Sitzung 4 (`claude/form-bau`,
14.11.); Design, Material und Animationen kommen in eigenen Dateien dazu (`src/ozzy/`, `src/linien/`, `src/anfang/`). Getrennt
wurde nur `kurven.ts`, weil dort die Rechnung des Fensters (Stand, Züge, Hintergrund, Maul, Pose) mit der alten Bedienung verwoben
war: Ozzy braucht genau diese Rechnung ohne die alte Bedienung, ohne Kopie (zwei Rechnungen liefen auseinander). Der Schnitt hat
nichts umgeschrieben (neun Fenster-Proben gleich) und ist wiederholbar: `apps/editor/scripts/werk-schnitt/schnitt.mjs` (Anleitung im
Kopf; geprüft, dass er aus dem alten `kurven.ts` genau `werk.ts` und `kurven.ts` von 5039cead macht). Arbeitet Sitzung 4 weiter,
dann am besten im Arbeitsbaum `ozzy` (die Funktionen heißen gleich, sie stehen in `werk.ts`, Liste:
[`werk-schnittplan.md`](werk-schnittplan.md)); baut sie doch in ihrem alten Zweig in `kurven.ts`, wird der Schnitt wiederholt.

## Phase 3: Form aus der Silhouette (16.11. vormittags): Weg A gebaut

**Gebaut:** `neuAusUmriss(anker)` im Werk: Silhouette rund aufgeblasen (`rundAusSeite`, so dicht wie die Startform), die Silhouette ist
die Linie der Mitte (Anker = Punkte, Griffe = Griffe, Ecken, wo die Richtung wechselt), ein Schritt für ⌘Z. Dann rechnet das Werk die
Haut gleich über die ganze Form aus dieser Linie (`hautNeuRechnen`, wie nach „Kante an/aus“): Die Form ist, was die Rechnung aus der
Linie macht (Weg A, Florian). Am Kern und an den bestehenden Funktionen des Werks ist nichts geändert. Prüfhaken
`__kurven.ablage.neuAusUmriss`, Probe `apps/editor/scripts/pruefen/ozzy-silhouette-fenster.mjs`. Ozzy ruft es noch nicht.

**Ergebnis** ([Messung](../../progress/ozzy/2026-11-16-silhouette-beweis.md)): Linie genau auf der Zeichnung und auf ihrem Pfad,
keine umgeschlagenen Dreiecke, die Form steht, Anfassen ohne Zug bewegt nichts (0,000), im ersten Bild des ersten Zugs bewegt sich
nichts weiter als die Maus (vorher sprang die Haut bis 17,5), nach dem Loslassen kriecht nichts. Offen, aber so rechnet der Kern:
An den Einbuchtungen der Schwanzwurzel wölbt sich die Haut bis 2,0 über die Linie, und die Rechnung macht Front und Top selbst (der
Fischschwanz wird so dick wie hoch; [Bild](../../progress/ozzy/2026-11-16-silhouette-ruck.png), rechts). Dünner wird er mit Linien
in Top und Front. Weil eine einzige Linie die ganze Form bestimmt, formt ein Zug an ihr die ganze Haut mit (12 nach oben: abseits
bis 4 beim Fisch, 7 bei der Ellipse); mit mehr Linien wird das örtlicher.

## Phase 3: Ozzy zeigt die Form des Werks (16.11. vormittags, gebaut)

**Ablauf:** ↩ legt die Form im Werk an (`werkFormAnlegen` in `main.ts`: Silhouette in Einheiten des Werks, größte halbe Ausdehnung
150 wie die Startkugel, Mitte der Silhouette im Ursprung; `neuAusUmriss`, rund 110 bis 220 ms). Die Blase der Studie bläst wie bisher
auf. Nach dem Abriss, sobald das Werk seine Form gerechnet hat, übernimmt die Haut des Werks die Blase: Jeder Rechenpunkt liegt zuerst
auf der Blase (über das flache Netz der Silhouette, Vorder- oder Rückseite) und schnalzt mit der Feder der Blase (`rund`, gezählt ab
der Übergabe) in die Form der Rechnung. Rahmen und Schlauch bleiben die der Studie. In der Ruhe zeigen Wände, Felder und die
eingerastete Ansicht die Linie der Mitte des Werks (Seite, mit Punkten) und den Umriss der Haut des Werks (Front, Top). Punkte der Seite
zieht das Werk (`werkGreifen`: Auswahl, `zugStarten`, `zugBewegen`, `zugEnde`, der wartende Griff wie im Prüffenster); ⌘Z im Raum geht
im Werk zurück, nie hinter die Form aus der Silhouette. Beim Luftablassen wird die Linie des Werks die Zeichnung, wenn sie im Raum
geändert wurde (`werkAufsBlatt`, ein Schritt für ⌘Z des Blatts); an der Haut des Werks zieht nichts (der Pinsel kommt mit Phase 6).

**Teile:** `src/ozzy/adresse.ts` (die Schalter des Werks in der Adresse: `gewichte=geometrie` wie das Standardfenster, `behalten=0`,
damit Ozzy dem Prüffenster auf demselben Port nichts überschreibt; muss das erste Import in `main.ts` sein), `src/ozzy/werkHaut.ts` (die
glatte Anzeige der Haut des Werks wie in `kurven.ts` mit `GlattPlan`, dazu Höhe, Seite, Lage im Blatt und Dehnung je Punkt für die
Seifenhaut, der Umriss je Achse, der Pfad der Linie der Mitte), in `src/anfang/haut.ts` neu `blaseErsetzen(netz)` (ein fremdes Netz
statt der Blase des Körpers), in `src/ozzy/blatt.ts` neu `silhouetteErsetzen`. Die Haken des Werks setzt `main.ts` (`geometrieNeu`
ruft `teilungNeu`, `allesZeigen` tut, was die Hülle dort am Werk tut). Am Werk und am Kern ist nichts geändert.

**Belegt** (Probe `apps/editor/scripts/pruefen/ozzy-werk-fenster.mjs`, alle fünf Kriterien; Bild
[`2026-11-16-werk-in-ozzy.png`](../../progress/ozzy/2026-11-16-werk-in-ozzy.png)): Form angelegt (7 Punkte); Übergabe im Mittel 0,15 px
neben der Blase (einzelne Punkte bis 12 px, in Bewegung nicht zu sehen); in der Ruhe die Haut des Werks, die Linie der Seite genau auf
der Zeichnung; Zug in der eingerasteten Seite 40 px nach oben, ein Schritt, ⌘Z genau zurück; keine Fehler. Derselbe Fisch im Prüffenster
mit demselben Maßstab: dieselbe Haut (914 Punkte, 21 umgeschlagen), derselbe Zug dieselben 27 umgeschlagenen Dreiecke und dieselbe
Meldung. Ozzy rechnet also wie das Prüffenster.

**Für die Kern-Sitzung** (so rechnet der Kern, Ozzy ändert daran nichts):
- An der dünnen Schwanzflosse dieses Fischs (Bilderbogen von Stand 0) faltet die Rechnung die Spitze: 21 umgeschlagene Dreiecke nach
  dem Setzen; bei 1,5 % kleinerem Maßstab sind es 0. Ein Zug am oberen Punkt (35 Einheiten): 27, und „Hier ließ sich das Netz nicht
  aufräumen (die Haut lief dabei auseinander)“.
- Ohne vergehende Zeit (54 Bilder hintereinander gerechnet, nur in einer Probe) endete derselbe Zug einmal mit zerrissener Haut (330
  umgeschlagen, ein Teil 376 Einheiten weit draußen), ohne dass der Schutz gegen das Davonlaufen griff; ⌘Z holte die Form zurück.
- Mit der Silhouette als einziger Linie wölbt sich die Haut an Einbuchtungen bis 2 Einheiten über die Linie (siehe oben).

**Offen in Ozzy (Feinschliff):** ↩ hält 110 bis 220 ms an (`neuAusUmriss` im Fenster; besser schon rechnen, sobald die Silhouette
geschlossen ist und ruht); das Muster der Seifenhaut wechselt bei der Übergabe leicht (Lage im Blatt und Bezug der Dehnung kommen aus
der Form des Werks); der Umriss in Front und Top zeigt auch innere Kanten (Verdecktes kommt mit Phase 4); der Raum (Abstand der Wände)
richtet sich noch nach der Blase der Studie.

## Phase 5.1 und 5.2: Laden und Bearbeiten über das Werk (16.11. mittags, gebaut)

Florian: „mach Phase 5“. Etappen im Plan (Abschnitt 8, Phase 5): 5.1 Laden, 5.2 Linien und Bedienung (gebaut), 5.3 P und Freihand,
5.4 Maul und Pose (offen).

**5.1 Laden:** Menü „Ozzy“ (oben links) → „Laden“ listet die Ablage (`wesen/`); oder `ozzy.html?form=<Name>`. `formLaden` in `main.ts`:
Das Werk lädt die Form wie das Prüffenster (`wesenLaden`, auf das kleine Netz vergröbert), ihre Linie der Mitte kommt als Zeichnung
aufs Blatt (ohne Linie der Mitte eine Ellipse um ihre Seite), die Form bläst auf wie eine gezeichnete, nach dem Abriss zeigt die
Seifenhaut die Haut des Werks. `werkForm.geladen` verhindert, dass `werkFormAnlegen` die Form aus der Zeichnung neu anlegt; ändert man
die Zeichnung auf dem Blatt, entsteht eine neue Form aus ihr (wie bei einer gezeichneten). **Der Raum folgt jetzt der Form des Werks**
(`werkMasseWelt`, `raumRechnen`; nach einem Handgriff nur, wenn sich die Größe um mehr als das Band `bw.band` ändert): Vorher nahm er
die Blase, und an „test_kaputt“ lief das Feld Top über.

**5.2 Linien und Bedienung:** Die Linien-Studie hängt ihre Bedienung über die Schnittstelle `Raum` an ein fremdes Modell (so lief ihre
3D-Probe `raum.ts`). `src/ozzy/werkBlatt.ts` ist dieser Raum aus dem Werk:
- **Netz je Bild** (`bauen`): alle Linien des Werks auf allen Flächen, in Bildschirmpunkten. Flächen (`flaechenJetzt` in `main.ts`): die
  sichtbaren Wände (Front an der Wand x, Top am Boden, Seite an der Wand z), die eingerastete Ansicht (Ebene durch die Mitte der Form)
  und die drei Felder der Vier Ansichten (beim Auf- und Zuklappen zwischen Wand und Feld gemischt). Je Fläche das Blatt ihrer Achse wie
  im Prüffenster (`werk.imBlatt`); ein Punkt des Werks ist auf jeder Fläche ein Anker, an einer Kreuzung teilen sich die Linien den
  Anker, in Front und Top kommt das Spiegelbild dazu (auf der Mittelebene derselbe Anker). Die Linie wird im Blatt als Bézier-Stück
  abgetastet und dann auf die Fläche gebracht (an der Wand perspektivisch genau); Arten: Linie der Mitte in der Seite Umriss, Kanten
  Kante (verjüngt), sonst innen. Linien ohne Pfad (noch ohne Griffe) nur zu sehen.
- **Bedienung:** ein zweites `Verhalten` in `main.ts` (`bearbeiten`, Raum-Modus). Es bekommt die Flächen nur, wenn sie stehen (keine
  Fahrt, Vier ganz auf oder zu, eingerastet ganz oder gar nicht); dazwischen zeichnet Ozzy dieselben Linien schlicht. Punkt ziehen →
  `zugStarten`/`zugBewegen`/`zugEnde` mit den Blattkoordinaten der Fläche (der Zug beginnt erst nach 3 px; der wartende Griff wie im
  Prüffenster), Linie ziehen → der ganze Loop (wie im Prüffenster), mehrere gewählte → zusammen, Richtung (Nadel) → `griffZugStarten`
  (die Studie dreht im Bildschirm, die Spitze des Griffs geht im Werk dorthin; ⌥ beim Drücken macht den Punkt zur Ecke), Doppelklick auf
  die Richtung → `eckeUmschalten`, ⌫ → `loeschen` (geteilte Punkte bleiben, wie in der Studie), K → `kanteSetzen`, ⌘Z → im Werk zurück
  (nie hinter die geladene oder aufgeblasene Form), ⌘A alle, Esc leert die Auswahl. Ins Leere: im Raum (und im Feld des Raums) drehen,
  eingerastet und in den Feldern ein Rahmen (E2). Die Auswahl gilt je Punkt des Werks auf allen Flächen (`auswahlAbgleichen`).

**Belegt:** Probe `apps/editor/scripts/pruefen/ozzy-bearbeiten-fenster.mjs` („test_kaputt“), alle sechs Kriterien: Laden wie im
Prüffenster (Unterschied 0); Zug an der Wand der Seite genau 30 px wie die Maus, ein Schritt; ⌘Z genau; Zug an der Wand der Front und
eine Richtung an der Wand der Seite (−89,3° → −108,3° im Blatt, die Gegenseite in der Flucht); **derselbe Ablauf im Prüffenster mit
denselben Verschiebungen im Blatt gibt dieselben Punkte und Griffe (höchstens 0,000015 daneben) und gleich viele umgeschlagene Dreiecke
(10 und 10)**; keine Fehler. Die Probe von Phase 3 (`ozzy-werk-fenster.mjs`) hält weiter. Von Hand im Fenster: Rahmen, Zug im Feld der
Front, K, ⌫ an „strange bird“ (Punkt der Mitte weg, ⌘Z zurück). Bilder: [`2026-11-16-bearbeiten.png`](../../progress/ozzy/2026-11-16-bearbeiten.png)
(„strange bird“: Raum, Tropfen an der Wand, Nadel eingerastet, Vier Ansichten; `scripts/pruefen/ozzy-bearbeiten-bilder.mjs`).

**5.3 P (gebaut, 16.11. mittags):** Taste P oder die Leiste (im Raum mit dem Werk ist nur P an), Esc bricht ab oder schaltet P aus,
↩ schließt, ⌫ nimmt den letzten Punkt zurück. `werkBlatt.ts` ist jetzt auch das `StiftWerk` der Studie: Frei begonnen zeichnet P eine
**Form** auf der Fläche unter dem Zeiger (Anker im Blatt ihrer Achse; das Werk kennt je Anker nur gleich lange Griffe nach beiden Seiten,
ein gebrochener Griff wird so gerade gezogen), geschlossen legt das Werk sie auf die Haut (`stiftFertig`; über die Mitte in Front und
Top, vorn über den Umriss in der Seite wird sie ein Ring rundum: das ist „Loop rundum statt L“). Auf einem Punkt oder einer Linie
begonnen ist es eine **Abzweigung** (`abzweigBeginnen`, gesetzte Punkte, Ende an Punkt oder Linie: `abzweigungErstellen`). Der Entwurf
liegt im Netz des Verhaltens (`entNetz`), die Vorschau zum Zeiger ist `faden`. Probe: Kriterien 6 und 7 von `ozzy-bearbeiten-fenster.mjs`
(Form und Abzweigung wie im Prüffenster, neue Linie höchstens 0,05 daneben, umgeschlagen 0 und 0). **Behoben:** P fängt Linien im
Umkreis (rund 16 px, wie in der Studie); in einer Form setzte das den Punkt auf die Linie, 0,1 neben die Kreuzung, die das Werk dort
selbst anlegt (zwei Punkte fast am selben Ort). In einer Form zählt jetzt der Ort der Maus. **Offen:** Freihand im Raum.

**Was dabei auffiel (offen):**
- Eine Wand, die man fast streifend sieht, ist sehr empfindlich: 25 px nach rechts an der Wand der Front verschoben „test_kaputt“ um 70
  Einheiten in z (so rechnet die Perspektive). Genau arbeitet man eingerastet oder in den Feldern.
- Wechselt eine Wand beim Drehen unter die halbe Stärke, verschwinden ihre Punkte auf einmal (die Linien werden weich dünner).
- In der Pose (5.4) zeichnet `werkBlatt` die Stücke als Bézier aus gedrehten Punkten; wo sich der Winkel längs eines Stücks ändert,
  braucht es die abgetasteten Stücke (`stueckeGezeigt`) wie im Prüffenster.
- ⌥ während des Drehens (nicht beim Drücken) knickt noch nicht; Kippen aus der Ebene (⇧) gibt es auf den flachen Flächen nicht.
- Der Ring eines Rings (offene Linie) teilt seine Enden auf der Mittelebene mit dem Spiegelbild: In Front und Top lassen sie sich mit ⌫
  nicht löschen (die Studie lässt geteilte Punkte stehen), in der Seite schon.

## Was noch fehlt (nächste Schritte, Plan Abschnitt 8)

1. ~~Phase 1, das Werk lösen~~: gebaut (oben). Kleiner Rest: `allesZeigen` tut in der Hülle Werk-Arbeit (Ozzy tut sie in seinem Haken
   nach).
2. ~~Phase 3, die Form des Werks in Ozzy~~: gebaut (oben); Feinschliff offen.
3. **Phase 5, Bearbeiten über das Werk:** 5.1 Laden, 5.2 Linien und Bedienung, 5.3 P gebaut (oben). Offen: **Freihand im Raum**
   (geschlossener Strich auf einer Fläche → Anker mit Florians Bleistift-Einstellung wie auf dem Blatt → wie eine Form mit P; ein offener
   Strich wäre im Werk das Maul aus einer Linie, gehört zu 5.4), **5.4 Maul und Pose** (E8: „Maul“ als Tropfen-Menü am gewählten Loop
   → `maulFormenGewaehlt`; „Fressen“ mit Reglern oben rechts → `poseBetreten`/`knochenSetzen`; in der Pose Papier leicht getönt;
   dafür in `werkBlatt.bauen` die gebogenen Stücke `stueckeGezeigt` und in `werkHaut` die gedrehte Haut der Anzeige prüfen), Sichern
   im Menü (Vorsicht: `wesen/` sind Florians Formen, nie überschreiben ohne Frage).
4. Danach: Pinsel an der Blase (Phase 6: nur, was die Rechnung kann, also Ziehen wie O; Aufblasen, Absaugen, Glätten sind Arbeit
   der Kern-Sitzung), eine Leinwand für Haut und Linien, Würfel als Quader, Finger.

## Bedienung

Blatt: P, N (Freihand), e (Ellipse), E (Würfel), V oder Esc (Auswahl); ↩ schließt eine Linie mit P, auf einer geschlossenen
Silhouette bläst ↩ auf; ⌫ letzter Punkt oder Auswahl; ⌘Z. Raum: Ziehen ins Leere dreht (nahe einer Achse rastet es ein), Punkte der
Seite ziehen (an der Wand, im Feld, eingerastet; das Werk rechnet), seit 5.2 alle Linien auf allen Flächen: Punkte, Linien und
Richtungen ziehen, Doppelklick auf eine Richtung Knick ↔ rund, ⌥ beim Drücken knickt, ins Leere eingerastet und in den Feldern ein
Rahmen, K Kante, ⌫ löscht die Auswahl (ohne Auswahl Luft ablassen), Esc leert die Auswahl, ⌘A alle; Menü „Ozzy“ → Laden; ⌘Z im Werk zurück, 1 Seite, 3 Front, 7 Top, 0 Raum (tippen
bleibt, halten schaut kurz hin), Tab Vier Ansichten, Rad zoomt (Pos1 passt ein), Leertaste noch einmal aufblasen, Esc zurück (Vier →
Raum → Blatt), ⌫ Luft ablassen, M Fassung. Prüfhaken `window.__ozzy` (u. a. `werk()`, `seitenLinie()`, `uebergabePruefen()`,
`werkGrenzen()`).

## Fallen

- **Vorschaufenster:** Es ist hochkant und schmal; für Florians Sicht auf 1440 × 900 stellen (`resize_window`), danach zurück.
- **Auf dem Blatt liest die Anzeige „innen“ als „Umriss“** (`Blatt`, `Proxy` auf die Werte), damit P-Linien 1 px breit sind; die
  Feinregler wirken trotzdem.
- **`Verhalten.netzErsetzen`** (neu in `src/linien/verhalten.ts`) legt den Stand davor auf den Stapel für ⌘Z; Freihand, Formen und
  Mülleimer gehen darüber.
- **Kamera:** Unter `P_MIN` (0,004) wechselt `Kamera.stellen` auf die parallele Kamera, sie steht dann weit hinten (die Seifenhaut
  rechnet ihre Spiegelung mit `cameraPosition`). Nach `stellen` nie `updateProjectionMatrix` von außen rufen, wenn die Vier Ansichten
  die Projektion schon verkleinert haben (`kameraSetzen` multipliziert sie vorn an).
- **Welt = CSS-Pixel des Blatts**, Mitte des Fensters im Ursprung (wie in der Aufblas-Studie): Ändert sich die Fenstergröße nach dem
  Aufblasen, verschiebt sich die Zuordnung Blatt ↔ Welt (wie dort). Das Werk rechnet in eigenen Einheiten: Welt = Werk / f + Mitte
  (`werkHaut.f`, `werkHaut.mitte`).
- **Das Werk rechnet im Takt der Bilder und im Hintergrund.** Proben nie im Schnelldurchlauf (`vorspulen`), solange das Werk rechnet
  oder gleich danach gezogen wird: Ohne vergehende Zeit endete ein Zug einmal anders (zerrissene Haut). Ozzys Schleife läuft, solange
  das Werk beschäftigt ist (`werkBeschaeftigt`).
- **Erst zeigen, dann drücken:** Das Verhalten der Studie greift nur, was im Bild davor unter dem Zeiger hing (`haengt`). Proben fahren
  den Zeiger hin, warten rund 300 ms und drücken dann; ohne Warten zieht eingerastet ein Rahmen statt des Punkts.
- **`werkBlatt.bauen` läuft jedes Bild** (alle Linien auf allen Flächen); die Nummern der Anker gelten nur, solange sich der Aufbau
  nicht ändert (`struktur`). Wer Nummern über Bilder hinweg hält (Auswahl), gleicht über `auswahlAbgleichen` ab.
- **Die Nummern der Punkte im Werk folgen nicht der Zeichnung** (die Linie der Mitte beginnt, wo der Schnitt beginnt). Punkte über
  `seitenLinie().punkte` suchen.
- **`werkHaut.ts` ist die glatte Anzeige aus `kurven.ts` (`glattAnlegen`, `glattZeigen`).** Ändert die Kern-Sitzung sie dort, hier
  nachziehen.
- Die Fallen der Studien gelten weiter: `docs/look/anfang/UEBERGABE.md`, `docs/look/linien/UEBERGABE.md`; die des Kerns:
  `apps/editor/CLAUDE.md`.
