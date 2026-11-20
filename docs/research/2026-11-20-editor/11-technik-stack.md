# 11 · Technik für das Editor-Produkt „Studio“

Stand: 20.11.2026. Thema: die technische Grundlage des Figureneditors. Dazu gehören Oberfläche, Zustand und Rückgängig,
Dokumentformat, Speichern, Zusammenarbeit, Verpackung als App, iPad mit Stift, Tastenkürzel, Tests und eine gemeinsame
Laufzeit für Editor und Spiel. Dazu kommen die geprüften Open-Source-Bausteine samt Lizenz.

Verwandte Berichte: 02 (Rive, Lottie, Vektor-Werkzeuge), 09 (Physik-Engines), 10 (Rendern und Shader). Physik und Renderer
stehen hier nur mit Lizenz, Pflege und Einbindung.

---

## Wie diese Recherche entstand (und wo sie Grenzen hat)

- **Die Websuche war schon zu Beginn dieses Berichts aufgebraucht.** Alle parallelen Recherchen teilen sich ein gemeinsames
  Budget. Ich habe deshalb Primärquellen gezielt direkt abgerufen: Handbücher, Changelogs, Release-Seiten, Lizenztexte,
  Standards-Positionen, die Browser-Tabellen von caniuse und den Quelltext der WebKit-Grundeinstellungen. Dazu kommen die
  Metadaten der npm-Registry, gelesen am 20.11.2026 (Version, Datum, Lizenz, Herausgeber, Abhängigkeiten jedes Pakets).
  Daher stammen alle Versions- und Datumsangaben in diesem Bericht.
- **Nutzerstimmen aus Foren und Reviews konnte ich so nicht einholen.** Als „Nutzerstimmen“ dienen hier vor allem die
  Erfahrungen aus diesem Repo (Prototypen, Fallen, Florians Rückmeldungen). Wo ich Stärken und Schwächen aus eigener
  Kenntnis beschreibe, steht **„nach meinem Wissen“**. Diese Punkte sind ungeprüft.
- Wer die Lücke schließen will: Eine neue Sitzung mit frischem Suchbudget kann gezielt Foren zu Tauri gegen Electron, zu
  Solid 2.0 und zu paper.js 0.17 lesen (siehe „Offene Fragen“).

---

## Kurzfassung

1. **Kein fertiges Produkt taugt als Grundlage, ein eigener Editor auf eigener Laufzeit ist begründet.** Rive verschmilzt
   keine Flächen und hat keine Physik (Berichte 02 und 10). Die Spine-Laufzeiten verbietet ihre Lizenz für einen eigenen
   Editor. Das tldraw-SDK braucht für den Produktivbetrieb einen Lizenzschlüssel. Das Studio von Theatre.js steht unter AGPL;
   die letzte Veröffentlichung war im Mai 2024.
2. **Fünf Schichten:** Format, Laufzeit, Bild (Renderer), Editor-Kern und Oberfläche. Der Editor ist die Laufzeit plus
   Werkzeuge. Das Spiel nutzt **dieselbe Laufzeit und denselben Renderer**. Was Florian im Editor sieht, zeigt das iPhone genauso.
   Spine und Lottie zeigen, was sonst droht: Versionskopplung und Funktionen, die je Abspieler fehlen.
3. **Oberfläche: Zeichenfläche, Überlagerungen, Zeitleiste und Posen-Brett ohne Framework** (WebGL2 und Canvas 2D,
   eigener Code). **Die Panels baue ich mit React 19.3 und dem React Compiler 1.0.** Live-Werte binden sie über kleine Signale
   fein an. So machen es tldraw (React mit eigenen Signalen) und nach meinem Wissen Figma (Zeichenfläche in C++/WebAssembly,
   Oberfläche im DOM). Preact 11 mit Signals ist eine gleichwertige, leichtere Alternative mit fast gleichem Code.
   - **Solid 2.0** ist erst seit dem 17.11.2026 draußen, und seine UI-Bausteine verlangen noch Solid 1.9.
   - **Svelte 5:** Die Werkzeuge laufen laut TypeScript-Team voraussichtlich noch nicht mit TypeScript 7.
   - **Lit** prüft die Typen in seinen Vorlagen schwächer.
   - **Ohne Framework** bauen sich die Panels ihr eigenes Framework.
4. **Zustand: Das Dokument ist eine Sammlung von Datensätzen mit festen Kennungen.** Jede Änderung ist eine Transaktion und
   liefert einen Datensatz-Diff: was hinzukam, was ging, was sich änderte, jeweils mit vorher und nachher. Derselbe Diff dient
   Rückgängig, Speichern, der Live-Verbindung zum iPhone und später der Zusammenarbeit. So arbeiten tldraw, Excalidraw (seit
   April 2024) und im Kern Figma.
   - Eine Geste ist ein Schritt.
   - Kurz aufeinanderfolgende Tastenschübe fasst die Historie zusammen.
   - Die Auswahl reist mit jedem Schritt mit.
5. **Format: JSON mit einer Formatversion je Baustein und Migrationen** (Vorbild tldraw).
   - Der Editor schreibt deterministisch: gleicher Inhalt ergibt gleiche Bytes, mit gerundeten Zahlen und fester Reihenfolge.
     Das ergibt saubere Git-Diffs, und KI-Sitzungen können die Dateien sicher lesen und schreiben.
   - Ein JSON-Schema entsteht automatisch aus den zod-Schemas.
   - Dokument und Sitzung (Kamera, Auswahl, offene Panels) liegen getrennt.
   - Eine Datei aus einer neueren Version öffnet ein älterer Editor nur zum Lesen.
   - Fürs Spiel gibt es eine abgespeckte Laufzeitdatei, binär erst bei Bedarf (Vorbild: das Inhaltsverzeichnis im
     Rive-Format).
6. **Speichern: jetzt über den Dev-Server ins Repo, wie der Prototyp.**
   - Neu dazu kommen eine Revisionsnummer (Schreiben nur mit passender Revision) und eine Live-Meldung, wenn eine KI-Sitzung die
     Datei ändert.
   - Ein lokales Journal in IndexedDB schützt gegen Verlust.
   - Die File System Access API gibt es nur in Chromium. WebKit lehnt sie ausdrücklich ab, also taugt sie nicht als Kern.
   - Das iPad bekommt später eine App über Capacitor (schon im Repo) mit der Dateien-App und iCloud Drive. Eine Cloud folgt
     erst, wenn Florian ohne Mac arbeiten will.
7. **Zusammenarbeit: jetzt kein CRDT.** Es gibt einen Gestalter. Die echte Parallelarbeit sind Florian und KI-Sitzungen an
   denselben Dateien. Dafür genügen eine Revision und ein Zusammenführen je Datensatz.
   - Das Datenmodell wird so angelegt, dass später das Figma-Modell ohne Umbau geht: ein Server, und je Eigenschaft gewinnt
     die letzte Änderung.
   - Yjs, Automerge 3 oder Loro lohnen erst, wenn mehrere Geräte offline am selben Dokument arbeiten sollen.
8. **Verpackung: vorerst keine.** Auf dem Mac läuft der Editor im Browser, auf dem iPad in Safari über das Netz, als App auf
   dem Home-Bildschirm.
   - Später fürs iPad Capacitor. Braucht Florian eine eigenständige Mac-App: **Tauri 2**, mit derselben Engine wie das iPad.
   - **Electron** nur, wenn Chromium-Eigenschaften zählen: 120 Hz am Mac, freier Dateizugriff im Browser, reiferes WebGPU.
9. **Bildrate, ein Befund dieser Recherche:** WebKit hat die Grundeinstellung „Prefer Page Rendering Updates near 60fps“.
   Sie ist stabil und überall an, nur auf visionOS nicht.
   - Deshalb zeichnen Safari, WKWebView, Capacitor und Tauri Canvas-Animationen nahe 60 Hz, auch auf 120-Hz-Bildschirmen.
     Chrome und Electron folgen nach meinem Wissen dem Bildschirm, am MacBook Pro also 120 Hz.
   - Das iPhone 16 zeigt ohnehin 60 Hz. **60 Hz ist darum die ehrliche Referenz für „glatt“.** Der Editor braucht eine
     60-Hz-Vorschau.
10. **iPad mit Stift: Pointer Events reichen.** Seit Safari 18.2 gibt es `getCoalescedEvents`, `getPredictedEvents` und
    `altitudeAngle`, das Schweben des Pencil seit Safari 16.1.
    - Die Grammatik: Der Stift formt, der Finger bewegt die Ansicht, Schweben zeigt eine Vorschau. Modifikatoren liegen als
      Tasten am Bildschirmrand.
    - Doppeltippen und Drücken des Pencil gehen nur nativ, also über ein kleines Capacitor-Plugin.
11. **Tastenkürzel: ein Befehlsregister als einzige Quelle für Tasten, Menüs, Knöpfe, Befehlssuche und Hilfe.** Abgefragt
    wird `key`, mit `code` als Rückfall (wichtig für QWERTZ). Kürzel kommen ohne Klammern und Sonderzeichen aus.
12. **Tests in vier Ebenen:**
    - vitest 5 für Format, Migrationen, Store und Laufzeit, einschließlich Determinismus;
    - fast-check für Eigenschaften wie „kein Sprung“ und „kein Verklumpen“;
    - der Browsermodus von vitest mit Bildvergleich in Chromium und WebKit, echtes Safari über WebDriverIO;
    - Playwright 1.65 mit gesteuerter Uhr für Abläufe.

    Das Urteil über „schön“ und „glatt“ bleibt bei Florians Auge.
13. **TypeScript 7 (seit 08.07.2026, Builds 8- bis 12-mal schneller) für die Typprüfung**, TypeScript 6 daneben für
    typescript-eslint. Das spricht für TSX-Frameworks: React, Preact und Solid gehen, Svelte und Vue noch nicht.
14. **Bausteine:**
    - **Nehmen:** earcut (ISC); Box2D 3 über box2d3-wasm (MIT, Bericht 09); perfect-freehand (MIT, Bleistiftstrich mit Druck
      und Verjüngung); Mutative oder Immer (MIT); zod (MIT); fractional-indexing (CC0); nanoid (MIT); tinykeys (MIT);
      Zag (MIT); fflate (MIT).
    - **Prüfen:** paper.js 0.17 (MIT, seit Oktober 2026 wieder aktiv) für boolesche Operationen und Versatz an Bézier-Pfaden;
      Clipper2-WASM (BSL-1.0) für Polygone.
    - **Nur als Vorbild:** Rive-Laufzeit und -Format, Theatre.js, Motion Canvas, lottie-web.
    - **Nicht nehmen:** die Spine-Laufzeiten und das tldraw-SDK (Lizenz), das Studio von Theatre.js (AGPL).

---

## 1 Was unser Fall verlangt

