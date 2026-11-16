# Übergabe: Ozzy (Stand 16.11.2026, nachmittags)

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

## Florians Regel (16.11. nachmittags)

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

## Phase 3: Form aus der Silhouette (16.11. nachmittags): Weg A gebaut

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

## Was noch fehlt (nächste Schritte, Plan Abschnitt 8)

1. ~~Phase 1, das Werk lösen~~: gebaut (oben). Kleiner Rest: `allesZeigen` tut in der Hülle Werk-Arbeit; für Ozzy eine
   Funktion `geaendert()` im Werk daraus machen.
2. **Phase 3, die Kern-Form in Ozzy:** Ozzy ruft `neuAusUmriss` am Ende des Aufblasens
   (Silhouette in Welt-Einheiten des Werks: Größe wie die Startkugel, Halbmesser 150; Ozzy rechnet mit einem Faktor um), Wände,
   Felder und eingerastete Ansicht zeigen die Linien des Werks, die Blase ist die glatte Anzeige des Werks mit der Seifenhaut. Das
   Werk liest seine Schalter aus der Adresse (`location.search`): Ozzy braucht dieselben wie das Standardfenster
   (`gewichte=geometrie`).
3. **Phase 5, Bearbeiten über das Werk:** an Wänden, Feldern und eingerastet: Auswahl, Ziehen, Richtungen, P (Loop rundum statt L,
   Form, Abzweigung), Freihand, Kante, ⌫, ⌘Z; Maul und Pose.
4. Danach: Pinsel an der Blase (Phase 6: nur, was die Rechnung kann, also Ziehen wie O; Aufblasen, Absaugen, Glätten sind Arbeit
   der Kern-Sitzung), eine Leinwand für Haut und Linien, Würfel als Quader, Finger.

## Bedienung

Blatt: P, N (Freihand), e (Ellipse), E (Würfel), V oder Esc (Auswahl); ↩ schließt eine Linie mit P, auf einer geschlossenen
Silhouette bläst ↩ auf; ⌫ letzter Punkt oder Auswahl; ⌘Z. Raum: Ziehen ins Leere dreht (nahe einer Achse rastet es ein), an der
Blase ziehen, Punkte der Seite ziehen, 1 Seite, 3 Front, 7 Top, 0 Raum (tippen bleibt, halten schaut kurz hin), Tab Vier Ansichten,
Rad zoomt (Pos1 passt ein), Leertaste noch einmal aufblasen, Esc zurück (Vier → Raum → Blatt), ⌫ Luft ablassen, M Fassung.

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
  Aufblasen, verschiebt sich die Zuordnung Blatt ↔ Welt (wie dort). Mit dem Werk fällt das weg (die Form trägt ihre Welt).
- Die Fallen der Studien gelten weiter: `docs/look/anfang/UEBERGABE.md`, `docs/look/linien/UEBERGABE.md`; die des Kerns:
  `apps/editor/CLAUDE.md`.
