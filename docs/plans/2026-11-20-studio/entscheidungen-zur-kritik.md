# Studio: Entscheidungen zur Kritik

Stand 20.11.2026. **Zweck:** Dieses Blatt legt für jeden der 30 Befunde der Vollständigkeitskritik fest, wie er gelöst wird, und
arbeitet die Festlegungen F1 bis F7 der Integration ein. **Seit der Überarbeitung gelten das [Konzept](../2026-11-20-studio-konzept.md)
und der [Bauplan](../2026-11-20-studio-plan.md); dieses Blatt ist ihre Begründung.** Weicht es in einer Einzelheit vom Bauplan ab, gilt
der Bauplan; ein Bau-Agent baut nach dem Bauplan ohne Rückfrage. Nach der Prüfung der überarbeiteten Fassungen (20.11.) sind hier
nachgezogen: Schutz über den Schreibweg statt über Prüfsummen (F1, Befund 4), Umzug mit Vermerk (5), Körpermodell an der Figur und
Federbeine mit Vorspannung (6), Kehrtwende nur aus Stehen (8), Schatten „nurFlorian“ (9), keine Rundung und keine Glätte-Regel in
Übernahme und Migration (11, 21), die zweite Hälfte der Kopfdrehung als Listen des Prototyps (F1, 13), Ladeweg des Spiels und Ziel der
Live-Weitergabe (2, 27), Herkunft an jedem Datensatz und die Effektarten in M0 und M6 (Abschnitt 3).

**Verweise:** Kritik [`kritik.json`](kritik.json) · Urteile [`urteile.json`](urteile.json) · Entwürfe A, B, C in diesem Ordner ·
[Gesamtbericht](../../research/2026-11-20-editor-recherche.md) · Prototyp `apps/editor/src/ozzy-figur/` mit
[Übergabe](../../look/ozzy-figur/UEBERGABE.md) · Liste für Florian: [Studio: Was bleibt](../2026-11-20-studio-was-bleibt.md).

**Lesart.** „K §x“ ist das Konzept, „P §x“ der Bauplan, „Datei:Zeile“ der Prototyp unter `apps/editor/src/ozzy-figur/`. Die Befunde
tragen die Nummern ihrer Reihenfolge in `kritik.json`. **Achtung Zählung:** Der Auftrag nennt drei Befunde mit anderen Nummern:
„Befund 17 (Typen und Formeln)“ ist hier Nr. 16, „Befund 18 (Gewichte an Biegeachsen)“ ist Nr. 17, „Befund 22 (früher spielbarer
Stand)“ ist Nr. 23. Es gilt die Reihenfolge der Datei. „A3“, „B7“ verweisen auf Einträge der Liste.

**Inhalt:** 1 Festlegungen der Integration · 2 Befunde 1 bis 30 · 3 Sammlung der Vertragsänderungen · 4 Neue Reihenfolge ·
5 Was in die Liste kommt

---

## 1 Festlegungen der Integration

Die Festlegungen F1 bis F7 gelten wörtlich wie im Auftrag. Hier stehen sie knapp, mit ihren Folgen für Konzept und Plan.

### F1 Selbstständig durchbauen

Florian: „Mache selbstständig alle nötigen recherchen, tests, gegenüberstellungen und pläne und baue mir das komplette produkt.“ Offenes
sammeln wir und glätten es am Ende in einem großen Feinschlifflauf.

- Die Etappen laufen nacheinander durch, ohne auf sein Urteil zu warten. Jedes Tor „auf sein Wort“ wird eine vorläufige Entscheidung im
  Plan und ein Eintrag in Teil A der Liste (nummeriert, in seinen Wörtern, mit „So änderst du es“). Der Bau ist so angelegt, dass Kippen
  billig bleibt.
- Proben, die sein Auge, Nicole, das iPhone 16 oder das iPad brauchen, werden vollständig vorbereitet: Seite, Ablauf, Kriterium, Ablage
  der Aufnahme unter `docs/progress/studio/proben/m<n>-<name>.<mp4|png|json>`. Sie stehen in Teil B der Liste; der Bau wartet nicht.
- Eigene Prüfungen laufen automatisch und sind vorher festgelegt: Typen, Tests, Eigenschaftstests, Playwright in Chromium und WebKit,
  Bilder und Aufnahmen in `docs/progress/studio/`. Messungen am Mac sind Hinweise, keine iPhone-Messungen; das steht jeweils dabei.
- Vergleichsbilder, die einen Weg entscheiden, werden gemacht und abgelegt; der Bau nimmt die vorläufige Entscheidung, das Bild kommt in
  die Liste.
- Nie „bestanden“ ohne Florian. Jede Etappe endet grün, committet und mit einer kurzen Meldung an ihn: was er jetzt in Studio tun kann,
  Verweis auf die Liste. Die letzte Etappe vor seiner Abnahme ist ein großer Feinschlifflauf über die ganze Liste (M11.4).

**Nie ohne sein ausdrückliches Wort:** seine Schlüssel oder Dateien ändern (`docs/look/ozzy-figur/`); seinen Prototyp ändern
(`apps/editor/`); seine Kopfdrehung in Studio zur Wahrheit machen (Umzug, Befund 5); Effekte auf Ozzys Körper außer den erlaubten
einschalten. **Daraus und aus F6 folgt ebenso:** Mischart oder periodische Mischung seiner Kopfdrehung wechseln (A2, A3), Ozzys Rig durch
den Autorig ersetzen (A9), Gewichte an der Bohne (A5), halbe Feldauflösung (verändert seinen Look), Rückwurf an (A20).

**Rückfälle nach vorher festgelegtem Kriterium** (der Bau wählt selbst und trägt es in die Liste ein):

| Wette | Kriterium | Rückfall |
|---|---|---|
| Parität der Kopfdrehung (M1) | Kurvenpunkte unter 0,001 im 0,5°-Raster (Befund 11) | kein Rückfall, sondern Festlegung: Die zweite Hälfte ist im Prototyp keine Spiegelung der ersten (eigener Rücken bei 180°, eigene Front bei 360°, gespiegelte Einträge des Partners nur dazwischen; in der Prüfung gemessen bis 55 Einheiten Unterschied). Studio übernimmt genau diese Listen; die Spiegelregel wirkt dort nur auf Malreihenfolge, Wechsel und mitgespiegelte Regler (P §6.2 Nr. 5). Eine Abweichung ist ein Baufehler. |
| Parität der Haltungen (M4) | Kurvenpunkte unter 0,001 an den fünf Haltungen | Restversatz je Haltung als Posenkorrektur mit Herkunft „gebaut“ |
| P1 mit Box2D (M2) | K1 bis K9 gemessen (14a §7.2) | K5 oder K6 rot: B′ (Welt steht, Schwerkraft und Kamera drehen), dann Rapier hinter `WeltAdapter` |
| Tempo (M2, M6, M8, M10) | Messseite rot (am Mac umgerechnet: Hinweis; am iPhone: Messung) | P §8.3 in dieser Reihenfolge: Welt gebacken und Kreise analytisch, drei statt sechs Geister, Kachel-Durchgang als eigene Welle; halbe Feldauflösung nur mit seinem Wort |
| Wiederholbarkeit über Browser (M1, M5) | gleiche Prüfsumme in Node, Chromium, WebKit | Merker nur am selben Gerät, Funktion benennen; der Editor wartet nicht |
| Aktive Stelle (M3, M4) | Ort-Probe (Befund 10); Werkbank- oder Bedienprobe unter vier von fünf, sobald ihr Ergebnis da ist | ein Fehler der Ort-Probe ist ein Baufehler; Gegenprobe „zwei Modi“ als nächste Welle, wenn eine Probe mit Florian oder Nicole scheitert |
| Spielbarkeit (M2, M7, M10) | Nicole in höchstens drei Versuchen, sobald ihr Ergebnis da ist | Bremskraft 0,35 g und Radius 16 L, dann erneut |

**Anhalten und berichten** nur noch, wenn für ein Scheitern kein Rückfall im Plan steht, der Rückfall selbst scheitert, eine Probe ohne
Rückfall das Anderthalbfache der Schätzung überschreitet oder ein eigener Prozess versucht, Florians Dateien zu berühren. Das erkennt der
Schreibhaken der eigenen Prozesse (P §6.3), keine Prüfsumme: Seine Dateien sind lebendig, und seine eigenen Änderungen (Prototyp auf
5213, Studio auf 5217) lösen nie ein Anhalten aus. Zurückgesetzt wird nie automatisch, nur auf sein Wort.

### F2 Parallel bauen

Ultracode ist Florians Zusage für Workflows mit vielen Agenten. Die Pakete einer Welle laufen parallel; jeder Agent mit dem stärksten
Modell und höchstem Aufwand; höchstens etwa zehn Agenten je Workflow. **Folgen:** M1 Welle A und M2 Welle A laufen in einem Workflow
(neun Agenten), ebenso M1 Welle B und M2 Welle B. M9 und M10 hängen nicht voneinander ab; ihre ersten Wellen dürfen zusammen laufen.
K §12 „Parallel bauen nur auf sein Wort“, K §14 Frage 1, P §2.5 „Nur auf Florians Wort parallel“ und P §5.1 Nr. 2 „(nur auf Florians
Wort)“ entfallen.

### F3 Ort: dieser Arbeitsbaum

Gebaut wird in `.claude/worktrees/ozzy-animation-physics-294508` (Zweig `claude/ozzy-animation-physics-294508`), ohne
Integrations-Arbeitsbaum, ohne Zweige je Paket, ohne Merges. Sein Prototyp und seine `schluessel.json` sind hier lebendig; Studio liest
sie direkt.

- Pakete einer Welle ändern disjunkte Dateien. Bau-Agenten committen nicht, rufen nie `pnpm install`, ändern keine `package.json` und
  keine Lockdatei. Alle Abhängigkeiten einer Etappe installiert ihr Vertragsschritt. Agenten prüfen nur ihre eigenen Dateien (Tests,
  Typen über eine tsconfig des Arbeitspakets, Lint; P §7.4), weil mehrere Arbeitspakete einer Welle im selben npm-Paket liegen können;
  nie die ganze Testreihe des Repos, nie `@ee/shape`.
- Braucht ein Paket eine Änderung außerhalb seiner Dateien, steht sie in seinem Abschlussbericht an den Workflow; die Integration
  entscheidet. Niemand schreibt andere Sitzungen an.
- Die Integration prüft nach jeder Welle alles zusammen (`pnpm studio:pruefen`, e2e), committet nur eigene Dateien (vorher `git status`
  und `git log`, kein bare `git stash`) und pusht am Ende jeder Etappe.
- Neue Pakete nehmen dieselben Versionen wie `apps/editor` (Vite ^8.3.1, TypeScript ~5.9.0, vitest ^5.0.2, Playwright ^1.63.0, React
  ^19.3.0); bestehende Abhängigkeiten bleiben.
- Tabu: `apps/editor/`, `packages/shape/`, `docs/look/ozzy-figur/` und alles, was andere Stränge bauen. **Neu:** Wurzeldateien, die
  `apps/editor` liest (`tsconfig.base.json`), ändert niemand; eine Änderung kann sein Fenster auf 5213 neu laden. Studio-Pakete erweitern
  `tsconfig.base.json` nur. `apps/editor` importiert nie etwas aus Studio.
- Jeder Agent schreibt Testausgaben nach `test-results/<paket>/`.

**Folgen:** P §2.4 („Florian startet im Arbeitsbaum `.claude/worktrees/studio`“), P §2.5 (ganz), P §5.1 Nr. 1 bis 3 („Zweige
zusammenführen“, „committet hat“), P §9.1 Zeile „Zusammenführen bricht“ und K §12 („eigener Arbeitsbaum und Zweig“) werden ersetzt.

### F4 Ports

| Port | wer | was |
|---|---|---|
| 5213 | Florian | sein Prototyp: nie anfassen |
| 5217 | Florian | Studio aus dem festen Stand (`apps/studio/dist/<stand>/`, `vite preview --host`, `STUDIO_FLORIAN=1`): Editor, Messseite, P1 |
| 5261 | Florian, Nicole, iPhone | Spiel aus dem festen Stand (Code); Inhalt über seinen Server aus `content/studio`, Merker nach `laeufe/` |
| 5263 | Integration | Studio im Entwicklungsserver, Inhalt als Kopie |
| 5265 | Integration | Spiel im Entwicklungsserver, Inhalt als Kopie |
| 5270 bis 5289 | Bau-Agenten | Probe-Ports; der Workflow teilt jedem Agenten eigene zu (`STUDIO_PORT`, `SPIEL_PORT`) |
| 5291, 5292 | Integration | Playwright-Server für Studio und Spiel |
| 5294 | Proben | Prototyp als Vergleich mit eigener Konfiguration und eigenem Zwischenspeicher (Wurzel `apps/editor`, `cacheDir` unter `test-results/`, ohne Schreibwege; P §6.3), nie 5213. Ein zweiter Server mit dem Zwischenspeicher von `apps/editor` löschte ihn nach jedem `pnpm install` beim Start unter dem laufenden 5213 |
| 5219 | Shader-Sitzung | belegt, nie benutzen |

Vor jedem Start `lsof -nP -iTCP:<port>`. Einträge in `.claude/launch.json`: `studio` (5217), `studio-bau` (5263), `gassirunde` (5261).
Florian startet aus diesem Arbeitsbaum mit `pnpm studio` und `pnpm gassirunde`. Den festen Stand baut nur die Integration am Etappenende
neu, in einen neuen Ordner je Stand; laufende Server wechseln erst beim Neustart dorthin (ein Neubau in denselben Ordner nähme der
offenen Seite nachgeladene Teile weg); 5217 startet sie nur neu, wenn sein Journal nichts Ungespeichertes hält; die offene Seite bietet
dann „neu laden“ an. Ohne `STUDIO_INHALT` arbeitet jeder Server auf einer frischen Kopie; `content/studio` gilt nur in `pnpm studio`,
`pnpm gassirunde` und den Läufen der Integration (P §2.4). **Folgen:**
P §2.4 (Tabelle, Skripte `dev --port 5219`, Spiel 5221/5223), P §5.4 (Video 5291/5294 bleibt), P §7.5 und P §10 (Adressen) ändern sich.

### F5 Seine Arbeit in Studio

- Florians Studio auf 5217 schreibt über die Ablage des Servers nach `content/studio/` (Revision je Datei). Bau-Server, Proben und Tests
  arbeiten immer auf einer Kopie (`STUDIO_INHALT=test-results/<…>`).
- Übernahme und Inhalt-Skripte schreiben nur über dieselbe Ablage und dieselbe Schutzregel des Stores, datensatzweise zusammengeführt:
  Sie legen an oder ändern nur Datensätze mit Herkunft „gebaut“ oder „vorlage“ unter ihren eigenen Kennungen. Einen Datensatz mit
  Herkunft „dein“ lassen sie stehen (sein Wert gilt) und schreiben den Rest; was dadurch nicht passt, bleibt im vorigen Stand und steht
  in der Meldung und in Teil C der Liste. **Nachtrag der Schlussprüfung:** Zuerst stand hier „brechen nur ab, wenn sie einen Datensatz
  „dein“ ändern müssten“. Das hätte den Bau angehalten, sobald Florian etwas Gebautes nachstellt (gegen F1); Plan 4.9 gilt.
- Zwei Geräte zugleich: datensatzweise zusammenführen; ändern beide denselben Datensatz, gewinnt der spätere; der frühere bleibt als
  Fassung sichtbar und wiederherstellbar.
- Sicherung: Jedes Speichern legt die vorige Fassung der Datei in einen Ring (die letzten 50, dazu eine Woche lang je Stunde eine, weil
  50 Speicherungen beim Formen nur Minuten sind) unter `content/studio/.sicherung/`; dazu das Journal je Gerät.
- `docs/look/ozzy-figur/schluessel.json` liest Studio direkt aus diesem Arbeitsbaum; geschrieben wird sie nie.
- Am Ende jeder Etappe committet die Integration seinen Stand in `content/studio/` als eigenen Commit „Florians Stand in Studio“,
  getrennt vom Code, nur wenn er sich geändert hat.

