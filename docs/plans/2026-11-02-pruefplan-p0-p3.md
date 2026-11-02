# Prüfplan P0–P3: Beweise für „ein Liniennetz, ein Löser“ mit Florians Klarstellungen als Kriterien (02.11.2026)

> **Zur Freigabe.** Grundlage: [Gegenprüfung](2026-11-02-gegenpruefung-liniennetz.md) (Abschnitte 3, 4 und 7),
> Florians [Klarstellungen](2026-10-22-klarstellungen.md), die Recherchen vom 21.10. und das Vorgehen in
> `docs/UEBERGABE.md`. Ersetzt den Abschnitt 6 der Recherche „Netz und Linien im Ganzen“ und den Prüfplan-Entwurf aus der
> Übergabe (Budget-Tor, Spiel-Probe). Kein Code vor der Freigabe.

## 0. Regeln für alle Beweise

- **Im Kern hinter Schaltern**, ohne Schalter bitgleich; der Kernring bleibt eingefroren; im Editor nur neue Anzeigen und
  Umschalter hinter Schaltern (der heutige Weg bleibt Standard, bis ein Beweis besteht und Florian umstellt).
- **Je Beweis am ersten Tag ein Bild aus dem Editor** („Was du siehst“), nicht nur Kern-Zahlen; Kontaktbögen unter
  `docs/progress/editor/p<N>-…-<Datum>.jpg`, Zahlen als Tabelle auf der Planseite, Tore als Tests (`it`, verfehlt als `it.fails`
  mit Registereintrag, nie gelockert).
- **Maße:** px bei 461 px je Kachel (wie Δ im Blatt-Titel); Winkel in Grad; Zeiten als Minimum aus drei Läufen auf ruhiger
  Maschine; „Spielgröße“ = 300 Gerätepixel Höhe (sechs Reihen auf dem iPhone 16, Annahme, in P0b nachgemessen).
- **Ablauf wie Florian:** Startkugel → umformen → Linien → Loops (eingefrorener Zustand des Editors), zusätzlich frisch gebaut;
  Prüfkörper sind **Florians Wesen zuerst** (Langhals, Ente, Vierbeiner, Zweihals, Kegel, Rex, Tiger; Nachbauten in der
  Extremreihe, dazu seine Bibliotheksdateien nur lesend) und dann die Extremreihe (39 Körper, 7 Gruppen).
- **Abbruch heißt:** anhalten, Zahlen und Bilder zeigen, Rückfall benennen; Florian entscheidet. Nach einem Fehlanlauf nicht
  stur anhalten (Regel 20.10.), aber jede Variante gemessen festhalten (Planseite „verworfen“).
- **Nichts gilt als bestanden ohne Florian.** Die Zahlen sagen „Tor erreicht“, er sagt „bestanden“.
- Nach jedem Beweis: Planseite „Stand“, Register, Übergabe, Commit, Push.

## Übersicht

| Beweis | Frage | Dauer | Florian dabei |
|---|---|---|---|
| **P0a** Spielstufe im Editor | Wie gut wird der heutige Käfig zum Spielnetz (Stufe 1)? Umschalter „Spiel“. | 1–2 Tage | nein (Bilder) |
| **P0b** Spiel-Probe iPhone | Laufen 36 Wesen auf Stufe 1 mit Maul, Morph und Schatten auf dem Brett mit 58 fps? | 1–2 Tage + 30 min | ja, am iPhone |
| **P1** Ansichten als Illustration | Umrissschleifen je Teil (auch verdeckt) hart im Löser, Füllung „so rund wie möglich“, Blatt = Illustration, Δ = 0. | 4–5 Tage | Blick nach Tag 1 und am Ende |
| **P2** Stücknetz im Maulfeld | Maul ohne Sonderregeln, im Budget, Zahnfleischreihe. | 3–5 Tage | Blick am Ende |
| **P3** Loops und Linien am ganzen Körper | Loops als gezeichnete Linien, Ansatz-Loops statt Fenster, Kanten mit Härte, Augenschleife, Pole nach Regel, Posen an Linien, Werkzeuge der Tabelle. | 4–5 Tage | Vorab 2–4 h (Liniennetze auf Bildern), Blick am Ende |

Reihenfolge: P0a → P1 → P2 → P3; P0b, sobald Florian am iPhone ist (hängt an P0a, nicht an P1–P3). Insgesamt etwa 14–19
Arbeitstage; kalendarisch nach dem Wochenlimit. Danach der große Plan (Bauweise, Reihenfolge des Umbaus, Einbau, was bleibt).

