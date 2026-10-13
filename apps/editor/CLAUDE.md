# Wesen-Editor — Gedächtnis

Wird geladen, sobald eine Sitzung in `apps/editor` arbeitet (zusätzlich zur Root-`CLAUDE.md`). Kurz halten, Nachträge mit Datum.

> **Wichtig (Florian, 12.10. spätnachts):** Alle Festlegungen in dieser Datei stammen aus Tests und sind meist Bauchentscheidungen, nicht ausgetestet. Das gilt auch für Layout, Bedienelemente und UI.
> - Ziel der großen Sitzung ist etwas Neues und Einzigartiges: die optimale Bauweise für unsere Wesen, viel besser und schneller, als sie in Blender zu bauen.
> - Findet die Sitzung einen besseren Weg, setzt sie ihn um. Einstieg: `docs/plans/2026-10-13-grosse-sitzung-wesen-editor.md`.
> - Die Fallen weiter unten bleiben gültiges technisches Wissen.

> **Nachtrag 13.10. abends:** Der Plan „Wesen-Editor 2“ ist freigegeben (`docs/plans/2026-10-13-wesen-editor-2.md`). Alle Bauwege unten (creation, Kanten-/Maul-/Tiger-/Wirbelsäulen-Käfig, Schnitt-Loft, rund) sind Versuche und werden nach Phase 0 durch den Käfig-Kern ersetzt; das Gerüst (Layout, Navigation, Renderer3D, Electron, Bibliothek, Undo, E2E-Muster) bleibt. Neue Bedienung nach Plan Abschnitt 9.

## Auftrag und bisherige Entscheidungen (Florian, 11.10.2026; Tests, kein Gesetz)

- Der Charaktereditor wird ein **kompletter Shape-/3D-Editor** und ein großer, eigenständiger Teil des Projekts: Florian zieht drei Profile (Seite, Front, Top) wie in Illustrator, daraus entsteht live das Wesen. Ziel: der Look seiner 19 Referenzbögen und von Eyvind Earle; „der beste Charaktereditor auf dem Markt“.
- **Desktop-App (Electron), eigenes App-Verzeichnis im Monorepo**, kein eigenes Repo (das Spiel lädt später dasselbe Format; geteilte Technik). Nicht für Mobilgeräte.
- Blender-Navigation: Rad = Zoom, mittlere Taste = Verschieben (alle Viewports), rechte Taste ziehen = Drehen (nur 3D).
- Layout exakt nach [`docs/look/editor/figmaScreenshot.png`](../../docs/look/editor/figmaScreenshot.png) (2× bei 1728×1161). Stil: „Eyvind Earle meets Neo-Brutalismus in a liquid glass“, **keine Konturen**.
- Vorgaben im Chat: Kurvenkontur **3 px**, Punkte **rund Ø 10 px**, Bézier-Griffe **6-px-Quadrate**, Farben wie im Screenshot (Punkte `#00FFE1`, editierbare Hälfte schwarz, Spiegelhälfte weiß).
- **Jedes neue Wesen startet als Kugel** aus drei Kreisen (Größe 100 %), **mit 4 Punkten** (Seite) bzw. 3 (Front/Top) — Nachtrag 11.10.: „12 sind zu viel.“
- **Nachtrag 11.10.:** Auswahlrechteck wie Illustrator in den drei Shape-Viewports (⇧ schaltet um), ⇧-Klick, gemeinsames Ziehen, **Pfeiltasten wie Illustrator** (Schritt 0,002 Kachel ≈ 1 pt, ⇧ zehnfach, je Schritt ein Undo). Auswahl je Ansicht als Liste (`auswahl: Record<Ansicht, number[]>`).
- Maximierter Viewport bleibt auf seiner Seite; Speichern und Library funktionieren echt.
- Die **echte Bauweise** (Profile → Körper, Augen, Flügel, Posen/Blendshapes) folgt in einer großen Sitzung ab 12.10. Bis dahin ist der 3D-Körper der **Platzhalter-Loft** in `packages/shape/src/platzhalter/loft.ts`: Die Seite bestimmt Länge und Höhe, das Top die Breitenverteilung (auf die Länge der Seite gestreckt), die Front den Querschnitt. Feste Vertexzahl.
- **Nachtrag 11.10. nachmittags — ein Objekt:** „Es soll ja alles ein und dasselbe Objekt sein. Wenn ich im Frontview etwas verschiebe, muss das auch in den anderen Shapes passieren, live.“ Umsetzung: Die geteilten Ausdehnungen sind gekoppelt (Seite ↔ Front y, Seite ↔ Top x, Front ↔ Top z, gemessen an der Kurve, nicht nur an den Knoten). Die andere Ansicht folgt mit proportionalem Abfall (Exponent 2), gerechnet vom Gestenbeginn (**abgelöst 12.10. abends**, siehe unten). Code: `packages/shape/src/kopplung.ts`, `src/editing/gekoppelt.ts`. Direkte Züge bleiben Illustrator-artig (nur der gezogene Punkt bewegt sich).
- **Nachtrag 11.10. — 3D drehen:** „3D-View lässt sich noch nicht drehen“ (vermutlich Trackpad). Jetzt dreht die linke oder rechte Taste, ebenso ⌃-Klick und Zwei-Finger-Wischen. ⇧ verschiebt, Pinch und Mausrad zoomen. Trackpad-Erkennung: `istTrackpad` (Chrome: wheelDeltaY = −3 · deltaY).
- ~~Automatische Punkte~~ — **verworfen 11.10. nachmittags:** „Das mit den Punkten, die sich von selbst setzen, gefällt mir nicht. Mach es genau wie in Illustrator. Ich setze neue Punkte dann von Hand … auch wie bei Illustrator.“ Jetzt: Zeichenstift P (Klick auf Kurve = Punkt, auf Punkt = löschen, ⌥ = umwandeln), + / −, A/V/Esc = Direktauswahl, Rechtsklickmenü bleibt. Löschen passt die Nachbargriffe an (kleinste Quadrate mit Nachparametrisierung, `loeschen` in `packages/shape/src/profil.ts`). Die Kopplung fügt nie Punkte ein. Für Posen gilt später: gemeinsame Punktstruktur, Einfügen formtreu in allen Posen, Netz mit fester Auflösung.

