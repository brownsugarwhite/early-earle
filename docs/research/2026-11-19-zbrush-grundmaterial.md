# Wie ZBrush sein Grundmaterial macht, und der Nachbau in Ozzy (19.11.2026)

Dein Auftrag: „Als Basismaterial für den paint mode kannst du erstmal das helle solid benutzen und außerdem häte ich gerne noch ein
weiteres material. Das Basismaterial, so wie es Z-Brush benutz, aber mehr in magenta statt rot. Recherchiere genau wie das material
bei z-Brush gemacht ist.“ Deine Vorlage: [`docs/look/ozzy/paint/2026-11-19-zbrush-matcap-red-wax.png`](../look/ozzy/paint/2026-11-19-zbrush-matcap-red-wax.png)
(ZBrush 4R7, Kugel mit „MatCap Red Wax“).

## Kurz

- ZBrushs Grundmaterial heißt **„MatCap Red Wax“**. Es ist kein Material, das Licht berechnet. Es ist ein **MatCap**: das Bild
  einer Kugel, in das Farbe, Licht und Glanz fertig eingebacken sind.
- **Woraus die Farbe eines Punkts kommt:** nur aus der Richtung, in die seine Fläche vom Betrachter aus zeigt. Zeigt sie zum
  Betrachter, bekommt sie die Farbe aus der Mitte des Kugelbilds; zeigt sie nach oben, die vom oberen Rand, und so weiter. Wo der
  Punkt im Raum liegt, spielt keine Rolle. Lichter der Szene wirken nicht. Dreht man die Form, bleibt das Licht am Betrachter
  kleben und gleitet über die Form.
- **In Ozzy gebaut als Material „Wachs“** (Menü, Taste M, `?material=wachs`), auf dieselbe Art: ein Kugelbild, nachgeschlagen über
  die Normale im Blick. Das Kugelbild ist an deiner Vorlage ausgemessen. Mit dem Farbton der Vorlage liegt Ozzys Kugel im Mittel
  1,5 von 255 Helligkeitsstufen neben ZBrush (größte Abweichung 9). Der Grundwert ist Magenta; den Farbton stellst du im
  Feinregler unter „Material Wachs“.
- Bild: [`docs/progress/ozzy/2026-11-19-wachs-vergleich.png`](../progress/ozzy/2026-11-19-wachs-vergleich.png), an deiner Form
  [`2026-11-19-wachs-strange-bird.png`](../progress/ozzy/2026-11-19-wachs-strange-bird.png).

## 1. Die zwei Familien von Materialien in ZBrush

Die Hilfe von Maxon nennt fünf Grundarten; alle anderen Materialien sind Abwandlungen davon [1]:

| Art | Was sie tut |
| --- | --- |
| Flat Color | keine Schattierung, nur die Farbe |
| FastShader | nur diffuses Licht und Grundhelligkeit |
| BasicMaterial | die Grundlage der meisten Standard-Materialien (Toy Plastic, Double-, Tri-, QuadShader mit einem bis vier Kanälen) |
| Fiber | Fasern längs der Normalen |
| **MatCap** | ein Bild als Material |

**Standard-Materialien** (BasicMaterial und Verwandte) rechnen mit den Lichtern der Szene. Ihre Regler beschreiben das Material
[2]: Ambient, Diffuse mit Kurve, Specular mit Kurve, Transparency, Reflectivity, Metalicity, Noise, Color Bump, Gel Shading,
Cavity Intensity und Cavity Radius, dazu Farbfelder für die einzelnen Anteile. Verstellt man ein Licht, ändert sich das Bild.

**MatCap-Materialien** rechnen nicht. Maxon: „MatCap materials use image maps to simulate the effects of lighting on different
types of surface.“ Und: „As the lighting is fixed by the image map, they do not respond to changes made in the Light palette.“ [1]

## 2. Was ein MatCap ist und woraus die Farbe nachgeschlagen wird

- **Der Name** steht für „Material Capture“. Maxon: „A Matcap is a Material with light information backed in as an image“ [3].
- **Die Idee** stammt aus der Forschung von 2001 („The Lit Sphere“, Sloan, Martin, Gooch und Gooch) [4]: Man malt oder
  fotografiert eine beleuchtete Kugel. Eine Kugel zeigt jede Richtung genau einmal. Also kann das Bild der Kugel als Tabelle
  dienen: Richtung der Fläche hinein, Farbe heraus. Die Autoren nennen das „paint by normals“.
- **Das Nachschlagen:** Für jeden Bildpunkt der Form nimmt man die Normale, vom Betrachter aus gesehen (x nach rechts, y nach
  oben, z zum Betrachter). Die Stelle im Kugelbild ist dann einfach (x, y): die Mitte des Bilds für Flächen, die zum Betrachter
  zeigen, der Rand für Flächen, die quer zum Blick stehen.
