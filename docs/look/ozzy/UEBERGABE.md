# Übergabe: Ozzy (Stand 17.11.2026, abends)

Ozzy ist der Editor für Florians Formen aus einem Guss (Florian, 16.11.: Name „Ozzy“, Designsystem „liquid drop“): Man zeichnet eine
Silhouette, bläst sie zu einer Form auf und bearbeitet sie an ihren Linien, im Raum, in den eingerasteten Ansichten und in den Vier
Ansichten. Gerechnet wird mit dem Kern von Sitzung 4, unverändert.

**Stand:** Stand 0, Phasen 1 bis 6 und die Schritte S1 bis S20 sind gebaut. Florian (17.11.): „Die offenen Abnahmen sind für mich fürs
erste ok.“ S21 (Kanten gleiten) wurde ganz wieder entfernt (missverstanden; er: „lassen wir es erstmal so. Es gefällt mir gut.“). Alle
24 Proben von Ozzy, die Typen, Lint und die Tests des Fensters halten (17.11. abends). Diese Übergabe ist neu geordnet; die gewachsene
Fassung mit allen Messwerten und Zwischenständen liegt im Archiv:
[`docs/verlauf/2026-11-17-ozzy-uebergabe-verlauf.md`](../../verlauf/2026-11-17-ozzy-uebergabe-verlauf.md).

## 1. Einstieg

| Was | Wo |
| --- | --- |
| Arbeitsbaum, Zweig | `.claude/worktrees/ozzy`, Zweig `claude/ozzy`. Nach jedem Commit pushen und den Hauptordner (`claude/editor-grundlayout`) per Fast-Forward nachziehen und pushen. `main` bleibt unberührt. |
| Server | Eintrag `ozzy` in `.claude/launch.json`, Port 5205, mit `--host` im WLAN erreichbar (iPad: `http://<Adresse des Macs im WLAN>:5205/ozzy.html`, mit der Adresse, nicht mit `….local`) |
| Seite | `http://localhost:5205/ozzy.html`; im selben Server das Prüffenster des Kerns `kurven.html?gewichte=geometrie` |
| Plan | [`docs/plans/2026-11-16-ozzy.md`](../../plans/2026-11-16-ozzy.md) (Auftrag wörtlich, Grundsätze, Phasen 0 bis 7), [`docs/plans/2026-11-16-ozzy-weiter.md`](../../plans/2026-11-16-ozzy-weiter.md) (S1 bis S21, jeder Schritt mit Befund, Vorschlag, Probe, Gebaut und Florians Worten) |
| Bilder, Filme | `docs/progress/ozzy/` (je Schritt vorher und nachher), seine Vorlagen in `docs/look/ozzy/` |
| Seine Testformen | `wesen/`: „teat firefish“, „strange bird“, „test_kaputt“, „maul handgemacht test“ (beliebige Tests, kein Maßstab fürs Tempo) |

**Florians Regeln für Ozzy** (gelten weiter):
- „Hauptsache am Rechenkern wird nicht verändert […] daran nichts ändern oder optimieren“ (das macht die Kern-Sitzung), und „keinen
  Unterschied zwischen meinen Kurven und dem Modell, wie es bei Sitzung 4 ist“. Ozzy benutzt die Rechnung, wie sie ist. Neue Handgriffe
  im Werk nur mit seiner Zustimmung (bisher `zugGriffRaum`, S6b).
- Die Reglerwerte bleiben die Grundwerte der Studien, bis er seine festlegt.
- Look zuerst beweisen (Vergleichsbild oder Film, gleiche Ansicht, vorher und nachher), dann bauen. Je Schritt eine vorher festgelegte
  Probe. Nie „bestanden“ ohne ihn. Keine Messreihen im Hintergrund, keine Agenten-Fächer ohne Rückfrage (Wochenlimit).
- Nie unter seinem Fenster bauen (`.claude/worktrees/form-alt`, Port 5194).
- S21 ruht: Gleiten der Wände oder Kanten nicht neu bauen und nicht wieder vorschlagen, bevor er beschrieben hat, was er meinte.

Wer hier weiterarbeitet, liest diese Übergabe, dann den Plan „weiter“ (seine Worte je Schritt) und `apps/editor/CLAUDE.md` (Fallen des
Kerns und des Werks).

## 2. Was Ozzy kann (Bedienung)

