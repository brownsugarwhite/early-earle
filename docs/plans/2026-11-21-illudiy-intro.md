# illudiy: Intro-Konzept „Der Moment, in dem es passt“ (21.11.2026)

Gebaut und spielbar in [`docs/look/illudiy/illudiy-intro.html`](../look/illudiy/illudiy-intro.html), Übergabe in
[`docs/look/illudiy/UEBERGABE.md`](../look/illudiy/UEBERGABE.md), Recherche in
[`docs/look/illudiy/RECHERCHE.md`](../look/illudiy/RECHERCHE.md). Alles wartet auf Florians Urteil.

## Analyse: die Täuschungen im Logo

- **Raster:** 2:1-Dimetrie (26,57°), aber von Hand: gemessene Schrägen 23,9° bis 30,5°. Kanten, die parallel sein müssten,
  laufen leicht auseinander.
- **Licht ohne Quelle:** Pink und Weiß sind keine festen Seiten (i: links Pink, rechts Weiß; ll umgekehrt; D: links Weiß,
  vorne Lavendel, oben Pink). Die Körper kippen zwischen erhaben und vertieft.
- **i:** Quader ohne sichtbaren Deckel (Deckel in Konturfarbe), Säule und Schacht zugleich (Necker). Der pinke Punkt liegt
  auf dem unsichtbaren Deckel.
- **ll:** jede Fläche in sich um 90° verwunden: Oberkante wie linke Seitenfläche (27°), Unterkante wie rechte (24° bzw.
  26,5°), das pinke Zwischenstück andersherum. Der Fuß des ersten l steht vor dem zweiten l, dessen Boden unter ihm liegt.
- **u:** nach hinten (links) und gleichzeitig nach vorn (rechts) extrudiert; die Vorderfläche ist vorne und hinten zugleich.
- **D:** sauber extrudiert, aber mit eigenem schrägem Licht (40°) auf der Vorderseite; die Gegenform schneidet unten bis zur
  Kante.
- **zweites i:** Negativ: Stamm in Konturfarbe (Figur-Grund), zwei parallele pinke Wände (Innenecke), der weiße Punkt hinter
  der linken Wand und dem Stamm, aber vor der rechten Wand (unmögliche Verdeckung). Positives i mit pinkem Punkt, negatives
  i mit weißem Punkt.
- **y:** seine linke Wand ist die rechte Wand des zweiten i; der linke Arm ist mit 30,5° steiler und kippt nach vorn.
- **Rahmen:** Petrol-Platte über einem Verlaufsrand; die dunkle Unterseite ist der Schlagschatten der Platte entlang der
  Isometrie-Achse, seine Grenzen beginnen exakt an den Plattenecken (≤ 0,7 px) und laufen unter 31,3° und 27,5°.
- **Weiß:** ein gemeinsamer senkrechter Verlauf über das ganze Wort (y 404 → 622, Weiß → #EFE8F2), als läge ein großes
  Licht über allem; reinweiß sind Fuß des ersten l, linke D-Seite, D-Bogen unten und der weiße Punkt.

## Leitidee

Das Logo ist eine Parallelprojektion. Unmögliches gibt es darin nur aus genau einem Blickwinkel (45°/30°). Das Intro zeigt
die Buchstaben zuerst als glaubhafte Körper in einem echten Raum (Kinetic Depth) und lässt sie ohne Schnitt in diesen
Blickwinkel einrasten (magischer Blickwinkel, wie das Perth-Dreieck und die Channel-4-Idents ab 2004: die Kamera ordnet
ruhende Teile). Dann kehrt die Platte Figur und Grund um, der Schatten fällt, das Licht setzt sich. Alphablenden braucht
es nicht: alles entsteht aus Kantenansicht, Wachsen oder Verdecken.

## Ablauf Intro A (4,7 s)

| Zeit (s) | Akt | Was passiert | Täuschung |
|---|---|---|---|
| 0–1,0 | Aus dem Nichts | Kamera auf Bodenhöhe, alles liegt flach: nichts zu sehen. Buchstaben steigen als Welle auf (Federn, 75 ms versetzt), Böden klappen aus ihrer Hinterkante. | Kantenansicht, Kinetic Depth |
| 0–2,05 | Kamerafahrt | Kamera hebt sich, kreist von 74° auf 45°, Dolly-Zoom von Perspektive (1/1300) in Parallelprojektion, 1° Überschwingen öffnet die Fugen noch einmal, Einrasten bei 2,05 s. | Magischer Blickwinkel, Vertigo-Effekt |
| 1,45–3,0 | Punkte | Pinker Punkt fällt auf den unsichtbaren Deckel, staucht, springt zweimal; weißer Punkt fällt ins negative i und versinkt halb hinter dem Stamm. | Tunnel-Effekt, unmögliche Verdeckung |
| 2,35–2,9 | Platte | Petrol-Platte wächst in Iso-Rauten hinter den Buchstaben hervor; Deckel des i und Stamm des zweiten i verschwinden in ihr. | Figur-Grund-Umkehr |
| 2,55–3,6 | Rand und Schatten | Verlaufsrand wächst nach, Schatten streicht entlang der Isometrie-Achse ein, die Marke atmet einmal (1,2 %). | Schlagschatten |
| 3,0–4,3 | Licht | Weißverläufe und D-Licht gleiten in ihre Lage, ® springt mit kleiner Feder auf. | Licht von oben |

**Intro B** hängt eine scharfe Kippwelle an (3,95–5,1 s): ein Streifen in Iso-Richtung läuft über das Wort und tauscht
Pink und Weiß, für einen Moment kippen die Körper zur Gravur. **Kurzfassung** (2 s, für den App-Start): feste Kamera,
Aufsteigen, Platte, Punkte, Schatten.

## Tests

1. Magischer Blickwinkel (nur Kamerafahrt), 2. Aus dem Boden (2,5D ohne Fahrt), 3. Kippwelle (Licht von oben),
4. Figur und Grund (Platte an und aus), 5. Punkte mit Physik, 6. Platte, Rand, Schatten. Dazu die Ansicht „Flächen nach
Richtung“: jede Fläche nach ihrer Lage gefärbt, verwundene Flächen als Verlauf.

## Physik

| Element | Bewegung | Werte |
|---|---|---|
| Buchstaben | gedämpfte Feder, versetzt | ζ 0,58, ω 8,2 (9 % Überschwingen) |
| Kamera | Schwung mit Abbremsen, kleines Überschwingen, weich zurück | 1° Azimut, 0,45° Höhe |
| Punkte | Schwerkraft 2600 px/s², zwei Sprünge, Stauchen und Strecken | Stoßzahl 0,42 und 0,38 |
| Platte, Rand | fast kritisch gedämpft, Rand 0,2 s später | ζ 0,9 |
| ® | Feder | ζ 0,5 |

## Bewusst weggelassen

Ames-Raum, Reverspektive, Hohlmaske (brauchen Perspektive oder Schattierung), Op-Art (laut, flimmert), Partikel,
Lichtreflexe, Einblendungen.

## Offen (Florians Entscheidung)

- Hauptfassung A oder B; Kamera von rechts (jetzt) oder von links; Petrol-Stamm vor der Platte sichtbar (jetzt) oder nicht.
- Danach: Ton (Shepard-Glissando, das beim Einrasten aufgeht), Export für App-Start, optional Sugihara-Geometrie.
