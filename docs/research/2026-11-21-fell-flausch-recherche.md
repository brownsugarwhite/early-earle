# Fell, Flausch, Häute im Zeichenstil: Recherche für Shader-Runde 6 (21.11.2026)

Florian: „Mache gerne nochmal ausführliche recherchen welche arten von fell es gibt und wie wir es am besten darstellen. Auch
verschiedenen Zuckerwatte/wolke, flauchige shader.“ Hier steht, was es gibt, wie es gezeigt wird und was unsere Shader daraus
nehmen. Quellen am Ende.

## 1. Woraus Fell besteht

- **Grannenhaare (Leithaare):** lang, steif, glänzend, tragen Farbe und Muster; sie bestimmen die Silhouette.
- **Wollhaare (Unterwolle):** kurz, dicht, gewellt, matt; sie machen das Fell voll und dunkel an der Wurzel.
- **Tasthaare:** einzeln, lang, steif (Schnurrhaare). Für uns ohne Kopf nicht platzierbar.
- **Agouti-Bänder:** Viele Wildtiere haben Haare mit Bändern (Wurzel dunkel, Mitte hell, Spitze dunkel). Daher das „getickte“
  Aussehen von Hase, Wolf, Abessinierkatze: Die Farbe hängt davon ab, wie tief man ins Fell sieht.

## 2. Felltypen und was sie im Bild ausmacht

| Typ | Beispiele | Im Bild | Im Shader |
|---|---|---|---|
| Kurzhaar, glatt | Pferd, Dobermann, Robbe | liegt flach, ein langer Glanz | kurze Haare, starke Neigung, Glanz breit |
| Doppelfell (Stockhaar) | Wolf, Husky, Fuchs | dicht, Grannen stehen über der Unterwolle | zwei Schichten: dichte kurze, lockere lange |
| Plüsch | Chinchilla, Britisch Kurzhaar | dicht, steht ab, samtig, kaum Richtung | viele feine Haare, kaum Neigung, Samtglanz am Rand |
| Langhaar, seidig | Perser, Afghane | fällt, bildet Strähnen | lange Haare, Büschel stark, Schwerkraft |
| Zottelfell | Yak, Hochlandrind | lange, grobe Strähnen | große Büschel, wellig, ungleich lang |
| Rauhaar | Terrier | drahtig, borstig, wirr | steife Haare, zufällige Richtungen |
| Locken | Pudel, Karakul (Persianer) | enge Locken | Haare als Wendeln (Schraube um die Wurzel) |
| Wolle | Schaf | Stapel aus gekräuselten Fasern | Büschel als Locken, Spitzen dunkler (Schmutz) |
| Flaum, Daunen | Küken, Pusteblume | ohne Struktur, sehr fein, durchscheinend | sehr feine Fasern, locker, Licht scheint durch |
| Samt | Maulwurf | kurz, senkrecht, ohne Strich | keine Neigung, sehr dicht |

## 3. Muster und wie sie entstehen

- **Turing-Muster** (Reaktion und Diffusion): Je nach Größe und Form des Körperteils entstehen Flecken oder Streifen
  (Murray: Schwänze geringelt, Körper gefleckt). Unsere Muster bilden das nach, ohne es zu simulieren.
- **Katzen (Tabby):** getigert (Makrele: schmale Querstreifen vom Rücken nach unten), gestromt oder marmoriert (Classic: breite
  Wirbel an den Flanken, drei Streifen längs des Rückens), getupft (Streifen in Flecken zerfallen), getickt (nur Agouti-Bänder,
  kaum Zeichnung).
- **Schildpatt und Kaliko:** Schwarz und Rot als feines Mosaik (Schildpatt) oder große Flecken, bei Kaliko dazu Weiß. Entsteht aus
  der zufälligen Abschaltung eines X-Chromosoms je Zellklon: unregelmäßige, scharf begrenzte Flecken.
- **Colorpoint (Siam):** Das Enzym der Farbe arbeitet nur bei kühlerer Temperatur. Darum sind die Enden dunkel: Ohren, Pfoten,
  Schwanz, Gesicht. Für uns: dunkel, wo die Form dünn ist und weit von ihrer Mitte (wo sie auskühlt).
- **Scheckung (Platten, Piebald):** Die Pigmentzellen wandern beim Embryo vom Rücken nach unten und nach vorn. Wo sie nicht
  hinkommen, bleibt das Fell weiß: Bauch, Pfoten, Blesse an der Stirn. Für uns: weiß von unten und an den Enden her, mit
  unregelmäßiger Grenze.
