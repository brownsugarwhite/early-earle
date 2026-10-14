# Ruhiges Netz und Maulschlitz an der schwarzen Linie (14.10.2026 nachmittags)

> Florian (14.10.): Die große Sitzung ist für diese Woche aufgebraucht und brach mitten in der Arbeit ab. Fahrplan für die Übernahme, von Florian freigegeben. Reihenfolge nach seiner Wahl: erst sichern, dann ruhiges Netz, dann Maulschlitz und getrennte Kiefer, danach weiter nach der Planseite [Phase 2](2026-10-15-phase-2-maul.md).
>
> Datumshinweis: Die Einträge „15.10.“ der vorigen Sitzung stammen laut Commits vom 13./14.10.; ab hier gilt das echte Datum.

## Florians Rückmeldungen (Grundlage)

1. Abgebrochene Sitzung: „Wenn ich Pinseltools nutze, geht es und die schwarze Linie folgt. Wenn ich dann aber die Handles an der Silhouette bewege, springt die Form und beides passt nicht überein. Beim Maul soll auch die schwarze Linie direkt an die zugehörige Lippe angrenzen. Gelbe Linie ist immer gleich der schwarzen Linie!“
2. Abgebrochene Sitzung: „Es wird gerade ganz schlecht zu bearbeiten. Es entstehen willkürlich Punkte und die Form springt.“
3. 14.10.: „Das Springen wurde gerade schon besser. Am schwierigsten und unvollständigsten waren noch die Arbeit an Über- und Unterbiss. Das hat noch nicht wie im Plan funktioniert und sah nicht besonders sauber aus.“
4. 14.10., mit zwei Bildern (Kugel, Seite): „Das Kernproblem ist, dass Ober- und Unterkieferlinie nicht an der schwarzen Linie angrenzen, wie es vorgegeben war. Sie sollen von der Seite direkt in die schwarze Profillinie übergehen und verbunden sein, wodurch von der Seite ein echter Maulschlitz entsteht. Im Moment sind sie mit der gelben Linie verbunden (Abbild des echten Meshs). Das echte Mesh reagiert viel zu sensibel und wirft sehr schnell Wellen und tiefe Falten. Da ich mit der schwarzen Linie den Shape bearbeite, kann ich so nicht arbeiten. Und es soll immer sauberer und geglätteter aussehen. Unterkiefer und Oberkiefer (wenn getrennt) sollen voneinander getrennt bearbeitbar sein und auch von vorne dann einen Spant für Ober- und einen für Unterkiefer haben, wenn der Spant von der Seite über beide liegt. Das muss viel besser gelöst sein und die Formen müssen viel besser zusammenspielen. Der gelbe Meshrand weicht oft viel zu weit von der schwarzen eigentlichen Kontur ab!“ In den Bildern: Kinnwand senkrecht am blauen Anfang (gelb), die schwarze Kinnlinie davor leer; ein roter Anfang vor dem Körper zieht einen Schnabel, die schwarze Linie bleibt stehen.
5. 14.10., zwei Bilder „extremer Wellen und Falten beim Verziehen“: (a) Kugel mit getrennten Kiefern, der Unterkiefer ein gefalteter Kasten (Front Δ 20,5 px, Top Δ 7,4 px); (b) Komma mit stark hochgezogenem Schwanz, Sägezahn in Front und Top (Δ 33,4 / 26,5 px), ein Grat aus Falten auf dem Rücken.

Daraus die Regel: **Die schwarze Linie ist Florians Werkzeug und damit die Wahrheit für den Umriss.** Das Netz liegt ruhig und geglättet auf ihr; Rot und Blau hängen an ihr.

## Abnahme

**Block 1, ruhiges Netz:** Komma ohne Sägezahn und Grat; Δ gelb ↔ schwarz ≤ 2–3 px in allen Blättern, wo die Zeichnungen sich nicht widersprechen (Widersprüche zeigt der Saum); Faltenmaß (größter Normalensprung der Haut außerhalb gezeichneter Kanten) unter einer auf dem Prüfstand festgelegten Schranke; Kugel, Rex, Tiger, Langhals nicht schlechter als heute; Ableitung nicht langsamer (≈ 90–140 ms).

**Block 2, Maul (Florians Sätze):**
1. „Rot und Blau gehen von der Seite direkt in die schwarze Linie über, ich sehe einen echten Maulschlitz.“ — Lippenanfänge sind Knoten der schwarzen Linie; Ziehen bewegt Knoten und Linie zusammen; keine neuen Knoten.
2. „Das Netz liegt ruhig auf meiner schwarzen Linie.“ — Δ ≤ 2 px auch am Maul (Kinn, Schnauze); keine Wand, kein Schnabel; ein Knoten 10 px gezogen ändert das Netz außerhalb seines Bands um < 0,5 px.
3. „Ober- und Unterkiefer bearbeite ich getrennt, von vorn mit je einem Spant.“ — ein Reifen über dem Maul hat in Front und Top zwei Kurven, je ziehbar; der Querschnitt jedes Kiefers kommt aus seinem Spant.
4. Lippenkanten rot/blau ≤ 1 px; offen 25–100 % 0 sichtbare Durchdringungen, geschlossen nur verdeckte Überlappung.

## Fahrplan

### Block 0: Sichern (erledigt 14.10. nachmittags)

Ungespeicherter Stand geprüft und in drei Commits gesichert (235662c führende Front örtlich, c296736 Kinnwand mit einem Bezugsring, 50c1dd4 Formen folgen am Gestenende ohne eingefügte Knoten + Typfehler der Maullinie, seit 61146ed war `pnpm typecheck` rot); Prüfskripte nach `apps/editor/scripts/pruefen/` gerettet (1264058); Doku.

### Block 1: Ruhiges Netz auf der schwarzen Linie

