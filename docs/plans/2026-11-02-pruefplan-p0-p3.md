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
  glatt, nur die Silhouette ist polygonal (Blender „Use Limit Surface“, OpenSubdiv-Limit-Auswertung; Gegenprüfung 9.2). Harte
  Falten als getrennte Normalen, halbscharfe als eine; Morph-Ziele mit Normalen-Deltas. Der Weg ist kurz: Die Stufenzahl ist
  heute die Konstante `ABLEIT_STANDARD.stufen = 3`, und die Anzeige legt die Punkte schon auf die Grenzfläche
  (`anwenden3(grenze)`) — Stufe 1 mit der Grenzmaske der Stufe 1 ist dieselbe Mechanik.
- Editor: Umschalter **„Spiel“** auf der Bühne (und in den Blättern): Stufe 1 mit dem Earle-Material wie im Spiel; im Titel
  **Dreiecke / 8 000**, dazu die Silhouettenabweichung Stufe 1 gegen Stufe 3 in Gerätepixeln bei Spielgröße. Rot über dem Budget.
- Messskript `spielstufe.ts` (aus der Vorbereitung dieses Plans, Abschnitt „Messungen“ der Gegenprüfung).

**Fälle:** Kugel, Ei, Rex, Langhals, Robbe, Tigerkopf, Kegel (Röhre); Ente, Fisch, Vierbeiner (Teile); Rex mittel J und
Kugel mittel J mit Maul-Einsatz (Kernring, eingefroren); Rex in der Pose Fressen 50 % und 100 %.

**Messungen und Tore (je Fall):**
| Maß | Tor |
|---|---|
| Dreiecke auf Stufe 1 (mit Maul, Zähnen, Augen) | ≤ 8 000 (heute: Körper ohne Maul 3 200; mit Maul-Einsatz K2 ≈ 19 000–26 000 → verfehlt, erwartet; das ist der Befund für P2) |
| Silhouette Stufe 1 (Grenzlagen) **gegen die Grenzfläche** (Stufe 3 als Näherung), drei Ansichten, bei Spielgröße | max ≤ 1 Gerätepixel (Warnung ab 2), Mittel ≤ 0,5 — Sagitta s ≈ l²/(8r) |
| Silhouette Stufe 1 gegen die Zeichnung (Δ wie im Blatt) | nicht mehr als Stufe 3 + 1 px |
| Facettierung: Flächenwinkel benachbarter Stufe-1-Flächen abseits gezeichneter Falten | 95 % ≤ 12°, max ≤ 25° |
| Cel-Stufen: Pixel, deren Farbstufe zwischen Stufe 1 (Grenznormalen) und Stufe 3 wechselt, bei Spielgröße | ≤ 1 % der Wesenpixel; Stufengrenze ohne Treppe (Overlay-Bild) |
| Pose (Fressen 50/100 %) auf Stufe 1 (Käfig-Deltas + Normalen-Deltas) gegen Stufe 3 | ≤ 1 Gerätepixel an der Silhouette; Kieferknochen: „skinnen, dann unterteilen“ gegen „unterteilen, dann skinnen“ als Δ gezeigt |
| Punkte je Rumpfring | Befund: reicht 16, oder braucht Stufe 1 24 (Sagitta am Rumpf)? Eingabe für die Dichteregel |
| Umschalten im Editor | ≤ 100 ms, kein Neubau des Käfigs |

**Bilder:** Kontaktbogen je Fall: Stufe 3 | Stufe 1 mit Grenznormalen | Stufe 1 mit rohen Normalen (zum Vergleich), Seite und 45°,
Earle-Look; ein Bogen aller Fälle bei Spielgröße.

**Heute (Messung 02.11., [`spielstufe-2026-11-02.md`](../progress/editor/spielstufe-2026-11-02.md)):** Stufe 1 auf der
Grenzlage gegen Stufe 3 max 0,4–2,8 px bei 461 px je Kachel (bei Spielgröße 300 px ≈ 0,3–1,8 Gerätepixel) — das Tor ist
erreichbar; Knicke 95 % 11–34°, Maxima abseits der Falten auf der Grenzlage 30–81° — die Käfigfehler, die Stufe 3 verdeckt;
Cel-Stufen auf Stufe 1 mit glatten Normalen bei 480 px nicht von Stufe 3 zu unterscheiden; mit Maul gibt es heute keine Stufe 1.

**Abbruch/Befund:** Kein Abbruch (Messung). Verfehlt ein Körper ohne Maul die Silhouetten-Tore, ist die Käfigdichte zu gering
oder zu ungleich verteilt (16 statt 24 Punkte je Rumpfring) — dann wird die Dichteregel (Gegenprüfung 3.6: Körper 600–700,
Maulfeld 200–300, Zähne ≤ 100 Flächen) angepasst, bevor P2/P3 das Budget als Tor nehmen.

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
  Risiko 1): Sie wird als diskrete Suche geführt (dynamische Programmierung mit Stetigkeitsstrafe, Cashman 2013), dazwischen
  wird nur linear gelöst, zwei bis drei Wechsel; je Fall als Bild gezeigt. Optional, nur mit deinem OK: ConTesse (Apache 2.0)
  als unabhängiger Prüfer der Konturen.
