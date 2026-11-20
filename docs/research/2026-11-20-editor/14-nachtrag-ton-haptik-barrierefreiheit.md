# Nachtrag 4: Ton, Haptik und Barrierefreiheit

Recherche vom 20.11.2026 · Bericht 14 der Editor-Recherche („Studio“) · Nachtrag zu den Berichten 01, 02, 05, 09, 11, 12 und 13
dieses Ordners. Grundlage: Handbücher und Referenzen (Apple, WebKit, W3C, WHATWG, MDN, Capacitor, FMOD, Unity, Unreal, Spine, Rive,
Construct, Box2D), WebKit-Fehlerberichte, Richtlinien zur Barrierefreiheit (Apple, Xbox Accessibility Guidelines, Game Accessibility
Guidelines, WCAG, App-Store-Kriterien), ein Konferenzbeitrag und Artikel zur Musik von Untitled Goose Game, Lizenztexte von
Klangbibliotheken, dazu der Ton- und Haptik-Bestand von Prototyp 1 im Repo (`apps/game/src/audio/`, `apps/game/src/native/haptics.ts`,
`docs/IOS.md` Abschnitt 8) und der Quelltext der eingebauten Capacitor-Pakete (`apps/game/node_modules/@capacitor/…`).

**Hinweis zur Quellenlage:** Diesmal stand die Websuche zur Verfügung. Einige Seiten liefern ihren Text nur über Skripte. Beim
FMOD-Handbuch habe ich deshalb den Spiegel der Fassung 2.02 auf dem Auslieferungsserver des Herstellers gelesen, bei Apple die
JSON-Daten derselben Seiten. Aussagen zu Wwise stammen aus dem Herstellerblog und aus Community-Antworten, nicht aus dem
Referenzhandbuch. Gemessen habe ich nichts. Alle Zahlen für Ozzy sind Startwerte zum Prüfen. Was nur aus eigener Kenntnis stammt, ist
mit „(eigene Kenntnis)“ markiert.

---

## Kurzfassung

1. **Klang hängt an seiner Ursache, nicht an einer Tonspur.** Die besten Werkzeuge kennen vier Arten von Auslösern: eine Marke in der
   Zeit (Spine-Ereignisse, Unreal-Notifies, Rive-Audio-Ereignisse), einen Zustand oder Übergang (Rive), einen Kontakt mit
   Aufprallstärke (Box2D-Treffer-Ereignisse) und einen stetigen Wert (FMOD-Parameter, Wwise-RTPC). In Studio braucht das kein neues
   System. Es reicht ein weiterer **Chip**: Der Klang-Chip hängt an einer Marke, einer Pose, einem Fühler, einem Regler oder einer
   Regel und zeigt wie jeder Chip zuerst zwei Regler (Lautstärke und Tonhöhe).
2. **„Tonhöhe nach Tempo“ und „laut nach Aufprall“ sind Drähte.** FMODs Parameter mit Automationskurve und Wwises RTPC machen genau
   das, was Bericht 12 als Draht mit Kennlinie vorschlägt: ein Spielwert treibt einen Regler über eine gezeichnete Kurve. Für den
   Klang kommt keine neue Bedienung hinzu.
3. **Varianten: wenige Aufnahmen plus Streuung.** Mischen ohne Wiederholung ist der Standard in FMOD und Unity, dazu „nicht die
   letzten N“. Apple rät, Tonhöhe und Lautstärke beim Abspielen leicht zu streuen, statt viele Dateien zu bauen. Dazu gehören ein
   Mindestabstand je Klang und eine Höchstzahl gleichzeitiger Stimmen mit Regel, welche Stimme weichen muss (FMOD).
4. **Musik sind Karten und Wege, wie Posen.** Ein Musikstück ist eine Karte, ein Wechsel ist ein Weg mit einer Wechselstelle
   (sofort, nächster Schlag, nächster Takt, Phrasenende) und auf Wunsch einem eigenen Übergangsstück (in FMOD eine
   „Transition Timeline“). Untitled Goose Game zerlegt sechs Debussy-Préludes in zwei Fassungen (leise und normal) in Phrasen und
   Stems mit Hallfahnen; das Spiel kennt drei Zustände (Stille, leise, aktiv) und reagiert nach dem Konferenzbeitrag des Komponisten
   innerhalb weniger Sekunden.
5. **Für Ozzy:** Die Gangart blendet Schichten ein (über einen Schlag), Welt und Stimmung wählen Stücke (am Taktstrich), der Plumps
   lässt die Musik **sofort** stocken (Bandstopp, dann Stille), und Ozzys erster Schritt bringt sie auf dem Schlag zurück. Stille
   beim Stehen gehört zur Musik, wie bei der Gans. Die Gans darf sich Sekunden Zeit lassen, der Plumps-Gag nicht.
6. **Safari gibt den Ton erst nach einer Berührung frei, und zwar beim Loslassen.** Nach der HTML-Norm zählt ein Fingerdruck erst als
   Freigabe beim `pointerup` oder `touchend`, nicht beim Aufsetzen. Der erste Griff ans Rad bliebe also bis zum Loslassen stumm. In
   der Capacitor-App braucht es keine Geste (Capacitor 8.5.2 setzt `mediaTypesRequiringUserActionForPlayback = []`), aber
   WebKit-Fehler lassen den Kontext „running“ melden und trotzdem schweigen. Ein Wachhund muss prüfen, ob die Audio-Uhr wirklich läuft.
7. **Stummschaltung:** Web Audio läuft in Safari standardmäßig wie die iOS-Kategorie „ambient“ und schweigt bei Stumm.
   `navigator.audioSession.type = "playback"` hält den Ton nach Auskunft eines WebKit-Entwicklers ab iOS 17, hält dabei aber die Musik
   anderer Apps an. Apple erwartet, dass Spielgeräusche und Spielmusik bei Stumm schweigen; Prototyp 1 folgt dem nach Florians
   Entscheidung vom 30.09. Den Stumm-Zustand kann weder eine Webseite noch eine App lesen. **Folge: Jeder Gag, der über Ton läuft,
   braucht eine sichtbare Entsprechung, für alle Spieler, nicht nur für Hörgeschädigte.**
8. **Haptik gibt es nur in der App.** Safari hat keine Vibrations-Schnittstelle; der bekannte Trick mit dem Schalter-Element reagiert
   nur noch auf echte Tipps. In der App kennt `@capacitor/haptics` nur drei feste Stoßstärken, ruft `prepare()` nicht auf und baut
   für jede Vibration einen neuen Haptik-Motor. Für „Stoß nach Fallhöhe“ und ein Rumpeln, das dem Tempo folgt, braucht es eine kleine
   eigene Erweiterung mit Core Haptics (fester Motor, Stärke und Schärfe, Werte live nachführen).
9. **Latenz und Speicher:** WebKit kennt keinen `latencyHint`; `outputLatency` ist erst seit Safari 18.4 lesbar. Bluetooth-Kopfhörer
   bringen 126 bis 274 ms (Messungen an AirPods). Entpackter Ton kostet rund 23 MB je Minute Stereo, und paralleles Entpacken kann
   den Prozess auf iOS beenden. Also: Effekte als kurze Puffer, Musik in Phrasen, immer nur die laufende und die nächste Phrase
   entpackt, Entpacken nacheinander.
10. **Formate:** AAC in `.m4a` ist in Safari und in Chrome am Mac sicher. Ogg mit Opus oder Vorbis kann Safari erst seit 18.4. MP3
    eignet sich nicht für Schleifen, weil Safari bei manchen Dateien zusätzliche Leer-Frames liefert.
11. **Barrierefreiheit, Kern:** Nichts Wesentliches darf nur über Ton laufen (Apple, Xbox-Richtlinie 103, Game Accessibility
    Guidelines). Für „hinter dem Bildrand“ heißt das: **Klang, Rand-Bild und Stoß als Dreiklang.** Die Rand-Bilder gehören zum
    Cartoon-Stil (etwas fliegt zurück ins Bild, eine Staubwolke ragt über den Rand, Bewegungslinien am Rand); gezeichnete Lautmalerei
    („PLATSCH“) kommt als Schalter „Geräusche zeigen“ dazu, in der App automatisch an, wenn die iOS-Untertitel an sind.
12. **Bewegung reduzieren:** dem Systemschalter folgen und einen eigenen Schalter anbieten. Kamera-Wackeln aus (Ersatz: kurzer
    Stillstand), Line Boil aus, Aufziehen der Kamera als Überblendung, kreisende Sterne ruhig, Pannen-Rückblick als Standbilder. Die
    Zeitlupe bleibt, aber ohne Zoom. Das Rad, das dem Finger folgt, bleibt: Bewegung, die direkt der Geste folgt, empfiehlt Apple
    ausdrücklich.
13. **Steuerung:** Ziehen überall (eine Hand), zwei Daumen, ein Ein-Tasten-Modus mit Tempo-Hilfe, Halten auch als Umschalter,
    einstellbares Spieltempo, Tastatur und Controller. Die Feder mit Kraftgrenze aus Bericht 13 filtert Zittern bereits.
14. **Haptik als Ersatz** für Ton: ein festes Muster je Ursache, Stärke nach Fallhöhe, ein Rhythmus für Gags hinter dem Rand, der
    Bandstopp der Musik als fallende Kurve; abschaltbar und in der Stärke einstellbar (Xbox-Richtlinie 110). The Last of Us Part I
    spielt Dialoge als Vibration ab; das Studio nennt es im Test sehr erfolgreich.
15. **Baustein:** Im Paketplan aus Bericht 11, §12.1, fehlt ein Ton-Paket. Vorschlag: `packages/studio-ton` mit einer Planung ohne
    DOM (aus Ereignissen wird deterministisch ein Klang-Auftrag) und einer Ausgabe über Web Audio; der native Teil ist eine kleine
    Swift-Erweiterung für Sitzung, Haptik, Systemschalter und Unterbrechungen. Prototyp 1 bringt das meiste schon mit: Mischpult mit
    Gruppen, Stimmen-Pools mit Verdrängen, Vorausplaner, Freischalten mit Wachhund, Offline-Rendern für Tests.
16. **Klangquellen:** Für die Demo eigene Aufnahmen (Geräusche, Stimme) und lizenzfreie Bibliotheken mit klaren Bedingungen (Kenney
    CC0, Sonniss, Freesound nur CC0 und CC BY, Pixabay). BBC-Klänge nur nichtkommerziell. KI-Generatoren nur mit bezahltem Plan und
    mit Vorsicht. Musik im Auftrag (Rechte und GEMA vorher klären) oder eine gemeinfreie Komposition, selbst eingespielt.

---

## 1. Auftrag, Rahmen und Bestand

### 1.1 Warum dieser Nachtrag

Bericht 13 baut die Komik ausdrücklich auf Ton: Witz-Regel 8 („Hinter dem Bildrand ist alles Ton“), Witz-Regel 9 („Musik spielt mit.
Sie stockt beim Plumps“), Rumpeln mit der Tonhöhe nach Tempo, Ton und Haptik in der Teileliste. Die Berichte 01, 02, 05 und 09 nennen
Ton nur als Ziel von Ereignissen. Im Paketplan aus Bericht 11 (§12.1) fehlt ein Ton-Baustein ganz. Barrierefreiheit behandelt kein
Bericht; Bericht 13 verlangt nur, dass das Spiel ohne Haptik verständlich ist.

Dieser Bericht beantwortet vier Fragen:

1. Wie legt man Klang im Editor mit derselben Grammatik an wie alles andere (Bericht 12)?
2. Wie verhält sich Ton auf dem iPhone in Safari und in der WKWebView von Capacitor?
3. Woher kommen die Klänge, und was darf man mit ihnen tun?
4. Was verlangt Barrierefreiheit im Spiel, und was ändert das am Entwurf?

### 1.2 Was die Nachbarberichte schon festhalten (nicht wiederholt)

- **Bericht 01:** Spine-Ereignisse mit Tonpfad, Lautstärke und Balance; die Laufzeit spielt keinen Ton ab. Beim Überblenden feuern
  Ereignisse der ausgehenden Animation standardmäßig nicht mehr (Schwelle `eventThreshold`).
- **Bericht 02:** Rive-Ereignisse können Töne abspielen; „Tapsen und Stolpern als Audio-Ereignisse“.
- **Bericht 05:** Auslöser starten Wege, Ereignisse im Weg melden ans Spiel zurück („Pfote setzt auf“ → Geräusch).
- **Bericht 09:** Box2D liefert Kontakt- und Treffer-Ereignisse mit Aufprallstärke und Sensoren als Zonen.
- **Bericht 11:** Laufzeit ohne DOM und deterministisch, fester Takt, kein `SharedArrayBuffer`, Capacitor für die App.
- **Bericht 12:** die Grammatik (Tippen, Ziehen, Halten, Doppeltippen), Chips mit zwei Reglern, Drähte mit Kennlinie, Regeln als
  Sätze, vier Linsen, der Prüfer.
- **Bericht 13:** Saft-Tabelle je Ereignis (Bild, Ton, Haptik), zehn Witz-Regeln, Steuerung (Ziehen überall, zwei Daumen, Neigen),
  Haptik nur in der App-Hülle, offene Frage 11 („Ton und Musik schon in der Demo?“).

### 1.3 Was im Repo schon da ist (Prototyp 1)

Prototyp 1 hat eine ausgewachsene Ton-Maschine, alle Klänge prozedural erzeugt (`apps/game/src/audio/`, rund 8 000 Zeilen mit Tests):

- **Freischalten:** Der Audio-Kontext entsteht im Browser in der ersten Geste; in der App startet er sofort, weil Capacitor keine
  Geste verlangt. Ein **Wachhund** hängt die Tipp-Freischaltung wieder ein, wenn ein `resume()` nach 400 ms noch hängt; WebKit lehnt
  ein solches `resume()` nie ab, es bleibt einfach offen (`engine.ts`).
- **Sitzung:** bewusst „ambient“, im `AppDelegate` (`setCategory(.ambient, options: [.mixWithOthers])`) und zusätzlich über
  `navigator.audioSession.type = 'ambient'`.
- **Mischpult** (`graph.ts`): Stimmen → Kanalzug (Lautstärke, Panorama, Hall-Anteil) → Gruppe (Geräusche, Musik, Ambiente, Stimme) →
  Summe → Höhenregler → Begrenzer → Ausgang. Stimmen kommen aus festen Pools je Gruppe (Geräusche 22, Ambiente 8, Stimme 3). Ist ein
  Pool voll, weicht die älteste Stimme mit der niedrigsten Wichtigkeit mit 12 ms Ausblenden. Derselbe Graph läuft für das Offline-Rendern
  in Tests.
- **Vorausplaner:** ein 25-ms-Takt, der nur läuft, wenn etwas ansteht, plant 100 ms voraus; Musik und Ambiente werden alle halbe
  Sekunde nachgefüttert; nichts läuft je Bild.
