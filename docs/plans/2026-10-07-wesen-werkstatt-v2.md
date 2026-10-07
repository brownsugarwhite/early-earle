# Plan v2: Wesen-Werkstatt — Lückenliste, elegantere Architektur, Reihenfolge

> Stand 2026-10-07 nachts. Ergänzt den freigegebenen Plan `2026-10-07-wesen-werkstatt.md` nach Florians Urteil zum ersten
> Stand („nur die Maulöffnung war vielversprechend, sonst erreicht nichts die Vorgaben“) und nach seinem Prompt mit den
> 19 Bögen. **Maßstab sind ausschließlich Florians Prompt und die 19 Bilder** (`docs/look/wesen-refs/README.md`); jede
> Abnahme ist ein Render **neben** dem Bild, dazu ein Silhouettenmaß.

## 1. Lückenliste — Florians Prompt Punkt für Punkt gegen den Ist-Stand

| # | Anforderung (Prompt) | Stand | Lücke / Urteil |
|---|---|---|---|
| 1 | Jellyblob wie Bild 1 (Licht von rechts, zwei Innenlappen, Schlitzauge, Bläschen) | Jelly-Material auf dem Mesh | Innenlappen und Glanzstriche gegen Bild 1 prüfen; Form ok |
| 2 | Grundblob stufenlos (lang, würfelig, rund, dünn, dick); **PezenPez ist der Ur-Blob**, alle Stufen entstehen aus ihm | Regler + 13 Grundformen aus der Vorlage | Editor-Logik „aus PezenPez formen“ fehlt; Vorlagen sind getrennte Baupläne |
| 3 | Grundblob ohne Maul, **Verschmelzen wie zwei Flüssigkeiten** | nicht gebaut (K7) | fehlt ganz |
| 4 | Maul riesig, öffnet und **schließt perfekt**; rundes Loch (Fisch) ↔ Rex-Keil mit Mundwinkeln nach hinten, **stufenlos**; Zunge immer sichtbar | Verschluss v2 misst 0 % Lücke; neues einheitliches Öffnungsprofil (Weite, Mundwinkel-Rundung) | Form der Haube/des Löffels, Lippenband, Zungengröße weit von Bild 5/11/14; Zwischenformen gegen Bild 4/13 ungeprüft |
| 5 | Drache ohne Unterkiefer: Öffnung am Hals, starker Unterbiss | Kinnschnitt, Biss | wirkt ausgefranst, Zähne/Hals nicht wie Bild 5 rechts |
| 6 | Langer Hals, Dicke stufenlos, Maul oben am Kopf; Giraffe geschlossen unsichtbar glatt | Hals, Kopf-Träger | Giraffenform (Tropfenkörper, verjüngter Hals, Schnauze) weit von Bild 6; Hals sitzt wie ein Rohr auf dem Körper |
| 7 | Über-/Unterbiss, Kieferform, Zähne stufenlos; Zähne deutlich darüber/darunter (Bild 7) | biss, kante, hauer, aussen | gegen Bild 7 ungeprüft; kantiger Raubkatzenkiefer (Bild 9) nur Regler, Look fehlt |
| 8 | Oberkiefer: **Schnäbel** (Papagei, Tukan), **W-Form** Hund/Katze (Bild 8) | wForm-Regler | Schnäbel fehlen ganz; W-Form ungeprüft; Nasenspiegel fehlt |
| 9 | Zähne rund/spitz, Größe stufenlos, zufällig groß/klein, **passen auch geschlossen** | alles vorhanden, passend gekürzt | Form (gebogen, warmer Ansatz) und Verteilung (vorn groß, hinten klein) gegen Bild 11 |
| 10 | Augen 1–4, Position; Schlitzaugen blinzeln; große Augen mit Pupille (Bild 10); Spirale, X, Sichel; Schlangen-/Drachenaugen gelb, schwarz mit weißer Pupille; **Blinzeln auch bei großen Augen**; dunkler Ring; Tiefe bis Rex (Bild 11) | Typen, Ring, Tiefe | Augen zu groß, stehen heraus; keine Lider → kein Blinzeln großer Augen; Sichel/Spirale/X fehlen; Rex-Auge (orangerote Sklera, tief, Braue) nicht getroffen |
| 11 | 2–4 Beine nahtlos, Saugnapf, Dicke, **Schenkeldicke**; Schlangenunterkörper | vorhanden | Beinform gegen Bild 12 ungeprüft; Rex-Beine kurz/dick/großer Fuß nicht getroffen |
| 12 | Schwanz: Dicken/Formen stufenlos; Rex-Linie Schnauze–Schwanzspitze horizontal; Anhang/Quaste | Typen vorhanden | Rex-Haltung nicht getroffen (Körper lehnt nicht nach vorn) |
| 13 | Muster/Schuppen **unverzerrt** bei jeder Form | Wirbelsäulen-Koordinaten | an der Schlange prüfen |
| 14 | Anbauten: Ohren, Flügel, Rückenschuppen, Mähne/Frisur, Rüssel; dünne Vogel-/Spinnenbeine (zwei Stile) | nicht gebaut (K4/K5) | fehlt ganz |
| 15 | Gemalte Linien/Shading wie Bild 3; Fell Raubkatzen/Hunde; Fisch-/Dino-/Drachenmuster; Farben frei; Bereiche wählbar | Material mit Stufen, Korn, Mustern | Look weit entfernt: zu glatt/„CG“, Stufen statt Airbrush, Lippenfarbe falsch; Fell fehlt |
| 16 | Bild 17 übersetzen; Krokodil-/Walstruktur als Maul | Mustertypen vorhanden | Übersetzung fehlt |
| 17 | Rüssel, Schnauzen (Hund, Katze, Vogel) | nicht gebaut | fehlt |
| 18 | Feste Blobs mit Schimmer wie Bild 18 oben | Glimmer-Ebene | gegen Bild 18 ungeprüft (körnig matt, Verlauf nach unten) |
| 19 | Feuer- und Nebelwesen **exakt** wie Bild 18 | nicht gebaut (K6) | fehlt |
| 20 | Rückenschuppen/Mähne/Fell lassen Platz für Maul, Augen, Arme | — | fehlt |
| 21 | Vögel im Stil von Bild 15 | — | fehlt |
| 22 | Fische schwimmen, Flügelwesen fliegen (einstellbar) | — | fehlt (K4) |
| 23 | Animationen im Editor: Verschmelzen, Laufen, Idle, Maul auf/zu | Maul auf/zu, Blinzeln, Atmen | Rest fehlt |
| 24 | Lichtposition und Shader kombinierbar | Tab „Licht & Stil“ | vorhanden |
| 25 | iPhone/Android optimal | — | nicht gemessen (K10) |
| 26 | Editor übersichtlich | L1-Lab | K8 offen |