- Löser: hart Lage + Silhouettenbedingung auf allen Schleifen (sichtbar und verdeckt), weich Krümmungsvariation **ohne
  Zielform**; die Sichthülle nur als Prüfung (Überstand → rot). Bleibt ein Überstand an Sätteln: Rückfall Rivers 2010 (Rims
  festhalten, nur einwärts glätten), gemessen als zweite Variante.
- **Tore:**
  | Maß | Tor |
  |---|---|
  | Δ je Blatt (Stufe 3) an widerspruchsfreien Körpern | ≤ 0,5 px, Ziel 0 (heute Robbe 12,5, Kegel 7,3, Rex 7,3) |
  | Überstand über eine Schleife | ≤ 0,5 px |
  | umgeklappte Flächen | 0 |
  | Falten freie Haut / Kappen (nach Zonen) | ≤ heutiger Wert je Körper; Kappen ≤ 15° |
  | Flachband: Flächenanteil mit \|n·Blick\| < sin 5° je Ansicht | ≤ 13 % (1,5 × Kugel 8,7 %) an runden Körpern; an Körpern mit gezeichneten geraden Strecken (Kegel, Würfel, Tiger-Block) nur außerhalb dieser Strecken gezählt. Heute: Rex Seite 18,9 %, Robbe 21,8 %, Langhals Front 15,9 %, Kegel Seite 34,4 % (gezeichnet) |
  | Käfiggüte auf Stufe 1 (Grenzlage), abseits gezeichneter Falten | 95 % ≤ 20°, max ≤ 30° (heute Röhre 21–24 % / Rex 36°, Langhals 45°, Kegel 47°) — der Käfig ist das Spielnetz |
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

**Bestanden (Zahlen):** ≥ 11 von 12 Körpern (Fälle 1–7) alle Tore, darunter Langhals, Ente, Würfel, Stadion, Pilz; die beiden Widerspruchsfälle zählen nur für Rot; die verdeckten
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
| Pole | nur mit drei oder fünf Kanten, abseits der Naht, nicht in der ersten Reihe um Linie, Mundwinkel, Auge; Fünfer an Sätteln, Dreier auf Kuppen (Gauß-Krümmung von A0); je Stück mit k Rändern mindestens \|k − 4\| Pole (Schaefer 2004) und nicht mehr als nötig |
| Härte-Modell (Versuch, ein Fall) | halbscharfe Falte gegen „Härte als Membranenergie“ (Prasad) und „Strichbreite = Normalenwinkel“ (I11): Winkel und Rundungsbreite bei 0/25/50/75/100 %, Bild; Entscheidung E8 |
| Loop-Vorschlag (Versuch) | beim Schweben vorgeschlagener Loop (I9) trifft den von Hand gezeichneten ≤ 2 px; ≤ 16 ms |
| Stabilität | Linie ±2 px (20 Versuche je Linie): Topologie wechselt nur, wenn eine Kreuzung wechselt; dann bleiben ≥ 95 % der Flächen außerhalb der Nachbarstücke gleich; Posen-Deltas übertragen ≤ 0,5 px |
| Tempo | Neuplanung ≤ 150 ms, mit Lösen ≤ 300 ms bis 2 000 Käfigpunkte; Zug ohne Neuplanung ≤ 16 ms je Bewegung |
| Budget | ganzes Wesen ≤ 1 000 Käfigflächen samt Maul (mit P2) |
| Käfiggüte Stufe 1 | wie P1: abseits gezeichneter Falten 95 % ≤ 20°, max ≤ 30° (Grenzlage); Teile heute 29–34 % / 50–81° |
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

## Stand P0a — Spielstufe im Editor (03.11.2026, gebaut; Abnahme offen)

**Freigabe:** Florian am 03.11.: „Gegenprüfung und Prüfplan sind freigegeben, E1–E8 wie vorgeschlagen; starte Schritt 3 mit P0a.“

**Gebaut (Kern, ohne Option bitgleich):** `packages/shape/src/kern/spielstufe.ts`. Die Spielstufe ist kein neuer Bau und keine
neue Maske: Die Punkte der Stufe 1 behalten ihren Index in jeder feineren Stufe, ihre Grenzlagen stehen also schon in den
Lagen der Stufe 3; und jede Ecke (f, i) einer Fläche der Stufe 1 ist Ecke 0 der Stufe-3-Fläche 16·f + 4·i. Alle Eckenwerte der
Anzeige (Lagen, Normalen, Deskriptoren, Atlas, Ruhelage, Gewichtsfarben) werden deshalb aus den Stufe-3-Werten umsortiert —
die Normalen sind damit die der glatten Fläche an denselben Punkten („Grenznormalen“), scharfe Falten bleiben getrennt.
Zum Vergleich die rohen Normalen aus den Flächen der Stufe 1 (`stufenNormalen: 'roh'`). Bauplan-Option `stufen` (1 | 2),
`WesenInfo.spiel` (Stufe, Dreiecke ganz und Körper, Umriss Stufe 1 ↔ 3 je Blatt, Grund), Umrissvergleich nur im genauen Bau
und im Stand gemerkt; mit Augapfel-Höhle oder Rundmaul bleibt die Bau-Stufe (Grund im Feld); angesetzte Teile, Wangen und
Klingen bleiben hinter dem Körperblock unverändert. Auch auf dem Baum („Teile“).

