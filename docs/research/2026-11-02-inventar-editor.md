# Inventar des Wesen-Editors (Branch `claude/editor-grundlayout`, Stand 02.11.2026)

> Zuarbeit zur [Gegenprüfung](../plans/2026-11-02-gegenpruefung-liniennetz.md), Abschnitt 5 („Werkzeuge: brauchst du sie?“)
> und 9.3. Nur gelesen, nichts geändert. Pfade relativ zum Repo; `ed/` = `apps/editor/src/`, `k/` = `packages/shape/src/kern/`.
> Körperarten: R = Röhre, T = „Teile“ (`ausstattung.koerper='teile'`, Mittelebenen-Baum), M = mit Maul oder Beinen (dann wird
> immer die Röhre gebaut), P = in einer Pose (`modus ≠ 'editor'`).

Drei Bedingungen sperren viele Werkzeuge:
- **Vorschau-Sperre:** Pinsel, Reifen und Augen fragen `werkzeugGesperrt()` (`ed/kern/kernBau.ts:154`); während einer Vorschau
  beendet der erste Klick nur die Vorschau.
- **Pose-Sperre:** In einer Pose weist der Store alles ab, was nicht zur Pose gehört (`nurPose`, `ed/state/editorStore.ts:179`).
- **G/S/R in den Blättern:** nur in der Stufe Körper und im Editor-Tab (`ed/editing/modal/modal.ts:98`).

## 1 Werkzeuge und Tasten

### 1a Dock je Stufe (`ed/dock/Dock.tsx:18-25`, `ed/stamm/stufen.ts:9-20`)

| Stufe | Werkzeuge im Dock |
|---|---|
| Körper ⌘1 | A Auswahl · P Stift · G Ziehen · I Aufblasen · S „Reifen“ (Werkzeug `spant`) · ⇧W „Härte“ (Werkzeug `breite`) |
| Maul ⌘2 | A · P |
| Posen & Leben ⌘8 | A · G · I |
| Zähne ⌘3, Augen ⌘4, Teile ⌘5, Fell ⌘6, Haut ⌘7, Spiel ⌘9 | nur A |

`+` und `−` gibt es nur als Taste und im Electron-Menü. Der Werkzeug-Typ hat 8 Werte (`ed/state/uiStore.ts:18`).

### 1b Tasten (`ed/hooks.ts:57-171`, wenn nicht anders angegeben)