**Blatt:** „draw something“ in Lobster, darunter die Leiste mit Tropfen. P zeichnet Linien mit Punkten und Griffen (Werkzeug der
Linien-Studie), N Freihand (Florians Bleistift-Einstellung), e Ellipse, E Würfel (⇧ gleich, ⌥ aus der Mitte), V oder Esc Auswahl, ⌫,
⌘Z. Die größte geschlossene Linie ist die Silhouette; ↩ bläst sie auf (Ablauf der Aufblas-Studie), danach rechnet das Werk die Form
(Phase 3, „Weg A“: die Form ist, was der Kern aus der Linie macht).

**Raum:** in der Mitte die Seifenblase (Haut des Werks), an den drei abgewandten Wänden die Zeichnungen von Seite, Front und Top, die
Kanten der fernen Ecke. Ziehen ins Leere dreht überall (mit Schwung, rastet nahe einer der sechs Ansichten ein). 1 Seite, 3 Front, 7 Top,
0 Raum (tippen bleibt, halten schaut kurz hin), ⇧ + 1/3/7 von hinten. Eingerastet dreht ⇧ + Ziehen das Blatt; über die Hälfte kommt die
Rückseite hinter einer harten Kante (dunkel, Linien weiß), ⇧ + Doppelklick wendet zurück. Rad zoomt, Leertaste halten und ziehen schwenkt
(kurz getippt bläst sie noch einmal auf), Pos1 passt ein. Esc geht zurück (Vier → Raum → Blatt), ⌫ ohne Auswahl lässt die Luft ab.

**Vier Ansichten:** Tab faltet die Ecke als Kistennetz auf (Front oben links, Seite oben rechts, Top unter der Seite, Raum unten links).
Steht die Kamera nicht vorn rechts oben, dreht der Raum erst dorthin (S16). Jedes Feld zoomt, schwenkt und wendet für sich (S17). Zwei
Haarlinien mit einem Tropfen an der Kreuzung stellen die Felder ein; Doppelklick auf den Tropfen wie Tab. Den Tropfen an der Ecke einer
eingerasteten Ansicht ins Bild ziehen öffnet die Vier Ansichten (S18), ebenso der Punkt an der Ecke der Kiste im Raum (S19); den Tropfen
in eine Ecke ziehen rastet dort ein (Rückweg).

**Bearbeiten** (auf jeder Fläche: Wand, eingerastete Ansicht, Feld): Punkte, Linien und Richtungen ziehen; Doppelklick auf eine Richtung
schaltet Knick und rund; ⌥ knickt (beim Drücken und beim Drehen); ⇧ beim Drehen kippt die Richtung aus der Ebene; L Lasso (⇧ dazu, ⌥ weg);
K Kante; ⌫ löscht; ⌘A alle; ⌥ halten: Röntgen (Verdecktes greifbar, S14). P im Raum: eine Form auf der Fläche, eine Abzweigung von einer
Linie, oder zwei Klicks im Leeren quer über die Form mit ↩ ein Loop rundum (vorher zeigt der Lichtring, wo er läuft, S15). N, e, E im Raum
legen Freihand und Formen auf die Haut. Über der Blase zieht der Pinsel den nächsten Punkt einer Linie mit dem Einfluss O ([ und ]
Radius). Ein gewählter Ring bekommt den Tropfen „Maul“; mit Maul steht oben rechts „Fressen“ (Pose mit Kiefer und Kopf).

**Menü „Ozzy“** (oben links, ⌘,): Laden (`wesen/`), Sichern (⌘S; ein fremder Name erst beim zweiten Druck), „Linie an der Spiegelkante“
(Standard ohne), Feinregler (die Regler der Studien und von Ozzy in Gruppen, „Werte kopieren“, „Grundwerte“), Fassung der Seifenhaut (M).

**iPad** (S12, erster Schritt): Stift wie die Maus (schwebend Zeiger), ein Finger dreht, ab dem ersten Stift ändern Finger nichts an der
Form, zwei Finger zoomen, schwenken und drehen. Unten Knöpfe für die Tasten (nur mit Berührung).

**liquid drop** (S13, alle zehn Ideen): Menüs, „Maul“ und „Fressen“ wachsen als Tropfen, Regler als Tropfen am Faden, Lasso als Faden,
neue Kreuzungen verschmelzen, Kante wie Tusche, ⌘Z fließt zurück (nur die Linien), Meldungen tropfen und verdunsten, der Zeiger nimmt die
Form des Werkzeugs an, Ordnungslinien zwischen den Ansichten, der Ansichts-Tropfen unten rechts.

**Linienansichten wie die Studie** (S20): eingerastet und in den drei Feldern liegt die Haut des Werks als weißer Körper in der Anzeige;
der Umriss ist eine Hülle, die am Rand hervorschaut und verjüngt in die Form läuft; jede Linie wird je Bildpunkt gegen den Körper
geprüft (davor Tinte, dahinter fein und grün). Beim Aufklappen liegt der Körper auf den Wänden, beim Einrasten kommt er mit der Fahrt.