**Gebaut (Editor):** Umschalter „Spiel“ als Eckknopf der Bühne (Schachbrett) und in der Tafel Spiel (Chips Editor (Stufe 3)
| Spiel (Stufe 1), Normalen Grenzfläche | roh); im Bühnentitel „Spiel · 3 200 / 8 000 Dreiecke · Umriss ≤ x px“ (grün ≤ 1,
ocker ≤ 2, pink darüber; rot über dem Budget); Tafel mit Dreiecken (ganz, Körper, Stufe), Umriss je Blatt in Gerätepixeln bei
300 px Höhe und in px bei 461; `?spiel=1`, `?spielnormalen=roh`; Haken `__editor.spiel()`. In der Spielstufe sind Treffer aus
(Anzeige, keine Werkzeuge); Δ, Linien, Zähne und Augen bleiben wie gebaut.

**Tore (Tests `kern/spielstufe.test.ts`, Röhre im Editor-Ablauf; Register „Befunde aus P0a“):**

| Fall | Dreiecke Stufe 1 (≤ 8 000) | Umriss Stufe 1 ↔ 3 S/F/T, Gerätepixel bei 300 px Höhe (Tor 1, Warnung 2) | Knicke abseits der Falten 95 % / max (Tor 12° / 25°) |
|---|---|---|---|
| Kugel (Höhe 0,53) | 3 200 ✓ | 0,52 / 0,72 / 0,38 ✓ | 11,2° / 11,6° ✓ |
| Ei (0,46) | 3 200 ✓ | 0,59 / 0,82 / 0,43 ✓ | 11,9° / 15,9° ✓ |
| Rex (0,36) | 3 200 ✓ | **2,76** / 1,24 / 1,08 ✗ | **22,0° / 88,2°** ✗ |
| Langhals (0,75) | 3 200 ✓ | **1,10** / 0,50 / 0,82 ✗ | **21,7° / 44,9°** ✗ |
| Robbe (0,62) | 3 200 ✓ | 0,68 / **1,45** / 1,43 ✗ | **23,4° / 53,3°** ✗ |
| Tigerkopf (0,60) | 3 200 ✓ | 0,83 / **3,02** / 0,86 ✗ | **17,5° / 73,9°** ✗ |
| Kegel (0,61) | 3 200 ✓ | 0,92 / **3,04** / 2,20 ✗ | **20,2° / 47,0°** ✗ |
| Rex mit Maul, Fressen 50 % / 100 % (gemalte Augen) | 4 540 ✓ | 1,50 / 1,58 / **2,06** · 1,68 / 1,67 / **2,09** ✗ | – |
| Umschalten (Rex) | Käfig nicht neu gebaut (Ableitung 0 ms); Kern 59 ms mit Umrissvergleich, danach 15 ms ✓ | | |

Lesart: Das Budget hält ohne Maul überall. **Umriss- und Facetten-Tor fallen an denselben fünf Körpern** — nicht an der
Spielstufe, sondern am heutigen Käfig: 16 Punkte je Ring und 24 Ringe sind bei 300 px Höhe zu grob (Sagitta; Rex ist mit
0,36 Kacheln Höhe klein, wird also am stärksten vergrößert), und abseits der Falten stecken Knicke von 45–88°, die Stufe 3
verdeckt (Rex: erstes Ringband an der Schnauze). Beides ist Eingabe für den neuen Bau: Dichteregel ≥ 24 Punkte je Rumpfring
und Ringe nach der Krümmung aller drei Ansichten (Gegenprüfung 3.6), Käfiggüte als Tor in P1/P3. Verfehlte Tore stehen als
`it.fails`, nichts gelockert.

**Bilder:** `docs/progress/editor/p0a-spielstufe-roehre-2026-11-03.jpg`, `…-teile-…`, `…-maul-…` (je Fall Stufe 3 | Stufe 1
Grenznormalen | Stufe 1 roh, Seite und 45°, Earle-Look) und `p0a-spielgroesse-2026-11-03.jpg` (alle Fälle bei 300 Gerätepixeln
Höhe); Skript `apps/editor/scripts/pruefen/p0a-spielstufe.mjs`.

**Im Editor gemessen (Playwright, eigener Vite 5192, Earle-Look, Bühne):**