**Folgen (verbindlich für den Bau):**

1. **Neues Paket `@ee/studio-ablage`** (`packages/studio-ablage`, Node, ohne DOM, ohne Simulationsregeln): Dateien lesen und schreiben mit
   Revision (SHA-256, 16 Zeichen) und `If-Match`, atomar; Sicherungsring; Liste `fassungen` in `projekt.json`; Beobachter des
   Inhaltsordners (Server-Sent Events `geaendert`); Sitzungsschlüssel und `STUDIO_FLORIAN` (Befund 21); Weitergabe von Live-Diffs und
   Merkern (Befund 27); ein Vite-Plugin mit `configureServer` und `configurePreviewServer` für `apps/studio` und `apps/ozzy-spiel`.
   Skripte benutzen dieselben Funktionen direkt in Node. Die Ablage kennt keine Formate; Haken (etwa „fremde Quellen einsetzen“,
   Befund 5) setzt der Zusammenbau. `apps/studio/server/` behält nur `plugins.ts` (Zusammensetzung) und `messung.ts`.
2. **Zusammenführen:** Antwortet der Server mit 409, lädt der Editor die Datei und führt sie mit `fremdUebernehmen` zusammen: je
   Datensatz die geänderte Seite; beidseitig geändert gewinnt der spätere Schreiber, die verdrängte Fassung wird ein Eintrag in
   `projekt.json` → `fassungen` (Kennung, Gerät, Zeit, eigene Datei mit dem Datensatz außerhalb des Rings; höchstens 50) und steht im
   Prüfer mit „Wiederherstellen“ (ein Schritt, Quelle florian). P §4.9 „beidseitig geändert gewinnt Florian, … Abweichungen“ entfällt.
   Fremde Transaktionen kommen nie in
   seinen Rückgängig-Verlauf.
3. **Ring nicht im Git:** `content/studio/.gitignore` mit `.sicherung/` (legt M1.6 an).
4. **Commits:** Vor jedem Lauf eines Skripts committet die Integration den Stand von `content/studio/` als „Florians Stand in Studio“
   (falls geändert), nach dem Lauf als „Studio-Inhalt M<n>“; am Etappenende wieder „Florians Stand in Studio“ (falls geändert).
5. **Seine Kopfdrehung bis zum Umzug** und der Neustart der Übernahme bei jedem Speichern im Prototyp: Befund 5.

**Ersetzt:** K §2.3 („wiederholbar, bis Florian in Studio weiterformt“), K §10.2 (Zusammenführen), P §2.4 (Satz zu `content/studio/`),
P §4.9, P §6.1, P §6.3, P §7.5.

### F6 Unverändert gilt

Ozzy exakt wie sein Logo, in Ruhe genau seine Zeichnung; aus dem Shader nur die Beinschattierung in Bewegung; Schatten auf Boden und
Welt, nicht auf seinem Körper; keine Teilnamen von Ozzy im Code von Studio; klare Begriffe (CLAUDE.md Regel 6); keine Modellnamen in
Dokumenten; „bestanden“ sagt nur er. **Folgen:** Befund 9 (Schatten) und 30 d (`wieGezeichnet`). P §2.3 Nr. 3 nennt als Ausnahmen jetzt
`tools/studio-uebernahme`, `tools/studio-inhalt` und `pruefdaten/`.

### F7 Wochenlimit, ehrlich

Parallele Wellen verbrauchen sein Wochenlimit schneller; er hat mit Ultracode zugestimmt. Jede Welle hinterlässt einen grünen,
committeten Stand; der Bau kann an jeder Wellengrenze anhalten und später weiterlaufen. **Folgen:** Die Integration schreibt je Welle
eine Zeile nach `docs/progress/studio/aufwand.json` (Etappe, Welle, Pakete, Agenten, Dauer). Nach M3 schätzt sie den Rest mit gemessener
Bauzeit neu und nennt das Ergebnis in der Meldung (Befund 23). P §9.1 Zeile „Umfang wächst über das Wochenlimit“ verweist darauf.

### Stellen in Konzept und Plan, die F1 bis F7 ändern

| Stelle | bisher | neu |
|---|---|---|
| K §0 (Preis) | zwei Wetten, früh geprüft | bleibt; der Bau wartet nicht auf Urteile, Ergebnisse sammelt die Liste |
| K §2.2 Mischart, periodisch | Wechsel nur nach Bild und auf sein Wort; „bis er die Drehung … gesehen hat“ | bleibt sein Wort; Bild und Video in M1; vorläufig A2, A3 |
| K §2.3 Tor | „Ohne Parität nach drei Tagen wird angehalten“ | Rückfall nach Kriterium (Tabelle F1); Übernahme nach Befund 5 |
| K §3.1 | „B wird nur auf Florians Wort Standard“; „Florian wählt“ (Hals, Bohne) | Befund 12; Befund 18, A5 |
| K §4 | Ozzys Rig nur nach Video und seinem Wort | bleibt; A9 |
| K §6, §6.5 | „freigegeben … nach der Probe P1“ | K1 bis K9 gemessen entscheiden (Tabelle F1); sein Blick in B4 |
| K §6.3, §11.5, §13 | Rückwurf auf sein Wort | bleibt; A20 |
| K §7 | halbe Feldauflösung nach Bild | nur mit seinem Wort, zuletzt in der Reihenfolge P §8.3 |
| K §9.7 | Gegenprobe, wenn vier von fünf verfehlt | Ort-Probe automatisch; Proben mit ihm in B7, B8, B12; Rückfall nach Tabelle F1 |
| K §11.1 | „Florian entscheidet nach der Spielwiese“ | A16 |
| K §12 | Umzug nach E1; parallel nur auf sein Wort; eigener Arbeitsbaum; höchstens zwei Proben; Abbruch nach Tagen | Befund 5, A1; F2; F3; Proben in Teil B ohne Grenze; Abbruch nach F1 |
| K §14 | Tabelle und zwei Fragen vor dem Start | ersetzt durch die Liste (A, B); Frage 1 beantwortet (F2), Frage 2 wird B3 |
| P §2.4, §2.5 | Ports 5219/5221/5223; Arbeitsbaum `studio`; Zweige je Paket | F3, F4 |
| P §5.1 | Merges, Agenten committen, „nur auf Florians Wort“, Warten bei Wegentscheidungen | F1 bis F3: Vertragsschritt installiert, Wellen parallel, Integration prüft und committet, nie warten |
| P §5.4 Abbruch | Parität nach drei Tagen anhalten | Tabelle F1 |
| P §5.5 | „Entscheidet einen Weg … M5 beginnt erst danach“ | K1 bis K9 gemessen; B4 |
| P §5.6 Fragen | „Rahmen + Rest auch am Kopf?“, „Formst du ab jetzt in Studio?“ | A2, A1 |
| P §5.7 | „Entscheidet einen Weg“, M4G „danach entscheidet Florian“ | Tabelle F1; B8 |
| P §5.8 bis §5.13 Fragen | Tapsen, Welten, Rückwurf, Mischen, Effekte | B9, A16, A20, A5 und B14, A7 und A8 |
| P §5.14 M11.4 | Feinschliff nach seiner Liste, höchstens fünf Tage | großer Feinschlifflauf über die ganze Liste (A-Ergebnisse, B-Ergebnisse, C) |
| P §6.1, §6.3, §7.5 | Übernahme bricht ab; relativ gelesen; Kopien | F5, Befund 5 |
| P §8.2 | „Alle Geräte nur, wenn höchstens eine andere Probe offen ist“ | entfällt; B3 |
| P §9.1, §9.2 | Prüfzeit, Merge, Abbruchregeln | F1, F3, F7 |
| P §10 | Tabelle mit Fragen je Etappe | je Etappe: grüner Stand, kurze Meldung (was er jetzt tun kann), Verweis auf die Liste |

---

## 2 Befunde

### 1 · Drähte, Knochen und Handgriffe werden vor ihrer Bauetappe gebraucht

**Urteil:** stimmt. Die Übernahme in M1 legt Kopfversatz und Halslage als Drähte auf die Verschiebung eines Knochens (P §6.2 Schritt 6,
M1.5 „Schritte 1 bis 7“); Drähte entstehen erst in M7.1 (P §5.10), Knochen in M4.2 (P §5.7). Die M1-Probe vergleicht mit
`FigurRaster.teile({ psi: 90, theta, nurKopf: true })`, und diese verschiebt jedes Kopfteil um `hals + versatzBei(θ)` (raster.ts:1024–1037).
M5.Z verdrahtet Schritt 5, M7.Z noch einmal. `dingSetzen`, `weltpfadFormen`, `drahtLegen` entstehen in M7.4, die Inhalt-Skripte von M5.6
und M6.4 brauchen sie; für Zyklen gibt es keinen Handgriff (P §4.7).

**Entscheidung:**
1. Starre Knochen mit Verschiebung (`knochen/{baum,starr}.ts`, `aufhaengen` für `starr`, `bauplan/knochen.ts`) und die Auswertung der
   Drähte (`logik/draehte.ts`; `bauplan/logik.ts` vorerst nur mit Drähten) kommen in M1 Welle A (Paket M1.7). Biegeachsen, Anheftung und
   Gewichte bleiben in M4, Regeln in M7.
2. Ohne laufenden Takt rechnet `Laufzeit.hand()` einen **Durchlauf ohne Zeit**: Drähte (Schritt 5, ohne Glätten) und Regler (Schritt 6,
   Ist = Soll). Im Takt laufen dieselben Funktionen mit dt. Werkbank und Spiel sehen dieselben Werte.
3. Die Parität in M1 bleibt der volle Vergleich mit `teile(...)`, mit Kopfversatz und Halslage. Die Übernahme legt dafür an: Knochen
   „Hals“ (Ruhelage im Ursprung des Körpers, Verschiebung über zwei Regler) und Knochen „Kopf“ am Hals (Verschiebung über zwei Regler),
   beide starr; vier Drähte: θ → Kopfversatz x, y (Kennlinie aus den vier Stützstellen von `kopfVersatz`, PCHIP, Spiegel ab 180° um 360°,
   x negiert), ψ → Halslage x, y (Kennlinie aus `halsBei` in 0,5°-Schritten, PCHIP, Spiegel ab −90° um 0°, x negiert). Die Kopfschlüssel
   bleiben in Kopf-Koordinaten wie im Prototyp (Ursprung Kopfmitte, Spiegelachse x = 0) und hängen starr am Kopfknochen.
   `Draht.spiegel` gilt dafür auch für Linienregler (in [ab, um) gilt die Eingabe um − w).
4. **Eine PCHIP-Regel überall**, die des Prototyps (form.ts:309–338): innen gewichtetes harmonisches Mittel, an den Enden die einseitige
   Sekante, außerhalb festgehalten; periodisch über fortgesetzte Schlüssel (mindestens zwei je Seite). `pchipSteigungen` und `pchipWert`
   rechnen mit derselben Reihenfolge der Rechenschritte bitgleich zu `pchip`; `pchipPrototyp` entfällt.
5. Handgriffe entstehen mit dem Datensatztyp, den sie anlegen, spätestens eine Welle vor ihrer ersten Nutzung: `drahtLegen`,
   `kennlinieFormen`, `drahtAendern`, `drahtLoesen`, `bausteinAnhaengen`, `bausteinAendern` in M1.7; Zyklen und Schichten in M4.5; Welt und
   Dinge in M5.2; Chips und Effekte in M5.4; Regeln in M7.1; Text in M7.6. Vollständige Liste bei Befund 14.
6. Jede Etappe und jedes Paket hat eine Zeile „braucht“ (Abschnitt 4).

**Stellen:** K §2.3, §10.3, §12; P §4.1 (`pchipPrototyp`), §4.2 (Fassade), §4.7, §5.2, §5.4, §5.7, §5.8 (M5.Z), §5.10 (M7.1, M7.4, M7.Z),
§6.2 Schritte 4 und 6, §6.4. **Liste:** nein.

### 2 · Spielfassung ohne Herkunft

**Urteil:** stimmt. P §3.5 Nr. 7 lässt die Herkünfte weg; `ruhendeSchluessel` rechnet aus der Herkunft (P §4.4); `herkunft` ist
Pflichtfeld (P §3.2); K §10.2 sagt nur „ohne Editor-Datensätze“.

**Entscheidung:** Es gibt keine eigene Spielfassung. Das Spiel lädt dieselben Dateien mit denselben Schemas, nur ohne `vorlagen/*.svg`
und `laeufe/`; die kleinen Datensätze `Vorlage` bleiben, damit kein Verweis ins Leere zeigt. `spielfassung.ts` und `spielfassung()`
entfallen. Fremde Quellen (Befund 5) setzt der Server beim Ausliefern als gewöhnliche Datensätze ein, der von Studio wie der des Spiels:
Das Spiel lädt beim Start über seinen Server, mit demselben Haken, und sieht so immer Florians aktuellen Stand; nur die App bekommt einen
eingebauten Inhalt, in den die Quellen beim Bauen eingesetzt werden (M11.2). Der Code des Spiels liest nie `docs/look/`. Tests in M6.2:
Laufzeit mit `editor: true` und mit `editor: false` liefern für Ozzy von 0° bis 360° in 0,5° bitgleiche Anker; Spiel und Editor, jeder
über seinen Server aus derselben Kopie geladen, liefern dieselben Anker.

**Stellen:** K §10.2; P §2.2, §3.5 Nr. 7, §4.1, §5.4 (M1.2), §5.9 (M6.2). **Liste:** nein.

### 3 · P macht alle Schlüssel eines Teils zu „dein“

**Urteil:** stimmt. P §3.6 Nr. 9 setzt bei jeder Änderung der Quelle florian an einem Schlüssel die Herkunft auf „dein“; P schreibt in
jeden Schlüssel des Teils (K §2.4). Kleine Ungenauigkeit der Kritik: betroffen sind die Schlüssel dieses einen Teils, nicht alle rund 170
des Kopfs. Die Folgen (gebaute Schlüssel ruhen nicht mehr, Farben der Leiste weg, Automatik gesperrt) stimmen.

**Entscheidung – Herkunftsregel:** „dein“ bekommt genau der Datensatz, auf den Florians Geste zielt: bei einem Zug der Schlüssel (oder die
Pose, Zwischenpose, Korrekturform), den die Zielregel nennt; bei P und beim Löschen eines Ankers der Teil-Datensatz (seine Ankerliste),
nicht die Schlüssel; bei einem Wert in den Eigenschaften der Datensatz dieses Werts. Folgeänderungen derselben Geste (neue Zeile in jedem
Schlüssel, Kennungen, Reihenfolge-Indizes) behalten ihre Herkunft. Weil der Teil-Datensatz nach P „dein“ ist, überschreibt keine
Automatik seine Ankerliste (Befund 5, Abbruch). Eigenschaftstests in M3.1: P ändert keine Herkunft eines Schlüssels, nicht die Menge der
ruhenden Schlüssel und an keinem Winkel die Gestalt (Kurvenpunkte auf 1e-9); Löschen ändert keine Herkunft eines Schlüssels.

**Stellen:** K §2.4, §10.2; P §3.6 Nr. 9, §4.1 (`schutzVerletzt`), §5.6 (M3.3), §7.2. **Liste:** nein.

### 4 · Florians Daten im Integrations-Arbeitsbaum

**Urteil:** stimmt in allen vier Punkten (P §2.4, §2.5, §4.9, §6.2 Schritt 1, §6.3, §7.5).