## 3. Wie es gebaut ist

```
Blatt (blatt.ts, Verhalten der Linien-Studie)
   │ ↩: Silhouette
   ▼
Werk (src/form/werk.ts, aus kurven.ts geschnitten; Rechnung des Kerns packages/shape, unverändert)
   │ Haken `anzeige`, geteilter Zustand `G`
   ├──► werkHaut.ts   glatte Haut des Werks (wie kurven.ts), Daten für die Seifenhaut (src/anfang/haut.ts)
   ├──► werkBlatt.ts  „Raum“ der Linien-Studie: je Bild alle Linien auf allen Flächen, Greifen, P, Verdecktes, Fluss, Tusche, Lichtring
   │       └─► Verhalten (src/linien/verhalten.ts) ─► kapseln.ts ─► flüssige Anzeige (src/linien/fluessig.ts)
   └──► main.ts       Ablauf, Raum, Kamera, Wände, Ansichten, Vier Ansichten, Eingaben, Menü, Haken
```

| Datei (`apps/editor/src/ozzy/`) | Zeilen | Inhalt |
| --- | --- | --- |
| `main.ts` | 5 643 | alles Übrige (Gliederung unten) |
| `werkBlatt.ts` | 1 618 | Linien des Werks auf allen Flächen als ein Netz der Studie; Züge als Handgriffe des Werks in Blattkoordinaten; `StiftWerk` für P; Verdecktes (Tiefenkarte je Achse, `Flaeche.tiefe`); ⌘Z-Fluss, Tusche, Lichtring |
| `werkHaut.ts` | 586 | glatte Anzeige der Haut (übernommen aus `kurven.ts`: `glattAnlegen`, `glattZeigen`), Umriss je Achse, Muster und Dehnung für die Seifenhaut |
| `blatt.ts` | 425 | Blatt: P, Freihand, Formen in einem Netz, Silhouette |
| `ansichtsTropfen.ts` | 297 | Ansichts-Tropfen (S13, Idee 10) |
| `leiste.ts` | 222 | Werkzeugleiste mit Tropfen |
| `regler.ts`, `reglerTropfen.ts` | 120, 88 | Feinregler, Regler als Tropfen |
| `kamera.ts` | 105 | Maßstab und Perspektive getrennt (parallel unter `P_MIN`) |
| `kapseln.ts` | 85 | Puffer der flüssigen Anzeige (12 Zahlen je Kapsel) |
| `adresse.ts` | 19 | Schalter des Werks in der Adresse; muss als erstes geladen werden |
| `ozzy.css`, `../../ozzy.html` | 742, 66 | Aussehen, Seite |

**Gliederung von `main.ts`:** Werte (51), Teile (95), Werk (345), Bearbeiten über das Werk (381), Raum (466), Größe (559), Netz der Blase
(575), Form im Werk (643), Ablauf (934), Kamera (1063), Vier Ansichten mit Kistennetz, Feldern und Ecke (1110), Bild (1933), Zeiger (2400),
Linien des Werks auf den Flächen (2929), Pinsel (3261), Eingaben (3406), Stift und Finger samt Tasten (3864), Leiste und Menü (4720), Maul
und Pose (4990), Test-Haken `window.__ozzy` (5171, 49 Einträge).

**Was Ozzy an den Studien und am Werk ergänzt hat** (Erweiterungen, die Studien laufen weiter):
- `src/linien/fluessig.ts`: Bereiche (jede Kapsel an ihrem Feld abgeschnitten, bis zu 8 Vierecke, `MAX_BEREICHE`; Art + 8 · Bereich), dunkle Fläche
  unter dem Körper, weicher Übergang Tinte → Grün (`band`, feine Breite in den Feldern 10 und 11), Körper durchsichtig, in mehreren
  Ansichten mit eigenem Rechteck und eigener Tiefe (`gl_FragDepth`), Hülle mit Tiefenabstand, Deckung; Umriss des Zeigers.
- `src/linien/verhalten.ts`: `Raum.bereich`, `Raum.roentgen`, `Raum.gleiche`, `netzErsetzen`, Lasso; `netz.ts`: `LinienProben.fein`.
- `src/anfang/haut.ts`: `blaseErsetzen` (fremdes Netz), `HautWerte.papier`, `dunkel`, `schnitt`.
- Werk: `neuAusUmriss` (Phase 3, aus bestehenden Handgriffen), `zugGriffRaum` (S6b, mit seiner Zustimmung); `ablage.ts` erlaubt Punkte
  ohne Spiegelbild (S11, „Ja, lockern“). Der Schnitt `kurven.ts` → `werk.ts` ist wiederholbar (`scripts/werk-schnitt/schnitt.mjs`).