| Anforderung | Was daraus für die Technik folgt |
|---|---|
| Ein Art Director ohne Programmierkenntnisse bedient alles visuell | Kein Code im Arbeitsablauf. Logik, Physik und Effekte sind Daten, die die Laufzeit auswertet. Erweiterungen schreiben wir als Bausteine in TypeScript. |
| Arbeit auf dem Mac (MacBook Pro M3 Pro) und dem iPad mit Stift; das Spiel läuft auf dem iPhone 16 | WebKit ist Pflicht-Engine (iPad, iPhone-App). Jede Entscheidung muss in Safari und in WKWebView tragen. |
| Die Formen müssen glatt laufen (keine Sprünge, kein Rutschen, kein Verklumpen) | Feste Taktung und Determinismus (Bericht 09), dieselbe Laufzeit in Editor und Spiel, Tests auf Sprünge. |
| Florian formt Übergänge selbst | Jede Handlung ist rückgängig zu machen, auch große (Autorig, Aufnehmen der Physik). Der Verlauf muss Gesten verstehen. |
| „Unendlich erweiterbar“, „alles funktioniert gleich“ | Ein Register für Befehle, Eigenschaften, Datensatztypen und Effekte. Inspector, Schlüsselsetzen, Treiber und Rückgängig arbeiten generisch über diese Beschreibungen. |
| Code entsteht in KI-Sitzungen, mehrere Sitzungen im selben Repo | Bekannte, stabile Bausteine; textliche Dateien im Repo; deterministische Formate; Tests ohne Fenster; Test-Haken wie `window.__studio`. |
| Florian prüft oft per Fernsteuerung, sein Fenster darf nicht unter ihm umgebaut werden (Root-`CLAUDE.md`, Regel 3) | Sein Editor läuft von einem festen Stand (eigener Arbeitsbaum oder gebaute Fassung), nicht vom Dev-Server, an dem gerade gebaut wird. |
| Budget schonen | Wenige, bewährte Abhängigkeiten. Nichts, was eine eigene Infrastruktur (Server, Cloud) verlangt, bevor es gebraucht wird. |

Größenordnung (eigene Schätzung): Ozzy hat rund 30 Flächen mit je etwa 20 Ankern. Je Anker sind es sechs Zahlen (Lage und
zwei Griffe), also rund 3 600 Zahlen je Schlüsselform und etwa 30 KB JSON. Mit 100 Schlüsselformen sind es rund 3 MB,
komprimiert ein Bruchteil davon. Das ist für JSON, Speichern über den Dev-Server und einen Verlauf mit Datensatz-Diffs klein.

---

## 2 Wie die besten Programme gebaut sind

| Programm | Zeichenfläche | Oberfläche | Zustand und Verlauf | Format | Laufzeit |
|---|---|---|---|---|---|
| **Figma** | C++ nach WebAssembly; seit 2025 WebGPU mit Rückfall auf WebGL, sogar mitten in der Sitzung | im DOM, nach meinem Wissen React | Server je Dokument hat das letzte Wort; je Objekt und Eigenschaft gewinnt der zuletzt eingetroffene Wert; Reihenfolge über Bruchindizes; Eltern als Zeiger am Kind; Undo überschreibt keine späteren fremden Änderungen | eigenes, nicht offen | – |
| **tldraw** | DOM und Canvas | React plus eigene Signale (`@tldraw/state`, MIT) | Store aus Datensätzen; Transaktionen bündeln Änderungen zu einem Undo-Schritt; Änderungen können am Verlauf vorbei laufen (`history: 'ignore'`) | Schnappschuss mit Teil „Dokument“ und Teil „Sitzung“; Migrationen je Datensatztyp mit `up` und `down`, Schemaversion im Schnappschuss | gleich der Editor |
| **Excalidraw** | Canvas | React plus jotai | seit April 2024 umkehrbare Deltas (vorher und nachher je geänderter Eigenschaft) aus einem Store, der jede Änderung meldet; Schritte ohne sichtbare Wirkung werden übersprungen | JSON | – |
| **Rive** | eigener GPU-Renderer (C++) | Editor in Flutter (vorher JavaScript mit DOM, dann React mit CanvasKit) | – | `.riv` binär mit Inhaltsverzeichnis der Eigenschaftstypen | C++-Laufzeit (MIT), im Web als WebAssembly |
| **Spine** | Desktop-Editor | Desktop | – | JSON oder binär; lesbar nur mit gleicher Haupt- und Nebenversion | Laufzeiten in vielen Sprachen, eigene Lizenz |
| **Theatre.js** | die eigene Szene des Nutzers | Studio als Überlagerung | Zustand als JSON, beim Arbeiten im `localStorage`, Export per Knopf | JSON | `@theatre/core` lädt das JSON (Apache-2.0); das Studio steht unter AGPL |
| **Motion Canvas** | Canvas 2D | Preact plus Signals | Animation als Code (Generatoren); Zeitpunkte („Time Events“) im Editor ziehbar | Code plus Zeitdaten | gleich dem Code |
| **Graphite** | Rust-Kern als Knotengraph | Svelte 5, Vite 8, TypeScript 6 | – | eigenes | Rust nach WebAssembly |

**Was sich daraus lernen lässt:**

1. **Die Zeichenfläche läuft nie über das UI-Framework.** Figma, Rive, Graphite und tldraw trennen beides. Das Framework
   baut Panels, die Zeichenfläche zeichnet imperativ.
2. **Das Dokument ist eine flache Sammlung von Objekten mit Kennung und Eigenschaften.** Änderungen sind Diffs. Daraus
   entstehen Rückgängig, Speichern und Zusammenarbeit (Figma, tldraw, Excalidraw).
3. **Wo Editor und Laufzeit denselben Code teilen, gibt es keine Paritätsprobleme** (Rive, Theatre.js). Wo nicht, entstehen
   Versionskopplung (Spine: Neu-Export bei jedem Wechsel von Haupt- oder Nebenversion) und Funktionen, die je Abspieler fehlen
   (Lottie, Bericht 02).
4. **Formate tragen Versionen.** Entweder mit Migrationen beim Laden (tldraw) oder mit einem Inhaltsverzeichnis, das ältere
   Laufzeiten unbekannte Eigenschaften überspringen lässt (Rive).
5. **Ein kleines Team kann sich ein eigenes UI-Fundament leisten, wenn es dafür einen Grund hat.** Rive wechselte zu Flutter,
   um eine Codebasis für alle Ziele, eine strenge Typisierung und eingebaute Tests zu haben. Für uns erfüllt TypeScript im
   Browser denselben Zweck, ohne zweite Sprache.

---

## 3 Oberfläche: welche UI-Grundlage

### 3.1 Was die Oberfläche bei uns leisten muss

Es gibt zwei Arten von Fläche.

- **Heiße Flächen:** Zeichenfläche, Überlagerungen (Punkte, Griffe, Knochen, Gewichte), Zeitleiste und Kurven,
  Posen-Brett mit Vorschaubildern, Logikgraph. Sie ändern sich je Bild, haben viele Elemente und brauchen eigene
  Trefferprüfung. Hier entscheidet kein Framework, sondern eigener Code auf WebGL2 oder Canvas 2D.
- **Kühle Flächen:** Inspector, Menüs, Popover, Dialoge, Bausteinbibliothek, Befehlssuche, Hilfe, Meldungen. Sie ändern sich
  selten, nur einzelne Werte laufen live mit, etwa die Zahlen im Inspector beim Abspielen. Hier hilft ein Framework, denn es
  sind viele kleine Bauteile mit Zustand, Fokus und Tastaturbedienung.

Der Prototyp zeigt, wie es ohne Framework aussieht. `werkzeug.ts` bündelt auf 1 296 Zeilen Bearbeiten, Zeitleiste,
Zwiebelhaut, Tasten und DOM-Aufbau. Für eine Studie ist das richtig. Ein Produkt mit Dutzenden Panels wird so schwer
wartbar.

### 3.2 Gegenüberstellung

| | Ohne Framework | Lit 3 | React 19 | Preact 11 + Signals | Solid 2 | Svelte 5 |
|---|---|---|---|---|---|---|
| Stand (npm, 20.11.2026) | – | 3.3.3 (14.05.2026); `@lit-labs/signals` 0.3.0 (Labs) | 19.3.1 (14.10.2026); Compiler 1.0 (07.10.2025) | 11.0.0 (30.09.2026), 11.2.0 (06.11.2026); `@preact/signals` 2.11.4 | 2.0.0 (17.11.2026), 2.0.3 (19.11.2026); Kandidaten seit 12.08.2026 | 5.0 seit 19.10.2024, heute 5.58.0 |
| Feine Bindung an Live-Werte | von Hand | je Bauteil neu zeichnen; Signale nur über Labs-Paket | je Bauteil; mit kleinen Abos über `useSyncExternalStore` fein genug; der Compiler memoisiert selbst | ein Signal im JSX ändert den Textknoten direkt, ohne neu zu zeichnen | von Grund auf fein, ohne virtuelles DOM | Runen (`$state`, `$derived`) fein, durch Übersetzung |
| Typprüfung der Vorlagen mit TypeScript 7 | ja | schwach (Vorlagen sind Text; die Prüfwerkzeuge dafür hängen nach meinem Wissen an der alten TypeScript-Schnittstelle) | ja (TSX) | ja (TSX) | ja (TSX) | **voraussichtlich noch nicht** (laut TypeScript-Team brauchen die Svelte- und Vue-Werkzeuge die alte Schnittstelle; Graphite nutzt TypeScript 6) |
| Vorbilder in Kreativwerkzeugen | VS Code und Photopea (nach meinem Wissen), unser Prototyp | keine bekannt | tldraw, Excalidraw, Figma (nach meinem Wissen) | Motion Canvas | keine bekannt | Graphite |
| UI-Bausteine | keine | Web Components (nach meinem Wissen etwa Web Awesome) | sehr viele (Radix, React Aria, Zag, dockview) | Zag mit eigenem Adapter; React-Bibliotheken über `preact/compat` | Kobalte 0.13.14 verlangt Solid 1.9, nicht 2.0 | gut |
| Sicherheit für KI-Sitzungen | Code bleibt einfach, aber die Struktur zerfällt leicht | mittel | am höchsten | hoch (React-Stil) | mittel: Bauteile laufen nur einmal, Props zu zerlegen bricht die Bindung, typische Fehlerquelle | mittel: alte und neue Syntax liegen in den Beispielen nebeneinander |
| Schon im Repo | Prototyp `ozzy-figur` | nein | Spiel und alter Editor (mit zustand) | nein | nein | nein |

### 3.3 Urteil

- **Heiße Flächen ohne Framework.** Die Zeichenfläche bekommt ein WebGL2-Canvas für das Bild (Bericht 10). Darüber liegt eine
  Canvas-2D- oder WebGL-Überlagerung für Punkte, Griffe und Knochen. Getroffen wird in eigenem Code mit räumlichem Index, nie
  über DOM-Elemente. Auch Zeitleiste, Kurveneditor und Posen-Brett werden gezeichnet, nicht aus DOM-Knoten gebaut.
- **Kühle Flächen mit React 19.3 und dem React Compiler 1.0.**
  - Die Gründe: das größte Angebot an fertigen Bausteinen, der sicherste Stil für KI-Sitzungen, gleiche Technik wie im Spiel
    und im alten Editor, volle Typprüfung mit TypeScript 7.
  - Das Muster dahinter (tldraw, nach meinem Wissen Figma) ist bei großen Zeichenwerkzeugen erprobt.
  - Der Compiler memoisiert automatisch. Laut React-Team hat das bei Meta Ladezeiten um bis zu 12 % verbessert und manche
    Interaktionen mehr als 2,5-mal schneller gemacht. Unsere eigentliche Absicherung ist aber die Schichtenregel unten.