- **Nachtrag 12.10. — Maul, Zähne, Rig (Versuch, Plan `docs/plans/2026-10-12-maul-zaehne-rig.md`):**
  - **Seitenleiste rechts immer offen:** Tab-Menü oben, Library unten (⌘L klappt auf und zu). `berechneLayout` rechnet sie fest ein (360 px), Rect-Schlüssel `leiste`.
  - **Eckpunkte sind Tabs:** braun Zähne, blau Maul, weiß Augen (folgt), orange Rig, pink maximieren. Zustand `ebene` in `uiStore`; Profile sind nur im Tab Form bearbeitbar.
  - **Maullinien sind 3D-Linien:** Jeder Knoten ist ein 3D-Punkt, jede Ansicht bearbeitet zwei Koordinaten, und neue Punkte holen die Tiefe von der Fläche (Strahlraster). Gespeichert in `dok.maul` (zu/auf), Zähne in `dok.zaehne`.
  - **Bauweise:** Florian fragte, ob wir weg von den Lofts sind. Nein: **Shapes → Loft → Käfig**. Der Loft gibt die Form, der Catmull-Clark-Käfig ist das Netz darüber.
  - **Zahn-Tab:**
    - Die Zähne hängen am Zahnfleisch des Maul-Käfigs (`packages/shape/src/versuch/zaehne.ts`, Editor `src/maul/zahnKoerper.ts`).
    - Seite und Front zeigen Umrisse (`src/maul/ZahnEbene.tsx`). Klick wählt, Ziehen verschiebt längs des Zahnfleischs.
    - Zähne, die geschlossen stören, sind rot; die Vorschläge stehen in der Leiste.
    - Das Dokument speichert die rechte Hälfte, die Tiefe ist ¾ der Breite.
  - Ergebnis: `docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`.

- **Nachtrag 12.10. nachmittags — Kanten, Ansichten, verbundene Kiefer** (Plan `docs/plans/2026-10-12-kanten-ansichten.md`, Ergebnis `docs/research/2026-10-12-kanten-ansichten.md`):
  - **Kiefer verbunden:** gemeinsamer Mundwinkel, der Maulanfang klebt an der Kontur, und im Fressen-Tab zeigt jede Ansicht den Umriss des geöffneten 3D-Körpers (`src/maul/offenerUmriss.ts`).
  - **Kanten im Form-Tab, kein eigener Tab** (`src/kanten/`):
    - Der Zeichenstift auf freier Fläche setzt eine Kantenlinie. Härte je Knoten: gestrichelt 1 px = glatt bis schwarz 3 px = scharf.
    - Breitenwerkzeug ⇧W, Tiefe (+ Grat, − Rinne), Kantenliste und Ebenenschalter.
    - Ecken der Silhouetten sind Kanten.
  - **Back/Bottom** als Tab am Viewport-Titel, echt gespiegelt (`spiegeln2`).
  - **3D:** Mit Kanten oder Ecken baut das 3D den Kanten-Käfig, dazu Zebrastreifen.

