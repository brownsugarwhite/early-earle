# 14 · Nachtrag: Physik aus einem Guss für Studio und die Rad-Demo

Stand: 20.11.2026. Nachrecherche zur Editor-Recherche (`docs/research/2026-11-20-editor/`). Sie klärt den Widerspruch zwischen
Bericht 08 (eigener XPBD-Kern für Figur und Welt) und Bericht 09 (Box2D 3.2 für die Welt, XPBD nur für die Figur) an den Fällen
der Rad-Demo aus Bericht 13 und endet mit einer Entscheidungsvorlage und einer einzigen, erweiterten Probe.

**Zur Arbeitsweise.** Die Aussagen zu Box2D stützen sich nicht nur auf Handbuch, Release Notes und Blog, sondern auf den
Quelltext selbst (Zweig `main` im November 2026, also 3.2 mit Nachträgen; gelesen: `shape.c`, `contact.c`, `contact_solver.c`,
`motor_joint.c`, `mover_joint.c`, `pogo_joint.c`, `snapshot.c`, `physics_world.c`, `types.c`, `constants.h`, `box2d.h`,
`types.h`) und auf die TypeScript-Typen von `box2d3-wasm` 6.0.0. Bei Rapier ist nachgelesen, wie es eine geänderte Form
behandelt. XPBD ist am Originalpaper (Müller u. a. 2020) geprüft, nicht an Zusammenfassungen. Gebaut und gemessen ist nichts.
Zahlen ohne Quelle sind als eigene Abschätzung markiert; sie gehören in die Probe (Abschnitt 7). Begriffe wie in Bericht 08:
*Bremskraft*, *Haftung*, *Spannung*, *Federbeine*, *Prüfstand*.

---

## Kurzfassung

1. **Urteil: Die Welt rechnet Box2D, die Figur rechnet XPBD, beide im selben 60-Hz-Takt.** Box2D 3.2 (WebAssembly über
   `box2d3-wasm`) übernimmt Rad, Rumpf, Becken, Kopf, Sturz und lose Dinge. Eine eigene XPBD-Schicht in TypeScript übernimmt
   Nachschwingen, Bohne, Spritzer und Pfützenfläche. Die Aufteilung aus Bericht 09 hält. Fünf seiner Einzelheiten tragen die
   Demo aus Bericht 13 aber nicht und werden hier ersetzt (Punkte 3 bis 8).
2. **Warum nicht XPBD für die Welt (Bericht 08):** XPBD ist stabil in dem Sinn, dass eine zu steife Feder nicht explodiert.
   Ruhig ist es damit noch nicht. Das Paper selbst nennt sichtbares Zittern (Unterschritte dämpfen kaum) und Probleme bei hohen
   Stapeln. Der Autor von Box2D bekam die Reibung mit XPBD nicht gut hin. Avian hat seine Kontakte wegen explosiver
   Überlappungsauflösung, fehlender Ruhe und schwächerer Reibung auf Soft Step umgestellt. Genau diese Bilder sieht Florian:
   am Hang stehen ohne Kriechen, ruhig liegen, weich hinsetzen, ein Sturz ohne Explosion. Für Gelenke und Federn bleibt XPBD
   stark; Avian rechnet seine Gelenke bis heute damit (Fassung 0.8 vom Oktober 2026).
3. **(a) Das Rad wird dynamisch, nicht kinematisch wie in 09.** Es hängt an einem Scharnier. Lagerreibung ist ein Motor mit
   Tempo 0 und Höchstmoment (so empfiehlt es das Handbuch), die Trägheit kommt direkt aus dem Regler „Radgewicht“. Der Finger
   ist ein kinematischer Körper mit einem Motor-Gelenk (Linearfeder 4 Hz, Dämpfung 1, Höchstkraft). Das ist der dokumentierte
   Ersatz für das entfallene Maus-Gelenk und liefert Halten, Ziehen und Loslassen aus einer einzigen Physik. Ganz schwer
   gestellt wird das Rad kinematisch; 09 ist damit ein Grenzfall.
4. **(a, b) Ozzys Vortrieb braucht ein Kräftepaar statt des Mover-Gelenks.** Im Quelltext wirkt das Mover-Gelenk nur auf die
   Lineartempi beider Körper, ohne Hebelarm und ohne Drehmoment. Das Handbuch verbindet es mit statischem Boden und sagt nichts
   zu bewegten Plattformen. Auf dem drehenden Rad gäbe es damit keine Rückwirkung. Die Pogo-Federn dagegen rechnen mit
   Hebelarmen und mit der Geschwindigkeit an der Oberfläche; sie hängen am Rad. Den Vortrieb legt die Figur jeden Takt als
   Kräftepaar an (auf Ozzy und gegengleich am Fußpunkt aufs Rad), begrenzt auf das Kleinere aus Bremskraft und Haftung mal
   Normalkraft. Eis bleibt so ohne Sonderregel.
5. **(b) Die Pfoten sind in beiden Berichten keine echten Kontakte**, sondern Federbeine mit einem Antriebsgesetz. Echte
   Kontakte entstehen beim Sitzen, Popo-Rutschen, Liegen, Stürzen und bei losen Dingen. Dort entscheidet der Löser, und dort
   ist Box2D belegt besser: weiche Kontakte mit 30 Hz, gedeckeltes Auseinanderschieben, Entspannungsdurchgang, Warmstart,
   Rollwiderstand, kontinuierliche Kollision.
6. **(c) Eine Quelle, drei Ableitungen.** Der gezeichnete Weltpfad wird einmal abgeflacht. Daraus entstehen die Kette für
   Box2D, das Abstandsfeld in TypeScript (Fühler, Fußnormalen, Spritzer) und die Strecken des Renderers. Verschmelz-Rundungen
   werden beim Bearbeiten in die Kette gebacken. Abschätzung: Zeichnung und Anschlag liegen dann höchstens etwa 0,4 Bildpunkte
   auseinander (iPhone 16, Querformat). Vorbehalt: Ketten haben laut Box2D keine Masse und sollen auf statischen Körpern liegen.
   Auf dem drehenden Rad prüft das die Probe; Rückfall ist „Welt steht, Schwerkraft und Kamera drehen“ mit Scheinkräften.
7. **(d) Morphende Hüllen nicht je Takt umformen.** Jeder Aufruf von `b2Shape_SetPolygon` (ebenso Kreis, Kapsel, Segment)
   zerstört im Quelltext alle Kontakte dieser Form, meldet ein Kontaktende und legt den Eintrag der Breitphase neu an. Die Folgen
   sind: kein Warmstart, kein Recycling, flackernde Ereignisse. Haltungen (Sitzen, Liegen, Rutschen) entstehen deshalb über
   Gelenkziele zwischen wenigen festen Teilen (Brust, Becken, Kopf); Formen wechseln nur an Zustandsgrenzen. Rapier behält das
   Kontaktpaar bei einer Formänderung und ist dafür der Rückfall.
8. **(e) Kopplung in einer Richtung plus Ziele, schwerster Löser zuerst.** Die Welt rechnet, dann die Figur auf deren Ergebnis.
   Zurück gehen nur Ziele, Kräfte und Hüllenwechsel, wirksam im nächsten Takt. Zurückgespult wird über einen gemeinsamen
   Schlüsselstand alle 16 Takte (Box2D-Snapshot, Zustand der Figur, Logik, Zufall). Die Prüfsumme je Takt besteht aus drei
   Teilsummen. Box2Ds Snapshot ist vollständig (auch die Kontakte samt Impulsen), aber ausdrücklich experimentell. Kennungen
   bleiben gültig, Nutzerdaten werden gelöscht. Deshalb werden Ragdoll-Körper vorab angelegt und nur ein- und ausgeschaltet.
9. **(f) Ein Takt: 60 Hz.** Darin laufen Box2D mit 4 und die Figur mit 4 Teilschritten (beide 240 Hz); die Darstellung mischt
   zwischen zwei Takten. Ein XPBD-Weltlöser bräuchte nach dem Paper eher 20 Teilschritte je 60-Hz-Takt. Zeitlupe ändert nur,
   wie schnell die Takte aufeinander folgen, nie ihre Länge. Im Stromsparmodus liefert Safari 30 Bilder je Sekunde; dann laufen
   zwei Takte je Bild.
10. **(g) Flüssiges ohne Flüssigkeitslöser.** Die Pfütze ist eine Zone plus Höhenfeld-Wasser in einer Mulde des Pfads, Spritzer
    sind Teilchen in TypeScript gegen das Abstandsfeld, im Renderer verschmolzen. Ball, Stamm, Wippe und Trampolin rechnet
    Box2D; der Schneeball wächst in Stufen; Laub fliegt mit Wind und Luftwiderstand (neu in Box2D 3.2). LiquidFun ist
    archiviert, Box2D nennt Flüssigkeiten nur als mögliche spätere Arbeit.
11. **Eine Probe entscheidet:** P1 „Rad mit Gewicht“ (Abschnitt 7). Sie hat neun vorher festgelegte Kriterien, vergleicht zwei
    Hüllen-Varianten nebeneinander, weist die Rückwirkung über eine Drehimpulsbilanz nach und prüft das Zurückspulen über die
    Prüfsumme auf Mac und iPhone. Aufwand geschätzt 4 bis 6 Arbeitstage; Abbruch- und Umstiegsregeln stehen vorab fest.

---

## 1. Worin sich die Berichte widersprechen

| Punkt | 08 Figurenphysik | 09 Engines | 10 Rendern | 11 Technik | 13 Spieldesign |
|---|---|---|---|---|---|
| Wer rechnet Rad, Rumpf, Kontakte, Sturz | eigener XPBD-Kern; Box2D oder Rapier „später andockbar“ | Box2D 3.2 als WASM | – | folgt 09 (`packages/studio-welt`) | setzt 08 voraus |
| Rad | starrer Körper, Feder zum Finger mit Kraftgrenze; Rückwirkung offen | **kinematisch**, Zielwinkel über `b2Body_SetTargetTransform` | – | – | **dynamisch**: Trägheit, Lagerreibung, Rückwirkung, drei Gesten, Regler „Radgewicht“ |
| Kollision der Welt | Abstandsfeld der gezeichneten Formen | Kette und Polygone mit höchstens 8 Ecken | „Abstand ist die Sprache“, auch für die Physik | – | Abstandsfeld des Weltpfads |
| Ozzys Gang | Federbeine, „Wagen mit begrenzter Kraft“ | Pogo-Federn plus Mover-Gelenk | – | – | „Die Lage ist das Gaspedal“ |
| Takt | Teilschritte 1/240 s | 60 Hz mit 4 Unterschritten | – | 60 Hz | fester Takt, Zeitlupe |
| Zurückspulen | ab Clipanfang nachrechnen (wie Spine) | Schlüssel-Snapshots alle 16 Takte plus Eingabeprotokoll | – | Hash über 600 Takte als Test | Rückblick aller Stürze |

