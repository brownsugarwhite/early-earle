# Haarphysik in Echtzeit: wie GTA 6 es macht, was davon in Ozzy geht (24.11.2026)

Florian (wörtlich): „wie bekommt z.B gta 6 seine haarphysik in echtzeit so gut hin? können wir das auch?“

## Was über GTA 6 bekannt ist

- Rockstar hat die Technik nicht veröffentlicht. Alles stammt aus Analysen der Trailer und Vorführungen (Digital Foundry,
  Fachpresse); Zahlen zu Haaren und Verfahren sind Vermutung.
- Die Haare der Hauptfiguren wirken wie einzelne Strähnen statt Haarkarten (GTA 5: Karten). Sie schwingen von der Wurzel zur Spitze
  verzögert nach (Digital Foundry zu Trailer 2), wehen im Wind, folgen der Bewegung und werfen glaubhafte Schatten. Haare und Kleidung
  bewegen sich je für sich.
- Auf Konsolen 30 Bilder je Sekunde (Digital Foundry hält einen 60er-Modus für unwahrscheinlich).

Quellen: [GamesRadar](https://www.gamesradar.com/two-weeks-since-the-gta-6-trailer-the-community-has-reached-the-hair-analysis-stage-of-scouring-every-last-frame),
[LibertyCity zu Digital Foundry, Trailer 2](https://libertycity.net/news/gta-6/8997-digital-foundry-analyzes-gta-6s-second.html),
[Rockstar Intel zu Digital Foundry](https://rockstarintel.com/digital-foundry-reacts-to-gta-6-trailer-astonishing-detail-but-60fps-mode-unlikely),
[Push Square, 08/2026](https://www.pushsquare.com/news/2026/08/tech-experts-call-gta-6-the-most-impressive-example-of-real-time-rendering-weve-ever-seen),
[GamePro](https://www.gamepro.de/artikel/gta-6-haare-grafik-detail,3458730.html).

## Wie Spiele das allgemein machen (Stand der Technik)

Bekannte Lösungen: Unreal „Groom“, AMD TressFX, EA Frostbite (Strähnen).

1. **Wenige Leithaare rechnen, viele Haare zeichnen.** Einige hundert bis einige tausend Leithaare, jedes eine Kette aus Punkten:
   Länge bleibt gleich, eine Formkraft hält die Frisur, dazu Schwerkraft, Wind, Trägheit (der Kopf dreht sich, die Spitzen kommen
   später) und Stöße gegen einfache Körper (Kugeln, Kapseln um Kopf und Schultern). Die zehntausenden sichtbaren Haare folgen den
   Leithaaren (zwischen ihnen gemittelt). So bleibt die Physik billig.
2. **Auf der Grafikkarte:** alle Ketten zugleich, in Compute-Shadern.
3. **Zeichnen:** Strähnen als dünne Bänder oder mit eigener Rasterung für Linien. Weich werden sie durch Kantenglättung über mehrere
   Bilder (TAA), dazu Schatten im Haar und Haarlicht (Glanz, zweiter farbiger Glanz, Durchschein).
4. **Nach Wichtigkeit gestuft:** Hauptfiguren Strähnen, Nebenfiguren Karten (bei GTA 6 vermutet, nicht belegt).

## Was davon in Ozzy geht

- **Da:** die Flusen der Schafwolle (24.11., `schalen.ts`): Haare als Bänder, Wurzeln auf der Haut, beim Formen mitgeführt. Das ist
  das Zeichnen.
- **Fehlt:** Leithaare mit Physik (Ketten aus Punkten: Länge, Form, Schwerkraft, Wind, Trägheit, Stöße gegen Kugeln aus der Form);
  die gezeichneten Haare folgen ihnen. Im Editor (WebGL2) im Prozessor oder über Texturen gerechnet, im Spiel (three.js WebGPU) als
  Compute-Shader.
- **Wo man es sieht:** beim Formen (die Haut wird gezogen, die Haare schwingen nach), in Posen und Animation, im Wind (Regler).
- **Grenzen:** Konsolen haben ein Vielfaches der Grafikleistung eines iPhones, und GTA 6 ist die Arbeit eines großen Teams über Jahre.
  Unser Renderer glättet nicht über mehrere Bilder, feine Haare flimmern darum eher (dagegen: „blasser statt dünner“). Im Spiel gilt
  höchstens 8 000 Dreiecke je Wesen (gebacken); echte Haare bräuchten ein eigenes Budget.
- **Probe (auf sein Wort):** langes Haar (etwa Vorlage 10, violett) mit rund 1 000 Leithaaren, die beim Bewegen der Form nachschwingen.
  Kriterium: von der Wurzel zur Spitze verzögert, ohne Zittern, auf dem Mac beim Bewegen höchstens rund 20 ms je Bild; Beweis als
  kurzer Film.