- **Preact 11 mit Signals ist die Alternative mit dem besten Verhältnis von Gewicht zu Nutzen.** Seit 11.1 kann es mit dem
  React Compiler arbeiten, die API ist fast gleich. Ein Wechsel später bleibt billig. Ein Grund wäre, dass Live-Werte im
  Inspector trotz allem ruckeln. Die Signale gehen dann direkt in die Textknoten.
- **Solid 2.0 beobachten, nicht jetzt.** Technisch passt es am besten, aber die Hauptversion ist drei Tage alt, und die
  UI-Bausteine sind noch nicht nachgezogen.
- **Svelte 5 nicht**, solange seine Werkzeuge TypeScript 7 nicht tragen. **Lit nicht**, weil die Vorlagen nicht als TSX
  geprüft werden und Shadow DOM das Gestalten über Panelgrenzen hinweg erschwert. Ein gemeinsames Aussehen wie bei liquid drop
  wird so mühsamer. **Ganz ohne Framework nicht**, weil wir sonst Fokus, Popover, Menüs und Tastaturbedienung selbst bauen.

### 3.4 Bauregeln für die Oberfläche

1. **Schichtenregel:** Was sich je Bild ändert, läuft nie über den Zustand eines React-Bauteils. Es läuft über die Zeichenfläche
   oder über ein Signal, das einen einzelnen Wert schreibt. React-Bauteile abonnieren nur die Werte, die sie zeigen.
   Ein `useWert(signal)` über `useSyncExternalStore` ist rund 20 Zeilen lang.
2. **Eigenschaften als Daten:** Jeder Baustein beschreibt seine Eigenschaften. Dazu gehören Art (Zahl mit Einheit und
   Bereich, Winkel, Farbe, Kurve, Auswahl, Schalter, Verweis), Grundwert, ob sie animierbar ist und ob Logik sie treiben darf.
   Daraus entstehen der Inspector, der Knopf zum Schlüsselsetzen, das Binden an Spielgrößen und das Rückgängig von selbst.
   Damit funktioniert alles gleich, und ein neuer Effekt braucht keine eigene Oberfläche.
3. **Feste, schlichte Anordnung statt Andocken:** Zeichenfläche in der Mitte, schmale Werkzeugleiste, Inspector rechts,
   Zeitleiste und Posen unten. Die Panels lassen sich einklappen. Auf dem iPad schweben sie über der Fläche.
   dockview (MIT, 8.9.1) bleibt im Rucksack, falls Florian Panels frei anordnen will. Das widerspricht aber dem Ziel
   „minimalistisch“.
4. **Komplexe Bedienelemente aus Zag** (MIT, 1.48.0): Menü, Popover, Dialog, Schieberegler, Zahlenfeld. Zag beschreibt sie als
   Zustandsautomaten mit Adaptern für React, Preact, Solid, Svelte und reines JavaScript. Wechselt das Framework, bleiben die
   Automaten.
5. **Tempo:** Panels bekommen `contain: content` und feste Rasterspuren. Die Größe der Zeichenfläche kommt aus einem
   `ResizeObserver`. Im Bildtakt wird kein Layout gelesen. Live-Werte werden je Bild gesammelt geschrieben.

---

## 4 Zustand und Rückgängig

### 4.1 Die Verfahren

| Verfahren | Wie es arbeitet | Stärken | Schwächen | Wer es nutzt |
|---|---|---|---|---|
| **Befehlsmuster** | Jede Aktion hat Code für Tun und für Zurücknehmen | genau und speicherarm | Jede Aktion ist doppelt programmiert, und Fehler im Zurücknehmen fallen spät auf. Gesten und Automatiken wie Autorig oder Aufnehmen sind schwer zu fassen. | klassische Desktop-Programme (nach meinem Wissen) |
| **Ganze Stände mit geteilter Struktur** | Jeder Schritt ist ein neuer, unveränderlicher Stand, der unveränderte Teile mit dem alten teilt. Zurück heißt: den alten Verweis nehmen. | trivial richtig; billiges Vergleichen über Verweise | Ohne Diffs gibt es nichts zum Speichern im Takt und nichts für die Zusammenarbeit. | Redux-Welt (nach meinem Wissen) |
| **Patches (Immer, Mutative)** | Man ändert einen Entwurf. Die Bibliothek liefert den neuen Stand, Patches und umgekehrte Patches. | genau und klein; zum Senden geeignet | Pfade über Feldindizes brechen bei nebenläufigen Änderungen. Immer sagt selbst, dass seine Patches nicht minimal sind. | Immer-Doku nennt Undo und Sync als Zweck |
| **Datensatz-Diffs** | Store aus Datensätzen mit Kennung. Jede Transaktion liefert: hinzugefügt, entfernt, geändert mit vorher und nachher. | einfach und robust; derselbe Diff für Rückgängig, Speichern, Live-Verbindung und Sync | Ein Diff ist so groß wie der geänderte Datensatz, also nicht zu große Datensätze bauen | tldraw; Excalidraw seit 2024 (je Eigenschaft); Figma im Kern |
| **Undo im CRDT** | Rückgängig ist eine neue Operation, die nur eigene Änderungen zurücknimmt | fest gegenüber Zusammenarbeit | Die Bibliothek bestimmt das Datenmodell | Yjs-UndoManager mit `trackedOrigins` und `captureTimeout` (500 ms) |

### 4.2 Unser Entwurf

1. **Datensätze mit festen Kennungen** je Typ: Fläche, Gruppe, Knochen, Pose, Übergang, Schlüsselform, Effekt, Körper,
   Gelenk, Logikzustand und so weiter. Auch **Anker haben Kennungen**. Der Morph braucht sie ohnehin, um Anker zwischen Formen
   zuzuordnen (Rive morpht nur zwischen Ständen desselben Pfads, Bericht 02), und die Zusammenarbeit später ebenso.
2. **Unveränderlich mit geteilter Struktur.** Ein geänderter Datensatz ist ein neues Objekt, alle anderen bleiben dieselben.
   Der Renderer und die Laufzeit cachen damit je Verweis: Eine unveränderte Fläche wird nicht neu abgeflacht.
3. **Jede Änderung ist eine Transaktion**, die einen Datensatz-Diff liefert. Für bequeme Änderungen innen dient ein Entwurf:
   Mutative (MIT, 2.0.2) arbeitet laut eigener Messung mit gleichen Einstellungen rund 3,6-mal schneller als Immer und lässt
   Objekte standardmäßig ungefroren. Immer (MIT, 11.2.10) ist verbreiteter. Der Diff selbst entsteht aber durch Vergleich der
   Verweise je Datensatz, nicht aus den Patch-Pfaden. Das hält ihn einfach und von der Bibliothek unabhängig.
4. **Regeln für den Verlauf:**
   - **Eine Geste ist ein Schritt.** Beim Drücken setzt das Werkzeug eine Marke. Alle Diffs bis zum Loslassen werden zu einem
     Eintrag verschmolzen: Von jedem Datensatz bleiben der erste Vorher- und der letzte Nachher-Stand.
   - **Tastenschübe** (Pfeiltasten, Zahleneingaben) innerhalb von 500 ms ergeben einen Eintrag, wie beim `captureTimeout` von Yjs.
   - **Marken für mehrstufige Werkzeuge**: Ein Pfad mit P bis zum Schließen ist ein Schritt, wie die Marken in tldraw.
   - **Die Auswahl reist mit.** Jeder Eintrag merkt sich die Auswahl davor und danach und stellt sie wieder her. Eine
     Auswahländerung allein ist kein Eintrag. Excalidraw hat 2024 das Rückgängig der Auswahl verbessert, weil fehlende
     Auswahlschritte beim Zurücknehmen störten.
   - **Abgeleitetes kommt nicht in den Verlauf**: Physikstand, Abspielposition, Kamera, ausgewertete Pose. Wer die Physik
     **aufnimmt** und damit in Schlüssel backt, macht eine normale Transaktion.
   - **Fremde Änderungen** (KI-Sitzung, später Mitarbeiter) kommen nicht in Florians Verlauf. Sein ⌘Z nimmt nie etwas zurück,
     was ein anderer danach geändert hat. Das ist der Grundsatz von Figma.
5. **Signale für Abgeleitetes:** ausgewertete Pose an der Abspielposition, Begrenzung der Auswahl, sichtbare Gewichte. Sie
   rechnen träge und nur bei geänderten Eingaben neu. In Frage kommen `@preact/signals-core` (MIT, 1.14.5, ausgereift) oder
   `alien-signals` (MIT, 3.2.1). Die TC39-Signale sind noch auf Stufe 1, und ihr Polyfill gilt als nicht produktionsreif.
   **Die Laufzeit im Spiel braucht keine Signale.** Sie bleibt bei reinen Funktionen mit Caches je Verweis.
6. **zustand** (im Spiel genutzt) passt für Oberflächenzustand. Für das Dokument fehlen ihm Datensätze, Diffs, Verlauf und
   Migrationen.

**Eigen bauen oder `@tldraw/store` nehmen?** `@tldraw/store` und `@tldraw/state` stehen unter MIT, sind aktiv (5.6.1,
16.11.2026) und bringen Datensätze, Migrationen, Diffs und Signale mit. Sie folgen aber dem Takt und den Zielen des tldraw-SDK.
Unser Bedarf ist klein, nach meiner Schätzung 600 bis 1 000 Zeilen mit Tests. **Empfehlung: eigener kleiner Store nach dem
Vorbild von tldraw.** Eine kurze Probe darf das widerlegen.

### 4.3 Speicherbedarf des Verlaufs (Schätzung)

Ein Schritt an einer Fläche speichert die Fläche zweimal, also etwa 2 × 1 KB. 1 000 Schritte belegen damit rund 2 MB.
Eine Geste über die ganze Figur, etwa der Autorig über 30 Flächen und 20 Knochen, kostet einige 100 KB. Das ist unkritisch.
Grenze: 500 Einträge oder 50 MB, die ältesten fallen heraus.

---

## 5 Dokumentformat

### 5.1 Vorbilder

- **tldraw:**
  - Jeder Schnappschuss trägt seine Schemaversionen. Ältere Stände migriert der Store beim Laden selbst.
  - Migrationen sind Folgen mit fortlaufenden Nummern, je Datensatztyp (`record`), über den ganzen Store (`store`) oder über
    die Ablage (`storage`).
  - Die Formen-Migrationen haben `up` und `down`. `down` braucht tldraw für Mitspieler mit älterem Stand.
  - Der Schnappschuss trennt „Dokument“ (für den Server) und „Sitzung“ (Kamera, Auswahl, je Nutzer lokal).
- **Rive:** Binär mit Kennung „RIVE“, Haupt- und Nebenversion und einem Inhaltsverzeichnis, das für jeden Eigenschaftsschlüssel
  den Grundtyp nennt. Eine ältere Laufzeit überspringt so unbekannte Eigenschaften und zeigt, was sie kennt. Eine neue
  Hauptversion bricht bewusst: Die Laufzeit liest genau eine.