Spuren im Code (zu bestätigen, nicht geraten umbauen):
- `querschnitteFuer` (`packages/shape/src/kern/ableiten.ts`, um Zeile 910): harter Schalter liegend/stehend je Ring (`liegendAb`) und ein gemeinsamer Lappen-Querschnitt je Gruppe — an einem Schwanz, der sich aufrichtet, springen Nachbarringe zwischen Lappen und Kreis bzw. zwischen verschiedenen Lappen.
- `masstab` in `zieleBerechnen` (um Zeile 981): Breite = Top bei der Sprossenmitte, beschnitten durch die Front auf der Höhe des breitesten Punkts — in aufgerichteten Abschnitten liegen viele Ringe über demselben x, das Top zeigt Körper und Schwanz übereinander.
- Ringe senkrecht zur Wirbelsäule überlappen an engen Biegungen auf der Innenseite.
- Naht- und Breitenpunkte (Gewicht 16) interpolieren widersprüchliche Ziele exakt → Kontrollpunkte schwingen.

Schritte: (1) Prüfstand-Fälle (Florians Komma nachgebaut, Langhals mit gebogenem Hals, Kugel mit getrennten Kiefern; Wächter Kugel/Rex/Tiger/Langhals) mit Δ, Faltenmaß, Sägezahnmaß, Lokalität; (2) Diagnose je Ring (Querschnitt-Art, Breitenziel, Grenzlage); (3) Umbau in kleinen, einzeln gemessenen Schritten (Querschnitt stufenlos nach der Neigung, Lappen je Ring; Breitenziele längs glätten, aufgerichtet die Front statt des Tops; Ringebenen an Biegungen fächern; Glattheitsanteil im Ausgleich); (4) Bilder an Florian, sein Test.

### Block 2: Maulschlitz an der schwarzen Linie, getrennte Kiefer sauber

Schritte: (1) Prüfstand um die Maul-Fälle erweitern (Kugel-Überbiss wie Florians Bild, Kugel mit vorgezogenem roten Anfang, Kugel-Unterbiss, Rex nach `docs/look/editor/06-rex-mit-maul.png` zu/offen, Tiger-Platte als Wächter; Kantenpx, Durchdringungen nach Bereich verdeckt/sichtbar); (2) Diagnose nach der Code-Karte unten; (3) Datenmodell und Editor: Lippenanfänge als markierte Knoten des Seitenprofils mit fester Kennung („gleich“ ein Knoten, „getrennt“ zwei, dazwischen der Schlitz als Lücke; Zeichnen ab der schwarzen Linie fügt formtreu ein; Ziehen bewegt Knoten samt Lippenlinie; Formen folgen lässt markierte Knoten stehen; Schema, Rundreise, Migration); (4) Kern: jeder Kiefer aus seiner eigenen Linie (schwarze Linie bis zum roten bzw. ab dem blauen Anfang, eigene Kante, eigener Spant), kürzerer Kiefer vorn rund auf seiner schwarzen Linie statt Wand, längerer ohne Schnabel, markierte Knoten ohne Ecke und Ringstation, Lippe rund statt Brett; (5) Look-Beweis an Florian vor der Politur; (6) Kiefer-Spanten (Reifen über dem Maul teilt sich, Front/Top zeigen beide Kurven, Bühne zwei Perlenreihen); (7) Abnahme und Doku.

**Abbruchregel (Block 1 und 2):** Erfüllt der Kern nach drei gemessenen Anläufen die Abnahme auf dem Prüfstand nicht, wird angehalten und Florian bekommt Befund und Wege (auch: für die große Sitzung aufheben).

### Block 3: weiter nach Plan

Phase 2: M3 großer runder Haps → Zähne → Augen → Maularten; Phase-1-Reste (Versuche aufräumen, E2E-Fixture, Tafel 280, Bibliothek-Schublade), wo sie nicht mit dem Maul kollidieren. „Formen folgen“ nach Kurvenzügen und „Käfig als Wahrheit“ entscheidet Florian.

## Code-Karte: getrennte Kiefer heute (Stand 50c1dd4)

Pipeline: `bauplanAus` (Editor, `kernBau.ts`) → `maulLinieAusPunkten` / `maulLinieUntenAusPunkten` (`maul.ts`) → `wesenBauen` → `ableitenMitMaul` (Stationen mit `kappeMin`, `faltenSetzen`, `maulLage`, `zieleBerechnen`, `maulKaefig`, `fertigstellen` mit Lippen-Gewicht 16 und Laplace 0,15, Breitenpunkte aus; dann `versatzKetteLoesen` für beide Ketten, `taschenNachloesen`) → `maulPose` → `maulAbweichung`.

- **Getrennte Kiefer fügen keine Topologie hinzu.** Die versetzte Kette sind die unteren Lippenkopien (Überbiss) bzw. der Pfad (Unterbiss); die Haut des kürzeren Kiefers sind die Ringzeilen jenseits der Lippe von Ring 0 bis zum Winkelring plus Kappenzeilen auf seiner Seite.
- **Wand (Ursache 1):** Jeder Ring vor dem Bezugsring und alle Kappenzeilen werden genau auf die Ebene x = eigener Anfang gelegt, als skalierte Kopien eines Ringumrisses (`maulKaefig`, Block um `geschnitten`/`refRing`/`setzeRegion`). Die Ebene steht senkrecht zur Welt-x, nicht zum Ring; die Nahtpunkte der Wand werden im Ausgleich zur einen schwarzen Linie gezogen, die keine Wand hat.
- **Kniffe vorn (Ursache 2):** Die vorderen Spalten der versetzten Kette liegen gedrängt auf einem kurzen Bogen; mit unendlicher Faltenschärfe und exakter Lösung (`KETTE_GLATT` 0) schwingen die Kontrollpunkte; die Flächen zur geschrumpften Wand scheren; `anteilZ` wird an Spalte t gemessen, aber auf Ring t − c/2 angewendet.
- **Brett mit 90°-Ecken (Ursache 3):** Lippenketten mit Schärfe 1e6, der erste Hautstreifen läuft gerade zur Kante, Taschenreihe 1 auf festem Anteil, keine Lippendicke, Rille aus; dazu schaltet der Shader im Lippenbereich auf Facettennormalen (Stil `kanten` = 1) — ein Teil des Brett-Eindrucks ist Schattierung (Gegenprobe mit `?look=matcap&kaefig=1`).
- **Stufen in der Tasche (Ursache 4):** nur drei Reihen auf geraden Linien zur Rachenlinie, gemeinsames Rachenziel der vorderen Spalten, Klemmung an der nächsten Station springt, exakte Nachlösung wellt.
- **Eingaben je Kiefer:** Eine Seitenlinie für beide Kiefer (nie an den Lippenanfängen geteilt), ein Querschnitt je Ring über beide Kiefer, keine Kiefer-Spanten. Der Maulspalt im Umriss (`profilAnZug` mit `spalt`) ist vorbereitet, aber aus.
- **Testlücken:** Kein Test prüft Wandform, Faltenqualität, Lippenband, Unterbiss-Paare oder `maulAbweichung`; keiner nutzt Schlitz- und versetzte 3D-Linie zusammen.

