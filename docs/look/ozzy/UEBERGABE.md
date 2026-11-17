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

**5.4 Maul und Pose, Freihand im Raum (gebaut, 16.11. nachmittags):**
- **Tropfen „Maul“** (`maulUiZeigen` in `main.ts`): Ist ein Ring gewählt (offen, nicht hängend; wie `maulAnlegen` ihn nimmt), hängt unter
  seinem tiefsten sichtbaren Punkt ein Tropfen. An einer weichen Linie heißt er „Maul formen“ (`maulFormenGewaehlt`: das Werk formt in
  Schritten, Ozzy sperrt so lange die Eingaben über `eingabenSperren`), an einer harten „Maul“ (`maulAnlegen`: sie ist das Maul). Am
  einfachsten wählt man die Lippe mit einem Klick auf die Linie; ein Klick auf einen Punkt an einer Kreuzung wählt den Punkt der anderen
  Linie (der Anker nimmt den ersten Eintrag), dann bleibt der Tropfen weg.
- **„Fressen“ oben rechts** (sobald es ein Maul gibt): Knopf (`poseBetreten`/`poseVerlassen`) und Regler Maul 0 bis 55°, Kopf 0 bis 40°
  (`knochenSetzen`; ein Schritt für ⌘Z je Loslassen, wie im Prüffenster). In der Pose rechnet `werkHaut` in `werk.alsAnzeige` (die Haut,
  wie die Knochen sie drehen), `werkBlatt.bauen` ebenso; das Papier tönt sich leicht grün (`HautWerte.papier`, neu in `anfang/haut.ts`).
- **Meldungen des Werks** stehen fünf Sekunden in der Hinweiszeile (vorher sah man in Ozzy keine).
- **Freihand und Formen im Raum** (N, e, E oder die Leiste; Esc bricht ab oder geht zur Auswahl): Der Strich auf der Fläche unter dem
  Zeiger wird mit Florians Einstellung ein geschlossener Pfad (`strichBeginnen`/`strichPfad`, jetzt aus `blatt.ts` geteilt), Ellipse und
  Würfel ein Umriss (`aufzugPfad`); `werkBlatt.pfadAufHaut` legt ihn wie eine Form mit P auf die Haut. Ein offener Strich (im Prüffenster:
  das Maul aus einer Linie) ist in Ozzy noch nicht angeschlossen.
- **Probe** `apps/editor/scripts/pruefen/ozzy-maul-pose-fenster.mjs`: alle sechs Kriterien (Tropfen und Fressen; Haut der Pose wie im
  Prüffenster, Unterschied 0, Papier getönt; Zug in der Pose ein Schritt, ⌘Z genau; Fressen aus: Grundform genau, Papier weiß; Freihand
  an „test_kaputt“; keine Fehler). Bild [`2026-11-16-maul-pose.png`](../../progress/ozzy/2026-11-16-maul-pose.png).

**Phase 6, der Pinsel „Ziehen“ an der Blase (gebaut, 16.11. nachmittags):** Über der Haut des Werks (im Raum und im Feld des Raums der
Vier Ansichten; ⇧ dreht stattdessen) zeigt der Hauch der Seifenhaut den Pinsel und ein Tropfen den nächsten Punkt einer Linie im Radius
(`werkHautTreffen`: Strahl gegen die Haut des Werks, wie gezeigt; `pinselPunkt`). Drücken wählt diesen Punkt und zieht ihn mit dem
Einfluss O des Werks (`G.oAn`, `G.radius`, `zugStarten`; danach ist O wieder aus) im Blatt der Achse, die der Kamera am meisten zugewandt
ist, in der Ebene durch den Punkt. Liegt keine Linie im Pinsel, sagt es die Hinweiszeile, und das Ziehen dreht. Radius: 0,4 der größten
halben Ausdehnung der Form (`pinselNachForm`), [ und ] ändern ihn. Die Höhenlinien beim Ziehen (geplant) hat Florian gleich wieder
herausnehmen lassen („too much“, nur die Seifenhaut mit dem Regenbogen); `anfang/haut.ts` steht wie vor Phase 6. Probe `apps/editor/scripts/pruefen/ozzy-pinsel-fenster.mjs`
(gezeichnete Kugel und „teat firefish“, alle Kriterien; derselbe Zug im Prüffenster: dieselben Linien bis 0,00001). Bild
[`2026-11-16-pinsel.png`](../../progress/ozzy/2026-11-16-pinsel.png). **Grenze (so rechnet der Kern):** Zwischen den Linien wirkt der
Pinsel nur über den nächsten Punkt einer Linie; Aufblasen, Absaugen und Glätten der Haut selbst sind Arbeit der Kern-Sitzung. An der
gezeichneten Kugel (nur die Linie der Mitte) fasst er deshalb nur nahe am Umriss.