**Entscheidung:** gelöst durch F3 und F5. (1) Kein Integrations-Arbeitsbaum, keine Merges; sein Studio schreibt über die Ablage nach
`content/studio/`; die Integration committet seinen Stand getrennt. (2) Übernahme und Vergleich auf 5294 lesen Prototyp und
`schluessel.json` dieses Arbeitsbaums, also seinen lebenden Stand. Geschützt wird über den Schreibweg der eigenen Prozesse, nicht über
Prüfsummen vor und nach einer Probe (die könnten seine Arbeit nicht von einem Fehler des Baus unterscheiden): Ein Schreibhaken verweigert
und meldet jeden Schreibversuch eigener Prozesse unter `docs/look/ozzy-figur/` und `apps/editor/`; an Datensätzen „dein“ zählt nur ein
Schreiben der Ablage ohne Quelle florian. Seine eigenen Änderungen (Prototyp auf 5213, Studio auf 5217) lösen nie ein Anhalten oder
Zurücksetzen aus (P §6.3, §9.2 Nr. 5). (3) Zwei Geräte: der spätere gewinnt, der frühere kommt in
„Fassungen“. (4) Sicherungsring der letzten 50 Fassungen je Datei, dazu eine Woche lang je Stunde eine; Journal je Gerät.

**Stellen:** K §2.3, §10.2, §12; P §2.4, §2.5, §4.9, §6.2, §6.3, §7.5. **Liste:** ja (A25).

### 5 · Übernahme bricht ab, sobald er in Studio formt

**Urteil:** stimmt. P §6.3 bricht bei jedem „dein“-Schlüssel ab, der nicht aus `schluessel.json` stammt; M3 fragt nach dem Umzug
(P §5.6); M4.4 übernimmt danach Körper, Haltungen und Abläufe (P §5.7).

**Entscheidung:**
1. Die Übernahme führt datensatzweise zusammen (F5): Sie schreibt über Ablage und Store (Quelle automatik) nur Datensätze mit Herkunft
   „gebaut“ oder „vorlage“ unter ihren Pfad-Kennungen und legt Neues dazu. Einen Datensatz mit Herkunft „dein“ lässt sie stehen, schreibt
   den Rest und meldet die Kennungen (Prüfer-Hinweis im Editor; Nachtrag der Schlussprüfung, Plan 4.9; zuerst stand hier „bricht ab“).
2. **Bis zum Umzug ist seine `schluessel.json` eine fremde Quelle.** `projekt.json` nennt sie (`quellen`: Datei, Figur, Zuordnung
   Teilname → Bindung). Der Server liest sie bei jedem Laden und setzt seine Schlüssel über die Migration kern 0 → 1 als Datensätze mit
   Herkunft „dein“ ein; gespeichert werden sie nie. Bindungen, die so gespeist werden, sind in Studio bis zum Umzug nur zum Ansehen (Leiste
   fahren, Zwiebelhaut, Vergleich). Formen kann er sie im Prototyp oder in einem Probe-Projekt (Befund 26).
3. Der Server beobachtet `schluessel.json`. Speichert Florian im Prototyp, startet er die Übernahme des Kopfs neu (die gebauten Schlüssel,
   Anschlüsse und Faltschlüssel hängen an seinen), prüft danach Werte (Befund 20) und Parität und schreibt nur, wenn beides hält. Er
   startet 2 s nach dem letzten Speichern (der Prototyp speichert 300 ms nach jeder Änderung), höchstens ein Lauf zugleich; ein neuer
   Stand bricht den laufenden ab.
4. **Umzug:** Befehl „Kopfdrehung übernehmen“, nur Quelle florian. Er schreibt seine Schlüssel als gewöhnliche „dein“-Datensätze, nimmt die
   Quelle aus `projekt.json`, setzt dort den Vermerk `umgezogen` und beendet Beobachtung und Neustart. Nach dem Umzug lässt jede
   Übernahme, auch der volle Lauf am Etappenende, die Quelle und den Kopf aus und meldet das; sonst trüge sie die Quelle wieder ein und
   schriebe den Kopf aus dem alten Stand des Prototyps neu. `schluessel.json` bleibt, wie sie ist. Vorläufig: kein Umzug (A1).

**Stellen:** K §2.3, §12, §14; P §3.4, §5.6 (Frage), §5.7 (M4.4), §6.1, §6.3. **Liste:** ja (A1).

### 6 · Physikkörper und Kopplung an die Zeichnung

**Urteil:** stimmt. `DatensatzTabelle` hat keinen Typ für Körper (P §3.2); `PhysikPlan.huellen` nennt Brust, Becken, Kopf ohne Quelle
(P §4.3); Hüllen liefert der Autorig erst in M9 (P §5.12); P1 baut sie nur für die Probe (P §5.5); Box2D-Kopf und Chip „Ruhig halten“
stehen ohne Vorrang nebeneinander (K §6.1).

**Entscheidung:**
1. Das Körpermodell ist ein Datensatz der Figur (`Koerpermodell`, Vorsilbe `km`, eines je Figur; Typ in `typen/physik.ts`, seit M0),
   nicht Teil der Daten eines Bausteins: Bausteine hängen an Dingen einer Szene, Ozzy steht aber in mehreren Szenen und Probe-Projekten
   (eine Korrektur in einer Szene gälte sonst in den anderen nicht), und auch die Katze, ein Schläfer, braucht Körper für Absprung und
   Flug. Bausteine (`vierbeiner`, `schlaefer`) nehmen es von der Figur ihres Dings; `PhysikPlan.huellen` je Figur daraus. Seine Felder
   (nach der Prüfung so übernommen, dazu `id`, `figur`, `herkunft`):

   ```ts
   koerper: { rolle: string;                 // 'rumpf.vorn', 'rumpf.hinten', 'kopf'
              knochen: Id<'kn'>; huelle: Huelle; masseAnteil: number;
              gelenk?: { an: string; punkt: Punkt; grenzen?: [number, number] };   // Motor-Gelenk zum Körper der Rolle `an`
              abweichung?: { regler: Id<'rg'>; groesse: 'winkel' | 'laengs' | 'quer' }[] }[];
   federbeine: { rolle: string; koerper: string; achse: Id<'kn'>; von: Punkt; laenge: number; feder: Feder }[];
   glieder: { rolle: string; knochen: Id<'kn'>; huelle: Huelle; an: string; punkt: Punkt; grenzen?: [number, number] }[];  // nur im Sturz
   ```

   Hüllen in Figur-Einheiten der Grundform. Die Höchstkraft jedes Gelenks ist der Wert der Spannung (Befund 16 h). Federbeine haben
   Vorspannung: Ihre Ruhelänge ist so gewählt, dass beim Gewichtsanteil des Beins genau die gezeichnete Länge `laenge` gilt (bei einer
   Feder mit Frequenz f die gezeichnete Länge plus g/(2πf)²); ohne sie säße Ozzy unter seinem Gewicht tiefer als gezeichnet.
2. **Woher:** Für Ozzy schreibt das Inhalt-Skript in M5.6 das Körpermodell seiner Figur (Teilnamen sind dort erlaubt): Rumpfhülle als
   Kapsel längs der Hauptachse der Bohne (Länge und halbe Dicke aus ihrer Grundform), in der Mitte geteilt in „rumpf.vorn“ und
   „rumpf.hinten“; Kopf als Kreis um die Kopfmitte (Radius: halbe mittlere Ausdehnung bei θ 0°); Federbeine mit Vorspannung an den
   Wurzeln der Beinachsen; zehn Glieder für den Sturz. Für neue Figuren, auch die Katze, legt es der Autorig an (M9).
3. **Kopplung:** (a) Der Wurzelknochen folgt immer dem Körper „rumpf.hinten“ (Lage x, y, Drehung der Figur); eine zweite Regel für die
   Wurzel gibt es nicht. Die gezeichnete Höhe in Ruhe kommt aus der Vorspannung der Federbeine. (b) Jeder andere Körper schreibt seine
   Abweichung vom Gelenkziel nur in die Regler, die `abweichung` nennt (Ozzy: „rumpf.vorn“ längs → Stauchung; „kopf“
   Winkel → Nicken), sonst nirgends hin. (c) Die Abweichung wirkt mit einem Anteil s: s geht über eine Feder (0,3 s, 0 %) auf 0, wenn alle
   Körper seit 0,5 s langsamer sind als 0,05 L/s und 2°/s, sonst auf 1. In Ruhe zeigt die Figur also genau Pose und Zeichnung, auch wenn die
   Motor-Gelenke unter der Schwerkraft nachgeben. (d) Hängt an einem Regler ein Chip der Figurphysik (Schwingen, Kette, Stauchen, Ruhig
   halten), gewinnt der Chip; die Abweichung eines Box2D-Körpers zählt dort nur im Sturz (Spannung unter 50 %).
4. **Test** (M5.3, M5.Z): 10 s Stehen auf ebenem Boden im Prüfstand, Verweilen und Zusatzbewegungen aus (Stehen hat vorläufig kein
   Verweilen, A28; so gilt der Test auch, wenn Florian Atmen anschaltet), jeder Anker im Rahmen der Figur auf 1e-6 wie gezeichnet; ein
   Federbein steht beim Gewichtsanteil auf seiner gezeichneten Länge. Auf dem Hügel stellen die vorgespannten Federbeine die Pfoten auf
   den Rand (keine eigene Regel für die Lage der Figur); den Rest der Krümmung (unter 0,005 L) gleichen die Beinachsen aus; der Prüfstand
   zeigt die größte Abweichung als Zahl.

**Stellen:** K §3.1, §4 (Nebenprodukte), §6.1, §6.3; P §3.2, §4.3, §4.5, §5.5 (P1), §5.8 (M5.0, M5.3, M5.6), §5.11 (M8.1), §6.2.
**Liste:** nein.

### 7 · Rückblick, Aufgaben, Tagebuch fehlen im Spiel; Text in Lobster

**Urteil:** stimmt. P §2.2 legt `rueckblick`, `aufgaben`, `tagebuch` nach `apps/studio/src/spiel/`; das Spiel importiert nichts aus Apps
und hat höchstens 300 Zeilen (P §2.3 Nr. 4, 5); `studio-bild` kann keinen Text zeichnen (P §4.6).

**Entscheidung:**
1. Rückblick, Aufgabenzettel und Tagebuch gehören zur Laufzeit: Bausteinarten `rueckblick` (spielt bis sechs gespeicherte Stürze der
   Runde über `auswerten` ab, Befund 16 j) und `aufgaben` (führt, welche Aufgaben erfüllt sind, und stellt Haken über Regler). Gezeigt
   werden sie als Posen des Rahmens („Zettel“, „Rückblick“, „Tagebuch“), gezeichnet von `studio-bild` wie alles. Im Editor bleiben nur
   ihre Bedienflächen (Aufgaben mit Beweisen, „Warum?“).
2. **Text ist eine Figur, kein zweiter Zeichenweg.** Gewählt, weil Buchstaben dann formbar, verschmelzbar und mit Wechseln steuerbar sind
   wie jede Form und das Spiel keinen Schriftcode braucht. Ein Werkzeug liest `assets/fonts/lobster/Lobster-Regular.ttf` (opentype.js, nur
   im Editor und in den Skripten) und schreibt eine Glyphentabelle ins Projekt: quadratische Stücke exakt kubisch
   (c1 = p0 + ⅔·(q − p0), c2 = p2 + ⅔·(q − p2)), Laufweiten, Unterschneidung. Der Befehl „Text“ und der Handgriff `textSetzen` legen aus
   einer Zeichenfolge eine Figur an: je Glyphe ein Teil in Textfarbe, je Innenraum (o, e, a …) ein Teil in der Grundfarbe darüber
   (Standard Papier). Wechselnde Zahlen sind Ziffern-Figuren: zehn Teile mit Wechseln an einem Regler; die Bausteinart `zaehler` liefert
   dafür die Messwerte `einer` und `zehner`, Drähte stellen die Regler.
3. Grenze: Text auf anderem Grund als Papier braucht echte Löcher (Formen mit Löchern, später). Vorläufige Entscheidung A11.
4. Etappen: Glyphen, Befehl und Handgriff in M7.6, Zettel im Inhalt von M7, Rückblick in M8.3, Tagebuch in M10.3. Die Spiel-App bleibt bei
   höchstens 300 Zeilen.

**Stellen:** K §11.6, §11.7, §13; P §2.2, §2.3, §4.6, §5.10, §5.11 (M8.3), §5.13 (M10.3), §5.14. **Liste:** ja (A11).

### 8 · Kehrtwende und Rückansicht

**Urteil:** stimmt. Haltungen nur mit ψ = 90 (raster.ts:176, 1017–1023); `teile()` klemmt ψ auf 0° bis 90° (raster.ts:1002). Der
Faktenfehler stimmt: `docs/look/ozzy-figur/vorlagen/ozzy_back.svg` existiert, `ANSICHTEN.back` ist Körper 180°, Kopf 180°
(vorlagen/import.ts:40–43); der Prototyp nutzt sie für den Kopf bei 180° (raster.ts:462–464). Offen ist nur der Körper zwischen 90° und
180° (Übergabe ozzy-figur, „Offen nach C“).

**Entscheidung:**
1. **Vorläufig über die Front** (A4): Die Kehrtwende ist ein gestalteter Übergang der Schicht Körper, ψ 90° → 0° → −90°, 0,5 s,
   unterbrechbar. Gewählt, weil sein Stehen bei 0°, 45° und 90° gezeichnet ist und die Spiegelung den Rest trägt; über den Rücken müsste
   der Körper von 90° bis 180° erst gebaut werden wie beim Kopf.
2. Während der Wende ruht der Gang: Phase hält, Standpfoten stehen, Wunschtempo 0. Gewendet wird nur aus „Stehen“, weil nur sie eine
   Vorderansicht hat; aus jeder anderen Pose, auch aus „Schritt“, geht der Planer zuerst über den Ausgleich nach „Stehen“. Wann er wendet,
   stellt der Kanal `wendenNach` des Vierbeiners (Standard 0,3 s jenseits des Scheitels, A17). Andere Posen bekommen eine Vorderansicht
   erst, wenn Florian
   eine Zeichnung auf „Körper 0°“ fallen lässt (Kreuzschlüssel Pose × ψ).
3. Hüllen: „rumpf.vorn“ und „rumpf.hinten“ rücken über das Gelenkziel zusammen; Abstand = gezeichneter Abstand mal |sin ψ|, mindestens
   die halbe Rumpfbreite. Keine Hülle wird je Takt umgeformt. Die Beinachsen gleichen Pfotenhöhen am Hang aus.
4. ψ und θ: In der gespiegelten Hälfte von ψ (ψ < 0°) werden die Regler mitgespiegelt, die die Spiegelregel von ψ nennt
   (`Spiegelregel.regler`; bei Ozzy θ um 360°, Nicken und Kopf schief um 0°). Posen und Regeln nennen θ immer relativ zur Laufrichtung;
   θ = 0° bleibt der Blick in die Kamera. Die Taktleiste der Kehrtwende führt θ beim Durchgang durch ψ = 0° über 0°. Wechselt ψ sonst das
   Vorzeichen, während ein mitgespiegelter Regler nicht auf seiner Achse steht, nimmt der Ausgleich den Sprung auf.
5. Text berichtigen (K §11.6, §13): „Gezeichnet ist deine Rückansicht bei 180°; der Weg von 90° bis 180° ist nicht gebaut.“ Eine Drehung
   um 360° beim Einkringeln entfällt weiter (zwei Kehrtwenden über die Front).

**Stellen:** K §5.4, §11.6, §11.7, §13, §14; P §1, §3.2 (`Spiegelregel`), §5.8 (M5.3), §6.2 Schritte 4, 8, 9, §6.4. **Liste:** ja (A4).

### 9 · Kontaktschatten auf Ozzys Körper

**Urteil:** stimmt. K §7 „Regel für Ozzy“ nennt den Kontaktschatten auf seinem Körper; K §11.7 schaltet „Kontakt- und Bodenschatten“ an.