## Stand

- 14.10. nachmittags: Block 0 erledigt (siehe oben). Nächster Schritt: Block 1, Prüfstand.
- **14.10. abends: Block 1 gebaut, Florians Urteil steht aus.** Prüfstand `packages/shape/src/kern/pruefstand.ts` (+ Test; Editor-Skripte `komma-editor.mjs`, `komma-pinsel.mjs`). Befunde und Behebungen, je gemessen:
  1. **Ursache der Wellen nach Pinsel + Verziehen** (5599ebf): „Formen folgen“ ohne eingefügte Knoten passte Front/Top schlecht an — am letzten Achsknoten zeigte die Endtangente nach außen, der Fit fiel auf Drittel-Griffe zurück, die Achsregel kappte den Griff auf 0. Front/Top bis 30 px neben der Silhouette, nachgeführte Deltas bis 0,09; danach verzogen (Komma) Front Δ 31 / Top Δ 28 px (bei Florian 33/26). Jetzt Folgen 1,3 / 2,3 px, Deltas ≤ 0,02, Komma danach 12 / 4,6 px. Die eingefügten Knoten vorher („willkürliche Punkte“) hatten genau diesen Fehler überdeckt.
  2. **Führende Front faltet** (057ab4d): Während Front-/Top-Gesten ließ sie einzelne Schwanzringe bis zur Frontbreite wachsen und drückte den Querschnitt flach (bis 34°, beidseits im Schwanz); `fuehrend` fehlte im Cache-Schlüssel, der Bau blieb nach dem Loslassen stehen. Editor nutzt keine Führung mehr (Sichthülle wie vor der abgebrochenen Sitzung), Schlüssel ergänzt.
  3. **Seite über Top/Front hinaus** (fe5eb1b): Ringe außerhalb des Tops bekamen die größte Top-Breite (Kasten, Front Δ 135 px), und die Lappen-Vorlage der Gruppe streckte die oberste Stützstelle zur Naht (Grat, 1087 Kanten > 20°). Jetzt rund (halbe Sprosse) und Vorlage über den sichtbaren Teil der Front: 138 Kanten, Rest = Sprung an der Oberkante der Front (Widerspruch).
  - **Zahlen:** Komma im Editor mit Pinselstrich und allen Zügen glatt, Δ 2,9 / 13,3 / 4,5 px (Bild `docs/progress/editor/ruhiges-netz-komma-pinsel.png`); Front 13 px ist Florians Widerspruch (Front oben breit, Top-Schwanz schmal), der Saum zeigt ihn. Starke Einzelzüge an der Kugel (neun Fälle, Ausdehnung gekoppelt): Falten 9–18°, kein Sägezahn; Ausnahme „hinterer Knoten tief“ (Umriss taucht unter den Boden) 31°. Wächter Kugel/Rex/Tiger/Langhals unverändert, Ableitung 35–45 ms (Stufe 2).
  - **Offen:** Nach einem Pinselstrich bleibt ohne eingefügte Knoten ein Rest bis ≈ 5 px (Top mit drei Knoten); Widersprüche zwischen den Blättern löst erst „Formen folgen nach Kurvenzügen“; eine glatte führende Front (Streckung je Höhe statt Ring-Wachstum) wäre der Weg, die Front beim Ziehen führen zu lassen.
- **14.10. abends: Block 2 begonnen, Zwischenstand (Abbruchregel greift, Florian entscheidet den Weiterweg).**
  1. **Datenmodell und Editor** (465ddc1): Profil-Knoten tragen eine Marke (`maul`, `maulOben`, `maulUnten`; zod, nicht löschbar), Hilfen in `packages/shape/src/maulKnoten.ts` (formtreu einfügen, trennen auf die Kinnseite, vereinen, bewegen; `maulMitMarken`, `maulAnMarken`). Editor, Bauweise Kern: Zeichnen setzt den Anfang als Knoten der schwarzen Linie, Ziehen am Linienanfang bewegt Knoten samt Kurve (kein neuer Knoten), Zug am schwarzen Knoten nimmt die Linie mit, gleich/getrennt teilt und vereint, Maul löschen nimmt die Marken heraus, der Seitenumriss zeigt den Schlitz als Lücke. Übersetzung gezeichneter Mäuler als Kern-Funktion `maulLinieAusDokument`.
  2. **Kern** (3884b01): Ableitung mit dem Schlitz als Sehne, Naht am offenen Umriss ohne Schlitz (endet an den Knoten), Lippenknoten keine Ringfalten, kürzerer Kiefer vor dem Bezugsring als Coons-Fläche aus Lippenkante, eigenem schwarzem Bogen, Bezugsring und Anfang statt der Wand. Ohne Lippenknoten unverändert.
  3. **Gemessen** (Kugel nach Florians Bildern, offen 25–100 %): Schnabel 2510 → 178–238 Paare, Front Δ 140 → 14 px (Top folgt nicht, weil der Lippenanfang beim Ziehen Front/Top nicht mitkoppelt); Überbiss ≈ 530 Paare, davon 422 lippeU/lippeU — die vorderen fünf Spalten der versetzten Kette liegen auf 0,005 zusammengedrängt; Unterbiss ≈ 1800 (schlechter als frei). Bilder `docs/progress/editor/maulschlitz-zwischenstand-*.png`: die schwarze Linie geht in Rot und Blau über, der Körper folgt ihr; unter der Oberlippe bleibt eine Stufe, die Lippe ist ein flaches Band.
  4. **Nächste Ansatzpunkte:** vordere Spalten der versetzten Kette über eine Mindestlänge verteilen; Lippe als runde Kante (weiche Falte, Schattierung ohne Facettennormalen im Lippenbereich); Unterbiss-Pfad; Lippenanfang beim Ziehen mit Front/Top koppeln; Kiefer-Spanten.
