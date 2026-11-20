# Bedienung: visuell, minimalistisch, selbsterklärend (Recherche, 20.11.2026)

Teil der Recherche zum Figureneditor „Studio“ (Bericht 12). Leitfrage: Was macht Kreativwerkzeuge selbsterklärend und elegant, und
welche Bediengrammatik und welches Grundlayout passen zu unserem Fall: ein Charakter- und Physik-Spieleditor für einen Art Director
ohne Programmierkenntnisse, auf Mac, iPad mit Stift und iPhone?

**Grundlage:** Handbücher und Hilfeseiten (Figma, Procreate, Procreate Dreams, Keynote, PowerPoint, Principle, ProtoPie, Origami,
Construct, Character Animator, Apple Motion, Rive, Spine, Unity), Apples Gestaltungsrichtlinien und der WWDC-Vortrag zu Federn, die
Texte und Vorträge von Bret Victor, Nielsen Norman Group, Norman und Nielsen (2010), Shneiderman, Raskin, Tesler. Dazu die
Nachbarberichte 01 bis 10 in diesem Ordner, Florians Vorgaben aus den Übergaben und der Prototyp `apps/editor/src/ozzy-figur/`.

**Grenzen:** Das Suchbudget des gemeinsamen Laufs war erschöpft, bevor dieser Bericht begann. Alle Quellen wurden deshalb direkt
über bekannte Adressen abgerufen. Gesperrt waren die Adobe-Hilfe (After Effects, Character Animator, Animate), die Seiten von Toon
Boom und die Videos auf Vimeo; dort stütze ich mich auf die Nachbarberichte (die diese Seiten geprüft haben) oder auf Fachwissen und
sage das jeweils. Nutzerstimmen sind dünner als gewünscht (Foren und Reddit waren ohne Suche nicht erreichbar). Eigene Tests mit
Florian gibt es noch nicht; Abschnitt 9 schlägt einen kleinen vor.

---

## 0. Kurzfassung

1. **Selbsterklärende Werkzeuge haben eine kurze Grammatik, die überall gilt.** Das Ding ist die Oberfläche: Man tippt es an,
   sieht nur seine Eigenschaften, zieht, um es zu ändern, und hält, um mehr zu sehen (Figma, Procreate, Apples Richtlinien). Je
   weniger Ausnahmen, desto weniger Handbuch.
2. **Modi sind die größte Fehlerquelle der Animationswerkzeuge.** Spine trennt Setup und Animate: Ohne Auto-Key gehen ungesetzte
   Änderungen beim Springen auf der Zeitleiste verloren, und Tests in der Grundpose verderben Animationen. Rive trennt Design und
   Animate, damit keine Schlüssel aus Versehen entstehen. Die Forschung rät: Modi nur mit zwei deutlichen Signalen, besser
   Quasimodi (gilt nur, solange man hält).
3. **Zustände mit automatischem Übergang sind die verständlichste Art zu animieren.** Keynote (Magic Move), PowerPoint (Morph),
   Figma (Smart Animate) und Principle: Folie verdoppeln, ändern, fertig. Die Zuordnung läuft über Identität oder Namen; wer sie
   erzwingen will, benennt Paare (PowerPoint mit „!!“).
4. **Principle zeigt im Übergang nur, was sich ändert, und kennt Treiber statt Zeit.** Schlüssel hängen dort an einer treibenden
   Größe (Scrollen, Ziehen). ProtoPie (Chain), Live2D und Spine (Slider) tun dasselbe. Das stützt die Nachbarberichte 01, 03, 04
   und 05: Der **Regler** ist der eine Baustein, die Zeit nur einer von vielen Reglern.
5. **Vorspielen findet Timing schneller als Schlüssel setzen** (Procreate Dreams „Perform“, Character Animator, Bret Victor). Es ist
   eine Eingabe in dieselbe Leiste, kein eigenes System, und braucht eine Glättung.
6. **Was sich von selbst bewegt, ist ein Verhalten, kein Schlüssel** (Apple Motion: Schwerkraft, Feder, Zappeln; Character
   Animator: Physik ohne Aufnahme; Figma: wiederverwendbare Animationsstile). Für uns: Physik und Effekte als **Chips** am Teil oder
   Knochen, mit zwei Reglern.
7. **Eine Feder mit zwei Zahlen reicht als Zeitsprache:** Dauer und Federung (Apple, WWDC 2023; Figmas neue Motion-Schnittstelle
   speichert Federn nur noch als „bounce“). Federn behalten beim Unterbrechen die Geschwindigkeit. Dieselben zwei Regler passen für
   Übergänge und für Nachschwingen.
8. **Gesten sind Abkürzungen, nie der einzige Weg** (Apple, Norman und Nielsen). Auf dem iPad sind Procreates Gesten der stille
   Standard der Zeichner (zwei Finger tippen = zurück, drei = wieder). Der Stift markiert sofort; Schweben zeigt eine Vorschau,
   löst aber nichts aus.
9. **Figmas Umbau UI3 ist eine ehrliche Lehre:** Schwebende Panels machten Leute langsamer und wurden zurückgenommen; Beschriftungen
   kamen wieder. Minimal heißt: wenige feste Orte, nicht: alles verstecken.
10. **Bret Victor:** Wer gestaltet, braucht eine sofortige Verbindung zu dem, was entsteht. Für ein Spiel heißt das: Zeit als Raum
    zeigen (die Spur der Figur in Vergangenheit und Zukunft) und Werte ändern, während man die Wirkung sieht.
11. **Vorschlag für Studio:** eine Bühne, darunter eine Leiste (Posen und der Regler des Gewählten), rechts ein Feld für das
    Gewählte. Vier Gesten (tippen, ziehen, halten, doppeltippen), ein Schlüsselpunkt mit drei Zuständen überall, **kein globaler
    Modus**: Geändert wird immer die **aktive Stelle** (Grundform, Pose, Stelle eines Reglers oder eines Übergangs), angezeigt durch
    den Tropfen in der Leiste und die Randfarbe der Bühne. Vier **Linsen** (Form, Knochen, Physik, Spiel) bestimmen nur, was greifbar
    ist. Gespielt wird auf derselben Bühne; wer im Lauf etwas Unschönes sieht, fasst es an, das Spiel hält dort an, und er
    korrigiert es an Ort und Stelle.
12. **Der Prototyp trägt den Keim schon:** Illustrator-Werkzeuge (V, A, ⇧C, ⌥, ⇧), eine Leiste mit Schlüsseln nach Herkunft,
    Zwiebelhaut (Z), J und K, Leertaste halten zum Verschieben; jede Änderung wird ein Schlüssel beim gezeigten Winkel. Das ist
    bereits das Modell der aktiven Stelle. Wegfallen sollte der globale Schalter B (Werkzeug an oder aus).

---

## 1. Begriffe, wie dieser Bericht sie verwendet

| Begriff | Bedeutung |
|---|---|
| **Modus** | Ein Zustand, in dem dieselbe Eingabe etwas anderes bewirkt (Nielsen Norman Group: „Same input, different results.“). |
| **Quasimodus** | Ein Modus, der nur gilt, solange man etwas hält (Raskin), etwa ⇧ oder die Leertaste. |
| **Direkte Manipulation** | Man handelt am sichtbaren Ding selbst; jede Wirkung ist sofort zu sehen und umkehrbar (Shneiderman). |
| **Schrittweise Offenlegung** | Erst das Wichtige, mehr auf Wunsch, höchstens zwei Ebenen (Nielsen). |
| **Bediengrammatik** | Die wenigen Regeln, nach denen jedes Ding auf Eingaben reagiert: Dinge (Substantive) und Gesten (Verben). |
| **Aktive Stelle** | Der eine Ort, an dem eine Änderung gespeichert wird: Grundform, Pose, Stelle auf einem Regler, Stelle in einem Übergang. |
| **Linse** | Eine Sicht, die festlegt, welche Art Dinge auf der Bühne zu sehen und zu greifen ist. Sie ändert nie, was eine Geste bedeutet. |
| **Regler, Pose, Übergang** | Wie in den Berichten 01 und 05: Regler = Leiste (eine Achse) oder Feld (zwei Achsen) mit Schlüsseln; Pose = festgehaltener Stand; Übergang = Weg von einer Pose in eine andere (in Bericht 05 „Weg“). |
| **Chip** | Ein angehängtes Verhalten (Physik) oder ein Effekt (Shader) mit wenigen Reglern. |

---

## 2. Was die besten Programme tun

### 2.1 Figma: Auswahl, Eigenschaftenfeld, Paarung über Namen

**Mechanik**

- **Auswahl und Kontext:** Man wählt auf der Leinwand; rechts erscheinen nur die Eigenschaften des Gewählten. Das ist das
  Grundmuster fast aller heutigen Gestaltungswerkzeuge.
