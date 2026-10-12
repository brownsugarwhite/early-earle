# Wesen-Editor: Bilanz der Versuche und Vorbereitung der großen Sitzung

> Stand 12.10.2026 spätnachts. **Einstieg für die große Sitzung ab 13.10.**
>
> Florian (12.10. spätnachts): „OK, wir haben viel Cooles gemacht. Das ist nicht schlecht. Schreibe alle Erkenntnisse nochmal zusammen. … Es soll der perfekte und innovativste Character-Editor aller Zeiten werden! Also alles bis jetzt waren nur Tests und Recherche! … Das mit den Mäulern und dem echten 3D-Wesen passt bis jetzt noch nicht. Wir haben noch nicht die perfekte Lösung für die Erstellung der vielen verschiedenen Kreaturen. Aber ich hoffe, wir können sie dann zusammen finden. Schreibe vor allem nochmal deutlich auf, was noch nicht funktioniert! Die Kombination aus Spanten, Kanten, Shapes und Wirbelsäule muss viel besser zusammenspielen und viel besser zu bedienen sein, um auch komplexe Wesen und Formen erstellen zu können! Auch wie wir Beine und Strukturen über den ganzen Körper, wie große Rückenschuppen oder Fellsträhnen wie beim Golden Retriever, perfekt umsetzen, ist mir noch nicht klar. Halte alles fest.“
>
> Alles bis hierher war **Versuch**. Der Code beweist Machbarkeit und zeigt Grenzen; die endgültige Bauweise entsteht in der großen Sitzung, gemeinsam mit Florian.

## Kurzfassung

1. **Das Bedienprinzip stimmt.** Formen als Kurven ziehen wie in Illustrator, drei Ansichten, ein 3D, das live folgt: Das war Florians „bahnbrechende“ Idee, und sie funktioniert. Kurven, Navigation, Library und Speichern sind gebaut, 23 E2E-Tests laufen grün. Das bleibt der Kern.
2. **Das 3D-Wesen ist noch nicht gut genug.**
   - Es entsteht auf fünf verschiedenen Bauwegen, die sich nicht kombinieren lassen.
   - Es weicht bis 16 px (ohne Maul) bzw. 24 px (mit Maul) von den Zeichnungen ab.
   - Es ist weiß mit Matcap statt im Earle-Look.
   - Beine, Fell, Stacheln und echte Augen fehlen.
3. **Shapes, Spanten, Kanten und Wirbelsäule sind vier Werkzeuge mit vier eigenen Regeln.** Für Florian ist nicht vorhersehbar, was eine Änderung bewirkt:
   - Die Front ist Querschnitt für alles.
   - Spanten strecken sich mit.
   - Härte macht keinen Winkel.
   - Die Wirbelsäule entscheidet unsichtbar, woher die Breite kommt.

   Komplexe Formen sind so kaum zu bauen.
4. **Das Maul ist im Prinzip gelöst, aber nicht sauber und nicht überall.**
   - Gebaut sind: feste Topologie, Reißverschluss, Tasche, Kiefer als Knochen plus Korrektur, Zähne am Zahnfleisch, Maulspalt im Umriss, bearbeitbare Fressen-Form.
   - Offen sind:
     - Durchdringungen (130–2142 Dreieckspaare)
     - Mäuler, die nicht vorn an der Schnauze beginnen
     - ein Maul-Körper, der ein eigener Käfig ist
     - der Look (Bohne, Lippenband, Rachen, Zunge)
5. **Beine, Arme, Flügel, Schwänze und körperweite Strukturen gibt es im neuen Editor noch gar nicht.** Gemeint sind Büschel, Mähnen, Kämme, Stacheln, Federn und Flossen. Florians Bögen zeigen dafür eine klare Richtung:
   - Beine sind Säulen aus dem Rumpf, dünne Glieder eigene Teile.
   - Fell, Mähnen, Kämme, Federn und Flossen sind wenige **große, geformte Klingen**, keine Haare.
   - Kleine Muster gehören in den Shader.
6. **Die große Sitzung muss zuerst eine Frage beantworten: Was ist die eine Wahrheit, aus der jedes Wesen entsteht?** Vorschlag (Abschnitt 6):
   - Alle Eingaben sind **Linien mit gemeinsamen Punkten** (Umrisse, Wirbelsäule, Spanten, Kanten, Maul, Augen, Ansatzlinien).
   - Daraus entsteht **ein Subdivision-Netz je Bauplan** mit fester Topologie.
   - Teile (Glieder) und Klingen hängen daran.

   Abschnitt 10 enthält den Fahrplan, Abschnitt 11 die Entscheidungen.

## 1. Das Ziel

### 1.1 Die Wesen (Florians Bögen sind die Spezifikation)