| Fall | Spiel: Dreiecke | Umriss Stufe 1 ↔ 3 (größtes Blatt, Gerätepixel bei 300 px) | Umschalten an / roh / zurück (ms, ruhige Maschine) | Cel-Wechsel Stufe 1 ↔ 3 (Anteil der Wesenpixel; Seite / 45°; Tor 1 %) |
|---|---|---|---|---|
| Kugel | 3 200 | 0,7 | 121 / 65 / 43 | 0,22 % / 0,46 % ✓ |
| Ei | 3 200 | 0,8 | 96 / 41 / 34 | 0,21 % / 0,38 % ✓ |
| Rex | 3 200 | 2,8 | 105 / 45 / 47 | 0,17 % / 0,32 % ✓ |
| Langhals | 3 200 | 1,1 | 100 / 41 / 48 | 0,47 % / **1,99 %** ✗ (dünner Hals) |
| Robbe | 3 200 | 1,5 | 94 / 36 / 39 | 0,34 % / 0,38 % ✓ |
| Tigerkopf | 3 200 | 3,0 | 144 / 75 / 65 | 0,63 % / 0,72 % ✓ |
| Kegel | 3 200 | 3,0 | 114 / 36 / 33 | 0,24 % / 0,57 % ✓ |
| Ente (Teile) | 3 344 | 1,5 | 157 / 65 / 65 | 0,44 % / **1,02 %** ✗ |
| Fisch (Teile) | 6 288 | 0,7 | 165 / 83 / 89 | 0,22 % / 0,41 % ✓ |
| Vierbeiner (Teile) | 3 968 | 1,3 | 134 / 67 / 79 | 0,37 % / 0,59 % ✓ |
| Rex Library, Augapfel | Stufe 3 bleibt (Grund), 76 736 | – | 107 / 108 / 97 | – |
| Rex Library, gemalte Augen, Fressen 50 % / 100 % | 4 540 | 2,1 / 2,1 | 116 / 88 / 58 | 0,44 % / 0,70 % ✓ · 0,46 % / **1,01 %** ✗ (offenes Maul, 45°) |

Lesart: Das Umschalt-Tor (≤ 100 ms) hält im Editor beim ersten Mal nur an Ei, Robbe und Langhals (94–100 ms); sonst
105–165 ms, weil der Umrissvergleich im selben Bau läuft — danach (roh, zurück) 33–89 ms (Register: Vergleich als eigenen
Worker-Auftrag nachreichen). Die Cel-Prüfung (Pixel, deren Farbstufe zwischen Stufe 1 mit Grenznormalen und Stufe 3 wechselt,
Bühnengröße) liegt bei 0,2–0,7 %; Langhals 45° (2,0 %), Ente 45° (1,0 %) und das offene Rex-Maul bei 45° (1,0 %) verfehlen das Tor knapp an dünnen Hälsen und Lippen — dort
laufen die Cel-Grenzen längs über wenige Käfigpunkte. Die rohen Normalen sind im Bild kaum schlechter (0,2–0,8 %), weil die
Käfigkanten fast überall unter 25° knicken; der Unterschied zeigt sich erst an den Knick-Maxima.

**Nicht gemacht / offen:** P0b (iPhone, mit Florian); Cel-Stufen-Pixelzählung Stufe 1 ↔ 3 (Tor ≤ 1 %) nur als Bild, nicht als
Zahl; Spielstufe mit Augapfel-Höhle und Rundmaul; Normalen-Deltas je Morph-Ziel sind im Editor nicht nötig (die Pose wird
auf Stufe 3 gerechnet und umsortiert), fürs Backen aber einzuplanen.

## Stand P1 Tag 1 — Umrissschleifen geplant (03.11.2026, gebaut; Abnahme offen)

**Freigabe:** Florian am 03.11.: „Die P0a-Bögen passen so weit. Weiter mit P1 „Ansichten als Illustration“ nach dem Prüfplan.“

**Gebaut (Kern, `packages/shape/src/kern/umrissPlan.ts`, hinter `Bauplan.umrissPlan`; ohne Option bitgleich):** Die
Umrissschleifen jeder Ansicht werden nicht mehr aus dem fertigen Körper geschnitten („Körper zuerst“, V2), sondern allein aus
den drei Zeichnungen geplant („Umriss zuerst“, Gegenprüfung 3.2/3.4):
1. Zeichnung dicht abgetastet (alle 2,5 px, Kurvenparameter je Probe); je Probe die erlaubte Tiefe aus der Sichthülle
   (Intervalle Seite × Front × Top), **2 px innen** neben der Linie abgetastet — genau auf der Linie liegen die Kanten eines
   Kastens auf der Grenzlage der anderen Ansicht, die Intervalle zerfallen in Splitter (der Würfel bekam so acht „Teile“);
   leer = Widerspruch (Weg nach innen in px, wie `erreichbarkeit`).
2. Je Probe das Intervall mit den wenigsten Sprüngen (Viterbi über die Schleife), dann die Tiefe mit der **kleinsten Biegung
   innerhalb der Intervalle** — Ausgleich mit aktiver Menge (pentadiagonale Lösung in O(n); verletzte Schranken klemmen,
   unnötige Klemmen nach dem Vorzeichen des Gradienten wieder lösen; geschlossene Folgen an der engsten Stelle mit Überlappung
   aufgeschnitten). „So rund wie möglich“ in der Tiefe; die gespannte Folge (Laplace mit Zug zur Mitte) knickte an jedem
   Klemmpunkt (Robbe Front [3 2 2 3], Würfel 55 px Welle).
