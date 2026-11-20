# Nachtrag 14: Spiellogik ohne Code (Recherche, 20.11.2026)

**Frage.** Welches eine Logikmodell können Nicht-Programmierer nachweislich bauen und auf Fehler prüfen, und nach welchen Regeln
läuft es ab? Verglichen werden Ereignisblätter und Verhaltensbausteine (Construct, GDevelop), der Zustandsautomat mit Datenbindung
(Rive), die Logik-Bauteile von Dreams und LittleBigPlanet, Regeln am Objekt (Super Mario Maker), Auslöser und Reaktion (ProtoPie)
sowie Verhaltensbäume und nutzenbasierte Auswahl für Begleiter mit Eigenwillen (Trico, Nintendogs, Untitled Goose Game).

**Warum ein Nachtrag.** Sechs Berichte skizzieren sechs Logikmodelle: 02 einen Graphen wie Rive, 05 Regeln je Pose und
Auswahltabellen, 08 die „Absicht“ als Zustandsautomat, 09 Sensor-Zonen mit „wenn berührt → Aktion“, 12 Drähte und Sätze, 13
Verhaltens-Vorlagen mit Launen- und Ereignis-Karten. Ohne ein gemeinsames Ausführungsmodell streiten Laune, Spielerwunsch und Physik
um dieselbe Figur. Dieser Bericht legt das eine Modell fest: Reihenfolge, Vorrang, Unterbrechen, erneutes Auslösen, Zufall mit Saat,
Sichtbarkeit, den Auslöser des Stolperns und die Anbindung von Aufgaben, Zählern, Kamera, Ton und Effekten.

**Was hier nicht wiederholt wird.** Rives Zustände, Übergänge und Datenbindung stehen in Bericht 02 (1.8, 1.9), Posen, Wege und
Trägheits-Übergänge in 05, die Physik des Stolperns in 08 (6.1), Sensoren und fester Takt in 09, ProtoPie und Construct aus Sicht
der Bedienung in 12 (2.6, 2.8), Launen-Katalog und Demo in 13. Hier geht es um die Ausführung und um die Belege.

---

## Kurzfassung

1. **Die stärksten Belege gibt es für Wenn-dann-Regeln an Dingen, nicht für Graphen.** In einer Online-Studie bauten Laien ohne
   Programmiererfahrung solche Regeln so gut wie Programmierer; 78 % der gewünschten Abläufe passten in einen Auslöser und eine
   Aktion (Ur u. a., CHI 2014). Von 346 Kodu-Programmen von Nutzern hatten 58 % mindestens eine Figur mit mehreren „Seiten“, also
   selbst gebaute Zustandsautomaten aus Regeln (Stolee und Fristoe 2011). Super Mario Maker zeigt die größte Breite: über
   26 Millionen Kurse bis Mai 2021, deren Logik ganz in den Teilen steckt.
2. **Die Fehler solcher Regeln sind bekannt und vorhersehbar.** Laien verwechseln Ereignis („sobald“) und Zustand („solange“):
   Bei einer Regel mit einem Ereignis erwarteten 75,8 % den sofortigen Start, bei einer Regel mit einem Zustand nur 36,7 %. Sie
   vergessen, dauerhafte Aktionen zurückzunehmen (Huang und Cakmak 2015). Eine Studie mit 153 Personen fand zehn Fehlerklassen,
   von denen acht das Vorhersagen messbar erschwerten; vier lassen sich beim Bearbeiten erkennen, zwei nur im Lauf (Brackenbury
   u. a., CHI 2019). Daraus folgen zwei getrennte Satzarten und ein Prüfer.
3. **Graphen und Drähte sind lernbar, aber schwer zu prüfen.** Bei Rive nennen Bewertungen den Zustandsautomaten den schwersten Teil
   (Bericht 02). Dreams und LittleBigPlanet sind leicht im Einstieg, aber schwer zu beherrschen. Ersteller verzögern Signale um Bilder,
   damit sich Logik nicht überlappt; Haltepunkte fehlten 2019. Ein Graph taugt für uns nur als Ansicht.
4. **Fertige Bausteine tragen die Schwere.** GDevelop, Construct, Fortnite-Geräte und Mario-Maker-Teile verpacken Bewegung und
   Physik in Bausteine mit Reglern, Zuständen und Ereignissen (Construct: „beim Landen“, „fällt“). Sie laufen an einem festen Platz
   im Takt, vor oder nach den Regeln.
5. **Vorschlag: ein Modell „Bausteine, Drähte, Karten“.**
   - **Bausteine** (Vierbeiner, Rad, Ding, Zone, Zähler, Kamera, Uhr) bringen Regler, Messwerte, Zustände, Ereignisse und Befehle mit.
   - **Drähte** koppeln stetig: Messwert → Regler über eine Kennlinie.
   - **Karten** gibt es in genau drei Arten: „Sobald …“ (Ereignis, feuert einmal), „Solange …“ (Zustand, hält und gibt von selbst
     zurück) und „Laune …“ (Ankündigung, Wirkung, Ende, Ruhezeit).
6. **Vorrang über fünf sichtbare Bänder:** Körper (Reflexe aus der Physik) vor Regie vor Spieler vor Laune vor Grundverhalten. Im
   Band gewinnt die obere Karte. Vorbilder sind Kodu (die frühere Regel gewinnt), Halo 2 (Prioritätsliste), Zoo Tycoon 2 (erst Rang,
   dann Gewicht) und die Subsumptions-Architektur.
7. **Ein fester Takt mit Schnappschuss.** Alle Bedingungen werden gegen denselben Stand geprüft, dann wird je Kanal aufgelöst, dann
   wird gehandelt. Was eine Aktion auslöst, gilt im nächsten Takt (1/60 s). Kodu prüft ebenfalls erst alle Bedingungen und handelt
   dann. Construct arbeitet die Ereignisse dagegen der Reihe nach ab, und Nutzer stolpern über die Reihenfolge.
8. **Stolpern löst die Physik aus.** Die gemessenen Auslöser aus Bericht 08 stecken im Baustein Vierbeiner. Die geschriebenen
   Schwellen-Regeln aus 05 und 12 („wenn Tempo über 1,2 → Stolpern“) entfallen. Karten reagieren auf „sobald Ozzy stolpert“. Die
   Regie darf ein Stolpern anfordern; der Baustein führt es physikalisch aus. Die Schwellen sind Regler.
9. **Unterbrechen:** Ein höheres Band unterbricht sofort, über den Trägheits-Übergang aus 05. Gleiche Bänder unterbrechen sich nie,
   das verhindert Zappeln. Ein laufender Weg folgt seiner eigenen Einstellung (sofort, am nächsten Halt, nie). **Erneutes
   Auslösen:** Ereignis-Karten feuern je Ereignis; Schwellen-Karten erst wieder nach dem Rückweg unter eine zweite Linie; Launen haben
   Ruhezeiten.
10. **Zufall:** eine Saat je Lauf, getrennte Ströme je Quelle und je Karte, abgeleitet über eine Mischfunktion, ein guter Generator.
    Gewürfelt wird nur bei Entscheidungen. Slay the Spire zeigt zwei Fallen: Dieselbe Saat für alle Ströme koppelt die Ergebnisse.
    Saat plus Kennzeichen mit einem linearen Generator koppelt sie auch; der Nachfolger hat das im Juni 2026 behoben.
11. **Sichtbarkeit:**
    - Karten leuchten je nach Lage: wartet, erfüllt, feuert, gewinnt, überstimmt.
    - Über Ozzy zeigt eine kleine Gedankenblase Laune und Phase, nur im Editor.
    - Unter der Bühne läuft ein Werteverlauf mit Schwellen und Ereignismarken.
    - An jeder Änderung gibt es „Warum?“ und „Warum nicht?“. Mit der Whyline wurde die Fehlersuche fast achtmal schneller, bei
      kleiner Stichprobe.
    - Dazu Zurückspulen, Einzelschritt und Anhalten an einer Karte.
12. **Anbindung:**
    - **Aufgaben** sind Sätze über Zähler, wie Mario Makers Bedingungen. Sie brauchen einen Beweis-Lauf, wie Mario Makers Pflicht,
      den eigenen Kurs zu schaffen.
    - **Kamera** ist ein Wunsch mit Band, wie bei Cinemachine: Der höchste Vorrang gewinnt, überblendet wird mit Standard plus
      Ausnahmen.
    - **Ton und Effekte** sind Einmal-Aktionen an Ereignissen; **Musik** ist ein Kanal.
13. **Launen bieten die Dinge an**, so wie bei The Sims die Dinge werben. Gewählt wird nach Rang und Gewicht (Dual-Utility). Jede
    Laune kündigt sich am Körper an. In F.E.A.R. galt: Was die Figur nicht ankündigt, hat für den Spieler nicht stattgefunden.
14. **Der Prototyp hat die Naht schon.** `HaltungsSteuerung.setzen(ziel, art)` trennt „die Logik nennt das Ziel“ von „der Weg formt
    den Übergang“. Es fehlen ein fester Takt (heute Bildzeit aus `requestAnimationFrame`), Ereignisse aus Wegen und ein Protokoll.

---

## 1. Auftrag und Abgrenzung

### 1.1 Die sechs Skizzen

| Bericht | Skizziertes Modell | Kernbegriffe |
|---|---|---|
| 02 Rive | Graph wie Rive, vorgefertigte Graphen | Any State, Exit Time, Zufallsgewichte, View Models, Konverter, Zuhörer |
| 05 Posen | Regeln je Pose, Auswahltabelle wie Unreals Chooser | Spielwerte, Verbindungen (Kennlinie), Auslöser starten Wege, Ereignisse im Weg |
| 08 Figurenphysik | „Absicht“ als Zustandsautomat über der Physik | Sollwerte, gemessene Stolper-Auslöser, Zustände Stehen bis Schütteln |
| 09 Physik-Engines | Sensor-Zonen | „wenn berührt / wenn stärker als / wenn gebrochen → Aktion“ |
| 12 Bedienung | Drähte für Kopplungen, Sätze für Ereignisse | ProtoPie Chain und Range, Spielen auf derselben Bühne |
| 13 Spieldesign | Verhaltens-Vorlagen, Launen-Karten, Ereignis-Karten | Vierbeiner, Ankündigung, Zähler, Kamera-Regeln |

Die Skizzen widersprechen sich weniger, als es aussieht: Alle trennen **stetige Kopplung** (Kennlinie, Draht, Bindung) von
**Ereignis mit Folge** (Auslöser, Satz, Karte), und alle wollen fertige Verhalten für den Körper. Offen sind die Ausführung (was
zuerst, wer gewinnt) und die Form, in der Florian Logik baut (Graph, Liste, Karten am Ding).

### 1.2 Unser Fall

- Ein Art Director ohne Programmierkenntnisse, der mit dem Auge entscheidet, an Mac und iPad baut und auf dem iPhone prüft.
- Eine Spielfigur mit Physik (Rad, Hang, Stolpern, Sturz), gezeichneten Posen und Wegen (Bericht 05) und Launen mit Ankündigung
  (Bericht 13).
- Die Demo „Gassirunde“ soll komplett im Editor entstehen (Bericht 13, Abschnitt 10). Logik darf also kein Code sein, muss aber
  Aufgaben, Zähler, Kamera, Ton und Effekte tragen.
- Arbeitsregel 7: keine Sonderregel, die einen Körper oder eine Lage nennt.

---

## 2. Was die besten Programme und Verfahren tun

### 2.1 Ereignisblätter und Verhaltensbausteine: Construct, GDevelop

**Mechanik in Construct** ([How events work](https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/events/how-events-work)):

- Jedes Ereignis wird **einmal je Takt** geprüft (rund 60-mal je Sekunde), von oben nach unten. Innerhalb eines Ereignisses laufen
  Bedingungen und Aktionen ebenfalls von oben nach unten. Gezeichnet wird erst nach dem ganzen Durchlauf.
- **Bedingungen wählen Exemplare aus:** Jedes Ereignis beginnt mit allen Exemplaren eines Objekts. Jede Bedingung engt die Auswahl
  ein, die Aktionen wirken nur auf die übrigen. Unterereignisse erben die Auswahl ihres Elternereignisses.
- **Auslöser** (grüner Pfeil, etwa „bei Tastendruck“, „bei Kollision“) laufen nicht in der Reihenfolge des Blatts, sondern wenn sie
  eintreten. Untereinander laufen sie von oben nach unten.