**Entscheidung** (nach der Prüfung auf eine Lesart gebracht): Kontakt- und Bodenschatten sind „nurFlorian“ wie die übrigen Effekte
(Befund 30 d): Sie fallen auf Boden und Welt; auf ein Teil mit `wieGezeichnet` nur, wenn ein Datensatz mit Herkunft „dein“ sie dort
anschaltet, also nur auf sein ausdrückliches Wort (F1). Ohne einen solchen Datensatz erscheinen auf Ozzys Körper nur Verschmelzen,
Dickenregel, Kantenglättung mit Spitzenregel, Weiß nachgeben und die Beinschattierung in Bewegung. Die Sperre steht in den Daten. Test in
M6.1: Ohne Datensatz „dein“ fallen die Schatten nur auf Welt und Dinge. Text in K §7 und §11.7: „Schatten fallen auf Boden und Welt;
auf ihn nur, wenn du sie an ihm selbst anschaltest.“

**Stellen:** K §7, §11.7, §13; P §5.9 (M6.1), §6.4. **Liste:** ja (A7).

### 10 · Wetten und Spielgefühl werden spät geprüft

**Urteil:** stimmt. Die Messseite ersetzt in M2 Fehlendes nur „beschriftet“ (P §5.5); die erste Szenenmessung im Budget kommt in M6
(P §8.2), die Werkbank-Probe in M4, Nicole in M6 und M7. Die Tageszahlen der Kritik sind oben etwas hoch: Nach P §5.2 endet M4 nach rund
36 bis 53, M6 nach rund 63 bis 93 Arbeitstagen.

**Entscheidung:**
1. **Ersatzszenen in M2** (Messblock „Block 3“; die Messblöcke heißen nicht mehr B0 bis B9, damit sie nicht mit den Proben B1 bis B16
   verwechselt werden), alle aus seinen SVGs über `svgImportieren`, ohne Übernahme: (a) ganzer Ozzy (Logo) einmal, (b)
   sechsmal (Maß für den Rückblick), (c) Ersatz-Spielwiese: gebackener Hügel, Ozzy, drei gebackene Dinge, 80 analytische Kreise, (d) zwei
   bewegte Figuren (Ozzy und ein gespiegelter, auf 70 % verkleinerter Ozzy als Platzhalter der Katze). Kriterien (iPhone 16 kalt): Grafik
   Ozzy ≤ 3 ms, jede Szene ≤ 8 ms, Reserve ≥ 2. Am Mac misst die Seite in Safari (WebDriverIO mit safaridriver, sobald Florian es
   eingeschaltet hat, B6; sonst WebKit von Playwright) und rechnet mit Faktor 3 bis 4 um: ein Hinweis, keine iPhone-Messung.
2. **P1 bekommt den Modus „Tapsen“:** Draht Hang → Wunschtempo mit der Kennlinie aus K §6.3, Kräftepaar mit Bremskraft 0,3 g, Ozzys Logo
   starr auf den Körpern, ein Wippen im Schritttakt statt des Gangs, Finger am iPhone. Das ist der erste spielbare Stand (Befund 23).
   Probe mit Nicole (B5): ohne Erklärung, höchstens drei Versuche: Ozzy 30 s in der Stehzone halten; ihn in den Trab und zurück in den Stand
   bringen; ein Satz, ob es Spaß macht und was nervt.
3. **Die aktive Stelle prüft der Bau früh selbst:** Ort-Probe in M3.Z (Playwright mit echten Zeigerereignissen, Maus und Stift, auf einer
   Kopie): 200 Züge an zufälligen Stellen (Leiste, Posenkarte, Brücke) und Teilen; vor jedem Zug werden Statuszeile, rote Ringe und
   Tropfen gelesen, danach der Diff. Kriterium: Die Vorschau nennt genau die Datensätze, die sich ändern (Ziel und ruhende Schlüssel), und
   kein anderer ändert sich. Läuft danach bei jeder Änderung an Werkzeugen oder Zielregel. Florians Werkbank-Probe Teil 1 kommt in M3 (B7),
   Teil 2 in M4 (B8). Einen Klick-Versuch im bestehenden Werkzeug gibt es nicht: sein Prototyp wird nicht geändert.
4. Rückfälle nach Tabelle F1.

**Stellen:** K §0, §9.7, §12; P §5.5, §5.6, §5.7, §8.2, §9.1. **Liste:** ja (B3, B4, B5, B7, B8).

### 11 · Toleranzen passen nicht zusammen

**Urteil:** stimmt. Die Rundung auf 1/1000 (P §3.5 Nr. 3) gibt bis 0,0005 je Koordinate, bis 0,0007 je Punkt; Glätten bis 0,001
Kurvenänderung (K §2.1, P §3.4) verschiebt einen Griff bis rund 0,0023 (größtes Bernstein-Gewicht 4/9); Parität und Migration verlangen
jeden Griff unter 0,001 (P §5.4, §3.4).

**Entscheidung** (nach der Prüfung neu gefasst; die Rechnung je Quelle steht in P §3.5):
- **Gemessen wird an Kurvenpunkten,** nicht an Griffen: je Kurvenstück t = 0, 1/8, …, 1 (Anker eingeschlossen); Abweichung = größter
  Abstand gleicher Stellen. Das gilt für Parität (M1, M4), Migration, Ruhe-Wächter und jeden Vergleich mit dem Prototyp.
- **Es wird nicht gerundet:** Lagen, Längen, Winkel und Kennlinien stehen in der kürzesten Darstellung, die beim Lesen dieselbe Zahl
  ergibt (`String(x)`, −0 als 0); der Rundweg bleibt bitgleich. Die frühere Rechnung („Rundung auf 1/1000, ≤ 0,0007 je Punkt, Summe
  ≤ 0,0009“) prüfte nur den Anker einzelner Schlüssel: An Kurvenpunkten kommen die gerundeten Grifflängen dazu (rund 0,0011, mit
  Glätte-Regel 0,0013), dazu die gerundeten Kennlinien von Kopfversatz und Halslage. In der Mischung des Prototyps wird es schlimmer:
  PCHIP verstärkt jede Änderung zwischen Faltschlüsseln, die 0,07° neben ihrem Nachbarn liegen, und Griffe der auf 1/1000 verkleinerten
  Masken würden gerundet 0, dann nimmt die Mischung den Winkel des nächsten Schlüssels (in der Prüfung gemessen bis 0,012 und 0,57
  Einheiten). Auch 1/100 000 ließe Griffe unter 5e-6 kippen.
- **Glätte-Regel:** glatt nur, wenn beide Griffe höchstens 0,2° neben einer Geraden liegen und sich kein Kurvenpunkt um mehr als 0,0002
  ändert. Sie gilt beim Einlesen neuer SVGs und mit ⇧C (seine Entscheidung); Übernahme und Migrationen wenden sie nicht an (Ecken mit
  genau ihren Winkeln), weil PCHIP auch sie verstärkte. Fast glatte Anker nennt der Importbericht.
- Die Schwelle der Parität bleibt 0,001, erwartet wird unter 1e-6. Bitgleich bleibt, was bitgleich sein muss (Prüfsumme der Laufzeit,
  Rundweg Schreiben–Laden in Bytes). Test in M1.2: Der Rundweg macht keinen Griff unter 1e-6 Länge zu einem darüber und umgekehrt; in
  M1.8 wird die Parität an den geschriebenen Dateien gemessen.

**Stellen:** K §2.1, §2.3, §2.4 (Ruhe-Wächter), §10.4; P §3.4, §3.5, §5.4 (Probe 1), §6.1, §7.1. **Liste:** nein.

### 12 · Bezugsrahmen der Versätze

**Urteil:** stimmt. K §3.1 nennt die Speicherung je Knochen-Einfluss Standard; das Format kennt nur `VersatzZeile` im mitlaufenden
Rahmen (P §3.2); M6.3 testet beide Rahmen (P §5.9), gewichtete Teile entstehen erst in M9.2.

**Entscheidung:** **Ein Bezugsrahmen für alle Zusatzformen:** der mitlaufende Rahmen der gezeigten Form im Ruheraum, vor den Knochen
(Formel bei 16 a). Die Knochen tragen den Versatz mit (starr, Biegeachse, Gewichte mit Drehzentren). Gewählt, weil eine Regel für alles
reicht, die Datei klein bleibt und Drehzentren das Schrumpfen am Gelenk schon verhindern. Eine Speicherung je Einfluss gibt es nicht. Der
Test „beide Bezugsrahmen nebeneinander“ in M6.3 entfällt. Vergleich in M9.2: Bild `m9-bezugsrahmen.png`, ein gewichtetes Teil der Katze
mit Korrektur, um 90° gebogen, mitlaufender Rahmen gegen „je Einfluss“ (nur im Probe-Skript gerechnet). Text K §3.1 entsprechend.

**Stellen:** K §2.1, §3.1 (Absatz Bezugsrahmen), §3.2; P §3.2 (`VersatzZeile`), §5.9 (M6.3), §5.12 (M9.2). **Liste:** ja (A10, B14).

### 13 · Spitzenführung und Rückrechnung

**Urteil:** stimmt teilweise. Die Lücke stimmt: Der Prototyp schaltet die Führung eines Teils ab, sobald irgendein Schlüssel zwischen 45°
und 90° liegt (raster.ts:895–896); in der zweiten Hälfte nimmt ein Teil die Spitzen seines Partners (raster.ts:914–916). Nicht ganz: Heute
ist sie nur an Bart B aus (und darum gespiegelt auch an Bart A), wegen der Übermalung bei 67° (vorlagen/zwischen.ts) und seiner Schlüssel
bei 75,5° und 79,5° (`schluessel.json`). Die Masken haben zwischen 45° und 90° keinen Schlüssel; dort ist sie an.

**Entscheidung:**
1. **Regel** (Bauplan, `form/spitzen.ts`, nie gespeichert): Eine Spitzenführung ruht, solange zwischen `von` und `bis` (Grenzen
   ausgenommen) ein Schlüssel ihrer Bindung liegt, Stützen und ruhende Schlüssel ausgenommen. `Bindung.spitzen` ist eine Liste: Neben der
   Führung von 45° bis 90° hat jede Kopfbindung eine zweite, gespiegelte für 270° bis 315° (Spitzen und Regel des Partners, Rahmen aus den
   gespiegelten Einträgen bei 270° und 315°, raster.ts:912–920). Abschnitte, die als Ganzes gespiegelt sind, gibt es im Kopf nur für Teile
   ohne Rücken zwischen 180° und 270° (dort gilt die Führung der gespiegelten Bindung); die übrige zweite Hälfte sind Listen mit
   gespiegelten Einträgen (F1). So ist jede Form an jedem Schlüssel exakt, und die Übernahme bleibt gleich dem Prototyp. Legt ein
   Zug dort einen Schlüssel an, ruht die Führung im selben Rückgängig-Schritt; die Vorschau sagt es vorher („Spitzenführung von <Teil>
   45°–90° ruht danach“).
2. **Rückrechnung** (`editor/rueckrechnen.ts`) zählt alle Schritte nach dem Mischen auf und behandelt jeden: flüchtige Schritte (Gelee,
   Glätte-Schutz) sind beim Formen aus (Ist = Soll; die Abweichung der Box2D-Körper wirkt nur über Regler, Befund 6); Knochen werden
   exakt invertiert (starr: inverse Matrix;
   Biegeachse: örtlicher Rahmen bei u; Gewichte: gemischte Abbildung des Ankers, Griffe mit ihrem Satz); Zusatzformen: Ziel ist immer ein
   Schlüssel an der Stelle, dort ist das Mischen exakt, der Versatz wird direkt im Rahmen der gezeigten Form gesetzt; ist das Ziel der
   Ansichtsschlüssel und wirken Zusatzformen, bestimmt ein Fixpunkt die neue Gestalt (g ← Ziel − Σ Zusatz(g), Abbruch unter 1e-9, höchstens
   acht Schritte, sonst Meldung statt Zug); die Spitzenführung ruht am Ziel nach der Regel; in der Spiegelhälfte wird der Punkt gespiegelt
   (und umnummeriert) und der Schlüssel des Partners ist das Ziel.
3. Eigenschaftstest (M3.1, M4.5): Der gezogene Punkt liegt auf 1e-6 am Ziel; kein gespeicherter Schlüssel an einer anderen Stelle ändert
   sich. Dass sich die Gestalt zwischen Schlüsseln ändert (ruhende Schlüssel, ruhende Spitzenführung), ist gewollt und steht vorher in der
   Vorschau.

**Stellen:** K §2.2, §3.1 (Rückrechnen); P §3.2 (`Spitzenfuehrung`), §4.4, §4.7, §5.6 (M3.3), §5.7 (M4.5), §6.2 Schritt 5.
**Liste:** nein.

### 14 · Handgriffe unvollständig

**Urteil:** stimmt, mit einer Einschränkung: P §4.7 hat `weltpfadFormen`; es fehlen aber Regler, Bindung, Wechsel, Verbindung, Zyklus,
Schicht, Aufgabe, Marke, Szene, Welt anlegen und Stoff, und kein Test sichert die Gesten. `weltpfadFormen` ist dasselbe wie `formSetzen` am
Hügel und entfällt („Die Welt ist auch eine Form“).

**Entscheidung:**
1. Vollständige Liste unter `studio-laufzeit/src/editor/handgriffe/` (je Handgriff die Zeile aus „Ding × Geste“):

| Datei (Etappe) | Handgriffe | Ding × Geste |
|---|---|---|
| `logik.ts` (M1.7) | `drahtLegen`, `kennlinieFormen`, `drahtAendern`, `drahtLoesen`, `bausteinAnhaengen`, `bausteinAendern` | Ausgang: Ziehen auf einen Regler; Kennlinie: Ziehen; Draht: Halten → glätten, lösen; Ding: Halten → „+ Verhalten“; Baustein: Tippen → Regler |
| `form.ts` (M3.1) | `formSetzen` (Anker, Griff, Kurvenstück über `rueckrechnen`), `teilVerschieben`, `figurVerschieben`, `figurAnlegen` | A ziehen; V ziehen (Teil, Figur; ⌥ dreht); Bibliothek ＋ Figur |
| | `ankerSetzen`, `ankerLoeschen`, `ankerUmwandeln` (glatt, Ecke, rund) | P oder Halten → „Anker setzen“, „löschen“; ⇧C oder Halten → glatt, Ecke, rund; Griff: ⌥ ziehen bricht, Halten → koppeln |
| | `schluesselVerschieben`, `schluesselKopieren`, `schluesselSpiegeln`, `schluesselLoeschen` | Raute: Ziehen; Halten → kopieren, spiegeln, löschen |
| | `wechselSetzen`, `wechselAendern`, `teilTauschen` | Leiste: Halten → „Wechsel hier“, „Teil tauschen“; Strich: Ziehen, Halten → Breite, Art |
| | `bindungAnlegen`, `reglerAnlegen`, `reglerAendern`, `mischartSetzen`, `spiegelSetzen` | Teil: Halten → „an Achse hängen“; Leiste: ＋; Halten → Bereich, rund, Mischart, Spiegeln |
| | `verbindungSetzen` (verschmelzen, Fuge), `ebeneSetzen` | Teil: Halten → „Verschmelzen“, „Fuge“, „Ebene“ |
| | `figurAusSvg`, `ansichtAusSvg` | Datei auf die Bühne; Datei auf eine Stelle der Leiste |
| `projekt.ts` (M3.1) | `klangImportieren`, `hinweisUebergehen`, `fassungWiederherstellen`, `kopfdrehungUebernehmen` | Datei auf die Bibliothek; Prüfer-Hinweis: Halten → übergehen, wiederherstellen; Befehl „Kopfdrehung übernehmen“ |
| `posen.ts` (M4.5) | `poseAnlegen`, `poseVerdoppeln`, `poseSpiegeln`, `poseUmbenennen`, `poseOrdnen`, `poseNurTeile`, `poseWerteSetzen`, `schichtAnlegen` | Posen-Reihe ＋, Halten → „neue Schicht“; Posenkarte: Halten → verdoppeln, spiegeln, umbenennen, nur Teile, „als Pose behalten“; Ziehen ordnet; Anfasser an der Stelle Pose |
| | `uebergangArt`, `uebergangFeder`, `uebergangAendern`, `varianteAnlegen` | Brücke, Zelle: Ziehen = Dauer; Halten → Art, Unterbrechen, Varianten |
| | `zwischenposeSetzen` (über `rueckrechnen`), `abschnittAendern`, `zusatzSetzen`, `stehSetzen`, `markeSetzen`, `spurSetzen` | Zug an der Stelle Übergang; Kante ziehen; Halten → Kurvenart, „bis Ereignis“, Stärke; ＋ Zusatzbewegung, Marke, Spur |
| | `zyklusAnlegen`, `zyklusZeileSetzen` | Posenkarte: Halten → „als Zyklus“; Feld: ＋ Zeile |
| `knochen.ts` (M4.5) | `knochenSetzen`, `knochenAendern`, `gelenkVerschieben`, `anheften`, `gewichtSetzen`, `griffSatzSetzen`, `gewichteSpiegeln` | Linse Knochen: P setzt; Gelenkring ziehen; Halten → Rolle, starr, biegsam, Knie; Teil auf Teil ziehen; Füllring senkrecht ziehen; Halten → Schloss, spiegeln; W malt |
| `welt.ts` (M5.2) | `szeneAnlegen`, `weltAendern`, `stoffAnlegen`, `dingSetzen`, `dingVerschieben`, `dingVerdoppeln`, `dingAendern` | Bibliothek ＋ Szene, Stoff; Eigenschaften der Szene; ＋ Ding oder Zone; Ding auf dem Rand ziehen, Rand = Breite; Halten → Material, verdoppeln; Strecke: Ding ziehen |
| `physik.ts` (M5.4) | `chipAnhaengen`, `chipAendern`, `chipKopieren`, `extremeFormen`, `effektAnhaengen`, `effektAendern`, `klangAnhaengen` | Teil oder Ding: Halten → „+ Verhalten“, „+ Effekt“, „+ Klang“; Chip: Ziehen = Stärke; Halten → an/aus, auf Partner, Extreme formen |
| `editor/aufnehmen.ts` (M8.4) | `aufnehmen` | Mitschnitt: Halten → „aufnehmen“; Chip: Halten → „in Schlüssel“ |
| `logik.ts` (M7.1) | `regelAnlegen`, `regelAendern`, `regelBand`, `regelGeltung`, `launeAnbieten`, `aufgabeAnlegen`, `beweisSetzen` | ＋ Regel; Ding: Halten → „Laune anbieten“; Regel: Ziehen ins Band; Halten → bearbeiten, aus, nur dieses Ding; ＋ Aufgabe; Mitschnitt: Halten → „als Beweis“ |
| `text.ts` (M7.6) | `textSetzen` | ＋ Text |