**Was dabei auffiel (offen):**
- Eine Wand, die man fast streifend sieht, ist sehr empfindlich: 25 px nach rechts an der Wand der Front verschoben „test_kaputt“ um 70
  Einheiten in z (so rechnet die Perspektive). Genau arbeitet man eingerastet oder in den Feldern.
- Wechselt eine Wand beim Drehen unter die halbe Stärke, verschwinden ihre Punkte auf einmal (die Linien werden weich dünner).
- In der Pose (5.4) zeichnet `werkBlatt` die Stücke als Bézier aus gedrehten Punkten; wo sich der Winkel längs eines Stücks ändert,
  braucht es die abgetasteten Stücke (`stueckeGezeigt`) wie im Prüffenster.
- ⌥ während des Drehens (nicht beim Drücken) knickt noch nicht; Kippen aus der Ebene (⇧) gibt es auf den flachen Flächen nicht.
- Der Ring eines Rings (offene Linie) teilt seine Enden auf der Mittelebene mit dem Spiegelbild: In Front und Top lassen sie sich mit ⌫
  nicht löschen (die Studie lässt geteilte Punkte stehen), in der Seite schon.

## Was noch fehlt (Stand 16.11. nachmittags; Florian: „wenn ich es mir ansehe fehlt noch einiges“)

**Stand nach dem neuen Plan (16.11. abends):** S1 gemessen, S2 und S3 zum Teil gebaut: Messblatt
[`2026-11-16-messen.md`](../../progress/ozzy/2026-11-16-messen.md) (Werkzeug `__ozzy.messen`, Probe `ozzy-messen.mjs`). Die Haut
springt beim Netzwechsel des Werks nicht mehr (Muster und Dehnung weitergereicht, `werkHaut.ts`), an der Übergabe beim Aufblasen nimmt
sie beides von der Blase; in der Ruhe läuft kein Bild mehr, Drehen und Vier Ansichten 2,5 bis 4 ms je Bild, der Nachklang nach einem
Handgriff 0,3 ms. Offen in S3: im Zug die Runde des Werks (rund 6 ms, Kern-Sitzung) und die glatte Anzeige (rund 5 ms).

**S4 gebaut (16.11. abends, bis `7c0cbbf8`):** Drehen in jeder Ansicht, Einrasten in alle sechs (mit den Gegenseiten), Schwung, Wenden
mit ⇧ in jede Richtung; die Rückseite hinter der harten Kante der Blaupause, eingerastet und im Raum (gegen seine Hausansicht); Front und
Rückseite der Front getauscht (Florians Idee, so schlägt beim Einrasten nichts mehr um); beim Einrasten schiebt sich ein Blatt durch die
Blase. Probe `ozzy-ansichten-fenster.mjs`, Film [`2026-11-16-wenden.mp4`](../../progress/ozzy/2026-11-16-wenden.mp4), Bilder
[`2026-11-16-kante.png`](../../progress/ozzy/2026-11-16-kante.png), [`2026-11-16-kante-raum.png`](../../progress/ozzy/2026-11-16-kante-raum.png);
sein Urteil steht aus.