- **Nachtrag 12.10. spätnachmittags — Spanten, schlüssige Kanten** (Plan `docs/plans/2026-10-12-spanten.md`, Ergebnis im Nachtrag von `docs/research/2026-10-12-kanten-ansichten.md`):
  - Florian: „Das mit den Kanten und Härten scheint mir noch nicht ganz schlüssig.“ Antwort und Regel: **Eine Kante ist eine Ecke in einem Shape** (Silhouette = quer, Spant = längs). Der Winkel kommt aus der Form, die Härte ist die Rundung. Freie Linien bleiben Sonderfall; Vorschlag: Knickwinkel statt Tiefe.
  - **Spanten** (`packages/shape/src/spanten.ts`, `src/spanten/SpantEbene.tsx`): Werkzeug S in Seite/Top, Spantlinien S1 … Sn und H ziehbar, Front = vordere, Back = hintere Spanten, Bearbeiten wie ein Profil, Seitenleiste `SpantBereich`.
  - Back bleibt (hintere Spanten, Linien auf Rücken und Schwanz); ein Spantenriss als eigene Ansicht wäre die Alternative.

- **Nachtrag 12.10. abends — Kopplung nur am entsprechenden Punkt:**
  - Florian: Zieht er bei der Kugel den oberen Front-Punkt hoch, erwartet er, dass in der Seite nur der oberste Punkt wandert und nicht das ganze Gitter skaliert.
  - Jetzt (`abgleichen`, Art `punkt`): Nur der äußerste Teil der Kurve wandert samt Griffen. Kontrollpunkte bis `KOPPEL_BAND` = 5 % darunter gehen anteilig mit, alles andere bleibt bitgenau stehen. Beim Schrumpfen wird Höheres auf das Ziel gedrückt.
  - `angleichen` (Laden, nachgezogene Bögen) verteilt weiter mit quadratischem Abfall (Art `verteilt`), sonst entstünden Beulen.
  - Bild `docs/progress/editor/kopplung-punkt.png`, Skript `scripts/kopplung-bild.mjs`.

- **Nachtrag 12.10. abends — Wirbelsäule und ein Netz** (Plan `docs/plans/2026-10-12-wirbelsaeule-ein-netz.md`, Einstieg für die große Sitzung):
  - Florians Punkte:
    - Hals nach oben mit Kopf darauf muss gehen.
    - Eine Ansicht formt unerwartet die andere, auch bei Spanten.
    - Schöne Formen und Kanten sind schwer.
    - Im Fressen-Tab muss das ganze Netz bearbeitbar sein.
    - Das Maul muss geschlossen mit dem Netz verbunden sein.
    - Sind die Techniken optimal kombiniert?
  - Antwort: Nein, noch nicht. Vorschlag: ein Bauweg (Wirbelsäulen-Käfig), die Ansichten als echte Umrisse mit örtlichen Änderungen, Maul im selben Netz, Fressen als Pose.
  - Versuch: `?versuch=wirbel&wesen=langhals|robbe|rex|tiger|kugel` (`src/versuch/wirbelVersuch.ts`); `&biegen=<Grad>&bei=<Anteil>&weich=<Anteil>` biegt die Wirbelsäule, `&pruefen=1` zeigt Durchdringungen.

- **Nachtrag 12.10. abends — Vergleich und Maul an der Umrisslinie:**
  - **Bauweise zum Vergleichen:** Tab „creation · wirbelsäule“ am 3D-Fenster (`ui.bauweise`, `ui.wirbelBiegung`), Code in `src/wirbel/`.
    - Gebaut wird schnell während Gesten und beim Ziehen der Biege-Regler (`useWirbelAnzeige.zieht`), genau beim Loslassen.
    - Maul und Kanten-Härte fehlen in dieser Bauweise noch.
  - **Maulanfänge = Knoten des Seitenumrisses:**
    - `setzeLippenImUmriss` beim Zeichnen und bei „getrennt“.
    - Ziehen am Anfang (Seite: x/y, Front: Höhe) bewegt den Umrissknoten über `gekoppeltBerechnen`; der Anfang folgt über `maulAnKontur`.
    - Mit getrennten Kiefern zeigt der Seitenumriss den Spalt (`umrissMitSpalt`, `[data-maulspalt]`).