- **Wie ZBrush ein MatCap aufnimmt** (Werkzeug „MatCap“) [5]: Man lädt ein Foto eines Gegenstands aus einem Material. Dann klickt
  man auf eine Stelle und zieht in die Richtung, in die die Oberfläche dort zeigt. Jeder Klick nimmt eine Farbe und ordnet sie
  einer Richtung zu; aus vier bis acht Klicks entsteht das Kugelbild. Mit ⌃ + Ziehen stellt man ein, wie scharf ein Glanzlicht ist.
- **Was daraus folgt:** kein Licht, kein Schatten, kein Einfluss der Lage. Dafür kostet es fast nichts (ein Griff in ein Bild je
  Bildpunkt) und sieht an jeder Form sofort aus wie das Vorbild. Darum arbeiten Programme zum Modellieren so gern damit.
- **Die eine Stelle, an der ein MatCap die Form liest:** Vertiefungen. Maxon: „Matcaps interact with the model geometry, mainly
  through the cavity information.“ [3] Dazu der nächste Abschnitt.

## 3. „MatCap Red Wax“: zwei Kugelbilder und die Regler

- **Es ist das Material, mit dem ZBrush startet.** Maxon nennt es „the default Red Wax one“ [3].
- **Es hat zwei Kugelbilder nebeneinander, A und B.** Die amtliche Beschreibung des Felds „Material Texture“: Bei
  MatCap-Materialien hält es das Bild des Materials; sind zwei Kugeln da, steht die linke für A, die **erhabenen** Flächen [2] (die
  rechte, B, entsprechend für die **Vertiefungen**). An anderer Stelle beschreibt Maxon dieselben zwei Bilder so: Wer aus Red Wax
  mit dem LightCap-Werkzeug ein neues Material baut, bekommt links (A) das diffuse Licht und rechts (B) das Glanzlicht; Regler mit
  A wirken auf das eine, Regler mit B auf das andere [3]. Beide Beschreibungen sind von Maxon. **Wie ZBrush A und B genau
  verrechnet, steht nirgends**; fest steht nur: Zwei Regler bestimmen, wo welches Bild gilt.
- **Die Regler eines MatCaps** (im Menü Material unter „Modifiers“; Namen aus einem Forum [6], Wirkung aus einem Lehrbuch [7] und
  einer Antwort im Forum [8]):

  | Regler | Wirkung |
  | --- | --- |
  | Opacity | Deckung |
  | Cavity Detection | ab wann eine Stelle als Vertiefung gilt |
  | Cavity Transition | wie weich der Übergang zwischen erhaben und vertieft ist; das Vorzeichen wählt, welches Bild wo gilt |
  | Intensity A, Intensity B | Helligkeit von Bild A und Bild B |
  | Hue A/B, Saturation A/B | Farbton und Sättigung je Bild |
  | Depth A/B | wie stark die Normale ausgelenkt wird (mehr Relief im Bild) |
  | Material Texture | das Kugelbild selbst (eine oder zwei Kugeln) |

- **Werte, die sich finden ließen:** Um die zwei Kugeln einzeln zu fassen, stellt man für die linke Intensity A 1, Intensity B 0,
  Cavity Detection 0, Cavity Transition −1 und für die rechte A 0, B 1, Transition +1 [8]. Ein Lehrbuch zu ZBrush 4 setzt an Red
  Wax Cavity Detection auf 0,5 und Cavity Transition auf −0,5, um die Vertiefungen einzufärben [7]. **Die Werte, mit denen Red Wax
  ausgeliefert wird, habe ich nicht gefunden**; sie stehen nur in ZBrush selbst (Material → Modifiers).
- **Nicht verwechseln:** ZBrush hat außerdem „Wax Modifiers“ (Strength, Fresnel, Exponent, Radius, Temperature). Das ist ein
  Zusatz für das gerechnete Bild („Wax Preview“), der jedes Material wächsern macht [9]. Mit dem Namen „Red Wax“ hat er nichts zu
  tun; in deinem Bild ist er nicht im Spiel.

## 4. Was MatCap Red Wax von den Standard-Materialien unterscheidet

| | MatCap Red Wax | Standard (BasicMaterial …) |
| --- | --- | --- |
| Licht | im Bild eingebacken, klebt am Betrachter | aus den Lichtern der Szene gerechnet |
| Regler | wirken auf das Bild (Helligkeit, Farbton, Vertiefungen) | beschreiben das Material (Diffuse, Specular, Kurven) |
| Farbe | steckt im Bild: Das Rot ist Teil des Materials | kommt vom Objekt oder vom Bemalen |
| Bemalen | das Material färbt die gemalte Farbe ein | zeigt die gemalte Farbe |

