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

## Phase 3: Beweis „Form aus der Silhouette“ (16.11. nachmittags): hält nicht, Florian entscheidet

**Gebaut:** `neuAusUmriss(anker)` im Werk: Silhouette rund aufgeblasen (`rundAusSeite`, so dicht wie die Startform), die Silhouette ist
die Linie der Mitte (Anker = Punkte, Griffe = Griffe, Ecken, wo die Richtung wechselt), ein Schritt für ⌘Z. Prüfhaken
`__kurven.ablage.neuAusUmriss`, Probe `apps/editor/scripts/pruefen/ozzy-silhouette-fenster.mjs`. Ozzy ruft es noch nicht.

**Ergebnis** ([Messung](../../progress/ozzy/2026-11-16-silhouette-beweis.md), [Bild](../../progress/ozzy/2026-11-16-silhouette-ruck.png)):
Linie genau auf der Zeichnung, Anfassen ohne Zug bewegt nichts (0,000). Aber **der erste Zug springt**: Mit nur einer Linie setzt das
Werk die Haut nicht, der erste Zug rechnet sie aus der Linie neu, und die Rechnung hat ihre eigene Rundung (Fisch: Schwanz so dick
wie hoch, Sprung bis 17,5; Ellipse bis 18,5). Mit zwei kreuzenden Linien gleich nach dem Aufblasen liegt der Fisch danach noch bis 13
neben der aufgeblasenen Form, die Ellipse bis 1,7. Dazu ein kleiner Rest an spitzen Ecken im groben Rechennetz (Schwanzspitze 0,63
außerhalb, 4 umgeschlagene Dreiecke; bei 14 000 Dreiecken keine).

**Die zwei Wege** (Florians Entscheidung steht aus):
- **A, Form der Rechnung** (heutige Rechnung, etwa ein halber Block): `neuAusUmriss` setzt die Haut gleich nach dem Aufblasen aus der
  Linie, in Ozzy ist das der Schnalz am Ende des Aufblasens; danach springt nichts mehr. Front und Top macht die Rechnung (der Fisch
  bekommt einen dicken Schwanz), dünner wird er mit Linien in Top und Front.
- **B, Formschicht** (Rechnung erweitert, 2 bis 3 Blöcke, Beweis im Kern zuerst): Über der Haut aus den Linien liegt eine Schicht,
  je Punkt ein Abstand längs der Normalen, wie der Blendshape der Pose über der Grundform. Das Aufblasen legt sie an (die Form ist
  genau die aufgeblasene), eine neue Linie ändert die Form nicht (die Schicht wird neu bezogen), ein Zug an einer Linie rundet die Haut
  wie heute, die Schicht geht mit. Später schreibt der Pinsel an der Blase (Phase 6) in dieselbe Schicht. Formen ohne Schicht (alle
  bisherigen) rechnen genau wie heute. Nicht „Form halten“ (13.11. abgelehnt): Dort ging die fertige Haut starr mit, nichts rundete
  neu. Kriterien für den Beweis: nach dem Aufblasen genau die aufgeblasene Form, Anfassen und erster Zug abseits unter 0,2; eine
  neue Linie ändert die Form um weniger als 0,2; nach dem Loslassen kriecht nichts; an Florians Formen (ohne Schicht) dieselben
  Ergebnisse wie heute.

## Was noch fehlt (nächste Schritte, Plan Abschnitt 8)

1. ~~Phase 1, das Werk lösen~~: gebaut (oben). Kleiner Rest: `allesZeigen` tut in der Hülle Werk-Arbeit; für Ozzy eine
   Funktion `geaendert()` im Werk daraus machen.
2. **Phase 3, die Kern-Form:** zuerst Florians Wahl zwischen A und B (oben). Dann ruft Ozzy `neuAusUmriss` am Ende des Aufblasens
   (Silhouette in Welt-Einheiten des Werks: Größe wie die Startkugel, Halbmesser 150; Ozzy rechnet mit einem Faktor um), Wände,
   Felder und eingerastete Ansicht zeigen die Linien des Werks, die Blase ist die glatte Anzeige des Werks mit der Seifenhaut. Das
   Werk liest seine Schalter aus der Adresse (`location.search`): Ozzy braucht dieselben wie das Standardfenster
   (`gewichte=geometrie`).
3. **Phase 5, Bearbeiten über das Werk:** an Wänden, Feldern und eingerastet: Auswahl, Ziehen, Richtungen, P (Loop rundum statt L,
   Form, Abzweigung), Freihand, Kante, ⌫, ⌘Z; Maul und Pose.
4. Danach: Pinsel an der Blase (Phase 6, Beweis im Kern zuerst), eine Leinwand für Haut und Linien, Würfel als Quader, Finger.

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