| Wesen | Was es vom System verlangt | Bogen |
|---|---|---|
| Jellyblob, feste Blobs | Grundform, Jelly-Material, Glimmer | `docs/look/wesen-refs/bild01`, `bild18` |
| Rex | Keilkopf, Riesenmaul mit vielen gebogenen Zähnen, Überbiss, Säulenbeine mit flachen Füßen, Stummelarme, große Rückenfinne | `bild05`, `bild11`, `bild12`, `bild14`, `docs/look/editor/06` |
| Langhals | Hals hoch, Kopf drauf; offen läuft die Unterlippe den Hals hinab | `docs/look/editor/04`, `bild16` |
| Robbe | Riesenmaul, offen bis zum Boden | `docs/look/editor/04` |
| Giraffe, Flamingo, Dackel | Tropfenkörper, S-Hals, Gähnen als Bohne unter großer Nase, Schlappohren | `bild06` |
| Retriever, Hunde | W-Oberlippe, Nase, **Mähne, Ohren, Brust und Schwanz aus großen Flammenbüscheln**, vier Säulenbeine mit Zehenwülsten | `bild08`, `bild12`, `bild14` |
| Löwe, Tiger, Panther | kantiger Kiefer mit geradem Kinn, **Mähne als Zacken**, Streifen, untergeschlagene Pfoten | `bild09`, `bild14` |
| Drachen | ohne Unterkiefer (Öffnung am Hals), Fledermausflügel, **Stachelkamm aus Klingen** | `bild05`, `bild16`, `bild19` |
| Aal, Fische | Schlangenkörper, gezackte Flossen, Sechseckschuppen, Rundmaul | `bild04`, `bild13` |
| Vögel | Gefieder aus Federklingen, Stelzbeine mit drei Zehen, Schnäbel | `bild15` |
| Spinnen | 8 dünne Knickbeine oder dicke behaarte Beine mit Büscheln | `bild15` |
| Elefanten, Stacheldrachen | Körper aus Flammenklingen, Rüssel, Stoßzähne, Stachelkränze | `bild19` |
| Varianten | „Giraffenspinne mit Rüssel, Drachenflügeln und Hauern“ | Florian 12.10. |

### 1.2 Look-Regeln (aus `docs/look/wesen-refs/ZIELSYSTEM.md` und Florians Rückmeldungen)

- **Eine durchgehende Masse:** Die Silhouette läuft Schnauze → Schädel → Rücken → Schwanz ohne Naht. Die Körper sitzen wie Säcke auf dem Boden. Beine sind kurze Säulen aus dem Unterrumpf, am Boden breit und flach („Saugnapfform“, 08.10.). Der Kopf dominiert (45–55 % der Höhe).
- **Glatte, organische Kurven und scharfe Kanten**, etwa am Maul, am Brauenwulst oder am Kasten der Raubkatzen (07.10.).
- **Maul:**
  - Es ist ein Schnitt mit zwei scharfen Kanten.
  - Offen ist es immer eine Bohne, so weit auf, dass es „ein anderes Tier mit einem Haps“ schluckt.
  - Der Unterkiefer fährt nie durch den Körper.
  - Lippenband hell, Rachen Maroon, große Zunge, gebogene cremefarbene Zähne.
- **Augen:** klein und bündig mit dunklem Ring. Das Schlitzauge bleibt.
- **Fell, Mähnen, Kämme:** wenige große Formen („Fell als große Büschel“, 07.10.). Ohren, Hörner, Flügel, dünne Schwänze, Spinnenbeine und Rückenschuppen sind „eigene Elemente, nicht Teil der Masse“ (08.10.).
- **Shading:** Airbrush-Verläufe in harten Farbfeldern, Licht rechts oben, kühle satte Schatten, feines Korn, keine Konturen.

### 1.3 Bedien-Regeln (Florian)

- „Wie Illustrator“ und „wie Blender“ heißt genau deren Verhalten und Kürzel, keine eigenen Automatiken. Jede Mausbedienung braucht einen Trackpad-Weg.
- **Alles ist ein Objekt:** Was man in einer Ansicht ändert, ändert sich live in allen. Bewegen soll sich aber nur die Stelle, die man anfasst.
- Jede Pose (Fressen, eigene Posen) ist voll bearbeitbar.
- Desktop-App, Layout nach Figma, Seitenleiste immer offen.

### 1.4 Technischer Rahmen

- **iPhone:** ≥ 58 fps, 36 Wesen gleichzeitig, ≤ 100 Draw Calls.
- **Topologie:** fest je Bauplan, damit Posen, Blendshapes, Rig und Varianten funktionieren.
- **Dokument:** speichert nur Absicht. Netz, Knochen und Gewichte werden immer neu gebaut.

## 2. Was wir seit dem 04.10. ausprobiert haben

| Datum | Versuch | Ergebnis | Florians Urteil |
|---|---|---|---|
| 04.10. | KI-3D (Meshy), ganze Tiere | Look sehr nah, aber statisch, nicht kombinierbar | „treffen den Look fast perfekt“ |
| 04.10. | Prozeduraler Baukasten v2 (SDF, Strähnen-Generator) | grobe Formen, Toon-Material | „total schlecht im Vergleich“ |
| 05.10. | Grundblobs aus Florians Vorlage | 13 Formen, Silhouetten-Überdeckung 97,9 %; Jelly, fest, Fell-Schalen | Fell „schuppig“, zu wenig zackig |
| 05.10. | Mischwesen aus zerschnittenen Meshy-Tieren, Modulsystem mit Andockringen | Maßstab, Pose, Stil und Nähte passen nicht | „ganz ganz schlimm“ |
| 07.–09.10. | Wesen-Werkstatt: SDF-Körper mit Reglern, Maul als Lippenschnitt, Kiefer mit Schädelkippung, Beine, Shader (Muster, Zonen, Glimmer, Jelly) | Überdeckung mit den Bögen 0,52–0,74 (Ziel 0,85) | „Man kann schon witzige Formen erzeugen“; Silhouetten-Editor „viel intuitiver als die Regler“ |
| 11.10. | Neuer Editor: Profile wie Illustrator, Blender-Navigation, Library | Gerüst steht | „Die Idee, die Shapes direkt im Editor zu ziehen, war bahnbrechend.“ |
| 11.10. | Machbarkeit Tiger-Konzept: Subdivision-Käfig aus Profilen | Kugel auf 0,17–0,37 px | – |
| 12.10. | Maul, Zähne, Rig; Kanten, Back/Bottom; Spanten; Kopplung am Punkt; Wirbelsäule; Maul an der Umrisslinie; Wirbelsäule zeichnen; Pose-Form; Maul auf der Wirbelsäule; Maulloch | Abschnitte 3 und 4 | „Ich bin nicht sicher, ob die Techniken schon optimal kombiniert sind.“ |