Die letzte Zeile zählt für den Paint-Modus. In ZBrush-Foren ist es ein Dauerthema: Wer auf Red Wax weiß malt, sieht Rot. Der Rat
dort: zum Bemalen auf ein Material ohne eigene Farbe wechseln (SkinShade4, BasicMaterial, Flat Color) [10]. Mehr dazu in Abschnitt 7.

## 5. Was dein Bild zeigt (ausgemessen)

Die Kugel liegt im Bildschirmfoto (1280 × 720) bei der Mitte (604; 387,5) mit dem Halbmesser 203,5 Bildpunkte. Sie ist grob
unterteilt und kantig schattiert (jedes Viereck hat eine Farbe), und die Drahtlinien liegen darüber. Für die Messung habe ich die
Drahtlinien herausgerechnet und die Facetten geglättet.

| Stelle (Normale: rechts, oben) | Rot, Grün, Blau |
| --- | --- |
| Glanz, knapp über der Mitte (0; +0,1) | 163, 116, 126 |
| Mitte (0; 0) | 163, 112, 120 |
| halb oben (0; +0,5) | 140, 90, 96 |
| oben am Rand (0; +0,9) | 124, 65, 64 |
| unter dem Glanz (0; −0,3) | 126, 52, 46 |
| weit unten (0; −0,8) | 91, 18, 9 |
| unten am Rand (0; −0,9) | 50, 0, 1 |
| links (−0,8; 0) / rechts (+0,8; 0) | 106, 45, 44 / 119, 50, 42 |

Daraus liest sich das Material so:

1. **Ein weicher heller Schein über der oberen Hälfte.** Am stärksten knapp über der Mitte, nach oben läuft er langsam aus. Nach
   unten endet er mit einer recht klaren Grenze knapp unter der Mitte. Er ist rosa und kühler als der Körper (Blau über Grün).
2. **Darunter sattes Rot,** das zum unteren Rand fast schwarz wird. Dort stehen Grün und Blau auf null: reines dunkles Rot.
3. **Links ist die Kugel etwas dunkler als rechts** (rund 10 %).

Für eine glatte Kugel ohne Vertiefungen ist das Bild, das man sieht, genau das Kugelbild des Materials (Bild A; ob und wie Bild B
dazugemischt ist, sieht man einer Kugel nicht an).

## 6. Der Nachbau in Ozzy: Material „Wachs“

- **Dieselbe Bauart.** Ozzy zeichnet das Material als Matcap (das Bauteil von three.js dafür schlägt genau so nach wie in
  Abschnitt 2 beschrieben, auch bei perspektivischem Blick) [11]. Kein Licht, kein Umriss. Datei
  `apps/editor/src/ozzy/material.ts`, das Kugelbild in `apps/editor/src/ozzy/wachs.ts`.
- **Das Kugelbild** ist deine Vorlage, ausgemessen: 29 × 29 Stützstellen über der Normalen, dazwischen weich gerechnet. Kein Bild
  aus ZBrush liegt im Code; es sind Zahlen, an deinem Bildschirmfoto gemessen und geglättet.
- **Wie nah:** Die Tabelle weicht von der geglätteten Vorlage im Mittel 1,4 bis 1,7 von 255 Stufen ab. Ozzys fertiges Bild der
  Kugel, mit dem Farbton der Vorlage: **1,6 / 1,4 / 1,5 Stufen im Mittel (Rot / Grün / Blau), größte Abweichung 9**, gemessen
  an 6 353 Stellen innerhalb von 90 % des Halbmessers. Außerhalb von 97 % des Halbmessers ist die Vorlage nicht messbar (ihre
  Kantenglättung mischt dort den Grund hinein); der Rand ist nach außen fortgesetzt.