## P0a Spielstufe im Editor (1–2 Tage)

**Was gebaut wird (klein, unabhängig vom Netz):**
- Kern: Bauplan-Option `stufen` (1 | 2 | 3) für das angezeigte Netz; auf Stufe 1 liegen die Punkte **auf der Grenzfläche**
  (Limit-Stencil statt der rohen Stufe-1-Lagen) und tragen die **Normalen der Grenzfläche** — so bleibt die Cel-Schattierung
  glatt, nur die Silhouette ist polygonal. Harte Kanten bleiben hart (getrennte Normalen an Falten).
- Editor: Umschalter **„Spiel“** auf der Bühne (und in den Blättern): Stufe 1 mit dem Earle-Material wie im Spiel; im Titel
  **Dreiecke / 8 000**, dazu die Silhouettenabweichung Stufe 1 gegen Stufe 3 in Gerätepixeln bei Spielgröße. Rot über dem Budget.
- Messskript `spielstufe.ts` (aus der Vorbereitung dieses Plans, Abschnitt „Messungen“ der Gegenprüfung).

**Fälle:** Kugel, Ei, Rex, Langhals, Robbe, Tigerkopf, Kegel (Röhre); Ente, Fisch, Vierbeiner (Teile); Rex mittel J und
Kugel mittel J mit Maul-Einsatz (Kernring, eingefroren); Rex in der Pose Fressen 50 % und 100 %.

**Messungen und Tore (je Fall):**
| Maß | Tor |
|---|---|
| Dreiecke auf Stufe 1 (mit Maul, Zähnen, Augen) | ≤ 8 000 (heute: Körper ohne Maul 3 200; mit Maul-Einsatz K2 ≈ 19 000–26 000 → verfehlt, erwartet; das ist der Befund für P2) |
| Silhouette Stufe 1 (Grenzlagen) gegen Stufe 3, drei Ansichten, bei Spielgröße | max ≤ 1,5 Gerätepixel, Mittel ≤ 0,5 |
| Silhouette Stufe 1 gegen die Zeichnung (Δ wie im Blatt) | nicht mehr als Stufe 3 + 1,5 px |
| Facettierung: Flächenwinkel benachbarter Stufe-1-Flächen abseits gezeichneter Falten | 95 % ≤ 12°, max ≤ 25° |
| Cel-Stufen: Lage der Farbstufen-Grenzen Stufe 1 (Grenznormalen) gegen Stufe 3 im Bild | ≤ 2 Gerätepixel, keine Treppe entlang der Stufengrenze |
| Pose (Fressen 50/100 %) auf Stufe 1 gegen Stufe 3 | ≤ 1,5 Gerätepixel an der Silhouette |
| Umschalten im Editor | ≤ 100 ms, kein Neubau des Käfigs |

**Bilder:** Kontaktbogen je Fall: Stufe 3 | Stufe 1 mit Grenznormalen | Stufe 1 mit rohen Normalen (zum Vergleich), Seite und 45°,
Earle-Look; ein Bogen aller Fälle bei Spielgröße.

**Abbruch/Befund:** Kein Abbruch (Messung). Verfehlt ein Körper ohne Maul die Silhouetten-Tore, ist die Käfigdichte zu gering
oder zu ungleich verteilt — dann wird die Dichteregel (Gegenprüfung 3.6) angepasst, bevor P2/P3 das Budget als Tor nehmen.

**Was du siehst (Tag 1):** den Umschalter „Spiel“ an deinen Wesen; Dreieckszahl im Titel; Kontaktbogen Stufe 1 gegen 3.

## P0b Spiel-Probe auf dem iPhone (1–2 Tage, dazu 30 Minuten von dir)

- **Bau:** Backen von 36 Prüfwesen (Stufe 1, Grenzlagen und -normalen) als Netz mit Earle-Material, Kieferknochen, ein bis
  drei Morph-Zielen (Fressen, Idle), Schatten; Lader im Spiel hinter einem Schalter (`?wesen=editor`), auf dem echten Brett in
  der echten Karte. Kein Export-Format festlegen (JSON reicht), kein Produktionsweg.
- **Messung** nach `docs/progress/karte-perf-iphone16.md`: Safari (WebGPU) und App (WKWebView, womöglich WebGL2): fps, p99,
  Draw Calls, Speicher; einmal mit 36 Wesen ohne Maul (3 200 Dreiecke), einmal mit dem heutigen Maul-Einsatz (über Budget, um
  die Grenze zu sehen), einmal mit 36 × 8 000 (Kugeln auf Stufe 2 als Platzhalter für das Budget).