## 3. Was gut funktioniert (behalten)

| Baustein | Beleg | Wie weiter |
|---|---|---|
| **Kurven wie Illustrator:** Zeichenstift, Direktauswahl, Griffe, ⌥-Ecke, Auswahlrechteck, Pfeiltasten, + und − | Florians Urteil; E2E `editor.spec.ts` | Produktionsgerüst, behalten |
| **Navigation wie Blender** mit Trackpad-Wegen; Layout nach Figma; Seitenleiste immer offen; Tab-Punkte an den Ansichten | E2E, Vergleichsbild Figma | behalten; Farben für Rig und Augen sind vorläufig |
| **Dokument speichert nur Absicht** (zod-Schema, Rundreise-Tests, Library) | `packages/shape/src/dokument.ts` | behalten; Felder für Teile, Klingen und Posen kommen dazu |
| **Kopplung am entsprechenden Punkt:** nur der äußerste Punkt wandert, nichts skaliert | `kopplung.ts`, Bild `kopplung-punkt.png` | behalten, gilt künftig für alle Linien |
| **Gemeinsame Punkte:** Maulanfänge sind Umrissknoten, Pose-Form mit gleicher Punktstruktur, Kinnseite über den Winkel | `maulUmriss.ts`, E2E „Kiefer bleiben verbunden“ | Grundprinzip für alle Linien (Abschnitt 6) |
| **Wirbelsäule:** aus dem Umriss vorgeschlagen oder selbst gezeichnet; Ringe senkrecht; Hals hoch, Kopf drauf; Biegen als Pose mit gleicher Topologie | Langhals Seite 5,4 px; gestreckter Raum hin und zurück < 0,1 px | Kern der Bauweise |
| **Maul im Netz mit fester Topologie** (378 Käfigpunkte): Reißverschluss für den wandernden Mundwinkel, Tasche geschlossen als Linse und offen als Bohne | Lippenkante 1,5 px (zu) bzw. 2,6–2,8 px (auf) | Wissen behalten, im Kern neu bauen |
| **Kiefer = Knochen + Korrektur:** Gelenk aus „zu“ und „auf“ geschätzt, Öffnungsart (Kippen/Ziehen) erkennbar | synthetisch < 0,1°; Rex 52° Unterkiefer, Robbe „Ziehen“ | behalten |
| **Zähne am Zahnfleisch:** symmetrisch, offen größer, Prüfung im geschlossenen Maul mit Vorschlägen | `zaehne.ts`, 12 Tests; Rex mit 14 Außenzähnen | behalten, Rahmen je Öffnungsart fehlt |
| **Regel „Eine Kante ist eine Ecke in einem Shape“:** Umriss-Ecke = Kante quer, Spant-Ecke = Kante längs, Härte = Rundung | Spant-Ecke knickt 43°, freie Linie nur 13° | Grundregel behalten |
| **Spanten formneutral:** linear überblendet, ein neuer Spant ändert nichts | Test auf 10⁻⁹ | Wissen behalten; die Normierung muss weg (Abschnitt 4.3) |
| **Nachziehen von Florians Bögen** (Profile und Maulpunkte aus Bildern) | Profile im Mittel 0,26–0,48 px | Werkzeug behalten, als Import in den Editor (Abschnitt 9) |
| **Prüfwerkzeuge:** Vergleichsbilder, Überlagerung (Umriss, Pose-Form, 3D gestrichelt), Zebra, Durchdringungstest, E2E mit echter GPU, Messung in Pixeln | `scripts/`, `e2e/`, `docs/progress/editor/` | behalten, Abnahmekriterien darauf bauen |
| **Aus der Wesen-Werkstatt:** Muster als Shader (Sechseckschuppen, Streifen, Rosetten, Flecken), Zonen (Bauch, Latz, Rückenstreifen, Augenmaske, Socken), Glimmer und Korn, Jelly-Lavalampe | `packages/render/src/creature2` | für den Look im Editor übernehmen |
| **Aus der Wesen-Werkstatt:** Kiefer-Wissen (Schädelkippung, Kehlkette ⅔/⅓, Bodengrenze, Bohne), Beine verschmelzbar, Laufdemo | `packages/creature`, Übergabe vom 09.10. (`git show 6029362:docs/UEBERGABE.md`) | als Wissen übernehmen |

## 4. Was noch nicht funktioniert (deutlich)

### 4.1 Das 3D-Wesen trifft die Zeichnungen nicht

Abweichung des 3D-Umrisses von der Zeichnung in px (max), Bauweise Wirbelsäule:

| Wesen | Seite | Front | Top | mit Maul (Seite) |
|---|---|---|---|---|
| Langhals | 5,4 | 5,3 | 14,0 | 24,0 |
| Robbe | 6,1 | 16,2 | 3,8 | 9,3 |
| Rex | 2,1 | 15,5 | 6,7 | 4,3 |
| Tiger | 16,5 | 3,1 | 4,5 | 18,5 |

Ursachen:
- **Querschnitt:** Im Versuch besteht er nur aus zwei Viertelellipsen. Die gezeichnete Front gilt nur, solange das ganze Wesen liegt.
- **Kastenschnauze:** Sie wird rund, weil eine flache Stirnfläche eine Kappe statt eines Pols braucht.
- **Biegungen:** Innen an starken Biegungen staucht die Fläche, an den Polen gibt es kleine Durchdringungen.
- **Maul:** Mit Maul baut ein anderer Käfig mit weniger Ringen (18 statt 44). Der Körper wird dadurch ungenauer. Beginnt das Maul hinter der Schnauzenspitze, wird die Stirn flacher (≈ 10 px).
- **Werkstatt (SDF und Regler):** Ihre Wesen deckten sich nur zu 0,52–0,74 mit den Bögen.