**Schalter in der Adresse:** `?form=<Name>` lädt eine gesicherte Form; `?info=1` zeigt Takt, Finger und Zeiger; `?bild=1` ohne Bedienung;
`?film=1` ohne Bedienung mit Zeiger; `?fassung=<n>` Fassung der Seifenhaut; `?ohneLinie=0|1` Linie an der Spiegelkante für Proben (sonst
das Menü, im Browser gemerkt); `?koerper=0` ohne weißen Körper (Vergleich S20); `?fluss=0` ohne die Bewegungen der Anzeige aus S13;
`?uebergabeMuster=0` Muster an der Übergabe wie vor S2 (Vergleich). `gewichte=geometrie` und `behalten=0` setzt `adresse.ts` selbst.

## 4. Was gebaut wurde

| Schritt | Was | Commits | Probe, Film |
| --- | --- | --- | --- |
| Stand 0 | Blatt, Leiste mit Tropfen, P, Freihand, Formen, Aufblasen, Raum, Kamera, Vier Ansichten, Feinregler | `9eaa9e55` | Bilderbogen |
| Phase 1 | Werk aus `kurven.ts` gelöst (`werk.ts` + Hülle), verhaltensgleich | `5039cead` | neun Fenster-Proben vorher/nachher |
| Phase 3 | Form aus der Silhouette (`neuAusUmriss`, Weg A), Ozzy zeigt die Form des Werks, Übergabe Blase → Haut | `6031f4ea`, `4c791657`, `cbc69dd5` | `ozzy-silhouette`, `ozzy-werk` |
| Phase 5 | Laden; alle Linien auf allen Flächen mit der Bedienung der Studie; P; Maul und Pose; Freihand im Raum | `a627d3c8`, `1e22390e`, `0dacb5f3` | `ozzy-bearbeiten`, `ozzy-maul-pose` |
| Phase 6 | Pinsel „Ziehen“ über O (ohne Höhenlinien: „too much“) | `38c11b8a`, `6ce2d81e` | `ozzy-pinsel` |
| S1 | Messen (Haken `messen`, Messblatt) | `e7735389` | `ozzy-messen` (Messung) |
| S2 | Seifenhaut springt nicht (Netzwechsel, Übergabe beim Aufblasen) | `33b92a7b`, `e0648b55` | |
| S3 | Tempo, erster Teil (Blase ruht, kein Bild in der Ruhe) | `cd9a20a8` | |
| S4 | Drehen und Einrasten überall, Wenden mit harter Kante, Rückseite auch im Raum | `95528538` bis `7c0cbbf8` | `ozzy-ansichten`, `wenden-film` |
| S5 | Lasso | `4608e8b8` | `ozzy-lasso` |
| S6 | ⌥ beim Drehen, ⇧ kippt, Ring schwenkt | `f89955ce`, `660c2b29`, `c12ee4b6` | `ozzy-richtung` |
| S7 | Verdecktes grün | `26de280e` | `ozzy-verdeckt` |
| S8 | P statt L, gerade (gebogen: Kern-Sitzung) | `f7c50fa9` | `ozzy-p-schnitt` |
| S9 | ohne Linie an der Spiegelkante (Standard, Menü „mit“) | `5759cbcc`, `4b516ce9` | `ozzy-ohne-linie` |
| S10 | Felder wie die aufgeklappte Ecke, Auffalten als Kistennetz (Standard, abgeschlossen) | `2d2d88a3`, `b83deed4`, `abd0ac6d` | `ozzy-auffalten` |
| S11 | Sichern (abgeschlossen) | `8bccf479`, `09c9acc5` | `ozzy-sichern` |
| S12 | iPad, erster Schritt; Server im WLAN | `cdccd93f`, `3fbb1594` | `ozzy-ipad` |
| S13 | liquid drop, alle zehn Ideen | `870a2b26` bis `094e8bf0` | `ozzy-ansichts-tropfen`, Filme |
| S14 | Röntgen | `82cb55b8` | `ozzy-roentgen` |
| S15 | Lichtring | `5c12a6f4` | `ozzy-lichtring` |
| S16 | Aufklappen von hinten und von unten | `49b02c7d` | `ozzy-auffalten-hinten` |
| S17 | Zoomen, Schwenken, Wenden je Feld | `6357d173`, `a773f6a4` | `ozzy-feld-zoom`, `ozzy-feld-wenden` |
| S18, S19 | Tropfen an der Ecke der Einzelansicht, Punkt an der Ecke der Kiste, Rückweg | `dc0430fa` | `ozzy-ecke` |
| S20 | Linienansichten wie die Studie, nachgeschärft | `f4ce225b`, `68ebfc41` | `ozzy-linien-koerper` |
| S21 | Kanten gleiten: zwei Fassungen, ganz entfernt | `658bf44c`, `8c39da4c` → `32084f0a` | Filme `2026-11-17-raum-gleiten*.mp4` als Nachweis |

