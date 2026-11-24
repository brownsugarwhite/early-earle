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

## Warum nicht gleich WebGPU im Editor? (Florian, 24.11.)

- **Geht, und hätte Vorteile:** Compute-Shader (Haare, Stoff, Partikel, vielleicht der Rechenkern) und derselbe Renderer wie das
  Spiel (three.js WebGPU mit TSL): Shader aus Ozzy ließen sich im Spiel weiterverwenden.
- **Aber ein eigener Umbau:** Ozzy zeichnet mit WebGL2 und eigenen GLSL-Programmen (allein `src/ozzy/shader/` hat rund 18 700 Zeilen,
  97 Shader; dazu die Materialien des Editors). Der WebGPU-Renderer von three.js nimmt diese Programme nicht; alles müsste in TSL
  oder WGSL neu geschrieben werden.
- **iPad und iPhone:** WebGPU nur über HTTPS. Über die WLAN-Adresse (http) fällt Safari still auf WebGL2 zurück, und die iOS-App
  bekommt vermutlich nur WebGL2 (`docs/FALLEN.md`). Was wir in WebGPU bauen, braucht auf seinen Geräten also einen WebGL2-Weg oder
  einen Server mit HTTPS und einem Zertifikat, dem die Geräte vertrauen.
- **Für die Haarprobe nicht nötig:** rund 1 000 Leithaare mit je 12 Punkten rechnet der Prozessor in wenigen Millisekunden
  (geschätzt, in der Probe zu messen); die vielen sichtbaren Haare folgen im Vertex-Shader, das kann WebGL2.
- **Empfehlung:** die Haarprobe jetzt in WebGL2. „Editor und Spiel auf einem Renderer“ als eigener Plan, mit kleinem Test vorab
  (ein Shader in TSL und eine Rechnung auf der Grafikkarte, über HTTPS auf dem iPhone).

## Und wenn Ozzy später eine iPad-App wird? (Florian, 24.11.)

- **Das Zertifikat ist nur fürs Testen** vom Mac über das WLAN nötig. In einer App liegt Ozzy in der App selbst; Nutzer installieren
  nichts.
- **Wege:**
  1. **App-Hülle um denselben Code** (wie das Spiel mit Capacitor; im Innern ein WKWebView). `capacitor://localhost` gilt laut
     Capacitor-Forum und WebKit-Fehlerberichten auf neuerem iOS als sicherer Kontext. WebGPU ist seit iOS/iPadOS 26 eingeschaltet; für
     WKWebView sagte ein WebKit-Entwickler, es komme mit, sobald es in Safari eingeschaltet ist (nur indirekt belegt). Frühe
     26er-Versionen hatten Fehler (behoben in 26.4), es gibt Berichte über Abstürze auf einem iPhone 15, auf dem iPad stabil. Also: am
     Gerät prüfen (`window.isSecureContext`, `navigator.gpu`) und WebGL2 als Rückfall behalten.
  2. **Web-App mit eigener Adresse** im Internet (echtes Zertifikat), „Zum Home-Bildschirm“: WebGPU wie in Safari, ohne App Store.
  3. **Native App** (Swift, Metal): alles neu schreiben, für Ozzy nicht sinnvoll.
- **App Store:** Apple verlangt mehr als eine verpackte Webseite; ein volles Werkzeug mit Stift und Dateien erfüllt das.
- **Folge für den WebGPU-Test:** nicht nur Safari über HTTPS, sondern auch eine App-Hülle auf dem iPad prüfen.

Quellen: [WebGPU-Stand je Browser](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status),
[Apple-Forum: WKWebView und WebGPU](https://developer.apple.com/forums/thread/770862),
[WebKit 301627 (iOS 26.2)](https://bugs.webkit.org/show_bug.cgi?id=301627),
[Apple-Forum: Absturz iPhone 15, iOS 26.4](https://developer.apple.com/forums/thread/822200),
[Ionic-Forum: eigenes Schema auf iOS](https://forum.ionicframework.com/t/https-for-the-app-server-protocol-instead-of-capacitor-on-ios/200116),
[WebKit 220184](https://bugs.webkit.org/show_bug.cgi?id=220184).