2. Regel: Jeder Handgriff ist ein registrierter Befehl mit Geste oder Taste. Test `apps/studio/test/handgriffe.test.ts` (ab M3, wächst mit):
   jeder exportierte Handgriff hat einen Befehl in `befehle/*` mit Geste oder Taste; jeder Handgriff, den `tools/studio-inhalt` aufruft,
   ist darunter.
3. Probe in M11 (B16): Florian baut ein neues kleines Ding samt Regel nur im Editor.
4. Nach der Prüfung ergänzt (P §4.7): Löschen je Typ (`teilLoeschen`, `poseLoeschen`, `dingLoeschen` und so weiter, je in der Datei
   seines Typs; Halten → „löschen“, dazu ⌫); jedes löst Verweise auf und folgt der Schutzregel. `wertSetzen` folgt den vier Verben
   (Befund 24): Tippen holt die Achse auf die Leiste und ändert nichts, Ziehen setzt den Schlüssel, Halten → „Schlüssel hier“.

**Stellen:** K §9.5, §11.7 („Teil der Demo → Studio-Mittel“); P §4.7, §5.14, §6.4. **Liste:** ja (B16).

### 15 · Wellen hängen voneinander ab; Dateien ohne Besitzer

**Urteil:** stimmt. M3.2 braucht `schutzVerletzt` aus M3.1; M4.3 testet „kein Sprung“ mit dem Ausgleich aus M4.1; M5.3 testet gegen Takt
und Welt aus M5.1 und M5.2, die Attrappe hat keine Reibung (P §5.3); M5.6 braucht `chipAnhaengen` aus M5.5; `bauen.ts` und
`uebernahme.ts` gehören keinem Paket; M1.3 legt `fassade.ts` an, M1.6 ändert `main.ts`, beide Zusammenbau (P §5.1); geteilte Ports;
kein Meldeweg.

**Entscheidung:**
1. Jedes Paket hat eine Zeile „braucht“; Pakete einer Welle hängen nicht voneinander ab (Abschnitt 4). Abhängige Pakete gehen in die
   nächste Welle; keine Attrappe mit Reibung.
2. **Zusammenbau-Dateien** (nur die Integration ändert sie; M0 legt sie leer an): `studio-laufzeit/src/fassade.ts`, `bauplan/bauen.ts`,
   `apps/studio/src/main.ts`, `befehle/alle.ts`, `pruefhaken.ts`, die Registerlisten, `tools/studio-uebernahme/src/uebernahme.ts` und
   `tools/studio-inhalt/src/inhalt.ts` (jeweils nach ihrem ersten Paket). Nach jeder Welle verdrahtet die Integration sie, damit die nächste
   Welle sie benutzen kann.
3. Tests, die zwei Pakete derselben Welle brauchen, laufen im Zusammenbau dieser Welle (etwa „300 Zufallsklicks ohne Sprung“ in M4.Z).
4. Gemeinsame Dateien legt der Vertragsschritt fertig an: `studio-format/src/{anker,kennung,versionen}.ts`, `studio-rechnen` (mit
   vorläufigen Winkelfunktionen und SHA-256), `studio-laufzeit/src/bauplan/{ordnung,regler}.ts`. Der Store bekommt die Prüffunktion
   übergeben (Befund 30 a), statt `pruefen.ts` zu importieren.
5. Ports und Ausgaben nach F3 und F4; Meldeweg nach F3 (Abschlussbericht an den Workflow).

**Stellen:** P §2.4, §2.5, §5.1, §5.3, §5.4 (M1.3, M1.6), §5.6, §5.7, §5.8, §9.1. **Liste:** nein.

### 16 · Typen und Formeln (a bis l)

**Urteil:** stimmt in allen zwölf Punkten. Zu k: Der Prototyp rechnet die Stückzahl je Bild aus der Länge des abgebildeten
Kontrollpolygons (form.ts:81–104 mit `fein` 1,5; renderer.ts:388).

**Entscheidung:**
- **a) Mitlaufender Rahmen.** Für Anker i der gezeigten Form (nach Ansicht und Anheftung, vor Zusätzen): d = p(i+1) − p(i−1), zyklisch;
  an den Enden einer offenen Linie p1 − p0 bzw. pn − pn−1. τ = d/|d|, ν = (−τy, τx), L = |d|/2 (an Enden |d|). Ist |d| < 1e-9, gilt L = 0
  (der Versatz verschwindet; ein Teil, das auf einen Punkt läuft, bleibt ein Punkt). Ecken und glatte Anker gleich. Anwenden:
  p' = p + L·(längs·τ + quer·ν); Griffwinkel w' = w + dw (an Ecken je Griff); Grifflängen l' = max(0, l + dl·L). Alle Längenversätze sind
  damit wie die Lagen durch L geteilt gespeichert.
- **b) Nachlauf:** `Regler.nachlauf?: number` (Sekunden, 0 bis 0,5, Standard 0). Springt das Soll durch einen Posenwechsel im
  Standardübergang, beginnt der Ausgleich dieses Reglers so viel später. In den Eigenschaften eines Teils stellt „Nachlauf“ die Regler
  seiner Knochen.
- **c) Vorrang:** (1) Ein gestalteter Übergang stellt die Regler seiner Taktleiste; Ausgleich nur, wenn er unterbrochen wird oder mit einem
  Sprung beginnt. (2) Ein Standardübergang nimmt die Feder des passenden Übergangs-Datensatzes: genaues Paar vor „nach Y“ vor „von X“ vor
  „jede → jede“; dazu `nachlauf`. Den globalen Standard trägt der Datensatz `jede → jede` jeder Schicht (0,7 s, 0 %; die Schicht legt ihn
  beim Anlegen an). (3) Jeder andere Sprung (Regel, Draht, Hand im Spiel, Laune, Ende eines Übergangs, Wechsel der Spiegelhälfte):
  `Regler.ausgleich`. Beim Formen Ist = Soll.
- **d) Rahmen, Kamera und Musik sind Figuren ohne Teile** (Regler, Schichten, Posen, Übergänge). `Ding.figur` wird Pflicht. Die Uhr ist ein
  Baustein am Ding des Rahmens.
- **e) Kanäle:** Ein Kanal ist ein Eingang eines Dings, um den Regeln streiten: jeder Regler seines Bausteins (`Baustein.regler[name]`,
  etwa Wunschtempo, Bremskraft) und je Schicht seiner Figur die Pose (`pose.<Schicht>`); dazu `zeitfaktor` der Szene. Kennung
  `<Ding>.<name>`. **Grundwert:** Ist der Wert in `Baustein.regler` eine Regler-Kennung, gilt dieser Regler samt Draht und Hand, sonst die
  Zahl. Posen-Kanäle: die Pose, die der Baustein des Dings verlangt (Vierbeiner aus seinem Zustand), sonst die zuletzt angeforderte, sonst
  die Grundform. Regeln überschreiben den Grundwert nach Band. `Bausteinart.kanaele` listet nur Reglernamen.
- **f) Felder und Kreuzschlüssel, eine Regel** für Bindungen mit zwei Achsen: Schlüssel liegen auf einem Gitter (je Achse die Stellen
  der Schlüssel und die Ruhestelle; bei Feldern höchstens drei je Achse). Fehlende Gitterpunkte ergänzt der Bauplan, nie die Datei:
  zuerst auf Ruhezeile und Ruhespalte per PCHIP über die vorhandenen Punkte dieser Linie (ein Punkt: konstant; bei Zusatz-Bindungen ist
  der Ruhepunkt null), dann jeden übrigen als Zeile + Spalte − Mitte. Gemischt wird über das volle Gitter: PCHIP längs der ersten Achse,
  dann längs der zweiten. Exakt an jedem Schlüssel; ein Kreuzschlüssel ist auf Ruhezeile und Ruhespalte null.
- **g) „Ausprobieren“:** `Stelle` bekommt `{ art: 'ausprobieren'; schicht: Id<'sch'> }`. Dort stellen nur Anfasser Regler; A, V, P sind
  gesperrt (die Statuszeile sagt warum); Halten → „als Pose behalten“ ruft `poseAnlegen`. Gespeichert wird sonst nichts.
- **h) Spannung** ist ein Regler der Figur (Rolle `spannung`, 0 bis 1, Standard 1); weitere Regler `spannung.<rolle>` gelten für Knochen
  dieser Rolle und multiplizieren. Posen setzen sie über `werte`, gestaltete Übergänge über Spuren. `Pose.spannung` und
  `Taktleiste.spannung` entfallen; jede Taktleiste hat `spuren`.
- **i) Eine Quelle für den Charakter:** Regler der Figur mit den Rollen `charakter.schwer`, `charakter.wabbelig`, `charakter.tollpatschig`
  (−1 bis 1, Standard 0). `Figur.charakter` entfällt. Der Vierbeiner liest „tollpatschig“ über `Baustein.regler.tollpatschig` = Kennung
  dieses Reglers.
- **j) Auswerten:** `Laufzeit.auswerten(werte: Float64Array, lagen: Float64Array | null, aus: BildDaten): BildStand` rechnet die Schritte
  10 bis 16 aus gegebenen Reglerwerten und Körperlagen, ohne den Lauf zu ändern, und hängt an `aus` an (je Aufruf ein Feldsatz).
  `bild(alpha, aus)` ist `auswerten` mit den gemischten Werten. Zwiebelhaut, Bahnen, Posenkarten, Filmstreifen der Tafel und Geister des
  Rückblicks rufen `auswerten`; Editor und Spiel gleich. Die Fassade bekommt es in M1.Z.
- **k) Stückzahl beim Abflachen:** je Kurvenstück die Zahl nach Wang aus dem größten Kontrollpolygon dieses Stücks über alle Schlüssel,
  mal 1,25 für Knochen und Zusätze, bei Toleranz 0,25 Bildpunkte und einer Zoomstufe; Zoomstufen sind Potenzen von 1,25; höchstens 64 je
  Stück. Der Bauplan rechnet sie bei einer Strukturänderung und beim Wechsel der Zoomstufe neu, nie je Bild. Im Spiel gilt die Stufe des
  größten Kameramaßstabs der Szene, im Editor die aktuelle.
- **l) Teile tauschen** sind zwei Wechsel an derselben Stelle mit derselben Breite (eines „unsichtbar“, eines „sichtbar“); `teilTauschen`
  legt beide in einem Schritt an. Kein neuer Typ.

**Stellen:** K §2.1, §5.1, §5.2, §7, §8, §9.2, §11.7; P §3.2 (Figur, Teil, Regler, Pose, Taktleiste, Ding), §4.2, §4.3, §4.4, §4.5, §4.6,
§4.7 (`Stelle`), §5.7 (M4.0). **Liste:** nein.

### 17 · Gewichte je Anker und Griff an Biegeachsen

**Urteil:** stimmt. K §4 sagt „Biegeachsen brauchen keine“ Gewichte; `AchsenPlan.ankerLage` ist abgeleitet (P §4.3); Gewichte gibt es
nur für Bohne und Hals und erst in M9.2 (P §5.12). Bei Ozzy sind Beine und Schwanz Biegeachsen; dort fehlte, was Florian verlangt.

**Entscheidung:**
1. Biegeachsen nehmen Gewichte in derselben Struktur wie gewichtete Teile: `Aufhaengung` mit `art: 'achse'`, `knochen: [Achse, Eltern]`,
   `gewichte` je Anker (Anteil w der Achse, der Rest beim Elternknochen; fehlt: alle w = 1), `griffe` wie bei Gewichten (erben; ein Satz
   je Griffpaar an glatten Ankern, je Griff an Ecken), `mischung` wie bei Gewichten. Die Achse wirkt am Anker als örtlicher Rahmen bei u
   (Lage auf der Achse plus Versatz quer, gedreht mit der Tangente), der Elternknochen starr.
2. Die Lage u bleibt abgeleitet (Projektion auf die Ruheachse); eine gespeicherte Lage gibt es nicht (eine Regel weniger; ändert sich die
   Ruhe, folgt u).
3. Bedienung wie bei Gewichten: Linse Knochen, Achse antippen → Füllringe an ihren Ankern; senkrecht ziehen ändert w; das Schloss gibt dem
   Griffpaar einen eigenen Satz; W malt.
4. Etappen: Rechnung (linear) in M4.2, Füllringe und senkrechtes Ziehen in M4.6, Drehzentren und Pinsel W in M9.2 für beide Arten. K §4:
   „Biegeachsen: alle Anker folgen der Achse ganz; der Autorig schlägt nur nahe der Wurzel eine weiche Stufe vor (so breit wie das Glied
   dick).“

**Stellen:** K §0 (Tabelle), §3.1, §4; P §3.2 (`Aufhaengung`), §4.3 (`AchsenPlan`), §5.7 (M4.2, M4.6), §5.12 (M9.2). **Liste:** nein.

### 18 · Schwanz und Bohne

**Urteil:** stimmt. P §6.2 Schritt 9 macht Bohne, Schwanz und Kopf starr; K §3.1 macht den Schwanz zur Biegeachse mit Federkette; M6.3
prüft „eine Feder am Schwanz löst seine Korrektur aus“. Zusätzlich: K §3.1 nennt „Rumpf“ als Biegeachse und „Bohne“ mit Gewichten, und
Ozzy hat kein Teil „Hals“ (`TeilName`, vorlagen/import.ts:9–13; „Hals“ ist im Prototyp ein Punkt, raster.ts:395, 950).