- **Nachtrag 12.10. nachts — Wirbelsäule zeichnen, Maul auf der Wirbelsäule, Form im Fressen-Tab** (Plan `docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`):
  - **Wirbelsäule:** `dok.wirbelsaeule` (Linie3, z = 0). Bearbeiten in `src/wirbel/WirbelEbene.tsx`, glatte Linie durch die Punkte (`linieDurch`). Zeiger-Reihenfolge in der Seite: Wirbelsäule vor Spanten, Kanten und Profil.
  - **Pose-Form:**
    - `dok.posenProfile.fressen.seite`, gleiche Punktstruktur, sonst gilt sie nicht (`poseSeiteGespeichert`).
    - Alle Profil-Bearbeitungen gehen über `src/editing/aktiv.ts` (`aktivesProfil`, `setzeAktiv`, `uebernehmenAktiv`). Im Fressen-Tab landet die Seite auf der Pose-Form, ohne Kopplung an Front und Top.
  - **Maul auf der Wirbelsäule:** `maulBauen(dok, true)` baut `maulKaefigAufWirbel`. `strahlen()` (Maulfläche) nimmt in dieser Bauweise den Wirbelsäulen-Körper.

- **Nachtrag 12.10. spätnachts — Maulloch und verbundene Kiefer** (Florian: „Das Maul macht kein Loch in den Shape mehr, bei Fressen sind die Kiefer nicht mal mehr mit dem Shape verbunden“; Nachtrag im Plan `docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`):
  - Maulanfänge sind feste Umrissknoten, gefunden über Knotennummern (`maulAnfangIndizes`); die Pose-Form hat dieselben Nummern, die offenen Anfänge rasten darauf (`poseMitAnfaengen`).
  - Die Kinnseite bestimmt der Winkel zur Maulrichtung (`kinnRichtung`): gegen den Uhrzeigersinn Oberkiefer, im Uhrzeigersinn Kinn (Schnauze links).
  - `maulImUmrissSichern` (Laden, `setzeMaul`) baut fehlende Anfänge ein und tauscht vertauschte.

- **Nachtrag 12.10. spätnachts — Bilanz, Ende der Versuchsphase:**
  - Florian: „Alles bis jetzt waren nur Tests und Recherche!“ Mäuler und das echte 3D-Wesen passen noch nicht.
  - Shapes, Spanten, Kanten und Wirbelsäule müssen viel besser zusammenspielen und leichter zu bedienen sein.
  - Beine und körperweite Strukturen (Rückenschuppen, Fellsträhnen wie beim Retriever) sind ungeklärt.
  - Einstieg für die große Sitzung: `docs/plans/2026-10-13-grosse-sitzung-wesen-editor.md`. Behalten wird das Gerüst (Kurven, Navigation, Layout, Library, Dokument); die Bauwege in `packages/shape/src/versuch/` sind Wissen, kein fertiger Code.

