# Studio: Bauplan der Fassung 1

Stand 20.11.2026. Bauplan zum verbindlichen [Produktkonzept](2026-11-20-studio-konzept.md). Datenmodell und Schnittstellen folgen
[Entwurf B „Eine Laufzeit“](2026-11-20-studio/entwurf-b-laufzeit.md), Reihenfolge und Aufwand dem Abschnitt 4.7 des
[Gesamtberichts](../research/2026-11-20-editor-recherche.md): das Vergleichsbild „Rahmen + Rest“ (S3) in M1, vor dem Gerüst der Werkbank
(S4). Ausgangspunkt im Code ist der Prototyp in `apps/editor/src/ozzy-figur/` mit seiner [Übergabe](../look/ozzy-figur/UEBERGABE.md).
Eingearbeitet ist das [Entscheidungsblatt zur Kritik](2026-11-20-studio/entscheidungen-zur-kritik.md) mit den Festlegungen F1 bis F7;
vorläufige Entscheidungen (Teil A), Proben für Florian, Nicole, iPhone und iPad (Teil B) und Offenes für den großen Feinschliff (Teil C)
stehen in der Liste [Studio: Was bleibt](2026-11-20-studio-was-bleibt.md).

**Für wen.** Der Plan ist für Bau-Workflows mit mehreren Agenten geschrieben. Jedes Arbeitspaket nennt die Dateien, die es anlegt oder
ändert, was es braucht (Zeile „braucht“), welche Tests es mitbringt und wann es fertig ist. Pakete derselben Welle ändern nie dieselbe
Datei und hängen nicht voneinander ab. Verträge (Typen und Schnittstellen) legt in jeder Etappe zuerst der Vertragsschritt der
Integration fest.

**Bereiche.** Die zwölf Bereiche tragen dieselben Nummern wie im Konzept: 1 Zeitmodell, 2 Formen und Morph, 3 Knochen und Gewichte,
4 Autorig, 5 Posen und Übergänge, 6 Physik, 7 Effekte und Rendern, 8 Spiellogik ohne Code, 9 Bedienung, 10 Technik, 11 Spielkonzept
für Ozzy, 12 Umsetzung. Im Text heißen sie „Bereich 3“ und so weiter.

**Ehrlich.** Für Studio ist noch nichts gebaut oder gemessen, auf dem iPhone gar nichts. Aufwände sind eigene Schätzungen.
„Bestanden“ sagt nur Florian. Der Bau wartet auf kein Urteil (F1): Was Florian entscheidet oder prüft, sammelt die Liste.

**Inhalt:** 1 Umfang der Fassung 1 · 2 Architektur · 3 Datenmodell · 4 Schnittstellen · 5 Etappen · 6 Ozzy in Studio ·
7 Teststrategie · 8 Tempo-Budget und Messseite · 9 Risiken, Rückfälle, Abbruchregeln · 10 Was Florian wann sieht · Nachtrag nach M0

---

## 1 Umfang der Fassung 1

**Fertig heißt:** Die Demo „Gassirunde“ (Spielwiese, Morgen, Mittag, Abend) ist vollständig mit Studio gebaut, und Florian spielt sie
auf dem iPhone 16 (Probe von M11). Jede Funktion, die die Demo braucht, ist im Editor von Hand bedienbar, am Mac und am iPad mit Stift.
Code sind nur Bausteinarten, Chiparten, Effektarten, Arten von Zusatzbewegungen und Vorlagen des Autorigs. Was der Demo fehlt, ist eine
Lücke im Editor, kein Spielcode (Konzept, Grundgesetz 10). Eine neue Art ist eine eigene Datei, ihr Schema und eine Zeile im Register;
`apps/studio/test/erweiterung.test.ts` prüft das je Familie, sobald sie existiert (Befund 28).

| Bereich | in Fassung 1 | später |
|---|---|---|
| 1 Zeitmodell | Leiste für jede Achse (Ansicht, Gelenk, frei, Physik, Spiel, Phase, Übergang, Strecke, Mitschnitt); Felder mit zwei Achsen bis 3 × 3; Taktleiste; Regie-Übergang mit Spuren; Mitschnitt der letzten 20 s mit Werteverlauf; Aufnahme aus dem Mitschnitt und am Anfasser; Spulen über Schlüsselstände | Mehrspur-Zeitleiste; Blick voraus (erst, wenn die Messseite Luft zeigt) |
| 2 Formen und Morph | Flächen und Linien mit Breitenprofil; SVG-Import mit Paarung und Assistent; Mischarten „Rahmen + Rest“, „je Koordinate“, „linear“; Kreisregler periodisch; Spiegelregel; Spitzenführung; Zusatzformen im mitlaufenden Rahmen; P in allen Zuständen; Fang; Ruhen; Falten mit drei Wächtern; Wechsel; Ruhe-Wächter; Übernahme der Kopfdrehung | Mischart „biegen“ (ARAP); Werkzeug „Biegen“; Kurven-Ausgleich nach Liu; Formen mit Löchern |
| 3 Knochen und Gewichte | starr, Biegeachse (zugleich IK), Gewichte mit Drehzentren und linearem Mischen als Schalter, Gewichte je Anker und Griff auch an Biegeachsen; Anheftung; Korrekturformen an Gelenkwinkeln; Kreuzschlüssel; Griffe erben, Griffsatz je Griffpaar, Glätte-Schutz; Anfasser; Pinsel W; Rückrechnung | „Pose zeichnen, Studio zerlegt“; Bounded Biharmonic Weights |
| 4 Autorig | Teile-Graph, Vorlagen „Vierbeiner“ und „Allgemein“, Achse je Teil, Rollen, Gewichte über Achse und Wärme, Nebenprodukte (Hüllen, Masse, Federketten, Füße, Paare, Anfasser), Probewackeln, Fragezeichen, Gelenkringe, Pinnen; der Prüfer meldet Gelenke, die nach einer Formänderung nicht mehr passen | Vorlagen „Zweibeiner“ und „Vogel“ |
| 5 Posen und Übergänge | vier Schichten; Posen-Reihe nach Gruppen; Posenkarte „Ausprobieren“; Ausgleich je Regler; Standardübergang mit Dauer, Federung und Nachlauf je Teil; gestalteter Übergang mit Zwischenposen, Abschnitten (auch „bis Ereignis“), Zusatzbewegungen, Balken „steht“, Spannung, Marken, Unterbrechen, Umkehren, Varianten; Tafel mit zwei Filtern; „über X“; Zyklen und Gangfeld; Kehrtwende über die Front (A4) | Posenplan als freie Fläche |
| 6 Physik | Box2D-Welt hinter `WeltAdapter`; XPBD-Schicht der Figur; Rad und Finger; Vierbeiner (Antrieb, Stehzone, Kennlinie, Schrittplaner, Sprung, Stolpern, Sturz, Aufstehen je Lage); Chips Schwingen, Kette, Stauchen, Ruhig halten, fest, lose, Gelenk, Wasser, Teilchen, Gelee; drei Charakter-Regler; Prüfstand mit Röntgen; Lauf-Dateien und Merker | Rückwurf (als Befehl gebaut, an nur auf sein Wort, A20); zweite Figur mit eigenem Gleichgewicht; Rapier nur als Rückfall |
| 7 Effekte und Rendern | Renderer Stufe 1 mit Zeichenmodell als Daten; Feldsatz je bewegter Figur; gebackene Dinge; analytische Kreise; alle Effekte der Demo (Konzept 11.7); auf Ozzys Körper nur die erlaubten (`aufGezeichnet`, A7), Schatten auf Boden und Welt (auf ihn nur, wenn er sie selbst anschaltet); Kostenampel „iPhone“; Klang-Chips; Export als Bildfolge und Sprite-Sheet | Kachel-Durchgang; WebGPU; Vektor-Export mit gebackener Kontur; Bloom, Weichzeichner |
| 8 Spiellogik ohne Code | Bausteinarten der Demo; Drähte mit Kennlinie; Regeln „Sobald“, „Solange“, „Laune“; fünf Bänder und Kanäle; Geltung je Ding-Art oder je Ding; Postfach; Zufall mit Strömen; Aufgaben mit Beweis-Läufen; Rückblick und Aufgaben als Bausteine, Zettel, Rückblick und Tagebuch als Posen des Rahmens; Text als Figur (A11); „Warum?“ und „Warum nicht?“; Leuchten; Gedankenblase; „hier anhalten“; Prüfer | Skripte, Variablen, freier Graph |
| 9 Bedienung | vier Verben ohne Ausnahme (4.8); aktive Stelle mit vier Signalen; Geltungs-Chip; Werkzeuge V, A, P, ⇧C, L, W; Anfasser; vier Linsen; Befehlsregister mit ⌘K und ?; die ganze Tabelle „Ding × Geste“ (Konzept 9.5); Mac; iPad als Safari-Web-App mit Stift; iPhone quer und hochkant; Stellen-Wahl beim Anhalten | eigene iPad-App; Pencil-Gesten über ein Plugin |
| 10 Technik | neun Pakete, zwei Apps, zwei Werkzeuge; Store mit Datensatz-Diffs, Herkunfts- und Schutzregel; Format v1 mit Migrationen; Ablage (`@ee/studio-ablage`) mit Revision, Sicherungsring, Fassungen, Sitzungsschlüssel, Journal und Live-Meldung; zwei Geräte zugleich; Live-Verbindung zum Spiel; Takt 60 Hz mit eigenen Winkelfunktionen; Bauplan inkrementell; Messseite | CRDT, Cloud, binäres Spielformat, TypeScript 7, Worker für Laufzeit und Renderer; lebende Studio-Figuren im Hauptspiel (A24) |
| 11 Spielkonzept | Gassirunde mit Spielwiese und drei Runden; alle Listen aus Konzept 11.7 (rund 35 Posen, 25 Übergänge, 11 Zyklen, 35 Regeln, 9 Aufgaben); Rahmen, Rückblick, Tagebuch; Ton mit Musik; App-Hülle mit Haptik | Park und Winter als reiner Inhalt; Geist des besten Laufs; Rückwurf |
| 12 Umsetzung | Etappen M0 bis M11 mit Proben (Abschnitt 5) | – |

**Bewusst nicht in Fassung 1** (Konzept 13): Mehrspur-Zeitleiste, freier Zustandsgraph, Knoteneditor, zwei globale Modi (nur als
Gegenprobe), schwebende Panels, Blick voraus ohne Luft auf der Messseite, Rückwurf und Andenken-Bonk, der Weg des Körpers von ψ 90°
bis 180° (seine Rückansicht ist gezeichnet; gewendet wird über die Front, A4), Maul, Gelee an Ozzy, Effekte auf Ozzys Körper außer den
erlaubten, Export nach Spine oder Rive, Motion Matching. Der Grundweg ist Web (Konzept 10.5, A23); Studio-Figuren kommen ins Hauptspiel
zuerst als Bildfolgen (M11.3, A24).

---

## 2 Architektur

### 2.1 Pakete und Apps

| Paket | Ordner | Inhalt | darf importieren | DOM |
|---|---|---|---|---|
| `@ee/studio-rechnen` | `packages/studio-rechnen` | eigene Winkel- und Exponentialfunktionen (Port der fdlibm), PCHIP, Bézier-Hilfen, Abstand an Kurvenpunkten, Zufall, Prüfsumme, SHA-256, Zahlen schreiben (ungerundet, 3.5) | nichts | nein |
| `@ee/studio-format` | `packages/studio-format` | Typen und Schemas des Formats v1, Kennungen, Schreiber, Laden, Migrationen, fremde Quellen, Schemas der Arten, SVG-Import, Glyphentabelle, `Entwurf` | rechnen, zod, fractional-indexing | nein |
| `@ee/studio-store` | `packages/studio-store` | Datensätze, Transaktionen, Diffs, Verlauf, Herkunfts- und Schutzregel, Zusammenführen; Zufall und Prüfung bekommt er übergeben | format | nein |
| `@ee/studio-ablage` | `packages/studio-ablage` | Dateien lesen und schreiben mit Revision und `If-Match`, atomar; Sicherungsring; Beobachter (Server-Sent Events); Sitzungsschlüssel und `STUDIO_FLORIAN`; Weitergabe von Live-Diffs und Merkern; Vite-Plugin für beide Apps; kennt keine Formate, Haken setzt der Zusammenbau | rechnen, Node, `vite` (nur `import type` für das Plugin) | nein (Node) |
| `@ee/studio-laufzeit` | `packages/studio-laufzeit` | Verträge, Bauplan, Regler, Form, Knochen, Posen, Figurphysik, Bausteine, Logik, Takt; `editor/` mit Rückrechnung, Wächtern, Handgriffen | rechnen, format | nein |
| `@ee/studio-welt` | `packages/studio-welt` | Box2D 3.2 über `box2d3-wasm/compat` hinter `WeltAdapter` | laufzeit und format (nur `import type`), rechnen, box2d3-wasm | nein |
| `@ee/studio-bild` | `packages/studio-bild` | WebGL2-Renderer mit Abstandsfeldern, Zeichenmodell, Effekte, Kostenampel | laufzeit und format (nur `import type`) | ja |
| `@ee/studio-ton` | `packages/studio-ton` | Klangplaner ohne DOM, Ausgabe über Web Audio, Freigabe, Wachhund, Musik | laufzeit und format (nur `import type`) | nur `ausgabe.ts`, `freigabe.ts` (erzwungen ab M7.0; bis dahin hat das Paket keine Quellen und DOM in der ganzen `tsconfig.json`) |
| `@ee/studio-autorig` | `packages/studio-autorig` | Autorig als reine Funktion | format, rechnen, earcut | nein |
| `@ee/studio` | `apps/studio` | Editor, Messseite, Prüfseite, Seite P1, Zusammensetzung der Server-Erweiterungen beider Apps | alle Pakete, react, react-dom, idb, `@zag-js/*`, opentype.js | ja |
| `@ee/ozzy-spiel` | `apps/ozzy-spiel` | die Demo: Laden, Vollbild, Eingabe, Freigabe des Tons, Hülle | format (nur `laden` und Typen wie `Dokument`, `Diff`), laufzeit (ohne `editor/`), welt, bild, ton; in `vite.config.ts` nur `spielPlugins` aus `apps/studio/server/plugins.ts` (läuft im Server, nie im Code des Spiels; Befund 2) | ja |
| `@ee/studio-uebernahme` | `tools/studio-uebernahme` | Übernahme der Kopfdrehung, der Haltungen und Abläufe als Daten; Paritätstest; Konfiguration des Vergleichsservers 5294 | format, store, ablage, laufzeit, rechnen, Node (läuft mit `tsx` in Node); **als einziges** relativ `apps/editor/src/ozzy-figur/`; `vite` nur in `vergleich.vite.config.ts` | nein (Node); `lib` mit DOM nur für die Typen des Prototyps (`FigurRaster`, M1.8) |
| `@ee/studio-inhalt` | `tools/studio-inhalt` | Skripte, die den Inhalt der Demo über Handgriffe anlegen; synthetische Klänge; Glyphen aus Lobster; Probe-Projekte | format, store, ablage, laufzeit, rechnen, opentype.js, Node (läuft mit `tsx` in Node) | nein (Node) |

**Warum getrennte Pakete statt eines Pakets mit Unterordnern.** (1) Die Grenze „ohne DOM“ steht in der `lib` jeder `tsconfig.json`; ein
einziges Paket kann je Ordner keine eigene `lib` haben. (2) pnpm lässt ein Paket nur importieren, was in seiner `package.json` steht;
eine verbotene Abhängigkeit ist damit ein Fehler beim Typprüfen. (3) Parallele Agenten besitzen ganze Ordner. (4) Das Spiel bindet nur
vier Pakete ein. (5) Tests laufen je Paket klein (Arbeitsregel 10). Der Preis sind rund vier kleine Konfigurationsdateien je Paket; M0
legt sie einmal an.

**Paketform.** Jedes Paket: `"type": "module"`, `"exports": { "./*": "./src/*.ts" }`, keine Sammeldatei `index.ts`. Importiert wird je
Modul: `import { koordinatenMischen } from '@ee/studio-laufzeit/form/koordinaten'`. So gibt es keine gemeinsame Datei, in die jedes
Paket eine Zeile schreiben müsste. Skripte je Paket: `typecheck` (`node ../../scripts/studio-typen.mjs`, in jedem Studio-Paket, auch
Ablage, Apps und Werkzeugen; unten), `test` (`vitest run`). In
`apps/studio` und `apps/ozzy-spiel` begrenzt `vitest.config.ts` auf `include: ['src/**/*.test.ts', 'test/**/*.test.ts']` (wie
`apps/editor`), damit die Playwright-Specs in `e2e/` nie in vitest laufen, weder im Paket noch im Wurzellauf. Die
`tsconfig.json` erweitert `tsconfig.base.json` (die Basis selbst ändert niemand, 2.5); ohne DOM mit `"lib": ["ES2022"], "types": []` wie
`packages/shape`, `studio-ablage` und beide Werkzeuge mit `"types": ["node"]`, beide Apps mit `"types": ["vite/client", "node"]`. Anders
als `packages/shape` ohne `rootDir`: tsc prüft über `exports` die Quellen importierter Studio-Pakete mit, und `rootDir` lehnte sie ab
(TS6059, am 20.11. nachgeprüft). Jede `tsconfig.json` nimmt die eigene `vitest.config.ts` in `include` auf, damit Pakete, deren erste
Quelle erst später kommt
(`studio-ablage` M1.6, `studio-welt` M2.1, `studio-ton` M7.3, `studio-autorig` M9.1), nicht an „No inputs were found“ (TS18003)
scheitern; jede `vitest.config.ts` setzt `passWithNoTests: true` wie `apps/editor`, dazu `pool: 'forks'` und
`execArgv: ['--import=<file-URL von apps/studio/scripts/proben/schutz.mjs>']` (aus `new URL(…, import.meta.url).href`): Jeder
Testprozess läuft mit dem Schreibhaken, gleich wie vitest gestartet wird (im Paket, aus der Wurzel, in `studio:pruefen`; 6.3).

**Quellen ohne Node.** Über die Typen von vitest (in `vitest.config.ts` und den Tests) kommen die Node-Typen in jedes Programm, auch
mit `"types": []`. Darum hat jedes Paket ohne Node (rechnen, format, store, laufzeit, welt, bild, ton, autorig) neben der
`tsconfig.json` (alles: Quellen, Tests, Konfiguration) eine `tsconfig.quellen.json`: `"extends": "./tsconfig.json"`,
`"include": ["src"]`, `"exclude": ["src/**/*.test.ts", "src/**/*.testhilfe.ts"]`, also die Quellen ohne Node (bild und ton mit DOM).
`scripts/studio-typen.mjs` prüft im Ordner des Pakets zuerst `tsconfig.json` und, wenn sie grün ist, die `tsconfig.quellen.json`,
sofern es sie gibt und `src/` Quellen außer Tests hat (sonst übersprungen, kein TS18003). Hilfen nur für Tests, die Node brauchen,
heißen `*.testhilfe.ts`.

**Abhängigkeiten für Werkzeuge und Tests.** `@types/node` ^24.0.0 steht in den devDependencies von `studio-ablage`, beider Apps und
beider Werkzeuge; `studio-store` hat `@ee/studio-rechnen` als devDependency (der Strom mit Saat in den Store-Tests von M1.5; `src/`
des Stores nimmt rechnen nicht). `tools/studio-uebernahme/tsconfig.json` hat `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, weil M1.8 den
`FigurRaster` des Prototyps importiert, dessen Typen DOM brauchen (`renderer.ts`); das Werkzeug läuft trotzdem in Node. Dass DOM in
`studio-ton` nur in `ausgabe.ts` und `freigabe.ts` vorkommt, erzwingt ab M7.0 eine eigene tsconfig ohne DOM über die übrigen Dateien.

### 2.2 Ordner und Dateien

Jede Datei, die eine Etappe anlegt, steht hier. Tests liegen neben ihrer Datei (`*.test.ts`).

```text
packages/studio-rechnen/src/   winkel.ts exp.ts pchip.ts bezier.ts zufall.ts pruefsumme.ts sha256.ts zahl.ts selbsttest.ts fdlibm/*.ts
packages/studio-rechnen/       pruefdaten/winkel-eingaben.json  LIZENZEN.md
packages/studio-format/src/    typen/{grund,projekt,figur,form,knochen,posen,physik,bild,welt,logik,ton,lauf,text,dokument,
                                      entwurf}.ts
                               schema/{grund,projekt,figur,form,knochen,posen,physik,bild,welt,logik,ton,lauf,text,reihenfolge}.ts
                               arten/{register,bausteine,chips,effekte,zusatz}.ts
                               kennung.ts versionen.ts anker.ts pruefen.ts schreiben.ts laden.ts dateien.ts quellen.ts schrift.ts
                               migrationen/{register,kern-0-1}.ts  svg/{lesen,paaren,importieren}.ts
                               schema.test.ts (M0: Typen und Schemas in beide Richtungen)  pruefdaten.test.ts (M0: testfigur.json
                                 gegen die Schemas, 3.5 und den Steckbrief aus 5.3; M1.2 ergänzt den Rundweg)
packages/studio-format/        pruefdaten/{testfigur.json,ozzy-rollen.json,prototyp-schluessel-2026-11-20.json}
packages/studio-{rechnen,format,store,laufzeit,welt,bild,ton,autorig}/
                               tsconfig.quellen.json (Quellen ohne Tests, ohne Node; 2.1)
packages/studio-store/src/     typen.ts store.ts diff.ts verlauf.ts schutz.ts zusammenfuehren.ts
packages/studio-ablage/src/    ablage.ts revision.ts sicherung.ts beobachter.ts sitzung.ts live.ts merker.ts plugin.ts
packages/studio-laufzeit/src/  vertrag/{bauplan,lauf,bildstand,bilddaten,zeichenmodell,welt,baustein,chip,zusatz,eingabe,ereignis,
                                        warum,editor,weltAttrappe}.ts
                               vertrag/{bilddaten,feldbreiten,welt,weltAttrappe}.test.ts (M0: BildDaten anlegen und leeren;
                                 Feldbreiten als typeof-Kopie; VIELECK_PUNKTE gleich der Grenze im Schema; die Attrappe)
                               fassade.ts
                               bauplan/{bauen,ordnung,regler,form,knochen,abflachen,posen,physik,logik,zeichen}.ts
                                 (ordnung.ts samt ankerBereiche und istGeschlossen, 4.3)
                               regler/{hand,durchlauf,ausgleich,mischen}.ts
                               form/{anker,koordinaten,rahmenRest,linear,ruhen,listen,ansicht,zusatz,spiegel,spitzen,wechsel,fluechtig,
                                     abflachen}.ts
                               knochen/{baum,anheftung,biegeachse,starr,gewichte,drehzentren,griffe,glaetteSchutz,aufhaengen,
                                        korrektur}.ts
                               posen/{schichten,standard,gestaltet,abschnitte,zusatzarten,steht,marken,tafel,weg,zyklus,regie}.ts
                               posen/zusatz/{huepfer,plumps,seufzer,wedeln}.ts
                               physik/{xpbd,feder,schwingen,kette,stauchen,ruhigHalten,gelee,wasser,teilchen,fuehler,chips}.ts
                               bausteine/{register,rad,ding,zone,zaehler,uhr,kamera,musik,schlaefer,flieger,rueckblick,
                                          aufgaben}.ts
                               bausteine/vierbeiner/{vierbeiner,antrieb,planer,gangfeld,sprung,stolpern,sturz,aufstehen,
                                                     kehrtwende,kopplung,wurf,zustaende}.ts
                               logik/{postfach,regeln,baender,kanaele,launen,draehte,bedingungen,aktionen,gedaechtnis,
                                      warum,pruefer}.ts
                               takt/{takt,eingabe,weltschritt,archiv,spulen,laufdatei,mitschnitt}.ts
                               editor/{rueckrechnen,zielregel,fang,ankerSetzen,ankerLoeschen,waechter,ruhewaechter,
                                       faltenVorschlag,geltung,aufnehmen,beweise}.ts
                               editor/handgriffe/{logik,form,projekt,posen,knochen,welt,physik,text}.ts
packages/studio-welt/src/      laden.ts adapter.ts koerper.ts huellen.ts gelenke.ts finger.ts federbein.ts kraftpaar.ts
                               abfragen.ts lesen.ts ereignisse.ts snapshot.ts ragdoll.ts vertrag.test.ts
packages/studio-bild/src/      zeichner.ts (Typen seit M0) kontext.ts uebersetzen.ts felder.ts rahmen.ts feldsaetze.ts gebacken.ts
                               welt.ts kreise.ts ampel.ts shader/{strecken,felder,bild}.ts
                               effekte/{register,verschmelzen,dicke,kanten,verdecken,weissNachgeben,kontaktschatten,
                                        bodenschatten,beinschattierung,dithering,linien,staub,spritzer,wasser,regen,
                                        kameraNass,himmel,schmierbild,aufprallbild,zittern,bewegungslinien,
                                        verformung,schein,aufloesen}.ts
                               effekte/register.test.ts (M0: Eintragen, doppelt, Beitrag deterministisch)
packages/studio-ton/src/       planer.ts stimmen.ts synth.ts ausgabe.ts freigabe.ts wachhund.ts musik.ts
packages/studio-autorig/src/   autorig.ts graph.ts achse.ts rollen.ts ungarisch.ts gewichte.ts waerme.ts nebenprodukte.ts
                               probewackeln.ts vorlagen/{vierbeiner,allgemein}.ts
apps/studio/                   index.html messen.html pruefen.html p1.html vite.config.ts playwright.config.ts manifest.webmanifest
apps/studio/server/            plugins.ts messung.ts
apps/studio/src/               main.ts pruefhaken.ts pruefseite.ts betrachter.ts
                               kern/{sitzung,signal,stelle,auswahl,linse,schleife}.ts
                               buehne/{buehne,ansicht,treffer,ueberlagerung,zwiebelhaut,bahnen,rand,status,geltungsChip,
                                       anfasser,fuellringe}.ts
                               werkzeuge/{werkzeug,verschieben,direkt,stift,umwandeln,lasso,gewichte,gelenkringe}.ts
                               leiste/{leiste,zeile,tropfen,schluesselpunkt,feld,taktleiste,strecke,mitschnitt,aufnahme}.ts
                               posen/{posenReihe,posenkarte,bruecke,tafel}.ts
                               eigenschaften/{Eigenschaften,Wert,Chips,Uebergang,Feder,Regel,Baender,Pruefer,Warum}.tsx
                               pruefstand/{pruefstand,schubsen,roentgen,knoepfe}.ts
                               spiel/{spielen,stellenWahl,drahtZiehen,kennlinie,gedankenblase,leuchten,aufgaben}.ts
                               autorig/{autorig.worker,knopf,fragezeichen}.ts
                               befehle/{register,tasten,suche,hilfe,alle,form,leiste,knochen,posen,physik,welt,logik,spiel,
                                        datei,text}.ts
                               speichern/{verbindung,speichern,journal,live}.ts
                               text/schriftLesen.ts  (opentype.js: eine Schrift auf die Bibliothek)
                               look/{liquid-drop.css,schrift}.ts  (schrift.ts lädt Lobster aus assets/fonts/lobster)
                               messen/{messen,ampel,statistik,ergebnis,szenen}.ts  messen/bloecke/{b0,b1,b2,b3,b4,b5,b6,b7,b8,b9}.ts
                               p1/{p1,ozzyKoerper,hinsetzen,tapsen,anzeige}.ts  export/bildfolge.ts
apps/studio/e2e/               *.spec.ts  bild/*.spec.ts (Bildtests der Bildpakete)  seiten/<paket>.html (Prüfseiten der Pakete)
                               seiten.spec.ts (M0: die vier Seiten, Lobster, COOP und COEP nur auf der Messseite)
                               bilder/ (freigegebene Ausschnitte, nur Mac)
apps/studio/scripts/proben/    m0-vertrag.mjs (Probe M0 a) m1-kopfdrehung.mjs m1-rahmen-rest.mjs m1-front-periodisch.mjs m2-p1.mjs
                               m2-messen.mjs m3-werkbank.mjs m4-ablaeufe.mjs m4-werkbank.mjs m5-spielwiese.mjs m6-iphone.mjs
                               m6-effekte.mjs m7-morgen.mjs m8-pannen.mjs m9-mittag.mjs m9-bezugsrahmen.mjs m9-bohne.mjs
                               m10-abend.mjs m11-tag.mjs schutz.mjs
apps/studio/test/              grenzen.test.ts handgriffe.test.ts erweiterung.test.ts beweise.test.ts
apps/ozzy-spiel/               index.html vite.config.ts playwright.config.ts capacitor.config.ts ios/
                               src/{main,laden,eingabe,huelle,live}.ts
                               test/keinSpielcode.test.ts  e2e/seite.spec.ts (M0: Titel in Lobster, Fläche im Vollbild)
tools/studio-uebernahme/src/   uebernahme.ts kennungen.ts kopf.ts koerper.ts haltungen.ts ablaeufe.ts renderregeln.ts
                               prototyp-werte.ts paritaet.test.ts haltungen.test.ts prototyp-werte.test.ts
tools/studio-uebernahme/       vergleich.vite.config.ts (Vergleichsserver 5294: Wurzel apps/editor, eigener Zwischenspeicher; 6.3)
tools/studio-inhalt/src/       inhalt.ts probeprojekte.ts huegel.ts spielwiese.ts morgen.ts pannen.ts katze.ts mittag.ts abend.ts
                               tagebuch.ts klaenge.ts glyphen.ts musik.ts
                               vorlagen/{katze,vogel,fisch}.svg
content/studio/                .gitignore (enthält .sicherung/)  .sicherung/<projekt>/<pfad>/<zeit>-<revision>.json (Ring, nicht im Git)
                               .sicherung/<projekt>/fassungen/<zeit>-<kennung>.json (verdrängte Fassungen, 4.9)
                               .sicherung/fremd/ (Kopien seiner schluessel.json vor jedem Lauf, 6.3)
content/studio/ozzy/           projekt.json figuren/*.json szenen/*.json vorlagen/<hash>.svg klaenge/<hash>.m4a laeufe/*.json
content/studio/<probe>/        Probe-Projekte werkbank-probe (M3, M4) und bedienprobe (M7), geöffnet mit ?projekt=<probe>
docs/progress/studio/          aufwand.json tempo/*.json m<n>-*.png|mp4 proben/m<n>-<name>.<mp4|png|json> (Aufnahmen aus Teil B)
scripts/studio-pruefen.mjs     (Wurzel) Typen, Lint, Tests und Lizenzen aller Studio-Pakete mit kurzer Ausgabe
scripts/studio-stand.mjs       (Wurzel) baut beide Apps in einen neuen Stand-Ordner und schreibt erst danach dist/aktuell (2.4)
scripts/studio-typen.mjs       (Wurzel) Skript `typecheck` jedes Studio-Pakets: tsconfig.json, dann tsconfig.quellen.json (2.1)
```

**Zusammenbau-Dateien** (Befund 15): Nur die Integration ändert sie; der Vertragsschritt legt sie leer an. `uebernahme.ts` und
`inhalt.ts` gibt es seit M0: Sie verstehen die Aufrufe aus 2.4 (`aufrufLesen`), führen aus (`uebernehmen`, `inhaltAusfuehren`), laufen
nur, wenn die Datei direkt gestartet wird, und haben leere Register (`SCHRITTE` je `{ name, kopf, laufen() }`; `SKRIPTE` und
`PROBEPROJEKTE` je `{ name, laufen() }`; Namen aus Kleinbuchstaben, Ziffern und Bindestrich). Die Pakete der Übernahme und des Inhalts
(M1.8, M3.2, M4.4, M5.6 und später) exportieren ihre Schritte und Skripte in dieser Form aus eigenen Dateien; die Integration trägt sie
ein. Nach jeder Welle verdrahtet die Integration sie, damit die nächste Welle
sie benutzen kann: `studio-laufzeit/src/fassade.ts`, `bauplan/bauen.ts`, `apps/studio/src/main.ts`, `befehle/alle.ts`, `pruefhaken.ts`,
`apps/studio/server/plugins.ts`, die Registerlisten (`studio-format/src/arten/register.ts`, `studio-laufzeit/src/bausteine/register.ts`,
`physik/chips.ts`, `posen/zusatzarten.ts`, `studio-bild/src/effekte/register.ts`), `tools/studio-uebernahme/src/uebernahme.ts` und
`tools/studio-inhalt/src/inhalt.ts`. In den Registerlisten gehört nur die Liste dem Zusammenbau; ihre Typen und Hilfen sind Vertrag
(etwa `EffektZeichnung`, `effektZeichnungEintragen` und `effektZeichnungVon` in `studio-bild/src/effekte/register.ts`, 4.6; die Suchen
`chipart`, `bausteinart`, `zusatzart`, 4.5). **Gemeinsame Dateien** legt der Vertragsschritt fertig an: `studio-format/src/{anker,kennung,
versionen}.ts`, `studio-rechnen` (mit vorläufigen Winkelfunktionen über `Math` und SHA-256; `winkel.ts` und `exp.ts` stellt die
Integration nach M1 Welle A auf den Port der fdlibm um), `studio-laufzeit/src/bauplan/{ordnung,regler}.ts` (`ordnung.ts` samt
`ankerBereiche`, der einen Stelle, die den Ankerpuffer rechnet; 4.3). **Was M0 schon angelegt hat** (Typen, Verträge, Tests, Register),
ergänzt ein späteres Paket, statt es neu anzulegen; die Dateizeile seines Auftrags sagt es („ergänzt“).

### 2.3 Abhängigkeitsregeln und wie sie erzwungen werden

1. **Ohne DOM:** rechnen, format, store, laufzeit, welt, autorig haben `"lib": ["ES2022"]`, die Ablage dazu nur Node. Ein `document`,
   `window` oder `HTMLCanvasElement` dort ist ein Typfehler. **Ohne Node:** Die Quellen der Pakete ohne Node (dieselben, dazu bild und
   ton) prüft `typecheck` ein zweites Mal über `tsconfig.quellen.json`, ohne Tests und Testhilfen und damit ohne Node-Typen (2.1): Ein
   `process`, `Buffer`, `require`, `__dirname` oder ein Import von `node:*` in `src/` außer `*.test.ts` und `*.testhilfe.ts` ist dort ein
   Typfehler (ohne DOM auch `setTimeout`), obwohl die Tests daneben Node sehen. ESLint verbietet die Node-Globalen dort schon beim
   Schreiben (Nr. 2).
2. **Simulationspfad wiederholbar:** In `packages/studio-{rechnen,format,laufzeit,welt,autorig}/src/` (ohne `*.test.ts` und
   `*.testhilfe.ts`: Tests vergleichen mit `Math`) verbietet ESLint
   (`no-restricted-properties`) `Math.sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`,
   `atanh`, `exp`, `expm1`, `log`, `log1p`, `log2`, `log10`, `pow`, `hypot`, `cbrt`, `random`; dazu (`no-restricted-syntax`) den
   Operator `**` und `**=`, jeden Bezeichner `Date` und `performance` (auch als Typ oder Eigenschaftsname) und `Math` anders als direkt
   mit festem Namen (`const M = Math`, `Math[name]` und `globalThis.Math` sind Fehler); dazu (`no-restricted-globals`) `crypto`,
   `globalThis`, `global`, `self`, `window` und die Zeitgeber `setTimeout`, `setInterval`, `requestAnimationFrame`. Erlaubt bleiben
   `Math.sqrt`, `abs`, `floor`, `ceil`, `round`, `trunc`, `sign`, `min`, `max`, `imul`, `fround` (und `Math.PI`): Sie sind nach IEEE 754
   und ECMAScript auf jedem Gerät bitgleich. Ausgenommen sind bis nach M1 Welle A `studio-rechnen/src/winkel.ts` und `exp.ts`
   (vorläufig über `Math`); danach streicht die Integration genau diese zwei Einträge unter `ignores`, Tests bleiben ausgenommen. In
   `src/` aller Pakete ohne Node (rechnen, format, store, laufzeit, welt, bild, ton, autorig; ohne Tests und Testhilfen) verbietet ESLint
   außerdem die Node-Globalen `process`, `Buffer`, `require`, `module`, `__dirname`, `__filename`, `global`, `setImmediate`,
   `clearImmediate`. Der Anzeigepfad (`studio-bild`, `studio-ton`, Apps) darf `Math` benutzen. Zeit misst nur, wer außerhalb dieser
   Pakete läuft (der Autorig im Worker der App, 4.10).
3. **Keine Teilnamen:** Kein Studio-Paket und keine App enthält einen Namen eines Teils von Ozzy (`ohrA`, `kopfB`, `bartA`, `bohne`,
   `fensterRV` und die übrigen 20 aus `TeilName` in `vorlagen/import.ts`; der Test liest die Liste aus
   `studio-format/pruefdaten/ozzy-rollen.json`). Ausnahmen: `tools/studio-uebernahme`, `tools/studio-inhalt` und `pruefdaten/` (F6).
   Namen, die zugleich Rollen-Wörter aus `ozzy-rollen.json` sind (heute `nase` und `schwanz`; die Vorlage „Vierbeiner“ des Autorigs und
   die Katze brauchen sie), sind als Rolle erlaubt; der Test prüft Bezeichner und Zeichenketten gegen die übrigen Namen und nennt im Code
   keinen Namen.
   Geprüft werden ausdrücklich auch `apps/studio/scripts/` und `apps/studio/e2e/`. Keine Regel nennt ein Teil; wo Studio Ozzys Teile
   anders behandelt, steht es als Datenfeld (`Teil.wieGezeichnet`, 3.2). P1 und die Proben wählen Ozzys Teile nur über Rollen: aus
   `Teil.rolle` seiner Daten, vor der Übernahme aus `ozzy-rollen.json` (alle Namen aus `TeilName` mit Rolle und Seite, dazu je SVG die
   Teile in Dateireihenfolge nach `ANSICHTEN`; M0.1).
4. **Das Spiel ist schlank:** `apps/ozzy-spiel` importiert weder `@ee/studio-store` noch `@ee/studio-laufzeit/editor/*` noch React noch
   opentype.js und hat höchstens 300 Zeilen Code (ohne Tests und Konfiguration). Server-Erweiterungen stehen nur in seiner
   `vite.config.ts`: `spielPlugins` aus `apps/studio/server/plugins.ts` (2.4), die einzige erlaubte Verbindung zwischen den beiden Apps;
   sie läuft nur im Server, nie im Code des Spiels.
5. **Kein Import aus Apps:** Kein Paket importiert aus `apps/`. Aus `apps/editor` wird kopiert, nie importiert; einzige Ausnahme ist
   `tools/studio-uebernahme`, das den Prototyp liest, um Daten zu schreiben. Umgekehrt importiert `apps/editor` nie etwas aus Studio.
6. **Prüfung:** `apps/studio/test/grenzen.test.ts` liest alle Quelltexte und prüft die Regeln 3 bis 5 und die Import-Matrix aus 2.1
   (die Matrix gilt für `src/`, dort samt „nur `import type`“; `src/` der beiden Werkzeuge darf dazu Node importieren, sie laufen mit
   `tsx` in Node; Konfiguration, Tests, `e2e/`, `scripts/` und `server/` dürfen zusätzlich die Werkzeuge ihres Pakets importieren:
   `vite`, `@vitejs/*`, `vitest`, `fast-check`, `@playwright/test`, `webdriverio`, `typescript`, Node und die devDependencies ihres
   Pakets, und Pakete, die `src/` nur als Typ nehmen darf, auch als Wert, etwa die `WeltAttrappe` der Laufzeit in
   `studio-welt/src/vertrag.test.ts`). Als Typ gilt nur `import type` für die ganze Zeile: `import { type X }` bleibt unter
   `verbatimModuleSyntax` zur Laufzeit stehen. Code eines anderen Pakets kommt nur über seinen Paketnamen, nie über einen relativen Pfad;
   Daten (JSON, SVG, Schriften) dürfen relativ gelesen werden, außer aus `apps/`. Geprüft werden auch `scripts/studio-*.mjs` der Wurzel
   (nur Node), die Importe der HTML-Seiten und die Rückrichtung (`apps/editor` importiert nichts aus Studio). **Keine Worker-Threads:**
   Kein Studio-Code importiert `node:worker_threads`, und keine `vitest.config.ts`, `vite.config.ts` und kein Skript einer
   `package.json` (Studio-Pakete und Wurzel) setzt `pool: 'threads'` oder `'vmThreads'`, weil der Schreibhaken dort nicht wirkt (6.3);
   Web Worker im Browser (der Autorig-Worker der App) sind davon nicht betroffen.
   `apps/studio/test/handgriffe.test.ts` prüft, dass jeder Handgriff ein Befehl mit Geste oder Taste ist (4.7). Regel 2 prüft
   `pnpm lint`. Alle laufen in `pnpm studio:pruefen`.

### 2.4 Ports, Seiten und wie Florian startet

| Port | wer | was |
|---|---|---|
| 5213 | Florian | sein Prototyp: nie anfassen |
| 5217 | Florian | Studio aus dem festen Stand (`apps/studio/dist/<stand>/`, `vite preview --host`, `STUDIO_FLORIAN=1`, Inhalt `content/studio`): Editor `/`, Messseite `/messen.html`, P1 `/p1.html` |
| 5261 | Florian, Nicole, iPhone | Spiel aus dem festen Stand (Code aus `apps/ozzy-spiel/dist/<stand>/`, `vite preview --host`); Inhalt über seinen Server aus `content/studio`, Merker nach `laeufe/` |
| 5263 | Integration | Studio im Entwicklungsserver mit Neuladen (`vite --host`), Inhalt als Kopie |
| 5265 | Integration | Spiel im Entwicklungsserver, Inhalt als Kopie |
| 5270 bis 5289 | Bau-Agenten | Probe-Ports; der Workflow teilt jedem Agenten eigene zu (Regel unten) |
| 5291, 5292 | Integration | Playwright-Server für Studio und Spiel, Inhalt als Kopie |
| 5294 | Proben | Prototyp als Vergleich (`pnpm --filter @ee/studio-uebernahme vergleich`: eigene Konfiguration mit Wurzel `apps/editor`, Zwischenspeicher `test-results/vergleich/vite`, ohne Schreibwege; 6.3), nie Florians 5213 |
| 5219 | Shader-Sitzung | belegt, nie benutzen |

**Probe-Ports paralleler Pakete.** Der Workflow teilt jedem Bau-Agenten einer Welle zwei Ports aus 5270 bis 5289 zu, nach der Reihenfolge
der Pakete in der Welle: das erste Paket 5270 und 5271, das zweite 5272 und 5273 und so weiter; zehn Pakete füllen den Block. Der Agent
bekommt sie als `STUDIO_PORT` (gerade) und `SPIEL_PORT` (ungerade) und startet Server nur auf diesen, immer mit `--strictPort`, mit
`STUDIO_INHALT=test-results/<paket>/inhalt` (eine Kopie) und mit dem Schreibhaken
(`NODE_OPTIONS=--import=<Arbeitsbaum>/apps/studio/scripts/proben/schutz.mjs`, mit absolutem Pfad, weil `pnpm --filter` im Ordner des
Pakets läuft; 6.3).
`playwright.config.ts` beider Apps liest die Ports aus diesen Variablen (Standard 5291 und 5292) und den Inhaltsordner aus
`STUDIO_INHALT`: Er muss unter `test-results/<ordner>/…` liegen (sonst bricht der Lauf ab, und `ausgaben` darf er nicht heißen), ohne
die Variable gilt `test-results/playwright-<port>/inhalt`; die Ausgaben liegen daneben (`…/ausgaben`, Playwright leert sie zu Beginn
jedes Laufs, darum nie den Ordner eines anderen Pakets nennen). Der Server des Laufs bekommt diese Werte, dazu `STUDIO_FLORIAN` leer und
den Schreibhaken; einen schon laufenden Server nimmt Playwright nie (`reuseExistingServer: false`, ein belegter Port bricht ab),
`workers: 1`, Chromium mit SwiftShader außer bei `EE_GPU=1`, WebKit im Spiel im Format des iPhone 16. Vor jedem Start
`lsof -nP -iTCP:<port>`; ist ein zugeteilter Port belegt, weicht der Agent nicht aus, sondern schreibt es in seinen Abschlussbericht. Am
Ende seines Laufs beendet er seine Server. Ein Prototyp-Vergleich auf 5294 läuft nur in Proben der Integration.

**Seiten von `apps/studio`:** `index.html` (Editor), `messen.html` (Messseite, nur sie mit den Kopfzeilen COOP und COEP), `pruefen.html`
(Prüfseite für Playwright: Laufzeit und Renderer ohne Oberfläche, Haken `window.__studioPruefen`), `p1.html` (Probe P1, bleibt als
Prüfseite des `WeltAdapter`). Die Eingänge stehen in `build.rolldownOptions.input`.

**Florian startet** in diesem Arbeitsbaum (`.claude/worktrees/ozzy-animation-physics-294508`):

```bash
pnpm studio        # Editor, Messseite und P1: http://localhost:5217/  und  http://<Adresse des Macs>:5217/messen.html
pnpm gassirunde    # Spiel fürs iPhone im selben Netz: http://<Adresse des Macs>:5261/
```

Beide zeigen einen festen Stand des Codes. Er ändert sich nur am Ende einer Etappe: Nur die Integration ruft `pnpm studio:stand` auf.
Es baut beide Apps in einen neuen Ordner je Stand (`apps/<app>/dist/<etappe>-<zeit>/`, nicht im Git) und schreibt erst danach dessen
Namen nach `apps/<app>/dist/aktuell`; `stand:zeigen` liest diesen Namen beim Start und liefert nur aus diesem Ordner. Ein laufender
Server wechselt nie, und was seine offene Seite nachlädt (Worker, WebAssembly, Teile mit Prüfsumme im Namen), bleibt bis zum Neustart
da; der Neustart nimmt den neuen Stand. `studio:stand` löscht ältere Stände außer dem neuen, dem vorigen und einem, aus dem 5217 oder
5261 gerade noch liefert; gibt es einen Namen schon, hängt es `-2`, `-3` … an (ein Stand-Ordner wird nie überschrieben); scheitert ein
Bau, bleiben `dist/aktuell` und alle Stände, wie sie waren. `dist/aktuell` enthält nur den Namen, ohne Zeilenumbruch; `stand:bauen`
baut nur mit `STUDIO_STAND` (den Namen setzt `studio:stand`, sonst bricht der Bau ab). Tests und Proben bauen nie nach `dist/`. 5217
startet die Integration nur neu, wenn sein Journal nichts Ungespeichertes hält (`GET /__studio/sitzung/offen`, 4.9); die offene Seite
bietet dann
„neu laden“ an. Den Inhalt liefert in beiden Apps der Server, nicht der Bau (Befund 2): Das Spiel lädt beim Start über seinen Server,
mit demselben Haken `quellenEinsetzen` wie Studio, also immer Florians aktuellen Stand samt seiner neuesten Kopfschlüssel; nur die App
(M11.2) bekommt einen eingebauten Inhalt. In `content/studio/` schreiben nur Florians Studio auf 5217, sein Spiel-Server auf 5261 (nur
Merker, als neue Dateien nach `laeufe/`) und, über dieselbe Ablage und Schutzregel, die Übernahme und die Inhalt-Skripte in den Läufen
der Integration (F5, 6.3); jeder andere Server und jeder andere Lauf arbeitet auf einer Kopie (Regel unten). Einträge in
`.claude/launch.json` (sie rufen die Wurzel-Skripte samt deren Umgebung, je mit `url`): `studio` (5217), `studio-bau` (5263),
`gassirunde` (5261). Vor jedem Start `lsof -nP -iTCP:<port>`.

**Wurzel-Skripte** (in `package.json`, angelegt in M0): `studio` (`STUDIO_FLORIAN=1 STUDIO_INHALT=content/studio SPIEL_PORT=5261
pnpm --filter @ee/studio stand:zeigen`; nur hier ist `STUDIO_FLORIAN` gesetzt), `gassirunde` (`STUDIO_INHALT=content/studio
pnpm --filter @ee/ozzy-spiel stand:zeigen`), `studio:bau` (`SPIEL_PORT=5265 pnpm --filter @ee/studio dev`, Inhalt als frische Kopie),
`studio:stand` (`node scripts/studio-stand.mjs`: Name `<etappe>-<zeit>`, beide Apps mit `stand:bauen` dorthin, erst danach
`dist/aktuell`), `studio:pruefen` (`node scripts/studio-pruefen.mjs`). Alle Wurzel-Skripte außer `studio` und `gassirunde` setzen den
Schreibhaken (`NODE_OPTIONS=--import=$PWD/apps/studio/scripts/proben/schutz.mjs`; `$PWD` ist dort der Wurzelordner) und
`pnpm_config_verify_deps_before_run=error`: pnpm 12 installiert sonst vor `pnpm run` und `pnpm exec` von selbst, sobald eine
`package.json` nicht mehr zur Lockdatei passt; so bricht es mit „Run pnpm install“ ab. Die Einstellung steht nur in der Umgebung dieser
Skripte, in `umgebung()` von `scripts/studio-pruefen.mjs` und in den Befehlen der Bau-Agenten (7.4), nie in `pnpm-workspace.yaml` oder
`.npmrc` (das träfe Florians Start auf 5213). Skripte von
`apps/studio`: `dev` (`NODE_OPTIONS=--import=$PWD/scripts/proben/schutz.mjs vite --port ${STUDIO_PORT:-5263} --strictPort --host`),
`stand:bauen` (`vite build` nach `dist/<stand>/`), `stand:zeigen` (`vite preview` aus `dist/<aktuell>/`, `--port 5217 --strictPort
--host`), `typecheck` (`node ../../scripts/studio-typen.mjs`, wie in jedem Studio-Paket; 2.1), `test`, `e2e` (`playwright test`).
Skripte von `apps/ozzy-spiel`: `dev` (`NODE_OPTIONS=--import=$PWD/../studio/scripts/proben/schutz.mjs vite --port ${SPIEL_PORT:-5265}
--strictPort --host`), `stand:bauen`, `stand:zeigen` (aus `dist/<aktuell>/`, `--port 5261 --strictPort --host`), `typecheck`, `test`,
`e2e`. Skripte der Werkzeuge (M0.1): `@ee/studio-uebernahme`: `uebernehmen` (`tsx src/uebernahme.ts`: alles; `-- --kopf` nur der
Kopf), `vergleich` (`vite --config vergleich.vite.config.ts --port 5294 --strictPort`), `typecheck`, `test`; `@ee/studio-inhalt`:
`inhalt` (`tsx src/inhalt.ts`: alle Inhalt-Skripte bis zur laufenden Etappe, einzeln mit `-- <name>`), `probeprojekt`
(`tsx src/inhalt.ts probeprojekt`, aufgerufen mit `-- <name>`), `typecheck`, `test`. Die Paket-Skripte `dev` (beide Apps),
`uebernehmen`, `vergleich`, `inhalt` und `probeprojekt` setzen den Schreibhaken selbst
(`NODE_OPTIONS=--import=$PWD/<Weg zu apps/studio/scripts/proben>/schutz.mjs`; `$PWD` ist dort der Ordner des Pakets), damit er auch
gilt, wenn sie direkt mit `pnpm --filter` laufen; nur `stand:zeigen` (Florians 5217 und 5261) bleibt ohne (6.3). Relative Importe in
den Konfigurationsdateien tragen die Endung `.js` (`./server/plugins.js`; Vite 8 warnt sonst bei jedem Start).

**Server-Erweiterungen** kommen aus `@ee/studio-ablage` (Vite-Plugin mit `configureServer` und `configurePreviewServer`, damit sie im
festen Stand genauso laufen) und werden in `apps/studio/server/plugins.ts` zusammengesetzt. `studioPlugins()`: Ablage mit Revision und
Sicherungsring, Ereignisse (Server-Sent Events), Sitzungsschlüssel, Live-Weitergabe zum Spiel, Merker; als Haken des Zusammenbaus fremde
Quellen einsetzen (`quellenEinsetzen`), Schutzprüfung (`schutzVerletzt`) und Neustart der Übernahme, wenn er seine `schluessel.json`
speichert (4.9); dazu `server/messung.ts`. `spielPlugins()` (5261, 5265, 5292): dieselbe Ablage nur mit Lesen samt `quellenEinsetzen`,
Live und Merkern nach `laeufe/`; die `vite.config.ts` des Spiels importiert genau diese Funktion (2.3 Nr. 4). **Inhaltsordner:**
`content/studio` gilt nur, wo `STUDIO_INHALT=content/studio` ausdrücklich steht (`pnpm studio`, `pnpm gassirunde`, Läufe der
Integration). Ohne `STUDIO_INHALT` arbeitet jeder Server und jedes Werkzeug nur in `test-results/bau/inhalt` und legt dort eine
frische Kopie an (ohne `.sicherung/`), aber nur, wenn der Ordner fehlt oder leer ist; so teilt sich ein Server-Paar (5263 und 5265) eine
Kopie und sieht für die Live-Probe denselben Inhalt. Geleert wird der Ordner nur von der Integration vor einem neuen Lauf
(`scripts/studio-pruefen.mjs`, als erster Schritt, wenn die Tests mitlaufen; hört gerade ein Server auf 5263 oder 5265, bleibt er mit
einer Hinweiszeile stehen), nie von einem Server beim Start. Nennt `STUDIO_INHALT` einen Ordner unter `test-results/`, gilt dieselbe
Regel dort. Relative Pfade gelten vom
Wurzelordner des Arbeitsbaums (dem Ordner mit `pnpm-workspace.yaml`), nie vom Arbeitsordner des Prozesses (`pnpm --filter` läuft im
Ordner des Pakets).

### 2.5 Arbeitsbaum und Zweig

- **Ein Arbeitsbaum, ein Zweig (F3):** Gebaut wird in `.claude/worktrees/ozzy-animation-physics-294508`, Zweig
  `claude/ozzy-animation-physics-294508`; kein Integrations-Arbeitsbaum, keine Zweige je Paket, keine Merges. Sein Prototyp und seine
  `schluessel.json` liegen hier und sind lebendig; Studio liest sie direkt, und der Schreibhaken der eigenen Prozesse hält sie unberührt
  (6.3). Was Florian dort selbst ändert, ist seine Arbeit und löst nichts aus.
- **Parallel (F2):** Die Pakete einer Welle laufen in einem Workflow gleichzeitig, jeder Agent mit dem stärksten Modell und höchstem
  Aufwand, höchstens etwa zehn Agenten je Workflow. M1 und M2 teilen sich ihre Wellen (Welle A neun Agenten), M9 und M10 ihre ersten
  Wellen.
- **Pakete einer Welle** ändern disjunkte Dateien im selben Baum. Bau-Agenten committen nicht, rufen nie `pnpm install`, ändern keine
  `package.json` und keine Lockdatei; alle Abhängigkeiten einer Etappe installiert ihr Vertragsschritt. Sie prüfen nur ihre eigenen
  Dateien, weil mehrere Arbeitspakete einer Welle im selben npm-Paket liegen können (etwa M1.3, M1.7 und M2.2 in `studio-laufzeit`):
  `vitest run <eigene Testdateien>`, die Typprüfung ihres npm-Pakets (`pnpm --filter <npm-paket> typecheck`, beide tsconfig aus 2.1,
  nie nur `exec tsc`; ein Fehler in einer Datei eines anderen Arbeitspakets steht im Abschlussbericht, der Agent ändert sie nicht),
  ESLint auf den eigenen Dateien und `grenzen.test.ts` (7.4), jeder Befehl mit `pnpm_config_verify_deps_before_run=error` (2.4), damit
  pnpm nie von selbst installiert. Nie die ganze Testreihe des Repos, nie `@ee/shape`; Testausgaben nach `test-results/<paket>/`. Das
  ganze npm-Paket prüft die Integration nach der Welle.
- **Meldeweg:** Braucht ein Paket eine Änderung außerhalb seiner Dateien (eine andere Datei, eine Abhängigkeit, eine Vertragsänderung),
  steht sie in seinem Abschlussbericht an den Workflow; die Integration entscheidet. Niemand schreibt andere Sitzungen an.
- **Integration** (die Hauptsitzung): Vertragsschritt, Verdrahten nach jeder Welle, Abschluss der Etappe (5.1). Sie prüft nach jeder
  Welle alles zusammen (`pnpm studio:pruefen`, e2e), committet nur eigene Dateien (vorher `git status` und `git log`, kein bare
  `git stash`, CLAUDE.md Regel 9) und pusht den Zweig am Ende jeder Etappe. Florians Stand in `content/studio/` committet sie getrennt
  vom Code (6.3).
- **Tabu:** `apps/editor/`, `packages/shape/`, `docs/look/ozzy-figur/` und alles, was andere Stränge bauen; dazu Wurzeldateien, die
  `apps/editor` liest (`tsconfig.base.json`): Studio-Pakete erweitern sie nur. Änderungen unter `apps/studio`, `apps/ozzy-spiel`,
  `packages/studio-*` und `tools/studio-*` laden sein Fenster auf 5213 nicht neu, solange `apps/editor` nichts davon importiert. Kein
  eigener Prozess schreibt unter `apps/editor/`, auch nicht in den Zwischenspeicher `apps/editor/node_modules/.vite` seines 5213: Ein
  zweiter Vite-Server mit diesem Ordner löschte ihn nach jedem `pnpm install` beim Start (geänderte Lockdatei) unter dem laufenden 5213.
  Der Vergleichsserver auf 5294 hat deshalb eine eigene Konfiguration mit eigenem Zwischenspeicher (2.4, 6.3).
- **Nie unter Florians Fenstern:** Der Prototyp auf 5213 und alle Dateien in `docs/look/ozzy-figur/` bleiben unberührt. Florians
  Studio auf 5217 lädt nie von selbst neu, weil es aus seinem Stand-Ordner läuft, den kein Bau überschreibt (2.4).
- **Versionen:** Neue Pakete nehmen dieselben Versionen wie `apps/editor` (Vite ^8.3.1, TypeScript ~5.9.0, vitest ^5.0.2, Playwright
  ^1.63.0, React ^19.3.0); bestehende Abhängigkeiten anderer Pakete und Apps behalten ihre Versionen.

### 2.6 Was aus dem Prototyp kommt, Datei für Datei

„Kopie“ heißt: kopiert und angepasst, nie importiert. „Daten“ heißt: Das Übernahme-Werkzeug schreibt es als Datensätze; im Studio-Code
steht es nicht.

| Prototyp (`apps/editor/src/ozzy-figur/`) | in Studio | Art |
|---|---|---|
| `form.ts`: `pchip` (309–338) | `studio-rechnen/src/pchip.ts` (`pchipSteigungen`, `pchipWert`): eine PCHIP-Regel überall, dieselbe Reihenfolge der Rechenschritte | bitgleich (Parität, Befund 1) |
| `form.ts`: `punktAuf`, `teilen` | `studio-rechnen/src/bezier.ts` (`casteljau`), `laufzeit/editor/ankerSetzen.ts` | Kopie, auf Felder |
| `form.ts`: `abflachen` | `laufzeit/form/abflachen.ts` mit fester Stückzahl nach Wang | Vorbild |
| `form.ts`: `morphen` (linear, winkel, aehnlich) | `laufzeit/form/linear.ts`, Procrustes in `form/rahmenRest.ts` | Vorbild |
| `form.ts`: `ankerErgaenzen`, `restNachDrehung`, `verschiebungsKosten`, `umkehren`, `ankerDrehen`, `flaeche`, `kasten`, `groessterAbstand`, `spiegeln` | `studio-format/src/svg/paaren.ts` | Kopie |
| `raster.ts`: `formAusSchluesseln` | `laufzeit/form/koordinaten.ts` | Kopie, auf Felder, mit `studio-rechnen` |
| `raster.ts`: `spitzenFinden`, `spitzenFuehren` | Finden in der Übernahme; Führen in `laufzeit/form/spitzen.ts` | Kopie, ohne Teilnamen |
| `raster.ts`: `kopfGespiegelt`, `PARTNER_KOPF`, `NASE_SPIEGEL`, `versatzBei` | `laufzeit/form/spiegel.ts`; Werte als Spiegelregel und Draht | allgemein; Werte als Daten |
| `raster.ts`: `faltSchluessel`, `FALTEN_COS` | Erkennung in `laufzeit/editor/waechter.ts`, Vorschlag in `editor/faltenVorschlag.ts` | Kopie |
| `raster.ts`: `korrekturEinsetzen`, `KORREKTUR_NAH`, `korrekturAus` | `laufzeit/form/ruhen.ts`, `laufzeit/editor/zielregel.ts` | allgemeine Regel |
| `raster.ts`: alle Schlüssel, `anschlussBauen`, `rueckseiteBauen`, `WICKEL`, `NASE_WEG`, `GESICHT_WEG`, `SCHWANZ_WEISS`, Klemmen, Hals, Kopfversatz, `bohnenendenSetzen` | Daten aus `tools/studio-uebernahme` | nie Code |
| modul-private Werte: `NAMEN` (werkzeug.ts:34), `ELTER` (haltung.ts:124), `NASE_SPIEGEL` (raster.ts:298), `kopfGespiegelt` (raster.ts:310), `SCHWANZ_WEISS` (raster.ts:216), `WICKEL` (raster.ts:279), `GESICHT_WEG` (raster.ts:260), `NASE_WEG` (raster.ts:286), `FALTEN_COS` (raster.ts:95), `ABTASTUNG` (haltung.ts:246), `FALTEN`, `KAMERA_SCHWELLE`, `KURZ_WEG`, `KURZ_BREIT` (haltung.ts:61–72) | `tools/studio-uebernahme/src/prototyp-werte.ts`, je mit Datei:Zeile im Kommentar; `Reflect.get` nur für Felder und Methoden der Klasse | Kopie, am Verhalten geprüft (`prototyp-werte.test.ts`, Befund 20) |
| `renderer.ts` | `studio-bild` (`zeichner.ts`, `shader/`, `felder.ts`, `effekte/`) | Ausgangspunkt, verallgemeinert |
| `szenen.ts`: `gruppeVon`, `weissGruppeVon`, `REGELN`, `renderTeile`; `renderer.ts`: `FLUESSIG`, `EXAKT` | Daten (Gruppen, Verbindungen, Effekte) | nie Code |
| `haltung.ts`: `rueckgratBauen`, `beinOrt`, Bodengrenze | `laufzeit/knochen/biegeachse.ts`, mit Mindestradius (`Biegeachse.rMin`, haltung.ts:779) und derselben Abtastung (24) | Kopie, allgemein |
| `haltung.ts`: Haltungen, Hocke, Diener, `ELTER`, `weg`, Knochen und Korrekturen je Haltung | Daten (Knochen, Posen, Korrekturen, „über X“) | nie Code |
| `haltung.test.ts` | `laufzeit/knochen/biegeachse.test.ts`, `tools/studio-uebernahme/src/haltungen.test.ts` | Fälle übernommen |
| `ablauf.ts`: `kurve`, `aufprall`, `seufzer`, Hüpfer, Wedeln | `laufzeit/posen/abschnitte.ts`, `posen/zusatz/*.ts` | Formeln wörtlich |
| `ablauf.ts`: `ABLAEUFE`, `ablaufFuer` | Daten (gestaltete Übergänge) | nie Code |
| `steuerung.ts` | `laufzeit/regler/ausgleich.ts` (Trägheits-Ausgleich ersetzt die Feder 16/s); Fälle aus `steuerung.test.ts` in `posen/standard.test.ts` | Vorbild, Fälle |
| `werkzeug.ts` | `apps/studio/src/werkzeuge/`, `leiste/`, `buehne/zwiebelhaut.ts`: Treffer 5 und 9 Bildpunkte, Pfeiltasten (⇧ 10), „,“ und „.“, J und K, Farben `TINTE`, `ROT`, `BLAU`, `VORHER`, `NACHHER`, Maße `ZL_GROSS` und `ZL_KLEIN`; Namen `NAMEN` über `prototyp-werte.ts` | Vorbild, Teile kopiert |
| `werkzeug.ts`: `schluesselLesen` | `studio-format/src/migrationen/kern-0-1.ts`, eingesetzt bei jedem Laden über `quellen.ts` (Befund 5) | Format gelesen, nie geschrieben |
| `main.ts`: `einpassen`, `rahmen` | `apps/studio/src/buehne/ansicht.ts` | Kopie |
| `pruefen.ts` | `apps/studio/src/pruefhaken.ts` | Vorbild |
| `vorlagen/svg.ts` | `studio-format/src/svg/lesen.ts` | Kopie |
| `vorlagen/import.ts` | `studio-format/src/svg/importieren.ts` (Namen der Pfade aus der Datei, sonst nummeriert); Tabelle `ANSICHTEN` nur in der Übernahme | Kopie ohne Teilnamen |
| `vorlagen/zwischen.ts` | Schlüssel aus der Übernahme | Daten |
| `ozzy-figur.css` | `apps/studio/src/look/liquid-drop.css` | Kopie |
| `drei/`, `modell/`, `raum/` | nichts | ruhen |
| `apps/editor/scripts/ozzy-figur/proben.mjs`, `werkzeug-probe.mjs`, `zeitleiste-probe.mjs` | Vorbild für `apps/studio/scripts/proben/` (eigener Port, Attrappe der Ablage, `page.route` auf `**/__ozzy-figur/schluessel`, Schreibhaken) | Vorbild |
| `apps/game/src/audio/` (`graph.ts`, `timeline.ts`, `dsp.ts`, `sfxKit.ts`, Freigabe aus `engine.ts`) | `studio-ton` | Kopie, verkleinert |

---
## 3 Datenmodell der Fassung 1

### 3.1 Ablage

Ein Projekt ist ein Ordner unter `content/studio/<projekt>/`; die Demo ist `content/studio/ozzy/`. Probe-Projekte für Proben mit
Florian liegen daneben (`content/studio/werkbank-probe/`, `content/studio/bedienprobe/`, Befund 26), angelegt von `probeprojektAnlegen`
als Dateikopie über die Ablage (3.6 Nr. 9) und geöffnet mit `?projekt=<probe>`; sein Projekt bleibt dabei bytegleich.

| Datei | enthält |
|---|---|
| `projekt.json` | Projekt (mit `quellen`, `umgezogen`, `fassungen`, `uebergangen`), Vorlagen, Klänge, Schriften |
| `figuren/<datei>.json` | eine Figur mit allem, was ihr gehört: Teile, Gruppen, ihre Regler, Bindungen, Schlüssel, Wechsel, Knochen, Aufhängungen, ihr Körpermodell, Schichten, Posen, Übergänge, Zyklen, Physik-Chips, Verbindungen, ihre Effekte und Klang-Chips, ihre Drähte |
| `szenen/<datei>.json` | eine Szene mit Welt, Dingen, Bausteinen, ihren Reglern, Drähten, Regeln, Aufgaben, Effekten und Klang-Chips |
| `vorlagen/<hash>.svg` | Florians Original-SVGs, benannt nach den ersten 16 Zeichen ihres SHA-256 |
| `klaenge/<hash>.m4a` | Klänge |
| `laeufe/<name>.json` | Lauf-Dateien (Beweise, Merker, Fehlerberichte) |
| `../.sicherung/<projekt>/<pfad>/<zeit>-<revision>.json` | Sicherungsring (F5): Jedes Speichern legt die vorige Fassung der Datei hierher; behalten werden die letzten 50 je Datei und dazu eine Woche lang je Stunde eine (beim Formen sind 50 Speicherungen nur Minuten); vor jeder Migration die alte Datei. Nicht im Git (`content/studio/.gitignore`) |
| `../.sicherung/<projekt>/fassungen/<zeit>-<kennung>.json` | verdrängte Fassungen bei zwei Geräten (4.9): je eine Datei mit dem Datensatz selbst, höchstens 50, getrennt vom Ring und nie von ihm ausgedünnt; nicht im Git |

Zu welcher Datei ein Datensatz gehört, folgt aus seiner Besitzerkette (`dateiVon` in `studio-format/src/dateien.ts`). Der Dateiname
einer Figur oder Szene steht im Datensatz (`datei`) und bleibt beim Umbenennen. Abgeleitetes steht nie in einer Datei: keine Abflachung,
keine Steigungen, keine Drehzentren, keine ruhenden Schlüssel, keine gespiegelten Kopien, kein Laufzustand. **Fremde Quellen** stehen
nie in einer Datei: Bis zum Umzug (Befund 5) setzt der Server seine Schlüssel aus `docs/look/ozzy-figur/schluessel.json` bei jedem Laden
ein (`quellenEinsetzen`, 3.4); der Schreiber lässt Schlüssel mit Herkunft `dein` an Bindungen einer Quelle aus. Das Journal liegt je
Gerät im Browser (IndexedDB, 4.9).

### 3.2 Typen (Format v1)

Die Typen liegen in `packages/studio-format/src/typen/`, je Bereich eine Datei (Name in der Kopfzeile jedes Blocks). Die zod-Schemas in
`src/schema/` bilden sie Feld für Feld nach; ein Test prüft beide Richtungen auf Typebene. Einheiten: Längen in Figur-Einheiten (wie in
Florians SVG, y nach unten), Winkel in Grad, Zeiten in Sekunden, Anteile von 0 bis 1. Die Vertragsänderungen des Entscheidungsblatts
(dort Abschnitt 3) sind hier eingetragen; M0 legt alles an. **Die Schemas sind strenger als die Typen** (der Typ bleibt gleich):
Kennungen haben die Form aus 3.3 und je Feld die passende Vorsilbe; `ebene` und `ordnung` sind gültige Bruchindizes von
`fractional-indexing`; Farben nur `#rrggbb`; Ankerzeilen mit Winkeln in (−180, 180] und Längen ≥ 0 (3.6 Nr. 1 schon im Schema); ganze
Zahlen für Indizes, Takte und Prüfsummen; `Klang.stimmen` ≥ 1, `Regler.nachlauf` von 0 bis 0,5, `Wechsel.breite` ≥ 0; `Teil.anker` ohne
Doppelte; `Figur.datei`, `Szene.datei`, `Projekt.figuren` und `Projekt.szenen` ohne Pfad; `Projekt.fassungen[].zeit` nach ISO; Hüllen
nach 3.6 Nr. 12; in einer Datei ist der Schlüssel jedes Eintrags seine Kennung, im Diff tragen vorher und nachher dieselbe. Alle Objekte
sind streng: Ein unbekanntes Feld ist ein Fehler (3.4 „nichts still weglassen“), auch alte Felder wie `Teil.grundform`.

```ts
// ---------- typen/grund.ts ----------
export type Vorsilbe =
  | 'prj' | 'vl' | 'kl' | 'sf'                   // Projekt, Vorlage, Klang, Schrift
  | 'fig' | 'teil' | 'an' | 'gr'                 // Figur, Teil, Anker, Gruppe
  | 'rg' | 'bd' | 'sl' | 'we'                    // Regler, Bindung, Schlüssel, Wechsel
  | 'kn' | 'af' | 'km'                           // Knochen, Aufhängung, Körpermodell
  | 'sch' | 'po' | 'ue' | 'zy'                   // Schicht, Pose, Übergang, Zyklus
  | 'ch' | 'vb' | 'ef' | 'kc'                    // Physik-Chip, Verbindung, Effekt, Klang-Chip
  | 'welt' | 'sz' | 'di'                         // Welt, Szene, Ding
  | 'bs' | 'dr' | 're' | 'au';                   // Baustein, Draht, Regel, Aufgabe
export type Id<V extends Vorsilbe> = `${V}_${string}`;
export type Punkt = [x: number, y: number];
/** jeder Datensatztyp trägt sie (3.6 Nr. 9); Autorig und Skripte schreiben 'gebaut'; „automatik“ ist eine Quelle (4.1), keine Herkunft */
export type Herkunft = 'vorlage' | 'dein' | 'gebaut' | 'aufnahme';
export type Kurve = 'weich' | 'fallen' | 'auf' | 'linear' | 'feder';
/** Zeitsprache: innen f = 1/dauer, ζ = 1 − federung (Konzept 6.4) */
export interface Feder { dauer: number; federung: number; vorgriff?: number }
/** fest oder von einem Regler getrieben */
export type Wert = number | Id<'rg'>;
/** Daten einer registrierten Art; das Schema der Art prüft sie (arten/register.ts) */
export type ArtWert = number | string | boolean | number[] | string[] | { [k: string]: ArtWert };
export type ArtDaten = { [k: string]: ArtWert };

// ---------- typen/projekt.ts ----------
/** feldweise zusammengeführt, die einzige Ausnahme von „je Datensatz“ (3.6 Nr. 9): quellen und umgezogen schreibt nur die Übernahme
 *  (der Umzug, Quelle florian, nimmt die Quelle heraus und setzt umgezogen); figuren, szenen und uebergangen sind Mengen (jede Seite fügt
 *  hinzu, entfernt wird nur mit dem Löschen); fassungen schreibt nur der Editor; name und start nur Florian */
export interface Projekt {
  id: Id<'prj'>; name: string;
  figuren: string[];                     // Dateinamen unter figuren/ ohne Endung, sortiert
  szenen: string[];
  start?: Id<'sz'>;                      // Szene, die das Spiel zuerst lädt
  /** fremde Quellen bis zum Umzug (Befund 5): Datei relativ zum Arbeitsbaum, nur gelesen; ihre Schlüssel setzt der Server bei
   *  jedem Laden mit Herkunft 'dein' ein; die genannten Bindungen sind bis zum Umzug nur zum Ansehen */
  quellen?: { art: 'prototyp-schluessel'; datei: string; figur: Id<'fig'>; zuordnung: [teilName: string, bindung: Id<'bd'>][] }[];
  /** nach dem Umzug: diese Dateien sind umgezogen; jede spätere Übernahme lässt Quelle und Kopf aus (3.4, 6.2 Schritt 1) */
  umgezogen?: string[];
  /** verdrängte Fassungen bei zwei Geräten (F5): Kennung des Datensatzes, Gerät, Zeit (ISO), eigene Datei unter
   *  .sicherung/<projekt>/fassungen/ (nicht im Ring, 3.1); höchstens 50 */
  fassungen?: { id: string; geraet: string; zeit: string; sicherung: string }[];
  uebergangen?: string[];                // Prüfer-Hinweise, die Florian übergangen hat
  herkunft: Herkunft;
}
export interface Vorlage { id: Id<'vl'>; name: string; datei: string; hash: string; quelle?: string; herkunft: Herkunft }
export interface Klang {
  id: Id<'kl'>; name: string; dateien: string[];          // 'klaenge/<hash>.m4a', mehrere = Abwechslung
  lautstaerke: number; streuung: { ton: number; laut: number };   // Halbtöne, dB
  mindestabstand: number; stimmen: number;
  herkunft: Herkunft;
}

// ---------- typen/figur.ts ----------
export interface Figur {
  id: Id<'fig'>; name: string; datei: string;
  einheitL: number;                      // Figur-Einheiten je Körperlänge L
  vorlage?: 'vierbeiner' | 'allgemein';  // Vorlage des Autorigs
  wurzel?: Id<'kn'>;
  lage: { x: Id<'rg'>; y: Id<'rg'>; drehung: Id<'rg'> };
  // Charakter und Spannung sind Regler der Figur mit Rollen (Regler.rolle), kein eigenes Feld (Befund 16 h, i)
  herkunft: Herkunft;
}
export interface Teil {
  id: Id<'teil'>; figur: Id<'fig'>; name: string;
  art: 'flaeche' | 'linie';
  farbe: 'schwarz' | 'weiss' | `#${string}`;
  ebene: string;                         // Bruchindex: Malreihenfolge in Ruhe
  gruppe?: Id<'gr'>;
  anker: Id<'an'>[];                     // Reihenfolge der Anker; jede Formzeile folgt ihr
  form?: Form;                           // Form ohne Ansicht: nur ohne Bindung mit Wirkung 'ansicht' („Grundform“ heißt nur die
                                         // erste Posenkarte, Befund 29)
  wieGezeichnet?: true;                  // Ozzys Teile (Übernahme): Effekte und Chips nur nach `aufGezeichnet` ihrer Art (30 d);
                                         // entfernen darf es nur die Quelle florian
  linie?: { offen: boolean; breite: [t: number, b: number][] };   // art 'linie': Breite längs der Kurve
  klemme?: { traeger: Id<'teil'>; rand: Wert; weich: number };     // Weiß bleibt im Träger
  hinter?: { teil: Id<'teil'>; tiefe: Wert };                       // Weiß liegt hinter diesem Schwarz und tritt weich davor
  partner?: Id<'teil'>;                  // Spiegelpartner
  rolle?: string;                        // Adresse für Regeln und Autorig: 'ohr', 'bein.vorn', 'kopf' (die Seite steht in `seite`)
  seite?: 'links' | 'rechts' | 'mitte';
  vorlageName?: string;                  // Name des Pfads in der Datei (in Illustrator der Name des Objekts)
  herkunft: Herkunft;
}
export interface Gruppe { id: Id<'gr'>; figur: Id<'fig'>; name: string; ordnung: string; herkunft: Herkunft }

// ---------- typen/form.ts ----------
/** glatt: Aus-Griff in Richtung w, Ein-Griff in Richtung w + 180° (Grad, absolut); Längen ≥ 0 */
export type AnkerGlatt = [x: number, y: number, w: number, lEin: number, lAus: number];
/** Ecke: jeder Griff mit eigener Richtung vom Anker aus (Grad, absolut) */
export type AnkerEcke = [x: number, y: number, wEin: number, lEin: number, wAus: number, lAus: number];
export type AnkerZeile = AnkerGlatt | AnkerEcke;
export type Form = AnkerZeile[];
/* Glatt im Bauplan (TeilPlan.glatt): ein Anker, der in allen Schlüsseln aller Bindungen seines Teils und in Teil.form glatt ist; sonst
 * wird jede glatte Zeile als Ecke mit wEin = w + 180° gemischt. „je Koordinate“ mischt immer je Griff wie formAusSchluesseln. Wird ein
 * Anker glatt gemacht (Glätte-Regel beim Einlesen, ⇧C), ist w die Richtung vom Ein-Griff zum Aus-Griff (längengewichtetes Mittel
 * beider Richtungen; ist ein Griff 0, die Richtung des anderen). Übernahme und Migrationen glätten nicht (3.4). */
/** Versatz im mitlaufenden Rahmen der gezeigten Form (ein Bezugsrahmen für alle Zusatzformen, vor den Knochen; Befund 12, 16 a).
 *  Für Anker i der gezeigten Form (nach Ansicht und Anheftung, vor Zusätzen): d = p(i+1) − p(i−1), zyklisch; an den Enden einer
 *  offenen Linie p1 − p0 bzw. pn − pn−1. τ = d/|d|, ν = (−τy, τx), L = |d|/2 (an Enden |d|); |d| < 1e-9 → L = 0. Ecken und glatte
 *  Anker gleich. Anwenden: p' = p + L·(laengs·τ + quer·ν); Griffwinkel w' = w + dw (Ecken je Griff); Grifflängen l' = max(0, l + dl·L).
 *  Alle Längenversätze (laengs, quer, dl) sind durch L geteilt gespeichert, Winkelversätze in Grad. */
export type VersatzGlatt = [laengs: number, quer: number, dw: number, dlEin: number, dlAus: number];
export type VersatzEcke = [laengs: number, quer: number, dwEin: number, dlEin: number, dwAus: number, dlAus: number];
export type VersatzZeile = VersatzGlatt | VersatzEcke;
export type Mischart = 'rahmenRest' | 'koordinaten' | 'linear';
export interface Regler {
  id: Id<'rg'>; besitzer: Id<'fig'> | Id<'sz'>; name: string;
  art: 'linie' | 'kreis';
  bereich: [number, number];             // Kreis: [0, 360]
  standard: number;                      // Ruhestelle
  einheit: 'grad' | 'anteil' | 'L' | 'L/s' | 's' | 'figur' | 'eins';   // 'figur': Länge in Figur-Einheiten wie in seinem SVG
                                         // (Knochen.verschiebung, Biegeachse.abstand); 'eins': Zahl ohne Einheit
  raster: number;                        // Fangraster der Leiste (Kopf 0,5; sonst Bereich/200)
  ausgleich: Feder;                      // Ausgleich bei Sprüngen des Solls
  hoechsttempo?: number;                 // Einheiten je Sekunde (Kopf 160)
  nachlauf?: number;                     // s, 0 bis 0,5, Standard 0: der Ausgleich nach einem Posenwechsel beginnt so viel später (16 b)
  spiegel?: Spiegelregel;
  rolle?: string;                        // 'kopf.theta', 'koerper.psi', 'knochen.winkel', 'pose.gewicht', 'zyklus.phase',
                                         // 'feder.ausgang', 'stauchung', 'spiel';
                                         // 'spannung' (0 bis 1, Standard 1), 'spannung.<rolle>' (multipliziert, für Knochen dieser
                                         // Rolle; 16 h); 'charakter.schwer', 'charakter.wabbelig', 'charakter.tollpatschig'
                                         // (−1 bis 1, Standard 0; 16 i)
  herkunft: Herkunft;
}
/** gespiegelte Hälfte: Kreisregler rechnen w mit ab < w < um, Linienregler w mit ab ≤ w < um als um − w gespiegelt */
export interface Spiegelregel {
  ab: number; um: number;                // Ozzy: θ 180, 360; ψ −90, 0
  achseX: number;                        // Spiegelachse in Figur-Einheiten
  paare: [Id<'teil'>, Id<'teil'>][];     // A ↔ B
  umnummern: { teil: Id<'teil'>; folge: number[] }[];   // Anker eines Teils, das sich selbst spiegelt (Nase)
  reihenfolgeTauschen: boolean;          // in der zweiten Hälfte tauschen Paare ihren Platz in der Malreihenfolge
  regler?: { regler: Id<'rg'>; um: number }[];   // in der gespiegelten Hälfte mitgespiegelt (Wert um − w); Ozzys ψ: θ um 360,
                                                 // Nicken und Kopf schief um 0 (Befund 8)
}
export interface Bindung {
  id: Id<'bd'>; teil: Id<'teil'>;
  achsen: [Id<'rg'>] | [Id<'rg'>, Id<'rg'>];   // zwei Achsen: Kreuzschlüssel oder Feld
  wirkung: 'ansicht' | 'zusatz';         // Gestalt ersetzen oder Versatz addieren
  mischart: Mischart;
  periodisch: boolean;                   // nur Kreisregler
  /** Listen je Bereich (Übernahme, 6.2 Nr. 5; Datei auf der gespiegelten Hälfte, 4.7). Wo Abschnitte liegen, wirkt die Spiegelregel nur
   *  auf Malreihenfolge, Wechsel und mitgespiegelte Regler, nie auf die Gestalt; ohne Abschnitte gilt sie als Ganzes */
  abschnitte?: BindungsAbschnitt[];
  spitzen?: Spitzenfuehrung[];
  herkunft: Herkunft;
}
export type BindungsAbschnitt =
  | { von: number; bis: number; art: 'liste'; liste: ListenEintrag[] }   // Einträge dürfen außerhalb [von, bis] liegen (Steigungen)
  | { von: number; bis: number; art: 'gespiegelt'; bindung: Id<'bd'>; um: number };   // Spiegel der Bindung bei um − w
/** Verweis statt Kopie: einen gespiegelten Eintrag rechnet der Bauplan aus dem genannten Schlüssel des Partners (gespiegelt und
 *  umnummeriert) */
export interface ListenEintrag { schluessel: Id<'sl'>; an: number; gespiegelt?: true }
/** ruht nach der Spitzenregel (4.4), gerechnet in form/spitzen.ts, nie gespeichert (Befund 13). gespiegelt: Spitzen und Regel der
 *  Partnerbindung im gespiegelten Bereich, Rahmen aus den gespiegelten Einträgen bei von und bis (Ozzy: 270° bis 315°,
 *  raster.ts:912–920) */
export interface Spitzenfuehrung { von: number; bis: number; anker: Id<'an'>[]; rahmenVon: Id<'sl'>; rahmenBis: Id<'sl'>; gespiegelt?: true }
export interface Schluessel {
  id: Id<'sl'>; bindung: Id<'bd'>;
  an: [number] | [number, number];       // Stelle auf den Achsen der Bindung
  art: 'form' | 'falte';
  gestalt?: Form;                        // Bindung mit Wirkung 'ansicht'
  versatz?: VersatzZeile[];              // Bindung mit Wirkung 'zusatz'
  herkunft: Herkunft;
  grund?: string;                        // wozu der Schlüssel da ist (Statuszeile, Leiste)
  vorlage?: Id<'vl'>;                    // Herkunft 'vorlage'
  stuetze?: true;                        // formt nur die Steigung (Anschluss aus der Übernahme), steht nicht auf der Leiste
}
export interface Wechsel {
  id: Id<'we'>; figur: Id<'fig'>;
  regler: Id<'rg'>; an: number; richtung: 'ab' | 'bis';   // gilt für Werte ≥ an ('ab') oder ≤ an ('bis')
  breite: number;                        // 0 = hart; sonst weiche Deckung über so viele Einheiten des Reglers
  art: 'ueber' | 'unter' | 'sichtbar' | 'unsichtbar';
  teil: Id<'teil'>;
  bezug?: Id<'teil'>;                    // 'ueber', 'unter': direkt über oder unter diesem Teil
  herkunft: Herkunft;
}
// Teile tauschen sind zwei Wechsel an derselben Stelle mit derselben Breite, einer 'unsichtbar', einer 'sichtbar' (16 l)

// ---------- typen/knochen.ts ----------
export interface Knochen {
  id: Id<'kn'>; figur: Id<'fig'>; name: string;
  eltern?: Id<'kn'>;
  gelenk: Punkt;                         // Ruhelage in der Grundform
  winkel: Id<'rg'>;                      // Knochenwinkel gegen die Ruhe (Grad); bei Biegeachsen die Richtung der Sehne
  verschiebung?: [Id<'rg'>, Id<'rg'>];   // x, y im Eltern-Rahmen (Kopf am Hals)
  anheftung?: Anheftung;
  achse?: Biegeachse;
  rolle?: string;                        // 'ruecken', 'hals', 'kopf', 'bein.vorn.rechts', 'schwanz', 'ohr.a'
  gepinnt?: true;
  herkunft: Herkunft;
}
/** das Gelenk reitet auf der gemorphten Elternform: gewichtetes Mittel dieser Anker, starre MLS */
export interface Anheftung { teil: Id<'teil'>; anker: Id<'an'>[]; gewichte: number[] }
/** Bézier-Achse von der Wurzel zum Ende mit fester Länge (Port von rueckgratBauen); zugleich die IK */
export interface Biegeachse {
  laenge: number;
  abstand: Id<'rg'>;                     // Abstand Wurzel–Ende, höchstens laenge
  biegungWurzel: Id<'rg'>;               // Grad gegen die Sehne
  biegungEnde: Id<'rg'>;                 // Grad gegen die Sehne (Sohle)
  beugung: 1 | -1;
  boden: boolean;                        // das Ende geht nie unter den Boden
  rMin: number;                          // kleinster Krümmungsradius (Prototyp: halbe Beinbreite × FALTEN, haltung.ts:779)
}
/** Biegeachsen nehmen Gewichte in derselben Struktur wie gewichtete Teile (Befund 17): Die Achse wirkt am Anker als örtlicher
 *  Rahmen bei u (Lage auf der Achse plus Versatz quer, gedreht mit der Tangente; u ist abgeleitet: Projektion auf die Ruheachse,
 *  nie gespeichert), der Elternknochen starr. */
export interface Aufhaengung {
  id: Id<'af'>; teil: Id<'teil'>;
  art: 'starr' | 'achse' | 'gewichte';
  knochen: Id<'kn'>[];                   // starr: genau einer; achse: [Achse, Eltern]; gewichte: bis vier je Anker
  gewichte?: [knochen: number, gewicht: number][][];   // je Anker bis vier Paare (Index in knochen), Summe 1; bei 'achse'
                                                       // [[0, w], [1, 1 − w]] (w Anteil der Achse); fehlt: alle w = 1
  griffe?: (GriffSatz | 'erben')[];      // je Anker; 'erben': die Griffe folgen der Abbildung ihres Ankers (auch bei 'achse');
                                         // eine Marke statt null, damit 3.5 Nr. 4 („kein null“) ohne Ausnahme gilt
  mischung: 'drehzentren' | 'linear';    // bei 'achse' wie bei Gewichten
  gepinnt: Id<'an'>[];
  herkunft: Herkunft;
}
/** glatter Anker: ein Satz für das Griffpaar; Ecke: je Griff einer */
export type GriffSatz =
  | { paar: [knochen: number, gewicht: number][] }
  | { ein: [knochen: number, gewicht: number][]; aus: [knochen: number, gewicht: number][] };

// ---------- typen/posen.ts ----------
export interface Schicht {
  id: Id<'sch'>; figur: Id<'fig'>; name: string; ordnung: string;
  art: 'ersetzen' | 'addieren';
  regler: Id<'rg'>[];                    // Maske: diese Regler stellt die Schicht
  physik: boolean;                       // Schicht Physik: immer oben, nie posiert
  herkunft: Herkunft;
}
export interface Pose {
  id: Id<'po'>; schicht: Id<'sch'>; name: string; ordnung: string;
  gruppe?: string;                       // Gruppe der Posen-Reihe: 'stehen', 'gang', 'sprung', 'panne', 'erholung', 'laune'
  grundform?: true;                      // die erste Posenkarte
  in?: Id<'ue'>;                         // Zwischenpose eines gestalteten Übergangs
  werte: [Id<'rg'>, number][];           // sortiert nach Kennung
  kreuz?: { achse: Id<'rg'>; an: number; werte: [Id<'rg'>, number][] }[];   // Werte, die von einem anderen Regler abhängen
  gewicht: Id<'rg'>;                     // Gewicht dieser Pose (Posenkorrekturen hängen daran)
  verweilen?: Id<'zy'>;
  // Spannung ist ein Regler der Figur (Rolle 'spannung'); eine Pose setzt sie über `werte` (16 h)
  herkunft: Herkunft;
}
export interface Uebergang {
  id: Id<'ue'>; schicht: Id<'sch'>;
  von: Id<'po'> | 'jede'; nach: Id<'po'> | 'jede';   // 'jede → jede' trägt den Standard der Schicht (0,7 s, 0 %; die Schicht
                                                      // legt ihn beim Anlegen an); Vorrang 4.4
  art: 'standard' | 'ueber' | 'gestaltet' | 'gesperrt' | 'regie';
  feder?: Feder;                         // Standard je Paar
  ueber?: Id<'po'>[];
  variante?: { name: string; gewicht: number };
  unterbrechen: 'sofort' | 'halt' | 'nie';
  umkehrbar: boolean;
  nachklang: number;                     // Sekunden, in denen Zusatzbewegungen ausklingen
  takt?: Taktleiste;                     // 'gestaltet' und 'regie'
  herkunft: Herkunft;
}
export interface Taktleiste {
  abschnitte: TaktAbschnitt[];
  zusatz: Zusatzbewegung[];
  steht: StehBalken[];
  marken: Marke[];
  spuren: Spur[];                        // jeder gestaltete Übergang und Regie: Spuren beliebiger Regler, auch der Spannung (16 h)
}
export interface TaktAbschnitt { nach: Id<'po'>; dauer: number | { bis: string; hoechstens: number }; kurve: Kurve }
export interface Zusatzbewegung { art: string; von: number; bis: number; staerke: number | { aus: string }; daten: ArtDaten }
export interface StehBalken { rolle: string; von: number; bis: number }   // 'pfoten.hinten', 'pfoten.alle', 'hintern'
export interface Marke { bei: number; ereignis: string; klang?: Id<'kl'>; chance?: number }
export interface Spur { regler: Id<'rg'>; punkte: [zeit: number, wert: number, kurve: Kurve][] }
export interface Zyklus {
  id: Id<'zy'>; figur: Id<'fig'>; name: string;
  phase: Id<'rg'>;                       // Kreisregler 0 bis 1
  antrieb: 'zeit' | 'weg';
  frequenz?: number;                     // Hz bei Antrieb Zeit
  schritt?: number;                      // L je Umlauf bei Antrieb Weg
  zweite?: Id<'rg'>;                     // zweite Achse eines Felds (Gang: Tempo)
  zeilen: ZyklusZeile[];
  herkunft: Herkunft;
}
export interface ZyklusZeile {
  an: number;                            // Stelle auf der zweiten Achse (ohne zweite Achse: 0)
  posen: { bei: number; pose: Id<'po'> }[];
  kontakte: { rolle: string; von: number; bis: number }[];
}

// ---------- typen/physik.ts ----------
export interface PhysikChip {
  id: Id<'ch'>;
  an: Id<'teil'> | Id<'kn'> | Id<'rg'> | Id<'fig'> | Id<'di'>;
  art: string;     // 'schwingen' | 'kette' | 'stauchen' | 'ruhigHalten' | 'fest' | 'lose' | 'gelenk' | 'wasser' | 'teilchen' | 'gelee'
  aktiv: boolean;
  feder: Feder;
  ausgang?: Id<'rg'>;                    // Regler, in den die Feder schreibt
  mehr: { schwerkraft?: number; wind?: number; grenzen?: [number, number]; spitze?: number };
  daten: ArtDaten;
  herkunft: Herkunft;
}
/** Hülle für die Welt; liegt hier, weil das Körpermodell sie nennt; vertrag/welt.ts nimmt sie von hier */
export type Huelle =
  | { kreis: { mitte: Punkt; r: number } } | { kapsel: { a: Punkt; b: Punkt; r: number } }
  | { vieleck: { punkte: Punkt[]; rundung: number } } | { kette: { punkte: Punkt[]; schleife: boolean } };
/** Körpermodell einer Figur (Befund 6): ein Datensatz je Figur, nicht in den Daten eines Bausteins, weil eine Figur in vielen Szenen und
 *  Probe-Projekten steht. Bausteine (vierbeiner, schlaefer) nehmen es von der Figur ihres Dings; PhysikPlan.huellen je Figur daraus.
 *  Hüllen in Figur-Einheiten der Grundform; die Höchstkraft jedes Motor-Gelenks ist der Wert der Spannung (16 h). */
export interface Koerpermodell {
  id: Id<'km'>; figur: Id<'fig'>;
  koerper: { rolle: string;                              // 'rumpf.vorn', 'rumpf.hinten', 'kopf'
             knochen: Id<'kn'>; huelle: Huelle; masseAnteil: number;
             gelenk?: { an: string; punkt: Punkt; grenzen?: [number, number] };   // Motor-Gelenk zum Körper der Rolle `an`
             abweichung?: { regler: Id<'rg'>; groesse: 'winkel' | 'laengs' | 'quer' }[] }[];
  /** laenge: gezeichnete Länge; Vorspannung: beim Gewichtsanteil des Beins gilt genau sie (4.5) */
  federbeine: { rolle: string; koerper: string; achse: Id<'kn'>; von: Punkt; laenge: number; feder: Feder }[];
  glieder: { rolle: string; knochen: Id<'kn'>; huelle: Huelle; an: string; punkt: Punkt; grenzen?: [number, number] }[];   // nur im Sturz
  herkunft: Herkunft;
}

// ---------- typen/bild.ts ----------
export interface Verbindung {
  id: Id<'vb'>; figur: Id<'fig'>;
  a: Id<'teil'> | Id<'gr'>; b: Id<'teil'> | Id<'gr'>;
  art: 'verschmelzen' | 'fuge';
  mass: Wert;                            // Stärke der weichen Vereinigung oder Breite der Fuge (Figur-Einheiten)
  nachKante: boolean;                    // Vereinigung nach Kantenrichtung (sminN des Prototyps)
  herkunft: Herkunft;
}
export interface Effekt {
  id: Id<'ef'>; besitzer: Id<'fig'> | Id<'sz'>;
  art: string;                           // Liste in studio-format/src/arten/effekte.ts
  aktiv: boolean;
  wo: (Id<'teil'> | Id<'gr'> | Id<'fig'> | 'welt' | 'kamera')[];   // an Teilen mit `wieGezeichnet` wirkt nur, was `aufGezeichnet`
                                                                    // der Art erlaubt (30 d); Kontakt- und Bodenschatten
                                                                    // sind 'nurFlorian' wie die übrigen Effekte (Befund 9)
  staerke: Wert; weichheit: Wert;
  profil?: [abstand: number, wert: number][];
  rauschen?: { koernung: number; tempo: number };
  zeit?: 'fliessend' | 'gestuft';
  daten: ArtDaten;
  herkunft: Herkunft;
}

// ---------- typen/ton.ts ----------
export interface KlangChip {
  id: Id<'kc'>; an: Id<'teil'> | Id<'fig'> | Id<'di'> | Id<'ue'>;
  klang: Id<'kl'>;
  ausloeser: { marke: string } | { kontakt: { mindest: number } } | { zustand: string } | { draht: Id<'dr'> };
  lautstaerke: Wert | { aus: string };
  aktiv: boolean;
  herkunft: Herkunft;
}

// ---------- typen/welt.ts ----------
export interface Welt {
  id: Id<'welt'>; name: string;
  schwerkraft: number;                   // L/s²
  huegel: Id<'fig'>;                     // Figur, deren Fläche der Weltpfad ist
  rad: { radius: number; gewicht: number | 'boden'; lagerreibung: number; griff: { feder: Feder; hoechstkraft: number } };
  stoffe: Stoff[];
  standardStoff: string;
  herkunft: Herkunft;
}
export interface Stoff { name: string; haftung: Wert; rollwiderstand: number; abprall: number }
export interface Szene {
  id: Id<'sz'>; name: string; datei: string;
  welt: Id<'welt'>; saat: number;
  rahmen?: Id<'di'>; kamera?: Id<'di'>; musik?: Id<'di'>;
  herkunft: Herkunft;
}
export interface Ding {
  id: Id<'di'>; szene: Id<'sz'>; name: string;
  figur: Id<'fig'>;                      // Pflicht (16 d): Rahmen, Kamera und Musik sind Figuren ohne Teile (Regler, Schichten,
                                         // Posen, Übergänge); die Uhr ist ein Baustein am Ding des Rahmens
  art?: string;                          // Ding-Art für Regeln: 'duftstelle', 'pfuetze', 'stamm'
  rolle: 'figur' | 'fest' | 'lose' | 'zone' | 'bild' | 'rahmen';
  lage: { winkel: number; hoehe: number; drehung: number };   // auf dem Hügel: Grad vom Körbchen, L über dem Rand
  breite?: number;                       // Zone: Bogen in Grad
  stoff?: string;
  ebene: string;
  herkunft: Herkunft;
}

// ---------- typen/logik.ts ----------
export interface Baustein {
  id: Id<'bs'>; art: string; an: Id<'di'>;
  regler: Record<string, Wert>;          // Grundwert jedes Kanals (16 e): eine Regler-Kennung gilt samt Draht und Hand, sonst die Zahl
  posen: Record<string, Id<'po'>>; daten: ArtDaten;
  herkunft: Herkunft;
}
export type Messwert = `${Id<'bs'>}.${string}` | `${Id<'di'>}.${string}`;
export interface Draht {
  id: Id<'dr'>; besitzer: Id<'fig'> | Id<'sz'>;
  quelle: Id<'rg'> | Messwert; ziel: Id<'rg'>;
  kennlinie: [ein: number, aus: number][];   // aufsteigend nach ein, außerhalb festgehalten
  kurve: 'weich' | 'linear';             // weich = PCHIP
  spiegel?: { ab: number; um: number; negieren: boolean };   // gespiegelte Hälfte der Quelle (Kreisregler ab < w < um,
                                                             // Linienregler ab ≤ w < um): Eingabe um − w, Ausgabe negiert (Befund 1)
  glaetten: number;                      // Zeitkonstante in s, 0 = keine
  herkunft: Herkunft;
}
export type Band = 'koerper' | 'regie' | 'spieler' | 'laune' | 'grund';
export type Vergleich = '=' | '!=' | '<' | '<=' | '>' | '>=';
export type Wertquelle = { messwert: Messwert } | { zustand: Id<'bs'> } | { regler: Id<'rg'> } | { zaehler: Id<'bs'> };
export interface Bedingung { links: Wertquelle; vergleich: Vergleich; rechts: number | string; rueckweg?: number }
export type Aktion =
  | { tun: 'pose'; ding: Id<'di'>; pose: Id<'po'>; variante?: string }
  | { tun: 'befehl'; baustein: Id<'bs'>; befehl: string; wert?: number }
  | { tun: 'klang'; klang: Id<'kl'>; lautstaerke?: number | { aus: Messwert } }
  | { tun: 'effekt'; effekt: Id<'ef'>; staerke?: number | { aus: Messwert } }
  | { tun: 'zaehler'; zaehler: Id<'bs'>; plus?: number; setzen?: number }
  | { tun: 'zeitlupe'; faktor: number; dauer: number }
  | { tun: 'kamerastoss'; staerke: number }
  | { tun: 'haptik'; staerke: 'leicht' | 'mittel' | 'stark' }
  | { tun: 'launeBeenden' }
  | { tun: 'zeigen' | 'verbergen'; ding: Id<'di'> }
  | { tun: 'stoss'; ding: Id<'di'>; kraft: Punkt };
interface RegelBasis {
  id: Id<'re'>; szene: Id<'sz'>;
  geltung: { art: string } | { ding: Id<'di'> };   // für eine Ding-Art oder ein einzelnes Ding
  band: Band; ordnung: string; aktiv: boolean;
  herkunft: Herkunft;
}
export interface RegelSobald extends RegelBasis {
  satz: 'sobald'; ereignis: string; falls: Bedingung[]; dann: Aktion[]; hoechstensAlle?: number;
}
export interface RegelSolange extends RegelBasis {
  satz: 'solange'; wenn: Bedingung[]; halte: { kanal: string; wert: number | string }[]; mindestens?: number;   // Kanal '<Ding>.<name>'
}
export interface RegelLaune extends RegelBasis {
  satz: 'laune'; name: string;
  wenn: { ereignis: string } | { chanceJeSekunde: number };
  falls: Bedingung[];
  haeufigkeit: { basis: number; launenRegler?: string };   // Launen-Regler des Vierbeiners: 'neugier', 'mut', 'sturheit', 'energie',
                                                          // 'verfressenheit' („Charakter“ heißen nur die drei Regler der Figur)
  ankuendigung: { pose: Id<'po'>; dauer: number };
  wirkung: { soll: [kanal: string, wert: number | string][]; pose?: Id<'po'>; dauer: [number, number] };
  ende: ({ zeit: 'um' } | { ereignis: string })[];
  danach?: Id<'po'>;
  ruhezeit: number;
}
export type Regel = RegelSobald | RegelSolange | RegelLaune;
export interface Aufgabe {
  id: Id<'au'>; szene: Id<'sz'>; text: string; ordnung: string;
  vorlage: 'mal' | 'ohne' | 'waehrend' | 'vor' | 'erreicht';
  ereignis?: string; anzahl?: number; zustand?: string; bis?: string; messwert?: Messwert; wert?: number;
  beweis?: string;                       // 'laeufe/<name>.json'
  herkunft: Herkunft;
}

// ---------- typen/lauf.ts ----------
export interface LaufDatei {
  format: 'studio-lauf'; version: 1;
  szene: Id<'sz'>; inhalt: string;       // Revision des Projekts beim Aufnehmen
  saat: number; takte: number;
  eingaben: EingabeEintrag[];            // nur Änderungen, mit Taktnummer
  pruefsummen: [takt: number, summe: number][];   // alle 60 Takte
  merker: { takt: number; notiz: string }[];
}
export interface EingabeEintrag { takt: number; finger?: { an: boolean; x: number; y: number }; tippen?: Punkt; knopf?: string }

// ---------- typen/text.ts (Befund 7; gebraucht ab M7.6) ----------
/** Glyphentabelle einer Schrift, liegt in projekt.json (Block 'kern'). Quadratische Stücke exakt kubisch: c1 = p0 + ⅔·(q − p0), c2 = p2 + ⅔·(q − p2);
 *  Anker nach der Glätte-Regel (3.4); `innen`: Kontur eines Innenraums (o, e, a), erkannt an der Umlaufrichtung */
export interface Schrift {
  id: Id<'sf'>; name: string; quelle: string;           // 'assets/fonts/lobster/Lobster-Regular.ttf'
  geviert: number;                                       // Einheiten je Geviert
  glyphen: { zeichen: string; vorschub: number; konturen: { form: Form; innen: boolean }[] }[];   // nach zeichen sortiert
  unterschneidung: [links: string, rechts: string, wert: number][];
  herkunft: Herkunft;
}

// ---------- arten/bausteine.ts: Daten der Art 'vierbeiner' (M5.0), Auszug ----------
/** Das Körpermodell nimmt der Baustein von der Figur seines Dings (Koerpermodell, typen/physik.ts). Kanäle (Baustein.regler) unter
 *  anderem Wunschtempo, Bremskraft, Sprunghöhe und wendenNach (s, Standard 0,3: so lange jenseits des Scheitels, bis er wendet; A17). */
interface VierbeinerDaten {
  springenAufTippen: boolean;            // Standard aus; an: ein Tippen neben Ozzy löst einen Sprung aus; ein Tippen auf ihn weckt und
                                         // tröstet ihn weiter und springt nie (A17, A21)
}
// weitere Arten mit Daten aus dem Entscheidungsblatt: 'zaehler' mit den Messwerten 'einer' und 'zehner', 'aufgaben' (M7.0);
// 'rueckblick' (M8.0)

// ---------- typen/dokument.ts ----------
export type Block = 'kern' | 'knochen' | 'posen' | 'physik' | 'bild' | 'logik' | 'welt' | 'ton';
/** Familien registrierter Arten (arten/register.ts) */
export type ArtFamilie = 'baustein' | 'chip' | 'effekt' | 'zusatz';
/** Schlüssel einer Art im Register, in `Versionen.arten` und im Block ihrer Migrationen ('art:<familie>:<art>', 3.4): '<familie>:<art>',
 *  etwa 'effekt:dicke' oder 'baustein:vierbeiner'. Die Familie gehört dazu, weil derselbe Name in zwei Familien vorkommt (Chip und Effekt
 *  'wasser', M10); ein Schlüssel nur mit dem Namen ist ein Typfehler und fällt durch das Schema */
export type ArtSchluessel = `${ArtFamilie}:${string}`;
export interface Versionen { bloecke: Record<Block, number>; arten: Record<ArtSchluessel, number> }
export interface DatensatzTabelle {
  prj: Projekt; vl: Vorlage; kl: Klang; sf: Schrift;
  fig: Figur; teil: Teil; gr: Gruppe;
  rg: Regler; bd: Bindung; sl: Schluessel; we: Wechsel;
  kn: Knochen; af: Aufhaengung; km: Koerpermodell;
  sch: Schicht; po: Pose; ue: Uebergang; zy: Zyklus;
  ch: PhysikChip; vb: Verbindung; ef: Effekt; kc: KlangChip;
  welt: Welt; sz: Szene; di: Ding;
  bs: Baustein; dr: Draht; re: Regel; au: Aufgabe;
}
export type DatensatzTyp = keyof DatensatzTabelle;
export type Datensatz = DatensatzTabelle[DatensatzTyp];
export type DateiArt = 'projekt' | 'figur' | 'szene';
export interface Datei {
  format: 'studio'; art: DateiArt; versionen: Versionen;
  datensaetze: { [T in DatensatzTyp]?: Record<string, DatensatzTabelle[T]> };
}
/** im Speicher: alle Datensätze aller Dateien flach nach Kennung; Datensätze sind unveränderlich */
export interface Dokument { versionen: Versionen; datensaetze: ReadonlyMap<string, Datensatz> }
/** liegt im Format, nicht im Store: Die Laufzeit (`bauen`) und das Spiel (Live-Diffs) nehmen ihn und dürfen den Store nicht importieren */
export interface Diff { neu: Datensatz[]; weg: Datensatz[]; geaendert: [vorher: Datensatz, nachher: Datensatz][] }
// Ergebnisse (4.1): die Typen hier, die Funktionen in pruefen.ts, laden.ts und svg/importieren.ts (M1.2); niemand legt sie neu an
/** eine Meldung von `pruefen` (zod und Querregeln, 3.6): betroffener Datensatz und Feld, wo es sie gibt; der Store reicht ihn weiter */
export interface Fehler { id?: string; feld?: string; text: string }
/** Ergebnis von `laden`: eine neuere Datei oder eine unbekannte Art öffnet nur zum Lesen, mit Meldung; `migriert`: gelaufene Migrationen */
export interface LadeErgebnis { dokument: Dokument; nurLesen: boolean; meldungen: string[]; migriert: string[] }
/** Ergebnis von `svgImportieren`: Importbericht und fast glatte Anker, die ⇧C glatt machen kann (Glätte-Regel, 3.4) */
export interface ImportErgebnis { dokument: Dokument; bericht: string[]; fastGlatt: { teil: Id<'teil'>; anker: number }[] }

// ---------- typen/entwurf.ts (vom Store erfüllt, von Handgriffen benutzt) ----------
export interface Entwurf {
  hole<T extends DatensatzTyp>(id: Id<T>): DatensatzTabelle[T] | undefined;
  alle<T extends DatensatzTyp>(typ: T): readonly DatensatzTabelle[T][];
  setze(d: Datensatz): void;             // neu oder ersetzen, immer ein neues Objekt
  loesche(id: string): void;
  kennung<V extends Vorsilbe>(v: V): Id<V>;   // aus dem Zufall, den der Store bekommt (3.3)
  ziel(id: string): void;                // der Datensatz, auf den die Geste zielt: bei Quelle florian bekommt nur er „dein“ (3.6 Nr. 10)
}
```

**Stelle eines Ankers.** Anker sind keine Datensätze. Ihre Kennungen stehen in `Teil.anker`; jede `Form` und jede `VersatzZeile[]` hat
genau so viele Zeilen in derselben Reihenfolge. Ein neuer Anker ändert in einer Transaktion `Teil.anker` und jede Form des Teils.

### 3.3 Kennungen

- Form `<vorsilbe>_<10 Zeichen aus 0–9, A–Z, a–z>`, geprüft mit `^[a-z]{2,4}_[0-9A-Za-z]{10}$`. Fest über Umbenennen.
- `studio-format` kennt keinen globalen Zufall (30 a): `kennungAusZahlen(v, zahlen: Uint32Array)` macht aus Zufallszahlen eine
  Kennung (Basis 62, Verwerfen gegen Modulo-Schieflage). Der Store bekommt den Zufall übergeben (`new Store(dok, { zufall, pruefen })`):
  Editor und Server `crypto.getRandomValues`, Tests ein Strom mit Saat. Der Store prüft Kollisionen.
- In Übernahme und Inhalt-Skripten stabil aus einem Pfad: `kennungAusPfad('teil', 'ozzy/teil/kopfA')` sind die ersten 10 Zeichen der
  Basis-62-Darstellung von SHA-256 des Pfads (eigene Umsetzung in `studio-rechnen/src/sha256.ts`). Ein zweiter Lauf erzeugt dieselben
  Kennungen; Diffs bleiben klein.
- Reihenfolgen (`ebene`, `ordnung`) sind Bruchindizes aus `fractional-indexing`; nie Positionen in einem Feld.

### 3.4 Versionen und Migrationen

- **Versionen je Block** (`kern`, `knochen`, `posen`, `physik`, `bild`, `logik`, `welt`, `ton`) und **je Art** (jede Bausteinart,
  Chipart, Effektart und Art der Zusatzbewegung). Fassung 1 schreibt überall Version 1. Jede Datei trägt die Versionen im Kopf.
  **Arten heißen mit ihrer Familie:** In `Versionen.arten`, im Register und im Block ihrer Migrationen ist der Schlüssel einer Art
  `<familie>:<art>` (`ArtSchluessel`, 3.2; Familien `baustein`, `chip`, `effekt`, `zusatz`; Name in kleinCamelCase), etwa `effekt:dicke`
  oder `baustein:vierbeiner`, weil derselbe Name in zwei Familien vorkommt (Chip und Effekt `wasser`, M10). Typ und Schema lassen keinen
  Schlüssel ohne Familie zu. Im Datensatz (`Effekt.art`, `PhysikChip.art`, `Baustein.art`, `Zusatzbewegung.art`) steht nur der Name.
  **Der Kopf einer Datei nennt in `versionen.arten` nur die Arten, die die Datei nutzt**; sonst öffnete eine ältere Fassung eine Datei
  ohne die neue Art unnötig nur zum Lesen.
- **Migration:**
  `interface Migration { block: Block | ArtBlock; von: number; nach: number; schritt(roh: unknown): unknown; pruefdatei: string }`
  mit ``type ArtBlock = `art:${ArtSchluessel}` `` (etwa `art:baustein:vierbeiner`). Beide Typen liegen in `studio-format/src/versionen.ts`,
  weil schon das Register der Arten (M0) sie braucht; `migrationen/register.ts` (M1.2) reicht sie nur weiter
  (`export type { Migration, ArtBlock } from '../versionen'`) und hält die Liste `MIGRATIONEN`. `versionen.ts` hat dazu
  `BLOCK_VERSIONEN` (je Block die Version dieser Fassung), `BLOECKE` (Reihenfolge im Kopf), `ART_FAMILIEN`, `ART_NAME`,
  `istArtSchluessel`, `artBlock(schluessel)`, die Schemas `blockSchema`, `versionSchema`, `artSchluesselSchema`, `versionenSchema`,
  `aktuelleVersionen(arten)` (alle Blöcke, dazu die genannten Arten) und `versionenAbgleichen(datei, aktuell)` mit den Listen `neuer`,
  `unbekannt` und `aelter` (Blöcke in der Reihenfolge von `BLOECKE`, Arten nach Schlüssel); `nurLesenNach(abgleich)` ist wahr, wenn
  etwas neuer oder unbekannt ist. `artEintragen` (4.1) prüft Name, Familie, Version ab 1 und lückenlose Migrationen 1 → 2 → … im Block
  der Art. Nur vorwärts, Version für Version, nie gelöscht, jede mit einer Prüfdatei aus Florians Ozzy.
- **Grundgesetz 5** (Befund 21): Keine Automatik, keine Sitzung und keine Migration ändert die Gestalt seiner Schlüssel oder löscht sie.
  Migrationen dürfen nur ihre Schreibweise ändern; sie runden nicht und glätten nicht (3.5). Das wird geprüft: Für jeden Datensatz mit
  Herkunft `dein` liegen alle Kurvenpunkte (3.5) vorher und nachher höchstens 1e-6 auseinander (übrig bleibt nur die Umrechnung in
  Winkel und Längen), sonst öffnet Studio die Datei nur zum Lesen und meldet es. Vor jeder Migration kommt die alte Datei in den
  Sicherungsring.
- **Laden** wendet die Migrationen an, prüft mit zod und den Querregeln (3.6). Eine neuere Datei oder eine unbekannte Art öffnet der
  Editor nur zum Lesen, mit Meldung. Nichts wird still weggelassen.
- **Erste Migration `kern 0 → 1`** (`migrationen/kern-0-1.ts`): „kern 0“ ist das Schlüsselformat des Prototyps
  (`docs/look/ozzy-figur/schluessel.json`: `{"version":1,"kopf":[{"teil","w","form":[[px,py,ix,iy,ox,oy]]}]}`). **Erkennung** (30 c):
  Eine Datei ohne Feld `format` mit einer Liste `kopf` ist die Schlüsseldatei des Prototyps; Studio nennt ihr Format „kern 0“, obwohl sie
  `"version": 1` trägt. Die Migration macht daraus Schlüssel-Datensätze mit Herkunft `dein` an der Stelle `w` der Kopfbindung des
  genannten Teils (die Zuordnung Teilname → Bindung steht in `Projekt.quellen`). Jeder Anker wird eine **Ecke mit genau seinen
  Winkeln** (`ankerZeile(…, { glaetten: false })`): Migrationen und Übernahme wenden die **Glätte-Regel** nicht an, weil PCHIP jede kleine
  Änderung zwischen dicht liegenden Schlüsseln verstärkt (3.5). Die Glätte-Regel (Befund 11: glatt nur, wenn beide Griffe höchstens 0,2°
  neben einer Geraden liegen und sich kein Kurvenpunkt um mehr als 0,0002 ändert) gilt beim Einlesen neuer SVGs; fast glatte Anker nennt
  der Importbericht, ⇧C macht sie glatt (seine Entscheidung). Gemessen wird so (`glaetteMass` in `anker.ts`): der Winkel zwischen der
  umgedrehten Richtung des Ein-Griffs und der des Aus-Griffs; die Änderung an Kurvenpunkten ist 225/512 mal die größere Verschiebung
  eines Griffs, das Höchste an t = k/8, gleich wo die Nachbarn liegen (`KURVENPUNKT_GEWICHT`). Ein Griff der Länge 0 liegt auf jeder
  Geraden; ein solcher Anker wird beim Einlesen glatt (die Richtung des anderen Griffs bleibt). Die Regel ist mit
  `{ glaetten: false }` abschaltbar. **Griffe der Länge 0** bleiben Länge 0 und bekommen als Richtung vom Anker aus die gegenüber dem
  Gegengriff (wEin = wAus + 180° oder wAus = wEin + 180°; sind beide 0: Ein 180°, Aus 0°). Das ist dieselbe Ecke, die `alsEcke` aus einer
  glatten Zeile mit diesem Griff 0 macht, so dreht beim Mischen kein Griff um 180°; sein Winkel zählt beim Mischen ohnehin nicht (wie
  raster.ts:61–71), und an Kurvenpunkten ändert er nichts. In der Prüfdatei betrifft das 32 Anker. Prüfdatei:
  `studio-format/pruefdaten/prototyp-schluessel-2026-11-20.json` (Kopie seiner Datei vom 20.11.; die Datei selbst wird nur gelesen).
  Tests: 16 Schlüssel (Stand der Prüfdatei), Rückweg Zeile → Kurvenpunkte unter 1e-9, jeder Anker eine Ecke mit genau seinen Winkeln
  (Griffe mit Länge: ihr Winkel; Griffe der Länge 0: die Gegenrichtung, nicht wörtlich wEin = wAus).
- **Fremde Quellen** (`quellen.ts`, Befund 5): `quellenEinsetzen` liest bei jedem Laden die Dateien aus `Projekt.quellen`, erkennt ihr
  Format, wendet `kern 0 → 1` an und setzt die Schlüssel als gewöhnliche Datensätze mit Herkunft `dein` ein, mit festen Kennungen aus
  ihrem Pfad (`kennungAusPfad('sl', '<projekt>/quelle/<teil>/<w>')`): Mit genau diesen Kennungen schreibt die Übernahme die Einträge
  seiner Schlüssel in die Listen der Abschnitte (6.2 Nr. 5), und der Umzug behält sie. Der Server von Studio und der des Spiels tun das
  beim Ausliefern, der Bau der App beim Einbauen ihres Inhalts (M11.2); der Schreiber lässt sie weg (3.1). Der
  **Umzug** („Kopfdrehung übernehmen“, nur Quelle florian; vorläufig keiner, A1) schreibt sie als gewöhnliche `dein`-Datensätze, nimmt
  die Quelle aus `projekt.json` und setzt dort den Vermerk `umgezogen` (die Datei). Jede spätere Übernahme, auch der volle Lauf am
  Etappenende, lässt dann die Quelle (6.2 Schritt 1) und den Kopf aus (die Kopfteile aus Schritt 3 und 7, Schritte 5 und 6) und meldet
  das; der Haken auf `schluessel.json` bleibt aus. `schluessel.json` bleibt, wie sie ist.

### 3.5 Deterministisch schreiben

`schreiben(dokument)` liefert je Datei einen Text. Zweimal schreiben ergibt dieselben Bytes; `schreiben(laden(t)) === t` für jede
Datei, die der Schreiber geschrieben hat.

1. Kopf `format`, `art`, `versionen`, dann `datensaetze`; Typen in der Reihenfolge von `DatensatzTabelle`, darin nach Kennung
   (Codepunkte); Felder in der Reihenfolge aus `schema/reihenfolge.ts`; Daten der Arten nach Feldnamen sortiert. Genauer: Felder stehen
   in der Reihenfolge des Typs aus 3.2 (bei Regeln zuerst die Felder von `RegelBasis`, dann `satz`); freie Tabellen nach Codepunkten
   (Datensätze nach Kennung, `Baustein.regler`, `Baustein.posen`, `Versionen.arten`, Daten der Arten auch verschachtelt); Felder ohne
   Wert fallen weg. `ordnen(schema, wert)`, `datensatzOrdnen(d)` und `dateiOrdnen(d)` in `schema/reihenfolge.ts` stellen jeden Wert so
   um; der Schreiber setzt danach nur Einzug und Zahlen. `versionen.arten` nennt nur die Arten, die die Datei nutzt (3.4).
2. Zwei Leerzeichen Einzug. Eine `AnkerZeile`, `VersatzZeile`, ein `Punkt` und jedes Paar einer Kennlinie stehen auf einer Zeile
   (`[a, b, c]`, Komma und Leerzeichen; erkannt am Schema, das Kennlinien-Paar an `kennlinienPaarSchema`); eine Form hat eine Zeile je
   Anker. Wie die übrigen Zahlenfelder umbrechen (`bereich`, `an`, Paare von `breite`, `grenzen`, `Effekt.profil`), legt der Schreiber
   von M1.2 fest; `pruefdaten.test.ts` prüft nur diese Liste.
3. Zahlen werden **nicht gerundet** (Toleranzen unten): Ausgabe mit `String(x)`, der kürzesten Darstellung, die beim Lesen dieselbe Zahl
   ergibt (Beträge unter 1e-6 mit Exponent), `−0` als `0` (`zahlText` in `zahl.ts`); der Schreiber bricht ab bei NaN, ±∞ und Beträgen
   über 1e15 (`ZAHL_GRENZE`; `zahlText` wirft einen RangeError). So ist der Rundweg bitgleich, und keine Mischung hängt an einer Rundung.
4. Fehlende Werte fehlen; kein `null`, ohne Ausnahme (Griffe, die erben, tragen in `Aufhaengung.griffe` die Marke `'erben'`), kein
   `undefined`. Pflichtfelder mit leerem Feld schreiben `[]`.
5. UTF-8 ohne BOM, Zeilenende LF, Zeilenumbruch am Schluss.
6. Atomar: daneben schreiben (`<datei>.tmp-<zufall>`), dann umbenennen (wie `figurSchluessel` im Prototyp).
7. Eine Spielfassung gibt es nicht (Befund 2): Das Spiel lädt dieselben Dateien mit denselben Schemas über seinen Server, nur ohne
   `vorlagen/*.svg` und `laeufe/`; die kleinen Datensätze `Vorlage` bleiben, damit kein Verweis ins Leere zeigt. Fremde Quellen setzt
   sein Server mit demselben Haken ein wie der von Studio (2.4); die App bekommt sie beim Bauen eingesetzt (M11.2). Der Code des Spiels
   liest nie `docs/look/`.
8. Schlüssel mit Herkunft `dein` an Bindungen einer fremden Quelle schreibt der Schreiber nie (3.1, 3.4).

**Toleranzen** (Befund 11, nach der Prüfung neu gerechnet). **Gemessen wird an Kurvenpunkten,** nicht an Griffen: je Kurvenstück
t = 0, 1/8, …, 1 (Anker eingeschlossen); Abweichung = größter Abstand gleicher Stellen (`kurvenAbstand`, 4.1). Das gilt für Parität
(M1, M4), Migration, Ruhe-Wächter und jeden Vergleich mit dem Prototyp. **Warum nichts gerundet wird:** Eine Rundung auf 1/1000 trifft
nicht nur den Anker (bis 0,0007), sondern an Kurvenpunkten auch die Grifflängen (bei t = ½ je Griff 3/8 ihres Fehlers, zusammen rund
0,0011). In der Mischung des Prototyps wird es schlimmer: Faltschlüssel liegen bis 0,07° neben ihrem Nachbarn, und PCHIP verstärkt jede
Änderung dort um das Verhältnis der Abstände; auf 1/1000 verkleinerte Masken haben Griffe unter 0,0005, die gerundet 0 würden, und dann
nimmt die Mischung den Winkel des nächsten Schlüssels (raster.ts:61–71). In der Prüfung des Plans gemessen: bis 0,012 und bis 0,57
Einheiten. Auch 1/100 000 ließe Griffe unter 5e-6 kippen. **Rechnung je Quelle:** Anker und Grifflängen: nur die Umrechnung in Winkel
und Längen und zurück (unter 1e-9); Glätte-Regel: in Übernahme und Migrationen aus (3.4), sonst nur beim Einlesen neuer SVGs und mit ⇧C
(je Punkt höchstens 0,0002, seine Entscheidung); Kopfversatz: dieselbe PCHIP-Regel über dieselben vier Stützstellen, ungerundet;
Halslage: Kennlinie in 0,5°-Schritten, an den Stützstellen exakt (die Parität misst bei ψ 90°, einer Stützstelle); Kopfgelenk: Lage
ungerundet. Die Schwelle der Parität bleibt 0,001, erwartet wird unter 1e-6. Bitgleich bleibt, was bitgleich sein muss: Prüfsumme der
Laufzeit, Rundweg Schreiben–Laden in Bytes.

### 3.6 Regeln, die der Code prüft

`pruefen.ts` prüft beim Laden und im Store nach jeder Transaktion (im Editor; im Spiel nur beim Laden):

1. Jede Form und jeder Versatz einer Bindung hat so viele Zeilen wie das Teil Anker hat; glatte Zeilen 5 Zahlen, Ecken 6; Längen ≥ 0;
   Winkel im Bereich (−180, 180].
2. Ein Teil hat entweder `form` oder genau eine Bindung mit Wirkung `ansicht`.
3. Eine Zusatz-Bindung ist an der Ruhestelle ihrer Achsen null; ein gespeicherter Schlüssel dort muss null sein. Bindungen mit zwei
   Achsen: Schlüssel liegen auf einem Gitter, bei Feldern höchstens drei Stellen je Achse; ein Kreuzschlüssel ist auf Ruhezeile und
   Ruhespalte null (Feldregel, 4.4).
4. Gewichte: höchstens vier Paare je Anker, Summe 1 auf 1e-6, gültige Indizes; bei `achse` genau die Paare [0, w], [1, 1 − w].
5. Drähte bilden keinen Kreis; ein Regler hat höchstens einen Draht. (Einen Kreis meldet auch `ReglerPlan.hinweise`, 4.3; der Bauplan
   rechnet ihn trotzdem in fester Folge.)
6. Eine Pose nennt nur Regler ihrer Schicht.
7. Je Schicht, Paar und Variante höchstens ein Übergang; jede Schicht hat genau einen Übergang `jede → jede`.
8. Verweise zeigen auf vorhandene Datensätze; sonst nur lesen und melden. Ausnahme: Ein Listeneintrag, der auf einen fehlenden
   Schlüssel einer fremden Quelle zeigt, wird ausgelassen und im Prüfer gemeldet (`fehlendeEintraege`, 4.4); das Projekt bleibt
   bearbeitbar. Fehlt ein Schlüssel der Quelle, weil Florian ihn im Prototyp verschoben oder gelöscht hat, ist das kein Fehler der Datei:
   Die neu gestartete Übernahme schreibt danach neue Listen.
9. **Schutzregel:** Jeder Datensatztyp trägt `herkunft` (3.2), die Regel gilt für alle Typen gleich, `Projekt` feldweise (3.2).
   Datensätze mit Herkunft `dein`, gepinnte Werte und das Feld `wieGezeichnet` ändert und löscht nur die Quelle `florian`, und nur sie
   legt Datensätze mit Herkunft `dein` an (einzige Ausnahme: `probeprojektAnlegen` kopiert Dateien samt Herkunft in ein neues
   Probe-Projekt, ohne Store-Schritt, nie nach `content/studio/ozzy/`; M3.2); ebenso Effekte und Chips einer Art mit
   `aufGezeichnet: 'nurFlorian'` an Teilen mit `wieGezeichnet` (30 d). Bindungen einer fremden Quelle und ihre Schlüssel sind im
   Editor bis zum Umzug nur zum Ansehen: Weder `florian` noch `sitzung` ändert sie; nur
   die Übernahme (`automatik`) schreibt dort ihre gebauten Schlüssel neu (Befund 5). Die Quelle `florian` vergibt nur der Server mit
   `STUDIO_FLORIAN=1` gegen einen gültigen Sitzungsschlüssel (Befund 21, 4.9); Skripte schreiben über die Ablage mit Quelle
   `automatik`. Das schützt gegen Versehen, nicht gegen Absicht; gegen alles andere hilft der Sicherungsring.
10. **Herkunftsregel** (Befund 3): „dein“ bekommt genau der Datensatz, auf den Florians Geste zielt (`Entwurf.ziel`): bei einem Zug der
    Schlüssel (oder die Pose, Zwischenpose, Korrekturform), den die Zielregel nennt; bei P und beim Löschen eines Ankers der
    Teil-Datensatz (seine Ankerliste), nicht die Schlüssel; bei einem Wert in den Eigenschaften der Datensatz dieses Werts.
    Folgeänderungen derselben Geste (neue Zeile in jedem Schlüssel, Kennungen, Reihenfolge-Indizes) behalten ihre Herkunft. Weil der
    Teil-Datensatz nach P „dein“ ist, überschreibt keine Automatik seine Ankerliste.
11. Zwei Schlüssel oder Listeneinträge an derselben Stelle einer Liste meldet `pruefen`, außer genau einer davon hat Herkunft `dein`
    (dann ruht der andere, 4.4); PCHIP teilte sonst durch null.
12. **Hüllen** (`Huelle` im Körpermodell), so wie die Welt sie bauen kann (4.5): Vielecke haben 3 bis 8 Punkte, gezählt vor der
    konvexen Hülle (`VIELECK_HOECHSTENS` in `schema/physik.ts`, gleich `VIELECK_PUNKTE` im Vertrag der Welt; `vertrag/welt.test.ts`
    hält beide gleich), Ketten mindestens 2 Punkte, Schleifen mindestens 3. Das Schema der Hülle lehnt alles andere ab, `pruefen`
    meldet es. Ketten sind einseitig (4.5): Eine geschlossene Kette (eine Schleife, auch der Weltpfad aus der Fläche des Hügels) trägt
    nur von außen, wenn sie auf dem Bildschirm (y nach unten) im Uhrzeigersinn läuft; einen anderen Umlaufsinn meldet der Prüfer als
    Hinweis (kein Fehler von `pruefen`), die Datei bleibt bearbeitbar. Das Inhalt-Skript (M5.6) und der Autorig (M9) halten sich an
    diese Grenzen.

---

## 4 Schnittstellen

Die Signaturen sind Verträge: M0 legt sie in den genannten Dateien an, spätere Etappen ändern sie nur im Vertragsschritt (5.1). Was
erst eine spätere Etappe baut, steht seit M0 als Typ: die Klasse `Store` als `StoreVertrag` und `StoreKonstruktor`, `diffVon` und
`schutzVerletzt` als `DiffVon` und `SchutzVerletzt` (`studio-store/src/typen.ts`; M1.5), `zeichnerAnlegen` und `shaderUebersetzen` als
`ZeichnerAnlegen` und `ShaderUebersetzen` (`studio-bild/src/zeichner.ts`; M1.4); die Funktionen aus `studio-format` legt M1.2 an, dazu
`MIGRATIONEN` in `migrationen/register.ts`. Die Typen der Oberfläche (4.8) legt M3.0 an, die von Ton und Autorig (4.10) M7.0 und M9.0,
die Haken der Proben (`pruefhaken.ts`) M1.Z und M3.Z. Alle Funktionen der Laufzeit schreiben in vorab angelegte typisierte Felder und
legen im Bildtakt keinen Speicher an.

### 4.1 Rechnen, Format, Store

```ts
// @ee/studio-rechnen
export function sin(x: number): number;                 // winkel.ts; ebenso cos, tan, asin, acos, atan; exp und log in exp.ts
export function atan2(y: number, x: number): number;    // winkel.ts
export function pow(x: number, y: number): number;      // exp.ts
export function hypot(x: number, y: number): number;    // winkel.ts, aus exp.ts weitergereicht (beide Importe gehen)
export function gradZuRad(g: number): number;           // winkel.ts: (g · π) / 180 mit π als fester Zahl, Rechenfolge des Prototyps
export function radZuGrad(r: number): number;           // winkel.ts: (r · 180) / π; beide rufen kein Math und bleiben beim Port
/** eine PCHIP-Regel überall, die des Prototyps (form.ts:309–338; Befund 1): innen gewichtetes harmonisches Mittel, an den Enden die
 *  einseitige Sekante, außerhalb festgehalten. Ohne `periode` rechnen beide Funktionen mit derselben Reihenfolge der Rechenschritte
 *  bitgleich zu `pchip` des Prototyps, auch bei gleichen Stellen, NaN und ±∞ (ohne Stützstellen NaN; eine Stützstelle: Steigung 0;
 *  `pchipWert` sucht das Stück binär, bei nicht fallenden xs dasselbe Stück wie der Prototyp). Mit `periode` P (Kreisregler) gelten
 *  die Stützstellen als fortgesetzt (… xₙ₋₂ − P, xₙ₋₁ − P | x₀ … xₙ₋₁ | x₀ + P, x₁ + P …): Jede Stelle bekommt die Steigung einer
 *  inneren Stelle, das Nahtstück von xₙ₋₁ bis x₀ + P zählt rechts von xₙ₋₁ und links von x₀ mit derselben Breite und Sekante; ohne
 *  angehängte Schlüssel. Steigungen mit Periode gehören zu `pchipWert(…, periode)` mit derselben Periode: x wird nach [x₀, x₀ + P)
 *  geholt, innen gilt der Wert ohne Periode, dahinter das Nahtstück mit mₙ₋₁ und m₀ (ohne Periode hielte der Wert hinter dem letzten
 *  Schlüssel fest). `pchipSteigungen` wirft einen RangeError bei zu kurzen `ys` oder `aus` und, mit Periode, wenn P nicht positiv und
 *  endlich ist oder xₙ₋₁ − x₀ ≥ P; `pchipWert` prüft im Bildtakt nichts. Stützstellen steigen streng (zwei an derselben Stelle meldet
 *  3.6 Nr. 11). */
export function pchipSteigungen(xs: ArrayLike<number>, ys: ArrayLike<number>, aus: Float64Array, periode?: number): void;
export function pchipWert(xs: ArrayLike<number>, ys: ArrayLike<number>, m: ArrayLike<number>, x: number, periode?: number): number;
export function casteljau(stueck: ArrayLike<number>, t: number, aus: Float64Array): void;          // 8 Zahlen → 2 × 8
/** die reine Zahl nach Wang: ⌈√(0,75 · M / toleranz)⌉ mit M, dem größten Betrag der zweiten Differenzen der Kontrollpunkte, mindestens
 *  1; Faktor 1,25, Maßstab, Zoomstufe und die Grenze von 64 je Stück rechnet der Bauplan (16 k). Ungültige Toleranz oder nicht endliches
 *  Stück: RangeError */
export function wangStueckzahl(stueck: ArrayLike<number>, toleranz: number): number;
/** Bernstein-Gewichte an t = j/stufen, j = 0 … stufen, beide Enden eingeschlossen: (stufen + 1) · 4 Zahlen, je Stelle (1 − t)³,
 *  3(1 − t)²t, 3(1 − t)t², t³; an t = 0 und 1 genau (1, 0, 0, 0) und (0, 0, 0, 1). `stufen` ist die Stückzahl aus `wangStueckzahl`;
 *  `bernstein(8)` sind die Messstellen von `kurvenAbstand` */
export function bernstein(stufen: number): Float64Array;
/** je Anker 6 Zahlen absolut (p, Ein-Griff, Aus-Griff); größter Abstand gleicher Stellen bei t = 0, 1/8, …, 1 je Kurvenstück (3.5);
 *  geschlossen so viele Stücke wie Anker, offen eines weniger, eine offene Form mit einem Anker wird an ihm gemessen; NaN irgendwo gibt
 *  NaN (eine Parität besteht nie still); ungleiche Ankerzahl oder eine Länge, die kein Vielfaches von 6 ist: RangeError */
export function kurvenAbstand(a: ArrayLike<number>, b: ArrayLike<number>, geschlossen: boolean): number;
export function sha256(daten: Uint8Array): Uint8Array;   // eigene Umsetzung (30 a): Kennungen aus Pfaden, Revisionen
export function utf8(text: string): Uint8Array;          // sha256.ts: Bytes genau wie TextEncoder (eine einzelne Ersatzhälfte wird
                                                         // U+FFFD); ohne DOM und ohne Node-Typen gibt es TextEncoder nicht
/** zahl(): eine 32-Bit-Zahl des Stroms, Auflösung 2⁻³²; ganz(n): ganz in [0, n), n bis 2³², ohne Modulo-Schieflage; setzen lehnt einen
 *  Zustand aus vier Nullen ab */
export interface Strom { zahl(): number; ganz(n: number): number; stand(aus: Uint32Array, i: number): void; setzen(von: Uint32Array, i: number): void }
/** xoshiro128**; Saat (eine sichere ganze Zahl, sonst RangeError) und Kennung gemischt nach dem Vorbild von MurmurHash3 (x86, 128 Bit),
 *  nur mit Math.imul, Verschiebungen und `| 0`; die Folgen sind in zufall.test.ts eingefroren, weil Lauf-Dateien an ihnen hängen */
export function strom(saat: number, kennung: string): Strom;
/** 32 Bit nach dem Vorbild von MurmurHash3 (x86, 32 Bit) über die Bytes, wie sie im Speicher liegen; die Länge jedes Felds zählt mit;
 *  `start` (Standard 0) etwa die Summe des vorigen Takts; pruefsumme([]) = 0; die Werte sind im Test eingefroren */
export function pruefsumme(felder: readonly ArrayBufferView[], start?: number): number;
export const ZAHL_GRENZE = 1e15;                         // zahl.ts: größter Betrag, den der Schreiber annimmt
export function zahlText(x: number): string;            // Schreiber (3.5 Nr. 3): String(x), −0 als 0, ungerundet; NaN, ±∞ und
                                                         // Beträge über ZAHL_GRENZE: RangeError

// @ee/studio-format
/** Basis 62, Verwerfen gegen Modulo-Schieflage (Zahlen ab 62 · 69 273 666 werden übersprungen). Der Store füllt je Kennung
 *  `new Uint32Array(KENNUNG_ZAHLEN)` (16) aus seinem Zufall; reichen die Zahlen nicht für 10 Zeichen: RangeError */
export function kennungAusZahlen<V extends Vorsilbe>(v: V, zahlen: Uint32Array): Id<V>;
export function kennungAusPfad<V extends Vorsilbe>(v: V, pfad: string): Id<V>;           // SHA-256 aus studio-rechnen über die
                                         // UTF-8-Bytes des Pfads; die Zahl mit dem ersten Byte vorn, Basis 62, die ersten 10 Zeichen
export function vorsilbeVon(id: string): Vorsilbe;      // auch eines Messwerts '<Kennung>.<name>'; unbekannte Vorsilbe: RangeError
// kennung.ts dazu: VORSILBEN, istVorsilbe, istKennung, istKennungVon, vorsilbenName, KENNUNG_ZEICHEN, KENNUNG_LAENGE (10),
// KENNUNG_MUSTER, KENNUNG_ZAHLEN (16)
export interface Fehler { id?: string; feld?: string; text: string }   // typen/dokument.ts (3.2); der Store reicht ihn weiter
export function pruefen(dok: Dokument): Fehler[];      // pruefen.ts: zod und Querregeln aus 3.6
export interface LadeErgebnis { dokument: Dokument; nurLesen: boolean; meldungen: string[]; migriert: string[] }   // typen/dokument.ts
export function laden(dateien: ReadonlyMap<string, string>): LadeErgebnis;   // relativer Pfad → Text
export function formatErkennen(text: string): 'studio' | 'kern 0' | 'lauf' | 'unbekannt';   // 30 c
export function schreiben(dok: Dokument): Map<string, string>;   // lässt Schlüssel 'dein' an Bindungen einer Quelle aus (3.5 Nr. 8)
export function dateiVon(dok: Dokument, id: string): string;
/** Befund 5: liest Projekt.quellen aus projekt.json, holt jede Quelle über `lesen` (Pfad relativ zum Arbeitsbaum), wendet kern 0 → 1
 *  an und schreibt ihre Schlüssel als gewöhnliche Datensätze (Herkunft 'dein') in den Text der Figur-Datei; deterministisch */
export function quellenEinsetzen(dateien: ReadonlyMap<string, string>, lesen: (datei: string) => string | null): { dateien: Map<string, string>; eingesetzt: string[]; meldungen: string[] };
export function ankerZeile(p: Punkt, ein: Punkt, aus: Punkt, o?: { glaetten?: boolean }): AnkerZeile;   // Glätte-Regel aus 3.4;
                                                    // glaetten: false (Übernahme, Migrationen): Ecke mit genau ihren Winkeln (Griffe der
                                                    // Länge 0: Gegenrichtung, 3.4); ungültige Zahl: RangeError
/** schreibt p, Ein-Griff, Aus-Griff absolut (6 Zahlen) nach aus[i … i + 5]. `i` ist die Stelle der ersten Zahl in `aus`, nicht die
 *  Nummer des Ankers: Anker k einer Form steht ab 6·k (so füllt `formPunkte` den Puffer für `kurvenAbstand`) */
export function ankerPunkte(z: AnkerZeile, aus: Float64Array, i: number): void;
// anker.ts dazu: ankerZeileAus(f, i, o?) (Gegenstück zu ankerPunkte), formPunkte(form) (6 Zahlen je Anker), glaetteMass(p, ein, aus)
// ({ w, winkel, aenderung, glatt }; für „fast glatt“ im Importbericht), istGlatt, ueberallGlatt (TeilPlan.glatt: glatt in allen Zeilen),
// alsEcke (glatte Zeile als Ecke mit wEin = w + 180°), glattMachen (⇧C, ohne Schwelle), winkelNormal (in (−180, 180], −0 wird 0),
// richtung(dx, dy), GLAETTE_WINKEL (0,2), GLAETTE_KURVE (0,0002), KURVENPUNKT_GEWICHT (225/512)
export interface ImportErgebnis { dokument: Dokument; bericht: string[]; fastGlatt: { teil: Id<'teil'>; anker: number }[] }   // typen/dokument.ts
export function svgImportieren(dateien: readonly { name: string; text: string }[], ziel: { dok: Dokument; figur?: Id<'fig'>; stelle?: { regler: Id<'rg'>; an: number } }): ImportErgebnis;
export const MIGRATIONEN: readonly Migration[];         // migrationen/register.ts (M1.2); Migration und ArtBlock aus versionen.ts (3.4)
// schema/reihenfolge.ts: die Schemas der Dokument-Ebene (DATENSATZ_SCHEMAS, DATENSATZ_TYPEN, schemaVon, datensatzTypVon,
// istDatensatzTyp, datensatzSchema, dateiArtSchema, dateiSchema, diffSchema), die feste Reihenfolge (ordnen, datensatzOrdnen,
// dateiOrdnen, nachCodepunkten; 3.5 Nr. 1) und die Bruchindizes (ordnungZwischen, ordnungenZwischen); istOrdnung und ordnungSchema
// stehen in schema/grund.ts, `kennlinienPaarSchema` in schema/logik.ts. Dokument (ReadonlyMap) und Entwurf haben kein Schema.
export interface ArtSchema {
  art: string; familie: ArtFamilie; version: number; schema: ZodType<ArtDaten>; migrationen: Migration[];
  /** an Teilen mit wieGezeichnet (30 d): 'zeichnung' wirkt immer (Dickenregel, Kantenglättung, Verdecken, Weiß-Nachgeben; Chips
   *  Schwingen, Kette, Stauchen, Ruhig halten); 'bewegung' nur in Bewegung, in Ruhe null (Beinschattierung); 'nurFlorian' nur, wenn
   *  der Datensatz Herkunft 'dein' hat (Gelee, Schmierbild, Aufprallbild, Zittern, Bewegungslinien, Verformung nach Tempo, Schein,
   *  Auflösen, Kontakt- und Bodenschatten). Standard 'nurFlorian'. */
  aufGezeichnet?: 'zeichnung' | 'bewegung' | 'nurFlorian';
}
/** arten/register.ts, unter dem Schlüssel artSchluessel(a.familie, a.art) ('<familie>:<art>', 3.4); prüft Name (kleinCamelCase),
 *  Familie, Version ab 1 und lückenlose Migrationen im Block der Art; dieselbe Art zweimal ist ein Fehler, außer derselbe Eintrag */
export function artEintragen(a: ArtSchema): void;
// arten/register.ts dazu: artSchluessel(familie, art): ArtSchluessel, artVon(familie, art), artenVon(familie?) (nach Schlüssel
// sortiert), aufGezeichnetVon(a) (Standard 'nurFlorian'), artVersionen() (Version je eingetragener Art, nach Schlüssel; der Schreiber
// nimmt daraus nur die Arten, die die Datei nutzt, 3.4); die
// Registerliste ARTEN (je Familie die Liste ihrer Datei, heute EFFEKTE aus arten/effekte.ts) gehört dem Zusammenbau
// schrift.ts (M7.6): Konturen aus der TTF (opentype.js liest sie im Editor und im Skript) → Glyphentabelle (typen/text.ts)
export function schriftAusKonturen(name: string, quelle: string, geviert: number, glyphen: readonly { zeichen: string; vorschub: number; befehle: readonly (readonly [string, ...number[]])[] }[], unterschneidung: readonly [string, string, number][]): Schrift;

// @ee/studio-store. studio-store/src/typen.ts (M0) hält alle Typen dieses Blocks, die öffentliche Seite der Klasse als
// `StoreVertrag` (Methoden wie unten), dazu `type StoreKonstruktor = new (dok: Dokument, o: StoreOptionen) => StoreVertrag`,
// `DiffVon` und `SchutzVerletzt` (die Signaturen von diffVon und schutzVerletzt) und reicht `Fehler` aus typen/dokument.ts weiter.
// M1.5 baut `class Store implements StoreVertrag` (store.ts), `diffVon` (diff.ts), `schutzVerletzt` (schutz.ts).
export type Quelle = 'florian' | 'automatik' | 'sitzung' | 'migration';   // 'florian' nur vom Server mit STUDIO_FLORIAN=1 (3.6 Nr. 9)
export type { Diff } from '@ee/studio-format/typen/dokument';   // liegt im Format (3.2), weil Laufzeit und Spiel ihn ohne Store nehmen
export interface Auswahl { figur?: Id<'fig'>; teile: Id<'teil'>[]; anker: [Id<'teil'>, number][] }
export interface Transaktion { nummer: number; quelle: Quelle; diff: Diff; geste?: number; auswahlVor?: Auswahl; auswahlNach?: Auswahl }
export interface Abgelehnt { abgelehnt: true; grund: 'schutz' | 'quelle' | 'ungueltig'; kennungen: string[]; text: string }
export interface JournalAblage { schreiben(t: Transaktion): Promise<void>; lesen(): Promise<Transaktion[]>; leeren(bis: number): Promise<void> }
export interface StoreOptionen {
  zufall: (aus: Uint32Array) => void;  // Editor und Server crypto.getRandomValues, Tests ein Strom mit Saat aus
                                       // @ee/studio-rechnen/zufall (devDependency des Stores; 30 a); je Kennung KENNUNG_ZAHLEN Zahlen
  pruefen: (dok: Dokument) => Fehler[];  // übergeben, nicht importiert (Befund 15)
  verlaufGrenze?: number; journal?: JournalAblage;
}
export class Store {
  constructor(dok: Dokument, o: StoreOptionen);
  get<T extends DatensatzTyp>(id: Id<T>): DatensatzTabelle[T] | undefined;
  alle<T extends DatensatzTyp>(typ: T): readonly DatensatzTabelle[T][];
  dokument(): Dokument;
  aendern(quelle: Quelle, tun: (e: Entwurf) => void, auswahl?: Auswahl): Transaktion | Abgelehnt;   // Herkunftsregel über Entwurf.ziel
  gesteBeginnen(auswahl?: Auswahl): number;            // alle Transaktionen bis gesteBeenden sind ein Schritt
  gesteBeenden(marke: number, auswahl?: Auswahl): void;
  gesteAbbrechen(marke: number): void;                 // setzt auf den Stand vor der Geste zurück
  zurueck(): Transaktion | null; wieder(): Transaktion | null;
  /** F5: je Datensatz die geänderte Seite; seit dem letzten Speichern beidseitig geändert: der lokale Stand gewinnt (er schreibt
   *  später), die fremde Fassung kommt in `verdraengt` zurück. Fremde Transaktionen kommen nie in Florians Verlauf. */
  fremdUebernehmen(d: Diff, quelle: Exclude<Quelle, 'florian'>): { uebernommen: Diff; verdraengt: Datensatz[] };
  ungespeichert(): ReadonlySet<string>;               // Kennungen, die seit dem letzten Speichern geändert sind
  gespeichert(ids: Iterable<string>): void;
  abonnieren(h: (t: Transaktion) => void): () => void;
}
export function diffVon(vorher: ReadonlyMap<string, Datensatz>, nachher: ReadonlyMap<string, Datensatz>): Diff;
export function schutzVerletzt(quelle: Quelle, d: Diff, dok: Dokument): string[];   // Schutzregel 3.6 Nr. 9 samt Quellen und wieGezeichnet
```

Regeln des Verlaufs (11 §4.2): eine Geste ist ein Schritt; Tastenschübe innerhalb von 500 ms sind ein Schritt; die Auswahl reist mit;
Abgeleitetes (Lauf, Stelle, Kamera) kommt nie in den Verlauf; fremde Transaktionen nie in Florians Verlauf; Grenze 500 Einträge oder
50 MB.

### 4.2 Laufzeit: Fassade und Rechenkette

```ts
// laufzeit/vertrag/eingabe.ts, ereignis.ts, bildstand.ts
export interface RohEingabe { finger: { an: boolean; x: number; y: number } | null; tippen: Punkt | null; knoepfe: string[] }
export interface Ereignis { takt: number; quelle: string; name: string; staerke: number; ort?: Punkt }   // quelle: Kennung
export interface BildStand {
  anker: Float64Array;          // je Anker 6 Zahlen absolut, nach allen Schritten (Bild)
  ruhe: Float64Array;           // je Anker 6 Zahlen vor den Knochen (Schritt 12), für Rückrechnung und Zwiebelhaut
  knochen: Float64Array;        // je Knochen 6 Zahlen (2 × 3-Matrix in der Welt)
  regler: Float64Array;         // gezeigte Werte
  marken: Float64Array;         // Wächter: je Marke Teil, Stück, Art
}

// laufzeit/fassade.ts – gleich für Editor und Spiel
export interface LaufzeitOptionen { welt: WeltAdapter; editor: boolean }
export class Laufzeit {
  constructor(o: LaufzeitOptionen);
  /** Zoomstufe: 16 k, 4.3; `hinweise`: die Hinweise der Teilpläne (heute `ReglerPlan.hinweise`). Legt bei Bedarf einen Lauf an
   *  (Werkbank ohne Szene) und passt ihn an einen neuen Plan an (Regler Kennung für Kennung; ändert sich die Länge von Schichten,
   *  `Lauf.figur` oder `Lauf.bausteine`, beginnt das Feld neu in Ruhe) */
  bauen(dok: Dokument, diff?: Diff, o?: { zoomstufe?: number }): { plan: Bauplan; hinweise: string[] };
  starten(szene: Id<'sz'> | null, saat: number): void;   // null: nur Figuren (Werkbank), kein Spiel
  vorlauf(sekunden: number, roh: RohEingabe): number;    // sammelt Zeit, rechnet 0 bis 5 Takte (Kappung 0,25 s), gibt alpha
  takt(roh: RohEingabe): void;                           // genau ein Takt (Schritte 1 bis 9)
  bild(alpha: number, aus: BildDaten): BildStand;        // = auswerten mit den gemischten Werten und Lagen
  /** Schritte 10 bis 16 aus gegebenen Reglerwerten und Körperlagen, ohne den Lauf zu ändern; hängt je Aufruf eine Auswertung an `aus`
   *  an: je Feldsatz des Zeichenmodells eine Feldsatz-Instanz samt ihren Teilen und Strecken (16 j). Die Laufzeit leert `aus` nie; das
   *  tut, wer zeichnet, zu Beginn jedes Bilds (`bildDatenLeeren`, 4.6). Zwiebelhaut, Bahnen, Posenkarten, Filmstreifen der Tafel und
   *  Geister des Rückblicks rufen es; Editor und Spiel gleich. */
  auswerten(werte: Float64Array, lagen: Float64Array | null, aus: BildDaten): BildStand;
  /** Leiste, Anfasser, Prüfstand: `handSetzen` aus regler/hand.ts (Linienregler geklemmt, Kreisregler gefaltet; 4.4), danach ohne
   *  laufenden Takt ein Durchlauf ohne Zeit: Drähte (Schritt 5, ohne Glätten) und Regler (Schritt 6, Ist = Soll); im Takt laufen
   *  dieselben Funktionen mit dt (Befund 1). Werkbank und Spiel sehen dieselben Werte. */
  hand(regler: Id<'rg'>, wert: number): void;
  anfordern(schicht: Id<'sch'>, pose: Id<'po'>, quelle: Band | 'hand', variante?: string): void;
  wert(regler: Id<'rg'>): number;
  zeitlupe(faktor: number): void;                        // ändert nur, wie schnell Takte folgen
  merken(): Schluesselstand; zurueck(s: Schluesselstand): void; spulen(takt: number): void;
  pruefsumme(): number;
  ereignisse(): readonly Ereignis[];                     // Postfach des letzten Takts
  warum(frage: WarumFrage): WarumAntwort;
}
```

Die Rechenkette (Konzept 10.3) als Module. Jede Funktion bekommt ihren Teilplan und den Lauf.

| Nr. | Modul | Funktion |
|---|---|---|
| 1 | `takt/eingabe.ts` | `eingabeLesen(lauf, roh)`: ins Protokoll mit Taktnummer |
| 2 | `logik/postfach.ts` | `postfachOeffnen(lauf)`: Ereignisse aus n−1 in fester Ordnung (Physik, Übergänge, Zonen, Zähler, Uhr, Spieler; darin nach Kennung) |
| 3 | `logik/regeln.ts` | `regelnPruefen(plan.logik, lauf, anf)`: gegen den Stand von n−1, je Kanal nach Band, dann Listenplatz; Einmal-Aktionen; Folgen ins Postfach für n+1 |
| 4 | `posen/schichten.ts` | `schichtenFortschreiben(plan.posen, lauf, anf, dt)`: Übergänge, Zyklen, Zusatzbewegungen, Spannung → Sollwerte |
| 5 | `logik/draehte.ts` | `draehteRechnen(plan.logik, lauf)`: in der Folge ihres Graphen |
| 6 | `regler/durchlauf.ts` | `reglerDurchlauf(plan.regler, lauf, dt)`: Soll aus Hand, Draht, Pose, Regel; Ausgleich bei Sprüngen; Höchsttempo |
| 7 | `takt/weltschritt.ts` | `weltSchritt(plan.physik, lauf, welt, dt)`: Bausteine je Teilschritt, Box2D mit 4 Teilschritten, ein gesammeltes `lesen` |
| 8 | `physik/xpbd.ts` | `figurSchritt(plan.physik, lauf, chips, dt, 4)`, Signatur `figurSchritt(p: PhysikPlan, lauf: Lauf, chips: readonly ChipLauf[], dt: number, teilschritte: number): void`: Federn auf Reglern und Knochen, Ketten, Stauchung. Die `ChipLauf` hält die Fassade (nach jedem `bauen` je Chip `chipart(c.art).anlegen(c, plan)`, in der Folge von `PhysikPlan.chips`); der Stand jedes Chips liegt in `Lauf.figur` ab `PhysikPlan.chipStand[i]` (4.5) |
| 9 | `takt/archiv.ts` | `archivieren(lauf, welt)`: Prüfsumme je Takt; alle 16 Takte ein Schlüsselstand (Budget 32 MB) |
| 10 | `regler/mischen.ts`, `form/ansicht.ts` | `reglerMischen(lauf, alpha, r)`; `ansichtAuswerten(plan.form, r, anker)` |
| 11 | `knochen/anheftung.ts` | `gelenkeAnheften(plan.knochen, anker, gelenke)` |
| 12 | `form/zusatz.ts` | `zusaetzeAnwenden(plan.form, r, anker)`: Formziele, Posen- und Korrekturformen, Kreuzschlüssel, an den bewegten Winkeln |
| 13 | `knochen/aufhaengen.ts` | `knochenStellen(plan.knochen, r, gelenke, matrizen)`: stellt die Lage jeder Figur (`Figur.lage`, 4.3) vor ihre Wurzelknochen und schreibt sie hinter die Knochen in `matrizen` (6 · (anzahl + Figuren) Zahlen); `aufhaengen(plan.knochen, matrizen, anker)`: bildet die Anker jedes Teils ab, auch der Teile ohne Aufhängung (sie folgen nur der Lage ihrer Figur). Danach stehen alle Anker in der Welt (L) |
| 14 | `form/fluechtig.ts` | `fluechtig(plan.physik, lauf, anker)`: Gelee und Glätte-Schutz (`knochen/glaetteSchutz.ts`, ab M5.4); in Ruhe null, nie gespeichert. Die Abweichung der Box2D-Körper wirkt nur über Regler (Schritt 6, Kopplung 4.5), nie hier |
| 15 | `editor/waechter.ts` | `waechter(plan, anker, marken)`: nur im Editor |
| 16 | `form/abflachen.ts`, `form/wechsel.ts` | `abflachen(plan.abflach, anker, aus)`: hängt an `aus` (BildDaten) eine Auswertung an (Strecken, Teile, Rahmen je Feldsatz-Instanz); `malreihenfolge(plan, r, aus)` schreibt `ordnung` und `deckung` dieser Teile (4.4); `werte` schreibt die Fassade (4.6). Gezeichnet wird mit `zeichner.zeichne(aus)` nach allen Auswertungen des Bilds |

Braucht Schritt 8 die Lage eines Gelenks (Wurzel der Schwanzkette), rechnet er 10 und 11 für dieses Teil im Takt mit. Die Fassade
verdrahtet die Integration nach jeder Welle mit dem, was gebaut ist (5.1); fehlende Schritte überspringt sie. Sie hält die `ChipLauf`
und `BausteinLauf`, sobald Schritt 7 und 8 verdrahtet sind; `merken` sichert den ganzen Lauf samt Postfach, Ereignissen, Chip- und
Bausteinständen und dazu die Welt, die Prüfsumme des Takts zählt sie mit. Tests (M6.2, Befund 2):
`Laufzeit` mit `editor: true` und mit `editor: false` liefert für Ozzy von 0° bis 360° in 0,5° bitgleiche Anker; Spiel und Editor,
jeder über seinen Server aus derselben Kopie des Inhalts geladen, liefern dieselben Anker (Ladeweg mit `quellenEinsetzen`).

### 4.3 Bauplan

```ts
// laufzeit/vertrag/bauplan.ts
export interface Bauplan {
  stand: number;                    // steigt bei jedem Neubau
  ordnung: OrdnungPlan; regler: ReglerPlan; form: FormPlan; knochen: KnochenPlan; abflach: AbflachPlan;
  posen: PosenPlan; physik: PhysikPlan; logik: LogikPlan; zeichen: ZeichenModell;
}
/** feste Nummern aller Datensätze (`bauplan/ordnung.ts`, Regel unten): je Datensatztyp 0, 1, 2 …; `index` gibt zu jeder Kennung ihre
 *  Nummer in ihrem Typ; `listen` die Kennungen jedes Typs in Nummernfolge (figuren, teile, regler und knochen sind dieselben Felder) */
export interface OrdnungPlan {
  index: ReadonlyMap<string, number>; figuren: Id<'fig'>[]; teile: Id<'teil'>[]; regler: Id<'rg'>[]; knochen: Id<'kn'>[];
  listen: { [T in DatensatzTyp]: Id<T>[] };
}
/** je Regler eine Zahl, Bereiche zwei (`bauplan/regler.ts`). Ausgleich: federF = 1/dauer (dauer ≤ 0: +∞, sofort), federZeta =
 *  1 − federung; ohne Höchsttempo steht +∞, ohne Nachlauf 0 (Vorsicht: ∞ · 0 ist NaN; ohne Zeit gilt Ist = Soll) */
export interface ReglerPlan {
  anzahl: number; bereich: Float64Array; standard: Float64Array; kreis: Uint8Array;
  federF: Float64Array; federZeta: Float64Array; hoechsttempo: Float64Array;
  nachlauf: Float64Array;           // s je Regler (16 b)
  folge: Int32Array;                // Rechenfolge nach Drähten und Spiegelkanten (Regel unten); ein Kreis ist ein Hinweis
  raster: Float64Array;             // Fangraster der Leiste je Regler (`fangen`, 4.7)
  spiegelAb: Float64Array; spiegelUm: Float64Array;   // gespiegelte Hälfte je Regler mit Spiegelregel (sonst NaN): Kreisregler
                                                      // ab < w < um, Linienregler ab ≤ w < um
  mitSpiegel: Int32Array; mitUm: Float64Array;        // `Spiegelregel.regler` (Befund 8): je Regler der Regler, dessen Spiegelregel ihn
                                                      // mitspiegelt (−1: keiner), und sein um (Wert um − w; sonst NaN)
  hinweise: readonly string[];      // Hinweise dieses Teilplans (Kreis in den Drähten, doppelt mitgespiegelt); bleiben, solange er bleibt
}
export interface FormPlan { teile: TeilPlan[]; ankerZahl: number }   // je Teil nach OrdnungPlan ein TeilPlan (teile[i].teil = i)
export interface TeilPlan {
  teil: number; figur: number; erster: number; anzahl: number;   // erster Anker im Puffer (je Anker 6 Zahlen; Regel unten)
  geschlossen: boolean;                                          // geschlossene Kurve, aus `ankerBereiche`
  glatt: Uint8Array; form: Float64Array | null;                  // glatt je Anker nach der Regel in 3.2 (typen/form.ts); Teil.form
  ansicht: AnsichtPlan | null; zusaetze: ZusatzPlan[];
}
export interface AnsichtPlan {
  regler: number; mischart: Mischart; periodisch: boolean;
  abschnitte: ListenPlan[];         // ohne Übernahme genau einer über den ganzen Bereich
  spiegel: SpiegelPlan | null;      // mit Abschnitten nur für Malreihenfolge, Wechsel und mitgespiegelte Regler (3.2)
  spitzen: SpitzenPlan[];           // je Spitzenführung eine (Ozzy: 45°–90° und gespiegelt 270°–315°)
}
export interface ListenPlan {
  von: number; bis: number; art: 'liste' | 'gespiegelt';
  xs: Float64Array;                 // Stellen der mischenden Schlüssel (ruhende sind schon heraus, form/ruhen.ts)
  groessen: Float64Array;           // je Schlüssel und Anker die Mischgrößen der Mischart
  steigungen: Float64Array;         // PCHIP-Steigungen, vorab
  quelle: number;                   // 'gespiegelt': Index der Bindung, die gespiegelt wird
}
/** zwei Achsen: volles Gitter nach der Feldregel (4.4), fehlende Gitterpunkte ergänzt hier, nie in der Datei */
export interface ZusatzPlan { achsen: [number] | [number, number]; xs: Float64Array; ys: Float64Array | null; versatz: Float64Array; steigungen: Float64Array }
/** bauplan/bauen.ts: baut nur Teilpläne neu, deren Quellen sich änderten (`diff`: vom Dokument von `alt` zu `dok`), die Abflachung auch
 *  beim Wechsel der Zoomstufe (16 k); ändert sich nichts, kommt `alt` zurück; ohne `diff` alles neu */
export function bauen(dok: Dokument, alt?: Bauplan, diff?: Diff, o?: { zoomstufe?: number }): Bauplan;
// vertrag/bauplan.ts dazu: leererBauplan(zoomstufe = 0) (Stand 0, alle Teilpläne leer; für Teilpläne, die noch niemand baut, und für
// Tests eines einzelnen Teilplans: { ...leererBauplan(), form: … }), leererOrdnungPlan(), leererReglerPlan(); zoomstufe ist der
// Exponent zu 1,25 (0: Maßstab 1)

// bauplan/ordnung.ts (gemeinsame Datei, seit M0 fertig)
export function ordnungPlanBauen(dok: Dokument, alt?: OrdnungPlan, diff?: Diff): OrdnungPlan;   // `alt`, wenn der Diff die Ordnung
                                                                                                  // nicht ändert (dasselbe Objekt)
export function indexVon(o: OrdnungPlan, id: string): number;   // −1: keiner
export function kennungen<T extends DatensatzTyp>(o: OrdnungPlan, typ: T): readonly Id<T>[];
export interface AnkerBereiche {   // je Teil nach OrdnungPlan
  erster: Int32Array; anzahl: Int32Array; geschlossen: Uint8Array;   // erster Anker, Teil.anker.length, 1: geschlossen
  erstesStueck: Int32Array; stuecke: Int32Array;                    // Kurvenstücke: geschlossen so viele wie Anker, offen eines weniger
  ankerZahl: number; stueckZahl: number;                            // alle Anker, alle Kurvenstücke
}
/** wo die Anker und Kurvenstücke jedes Teils im Puffer liegen (Regel unten); je Neubau aus dem Dokument, weil ein Anker mehr die Ordnung
 *  nicht ändert, aber alle Teile dahinter verschiebt; ein Teil, das im Dokument fehlt, hat keine Anker */
export function ankerBereiche(dok: Dokument, o: OrdnungPlan): AnkerBereiche;
export function istGeschlossen(t: Pick<Teil, 'art' | 'linie'>): boolean;   // Fläche immer, Linie nur mit linie.offen === false
// dazu typVon(id) (Datensatztyp nach der Vorsilbe), ordnungGeaendert(diff), ORDNUNG_FOLGE (Rechenfolge der Typen), BAND_RANG

// bauplan/regler.ts (gemeinsame Datei, seit M0 fertig)
export function reglerPlanBauen(dok: Dokument, ordnung: OrdnungPlan, alt?: Pick<Bauplan, 'ordnung' | 'regler'>, diff?: Diff): ReglerPlan;
export function inSpiegelHaelfte(p: ReglerPlan, i: number, w: number): boolean;   // Kreisregler ab < w < um, Linienregler ab ≤ w < um
export function federFrequenz(dauer: number): number;                              // 1/dauer; dauer ≤ 0 oder keine Zahl: +∞
export function rechenfolge(n: number, nachfolger: readonly (readonly number[])[], kreis: (glieder: number[]) => void): Int32Array;
                                         // Tarjan, dann Kahn nach kleinster Nummer; ein Kreis rechnet als Block in Nummernfolge
```

**Ordnung** (`bauplan/ordnung.ts`): Je Datensatztyp stehen die Datensätze nach ihrem Besitzer gruppiert, die Gruppen in der Folge ihrer
Besitzer (Rechenfolge der Typen `ORDNUNG_FOLGE`: jeder Besitzer vor seinen Datensätzen, Figuren vor Szenen, Szenen vor Dingen, Dinge vor
Chips und Bausteinen), darin nach den Sortierschlüsseln des Typs und zuletzt nach Kennung (Codepunkte): Schichten nach `ordnung` (ihre
Rechenfolge), Regeln nach Szene, Band und `ordnung` (wie `LogikPlan.regeln`), Aufgaben nach `ordnung`. Fehlt ein Besitzer, steht der
Datensatz hinter allen anderen seines Typs, nach der Kennung des fehlenden Besitzers. Die Nummern hängen nur an Kennungen, Besitzern und
diesen Schlüsseln: Ein Diff, der nichts davon ändert und nichts anlegt oder löscht, lässt die Ordnung, wie sie ist. So liegen die Teile
einer Figur und damit ihre Anker im Puffer beieinander. Den Datensatztyp nimmt die Laufzeit aus einer eigenen Tabelle der Vorsilben,
nicht aus den Schemas des Formats.

**Ankerpuffer** (eine Regel für alle Teilpläne und Schritte; je Anker 6 Zahlen: p, Ein-Griff, Aus-Griff absolut): Die Anker stehen Teil
für Teil in der Folge von `OrdnungPlan.teile`, je Teil in der Folge von `Teil.anker`; der erste Anker eines Teils ist die Summe der
Ankerzahlen aller Teile davor. Kurvenstücke ebenso: Teil für Teil, Stück k von Anker k nach k + 1; ein geschlossenes Teil (eine Fläche,
eine Linie mit `linie.offen === false`; eine Linie ohne `linie` ist offen) hat so viele Stücke wie Anker, das letzte zurück zu Anker 0,
ein offenes eines weniger. Gerechnet wird das nur in `ankerBereiche`; jeder Teilplan, der Anker anfasst (Form, Knochen, Abflachung,
Wächter), nimmt es von dort.

**Lage einer Figur** (`Figur.lage`): Ihre Regler x, y (L) und Drehung (Grad) setzen sie in die Welt,
p_Welt = (x, y) + D(Drehung) · p / einheitL (p in Figur-Einheiten; D dreht wie in `vertrag/welt.ts`); fehlt ein Regler (−1), gilt dort 0.
`knochenStellen` (Schritt 13) stellt sie vor jeden Wurzelknochen der Figur und schreibt sie zusätzlich hinter die Knochen in `matrizen`;
`aufhaengen` bildet die Anker jedes Teils damit ab, auch die der Teile ohne Aufhängung. So stehen alle Anker in `BildStand.anker` und
alle Strecken in `BildDaten` in der Welt (L); `BildStand.ruhe` bleibt in Figur-Einheiten.

**Regler** (`bauplan/regler.ts`): Ein Regler kommt in `folge` nach jedem Regler, von dem er abhängt: nach der Quelle seines Drahts (ein
Messwert eines Bausteins stammt aus dem vorigen Takt und ordnet nichts) und nach dem Regler, dessen Spiegelregel ihn mitspiegelt
(Spiegelkante); sonst gilt seine Nummer, ohne Abhängigkeiten ist die Folge 0, 1, 2 … Hängen Regler im Kreis voneinander ab, rechnen sie
dort in der Folge ihrer Nummern, und ein Hinweis nennt sie (3.6 Nr. 5 meldet es ebenso). Neu gebaut wird der ReglerPlan nur, wenn sich
die Ordnung, ein Regler oder ein Draht ändert. Die mitgespiegelten Regler stehen im ReglerPlan (`mitSpiegel`, `mitUm`), nicht im
`SpiegelPlan`.

Die übrigen Teilpläne und der Lauf, wie M0 sie in `vertrag/bauplan.ts` und `vertrag/lauf.ts` anlegt (Indizes beziehen sich auf
`OrdnungPlan`, −1 heißt „keiner“):

```ts
export interface SpiegelPlan { ab: number; um: number; achseX: number; partner: Int32Array; umnummern: (Int32Array | null)[]; reihenfolgeTauschen: boolean }
export interface SpitzenPlan { von: number; bis: number; anker: Int32Array; rahmenVon: Float64Array; rahmenBis: Float64Array; gespiegelt: boolean; regelBindung: number }  // je Spitze u, h; regelBindung: deren Schlüssel die Spitzenregel prüft (gespiegelt: der Partner)
/** Knochen (Schritte 11 und 13). `matrizen` (von `knochenStellen` geschrieben, von `aufhaengen` gelesen) hat 6 · (anzahl + Figuren)
 *  Zahlen: je Knochen seine 2 × 3-Matrix in der Welt (die Lage der Figur eingerechnet), dahinter je Figur (Index nach OrdnungPlan) die
 *  Matrix ihrer Lage. BildStand.knochen sind die ersten 6 · anzahl Zahlen. */
export interface KnochenPlan {
  anzahl: number; folge: Int32Array;                  // Eltern vor Kindern
  eltern: Int32Array; gelenk: Float64Array;           // 2 Zahlen je Knochen
  winkel: Int32Array; verschiebung: Int32Array;       // Reglerindizes (verschiebung: 2 je Knochen)
  anheftungen: { knochen: number; teil: number; anker: Int32Array; gewichte: Float64Array; mls: Float64Array }[];
  achsen: AchsenPlan[];
  /** je Teil nach OrdnungPlan einer (teile[i].teil = i), mit Figur und seinen Ankern im Puffer (figur, erster, anzahl aus
   *  `ankerBereiche`). Ein Teil ohne Aufhängung steht hier mit art 'starr' und knochen = [−1]: Es folgt nur der Lage seiner Figur. */
  teile: { teil: number; figur: number; erster: number; anzahl: number; art: 'starr' | 'achse' | 'gewichte'; knochen: Int32Array; gewichte: GewichtePlan | null; griffe: GewichtePlan | null; mischung: 'drehzentren' | 'linear' }[];
  figurLage: Int32Array;            // je Figur nach OrdnungPlan die Reglerindizes ihrer Lage x, y, Drehung (3 Zahlen, −1: keiner)
  figurEinheit: Float64Array;       // je Figur nach OrdnungPlan ihr einheitL (Figur-Einheiten je L)
}   // 'achse': knochen = [Achse, Eltern], gewichte w je Anker (fehlt: 1); Befund 17
export interface AchsenPlan { knochen: number; laenge: number; abstand: number; biegungWurzel: number; biegungEnde: number; beugung: 1 | -1; boden: boolean; rMin: number; ankerLage: Float64Array }   // ankerLage: u je Anker, Projektion auf die Ruheachse; rMin wie in rueckgratBauen
export interface GewichtePlan { knochen: Int32Array; gewicht: Float64Array; zentren: Float64Array }   // 4 je Anker; Zentren je Ansichtsschlüssel
/** Stückzahl je Kurvenstück (16 k): nach Wang aus dem größten Kontrollpolygon dieses Stücks über alle Schlüssel, mal 1,25 für Knochen
 *  und Zusätze, Toleranz 0,25 Bildpunkte bei der Zoomstufe; Zoomstufen sind Potenzen von 1,25 (`zoomstufe` ist der Exponent, 0 heißt
 *  Maßstab 1); höchstens 64 je Stück; nie je Bild neu. Im Spiel gilt die Stufe des größten Kameramaßstabs der Szene, im Editor die
 *  aktuelle. `stueckzahl` und `ersteStrecke` je Kurvenstück in der Folge des Ankerpuffers; `streckenZahl`: Strecken aller gezeichneten
 *  Teile eines Durchgangs (einer Auswertung); den Aufbau von `bernstein` und `ersteStrecke` legt `bauplan/abflachen.ts` fest. */
export interface AbflachPlan {
  stueckzahl: Int32Array; bernstein: Float64Array; streckenZahl: number; ersteStrecke: Int32Array; zoomstufe: number;
  teile: AbflachTeil[];             // je Teil nach OrdnungPlan (teile[i] gehört zu Teil i)
}
/** was Schritt 16 je Teil braucht: seine Anker und Kurvenstücke (`ankerBereiche`) und seinen Platz im Zeichenmodell (feldsatz: Index in
 *  ZeichenModell.feldsaetze, kanal: 0 bis KANAELE − 1 darin; −1: das Teil wird nicht als Feld gezeichnet, etwa ein gebackenes Ding) */
export interface AbflachTeil { erster: number; anzahl: number; geschlossen: boolean; erstesStueck: number; stuecke: number; feldsatz: number; kanal: number }
export interface PosenPlan {
  schichten: { regler: Int32Array; art: 'ersetzen' | 'addieren'; physik: boolean; posen: Int32Array; standard: number }[];   // standard: Übergang 'jede → jede'
  posen: { schicht: number; werte: Float64Array; kreuz: { achse: number; an: number; werte: Float64Array }[]; gewicht: number; verweilen: number }[];
  uebergaenge: { schicht: number; von: number; nach: number; art: Uebergang['art']; feder: Feder; ueber: Int32Array; taktleiste: Taktleiste | null; unterbrechen: Uebergang['unterbrechen'] }[];
  zyklen: { phase: number; antrieb: 'zeit' | 'weg'; frequenz: number; schritt: number; zweite: number; zeilen: ZyklusZeile[] }[];
}
export interface PhysikPlan {
  chips: { art: string; an: number; f: number; zeta: number; ausgang: number; daten: ArtDaten }[];   // je Chip nach OrdnungPlan
  huellen: Huelle[][];                                // je Figur aus ihrem Körpermodell (koerper, glieder; Befund 6)
  welt: { kette: Punkt[]; dinge: { ding: number; rolle: Ding['rolle']; huellen: Huelle[]; stoff: StoffWerte }[]; feld: Float32Array; feldMass: [x0: number, y0: number, zelle: number] } | null;
  /** Stand von Chip i in Lauf.figur von chipStand[i] bis chipStand[i + 1] (Länge nach `Chipart.standLaenge`, 4.5); chips.length + 1
   *  Zahlen, die letzte ist die Länge von Lauf.figur */
  chipStand: Int32Array;
}
export interface LogikPlan {
  regeln: Regel[];                                    // nach Band, dann ordnung
  kanaele: string[]; bausteine: Baustein[];           // Kanal '<Ding>.<name>': Reglernamen der Bausteinart, 'pose.<Schicht>', 'zeitfaktor'
  draehte: { quelle: number | Messwert; ziel: number; kennlinie: Float64Array; steigungen: Float64Array; spiegel: Draht['spiegel'] | null; glaetten: number }[];
  folge: Int32Array;                                  // Drähte in der Folge ihres Graphen
  /** `bausteine` stehen nach OrdnungPlan; Stand von Baustein i in Lauf.bausteine von bausteinStand[i] bis bausteinStand[i + 1] (Länge
   *  nach `Bausteinart.standLaenge`, 4.5); die letzte Zahl ist die Länge von Lauf.bausteine */
  bausteinStand: Int32Array;
}
// vertrag/lauf.ts
export interface Lauf {
  takt: number; saat: number; zeitfaktor: number;
  /** je Regler; `hand`: von Hand gesetzter Wert, NaN = keine Hand (nur regler/hand.ts schreibt ihn, 4.4); `vorher`: gezeigter Wert des
   *  vorigen Takts (zum Mischen) */
  regler: { soll: Float64Array; ist: Float64Array; versatz: Float64Array; tempo: Float64Array; vorher: Float64Array; hand: Float64Array };
  schichten: Float64Array;                            // je Schicht: Übergang, Zeit, Leitpunkt, Variante (4 Zahlen)
  figur: Float64Array;                                // Stände der Chips der Figurphysik, je Chip ab PhysikPlan.chipStand
  logik: Float64Array;                                // Gedächtnis je Regel und Ding, Ruhezeiten, Launen
  bausteine: Float64Array;                            // Stände der Bausteine, je Baustein ab LogikPlan.bausteinStand
  stroeme: Uint32Array; protokoll: EingabeEintrag[]; postfach: Ereignis[]; ereignisse: Ereignis[]; pruefsummen: Uint32Array;
}
export interface Schluesselstand { takt: number; lauf: ArrayBuffer; welt: Uint8Array }   // nie als Datei
export interface Mitschnitt { takte: number; werte: Float32Array; ereignisse: Ereignis[] }   // gezeigte Werte der letzten 20 s
```

Prüfung des Bauplans: Nach zufälligen Diffs ergeben voller und schrittweiser Neubau gleiche Felder. Jeder Teilplan bringt diesen
Eigenschaftstest mit (`bauplan/<teilplan>.test.ts`; `ordnung.test.ts` und `regler.test.ts` aus M0 zeigen, wie Zufallsdokumente und
Diffs gebaut werden, und `ordnung.test.ts` prüft `ankerBereiche`: ein Anker mehr lässt die Ordnung als dasselbe Objekt und verschiebt nur
die Teile dahinter); `bauplan/bauen.ts` setzt sie nur zusammen (Zusammenbau-Datei, Stand M0: Ordnung und Regler, die übrigen Teilpläne
leer), den Gesamttest `bauplan/bauen.test.ts` beginnt die Integration mit Ordnung und Regler und führt ihn nach jeder Welle fort. Beim
Ziehen eines Ankers baut der Bauplan nur den Teilplan des Teils neu (Budget 1 ms).

### 4.4 Morph, Knochen, Posen

```ts
// form/koordinaten.ts: formAusSchluesseln aus raster.ts, auf Felder umgebaut, Ergebnis bitgenau bis auf studio-rechnen
export function koordinatenMischen(l: ListenPlan, w: number, aus: Float64Array, erster: number, anzahl: number): void;
// form/rahmenRest.ts: Konzept 2.2 und 06 §2.6 – Procrustes je Schlüssel, Rest im Rahmen, Griffe relativ zur Tangente
export function rahmenRestVorbereiten(schluessel: readonly Float64Array[], glatt: Uint8Array, xs: Float64Array, periode: number | null): ListenPlan;
export function rahmenRestMischen(l: ListenPlan, w: number, glatt: Uint8Array, aus: Float64Array, erster: number, anzahl: number): void;
// form/zusatz.ts: Rahmenformel aus 3.2 (VersatzZeile, 16 a), ein Bezugsrahmen für alle Zusatzformen. Die Formel braucht an den Enden
// offener Linien, ob das Teil geschlossen ist (TeilPlan.geschlossen); den Parameter ergänzt der Vertragsschritt M4.0
export function zusatzAnwenden(z: ZusatzPlan, r: Float64Array, anker: Float64Array, erster: number, anzahl: number, glatt: Uint8Array): void;
export function versatzAus(gezeigt: Float64Array, gezogen: Float64Array, erster: number, anzahl: number, glatt: Uint8Array): VersatzZeile[];
// form/spiegel.ts, spitzen.ts, ruhen.ts, listen.ts, wechsel.ts
export function spiegeln(f: Float64Array, erster: number, anzahl: number, s: SpiegelPlan, aus: Float64Array, ziel: number): void;
export function spitzenRuht(p: SpitzenPlan, schluesselStellen: Float64Array): boolean;   // Spitzenregel (Befund 13)
export function spitzenFuehren(p: SpitzenPlan, w: number, anker: Float64Array, erster: number, anzahl: number): void;
export function ruhendeSchluessel(schluessel: readonly Schluessel[], raster: number, festeStellen: readonly number[]): Set<Id<'sl'>>;   // Regel „Ruhen“ unten
/** Regel „Neue Schlüssel in Listen“ unten: neue Abschnitte der eigenen Bindung und der Partnerbindung (gespiegelter Eintrag) */
export function inListenEinfuegen(eigene: readonly BindungsAbschnitt[], partner: readonly BindungsAbschnitt[] | null,
  stellen: ReadonlyMap<Id<'sl'>, number>, neu: Id<'sl'>, an: number): { eigene: BindungsAbschnitt[]; partner: BindungsAbschnitt[] | null };
export function ausListenNehmen(abschnitte: readonly BindungsAbschnitt[], weg: Id<'sl'>): BindungsAbschnitt[];
/** Einträge auf fehlende Schlüssel einer fremden Quelle: der Bauplan lässt sie aus, der Prüfer meldet sie (3.6 Nr. 8) */
export function fehlendeEintraege(abschnitte: readonly BindungsAbschnitt[], vorhanden: ReadonlySet<Id<'sl'>>): ListenEintrag[];
/** form/wechsel.ts: Malreihenfolge nach Wechseln in BildDaten (4.6), für die Feldsatz-Instanzen, die Schritt 16 eben angehängt hat (die
 *  letzten plan.zeichen.feldsaetze.length): `ordnung` (je Instanz eine Umordnung genau ihrer Einträge in `teile`, von unten nach oben)
 *  und die weichen Paare in `deckung` samt `deckungZahl` */
export function malreihenfolge(plan: Bauplan, r: Float64Array, aus: BildDaten): void;

// regler/hand.ts (M1.3): Hand an einem Regler; sonst schreibt niemand lauf.regler.hand. regler/durchlauf.ts (M1.7) liest es nur (NaN:
// keine Hand) und klemmt nicht noch einmal; `Laufzeit.hand` ruft handSetzen und danach den Durchlauf ohne Zeit (4.2)
export function handSetzen(p: ReglerPlan, lauf: Lauf, i: number, wert: number): void;   // lauf.regler.hand[i]: ein Linienregler auf
                                         // seinen Bereich geklemmt, ein Kreisregler in [bereich[0], bereich[1]) gefaltet; keine endliche
                                         // Zahl: RangeError
export function handLoesen(lauf: Lauf, i: number): void;                                  // lauf.regler.hand[i] = NaN

// knochen/
export function gelenkeAnheften(p: KnochenPlan, anker: Float64Array, gelenke: Float64Array): void;     // starre MLS
/** knochen/aufhaengen.ts: stellt die Lage jeder Figur (KnochenPlan.figurLage, Regel in 4.3) vor ihre Wurzelknochen und schreibt sie
 *  hinter die Knochen in `matrizen` (6 · (anzahl + Figuren) Zahlen) */
export function knochenStellen(p: KnochenPlan, r: Float64Array, gelenke: Float64Array, matrizen: Float64Array): void;
export function biegeachseBauen(a: AchsenPlan, r: Float64Array, boden: number, aus: Float64Array): void; // Port von rueckgratBauen
// aufhaengen: starr und Teile ohne Aufhängung (knochen = [−1]: nur die Lage ihrer Figur) in M1.7; 'achse' mit Gewichten je Anker und
// Griff, linear (M4.2); Drehzentren für beide Arten (M9.2). Erster Anker und Zahl je Teil aus KnochenPlan.teile
export function aufhaengen(p: KnochenPlan, matrizen: Float64Array, achsen: Float64Array, anker: Float64Array): void;
export function drehzentren(ruhe: Float64Array, gewichte: GewichtePlan): Float64Array;   // Le und Hodgins, je Ansichtsschlüssel
export function glaetteSchuetzen(anker: Float64Array, erster: number, anzahl: number, glatt: Uint8Array): void;
// d = (|v|·v − |u|·u) / ‖|v|·v − |u|·u‖, i'' = p − |u|·d, o'' = p + |v|·d (06 §4.4); nie an Ecken

// posen/. Anforderung liegt in vertrag/lauf.ts, TafelZelle in vertrag/editor.ts, Zusatzart in vertrag/zusatz.ts (alle seit M0);
// posen/schichten.ts, posen/tafel.ts und posen/zusatzarten.ts nehmen sie von dort, M4 legt sie nicht neu an
export interface Anforderung { schicht: number; pose: number; band: Band | 'hand'; variante?: string }
export function schichtenFortschreiben(p: PosenPlan, lauf: Lauf, anf: readonly Anforderung[], dt: number): void;
export function wegSuchen(p: PosenPlan, schicht: number, von: number, nach: number): Int32Array;   // „über X“
export interface TafelZelle { von: number; nach: number; art: Uebergang['art'] | 'standard'; varianten: number; gesehen: boolean }
export function tafel(p: PosenPlan, schicht: number, gesehen?: ReadonlySet<string>): TafelZelle[];
export function zyklusVorschieben(p: PosenPlan, lauf: Lauf, weg: Float64Array, dt: number): void;
export interface Zusatzart { art: string; anwenden(z: Zusatzbewegung, u: number, t: number, lauf: Lauf, r: Float64Array): void }
// posen/zusatz/*.ts, eingetragen in posen/zusatzarten.ts: 'huepfer' (Bogen 4u(1−u) um die Rolle aus daten.um), 'plumps' (aufprall
// aus ablauf.ts), 'seufzer' (seufzer aus ablauf.ts), 'wedeln' (Frequenz daten.hz, Hülle sin(πu))
```

**Kurven der Abschnitte** (wörtlich aus `ablauf.ts`): `weich` x²(3 − 2x), `fallen` x², `auf` 1 − (1 − x)², `linear` x; neu `feder`
(kritisch gedämpft mit der Feder des Übergangs, Ende bei Restabstand unter 1e-4).

**Ausgleich je Regler** (`regler/ausgleich.ts`, Konzept 5.1): Springt das Soll um Δ, übernimmt der Regler −Δ als Versatz und führt ihn
mit einer kritisch gedämpften Feder (f = 1/dauer) samt Tempo auf null; das neue Soll läuft ungebremst. Im Editor beim Formen gilt
Ist = Soll. Kreisregler nehmen den kürzeren Weg. **Nachlauf** (16 b): Springt das Soll durch einen Posenwechsel im Standardübergang,
beginnt der Ausgleich dieses Reglers `Regler.nachlauf` Sekunden später; in den Eigenschaften eines Teils stellt „Nachlauf“ die Regler
seiner Knochen.

**Vorrang** (16 c): (1) Ein gestalteter Übergang stellt die Regler seiner Taktleiste; Ausgleich nur, wenn er unterbrochen wird oder mit
einem Sprung beginnt. (2) Ein Standardübergang nimmt die Feder des passenden Übergangs-Datensatzes: genaues Paar vor „nach Y“ vor
„von X“ vor `jede → jede`; dazu `nachlauf`. (3) Jeder andere Sprung (Regel, Draht, Hand im Spiel, Laune, Ende eines Übergangs, Wechsel
der Spiegelhälfte): `Regler.ausgleich`. Beim Formen Ist = Soll.

**Felder und Kreuzschlüssel, eine Regel** (16 f) für Bindungen mit zwei Achsen: Schlüssel liegen auf einem Gitter (je Achse die
Stellen der Schlüssel und die Ruhestelle; bei Feldern höchstens drei je Achse). Fehlende Gitterpunkte ergänzt der Bauplan, nie die
Datei: zuerst auf Ruhezeile und Ruhespalte per PCHIP über die vorhandenen Punkte dieser Linie (ein Punkt: konstant; bei Zusatz-Bindungen
ist der Ruhepunkt null), dann jeden übrigen als Zeile + Spalte − Mitte. Gemischt wird über das volle Gitter: PCHIP längs der ersten
Achse, dann längs der zweiten. Exakt an jedem Schlüssel; ein Kreuzschlüssel ist auf Ruhezeile und Ruhespalte null.

**Spannung und Charakter** (16 h, i): Die Spannung ist ein Regler der Figur (Rolle `spannung`, 0 bis 1, Standard 1); Regler
`spannung.<rolle>` gelten für Knochen dieser Rolle und multiplizieren; Posen setzen sie über `werte`, gestaltete Übergänge über Spuren.
Der Charakter sind die Regler `charakter.schwer`, `charakter.wabbelig`, `charakter.tollpatschig` (−1 bis 1, Standard 0); der Vierbeiner
liest „tollpatschig“ über `Baustein.regler.tollpatschig` = Kennung dieses Reglers.

**Spitzenregel** (Befund 13, `form/spitzen.ts`, nie gespeichert): Eine Spitzenführung ruht, solange zwischen `von` und `bis` (Grenzen
ausgenommen) ein Schlüssel ihrer Bindung liegt, Stützen und ruhende Schlüssel ausgenommen. Eine gespiegelte Führung (`gespiegelt`)
nimmt Spitzen und Regel der Partnerbindung im gespiegelten Bereich (um − bis bis um − von) und ihren Rahmen aus den gespiegelten
Einträgen bei `von` und `bis` (raster.ts:912–920); in einem Abschnitt `gespiegelt` gilt die Führung der gespiegelten Bindung. So ist
jede Form an jedem Schlüssel exakt, und die Übernahme bleibt gleich dem Prototyp. Legt ein Zug dort einen Schlüssel an, ruht die
Führung im selben Rückgängig-Schritt; die Vorschau sagt es vorher („Spitzenführung von <Teil> 45°–90° ruht danach“).

**Ruhen** (`form/ruhen.ts`, nie gespeichert; wie `korrekturEinsetzen`, raster.ts:796–811): (1) An der Stelle eines Schlüssels mit
Herkunft `dein` ruht jeder andere Schlüssel seiner Bindung, auch ein Vorlage-Schlüssel. (2) Näher als 8 Raster (bei θ 4°) an einem
Schlüssel `dein` ruhen gebaute Schlüssel der Art `form`; nie Faltschlüssel (die Übernahme rechnet sie aus dem Stand mit seinen
Schlüsseln, ihr Neustart hält sie aktuell; im Prototyp entstehen sie erst nach seinen Schlüsseln, raster.ts:508, 512), nie Stützen (der
Anschluss entsteht vor seinen Schlüsseln hinter 90° und hängt nicht an ihnen, raster.ts:496–497, 785), nie gebaute Schlüssel an den
Stellen gezeichneter Ansichten (`festeStellen`: wo die Figur auf dieser Achse Vorlage-Schlüssel aus einer Ansicht hat; im Prototyp
„fest“). (3) Ein ruhender Schlüssel fehlt in jeder Liste seiner Bindung und als gespiegelter Eintrag beim Partner, denn der Prototyp
entfernt ihn, bevor er die Listen bildet; deshalb gilt Ruhen nicht je Abschnitt. Für die Spitzenregel zählt er nicht.

**Neue Schlüssel in Listen** (`form/listen.ts`, Schlussprüfung Rest 2): Legt ein Zug, ein Handgriff oder ein Skript an einer Bindung
mit Abschnitten einen Schlüssel an, kommt er in jede Liste, die seine beiden Nachbarschlüssel auf dieser Achse führt; führt keine Liste
beide, in jede, die einen der beiden führt. Sein gespiegelter Eintrag kommt nach derselben Regel in die Listen der Partnerbindung. Beim
Löschen fällt er aus allen Listen. So bleibt jede Liste geschlossen, wie es der Prototyp beim Bilden der Listen tut; Bindungen ohne
Abschnitte bleiben wie bisher. **Fehlende Schlüssel einer fremden Quelle:** Verschiebt oder löscht Florian im Prototyp einen Schlüssel,
zeigt ein Listeneintrag bis zum Neustart der Übernahme ins Leere. Solche Einträge lässt der Bauplan aus und meldet sie im Prüfer; das
Projekt bleibt bearbeitbar (Ausnahme zu 3.6 Nr. 8). Die neu gestartete Übernahme schreibt danach neue Listen.

**Biegeachsen mit Gewichten** (Befund 17): Die Achse wirkt am Anker als örtlicher Rahmen bei u, der Elternknochen starr; gemischt mit
w je Anker (linear in M4.2, Drehzentren ab M9.2). Griffe erben die Abbildung ihres Ankers; ein eigener Satz je Griffpaar (glatt) oder je
Griff (Ecke). Ohne Gewichte folgen alle Anker der Achse ganz; der Autorig schlägt nur nahe der Wurzel eine weiche Stufe vor, so breit
wie das Glied dick.

### 4.5 Physik und Logik

```ts
// laufzeit/vertrag/welt.ts – erfüllt von studio-welt (Box2D) und vertrag/weltAttrappe.ts
export type KoerperArt = 'fest' | 'beweglich' | 'gefuehrt';
export interface Lage { x: number; y: number; w: number }
export interface Masse { masse: number; traegheit: number; schwerpunkt: Punkt }
export type { Huelle } from '@ee/studio-format/typen/physik';   // liegt im Format (3.2), weil das Körpermodell sie nennt
export interface StoffWerte { haftung: number; abprall: number; rollwiderstand: number; dichte: number }   // dichte: Masse je L²
export interface FederMass { f: number; zeta: number }   // aus Feder: f = 1/dauer, ζ = 1 − federung
/** Feldbreiten, Werte mit Literaltyp (nie `: number` davorschreiben); Aufbau je Eintrag im Text unten */
export const LAGE_FELDER = 3;       // x, y des Ursprungs, w (Grad, in (−180, 180] wie bei Box2D)
export const TEMPO_FELDER = 3;      // vx, vy (Tempo des Ursprungs, nicht des Schwerpunkts), ω (Grad/s)
export const KONTAKT_FELDER = 11;
export const ZONE_FELDER = 3;       // Zone, Körper, Art: 1 betreten, 0 drin, −1 verlassen; aufsteigend nach (Zone, Körper)
export const BEIN_FELDER = 6;
export const STRAHL_FELDER = 7;     // x, y (Treffer), nx, ny (Normale zum Strahlanfang hin), Anteil t in [0, 1], Körper, Hülle
export const VIELECK_PUNKTE = 8;    // höchstens so viele Punkte je Vieleck, vor der Hülle gezählt (b2ComputeHull lehnt 9 ab)
/** vom Aufrufer einmal angelegt; `lagen` und `tempi` brauchen je Körper LAGE_FELDER und TEMPO_FELDER Zahlen (sonst RangeError), entfernte
 *  Körper stehen dort als NaN; `kontakte`, `zonen` und `beine` bekommen, was hineinpasst, die Zähler sagen, wie viele geschrieben sind */
export interface WeltPuffer {
  lagen: Float64Array; tempi: Float64Array; kontakte: Float64Array; kontaktZahl: number; zonen: Int32Array; zonenZahl: number;
  beine?: Float64Array; beinZahl?: number;   // Federbeine des letzten Schritts (BEIN_FELDER je Bein); ohne das Feld schreibt lesen keine
}
export interface WeltAdapter {
  laden(): Promise<void>;           // lädt Box2D als WebAssembly; die Attrappe ist sofort bereit
  neu(schwerkraft: Punkt): void;    // leert die Welt (L/s², y nach unten); alle Nummern beginnen wieder bei 0
  koerper(art: KoerperArt, lage: Lage, masse?: Masse): number;   // ohne masse aus den Hüllen; ohne Masse aus Hüllen: Masse 1, dreht nicht
  aktiv(k: number, an: boolean): void;   // ausgeschaltet: bewegt sich nicht, stößt nicht, unsichtbar für Strahl und Zone; Tempo bleibt
  entfernen(k: number): void;            // samt Hüllen, Gelenken und Federbeinen; ein Finger an ihm lässt los
  /** Vielecke 3 bis VIELECK_PUNKTE Punkte, nicht alle auf einer Geraden, aus nicht konvexen Punkten die konvexe Hülle, `rundung` als
   *  Radius; Ketten mindestens 2 Punkte, als Schleife mindestens 3, ohne Masse und Dicke, einseitig (Text unten); eine Kette stößt nicht
   *  mit einer Kette; sonst RangeError. schnell: kontinuierliche Kollision gegen feste und geführte Körper (Box2D: Bullet) */
  huelle(k: number, h: Huelle, s: StoffWerte, schnell?: boolean): number;
  scharnier(a: number, b: number, punkt: Punkt, motor?: { tempo: number; moment: number }, grenzen?: [number, number]): number;
  /** Motor-Gelenk mit Ziel-Lage: eine Feder zieht den Ursprung von b auf das Ziel im Rahmen von a und w_b − w_a auf den Zielwinkel
   *  (kürzester Weg); Kraft höchstens hoechstkraft, Moment höchstens hoechstkraft · ρ mit ρ = √(I_eff / m_eff); beim Anlegen ist das Ziel
   *  die aktuelle Lage; Höchstkraft 0: das Gelenk ruht */
  ziel(a: number, b: number, feder: FederMass, hoechstkraft: number): number;
  /** neues Ziel; dazu optional neue Höchstkraft und Feder (die Spannung ändert sich je Takt, 16 h); ein Scharnier ist kein Motor-Gelenk
   *  (RangeError) */
  zielSetzen(gelenk: number, lage: Lage, hoechstkraft?: number, feder?: FederMass): void;
  /** greift beim ersten `an` den beweglichen Körper, dessen Hülle `punkt` enthält (eine geschlossene Kette enthält ihr Inneres; bei
   *  mehreren der mit der höchsten Nummer), genau an diesem Punkt; kein Körper: hält nichts bis zum neuen Ansetzen; `an: false` lässt los */
  finger(an: boolean, punkt: Punkt, feder: FederMass, hoechstkraft: number): void;
  /** Federbein nur für den nächsten Schritt (der Baustein gibt es je Takt neu an): Strahl je Teilschritt von `von` in `richtung` (beim
   *  Aufruf in der Welt, danach mit k gedreht), lang wie die Ruhelänge laenge + g/(2πf)²; sieht weder k noch direkt per Gelenk mit k
   *  verbundene Körper. Trifft er im Abstand d, drückt das Bein längs der Normale am Treffer mit
   *  F = anteil · ((2πf)² · (Ruhelänge − d) − 2ζ · 2πf · u), nie negativ, auf k und gegengleich auf den getroffenen Körper; so gilt beim
   *  Gewichtsanteil genau `laenge` (Vorspannung). `anteil`: Masse, die das Bein trägt, ohne Angabe die Masse von k geteilt durch die Zahl
   *  seiner Federbeine im Schritt. Rückgabe: Nummer des Beins in diesem Schritt (0, 1, … in Aufrufreihenfolge) für WeltPuffer.beine */
  federbein(k: number, von: Punkt, richtung: Punkt, laenge: number, feder: FederMass, anteil?: number): number;
  kraftpaar(a: number, b: number, punkt: Punkt, kraft: Punkt): void;   // Vortrieb mit Rückwirkung aufs Rad; nur der nächste Schritt,
                                                                       // mehrere Aufrufe addieren sich
  /** erster Treffer auf eine Hülle eines eingeschalteten Körpers (STRAHL_FELDER nach `aus`); eine Hülle, in der `von` liegt, zählt nicht;
   *  ein Kettenstück nur von vorn; Zonen nie */
  strahl(von: Punkt, nach: Punkt, aus: Float64Array): boolean;
  zone(h: Huelle, lage: Lage): number;   // feste Zone (Sensor), Grenzen der Hüllen wie bei huelle; meldet bewegliche und geführte Körper
  schritt(dt: number, teilschritte: number): void;   // dt > 0, teilschritte ganz ≥ 1
  lesen(aus: WeltPuffer): void;     // ein Aufruf über die WebAssembly-Grenze je Takt
  pruefsumme(): number;             // Zustands-Hash von Box2D, sonst über alle gelesenen Lagen und Tempi; ganz in [0, 2³²)
  merken(): Uint8Array; zuruecksetzen(stand: Uint8Array): void;   // nur zwischen zwei Schritten; danach bitgleich weiter; nie als Datei
  /** Pflicht: führt einen Körper (vor allem `gefuehrt`, etwa das Rad „Boden“) so, dass er am Ende des nächsten Schritts in `lage` steht
   *  (Box2D: b2Body_SetTargetTransform), auf dem kürzeren Weg gedreht; auf einen festen Körper wirkt es nicht */
  fuehren(k: number, lage: Lage): void;
}

// laufzeit/vertrag/baustein.ts
export interface Bausteinart {
  art: string;
  messwerte: readonly string[]; zustaende: readonly string[]; ereignisse: readonly string[];
  befehle: readonly string[];
  kanaele: readonly string[];        // nur Reglernamen (16 e); Posen-Kanäle 'pose.<Schicht>' hat jedes Ding mit Figur von selbst
  standLaenge(b: Baustein, plan: Bauplan): number;   // Zahlen in Lauf.bausteine; fest je Datensatz und Bauplan
  anlegen(b: Baustein, plan: Bauplan, welt: WeltAdapter, lauf: Lauf): BausteinLauf;
}
export interface BausteinLauf {
  teilschritt(dt: number, welt: WeltAdapter, lauf: Lauf): void;   // Schritt 7, viermal je Takt
  nachTakt(lauf: Lauf): void;                                      // Messwerte setzen, Ereignisse ins Postfach
  messwert(name: string, lauf: Lauf): number; zustand(lauf: Lauf): string;   // aus seinem Bereich von lauf.bausteine
  befehl(name: string, wert: number | undefined, lauf: Lauf): void;
  kanal(name: string, wert: number | string | null): void;         // null: Kanal frei, Grundwert gilt
}
// laufzeit/vertrag/chip.ts
export interface Chipart {
  art: string; ausgang: 'regler' | 'knochen' | 'anker' | 'welt';
  standLaenge(c: PhysikChip, plan: Bauplan): number;   // Zahlen in Lauf.figur; fest je Datensatz und Bauplan (0: ohne Stand)
  anlegen(c: PhysikChip, plan: Bauplan): ChipLauf;
}
/** `schritt` liest und schreibt nur seinen Bereich von `lauf.figur` und seinen Ausgang; `ruht` liest nur seinen Bereich */
export interface ChipLauf { schritt(dt: number, lauf: Lauf): void; ruht(lauf: Lauf): boolean }
// laufzeit/vertrag/warum.ts
export type WarumFrage = { regler: Id<'rg'>; takt: number } | { regel: Id<'re'>; takt: number } | { ereignis: Ereignis };
export interface WarumAntwort { saetze: string[]; beteiligte: string[] }
```

**Festlegungen der Welt** (für Adapter und Attrappe gleich; der Kopf von `vertrag/welt.ts` hält sie fest). Einheiten: Die Welt rechnet
in L (Körperlänge, wie Box2D in Metern), y nach unten, Winkel in Grad, Winkeltempo in Grad/s (der Adapter rechnet innen in Bogenmaß);
eine Lage dreht einen Punkt (lx, ly) des Körpers nach (x + cos w · lx − sin w · ly, y + sin w · lx + cos w · ly); Massen in
Masseeinheiten, Kräfte in Masse · L/s², Momente in Masse · L²/s². Körper, Hüllen, Gelenke und Zonen bekommen je ihre eigene Nummer 0, 1,
2 … in der Reihenfolge des Anlegens, in einer Welt nie wieder vergeben (erst `neu` fängt bei 0 an); eine ungültige Nummer wirft einen
RangeError. Nur für den nächsten `schritt` gelten `kraftpaar`, `federbein` und `fuehren` (das Tempo bleibt danach wie in Box2D); es
bleiben Körper, Hüllen, Gelenke, Zonen, Zielwerte aus `zielSetzen` und der Griff des Fingers bis zum Loslassen. Durch ein Gelenk
verbundene Körper stoßen nicht miteinander. **Kontakte** (`KONTAKT_FELDER` = 11, ein Eintrag je Paar sich berührender Hüllen, Hülle A <
Hülle B, aufsteigend nach (A, B)): 0 Körper von A, 1 Körper von B, 2 Hülle A, 3 Hülle B, 4 x, 5 y (Mitte der Berührung), 6 nx, 7 ny
(Normale von A nach B), 8 Annäherungstempo längs der Normale beim Beginn (L/s, sonst 0), 9 Normalimpuls dieses Schritts (Summe der
Teilschritte), 10 Art: 1 begonnen, 0 dauert an, −1 beendet (dann 4 bis 9 null); berührt heißt: Abstand unter 0,005 L. **Federbeine**
(`BEIN_FELDER` = 6, Stand am Ende des letzten Schritts): 0 getroffen (1 oder 0), 1 Abstand von `von` bis zum Treffer längs der Richtung
(ohne Treffer die Ruhelänge), 2 Normalkraft (≥ 0), 3 getroffener Körper (−1: keiner), 4 x, 5 y (Treffer, sonst das Ende des Strahls).

**Ketten sind einseitig** wie in Box2D: Ein Kettenstück von a nach b hat seine Vorderseite dort, wo
kreuz(p − a, b − a) = (p − a).x · (b − a).y − (p − a).y · (b − a).x > 0 ist, seine Normale ist ((b − a).y, −(b − a).x) / |b − a|. Auf dem
Bildschirm (y nach unten) liegt sie links der Laufrichtung: Eine Kette von links nach rechts trägt von oben, eine geschlossene Kette, die
auf dem Bildschirm im Uhrzeigersinn läuft, von außen; so muss der Hügel laufen (3.6 Nr. 12). Ein Strahl (auch der eines Federbeins)
trifft ein Kettenstück nur, wenn er nicht dahinter beginnt (kreuz(von − a, b − a) ≥ 0); eine Hülle stößt mit ihm nur, wenn ihr
Mittelpunkt nicht dahinter liegt (Kreis: Mitte, Kapsel: Mitte der Strecke, Vieleck: Schwerpunkt), ebenso die kontinuierliche Kollision
(`schnell`). Nahe einer Ecke der Kette nimmt Box2D die Nachbarstücke dazu; dort ist nicht festgelegt, welches Stück stößt, und die
gemeinsame Testreihe prüft nur Fälle fern von Ecken (nachgeprüft am 20.11. mit box2d3-wasm 6.0.0).

**Feldbreiten in anderen Paketen:** `studio-welt` und `studio-bild` nehmen die Laufzeit in `src/` nur mit `import type` (2.1) und führen
jede Breite als Kopie, die tsc prüft: `import type { KONTAKT_FELDER } from '@ee/studio-laufzeit/vertrag/welt';` und
`const KONTAKT: typeof KONTAKT_FELDER = 11;` (ein anderer Wert ist ein Typfehler); `vertrag/feldbreiten.test.ts` hält diese Form für
alle Breiten aus `welt.ts`, `bilddaten.ts` und `zeichenmodell.ts` fest.

**Stand im Lauf** (Chips und Bausteine gleich): Der ganze veränderliche Stand eines Chips (Lagen und Tempi seiner Federn und
Kettenglieder) liegt in `Lauf.figur`, für Chip i (Nummer nach OrdnungPlan, `indexVon(plan.ordnung, c.id)`) von
`plan.physik.chipStand[i]` bis `chipStand[i + 1]`; der eines Bausteins (Zustand, Messwerte, Uhren, geplante Schritte) in `Lauf.bausteine`
ab `plan.logik.bausteinStand[i]`. Die Länge sagt die Art (`standLaenge`), die Versätze legt der Bauplan an. Ein frischer Lauf hat dort
lauter Nullen: die Ruhe und der Anfangszustand. So sichert ein Schlüsselstand alles mit dem Lauf, und die Prüfsumme des Takts zählt es.
Ein `ChipLauf` hält nur, was er aus dem Bauplan vorausrechnet, ein `BausteinLauf` nur, was beim Anlegen entsteht und sich im Lauf nicht
ändert (etwa die Nummern seiner Körper in der Welt); keiner hat einen eigenen Stand, `stand` und `setzen` gibt es nicht. Kanalwerte
gehören nicht zum Stand: Die Regeln setzen sie in jedem Takt neu (Schritt 3), bevor die Teilschritte laufen. Die `ChipLauf` und
`BausteinLauf` hält die Fassade (4.2).

**Die Attrappe** (`vertrag/weltAttrappe.ts`, Klasse `WeltAttrappe`) erfüllt jede Funktion einfach und deterministisch nach dem Vorbild von
Box2D 3.2 (Soft Step): ohne Reibung, Rollwiderstand und Warmstart (`haftung` und `rollwiderstand` werden nur gemerkt), Vielecke zählen für
die Masse ohne ihre Rundung, Ketten einseitig wie oben. Ohne Reibung rutscht ein Körper irgendwann vom Hügel; ihre Tests prüfen nur, was
der Vertrag sagt.

Bausteinarten tragen sich in `bausteine/register.ts` ein (Liste `BAUSTEINARTEN`, Suche `bausteinart(art)`), Chiparten in `physik/chips.ts`
(`CHIPARTEN`, `chipart(art)`), Zusatzarten in `posen/zusatzarten.ts` (`ZUSATZARTEN`, `zusatzart(art)`), Effektarten in
`studio-bild/src/effekte/register.ts` (`EFFEKT_ZEICHNUNGEN`, 4.6); ihre Schemas und Migrationen in `studio-format/src/arten/` (Schlüssel
`<familie>:<art>`, 3.4). Eine neue Art ändert nur diese
Listen und ihre eigene Datei; Bedienung, Regeln und Prüfer lesen ihre Anschlüsse aus der Art. **Erweiterungstest** (Befund 28):
`apps/studio/test/erweiterung.test.ts` trägt je Familie, sobald sie existiert (Zusatzbewegungen M4, Chips M5, Effekte M6, Bausteine
M7), zur Laufzeit eine Test-Art ein (Schema, Version, Anschlüsse) und prüft ohne weiteren Code Format-Rundweg, Bauplan, Bedienung
(Lücken der Regeln, Eigenschaften), Prüfer und „Warum?“.

**Kanäle** (16 e): Ein Kanal ist ein Eingang eines Dings, um den Regeln streiten: jeder Regler seines Bausteins
(`Baustein.regler[name]`, etwa Wunschtempo, Bremskraft) und je Schicht seiner Figur die Pose (`pose.<Schicht>`); dazu `zeitfaktor` der
Szene. Kennung `<Ding>.<name>`. Grundwert: Ist der Wert in `Baustein.regler` eine Regler-Kennung, gilt dieser Regler samt Draht und Hand,
sonst die Zahl. Posen-Kanäle: die Pose, die der Baustein des Dings verlangt (Vierbeiner aus seinem Zustand), sonst die zuletzt
angeforderte, sonst die Grundform. Regeln überschreiben den Grundwert nach Band.

**Körper und Zeichnung** (Befund 6, `bausteine/vierbeiner/kopplung.ts`): Das Körpermodell ist ein Datensatz der Figur (`Koerpermodell`,
3.2), eines je Figur, damit es in jeder Szene dasselbe ist; Bausteine nehmen es von der Figur ihres Dings. Für Ozzy schreibt es das
Inhalt-Skript (M5.6), für neue Figuren, auch die Katze, der Autorig (M9). (a) Der Wurzelknochen folgt immer dem Körper `rumpf.hinten`
(Lage x, y, Drehung der Figur); eine zweite Regel für die Wurzel gibt es nicht. Dass er in Ruhe auf der gezeichneten Höhe steht, machen
die Federbeine mit Vorspannung: Ihre Ruhelänge ist so gewählt, dass beim Gewichtsanteil des Beins genau die gezeichnete Länge gilt (bei
einer Feder mit Frequenz f die gezeichnete Länge plus g/(2πf)²). So stehen die Pfoten auf dem Rand; den Rest der Krümmung des Hügels
(unter 0,005 L) gleichen die Beinachsen aus. (b) Jeder andere Körper schreibt seine Abweichung vom Gelenkziel
nur in die Regler, die `abweichung` nennt (Ozzy: `rumpf.vorn` längs → Stauchung; `kopf` Winkel → Nicken), sonst nirgends hin. (c) Die
Abweichung wirkt mit einem Anteil s: s geht über eine Feder (0,3 s, 0 %) auf 0, wenn alle Körper seit 0,5 s langsamer sind als
0,05 L/s und 2°/s, sonst auf 1; in Ruhe zeigt die Figur genau Pose und Zeichnung, auch wenn die Motor-Gelenke unter der Schwerkraft
nachgeben. (d) Hängt an einem Regler ein Chip der Figurphysik (Schwingen, Kette, Stauchen, Ruhig halten), gewinnt der Chip; die
Abweichung eines Box2D-Körpers zählt dort nur im Sturz (Spannung unter 50 %). Die Höchstkraft jedes Gelenks ist der Wert der Spannung.

**Kehrtwende** (Befund 8, `bausteine/vierbeiner/kehrtwende.ts`): vorläufig über die Front (A4): ein gestalteter Übergang der Schicht
Körper, ψ 90° → 0° → −90°, 0,5 s, unterbrechbar. Während der Wende ruht der Gang (Phase hält, Standpfoten stehen, Wunschtempo 0).
Gewendet wird nur aus „Stehen“, weil nur sie eine Vorderansicht hat (6.2 Nr. 9); aus jeder anderen Pose, auch aus „Schritt“, geht der
Planer zuerst über den Ausgleich nach „Stehen“. Gewendet wird erst, wenn Ozzy länger als `wendenNach` (Kanal des Vierbeiners, Standard
0,3 s, A17) jenseits des Scheitels ist. Die Hüllen
`rumpf.vorn` und `rumpf.hinten` rücken über das Gelenkziel zusammen: Abstand = gezeichneter Abstand mal |sin ψ|, mindestens die halbe
Rumpfbreite; keine Hülle wird je Takt umgeformt. In der gespiegelten Hälfte von ψ werden die Regler aus `Spiegelregel.regler`
mitgespiegelt; Posen und Regeln nennen θ immer relativ zur Laufrichtung, θ = 0° bleibt der Blick in die Kamera. Die Taktleiste der
Kehrtwende führt θ beim Durchgang durch ψ = 0° über 0°; wechselt ψ sonst das Vorzeichen, während ein mitgespiegelter Regler nicht auf
seiner Achse steht, nimmt der Ausgleich den Sprung auf.

### 4.6 Renderer

```ts
// laufzeit/vertrag/zeichenmodell.ts
export const KANAELE = 24;          // Flächen je Feldsatz: sechs Texturen mit je vier Kanälen (Textur kanal >> 2, Farbkanal kanal & 3)
export interface ZeichenModell {
  /** je Teil, das als Feld gezeichnet wird, in der Folge von OrdnungPlan.teile; farbe 0 bis 1; feldsatz: Index in `feldsaetze`;
   *  kanal: 0 bis KANAELE − 1 darin */
  teile: { teil: number; figur: number; farbe: [number, number, number]; weiss: boolean; linie: boolean; feldsatz: number; kanal: number }[];
  /** je bewegter Figur je angefangene KANAELE gezeichnete Teile einer (Regel unten; 30 Flächen: zwei); teile[k]: das Teil in Kanal k;
   *  einheit: einheitL der Figur, damit der Zeichner Maße aus Figur-Einheiten (Uniforms von Verbindungen, Klemmen, Effekten) in die Welt
   *  der Strecken umrechnet */
  feldsaetze: { figur: number; einheit: number; teile: number[] }[];
  verbindungen: { a: number[]; b: number[]; art: 'verschmelzen' | 'fuge'; nachKante: boolean; uniform: number }[];
  effekte: { art: string; wo: number[]; uniformStaerke: number; uniformWeichheit: number; profil: Float32Array | null; daten: ArtDaten }[];
  klemmen: { weiss: number; traeger: number; uniformRand: number; weich: number }[];
  hinter: { weiss: number; schwarz: number; uniformTiefe: number }[];
  uniforms: { name: string; quelle: number | null; fest: number }[];   // quelle: Reglerindex
  gebacken: { ding: number; figur: number; groesse: number }[];   // je gebackenem Ding (ding: Index nach OrdnungPlan); Feld einmal
                                                                  // gebacken, je Figur nur einmal
}
// laufzeit/vertrag/bilddaten.ts: Feldbreiten (Werte mit Literaltyp) und Inhalt je Eintrag; „Welt“ heißt wie BildStand.anker: L, y nach
// unten, die Lage jeder Figur eingerechnet (4.3)
export const STRECKE_FELDER = 6;    // 0 ax, 1 ay, 2 bx, 3 by (Welt), 4 Eintrag in `teile` (laufende Nummer im Bild), 5 Reichweite (Welt):
                                    // je Teil gleich, das größte Maß seiner Verbindungen (Uniform durch die einheit seines Feldsatzes),
                                    // ohne Verbindung 0; den Rand für Kantenglättung und Effekte legt der Zeichner in Bildpunkten dazu
export const TEIL_FELDER = 5;       // 0 Teil (nach OrdnungPlan), 1 erste Strecke, 2 Zahl der Strecken, 3 Feldsatz-Instanz (laufende
                                    // Nummer im Bild), 4 Kanal; die Einträge einer Instanz stehen beieinander, ein unsichtbares Teil
                                    // (Wechsel) hat keinen Eintrag und keine Strecken
export const RAHMEN_FELDER = 5;     // je Feldsatz-Instanz: 0 ihr Feldsatz im ZeichenModell, 1 x0, 2 y0, 3 x1, 4 y1 (Welt, alle Strecken
                                    // ihrer Teile, ohne Reichweite; ohne Strecken x0 = y0 = +∞, x1 = y1 = −∞)
export const DECKUNG_FELDER = 3;    // je weichem Paar: 0 unteres, 1 oberes Teil (Einträge in `teile`, dieselbe Instanz), 2 Anteil, zu dem
                                    // das obere über dem unteren liegt; nur Paare in einem Wechsel mit Breite und Anteil echt zwischen 0
                                    // und 1, jedes Paar höchstens einmal; alle übrigen Paare folgen hart aus `ordnung`
export const GEBACKEN_FELDER = 3;   // je gebackenem Ding in der Folge von ZeichenModell.gebacken: 0 x, 1 y (Welt), 2 Drehung (Grad)
export const KREIS_FELDER = 6;      // 0 x, 1 y, 2 Radius, 3 Deckkraft (0 bis 1), 4 Raum (0 Welt, 1 Bild in Bildpunkten, für „Kamera
                                    // nass“), 5 Effekt (Index in ZeichenModell.effekte, der den Kreis zeichnet; −1: keiner)
export const KAMERA_FELDER = 6;     // 0 Maßstab (Bildpunkte je L), 1 x, 2 y (Mitte des Bilds in der Welt), 3 Drehung (Grad), 4 Breite,
                                    // 5 Höhe (Bildpunkte)
export interface BildDaten {
  strecken: Float32Array; streckenZahl: number;          // STRECKE_FELDER je Strecke
  teile: Uint32Array; teilZahl: number;                  // TEIL_FELDER je gezeichnetem Teil
  rahmen: Float32Array; feldsatzZahl: number;            // RAHMEN_FELDER je Feldsatz-Instanz
  /** Malreihenfolge nach Wechseln, Einträge von `teile` von unten nach oben: für eine Instanz mit den Einträgen e0 bis e0 + n − 1 ist
   *  ordnung[e0 … e0 + n − 1] eine Umordnung genau dieser Einträge */
  ordnung: Uint16Array;
  deckung: Float32Array; deckungZahl: number;            // DECKUNG_FELDER je weichem Paar
  werte: Float32Array;                                   // je Feldsatz-Instanz f und Uniform u: werte[f · U + u], U = Zahl der Uniforms
  lagen: Float32Array;                                   // GEBACKEN_FELDER je gebackenem Ding
  kreise: Float32Array; kreisZahl: number;               // KREIS_FELDER je Kreis (Spritzer, Staub, Kamera nass; Befund 29)
  kamera: Float32Array;                                  // KAMERA_FELDER
}
/** Platz für die Bilder eines Bauplans: `auswertungen` je Bild (1 + Zwiebelhaut, Posenkarten oder Geister; Standard 1), `kreise` Kreise
 *  (Standard 0); neu anlegen, wenn sich die Struktur des Bauplans oder die Zoomstufe ändert; zu wenig Platz ist ein RangeError */
export function bildDatenAnlegen(plan: Bauplan, o?: { auswertungen?: number; kreise?: number }): BildDaten;
export function bildDatenLeeren(aus: BildDaten): void;   // zu Beginn jedes Bilds: alle Zähler auf 0; lagen und kamera gelten weiter

// studio-bild/src/zeichner.ts (die Typen seit M0; M1.4 ergänzt die Datei um zeichnerAnlegen)
export interface ZeichenZeiten { aufrufe: number; feldBildpunkte: number; ms: number }
export interface Zeichner {
  modell(m: ZeichenModell): void;                        // übersetzt Shader neu, nur bei Strukturänderung
  groesse(breite: number, hoehe: number, dichte: number): void;
  zeichne(d: BildDaten): void;                           // unter 100 WebGL-Aufrufe
  verloren(): boolean; wiederherstellen(): void;         // Kontextverlust: alles neu aus Modell und Daten
  zeiten(): ZeichenZeiten; freigeben(): void;
}
/** Quellen der drei Shader: Strecken (Abstandsfelder je Teil), Felder (Vereinigungen, Fugen), Bild (Farbe in Malreihenfolge) */
export interface ShaderQuellen { strecken: string; felder: string; bild: string }
export type ZeichnerAnlegen = (canvas: HTMLCanvasElement, o: { halbeFelder: boolean; rahmen: boolean }) => Zeichner;
export type ShaderUebersetzen = (m: ZeichenModell) => ShaderQuellen;   // gleiches Modell, gleiche Quellen; alle Shader beim Laden
export function zeichnerAnlegen(canvas: HTMLCanvasElement, o: { halbeFelder: boolean; rahmen: boolean }): Zeichner;   // M1.4, Typ ZeichnerAnlegen
export function shaderUebersetzen(m: ZeichenModell): ShaderQuellen;    // M1.4 in uebersetzen.ts, Typ ShaderUebersetzen

// studio-bild/src/effekte/register.ts: die Typen und Hilfen sind Vertrag (M0), die Liste gehört dem Zusammenbau (2.2)
export type ShaderStufe = keyof ShaderQuellen;                         // 'strecken' | 'felder' | 'bild'
export type ModellEffekt = ZeichenModell['effekte'][number];
export interface ShaderBeitrag {
  readonly oben?: string;                                // oberste Ebene: Konstanten, Funktionen, eigene Uniforms; gleicher Text mehrerer
                                                         // Effekte steht nur einmal im Shader
  readonly stellen?: Readonly<Record<string, string>>;   // im Rumpf, je Einhängestelle (Namen aus der Übersetzung, M1.4); mehrere
                                                         // Effekte in der Folge von ZeichenModell.effekte
}
export interface EffektZeichnung {
  readonly art: string;                                  // Name der Art wie im Register der Arten (Schlüssel 'effekt:<art>', 3.4)
  /** je Shader höchstens ein Beitrag; nur Text, ohne Zustand, deterministisch (gleicher Effekt und gleiche Nummer, derselbe Text); `nr`:
   *  seine Stelle in ZeichenModell.effekte, macht eigene Namen eindeutig; Werte je Bild liest der Text über die Uniforms des Modells
   *  (`e.uniformStaerke`, `e.uniformWeichheit`) */
  shader(e: ModellEffekt, nr: number): Readonly<Partial<Record<ShaderStufe, ShaderBeitrag>>>;
}
export const EFFEKT_ZEICHNUNGEN: readonly EffektZeichnung[];           // Registerliste, in M0 leer
export function effektZeichnungEintragen(z: EffektZeichnung): void;   // auch zur Laufzeit (Erweiterungstest); dieselbe Art zweimal ist
                                                                       // ein Fehler, außer derselbe Eintrag
export function effektZeichnungVon(art: string): EffektZeichnung | undefined;
```

**Feldsätze, eine Regel an einer Stelle:** `bauplan/zeichen.ts` (M1.3) teilt auf und prüft es dort (auch „30 Flächen ergeben zwei
Feldsätze“). Jede Figur, deren Form sich bewegt, bekommt einen Feldsatz; hat sie mehr als `KANAELE` gezeichnete Teile (Flächen und
Linien), je angefangene `KANAELE` einen weiteren. Ihre Teile kommen in der Folge von `OrdnungPlan.teile` auf die Plätze 0, 1, … ihres
Feldsatzes; der Kanal ist dieser Platz. Figuren ohne Formänderung werden gebacken (`gebacken`) und haben keinen Feldsatz.
`studio-bild` (`feldsaetze.ts`, M1.4) nimmt die Aufteilung, wie sie im Modell steht, teilt nie selbst auf und legt je Feldsatz-Instanz
eines Bilds die Texturen an.

**Ein Bild wächst** (16 j): Wer zeichnet, leert die Daten zu Beginn jedes Bilds (`bildDatenLeeren`). Jeder Aufruf von `Laufzeit.bild` und
`Laufzeit.auswerten` hängt eine Auswertung an: je Feldsatz des Zeichenmodells eine Feldsatz-Instanz (laufende Nummer in diesem Bild) samt
ihren Teilen und Strecken. So zeichnet der Zeichner Zwiebelhaut, Posenkarten und Geister wie die Figur selbst. Den Platz legt die App
(Bühne, Spiel, Messseite) mit `bildDatenAnlegen` einmal je Bauplan an; im Bildtakt entsteht kein Speicher. **Wer füllt was:** `strecken`,
`teile` und `rahmen` Schritt 16 (`form/abflachen.ts`, M1.3); `ordnung` und `deckung` die Malreihenfolge (`form/wechsel.ts`, M1.3) für
die Teile, die Schritt 16 eben angehängt hat; `werte` die Fassade je angehängter Instanz aus `ZeichenModell.uniforms` und den gezeigten
Reglerwerten; `lagen` die Fassade aus den Körperlagen der gebackenen Dinge (ab M6); `kreise` die Laufzeit aus den Teilchen (ab M6), die
Messseite (M2.4) für ihre Ersatzszenen selbst; `kamera` wer zeichnet (im Editor die Bühne aus Zoom und Verschiebung, im Spiel die App aus
der Kamera der Szene). `studio-bild` liest BildDaten nur.

`bauplan/zeichen.ts` legt `ZeichenModell.effekte[].wo` nach `aufGezeichnet` der Art fest (30 d): An Teilen mit `wieGezeichnet` stehen
nur Arten mit „zeichnung“, Arten mit „bewegung“ (ihre Stärke ist in Ruhe null) und Datensätze mit „nurFlorian“ und Herkunft `dein`.
Kontakt- und Bodenschatten sind „nurFlorian“ wie die übrigen Effekte (Befund 9): Sie fallen auf Boden und Welt; auf ein Teil mit
`wieGezeichnet` nur, wenn er sie dort selbst anschaltet. **Weiß nachgeben** (`effekte/weissNachgeben.ts`, Art „zeichnung“): Ein weißes
Teil gibt dem Schwarz, das in der Malreihenfolge darüber liegt, weich nach, statt hart abzuschneiden (weiches Maximum mit Stärke k;
renderer.ts:233–234, `Fluessig.weissSchwarz`; im Prototyp „Weiß – Schwarz“ 8 an den Beinfenstern). Halbe Feldauflösung
(`halbeFelder`) bleibt aus; sie verändert
seinen Look und kommt nur mit seinem Wort (8.3). Text braucht keinen eigenen Zeichenweg: Er ist eine Figur (4.7, `textSetzen`).

### 4.7 Editor in der Laufzeit

```ts
// laufzeit/vertrag/editor.ts
export type Stelle =
  | { art: 'grundform'; figur: Id<'fig'> }
  | { art: 'pose'; pose: Id<'po'> }
  | { art: 'achse'; regler: Id<'rg'>; wert: number }
  | { art: 'uebergang'; uebergang: Id<'ue'>; zeit: number }
  | { art: 'zelle'; schicht: Id<'sch'>; von: Id<'po'>; nach: Id<'po'>; anteil: number }    // Standardübergang vor dem ersten Zug
  | { art: 'ausprobieren'; schicht: Id<'sch'> };   // 16 g: nur Anfasser stellen Regler; A, V, P gesperrt (Statuszeile sagt warum);
                                                   // Halten → „als Pose behalten“ ruft poseAnlegen; sonst wird nichts gespeichert
export type Geltung =
  | { art: 'hier' } | { art: 'allePosen' } | { art: 'grundform'; posenGehenMit: boolean }
  | { art: 'nurPose'; pose: Id<'po'> } | { art: 'gelenkUeberall'; regler: Id<'rg'>; wert: number };
export type Ziel =
  | { art: 'ansichtsschluessel'; bindung: Id<'bd'>; an: number; vorhanden: Id<'sl'> | null; gespiegelt: boolean }
  | { art: 'grundform'; teil: Id<'teil'> }
  | { art: 'posenkorrektur'; pose: Id<'po'>; teil: Id<'teil'> }
  | { art: 'zwischenpose'; uebergang: Id<'ue'>; zeit: number; vorhanden: Id<'po'> | null }
  | { art: 'korrekturform'; regler: Id<'rg'>; an: number; teil: Id<'teil'> }
  | { art: 'kreuzschluessel'; achsen: [Id<'rg'>, Id<'rg'>]; an: [number, number]; teil: Id<'teil'> }
  | { art: 'formziel'; regler: Id<'rg'>; an: number; teil: Id<'teil'> };
export type Zug =
  | { art: 'anker'; teil: Id<'teil'>; anker: number; was: 'anker' | 'ein' | 'aus'; nach: Punkt; ecke: boolean }
  | { art: 'teil'; teil: Id<'teil'>; verschiebung: Punkt; drehung: number }
  | { art: 'stueck'; teil: Id<'teil'>; stueck: number; t: number; nach: Punkt }   // A biegt ein Kurvenstück (Befund 14)
  | { art: 'anfasser'; rolle: string; nach: Punkt };      // posiert: stellt Regler, legt keinen Schlüssel an

// editor/zielregel.ts, rueckrechnen.ts, fang.ts
export function zielBestimmen(plan: Bauplan, stelle: Stelle, teil: Id<'teil'>, geltung: Geltung): Ziel;
export function vorschau(plan: Bauplan, stelle: Stelle, teil: Id<'teil'>): { ziel: Ziel; ruhenWuerden: Id<'sl'>[]; status: string };
export function rueckrechnen(plan: Bauplan, stand: BildStand, zug: Zug, ziel: Ziel): (e: Entwurf) => void;
export function fangen(plan: Bauplan, regler: Id<'rg'>, wert: number): number;   // aufs Raster der Leiste (ReglerPlan.raster)
// editor/ankerSetzen.ts, ankerLoeschen.ts
export function ankerSetzen(dok: Dokument, teil: Id<'teil'>, stueck: number, t: number): { tun: (e: Entwurf) => void; abweichung: { schluessel: Id<'sl'>; bildpunkte: number }[] };
export function ankerLoeschen(dok: Dokument, teil: Id<'teil'>, anker: number): { tun: (e: Entwurf) => void; abweichung: { schluessel: Id<'sl'>; bildpunkte: number }[] };
// editor/waechter.ts, ruhewaechter.ts, faltenVorschlag.ts
export function waechter(plan: Bauplan, anker: Float64Array, marken: Float64Array): number;   // Sehnenumkehr, Schlaufe, Selbstschnitt
export function ruheWaechter(dok: Dokument, plan: Bauplan): { teil: Id<'teil'>; stelle: string; abweichung: number }[];
export function faltenVorschlag(plan: Bauplan, bindung: Id<'bd'>, von: number, bis: number): ((e: Entwurf) => void) | null;
// editor/aufnehmen.ts
export function aufnehmen(mitschnitt: Mitschnitt, regler: Id<'rg'>[], von: number, bis: number, schicht: Id<'sch'>): (e: Entwurf) => void;
```

**Rückrechnung** (Befund 13, `editor/rueckrechnen.ts`) zählt alle Schritte nach dem Mischen auf und behandelt jeden: Flüchtige Schritte
(Gelee, Glätte-Schutz) sind beim Formen aus (Ist = Soll). Knochen werden exakt invertiert (starr: inverse Matrix;
Biegeachse: örtlicher Rahmen bei u; Gewichte: gemischte Abbildung des Ankers, Griffe mit ihrem Satz). Zusatzformen: Ziel ist immer ein
Schlüssel an der Stelle; dort ist das Mischen exakt, der Versatz wird direkt im Rahmen der gezeigten Form gesetzt. Ist das Ziel der
Ansichtsschlüssel und wirken Zusatzformen, bestimmt ein Fixpunkt die neue Gestalt (g ← Ziel − Σ Zusatz(g), Abbruch unter 1e-9,
höchstens acht Schritte, sonst eine Meldung statt des Zugs). Die Spitzenführung ruht am Ziel nach der Spitzenregel (4.4). In der
Spiegelhälfte wird der Punkt gespiegelt (und umnummeriert), und der Schlüssel des Partners ist das Ziel (bei einem gespiegelten
Listeneintrag der, auf den er verweist; wie `korrekturAus` im Prototyp). **Ausnahme Datei** (`ansichtAusSvg`): Eine Datei auf einer
Stelle der gespiegelten Hälfte (etwa „Körper −90°“, A18) legt dort eigene Ansichtsschlüssel an. Die Bindungen der Teile bekommen für die
gespiegelte Hälfte einen Abschnitt `liste` mit den bisherigen gespiegelten Einträgen (gleiches Bild wie vorher), in dem der neue
Schlüssel den gespiegelten Eintrag an seiner Stelle ersetzt; dort wirkt die Spiegelregel danach nur noch auf Malreihenfolge, Wechsel und
mitgespiegelte Regler. Den Schlüssel des Partners ändert sie nie; die Vorschau sagt es vorher („Körper −90° bekommt eine eigene Ansicht,
die Spiegelung endet dort“).

**Eigenschaft der Rückrechnung** (Konzept 3.1; M3.1, M4.5): Nach dem Zug liegt der gezogene Punkt auf 1e-6 am Ziel, und kein
gespeicherter Schlüssel an einer anderen Stelle ändert sich (`rueckrechnen.test.ts`, fast-check). Dass sich die Gestalt zwischen
Schlüsseln ändert (ruhende Schlüssel, ruhende Spitzenführung), ist gewollt und steht vorher in der Vorschau.

**Handgriffe** (`editor/handgriffe/*.ts`) sind alle Änderungen des Editors als reine Funktionen `(dok, plan, argumente) => (e: Entwurf) => void`.
Die Befehle der Oberfläche und die Inhalt-Skripte rufen dieselben Handgriffe auf; so ist alles, was ein Skript anlegt, auch von Hand
machbar. Ein Handgriff entsteht mit dem Datensatztyp, den er anlegt, spätestens eine Welle vor seiner ersten Nutzung, und meldet mit
`Entwurf.ziel` den Datensatz, auf den die Geste zielt (Herkunftsregel). **Regel** (Befund 14): Jeder Handgriff ist ein registrierter
Befehl mit Geste oder Taste (`Befehl.handgriff`, `Befehl.gesten`, 4.8). Test `apps/studio/test/handgriffe.test.ts` (ab M3, wächst
mit): Jeder exportierte Handgriff hat einen Befehl in `befehle/*` mit Geste oder Taste; jeder Handgriff, den `tools/studio-inhalt`
aufruft, ist darunter. Der Test wächst mit den Etappen: ab M3.Z `form.ts` und `projekt.ts`, ab M4.Z `posen.ts` und `knochen.ts`, ab M5.Z
`welt.ts`, `physik.ts` und Teil 1 von `logik.ts` (ihre Befehle legt M5.5 an, erreichbar über ⌘K und die Eigenschaften; die Gesten der
Linse Spiel und der Strecke kommen in M6.4 und M7.4), ab M7.Z ganz `logik.ts` und `text.ts`, ab M8.Z `aufnehmen`. Vollständige Liste,
je Handgriff die Zeile aus „Ding × Geste“ (Konzept 9.5), geprüft gegen die ganze Tabelle:

| Datei (Etappe) | Handgriffe | Ding × Geste |
|---|---|---|
| `logik.ts` (M1.7) | `drahtLegen`, `kennlinieFormen`, `drahtAendern`, `drahtLoesen`, `bausteinAnhaengen`, `bausteinAendern` | Ausgang: Ziehen auf einen Regler; Kennlinie: Ziehen; Draht: Halten → glätten, lösen; Ding: Halten → „+ Verhalten“; Baustein: Tippen → Regler |
| `form.ts` (M3.1) | `formSetzen` (Anker, Griff, Kurvenstück über `rueckrechnen`), `teilVerschieben`, `figurVerschieben`, `figurAnlegen` | A ziehen (Anker, Griff, Kurvenstück, Weltpfad); V ziehen (Teil, Figur; ⌥ dreht); Bibliothek ＋ Figur |
| | `ankerSetzen`, `ankerLoeschen`, `ankerUmwandeln` (glatt, Ecke, rund) | P oder Halten → „Anker setzen“, „löschen“; ⇧C oder Halten → glatt, Ecke, rund; Griff: ⌥ ziehen bricht, Halten → koppeln |
| | `schluesselVerschieben`, `schluesselKopieren`, `schluesselSpiegeln`, `schluesselLoeschen`, `falteSetzen` (über `faltenVorschlag`) | Raute, Falte: Ziehen; Halten → kopieren, spiegeln, löschen; roter Strich eines Wächters: Halten → „Falte setzen“ |
| | `wechselSetzen`, `wechselAendern`, `wechselLoeschen`, `teilTauschen` | Leiste: Halten → „Wechsel hier“, „Teil tauschen“; Strich: Ziehen; Halten → Breite, Art, löschen |
| | `bindungAnlegen`, `reglerAnlegen`, `reglerAendern`, `mischartSetzen`, `spiegelSetzen` | Teil: Halten → „an Achse hängen“, „Spiegeln“ (je Teil an, aus); Leiste: ＋; Halten → Bereich, rund, Mischart, Spiegeln; Raute: Halten → Mischart |
| | `verbindungSetzen` (verschmelzen, Fuge), `ebeneSetzen` | Teil: Halten → „Verschmelzen“, „Fuge“, „Ebene“ |
| | `figurAusSvg`, `ansichtAusSvg` | Datei auf die Bühne; Datei auf eine Stelle der Leiste (auf der gespiegelten Hälfte: eigene Ansicht, Regel unten) |
| | `wertSetzen` (ab M4.5 auch an der Stelle Pose) | Wert in den Eigenschaften: Tippen holt seine Achse auf die Leiste und ändert nichts; Ziehen ändert an der Stelle, dort entsteht der Schlüssel; Halten → Kurve, wer treibt, Warum?, „Schlüssel hier“ |
| `projekt.ts` (M3.1) | `klangImportieren`, `hinweisUebergehen`, `fassungWiederherstellen`, `kopfdrehungUebernehmen` | Datei auf die Bibliothek; Prüfer-Hinweis: Halten → übergehen, wiederherstellen; Befehl „Kopfdrehung übernehmen“ |
| `posen.ts` (M4.5) | `poseAnlegen`, `poseVerdoppeln`, `poseSpiegeln`, `poseUmbenennen`, `poseOrdnen`, `poseNurTeile`, `poseWerteSetzen`, `schichtAnlegen` | Posen-Reihe ＋, Halten → „neue Schicht“; Posenkarte: Halten → verdoppeln, spiegeln, umbenennen, nur Teile, „als Pose behalten“; Ziehen ordnet; Anfasser und Biegeachse ziehen an der Stelle Pose oder Grundform; Anfasser: Halten → lösen (nimmt seine Regler aus der Pose) |
| | `uebergangArt`, `uebergangFeder`, `uebergangAendern`, `varianteAnlegen` | Brücke, Zelle: Ziehen = Dauer; Halten → Art, Unterbrechen, Varianten |
| | `zwischenposeSetzen` (über `rueckrechnen`), `abschnittAendern`, `zusatzSetzen`, `stehSetzen`, `markeSetzen`, `spurSetzen`, `taktLoeschen` | Zug an der Stelle Übergang; Zwischenpose, Abschnitt, Zusatzbewegung, „steht“, Marke: Ziehen verschiebt, Kante = Dauer; Halten → Kurvenart, „bis Ereignis“, Stärke, Klang, Ereignis, Chance, löschen; ＋ Zusatzbewegung, Marke, Spur |
| | `zyklusAnlegen`, `zyklusZeileSetzen` | Posenkarte: Halten → „als Zyklus“; Feld: ＋ Zeile |
| `knochen.ts` (M4.5) | `knochenSetzen`, `knochenAendern`, `gelenkVerschieben`, `gelenkRandSetzen`, `anheften`, `gewichtSetzen`, `griffSatzSetzen`, `gewichteSpiegeln` | Linse Knochen: P setzt; Gelenkring: Mitte ziehen verschiebt, Rand ziehen macht weich oder hart; Halten → Rolle, starr, biegsam, Knie; Biegeachse: Halten → Knie; Teil auf Teil ziehen; Füllring senkrecht ziehen; Halten → Schloss, spiegeln; W malt (ab M9.2) |
| `welt.ts` (M5.2) | `szeneAnlegen`, `weltAendern`, `stoffAnlegen`, `dingSetzen`, `dingVerschieben`, `dingVerdoppeln`, `dingAendern` | Bibliothek ＋ Szene, Stoff; Eigenschaften der Szene; ＋ Ding oder Zone; Ding auf dem Rand ziehen, Rand = Breite; Halten → Material, verdoppeln; Strecke: Ding ziehen |
| `physik.ts` (M5.4) | `chipAnhaengen`, `chipAendern`, `chipKopieren`, `extremeFormen`, `effektAnhaengen`, `effektAendern`, `klangAnhaengen` | Teil oder Ding: Halten → „+ Verhalten“, „+ Effekt“, „+ Klang“; Biegeachse: Halten → „Federkette“; Chip: Ziehen = Stärke; Halten → an/aus, auf Partner, Extreme formen |
| `logik.ts` (M7.1) | `regelAnlegen`, `regelAendern`, `regelBand`, `regelGeltung`, `launeAnbieten`, `aufgabeAnlegen`, `beweisSetzen` | ＋ Regel; Ding: Halten → „Laune anbieten“; Regel: Ziehen ins Band; Halten → bearbeiten, aus, nur dieses Ding; Posenkarte in eine Satzlücke ziehen; ＋ Aufgabe; Mitschnitt: Halten → „als Beweis“ |
| `text.ts` (M7.6) | `textSetzen`, `schriftAnlegen` | ＋ Text; Datei (Schrift) auf die Bibliothek |
| `editor/aufnehmen.ts` (M8.4) | `aufnehmen` | Mitschnitt: Halten → „aufnehmen“; Chip: Halten → „in Schlüssel“ |
| Löschen, je in der Datei seines Typs | `teilLoeschen`, `figurLoeschen`, `bindungLoeschen`, `reglerLoeschen`, `verbindungLoeschen` (`form.ts`, M3.1); `poseLoeschen`, `schichtLoeschen`, `uebergangLoeschen`, `zyklusLoeschen` (`posen.ts`, M4.5); `knochenLoeschen` (`knochen.ts`, M4.5); `dingLoeschen` (Ding und Zone), `szeneLoeschen`, `stoffLoeschen` (`welt.ts`, M5.2); `chipLoeschen`, `effektLoeschen`, `klangLoeschen` (Klang-Chip; `physik.ts`, M5.4); `regelLoeschen`, `aufgabeLoeschen`, `bausteinLoeschen` (`logik.ts`, M7.1) | jedes Ding: Halten → „löschen“; ⌫ löscht die Auswahl |

`weltpfadFormen` entfällt: Die Welt ist auch eine Form (`formSetzen` am Hügel). Ohne Handgriff, weil nichts gespeichert wird: Tippen
überall, Doppeltippen (geht hinein), Leiste fahren und Anfasser an der Stelle Achse (`Laufzeit.hand`), Posenkarte nach oben mischen,
„Vorlage darüber“, „wer treibt“, „Warum?“, „hier anhalten“, Merker (eine Lauf-Datei über die Ablage, kein Datensatz), Export.

**Ergänzte Handgriffe** (Abgleich mit Konzept 9.5): `falteSetzen` legt den Faltschlüssel aus `faltenVorschlag` an (Konzept 2.4).
`wechselLoeschen` löscht einen Wechsel; `teilTauschen` legt zwei Wechsel an derselben Stelle mit derselben Breite in einem Schritt an
(16 l). `wertSetzen` (Schlüsselpunkt, Konzept 9.3 und 9.5; vier Verben, 4.8): Tippen auf den Wert oder seinen Schlüsselpunkt holt seine
Achse auf die Leiste und ändert nichts. Ziehen am Wert ändert an der Stelle: an der Stelle Grundform die Zahl im Datensatz, an jeder
anderen Stelle entsteht dort der Schlüssel; Halten → „Schlüssel hier“ setzt ihn mit dem gezeigten Wert, ohne ihn zu ändern. Ist der Wert
eine Zahl, legt der Schlüssel einen Regler an (Standard = die Zahl, Besitzer wie der Datensatz) und trägt dessen Kennung ins Feld
(`Wert`); an der Stelle Achse wird daraus ein Punkt der Kennlinie eines Drahts von der Achse zu diesem Regler (treibt ihn schon ein
anderer Draht, nennt die Statuszeile ihn, und es geschieht nichts), an der Stelle Pose ein Eintrag in `Pose.werte`, und die Schicht
nimmt den Regler in ihre Maske. `taktLoeschen` löscht einen Eintrag der Taktleiste (eine Zwischenpose
samt ihrem Abschnitt; die Dauern der Nachbarn werden addiert). `gelenkRandSetzen` setzt die Breite der weichen Stufe am Gelenk und
schreibt die Gewichte der Anker im Rand als Stufe x²(3 − 2x) zwischen Knochen und Eltern; gepinnte Anker bleiben. `schriftAnlegen`
legt aus einer TTF eine Glyphentabelle an (`schriftAusKonturen`). Zugeordnet ohne neuen Handgriff: An der Raute heißt der Eintrag
„Mischart“ (`mischartSetzen` ihrer Bindung; PCHIP bleibt die Kurve über die Schlüssel, Konzept 2.2; „Kurvenart“ heißt nur die Zeitkurve
eines Abschnitts, `TaktAbschnitt.kurve`); Teil → „Spiegeln“ ist `spiegelSetzen` je Teil;
Anfasser → „lösen“ und Biegeachse ziehen sind `poseWerteSetzen`; Biegeachse → „Federkette“ ist `chipAnhaengen` (Kette). **Löschen**
(Zeile „Löschen“ oben): Jeder Typ hat seinen Handgriff `…Loeschen`. Er löst Verweise auf (was nur am gelöschten Datensatz hängt, geht
mit, etwa die Schlüssel einer Bindung; was andere noch nennen, zeigt die Vorschau, und das Löschen nimmt den Verweis heraus), ist ein
Schritt im Verlauf und folgt der Schutzregel (einen Datensatz `dein` löscht nur die Quelle `florian`).

### 4.8 Oberfläche

```ts
// apps/studio/src/kern/
export interface Signal<T> { wert: T; setze(w: T): void; hoere(h: (w: T) => void): () => void }
export type Linse = 'form' | 'knochen' | 'physik' | 'spiel';
export type WerkzeugId = 'anfasser' | 'verschieben' | 'direkt' | 'stift' | 'umwandeln' | 'lasso' | 'gewichte' | 'gelenkringe';
export interface Sitzung {
  store: Store; laufzeit: Laufzeit; zeichner: Zeichner; plan(): Bauplan; stand(): BildStand;
  stelle: Signal<Stelle>; auswahl: Signal<Auswahl>; linse: Signal<Linse>; werkzeug: Signal<WerkzeugId>;
  spielt: Signal<boolean>; geraet: 'mac' | 'ipad' | 'iphone'; stiftErkannt: Signal<boolean>;
}
// befehle/register.ts
export interface Befehl {
  id: string; titel: string; tasten: string[];            // 'v', 'shift+c', 'mod+z'; key mit code als Rückfall (QWERTZ)
  wo: ('buehne' | 'leiste' | 'textfeld' | 'immer')[]; linsen?: Linse[];
  gesten?: { ding: string; verb: 'tippen' | 'ziehen' | 'halten' | 'doppeltippen'; eintrag?: string }[];   // Zeile aus „Ding × Geste“
  handgriff?: string;                                     // Name des Handgriffs, den der Befehl ruft (handgriffe.test.ts)
  darf?(s: Sitzung): boolean; tun(s: Sitzung, arg?: unknown): void; hilfe?: string;
}
export function befehleEintragen(liste: readonly Befehl[]): void;   // befehle/alle.ts ruft es je Bereichsliste auf
// werkzeuge/werkzeug.ts
export interface Zeiger { x: number; y: number; art: 'maus' | 'stift' | 'finger'; druck: number; umschalt: boolean; wahl: boolean; befehl: boolean; zweiterFinger: boolean; schwebt: boolean }
export interface Vorschau { tropfenPulsiert: boolean; roteRinge: Id<'sl'>[]; status: string }
export interface Werkzeug { id: WerkzeugId; taste?: string; vorschau(s: Sitzung, z: Zeiger): Vorschau | null; beginnen(s: Sitzung, z: Zeiger): WerkzeugZug | null }
export interface WerkzeugZug { bewegen(z: Zeiger): void; enden(z: Zeiger): void; abbrechen(): void }
// leiste/leiste.ts
export interface LeistenMarke { an: number; art: 'vorlage' | 'gebaut' | 'dein' | 'falte' | 'wechsel' | 'aufnahme' | 'ruht'; text: string; id: string }
export interface LeistenZeile { teil?: Id<'teil'>; name: string; marken: LeistenMarke[] }
export interface LeistenQuelle {
  titel: string; bereich: [number, number]; rund: boolean; raster: number; mischart?: Mischart;
  stelle(): number; springen(w: number): void; zeilen(): LeistenZeile[];
}
```

Werkzeuge schreiben nur über `rueckrechnen`, Handgriffe und den Store; eine Geste ist eine Geste im Store. Ist auf dem iPad ein Stift
erkannt, formt nur er; der Finger bewegt die Ansicht und bedient Leiste, Posenkarten und Knöpfe.

**Vier Verben ohne Ausnahme** (Befund 24): **Tippen** wählt und geht hin; es spielt nie und ändert nie (Posenkarte: wird die Stelle,
die Figur fließt über den Übergang hinüber, Ausgleich oder gestaltet, so sieht man ihn; Brücke und Zelle: der Übergang wird die
Stelle, die Leiste zeigt ihn; Marke: springt hin). **Ziehen** ändert an der Stelle. **Halten** zeigt mehr (Menü; am Mac auch
Rechtsklick): Verdoppeln, Runden, Anker setzen, Teil tauschen stehen dort. **Doppeltippen** geht hinein: Figur → Teil → Anker;
Gelenkring → seine Gewichte (Füllringe); Leiste, Posenkarte, Zelle → groß; Chip → „Mehr“; Regel → öffnen; am Kurvenstück und am Griff
tut es nichts. Anker setzen: P (Mac, iPad mit Tastatur, Knopf P am linken Rand) oder Halten → „Anker setzen“; Runden: ⇧C oder Halten →
„rund“; Gewichte malen: W. Abspielen: Leertaste kurz (unter 250 ms, ohne Bewegung) oder ▶; Leertaste halten und ziehen verschiebt die
Ansicht wie in Illustrator und seinem Werkzeug (A15). Schweben (Mac, Stift) spielt den Filmstreifen einer Zelle der Tafel ab.

### 4.9 Ablage über den Server

Die Wege kommen aus `@ee/studio-ablage` (F5); die Haken (fremde Quellen, Schutzprüfung, Neustart der Übernahme) setzt
`apps/studio/server/plugins.ts`. Im Spiel-Server (`spielPlugins`, 5261, 5265, 5292) gelten nur Lesen (mit `quellenEinsetzen` wie im
Editor), `live` und `lauf`.

| Weg | Antwort | Regel |
|---|---|---|
| `GET /__studio/sitzung` | `{ schluessel }` oder `{}` | nur der Studio-Server mit `STUDIO_FLORIAN=1` gibt einen Sitzungsschlüssel (zufällig je Serverstart). Regeln der Editor-Seite, geprüft in e2e (der Server kennt `navigator.webdriver` nicht): Unter Automation fragt sie nie danach; nach jedem Wiederverbinden der Ereignisse holt sie ihn neu (Befund 21) |
| `PUT /__studio/sitzung/stand` mit `{ ungespeichert }` | `204` | die Editor-Seite meldet nach jeder Änderung ihres Journals, wie viele Transaktionen noch nicht gespeichert sind |
| `GET /__studio/sitzung/offen` | `{ ungespeichert }` | Summe über die offenen Seiten; die Integration startet 5217 nur bei 0 neu |
| `GET /__studio/projekt/<name>` | `{ dateien: { [pfad]: { text, revision } } }` | Revision = erste 16 Zeichen von SHA-256 des Texts auf der Platte; fremde Quellen setzt der Haken beim Ausliefern ein (`quellenEinsetzen`) |
| `PUT /__studio/projekt/<name>/<pfad>` mit `If-Match: <revision>`, `X-Studio-Sitzung`, `X-Studio-Geraet` (`mac`, `ipad`, `iphone`) | `200 { revision, sicherung }`, `409 { revision, text }`, `403 { kennungen }`, `401` | Pfad nur `projekt.json`, `figuren/[a-z0-9-]+\.json`, `szenen/[a-z0-9-]+\.json`, `laeufe/[a-z0-9-]+\.json`; nur von der eigenen Seite (Origin); atomar; die vorige Fassung kommt in den Sicherungsring (`sicherung` = ihr Pfad); Quelle `florian` nur mit `STUDIO_FLORIAN=1` und gültigem Sitzungsschlüssel; ohne Schlüssel `sitzung`; ein ungültiger (nicht leerer) Schlüssel, etwa nach einem Neustart des Servers, ergibt `401` („neu verbinden“), nie still `sitzung`; bei Quelle ≠ `florian` lehnt der Haken `schutzVerletzt` mit 403 ab; die Quelle jedes Schreibens steht im Protokoll der Ablage (6.3) |
| `GET /__studio/sicherung/<pfad>` | Text | eine Fassung aus dem Ring (Wiederherstellen) |
| `POST /__studio/projekt/<name>/vorlagen` (SVG), `…/klaenge` (m4a) | `{ hash, pfad }` | Datei nach Hash, nie überschrieben |
| `GET /__studio/ereignisse` | Server-Sent Events `geaendert { pfad, revision, quelle, geraet }`, `live { diff }`, `hinweis { text, kennungen }` | beobachtet den Inhaltsordner und die fremden Quellen; meldet fremde Änderungen; speichert Florian `schluessel.json` im Prototyp, startet der Haken die Übernahme des Kopfs als Kindprozess neu (Befund 5): 2 s nach dem letzten Speichern (der Prototyp speichert 300 ms nach jeder Änderung, werkzeug.ts:656–663), höchstens ein Lauf zugleich, ein neuer Stand bricht den laufenden ab; nach dem Umzug nie; schreibt sie nicht (Werte, Parität oder ein Datensatz „dein“), kommt ein `hinweis` für den Prüfer |
| `POST /__studio/live` | `204` | der Editor schickt Diffs an seinen Server; der reicht sie an `POST http://localhost:${SPIEL_PORT}/__studio/live` weiter, den Spiel-Port seines Paars (5217 → 5261, 5263 → 5265, 5291 → 5292, Probe-Ports `STUDIO_PORT` → `SPIEL_PORT`; ohne `SPIEL_PORT` keine Weitergabe; an 5261 nur mit `STUDIO_FLORIAN=1`); der Spiel-Server nimmt nur von localhost an; das Spiel hört per SSE an seinem Server; unter 0,5 s (Befund 27) |
| `PUT /__studio/messung/<datei>` | `204` | schreibt `docs/progress/studio/tempo/<datei>.json` |
| `PUT /__studio/lauf/<name>` | `204` | Merker vom iPhone an den Spiel-Server, nach `laeufe/` seines Inhaltsordners (bei 5261 Florians `content/studio/ozzy/laeufe/`), nur als neue Datei, nie überschrieben; sein Studio sieht sie über `geaendert` |

Der Editor speichert 300 ms nach der letzten Änderung jede geänderte Datei mit ihrer Revision. Jede Transaktion landet zuerst im Journal
des Geräts (IndexedDB über `idb`); beim nächsten Öffnen spielt der Editor nicht gespeicherte Einträge nach. **Zwei Geräte zugleich**
(F5): Antwortet der Server mit 409 oder kommt `geaendert` von außen, lädt der Editor die Datei und führt sie mit `fremdUebernehmen` je
Datensatz zusammen: je Datensatz die geänderte Seite; ändern beide denselben Datensatz, gewinnt der spätere Schreiber (der lokale Stand,
der danach speichert). Die verdrängte Fassung kommt als eigene Datei mit dem Datensatz nach `.sicherung/<projekt>/fassungen/` (nicht in
den Ring, der sie beim Formen nach Minuten verdrängte; 3.1) und wird ein Eintrag in `projekt.json` → `fassungen` (Kennung, Gerät, Zeit,
diese Datei; höchstens 50; Quelle `automatik`) und steht im Prüfer mit „Wiederherstellen“ (`fassungWiederherstellen`, ein Schritt, Quelle
`florian`). Fremde Transaktionen kommen nie in seinen Rückgängig-Verlauf.

**Skripte** (Übernahme, Inhalt) schreiben nicht über HTTP, sondern mit denselben Funktionen der Ablage direkt in Node, über den Store
mit Quelle `automatik`, datensatzweise zusammengeführt: Sie legen an oder ändern nur Datensätze mit Herkunft `gebaut` oder `vorlage`
unter ihren eigenen Kennungen. **Einen Datensatz mit Herkunft `dein`, gleich welchen Typs, lassen sie stehen, wie er ist** (sein Wert
gilt), und schreiben alles andere; ein Lauf bricht deshalb nie ab, weil Florian etwas Gebautes nachgestellt hat (F1, F5). Wäre danach
ein eigener Datensatz ungültig, weil ein Datensatz `dein` nicht zu ihm passt (etwa eine neue Pose, deren Regler seine Schicht nicht hat,
oder ein neuer Schlüssel, den seine Liste nicht führt), bleibt genau dieser eigene Datensatz im vorigen Stand (ein neuer entfällt); die
Prüfung (3.6) läuft danach erneut, bis sie hält (höchstens so oft, wie es eigene Datensätze gibt). Jede stehen gelassene und jede
ausgelassene Kennung steht in der Meldung des Laufs, als Prüfer-Hinweis im Editor und als Zeile in Teil C der Liste. An `Projekt` ändern sie nur `quellen`
und neue Einträge in `figuren` und `szenen` (feldweise, 3.2). Einzige Ausnahme ist `probeprojektAnlegen`: Es kopiert die Dateien von
`content/studio/ozzy/` samt Herkunft (seine Schlüssel bleiben `dein`, fremde Quellen eingesetzt) über die Ablage in ein neues
Probe-Projekt, ohne Store-Schritt, nie nach `ozzy/` und nie in einen bestehenden Ordner; eine spätere Erweiterung des Probe-Projekts
(M4.Z) legt über den Store nur Neues dazu. Bei 409 laden sie neu und versuchen es noch einmal. Nach `content/studio` schreiben sie nur in
den Läufen der Integration (`STUDIO_INHALT=content/studio`, 2.4); sonst auf einer Kopie.

**App** (M11.2, Befund 27): Live und Merker gehen an `http://<Mac>.local:5261`; der Spiel-Server erlaubt per CORS genau
`capacitor://localhost` (Option des Plugins, Standard leer); die App trägt `NSAllowsLocalNetworking` in `Info.plist`. Ehrlich:
Sitzungsschlüssel und Origin schützen gegen Versehen, nicht gegen Absicht; gegen alles andere hilft der Sicherungsring.

### 4.10 Ton, Autorig, Prüfhaken

```ts
// studio-ton
export interface TonAuftrag { klang: Id<'kl'>; zeit: number; laut: number; ton: number; pan: number }
export interface TonPlaner { ereignisse(e: readonly Ereignis[], takt: number): void; draht(id: Id<'dr'>, wert: number): void; abholen(aus: TonAuftrag[]): number }
export interface TonAusgabe { freigeben(): Promise<boolean>; spielen(a: TonAuftrag): void; laeuft(): boolean; stumm(an: boolean): void }
// studio-autorig
export interface AutorigEingabe { dok: Dokument; figur: Id<'fig'>; vorlage: 'vierbeiner' | 'allgemein'; gepinnt: readonly string[] }
export interface Zweifel { frage: string; moeglichkeiten: { titel: string; tun: (e: Entwurf) => void }[] }
export interface AutorigErgebnis { tun: (e: Entwurf) => void; unsicher: Zweifel[] }   // ohne Zeit (30 b)
export function autorig(e: AutorigEingabe): AutorigErgebnis;   // deterministisch, Ziel unter 50 ms; die Zeit misst
                                                               // apps/studio/src/autorig/autorig.worker.ts außerhalb des Pakets
export function gelenkePruefen(dok: Dokument, figur: Id<'fig'>): { knochen: Id<'kn'>; text: string }[];   // für den Prüfer, nie von selbst
// apps/studio/src/pruefhaken.ts: window.__studio (Proben ohne Klicks auf Bildpunkte)
// stelle(s), zug(z), zurueck(), wieder(), speichern(), dokumentText(pfad), takte(n), pruefsumme(), bildPng(ausschnitt),
// zeiten(), befehl(id, arg), leiste(), marken(), ereignisse(), vorschau() (Statuszeile, rote Ringe, Tropfen: für die Ort-Probe)
// apps/studio/pruefen.html: window.__studioPruefen: rechnenHash(n), kopfdrehung(von, bis, schritt), laufAbspielen(laufText), bild(theta, breite, hoehe)
```

---

## 5 Etappen

### 5.1 Ablauf jeder Etappe

Gebaut wird nach F1 bis F3: in diesem Arbeitsbaum, die Pakete einer Welle parallel, ohne auf ein Urteil zu warten. Jede Etappe und
jedes Paket nennt in einer Zeile „braucht“, was vorher gebaut sein muss; sie ist gegen die Wellen und Etappen davor geprüft.

1. **Vertrag (Mx.0), Integration, seriell.** Ergänzt Typen und Signaturen (`studio-format/src/typen/`, `schema/`, `arten/`,
   `studio-laufzeit/src/vertrag/`), installiert alle Abhängigkeiten der Etappe (`package.json`, Lockdatei, `pnpm install`), legt die
   gemeinsamen Dateien fertig und neue Zusammenbau-Dateien leer an (2.2). Typen grün; Commit „Mx Vertrag“.
2. **Wellen, parallel (F2).** Ein Workflow startet je Paket einen Agenten (stärkstes Modell, höchster Aufwand, höchstens etwa zehn je
   Workflow) und teilt ihm seine Probe-Ports zu (2.4). Ein Paket ändert nur die Dateien seiner Zeile, ruft nie `pnpm install`, ändert
   keine `package.json` und keine Lockdatei und committet nicht. Es prüft nur seine eigenen Dateien (Befehle in 7.4; Ausgaben nach
   `test-results/<paket>/`). **Oberfläche und Bild:** e2e-Tests eines Oberflächenpakets schreibt das Paket; grün werden müssen sie im
   Zusammenbau seiner Welle, weil erst dort `main.ts`, `befehle/alle.ts` und `pruefhaken.ts` alles einhängen (wie die Sprungtests in
   M4.Z). Im Paket gelten seine Einheitstests; braucht es eine Seite, legt es eine eigene Prüfseite in seinen Dateien an
   (`apps/studio/e2e/seiten/<paket>.html`; der Entwicklungsserver liefert sie ohne Eintrag in `vite.config.ts`). Bildtests (WebGL2)
   laufen als Playwright-Specs des Bildpakets (`apps/studio/e2e/bild/<paket>-*.spec.ts`) auf so einer Prüfseite, in Chromium und WebKit;
   vitest in Node prüft nur, was ohne WebGL geht (Shaderquellen, Tabellen). Braucht es eine Änderung außerhalb seiner Dateien, eine
   Abhängigkeit oder eine
   Vertragsänderung, steht sie in seinem Abschlussbericht an den Workflow; es baut mit dem Vertrag, wie er ist, so weit es geht, und die
   Integration entscheidet. Fertig ist ein Paket, wenn seine Prüfungen grün sind und der Abschlussbericht vorliegt (Dateien, Tests,
   offene Wünsche). Pakete einer Welle hängen nicht voneinander ab; was zwei Pakete derselben Welle braucht, testet die Integration
   nach der Welle.
3. **Nach jeder Welle (Integration).** Prüft am Diff, dass jedes Paket nur seine Dateien geändert hat; entscheidet die Wünsche aus den
   Abschlussberichten; verdrahtet die Zusammenbau-Dateien (2.2), damit die nächste Welle sie benutzen kann; lässt `pnpm studio:pruefen`,
   die e2e und die Tests laufen, die zwei Pakete der Welle brauchen; committet nur eigene Dateien (vorher `git status` und `git log`,
   kein bare `git stash`); schreibt eine Zeile nach `docs/progress/studio/aufwand.json` (Etappe, Welle, Pakete, Agenten, Dauer; F7). Jede
   Welle hinterlässt einen grünen, committeten Stand; an jeder Wellengrenze kann der Bau anhalten und später weiterlaufen.
4. **Abschluss (Mx.Z), Integration.** Lässt Übernahme und Inhalt-Skripte laufen (vorher Commit „Florians Stand in Studio“, falls sich
   `content/studio/` geändert hat, danach „Studio-Inhalt M<n>“); führt die Proben (a) aus; bereitet die Proben (b) vor und trägt sie in
   Teil B der Liste ein, Auffälliges in Teil C; liefert den Stand (`pnpm studio:stand` in einen neuen Stand-Ordner; 5261 und 5217
   starten neu und wechseln dorthin, 5217 nur, wenn sein Journal nichts Ungespeichertes hält; 2.4); schreibt
   `docs/look/studio/UEBERGABE.md` neu, ersetzt die Studio-Zeile im Stand von `CLAUDE.md`, committet
   „Florians Stand in Studio“ (falls geändert) getrennt vom Code, pusht den Zweig und schickt die kurze Meldung (10).
5. **Proben.** Vorher festgelegt (hier), je in zwei Teilen. **(a) Automatisch:** Die Integration prüft selbst mit festem Kriterium
   (Typen, Tests, Eigenschaftstests, Playwright in Chromium und WebKit, Bilder und Aufnahmen nach
   `docs/progress/studio/m<n>-<thema>.<png|mp4>`); Messungen am Mac sind Hinweise, keine iPhone-Messungen, das steht jeweils dabei.
   **(b) Gesammelt** für Florians Auge, Nicole, das iPhone 16 oder das iPad: vollständig vorbereitet (Seite, Ablauf, Kriterium, Ablage
   der Aufnahme unter `docs/progress/studio/proben/m<n>-<name>.<mp4|png|json>`) und als Eintrag B<n> in die Liste. Kein Tor wartet auf
   Florian. Vergleichsbilder, die einen Weg entscheiden, werden gemacht und abgelegt; der Bau nimmt die vorläufige Entscheidung aus
   Teil A. Fällt eine Wette, wählt der Bau den Rückfall nach 9.2 selbst und trägt ihn in die Liste ein. „Bestanden“ sagt nur Florian.

### 5.2 Übersicht

| Etappe | braucht | Proben aus Gesamtbericht 4.7 | Inhalt | Tage (grob) |
|---|---|---|---|---|
| M0 Verträge | nichts | – | Pakete samt `@ee/studio-ablage`, Typen, Schemas, gemeinsame Dateien, Grenzen, Gerüst | 4–5 |
| M1 Kern, Kopf, Vergleichsbild | M0 | S3 (Vergleichsbild), S4 (gleiche Bytes) | eigene Winkelfunktionen, Format, Form-Laufzeit mit Rahmen + Rest, Renderer, Store-Kern, Ablage, starre Knochen und Drähte, Kopfdrehung als Daten | 12–18 |
| M2 Messen, P1, Tapsen | M0; Welle B: M1 Welle A | S1, S2 | Welt, XPBD-Grundlage, P1 mit „Tapsen“ (erster spielbarer Stand), Messseite mit Ersatzszenen | 8–11, neben M1 |
| M3 Werkbank | M1 | S4 | Editor-Kern, Speichern und zwei Geräte, Bühne, Werkzeuge, Leiste, Stelle, Ort-Probe | 9–13 |
| M4 Posen, Übergänge, Knochen | M1, M3 | S5, S7 (Werkbank-Probe), S8 (Biegeachse) | Ausgleich, Posen, Taktleiste, Tafel, Biegeachsen mit Gewichten, Haltungen und Abläufe als Daten | 15–21 |
| M5 Physik am Mac | M1, M2, M4 | S6 (erster Teil), L0 | Takt, Welt, Vierbeiner mit Kopplung und Kehrtwende, Chips, Prüfstand, Spielwiese | 15–22 |
| M6 Spielwiese auf dem iPhone | M1, M3, M4, M5 | S6, S8 (Korrekturform) | Renderer Stufe 1, Spiel-App, Live-Verbindung, Korrekturformen, Strecke | 11–16 |
| M7 Morgenrunde | M1, M4, M5, M6 | S7 (Bedienprobe), S9 (L1, L2, D1) | Logik, Bausteine der Welt, Ton, Text als Figur, Linse Spiel, Inhalt | 22–32 |
| M8 Pannen | M2, M5, M7 | S9 (D2) | Sturz, Aufstehen, Regie, Rückblick als Baustein, Aufnahme | 10–15 |
| M9 Mittagsrunde | M4, M7, M8 | S8, S9 (L3) | Autorig, Drehzentren, W, Katze, Dinge des Mittags, „Warum?“, Prüfer | 22–35 |
| M10 Abendrunde | M5, M6, M7; Welle B: M9.5 | S9 (L4, D3), S10 (Teil) | Wasser, Teilchen, Himmel, Aufgaben mit Beweisen, Tagebuch, Effekte für Momente | 16–26 |
| M11 Ton, App, großer Feinschliff | M0 bis M10 | S10 | Musik, App-Hülle, Haptik, Export; großer Feinschlifflauf über die ganze Liste; Abnahme | 12–20, dazu der Feinschliff |

Summe weiter rund 155 bis 240 Arbeitstage (eigene Schätzung), in Kalenderzeit kürzer durch parallele Wellen, nicht im Verbrauch (F7).
Die Integration schreibt je Welle eine Zeile nach `docs/progress/studio/aufwand.json`; nach M3 schätzt sie den Rest mit gemessener
Bauzeit neu und nennt das Ergebnis in der Meldung (Befund 23). **Reihenfolge** (Entscheidungsblatt, Abschnitt 4): Store-Kern und
Ablage, starre Knochen mit Verschiebung, Drähte sowie Rahmen + Rest mit dem Vergleichsbild kommen in M1 (Befund 1, 19, F5); Biegeachsen,
Anheftung, Ozzys Haltungen als Daten und die Anfasser in M4, weil seine Haltungen Knochen sind; Korrekturformen und Geltungs-Chip in
M6. M1 und M2 teilen
sich ihre Wellen; M9 und M10 hängen nicht voneinander ab, ihre ersten Wellen laufen zusammen. Eine Zählung für alle: M0 bis M11.

### 5.3 M0 Verträge

**Ziel.** Alle Pakete, Apps und Werkzeuge bestehen, sind typgeprüft und halten ihre Grenzen; alle Verträge aus Abschnitt 3 und 4 stehen
als Typen, samt den Vertragsänderungen des Entscheidungsblatts (dort Abschnitt 3). Ein Paket der Integration (M0.1), seriell.
**Braucht:** nichts.

- **M0.1 legt an:** jede `package.json`, `tsconfig.json`, `vitest.config.ts` aus 2.1, auch für `@ee/studio-ablage`;
  `studio-format/src/typen/*` (jeder Datensatztyp mit `herkunft`, dazu `Koerpermodell`), `schema/*`, `arten/register.ts` (`ArtSchema`
  mit `aufGezeichnet`), `arten/effekte.ts` mit den Schemas der fünf Effekte von M1 (`verschmelzen`, `dicke`, `kanten`, `verdecken`,
  `weissNachgeben`, je mit `aufGezeichnet`; die Übernahme schreibt Effekte, und `laden` öffnet unbekannte Arten nur zum Lesen), fertig
  `kennung.ts` (`kennungAusZahlen`, `kennungAusPfad`), `versionen.ts` und `anker.ts` (Glätte-Regel mit 0,0002, abschaltbar; `ankerZeile`,
  `ankerPunkte`; Regel für glatte und Ecken-Zeilen, 3.2); `studio-laufzeit/src/vertrag/*` samt `weltAttrappe.ts` (jede Funktion von
  `WeltAdapter`, einfach und ohne Reibung: fallende Körper, Scharnier mit Motor und Grenzen, Ziel-Gelenk, Finger, Federbein mit
  Vorspannung, Kräftepaar, Strahl gegen Kreise und Kapseln, Zonen, `merken` und `zuruecksetzen`; so läuft die gemeinsame Testreihe von
  M2.1 gegen beide), fertig `bauplan/{ordnung,regler}.ts`, leer die Zusammenbau-Dateien `fassade.ts`, `bauplan/bauen.ts`,
  `bausteine/register.ts`, `physik/chips.ts`, `posen/zusatzarten.ts`; `studio-store/src/typen.ts`; `studio-rechnen/src/*` vollständig
  (PCHIP bitgleich zum Prototyp, `kurvenAbstand`, `sha256` als eigene Umsetzung, `zahlText`), dabei `winkel.ts` und `exp.ts` vorläufig
  über `Math` (in `eslint.config.js` für genau diese zwei Dateien ausgenommen, bis die Integration sie nach M1 Welle A umstellt);
  `studio-bild/src/effekte/register.ts` leer; `apps/studio`: die vier HTML-Seiten (jede mit ihrem Einstieg; die noch fehlenden legt M0
  leer an, damit `studio:stand` schon in M0 baut: `src/pruefseite.ts` füllt M1.9, `src/p1/p1.ts` M2.3, `src/messen/messen.ts` M2.4),
  `vite.config.ts` (Ports nach 2.4, Eingänge, Plugins
  aus `server/plugins.ts`), `playwright.config.ts` (Server auf `STUDIO_PORT`, Standard 5291, mit Kopie des Inhalts und Schreibhaken,
  Projekte Chromium und WebKit, Specs auch in Unterordnern von `e2e/`), `vitest.config.ts` (nur `src/` und `test/`, 2.1),
  `server/plugins.ts` (`studioPlugins` und `spielPlugins`, leer zusammengesetzt) und `server/messung.ts` (feste Signatur, noch ohne Weg),
  `src/main.ts` (Papier, Titel „Studio“ in Lobster, leere Bühne), leer
  `src/befehle/alle.ts` und `src/pruefhaken.ts`, `src/look/*`, `test/grenzen.test.ts`; `apps/ozzy-spiel` mit `index.html`,
  `vite.config.ts` (5261, 5265; `spielPlugins`), `vitest.config.ts` (wie oben), `src/main.ts`, `test/keinSpielcode.test.ts`; beide
  `tools/*` mit `package.json` samt den Skripten aus 2.4 und `tsconfig.json`, dazu `tools/studio-uebernahme/vergleich.vite.config.ts`
  (6.3); in `studio-format/pruefdaten/` die Prüfdatei seiner Schlüssel, `ozzy-rollen.json` (alle Namen aus `TeilName` mit Rolle und
  Seite, auch die gebauten Sohlen, dazu je SVG die Teile in Dateireihenfolge nach `ANSICHTEN`; Teilnamen sind hier erlaubt; die
  Übernahme nimmt Rolle und Seite daraus und prüft die Datei in M1.8; Rollen-Wörter: `rumpf` (Bohne), `maske` (kopfA, kopfB), `ohr`,
  `ohrspalt`, `bart`, `nase`, `schwanz`, `schwanz.weiss`, `bein.vorn`, `bein.hinten`, `fenster.vorn`, `fenster.hinten`, `keil.vorn`,
  `keil.hinten`, `sohle.vorn`, `sohle.hinten`; Seite `rechts` für A und R, `links` für B und L, sonst `mitte`) und `testfigur.json`
  (drei Teile: zwei Flächen mit je fünf Ankern, die Spiegelpartner sind, und eine offene Linie mit vier Ankern; ein Kreisregler 0° bis
  360° mit einer Spiegelregel ab 180° um 360° für dieses Paar, die einen Linienregler mitspiegelt; je Fläche eine Ansichtsbindung an
  diesem Regler, die erste mit vier Schlüsseln, davon einer `dein`, einer `vorlage`, einer `gebaut` und eine Stütze, die zweite mit zwei;
  eine Zusatzform mit zwei Schlüsseln; ein starrer Knochen mit Verschiebung; ein Draht mit Kennlinie; ein Wechsel; von Hand in der
  Schreibweise aus 3.5, M1.2 schreibt sie mit seinem Schreiber neu, bis dahin lesen andere Pakete sie nur als Daten);
  `apps/studio/scripts/proben/schutz.mjs` (Schreibhaken, 6.3); Wurzel: Skripte in `package.json` (2.4), Block in `eslint.config.js`
  (2.3), `scripts/studio-pruefen.mjs`, `scripts/studio-stand.mjs`, Einträge `studio` (5217), `studio-bau` (5263), `gassirunde` (5261) in
  `.claude/launch.json` (je `pnpm -C <Arbeitsbaum> <Wurzel-Skript>`), in `pnpm-workspace.yaml` unter `allowBuilds` `geckodriver: false`
  und `edgedriver: false` (Abhängigkeiten von `webdriverio`, deren Installationsskripte Treiber laden; gebraucht wird nur
  `safaridriver` des Macs); `docs/look/studio/UEBERGABE.md`; `docs/progress/studio/aufwand.json`. Die fünf Effektarten von M1 haben in
  M0 leere Daten (`daten: {}`) und `aufGezeichnet: 'zeichnung'`. Kein eigener Arbeitsbaum, kein Zweig (2.5); `tsconfig.base.json` bleibt
  unverändert.
- **Abhängigkeiten (genau so):** `zod` ^4.6.5 (wie im Repo), `fractional-indexing` 4.0.0, `box2d3-wasm` 6.0.0, `idb` 8.0.4, `earcut`
  3.2.4, `react` und `react-dom` ^19.3.0 mit `@types/react` und `@types/react-dom` ^19.2.0 (wie `apps/editor`), `@vitejs/plugin-react`
  ^6.1.1, `vite` ^8.3.1, `vitest` ^5.0.2, `typescript` ~5.9.0, `fast-check` 4.10.2 (Tests; 4.10.3 ist vom 18.11.2026 und zu jung),
  `@playwright/test` ^1.63.0, `tsx` ^4.23.15 (Werkzeuge), `webdriverio` 10.2.0 (vom 06.11.2026; nur für die Proben-Skripte von
  `apps/studio`: Messseite und Determinismus im echten Safari am Mac, 30 e). Jede ist älter als zwei Wochen. **Ehrlich:** `webdriverio`
  nennt Node 22, 24 oder ab 26.12.1, am Mac läuft Node 25.8.1. M0.1 prüft einmal, ob es trotzdem startet; sonst bleibt es bei WebKit von
  Playwright (Hinweis bei B6, Eintrag in Teil C). Die Lizenzprüfung (7.1) läuft nur über die Studio-Pakete; ein ODER-Ausdruck gilt, wenn
  eine Wahl erlaubt ist (`jszip`: MIT OR GPL-3.0-or-later), und `css-value` (ohne Lizenzfeld) steht mit Grund als Ausnahme in der
  Erlaubnisliste von `scripts/studio-pruefen.mjs` (nur Prüfwerkzeug am Mac, nie im Spiel).
- **Tests:** `grenzen.test.ts`, `schema.test.ts` (Typen und Schemas decken sich in beide Richtungen), `kennung.test.ts` (ohne
  Modulo-Schieflage, stabil aus Pfaden), `anker.test.ts` (Glätte-Regel an Kurvenpunkten), `pchip.test.ts` (bitgleich gegen eine
  wörtliche Kopie von `pchip` im Test), `sha256.test.ts` (Testvektoren), `weltAttrappe.test.ts`, `keinSpielcode.test.ts`.
- **Probe (a) automatisch:** Bild `m0-leer.png` der Seite auf 5263; `pnpm studio:pruefen` grün; ein `Math.sin` in `studio-laufzeit` und
  ein Import von `@ee/studio-store` in `apps/ozzy-spiel` werden rot gemeldet (danach zurückgenommen; in der Übergabe gezeigt); der
  Schreibhaken verweigert einen Schreibversuch unter `apps/editor/` und meldet ihn (geschrieben wird nichts).
  **(b)** nichts für Florian.
- **Abbruch:** nach dem Anderthalbfachen der Schätzung (rund acht Arbeitstage) nicht grün → anhalten und berichten (kein Rückfall im
  Plan).
- **Stand 20.11.:** M0 ist gebaut, geprüft und nachgearbeitet. Was die Bau-Agenten dabei ergänzt und ausgelegt haben und was die
  Integration danach entschieden hat, steht jetzt in 2.1 bis 4.6, 6.3 und 7 (Liste im Nachtrag am Ende). Über die Liste oben hinaus legte
  M0 an: `apps/studio/e2e/seiten.spec.ts`, `apps/ozzy-spiel/playwright.config.ts` und `e2e/seite.spec.ts`,
  `apps/studio/scripts/proben/m0-vertrag.mjs` (Probe a), `scripts/studio-typen.mjs`, je Paket ohne Node `tsconfig.quellen.json`,
  `studio-laufzeit/src/vertrag/{bilddaten,feldbreiten,welt}.test.ts`, `studio-bild/src/zeichner.ts` (Typen) und
  `effekte/register.test.ts`. `testfigur.json` hat über die Beschreibung oben hinaus eine Verbindung `fuge` zwischen den beiden Flächen
  (M1.4 prüft die Fuge daran) und acht Regler (der Kreisregler, der mitgespiegelte Linienregler, die Lage der Figur x, y, Drehung, Nicken
  und Kopfversatz x, y mit Einheit `'figur'`); ihr Vorlage-Schlüssel trägt kein Feld `vorlage`, damit die Datei ohne Projekt lädt; der
  Kopf nennt keine Art. `pruefdaten.test.ts` hält diesen Steckbrief fest. `webdriverio` 10.2.0 lädt unter Node 25.8.1 und läuft bis
  zur Verbindung mit dem Treiber; eine Sitzung im echten Safari braucht `safaridriver --enable` (Florian, B6), bis dahin misst Studio
  in WebKit von Playwright; ein Eintrag in Teil C ist nicht nötig. Weitere Lizenz-Ausnahmen stehen in 7.1.

### 5.4 M1 Kern, Kopf, Vergleichsbild

**Ziel.** Seine Kopfdrehung läuft in Studio als Daten, mit Kopfversatz und Halslage, mit derselben Gestalt wie im Prototyp,
deterministisch und bytegleich gespeichert; Store-Kern und Ablage stehen; das Vergleichsbild „Rahmen + Rest“ liegt vor (S3 vor S4).
**Braucht:** M0. Welle A und Welle B laufen je in einem Workflow mit der gleichnamigen Welle von M2 (F2; Welle A: neun Agenten).

- **M1.0 Vertrag:** entfällt, M0 hat alle Verträge dieser Etappe festgelegt, und der Plantext gibt sie seit dem 20.11. wieder (Nachtrag
  am Ende). Wünscht ein Paket eine Änderung, macht die Integration sie nach der Welle als kleinen Schritt mit neuer Vertragsversion. Was
  M0 schon angelegt hat, ergänzt ein Paket, statt es neu anzulegen (2.2); jedes Paket importiert die Verträge aus ihren Dateien und legt
  keinen Typ daraus ein zweites Mal an.
- **Welle A** (je braucht M0):
  - **M1.1 Rechnen.** Legt an `studio-rechnen/src/fdlibm/*.ts` (Port der fdlibm: `e_rem_pio2`, `k_sin`, `k_cos`, `s_atan`, `e_atan2`,
    `e_asin`, `e_acos`, `e_exp`, `e_log`, `e_pow`, `e_hypot`; Hinweis der fdlibm im Kopf), `src/selbsttest.ts` (`rechnenSelbsttest(n)`:
    Prüfsumme über feste Eingaben), `pruefdaten/winkel-eingaben.json`, `LIZENZEN.md`. `winkel.ts` und `exp.ts`, die alle Pakete der Welle
    importieren, bleiben während der Welle unverändert; die Integration stellt sie danach auf den Port um und entfernt die Ausnahme in
    `eslint.config.js`.
    Tests: je Funktion 10 000 Eingaben, höchstens 1 ulp neben `Math` (im Test erlaubt), Sonderwerte (±0, ±∞, NaN, Vielfache von π/2).
  - **M1.2 Format.** Legt an `pruefen.ts`, `schreiben.ts` (lässt Schlüssel aus fremden Quellen weg), `laden.ts` (`formatErkennen`),
    `dateien.ts`, `quellen.ts`, `migrationen/{register,kern-0-1}.ts`, `svg/{lesen,paaren,importieren}.ts`; keine Spielfassung (Befund 2).
    Ergänzt `src/pruefdaten.test.ts` (aus M0) um den Rundweg `schreiben(laden(t)) === t`; seine übrigen Prüfungen bleiben grün.
    Nimmt aus M0, statt es neu anzulegen: `Migration` und `ArtBlock` aus `versionen.ts` (`migrationen/register.ts` reicht sie mit
    `export type { Migration, ArtBlock } from '../versionen'` nur weiter und hält `MIGRATIONEN`), `Fehler`, `LadeErgebnis` und
    `ImportErgebnis` aus `typen/dokument.ts`, die Schemas der Dokument-Ebene und die feste Reihenfolge aus `schema/reihenfolge.ts`
    (der Schreiber stellt mit `dateiOrdnen` um und setzt nur Einzug und Zahlen mit `zahlText`), Ankerzeilen aus `anker.ts`, die Arten
    aus `arten/register.ts`, `versionenAbgleichen` und `nurLesenNach` aus `versionen.ts`. Arten heißen `<familie>:<art>` (3.4); der
    Schreiber nennt in `versionen.arten` nur die Arten, die die Datei nutzt; `Aufhaengung.griffe` schreibt er mit der Marke `'erben'`,
    nie `null` (3.5 Nr. 4).
    Schreibt `testfigur.json` mit seinem Schreiber neu (gleiche Daten; die Datei gehört ab hier M1.2). Tests: Rundweg byteweise
    (Testfigur und zufällige Figuren mit fast-check; Zahlen ungerundet, 3.5 Nr. 3), der Rundweg macht keinen Griff unter 1e-6 Länge zu
    einem darüber und umgekehrt, neuere Version nur lesen, Migration `kern 0 → 1` an der Prüfdatei (Kurvenpunkte unter 1e-9, jeder Anker
    eine Ecke mit genau seinen Winkeln, Griffe der Länge 0 mit der Gegenrichtung nach 3.4), eine unbekannte Art (Schlüssel
    `<familie>:<art>`) öffnet nur zum Lesen, Prüfung je Migration (Kurvenpunkte der Datensätze „dein“ höchstens 1e-6 auseinander, sonst nur
    lesen), Erkennung „kern 0“ trotz `"version": 1`, `quellenEinsetzen` an der Prüfdatei (eingesetzt mit Herkunft „dein“, beim
    Schreiben weggelassen, Rundweg bytegleich), alle neun SVGs aus `docs/look/ozzy-figur/vorlagen/` mit denselben Ankern wie `svg.ts`,
    Querregeln aus 3.6 (samt Nr. 11), eine Datei mit Effekten der Arten aus `arten/effekte.ts` lädt nicht nur zum Lesen.
  - **M1.3 Form-Laufzeit.** Legt an `bauplan/{form,abflachen,zeichen}.ts`,
    `form/{anker,koordinaten,rahmenRest,linear,ruhen,listen,ansicht,spiegel,spitzen,wechsel,abflachen}.ts`, `regler/hand.ts`. Aus der Werkbank
    vorgezogen (Befund 19): `rahmenRest`, `linear`, die Weiche nach Mischart und die periodische Mischung: Kreisregler rechnen mit
    `pchipSteigungen(…, periode)` und `pchipWert(…, periode)` (4.1), ohne angehängte Schlüssel. Den Ankerpuffer nimmt jeder Teilplan aus
    `ankerBereiche` (`bauplan/ordnung.ts`, 4.3): `TeilPlan.erster`, `anzahl`, `geschlossen` und `AbflachPlan.teile` (samt `feldsatz` und
    `kanal` aus dem Zeichenmodell). `bauplan/zeichen.ts` teilt die Feldsätze nach der Regel in 4.6 auf (`KANAELE` = 24 je Feldsatz,
    `feldsaetze[].einheit`, `gebacken[].ding`). Schritt 16 schreibt nach 4.6 in BildDaten: `form/abflachen.ts` hängt je Auswertung
    Strecken, Teile und Rahmen an (die Zähler `streckenZahl`, `teilZahl`, `feldsatzZahl` wachsen), `form/wechsel.ts` (`malreihenfolge`,
    4.4) schreibt `ordnung` und `deckung` dieser Teile. `regler/hand.ts` nach der Signatur in 4.4 (`handSetzen` klemmt Linienregler und
    faltet Kreisregler in [bereich[0], bereich[1]), keine endliche Zahl ist ein RangeError; `handLoesen` setzt NaN). Die
    mitgespiegelten Regler stehen im ReglerPlan (`mitSpiegel`, `mitUm`), nicht im SpiegelPlan; Teilpläne beziehen ihre Indizes auf
    `OrdnungPlan.index`. Tests:
    `koordinaten` gleicht einer Kopie von `formAusSchluesseln` im Test auf 1e-9 (fast-check) und ist an Schlüsseln exakt; `rahmenRest`
    exakt an Schlüsseln (1e-9), glatt bleibt glatt, eine um 120° gedrehte Form behält in der Mitte mindestens 99 % ihrer Fläche, stetige
    Steigung an der Naht 0°/360°, jede gemischte Größe monoton zwischen ihren Nachbarn; `spitzen` gegen eine Kopie von `spitzenFuehren`
    und nach der Spitzenregel (4.4), auch gespiegelt; Spiegelregel samt `Spiegelregel.regler`; Abschnitte mit gespiegelten Einträgen (die
    Spiegelregel wirkt dort nur auf die Malreihenfolge); Ruhen nach 4.4 (eine Stütze bei 150° neben einem Schlüssel „dein“ bei 148° ruht
    nicht, ein Faltschlüssel neben „dein“ ruht nicht, ein Vorlage-Schlüssel an der Stelle eines „dein“ ruht, ein gebauter an einer festen
    Stelle ruht nicht, ruhende zählen für die Spitzenregel nicht); ein Listeneintrag auf einen fehlenden Schlüssel einer fremden
    Quelle wird ausgelassen und gemeldet, das Projekt bleibt bearbeitbar (4.4); je Teilplan inkrementell =
    voll; Stückzahl nach 16 k (Zoomstufen, höchstens 64, nie je Bild); 30 Flächen einer Figur ergeben zwei Feldsätze (24 und 6, Kanäle
    nach der Folge der Teile); zwei Auswertungen hängen zwei Sätze von Feldsatz-Instanzen an, die Malreihenfolge ordnet nur die
    Einträge ihrer Instanz; `handSetzen` klemmt und faltet; kein Speicherzuwachs der eigenen Funktionen über 10 000 Bilder.
  - **M1.4 Bild Grundstufe.** Ergänzt `zeichner.ts` (die Typen aus M0 bleiben, wie sie sind; dazu `zeichnerAnlegen` vom Typ
    `ZeichnerAnlegen`); legt an `kontext.ts`, `uebersetzen.ts` (`shaderUebersetzen` vom Typ `ShaderUebersetzen`; legt die
    Einhängestellen der drei Shader und ihre Namen fest), `felder.ts`, `rahmen.ts`, `feldsaetze.ts` (je Feldsatz-Instanz eines Bilds die
    Texturen; die Aufteilung nimmt es aus `ZeichenModell.feldsaetze`, wie `bauplan/zeichen.ts` sie rechnet, und teilt nie selbst auf),
    `gebacken.ts`, `kreise.ts`, `shader/{strecken,felder,bild}.ts`, `effekte/{verschmelzen,dicke,kanten,verdecken,weissNachgeben}.ts`
    (je eine `EffektZeichnung` nach 4.6; eingetragen von der Integration in `EFFEKT_ZEICHNUNGEN`; ihre Schemas gibt es seit M0). Es liest
    BildDaten nur und führt deren Feldbreiten und `KANAELE` als `typeof`-Kopie (4.5). Aus `renderer.ts`: Vorzeichen per Schablone,
    Außenkanten auf der Grafikkarte, weiche Vereinigung (auch nach Kantenrichtung), Weiß in Malreihenfolge, Klemme, „hinter“, Verdecken,
    Dickenregel (Durchbruch), Weiß nachgeben (4.6), weiche Deckung, Fuge (geprüft an `testfigur.json`; Ozzys Ohrspalt ist ein eigenes
    weißes Teil, 6.2 Nr. 7), Reichweite je Teil (Feld 5 der Strecke, Maße über `feldsaetze[].einheit` in die Welt). Neu: Rahmen je
    Figur, Feldsätze nach dem Zeichenmodell (je angefangene 24 gezeichnete Teile einer, 4.6), Uniforms aus Reglern, gebackene Felder für
    Dinge ohne Formänderung und analytische Kreise (aus M6.1 vorgezogen, weil die Ersatzszenen von M2 sie messen), Neuaufbau nach
    Kontextverlust, alle Shader beim Laden. Tests: Shaderquellen je Modell deterministisch, Beiträge der Effektarten an ihren
    Einhängestellen; Uniform-Tabelle vollständig (Node); mehrere Feldsatz-Instanzen in einem Bild (Zwiebelhaut) zeichnen jede mit
    eigenen Texturen; ein gebackenes Ding zeichnet bildgleich zum ungebackenen (Playwright auf der eigenen Prüfseite, 5.1 Nr. 2). Der
    Test „30 Flächen ergeben zwei Feldsätze“ gehört M1.3.
  - **M1.5 Store-Kern.** Legt an `studio-store/src/{store,diff,verlauf,schutz,zusammenfuehren}.ts` (aus der Werkbank vorgezogen, F5)
    und erfüllt damit `studio-store/src/typen.ts` aus M0 (4.1): `class Store implements StoreVertrag` mit dem Konstruktor nach
    `StoreKonstruktor` (store.ts), `diffVon` vom Typ `DiffVon` (diff.ts), `schutzVerletzt` vom Typ `SchutzVerletzt` (schutz.ts); die
    Typen dort ändert es nicht, `Fehler` kommt aus `@ee/studio-format/typen/dokument`. Neue Kennungen: je Kennung
    `new Uint32Array(KENNUNG_ZAHLEN)` aus dem übergebenen Zufall an `kennungAusZahlen`, Kollisionen prüft der Store. Den Strom mit Saat
    nehmen die Tests aus `@ee/studio-rechnen/zufall` (devDependency), `testfigur.json` eignet sich als Anfangsdokument (ein Schlüssel
    „dein“, Datensätze „vorlage“ und „gebaut“, Teile mit `wieGezeichnet`). Tests:
    100 Züge, ein ⌘Z; Geste = ein Schritt; Tastenschub 500 ms; Auswahl reist mit; tun und zurück ergibt dieselben Datensätze
    (fast-check); Zufall und Prüfung übergeben (Strom mit Saat, Prüfung als Attrappe); Schutzregel für alle Quellen samt
    `wieGezeichnet`, „nurFlorian“ und Bindungen einer Quelle, für jeden Datensatztyp (kein Typ ohne `herkunft`, auf Typebene geprüft);
    nur `florian` legt Datensätze „dein“ an (`automatik` und `sitzung` werden abgelehnt); `Projekt` feldweise (3.2); Herkunftsregel
    über `Entwurf.ziel` (nur das Ziel wird „dein“);
    `fremdUebernehmen`: je Datensatz die geänderte Seite, beidseitig geändert gewinnt der lokale Stand, die fremde Fassung kommt
    zurück; fremde Transaktionen nie in seinem Verlauf.
  - **M1.6 Ablage.** Legt an `packages/studio-ablage/src/*` (2.2) und `content/studio/.gitignore` (`.sicherung/`). Die Wege aus 4.9 als
    Vite-Plugin mit `configureServer` und `configurePreviewServer`, mit Haken für den Zusammenbau (ausliefern, Schreiben prüfen, fremde
    Datei geändert) und Optionen (nur lesen, Live, Merker, CORS-Liste); dieselben Funktionen direkt für Skripte in Node. Tests (Node,
    temporärer Ordner): Revision und `If-Match` (200, 409), atomar, Sicherungsring (die letzten 50 und je Stunde einer für eine Woche;
    verdrängte Fassungen als eigene Dateien außerhalb des Rings), Pfad- und Origin-Regeln, Sitzungsschlüssel nur mit `STUDIO_FLORIAN=1`,
    ohne Schlüssel Quelle `sitzung`, mit ungültigem Schlüssel `401`, Protokoll mit der Quelle jedes Schreibens, Beobachter meldet fremde
    Änderungen und Änderungen an fremden Quellen, Live-Weitergabe an den Spiel-Port des Paars, ein Server ohne `STUDIO_FLORIAN=1` reicht
    nie an 5261 weiter, Merker nur als neue Datei nach `laeufe/`, ohne `STUDIO_INHALT` eine frische Kopie statt `content/studio`, relative
    Pfade vom Wurzelordner des Arbeitsbaums, `sitzung/offen`.
  - **M1.7 Knochen starr, Drähte, Regler ohne Zeit.** Legt an `knochen/{baum,starr,aufhaengen}.ts` (`knochenStellen` und
    `aufhaengen`, vorerst für `starr` und für Teile ohne Aufhängung), `bauplan/knochen.ts`, `logik/draehte.ts`, `bauplan/logik.ts`
    (vorerst nur Drähte; die übrigen Felder wie in `leererBauplan`, `bausteinStand` = [0]), `regler/durchlauf.ts` (Schritt 6: Soll
    aus Hand und Draht, Ist = Soll ohne Zeit) und `regler/mischen.ts` (Schritt 10, ohne Ausgleich; beide ergänzt M4.1), die `hand()` und
    `bild` in M1 brauchen (Befund 1), `editor/handgriffe/logik.ts` Teil 1
    (`drahtLegen`, `kennlinieFormen`, `drahtAendern`, `drahtLoesen`, `bausteinAnhaengen`, `bausteinAendern`; Befund 1). Nach dem Vertrag
    aus M0 (4.3, 4.4): `bauplan/knochen.ts` füllt `KnochenPlan.teile` für jedes Teil mit `figur`, `erster` und `anzahl` aus
    `ankerBereiche` (ein Teil ohne Aufhängung als 'starr' mit knochen = [−1]), dazu `figurLage` (Regler der Lage jeder Figur) und
    `figurEinheit`; `knochenStellen` stellt die Lage jeder Figur vor ihre Wurzelknochen und schreibt sie hinter die Knochen in
    `matrizen` (6 · (anzahl + Figuren)); `aufhaengen` bildet damit auch die Teile ohne Aufhängung ab. `regler/durchlauf.ts` liest
    `lauf.regler.hand` nur (NaN: keine Hand; geklemmt hat schon `handSetzen` aus M1.3) und rechnet in `ReglerPlan.folge` (sie enthält
    Drähte und Spiegelkanten); mitgespiegelte Regler über `inSpiegelHaelfte` und `mitSpiegel`/`mitUm` aus `bauplan/regler.ts`; Vorsicht
    bei +∞ in `federF` und `hoechsttempo` (∞ · 0 ist NaN; ohne Zeit gilt Ist = Soll). Tests: starre
    Knochen mit Verschiebung erhalten Formen exakt, Eltern vor Kindern; ein Teil ohne Aufhängung folgt x, y und Drehung seiner Figur
    exakt (p_Welt = (x, y) + D · p / einheitL); Drähte in der Folge ihres Graphen, Kennlinie mit PCHIP nach der
    Regel aus 4.1, außerhalb festgehalten, Spiegel für Kreis- und Linienregler (in [ab, um) die Eingabe um − w, Ausgabe negiert);
    Drähte ohne Zeit (dt = 0, Glätten aus); der Durchlauf ohne Zeit setzt Ist gleich Soll, das Mischen gibt die Werte des letzten
    Durchlaufs; die Handgriffe legen gültige Datensätze an.
- **Verdrahtung nach Welle A** (Integration): `studio-rechnen/src/{winkel,exp}.ts` auf den Port aus M1.1 umstellen (Namen und
  Signaturen bleiben, ebenso `gradZuRad` und `radZuGrad`, die kein Math rufen, und das Weiterreichen von `hypot` aus `exp.ts`) und in
  `eslint.config.js` genau die zwei Einträge `winkel.ts` und `exp.ts` unter `ignores` streichen (Tests bleiben ausgenommen);
  `bauplan/bauen.ts` (Form, Knochen, Logik, Abflachung, Zeichen; die Hinweise weiterer Teilpläne an `hinweise`), `fassade.ts` (`bauen`,
  `hand` mit `handSetzen` und dem Durchlauf ohne Zeit aus M1.7, `bild` mit `regler/mischen.ts`, `werte` in BildDaten), die
  Registerliste der Effekte (`EFFEKT_ZEICHNUNGEN`), `server/plugins.ts` (`studioPlugins` mit den Haken `quellenEinsetzen` und
  `schutzVerletzt`).
- **Welle B** (braucht Welle A und ihre Verdrahtung):
  - **M1.8 Übernahme des Kopfs.** Legt an `tools/studio-uebernahme/src/{kennungen,kopf,renderregeln,prototyp-werte}.ts`,
    `paritaet.test.ts`, `prototyp-werte.test.ts`; Aufrufe `uebernehmen` (alles) und `uebernehmen -- --kopf` (Neustart, wenn er im
    Prototyp speichert: prüft Werte und Parität und schreibt nur, wenn beides hält). `uebernahme.ts` gibt es seit M0 als
    Zusammenbau-Datei (2.2): Sie versteht beide Aufrufe und führt die Schritte ihrer leeren Liste `SCHRITTE` aus (je Schritt
    `{ name: string; kopf: boolean; laufen(): Promise<void> }`). M1.8 exportiert seine Schritte in dieser Form aus `kopf.ts` und ändert
    `uebernahme.ts` nicht; die Integration trägt sie ein (M1.Z). Die tsconfig des Werkzeugs
    hat DOM in `lib`, damit es den `FigurRaster` aus `apps/editor/src/ozzy-figur/raster.ts` importieren kann (2.1). Effekte tragen in
    `Effekt.art` den Namen (`dicke`), in `versionen.arten` steht die Art mit Familie (`effekt:dicke`, 3.4); Knochen- und
    Biegeachsen-Längen in Reglern haben die Einheit `'figur'` (3.2). `ozzy-rollen.json` enthält über Rolle und Seite hinaus `partner`
    (in beide Richtungen), `gebaut: true` für die vier Sohlen und `ansichten` als vollständige Kopie von `ANSICHTEN` (datei, koerper,
    kopf, haltung, teile). Schreibt beim Lauf der Integration über Ablage und
    Store (Quelle `automatik`) `content/studio/ozzy/{projekt.json,figuren/ozzy.json,vorlagen/*.svg}` (6.2, Schritte 1 bis 7, nur für
    die Kopfteile, samt Hals- und Kopfknochen mit ihren Winkel-Reglern, vier Drähten und `Projekt.quellen`; seine Schlüssel, am 20.11.
    16, schreibt sie nicht). Tests: Parität (Probe 1) an den geschriebenen Dateien, neu geladen, nicht aus dem Speicher; Rundweg; ein
    zweiter Lauf ändert kein Byte; hat eine Sitzung mit Quelle `florian` dazwischen einen gebauten Datensatz geändert (an einer Kopie),
    lässt der nächste Lauf ihn stehen, schreibt den Rest und nennt seine Kennung (4.9); mit dem Vermerk
    `umgezogen` (an einer Kopie) ändert sie am Kopf kein Byte und trägt keine Quelle ein; `ozzy-rollen.json` stimmt mit `ANSICHTEN` und
    `TeilName` überein; `prototyp-werte` am Verhalten des Prototyps (Befund 20). **Braucht** M1.2, M1.3, M1.5, M1.6, M1.7.
  - **M1.9 Betrachter, Prüfseite, Vergleichsproben.** Legt an `apps/studio/src/{betrachter,pruefseite}.ts` (Bühne mit einer Figur,
    Leiste zum Fahren, noch ohne Bearbeiten; Code von `pruefen.html`), `src/buehne/ansicht.ts` (`einpassen`),
    `e2e/{rechnen,kopfdrehung}.spec.ts`, `scripts/proben/{m1-kopfdrehung,m1-rahmen-rest,m1-front-periodisch}.mjs`; alles an
    `testfigur.json` getestet (Ozzys Daten entstehen erst im Abschluss); die Proben wählen Teile nur über Rollen (`Teil.rolle`, 2.3 Nr. 3)
    und leiten auf 5294 `**/__ozzy-figur/schluessel` um (6.3). Beide Mischarten sind Studio-Code und werden mit `studio-bild`
    gezeichnet; kopierter Prototyp-Code ist nicht nötig. `e2e/seiten.spec.ts` (M0) bleibt; Seiten und Proben warten auf
    `data-schrift="geladen"` (7.3); `pruefseite.ts` gibt es seit M0 leer als Einstieg von `pruefen.html` und wird hier gefüllt; die
    eigenen Specs laufen mit eigenem `STUDIO_INHALT` (7.4). **Braucht** M1.3, M1.4.
- **M1.Z:** `fassade.ts` bekommt `auswerten` (16 j); `uebernahme.ts` (die Schritte aus M1.8 in `SCHRITTE`); `main.ts` (Betrachter mit
  Ozzys Kopf, Leiste θ zum Fahren), `pruefhaken.ts`;
  Übernahme laufen lassen (Commits nach 5.1); Speichertest der ganzen Kette über 10 000 Bilder (Node mit `--expose-gc`); Proben auf Ozzy;
  Stand.
- **Probe (a) automatisch:** (1) Parität: 0° bis 360° in 0,5°, jedes Kopfteil gegen `FigurRaster.teile({ psi: 90, theta, nurKopf: true })`
  des Prototyps (mit Kopfversatz und Halslage und seinen Schlüsseln aus `schluessel.json`, am 20.11. 16), Kurvenpunkte unter 0,001 (3.5); Tabelle
  der größten Abweichung je Teil. (2) Video `m1-kopfdrehung.mp4`: links Prototyp (5294), rechts Studio (5291), ganze Drehung in
  0,5°-Schritten, dann langsam 52° bis 82° und 145° bis 180°; je Winkel deutlich abweichende Bildpunkte (|Δ| > 128 von 255) unter
  0,01 %. (3) Zweimal speichern und zweimal übernehmen ergibt dieselben Bytes. (4) `rechnenSelbsttest` und die Prüfsumme der Anker über
  1 200 Schritte (0,3° je Schritt) sind in Node, Chromium und WebKit gleich (im echten Safari über WebDriverIO, sobald B6 erledigt ist).
  (5) Bild `m1-rahmen-rest.png` (Ohr dreht 120° zwischen zwei Schlüsseln: gerade, je Koordinate, Rahmen + Rest; Stirnfranse 52° bis 82°:
  heute gegen Rahmen + Rest; gleiche Ansicht) und Video `m1-front-periodisch.mp4` (langsame Drehung über die Front mit und ohne
  periodische Mischung). (6) Der Schreibhaken hat in allen Läufen keinen Schreibversuch unter `docs/look/ozzy-figur/` oder
  `apps/editor/` verweigert, und die Ablage meldet kein Schreiben an einem Datensatz „dein“ ohne Quelle `florian` (6.3).
- **Probe (b) für Florian:** B1 (Kopfdrehung vergleichen), B2 (Mischart ansehen). Vorläufig bleibt seine Kopfdrehung „je Koordinate“
  und über die Front nicht periodisch (A2, A3), und sie bleibt im Prototyp (A1); der Bau wartet nicht.
- **Rückfall und Abbruch** (9.2): Für die Parität gibt es keinen Rückfall: Die Listen sind schon die des Prototyps samt gespiegelter
  Einträge (6.2 Nr. 5), und nichts wird gerundet (3.5). Eine Abweichung ist ein Baufehler, gesucht an der Tabelle der größten Abweichung
  je Teil; nach dem Anderthalbfachen der Schätzung anhalten und berichten. Bitgleichheit in einer Umgebung verfehlt → Merker nur am
  selben Gerät, die Funktion benennen; der Editor wartet nicht darauf.

### 5.5 M2 Messen, P1, Tapsen (neben M1)

**Ziel.** Zahlen aus Ersatzszenen, der Beweis, dass Box2D mit unserer Figur trägt (14a §7), und der erste spielbare Stand: P1 mit
„Tapsen“ auf dem iPhone (Befund 10, 23). **Braucht:** M0; Welle B dazu M1 Welle A.

- **Welle A** (je braucht M0; ein Workflow mit M1 Welle A):
  - **M2.1 Welt.** Legt an `studio-welt/src/{laden,adapter,koerper,huellen,gelenke,finger,federbein,kraftpaar,abfragen,lesen,ereignisse,
    snapshot}.ts`, `vertrag.test.ts`. Zuerst klären, ob `box2d3-wasm/compat` mit Vite 8 und in Node lädt (09 §10). Der Adapter erfüllt
    `WeltAdapter` samt allem, was M0 ergänzt hat (4.5): die Pflichtmethode `fuehren` (b2Body_SetTargetTransform); `zielSetzen` mit
    optional neuer Höchstkraft und Feder (setzt Höchstkraft, Höchstmoment hoechstkraft · ρ und die Frequenz des Motor-Gelenks neu);
    `federbein` mit `anteil`, nur für den nächsten Schritt (je Teilschritt ein Strahl und die Kraft
    F = anteil · ((2πf)² · (Ruhelänge − d) − 2ζ · 2πf · u) längs der Normale, gegengleich auf den getroffenen Körper; Box2D rechnet
    massennormiert, die Steifigkeit wird umgerechnet); `WeltPuffer.beine` und `beinZahl` (`BEIN_FELDER` je Bein); Ketten einseitig
    (Vorderseite nach 4.5, auch für Strahl, Federbein und `schnell`); Vielecke höchstens `VIELECK_PUNKTE` = 8 Punkte vor der Hülle,
    Ketten mindestens 2, Schleifen 3, sonst RangeError in `huelle` und `zone`; `tempi` als Tempo des Ursprungs
    (b2Body_GetWorldPointVelocity am Ursprung), `lagen.w` in (−180, 180]; Kontakte je Hüllenpaar aus den Begin-, End- und
    Hit-Ereignissen, Zonen aus den Sensor-Ereignissen (Art 1, 0, −1). Der Finger prüft „eine geschlossene Kette enthält ihr Inneres“
    selbst (Punkt im Vieleck), weil b2Shape_TestPoint Ketten nicht sieht. Die Laufzeit nimmt `studio-welt` in `src/` nur mit
    `import type`; die Feldbreiten führt es als geprüfte Kopie (`import type { KONTAKT_FELDER } …;
    const KONTAKT: typeof KONTAKT_FELDER = 11;`, 4.5). `vertrag.test.ts` importiert die `WeltAttrappe` als Wert (in Tests erlaubt,
    2.3 Nr. 6); Toleranzen und Fälle kann die Reihe aus `weltAttrappe.test.ts` übernehmen; nahe den Ecken einer Kette prüft sie nichts.
    Tests: dieselbe Reihe gegen Adapter und Attrappe (Körper fällt, Scharnier hält, Motor mit Tempo 0 bremst, Strahl trifft, eine Kette
    nur von vorn, Zone meldet, Federbein mit Vorspannung steht beim Gewichtsanteil auf `laenge`, `fuehren` erreicht die Lage,
    `merken` und `zuruecksetzen` ergeben nach 600 Takten dieselbe Prüfsumme).
  - **M2.2 Figurphysik-Grundlage.** Legt an `studio-laufzeit/src/physik/{xpbd,feder,schwingen,kette}.ts`. Die Chiparten `schwingen`
    und `kette` erfüllen `Chipart` aus M0 (4.5): `standLaenge(c, plan)` sagt, wie viele Zahlen ein Chip in `Lauf.figur` braucht; sein
    ganzer Stand liegt dort ab `PhysikPlan.chipStand[i]` (frischer Lauf: Nullen = Ruhe), der `ChipLauf` hat nur `schritt(dt, lauf)`
    (liest und schreibt nur seinen Bereich und seinen Ausgang) und `ruht(lauf)`, keinen eigenen Stand. `physik/xpbd.ts` baut
    `figurSchritt(p: PhysikPlan, lauf: Lauf, chips: readonly ChipLauf[], dt: number, teilschritte: number)` (Schritt 8, 4.2); die Liste
    der `ChipLauf` hält die Fassade. Eingetragen in `physik/chips.ts` werden sie von der Integration. Tests (mit
    `{ ...leererBauplan(), physik: … }`): Ruhe = Zeichnung
    (nach dem Ausschwingen höchstens 1e-6), stabil bei 1 bis 5 Takten je Bild, Dauer und Federung ergeben f = 1/Dauer und
    ζ = 1 − Federung; eine Kopie von `Lauf.figur` zurückgeschrieben ergibt bitgleich denselben Verlauf (so sichert ein Schlüsselstand
    die Chips).
- **Welle B** (ein Workflow mit M1 Welle B; braucht M1 Welle A, deren Verdrahtung und M2 Welle A):
  - **M2.3 Seite P1 mit „Tapsen“.** Legt an `apps/studio/src/p1/{p1,ozzyKoerper,hinsetzen,tapsen,anzeige}.ts`,
    `scripts/proben/m2-p1.mjs`. Aufbau nach 14a §7.1: Rad dynamisch mit vier Gewichten, Finger, Ozzy aus seinen SVGs (`svgImportieren`:
    Stehen und Sitzen; welcher Pfad welches Teil ist, liest P1 als Rolle aus `studio-format/pruefdaten/ozzy-rollen.json`, 2.3 Nr. 3),
    Rumpf vorn, Rumpf hinten und Kopf (`rumpf.vorn`, `rumpf.hinten`, `kopf`, dasselbe Körpermodell wie in M5) mit Motor-Gelenken,
    Federbeine mit Vorspannung (4.5), Kräftepaar (Bremskraft 0,3 g), Hinsetzen V1 (Gelenkziele) und
    V2 (Hülle je Takt), Popo-Rutschen, Ragdoll aus 10 Körpern, Ohren und Schwanzkette aus M2.2, eigener fester Takt mit Schlüsselständen,
    Spulen, Röntgen und Kennzahlen. Neu der Modus **„Tapsen“** (Befund 10): Draht Hang → Wunschtempo mit der Kennlinie aus Konzept 6.3,
    Kräftepaar mit Bremskraft 0,3 g, Ozzys Logo starr auf den Körpern (starre Knochen aus M1.7 und die Lage der Figur über ihre Regler
    x, y, Drehung, 4.3; gezeichnet über die Fassade), ein Wippen im Schritttakt statt des Gangs, Finger am iPhone. `p1.ts` gibt es seit
    M0 leer als Einstieg von `p1.html` und wird hier gefüllt; das Rad mit Gewicht „Boden“ ist ein geführter Körper (`fuehren`).
    **Braucht** M1.2, M1.3, M1.4, M1.7, M2.1, M2.2.
  - **M2.4 Messseite mit Ersatzszenen.** Legt an `apps/studio/src/messen/{messen,ampel,statistik,ergebnis,szenen}.ts`,
    `messen/bloecke/b0.ts` bis `b9.ts`, `scripts/proben/m2-messen.mjs` (startet die Messseite am Mac im echten Safari über WebDriverIO
    mit safaridriver, sonst in WebKit von Playwright); füllt `server/messung.ts` (Weg aus 4.9; die Signatur steht seit M0:
    `messungWeg(o: { wurzel: string }): Plugin` mit `MESSUNG_WEG`, `MESSUNG_ORDNER`, `MESSUNG_DATEI`; `studioPlugins()` hängt es schon
    ein, `plugins.ts` bleibt unberührt; COOP und COEP nur für `/messen.html`, das setzt `vite.config.ts` schon). `messen.ts` gibt es seit
    M0 leer als Einstieg von `messen.html`. Die Kreise ihrer Ersatzszenen schreibt die Seite selbst nach `BildDaten.kreise`
    (`KREIS_FELDER` je Kreis, 4.6). Blöcke nach 8.2. Statt „beschriftet ersetzt“ misst die Seite **Ersatzszenen** (Befund 10), alle
    aus seinen SVGs über
    `svgImportieren`, ohne Übernahme: (a) ganzer Ozzy (Logo) einmal, (b) sechsmal (Maß für den Rückblick), (c) Ersatz-Spielwiese:
    gebackener Hügel, Ozzy, drei gebackene Dinge, 80 analytische Kreise, (d) zwei bewegte Figuren (Ozzy und ein gespiegelter, auf 70 %
    verkleinerter Ozzy als Platzhalter der Katze). Was später gebaut wird, ersetzt die Szenen. **Braucht** M1.2, M1.3, M1.4.
- **M2.Z** (nach der gemeinsamen Welle B, zusammen mit M1.Z): K1 bis K9 messen; P1 und die Messseite am Mac laufen lassen und
  aufnehmen.
- **Probe (a) automatisch:** (1) P1: Tabelle K1 bis K9 (14a §7.2) mit Messwerten am Mac und Aufnahme `m2-p1-mac.mp4` (drei Radgewichte,
  Hinsetzen am Hang V1 und V2 nebeneinander, Popo-Rutschen, Sturz, Zurückspulen, „Tapsen“). (2) Messseite am Mac mit den Ersatzszenen
  (Safari über WebDriverIO, sonst WebKit), mit Faktor 3 bis 4 umgerechnet: ein Hinweis, keine iPhone-Messung; Ergebnis in
  `docs/progress/studio/tempo/`. Kriterien (iPhone 16 kalt): Grafik Ozzy ≤ 3 ms, jede Szene ≤ 8 ms, Reserve ≥ 2.
- **Probe (b):** B3 (Messseite auf iPhone 16, iPad und Mac, je rund 15 Minuten; welches iPad), B4 (Rad mit Gewicht auf dem iPhone,
  Aufnahme `m2-p1-iphone.mp4`), B5 (erster spielbarer Stand: „Tapsen“ mit Nicole; Kriterium: in höchstens drei Versuchen 30 s in der
  Stehzone, dann in den Trab und zurück zum Stehen), B6 (Safari-Automation einmal einschalten,
  freiwillig). Vorläufig: Die Welt rechnet Box2D (A12).
- **Rückfall und Abbruch** (9.2): Der Weg der Welt entscheidet sich an K1 bis K9, gemessen, nicht an einem Urteil: K5 oder K6 rot → B′
  (Welt steht, Schwerkraft und Kamera drehen), dann Rapier hinter demselben `WeltAdapter`; Eintrag in die Liste. Sein Blick folgt in B4;
  M5 wartet nicht darauf. Messseite rot (am Mac umgerechnet: Hinweis; am iPhone: Messung) → Maßnahmen aus 8.3 als nächste Welle.
  Schafft Nicole es in drei Versuchen nicht (sobald ihr Ergebnis da ist) → Bremskraft 0,35 g und Radius 16 L, dann erneut. P1 nach dem
  Anderthalbfachen der Schätzung ohne K1 bis K9 → anhalten und berichten.

### 5.6 M3 Werkbank

**Ziel.** Florian formt in Studio wie im Prototyp, mit Speichern, Rückgängig, Schutz seiner Schlüssel und zwei Geräten zugleich. Seine
Kopfdrehung ist bis zum Umzug in Studio nur zum Ansehen (A1); formbar ist sie im Prototyp und im Probe-Projekt. **Braucht:** M1.

- **M3.0 Vertrag:** legt an `apps/studio/src/kern/{sitzung,signal,stelle,auswahl,linse,schleife}.ts` (klein, fertig gebaut),
  `werkzeuge/werkzeug.ts` (Schnittstellen), `befehle/{register,tasten}.ts` (mit `gesten` und `handgriff`), die Typen in
  `leiste/leiste.ts`; ergänzt `studio-laufzeit/src/vertrag/editor.ts` (Zug `stueck`); installiert `@zag-js/react` (die neueste
  Version, die älter als zwei Wochen ist; M3.0 legt sie genau fest; 30 e) und in derselben Version die Maschinen, die M3.6 braucht:
  `@zag-js/menu`, `@zag-js/dialog`, `@zag-js/combobox`, bei Bedarf `@zag-js/popover` (`@zag-js/react` ist nur der Anschluss an React).
- **Welle A** (je braucht M1 und M3.0):
  - **M3.1 Editor-Kern.** Legt an `studio-laufzeit/src/editor/{rueckrechnen,zielregel,fang,ankerSetzen,ankerLoeschen,waechter,
    ruhewaechter,faltenVorschlag,geltung}.ts`, `editor/handgriffe/{form,projekt}.ts` (4.7). Tests: Rückrechnung landet auf 1e-6 und
    ändert keinen gespeicherten Schlüssel an einer anderen Stelle (fast-check), samt Fixpunkt bei wirkenden Zusatzformen und Spitzenregel
    (Befund 13); Zielregel nach Konzept 9.2, Zug bei 210° wird der gespiegelte Schlüssel des Partners bei 150°; P setzt einen Anker in
    jedem Schlüssel, ohne eine Form zu ändern; Herkunft (Befund 3): P ändert keine Herkunft eines Schlüssels, nicht die Menge der ruhenden
    Schlüssel und an keinem Winkel die Gestalt (Kurvenpunkte auf 1e-9), Löschen ändert keine Herkunft eines Schlüssels; an Bindungen
    einer Quelle wird jeder Zug abgelehnt, die Statuszeile sagt warum; Wächter an gebauten Fällen (Sehnenumkehr, Schlaufe nach Stone und
    DeRose, Selbstschnitt); Fang auf 0,5°; `kopfdrehungUebernehmen` schreibt seine Schlüssel als „dein“, nimmt die Quelle heraus und
    setzt `umgezogen` (an einer Kopie); `ansichtAusSvg` auf „Körper −90°“ legt eigene Schlüssel und einen Abschnitt an, der Schlüssel des
    Partners bei 90° bleibt bytegleich, und an jeder anderen Stelle bleibt das Bild gleich (4.7); die Löschen-Handgriffe dieser Datei
    lösen Verweise auf und folgen der Schutzregel; ein neuer Schlüssel an einer Bindung mit Abschnitten kommt nach `form/listen.ts` in
    die Listen seiner Nachbarn, sein gespiegelter Eintrag ebenso beim Partner, und Löschen nimmt beide heraus (4.4; an der Kopf-Bindung
    des Probe-Projekts `werkbank-probe`). **Braucht** M1.2, M1.3, M1.5, M1.7.
  - **M3.2 Server und Speichern.** Legt an `apps/studio/src/speichern/{verbindung,speichern,journal}.ts`: Sitzungsschlüssel holen (beim
    Start und nach jedem Wiederverbinden der Ereignisse; unter Automation nie; 4.9);
    speichern 300 ms nach der letzten Änderung mit `If-Match`; bei 409 und bei `geaendert` laden und mit `fremdUebernehmen`
    zusammenführen, verdrängte Fassungen nach `projekt.json` → `fassungen`; Journal je Gerät; `sitzung/stand` melden; Prüfer-Hinweis, wenn
    die Übernahme nach seinem Speichern im Prototyp nicht schreiben konnte. Legt an `tools/studio-inhalt/src/probeprojekte.ts`
    (`probeprojektAnlegen(name, ohne)`: Dateikopie von `content/studio/ozzy/` über die Ablage in ein neues Probe-Projekt, ohne
    Store-Schritt und samt Herkunft; fremde Quellen eingesetzt und aus `quellen` genommen, damit der Kopf dort formbar ist; `ohne` nimmt
    gebaute Datensätze heraus; nie nach `ozzy/`, nie in einen bestehenden Ordner; 3.6 Nr. 9, Befund 26). Tests (Node, gegen eine echte
    Ablage im temporären Ordner): 409 und Zusammenführen (der spätere gewinnt, Fassung wiederherstellbar); nach einem Neustart des Servers
    antwortet ein Schreiben mit altem Schlüssel `401`, die Seite holt den Schlüssel neu und speichert als `florian`; Journal nachspielen
    mit Speicher-Attrappe; Probe-Projekt aus `testfigur.json`, das Ausgangsprojekt bleibt bytegleich. **Braucht** M1.2, M1.5, M1.6.
- **Welle B:**
  - **M3.5 Bühne und Werkzeuge.** Legt an `buehne/{buehne,treffer,ueberlagerung,zwiebelhaut,bahnen,rand,status}.ts`,
    `werkzeuge/{verschieben,direkt,stift,umwandeln,lasso}.ts`, `befehle/form.ts` (Befehle der Bühne: Anker, Griff, Kurvenstück, Teil,
    Figur); ändert `buehne/ansicht.ts`. Griffe als Nadel, beim
    Halten Haarlinie mit Perle; Vorschau vor dem Zug (Tropfen pulsiert, rote Ringe); Stift und Finger nach 4.8; Zwiebelhaut über
    `auswerten`. Tests (grün im Zusammenbau, 5.1 Nr. 2): `e2e/werkbank.spec.ts` mit Maus und Stift (`pointerType: 'pen'`): Anker
    ziehen, Griff mit ⌥, A biegt ein
    Kurvenstück, ⇧C, Lasso, P setzt und löscht, Pfeiltasten, ⌘Z, Leertaste halten und ziehen verschiebt die Ansicht. **Braucht** M3.1.
  - **M3.6 Leiste, Eigenschaften, Befehle mit Zag.** Füllt `leiste/leiste.ts`; legt an `leiste/{zeile,tropfen,schluesselpunkt,feld}.ts`,
    `eigenschaften/{Eigenschaften,Wert,Pruefer}.tsx` (Schlüsselpunkt ○ ◌ ● über `wertSetzen`; Prüfer mit Hinweisen, „übergehen“ und
    „Wiederherstellen“), `befehle/{suche,hilfe,datei,leiste}.ts` (Menüs, Befehlssuche, Blatt und Dialoge mit Zag; Datei auf Bühne,
    Leiste und Bibliothek; „Kopfdrehung übernehmen“; Befehle der Leiste: Raute, Falte, Wechsel, Regler, Mischart, Spiegeln; dazu
    `wertSetzen` und der Prüfer); ändert `look/liquid-drop.css` (seit M0 eine wörtliche Kopie von `ozzy-figur.css` ohne `@font-face`;
    `#leiste` ist dort noch die rechte Spalte des Prototyps, in Studio heißt die Zeitleiste unten „Leiste“: beim Umbau umbenennen).
    Tests (grün im Zusammenbau, 5.1 Nr. 2; Z und ⇧Z brauchen die
    Zeichnung aus M3.5): `e2e/leiste.spec.ts`: Klick springt, Ziehen fährt, J und K, Z, ⇧Z, Raute wählt ihr Teil, Farben nach Herkunft,
    Mischart als Wort, Schlüsselpunkt (Tippen holt die Achse und ändert nichts, Ziehen setzt den Schlüssel, Halten → „Schlüssel hier“).
    **Braucht** M3.1, M3.2.
- **M3.Z:** `main.ts`, `befehle/alle.ts`, `pruefhaken.ts` (mit `vorschau()`), `server/plugins.ts` (Neustart der Übernahme, wenn er
  seine `schluessel.json` speichert: 2 s nach dem letzten Speichern, höchstens ein Lauf zugleich, ein neuer Stand bricht den laufenden
  ab; die Dauer eines Laufs steht in der Übergabe); die e2e der Welle B; Test: Umzug an einer Kopie, danach `uebernehmen`: am Kopf ändert
  sich kein Byte, und keine Quelle wird eingetragen; Ort-Probe `e2e/ort.spec.ts`; Handgriff-Test `test/handgriffe.test.ts`; Safari-Web-App
  (`manifest.webmanifest`, Symbol) fürs iPad; Probe-Projekt `werkbank-probe` (Kopie von Ozzy, Kopf dort formbar);
  `scripts/proben/m3-werkbank.mjs`.
- **Probe (a) automatisch:** (1) 100 Züge an einem Griff, ein ⌘Z stellt den Stand davor her. (2) Eine Sitzung will einen seiner
  Schlüssel löschen: Der Server lehnt mit 403 ab, der Editor zeigt es; eine erlaubte Änderung der Sitzung erscheint im offenen Editor in
  unter 1 s. (3) Zweimal speichern ergibt dieselben Bytes. (4) Zwei Seiten (Mac und iPad nachgestellt) ändern denselben Datensatz: Der
  spätere gewinnt, die frühere Fassung steht im Prüfer und lässt sich wiederherstellen. (5) **Ort-Probe** (Befund 10): Playwright mit
  echten Zeigerereignissen, Maus und Stift, auf einer Kopie: 200 Züge an zufälligen Stellen (Leiste, Posenkarte, Brücke, soweit gebaut)
  und Teilen; vor jedem Zug werden Statuszeile, rote Ringe und Tropfen gelesen, danach der Diff. Kriterium: Die Vorschau nennt genau die
  Datensätze, die sich ändern (Ziel und ruhende Schlüssel), und kein anderer ändert sich. Sie läuft danach bei jeder Änderung an
  Werkzeugen oder Zielregel. (6) Mit einer Kopie seiner `schluessel.json` als Quelle: Speichern dort startet die Übernahme neu, und der
  offene Editor zeigt den neuen Stand. (7) Bild `m3-werkbank.png`: seine Kopfdrehung bei 150° mit Leiste, Zwiebelhaut und Statuszeile.
  (8) Handgriff-Test grün.
- **Probe (b):** B7 (Werkbank-Probe 1 im Probe-Projekt `werkbank-probe`, Mac und iPad mit Stift). Einen Klick-Versuch im bestehenden
  Werkzeug gibt es nicht: sein Prototyp wird nicht geändert. Vorläufig: kein Umzug (A1), seine Kopfdrehung mischt weiter „je
  Koordinate“ (A2), keine Modi (A13), V verschiebt (A14), Leertaste (A15), zwei Geräte (A25).
- **Rückfall und Abbruch** (9.2): Ein Fehler der Ort-Probe ist ein Baufehler und wird behoben. Scheitert B7 (unter vier von fünf, sobald
  das Ergebnis da ist), kommt die Gegenprobe „zwei Modi“ (M4G) als nächste Welle. Eigenschaftstests von Store oder Rückrechnung nach dem
  Anderthalbfachen der Schätzung rot → anhalten und Ansatz prüfen.

### 5.7 M4 Posen, Übergänge, Knochen

**Ziel.** Posen, Ausgleich, gestaltete Übergänge und die Tafel, Biegeachsen mit Gewichten je Anker und Griff, dazu seine Haltungen und
Abläufe als Daten. **Braucht:** M1, M3.

- **M4.0 Vertrag:** ergänzt `vertrag/{bauplan,lauf,zusatz,editor}.ts` (Posen- und Knochenpläne, Anforderungen, Ziele Posenkorrektur und
  Zwischenpose, Stelle `ausprobieren`), `studio-format/src/arten/zusatz.ts` (Schemas von `huepfer`, `plumps`, `seufzer`, `wedeln`).
  `Anforderung` (`vertrag/lauf.ts`), `TafelZelle` (`vertrag/editor.ts`) und `Zusatzart` (`vertrag/zusatz.ts`) gibt es seit M0; M4 legt
  sie nicht neu an. `zusatzAnwenden(z, r, anker, erster, anzahl, glatt)` (4.4) bekommt hier einen Parameter, ob das Teil geschlossen ist
  (aus `TeilPlan.geschlossen`): Die Rahmenformel der VersatzZeile (3.2) braucht ihn an den Enden offener Linien.
- **Welle A** (je braucht M1, M3):
  - **M4.1 Regler und Ausgleich.** Legt an `regler/ausgleich.ts`; ändert `regler/{durchlauf,mischen}.ts` aus M1.7 (Ausgleich,
    Nachlauf, Höchsttempo). Tests: zehn Sprünge des Solls ohne Sprung im Ist;
    Schwung bleibt beim Umlenken; kürzerer Weg auf Kreisreglern; Höchsttempo; Ist = Soll beim Formen; der Ausgleich beginnt genau
    `nachlauf` später (16 b); Regler `spannung.<rolle>` multiplizieren mit `spannung` (16 h).
  - **M4.2 Knochen.** Legt an `knochen/{anheftung,biegeachse}.ts`; ändert `knochen/aufhaengen.ts` (Biegeachse mit Gewichten je Anker und
    Griff, linear; Elternknochen starr; Befund 17) und `bauplan/knochen.ts`. Tests: die Fälle aus `haltung.test.ts` für das Rückgrat
    (Länge bleibt, kein Falten unter dem Mindestradius `rMin`, nichts unter dem Boden, stetig in 1/200-Schritten; Abtastung 24 wie
    `rueckgratBauen`); Gelenke reiten bei der Kopfdrehung mit (Anheftung);
    starr erhält Formen exakt; an Biegeachsen folgt w = 1 der Achse und w = 0 dem Eltern starr, ohne Gewichte alle w = 1; Griffe erben, ein
    Satz je Griffpaar bleibt exakt glatt; u ist die Projektion auf die Ruheachse.
  - **M4.3 Posen und Zusatzformen.** Legt an `posen/{schichten,standard,gestaltet,abschnitte,steht,marken,tafel,weg,zyklus}.ts`,
    `posen/zusatz/{huepfer,plumps,seufzer,wedeln}.ts`, `bauplan/posen.ts`, `form/zusatz.ts`; ändert `bauplan/form.ts` (Zusatzpläne:
    Formziele, Posenkorrekturen, Kreuzschlüssel und Felder nach der Feldregel). Tests: Plumps im Takt des Bodenkontakts; Unterbrechen
    sofort, am Halt, nie; „über X“; „bis Ereignis“ endet am Ereignis oder an der Höchstdauer; Marken feuern ab halbem Gewicht; „steht“
    hält die Rolle auf 0,5 genau; Rahmenformel (16 a) samt L = 0 unter 1e-9; Feldregel exakt an jedem Schlüssel, Kreuzschlüssel auf
    Ruhezeile und Ruhespalte null; Vorrang beim Standardübergang (Paar vor „nach Y“ vor „von X“ vor `jede → jede`); Spuren auch für die
    Spannung.
- **Verdrahtung nach Welle A:** `fassade.ts` (Schritte 4, 6, 10 bis 13), `bauplan/bauen.ts` (Posen), `posen/zusatzarten.ts`; dazu der
  Test, der M4.1 und M4.3 braucht: die Fälle aus `steuerung.test.ts` (300 Zufallsklicks ohne Sprung, genau am Ziel; Befund 15).
- **Welle B** (braucht Welle A und ihre Verdrahtung):
  - **M4.4 Übernahme der Haltungen und Abläufe.** Legt an `tools/studio-uebernahme/src/{koerper,haltungen,ablaeufe}.ts`,
    `haltungen.test.ts` (6.2: Schritte 3 und 7 für die Körperteile, dann 8 bis 10; Biegeachsen mit `rMin` aus `Haltungen.mitschreiben`,
    haltung.ts:368, 777; Schwanz als Biegeachse mit Biegung 0, seine Korrekturen je Haltung als Posenkorrekturen; Körper über ψ 0°, 45°,
    90°; jede Schicht mit `jede → jede`; der Regler „Kopf schief“, 6.2 Nr. 6). Tests: an den fünf Haltungen Kurvenpunkte unter 0,001
    gegen den Prototyp; die Verkürzung zur Kamera (`kurz`) ist an den fünf Haltungen 1; `prototyp-werte` (Körper). **Braucht** M4.1,
    M4.2, M4.3, M1.8.
  - **M4.5 Rückrechnung durch Knochen.** Ändert `studio-laufzeit/src/editor/{rueckrechnen,zielregel,geltung}.ts` und
    `editor/handgriffe/form.ts` (`wertSetzen` an der Stelle Pose); legt an `editor/handgriffe/{posen,knochen}.ts` (4.7). Tests:
    Rückrechnung durch starre Teile und Biegeachsen mit Gewichten auf 1e-6; Posenkorrektur und Zwischenpose landen an ihrer Stelle; erster
    Zug in einer Zelle macht den Übergang gestaltet, sonst ändert sich nichts; Eigenschaftstest der Rückrechnung (4.7); `schichtAnlegen`
    legt `jede → jede` an. **Braucht** M4.2, M4.3, M3.1.
- **Welle C:**
  - **M4.6 Oberfläche Posen, Füllringe.** Legt an `apps/studio/src/posen/{posenReihe,posenkarte,bruecke,tafel}.ts`,
    `leiste/taktleiste.ts`, `buehne/{anfasser,fuellringe}.ts` (Ringe an Nase, Pfoten, Spitzen, Mitte; Füllringe an den Ankern einer
    Achse), `werkzeuge/gelenkringe.ts` (Mitte verschiebt, Rand weich oder hart), `eigenschaften/{Uebergang,Feder}.tsx`,
    `befehle/{posen,knochen}.ts`. Tests (grün im Zusammenbau, 5.1 Nr. 2): `e2e/posen.spec.ts` nach den vier Verben (4.8): ＋; Tippen
    auf eine Posenkarte macht sie zur
    Stelle, und die Figur fließt hinüber; Halten → verdoppeln; Tippen auf die Brücke macht den Übergang zur Stelle; Ziehen nach oben
    mischt; Doppeltippen → groß; Kanten ändern Dauern; Leertaste kurz spielt in Schleife, halten und ziehen verschiebt die Ansicht;
    `e2e/knochen.spec.ts`: Gelenkring ziehen, Füllring senkrecht ziehen ändert w, Schloss gibt dem Griffpaar einen eigenen Satz.
    **Braucht** M4.5, M3.5, M3.6.
- **M4.Z:** `fassade.ts`, `main.ts`, `befehle/alle.ts`, `uebernahme.ts` (Körper, Haltungen, Abläufe); die Übernahme laufen lassen; Probe-Projekt
  `werkbank-probe` um die Posen erweitert (über den Store, nur neue Datensätze, 4.9); die e2e der Welle C; `scripts/proben/{m4-ablaeufe,m4-werkbank}.mjs`; `erweiterung.test.ts` für Zusatzbewegungen.
- **Probe (a) automatisch:** (1) „Hinsetzen mit Hüpfer“: Der Plumps fällt in den Takt, in dem der Po den Boden berührt (Bild
  `m4-plumps.png`). (2) 300 Zufallsklicks und zehn schnelle Klicks zwischen Posenkarten: kein Sprung (Sprungprobe mit 1/240 s und
  1/4000 s). (3) Video `m4-ablaeufe.mp4`: die acht Abläufe, links Prototyp (5294), rechts Studio (5291); an den Haltungen Kurvenpunkte
  unter 0,001. (4) Ort-Probe mit Posenkarten, Brücken und Zellen. (5) Über die Handgriffe, wie Florian es von Hand täte: eine Dauer, eine
  Zwischenpose und eine Zusatzbewegung geändert, ohne Code.
- **Probe (b):** B8 (Werkbank-Probe 2 im Probe-Projekt, Mac und iPad: aus „Stehen“ eine Pose machen, einen Übergang nachformen, eine
  Vorderpfote mit dem Ring nach vorn setzen, das Bein wird nicht länger; Befund 26) mit `m4-ablaeufe.mp4`. Vorläufig: Der Schwanz biegt
  sich (A6), Korrekturen drehen mit der Form (A10), keine Modi (A13).
- **Rückfall** (9.2): Scheitert B7 oder B8 (unter vier von fünf, sobald das Ergebnis da ist) → **M4G Gegenprobe „zwei Modi“** als nächste
  Welle (3 bis 5 Tage: Schalter „Formen“ und „Bewegen“ über der Bühne, dieselben Aufgaben); Eintrag in die Liste (A13). Ein Fehler der
  Ort-Probe ist ein Baufehler. Parität der Haltungen verfehlt (Kurvenpunkte über 0,001 an einer Haltung) → der Restversatz je Haltung
  wird eine Posenkorrektur mit Herkunft „gebaut“ (Daten aus der Übernahme), Eintrag in die Liste.

### 5.8 M5 Physik am Mac

**Ziel.** Ozzy steht auf dem Hügel und tapst nach der Kennlinie, wendet über die Front und zeigt in Ruhe genau seine Zeichnung; Takt,
Prüfsumme und Spulen tragen (08 Etappen 1 bis 3, 14b L0). **Braucht:** M1, M2, M4.

- **M5.0 Vertrag:** `WeltAdapter` nach den Erfahrungen aus P1 nachziehen; ergänzt `vertrag/{lauf,eingabe,ereignis,baustein,chip}.ts`,
  `studio-format/src/arten/{bausteine,chips}.ts` (Schemas von `vierbeiner` mit dem Kanal `wendenNach` und dem Schalter
  `springenAufTippen` (3.2), `rad`, `schwingen`, `kette`, `stauchen`, `ruhigHalten`, `fest`, `lose`, `gelee`, je mit `aufGezeichnet`;
  30 d); die Kopplung der Körper und das Körpermodell der Figur (4.5, Befund 6) als Vertrag. Den Stand der Chips und Bausteine im Lauf
  (`standLaenge`, `PhysikPlan.chipStand`, `LogikPlan.bausteinStand`, ohne `stand` und `setzen`; 4.5) gibt es seit M0.
- **Welle A** (je braucht M2, M4):
  - **M5.1 Takt.** Legt an `takt/{takt,eingabe,weltschritt,archiv,spulen,laufdatei,mitschnitt}.ts`. Tests (Node, mit der Attrappe der
    Welt): 1 200 Takte einer Lauf-Datei mit gleicher Prüfsumme bei 1 und 5 Takten je Bild; Spulen auf 7,3 s und Weiterspielen gleich einem
    neuen Lauf; Zeitlupe ändert nur das Takt-Tempo; Schlüsselstände unter 32 MB.
  - **M5.2 Welt und Physikplan.** Ändert `studio-welt/src/*` (Rad am Scharnier, Lagerreibung als Motor, Kette aus dem Weltpfad,
    gerundete Vielecke, Federbeine mit Vorspannung, Kräftepaar); legt an `studio-laufzeit/src/bauplan/physik.ts` (Hüllen aus dem
    Körpermodell jeder Figur, die Kette des Weltpfads im Uhrzeigersinn, `PhysikPlan.chipStand` nach `Chipart.standLaenge`),
    `physik/fuehler.ts`, `editor/handgriffe/welt.ts` (4.7). Tests: Zeichnung und Kette höchstens 0,5 Bildpunkte auseinander (K9);
    Drehimpulsbilanz innerhalb von 2 % (K2); die Handgriffe legen gültige Szenen, Stoffe und Dinge an.
  - **M5.4 Chips.** Legt an `physik/{stauchen,ruhigHalten,gelee}.ts`, `form/fluechtig.ts`, `knochen/glaetteSchutz.ts` (aus M9.2
    vorgezogen, weil Gelee ohne ihn glatte Anker bricht), `editor/handgriffe/physik.ts` (4.7); ändert
    `physik/{schwingen,kette}.ts` (die Kette rechnet innen sechs Glieder und schreibt in die drei Regler der Achse: Richtung der Sehne,
    Biegung an Wurzel und Ende, kleinste Quadrate; Befund 18). Tests: Ruhe = Zeichnung auf 1e-6; die Charakter-Regler (Rollen
    `charakter.*`) verschieben Dauer und Federung nach festen Formeln; Arten mit `aufGezeichnet: 'nurFlorian'` (Gelee) wirken an Teilen
    mit `wieGezeichnet` nur mit Herkunft „dein“; der Schwanz bleibt eine glatte Kurve; der Glätte-Schutz hält glatte Anker unter Gelee
    glatt und wirkt nie an Ecken.
- **Verdrahtung nach Welle A:** `fassade.ts` (Schritte 1 und 4 bis 9; 2 und 3 folgen in M7), `bauplan/bauen.ts` (Physik),
  `physik/chips.ts`.
- **Welle B:**
  - **M5.3 Vierbeiner und Rad.** Legt an `bausteine/rad.ts`, `bausteine/vierbeiner/{vierbeiner,antrieb,planer,gangfeld,sprung,stolpern,
    kehrtwende,kopplung,zustaende}.ts`. Tests: Stehzone tan α ≤ min(Bremskraft/g, Haftung); Gangart nach der Kennlinie; Standpfoten
    stehen in Radkoordinaten auf 1e-6; Kehrtwende über die Front nach 4.5 (nur aus Stehen; aus Schritt zuerst der Ausgleich nach
    Stehen, dann die Wende; Gang ruht, Hüllen rücken zusammen, θ über 0°), erst nach `wendenNach` jenseits des Scheitels (Standard
    0,3 s; ein anderer Wert gilt ohne Codeänderung); mit `springenAufTippen` springt er auf ein Tippen neben sich, ein Tippen auf ihn löst
    nie einen Sprung aus; Sprung überdeckt ein Ding der passenden Höhe; Stolpern nur aus gemessenen Größen; Kopplung nach 4.5 (Wurzel
    folgt `rumpf.hinten`, Abweichung nur in die genannten Regler, Anteil s in Ruhe 0, Chip gewinnt); ein Federbein mit Vorspannung steht
    beim Gewichtsanteil nach dem Ausschwingen auf 1e-6 L auf der gezeichneten Länge; 10 s Stehen auf ebenem Boden, Verweilen und
    Zusatzbewegungen im Test aus (Stehen hat vorläufig kein Verweilen, A28; so gilt der Test auch, wenn Florian Atmen anschaltet): jeder
    Anker im Rahmen der Figur auf 1e-6 wie gezeichnet.
    **Braucht** M5.1, M5.2.
  - **M5.5 Prüfstand.** Legt an `apps/studio/src/pruefstand/{pruefstand,schubsen,roentgen,knoepfe}.ts`, `leiste/mitschnitt.ts`,
    `eigenschaften/Chips.tsx`, `befehle/{physik,welt,logik}.ts` (die Befehle der Handgriffe aus `physik.ts`, `welt.ts` und Teil 1 von
    `logik.ts`, erreichbar über ⌘K und die Eigenschaften; 4.7). Tests (grün im Zusammenbau, 5.1 Nr. 2): `e2e/pruefstand.spec.ts`
    (Schubsen, Ohr schnippen, zehnmal gleich,
    Einzeltakt, Extreme formen holt die Achse auf die Leiste). **Braucht** M5.1, M5.2, M5.4, M1.7.
  - **M5.6 Hügel, Spielwiese, Ozzys Körpermodell.** Legt an `tools/studio-inhalt/src/{huegel,spielwiese}.ts` (Skripte in der Form
    `{ name, laufen() }`; `inhalt.ts` gibt es seit M0, die Integration trägt sie dort ein; die Hüllen nach 3.6 Nr. 12, der Hügel im
    Uhrzeigersinn; über die
    Handgriffe, 6.4); schreibt beim Lauf `content/studio/ozzy/figuren/huegel.json`, `szenen/spielwiese.json` und legt an Ozzys Figur
    an: sein Körpermodell (Datensatz `Koerpermodell`, Befund 6: Rumpfhülle als Kapsel längs der Hauptachse der Bohne, Länge und halbe
    Dicke aus ihrer Grundform, in der Mitte geteilt in `rumpf.vorn` und `rumpf.hinten`; Kopf als Kreis um die Kopfmitte, Radius die halbe
    mittlere Ausdehnung bei θ 0°; Federbeine mit Vorspannung an den Wurzeln der Beinachsen; zehn Glieder für den Sturz), den Regler
    Spannung (Rolle `spannung`, Standard 1; bei Bedarf `spannung.<rolle>`), Chips, Drähte, Zyklen; alles mit Herkunft „gebaut“. Test: Ein
    Lauf zweimal, dazwischen ändert eine Sitzung mit Quelle `florian` `Welt.rad.radius` und einen Zyklus: Beide Änderungen bleiben (der
    zweite Lauf lässt Welt und Zyklus stehen, schreibt den Rest und nennt beide Kennungen, 4.9); ein dritter Lauf mit einem neuen
    Datensatz (ein Steinchen wie in M6.4) legt ihn an, und die beiden Datensätze „dein“ bleiben bytegleich; eine neue Pose, deren Regler
    seine geänderte Schicht nicht führt, entfällt mit Meldung, der Rest kommt an. **Braucht** M5.2, M5.4, M4.5, M3.1, M1.7.
- **M5.Z:** `fassade.ts`, `main.ts` (▶, Linse Physik), `befehle/alle.ts`, Registerlisten (Bausteine); Inhalt laufen lassen; `e2e/determinismus.spec.ts`;
  `scripts/proben/m5-spielwiese.mjs`; `erweiterung.test.ts` für Chips.
- **Probe (a) automatisch:** (1) Ruhe = Zeichnung im Prüfstand: 10 s Stehen auf ebenem Boden, Verweilen und Zusatzbewegungen aus (wie in
  M5.3), jeder Anker auf 1e-6 wie gezeichnet; auf dem Hügel die größte Abweichung als Zahl (den Rest der Krümmung unter 0,005 L gleichen
  die Beinachsen aus). (2) Prüfsumme einer
  Lauf-Datei nach 1 200 Takten in Node, Chromium und WebKit gleich. (3) Aufnahme am Mac `m5-spielwiese.mp4` (Safari über WebDriverIO,
  sonst WebKit; Hinweis): Ozzy steht oben; der Finger hält; Rad 15° gedreht → er tapst bergab, Schritt, Trab, Galopp nach der Kennlinie;
  ⇧Z zeigt Pfotenbahnen ohne Rutschen; schnell gedreht → Stolpern mit Fangschritten; Kehrtwende über die Front; geschubst → die Ohren
  schwingen und stehen danach exakt wie gezeichnet (Zahl im Bild).
- **Probe (b):** B9 (Tapsen bergab ansehen). Vorläufig: Kehrtwende über die Front (A4), auf Ozzy nur die erlaubten Effekte (A7),
  Stehzone, Springen und Wenden (A17), nach links gespiegelt (A18).
- **Abbruch** (9.2): Pfoten rutschen nach dem Anderthalbfachen der Schätzung noch → anhalten und berichten (kein Rückfall im Plan).
  Unruhe an Kontakten wird an Box2D-Werten geprüft, nie mit einer Sonderregel für ein Teil oder eine Lage.

### 5.9 M6 Spielwiese auf dem iPhone

**Ziel.** Die Spielwiese läuft im Spiel auf dem iPhone 16 im Budget; Korrekturformen und Anfasser gehen (Probe S6). **Braucht:** M1,
M3, M4, M5.

- **M6.0 Vertrag:** ergänzt `vertrag/{bilddaten,zeichenmodell,editor}.ts` (Ziele Korrekturform und Kreuzschlüssel), das Live-Protokoll
  (4.9), die Zähler der Kostenampel, in `arten/effekte.ts` die Schemas von `kontaktschatten`, `bodenschatten`, `beinschattierung`,
  `dithering`, `linien`, `staub` (je mit `aufGezeichnet`) und in `apps/studio/server/plugins.ts` die Funktion `spielPlugins` (Lesen mit
  `quellenEinsetzen`, Live, Merker; 2.4).
- **Welle A** (je braucht M5):
  - **M6.1 Bild Stufe 1 vollständig.** Legt an `studio-bild/src/{welt,ampel}.ts`,
    `effekte/{kontaktschatten,bodenschatten,beinschattierung,dithering,linien,staub}.ts`, `apps/studio/scripts/proben/m6-effekte.mjs`
    (gebackene Felder und Kreise kamen in M1.4). Tests (Bildtests mit Playwright, 5.1 Nr. 2): Bildvergleich an Ausschnitten; unter 100
    WebGL-Aufrufe; Kontextverlust ergibt dasselbe Bild; ohne Datensatz mit Herkunft „dein“ fallen Kontakt- und Bodenschatten nur auf Welt
    und Dinge ohne `wieGezeichnet`, mit einem solchen auch auf das Teil („nurFlorian“, Befund 9); die Beinschattierung („bewegung“) ist
    in Ruhe null.
  - **M6.2 Spiel-App und Live.** Legt an `apps/ozzy-spiel/src/{main,laden,eingabe,huelle,live}.ts` (zusammen höchstens 300 Zeilen);
    ändert `apps/ozzy-spiel/vite.config.ts` (`spielPlugins`: Lesen mit `quellenEinsetzen`, Live, Merker; Befund 2, 27); das Spiel lädt
    beim Start über seinen Server; legt an `apps/studio/src/speichern/live.ts`. Tests: `keinSpielcode.test.ts`; eine Änderung im Editor
    erscheint im Spiel in unter 0,5 s (`e2e/live.spec.ts`, zwei Seiten auf dem Server-Paar `STUDIO_PORT` → `SPIEL_PORT`, grün im
    Zusammenbau); `Laufzeit` mit `editor: true` und mit `editor: false` liefert für Ozzy von 0° bis 360° in 0,5° bitgleiche Anker
    (Befund 2); das Spiel auf `SPIEL_PORT` (Standard 5292) und der Editor auf `STUDIO_PORT` (Standard 5291) liefern aus derselben Kopie
    des Inhalts für Ozzy von 0° bis 360° in 0,5° dieselben Anker (Ladeweg mit `quellenEinsetzen`); das Spiel lädt dieselben Dateien ohne
    `vorlagen/*.svg` und `laeufe/`.
  - **M6.3 Korrekturformen und Anfasser.** Legt an `studio-laufzeit/src/knochen/korrektur.ts`, `apps/studio/src/buehne/geltungsChip.ts`;
    ändert `form/zusatz.ts`, `editor/zielregel.ts`, `buehne/anfasser.ts`. Tests: eine Korrektur am Kniewinkel dreht mit dem Bein; die
    Kette am Schwanz löst seine Korrektur am Sehnenwinkel aus (Konzept 3.1, Befund 18); Korrekturen liegen im mitlaufenden Rahmen, ein
    Bezugsrahmen für alle (Befund 12; der Test zweier Bezugsrahmen entfällt).
- **Welle B:**
  - **M6.4 Strecke und Dinge.** Legt an `apps/studio/src/leiste/strecke.ts`; ändert `befehle/welt.ts` (Strecke: Ding ziehen) und
    `tools/studio-inhalt/src/spielwiese.ts` (Steinchen, Stamm, Buckel, Gangfeld nachgestellt, Kehrtwende). **Braucht** M6.1, M6.3.
- **M6.Z:** Stände beider Apps; Registerlisten (Effekte); Inhalt laufen lassen; `erweiterung.test.ts` für Effekte; Probe B10 vorbereitet
  (`scripts/proben/m6-iphone.mjs`).
- **Probe (a) automatisch:** (1) Die Spielwiese läuft 60 s im Spiel (5292, WebKit) mit Eingaben aus einer Lauf-Datei: oben halten,
  Schritt, Trab, Galopp, grobes Rucken → Stolpern, Steinchen überlaufen, Stamm übersprungen; die Ohren stehen nach dem Schubsen exakt
  wie gezeichnet. (2) Ein Merker aus dem Spiel läuft im Editor mit derselben Prüfsumme nach 600 Takten nach (Chromium und WebKit).
  (3) Messseite, Block 3 (Spielwiese) und Block 4, am Mac, umgerechnet: ein Hinweis, keine iPhone-Messung. (4) Bilder `m6-korrektur.png` (Knie mit und
  ohne Korrekturform) und `m6-effekte.png` (die hier gebauten Effekte, Staub, Bodenschatten, Dithering, Linien, Beinschattierung, an
  einer Testfigur vorher und nachher, gleiche Ansicht; Befund 22).
- **Probe (b):** B10 (Spielwiese auf dem iPhone 16 aus dem festen Stand auf 5261, 60 s, Florian und Nicole; Merker-Knopf; Messseite mit
  der Spielwiese auf dem iPhone; die beiden Bilder). Vorläufig: ein Hügel mit drei Runden (A16); auf Ozzy nur die erlaubten Effekte,
  Schatten auf Boden und Welt, auf ihn nur, wenn er sie selbst anschaltet (A7).
- **Rückfall** (9.2): Tempo rot (am Mac umgerechnet: Hinweis; am iPhone: Messung) → Maßnahmen aus 8.3 in ihrer Reihenfolge als nächste
  Welle. Prüfsumme über Geräte verschieden → Merker nur am selben Gerät, die Funktion benennen; der Editor wartet nicht.

### 5.10 M7 Morgenrunde

**Ziel.** Die Morgenrunde ist spielbar und mit Regeln, Drähten und Launen gebaut; Text ist eine Figur; die Bedienprobe (S7, 14b L1 und
L2, Demo D1). **Braucht:** M1, M4, M5, M6.

- **M7.0 Vertrag:** ergänzt `vertrag/{bauplan,warum}.ts` (Logikplan, Kanäle nach 4.5, Ringpuffer der Entscheidungen), die Schemas von
  `ding`, `zone`, `zaehler` (Messwerte `einer`, `zehner`), `uhr`, `kamera`, `aufgaben` in `arten/bausteine.ts`, `TonPlaner` und
  `TonAusgabe`; installiert `opentype.js` ^2.0.0 wie in `apps/game` (nur für `apps/studio` und `tools/studio-inhalt`). Weil 2.0.0 keine
  Typen mitbringt und `@types/opentype.js` für die 1er-Reihe geschrieben ist, legt M7.0 je Paket eine kleine Deklarationsdatei der
  benutzten Teile an (`opentype.d.ts`). Den Typ `Schrift` (3.2) gibt es seit M0. Erzwingt für `studio-ton`, dass DOM nur in
  `ausgabe.ts` und `freigabe.ts` vorkommt (2.1): eine eigene tsconfig ohne DOM über die übrigen Dateien, geprüft im Skript `typecheck`
  des Pakets.
- **Welle A** (je braucht M6):
  - **M7.1 Logik.** Legt an `logik/{postfach,regeln,baender,kanaele,launen,bedingungen,aktionen,gedaechtnis}.ts`; ändert
    `bauplan/logik.ts` (Regeln, Kanäle) und `editor/handgriffe/logik.ts` (der Rest, 4.7). Tests: alle Regeln lesen den Stand von n−1;
    Folgen erst im nächsten Takt; höheres Band gewinnt nur seine Kanäle; Kanal-Grundwert nach 4.5 (Regler samt Draht und Hand, sonst die
    Zahl; Posen-Kanal); Rückweg an Schwellen; Laune nie ohne Ankündigung, nie zwei zugleich, Ruhezeit und Launenpause 4 s; Gedächtnis
    je Regel und Ding; eine neue Regel ändert die Würfe der anderen nicht.
  - **M7.2 Bausteine der Welt.** Legt an `bausteine/{ding,zone,zaehler,uhr,kamera,aufgaben}.ts`. Tests: Zone mit Rand-Hysterese;
    Zähler-Ereignisse und Messwerte `einer`, `zehner`; Uhr in Takten; `aufgaben` führt die fünf Vorlagen (mal, ohne, während, vor,
    erreicht) und stellt Haken über Regler (Befund 7).
  - **M7.3 Ton, erste Stufe.** Legt an `studio-ton/src/{planer,stimmen,synth,ausgabe,freigabe,wachhund}.ts`,
    `tools/studio-inhalt/src/klaenge.ts` (Tapp je Material, Plumps in drei Stärken, Rumpeln; synthetisch, als `.m4a` über `ffmpeg`). Tests:
    Planer ohne DOM (Streuung, Mindestabstand, Stimmen, nicht die letzten zwei wiederholen); Freigabe beim Loslassen der ersten Berührung.
  - **M7.6 Text als Figur** (Befund 7). Legt an `studio-format/src/schrift.ts` (`schriftAusKonturen`), `tools/studio-inhalt/src/glyphen.ts`
    (liest `assets/fonts/lobster/Lobster-Regular.ttf` mit opentype.js und schreibt die Glyphentabelle über die Ablage),
    `apps/studio/src/text/schriftLesen.ts`, `apps/studio/src/befehle/text.ts`, `studio-laufzeit/src/editor/handgriffe/text.ts`
    (`textSetzen`, `schriftAnlegen`). `textSetzen` legt aus einer Zeichenfolge eine Figur an: je Kontur ein Teil, äußere in der
    Textfarbe, Innenräume (o, e, a …) in der Grundfarbe darüber (Standard Papier); Laufweiten und Unterschneidung aus der Tabelle;
    wechselnde Zahlen sind Ziffern-Figuren (zehn Teile mit Wechseln an einem Regler, Drähte von `zaehler`). Tests: quadratisch → kubisch
    exakt (Kurvenpunkte auf 1e-9); Innenräume erkannt; ein Wort in Lobster als Bild gegen die Schrift; die Ziffern-Figur wechselt hart an
    jeder ganzen Zahl.
- **Verdrahtung nach Welle A:** `fassade.ts` (Schritte 2 und 3; Schritt 5 läuft seit M1), `bauplan/bauen.ts` (Logik), Registerliste der
  Bausteine, `befehle/alle.ts` (Text).
- **Welle B:**
  - **M7.4 Linse Spiel.** Legt an `apps/studio/src/spiel/{spielen,stellenWahl,drahtZiehen,kennlinie,gedankenblase}.ts`,
    `eigenschaften/{Regel,Baender}.tsx`, `befehle/spiel.ts` (Befehle der Handgriffe aus M7.1); ändert `leiste/mitschnitt.ts` und
    `befehle/{welt,logik}.ts` (die Gesten der Linse Spiel: Stutzen ziehen, Ding auf dem Rand ziehen). Tests (grün im Zusammenbau, 5.1
    Nr. 2): `e2e/spiel.spec.ts` (Draht ziehen,
    Satz füllen durch Tippen und Hineinziehen einer Posenkarte, Regel in ein anderes Band ziehen, Anhalten zeigt die Stellen-Wahl mit dem
    laufenden Übergang vorgewählt). **Braucht** M7.1, M7.2.
  - **M7.5 Inhalt der Morgenrunde.** Legt an `tools/studio-inhalt/src/morgen.ts`; schreibt `szenen/morgen.json` (6.4): Rahmen, Kamera und
    Musik als Figuren ohne Teile, die Uhr als Baustein am Rahmen, der Aufgabenzettel als Pose „Zettel“ des Rahmens mit Text-Figuren.
    **Braucht** M7.1, M7.2, M7.3, M7.6.
- **M7.Z:** `main.ts`, `befehle/alle.ts`, Ton im Spiel und im Editor; Inhalt laufen lassen (Klänge, Glyphen, Morgen); Probe-Projekt `bedienprobe` (Kopie ohne die Pose „Nasen-Pflug“, ohne den Übergang aus „Schnüffeln“ und ohne die zweite
  Duftstelle; Befund 26); `scripts/proben/m7-morgen.mjs`; `erweiterung.test.ts` für Bausteine.
- **Probe (a) automatisch:** (1) Die Morgenrunde läuft aus einer Lauf-Datei bis ins Körbchen, mit gleicher Prüfsumme in Node, Chromium
  und WebKit. (2) Bild `m7-regeln.png`: die Regeln der Morgenrunde mit Leuchten. (3) Handgriff-Test: Jeder Handgriff, den `morgen.ts`
  ruft, ist ein Befehl. (4) Ort-Probe in der Linse Spiel.
- **Probe (b):** B11 (Nicole spielt die Morgenrunde ohne Erklärung, höchstens drei Versuche), B12 (Bedienprobe im Probe-Projekt
  `bedienprobe`, Mac und iPad: Ohren beim Bergabgehen anlegen, die Pose „Nasen-Pflug“ anlegen und den Übergang aus „Schnüffeln“
  nachformen, den Schwanz nachschwingen lassen, eine zweite Duftstelle anlegen, die Stelle finden, an der die Nase beim Kopfdrehen
  rutscht). Vorläufig: Text als Figur (A11), kein Maul (A19), Katze, Zettel, Antippen (A21), Wörter (A22).
- **Rückfall** (9.2): Schafft Nicole es in drei Versuchen nicht (sobald ihr Ergebnis da ist) → Bremskraft 0,35 g und Radius 16 L, dann
  erneut. Scheitert B12 → Gegenprobe „zwei Modi“ (wie M4G) als nächste Welle, falls noch nicht gemacht.

### 5.11 M8 Pannen

**Ziel.** Stürze, Aufstehen je Lage, Abgang über den Rand und der Rückblick in der Laufzeit (Demo D2). **Braucht:** M2, M5, M7.

- **M8.0 Vertrag:** ergänzt `vertrag/{lauf,welt}.ts` (Ragdoll, gezeigte Werte im Mitschnitt) und das Schema der Bausteinart `rueckblick`.
- **Welle A** (je braucht M7):
  - **M8.1 Sturz, Aufstehen, Wurf.** Legt an `bausteine/vierbeiner/{sturz,aufstehen,wurf}.ts`, `studio-welt/src/ragdoll.ts` (aus den
    `glieder` des Körpermodells); ändert `bausteine/vierbeiner/{vierbeiner,zustaende}.ts`. Der Befehl „Wurf“ ist gebaut und in der Demo
    aus (A20); er liegt hier, weil er den Vierbeiner ändert. Tests: Spannung 100 → 30 % in 0,1 s; Ruhe erkannt; Lage richtig eingeordnet
    (Bauch, Seite, Rücken); kein Durchfallen; Ruhe ohne Zittern in 3 s.
  - **M8.2 Regie, Kamera, Abgang.** Legt an `posen/regie.ts`; ändert `bausteine/kamera.ts`. Tests: Regie-Übergang mit Spuren; Kamera
    folgt hinter den Rand.
  - **M8.3 Rückblick als Baustein** (Befund 7). Legt an `bausteine/rueckblick.ts` (spielt bis sechs gespeicherte Stürze der Runde über
    `auswerten` ab; gezeigt als Pose „Rückblick“ des Rahmens, gezeichnet von `studio-bild` wie alles); ändert `takt/mitschnitt.ts`
    (gezeigte Werte, rund 100 Zahlen je Takt) und `studio-bild/src/feldsaetze.ts` (bis sechs Geister). Tests: Der Rückblick spielt
    gespeicherte Werte mit denselben Ankern (Node) und bildgleich (Playwright, 5.1 Nr. 2).
  - **M8.4 Aufnahme.** Legt an `studio-laufzeit/src/editor/aufnehmen.ts`, `apps/studio/src/leiste/aufnahme.ts`; trägt den Befehl
    `aufnehmen` in `befehle/spiel.ts` ein (Mitschnitt: Halten → „aufnehmen“; Chip: Halten → „in Schlüssel“). Tests: Glätten und
    Ausdünnen; Ergebnis ist ein gestalteter Übergang mit Zwischenposen der Herkunft „Aufnahme“; „in Schlüssel“ am Chip.
- **Welle B:** **M8.5 Inhalt der Pannen** (`tools/studio-inhalt/src/pannen.ts`, 6.4; der Rückblick als Pose des Rahmens). **Braucht** M8.1
  bis M8.4.
- **M8.Z:** `fassade.ts`, `main.ts`, Registerlisten (Bausteine); Inhalt laufen lassen; `scripts/proben/m8-pannen.mjs`.
- **Probe (a) automatisch:** Aufnahme `m8-pannen.mp4`: drei Stürze in drei Lagen, jedes Aufstehen ohne Sprung in der Form (Sprungprobe);
  Abgang über den Rand mit Klang, Bild am Rand und Kamera-Stoß; ein Sturz als gestalteter Übergang aufgenommen. Der Rückblick mit sechs
  Geistern auf der Messseite (Block 3, Szene „Rückblick“) am Mac, umgerechnet: ein Hinweis. Kurze Aufnahme `m8-rueckwurf.mp4` mit dem Befehl
  „Wurf“.
- **Probe (b):** B13 (Pannen ansehen; der Rückblick mit sechs Geistern auf dem iPhone; so sähe der Rückwurf aus). Vorläufig: kein Rückwurf,
  Ozzy klettert selbst zurück (A20).
- **Rückfall** (9.2): Ragdoll unruhig nach dem Anderthalbfachen → Rapier für den Sturz hinter dem `WeltAdapter` prüfen (14a), Eintrag in
  die Liste. Rückblick über dem Budget → drei statt sechs Geister (8.3).

### 5.12 M9 Mittagsrunde

**Ziel.** Autorig mit der Katze, Gewichte mit Drehzentren und Pinsel, die Dinge des Mittags, „Warum?“ (S8, 14b L3). **Braucht:** M4, M7,
M8. Die Welle A läuft mit der Welle A von M10 in einem Workflow (F2).

- **M9.0 Vertrag:** ergänzt `vertrag/` (Gewichteplan, Autorig), `arten/bausteine.ts` (`schlaefer`, `flieger`), `arten/chips.ts`
  (`gelenk`, `lose`).
- **Welle A** (je braucht M8):
  - **M9.1 Autorig.** Legt an `studio-autorig/src/*` (2.2), `apps/studio/src/autorig/{autorig.worker,knopf,fragezeichen}.ts` (der Worker
    misst die Zeit, 30 b); ändert `werkzeuge/gelenkringe.ts` (Stecknadel an jeder Korrektur, Probewackeln). Tests: deterministisch; unter
    50 ms für Ozzy (im Worker gemessen; am Mac ein Hinweis); Gepinntes bleibt; der ganze Vorschlag ist ein Schritt; er legt das
    Körpermodell der Figur an (Hüllen, Federbeine mit Vorspannung, Glieder), auch für die Katze, wie für Ozzy (Befund 6), und liefert
    `gelenkePruefen` für den Prüfer (rechnet nie von selbst
    nach, Konzept 4).
  - **M9.2 Gewichte.** Legt an `studio-laufzeit/src/knochen/{gewichte,drehzentren,griffe}.ts` (`glaetteSchutz.ts` gibt es seit M5.4),
    `werkzeuge/gewichte.ts`
    (Pinsel W), `scripts/proben/{m9-bezugsrahmen,m9-bohne}.mjs`; ändert `knochen/aufhaengen.ts` (Drehzentren für gewichtete Teile und
    Biegeachsen, Befund 17) und `befehle/knochen.ts` (Taste W). Tests: Drehzentren halten das Gelenk voll; Griffe erben, glatt bleibt glatt; Griffsatz je Griffpaar exakt
    glatt; Glätte-Schutz nie an Ecken. Die Proben-Skripte rechnen „je Einfluss“ nur im Skript (Befund 12) und laufen an `testfigur.json`.
  - **M9.3 Dinge des Mittags.** Legt an `bausteine/{schlaefer,flieger}.ts`; ändert `bauplan/physik.ts` (Chips Gelenk und lose als Körper
    und Gelenke in Box2D). Tests: Weckschwelle, Scheu, Wippe ±18°.
  - **M9.4 „Warum?“ und Prüfer.** Legt an `logik/{warum,pruefer}.ts`, `eigenschaften/Warum.tsx`, `spiel/leuchten.ts`; ändert
    `eigenschaften/Pruefer.tsx` (aus M3.6). Tests: Sätze für Regler, Regeln und „Warum nicht?“; der Prüfer meldet Kreise, Sobald mit
    Dauerwirkung, Launen ohne Ankündigung, Aufgaben ohne Beweis, Klänge ohne Bild. (Gelenke, die nach einer Formänderung nicht mehr
    passen, meldet der Prüfer über `gelenkePruefen` aus M9.1; eingehängt in M9.Z.)
- **Welle B:** **M9.5 Katze und Mittag** (`tools/studio-inhalt/src/{katze,mittag}.ts`, `vorlagen/{katze,vogel,fisch}.svg`, 6.4).
  **Braucht** M9.1, M9.2, M9.3.
- **M9.Z:** Registerlisten, `fassade.ts`, `main.ts` (Linse Knochen mit Autorig; `gelenkePruefen` im Prüfer); Inhalt laufen lassen;
  `scripts/proben/m9-mittag.mjs`.
- **Probe (a) automatisch:** (1) Autorig an Ozzy ohne Teilnamen gegen die Daten der Übernahme (aus `ELTER` und `PARTNER`): alle Einträge
  getroffen, alle Kopfteile starr am Kopfknochen (Tabelle; 30 f). (2) Das Skript braucht für die Katze höchstens drei Ringzüge
  (gezählt); Aufnahme `m9-katze.mp4`; Vogel und Fisch laufen durch (Bild). (3) Bild `m9-bezugsrahmen.png`: ein gewichtetes Teil der Katze
  mit Korrektur, um 90° gebogen, mitlaufender Rahmen gegen „je Einfluss“ (Befund 12). (4) Video `m9-bohne.mp4`: die Bohne starr, mit
  Gewichten linear und mit Drehzentren, je im Purzeln und in der Rückenlage (Befund 18). (5) Ein absichtlich falsch sortiertes
  Regelpaar: „Warum?“ nennt die Regel, die verdrängt.
- **Probe (b):** B14 (die Katze selbst riggen mit „Knochen vorschlagen“, höchstens drei Ringzüge; Bohne; Bezugsrahmen; „Warum?“-Probe in
  unter zwei Minuten). Vorläufig: Bohne starr (A5), Autorig mit der Katze, Ozzys Knochen aus dem Prototyp (A9), Korrekturen drehen mit der
  Form (A10).
- **Abbruch** (9.2): Autorig trifft Ozzys Daten nach dem Anderthalbfachen nicht → Vorlage prüfen, berichten. Ozzys Rig ersetzt er nie
  ohne Vergleichsvideo und Florians Wort; Gewichte an der Bohne nur auf sein Wort.

### 5.13 M10 Abendrunde

**Ziel.** Regen, Nässe, Pfützen, Matsch, Müdigkeit, Aufgaben mit Beweisen, Tagebuch, Effekte für Momente (14b L4, Demo D3). **Braucht:**
M5, M6, M7 (nicht M9); Welle B dazu M9.5.

- **M10.0 Vertrag:** Schemas von `wasser` und `teilchen` in `arten/chips.ts`, die Effektarten der Etappe in `arten/effekte.ts`, je mit
  `aufGezeichnet` (die Effekte für Momente „nurFlorian“).
- **Welle A** (je braucht M7; ein Workflow mit M9 Welle A):
  - **M10.1 Wasser und Teilchen.** Legt an `physik/{wasser,teilchen}.ts`, `studio-bild/src/effekte/{wasser,spritzer,regen,kameraNass}.ts`.
    Tests: Pfütze in Ruhe exakt gezeichnet; 24 Säulen, 3 Hz; Teilchen ohne Rückwirkung.
  - **M10.2 Himmel und Tageszeit.** Legt an `effekte/himmel.ts`; ändert `bausteine/uhr.ts`. Tests: Verlauf mit Dithering ohne Stufen.
  - **M10.3 Aufgaben, Beweise, Tagebuch** (Befund 7). Legt an `studio-laufzeit/src/editor/beweise.ts` (spielt einen Beweis-Lauf ohne Bild
    und prüft die Aufgabe über den Baustein `aufgaben`), `apps/studio/src/spiel/aufgaben.ts` (Bedienfläche der Aufgaben mit Beweisen),
    `apps/studio/test/beweise.test.ts` (spielt alle Beweis-Läufe nach), `tools/studio-inhalt/src/tagebuch.ts` (Tagebuch als Pose des
    Rahmens mit Text- und Ziffern-Figuren). Tests: „gilt noch“ oder „ab 12,3 s anders“.
  - **M10.4 Effekte für Momente.** Legt an `studio-bild/src/effekte/{schmierbild,aufprallbild,zittern,bewegungslinien,verformung,
    schein,aufloesen}.ts`; an Teilen mit `wieGezeichnet` wirken sie nur mit Herkunft „dein“ (A7, 30 d). Tests: Shaderquellen (Node); jeder
    Effekt mit Stärke 0 ändert keinen Bildpunkt (Playwright, 5.1 Nr. 2).
- **Welle B:** **M10.5 Abend und alle Aufgaben** (`tools/studio-inhalt/src/abend.ts`, 6.4; Beweis-Läufe nach `laeufe/`). **Braucht** M10.1
  bis M10.4 und M9.5 (die Aufgaben des Mittags).
- **M10.Z:** Registerlisten, `fassade.ts`, `main.ts`; Inhalt laufen lassen; `scripts/proben/m10-abend.mjs`; **Erweiterungsprüfung am
  Diff** (Befund 28): Die neuen Arten (Chips `wasser`, `teilchen`; Effekte `wasser`, `spritzer`, `regen`, `kameraNass`, `himmel`) ändern
  nur ihre Dateien, ihre Schemas und je eine Registerzeile.
- **Probe (a) automatisch:** Bild `m10-effekte.png`: je Effekt vorher und nachher in derselben Ansicht (Pfütze ruhig und nach dem
  Platsch, Spritzer, Regen, Kamera nass, Matsch, Himmel von Morgen bis Nacht; die Effekte für Momente an einer Testfigur); nach einer
  Änderung am Sprung meldet Studio, welche Beweise noch gelten (Bild der Liste); `beweise.test.ts` grün; die Abendrunde läuft aus einer
  Lauf-Datei bis ins Körbchen.
- **Probe (b):** B15 (Nicole spielt die Abendrunde ohne Erklärung, höchstens drei Versuche bis ins Körbchen; `m10-effekte.png`).
  Vorläufig: Effekte für Momente erst hier und zuerst an einer Testfigur (A8); auf Ozzy nur die erlaubten (A7).
- **Rückfall** (9.2): Szene über dem Grafikbudget → Maßnahmen aus 8.3; die Brechung von „Kamera nass“ bleibt aus. Schafft Nicole es in
  drei Versuchen nicht → Bremskraft 0,35 g und Radius 16 L, dann erneut.

### 5.14 M11 Ton, App, großer Feinschliff

**Ziel.** Der ganze Tag mit Musik und Haptik auf dem iPhone 16; der große Feinschlifflauf über die ganze Liste; Florians Abnahme (S10,
Demo D5). **Braucht:** M0 bis M10.

- **M11.0 Vertrag:** Schema der Bausteinart `musik` in `arten/bausteine.ts`; Aktion `haptik` in der Hülle des Spiels; Abhängigkeiten
  `@capacitor/core`, `@capacitor/ios`, `@capacitor/haptics`, `@capacitor/cli` für `apps/ozzy-spiel` in den Versionen von `apps/game`
  (Capacitor wie der Arbeits-Track des Stack-Gates, ADR-0001).
- **Welle A** (je braucht M10):
  - **M11.1 Musik und Klang-Chips.** Legt an `studio-ton/src/musik.ts`, `studio-laufzeit/src/bausteine/musik.ts`,
    `tools/studio-inhalt/src/musik.ts` (einfache synthetische Stücke als Startinhalt; wer die Musik macht, kommt als offener Punkt in
    Teil C der Liste). Musik als Ding mit Posen: ein Stück je Runde, Schichten nach Gangart, Spannung bei knapper Kipp-Reserve, Stille
    beim Stehen, Stopp beim Plumps, Einsatz auf den ersten Schritt, Wechsel nur an Schlaggrenzen.
  - **M11.2 App-Hülle mit Netzregeln.** Ändert `apps/ozzy-spiel/src/huelle.ts` und `apps/ozzy-spiel/vite.config.ts` (CORS genau
    `capacitor://localhost`), legt `apps/ozzy-spiel/capacitor.config.ts` und das iOS-Projekt an (`NSAllowsLocalNetworking` in
    `Info.plist`; Live und Merker an `http://<Mac>.local:5261`; Befund 27); der eingebaute Inhalt der App (die Dateien aus
    `content/studio/ozzy/` mit eingesetzten fremden Quellen, ohne `vorlagen/*.svg` und `laeufe/`; 3.5 Nr. 7); Haptik über
    `@capacitor/haptics`; Einstellungen (zwei Daumen,
    Spieltempo 80 %, Zen-Runde, Bewegung reduzieren).
  - **M11.3 Export und Ampel.** Legt an `apps/studio/src/export/bildfolge.ts` (Bildfolgen und Sprite-Sheets, auch fürs Hauptspiel, A24);
    ändert `studio-bild/src/ampel.ts` (gemessene Faktoren statt Umrechnungsregel).
- **M11.4 Großer Feinschlifflauf** (Welle B und folgende; F1): über die ganze Liste, die Ergebnisse aus Teil A (was Florian gekippt
  hat), aus Teil B (seine, Nicoles und die Proben der Geräte) und alle Punkte aus Teil C. Je Punkt ein Paket mit Bild vorher und nachher
  in derselben Ansicht; so viele Wellen wie nötig, jede grün und committet. **Braucht** M11.1 bis M11.3 und die Ergebnisse, die bis
  dahin in der Liste stehen.
- **M11.Z:** Stände beider Apps und der App-Hülle, ganzer Lauf der Messseite am Mac (Hinweis), `scripts/proben/m11-tag.mjs`,
  Handgriff-Test; die Ding-Probe vorbereitet (Befund 14).
- **Probe (a) automatisch:** Der ganze Tag (drei Runden) läuft aus Lauf-Dateien in Chromium und WebKit; Stumm-Lauf: Jede der acht
  Pointen (Konzept 11.5) hat ein Bild, nicht nur einen Ton (abgehakte Liste); Messseite, Block 4, in Safari am Mac (Hinweis).
- **Probe (b):** B16 (der ganze Tag in der App auf dem iPhone 16, Aufnahme `m11-tag.mp4`; dieselbe Runde stumm; die Messseite in der
  App; Live und Merker über das Netz der App; in Studio ein neues kleines Ding samt Regel nur im Editor bauen). Danach sagt Florian
  „bestanden“ oder nennt, was fehlt.
- **Abbruch:** Was nach seiner Probe fehlt, kommt in Teil C und in einen weiteren Feinschlifflauf mit eigener Probe, kein stilles
  Weiterbauen.

---

## 6 Ozzy in Studio

### 6.1 Grundsatz

Ozzy kommt als Daten nach Studio, nie als Code (Konzept 2.3, Arbeitsregel 7). Das Werkzeug `tools/studio-uebernahme`
(`pnpm --filter @ee/studio-uebernahme uebernehmen`, läuft mit `tsx`) liest den Prototyp und seine `schluessel.json` in diesem Arbeitsbaum
(seinen lebenden Stand) und schreibt über Ablage und Store (Quelle `automatik`) nach `content/studio/ozzy/`, datensatzweise
zusammengeführt (F5, Befund 5): Es legt an oder ändert nur Datensätze mit Herkunft `gebaut` oder `vorlage` unter seinen Pfad-Kennungen
und legt Neues dazu; einen Datensatz mit Herkunft `dein` lässt es stehen, wie er ist, schreibt den Rest und meldet, was es stehen
gelassen oder ausgelassen hat (4.9; Prüfer-Hinweis im Editor, Zeile in Teil C). So bleibt es wiederholbar, auch wenn Florian in Studio
formt, und hält nie den Bau an. Bis zum Umzug (A1) ist seine `schluessel.json`
eine fremde Quelle (3.4); speichert er im Prototyp, startet der Server die Übernahme des Kopfs neu, und sie schreibt nur, wenn Werte
(`prototyp-werte.test.ts`) und Parität halten. Nach dem Umzug lässt jede Übernahme den Kopf aus (Vermerk `umgezogen`, 3.4). Gemessen
wird an Kurvenpunkten (3.5): Kopfdrehung in 0,5°-Schritten unter 0,001 (M1),
Haltungen an den Posen unter 0,001 (M4); dazu Videos nebeneinander für sein Auge (Teil B der Liste). Verfehlt die Parität des Kopfs,
ist das ein Baufehler (die Listen sind schon die des Prototyps); für die Haltungen gilt der Rückfall aus 9.2.

### 6.2 Ablauf der Übernahme

1. **Vorlagen und Quelle:** liest die neun SVGs aus `docs/look/ozzy-figur/vorlagen/` nach der Tabelle `ANSICHTEN` und kopiert sie nach
   `vorlagen/<hash>.svg` (Datensätze `Vorlage`). Liest `docs/look/ozzy-figur/schluessel.json` (nur lesen) und trägt sie als Quelle in
   `projekt.json` ein (`quellen`: Datei, Figur, Zuordnung Teilname → Bindung; Befund 5), außer `projekt.json` nennt sie unter
   `umgezogen`: Dann lässt die Übernahme die Quelle und den Kopf aus (die Kopfteile aus Schritt 3 und 7, die Schritte 5 und 6) und
   meldet es.
2. **Raster des Prototyps:** baut `importieren(texte)` und `new FigurRaster(daten, korrekturen)` zweimal, mit und ohne seine Schlüssel.
   Aus dem Raster mit seinen Schlüsseln kommen alle Listen, Anschluss- und Faltschlüssel; aus dem ohne seine Schlüssel nur die gebauten
   Schlüssel der Art `form`, die neben seinen ruhen (sie bleiben als Datensätze erhalten und mischen nicht, 4.4 „Ruhen“). Felder und Methoden der
   Klasse liest das Werkzeug über `Reflect.get`; modul-private Werte (`WICKEL`, `GESICHT_WEG`, `NASE_WEG`, `FALTEN_COS` und die übrigen)
   kommen aus `prototyp-werte.ts` (Befund 20). Vor jedem Lauf läuft `prototyp-werte.test.ts`; scheitert er, schreibt sie nichts. Der
   Prototyp wird nicht geändert.
3. **Teile:** je `TeilName` ein Teil mit stabiler Kennung (`kennungAusPfad('teil', 'ozzy/teil/<name>')`), Name aus `NAMEN` (über
   `prototyp-werte.ts`) und einer Tabelle des Werkzeugs („Bohne“, „Bein rechts vorn“, „Fenster links vorn“), Farbe nach `WEISS`, Ebene
   nach der Malreihenfolge des Logos, Partner nach `PARTNER` und `PARTNER_KOPF`, Rolle und Seite aus
   `studio-format/pruefdaten/ozzy-rollen.json`; an jedem Teil `wieGezeichnet: true` (30 d).
4. **Regler:** Kopf θ (Kreis 0 bis 360, Standard 0, Raster 0,5, Höchsttempo 160, Spiegelregel ab 180 um 360 mit Achse und Paaren aus
   `kopfGespiegelt`, Umnummerierung der Nase aus `NASE_SPIEGEL`, beide über `prototyp-werte.ts`, Reihenfolge tauschen); Körper ψ (Linie
   −90 bis 90, Standard 90, Spiegelregel ab −90 um 0: links gespiegelt; `Spiegelregel.regler`: θ um 360, Nicken um 0 (Schritt 6, ab
   M1) und Kopf schief um 0 (Schritt 6, ab M4.4); Befund 8). Spannung legt das Inhalt-Skript an (M5.6).
5. **Kopf:** je Kopfteil eine Bindung (Ansicht, `koordinaten`, nicht periodisch; A2, A3) mit den Listen des Prototyps als Abschnitten,
   genau wie dort (raster.ts:501–509, 787–792, 1033–1036). Die zweite Hälfte ist im Prototyp keine Spiegelung der ersten: Bei 180° steht
   der eigene Rücken, bei 360° die eigene Front jedes Teils, gespiegelte Schlüssel des Partners nur dazwischen; Rücken und Front sind
   nicht spiegelgleich (in der Prüfung gemessen bis 55 Einheiten Unterschied zu einer reinen Spiegelung). Darum: [0°, 90°] und
   [270°, 360°] mit der Liste aus `kopfVorn` (eigene Schlüssel bis 90°, der Anschluss als Stütze, die Einträge des Partners als
   `ListenEintrag.gespiegelt`, der eigene Frontschlüssel bei 360°, die Faltschlüssel dieser Liste); [90°, 270°] mit der Liste aus `kopf`
   (eigene Schlüssel bis 180° samt Rücken, dahinter die gespiegelten Einträge des Partners, der eigene Frontschlüssel bei 360°, die
   Faltschlüssel dieser Liste); seine Schlüssel stehen in den Listen wie im Prototyp (bis 90° in beiden, dahinter nur in der aus
   `kopf`, als gespiegelte Einträge ebenso beim Partner), mit den Kennungen aus `quellenEinsetzen` (3.4); Teile ohne Rücken haben für
   (180°, 270°) einen Abschnitt `gespiegelt` (Spiegel der Partnerbindung). Die Spiegelregel von θ wirkt hier nur auf Malreihenfolge
   (Tausch der Paare ab 180°), Wechsel und mitgespiegelte Regler, nie auf die Gestalt (3.2). Jeder gebaute Schlüssel mit Herkunft und Grund aus `schluesselUebersicht`; Faltschlüssel als Art `falte`, je Liste
   eigene. Seine Schlüssel (am 20.11. 16) schreibt die Übernahme nicht: Bis zum Umzug setzt sie der Server bei jedem Laden über die
   Migration `kern 0 → 1` mit Herkunft `dein` ein (3.4); für die Parität setzt die Übernahme sie ebenso im Speicher ein. Spitzenführung
   je Bindung als Liste: 45° bis 90° aus `spitzenFinden` und 270° bis 315° gespiegelt (Spitzen und Regel des Partners, Rahmen aus den
   gespiegelten Einträgen bei 270° und 315°, raster.ts:912–920); ob sie ruht, rechnet die Spitzenregel (4.4), nie die Datei. Die
   Kopfschlüssel bleiben in Kopf-Koordinaten wie im Prototyp (Ursprung Kopfmitte, Spiegelachse x = 0) und hängen starr am Kopfknochen.
6. **Kopf am Hals** (Befund 1): Knochen „Hals“ (Ruhelage im Ursprung des Körpers, Verschiebung über zwei Regler, Winkel-Regler
   „Halswinkel“, Linie −20° bis 20°, Standard 0) und Knochen „Kopf“ am Hals (Verschiebung über zwei Regler, Winkel-Regler „Nicken“,
   Linie −20° bis 20°, Standard 0; dorthin schreibt die Kopplung, 4.5), beide starr; ab M4.4 dazu „Kopf schief“ (Linie −15° bis 15°,
   Standard 0) als Formziel der Kopfteile mit gebauten Schlüsseln bei ±15° (um das Kopfgelenk gedreht; Florian formt nach). Alle mit
   Herkunft „gebaut“; in Ruhe (0) ändern sie nichts, die Parität bleibt. Die Regler der Verschiebungen (Halslage x, y und Kopfversatz
   x, y) haben die Einheit `'figur'` (3.2). Vier Drähte: θ → Kopfversatz x, y (Kennlinie aus den vier Stützstellen von
   `kopfVersatz`, PCHIP, Spiegel ab 180° um 360°, x negiert); ψ → Halslage x, y (Kennlinie aus `halsBei` in 0,5°-Schritten, PCHIP,
   Spiegel ab −90° um 0°, x negiert).
7. **Zeichenmodell:** Gruppen und Verbindungen aus `gruppeVon` und `FLUESSIG` (Bohne–Bein nach Kante); der Ohrspalt bleibt ein eigenes
   weißes Teil wie im Prototyp (`WEISS`, vorlagen/import.ts:20), keine Fuge (der Keil des Renderers ist dort aus, `ohrspalt: null`,
   raster.ts:1255); Klemmen der Fenster (Draht ψ → Rand), „hinter“ für das Schwanzweiß; Verdecken als Effekt mit Stärke 0 (aus wie heute,
   `REGELN`, szenen.ts:26; anschalten kann es nur er), Gewicht |sin 4θ| nur vorn; Dickenregel (Durchbruch) als Effekt mit Stärke 8,
   Gewicht |sin 4θ| vorn und |sin 2θ| hinten (raster.ts:1243–1254); beide Gewichte als Draht über θ mit Kennlinie in 1°-Schritten;
   Weiß nachgeben 8 (4.6); Wechsel der Malreihenfolge (Nase bei 140°, Fenster bei ψ 22,5° und 67,5°, Tausch der Paare ab 180°). Auf
   seinem Körper nur, was `aufGezeichnet` erlaubt (A7). Probe: Bild gleich dem Prototyp mit `REGELN`.
8. **Körper über ψ** (ab M4): Schlüssel 0°, 45°, 90° (über die Front wendet er, A4); Bohnenenden (`bohnenendenSetzen`) und Schwanzweiß
   (`SCHWANZ_WEISS` über `prototyp-werte.ts`) als gebackene Schlüssel alle 2,5° (Herkunft gebaut, Grund „Übernahme“).
9. **Haltungen** (M4): Knochen je Körperteil: Biegeachsen für die Beine mit den Werten aus `rueckgratBauen` samt Mindestradius `rMin`
   (aus `Haltungen.mitschreiben`) und für den Schwanz (aus dem starren Knochen des Prototyps wird eine Achse mit Biegung 0, die Parität
   an den Haltungen bleibt; Befund 18, A6); starr für Bohne (A5) und Kopf; Fenster, Keile und Schwanzweiß hängen wie in `ELTER` (über
   `prototyp-werte.ts`, haltung.ts:124–132) am Knochen ihres Elternteils: eine Aufhängung der Art `achse` an dessen Biegeachse
   (`knochen` [Achse, Eltern], w = 1), keine Anheftung; die Prüfung in `prototyp-werte.test.ts` an Sitzen und Liegen bleibt. Die
   Verkürzung eines Beins zur Kamera (`KAMERA_SCHWELLE`, `KURZ_WEG`, `KURZ_BREIT`) wirkt im Prototyp nur bei freien Mischungen, an den
   fünf Haltungen nicht; Studio mischt Reglerwerte statt Richtungen und übernimmt sie nicht (die Werte stehen in `prototyp-werte.ts`,
   der Test prüft `kurz` = 1 an den Haltungen); Posen Stehen, Hocke, Sitzen, Liegen,
   Diener in der Schicht Körper, die mit `jede → jede` angelegt wird; Korrekturen als Posenkorrekturen, die des Schwanzes ebenso; die
   Abhängigkeit vom Kopfwinkel (Reihe vorn und Profil) als `Pose.kreuz` und Kreuzschlüssel; fehlende Teile ziehen sich über eine
   Zusatzform auf einen Punkt zurück und werden per Wechsel unsichtbar; `weg()` wird „über X“. Die Haltungen gibt es nur bei ψ = 90°;
   andere Posen bekommen eine Vorderansicht erst, wenn Florian eine Zeichnung auf „Körper 0°“ fallen lässt (Befund 8).
10. **Abläufe** (M4): die acht `ABLAEUFE` als gestaltete Übergänge (Abschnitte mit Ziel, Dauer, Kurve; Hüpfer, Plumps, Seufzer, Wedeln
    als Zusatzbewegungen; `steht` als Balken); die Stauchung als Regler mit gebauten Schlüsseln, die Florian nachformen kann; das
    Nachfedern des Kopfs bleibt Teil von Plumps und Seufzer (die Formeln `aufprall` und `seufzer` liefern Stauchung und Kopf zugleich,
    ablauf.ts:156–168, wörtlich übernommen); der Chip „Ruhig halten“ wirkt nur in der Physik des Spiels, sonst federte der Kopf doppelt.
11. **Schreiben** über Ablage und Store mit dem deterministischen Schreiber, datensatzweise (6.1); ein zweiter Lauf ändert kein Byte.

### 6.3 Seine Dateien bleiben unberührt

- `docs/look/ozzy-figur/schluessel.json` und die SVGs liest Studio direkt aus diesem Arbeitsbaum (immer sein aktueller Stand), nie eine
  Kopie; geschrieben werden sie nie, kein Schreibweg eines Studio-Servers zeigt dorthin. Sein Prototyp (`apps/editor/`) wird nie
  geändert. Der Vergleichsserver auf 5294 hat keinen Schreibweg: eigene Konfiguration (`tools/studio-uebernahme/vergleich.vite.config.ts`:
  Wurzel `apps/editor`, Zwischenspeicher `test-results/vergleich/vite`, ohne die Ablagen des Prototyps), und jede Probe auf 5294 leitet
  `**/__ozzy-figur/schluessel` mit `page.route` um: GET liefert seine Datei, nur gelesen; jedes PUT wird verworfen (bis zum 20.11. leerte
  eine Probe des Prototyps seine Datei, siehe den Kopf von `werkzeug-probe.mjs`).
- Die Übernahme und die Inhalt-Skripte schreiben nur über die Ablage und die Schutzregel des Stores, datensatzweise (6.1); Datensätze
  mit Herkunft `dein` lassen sie stehen und schreiben den Rest (4.9). Seine Kopfdrehung wird nur auf sein Wort zur Wahrheit in Studio (Befehl
  „Kopfdrehung übernehmen“, A1).
- Florians Studio auf 5217 schreibt über die Ablage nach `content/studio/` (Revision je Datei), sein Spiel-Server auf 5261 nur Merker
  nach `laeufe/`; Bau-Server, Proben und Tests arbeiten immer auf einer Kopie (ohne `STUDIO_INHALT` von selbst, 2.4). Jedes Speichern
  legt die vorige Fassung in den Sicherungsring (die letzten 50 je Datei, dazu eine Woche lang je Stunde eine; nicht im Git); verdrängte
  Fassungen liegen als eigene Dateien daneben (3.1); dazu das Journal je Gerät.
- **Commits seines Stands** (F5): Vor jedem Lauf eines Skripts committet die Integration den Stand von `content/studio/` als „Florians
  Stand in Studio“ (falls geändert), nach dem Lauf als „Studio-Inhalt M<n>“; am Etappenende wieder „Florians Stand in Studio“ (falls
  geändert), immer getrennt vom Code.
- **Schutz über den Schreibweg** (`apps/studio/scripts/proben/schutz.mjs`), nicht über Prüfsummen: Seine Dateien sind lebendig (er
  speichert im Prototyp 300 ms nach jeder Änderung und formt auf 5217); eine Prüfsumme vor und nach einer Probe könnte seine Arbeit nicht
  von einem Fehler des Baus unterscheiden. Jeder eigene Prozess (Proben, Übernahme, Inhalt-Skripte, Bau-, Probe-, Playwright- und
  Vergleichsserver, auch der Kindprozess der Übernahme, den sein Studio auf 5217 startet, mit absolutem Pfad und
  `STUDIO_INHALT=content/studio`) läuft mit dem Schreibhaken (`NODE_OPTIONS=--import=<absoluter Pfad>/schutz.mjs`, 2.4). Wie er
  hineinkommt: Die Wurzel-Skripte `studio:bau`, `studio:stand` und `studio:pruefen` und die Paket-Skripte `dev` (beide Apps),
  `vergleich`, `uebernehmen`, `inhalt` und `probeprojekt` setzen `NODE_OPTIONS` selbst; `playwright.config.ts` beider Apps gibt ihn
  ihrem Server mit; jede `vitest.config.ts` der Studio-Pakete setzt `pool: 'forks'` und
  `execArgv: ['--import=<file-URL von schutz.mjs>']`, gleich wie vitest gestartet wird (Paket, Wurzel, `studio:pruefen`). Nur
  `pnpm studio` und `pnpm gassirunde` (Florians Server) laufen ohne ihn (2.4). Er umhüllt die Schreibfunktionen von `node:fs` und
  `node:fs/promises` (danach `syncBuiltinESMExports()`, damit auch benannte ESM-Importe die Hülle sehen) und verweigert jeden
  Schreibversuch unter `docs/look/ozzy-figur/`, `apps/editor/` und `content/studio/` (letzteres, solange `STUDIO_INHALT` nicht
  ausdrücklich `content/studio` nennt): Er wirft einen Fehler (`EPERM`), geschrieben wird nichts, die Meldung (Pfad, Zeit, Prozess) steht
  auf stderr und in `test-results/schutz/meldungen.log`. Verglichen wird auf echten Pfaden (Verknüpfungen aufgelöst, am Mac ohne
  Unterschied zwischen Groß- und Kleinschreibung); verweigert werden auch Löschen und Umbenennen eines Elternordners der geschützten
  Ordner, `cp` in einen Elternordner, wenn die Quelle hineinschreiben würde, und harte Verknüpfungen auf seine Dateien.
  `STUDIO_SCHUTZ_ZUSAETZLICH` (absolute Pfade, getrennt durch „:“) schützt weitere Ordner, etwa für Proben des Hakens, und nimmt nie
  einen Schutz weg; `globalThis[Symbol.for('studio.schutz')]` zeigt, ob der Haken in einem Prozess aktiv ist. Grenzen: Was nicht über
  Node schreibt (rolldown und esbuild in Vite, die Browser, git), sieht er nicht; deshalb hat der Vergleichsserver einen eigenen
  Zwischenspeicher, und kein Werkzeug bekommt einen Pfad unter `apps/editor/` als Ausgabe. Er wirkt im Hauptthread und in Kindprozessen
  (sie erben `NODE_OPTIONS`), nicht in Worker-Threads von Node: Ein Worker hat eigene Funktionen von `fs` und schreibt an der Hülle
  vorbei, auch mit `execArgv: ['--import=…/schutz.mjs']` (am 20.11. geprüft). Deshalb nimmt Studio-Code keine Worker-Threads
  (`node:worker_threads`), und vitest läuft in Kindprozessen (`forks`, nie `threads` oder `vmThreads`); beides prüft `grenzen.test.ts`
  (2.3 Nr. 6). Für seine Datensätze `dein` zählt nur ein Schreiben der Ablage mit Quelle ≠ `florian`; die Ablage
  schreibt dafür die Quelle jedes Schreibens ins Protokoll. Änderungen aus anderen Prozessen (sein Prototyp, sein Studio, andere Stränge) sind seine Arbeit und lösen nichts aus. Nur
  in den Läufen der Integration (`STUDIO_INHALT=content/studio`) legt `schutz.mjs` vor Übernahme, Inhalt und Proben eine Kopie seiner
  `schluessel.json` nach `content/studio/.sicherung/fremd/`, und nur, wenn sie sich seit der letzten Kopie geändert hat (Vergleich über
  SHA-256) und `content/studio/.gitignore` den Ordner `.sicherung/` ausnimmt (sonst ein Hinweis statt der Kopie, damit der Ring nicht
  ins Git gerät); ausgedünnt wie der Sicherungsring (die letzten 50, dazu eine Woche lang je Stunde eine). Bau-Agenten und alle anderen
  Prozesse schreiben nie in Florians Inhaltsordner, auch keine Kopie.
  Meldet der Haken etwas, hält der Lauf an (geschrieben wurde nichts); zurückgesetzt wird nie automatisch (9.2 Nr. 5). Proben lesen nach
  jedem Lauf `test-results/schutz/meldungen.log`; leer heißt: nichts verweigert.

### 6.4 Was ich für die Demo selbst anlege

Alles mit `tools/studio-inhalt` über die Handgriffe (4.7), also so, wie Florian es von Hand könnte (der Handgriff-Test prüft, dass jeder
gerufene Handgriff ein Befehl ist); Herkunft `gebaut`, stabile Kennungen, idempotent, über Ablage und Store datensatzweise
zusammengeführt (F5). Datensätze, die Florian geändert hat (`dein`), fasst ein Skript nie an: Es lässt sie stehen, schreibt den Rest
und meldet, was es stehen gelassen oder ausgelassen hat (4.9). Teilnamen sind hier erlaubt (F6). Der Look ist zweitrangig; Florian formt nach. Werte ohne Quelle
sind Startwerte aus Konzept 11.7. Probe-Projekte legt `probeprojekte.ts` an (Befund 26). Commits nach 6.3.

| Etappe | Inhalt |
|---|---|
| M5, M6 Spielwiese | Hügel (Weltpfad, Radius 14 L, Schwerkraft 20 L/s², Radgewicht 5 ×, Griff 4 Hz), Steinchen, Stamm, Buckel; Gangfeld Schritt, Trab, Galopp mit je vier Kontaktposen; Bremsen, Kante; Feld Balance (Kippen × Wackeln, fünf Schlüssel); Sprung (Ausholen, Strecken, Flug, Landung); Kehrtwende über die Front (A4); Zyklen Atmen 0,3 Hz (angelegt, nicht als Verweilen von Stehen, A28), Wedeln 3 Hz; Chips Ohren (0,4 s, 65 %, Schwerkraft 30 %), Bart (0,25 s, 55 %), Kette am Schwanz (innen sechs Glieder, schreibt in die drei Regler seiner Achse; 0,5 s, 70 %), Stauchen (0,2 s, 50 %), Ruhig halten am Kopf (0,17 s, 0 %); Vierbeiner (Bremskraft 0,3 g, Sprunghöhe 0,5 L, Mut 0,5, tollpatschig 0,3 über den Regler `charakter.tollpatschig`, `wendenNach` 0,3 s, `springenAufTippen` aus); Ozzys Körpermodell (`koerper`, `federbeine` mit Vorspannung, `glieder`; Befund 6, M5.6); Regler Spannung (Standard 1); Drähte Hang → Wunschtempo (Kennlinie aus Konzept 6.3), Weg → Phase, Tempo → Zeile, Kipp-Reserve → Balance (die Drähte über θ zu Verdecken und Dickenregel legt die Übernahme an, 6.2 Nr. 7) |
| M7 Morgen | Körbchen, zwei Duftstellen, Graben mit Brett, Steinchen; Posen eingerollt, Schnüffeln, Nasen-Pflug, Anlauf nehmen; Übergänge Aufwachen, Einkringeln (zwei Kehrtwenden über die Front), Schnüffeln, Nasen-Pflug; Zyklen Schnüffeln 6 Hz, Schlafatmen 0,2 Hz, Hinterteil wackeln 2,5 Hz; Regeln und Launen der Morgenrunde (Konzept 11.7); Rahmen, Kamera und Musik als Figuren ohne Teile, die Uhr (120 s) als Baustein am Rahmen, der Aufgabenzettel als Pose „Zettel“ des Rahmens mit Text-Figuren in Lobster (A11); Glyphentabelle aus Lobster; Klänge Tapp, Plumps, Rumpeln |
| M8 Pannen | Posen Stolpern 1 bis 3, Purzeln, Seitenlage, Rückenlage, Bauchrutscher, Klettern am Rand; Übergänge Stolpern, Fangen, Sturz („bis Ruhe“), Aufstehen aus Bauch, Seite, Rücken, Schütteln (4,5 Hz), Blick in die Kamera (die Front des Kopfs: sein Logo); Sterne; Andenken; Regie-Übergänge Abgang und Ankunft; Strampeln 3 Hz; der Rückblick als Pose „Rückblick“ des Rahmens |
| M9 Mittag | Katze (eigene einfache SVG im Stil Ozzys, mit dem Autorig gerigged; Posen eingerollt, Ohr zuckt, Buckel, Fauchen, Absprung, Flug; Schlafatmen 0,25 Hz), Schmetterling (Flügel 8 Hz), Ball, Wurst, Wippe; Launen Jagen, Angst, Gier; Jagdsprung, Schrecksprung, Ducken, Schnappen, Kauen 3 Hz; Vogel und Fisch nur als Probe des Autorigs |
| M10 Abend | Pfützen, Matsch, Regen, Himmel (Morgen, Mittag, Abend, Nacht); Posen Spagat, Spielverbeugung; Launen Müde, Flitzen, Sturkopf mit Popo-Rutschen; alle neun Aufgaben mit Beweis-Läufen; Tagebuch als Pose „Tagebuch“ des Rahmens mit Text- und Ziffern-Figuren (M10.3) |
| M11 Ton | ein Musikstück je Runde mit Schichten nach Gangart; Klänge für Fiep, Gähnen, Niesen, Seufzer, Schmatz, Schnarchen |

Kein Maul (A19), kein Weg des Körpers von 90° bis 180° (A4), auf Ozzys Körper nur die erlaubten Effekte: Verschmelzen, Dickenregel,
Kantenglättung mit Spitzenregel, Weiß nachgeben und die Beinschattierung in Bewegung; Schatten fallen auf Boden und Welt, auf ihn nur,
wenn er sie dort selbst anschaltet („nurFlorian“; Konzept 7, A7).

---

## 7 Teststrategie

### 7.1 Ebenen

| Ebene | Werkzeug | prüft | läuft |
|---|---|---|---|
| Einheit | vitest 5 je Paket | jede Funktion an Hand gerechneten Fällen | jede Änderung |
| Eigenschaften | fast-check | die Regeln aus 7.2 an zufälligen Eingaben | jede Änderung |
| Parität | vitest in `tools/studio-uebernahme` | Kopfdrehung und Haltungen gegen den Prototyp, an Kurvenpunkten (3.5); `prototyp-werte.test.ts` am Verhalten | M1, M4, jede Änderung an `form/` oder `knochen/`, vor jedem Lauf der Übernahme |
| Determinismus | vitest (Node) und Playwright (`pruefen.html`, Chromium, WebKit); im echten Safari über WebDriverIO mit safaridriver, sobald Florian es eingeschaltet hat (B6) | `rechnenSelbsttest`, Prüfsumme je Takt über 1 200 Takte, alle Lauf-Dateien | jede Änderung an rechnen, laufzeit, welt |
| Vertrag | `studio-welt/src/vertrag.test.ts` | Box2D-Adapter und Attrappe mit derselben Testreihe | jede Vertragsänderung |
| Abläufe | Playwright 1.63 mit gesteuerter Uhr | Bedienung nach den vier Verben: Ziehen, Stift, ⌘Z, Speichern, zwei Geräte, Leiste, Posen, Spiel | nach jeder Welle mit Oberfläche |
| Ort-Probe | Playwright mit echten Zeigerereignissen (Maus, Stift), auf einer Kopie | 200 Züge: die Vorschau nennt genau die Datensätze, die sich ändern (Befund 10) | ab M3.Z bei jeder Änderung an Werkzeugen oder Zielregel |
| Handgriffe | `apps/studio/test/handgriffe.test.ts` | jeder Handgriff ist ein Befehl mit Geste oder Taste; jeder, den `tools/studio-inhalt` ruft, ist darunter (Befund 14) | ab M3, wächst mit |
| Erweiterung | `apps/studio/test/erweiterung.test.ts`; am Diff in M10.Z | eine Test-Art je Familie ohne weiteren Code (Befund 28) | ab M4 (Zusatzbewegungen), M5 (Chips), M6 (Effekte), M7 (Bausteine) |
| Bild | Playwright, Ausschnitte; Bildtests der Bildpakete als Specs in `apps/studio/e2e/bild/` auf eigenen Prüfseiten (5.1 Nr. 2) | gegen freigegebene Bilder in `apps/studio/e2e/bilder/` (am Mac erzeugt, nur dort gültig); WebGL2 nur im Browser, nie in vitest | Etappenende; Bildtests eines Pakets im Zusammenbau seiner Welle |
| Speicher | vitest in Node mit `--expose-gc` | kein Zuwachs über 10 000 Bilder | nach jeder Welle |
| Grenzen, Lizenzen | `test/grenzen.test.ts`; `pnpm licenses list --json`, nur über die Studio-Pakete (`--filter`), mit Erlaubnisliste genau MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, BSL-1.0, Zlib (`ERLAUBT` in `scripts/studio-pruefen.mjs`); ein ODER-Ausdruck gilt, wenn eine Wahl erlaubt ist; Ausnahmen je Paket, gebunden an seine heutige Lizenz und mit Grund (`AUSNAHMEN`), alle nur Werkzeug und nie ausgeliefert: `css-value` (ohne Lizenzfeld) und `@promptbook/utils` (CC-BY-4.0, über `locate-app`), beide über `webdriverio`, nur Prüfwerkzeug am Mac; `glob`, `minimatch`, `minipass`, `path-scurry`, `lru-cache`, `@isaacs/nonrecursive-glob-match` (BlueOak-1.0.0), nur über `webdriverio`; `lightningcss` samt seinen Plattformpaketen (MPL-2.0), mit Vite 8, nur Bau und Entwicklungsserver | 2.3; keine AGPL, keine GPL ohne erlaubte Wahl, keine Spine-Lizenz | jede Änderung; Lizenzen nach jeder Welle |
| Beweis-Läufe | `test/beweise.test.ts` | jede Aufgabe gilt noch | ab M10 bei jeder Änderung am Inhalt |

Kein Test ersetzt Florians Auge. Tests messen nie die Wanduhr; sie zählen Takte und Bilder.

### 7.2 Eigenschaften (fast-check)

- **Exakt an Schlüsseln:** jede Mischart trifft jeden Schlüssel auf 1e-9.
- **Kein Sprung:** in Übergängen, bei zufälligen Folgen von Anforderungen und beim Spulen bewegt sich kein Anker je 1/240 s weiter als das
  Vierfache seines mittleren Schritts; Bildprobe mit zwei Schrittweiten (1/240 s, 1/4000 s), 0 umklappende Bildpunkte (|Δ| > 128).
- **Glatt bleibt glatt:** an glatten Ankern liegen Ein- und Aus-Griff nach jeder Stufe der Rechenkette auf 1e-9 gegenüber.
- **Ruhe = Zeichnung:** nach dem Ausschwingen weicht kein Anker mehr als 1e-6 von der Pose ab.
- **Rückrechnung:** der gezogene Punkt liegt auf 1e-6 am Ziel, kein gespeicherter Schlüssel an einer anderen Stelle ändert sich (4.7);
  **Ort-Probe:** ein Zug an Stelle S ändert nur Datensätze von S.
- **Rückgängig exakt:** tun und zurück ergibt dieselben Datensätze; tun, zurück, wieder ergibt dieselben wie tun.
- **Inkrementell = voll** (Bauplan); **Rundweg byteweise** (Schreiber); **Schutzregel:** keine Quelle außer `florian` ändert `dein`.
- **Herkunft** (Befund 3): nur das Ziel einer Geste wird „dein“; P ändert keine Herkunft eines Schlüssels, nicht die Menge der ruhenden
  Schlüssel und an keinem Winkel die Gestalt (Kurvenpunkte auf 1e-9); Löschen eines Ankers ändert keine Herkunft eines Schlüssels.
- **Zwei Geräte:** zufällige Folgen von Änderungen auf zwei Stores, zusammengeführt: Jeder Datensatz ist der des späteren Schreibers,
  jede verdrängte Fassung steht in `fassungen` und lässt sich wiederherstellen.
- **Migration:** Kurvenpunkte der Datensätze „dein“ vorher und nachher höchstens 1e-6 auseinander (3.4).
- **Herkunft je Typ:** Jeder Datensatztyp trägt `herkunft`; kein Skript ändert einen Datensatz „dein“, gleich welchen Typs, und nur
  `florian` legt einen an (Ausnahme: Dateikopie eines Probe-Projekts, 3.6 Nr. 9).

### 7.3 Gesteuerte Uhr und Haken

`apps/studio/src/kern/schleife.ts` nimmt die Zeit aus einer einsetzbaren Uhr. Playwright installiert `page.clock` und lässt Zeit gezielt
laufen; `window.__studio.takte(n)` rechnet genau n Takte. Stifteingaben als `PointerEvent` mit `pointerType: 'pen'` und Druck. Proben
arbeiten über die Haken (4.10), nie über Bildpunkte geklickter Knöpfe. Das erste Bild einer Seite zeichnet über das erste Prüfbild: zwei
Bilder abwarten (Falle aus der Übergabe ozzy-figur). **Schrift:** Beide Apps laden Lobster über `FontFace` (Studio in
`src/look/schrift.ts`, das Spiel in seinem `main.ts`) und setzen danach `data-schrift="geladen"` an `<html>` („fehlt“, wenn es nicht
klappt); Specs und Proben warten darauf, nie auf `document.fonts.check()` (das ist auch ohne eingetragene Schrift wahr).

### 7.4 Prüfbefehle

| wann | Befehl (aus dem Wurzelordner des Arbeitsbaums) |
|---|---|
| jedes Arbeitspaket (Bau-Agent) | Jeder Befehl beginnt mit `pnpm_config_verify_deps_before_run=error` (pnpm installiert dann nie von selbst; meldet es „Run pnpm install“, steht das im Abschlussbericht, 2.4). Tests nur eigener Dateien: `pnpm --filter <npm-paket> --fail-if-no-match exec vitest run <eigene Testdateien>` (Pfade relativ zum Ordner des npm-Pakets; seine `vitest.config.ts` setzt forks und den Schreibhaken); Typen: `pnpm --filter <npm-paket> --fail-if-no-match typecheck` (nie nur `exec tsc`; beide tsconfig, 2.1; ein Fehler in einer Datei eines anderen Arbeitspakets steht im Abschlussbericht, der Agent ändert sie nicht); `--fail-if-no-match`, weil `pnpm --filter` mit einem falschen Namen still mit Exit 0 endet; Lint `pnpm exec eslint <eigene Dateien>`; Grenzen `pnpm --filter @ee/studio exec vitest run test/grenzen.test.ts`; e2e und Bildtests nur eigener Specs: `STUDIO_PORT=<gerade> SPIEL_PORT=<ungerade> STUDIO_INHALT=test-results/<paket>/inhalt pnpm --filter @ee/studio e2e <eigene Specs>` (fürs Spiel `pnpm --filter @ee/ozzy-spiel e2e`; die Inhaltskopie liegt dann in `test-results/<paket>/inhalt`, die Ausgaben in `test-results/<paket>/ausgaben`, nie den Ordner eines anderen Pakets nennen; Argumente hinter dem Skriptnamen reicht pnpm 12 direkt an Playwright weiter, hinter `--` gelten sie als Dateifilter); übrige Ausgaben nach `test-results/<paket>/`; Server nur auf den zugeteilten Probe-Ports, mit Schreibhaken (2.4) |
| nach jeder Welle (Integration) | `pnpm studio:pruefen` (Typen je npm-Paket mit beiden tsconfig, Lint, alle Studio-Tests, Lizenzen, kurze Ausgabe; Schritte und Pakete wählbar mit `-- <schritt …> <paket …>`, ganze Ausgaben in `test-results/studio-pruefen/`); `pnpm --filter @ee/studio e2e` und `pnpm --filter @ee/ozzy-spiel e2e` (auch die e2e und Bildtests der Pakete dieser Welle) |
| M1, M4 und Änderungen an Form oder Knochen | `pnpm --filter @ee/studio-uebernahme test` (Parität) |
| Determinismus | `pnpm --filter @ee/studio e2e -- e2e/rechnen.spec.ts e2e/determinismus.spec.ts` |
| Probe einer Etappe | `NODE_OPTIONS=--import=$PWD/apps/studio/scripts/proben/schutz.mjs node apps/studio/scripts/proben/m<n>-<thema>.mjs` (Schreibhaken mit absolutem Pfad, damit auch Kindprozesse in anderen Ordnern ihn finden; 6.3; so läuft auch `m0-vertrag.mjs`, Ausgaben in `test-results/proben/<probe>/`); danach `test-results/schutz/meldungen.log` (leer: nichts verweigert) und das Protokoll der Ablage lesen |

Nie die ganze Testreihe des Repos und nie die von `@ee/shape` (Arbeitsregel 10). Proben der Integration im Vordergrund, eine nach der
anderen, nach der Welle; während einer Probe der Integration ändert kein Paket etwas unter `src`.

### 7.5 Proben schreiben nie in Florians Dateien

- Server von Proben und Playwright laufen auf eigenen Ports (5263, 5265, 5291, 5292, 5294; Bau-Agenten 5270 bis 5289 nach 2.4) auf
  einer Kopie im Ordner `test-results/` (ohne `STUDIO_INHALT` von selbst, 2.4) und mit dem Schreibhaken; nie auf 5213, 5217, 5219 oder
  5261. `playwright.config.ts` beider Apps nimmt `STUDIO_INHALT` nur unter `test-results/<ordner>/…` an (sonst bricht der Lauf ab), ohne
  die Variable `test-results/playwright-<port>/inhalt`, Ausgaben daneben; ein schon laufender Server wird nie genommen. Der
  Vergleichsserver 5294 hat eine eigene Konfiguration ohne Schreibwege und mit eigenem Zwischenspeicher (6.3; dazu ein Plugin, das nur
  liest: GET `/__ozzy-figur/schluessel` liefert seine Datei, jede andere Methode auf `/__ozzy-figur*` oder `/__wesen*` bekommt 405,
  `build.outDir` liegt unter `test-results/vergleich/dist`).
- Proben, die Speichern nur brauchen, um zu laufen, leiten `/__studio/**` mit `page.route` auf eine Attrappe im Browser um (wie
  `werkzeug-probe.mjs`); Proben auf 5294 leiten `**/__ozzy-figur/schluessel` um (GET liefert seine Datei, PUT wird verworfen). Unter
  Automation fragt die Editor-Seite nie nach einem Sitzungsschlüssel, und kein Proben-Server hat `STUDIO_FLORIAN=1`; die Quelle
  `florian` gibt es dort nie (4.9).
- Proben, die seine `schluessel.json` als Quelle brauchen, nehmen eine Kopie unter `test-results/` (in `Projekt.quellen` der Kopie).
- Die Übernahme und die Inhalt-Skripte schreiben nur über die Ablage nach `content/studio/` (F5, 6.3), nie nach `docs/look/`; Proben mit
  Florian laufen in Probe-Projekten, sein Projekt bleibt unberührt.
- Der Schreibhaken (`schutz.mjs`) verweigert jeden Schreibversuch eigener Prozesse unter `docs/look/ozzy-figur/` und `apps/editor/`,
  unter `content/studio/` außer bei `STUDIO_INHALT=content/studio`; was Florian dort selbst ändert, löst nichts aus (6.3).

---

## 8 Tempo-Budget und Messseite

### 8.1 Budget (iPhone 16 kalt, 60 Hz; 14c §6)

Die Messblöcke heißen „Block 0“ bis „Block 9“ (Dateien `messen/bloecke/b0.ts` bis `b9.ts`), damit sie nicht mit den Proben B1 bis B16
der Liste verwechselt werden.

| Posten | Budget | Messblock |
|---|---|---|
| Hauptthread gesamt (eigene Arbeit) | ≤ 6 ms | Block 2 |
| Auswerten (Schritte 10 bis 15, Ozzy) | 0,5 ms | Block 2 (a) |
| Abflachen | 0,3 ms | Block 2 (b) |
| Zeichenbefehle (unter 100 Aufrufe) | 0,5 ms | Block 2 (c1) |
| Physik und Logik (Schritte 1 bis 9) | 1,5 ms | Block 2 (d1–d3) |
| Anzeige im Spiel | 0,3 ms | Block 2 |
| Grafik gesamt | ≤ 8 ms | Block 3 |
| Felder Ozzy / ganze Bühne | 3 ms / 5 ms | Block 3 |
| GPU-Speicher, Seite | ≤ 150 MB, ≤ 400 MB | Block 5 |
| erstes Bild | ≤ 2 s | Block 5 |
| Editor (iPad, Mac): Auswerten samt Zwiebelhaut / Felder / Hilfslinien / Live-Werte / Zug mit Store | 2,5 / 8 / 1 / 0,5 / 1 ms | Block 8 |
| Bauplan beim Ziehen | 1 ms | Block 8 |
| Autorig im Worker | ≤ 50 ms je Lauf | Block 2 (e1), Block 8 |

### 8.2 Messseite

`apps/studio/messen.html` auf 5217 aus dem festen Stand, ein Knopf, rund 15 Minuten je Gerät, Ergebnis als Datei in
`docs/progress/studio/tempo/<datum>-<gerät>-<safari|app>.json` (Ersatz: Knopf „Kopieren“). Sie misst den echten Code; was noch fehlt,
ersetzen ab M2 **Ersatzszenen** aus seinen SVGs (Befund 10, M2.4): (a) ganzer Ozzy (Logo) einmal, (b) sechsmal, (c) Ersatz-Spielwiese
mit gebackenem Hügel, Ozzy, drei gebackenen Dingen und 80 analytischen Kreisen, (d) zwei bewegte Figuren (Ozzy und ein gespiegelter, auf
70 % verkleinerter Ozzy als Platzhalter der Katze); was später gebaut wird, ersetzt sie. Oben steht für Florian ein Satz: „Das Spiel hält
60 Bilder je Sekunde: ja/nein. Reserve: x-fach.“ Am Mac misst die Integration selbst: im echten Safari über WebDriverIO mit
safaridriver, sobald Florian es eingeschaltet hat (B6), sonst in WebKit von Playwright; umgerechnet nach 8.3 ist das ein Hinweis, keine
iPhone-Messung.

| Block | misst | Kriterium |
|---|---|---|
| Block 0 Gerät | Gerät, iOS, Safari oder App, Dichte, Auflösung der Uhr, `crossOriginIsolated`, WebGL2-Fähigkeiten, WebGPU ja/nein | Protokoll |
| Block 1 Takt | Abstand der Bildaufrufe | 60 Hz; bei 30 Hz Hinweis auf Stromsparmodus |
| Block 2 Prozessor | je Posten aus 8.1 300 Stapel nach 3 s Aufwärmen; Median, 95 %, Höchstwert, Lücken über 25 ms | Budgets 8.1 |
| Block 3 Grafik | Szenen: Ozzy mit Rahmen, Ozzy mit halber Feldauflösung (nur gemessen; eingeschaltet nur mit seinem Wort), Spielwiese (bis M6 die Ersatz-Spielwiese), Morgenrunde, sechs Ozzys zugleich (Maß für den Rückblick, gemessen vor dessen Bau), zwei bewegte Figuren, ganze Fläche ohne Rahmen (nur zum Zeigen); Grafikzeit als Stapel, Reservefaktor | ≤ 3 ms Ozzy, ≤ 8 ms Szene, Reserve ≥ 2 |
| Block 4 Dauerlauf | 10 min die schwerste lauffähige Szene, Rad dreht | Median ≤ 12 ms, 95 % ≤ 17,5 ms |
| Block 5 Start und Speicher | erstes Bild, Wasm, Shader, Texturen; dreimal neu laden | 8.1, kein Fehler |
| Block 6 Kontextverlust | verlieren und wiederherstellen | gleiches Bild, ≤ 500 ms |
| Block 7 Wiederholbarkeit | 600 Takte einer Lauf-Datei | gleiche Prüfsumme wie am Mac |
| Block 8 Editor | künstliches Ziehen an einem Griff mit Zwiebelhaut und Bauplan | Hauptthread ≤ 8 ms (95 %) |
| Block 9 Verbindung | Änderung am Mac bis zum iPhone | < 0,5 s |

**Wann gemessen wird:** erster ganzer Lauf am Ende von M2 mit den Ersatzszenen; Block 3 nach jeder Änderung am Renderer (M6, M8, M10, eine
Minute); ganzer Lauf in M6 (Spielwiese) und M11 (in Safari und in der App). Am Mac misst die Integration selbst (Hinweis); die Läufe auf
iPhone 16, iPad und Mac stehen als Probe B3 in der Liste, ohne Grenze für offene Proben, und der Bau wartet nicht darauf.

### 8.3 Regeln

- **Bis zur Messung** gilt die Umrechnung aus 14c §6.4: Prozessor am Mac in Safari mal 1, Grafik mal 3 bis 4. Eine Szene, die am Mac
  in Safari mehr als 2 ms Grafik für die Bildpunkte des iPhone braucht, ist zu teuer.
- **Rot zuerst beheben** (Rückfall Tempo, 9.2), in dieser Reihenfolge als nächste Welle: Rahmen je Figur (ab M1 Standard) → Welt
  gebacken, Kreise analytisch (ab M1.4) → drei statt sechs Geister → Kachel-Durchgang (eigene Welle mit Probe). Halbe Feldauflösung
  verändert seinen Look und kommt nur mit seinem Wort, zuletzt in dieser Reihenfolge (Vorher-Nachher-Bild in der Liste). Rot heißt am Mac
  umgerechnet ein Hinweis, am iPhone eine Messung.
- **Kostenampel im Editor** liest dieselben Zähler wie die Messseite (`studio-bild/src/ampel.ts`), mit den gemessenen Faktoren seiner
  Geräte, sobald es sie gibt.
- **Keine Würfe im Bildtakt:** Die Laufzeit legt im Bildtakt nichts an (Test „Speicher“ in 7.1).

---

## 9 Risiken, Rückfälle, Abbruchregeln

### 9.1 Risiken

| Risiko | woran man es merkt | Gegenmittel und Rückfall |
|---|---|---|
| Umfang wächst über das Wochenlimit | Etappe über dem Anderthalbfachen; `docs/progress/studio/aufwand.json` | F7: parallele Wellen verbrauchen sein Limit schneller (er hat mit Ultracode zugestimmt, A26); jede Welle hinterlässt einen grünen, committeten Stand, der Bau kann an jeder Wellengrenze anhalten und später weiterlaufen; nach M3 Neuschätzung mit gemessener Bauzeit in der Meldung; Hebel: Abendrunde und Musik später, Autorig erst mit der Katze |
| Tempo auf dem iPhone verfehlt | Ampel rot (am Mac umgerechnet: Hinweis; am iPhone: Messung) | Reihenfolge aus 8.3 als nächste Welle; Kachel-Durchgang als eigene Welle; halbe Feldauflösung nur mit seinem Wort |
| Die aktive Stelle trägt nicht | Ort-Probe rot (Baufehler); Werkbank- oder Bedienprobe unter vier von fünf, sobald ihr Ergebnis da ist | Fehler der Ort-Probe beheben; Gegenprobe „zwei Modi“ (M4G) als nächste Welle, wenn eine Probe mit Florian oder Nicole scheitert |
| Parität der Kopfdrehung nicht erreichbar | Kurvenpunkte über 0,001 im 0,5°-Raster | die Listen sind schon die des Prototyps samt gespiegelter Einträge (6.2 Nr. 5), Zahlen ungerundet (3.5): eine Abweichung ist ein Baufehler; nie Code mit Teilnamen; nach dem Anderthalbfachen anhalten und berichten |
| Box2D-Bindung (zwei Betreuer), Snapshot experimentell | P1, Vertragstests | `WeltAdapter`; Rapier als Rückfall; Snapshots nie als Datei, dauerhaft nur Lauf-Dateien |
| Kette auf dem drehenden Hügel | K5, K6 | B′ (Welt steht, Schwerkraft und Kamera drehen), dann Rapier |
| Mischart verändert seine Formen | Vergleichsbild | nie still wechseln; „je Koordinate“ bleibt für seine Kopfdrehung bis zu seinem Wort |
| Autorig nur für Ozzy | Katze braucht mehr als drei Ringzüge | Vorlage prüfen; Vogel und Fisch als Gegenproben |
| Spiel zu schwer oder eintönig | Nicole scheitert in drei Versuchen, sobald ihr Ergebnis da ist | Bremskraft 0,35 g, Radius 16 L, dann erneut; Hilfen; Park als Inhalt |
| Determinismus über Geräte | Block 7, K7 rot; Prüfsumme in Node, Chromium, WebKit verschieden | Merker nur am selben Gerät; Funktion benennen; blockiert den Editor nicht |
| Vertrag zu früh zu breit oder falsch | Wünsche in den Abschlussberichten | nur die Integration ändert Verträge, nach der Welle, als kleiner Schritt mit Version |
| Zwei Pakete ändern dieselbe Datei | Diff nach der Welle | darf nicht vorkommen (disjunkte Dateien, Zusammenbau-Dateien nur in der Integration); kommt es doch vor, behält die Integration die Fassung des Pakets, dem die Datei gehört, und gibt den Rest als Wunsch in die nächste Welle |
| Zwei Geräte zugleich (Mac und iPad) | 409, `geaendert` | datensatzweise zusammenführen; der spätere gewinnt, der frühere bleibt unter „Fassungen“ wiederherstellbar (A25) |
| Daten gehen verloren | Datei kaputt oder falsch überschrieben | Sicherungsring je Datei (die letzten 50, dazu eine Woche lang je Stunde einer), verdrängte Fassungen als eigene Dateien, Kopie seiner `schluessel.json` vor jedem Lauf, Journal je Gerät; Commits „Florians Stand in Studio“; zurückgesetzt wird nur auf sein Wort |
| WebKit von Playwright ist nicht Safari | am Gerät anders | echtes Safari über WebDriverIO am Mac (B6); Proben auf seinen Geräten (Teil B); Playwright nur als Vorprüfung |
| Florians Prüfzeit | Proben stauen sich | der Bau wartet auf keine Probe (F1): vorläufige Entscheidungen in Teil A, Proben in Teil B ohne Grenze, Offenes in Teil C für den großen Feinschlifflauf |
| Ein Fenster wird unter Florian umgebaut | Port 5213 oder 5217 lädt neu | fester Stand je Ordner (`dist/<stand>/`; ein Bau überschreibt nie den laufenden); 5217 neu nur ohne Ungespeichertes im Journal; Prototyp auf 5294 für Vergleiche, mit eigener Konfiguration und eigenem Zwischenspeicher; niemand ändert `tsconfig.base.json` oder andere Dateien, die `apps/editor` liest; `apps/editor` importiert nie aus Studio |

### 9.2 Rückfälle und Abbruchregeln (gelten in jeder Etappe)

**Rückfälle nach vorher festgelegtem Kriterium** (F1): Der Bau wählt selbst und trägt es in die Liste ein.

| Wette | Kriterium | Rückfall |
|---|---|---|
| Parität der Kopfdrehung (M1) | Kurvenpunkte unter 0,001 im 0,5°-Raster (3.5) | kein Rückfall: Die Listen des Prototyps samt gespiegelter Einträge sind die Festlegung (6.2 Nr. 5); eine Abweichung ist ein Baufehler (Abbruchregel 1) |
| Parität der Haltungen (M4) | Kurvenpunkte unter 0,001 an den fünf Haltungen | der Restversatz je Haltung wird eine Posenkorrektur mit Herkunft „gebaut“ (Daten aus der Übernahme) |
| P1 mit Box2D (M2) | K1 bis K9 gemessen (14a §7.2) | K5 oder K6 rot: B′ (Welt steht, Schwerkraft und Kamera drehen), dann Rapier hinter `WeltAdapter` |
| Tempo (M2, M6, M8, M10) | Messseite rot (am Mac umgerechnet: Hinweis; am iPhone: Messung) | 8.3 in dieser Reihenfolge: Welt gebacken und Kreise analytisch, drei statt sechs Geister, Kachel-Durchgang als eigene Welle; halbe Feldauflösung nur mit seinem Wort |
| Wiederholbarkeit über Browser (M1, M5) | gleiche Prüfsumme in Node, Chromium, WebKit | Merker nur am selben Gerät, Funktion benennen; der Editor wartet nicht |
| Aktive Stelle (M3, M4) | Ort-Probe; Werkbank- oder Bedienprobe unter vier von fünf, sobald ihr Ergebnis da ist | ein Fehler der Ort-Probe ist ein Baufehler; Gegenprobe „zwei Modi“ als nächste Welle, wenn eine Probe mit Florian oder Nicole scheitert |
| Spielbarkeit (M2, M7, M10) | Nicole in höchstens drei Versuchen, sobald ihr Ergebnis da ist | Bremskraft 0,35 g und Radius 16 L, dann erneut |

**Abbruchregeln:**

1. Anhalten und berichten nur noch, wenn für ein Scheitern kein Rückfall im Plan steht, der Rückfall selbst scheitert, eine Probe ohne
   Rückfall das Anderthalbfache der Schätzung überschreitet oder der Schreibhaken etwas meldet (Nr. 5).
2. Zweimal dasselbe Kriterium verfehlt: den Ansatz prüfen, nicht nachbessern (Arbeitsregel 7).
3. „Gefällt nicht“ (sobald er es sagt): umbauen, nicht belegen (Arbeitsregel 4).
4. Rot auf der Messseite: Maßnahmen aus 8.3 als nächste Welle, nach der Tabelle oben.
5. Verweigert der Schreibhaken einen Schreibversuch eines eigenen Prozesses unter `docs/look/ozzy-figur/`, `apps/editor/` oder (ohne
   `STUDIO_INHALT=content/studio`) `content/studio/`, oder
   meldet die Ablage ein Schreiben an einem Datensatz `dein` ohne Quelle `florian` (6.3): Der Lauf hält an, die Integration berichtet
   mit Pfad, Zeit und Prozess. Sie setzt nie automatisch zurück, weder aus Git noch aus dem Sicherungsring; wiederhergestellt wird nur
   auf sein Wort. Was Florian selbst ändert (im Prototyp auf 5213, in Studio auf 5217), löst nie ein Anhalten aus.
6. Braucht ein Paket eine Datei eines anderen Pakets, eine Abhängigkeit oder eine Vertragsänderung: Es schreibt das in seinen
   Abschlussbericht an den Workflow; die Integration entscheidet nach der Welle (F3).
7. Nie ohne sein ausdrückliches Wort: seine Schlüssel oder Dateien ändern, seinen Prototyp ändern, seine Kopfdrehung in Studio zur
   Wahrheit machen, Effekte auf Ozzys Körper außer den erlaubten einschalten; ebenso Mischart oder periodische Mischung seiner
   Kopfdrehung wechseln (A2, A3), Ozzys Rig durch den Autorig ersetzen (A9), Gewichte an der Bohne (A5), halbe Feldauflösung, Rückwurf an
   (A20).

---

## 10 Was Florian wann sieht

Der Bau wartet auf nichts davon (F1). Am Ende jeder Etappe steht ein grüner, committeter und gepushter Stand; die Integration schreibt
`docs/look/studio/UEBERGABE.md` neu (Stand, Starten, was sich an seiner Figur geändert hat, was bleibt, Fallen), legt Bilder und
Aufnahmen nach `docs/progress/studio/` und schickt eine kurze Meldung: zuerst, was sich an seiner Form oder in Studio geändert hat und
was er jetzt tun kann, dann der Verweis auf die Liste [Studio: Was bleibt](2026-11-20-studio-was-bleibt.md) mit den neuen Einträgen in
Teil B und C. Fragen und Wahlmöglichkeiten stehen nur in der Liste, in seinen Wörtern (Teil A: vorläufig entschieden, mit „So änderst du
es“); die Abschlussnachricht nennt die neuen Einträge wörtlich (er liest oft per Fernsteuerung). Nach M3 nennt die Meldung die neue
Schätzung (F7). „Bestanden“ sagt nur er.

| nach | er kann jetzt | Adresse | Proben in der Liste |
|---|---|---|---|
| M0 | nichts zu prüfen, eine Zeile in der Meldung | – | – |
| M1 | seine Kopfdrehung in Studio an der Leiste fahren (ansehen; formen weiter im Prototyp, A1) | `http://localhost:5217/` | B1, B2 |
| M2 | „Tapsen“ auf dem iPhone spielen; die Messseite laufen lassen | `http://<Mac>:5217/p1.html`, `http://<Mac>:5217/messen.html` | B3, B4, B5, B6 |
| M3 | in Studio formen, speichern, zurücknehmen, am Mac und am iPad zugleich; den Kopf im Probe-Projekt formen | `http://localhost:5217/`, `…/?projekt=werkbank-probe` | B7 |
| M4 | Posen, Übergänge und Tafel; seine Abläufe in Studio | 5217 am Mac und am iPad | B8 |
| M5 | Ozzy auf dem Hügel am Mac, Linse Physik | 5217 | B9 |
| M6 | die Spielwiese auf dem iPhone | `http://<Mac>:5261/` | B10 |
| M7 | die Morgenrunde; das Probe-Projekt der Bedienprobe | 5261 (Nicole), `…:5217/?projekt=bedienprobe` | B11, B12 |
| M8 | Pannen und Rückblick | 5261 | B13 |
| M9 | die Katze, den Autorig, „Warum?“ | 5217 | B14 |
| M10 | die Abendrunde | 5261 | B15 |
| M11 | der ganze Tag in der App; danach der große Feinschliff und sein „bestanden“ | App auf dem iPhone 16 | B16 |

**Vor dem Start braucht der Bau nichts von Florian:** Parallel bauen ist mit Ultracode zugesagt (F2); ob die Messseite auf seinem
iPhone 16, seinem iPad und seinem Mac läuft und welches iPad es ist, steht als Probe B3 in der Liste.

---

## Nachtrag nach M0 (20.11.)

M0 ist gebaut, geprüft und nachgearbeitet. Weil M1.0 entfällt, bauen die Agenten von M1 und M2 nach dem Plantext; darum stehen die
Ergänzungen, Auslegungen und Entscheidungen aus M0 jetzt in den Abschnitten oben, als Vertrag und so, wie der Code sie hat. Je Änderung
eine Zeile:

| Abschnitt | Kern |
|---|---|
| 2.1 Matrix | `src/` beider Werkzeuge darf Node (sie laufen mit `tsx`); die Übernahme hat DOM nur in `lib`, für die Typen des `FigurRaster`; DOM in `studio-ton` nur in `ausgabe.ts` und `freigabe.ts`, erzwungen ab M7.0 |
| 2.1 Paketform | `typecheck` ist `node ../../scripts/studio-typen.mjs`; jedes Paket ohne Node hat `tsconfig.quellen.json` (Quellen ohne Tests, ohne Node); Testhilfen mit Node heißen `*.testhilfe.ts` |
| 2.1 Paketform | jede `vitest.config.ts` setzt `pool: 'forks'` und den Schreibhaken über `execArgv` |
| 2.1 Abhängigkeiten | `@types/node` ^24.0.0 in den devDependencies von Ablage, Apps und Werkzeugen; `@ee/studio-rechnen` als devDependency des Stores |
| 2.2 Dateien | neu: `tsconfig.quellen.json` je Paket ohne Node, `scripts/studio-typen.mjs`, `apps/studio/e2e/seiten.spec.ts`, `apps/ozzy-spiel/playwright.config.ts` und `e2e/seite.spec.ts`, `scripts/proben/m0-vertrag.mjs`, `schema.test.ts`, `pruefdaten.test.ts`, `vertrag/{bilddaten,feldbreiten,welt}.test.ts`, `effekte/register.test.ts`; `bauplan/ordnung.ts` mit `ankerBereiche` |
| 2.2 Zusammenbau | `uebernahme.ts` und `inhalt.ts` gibt es seit M0 mit leeren Registern, die Pakete exportieren Schritte und Skripte, die Integration trägt sie ein; die Typen der Registerlisten sind Vertrag; was M0 angelegt hat, wird ergänzt, nicht neu angelegt |
| 2.3 Nr. 1 | zweite Typprüfung der Quellen ohne Node (`tsconfig.quellen.json`) |
| 2.3 Nr. 2 | ESLint im Simulationspfad auch gegen Umwege über Math, `crypto`, `globalThis`, `global`, `self`, `window` und Zeitgeber; Node-Globale in `src/` aller Pakete ohne Node verboten; Tests und Testhilfen ausgenommen |
| 2.3 Nr. 6 | Konfiguration, Tests, `e2e/`, `scripts/`, `server/` dürfen typescript, `@vitejs/*` und die devDependencies importieren und Typ-Pakete als Wert; nur `import type` zählt als Typ; keine relativen Code-Importe über Paketgrenzen; keine Worker-Threads, kein vitest mit `threads` oder `vmThreads` |
| 2.4 | Playwright nimmt `STUDIO_INHALT` aus der Umgebung (nur unter `test-results/<ordner>/`), Ausgaben daneben, nie einen fremden Server; das Spiel auf `SPIEL_PORT` (5292) |
| 2.4 | Wurzel-Skripte mit `pnpm_config_verify_deps_before_run=error` (nie in `pnpm-workspace.yaml` oder `.npmrc`); die Paket-Skripte `dev`, `uebernehmen`, `vergleich`, `inhalt`, `probeprojekt` setzen den Schreibhaken selbst; `typecheck` über `studio-typen.mjs` |
| 2.4 | `studio:stand` behält einen Stand, aus dem 5217 oder 5261 noch liefert, und überschreibt nie einen; `studio:pruefen` leert `test-results/bau/inhalt` nicht unter einem laufenden Server; relative Importe der Konfigurationen mit `.js` |
| 2.5 | Bau-Agenten prüfen Typen mit `typecheck` ihres npm-Pakets statt einer eigenen tsconfig, jeder Befehl mit `pnpm_config_verify_deps_before_run=error` |
| 3.2 | Schemas strenger als die Typen (Liste); `ArtFamilie`, `ArtSchluessel`, `Versionen.arten` nach Art-Schlüssel; `Regler.einheit` mit `'figur'`; `Aufhaengung.griffe` mit der Marke `'erben'` statt `null`; `Fehler`, `LadeErgebnis`, `ImportErgebnis` in `typen/dokument.ts` |
| 3.4 | Art-Schlüssel `<familie>:<art>`, Block ihrer Migrationen `art:<familie>:<art>`; `Migration` und `ArtBlock` in `versionen.ts` (samt ihren übrigen Hilfen), `migrationen/register.ts` reicht sie weiter und hält `MIGRATIONEN`; der Kopf nennt nur genutzte Arten; wie die Glätte-Regel misst; Griffe der Länge 0 mit der Gegenrichtung (32 Anker der Prüfdatei) |
| 3.5 Nr. 1 bis 4 | Reihenfolge über `dateiOrdnen`; nur die vier Zeilenarten stehen auf einer Zeile, den Rest legt der Schreiber fest; `ZAHL_GRENZE`; kein `null` ohne Ausnahme |
| 3.6 Nr. 5, 8, 12 | ein Kreis meldet auch `ReglerPlan.hinweise`; fehlende Schlüssel einer Quelle über `fehlendeEintraege`; neue Regel Hüllen: Vielecke 3 bis 8 Punkte, Ketten 2, Schleifen 3, Umlaufsinn als Hinweis |
| 4 | was erst eine spätere Etappe baut, steht seit M0 als Typ; die Typen aus 4.8 und 4.10 legen M3.0, M7.0 und M9.0 an |
| 4.1 Rechnen | Dateien von `hypot` und Co.; `radZuGrad`; `pchipWert(…, periode?)` passend zu `pchipSteigungen(…, periode)`; Randfälle und Prüfungen von PCHIP; `wangStueckzahl` als reine Zahl nach Wang; `bernstein` mit (stufen + 1) · 4 Gewichten; Randfälle von `kurvenAbstand`; `utf8`; Strom und Prüfsumme festgelegt; `ZAHL_GRENZE` |
| 4.1 Format | Hilfen von `kennung.ts`, `anker.ts`, `arten/register.ts` und `schema/reihenfolge.ts`; `i` in `ankerPunkte` ist die Stelle der ersten Zahl (Anker k ab 6·k); Orte von `Fehler`, `LadeErgebnis`, `ImportErgebnis`, `MIGRATIONEN`; `ArtSchema.familie` vom Typ `ArtFamilie` |
| 4.1 Store | `StoreVertrag`, `StoreKonstruktor`, `DiffVon`, `SchutzVerletzt` in `studio-store/src/typen.ts`; je Kennung `KENNUNG_ZAHLEN` Zufallszahlen; der Strom der Tests aus `@ee/studio-rechnen/zufall` |
| 4.2 | `bauen` passt den Lauf an; `auswerten` hängt eine Auswertung an, leeren muss, wer zeichnet; `hand` über `handSetzen`; Schritt 8 `figurSchritt(p, lauf, chips, dt, teilschritte)` mit den `ChipLauf` der Fassade; Schritt 13 mit der Lage der Figur; Schritt 16 samt `malreihenfolge` in BildDaten |
| 4.3 | `OrdnungPlan.listen`; ReglerPlan mit `raster`, `spiegelAb`, `spiegelUm`, `mitSpiegel`, `mitUm`, `hinweise`; `TeilPlan.geschlossen`; `KnochenPlan.teile` mit `figur`, `erster`, `anzahl`, dazu `figurLage`, `figurEinheit` und die Lage in `matrizen`; `AbflachPlan.teile` (`AbflachTeil`); `PhysikPlan.chipStand`; `LogikPlan.bausteinStand`; die Regeln der Ordnung, des Ankerpuffers, der Lage einer Figur und der Rechenfolge; `ankerBereiche` und die Hilfen aus `ordnung.ts` und `regler.ts`; `leererBauplan` |
| 4.4 | `malreihenfolge(plan, r, aus: BildDaten)`; `handSetzen`, `handLoesen`; `knochenStellen` und `aufhaengen` mit der Lage der Figur und Teilen ohne Aufhängung; `Anforderung`, `TafelZelle`, `Zusatzart` liegen in `vertrag/`; `zusatzAnwenden` bekommt in M4.0 `geschlossen` |
| 4.5 | `fuehren` (Pflicht), `zielSetzen(…, hoechstkraft?, feder?)`, `federbein(…, anteil?)` nur für einen Schritt, `WeltPuffer.beine` und `beinZahl`, Feldbreiten als Werte, `VIELECK_PUNKTE` = 8; Festlegungen der Welt; Ketten einseitig; Feldbreiten als `typeof`-Kopie; Chipart und Bausteinart mit `standLaenge`, ohne `stand` und `setzen`, Stand in `Lauf.figur` und `Lauf.bausteine`; Suchen der Register; die Attrappe |
| 4.6 | `KANAELE` = 24, `feldsaetze[].einheit`, `gebacken[].ding`; Feldbreiten und Inhalt von BildDaten, Zähler `teilZahl`, `feldsatzZahl`, `deckungZahl`; `bildDatenAnlegen`, `bildDatenLeeren`; Feldsatz-Regel in `bauplan/zeichen.ts`; wer was füllt; `ShaderQuellen`, `ZeichnerAnlegen`, `ShaderUebersetzen`; `EffektZeichnung` mit `ShaderBeitrag` und `ShaderStufe` |
| 4.7 | `fangen` nimmt `ReglerPlan.raster` |
| 5.3 | Stand nach M0: zusätzliche Dateien, Steckbrief von `testfigur.json`, `webdriverio` unter Node 25.8.1 |
| 5.4 | M1.0: ergänzen statt neu anlegen; M1.2 bis M1.9, M1.Z und die Verdrahtung nach Welle A nach den Verträgen aus M0 (der Test „30 Flächen ergeben zwei Feldsätze“ jetzt in M1.3) |
| 5.5 | M2.1 mit allen Ergänzungen der Welt; M2.2 mit `standLaenge` und dem Stand in `Lauf.figur`; M2.3 und M2.4 mit den Dateien aus M0 |
| 5.6 bis 5.10 | M3.6: `#leiste` in `liquid-drop.css`; M4.0: Typen aus M0 und Parameter `geschlossen`; M5.0, M5.2, M5.6: Stand im Lauf, `chipStand`, Weltpfad im Uhrzeigersinn, Skripte in eigenen Dateien; M7.0: tsconfig ohne DOM für `studio-ton` |
| 6.2 Nr. 6 | Regler der Verschiebungen mit Einheit `'figur'` |
| 6.3 | wie der Schreibhaken in jeden Prozess kommt; Schutz von `content/studio/`; Meldungen in `test-results/schutz/meldungen.log`; Grenze Worker-Threads; Kopie seiner `schluessel.json` nur, wenn `.gitignore` den Ring ausnimmt |
| 7.1 | Erlaubnisliste genau wie dort; Ausnahmen `css-value`, `@promptbook/utils`, die glob-Familie (BlueOak-1.0.0), `lightningcss` (MPL-2.0), alle nur Werkzeug |
| 7.3 | Specs und Proben warten auf `data-schrift="geladen"` |
| 7.4 | Befehle der Bau-Agenten mit `pnpm_config_verify_deps_before_run=error`, `typecheck` statt `tsc` mit eigener tsconfig, `STUDIO_INHALT` je Agent, e2e-Befehle; die Integration lässt auch die e2e des Spiels laufen |
| 7.5, 9.2 Nr. 5 | Playwright nur auf einer Kopie unter `test-results/`; der Vergleichsserver liest nur; Schutz von `content/studio/` |