| Taste | Wo | Was | Körperarten |
|---|---|---|---|
| A/V, Esc | überall | Auswahl. Esc schließt der Reihe nach: Menü/Dialog, Vorschau, Werkzeug, Auswahl | – |
| P | Blätter (Körper), Maul, Spant in Front | Klick auf Kurve = Punkt, auf Punkt = löschen, ⌥ = Ecke↔glatt. Freie Fläche = neue P-Linie, Enter/Doppelklick beendet (`ed/kanten/KantenEbene.tsx:477-505,621-645`). Im Front-Spant gilt der Punkt für alle Spanten | R T M; P ✗ (dort formt man die Linie der Pose) |
| + / − | wie P | Ankerpunkt hinzufügen / löschen | wie P |
| ⇧W | Blätter (Körper) | Härte ziehen: an einer Ecke der Umrisslinie oder an einer P-Linie; 0–28 px Abstand = 0–100 % | alle; Wirkung hängt vom Bau ab |
| G | Blatt mit Auswahl | modal verschieben (`modal.ts:94-131`) | nur Grundform |
| G | Bühne / ohne Auswahl | Pinsel „Ziehen“ (`ed/kern/pinsel.ts:55-100`) | R, T (eigene `baumDeltas`), M (ohne „Formen folgen“), P (Form der Pose) |
| I | Bühne | Pinsel „Aufblasen“, ⇧ glättet | wie G |
| S | Blatt mit Auswahl | skalieren | Grundform |
| S | ohne Auswahl | Werkzeug Spant: Klick in Seite/Top = Spant (`SpantEbene.tsx:305-314`), Klick auf die Bühne = Reifen (`Steuerung3D.tsx:164-167`) | R, M (Kiefer-Spant); T ✗ mit Hinweis; P ✗ |
| R | Blatt mit Auswahl | drehen, nur eigene Knoten | Grundform |
| X/Y/Z (⇧ = ohne diese Achse), Ziffern, Enter/Klick, Esc/Rechtsklick/⌘Z | während G/S/R | Achse sperren, Wert, bestätigen, abbrechen (`modal.ts:272-305`) | – |
| ⌘R = ⌃R | Bühne oder Seite, Stufe Körper | Loops einziehen. Rad, Bild↑↓ oder Ziffer = Anzahl (≤ 16). Klick setzt; ein einzelner Loop gleitet bis zum 2. Klick (`ed/kern/schleifenWerkzeug.ts:153-266`) | nur R ohne Maul/Beine, nur Grundform; mit Maul/Beinen werden Loops zu normalen Knoten aufgelöst (`kernBau.ts:241-247`) |
| G / G G / S / R auf einem Loop | Loop gewählt (Klick, ⌥-Klick, ⇧ mehrere) | verschieben, gleiten, skalieren (Y = Höhe, Z = Breite), kippen (`ed/kern/schleifenGrs.ts`) | wie ⌘R |
| O / ⇧O / ⌥O | Blätter | proportional an/aus, Abfall (6 Arten), nur verbunden | Grundform |
| [ ] (auch ⌥5/⌥6), Rad, Bild↑↓ | – | Pinselradius ×0,8 / ×1,25; während einer Operation Einfluss ×1,1 | – |
| Q / ⇧Q | – | Ziel durchschalten: Editor und Posen | – |
| ⇧Leertaste | – | Überblenden abspielen | – |
| ⌃Leertaste | – | Feld unter dem Zeiger maximieren | – |
| Tab | – | Riss ↔ Bühne | – |
| ⌘1–9, ⌘Z/⇧⌘Z, ⌘S, ⌘N, ⌘L | – | Stufe, Rückgängig/Wiederholen, Speichern, Neu, Library | – |
| ⌥B | – | Bogen (Pauspapier) ein/aus | – |
| Home | – | Ansicht zurücksetzen | – |
| Entf/⌫ | – | löscht der Reihe nach: Spantpunkte bzw. Spant, P-Linien-Knoten, Umrisspunkte | – |
| Pfeile (⇧ ×10) | – | gewählte Punkte um 0,002 Kachel verschieben | – |
| Enter / Esc | beim Zeichnen | P-Linie bzw. Maullinie beenden / abbrechen | – |

Veraltete Reste: Die Taste F ist nicht belegt (Kommentar in `uiStore.ts:167` nennt sie noch). ⌃R setzt keinen Reifen mehr;
`reifenNeuAmZeiger` (`ed/kern/reifen.ts:322`) wird nirgends aufgerufen.

### 1c Griffe mit der Maus (Werkzeug Auswahl)

- **Blätter, Stufe Körper:** Knoten und Griffe ziehen (⌥ bricht den Griff); Auswahlrahmen (⇧ schaltet um); ⌥-Klick wechselt
  zwischen übereinanderliegenden Punkten; Ringe fremder Knoten ziehen, nur entlang der gemeinsamen Koordinate
  (`ed/netz/NetzEbene.tsx:325`); Spantlinie und Hauptspant H verschieben; Spant-Kurve in Front/Back bearbeiten; Loop-Linie
  anklicken oder ziehen; gestricheltes Teilstück anklicken = eigene Teilkurve; Rechtsklick-Menü; PNG auf ein Blatt ziehen.
- **Bühne:** Kieferknopf in Körper, Maul und Zähne (Doppelklick wechselt Editor ↔ Fressen); Reifen: Perle = Querschnitt
  formen, Band = Lage, ⌥ auf der Perle = Ecke; Loop wählen; Augen: Klick setzt, Rand ziehen = Größe; Zähne ziehen, mit ⌥
  vor/zurück; Knochen (Posen & Leben); Kamera.