Ehrliches Fazit: Phase 1 hat das **System** (Bauplan → SDF → Dual Contouring → Material → Lab) und den **Maulverschluss** geliefert, aber in **Form, Gesicht und Shading** noch keine Vorlage getroffen. Der Fehler lag nicht im Prinzip, sondern in der Formensprache (Ellipsoid- und Rotationskörper-Summen statt gezeichneter Silhouetten) und darin, dass ohne die Bilder vor Augen gearbeitet wurde.

## 2. Was sich am Ansatz ändert (eleganter, näher an der Zeichnung)

**A. Formen aus Profilkurven statt aus Primitiven.** Florian zeichnet Silhouetten (Bild 2, 3). Jede Masse wird darum aus
**zwei bis drei 2D-Kurven** gebaut, die der Editor direkt zeigt und morpht: Seitenprofil (Rücken- und Bauchlinie),
Breitenprofil (Draufsicht) und Querschnitts-Rundung (Superellipse). Daraus entsteht ein Loft als Distanzfeld (wie heute
`koerper.profil`, aber vorn/hinten getrennt und mit Breitenprofil). Massen: Körper, **Kopfhaube** (Oberkiefer: Stirn,
Braue, Schnauze), **Löffel** (Unterkiefer: Kinnlinie, Wangen), Hals (Sweep mit Dickenkurve), Beine, Schwanz, Rüssel. Die
Verschmelzung bleibt Smooth-Min, aber mit **kleinem k** — Übergänge sind gezeichnet (Kurven treffen sich), nicht
aufgeblasen. Die 13 Grundformen sind bereits solche Profile; Rex, Giraffe, Katze, Vogel bekommen eigene Profilsätze,
die aus Bild 3/5/6/9/15 abgenommen werden (Overlay im Referenzmodus).