**S5 gebaut (16.11. abends, `4608e8b8`):** Lasso (L, Knopf ganz links): Schlinge als Haarlinie, gewählt schon beim Ziehen, ⇧ dazu, ⌥ weg,
Tropfen in der Naht, zieht sich zur Auswahl zusammen; an einer Wand umfahren ist im Werk gewählt und überall markiert. Probe
`ozzy-lasso-fenster.mjs`, Film [`2026-11-16-lasso.mp4`](../../progress/ozzy/2026-11-16-lasso.mp4). 

**S6a und S6b gebaut (bis `660c2b29`):** ⌥ knickt auch während des Drehens einer Richtung; ⇧ kippt sie aus der Ebene (Länge und Richtung
in der Ebene bleiben; im Werk der neue Handgriff `zugGriffRaum`, mit Florians Zustimmung). Probe `ozzy-richtung-fenster.mjs`. **S6c** (`c12ee4b6`):
Beim Kippen schwenkt der Ring um die Linie des Griffs. Reglerwerte: vorerst die Grundwerte der Studie, Florian legt sie später fest.


**S7 gebaut (`26de280e`):** Verdecktes grün und fein auf allen Flächen (Tiefenkarte der Haut je Achse, `werkBlatt.karteFuer`, `hinten`,
`verdeckteProben`; `Flaeche.vorn` aus `ebene` und `feldFlaeche`); Probe `ozzy-verdeckt-fenster.mjs`. 

**S8 gebaut, gerade (`f7c50fa9`):** P, zwei Klicks im Leeren über die Form hinweg, ↩: ein Loop rundum wie L (`werk.loopSchneiden`). Gebogen
kann es der Kern nicht (nur ebene Schnitte): Punkt für die Kern-Sitzung, Ozzy meldet es. Probe `ozzy-p-schnitt-fenster.mjs`. 

**S9 zur Wahl (`5759cbcc`):** `?ohneLinie=1` startet ohne Linie an der Spiegelkante; die Haut steht, der erste Loop mit P lässt sie
stehen. Seit Florians Entscheidung ist „ohne“ der Standard; im Menü „Linie an der Spiegelkante“ (gemerkt im Browser); ohne Linie der Mitte zeigt die Seite den Umriss der Haut (`mitteDa`). 

**S10 (abgeschlossen):** Die Felder liegen wie die aufgeklappte Ecke (Front oben links, Seite oben rechts, Top unter der Seite, Raum unten
links). Tab faltet die Ecke auf (Florian: „ja standard“, kein Schalter mehr); die erste Fassung fand er wackelig („von der dynamik
schlechter als vorher“). Die Fassung als Kistennetz: `faltRechnen` (eigene Kamera `kamFalt`, Anfang `lageRaum`/`projRaum`; die Mitte der Wand der Seite gleitet gerade in ihr
Feld), `aufWand`/`faltPunkt` (Front und Boden klappen um ihre Kanten, die Zeichnung gleitet auf der Wand, `kF`/`uF`/`kT`/`uT` halten
ihre Mitte im Bild auf gerader Bahn), `faltKanten` (Ränder als Haarlinien, Teiler auf den Kanten). Probe `ozzy-auffalten-fenster.mjs`,
Filme `2026-11-16-vier-kistennetz*.mp4` (echt und dreifach langsamer; `ZEITLUPE=3` im Filmskript).

**S11 (abgeschlossen):** Sichern im Menü (Feld über „Laden“, Name vorbelegt, ↩, Esc), ein fremder Name, den es schon gibt, erst beim zweiten
Druck („Überschreiben“), ⌘S unter dem Namen der Form (`formSichern`, `sichernKurz`; dieselbe Ablage und dasselbe Format wie das
Prüffenster, am Werk nichts geändert). Probe `ozzy-sichern-fenster.mjs`, 1 bis 5 halten (neu geladen genau gleich). Gefunden: Nach
manchen Zügen hat ein Punkt der Haut keinen Spiegelpartner; die Prüfung der Ablage lehnte das beim Sichern und Laden ab, im Prüffenster
genauso. Florian: „Ja, lockern“ → `ablage.ts` erlaubt Punkte ohne Spiegelbild (−1). Die Ursache im Verdichten steht im Plan des Kerns
(A.4). Prüfhaken `standPruefen`.