- **14.10. spätabends (Florian: „Gezielt weiter“ + zwei Rückmeldungen):** (a) „Das Maul läuft nach dem Einzeichnen spitz nach vorne; es soll sich genau in dem eingezeichneten Shape, aber auf die Außenhaut legen und somit genau dessen Rundung haben … Artefakte und Falten vor allem an den Kieferspitzen.“ (b) „Beim Glätten sieht es gut aus, beim Loslassen springt das Mesh.“
  - (b) behoben (ec9c27b): nachgestellt — ohne Maul 0,00 px, mit Maul 7,5 px (gleich) bzw. 59 px (Überbiss) Sprung durch „Formen folgen“ (neu angepasste Profile bauen das Maul neu, Maulpunkte ohne Ausgleichs-Deltas). Mit Maul läuft nach Pinselstrichen kein Folgen mehr; exaktes Folgen fürs Maul (Deltas auch für Maulpunkte) ist offen.
  - (a) gebaut (8d6d993): Lippenbreite = Haut am Seitenpunkt × Verhältnis „gezeichnete Tiefe / Haut“ an den Knoten (statt der Bézier-Tiefe, die vorn eine Sehne schnitt und die Front zum V machte); wirksame Linien im Kern (`wirk`), Messung und Anzeige in Front/Top gegen sie. Kiefer gleich: Front Δ 8,9 → 4,2, Top 12,3 → 4,8 px, rot 0,3–0,6 px, von oben rund. Überbiss mit Lippenknoten: offen ≈ 530 → 94–140 Paare, Stufe unter der Oberlippe weg. Bilder `docs/progress/editor/maul-auf-haut-*.png`.
  - Offen: Unterbiss (≈ 1640 Paare), Schnabel (Front/Top koppeln beim Ziehen des Lippenanfangs), Kringel am Lippenanfang, Lippe als flaches Band, Kiefer-Spanten.
  - **Lippenanfang koppelt** (c027839): Ziehen am Lippenanfang ist ein gekoppelter Zug am Seitenumriss (Front/Top folgen am entsprechenden Punkt). Im Editor mit der Maus geprüft: Knoten und Linienanfang wandern gemeinsam, keine neuen Knoten, Top-Spitze koppelt (Bild `docs/progress/editor/maul-anfang-gezogen.png`). Damit gilt Florians Satz 1 für den roten Anfang; der blaue folgt derselben Bahn (getrennt).
  - **Fragen an Florian:** (1) Ein Unterbiss-Beispiel mit seinem Umriss — der Prüffall aus zwei verschobenen Knoten ist unrealistisch (der vordere Umrissknoten des Oberkiefers bleibt vorn, die Kontur läuft sich in die Quere). (2) Lippenband: Das Material nimmt im Lippenbereich Facettennormalen (`earleCreature.ts`, `kanten`) — scharfe Kante gewollt (Look-Vertrag „Maulkanten pixelscharf“) oder weich gerundet?