**B. Gesicht als gestaltete Teile.** Auge = Lider (oben/unten, Körpermaterial, blinzeln in jeder Tiefe) + Ball mit
Shader-Iris/Pupille/Glanz + dunkler Ring; Augengröße in Prozent der Kopfhöhe (Bögen: 8–12 %), bündig oder unter der
Braue versenkt. Braue und Nasenlöcher als Profilbeulen/-dellen. **Lippenband**: helle Kante entlang der Maullinie
(Zahnfleisch, Bild 11) statt dunklem Wulst; Dicke 0 … Wulst. Zähne: gebogene Kegel, Größenkurve entlang der Lippe (vorn
und Eckzahn groß, hinten klein), warmer Ansatz. Zunge groß mit Mittelfurche. Schnäbel als eigene Haube/Löffel-Profile.

**C. Shading nach den Bögen.** Zwei Wertzonen mit **breiter weicher Terminator-Federung** (Airbrush) statt drei Stufen,
Höhenverlauf (unten dunkler), gesättigte kühle Schatten, feines Korn in den Mitteltönen, **kein Glanz**, Rim nur hauchdünn;
Farbflächen (Bauch/Rücken, Muster, Lippenband, Augenring) mit harten, leicht gewellten Kanten; gemalte Pinselnormalen
(leichte Normalenstörung in Körperkoordinaten) für die Pinselanmutung; die „Earle-Stufen“ bleiben ein Regler für die Karte.
Rachen: flaches sattes Maroon mit dunklem Grund, nicht schwarz.

**D. Fell als große gemalte Büschel** (instanzierte Karten mit Verlauf, Längen-/Richtungsfelder, Gesichtsmaske) — Stand
der Technik für stilisierte Echtzeit-Tiere sind Karten/Büschel, Strähnen sind auf Mobil zu teuer, Shells ungeeignet.

**E. Objektiv messen.** Harness: Render **neben** Referenzausschnitt (steht) **plus Silhouettenmaß** (IoU der Umrisse nach
Einpassen) und Wertverteilung (drei Plateaus?) je Vorlage im Kontaktbogen. Florians Blick entscheidet, die Zahl zeigt die
Richtung.

**F. Held zuerst, dann Breite.** Erst der **Rex** (Bild 5 links, 11, 12, 14) bis Florian „ja“ sagt — er enthält Haube,
Löffel, Zähne, Rex-Auge, Beine, Schwanz, Shading. Dann Giraffe (Bild 6), Fische (Bild 4), Raubkatze (Bild 9/14), Hund
(Bild 8), Drache ohne Unterkiefer (Bild 5 rechts), fester Blob (Bild 18). Erst danach Anbauten, Fell, Feuer/Nebel,
Verschmelzen, Animation, Editor-Ausbau.

## 3. Recherche (Verfahren, nicht Bilder)

