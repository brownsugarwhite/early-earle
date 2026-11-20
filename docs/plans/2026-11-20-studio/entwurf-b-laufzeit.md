# Studio, Entwurf B: Eine Laufzeit

Stand 20.11.2026. Einer von drei unabhängigen Entwürfen für den Editor „Studio“. Blickwinkel B: vom Datenmodell und von der Rechenkette
her, damit Editor und Spiel denselben Code rechnen, deterministisch, schnell und prüfbar. Grundlage sind der
[Gesamtbericht](../../research/2026-11-20-editor-recherche.md) und die 17 Einzelberichte (Kürzel wie dort). Eigene Schätzungen sind
markiert, auf dem iPhone ist nichts gemessen, „bestanden“ sagt nur Florian.

## 0 Kurzfassung

Studio ist ein Editor für Vektorfiguren und zugleich die Laufzeit, die sie im Spiel abspielt. Editor und Spiel laden dieselbe Datei und
rufen dieselben Funktionen auf: Was Florian im Editor sieht, ist das Spiel, angehalten. Ozzy ist in Ruhe genau seine Zeichnung, weil
jede Stufe der Rechnung an den Schlüsseln exakt ist und alles Gerechnete in Ruhe null ist.

1. **Alles, was sich bewegt, ist ein Regler:** Kopf- und Knochenwinkel, Gewicht einer Pose, Fortschritt eines Übergangs, Gangphase,
   Neigung, Ausgang einer Feder, Effektstärke, Lage der Figur.
2. **Zwei Arten, an einem Regler zu hängen:** die **Bindung** (Form eines Teils, Schlüssel mit Gestalt oder Versatz) und der **Draht**
   (ein Wert, Kennlinie). Ansichtsschlüssel, Formziele, Korrekturen, Übergangsformen, Zyklen, gestaltete Übergänge und die Drähte des
   Spiels sind damit derselbe Mechanismus.
3. **Knochen bewegen starr, Bindungen formen.** Gespeichert wird vor dem Skinning, Griffe erben, die Glätte steht im Format.
4. **Datei → Bauplan → Takt → Bild:** gepackte Felder, inkrementell je Datensatz; ein fester 60-Hz-Takt mit eigenen Winkelfunktionen,
   wiederholbar über Geräte; Formen einmal je Bild aus gemischten Reglern; Abstandsfeld-Renderer.
5. **Ein Store mit Datensatz-Diffs** für Rückgängig, Speichern, Live-Verbindung und Bauplan; eine **Schutzregel** verbietet Automatiken
   und KI-Sitzungen, Florians Schlüssel anzurühren.
6. **Die Kopfdrehung wird als Daten übernommen,** in ihrer heutigen Mischart und mit Paritätstest gegen den Prototyp. Studio enthält
   keinen Code, der ein Teil von Ozzy nennt.
7. **Verträge zuerst,** danach getrennte Bahnen in getrennten Ordnern, jede mit eigener Probe.

**Besser als Spine und Rive:** vektornativ mit Verschmelzen und Verjüngungen (01, 10); Gewichte je Anker und Griff mit garantierter
Glätte (02); Korrekturen an Knochenwinkeln ohne Skript (02 Empf. 6); Übergänge mit eigenen Zwischenformen (01, 05); Physik eingebaut
und in Ruhe null (08); Logik als Sätze mit „Warum?“ (14b); keine Exportversionen (11 §5.1); iPad mit Stift; kein globaler Modus.

## 1 Zeitmodell

Der Reglerraum ist der Unterbau, Posen und Übergänge ordnen ihn, Zeit ist ein Antrieb unter anderen (Gesamtbericht 3.1).

| Prinzip | trägt Reaktion aufs Rad | trägt Timing eines Gags | Urteil |
|---|---|---|---|
| Klassische Zeitleiste | nein | ja | nur als Taktleiste im gestalteten Übergang |
| Zustandsgraph | bis etwa acht Zustände (05 §4.1) | kaum | Ansicht; Automat im Baustein Vierbeiner |
| **Regler, Posen, Übergänge** | ja | mit Taktleiste | **gewählt** |
| Aufnahme | nein | ja | Eingabe in jede Leiste (05 §5.9) |

Ozzy verbringt fast seine ganze Zeit mit Reaktionen, die eine Zeitleiste als Clips vorwegnehmen müsste; im Reglerraum liegt jede
Zwischenstellung auf Florians Schlüsseln. In der Laufzeit ist Zeit die Taktnummer n: Dauern stehen in Sekunden in der Datei und werden
als n/60 gelesen; Zeitlupe ändert nur das Takt-Tempo (14a §3f). Ohne Physik ist ein Übergang eine reine Funktion seines Fortschritts,
mit Physik springt das Scrubben zum letzten Schlüsselstand und rechnet höchstens 15 Takte nach.

## 2 Formen und Morph

### 2.1 Datentypen

Eine Form, viele Zustände: Alle Schlüssel eines Teils haben dieselben Anker in derselben Reihenfolge, die Zuordnung wird nie geraten
(Gesamtbericht 4.6). Hilfstypen wie `Vec2`, `Lage`, `Stoff` legt der Vertrag fest (12.2).

```ts
type Id<V extends string> = `${V}_${string}`;          // Typvorsilbe + Zufall, fest über Umbenennen
type Herkunft = 'vorlage' | 'dein' | 'gebaut' | 'falte' | 'automatik';
interface Feder { dauer: number; federung: number; vorgriff?: number }   // innen f = 1/dauer, ζ = 1 − federung
type AnkerZeile = number[];      // glatt [x, y, w, lEin, lAus], Ein-Griff nach w + 180°; Ecke [x, y, wEin, lEin, wAus, lAus]
type Form = AnkerZeile[];
type VersatzZeile = number[];    // im mitlaufenden Rahmen: längs, quer (relativ zur örtlichen Größe), Winkel, Längen

interface Teil { id: Id<'teil'>; figur: Id<'fig'>; name: string; rolle?: string; farbe: string; ebene: string;
  anker: Id<'an'>[];             // Reihenfolge, nach der sich jede Zeile richtet
  grundform?: Form; traeger?: Id<'teil'> }                  // Grundform nur ohne Ansichts-Bindung
interface Regler { id: Id<'rg'>; besitzer: Id<'fig'> | Id<'sz'>; name: string; art: 'linie' | 'kreis';
  bereich: [number, number]; standard: number; ausgleich: Feder; hoechsttempo?: number;
  spiegel?: { mitte: number; paare: [Id<'teil'>, Id<'teil'>][]; anker?: Record<string, number[]> } }
interface Bindung { id: Id<'bd'>; teil: Id<'teil'>; achsen: Id<'rg'>[];  // eine oder zwei Achsen
  wirkung: 'ansicht' | 'zusatz';                            // Gestalt ersetzen oder Versatz addieren
  mischart: 'rahmenRest' | 'koordinaten' | 'linear'; periodisch?: boolean;
  abschnitte?: { von: number; bis: number; schluessel: Id<'sl'>[] }[] }   // nur übernommene Daten
interface Schluessel { id: Id<'sl'>; bindung: Id<'bd'>; an: number[];
  gestalt?: Form; versatz?: VersatzZeile[];                 // je nach Wirkung genau eines
  herkunft: Herkunft; grund?: string; ruht?: boolean; stuetze?: boolean }
interface Wechsel { id: Id<'we'>; regler: Id<'rg'>; an: number; breite: number;   // Breite 0 = hart
  tausch?: [Id<'teil'>, Id<'teil'>]; sichtbar?: { teil: Id<'teil'>; ab: boolean } }
```

Ein Teil hat eine Grundform oder genau eine Ansichts-Bindung (eine Hauptachse je Teil, 04 §7.3). Zusatz-Bindungen gibt es beliebig
viele; jede hat an der Ruhestelle ihrer Achsen einen festen Nullschlüssel, also ist jeder Zusatz in Ruhe null.

### 2.2 Griffe im Format

| Weg | Glätte im Format | Urteil |
|---|---|---|
| absolut wie im Prototyp (`[px, py, ix, iy, ox, oy]`) | nein, Runden kann knicken | nur Import |
| **polar mit absolutem Winkel; glatt: ein Winkel, zwei Längen** | ja | **gewählt** (Gesamtbericht 3.8, 02 Empf. 1) |
| polar relativ zur Tangente | ja | nein, bindet die Datei an eine Mischart |