**Entscheidung:**
1. **Schwanz:** Biegeachse ab M4 (Übernahme M4.4). Aus dem starren Knochen des Prototyps wird eine Achse mit Biegung 0, die Parität an
   den Haltungen bleibt; die Korrekturen je Haltung werden Posenkorrekturen; das Schwanzweiß bleibt angeheftet. Der Chip „Kette“ rechnet
   innen sechs Glieder und schreibt in die drei Regler der Achse (Richtung der Sehne, Biegung an Wurzel und Ende; kleinste Quadrate). So
   bleibt der Schwanz eine glatte Kurve, und eine Korrektur am Sehnenwinkel wird ausgelöst (A6).
2. **Bohne:** vorläufig starr (A5). In M9.2 das Video `m9-bohne.mp4`: Bohne starr, mit Gewichten linear und mit Drehzentren, je im Purzeln
   und in der Rückenlage (B14). Gewichte bekommt sie nur auf sein Wort.
3. „Hals“ fällt als gewichtetes Teil weg; das M9-Video heißt „Bohne“. „Rumpf“ als Biegeachse gilt für andere Figuren (Katze).

**Stellen:** K §3.1 (Tabelle, Proben), §6.4; P §5.9 (M6.3), §5.12 (M9-Probe 3), §6.2 Schritt 9, §6.4, §10. **Liste:** ja (A5, A6, B14).

### 19 · Vergleichsbild „Rahmen + Rest“ kommt zu spät

**Urteil:** stimmt. Gesamtbericht 4.7 stellt S3 (2 bis 4 Tage) vor das Gerüst S4; der Plan zeigt das Bild erst in M3.4 und behauptet im
Kopf, 4.7 zu folgen.

**Entscheidung:** `form/{rahmenRest,linear}.ts` kommen in M1 Welle A (M1.3). M1.9 baut die Proben `m1-rahmen-rest.mjs` und
`m1-front-periodisch.mjs`; M1.Z legt ab: `m1-rahmen-rest.png` (Ohr dreht 120° zwischen zwei Schlüsseln: gerade, je Koordinate, Rahmen +
Rest; Stirnfranse 52° bis 82°: heute gegen Rahmen + Rest; gleiche Ansicht) und `m1-front-periodisch.mp4` (langsame Drehung über die Front
mit und ohne periodische Mischung). Kopierter Prototyp-Code ist nicht nötig: beide Mischarten sind dann Studio-Code, gezeichnet mit
`studio-bild`. Vorläufig bleibt seine Kopfdrehung „je Koordinate“ und nicht periodisch (A2, A3); der Bau wartet nicht.

**Stellen:** P Kopf (Satz zu 4.7), §5.2, §5.4, §5.6 (M3.4, Probe 4). **Liste:** ja (A2, A3, B2).

### 20 · Modul-private Werte des Prototyps

**Urteil:** stimmt. `NAMEN` (werkzeug.ts:34), `ELTER` (haltung.ts:124), `NASE_SPIEGEL` (raster.ts:298), `kopfGespiegelt` (raster.ts:310),
`SCHWANZ_WEISS` (raster.ts:216), `WICKEL` (raster.ts:279), `GESICHT_WEG` (raster.ts:260), dazu `NASE_WEG` (raster.ts:286) und
`FALTEN_COS` (raster.ts:95) sind nicht exportiert. `Reflect.get` erreicht nur Felder und Methoden der Klasse (`kopf`, `kopfVorn`,
`kopfVersatz`, `spitzen`, `versatzBei` …), keine Konstanten eines Moduls.

**Entscheidung:** `tools/studio-uebernahme/src/prototyp-werte.ts` führt Kopien der modul-privaten Werte, die die Übernahme braucht
(Teilnamen sind dort erlaubt), je mit Datei:Zeile im Kommentar. Der Test `prototyp-werte.test.ts` prüft die Kopie am Verhalten des
Prototyps, nicht am Text: gespiegelte Formen (`kopfGespiegelt`, `NASE_SPIEGEL`) gegen `teile()` bei 210°, 250° und 300° (Kurvenpunkte auf
1e-9); Größe des Schwanzweiß gegen `teile()` bei ψ 0°, 22°, 30°, 42°, 60°, 90°; Malreihenfolge bei 139,5° und 140,5° (`NASE_WEG`);
angeheftete Teile in Sitzen und Liegen (`ELTER`). `NAMEN` sind Anzeigenamen (kein Test). Der Test läuft in M1 (Kopf), M4 (Körper) und vor
jedem Lauf der Übernahme; scheitert er, schreibt sie nichts. Der Prototyp wird nicht geändert.

**Stellen:** P §2.6, §6.2 Schritte 2, 3, 4, 8, 9. **Liste:** nein.

### 21 · Schutzregel: Migrationen und frei setzbare Quelle

**Urteil:** stimmt. Grundgesetz 5 (K §0) verbietet jeder Migration, seine Schlüssel zu ändern; der Server glaubt `X-Studio-Quelle`
(P §4.9); `--host` öffnet ihn fürs Netz (P §2.4).

**Entscheidung:**
1. **Grundgesetz 5 neu:** „Keine Automatik, keine Sitzung und keine Migration ändert die Gestalt seiner Schlüssel oder löscht sie.
   Migrationen dürfen nur ihre Schreibweise ändern; das wird geprüft.“ Prüfung je Migration: Für jeden Datensatz mit Herkunft „dein“
   liegen alle Kurvenpunkte (Befund 11) vorher und nachher höchstens 1e-6 auseinander, denn Migrationen runden nicht und glätten nicht
   (Befund 11; die frühere Schwelle 0,0002 passte nicht zu einer Rundung auf 1/1000); sonst öffnet Studio die Datei nur zum Lesen und
   meldet es. Vor jeder Migration kommt die alte Datei in die Sicherung.
2. **Quelle „florian“ nur auf seinem Server:** Nur der Server mit `STUDIO_FLORIAN=1` (gesetzt allein im Skript `pnpm studio`, Port 5217)
   vergibt sie. Die Editor-Seite holt beim Start und nach jedem Wiederverbinden der Ereignisse einen Sitzungsschlüssel
   (`GET /__studio/sitzung`, zufällig je Serverstart) und schickt ihn mit jedem Schreiben; ein ungültiger Schlüssel (etwa nach einem
   Neustart des Servers) ergibt 401 („neu verbinden“), nie still die Quelle „sitzung“. Unter Automation (`navigator.webdriver`,
   Playwright) fragt die Seite nie danach; das ist eine Regel der Seite, der Server kennt `navigator.webdriver` nicht. Datensätze „dein“
   legt nur die Quelle florian an (einzige Ausnahme: die Dateikopie eines Probe-Projekts, Befund 26). Bau-Server, Probe-Server und
   Spiel-Server vergeben „florian“ nie. Skripte schreiben nicht über HTTP, sondern über die Ablage mit Quelle „automatik“; dort gibt es
   „florian“ nicht.
3. Ehrlich: Das schützt gegen Versehen, nicht gegen Absicht. Gegen alles andere hilft der Sicherungsring.

**Stellen:** K §0 (Grundgesetz 5), §10.2; P §2.4, §3.4, §3.6 Nr. 9, §4.1 (`Quelle`), §4.9. **Liste:** nein.

### 22 · Autorig und Effekte: Zeitpunkt nicht als Entscheidung vorgelegt

**Urteil:** stimmt. K §14 hat keine Zeile für „Autorig erst mit der Katze“ und „Effekte für Momente erst in der Abendrunde“.

**Entscheidung:** Beide werden vorläufige Entscheidungen mit „So änderst du es“ (A8, A9). Der Bau bleibt: Autorig in M9 mit der Katze (zwei
Figuren und zwei fremde SVGs sind der Beweis), Effekte für Momente in M10. Neu: M6.1 legt `m6-effekte.png` ab: die dort gebauten Effekte
(Staub, Bodenschatten, Dithering, Linien, Beinschattierung) an einer Testfigur, vorher und nachher, gleiche Ansicht (B10). Ozzys Rig bleibt
der aus dem Prototyp; der Autorig ersetzt ihn nur nach Vergleichsvideo und seinem Wort.

**Stellen:** K §4, §7, §12, §14; P §5.2, §5.9 (M6.1), §5.12, §5.13 (M10.4). **Liste:** ja (A8, A9, B10).

### 23 · Aufwand gegen Wochenlimit; früher spielbarer Stand

**Urteil:** stimmt. 152 bis 233 Arbeitstage stehen ohne Bezug zum Wochenlimit (P §5.2); den ersten Ozzy auf dem Hügel spielt Florian erst
in M5 und M6.

**Entscheidung:** F7 gilt. Die Integration schreibt je Welle eine Zeile nach `docs/progress/studio/aufwand.json`; nach M3 schätzt sie den
Rest neu und meldet das Ergebnis. Der erste spielbare Stand kommt in M2: P1 mit „Tapsen“ auf dem iPhone (Befund 10, B5). K §14 Frage 1
entfällt (F2). Für Florian steht in der Liste, dass viele Agenten sein Limit schneller verbrauchen und wie er bremst (A26).

**Stellen:** K §0, §12, §14; P §5.2, §9.1. **Liste:** ja (A26, B5).

### 24 · Bedienung nicht einheitlich

**Urteil:** stimmt. K §9.5 gibt Doppeltippen weitere Bedeutungen (Anker setzen, runden, Gewichte malen); K §5.1 sagt „Halten verdoppelt“
und „Antippen zeigt den Übergang“, K §9.5 „wird die Stelle“; die Leertaste spielt, in seinem Werkzeug verschiebt Leertaste + Ziehen die
Ansicht (werkzeug.ts:709–712, 787; Übergabe ozzy-figur).

**Entscheidung – vier Verben ohne Ausnahme:**
- **Tippen** wählt und geht hin; es spielt nie und ändert nie. Posenkarte: wird die Stelle, die Figur fließt über den Übergang hinüber
  (Ausgleich oder gestaltet), so sieht man ihn. Brücke und Zelle: der Übergang wird die Stelle, die Leiste zeigt ihn. Marke: springt hin.
- **Ziehen** ändert an der Stelle.
- **Halten** zeigt mehr (Menü; am Mac auch Rechtsklick): Verdoppeln, Runden, Anker setzen, Teil tauschen stehen dort.
- **Doppeltippen** geht hinein: Figur → Teil → Anker; Gelenkring → seine Gewichte (Füllringe); Leiste, Posenkarte, Zelle → groß; Chip →
  „Mehr“; Regel → öffnen. Am Kurvenstück und am Griff tut es nichts.
- Anker setzen: P (Mac, iPad mit Tastatur, Knopf P am linken Rand) oder Halten → „Anker setzen“. Runden: ⇧C oder Halten → „rund“. Gewichte
  malen: W.
- Abspielen: Leertaste kurz (unter 250 ms, ohne Bewegung) oder ▶. Leertaste halten und ziehen verschiebt die Ansicht wie in Illustrator
  und seinem Werkzeug (A15). Schweben (Mac, Stift) spielt den Filmstreifen einer Zelle der Tafel ab.

**Stellen:** K §5.1, §5.3, §9.1, §9.5 (Zeilen Griff, Kurvenstück, Gelenkring, Posenkarte, Brücke, Marke), §9.6 (c, d); P §4.8, §5.7
(M4.6 Tests). **Liste:** ja (A15).

### 25 · Grundweg der Technik nicht verglichen

**Urteil:** stimmt. K §10 vergleicht nur Unterfragen; der Bezug zu `apps/game` und zum offenen Stack-Gate fehlt.

**Entscheidung:** K §10 bekommt diese Tabelle (neuer Abschnitt 10.5). **Urteil: Web bleibt** (A23).

| Grundweg | gewinnt | verliert | Urteil |
|---|---|---|---|
| **Web:** TypeScript, WebGL2, Vite; iPad als Safari-Web-App, Spiel als Capacitor-App | eine Laufzeit auf Mac, iPad, iPhone; Prototyp und Erfahrung da; neuer Stand in Sekunden auf allen Geräten; Proben mit Playwright; Florian öffnet eine Adresse | Canvas in Safari nahe 60 Hz statt 120 Hz; Stift nur über Pointer Events (Druck ja, keine Pencil-Gesten); WebGL2 statt Metal (Tempo messen); Speicher unter iOS knapp | **gewählt** |
| **nativ:** Swift, Metal, PencilKit, eigene Apps | 120 Hz, alle Stiftgesten, Metal-Tempo, offline | alles neu oder zwei Laufzeiten; jeder Stand über Xcode; Proben schwerer; kein Prototyp-Code | nein; eine Hülle fürs iPad später, wenn er ohne Mac formen will |
| **Spiel-Engine** (Godot, Unity) | Gerüst, Physik, Export | keine Bézier-Formen mit Morph, kein Verschmelzen über Abstände; sein Look nur mit eigenem Shader und Morph; Godot ruht (Stack-Gate) | nein |
| **fertige Werkzeuge** (Spine, Rive) | reif, viele Laufzeiten | kein Verschmelzen, keine Verjüngungen; „exakt sein Logo“ nicht erreichbar; Logik und Physik fehlen | nein |

**Bezug zum Hauptspiel** (`apps/game`, three.js mit WebGPU): Studio-Figuren kommen zuerst als Bildfolgen und Sprite-Sheets aus derselben
Laufzeit (M11.3). Lebende Studio-Figuren im Hauptspiel (Laufzeit rechnet mit, Zeichner als three.js-Material nachgebaut oder eine zweite
Zeichenfläche) erst, wenn das Hauptspiel sie braucht (A24). Studio nutzt Capacitor wie der Arbeits-Track des Stack-Gates (ADR-0001);
entscheiden tut es das Gate nicht.

**Stellen:** K §10, §13 (eigene Mac-App); P §1 (später). **Liste:** ja (A23, A24).

### 26 · Proben, die so nicht gehen

**Urteil:** stimmt. Die M4-Probe setzt eine Pfote auf einen Stein (P §5.7), Steine gibt es ab M5; die Bedienprobe in M7 verlangt, was
M7.5 vorher per Skript anlegt (P §5.10).

**Entscheidung:** M4: „eine Vorderpfote mit dem Ring nach vorn setzen; das Bein wird nicht länger“. Menschliche Proben laufen in
**Probe-Projekten** in seinem Studio (`content/studio/<probe>/`, geöffnet mit `?projekt=<probe>`), angelegt vom Bau als Dateikopie über
die Ablage (`probeprojektAnlegen`, ohne Store-Schritt): Seine Schlüssel bleiben dort „dein“; das ist die einzige Ausnahme von der Regel,
dass nur die Quelle florian Datensätze „dein“ anlegt, und gilt nur für ein neues Probe-Projekt, nie für `content/studio/ozzy/`. Sein
Projekt bleibt bytegleich; eine spätere Erweiterung des Probe-Projekts legt nur Neues dazu. `werkbank-probe` (M3, M4): Kopie von Ozzy,
Kopf dort formbar. `bedienprobe` (M7): Kopie ohne Pose
„Nasen-Pflug“, ohne den Übergang aus „Schnüffeln“ und ohne die zweite Duftstelle. So steht es im Plan.

**Stellen:** K §9.7; P §5.7 (Probe 4), §5.10 (Probe 2, M7.5). **Liste:** ja (B7, B8, B12).

### 27 · Live-Verbindung und Merker zwischen zwei Herkünften

**Urteil:** stimmt. Das Spiel läuft auf eigener Herkunft (P §2.4), SSE und PUT an 5217 sind nur von der eigenen Seite erlaubt (P §4.9); in
der App ist die Herkunft `capacitor://localhost`, und iOS sperrt unverschlüsseltes HTTP ohne Ausnahme.