- **Tore:** ≥ 58 fps, p99 < 20 ms, ≤ 100 Draw Calls bei 36 × 8 000 Dreiecken samt Karte. Befund, wenn verfehlt: Budget je Wesen
  sinkt (z. B. 5 000) → die Dichteregel ändert sich; das ist Eingabe für P2/P3, kein Abbruch.
- **Was du siehst:** deine Wesen auf dem Brett in der Karte, mit der Zahl im Perf-Badge.

## P1 „Ansichten als Illustration“ (4–5 Tage)

**Frage:** Werden die drei (fünf) Blätter zu Linien-Illustrationen, deren Umrissschleifen — je Teil, mit verdeckten
Stücken — den Körper hart binden, mit einer Füllung „so rund wie möglich“ dazwischen; ist die schwarze Linie damit der Umriss
des Körpers (Δ = 0), und bleiben die Linien ruhig?

**Fälle (Röhre, ohne Maul; frisch und in deinem Ablauf):**
1. Kugel, Ei, Birne (Grundfälle, Δ heute 0,2–3 px).
2. Dein Kegel (Front 7,3 px heute).
3. Stadionform mit dem Stift (Gerade + Halbkreis; klappt heute um) und Würfel mit echten Ecken (kantig: harte Umrissschleifen).
4. Pilz (Überhang: Top-Schleife mit verdecktem Stiel; Front mit Kragen-Schleife unter dem Hut).
5. Robbe (Top 12,5 px heute), Rex ohne Maul (Front 7,3 px), Tiger-Schnauzenblock (harte Kanten).
6. **Langhals von oben:** zwei Umrissschleifen — die Körperschleife läuft unter dem Kopf hindurch (verdecktes Stück, blass,
   ziehbar), die Hals-Kopf-Schleife mit Kragen am Halsansatz. Keine Zusatzpunkte der Vereinigung.
7. **Ente (Z-Form):** Top wie 6, Front mit dem Hals über dem Rumpf.
8. Zwei Zeichnungen mit Widerspruch (Ente-Haken: Top will 30–84 px Halbbreite, wo die Front 37 erlaubt; dazu ein künstlicher).

**Tag 1 — Umrissschleifen planen und zeigen (ohne Formänderung):**
- Aus den drei Zeichnungen je Ansicht die Umrissschleifen als 3D-Linien auf dem heutigen Körper (Seite: Naht; Top:
  Breitenlinie mit glatter Höhe; Front: Frontschleife mit glatter Tiefe), **einschließlich der verdeckten Stücke**: Wo die
  Projektion einer Schleife von einer anderen verdeckt wird, wird das Stück fortgesetzt (tangentenstetig, als Vorschlagslinie)
  und blass gezeigt (Entscheidung E1/E2 der Gegenprüfung).
- Blätter zeichnen die Schleifen in der Linienschrift (schwarz/weiß, verdeckt blass, Härte = Strich); das SVG der
  Vektor-Ausgabe ist dasselbe Bild.
- **Tore Tag 1:** (a) Jitter-Ruhe: Käfig 20-mal um 0,1 px zufällig gewackelt → jede Linie bewegt sich ≤ 0,2 px (die heutigen
  V2-Linien zum Vergleich gemessen); (b) zwischen zwei Kreuzungen höchstens zwei Krümmungswechsel; (c) keine Zusatzpunkte der
  Vereinigung — jede Schleife ist geschlossen, verdeckte Stücke schließen tangentenstetig; (d) Blatt und SVG decken sich
  ≤ 0,1 px; (e) Anzeige ≤ 16 ms je Bau (Liniennetz heute 18–36 ms).
- **Was du siehst:** Kontaktbogen „heute (V2-Linien) | neu (Schleifen)“ an Langhals, Ente, Kegel, Robbe in allen drei Blättern.

**Tag 2–3 — Käfig um die Schleifen, ein Löser:**
- Die Schleifen werden Käfigkurven: Naht (Reihen 0/N·2), Breitenlinie (Reihe N/4, je Ring gleitend), Frontschleife aus
  Reihen- und Ringstücken; die Ringe, die eine Schleife braucht (Kragen am Halsansatz, Chest-Halbring beim Langhals), werden
  **von der Schleife gesetzt** (ein Loop ist eine Linie) — die Zuordnung Schleife → Kurve ist der schwierigste Teil (Plan 20.10.,
  Risiko 1) und wird je Fall als Bild gezeigt.