- **14.10. nachts: Florians Rückmeldung mit zwei Bildern** (`docs/progress/editor/florian-2026-10-14-unterbiss-top.webp`, `florian-2026-10-14-unterbiss-riss.webp`):
  > „Ich sehe schon eine deutliche Verbesserung. Der kleinere Kiefer lässt sich aber von oben nicht mit den Bézier-Handles runder ziehen, wodurch der kleinere Kiefer immer kastig abgeflacht ist an der Spitze. Ich muss die Kurven auch von oben und von vorne genau bearbeiten können, und der Kiefer passt sich dann auch der runden Form an. Der schwarze Shape sollte sich auch in der Front, bei viel breiterem Kiefer als der andere (siehe Screenshot 2), an die Kieferlinie heften. Ober- und Unterkiefer müssen komplett getrennt voneinander steuerbar sein und nicht zusammenhängen. Das muss mit der schwarzen Linie und dem gelben echten Meshshape besser harmonieren. Das gelbe Shape macht das schon richtig, aber es hat bei einem Versuch viel zu viele neue Punkte erzeugt. Das schwarze Shape muss dem gelben immer viel ähnlicher sein, nur etwas mehr geglättet, und dazu die vorhandenen Punkte benutzen. Nur wenn unbedingt nötig ein neuer Punkt im schwarzen Outlineshape. […] Zusätzlich mit den Spanten, die je Kiefer wirken sollen, wenn er seitlich über zwei Kiefern liegt, sollte ich die Maulform besser kontrollieren können. Es soll alles deutlich glatter und smoother wirken und zusammenspielen. […] In der Frontansicht wäre der Unterkiefer-Shape immer an der äußersten Linie der blauen Unterkieferlinie verbunden, außer der Kiefer ist schmaler als der Grundshape. Dann wird die Linie zur Grundshape-Linie von vorne.“

  Seine Bilder zeigen einen Unterbiss an der Kugel: Blau beginnt vorn, Rot dahinter auf der Kontur.
  - Bild 1 (Top): Der rote Kiefer ist vorn flach wie ein Kasten, der rote Griff wirkt nicht.
  - Bild 2 (Riss): Seite Δ 48 px, Front Δ 21 px (rot 63,9 px), Top Δ 28,8 px. Der blaue Unterkiefer ist in Front und Top viel breiter als die Kugel, die schwarze Front hängt nicht an ihm, und die Lippe steht als Krempe ab.

  **Befund im Code:**
  1. Seit 8d6d993 kommt die Breite der Kante aus „Haut × Verhältnis an den Knoten“. Deshalb wirken die Griffe nicht, und der Editor zeichnet in Front und Top die wirksame statt der gezeichneten Linie. Hinter einer senkrechten Oberkieferwand ist die Haut sofort voll breit, daher der Kasten.
  2. Beim längeren Kiefer gehen nur die Lippe und zwei Nachbarzeilen mit (Faktoren 0,5 und 0,2). Der Rest des Rings bleibt bei der Vorlage, das ergibt die Krempe.
  3. Mit Maul folgt die schwarze Linie nicht (ec9c27b schaltet „Formen folgen“ dann ab).

  **Weg (Antwort an Florian, kein Denkfehler):**
  1. Rot und Blau gelten in jeder Ansicht genau, mit ihren Griffen. Neue Linien bekommen beim Zeichnen Griffe auf der Haut und einen runden Anfang (keine Spitze). Für alte Linien gibt es „an die Haut legen“.
  2. Jeder Kiefer passt sich als Ganzes seiner Linie an: Die Ringhälfte je Kiefer läuft weich zur Naht aus. Ober- und Unterkiefer sind getrennt.
  3. Die schwarze Linie heftet sich an: Ist ein Kiefer breiter, läuft sie in Front und Top durch die äußerste Stelle seiner Linie, sonst bleibt sie die Grundlinie. Allgemein ist Schwarz ≈ geglättetes Gelb mit den vorhandenen Punkten, ein neuer Punkt nur am Kieferansatz.
  4. Kiefer-Spanten.

  Prüffall ist Florians Bild 2 als Unterbiss an der Kugel.
  - **Gebaut (14.10. nachts), Schritte 1 und 2 und ein Teil von 3:**
    1. **Rot und Blau gelten genau** (cf51792): Die Lippenkante nimmt ihre Breite wieder aus der gezeichneten 3D-Linie samt Griffen. Die Regel „Haut × Verhältnis“ und die wirksamen Linien sind weg, der Editor zeichnet in Front/Top wieder die Kurve. Neue Linien (in der Seite gezeichnet) legt `lippeAnHaut` auf die Haut (kleinste Quadrate auch zwischen den Knoten) und gibt dem Anfang einen Griff quer zur Spiegelebene. Im Editor geprüft: Anfangsgriff rein in z, Δ 1,9 / 3,6 / 4,1 px; ein Zug am Anfangsgriff im Top macht die Kante spitz, wie gezogen (`docs/progress/editor/maul-neu-gezeichnet-rund.png`, Skript `maul-zeichnen-rund.mjs`).
    2. **Jeder Kiefer folgt als Ganzes seiner Linie** (cf51792): Die Ringhälften und die Kappe des Kiefers werden um „Linie / Vorlage an der Lippe“ gestreckt. Schmaler gibt einen gestreckten Querschnitt (von oben rund wie die Linie). Breiter wird weich begrenzt durch Lippe und Vorlage, sonst wuchs eine an der Sehne gekappte Vorlage über den Körper (Überbiss Top 45 px). Ein Auslauf zur Naht ließ den Schädel über einer runden Lippe kastig, darum kein Auslauf. Die Seite misst den Schlitz wie gezeichnet (schwarze Linie ohne Schlitz + Rot + Blau, das Fenster zählt nicht).
    3. **Schwarz heftet sich an** (71e091d): Wo ein verbreiterter Kiefer in Front oder Top über die schwarze Linie hinausgeht, wird sein Umriss zum Umweg der Linie. Er zählt nicht als Abweichung und erscheint im Editor als Teil der schwarzen Linie. Die Grundlinie bleibt Florians Kurve, denn eine Beule in der Front-Kurve ginge über die Vorlage in jeden Ring. Schmalere Kiefer liegen innen, dort bleibt die Grundlinie.

    **Gemessen** (Kugel, Stufe 2), Δ Seite / Front / Top:

    | Fall | vorher | jetzt |
    |---|---|---|
    | Florians Unterbiss | 46 / 20 / 21 px | 1,5 / 3,3 / 2,6 px |
    | Kiefer gleich | – | 2,3 / 4,0 / 4,9 px |
    | Überbiss mit Marken | – | 11,6 / 7,1 / 4,5 px |

    Beim Unterbiss gibt es offen nur noch 4–58 Paare (vorher 138–192), rot/blau ≤ 0,1 px. Beim Überbiss mit Marken sind es offen 0–62 Paare. Bilder: `docs/progress/editor/unterbiss-florian-{vorher,nachher,umweg}-riss.png`, `-nachher-schraeg.png`, `-nachher-oben.png`.

    **Offen:**
    - Der Umweg ist nur Anzeige. Gesteuert wird er über die Kieferlinie, später über Kiefer-Spanten.
    - Wird ein Kiefer im Top schmaler als die schwarze Linie, zeigt der Saum die Abweichung; die Linie folgt nicht von selbst. Weg: „Formen folgen“ fürs Top mit Maul.
    - Kiefer-Spanten.
    - Exaktes „Formen folgen“ mit Maul.
    - Das flache Lippenband (die Frage an Florian ist offen).