- **Nachtrag 13.10. nachts — Wesen-Editor 2, Beweis 1, Tab „kern“** (`src/kern/kernBau.ts`, Kern in `packages/shape/src/{kaefig,subdivision,loeser,kern}`, Einstieg `@ee/shape/kern`): Käfig als Wahrheit, Seitenumriss als Griff, Ergebnis in `docs/research/2026-10-13-beweis1-kern.md`. Aufruf `?versuch=kern&wesen=kugel|rex|langhals|ueberhang`, Bilder `node scripts/kern-bilder.mjs` (Web-Modus, `EDITOR_URL`). Während Gesten `seiteZiehen` (≈ 3 ms), beim Loslassen `ableiten` (≈ 90–140 ms). Nachgearbeitet (Nachtrag in der Doku): Spitzen-Kappe, Ringe nach Krümmung, Breite nach der Projektionsregel (Top bei x, Front bei jeder Höhe), Querschnitte aus Front-Lappen bzw. Spanten mit Längsfalten an Ecken, Earle-Material im Tab (`&look=earle&palette=tiger|rex|blob|giraffe`, Bilder `kern-<wesen>-3d-earle.png`). **Beweis 2 (Maul):** Chips „Maul aus/vorn/unten/hals“, Regler „Öffnung“ (`ui.oeffnung`), „Käfig zeigen“ (Linien: Falten schwarz, Lippen orange, Tasche rot), URL `&maul=vorn&oeffnung=0.7&kaefig=1`; mit Maul kein Zug während Gesten (Umbau ≈ 150 ms), die Öffnung ist eine Pose (≈ 3 ms). Ergebnis `docs/research/2026-10-13-beweis2-maul.md`. **Beweis 3 (Beine):** Chips „Beine aus/verschmolzen/angesteckt“, Regler „Schwung“, URL `&beine=verschmolzen&schwung=35&zebra=1` (Zebra wird beim Start angewendet); mit Beinen hebt `kernBauen` den Körper auf die Füße. Ergebnis `docs/research/2026-10-14-beweis3-teil.md`. **Beweis 5 (Stile):** Chips „Stil fest/feuer/gas/fell“, URL `&stil=feuer`; Feuer/Gas als eigene Mesh-Spur mit `createFeuerMaterial`, Fell über das Earle-Material (Büschel erben die Deskriptoren ihres Fußpunkts, Ansatzschatten über den AO-Kanal); Klingen wehen über eine Uhr in `Szene3D` (`kernAnimieren`, `aktualisiereNetz` schreibt Lagen in die Puffer). Bilder und WebM: `STIL=1 node scripts/kern-bilder.mjs kugel`. Ergebnis `docs/research/2026-10-14-beweis5-feuer-gas-fell.md`. **Beweis 4 (Look):** Ausstattung je Prüfwesen in `kernBau.ts` (`ausstattung`: Tiger mit Kasten-Spanten, Maullinie, Augenlage, Gesichtsmaske, Lippenband, Nase/Scharte, Wangen, Ohren), Paletten in `three/wesenLook.ts` (`gesichtHell`, `augenRing`), Material mit Ruhelage-Attribut `eeRest` (Muster schwimmen nicht bei Posen), Zähne über `setzeZaehne`; URL `&kamera=az°,el°,dist,zx,zy,zz` stellt die Kamera für Bilder; `TIGER=1 node scripts/kern-bilder.mjs -` (Kopf zu/auf/Käfig, ganz; `-` = nur Varianten). Ergebnis `docs/research/2026-10-14-beweis4-look.md`. **Prüfwesen `drache`** (`?wesen=drache`, Lader in `schnitte/schnittVersuch.ts`): der Langhals mit doppelt dickem Hals (`halsVerbreitern`), für die Maul-Lage „hals“; der Tiger bekommt seine Maul-Optionen (Kiefer 30°, Schädel 26°, Band 1) aus der Ausstattung. **Zonen-Atlas:** `kernBau` rastert die `zonen` der Ausstattung (Polygone in einer Ansicht, Weichheit je Punkt; Tiger `tigerZonen`) über `kachelung`/`zonenRastern` in Kacheln je Käfigfläche; `Renderer3D.setzeWesen(…, atlas)` setzt `eeAtlas` und zwei Half-Float-Texturen (`atlasTextur`), `&atlas=0` zeigt die prozeduralen Zonen. Falle: Ein Attribut je Ecke muss auch für angehängte Dreiecke (Wangen, Ohren, Beine) gefüllt sein, sonst passt die Pufferlänge nicht und der Atlas bleibt aus.
- **Nachtrag 13.10. morgens — Schnitt-Loft (Versuch):**
  - Dritter 3D-Tab „schnitte“ (`apps/editor/src/schnitte/`, Kern `packages/shape/src/versuch/schnittLoft.ts`).
  - Je Stelle wird der echte Schnitt aus allen Intervallen von Seite und Top berechnet. Teile, Löcher und Kerben bleiben erhalten.
  - Seitenleiste: Regel „Hälften“ oder „gerade-ungerade“, Überblendung „Felder“ oder „Punkte“. Die Front zeigt den echten Schnitt des gewählten Spants gestrichelt.
  - Grenzen und Messwerte: `docs/research/2026-10-13-schnitte-ueberhaenge.md`.

## Arbeitsweise