**S12 (erster Schritt):** Stift = Zeiger (wie die Maus, schwebend Zeiger und Anschwellen); ein Finger dreht, ab dem ersten Stift ändern
Finger nichts an der Form; zwei Finger zoomen zu den Fingern hin, schwenken (neu: `nutzer.schwenkX/Y`, ein Versatz der Projektion in
`kameraSetzen`, vergeht in den Vier Ansichten, „Einpassen“/Pos1 setzt zurück) und drehen verdreht um die Hochachse (wie ein Teller).
Die Weiche hört in der Fangphase am Fenster zu (`finger`, `geste`, `stiftGesehen`), Safaris eigene Gesten sind abgeschaltet. Knöpfe für
die Tasten (`#tasten`, nur mit Berührung, lösen die Taste selbst aus). Probe `ozzy-ipad-fenster.mjs`; `?info=1` zeigt Finger und Zeiger.
Florian: „Ja, im WLAN“ → der Eintrag `ozzy` startet Vite mit `--host`; am iPad `http://<Adresse des Macs im WLAN>:5205/ozzy.html` (mit
der Adresse, nicht dem Namen `….local`: den lässt Vite nicht zu). Offen: sein Urteil am Gerät.

**S13 (liquid drop, begonnen 17.11.):** Reihenfolge im Plan. Idee 6 gebaut: ⌘Z fließt zurück (`werkBlatt.rueckfluss`/`fliessen`, nur
Anzeige, 0,22 s; `?fluss=0` aus); Film `scripts/ozzy/zurueck-film.mjs` mit Messung, Filme `2026-11-17-zurueck-*.mp4`. Die Haut springt
dabei noch (eigener Schritt, wenn er es will). Idee 8 gebaut: der Zeiger in Form des Werkzeugs (`zeigerArtJetzt`, `zeigerUmrissVon`,
`zeigerGestaltSchritt`; in `fluessig.ts` der Umriss `zeigerUmriss` mit `vieleck` im Shader, 64 Punkte); Film `scripts/ozzy/zeiger-film.mjs`.
Idee 7 gebaut: Meldungen tropfen und verdunsten (`hinweisSetzen`, CSS); Idee 5 gebaut: Kante wie Tusche (`tuscheMerken`,
`tuscheFliessen`, nur die Breiten der Anzeige); Filme `scripts/ozzy/meldung-film.mjs`, `tusche-film.mjs` (mit Messung). Nächste Ideen:
4 (Kreuzungen verschmelzen), 1 (Menüs als Tropfen), 2 (Regler als Tropfen), 9 (Ordnungslinien), 10 (Ansichts-Tropfen). Nebenbei: Der Schalter „Linie an der Spiegelkante“
stand im Raster der Regler zerdrückt (S9), jetzt in einer Zeile.

**Seine Rückmeldung danach und der Plan, wie es weitergeht (freigegeben, mit seinen Entscheidungen):**
[`docs/plans/2026-11-16-ozzy-weiter.md`](../../plans/2026-11-16-ozzy-weiter.md): Schritte S1 bis S13 (Messen, Seifenhaut gleitet, Tempo,
Drehen und Einrasten in jeder Ansicht mit Wenden, Lasso L, Richtungen und Animationen wie in der Studie, Verdecktes grün, P statt L,
Start ohne Linie, Auffalten der Ecke, Sichern, iPad mit Stift, liquid drop), Ideen und sechs Fragen. Die Liste unten bleibt als
Bestand.

Phasen 0 bis 6 sind gebaut (Phase 2 und 4 als Teil von Stand 0); im Plan bleibt nur **Phase 7** (Feinschliff, Tempo, iPhone). Offen ist
aber mehr, nach seinem Auftrag (Plan Abschnitt 3, A1 bis A18) geordnet. Was er beim Ansehen vermisst, entscheidet die Reihenfolge.