**Abnahme:** S10 und S11 sind abgeschlossen; alle übrigen offenen Abnahmen (S4 bis S9, S12 bis S20) sind nach seinem Wort vom 17.11.
„fürs erste ok“. S12 ist nur im Simulator und in Chromium geprüft, nicht am echten iPad.

## 5. Seine Entscheidungen, und was abgelehnt wurde

**Entschieden:** Name Ozzy, liquid drop; am Rechenkern nichts ändern; Weg A (die Form ist, was der Kern aus der Linie macht; die
„Formschicht“ ist vom Tisch); Wenden mit ⇧ + Ziehen und einer harten Kante wie in der Blaupause, die Rückseite auch im Raum; „ohne linie
als standard und ein schalter im menü für mit linie“; das Kistennetz („ja standard“); Punkte ohne Spiegelbild sichern („Ja, lockern“);
Server im WLAN; alle Ideen zu liquid drop („je mehr desto besser“); „Röntgen zuerst“; „Jedes Feld für sich“; Rückweg ja; Reglerwerte legt
er später fest; „Die offenen Abnahmen sind für mich fürs erste ok.“

**Abgelehnt oder wieder entfernt** (nicht wieder vorschlagen): Wenden als fließende Welle (erste Fassung); schwarze Wände im Raum statt
der harten Kante; die erste Fassung des Auffaltens („von der dynamik schlechter als vorher“); Höhenlinien über der Blase („too much“);
S21 Gleiten der Wände und Kanten (beide Fassungen; „Ich glaube da haben wir uns missverstanden“). Aus der Zeit davor: „Form halten“.

## 6. Prüfen

- Typen: `pnpm --filter @ee/shape typecheck`, `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`. Lint nur geänderte Dateien:
  `pnpm --filter @ee/editor exec eslint <dateien>`. Tests des Fensters aus `apps/editor`: `npx vitest run src/form/ src/linien/`.
- Proben aus `apps/editor`, Ozzy auf 5205: `GPU=1 node scripts/pruefen/ozzy-<name>-fenster.mjs`. Alle 24 nacheinander dauern rund acht
  Minuten (die längste, `ozzy-ansichten`, eine Minute). Im Vordergrund, nie zusammen mit vitest, währenddessen nichts unter `src` ändern.
- Stand 17.11. abends: alle 24 halten. Dabei korrigiert: `ozzy-pinsel` lud die Kugel ohne die Linie an der Spiegelkante (seit S9
  Standard; jetzt `?ohneLinie=0`); `ozzy-silhouette` meldete die bekannte Grenze des Kerns (an Einbuchtungen bis 2,0 über der Linie, seit
  Weg A) als Fehler und wacht jetzt darüber, dass es nicht mehr wird (höchstens 2,5).
- Keine Prüfung, sondern Werkzeug: `ozzy-messen.mjs` (Tempo und Ruhe, S1), `ozzy-bearbeiten-bilder.mjs` (Bilder).
- Filme in echter Geschwindigkeit, Bild für Bild gerechnet (`__ozzy.film(true)`, `__ozzy.bild(1/60)`): `scripts/ozzy/*-film.mjs`
  (Ansichten wenden, Lasso, Zurück, Zeiger, Meldung, Tusche, Kreuzung, Menü, Regler, Ordnungslinien, Vier, Vier von hinten, Ecke, Raum
  drehen). Bildvergleiche im Browser (`OffscreenCanvas`), `pngjs` ist nicht installiert.

## 7. Offen