- **Der Farbton.** Jede Farbe des Kugelbilds wird im Farbraum OKLCH um denselben Winkel gedreht; Helligkeit und Buntheit bleiben.
  0 ist ZBrushs Rot. Der rote Körper der Vorlage hat den Farbton 27°; Druck-Magenta (#e6007e) läge bei −28, reines
  Bildschirm-Magenta (#ff00ff) bei −59. **Grundwert: −40.** Das ist mein Vorschlag; du stellst ihn im Feinregler („Material
  Wachs“, Farbton) und sagst mir deinen Wert. Im Vergleichsbild stehen sechs Farbtöne nebeneinander.
- **Nebenbei behoben:** Der dunkle Verlauf zeigte zuerst Ringe. Die Zeichenfläche der festen Materialien hielt die Farben mit 8
  Bit in linearen Werten; für dunkle Töne bleiben da nur wenige Stufen. Sie hält jetzt 16 Bit. Solid und Zebra ändert das nicht
  (ihre Probe hält unverändert).

**Was nicht nachgebaut ist:**

- **Die Vertiefungen** (Bild B, Cavity Detection, Cavity Transition). An einer Kugel sieht man sie nicht, an deinen runden Formen
  kaum. Um sie zu treffen, bräuchte ich ein zweites Bild aus ZBrush: eine Form mit Falten oder Rillen in Red Wax. Technisch ginge
  es (die Krümmung im Bild je Bildpunkt). Ich teste es erst, wenn du es willst; Kriterium wäre wieder ein Vergleichsbild.
- **Die Regler von ZBrush** (Intensity, Depth, Opacity …). Ozzy hat nur den Farbton.
- **Die mitgelieferten Werte von Red Wax.** Nicht zu finden (Abschnitt 3). Das Bild trifft es trotzdem, weil die Messung das
  fertige Ergebnis nimmt.

**Aufgefallen** (nicht von dieser Arbeit, gilt für alle festen Materialien): Die senkrechte Kante der hinteren Raumecke ist als
feine Linie über der Form zu sehen. Bei der Seifenhaut passt das (sie ist durchsichtig), bei Solid, Zebra und Wachs nicht. Steht
in der Übergabe.

## 7. Was das für den Paint-Modus heißt

- **Zwei Gründe zum Malen:** das helle Solid (hell, fast ohne eigene Farbe) und das Wachs (dunkel, Magenta). Du hast beide genannt.
- **ZBrush färbt Gemaltes mit dem Material ein** (Abschnitt 4). Auf Wachs sähe ein gemaltes Weiß magenta aus. Das ist die
  bekannte Schwäche von Red Wax beim Bemalen.
- **Mein Vorschlag für Ozzy** (steht im Plan als Probe mit Bild, vor dem Bau): Das Wachs gilt als Farbe nur dort, wo nichts
  gemalt ist. Eine gemalte Fläche bekommt vom Wachs das Hell und Dunkel und den Glanz, aber ihre eigene Farbe. So bleibt die Form
  beim Malen lesbar, und die Farben stimmen.

## Quellen

1. Maxon, ZBrush-Hilfe, „Materials“: https://help.maxon.net/zbr/en-us/Content/html/user-guide/materials-lights-rendering/materials/materials.html
2. Maxon, ZBrush-Hilfe, Nachschlagewerk „Material → Modifiers“: https://help.maxon.net/zbr/en-us/Content/html/reference-guide/material/modifiers/modifiers.html
3. Maxon, ZBrush-Hilfe, „LightCap“: https://help.maxon.net/zbr/en-us/Content/html/user-guide/materials-lights-rendering/lights/lightcap/lightcap.html
4. Sloan, Martin, Gooch, Gooch: „The Lit Sphere: A Model for Capturing NPR Shading from Art“, Graphics Interface 2001, S. 143–150:
   https://graphicsinterface.org/proceedings/gi2001/gi2001-17 (Text: https://users.cs.northwestern.edu/~bgooch/PDFs/LitSphere.pdf)
5. Abschrift der alten ZBrush-Dokumentation zum Werkzeug MatCap: http://informationzbrush.blogspot.com/2012/12/matcaps.html; Maxon, „MatCap“:
   https://help.maxon.net/zbr/en-us/Content/html/user-guide/materials-lights-rendering/materials/matcap/matcap.html
6. ZBrushCentral, „MatCap mystery material“ (Liste der Regler): https://www.zbrushcentral.com/t/matcap-mystery-material/276366
7. Eric Keller: „Introducing ZBrush 4“ (Sybex, 2011), Kapitel zu Materialien (Red Wax, Cavity Detection 0,5, Cavity Transition −0,5);
   gefunden über die Suche, den Text selbst konnte ich nicht öffnen.
8. ZBrushCentral, „Silly Matcap question…“ (Antwort von marcus_civis zu den zwei Kugeln von Red Wax):
   https://www.zbrushcentral.com/t/silly-matcap-question/325356
9. Maxon, ZBrush-Hilfe, „Wax Modifiers“: https://help.maxon.net/zbr/en-us/Content/html/reference-guide/material/wax-modifiers/wax-modifiers.html
10. ZBrushCentral, Fragen zum Bemalen auf Red Wax, zum Beispiel https://www.zbrushcentral.com/t/create-white-colour-in-polypaint/207085,
    https://www.zbrushcentral.com/t/material-for-polypaint/313003, https://www.zbrushcentral.com/t/polypaint-with-matcap-problem/276466
11. three.js, `MeshMatcapMaterial`: https://threejs.org/docs/#api/en/materials/MeshMatcapMaterial

## Nachstellen

- Vergleichsbild und Messung: aus `apps/editor`
  `OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/wachs-vergleich.mjs` (schreibt das Bild oben und meldet die
  Abweichung).
- Probe der Materialien: `GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-material-fenster.mjs`
  (Kriterium 2b ist das Wachs).
- Test des Kugelbilds: `npx vitest run src/ozzy/wachs.test.ts`.