- **14.10. spätnachts: Florians nächste Rückmeldung** (Bilder `docs/progress/editor/florian-2026-10-14-kerbe-oberkiefer.webp`, `-flosse-unterkiefer.webp`, `-nase-ueber-kiefer.webp`; das Langhals-Bild kam nur im Chat):
  > „Es funktioniert schon ganz gut. Aber an der kleineren Lippe, ob oben oder unten, entsteht noch eine komische Meshfläche oder Lücke genau an der Spitze, sobald ich Ober- oder Unterkiefer nach vorne ziehe (Bild 1 zwischen den Augen, Bild 2 die komische Flosse vorne am Unterkiefer). Es sollte immer ganz smooth sein, und der eine Kiefer soll den anderen nicht mehr beeinflussen. Eine Form wie in Bild 3 sollte auch gehen, ohne dass ich die Nase extra aufblasen muss. Es fällt irgendwie in sich zusammen, wenn ich eine Nase über dem Kiefer rausschiebe mit dem Bézier-Handle in der Seitenansicht.“

  Dazu kam dieser Nachtrag:
  > „Beim Langhals kann ich aktuell überhaupt kein Maul setzen, ohne dass es die Form komplett zerreißt oder die Nase zur Mittellinie zusammenfällt. Das ist das gleiche Phänomen.“

  **Befund „Maul unter der Nase“:** Seit dem 12.10. ist das eine bekannte Grenze („Maulanfang hinter der Schnauzenspitze braucht Schnauzenringe“); es stand nicht im Plan. Die Lippe beginnt in der vorderen Kappe (Kappenzeile `bL`). Liegt der Anfang hinter der Spitze, rückt `kappeMin` Ring 0 hinter den Anfang, und die ganze Schnauze wird zur Kappe: ein c × c-Gitter mit ein bis zwei Stationen. Sie fällt zusammen.

  Nachgebaut am Langhals mit seiner Maullinie (Anfang 0,12 hinter der Spitze): Δ 13,8 / 8,9 / 29,3 px, 2700–5100 Paare, die Schnauze in gefalteten Lappen (`vorher-langhals-*` im Prüfordner).

  **Weg „Ringanfang“:** Beginnt das Maul hinter dem Platz von Ring 0, behält die Schnauze ihre Ringe (keine vergrößerte Kappe). Die Lippe beginnt am Bauchpunkt eines Rings i0 unter der Nase und läuft dort den unteren Bogen von i0 hinauf bis zur Lippenzeile jL (die Schleife um die Mundfront, wie Kanten in einem modellierten Kopf). Dahinter läuft sie wie bisher auf der Zeile jL.
  - Die Punkte dieses Startbogens liegen nach Bogenlänge auf der gezeichneten Linie vom Anfang bis zur Kreuzung mit Ring i0. Der Ring biegt sich dort zum Anfang vor.
  - Flächen vor Ring i0 (Nase) gehören zum Oberkiefer, die Kappe bleibt Nasenspitze. Rachenlinie und Kiefergewichte zählen ab Ring i0.
  - Die Kappe-Logik bleibt für Mäuler an der Spitze unverändert.

  Prüffälle: Langhals mit Maul unter dem Kopf, Kugel mit Nase nach Bild 3; Wächter Kugel gleich/Überbiss/Unterbiss, Rex, Tiger.

  **Danach:** Flosse und Kerbe an der Spitze des kürzeren Kiefers. In meinen Prüffällen sind sie noch nicht nachgestellt; der Zug am Anfang des kürzeren Kiefers wird schrittweise gemessen.
  - **Gebaut (4a2ec83): Maul unter der Nase.** Florians Hinweis „sei selbstkritischer und teste die Fälle richtig aus“ gilt ab hier: Jede Meldung stützt sich auf die Prüfreihe (`apps/editor/scripts/pruefen/pruefreihe.ts`, Kontaktbogen `pruefreihe-bilder.mjs`, Editor-Ablauf `langhals-editor.mjs`).
    1. **Anfang am gezeichneten Umrisspunkt.** Die Übersetzung nahm den vordersten Umrisspunkt auf der Höhe des Anfangs, beim Langhals also die Schnauzenspitze; die Lippe lief die ganze Schnauze entlang. Das war die eigentliche Ursache des Zerreißens.
    2. **Ringanfang.** Liegt der Anfang hinter dem Platz von Ring 0, beginnt die Lippe am Bauchpunkt von Ring i0 und läuft dessen unteren Bogen hinauf.
       - Ringe vor dem Maul liegen vor beiden Lippenanfängen, i0 hinter beiden. Das beseitigt die Flosse am kürzeren Kiefer der Nase.
       - Die Maulringe liegen gleichmäßig; sonst lief eine Lippenspalte vor die vorige.
    3. **Maulringe.** Im Maulbereich bekommt die Verteilung Zusatzdichte nach Maulgröße (Abstand mindestens ⅕ Sprossenlänge). Acht Ringe in einem winzigen Maul gaben Streifen und Falten bis 179°.
    4. **Hautabfrage mit wachsendem Fenster** (Editor und Prüfstand).
    5. **Lippenband nach der Kopfhöhe.** Die Kopfhöhe als Maßstab der ganzen Geometrie brach dagegen Tiger und Rex und wurde zurückgenommen.
  - **Prüfreihe nach 4a2ec83:**

    | Fall | Δ (px) | Durchdringungen 0/25/50/75/100 % | Hautfalten (über 20°) |
    |---|---|---|---|
    | Nase gleich | 3,4 / 3,8 / 6,7 | 0/0/0/0/0 | 23° (8) |
    | Nase Überbiss | 3,1 / 3,4 / 5,2 | 0/4/2/0/0 | 20° (0) |
    | Langhals gleich (wie Florians Giraffe) | 3,2 / 3,6 / 3,9 | 92/46/46/176/220 | 108° (52) |
    | Langhals getrennt | – | 342/160/0/130/186 | 24° (22) |

    Bei Langhals getrennt ist geschlossen nur verdeckte Überlappung im Spiel (die erlaubte), offen 50 % sind es 0. Im Editor (Maul gezeichnet, getrennt, roter Anfang 60 px nach unten): Δ 3/3/7 px, kein Zusammenfallen (`docs/progress/editor/langhals-editor-getrennt.png`). Kontaktbogen: `docs/progress/editor/pruefreihe-ringanfang.png`.
  - **Noch nicht gelöst (ehrlich):**
    - Die Kehlhaut des Langhalses faltet ab 75 % Öffnung (haut/haut 130–220 Paare; 58° Kieferwinkel um einen kleinen Mundwinkel).
    - An der Kugel bleiben Flosse und Kerbe am kürzeren Kiefer, wenn er nach vorn gezogen wird (Kappenanfang; Florians Bilder 1/2: Hautfalten 149° bzw. 178°).
    - Der Chip „getrennt“ setzt den blauen Anfang unter dem Kopf auf die Kinnseite, beim Langhals an die Kehle, und die blaue Linie läuft über die rote (Florians „Blau unten am Hals“).
    - Die kleine Vorlagen-Linie des Langhalses liegt ganz auf der Kopfunterseite; dort hat der Unterkiefer keine Dicke (Grenzfall).
  - **Gebaut (ac7fbcf, c5c15c9, a9bc9e1): Kerbe, Flosse, Klinge, Stationen** (14.10. spätnachts). Bild vorher/nachher: `docs/progress/editor/maul-kerbe-flosse-scharnier-2026-10-14.png`.
    1. **Stirn des kürzeren Kiefers ≥ 40 % seiner Linie** (gemessen: 10 % Kerbe 175°, 20 % 77°, 30 % 54°, 40 % ≤ 27°), der Bezugsring der Wand liegt dahinter; **Kappenspalten der Schlitzlippe nach Bogenlänge** zwischen Anfang und Ring 0.
    2. **Ringverteilung ohne die Ecken der Schlitzsehne:** Sie zählten als Krümmung des Körpers und zogen drei Ringe auf 0,015 zusammen; die Lippenspalten lagen 0,0095 statt 0,03–0,06 auseinander, die Unterlippe wurde zur Klinge. Im Umkreis von 3 % der Wirbelsäule um die markierten Knoten zählt ihre Krümmung nicht mehr.
    3. **Editor friert nur Stationen aus dem Bau des aktuellen Dokuments ein.** Ein beim Laden noch laufender Bau schrieb seine Ringverteilung in das neue Wesen.
    4. **Prüfreihe wie im Editor:** eingefrorene Stationen, Falten offen (Haut vorn / Lippe / Haut ganz bei 0, 50, 100 %), Zugschritte. Das Faltenmaß allein am geschlossenen Körper hatte Florians Fälle nicht erfasst (Kerbe und Flosse waren offen zu sehen).

    | Fall (Stationen der Startkugel) | Haut vorn zu/50/100 % | Lippe | offene Paare 25–100 % |
    |---|---|---|---|
    | Unterbiss, roter Anfang 1–6 % vor | ≤ 4,2° (vorher bis 178°) | ≤ 18,5° | 0/0/0/26–34 (haut/haut am Scharnier) |
    | Überbiss, blauer Anfang 1–2 % vor | ≤ 4,1° | ≤ 26° | 0/0/16/54–56 (Scharnier) |
    | Überbiss, blauer Anfang 3 % vor (fast bündig) | 5,0° | 26,8° | 0/0/34/60; **geschlossen sticht die Unterlippe durch** |
    | Florians Unterbiss | ≤ 4,2° | 12,6° | 0/0/0/28 |

  - **Noch nicht gelöst (ehrlich), gefunden mit der neuen Messung:**
    - **Naht hinter dem Mundwinkel beim Öffnen**, bei jedem Maul (Kugel gleich 20/64/80/96 haut/haut-Paare bei 25–100 %, von der Seite als harte Kante sichtbar). Ursache: Der Unterkiefer dreht um den Mundwinkel; die Haut des Kieferbands (Ringe k … k + 2) liegt hinter dem Gelenk und wandert beim Drehen nach oben und vorn, die untere Hälfte des Winkelrings schwenkt nach hinten (bei der Kugel bis 0,85 × ihrer Höhe). Gemessen und verworfen: die Bewegung hinter dem Winkel nach oben/vorn klemmen (reißt die Nachbarn auf, bis 162 Paare); das Gelenk global nach hinten legen (Kugel Überbiss 52 → 0, aber Langhals 220 → 478, Nase 0 → 338, Rex unten 0 → 210). Weg: eigenes Kiefermodell (Gelenk und Gewichte nach Lage zum Gelenk), Plan und Look-Beweis vor dem Bau.
    - **Kürzerer Kiefer fast bündig** (blauer Anfang ≤ 0,5 % hinter dem roten): Die gerade Schlitzsehne knickt den Seitenumriss zurück, wenn der blaue Anfang über dem roten liegt; die Leiter vorn wird instabil, Ring 0 springt an den Pol, die Kappenspalten der Oberlippe drängen sich (Kontrollpunkte im Zickzack, Lippe 45–65°), geschlossen sticht die Unterlippe durch. Weg: Umriss für die Ableitung entlang der sichtbaren Silhouette (rote Linie bis zur Kinnlinie); die echte Kinnlinie bleibt für die Form des Kiefers.