**Was wirklich strittig ist:**

1. **Wer die echten Kontakte rechnet** (Sitzen, Rutschen, Liegen, Sturz, lose Dinge): eigener Kern oder Box2D.
2. **Ob das Rad zurückwirkt.** 09s Bewertungsmatrix führt „kinematisches Rad“ als Kriterium und prüft damit eine Annahme, die
   13 verwirft. Halten, Schwung und Radgewicht aus 13 brauchen ein dynamisches Rad.
3. **Abstandsfeld oder Hüllen.** Das ist weniger strittig, als es aussieht (Abschnitt 3c): Für die Welt sind beides zwei
   Auswertungen derselben abgeflachten Linie.
4. **Der Takt** ist nur ein Begriffsunterschied. 08s „240 Hz“ und 09s „60 Hz mit 4 Unterschritten“ sind dieselbe
   Teilschrittlänge von 1/240 s.

**Unstrittig in allen Berichten:** Figurphysik (Nachschwingen, Bohne) in einer eigenen XPBD-Schicht; Frequenz und Dämpfung
als einheitliche Regler; fester Takt mit gemischter Darstellung; „Aufnehmen“ backt Physik in Schlüssel, die Florian nachformt.

---

## 2. Was die besten Engines und Verfahren tun

### 2.1 Box2D 3.2, am Quelltext geprüft