**Und es sieht nicht aus wie die Bögen** (Bilder `wirbel-vier.png`, `vergleich-zaehne-rex.png`). Das 3D ist weiß mit Matcap; Earle-Material, Augen, Muster und Farbfelder fehlen im Editor. Die Form lässt sich so beurteilen, der Look nicht.

### 4.2 Fünf Bauwege statt einem

Je nach Inhalt baut das 3D anders:
- **Platzhalter-Loft:** ohne Maul und Kanten
- **Kanten-Käfig:** mit Kanten oder Spanten
- **Maul-Käfig:** mit Maul
- **Tiger-Käfig:** Versuch
- **Wirbelsäulen-Käfig:** Tab „wirbelsäule“

Die Funktionen kombinieren sich deshalb nur stückweise:

| Kombination | geht? |
|---|---|
| Kanten + Maul | nein, mit Maul zeigt das 3D keine Kanten |
| Kanten-Härte + Wirbelsäule | nein |
| Spanten + Wirbelsäule | nur wenn das ganze Wesen liegt; mit stehendem Hals bleibt der Querschnitt oval |
| Biegen + Maul | nein, das Biegen ist nur eine Vorschau ohne Maul |
| Maul hinter der Schnauzenspitze | nur mit Fehler: Die Kappe trägt die ganze Schnauze |
| Ecken als Kanten in der Wirbelsäulen-Bauweise | falsch: Die Linien kommen vom alten Körper |
| Front und Top im Fressen-Tab bearbeiten | nein, nur die Seite |
| eigene Posen außer Fressen | nein |

### 4.3 Shapes, Spanten, Kanten und Wirbelsäule spielen nicht zusammen

Florian (12.10.): „Eine Ansicht formt die komplette andere, auch bei den Spanten. Ich habe Probleme, schöne Formen und Kanten zu machen.“

- **Die Front hat drei Rollen:** Umriss, Querschnitt für den ganzen Körper und Hauptspant. Ein Knick in der Front erscheint deshalb überall.
- **Spanten sind auf Höhe × Breite normiert.**
  - Ändert sich ein Umriss, strecken sie sich mit.
  - Ein Spant wirkt bis zum nächsten, vor dem ersten bis zur Spitze.
  - Eine kleine Beule (Wange, Braue) braucht drei Spanten.
  - Die Längskante aus einer Spant-Ecke ist in Seite und Top nur zu sehen, nicht zu ziehen.
- **Kanten:**
  - Härte macht schärfer, aber nicht tiefer; eine freie Linie knickt höchstens 13°.
  - Schräge Linien liegen bis 3,3 px (45°) bzw. 12 px (70°) neben der Zeichnung, Linien im Gesicht 2,6 px mit Beulen.
  - Über die Kappe werden Linien gekürzt.
- **Die Wirbelsäule entscheidet unsichtbar**, woher die Breite eines Rings kommt: aus dem Top, wenn er liegt, aus der Front, wenn er steht. Florian sieht das nur an der Farbe der Sprossen.
- **Zu viele Sonderregeln und Hinweistexte, zu wenig direkte Manipulation.**
  - Im 3D kann man nichts anfassen.
  - Es gibt kein örtliches Werkzeug (Beule, Mulde, „weich ziehen“ wie Blenders proportionales Bearbeiten).
  - Back und Bottom zeigen dieselben Umrisse noch einmal.
- **Rückmeldung zu langsam:** Das Maul baut 0,4 s und erst beim Loslassen, der Kanten-Käfig 0,1 s, die Fläche für Linien 0,1–0,2 s.

### 4.4 Maul und echtes 3D

- **Der Maul-Körper ist ein eigener Käfig** und kein Teil des Körpers. Auf der Wirbelsäule läuft er über einen gestreckten Raum, das ist ein Behelf.
- **Das Maul muss vorn beginnen.** Der Käfig hat vorn eine 4×4-Kappe, durch die die Naht läuft. Diese Mäuler gehen deshalb nicht sauber:
  - Mäuler an der Kopfunterseite
  - Mäuler am Hals (Langhals offen, Drache ohne Unterkiefer)
  - Mäuler hoch unter der Nase
- **Durchdringungen:** 130–1112 Dreieckspaare geschlossen, 304–2142 offen. Ursachen:
  - Der Mundwinkel ist ein einzelner Punkt.
  - Die Anpassung schwingt über.
  - Die Tasche sticht durch die Haut.
  - Der Unterkiefer schwenkt in Kehle oder Boden.
- **Die Fressen-Form ist zerbrechlich.** Sie wird über den nächsten Hautpunkt aus dem 3D abgeleitet; am 12.10. war sie zweimal falsch verbunden (Maulloch, Kinnseite). Front und Top sind im Fressen-Tab nicht bearbeitbar.
- **Look des Mauls** (Bohne, Haps, Lippenband, Maroon-Rachen, Zunge) ist im Editor nicht nachgebaut. Liegen die Lippen an der Kopfunterseite, wird der Unterkiefer nur eine dünne Klappe.
- **Zähne:**
  - Rahmen je Öffnungsart fehlen; im Rex-Bogen stehen die Zähne senkrecht, im Versuch kippen sie nach hinten.
  - Die Prüfung läuft nur geschlossen.
  - Zähne sind eigene Netze, nicht im selben Draw Call.