- **Spine:** Exporte lesen nur Laufzeiten derselben Haupt- und Nebenversion. Beim Wechsel muss alles neu exportiert werden,
  Projektdateien gehen nur vorwärts auf. Das ist das Gegenbeispiel: Ein Format, das Editor und Spiel aneinander kettet.
- **Theatre.js:** Der Zustand ist ein JSON-Objekt, das die Laufzeit direkt lädt. Ein eigenes Exportformat gibt es nicht.

### 5.2 Vorschlag

```json
{
  "format": "studio",
  "versionen": { "kern": 1, "physik": 1, "logik": 1, "effekte": 1 },
  "id": "prj_q7M2xK9a",
  "name": "Ozzy",
  "einheit": "px",
  "datensaetze": {
    "flaeche": {
      "fl_3kP9vT2c": {
        "name": "Bohne",
        "eltern": "grp_8aQ1",
        "ordnung": "a1",
        "anker": [
          { "id": "an_01", "p": [120.5, -40.25], "ein": [-12, 0], "aus": [12, 0] }
        ]
      }
    },
    "knochen": {},
    "pose": {},
    "uebergang": {}
  }
}
```

Die Darstellung der Griffe (Lage gegen Winkel und Länge) entscheidet der Morph-Bericht. Das Beispiel zeigt nur die Hülle.

**Regeln:**

1. **Kennungen** sind kurz und zufällig, mit Typvorsilbe (nanoid, MIT, 6.0.2). Die Kennung bleibt fest, auch wenn sich der
   Name ändert.
2. **Reihenfolge** über Bruchindizes (`fractional-indexing`, CC0, 4.0.0; Excalidraw nutzt es, Figma macht es genauso), nicht
   über die Lage im Feld. **Eltern als Zeiger am Kind**, wie bei Figma.
3. **Kein Abgeleitetes in der Datei**: keine Abflachung, keine Dreiecke, keine ausgewerteten Posen. Nur, was Florian festlegt.
4. **Deterministisch schreiben:**
   - Schlüssel in fester Reihenfolge (die des Schemas), Datensätze nach Kennung sortiert.
   - Zahlen auf 1/1000 Pixel gerundet, ohne Exponent, mit `-0` zu `0`.
   - Zwei Leerzeichen Einzug, Zahlenfelder in einer Zeile.
   - Gleicher Inhalt ergibt gleiche Bytes. Damit wird die Falle „JSON nie neu serialisieren“ (Root-`CLAUDE.md`) für unsere
     eigenen Dateien entschärft: Nicht das Neuschreiben war das Problem, sondern ein Schreiber, der anders formatiert.
5. **Schreiben ist atomar**: erst daneben schreiben, dann umbenennen. Der Prototyp macht das schon (`vite.config.ts`,
   `figurSchluessel`).
6. **Dokument und Sitzung getrennt:** Kamera, Auswahl, offene Panels, Zwiebelhaut-Einstellung und Abspielposition liegen je
   Gerät im Browser (IndexedDB), nicht im Repo.
7. **Versionen je Baustein** (`kern`, `physik`, `logik`, `effekte`, später weitere). Jeder Baustein bringt seine eigene
   Migrationsfolge mit. So wächst das Format mit, ohne dass jeder neue Effekt alle anderen berührt. Das ist die Grundlage für
   „unendlich erweiterbar“.
8. **Migrationen nur vorwärts**, Version für Version, jede mit einer Testdatei aus einem echten Stand, etwa Florians Ozzy.
   Migrationen werden nie gelöscht.
9. **Neuere Datei im älteren Editor: nur lesen** und deutlich anzeigen. Kein stilles Weglassen unbekannter Felder.
10. **Prüfen beim Laden** mit zod (MIT, 4.6.7; im Spiel schon im Einsatz). `z.toJSONSchema()` erzeugt daraus ein JSON-Schema
    (Entwurf 2020-12). Das hilft KI-Sitzungen und Editoren beim Schreiben gültiger Dateien.
11. **Bilder und importierte SVGs** liegen als Dateien daneben, benannt nach ihrem Hash, und werden relativ verwiesen. Die
    Original-SVGs von Florian bleiben erhalten, damit er neu importieren kann.

**Ablage:**

- **Im Repo als Ordner:** `projekt.json` plus `assets/`, später je Figur eine Datei, wenn Projekte wachsen.
- **Zum Weitergeben** derselbe Ordner als eine ZIP-Datei mit eigener Endung (fflate, MIT, 0.8.3, packt im Browser).
  Das Format bleibt dasselbe, nur die Verpackung wechselt.

### 5.3 Laufzeitdatei fürs Spiel

- **Jetzt:** dieselbe Datei, ohne editorbezogene Teile wie Hilfslinien, Notizen und Vorlagenbilder. Gekürzt schreibt sie
  derselbe deterministische Schreiber. Komprimiert (Brotli oder gzip) ist sie für eine Figur klein.
- **Später, nur bei Bedarf:** eine binäre Fassung mit Inhaltsverzeichnis wie bei Rive, wenn Ladezeit oder Größe auf dem
  iPhone messbar stören. Davor nicht, denn JSON ist für KI-Sitzungen und Diffs viel wertvoller.
- **Versionen:** Spiel und Editor kommen aus demselben Repo und bauen dieselbe Laufzeit. Die Laufzeit liest alle älteren
  Fassungen über dieselben Migrationen. Eine neuere Datei lehnt sie mit klarer Meldung ab. Die Kopplung, an der Spine
  leidet, entsteht so nicht.

---

## 6 Speichern

### 6.1 Möglichkeiten

| Weg | Wo es geht | Stärken | Schwächen |
|---|---|---|---|
| **Dev-Server schreibt ins Repo** (heute: `PUT /__ozzy-figur/schluessel`) | überall, wo der Mac erreichbar ist, auch das iPad im selben Netz | Dateien liegen da, wo KI-Sitzungen und Git sie sehen; keine Rechtefrage im Browser | Ohne laufenden Dev-Server wird nichts gespeichert. Unterwegs ohne Mac geht es nicht. |
| **File System Access API** | nur Chromium (Chrome, Edge, Electron); Chrome ab 105 voll | Ordner direkt öffnen und speichern | **Kein Safari** auf Mac und iOS, auch nicht 27.3 oder die Technology Preview. **WebKit lehnt die API ab** (Position „oppose“ seit 23.02.2023, Sicherheitsbedenken beim Schreiben). Firefox ebenfalls. |
| **OPFS und IndexedDB** (lokal im Browser) | überall | offline, schnell; gut als Journal und Sicherung | Nicht für Florian sichtbar. WebKit räumt im Normalfall nach Heuristiken ganze Ursprünge auf; `navigator.storage.persist()` kann das verhindern, WebKit entscheidet unter anderem danach, ob die Seite als Home-Bildschirm-App läuft. |
| **Herunterladen und Hochladen** | überall | einfach; mit `browser-fs-access` (Apache-2.0) auch mit Dateidialog, wo es ihn gibt (Excalidraw nutzt es) | umständlich, kein fortlaufendes Speichern |
| **Native Hülle** (Tauri `fs`, Electron mit Node) | Mac | voller Dateizugriff | zusätzliche Hülle (Abschnitt 8) |
| **Capacitor-Dateien und Dateiauswahl** | iPad | Dateien-App und iCloud Drive (zum Beispiel `@capawesome/capacitor-file-picker`, MIT, 8.1.1) | eigene App nötig; im Web-Speicher der App darf ein Ursprung laut WebKit höchstens 15 % des Speicherplatzes belegen (Browser 60 %); echte Dateien betrifft das nicht |
| **Cloud** (Objektspeicher oder kleiner Sync-Server) | überall | unterwegs ohne Mac | Betrieb, Kosten, Konto, Datenschutz; KI-Sitzungen müssten die Daten erst holen |

### 6.2 Plan in Stufen

1. **Jetzt:** Der Dev-Server bleibt der Speicherweg. Er wird aus dem Prototyp verallgemeinert:
   - `GET`, `PUT` und `PATCH` auf `/__studio/projekte/<name>`.
   - Jede Antwort trägt eine Revision (Hash des Inhalts). Ein `PUT` gilt nur mit passender Revision (`If-Match`), sonst kommt
     409 zurück.
   - Schreiben bleibt atomar. Nur Aufrufe von der eigenen Seite werden angenommen, wie heute.
   - **Live-Meldung:** Der Dev-Server beobachtet den Projektordner und schickt bei einer Änderung von außen über den
     Websocket von Vite eine eigene Nachricht (`server.ws.send('studio:geaendert', …)`, im Editor
     `import.meta.hot.on(…)`). Der Editor lädt die geänderten Datensätze nach.
2. **Speichern im Hintergrund:** 300 ms nach der letzten Änderung (wie der Prototyp), dazu ein **Journal in IndexedDB**. Jede
   Transaktion landet dort zuerst. Bricht der Tab ab oder ist der Mac nicht erreichbar, spielt der Editor das Journal beim
   nächsten Öffnen nach. Figma macht es mit Änderungen ohne Verbindung genauso: Es legt sie über den neuesten Stand.
3. **Stände sichern:** Ein Knopf „Stand sichern“ schreibt eine benannte Kopie nach `versionen/`. Commits bleiben Sache der
   Sitzungen und folgen den Regeln des Repos.
4. **iPad unterwegs:** erst, wenn Florian das will (offene Frage). Entweder ein privates Netz zum Mac (etwa Tailscale), das am
   wenigsten Bau verlangt, oder die Capacitor-App mit Dateien-App und iCloud Drive. Eine Cloud erst danach.

### 6.3 Konflikte zwischen Florian und KI-Sitzungen

Das ist der einzige echte Fall von Zusammenarbeit, den wir heute haben. Eine Sitzung ändert `projekt.json`, während Florian im
Editor arbeitet.

- **Ohne Änderungen im Editor:** Er übernimmt den neuen Stand ohne Rückfrage, als fremde Transaktion außerhalb von Florians
  Verlauf.
- **Mit Änderungen im Editor:** Er führt je Datensatz zusammen.
  - Nur draußen geändert: Er übernimmt die Änderung.
  - Nur im Editor geändert: Er behält seine Fassung.
  - Auf beiden Seiten geändert: Florians Fassung gewinnt. Die andere landet sichtbar in einer Liste „Abweichungen“, damit
    nichts verloren geht.
- **Für KI-Sitzungen gilt eine Regel:** Läuft der Editor, ändern sie Projekte nur über dieselbe Schnittstelle (`PATCH` mit
  Revision) oder schreiben in eine eigene Datei, die Florian übernimmt.

---

## 7 Zusammenarbeit

### 7.1 Möglichkeiten

