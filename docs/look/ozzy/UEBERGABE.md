# Übergabe: Ozzy (Stand 16.11.2026)

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

## Was noch fehlt (nächste Schritte, Plan Abschnitt 8)

1. **Phase 1, das Werk lösen** (der wichtigste Schritt): den Zustand und die Handgriffe der Form aus `kurven.ts` in
   `apps/editor/src/form/werk/` holen, verhaltensgleich, `kurven.html` als Hülle; Proben vorher und nachher gleich (Liste im Plan).
2. **Phase 3, die Kern-Form:** am Ende des Aufblasens steht die Form des Kerns (`rundAusSeite` und die Silhouette als Mittellinie);
   zuerst der kleine Beweis „ein einzelner Loop“ (Plan, Phase 3). Dann zeigen Wände, Felder und eingerastete Ansicht die Linien des
   Kerns, die Blase ist die glatte Anzeige des Kerns mit der Seifenhaut.
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