**Kontakte.** Box2D berechnet die Kontaktpunkte (Normale, Anker) einmal je Schritt; in den Unterschritten führt es nur den
Abstand aus der Bewegung der Körper nach (`contact_solver.c`). Überlappung wird weich aufgelöst: Steifigkeit 30 Hz (höchstens
ein Achtel der Unterschritt-Rate), Dämpfungsgrad 10, Schiebetempo höchstens 3 m/s (`types.c`, `physics_world.c`); gegen statische
Körper ist die Feder doppelt so steif. Ein Entspannungsdurchgang nimmt die Korrekturgeschwindigkeit wieder heraus. Reibung ist
Coulomb-Reibung auf Geschwindigkeitsebene mit Warmstart (die Impulse des letzten Schritts sind der Startwert); Rollwiderstand
begrenzt das Rollmoment. Spekulative Punkte bis 2 cm Abstand fangen schnelle Annäherung ab. Seit 3.2 werden Kontakte
„recycelt“: Bewegen sich zwei Körper relativ zueinander weniger als 5 cm und drehen sich weniger als etwa 11,5°, bleibt die
alte Kontaktgeometrie stehen und nur der Abstand wird nachgeführt. Das lässt sich je Welt (`b2World_SetContactRecycleDistance`)
oder je Körper abschalten ([Release Notes 3.2](https://box2d.org/documentation/md_release__notes__v320.html),
[Contact Recycling](https://box2d.org/posts/2026/10/contact-recycling/), `constants.h`).

*Eigene Abschätzung:* Eine weiche Bedingung mit 30 Hz gibt unter Schwerkraft etwa g/(2π·30 Hz)² ≈ 0,3 mm nach. Bei Ozzys
Maßstab auf dem iPhone 16 (Querformat 2556 Bildpunkte für etwa 13 Körperlängen zu 0,5 m, also rund 390 Bildpunkte je Meter)
sind das etwa 0,1 Bildpunkte.

**Formen ändern.** `b2Shape_SetCircle`, `b2Shape_SetCapsule`, `b2Shape_SetSegment` und `b2Shape_SetPolygon` rufen intern
`b2ResetProxy` auf. Diese Funktion zerstört alle Kontakte, an denen die Form beteiligt ist, legt dabei ein
Kontaktende-Ereignis an (wenn sich die Formen berührten) und erzeugt den Eintrag in der Breitphase neu
([shape.c](https://github.com/erincatto/box2d/blob/main/src/shape.c), [contact.c](https://github.com/erincatto/box2d/blob/main/src/contact.c)).
Im nächsten Schritt entsteht der Kontakt wieder, mit Impuls null. Masse und Trägheit passt Box2D dabei nicht an; das macht
erst `b2Body_UpdateMassFromShapes`. Jede Änderung wird aufgezeichnet, eine Wiedergabe bleibt also deterministisch. Ein
geänderter **Reibungswert** reißt dagegen keine Kontakte ab: Box2D mischt die Reibung bei jeder Kontaktaktualisierung neu.

**Gelenke für das Rad.**
- *Scharnier:* Motor mit Zieltempo und Höchstmoment. Das Handbuch empfiehlt Tempo 0 und ein kleines Höchstmoment als
  Gelenkreibung. Die Feder des Scharniers hat einen Zielwinkel, aber **keine Kraftgrenze** (`types.h`).
- *Motor-Gelenk:* Linear- und Winkelfeder (Hz, Dämpfungsgrad) mit Höchstkraft und Höchstmoment, die der Löser in jedem
  Unterschritt klemmt; dazu Tempoziele mit eigener Höchstkraft ([motor_joint.c](https://github.com/erincatto/box2d/blob/main/src/motor_joint.c)).
- *Maus-Gelenk:* entfällt in 3.2. Das Handbuch beschreibt den Ersatz: ein kinematischer Körper am Zeiger, ein Motor-Gelenk mit
  Linearfeder und Höchstkraft zum gegriffenen Körper, der kinematische Körper geführt mit `b2Body_SetTargetTransform`. Das
  Handbuch nennt das ausdrücklich den bevorzugten Weg, Körper zu Zielen zu führen
  ([Simulation](https://box2d.org/documentation/md_simulation.html)).
- Gelenke zwischen zwei nicht dynamischen Körpern rechnet 3.2 nicht mehr.

**Die Bausteine für Figuren.**
- *Mover-Gelenk:* vergleicht nur die Lineartempi der beiden Körper mit einem Zieltempo und klemmt x und y getrennt. Es hat keine
  Hebelarme und gibt kein Drehmoment weiter ([mover_joint.c](https://github.com/erincatto/box2d/blob/main/src/mover_joint.c)).
  Laut Handbuch verbindet es einen statischen Boden mit der Figur; bewegte Plattformen behandelt das Handbuch nicht
  ([Charakter](https://box2d.org/documentation/md_character.html)).
- *Pogo-Gelenk:* rechnet mit Hebelarmen an beiden Körpern und mit der Relativgeschwindigkeit an den Ankerpunkten, drückt entlang
  der Bodennormalen und hat getrennte Grenzen für Druck und Zug ([pogo_joint.c](https://github.com/erincatto/box2d/blob/main/src/pogo_joint.c)).
  Es entsteht jeden Schritt neu aus den Strahlabfragen des Spiels; Gelenke liegen in einem Vorrat, das kostet wenig.
- Beides ist als experimentell markiert.

**Ketten.** Einseitig und ohne Geisterkollisionen. Die Typbeschreibung sagt: „chains have no mass and should be used on static
bodies“ ([types.h](https://github.com/erincatto/box2d/blob/main/include/box2d/types.h)). Die Punkte müssen weiter als 0,5 cm
auseinander liegen, die Kette darf sich nicht schneiden. Kontinuierliche Kollision läuft standardmäßig nur gegen statische
Körper; als „Bullet“ markierte Körper prüfen gegen alle Arten.

**Snapshot, Prüfsumme, Aufnahme.** `b2World_GetSnapshot` schreibt den Simulationszustand in einen Puffer (nur zwischen zwei
Schritten), `b2World_RestoreFromSnapshot` setzt ihn zurück, `b2CreateWorldFromSnapshot` baut daraus eine neue Welt. Der Snapshot
enthält die internen Felder samt Kontakten mit ihren Impulsen, Inseln, Breitphase und Kennungsvorräten
([snapshot.c](https://github.com/erincatto/box2d/blob/main/src/snapshot.c)). Kennungen bleiben gültig, Nutzerdaten werden
gelöscht, Rückrufe bleiben. Kennungen von Dingen, die nach dem Snapshot entstanden sind, können verwaisen. Schnittstelle und
Format sind ausdrücklich experimentell und ändern sich mit künftigen Fassungen ([box2d.h](https://github.com/erincatto/box2d/blob/main/include/box2d/box2d.h),
[Replay](https://box2d.org/posts/2026/06/replay/)). `b2World_GetStateHash` liefert eine 64-Bit-Prüfsumme, gedacht zum Erkennen
von Abweichungen beim Nachrechnen. Die FAQ sagt noch „Box2D does not have rollback determinism“
([FAQ](https://box2d.org/documentation/md_faq.html)); der Determinismus-Beitrag von 2024 erklärt den Grund: viel interner
Zustand und Reihenfolgen in Objektvorräten ([Determinism](https://box2d.org/posts/2024/08/determinism/)). Der vollständige
Snapshot von 3.2 löst genau dieses Problem, mit dem Vorbehalt „experimentell“. Der Beitrag zu 3.2 nennt effizienteres
Zurückrollen als künftige Arbeit ([3.2](https://box2d.org/posts/2026/10/box2d-3.2/)).

**Im Web.** `box2d3-wasm` 6.0.0 (26.10.2026, npm) folgt Box2D 3.2 über einen Zweig mit zwei Korrekturen
([README](https://github.com/Birch-san/box2d3-wasm/blob/main/box2d3-wasm/README.md)). Die mitgelieferten TypeScript-Typen binden
alles, was hier gebraucht wird: die Form-Setter, das Motor-Gelenk mit Federn, Scharnier-Motor, Pogo- und Mover-Gelenk,
`b2Body_SetTargetTransform`, `b2Body_SetMassData`, `b2Body_ApplyForce`, `b2Body_GetWorldPointVelocity`, Strahlabfragen,
`b2Body_Enable`/`b2Body_Disable`, Bullets, den Recycling-Abstand, Bewegungs- und Kontaktereignisse, `b2World_GetSnapshot`,
`b2World_RestoreFromSnapshot` und `b2World_GetStateHash` (als `bigint`). Die Bindung erzeugt Hüllobjekte nach Art von Embind; Rückgabewerte wie Lagen und
Ereignisse müssen mit `.delete()` freigegeben werden. JavaScript-Rückrufe gehen nur in einfädigen Welten; Aufnahme und
Wiedergabe sind noch nicht gebunden. Eine veröffentlichte Zahl zu den Kosten eines einzelnen Aufrufs über die Grenze habe ich
nicht gefunden; die Probe zählt die Aufrufe je Takt und misst.

### 2.2 XPBD für starre Körper

**Mechanik nach Müller u. a. (2020)** ([Paper](https://matthias-research.github.io/pages/publications/PBDBodies.pdf)):
- Kandidaten für Kontakte werden einmal je Zeitschritt über vergrößerte Hüllquader gesammelt; gelöst wird in jedem Unterschritt
  mit einer Iteration.
- Jeder Kontakt rechnet seine Normale vor jeder einzelnen Lösung neu. Das Paper nennt das als Grund, warum runde Reibungskegel
  und Kontakte an gekrümmter Geometrie leicht fallen (Murmeln auf gebogenen Drähten).
- Durchdringung wird als Lagebedingung mit Nachgiebigkeit null korrigiert. **Haftreibung ist ebenfalls eine Lagebedingung:**
  Die tangentiale Verschiebung der Kontaktpunkte wird zurückgenommen, solange die Tangentialkraft unter μ_s mal Normalkraft
  bleibt. Am Hang kriecht also nichts.
- Gleitreibung und Rückprall kommen in einem Geschwindigkeitsdurchgang nach jedem Unterschritt. Die Gleitreibung wird explizit
  angewandt, durch eine Begrenzung aber stabil gehalten. Ein Sonderfall verhindert, dass Körper, die überlappend entstehen,
  mit großer Geschwindigkeit auseinanderfliegen.
- Die Beispielszenen laufen mit 1/60 s und meist **20 Unterschritten** (10 bis 40).

**Stärken laut Paper:** große Massenverhältnisse (Servoarm zu Rädern 1:760 im Modellauto), unendlich steife Gelenke
(Nachgiebigkeit 0), Kopplung weicher und starrer Teile (Reifen auf Felgen), gute Energieerhaltung mit vielen Unterschritten. Die
Autoren nennen das Verfahren wegen der Nachgiebigkeit unbedingt stabil.

**Grenzen laut Paper selbst:** Unterschritte dämpfen hohe Frequenzen kaum, „This can yield visual jittering.“ (Gegenmittel:
echte Dämpfung). Kleine Schritte brauchen doppelte Genauigkeit (in JavaScript ohnehin gegeben). Das ständige Nachführen der
Bedingungsrichtungen kann hohe Stapel und Haufen instabil machen.

**Erfahrungen anderer:**
- Erin Catto hat XPBD 2024 in Solver2D mitgetestet: „I had trouble getting friction to work well with XPBD“. Fern vom Ursprung
  schwebten Objekte; er behob das, indem er auf Lageänderungen statt auf absoluten Lagen rechnete
  ([Solver2D](https://box2d.org/posts/2024/02/solver2d/)).
- Avian (Physik für Bevy) nennt beim Wechsel der Kontakte zu Soft Step: Überlappung werde „very energetic and explosive“
  aufgelöst, Körper kämen nie ganz zur Ruhe, Reibung sei weniger robust, Kontaktereignisse kämen schon bei bloßer Nähe. Danach:
  weiche Auflösung, stabile Stapel, vier- bis fünffaches Tempo in kontaktreichen Szenen ([Avian 0.1](https://joonaa.dev/blog/06/avian-0-1)).
  Seine Gelenke rechnet Avian bis heute mit XPBD: Seit 0.4 liegt das hinter dem Schalter `xpbd_joints`, der im 2D-Paket
  standardmäßig an ist; 0.8.0 vom 20.10.2026 korrigiert daran weiter Einzelheiten
  ([Releases](https://github.com/avianphysics/avian/releases), [Cargo.toml](https://github.com/avianphysics/avian/blob/main/crates/avian2d/Cargo.toml),
  [Plan zum Umbau](https://github.com/Jondolf/avian/issues/346)).
- Eine Übersichtsarbeit bescheinigt positionsbasierten Starrkörpern gute Energieerhaltung und viele Bedingungsarten, aber eine
  begrenzte Fähigkeit für stabile Stapel ([Seabra u. a. 2023](https://arxiv.org/abs/2311.09327)).

**Einordnung für Bericht 08.** „Unbedingt stabil“ stimmt im Sinn des Papers: Eine zu steif gestellte Feder wird hart, sie
explodiert nicht. Für Florians Auge zählt aber ein zweites Kriterium, *ruhig*: kein Zittern im Liegen, kein Hüpfer beim
Hinsetzen, kein Wegschießen, wenn ein Morph eine Fläche in den Boden drückt. Darin ist XPBD nachweislich schwächer, und die
Gegenmittel (Dämpfung, Schlafen, gedeckeltes Auseinanderschieben, Schwellen für den Rückprall) müssten wir selbst bauen und
abstimmen.

### 2.3 Kollision über Abstandsfelder

- **PhysX 5** nutzt Abstandsfelder für dynamische Dreiecksnetze, nur in der Pipeline auf der Grafikkarte und nicht auf
  statischen Körpern; zu grobe Felder verlieren dünne Teile ([PhysX 5.3.1](https://nvidia-omniverse.github.io/PhysX/physx/5.3.1/docs/RigidBodyCollision.html)).
- **Macklin u. a. (2020)** zeigen den Kern des Problems: Ein Feld beantwortet „wie weit, innen oder außen“ für Punkte sehr gut.
  Schwer ist, Kontakte für ganze Kanten und Flächen eines anderen Körpers zu finden; reine Punkt-Abtastung verpasst Kontakte
  zwischen den Punkten. Ihre Lösung ist eine lokale Optimierung je Element
  ([Projektseite](https://di.ku.dk/english/research/groups/simulation/research-results/local-optimization-for-robust-signed-distance-field-collision/),
  DOI 10.1145/3384538).
- **Bei uns in 2D** ist das Feld kein Raster, sondern der analytische Abstand zum abgeflachten Pfad (Bericht 10, 2.4). Es ist
  exakt bis zur Abflach-Toleranz, kennt innen und außen (kein Durchtunneln durch volle Flächen) und liefert glatte Normalen,
  wenn der nächste Punkt auf der Bézier nachgeschärft wird. Für Kreise (Pfoten, Ball, Kopf) ist der Kontakt trivial: Abstand der
  Mitte minus Radius. Für Kapseln und Polygone braucht es Abtasten plus lokale Suche, Kontaktpflege über Takte und alle
  Löser-Feinheiten aus 2.2.
- **Die eigentliche Erkenntnis:** Für die Welt sind Feld und Kette zwei Auswertungen derselben abgeflachten Linie. Ob „was man
  sieht, ist, woran er stößt“ gilt, hängt nicht an Feld oder Kette, sondern daran, dass Renderer, Physik und Fühler dieselbe
  Abflachung bekommen und dass Verschmelz-Rundungen vor dem Abflachen eingerechnet sind.

### 2.4 Rapier bei einer geänderten Form

Rapier markiert eine geänderte Form, behält aber das Kontaktpaar, verwirft nur den Arbeitsbereich der Kontaktsuche und rechnet
die Kontaktpunkte neu; das Recycling setzt für diesen Schritt aus
([pair_update.rs](https://github.com/dimforge/rapier/blob/master/src/geometry/narrow_phase/pair_update.rs)). Es gibt also kein
Kontaktende und keine Ereignisflut. Ob die Warmstart-Impulse dabei übertragen werden, hängt am Abgleich der Kontaktmerkmale;
das habe ich nicht im Einzelnen geprüft. Für morphende Hüllen ist Rapier damit grundsätzlich besser vorbereitet als Box2D.
Übrige Eigenschaften (Snapshot, deterministisches Paket, PD-Motoren, Weichkörper, Größe, API-Brüche) stehen in Bericht 09, 2.3.

### 2.5 „Welt steht, Schwerkraft dreht“

Statt das Rad zu drehen, bleibt die Welt fest; Kamera, Hintergrund und Schwerkraftrichtung drehen. Damit Ozzy sich bewegt wie
auf einem drehenden Rad, braucht jeder bewegte Körper die Scheinkräfte des drehenden Bezugssystems: Fliehkraft (m·ω²·r),
Coriolis-Kraft (−2m·ω×v) und Euler-Kraft (−m·α×r) ([Scheinkraft](https://en.wikipedia.org/wiki/Fictitious_force)). Ein
Unity-Prototyp ging genau diesen Weg, weil sein Ball durch drehende Level-Teile flog; er hält das Ergebnis nur bei mäßigem
Drehtempo für genau ([Fictitious Forces](https://mattflat.itch.io/ff/devlog/321710/collision-and-rotating-objects-in-unity-faking-it)).

*Eigene Rechnung für unser Rad* (R = 7 m, also 14 Körperlängen zu 0,5 m wie im Garten aus 13): Hält der Spieler Ozzy oben,
läuft der Rand so schnell wie Ozzy. Im Schritt (1 m/s) ist ω ≈ 0,14 rad/s und die Fliehkraft 1,4 % der Schwerkraft, im Galopp
(3 m/s) ω ≈ 0,43 rad/s und 13 %. Das ist nicht vernachlässigbar, aber leicht zu rechnen. Vorteil: Ketten liegen auf einem
statischen Körper, wie Box2D es empfiehlt, und kontinuierliche Kollision gegen statische Körper gibt es ohne Bullets. Nachteil:
Die Raddrehung (ein Freiheitsgrad) rechnet dann TypeScript, und die Rückwirkung muss aus den Kontakt- und Gelenkkräften gelesen
werden, mit einem Takt Verzug. Für uns ist das der Rückfall, falls die Kette auf dem drehenden Rad nicht trägt.

### 2.6 Zwei Löser koppeln

Die Übersichtsarbeit zur Co-Simulation (Gomes u. a. 2017) hält fest: Rechnen die Teile nacheinander (Gauss-Seidel), ist das bei
passender Reihenfolge etwas stabiler als gleichzeitiges Rechnen; der Teil mit der größten Masse soll zuerst rechnen. Iteratives
Koppeln (Fixpunkt) ist stabiler, braucht aber das Zurücksetzen der Teil-Löser, was nicht jeder Löser kann. Wer eine algebraische
Schleife übergeht, kann große Fehler bekommen ([Co-simulation: State of the art](https://arxiv.org/abs/1702.00686)). Avian
zeigt die andere Möglichkeit: Wer die Engine selbst besitzt, kann zwei Verfahren in derselben Unterschritt-Schleife mischen
(Soft-Step-Kontakte und XPBD-Gelenke). Über die WebAssembly-Grenze hinweg geht das nicht; dort koppeln wir je Takt.

---

## 3. Die Fälle der Demo

### (a) Das Rad: dynamisch, mit Trägheit, Lagerreibung, Fingerfeder und Rückwirkung

**Was verlangt ist** (13, 2.4 und 2.5; 08, 9.5): *Halten* (das Rad steht wie Boden, auch wenn Ozzy dagegen läuft), *Ziehen*
(die angefasste Stelle folgt dem Finger über eine kritisch gedämpfte Feder von etwa 4 Hz mit Kraftgrenze), *Loslassen* (das Rad
läuft mit Schwung weiter und wird durch Lagerreibung langsamer), *Rückwirkung* (Ozzys Schritte drehen das Rad; Regler
„Radgewicht“).

**Box2D-Weg:**

| Teil | Baustein | Regler für Florian |
|---|---|---|
| Achse | Scharnier zwischen statischem Boden und Rad | – |
| Trägheit | `b2Body_SetMassData` (die Kette hat keine Masse) | Radgewicht als Randmasse I/R², z. B. 1-, 5-, 20-fach Ozzy; ganz rechts „Boden“ = kinematisch |
| Lagerreibung | Scharnier-Motor mit Zieltempo 0 und Höchstmoment (Haftung im Lager), dazu Winkeldämpfung des Körpers (zähe Reibung) | „Nachlauf“: wie lange Schwung anhält |
| Finger | kinematischer Fingerkörper, je Takt über `b2Body_SetTargetTransform` geführt; Motor-Gelenk zum gegriffenen Punkt des Rads, Linearfeder 4 Hz, Dämpfung 1, Höchstkraft | „Griff“ (Höchstkraft) |
| Loslassen | Motor-Gelenk aus (Höchstkraft 0) oder entfernen | – |
| Rückwirkung | entsteht aus allen Kräften zwischen Rad und Ozzy: Pogo-Federn, echte Kontakte, Kräftepaar des Vortriebs (b) | Radgewicht |

Halten hält, solange Ozzys Drehmoment unter Höchstkraft mal Hebel bleibt. Läuft er stärker dagegen, rutscht das Rad sichtbar
unter dem Finger weg. Das ist ein physikalisch ehrliches „er zieht ganz schön“. Der Regler „Radgewicht“ ganz rechts schaltet
auf kinematisch; dann gilt 09s Weg über `b2Body_SetTargetTransform`, und das Fingergelenk entfällt (zwei nicht dynamische Körper
rechnet 3.2 nicht).

*Massenverhältnis (eigene Einordnung):* Ein schweres Rad unter einem leichten Hund ist für Soft Step der gutmütige Fall.
Heikel sind schwere Körper an leichten Gliedern in Gelenkketten (Ragdoll, siehe 09, offene Frage 3). Verhältnisse von 1 bis 20
zwischen Randmasse und Ozzy sollten unkritisch sein; die Probe prüft die Enden.

**XPBD-Weg (08):** Rad als starrer Körper mit Achsbedingung, Finger als Bedingung mit Nachgiebigkeit und geklemmtem
Multiplikator (Kraftgrenze), Lagerreibung als Geschwindigkeitsbegrenzung. Wenig Code und gleich gut.

**Urteil:** Beide Wege können das Rad. Der Fall entscheidet nicht zwischen den Lösern; er widerlegt nur das kinematische Rad
aus 09 als Normalfall.

### (b) Pfotenkontakt und Reibung auf dem drehenden, gewölbten Rad

**Klarstellung zuerst.** In 08 (9.4) und 09 (6) stehen Ozzys Pfoten nicht als Kontaktformen auf dem Rad. Federbeine tragen den
Rumpf, die gezeichneten Beine folgen über das Rückgrat (IK). Die „Reibung der Pfoten“ ist ein **Antriebsgesetz**, kein
Kontaktmodell: Ozzy will ein Tempo relativ zur Oberfläche, seine Beine leisten nur begrenzte Kraft. Das bleibt unabhängig vom
Löser gleich:

```
v_rel = v_Ozzy − v_Oberfläche(Fußpunkt)          (Box2D: b2Body_GetWorldPointVelocity am Rad)
F_t   = begrenze( m·k·(v_soll − v_rel),  ± min( m·a_max·cos α ,  μ·N ) )
        a_max: Bremskraft (Standfestigkeit), μ: Haftung (Gras, Schnee, Eis), N: Normalkraft der Federbeine
Ozzy  ← +F_t entlang der Tangente;   Rad ← −F_t am Fußpunkt (Drehmoment um die Achse)
```

So entsteht die Rückwirkung physikalisch richtig: Steht Ozzy neben dem Scheitel auf einem leichten Rad und bremst, drückt seine
Bremskraft den Rand bergab; das Rad dreht unter ihm weg und trägt ihn weiter vom Scheitel. Das ist das Baumstamm-Gefühl aus 13 ohne eine
einzige Sonderregel. Eis senkt μ und damit die Grenze; auch hier keine Sonderregel.

*Eigene Abschätzung zur Stabilität:* Das Kräftepaar wirkt einen Takt lang konstant (explizit). Mit k zwischen 10 und 20 je
Sekunde und 60 Hz liegt k·Δt bei höchstens 0,33, auf einem gleich schweren Rad effektiv bei 0,67. Das ist weit unter der
Stabilitätsgrenze von 2.

**Warum nicht das Mover-Gelenk aus 09:** Es vergleicht die Tempi der Körpermitten, nicht die Oberfläche unter dem Fuß, und gibt
kein Drehmoment an das Rad (2.1). Ein Mover am statischen Boden nimmt die Kraft vom Boden statt vom Rad, das dritte Newtonsche
Gesetz fehlt dann im Spiel. Das Pogo-Gelenk dagegen funktioniert am Rad: Es rechnet mit Hebelarmen und Oberflächentempo. Auf dem
reinen Kreis zeigt seine Kraft durch die Achse (kein Drehmoment), an Hügeln erzeugt sie das richtige Moment.

**Echte Kontakte entstehen woanders:** am Becken (Sitzen, Popo-Rutschen), am Rumpf (Liegen, Bauchrutscher), an allen Gliedern im
Sturz und bei losen Dingen. Dort zählt der Löser:

| Eigenschaft | Box2D Soft Step | XPBD (Müller u. a. 2020) | Bedeutung bei uns |
|---|---|---|---|
| Normale auf gekrümmter, drehender Fläche | einmal je Schritt; mit Recycling bis zu 5 cm Weg ohne neue Normale | vor jeder Lösung neu | Rad: bei 3 m/s dreht die Normale in einem Takt um 0,4° (eigene Rechnung), unerheblich. Kleiner Hügel mit 30 cm Radius: bis 9,5° Fehler durch Recycling; Recycling für Ozzys Körper klein stellen oder abschalten (kostet bei uns nichts) |
| Haftung am Hang | Geschwindigkeitsebene mit Warmstart; hält in der Praxis, solange der Kontakt bestehen bleibt (siehe d) | Lageebene, kein Kriechen per Bauart | beide gut; Box2D nur ohne Kontaktabriss |
| Ruhe im Liegen | weiche Kontakte, Entspannen, Schlafen | kaum numerische Dämpfung, Zittern möglich (Paper) | Box2D besser |
| Überlappung durch einen Morph | Auseinanderschieben gedeckelt (3 m/s) | sofortige Lagekorrektur wird zu Geschwindigkeit; „explosiv“ (Avian), Gegenmittel nötig | Box2D besser |
| Schneller Sturz | kontinuierlich gegen statisch, Bullets gegen alles | viele Unterschritte; volle Felder kennen innen und außen | gleichwertig, wenn Ozzys Teile Bullets sind |
| Reibung allgemein | erprobt | „schwierig“ (Catto), „weniger robust“ (Avian) | Box2D besser |

**Urteil:** Box2D. Der Vortrieb ist ein Kräftepaar aus der Figur, die Pogo-Federn hängen am Rad, echte Kontakte rechnet Soft
Step.

### (c) Kollision an der gezeichneten Form

**Eine Quelle, drei Ableitungen.** Der Weltpfad ist ein geschlossener Vektorpfad (13, 10.1). Er wird beim Bearbeiten einmal
abgeflacht, mit derselben Toleranz für alle:

```
Weltpfad (Bézier, Florians Punkte und Griffe)
   │  Verschmelz-Rundungen zwischen Rand und angehefteten Formen einrechnen (beim Bearbeiten, nicht je Takt)
   ▼
Abgeflachte Linie im Radsystem  (Toleranz 0,25 Bildpunkte bei größter Ansicht ≈ 0,6 mm)
   ├─► Renderer: Strecken für das Abstandsfeld (Bericht 10)
   ├─► Box2D: Kette als Schleife am Radkörper; Hindernisse als gerundete Polygone (höchstens 8 Ecken)
   └─► TypeScript: Abstandsfeld mit Suchbaum über die Strecken (Fühler, Fußpunkte, glatte Normalen, Spritzer)
```

*Eigene Rechnung:* Bei R = 7 m und 0,6 mm Toleranz braucht der Kreis etwa 230 Punkte im Abstand von rund 19 cm; enge Hügel
bekommen dichtere Punkte. Box2Ds Mindestabstand von 0,5 cm bleibt weit eingehalten. Die Segmentnormalen der Kette springen dabei
um etwa 1,5° von Segment zu Segment. Für die Physik ist das ohne Belang, für Fußsohlen und Blickrichtung wäre es sichtbar. Deshalb
holen Fühler und Bein-IK Lage und Normale aus dem TypeScript-Feld, das den nächsten Punkt auf der Bézier nachschärft.

**Wie genau gilt „was man sieht, ist, woran er stößt“?**
- *Welt:* bis auf die Abflach-Toleranz (0,6 mm, also 0,25 Bildpunkte) plus die Ruhe-Überlappung weicher Kontakte (etwa 0,3 mm,
  Abschätzung in 2.1), zusammen höchstens etwa 0,4 Bildpunkte auf dem iPhone 16. Beim Verschmelzen von Rand und Hindernis zählt die gebackene Rundung;
  ohne sie läge der Anschlag in der Rundung bis zu ihrem Radius daneben.
- *Ozzys Körper:* Hüllen nähern die Zeichnung an (Kapsel für die Brust, Kreis fürs Becken, Kreis für den Kopf). Die Abweichung
  liegt je nach Haltung bei einigen Millimetern bis wenigen Zentimetern. Die **sichtbare** Berührung sichert der Renderer: An
  einer Kontaktstelle wird Ozzys Fläche gegen das Bodenfeld weich abgeflacht (weiches Maximum wie die Klemme aus Bericht 10),
  statt einzusinken oder zu schweben. Ob Florian diese Abflachung am Logo zulässt, ist seine Entscheidung (offene Frage 3).
- *Sichtbar machen:* Der Prüfstand zeigt in der Röntgenansicht Zeichnung, Kette, Hüllen und Kontaktpunkte übereinander und färbt
  Abweichungen über 0,5 Bildpunkte rot.

**Vorbehalt Kette auf drehendem Körper.** Box2D empfiehlt Ketten auf statischen Körpern; Gründe nennt es nicht. Zu erwarten sind
die fehlende Masse (über `b2Body_SetMassData` gelöst) und die kontinuierliche Kollision, die standardmäßig nur gegen statische
Körper läuft (über Bullets für Ozzys Teile und lose Dinge gelöst). Ob noch mehr dahintersteckt, zeigt erst die Probe. Rückfall:
„Welt steht, Schwerkraft dreht“ (2.5).

**XPBD-Weg mit Feld (08, 10, 13):** Anschlag an Abtastpunkten des gezeichneten, gerade gemorphten Umrisses; das ist für Ozzys
Körper genauer. Dafür braucht es eine eigene Kontaktsuche (Punkte plus lokale Suche nach Macklin), eigene Kontaktpflege und die
Löser-Feinheiten aus 2.2.

**Urteil:** Für die Welt gleichwertig, sobald es eine Quelle gibt. Für Ozzys Körper ist das Feld genauer; mit der Abflachung im
Renderer ist der Unterschied unsichtbar. Das Risiko „Kette auf dem drehenden Rad“ prüft die Probe.

### (d) Hüllen einer Figur, die morpht (Sitzen, Liegen, Popo-Rutschen, Kopfdrehung)

**Befund Box2D.** Eine je Takt umgeformte Hülle verliert je Takt alle Kontakte (2.1). Folgen:
- *Kein Warmstart:* Der weiche Kontakt baut seinen Impuls in jedem Takt aus null auf. Das kann als leichtes Wippen oder als
  Kriechen am Hang sichtbar werden; wie stark, weiß niemand ohne Probe.
- *Kein Recycling,* also auch kein Tempovorteil von 3.2 für diese Form.
- *Ereignisse flackern:* Kontaktende und Kontaktbeginn in jedem Takt. Logik wie „Po berührt Boden“ würde zappeln.
- *Masse* bleibt alt, bis `b2Body_UpdateMassFromShapes` gerufen wird.
- *Determinismus* bleibt erhalten, denn jede Änderung wird aufgezeichnet, solange die Hülle selbst deterministisch entsteht.
  Hier liegt eine Falle: Die heutige Zeichnung (`raster.ts`, `haltung.ts`, `form.ts`) nutzt an 84 Stellen `Math.atan2`, `sin`,
  `cos`, `exp`, `pow` oder `hypot`. Auf einem Gerät liefert das immer dasselbe, zwischen Browsern ist es nicht garantiert
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)). Fließt die Zeichnung in die
  Physik, braucht der Simulationspfad eigene Näherungen, sobald Aufnahmen auf anderen Geräten gleich laufen sollen.

**Weg in Box2D: Haltung über Gelenkziele, nicht über Formänderung.**
- Ozzy besteht physikalisch aus drei Teilen mit festen Formen: Brust (Kapsel), Becken (Kreis), Kopf (Kreis), verbunden durch
  Motor-Gelenke mit Federzielen. Das ist 08s Körpermodell (zwei Rumpfbrocken plus Kopf). *Spannung* ist die Höchstkraft dieser
  Gelenke.
- *Sitzen:* Das Ziel des Beckens wandert entlang des gezeichneten Übergangs nach unten und hinten; der Beckenkreis setzt auf, der
  Kontakt bleibt bestehen.
- *Liegen:* Brust und Becken drehen und senken sich auf ihre Ziele. Beim Wechsel in eine Seitenlage kann die Brust-Hülle einmal
  getauscht werden (ein Takt Kaltstart an einer Zustandsgrenze, unsichtbar).
- *Popo-Rutschen:* Sitzen plus geringere Reibung des Beckenkreises; das reißt keinen Kontakt ab (2.1).
- *Kopfdrehung:* ändert nur die Zeichnung; der Kopfkreis bleibt.
- Die Hüllen passt der Editor je Haltung automatisch an die Zeichnung an (Kreis an den Pobogen, Kapsel an die Bauchlinie) und
  zeigt sie als dünne Linie.

**Rapier** behält das Kontaktpaar bei Formänderung (2.4). Reicht der Gelenkweg nicht, ist Rapier der Rückfall genau für diesen
Fall.

**XPBD-Weg:** Morphende Hüllen sind natürlich, weil Kontakte jeden Unterschritt neu aus der aktuellen Form entstehen. Drückt ein
Morph aber eine Fläche in den Boden, wird die Lagekorrektur zur Geschwindigkeit, und Ozzy hüpft. Es braucht dann einen Deckel
für das Auseinanderschiebe-Tempo, wie Box2D ihn mitbringt.

**Urteil:** Box2D mit Gelenkzielen. Die Probe zeigt beide Varianten nebeneinander: V1 feste Teile mit Zielen, V2 Hülle je Takt
aus der Zeichnung.

### (e) Zweibahn-Kopplung zwischen WebAssembly-Welt und TypeScript-Figur, Zurückspulen

**Reihenfolge je Takt** (Gauss-Seidel, der schwerste Teil zuerst, 2.6):

| Schritt | Wer | Was |
|---|---|---|
| 1 | Logik (TS) | Eingabe, Absicht, Launen, Wunschtempo; Zufall mit Saat |
| 2 | Figur (TS) | Posen mischen → Gelenkziele für Becken und Kopf, Spannung, Beinziele, Hüllenwechsel an Zustandsgrenzen |
| 3 | Figur → Welt | Finger, Pogo-Federn aus Strahlabfragen, Kräftepaare des Vortriebs, Gelenkziele, Reibung |
| 4 | Welt (WASM) | `b2World_Step(1/60, 4)` |
| 5 | Welt → Figur | Lagen, Tempi, Beschleunigungen (aus Tempo-Differenzen), Treffer mit Stärke, Gelenkkräfte, Raddrehung; gesammelt über Bewegungs- und Kontaktereignisse |
| 6 | Figur (TS) | XPBD: Ohren, Bart, Schwanz, Bohne mit 4 Teilschritten auf den neuen Lagen |
| 7 | beide | Prüfsumme, alle 16 Takte ein Schlüsselstand |

**Was nicht zurückfließt:** Kräfte von Ohren, Schwanz und Bart. Sie sind leicht gegenüber dem Rumpf; ihr Rückstoß wird bewusst
weggelassen. Damit bleibt die Kopplung explizit (ein Takt Verzug) nur dort, wo die Kräfte begrenzt sind (Kräftepaar mit
Grenze, Gelenkziele mit Höchstkraft). Eine iterative Kopplung wäre stabiler, bräuchte aber ein Zurücksetzen der Welt in jedem
Takt (2.6); das ist mit Snapshots möglich, aber nicht nötig.

**Über die Grenze:** Daten gesammelt lesen (ein Aufruf für alle Bewegungsereignisse), keine Abfrage je Körper in Schleifen,
jedes Hüllobjekt im Adapter freigeben. Engine-Typen verlassen den Adapter nie.

**Zurückspulen:**
- *Schlüsselstand* alle 16 Takte (wie der Replay-Viewer von Box2D): Box2D-Snapshot (`Uint8Array`), Zustand der Figur
  (`Float64Array`), Logik-Zustand, Zustand des Zufallsgenerators, Taktnummer. Dazu das Eingabeprotokoll je Takt. Spulen heißt:
  nächsten Schlüsselstand davor laden, höchstens 15 Takte nachrechnen. Speicherbudget fest (Vorschlag 32 MB); die Größe eines
  Snapshots misst die Probe.
- *Prüfsumme je Takt* aus drei Teilsummen: `b2World_GetStateHash` (64 Bit), eine 64-Bit-Summe über die Bytes der Figur und eine
  über die Logik. Weicht etwas ab, zeigt die Teilsumme, welcher Teil schuld ist.
- *Kennungen:* Ragdoll-Körper werden beim Laden angelegt und mit `b2Body_Disable`/`b2Body_Enable` geschaltet, nicht erzeugt und
  zerstört. Pogo-Gelenke entstehen nach dem Zurücksetzen deterministisch neu. Nutzerdaten von Box2D werden nicht verwendet (sie
  werden beim Zurücksetzen gelöscht); eine eigene Tabelle ordnet Kennungen den Teilen zu.
- *Experimentell:* Snapshots bleiben im Speicher und werden nie als Datei über Fassungen hinweg aufbewahrt. Dauerhaftes
  (Rückblick der Stürze, Fehlerberichte von Florian) wird als Ausgangslage plus Eingabeprotokoll gespeichert.
- *Rückfall ohne Snapshot:* Welt neu aufbauen und ab Ausgangslage nachrechnen. Bei unter 0,2 ms je Takt (Abschätzung aus 09)
  sind 10 Sekunden in etwa 120 ms nachgerechnet; für das Spulen im Editor reicht das.

**Zwei Stufen von Wiederholbarkeit:**
1. *Gleiches Gerät* (Spulen im Editor, Prüfstand, „zehnmal gleich“): Pflicht. Das geht auch mit `Math` in der Zeichnung.
2. *Über Geräte hinweg* (Aufnahmen teilen, Fehlerberichte, Geister): nur mit eigenen Näherungen für Winkelfunktionen im
   Simulationspfad und einfädigem WebAssembly (09, 3.2). Ob das gebraucht wird, entscheidet Florian (08, Frage 7).

**Im XPBD-Weg (08)** ist der ganze Zustand eine Handvoll typisierter Felder: eine Prüfsumme, ein Kopierbefehl, keine Grenze.
Das ist sein größter Vorteil.

### (f) Ein Takt für alles

- **60 Hz** für Eingabe, Logik, Posen-Ziele, Welt (4 Unterschritte) und Figur (4 Teilschritte). Beide Löser rechnen damit in
  1/240 s, genau wie der Prototyp heute. Die Darstellung mischt zwischen dem vorletzten und dem letzten Takt (09, 4).
- Ein XPBD-**Weltlöser** bräuchte für Kontakte nach dem Paper eher 20 Unterschritte je 60-Hz-Takt (1200 Hz); für Nachschwingen
  reichen 4.
- **Eingabe:** Je Takt zählt die neueste Fingerlage. Der Finger wirkt über eine Feder, deshalb ist ein Takt Verzug (16,7 ms)
  nicht spürbar; 120 Hz mit 2 Unterschritten bleibt die Ausweichlösung, falls es am Mac träge wirkt (09).
- **Zeitlupe** im Spiel (13: Cartoon nur in der Zeit) und im Prüfstand: Die Takte folgen langsamer aufeinander, ihre Länge bleibt
  1/60 s. Nur so bleibt die Zeitlupe bitgleich mit dem Normaltempo.
- **Stromsparmodus:** Safari begrenzt `requestAnimationFrame` dann absichtlich auf 30 Bilder je Sekunde
  ([WebKit 215745](https://bugs.webkit.org/show_bug.cgi?id=215745)); es laufen zwei Takte je Bild, das Spiel bleibt gleich.
- **Zeitleiste im Editor:** Stellen mit Physik sind Takte; Scrubben springt zum Schlüsselstand und rechnet nach.

### (g) Flüssiges und lose Dinge (Pfütze, Spritzer, Ball)

| Ding | Weg | Warum so |
|---|---|---|
| Pfütze | Mulde im Weltpfad; Zone (Sensor) für die Logik; Wasserfläche als Höhenfeld aus gekoppelten Federn in TypeScript, Spiegel immer waagrecht in der Welt, also kippt die Fläche, wenn das Rad dreht; läuft sie über den Muldenrand, werden Tropfen frei | klassische 2D-Technik mit Federsäulen und Weitergabe an Nachbarn ([Tutorial](https://code.tutsplus.com/make-a-splash-with-dynamic-2d-water-effects--gamedev-236t), [GDevelop](https://wiki.gdevelop.io/gdevelop5/extensions/dynamic-water/)); Höhenfeld-Wasser auch als kurzes Browserbeispiel ([Ten Minute Physics](https://matthias-research.github.io/pages/tenMinutePhysics/index.html), Folge 20) |
| Spritzer | 50 bis 200 Teilchen in TypeScript: ballistisch, Kollision gegen das Abstandsfeld des Pfads, Verlöschen; Verschmelzen im Renderer (Bericht 10, 6.1) | keine Rückwirkung nötig, also kein Grund für die Welt-Engine; genau hier ist das Feld ideal |
| Ball | Box2D-Kreis als Bullet mit Rollwiderstand | Ozzy schubst ihn, das Rad trägt ihn; Rückwirkung von selbst |
| Stamm, Steinchen | Formen am Rad (gerundete Polygone) oder Teil der Kette | fest |
| Wippe, Trampolin | Scharnier mit Grenzen; Abstands- oder Schiebegelenk mit Feder | Gelenke von Box2D |
| Schneeball, der wächst | Box2D-Kreis; Radius in Stufen (etwa alle 5 %), danach Masse neu | jede Radiusänderung zerstört seine Kontakte (d); in Stufen bleibt das selten |
| Laubhaufen | leichte Körper mit Wind und Luftwiderstand (neu in 3.2) oder reine Teilchen, wenn sie nichts schubsen | je nach Rolle |
| echte Flüssigkeit | nicht in der Demo; später Position Based Fluids oder FLIP in TypeScript ([Veröffentlichungen](https://matthias-research.github.io/pages/publications/publications.html), Ten Minute Physics Folge 18) | LiquidFun (Box2D 2.3) ist seit April 2023 archiviert ([GitHub](https://github.com/google/liquidfun)); Box2D nennt Flüssigkeiten nur als mögliche spätere Arbeit ([3.2](https://box2d.org/posts/2026/10/box2d-3.2/)) |

**Urteil:** Keine Flüssigkeits-Engine. Lose Dinge, die schubsen oder geschubst werden, gehören in dieselbe Welt wie Ozzy (Box2D).
Was nur zu sehen ist (Spritzer, Wasserfläche), rechnet TypeScript gegen dasselbe Abstandsfeld.

---

## 4. Gegenüberstellung der Gesamtwege

Wege: **A** eigener XPBD-Kern für Figur und Welt (08) · **B** Box2D-Welt plus XPBD-Figur, mit den Korrekturen dieses Berichts ·
**B′** wie B, aber Welt statisch, Schwerkraft und Kamera drehen · **C** Rapier-Welt (`-deterministic`) plus XPBD-Figur.
Zeichen: ++ sehr gut, + gut, o mittel, − schwach, −− ungeeignet.

| Kriterium (Gewicht) | A | B | B′ | C |
|---|---|---|---|---|
| Ruhe und Reibung echter Kontakte: Sitzen, Rutschen, Liegen (hoch) | − (Zittern, Reibung, Überlappung; selbst zu lösen) | ++ | ++ (statisch sogar steifer) | ++ |
| Sturz mit 10 bis 14 Körpern (hoch) | o (Gelenke stark, Kontakte schwach) | + (Ragdoll-Proportionen offen, 09) | + | ++ (Mehrkörpergelenke) |
| Dynamisches Rad mit Rückwirkung (hoch) | ++ (eigene Bedingungen) | + (Kräftepaar, Pogo am Rad) | o (Rad in TS, Rückwirkung aus gemessenen Kräften, Scheinkräfte) | + (wie B) |
| Anschlag = Zeichnung (hoch) | ++ (Feld, morphgenau) | + (eine Quelle; Körper über Hüllen und Abflachung im Renderer) | + (Kette auf statischem Körper, wie empfohlen) | + |
| Morphende Hüllen (mittel) | + (natürlich, Deckel nötig) | o (Gelenkziele statt Umformen) | o | + (Paar bleibt) |
| Zurückspulen, Prüfsumme (hoch) | ++ (ein Zustand) | + (Snapshot experimentell, zwei Zustände) | + | ++ (Snapshot, deterministisches Paket) |
| Ein Takt (mittel) | o (Welt braucht ~20 Unterschritte) | ++ | ++ | ++ |
| Lose Dinge, Flüssiges (mittel) | + (alles in einem Löser, PBF möglich) | + | + | + (Weichkörper zusätzlich) |
| Aufwand bis zur Probe (mittel) | −− (Wochen: Kontaktsuche, CCD, Ragdoll, Ruhe) | + (4 bis 6 Tage) | o | + |
| Pflege über Jahre (hoch) | − (alles selbst) | + (Kern ++, Web-Bindung zwei Personen) | + | o (0.x-Brüche) |
| Größe im Web (niedrig) | ++ | + (rund 185 KB Brotli, 09) | + | o (rund 0,7 MB, 09) |

**Lesart:** A gewinnt bei allem, was eng an der Zeichnung hängt (Morph, Anschlag, ein Zustand), und verliert bei allem, was
Florian als Fehler sieht (Zittern, Kriechen, Hüpfer, Explosion). B gewinnt dort und zahlt mit Umwegen: Kräftepaar statt
Mover-Gelenk, Gelenkziele statt Formänderung, zwei Zustände beim Spulen. C ist B sehr ähnlich, besser bei morphenden Hüllen,
schwerer und unruhiger in der Pflege. B′ ist kein eigener Weg, sondern der Rückfall für die Kette.

---

## 5. Entscheidungsvorlage

**Empfehlung:** Weg B. Weltphysik mit Box2D 3.2 über `box2d3-wasm` 6.0 (`compat`), Figurphysik als eigene XPBD-Schicht, ein
60-Hz-Takt, Kopplung über Ziele und Kräftepaare, Zurückspulen über gemeinsame Schlüsselstände. Freigabe erst nach Probe P1
(Abschnitt 7).

**Was damit festgelegt ist:**
- Ein Paket `studio-welt` (wie in Bericht 11) mit einer schmalen Schnittstelle in unseren Begriffen; keine Engine-Typen außerhalb.
- Bericht 08, Abschnitt 8.1 („eigener XPBD-Kern für die Welt der Demo“), und die Annahme „Kollision am Abstandsfeld“ in 13, 10.4,
  gelten für Fühler, Spritzer und die Anzeige, nicht für die Kontakte der Welt.
- Bericht 09 gilt mit fünf Änderungen: Rad dynamisch; Vortrieb als Kräftepaar statt Mover-Gelenk; Pogo-Federn am Rad; Haltungen
  über Gelenkziele; Kollision aus einer Quelle mit gebackenen Rundungen.

**Was es kostet:** die Probe (4 bis 6 Tage), danach den Adapter samt Kopplung bis zur Spielwiese D0 aus 13 (eigene Schätzung:
ein bis zwei Wochen). Laufende Kosten: die Web-Bindung im Blick behalten; bei jedem Box2D-Sprung das Snapshot-Format prüfen.

**Wann wir umsteigen (vorab festgelegt):**

| Befund in der Probe | Folge |
|---|---|
| Sitzen oder Rutschen zittern oder kriechen auch mit festen Teilen und Gelenkzielen (V1) | dieselbe Szene mit Rapier (`-deterministic`), dann entscheiden |
| Die Kette am drehenden Rad lässt Ozzy hängen oder durchfallen, trotz Bullets | B′: Welt statisch, Schwerkraft und Kamera drehen, Scheinkräfte |
| Die Rückwirkung bleibt widersprüchlich (Drehimpulsbilanz geht nicht auf) | Kräftepaar prüfen; lässt es sich in Box2D nicht sauber fassen, bekommt A eine eigene Probe |
| Ragdoll zittert in Ozzys Proportionen (09, Frage 3) | Rapier (Mehrkörpergelenke) |
| WebAssembly läuft in der App-WebView nicht (Lockdown-Modus, 09, Frage 1) | A oder Planck hinter derselben Schnittstelle |
| Snapshot fällt in einer neuen Fassung aus | Nachrechnen ab Ausgangslage (5 und 3e) |

**Was Florian sieht und entscheidet:** wie schwer sich das Rad anfühlt (Radgewicht, Griff, Nachlauf), wie früh Ozzy rutscht
(Haftung, Bremskraft), ob die Fläche an Kontaktstellen leicht abflachen darf, ob Aufnahmen auf anderen Geräten gleich laufen
müssen.

**Frage an Florian, in seinen Worten:** „Darf die Welt (Rad, Körper, Stürze, Ball) mit einer bewährten Physik-Bibliothek rechnen,
während Ohren, Schwanz, Bart und Bohne mit unserer eigenen laufen? Ich würde es dir zuerst in einer Probe zeigen: das Rad mit drei
Gewichten, Ozzy setzt sich am Hang hin und rutscht auf dem Po, ein Sturz, Zurückspulen.“

---

## 6. Architektur aus einem Guss

### 6.1 Der Takt

```ts
const TAKT = 1 / 60;

function takt(n: number, eingabe: Eingabe): void {
  logik.schritt(n, eingabe);                       // Absicht, Launen, Wunschtempo (Zufall mit Saat)
  const ziele = figur.ziele(logik.zustand);         // Posen mischen → Gelenkziele, Spannung, Beinziele

  welt.finger(eingabe.finger);                      // Fingerkörper führen, Griff an oder aus
  welt.federbeine(figur.beinStrahlen());            // Pogo-Federn am Rad aus Strahlabfragen
  welt.vortrieb(figur.antrieb(welt.oberflaeche())); // Kräftepaar Ozzy ↔ Rad, begrenzt
  welt.gelenkziele(ziele);                          // Becken, Kopf, im Sturz alle Glieder

  welt.schritt(TAKT, 4);                            // Box2D, 4 Unterschritte

  const lage = welt.lesen();                        // ein gesammelter Aufruf: Lagen, Tempi, Treffer
  figur.nachschwingen(lage, TAKT, 4);               // XPBD: Ohren, Bart, Schwanz, Bohne

  pruefsumme[n] = mische(welt.hash(), figur.hash(), logik.hash());
  if (n % 16 === 0) archiv.merke(n, welt.snapshot(), figur.zustand(), logik.zustand());
}
```

Gezeichnet wird je Bild, gemischt zwischen den letzten beiden Takten (09, 4).

### 6.2 Die Schnittstelle `welt`

Rund 25 Funktionen in unseren Begriffen, im Adapter auf Box2D abgebildet:

| Gruppe | Funktionen |
|---|---|
| Körper | `koerper(art, masse?)`, `aktiv(an/aus)`, `masse(randmasse, schwerpunkt)` |
| Hüllen | `kreis`, `kapsel`, `polygon` (gerundet, höchstens 8 Ecken), `kette(linie)`, `reibung`, `bullet` |
| Gelenke | `scharnier(grenzen, motor, feder)`, `ziel(feder, höchstkraft)`, `abstand`, `filter` |
| Figur | `finger(an/aus, lage, griff)`, `federbein(strahl, feder, grenzen)`, `kraftpaar(punkt, kraft)` |
| Abfragen | `strahl`, `form`, `oberflaechentempo(punkt)` |
| Logik | `zone`, Ereignisse (Berührung, Treffer mit Stärke, Gelenkkraft über Schwelle) |
| Takt | `schritt`, `lesen`, `snapshot`, `zuruecksetzen`, `hash` |

Alle Regler sprechen dieselbe Sprache wie überall in Studio: Frequenz (wie straff), Dämpfung (wie lange es nachschwingt),
Höchstkraft (wie fest). Box2D beschreibt seine weichen Bedingungen genauso, XPBD über die Nachgiebigkeit, die sich daraus rechnet.

### 6.3 Eine Quelle, drei Ableitungen

Der Weltpfad, Ozzys Formen und die Formen der Dinge sind die einzige Wahrheit. Abgeleitet werden beim Bearbeiten (nicht je Takt):
die Kette und Hindernis-Polygone für Box2D, das Abstandsfeld für Fühler und Teilchen, die Strecken für den Renderer und Ozzys
Hüllen je Haltung. Jede Ableitung trägt die Version ihrer Quelle; ändert Florian einen Punkt, werden alle drei neu erzeugt. Der
Prüfstand zeigt die Abweichungen.

### 6.4 Prüfstand und Editor

- **Röntgen:** Zeichnung, Kette, Hüllen, Kontaktpunkte, Kräfte als Pfeile, Kipppunkt (08), Prüfsummen je Teil.
- **Spielen, Pause, Einzeltakt, Zeitlupe** (Takt-Tempo, nicht Taktlänge), **„zehnmal gleich“** (Ausgangslage plus Protokoll).
- **Spulen** über Schlüsselstände; **Aufnehmen** backt Lagen in Schlüssel, die Florian nachformt (08, 09).
- **Fehlerbericht:** Ausgangslage plus Eingabeprotokoll als kleine Datei; auf demselben Gerät exakt nachspielbar, über Geräte
  hinweg nur in Stufe 2 (3e).

---

## 7. Die Probe P1 „Rad mit Gewicht“

Eine einzige, vorher festgelegte, sichtbare Probe nach Arbeitsregel 1 und 2. Sie erweitert die Probe aus Bericht 09, Abschnitt 9,
um das dynamische Rad, die Rückwirkung und eine Figur, die sich hinsetzt. Eigene Seite im Arbeitsbaum dieses Strangs, nicht in
Florians Fenstern.

### 7.1 Aufbau

1. **Welt:** Box2D 3.2 über `box2d3-wasm/compat` hinter der Schnittstelle `welt` (nur die Funktionen aus 6.2, die die Probe
   braucht). Einbindung mit Vite klären (09, Frage 8).
2. **Rad:** dynamisch, Scharnier zur Achse, Lagerreibung über den Motor, Masse über `b2Body_SetMassData`. Regler Radgewicht mit
   vier Stufen: leicht (Randmasse wie Ozzy), mittel (5-fach), schwer (20-fach), Boden (kinematisch). Kollision: Kette als Schleife
   aus dem gezeichneten Weltpfad mit zwei Hügeln, einer Mulde und einer Stufe; drei Hindernisse als gerundete Polygone, eines davon
   mit gebackener Verschmelz-Rundung.
3. **Finger:** kinematischer Fingerkörper, Motor-Gelenk mit Linearfeder (4 Hz, Dämpfung 1) und Regler „Griff“ (Höchstkraft).
   Halten, Ziehen, Loslassen mit Maus und Finger.
4. **Ozzy:** echte Formen aus dem Prototyp (Stehen, Sitzen und der vorhandene Übergang), Physik aus Brust, Becken und Kopf mit
   Motor-Gelenken; vier Federbeine (Pogo am Rad aus Strahlabfragen); Vortrieb als Kräftepaar mit Bremskraft 0,3 g und Regler
   Haftung; Bullets für alle Teile. Die Hüllen liegen als dünne Linien über der Zeichnung.
5. **Hinsetzen in zwei Varianten,** jederzeit umschaltbar: **V1** feste Teile, Haltung über Gelenkziele; **V2** Hülle der Brust je
   Takt aus der Zeichnung über `b2Shape_SetPolygon`. Popo-Rutschen: Sitzen plus geringere Reibung am Becken.
6. **Sturz:** Ragdoll mit 10 Körpern, beim Laden angelegt und ausgeschaltet; bei zu viel Tempo eingeschaltet, Glieder folgen der
   Sturzpose mit geringer Spannung.
7. **Figurphysik:** zwei Ohr-Pendel und eine Schwanzkette mit sechs Gliedern in XPBD, nach dem Weltschritt gerechnet.
8. **Takt und Spulen:** 60 Hz, je 4 Teilschritte, gemischte Darstellung; Schlüsselstände alle 16 Takte, Eingabeprotokoll,
   Prüfsumme aus drei Teilsummen, Schieber zum Zurückspulen, Knopf „zehnmal gleich“. Was aus der Zeichnung in die Physik fließt
   (Gelenkziele, Hülle in V2), läuft in der Probe über eigene Winkelfunktionen, damit der Vergleich über Geräte (K7) etwas
   aussagt.
9. **Anzeige:** Röntgen (Zeichnung, Kette, Hüllen, Kontaktpunkte), dazu Zahlen: größte Abweichung in Bildpunkten, Überlappung in
   Millimetern, Kriechen je 10 s, Kontaktbeginne je Sekunde, Aufrufe über die Grenze je Takt, Millisekunden je Takt, Größe und Zeit
   eines Snapshots.

### 7.2 Kriterien (vorher festgelegt)

| Nr. | Kriterium | Gemessen | Florians Auge |
|---|---|---|---|
| K1 | **Halten:** Finger ruht, Ozzy läuft dagegen, „Griff“ größer als Ozzys Antriebsmoment | Rad dreht in 5 s weniger als 0,5° | steht wie Boden |
| K2 | **Rückwirkung:** ohne Finger und ohne Lagerreibung tapst Ozzy oben auf der Stelle | Drehimpulsbilanz um die Achse (Rad plus Ozzy, minus aufsummiertes Schwerkraftmoment) bleibt innerhalb von 2 % | leicht, mittel, schwer sind deutlich verschieden |
| K3 | **Loslassen:** Rad mit Schwung, Finger weg | Auslaufzeit trifft den Regler „Nachlauf“ auf ±10 % | läuft natürlich aus |
| K4 | **Hinsetzen am Hang:** 10° neben dem Scheitel, Rad dreht langsam | Po setzt auf, wenn die Zeichnung es zeigt; kein Schweben oder Einsinken über 1 Bildpunkt; Zittern unter 0,5 Bildpunkten; Kriechen unter 1 Bildpunkt je 10 s; V1 und V2 nebeneinander | weich, ohne Hüpfer |
| K5 | **Popo-Rutschen:** bei 25° | kein Hängenbleiben an Hügeln und Nähten der Kette | rutscht glatt |
| K6 | **Sturz:** zu schnell auf dem drehenden Rad | kein Durchfallen, Ruhe ohne Zittern innerhalb von 3 s | fällt komisch, nicht explosiv |
| K7 | **Spulen:** 20 s spielen, auf 7,3 s zurück, weiterspielen | Prüfsumme je Takt gleich; nach 1200 Takten gleich auf Mac (Safari, Chrome) und iPhone 16 (Safari, App-WebView) | – |
| K8 | **Tempo** auf dem iPhone 16 | Welt plus Figur im Mittel unter 1 ms je Takt, 95 % unter 2 ms; Snapshot unter 0,3 ms | – |
| K9 | **Treue** | größte Abweichung Zeichnung zu Kette unter 0,5 Bildpunkten; Kontaktpunkte auf der gezeichneten Linie | was man sieht, ist, woran er stößt |

„Bestanden“ sagt nur Florian (Arbeitsregel 4). Die Zahlen helfen, sein Urteil zu begründen, sie ersetzen es nicht.

### 7.3 Abbruch und Umstieg

Wie in Abschnitt 5 festgelegt. Zusätzlich: Besteht K4 nur in V1, ist das kein Fehler, sondern die Bestätigung des Gelenkwegs.
Besteht K7 auf einem Gerät, aber nicht über Geräte hinweg, blockiert das den Editor nicht; es wird zur Frage, ob Aufnahmen
geteilt werden sollen. Hält die Probe nach sechs Arbeitstagen nicht, wird angehalten und berichtet (Arbeitsregel 2).

### 7.4 Aufwand (eigene Schätzung)

| Teil | Tage |
|---|---|
| Adapter, Einbindung in Vite, Grundgerüst mit Takt und Anzeige | 1 |
| Rad, Finger, Masse, Lagerreibung | 0,5 |
| Ozzy-Körper, Federbeine am Rad, Kräftepaar, Antriebsgesetz | 1 |
| Hinsetzen V1 und V2, Popo-Rutschen | 0,5 bis 1 |
| Ragdoll | 0,5 |
| Schlüsselstände, Prüfsummen, Spulen | 0,5 bis 1 |
| Lauf auf dem iPhone 16 und am Mac, Aufnahme für Florian | 0,5 |
| **Summe** | **4,5 bis 6** |

Florian bekommt eine kurze Bildschirmaufnahme vom iPhone: drei Radgewichte, Hinsetzen am Hang (V1 und V2 nebeneinander),
Popo-Rutschen, ein Sturz, Zurückspulen.

---

## 8. Empfehlungen

1. **Weg B freigeben, aber erst nach Probe P1.** Box2D 3.2 rechnet die Welt, die eigene XPBD-Schicht die Figur, ein Takt.
2. **Das Rad dynamisch bauen:** Scharnier, Motor als Lagerreibung, Trägheit aus dem Regler Radgewicht, kinematisch nur als
   äußerster Reglerwert.
3. **Den Finger wie das Handbuch:** kinematischer Fingerkörper, Motor-Gelenk mit Linearfeder und Höchstkraft; Halten, Ziehen,
   Loslassen sind drei Zustände desselben Gelenks.
4. **Ozzys Vortrieb als Kräftepaar** mit der Grenze min(Bremskraft, Haftung × Normalkraft); Pogo-Federn am Rad; das Mover-Gelenk
   nicht verwenden.
5. **Haltungen über Gelenkziele zwischen festen Teilen** (Brust, Becken, Kopf); Formen nur an Zustandsgrenzen tauschen; nie eine
   Box2D-Hülle je Takt umformen.
6. **Eine Quelle, drei Ableitungen** für Welt und Dinge; Verschmelz-Rundungen beim Bearbeiten in die Kette backen; Fühler und
   Fußnormalen aus dem TypeScript-Feld, nicht aus der Kette.
7. **Ozzys Teile, Ball und schnelle Dinge als Bullets;** Kontakt-Recycling für Ozzys Körper klein stellen oder abschalten.
8. **Zurückspulen mit gemeinsamen Schlüsselständen** und dreiteiliger Prüfsumme; Ragdoll vorab anlegen und schalten; Nutzerdaten
   von Box2D nicht verwenden; Snapshots nie als Datei aufbewahren; Dauerhaftes als Ausgangslage plus Protokoll.
9. **Zeitlupe nur über das Takt-Tempo.** Die Taktlänge bleibt immer 1/60 s.
10. **Simulationspfad und Anzeigepfad trennen:** Was in die Physik fließt (Ziele, Hüllen, Entscheidungen), läuft über eigene
    Näherungen für Winkelfunktionen und einen Zufall mit Saat, sobald Aufnahmen über Geräte hinweg gleich sein müssen. Die
    Anzeige darf `Math` behalten.
11. **Kein Flüssigkeitslöser:** Pfütze als Zone plus Höhenfeld, Spritzer als Teilchen gegen das Feld, verschmolzen im Renderer.
12. **Rapier als vorbereiteter Rückfall** für morphende Hüllen und Ragdolls; B′ als Rückfall für die Kette; A nur, wenn beide
    scheitern.
13. **Bericht 08 (8.1, 9.5) und 13 (10.4) beim nächsten Überarbeiten anpassen:** Abstandsfeld für Fühler, Teilchen und Anzeige;
    Kontakte der Welt in Box2D. Bericht 09 um die fünf Änderungen ergänzen.

---

## 9. Offene Fragen

1. **Florian:** Wie stark soll Ozzy das Rad mitdrehen (Radgewicht leicht, mittel, schwer), und soll es in jeder Welt anders sein
   (13 schlägt mittel im Garten und leicht im Baumstamm-Duell vor)?
2. **Florian:** Müssen Aufnahmen auf anderen Geräten genau gleich ablaufen (geteilte Rückblicke, Fehlerberichte, Geister)? Davon
   hängt ab, ob der Simulationspfad eigene Winkelfunktionen braucht.
3. **Florian:** Darf Ozzys Fläche an Kontaktstellen leicht abflachen, damit sie nie sichtbar einsinkt oder schwebt?
4. Warum empfiehlt Box2D Ketten nur auf statischen Körpern? Trägt die Kette auf dem drehenden Rad mit Bullets, oder braucht es B′?
   (Probe, K5 und K6.)
5. Wie groß ist ein Box2D-Snapshot unserer Szene, und wie lange dauert er im WebAssembly auf dem iPhone? (Probe, K8.)
6. Wie viele Aufrufe über die WebAssembly-Grenze braucht ein Takt, und was kosten sie in Safari? Keine veröffentlichte Zahl
   gefunden. (Probe.)
7. Reicht der Gelenkweg (V1) für alle Haltungen, auch für Liegen und Aufstehen je Lage (08), oder braucht es Hüllentausch an
   mehr Stellen?
8. Wird das Snapshot-Format in Box2D 3.3 stabil, und zieht `box2d3-wasm` rechtzeitig nach? Lohnt eine eigene schlanke Bindung aus
   der JSON-Beschreibung der API (09)?
9. Brauchen spätere Welten echtes Wasser, das Dinge trägt oder schiebt (Boot, Floß)? Dann PBF oder FLIP in TypeScript gegen
   Rapier-Weichkörper abwägen.

---

## Quellen

**Box2D (Quelltext, Stand `main` im November 2026)**
- shape.c (`b2ResetProxy`, Form-Setter, Reibung): https://github.com/erincatto/box2d/blob/main/src/shape.c
- contact.c (Kontaktende beim Zerstören, Reibung neu gemischt): https://github.com/erincatto/box2d/blob/main/src/contact.c
- contact_solver.c (Anker, weiche Überlappung, Reibung, Rollwiderstand): https://github.com/erincatto/box2d/blob/main/src/contact_solver.c
- motor_joint.c (Federn mit Höchstkraft, Tempoziele): https://github.com/erincatto/box2d/blob/main/src/motor_joint.c
- mover_joint.c (nur Lineartempi, kein Drehmoment): https://github.com/erincatto/box2d/blob/main/src/mover_joint.c
- pogo_joint.c (Hebelarme, Oberflächentempo, Grenzen): https://github.com/erincatto/box2d/blob/main/src/pogo_joint.c
- snapshot.c (Inhalt des Snapshots): https://github.com/erincatto/box2d/blob/main/src/snapshot.c
- physics_world.c (Kontaktsteifigkeit aus der Unterschritt-Rate): https://github.com/erincatto/box2d/blob/main/src/physics_world.c
- types.c (Standardwerte): https://github.com/erincatto/box2d/blob/main/src/types.c
- constants.h (Schlupf, spekulativer Abstand, Recycling): https://github.com/erincatto/box2d/blob/main/include/box2d/constants.h
- box2d.h (Snapshot-Schnittstelle, Prüfsumme, Hinweise zu Form-Settern): https://github.com/erincatto/box2d/blob/main/include/box2d/box2d.h
- types.h (Ketten, Scharnier mit Zielwinkel, Motor-Gelenk): https://github.com/erincatto/box2d/blob/main/include/box2d/types.h

**Box2D (Dokumentation und Blog)**
- Simulation (Handbuch): https://box2d.org/documentation/md_simulation.html
- Charakter-Mover: https://box2d.org/documentation/md_character.html
- FAQ: https://box2d.org/documentation/md_faq.html
- Release Notes 3.2: https://box2d.org/documentation/md_release__notes__v320.html
- Box2D 3.2: https://box2d.org/posts/2026/10/box2d-3.2/
- Replay: https://box2d.org/posts/2026/06/replay/
- Contact Recycling: https://box2d.org/posts/2026/10/contact-recycling/
- Determinism (2024): https://box2d.org/posts/2024/08/determinism/
- Solver2D (2024): https://box2d.org/posts/2024/02/solver2d/

**Web-Bindung**
- box2d3-wasm README: https://github.com/Birch-san/box2d3-wasm/blob/main/box2d3-wasm/README.md
- TypeScript-Typen 6.0.0: https://cdn.jsdelivr.net/npm/box2d3-wasm@6.0.0/build/dist/es/compat/Box2D.compat.d.ts
- npm-Registry (Versionen, gelesen am 20.11.2026): https://registry.npmjs.org/box2d3-wasm

**XPBD und Löser-Erfahrungen**
- Müller u. a. 2020, Detailed Rigid Body Simulation with XPBD: https://matthias-research.github.io/pages/publications/PBDBodies.pdf
- Veröffentlichungen (XPBD, Small Steps, Position Based Fluids): https://matthias-research.github.io/pages/publications/publications.html
- Ten Minute Physics: https://matthias-research.github.io/pages/tenMinutePhysics/index.html
- Avian 0.1 (Wechsel der Kontakte zu Soft Step): https://joonaa.dev/blog/06/avian-0-1
- Avian Releases (bis 0.8.0, `xpbd_joints`): https://github.com/avianphysics/avian/releases
- Avian 2D, Standard-Schalter `xpbd_joints`: https://github.com/avianphysics/avian/blob/main/crates/avian2d/Cargo.toml
- Avian, Plan zum Abschied von XPBD: https://github.com/Jondolf/avian/issues/346
- Seabra u. a. 2023, Survey of Rigid Body Simulation with XPBD: https://arxiv.org/abs/2311.09327

**Abstandsfelder**
- Macklin u. a. 2020, Local Optimization for Robust Signed Distance Field Collision: https://di.ku.dk/english/research/groups/simulation/research-results/local-optimization-for-robust-signed-distance-field-collision/
- PhysX 5.3.1, Rigid Body Collision (SDF): https://nvidia-omniverse.github.io/PhysX/physx/5.3.1/docs/RigidBodyCollision.html

**Rapier**
- pair_update.rs (Formänderung behält das Paar): https://github.com/dimforge/rapier/blob/master/src/geometry/narrow_phase/pair_update.rs

**Drehendes Bezugssystem und Kopplung**
- Scheinkraft: https://en.wikipedia.org/wiki/Fictitious_force
- Fictitious Forces, Devlog: https://mattflat.itch.io/ff/devlog/321710/collision-and-rotating-objects-in-unity-faking-it
- Gomes u. a. 2017, Co-simulation: State of the art: https://arxiv.org/abs/1702.00686

**Plattform**
- WebKit, rAF im Stromsparmodus: https://bugs.webkit.org/show_bug.cgi?id=215745
- MDN, Genauigkeit von `Math`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math

**Wasser und lose Dinge**
- Dynamic 2D Water Effects: https://code.tutsplus.com/make-a-splash-with-dynamic-2d-water-effects--gamedev-236t
- GDevelop Dynamic Water: https://wiki.gdevelop.io/gdevelop5/extensions/dynamic-water/
- LiquidFun (archiviert): https://github.com/google/liquidfun

**Im Repo**
- Berichte 08, 09, 10, 11, 13 dieses Ordners
- `apps/editor/src/ozzy-figur/` (`steuerung.ts` Teilschritte 1/240 s; `raster.ts`, `haltung.ts`, `form.ts` mit `Math`-Winkelfunktionen)