3. **T-Stöße sind die konkaven Ecken der Zeichnung** (> 25°, Drehung gegen den Umlauf), nicht Tiefensprünge (die erste Fassung
   schnitt an Sprüngen: Langhals bekam Splitter-Teile aus der Glättungsrampe, die Ente von oben keinen T-Stoß, weil die
   Vereinigungs-Intervalle den Sprung glätten). Sehnen zwischen konkaven Ecken (kürzeste zuerst, innerhalb des Umrisses,
   beidseits ein Bogen ≥ 1,25 × Sehne — die Seite eines Halses ist kein Teil —, ohne Kreuzung, jede Ecke einmal) zerlegen die
   gezeichnete Fläche in einen Baum von Flächen (Wurzel, je Sehne der kürzere Bogen abzüglich der Kinder: Rumpf → Hals →
   Kopf). **Jede Fläche wird eine geschlossene Schleife:** ihre gezeichneten Bögen, dazu über jede Sehne ein tangentenstetiger
   Vorschlag (Hermite aus den eigenen Nachbarproben) — beim ferneren Teil die **verdeckte Fortsetzung** (Art 1, blass), beim
   näheren die **sichtbare Schlusskontur** (Art 2, dünn; näher = Reichweite der Intervalle zum Betrachter: Top größtes y, Front
   kleinstes x); in der Seite liegen alle Schleifen in der Spiegelebene, dort ist jeder Schluss verdeckt. Tiefe je Fläche
   geglättet; die Ecke einer Sehne gehört beiden Flächen und nimmt je Fläche das Intervall ihres Nachbarn (der Viterbi kann an
   der Ecke nur eine Seite bedienen — sonst eine Rampe von 68 auf 281 px). Vorschlagspunkte ohne erlaubtes Intervall in
   Reichweite (6 px) rücken bis 12 px zur Sehne.
Keine Zusatzpunkte der Vereinigung: die gezeichnete Linie bleibt, wie sie ist. Die Planung hängt nur an der Zeichnung — bei
jedem Wackeln des Körpers 0 px.

**Gebaut (Liniennetz und Editor):** `netzSicht` nimmt den Plan und legt je Schleife einen Zug `plan-<Ansicht>` an (Art je
Probe, Sichtbarkeit in den fremden Blättern vom Körper). Tafel Körper → Chip **„umrisse geplant“** (`ui.netzUmrisse` neben
aus | an; `bauplanAus` → `umrissPlan: true`, das Liniennetz wird neu gerechnet, der Stand des Körpers bleibt): im eigenen Blatt
nur die Vorschläge (verdeckt blass 2 px / 30 %, Schluss dünn 1,25 px, beide beginnen auf der gezeichneten Nachbarprobe), in
fremden Blättern die Schleifen auf dem Körper (verdeckt gestrichelt). Läufe (`planLaeufe`) und Strichbild (`PLAN_STIL`) liegen
im Kern, **das SVG (`umrissSvg`: Zeichnung als kubische Kurven, Vorschläge als Linienzüge, Rahmen in Attributen) ist dasselbe
Bild**; Haken `__editor.umrissPlan()`, `__editor.umrissSvg(blatt)`. Der Körper ist noch der heutige (Tag 2–3 bindet ihn).

**Tore (Tests `kern/umrissPlan.test.ts`, elf Körper; Register „Befunde aus P1 Tag 1“):**

| Tor | Ergebnis |
|---|---|
| (a) Jitter-Ruhe: Käfig 20-mal um 0,1 px gewackelt → jede Linie ≤ 0,2 px | geplante Schleifen **0 px** (hängen nur an der Zeichnung) ✓. V2-Linien heute an der Robbe: Median 0,07 px, 90 % 0,48 px, max 26 px (Stücke entstehen und verschwinden), **20 % der Linienpunkte über 0,2 px** — Florians „sehr sehr wild“ als Zahl |
| (b) zwischen zwei Kreuzungen (Naht, breiteste Stelle) höchstens zwei Krümmungswechsel der Tiefe (zweite Differenz ≥ 0,05 px) | 10 von 11 Körpern in allen Stücken ≤ 2 (Kugel, Ei, Würfel, Vase, Pilz 0; Kegel, Rex, Tigerkopf, Vase ≤ 1; Ente Front 1 0 0 0; Langhals 0 1 1 0). **Robbe Top [1 0 0 3]** am Anstieg zum Kopf (Intervalle 17–50 px eng, keine konstante Tiefe passt in sie — die Zeichnung erzwingt die Welle; der Test lässt genau einen solchen Fall zu, Tor wörtlich verfehlt) |
| (c) Schleifen geschlossen, verdeckte Stücke und Schlüsse tangentenstetig, keine Zusatzpunkte | ✓ alle. Langhals Top: Rumpf + Hals 182 Proben mit 19 verdeckt unter dem Kopf, Kopf 84 Proben mit 19 Schluss; Ente Top: Rumpf + Flügel 59 verdeckt unter dem Hals, Hals + Kopf 59 Schluss (Übergänge ≤ 20°); dazu Langhals Front (Kopf über dem Hals), Ente Seite (Hals auf dem Rumpf), Pilz Seite und Front (Hutkante sichtbar über dem Stiel, Stielschluss verdeckt), Tigerkopf Top |
| (d) Blatt und SVG decken sich ≤ 0,1 px | ✓ Kern 0,0 px (dieselben Läufe); Editor (DOM-Pfade gegen den SVG-Export über die Projektion des Blatts): Langhals Front/Top 0,008 / 0,010 px, Ente Seite/Top 0,012 / 0,011 px (22–122 Punkte) |
| (e) Planung ≤ 16 ms je Bau | ✓ Kern 1,3–4,7 ms (Minimum von fünf), im Editor 8,5–13 ms. Das Umschalten des Chips rechnet das ganze Liniennetz neu (0,7–0,9 s über den Worker; der Stand des Körpers bleibt) |