**Entscheidung:**
1. Die Server-Erweiterung aus `@ee/studio-ablage` hängt auch im Vorschau- und Entwicklungsserver des Spiels (5261, 5265), dort nur mit
   Lesen, Live und Merkern; zusammengesetzt in `apps/studio/server/plugins.ts` (`spielPlugins`), samt dem Haken `quellenEinsetzen` wie
   im Editor. Das Spiel lädt beim Start über seinen Server: Auf 5261 liest es Florians `content/studio`, also seinen aktuellen Stand samt
   seiner neuesten Kopfschlüssel (ein beim Bauen eingesetzter Inhalt wäre nach jedem Neuladen der Stand vom letzten Etappenende), und
   schreibt Merker als neue Dateien nach `laeufe/`; als sein Spiel-Server ist er dort der einzige weitere Schreiber. Den Code liefert der
   feste Stand; nur die App bekommt einen eingebauten Inhalt. Ereignisse und Merker kommen von derselben Herkunft; die Origin-Regel bleibt
   streng.
2. Live: Der Editor schickt Diffs an seinen Server; der reicht sie an den Spiel-Port seines Paars weiter (`SPIEL_PORT`: 5217 → 5261,
   5263 → 5265, 5291 → 5292, Probe-Ports ihr Paar; an 5261 nur mit `STUDIO_FLORIAN=1`), dort nur von localhost angenommen; das Spiel hört
   per SSE an seinem Server. Bau- und Probe-Server schicken so nie etwas in Florians Spiel.
3. App (M11.2): Live und Merker gehen an `http://<Mac>.local:5261`; der Spiel-Server erlaubt per CORS genau `capacitor://localhost`; die
   App trägt `NSAllowsLocalNetworking` in `Info.plist`. Am iPhone zu prüfen (B16).

**Stellen:** P §2.4, §4.9, §5.9 (M6.2), §5.14 (M11.2). **Liste:** ja (B16).

### 28 · „Unendlich erweiterbar“ ungeprüft

**Urteil:** stimmt. K §11.1 beweist es mit Park und Winter außerhalb von Fassung 1; keine Probe prüft „neue Art = eigene Datei und eine
Zeile im Register“.

**Entscheidung:** (1) Test `erweiterung.test.ts` je Familie, sobald sie existiert (Zusatzbewegungen M4, Chips M5, Effekte M6, Bausteine
M7): Er trägt zur Laufzeit eine Test-Art ein (Schema, Version, Anschlüsse) und prüft ohne weiteren Code Format-Rundweg, Bauplan,
Bedienung (Lücken der Regeln, Eigenschaften), Prüfer und „Warum?“. (2) M10 baut seine neuen Arten (Chips `wasser`, `teilchen`; Effekte
`wasser`, `spritzer`, `regen`, `kameraNass`, `himmel`) streng als Erweiterung; M10.Z prüft am Diff, dass nur ihre Dateien, ihre Schemas
und je eine Registerzeile geändert sind. (3) Probe in M11: ein neues Ding samt Regel nur im Editor (B16).

**Stellen:** K §9.3, §11.1, §13; P §1, §4.5 (letzter Absatz), §5.13. **Liste:** ja (B16).

### 29 · Begriffe

**Urteil:** stimmt. „Übergangsform“ steht in K §2.1 und §15, laut K §5.2 und §16 gibt es sie nicht; `tropfen` heißt in P §4.6 und §2.2
der Kreis des Renderers, in K §9.2 die Marke der Stelle; „Grundform“ ist `Teil.grundform` und `Pose.grundform` (P §3.2); E0–E8 (K §12)
gegen M0–M11 (P §5.2); Fachwörter in Fragen (P §10).

**Entscheidung:** „Übergangsform“ fällt aus K §2.1 und §15. „Tropfen“ heißt nur die Marke der Stelle: In `BildDaten` heißen die
analytischen Kreise `kreise`/`kreisZahl`, Datei `studio-bild/src/kreise.ts`; Teilchen heißen „Spritzer“ und „Staub“; der Effekt
`kameratropfen` heißt `kameraNass` („Kamera nass“). „Grundform“ ist nur die erste Posenkarte; `Teil.grundform` heißt `Teil.form` (Form
ohne Ansicht). Eine Zählung für alle: M0 bis M11 (K §12 übernimmt sie). Fragen an Florian stehen nur in der Liste, in seinen Wörtern.

**Stellen:** K §2.1, §9.2, §12, §15; P §2.2, §3.2, §4.6, §5.13, §10. **Liste:** nein.

### 30 · Kleine Fallen und offene Kriterien

**Urteil:** stimmt in allen Punkten. `crypto.getRandomValues` (P §3.3) ist bei `lib: ["ES2022"]`, `types: []` (P §2.1) nicht getypt;
P §2.3 Nr. 2 verbietet `performance` in `studio-autorig`, `AutorigErgebnis.ms` braucht es (P §4.10); `schluessel.json` trägt
`"version":1` (geprüft), P §3.4 nennt sie Version 0; „Gelee nie an einem Teil mit Rolle kopf“ (P §5.8) nennt ein Körperteil; Zag
(Gesamtbericht 4.3 Nr. 11) und echtes Safari über WebDriverIO (Nr. 12) fehlen ohne Grund; M9-Probe 1 und die Abendrunde (P §5.12,
§5.13) haben kein Kriterium.

**Entscheidung:**
- **a) Kennungen:** `studio-format` kennt keinen globalen Zufall. `kennungAusZahlen(v, zahlen: Uint32Array)` (Basis 62, Verwerfen gegen
  Modulo-Schieflage) und `kennungAusPfad(v, pfad)` (SHA-256 aus `studio-rechnen`, eigene Umsetzung). Der Store bekommt Zufall und Prüfung
  übergeben (`new Store(dok, { zufall, pruefen })`): Editor und Server `crypto.getRandomValues`, Tests ein Strom mit Saat.
- **b) Autorig:** `AutorigErgebnis.ms` entfällt; die Zeit misst `apps/studio/src/autorig/autorig.worker.ts` außerhalb des Pakets.
- **c) Erkennung** (P §3.4): Eine Datei ohne Feld `format` mit einer Liste `kopf` ist die Schlüsseldatei des Prototyps; Studio nennt ihr
  Format „kern 0“, obwohl sie `"version": 1` trägt.
- **d) Datenfeld statt Rolle:** `Teil.wieGezeichnet?: true`, gesetzt von der Übernahme an allen Teilen Ozzys. Effekt- und Chiparten tragen im
  Register `aufGezeichnet: 'zeichnung' | 'bewegung' | 'nurFlorian'` (Standard `nurFlorian`): „zeichnung“ wirkt immer (Dickenregel,
  Kantenglättung, Verdecken, Weiß-Nachgeben; Chips Schwingen, Kette, Stauchen, Ruhig halten), „bewegung“ wirkt nur in Bewegung und ist in
  Ruhe null (Beinschattierung), „nurFlorian“ wirkt an solchen Teilen nur, wenn der Datensatz Herkunft „dein“ hat (Gelee, Schmierbild,
  Aufprallbild, Zittern, Bewegungslinien, Verformung nach Tempo, Schein, Auflösen, Kontakt- und Bodenschatten). `wieGezeichnet` entfernt nur
  die Quelle florian (Schutzregel wie für gepinnte Werte). Keine Regel nennt ein Teil.
- **e) Zag und Safari:** Zag (`@zag-js/react`) für Menüs, Befehlssuche, Blatt und Dialoge in M3.6: zugänglich, ohne eigenes Aussehen, klein;
  der Gesamtbericht empfiehlt es. Version: die neueste, die älter als zwei Wochen ist; M3.0 legt sie fest. Echtes Safari: WebDriverIO mit
  safaridriver für Messseite und Determinismus am Mac, sobald Florian es einmal eingeschaltet hat (B6); bis dahin WebKit von Playwright als
  Vorprüfung. `webdriverio` installiert M0.
- **f) Kriterien:** M9-Probe 1: alle Einträge von `ELTER` und `PARTNER` getroffen, alle Kopfteile starr am Kopfknochen. M9-Probe 2: Das
  Skript braucht für die Katze höchstens drei Ringzüge (gezählt); Florian prüft es selbst (B14). M10: Nicole erreicht das Körbchen ohne
  Erklärung in höchstens drei Versuchen (B15).

**Stellen:** K §6.4 (Gelee), §7; P §2.3 Nr. 2, §3.3, §3.4, §4.10, §5.8 (M5.4), §5.12, §5.13, §7.1. **Liste:** ja (B6, B14, B15).

---

## 3 Sammlung der Vertragsänderungen (für M0)

Alles, was die Entscheidungen an Typen, Feldern und Schnittstellen ändern, an einer Stelle. Die Vertragsschritte übernehmen es.

**`studio-rechnen`:** PCHIP bitgleich zum Prototyp, `pchipPrototyp` entfällt (1); `sha256` als eigene Umsetzung (30 a); Zahlen
ungerundet geschrieben (`zahlText` statt `rundenMass` und `rundenFein`, 11); der Port der fdlibm entsteht in M1.1 in eigenen Dateien,
`winkel.ts` und `exp.ts` stellt die Integration nach der Welle um.

**`studio-format`:**
- **Jeder Datensatztyp bekommt `herkunft: Herkunft`**, auch `Projekt`, `Vorlage`, `Klang`, `Gruppe`, `Schicht`, `Zyklus`, `Welt`,
  `Szene` und `Aufgabe`. Herkunfts- und Schutzregel und das datensatzweise Zusammenführen (F5) gelten damit für alle Typen; sonst
  überschriebe ein Inhalt-Skript still, was Florian an Radius, Zyklus, Aufgabe oder Maske einer Schicht ändert. `Projekt` wird feldweise
  zusammengeführt (Übernahme: `quellen`, `umgezogen`; Editor: `fassungen`; Mengen: `figuren`, `szenen`, `uebergangen`). `Herkunft` ohne
  `'automatik'` (das ist eine Quelle); nur die Quelle florian legt Datensätze „dein“ an (Ausnahme: Dateikopie eines Probe-Projekts).
- `typen/projekt.ts`: `Projekt` + `quellen?: { art: 'prototyp-schluessel'; datei: string; figur: Id<'fig'>; zuordnung: [teilName: string,
  bindung: Id<'bd'>][] }[]` (5), + `umgezogen?: string[]` (5), + `fassungen?: { id: string; geraet: string; zeit: string; sicherung:
  string }[]` (höchstens 50, je eine eigene Datei außerhalb des Rings; F5), + `uebergangen?: string[]` (Prüfer).
- `typen/figur.ts`: `Figur.charakter` entfällt (16 i); `Teil.grundform` → `Teil.form` (29); + `Teil.wieGezeichnet?: true` (30 d).
- `typen/form.ts`: `VersatzZeile`: Längenversätze durch L geteilt, Formel als Kommentar (16 a); + `Regler.nachlauf?: number` (16 b); neue
  Rollen `charakter.*`, `spannung`, `spannung.<rolle>` (16 h, i); + `Spiegelregel.regler?: { regler: Id<'rg'>; um: number }[]` (8);
  `Bindung.spitzen` als Liste, `Spitzenfuehrung.gespiegelt` (13); wo Abschnitte liegen, wirkt die Spiegelregel nur auf Malreihenfolge,
  Wechsel und mitgespiegelte Regler (F1); Regel für glatte und Ecken-Zeilen beim Mischen (glatt im Bauplan nur, wenn in allen Schlüsseln
  glatt).
- `typen/knochen.ts`: `Aufhaengung` mit `art: 'achse'` nimmt `knochen: [Achse, Eltern]`, `gewichte`, `griffe` (17); + `Biegeachse.rMin`
  (Mindestradius wie `rueckgratBauen`).
- `typen/physik.ts`: + Datensatz `Koerpermodell` (Vorsilbe `km`) der Figur mit `koerper`, `federbeine` (mit Vorspannung), `glieder` (6).
- `typen/posen.ts`: `Pose.spannung` und `Taktleiste.spannung` entfallen; `spuren` in jedem gestalteten Übergang (16 h).
- `typen/welt.ts`: `Ding.figur` Pflicht (16 d).
- `typen/logik.ts`: `Draht.spiegel` auch für Linienregler (1); `RegelLaune.haeufigkeit.launenRegler` statt `charakter` („Charakter“
  heißen nur die drei Regler der Figur, 16 i).
- `typen/dokument.ts`: `Diff` liegt im Format, nicht im Store (der Store gibt ihn weiter), weil `Laufzeit.bauen` und die Live-Diffs des
  Spiels ihn brauchen und beide den Store nicht importieren dürfen.
- `arten/register.ts`: `ArtSchema` + `aufGezeichnet?: 'zeichnung' | 'bewegung' | 'nurFlorian'` (30 d).
- `arten/effekte.ts`: in M0 die Schemas der fünf Effekte von M1 (`verschmelzen`, `dicke`, `kanten`, `verdecken`, `weissNachgeben`, je mit
  `aufGezeichnet`), weil die Übernahme Effekte schreibt und `laden` unbekannte Arten nur zum Lesen öffnet; in M6.0 `kontaktschatten`,
  `bodenschatten`, `beinschattierung`, `dithering`, `linien`, `staub`; M10.0 nur noch seine.
- `arten/bausteine.ts`: `vierbeiner` mit dem Kanal `wendenNach` (s, Standard 0,3) und dem Schalter `springenAufTippen` (A17); sein
  Körpermodell nimmt er von der Figur (6); `zaehler` mit Messwerten `einer`, `zehner` (7); neue Arten `rueckblick`, `aufgaben` (7).
- `kennung.ts`: `kennungAusZahlen`, `kennungAusPfad`; `neueKennung` entfällt (30 a). `anker.ts`: Glätte-Regel mit 0,0002, abschaltbar;
  Übernahme und Migrationen glätten nicht (11).
- neu `quellen.ts`: `quellenEinsetzen(dateien, projekt)` über die Migration kern 0 → 1 (5); Erkennung des Prototyp-Formats (30 c).
- `spielfassung.ts` entfällt (2).

**`studio-store`:** `new Store(dok, { zufall, pruefen, verlaufGrenze?, journal? })` (30 a); Herkunftsregel (3); Bindungen aus `quellen`
nur zum Ansehen (5); `wieGezeichnet` und Datensätze „nurFlorian“ an solchen Teilen nur Quelle florian (30 d); `fremdUebernehmen`: der
spätere gewinnt, Rückgabe der verdrängten Fassungen (F5).

**`studio-ablage` (neu):** Ablage, Revision, Sicherungsring (nach Zeit ausgedünnt), Fassungen als eigene Dateien, Beobachter, Sitzung
mit `STUDIO_FLORIAN` (401 bei ungültigem Schlüssel), Protokoll der Quelle je Schreiben, Live-Weitergabe an `SPIEL_PORT`, Merker,
Vite-Plugin; ohne `STUDIO_INHALT` eine frische Kopie; Haken für den Zusammenbau (F5, 21, 27).

**`studio-laufzeit`:** `fassade.ts`: + `auswerten(werte, lagen, aus)` (16 j); `hand()` mit Durchlauf ohne Zeit (1; `regler/durchlauf`
und `regler/mischen` dafür schon in M1.7); `bauen(dok, diff?, o?: { zoomstufe })` (16 k). `vertrag/editor.ts`:
`Stelle` + `ausprobieren` (16 g); `Zug` + `{ art: 'stueck'; teil: Id<'teil'>; stueck: number; t: number; nach: Punkt }` (A biegt ein
Kurvenstück, 14). `vertrag/bilddaten.ts`: `tropfen` → `kreise`, `tropfenZahl` → `kreisZahl` (29). `vertrag/baustein.ts`: `kanaele` sind
Reglernamen, Posen-Kanäle je Schicht (16 e). `editor/handgriffe/`: Liste aus 14, neu `projekt.ts` und `text.ts`.

**`studio-bild`:** `tropfen.ts` → `kreise.ts`, Effekt `kameratropfen` → `kameraNass` (29).

**`studio-autorig`:** `AutorigErgebnis.ms` entfällt (30 b).

**Regeln ohne eigenen Typ:** Toleranzen (11), Spitzenregel (13), Rückrechnung (13), Feldregel (16 f), Vorrang (16 c), Stückzahl (16 k),
Kopplung der Körper (6), Kehrtwende (8), Kanal-Grundwert (16 e), vier Verben (24).

---

## 4 Neue Reihenfolge