- **„Trigger once while true“** macht aus einer Bedingung, die jeden Takt gilt, eine Flanke: Das Ereignis läuft einmal, wenn die
  Bedingung wahr wird ([System conditions](https://www.construct.net/en/make-games/manuals/construct-3/system-reference/system-conditions)).
  Laut Forum schärft es sich erst wieder, wenn die Bedingung falsch war. Es gilt für das ganze Ereignis, nicht je Exemplar; Nutzer
  stolpern darüber ([Forum](https://construct.net/en/forum/construct-2/how-do-i-18/quottrigger-once-truequot-73128)).
- **Verhalten** (Platform, Physics, Bullet …) rechnen an festen Plätzen im Takt: `_tick()` kurz vor den Ereignissen, `_tick2()` kurz
  danach ([Addon-SDK](https://www.construct.net/make-games/manuals/addon-sdk/runtime-reference/base-classes/sdkbehaviorinstancebase)).
  Das Verhalten Platform bringt Regler (Höchsttempo, Sprungkraft, Schwerkraft), Zustände („ist am Boden“, „fällt“, „springt“) und
  Auslöser („beim Sprung“, „beim Landen“, „beim Fallen“) mit ([Platform](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/platform)).
- **Zufall:** Das Plugin „Advanced Random“ nimmt eine Saat. Mit „Replace system random“ wird der ganze Zufall der Laufzeit
  wiederholbar, allerdings aus einem gemeinsamen Strom ([Advanced Random](https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/advanced-random)).
- **Fehlersuche:** Der Debugger hält an, geht ein Bild weiter (mit der Zeit eines 60-Hz-Bilds), speichert und lädt Zwischenstände
  und hat **Haltepunkte an Ereignis, Bedingung oder Aktion**. Beobachten und Profiler gibt es nur im Bezahlplan
  ([Debugger](https://www.construct.net/en/make-games/manuals/construct-3/interface/debugger)).

**Mechanik in GDevelop:**

- Ereignisse laufen jedes Bild von oben nach unten. „Trigger once“ merkt sich, ob die Bedingungen davor im letzten Bild galten.
  Auch hier gilt es **nicht je Exemplar**: Hat eines die Bedingung erfüllt, feuert sie für andere nicht mehr
  ([Trigger once](https://wiki.gdevelop.io/gdevelop5/all-features/advanced-conditions/trigger-once/)).
- **Eigene Verhalten aus Ereignissen:** `doStepPreEvents` läuft jedes Bild vor den Ereignissen der Szene, `doStepPostEvents`
  danach. Das Handbuch empfiehlt „vorher“, damit die Szene auf das Verhalten reagieren kann. Eigenschaften erscheinen als Regler,
  wenn man das Verhalten an ein Objekt hängt; eigene Bedingungen und Aktionen erscheinen im Ereignis-Editor
  ([Custom behaviors](https://wiki.gdevelop.io/gdevelop5/behaviors/events-based-behaviors)). So bauen Gestalter mit Verhalten, deren
  Innenleben ein anderer geschrieben hat.
- **Fehlersuche:** Der Debugger zeigt und ändert globale, Szenen- und Exemplar-Variablen und hat einen Profiler. Haltepunkte an
  Ereignissen sind im Forum gefragt, aber nicht bestätigt ([Debugger](https://wiki.gdevelop.io/gdevelop5/interface/debugger/)).

**Stärken:**

- Logik liest sich als Sätze.
- Verhalten nehmen die schwere Arbeit ab, ihre Regler sind sichtbar.
- Construct hat den reifsten Debugger dieser Gruppe.

**Schwächen:**

- **Die Reihenfolge ist Programmlogik.** Weil ein späteres Ereignis die Änderungen eines früheren im selben Takt sieht, ändert
  Verschieben das Verhalten. Ein Forumsfaden zeigt genau diese Verwirrung
  ([Forum](https://construct.net/en/forum/construct-2/how-do-i-18/why-order-events-affect-119584)).
- Lange Blätter werden unübersichtlich.
- Die Flankenbedingung ist ein eigener Baustein, den man kennen muss, und sie wirkt nicht je Exemplar.
- Für Unterricht und Einstieg loben Lehrkräfte die Ereignisse
  ([Common Sense Education](https://www.commonsense.org/education/reviews/construct-3)). Eine kontrollierte Studie zu Ereignisblättern
  habe ich nicht gefunden.

**Für uns:** Die Verhaltensbausteine übernehmen wir ganz (Bausteine mit Reglern, Zuständen, Ereignissen, Befehlen und festem Platz
im Takt), ebenso die Haltepunkte und das Einzelbild. Die Reihenfolge als Programmlogik übernehmen wir nicht.

### 2.2 Zustandsautomat mit Datenbindung: Rive

Die Bedienung steht in Bericht 02. Für die Ausführung ist der offene Laufzeitcode die genaueste Quelle
([state_machine_instance.cpp](https://github.com/rive-app/rive-runtime/blob/main/src/animation/state_machine_instance.cpp), am
20.11.2026 gelesen):

- **Ebenen** laufen in der Reihenfolge ihres Index. Belegen zwei Ebenen dieselbe Eigenschaft, gewinnt die untere der Liste
  ([Layers](https://rive.app/docs/editor/state-machine/layers)).
- **Je Ebene** prüft die Laufzeit zuerst die Übergänge aus „Any State“, dann die des aktuellen Zustands. Es gewinnt **der erste
  erlaubte Übergang in der Liste**.
- **Während eines Übergangs** wechselt der Zustand nicht, außer „Verlassen während des Übergangs“ ist erlaubt.
- **Mehrere Übergänge im selben Schritt** dürfen sich verketten, bis zu 100-mal; danach meldet die Laufzeit einen Fehler.
- **Zufälliger Ausgang:** Gewichte werden summiert, gewürfelt wird über die Summe. Der Zufallsgenerator wird beim Start mit der Uhr
  gesät; nur im deterministischen Modus mit 1. Ein zufälliger Ausgang ist also ohne diesen Modus nicht wiederholbar.
- **Ereignisse** werden je Schritt gesammelt und abgearbeitet, ebenfalls mit einer Obergrenze von 100 Durchgängen. Was dabei neu
  gemeldet wird, kommt in den nächsten Durchgang.
- **Takt:** Rives C++-Anleitung empfiehlt einen festen Zeitschritt, weil Zustandsautomaten bei festem Schritt numerisch
  wiederholbar sind ([C++-Laufzeit](https://rive.app/docs/runtimes/cpp/state-machines)).

**Eine bekannte Falle bei Unity:** Ein Übergang aus „Any State“ wird auch geprüft, wenn man schon im Ziel ist. Mit „Can Transition To
Self“ startet die Animation dann jedes Bild neu, solange die Bedingung gilt
([Unity-Forum](https://discussions.unity.com/t/how-to-keep-anystate-in-animator-from-interrupting-itself/224204),
[API](https://docs.unity3d.com/500/Documentation/ScriptReference/Animations.AnimatorStateTransition-canTransitionToSelf.html)).
Das ist die Fehlerklasse „wiederholtes Auslösen“ (Abschnitt 3.3) in einem großen Werkzeug.

**Stärken:**

- Der aktive Zustand ist im Editor sichtbar; die Vorschau läuft wie zur Laufzeit.
- Die Datenbindung trennt Daten von Darstellung.
- Die Regeln sind klar: Any State zuerst, Listenreihenfolge, untere Ebene gewinnt.

**Schwächen:**

- Die Lernkurve: Grundlagen lernt man in Stunden, den Zustandsautomaten in Tagen (Bericht 02, 1.12).
- Die Regeln sind über drei Orte verteilt (Ebenenliste, Übergangsliste je Zustand, Häkchen je Übergang).
- Zufall ist ohne Sondermodus nicht wiederholbar.
- Rives eigener Rat lautet, keine „Spaghetti“-Automaten zu bauen (Bericht 05, 2.2).

**Für uns:** Die Regeln übernehmen wir als Rangfolge (zuerst „überall“, dann „gilt in“, die Liste entscheidet) und die Obergrenze für
Ketten. Den Graphen als Ort des Bauens übernehmen wir nicht.

### 2.3 Logik-Bauteile mit Drähten: Dreams und LittleBigPlanet

**Dreams** ([Logic and processing](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/logic-and-processing)):

- **Bauteile:** Gatter (UND, ODER, XOR, NICHT), Zähler, Zeitgeber, Wähler, Rechner, Zufallsverteiler (schickt ein Signal an einen
  zufälligen Ausgang), Signalformer (Bereich, Glätten, Flanken) und Variablen, die zwischen Szenen erhalten bleiben können.
- **Mikrochips** fassen Bauteile zusammen.
- **Signale** sind an/aus oder Zahlen; „dicke Drähte“ tragen mehrere Werte zugleich.

**LittleBigPlanet 2 und 3:**

- Gatter mit 2 bis 20 Eingängen, eine Batterie mit Ausgang von −100 % bis 100 % (also analoge Signale), Sensoren nach Stärke oder
  Nähe ([Prima-Handbuch](https://primagames.com/eguides/little-big-planet-3-signature-series-strategy-guide/create-tools-quick-reference-the-tools-bag/gadgets)).
- Das Studio schrieb selbst, dass in großen Projekten endlos ineinander geschachtelte Mikrochips entstehen
  ([Media Molecule](https://www.mediamolecule.com/blog/article/emails_from_the_molecule_how_powerful_is_lbp_electronics)).
- Spieler bauten über acht Millionen Level
  ([GamesRadar](https://www.gamesradar.com/how-littlebigplanet-2s-sackcloth-brilliance-inspired-the-creation-of-eight-million-levels)).

**Ausführung:** Die Reihenfolge der Auswertung innerhalb eines Bilds ist öffentlich nicht beschrieben. Im Forum berichten Ersteller,
dass sie Signale um ein oder zwei Bilder verzögern, damit sich Logik nicht überlappt, und dass jede Funkstrecke ein Bild Verzögerung
hinzufügt ([Forum](https://forums.indreams.me/hc/it/community/posts/5551411508765-Gadget-way-for-delaying-onset-and-offset-of-signals),
nur über die Suche gelesen). 2019 klagte ein Ersteller, dass man laufende Logik weder anhalten noch mit Haltepunkten prüfen könne
([Reddit](https://www.reddit.com/r/PS4Dreams/comments/do3h2q/have_mm_included_debugging_tools_for_logic_yet/)); ob sich das
geändert hat, habe ich nicht geprüft.

**Urteil der Bewertungen:**

- Der Einstieg ist dank vieler Anleitungen erstaunlich leicht, die Decke sehr hoch
  ([Birth.Movies.Death.](https://birthmoviesdeath.com/2020/03/11/dreams-game-review-a-breathtaking-call-to-creativity.html)).
- Gewünscht werden feinere Anleitungen „für fast alles mit Logik“ ([Destructoid](https://www.destructoid.com/reviews/early-access-review-dreams/)).
- Steile Lernkurve beim Erschaffen ([Common Sense Media](https://www.commonsensemedia.org/game-reviews/dreams)).

**Nintendos Game Builder Garage** (2021) arbeitet ebenfalls mit Knoten und Drähten („Nodon“). Es führt durch sieben geführte
Lektionen; Bewertungen loben den Einstieg, finden es aber auch nach vielen Stunden noch schwer, bestimmte Dinge umzusetzen
([Nintendo Life](https://www.nintendolife.com/reviews/nintendo-switch/game_builder_garage),
[VGC](https://videogameschronicle.com/review/game-builder-garage)).

**Stärken:**

- Man sieht und greift jedes Teil.
- Analoge Signale verbinden Logik und Bewegung ohne Umweg.
- Am Controller ohne Tastatur bedienbar.

**Schwächen:**

- Die Reihenfolge ist unsichtbar; Verzögerungen werden zum Werkzeug.
- Viele Drähte werden zum Knäuel; Ordnung schafft nur Disziplin (Mikrochips, Knoten).

**Für uns:** Den Draht als stetige Kopplung übernehmen wir (wie 12), dazu den Signalformer (Bereich, Glätten, Flanke) und die
Mikrochips als „Bausteine“. Logik als Drahtgeflecht übernehmen wir nicht.

### 2.4 Regeln am Objekt: Super Mario Maker, Fortnite-Geräte, RPG Maker

**Super Mario Maker:**

- **Logik steckt in den Teilen.** Gegner bekommen Flügel, wachsen mit einem Pilz oder werden gestapelt; Gefahren kommen aus Blöcken
  und Röhren; Kanonen feuern gewählte Dinge ([Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_Maker)).
- **Prüfung:** Ein Kurs muss bis zum Ende gespielt sein, bevor er hochgeladen wird. Teil 2 ergänzt Bedingungen wie „mit so vielen
  Münzen“ oder „als Super Mario ins Ziel“; auch dann muss man den Kurs mit Bedingung selbst schaffen
  ([Shacknews](https://shacknews.com/article/112654/how-to-set-clear-conditions-in-super-mario-maker-2),
  [Prima](https://primagames.com/tips/how-set-super-mario-maker-2-clear-conditions)).
- **Die Breite:** über 7 Millionen Kurse bis Mai 2016 im ersten Teil, über 26 Millionen bis Mai 2021 im zweiten
  ([Nintendo Life](https://www.nintendolife.com/news/2021/05/super_mario_maker_2_players_have_now_uploaded_more_than_26_million_courses)).
- **Grenze:** Die Prüfung beweist nur, dass ein Kurs schaffbar ist, nicht, dass er fair ist. Kotaku bemerkte, man könne nichts
  bauen, was über das eigene Können hinausgeht ([Kotaku](https://kotaku.com/1728229196)).

**Fortnite Creative:**

- Fortnite hat die nummerierten Kanäle zwischen Geräten durch **direkte Ereignisbindung** ersetzt.
- Jedes Gerät hat einen Reiter „Ereignisse“ und einen Reiter „Funktionen“. Man bindet das Ereignis eines Geräts an die Funktion
  eines anderen, etwa „bei Benutzung“ eines Knopfs an „Einschalten“ einer Lampe.
- Grund laut Epic: Kanäle gingen auf großen Inseln aus, mussten vorab geplant werden, und Kopien brauchten Handarbeit
  ([Epic](https://dev.epicgames.com/documentation/fortnite-creative/getting-started-with-direct-event-binding-in-fortnite-creative)).
- Ein Auslöser-Gerät hat genau eine Ereignisart („beim Auslösen“) und zwei Funktionen
  ([Trigger](https://dev.epicgames.com/documentation/fortnite/using-trigger-devices-in-fortnite-creative)).

**RPG Maker:** Ein Ereignis hat Seiten mit Bedingungen. Gelten mehrere, wird **die Seite mit der höchsten Nummer** benutzt
([RPG Maker MZ](https://rpgmakerofficial.com/product/MZ_help-en/01_09_03.html)). Eine einzige, gut sichtbare Vorrangregel genügt
seit Jahrzehnten einer großen Laien-Gemeinde.

**Stärken:**

- Nichts ist zu verkabeln, was ein Teil von selbst kann.
- Die Prüfung ist Spielen.
- Die Regel liegt dort, wo das Ding steht.

**Schwächen:**

- Der Ausdruck ist auf das begrenzt, was die Teile anbieten.
- Neue Ideen brauchen neue Teile, also Programmierer.

**Für uns:** Das ist das Muster für Dinge der Welt. Duftstelle, Pfütze und Stamm tragen ihre Regeln selbst; Florian setzt sie auf den
Rand. Dazu kommt ein Beweis-Lauf je Aufgabe.

### 2.5 Auslöser und Reaktion: ProtoPie (mit einem Seitenblick auf GameSalad)

**ProtoPie** ([Triggers](https://www.protopie.io/learn/docs/interactions/triggers)):

- **Range** feuert einmal, wenn ein Wert in einen Bereich eintritt, und erst wieder nach erneutem Eintritt.
- **Chain** koppelt eine Eigenschaft über zwei Bereiche an eine andere.
- **Detect** reagiert auf jede Änderung.
- Variablen lassen sich mit einem Käfer-Symbol **auf der Leinwand und in der Vorschau anzeigen**; Nutzer nennen das eine Hilfe beim
  Verfolgen von Werten ([Variables](https://www.protopie.io/learn/docs/variables/getting-started)).
- Bewertungen loben, dass Gestalter ohne Code bauen. Sie nennen aber eine steile Lernkurve bei Bedingungen, Variablen und Formeln
  ([G2](https://www.g2.com/products/protopie/reviews), [Capterra](https://www.capterra.com/p/201192/ProtoPie/reviews)).

**GameSalad** trennt dieselben Arten ausdrücklich, nach Forumsauskünften:

- Eine Regel feuert einmal, wenn ihre Bedingung erstmals gilt.
- „Change Attribute“ setzt einmal, „Constrain Attribute“ setzt jedes Bild
  ([Forum](https://forums.gamesalad.com/discussion/comment/461497), [Forum](https://forums.gamesalad.com/discussion/comment/401133)).

**Für uns:** Zwei Werkzeuge zeigen unabhängig voneinander dieselbe Dreiteilung: einmal bei Eintritt (Flanke), dauernd (Bindung),
bei jeder Änderung. Die Anzeige des Werts auf der Leinwand übernehmen wir.

### 2.6 Regeln auf Seiten: Kodu

Kodu (Microsoft Research, 2009) war für den Xbox-Controller gemacht. Programmiert wird **ohne Tastatur mit Bildkacheln**
([Microsoft Research](https://www.microsoft.com/en-us/research/project/kodu/)). Jede Figur hat bis zu zwölf **Seiten**; jede Seite
ist eine Liste von Regeln „WENN … TUE …“. Die Seiten sind die Zustände der Figur. Die Regeln der Ausführung sind genau beschrieben
([Touretzky, CMU](https://www.cs.cmu.edu/afs/cs/user/dst/www/Kodu/Essays/kodu-principles.html)):

- **Erst alle Bedingungen, dann alle Aktionen.** In jedem Durchlauf werden alle Bedingungen der aktuellen Seite geprüft, bevor eine
  Aktion läuft. Eine Aktion kann also eine Bedingung im selben Durchlauf nicht ändern.
- **Konflikte:** Wollen zwei Regeln mit demselben Verb Unvereinbares (rot färben, blau färben), gewinnt die frühere. Manche Aktionen
  addieren sich, etwa zwei Bewegungen.
- **Seitenwechsel** gilt sofort und überspringt die restlichen Aktionen.
- **„Einmal“** gilt als erledigt, wenn die Aktion gelang. Es schärft sich erst wieder, wenn die Bedingung einen Durchlauf lang falsch
  war oder die Seite neu betreten wird.
- **Zeitgeber** sind genau einen Durchlauf lang wahr.
- **Eingerückte Regeln** gelten nur, wenn die Elternregel gilt.

**Belege:**

- In 346 von Nutzern veröffentlichten Programmen nutzten **58,4 % mehrere Seiten**. 47,9 % hatten eine Figur mit einem Kreis von
  Seitenwechseln, also echte Zustandsautomaten mit Schleifen
  ([Stolee und Fristoe, SIGCSE 2011](https://kstolee.github.io/assets/papers/sigcse2011.pdf)).
- Dieselbe Arbeit protokollierte 4 229 Sitzungen aus 1 580 Installationen.
- Eine Lehrfolie warnt, dass Lernende eine Seite fälschlich wie ein Rezept von oben nach unten lesen. Die Reihenfolge zählt nur bei
  Konflikten ([Folien „Teaching lawfulness with Kodu“](https://www.sambuz.com/doc/teaching-lawfulness-with-kodu-ppt-presentation-1078945)).

**Für uns:** Kodu ist das nächste Vorbild für die Ausführung. Es zeigt: Zustände als **Seiten von Regeln an der Figur** baut man
ohne Graph. Der Schnappschuss (erst prüfen, dann handeln) nimmt der Reihenfolge ihre Tücken. Die Konfliktregel „die frühere gewinnt“
ist eine einzige, sichtbare Regel.

### 2.7 Verhaltensbäume und nutzenbasierte Auswahl

**Halo 2** ([Isla, GDC 2005](https://gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai)):

- Rund 50 Verhalten in einem gerichteten Graphen; Eltern wählen unter Kindern.
- Der häufigste Wähler ist eine **Prioritätsliste**: Das erste zutreffende Kind läuft, und höher stehende Geschwister dürfen es in
  späteren Takten unterbrechen.
- Isla ersetzt fein abgestimmte Zahlen durch **Ja-nein-Prüfungen**, weil die sich in großer Zahl besser überblicken lassen.
- **Reiz-Verhalten:** Ein Ereignis (der Anführer stirbt) setzt für kurze Zeit ein Verhalten in den Baum (Flucht). Höhere
  Prioritäten behalten trotzdem den Vortritt.
- **Stile für die Gestalter:** Stile erlauben oder verbieten Verhalten. Weil sie leicht kaputte KI erzeugen, wählen die Gestalter aus
  einer kleinen geprüften Bibliothek.
- **Zappeln** (schnelles Hin- und Herwechseln) wird als Problem benannt; der Zahlen-Ansatz gibt dem letzten Sieger einen Bonus.
- **Durchschaubarkeit** ist ein ausdrückliches Ziel.

**Unreal:**

- Verhaltensbäume sind **ereignisgesteuert**. Sie warten auf Änderungen (etwa eines Blackboard-Werts), statt jeden Takt den Baum
  abzulaufen.
- Bedingungen sind **Dekoratoren**, die ihren Wert beobachten. Ändert er sich, bricht der Dekorator ab, je nach Einstellung den
  eigenen Zweig („Self“), niedrigere Zweige („Lower Priority“) oder beides.
- Beim Durchschreiten der Vorgeschichte zeigt der Debugger nur Änderungen am Ort der Ausführung im Baum oder an Blackboard-Werten
  ([Epic](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview)).
- **StateTree** (UE5) verbindet die Auswahl des Verhaltensbaums mit Zuständen und Übergängen und hat einen eigenen Debugger
  ([Epic](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-tree-in-unreal-engine)).
- Der **Visual Logger** zeichnet Schnappschüsse auf, durch die man auf einer Zeitleiste fährt
  ([Visual Logger](https://dev.epicgames.com/documentation/en-us/unreal-engine/visual-logger-in-unreal-engine)). Der **Rewind
  Debugger** nimmt Spielabschnitte auf und spult zurück
  ([Rewind Debugger](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-rewind-debugger-in-unreal-engine)).

**Dual-Utility** ([Dill, Game AI Pro 2](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter03_Dual-Utility_Reasoning.pdf)):

- Jede Möglichkeit hat einen **Rang** (absolute Wichtigkeit) und ein **Gewicht** (relative Eignung). Gewählt wird in vier Schritten:
  1. Gewicht null fällt weg.
  2. Nur der höchste vorhandene Rang bleibt.
  3. Was viel schwächer ist als die beste Möglichkeit, fällt weg.
  4. Unter dem Rest wird nach Gewicht gewürfelt.
- In Zoo Tycoon 2 hatten Bedürfnisse Rang 0, Kletterverhalten auf dem Baum etwa 5 (damit der Koala nicht unvermittelt herausspringt)
  und Tiershows 98 bis 102, gesteuert von einem kleinen Automaten. „Sterben“ hatte Rang 1 000 000.
- Der Gewinn: Vorrang bleibt vorhersehbar, Abwechslung kommt aus dem Gewicht.

**Weitere Verfahren:**

- **Infinite Axis Utility System:** Jedes Verhalten erhält eine Bewertung, das höchste gewinnt. Verhalten sind Module, die man
  Figuren zuteilt; ein Datenwerkzeug soll Gestaltern das Abstimmen ohne Code erlauben
  ([gameai.com](https://gameai.com/iaus.php), Herstellerangabe).
- **Ein Werkzeughersteller** argumentiert, Verhaltensbäume sperrten Entscheidungen in Bedingungsknoten und wüchsen mit jeder neuen
  Eingabe ([Game Developer, 2016](https://gamedeveloper.com/programming/are-behavior-trees-a-thing-of-the-past-)).
- **The Sims:** Die Dinge werben mit dem, was sie für die Bedürfnisse leisten. Die Persönlichkeit gewichtet das Angebot. Will Wright
  berichtet, die frühe Selbstständigkeit sei zu gut gewesen: Fast alles, was der Spieler tat, war schlechter als der Autopilot
  ([PC Gamer](https://www.pcgamer.com/games/the-sims/will-wright-says-the-original-sims-ai-was-actually-too-good-almost-anything-the-player-did-was-worse-than-the-sims-running-on-autopilot),
  [Wright](https://will-wright.com/willshistory12.php)).
- **Subsumption** (Brooks 1986): Schichten laufen parallel, höhere unterdrücken die Ein- oder Ausgänge niedrigerer
  ([Brooks](https://courses.cs.washington.edu/courses/cse481c/09wi/papers/Brooks-RA86-RobustLayeredControlSystem.pdf)).

**Stärken:**

- Prioritätslisten und Ränge sind die bewährte Antwort auf „wer gewinnt“.
- Gewichte mit Zufall geben Charakter.
- Ereignisgesteuerte Abbrüche lösen das Unterbrechen sauber.

**Schwächen:**

- Bäume und Kurven sind Werkzeuge für Teams mit Programmierern. Selbst Bungie gab den Gestaltern nur eine geprüfte Bibliothek.

**Für uns:** Die Auswahl (Bänder als Ränge, Gewichte, Zufall) übernehmen wir als **Rechenregel unter der Oberfläche**. Florian sieht
Bänder und Häufigkeiten, nie einen Baum oder eine Kurve. Die Dinge bieten Launen an wie bei The Sims.

### 2.8 Begleiter mit Eigenwillen: Trico, Nintendogs, Untitled Goose Game, F.E.A.R.

- **Trico (The Last Guardian):**
  - Ueda hat Tricos Unberechenbarkeit nach eigener Aussage absichtlich gebaut
    ([GamesRadar](https://gamesradar.com/the-last-guardians-trico-is-the-gamings-perfect-pet-and-a-truly-smart-piece-of-design)).
    Er beschreibt Trico als eigenständiges Tier statt eines Haustiers, das nur gehorcht ([Time](https://time.com/4371285/last-guardian-preview)).
  - Statt Licht oder Rahmung lenkt Trico den Blick: Es stupst eine Tür an, bis der Spieler versteht, worauf es achtet
    ([Game Developer](https://gamedeveloper.com/game-platforms/how-i-the-last-guardian-i-sacrifices-gameplay-to-build-companionship)).
  - Die Kritik an verzögerten, unzuverlässigen Reaktionen steht in Bericht 13 (3.5).
- **Nintendogs:** Hunger, Durst und Sauberkeit sinken nach der Uhr des Geräts; Kunststücke lernt der Hund über das Mikrofon. Das Spiel
  verkaufte rund 24 Millionen Mal ([Wikipedia](https://en.wikipedia.org/wiki/Nintendogs)). Bedürfnisse sind hier sichtbare Zustände,
  die der Spieler pflegt.
- **Untitled Goose Game** ([Game Developer, Q&A](https://gamedeveloper.com/design/behind-the-honk-an-i-untitled-goose-game-i-q-a)):
  - Das Team begann mit einer einzigen KI-Figur und fügte Verhalten schrittweise hinzu.
  - Später kamen Sichtkegel und gemerkte Orte dazu. Die Figuren haben Ruhe-Schleifen mit ihren Dingen, Reaktions-Animationen bei
    Zustandswechseln und **Gedankenblasen**.
  - Die Systeme tragen über alle Dinge, ergänzt um Handarbeit für Fälle, die Spieler erwarten.
  - Die Figuren räumen fast alles wieder auf, damit der Unfug kreisen kann statt zu eskalieren.
  - Die Musik hat je Stück eine lebhafte und eine gedämpfte Fassung in Abschnitten von etwa zwei Schlägen; das System wechselt
    zwischen ihnen oder pausiert.
- **F.E.A.R.:**
  - Orkins Figuren liefen auf einem Automaten mit nur drei Zuständen und einem Planer
    ([GDC 2006](https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf)).
  - Den Eindruck von Klugheit machten die Zurufe. Sein Grundsatz lautete: „If the AI didn't say it, it didn't happen.“
    ([Game AI Pro](https://www.oreilly.com/library/view/game-ai-pro/9781482254792/K23980_C002.xhtml))

**Lehre:** Eigenwille wirkt als Charakter, wenn er **angekündigt** und **lesbar** ist (Zurufe, Gedankenblase, Blick auf das Ding) und
wenn die Welt ihn **anbietet** (Dinge, Orte). Fehlt die Ankündigung, wirkt er wie eine träge Steuerung (Trico-Kritik). Er darf dem
Spieler nicht das Spiel abnehmen (The Sims).

### 2.9 Theorie der Reihenfolge: Statecharts, SCXML, synchrone Sprachen

- **SCXML** (W3C) legt die Ausführung von Statecharts genau fest ([SCXML](https://www.w3.org/TR/scxml/)):
  - Ein Mikroschritt führt eine Menge nicht widersprüchlicher Übergänge aus.
  - Ein Makroschritt wiederholt Mikroschritte, zuerst ereignislose Übergänge, dann die innere Warteschlange. Erst danach kommt das
    nächste äußere Ereignis („Lauf bis zur Ruhe“).
  - Bei Konflikten gewinnt der Übergang aus dem tieferen Zustand, sonst der frühere im Dokument.
  - Parallele Bereiche verarbeiten Ereignisse in fester Reihenfolge, also ohne Wettlauf.
- **Synchrone Sprachen** wie Esterel nehmen an, dass eine Reaktion „keine Zeit braucht“. Jeder Takt liest einen Eingabevektor und
  erzeugt deterministisch einen Ausgabevektor ([Wikipedia](https://en.wikipedia.org/wiki/Esterel),
  [Vorlesung Kiel](https://www.informatik.uni-kiel.de/~rvh/ss20/v-synch/lectures/lecture02.pdf)).
- Kodu (2.6) ist eine kindgerechte Form davon: ein Takt, ein Schnappschuss, dann handeln.

**Für uns:** Die Theorie stützt zwei Entscheidungen. Erstens der Takt als logischer Augenblick mit Schnappschuss. Zweitens ein fester
Ort für Ketten: Wir verschieben Folge-Ereignisse in den nächsten Takt, statt im selben Takt bis zur Ruhe zu rechnen. Das ist
einfacher zu zeigen und kann nicht hängen.

---

## 3. Was Nicht-Programmierer nachweislich können und woran sie scheitern

### 3.1 Wenn-dann-Regeln sind für Laien gemacht

Ur, McManus, Ho und Littman ([CHI 2014](https://doi.org/10.1145/2556288.2557420),
[Zusammenfassung der Brown University](https://blog.cs.brown.edu/2014/04/29/michael-littman-chi2014-programming-smart-home/)):

- 318 Befragte beschrieben, was ihr Zuhause tun soll. 78 % der Wünsche passten in **einen Auslöser und eine Aktion**, 22 % brauchten
  mehrere.
- Mit zwei Oberflächen im Stil von IFTTT (eine einfache, eine mit mehreren Auslösern und Aktionen) bauten Teilnehmer ohne
  Programmiererfahrung Regeln **so gut wie Programmierer**.

### 3.2 Ereignis oder Zustand: die häufigste Verwechslung

Huang und Cakmak ([UbiComp 2015](https://hcrlab.cs.washington.edu/assets/pdfs/2015/huang2015ubicomp.pdf)) unterscheiden:

| Art | Beispiel | Bedeutung |
|---|---|---|
| Ereignis-Auslöser | „die Klingel läutet“ | geschieht in einem Augenblick |
| Zustands-Auslöser | „es regnet“ | gilt über eine Dauer |
| Einmal-Aktion | „E-Mail senden“ | ist sofort erledigt |
| Ausgedehnte Aktion | „Kaffee kochen“ | dauert, endet von selbst |
| Dauerhafte Aktion | „Licht an“ | bleibt, bis jemand sie zurücknimmt |

**Ergebnisse:**

- Bei einem einzelnen Ereignis-Auslöser erwarteten **75,8 %**, dass die Regel sofort startet, bei einem einzelnen Zustands-Auslöser
  nur **36,7 %**. Die anderen erwarteten „irgendwann, solange es gilt“.
- Bei zwei Zuständen sagten 38 % „irgendwann, solange beide gelten“ und 30 % „sobald beide gelten“.
- Ob dauerhafte Aktionen von selbst enden, war strittig. Beim Bauen **vergaßen die meisten, sie zurückzunehmen**.
- Programme selbst zu bauen verbesserte das Verständnis nicht.

**Die Autoren empfehlen:**

- Hinweise, wann eine Aktion startet und ob sie von selbst zurückgeht.
- Einen Knopf, der die Gegenregel gleich mit anlegt.
- Verwirrende Formen verbieten, etwa zwei Ereignisse in einer Regel.

### 3.3 Zehn Fehlerklassen

Brackenbury u. a. ([CHI 2019](https://doi.org/10.1145/3290605.3300782), [Kurzfassung](https://par.nsf.gov/biblio/10106413)) ließen
153 Personen das Verhalten vorgegebener Regeln vorhersagen; die Hälfte der Regeln enthielt Fehler. Acht der zehn Klassen machten das
Vorhersagen messbar schwerer. Programmiererfahrung half ein wenig, machte aber unsicherer.

| Fehlerklasse | Was passiert | Erkennbar | Antwort in Studio (Abschnitt 7) |
|---|---|---|---|
| Endlosschleife | Regel A löst B aus, B wieder A | beim Bearbeiten | Folge-Ereignisse erst im nächsten Takt; Prüfer warnt vor Kreisen |
| Widersprüchliche Aktion | über längere Zeit ein Hin und Her | nur im Lauf | Wächter markiert schnell kippende Kanäle |
| Wiederholtes Auslösen | Regel feuert öfter als erwartet | nur im Lauf | „Sobald“ ist eine Flanke mit Rückweg; „höchstens alle n s“; Wächter |
| Unbestimmte Reihenfolge | gleichzeitige Ereignisse in wechselnder Folge | beim Bearbeiten | fester Takt, feste Ordnung im Postfach |
| Ausgedehnte Aktion | Aktion dauert, Regel rechnet nicht damit | beim Bearbeiten | Wege zeigen ihre Dauer; Unterbrechen je Weg sichtbar |
| Fehlende Rücknahme | dauerhafte Aktion ohne Gegenregel | nicht sicher | „Solange“ gibt von selbst zurück; „Sobald“ darf nichts Dauerhaftes setzen, ohne zu fragen |
| Annahme sicherer Grundstellung | man glaubt, ohne Regel sei alles „aus“ | nicht sicher | jeder Kanal zeigt seinen Grundwert |
| Zeitfenster übersehen | Fenster wird anders gelesen | nicht sicher | Zeit nur in „nach n s“, „alle n s“, „höchstens alle n s“ |
| Vertauschte Auslöser | unklar, was Ereignis und was Zustand ist | nicht sicher | zwei Satzanfänge, „Sobald“ mit genau einem Ereignis |
| Vorrang-Konflikt | angegebene Vorränge werden übergangen | beim Bearbeiten | Bänder und Listenplatz sichtbar, „überstimmt von …“ |

### 3.4 Zustände als Seiten

Kodu (2.6) zeigt, dass Laien und Kinder Zustandsautomaten bauen, wenn Zustände **Seiten mit Regeln an der Figur** sind: 58,4 % von
346 Programmen nutzen sie, fast die Hälfte mit Kreisen. Rives Graph ist dagegen laut Bewertungen der schwerste Teil (Bericht 02). Der
Unterschied liegt nicht im Ausdruck, sondern im Ort: Die Regel steht am Ding und im Zustand, in dem sie gilt.

### 3.5 Fehlersuche mit „Warum?“

- **Whyline:** Ko und Myers bauten in die Lernumgebung Alice eine Fehlersuche, an der man fragt: „Warum ist das passiert?“ und „Warum
  ist das nicht passiert?“. Gegenüber Nutzern ohne Whyline sank die Zeit der Fehlersuche **fast um den Faktor 8**, und sie lösten
  **40 % mehr Aufgaben** ([CHI 2004](https://hci.rwth-aachen.de/materials/conferences/CHI2004/1p151.pdf)). Die Stichprobe war klein
  (neun Personen, fünf mit und vier ohne); das Ergebnis ist ein starker Hinweis, kein Gesetz.
- **Bret Victor** fordert für lernbare Umgebungen ([Learnable Programming](http://worrydream.com/LearnableProgramming/)): den Ablauf
  sichtbar und steuerbar machen, den Zustand zeigen statt ihn zu verstecken, Werte über die Zeit nebeneinander zeigen und die Zeit
  sichtbar machen.

### 3.6 Folgerung

| Befund | Folge für das Modell |
|---|---|
| Wenn-dann-Regeln bauen Laien so gut wie Programmierer | Karten als Sätze „Sobald … dann …“ |
| Ereignis und Zustand werden verwechselt | zwei Satzanfänge: „Sobald“ (Ereignis) und „Solange“ (Zustand) |
| Dauerhafte Aktionen werden nicht zurückgenommen | „Solange“ gibt von selbst zurück |
| Zustände gelingen als Seiten, nicht als Graph | Karten „gelten in“ Zuständen; Graph nur als Ansicht |
| Vorränge werden übergangen | wenige, sichtbare Bänder; die Liste ist der Vorrang |
| „Warum?“ beschleunigt die Fehlersuche | „Warum?“ und „Warum nicht?“ an jeder Änderung |
| Spielen ist die Prüfung (Mario Maker) | Beweis-Lauf je Aufgabe |

---

## 4. Ausführungsregeln im Vergleich

„–“ heißt: nicht vorhanden. „Nicht beschrieben“ heißt: öffentlich nicht dokumentiert oder von mir nicht geprüft.

| | Takt | Was eine Bedingung sieht | Konflikt | Ketten im selben Takt | Wiederauslösen | Zufall | Fehlersuche |
|---|---|---|---|---|---|---|---|
| **Construct** | jeder Takt, oben nach unten; Auslöser beim Eintreten | Änderungen früherer Ereignisse im selben Takt | spätere Aktion überschreibt | Auslöser sofort | „Trigger once while true“ (nicht je Exemplar) | Saat möglich, ein Strom | Haltepunkte, Einzelbild, Zwischenstände |
| **GDevelop** | jedes Bild, oben nach unten; Verhalten davor oder danach | wie Construct | wie Construct | nicht beschrieben | „Trigger once“ (nicht je Exemplar) | nicht geprüft | Variablen sehen und ändern, Profiler |
| **Rive** | je Schritt; Ebenen nach Index | Ebenen sehen, was frühere geschrieben haben | Any State zuerst, dann Listenplatz; untere Ebene gewinnt | ja, bis 100 | Auslöser-Eingaben einmalig; Zustände prüfen jeden Schritt | Uhr-Saat, sonst Saat 1 | aktiver Zustand sichtbar |
| **Kodu** | jeder Durchlauf | Stand vor allen Aktionen (Schnappschuss) | frühere Regel je Verb; manche addieren sich | nein; Seitenwechsel bricht ab | „einmal“ schärft nach einem falschen Durchlauf | Zufallskachel | – |
| **Dreams, LittleBigPlanet** | jedes Bild | nicht beschrieben | nicht beschrieben | Funkstrecke verzögert ein Bild (Forum) | Signalformer für Flanken | Zufallsverteiler | Werte im Einstellmenü; Haltepunkte fehlten 2019 |
| **Mario Maker** | im Spiel verborgen | – | im Teil festgelegt | – | – | im Spiel verborgen | Spielen, Pflicht zum Schaffen |
| **ProtoPie** | ereignisgesteuert | Variablen | nicht beschrieben | nicht beschrieben | „Range“ erst nach erneutem Eintritt | nicht geprüft | Variablen auf der Leinwand |
| **Unreal-Verhaltensbaum** | ereignisgesteuert, Dienste periodisch | Blackboard | Prioritätsordnung, Abbruch niedrigerer Zweige | nicht geprüft | Dekorator beobachtet | nicht geprüft | Vorgeschichte, Visual Logger, Zurückspulen |
| **SCXML** | Makroschritt bis zur Ruhe | Stand nach jedem Mikroschritt | tieferer Zustand, dann Dokumentreihenfolge | ja, ereignislos und innere Warteschlange | – | – | – |
| **Dual-Utility** | bei jeder Entscheidung | Bewertung im Augenblick | Rang, dann Gewicht | – | Rang hält eine Wahl fest | gewichtet gewürfelt | Zahlen je Möglichkeit |

**Lesart:** Die Werkzeuge für Laien (Kodu, Mario Maker, RPG Maker) haben **eine** sichtbare Vorrangregel und wenig Reihenfolge.
Die mächtigen Werkzeuge (Construct, Rive, SCXML) haben genaue, aber verteilte Regeln. Keines der Laien-Werkzeuge erklärt dem
Nutzer, **warum** etwas geschah.

---

## 5. Muster, die sich durch die guten Lösungen ziehen

1. **Bausteine tragen die Schwere**, Regeln verbinden sie (GDevelop, Construct, Fortnite, Mario Maker, Halo-Stile).
2. **Zwei Arten von Logik:** stetige Kopplung (Chain, Constrain, Draht, Bindung) und Ereignis mit Folge (Range, Change, Auslöser).
3. **Flanken brauchen Gedächtnis**: „einmal“ (Kodu), „Trigger once“ (Construct, GDevelop), „Range“ (ProtoPie). Wo das Gedächtnis
   nicht je Exemplar gilt, stolpern Nutzer.
4. **Eine sichtbare Vorrangregel** (Kodu: die frühere; RPG Maker: die höhere Seite; Rive: untere Ebene, Any State zuerst; Halo:
   Prioritätsliste; Zoo Tycoon: Rang).
5. **Zustände als Orte von Regeln** (Kodu-Seiten, RPG-Maker-Seiten, Rives Zustände), nicht als freies Netz.
6. **Unterbrechen von oben**, nicht von der Seite (Halo, Unreals Abbruch niedrigerer Zweige, Subsumption, Zoo Tycoon).
7. **Ketten brauchen eine Grenze** (Rive: 100; Dreams: ein Bild je Funkstrecke).
8. **Eigenwille braucht Ankündigung und Angebot** (F.E.A.R., Gedankenblasen bei Untitled Goose Game, Trico, The Sims).
9. **Wiederholbarkeit kommt nicht von selbst** (Rives Uhr-Saat, Slay the Spire).
10. **Prüfen heißt spielen und zurückspulen** (Mario Maker, Construct-Zwischenstände, Unreal Rewind, Box2D-Wiederholung in 09).

---

## 6. Ehrliche Gegenüberstellung für unseren Fall

●●● stark, ●●○ mittel, ●○○ schwach. Einschätzung aus der Recherche, nicht gemessen; die Zeile des Vorschlags ist eine Erwartung, die
Proben in Abschnitt 9 prüfen sie.

| | Florian baut es | Florian findet Fehler | Launen mit Ankündigung | passt zur Physik (Reflexe, Messwerte) | passt zu Posen und Wegen (05) | iPad, Finger | wiederholbar | Aufwand für uns |
|---|---|---|---|---|---|---|---|---|
| Ereignisblatt (Construct, GDevelop) | ●●○ | ●●○ | ●○○ von Hand | ●●○ über Verhalten | ●○○ | ●○○ | ●●○ ein Strom | mittel |
| Zustandsgraph mit Datenbindung (Rive) | ●○○ | ●●○ | ●●○ Zufallsausgänge | ●○○ | ●●○ | ●○○ | ●○○ | mittel |
| Drähte und Bauteile (Dreams, LittleBigPlanet) | ●●○ Einstieg | ●○○ | ●●○ | ●●○ | ●○○ | ●●○ | nicht beschrieben | hoch |
| Regeln am Objekt (Mario Maker) | ●●● | ●●● durch Spielen | ●○○ nur Vorgefertigtes | ●●● eingebaut | ●○○ | ●●● | – | mittel (Bausteine) |
| Auslöser und Reaktion (ProtoPie) | ●●○ | ●●○ | ●○○ | ●○○ | ●○○ | ●○○ | ●○○ | gering |
| Verhaltensbaum (Halo, Unreal) | ●○○ | ●●○ mit Debugger | ●●○ | ●●○ | ●●○ | ●○○ | ●●○ | mittel |
| Nutzen-Auswahl (Dual-Utility, IAUS) | ●○○ Kurven | ●○○ Zahlen | ●●● | ●●○ | ●●○ | ●○○ | ●●○ mit Saat | mittel |
| **Vorschlag: Bausteine, Drähte, Karten** | ●●● erwartet | ●●● erwartet | ●●● | ●●● | ●●● | ●●○ | ●●● | mittel bis hoch |

**Urteil:**

- **Kein vorhandenes Modell passt allein.** Regeln am Objekt sind am besten belegt, tragen aber keine eigenen Ideen. Graphen tragen
  alles, sind aber für Florian der schwerste Weg. Bäume und Nutzenkurven sind Werkzeuge für Teams.
- **Die Mischung, die die Belege trägt:**
  - fertige Bausteine mit Reglern (Mario Maker, GDevelop),
  - Karten als Sätze am Ding mit zwei Satzarten (Wenn-dann-Forschung, Kodu),
  - Drähte für stetige Kopplungen (ProtoPie, Dreams),
  - Vorrang über wenige sichtbare Bänder (Kodu, Zoo Tycoon, Halo),
  - Ausführung im Takt mit Schnappschuss (Kodu, synchrone Sprachen),
  - Fehlersuche über „Warum?“ und Zurückspulen (Whyline, Unreal).
- **Graph und Baum nur als Ansicht und als Rechenregel unter der Oberfläche.**

---

## 7. Vorschlag: Bausteine, Drähte, Karten

### 7.1 Überblick

```
   Eingabe (Finger am Rad, Tippen)                       Welt und Physik (Rad, Körper, Dinge)
            │                                                         │ Messwerte, Ereignisse
            ▼                                                         ▼
   ┌──────────────────────── Takt n (1/60 s) ───────────────────────────────────────────┐
   │ Postfach (Ereignisse aus Takt n−1) + Messwerte                                     │
   │   → Drähte (stetig)                                                                │
   │   → Karten prüfen (Schnappschuss): Sobald │ Solange │ Laune                        │
   │   → je Kanal auflösen: Band, dann Listenplatz; Launen nach Rang, Gewicht, Strom    │
   │   → Ziele an Bausteine und Posen │ Einmal-Aktionen (Ton, Effekt, Zähler, Kamera)   │
   │ Physik-Teilschritte (Reflexe des Vierbeiners greifen sofort) → Wege → Nachschwingen│
   └────────────────────────────────────────────────────────────────────────────────────┘
            │ Aufzeichnung (Entscheidungen, Werte, Schnappschüsse)
            ▼
   Bühne: Leuchten, Gedankenblase, Werteverlauf, Warum?
```

Florian sieht davon drei Dinge: **Bausteine** (an Ozzy, am Rad, an den Dingen) mit ihren Reglern, **Drähte** in der Linse „Spiel“ und
**Karten** als kurze Sätze am Ding. Alles andere ist Ausführung, die er nur über Leuchten und „Warum?“ erlebt.

### 7.2 Bausteine

Ein Baustein ist ein fertiges Verhalten, das wir einmal in Code schreiben (Bericht 13, 10.12). Er hat fünf Arten von Anschlüssen:

| Anschluss | Beispiel am Vierbeiner | Wie Florian ihn nutzt |
|---|---|---|
| **Regler** | Bremskraft, Haftung, Mut, geschickt–tollpatschig, Sprungkraft | Schieber am Baustein (Bericht 08, 9.7) |
| **Messwerte** | Neigung unter Ozzy, Tempo, Kipp-Reserve, Kontakt je Pfote, Hindernis voraus | Quelle für Drähte und Bedingungen |
| **Zustände** | steht, geht (Gangart), springt, stolpert, fällt, liegt, steht auf, schüttelt sich | „Solange Ozzy …“, „gilt in …“ |
| **Ereignisse** | landet (Stärke), Pfote setzt auf, stolpert, plumpst, ist aufgestanden, betritt Zone | „Sobald Ozzy …“ |
| **Befehle** | Ziel setzen, Wunschtempo, Stolpern anfordern, Sprung anfordern | Aktionen auf Karten |

**Bausteine der Demo:** Vierbeiner (Ozzy, später Katze), Rad (Radius, Gewicht, Reibung; Messwerte Winkel und Drehtempo), Ding (fest,
lose, weich, flüssig), Zone (Duftstelle, Angstzone; Ereignisse betritt und verlässt), Zähler, Uhr (Tageszeit, Rundenzeit), Kamera,
Musik.

**Innenleben:** Der Vierbeiner hat einen inneren Zustandsautomaten (Stehen bis Schütteln, Bericht 08, 9.6), den Florian nicht baut,
aber als **Zustandskarte** ansehen kann. So machen es Construct (Platform) und GDevelop (Verhalten aus Ereignissen). Die Posen, Wege
und Liegeposen je Lage hängt Florian an diese Zustände (Bericht 05).

**Platz im Takt:** Bausteine rechnen in den Physik-Teilschritten. Ihre **Reflexe** (Stolpern, Fallen, Landen) greifen dort sofort.
Die Karten erfahren davon im nächsten Takt, also höchstens 1/60 s später.

### 7.3 Drähte

Ein Draht koppelt einen Messwert stetig an einen Regler: **Quelle → Kennlinie → Glätten → Ziel**. Beispiele: Neigung → Balance,
Tempo → Gangphase, Tageszeit → Himmelsverlauf, Landestärke → Staubgröße.

- **Kennlinie** mit zwei Bereichen wie ProtoPies Chain (Bericht 12) und Rives „Range Map“, wahlweise gezeichnet.
- **Glätten** wie Rives „Interpolator“ und der Signalformer in Dreams.
- **Ausführung:** jeden Takt, in der festen Reihenfolge der Abhängigkeiten. Ein Kreis aus Drähten ist verboten; der Prüfer zeigt ihn
  rot.
- **Drähte schreiben nie Zustände**, nur Regler. Wechsel zwischen Zuständen machen Karten. Das hält „stetig“ und „Ereignis“
  getrennt (2.5).

### 7.4 Karten: drei Satzarten

Jede Karte liegt an einem Ding (an Ozzy, an der Duftstelle, am Rad, am Rahmen der Runde). Florian setzt sie zusammen, indem er auf der
Bühne auf Dinge tippt und aus kurzen Listen wählt (Bericht 12, 6.12). Auf dem iPad geht das ohne Tastatur, wie bei Kodu am
Controller.

**„Sobald“ (Ereignis, feuert einmal)**

```
Sobald   [genau ein Ereignis]                         z. B. Ozzy plumpst
falls    [Zustände …]                (wahlweise)      Ozzy ist im Garten
dann     [Einmal-Aktionen, Befehle]                   Staub (Größe aus Stärke), Ton „Plumps“, Zähler Plumps +1
höchstens alle [n s]                 (wahlweise)      0,3 s
gilt in  [Zuständen]                 (wahlweise)      leer = überall
```

- **Genau ein Ereignis**, weitere Bedingungen nur als Zustände („falls“). Zwei Ereignisse in einer Karte gibt es nicht (Huang und
  Cakmak).
- **Ereignisse** kommen aus Bausteinen, Zonen, Wegen (Marken, die Florian in gestaltete Wege setzt, 7.12), der Zeit („nach 2 s“,
  „alle 5 s“), dem Spieler („tippt Ozzy“, „fasst das Rad an“, „lässt los“) und aus **Schwellen**: „Sobald Tempo über 1,2“ ist eine
  Flanke mit Rückweg (7.8).
- **Aktionen** sind einmalig: Ton, Effekt, Kamera-Stoß, Haptik, Zähler, ein Weg zu einer Pose, ein Befehl an einen Baustein, eine
  Laune beenden.
- Setzt eine „Sobald“-Karte etwas Dauerhaftes (eine Pose, einen Sollwert), fragt der Prüfer: „Soll das danach wieder zurück? Dann ist
  es eine Solange-Karte.“ Das ist die Antwort auf die fehlende Rücknahme.

**„Solange“ (Zustand, hält und gibt von selbst zurück)**

```
Solange  [Zustände …]                                 z. B. Ozzy ist auf Eis
halte    [Kanal] auf [Wert, Pose, Ausdruck, Wunsch]   Gesicht: „vorsichtig“
mindestens [n s]                     (wahlweise)      gegen Flackern an Zonenrändern
gilt in  [Zuständen]                 (wahlweise)
```

- Endet der Zustand, gibt die Karte ihren Kanal von selbst frei. Dann gilt wieder, was darunter liegt: eine andere Karte oder der
  Grundwert des Bausteins. Der Wechsel läuft über den Standardweg aus Bericht 05, springt also nicht.
- **Kanäle** sind die Stellen, um die gestritten wird: Körper-Zustand (Pose), Wunschtempo, Bremskraft, Blickziel, Gesicht, Ohren,
  Kamera, Musik, Zeitfaktor. Jeder Kanal zeigt seinen Grundwert, damit niemand eine „sichere Grundstellung“ annimmt, die es nicht
  gibt.

**„Laune“ (Eigenwille mit Ankündigung)**

```
Laune        Schnüffeln                    (angeboten von: Duftstelle)
wenn         Sobald Ozzy die Stelle betritt
falls        Gangart höchstens Trab
Häufigkeit   oft ← Neugier                 (Gewicht; Charakter-Regler aus 13, 6.3)
Ankündigung  Nase sinkt, Schwanz langsamer, 1,0 s
Wirkung      Wunschtempo 0, Bremskraft hoch, Pose Schnüffeln, 2–4 s
Ende         Zeit um, oder Rad dreht schnell
danach       Stehen
Ruhezeit     10 s
```

- Die Phasen **Ankündigung → Wirkung → Ende → danach** sind fest. Eine Laune ohne Ankündigung lässt der Prüfer nicht zu (Bericht 13,
  6.1).
- **Dinge bieten Launen an** wie bei The Sims. Die Karte liegt meist an der Duftstelle, nicht an Ozzy, und Florian platziert sie mit
  dem Ding. Launen aus Ozzys Zustand (Müde nach dem Flitzen) liegen an Ozzy.
- **Wirkung nur über Sollwerte und Posen.** Die Physik bleibt dieselbe (Berichte 08 und 13).

**Was es bewusst nicht gibt:** Variablen mit freien Namen, Formeln, Schleifen, Unterprogramme. Was so etwas braucht, wird ein
Baustein (Code bei uns). Zähler sind Bausteine mit festen Befehlen (7.11).

### 7.5 Bänder: wer gewinnt

Fünf Bänder, von oben nach unten. **Ein höheres Band gewinnt jeden Kanal, den es beansprucht. Im selben Band gewinnt die Karte, die
weiter oben in der Liste steht.**

| Band | Wer schreibt hinein | Beispiele | Voreinstellung |
|---|---|---|---|
| **1 Körper** | Reflexe des Bausteins aus der Physik | stolpert, fällt, landet hart, rutscht, steht auf, schüttelt sich | eingebaut; dazu Karten, die auf einen Reflex reagieren (Gesicht, Zeitlupe) |
| **2 Regie** | Inszenierung der Runde | Start, Ankunft am Fähnchen, Gag, Hilfe nach drei Fehlversuchen | Karten am Rahmen |
| **3 Spieler** | Zuwendung und Befehle | Antippen beruhigt, „Springen auf Tippen“ (Prüfschalter) | Karten mit Spieler-Ereignis |
| **4 Laune** | Eigenwille | Schnüffeln, Sturkopf, Flitzen, Jagen, Müde | Launen-Karten |
| **5 Grund** | Grundverhalten des Bausteins und einfache Karten | Stehen, Gangart aus dem Tempo, Blick zum Finger, Ausdrücke | eingebaut plus Karten |

- **Vorbilder:** Halo 2 (Prioritätsliste), Zoo Tycoon 2 (Rang vor Gewicht, „Sterben“ ganz oben), Subsumption (höhere Schicht
  unterdrückt niedrigere), Kodu (frühere Regel gewinnt), RPG Maker (höhere Seite gewinnt), Cinemachine (höchster Vorrang gewinnt).
- **Bänder sind sichtbar:** In der Kartenliste sind sie waagrechte Streifen. Eine Karte verschiebt man in ein anderes Band, indem man
  sie dorthin zieht. Die Liste ist der Vorrang; es gibt keine Prioritätszahlen.
- **Kanalweise:** Ein Band gewinnt nur die Kanäle, die es beansprucht. Eine Regie-Karte, die nur die Kamera will, lässt Ozzys Körper
  in Ruhe. Einmal-Aktionen (Ton, Effekt, Zähler) beanspruchen keinen Kanal und laufen immer.
- **Der Spieler steht über der Laune:** Antippen kann eine Laune beenden, wenn ihre Karte das als Ende nennt (Angst endet durch
  Trösten). Ob eine Laune wie „Sturkopf“ den Spieler überstimmen darf, ist eine offene Frage an Florian. Technisch hieße es: Die
  Karte wird in Band 3 gezogen.
- **Das Rad ist kein Band.** Der Finger am Rad ist Welt: Er wirkt in jedem Fall über die Physik. Keine Laune hält das Rad an; eine
  Laune ändert nur, was Ozzy will (Bericht 13, 6.1).

### 7.6 Der Takt: Reihenfolge je 1/60 s

```
Takt n
 1  Eingabe lesen und mit Taktnummer ins Protokoll schreiben (Finger am Rad, Tippen, Knöpfe des Prüfstands).
 2  Postfach öffnen: alle Ereignisse aus Takt n−1 (Physik, Wege, Zonen, Zähler, Uhr, Spieler), in fester Ordnung.
 3  Messwerte lesen (Stand am Ende von Takt n−1).
 4  Drähte rechnen (Abhängigkeitsreihenfolge).
 5  Karten prüfen: alle Bedingungen gegen denselben Stand (Schnappschuss), mit Gedächtnis je Karte und Ding.
 6  Auflösen je Kanal: Band, dann Listenplatz. Launen: Wahl nach Rang und Gewicht aus dem Zufallsstrom (7.9).
 7  Ziele übergeben: Körper-Zustand je Ebene an die Posen (05), Sollwerte an den Vierbeiner, Wunsch an die Kamera, Stück an die Musik.
 8  Einmal-Aktionen in Listenfolge: Zähler, Ton, Effekt, Kamera-Stoß, Haptik.
    Was sie auslösen (Zähler voll, Aufgabe erfüllt), kommt ins Postfach für Takt n+1.
 9  Physik: 4 Teilschritte zu 1/240 s (Rad, Körper, Schrittplaner, Reflexe). Ereignisse werden gesammelt.
10  Posen: Wege fortschreiben, Trägheits-Übergang, IK, Spannung (Berichte 05 und 08).
11  Nachschwingen (Federn auf Ohren, Bart, Schwanz, Stauchung).
12  Aufzeichnen: Entscheidungen und gewählte Werte in den Ringpuffer; alle 16 Takte ein Schnappschuss (Bericht 09).
Bild: Formen aus dem zwischen zwei Takten interpolierten Stand bauen und zeichnen (iPhone 60 Hz, Mac 120 Hz).
```

**Warum so:**

- **Schnappschuss** (Schritt 5) wie bei Kodu. Die Reihenfolge der Karten zählt nur bei Konflikten, nie für die Bedingungen. Das
  vermeidet die Verwirrung aus Construct.
- **Folge-Ereignisse im nächsten Takt** (Schritt 8). Eine Kette aus Karten kann nicht hängen; schlimmstenfalls kippt ein Wert, und der
  Wächter zeigt es. 1/60 s Verzögerung sieht niemand. Rive und SCXML ketten im selben Schritt, brauchen dafür aber eine Obergrenze und
  eine eigene Erklärung.
- **Feste Ordnung im Postfach:** erst Physik, dann Wege, Zonen, Zähler, Uhr, Spieler; innerhalb einer Quelle nach Ding-Kennung.
  Gleichzeitige Ereignisse kommen damit immer in derselben Folge an, das schließt die unbestimmte Reihenfolge aus (3.3).
- **Ein Takt für alles.** Die Logik läuft im festen Takt der Physik (Bericht 09: 60 Hz mit 4 Teilschritten), unabhängig von der
  Bildrate. Zeitgeber zählen Takte.

### 7.7 Unterbrechen

| Lage | Regel |
|---|---|
| Höheres Band will einen Kanal, den ein niedrigeres hält | **sofort**; der laufende Weg endet über den Trägheits-Übergang (05); seine restlichen Marken feuern nicht (wie Spines Voreinstellung, Ereignisse beim Ausblenden nicht anzuwenden) |
| Gleiches Band, neue Anforderung, während ein Weg läuft | nach der Einstellung des laufenden Wegs (05): sofort, **am nächsten Halt** (Voreinstellung) oder nie; es wartet höchstens eine Anforderung, die neueste gewinnt |
| Niedrigeres Band | verliert; „Sobald“-Karten verfallen (kein Rückstau), „Solange“-Karten warten, bis der Kanal frei wird |
| Laune verliert ihren Körper-Kanal | die Laune endet ganz (auch Gesicht und Ohren); die Ruhezeit läuft trotzdem |
| Laune wird in der Ankündigung unterbrochen | sie fällt aus; nichts geschieht ohne Ankündigung |
| Anforderung gleich dem laufenden Ziel | nichts (der Prototyp tut das schon: `setzen` kehrt zurück, wenn Ziel und Art gleich sind) |
| Physik-Reflex | immer sofort, im Teilschritt; die Karten sehen ihn einen Takt später |

Das ist die Lehre aus Halo 2 und Unreal (Abbruch von oben), mit Kodus Grundsatz „nichts im selben Band reißt sich gegenseitig ab“.
Die Folge: kein Zappeln zwischen gleichrangigen Wünschen.

### 7.8 Erneutes Auslösen

- **Ereignisse** (landet, Pfote setzt auf, tippt): Die Karte feuert je Ereignis. Wahlweise gilt „höchstens alle n s“.
- **Schwellen** („Sobald Tempo über 1,2“): Die Karte feuert beim Überschreiten und schärft sich erst wieder, wenn der Wert unter einen
  **Rückweg** gefallen ist. Voreinstellung: 10 % des Bereichs unter der Schwelle. Im Werteverlauf sind beide Linien zu sehen.
  ProtoPies Range und Kodus „einmal“ kennen das Wiederschärfen, aber ohne Rückweg; der Rückweg verhindert Flattern an der Schwelle.
- **Gedächtnis je Karte und Ding:** Zwei Duftstellen mit derselben Karte haben getrennte Gedächtnisse. Construct und GDevelop haben
  hier eine bekannte Falle.
- **Zonen:** „betritt“ und „verlässt“ mit kleiner Hysterese am Rand. „Solange in Zone“ mit „mindestens n s“.
- **Launen:** Während eine Laune läuft, wird sie nicht neu gestartet. Danach gilt ihre **Ruhezeit** (Startwert 10 s) und eine
  **Launenpause** für alle Launen (Startwert 4 s). Nie zwei Launen zugleich.
- **Vorlauf vor Hindernissen:** Eine Laune beginnt nur, wenn ihre Ankündigung fertig ist, bevor Ozzy das nächste Ding erreicht
  (Regler „Vorlauf“, Startwert 1,5 s Laufzeit). Das ist eine allgemeine Regel über alle Dinge, keine Sonderregel je Hindernis
  (Bericht 13, 6.1).
- **Wächter im Lauf:** Feuert eine Karte öfter als zehnmal je Sekunde oder kippt ein Kanal mehr als viermal je Sekunde, bekommt die
  Karte ein Warnzeichen. Wiederholtes Auslösen und widersprüchliche Aktionen sind nur im Lauf zu erkennen (3.3).

### 7.9 Zufall mit Saat

- **Eine Saat je Lauf.** Sie wird als kurze Zahl im Prüfstand gezeigt; „neu würfeln“ und „festhalten“ sind Knöpfe. Eine Wiederholung
  besteht aus Saat, Eingabeprotokoll und Projektstand (Bericht 09, 5.3).
- **Getrennte Ströme.** Je Quelle ein Strom (Launen, Effekte, Schritt-Streuung des Vierbeiners, Welt) und **je Karte ein eigener**.
  Jeder Strom wird aus Saat und Kennung über eine gute Mischfunktion abgeleitet. Folge: Eine neue Karte, eine gelöschte oder eine
  verschobene ändert die Würfe der anderen nicht.
- **Guter Generator:** z. B. xoshiro128** ([Blackman und Vigna](https://prng.di.unimi.it/)) mit 32-Bit-Rechnung, die in JavaScript
  schnell ist. Nie `Math.random`, nie die Uhr.
- **Slay the Spire zeigt beide Fallen:**
  - Im ersten Teil starten sieben Generatoren mit **derselben Saat und demselben Verfahren**. Ihre Rohfolgen sind gleich, nur
    verschieden gedeutet: Ist die erste Kartenbelohnung von der Seltenheit „uncommon“, fällt nach dem ersten Kampf sicher ein Trank
    ([Analyse](https://forgottenarbiter.github.io/Correlated-Randomness)).
  - Im zweiten Teil wurde jeder Generator mit Saat plus gemischtem Kennzeichen gesät. Der eingebaute Generator ist aber fast linear in
    der Saat, also blieben Ergebnisse gekoppelt ([Analyse](https://tck.mn/blog/correlated-randomness-sts2/)).
  - Der Hersteller wechselte im Juni 2026 auf xoshiro256**
    ([GosuGamers](https://www.gosugamers.net/entertainment/news/78641-slay-the-spire-2-overhauls-rng-after-players-uncover-unexpected-run-correlations-removes-a-boss)).
- **Gewürfelt wird nur bei Entscheidungen:** wenn eine Karte feuert, eine Laune gewählt wird oder eine Chance „je Sekunde“ zur vollen
  Sekunde geprüft wird. Nie je Bild. Sonst hinge das Ergebnis an der Bildrate.
- **Kein Zufall in der Physik selbst.** Streuung (tollpatschige Schritte) kommt als Sollwert-Abweichung aus dem Strom des Vierbeiners;
  die Rechnung bleibt deterministisch (Bericht 09, 3.2).
- **Rive als Gegenbeispiel:** Der Zufallsausgang wird dort mit der Uhr gesät, außer im deterministischen Modus (2.2). Für Studio muss
  jeder Zufall wiederholbar sein, sonst lässt sich eine Panne nicht zweimal ansehen.

### 7.10 Wer löst das Stolpern aus?

**Entscheidung:** Der **Baustein Vierbeiner** löst Stolpern und Fallen aus den gemessenen Größen aus Bericht 08 (6.1) aus:
Hängenbleiben, Rutschen (Bremskraft über Haftung), Überrennen (Schritttempo reicht nicht), Überkippen (Kipppunkt außer Reichweite),
harte Landung. Die geschriebenen Schwellen-Regeln aus 05 („wenn Tempo > 0,6 und Kippen > 0,8 → Stolpern“) und 12 („Wenn Ozzy · Tempo
· über · 1,2 → Übergang zu · Stolpern“) entfallen in dieser Form.

**Gründe:**

1. **Arbeitsregel 7 und Bericht 13:** Das Tempofenster eines Hindernisses entsteht aus Ozzys Fähigkeiten, nicht aus einer Regel je
   Hindernis. Eine Tempo-Schwelle wäre eine solche Regel.
2. **Die Ursache ist physikalisch:** Bei gleichem Tempo rutscht Ozzy auf Eis und steht auf Rasen; bergauf stolpert er anders als
   bergab. Eine Tempo-Schwelle trifft das nicht.
3. **Schwellen über Zuständen sind die fehleranfälligste Regelart für Laien** (Ereignis-Zustands-Verwechslung, Wiederauslösen, 3.2
   und 3.3).
4. **Erklärbar:** „Stolpern, weil die Kipp-Reserve unter null fiel (−0,04 L) bei Tempo 1,3“ ist ein Grund, den die Röntgenansicht
   zeigt (Bericht 08, 9.8).

**Was Florian trotzdem steuert:**

- **Regler** am Baustein: Bremskraft, Haftung, Mut, geschickt–tollpatschig (Bericht 08, 9.7). Sie verschieben die Schwellen. Im
  Werteverlauf sieht er die Kipp-Reserve mit ihrer Null-Linie.
- **Karten, die reagieren:** „Sobald Ozzy stolpert → Ton ‚Hoppla‘, Zeitlupe 0,15 s (Band Körper), Gesicht ‚erschrocken‘.“
- **Regie darf anfordern:** Der Befehl „Stolpern anfordern“ (für einen Gag oder eine Anleitung) gibt dem Baustein einen kleinen
  physikalischen Stoß, aus dem die Physik das Stolpern macht. Es bleibt ein Weg durch dieselbe Rechnung, keine zweite Art zu
  stolpern.
- **Gestaltung des Stolperns:** Fangschritte, Purzel-Pose und Aufstehen je Lage sind Posen und Wege (Berichte 05 und 08), die Florian
  formt.

### 7.11 Aufgaben und Zähler

- **Zähler sind Bausteine:** Name, Startwert, Ziel; Befehle +1, −1, setzen, zurücksetzen; Ereignisse „Ziel erreicht“ und „geändert“.
  Häufige Zähler legt das System selbst an: Stürze, Sprünge in Folge, Zeit ohne Plumps. So arbeitet Fortnites Geräte-Welt, und so
  zählt Kodu Punkte.
- **Aufgaben sind Sätze aus wenigen Vorlagen**, wie die Bedingungen von Mario Maker 2:

  | Vorlage | Beispiel aus Bericht 13 |
  |---|---|
  | [Ereignis] [n]-mal | an beiden Duftstellen schnüffeln lassen |
  | ohne [Ereignis] bis [Rundenende] | eine Runde ohne Plumps |
  | [Ereignis], während [Zustand] | über die Katze springen, während sie schläft |
  | vor [Uhrzeit] | vor Sonnenuntergang ankommen |
  | [Messwert] erreicht [Wert] | einen Schneeball so groß wie Ozzy rollen |

- **Fortschritt** erscheint auf dem Aufgabenzettel und im Prüfstand.
- **Beweis-Lauf:** Eine Aufgabe gilt erst als fertig, wenn sie in einem Probelauf einmal erfüllt wurde. Saat und Eingaben dieses Laufs
  werden gespeichert. Nach Änderungen spielt der Editor die Beweise auf Wunsch ohne Bild nach und meldet: „gilt noch“ oder „ab 12,3 s
  anders“. Das ist Mario Makers Pflicht, den eigenen Kurs zu schaffen, plus die Wiederholbarkeit aus Bericht 09. Es ersetzt nicht
  Nicoles Test, ob eine Aufgabe fair ist.

### 7.12 Kamera, Ton, Effekte, Musik, Haptik

- **Kamera:**
  - Wünsche sind „Solange“-Karten mit Band, etwa „Solange Ozzy galoppiert → Kamera ‚weit‘“ (Grund), „Solange Ozzy über dem Rand ist
    → Kamera ‚folgen‘“ (Körper), „Sobald Ankunft → Kamera ‚Aufzug‘“ (Regie, mit Dauer).
  - Es gewinnt der Wunsch im höchsten Band, bei Gleichstand der obere, wie bei Cinemachine (dort bei Gleichstand der zuletzt
    aktivierte) ([Cinemachine](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/concept-camera-control-transitions.html)).
  - Übergänge mit einer Standard-Überblendung und Ausnahmen je Paar, genau wie Cinemachines Blend-Liste
    ([CinemachineBrain](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/api/Unity.Cinemachine.CinemachineBrain.html))
    und wie der Standardweg der Posen (05).
  - Der **Kamera-Stoß** ist eine Einmal-Aktion, die sich addiert, mit Obergrenze.
- **Ton:**
  - Einmal-Aktionen an Ereignissen oder an **Marken in gestalteten Wegen**. In Spine ist ein Ereignis mit Tonpfad, Lautstärke und
    Balance auf der Zeitleiste ein Ton-Ereignis ([Spine](https://esotericsoftware.com/spine-events)); bei uns setzt Florian Marken in
    die Taktleiste eines Wegs.
  - Marken eines ausblendenden Wegs feuern nicht. Bei Spine ist das die Voreinstellung (Schwelle 0)
    ([Spine API](https://pub.dev/documentation/esotericsoftware_spine_flutter/0.0.4/spine_flutter/TrackEntry/getEventThreshold.html),
    [Forum](https://fr.esotericsoftware.com/forum/d/7506-choosing-to-fire-events-or-not-during-mix-with-code)).
  - Lautstärke über einen Draht aus der Stärke. Je Ton „höchstens alle n s“ und eine Grenze gleichzeitiger Stimmen.
- **Musik** ist ein Kanal mit Stück und Energie. Gewechselt wird nur an Schlaggrenzen, wie bei Untitled Goose Game (lebhaft, gedämpft,
  Stille in Abschnitten von etwa zwei Schlägen).
- **Effekte:** Einmal-Effekte (Staub, Tropfen, Sterne) an Ereignissen mit Größe aus der Stärke. Dauernde Effekte über „Solange“
  (Tropfen auf der Kamera, solange es regnet). Die **Zeitlupe** ist ein Kanal „Zeitfaktor“ (Band Körper oder Regie); sie verkleinert
  den Schritt der Welt und bleibt dabei wiederholbar.
- **Haptik:** wie Ton, wirkt nur in der App-Hülle (Bericht 13, 10.8).

### 7.13 Sichtbarkeit und Fehlersuche

Fünf Mittel, alle auf derselben Bühne (Bericht 12, 6.12: Spielen auf der Bühne, Anfassen hält an):

1. **Leuchten.** In der Linse „Spiel“ trägt jede Karte ein Licht: grau (wartet), gelb (Bedingung erfüllt), Blitz (hat gefeuert), grün
   (hält ihren Kanal), gestrichelt mit „überstimmt von …“ (verliert gegen ein höheres Band oder eine obere Karte), Uhr (Ruhezeit
   läuft). Wählt man eine Karte, leuchten ihre Beteiligten auf der Bühne auf (Bericht 12). Vorbilder: Rives aktiver Zustand, Unreals
   aktiver Zweig.
2. **Gedankenblase.** Über Ozzy erscheint im Editor ein kleines Zeichen für die Laune und ihre Phase (Ankündigung, Wirkung, Ende),
   daneben das Band, das gerade den Körper hält. Vorbild: Untitled Goose Game. Im Spiel spricht nur der Körper.
3. **Werteverlauf.** Eine Leiste unter der Bühne nach derselben Grammatik wie die Leisten aus 05 und 12. Sie zeigt gewählte Messwerte
   der letzten 20 s als Kurven mit ihren Schwellen und Rückwegen und Marken für Ereignisse und Wechsel (◆ Stolpern, ◆ Laune
   Schnüffeln). Klick springt in die Vergangenheit: Die Bühne zeigt Ozzy in genau diesem Takt, aus Schnappschuss und Protokoll
   (Bericht 09). Das ist Victors „Zeit sichtbar machen“ und Unreals Visual Logger und Rewind Debugger im Kleinen.
4. **„Warum?“ und „Warum nicht?“** Wie die Whyline. Antippen einer Änderung (Pose, Ton, Marke im Verlauf) zeigt die Kette in Sätzen:

   > *Stolpern um 34,2 s: Kipp-Reserve −0,04 L (unter 0) bei Tempo 1,3; 0,6 s vorher begann die Laune „Flitzen“ (Wunschtempo 2,0).*

   Antippen einer Karte, die nicht gefeuert hat, zeigt den Grund:

   > *„Sobald Ozzy die Duftstelle betritt → Schnüffeln“ hat nicht gefeuert: Gangart war Galopp (erlaubt: höchstens Trab).*

   Weitere Gründe: überstimmt von Band Körper (Stolpern); Ruhezeit noch 3,1 s; Zufall 30 %, gewürfelt 0,71. Dafür schreibt die
   Laufzeit je Wechsel eine kleine Zeile: Gewinner, Band, Werte der Bedingungen, Verlierer und ihr Grund. Das ist billig, weil nur bei
   Wechseln geschrieben wird.
5. **Anhalten und Einzeltakt.**
   - An jeder Karte gibt es „hier anhalten“: Das Spiel stoppt im Takt, in dem sie feuert, und zeigt die Kette. Das ist ein Haltepunkt
     wie bei Construct, ohne Code.
   - Einzeltakt vor und zurück.
   - Im Prüfstand dazu: Launen per Knopf auslösen, Saat festhalten, Zeitlupe (Bericht 13, 10.9).

**Prüfer beim Bearbeiten** (was Brackenbury u. a. als erkennbar ausweisen):

- Kreise aus Karten oder Drähten.
- Zwei „Solange“-Karten im selben Band und Kanal: Der Prüfer zeigt „oben gewinnt“ ausdrücklich. Das ist kein Fehler, aber eine
  Information.
- „Sobald“ mit dauerhafter Wirkung: Frage nach der Rücknahme.
- Karten, die in keinem erreichbaren Zustand gelten.
- Launen ohne Ankündigung.
- Aufgaben ohne Beweis-Lauf.

**Wächter im Lauf:** wiederholtes Auslösen und kippende Kanäle (7.8).

**Ansicht statt Bauplatz:** Aus Karten mit „gilt in“ und Wegen erzeugt Studio eine **Zustandskarte** von Ozzy, nur zum Ansehen. Wer
einen Überblick will, bekommt den Graphen; gebaut wird an den Dingen.

### 7.14 Wo die sechs Skizzen landen

| Bericht | Was bleibt | Wo es landet | Was entfällt |
|---|---|---|---|
| 02 Rive-Graph | Any State, Exit Time, Zufallsgewichte, vorgefertigte Graphen, typisierte Daten, Konverter, Zuhörer, Aktionen | Karten ohne „gilt in“ (überall); Unterbrechen „am nächsten Halt“; Häufigkeit der Launen mit Saat; Bausteine; Messwerte, Regler, Drähte (Kennlinie, Glätten), Ereignisse | der Graph als Ort des Bauens |
| 05 Regeln je Pose | Regeln je Pose, Spielwerte, Verbindungen, Auslöser starten Wege, Ereignisse im Weg | „gilt in [Pose]“; Messwerte; Drähte; Befehl „Weg zu“; Marken in Wegen | Schwellen-Regel für das Stolpern; die Auswahltabelle wird Teil des Bausteins (Aufstehen je Lage) |
| 08 Absicht | Sollwerte, Zustände Stehen bis Schütteln, gemessene Auslöser | Ergebnis der Bänder; innerer Automat des Vierbeiners; Reflexe in Band 1 | ein eigener, von Hand gebauter Absichts-Automat |
| 09 Sensor-Zonen | Zonen, Kontakt-Stärke, Gelenk-Ereignisse | Baustein Zone; Ereignisse mit Stärke für „Sobald“ | – |
| 12 Drähte und Sätze | Draht mit Kennlinie, Satz mit Range, Spielen und Anfassen auf der Bühne | Drähte; „Sobald“ mit Rückweg; Leuchten, Anhalten | der Satz ohne Unterscheidung von Ereignis und Zustand |
| 13 Vorlagen und Karten | Verhaltens-Vorlagen, Launen-Karten, Ereignis-Karten, Zähler, Kamera-Regeln, Charakter-Regler | Bausteine; „Laune“; „Sobald“; Zähler-Baustein und Aufgaben; Kamera-Wünsche; Gewichte | – |

### 7.15 Datenmodell (Skizze)

Gespeichert wie die heutigen Schlüssel als JSON im Projekt (Bericht 11). Nur zur Anschauung, die Namen sind nicht festgelegt:

```json
{
  "saat": 48151623,
  "bausteine": [
    { "id": "ozzy", "art": "vierbeiner", "regler": { "bremskraft": 0.15, "haftung": 0.6, "tollpatschig": 0.3 } },
    { "id": "duft1", "art": "zone", "form": "kreis", "lage": 112.5 }
  ],
  "draehte": [
    { "von": "ozzy.neigung", "nach": "ozzy.balance", "kennlinie": [[-20, -1], [20, 1]], "glaetten": 0.1 }
  ],
  "karten": [
    { "id": "k1", "art": "sobald", "ding": "ozzy", "band": "grund", "ereignis": "ozzy.plumpst",
      "dann": [{ "ton": "plumps", "lautstaerke": "staerke" }, { "effekt": "staub" }, { "zaehler": "plumps", "plus": 1 }],
      "hoechstensAlle": 0.3 },
    { "id": "k2", "art": "solange", "ding": "ozzy", "band": "grund",
      "wenn": [["ozzy.boden", "=", "eis"]], "halte": { "kanal": "ozzy.gesicht", "wert": "vorsichtig" } },
    { "id": "l1", "art": "laune", "ding": "duft1", "name": "schnueffeln", "band": "laune",
      "wenn": { "sobald": "duft1.betritt" }, "falls": [["ozzy.gangart", "<=", "trab"]],
      "haeufigkeit": { "basis": 0.8, "charakter": "neugier" },
      "ankuendigung": { "pose": "nase-sinkt", "dauer": 1.0 },
      "wirkung": { "wunschtempo": 0, "bremskraft": "hoch", "pose": "schnueffeln", "dauer": [2, 4] },
      "ende": [{ "zeit": "um" }, { "sobald": "rad.dreht-schnell" }], "danach": "stehen", "ruhezeit": 10 }
  ],
  "aufgaben": [
    { "id": "a1", "vorlage": "ohne", "ereignis": "ozzy.plumpst", "bis": "runde.ende", "beweis": "laeufe/a1.json" }
  ]
}
```

### 7.16 Beispiel: der Garten in Karten

| Ding | Karte | Band |
|---|---|---|
| Ozzy | Sobald Ozzy plumpst → Staub, Ton „Plumps“, Zähler Plumps +1; höchstens alle 0,3 s | Grund |
| Ozzy | Sobald Ozzy stolpert → Ton „Hoppla“, Zeitlupe 0,15 s, Gesicht „erschrocken“ | Körper (Reaktion) |
| Ozzy | Solange Ozzy auf Eis → Gesicht „vorsichtig“, Ohren zurück | Grund |
| Ozzy | Solange Ozzy steht → Blick zum Finger | Grund |
| Duftstelle (×2) | Laune Schnüffeln (Ankündigung 1 s, Wirkung 2–4 s, Ruhezeit 10 s) | Laune |
| Schmetterling | Laune Jagen (Ankündigung: Kopf schief, Ohren hoch) | Laune |
| Wurst | Laune Gier (Ankündigung: schnuppert in die Luft) | Laune |
| Ozzy | Laune Müde: Solange Tageszeit > 80 %, Chance je Sekunde 5 % | Laune |
| Ozzy | Sobald Spieler tippt Ozzy, falls Laune Angst → Laune endet, Gesicht „getröstet“ | Spieler |
| Rahmen | Sobald Runde beginnt → Weg „Aufstehen“ (aus Sitzen), Musik „Morgen“ | Regie |
| Rahmen | Sobald Ozzy erreicht das Fähnchen → Weg „Ankommen“, Kamera „Aufzug“, Runde endet | Regie |
| Rahmen | Solange Tageszeit > 80 % → Musik „Abend“ | Grund |
| Rahmen | Sobald Zähler Fehlversuche am selben Ding = 3 → Hilfe einblenden | Regie |
| Aufgabe | Eine Runde ohne Plumps (Beweis-Lauf vorhanden) | – |
| Aufgabe | An beiden Duftstellen schnüffeln lassen | – |
| Aufgabe | Dem Schmetterling hinterherspringen | – |

Rund ein Dutzend Karten für eine Welt. Das Gehen, Gleichgewicht, Stolpern, Fallen und Aufstehen kommen aus dem Baustein, die Formen
und Wege von Florian.

---

## 8. Bezug zum Prototyp (`apps/editor/src/ozzy-figur/`)

- **Die Naht ist schon da.** `HaltungsSteuerung.setzen(ziel, art)` in `steuerung.ts` nimmt ein Ziel und eine Art (normal, mit Hüpfer,
  gemütlich), sucht den Ablauf und beginnt am Leitpunkt. Ein gleiches Ziel bei laufendem Ablauf wird ignoriert; Zusatzbewegungen eines
  unterbrochenen Ablaufs klingen aus. Genau das ist Schritt 7 des Takts („Ziele übergeben“) und die Regel „Anforderung gleich dem
  laufenden Ziel → nichts“. Die Knöpfe von heute werden Karten von morgen.
- **Abläufe sind gestaltete Wege** (`ablauf.ts`: Abschnitte mit Ziel, Dauer, Kurve, Hüpfer, Plumps, Seufzer, „steht“). Plumps und
  Seufzer am Ende eines Abschnitts sind die ersten Kandidaten für **Marken**, die als Ereignisse ins Postfach gehen (Ton, Staub).
- **Es fehlt ein fester Takt.** `main.ts` ruft `steuerung.schritt(dt)` mit der Bildzeit aus `requestAnimationFrame` (begrenzt auf
  0,1 s). `schritt` zerlegt in Teilschritte zu 1/240 s, aber die Länge des letzten hängt an der Bildzeit. Für Wiederholbarkeit braucht
  es einen Sammler, der in festen Takten rechnet (Bericht 09, Abschnitt 4).
- **Zufall gibt es noch nicht.** Gut so: Er kann gleich mit Strömen beginnen.
- **Keine Logik im Code der Figur.** Die Abläufe tragen Florians Wortlaut als Kommentar. Diese Ordnung (Daten in Tabellen, Rechnung
  ohne DOM und Uhr) passt zum Vorschlag.

---

## 9. Etappen mit vorher festgelegten Proben

Klein, im Vordergrund, je Schritt eine sichtbare Probe (Arbeitsregel 2). „Bestanden“ sagt nur Florian.

| Etappe | Inhalt | Probe (vorher festgelegt) |
|---|---|---|
| L0 Takt und Protokoll | fester Logiktakt mit Sammler, Eingabeprotokoll, Saat und Ströme, Hash je Takt; im Prototyp ohne neue Oberfläche | Dieselbe Saat und dieselben Eingaben ergeben nach 600 Takten denselben Hash; mit neuer Saat ändert sich nur, was gewürfelt wird |
| L1 Karten „Sobald“ und „Solange“, drei Bänder, Leuchten | in der Spielwiese: Ozzy, Rad, Ereignisse plumpst, landet, stolpert | Florian baut ohne Hilfe „Sobald Ozzy plumpst → Staub und Ton“ und „Solange Ozzy auf Eis → vorsichtig“ und sagt vor dem Abspielen voraus, was passiert (Vorhersage wie in den Studien aus 3.3) |
| L2 Laune | Launen-Karte mit Ankündigung, Wahl nach Rang und Gewicht, Ruhezeit, Vorlauf; Gedankenblase | In 60 s Spielwiese erkennt Florian jede Laune an ihrer Ankündigung, bevor sie wirkt (wie Probe D1 in 13) |
| L3 Werteverlauf, „Warum?“, Zurückspulen, Anhalten | Ringpuffer der Entscheidungen, Schnappschüsse, Erklärungssätze | Ein absichtlich falsch sortiertes Kartenpaar: Florian findet den Grund mit „Warum?“ in unter zwei Minuten |
| L4 Aufgaben, Zähler, Kamera, Musik, Beweis-Lauf | Zähler-Baustein, Aufgaben-Vorlagen, Kamera-Wünsche mit Überblendung, Musik-Kanal | Garten mit drei Aufgaben, jede mit Beweis; nach einer Änderung an einem Weg meldet der Editor, welche Beweise noch gelten |

Die Physik-Etappen aus Bericht 08 (Feder, Rad, Stolpern) sind Voraussetzung für L1 und L2. L0 lässt sich unabhängig davon bauen.

---

## 10. Empfehlungen

1. **Ein Modell für alle Logik: Bausteine, Drähte, Karten.** Kein Graph, kein Ereignisblatt als Hauptweg; der Graph nur als
   erzeugte Ansicht.
2. **Genau drei Kartenarten:** „Sobald“ (genau ein Ereignis, einmal), „Solange“ (Zustand, gibt von selbst zurück), „Laune“ (Phasen
   Ankündigung, Wirkung, Ende, danach, Ruhezeit). Zwei Ereignisse in einer Karte gibt es nicht.
3. **Fünf Bänder als einzige Vorrangregel:** Körper, Regie, Spieler, Laune, Grund. Im Band gewinnt die obere Karte. Keine Zahlen.
4. **Takt mit Schnappschuss:** alle Bedingungen gegen denselben Stand, dann je Kanal auflösen, dann handeln. Folge-Ereignisse im
   nächsten Takt; feste Ordnung im Postfach.
5. **Logik im festen Takt der Physik** (60 Hz, 4 Teilschritte), unabhängig von der Bildrate; Zeitgeber zählen Takte.
6. **Unterbrechen von oben, nie von der Seite;** gleiche Bänder warten auf den nächsten Halt des laufenden Wegs.
7. **Flanken mit Rückweg und Gedächtnis je Karte und Ding;** Ruhezeiten und Launenpause; Wächter für wiederholtes Auslösen und
   kippende Kanäle.
8. **Stolpern und Fallen aus der Physik des Vierbeiners;** Schwellen als Regler; Regie darf ein Stolpern anfordern, das die Physik
   ausführt; keine Tempo-Schwellen-Regeln.
9. **Launen bieten die Dinge an,** gewählt nach Rang und Gewicht (Dual-Utility) mit Charakter-Reglern; jede Laune kündigt sich an
   und beginnt nur mit Vorlauf vor dem nächsten Ding.
10. **Zufall:** eine Saat je Lauf, Ströme je Quelle und je Karte über eine Mischfunktion, xoshiro128** oder vergleichbar; nie
    `Math.random`; würfeln nur bei Entscheidungen.
11. **Sichtbarkeit von Anfang an:** Leuchten, Gedankenblase (Editor), Werteverlauf mit Schwellen, „Warum?“ und „Warum nicht?“,
    Anhalten an einer Karte, Einzeltakt, Zurückspulen.
12. **Aufgaben als Sätze über Zähler** aus wenigen Vorlagen, jede mit Beweis-Lauf; Beweise nach Änderungen ohne Bild nachspielen.
13. **Kamera als Wunsch mit Band** und Standard-Überblendung plus Ausnahmen; Kamera-Stoß additiv mit Grenze.
14. **Ton an Ereignissen und Marken in Wegen;** Marken eines ausblendenden Wegs feuern nicht; Musik als Kanal mit Wechsel an
    Schlaggrenzen.
15. **Der Prototyp zuerst:** fester Takt mit Sammler und Protokoll (Etappe L0), dann die Knöpfe durch zwei, drei Karten ersetzen.
    `setzen(ziel, art)` bleibt die Schnittstelle zwischen Logik und Wegen.
16. **Eine Stunde Kodu oder Mario Maker 2 als Abgleich** (wie Bericht 02 eine Stunde Rive vorschlägt): Florian sagt, was sich
    selbstverständlich anfühlt. Billiger als jeder eigene Entwurf. Kodu läuft auf Windows; ob ein Mac-Weg existiert, habe ich nicht
    geprüft.

---

## 11. Offene Fragen an Florian

1. **Sturkopf und Spieler:** Darf eine Laune den Spieler überstimmen (Ozzy ignoriert Antippen, solange er stur ist), oder steht der
   Spieler immer über der Laune?
2. **Gedankenblase:** nur im Editor, oder auch im Spiel als kleines Zeichen über Ozzy?
3. **Wo baust du Karten am liebsten:** direkt am Ding auf der Bühne (antippen, Satz wählen), in einer Liste aller Karten oder beides?
4. **Zufall im Spiel:** dieselbe Saat je Welt (jede Runde gleich, Launen lernbar) oder neue Saat je Runde (jedes Mal anders)?
5. **Stolpern auf Bestellung:** Soll die Regie ein Stolpern anfordern können (für Gags und Anleitungen), oder bleibt es ganz der
   Physik?
6. **Beweis-Lauf:** Pflicht für jede Aufgabe, oder nur ein Hinweis?
7. **Wörter:** Sind „Sobald“ und „Solange“ klar, oder lieber „Wenn“ und „Während“? Sind „Band“ und „Kanal“ gute Wörter, oder lieber
   „Vorrang“ und „Platz“?
8. **Zustandskarte:** Willst du Ozzys inneren Automaten als Ansicht sehen, oder genügen Leuchten und „Warum?“?

---

## 12. Grenzen dieser Recherche

- **Studien:** Die belastbaren Studien zu Wenn-dann-Regeln stammen aus der Heimautomatisierung (Ur, Huang und Cakmak, Brackenbury),
  nicht aus Spielen. Die Kodu-Arbeit wertet Programme aus, ohne Vorher-nachher-Test. Die Whyline-Studie ist sehr klein. Zu
  Ereignisblättern (Construct, GDevelop) habe ich keine kontrollierte Studie gefunden, nur Stimmen von Lehrkräften und Nutzern.
- **Quellenlage:** Die Reihenfolge der Auswertung in Dreams und LittleBigPlanet ist öffentlich nicht beschrieben; die Aussagen über
  Bild-Verzögerungen stammen aus Foren, die ich zum Teil nur über die Suche lesen konnte. Rives Ausführung habe ich aus dem Laufzeitcode
  vom 20.11.2026 gelesen; spätere Fassungen können abweichen. Zu Fortnites Tracker-Gerät fand ich keine Dokumentation; den Vergleich mit
  Aufgaben stütze ich auf Mario Maker.
- **Unbewiesen:** Die fünf Bänder, die drei Kartenarten, der Rückweg von 10 % und alle Startwerte (Ruhezeit 10 s, Launenpause 4 s,
  Vorlauf 1,5 s, Wächter-Grenzen) sind Vorschläge. Sie sind an Florians Fall zu prüfen (Abschnitt 9), nicht gemessen.
- **Nicht geprüft:** ob Kodu oder ein Nachfolger auf dem Mac läuft; ob Dreams inzwischen Haltepunkte hat; die Leistung des
  Entscheidungsprotokolls auf dem iPhone (geschätzt vernachlässigbar, weil nur bei Wechseln geschrieben wird).

---

## 13. Quellen

**Ereignisblätter und Verhaltensbausteine**

- Construct, How events work: <https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/events/how-events-work>
- Construct, System conditions (Trigger once while true, Every X seconds): <https://www.construct.net/en/make-games/manuals/construct-3/system-reference/system-conditions>
- Construct, Debugger: <https://www.construct.net/en/make-games/manuals/construct-3/interface/debugger>
- Construct, Addon-SDK, Verhalten `_tick` und `_tick2`: <https://www.construct.net/make-games/manuals/addon-sdk/runtime-reference/base-classes/sdkbehaviorinstancebase>
- Construct, Platform-Verhalten: <https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/platform>
- Construct, Advanced Random (Saat): <https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/advanced-random>
- Construct-Forum, Reihenfolge der Ereignisse: <https://construct.net/en/forum/construct-2/how-do-i-18/why-order-events-affect-119584>
- Construct-Forum, Trigger once je Exemplar: <https://construct.net/en/forum/construct-2/how-do-i-18/quottrigger-once-truequot-73128>
- Common Sense Education, Construct 3: <https://www.commonsense.org/education/reviews/construct-3>
- GDevelop, Events: <https://wiki.gdevelop.io/gdevelop5/events/>
- GDevelop, Trigger once: <https://wiki.gdevelop.io/gdevelop5/all-features/advanced-conditions/trigger-once/>
- GDevelop, Custom behaviors: <https://wiki.gdevelop.io/gdevelop5/behaviors/events-based-behaviors>
- GDevelop, Debugger: <https://wiki.gdevelop.io/gdevelop5/interface/debugger/>

**Zustandsautomaten**

- Rive, Layers: <https://rive.app/docs/editor/state-machine/layers>
- Rive, Transitions: <https://rive.app/docs/editor/state-machine/transitions>
- Rive, Laufzeitcode `state_machine_instance.cpp`: <https://github.com/rive-app/rive-runtime/blob/main/src/animation/state_machine_instance.cpp>
- Rive, C++-Laufzeit (fester Zeitschritt): <https://rive.app/docs/runtimes/cpp/state-machines>
- Unity-Forum, Any State unterbricht sich selbst: <https://discussions.unity.com/t/how-to-keep-anystate-in-animator-from-interrupting-itself/224204>
- Unity, `canTransitionToSelf`: <https://docs.unity3d.com/500/Documentation/ScriptReference/Animations.AnimatorStateTransition-canTransitionToSelf.html>
- W3C, SCXML: <https://www.w3.org/TR/scxml/>
- Esterel: <https://en.wikipedia.org/wiki/Esterel>
- Synchrone Sprachen, Vorlesung Kiel: <https://www.informatik.uni-kiel.de/~rvh/ss20/v-synch/lectures/lecture02.pdf>

**Drähte und Bauteile**

- Dreams, Logic and processing: <https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/logic-and-processing>
- Dreams-Forum, Signale verzögern: <https://forums.indreams.me/hc/it/community/posts/5551411508765-Gadget-way-for-delaying-onset-and-offset-of-signals>
- Reddit, Fehlersuche in Dreams (2019): <https://www.reddit.com/r/PS4Dreams/comments/do3h2q/have_mm_included_debugging_tools_for_logic_yet/>
- Birth.Movies.Death., Dreams: <https://birthmoviesdeath.com/2020/03/11/dreams-game-review-a-breathtaking-call-to-creativity.html>
- Destructoid, Dreams: <https://www.destructoid.com/reviews/early-access-review-dreams/>
- Common Sense Media, Dreams: <https://www.commonsensemedia.org/game-reviews/dreams>
- Media Molecule, LBP2-Elektronik: <https://www.mediamolecule.com/blog/article/emails_from_the_molecule_how_powerful_is_lbp_electronics>
- Prima, LittleBigPlanet-Werkzeuge: <https://primagames.com/eguides/little-big-planet-3-signature-series-strategy-guide/create-tools-quick-reference-the-tools-bag/gadgets>
- GamesRadar, acht Millionen Level: <https://www.gamesradar.com/how-littlebigplanet-2s-sackcloth-brilliance-inspired-the-creation-of-eight-million-levels>
- Nintendo Life, Game Builder Garage: <https://www.nintendolife.com/reviews/nintendo-switch/game_builder_garage>
- VGC, Game Builder Garage: <https://videogameschronicle.com/review/game-builder-garage>

**Regeln am Objekt, Auslöser und Reaktion**

- Wikipedia, Super Mario Maker: <https://en.wikipedia.org/wiki/Super_Mario_Maker>
- Nintendo Life, 26 Millionen Kurse: <https://www.nintendolife.com/news/2021/05/super_mario_maker_2_players_have_now_uploaded_more_than_26_million_courses>
- Shacknews, Clear Conditions: <https://shacknews.com/article/112654/how-to-set-clear-conditions-in-super-mario-maker-2>
- Prima, Clear Conditions: <https://primagames.com/tips/how-set-super-mario-maker-2-clear-conditions>
- Kotaku, Mario Maker: <https://kotaku.com/1728229196>
- Epic, Direkte Ereignisbindung: <https://dev.epicgames.com/documentation/fortnite-creative/getting-started-with-direct-event-binding-in-fortnite-creative>
- Epic, Trigger-Gerät: <https://dev.epicgames.com/documentation/fortnite/using-trigger-devices-in-fortnite-creative>
- RPG Maker MZ, Ereignisseiten: <https://rpgmakerofficial.com/product/MZ_help-en/01_09_03.html>
- ProtoPie, Triggers: <https://www.protopie.io/learn/docs/interactions/triggers>
- ProtoPie, Variables: <https://www.protopie.io/learn/docs/variables/getting-started>
- G2, ProtoPie: <https://www.g2.com/products/protopie/reviews>
- Capterra, ProtoPie: <https://www.capterra.com/p/201192/ProtoPie/reviews>
- GameSalad-Forum, Regel feuert einmal: <https://forums.gamesalad.com/discussion/comment/461497>
- GameSalad-Forum, Change und Constrain: <https://forums.gamesalad.com/discussion/comment/401133>

**Kodu und Forschung zu Laien**

- Touretzky, Principles of Kodu Computation: <https://www.cs.cmu.edu/afs/cs/user/dst/www/Kodu/Essays/kodu-principles.html>
- Stolee und Fristoe, SIGCSE 2011: <https://kstolee.github.io/assets/papers/sigcse2011.pdf>
- Microsoft Research, Kodu: <https://www.microsoft.com/en-us/research/project/kodu/>
- Folien „Teaching lawfulness with Kodu“: <https://www.sambuz.com/doc/teaching-lawfulness-with-kodu-ppt-presentation-1078945>
- Ur u. a., CHI 2014: <https://doi.org/10.1145/2556288.2557420>
- Brown University, Zusammenfassung der Studie: <https://blog.cs.brown.edu/2014/04/29/michael-littman-chi2014-programming-smart-home/>
- Huang und Cakmak, UbiComp 2015: <https://hcrlab.cs.washington.edu/assets/pdfs/2015/huang2015ubicomp.pdf>
- Brackenbury u. a., CHI 2019: <https://doi.org/10.1145/3290605.3300782> und <https://par.nsf.gov/biblio/10106413>
- Ko und Myers, Whyline, CHI 2004: <https://hci.rwth-aachen.de/materials/conferences/CHI2004/1p151.pdf>
- Bret Victor, Learnable Programming: <http://worrydream.com/LearnableProgramming/>

**Verhaltensbäume, Nutzen, Begleiter**

- Isla, Halo 2 AI, GDC 2005: <https://gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai>
- Epic, Behavior Tree Overview: <https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview>
- Epic, StateTree: <https://dev.epicgames.com/documentation/en-us/unreal-engine/state-tree-in-unreal-engine>
- Epic, Visual Logger: <https://dev.epicgames.com/documentation/en-us/unreal-engine/visual-logger-in-unreal-engine>
- Epic, Rewind Debugger: <https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-rewind-debugger-in-unreal-engine>
- Dill, Dual-Utility Reasoning, Game AI Pro 2: <http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter03_Dual-Utility_Reasoning.pdf>
- Infinite Axis Utility System: <https://gameai.com/iaus.php>
- Game Developer, Are behavior trees a thing of the past?: <https://gamedeveloper.com/programming/are-behavior-trees-a-thing-of-the-past->
- Brooks 1986, Subsumption: <https://courses.cs.washington.edu/courses/cse481c/09wi/papers/Brooks-RA86-RobustLayeredControlSystem.pdf>
- PC Gamer, The Sims: <https://www.pcgamer.com/games/the-sims/will-wright-says-the-original-sims-ai-was-actually-too-good-almost-anything-the-player-did-was-worse-than-the-sims-running-on-autopilot>
- Will Wright, Geschichte von The Sims: <https://will-wright.com/willshistory12.php>
- GamesRadar, Trico: <https://gamesradar.com/the-last-guardians-trico-is-the-gamings-perfect-pet-and-a-truly-smart-piece-of-design>
- Time, The Last Guardian: <https://time.com/4371285/last-guardian-preview>
- Game Developer, The Last Guardian: <https://gamedeveloper.com/game-platforms/how-i-the-last-guardian-i-sacrifices-gameplay-to-build-companionship>
- Wikipedia, Nintendogs: <https://en.wikipedia.org/wiki/Nintendogs>
- Game Developer, Untitled Goose Game Q&A: <https://gamedeveloper.com/design/behind-the-honk-an-i-untitled-goose-game-i-q-a>
- Orkin, F.E.A.R., GDC 2006: <https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf>
- Orkin, Combat Dialogue in F.E.A.R., Game AI Pro: <https://www.oreilly.com/library/view/game-ai-pro/9781482254792/K23980_C002.xhtml>

**Zufall, Kamera, Ton**

- Correlated Randomness in Slay the Spire: <https://forgottenarbiter.github.io/Correlated-Randomness>
- Correlated Randomness in Slay the Spire 2: <https://tck.mn/blog/correlated-randomness-sts2/>
- GosuGamers, Slay the Spire 2 ändert den Zufall: <https://www.gosugamers.net/entertainment/news/78641-slay-the-spire-2-overhauls-rng-after-players-uncover-unexpected-run-correlations-removes-a-boss>
- xoshiro und xoroshiro: <https://prng.di.unimi.it/>
- Unity Cinemachine, Kamera-Übergänge: <https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/concept-camera-control-transitions.html>
- Unity Cinemachine, CinemachineBrain: <https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/api/Unity.Cinemachine.CinemachineBrain.html>
- Spine, Events: <https://esotericsoftware.com/spine-events>
- Spine, `eventThreshold`: <https://pub.dev/documentation/esotericsoftware_spine_flutter/0.0.4/spine_flutter/TrackEntry/getEventThreshold.html>
- Spine-Forum, Ereignisse beim Mischen: <https://fr.esotericsoftware.com/forum/d/7506-choosing-to-fire-events-or-not-during-mix-with-code>

**Berichte dieser Reihe**

- [02 Rive, Lottie und die Vektor-Animationswerkzeuge](02-rive-lottie-vektor.md)
- [05 Posen, Übergänge und Zeit](05-posen-uebergaenge-zeit.md)
- [08 Figurenphysik](08-figurenphysik.md)
- [09 Physik-Engines für Web und iPhone](09-physik-engines-web.md)
- [11 Technik-Stack](11-technik-stack.md)
- [12 Bedienung](12-bedienung-kreativwerkzeuge.md)
- [13 Spieldesign: Ozzy auf dem Rad](13-spieldesign-ozzy-rad.md)