**Widersprüche (px nach innen):** Langhals Seite 4,2, Ente Seite 2,7, Rex Front 6,6 / Seite 0,9 (unerreichbare Proben am
Scheitel und an Flossen, trotz Innen-Abtastung); übrige 0,0.

**Bilder:** `docs/progress/editor/p1-umrissschleifen-2026-11-03.jpg` (Langhals, Ente, Kegel, Robbe; je Blatt heute (V2-Linien)
| geplant, Ausschnitt um den Körper, doppelt groß); SVG-Ausgabe je Blatt in `apps/editor/pruefen-ausgabe/p1/` (nicht in Git).
Skripte `apps/editor/scripts/pruefen/p1-plan.mjs` (Editor), `umriss-plan-diag.ts` (Proben, Intervalle, Tiefen je Schleife).

**Lesart:** Die Schleifen sind ruhig und geschlossen, weil sie nicht mehr vom Körper abhängen; die drei Prüfplan-Fälle mit
verdeckten Stücken (Langhals, Ente, Pilz) schließen ohne Teilerkennung, allein aus den konkaven Ecken der Zeichnung. Was die
Zeichnungen nicht hergeben, bleibt offen (unten): die Tiefe eines Teils über einem anderen aus der Vereinigung der Intervalle,
die Lage der Schlusskontur auf der Haut des anderen Teils — beides Sache von Tag 2–3, wenn die Schleifen Käfigkurven werden.

**Nicht gemacht / offen (Register „Befunde aus P1 Tag 1“):**
- **Tiefe aus Vereinigungs-Intervallen:** Front und Top liefern die Vereinigung der Teile (Hals über dem Rumpf: ein Intervall
  vom Bauch bis zum Kopf), die Tiefe des Halses landet in der Mitte der Vereinigung (Ente Top: Hals 54–63 px, Rumpf 66–86).
  Weg: Intervalle je Teil aus der Zerlegung der anderen Ansichten (Seite zuerst: die verdeckte Fortsetzung der Rumpfoberseite
  unter dem Hals ist die Unterkante des Halses).
- **Ganz verdeckte Schleifen** (Pilz-Stiel von oben) gibt es nicht — nur Teile, die die Zeichnung berühren. Die Kragenlinie
  (Schnitt Stiel/Hut, Hals/Rumpf) ist keine eigene Linie; der Schluss des näheren Teils steht dafür (beim senkrechten Hals
  fällt beides zusammen).
- **Jede konkave Ecke ist ein T-Stoß:** ein Herz von oben zerfiele in zwei Teile. Florian entscheidet an seinen Wesen; eine
  weiche Kerbe (ohne Ecke) bleibt ein Teil.
- **Schlusskontur in 3D nur interpoliert** (Tiefe zwischen den Ecken, ins nächste Intervall geklemmt), nicht auf der Haut des
  anderen Teils — Tag 2–3 setzt sie als Käfigring.
- (b) wörtlich an der Robbe von oben verfehlt (oben); Widersprüche an Scheitelproben 2,7–4,2 px.

## Stand P1 Tag 2–3 — Körper aus den Schleifen (03.11.2026, gebaut; Tore verfehlt, Abnahme und Entscheidung offen)

**Auftrag (Florian, 03.11.):** „Weiter mit P1 „Ansichten als Illustration“ nach dem Prüfplan.“ Tag 1 ist gebaut (oben); Tag 2–3
hier, ehrlich: die Tore der Tabelle hält nur die Kugel, der Prüfplan nennt für diesen Fall den Abbruch (unten).

**Gebaut (Kern, `packages/shape/src/kern/schleifenKoerper.ts`, hinter `Bauplan.schleifenKoerper`; ohne Option bitgleich,
Test):** Ein gekoppelter Löser über alle 3n Käfigkoordinaten (Zeilen dürfen Achsen mischen — Skalarprodukte mit der
Umrissnormale; dünn, Cuthill–McKee über den 3n-Graphen, Cholesky). Topologie und Ringverteilung bleiben die der heutigen
Röhre (ihr Bau ist der Startwert); dann:
- **Seite (Naht):** feine Punkte der Mittelebene: z = 0 hart, längs der Kurvennormale auf die gezeichnete Seitenkurve, längs
  der Kurve frei (hart längs gebunden scherte der Löser die Ringe — Ei: 400 umgeklappte Flächen).