- Löser: hart Lage + Silhouettenbedingung auf allen Schleifen (sichtbar und verdeckt), weich Krümmungsvariation **ohne
  Zielform**; die Sichthülle nur als Prüfung (Überstand → rot).
- **Tore:**
  | Maß | Tor |
  |---|---|
  | Δ je Blatt (Stufe 3) an widerspruchsfreien Körpern | ≤ 0,5 px, Ziel 0 (heute Robbe 12,5, Kegel 7,3, Rex 7,3) |
  | Überstand über eine Schleife | ≤ 0,5 px |
  | umgeklappte Flächen | 0 |
  | Falten freie Haut / Kappen (nach Zonen) | ≤ heutiger Wert je Körper; Kappen ≤ 15° |
  | flache Bänder: Flächenanteil mit \|n·Blick\| < sin 5° je Ansicht | ≤ 2 % (heute mit „mittel“: Zahl aus der Messung in der Gegenprüfung, Abschnitt 8) |
  | Rundheit: Querschnitte an 10 Stationen, wo beide Umrisse konvex sind | keine Wendepunkte im Querschnitt |
  | Zebra in den Ansichten 45°/45° und 45°/−45° | keine Bänder, keine Falten, die niemand gezeichnet hat (Bild, dein Urteil) |
  | Volumen gegen heute | Hinweis, kein Tor (rund ist schmaler als „mittel“) |
  | Lösen bei ≤ 2 000 Käfigpunkten | ≤ 50 ms |
- **Bilder:** je Fall Seite/Front/Top als Illustration + Bühne Earle + Zebra 45°; Zuordnung der Schleifen zu Käfigkurven als
  Netzbild.

**Tag 4 — Bedienung und Widersprüche (im Editor, Playwright, eigener Vite 5192):**
- Umrissknoten 20 px in 20 Schritten ziehen: Δ bleibt ≤ 0,5 px, keine Topologieänderung, kein Sprung am Gestenende (≤ 0,5 px).
- **Verdecktes Stück ziehen** (Langhals: Bauch unter dem Kopf im Top): Körper folgt (Δ 0 am Stück), Kopf bleibt (≤ 0,25 px
  außerhalb des Bands).
- Widerspruch (Fall 8): rot genau an der Stelle, der Körper trifft die strengere Schleife, nichts still; „angleichen“ nimmt
  die geführte Ansicht.
- Kopplung: nur Kreuzungspunkte und Außenmaße folgen (Gegenprüfung 3.5); kein Punkt wird eingefügt (heute: 2 je 325 Gesten).

**Tag 5 — Kontaktbögen, Zahlen, Register, Übergabe.**

**Bestanden (Zahlen):** ≥ 11 von 13 Fällen alle Tore, darunter Langhals, Ente, Würfel, Stadion, Pilz; die verdeckten
Schleifen schließen bei Langhals, Ente und Pilz ohne Teilerkennung. **Abbruch:** ein widerspruchsfreier Körper bleibt über
1 px, oder eine Umrissschleife lässt sich nicht als Käfigkurve legen, ohne den Körper zu verzerren (Zuordnung) — dann bleibt
Kandidat B (Umrisse wie heute, Stücknetz nur für Einsätze) und für die Anzeige die besser bestimmte Umrisswahl
(Recherche 21.10., 3.6).

## P2 „Stücknetz im Maulfeld“ mit Budget-Tor (3–5 Tage)

**Frage:** Füllt ein Stücknetz (Linien → Stücke → Ganzzahlen → Muster) das Maulfeld ohne Sonderregeln, im Spiel-Budget, mit
regulärem Mundwinkel und einer Zahnfleischreihe als Linie?

**Fälle (A0 = Körper aus P1, wenn P1 bestanden hat, sonst der heutige A0 — P2 hängt nicht an P1):** Rex mittel gerade und J,
Robbe hoch gerade und J, Rex tief J, Robbe tief J, Kugel mittel J, Ei tief J, Langhals hoch J, Birne mittel S, Tigerkopf mit
Kastenschnauze (Kanten kreuzen das Maul). Danach die ganze Reihe (54 Fälle, 39 ausgeglichene).