- **Look-Beweis:** `node apps/editor/scripts/vergleich.mjs` (Web-Modus muss laufen) → `docs/progress/editor/vergleich-grundlayout.png` (Vorlage | Render). Render und Differenz liegen unter `apps/editor/test-results/vergleich/`.
- **E2E:** `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e` (echte GPU, eigener Port). Die Tests schreiben Bilder nach `docs/progress/editor/`.
- **Ports:** 5180 Web-Modus (`editor-web` in `.claude/launch.json`), 5181 Electron-Dev, 5190+ E2E.
- **Desktop-Rauchtest:** `EDITOR_SELBSTTEST=<png> EDITOR_BIBLIOTHEK=<ordner>`. Nie in Florians echte Bibliothek schreiben (`~/Documents/early earle Editor/Bibliothek`).
- Test-Zugriff: `window.__stores` (editor, ui, rahmen) und `window.__editor` (backend, vertices).

## Fallen (nicht wiederholen)

- **Kern:** Die Poisson-Dicke (`dickeRundBei`) ist schon die halbe Breite an dieser Stelle; nie noch mit sin θ multiplizieren (ergab Linsen statt Körper). Die Naht muss bitgenau bei z = 0 liegen (rechte Hälfte rechnen, linke spiegeln), sonst findet `nahtOrdnen` keine Naht. Die Nahtanteile monoton entlang der Schleife vergeben, nicht per Projektion (Bündelung → Lücken im Ausgleich). Die Schnittgrenzen eines Front-Lappens (Querschnitt liegender Abschnitte) auf die Enden der Front einrasten lassen (3 % der Abschnittshöhe): Front und Seite sind getrennt gezeichnet, sonst fällt eine Deckkante samt Ecken dem Zuschneiden zum Opfer (Kasten 18,9 px statt 0,7, keine Längsfalten). **Maul:** Die Maullinie in Wirbelsäulen-Koordinaten (f, v) führen, nie als 2D-Schnitt mit den Sprossen (am Hinterkopf fächern sie, der Schnitt klemmt auf v = 0, die untere Ringhälfte kollabiert). Der Nahtrundgang muss an einem Hautpunkt starten (die Spitze liegt auf der Lippe), sonst ist der Ausgleich tot. Die Rachenlinie nie hinter das Scharnier legen (die Tasche schwingt beim Öffnen durch). Ober- und Unterlippe geschlossen nicht deckungsgleich lassen (tangentialer Kontakt zählt jede Welle als Durchdringung): Rille. Kontrollpunkte sind keine Grenzlagen: Diagnosen auf den feinen Lagen rechnen.
- **vitest 5 zeigt `console.log` bestandener Tests nur mit `--reporter=verbose`** (bei Fehlern immer). Messwerte so lesen: `npx vitest run <datei> --reporter=verbose`.
- **macOS hat kein `timeout`-Kommando**; lange Läufe über das Werkzeug-Timeout begrenzen. `pnpm -r test` lässt Pakete parallel laufen; die Laufzeit-Tests der Versuche (`kanten`, `flaechenlinie`, `wesen`) reißen dann ihre Schranken (967 ms > 600 ms), einzeln laufen sie durch.