- **Rig:** Der Rig-Tab zeigt nur an. Augen sind nur gemalt (im Versuch), einen Augen-Tab gibt es nicht.

### 4.5 Beine, Arme, Flügel, Schwänze, Ohren, Hörner

- **Im neuen Editor nicht vorhanden.**
- In der Werkstatt gab es Säulenbeine als SDF mit einstellbarer Verschmelzung, drei Zehen als Kapseln und eine Laufdemo. Florians Urteil damals: „Oberschenkelform passt gar nicht“, „vieeel dicker“, „Saugnapfform“.
- Im Modulsystem gab es Andockringe, aber nur für zerschnittene Meshy-Teile.
- Offen sind: Übergang Schulter/Hüfte ohne Naht, feste Topologie je Bauplan, Bedienung (zeichnen statt Regler) und das Rig.

### 4.6 Körperweite Strukturen

- **Nicht vorhanden.** Es gibt keine Büschel (Retriever), Mähnen (Löwe), Kämme und Stacheln (Stacheldrache), Finnen (Rex), Federn (Vögel), Flossen (Aal) und Membranen (Drachenflügel).
- **Frühere Versuche:**
  - Fell-Schalen an den Grundblobs: „Inneres schuppig, Silhouette zu wenig zackig“.
  - Strähnen-Generator im Baukasten v2: verworfen.
  - Federkarten im Prototyp.
  - Das Retriever-Fell aus Meshy zerfiel beim Ausdünnen in Splitter.

### 4.7 Vom Editor ins Spiel

Es fehlen:
- Export des Editor-Netzes ins Spiel
- Skinning mit Knochenkette (außer dem Kiefer), Animation, Detailstufen
- eine Messung auf dem iPhone

Das Budget aus der Recherche steht: höchstens 3 Morph-Ziele, ein Draw Call je Wesen plus Schatten, Reißverschluss als Attribut je Punkt.

## 5. Wo die große Sitzung besonders viel Aufwand braucht

1. **Eine Wahrheit für die Form.** Ein Bauweg, in dem Umrisse, Spanten, Kanten, Wirbelsäule und Maul gleichzeitig gelten. Alles andere hängt daran (Abschnitt 6).
   - *Kriterium:* Kugel, Tiger, Rex, Robbe und Langhals ≤ 2 px in allen Ansichten, mit und ohne Maul.
2. **Bedienung, die vorhersagbar und örtlich ist.**
   - Jede Linie gleich bedienbar.
   - Nur die angefasste Stelle ändert sich.
   - Bearbeiten auch im 3D, dazu ein örtliches Werkzeug für Beulen und Mulden.
   - *Kriterium:* Florian baut den Tiger-Kopf mit Kastenschnauze ohne Hilfe und sagt, dass es sich gut anfühlt.
3. **Maul im selben Netz, überall am Kopf, sauber.**
   - *Kriterium:* 0 Durchdringungen bei zu, 25, 50, 75 und 100 %; Maul an der Schnauze, an der Unterseite und am Hals; offen eine Bohne.
4. **Glieder und Übergänge** (Abschnitt 7).
   - *Kriterium:* Rex und Retriever mit Säulenbeinen ohne sichtbare Naht, Flamingo mit Stelzbeinen; dieselbe Topologie je Bauplan.
5. **Körperweite Strukturen** (Abschnitt 8).
   - *Kriterium:* Retriever-Büschel, Löwenmähne und Stacheldrachen-Kamm neben den Bögen, von Florian abgenommen.
6. **Look im Editor:** Earle-Material, Muster, Zonen und gemalte Augen schon beim Bauen. Sonst kann Florian die Wesen nicht beurteilen.
7. **Tempo:** Vorschau in höchstens 16 ms je Zugschritt (Worker, gestufte Genauigkeit), genaues Ergebnis beim Loslassen unter 200 ms.
8. **Prüfstand:** Prüfwesen mit Florians Bögen als Vorlage, gemessen in px, Durchdringungen und fps (Abschnitt 12).

## 6. Die Kernfrage: Wie entsteht ein Wesen?

### 6.1 Drei Wege

| | **A: Linien-Netz → Subdivision-Käfig** (heutige Richtung) | **B: Implizit (SDF) → Vorlagen-Netz** (Werkstatt-Richtung) | **C: KI ergänzt → Vorlagen-Netz** |
|---|---|---|---|
| **Idee** | Alle Eingaben sind Linien. Ein Käfig mit fester Topologie je Bauplan wird an sie angepasst (Catmull-Clark, Kantenschärfe). | Profile, Teile und Klingen werden Abstandsfelder, weich vereinigt. Danach wird ein Vorlagen-Netz darauf gelegt (Shrinkwrap und Anpassen). | Florians Profile plus Stilvorgabe ergeben per KI ein Volumen mit Details. Darauf wird das Vorlagen-Netz gelegt. |
| **Formtreue zur Zeichnung** | hoch: Kugel 0,2 px, Seite exakt durch die Ringe | mittel: Werkstatt 0,52–0,74 Überdeckung, Grundblobs 97,9 % (nur Blobs) | ungewiss, schwer steuerbar |
| **Scharfe Kanten** | ja (Crease, Ecken in Shapes) | schwer (Dual Contouring, eigene Kantenbehandlung) | nein bzw. gebacken |
| **Übergänge (Beine, Hals)** | schwer: Abzweigungen brauchen Topologie | leicht: weiche Vereinigung | gut, aber ohne Kontrolle |
| **Feste Topologie** | ja, eingebaut | erst durch das Vorlagen-Netz | erst durch das Vorlagen-Netz |
| **Bedienung** | direkt, Punkt für Punkt | Regler bzw. Primitive (Florian: „trafen meine Formen nie“) | Eingabe → Warten → Ergebnis |
| **Tempo** | schnell (Käfig klein) | langsam (Feld + Vernetzen 1,6–4,4 s) | Minuten, Cloud |
| **Risiko** | Abzweigungen, Mundraum | Kanten, Exaktheit, Look „zerrissen“ | Stil, Lizenz, Kosten, Kontrolle |