- **Top und Front (hart):** je gezeichnete Probe der geplanten Schleife der nächste feine Punkt der aktuellen Fläche
  (Zuordnung je Runde neu). Gebunden wird nur, was den Umriss ausmacht: (1) die Komponente längs der Umrissnormale w trifft die
  Probe (Lage), (2) P·w ist quer zur Schleife stationär (Differenz der Grenzlagen des gegenüberliegenden Nachbarpaars · w = 0:
  die Silhouette liegt an diesem Punkt). Weder die Lage längs der Schleife noch die Tiefe werden direkt gebunden — beides
  zöge die Fläche in ihrer Ebene mit (V4: Robbe 65 px). Die Ziele rücken schrittweise (4 px je Runde, 6 Runden), ferne
  Proben (über 6 px in Runde 1) weich (Gewicht × (6/Abstand)⁴), Proben ohne Fortschritt werden aufgegeben.
- **Füllung:** Zielform des heutigen Baus (Grenzlage jedes Käfigpunkts, Gewicht 1) und die Glättung der Stufe 2 **relativ zur
  Zielform** (wie `GLATTE_HAUT`). **Abweichung vom Plan** („weich Krümmungsvariation ohne Zielform“): Ohne Zielform wurden die
  Querschnitte Ellipsen (Ellipsen-Vorrang je Ring, exakt für jedes affine Bild des regelmäßigen N-Ecks) — die Front der Robbe
  (unten breit mit Flossen, oben schmal) widerspricht dem (Δ Front 45 px mit Naht allein), und reine Laplace-Glättung kennt
  keine Rundung (Querschnitte sanken zu Sehnen ein, Volumen −64 %, die harten Schleifenpunkte standen als Nadeln heraus).
  Die Schleifen binden nur die Extreme; die Form dazwischen kommt aus der Front-Zeichnung, und die steckt in der Zielform.
- **Front-Tiefe im Planer** (`umrissPlan.ts`, `frontSoll`): nicht mehr die Mitte des erlaubten Intervalls, sondern die
  Station, deren elliptischer Querschnitt (Höhe und Mitte aus der Seite, Breite aus dem Top) die Probe berührt (f = ((q_y −
  c)/h)² + (q_z/b)² minimal, parabolisch verfeinert, Plateau-Mitte bei Kästen), längs der Schleife gemittelt (± 8 Proben).
  Die Intervallmitte war für den Kegel falsch (die Hülle erlaubt bei 45° jede Tiefe zwischen 71 % und 100 % der Länge; das
  runde Bild hat sie am Rand) — der Löser legte dann einen Ring voller Breite ins Innere des Kegels. Zwei Stützpunkt-Regeln
  sprangen beim Ei zwischen fast gleich nahen Stationen (±30 px); f ist glatt in x und eindeutig.

**Gebaut (Editor):** Tafel Körper → Chips „Körper heute | aus den Schleifen (P1)“ (`useKernAnzeige.schleifenKoerper`,
`?schleifen=1`) mit Rest an den Schleifen, Überstand, gebundenen/aufgegebenen/weichen Proben und Lösezeit; der Worker merkt
den Schleifenkörper je Form, Pinsel und Plan (`WesenStand.schleifenKoerper`, nur genauer Bau, Röhre ohne Maul und Beine);
Haken `__editor.schleifenKoerper()`; der Chip zeigt die geplanten Schleifen mit.

**Tore (Tests `kern/schleifenKoerper.test.ts`, zehn Körper im Editor-Ablauf; Register „Befunde aus P1 Tag 2–3“):**