- **Seite in Posen & Leben:** Gelenk, Kieferlinie, Übergang, Schädel (`ed/kiefer/KieferEbene.tsx`).
- **Pose-Tab:** die schwarze Linie der Pose in Seite/Front/Top ziehen (`ed/posen/poseLinie.tsx`).
- **Stufe Maul:** Maullinie in Seite oder Front klicken, Rot/Blau bearbeiten, Rundmaul-Ring und -Mitte ziehen.

## 2 Tafel je Stufe

Art: G = Gestaltung, A = Anzeige/Vorschau, D = Diagnose, W = Bau-Schalter (Umgehung oder Versuch).

### Körper (`ed/leiste/Seitenleiste.tsx:811-825`)

| Element (`data-…`) | schaltet | Art |
|---|---|---|
| Teile aus/an `teile-sicht`, Teile-Liste, „Automatisch“ (`ed/teile/TeilTafel.tsx:36-64`) | `ui.teileSicht` (Standard an), `dok.teile` | A; die eigenen Teilkurven liest der Kern nicht |
| Bogen `bogen-*`, Deckkraft, Breite, Versatz | `ui.pauspapier`; „Nachzeichnen“ schreibt die Umrisse | G |
| Pinsel-Regler | `ui.pinselRadius` | G |
| Käfig `kaefig` · Zebra `zebra-chip` · Matcap `look` | `kernAnzeige.kaefig`, `ui.zebra`, `kernAnzeige.look` | D |
| Grund `grund` | `ui.grund` | A |
| Körper Röhre/Teile `koerper` | `ausstattung.koerper` | W: zwei Bauwege mit getrennten Pinsel- und Posen-Deltas; T kann kein Maul, keine Reifen, keine Loops |
| Ringe „n eingefroren“ `stationen` + Neu ableiten `neu-ableiten` | `kaefig.stationen` | W (hält die Ringverteilung stabil) |
| Querschnitt heute / „aus der Hülle (V4/V5)“ `querschnitt` | `ausstattung.umrisseExakt` | W; gesperrt mit Maul, Beinen oder T |
| ▸ Versuche: Haut heute/glatt `haut` | `ausstattung.glatt` (neue Wesen: glatt) | W |
| ▸ Versuche: Umrisse berühren aus/rund/mittel/genau `fuelle` | `ausstattung.fuelle` (neue Wesen: mittel) | W |
| Kanten zeigen/blass/aus `kantensicht` | `ui.kantenSicht`; blendet das ganze Liniennetz samt fremder Ringe | A |
| netz ton/farbe `netzstil` | `ui.netzStil` (Standard farbe) | A |
| umrisse aus/an `netzumrisse` | `ui.netzUmrisse` (Standard aus) | A |
| Kantenliste mit Kennzeichnung genau/Treppe `kanten-art`; Härte-Regler, Chips glatt/weich/fest/scharf, Tiefe, „weich auslaufen“, löschen; Härte von Ecken | `dok.kanten[].haerte/tiefe`, `knoten.haerte` | G; „Tiefe“ ist nur Anzeige (Hof), der Kern liest sie nicht; „genau/Treppe“ ist D |
| Spanten-Liste, Lage, „wie Hauptspant“, löschen, „Hauptspant automatisch“ | `dok.spanten`, `dok.hauptspant` | G |

### Maul (`Seitenleiste.tsx:1111-1212`)

| Element (`data-…`) | schaltet | Art |
|---|---|---|
| Vorlage aus/vorn/unten/hals `maul` | `kernAnzeige.maul`, nicht im Dokument | W (Fertigmaul aus Beweis 2) |
| Rundmaul `rundmaul`, Regler O zu / O offen / Zähne rundum | `ausstattung.rundmaul` | G |
| Kiefer gleich/getrennt `kiefer` | `dok.maul.zu.unten` | G |
| Öffnung | `ui.oeffnung` | A |
| Öffnungsart kippen/ziehen `oeffnungsart`, Rille | `maulOptionen` | G |
| Unterkiefer, Schädel, Haps | Stellung der Pose Fressen | G |

### Übrige Stufen

- **Zähne** (`ed/leiste/ZahnFeld.tsx`): Automatik, Prüfung mit Vorschlägen, Anzahl ±, Öffnung, Kiefer-Wahl, „gleichmäßig
  verteilen“, Werte für zu/offen, Regler, außen, Farbe → `dok.zaehne`, `ausstattung.zahnFarbe`. G.