### 6.2 Vorschlag: A als Kern, mit drei Ergänzungen

**Kern: ein Linien-Netz.** Jede Eingabe ist eine 3D-Linie aus Punkten, die mehreren Linien gehören können. Das ist das Prinzip des Linienrisses im Schiffbau („gestrakt“ heißt: alle Ansichten stimmen in allen Messpunkten überein).

| Linie | gezeichnet in | gemeinsame Punkte mit |
|---|---|---|
| Rücken- und Bauchlinie (= Seitenumriss) | Seite | Wirbelsäule (Pole), Spanten (oben, unten), Maul (Anfänge) |
| Breitenlinie (= Top-Umriss bzw. Front-Umriss stehender Teile) | Top bzw. Front | Spanten (Flanke) |
| Wirbelsäule | Seite (Vorschlag oder selbst) | Pole, Knochenkette |
| Spanten (Querschnitte) | Front/Back bzw. Spantenriss | Rücken-, Bauch- und Breitenlinie |
| Kanten (Knick mit Winkel und Härte) | jede Ansicht | Spant-Ecken, Umriss-Ecken |
| Maul (Ober-, Unterlippe, Winkel) | Seite, Front, Top | Seitenumriss (Anfänge) |
| Augen (Lidlinien) | Seite, Front | Fläche |
| Ansatzlinien für Glieder und Klingen | jede Ansicht, auf der Fläche | Fläche, Knochen |

- Alle Linien bedient man gleich: Zeichenstift, Direktauswahl, Griffe, ⇧W für Härte bzw. Breite, Pfeiltasten.
- Ziehen bewegt einen Punkt in allen Linien, zu denen er gehört, und sonst nichts.
- Die Front ist nur noch Umriss. Querschnitte kommen aus Spanten, die an Rücken-, Bauch- und Breitenlinie hängen, statt auf einen Kasten normiert zu sein. Jede Hälfte wirkt für sich.

**Netz: ein Käfig je Bauplan, nach den Linien ausgerichtet.**
- Rumpf, Hals, Kopf und Schwanz bilden eine Röhre entlang der Wirbelsäule.
- Vorn sitzt eine Kappe für flache Stirnflächen. Das Maul ist ein Schnitt mit Tasche **irgendwo** in den Kopfringen, nicht nur durch die Kappe; davor liegen Schnauzenringe.
- Ränder für die Augen kommen dazu.
- Kanten, Spanten und Lippen werden Kantenschleifen des Käfigs.
- Der Bauplan (Blob, Zweibeiner, Vierbeiner, Vogel, Spinne, Schlange, Fisch) legt die Zahl der Glieder fest und damit die Topologie.

**Ergänzungen:**
1. **Glieder** als Röhren entlang eigener Knochenketten, aus dem Rumpf gewachsen (Abschnitt 7).
2. **Klingen** (Büschel, Stacheln, Federn, Flossen) als eigene, instanzierte Netze auf Ansatzlinien (Abschnitt 8).
3. **Abstandsfeld nur als Hilfsmittel**, nicht als Form: für die Durchdringungsprüfung, das Schieben der Tasche aus der Haut, die Bodengrenze und eine schnelle Vorschau weicher Übergänge.

**Posen:** gleiche Linien, gleiche Punktstruktur, gespeichert als Abweichung von „zu“. Knochen (Wirbelsäule, Kiefer, Glieder) tragen die Bewegung, die Linien die Feinform; daraus entsteht die Korrektur-Blendshape. Fressen ist die erste Pose, weitere folgen gleich.

**Entscheidungstest am Anfang der Sitzung** (2–3 Stunden, bevor viel gebaut wird):
- Rex-Kopf mit Maul an der Schnauze und Langhals mit Maul unter dem Kopf im neuen Käfig (Schnauzenringe, Maul in den Kopfringen).
- Dazu ein Säulenbein am Rex (Abschnitt 7).
- Messen: px, Durchdringungen, Bauzeit.
- Florian sieht das Ergebnis im Earle-Material.
- Erst dann wird der Kern breit gebaut.

## 7. Beine, Arme, Flügel, Schwänze

*(folgt aus der Recherche 12.10. spätnachts)*

## 8. Körperweite Strukturen: Büschel, Mähnen, Kämme, Stacheln, Federn, Flossen

*(folgt aus der Recherche 12.10. spätnachts)*

## 9. Was den Editor einzigartig machen kann

*(folgt aus der Recherche 12.10. spätnachts)*

## 10. Fahrplan für die große Sitzung

Die Sitzung kann nicht alles schaffen. **Kern sind die Phasen 0–3.** Danach je nach Zeit 6, 4 und 5. Am Ende jeder Phase schaut Florian auf ein Vergleichsbild neben seinem Bogen. Parallele Arbeit läuft in eigenen Arbeitsbäumen mit Zuständigkeit nach Pfaden (Arbeitsregel 5), zum Beispiel Kern, Bedienung, Look.

