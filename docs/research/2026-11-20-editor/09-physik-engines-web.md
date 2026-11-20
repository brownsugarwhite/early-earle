# 09 · Physik-Engines für Web und iPhone

Stand: 20.11.2026. Teil der Editor-Recherche (`docs/research/2026-11-20-editor/`). Frage: Mit welcher 2D-Physik rechnen der
Editor („Studio“) und das Ozzy-Spiel, und wie wird sie in Animation, Zeitleiste, Spiellogik und Editor eingebunden (Vorschau,
Zurückspulen, Aufnehmen)?

**Zur Arbeitsweise.** Versionen, Daten und Paketgrößen sind am 20.11.2026 aus der npm-Registry und aus den Antworten des CDN
jsDelivr gelesen (Brotli-Größe = tatsächliche Übertragungsgröße). Messwerte stammen aus den Quellen; eigene Messungen gibt es
noch nicht (Abschnitt 9 schlägt eine einzige Probe vor). Gegen Ende war das gemeinsame Suchkontingent der Sitzung erschöpft;
die späten Aussagen stützen sich deshalb direkt auf die Primärquellen (Handbücher, Changelogs, Blogs der Autoren), nicht auf
weitere Suchen. Wo eine Zahl eine eigene Schätzung ist, steht das dabei.

---

## Kurzfassung

1. **Tempo entscheidet in unserem Fall nicht.** Ozzy, das Rad und einige Dutzend Hindernisse sind für jede ernsthafte Engine
   eine kleine Last (Schätzung: deutlich unter 1 ms je Takt auf dem iPhone 16, Herleitung in 5.4). Es entscheiden die
   Bewegungsqualität (Gelenke, Reibung auf dem drehenden Rad, kein Zittern), die Wiederholbarkeit (Determinismus), das
   Zurückspulen im Editor, die Pflege der Web-Anbindung und wie gut sich die Engine hinter einer eigenen, einfachen Bedienung
   verstecken lässt.
2. **Weltphysik (Rad, Ozzys Körper, Sturz, Hindernisse, Sensoren): Box2D 3.2 als WebAssembly** über `box2d3-wasm` 6.0
   (Einzel-Thread-Build „compat“), hinter einer eigenen, schmalen TypeScript-Schnittstelle. Box2D 3.2 (18.10.2026) hat den
   Löser, an dem sich andere Engines orientieren (Soft Step), kontinuierliche Kollision, Ketten ohne Geisterkollisionen,
   Rollwiderstand, ein Motor-Gelenk mit Feder-
   und Tempozielen, einen dynamischen „Mover“ mit Pogo-Feder (passt genau auf Ozzys Tapsen), plattformübergreifenden
   Determinismus und Snapshots. Das WebAssembly ist klein (162 KB Brotli).
3. **Plan B: Rapier 2D 0.21 im Paket `-deterministic`.** Gleich stark in der Sache, offizielle TypeScript-API vom Engine-Team,
   Snapshots, Mehrkörpergelenke, PD-Motoren, seit September 2026 auch Weichkörper. Dagegen: rund viermal so großes WebAssembly
   (673 KB Brotli), häufige API-Brüche, Weichkörper in erster Fassung. Die eigene Schnittstelle hält einen Wechsel billig.
4. **Figurphysik (Nachschwingen von Ohren, Schwanz, Bart und Kopf, Quetschen der Bohne, Federn auf Punkten und Griffen):
   eigene XPBD-Schicht in TypeScript.** Sie läuft auch ohne Welt in der Zeitleiste, lässt sich trivial zurückspulen und arbeitet
   direkt auf dem, was Florian formt (Punkte, Griffe, Knochen). Für Kontakte, Reibung und Stapel ist XPBD die schwächere Wahl;
   das zeigen die Erfahrungen von Box2D und Avian.
5. **Nicht verwenden:** Matter.js (keine kontinuierliche Kollision, Gelenke nur als Federn), p2.js (letztes Release 2015),
   Phaser Box2D (bei Box2D 3.0 stehen geblieben, keine Snapshots). Planck.js bleibt als reiner JavaScript-Rückfall denkbar.
6. **Fester Takt mit Interpolation ist Pflicht:** 60 Hz mit 4 Unterschritten, die Darstellung mischt zwischen den letzten
   beiden Zuständen. Das iPhone 16 zeigt 60 Hz, der Mac 120 Hz; nur ein fester Takt macht beides gleich und wiederholbar. Der
   Prototyp rechnet heute mit variablem Zeitschritt und ist darum nicht bitgenau wiederholbar.
7. **Editor:** Vorschau mit Einzelschritt; Zurückspulen über ein Eingabeprotokoll, Schlüssel-Snapshots (alle 16 Takte, wie
   der Replay-Viewer von Box2D) und deterministisches Nachrechnen; „Aufnehmen“ backt eine Bewegung in Schlüssel, die Florian
   danach wie jeden anderen Übergang selbst formt.

---

## 1. Was unser Fall verlangt

### 1.1 Spiel: Ozzy auf dem Rad

- **Das Rad** ist ein großer Kreis, vom Bildrand angeschnitten, den der Spieler vorsichtig dreht. Physikalisch ist es ein
  *kinematischer Körper*: Er folgt der Vorgabe, schiebt und trägt alles, was auf ihm steht, wird aber selbst nicht geschoben.
  Hindernisse und Erhöhungen sitzen auf dem Rad und drehen mit.
- **Ozzy** steht auf der Krümmung und tapst bergab, stolpert bei zu viel Tempo, fällt lustig hin, steht wieder auf, springt
  über Dinge, läuft über kleine Hindernisse und hat einen eigenen Kopf (bleibt stehen, wechselt das Tempo). Das verlangt
  Kontakte mit Reibung auf einer bewegten, gekrümmten Fläche, Strahl- und Formabfragen (wo ist der Boden unter jedem Fuß),
  Gelenke mit Motoren und Grenzen (Sturz), Ereignisse (Aufprall, Berührung, Zonen) und kontinuierliche Kollision für schnelle
  Stürze.
- **Spiellogik** hängt an Sensoren (Zonen), Berührungen, Aufprallstärken und gebrochenen Gelenken.

### 1.2 Figur

- Nachschwingen (Ohren, Schwanz, Bart, Kopf), Quetschen und Dehnen der Bohne mit Flächenerhalt, Aufprall-Federn (heute in
  `apps/editor/src/ozzy-figur/ablauf.ts` als gedämpfte Schwingung), Übergänge zwischen Posen ohne Sprung.
- Florians Vorgabe: Ozzy muss genau wie die Zeichnung aussehen. Physik darf nur vorübergehend abweichen und muss in die
  gezeichnete Form zurückfinden (Formabgleich zur aktuellen Pose, siehe `docs/research/2026-11-18-ozzy-figur-recherche.md`).

### 1.3 Editor

- Physik im Editor vorschauen, anhalten, Takt für Takt weiterschalten, zurückspulen, aufnehmen.
- Alles visuell einstellbar: Florian programmiert nicht. Er arbeitet auf dem Mac (M3 Pro) und auf iPad/iPhone 16, also in
  Safari bzw. in der WebView von Capacitor (WKWebView).

### 1.4 Größenordnung

- Normalfall: ein Rad (ein Kreis plus 10 bis 50 Hindernisformen), Ozzy als 2 bis 3 Körper (Rumpf, Kopf, vielleicht Becken)
  mit vier Federbeinen; im Sturz 10 bis 14 Körper mit Gelenken; ein paar lose Gegenstände. Figurphysik: einige hundert Punkte.
- **Folge:** Rechenzeit ist Nebensache. Die Kriterien sind Bewegungsqualität, Wiederholbarkeit, Einbindung in Editor und
  Animation, Bedienbarkeit hinter einer eigenen Oberfläche, Pflege, Größe und Lizenz.

---

## 2. Wie die besten Engines arbeiten

### 2.1 Die gemeinsame Grundlage heute: Unterschritte und weiche Bedingungen

- **Klassisch (Box2D 2.x, Planck.js):** „Sequential Impulses“. Je Bild mehrere Durchgänge über alle Kontakte und Gelenke,
  danach eine Positionskorrektur gegen Durchdringung. Gut erforscht, aber Stapel und lange Gelenkketten werden weich, und die
  Korrektur kann Energie erzeugen.