- **Augen** (`ed/leiste/AugenFeld.tsx`): Art, Mitte, Form, Größe, Breite, Drehung, Tiefe, Farbe → `ausstattung.augen` (G);
  Zustand, Lid, Blinzeln → `ui` (A).
- **Teile ⌘5:** Beine aus/verschmolzen/angesteckt + Schwung (W, Beweis 3).
- **Fell ⌘6:** Fell an/aus (Look-Test). **Haut ⌘7:** Palette und Stil fest/feuer/gas (Look-Test).
- Beine, Fell, Palette, Stil liegen in `kernAnzeige`, also **nicht im Dokument** — ebenso Look und Maul-Vorlage.
- **Posen & Leben:** Posenliste (Name, Regler = `ui.vorschau`, ⋯-Menü, „+ Neue Pose“), Überblenden (von/nach, ▶, t, Dauer,
  Zwischenbilder) und Geist, Knochen (symmetrisch, zurücksetzen), Form (Haps, glätten, zurücksetzen), Rig (Gelenk, Gewichte,
  Gewichte zeigen, Automatik). G/A.
- **Spiel:** siehe 5.

## 3 Spanten, Reifen, Loops

**Spant und Reifen sind dasselbe Datum in zwei Darstellungen. Der Loop ist ein eigenes Konzept.**

| | Spant / Reifen | Loop |
|---|---|---|
| Daten | `dok.spanten[] {f, profil, unten?}`: halbes Profil, normiert auf den Kasten aus Seite × Top (`packages/shape/src/spanten.ts:1-8`) | `dok.schleifen[]` + Markierung `Knoten.schleife` in der Seite (Rücken, Bauch) und im Top (bzw. Front) |
| Anlegen | S + Klick in Seite/Top (Spant) oder auf die Bühne (Reifen) | ⌘R / ⌃R |
| Formen | Kurve in Front (vor H) / Back (hinter H); auf der Bühne Perle und Band | nur seine Knoten (G/S/R, GG); kein eigener Querschnitt |
| Wirkung im Kern | rastet den nächsten freien der 24 Ringe ein | fügt einen zusätzlichen Ring ein (R+1) |
| Körperarten | R, M; T ✗ | R ohne Maul/Beine |

Wo der Kern Spanten verwendet: `stationenWaehlen` (`k/ableiten.ts:920-985`; Ecken der Seite → Ringfalte, jeder Spant → ein
Ring über `reifenZuweisen`, dazu V5-Linienringe und Loop-Ringe; eingefroren: `stationenNachfuehren`); **Querschnitt:** schon
ein einziger Spant schaltet **alle** Ringe auf `spantQuerschnitt` → `vorlageBei` um (lineare Überblendung Spant ↔ Spant ↔
Front als Hauptspant; mit „aus der Hülle“ gibt der Spant nur die Form vor, die Hülle beschneidet); **Kiefer-Spant:**
`Spant.unten` liefert in den Maulringen unter der Lippe den Querschnitt; **Kasten-Spanten:** `plan.kasten` (Tiger) nur ohne
eigene Spanten; **Anzeige:** Perlen über `WesenNetz.reifen`, Spantringe als Linien im Liniennetz. Der Baum (T) liest Spanten nicht.

## 4 Silhouetten-Maschinerie im Kern