| Fall | Δ S/F/T heute → neu (px, Tor 0,5) | Überstand F/T (Tor 0,5) | umgeklappt (Tor 0) | Falten frei/Kappe heute → neu | Knicke Stufe 1 95 %/max (Tor 20°/30°) | Wendepunkte (Tor 0) | gebunden F · T, aufgegeben, weich |
|---|---|---|---|---|---|---|---|
| Kugel ✓ | 0,3/0,2/0,3 → 0,2/0,1/0,1 | 0,1/0,1 | 0 | 2,9/3,1° → 2,9/2,2° | 11,2/11,5° | 0 | 308/308 · 308/308 |
| Ei | 0,3/0,4/0,4 → 0,2/**1,1**/0,1 | **1,1**/0,1 | 0 | 3,5/5,0° → 3,9/4,1° | 11,8/14,4° | 0 | alle |
| Kegel | 2,1/7,3/2,6 → **2,5/3,9**/0,4 | **4,1**/0,6 | 0 | 14,1/9,7° → 11,6/5,5° | 18,7/**38,1°** | 2 | 398/452 · 462/462, 54 aufgegeben, 52 weich |
| Würfel | 1,1/2,7/1,6 → 1,5/4,3/4,2 | 5,3/4,2 | 54 (Kappe hinten) | 11,1/54,1° → 26,7/9,9° | 20,5/77,7° | 6 | alle |
| Pilz | 5,6/6,3/2,0 → 9,8/29,4/4,8 | 50,3/5,2 | 1 511 | 6,2/15,7° → 175,2/25,7° | 50,8/175,8° | 8 | 282/316 · 285/290 |
| Robbe | 4,0/6,2/12,5 → 7,7/1,0/5,1 | 1,0/15,5 | 248 (Ring 14–15) | 10,8/11,1° → 178,9/16,7° | 24,7/175,7° | 6 | alle, 141 weich |
| Rex | 1,1/7,3/1,6 → 4,6/9,0/1,8 | 7,4/1,8 | 210 (Ring 9–11) | 14,0/10,7° → 179,3/14,0° | 26,5/174,4° | 5 | 173/198 (Widerspruch 6,6 px) · 322/322, 25 aufgegeben |
| Tigerkopf | 2,5/2,1/6,2 → 2,9/1,3/6,2 | 7,7/12,7 | 81 (Ring 13) | 24,1/4,4° → 178,2/4,7° | 16,2/145,4° | 9 | 360/364 · 412/412 |
| Langhals | 1,5/4,0/3,1 → 4,1/4,4/2,0 | 6,7/2,0 | 148 (Ring 17–19) | 14,5/8,6° → 179,2/7,2° | 23,2/175,8° | 11 | 341/344 · 226/228, 38 weich |
| Vase | 1,3/2,3/13,8 → 1,6/2,4/6,5 | 3,9/9,1 | 58 (Ring 2–3) | 10,9/9,0° → 78,8/12,1° | 22,7/74,7° | 4 | 404/436 · 310/310, 282 weich |
| Lösen (Tor 50 ms) | Kugel 603 ms (Zerlegungen 387 ms; 1 206 Unbekannte, Hülle 268 305); alle 400–670 ms | | | | | | |

Ente (Röhre): Top 46,6 → 43 px (Flügel) — nicht in der Liste. **Bestanden: 1 von 10** (Tor „≥ 11 von 12“). Der Prüfplan nennt
den **Abbruch**: „ein widerspruchsfreier Körper bleibt über 1 px, oder eine Umrissschleife lässt sich nicht als Käfigkurve
legen, ohne den Körper zu verzerren“ — beides trifft zu (Ei Front 1,1 px; umgeklappte Flächen an sieben Körpern).

**Im Editor gemessen** (`p1-koerper-editor.mjs`, Kugel, Ei, Kegel, Robbe, Langhals, Vase): dieselben Δ wie im Test; Umschalten
1,3–1,6 s (Worker: Schleifenkörper 510–650 ms, dazu Liniennetz und Δ neu). Bogen `docs/progress/editor/p1-koerper-2026-11-03.jpg`
(je Fall Blätter mit Δ, Bühne Earle 45°, Zebra 45°, heute | aus den Schleifen); Drahtgitter heute | neu in den drei Ansichten
`p1-koerper-draht-{kegel,robbe,langhals,pilz}-2026-11-03.jpg` (Skript `p1-koerper-bild.ts` + `html-shot.mjs`).

**Lesart (was die Bilder zeigen):**
- Wo die Röhre die Schleifen glatt erreichen kann, wirkt der Löser: Kugel und Ei bleiben sauber (Zebra ruhig), Kegel Front 7,3
  → 3,9 px, Robbe Front 6,2 → 1,0 und Top 12,5 → 5,1, Vase Top 13,8 → 6,5 — bei weitgehend gleichen Falten (Kegel sogar besser).
- Die umgeklappten Flächen sitzen immer dort, wo eine Schleife etwas verlangt, das die Röhre mit 16 Punkten je Ring und ihrer
  Ringverteilung nicht hat: Flossen der Robbe (Ring 14–15, Zebra zeigt Falten am Bauch), Hut-Überhang des Pilzes (Stielringe
  werden an die Hutschleife gezogen), Brust unter dem Hals beim Langhals (Ring 17–19), Kasten-Kappen des Würfels. Dort werden
  Proben zwar weich gebunden oder aufgegeben, der Rest zieht den Nachbarbereich trotzdem in die Falte.
- Die Seite wird an Robbe, Rex, Langhals schlechter (4 → 7,7; 1,1 → 4,6; 1,5 → 4,1 px): Spitzen und Falten der Front/Top-Bindung
  stehen in der Seitenansicht über.
- Der Weg, den der Plan vorsah — „die Ringe, die eine Schleife braucht, werden von der Schleife gesetzt“ — wurde nicht gebaut:
  Der Löser legt nur Käfigpunkte, keine neuen Ringe und keine Teile. Genau das fehlt an Flossen, Hut und Brust.

**Entscheidung für Florian (Prüfplan-Abbruch):**
- **A — Kandidat B:** Umrisse wie heute (Zielform aus der Sichthülle, V4), Stücknetz nur für Einsätze (P2); die geplanten
  Schleifen von Tag 1 bleiben als ruhige Anzeige und für die Bedienung (Tag 4: ziehen), der Körper folgt ihnen nicht hart.
- **B — weiter in P1:** Struktur folgt den Schleifen (Ringe und Teile aus den Schleifen: Flossen/Flügel/Hut als Ausstülpung des
  Baums (S6/S7), Kragen-Ringe an Hälsen), dann derselbe Löser — die eigentliche Arbeit von „die Ringe werden von der Schleife
  gesetzt“, geschätzt 3–5 Tage, Ausgang offen.
- **C — Mischform:** der Schleifenkörper nur dort, wo er heute hilft (Körper ohne Teile, kleine Abstände), weiche Bindung als
  Standard (keine Falten), Δ-Verbesserung sichtbar, aber keine exakten Umrisse.
Bis zur Entscheidung bleibt der Chip ein Versuch (Standard „Körper heute“); nichts am Standardbau geändert.