**Bauplan (Recherche „Feldnetz oder Kernring?“, Abschnitt 6):** Linien in der Karte (Feldrand, Naht, Maullinie samt
Verlängerung über den Mundwinkel bis zum Feldrand — als **Vorschlagslinie** sichtbar —, Falten von A0, **Zahnfleischreihe** als
Linie innerhalb der Lippe); Stücke = Flächen des Liniengraphen, Ecken ab ≈ 22°, konkave Stücke geteilt; Ganzzahlen (Feldrand
fest, Ober- = Unterlippe, gerade Summe, nah an einer Zielkante, wenige Pole, keine auf Lippe oder Feldrand, **Dichte aus dem
Budget**); Muster (Tarini 2022 für einen Pol, sonst Takayama 2014), Wahl nach eigenem Maß; Einbetten (Tutte je Stück),
aufschneiden, Lippe (A6), Haut lösen (A7), Tasche und Rachen, Messen.

**Tore:**
| Maß | Tor |
|---|---|
| Haut gegen A0 | ≤ 0,25 px; Knick ≤ A0 + 2° |
| Mundwinkel | ≤ A0 + 2° |
| Lippe auf der Linie | ≤ 1 px (Ziel 0,3) |
| umgeklappt | 0; außen bitgleich; Spiegel bitgenau |
| Regeln | keine Regel im Code nennt einen Körper oder eine Lage |
| Stabilität | Linie ±2 px (20 Versuche): Topologie gleich |
| Muster | je Muster alle kleinen Kantenzahlen erschöpfend geprüft (nur Vierecke, erwartete Valenzen) |
| **Budget** | Maulfeld (Lippe, Tasche, Rachen, Zahnfleisch) ≤ 300 Käfigflächen; ganzes Wesen ≤ 1 000 Flächen → Stufe 1 ≤ 8 000 Dreiecke (heute 9 500–13 000 Flächen) |
| Spielstufe des Mauls | im P0a-Umschalter: offenes Maul (100 %) auf Stufe 1 rund, keine Ecke > 25° auf der Lippe (6–8 Lippenspannen) |
| Zahnfleischreihe | eine Linie des Stücknetzes, auf der die Zähne (Phase 2 M4) sitzen können: ≤ 0,5 px von der heutigen Lage |
| Öffnen (Vorgriff auf E5) | Kiefer-Pose bei 50/100 %: 0 Durchdringungen auf sichtbarer Haut, Falten Lippe ≤ heute |

**Bilder:** je Fall A0 | Kernring | Stücknetz | Zebra im selben Ausschnitt; die Stücke mit Polen; Mundwinkel nah; Stufe 1.

**Bestanden:** alle Tore an ≥ 10 von 11 Fällen und Haut/Mundwinkel an der ganzen Reihe nicht schlechter als der Kernring
(41/43, 43/43). **Abbruch:** nach fünf Arbeitstagen Tore in mehr als zwei Fällen verfehlt → der eingefrorene Kernring bleibt
(E3/E4 darauf), und das Budget ist dann offen (Entscheidung: lokale Verfeinerung oder kleineres Maulfeld).

## P3 „Loops und Linien am ganzen Körper“ (4–5 Tage)

**Frage:** Sind Loops, Kanten, Ansatzlinien und Augenschleifen gezeichnete Linien **desselben** Netzes — Ringe und Reihen
dort, wo sie aufgehen, Muster nur in den Stücken dazwischen —, mit Pole nach Regel, stabil beim Ziehen, mit Posen an Linien,
und bleiben dabei nur die Werkzeuge der Tabelle (Gegenprüfung, Abschnitt 5)?

**Vorab (2–4 Stunden, ohne Code, mit dir):** Liniennetze auf Bilder deiner Wesen zeichnen (Umrisse, Loops, Ansätze, Kanten);
Stücke und Seiten zählen. **Abbruch**, wenn mehr als jedes zehnte Stück eine Sonderbehandlung bräuchte.

**Fälle:**
1. Langhals mit drei gezeichneten Loops (einer schräg um den Hals, einer gebogen) — Verjüngen mit S am mittleren Loop.
2. Rex mittel J mit zwei P-Linien (Brauenwulst, Augenschleife mit Brauenwulst als harte Linie — Anker für Teil 2).
3. **Fisch mit Seitenflossen** (dein Beispiel): Ansatz als gestrichelter Loop in der Seite, harte Kante der überstehenden
   Flosse, von oben die Sichel.
4. Ente mit flachen Flügeln (Ansatz-Loops), Vierbeiner (vier Ansatz-Loops), Zweihals.
5. Tiger (Kasten: harte Loops quer, harte Längskanten), Kegel mit schräger Linie, Würfel.
6. Seestern (Arme nur im Top), Pilz.
7. Posen: Rex Fressen mit Linien; Pinsel-Relief in der Grundform neben einer Linie.