- **Vorschau-Fenster (Browser-Pane) hat keine Canvas-Größe**, solange es verdeckt ist: WebGPU meldet „swapchain texture of size 0“, das 3D bleibt leer. 3D deshalb per Playwright prüfen (`scripts/maul-bilder.mjs`, E2E mit `EE_GPU=1`).
- **zod verwirft unbekannte Felder** beim Laden: Neue Dokumentfelder zuerst ins `DokumentSchema`, dann der Rundreise-Test.
- **Maul-Körper baut ≈ 0,4 s:** nicht während einer Geste neu bauen, sondern beim Loslassen (`gesteStart`); der Regler „Öffnung“ rechnet nur die Zwischenstufe.
- **Catmull-Clark hier ohne Randregel:** Das Maul bleibt eine geschlossene Fläche (Naht plus Tasche), offene Ränder würden falsch geglättet.
- **2D-Ebenen bauen das Maul nie selbst:** `maulZuletzt(dok)` liefert nur den gemerkten Bau. Sonst baute jede Ansicht während einer Geste neu (≈ 0,4 s). Neu zeichnen über `useMaulInfo`.
- **Zahn-Prüfung dauert 75–185 ms:** Sie läuft nur ohne Geste (`gesteStart`), während einer Geste gilt `zahnMeldungenZuletzt()`.
- **Harte Kanten schattieren:** `zuDreiecken` mit 40° glättet einen 13°-Knick weg. Für den Kanten-Käfig gelten 10°.
- **Kanten-Käfig während Gesten mit 3 Anpass-Durchgängen** (≈ 60 ms), beim Loslassen mit 8. `eckKanten` (≈ 1 ms) ist gemerkt je `dok.profile`, `strahlen` (S0, ≈ 0,1–0,2 s) ebenso: Kanten erst beim Loslassen neu auf die Fläche legen (`endeGeste`).
- **Back/Bottom spiegeln über `spiegeln2` in `bild`, `lokal` und im Auswahlrechteck.** Ein Rechteck mit gespiegelten Ecken braucht `Math.min`/`Math.abs`, sonst wird die Breite negativ.
- **Zustand-Selektoren nie mit `?? []` oder `{...}`:** Ein neues Objekt je Aufruf gilt als neuer Stand, React rendert endlos („Maximum update depth exceeded“, Kantenliste 12.10.). Rohwert wählen, Standard außerhalb setzen.
- **Regler behalten den Fokus:** Der Tastaturfilter darf nur Texteingaben ausnehmen. Sonst wirkt ⌘Z nach dem Ziehen eines Reglers nicht (Fehler 12.10.). Pfeiltasten bleiben beim Regler.
- **Gemalte Flächen auf der Haut** (Augen-Versuch): Den Umlaufsinn nach der Hautnormalen ausrichten (das Material ist einseitig, Florians Umrisse laufen mal so, mal so). Linien wie das Lid als Strich bauen, nicht als Fläche zur Mitte.

- **Spanten linear überblenden:** Eine S-Kurve (smoothstep) zwischen den Spanten veränderte die Form beim Einfügen eines Spants. Nur linear ist ein neuer Spant exakt formneutral.
- **Gleiche Punktstruktur in Spanten und Front:** Einfügen/Löschen nur über `spantenPunktEinfuegen`/`spantenPunktLoeschen`; Front-Änderungen gleicht `spantenAngleichen` in `mitFormVerbunden` an. Die Stützstellen (`anteile`) kommen aus der rohen Front, sonst wandern Knoten zwischen den Stationen und Spant-Ecken werden keine durchgehende Kante.
- **Cache-Schlüssel mit `spanten` und `hauptspant`:** `kantenBauen`, `strahlen` (Maulfläche) und der Maul-Körper merken sich ihren Bau. Fehlen die Felder im Schlüssel, folgen 3D und Kantenlinien den Spanten nicht.
- **E2E-Klicks auf abgeleitete Eckkanten** treffen am Linienanfang den Profilknoten. Auf einen Punkt bei 30 % der Pfadlänge klicken (`getPointAtLength`).

- **Wirbelsäule aus der Leiter:** Die kürzeste Leiter zwischen Rücken- und Bauchlinie dreht sich an den Spitzen im Fächer um einen Punkt; winzige Ringe falten sich dort. Ringe deshalb senkrecht zur geglätteten Wirbelsäule (gerade Enden) und mit Abstand zu den Spitzen, Pole an den Spitzen.
- **Vor dem Wirbelsäulen-Bau `angleichen`:** Ragt das Top vor die Schnauzenspitze der Seite, entstehen flache Flossen. An den Spitzen außerdem die Breite mit gleichem Seitenverhältnis auslaufen lassen.
- **Laufzeit-Schranken in Tests großzügig wählen:** Die Testdateien laufen parallel; der Kanten-Käfig braucht allein 100–130 ms, unter Last gut 250 ms.

- **Maulanfang folgt dem Umrissknoten nur bei gleicher Knotenzahl.** `maulAnKontur` erkennt den Knoten an der Lage (0,5 px). Ändert sich die Knotenzahl (Punkt eingefügt oder gelöscht), fällt er auf die Projektion auf die Kontur zurück; beim nächsten Ziehen am Anfang wird der Knoten neu eingebaut.
- **Spalt = kürzester Weg zwischen den Anfängen** (`umrissMitSpalt` mit Knotennummern). Nie über die Lage allein suchen: In der Pose-Form und bei deckungsgleichen Anfängen (Kiefer gleich mit gespeicherter Pose) trifft `knotenBei` sonst den falschen oder gar keinen Knoten, der Umriss läuft durchs Maul.
- **Kinnseite nie über die Höhe der Nachbarn:** An der Kopfunterseite liegen beide gleich hoch; offen hing dann die Schnauze am Kinn (12.10. spätnachts). `kinnRichtung` bzw. `paarOrdnen` benutzen.
- **Griffe an Maulanfängen je Seite abbilden** (`ableiten` in `fressenForm.ts`): Ein Drehwinkel, der über den Spalt hinweg gemessen wird, dreht den Kinngriff nach unten (Delle unterm Kinn).