| Modul | Zweck | Zeilen | wann aktiv |
|---|---|---|---|
| `k/breite.ts` | Breite aus den Silhouetten: Top bei x, Front bei y; Maßstab je Ring | 56 | immer (Röhre, Maul, Baum) |
| `k/rand.ts` | S3 „Umrisse berühren“: Ring örtlich bis zur Front hinausschieben, Marken „nur Kante“ / „anderes Teil“ | 241 | Chip „Umrisse berühren“ ≠ aus; nur R ohne Maul/Beine und ohne Hülle; im Baum immer „mittel“ |
| `k/fuelle.ts` | Fülle-Exponenten 2/4/24, Reichweite, Breite der Sichthülle | 92 | mit „berühren“ oder Hülle |
| `k/huellenSchnitt.ts` | V4: Querschnitt je Ring aus der Sichthülle; Reihenplan; V5-Linienreihen | 1 430 | Chip Querschnitt „aus der Hülle“ |
| `k/umrisse.ts` | V4-Beweis: Breitenlinie, Frontlinie, Ungleichung als Löser-Bedingungen (angehalten) | 488 | **im Editor nie aktiv** (nur mit `umrisseOpt`, das der Editor nie setzt) |
| `k/grundkoerper/huelle.ts` | S0: Sichthülle der drei Zeichnungen, Widerspruch je Linienprobe | 184 | jeder genaue Bau → rote Marke, „angleichen“ |
| `k/umrissKurven.ts` | V2: Umriss jeder Zeichnung als 3D-Bézier auf dem Körper | 771 | immer; liefert auch die 3D-Lage der fremden Knotenringe; als Linie sichtbar nur mit „umrisse an“ |
| `k/netzSicht.ts` | S1: Liniennetz mit Sichtbarkeit je Blatt | 709 | immer (ohne Beine) |
| `k/abweichung.ts` | Δ Körper ↔ Kurve je Blatt, Saum | 305 | immer → Δ im Blatt-Titel, gelber Saum, Spiel-Tafel |

Zusammen ≈ 4 280 Zeilen. Dazu in `ableiten.ts` `lappenQuerschnitt`, `ringMasstab`, `breitenSchleife` (immer an, außer mit
Maul); `k/folgen.ts` (394 Zeilen, „Formen folgen“ nach jedem Pinselstrich ohne Maul); die Teile-Erkennung aus den Silhouetten
(`grundkoerper/skelett`, `teilbaum`, `teilAnsicht` usw., > 3 000 Zeilen), die in jedem genauen Bau läuft und die Blätter färbt.

## 5 Stufe Spiel und Unterteilung

- **Spiel-Tafel** (`SpielFeld`, `Seitenleiste.tsx:1322-1347`) zeigt nur Kennzahlen: Käfigpunkte / feine Punkte, Naht→Kurve,
  Δ Seite/Front/Top, „Falten“, Zeit für Zug bzw. Umbau, Zielwerte als Text. Keine Bedienelemente.
- **Kein Schalter für die Unterteilungsstufe:** feste Konstante `ABLEIT_STANDARD.stufen = 3` (`k/ableiten.ts:138`); Baum und
  Maul übernehmen sie (`baumBau.ts:84,1207`; `maul.ts:2217`). Ausnahmen: Klingen 1–2 Stufen, Zacken/Ohren 1 Stufe.
- **Angezeigt wird die Grenzfläche der Stufe 3:** `anwenden3(unterteilung.grenze, xyz)` (`wesen.ts:1253`); `grenze` ist die
  Grenzmaske der Stufe 3 (`subdivision/catmullClark.ts:175,261-273`). Ein Umschalter „Spiel“ (Stufe 1) ist nur geplant.

## 6 Linien in den Blättern