| Weg | Wie | Stärken | Schwächen | Stand |
|---|---|---|---|---|
| **Dateien und Git** (heute) | Repo als Quelle, Revisionen am Dev-Server | nichts zu betreiben; KI-Sitzungen arbeiten direkt mit | keine gleichzeitige Arbeit an einer Figur | – |
| **Figma-Modell** | Server hat das letzte Wort; je Objekt und Eigenschaft gewinnt der zuletzt eingetroffene Wert; Bruchindizes; Eltern-Zeiger; Server weist Zyklen zurück | einfach, für visuelle Editoren gemacht; unser Datensatz-Diff passt direkt | braucht einen Server; gleichzeitiges Tippen im selben Textfeld wird nicht gemischt (bei uns kaum ein Fall) | Vorbild, keine Bibliothek |
| **Yjs** (MIT) | CRDT in JavaScript; Map, Array, Text; Anbieter für Websocket, WebRTC und Speicher; UndoManager nur für eigene Änderungen | ausgereift, schnell, viele Anbindungen | Verschieben in Listen und Bäumen ist kein eigener Vorgang. Das Datenmodell richtet sich nach Yjs. | 13.6.33 (23.09.2026); Version 14 seit Jahren in Vorabfassungen |
| **Automerge 3** (MIT) | CRDT in Rust nach WebAssembly, JSON-artig, ganze Geschichte | seit 3.0 (Juli 2025) laut Projekt über zehnmal weniger Speicher; lange Geschichten laden viel schneller | schwerer, eigene Denkweise | 3.5.0 (16.09.2026) |
| **Loro** (MIT) | CRDT in Rust nach WebAssembly; verschiebbare Liste und **verschiebbarer Baum**, Zeitreise, flache Schnappschüsse | passt am besten zu Ebenenbäumen und Umsortieren | jünger, kleinere Gemeinde | 1.18.0 (16.11.2026) |

### 7.2 Urteil

**Jetzt kein CRDT und keine Bibliothek für Zusammenarbeit.** Es gibt einen Gestalter, Nicole testet. Ein CRDT bindet das
Datenmodell an eine Bibliothek, kostet Speicher je Zahl und macht jede Änderung umständlicher. Dem steht heute kein Nutzen
gegenüber.

**Das Datenmodell macht die Tür aber heute schon auf:**

1. feste Kennungen für alles, auch für Anker;
2. Datensätze mit Eigenschaften statt verschachtelter Bäume;
3. Bruchindizes statt Feldpositionen, Eltern-Zeiger statt Kinderlisten;
4. jede Änderung als Datensatz-Diff;
5. nichts Abgeleitetes in der Datei.

Damit ist später das Figma-Modell der kürzeste Weg: ein kleiner Server je Dokument, der Diffs annimmt, ordnet und verteilt.
Ein CRDT, dann wohl Loro wegen des Baums, oder Yjs wegen der Reife, lohnt erst, wenn mehrere Geräte **ohne Verbindung**
dasselbe Dokument bearbeiten und danach zusammenführen sollen.

---

## 8 Verpackung und Plattformen

### 8.1 Fakten

- **Tauri 2** (MIT oder Apache-2.0; 2.0 seit 02.10.2024, heute 2.12, 3.0 in Alpha):
  - nutzt die Webansicht des Systems: WKWebView auf macOS und iOS, WebView2 auf Windows, WebKitGTK auf Linux, die
    Android-WebView;
  - die WebKit-Fassung kommt mit dem Betriebssystem;
  - eine kleinste App kann laut Projekt unter 600 KB bleiben;
  - Rust im Hintergrund, Rechte über Fähigkeiten, Plugins für Dateien und Dialoge, auch iOS und Android.
- **Electron** (MIT, 45.4.1 vom 19.11.2026) bringt Chromium mit. Das Paket ist nach meinem Wissen meist 100 MB und größer.
  Dafür gibt es überall dieselbe Engine, Node für Dateien und reifes WebGPU. Im Repo liegt schon eine ruhende Electron-Hülle
  des alten Editors (`apps/editor`, electron-builder).
- **Electrobun** (MIT, 2.0.7) nutzt Bun und die Webansicht des Systems, wahlweise mit eingebautem Chromium. Der Betreuer
  schreibt, er nehme kaum Beiträge an. iOS wird nicht genannt. Für uns zu wenig gesichert.
- **Capacitor** (MIT, 8.6.2, 9.0 als Kandidat) nutzt auf iOS WKWebView. Es ist im Spiel schon eingerichtet.
- **Safari-Web-App auf dem Mac** („Zum Dock hinzufügen“, seit Safari 17): eigenes Fenster, Cookies werden übernommen, andere
  lokale Daten nicht.
  **Auf dem iPad** als Home-Bildschirm-App mit gleichen Speicherquoten wie im Browser; `persist()` wird eher gewährt.
- **Bildrate (WebKit-Grundeinstellung):** „Prefer Page Rendering Updates near 60fps“ ist stabil und standardmäßig an, nur auf
  visionOS aus. Die Beschreibung: Seiten zeichnen nahe 60 Bildern je Sekunde statt mit der Wiederholrate des Bildschirms.
  - Daneben laufen auf iOS geeignete „zeitbasierte Animationen“ in einem eigenen Thread mit hoher Bildrate. Nach meinem
    Verständnis sind das CSS-Übergänge und Web Animations, nicht Canvas-Animationen über `requestAnimationFrame`.
  - Folge: Safari, WKWebView, Capacitor und Tauri zeichnen unsere Zeichenfläche nahe 60 Hz.
  - Chrome und Electron folgen nach meinem Wissen dem Bildschirm, am MacBook Pro also 120 Hz.
  - In Safari lässt sich die Einstellung nach meinem Wissen unter den Feature-Flags umschalten. In einer App mit WKWebView geht
    das nur über nicht öffentliche Schnittstellen, für den App Store also nicht. Der Bericht von September 2026
    (`docs/research/tech-stack.md`) kam fürs iPhone zum selben Ergebnis. Eine kleine Probeseite, die die Bildrate zählt,
    bestätigt es auf Florians Mac und iPad in einer Minute.

### 8.2 Gegenüberstellung

| | Browser + Dev-Server (heute) | Safari-Web-App (Mac-Dock, iPad-Home-Bildschirm) | Tauri 2 (Mac) | Electron (Mac) | Capacitor (iPad) |
|---|---|---|---|---|---|
| Engine | Chrome oder Safari | WebKit | WebKit (WKWebView) | Chromium | WebKit (WKWebView) |
| Zeichenfläche am 120-Hz-Bildschirm | Chrome 120, Safari ~60 | ~60 | ~60 | 120 | ~60 (das iPad Pro könnte 120) |
| Gleiche Engine wie das iPad | nur mit Safari | ja | ja | nein | ja |
| Dateien | Dev-Server (Repo) | Dev-Server, IndexedDB, Download | nativ (Plugin) | nativ (Node) | nativ, Dateien-App, iCloud Drive |
| Ohne Mac nutzbar | nein | nur mit Cloud | – | – | ja |
| Größe und Pflege | nichts | nichts | klein; ein Rust-Teil | groß; Node-Teil; im Repo vorhanden | App-Projekt wie im Spiel |
| Pencil-Gesten (Doppeltippen, Drücken) | nein | nein | – | – | ja, mit kleinem Plugin |
| Wann | **jetzt** | **jetzt** fürs iPad | wenn eine eigene Mac-App gewünscht ist | nur wenn Chromium-Eigenschaften zählen | wenn das iPad ohne Mac arbeiten soll |

### 8.3 Urteil

1. **Jetzt keine Hülle.** Auf dem Mac läuft der Editor im Browser über den Dev-Server, auf dem iPad in Safari über das
   lokale Netz. Für Service Worker, Zwischenablage und `persist()` braucht es HTTPS, also ein lokales Zertifikat, dem das iPad
   vertraut. Die Seite wird als App auf den Home-Bildschirm gelegt (Vollbild, kein Safari-Rahmen).
2. **Florians Fenster bleibt ruhig.** Der Editor, mit dem er arbeitet, läuft von einem festen Stand: gebaute Fassung über
   `vite preview` oder eigener Arbeitsbaum mit eigenem Port. Im Repo gilt: Jede Änderung unter `src` lädt das Fenster neu.
   Für ein Werkzeug, in dem er stundenlang formt, ist das untragbar.
3. **60 Hz als Referenz.** Am Mac misst der Editor die Bildrate und bietet eine **60-Hz-Vorschau** (jedes zweite Bild
   zeichnen), damit Florian in Chrome sieht, was das iPhone zeigt. Physik und Laufzeit takten ohnehin fest (Bericht 09).
4. **Später fürs iPad: Capacitor**, weil es im Repo eingerichtet ist und Pencil-Gesten nativ erreichbar macht.
5. **Später für den Mac, nur wenn gewünscht: Tauri 2.** Gleiche Engine wie das iPad, also ein Ziel zum Prüfen, und ein kleines
   Paket. **Electron** nur, wenn sich herausstellt, dass Florian am Mac 120 Hz will oder WebGPU in WebKit nicht trägt.
6. **Zu prüfen:** Capacitor-iPad-Apps laufen auf Macs mit Apple Silicon („Designed for iPad“). Das wäre eine App für beide
   Geräte. Für ein Profiwerkzeug am Mac (Fenster, Menüs, Tasten) ist es aber nach meinem Wissen nur ein Notbehelf.

---

## 9 iPad mit Stift

### 9.1 Was Safari bietet

| Funktion | Safari | Nutzen für uns |
|---|---|---|
| Pointer Events mit `pointerType` (`pen`, `touch`, `mouse`), `pressure`, `tiltX/Y` | lange vorhanden | eine Eingabeschicht für Maus, Trackpad, Finger und Stift |
| `getCoalescedEvents()` | seit 18.2 (Mac und iOS) | alle Zwischenproben des Stifts, nicht nur eine je Bild: glattere Linien beim Zeichnen und Formen |
| `getPredictedEvents()` | seit 18.2 | vorausgesagte Proben, die die gefühlte Verzögerung senken; nur für die Anzeige, nie fürs Dokument |
| `altitudeAngle` | seit 18.2 | Neigung des Stifts, etwa für die Breite eines Bleistiftstrichs |
| `twist` | das Attribut gibt es seit Safari 13 | ob die Drehung des Pencil Pro dort ankommt, ist **ungeprüft** |
| Schweben des Pencil | seit Safari 16.1 (damals das iPad Pro mit M2) | Vorschau, was ein Druck treffen würde, wie das Schweben der Maus am Mac |
| OffscreenCanvas mit WebGL | seit Safari 17 | Zeichnen in einem Worker, falls die Oberfläche das Bild bremst |
| Doppeltippen und Drücken (Pencil 2 und Pro) | nach meinem Wissen nur nativ (`UIPencilInteraction`) | über ein Capacitor-Plugin, etwa „Drücken öffnet das Werkzeugrad“ |

### 9.2 Eine Grammatik für alle Eingaben

| Geste | Mac | iPad | Wirkung, überall gleich |
|---|---|---|---|
| Zeigen | Maus schwebt | Pencil schwebt; ohne Schweben eine Lupe beim Drücken | Vorschau: was getroffen würde, mit Wert |
| Drücken und Ziehen | Maus | Stift | formt das Getroffene: Punkt, Griff, Knochen, Fläche, Schlüssel in der Zeitleiste, Pose auf dem Brett |
| Tippen | Klick | Stift oder Finger | wählen |
| Ansicht | Trackpad mit zwei Fingern, Leertaste und Ziehen | zwei Finger | verschieben, zoomen, drehen; ändert nie den Inhalt |
| Modifikator | ⇧ ⌥ ⌘ | dieselben als Tasten am Bildschirmrand (halten, während der Stift zieht) oder an der Tastatur | ⇧ einrasten, ⌥ Knick oder Kopie, ⌘ zur Auswahl hinzufügen |
| Rückgängig, Wiederholen | ⌘Z, ⇧⌘Z | Tippen mit zwei Fingern, Tippen mit drei Fingern (verbreitete Konvention in Zeichen-Apps) | ein Schritt im Verlauf |

