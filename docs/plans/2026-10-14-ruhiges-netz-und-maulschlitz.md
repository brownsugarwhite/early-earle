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