**In Ozzy, klein:**
- Die Enden eines Rings lassen sich in Front und Top nicht löschen (in der Seite schon; die Studie lässt geteilte Punkte stehen).
- Ein Klick auf einen Punkt an einer Kreuzung wählt den Punkt der anderen Linie; dann erscheint der Tropfen „Maul“ nicht.
- ⌘Z: Die Linien fließen zurück, die Haut springt noch.
- ↩ an der Silhouette hält 110 bis 220 ms an (`neuAusUmriss`); besser schon rechnen, sobald die Silhouette geschlossen ist und ruht.
- Der Würfel bläst wie ein Kissen auf (Beweis „Quader“ offen).
- S16: Drehen und Aufklappen sind zwei Bewegungen mit einer kurzen Delle dazwischen.
- Die Wände im Raum zeichnen den Umriss noch wie vor S20 (Striche aus `umrissJetzt`, Verdecktes aus der Tiefenkarte), nicht mit dem
  weißen Körper.
- An fast streifend gesehenen Wänden ist Ziehen sehr empfindlich (so rechnet die Perspektive); genau arbeitet man eingerastet oder im Feld.
- Die Probe von Phase 4 an seinen drei Formen (Größe ±2 %, Umriss genau auf der Linie, kein Zoom im Zug, Einpassen mit Ruheband) ist nie
  als Ganzes gelaufen.
- Bewusst so gelassen (S21 ruht): Punkte einer Wand verschwinden beim Drehen auf einmal, wenn sie unter halbe Stärke fällt.

**Phase 7:** Tempo am Mac (120 Bilder je Sekunde: Median höchstens 6 ms, 95 % höchstens 8 ms) und auf dem iPhone 16 nie gemessen; seine
Reglerwerte als Grundwerte; S12 am echten Gerät (Druck und Schweben des Stifts gibt es im Simulator nicht).

**Kern-Sitzung** (Ozzy ändert daran nichts): 4c (Rest der halben Haut); Pose Etappe 4 und 5; umgeschlagene Dreiecke an der Mitte und an
dünnen Spitzen (Fischschwanz: 21 nach dem Setzen); Griff bei Abzweigungen; Punkte ohne Spiegelbild beim Verdichten (Plan des Kerns, A.4);
P gebogen (S8); Pinsel zwischen den Linien (Aufblasen, Absaugen, Glätten der Haut); an Einbuchtungen rundet die Haut bis 2,0 über die
Linie; im Zug die Runde des Werks (rund 6 ms); ohne vergehende Zeit kann ein Zug die Haut zerreißen. Plan:
[`docs/plans/2026-11-12-schnell-glatt-exakt.md`](../../plans/2026-11-12-schnell-glatt-exakt.md).

**Eigene Sitzungen, später:** Maul-System (er beschreibt zuerst die Fälle; daran hängt auch das Maul aus einer Linie, das in Ozzy nicht
angeschlossen ist), Auswahl wie in Blender (Schritt 7), Teile anfügen, Fell, Look des Spiels, Nacht, Backen fürs Spiel (höchstens 8 000
Dreiecke je Form).

## 8. Rückblick: was besser und eleganter ginge

Vorschläge, nach Nutzen geordnet. Nichts davon ist gebaut; alles nur nach seinem Wort, das Aussehen zuerst als Bild oder Film.

1. **Die Proben als eine Reihe** (klein). 24 Proben, jede mit eigenem Kopf (Browser, `ok`, Warten). Eine war seit S9 kaputt, ohne dass
   es jemand merkte; eine meldete eine bekannte Grenze als Fehler. Vorschlag: gemeinsame Teile in `ozzy-teile.mjs` (wie
   `form-pose-teile.mjs`) und `ozzy-alle.mjs`, das alle nacheinander im Vordergrund laufen lässt und je Probe eine Zeile meldet. Am Ende
   jedes Blocks einmal (rund acht Minuten).
2. **`main.ts` aufteilen** (mittel). 5 643 Zeilen, rund 330 Teile auf oberster Ebene, verbunden über gemeinsame Variablen; jede Sitzung
   muss sie lesen, das kostet Zeit und Wochenlimit. Vorschlag: mechanisch nach der Gliederung oben schneiden, mit einem Werkzeug wie beim
   Werk (nichts umschreiben): `raum.ts`, `vier.ts` (Kistennetz, Felder, Ecke), `linienAnzeige.ts` (Linien, Körper, Zeiger), `eingaben.ts`,
   `menue.ts`, `maulPose.ts`, `haken.ts` (nur unter Playwright oder mit `?haken=1` angehängt); der gemeinsame Zustand als ein Objekt wie `G`
   im Werk. Sicherheitsnetz: die Proben.