- **15.10. nachts: Block 2 zu Ende gebaut (Florian schläft, Auftrag „selbstständig weiter, extrem selbstkritisch, genau nach Plan“).**
  1. **Chip „getrennt“ unter dem Kopf** (1cdfe9c): Der blaue Knoten sitzt genau am Anfang der blauen Linie (vorher 0,035 entlang des Umrisses, am kleinen Langhals-Kopf schon an der Kehle); Vorschlag `unterkieferVorschlag` nach der Lippenlänge (7 % nach innen, Anfang 15 % zurück) statt 0,025 fest. Langhals getrennt offen 0 Paare, im Editor-Ablauf blau direkt hinter rot.
  2. **Messfehler im Seiten-Δ behoben** (1cdfe9c): Das Stück der schwarzen Kinnlinie im Fenster zwischen Rot und Blau liegt hinter der Lippe des längeren Kiefers und hat keinen Umriss; es zählte als Abweichung. Kugel-Überbiss 11,5 → 1,3 px, Langhals „rot runter“ 5,7 → 3,1 px (Bilder: das Stück liegt über dem Lippenband). Echte Abweichungen außerhalb des Fensters zählen weiter (Test).
  3. **Maullage eingefroren** (cb69ff9): Beim Ziehen eines Anfangs wanderte der Anteil des Mundwinkels mit der Leiter, die Wahl „nächster Ring“ kippte (Langhals Käfig 499 ↔ 513 Punkte); an der Kugel hob 1 px über der Spitzen-Schwelle die Lippe in eine andere Kappenzeile (18 px Sprung). Jetzt `GefroreneStationen.maul` (Winkelring, Ringanfang, Konturanfang) mit Band um die Schwellen. Zugmatrix (7 Fälle × Anfänge × 4 Richtungen à 15 Schritte): Wechsel 11 → 6, die übrigen einmalig an Bandgrenzen oder wenn ein Anfang über einen Nasenring gezogen wird; Haut springt dort ≈ 3,5 px statt > 14 px.
  4. **Kiefer-Spanten (Schritt 6)** (671756e, c45ba83): `Spant.unten` (gleiche Punktstruktur), im Kern in Maulringen unter der Lippe der Unterkiefer (`kieferQuerschnitt`, Breitenunterschied an der Lippe läuft zur Naht aus). Editor: Liegt ein Spant über dem Maul, zeigt die Front Oberkiefer (bis zur Lippe) und Unterkiefer (ab der Lippe, gestrichelt, Rauten) als zwei Kurven, je mit Punkten und Griffen; die Seite zeigt die Spantlinie mit Lücke; die Bühne zwei Perlenreihen über und unter der Lippenzeile. Bilder `docs/progress/editor/kiefer-spant-front-2026-10-15.png`, `kiefer-spant-buehne-2026-10-15.png`.

  **Abnahme Block 2 (ehrlich, Kontaktbogen `docs/progress/editor/block2-stand-2026-10-15.jpg`):**

  | Satz | Stand |
  |---|---|
  | 1 Rot und Blau gehen in die schwarze Linie über | erfüllt: Lippenanfänge sind Knoten, Ziehen bewegt Knoten samt Linie, keine neuen Knoten |
  | 2 Netz ruhig auf der schwarzen Linie | Seite Kugel ≤ 2,4 px, Langhals ≈ 3 px; Front/Top 2–7 px (Überbiss-Front 7 px = schmalerer Unterkiefer gegen die schwarze Kugel-Front, ein Widerspruch der Zeichnung, der Saum zeigt ihn). **Lokalität nicht erfüllt:** Lippenanfang 10 px gezogen, außerhalb des Bands (schwarze Linie und Lippenlinien bewegt, + 0,02): 0,2–0,7 px bei den meisten Zügen des kürzeren Kiefers und bei Florians Unterbiss, aber 1,3–4,6 px beim Zug am Schlitzanfang (Kugel gleich und Überbiss, Langhals „runter“). Ursache: der ganze Kiefer folgt seiner Linie, und die Ringe gleiten mit der Leiter; ohne Maul misst Block 1 schon 3,0 px (Kugel-Scheitel) bzw. 9,2 px (Komma). Gehört zu „Käfig als Wahrheit“ (Florians Entscheidung, eigene Sitzung). |
  | 3 Ober- und Unterkiefer je mit eigenem Spant | gebaut (Kiefer-Spanten) |
  | 4 Lippen ≤ 1 px, offen 0 sichtbare Durchdringungen | Lippen ≤ 0,7 px; offen 0 Paare bei allen Kugel- und Nasenfällen und Langhals getrennt; **Langhals gleich 52–60 Paare (Kehle), Langhals klein und „blau am Hals“ offen** |

  **Offen danach:** Kehlkette (Plan 5.2) für den Langhals; „blau am Hals“ (blauer Anfang weit am Hals: der Unterkiefer hängt als Lappen heraus); Lokalität (siehe oben); ein Unterkiefer der Kugel-Front hat nur den Achspunkt — erst „+“ auf der Unterkiefer-Kurve macht ihn formbar (gewollt: gleiche Punktstruktur, Punkte nur von Hand). Prüfskripte neu: `seite-nah.mjs`, `front-nah.mjs`, `pruefwesen-check.mjs` (Wächter aller Prüfwesen), `kiefer-spant-editor.mjs`; Zug- und Lokalitätsmessung als Scratchpad-Skripte (in die Übergabe übernommen).