**Tore:**
| Maß | Tor |
|---|---|
| Stücke | alle gültig, nur Vierecke, Spiegel exakt, keine fallbezogene Regel |
| Loop auf seiner Linie (Zeichenansicht) | ≤ 0,3 px; die Projektion im fremden Blatt **ist** die gezeigte Linie |
| Kante (P-Linie) | ≤ 0,3 px; Härte 0 / 50 / 100 % → Faltenwinkel steigt monoton, Strichstärke 0 → 3 px, Enden verjüngt |
| Ansatz | Teil sitzt auf seinem Loop ≤ 0,5 px; Ansatzwinkel ohne Falte ≤ 15° (heute 11–16°); Flosse/Flügel so flach wie gezeichnet |
| Umrisse mit Linien | Δ ≤ 0,5 px bleibt (heute ändern Linien die Umrisse bis 0,7 px) |
| Falten | nicht schlechter als P1; keine Falte, die niemand gezeichnet hat |
| Pole | nur mit drei oder fünf Kanten, abseits der Naht, nicht in der ersten Reihe um Linie, Mundwinkel, Auge; Fünfer an Sätteln, Dreier auf Kuppen (Gauß-Krümmung von A0) |
| Stabilität | Linie ±2 px (20 Versuche je Linie): Topologie wechselt nur, wenn eine Kreuzung wechselt; dann bleiben ≥ 95 % der Flächen außerhalb der Nachbarstücke gleich; Posen-Deltas übertragen ≤ 0,5 px |
| Tempo | Neuplanung ≤ 150 ms, mit Lösen ≤ 300 ms bis 2 000 Käfigpunkte; Zug ohne Neuplanung ≤ 16 ms je Bewegung |
| Budget | ganzes Wesen ≤ 1 000 Käfigflächen samt Maul (mit P2) |
| Werkzeug-Matrix | nur die verbleibenden Werkzeuge × Grundform/Pose: jedes wirkt auf jedem Körper gleich (keine Röhre/Teile-Unterscheidung, kein Chip ohne Wirkung) |
| Blatt-Illustration | Loops gestrichelt, wo weich; verdeckt blass; Sichel der Flosse von oben; Blatt = SVG |

**Bilder:** je Fall drei Blätter als Illustration + Bühne + Zebra 45°; Stücke/Pole-Karte; Stufe 1 (Spiel).

**Bestanden:** Tore an allen Fällen bis auf höchstens einen; dein Urteil an den Bögen. **Abbruch:** Tore in zwei oder mehr
Fällen → das Raster (Ringe × Reihen) bleibt, das Stücknetz wird nur für Einsätze genommen (Kandidat B), **mit** den Umrissen
und der runden Füllung aus P1.

## Danach, freiwillig: Maul öffnen im Vergleich (2 Tage, 2–3 Stunden von dir in Blender)

Wie in der Recherche 21.10., Abschnitt 6: Du baust für Rex den Maulbereich von Hand; Vergleich mit dem erzeugten Netz bei
gleich vielen Punkten im weit offenen Maul; dein Urteil blind an Zebra- und Matcap-Drehbildern.

## Was du nach jedem Beweis siehst

| nach | im Editor | als Bild |
|---|---|---|
| P0a | Umschalter „Spiel“, Dreiecke/Budget im Titel | Stufe 1 gegen 3 an deinen Wesen, bei Spielgröße |
| P0b | deine Wesen auf dem Brett (iPhone) | Perf-Badge |
| P1 | Schleifen als Illustration in den Blättern (hinter Schalter), verdeckte Stücke ziehbar | heute/neu je Blatt; Zebra 45° |
| P2 | — (Kern) | A0/Kernring/Stücknetz/Zebra; Stufe 1 des Mauls |
| P3 | Loops/Kanten/Ansätze als Linien (hinter Schalter) | Bögen je Fall; Stücke/Pole |

## Entscheidungen vor dem Start (aus der Gegenprüfung, Abschnitt 10)

E1 verdeckt = blass · E2 Vorschlagslinien ja · E3 Spanten/Reifen entfallen · E4 kantig nur durch harte Linien, sonst rot ·
E5 Spielstufe 1, Budget 8 000 · E6 deine Wesen zuerst · E7 Loops in Front/Back bearbeitbar. Ohne deine Antwort gelten die
Vorschläge; sie lassen sich je Beweis noch ändern.