- **Musik** (`music.ts`): generativ und deterministisch, pentatonische Phrasen je Zone.
- **Einstellungen** (`settings.ts`): Stumm und getrennte Lautstärken je Gruppe, gespeichert.
- **Haptik** (`native/haptics.ts`): leichter Stoß beim Ende des Rutschens, mittlerer beim Verschmelzen, Meldungen bei Sieg und
  Niederlage; außerhalb der App ohne Wirkung.
- **Erfahrungen** (`docs/IOS.md`, Abschnitt 8): „Stumm = still“ nach Florians Entscheidung vom 30.09.; Bluetooth-Kopfhörer bringen
  etwa 150 bis 250 ms Verzögerung; der erste Klang nach dem Start kann etwa 0,1 s später kommen; im Spiel gibt es keinen Hinweis auf
  Stumm.

Für Studio heißt das: Die Technik für Freischalten, Mischen, Stimmen und Tests ist erprobt und lässt sich in ein neues Paket übernehmen.
Neu sind das Datenmodell (Klänge an Ursachen), die Musik in Stücken und die Bedienung im Editor.

---

## 2. Was die besten Programme und Verfahren tun

### 2.1 Klang an Marken in der Zeit

- **Spine** ([Ereignisse](https://esotericsoftware.com/spine-events)): Ein Ereignis wird zum Ton-Ereignis, sobald es einen Tonpfad hat;
  man tippt ihn ein oder zieht eine Datei auf das Ereignis. Lautstärke und Balance erscheinen dann und sind schlüsselbar. Spine sucht
  die Datei im Audio-Ordner (WAV, MP3, OGG), beobachtet den Ordner und lädt Änderungen sofort. Der Editor spielt den Klang, wenn die
  Wiedergabe den Schlüssel erreicht; der Videoexport nimmt den Ton mit. Die Laufzeiten spielen keinen Ton; das Spiel hört auf das
  Ereignis.
  - Stärke: einfach, an der Stelle, an der es passiert.
  - Schwäche: keine Varianten, keine Streuung, keine Stimmenbegrenzung; alles Weitere ist Spielcode.
- **Unreal Engine** ([Animation Notifies](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine)):
  Das Notify „Play Sound“ spielt einen Klang an einem Bild der Animation, mit Faktoren für Lautstärke und Tonhöhe. „Follow“ und ein
  Knochen- oder Socket-Name lassen den Klang mit der Figur wandern. Jedes Notify hat eine **Auslöse-Wahrscheinlichkeit** (0 bis 1) und
  eine **Gewichtsschwelle**: In einer Mischung feuert es nur, wenn seine Animation genug Gewicht hat (Standard 0,00001, je Schlüssel
  änderbar). „Notify States“ haben Anfang, Takt und Ende, etwa für eine Schleife solange ein Zustand gilt.
  - Stärke: Wahrscheinlichkeit und Gewichtsschwelle lösen zwei häufige Probleme (Eintönigkeit, doppeltes Feuern beim Überblenden).
  - Schwäche: Die Reihenfolge mehrerer Notifies am selben Bild ist laut Handbuch nicht garantiert.
- **Rive** ([Audio-Ereignisse](https://rive.app/docs/editor/events/audio-events), [Audio-Assets](https://rive.app/docs/editor/assets/audio)):
  Ein Audio-Ereignis entsteht, wenn man eine Datei auf die Bühne zieht. Es feuert an einem genauen Bild der Zeitleiste, an einem
  Zustand oder Übergang des Zustandsautomaten oder durch einen Zuhörer (etwa einen Klick auf eine Form). Mehrere Klänge dürfen sich
  überlagern. Eine Pegelanzeige im Inspektor zeigt Übersteuerung. Lautstärke gehört zum Asset, gilt also überall, wo es benutzt wird.
  Import und Export kennen MP3, WAV und FLAC.
  - Schwäche: Audio-Ereignisse sind laut Rive nur für kurze Klänge gedacht; Lautstärke und Panorama lassen sich während des Spielens
    nicht ändern. Musik und längerer Ton brauchen Skripte.

### 2.2 Varianten, Streuung und Begrenzung

- **Unity, Audio Random Container**
  ([Referenz](https://docs.unity.com/en-us/engine/6000.5/manual/audio/random-container/ui)): eine Liste von Clips mit Zufall für
  Lautstärke und Tonhöhe (Minimum und Maximum, Tonhöhe in Cent), Wiedergabe der Reihe nach, gemischt (ein gespielter Clip fällt aus
  dem Topf, bis alle dran waren) oder zufällig, dazu „Avoid Repeating Last“ (wie viele andere zuerst kommen müssen). Ein automatischer
  Auslöser spielt in festem Puls oder mit Pause nach dem Ende. Gedacht für Schritte, Treffer, Waffen und Requisiten.
- **FMOD Studio** ([Instrumente](https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/working-with-instruments.html),
  [Begrenzung](https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/advanced-topics.html)):
  - Das **Multi-Instrument** ist eine Wiedergabeliste; Standard ist „Shuffle“, laut Handbuch in den meisten Fällen die richtige Wahl.
  - Das **Scatterer-Instrument** streut Instanzen in einem Zeitfenster, mit Zufall für Lautstärke, Tonhöhe und Abstand
    (Panorama), auf Wunsch auf Schläge oder Takte gerastert.
  - **Auslöse-Wahrscheinlichkeit** und **Verzögerung** (fest, zufällig oder auf Takt gerastert) je Instrument.
  - **Begrenzung je Ereignis und je Gruppe:** Ist die Höchstzahl erreicht, weicht die älteste, die leiseste oder die fernste Instanz,
    oder die neue startet nicht; Ereignisse können stattdessen „virtuell“ weiterlaufen (stumm, Position läuft weiter) und wieder hörbar
    werden.
- **Apple** ([Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)): Wiederholte Klänge wirken
  natürlicher, wenn Tonhöhe und Lautstärke beim Abspielen leicht zufällig schwanken; Apples eigene Tastaturklänge in visionOS machen
  es so. Das sei effizienter, als viele Dateien zu bauen.

### 2.3 Stetige Werte treiben Klang

- **FMOD-Parameter** ([Parameter](https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/parameters.html)): stetig, ganzzahlig oder als
  Liste von Namen; lokal je Instanz oder global. Auf einem **Parameter-Blatt** liegen Instrumente in Bereichen des Parameters und
  werden ausgelöst, wenn der Wert darüberläuft. **Automation** macht fast jede Eigenschaft (Lautstärke, Tonhöhe, Filter) zu einer Kurve
  über dem Parameter. „Seek speed“ lässt einen neuen Wert mit fester Rate anlaufen statt zu springen. Eingebaute Parameter liefern
  Abstand, Richtung und Geschwindigkeit relativ zum Hörer.
- **Wwise-RTPC** (Community-Quellen, etwa [Audiokinetic Q&A](https://www.audiokinetic.com/qa/198/rtpc-tied-to-boys-speed)): ein
  Spielwert am Spielobjekt, eine Kurve bildet ihn auf Lautstärke, Tiefpass oder Tonhöhe ab. Ein Mischcontainer kann je nach Wert
  andere Schleifen spielen.
- **Für uns:** Das ist Studios **Draht mit Kennlinie** (Bericht 12, §6.12). Rad-Tempo → Tonhöhe und Lautstärke des Rumpelns ist ein
  Draht wie Neigung → Ohrstellung.

### 2.4 Klang aus Physik

- **Box2D 3** ([Simulation](https://box2d.org/documentation/md_simulation.html), [Ereignisse](https://box2d.org/documentation/group__events.html)):
  Treffer-Ereignisse gibt es nur für Formen mit `enableHitEvents` (kostet etwas, also nur wo nötig). Gemeldet werden Stöße, deren
  Annäherungsgeschwindigkeit eine Schwelle der Welt übersteigt (`hitEventThreshold`, laut Bindungen Standard 1 m/s), mit Punkt,
  Normale und `approachSpeed`. Das Handbuch nennt Treffer-Ereignisse ausdrücklich als den Weg für Klänge und Partikel bei Stößen mit
  nennenswerter Geschwindigkeit. Achtung: Ein Treffer kann aus einem vorausschauenden Kontakt stammen, die Formen berühren sich dann
  noch nicht ganz.
- **Material-Tabellen** ([Designing Sound über Star Wars: The Force Unleashed](https://designingsound.org/2010/04/14/audio-implementation-greats-7-physics-audio-part-2/)):
  Eine Tabelle paart Material 1 (was trifft) mit Material 2 (was getroffen wird); drei Schichten spielen zusammen (Quelle, Ziel,
  Paar). Je Material gibt es drei Fächer nach Größe und Gewicht (klein, mittel, groß). Aus über 300 Simulationsmaterialien wurden rund
  30 Klangmaterialien.
- **Praxis aus Foren** (zusammengefasst): Schwelle gegen Dauerklackern beim Ruhen, Mindestabstand je Quelle, Begrenzung gleichzeitiger
  Stoßklänge; Rollen und Schleifen als eigene Schleife, deren Lautstärke der Gleit- oder Drehgeschwindigkeit folgt, statt Stöße zu
  zählen.

### 2.5 Ereignis-Karten mit Ton: Construct

[Construct 3](https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/audio) ist das beste Vorbild für
Nicht-Programmierer, weil Ton dort nur Aktionen in Ereignis-Karten sind:

- Klänge tragen **Tags**; Lautstärke, Wiedergaberate, Panorama, Pause und Effekte (Filter, Hall, Kompressor) gelten je Tag.
- „Abspielen an Objekt“ positioniert den Klang mit; „Schedule next play“ startet den nächsten Klang sample-genau auf der Audio-Uhr.
- Bedingungen: „läuft Tag?“, „beendet“, „Ausblenden beendet“ und „ist stumm“. Letztere meint den Stumm-Schalter des Spiels selbst,
  nicht den des Geräts.
- **Zwei Ordner:** „Sounds“ werden vor dem Abspielen ganz geladen und entpackt, „Music“ wird gestreamt (weniger Speicher bei langen
  Stücken).
- Vor der ersten Berührung stellt Construct Klänge in eine Warteschlange und spielt sie bei der nächsten Berührung; der Hersteller
  rät zu einer „Spielen“-Taste, weil sonst Musik verloren gehen kann.
- Als einziges überall abspielbares Format nennt Construct WebM mit Opus und liefert für Safari einen eigenen Dekoder in WebAssembly
  mit ([Blog](https://construct.net/en/blogs/construct-official-blog-1/opus-audio-construct-891)). Das kostet Speicher und zeigt, wie
  unzuverlässig Opus in Safari lange war.

### 2.6 Musik, die mitspielt

- **FMOD-Logik-Marken** ([Ereignisse anlegen](https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/authoring-events.html)):
  - Übergangsmarke und Übergangsbereich springen zu einer Zielmarke, einem Zielbereich, einer Schleife oder einem Magnetbereich.
  - **Rasterung** (nur bei Übergangs- und Magnetbereichen): Der Sprung geschieht erst auf dem gewählten Schlag oder Takt.
  - Bedingungen: Parameter in einem Bereich und eine Wahrscheinlichkeit.
  - **Haltepunkte** halten die Wiedergabe, bis das Spiel sie freigibt.
  - **Tempomarken** setzen Tempo und Takt (ohne Marke 120 Schläge je Minute im Viervierteltakt).
  - Jeder Übergang kann eine eigene kleine **Übergangszeitleiste** haben: Die Wiedergabe verlässt das Stück, spielt das
    Übergangsstück und kommt dann am Ziel an.
- **Wwise** (Herstellerblog [Clocker](https://www.audiokinetic.com/en/blog/the-sound-design-of-clocker-part2) und Q&A): Übergänge
  verlassen die Quelle sofort, am nächsten Raster, Takt, Schlag oder an einer Marke; Übergangssegmente und „Stinger“ (kurze Einwürfe,
  die auf den Schlag gelegt werden). Ein Studio wählte „Next Cue“, wo der Übergang auf Spielereingaben reagieren muss.
- **Untitled Goose Game** ([Game Developer](https://gamedeveloper.com/audio/getting-goosey-with-debussy-creating-an-adaptive-score-for-i-untitled-goose-game-i-),
  [Konferenzbeitrag von Dan Golding, DiGRAA 2020](https://digraa.org/wp-content/uploads/2020/01/DiGRAA_2020_paper_47.pdf),
  [FMOD-Interview](https://www.fmod.com/blog/untitled-goose-game-interview) über die Suche zusammengefasst):
  - sechs Préludes von Debussy (1909 bis 1912, gemeinfrei), jede in zwei Fassungen eingespielt, „leise“ und normal;
  - zerlegt in Phrasen und Stems; jeder Stem wurde so exportiert, dass sein Hall ausklingt. Stems sind musikalisch gleich lang, als
    Datei aber verschieden lang, damit sie sich überlappen wie mit gehaltenem Pedal;
  - drei Zustände: Stille (die Gans wandert), leise (sie plant etwas), aktiv (sie wird gejagt);
  - die Logik sitzt im Spielcode, der das passende nächste Stück als FMOD-Ereignis aufruft;
  - laut Golding reagiert die Musik auf das Geschehen höchstens nach wenigen Sekunden; theoretisch gibt es mindestens 10^52
    verschiedene Aufführungen je Stück;
  - Vorbild war nicht andere Spielmusik, sondern die Begleitung von Stummfilmen; Ziel war die Wirkung, nicht das Verfahren. Das
    Stocken, das Spieler als Reaktion lasen, steckt teils schon in Debussys Musik.
- **LocoRoco** (Bericht 13): Mit jeder weiteren Figur kommt eine Stimme hinzu. Das ist **vertikale Schichtung**, das Gegenstück
  zum **horizontalen Wechsel** der Gans.
- **Cartoon-Tradition:** „Mickey Mousing“ heißt Musik, die jede Bewegung mitmacht
  ([Wikipedia](https://en.wikipedia.org/wiki/Mickey_Mousing)); in ernsten Filmen gilt es als plump, im Cartoon und in Jump'n'Runs ist
  es gewollt. Treg Brown baute 1936 bis 1963 die Geräuschbibliothek der Warner-Cartoons
  ([Wikipedia](https://en.wikipedia.org/wiki/Treg_Brown)); Mel Blanc lobte, dass ein unpassender Klang oft lustiger ist als ein
  passender. Das deckt sich mit der Inkongruenz-Theorie aus Bericht 13.

### 2.7 Middleware im Web

- **FMOD** hat eine HTML5-Fassung (WebAssembly, einfädig, laut Doku 2.02 ab Safari 14.1;
  [Plattform HTML5](https://www.fmod.com/docs/2.02/api/platforms-html5.html)). Eine kostenlose Indie-Lizenz gilt unter
  Umsatz- und Budgetgrenzen ([Lizenz](https://fmod.com/licensing), [Rechtliches](https://fmod.com/legal)). Gestaltet wird im
  Desktop-Programm FMOD Studio.
- **Wwise** im Web ist nach Herstellerantworten experimentell und nicht für kommerzielle Spiele gedacht
  ([Q&A](https://www.audiokinetic.com/qa/13928/web-export-with-godot)).
- **Urteil:** Beide sind als Vorbild wertvoll, als Baustein für Studio aber falsch. Florian müsste ein zweites, schweres Programm
  lernen, die Grammatik bräche, und die Laufzeit hinge an einer fremden Lizenz. Was wir brauchen (Varianten, Drähte, Rasterung,
  Begrenzung), ist in Web Audio klein zu bauen; Prototyp 1 beweist es.

### 2.8 Stärken und Schwächen im Überblick

| Werkzeug | Stärke | Schwäche | Was wir übernehmen |
|---|---|---|---|
| Spine | Klang direkt an der Marke, im Editor hörbar | keine Varianten, Laufzeit spielt nichts | Marke mit Klang, Vorhören beim Abspielen |
| Unreal Notifies | Wahrscheinlichkeit, Gewichtsschwelle, Zustand mit Anfang und Ende | Reihenfolge am selben Bild offen | Chance und Schwelle an jeder Marke |
| Rive | Datei auf die Bühne ziehen, Pegelanzeige | nur kurze Klänge, nichts live regelbar | Ziehen zum Anlegen, Pegelanzeige |
| Unity Random Container | klare Varianten-Regeln | nur Variation, keine Logik | „gemischt, nicht die letzten N“, Streuung |
| FMOD | Parameter-Blätter, Rasterung, Übergangsstücke, Begrenzung | eigenes Programm, schwer | Drähte für Klang, Musik-Wege mit Rasterung, Stimmen-Regeln |
| Wwise | RTPC, Musik-Übergänge, Stinger | im Web experimentell | Begriffe und Regeln |
| Construct | Ton als Aktion in Karten, Sounds und Music getrennt | Opus-Weg kostet in Safari Speicher | Karten-Aktionen, Puffer gegen Strom |
| Untitled Goose Game | wenige Aufnahmen, sehr viele Aufführungen, Stille als Teil | Reaktion erst nach Sekunden | Phrasen mit Hallfahnen, drei Zustände, Stille |

---

## 3. Klang in der einen Grammatik von Studio (Vorschlag)

### 3.1 Grundsatz

**Ein Klang hängt an seiner Ursache.** Er hat keine eigene Zeitleiste und keinen eigenen Modus. Wo etwas geschieht, sitzt ein kleiner
Ausgang; ein Klang wird angehängt, indem man ihn aus der Bibliothek (＋) darauf zieht, genau wie ein Verhalten oder einen Effekt
(Bericht 12, §6.2 „Anhängen statt Menüs“).

Es gibt fünf Ursachen. Vier davon sind die Auslöser aus Abschnitt 2, die fünfte ist die Pose als Ort:

| Ursache | Erscheint als | Beispiel bei Ozzy | Vorbild |
|---|---|---|---|
| **Marke** in einem Weg | Tropfen auf der Taktleiste eines Wegs | Fiepen bei 30 % von „Stolpern“ | Spine, Unreal, Rive |
| **Pose** | Tropfen an der Karte: beim Ankommen, beim Verlassen, solange | Plopp beim Ankommen in „Sitzen“, Schnarchen solange „Schlafen“ | Unreal Notify State, Rive-Zustand |
| **Kontakt** an einem Fühler | Chip am Fühler (Pfote, Bauch, Kopf, Ding) | Tapp je Pfote, Plumps des Körpers, Platsch in der Pfütze | Box2D-Treffer, Material-Tabelle |
| **Regler** | Chip am Regler, mit Draht | Rumpeln, Tonhöhe und Lautstärke nach Rad-Tempo; „Uiii“ beim Überschreiten von Kippen 0,8 | FMOD-Parameter, Wwise-RTPC, ProtoPie-Bereich |
| **Regel** | Satz in der Liste (Linse Spiel) | „Wenn Ozzy · fällt über · Bildrand → Klang · Scheppern“ | Construct, GDevelop |

Damit gilt die Tabelle aus Bericht 12, §6.3 unverändert. Neu sind drei Zeilen:

| Ding | Erscheint als | Tippen | Ziehen | Halten | Doppeltippen |
|---|---|---|---|---|---|
| **Marke** | Tropfen auf einer Taktleiste oder an einer Posen-Karte | wählt sie und spielt ihren Klang an | verschiebt sie in der Zeit | Chance, Schwelle, löschen | — |
| **Klang (Chip)** | Chip mit kleiner Wellenform an Marke, Fühler, Regler oder Regel | hören | Lautstärke (hoch, runter) | Varianten, Streuung, Abstand, Höchstzahl, Gruppe | Wellenform groß: zuschneiden, Ein- und Ausblenden |
| **Musikstück** | Karte in einer eigenen Reihe der unteren Leiste | Musik geht über den Wechsel dorthin | nach oben ziehen: Schicht stufenlos einblenden | Tempo, Takt, Schichten, umbenennen | Taktleiste des Stücks groß |
| **Musik-Wechsel** | Brücke zwischen zwei Musik-Karten | zeigt Wechselstelle und Übergangsstück | Wechselstelle wählen (sofort, Schlag, Takt, Phrase) | Übergangsstück, Stocken, Ausblenden | groß |

Wer Posen und Wege kennt, kennt die Musik schon.

### 3.2 Der Klang-Chip

- **Zwei Regler zuerst:** Lautstärke und Tonhöhe. Beide sind schlüsselbar und drahtbar wie jeder Regler.
- **„Mehr“ (Halten):**
  - **Varianten:** mehrere Aufnahmen als gestapelte Wellenformen, Würfel-Zeichen; Standard „gemischt, nicht die letzten 2“.
  - **Streuung:** Tonhöhe und Lautstärke je Abspielen. Startwerte zum Prüfen: ±1 Halbton und ±2 dB für Pfoten, ±0,5 Halbton für
    Stimme.
  - **Mindestabstand** je Quelle (Startwert 70 ms) gegen Maschinengewehr-Klackern.
  - **Höchstzahl** gleichzeitig und wer weicht (älteste oder leiseste), wie bei FMOD.
  - **Gruppe:** Geräusche, Welt, Stimme oder Musik; danach richten sich Lautstärkeregler und Begrenzung im Spiel.
  - **Ort:** Panorama folgt der Bildposition, leicht (Startwert ±40 %), weil viele mit einem Lautsprecher oder in Mono hören.
- **Zuschneiden ohne Werkzeug:** Doppeltippen öffnet die Wellenform; an den Enden ziehen schneidet, an den Ecken ziehen blendet. Beim
  Hineinziehen einer Datei schneidet Studio Stille am Anfang ab und bringt den Klang auf eine gemeinsame Lautheit (eigene Kenntnis:
  so bleibt die Mischung ohne Fachwissen ausgewogen).
- **Pegelanzeige** wie bei Rive: Ein Ausschlag zeigt, dass ein Klang spielt, auch wenn das Gerät stumm ist; rot heißt übersteuert.

### 3.3 Marken in Posen und Wegen

- Eine Marke liegt an einer **Stelle** des Wegs (Prozent beim Standardweg, Sekunden im gestalteten Weg).
- **Gewichtsschwelle** (Startwert 50 %): Eine Marke feuert nur, wenn ihr Weg oder ihre Pose mindestens so viel Gewicht hat. So feuert
  beim Überblenden und in Ebenen nichts doppelt (Unreal-Gewichtsschwelle, Spines `eventThreshold`).
- **Chance** (Standard 100 %): Ozzy seufzt beim Hinsetzen nur jedes dritte Mal. Das macht ihn lebendig, ohne neue Posen.
- **Solange** an einer Pose ist eine Schleife mit Ein- und Ausblenden (Schnarchen, Hecheln).
- **Beim Scrubben hören:** Fährt Florian mit dem Finger über die Taktleiste, spielen die Marken, die er überfährt, kurz an.
  Regler-Klänge folgen dem Regler live: Wer den Tempo-Regler zieht, hört das Rumpeln steigen. Das ist Bret Victors sofortige
  Verbindung (Bericht 12) für Ton.

### 3.4 Kontakte mit Aufprallstärke

- **Quelle:** Die Fühler aus Bericht 13, §10.4 (Pfoten, Körper, Kopf, Dinge) melden Kontakte mit Stärke. In der Welt kommt die Stärke
  aus Box2D (`approachSpeed`), an Ozzys Körper aus der eigenen Figurphysik (Bericht 08 und 09). Für den Klang ist das dasselbe
  Ereignis: Fühler, Material, Stärke, Ort.
- **Kennlinie Stärke → Lautstärke:** ein Draht mit gezeichneter Kurve, Startwert logarithmisch von −30 dB (Hauch) bis 0 dB (harter
  Plumps).
- **Drei Fächer** (leise, mittel, hart) nach der Stärke, wie die Fächer klein, mittel, groß bei Star Wars: Ein harter Plumps klingt
  anders als ein leiser, nicht nur lauter.
- **Material-Paare** nur wo es sich lohnt: Pfote auf Gras, Holz, Schnee, Wasser. Kein Tabellen-Editor; die Paare liegen als Chips am
  Material der Welt.
- **Schwelle** knapp über dem Zittern beim Ruhen, damit ein liegender Ozzy nicht klackert.
- **Rollen und Schleifen** (Schneeball, Bauchrutscher) sind Regler-Klänge: Lautstärke nach Gleit- oder Rollgeschwindigkeit, keine
  gezählten Stöße.
- **Pfotentapp: Kontakt, nicht Marke.** Ozzys Pfoten setzt der Schrittplaner der Physik. Der Tapp hängt deshalb am Fühler „Pfote“,
  nicht an einer Marke im Gangzyklus; sonst klänge er, wenn die Pfote in der Luft hängt. Regel: Marke für gestaltete Momente, Kontakt
  für alles, was die Physik entscheidet.

### 3.5 Tonhöhe nach Tempo: das Rumpeln

- Ein Regler-Klang am Rad: eine Schleife, deren Tonhöhe und Lautstärke zwei Drähte vom Spielwert „Rad-Tempo“ bekommen.
- Kennlinien als Startwerte: Lautstärke von stumm (Stillstand) bis −6 dB (schnell); Tonhöhe ±5 Halbtöne um die Mitte.
- Werte gleiten (FMODs „seek speed“, in Web Audio `setTargetAtTime`), damit nichts knackt.
- Haptik-Ticks alle 5° (Bericht 13) bleiben stumm oder fast stumm; sonst wird das Drehen zum Rattern (Apple: Haptik nicht
  überbeanspruchen, Abschnitt 6.6).

### 3.6 Musik: Stücke, Schichten, Wechsel, Stocken

**Datenmodell (Vorschlag):**

- **Stück** = Karte: Tempo, Takt, Länge einer Phrase, eine oder mehrere **Schichten** (Grund, Rhythmus, Melodie, Spannung), jede in
  Phrasen geschnitten, mit Hallfahnen wie bei der Gans.
- **Wechsel** = Weg zwischen zwei Karten: Wechselstelle (sofort, nächster Schlag, nächster Takt, Phrasenende), Ausblenden, auf Wunsch
  ein **Übergangsstück** (zwei Takte Überleitung) wie FMODs Übergangszeitleiste.
- **Stinger** = ein kurzer Einwurf auf den nächsten Schlag (Schlussakkord bei „Runde geschafft“).
- **Wer wählt:** Drähte und Regeln wie überall. Ein Spielwert treibt die Lautstärke einer Schicht (vertikal) oder eine Regel wählt
  ein Stück (horizontal).

**Für Ozzy auf dem Rad (Startwerte zum Prüfen):**

| Spielwert | Wirkung auf die Musik | Art | Wechselstelle |
|---|---|---|---|
| Stehen, Schnüffeln | Stille oder nur ein leiser Grund | Zustand „Stille“ wie bei der Gans | Phrasenende |
| Tapsen, Trab, Galopp | Rhythmus- und Melodieschicht kommen hinzu | vertikal (LocoRoco) | über einen Schlag einblenden |
| Kippen über 0,8 | Spannungsschicht (Tremolo) | vertikal, Draht | sofort, gleitend |
| Welt, Tageszeit | anderes Stück | horizontal (Gans) | Takt oder Phrase |
| Plumps | **Stocken:** Bandstopp in 0,25 s, dann 0,6 bis 1 s Stille | sofort | sofort |
| erster Schritt nach dem Aufstehen | Wiedereinsatz | horizontal | auf den Schlag dieses Schritts |
| Ziel erreicht | Schlussakkord | Stinger | nächster Schlag |

Warum so:

- **Die Gangart wechselt schnell.** Ein Takt dauert bei 120 Schlägen je Minute zwei Sekunden. Würde jeder Gangwechsel auf den nächsten
  Takt warten, hinkte die Musik Ozzy hinterher. Schichten über einen Schlag ein- und auszublenden folgt sofort und bleibt musikalisch.
- **Der Plumps ist eine Pointe.** Die Gans darf Sekunden warten; die Pause nach dem Plumps ist Witz-Regel 3 aus Bericht 13
  („Ahnung, Pause, Folge“) in Musik. Das Stocken muss deshalb sofort kommen, der Wiedereinsatz darf warten.
- **Bandstopp** ist in Web Audio einfach: Die Wiedergaberate des laufenden Puffers fällt in 0,25 s gegen null (eigene Kenntnis). Bei
  gestreamter Musik über ein `<audio>`-Element ginge es nur mit abgeschalteter Tonhöhen-Korrektur und gröber; ein weiterer Grund für
  Phrasen als Puffer (Abschnitt 4.7).
- **Tempo folgt nicht dem Schritt.** Aufgenommene Musik lässt sich in Web Audio nicht ohne Tonhöhenänderung strecken. Dem Schritt
  folgen kann nur Musik aus Noten und Instrumenten-Samples (wie die generative Musik von Prototyp 1). Das wäre eine eigene
  Entscheidung (Abschnitt 8).
- **Zeitlupe** (Bericht 13: 0,3 s mit Faktor 0,4): Geräusche laufen mit der Spielzeit, aber die Tonhöhe sinkt nur begrenzt (Startwert
  höchstens −5 Halbtöne, sonst brummt alles); die Musik wird nicht langsamer, sondern leiser und dumpfer (Tiefpass) und kommt danach
  zurück. Vorschlag, im Spiel zu prüfen.
- **Pannen-Rückblick** (alle Stürze gleichzeitig): Ohne eigene Regel türmen sich Dutzende Plumpse. Vorschlag: höchstens vier
  Stimmen; jeder Plumps wird ein Ton einer kleinen aufsteigenden Tonleiter. Das klingt nach Cartoon und bleibt ruhig.

### 3.7 Dreiklang: Klang, Bild und Stoß

Weil Stumm-Spieler und Hörgeschädigte den Ton nicht bekommen (Abschnitte 4.2 und 6), hat jeder Klang zwei Geschwister:

- **Bild:** eine Form mit eigenem Weg (Staubwolke über dem Rand, ein zurückfliegendes Ding, Bewegungslinien, gezeichnete Lautmalerei).
  Diese Formen zeichnet Florian in Studio mit denselben Werkzeugen wie Ozzy; ein „PLATSCH“ ist eine Figur mit einer Pose „auftauchen“
  und einem Weg „verpuffen“.
- **Stoß:** ein Haptik-Chip mit zwei Reglern (Stärke, Schärfe) und einem Muster (Abschnitt 6.6).

Studio legt die Geschwister nicht stumm an, sondern **schlägt sie vor**: Wer einen Klang an eine Ursache hängt, die außerhalb des
Bildes liegen kann, sieht zwei leere Plätze daneben („Bild?“, „Stoß?“). Der Prüfer (Bericht 12, §6.13) meldet einen Klang ohne
sichtbare Entsprechung, wenn seine Ursache das Spiel betrifft. So wird die wichtigste Regel der Barrierefreiheit eine Prüfung im
Werkzeug, keine Liste im Kopf.

### 3.8 Prüfstand

Ergänzungen zum Prüfstand aus Bericht 13, §10.9:

- **Ereignisliste „Was hat geklungen?“**: Zeit, Ursache, Klang, Variante, Lautstärke; Antippen springt an die Stelle.
- **Stumm spielen:** Ton aus, Bild-Entsprechungen sichtbar. Das ist der Test, den die Game Accessibility Guidelines empfehlen: jemand
  spielt zum ersten Mal ohne Ton (Abschnitt 6.1).
- **Bewegung reduziert spielen:** schaltet alle Ersatzformen aus Abschnitt 6.3 an.
- **Bluetooth fühlen:** Ton um 200 ms verzögert, damit Florian merkt, welche Klänge mit AirPods zu spät wirken.
- **Einzelschritt:** Klänge des Schritts spielen kurz an, wie Scrubben in einem Tonprogramm.

### 3.9 Drei Aufgaben in dieser Grammatik

**A. „Wenn Ozzy über den Bildrand fällt, scheppert es dahinter.“**
Linse Spiel, ＋ Regel: „Wenn Ozzy · fällt über · Bildrand → Klang · Scheppern“. Studio zeigt neben dem Klang „Bild?“ und „Stoß?“.
Florian zieht die Form „Staubwolke über dem Rand“ auf „Bild?“ und den Stoß „Dreimal hart“ auf „Stoß?“. ▶, Ozzy fällt: Es scheppert,
die Wolke ragt über den Rand, das Telefon klopft dreimal.

**B. „Je schneller das Rad, desto höher rumpelt es.“**
Linse Spiel, Rad antippen, ＋ Klang „Rumpeln“ auf den Ausgang „Tempo“ ziehen. Der Chip zeigt Lautstärke und Tonhöhe; von „Tempo“ je
einen Draht auf beide ziehen; Kennlinien formen. Das Rad mit dem Finger drehen und hören.

**C. „Beim Plumps stockt die Musik, beim ersten Schritt geht sie weiter.“**
Musik-Reihe: Karte „Garten“. ＋ Regel „Wenn Ozzy · Plumps → Musik · stockt“. Der Wechsel zurück steht auf „auf den Schritt“. Den
Bandstopp kürzer ziehen, bis die Pause sitzt.

---

## 4. iPhone, Safari und WKWebView

### 4.1 Freischalten nach der ersten Berührung

- **Norm:** Nach der HTML-Norm ([aktivierende Eingabe](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event))
  zählen `keydown` (außer Esc), `mousedown`, `pointerdown` nur bei der Maus, `pointerup` bei allem außer der Maus und `touchend`.
  **Ein Fingerdruck gibt also erst beim Loslassen frei.**
- **Folge für Ozzy:** Wer das Spiel im Browser mit einem Ziehen am Rad beginnt, hört bis zum Loslassen nichts. Abhilfe: Der Start ist
  ein Tippen (die Weltwahl als Rad aus Bericht 13 beginnt mit einem Tippen auf die Welt), oder die ersten Klänge werden bis zum
  Loslassen zurückgehalten und dann verworfen statt nachgeholt (ein nachgeholter Plumps wäre falsch).
- **Safari:** Ein `AudioContext` beginnt ohne Geste „suspended“; `resume()` muss in der aktivierenden Eingabe laufen (eigene Kenntnis,
  deckt sich mit Prototyp 1). MDN beschreibt die
  allgemeinen Regeln und `navigator.getAutoplayPolicy("audiocontext")` zum Abfragen
  ([Autoplay-Leitfaden](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)).
- **Capacitor:** Die Hülle setzt `mediaTypesRequiringUserActionForPlayback = []` (Quelltext von `CAPBridgeViewController.swift` in
  Capacitor 8.5.2, im Repo unter `apps/game/node_modules/@capacitor/ios/`). Der Kontext darf ohne Geste starten; Prototyp 1 hat das im
  Simulator geprüft.
- **Fallen in der App:**
  - WebKit-Fehler 240646 ([Bericht](https://bugs.webkit.org/show_bug.cgi?id=240646)): In einer WKWebView ohne Gestenpflicht meldet
    der Kontext nach längerem Hintergrund „running“, spielt aber nichts. Abhilfe des Melders: Start in einer Berührung oder später
    starten. Offen.
  - WebKit-Fehler 263627 ([Bericht](https://bugs.webkit.org/show_bug.cgi?id=263627)): Nach dem Hintergrund bleibt der Kontext auf
    iOS 17 manchmal stehen; `currentTime` läuft nicht weiter, obwohl der Zustand „running“ ist. Abhilfe aus dem Bericht:
    `suspend()` und dann `resume()`. Offen.
  - **Folgerung:** Der Wachhund aus Prototyp 1 prüft heute nur den Zustand nach 400 ms. Er sollte zusätzlich prüfen, ob `currentTime`
    weiterläuft, und dann einmal `suspend()` und `resume()` versuchen, bevor er auf die nächste Berührung wartet.

### 4.2 Stummschaltung und `navigator.audioSession`

**Was iOS tut:**

- Am iPhone 16 schaltet standardmäßig die Aktionstaste Stumm, sonst das Kontrollzentrum; ältere Modelle haben den Klingel-/Stumm-Schalter
  ([Apple Support](https://support.apple.com/105103)).
- **Kategorien** (Apple-Doku):
  - [ambient](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/ambient): Ton ist Nebensache, die
    App funktioniert auch ohne; mischt sich mit anderer Musik; Stumm und Sperrbildschirm machen still.
  - [soloAmbient](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/soloambient) (Standard): still
    bei Stumm, unterbricht andere Musik.
  - [playback](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback): spielt bei Stumm
    weiter, unterbricht andere Musik, außer mit der Option „mixWithOthers“.
- **Apples Erwartung** ([Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)): Wer stumm
  schaltet, will auch nebensächliche Klänge wie Spielgeräusche und Spielmusik nicht hören; im Stumm-Zustand spielt nur, was jemand
  ausdrücklich startet (Medien, Wecker, Nachrichten). Apple rät, eine Kategorie zu wählen, die diesen Erwartungen folgt, und die Musik
  anderer Apps nicht ohne Not anzuhalten.

**Was Safari tut:**

- Die **Audio Session API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type),
  [Norm-Entwurf](https://w3c.github.io/audio-session/)) kennt `auto`, `playback`, `transient`, `transient-solo`, `ambient` und
  `play-and-record`. Bei `auto` gilt: Ein `AudioContext` allein ergibt `ambient`, ein Medienelement ergibt `playback`
  ([MDN, Auswahl](https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API)). Laut Web-Platform-Übersicht gibt es die
  Schnittstelle seit Safari 16.4 ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/audio-session)).
- **Web Audio schweigt bei Stumm**, Medienelemente nicht. Ein WebKit-Entwickler schrieb im September 2024, dass seit iOS 17
  `navigator.audioSession.type = "playback"` den Ton hält; der Fehlerbericht wurde daraufhin geschlossen
  ([WebKit 237322](https://bugs.webkit.org/show_bug.cgi?id=237322)). `playback` ist aber exklusiv und hält die Musik anderer Apps an.
- Der alte Trick, ein stilles `<audio>` in Schleife zu spielen ([unmute-ios-audio](https://github.com/feross/unmute-ios-audio),
  [Audjust](https://www.audjust.com/blog/unmute-web-audio-on-ios)), zeigt Steuerelemente auf dem Sperrbildschirm, die niemand
  versteht. Nicht verwenden.
- `transient` hatte auf iOS 17 einen Fehler (Ton läuft, aber nichts zu hören; [WebKit 264473](https://bugs.webkit.org/show_bug.cgi?id=264473)).

**Was die App tut:** Die Kategorie setzt die App-Hülle. Prototyp 1 setzt „ambient“ mit „mixWithOthers“ im `AppDelegate` und
zusätzlich `navigator.audioSession.type = 'ambient'`. Ob sich beide widersprechen dürfen, ist ungeprüft; sie sollten immer gleich
stehen.

**Stumm lässt sich nicht lesen.** Es gibt keine öffentliche Schnittstelle, die den Stumm-Zustand meldet; Entwicklerforen kennen nur
Tricks über die Dauer eines stillen Klangs
([Apple-Forum](https://developer.apple.com/forums/thread/46461)). Der Web-Audio-Kontext meldet bei Stumm weiter „running“
(`docs/IOS.md`). Nützlich ist nur [`secondaryAudioShouldBeSilencedHint`](https://developer.apple.com/documentation/avfaudio/avaudiosession/secondaryaudioshouldbesilencedhint):
Er meldet, dass eine andere App Musik spielt. Dann sollte Ozzys Musik schweigen, die Geräusche bleiben.

**Wie viele spielen stumm?** Die Umfragen widersprechen sich: TapResearch fand 2022 unter 2 400 Befragten über 91 %, die Spiele ohne
Ton spielen ([Beitrag](https://blog.tapresearch.com/how-sound-preferences-impact-player-engagement); die Seite antwortet inzwischen
mit „410 Gone“, die Zahl stammt aus der Suchzusammenfassung). Daten des Anbieters Appington von etwa 2013 zeigten dagegen 73 %, die mit
mindestens 10 % Lautstärke spielen ([Destructoid](https://destructoid.com/73-of-mobile-gamers-play-with-the-volume-on)). Für die Planung reicht: **Ein großer Teil spielt
stumm, mindestens zeitweise.** Jeder Ton-Gag braucht deshalb sein Bild.

### 4.3 Unterbrechungen und Hintergrund

- Telefonat, Siri oder Wecker unterbrechen die Sitzung. Safari meldet dann zeitweise den nicht genormten Zustand „interrupted“; ein
  WebKit-Entwickler will ihn nicht mehr nach außen zeigen ([WebKit 273511](https://bugs.webkit.org/show_bug.cgi?id=273511)).
- Die Audio Session API meldet `statechange` mit `interrupted` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API)).
- Apple: Ein Spiel darf nach einer Unterbrechung ohne Prüfung wieder spielen, weil es Ton ohne ausdrückliche Wahl spielt
  ([Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)).
- **Regel für uns:** Beim Wechsel in den Hintergrund `suspend()`, beim Zurückkommen `resume()` mit dem Wachhund aus 4.1; in der App
  zusätzlich die Unterbrechungs-Meldungen von iOS über die Erweiterung (Abschnitt 7.3) an die Seite geben.

### 4.4 Latenz

- WebKit unterstützt `latencyHint` nicht; der Fehlerbericht ist seit 2020 offen ([WebKit 214258](https://bugs.webkit.org/show_bug.cgi?id=214258)).
- Lesbar sind `baseLatency` (Safari auf iOS seit 14.5) und `outputLatency` (seit 18.4)
  ([caniuse baseLatency](https://caniuse.com/mdn-api_audiocontext_baselatency), [caniuse outputLatency](https://caniuse.com/mdn-api_audiocontext_outputlatency)).
  Veröffentlichte Messungen für Web Audio auf dem iPhone habe ich nicht gefunden. Das Audio-Lab von Prototyp 1 zeigt die Summe beider
  schon an: **Probe, eine Minute auf Florians iPhone.**
- **Bluetooth:** Stephen Coyle maß 2019 auf einem iPad Pro mit iOS 13 die Zeit von der Berührung bis zum Ton in Kopfhörern: AirPods
  der ersten Generation 274 ms,
  zweite Generation 178 ms, AirPods Pro 144 ms; AirPods Pro 2 kamen 2022 auf 126 ms, die eingebauten Lautsprecher eines iPad Pro im
  selben Test auf 83 ms ([9to5Mac](https://9to5mac.com/2019/12/22/airpods-latency-test/),
  [Notebookcheck](https://www.notebookcheck.net/AirPods-Pro-2-Apple-s-latest-TWS-earbuds-offer-significantly-lower-Bluetooth-latency-than-their-predecessors.670224.0.html)).
- **Haptik:** Ein Entwickler berichtet rund 0,1 s Verzögerung des Stoßes nach dem Ton, trotz `prepare()`
  ([Apple-Forum](https://developer.apple.com/forums/thread/64734)); Apple sagt nur, dass `prepare()` die Verzögerung senkt, wenn es
  rechtzeitig vor dem Ereignis läuft ([prepare()](https://developer.apple.com/documentation/uikit/uifeedbackgenerator/prepare())).
- **Brücke Web → nativ:** Messungen von 2015 nennen 0,6 bis 3,6 ms für einen Hin- und Rückweg durch die WKWebView
  ([persistent.info](https://blog.persistent.info/2015/08/wkwebview-communication-latency.html)); für Capacitor heute fehlen Zahlen.
- **Folgerungen:**
  - Bild, Stoß und Ton laufen nie sample-genau zusammen; mit AirPods kommt der Ton deutlich nach dem Bild.
  - Klänge, die einem Stoß folgen (Plumps), wirken auch spät noch richtig. Rhythmische Klänge, die der Spieler selbst auslöst, wären
    mit AirPods schwierig; die Demo hat keine.
  - Die Musik ist nicht betroffen: Sie ist für alle gleich verspätet, und der Wechsel auf den Schlag bezieht sich auf die Audio-Uhr.

### 4.5 Planung auf der Audio-Uhr

Der Standard ist Chris Wilsons „Tale of Two Clocks“ ([web.dev](https://web.dev/articles/audio-scheduling)): Ein Takt im Hauptthread
(etwa alle 25 ms) plant alles, was in den nächsten etwa 100 ms fällig ist, mit absoluten Zeiten auf `AudioContext.currentTime`. Die
Audio-Uhr läuft im eigenen Thread und hält die Zeiten auch, wenn der Hauptthread stockt. Prototyp 1 macht genau das.

Für Studio kommt hinzu:

- **Spielzeit und Audio-Zeit trennen.** Die Laufzeit rechnet deterministisch im festen Takt (Bericht 11). Ein Ereignis aus Schritt n
  bekommt die Audio-Zeit „jetzt plus Vorlauf“. Die Musik-Uhr (Schläge, Takte) lebt in Audio-Zeit; Wechsel werden auf ihren nächsten
  Schlag gelegt.
- **Rückblick und Tests** spielen dieselben Ereignisse noch einmal ab; weil die Auswahl der Varianten aus einer Saat je Ereignis
  kommt, klingt der Rückblick wie das Original.

### 4.6 Formate

| Format | Safari (iOS, Mac) | Chrome am Mac | Für uns |
|---|---|---|---|
| AAC in `.m4a` | ja | ja | **Standard** für Musik-Phrasen und längere Klänge |
| WAV (PCM) | ja | ja | kurze Klänge, Schleifen ohne Lücke |
| FLAC | ja (eigene Kenntnis) | ja | Schleifen, wenn WAV zu groß wird |
| MP3 | ja | ja | **nicht für Schleifen:** Safari liefert bei manchen MP3 zusätzliche Leer-Frames ([WebKit 228215](https://bugs.webkit.org/show_bug.cgi?id=228215)) |
| Ogg mit Opus oder Vorbis | seit Safari 18.4 ([WebKit](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)) | ja | erst, wenn alle Zielgeräte 18.4 haben; Opus in Ogg hatte noch Zeitfehler in 18.5 |
| WebM mit Opus | `<audio>` seit Safari 15, `decodeAudioData` lange unzuverlässig | ja | nein |

- Für Schleifen gilt allgemein: Kodierer setzen Stille an den Anfang (laut Jake Archibald mindestens 1 024 Samples), und Browser
  schneiden sie verschieden ab ([Jake Archibald](https://jakearchibald.com/2016/sounds-fun/)). Sichere Wege: WAV oder FLAC für Schleifen, oder
  `loopStart` und `loopEnd` am Puffer setzen und an einer bekannten Länge prüfen.
- Safari 26 kann Ton auch stückweise über `AudioDecoder` (WebCodecs) entpacken
  ([Safari 26 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes)). Das brauchen wir
  nur, wenn Phrasen nicht reichen.

### 4.7 Stimmen und Speicher

- **Stimmen:** Web Audio kennt keine feste Grenze; jede Stimme kostet Rechenzeit im Audio-Thread (eigene Kenntnis). Startwerte aus
  Prototyp 1: Geräusche 22, Ambiente 8, Stimme 3, dazu die Musik. Für Ozzy: Geräusche 16 bis 24, Musik zwei Phrasen je Schicht (laufend und nächste).
- **Speicher:** Entpackter Ton liegt als 32-Bit-Gleitkomma in der Abtastrate des Kontexts vor (eigene Kenntnis). Bei 48 kHz sind das
  rechnerisch 384 KB je Sekunde Stereo, also **rund 23 MB je Minute**, Mono die Hälfte. Sechs Minuten Musik als Puffer wären 138 MB.
- **Paralleles Entpacken** kann den Tab auf iOS beenden: Ein WebKit-Entwickler sah den Prozess bei über 1,5 GB vom System beendet;
  der Melder half sich mit 100 ms Abstand zwischen den Aufrufen ([WebKit 227636](https://bugs.webkit.org/show_bug.cgi?id=227636)).
  Den Speicherrahmen kann JavaScript nicht abfragen.
- **Regeln:**
  1. Klänge nacheinander entpacken, nie alle auf einmal.
  2. Geräusche als kurze Puffer, Mono, wo Stereo nichts bringt.
  3. Musik in Phrasen (8 bis 16 s); nur die laufende und die nächste Phrase je Schicht sind entpackt (bei 8 s Stereo je rund 3 MB).
  4. Lange, ruhige Teile (Ambiente) dürfen gestreamt werden (`<audio>` mit `MediaElementAudioSourceNode`), wie Constructs Ordner
     „Music“.
  5. Budget für die Demo (Startwert): 40 MB entpackter Ton.

### 4.8 Native Ton- und Haptik-Erweiterungen

| Paket | Lizenz, Stand | Was es kann | Urteil |
|---|---|---|---|
| `@capacitor-community/native-audio` | MIT, 8.0.0 (12/2025) | vorladen, spielen, Schleife, stoppen, Lautstärke 0,1 bis 1, Kanäle je Asset, Option gegen Mischen ([GitHub](https://github.com/capacitor-community/native-audio)) | **nicht nehmen:** keine Tonhöhe, keine Planung auf einer Uhr, nur in der App. Web Audio deckt alles und läuft auch im Editor |
| `@capacitor/haptics` | MIT, 8.0.2 (im Repo) | Stoß leicht, mittel, schwer; Meldung Erfolg, Warnung, Fehler; Auswahl-Ticks; Vibration mit Dauer ([Doku](https://capacitorjs.com/docs/apis/haptics)) | **für den Anfang**; Schwächen siehe unten |
| `@capawesome/capacitor-haptics` | MIT, 0.2.0 (29.10.2026), Capacitor ab 8 | dazu „weich“ und „hart“, eigene Muster aus Ereignissen (Zeit, Dauer, Stärke, Schärfe) und Parameterkurven unter iOS ([Doku](https://capawesome.io/docs/sdks/capacitor/haptics/)) | **prüfen** für Muster; Werte nicht live änderbar |
| `capacitor-rich-haptics` | MIT, 0.10.4 (05/2026) | AHAP-Muster aus Datei oder JSON ([npm](https://www.npmjs.com/package/capacitor-rich-haptics)) | Alternative; verlangt laut npm React und Vue als Partner-Pakete |
| eigene kleine Erweiterung (Swift) | eigen | fester Core-Haptics-Motor, Stoß mit Stärke, Dauerhaptik mit Live-Werten, Sitzung, Systemschalter | **nehmen**, sobald Stärke nach Fallhöhe und Rumpeln gewünscht sind |

**Was der Quelltext von `@capacitor/haptics` 8.0.2 zeigt** (`apps/game/node_modules/@capacitor/haptics/ios/Sources/HapticsPlugin/`):

- Jeder Stoß baut einen neuen `UIImpactFeedbackGenerator` und löst ihn sofort aus, ohne `prepare()`. Apple nennt `prepare()` den Weg zu
  geringer Verzögerung.
- Die Stärke ist nur leicht, mittel oder schwer; `impactOccurred(intensity:)` (seit iOS 13,
  [Doku](https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/impactoccurred(intensity:))) wird nicht angeboten.
  „Plumps, stark nach Fallhöhe“ (Bericht 13) geht damit nur in drei Stufen.
- `vibrate(duration)` baut für jeden Aufruf einen neuen `CHHapticEngine` mit voller Stärke und Schärfe.
- Nur die Auswahl-Ticks halten einen vorbereiteten Generator.

### 4.9 Haptik im Browser

- Safari unterstützt die Vibrations-Schnittstelle nicht (Bericht 13).
- Seit Safari 17.4 gibt es den Schalter `<input type="checkbox" switch>`; Safari 18 gibt beim Umschalten einen Haptik-Tick
  ([Safari 18 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-18-release-notes)). Bibliotheken
  wie `ios-haptics` nutzten das per Skript. Die Fassung 3.1.1 schreibt dazu „apple patched it in ios 26.5“
  ([README](https://unpkg.com/ios-haptics@3.1.1/README.md)); die Fassung 3.3.0 legt deshalb ein unsichtbares Label über das Element,
  damit der echte Tipp den Schalter trifft ([README 3.3.0](https://unpkg.com/ios-haptics@3.3.0/README.md)). Ein WebKit-Bericht forderte
  genau diese Bindung an eine echte Nutzerhandlung ([WebKit 285120](https://bugs.webkit.org/show_bug.cgi?id=285120)).
- **Für Ozzy wertlos:** Unser Verb ist Ziehen, nicht Tippen, und Landung oder Plumps sind keine Tipps. Haptik bleibt der App vorbehalten.

### 4.10 Mac und iPad im Editor

- Im Editor gilt dasselbe Web Audio; die erste Bedienung schaltet frei.
- **Stumm im Editor:** Wer am iPad stumm geschaltet hat, hört im Editor nichts. Die Pegelanzeige am Klang-Chip (3.2) zeigt trotzdem,
  dass etwas spielt. `playback` würde Florians eigene Musik beim Arbeiten anhalten; deshalb auch im Editor `ambient` als Standard.
- **Aufnehmen im Editor:** Über das Mikrofon kann Studio einen Klang direkt auf eine Marke aufnehmen; Safari 18.4 nimmt verlustfrei
  (ALAC oder PCM) auf ([WebKit 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)). Achtung: Mit Mikrofon wechselt
  die Sitzung zu `play-and-record`, was die Ausgabe am iPhone verändern kann (eigene Kenntnis); nur während der Aufnahme.
- **Haptik im Editor** gäbe es nur nativ: Einrasten am Force-Touch-Trackpad ([NSHapticFeedbackManager](https://developer.apple.com/documentation/appkit/nshapticfeedbackmanager))
  und am Apple Pencil Pro ([UICanvasFeedbackGenerator](https://developer.apple.com/documentation/uikit/uicanvasfeedbackgenerator), seit
  iOS 17.5). Nett für später, wenn der Editor eine Hülle bekommt (Bericht 11, §8).

---

## 5. Woher die Klänge kommen

### 5.1 Bibliotheken und Lizenzen

| Quelle | Lizenz | Kommerziell im Spiel | Nennung | Haken |
|---|---|---|---|---|
| [Kenney](https://kenney.nl/assets/rpg-audio) (Audio-Pakete) | CC0 | ja | freiwillig | kleine, eher generische Pakete |
| [Sonniss GDC Game Audio Bundle](https://sonniss.com/gdc-bundle-license/) | eigene Lizenz, Fassung 2.0 vom 27.08.2026 | ja, unbegrenzt viele Projekte | nicht nötig | nicht als Klänge weitergeben (auch nicht bearbeitet), kein KI-Training ohne Erlaubnis |
| [Freesound](https://freesound.org/help/faq/) | je Klang CC0, CC BY oder CC BY-NC | CC0 und CC BY ja, **CC BY-NC nein** | bei CC BY Pflicht (Name, Nutzer, Link, Lizenz) | Lizenz je Klang prüfen; alte „Sampling+“-Klänge wie NC behandeln |
| [Pixabay](https://pixabay.com/service/license-summary/) | eigene Lizenz | ja | nicht nötig | nicht unverändert weiterverkaufen; Rechte Dritter selbst prüfen |
| BBC Sound Effects | RemArc | **nein**, nur privat, Bildung, Forschung ([Zusammenfassung](https://www.musicradar.com/news/the-bbc-is-letting-you-download-more-than-16000-free-sound-effect-samples-from-its-archive)) | BBC nennen | kommerziell nur über Pro Sound Effects gegen Geld |
| [Hanna-Barbera Sound Effects Library](https://sound-ideas.com/products/hanna-barbera-sound-effects-library) (Sound Ideas) | eigene Lizenz | laut Händler auch für Spiele; Lizenztext vor dem Kauf lesen | — | 2 243 Klassiker, 495 USD |
| ElevenLabs Sound Effects | eigene Bedingungen | bezahlte Pläne ja; beim freien Plan widersprechen sich die Hilfeseiten ([Hilfe](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform), [SFX-Bedingungen](https://elevenlabs.io/sound-effects-terms)) | frei: Pflicht | Rechtslage KI-erzeugter Inhalte unsicher; nur mit bezahltem Plan |
| [ZzFX](https://www.npmjs.com/package/zzfx) | MIT | ja | — | Synthesizer im Code (Piep-Ästhetik); als Platzhalter |
| Prototyp 1 (`apps/game/src/audio/sfx.ts`) | eigen | ja | — | prozedural, anderer Stil; Platzhalter |

### 5.2 Eigene Aufnahmen

- **Geräusche (Foley):** Cartoon-Klänge sind fast nie echt. Brown und die Warner-Cartoons bauten ihre Witze auf überraschende Klänge
  (2.6). Für Ozzy heißt das: Tapp, Plumps, Scheppern, Platsch selbst aufnehmen, mit Dingen, die nicht nach Hund klingen (Kissen,
  Gummihandschuh, Topfdeckel, Wassereimer). Ein iPhone reicht für den Anfang (eigene Kenntnis: Sprachmemos können verlustfrei
  aufnehmen); besser ist ein kleiner Recorder in einem ruhigen, gedämpften Raum.
- **Ozzys Stimme** (Fiepen, Schnaufen, Seufzen): eine menschliche Stimme, die Hund spielt, ist Cartoon-Tradition und gibt Florian volle
  Kontrolle über Timing und Ausdruck; echte Hundeaufnahmen klingen weniger komisch und brauchen die Zustimmung des Halters.
- **Rechte:** Wer aufnimmt, besitzt die Aufnahme. Bei Sprechern einen kurzen schriftlichen Rechteübertrag (Spiel, Werbung, Editor-Demo).

### 5.3 Musik

| Weg | Wie | Stärken | Schwächen |
|---|---|---|---|
| Auftragsmusik | ein Komponist liefert Stücke in Schichten und Phrasen auf einem festen Tempo-Raster | passt genau, Struktur von Anfang an für Studio | Kosten; Rechte, Buyout und GEMA-Mitgliedschaft vorher klären (offene Frage) |
| Gemeinfreie Komposition, selbst eingespielt | wie die Gans: Komposition gemeinfrei, Aufnahme eigen | starker Charakter, keine Rechte an der Komposition | Aufnahmen anderer sind nicht frei; braucht einen Spieler |
| Lizenzbibliothek | fertige Stücke | schnell | selten in Schichten, oft nicht für Spiele lizenziert; jede Lizenz einzeln prüfen |
| Noten plus Instrumenten-Samples | Musik als Daten, gespielt von gesampelten Instrumenten (wie Prototyp 1 generativ) | wenig Speicher, Tempo kann Ozzys Schritt folgen, Stocken trivial | klingt schnell nach Spieluhr; Studio würde ein kleiner Notensequenzer |

### 5.4 Lizenzregeln (Ergänzung zu Bericht 11, §14)

1. Je Klang Herkunft, Lizenz und Nennung in den Daten des Klangs speichern; Studio erzeugt daraus die Nennungsliste.
2. CC BY-NC, BBC-RemArc und Klänge ohne klare Lizenz nie ins Spiel.
3. KI-erzeugte Klänge nur mit bezahltem Plan, gekennzeichnet, und nie als Ersatz für Ozzys Stimme.
4. Sonniss- und Pixabay-Klänge nicht als Klangpaket mit Studio ausliefern (Weitergabe als Klänge verboten); als Teil eines Spiels
   erlaubt.

---

## 6. Barrierefreiheit im Spiel

### 6.1 Was die Richtlinien verlangen

- **Apple** ([Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)):
  - Wichtiges nie nur über Ton; Audio-Hinweise mit Bild-Hinweisen ergänzen, besonders in Spielen, „where important content might be
    taking place off screen“.
  - Haptik zusätzlich zu Ton für alle, die ihn nicht hören oder ausgeschaltet haben.
  - Bei „Bewegung reduzieren“: automatische und wiederholte Bewegung reduzieren (Zoomen, Skalieren, Bewegung am Rand); Federn
    straffen; Bewegung direkt an die Geste koppeln; keine Tiefensprünge; Übergänge durch Überblenden ersetzen; kein Ein- und
    Ausblenden über Unschärfe.
  - Schwierigkeit anpassbar machen (weniger strenge Ziele, mehr Reaktionszeit, Steuerhilfen).
  - einfache Gesten, Alternativen zu Gesten, Schaltersteuerung unterstützen.
- **Apple, Bewegung** ([Motion](https://developer.apple.com/design/human-interface-guidelines/motion)): Bewegung optional machen und nie
  als einzigen Träger wichtiger Information nutzen.
- **App Store, Angaben zur Barrierefreiheit:**
  - [Bewegung reduzieren](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria):
    Tiefeneffekte (Parallaxe, animierte Unschärfe), Bewegung auf mehreren Achsen oder in mehreren Tempi, Drehen und Wirbel abschalten
    oder ändern; reine Zier stoppen; bedeutungstragende Bewegung durch Überblenden, Aufleuchten oder Farbwechsel ersetzen. Ein eigener
    Schalter muss dem Systemschalter entsprechen oder feiner sein.
  - [Untertitel](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/captions-evaluation-criteria): gilt für
    Videos und Zwischensequenzen mit Sprache; Dialog-Untertitel genügen, Untertitel mit Geräuschen („[Hund bellt]“) gelten als
    bevorzugter Standard. Untertitel sollen automatisch angehen, wenn der Systemschalter an ist.
- **Xbox Accessibility Guidelines:**
  - [103](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103): wichtige Ton-Inhalte über
    mindestens einen weiteren Sinn, mit Art und Richtung des Klangs; Haptik nur zusätzlich, weil manche sie abschalten.
  - [105](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/105): getrennte Lautstärken (Musik,
    wichtige Geräusche, Hintergrund), Stereo zu Mono umschaltbar.
  - [110](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/110): Haptik abschaltbar und in der
    Stärke regelbar, nie einziger Kanal.
  - [117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117): Kamera-Wackeln, Wippen und
    Bewegungsunschärfe vermeiden oder abschaltbar machen; Hintergrundbewegung abschaltbar; automatische Kameraführung abschaltbar.
- **Game Accessibility Guidelines** ([Liste](https://gameaccessibilityguidelines.com/full-list/)):
  - Grundstufe: [nichts Wesentliches nur über Ton](http://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-sounds-alone/)
    (Prüfmethode: jemand spielt zum ersten Mal ohne Ton), getrennte Lautstärken, Spieltempo einstellbar, Haptik-Schalter, so einfache
    Steuerung wie möglich, keine flackernden Bilder.
  - Mittelstufe: [Bild oder Untertitel für wichtige Hintergrundgeräusche](http://gameaccessibilityguidelines.com/provide-captions-or-visuals-for-significant-background-sounds/)
    (in The Last Door nutzten 14 % diese Option), Richtung aus dem Ton auch im Bild, Alternativen zum Gedrückthalten, Hintergrundbewegung
    abschaltbar, Hilfsmodi.
  - Oberstufe: [sehr einfache Steuerung für Schalter und Augensteuerung](https://gameaccessibilityguidelines.com/provide-very-simple-control-schemes-that-are-compatible-with-assistive-technology-devices-such-as-switch-or-eye-tracking/)
    (ein Ein-Tasten-Läufer funktioniert mit allem vom Rollstuhlknopf bis zum Saug-Blas-Röhrchen), präzises Timing nie zwingend.
- **WCAG:** [2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) (Stufe A): höchstens drei
  Blitze je Sekunde oder unter den Schwellen; [2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
  (Stufe AAA): Bewegung, die eine Interaktion auslöst, abschaltbar, außer sie ist wesentlich; `prefers-reduced-motion` ist eine
  anerkannte Technik.
- **Vorbilder aus Spielen:**
  - The Last of Us Part I ([PlayStation Blog](https://blog.playstation.com/2022/08/26/the-last-of-us-part-i-full-list-of-accessibility-features/)):
    Dialog als Vibration, Kamera-Wackeln 1 bis 10, Zeitlupe als Hilfe, eine Hör-Voreinstellung mit einem Klick.
  - Fortnite: „Soundeffekte visualisieren“ zeigt Ringe um das Fadenkreuz in Richtung des Geräuschs, farbig nach Art
    ([Epic Hilfe](https://www.epicgames.com/help/en-US/c-Category_Fortnite/c-Fortnite_Gameplay/are-there-any-accessibility-settings-for-fortnite-a000088596));
    Spieler bemängeln volle Anzeigen.
  - Celeste: Hilfsmodus mit Spieltempo, Ausdauer, Unverwundbarkeit, respektvoll formuliert
    ([GAG](https://gameaccessibilityguidelines.com/celeste-assist-mode)).

### 6.2 Gags, die nur zu hören sind

**Ziel:** Wer stumm spielt oder nicht hört, versteht jeden Gag. Wer hört, bekommt dasselbe Bild, und es stört ihn nicht.

| Möglichkeit | Wie | Stärken | Schwächen | Urteil |
|---|---|---|---|---|
| **Rand-Bild** | etwas fliegt zurück ins Bild (Hut, Fischgräte, Katzenhaar), Staubwolke ragt über den Rand, Bewegungslinien am Rand | Cartoon-Tradition, kein Text, zeigt Richtung | braucht je Gag eine Form | **immer** |
| **Gezeichnete Lautmalerei** | „SCHEPPER“, „MIAU“, „PLATSCH“ als Formen am Rand, kurzer Weg „auftauchen, verpuffen“ | eindeutig, sehr komisch, Comic-Tradition | Text im Bild; Sprache | **Schalter „Geräusche zeigen“**, in der App automatisch an, wenn iOS-Untertitel an sind |
| Untertitel in Klammern | „[Scheppern]“ unten im Bild | Standard für Filme | bricht den Look | nein |
| Richtungsanzeige | Ringe oder Pfeile wie Fortnite | genau | Bedienoberfläche statt Witz | nein; das Rand-Bild zeigt die Richtung |
| **Stoß** | Haptik-Muster je Ursache (6.6) | auch ohne Hinsehen | nur App, nicht alle spüren es | **zusätzlich** |

Hinweise:

- Witz-Regel 8 aus Bericht 13 („Hinter dem Bildrand ist alles Ton“) bleibt richtig, wird aber zu: **hinter dem Bildrand ist alles Ton
  plus ein Rand-Bild.** Der Cartoon-Kniff hat das immer schon so gemacht: Nach dem Krachen fällt etwas zurück ins Bild.
- Ozzys **Andenken auf dem Kopf** (Bericht 13) ist bereits eine Bild-Entsprechung. Es erzählt nachträglich, was hinter dem Rand war.
- **Systemschalter:** Die App kann `UIAccessibility.isClosedCaptioningEnabled` lesen
  ([Doku](https://developer.apple.com/documentation/uikit/uiaccessibility/isclosedcaptioningenabled)); im Browser gibt es dafür keine
  Abfrage.
- **Einmaliger Hinweis:** Weil Stumm nicht lesbar ist, kann beim ersten Start ein gezeichneter Lautsprecher kurz wackeln (kein Text).
  Das ist ein Vorschlag; Prototyp 1 hat keinen Hinweis.

### 6.3 Bewegung reduzieren

**Erkennen:**

- im Browser `matchMedia('(prefers-reduced-motion: reduce)')` mit Änderungs-Zuhörer; WebKit unterstützt das seit 2017
  ([WebKit-Blog](https://webkit.org/blog/7551/responsive-design-for-motion/));
- in der App zusätzlich [`UIAccessibility.isReduceMotionEnabled`](https://developer.apple.com/documentation/uikit/uiaccessibility/isreducemotionenabled);
- dazu ein eigener Schalter im Spiel, gleich oder feiner als der Systemschalter (App-Store-Kriterium).

**WebKit nennt als Auslöser für Schwindel:** Skalieren und Zoomen, Drehen und Wirbel, Bewegung in mehreren Tempi oder Richtungen
(Parallaxe), Ebenen, die in den Raum kippen, Bewegung am Rand des Blickfelds. Direkte Bewegung, die der Nutzer selbst steuert, darf
bleiben; nur bekannte Auslöser entfernen, nicht alles.

**Was das für Ozzy heißt:**

| Effekt (Berichte 10 und 13) | Normal | Bei „Bewegung reduzieren“ |
|---|---|---|
| Kamera-Wackeln bei hartem Plumps | kurz, nur bei harten Stürzen | **aus**; Ersatz: 60 bis 100 ms Stillstand des Bildes und Aufprall-Linien am Kontaktpunkt |
| Zeitlupe beim Stolpern (0,3 s, Faktor 0,4) | an | **bleibt**, ohne Zoom; sie hilft beim Verstehen |
| Line Boil (Wackeln für Momente, Bericht 10) | an für Momente | **aus**; Ersatz: eine ruhige Zitterlinie als Form |
| Kamera zieht am Ende auf | Zoom | **Überblenden** zur Gesamtansicht |
| Kamera folgt beim Absturz | Schwenk | Schnitt mit kurzem Überblenden oder Kamera bleibt, Rand-Bild zeigt den Ort |
| Sterne kreisen um den Kopf | Kreisbahn | **stehende** Sterne, die blinken ohne Blitz |
| Pannen-Rückblick: alle Stürze gleichzeitig | viele bewegte Kopien | **Comicseite aus Standbildern**, eins nach dem anderen hervorgehoben |
| Tropfen auf der Kamera | rinnen | stehen und blenden aus |
| Rad dreht mit dem Finger | folgt der Geste | **bleibt** (Apple: an die Geste koppeln) |
| Rad läuft nach dem Loslassen weiter (Schwung) | lang | kürzer (mehr Reibung), prüfen |
| Himmel, Parallaxe im Hintergrund | wenn vorhanden | **keine** Parallaxe |
| Blitze (Sterne, Funkeln) | selten | nie mehr als drei je Sekunde (WCAG 2.3.1) |

Apple rät in visionOS außerdem, die Welt nicht drehen zu lassen und einen ruhenden Bezugsrahmen zu geben. Am iPhone ist das Bild klein
und die Drehung vom Spieler gesteuert; der ruhende Himmel ist trotzdem ein guter Anker und sollte bei „Bewegung reduzieren“ nicht
mitlaufen.

### 6.4 Einhand, zwei Daumen, eine Taste

Bericht 13 hat die Steuerung gewählt (Ziehen überall, Halten bremst, Loslassen gibt Schwung; zwei Daumen und Neigen als Schalter).
Barrierefreiheit ergänzt:

| Modus | Bedienung | Für wen | Woher |
|---|---|---|---|
| **Ziehen überall** (Standard) | ein Finger irgendwo, Tropfenmarke am Rand | einhändig, Daumen in der Mitte | Bericht 13 |
| **Zwei Daumen** | links halten dreht links, rechts dreht rechts, beide bremsen | wenig Feinmotorik, nichts verdeckt | Bericht 13 |
| **Halten als Umschalter** | Tippen statt Halten: einmal bremsen, noch einmal lösen | wer nicht lange halten kann | GAG „Alternativen zum Gedrückthalten“ |
| **Eine Taste** | eine Eingabe (Tippen irgendwo, Leertaste, externer Schalter): „los“ oder „halt“; eine **Tempo-Hilfe** hält Ozzy im Tempofenster des nächsten Hindernisses | Schaltersteuerung, starke Einschränkungen | GAG Oberstufe, Apple „Steuerhilfen“ |
| **Spieltempo** | 100, 85 oder 70 % | langsamere Reaktion | GAG Grundstufe, Celeste, TLOU |
| **Glättung** | Regler für die Feder zum Finger | Zittern | Feder mit Kraftgrenze aus Bericht 13 filtert schon |
| **Ohne Uhr** | die Sonne bleibt stehen | kein Zeitdruck | Apple „Schwierigkeit anpassen“ |
| **Tastatur und Controller** | Pfeile oder A/D, Leertaste; Gamepad | Mac, externe Schalter, die sich als Tastatur ausgeben (eigene Kenntnis) | Apple „Alternativen zu Gesten“ |

- **Ein-Tasten-Modus** ist der wichtigste Zusatz, weil er auch Schaltersteuerung, externe Taster und Sprachsteuerung (über eine
  Tastaturtaste) möglich macht. Ob er Spaß macht, entscheidet eine Probe; mit voller Tempo-Hilfe fiele Ozzy nie und der Witz ginge
  verloren. Vorschlag: Die Hilfe hält das Tempo, der Spieler entscheidet, wann Ozzy losgeht und wann er stehen bleibt (vor Sturkopf,
  vor der Wippe).
- **Gamepad in der App:** Safari kennt die Gamepad-Schnittstelle; in einer WKWebView blieb sie lange leer, weil die Webansicht beim
  Laden „First Responder“ sein muss. Der WebKit-Bericht ist geschlossen, ab welcher iOS-Fassung es geht, steht nicht dabei
  ([WebKit 269292](https://bugs.webkit.org/show_bug.cgi?id=269292)). Auf dem Gerät prüfen.
- **Spieltempo** und **Zeitlupe** teilen sich die Zeitfaktor-Mechanik aus Bericht 13, §10.4; der Ton folgt (3.6).

### 6.5 Hören

- **Getrennte Lautstärken:** Musik und Geräusche (dazu Stimme, wenn Ozzy viel fiept). Prototyp 1 hat die Gruppen schon.
- **Mono:** iOS hat eine systemweite Mono-Einstellung ([`isMonoAudioEnabled`](https://developer.apple.com/documentation/uikit/uiaccessibility/ismonoaudioenabled));
  dass sie auch Web Audio zusammenmischt, nehme ich an (eigene Kenntnis), prüfen. Wichtiger: Keine Information nur in der
  Stereo-Richtung; das Rand-Bild zeigt die Seite.
- **Unterscheidbare Klänge:** Jedes wichtige Ereignis hat einen eigenen Klang (GAG). Tapp, Plumps und Scheppern dürfen sich nicht ähneln.
- **Stille ist erlaubt:** Musik, die beim Stehen schweigt, entlastet auch Menschen mit Hörgeräten und Konzentrationsproblemen.

### 6.6 Haptik als Ersatz

**Regeln** (Apple [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics), WWDC 2019
[Designing Audio-Haptic Experiences](https://developer.apple.com/videos/play/wwdc2019/810/), Xbox 110):

- Jede Haptik hat eine feste Ursache. Dasselbe Muster bedeutet immer dasselbe; ein Erfolgsmuster nie für eine Panne.
- Haptik passt zu Bild und Ton: Stärke und Schärfe wie die Bewegung (sanft und rund für weiche Momente, hart und klar für Stöße).
  Apples Beispiel ist genau unseres: Ein Sprung vom Baum fühlt sich stärker an als ein Hüpfer auf der Stelle.
- Sparsam: Was ständig vibriert, verliert seine Bedeutung. Kurze Haptik für einzelne Ereignisse; lange Haptik nur, wo sie das Spiel
  trägt (das Rumpeln).
- Abschaltbar und in der Stärke regelbar; das Spiel muss ohne Haptik vollständig verständlich sein.
- Kein Verzug zwischen Bild, Ton und Stoß; schon kleine Abstände zerstören den Eindruck einer gemeinsamen Ursache.

**Muster für Ozzy (Startwerte, „Stärke/Schärfe“ je 0 bis 1):**

| Ursache | Muster | Core Haptics |
|---|---|---|
| Rad dreht | Tick alle 5°, höchstens 15 je Sekunde; darüber ein leises Dauerrumpeln | kurze Einzelstöße 0,3/0,6; Dauerhaptik mit Live-Stärke |
| Landung | ein Stoß, Stärke nach Fallhöhe | Einzelstoß 0,3 bis 0,8 / 0,4 |
| Plumps | ein dumpfer, starker Stoß, Stärke nach Aufprall | Einzelstoß 0,6 bis 1,0 / 0,2 |
| Scheppern hinter dem Rand | drei harte Stöße im Rhythmus des Klangs | drei Einzelstöße 0,8/0,9 im Abstand von 90 ms |
| Platsch hinter dem Rand | weich anschwellend, dann abklingend | Dauerhaptik 0,5 s, Stärke als Kurve hoch und runter, Schärfe 0,1 |
| Musik stockt | fallende Kurve wie ein Bandstopp | Dauerhaptik 0,25 s, Stärke und Schärfe fallen |
| Runde geschafft | Erfolgsmeldung des Systems | `notification(success)` |

The Last of Us Part I zeigt, dass Haptik sogar Sprechweise übertragen kann; Apples „Music Haptics“ (seit iOS 18) bringt Musik als
Vibration, gilt aber nach Berichten nur für Musik mit Katalog-Kennung (Forenangabe, nicht geprüft) und hilft uns nicht.

### 6.7 Weitere Punkte

- **Text und VoiceOver:** Das Spiel ist eine Zeichenfläche; VoiceOver liest sie nicht. Menüs, Endkarte und Tagebuch sollten deshalb
  echter Text im DOM sein (oder ihn spiegeln), damit VoiceOver und große Schrift greifen (Apple, Accessibility). Ein Physik-Spiel blind
  spielbar zu machen, ist ein eigenes Projekt; ein erster Schritt wäre ein hörbares Kippen (Tonhöhe nach Balance) für Menschen mit
  geringer Sehkraft (Xbox 103 in umgekehrter Richtung).
- **Kontrast:** Ozzys Schwarz-Weiß ist ideal. Kein Spielzustand darf nur über Farbe laufen (die Tempofarben auf dem abgewickelten Band
  aus Bericht 13 sind Editor, nicht Spiel).
- **Einstellungen** gehören nicht in einen Bildschirm voller Schalter. Vorschlag: eine kleine Seite mit sechs gezeichneten Zeichen
  (Ton, Musik, Haptik, Bewegung, Steuerung, Tempo); Halten zeigt einen Satz Erklärung.
- **App-Store-Angaben:** Mit Abschnitt 6.3 kann die App „Bewegung reduzieren“ angeben. Die Angabe „Untertitel“ betrifft vor allem
  Sprache und Videos; Ozzy spricht nicht, für die Demo ist sie kaum von Belang.

---

## 7. Der Ton-Baustein in der Technik

### 7.1 Ergänzung zum Paketplan (Bericht 11, §12.1)

```text
packages/studio-ton        Klang-Daten (Klänge, Varianten, Musikstücke, Wechsel), Planung aus Ereignissen,       Planung ohne DOM,
                           Musik-Uhr (Schläge, Takte), Mischpult, Stimmen, Freischalten, Offline-Rendern        Ausgabe mit Web Audio
apps/ozzy-spiel/native     eine kleine Swift-Erweiterung: Sitzung, Haptik (Core Haptics), Systemschalter,       nur App
                           Unterbrechungen
```

- `studio-format` bekommt Klänge als Assets mit Herkunft und Lizenz (5.4).
- `studio-laufzeit` liefert nur **Ereignisse** (Ursache, Wer, Wo, Stärke, Schritt). Sie spielt nie selbst Ton.

### 7.2 Fluss

```text
Laufzeit (fester Takt, deterministisch)
   │  Ereignisse: Marke · Pose an/ab · Kontakt mit Stärke · Regler-Werte · Regeln
   ▼
Ton-Planung (studio-ton, kein DOM): Auswahl der Variante mit Saat je Ereignis, Lautstärke und Tonhöhe aus Drähten,
   Mindestabstand, Höchstzahl, Musik-Entscheidungen (Schicht, Stück, Stocken)
   │  Aufträge mit Zeit in Spielzeit
   ├──► Ton-Ausgabe (Web Audio): Vorausplaner auf der Audio-Uhr, Mischpult, Stimmen, Musik-Phrasen
   ├──► Haptik-Ausgabe (nur App): Brücke zur Swift-Erweiterung
   └──► Bild-Entsprechung (Renderer, Bericht 10): Rand-Bilder, Lautmalerei, wenn eingeschaltet
```

- **Tests:** Die Planung ist rein und lässt sich wie die Laufzeit testen; die Ausgabe wird wie in Prototyp 1 offline gerendert und
  am Pegel geprüft.
- **Rückblick:** Ereignisse aus der Aufnahme laufen durch dieselbe Planung, mit eigener Begrenzung (3.6).
- **Editor:** Studio benutzt dieselbe Ausgabe (Regel 3 aus Bericht 11, §12.2: der Editor zeigt immer die Laufzeit).

### 7.3 Die Swift-Erweiterung (ein Plugin, wie `liquid-glass`)

1. **Sitzung:** `ambient` mit `mixWithOthers` (wie Prototyp 1), auf Wunsch `playback` (offene Frage); Meldung, wenn eine andere App
   Musik spielt (`secondaryAudioShouldBeSilencedHint`).
2. **Haptik:** ein fester `CHHapticEngine` mit Neustart nach Rücksetzen; Einzelstöße mit Stärke und Schärfe; vorbereitete
   Stoß-Generatoren; Dauerhaptik über einen `CHHapticAdvancedPatternPlayer`, dessen Stärke live nachgeführt wird
   ([Doku](https://developer.apple.com/documentation/corehaptics/chhapticadvancedpatternplayer)); kleine Muster als AHAP.
3. **Systemschalter:** Bewegung reduzieren, Untertitel, Mono, jeweils mit Änderungsmeldung.
4. **Unterbrechungen:** Anruf, Siri, Ende der Unterbrechung → an die Seite melden.

### 7.4 Was aus Prototyp 1 übernommen wird

| Teil | Übernehmen | Ändern |
|---|---|---|
| Mischpult mit Gruppen, Begrenzer | ja | Gruppen: Geräusche, Welt, Stimme, Musik |
| Stimmen-Pools mit Verdrängen | ja | Höchstzahl je Klang dazu (FMOD) |
| Vorausplaner (25 ms, 100 ms) | ja | Musik-Uhr mit Schlägen und Takten dazu |
| Freischalten, Wachhund | ja | Wachhund prüft auch `currentTime`; `suspend()` und `resume()` als zweiter Versuch |
| Sitzung ambient | ja | — |
| Offline-Rendern für Tests | ja | — |
| prozedurale Klänge, generative Musik | als Platzhalter | — |
| `haptics.ts` | Muster der Verdrahtung | über die neue Erweiterung statt `@capacitor/haptics` |

---

## 8. Gegenüberstellungen

| Frage | Möglichkeiten | Urteil |
|---|---|---|
| Wo lebt der Ton technisch? | Web Audio in der eigenen Laufzeit; natives Audio-Plugin; FMOD für HTML5; Wwise im Web | **Web Audio**: eine Ausgabe für Editor, Safari und App, testbar, in Prototyp 1 erprobt. FMOD nur als Vorbild, Wwise im Web experimentell |
| Wie legt Florian Klang an? | eigene Linse „Ton“; eigener Ton-Editor mit Spuren; Klang-Chip an der Ursache | **Chip an der Ursache**, in jeder Linse sichtbar; Musik als eigene Karten-Reihe. Keine fünfte Linse, kein zweites Programm |
| Woran hängen Pfotentapps? | Marke im Gangzyklus; Kontakt am Fühler | **Kontakt**, weil die Physik die Pfote setzt; Marken für gestaltete Momente |
| Wie entsteht Abwechslung? | viele Dateien; eine Datei mit Streuung; beides | **drei bis fünf Aufnahmen plus leichte Streuung**, gemischt, nicht die letzten zwei |
| Wie reagiert die Musik? | nur horizontal (Stückwechsel); nur vertikal (Schichten); beides; Noten statt Aufnahmen | **beides:** Gangart über Schichten (schnell), Welt und Stimmung über Stücke (am Takt), Plumps sofort. Noten nur, wenn Musik Ozzys Schritt folgen soll |
| Was tut der Stummschalter? | ambient (Spiel schweigt); playback (spielt weiter, hält andere Musik an); ambient mit eigenem Schalter „Ton trotz Stumm“ | **ambient** wie Prototyp 1 und Apple; Bild-Entsprechungen für alle. Ein Schalter nur, wenn Florian ihn will |
| Wie werden Gags ohne Ton sichtbar? | Untertitel in Klammern; gezeichnete Lautmalerei; Rand-Bilder; Richtungsanzeige | **Rand-Bilder immer**, Lautmalerei als Schalter (automatisch bei iOS-Untertiteln), keine Klammern, keine Anzeige |
| Welche Haptik? | `@capacitor/haptics`; `@capawesome/capacitor-haptics`; eigene Swift-Erweiterung; Safari-Schalter-Trick | **zuerst `@capacitor/haptics`** (vorhanden) für Ticks und drei Stöße; **eigene Erweiterung**, sobald Stärke nach Fallhöhe und Rumpeln gefragt sind; Safari-Trick nein |
| Bewegung reduzieren? | nur Systemschalter; nur eigener Schalter; beides | **beides**, eigener Schalter gleich oder feiner (App-Store-Kriterium) |
| Kamera-Wackeln bei reduzierter Bewegung? | abschwächen; aus; ersetzen | **aus und ersetzen** (kurzer Stillstand, Aufprall-Linien) |
| Zeitlupe bei reduzierter Bewegung? | aus; bleibt | **bleibt**, ohne Zoom; als Spieltempo zugleich Hilfe |
| Steuerhilfen? | keine; Zwei Daumen; Ein-Tasten-Modus mit Tempo-Hilfe; Spieltempo | **alle als Schalter**, Ein-Tasten-Modus als Probe |
| Musik-Format und Speicher? | lange Stücke als Puffer; Stream über `<audio>`; Phrasen als Puffer; Noten mit Samples | **Phrasen als Puffer** (Stocken und Wechsel genau, Speicher klein), Ambiente gestreamt |
| Schleifen ohne Lücke? | MP3; AAC; WAV oder FLAC; Schleifenpunkte | **WAV oder FLAC**, oder AAC mit gesetzten Schleifenpunkten; kein MP3 |
| Woher kommen die Klänge? | Bibliotheken; Cartoon-Bibliothek kaufen; eigene Aufnahmen; prozedural; KI | **eigene Aufnahmen plus CC0 und lizenzfreie Bibliotheken**; prozedural als Platzhalter; Cartoon-Bibliothek, wenn Florian den Klassiker-Klang will; KI nur bezahlt und vorsichtig |
| Wer macht die Musik? | Auftrag; gemeinfrei selbst eingespielt; Bibliothek; generativ | offen (Florians Wahl); für Studio zählt nur, dass sie in Schichten und Phrasen auf einem Raster kommt |

---

## 9. Empfehlungen

1. **Klang als Chip an der Ursache** in die Bediengrammatik aufnehmen: Marke, Pose (ankommen, verlassen, solange), Kontakt, Regler,
   Regel. Zwei Regler zuerst (Lautstärke, Tonhöhe), „Mehr“ für Varianten, Streuung, Abstand, Höchstzahl, Gruppe. Keine eigene Linse.
2. **Marken mit Chance und Gewichtsschwelle** (Startwert 50 %), damit beim Überblenden nichts doppelt feuert und Ozzy nicht immer
   gleich klingt.
3. **Kontakte liefern Stärke**; Kennlinie Stärke → Lautstärke als Draht, drei Fächer (leise, mittel, hart), Schwelle gegen Klackern,
   Mindestabstand 70 ms. Pfotentapps hängen am Fühler.
4. **Musik als Karten und Wege:** Stücke mit Schichten in Phrasen, Wechsel mit Wechselstelle (sofort, Schlag, Takt, Phrase) und
   Übergangsstück, Stinger. Für Ozzy: Gangart → Schichten, Welt → Stück, Plumps → sofortiges Stocken, erster Schritt → Wiedereinsatz
   auf dem Schlag, Stehen → Stille.
5. **Dreiklang** in Studio vorschlagen (Klang, Bild, Stoß) und im **Prüfer** jeden spielrelevanten Klang ohne Bild melden. Im
   Prüfstand „Stumm spielen“, „Bewegung reduziert spielen“ und „Bluetooth fühlen“ anbieten.
6. **Ton-Sitzung `ambient`** wie im Hauptspiel; Rand-Bilder für jeden Gag hinter dem Rand; Lautmalerei als Schalter „Geräusche zeigen“,
   in der App automatisch an, wenn die iOS-Untertitel an sind.
7. **Start mit einem Tippen** (Weltwahl), damit Safari den Ton beim ersten Loslassen freigibt; Klänge vor der Freigabe verwerfen, nicht
   nachholen.
8. **Wachhund verbessern:** neben dem Zustand prüfen, ob `currentTime` läuft; bei Stillstand `suspend()` und `resume()`, dann auf die
   nächste Berührung warten.
9. **Formate:** AAC (`.m4a`) für Phrasen und lange Klänge, WAV oder FLAC für Schleifen, kein MP3 für Schleifen, Ogg erst nach Prüfung.
   Nacheinander entpacken; Budget 40 MB entpackt; Musik in Phrasen von 8 bis 16 s.
10. **Paket `studio-ton`** anlegen (Planung ohne DOM plus Web-Audio-Ausgabe) und Mischpult, Pools, Vorausplaner, Freischalten und
    Offline-Rendern aus Prototyp 1 übernehmen.
11. **Haptik in zwei Stufen:** zuerst `@capacitor/haptics` (Ticks, drei Stöße); dann eine eigene kleine Swift-Erweiterung mit Core
    Haptics für Stärke nach Fallhöhe, Rumpeln und Muster, zusammen mit Sitzung, Systemschaltern und Unterbrechungen. Haptik immer
    abschaltbar und in der Stärke regelbar.
12. **Bewegung reduzieren** nach der Tabelle in 6.3: Systemschalter plus eigener Schalter; Kamera-Wackeln, Line Boil, Zoom, Kreisen
    und Parallaxe ersetzen; Zeitlupe und Rad bleiben.
13. **Steuerhilfen als Schalter:** zwei Daumen, Halten als Umschalter, Ein-Tasten-Modus mit Tempo-Hilfe, Spieltempo, Glättung, ohne
    Uhr, Tastatur und Controller.
14. **Klänge selbst aufnehmen** (Geräusche und Ozzys Stimme) und mit CC0- und lizenzfreien Bibliotheken ergänzen; Herkunft und Lizenz
    je Klang speichern; NC-Lizenzen, BBC und Klänge ohne klare Lizenz ausschließen.
15. **Getrennte Lautstärken** für Musik und Geräusche; keine Information nur im Stereo; jedes wichtige Ereignis mit eigenem Klang.

**Kleine Proben (im Vordergrund, je mit vorher festgelegtem Kriterium):**

| Probe | Dauer | Kriterium |
|---|---|---|
| Latenz auf Florians iPhone: Audio-Lab von Prototyp 1 zeigt Basis- und Ausgabelatenz, mit und ohne AirPods | 5 min | Zahl notiert; Plumps fühlt sich mit Lautsprecher gleichzeitig an |
| Stumm-Probe der Demo: jemand spielt zum ersten Mal ohne Ton | 10 min | jeder Gag hinter dem Rand wird verstanden |
| Haptik-Probe in der App: drei feste Stöße gegen Stärke nach Fallhöhe | 10 min | Florian spürt den Unterschied und wählt |
| Musik-Probe: zwei Schichten, Plumps mit Bandstopp, Wiedereinsatz auf dem Schritt | 15 min | Florian lacht oder sagt, was fehlt |
| Bewegung-reduziert-Probe: Schalter an, eine Runde | 5 min | kein Wackeln, kein Zoom, alles verständlich |

---

## 10. Offene Fragen

**An Florian:**

1. **Ton und Musik schon in der Demo** (Frage 11 aus Bericht 13)? Wenn ja: zuerst nur Geräusche oder gleich mit Musik?
2. **Stumm:** Soll die Demo bei Stumm still sein wie das Hauptspiel (Bilder tragen die Gags), oder willst du einen Schalter „Ton trotz
   Stumm“?
3. **Lautmalerei:** Dürfen gezeichnete Wörter wie „PLATSCH“ ins Bild, oder nur Rand-Bilder ohne Text?
4. **Musik-Charakter:** Klavier wie bei der Gans, Cartoon-Orchester (Pizzicato, Xylophon, Tuba), eine Spieluhr oder etwas ganz anderes?
   Und: Soll die Musik Ozzys Schritt im Tempo folgen (dann aus Noten) oder in Stücken wechseln (dann aus Aufnahmen)?
5. **Wer macht die Klänge?** Selbst aufnehmen (wer spricht Ozzy?), eine Cartoon-Bibliothek kaufen oder jemanden beauftragen?
6. **Haptik:** schon in der Demo-App, und wie stark soll Ozzy „klopfen“?
7. **Bewegung reduzieren:** Ist der kurze Stillstand statt Kamera-Wackeln für dich als Ersatz in Ordnung?
8. **Ein-Tasten-Modus:** ausprobieren?

**Technisch (wir klären es selbst):**

1. Wie hoch sind Basis- und Ausgabelatenz von Web Audio auf dem iPhone 16, in Safari und in der App?
2. Wirken `AppDelegate`-Kategorie und `navigator.audioSession` in der WKWebView zusammen, oder gewinnt eine Seite?
3. Mischt die iOS-Mono-Einstellung auch Web Audio zusammen?
4. Wie groß ist die Verzögerung eines Stoßes über die Capacitor-Brücke mit vorbereitetem Generator?
5. Funktioniert die Gamepad-Schnittstelle in der Capacitor-WKWebView auf iOS 26?
6. Reicht `@capawesome/capacitor-haptics` für die Muster, oder braucht es gleich die eigene Erweiterung?
7. GEMA: Welche Folgen hätte eine Auftragskomposition durch ein GEMA-Mitglied für Spiel und Editor-Demo? Vor einem Auftrag klären.

---

## 11. Quellen

**Apple**

- Playing audio: https://developer.apple.com/design/human-interface-guidelines/playing-audio
- Playing haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Game controls: https://developer.apple.com/design/human-interface-guidelines/game-controls
- AVAudioSession, Kategorien: https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/ambient ,
  https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/soloambient ,
  https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback
- secondaryAudioShouldBeSilencedHint: https://developer.apple.com/documentation/avfaudio/avaudiosession/secondaryaudioshouldbesilencedhint
- UIFeedbackGenerator.prepare(): https://developer.apple.com/documentation/uikit/uifeedbackgenerator/prepare()
- impactOccurred(intensity:): https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/impactoccurred(intensity:)
- CHHapticAdvancedPatternPlayer: https://developer.apple.com/documentation/corehaptics/chhapticadvancedpatternplayer
- UICanvasFeedbackGenerator: https://developer.apple.com/documentation/uikit/uicanvasfeedbackgenerator
- NSHapticFeedbackManager: https://developer.apple.com/documentation/appkit/nshapticfeedbackmanager
- UIAccessibility: https://developer.apple.com/documentation/uikit/uiaccessibility/isreducemotionenabled ,
  https://developer.apple.com/documentation/uikit/uiaccessibility/isclosedcaptioningenabled ,
  https://developer.apple.com/documentation/uikit/uiaccessibility/ismonoaudioenabled
- WWDC 2019, Designing Audio-Haptic Experiences: https://developer.apple.com/videos/play/wwdc2019/810/
- App Store, Bewegung reduzieren: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria
- App Store, Untertitel: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/captions-evaluation-criteria
- Aktionstaste und Stumm: https://support.apple.com/105103
- Safari 18 Release Notes: https://developer.apple.com/documentation/safari-release-notes/safari-18-release-notes
- Safari 26 Release Notes: https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes
- Apple-Forum, Stumm aus einer Web-App erkennen: https://developer.apple.com/forums/thread/46461
- Apple-Forum, Haptik-Verzögerung: https://developer.apple.com/forums/thread/64734

**Web, WebKit und Normen**

- HTML, aktivierende Eingabe: https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event
- MDN, Autoplay: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- MDN, AudioSession.type: https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type
- MDN, Audio Session API: https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API
- W3C, Audio Session (Entwurf): https://w3c.github.io/audio-session/
- Web-Features, Audio Session: https://web-platform-dx.github.io/web-features-explorer/features/audio-session
- web.dev, A tale of two clocks: https://web.dev/articles/audio-scheduling
- WebKit, Safari 18.4: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/
- WebKit, Responsive Design for Motion: https://webkit.org/blog/7551/responsive-design-for-motion/
- WebKit-Berichte: https://bugs.webkit.org/show_bug.cgi?id=237322 (Web Audio und Stumm) ·
  https://bugs.webkit.org/show_bug.cgi?id=264473 (transient) · https://bugs.webkit.org/show_bug.cgi?id=273511 (interrupted) ·
  https://bugs.webkit.org/show_bug.cgi?id=240646 (WKWebView, Hintergrund) · https://bugs.webkit.org/show_bug.cgi?id=263627
  (Vordergrund, iOS 17) · https://bugs.webkit.org/show_bug.cgi?id=227636 (paralleles Entpacken) ·
  https://bugs.webkit.org/show_bug.cgi?id=214258 (latencyHint) · https://bugs.webkit.org/show_bug.cgi?id=228215 (MP3-Schleifen) ·
  https://bugs.webkit.org/show_bug.cgi?id=285120 (Schalter-Haptik) · https://bugs.webkit.org/show_bug.cgi?id=269292 (Gamepad in
  WKWebView)
- caniuse: https://caniuse.com/mdn-api_audiocontext_baselatency , https://caniuse.com/mdn-api_audiocontext_outputlatency
- Jake Archibald, Sounds fun: https://jakearchibald.com/2016/sounds-fun/
- unmute-ios-audio: https://github.com/feross/unmute-ios-audio ; Audjust: https://www.audjust.com/blog/unmute-web-audio-on-ios
- ios-haptics: https://unpkg.com/ios-haptics@3.1.1/README.md , https://unpkg.com/ios-haptics@3.3.0/README.md
- WKWebView-Brücke (2015): https://blog.persistent.info/2015/08/wkwebview-communication-latency.html
- WCAG 2.3.1: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html ;
  WCAG 2.3.3: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html

**Capacitor und Pakete**

- Capacitor Haptics: https://capacitorjs.com/docs/apis/haptics (Quelltext 8.0.2 im Repo unter
  `apps/game/node_modules/@capacitor/haptics/ios/`)
- CAPBridgeViewController (Capacitor 8.5.2, im Repo unter `apps/game/node_modules/@capacitor/ios/Capacitor/Capacitor/`):
  https://github.com/ionic-team/capacitor/blob/main/ios/Capacitor/Capacitor/CAPBridgeViewController.swift
- Native Audio: https://github.com/capacitor-community/native-audio
- Capawesome Haptics: https://capawesome.io/docs/sdks/capacitor/haptics/
- capacitor-rich-haptics: https://www.npmjs.com/package/capacitor-rich-haptics
- npm-Registry (Fassungen und Lizenzen, abgefragt am 20.11.2026): https://registry.npmjs.org/

**Werkzeuge und Middleware**

- Spine, Ereignisse: https://esotericsoftware.com/spine-events
- Rive, Audio-Ereignisse: https://rive.app/docs/editor/events/audio-events ; Audio-Assets: https://rive.app/docs/editor/assets/audio
- Unreal, Animation Notifies: https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine
- Unity, Audio Random Container: https://docs.unity.com/en-us/engine/6000.5/manual/audio/random-container/ui
- FMOD Studio 2.02: https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/parameters.html ,
  https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/authoring-events.html ,
  https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/working-with-instruments.html ,
  https://d1s9dnlmdewoh1.cloudfront.net/2.02/studio/advanced-topics.html
- FMOD HTML5: https://www.fmod.com/docs/2.02/api/platforms-html5.html ; Lizenz: https://fmod.com/licensing , https://fmod.com/legal
- Wwise: https://www.audiokinetic.com/en/blog/the-sound-design-of-clocker-part2 ,
  https://www.audiokinetic.com/qa/198/rtpc-tied-to-boys-speed , https://www.audiokinetic.com/qa/13928/web-export-with-godot
- Construct 3, Audio: https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/audio ; Opus:
  https://construct.net/en/blogs/construct-official-blog-1/opus-audio-construct-891
- Box2D: https://box2d.org/documentation/md_simulation.html , https://box2d.org/documentation/group__events.html
- Designing Sound, Physik-Audio: https://designingsound.org/2010/04/14/audio-implementation-greats-7-physics-audio-part-2/

**Spiele, Musik, Komik**

- Untitled Goose Game, Game Developer: https://gamedeveloper.com/audio/getting-goosey-with-debussy-creating-an-adaptive-score-for-i-untitled-goose-game-i-
- Dan Golding, DiGRAA 2020: https://digraa.org/wp-content/uploads/2020/01/DiGRAA_2020_paper_47.pdf
- FMOD-Interview zu Untitled Goose Game: https://www.fmod.com/blog/untitled-goose-game-interview
- Mixdown, Dan Golding: https://mixdownmag.com.au/features/dan-golding-untitled-goose-game/
- Mickey Mousing: https://en.wikipedia.org/wiki/Mickey_Mousing ; Treg Brown: https://en.wikipedia.org/wiki/Treg_Brown
- AirPods-Latenz: https://9to5mac.com/2019/12/22/airpods-latency-test/ ,
  https://www.notebookcheck.net/AirPods-Pro-2-Apple-s-latest-TWS-earbuds-offer-significantly-lower-Bluetooth-latency-than-their-predecessors.670224.0.html
- Spielen ohne Ton: https://blog.tapresearch.com/how-sound-preferences-impact-player-engagement (nicht mehr erreichbar) ,
  https://destructoid.com/73-of-mobile-gamers-play-with-the-volume-on

**Barrierefreiheit**

- Xbox Accessibility Guidelines: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103 ,
  https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/105 ,
  https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/110 ,
  https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/ ,
  http://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-sounds-alone/ ,
  http://gameaccessibilityguidelines.com/provide-captions-or-visuals-for-significant-background-sounds/ ,
  https://gameaccessibilityguidelines.com/provide-very-simple-control-schemes-that-are-compatible-with-assistive-technology-devices-such-as-switch-or-eye-tracking/ ,
  https://gameaccessibilityguidelines.com/celeste-assist-mode
- The Last of Us Part I, Barrierefreiheit: https://blog.playstation.com/2022/08/26/the-last-of-us-part-i-full-list-of-accessibility-features/
- The Last of Us Part II, Barrierefreiheit: https://www.playstation.com/en-us/games/the-last-of-us-part-ii/accessibility/
- Fortnite, Barrierefreiheit: https://www.epicgames.com/help/en-US/c-Category_Fortnite/c-Fortnite_Gameplay/are-there-any-accessibility-settings-for-fortnite-a000088596

**Klangquellen und Lizenzen**

- Sonniss GDC Bundle: https://sonniss.com/gdc-bundle-license/
- Freesound FAQ: https://freesound.org/help/faq/
- Kenney: https://kenney.nl/assets/rpg-audio
- Pixabay: https://pixabay.com/service/license-summary/
- BBC Sound Effects (Zusammenfassung der Lizenz): https://www.musicradar.com/news/the-bbc-is-letting-you-download-more-than-16000-free-sound-effect-samples-from-its-archive
- Hanna-Barbera Sound Effects Library: https://sound-ideas.com/products/hanna-barbera-sound-effects-library
- ElevenLabs: https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform ,
  https://elevenlabs.io/sound-effects-terms
- ZzFX: https://www.npmjs.com/package/zzfx

**Im Repo**

- Prototyp 1, Ton: `apps/game/src/audio/` (`engine.ts`, `graph.ts`, `music.ts`, `settings.ts`); Haptik: `apps/game/src/native/haptics.ts`
- `docs/IOS.md`, Abschnitte 3 (Haptik) und 8 (Ton und Stummschalter)
- Nachbarberichte dieses Ordners: 01, 02, 05, 08, 09, 10, 11, 12, 13