- **Soft Step / TGS Soft (Box2D 3.x, Rapier, Avian):** Erin Catto hat 2024 in „Solver2D“ acht Löser mit gleichem Aufwand
  verglichen (60 Hz, 4 Haupt- und 2 Nebendurchgänge) und für Box2D 3 den Löser gewählt, der *Unterschritte* (mehrere kleine
  Schritte statt vieler Durchgänge), *Warmstart* (Impulse des letzten Schritts als Startwert), *weiche Bedingungen*
  (Steifigkeit als Frequenz in Hz plus Dämpfungsgrad, dadurch unabhängig von den Massen) und einen *Entspannungsdurchgang*
  (nimmt die durch die Weichheit eingebrachte Energie wieder heraus) verbindet. Weiche Bedingungen mit hoher Frequenz wirken
  bei Unterschritten praktisch starr; die Kosten liegen etwa bei der alten Baumgarte-Korrektur
  ([Solver2D](https://box2d.org/posts/2024/02/solver2d/)).
- **Rapier** beschreibt seine Löserdurchgänge ausdrücklich als Unterschritte (Standard 4, für hohe Stapel und steife Gelenke
  8 bis 12) und gibt die Weichheit der Kontakte ebenfalls als Frequenz plus Dämpfung an
  ([Integrationsparameter](https://rapier.rs/docs/user_guides/javascript/integration_parameters)).
- **Avian** (Physik für die Rust-Engine Bevy) hat seine Kontakte von XPBD auf TGS Soft umgestellt, nach dem Vorbild von
  Box2D 3, und berichtet von stabilen Pyramiden statt Einsturz, sanft aufgelösten Überlappungen statt Explosionen und vier- bis
  fünffachem Tempo in kontaktreichen Szenen. Gelenke rechnet Avian vorerst weiter mit XPBD
  ([Avian 0.1](https://joonaa.dev/blog/06/avian-0-1)).

**Folge für die Bedienung:** Alle ernsthaften Engines und auch eine eigene XPBD-Schicht lassen sich mit derselben Sprache
einstellen: **Frequenz (wie straff) und Dämpfung (wie lange es nachschwingt)**. Das ist die Grundlage für einen einzigen,
überall gleichen Feder-Regler im Editor, für Gelenkfedern, Kontaktweichheit, Nachschwingen der Ohren und die Federn der
Übergänge (der Prototyp nutzt schon kritisch gedämpfte Federn mit einer Rate in 1/s).

### 2.2 Box2D 3.2 (C, MIT), im Web über `box2d3-wasm`

**Stand.** Box2D 3.0 erschien im August 2024, 3.1 im April 2025, **3.2 am 18.10.2026**
([Blogliste](https://box2d.org/posts/), [3.2](https://box2d.org/posts/2026/10/box2d-3.2/)). Unity 6.3 LTS hat Box2D v3 mit
neuen 2D-Schnittstellen eingebaut ([Meldung, 12/2025](https://alternativeto.net/news/2025/12/unity-6-3-lts-arrives-with-hybrid-2d-3d-scenes-box2d-v3-and-cross-platform-toolkit)),
Defold stellt 2026 auf Box2D 3 als Standard um ([Rückblick](https://defold.com/2026/01/02/Defold-2025-Retrospective/)).
Im Juni 2026 hat der Autor zusätzlich Box3D angekündigt; die 2D-Engine wird weiter gepflegt.

**Mechanik, die für uns zählt:**

- **Löser:** Soft Step wie oben. Empfohlen: fester Schritt, 60 Hz, 4 Unterschritte
  ([Simulation](https://box2d.org/documentation/md_simulation.html)).
- **Tempo:** 3.2 ist laut Autor grob dreimal so schnell wie 3.1. Die Anteile schätzt er so: Wiederverwendung von
  Kontaktpunkten etwa 40 %, verfeinerter Löser 20 %, AVX2 15 %, Löser-Optimierung 10 %, Breitphase 10 %
  ([3.2](https://box2d.org/posts/2026/10/box2d-3.2/), [Contact Recycling](https://box2d.org/posts/2026/10/contact-recycling/)).
- **Kontinuierliche Kollision (CCD):** Dynamische Körper werden standardmäßig kontinuierlich gegen statische geprüft;
  „Bullets“ zusätzlich gegen alle anderen Arten. 3.2 bringt einen Sicherheitsfaktor je Körper und kontinuierliche
  Sensorereignisse ([Simulation](https://box2d.org/documentation/md_simulation.html),
  [Release Notes 3.2](https://box2d.org/documentation/md_release__notes__v320.html)). Für uns wichtig: Das Rad ist
  kinematisch, nicht statisch; Ozzys Rumpf sollte deshalb als Bullet laufen (bei einem Körper kostet das nichts).
- **Formen:** Kreis, Kapsel, Polygon (konvex, höchstens 8 Ecken, auch mit Rundung), Segment, Kette. **Ketten sind einseitig
  und vermeiden Geisterkollisionen**: Gleitet eine Form über aneinandergesetzte Segmente, bleibt sie sonst an den Nähten
  „hängen“; jede Kante kennt ihre Nachbarecken und verwirft unpassende Kontaktnormalen
  ([Ghost Collisions](https://box2d.org/posts/2020/06/ghost-collisions/)). In 3.2 sind Ketten segmentbasiert; offene Ketten
  brauchen zwei Geisterpunkte.
- **Gelenke:** Abstand (mit Feder in Hz und Dämpfung), Scharnier (Motor mit Tempo und Höchstmoment, Grenzen, Feder),
  Schiebegelenk, Schweißgelenk, Radgelenk (Federung plus Antrieb), Motor-Gelenk, Filter (schaltet nur die Kollision zweier
  Körper ab, fast kostenlos, gedacht für Ragdolls), brechbare Gelenke über Kraft- und Momentschwellen. In 3.2 haben alle
  Gelenke eine gemeinsame Basis mit lokalen Rahmen, das Maus-Gelenk entfällt, **das Motor-Gelenk hat Feder- und
  Tempoziele**. Der Autor empfiehlt, einen Körper an einen kinematischen Hilfskörper zu hängen und diesen mit
  `b2Body_SetTargetTransform` zu führen ([Simulation](https://box2d.org/documentation/md_simulation.html)). Genau so folgt
  ein Ragdoll-Glied einer gezeichneten Pose mit begrenzter Kraft.
- **Kinematische Körper:** werden über Geschwindigkeit bewegt; `b2Body_SetTargetTransform` (seit 3.1) rechnet die nötige
  Geschwindigkeit aus einer Zielstellung aus. 3.2 macht kinematische Körper billiger. Das passt auf das Rad.
- **Rollwiderstand und Tangentialtempo** (seit 3.1): Rollwiderstand bremst rollende Formen wie Reibung, sodass ein Kreis auch
  am Hang zur Ruhe kommt; Tangentialtempo macht eine Fläche zum Förderband und ist im Löser praktisch kostenlos
  ([3.1](https://box2d.org/posts/2025/04/box2d-3.1), [Simulation](https://box2d.org/documentation/md_simulation.html)).
- **Figurensteuerung:** 3.1 brachte einen geometrischen Mover (Kapsel außerhalb der Welt, für Plattformer und Netzspiele),
  **3.2 einen dynamischen Mover**: ein normaler Körper, geführt von einem *Mover-Gelenk* (nur Tempobefehle, getrennte
  Höchstkräfte für x und y) und einer *Pogo-Feder* zwischen Körper und Boden, die Unebenheiten glättet, getrennte Grenzen für
  Stauchen und Ziehen hat und je Schritt aus Strahlabfragen neu entsteht. Gedacht für Einzelspieler-Spiele mit echter
  Wechselwirkung; beides ist ausdrücklich experimentell ([Charakter](https://box2d.org/documentation/md_character.html)).
- **Ereignisse statt Rückrufe:** Bewegungsereignisse aller Körper nach jedem Schritt als zusammenhängendes Feld
  (`b2World_GetBodyEvents`), Kontakt-, Treffer-, Sensor- und Gelenkereignisse. Das ist günstig für die Anbindung an die
  Darstellung und für Wiederholbarkeit.
- **Determinismus:** gleiches Ergebnis bei gleicher Eingabe, unabhängig von der Thread-Zahl; plattformübergreifend seit 3.1
  (geprüft auf x64 und ARM, z. B. Apple M2 gegen AMD Ryzen). Bedingungen: kein „fast-math“, kein Zusammenziehen zu FMA, eigene
  Näherungen für sin, cos und atan2, die Welt für einen Wiederholungslauf neu aufbauen
  ([Determinism](https://box2d.org/posts/2024/08/determinism/), [FAQ](https://box2d.org/documentation/md_faq.html)).
- **Snapshots, Aufnahme und Wiedergabe (3.2):** Eine Aufnahme beginnt mit einem vollständigen Snapshot und protokolliert danach
  jeden verändernden Aufruf samt Argumenten; jeder Schritt speichert einen Hash der Lagen und Geschwindigkeiten. Der
  Replay-Viewer legt beim Laden Schlüssel-Snapshots an (Standard alle 16 Schritte, innerhalb eines Speicherbudgets) und kann so
  vor- und zurückspulen. `b2World_Snapshot`/`b2World_Restore` setzen die Welt auf einen gespeicherten Stand; Kennungen bleiben
  gültig, weil sie Indizes mit Generationszähler sind. Grenzen: nur so deterministisch wie der eigene Spielcode, keine
  Teil-Snapshots, große Welten ergeben große Snapshots ([Replay](https://box2d.org/posts/2026/06/replay/)).
- **Einheiten:** Meter, Kilogramm, Sekunden. Bewegte Körper am besten zwischen 0,1 und 10 m, Optimum um 1 m; Pixel über einen
  Maßstab umrechnen ([FAQ](https://box2d.org/documentation/md_faq.html)).

**Im Web: `box2d3-wasm` 6.0.0 (26.10.2026, MIT, Alex Birch und Erik Sombroek)**
([Repo](https://github.com/Birch-san/box2d3-wasm), [README](https://github.com/Birch-san/box2d3-wasm/blob/main/box2d3-wasm/README.md)):

- Folgt Box2D 3.2, acht Tage nach dessen Erscheinen veröffentlicht; Vorgänger 5.x von November 2025 bis Februar 2026.
- Drei Fassungen: *deluxe* (SIMD und Threads; braucht die Header COOP/COEP für `SharedArrayBuffer`), *compat* (ohne SIMD und
  Threads, überall lauffähig), *double* (große Welten). Der Import `box2d3-wasm/compat` hält Threads und Worker aus dem Bündel.
- API im Stil der C-Funktionen (`b2CreateRevoluteJoint(worldId, def)`), erzeugt über C++-Hüllen; **TypeScript-Typen liegen
  bei** (rund 68 KB `.d.ts`).
- **Snapshots sind gebunden** (`b2World_GetSnapshot` liefert ein `Uint8Array`, dazu `b2World_RestoreFromSnapshot`,
  `b2CreateWorldFromSnapshot` und `b2World_GetStateHash`). Ebenso Mover- und Pogo-Gelenk. **Noch nicht gebunden:** Aufnahme und
  Wiedergabe sowie der eigenständige Baum.
- Speicher von Hand: Werte, die als Objekt aus WASM kommen (z. B. `b2Body_GetPosition`), müssen mit `.delete()` freigegeben
  werden; Kennungen sind einfache JS-Objekte. JS-Rückrufe (Pre-Solve, Filter, Reibungsmischung) gehen nur in Einzel-Thread-Welten.
- Box2D 3.2 liefert erstmals eine JSON-Beschreibung der öffentlichen API für Bindungsgeneratoren
  ([Release Notes 3.2](https://box2d.org/documentation/md_release__notes__v320.html)). Das ist die Absicherung, falls die
  Bindung einmal nicht nachzieht: Eine schlanke eigene Bindung nur für die Funktionen, die wir brauchen (Schätzung: rund 60),
  wäre erzeugbar.

**Stärken:** Referenz-Löser für 2D (Avian hat ihn übernommen), viele Bausteine genau für unseren Fall (kinematisches Rad, Ketten, Rollwiderstand, Mover mit
Pogo-Feder, Motor-Gelenk zum Posen-Folgen), dokumentierter Determinismus, Snapshots, kleines WebAssembly, hervorragende
Dokumentation und Beispiele, Industriestandard.
**Schwächen:** Web-Bindung von einem Zwei-Personen-Projekt; Speicherverwaltung mit `.delete()`; C-Stil statt idiomatischem
TypeScript; Aufnahme/Wiedergabe noch nicht im Web; Mover und Pogo sind experimentell; keine Weichkörper.

### 2.3 Rapier 2D (Rust nach WebAssembly, Apache-2.0)

**Stand.** `@dimforge/rapier2d` 0.21.0 vom 25.09.2026 (Rapier 0.36), davor 0.20.0 vom 08.08.2026 und 0.19.x bis November
2025 (npm). Das eigene Repository der JS-Bindung wurde am 12.07.2026 archiviert; die TypeScript-Bindung liegt seitdem im
Haupt-Repository der Engine ([rapier.js](https://github.com/dimforge/rapier.js), [rapier](https://github.com/dimforge/rapier)).
Engine und Bindung kommen damit aus einer Hand. Finanziert über Sponsoren und Firmenaufträge
([Rückblick 2025](https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge)).

**Pakete:** Standard, `-simd`, `-compat` (WebAssembly als Base64 im JS, für Umgebungen ohne passenden Bündler) und
`-deterministic`. Seit 0.15 ist die „erweiterte Determinismus“-Einstellung nur noch im Paket `-deterministic` an; es ist
weniger optimiert ([Changelog](https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md)).

**Mechanik:**

- **Löser:** Unterschritte (Standard 4) mit weichen Kontakten in Hz und Dämpfung, Warmstart; Gelenke als *Impulsgelenke*
  oder als *Mehrkörpergelenke* in reduzierten Koordinaten (Ketten ohne jedes Auseinanderdriften, gut für steife Glieder).
- **Motoren** sind PD-Regler: `configureMotorPosition(ziel, steifigkeit, dämpfung)`, `configureMotorVelocity`, Höchstkraft
  ([Gelenke](https://rapier.rs/docs/user_guides/javascript/joints)). Dazu ein `PidController` (seit 0.15) und ein
  kinematischer `KinematicCharacterController`.
- **CCD:** automatisch für schnelle Körper gegen feste Körper; je Körper einschaltbar gegen alle; `maxCcdSubsteps` regelt
  mehrere Treffer je Schritt ([CCD](https://rapier.rs/docs/user_guides/javascript/rigid_body_ccd)).
- **Formen:** Kreis, Quader, Kapsel, Segment, Dreieck, Polylinie, Höhenfeld, konvexe Polygone, gerundete Varianten, Verbund,
  seit 2025 Voxel.
- **Determinismus und Snapshots:** Die Doku nennt die WASM-Fassung plattformübergreifend deterministisch, wenn Körper, Formen
  und Gelenke in gleicher Reihenfolge entstehen und die Startwerte selbst deterministisch sind; ausdrücklich warnt sie vor
  `Math.sin`/`Math.cos` in den Startwerten. Prüfen über den Hash eines Snapshots. `world.takeSnapshot()` liefert die ganze Welt
  als `Uint8Array`, `World.restoreSnapshot()` baut sie wieder auf
  ([Determinismus](https://rapier.rs/docs/user_guides/javascript/determinism),
  [Serialisierung](https://rapier.rs/docs/user_guides/javascript/serialization)).
- **Weichkörper (Rapier 0.36, auch in 2D und im JS-Paket):** Formabgleich, Feder-Bedingungen (Kanten, Zellen, Volumen), FEM,
  Plastizität, Reißen, Käfig, der ein feines Netz trägt. Alle Gelenkarten lassen sich an Weichkörper hängen. Die Autoren nennen
  es die erste Fassung und rechnen mit unentdeckten Randfällen; Zahlen zum Tempo gibt es keine
  ([Weichkörper](https://dimforge.com/blog/2026/09/25/advanced-soft-bodies-for-games-in-the-rapier-physics-engine),
  [Bericht Q3](https://dimforge.com/blog/2026/10/25/dimforge-Q3-technical-report)).
- **Tempo:** Das schnellste npm-Paket von 2025 ist laut Dimforge zwei- bis fünfmal so schnell wie die beste Fassung von 2024;
  im Q3-Bericht 2026 bis zu doppelt so schnell auf einem Kern wie die Vorversion (nativ).

**Stärken:** offizielle, typisierte API; deterministisches Paket; Snapshots; Mehrkörpergelenke und PD-Motoren (Posen folgen
ohne Hilfskörper); Weichkörper und Seile für spätere Ideen; Debug-Ausgabe als Linienliste.
**Schwächen:** 2,4 MB WebAssembly (673 KB Brotli); 0.x-Versionen mit regelmäßigen Umbenennungen (zuletzt 0.19); erweiterte
Determinismus nur im langsameren Paket; Weichkörper neu; der Autor des Godot-Vergleichs in 3.3 ist zugleich Autor der
Rapier-Erweiterung für Godot.

### 2.4 Planck.js (TypeScript, MIT)

- Neuschreibung von Box2D 2.x in JavaScript/TypeScript, idiomatische API, gepflegt: 1.5.1 vom 12.10.2026 mit Robustheits- und
  Determinismus-Korrekturen; 1.0 war die Umstellung auf TypeScript
  ([Repo](https://github.com/piqnt/planck.js), [Changelog](https://github.com/piqnt/planck.js/blob/master/CHANGELOG.md)).
- Box2D-2.x-Bausteine: Ketten mit Geisterecken, viele Gelenkarten mit Motoren und Grenzen, CCD für Bullets, Serialisierung von
  Körpern, Formen und Gelenken (Umfang für ein bitgenaues Fortsetzen nicht dokumentiert, vermutlich ohne Kontaktzustand).
- 46 KB Brotli, kein WebAssembly, im Browser direkt lesbar und änderbar.
- **Schwächen:** älterer Löser ohne Unterschritte (weichere Gelenkketten, schwächere Stapel), keine Snapshots, langsamer: Ein
  älterer Vergleich (um 2020) misst Planck in Chrome etwa viermal und in Node etwa achtmal langsamer als die
  Emscripten-Fassung von Box2D, in Firefox etwa achtmal langsamer als die dort schnellste Fassung
  ([Benchmark](https://github.com/Lusito/box2d.ts/blob/master/packages/benchmark/README.md)).

### 2.5 Phaser Box2D (JavaScript, MIT)

- Von Hand nach JavaScript übertragenes Box2D 3.0 mit den Namen der C-API, rund 65 bis 70 KB gepackt, nicht an Phaser gebunden
  ([Ankündigung, 12/2024](https://phaser.io/news/2024/12/announcing-phaser-box2d), [Repo](https://github.com/phaserjs/phaser-box2d)).
- **Stillstand:** nur zwei Releases (23.12.2024 und 01.01.2025), keine Aussage zu 3.1 oder 3.2. Damit fehlen Rollwiderstand,
  Tangentialtempo, das neue Sensor-System, der Mover, Snapshots und der dreifache Tempogewinn von 3.2. Keine Aussage zum
  Determinismus.

### 2.6 Matter.js (JavaScript, MIT)

- Sehr einfache API, eigene Darstellung, 23 KB Brotli, große Nutzerschaft.
- **Keine kontinuierliche Kollision:** Das Ticket dazu ist seit Februar 2014 offen; der Autor verweist auf Unterschritte im
  `Runner` von 0.20 als Abhilfe ([Ticket 5](https://github.com/liabru/matter-js/issues/5)).
- Gelenke sind Federn zwischen Punkten (ein Scharnier ist eine Feder der Länge 0); keine Scharnier-Motoren, keine
  Winkelgrenzen. Letztes Release 0.20.0 am 23.06.2024 mit festem Zeitschritt im `Runner`
  ([Changelog](https://github.com/liabru/matter-js/blob/master/CHANGELOG.md)).
- Für „physikalisch korrekt“ mit Ragdoll, Motoren und schnellen Stürzen ungeeignet.

### 2.7 p2.js und p2-es (JavaScript, MIT)

- p2.js hat viele Gelenke (Scharnier mit Motor und Grenzen, Schiebe-, Zahnrad-, Starrgelenk), Federn, Kapseln und Höhenfelder.
  Letztes Release 0.7.1 am 21.11.2015 (npm).
- p2-es ist ein gepflegter, typsicherer Ableger ([Repo](https://github.com/pmndrs/p2-es)), letztes Release 1.2.3 am 01.11.2023.
- Älterer Löser, keine Snapshots, geringe Aktivität: kein Kandidat für ein Produkt, das Jahre leben soll.

### 2.8 Eine eigene XPBD-Lösung in TypeScript

**Mechanik.** XPBD (Macklin, Müller, Chentanez 2016) korrigiert direkt Positionen und beschreibt jede Bedingung mit einer
*Nachgiebigkeit* α (Kehrwert der Steifigkeit). Dadurch hängt die Steifigkeit nicht mehr von Schrittweite und Durchgangszahl ab.
„Small Steps“ (Macklin u. a. 2019) zeigt, dass viele Unterschritte mit je einem Durchgang besser konvergieren als viele
Durchgänge. Müller u. a. (2020) übertragen das auf Starrkörper mit Gelenken, Grenzen, Antrieben und Kontakten mit Reibung
([Veröffentlichungen](https://matthias-research.github.io/pages/publications/publications.html)). Die Reihe „Ten Minute Physics“
zeigt Starrkörper, Gelenke, Weichkörper, Stoff und Breitphasen als kurze JavaScript-Beispiele im Browser
([Ten Minute Physics](https://matthias-research.github.io/pages/tenMinutePhysics/index.html)). Formabgleich (Müller u. a. 2005)
zieht verformte Punkte in die Ruheform zurück; das steckt schon in `packages/physics/src/ShapeMatching.ts` (dort 3D, für die
Blasen des alten Spiels).

**Wo es glänzt:** Federn und Ketten (Ohren, Schwanz, Bart), Formabgleich und Flächenerhalt (Bohne), Seile, weiche Teile; alles
direkt auf Punkten, Griffen und Knochen; ein Regler „Weichheit“ bleibt bei jeder Bildrate gleich; Zustand ist ein paar
`Float64Array`, also trivial zu sichern, zurückzuspulen und zu backen; keine WebAssembly-Grenze, kein fremder Speicher.

**Wo es schwächelt:** Kontakte, Reibung und Stapel. Catto bekam die Reibung mit XPBD nicht gut in den Griff, und weit vom
Ursprung wurde es ungenau ([Solver2D](https://box2d.org/posts/2024/02/solver2d/)); Avian nennt explosive Auflösung tiefer
Überlappungen, fehlende echte Ruhe (feines Zittern) und weniger robuste Reibung als Gründe für den Wechsel
([Avian 0.1](https://joonaa.dev/blog/06/avian-0-1)). Dazu kommt alles, was eine fertige Engine mitbringt: Kollisionserkennung
für Kreis, Kapsel und Polygon, Breitphase, CCD, Schlafen, Abfragen, Ereignisse. Für Ozzys Welt wäre das Wochen an Arbeit und
dauerhafte Pflege, ohne die Qualität von Box2D zu erreichen.

### 2.9 Neuere Verfahren: AVBD

„Augmented Vertex Block Descent“ (Giles, Diaz, Yuksel, SIGGRAPH 2025) verspricht harte Bedingungen ohne Instabilität, gute
Konvergenz bei großen Steifigkeitsverhältnissen, Stapel mit Reibung, Gelenke und weich-starre Kopplung; es gibt 2D- und
3D-Demos im Browser mit Quellcode ([Projektseite](https://graphics.cs.utah.edu/research/projects/avbd/)). Dimforge will AVBD
in die GPU-Fassung Nexus einbauen. Für uns heute ein Beobachtungsposten, kein Fundament.

---

## 3. Web und iPhone: was die Plattform verlangt

### 3.1 WebAssembly in Safari und in der WebView der App

- Safari kann seit 16.4 (März 2023) 128-Bit-SIMD in WebAssembly ([WebKit](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)).
- **Threads** brauchen `SharedArrayBuffer` und damit Cross-Origin-Isolation (Header COOP/COEP). Ob sich das in der
  Capacitor-WebView sauber setzen lässt, ist offen. Wir brauchen es nicht: Unsere Szenen sind klein; der Einzel-Thread-Build
  reicht (Box2D „compat“, Rapier ohne Threads).
- **Lockdown-Modus:** Apple schreibt nur, dass „komplexe Web-Technologien“ gesperrt werden und dass man Websites und Apps
  ausnehmen kann ([Apple](https://support.apple.com/en-us/105120)). Ob WebAssembly in einer App-WebView betroffen ist, steht dort
  nicht; das ist eine offene Frage für die Probe (eine reine JS-Rückfallebene wäre Planck hinter derselben Schnittstelle).

### 3.2 Determinismus im Browser

- **WebAssembly:** Gewöhnliche Gleitkomma-Rechnung ist deterministisch; nichtdeterministisch sind nur die Bitmuster von NaN,
  die „relaxed SIMD“-Befehle, geteilter Speicher (Threads) und Ressourcenerschöpfung
  ([WebAssembly Design](https://github.com/WebAssembly/design/blob/main/Nondeterminism.md)). Ein Einzel-Thread-Build von Box2D,
  der ohnehin eigene trigonometrische Näherungen nutzt, sollte deshalb auf Mac und iPhone, in Safari und Chrome, bitgleich
  rechnen. **Das ist eine Ableitung, keine Messung**; prüfbar in Sekunden über `b2World_GetStateHash` auf beiden Geräten.
- **JavaScript:** Grundrechenarten und `Math.sqrt` sind exakt nach IEEE 754, aber viele `Math`-Funktionen haben eine
  implementationsabhängige Genauigkeit; verschiedene Browser und sogar dieselbe Engine auf anderem System können abweichen
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)). Für alles, was in die
  Simulation einfließt (Raddrehung, Ozzys Entscheidungen, Figurphysik), brauchen wir deshalb eigene Näherungen für sin, cos,
  atan2 und exp (wie Box2D) und einen Zufallsgenerator mit Saat, dessen Zustand im Snapshot liegt. Für die reine Darstellung
  darf `Math` bleiben.
- Wichtig auch: Der Spielcode bestimmt mit. Box2D sagt es ausdrücklich: Rückspulen ist nur so deterministisch wie der eigene
  Code ([Replay](https://box2d.org/posts/2026/06/replay/)).

### 3.3 Tempo: was die Quellen hergeben

| Messung | Ergebnis | Einordnung |
|---|---|---|
| Box2D 3.0, große Pyramide, nativ, 4 Threads ([SIMD Matters](https://box2d.org/posts/2024/08/simd-matters/)) | Apple M2 mit Neon 0,95 ms je Bild; M2 ohne SIMD 1,47 ms; AMD 7950X mit AVX2 0,90 ms | nativ, tausende Körper; zeigt die Größenordnung |
| Box2D 3.2 gegen 3.1 ([3.2](https://box2d.org/posts/2026/10/box2d-3.2/)) | grob dreifach schneller | Angabe des Autors, ohne Absolutwerte |
| Rapier JS 2025 gegen 2024 ([Rückblick](https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge)) | schnellstes Paket zwei- bis fünffach schneller | Angabe des Herstellers |
| Rapier 2D 0.35 gegen Box2D 3.1, nativ über Godot-Erweiterungen, 08/2026 ([Forum](https://forum.godotengine.org/t/physics-engine-comparison-rapier-vs-godot-vs-box2d-3d-vs-jolt/142786)) | Pyramide 16 gegen 17 ms, Zusammenstoß 8 gegen 9 ms, Haufen 7 gegen 6 ms, Abfragen 5,5 gegen 3,9 ms, Gelenkgitter 6,4 gegen 3,8 ms; Box2D bei Pyramide und Gelenkgitter „instabil“ | selbst berichtet vom Autor der Rapier-Erweiterung; Körperzahlen fehlen; die Instabilität verweist auf Tickets der Box2D-Erweiterung, nicht auf Box2D selbst; noch Box2D 3.1 |
| JS gegen WebAssembly, Box2D-Fassungen, um 2020 ([Benchmark](https://github.com/Lusito/box2d.ts/blob/master/packages/benchmark/README.md)) | Chrome 86: Emscripten-Box2D 5,5 ms, Planck 23,2 ms; Firefox 81: schnellste Fassung 13,7 ms, Planck 111,9 ms | alt, andere Versionen; nur die Richtung zählt |
| WebAssembly gegen nativ (Jangda u. a., USENIX ATC 2019, [Paper](https://www.usenix.org/conference/atc19/presentation/jangda)) | im Mittel 45 % (Firefox) bzw. 55 % (Chrome) langsamer, Spitzen 2,1- bis 2,5-fach | SPEC-Programme, nicht Physik; allgemeine Größenordnung |
| Safari auf dem iPhone mit diesen Engines | **keine öffentliche Messung gefunden** | deshalb eine eigene Probe (Abschnitt 9) |

Eine Vergleichsseite für nape-js, Matter, Planck und Rapier misst im eigenen Browser, zeigt aber keine festen Zahlen und
nutzt unterschiedliche Standard-Durchgänge je Engine ([napejs](https://napejs.org/benchmark.html)). Der ältere „Bench2d“ von
2014 ist für heutige Browser ohne Aussage.

### 3.4 Größe und Pflege (gelesen am 20.11.2026)

| Paket | Letztes Release | Lizenz | Laufzeit-Dateien roh | Übertragung (Brotli) |
|---|---|---|---|---|
| `box2d3-wasm` (compat) | 6.0.0, 26.10.2026 | MIT | 612 KB WASM + 102 KB JS | **162 KB + 23 KB** |
| `@dimforge/rapier2d` | 0.21.0, 25.09.2026 | Apache-2.0 | 2,40 MB WASM + 298 KB JS-Kleber + TS-Hüllen | **673 KB + 24 KB** + Hüllen |
| `phaser-box2d` | 1.1.0, 01.01.2025 | MIT | 276 KB JS (min.) | 58 KB |
| `planck` | 1.5.1, 12.10.2026 | MIT | 297 KB JS (min.) | 46 KB |
| `matter-js` | 0.20.0, 23.06.2024 | MIT | 83 KB JS (min.) | 23 KB |
| `p2` | 0.7.1, 21.11.2015 | MIT | 122 KB JS (min.) | 27 KB |
| `p2-es` | 1.2.3, 01.11.2023 | MIT | 303 KB JS (nicht min.) | – |

In der App liegen die Dateien lokal; die Größe zählt dort vor allem beim Start (Übersetzen des WebAssembly). Im Browser-Editor
zählt die Übertragung. Beides ist bei Box2D unkritisch, bei Rapier spürbar, aber tragbar.

### 3.5 Bildrate

- Das **iPhone 16** (ohne Pro) hat ein 60-Hz-Display; die WKWebView begrenzt Spiele ohnehin auf 60 Bilder je Sekunde
  (`docs/research/tech-stack.md`). Der **Mac** mit M3 Pro zeigt bis 120 Hz.
- Browser drosseln oder pausieren `requestAnimationFrame` in Hintergrund-Tabs; zwischen zwei Bildern kann also viel Zeit
  vergehen. Ein fester Takt mit Zeitkappung fängt beides ab (Abschnitt 4).

---

## 4. Fester Zeitschritt und Interpolation

**Verfahren** (nach „Fix Your Timestep!“, [Gaffer on Games](https://gafferongames.com/post/fix_your_timestep/)): Die
Simulation läuft nur in exakt gleich langen Takten. Jedes Bild legt die vergangene Zeit in einen Speicher, verbraucht daraus
ganze Takte und zeichnet eine Mischung aus vorletztem und letztem Zustand. Die Zeit je Bild wird gekappt (z. B. 0,25 s), und
die Zahl der Takte je Bild ist begrenzt, damit ein langsames Gerät nicht in eine Aufholspirale gerät.

```ts
const TAKT = 1 / 60;                 // fester Physiktakt
let rest = 0, takt = 0, vorher = performance.now();

function bild(jetzt: number): void {
  rest += Math.min(0.25, (jetzt - vorher) / 1000);   // Pausen und Hänger kappen
  vorher = jetzt;
  let n = 0;
  while (rest >= TAKT && n < 5) {                     // höchstens 5 Takte je Bild
    welt.merkeVorigenZustand();
    eingaben.anwenden(takt);                          // Raddrehung, Entscheidungen mit Saat
    welt.schritt(TAKT, 4);                            // Box2D: 4 Unterschritte
    figur.schritt(TAKT);                              // XPBD, z. B. 4 Teilschritte
    rest -= TAKT; takt++; n++;
  }
  if (n === 5) rest = Math.min(rest, TAKT);           // Rückstand verwerfen statt aufzuholen
  zeichne(rest / TAKT);                               // zwischen vorigem und jetzigem Zustand mischen
  requestAnimationFrame(bild);
}
```

- **Takt:** 60 Hz mit 4 Unterschritten ist die Empfehlung von Box2D und der Standard von Rapier. Bei 120 Hz Anzeige mischt die
  Darstellung zwischen zwei Takten; die Eingabe reagiert höchstens einen Takt (16,7 ms) später. Nur wenn Florian am Mac das
  Rad als träge empfindet, auf 120 Hz mit 2 Unterschritten wechseln (gleiche Kosten).
- **Mischen:** Lage linear, Winkel über den kürzesten Bogen, Figurpunkte linear. Nicht vorausrechnen (Extrapolation
  überschießt bei Stößen).
- **Der Prototyp heute** (`steuerung.ts`): Er bekommt das echte Bild-dt (gekappt auf 0,1 s), zerlegt es in Teilschritte von
  höchstens 1/240 s und rechnet die Federn damit. Das sieht glatt aus, ist aber nicht bitgenau wiederholbar, weil die Länge
  der Teilschritte von der Bildrate abhängt (60 Hz auf dem iPhone, 120 Hz auf dem Mac). Für Zurückspulen und Aufnehmen muss
  auch die Figur im festen Takt laufen (z. B. 4 Teilschritte zu 1/240 s je 60-Hz-Takt) und interpoliert gezeichnet werden.

---

## 5. Einbindung in Animation, Editor und Spiellogik

### 5.1 Zwei Schichten mit klarer Aufgabe

| Schicht | Rechnet | Womit | Warum so |
|---|---|---|---|
| **Weltphysik** | Rad, Ozzys Rumpf und Kopf, Federbeine, Sturz (Ragdoll), Hindernisse, lose Dinge, Sensoren | Box2D 3.2 (WASM) hinter eigener Schnittstelle | Kontakte, Reibung, Gelenke und CCD sind dort am besten gelöst |
| **Figurphysik** | Nachschwingen (Ohren, Schwanz, Bart, Kopf), Quetschen und Flächenerhalt der Bohne, Federn auf einzelnen Punkten und Griffen, Aufprall-Federn | eigene XPBD in TypeScript (Ausbau von `packages/physics`, 2D) | arbeitet direkt auf Florians Formen, läuft auch ohne Welt in der Zeitleiste, trivial zurückzuspulen |

Spine macht es für Sekundärbewegung ähnlich: Seine Physik-Bedingungen sind Federn auf Knochen (Trägheit, Stärke, Dämpfung,
Masse, Wind, Schwerkraft, Grenze, eigene Rechenrate), keine Starrkörper-Engine
([Spine](http://esotericsoftware.com/spine-physics-constraints)). Wir gehen einen Schritt weiter: Federn auch auf Punkten und
Griffen der Bézier-Formen, Formabgleich und Flächenerhalt.

### 5.2 Kopplung

- **Welt → Figur (jeden Takt):** Lage, Winkel und Beschleunigung von Rumpf und Kopf treiben die Knochen; die Beschleunigung
  stößt das Nachschwingen an (wie heute die Aufprall-Schwingung in `ablauf.ts`, nur aus echten Kräften). Treffer-Ereignisse
  mit Aufprallstärke (Box2D liefert sie je Kontakt) lösen Quetschen und Nachfedern aus. Fußpunkte kommen aus Strahlabfragen
  auf das Rad; die gezeichneten Beine erreichen sie über Posen und eine einfache Zwei-Knochen-Lösung.
- **Figur → Welt:** nur über Ziele, nie über verformte Formen. Im Sturz folgt jedes Ragdoll-Glied seiner gezeichneten Pose
  über ein Motor-Gelenk zu einem kinematischen Hilfskörper (Box2D-Empfehlung) mit begrenzter Kraft. Weniger Kraft heißt
  schlaffer, mehr Kraft heißt „steht wieder auf“. So bleibt der Look die Zeichnung, und die Physik sorgt für Gewicht.
- Diese Einbahn-Kopplung ist stabil (kein Rückkopplungsschwingen zwischen zwei Lösern) und reicht für alles, was die Spielidee
  braucht.

### 5.3 Vorschau, Zurückspulen, Aufnehmen

- **Vorschau:** „Spielen“ startet die Welt im festen Takt; Pause; Einzelschritt; „Ausgangslage merken“ (Snapshot) und „zurück
  zur Ausgangslage“, damit Florian eine Stelle zehnmal gleich ausprobieren kann.
- **Zurückspulen:** Während der Vorschau entstehen (a) ein *Eingabeprotokoll* je Takt (Raddrehung, Knöpfe, Saat der
  Entscheidungen) und (b) *Schlüssel-Snapshots* alle 16 Takte in einem festen Speicherbudget, genau wie im Replay-Viewer von
  Box2D ([Replay](https://box2d.org/posts/2026/06/replay/)). Zum Spulen an Takt t: nächsten Snapshot davor laden und höchstens
  15 Takte mit dem Protokoll nachrechnen. Bei unseren Szenen ist das schneller als ein Bild. Die Figurphysik legt ihren Zustand
  (wenige `Float64Array`) in denselben Snapshot. Spine löst dasselbe Problem im Editor, indem es bei jedem Bild ab Bild 0 neu
  rechnet; das kostet viel Rechenzeit und ist nur im Editor gedacht ([Spine](http://esotericsoftware.com/spine-physics-constraints)).
  Unsere Schlüssel-Snapshots vermeiden das.
- **Prüfen:** Ein Zustands-Hash je Takt (`b2World_GetStateHash` plus Hash der Figur) zeigt sofort, ob Wiederholungen bitgleich
  sind. Das gibt auch automatische Tests („nach 600 Takten derselbe Hash“) und Fehlerberichte: Florian schickt ein Protokoll,
  wir sehen exakt dasselbe.
- **Aufnehmen:** Lagen der Körper und Punkte der Figur je Takt aufzeichnen und in wenige Schlüssel umwandeln (Kurvenanpassung
  mit Fehlergrenze). Das Ergebnis ist ein gewöhnlicher Übergang, den Florian mit denselben Werkzeugen nachformt. Blender kennt
  das als Backen einer Simulation in Schlüssel ([Blender](https://docs.blender.org/manual/en/latest/physics/baking.html));
  Spine backt seine Physik dagegen nicht, sie läuft nur zur Laufzeit.
- **Physik als Übergang:** Ein Übergang zwischen zwei Posen kann „physikalisch“ sein (z. B. Hinfallen): Ragdoll mit
  Motorzielen der Zielpose, so lange rechnen, bis Ruhe herrscht, aufnehmen, fertig; danach nur noch Florians Feinschliff.

### 5.4 Rechenlast (eigene Schätzung)

- Box2D 3.0 brauchte nativ auf dem M2 ohne SIMD mit 4 Threads 1,47 ms für die große Pyramide (tausende Kisten). Auf einem
  Kern rund vier Mal so viel, im WebAssembly ohne SIMD noch einmal das 1,5- bis 2,5-fache (Jangda): grob 10 bis 15 ms für
  einige tausend Körper, also **einige Mikrosekunden je Körper**. 3.2 ist laut Autor dreimal schneller.
- Ozzy, Rad und 50 Hindernisse: **unter 0,2 ms je Takt**, auch mit Strahlabfragen für vier Beine. Annahme dabei: Ein Kern
  des iPhone 16 liegt in derselben Leistungsklasse wie ein Kern der M-Chips (nicht gemessen; die Probe prüft es).
- Figurphysik: einige hundert Punkte, rund tausend Bedingungen, 4 Teilschritte: **0,1 bis 0,5 ms** in TypeScript.
- Die teure Stelle bleibt das Zeichnen (Abstandsfelder in WebGL2), nicht die Physik. Planck wäre etwa vier- bis achtmal
  langsamer als Box2D-WASM und damit immer noch unter 1 ms.

### 5.5 Spiellogik

- **Sensoren** (seit Box2D 3.1 unabhängig von Körperart und Schlaf, Ereignisse am Ende des Schritts ohne Verzögerung, seit 3.2
  auch kontinuierlich) sind die Zonen der Spiellogik: „Ozzy betritt die Erhöhung“, „Pfote berührt Pfütze“.
- **Kontakt- und Treffer-Ereignisse** liefern Aufprallstärken (für Stolpern, Geräusche, Quetschen).
- **Gelenk-Ereignisse** melden das Überschreiten von Kraftschwellen (Brechen, „zu wilder Sturz“).
- **Filter** (Kategorien und Masken, 64 Bit) steuern, was womit kollidiert.
- In der Bedienung des Editors wird daraus ein schmales Vokabular: Fläche → Zone; „wenn berührt / wenn stärker als … / wenn
  gebrochen“ → Aktion. Die Engine-Begriffe bleiben unsichtbar.

### 5.6 Kollisionsformen aus Vektorformen

- Die sichtbare Form ist eine Bézier-Fläche; die Physik braucht einfache Formen. Vorschlag: Der Editor schlägt aus jeder Form
  eine Hülle vor (Kreis, Kapsel, gerundetes Polygon mit höchstens 8 Ecken, Verbund aus mehreren, Kette für Böden und Profile),
  zeigt sie als dünne Linie und lässt sie mit denselben Griffen bearbeiten wie die Form.
- Gerundete Formen (Kapsel, Polygon mit Rundung) passen zu Ozzys weichem Stil und gleiten besser über Kanten.
- Das Rad-Profil (Hügel, Mulden) als geschlossene Kette, damit Pfoten nicht an Nähten hängen bleiben.

---

## 6. Ozzy auf dem Rad mit den Bausteinen der Engine

| Spielidee | Baustein (Box2D 3.2) | Gegenstück in Rapier |
|---|---|---|
| Rad vorsichtig drehen | kinematischer Körper, Zielwinkel aus geglätteter Eingabe über `b2Body_SetTargetTransform` | kinematischer Körper mit `setNextKinematicRotation` |
| Hindernisse drehen mit | weitere Formen am Rad-Körper (Verbund) | Collider am selben Körper |
| Gekrümmter Boden, Hügel | Kreis als Grundform; Profil als Kette ohne Geisterkollisionen | Kreis; Polylinie |
| Ozzy steht und tapst | Rumpf als dynamischer Körper (Kapsel oder gerundetes Polygon), vier Pogo-Federn aus Strahlabfragen, Mover-Gelenk für Wunschtempo mit begrenzter Kraft | Rumpf plus eigene Federkräfte aus Strahlabfragen; PID-Regler für die Haltung |
| Bergab läuft er von selbst | Schwerkraft plus Reibung auf dem bewegten Rad; die Gangart (Schrittfrequenz) folgt dem Tempo | gleich |
| Zu schnell → stolpert | Spielregel: Schwellen für Neigung, Fußtempo, Kontaktverlust; dann Wechsel in die Ragdoll | gleich |
| Fällt lustig hin | Ragdoll: Glieder mit Scharnieren (Grenzen) und Filter-Gelenken; Glieder folgen der Pose über Motor-Gelenke zu kinematischen Hilfskörpern, Kraft heruntergeregelt | Mehrkörper- oder Impulsgelenke mit PD-Motoren |
| Steht wieder auf | Motorkraft hochfahren, dann zurück in den Federbein-Zustand | gleich |
| Springt über Dinge | Impuls auf den Rumpf; Pogo-Federn lassen los (Zuggrenze) | Impuls |
| Kleine Hindernisse überlaufen | Pogo-Feder glättet Unebenheiten; Rollwiderstand an den Pfoten | eigene Federung |
| Eigener Kopf (stehen bleiben, Tempo wechseln) | Spiellogik mit Zufall aus Saat, wirkt nur über das Wunschtempo des Mover-Gelenks | gleich |
| Besondere Stellen (Balancieren) | Sensor-Zonen ändern Reibung, Wunschtempo oder Federhärte | gleich |
| Kein Durchfallen bei schnellem Sturz | Rumpf und Kopf als Bullet (CCD auch gegen das kinematische Rad) | CCD je Körper einschalten |

Die Figur bleibt dabei Florians Zeichnung: Die Welt bewegt nur Rumpf, Kopf und im Sturz die Glieder als Ganzes; die Beine
setzen die gezeichneten Posen auf die Fußpunkte; Nachschwingen und Quetschen kommen aus der Figurphysik und ziehen immer in die
gezeichnete Form zurück.

---

## 7. Ehrliche Gegenüberstellung

### 7.1 Matrix (für unseren Fall gewichtet)

Zeichen: ++ sehr gut, + gut, o mittel, − schwach, −− ungeeignet.

| Kriterium (Gewicht) | Box2D 3.2 WASM | Rapier 2D 0.21 | Planck 1.5 | Phaser Box2D | Matter 0.20 | p2 / p2-es | eigene XPBD |
|---|---|---|---|---|---|---|---|
| Kontakte, Reibung, Stapel (hoch) | ++ | ++ | + | + (Stand 3.0) | − | o | − |
| Gelenke, Motoren, Ragdoll (hoch) | ++ (Motor-Gelenk mit Zielen) | ++ (Mehrkörper, PD) | + | + | −− | + | + |
| Gekrümmter Boden, kinematisches Rad (hoch) | ++ (Ketten, Zieltransformation, Rollwiderstand) | + | + | + | o | o | o |
| CCD (mittel) | ++ | + | + | + | −− | o | − (nur Unterschritte) |
| Determinismus plattformübergreifend (hoch) | ++ (dokumentiert, Hash) | ++ (eigenes Paket) | o (gleiche Engine ja, `Math` offen) | o (ungeprüft) | o | o | + (wenn eigene Trig.) |
| Snapshot / Zurückspulen (hoch) | ++ (gebunden) | ++ | − | −− | − | − | ++ |
| Figurphysik auf Punkten und Griffen (hoch) | −− (nicht ihr Feld) | o (Weichkörper, neu) | −− | −− | − | − | ++ |
| API hinter eigener Schnittstelle (mittel) | o (C-Stil, `.delete()`) | ++ (typisiert, offiziell) | ++ | + | ++ | + | ++ |
| Pflege (hoch) | + (Kern ++, Bindung zwei Personen) | + (aus einer Hand, aber 0.x-Brüche) | + | −− | − | −− | o (wir selbst) |
| Größe Web (niedrig) | + (185 KB) | o (ca. 0,7 MB) | ++ | ++ | ++ | ++ | ++ |
| Läuft ohne WebAssembly (niedrig) | − | − | ++ | ++ | ++ | ++ | ++ |
| Lizenz | MIT | Apache-2.0 | MIT | MIT | MIT | MIT | eigen |

### 7.2 Die wichtigsten Abwägungen

**Box2D-WASM oder Rapier für die Welt?** Knapp. Für Box2D sprechen die Bausteine, die genau unser Spiel beschreiben (Rad als
kinematischer Körper mit Zielstellung, Ketten ohne Hängenbleiben, Rollwiderstand, Mover mit Pogo-Feder, Motor-Gelenk mit
Zielen), der dokumentierte Determinismus samt Zustands-Hash, die viermal kleinere Datei und die Rolle als Industriestandard
(Unity, Defold). Für Rapier sprechen die offizielle, typisierte API aus derselben Hand wie die Engine, Mehrkörpergelenke und
PD-Motoren (Posen folgen ohne Hilfskörper) und die Weichkörper. Gegen Box2D spricht die Web-Bindung durch zwei Personen und die
Speicherverwaltung mit `.delete()`; gegen Rapier die Größe, die API-Brüche und das langsamere deterministische Paket.
**Urteil:** Box2D zuerst, hinter einer Schnittstelle, die keine Engine-Typen nach außen gibt; Rapier ist der vorbereitete
Plan B. Der Godot-Vergleich (Rapier stabiler im Gelenkgitter) ist ein Warnsignal, aber kein Beweis: selbst berichtet, alte
Box2D-Fassung, Fehler der Erweiterung verlinkt. Darum gehört ein Ragdoll in Ozzys Proportionen in die erste Probe.

**Fertige Engine oder eigene XPBD?** Beides, getrennt nach Aufgabe. Kontakte, Reibung, CCD und Ragdoll-Stöße sind in Box2D
über Jahre gelöst; eine eigene Lösung erreicht das nicht in vertretbarer Zeit (Catto und Avian haben XPBD für Kontakte
aufgegeben). Federn, Formabgleich und Flächenerhalt auf Punkten und Griffen sind dagegen genau XPBDs Stärke und hängen eng an
unserem Formenmodell; das in eine Engine zu legen (Rapier-Weichkörper) hieße, Florians Punkte in fremde Partikel zu
übersetzen und zurück.

**WebAssembly oder reines JavaScript?** WebAssembly. Der Lösergewinn von Box2D 3.x gegenüber 2.x (Planck) ist sichtbar, der
Determinismus ist im WebAssembly leichter zu halten als mit JavaScript-`Math`, und die Größe ist klein. Planck bleibt als
Rückfall möglich, falls WebAssembly in einer Umgebung nicht läuft.

**Zurückspulen: Snapshot je Takt, Schlüssel-Snapshots oder nur Lagen aufzeichnen?** Schlüssel-Snapshots alle 16 Takte plus
Eingabeprotokoll plus Nachrechnen; zusätzlich die Lagen aller Takte für die reine Wiedergabe puffern (billig, nur zum Zeigen).
Nur Lagen aufzuzeichnen reicht nicht, weil man dann nicht von einer gespulten Stelle aus weiterspielen kann.

**Physik zur Laufzeit oder gebacken?** Zur Laufzeit im Spiel, weil Ozzy auf das Rad reagieren muss. Backen ist ein Werkzeug des
Editors („Aufnehmen“) für Übergänge, die Florian danach selbst formt.

**Takt 60 oder 120 Hz?** 60 Hz mit 4 Unterschritten, interpoliert. 120 Hz mit 2 Unterschritten kostet gleich viel und ist die
Ausweichlösung, falls die Steuerung am Mac träge wirkt.

**Ozzys Gang: immer Ragdoll mit Motoren oder Rumpf auf Federbeinen?** Rumpf auf vier Federbeinen als Normalfall: stabil,
steuerbar, die Beine bleiben exakt gezeichnet. Ragdoll nur beim Stolpern und Fallen, Rückkehr über Motorziele zur Pose. Eine
dauernd aktive Ragdoll müsste das Gleichgewicht ständig aktiv halten (Regelungsaufwand, Zittern) und verformt den Look.

---

## 8. Empfehlung

1. **Weltphysik:** Box2D 3.2 über `box2d3-wasm` 6.0, Import `box2d3-wasm/compat` (Einzel-Thread, keine COOP/COEP nötig),
   Einheiten in Metern mit festem Maßstab zur Zeichnung (Ozzys Rumpf etwa 0,5 bis 1 m lang).
2. **Eigene Schnittstelle `welt` in TypeScript** mit unseren Begriffen (Körper, Hülle, Gelenk, Feder, Motor, Zone, Ereignis,
   Snapshot, Hash). Keine Engine-Typen im Editor- oder Spielcode; alle `.delete()`-Pflichten bleiben im Adapter. Damit wird ein
   Wechsel zu Rapier eine Sache von Tagen.
3. **Figurphysik als eigene XPBD-Schicht in 2D** (Ausbau von `packages/physics`): Federketten auf Knochen, Federn auf einzelnen
   Punkten und Griffen mit eigener Stärke, Formabgleich zur aktuellen Pose, Flächenerhalt für die Bohne; Parameter als Frequenz
   und Dämpfung, wie überall.
4. **Fester Takt 60 Hz**, 4 Unterschritte in der Welt, 4 Teilschritte in der Figur, interpolierte Darstellung, Zeitkappung
   0,25 s, höchstens 5 Takte je Bild.
5. **Deterministischer Rechenweg:** eigene sin/cos/atan2/exp-Näherungen und ein Zufallsgenerator mit Saat für alles, was in die
   Simulation fließt; feste Reihenfolge beim Anlegen; Hash je Takt in Tests.
6. **Editor:** Spielen, Pause, Einzelschritt, Ausgangslage merken; Zurückspulen über Eingabeprotokoll und Schlüssel-Snapshots
   (alle 16 Takte, Speicherbudget); Aufnehmen in Schlüssel als normaler, nachformbarer Übergang.
7. **Rad:** kinematischer Körper mit Zielwinkel aus geglätteter Eingabe; Hindernisse als Formen am Rad; Profil als Kette.
8. **Ozzy:** Rumpf und Kopf als Körper (Bullet), vier Pogo-Federn aus Strahlabfragen, Mover-Gelenk für das Wunschtempo; Ragdoll
   nur im Sturz, Glieder folgen der Pose über Motor-Gelenke.
9. **Nicht verwenden:** Matter.js, p2/p2-es, Phaser Box2D. Planck nur als Rückfall hinter derselben Schnittstelle.

---

## 9. Erste Probe (Vorschlag, wartet auf Freigabe)

Nach Arbeitsregel 1 und 2: eine einzige, vorher festgelegte, sichtbare Probe, bevor gebaut wird.

- **Aufbau:** eine Seite mit dem angeschnittenen Rad (kinematisch, ein paar Hügel als Kette, drei Hindernisse), Ozzy als
  graue Ersatzform (Kapsel-Rumpf, Kopf, vier Pogo-Federn, Mover-Gelenk), dazu eine Ragdoll in Ozzys Proportionen für den Sturz.
  Steuerung: Rad mit Finger oder Maus drehen. Box2D über `box2d3-wasm/compat`.
- **Kriterien:** (1) Ozzy steht auf dem ruhenden Rad ruhig, ohne Zittern; (2) Rad drehen → er läuft bergab mit, ohne an Hügeln
  hängenzubleiben; (3) zu schnell → er kippt, die Ragdoll fällt ohne Durchdringen und ohne Zittern in Ruhe; (4) 10 s Vorschau,
  zurückspulen, erneut abspielen → gleicher Hash; Hash auf Mac und iPhone 16 gleich; (5) Rechenzeit unter 1 ms je Takt auf dem
  iPhone 16.
- **Abbruch:** Scheitert (3) an zitternden Gelenken oder bricht die Bindung (fehlende Funktionen, Speicherfehler in Safari),
  dieselbe Probe mit Rapier (`-deterministic`) wiederholen und dann entscheiden.

---

## 10. Offene Fragen

1. Läuft WebAssembly in der Capacitor-WebView unter dem Lockdown-Modus? (Am Gerät prüfen; Rückfall wäre Planck.)
2. Ist Box2D-WASM zwischen Mac (Safari, Chrome) und iPhone 16 wirklich bitgleich? (Hash-Vergleich in der Probe.)
3. Tragen Box2D-Gelenke Ozzys Proportionen (schwerer Rumpf, leichte, dünne Beine) im Sturz ohne Zittern, oder braucht es
   Rapiers Mehrkörpergelenke?
4. Wie schnell zieht `box2d3-wasm` künftige Box2D-Fassungen nach, und wann werden Aufnahme und Wiedergabe gebunden? Lohnt eine
   eigene, schlanke Bindung aus der JSON-Beschreibung der API von Box2D 3.2 als Absicherung?
5. Wie viel echte Physik will Florian sehen, und wie viel soll gezeichnet bleiben? (Vorschlag: ein Mischregler je Teil
   zwischen „exakt Pose“ und „frei“; sein Auge entscheidet.)
6. Reicht 60 Hz mit Interpolation am Mac für das Gefühl beim Drehen, oder braucht es 120 Hz?
7. Werden später Weichkörper in der Welt gebraucht (Gelee-Hindernisse, Seile)? Dann Rapier-Weichkörper gegen eine Erweiterung
   der eigenen XPBD-Schicht abwägen.
8. Lässt sich `box2d3-wasm` ohne Umwege mit Vite bündeln (Ort der `.wasm`-Datei, ESM)? In der Probe klären.

---

## Quellen

**Box2D**
- Blogliste: https://box2d.org/posts/
- Box2D 3.2 (18.10.2026): https://box2d.org/posts/2026/10/box2d-3.2/
- Release Notes 3.2: https://box2d.org/documentation/md_release__notes__v320.html
- Replay (07.06.2026): https://box2d.org/posts/2026/06/replay/
- Contact Recycling (12.10.2026): https://box2d.org/posts/2026/10/contact-recycling/
- Box2D 3.1 (19.04.2025): https://box2d.org/posts/2025/04/box2d-3.1
- Release Notes 3.1: https://box2d.org/documentation/md_release__notes__v310.html
- Determinism (27.08.2024): https://box2d.org/posts/2024/08/determinism/
- SIMD Matters (19.08.2024): https://box2d.org/posts/2024/08/simd-matters/
- Solver2D (05.02.2024): https://box2d.org/posts/2024/02/solver2d/
- Ghost Collisions (21.06.2020): https://box2d.org/posts/2020/06/ghost-collisions/
- Simulation (Handbuch): https://box2d.org/documentation/md_simulation.html
- Charakter-Mover (Handbuch): https://box2d.org/documentation/md_character.html
- FAQ: https://box2d.org/documentation/md_faq.html
- box2d3-wasm: https://github.com/Birch-san/box2d3-wasm und https://github.com/Birch-san/box2d3-wasm/blob/main/box2d3-wasm/README.md
- Phaser Box2D: https://phaser.io/news/2024/12/announcing-phaser-box2d, https://phaser.io/box2d, https://github.com/phaserjs/phaser-box2d
- Unity 6.3 LTS mit Box2D v3: https://alternativeto.net/news/2025/12/unity-6-3-lts-arrives-with-hybrid-2d-3d-scenes-box2d-v3-and-cross-platform-toolkit
- Defold-Rückblick 2025: https://defold.com/2026/01/02/Defold-2025-Retrospective/

**Rapier**
- Weichkörper (25.09.2026): https://dimforge.com/blog/2026/09/25/advanced-soft-bodies-for-games-in-the-rapier-physics-engine
- Bericht Q3 2026: https://dimforge.com/blog/2026/10/25/dimforge-Q3-technical-report
- Rückblick 2025: https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge
- Ankündigung 2020: https://dimforge.com/blog/2020/08/25/announcing-the-rapier-physics-engine/
- rapier.js (archiviert): https://github.com/dimforge/rapier.js, Changelog: https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md
- Haupt-Repository: https://github.com/dimforge/rapier
- Handbuch JS: https://rapier.rs/docs/user_guides/javascript/getting_started_js, https://rapier.rs/docs/user_guides/javascript/determinism,
  https://rapier.rs/docs/user_guides/javascript/serialization, https://rapier.rs/docs/user_guides/javascript/joints,
  https://rapier.rs/docs/user_guides/javascript/rigid_body_ccd, https://rapier.rs/docs/user_guides/javascript/integration_parameters
- Vergleich im Godot-Forum (08/2026): https://forum.godotengine.org/t/physics-engine-comparison-rapier-vs-godot-vs-box2d-3d-vs-jolt/142786

**JavaScript-Engines**
- Planck.js: https://github.com/piqnt/planck.js, https://github.com/piqnt/planck.js/blob/master/CHANGELOG.md
- Matter.js: https://github.com/liabru/matter-js/issues/5, https://github.com/liabru/matter-js/blob/master/CHANGELOG.md
- p2-es: https://github.com/pmndrs/p2-es
- Benchmark der Box2D-Fassungen in JS: https://github.com/Lusito/box2d.ts/blob/master/packages/benchmark/README.md
- Browser-Vergleichsseite: https://napejs.org/benchmark.html
- Versionen und Größen: npm-Registry (`npm view`) und jsDelivr (https://data.jsdelivr.com/v1/packages/npm/…, CDN-Header), gelesen am 20.11.2026

**Verfahren**
- Avian 0.1 (Wechsel von XPBD zu TGS Soft): https://joonaa.dev/blog/06/avian-0-1
- XPBD, Small Steps, Starrkörper mit XPBD, Formabgleich: https://matthias-research.github.io/pages/publications/publications.html
- Ten Minute Physics: https://matthias-research.github.io/pages/tenMinutePhysics/index.html
- AVBD: https://graphics.cs.utah.edu/research/projects/avbd/
- Fix Your Timestep: https://gafferongames.com/post/fix_your_timestep/
- Spine-Physik: http://esotericsoftware.com/spine-physics-constraints
- Blender, Simulationen backen: https://docs.blender.org/manual/en/latest/physics/baking.html

**Web-Plattform**
- Nichtdeterminismus in WebAssembly: https://github.com/WebAssembly/design/blob/main/Nondeterminism.md
- `Math`-Genauigkeit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math
- WebAssembly gegen nativ (USENIX ATC 2019): https://www.usenix.org/conference/atc19/presentation/jangda
- Safari 16.4 (WASM-SIMD): https://webkit.org/blog/13966/webkit-features-in-safari-16-4/
- Lockdown-Modus: https://support.apple.com/en-us/105120

**Im Repo**
- `docs/research/tech-stack.md` (WKWebView 60 Bilder je Sekunde, Rapier-Weichkörper)
- `docs/research/2026-11-18-ozzy-figur-recherche.md` (Physik, die witzig wirkt; Formabgleich zur Pose)
- `packages/physics/src/` (SpringJiggle, ShapeMatching, 3D)
- `apps/editor/src/ozzy-figur/steuerung.ts`, `ablauf.ts` (Federn, Teilschritte 1/240 s, variabler Zeitschritt)