Glatt heißt beim Import: Griffe höchstens 0,2° neben einer Linie, Kurve um höchstens 0,05 Einheiten verschoben (eigene Schwellen);
sonst bleibt der Anker eine Ecke mit genau seinen Winkeln, und die Zeichnung bleibt exakt. Gerundet wird auf 1/1000 Einheit und
1/100 000 Grad; ein Rundweg-Test an allen Schlüsseln Florians verlangt höchstens 0,001 Abweichung.

### 2.3 Mischarten und Schlüsselarten

- **`rahmenRest`, Standard für alles Neue:** je Schlüssel Drehung und Größe (Procrustes), Rest im Rahmen, Griffe relativ zur Tangente,
  PCHIP über Winkel, Logarithmus der Größe, Mitte und Reste (06 §2.6). Exakt an Schlüsseln, schrumpft beim Drehen nicht; `aehnlich` und
  `winkel` des Prototyps sind Sonderfälle.
- **`koordinaten`, Florians Kopfdrehung:** genau `formAusSchluesseln` aus `raster.ts` (PCHIP je Koordinate, Griffe nach Winkel und Länge,
  gerade ab 100° Schwenk). Gewechselt wird nur nach Vergleichsbild und Florians Wort (Probe S3).
- **Kreisregler** periodisch (06 §2.5); die übernommene Kopfdrehung mit `periodisch: false` wie heute, S3 zeigt das Abprallen an der
  Front daneben (04 §7.3). **Zwei Achsen** brauchen ein volles Raster, Lücken füllt der Editor mit gebauten Schlüsseln (04 §6).
- **Abschnitte und Stützschlüssel** nur für die Übernahme: Der Prototyp mischt 0° bis 90° aus einer anderen Liste als 90° bis 270°, mit
  einem Anschluss hinter 90°, der nur die Steigung formt (`kopfVorn`, `anschlussBauen`).
- **Spiegelregel** am Regler (heute `PARTNER_KOPF`, `NASE_SPIEGEL`); Formen in der zweiten Hälfte werden der gespiegelte Schlüssel des
  Partners. **Falten** sind Schlüssel mit Herkunft `falte`: Der Wächter erkennt die Sehnenumkehr auf den Resten (06 §3.1), der Editor
  setzt im selben Rückgängig-Schritt einen Faltschlüssel wie `faltSchluessel` heute, sichtbar und formbar.

### 2.4 Zusätze

Ein Zusatz speichert je Anker einen Versatz im mitlaufenden Rahmen der gezeigten Hauptform: längs und quer zur Tangente, geteilt durch die
örtliche Größe L, dazu Winkel und Längen der Griffe (04 §7.4, 06 §2.3). Glatte Anker haben einen gemeinsamen Winkelversatz, also bleibt
auch die Summe vieler Zusätze glatt (06 §8); ändert Florian später einen Ansichtsschlüssel, folgt der Zusatz. Was ein Zusatz ist, sagt
nur seine Achse: Formziel (freier Regler), Korrekturform oder Kreuzschlüssel (Knochenwinkel), Posenkorrektur (Gewicht der Pose),
Übergangsform (Fortschritt, Null bei 0 und 1), Nachschwingen zwischen gezeichneten Formen (Ausgang einer Feder).

### 2.5 Anker, Auswertung, Florians Schlüssel

- **Anker hinzufügen** ist eine Transaktion über alle Zustände: Kennung in `Teil.anker`, de Casteljau an derselben Stelle (Stück k,
  Parameter t) in jedem Ansichtsschlüssel (02 Empf. 2), gemittelte Versätze und Gewichte. Löschen nimmt ihn überall heraus; steht er in
  einem Schlüssel Florians, darf nur Florian das.
- **Auswertung** aus gepackten Feldern (10.6, 10.7): je Anker sechs Zahlen (Anker, zwei Griffspitzen) in einem vorab angelegten
  `Float64Array`. Exakt an Schlüsseln (unter 10⁻⁹), glatt bleibt glatt, stetig in den Reglern; springen können nur Regler, und das fängt
  der Ausgleich (5.2).
- **Florians Schlüssel** (`dein`) sind geschützt (10.4). Setzt er einen, ruhen gebaute desselben Teils näher als 4°, statt zu
  verschwinden (heute `KORREKTUR_NAH`). `schluessel.json` liest Studio nur; die Übernahme ist wiederholbar, bis er in Studio weiterformt.

## 3 Knochen und Gewichte

### 3.1 Drei Teilarten

| Teilart | Bewegung | für Ozzy |
|---|---|---|
| **starr** | ein Knochen, Gewicht 1; die Naht schließt der Renderer | Kopf, Nase, Bart, Fenster |
| **Biegeachse** | Bézier-Achse mit fester Länge, Anker längs und quer dazu; IK von selbst, kein Einfallen | Beine, Schwanz, Ohren ohne Schlüssel, Bohne |
| **Gewichte** | bis vier Knochen je Anker, Drehzentren nach Le und Hodgins, lineares Mischen als Schalter | Hals, Bohne beim Biegen, wenn Florian es schöner findet |

Nach Gesamtbericht 3.2 c und 07 §3.3. Netz-Verformer gibt es nur als Werkzeug „Biegen“, dessen Ergebnis ein Schlüssel wird (06 §4.5).

### 3.2 Datentypen

```ts
interface Knochen { id: Id<'kn'>; figur: Id<'fig'>; name: string; eltern?: Id<'kn'>;
  gelenk: Vec2; winkel: Id<'rg'>;                          // ein Knochenwinkel ist ein Regler (04 §7.6)
  verschiebung?: [Id<'rg'>, Id<'rg'>];                      // etwa der Kopf am Hals, je Kopfwinkel und Haltung
  anheftung?: { teil: Id<'teil'>; anker: Id<'an'>[]; gewichte: number[] };   // reitet auf der gemorphten Elternform
  achse?: { ruhe: number[]; laenge: number;                 // Biegeachse: Bézier der Grundansicht, Länge bleibt
    ziel: [Id<'rg'>, Id<'rg'>]; biegung: [Id<'rg'>, Id<'rg'>]; beugung: 1 | -1 } }   // Pose, IK, Physik stellen dieselben Regler
interface Haut { id: Id<'ht'>; teil: Id<'teil'>; art: 'starr' | 'achse' | 'gewichte'; knochen: Id<'kn'>[];
  gewichte?: [number, number][][];    // je Anker bis vier Paare [Knochen, Gewicht], Summe 1
  griffe?: (GriffSatz | null)[];      // je Anker; null = erbt
  mischung?: 'drehzentren' | 'linear'; gepinnt: Id<'an'>[]; herkunft: Herkunft }
type GriffSatz = { paar: [number, number][] } | { ein: [number, number][]; aus: [number, number][] };   // glatt: ein Satz, Ecke: zwei
```

In die Datei kommt, was Florian sehen und ändern kann, auch wenn eine Automatik es vorschlug (Knochen, Achsen, Gewichte, Griffsätze);
Drehzentren, MLS-Gewichte und die Lage der Anker an ihrer Achse rechnet der Bauplan. Die Achse reitet je Ansichtsschlüssel mit starrer
MLS auf dem eigenen Teil mit; die Ankerlagen haben einen kleinen Rest längs, damit die Haut in Ruhe in jeder Ansicht exakt die Identität ist.

### 3.3 Gewichte auf Ankern und Griffen