Regel: **Der Finger ändert nie Inhalt, solange ein Stift im Spiel ist.** Eine Berührung mit `pointerType: touch` gilt dann nur
der Ansicht. So weisen wir die Handfläche ab, ohne Sonderfälle.

### 9.3 Technische Regeln

- **CSS der Zeichenfläche:**
  - `touch-action: none` (kein Scrollen und Zoomen durch Safari),
  - `user-select: none`, `-webkit-touch-callout: none`,
  - `setPointerCapture` beim Drücken.
- **Proben verarbeiten:** Für das Dokument die zusammengefassten Proben (`getCoalescedEvents`) auswerten, für die Anzeige
  zusätzlich die vorausgesagten. Ein Bleistiftstrich mit Druck und Verjüngung entsteht mit `perfect-freehand` (MIT, 1.2.3).
  Die Bibliothek liefert die Umrisslinie eines Strichs mit Druck, Glättung und Verjüngung an Anfang und Ende. Der Umriss wird
  zu Ankern und Griffen vereinfacht. Das passt zu Florians Regel „Verjüngungen statt Outline“.
- **Treffflächen:** Punkte und Griffe sind am iPad mindestens 44 pt groß zu greifen (`@media (pointer: coarse)`), gezeichnet
  bleiben sie klein.
- **Bildrate:** 60 Hz (Abschnitt 8). Der Pencil liefert mehr Proben, als gezeichnet werden. Die Formen werden aus allen Proben
  berechnet, nicht nur aus einer je Bild.

---

## 10 Tastenkürzel

1. **Ein Befehlsregister** als einzige Quelle. Jeder Befehl hat eine Kennung, einen deutschen Titel, Kürzel, einen Kontext
   (Zeichenfläche, Zeitleiste, Textfeld, Werkzeug aktiv) und eine Ausführung. Aus dem Register entstehen:
   - die Tastenkürzel,
   - die Menüs und Knöpfe,
   - die Befehlssuche (⌘K),
   - die Tasten am iPad-Bildschirmrand,
   - die Hilfe, die alle Kürzel zeigt (Taste ?),
   - und die Test-Haken.

   Nach meinem Wissen macht VS Code es mit „when“-Bedingungen genauso. So funktioniert jede Handlung auf jedem Weg gleich.