Die Etappen behalten ihre Nummern. „braucht“ nennt, was aus früheren Etappen da sein muss; jede Zeile ist gegen die Etappen davor
geprüft. Innerhalb einer Etappe laufen die Pakete einer Welle parallel und hängen nicht voneinander ab; nach jeder Welle verdrahtet die
Integration die Zusammenbau-Dateien. Tage grob, eigene Schätzung; Summe weiter rund 155 bis 240 Arbeitstage, in Kalenderzeit kürzer durch
parallele Wellen, nicht im Verbrauch (F7). Neuschätzung nach M3.

| Etappe | Ziel | braucht | Änderung gegenüber dem bisherigen Plan |
|---|---|---|---|
| **M0 Verträge** (4–5) | alle Pakete, Apps, Werkzeuge mit Grenzen; Verträge samt Abschnitt 3; gemeinsame Dateien fertig | nichts | + Paket `@ee/studio-ablage`; + fertige gemeinsame Dateien (`anker`, `kennung`, `versionen`, `ordnung`, `regler`, SHA-256); Zusammenbau-Dateien leer; Ports und `launch.json` nach F4; kein Arbeitsbaum `studio`; + `webdriverio` |
| **M1 Kern, Kopf, Vergleichsbild** (12–18) | Kopfdrehung als Daten mit Kopfversatz und Halslage, gleich dem Prototyp, deterministisch gespeichert; Store-Kern und Ablage; Bild „Rahmen + Rest“ | M0 | + Store-Kern und Ablage (aus M3, F5); + starre Knochen mit Verschiebung und Drähte (aus M4 und M7, Befund 1); + Rahmen + Rest und Vergleichsbild (aus M3, Befund 19); Parität an Kurvenpunkten (11); Abbruch nach F1 |
| **M2 Messen, P1, Tapsen** (8–11, neben M1) | Ersatzszenen gemessen; Box2D nach K1 bis K9; erster spielbarer Stand | M0; Welle B: M1 Welle A | Ersatzszenen statt „beschriftet ersetzt“, Modus „Tapsen“ (10, 23); Weg nach Kriterium statt Warten (F1) |
| **M3 Werkbank** (9–13) | formen, speichern, rückgängig, Schutz, zwei Geräte; Kopf bis zum Umzug zum Ansehen; Ort-Probe | M1 | Store-Kern und Rahmen + Rest schon in M1; Server über `@ee/studio-ablage`, Sitzungsschlüssel (21); Beobachter und Umzug (5); Ort-Probe und Werkbank-Probe 1 (10); Probe-Projekte (26); Zag (30 e) |
| **M4 Posen, Übergänge, Knochen** (15–21) | Posen, Ausgleich, Taktleiste, Tafel; Biegeachsen mit Gewichten je Anker; Haltungen und Abläufe als Daten | M1, M3 | Gewichte an Biegeachsen samt Füllringen (17); Schwanz als Biegeachse (18); Vorrang, Nachlauf, Spannung, Felder (16); Pfote ohne Stein, Werkbank-Probe 2 (26); Sprungtests im Zusammenbau (15) |
| **M5 Physik am Mac** (15–22) | Ozzy tapst nach der Kennlinie; Kehrtwende; Ruhe = Zeichnung | M1, M2, M4 | Körpermodell der Figur und Kopplung (6); Kehrtwende (8); M5.3 in Welle B; Handgriffe Welt und Chips vor dem Inhalt (1, 15); `wieGezeichnet` (30 d) |
| **M6 Spielwiese auf dem iPhone** (11–16) | Spiel-App, Live, Renderer Stufe 1, Korrekturformen, Strecke | M1, M3, M4, M5 | Live über den Spiel-Server (27); Schatten nur auf der Welt (9); Effektbild früh (22); kein zweiter Bezugsrahmen (12); gleiche Anker in Editor und Spiel (2) |
| **M7 Morgenrunde** (22–32) | Regeln, Launen, Bausteine der Welt, Ton, Text, Zettel | M1, M4, M5, M6 | Text als Figur (7); Kanäle (16 e); Logik-Handgriffe in Welle A (15); Bedienprobe auf Kopie (26); Erweiterungstest Bausteine (28) |
| **M8 Pannen** (10–15) | Sturz, Aufstehen, Abgang, Rückblick in der Laufzeit, Aufnahme | M2, M5, M7 | Rückblick als Baustein mit `auswerten` (7, 16 j) |
| **M9 Mittagsrunde** (22–35) | Autorig, Drehzentren, W, Katze, Dinge des Mittags, „Warum?“ | M4, M7, M8 | Kriterien Autorig (30 f); Bild Bezugsrahmen (12); Video Bohne statt „Hals und Bohne“ (18) |
| **M10 Abendrunde** (16–26) | Wasser, Himmel, Aufgaben mit Beweisen, Tagebuch, Effekte für Momente | M5, M6, M7 | Tagebuch im Spiel (7); neue Arten als Erweiterung geprüft (28); Kriterium Nicole (30 f); darf mit M9 zusammen laufen |
| **M11 Ton, App, großer Feinschliff** (12–20, dazu der Feinschliff) | Musik, App-Hülle, Export; großer Feinschlifflauf über die ganze Liste; Abnahme | M0–M10 | Feinschlifflauf über die ganze Liste statt fünf Tage (F1); Ding-Probe (14); App-Netz (27) |

**Wellen je Etappe** (Paket – braucht):

- **M0** (eine Sitzung, seriell): M0.1 wie P §5.3, ergänzt um Abschnitt 3 und die Zeile oben – braucht nichts.
- **M1 Welle A** (ein Workflow mit M2 Welle A): M1.1 Rechnen (fdlibm in eigenen Dateien; `winkel` und `exp` stellt die Integration nach
  der Welle um) · M1.2 Format (`pruefen`, Schreiber, Laden, `dateien`, `quellen`,
  Migration kern 0 → 1, SVG-Import; ohne Spielfassung) · M1.3 Form-Laufzeit (`koordinaten`, `rahmenRest`, `linear`, `ruhen`, `ansicht`,
  `spiegel` samt `Spiegelregel.regler`, `spitzen` mit Regel, `wechsel`, `abflachen` mit Zoomstufen) · M1.4 Bild Grundstufe · M1.5
  Store-Kern (`store`, `diff`, `verlauf`, `schutz`, `zusammenfuehren`) · M1.6 Ablage (`@ee/studio-ablage`, `content/studio/.gitignore`) ·
  M1.7 Knochen starr, Drähte, Regler ohne Zeit (+ `regler/{durchlauf,mischen}.ts`, `handgriffe/logik.ts` Teil 1) – je braucht M0.
- **M1 Welle B:** M1.8 Übernahme des Kopfs (über Ablage und Store; Hals- und Kopfknochen, Drähte, `prototyp-werte.ts` mit Test, Parität,
  `quellen` in `projekt.json`) – braucht M1.2, M1.3, M1.5, M1.6, M1.7 · M1.9 Betrachter, Prüfseite, Vergleichsproben (an `testfigur.json`
  getestet) – braucht M1.3, M1.4. **M1.Z:** Fassade mit `auswerten` und Durchlauf ohne Zeit; Übernahme laufen lassen (schreibt
  `content/studio/ozzy/`); Proben auf Ozzy; `m1-kopfdrehung.mp4`, `m1-rahmen-rest.png`, `m1-front-periodisch.mp4`; Prüfsumme in Node,
  Chromium, WebKit; Stand.
- **M2 Welle A:** M2.1 Welt (Box2D-Adapter) · M2.2 Figurphysik-Grundlage – je braucht M0. **Welle B:** M2.3 P1 mit „Tapsen“ – braucht
  M1.2, M1.3, M1.4, M1.7, M2.1, M2.2 · M2.4 Messseite mit Ersatzszenen – braucht M1.2, M1.3, M1.4. **M2.Z:** K1 bis K9 messen, Rückfall nach F1;
  Messseite am Mac (Hinweis).
- **M3.0** Vertrag (+ Zag). **Welle A:** M3.1 Editor-Kern (`rueckrechnen` mit Fixpunkt, `zielregel`, `fang`, `ankerSetzen`, `ankerLoeschen`,
  Wächter, `faltenVorschlag`, `geltung`; `handgriffe/{form,projekt}.ts`) · M3.2 Server und Speichern (Plugin aus `@ee/studio-ablage`,
  Sitzungsschlüssel, Zusammenführen bei 409, Journal, Beobachter auf `schluessel.json` mit Neustart der Übernahme, Probe-Projekte) – je
  braucht M1. **Welle B:** M3.5 Bühne und Werkzeuge – braucht M3.1 · M3.6 Leiste, Eigenschaften, Befehle mit Zag – braucht M3.1, M3.2.
  **M3.Z:** Ort-Probe, Handgriff-Test, Safari-Web-App, Probe-Projekt `werkbank-probe`.
- **M4.0** Vertrag. **Welle A:** M4.1 Regler und Ausgleich (Vorrang, Nachlauf) · M4.2 Knochen (Biegeachse mit Gewichten je Anker, linear;
  Anheftung) · M4.3 Posen und Zusatzformen (Rahmenformel, Feldregel, Spuren, Übergang `jede → jede`) – je braucht M1, M3. **Welle B:** M4.4
  Übernahme der Haltungen und Abläufe (Schwanz als Biegeachse, Körper über ψ 0°, 45°, 90°) – braucht M4.1, M4.2, M4.3, M1.8 · M4.5
  Rückrechnung durch Knochen, `handgriffe/{posen,knochen}.ts` – braucht M4.2, M4.3, M3.1. **Welle C:** M4.6 Oberfläche Posen, Füllringe –
  braucht M4.5, M3.5, M3.6.
  **M4.Z:** Sprungproben, `m4-ablaeufe.mp4`, Probe-Projekt erweitert.
- **M5.0** Vertrag (Vierbeiner-Schema, Kopplung, `aufGezeichnet`). **Welle A:** M5.1 Takt · M5.2 Welt und Physikplan +
  `handgriffe/welt.ts` · M5.4 Chips, `form/fluechtig.ts`, `knochen/glaetteSchutz.ts` + `handgriffe/physik.ts` – je braucht M2, M4.
  **Welle B:** M5.3 Vierbeiner und Rad (Kopplung, Kehrtwende) – braucht M5.1, M5.2 · M5.5 Prüfstand – braucht M5.1, M5.2, M5.4, M1.7 ·
  M5.6 Hügel, Spielwiese, Ozzys Körpermodell (Inhalt) – braucht M5.2, M5.4, M4.5, M3.1, M1.7. **M5.Z:** Ruhetest, Prüfsumme in drei
  Umgebungen, `m5-spielwiese.mp4`.
- **M6.0** Vertrag. **Welle A:** M6.1 Bild Stufe 1 + `m6-effekte.png` · M6.2 Spiel-App und Live · M6.3 Korrekturformen und Anfasser – je
  braucht M5. **Welle B:** M6.4 Strecke und Dinge – braucht Welle A. **M6.Z:** Stände, Messseite Block 3 und 4 (Hinweis), Probe
  vorbereiten.
- **M7.0** Vertrag (+ opentype.js). **Welle A:** M7.1 Logik + Rest von `handgriffe/logik.ts` · M7.2 Bausteine der Welt + `aufgaben` · M7.3 Ton
  · M7.6 Text als Figur – je braucht M6. **Welle B:** M7.4 Linse Spiel – braucht M7.1, M7.2 · M7.5 Inhalt der Morgenrunde (Rahmen, Kamera,
  Musik als Figuren ohne Teile; Zettel) – braucht M7.1, M7.2, M7.3, M7.6. **M7.Z:** Probe-Projekt `bedienprobe`.
- **M8.0** Vertrag (Mitschnitt gezeigter Werte, Ragdoll). **Welle A:** M8.1 Sturz und Aufstehen · M8.2 Regie, Kamera, Abgang · M8.3
  Rückblick als Baustein · M8.4 Aufnahme – je braucht M7. **Welle B:** M8.5 Inhalt der Pannen – braucht M8.1 bis M8.4.
- **M9.0** Vertrag. **Welle A:** M9.1 Autorig · M9.2 Gewichte (Drehzentren, W, Glätte-Schutz; Bild und Video) · M9.3 Dinge des Mittags ·
  M9.4 „Warum?“ und Prüfer – je braucht M8. **Welle B:** M9.5 Katze und Mittag – braucht M9.1, M9.2, M9.3.
- **M10.0** Vertrag. **Welle A:** M10.1 Wasser und Teilchen · M10.2 Himmel und Tageszeit · M10.3 Aufgaben, Beweise, Tagebuch · M10.4 Effekte
  für Momente – je braucht M7 (nicht M9). **Welle B:** M10.5 Abend und alle Aufgaben – braucht M10.1 bis M10.4 und M9.5 (die Aufgaben
  des Mittags). **M10.Z:** Erweiterungsprüfung am Diff.
- **M11.0** Vertrag (Capacitor wie `apps/game`). **Welle A:** M11.1 Musik · M11.2 App-Hülle mit Netzregeln · M11.3 Export und Ampel – je
  braucht M10. **Welle B und folgende:** M11.4 großer Feinschlifflauf über die ganze Liste.

---

## 5 Was in die Liste kommt

Die Liste [Studio: Was bleibt](../2026-11-20-studio-was-bleibt.md) hat drei Teile.

**A – vorläufige Entscheidungen** (aus K §14 und diesem Blatt): A1 Kopfdrehung bleibt im Prototyp (5) · A2 Mischart (19) · A3 Drehung über
die Front ohne periodische Mischung (19) · A4 Kehrtwende über die Front (8) · A5 Bohne starr (18) · A6 Schwanz biegt sich (18) · A7 auf
Ozzy nur die erlaubten Effekte, Schatten auf Boden und Welt, auf ihn nur auf sein Wort (9, 30 d) · A8 Effekte für Momente in M10 (22) · A9 Autorig mit der Katze,
Ozzys Knochen aus dem Prototyp (22) · A10 Korrekturen drehen mit der Form (12) · A11 Text als Figur (7) · A12 Physik-Bibliothek für die Welt
(K §14) · A13 keine Modi · A14 V verschiebt · A15 Leertaste (24) · A16 ein Hügel, drei Runden · A17 Stehzone ±17°, springt selbst, wendet
nach 0,3 s · A18 nach links gespiegelt · A19 kein Maul · A20 kein Rückwurf · A21 Katze, Zettel, Antippen · A22 Wörter (alle K §14) · A23
Studio im Browser (25) · A24 Hauptspiel zuerst mit Bildfolgen (25) · A25 zwei Geräte (F5) · A26 viele Agenten, Wochenlimit (F2, F7, 23).
Nach der Prüfung dazugekommen: A27 Beine auf dem runden Hügel (6) · A28 kein Atmen im Stehen · A29 fast glatte Anker bleiben Ecken
(11) · A30 Taste B zeigt das Bild ohne Hilfen.

**B – Proben für sein Auge, Nicole, iPhone, iPad** (Ergebnisse folgen später): B1 Video Kopfdrehung (M1) · B2 Bild und Video Mischart
(M1) · B3 Messseite auf den Geräten, welches iPad (M2) · B4 Rad mit Gewicht (M2) · B5 grobes Tapsen mit Nicole (M2) · B6 Safari-Automation
einmal einschalten (M2, freiwillig) · B7 Werkbank-Probe 1 (M3) · B8 Werkbank-Probe 2 und Abläufe (M4) · B9 Tapsen bergab (M5) · B10
Spielwiese auf dem iPhone, Effektbild, Knie (M6) · B11 Nicole Morgenrunde (M7) · B12 Bedienprobe (M7) · B13 Pannen, Rückblick, Rückwurf
(M8) · B14 Katze riggen, Bohne, Bezugsrahmen, „Warum?“ (M9) · B15 Nicole Abendrunde, Effekte (M10) · B16 der ganze Tag in der App, Stumm,
ein Ding selbst bauen (M11).

**C – offene Punkte für den großen Feinschlifflauf:** vorerst leer; jede Etappe trägt ein, was ihr auffällt.