- **Hunde:** Merle (dunkle Flecken auf verdünntem, hellerem Grund), gestromt (Brindle: dunkle Streifen auf hellem Grund),
  Schimmel (Roan: weiße Haare eingemischt), Tüpfel (Ticking), Sattel, Tricolor.
- **Wildtiere:** Rosetten (Leopard; Jaguar mit Punkt in der Rosette; Schneeleopard groß und offen; Ozelot als Ketten),
  Vollflecken (Gepard, Serval), Streifen (Tiger, Zebra), Netz (Giraffe), Gegenschattierung (dunkler Rücken, heller Bauch), Ringe
  (Waschbär, Katta), Maske, Kitzflecken, Wildhund (Flicken in Schwarz, Gelb, Weiß), Hyäne (Flecken).

## 4. Wie man Fell zeigt

| Weg | Was es gibt | Für uns |
|---|---|---|
| Einzelne Strähnen (Marschner 2003, d'Eon 2011, Yan 2015 mit Mark, Chiang 2016) | Film-Qualität | zu teuer im Editor |
| **Schalen und Finnen** (Lengyel, Praun, Finkelstein, Hoppe 2001) | die Haut mehrfach, je Schicht der Querschnitt der Haare; Fell mit echter Silhouette, in Echtzeit | **ja**: der Kern zeichnet das Netz instanziert, alle Schalen in einem Durchgang |
| Büschel und Locken in Schichten (Silva, Bando, Chen, Nishita 2010) | Spitzen laufen zur Mitte des Büschels, Locken als Versatz je Schicht | ja, im Fragment-Shader |
| Selbstschatten (Kloetzli, Olano) | Wurzeln dunkler | als Abdunkeln nach Höhe |
| Kajiya-Kay (1989) mit verschobenen Glanzlinien (Scheuermann 2004) | Glanz längs der Haare, ein weißer und ein farbiger | ja |
| Karten mit Haaren (Spiele) | billig, flach | nein |
| Gemalt im Bild (Nachbearbeitung) | sieht aus wie gemalt, rutscht aber bei Bewegung unter der Form durch | nein |

**Kantenglättung:** Haare sind dünner als ein Bildpunkt. Ohne Glättung flimmert das beim Drehen (wie früher LEGO). Mit mehreren
Abtastungen je Bildpunkt und Deckung zu Abtastungen (alpha to coverage) bleiben die Schalen ruhig.

## 5. Stile

- **Ghibli:** Die Hintergründe sind mit Plakatfarbe gemalt (Nicker Poster Color, deckend wie Gouache). Totoro, Moro, die Katzenbus:
  Fell als gemalte Büschel, wenige Töne, weiche Pinselkanten, eine Silhouette aus Zotteln.
- **Puss in Boots: The Last Wish** (DreamWorks 2022): Das Team wollte das Fell fast weglassen, behielt aber einen echten Groom
  (das Fell muss sich sträuben können) und vereinfachte ihn malerisch: weniger Detail, Kanten aufgebrochen, grafisches Randlicht.
  Grundsatz (Budsberg): nicht realistisch bauen und dann filtern, sondern gleich malerisch bauen. Für uns: gemalte Büschel als
  Geometrie (Schalen), nicht als Filter über dem Bild.
- **Anime:** Büschel als spitze Formen, zwei Töne mit harter Grenze, Randlicht, Kontur. Guilty Gear Xrd (Motomura, GDC 2015): Licht
  ist an oder aus, jedes Rauschen auf der Fläche stört; die Verteilung der Schatten muss gelenkt werden (dort über Normalen im Netz,
  bei uns über die glatte Normale der Form statt der Normale jedes Haars), Konturen über eine umgedrehte Hülle, innere Linien.
- **Spider-Verse:** Striche, Rasterpunkte, versetzte Farbplatten, Kontur in Tusche.
- **Manga:** Schwarz und Weiß, Rasterfolie (Punkte, Linien) für Halbtöne, Federstriche mit Druck (dünn, dick, dünn), Weißflächen.

## 6. Flausch: Wolke, Zuckerwatte, Wolle

- **Wolken in Echtzeit (Nubis, Schneider, Guerrilla Games):** Beer-Lambert (Licht nimmt mit der Dichte ab), Henyey-Greenstein
  (Licht streut nach vorn: Silberrand im Gegenlicht), Puder-Term (dunkle Kanten, weil am Rand wenig gestreutes Licht ankommt:
  1 − e^(−Dichte)), Mehrfachstreuung nach Wrenninge (mehrere Oktaven mit sinkender Auslöschung: Wolken bleiben innen hell).
- **Gezeichnete Wolken:** Stufen statt Verlauf (posterisiert), Ränder hart; Cartoon-Rauch (McGuire und Fein 2006) als Teilchen mit
  Stufenlicht und schwarzer Kontur.
- **Zuckerwatte:** viele feine Fasern aus geschmolzenem Zucker, wirr, durchscheinend, Licht streut stark, Kristalle glitzern;
  gefärbt meist rosa oder hellblau, oft beide ineinander.
- **Wolle:** gekräuselte Fasern, die sich zu Locken (Stapeln) zusammenlegen; außen grau oder bräunlich (Schmutz, Wetter), innen
  weiß.

## 7. Diskokugel, wie sie wirklich aussieht

Eine Kugel aus Breitenkreisen kleiner ebener Spiegelplättchen (1 bis 2 cm), jedes leicht verkippt, mit dunklen Fugen. Im Bild ist
die Kugel meist dunkel (sie spiegelt den dunklen Raum); nur die Plättchen, die gerade eine Lampe zum Auge spiegeln, blitzen auf,
grell, mit Sternen. Jede Lampe wirft über jedes Plättchen einen eigenen Lichtfleck an Wand und Boden; dreht sich die Kugel, wandern
alle Flecken gleich schnell. Im Dunst sieht man die Strahlen von der Kugel zu den Flecken.

## 8. Was die Shader daraus nehmen

1. **Fell als Schalen**, alle in einem Durchgang (instanziert), mit Deckung zu Abtastungen; Haare als Zellen im Raum; Büschel;
   Strich längs der Körperachse und nach unten; Länge je Haar verschieden; zwei Schichten (Unterwolle, Grannen) je nach Felltyp;
   Locken als Wendeln.
2. **Muster an der Wurzel jedes Haars** (Haar für Haar), Agouti-Bänder längs des Haars; Colorpoint und Scheckung aus Ort und
   Dicke der Form.
3. **Stile als Bau, nicht als Filter:** gemalte, spitze oder getuschte Büschel sind die Schalen selbst; nur Papier, Raster und
   Kontur kommen im Bild dazu.
4. **Flausch** mit denselben Schalen, aber durchscheinend gemischt (Zuckerwatte, Wolke) und mit dem Licht der Wolken (Beer, Puder,
   Vorwärtsstreuung, Mehrfachstreuung).
5. **Diskokugel** in Breitenkreisen um die Hochachse, jedes Plättchen eben und verkippt; Strahlen als Linien im Raum statt als
   körniger Dunst.

## Quellen

- Lengyel, Praun, Finkelstein, Hoppe: Real-Time Fur over Arbitrary Surfaces (2001): https://hhoppe.com/proj/fur/
- NVIDIA: Fur (Shells and Fins): https://developer.download.nvidia.com/SDK/10.5/direct3d/Source/Fur/doc/FurShellsAndFins.pdf
- Silva, Bando, Chen, Nishita: Curling and Clumping Fur Represented by Texture Layers (2010): https://web.media.mit.edu/~bandy/fur
- Scheuermann: Practical Real-Time Hair Rendering and Shading (SIGGRAPH 2004):
  https://history.siggraph.org/wp-content/uploads/2022/12/2004-Talks-Scheuermann_Practical-Real-Time-Hair-Rendering-and-Shading.pdf
- Kloetzli, Olano: Volumetric PRT for fur: https://www.csee.umbc.edu/files/2022/06/Kloetzli-VolumetricPRT.pdf
- Puss in Boots: The Last Wish, Fell und Stil: https://beforesandafters.com/2023/01/11/heres-how-dreamworks-lent-a-whole-new-brand-of-stylized-look-and-feel-to-puss-in-boots-the-last-wish
  und https://beforesandafters.com/2025/01/10/if-you-want-a-painterly-bush-paint-the-bush/
- Ghibli, Plakatfarbe und Hintergründe (Kazuo Oga): https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when
- Motomura: GuiltyGearXrd's Art Style (GDC 2015): https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf
- Nubis (Guerrilla Games): https://www2.slideshare.net/guerrillagames/nubis-realtime-volumetric-cloudscapes-in-a-nutshell
- Wrenninge: Art-Directable Multiple Volumetric Scattering: https://history.siggraph.org/learning/art-directable-multiple-volumetric-scattering-by-wrenninge
- McGuire, Fein: Real-Time Rendering of Cartoon Smoke and Clouds (2006): https://faculty.digipen.edu/~gherron/references/References/NPR/mf-2006-toonsmoke.pdf
- Katzenfell und Muster: https://www.wikipedia.org/wiki/Tabby , https://cats.com/guide-to-cat-fur
- Scheckung (Wanderung der Pigmentzellen): https://pmc.ncbi.nlm.nih.gov/articles/PMC44358 , https://www.nature.com/articles/ncomms10288