Unter dem SVG rendert jedes Blatt dieselbe 3D-Szene orthografisch (`ed/three/Renderer3D.ts:1059-1067`): den Körper sowie die
3D-Reifen (lila #8a7cff) und Loop-Ringe (orange), beide ohne Tiefentest. SVG-Reihenfolge (`View2D.tsx:583-712`), von unten
nach oben:

| Linie | Farbe | Breite | Strich / verdeckt | wann |
|---|---|---|---|---|
| Teilflächen (S4) | Rumpf #8e9aa6 (Füllung 0,08); Teile #e4572e, #e8a33d … (Füllung 0,34) | Rand 1,5 | verdeckter Teilumriss „4 4“, 1,25 px, 0,55 | Körper, Grundform, Teile an |
| Umrisse fremder Ansichten / innere Konturen | farbe: Seite #2b50d8, Front #a03cc8, Top #0f9e8e; ton: `--kurve` / `--kurve-spiegel` | 1,5 | verdeckt „3 4“, 1,25 px, 0,3 | nur „umrisse an“ |
| Spantringe | vorn #0b7a5c, hinten #bd4522 | 1,5 | verdeckt „3 4“, 0,3 | Kern, Grundform |
| P-Linien und Falten (Falten nur aus **scharfen** Käfigkanten) | eigene Seite grau→schwarz, Spiegel weiß α 0,5+0,5h | 1+2h, in Zehnteln gestuft | h < 0,03 „6 3“; < 0,12 „10 2,5“; < 0,25 „18 1,5“; darüber durchgezogen; verdeckt nur Deckkraft 0,25 | `NetzEbene.tsx:207-222`; `KantenEbene.tsx:24-35,61-66` |
| Widerspruch | #ff3b5c, α 0,5 | 9 | – | ab 1 px |
| S3-Marken (nur Front) | „nur Kante“ #ff9a1f, „anderes Teil“ #8a63ff | 6 | „7 5“ bzw. „1 7“ | mit „berühren“ |
| Spiegelhälfte | `--kurve-spiegel` (Papier #fff) | 3 | in einer Pose 1,5 px, „5 4“, 0,55 | Front, Top |
| eigene Linie | `--kurve` (Papier #19232b, Grün #000, Nacht #f4f1e4) | 3 | in einer Pose gestrichelte Grundlinie | – |
| Saum | #ffd54a, α 0,8 | 3 | – | Abweichung > 2 px |
| Loops | #ed8c26; unter dem Zeiger #ff2e9a; gewählt #00ffe1 | 1,75 / 2,5 | verdeckt „3 4“, 0,45 | Körper, Grundform |
| Vorschau ⌘R | #ffd400 | 2 | – | während ⌘R |
| Geist / Zwischenbilder | #ff2e9a | 2 / 1 | „7 5“ / „2 3“ | Posen & Leben |
| Linie der Pose | `--kurve` | 3 | – | Pose-Tab |
| Spant-Kurven (Front/Back) | Spantfarbe; Spiegel 0,4 | 1,5 (gewählt 3) | Unterkiefer „7 3“ | – |
| Spantlinien (Seite/Top) | Spantfarbe | 2 | Hauptspant H: #19232b, 1,5 px, „6 4“ | – |
| Ringe fremder Knoten | Ursprungsfarbe bzw. `--punkt` | Radius 4, 2 px | verdeckt 0,35 | – |
| Knoten | `--punkt` #00ffe1, Radius 5 | – | – | – |
| Maullinien | gleich #3fd6c0, oben #e0306a, unten #1832e6; Spiegel weiß 2 px | 3 | – | Maul |

## 7 Auffällige Doppelungen

- **Querschnitt auf vier Wegen:** Front-Lappen (heute), Spanten-Überblendung (sobald ein Spant existiert), „Umrisse berühren“
  und „aus der Hülle“; dazu Kiefer-Spant und Baum-Lappen. Der Fülle-Chip wirkt je nach Querschnitt-Chip als „berühren“ oder
  als Obergrenze der Hülle.
- **Fünf Quellen für Ringe:** Ringwahl (24, eingefroren), Ecken, Reifen, Linienringe, Loops.
- **Spant = Reifen unter zwei Namen:** Das Dock sagt „Reifen“, der Werkzeug-Hinweis „Spant“. Im Blatt erscheint er dreifach:
  als gerade Spantlinie, als Spantring auf der Haut und als 3D-Linie.
- **Viel Silhouetten- und Diagnose-Maschinerie:** S4-Teile, Δ, Saum und Widerspruch laufen in jedem genauen Bau und färben die
  Blätter. Umrisse je Teil des gebauten Körpers gibt es nicht. **Weiche Käfigkanten werden gar nicht gezeichnet** (Falten nur,
  wo die Kante scharf ist).
- **Verdeckte Linien uneinheitlich:** „3 4“/0,3 · „3 4“/0,45 · nur 0,25 · „4 4“/0,55.
- **„Teile“ dreifach belegt:** Stufe ⌘5 (Säulenbeine), Körper „Teile“ (Baum), Teile-Liste aus S4.
- **Ohne Wirkung oder unerreichbar:** `k/umrisse.ts`, die P-Linien-„Tiefe“, eigene Teilkurven, `reifenNeuAmZeiger`.