- **Arbeiten können:** **Sichern** im Menü fehlt (Vorsicht: `wesen/` sind Florians Formen, nie ohne Frage überschreiben); ⌘Z endet an der
  Grenze Blatt/Raum (im Raum nie hinter die aufgeblasene oder geladene Form).
- **Blase (A9):** nur „Ziehen“ über die Linien (O). Aufblasen, Absaugen und Glätten der Haut selbst brauchen eine Änderung der Rechnung:
  Kern-Sitzung. Die Gruppe der Pinsel in der Leiste (E3) kommt, wenn es mehr als einen gibt.
- **Aufblasen (A4, Phase 3):** ↩ hält 110 bis 220 ms an; das Muster der Seifenhaut springt bei der Übergabe leicht; der Würfel ist nur ein
  Rechteck (bläst wie ein Kissen auf; Beweis „Quader“ offen).
- **Ansichten (A8, A10 bis A12, A15, Phase 4):** die Probe von Phase 4 an seinen drei Formen (Größe bleibt ±2 %, Umriss genau auf der
  Linie, kein Zoom im Zug, Einpassen mit Ruheband) ist nie gelaufen; Front und Top zeigen im Umriss auch innere Kanten (Verdecktes);
  an fast streifend gesehenen Wänden ist Ziehen sehr empfindlich; Punkte einer Wand verschwinden beim Drehen auf einmal.
- **Bearbeiten (A7, A9, Phase 5):** in der Pose die Linien im Übergang Kiefer–Schädel als Bézier aus gedrehten Punkten (Prüffenster:
  abgetastet, `stueckeGezeigt`); das Maul aus einer Linie (offener Strich); ⌥ knickt nur beim Drücken; Enden eines Rings in Front und Top
  nicht löschbar; ein Klick auf einen Kreuzungspunkt wählt den Punkt der anderen Linie (der Tropfen „Maul“ kommt dann nicht).
- **liquid drop (A17, A18):** Tropfen „Maul“, „Fressen“, Laden-Liste und Hinweiszeile sind schlicht; Übergänge und Wechsel noch weicher
  (A15); die Linien innen (0,25 px) an den Wänden sind sehr fein.
- **Phase 7:** seine gewählten Werte als Grundwerte, Tempo am Mac (120 Bilder je Sekunde nie gemessen) und auf dem iPhone 16, Bedienung
  mit Fingern, Aufräumen.
- **Nicht in Ozzy (Plan Abschnitt 11):** Maul-System (eigene Sitzung), Auswahl wie in Blender (Schritt 7), Teile anfügen, Fell, Look des
  Spiels, Nacht, Backen fürs Spiel. **Kern-Sitzung:** 4c (Rest der halben Haut), Pose Etappe 4 und 5, umgeschlagene Dreiecke an der
  Mitte und an dünnen Spitzen, Griff bei Abzweigungen, Pinsel zwischen den Linien.

## Bedienung

Blatt: P, N (Freihand), e (Ellipse), E (Würfel), V oder Esc (Auswahl); ↩ schließt eine Linie mit P, auf einer geschlossenen
Silhouette bläst ↩ auf; ⌫ letzter Punkt oder Auswahl; ⌘Z. Raum: Ziehen ins Leere dreht, in jeder Ansicht, auch eingerastet (nahe einer der
sechs Ansichten rastet es ein, mit Schwung); ⇧ + Ziehen in einer eingerasteten Ansicht dreht das Blatt in jede Richtung (losgelassen
zurück oder, über die Hälfte, auf die Rückseite: dunkel), ⇧ + Doppelklick wendet zurück, ⇧ + 1/3/7 die Ansicht von hinten; L Lasso (Schlinge wählt, ⇧ dazu, ⌥ weg, V zurück); Punkte der
Seite ziehen (an der Wand, im Feld, eingerastet; das Werk rechnet), seit 5.2 alle Linien auf allen Flächen: Punkte, Linien und
Richtungen ziehen, Doppelklick auf eine Richtung Knick ↔ rund, ⌥ beim Drücken knickt, ins Leere eingerastet und in den Feldern ein
Rahmen, K Kante, ⌫ löscht die Auswahl (ohne Auswahl Luft ablassen), Esc leert die Auswahl, ⌘A alle; Menü „Ozzy“ → Laden; ⌘Z im Werk zurück, 1 Seite, 3 Front, 7 Top, 0 Raum (tippen
bleibt, halten schaut kurz hin), Tab Vier Ansichten, Rad zoomt (Pos1 passt ein), Leertaste noch einmal aufblasen, Esc zurück (Vier →
Raum → Blatt), ⌫ Luft ablassen, M Fassung. Prüfhaken `window.__ozzy` (u. a. `werk()`, `seitenLinie()`, `uebergabePruefen()`,
`werkGrenzen()`).