1. **Griffe erben** die gemischte lineare Abbildung ihres Ankers (h' = R̄·S̄·h). Sie erhält Gegenläufigkeit und Längenverhältnis: glatt
   bleibt exakt glatt (06 §4.4).
2. **Weicht Florian ab,** bekommt ein glatter Anker einen Satz für sein Griffpaar (exakt glatt ohne Reparatur, 03 §11.3), eine Ecke je
   Griff einen. So wirken Knochen auf einzelne Anker verschieden stark und, wo es Sinn macht, auf einzelne Griffe.
3. **Glätte-Schutz** (gemeinsame Richtung d ∝ |v|·v − |u|·u, Längen bleiben) nur nach Stufen, die die Glätte nicht selbst halten: Sätze je
   Griff an glatten Ankern aus alten Ständen und die flüchtige Physik; nie an Ecken, nie in die Datei.
4. **Vorschläge** des Autorigs kommen aus dem Kurvenpunkt bei t = 1/3 und 2/3 (07 Schritt 6). Biegeachsen haben keine Griffsätze.

Gezeigt als Wärme und Ring am Anker, geändert durch Ziehen am Anker oder Gelenkring; der Pinsel ist Fachwerkzeug (Gesamtbericht 3.4 c).

### 3.4 Zusammenspiel von Morph und Knochen

Je Bild in fester Folge: **Ansicht** (Gestalt aus Kopf- und Körperwinkel) → **Anheftung** (Gelenke reiten mit starrer MLS auf der
gemorphten Elternform, Ohrgelenke wandern ohne Schlüssel mit, 07 Schritt 7) → **Zusätze**, darunter die Korrekturen an den Winkeln des
Takts, die die Physik schon bewegt hat (ein schwingender Schwanz löst seine Korrektur aus, Gesamtbericht 4.6 Punkt 11) → **Haut**, vor der
die Korrekturen liegen, damit sie mitdrehen (06 §6.1) → **flüchtig** (Formabgleich, Glätte-Schutz; in Ruhe null, nie gespeichert).

Ein Versatz vor der Drehzentren-Haut dreht mit der normierten Drehung R̄ und schrumpft nicht; je Einfluss gespeichert (Σ wⱼRⱼδ) würde
er am Gelenk bei halben Gewichten um bis zu cos(Δφ/2) kürzer (eigene Herleitung, Faktor wie 06 §2.1). Drehzentren werden je
Ansichtsschlüssel vorgerechnet und mitgemischt (Gesamtbericht 4.6 Punkt 9).

### 3.5 Rückrechnung: wohin ein Zug geht

Der Editor hat keine eigene Geometrie, er fragt die Laufzeit:

```ts
function rueckrechnen(plan: Bauplan, stand: BildStand, zug: { teil: Id<'teil'>; anker: number; griff?: 'ein' | 'aus'; nach: Vec2 },
                      stelle: AktiveStelle, geltung: 'hier' | 'allePosen' | 'grundform'): Aenderung;
```

Der Zug wird durch die Haut zurückgerechnet (Δ_ruhe = Mⱼ⁻¹·Δ; bei starren Teilen eine Drehung). Die **Zielregel** wählt den Datensatz:
Stelle auf einem Regler → Ansichtsschlüssel dort (innerhalb der Rasterweite der Leiste, beim Kopf 0,5°, sonst neu mit Herkunft `dein`,
wie heute); Pose → Posenkorrektur; Stelle im Übergang → Übergangsform; Knochenwinkel abseits der Ruhe → Korrekturform. Folgeänderungen
(Falten, ruhende Schlüssel, Autorig) gehören in dieselbe Transaktion. Eigenschaftstest: Danach liegt der gezogene Punkt auf 10⁻⁶ am
Ziel, und kein Schlüssel an einer anderen Stelle ändert sich.

## 4 Autorig

Verfahren nach 07 §4: Teile-Graph aus Überlappung, Enthaltensein und Kontakt; Vorlage als Daten (Vierbeiner zuerst, eine allgemeine für
alles andere); eine Achse je Teil; Rollen über die Ungarische Methode; Gewichte über die Achsen-Koordinate, Wärme nur für runde Teile,
BBW nur bei Bedarf; Federketten, Masse, Hüllen und Füße aus demselben Lauf (Gesamtbericht 3.4).

`autorig(figur, vorlage, gepinnt) → { aenderung, unsicher }` im Paket `studio-autorig`: ohne DOM, deterministisch, im dauerhaften
Worker, nach dem Loslassen, ≤ 50 ms (14c §5.5). Das Ergebnis ist eine gewöhnliche Änderung mit Herkunft `automatik`, ein
Rückgängig-Schritt; gepinnte Werte und Florians Datensätze bleiben. **Das Spiel enthält keinen Autorig**; ändert sich sein Code, ändert
sich Ozzy nicht von selbst. Bedienung nach 07 §5: „Knochen vorschlagen“, Probewackeln (ein eingebauter Zyklus derselben Laufzeit),
Fragezeichen nur bei Unsicherheit, Gelenkringe, Pinnen. Ozzys Rig kommt zuerst als Daten aus dem Prototyp, der Autorig mit der zweiten
Figur (Hebel aus Gesamtbericht 4.7); Probe: trifft `ELTER`, `PARTNER` und die Kopfteile ohne Namen (07 §9).

## 5 Posen und Übergänge

### 5.1 Datentypen und Übersetzung

```ts
type Kurve = 'glatt' | 'weich' | 'fallen' | 'auf' | 'linear';
interface Schicht { id: Id<'sch'>; figur: Id<'fig'>; name: string; ordnung: string; regler: Id<'rg'>[]; art: 'ersetzen' | 'addieren' }
interface Pose { id: Id<'po'>; schicht: Id<'sch'>; name: string; werte: [Id<'rg'>, number][]; gewicht: Id<'rg'>; verweilen?: Id<'zy'> }
interface Uebergang { id: Id<'ue'>; schicht: Id<'sch'>; von: Id<'po'> | 'jede'; nach: Id<'po'> | 'jede';
  art: 'standard' | 'ueber' | 'gestaltet' | 'gesperrt'; ueber?: Id<'po'>[]; feder?: Feder;
  fortschritt?: Id<'rg'>; abschnitte?: { nach: Id<'po'>; dauer: number; kurve: Kurve }[]; zusatz?: Id<'dr'>[];
  bleibt?: { von: number; bis: number; rollen: string[] }[]; marken?: { bei: number; ereignis: string }[];
  unterbrechen: 'sofort' | 'halt' | 'nie'; varianten?: { uebergang: Id<'ue'>; gewicht: number }[] }
interface Zyklus { id: Id<'zy'>; phase: Id<'rg'>; antrieb: 'zeit' | 'weg'; posen: { bei: number; pose: Id<'po'> }[]; kontakte?: { bei: number; rolle: string }[] }
```

Der Bauplan übersetzt alles in Regler, Bindungen und Drähte. Eine **Pose** ist ein Wertevektor mit einem Gewicht-Regler, ihre Korrektur
ein Zusatz daran. Ein **gestalteter Übergang** ist ein Fortschritt-Regler, den die Zeit schiebt, und je Regler ein Draht mit den
Zwischenposen als Stützpunkten; die Taktleiste ist eine Ansicht davon. Hüpfer und Wedeln des Prototyps werden Drähte, Plumps und
Seufzer Marken, die die Feder der Stauchung anstoßen. Ein **Zyklus** ist ein Kreisregler, den der Vierbeiner nach dem Weg schiebt und
beim Aufsetzen auf die Kontaktstelle zieht (Gesamtbericht 4.6 Punkt 16). „**Bleibt stehen**“ verschiebt die Lage der Figur, bis die
genannten Rollen in der Welt stehen bleiben.

### 5.2 Ausgleich je Regler

Jeder Regler hat Soll und Ist. Springt das Soll (Pose, Regel, Klick), wird der Unterschied als Versatz übernommen und mit einer kritisch
gedämpften Feder auf null geführt, während das neue Soll ungebremst läuft (Trägheits-Ausgleich, 05 §2.7). Nichts hinkt nach wie bei der
Feder mit 16/s im Prototyp (rund 0,125 s, 05 §7). Beim Formen gilt Ist = Soll.

### 5.3 Jede Pose in jede andere

Je Schicht eine Tafel „von × nach“: leer heißt Standard (Ausgleich), ◆ gestaltet, „→ X“ über X, × gesperrt, die Diagonale ist das
Verweilen (05 §5.5). Gespeichert wird nur die Abweichung; die Wegsuche über „über X“ ersetzt `weg()` aus `haltung.ts`. Unterbrochen wird
sofort, am nächsten Halt oder nie, von einem höheren Band immer sofort; Varianten wählt der Zufallsstrom der Schicht. Schichten für
Ozzy: Körper, Kopf und Blick, Gesicht, Physik.

## 6 Physik

**Weg B** (14a, Gesamtbericht 3.5): Box2D 3.2 als WebAssembly rechnet die Welt (Rad, Brust, Becken, Kopf, Stürze, lose Dinge), eine
eigene XPBD-Schicht die Figur (Nachschwingen, Ketten, Stauchung, Gelee), im selben Takt; Freigabe nach P1. `studio-laufzeit` legt die
Schnittstelle fest, `studio-welt` erfüllt sie, eine Attrappe dient den Tests (14a §6.2).

```ts
interface WeltAdapter {
  koerper(art: 'fest' | 'beweglich' | 'gefuehrt', lage: Lage, masse?: Masse): number; aktiv(k: number, an: boolean): void;
  huelle(k: number, form: Kreis | Kapsel | Vieleck | Kette, stoff: Stoff): number;
  scharnier(a: number, b: number, punkt: Vec2, motor?: { tempo: number; moment: number }): number;
  ziel(a: number, b: number, feder: Feder, hoechstkraft: number): number; zielSetzen(gelenk: number, lage: Lage): void;
  finger(an: boolean, punkt: Vec2, griff: number): void; federbein(k: number, strahl: Strahl, feder: Feder): void;
  kraftpaar(a: number, b: number, punkt: Vec2, kraft: Vec2): void;          // Vortrieb mit Rückwirkung aufs Rad
  strahl(von: Vec2, nach: Vec2, aus: Float64Array): boolean; zone(form: Kreis | Vieleck, lage: Lage): number;
  schritt(dt: number, teilschritte: number): void; lesen(aus: WeltPuffer): void;   // ein Aufruf für Lagen, Treffer, Zonen
  pruefsumme(): [number, number]; merken(): Uint8Array; zuruecksetzen(stand: Uint8Array): void;
}
interface Chip { id: Id<'ch'>; an: Id<'rg'> | Id<'kn'> | Id<'teil'>; art: string;   // 'pendel@1', 'kette@1', 'stauchung@1', 'gelee@1'
  feder: Feder; spannung?: number; eingaenge?: string[]; ausgang?: Id<'rg'>;
  mehr?: { staerke?: number; schwerkraft?: number; wind?: number; grenzen?: [number, number] } }
```

- **Eine Quelle, drei Ableitungen** (14a §6.3): Kette, Vielecke mit gebackenen Rundungen, Abstandsfeld für Fühler und Ozzys Hüllen je
  Haltung entstehen im Bauplan. Haltungen wirken über Gelenkziele; keine Hülle wird je Takt umgeformt.
- **Federn schreiben in Regler** (Gesamtbericht 4.6 Punkt 5): Ein Ohr-Pendel schreibt seinen Ausschlag in einen Regler, an dem
  Florians Formen „Ohr vorn“ und „Ohr hinten“ als Zusatz hängen. Freies Wackeln nur als Chip „Gelee“, nie an Ozzys Gesicht. Eine Feder
  für alles, auch für Ausgleich, Finger und Box2D; Startwerte aus 08 §9.7, ungemessen.
- **Ruhe = Zeichnung** ist ein Eigenschaftstest: Nach dem Ausschwingen weicht kein Anker mehr als 10⁻⁶ von der Pose ab.
- **Prüfstand** wie 08 §9.8 (Schubsen, Röntgen, Zeitlupe, „zehnmal gleich“, Spulen); Aufnehmen backt Regler-Verläufe in Schlüssel und
  Drähte.

## 7 Effekte und Rendern

Abstand ist die Sprache (10 §8.1); der Renderer des Prototyps wird verallgemeinert, nicht ersetzt.

```ts
interface Gruppe { id: Id<'gr'>; figur: Id<'fig'>; name: string; teile: Id<'teil'>[] }
interface Verbindung { id: Id<'vb'>; a: Id<'teil'> | Id<'gr'>; b: Id<'teil'> | Id<'gr'>; art: 'verschmelzen' | 'fuge'; mass: number | Id<'rg'> }
interface Effekt { id: Id<'ef'>; art: string; wo: (Id<'teil'> | Id<'gr'>)[]; profil: [number, number][];   // Kennlinie über dem Abstand
  staerke: number | Id<'rg'>; rauschen?: { koernung: number; tempo: number }; zeit?: 'fliessend' | 'gestuft'; an: boolean }
interface BildDaten { strecken: Float32Array; faecher: Float32Array; teile: Uint32Array; rahmen: Float32Array; werte: Float32Array }   // je Bild
interface Zeichner { modell(m: ZeichenModell): void; zeichne(d: BildDaten): void; verloren(): boolean }
```

- **Zeichenmodell als Daten** (10 §8.3), daraus der Bildshader, neu übersetzt nur bei Strukturänderung; Zahlen als Uniforms aus
  Reglern. Aus dem Prototyp: `FLUESSIG` je Gruppenpaar wird Verbindungen, der Ohrspalt eine Fuge, `durchbruch` die Dickenregel,
  `deckung` ein Wechsel mit Breite, `Verdecker` ein Effekt.
- **Stufe 1** (10 §8.5, 14c): Felder nur im Rahmen jeder Figur, ein Feldsatz je Figur, feste Stückzahl nach Wang, unter 100 Aufrufe,
  nach Kontextverlust neu aus dem Bauplan; halbe Felder nur nach Vorher-Nachher-Bild; Kachel-Durchgang und WebGPU als Reserve.
- **Effekte A:** Verschmelzen, Dickenregel, Linien mit Breitenprofil, Kantenglättung, Kontaktschatten, Dithering. **B:** Staub und
  Tropfen als verschmelzende Kreise, Schein, Auflösen, Wackeln für Momente, Beinschattierung in Bewegung. Schmier- und Aufprallbild sind
  gebaut, auf Ozzys Körper aber aus, bis Florian sie will (Gesamtbericht 4.6 Punkt 19). **Klang** hängt als Chip an seiner Ursache (14d).

## 8 Spiellogik ohne Code

Bausteine, Drähte und Regeln in drei Arten (in 14b „Karten“; das Wort bleibt nach Gesamtbericht 4.5 den Posen), Vorrang über fünf
Bänder je Kanal (14b §7).

```ts
interface Baustein { id: Id<'bs'>; art: string; an: string; regler: Record<string, number | Id<'rg'>>; posen?: Record<string, Id<'po'>> }
interface Draht { id: Id<'dr'>; quelle: Id<'rg'> | string; ziel: Id<'rg'>; kennlinie: { an: number; wert: number; kurve?: Kurve }[]; glaetten?: number }
type Regel = { id: Id<'re'>; ding: string; band: 'koerper' | 'regie' | 'spieler' | 'laune' | 'grund'; ordnung: string } & (
  | { art: 'sobald'; ereignis: string; falls?: Bedingung[]; dann: Aktion[]; hoechstensAlle?: number }
  | { art: 'solange'; wenn: Bedingung[]; halte: { kanal: string; wert: number | string }; mindestens?: number }
  | { art: 'laune'; wenn: string; haeufigkeit: number | Id<'rg'>; ankuendigung: { pose: Id<'po'>; dauer: number };
      wirkung: { soll: [string, number][]; pose?: Id<'po'>; dauer: [number, number] }; ende: string[]; ruhezeit: number });
interface Bausteinart<D> { art: string; version: number; schema: ZodType<D>;
  messwerte: string[]; zustaende: string[]; ereignisse: string[]; befehle: string[]; kanaele: string[];
  anlegen(daten: D, plan: Bauplan, welt: WeltAdapter): BausteinLauf }
```

- **Ein Draht für Figur und Spiel:** Neigung → Balance ist derselbe Datensatz wie Gangphase → Beinwinkel; Drähte bilden einen Graphen
  ohne Kreis und schreiben nie Zustände.
- **Unendlich erweiterbar:** Bausteine, Effekte und Chips sind registrierte Arten mit Version, Schema und Migrationen; ihre Anschlüsse
  erscheinen ohne weiteren Code in Bedienung, Regeln und Prüfer.
- **Im Takt** (14b §7.6): Regeln prüfen gegen den Stand von n−1, je Kanal gewinnt das höhere Band, dann der Listenplatz. Das Stolpern
  löst der Vierbeiner aus gemessenen Größen aus (14b §7.10); Zufall nur bei Entscheidungen, aus Strömen je Quelle und Regel.
- **Warum?** liest einen Ringpuffer der Entscheidungen, auch für Regler („Ohr links: Pendel + Pose Erschrecken + Draht von Neigung“).

## 9 Bedienung

Grammatik, Linsen und Bildschirm wie Gesamtbericht 4.2 und 12 §6: Tippen wählt, Ziehen ändert an der aktiven Stelle, Halten zeigt mehr,
Doppeltippen geht hinein; Linsen Form, Knochen, Physik, Spiel; unten Posenkarten und **eine Leiste für jeden Regler** aus der heutigen
Zeitleiste (J und K, Z Zwiebelhaut, ⇧Z Bahnen, Farben nach Herkunft). Was die eine Laufzeit beiträgt:

- **Die aktive Stelle ist die Eingabe der Zielregel** (3.5), sichtbar an Tropfen, Randfarbe und Geltungs-Chip; ob sie ohne Modus
  trägt, entscheidet S7.
- **Alles kommt aus der Laufzeit:** Bühne, Anker, Zwiebelhaut und Bahnen kommen aus denselben Ankerfeldern; Werkzeuge schreiben nur über
  `rueckrechnen` und den Store. ▶ startet den Takt, und jede Berührung gehört dem Spiel; Anhalten stoppt ihn, geformt wird an dieser Stelle.
- **Mac** mit Befehlsregister und 60-Hz-Vorschau; **iPad:** ist ein Stift erkannt, formt nur er (Gesamtbericht 4.6 Punkt 25);
  **iPhone:** spielen, ansehen, kleine Korrekturen. Prüfer und Kostenampel lesen dieselben Zähler wie Tests und Messseite.

## 10 Technik

### 10.1 Ein Mechanismus, wo es geht; zwei, wo es muss

**Ein Mechanismus:** der *Regler* für alles Bewegte; die *Bindung* für jede Formänderung an einem Regler (2.1 bis 2.4); der *Draht* für
Treiber, Zyklen, gestaltete Übergänge, Spiel-Drähte und den Antrieb von Effekten; die *Feder* für Ausgleich, Chips, Finger und Box2D;
*Herkunft mit Schutzregel* für Leiste, Autorig, KI-Sitzungen und Migrationen; der *Datensatz-Diff* für Rückgängig, Speichern,
Live-Verbindung und Bauplan; *Takt und Lauf-Datei* für Physik, Logik, Spulen, Beweise und Fehlerberichte; der *Abstand* für Bild,
Schatten, Fühler und Teilchen.

| Bewusst zwei | warum |
|---|---|
| Knochen und Bindungen | Drehungen als Formen gemischt schrumpfen; Formen als Knochen verlieren Florians Gestalt |
| Box2D-Welt und XPBD-Figur | Kontakte gegen Federn auf seinen Formen (14a §4) |
| Draht und Regel | stetig gegen Ereignis; Laien verwechseln beides (14b §3.2) |
| Dokument und Lauf | Entscheidungen gegen Simulation; Rückgängig gilt nur für Entscheidungen |
| Simulations- und Anzeigepfad | wiederholbar gegen frei (10.8) |
| `koordinaten` und `rahmenRest` | Florians Kopfdrehung bleibt, bis sein Auge anders entscheidet |

### 10.2 Pakete und Abhängigkeiten

| Paket | Inhalt | importiert |
|---|---|---|
| `studio-rechnen` | Winkel- und Exponentialfunktionen als Port der fdlibm (frei mit Hinweispflicht; eigene Kenntnis), PCHIP, Bernstein, Wang, xoshiro128**, Prüfsumme | nichts |
| `studio-format` | Typen, zod-Schemas, Migrationen, Schreiber, SVG-Import | rechnen |
| `studio-store` | Datensätze, Diffs, Verlauf, Schutzregel, Zusammenführen | format |
| `studio-laufzeit` | Bauplan, Regler, Form, Knochen, Posen, Logik, Figurphysik, Takt; `editor/` mit Rückrechnung und Wächter | rechnen, format |
| `studio-welt` | Box2D über `box2d3-wasm` (`compat`, einfädig) | Typen der Laufzeit |
| `studio-bild`, `studio-ton` | WebGL2-Renderer; Ton über Web Audio | Typen der Laufzeit |
| `studio-autorig` | Autorig im Worker | format, rechnen |
| `apps/studio` | Editor (Vite, Port 5217): Bühne, Leiste, Werkzeuge in eigenem Code, Felder und Menüs mit React 19.3 | alle Pakete |
| `apps/ozzy-spiel` | Demo, später mit Capacitor | laufzeit, welt, bild, ton |

Der Rechner prüft: Pakete ohne DOM haben kein `DOM` in `lib`; in Laufzeit und Welt verbietet eine Lint-Regel `Math.sin`, `cos`,
`atan2`, `exp`, `log`, `pow`, `hypot`, `random` und Uhren; das Spiel importiert weder Store noch `laufzeit/editor` noch React; kein Paket
importiert aus einer App. Aus `apps/editor` wird kopiert, nie importiert; Florian arbeitet aus einem festen Stand (Gesamtbericht 4.1).

### 10.3 Datenmodell

Kennungen mit Typvorsilbe, Eltern als Zeiger am Kind, Reihenfolge über Bruchindizes (11 §5.2). Die Typen stehen bei ihren Bereichen
(2.1, 3.2, 5.1, 6, 7, 8); dazu:

```ts
interface Dokument { format: 'studio'; versionen: Record<string, number>; datensaetze: Record<string, Record<string, Datensatz>> }
interface Figur { id: Id<'fig'>; name: string; vorlage?: string; wurzel?: Id<'kn'>; lage: [Id<'rg'>, Id<'rg'>, Id<'rg'>] }
interface Welt { id: Id<'welt'>; schwerkraft: number; haftung: number; rad: { teil: Id<'teil'>; gewicht: number; lagerreibung: number } }
interface Ding { id: Id<'di'>; welt: Id<'welt'>; figur: Id<'fig'>; rolle: 'fest' | 'lose' | 'zone' | 'bild'; lage: { winkel: number; hoehe: number }; stoff: Stoff }
interface Szene { id: Id<'sz'>; welt: Id<'welt'>; figuren: { figur: Id<'fig'>; lage: Vec2 }[]; dinge: Id<'di'>[]; bausteine: Id<'bs'>[]; saat: number }
```

**Alles Gezeichnete ist eine Figur** (Ozzy, Rad, Stamm, Wurst, Schmetterling); ein Ding stellt eine Figur mit einer Rolle in eine Welt.
So gibt es nur einen Weg zu zeichnen und zu bewegen. Figuren liegen in `figuren/<name>.json`, Welten mit Dingen, Bausteinen und Regeln
in `szenen/<name>.json`.

### 10.4 Store, Diffs, Rückgängig

```ts
interface Diff { neu: Datensatz[]; weg: Datensatz[]; geaendert: [vorher: Datensatz, nachher: Datensatz][] }
interface Store {
  aendern(quelle: 'florian' | 'automatik' | 'ki' | 'migration', tun: (e: Entwurf) => void): Diff | Abgelehnt;
  gesteBeginnen(): number; gesteBeenden(marke: number): void; zurueck(): boolean; wieder(): boolean;
  fremdUebernehmen(d: Diff): Abweichung[]; abonnieren(hoerer: (t: Transaktion) => void): () => void;
}
```

Ein eigener kleiner Store wie bei tldraw (11 §4.2): unveränderliche Datensätze, der Diff entsteht aus dem Vergleich der Verweise.

- **Ein Diff, fünf Abnehmer:** Verlauf; Speichern 300 ms nach der letzten Änderung über den Dev-Server mit Revision (11 §6.2); Journal in
  IndexedDB; Live-Verbindung zum Spiel (Probe: unter 0,5 s auf dem iPhone, 11 §12.3); Bauplan.
- **Verlauf:** Eine Geste ist ein Schritt samt Folgeänderungen, die Auswahl reist mit (11 §4.2). ⌘Z setzt die alten Verweise zurück,
  und die Caches des Bauplans treffen wieder.
- **Schutzregel:** Die Quellen `automatik`, `ki` und `migration` dürfen Datensätze mit Herkunft `dein` und gepinnte Werte weder ändern noch
  löschen; der Store lehnt ab und nennt sie. „Seine Schlüssel nie löschen“ wird eine Eigenschaft des Codes.
- **Fremde Änderungen** werden je Datensatz zusammengeführt; beidseitig geändert gewinnt Florian, die andere Fassung kommt in
  „Abweichungen“, nie in seinen Verlauf (11 §6.3).

### 10.5 Format

- **Ablage** unter `content/studio/ozzy/`: `projekt.json`, `figuren/*.json`, `szenen/*.json`, `vorlagen/<hash>.svg` (Florians Originale),
  `laeufe/*.json`. Nichts in der Datei, was eine feste Rechnung ableitet (Abflachung, Steigungen, Drehzentren, Kette, Laufzustand).
- **Versionen je Block und je Art,** Migrationen nur vorwärts, jede mit einer Prüfdatei aus Florians Ozzy:
  `interface Migration { block: string; nach: number; schritt(roh: unknown): unknown; pruefdatei: string }`. `laden(text)` wendet sie und
  zod an und öffnet bei neuerer Datei oder unbekannter Art nur zum Lesen.
- **Deterministisch schreiben:** Schlüsselfolge des Schemas, Datensätze nach Kennung, Koordinaten auf 1/1000, Winkel auf 1/100 000 Grad,
  ohne Exponent, −0 als 0, eine Zeile je Anker, LF; `schreiben(laden(schreiben(d)))` ist byteweise gleich; atomar über Umbenennen
  (11 §5.2). Die Spieldatei ist dieselbe ohne Editor-Datensätze; binär erst bei messbarem Bedarf (11 §5.3).

### 10.6 Bauplan

`bauen(dokument, alterPlan?)` übersetzt Datensätze in dichte Felder; jeder Teilplan merkt sich die Verweise seiner Quellen.

| Teilplan | enthält |
|---|---|
| Ordnung | dichte Nummern; Folge der Regler nach Drähten (ein Kreis ist ein Hinweis) |
| Form | Schlüsselstellen, Rahmen, Reste, Griffe im Tangentenbezug, PCHIP-Steigungen (periodisch), Spiegelschlüssel, Abschnitte |
| Knochen und Haut | Baumfolge, MLS-Gewichte, gepackte Gewichte, Drehzentren und Achsenlagen je Ansichtsschlüssel |
| Abflachen | Stückzahl je Kurvenstück nach Wang über alle Schlüssel, Bernstein-Tabellen (14c §5.2) |
| Posen | Wertevektoren, Tafel, die übersetzten Drähte und Zusätze der Übergänge |
| Physik | XPBD-Bedingungen, Kette, Vielecke, Abstandsfeld der Welt, Hüllen je Haltung |
| Logik und Zeichen | Regeln in Bandfolge, Kanäle, Zufallsströme; Zeichenmodell, Shaderquelle, Uniform-Tabelle |

Neu gebaut wird nur, was von einem geänderten Datensatz abhängt; bei neuen Kennungen zieht der Lauf über die Kennungen in die neuen
Felder um. Prüfung: Voller und inkrementeller Neubau nach zufälligen Diffs ergeben gleiche Felder.

### 10.7 Die Rechenkette als Module

Gesamtbericht 4.4 als Module in `studio-laufzeit/src/`. Alle schreiben in vorab angelegte Felder und legen im Bildtakt nichts an.

```ts
// je Takt n (1/60 s)
eingabeLesen(lauf: Lauf, roh: RohEingabe): void                                   //  1 takt/eingabe.ts
postfachOeffnen(lauf: Lauf): void                                                 //  2 logik/postfach.ts
regelnPruefen(plan: LogikPlan, lauf: Lauf, aus: Anforderungen): void              //  3 logik/regeln.ts
schichtenFortschreiben(plan: PosenPlan, lauf: Lauf, an: Anforderungen): void      //  4 posen/schichten.ts
reglerDurchlauf(plan: ReglerPlan, lauf: Lauf): void                               //  5 regler/durchlauf.ts: Soll aus Schicht, Draht, Hand; Ausgleich
weltSchritt(plan: PhysikPlan, lauf: Lauf, welt: WeltAdapter): void                //  6 takt/welt.ts: Bausteine und Box2D, 4 Teilschritte
figurSchritt(plan: PhysikPlan, lauf: Lauf): void                                  //  7 physik/xpbd.ts, 4 Teilschritte
archivieren(lauf: Lauf): void                                                     //  8 takt/archiv.ts: Prüfsumme, alle 16 Takte ein Schlüsselstand
// je Bild
reglerMischen(lauf: Lauf, alpha: number, r: Float64Array): void                   //  9 regler/mischen.ts
ansichtAuswerten(plan: FormPlan, r: Float64Array, anker: Float64Array): void      // 10 form/ansicht.ts
gelenkeAnheften(plan: KnochenPlan, anker: Float64Array, ruhe: Float64Array): void // 11 knochen/anheftung.ts
zusaetzeAnwenden(plan: FormPlan, r: Float64Array, anker: Float64Array): void      // 12 form/zusatz.ts
haeuten(plan: KnochenPlan, r: Float64Array, ruhe: Float64Array, anker: Float64Array): void   // 13 knochen/haut.ts
fluechtig(plan: PhysikPlan, lauf: Lauf, anker: Float64Array): void                // 14 form/fluechtig.ts: Formabgleich, Glätte-Schutz
abflachen(plan: AbflachPlan, anker: Float64Array, aus: BildDaten): void           // 15 bild/abflachen.ts, dann zeichner.zeichne(aus)
waechter(plan: Bauplan, anker: Float64Array, aus: Marke[]): void                  // nur im Editor: editor/waechter.ts
```

Eine Fassade bündelt das gleich für Editor und Spiel: `bauen(dok)`, `starten(szene, saat, welt)`, `takt(roh)`, `bild(alpha, aus)`,
`regler.hand(id, wert)`, `merken()`, `zurueck(stand)`, `pruefsumme()`. Die Schritte 9 bis 15 sind reine Funktionen; braucht Schritt 7 ein
Gelenk (Wurzel der Schwanzkette), rechnet er 10 und 11 dafür im Takt mit. Anders als in Gesamtbericht 4.4 laufen die Drähte nach Regeln
und Posen.

### 10.8 Takt und Wiederholbarkeit

- **60 Hz** mit vier Teilschritten, höchstens fünf Takte je Bild, Zeitkappung 0,25 s (Gesamtbericht 4.3 Punkt 6). Gemischt werden Regler
  und Körperlagen, nicht Formen: Die Formen entstehen einmal je Bild und liegen damit immer auf Florians Schlüsseln; harte Wechsel
  schalten am Takt.
- **Der Lauf** besteht aus typisierten Feldern (Regler mit Soll, Ist, Versatz, Tempo; Schichten; Figurphysik; Logik; Zufallsströme;
  Protokoll) plus Box2D im WebAssembly. Ein Schlüsselstand kopiert sie samt Box2D-Snapshot alle 16 Takte, Budget 32 MB (14a §3e).
- **Zwei Pfade:** Der Simulationspfad (Laufzeit und Welt, auch die Formauswertung, weil sie in Gelenke und Hüllen fließt) rechnet nur
  mit `studio-rechnen`, den Grundrechenarten nach IEEE 754 und der Quadratwurzel; Box2D ist plattformübergreifend deterministisch (09).
  Der Anzeigepfad darf `Math` benutzen.
- **Prüfsumme** aus Box2D (`b2World_GetStateHash`), Figur und Logik. Eine **Lauf-Datei** (Ausgangslage, Saat, Protokoll) ist Beweis,
  Fehlerbericht, Pannen-Rückblick und Regressionstest zugleich; Snapshots werden nie Dateien.

### 10.9 Tempo-Budget

Ziel nach 14c §6 (iPhone 16 kalt, 60 Hz): Hauptthread ≤ 6 ms, Grafik ≤ 8 ms, GPU-Speicher ≤ 150 MB.

| Posten | Rechnung (14c) | Budget | Maßnahme |
|---|---|---|---|
| Auswerten, Skinning, Wächter | 0,1–0,4 ms (heute 1–2) | 0,5 ms | Vorrechenbares im Bauplan, typisierte Felder, keine Würfe |
| Abflachen | 0,1–0,3 ms | 0,3 ms | feste Stückzahl, Bernstein-Tabellen, dauerhafter Puffer |
| Zeichenbefehle | 0,2–0,5 ms | 0,5 ms | ein Puffer, unter 100 Aufrufe |
| Felder Ozzy; Bühne | 1,2–3,1; 2,2–5,1 ms | 3; 5 ms | Rahmen je Figur, halbe Felder nach Bild, Welt gebacken, Tropfen analytisch |
| Physik und Logik | 0,3–1 ms | 1,5 ms | ein gesammelter Aufruf über die Grenze, Logik in festen Feldern |
| eigene Winkelfunktionen | nicht gemessen | in „Auswerten“ | Messseite vergleicht mit `Math` |
| Bauplan beim Ziehen | eigene Schätzung unter 1 ms | 1 ms | nur betroffene Teilpläne |

Bis zur Messung: Prozessor am Mac in Safari mal 1, Grafik mal 3 bis 4 (14c §6.4). Ohne DOM kann die Laufzeit später ohne Umbau in einen
Worker.

### 10.10 Tests

| Ebene | prüft | Tor |
|---|---|---|
| Rechnen | Bitgleichheit der eigenen Funktionen in Node, Chromium und WebKit | jede Änderung |
| Format und Store | Migrationen an Florians Ozzy, Rundweg byteweise gleich; Geste ist ein Schritt, ⌘Z exakt, Schutzregel | jede Änderung |
| Eigenschaften (fast-check) | exakt an Schlüsseln, kein Sprung, glatt bleibt glatt, Ruhe = Zeichnung, Rückrechnung landet genau, inkrementell = voll | jede Änderung |
| Parität | Kopfdrehung gegen den Prototyp, 0° bis 360° in 0,5°, Abweichung unter 0,001 | E0, dann jede Änderung an `form/` |
| Determinismus | Prüfsumme nach 1 200 Takten gleich in Node, Chromium, WebKit; alle Lauf-Dateien | jede Änderung an Laufzeit oder Welt |
| Würfe | Speicherzuwachs über 10 000 Bilder (Node, `--expose-gc`) unter fester Schwelle | vor jeder Integration |
| Verträge | eine Testreihe gegen Box2D-Adapter und Attrappe | jede Vertragsänderung |
| Bild und Abläufe | Ausschnitte gegen freigegebene Bilder; Playwright mit gesteuerter Uhr | Etappenende |

Tests zählen Takte, arbeiten an Kopien und prüfen, dass Florians Dateien unberührt sind. Kein Test ersetzt sein Auge.

### 10.11 Wiederverwendung des Prototyps

| Prototyp | in Studio |
|---|---|
| `form.ts` | Kopie, auf Felder umgebaut; `pchip` mit vorab gerechneten Steigungen; `teilen` und `ankerErgaenzen` werden Befehle |
| `raster.ts` | nicht portiert: Ein Übernahme-Werkzeug (Node) schreibt Schlüssel aller Herkünfte, Spiegelregel, Abschnitte, Klemmen, Kopfversatz und die verborgenen Wechsel bei 180° als Daten; `formAusSchluesseln` wird `koordinaten`, `faltSchluessel` Wächter plus Vorschlag; Konstanten wie `WICKEL` und `NASE_WEG` bleiben im Prototyp |
| `renderer.ts` | Ausgangspunkt von `studio-bild` (7) |
| `haltung.ts` | `rueckgratBauen` wird die Biegeachse, geprüft mit den Fällen aus `haltung.test.ts`; Haltungen, Hocke und Diener werden Posen und Korrekturen; `weg()` wird „über X“ |
| `steuerung.ts`, `ablauf.ts` | Ausgleich je Regler; `ABLAEUFE` werden gestaltete Übergänge |
| `werkzeug.ts`, `vorlagen/` | Vorbild der Bedienung; der SVG-Import fast unverändert, ohne DOM |

Die Kopfdrehung übernimmt Studio exakt (Paritätstest), Haltungen und Abläufe exakt an den gezeichneten Posen; dazwischen urteilt
Florian an einem Video nebeneinander.

## 11 Spielkonzept für Ozzy

**„Gassirunde“** (Gesamtbericht 5.3, 13 §9): Ozzy dreht vor Sonnenuntergang eine Runde um eine kleine runde Welt, die der Bildrand
abschneidet; der Spieler dreht die Welt mit einem Finger. Die Schwerkraft zeigt nach unten, nur der Scheitel ist eben, und **Ozzys Lage
ist das Gaspedal**: oben steht er, daneben tapst er, weiter unten trabt und galoppiert er, darüber stolpert er (13 §2.2). Gespielt wird
Besen-Balancieren; Halten, Ziehen und Loslassen sind drei Zustände derselben Physik. Jedes Hindernis verlangt ein Tempo (Steinchen
Schritt, Stamm Trab, Lücke Galopp, Hügel Halten am Gipfel), das aus Sprungkraft und Schrittlänge entsteht, nicht aus einer Regel je Ding
(13 §9.4). Launen (Schnüffeln, Sturkopf, Flitzen, Jagen, Müde) ändern nur Sollwerte und kündigen sich eine Sekunde vorher an; an
Erhöhungen wird es eng, weil ein Gipfel schneller kippt. Komik: blamiert, nie verletzt; ein Abgang über den Bildrand ist nur zu hören,
Ozzy kommt mit einem Andenken zurück (14d: Klang, Rand-Bild und Stoß zugleich). Welten: Spielwiese, Garten, Park, Winter.

**Code sind nur** die Bausteinarten (Vierbeiner, Rad, Ding, Zone, Zähler, Uhr, Kamera, Musik) und die Effekt- und Chiparten; alles
andere ist mit dem Editor gemacht (rund 35 Posen, je Welt rund ein Dutzend Regeln, 14b §7.16). **Die eine Laufzeit schenkt dem Spiel**
den Pannen-Rückblick (alle Stürze der Runde gleichzeitig) und einen Geist des besten Laufs, weil Lauf-Dateien bildgleich nachlaufen; die
Zeitlupe nach dem Stolpern ist nur ein langsamerer Takt.

## 12 Umsetzung

### 12.1 Etappen und Proben

| Etappe | Inhalt | Probe (vorher festgelegt) | Tage |
|---|---|---|---|
| **E0 Verträge, Übernahme** | Pakete, Typen, Schreiber, `studio-rechnen`, Bauplan und Ansichts-Bindungen, Übernahme, Renderer mit Rahmen | Vorlagen exakt (wie Probe A des Prototyps); Kopfdrehung in 0,5° unter 0,001; Video neben dem Prototyp; gleiche Bytes; gleiche Prüfsumme in Node, Chromium, WebKit | 8–12 (eigene Schätzung) |
| S1 Messseite, neben E0 | 14c §7 | Ampeln aus 14c §6 | 2–4 |
| S2 P1 „Rad mit Gewicht“ | `studio-welt` | K1 bis K9 (14a §7) | 4,5–6 |
| S3 Form-Kern | `rahmenRest`, periodisch | Ohr 120°, Stirnfranse 52° bis 82°, Front | 2–4 |
| S4 Gerüst | Store, Speichern, Bühne, Leiste, Rückrechnung | 100 Züge, ein ⌘Z; Änderung einer Sitzung erscheint; Automatik kann seinen Schlüssel nicht löschen | 6–10 |
| S5 Knochen, Posen, Übergänge | Biegeachse, Haut, Ozzys Rig aus der Übernahme, Ausgleich, Tafel, Taktleiste | Plumps im Bild des Bodenkontakts, zehn Klicks ohne Sprung; Florian ändert ohne Code Dauer, Zwischenpose, Zusatz | 10–16 |
| S6 Spielwiese | Vierbeiner, Rad, Figurphysik, Bild Stufe 1 | 60 s auf dem iPhone: halten, Schritt, Trab, Galopp, Stolpern; Ohren nach dem Schubsen exakt; gleiche Prüfsumme | 30–50 |
| S7 Bedienprobe | 12 §9 | vier von fünf Aufgaben ohne Hilfe | 2–3 |
| S8 Logik, D1 bis D3 | Regeln, Drähte, Launen, Garten | zwei Regeln mit Vorhersage; Nicole schafft eine Runde | 30–50 |
| S9 Autorig | zweite Figur (Katze) | trifft `ELTER` und `PARTNER` ohne Namen | 15–25 |
| S10 D4, D5 | Park, Winter, Effekte, Ton | Vorher-Nachher-Bilder; Stumm-Probe; Florian spielt | 20–30 |

„Bestanden“ sagt Florian, ab S6 mit Nicole. Summe rund 130 bis 210 Arbeitstage (eigene Schätzung: Gesamtbericht 4.7 plus E0 und
Knochen in S5). E0 kostet vorne mehr; dafür gibt es keine zweite Vorschau, keinen Export, keine Paritätsfehler. Der Engpass bleibt
Florians Prüfzeit.

### 12.2 Verträge zuerst

E0 friert mit Versionsnummer ein: Typen und Schemas; die Schnittstellen als reine Typen (Teilpläne, `Lauf`, `BildDaten`, `Zeichner`,
`WeltAdapter`, `Bausteinart`, `Diff`) in `studio-laufzeit/src/vertrag/`; Prüfdaten (Ozzy aus der Übernahme, eine Testfigur aus drei
Teilen, eine leere Spielwiese); Testgerüste mit Attrappen; alle `package.json`, `tsconfig`, Lint-Regeln und die Lockdatei. Danach braucht
keine Bahn eine Datei außerhalb ihres Ordners.

### 12.3 Parallel bauen

| Bahn | eigener Ordner | Probe | nach |
|---|---|---|---|
| A Form | `laufzeit/src/form/`, `regler/` | S3 | E0 |
| B Store | `studio-store/`, `apps/studio/server/` | S4 | E0 |
| C Welt | `studio-welt/` | S2 | E0 |
| D Bild | `studio-bild/` | Bildvergleich, Messseite | E0 |
| E Knochen | `laufzeit/src/knochen/`, `editor/` | Probewackeln | A |
| F Posen und Takt | `laufzeit/src/posen/`, `takt/` | S5 | E0 |
| G Logik | `laufzeit/src/logik/`, `bausteine/` | S6, S8 | C, F |
| H Oberfläche | `apps/studio/src/` | S4, S7 | B, vorher gegen Attrappen |
| I Autorig | `studio-autorig/` | S9 | E |

1. **Ein Ordner, eine Bahn,** je Bahn ein eigener Arbeitsbaum und Zweig, nie unter Florians Fenstern; neue Abhängigkeiten gehen über die
   Integration.
2. **Verträge ändert nur die Integration,** als kleiner Schritt mit neuer Version; brauchen zwei Bahnen dieselbe Änderung, halten beide an.
3. **Attrappen statt Warten;** integriert wird täglich, wenn Typen, Eigenschafts-, Paritäts-, Determinismus- und Vertragstests grün sind.
4. **Höchstens zwei Proben gleichzeitig für Florian:** Parallel verkürzt die Bauzeit, nicht seine Prüfzeit. Ob parallel gebaut wird,
   entscheidet er (Arbeitsregel 2); seriell gilt die Reihenfolge aus 12.1.

### 12.4 Risiken und Abbruch

| Risiko | Gegenmittel |
|---|---|
| Bauplan veraltet nach einem Diff | Test „inkrementell = voll“, Prüfknopf im Editor |
| eigene Winkelfunktionen zu langsam | Messseite; Rückfall: nur dort, wo Formen in die Physik fließen |
| Regler-Graph undurchsichtig | „Warum?“ auch für Regler, keine Kreise |
| Übernahme ohne Parität | Tor von E0; nach drei Tagen ohne Parität anhalten und berichten |
| Verträge zu früh zu breit | nur einfrieren, was E0 braucht; Erweiterungen versioniert |
| Ankerzeilen gegen KI-Sitzungen | Zusammenführen je Datensatz; notfalls Format 2 mit Zuordnung über Kennungen |
| Umfang, Tempo auf dem iPhone, aktive Stelle, Box2D-Bindung | wie Gesamtbericht 6.1 |

**Abbruchregeln:** Nach dem Anderthalbfachen der Schätzung ohne bestandene Probe wird angehalten und berichtet (P1 nach sechs Tagen,
14a §7.3). Zweimal dasselbe Kriterium verfehlt heißt: Ansatz prüfen statt nachbessern (Arbeitsregel 7). Rot auf der Messseite wird vor
dem Weiterbauen behoben. „Gefällt nicht“ heißt umbauen, nicht belegen (Arbeitsregel 4). Berührt etwas Florians Dateien, hält alles an.

## 13 Abweichungen von der Recherche

| Punkt | Recherche sagt | ich sage | warum | ehrliche Gegenrede |
|---|---|---|---|---|
| Eigene Winkelfunktionen | erst, wenn Aufnahmen über Geräte gleich sein müssen (14a Empf. 10) | ab dem ersten Tag im Simulationspfad, per Lint-Regel | Nachrüsten heißt 84 Stellen suchen (14a §3d); Florian prüft am Mac, spielt am iPhone; jeder Fehlerbericht wird ein Test | ein bis zwei Tage Arbeit (eigene Schätzung), vielleicht langsamer; Florian hat nicht entschieden |
| Bauplan | Caches je Verweis (11 §4.2) | gepackte Felder, inkrementell | eine Stelle fürs Vorrechnen, keine Würfe (14c §5.1) | eine zweite Darstellung, die veralten kann |
| Pakete | vier, Figurphysik in `studio-welt` (11 §12.1) | dazu `rechnen`, `store`, `autorig`; Figurphysik in der Laufzeit | Figurphysik schreibt Regler; Welt austauschbar, mit Attrappe prüfbar | mehr Konfiguration |
| Draht und Treiber | getrennt (14b §7.3; 01, 04) | ein Datensatz, auch für Übergänge und Zyklen | gleiche Rechnung, eine Reihenfolge, eine Leiste | Florian könnte beides als verschieden erleben |
| Übergangsform | Zusatz mal Glocke 4s(1−s) (06 §6.5) | Zusatz-Bindung am Fortschritt | bei s = ½ gleich, sonst überall formbar | mehr Gelegenheit für Zickzack |
| Korrektur am Gelenk | je Einfluss im Knochenraum (Gesamtbericht 4.6 Punkt 9) | mitlaufender Rahmen vor der Haut | einfacher, am Gelenk formtreuer | eigene Herleitung, ungeprüft |
| Längen in Zusätzen | Logarithmus (06 §6.2) | linear, bei 0 geklemmt | eingezogene Griffe | nicht maßstabsfrei |
| Ausgleich | beim Posenwechsel (05 §5.5) | je Regler bei jedem Sprung | alle Quellen gleich weich | ein Zustand mehr je Regler |
| Ablage | erst eine Datei (11 §5.2) | je Figur und Szene eine | weniger Konflikte | Verweise über Dateien prüfen |
| Ozzys Handrig | `haltung.ts` trägt bis zum Autorig (Gesamtbericht 4.7) | als Daten übernommen | kein Ozzy-Code (Arbeitsregel 7) | teurer; zwischen Posen nur Gleichheit nach Auge |
| Drähte vor Regeln | Kette in Gesamtbericht 4.4 | nach Regeln und Posen | Drähte in der Figur ohne Verzug | Regeln sehen Drähte einen Takt später |

## 14 Unsicherheiten und was sie klärt

| Unsicherheit | was sie klärt |
|---|---|
| Tempo der eigenen Winkelfunktionen | Messseite gegen `Math` (S1, E0) |
| Box2D bitgleich über Safari, Chrome und App? | P1, K7 (S2) |
| Mischt der Reglerraum Haltungen so schön wie `haltung.ts`? | Video nebeneinander (S5, Florian) |
| Ist Rahmen + Rest schöner? | S3, Florian |
| Hält der mitlaufende Rahmen Korrekturen formtreu? | Probe „Feder treibt Korrektur“ (S5) |
| Tempo des Bauplans beim Ziehen | Messung in S4 |
| Ankerzeilen und KI-Sitzungen | Abweichungen der ersten Wochen |
| Szene in 8 ms Grafikzeit? | Messseite, halbe Felder (S1, S6) |
| Aktive Stelle ohne Modus? | Bedienprobe S7 |
| Parallele Bahnen netto schneller? | zwei Bahnen nach E0, mit Florians Wort |
| 32 MB für Schlüsselstände? | P1, K8 |