- **Pose-Form ableiten braucht den Maul-Bau:** `poseSeite` bildet Knoten über das 3D ab (`maulZuletzt`). Solange das Maul nicht gebaut ist, gilt der geschlossene Umriss. Der Selektor in `View2D` gibt gemerkte Objekte zurück (`ableitung`), sonst rendert React endlos.
- **Kiefer gleich in der Pose:** Offen trennen sich die Lippen, deshalb bekommt die Pose-Form einen zweiten Maulanfang. Beim ersten Speichern kommt derselbe Knoten an derselben Stelle (t = 0 bzw. 1) in den geschlossenen Umriss.
- **Gestreckter Raum:** Rahmen aus den Sprossen (Fußpunkt der Wirbelsäule, Richtung der Sprosse); vor der ersten und hinter der letzten Station parallele Sprossen zur Spitze. Der Maul-Käfig darf dort nur `rk.ring`, `rk.seite`, `xMin` und `xMax` sehen.
- **Maul-Käfig erwartet den Maulanfang vorn** (Kappenmitte): Beginnt das Maul weit dahinter, füllt die Kappe den ganzen Kopf davor.

- **macOS unterscheidet keine Groß-/Kleinschreibung:** `View2D.tsx` neben `view2d.ts` bricht tsc (TS1149). Deshalb heißt die Mathe-Datei `ansicht2d.ts`.
- **CSS-Reihenfolge:** `.glas` darf kein `position` setzen. Es überschrieb `position: absolute/fixed` von Aufklappmenü und Kontextmenü, die Menüleiste verrutschte.
- **Ein Verlauf für alle Viewports** über `background-attachment: fixed` (Position/Größe = Bühne). Kein `transform`, `filter` oder `will-change` auf Vorfahren der Viewports, sonst bricht er. Animiert wird deshalb über left/top/width/height.
- **Unsichtbarer Tab = keine Animation:** rAF läuft im verdeckten Vorschau-Tab nicht. Animationen per Playwright prüfen, nicht im versteckten Browser-Pane.
- **three r186 `setViewport`/`setScissor`:** Der Ursprung ist oben links, in beiden Backends (das WebGL-Backend dreht selbst). Vor dem Scissor-Render voll löschen (`setScissorTest(false); clear()`), dann mit `autoClear = false` rendern.
- **Schattenkarte:** `material.shadowSide = FrontSide`. Mit den Rückseiten (Standard) blieb am Bodenkontakt ein heller Fleck. Karte 4096, Frustum ±1,8.
- **Matcap** ist eine quadratische Funktion der Blicknormalen, an die Kugel der Vorlage angepasst (`three/matcap.ts`). Kein Blender-Bild verwenden (Lizenz).
- **Sonne** (nur Schatten): von hinten (+X), 42° hoch, aus dem Schattenwurf der Vorlage zurückgerechnet. **Kamera**: Azimut −45°, Höhe 15°, Abstand 2,15, Ziel y 0,18, FOV 30°, an die Kachelecken der Vorlage angepasst.
- **Electron:** Preload muss CJS sein (Fenster mit `sandbox`), Hauptprozess ESM. electron-vite kann kein Vite 8, deshalb vite-plugin-electron. pnpm braucht `allowBuilds: electron: true`. CI setzt `ELECTRON_SKIP_BINARY_DOWNLOAD=1`. `.app` mit `identity: "-"` und `hardenedRuntime: false`, sonst Startprobleme bei Ad-hoc-Signatur.
- **macOS:** `contextmenu` kommt beim Drücken der rechten Taste, nicht beim Loslassen. Im 3D deshalb `contextmenu` immer verhindern und das Menü beim Loslassen ohne Bewegung öffnen.
- Irish Grover (Apache-2.0, `@fontsource/irish-grover`) hat Umlaute, aber kein ▼. Das Dreieck ist SVG.