| Phase | Ziel | Inhalt | Abnahme |
|---|---|---|---|
| **0 Gemeinsamer Start** (30–45 min) | Richtung festlegen | Florian liest Kurzfassung und Abschnitt 4, entscheidet Abschnitt 11, legt Prüfwesen und Reihenfolge fest, zeigt ggf. neue Bögen (z. B. Retriever-Büschel, Rückenschuppen) | Entscheidungen im Plan festgehalten und committet |
| **1 Entscheidungstest Kern** (2–3 h) | Beweisen, dass Weg A trägt, bevor breit gebaut wird | Käfig mit Kappe und Schnauzenringen; Maul als Schnitt in den Kopfringen (an der Schnauze und unter dem Kopf); Spanten an Rücken-, Bauch- und Breitenlinie; ein Säulenbein am Rex; einfaches Earle-Material statt Matcap | Rex-Kopf und Langhals ≤ 2 px, 0 Durchdringungen geschlossen, Florians Urteil am Bild; sonst Weg B prüfen |
| **2 Kern breit: ein Bauweg** | Ein Netz für alles | Platzhalter-Loft, Kanten-, Tiger- und Maul-Käfig fallen weg. Wirbelsäule als Standard; Linien-Netz mit gemeinsamen Punkten; Kanten mit Knickwinkel; Rundheit je Abschnitt; örtliches Werkzeug; Bearbeiten im 3D; Bau im Worker | 5 Prüfwesen ≤ 2 px; Vorschau ≤ 16 ms je Zugschritt; Florian baut den Tiger-Kopf selbst |
| **3 Maul im Kern, sauber** | Das Maul wie in den Bögen | Mundwinkel-Zone, Tasche als Versatz der Kiefer-Innenflächen, Kehlkette, Bodengrenze; Zahnrahmen je Öffnungsart, Zunge; Fressen als Pose auf dem ganzen Netz (alle Ansichten); weitere Posen gleich | 0 Durchdringungen bei 0/25/50/75/100 %; Bohne; Rex, Robbe, Langhals, Drache ohne Unterkiefer |
| **4 Glieder** | Beine, Arme, Flügel, Schwänze | nach Abschnitt 7 | Rex, Retriever, Flamingo, Spinne neben den Bögen |
| **5 Klingen** | Büschel, Mähnen, Kämme, Stacheln, Federn, Flossen | nach Abschnitt 8 | Retriever, Löwe, Stacheldrache neben den Bögen |
| **6 Look** | Earle-Look im Editor | Material, Muster und Zonen aus `packages/render/src/creature2`, gemalte Augen, Lippenband, Rachen, Zunge, Glimmer | Vergleichsbild je Prüfwesen, Florians „ja“ |
| **7 Spiel** | Vom Editor aufs Brett | Knochenkette und Skinning, 3 Morph-Ziele, Reißverschluss-Attribut, Export, Atmen/Blinzeln/Fressen/Gehen, iPhone-Messung | 36 Wesen ≥ 58 fps, ≤ 100 Draw Calls |
| **8 Varianten** | Viele Wesen aus wenigen | Mischen gleicher Baupläne, Teiletausch, Mutation, Assistent erzeugt Varianten im Look | Raster aus 12 Varianten, Florian wählt aus |

## 11. Entscheidungen für Florian

| Nr. | Frage | Empfehlung |
|---|---|---|
| E1 | **Kern:** Weg A (Linien-Netz → Käfig je Bauplan), erst nach dem Entscheidungstest breit bauen? | ja |
| E2 | **Wirbelsäulen-Netz als einzige Bauweise;** Ziehen an der Wirbelsäule biegt (mit ⌥ nur die Linie verlegen) | ja (aus `docs/plans/2026-10-12-wirbelsaeule-ein-netz.md`, Abschnitt 7) |
| E3 | **Front nur als Umriss;** Querschnitte nur aus Spanten, die an Rücken-, Bauch- und Breitenlinie hängen, jede Hälfte für sich; dazu eine Spantenriss-Ansicht statt Back und Bottom | ja |
| E4 | **Kantenlinien mit Knickwinkel** statt Tiefe; Rundheit (rund ↔ kastig) je Abschnitt als Regler auf der Wirbelsäule | ja |
| E5 | **Bearbeiten im 3D** (Punkte und Linien direkt anfassen) und ein **örtliches Werkzeug** („weich ziehen“ mit Radius wie Blenders proportionales Bearbeiten, O) | ja |
| E6 | **Fressen und eigene Posen** auf dem ganzen Netz, alle Ansichten bearbeitbar, gespeichert als Abweichung | ja |
| E7 | **Spanten-Überblendung** linear (neuer Spant ändert nichts) oder kubisch (glatter) | nach Florians Test |
| E8 | **Glieder:** Variante aus Abschnitt 7 | siehe Abschnitt 7 |
| E9 | **Körperweite Strukturen:** ein Grundelement „Klinge“ mit Pinseln wie Illustrator (Abschnitt 8) | siehe Abschnitt 8 |
| E10 | **KI:** Rolle im Editor (Abschnitt 9) | siehe Abschnitt 9 |
| E11 | **Look im Editor ab Phase 1** (Earle-Material statt weißem Matcap) | ja |
| E12 | **Prüfwesen und Reihenfolge** (Abschnitt 12) | Rex → Langhals → Tiger-Kopf → Retriever → Stacheldrache |

## 12. Prüfwesen und Abnahmekriterien