- **UI3 (Umbau 2024):** Ziel war, die Arbeit in die Mitte zu stellen und Ablenkung zu verringern; „Minimize UI“ klappt die
  Seitenleisten ein. In der offenen Beta waren Navigation und Eigenschaften **schwebende** Panels. Die Rückmeldungen: Sie engten die
  Leinwand ein (vor allem auf kleinen Bildschirmen), lenkten ab und machten die Lineale schlechter; Figma schreibt, sie hätten
  Leute „slowed people down“. Für alle wurden die Panels deshalb **fest, aber in der Breite veränderbar**; schwebend blieben sie nur
  im Minimalmodus, in der Rasteransicht von Slides und in FigJam. Weitere Rücknahmen: „Clip content“ wurde wieder ein Häkchen statt
  eines Menüs (ein Klick weniger), Mischmodi wieder ein sichtbares Menü statt eines versteckten Knopfs. Beschriftungen sind Nomen
  mit Erklärung beim Überfahren; ein betont minimalistischer Ansatz ohne Beschriftungen wurde fallen gelassen, weil er die
  Zugänglichkeit verschlechterte. Während der Beta konnte man zur alten Oberfläche zurück
  ([Figma: Our approach to designing UI3](https://www.figma.com/blog/our-approach-to-designing-ui3/), 1.10.2024).
- **Smart Animate:** Ebenen werden zwischen zwei Rahmen gepaart, wenn **Name und Lage in der Hierarchie** gleich sind; Rahmen zu
  verdoppeln hält die Namen gleich. Lage, Größe, Deckkraft, Drehung und Füllung werden animiert. Eine neue Ebene blendet ein; eine
  Ebene, die zwischen verschiedenen Formen wechselt, wird nur überblendet. Wer eine Paarung verhindern will, benennt um oder
  gruppiert unter eigenem Namen. Wichtig für uns: **Beim Überfahren eines Objekts im Prototyp-Reiter zeigt Figma, in welchen anderen
  Rahmen es einen Partner hat.** Und der Tipp der Hilfe: beim Bauen die Dauer verlängern, um zu sehen, was passiert
  ([Smart animate](https://help.figma.com/hc/en-us/articles/360039818874)).
- **Kurven und Federn:** sieben Bézier-Vorlagen (mit „Back“ für Überschwingen), eigene Kurve; Federvorlagen **Gentle, Quick,
  Bouncy, Slow** und eine eigene Feder mit Steifigkeit, Dämpfung und Masse; Vorschau beim Überfahren
  ([Easing und Federn](https://help.figma.com/hc/en-us/articles/360051748654)).
- **Motion (neu, Stand November 2026):** Die Plugin-Schnittstelle beschreibt eine eigene Zeitleiste je Rahmen mit Schlüsselspuren
  je Eigenschaft, eine Stufe „Hold“ und Federn, die **nur noch als „bounce“ zwischen 0 und 1** gespeichert werden (physikalische
  Werte rechnet Figma um). Daneben gibt es **Animationsstile**: fertige Bewegungen (etwa Fade, Move, gestaffelter Text) mit
  wenigen Parametern, die man auf Ebenen legt und zu eigenen, benannten Stilen zusammenstellt. Die Schnittstelle ist nicht für alle
  Konten freigeschaltet (Quelle: Referenz „figma-use-motion“ der Figma-Erweiterung, Stand 18.11.2026; eine öffentliche Hilfeseite
  habe ich nicht geprüft).

**Stärken:** Das Feld zeigt nur, was zählt. Paarung über Identität macht Übergänge fast kostenlos. Sichtbare Paare beim Überfahren.
Federn mit Namen statt Physikwerten. Bewegungen als wiederverwendbare Stile, so wie Farb- und Textstile.

**Schwächen:** Die Paarung über Namen ist eine versteckte Regel: Wer eine Ebene umbenennt, ändert die Animation. Formwechsel
überblendet Smart Animate nur. Figma ist kein Werkzeug für Figuren.

**Für uns:** Ein festes, einklappbares Feld für das Gewählte; Paare sichtbar machen statt sie über Namen zu steuern; Bewegungen und
Physik als wiederverwendbare Chips; Federn mit Namen und einer Zahl.

### 2.2 Procreate: die Bühne zuerst, Gesten mit sichtbarem Zwilling

**Mechanik**

- **Aufbau:** oben rechts die Malwerkzeuge (Malen, Verwischen, Radieren, Ebenen, Farbe), oben links das Bearbeiten (Galerie,
  Aktionen, Anpassungen, Auswahl, Transformieren). Links eine **Seitenleiste** mit der Pinselgröße oben, der Deckkraft unten,
  dazwischen der **Modify-Knopf** (Pipette, frei belegbar) und die Pfeile für Rückgängig und Wiederholen. Die Seitenleiste lässt sich
  nach rechts legen (Linkshänder) und in der Höhe verschieben. Vier Finger tippen blendet alles aus
  ([Interface](https://help.procreate.com/procreate/handbook/interface-gestures/interface)).
- **Gesten:** zwei Finger tippen = zurück (halten = schnell zurück, bis 250 Schritte), drei Finger tippen = wieder; zeichnen und
  halten = QuickShape (die Linie wird gerade oder zur erkannten Form, ein zweiter Finger macht sie perfekt); Kneifen zoomt, Drehen
  dreht, schnelles Kneifen passt ein; drei Finger nach unten öffnen Kopieren und Einfügen; drei Finger schrubben leeren die Ebene.
  Jede Geste lässt sich abschalten oder umlegen, Konflikte werden gelb markiert
  ([Gestures](https://help.procreate.com/procreate/handbook/interface-gestures/gestures)).
- **Feine Regler:** Je weiter der Finger beim Ziehen vom Regler weg ist, desto feiner stellt er (ebenda).

**Stärken:** Die Leinwand ist fast alles; wenige feste Orte; Rückgängig gibt es als Geste und als sichtbaren Pfeil. Die Gesten sind
so verbreitet, dass Zeichner sie in anderen Apps erwarten.

**Schwächen:** Viele Gesten sind unsichtbar (QuickShape, Schrubben); man lernt sie aus Anleitungen, nicht aus der Oberfläche.

**Für uns:** Die Rückgängig-Gesten übernehmen. Auf dem iPad eine schmale Seitenleiste mit zwei Reglern (Größe und Stärke des
Pinsels für Gewichte) und einem Modify-Knopf als Ersatz für ⌥. „Zeichnen und halten = sauber machen“ ist eine gute Idee für Bahnen.

### 2.3 Procreate Dreams: Aufnahme als Kern, aber drei Modi

**Mechanik**

- **Aufbau:** Die Zeitleiste nimmt die untere Hälfte ein; die Grenze zur Bühne lässt sich ziehen. Spuren sind Behälter für Inhalte
  (Flipbooks, Zeichnungen, Video, Ton). **Drei Modi:** Compose (anordnen; Inhalte auf der Bühne bewegen, ohne Schlüssel zu ändern;
  ein **zweiter Finger beim Bewegen oder Drehen rastet ein**), Perform (Aufnahme) und Keyframe (Schlüssel und Kurven von Hand).
  Flipbook ist kein Modus, sondern eine Inhaltsart; Abspielen ist eine Steuerung
  ([Timeline and Modes](https://help.procreate.com/dreams/handbook/interface-and-gestures/timeline)).
- **Perform:** Abspielkopf setzen, Perform antippen, auf der Bühne ziehen: Bewegen, Skalieren, Drehen, Verzerren und Filter werden
  in Echtzeit zu Schlüsseln. Finger heben hält die Aufnahme an, wieder ziehen setzt sie fort. Mehrere Aufnahmen verschiedener Art
  liegen übereinander, gleiche Art ersetzt. Ein Regler „Motion Filtering“ glättet (0 % nimmt jedes Zittern mit). Mit dem Pencil Pro
  dreht das Rollen des Stifts den Inhalt beim Ziehen
  ([Performing](https://help.procreate.com/dreams/handbook/keyframes-and-performing/performing)).
- **Keyframe:** Abspielkopf antippen öffnet ein Aktionsmenü (Bewegen, Filter); an einer neuen Stelle wird das Symbol rot, bis man
  einen Wert setzt. Schlüsselspuren erscheinen nur in Keyframe und Perform. Die Kurve zwischen zwei Schlüsseln setzt man durch Halten
  zwischen ihnen ([Keyframes](https://help.procreate.com/dreams/handbook/keyframes-and-performing/keyframes)).
- **Weiterentwicklung:** Dreams 2 erschien im Dezember 2025 als Neugestaltung (laut
  [Wikipedia](https://en.wikipedia.org/wiki/Procreate_(software)); Einzelheiten nicht geprüft). Version 2.1 bringt ein
  losgelöstes Mini-Flipbook, eine Scrub-Sperre, sichtbarere Kurven zwischen Schlüsseln und Spiegeln ohne Schlüssel in Compose
  ([What's new](https://procreate.com/dreams/whats-new)).

**Lob:** Apple Design Award 2024 in der Kategorie Innovation, mit dem Lob mühelos intuitiver Bedienung für Finger und Stift
([Apple Newsroom](https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/)). Ein Animator mit
über 20 Jahren Erfahrung gab fünf Sterne und nennt die Oberfläche sauber und intuitiv; einziger Nachteil im Fazit: nur iPad
([Creative Bloq](https://www.creativebloq.com/reviews/procreate-dreams), 22.11.2023).

**Kritik:** TechRadar nannte Dreams nicht die erhoffte Revolution; es fehlten wichtige Animationsfunktionen wie Referenzebenen
(Zusammenfassung über Wikipedia; der Artikel selbst war nicht lesbar). Aus der Mechanik selbst: drei Modi, Schlüssel nur in zwei
davon sichtbar, Schlüssel über ein Aktionsmenü statt direkt, und dass 2.1 die Kurven „besser sichtbar“ macht, zeigt, dass sie es
vorher nicht waren.

**Für uns:** Aufnahme ja, als scharf geschaltete Eingabe am Regler, mit Glättung und „Finger heben = Pause“. Der zweite Finger als
Ersatz für ⇧ ist eine gute, erprobte Geste. Die Grenze Bühne zu Leiste ziehbar machen. Keine drei Modi.

### 2.4 Keynote Magic Move und PowerPoint Morph: Zustände, Identität, null Lernaufwand

- **Keynote:** Folie mit ⌘D verdoppeln, Objekte bewegen, drehen, skalieren, Übergang „Magic Move“ wählen. Objekte, die auf beiden
  Folien liegen, werden Teil des Übergangs; Objekte nur auf einer blenden ein oder aus (abschaltbar). Text wandert wahlweise als
  Objekt, Wort oder Zeichen. Einstellbar sind nur Dauer, Beschleunigung (keine, ein, aus, beides) und Start (Klick oder automatisch)
  ([Keynote: Übergänge](https://support.apple.com/guide/keynote/add-transitions-tanff5ae749e/mac)).
- **PowerPoint Morph:** gleich gedacht. Wer zwei verschiedene Objekte (Kreis und Quadrat) ineinander morphen will, gibt beiden im
  Auswahlbereich denselben Namen mit vorangestelltem „!!“. Morph erwartet eine Zuordnung eins zu eins; Diagramme werden nur
  überblendet ([Morph](https://support.microsoft.com/en-us/office/use-the-morph-transition-in-powerpoint-8dd1c7b2-b935-44f5-a74c-741d8d9244ea),
  [Tipps](https://support.microsoft.com/en-us/office/morph-transition-tips-and-tricks-bc7f48ff-f152-4ee8-9081-d3121788024f)).

**Stärken:** Niemand braucht eine Anleitung: Zwei Zustände zeigen, der Rechner macht den Weg. Die Zuordnung folgt der Identität
(dasselbe Objekt), die Ausnahme ist ausdrücklich.

**Schwächen:** Kaum Kontrolle über den Weg (gerade Bahnen, eine Beschleunigung für alles); nur aufeinanderfolgende Folien; die
Ausnahme hängt an einer versteckten Namensregel.

**Für uns:** „Pose verdoppeln, ändern, fertig“ ist der beste Einstieg. Die Paarung läuft bei uns ohnehin über Identität (jedes Teil
hat in allen Schlüsseln dieselben Anker, siehe `werkzeug.ts`). Ausnahmen nicht über Namen, sondern über sichtbare Paar-Nadeln wie die
Formhinweise in Animate (Berichte 03 und 06).

### 2.5 Principle: der Übergang zeigt nur, was sich ändert; Treiber statt Zeit

- **Zeichenflächen sind Zustände.** Eine Ebene wählen, auf den Blitz neben ihr tippen, von dort zur Ziel-Zeichenfläche ziehen: Es
  entsteht ein Pfeil mit Ereignis (Tippen, Ziehen, Scrollen, Halten, Überfahren, automatisch).
- **Die Zeitleiste entsteht von selbst** und listet **nur die Eigenschaften, die sich zwischen den beiden Zuständen unterscheiden**,
  je eine Zeile mit Start- und Endschlüssel; Verzögerung und Dauer zieht man an den Schlüsseln (Standard 0,3 s). Ein Klick zwischen
  die Schlüssel öffnet die Kurve oder eine Feder mit **Spannung und Reibung**. Ein Schneeflocken-Symbol friert eine Eigenschaft ein.
  Die Einstellungen gehören zur Ziel-Zeichenfläche: Jeder Übergang dorthin teilt sie.
- **Paarung über Ebenennamen;** ohne Partner erscheint oder verschwindet eine Ebene ohne Animation.
- **Treiber (Drivers):** Eigenschaften hängen an einer treibenden Größe wie Scroll- oder Ziehposition statt an der Zeit. Man fügt
  eine Eigenschaft hinzu, zieht den grauen Treiber-Zeiger an eine andere Stelle und ändert dort den Wert: ein neuer Schlüssel
  ([Principle-Dokumentation](https://principleformac.com/docs.html)).

**Für uns:** Zwei Ideen sind Gold wert. Erstens: Ein Übergang zeigt nur die Teile, die sich bewegen, und erlaubt, einzelne
„stehen zu lassen“ (die Schneeflocke; in Bericht 01 der „Anker“ eines Übergangs). Zweitens: **Treiber sind unsere Regler.** Was
Principle mit Scrollen macht, machen wir mit Neigung, Tempo und Kopfwinkel.

### 2.6 ProtoPie: Auslöser und Reaktion, stetig und als Schwelle

- **Modell:** Ein Auslöser an einer Ebene startet Reaktionen an Ebenen. Auslöser gibt es für Berührung (Tippen, Doppeltippen,
  Halten, Ziehen, Kneifen, Drehen, bis fünf Finger), bedingt (**Chain**, **Range**, Start, Detect), Maus, Tasten, Eingaben, Sensoren
  (Neigung, Kompass, Ton, Nähe) und Nachrichten zwischen Geräten
  ([Triggers](https://www.protopie.io/learn/docs/interactions/triggers)).
- **Chain** koppelt eine Eigenschaft einer Ebene stetig an eine Eigenschaft einer anderen, über zwei Bereiche (Quelle und Ziel).
  **Range** feuert einmal, wenn ein Wert in einen Bereich eintritt, und erst wieder, wenn er ihn verlassen hat.
- **Reaktionen:** Bewegen, Skalieren, Drehen, Deckkraft, Farbe, Szene wechseln (auch „Smart“), Senden, Variablen zuweisen,
  Bedingung mit >, ≥, <, ≤, =, ≠ ([Responses](https://www.protopie.io/learn/docs/interactions/responses)).

**Stärken:** Logik liest sich wie Sätze; Chain und Range decken genau die zwei Arten ab, die ein Spiel braucht: stetige Kopplung und
Schwelle. **Schwächen:** Bei vielen Regeln werden die Listen lang; Variablen und Formeln sind für Nichtprogrammierer schon schwer.

**Für uns:** „Neigung des Rads treibt den Gang“ ist eine Chain, „wenn Ozzy schneller als x wird: Stolpern“ ist eine Range. Beide
lassen sich ohne Code als Draht und als Satz darstellen (Abschnitt 6.12).

### 2.7 Origami Studio: alles möglich, aber als Knoten

- **Aufbau:** Leinwand, Ebenenliste, Inspector, **Patch-Editor** (Knoten mit Drähten), Viewer mit Live-Vorschau, eine
  Patch-Bibliothek mit Beschreibungen (⌥↩) ([Dokumentation](https://origami.design/documentation/)).
- **Zustände sind ganze Zahlen ab 0.** Ein Switch hält an oder aus, ein Option Switch wählt einen von mehreren Zuständen, ein Option
  Picker liefert je Zustand einen Wert, ein Counter zählt Zustände durch; Pop Animation ist eine Feder
  ([States](https://origami.design/documentation/patch-editor/states)).

**Stärken:** sehr mächtig, sofort sichtbar. **Schwächen:** Das ist Programmieren mit Kästchen. Werte je Zustand stecken in
Knoten, nicht an der Figur.

**Für uns:** Das Denken in Zuständen mit Werten je Zustand ist genau unser Posenmodell. Knoten zeigen wir Florian nie. Eine
durchsuchbare Bibliothek übernehmen wir.

### 2.8 Construct: Ereignisblatt als Sätze

Construct 3 baut Spiellogik aus Ereignissen: Bedingungen links, Aktionen rechts, lesbar als „wenn … dann …“. Bedingungen filtern,
welche Exemplare betroffen sind (nur der Alien, den die Kugel traf), Unterereignisse verfeinern
([Events](https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/events)). **Für uns:** Wenn es Regeln
braucht, dann als kurze Sätze in einer Liste, nicht als Graph.

### 2.9 Adobe Character Animator: Aufführung, Auslöser, Schichten von Aufnahmen

- **Starter und Pro:** Starter ist kostenlos, arbeitet mit fertigen Figuren, Gesten und Gesichtserkennung und bringt jeden in
  wenigen Minuten zum Animieren. Pro ergänzt eigene Figuren, Puppet Maker, Rigging, Körperverfolgung und Streaming. **Auslöser**
  legen Ausdrücke und Gesten auf Tasten ([Produktseite](https://www.adobe.com/products/character-animator.html)).
- **Aufnahme:** Jede Aufnahme ist ein Balken (Take). Ein roter Punkt schaltet eine Figur, ein Verhalten oder einen Parameter
  **scharf**. Stimme, Gesicht, gezogene Griffe und Blick werden wie Instrumentenspuren einzeln aufgenommen; eine neue Aufnahme
  überdeckt ältere, Griffe an den Ecken blenden weich über. Physik und Transformation laufen **passiv**, ohne Aufnahme. Abspiel- und
  Aufnahmetempo lassen sich senken, um mehr Zeit zum Vorspielen zu haben; Auslöser erscheinen als kurze Balken und lassen sich danach
  verschieben ([Recording and editing performances](https://www.adobe.com/learn/adobe-character-animator/web/recording-editing-performances)).
- **Autorig über Ebenennamen** (Kopf, Mund, Augen …) und Anheften an der Überlappung (Bericht 07); dafür gibt es einen Rig-Modus
  neben der Aufnahme.

**Stärken:** Vorspielen statt Schlüssel, Auslöser auf Tasten, Schichten, ein Starter, der in Minuten trägt. **Schwächen:** Das
Namensschema ist eine Regel, die man kennen muss (Bericht 07); Rig und Aufnahme sind getrennte Arbeitsbereiche.

**Für uns:** Posen als Auslöser beim Testen (Karte antippen oder Taste drücken, der Übergang läuft sofort); Regler einzeln scharf
schalten; langsamer aufnehmen; Physik passiv.

### 2.10 After Effects: das Puppet-Werkzeug

Nadeln auf einem Dreiecksnetz, das After Effects selbst um die Ebene legt; Ziehen an einer Nadel biegt die Ebene so starr wie
möglich (Bericht 06). Es gibt Nadeln zum Bewegen, zum Versteifen, zum Biegen und für Überlappungen; mit gedrückter Taste nimmt man
die Bewegung einer Nadel in Echtzeit auf. Die Hilfeseite war in dieser Recherche gesperrt; die Angaben stützen sich auf Bericht 06 und
Fachwissen ([Puppet tools](https://helpx.adobe.com/after-effects/using/animating-puppet-tools.html)).

**Für uns:** Die Geste „hier festhalten, dort ziehen“ versteht jeder ohne Knochenwissen. Bei uns wirkt sie auf Anker und Griffe,
nicht auf ein Bild (Illustrators Puppet Warp, Berichte 06 und 07).

### 2.11 Apple Motion: Verhalten statt Schlüssel

Motion ordnet Animation ohne Schlüssel in Verhalten: Grundbewegung (Drehen, Werfen, Wachsen, Ein- und Ausblenden, Bahn, Ausrichten,
Zeigen auf), **Simulation** (Anziehung, Schwerkraft, Feder, Abstoßen, Wirbel, Wind) und **Parameter** (Oszillieren, Zappeln,
Verbinden, Rampe, Zufall). Verhalten lassen sich mit Schlüsseln mischen und in Schlüssel umwandeln (so gliedert das
[Motion-Handbuch](https://support.apple.com/guide/motion/welcome/mac) die Kapitel; die Artikeltexte selbst waren nicht lesbar, das
Anwenden per Ziehen auf ein Objekt und die Balken in der Zeitleiste kenne ich aus der Praxis).

**Für uns:** Physik und Sekundärbewegung als Chips, die man auf ein Teil oder einen Knochen legt; „in Schlüssel umwandeln“ als
Ausweg, wenn ein Verhalten an einer Stelle von Hand nachgeformt werden soll.

### 2.12 Rive: ein guter Schlüssel-Knopf, zwei Modi als Preis

Rive trennt Design und Animate; Schlüssel entstehen nur im Animate-Modus mit gewählter Zeitleiste, und zwar bei jeder Änderung auf
der Bühne oder im Inspector. Neben jeder Eigenschaft sitzt ein **Schlüssel-Knopf mit drei Zuständen**: grau umrandet (nicht
animiert), farbig umrandet (animiert, aber kein Schlüssel hier), gefüllt (Schlüssel hier)
([Keys](https://rive.app/docs/editor/animate-mode/keys)). Lob und Kritik (Lernkurve beim Zustandsautomaten, Spuren je Eigenschaft,
Preise) stehen in Bericht 02, Abschnitt 1.2 und 1.12.

**Für uns:** Den Knopf mit drei Zuständen übernehmen, überall gleich. Die zwei Modi nicht (Abschnitt 5.1).

### 2.13 Spine und Toon Boom Harmony: der Preis der Macht

- **Spine:** Jede Eigenschaft hat einen Schlüssel-Knopf: grün (kein Schlüssel hier), **orange (geändert, aber nicht gesetzt)**, rot
  (Schlüssel hier). Ohne Auto-Key gehen Änderungen im Animate-Modus verloren, sobald man die Stelle auf der Zeitleiste wechselt;
  retten kann sie nur ein Rückgängig an der neuen Stelle. Mit Auto-Key entstehen leicht ungewollte Schlüssel. Knochenschlüssel sind
  relativ zur Grundpose gespeichert; wer sie ändert, ändert alle Animationen ([Keys](https://esotericsoftware.com/spine-keys)). Ein
  Forumsfaden heißt sinngemäß „Animationen verdorben, nachdem ich im Setup-Modus etwas getestet habe“
  ([Forum 10531](https://esotericsoftware.com/forum/d/10531)). Der Baum als Hauptweg gilt als meistgenannte Klage, dazu das
  Gewichtsmalen mit vielen ähnlichen Farben (Bericht 01, 1.11 und 5.3). Gut ist die neue **Problem-Ansicht mit Ein-Klick-Lösungen**
  in 4.3 (Bericht 01, 1.9).
- **Toon Boom Harmony:** das Werkzeug der Serienproduktion, mit vielen Ansichten (Kamera, Zeichnung, Zeitleiste, X-Sheet,
  Knotenansicht, Funktionen) und mächtigen Bausteinen wie Master Controllern und Morph-Hinweisen (Berichte 03 und 05). Die Vielzahl
  der Ansichten ist Erfahrungswissen; die Seiten von Toon Boom waren in dieser Recherche nicht erreichbar.

**Für uns:** Die Problem-Ansicht übernehmen, die Setup-Falle und den Baum nicht. Macht entsteht dort durch Fenster und Modi; wir
wollen sie durch einen einzigen Baustein (den Regler) und eine Grammatik erreichen.

### 2.14 Bret Victor: sofortige Verbindung, Zeit als Raum

- **Inventing on Principle** (CUSEC, 2012): Sein Leitsatz lautet, „creators need an immediate connection to what they create“. Im
  Beispiel eines Jump-and-Run spult er die Zeit zurück und lässt sich die **Spur der Figur** zeigen, rückwärts in die Vergangenheit
  und vorwärts in die Zukunft; ändert er einen Wert (Sprungkraft), läuft die vorhergesagte Spur sofort mit, bis die Figur durch die
  Lücke passt. Zeitbasiertes Arbeiten brauche Zeit, die auf Raum abgebildet ist. Im zweiten Beispiel animiert er auf dem iPad mit
  den Händen statt mit Schlüsseln (ein fallendes Blatt, ein Schwenk, ein Hase, dessen Posen er im Takt umschaltet) und ist nach
  rund zwei Minuten fertig ([Vortrag](https://worrydream.com/InventingOnPrinciple/),
  [Mitschrift](https://jamesclear.com/great-speeches/inventing-on-principle-by-bret-victor)).
- **Stop Drawing Dead Fish** (SF SIGGRAPH, 16.5.2012): Werkzeuge sollen die Reaktionsfähigkeit einer Simulation mit der Spontaneität
  einer Aufführung verbinden; heute entstehen lebendige Umgebungen nur über Code
  ([Ankündigung](https://san-francisco.siggraph.org/?p=712), [Vortrag](https://worrydream.com/StopDrawingDeadFish/)).
- **Learnable Programming** (2012): Bedeutung klar machen, Ablauf sichtbar machen, Zustand zeigen, durch Reagieren erschaffen,
  schrittweise verallgemeinern, Daten im Zusammenhang zeigen, Zeit über mehrere Maßstäbe zeigen. Kernsatz: „People understand what
  they can see.“ ([Text](https://worrydream.com/LearnableProgramming/))
- **Magic Ink** (2006): Interaktion ist oft Last statt Hilfe und sollte das letzte Mittel sein; gute Software zeigt das, was im
  jetzigen Zusammenhang wichtig ist, und schließt den Zusammenhang aus Umgebung und Verlauf
  ([Text](https://worrydream.com/MagicInk/)).

**Für uns:** die Spur der Zukunft beim Einstellen der Physik; Posen im Takt umschalten, während man vorspielt; das Feld rechts zeigt
Zusammenhang (welche Anker bewegt dieser Knochen?) statt Menüs.

---

## 3. Prinzipien aus Forschung und Richtlinien

### 3.1 Modi und Quasimodi

- **Nielsen Norman Group** (Laubheimer, 14.4.2019): Modi helfen, wenn es mehr Funktionen als Eingaben gibt (Werkzeuge in Photoshop).
  Sie schaden durch Moduspatzer (man handelt, ohne den Modus zu bemerken) und schlechtere Auffindbarkeit (Funktionen nur in einem
  Modus). Empfehlungen: den aktiven Modus mit **mindestens zwei redundanten Signalen** zeigen (etwa Hintergrund und Zeiger), Modi klar
  benennen, Modi meiden, wo ein Patzer teuer ist, Bestätigungen sparsam. **Quasimodi** verhindern Patzer, sind aber schwerer zu
  entdecken und auf Dauer anstrengender ([Modes](https://www.nngroup.com/articles/modes/)).
- **Tesler und Raskin:** Larry Tesler fuhr ein Nummernschild „NO MODES“; Jef Raskin nannte Modi eine Hauptquelle von Fehlern und hielt
  eine Oberfläche nur mit Quasimodi für modusfrei. Werkzeugpaletten in Grafikprogrammen sind Modi; das kurze Halten einer Taste für
  ein anderes Werkzeug ist ein Quasimodus ([Wikipedia: Mode](https://en.wikipedia.org/wiki/Mode_(user_interface))).
- **Bei uns schon gelebt:** In Ozzy wechseln 1, 3, 7 und 0 die Ansicht beim Tippen, beim Halten schaut man nur kurz hin
  (`docs/look/ozzy/UEBERGABE.md`, Abschnitt Bedienung); im Prototyp verschiebt die gehaltene Leertaste die Ansicht.

### 3.2 Direkte Manipulation

Shneiderman prägte den Begriff 1982 und beschrieb ihn 1983: stetige Darstellung der Dinge, um die es geht; körperliche Handlungen
statt Befehlssprache; schnelle, kleine, umkehrbare Schritte mit sofort sichtbarer Wirkung
([Wikipedia](https://en.wikipedia.org/wiki/Direct_manipulation_interface)). Für einen Figureneditor heißt das: Jeder Wert, den Florian
ändern kann, hat einen Griff an der Figur, und jeder Zug zeigt seine Wirkung im selben Bild.

### 3.3 Schrittweise Offenlegung, Hick, Jakob

- **Schrittweise Offenlegung** (Nielsen, 3.12.2006): wenige wichtige Optionen zuerst, der Rest auf Wunsch; der Knopf zum Rest muss
  sichtbar sein und ehrlich sagen, was dahinter liegt; **höchstens zwei Ebenen**; nicht mehrere Wege zu denselben Zusatzoptionen
  ([Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)).
- **Hick:** Die Entscheidungszeit wächst mit Zahl und Verwickeltheit der Wahlmöglichkeiten (Hick und Hyman, 1952): weniger Optionen,
  empfohlene Option hervorheben, schrittweise einführen ([Hick's Law](https://lawsofux.com/hicks-law/)).
- **Jakob:** Menschen erwarten, dass ein Werkzeug funktioniert wie die, die sie kennen; bei Umstellungen eine Weile das Gewohnte
  erlauben ([Jakob's Law](https://lawsofux.com/jakobs-law/)). Florian kennt Illustrator und Blender und wünscht sich
  Vektorwerkzeuge wie in Illustrator (19.11.); deren Tasten V, A, P, ⇧C, ⌥, ⇧ und ⌘Z gelten deshalb.

### 3.4 Gesten

Norman und Nielsen (2010) kritisieren Gestenoberflächen: unsichtbar, nicht auffindbar, von App zu App verschieden, oft ohne
Rückgängig, mit kleinen Zielen und zufälligen Auslösungen. Sie fordern Sichtbarkeit, Rückmeldung, Beständigkeit, Rückgängig und
große Ziele ([Gestural Interfaces](https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/)). Apple sagt dasselbe als
Regel: Standardgesten nutzen; eigene Gesten nur als **Abkürzung** für häufige Aufgaben, nie als einzigen Weg; sie in der App lehren;
sofort Rückmeldung geben; erklären, warum eine Geste gerade nicht geht. Halten zeigt zusätzliche Möglichkeiten; Rückgängig ist im
System ein Wischen mit drei Fingern nach links, Wiederholen nach rechts
([Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)). Procreates Tippen mit zwei und drei Fingern
ist davon verschieden, unter Zeichnern aber der gelernte Standard.

### 3.5 Stift und Finger

Apples Richtlinien zum Apple Pencil ([Apple Pencil and Scribble](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble)):

- „Let people make a mark the moment Apple Pencil touches the screen.“ Kein Knopf und kein Modus vor dem ersten Strich.
- Stift und Finger jederzeit wechseln lassen; Bedienelemente müssen auch auf den Stift reagieren.
- **Schweben** zeigt eine Vorschau (Größe, Farbe des Strichs), löst aber nie etwas aus, schon gar nichts Zerstörerisches.
- **Doppeltippen** auf den Stift folgt der Systemeinstellung (Standard: Werkzeug ↔ Radierer); eigenes Verhalten nur auf Wunsch.
- **Drücken** (Pencil Pro) ist eine kurze, einzelne Geste; eine Palette dazu erscheint **nahe der Stiftspitze**; nichts Zerstörerisches.
- **Rollen** des Stifts nur für das Verhalten der Markierung, nicht für die Navigation.
- Druck einfach abbilden (Breite, Deckkraft). Für Links- und Rechtshänder planen, keine Bedienelemente unter die Hand legen.

### 3.6 Federn als gemeinsame Zeitsprache

Apple (WWDC 2023, „Animate with springs“) nennt Masse, Steifigkeit und Dämpfung „not very intuitive for defining a spring
animation“ und beschreibt Federn mit **Dauer** (wahrgenommen, bleibt stabil) und **Federung** (bounce: über 0 schwingt über, 0 läuft
glatt aus, unter 0 flacher). Empfehlung: erst die Dauer, dann die Federung; 0 als Standard, rund 15 % für etwas Verspieltes, über 0,4
selten. Der entscheidende Vorteil: Eine Feder **kann mit jeder Anfangsgeschwindigkeit starten** und übernimmt sie, wenn eine Geste
endet oder ein neues Ziel mitten in der Bewegung kommt; eine feste Kurve ruckt dann
([WWDC23 10158](https://developer.apple.com/videos/play/wwdc2023/10158/)). Figma geht denselben Weg (Vorlagen mit Namen, Motion nur
noch mit „bounce“), Principle bietet Spannung und Reibung. Für Übergänge zwischen Posen ist das genau, was Bericht 05 fordert
(Geschwindigkeit erhalten, jederzeit unterbrechbar).

### 3.7 Trefferflächen und Look

Apple nennt als Standardgröße für Bedienelemente auf iPhone und iPad 44 × 44 pt (mindestens 28 × 28), auf dem Mac 28 × 28 pt
(mindestens 20 × 20), dazu Abstand um 12 pt bei umrandeten und 24 pt bei freien Elementen
([Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). Florians Look will dagegen feine
Dinge: Linien 1 und 0,25 px, Punkte 2,5 px Durchmesser, ein kleiner Dreieck-Zeiger, beim Klick gleitet der Zeiger zur Stelle (seine
Vorgaben vom 14.11.). Beides passt zusammen, wenn man **sichtbare Größe und Trefferfläche trennt**: Der Punkt bleibt klein, die
Trefferfläche ist groß, und der Zeiger zieht magnetisch zur getroffenen Stelle (in der Linien-Studie gebaut).

---

## 4. Zwölf Muster, die durch alle guten Lösungen gehen

1. **Die Bühne ist die Oberfläche.** Procreate, Figma (Minimize UI), Victor: Griffe sitzen dort, wo sie wirken.
2. **Wählen zeigt Kontext.** Ein Feld zeigt nur, was zum Gewählten gehört (Figma); ein Übergang zeigt nur, was sich ändert (Principle).
3. **Zustände statt Zeit.** Folien, Zeichenflächen und Rahmen sind Posen; der Übergang entsteht von selbst, die Ausnahme ist
   gestaltbar (Keynote, PowerPoint, Figma, Principle).
4. **Identität ist die Zuordnung.** Dasselbe Ding auf beiden Seiten wird gepaart; eine ausdrückliche Paarung ist die Ausnahme
   (PowerPoint „!!“, Formhinweise in Animate).
5. **Regler statt Zeitleiste.** Schlüssel hängen an treibenden Größen (Principle-Treiber, ProtoPie Chain, Live2D, Spine-Slider).
6. **Vorspielen ist Eingabe.** Aufnahme in Echtzeit mit Glättung (Dreams, Character Animator, Victor).
7. **Verhalten statt Schlüssel** für das, was sich von selbst bewegt (Motion, Character Animator, Spine-Physik, Figma-Stile).
8. **Ein Zeichen für „animiert?“.** Ein Knopf mit drei Zuständen an jeder Eigenschaft (Rive, Spine).
9. **Gesten haben sichtbare Zwillinge.** Zwei Finger tippen und der Pfeil in der Seitenleiste (Procreate; Apple; Norman und Nielsen).
10. **Modus nur sichtbar und benannt, besser als Quasimodus** (NN/g, Raskin; Ozzys Ansichtstasten).
11. **Zeigen statt verhindern.** Paare beim Überfahren (Figma), Problem-Ansicht (Spine 4.3), Spur der Zukunft (Victor).
12. **Einstieg über ein Beispiel.** Starter mit fertigen Figuren (Character Animator), „Folie verdoppeln und ändern“ (Keynote).

---

## 5. Ehrliche Gegenüberstellung für unseren Fall

**Maßstäbe:** (K1) Florian arbeitet mit dem Auge, ohne zu programmieren, und kennt Illustrator und Blender. (K2) Figur, Physik und
Spiel in einem Werkzeug. (K3) Mac und iPad mit Stift gleichwertig, iPhone zum Prüfen. (K4) Glatte Morphs; er formt Übergänge selbst.
(K5) Eine Grammatik für alles. (K6) Leistung: nichts blockiert, nichts ruckt („Die Performance muss hervorragend sein überall!“,
16.11.). (K7) Aufwand zu bauen.

### 5.1 Wo landet eine Änderung?

| Möglichkeit | Vorbild | Für | Gegen |
|---|---|---|---|
| Zwei globale Modi (Formen / Bewegen) | Spine, Rive, Linearity Move; Bericht 02, Empf. 16 | verhindert Schlüssel aus Versehen; bekannt aus Rive | Moduspatzer (Spine-Forum); Funktionen nur in einem Modus; widerspricht Florians Grundidee „In einer Pose arbeiten alle Werkzeuge wie in der Basis; das Ergebnis ist der Blendshape“ |
| Auto-Key ohne Ortsanzeige | Spine mit Auto-Key | schnell | ungewollte Schlüssel, man sieht nicht, wo sie landen |
| **Aktive Stelle wie aktive Ebene** | Ebenen in Procreate und Photoshop; der Prototyp (jede Änderung wird Schlüssel beim gezeigten Winkel) | kein Moduswechsel; nichts geht verloren; Florian arbeitet heute schon so | Gefahr, die falsche Pose zu ändern; braucht zwei deutliche Signale und ein Nachher-Angebot |

**Urteil:** die aktive Stelle. Sie folgt Florians Grundidee und dem Prototyp, in dem er seit dem 19.11. genau so arbeitet. Die Gefahr
des falschen Orts fangen vier Dinge ab: der Tropfen in der Leiste, die Randfarbe der Bühne mit einem Hinweis („ändert: Pose
Erschrecken · Kopf 37°“), ein kurzer **Geltungs-Chip** nach jeder Änderung („nur hier · in allen Posen · in der Grundform“) und ein
Rückgängig, das nie versagt. Wer etwas ausprobieren will, ohne etwas zu ändern, nimmt die Karte **Probe** (Bericht 01, 5.3). Ehrlich:
Das ist eine Wette gegen Rives Erfahrung; Abschnitt 9 prüft sie mit einer einzigen Aufgabe.

### 5.2 Ordnungsprinzip der Zeit (aus Sicht der Bedienung)

| Möglichkeit | Vorbild | Für | Gegen |
|---|---|---|---|
| Spuren-Zeitleiste je Eigenschaft | Spine, After Effects, Rive | genau, vertraut | dicht, viele Zeilen, Filter nötig (Rive), Lernkurve |
| Zustände mit Auto-Übergang | Keynote, PowerPoint, Figma, Principle | ohne Lernaufwand | wenig Kontrolle über den Weg |
| Regler mit Schlüsseln (Treiber) | Principle, ProtoPie, Live2D, Spine 4.3 | ein Baustein für Zeit, Winkel, Neigung, Tempo; direkt vom Spiel steuerbar | abstrakter als „Zeit“; mehr als zwei Achsen je Feld schwer (Bericht 04) |
| Aufführung | Dreams, Character Animator | lebendiges Timing, ideal für Stift und Finger | schwer genau nachzubearbeiten ohne Ausdünnen |
| Knoten | Origami, Harmony | alles verknüpfbar | Programmieren mit Kästchen |

**Urteil:** wie Bericht 05: Posen und Regler sind das Gerüst; Aufnahme ist eine Eingabe in dieselbe Leiste; eine kurze Taktleiste
gibt es nur innerhalb eines gestalteten Übergangs; Spuren je Eigenschaft nur im Expertenteil (zweite Ebene); Knoten nie.

### 5.3 Panels

| Möglichkeit | Vorbild | Für | Gegen |
|---|---|---|---|
| Feste, verstellbare Seitenleisten | Figma UI3 (endgültig) | ruhig, schnell, Lineale und Leinwand frei | nimmt Platz |
| Schwebende Panels | Figma UI3 (Beta) | luftig | verdecken, lenken ab, machen langsamer (Figma) |
| Fast keine | Procreate | maximale Leinwand | Eigenschaften versteckt in Menüs |
| Viele Ansichten | Harmony | alles sichtbar | erschlägt Anfänger |

**Urteil:** eine Bühne, eine Leiste unten, ein Feld rechts; fest, in der Größe verstellbar, einklappbar; alles ausblenden mit einer
Taste oder vier Fingern.

### 5.4 Gesten oder sichtbare Knöpfe (iPad)

**Urteil:** Standardgesten (Ziehen, Kneifen, Halten) und Procreates Rückgängig-Gesten übernehmen; jede Geste hat einen sichtbaren
Zwilling (Pfeile, Knöpfe in der Leiste); eigene Gesten nur als Abkürzung. Systemgesten von iPadOS (drei Finger wischen) nicht
überdecken; in Safari auf dem iPad testen, ob sie mit unseren kollidieren.

### 5.5 Kopplungen und Spiellogik

| Möglichkeit | Vorbild | Für | Gegen |
|---|---|---|---|
| Knoten | Origami, Unreal Blueprints | mächtig | für Florian zu abstrakt |
| Zustandsautomat als Graph | Rive, Unity | übersichtlich bei wenigen Zuständen | Pfeilgewirr ab rund zehn Posen (Bericht 05) |
| Auslöser → Reaktion, Ereignisblatt | ProtoPie, Construct | liest sich wie Sätze | Listen werden lang |
| Draht auf der Bühne | Principle-Treiber, ProtoPie Chain | sichtbar am Ding, stetig | nur für Kopplungen, nicht für Ereignisse |

**Urteil:** **Drähte** für stetige Kopplungen (Rad-Neigung treibt Gang), **Sätze** für Ereignisse (wenn Tempo über x: Stolpern).
Die Posen samt Übergängen zeigt eine Matrix (Berichte 01, 04, 05), kein freier Graph.

### 5.6 Automatik oder Hand

**Urteil:** Automatik zuerst (Paarung über Identität, Standardfeder, Autorig), jede Stelle von Hand überschreibbar, und was Florian
von Hand gesetzt hat, überschreibt keine Automatik mehr (seine Schlüssel werden nie gelöscht, Regel seit dem 19.11.; Bericht 03,
11.8). Die
Herkunft jedes Schlüssels bleibt sichtbar (Vorlage, gebaut, seins), wie heute in der Zeitleiste des Prototyps.

### 5.7 Zeitsprache: Kurven oder Federn

**Urteil:** überall eine Feder mit **Dauer und Federung**, mit benannten Vorlagen (sanft, knapp, federnd, langsam). Kurven je
Schlüssel nur in der zweiten Ebene. Dieselben zwei Regler stellen Übergänge und das Nachschwingen der Physik-Chips ein; die
Physikwerte (Masse, Dämpfung) liegen dahinter.

### 5.8 Linsen, reine Auswahl oder viele Schalter

| Möglichkeit | Vorbild | Für | Gegen |
|---|---|---|---|
| Viele Sichtbarkeitsschalter je Art | Spine | volle Kontrolle | viele Knöpfe, vergessene Zustände |
| Rein über die Auswahl | Figma | kein Zusatzbegriff | Knochen und Teile liegen übereinander; ein Tipp ist mehrdeutig |
| **Vier benannte Linsen** | Ozzys Ansichtstasten (tippen bleibt, halten schaut) | eindeutig, wer greifbar ist; wenige Knöpfe | ein leichter Modus; muss sichtbar sein |

**Urteil:** vier Linsen (Form, Knochen, Physik, Spiel). Sie bestimmen nur, was zu sehen und zu greifen ist; Gesten bedeuten in jeder
Linse dasselbe. Halten einer Linse ist ein Quasimodus zum kurzen Hinsehen.

### 5.9 Plattform

**Urteil:** Mac und iPad gleichwertig, mit derselben Grammatik; das iPad mit Stift ist ausdrücklich gewünscht (16.11.). Das iPhone
dient zum Spielen, Posen ansehen und für kleine Korrekturen. Genauigkeit kommt über Zoom, feine Regler (Procreate) und das
magnetische Einrasten des Zeigers, nicht über winzige Ziele.

### 5.10 Einstieg

**Urteil:** kein eigener Anfängermodus. Studio öffnet mit dem Projekt Ozzy; leere Stellen erklären sich mit einem Satz; eine Taste
zeigt die Gesten der jetzigen Linse; eine Befehlssuche hilft auf dem Mac. Der Prüfer (Problem-Ansicht) zeigt, wo etwas springt.

---

## 6. Vorschlag: Bediengrammatik und Grundlayout für Studio

### 6.1 Fünf Leitsätze

1. **Die Figur ist die Oberfläche.** Was sich ändern lässt, hat einen Griff an der Figur.
2. **Vier Gesten bedeuten überall dasselbe.** Tippen wählt, Ziehen ändert, Halten zeigt mehr, Doppeltippen geht hinein.
3. **Es gibt einen Baustein: den Regler.** Zeit, Kopfwinkel, Neigung, Tempo, Gelenkwinkel und jede Physik-Stärke sind Regler mit
   Schlüsseln (Berichte 01, 03, 04, 05).
4. **Es gibt immer genau eine aktive Stelle, und man sieht sie.**
5. **Automatisch zuerst, von Hand überall, und Handarbeit bleibt.**

### 6.2 Die Grammatik

**Gesten (Verben)**

| Geste | Bedeutung | Beispiel |
|---|---|---|
| **Tippen** | wählen | Ohr antippen: das Feld rechts zeigt das Ohr |
| **Ziehen** | ändern, an der aktiven Stelle | Ohr nach hinten ziehen: Schlüssel bei Neigung −0,6 |
| **Halten** (Mac auch Rechtsklick) | mehr an Ort und Stelle | Halten auf einem Anker: Ecke oder glatt, Gewichte, Spiegeln |
| **Doppeltippen** | hinein | Figur → Teil → Anker; auf leerer Bühne: einpassen |
| Tippen ins Leere oder Esc | hinaus | vom Anker zurück zum Teil, dann zur Figur |

**Der Schlüsselpunkt (überall gleich, nach Rive)**

- ○ grau: Dieser Wert ändert sich längs des gewählten Reglers nicht.
- ◌ farbiger Ring: Er ändert sich, aber an dieser Stelle liegt kein Schlüssel.
- ● gefüllt: Hier liegt ein Schlüssel.
- Tippen auf ○ oder ◌ setzt einen Schlüssel mit dem jetzigen Wert; Tippen auf ● springt hin; Halten auf ● öffnet Federung,
  Kopieren, Spiegeln, Löschen. Der Punkt sitzt neben jeder Eigenschaft im Feld, an gewählten Ankern und Knochen auf der Bühne und als
  Marke auf der Leiste. Einen „geändert, aber nicht gesetzt“-Zustand (Spines Orange) gibt es nicht: Jede Änderung landet sofort an
  der aktiven Stelle.

**Abwandler**

- ⇧: einrasten (45°, Achsen) und zur Auswahl hinzufügen. Auf dem iPad: ein **zweiter Finger** auf der Bühne rastet ein (wie Dreams).
- ⌥: Griff brechen, aus der Mitte ziehen (wie Illustrator). Auf dem iPad: den **Modify-Knopf** in der Seitenleiste halten.

**Anhängen statt Menüs**

- ＋ öffnet die **Bibliothek** (Posen, Verhalten, Effekte, Welt-Dinge, Regeln) mit Suche. Ziehen aus der Bibliothek auf ein Ding
  hängt an (wie Verhalten in Motion und Animationsstile in Figma).

### 6.3 Die Dinge und ihre Griffe

| Ding | Erscheint als | Tippen | Ziehen | Halten | Doppeltippen |
|---|---|---|---|---|---|
| Figur | die Figur auf der Bühne | wählt sie | verschiebt sie in der Welt | Posen, Verhalten, Export | hinein (Teile) |
| Teil (Fläche) | Fläche mit Kontur beim Überfahren | wählt es | verschiebt es | Effekte, Reihenfolge, Spiegeln | Anker zeigen |
| Anker | kleiner Punkt (2,5 px), große Trefferfläche | wählt ihn | verschiebt ihn samt Griffen | Ecke ↔ glatt, Gewichte | — |
| Griff | Nadel, die beim Halten erscheint | wählt ihn | Richtung und Länge; ⌥ bricht | koppeln oder lösen | rundet |
| Knochen | schmaler Keil (Linse Knochen) | wählt ihn, Anker zeigen ihr Gewicht | Spitze dreht; Pfote ziehen = Ziel folgen | Länge, Grenzen, Verhalten | Gewichte malen |
| Regler | Leiste unten oder Bogen am Gelenk | springt an die Stelle | fährt den Wert | Bereich, rund, wer treibt | groß öffnen |
| Feld (zwei Achsen) | Fläche mit Schlüsselpunkten | springt hin | fährt beide Werte | wie Regler | groß öffnen |
| Schlüssel | Punkt auf Regler oder Feld | springt hin | verschiebt ihn | Federung, Kopieren, Spiegeln, Löschen | — |
| Pose | Karte mit Vorschaubild | Figur geht über den Übergang dorthin, Karte wird aktiv | nach oben ziehen: stufenlos einblenden | umbenennen, spiegeln, verdoppeln, löschen | — |
| Übergang | Brücke zwischen zwei Karten, Zelle der Matrix | Taktleiste zeigen | Dauer ändern | Feder, gestaltet, eigen | Taktleiste groß |
| Verhalten (Physik) | Chip am Teil oder Knochen | seine zwei Regler zeigen | Stärke | an, aus, in Schlüssel umwandeln | Expertenwerte |
| Effekt (Shader) | Chip am Teil oder an einer Gruppe | Regler zeigen | Stärke | an, aus | Expertenwerte |
| Draht | dünne Linie (Linse Spiel) | Kopplungskurve zeigen | Kurve formen | lösen | — |
| Regel | Satz in einer Liste (Linse Spiel) | Beteiligte auf der Bühne leuchten | — | bearbeiten, aus, löschen | — |
| Welt-Ding (Rad, Hindernis) | Fläche in der Welt | wählt es | verschiebt es | Reibung, Masse, Eingabe | Form bearbeiten |

Die Tabelle ist absichtlich gleichförmig: Wer zwei Zeilen kennt, kann die übrigen erraten.

### 6.4 Die aktive Stelle

- **Was sie sein kann:** die Grundform (erste Karte), eine Pose (Karte), eine Stelle auf einem Regler (etwa Kopf 37°, Neigung −0,6)
  oder eine Stelle in einem Übergang (etwa Stehen → Sitzen bei 40 %).
- **Wo man sie wählt:** in der Leiste unten. Eine Karte antippen macht die Pose aktiv; auf einem Regler oder einer Taktleiste
  tippen macht diese Stelle aktiv. Die Bühne ist das Werkzeug, die Leiste ist der Ort.
- **Signal 1, der Tropfen:** Unter der aktiven Karte oder auf der aktiven Stelle der Leiste sitzt ein Tropfen; beim Wechsel fließt er
  mit einer Feder hinüber, wie der Tropfen unter dem gewählten Werkzeug in Ozzy (liquid drop).
- **Signal 2, der Rand:** Die Bühne bekommt einen schmalen Rand in der Farbe der Art (neutral für die Grundform, die Farbe der Pose,
  ein Akzent für Regler und Übergang) und oben einen leisen Hinweis: „ändert: Pose Erschrecken · Kopf 37°“.
- **Geltungs-Chip:** Nach einer Änderung erscheint für einige Sekunden ein kleiner Chip mit „nur hier · in allen Posen · in der
  Grundform“; wer ihn übergeht, hat „nur hier“ gewählt. Ändert jemand die Grundform, bietet der Chip „Posen ausgleichen“ an (Bericht
  01, 5.3).
- **Probe:** Die Karte „Probe“ speichert nie etwas und geht nie ins Spiel. Für alles, was man nur ausprobieren will.
- **Nichts geht verloren:** Wechseln der Stelle verwirft nichts (anders als Spine ohne Auto-Key). Halten auf einem Eintrag im Verlauf
  bietet „in eine andere Pose verschieben“ an.

### 6.5 Linsen

| Linse | Sichtbar und greifbar | Typische Arbeit |
|---|---|---|
| **Form** | Teile, Anker, Griffe, Verschmelzen | Formen, Schlüsselformen, Übergänge nachformen |
| **Knochen** | Knochen, Gelenkbögen, Gewichte | Autorig prüfen, Gewichte, Korrekturformen je Gelenkwinkel |
| **Physik** | Physik-Chips, Stoßformen, Spur der Zukunft | Nachschwingen, Gewicht, Balance einstellen |
| **Spiel** | Welt-Dinge, Eingänge und Ausgänge, Drähte, Regeln | Rad, Hindernisse, Kopplungen, Regeln |

Tippen auf eine Linse wechselt, Halten schaut nur kurz hin (Quasimodus, wie Ozzys Ansichtstasten). Vorschlag für Tasten: 1 bis 4
(Florian legt die Tastenbelegung fest; am 15.11. sagte er „später“). Die Linse ändert nie, was eine Geste bedeutet; sie ändert nur,
was unter dem Finger liegt.

### 6.6 Werkzeuge

Nur so viele, wie Illustrator-Hände erwarten:

- **V** Auswahl (ganze Dinge), **A** Direktauswahl (Anker und Griffe), **P** Stift (Anker setzen; wird geklickt, nicht gezogen; ↩
  schließt), **⇧C** Ankerpunkt umwandeln, **L** Lasso (seine Vorgabe vom 16.11.).
- In der Linse Knochen: **B** Knochen zeichnen (vom Gelenk zur Spitze ziehen; an einer Spitze weiterziehen ergibt eine Kette) und
  **W** Gewichte malen (Druck des Stifts = Stärke; ⌥ nimmt weg). B ist frei, sobald der globale Schalter B des Prototyps entfällt.
- Alles andere sind Dinge mit Griffen, keine Werkzeuge.

### 6.7 Grundlayout

**Mac und iPad quer**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Ozzy › Kopf › Maske A        ◉ Form  ○ Knochen  ○ Physik  ○ Spiel          ▶  ⋯ │  Ort · Linsen · Spielen
├──────┬───────────────────────────────────────────────────────────┬────────────┤
│  V   │                                                           │ Maske A    │
│  A   │                                                           │ ────────── │
│  P   │                                                           │ Fläche   ● │
│  L   │                     B Ü H N E                             │ Verjüngung │
│ ──── │                                                           │ Verschmelz.│
│ Größe│          ändert: Pose „Erschrecken“ · Kopf 37°            │ ＋ Effekt   │
│  ▮   │        (Rand in der Farbe der aktiven Stelle)             │ ＋ Verhalten│
│ Stärke                                                           │ Mehr ▾     │
│  ▮   │                                                           │            │
│  ◻   │  ← Modify (iPad)                                          │            │
├──────┴───────────────────────────────────────────────────────────┴────────────┤
│ [Grundform] [Stehen]═[Gehen] [Sitzen] [Erschrecken]• [Probe]  ＋           ▦   │  Posen; • Tropfen; ═ eigener Übergang; ▦ Matrix
│ ◆────────◆──────────●─────────────◆────────────◆    Kopf 0°…360°   J  K  Z  ●  │  Leiste des Gewählten
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Oben:** der Ort als Pfad (Figur › Teil › Anker; antippen springt hinaus), die vier Linsen, ▶ Spielen, ein Menü für Datei und Export.
- **Links:** vier Werkzeuge; auf dem iPad darunter zwei senkrechte Regler (Größe und Stärke des Pinsels) und der Modify-Knopf, wie
  bei Procreate; für Linkshänder nach rechts legbar.
- **Mitte:** die Bühne, mindestens rund drei Viertel der Fläche.
- **Rechts:** das Feld des Gewählten, fest, in der Breite verstellbar, einklappbar; oben die häufigen Werte mit Beschriftung, unten
  „Mehr“ (zweite und letzte Ebene).
- **Unten:** zwei Zeilen. Oben die Posen-Karten mit Brücken für eigene Übergänge; ▦ schaltet auf die Übergangs-Matrix. Darunter die
  Leiste des Gewählten: ein Regler, ein Feld oder die Taktleiste eines Übergangs, mit J, K (Schlüssel davor und danach), Z
  (Zwiebelhaut) und ● (Aufnahme scharf). Die Grenze zur Bühne ist ziehbar (wie Dreams).

**iPhone**

```
┌────────────────────────────┐
│ Ozzy › Kopf            ▶ ⋯ │
│                            │
│           BÜHNE            │
│                            │
│ [Stehen][Gehen][Sitzen] ▦  │
│ ◆────●──────◆───   J K Z   │
└────────────────────────────┘
```

Das Feld des Gewählten kommt als Blatt von unten (Halten auf dem Ding). Werkzeuge gibt es nicht; Ziehen an Ankern und Reglern reicht
für kleine Korrekturen. Schwerpunkt: Spielen, Posen und Übergänge ansehen, eine Stelle notieren.

### 6.8 Gesten- und Tastenkarte (Vorschlag)

| Was | Mac | iPad | iPhone |
|---|---|---|---|
| Wählen | Klick | Tippen (Stift oder Finger) | Tippen |
| Hinzuwählen | ⇧-Klick, L Lasso | Lasso; Modify halten und tippen | — |
| Ändern | Ziehen | Ziehen (Stift genau, Finger grob) | Ziehen |
| Einrasten | ⇧ beim Ziehen | zweiter Finger auf die Bühne | — |
| Griff brechen | ⌥ beim Ziehen | Modify halten | — |
| Mehr | Halten oder Rechtsklick | Halten; Pencil Pro: Drücken öffnet die Palette an der Spitze | Halten |
| Hinein / hinaus | Doppelklick / Esc oder Klick ins Leere | Doppeltippen / Tippen ins Leere | wie iPad |
| Zurück / wieder | ⌘Z / ⇧⌘Z | zwei / drei Finger tippen (halten = schnell); Pfeile links | wie iPad |
| Ansicht | Leertaste halten und ziehen; ⌘+ ⌘− ⌘0; Rad mit ⌘ | zwei Finger; schnelles Kneifen passt ein | zwei Finger |
| Spielen / anhalten | Leertaste kurz | ▶ | ▶ |
| Schlüssel davor / danach | J / K | Schlüssel antippen | Schlüssel antippen |
| Schritt auf dem Regler | , und . (⇧ = größerer Schritt) | Regler ziehen (feiner, je weiter der Finger weg ist) | Regler ziehen |
| Zwiebelhaut / Bahnen | Z / ⇧Z | Knöpfe an der Leiste | Knöpfe |
| Aufnehmen | ● scharf, dann ziehen | ● scharf, ziehen; Finger heben = Pause | — |
| Linse wechseln / kurz sehen | 1–4 tippen / halten | Linse tippen / halten | Linse tippen |
| Werkzeuge | V A P L ⇧C, in der Linse Knochen B W | Leiste links | — |
| Alles ausblenden | ⇥ | vier Finger tippen | — |
| Befehl suchen | ⌘K | — | — |

Leertaste kurz und Leertaste gehalten sind zwei Bedeutungen derselben Taste, getrennt durch die Dauer; die gehaltene Leertaste
verschiebt im Prototyp schon heute die Ansicht. Tab blendet in Illustrator und Photoshop die Panels aus; in Ozzy (3D) öffnet Tab die
vier Ansichten. Weil Studio ein eigenes Fenster ist, folgt es hier Illustrator; Florian entscheidet.

### 6.9 Posen und Übergänge bedienen

- **Pose festhalten:** ＋ in der Kartenreihe hält den jetzigen Stand als Pose fest; Halten auf einer Karte → „verdoppeln“ (der
  Keynote-Weg: verdoppeln, ändern, fertig).
- **Pose ansehen:** Karte antippen. Die Figur geht über den Übergang dorthin, und man sieht ihn sofort. Die Karte ist danach aktiv.
- **Stufenlos mischen:** Karte nach oben aus der Reihe ziehen, je weiter, desto stärker (Blenders Posenbibliothek, Bericht 05).
- **Übergang formen:** Gibt es keinen eigenen Übergang, gilt die Standardfeder. Langes Halten zwischen zwei Karten oder Antippen der
  Brücke öffnet in der zweiten Zeile die **Taktleiste** des Übergangs (0 bis 100 %) mit Zwiebelhaut. Auf der Bühne an einer Stelle
  ziehen setzt einen Zwischenschlüssel **nur in diesem Übergang**. Im Feld: Dauer, Federung, „stehen lassen“ je Teil (die Füße
  bleiben; Principles Schneeflocke) und Zusätze wie ein Hüpfer.
- **Übersicht:** ▦ zeigt die Matrix „von × nach“ mit kleinen Filmstreifen; leere Zellen nehmen den Standard (Berichte 01, 04, 05).
- **Testen wie Character Animator:** Während ▶ läuft, wechselt Antippen einer Karte die Pose; so sieht Florian jeden Übergang aus
  jeder Lage, auch mitten in einem anderen.
- **Vorspielen:** ● an einem Regler scharf schalten, dann auf der Bühne ziehen; Finger heben = Pause; eine Glättung im Feld; auf
  Wunsch langsamer aufnehmen. Das Ergebnis sind Schlüssel auf demselben Regler, ausgedünnt (Bericht 05, 2.8).

### 6.10 Knochen, Autorig, Gewichte

- **Autorig mit einem Knopf** im Feld der Figur: „Knochen vorschlagen“. Der Vorschlag erscheint als Geisterknochen; ein Tippen
  übernimmt ihn, Ziehen an Gelenken korrigiert (Bericht 07). Was Florian geändert hat, bleibt beim nächsten Autorig stehen.
- **Knochen bewegen:** Spitze ziehen dreht; Pfote ziehen lässt die Kette folgen; Halten auf der Pfote → „hier festmachen“ (Ziel).
- **Gewichte:** Knochen antippen; die Anker zeigen ihr Gewicht als Füllring, die Fläche als leise Wärme (nur der gewählte Knochen
  leuchtet, Bericht 01, 5.3). Am Anker senkrecht ziehen ändert das Gewicht (die Zahl erscheint nur beim Ziehen). Mit W malen, Druck =
  Stärke. Griffe erben das Gewicht ihres Ankers; ein kleines Schloss am Anker zeigt das, Tippen auf das Schloss gibt dem Griff ein
  eigenes Gewicht (Berichte 03 und 07).
- **Korrekturform je Gelenkwinkel:** Der Gelenkwinkel ist ein Regler. Knochen auf den Winkel drehen, die Form korrigieren: Das wird
  ein Schlüssel dieses Reglers (Moho Smart Bones, Bericht 03). Keine neue Bedienung, nur die Grammatik.

### 6.11 Physik und Effekte als Chips

- **Chips** wie Schwingen, Federn, Wackeln, Atmen, Schwer, Verschmelzen, Glanz. Jeder zeigt zuerst zwei Regler (bei Bewegung:
  Weichheit, die der Dauer entspricht, und Federung); die Expertenwerte (Masse, Dämpfung, Grenzen, Wind; Bericht 01, 5.2) liegen unter
  „Mehr“.
- **Chip-Regler sind schlüsselbar** wie alles andere (der Punkt daneben).
- **Verschmelzen** ist ein Chip an einer Gruppe von Teilen mit einem Regler für die Weichheit (Renderer über Abstandsfelder, Bericht 10).
- **In Schlüssel umwandeln** (Halten auf dem Chip), wenn eine Stelle von Hand nachgeformt werden soll (Motion).

### 6.12 Spiel: Drähte, Sätze und Spielen auf derselben Bühne

- **Spielen:** ▶ oder die Leertaste startet das Demospiel auf derselben Bühne; die Leisten bleiben. Florian dreht das Rad selbst.
- **Anfassen hält an:** Fasst er während des Spiels einen Griff der Figur an, hält das Spiel an genau diesem Bild an, und er formt an
  Ort und Stelle. Der Geltungs-Chip schlägt die wahrscheinlichste Stelle vor (die Pose mit dem größten Anteil, den Regler, der sich
  gerade am stärksten bewegt, den laufenden Übergang); ein Tippen bestätigt. Das ist der heikelste Teil des Vorschlags und braucht
  eine eigene Probe.
- **Nichts wird zurückgesetzt:** Unity setzt Änderungen im Play-Modus beim Verlassen zurück und tönt deshalb den Editor ein
  ([Unity: Game view](https://docs.unity.com/en-us/engine/current/manual/unity-editor/editor-windows-views-reference/game-view)). Bei
  uns bleibt, was im Spiel geändert wird; Rückgängig gilt wie sonst.
- **Drähte:** In der Linse Spiel zeigen Dinge kleine Ausgänge (Rad: Winkel, Tempo; Ozzy: Balance, Tempo). Von einem Ausgang auf einen
  Regler ziehen legt einen Draht; antippen zeigt die Kopplungskurve mit zwei Bereichen (ProtoPie Chain).
- **Regeln** als Sätze, zusammengetippt aus Dingen auf der Bühne: „Wenn Ozzy · Tempo · über · 1,2 → Übergang zu · Stolpern“. Eine
  Regel feuert beim Eintritt in den Bereich (ProtoPie Range); Antippen eines Satzes lässt die Beteiligten aufleuchten.

### 6.13 Sehen statt raten

- **Zwiebelhaut (Z)** längs des gewählten Reglers: der Schlüssel davor warm, der danach kalt (wie heute im Prototyp).
- **Bahnen (⇧Z):** Die Wege der Anker längs des Reglers als feine Linien. Sie zeigen Rutschen, Verklumpen und zwei Anker, die
  aneinander vorbeilaufen (der Grund für Faltschlüssel), bevor man sie im Film sucht. Das ist Victors „Zeit als Raum“ für Formen.
- **Spur der Zukunft** (Linse Physik): Beim Ziehen an einem Physik-Regler zeigt die Bühne Ozzys Umriss für die nächsten ein bis zwei
  Sekunden als Geisterbilder (Victor; Cascadeur in Bericht 05). Ob das schnell genug rechnet, ist zu prüfen.
- **Prüfer:** eine Liste von Hinweisen wie Spines Problem-Ansicht: Sprünge, Rutschen, Knicke, Kerben, schwebende Teile. Jeder Hinweis
  hat „Zeigen“ (springt hin, mit Zwiebelhaut) und, wo es eine gibt, eine Ein-Klick-Lösung. Der Prüfer setzt um, was seit dem 19.11.
  gilt: Kerben und schwebende Teile selbst suchen, glatt geht vor Skizzentreue. Geändert wird nichts ohne Florian.

### 6.14 Einstieg ohne Handbuch

- Studio öffnet mit dem Projekt Ozzy, nicht mit einer leeren Bühne.
- Leere Stellen erklären sich mit einem Satz und einem Knopf („Noch keine Pose. Figur formen, dann ＋“).
- Beim Überfahren erscheinen Name und Taste; „?“ (oder eine Taste) zeigt die Gesten der jetzigen Linse als Bild über der Bühne.
- ⌘K sucht Befehle.
- Wörter aus dem Begriffsvorschlag in Bericht 01, 5.1; keine Kennungen (Florian sieht nie eine Regler-ID, Bericht 04, 7.9).

### 6.15 Was wir bewusst nicht bauen

- zwei globale Modi; einen Knoteneditor; einen Baum als Hauptweg; Spuren je Eigenschaft als Standardansicht;
- schwebende Panels; Namensregeln als Mechanik; Gesten ohne sichtbaren Zwilling;
- Dialogfenster, die die Arbeit anhalten (außer vor endgültigem Löschen);
- mehr als zwei Ebenen der Offenlegung.

### 6.16 Look der Bedienung

Der Look ist zweitrangig, aber die Bedienung hat schon eine Sprache: liquid drop (Tropfen, die mit Federn fließen), Lobster für
Überschriften, harter Kontrast, feine Linien und kleine Punkte, der Zeiger gleitet zur Stelle. Der Vorschlag nutzt sie, statt eine
neue zu erfinden: Der Tropfen zeigt den Ort, Schlüsselpunkte und Anker sind klein, Trefferflächen groß (Abschnitt 3.7).

---

## 7. Ozzy auf dem Rad: drei Aufgaben in dieser Grammatik

**A. „Beim Bergabgehen legt Ozzy die Ohren an.“**
Linse Spiel: Der Regler „Neigung“ (vom Rad getrieben) ist sichtbar. Antippen: Die untere Leiste zeigt Neigung von −1 bis +1. Auf −0,6
ziehen, Ozzy kippt. Linse Form, Ohr antippen, nach hinten ziehen: Der Schlüsselpunkt füllt sich, ein Schlüssel des Ohrs bei Neigung
−0,6 ist gesetzt. Z zeigt die Stellen 0 und −0,6 übereinander. Keine Zeitleiste, kein Modus.

**B. „Wird er zu schnell, stolpert er.“**
Linse Spiel, ＋ Regel: „Wenn Ozzy · Tempo · über · 1,2 → Übergang zu · Stolpern“. ▶, Rad schnell drehen, Ozzy stolpert. Den Übergang
Gehen → Stolpern antippen, bei 30 % den Kopf tiefer ziehen: ein Zwischenschlüssel nur in diesem Übergang. Federung im Feld etwas höher.

**C. „Der Schwanz schwingt nach.“**
Linse Knochen, Schwanzknochen antippen, ＋ Verhalten → Schwingen. Zwei Regler: Weichheit und Federung. In der Linse Physik zeigt die
Spur der Zukunft beim Ziehen, wie der Schwanz bei einem Halt nachschwingt.

---

## 8. Bezug zum Prototyp (`apps/editor/src/ozzy-figur/`)

**Schon da (in `werkzeug.ts`):** Werkzeuge Direktauswahl (A), Auswahl (V), Umwandeln (⇧C); ⌥ bricht einen Griff; ⇧ rastet 45° ein
und erweitert die Auswahl; Rahmenauswahl; Pfeile schieben (⇧ = 10); ⌘Z, ⇧⌘Z, ⌘0, ⌘+, ⌘−, ⌘A; Leertaste halten verschiebt die
Ansicht; Esc leert die Auswahl, dann das Teil; J und K springen zum Schlüssel davor und danach; Z schaltet die Zwiebelhaut (davor
orange, danach grün); Komma und Punkt drehen den Kopf in Schritten (⇧ = 5°). Die Zeitleiste hat eine Zeile je Kopfteil, Schlüssel mit
Herkunft (Vorlage, gebaut, seins). **Jede Änderung wird ein Schlüssel des Teils beim gezeigten Winkel; die Nachbarn blenden weich
ein.** Das ist das Modell der aktiven Stelle (5.1), und Florian arbeitet damit seit dem 19.11.

**Ändern:**

- Der globale Schalter **B** (Werkzeug an oder aus) entfällt: Bearbeiten geht immer; ▶ Spielen ist der Gegenpol, und Anfassen hält an.
- Die Zeitleiste der Kopfdrehung wird die allgemeine **Leiste des Gewählten** (Bericht 05, 5.2), die Zeilen je Teil bleiben als
  Expertenansicht.
- Die Herkunftsfarben bleiben: Sie schaffen Vertrauen, weil Florian sieht, welche Schlüssel seine sind.
- Die Zahlentasten (heute Steuerknöpfe in `main.ts`) werden später Linsen oder Posen-Auslöser; das entscheidet die Tastenbelegung.

---

## 9. Prüfplan „selbsterklärend“ (klein, im Vordergrund)

- **Fünf Aufgaben ohne Erklärung** am Mac, danach dieselben am iPad mit Stift: (1) Ohren beim Bergabgehen anlegen (A oben). (2) Eine
  neue Pose „Erschrecken“ anlegen und den Übergang aus „Gehen“ nachformen. (3) Den Schwanz nachschwingen lassen. (4) Stolpern bei zu
  viel Tempo. (5) Eine Stelle finden und glätten, an der die Nase rutscht.
- **Wer:** Florian, wenn er Zeit hat, und Nicole. Je rund 20 Minuten, laut denken. Notiert wird nur: geschafft ja oder nein, Zeit,
  Fehlgriffe, Stelle des Zögerns, und ob eine Änderung je an der falschen Stelle landete, ohne dass es bemerkt wurde.
- **Kriterium vorab:** vier von fünf Aufgaben ohne Hilfe; kein unbemerkter Patzer bei der aktiven Stelle. Schlägt die aktive Stelle
  fehl, wird das Modell „zwei Modi“ (Bericht 02) als Gegenprobe gebaut, nicht vorher.
- **Technik auf dem iPad (Safari):** Zwei- und Drei-Finger-Tippen, Kneifen, Halten, Schweben des Stifts und die Systemgeste mit drei
  Fingern: Kommt iPadOS dazwischen? Getrennt von den Aufgaben prüfen.
- **Tempo:** Die Bühne bleibt beim Ziehen flüssig (Mac 120 Bilder je Sekunde, iPad 60 oder mehr), ein Zug zeigt seine Wirkung im
  nächsten Bild.

---

## 10. Empfehlungen

1. **Grammatik zuerst bauen, Funktionen danach:** tippen, ziehen, halten, doppeltippen, hinaus mit Esc oder Tippen ins Leere; dazu
   Rückgängig als Taste, Geste und Pfeil. Jede neue Funktion muss sich in Tabelle 6.3 eintragen lassen, sonst wird sie umgebaut.
2. **Kein globaler Modus.** Die aktive Stelle mit Tropfen, Randfarbe, Hinweis und Geltungs-Chip; dazu die Karte „Probe“.
3. **Ein Schlüsselpunkt mit drei Zuständen** an jeder Eigenschaft, an gewählten Ankern und Knochen und auf der Leiste.
4. **Grundlayout:** Bühne, unten Posen und die Leiste des Gewählten, rechts ein festes, verstellbares, einklappbares Feld, links vier
   Werkzeuge (iPad: plus zwei Regler und Modify). Keine schwebenden Panels.
5. **Vier Linsen** (Form, Knochen, Physik, Spiel); tippen wechselt, halten schaut kurz hin.
6. **Illustrator-Tasten behalten** (V, A, P, ⇧C, L, ⌥, ⇧, ⌘Z, ⌘0) und J, K, Z, Komma, Punkt aus dem Prototyp; B und W für Knochen und
   Gewichte; Tasten final mit Florian.
7. **iPad:** Procreates Gesten für Rückgängig und Wiederholen, zweiter Finger zum Einrasten, Modify-Knopf, Stift markiert sofort,
   Schweben nur als Vorschau, Drücken öffnet eine kleine Palette an der Spitze. Trefferflächen 44 pt, sichtbare Punkte klein.
8. **Posen wie Folien:** ＋ hält fest, Halten verdoppelt, Antippen zeigt den Übergang sofort, Ziehen nach oben mischt stufenlos.
9. **Übergänge:** Standardfeder mit Dauer und Federung; eigener Übergang über die Brücke mit Taktleiste, Zwischenschlüsseln, „stehen
   lassen“ je Teil; Matrix als Übersicht.
10. **Eine Zeitsprache:** Federn mit Dauer und Federung und vier benannten Vorlagen, für Übergänge und Physik-Chips gleich. Kurven nur
    unter „Mehr“.
11. **Physik und Effekte als Chips** mit zwei Reglern, schlüsselbar, „in Schlüssel umwandeln“ als Ausweg.
12. **Spiellogik ohne Code:** Drähte für stetige Kopplungen, Sätze für Ereignisse. Keine Knoten, kein freier Zustandsgraph.
13. **Spielen auf derselben Bühne;** Anfassen hält an und bearbeitet an Ort und Stelle; im Spiel Geändertes bleibt.
14. **Sehen statt raten:** Zwiebelhaut, Bahnen der Anker, Spur der Zukunft, Prüfer mit „Zeigen“; nichts automatisch ohne Florian.
15. **Aufnahme als Eingabe:** ● am Regler scharf, ziehen, Finger heben = Pause, Glättung, Ausdünnen.
16. **Einstieg über Ozzy:** Projekt öffnet mit der Figur, leere Stellen erklären sich, Gesten-Bild auf Wunsch, Befehlssuche.
17. **Reihenfolge des Baus**, je Schritt eine vorher festgelegte sichtbare Probe: (a) Grammatik und Feld am heutigen Werkzeug, (b)
    allgemeine Leiste mit Schlüsselpunkt, Zwiebelhaut und Bahnen, (c) Posen-Karten und aktive Stelle, (d) Übergänge mit Feder, (e)
    iPad-Gesten und Stift, (f) Linse Knochen mit Gewichten, (g) Physik-Chips und Spur der Zukunft, (h) Linse Spiel mit Drähten,
    Sätzen, Spielen und Anhalten, (i) Prüfer.

---

## 11. Offene Fragen an Florian

1. **Aktive Stelle oder zwei Modi?** Darf Studio ohne Modi auskommen (ändern, wo der Tropfen sitzt, wie heute im Werkzeug), oder
   möchtest du lieber getrennt „Formen“ und „Bewegen“ wie Rive (Vorschlag in Bericht 02)?
2. **Tasten:** B für Knochen, W für Gewichte, 1 bis 4 für die Linsen, Tab blendet alles aus, Leertaste kurz spielt. Passt das, oder
   willst du es anders belegen?
3. **iPad-Gesten wie Procreate** (zwei Finger tippen = zurück, drei = wieder)?
4. **Feld rechts** fest und einklappbar, oder lieber nur bei Bedarf (Halten)?
5. **„Anfassen hält das Spiel an“:** gewünscht, oder soll Spielen und Bearbeiten getrennt bleiben?
6. **Federn mit zwei Reglern** (Dauer, Federung) überall: reicht dir das, oder willst du Kurven sehen?
7. **Linsen:** Sind Form, Knochen, Physik, Spiel die richtigen vier, und passt das Wort „Linse“ (sonst „Sicht“)?
8. **iPhone:** nur Spielen und Ansehen, oder auch kleine Korrekturen an Posen?

---

## 12. Grenzen dieser Recherche und Hinweise

- Das Suchbudget war erschöpft; alle Quellen wurden über bekannte Adressen direkt gelesen. Gesperrt: Adobe-Hilfe, Toon Boom, Vimeo.
  Angaben zum Puppet-Werkzeug, zu Harmony und zum Anwenden von Verhalten in Motion stützen sich auf Nachbarberichte oder Fachwissen
  und sind im Text so gekennzeichnet.
- Figmas Motion-Schnittstelle ist aus der Referenz der Figma-Erweiterung (Stand 18.11.2026) beschrieben, nicht aus einer öffentlichen
  Hilfeseite.
- Die Kritik an Procreate Dreams stammt aus einer Zusammenfassung (Wikipedia) und aus der Mechanik selbst; Forenstimmen fehlen. Die
  Einzelheiten von Dreams 2 sind nicht geprüft.
- **Hinweis zu Bericht 05:** Dort ist vimeo.com/36579366 als Video zu „Stop Drawing Dead Fish“ verlinkt. Nach meinem Wissen ist das
  die Aufnahme von „Inventing on Principle“ (CUSEC 2012); die Seite des Autors leitet „Stop Drawing Dead Fish“ auf vimeo.com/64895205
  weiter (geprüft) und „Inventing on Principle“ auf vimeo.com/906418692 (geprüft).
- Alle Vorschläge zur Bedienung sind unbewiesen, bis Florian sie in der Hand hatte (Abschnitt 9).

---

## 13. Quellen

**Figma**
- [Our approach to designing UI3](https://www.figma.com/blog/our-approach-to-designing-ui3/) (1.10.2024)
- [Smart animate layers between frames](https://help.figma.com/hc/en-us/articles/360039818874)
- [Prototype easing and spring animations](https://help.figma.com/hc/en-us/articles/360051748654)
- Figma Plugin-API, Motion (Referenz „figma-use-motion“ der Figma-Erweiterung, Stand 18.11.2026)

**Procreate und Procreate Dreams**
- [Procreate: Gestures](https://help.procreate.com/procreate/handbook/interface-gestures/gestures)
- [Procreate: Interface](https://help.procreate.com/procreate/handbook/interface-gestures/interface)
- [Dreams: Timeline and Modes](https://help.procreate.com/dreams/handbook/interface-and-gestures/timeline)
- [Dreams: Performing](https://help.procreate.com/dreams/handbook/keyframes-and-performing/performing)
- [Dreams: Keyframes](https://help.procreate.com/dreams/handbook/keyframes-and-performing/keyframes)
- [Dreams: What's new (2.1)](https://procreate.com/dreams/whats-new)
- [Creative Bloq: Procreate Dreams review](https://www.creativebloq.com/reviews/procreate-dreams) (22.11.2023)
- [TechRadar: Procreate Dreams isn't quite the revolution …](https://www.techradar.com/computing/software/procreate-dreams-isnt-quite-the-revolution-i-wanted-for-animation-but-im-holding-out-hope) (nur Überschrift lesbar)
- [Wikipedia: Procreate (software)](https://en.wikipedia.org/wiki/Procreate_(software))
- [Apple Design Awards 2024](https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/)

**Zustände und Übergänge**
- [Keynote: Übergänge, Magic Move](https://support.apple.com/guide/keynote/add-transitions-tanff5ae749e/mac)
- [PowerPoint: Morph](https://support.microsoft.com/en-us/office/use-the-morph-transition-in-powerpoint-8dd1c7b2-b935-44f5-a74c-741d8d9244ea)
- [PowerPoint: Morph, Tipps und Tricks](https://support.microsoft.com/en-us/office/morph-transition-tips-and-tricks-bc7f48ff-f152-4ee8-9081-d3121788024f)
- [Principle: Dokumentation](https://principleformac.com/docs.html)
- [ProtoPie: Triggers](https://www.protopie.io/learn/docs/interactions/triggers)
- [ProtoPie: Responses](https://www.protopie.io/learn/docs/interactions/responses)
- [Origami Studio: Dokumentation](https://origami.design/documentation/)
- [Origami Studio: States](https://origami.design/documentation/patch-editor/states)
- [Construct 3: Events](https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/events)

**Figurenanimation**
- [Adobe Character Animator](https://www.adobe.com/products/character-animator.html)
- [Character Animator: Recording and editing performances](https://www.adobe.com/learn/adobe-character-animator/web/recording-editing-performances)
- [After Effects: Puppet tools](https://helpx.adobe.com/after-effects/using/animating-puppet-tools.html) (gesperrt; über Bericht 06)
- [Apple Motion: Handbuch](https://support.apple.com/guide/motion/welcome/mac),
  [Behaviors versus keyframes](https://support.apple.com/guide/motion/behaviors-versus-keyframes-motnf425e02f/mac)
- [Rive: Keys](https://rive.app/docs/editor/animate-mode/keys)
- [Spine: Keys](https://esotericsoftware.com/spine-keys)
- [Spine-Forum 10531](https://esotericsoftware.com/forum/d/10531)
- [Unity: Game view (Play-Modus)](https://docs.unity.com/en-us/engine/current/manual/unity-editor/editor-windows-views-reference/game-view)

**Bret Victor**
- [Inventing on Principle](https://worrydream.com/InventingOnPrinciple/) (Weiterleitung auf vimeo.com/906418692),
  [Mitschrift](https://jamesclear.com/great-speeches/inventing-on-principle-by-bret-victor)
- [Stop Drawing Dead Fish](https://worrydream.com/StopDrawingDeadFish/) (Weiterleitung auf vimeo.com/64895205),
  [Ankündigung SF SIGGRAPH](https://san-francisco.siggraph.org/?p=712)
- [Learnable Programming](https://worrydream.com/LearnableProgramming/)
- [Magic Ink](https://worrydream.com/MagicInk/)

**Prinzipien und Richtlinien**
- [Nielsen Norman Group: Modes in User Interfaces](https://www.nngroup.com/articles/modes/) (Laubheimer, 14.4.2019)
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) (Nielsen, 3.12.2006)
- [Wikipedia: Mode (user interface)](https://en.wikipedia.org/wiki/Mode_(user_interface))
- [Wikipedia: Direct manipulation interface](https://en.wikipedia.org/wiki/Direct_manipulation_interface)
- [Norman und Nielsen: Gestural Interfaces, A Step Backwards in Usability](https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/) (Interactions 17/5, 2010)
- [Laws of UX: Jakob's Law](https://lawsofux.com/jakobs-law/), [Hick's Law](https://lawsofux.com/hicks-law/)
- [Apple HIG: Apple Pencil and Scribble](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble)
- [Apple HIG: Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [WWDC23: Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/)

**Nachbarberichte in diesem Ordner**
- 01 Spine und Skelett-Werkzeuge (Begriffe 5.1, Setup-Falle 1.2, Problem-Ansicht 1.9, Kritik 1.11)
- 02 Rive, Lottie, Vektor-Werkzeuge (Design- und Animate-Modus 1.2, Kritik 1.12, Empfehlung 16, Linearity Move 5)
- 03 Moho und Harmony (Formhinweise, Smart Bones, Grammatik 11.7, Autorig 11.8)
- 04 Live2D (Bedienung 7.9, viel Oberfläche als Kritik)
- 05 Posen, Übergänge, Zeit (Leiste mit Schlüsseln 5.2, Posenleiste 5.3, Aufnahme 2.8, Bildschirm 5.11)
- 06 Morph-Mathematik (Puppet, ARAP, Formhinweise)
- 07 Autorig (Character Animator, Gewichte)
- 10 Rendern und Shader (Verschmelzen)