## Fallen

- **Vorschaufenster:** Es ist hochkant und schmal; für Florians Sicht auf 1440 × 900 stellen (`resize_window`), danach zurück.
- **Rückseite (S4):** `hintenRechnen` (main.ts) gibt je Bild die harte Kante der Blaupause als Fläche (`kanteMitHeim`, wie `sigmaWerte`
  in `/editor`), gegen „vorn“ (`heimJetzt`: eingerastet die Vorderseite der Ansicht, im Raum seine Hausansicht, bei Fahrten gedreht).
  Haut (`HautWerte.dunkel`, Grund in `kanteFarbe`, Spiegelung wie in der Nacht) und Linien (`Szene.dunkel`) zeichnen sie selbst (bis zu
  vier Flächen sind möglich); Marke und Hinweis über `body.wende-an`. Beim Einrasten wandert die Zeichnung der Wand zur Mitte
  (`blattAchsen`, `flaechenJetzt`), und `schnittRechnen` schiebt ein Blatt durch die Blase (`HautWerte.schnitt`). Die Front schaut seit
  `49df2266` nach −x (`VORN`, `ANSICHT_WINKEL`, `imFeld`/`ausFeld`). Fallen: Der Zeichner der Haut löscht vor jedem `render`
  (`autoClear`), für den Grund ist es dort kurz aus; `HautWerte.hinten` ist der Anteil der Rückseite der Blase, nicht die dunkle Fläche.
  Filme Bild für Bild: `__ozzy.film(true)`, `__ozzy.bild(1/60)` (`scripts/ozzy/wenden-film.mjs`); Haken `dunkelBei(x, y)`.
- **Ein Griff kann warten:** Nach dem Laden rechnet das Werk im Hintergrund noch die Zerlegung; so lange wartet ein Griff an einer Richtung
  (`werk.griffWartet()`, `G.gegriffen`, bis zu `GRIFF_WARTEN_MS` = 4 s) und holt dann nach. Proben warten auf `werk().griffWartet`
  falsch, bevor sie drehen. Ohne ⌥ rastet eine Richtung nahe ihrer Flucht ein: kleine Drehungen (20° auf 12 px) bleiben ohne Wirkung.
- **Lasso (S5):** in der Linien-Studie (`verhalten.ts`: `lassoDruecken`, `lasso`, `lassoAus`, `punkteImLasso` in `auswahl.ts`); Ozzy ruft
  es mit dem Werkzeug `lasso` vor allen anderen Griffen (auch vor dem Wenden mit ⇧). Die Auswahl im Netz ist je Fläche; damit ein an
  einer Wand umfahrener Punkt im Werk gewählt bleibt, nimmt das Lasso alle Punkte desselben Werkpunkts mit (`Raum.gleiche`, in
  `werkBlatt.ts`). Sonst nimmt der Abgleich (`auswahlAbgleichen`) ihn wieder weg, weil seine Bilder an den anderen Wänden außerhalb liegen.
- **Wechsel zwischen zwei Ansichten:** `ansichtFahrt.senke` senkt `flach` unterwegs (bis 0,7 bei 90°), `vonAnsicht` merkt die Ansicht,
  aus der die Fahrt kommt (ihre Wand wandert zurück). Ohne die Senke war mitten in der Drehung nichts zu sehen.
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