| Wesen | prüft vor allem | Vorlage |
|---|---|---|
| Kugel | Grundlage, Kopplung, Tempo | Start jedes Wesens |
| Rex | Maul mit Überbiss, viele Außenzähne, Haps, Säulenbeine mit flachem Fuß, Stummelarme, Rückenfinne | `bild05`, `bild11`, `bild12`, `bild14`, `editor/06` |
| Langhals | stehender Hals, Kopf drauf, Maul unter dem Kopf bzw. den Hals hinab | `editor/04` |
| Tiger (Kopf) | Kastenschnauze, Kanten mit Winkel, Streifen | `bild09`, `editor/03` |
| Robbe | Riesenmaul bis zum Boden, Tasche bis 3× | `editor/04` |
| Retriever | Flammenbüschel, W-Lippe, vier Säulenbeine mit Zehenwülsten | `bild08`, `bild12` |
| Löwe | Mähne aus Zacken, untergeschlagene Pfoten | `bild09`, `bild12` |
| Stacheldrache | Kamm aus Klingen, Fledermausflügel, Maul am Hals ohne Unterkiefer | `bild05`, `bild19` |
| Flamingo | S-Hals, Stelzbeine mit drei Zehen, Hakenschnabel | `bild06`, `bild15` |
| Spinne | acht Knickbeine, Büschel | `bild15` |
| Aal | eingerollter Schlangenkörper, gezackte Flossen, Sechseckschuppen im Shader | `bild13` |

**Gemeinsame Kriterien:**
- Umrisse ≤ 2 px in Seite, Front und Top gegen die Zeichnung; Überdeckung mit dem Bogen ≥ 0,85.
- 0 Durchdringungen geschlossen, offen und bei 25/50/75 %.
- Vorschau ≤ 16 ms je Zugschritt, genauer Bau ≤ 200 ms.
- Im Spiel: 36 Wesen ≥ 58 fps, ≤ 100 Draw Calls.
- Florians „ja“ am Vergleichsbild (Bogen und Render nebeneinander, gleiche Ansicht, gleicher Maßstab).

## 13. Landkarte: Wissen, Code, Werkzeuge

**Lesen, in dieser Reihenfolge:**
1. dieses Dokument
2. [`docs/UEBERGABE.md`](../UEBERGABE.md)
3. [`apps/editor/CLAUDE.md`](../../apps/editor/CLAUDE.md): Entscheidungen und Fallen
4. [`docs/plans/2026-10-12-wirbelsaeule-ein-netz.md`](2026-10-12-wirbelsaeule-ein-netz.md): Vorschlag ein Netz, Recherche mit 31 Quellen
5. [`docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`](../research/2026-10-12-maul-kiefer-zaehne-augen.md): Maul, Zähne, Rig, Augen; Abschnitte 3–6, Recherchen B1–B4
6. [`docs/research/2026-10-12-kanten-ansichten.md`](../research/2026-10-12-kanten-ansichten.md): Kanten, Spanten, Kopplung; Recherche mit 52 Quellen
7. [`docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`](2026-10-12-wirbelsaeule-maul-fressen.md): Wirbelsäule zeichnen, Pose-Form, Maul auf der Wirbelsäule, Maulloch
8. [`docs/research/2026-10-11-silhouetten-kanten-machbarkeit.md`](../research/2026-10-11-silhouetten-kanten-machbarkeit.md): Subdivision-Käfig, Kieferrechnung, SVG-Import
9. [`docs/look/wesen-refs/README.md`](../look/wesen-refs/README.md) und [`ZIELSYSTEM.md`](../look/wesen-refs/ZIELSYSTEM.md): die 19 Bögen, gemessene Ziele
10. [`docs/look/editor/README.md`](../look/editor/README.md): Editor-Bögen 01–06
11. Werkstatt-Wissen: `git show 6029362:docs/UEBERGABE.md` (Blöcke 1–11, Florians 17 Rückmeldungen im Gedächtnis), [`docs/look/grundblobs/README.md`](../look/grundblobs/README.md), [`docs/look/modulsystem/SYSTEM.md`](../look/modulsystem/SYSTEM.md), [`docs/research/ki-3d-tools-2026-10.md`](../research/ki-3d-tools-2026-10.md)

**Code:**

| Bereich | Pfad | Status |
|---|---|---|
| Editor-Gerüst | `apps/editor/src/{viewports,layout,library,state,editing,menu,ui,leiste}`, `three/Renderer3D.ts` | behalten |
| Kurven, Dokument, Kopplung | `packages/shape/src/{bezier,profil,dokument,kopplung}.ts` | behalten, erweitern |
| Spanten | `packages/shape/src/spanten.ts`, `apps/editor/src/spanten/` | Wissen behalten; Normierung ersetzen (E3) |
| Versuche | `packages/shape/src/versuch/`: `wirbelsaeule`, `wirbelMaul`, `maul`, `maulUmriss`, `kiefer`, `zaehne`, `kanten`, `linie3d`, `flaechenlinie`, `umriss3d`, `catmullClark`, `kaefig`, `tigerKaefig`, `pruefen` | Wissen und Tests behalten, im Kern neu bauen |
| Editor-Ebenen der Versuche | `apps/editor/src/{maul,wirbel,kanten,versuch}` | Bedienung behalten, Bau neu |
| Look aus der Werkstatt | `packages/render/src/creature2` (Material, Muster, Zonen) | übernehmen (Phase 1/6) |
| Werkstatt-Körper | `packages/creature` (SDF, Mund, Kiefer, Rig, Bauplan) | nur Wissen |
| Werkzeuge | `apps/editor/scripts/` (`nachziehen/`, `vergleich.mjs`, `maul-bilder.mjs`, `wirbel-bilder.mjs`, `kopplung-bild.mjs`), `apps/editor/e2e/` | behalten |

**Befehle:**
- Editor: `pnpm editor` (Electron), Web-Modus `editor-web` auf Port 5180
- Prüfen: `pnpm typecheck`, `pnpm test`, `pnpm lint`
- E2E mit echter GPU: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e`
- Bilder: `node apps/editor/scripts/maul-bilder.mjs <wesen>`, `node apps/editor/scripts/wirbel-bilder.mjs`