2. **Belegung:**
   - Kürzel werden über `event.key` erkannt, damit die Beschriftung der Taste gilt. Auf QWERTZ liegt Z an anderer Stelle als
     auf QWERTY, und ⌘Z muss trotzdem die Taste mit dem Z sein.
   - Mit ⌥ liefert macOS in `key` ein Sonderzeichen statt des Buchstabens (auf der US-Belegung etwa Ω statt z). Dann wird über
     `event.code` erkannt.
   - Kürzel mit `[`, `]`, `/` oder `\` meiden: Auf der deutschen Mac-Tastatur brauchen sie ⌥ oder ⇧.
   - Die kleine Bibliothek tinykeys (MIT, 4.0.1) erkennt `key` oder `code`, kennt `$mod` (⌘ am Mac, Strg sonst) und
     Tastenfolgen und übergeht Eingabefelder. Eigener Code von rund 150 Zeilen ginge auch.
3. **Grenzen des Browsers:** ⌘W, ⌘T, ⌘N und ⌘Q gehören im Browser-Tab dem Browser. Wir belegen sie nicht. Auf dem iPad kommen
   Tasten einer Hardware-Tastatur als `keydown` an. Einige Systemkürzel (⌘Tab, ⌘Leertaste, ⌘H) fängt iPadOS vorher ab.
4. **Florians bestehende Tasten** (B, P, L, O, Z, ⇧ für Wenden und so weiter aus den Studien und dem Prototyp) werden ins
   Register übernommen. Neue Kürzel nur, wo eine Handlung häufig ist.

---

## 11 Tests

### 11.1 Ebenen

| Ebene | Werkzeug | Was | Beispiel |
|---|---|---|---|
| Einheit | vitest 5.1 (MIT) | Format, Migrationen, Store, Verlauf, Geometrie, Laufzeit | Migration v1 → v2 an Florians Ozzy-Datei; zweimal speichern ergibt gleiche Bytes; eine Geste ist ein Schritt |
| Eigenschaften | fast-check (MIT, 4.10.3) | Regeln über zufällige Eingaben | „Kein Sprung“: Im Übergang zwischen zwei zufälligen Posen springt kein Anker weiter als ein Vielfaches seines mittleren Schritts. „Kein Verklumpen“: Benachbarte Anker unterschreiten nie einen Abstand. „Rückgängig ist exakt“: Tun und Zurück ergibt den alten Stand. |
| Determinismus | vitest | Laufzeit und Physik mit festem Takt | Hash je Takt über 600 Takte gleich (Bericht 09) |
| Bildvergleich | vitest im Browsermodus mit `toMatchScreenshot` (pixelmatch, Schwelle als Anteil der Bildpunkte) | Renderer und Effekte | Bild 30 eines Übergangs gegen das freigegebene Bild; Chromium und WebKit über Playwright, **echtes Safari über WebDriverIO** |
| Abläufe | Playwright 1.65 (Apache-2.0) | Editor öffnen, formen, ⌘Z, speichern | mit `page.clock`: Die Uhr steuert `requestAnimationFrame` und lässt Zeit gezielt laufen; Stifteingaben als `PointerEvent` mit `pointerType: 'pen'` und Druck |
| Gerät | Florian, dazu eine Prüfseite im Editor | Tempo, Gefühl, Look | Bildzeit-Anzeige wie im Prototyp, Mittel und 95 % |

### 11.2 Grenzen

- **Playwright-WebKit ist nicht Safari.** Es kommt vom aktuellen WebKit-Zweig mit eigenen Patches und ist Safari oft voraus.
  Am nächsten kommt man auf macOS. Echtes iOS-Safari testet Playwright nicht, Geräte werden nur nachgeahmt.
- **Bildvergleiche sind empfindlich:** Schriften, Grafiktreiber und Maschine machen Unterschiede. Die Vergleichsbilder werden
  auf dem Mac erzeugt und gelten nur dort. Wir vergleichen gezielt Ausschnitte, keine ganzen Seiten.
- **Zeit messen Tests nie an der Wanduhr.** Sie zählen Takte und Bilder. Die Zeittests des eingefrorenen Kerns reißen unter
  Last (Root-`CLAUDE.md`, Regel 10).
- **Kein Test ersetzt das Auge.** Bildvergleiche fangen Rückschritte gegenüber einem freigegebenen Stand. Ob etwas schön oder
  glatt ist, entscheidet Florian (Regel 4).

### 11.3 Regeln für den Ablauf

Je Schritt eine vorher festgelegte, sichtbare Probe. Typen und die betroffenen Tests im Vordergrund mit kurzer Ausgabe. Keine
Messreihen im Hintergrund (Regel 2). Test-Haken im Fenster (`window.__studio`) wie in den bisherigen Studien, damit Proben ohne
Klicken auf Pixel arbeiten.

---

## 12 Eine Laufzeit für Editor und Spiel

### 12.1 Pakete (Vorschlag)

```text
packages/studio-format     Typen, zod-Schemas, Migrationen, deterministischer Schreiber      kein DOM
packages/studio-laufzeit   Knochen, Gewichte, Morph, Posen, Übergänge, Logik, Takt           kein DOM, deterministisch
packages/studio-welt       Anbindung Box2D (Weltphysik) und eigene Figurphysik (Bericht 09)   kein DOM
packages/studio-bild       WebGL2-Renderer mit Abstandsfeldern und Effekten (Bericht 10)      Canvas
apps/studio                Editor: Store, Verlauf, Befehle, Eingabe, Werkzeuge, Panels        nutzt alles oben
apps/ozzy-spiel            Demospiel „Ozzy auf dem Rad“: Laufzeit + Bild + Eingabe + Capacitor
```

### 12.2 Regeln

1. **Laufzeit und Format ohne DOM.** Sie laufen im Browser, im Worker, in Node (Tests, Backen, Export) und in der iPhone-App.
2. **Deterministisch:** fester Takt (60 Hz mit Unterschritten), Zufall mit Saat, eigene Näherungen für Winkelfunktionen,
   wo es Bitgleichheit verlangt (Bericht 09).
3. **Der Editor zeigt immer die Laufzeit**, nie eine eigene Vorschau. Was im Editor glatt aussieht, ist im Spiel glatt.
4. **WebGL2 jetzt, WebGPU später hinter derselben Schnittstelle** (Bericht 10).
5. **Kein `SharedArrayBuffer`.** Er verlangt Cross-Origin-Isolation, die in WKWebView und Capacitor umständlich ist.
   WebAssembly läuft deshalb einfädig (box2d3-wasm `compat`, Bericht 09).
6. **Workers erst bei Messbedarf.** Zuerst läuft alles im Hauptthread. Bremst die Oberfläche das Bild, wandern Laufzeit und
   Renderer mit OffscreenCanvas (seit Safari 17) in einen Worker. Weil die Laufzeit kein DOM kennt, geht das ohne Umbau.

### 12.3 Ins Spiel und aufs iPhone

- **Export:** Laufzeitdatei (Abschnitt 5.3) und Assets landen im Spielpaket. Das Spiel lädt sie per `fetch` aus dem Paket.
- **Live-Verbindung beim Entwickeln:**
  - Die Capacitor-App lädt im Entwicklungsmodus vom Dev-Server des Macs (Live Reload über `server.url`, nach meinem Wissen
    so vorgesehen).
  - Der Editor schickt jede Transaktion als Datensatz-Diff über den Websocket von Vite an das laufende Spiel.
  - Florian formt am Mac oder iPad und sieht es im selben Moment auf dem iPhone, mit Physik und Logik.
  - Probe: Eine Änderung erscheint in unter einer halben Sekunde.
- **iOS:** 60 Hz in WKWebView, WebGL2 auf allen Zielgeräten, WebGPU erst nach Prüfung auf dem Gerät (Bericht 10).
- **Das Hauptspiel** (three.js mit WebGPU und Capacitor) bindet die Figur als eigene Zeichenfläche ein oder später als Textur.
  Einen Kontext mit dem WebGPU-Renderer von three.js können wir mit WebGL2 nicht teilen.
  Das Demospiel braucht three.js gar nicht.
- **Falls die Spiel-Engine je wechselt** (ADR-0001 ist formal offen, Godot ruht): Dann müsste die Laufzeit portiert werden.
  Genau diese Doppelarbeit haben Spine und Lottie. Solange wir auf Web und Capacitor bleiben, entfällt sie.

---

## 13 Open-Source-Bausteine: Lizenz, Stand, Urteil

Stand und Lizenz aus der npm-Registry (20.11.2026), Fähigkeiten aus README, Handbuch oder Changelog.

| Baustein | Lizenz | Stand | Was er kann | Urteil für uns |
|---|---|---|---|---|
| **Motion Canvas** | MIT | 3.17.2 vom 14.12.2024, seitdem keine Veröffentlichung | Animation als Code mit Generatoren, Zeitpunkte im Editor ziehbar; Oberfläche Preact plus Signals | **nur Vorbild**: für ein Spiel ohne Laufzeit; die Idee „Code nennt den Zeitpunkt, der Editor hält den Wert“ passt zu benannten Momenten in Übergängen |
| **Theatre.js** | Core Apache-2.0, **Studio AGPL-3.0** | 0.7.2 vom 19.05.2024; Entwicklung laut README vorübergehend privat | Sequenz-Editor mit Kurven, Zustand als JSON, Core lädt ihn | **nur Vorbild** für Zeitleiste und Trennung Studio/Core; nicht einbauen (AGPL, ruht) |
| **Rive-Laufzeiten** | MIT | Web 2.52.0 vom 19.11.2026, sehr aktiv; C++-Laufzeit mit Metal, Vulkan, D3D und WebGL | spielt `.riv`-Dateien aus dem Rive-Editor, Zustandsautomaten, eigener Renderer | **nur Vorbild**: Datenmodell (Gewichte je Anker und Griff, Bericht 02) und Format (Inhaltsverzeichnis). Kein Verschmelzen, keine Physik (Berichte 02 und 10) |
| **lottie-web** | MIT | 5.13.0 vom 21.05.2025 | Abspieler für Lottie (SVG, Canvas, HTML) | **später vielleicht** als Export gebackener Clips; dann eher **dotLottie-web** (MIT, 0.83.2 vom 12.11.2026, ThorVG) |
| **Spine-Laufzeiten** | **eigene Lizenz** (Spine Runtimes License) | 4.3.13 vom 24.07.2026 | Skelettanimation | **nicht nehmen**: Nutzung nur mit Spine-Editor-Lizenz, und weitergegebene Produkte dürfen den Spine-Editor beim Erstellen oder Bearbeiten von Skeletten und Animationen nicht ersetzen. Auch keinen Code daraus übernehmen. |
| **paper.js** | MIT | 0.12.18 (07/2024), dann 0.13 bis 0.17 vom 19.10. bis 03.11.2026, veröffentlicht über GitHub Actions mit Herkunftsnachweis; Betreuer sind die ursprünglichen Autoren | boolesche Operationen auf Bézier-Pfaden, seit 0.15 über einen planaren Graphen (laut Changelog schneller als 0.14 bei allen gemessenen Eingaben); seit 0.17 `offset()`, `outline()`, `dash()`; viele Fehler an fast gleichen Kreuzungen behoben; TypeScript-Typen | **prüfen**, für „Flächen vereinen oder ausschneiden“ als Werkzeug und für Umrisse. Genaue Version festnageln und hinter unserer Geometrie-Schnittstelle halten: fünf Nebenversionen in drei Wochen sind viel Bewegung. Schwer (9,4 MB entpackt), bringt eine eigene Szene mit. |
| **bezier-js** | MIT | 6.1.4 vom 16.07.2023, ruht | Länge, Teilen, Extrema, Begrenzung, nächster Punkt, Krümmung, Schnittpunkte, Versatz als Näherung aus mehreren Kurven | **nicht nötig**; unsere Kurvenmathematik liegt schon in `form.ts`. Gute Referenz |
| **flatten-js** | MIT | 1.6.15 vom 25.10.2026 | Segmente, Kreisbögen, Polygone mit booleschen Operationen (Weiler-Atherton), Abstände, Beziehungen; **keine Bézier-Kurven** | **nicht nötig** |
| **Clipper2** | BSL-1.0 | Hauptrepo archiviert, der Autor geht in den Ruhestand; die Pflege zieht um und wird nur noch C++; im Web Clipper2-WASM (BSL-1.0, 0.4.0 vom 18.05.2026), clipper2-js (1.2.4 vom 01.01.2024), clipper2-ts | boolesche Operationen und Versatz für Polygone, robust über ganzzahlige Koordinaten | **prüfen** für abgeflachte Umrisse: Kollisionshüllen, Versatz, Sicherheitsabstände |
| **polybool** (`@velipso/polybool`) | 0BSD | 2.0.11 vom 02.09.2024 | boolesche Operationen in TypeScript, mit kubischen Kurven, laut README aber „experimentell und instabil“ | **Rückfall**, wenn paper.js zu schwer ist |
| **earcut** | ISC | 3.2.4 vom 28.09.2026 | schnellste Triangulation in JS, mit Löchern; gültige Eingabe vorausgesetzt; Prüfung über `deviation()`, Verfeinerung über Delaunay-Flips | **nehmen** für Füllungen, Trefferflächen und das Zerlegen von Körpern in Dreiecke (Box2D braucht konvexe Teile) |
| **Rapier 2D** | Apache-2.0 | 0.21.0 vom 25.09.2026; Paket `-deterministic`; Schnappschüsse über `takeSnapshot` | Physik in Rust nach WebAssembly | **Plan B** (Bericht 09) |
| **Box2D 3** über **box2d3-wasm** | MIT | box2d3-wasm 6.0.0 vom 26.10.2026, mit Herkunftsnachweis | Box2D 3.2 als WebAssembly; der Build `compat` läuft einfädig (Bericht 09) | **nehmen** für die Weltphysik (Bericht 09) |

**Weitere Bausteine, die sich bei der Recherche anboten:**

| Baustein | Lizenz | Stand | Urteil |
|---|---|---|---|
| perfect-freehand | MIT | 1.2.3 (01.02.2026) | **nehmen** für Bleistift und Freihand mit Druck und Verjüngung (Excalidraw nutzt es) |
| Mutative / Immer | MIT / MIT | 2.0.2 / 11.2.10 | **eines nehmen** für bequeme Änderungen im Store |
| zod | MIT | 4.6.7 | **nehmen** für Schemas, Prüfung beim Laden und JSON-Schema |
| fractional-indexing | CC0-1.0 | 4.0.0 | **nehmen** für Reihenfolgen |
| nanoid | MIT | 6.0.2 | **nehmen** für Kennungen |
| tinykeys | MIT | 4.0.1 | **nehmen** oder selbst schreiben |
| Zag | MIT | 1.48.0 | **nehmen** für komplexe Bedienelemente |
| fflate | MIT | 0.8.3 | **nehmen** für ZIP-Austausch |
| idb | ISC | 8.0.4 | **nehmen** für Journal und Sitzung in IndexedDB |
| browser-fs-access | Apache-2.0 | 0.39.0 | **später**, für Öffnen und Sichern ohne Dev-Server mit Rückfällen |
| `@preact/signals-core` / alien-signals | MIT / MIT | 1.14.5 / 3.2.1 | **eines nehmen** für abgeleitete Werte im Editor-Kern |
| `@tldraw/store`, `@tldraw/state` | MIT | 5.6.1 | **Vorbild**, Alternative zum eigenen Store |
| tldraw (SDK) | eigene Lizenz, Schlüssel für Produktion | 5.6.1 | **nicht nehmen** |
| dockview | MIT (Enterprise-Teil kostenpflichtig) | 8.9.1 | **nur bei Bedarf** |
| Yjs / Automerge / Loro | MIT | 13.6.33 / 3.5.0 / 1.18.0 | **später**, siehe Abschnitt 7 |
| PixiJS / three.js | MIT / MIT | 8.23.0 / 0.187.0 | Renderer-Fragen in Bericht 10; three.js bleibt im Hauptspiel |

---

## 14 Lizenzregeln für unser Produkt

1. **Unbedenklich:** MIT, ISC, BSD, Apache-2.0 (Hinweisdatei mitgeben), 0BSD, CC0, BSL-1.0, Zlib.
2. **Meiden:** AGPL und GPL im Editor (Theatre.js Studio), sobald wir den Editor weitergeben oder als Dienst anbieten.
   Laufzeiten mit eigener Lizenz (Spine). SDKs mit Lizenzschlüssel (tldraw).
3. **Automatisch prüfen:** eine Liste der Lizenzen aller Abhängigkeiten als Test oder Skript, mit Warnung bei neuen Lizenzarten.
   Graphite hat dafür `license-checker-rseidelsohn` in den Entwicklungsabhängigkeiten.
4. **Keinen Code aus Programmen mit Ausschlusslizenz übernehmen.** Ideen und Dokumentation lesen ja, Quelltext kopieren nein.
   Bei Spine wäre eine abgeleitete Laufzeit ein abgeleitetes Werk.
5. **Herkunft prüfen** bei Paketen, die nach langer Ruhe plötzlich viele Versionen bekommen. Bei paper.js 0.13 bis 0.17
   geschehen: veröffentlicht über GitHub Actions aus dem offiziellen Repo, mit Herkunftsnachweis, unter den ursprünglichen
   Betreuern.

---

## 15 Empfehlung auf einen Blick

| Bereich | Wahl | Begründung | Alternative |
|---|---|---|---|
| Sprache und Bau | TypeScript, Vite 8, pnpm-Monorepo (wie heute); **TypeScript 7** für `tsc`, TypeScript 6 daneben für typescript-eslint | 8- bis 12-mal schnellere Typprüfung; bekannter Weg | bei TypeScript 6 bleiben, bis 7.1 die neue Schnittstelle bringt |
| Schichten | Format → Laufzeit → Welt → Bild → Editor | dieselbe Laufzeit im Spiel; Tests ohne Fenster | – |
| Zeichenfläche, Zeitleiste, Posen-Brett | eigener Code, WebGL2 und Canvas 2D | Tempo, volle Kontrolle; so machen es alle großen Werkzeuge | – |
| Panels | **React 19.3 und React Compiler 1.0**, Live-Werte über Signale | Angebot, Sicherheit für KI-Sitzungen, im Repo bekannt, TSX mit TypeScript 7 | **Preact 11 mit Signals** (fast derselbe Code) |
| Bedienelemente | Zag plus eigene schlichte Bauteile | gleiche Logik in jedem Framework | Radix oder React Aria (nur React) |
| Zustand | eigener Store: Datensätze, Transaktionen, Datensatz-Diffs, Verlauf mit Gesten, Signale für Abgeleitetes | ein Diff für alles: Rückgängig, Speichern, Live-Verbindung, später Sync | `@tldraw/store` und `@tldraw/state` (MIT) |
| Format | JSON, Versionen je Baustein, Migrationen, deterministischer Schreiber, zod und JSON-Schema | Git, KI-Sitzungen, Erweiterbarkeit | binär erst für das Spiel, wenn gemessen nötig |
| Speichern | Dev-Server mit Revision, Live-Meldung und Journal | passt zum Arbeiten im Repo | Capacitor-Dateien (iPad), Tauri (Mac), Cloud |
| Zusammenarbeit | keine Bibliothek; Datenmodell offen fürs Figma-Modell | ein Gestalter; Konflikte nur mit KI-Sitzungen | Loro oder Yjs bei Offline-Mehrgeräte-Arbeit |
| Verpackung | vorerst keine; Safari-Web-App aufs iPad | nichts zu pflegen | Capacitor (iPad), Tauri 2 (Mac), Electron (nur für Chromium-Eigenschaften) |
| Eingabe | Pointer Events mit Zwischenproben und Vorhersage, eine Grammatik für Maus, Finger und Stift | Safari 18.2 hat alles Nötige | natives Plugin für Pencil-Gesten |
| Tasten | Befehlsregister, `key` mit `code`-Rückfall, tinykeys | alles auf jedem Weg gleich | eigener kleiner Abgleicher |
| Tests | vitest 5, fast-check, Browsermodus mit Bildvergleich, Playwright mit Uhr, WebDriverIO für Safari | schnell, ohne Fenster, nah an WebKit | – |
| Geometrie | eigener Kern; earcut; paper.js oder Clipper2-WASM für Boolesches und Versatz; perfect-freehand | klein halten, Bewegliches hinter Schnittstellen | polybool |
| Physik | Box2D 3 über box2d3-wasm plus eigene Figurphysik | Bericht 09 | Rapier 2D |
| Renderer | WebGL2 mit Abstandsfeldern | Bericht 10 | WebGPU später |

---

## 16 Erste Schritte, je mit sichtbarer Probe (Vorschlag, wartet auf Freigabe)

1. **Format und Store als Gerüst** mit einem Datensatztyp (Fläche) und Florians Ozzy-Vorlagen als Inhalt.
   Probe: einen Griff 100-mal ziehen, dann ein ⌘Z stellt den Stand vor dem Ziehen her. Zweimal speichern ergibt dieselben
   Bytes. Eine Änderung an der Datei durch eine Sitzung erscheint im offenen Editor.
2. **Hülle mit Zeichenfläche und erstem Panel** (Inspector aus Eigenschaftsbeschreibungen).
   Probe: Beim Abspielen eines Übergangs laufen die Werte im Inspector mit. Die Bildzeit am iPad bleibt dabei unter 16,7 ms
   (Mittel und 95 %).
3. **Stift am iPad:** Formen mit Zwischenproben und Schweben.
   Probe: Florian zieht einen Punkt mit dem Pencil und urteilt, ob es sich direkt anfühlt.
4. **Live-Verbindung zum iPhone.**
   Probe: Eine Änderung am Mac erscheint in unter einer halben Sekunde auf dem iPhone 16.

Jeder Schritt ist klein und wird an Florians Fall gezeigt, bevor der nächste beginnt.

---

## 17 Offene Fragen

**An Florian, in seinen Worten:**

1. Willst du unterwegs am iPad formen, ohne dass dein Mac läuft? Wenn ja, brauchen wir eine iPad-App mit eigenen Dateien
   oder einen Speicher im Netz.
2. Bleibt der Editor euer Werkzeug, oder soll er später ein Produkt für andere werden? Davon hängen Lizenzen, Zusammenarbeit,
   App und Cloud ab.
3. Welches iPad und welchen Pencil benutzt du? Schweben gibt es erst ab den M2-Modellen, Drücken nur mit dem Pencil Pro.
4. Arbeitest du am Mac lieber in Chrome oder in Safari? Chrome zeigt 120 Bilder je Sekunde, Safari und das iPhone 60.
5. Ist „glatt bei 60 Bildern je Sekunde auf dem iPhone“ für dich der Maßstab?

**Technisch, noch zu prüfen:**

6. Kommt die Drehung des Pencil Pro in Safari als `twist` an? Probe auf seinem Gerät.
7. WebGPU in WKWebView unter iOS 27 auf dem iPhone 16 (Bericht 10).
8. Trägt paper.js 0.17 boolesche Operationen an Ozzys Flächen ohne Fehler? Probe an seinen Formen gegen Clipper2-WASM an
   abgeflachten Umrissen.
9. Lässt sich die 60-Hz-Einstellung in einer eigenen Mac-App (Tauri) zulässig abschalten, falls Florian dort 120 Hz will?
10. Nutzerstimmen zu Tauri gegen Electron, Solid 2.0 und paper.js 0.17 nachholen, sobald wieder Suchbudget da ist.
11. ADR-0001 (Spiel-Engine) bleibt formal offen. Solange es bei Web und Capacitor bleibt, trägt die gemeinsame Laufzeit.

---

## Quellen

**Werkzeuge und ihr Aufbau**

- Figma, Mehrspieler: <https://www.figma.com/blog/how-figmas-multiplayer-technology-works/>
- Figma, Rendern mit WebGPU (18.09.2025): <https://www.figma.com/blog/figma-rendering-powered-by-webgpu/>
- tldraw, Editor und Verlauf: <https://tldraw.dev/docs/editor>
- tldraw, Speichern: <https://tldraw.dev/docs/persistence>
- tldraw, Migrationen: <https://tldraw.dev/sdk-features/persistence>
- tldraw, Lizenz: <https://tldraw.dev/community/license>
- `@tldraw/state`: <https://github.com/tldraw/tldraw/tree/main/packages/state>
- Excalidraw, Rückgängig mit Deltas (PR 7348, April 2024): <https://github.com/excalidraw/excalidraw/pull/7348>
- Rive, Editor in Flutter: <https://flutter.dev/showcase/rive>
- Rive, C++-Laufzeit: <https://github.com/rive-app/rive-runtime>
- Rive, Format: <https://rive.app/docs/runtimes/advanced-topic/format>
- Spine, Laufzeit-Lizenz: <https://esotericsoftware.com/spine-runtimes-license>
- Spine, Versionen: <https://esotericsoftware.com/spine-versioning>
- Theatre.js: <https://github.com/theatre-js/theatre>
- Theatre.js, Projekte: <https://www.theatrejs.com/docs/latest/manual/projects>
- Motion Canvas: <https://github.com/motion-canvas/motion-canvas>
- Motion Canvas, Time Events: <https://motioncanvas.io/docs/time-events>
- Graphite: <https://github.com/GraphiteEditor/Graphite>
- Graphite, `frontend/package.json`: <https://raw.githubusercontent.com/GraphiteEditor/Graphite/master/frontend/package.json>

**Frameworks und Sprache**

- React Compiler 1.0: <https://react.dev/blog/2025/10/07/react-compiler-1>
- Preact, Releases: <https://github.com/preactjs/preact/releases>
- Solid, Releases: <https://github.com/solidjs/solid/releases>
- TC39-Signale: <https://github.com/tc39/proposal-signals>
- TypeScript, Blog: <https://devblogs.microsoft.com/typescript/>
- TypeScript 7.0: <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- Vite, Plugin-Schnittstelle (Websocket, Middlewares): <https://vite.dev/guide/api-plugin>

**Zustand, Format und Zusammenarbeit**

- Immer, Patches: <https://immerjs.github.io/immer/patches>
- Mutative: <https://github.com/unadlib/mutative>
- zod, JSON-Schema: <https://zod.dev/json-schema>
- Yjs: <https://docs.yjs.dev/>
- Yjs, UndoManager: <https://docs.yjs.dev/api/undo-manager>
- Automerge 3: <https://automerge.org/blog/automerge-3/>
- Loro: <https://github.com/loro-dev/loro>

**Plattformen**

- Tauri, Webansichten: <https://v2.tauri.app/reference/webview-versions/>
- Tauri, Überblick: <https://v2.tauri.app/start/>
- Electrobun: <https://github.com/blackboardsh/electrobun>
- WebKit-Grundeinstellungen (`PreferPageRenderingUpdatesNear60FPSEnabled`, `ThreadedTimeBasedAnimationsAtHighFrameRateEnabled`):
  <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml>
- WebKit, Speicherregeln: <https://webkit.org/blog/14403/updates-to-storage-policy/>
- Safari 17.0 (Web-Apps im Dock, OffscreenCanvas mit WebGL): <https://webkit.org/blog/14445/webkit-features-in-safari-17-0/>
- Safari 16.1 (Schweben des Apple Pencil): <https://webkit.org/blog/13399/webkit-features-in-safari-16-1/>
- Safari 27.1: <https://webkit.org/blog/18486/webkit-features-for-safari-27-1/>
- Safari 27.2: <https://webkit.org/blog/18515/webkit-features-for-safari-27-2/>
- WebKit, Position zur File System Access API: <https://github.com/WebKit/standards-positions/issues/28>
- caniuse:
  - File System Access API: <https://caniuse.com/native-filesystem-api>
  - `getCoalescedEvents`: <https://caniuse.com/mdn-api_pointerevent_getcoalescedevents>
  - `getPredictedEvents`: <https://caniuse.com/mdn-api_pointerevent_getpredictedevents>
  - `altitudeAngle`: <https://caniuse.com/mdn-api_pointerevent_altitudeangle>
  - `twist`: <https://caniuse.com/mdn-api_pointerevent_twist>
  - OffscreenCanvas: <https://caniuse.com/offscreencanvas>

**Tests und Tasten**

- Vitest, Browsermodus: <https://vitest.dev/guide/browser/>
- Vitest, Bildvergleich: <https://vitest.dev/guide/browser/visual-regression-testing>
- Playwright, Uhr: <https://playwright.dev/docs/clock>
- Playwright, Browser: <https://playwright.dev/docs/browsers>
- tinykeys: <https://github.com/jamiebuilds/tinykeys>
- dockview: <https://github.com/mathuo/dockview>
- Zag: <https://github.com/chakra-ui/zag>

**Geometrie und Physik**

- paper.js, Changelog: <https://github.com/paperjs/paper.js/blob/develop/CHANGELOG.md>
- polybool: <https://github.com/velipso/polybool>
- Clipper2: <https://github.com/AngusJohnson/Clipper2>
- earcut: <https://github.com/mapbox/earcut>
- flatten-js: <https://github.com/alexbol99/flatten-js>
- bezier-js: <https://pomax.github.io/bezierjs/>
- perfect-freehand: <https://github.com/steveruizok/perfect-freehand>
- box2d3-wasm: <https://github.com/Birch-san/box2d3-wasm>
- Rapier, Schnappschüsse: <https://rapier.rs/docs/user_guides/javascript/serialization>
- lottie-web: <https://github.com/airbnb/lottie-web>

**npm-Registry** (Version, Datum, Lizenz, Herausgeber, Abhängigkeiten, gelesen am 20.11.2026), etwa
<https://registry.npmjs.org/solid-js>, <https://registry.npmjs.org/paper>, <https://registry.npmjs.org/@theatre/studio>,
<https://registry.npmjs.org/box2d3-wasm>. Ebenso abgefragt: react, preact, svelte, lit, typescript, vite, vitest,
@playwright/test, @tauri-apps/cli, electron, @capacitor/core, immer, mutative, yjs, @automerge/automerge, loro-crdt, zod,
earcut, @dimforge/rapier2d, clipper2-wasm, @velipso/polybool, perfect-freehand, @kobalte/core, @ark-ui/solid, tinykeys, dockview,
@zag-js/core und weitere aus den Tabellen.

**Im Repo**

- `docs/research/tech-stack.md`: Technik des Spiels, September 2026; dort schon die 60 Hz in WKWebView.
- `docs/research/2026-11-20-editor/02-rive-lottie-vektor.md`
- `docs/research/2026-11-20-editor/09-physik-engines-web.md`
- `docs/research/2026-11-20-editor/10-rendern-shader.md`
- Prototyp: `apps/editor/src/ozzy-figur/` (`werkzeug.ts`, `main.ts`)
- Dev-Server: `apps/editor/vite.config.ts` (`figurSchluessel`)