3. **Eine Abbildung je Fläche** (mittel). Wand, Feld, eingerastete Ansicht und Kistennetz rechnen „Welt → Bild und zurück“ an mehreren
   Stellen getrennt (`faltPunkt`/`aufWand`, `imFeld`/`ausFeld`, `feldAnsicht`, `wandAnsicht`, `einzelAbbildung`/`blickIn`, `teilerAus`).
   Zweimal lief das unbemerkt auseinander (der Zug am Tropfen der Kreuzung rechnete seit S10 an zwei Stellen mit der Länge statt der
   Tiefe; ein Haken las die falsche Wand). Vorschlag: ein Typ `Abbildung` (hin, zurück, Matrix für die Anzeige) je Fläche, den Linien,
   Körper, Greifen und Haarlinien gemeinsam benutzen. Kein neues Verhalten, nur weniger Stellen, an denen es auseinanderlaufen kann.
4. **Eine Art Bewegung für alle Fahrten** (mittel). Heute hat jede Bewegung ihren eigenen Zustand und ihre eigene Kurve (`ansichtFahrt`,
   `vierFahrt`, `vorDreh` mit `vierWartet`, `vierZuWartet`, `feldWendenZug`, `eckZug`, `einzelUebergang`, `schwenkZug`, dazu acht Stellen,
   die je Bild weich nachziehen). Darum fühlen sich Übergänge je nach Stelle etwas anders an, und Ketten wie „erst vor die Kiste drehen,
   dann aufklappen“ (S16) werden zwei Bewegungen mit einer Delle. Vorschlag: ein kleines `fahrt.ts` (von, nach, Dauer, Kurve, Einblenden
   in eine laufende Fahrt) und Fahrten, die sich verketten lassen; zuerst als Film an S16 („in einer gleichmäßigen Bewegung“).
5. **Ein Weg für Verdecktes** (Look). Heute zwei: die grobe Tiefenkarte je Achse (S7: Wände des Raums, Greifen) und der Körper mit Tiefe je
   Bildpunkt (S20: eingerastet, Felder). Vorschlag: den Körper auch auf die Wände des Raums legen (wie schon beim Aufklappen), die
   Tiefenkarte nur noch fürs Greifen. Dann sieht jede Ansicht aus wie die Studie, und der alte Umriss aus Strichen fällt ganz weg (in den
   flachen Ansichten sank die Rechenzeit damit von 5,8 auf 2,1 ms je Bild). Zuerst Vergleichsbild an seiner Form im Raum.
6. **Tempo messen, bevor neue Anzeige dazukommt** (Phase 7). Das Werkzeug gibt es (`__ozzy.messen`, `ozzy-messen.mjs`); gemessen wurde
   zuletzt am 16.11., vor S13 bis S20.
7. **`werkHaut.ts` nicht als Kopie pflegen.** Es ist die glatte Anzeige aus `kurven.ts`; ändert die Kern-Sitzung sie dort, läuft Ozzy
   auseinander. Wie beim Werk mit dem Schnitt erzeugen oder in ein gemeinsames Modul ziehen, abgestimmt mit der Kern-Sitzung.
8. **Puffer der Kapseln.** In „Art“ stecken drei Dinge (Schicht + 4 · Form + 8 · Bereich), für ein viertes ist kaum Platz. Merkmale als
   eigene ganze Zahl und die Belegung der 12 Zahlen an einer Stelle beschreiben (`kapseln.ts`).
9. **Schalter an einer Stelle.** Sie liegen in `adresse.ts`, `main.ts` und `werkBlatt.ts`; alle nach `adresse.ts` (die Liste steht oben).

**Was sich bewährt hat** und so bleiben sollte: der wiederholbare Schnitt des Werks (Ozzy rechnet nachweislich wie das Prüffenster); die
Studien über ihre Schnittstellen benutzt statt kopiert (`Raum`, `Koerper`, `HautWerte`); Proben, die Ozzy gegen das Prüffenster
vergleichen; je Schritt ein Film in echter Geschwindigkeit, Bild für Bild gerechnet.

## 9. Fallen

- **Vorschaufenster:** hochkant und schmal; für Florians Sicht auf 1440 × 900 stellen (`resize_window`), danach zurück.
- **Das Werk rechnet im Takt der Bilder und im Hintergrund.** Proben nie im Schnelldurchlauf, solange es rechnet; ohne vergehende Zeit
  endete ein Zug einmal anders. Proben warten auf `bearbeiten().beschaeftigt` falsch und auf `werk().griffWartet` falsch (nach dem Laden
  wartet ein Griff bis zu 4 s auf die Zerlegung).
- **Erst zeigen, dann drücken:** Das Verhalten greift nur, was im Bild davor unter dem Zeiger hing. Zeiger hin, rund 300 ms warten,
  drücken; sonst zieht eingerastet ein Rahmen. Jede Geste zuerst mit einzelnen Klicks prüfen.