- **Implizite Formen:** Skelettbasierte Konvolutionsflächen (SCALIS) und **Implicit Skinning** (Vaillant et al.) vermeiden
  die Beulen von Smooth-Min an Gelenken und liefern Kontakt-/Faltenverhalten in Echtzeit
  ([Vaillant](http://rodolphe-vaillant.fr/entry/31/implicit-skinning-real-time-skin-deformation-with-contact-modeli),
  [Skeleton-driven implicit skinning](https://www.sciencedirect.com/science/article/abs/pii/S0097849311001348),
  [Extreme LOD für skelettbasierte implizite Flächen, 2026](https://www.sciencedirect.com/science/article/pii/S0097849326001172)).
  Für uns: Profil-Lofts mit kleinem k zuerst (billig, gezeichnet); Konvolution/Implicit Skinning als Option für Gelenke in K4.
- **SDF-Sculpting-Praxis:** Dreams (Media Molecule) wertet SDF-Edits hierarchisch aus, cacht 8³-Blöcke in einem Oktree
  und streut Punkt-Splats für den malerischen Look ([Zusammenfassung](https://gamefromscratch.com/sdf-the-future-of-3d-modelling/)).
  Für uns: Oktree-Verfeinerung nur um Maul und Augen (lokal 2× Auflösung) statt global 88³.
- **Mesh aus SDF:** „Dual Contouring of Signed Distance Data“ (2026) erzielt scharfe Kanten ohne Gradienten, ist aber
  Offline-Optimierung ([arXiv](https://arxiv.org/html/2604.00157v1)); unser DC mit QEF, Kantenmaß und Facettennormalen bleibt;
  Schnitt-k ≈ 1,25 Zellen, lokale Verfeinerung statt feinerem Gitter.
- **Gemaltes Echtzeit-Shading:** Stufenverlauf + Pinselstrich-Normalen + Rand-Erosion + Verlaufskarte ([de Laubier,
  Breakdown](https://cyn-prod.com/stylized-paint-shader-breakdown)); Verlaufskarten statt physikalischem Licht
  ([Gradient Mapping](https://savedpixel.com/blog/gradient-mapping)); Earle-Übersetzung mit flachen Farben/Verläufen und
  Details als Punkt-/Liniengeometrie ([Murphy & Galanter, SIGGRAPH 2014](https://history.siggraph.org/wp-content/uploads/2022/12/2014-Poster-97-Murphy_Stylized-Trees-and-Landscapes.pdf)).
- **Fell:** Karten/Büschel sind Standard für stilisierte Tiere in Echtzeit, Strähnen-Renderer (SIGGRAPH 2025 Advances)
  zielen auf High-End bis Mobil, aber mit Aufwand; Shells/Fins für Mobil nicht empfohlen
  ([Advances 2025](https://advances.realtimerendering.com/s2025/index.html), [Fur Cards UE5](https://www.artstation.com/artwork/wJWaY6)).
- **Augen:** SDF-basierte Augen-Shader (Iris, Pupille, Glanz, Blinzeln im Shader) sind gängig und billig
  ([Beispiel Godot](https://godotshaders.com/shader/cartoon-animated-eyes/)); unsere Schlitzaugen sind so gebaut, große
  Augen bekommen Shader-Iris auf der Kugel plus Lider aus Körpermaterial.

## 4. Reihenfolge jetzt

1. **Lückenliste und Referenzkatalog** (dieses Dokument, `docs/look/wesen-refs/README.md`) — erledigt.
2. **Profil-Lofts** für Körper (Rücken/Bauch getrennt, Breitenprofil), Kopfhaube und Löffel; Rex-Profile aus Bild 5/11/14
   im Overlay abnehmen; Lippenband, Zahnkurve, Zunge, Rex-Auge (klein, tief, orangerot) — **Rex gegen Bild 5/11/14/12**.
3. Shading C am Rex und am festen Blob (Bild 18 oben); Silhouettenmaß im Harness.
4. Giraffe (Bild 6), Fische (Bild 4), Raubkatze (Bild 9/14), Hund (Bild 8), Drache (Bild 5 rechts) als Profilsätze.
5. Dann Phase 2 wie im Plan v1 (Augenlider/Ausdrücke, Beine/Gang/Schwimmen/Fliegen, Anbauten, Fell/Feuer/Nebel,
   Verschmelzen, Editor, Vorlagen, Leistung) — jede Baustelle mit Bild-neben-Bild-Abnahme.

Gate: Florian sagt zum Rex „ja, das ist mein Rex“. Vorher keine Breite.