- **15.10. nachts (danach): Langhals-Kehle — Ursache war die Naht, nicht das Gelenk** (a11e5ae). Der Mittelschnitt zeigte die Unterkiefer-Haut an der Naht über dem Lippenanfang (Schleife durch Oberlippe und Tasche, schon geschlossen 92 Durchdringungen). Ursache: Der Nahtrundgang lief nur in eine Richtung und endete an der Lücke am Lippenanfang; beim Ringanfang fehlte die ganze Nasenunterseite, die letzten Nahtpunkte bekamen ihre Ziele über den Rückweg die Nase entlang. Jetzt läuft der Rundgang bei einem fehlenden Nahtstück (≥ 2 Käfigpunkte) auch rückwärts, Ziele nur zwischen den äußeren Käfigpunkten. **Langhals gleich 92/52/60/60/60 → 0/0/0/0/0, Hautknicke 109/146/166° → 21/29/85°, Seite 3,2 → 1,6 px; Nase Seite 3,4 → 0,9 px;** Kugel, Rex, Tiger bitgenau wie vorher. Bilder vorher/nachher: Lappen über der Unterlippe bei 50 % weg. Verworfen (gemessen): breiterer starrer Bereich der Kiefergewichte (keine Besserung, Ursache lag woanders); Enden zur Lücke, Verteilung quer über die Lücke mit Rückweg, Enden frei ohne Schwelle (je ein anderer Fall schlechter, Zahlen im Commit). Bleibt: bei 100 % ein Wangenknick hinter dem Mundwinkel (85°, Gelenk auf der Haut) und die gestauchte Kehle bei „rot runter“ (Plan 5.2 Gelenk im Kopf / Kehlkette).