- **`werkBlatt.bauen` läuft jedes Bild;** Nummern der Anker gelten nur, solange sich der Aufbau nicht ändert (`auswahlAbgleichen`). Die
  Nummern der Punkte im Werk folgen nicht der Zeichnung: Punkte über `seitenLinie().punkte` oder `werkLinienDaten` suchen.
- **Welt = CSS-Pixel des Blatts,** Mitte des Fensters im Ursprung; das Werk rechnet in eigenen Einheiten (Welt = Werk / f + Mitte,
  `werkHaut.f`, `werkHaut.mitte`).
- **Kamera:** Unter `P_MIN` wird sie parallel und steht weit hinten. Nach `stellen` nie `updateProjectionMatrix` von außen rufen, wenn
  die Vier Ansichten die Projektion schon verändert haben.
- **Rückseite:** `hintenRechnen` gibt je Bild die harte Kante als Fläche (gegen „vorn“: eingerastet die Vorderseite, im Raum die
  Hausansicht); beim Auf- und Zuklappen mit der Kamera des Aufklappens. Die Front schaut nach −x (`VORN`, seit `49df2266`).
- **Kistennetz:** Die Teiler stehen bei Tiefe / (Länge + Tiefe), nicht Länge / (Länge + Tiefe) (der Fehler stand seit S10 an zwei Stellen).
  Der Haken `flaecheHin` nimmt in den Vier Ansichten das Feld, nicht die Wand, die zum Blatt wird.
- **Verdecktes (S7, S20):** Die Schicht aus der Tiefenkarte bleibt am Punkt, auch wenn der Körper die Farbe je Bildpunkt entscheidet:
  Röntgen und Greifen brauchen sie (auf 0 gesetzt brach das Greifen hinter der Form).
- **Bereiche (S17):** höchstens 8 Vierecke (`MAX_BEREICHE` in `fluessig.ts`, je Viereck vier Halbebenen); ein Feld, das gewendet ist,
  bekommt seine dunkle Fläche unter dem Körper (sonst deckt das Dunkel den Körper zu).
- **Rad:** Ereignisse melden ganze Pixel; Proben rechnen mit gerundeten Orten.
- **Doppelklick auf einen Tropfen:** Der erste Klick darf keine Fahrt beginnen, die den zweiten sperrt (ein ungezogener Tropfen endet
  sofort).
- **Proben, die die Linie an der Spiegelkante brauchen,** laden mit `?ohneLinie=0` (sonst merkt sich der Browser die Wahl aus dem Menü).
- **Auf dem Blatt liest die Anzeige „innen“ als „Umriss“** (damit P-Linien 1 px breit sind). `Verhalten.netzErsetzen` legt den Stand
  davor auf den Stapel für ⌘Z.
- **Lasso:** Die Auswahl im Netz ist je Fläche; damit ein an einer Wand umfahrener Punkt gewählt bleibt, nimmt das Lasso alle Punkte
  desselben Werkpunkts mit (`Raum.gleiche`).
- **Wechsel zwischen zwei Ansichten:** `ansichtFahrt.senke` senkt `flach` unterwegs (ohne war mitten in der Drehung nichts zu sehen).
- Die Fallen der Studien: `docs/look/anfang/UEBERGABE.md`, `docs/look/linien/UEBERGABE.md`; die des Kerns und des Werks:
  `apps/editor/CLAUDE.md`.

## 10. Aufgeräumt am 17.11. abends

- Code: unbenutzte Variablen in `main.ts` entfernt (`const k = koerper!` in zwei Funktionen, `void`-Reste); kein Verhalten geändert.
- Proben: `ozzy-pinsel` und `ozzy-silhouette` korrigiert (siehe Abschnitt 6); die Probe zu S21 ist gelöscht; jede Probe und jedes
  Filmskript ruft nur Haken, die es gibt.
- Zwischendateien der Sitzung gelöscht; keine liegengebliebenen Bilder im Temp-Ordner, kein Browser im Hintergrund. Den Server der
  Linien-Studie (5199), den diese Sitzung am 16.11. gestartet hatte, beendet (Eintrag `linien-look` startet ihn wieder). Ozzy (5205) läuft
  weiter. Die übrigen Server (5194 sein Fenster, 5197, 5203, 5207 Maskottchen, 4173) gehören anderen Sitzungen.
- Der Arbeitsbaum ist sauber. Im Hauptordner liegt `assets/fonts/Hippie Movement.otf` ungesichert; sie stammt nicht aus dieser Sitzung.
- Diese Übergabe neu geordnet, die alte ins Archiv (`docs/verlauf/`).
