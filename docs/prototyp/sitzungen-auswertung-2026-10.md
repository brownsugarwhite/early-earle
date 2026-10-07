> **Archiv (2026-10-04).** Auswertung der Verläufe der letzten drei Sessions vor dem Abschluss von Prototyp 1, erstellt aus den Transkripten (nur Nutzer- und Assistenztexte). Die verdichtete Fassung steht in [`README.md`](README.md) §2, §6 und §7. Rohseiten und Notizen lagen nur im Cloud-Container und sind nicht im Repo.

# early earle – Auswertung früherer Claude-Code-Sitzungen (Stand 2026-10-04)

Quelle: Transkripte über `list_events` (nur Nutzer- und Assistenztexte, Fragen/Antworten, Git-Befehle und Berichte von Unteragenten).
Alle Uhrzeiten sind **UTC** (MESZ = UTC + 2). Commit-Hashes sind gekürzt. „[unsicher]“ markiert Schlüsse, die nicht direkt im Transkript stehen.

Rohnotizen und Rohseiten lagen nur im Cloud-Container (nicht im Repo); der unbestätigte Wesen-Plan liegt als `wesen-v4-plan-unbestaetigt.md` daneben.

## Überblick

| # | Sitzung | Zeitraum (UTC) | Umgebung | Branch | Endzustand |
|---|---|---|---|---|---|
| 1 | `session_014QGctYMzD9sL3T3MqBzGHi` „Wöchentliches Nutzungslimit erreicht“ | 2026-10-02 09:12 → 2026-10-04 14:13 | Cloud-Container (anthropic_cloud, Linux, keine GPU, kein Blender), gestartet aus der Desktop-App | `claude/fervent-fermi-x9eddx` (nichts committet) | Plan-Modus; der Plan „Wesen-Baukasten v4“ wartet auf Freigabe (ExitPlanMode nicht bestätigt) |
| 2 | `session_013QPSkucVV2pVgQ3ZZXjiod` „Early Earle – 2048 Puzzle Game“ | erstellt 2026-09-29 17:06; letzte Aktivität 2026-10-01 14:11; archiviert (Update 10-02 03:30) | Florians Mac über Bridge/Remote Control, `/Users/bsw/Projekte/playground/early-earle` | `main` plus Worktrees unter `.claude/worktrees/` | wartet auf Florian (Frage nach der App für die Freundin); **6 nicht gepushte Commits, Worktree dirty** |
| 3 | `session_01QS7tGHYwmG5H2sd3aGyAHL` „Loader, Möve-Animation und Intro-Sequenz“ | erstellt 2026-09-30 14:51; letzte Aktivität 2026-09-30 21:37 | Florians Mac über Bridge | `main` plus Worktrees `iter4-fundament` (`iter4/integration`) und `iter4-merge` | fertig, alles auf `main` (`985f882`), Rest an Sitzung 2 übergeben |

Wie die Sitzungen zusammenhängen:
- Sitzung 3 baute Iteration 4 (Loader, Möwe, Intro, Sammlung, Klassik).
- Sitzung 2 koordinierte die Karte (unendliche Kugel, Welten 07/10/11–14, Ruine, Verläufe) und übernahm von Sitzung 3 Merge und iPhone-Deploy.
- Ab 2026-10-01 übernahm eine weitere Mac-Sitzung, **„Map-Schatten und Performance-Optimierung“** (`local_c4d4a7fc-ab02-42f4-bb9d-9b1a7407438e`), die Karte („Karte v5“). Sie wurde hier **nicht** ausgewertet.
- Auch die „letzte Fable-Session“, die laut Florian vor dem Limit das neueste Update aufs iPhone spielte, wurde nicht ausgewertet. [unsicher, welche Sitzung das war; vermutlich die Karten-Sitzung]

Geprüft am lokalen Klon `/home/user/early-earle` (nur lesend):
- `origin/main` = `0b0122c` („Merge Karten-Bäume (R3)…“, 2026-10-01 17:00 +0200).
- Alle hier genannten Main-Hashes bis `0b0122c` sind vorhanden.
- Der Mac-HEAD `b116346` aus Sitzung 2 (`b1163462bced588d74509d14e4675ac5a7a6cc44`) ist **nicht** auf GitHub. Siehe Sitzung 2, „Nur lokal auf dem Mac“.

---

## Sitzung 1 – `session_014QGctYMzD9sL3T3MqBzGHi` „Wöchentliches Nutzungslimit erreicht“

**Zeitraum:** 2026-10-02 09:12 → 2026-10-04 14:13 UTC. Pause vom 10-02 10:18 bis 10-04 13:14, weil das Wochenlimit erreicht war.

**Umgebung:**
- Cloud-Container: Linux, Node 22 (das Repo verlangt ≥ 24), Chromium 1194, keine GPU, kein Blender, kein Godot, kein iOS-Build.
- Modelle: am 10-02 zunächst Sonnet (Antworten mit `claude-sonnet-5-5`); am 10-04 13:14 stellte Florian auf `claude-opus-5-5` um.
- Am Ende im Plan-Modus. Kosten laut Metadaten ≈ 10 USD.

**Branch:** `claude/fervent-fermi-x9eddx`. Es gab keine Commits und keine Code-Änderungen.

**Rate-Limit:** `seven_day` steht auf „rejected“ und wird am **2026-10-06 08:00 UTC** zurückgesetzt. Bei Sitzung 2 steht derselbe Wert.

### Nutzeranfragen (chronologisch, wörtlich)

1. **10-02 09:13:** „mein wöchentliches nutzungslimit ist erreicht. was kann ich hier in der cloud an early earl bearbeiten? Geht hier auch alles?“
   - Antwort, noch ohne Test:
     - **Geht in der Cloud:** Code in `packages/` und `apps/game`, `content/`-JSON samt Solver, Doku, Git auf `claude/fervent-fermi-x9eddx`, Playwright-Smoke-Tests und Screenshots.
     - **Eingeschränkt:** Node 22 statt ≥ 24.
     - **Geht nicht:** WebGPU und der echte Look (Benchmarks `?bench=1` sind dort wertlos), Blender, Godot, iOS/Capacitor-Build. `ref/eyvind earle/` liegt nur lokal.
     - Das Limit hängt am Konto, nicht an der Umgebung; auch Cloud-Arbeit verbraucht es.
2. **10-02 09:26:** „bevor das limit erreicht war hat mir die letzte fable session noch das neuesteb update aufs iphone gespilt. Leider fehlt der boden der map komplett auf meinem iphone. Im browser geht es ganz normal. Kannst du das fixen?“
3. **10-02 10:08:** „ist nur in der nativen app“
4. **10-04 13:14:** Modellwechsel auf `claude-opus-5-5` (lokaler Befehl).
5. **10-04 13:20**, mit **4 angehängten Bildern** (GPT-Entwürfe: Dino, Schnecken-Drache, Retriever, Blob-Materialien, je ca. 13 Wachstumsstufen):
   „ich habe immer mehr ideen für wesen und will später auch dass wesen wirklich ausgefallen und einzigartig aussehen wie die in meinem screenshot. Wenn ich dir eine vorlage von forne und von der seite und von oben liefere. Kannst du mir dann diese optik aus meinem screenshot und ein aufwändigeres rigging für maul und schwanz und assets wie flügel oder später rüssel. Bekommst du sowas genau hin. Auch die texturen?
   Wie liefere ich dir die vorlagen am besten und kannst du dann immer gleich ein modulares system entwickeln, dass sich alles mit allen figuren kombinieren lässt? Erstelle mir einen generellen plan zum generieren ausgefallener und seeehr hochwertiger spielcharactere mit tollen shadern und animationen. Die performance soll auf dem iphone trotzdem herausragend sein.“
6. **10-04 14:04**, Antworten auf drei Rückfragen:
   - **Optik:** „Brücke (Empfohlen)“. Das heißt: Formen, Mäuler, Zähne und Texturdetail wie in den Entwürfen, aber Licht in 3–4 harten Stufen mit Verlauf innen, Earle-konform.
   - **3D-Erzeugung:** „welcher weg sorgt für die besten ergebnisse. wie bekomme ich das modular hin?“ Zur Wahl standen: Hybrid aus KI-Bild-zu-3D plus Blender-Skripten (empfohlen), nur die eigene Pipeline, oder nur der KI-Dienst.
   - **Pilot:** „erstmal garnicht anfangen. Alles soll ja auch modular funktionieren also jedes maul auch mit jedem fell und muster. Meine bisherigen beispiele waren nur schnelle drafts aus gpt...ich habe schon 100te ideeen die sich auch kombinieren lassen müssen. Katzenmaul mit fischschuppen und schmetterlingsflügeln oder elchhörner an einem krokodil mit federkleid...es wird 10000der kombinationsmöglichkeiten geben...wie bekommen wir das richtig unter einen hut“

### Was getan wurde

**Bodenfehler (Anfragen 2 und 3):**
- `pnpm install --frozen-lockfile` lief trotz Node 22 durch. Der Vite-Dev-Server lief per HTTP auf Port 5174 (`NO_SSL=1`).
- Playwright im Repo erwartet `chromium_headless_shell-1243`, installiert ist 1194. Abhilfe: `executablePath` auf `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` setzen.
- Bei DPR 3 lief `page.screenshot` in einen Timeout (30 s, „waiting for fonts“), deshalb DPR 1. Alte Chromium-Prozesse blockierten die CPU; erst nach dem Aufräumen liefen die Tests.
- **Getestet, und überall war der Boden da:**
  - `/play` als WebGL2 im iPhone-Format 393 × 852, bei DPR 1 und DPR 3, mit Qualität „Mobil“;
  - der iOS-WebKit-Schattenpfad `?backend=webgl&shadowcompat=manual`;
  - der **Produktions-Build** (`vite build`, dann `vite preview` auf 4175, `/play?backend=webgl&mode=free&level=1`). Diesen `dist/` lädt auch die native App.
- **Nicht testbar:** der WebGPU-Pfad. Ohne GPU bleibt die Karte in der Cloud ganz leer, auch auf unveränderten Routen wie `/lab/earle`.
- Die native Hülle (`apps/game/ios`, `capacitor.config.ts`) ist seit dem 09-30 unverändert. Es gibt keinen App-Sonderfall im Code, kein Nachladen zur Laufzeit und keinen Web Worker fürs Gelände.

**Hypothesen (10:03 und 10:18).** Keine wurde bestätigt, es gibt keinen Fix.

1. **Die App läuft unter `capacitor://localhost`, nicht unter HTTPS.** Dann bekommt sie wohl WebGL2 statt WebGPU. Im Simulator war das so (`docs/IOS.md` §5), auf dem echten iPhone ist es offen. Safari über HTTPS nutzt WebGPU, deshalb geht es dort. Folgerung: Die neuen Gelände-Kacheln oder der neue Schattenpfad scheitern im WebGL2-Pfad auf der echten Apple-GPU; die Software-Emulation deckt das nicht ab.
2. **Schatten:** `packages/render/src/shadow/webglCompat.ts` dokumentiert, dass ein kaputter Schattenvergleich auf iOS den ganzen Boden in „Tinte“ färbt. Tinte `#081b25` ist zugleich die Hintergrundfarbe, also wäre der Boden unsichtbar, Bäume und Pfad aber sichtbar. Am Vortag kamen drei Schatten-Änderungen dazu: R1 (Texelgitter, Gleiten statt Neuzeichnen), R2 (Lichtkugel in den Lichtbändern) und das Glätten der Empfängerebene.
3. **Gelände-Kacheln** (`f6a26c1`, laut Git am 2026-10-01 14:38 +0200, nicht „heute“): Je 3 × 3 Chunks werden zu einem Mesh, das nur gezeichnet wird, wenn einer seiner Chunks im Bild liegt.
4. **Boden-Shader zu groß** (Wasser, Schatten, Bänder): Er könnte auf dem iPhone nicht kompilieren. Das Spiel zeigt solche GPU-Fehler nirgends an.

**Was von Florian erbeten wurde (unbeantwortet):**
- In Safari ▸ Entwickler ▸ „eyePhone“ ▸ early earle ▸ Konsole die roten Zeilen schicken (`Shader Error`, `WebGLProgram`, `pipeline`, `GPU`). Voraussetzung: iPhone ▸ Einstellungen ▸ Apps ▸ Safari ▸ Erweitert ▸ Web-Inspektor; Debug-Builds von `ios:device` sind inspizierbar.
- In der Konsole `isSecureContext` und `!!navigator.gpu` abfragen.
- Safari auf dem iPhone gegen den Dev-Server mit `?backend=webgl` öffnen.
- Vorher erfragte Schalter: `?quality=hoch`/`?quality=mobil`, `?tintenkugel=0&lichtkugel=0`, `?planeSmooth=1`. Außerdem: welches Backend der Perf-Badge zeigt und ob die Fläche dunkelblau ist oder durchsichtig.
- Angebot: eine In-Game-Anzeige für GPU- und Shaderfehler. Sie käme aber erst mit dem nächsten `ios:device` vom Mac aufs Telefon.

**Wesen-Plan (Anfragen 5 und 6):**
- Zwei Erkundungs-Agenten (Laufzeit-System und Blender-Pipeline, nur lesend) und ein Planungs-Agent liefen.
- Ergebnis ist der Plan **„Wesen-Baukasten v4“**. Er wurde im Container nach `/root/.claude/plans/ich-habe-immer-mehr-fluffy-spark.md` geschrieben; eine Kopie liegt in `sess/plan-v4.md`, der Architekturentwurf in `sess/arch-v4.md`. Danach kam ExitPlanMode, **nicht freigegeben**.
- **Kerninhalte des Plans:**
  - Schichten statt Kreaturen: Körperplan, Form-Module A (SDF an Knochenrollen), Anbau-Module B (Mesh mit `SOCKET_root`, Materialklasse pro Vertex), Haut-Rezept, Kleid, Muster (ca. 6 Generatoren), Palette (benannte Rollen), Rig und Verben, Wachstum in 13 Stufen.
  - **Oberflächendeskriptoren pro Vertex** sind der zentrale Vertrag.
  - Kombinationsregeln über Tags (`occupies`, `needs`, `size`, `mouthType`). Sockel werden Regionen statt theta/phi.
  - Ein echtes **Maul-Kit**: Kavität per SDF-Subtraktion, Lippenlinie, Zahn-Slots, Sub-Rig mit `snarl`/`tongue`. Kurven-Skinning für Ketten (Schwanz, Hals, Rüssel).
  - Shader „Brücke“: höchstens 8 Pipelines, Material-Tabelle als DataTexture, ein Detail-Normal-Array (KTX2), Vertex-AO aus dem SDF.
  - Produktion **pro Teil, nie ganze Wesen**: KI-Bild-zu-3D (Tripo, Rodin, Hunyuan3D oder Meshy), dann `tools/blender/normalize_part.py` (neu), dann Bake (nie Farbe backen), dann gltf-transform in CI.
  - Vorlagen kommen nach `assets/ref-florian/wesen/<baustein-id>/` (orthografisches Turnaround-Blatt, Zustände, Stufenleiste, Steckbrief `docs/wesen/STECKBRIEF.md`).
  - iPhone-Budget: Brett mit 36 Wesen in ≤ 6 Draw Calls über eine Slot-Arena; Zustand als Float-DataTexture; Worker-Vermaschung mit IndexedDB-Cache; `deformCreature`; Kombi-Prüfstand.
  - Roadmap P0–P6. P0 verändert nichts Sichtbares.
- **Befunde zum Bestand:**
  - Körper sind SDF-Kugelverbünde mit ≤ 14 Kugeln (GPU-Block 16), auf der CPU vermascht und mit Kugel-Skinning animiert.
  - Es gibt 43 Module, 32 davon sind skriptgenerierte GLBs ohne Texturen.
  - Muster sind 11 feste Shader-Zweige.
  - Das Maul ist eine nachgeführte Sichel; auf dem Mesh-Pfad dehnt ein offener Kiefer nur die Haut.
  - Tiers: Schema 1–16, Katalog bis 12, Farbrampe nur 8 Stufen, `genomeFor` klemmt bei Stufe 8.
  - Die Bibliothek `assets/blender/early-earle-bibliothek.blend` (≈ 26 MB) wird generiert und enthält 108 Wesen-Meshes.

### Erledigt
- Analyse und Hypothesen zum Bodenfehler; kein Fix.
- Kartierung des Wesen-Systems und Plan v4 als Entwurf. Nichts committet, nichts gepusht.

### Offen / nicht beendet
1. **Boden fehlt in der nativen iOS-App, in Safari nicht.** Ungelöst. Es wird auf Florians Konsolen-Ausgabe aus dem Web-Inspektor gewartet. Optional fehlt noch die In-Game-Anzeige für GPU-Fehler. Betroffen sind wahrscheinlich `packages/render/src/shadow/*` (Schattenvergleich im WebGL2/WebKit-Pfad), die Gelände-Chunks aus `f6a26c1` oder der Boden-Shader. [unsicher]
2. **Plan „Wesen-Baukasten v4“: wartet auf Freigabe.** Florian muss ihn bestätigen oder ändern. Nichts davon ist umgesetzt.
3. **Offene Entscheidungen aus dem Plan:**
   - 3 oder 4 Lichtstufen;
   - ob Jelly auf dem Mesh-Pfad opak bleibt;
   - Brett-Auflösung 1 200–1 600 Verts (statt 900) bei < 40 ms Vermaschung im Worker;
   - Lippen beim Schließen (Ausweichlösung: zwei Mesh-Zustände);
   - ob die Detail-Normalen auf Brettgröße rauschen (Florian prüft am Gerät);
   - die Nahansicht per Raymarch ist teuer;
   - ASTC/KTX2 in WKWebView;
   - Kosten von Vertex-Texture-Fetch unter WebGL2;
   - Lizenz und Stilkonsistenz des KI-3D-Dienstes (Konto und Kosten bei Florian).
4. Florians Frage „welcher weg sorgt für die besten ergebnisse“ beantwortet der Plan mit „Teile per KI-3D plus Normalisierung in Blender“. Florian hat das noch nicht bestätigt.

### Fehler, Fixes und Lehren
- In der Cloud lassen sich Fehler, die nur auf der Apple-GPU auftreten, nicht nachstellen: Software-WebGL zeigt den Boden, WebGPU zeigt gar nichts.
- **Der native App-Kontext unterscheidet sich vom Browser.** `capacitor://localhost` ist kein HTTPS, also vermutlich WebGL2 statt WebGPU. Fehler „nur in der App“ deuten deshalb auf den WebGL2-Pfad.
- Es fehlt ein Kanal für GPU- und Shaderfehler auf dem Gerät. Eine In-Game-Fehleranzeige oder die Web-Inspektor-Routine sollten Standard werden.
- Werkzeuge in der Cloud: die Playwright-Version passt nicht (`executablePath` nutzen); Screenshots warten auf Fonts (DPR 1); veraltete Chromium-Prozesse verursachen Timeouts.
- **Wesen-Architektur:** Heute steigen die Draw Calls mit der Vielfalt, weil `CreatureMeshBodies.variantFor()` ein Mesh pro Formschlüssel und `PartPool` ein InstancedMesh pro Modul anlegt. Gegenmittel: Slot-Arena.
  - `BatchedMesh` scheidet aus, weil r186 pro Instanz zeichnet (geprüft in `WebGPUBackend.js` um Z. 2124).
  - `BlobParamBlock` liegt an der 16-KB-Grenze für Uniforms.
- **Florians Entscheidungen:**
  - Look „Brücke“.
  - Kein Pilot, zuerst eine modulare Architektur.
  - „jedes maul auch mit jedem fell und muster“, Zehntausende Kombinationen.
  - Gate auf dem iPhone: ≥ 58 fps, p99 < 20 ms, 36 Wesen auf dem Brett.

---

## Sitzung 2 – `session_013QPSkucVV2pVgQ3ZZXjiod` „Early Earle – 2048 Puzzle Game“

**Zeitraum:**
- Erstellt 2026-09-29 17:06 UTC, letzte Aktivität 2026-10-01 14:11 UTC, archiviert.
- **Ausgewertet wurde nur der Abschnitt 2026-09-30 22:46 → 2026-10-01 14:11** (ca. 38 Seiten). Florians frühere Anfragen vom 09-30, etwa zu den Welten 11–14, den Lieblingsbildern und den fünf Detailbildern vom Morgen, sind nicht im ausgewerteten Teil und erscheinen nur indirekt.

**Umgebung:**
- Florians Mac (Bridge, Remote Control), Pfad `/Users/bsw/Projekte/playground/early-earle`. Florian schrieb teils vom iPhone aus.
- Modell `claude-opus-5-5`, Effort max.
- Die Sitzung orchestrierte Unteragenten in Worktrees:
  - Kugel-Agent `afcceb4b5ef853cad`;
  - Welten 11/12 `a00379d240f0e23cf`;
  - Welten 13/14 `ad23bf76cf764b02c`;
  - mehrere Agenten zum Nachschärfen.

**Branch:** `main`. Gemergt wurde in eigenen Worktrees: `.claude/worktrees/merge-verlaeufe`, `.claude/worktrees/integ-welten` (Branch `integ/welten-11-14`).

### Nutzeranfragen (chronologisch)
1. **10-01 00:55:** „kannst du unterbrechen. Ich muss das laptop schließen. Ich mache bald weiter.“
   - Alle Agenten gestoppt, Nacht-Check abgeschaltet, Wachhaltung beendet.
2. **10-01 01:12:** „kannst du nur den aktuellen stand aufs iphone spielen?“
   - Haupt-Checkout per Fast-Forward auf `4bf845b` gebracht.
   - Deploy: `IOS_TEAM_ID=R67BLW649H IOS_DEVICE="eyePhone (2)" pnpm --filter @ee/game ios:device`.
   - Installiert. Der Autostart scheiterte, weil das iPhone gesperrt war (CoreDeviceError 10002).
3. **10-01 02:55:** „wo kann ich den aktuellen stand im browser sehen? und eine zwischenfrage. Vieles gefällt mir schon gut aber die perfprmance auf dem iphone ist nicht gut und die schatten "wackeln extrem" und sind "stufig" und nicht exakt und bewegen/flimmern nach. Ich hätte sie gern scharf und präzise wie bei earles gemälden und konstant 60fps. Können wir das hnbekommen? Mach noch nichts. Beantworte nur die Frage“
   - Adressen genannt: `https://localhost:5173/play?mode=free`, `/lab/earle?world=11&p=1` (auch 12–14), `/werkstatt`.
   - Vorschlag 1: Schatten als aufgelegte Geometrie, Horizont-Info pro Gelände-Abschnitt, Sonne je Welt fest.
4. **10-01 03:07:** „das klingt bei dem bergigen gelände sehr unsauber. Die sonne soll auch so bleiben. Ich bin mir nicht sicher. Klingt nicht nach dem was ich will.“
   - Vorschlag 1 verworfen.
   - Vorschlag 2: echte Schattenkarten behalten, aber fest und pixelgenau eingerastet wie eine Tapete; nur den neu ins Bild kommenden Randstreifen nachzeichnen, dafür höhere Auflösung; Aktualisierung in jedem Bild; Messung auf dem iPhone mit festem Budget; zuerst im Schatten-Lab mit Umschalter alt/neu.
   - Rückfrage: „Wann wackelt es am stärksten: beim Verschieben, beim Anflug ins Level oder im Stillstand?“ Unbeantwortet.
5. **10-01 03:08:** Systemmeldung, Port 5173 belegt (Florians eigener HTTPS-Dev-Server, PID 2002).
   - Die Vorschau kann das selbstsignierte HTTPS nicht öffnen. Deshalb lief die vorhandene Konfiguration „game-dev-http“ auf 5174, ohne Konfig-Änderung.
6. **10-01 03:13:** Florian startete selbst `pnpm --filter @ee/game exec vite --port 5173`. Im LAN erreichbar unter `https://192.168.1.55:5173`.
7. **10-01 03:57:** „kann ich es auch meiner freundin als app aufs handy machen, zum testen“
   - **Weg 1:** über Florians Apple-ID. Ihr iPhone muss per Kabel an den Mac, Entwicklermodus einschalten, nach der Installation unter „VPN & Geräteverwaltung“ vertrauen. Die App läuft 7 Tage; erlaubt sind ≤ 10 Geräte und 3 Apps.
   - **Weg 2:** TestFlight, braucht das Apple Developer Program (99 €/Jahr), Builds laufen 90 Tage. Das wäre auch der Weg für „Nicole“ und weitere Tester.
   - **Offen:** Ihr iPhone hing nie am Mac. Die Status-Metadaten fragen „build for iOS/Android, or web APK?“.
8. **10-01 12:36, 12:38, 14:11:** keine Nutzer-, sondern Peer-Nachrichten der Karten-Sitzung (Details unten).

### Erledigt (mit Commits)
- **09-30 22:46:** Bericht des Welt-13/14-Agenten vor dem Merge.
  - Worktree `.claude/worktrees/agent-ad23bf76cf764b02c`.
  - Commits: `6ab4a72` (`future` in `RouteEntry`), `d7bdfb3` und `dfa7c68` (Welt 13), `bf7b9b6` und `e23fbfe` (Welt 14), `a9210fb` (Tests), `65919da` (Bilder).
- **09-30 23:14:** Welten 13/14 auf den Kugel-Stand `23f8a12` gemergt (`fde9570`), danach `f63edec` (Landzungen-Palette, neue Belegbilder).
- **09-30 23:21:** `8c04fe0`, Merge der Welten 11/12 (Nebelweide nach Ebene 20, Goldnebelhang nach Ebene 7) auf 13/14. Dabei gab es 11 Konfliktdateien.
- **09-30 23:29:** `101b902`, „Welten 11–14 zusammen: Routentests auf vier künftige Welten (Level 101–140)“.
- **10-01 00:01:** Abschlussbericht des Kugel-Agenten, Branch `worktree-agent-afcceb4b5ef853cad` @ `c493cd7`:
  - `23f8a12`: Verläufe auf der Ebene, Welten 07/10 (Riesenstämme 28 in w07, 31 in w10, `floorAnchor`), Kamera-Fix für die Ruine.
  - `e0262b3`: Culling der Draw Calls.
  - `d0b9263`: Leistung des Schatten-Fits.
  - `c493cd7`: Bilder `docs/progress/unendlich-karte-welten-07-10.png` und `unendlich-ruine-karte.png`.
- **10-01 00:03:** `0aa03bf`, „Merge Unendliche Kugel (ADR 0002): Karte als unendliche Ebene mit Anzeige-Kugel, Streaming, prozedurale Welten, Grundbestand abseits des Pfads, FlowStage auf der Ebene, Culling“. Danach `e90238f`, Merge der Welten 11–14.
- **10-01 00:13:** `4bf845b`, „Welt 14: Kompositionssonne 15° — keine Bandsplitter mehr am Klippenfuß“, nach `main` gepusht.
- **Stand von `main` am 10-01 00:57, laut Zusammenfassung:**
  - Schattenfix für den iOS-Simulator;
  - unendliche Karte, in alle Richtungen drehbar, mit prozeduralen Welten nach den zehn Autorenwelten;
  - Verläufe nach Florians Korrektur (harte Stufen bleiben, Verlauf nur innerhalb großer Flächen);
  - Welten 07/10 näher an den Vorlagen;
  - neue hohe gotische Ruine mit Wendeltreppe;
  - Welten 11 Nebelweide (Ebene 20), 12 Goldnebelhang (Ebene 7), 13 Roter Monolith (Ebene 45) und 14 Stille Bucht (Ebene 29) als künftige, gesperrte Level 101–140 („bald“);
  - Iteration 4 aus Sitzung 3.
- **10-01 01:14:** `4bf845b` auf Florians iPhone installiert.
- **10-01 14:11:** Die Karten-Sitzung meldet „Phase 0 auf main“ = `edaa026` (siehe Peer-Abschnitt).

### Peer-Koordination (Karten-Sitzung „Map-Schatten und Performance-Optimierung“)
- **10-01 12:36:** Florian hat am 10-01 den Plan **„Karte v5“** freigegeben.
  - Plan auf dem Mac: `~/.claude/plans/hi-wir-haben-in-tender-yao.md`; Memory: `handoff-karte-v5`.
  - Inhalt: Schatten-Gitter an der Ebene, Lichtkugel-Regler, Route als eine Datei `content/zones/route.json` mit 15 Autorenwelten und angedeuteter Zone 16, 184 Level, Makroformen des Pfads, Klippe/Aufzüge/Brücken, Bergung der fünf gestoppten Worktrees zum Nachschärfen.
  - Phase 0 lief in sechs Worktrees auf Basis `4bf845b`: `integ/nachschaerfung`, `w1/route-15-1`, `r/schattenkern`, `l/level-184`, `a2/harness`, `r4/messung`.
  - Sitzung 2 sagte zu, die Karte nicht anzufassen und nicht nach `main` zu pushen.
- **Von Sitzung 2 gemeldete, nicht gesicherte Stände:**
  - Welt 01/03: 1 eigener Commit plus 3 Dateien;
  - Welt 04/05: 17 Dateien;
  - Welt 08: 21 Dateien;
  - Welt 02/06/09: 19 Dateien, alle nicht committet;
  - Draw-Call-Culling: 3 Dateien.
- **10-01 12:38:** Pause bestätigt. Bergungs-Reihenfolge: zuerst afcc, dann a2a9, dann die drei alten per Datei-Übernahme.
  - Übernommene Hinweise: „WebKit `textureLoad` bleibt“; Florian lehnt aufgelegte Schattenformen ab; die Sonne bleibt bei 10° Höhe und 70° Azimut.
  - Schattenkern: echte Werfer im Schattenpass, Gitter an der Ebene, Slide statt Refit, keine Decals.
  - Die Worktrees `merge-verlaeufe` und `integ-welten` bleiben stehen.
- **10-01 14:11:** „Phase 0 auf main“ = `edaa026`.
  - Bergung der fünf Worktrees: Arten kuppel/domeOak/winterOak/maple/spruce, Scheune v2, Culling-Kacheln.
  - Route 15 + 1 mit Tor „Bald“ und Welt 15/16.
  - 184 kalibrierte Level.
  - Schattenkern mit `?lichtkugel=`, `?tintenkugel=`, `?planeSmooth=`.
  - `?bench=karte` und `nachschaerfung-shots.spec.ts`.
  - 810 Unit-Tests grün, keine neuen Abhängigkeiten.
  - Weiter gesperrte Bereiche: `packages/render/src/earle/*`, `packages/render/src/shadow/*`, `packages/world/src/plane/*`, `apps/game/src/flow/*`, `apps/game/src/lab/earle/*`, `content/zones/*`, `content/levels/*`.
  - Noch laufend: Wasser, Scheune/Ahorn, angedeutete Zonen, Makroformen, Krone v4, Nachzügler; danach Karten-Bäume R3, Leistung R4, Klippe W4.
  - Bis `0b0122c` auf `main` angekommen: Nachzügler `142b247`, Krone v4 `42fd88d`, Wasser W7 Teil 1 `0cfb7a2`, `a5b8b17`, Scheune v3 und Ahorn A4 `78d5716`, Makroformen W3 `b383b50`, Karten-Bäume R3 `0b0122c`, Culling `f6a26c1`.
  - **R4 (Leistung) und W4 (Klippe) sind auf GitHub nicht zu sehen.** [unsicher, ob nur lokal oder nie gemacht]

### Offen / nicht beendet
1. **6 nicht gepushte Commits und ein dirty Worktree auf Florians Mac.** Laut Metadaten (Stand 2026-10-01 15:30 UTC) steht der Haupt-Checkout auf `main` mit HEAD **`b116346`** (`b1163462bced588d74509d14e4675ac5a7a6cc44`). Dieser Commit fehlt auf GitHub. Inhalt unbekannt. Möglicherweise stammt er aus der Karten-Sitzung, die im selben Checkout arbeitet. [unsicher]
2. **App für die Freundin bzw. Tester:** nicht erledigt. Florian muss sich zwischen Apple-ID-Provisionierung und TestFlight (99 €/Jahr) entscheiden.
3. **Schatten scharf, präzise, ohne Wackeln, dazu konstant 60 fps auf dem iPhone:**
   - Konzeptionell an die Karten-Sitzung übergeben (Schattenkern in `edaa026`, R1/R2).
   - **Eine Bestätigung auf dem iPhone fehlt.**
   - Die Rückfrage „wann wackelt es am stärksten“ ist unbeantwortet.
   - Das iPhone-Messprotokoll `docs/progress/karte-perf-iphone16.md` (R4.1 „Messen zuerst“, Vorlage für R4.2–R4.7: DPR-Deckel, Governor, Schatten-Slide, Punkte-Taps, Instanzen …) ist nur eine Vorlage. Messungen gab es bisher nur am Mac.
4. **Nachschärfen der Welten 01–06, 08, 09 gegen die Vorlagen:** angehalten. Die Zwischenstände wurden laut Peer in Phase 0 geborgen. Ob dabei alles übernommen wurde, etwa der eigene Commit von Welt 01/03, ist nicht geprüft. [unsicher]
5. **Draw Calls beim endlosen Schwenken:** Der Median lag bei 107 statt ≤ 100, `e2e/unendlich-webgpu.spec.ts` war rot. Danach kam das Culling (`f6a26c1`, über die Karten-Sitzung). Ob der Test heute grün ist, ist ungeprüft.
6. **Riesenbaum und Geschwister in gemeinsame Meshes zusammenlegen:** offen. Liegt der Riesenbaum im Bild, kosten er und seine Geschwister bis zu 26 Calls (Welt 07 beim Ziehen: Median 59, p90 104, max 108).
7. **Welt 13:** dünner, gestreifter Spalt an der linken Schaftkante des Monolithen bei Knoten 104 auf der Karte, offen.
   - Abweichungen zur Vorlage: Das Plateau ist frontaler statt Earles Keil von links unten; die Wolken sind einzelne Bänke statt eines Wolkenturms; die Glut wirkt weniger malerisch.
   - Auf der Karte wirkt der Monolith als schwarze Silhouette, weil die Flow-Sonne ihn von hinten beleuchtet.
8. **Welt 14:** die Silhouette ist glatter als bei Earle (Klippenstufen fehlen), drei Bäume statt zwei, die Kräusel sind nah gröber.
   - Auf der Karte laufen die Kräusel 37° diagonal; Windbäume nahe am Pfad wirken groß und hell.
   - Der Verlauf in der Landzunge ist schwach (`#362e2a` → `#302824`); mehr ginge nur über `gradientAmount`.
9. **Optimierung des Wasser-Shaders:** Das Meer ist per `mix` statt per Zweig eingebunden, deshalb rechnen Seen und Flüsse die Meeresfarbe mit (≈ 16 Hashes pro Fragment). Ein `If` wäre die Lösung, offen.
10. **Hänger auf Mobil nach Start oder Presetwechsel:** ein Bild von ≈ 1,2–1,4 s. Anteile: Riesenbaum-Standort mit Pfadrouting ≈ 0,44 s, TSL-Aufbau ≈ 0,47 s plus Pipelines und erster Fit. Die Chunks (≈ 0,25 s) sind inzwischen verteilt. Offen.
11. **Wackelige Tests:**
    - `flow.spec:166` (Riesenbaum) scheiterte nach einem frischen E2E-Server 2 von 4 Mal (`__ee.controller.world = null`);
    - `bodyMesh.test.ts` läuft unter Last in den Timeout (5,8 s bei 5 s Frist);
    - der Solver-Durchsatz-Test (≥ 50 000 Züge/s) scheitert unter Last.
12. Die Worktrees `merge-verlaeufe` und `integ-welten` sollte die Karten-Sitzung in der Integrationsphase aufräumen. Ob das geschah, ist unklar. [unsicher]

### Fehler, Fixes und Lehren
- **Welt 14, Zickzack am Klippenfuß:** Das sind keine Risse, sondern **Bandsplitter der Lichtstufen**. Bei 10° Sonne dreht die Normale am Klippenfuß durch eine Bandschwelle.
  - Beleg: Risse im Shader aus → Linien bleiben; Verläufe 0 → bleiben; Sonne 15° → weg; 2 Bänder → weg; Azimut 40° → sie wandern.
  - Fix: `view.sun` = {azimuth 70, elevation 15} in `content/zones/worlds/14.json` (`4bf845b`).
  - Der echte Riss ist die dünne Tintenlinie, die an der Grenze w14|w10 die Klippe hinab ins Wasser läuft.
- **JSON nicht per `json.dumps` neu schreiben:** Das formatierte die ganze Datei um (159 Zeilen Diff). Rückgängig gemacht und nur die eine Zeile eingefügt.
- **Ursachen der Draw Calls, gemessen per Hook auf `renderer.info`:**
  - die neue Stammart `pillar` kostet +3 (Hauptpass plus 2 Kaskaden);
  - Riesenbaum samt Geschwistern blieb bis ≈ 67 Einheiten Bogen an, obwohl er ab ≈ 50 hinter der Kugel steht (19 Calls);
  - Held und Schattenproxy wurden noch in 500 Einheiten Entfernung gezeichnet (4 Calls);
  - das Brett-Warmup zeichnet beim Start ≈ 20 Calls mit.
  - Fix: Culling pro Baum mit der Horizont-Formel `acos(R/(R+H))`, Held hinter dem Horizont aus. Der E2E schwenkt erst nach dem Warmup und misst Median/Max über 10 Bilder statt am Perf-Badge.
- **Schatten-Fit bei Bewegung ≈ 6× billiger:** von ≈ 7 auf 1,1 ms pro Bild. Der Boden wird auf den Chunk-Dreiecken statt am Rauschfeld abgebildet. Die erste Füllung ist verteilt (≤ 60 ms, dann 2 pro Bild). Die Bench wartet auf 30 ruhige Bilder. Das erklärt die früheren 46–52 fps beim Drehen.
- **Ruine:** Die Kartenkamera maß den Freiraum an der alten Kamera statt an der Kartenpose und stieg auf ≈ 45. Fix: Rückzug bis × 1,5 bei hohen Wahrzeichen; `setSunDirection` läuft in jedem Bild.
- **Windbäume werfen keinen Schlagschatten mehr**, sonst lief bei tiefer Sonne ein Astnetz über die Landzunge.
- Neu in Welt 14: das Spiegelbild (`seaSurface.ts`) folgt dem Blick (gespiegelter Strahl gegen Klippe und Hang); der ferne Glanz hängt am Streifwinkel; neues Feld `coast.ripple`; Pferde in `landmarks/horses.ts`; Overrides über `view.portrait`.
- **Leistung, gemessen am Mac M3 bei 1200 × 760:**
  - Bench Mobil: 60 fps im Leerlauf und beim Drehen, p99 18,7 ms.
  - Welt 13: Hoch 80/83 dc, Mobil 68/66 dc (vor dem Merge 33 dc bei Hoch ruhig).
  - Welt 14: Hoch 26/62 dc, Mobil 64/50 dc.
  - Standardansicht: Hoch 114/113 dc bei 60/59 fps, Mobil 96/93 dc bei 51/60 fps.
  - Schwenk-E2E: Median 80–99. Welt 07 in Ruhe: 42 statt 57.
- **Testergebnisse am 10-01 00:12:** 91 Dateien mit 750 Unit-Tests grün; GPU-E2E 17/18, `unendlich-webgpu` rot (107 > 100, max-Grenze 115).
- **Florians Entscheidungen:**
  - Keine aufgelegten oder Decal-Schatten.
  - Die Sonne bleibt kameragebunden wie bisher (10°/70°).
  - Gewünscht sind echte Schatten, die sauber über Grate und Täler fallen, scharf und präzise wie bei Earle, bei konstant 60 fps.
  - Verläufe: harte Stufen bleiben, Verlauf nur innerhalb großer Flächen (STYLE 5.10, Himmel in harten Bändern mit Verlauf innen).
- **Plattform:** In der iOS-App sind höchstens 60 fps möglich (WebKit-Limit).
- **Vorschau:** HTTPS mit selbstsigniertem Zertifikat öffnet die Vorschau nicht. Lösung: HTTP-Konfiguration auf 5174.
- **Zusammenarbeit:** Bei parallelen Sitzungen pausiert man fremde Bereiche, meldet uncommittete Stände Datei für Datei, merged über einen eigenen Worktree und meldet sich vor jedem iPhone-Deploy ab.

### Nur lokal auf dem Mac
- Haupt-Checkout: HEAD `b116346`, 6 nicht gepushte Commits, dirty (Stand 10-01 15:30 UTC).
- Worktrees: `.claude/worktrees/merge-verlaeufe`, `.claude/worktrees/integ-welten` (`integ/welten-11-14`), `agent-ad23bf76cf764b02c` (Belegbilder `docs/progress/welt13-*.png` und `welt14-*.png`) und die Worktrees der Agenten zum Nachschärfen. Deren Inhalt ging laut Peer in Phase 0 ein.
- Diagnosebild `/private/tmp/claude-501/…/scratchpad/unendlich/w14/welt14-klippenfuss-diagnose.png` (temporär).
- Pläne und Memory unter `~/.claude/plans/` und `/Users/bsw/.claude/projects/-Users-bsw-Projekte-playground-early-earle/memory/` (u. a. `handoff-karte-v5`, `handoff-loader-intro.md`).

---

## Sitzung 3 – `session_01QS7tGHYwmG5H2sd3aGyAHL` „Loader, Möve-Animation und Intro-Sequenz“

**Zeitraum:**
- Erstellt 2026-09-30 14:51 UTC, letzte Aktivität 2026-09-30 21:37 UTC (Metadaten-Update 10-01 02:45).
- **Ausgewertet: 2026-09-30 17:24 → 21:37** (13 Seiten). Florians ursprünglicher Auftrag mit den neun Punkten liegt davor und wurde nicht erreicht. Die neun Punkte ergeben sich aber aus der Schlussmeldung.

**Umgebung:** Florians Mac (Bridge), Modell `claude-opus-5-5`, Effort max.

**Branch:** `main`.
- Integrationsast `iter4/integration` im Worktree `.claude/worktrees/iter4-fundament`; Nachläufer in `.claude/worktrees/iter4-merge`.
- Sieben Baustellen B1–B7 als Agenten-Worktrees:
  - B1 Loader/Splash `ad37111af1979e0df`;
  - B2 Möwe `a97405be0737237c4`;
  - B4 Flow/Fortschritt `a068f8411dc98e3f6`;
  - B5 Sammlung `ab10301ce08498555`;
  - B3 Tutorial, B6 Klassik, B7 Audio/iOS: IDs unter `a50b70cf6ffe5968b`, `abb5fdcf8b49c0703`, `a4715ae860967c119`, Zuordnung unklar.

### Nutzeranfragen (im ausgewerteten Teil)
1. **09-30 17:29** (vom iPhone): „/btw ist die splash screen/loader animation schon fertig? Das würde mich interessieren zu sehen“
   - Vorschau-Konfiguration `iter4-loader-b1` auf Port 5191 in `.claude/launch.json` angelegt.
   - Florian bekam ein 15-s-Video im Handyformat und 5 Standbilder.
   - Hinweise dazu: Der direkte Sprung in Level 1 kam erst mit B4; das Video hat keinen Ton.
2. **Florians Ansage, über Sitzung 2 weitergegeben (19:31):** „Mach das alles und schau, dass auch die andere Session ihre Sachen fertig macht … Spiele alle Änderungen dann auch auf mein iPhone, wenn alles fertig ist.“ Florian ging danach schlafen.

### Erledigt (mit Commits)
- **17:24:** B6 Klassik auf `main`: `92d1bed` („Karten-Einstiege: Abmelden über die ID (nach patch() ist das Objekt ein anderes)“).
  - Formate: 4×4, 3×3, 5×5, 6×6, Kreuz, Ring, Riss.
  - Damit waren 3 von 7 Baustellen auf `main`: Tutorial B3, Audio/iOS B7, Klassik B6.
- **Commits von B1:** `7ceb7d4`, `e638dce`, `d85308f`, `d5e8681`, `8e9bb23`, `a52ab16`, `13e7df0`, `1075d8a`.
  - `f36dfb4` „CI sparsam“: bei jedem Push nur Typen, Unit-Tests, Lint und Build; die volle E2E-Suite wöchentlich und auf Knopfdruck.
- **18:03–18:07:** Abschlussberichte von B5, B4, B2 und B1 (Details unter „Offen“ und „Lehren“).
- **18:08:** Merges in `iter4/integration`: `ec33568` (B2 Möwe), `e9de67f` (B1 Loader, Konflikt in `main.tsx`: beide Seiten übernommen).
- **18:10:** **Nutzungslimit erreicht** (gemeinsames 5-Stunden-Limit, Reset 21:00 MESZ = 19:00 UTC). Die Übergabedatei `handoff-loader-intro.md` war schon vorher geschrieben.
- **19:16–19:20:**
  - Namenskonflikt behoben: Das Feld `warm` der Setzkasten-Szene kollidierte mit `warm()` des Loaders und wurde umbenannt.
  - `3535daf` Merge B5; `d1c7c7e` Merge `origin/main`; `f31a4d0` Merge B4.
  - `9a6af80` Integration: Map-Wesen im Flow auf dem echten Boden (Wasser, Felsen, Netz); Sperrzone ums Plateau, bis die Platte versunken ist; „Sammlung füllen“ mit dem ganzen Katalog.
- **19:32:** `d99ae76` Doku zu Iteration 4 (GDD §16, STYLE: Caprasimo). Der Splash-Test wartet mit eigener Frist auf den Loader.
- **19:35:** Push `eedad21..10c3060`, also `10c3060` „Merge branch 'iter4/integration'“ auf `origin/main`. Danach meldete Sitzung 3 an Sitzung 2 „Flow auf main“.
- **19:36:** `8a96229` Integration Klassik und Karte:
  - eigener Klang fürs Spielende in Klassik;
  - Klassik-Runden zählen nicht als Level-Versuche;
  - „Kein Zug mehr“ im nativen HUD;
  - gemeinsamer Stil der Karten-Einstiege.
- **20:04:** `30c0521` E2E nach der Integration: `waitSplashIdle`, Scroll-Zug in freier Kartenfläche, Flow-Fristen für die Bildschritt-Uhr unter SwiftShader; Nachtrag Iteration 4 in `docs/PRODUCTION.md`.
- **21:32 und 21:35:** `985f882` E2E: Splash-Tests erwarten im freien Modus die Karte; die Frist für `rex.spec` steigt lokal von 150 auf 300 s und auf CI von 240 auf 360 s. Gepusht als `10c3060..985f882`.
- **Schlussmeldung 21:37**, alle neun Punkte auf `main` (`985f882`). Der Erststart auf echter GPU wurde als Video aufgenommen und lief ohne Konsolenfehler.
  1. **Loader/Splash:**
     - Der i-Stamm wächst mit echtem Ladefortschritt, daneben die Prozentzahl in Caprasimo.
     - Bei 100 % kreuzt der Möwenschatten das Bild, der Blob fällt mit „Flatsch“ auf das i.
     - Danach bauen sich Kontur, Flamme, ® und Sterne mit langen Schatten auf, dann erscheint „Tippen“.
     - Das Logo stammt aus Florians AI-Datei; das iOS-Startbild ist das erste Loader-Bild.
  2. **Möwe im Spiel:** Alle 3–5 Züge bringt eine nur als Schatten sichtbare Möwe den neuen Blob. Er landet mit „Flatsch“, die Nachbarn zucken.
  3. **Intro/Tutorial:**
     - Nach „Tippen“ springt der Blob direkt in Level 1: ein 1×3-Brett mit Wisch-Pfeil, das man nicht verlieren kann.
     - Die ersten Level und die Einführungen späterer Mechaniken haben nur so viele Felder wie nötig.
     - Nach einem Sieg hüpft der Blob Punkt für Punkt zum nächsten Level. Nach Level 1 erklärt REX in vier Zeilen.
  4. **Echter und freier Modus:** Im echten Modus scrollt man nur um den freigespielten Pfad, gesperrte Level wackeln. Umschalten über die Werkstatt-Karte „Fortschritt“. Nach dem Update startet die App im echten Modus, der alte Stand liegt im freien.
  5. **Wesen auf der Map:** Neu erspielte Wesen wohnen neben ihrem Level.
  6. **Setzkasten:** 253 mögliche Wesen, je Zone in Fächern; gefundene bewegen sich, fehlende sind Silhouetten. Neue Wesen bekommen auf dem Brett einen „NEU!“-Stempel.
  7. **Klassik-2048:** sieben Formate, 4×4 ab Level 5; bestes Wesen je Stufe; Bestwerte werden gespeichert.
  8. **Schrift:** Caprasimo (frei nutzbar) statt Cooper Black, nur für Zahlen, Prozente, kurze Titel und Stempel, auch im nativen HUD.
  9. **Ton:** Der Lautlos-Schalter schaltet weiter stumm (Florians Wunsch). Die native Ton-Freischaltung ist robuster, in der App klingt es ab dem Start. Alle Klänge sind synthetisch.
  - Tests: Typecheck, 713 Unit-Tests, Lint und Build grün; GPU-Tests 9/9.
- **Übergabe an Sitzung 2 (21:37):** Ruine und Welten 07/10 mergen, `985f882` nachziehen, neue Kugel-Karte (`shadow:85` hat dort schon 120 s Frist), Verläufe-Korrektur, Welten 11–14, `pull` im Haupt-Checkout, iPhone-Deploy. Das tat Sitzung 2 am 10-01 (`0aa03bf`, `e90238f`, `4bf845b`, Deploy 01:14).

### Offen / nicht beendet
Stand der Agenten-Berichte vom 09-30. Einiges könnte später erledigt worden sein; nicht nachgeprüft.

1. **Entscheidungen, um die Florian gebeten wurde (unbeantwortet):**
   - Möwenschatten im Level: Er ist so dunkel wie jeder Schatten und verschwindet unter den Blobs, die noch keine Schatten empfangen. Soll er dunkler werden, oder sollen die Blobs ihn tragen? Geplant ist eine analytische Maske für Wesen.
   - Setzkasten im Querformat: eine Zone pro Seite mit Stufenspalten (≤ 36 Wesen im Bild).
   - Größe der Wesen auf der Map: 0,48 × Stufenfaktor relativ zum Helden.
   - „Tippen“: Pink `#ff68a9`, 58 Design-px, Lage.
   - Die Loader-Zahl ist so klein wie im Mockup (≈ 10 px auf einem 393-px-Phone).
   - Der 3D-Held weicht in Farbe und Form vom 2D-Blob ab; nur die Größe ist angeglichen (`HERO_DOT_FIT` 0,9).
   - Farben aus dem PNG oder aus der AI-Datei? Gewählt wurde das PNG: Sterne 2–3 % größer, ® fetter, Bläschen teal statt weiß. Zurück zur AI-Version, indem man `PNG_COLORS`, `PNG_STOPS` und die Ausrichtung im Konverter entfernt.
   - Unter reduzierter Bewegung wächst der Stamm nicht streng linear.
2. **Nicht auf dem Gerät geprüft (B1):** ob der Übergang vom nativen Startbild zum Web-Loader ohne Sprung gelingt, ob `SplashScreen.hide()` feuert, und `cap sync ios`. Iteration 4 kam erst mit Sitzung 2 am 10-01 aufs iPhone; eine Prüfung dieser Punkte ist nicht belegt. [unsicher]
3. **Leistung der Möwe auf dem iPhone ungemessen.** Während des Flugs läuft der Schattenpass in jedem Bild.
4. **Möwe im Klassik-Modus:** sollte automatisch laufen, wurde aber nie gesehen.
5. **B5:**
   - Der Möwen-Drop soll beim Aufprall `r.reportCreature(v, 'spawn')` aufrufen, damit auch abgeworfene Wesen den „NEU!“-Stempel bekommen. Ob das in der Integration geschah: [unsicher]
   - Die Stempel-Klänge `'stamp'` und `'newCreature'` sind Platzhalter (B7).
   - Die Tintenschatten-Streifen am Kastenboden wurden nur bei Syrup und Luzz geprüft, nicht bei Tjorizo und Wooding.
   - Wer den Setzkasten öffnet, bevor das Vorwärmen fertig ist (≈ 6 s nach Kartenstart), bekommt einen langsameren ersten Aufbau.
   - `setzkasten.spec` mit der neuen Draw-Call-Prüfung (≤ 44) ist nie gelaufen; erneut laufen lassen mit `E2E_PORT=4205 node scripts/e2e.mjs e2e/setzkasten.spec.ts`.
6. **B4:**
   - Baumknoten 80–95 wackeln im gesperrten Zustand nicht, weil der Baum sie zeichnet.
   - Der Weg hat meist nur ≈ 3 Punkte, also 4 Hüpfer.
   - Ob `stageGround.homeSpot` (kennt kein Wasser) überall durch B5s `mapGround.ts` ersetzt wurde: Laut `9a6af80` ist „echter Boden“ eingebaut; Detailprüfung offen.
7. **E2E unter SwiftShader:**
   - Splash, REX-Lab, Werkstatt-Rundgang über das Landmarken-Lab und ein Schattentest laufen bei hoher Last in Zeitgrenzen; auf echter GPU laufen sie durch.
   - B4 meldete 3 ältere `flow.spec`-Tests mit 45-s-Timeout. Danach wurden die Fristen auf 90 s pro Übergang angehoben.
   - CI führt E2E nur wöchentlich oder auf Knopfdruck aus.
8. **Kosten von `warm()` unter SwiftShader:** Die Kartenpose wird vor 100 % verdeckt vorgerendert. Erwogen wurde, das Vorwärmen unter WebGL2 zu überspringen, falls CI zu langsam wird.
9. **Aufräumen:** Die Vorschau-Einträge für Port 5190 und 5191 in `.claude/launch.json` sollten am Ende entfernt werden. Erledigt? [unsicher]
10. Werkstatt „Alle Labs“ an `/lab/landmarks`: Die neue Ruine ist schwerer; Sitzung 2 sollte das im Blick behalten.

### Fehler, Fixes und Lehren
- **iOS-WebGL2-Schatten** (Sitzung 2, gemeldet 18:00, Fix `019cf25`):
  - Ursache: Aus `texture(depthTex).level(0)` erzeugt three r186 in GLSL `textureLod(…)` ohne `.x`, also vec4 statt float.
  - Das trifft nur den manuellen Tiefenvergleich. WebKit braucht ihn, weil `sampler2DShadow` dort immer 0 liefert.
  - Fix in `packages/render/src/shadow/filters.ts`: `textureLoad` (texelFetch, geklemmt). Neuer E2E „WebKit-Schattenpfad“ in `e2e/shadow.spec.ts`.
  - Im Simulator (iPhone 17e) ohne Shaderfehler geprüft. Neue Schalter in `docs/IOS.md`: `?shadowcompat=manual|hardware` und `CAP_SERVER_URL=… pnpm exec cap sync ios`.
  - Ein frisch gebooteter Simulator meldete einmal „WebGL Device Lost“.
  - Bezug zum offenen Bodenfehler aus Sitzung 1: derselbe Pfad. [unsicher]
- **Loader:** Während eines angekündigten Blocks überschrieb der Tick pro Bild das Compositor-Ziel. Fix: Der Stamm wächst jetzt weiter, während `FlowScene.mount` blockiert.
- **B2 Münzwurf:** Reines FNV `& 1` wechselte nur ab, deshalb ein gemischter Hash. `gullLaneValue` wählt den freiesten Korridor, weil Blobs den Schatten verdecken.
- **B4:** `swipeHint.ts` neben `SwipeHint.tsx` kollidiert auf dem case-insensitiven Dateisystem von macOS. Umbenannt in `swipeDirection.ts`.
- **Werkzeuge auf dem Mac:**
  - BSD-`sed` kennt `\b` nicht, also Python verwenden; auf dem Mac heißt es `sed -i ''`.
  - Konflikte in `main.tsx` per Python-Regex mit beiden Seiten gelöst.
- **E2E-Erfahrungen:**
  - Unter SwiftShader bei hoher Rechnerlast (Load 30–450) gibt es Timeouts und Seitenhänger bis 100 s; der Renderer startet manchmal nicht (Failsafe nach 30 s).
  - Eigene Dateiänderungen während eines Laufs lösen Hot Reloads aus und machen den Test kaputt. `docs/` liegt außerhalb der Vite-Wurzel und ist dafür sicher.
  - E2E nur auf ruhiger Maschine laufen lassen; echte GPU (`EE_GPU=1`) gilt als Referenz.
- **Messwerte:**
  - Boot auf echter GPU, ruhig: 4,62 s gesamt (bundle 1,08 · renderer 1,16 · mount 1,68 · creatures 2,90 · board 3,88 · chunks 4,16 · mapShaders 4,29 · frames 4,42); unter Last 11,4 s; SwiftShader-Failsafe nach 25 s.
  - Setzkasten: ≤ 36 Wesen im Bild, 12 animiert; Phone ≤ 30 dc, Desktop ≤ 38; 60 fps; öffnet in ≈ 22 ms.
  - Kontur-Abgleich mit dem PNG (IoU je Teil): ≥ 0,98; der ®-Ring allein 0,908.
  - Woff2-Untermenge: 230 Zeichen, 21 KB. Der Inline-Boot ist ≈ 2,5 KB, das HTML wächst um ≈ 28 KB.
  - Das Punktlicht des Logos wurde aus Florians vier Schattenstrahlen bestimmt: L = (−824,7, −375,6), alle Strahlen innerhalb 3,6 px.
- **Wackelnde Unit-Tests unter Last:** 5000-ms-Timeouts in core/render und Solver-Durchsatz 44 117 statt > 50 000.
- **Limit:** Das 5-Stunden-Limit ist gemeinsam für alle Sitzungen und Agenten, und Unteragenten laufen nach der Limit-Meldung weiter.
  - Lehre: rechtzeitig (≈ 97 %) eine Übergabedatei ins gemeinsame Memory schreiben, Agenten committen lassen und eine Übernahme-Frist vereinbaren (21:15).
- **Florians Entscheidungen:**
  - Lautlos-Schalter schaltet stumm.
  - Caprasimo statt Cooper Black.
  - Ein einziger iPhone-Deploy am Ende mit allem.
  - Eine Farbe `#081b25` für Startbild, Capacitor-Hintergrund, theme-color und html/body. [als Umsetzung von B1; ob Florian das ausdrücklich so wollte, ist unklar]

### Nur lokal auf dem Mac
- Agenten-Worktrees `.claude/worktrees/agent-*` mit Screenshots unter `docs/progress/iter4-*` (zum Teil wohl gemergt).
- `memory/handoff-loader-intro.md` im Mac-Memory.
- Uncommittete Änderungen im Haupt-Checkout am 09-30 17:24: `.claude/launch.json` sowie `e2e/shadow.spec.ts`, `canvas/rendererSingleton.ts` und `shadow/filters.ts` aus Sitzung 2. Letztere drei gingen in `019cf25` ein. `launch.json` bleibt [unsicher].

---

## Offene Punkte gesamt (dedupliziert, nach Dringlichkeit)

1. **Boden der Karte fehlt in der nativen iOS-App** (Safari geht).
   - Ungelöst und nicht reproduziert.
   - Nächster Schritt: Konsole per Safari-Web-Inspektor auslesen, `isSecureContext` und `!!navigator.gpu` prüfen, `?backend=webgl` in Safari testen. Optional eine In-Game-Anzeige für GPU- und Shaderfehler bauen; die kommt erst per `ios:device` vom Mac aufs Telefon.
   - Verdächtig: WebGL2/WebKit-Schattenpfad (`shadow/*`, `webglCompat.ts`, `filters.ts`), Gelände-Chunks `f6a26c1`, Größe des Boden-Shaders.
2. **Lokale, nicht gepushte Arbeit auf Florians Mac:** `main` HEAD `b116346`, 6 Commits, dirty (Stand 10-01 15:30 UTC). Klären, was drin ist, und pushen oder verwerfen. Nach GitHub-Stand auch klären, ob R4 (Leistung) und W4 (Klippe) aus „Karte v5“ je fertig wurden.
3. **Plan „Wesen-Baukasten v4“: Freigabe ausstehend** (ExitPlanMode in Sitzung 1). Danach Phase P0. Offen sind außerdem Florians Wahl des KI-3D-Dienstes (Konto, Kosten, Lizenz) und die kleinen Entscheidungen (3 oder 4 Lichtstufen, Jelly opak, Lippen).
4. **Schatten und 60 fps auf dem iPhone:** Der Schattenkern von Karte v5 ist auf `main`, aber nicht am Gerät abgenommen. Das Messprotokoll `docs/progress/karte-perf-iphone16.md` (R4.1–R4.7) ist unausgefüllt. Die Rückfrage „wann wackelt es am stärksten“ ist offen.
5. **Draw-Call-Budget der Karte:**
   - `unendlich-webgpu.spec` war rot (107 > 100); ob das Culling `f6a26c1` das löst, ist ungeprüft.
   - Riesenbaum und Geschwister in gemeinsame Meshes zusammenlegen.
   - Ein `If` im Wasser-Shader statt `mix`.
   - Der Mobil-Hänger von 1,2–1,4 s nach Preset oder Start.
6. **Welten:**
   - Welt 13: gestreifter Spalt am Monolithen bei Knoten 104, Plateau und Wolken weichen von der Vorlage ab.
   - Welt 14: Silhouette, Baumzahl, Kräusel (37° auf der Karte), helle Windbäume am Pfad.
   - Nachschärfen der Welten 01–06, 08, 09: Bergung in Phase 0 ist auf Vollständigkeit ungeprüft.
7. **Iteration 4, Entscheidungen für Florian:**
   - Möwenschatten dunkler oder von Blobs getragen;
   - Setzkasten im Querformat;
   - Größe der Map-Wesen;
   - Farbe und Größe von „Tippen“;
   - Größe der Loader-Zahl;
   - 3D-Held gegenüber 2D-Blob;
   - Farben aus PNG oder AI-Datei.
8. **Iteration 4, technische Reste:**
   - Leistung der Möwe auf dem iPhone und Möwe in Klassik;
   - Aufruf von `reportCreature` beim Möwen-Drop;
   - Platzhalter-Klänge für die Stempel;
   - Baumknoten 80–95 ohne Wackeln;
   - Weglänge;
   - Tintenschatten-Streifen am Setzkasten in Tjorizo und Wooding;
   - Übergang Startbild → Loader ohne Sprung, `SplashScreen.hide()` und `cap sync ios` am Gerät prüfen.
9. **App für Freundin und Tester:** Apple-ID-Provisionierung (7 Tage, ≤ 10 Geräte) oder TestFlight (Apple Developer Program, 99 €/Jahr; auch für „Nicole“). Florian muss entscheiden; danach Gerät anschließen oder Upload einrichten.
10. **Teststabilität:**
    - E2E unter SwiftShader (Splash, REX, Werkstatt/Landmarken, Schatten, `flow.spec`) und `flow.spec:166` sind wackelig;
    - `bodyMesh.test.ts` hat ein 5-s-Timeout; der Solver-Durchsatz-Test scheitert unter Last;
    - die neue Draw-Call-Prüfung (≤ 44) in `setzkasten.spec` ist nie gelaufen.
11. **Aufräumen:** Vorschau-Einträge 5190 und 5191 in `.claude/launch.json`; Worktrees `merge-verlaeufe`, `integ-welten`, `iter4-*` und `agent-*` auf dem Mac. [Status unbekannt]
12. Die Rate-Limits (Woche) beider Konten bzw. Sitzungen werden am **2026-10-06 08:00 UTC** zurückgesetzt.

## Lehren gesamt (dedupliziert)

**Rendering und Plattform**
- **iOS-App ≠ Safari:** Die App läuft unter `capacitor://localhost` (kein HTTPS), vermutlich also mit WebGL2 statt WebGPU. Fehler „nur in der App“ deshalb zuerst im WebGL2/WebKit-Pfad suchen (`?backend=webgl`, `?shadowcompat=manual`).
- In WebKit liefert `sampler2DShadow` immer 0. Der manuelle Tiefenvergleich muss `textureLoad`/texelFetch nutzen; three r186 erzeugt `textureLod` ohne `.x` (`019cf25`). „WebKit `textureLoad` bleibt.“
- Ein kaputter Schattenvergleich auf iOS färbt den Boden in Tinte `#081b25`, die zugleich Hintergrundfarbe ist. So „verschwindet“ der Boden.
- Auf dem Gerät gibt es bisher keine Sicht auf GPU-Fehler. Gebraucht werden der Web-Inspektor (Debug-Builds) oder eine eigene Fehleranzeige im Spiel.
- In der iOS-App sind höchstens 60 fps möglich (WebKit).
- Die Cloud hat keine GPU: WebGPU rendert dort gar nicht, WebGL nur in Software. Benchmarks und Optik lassen sich nur auf Mac oder iPhone beurteilen.

**Schatten und Licht**
- Ursachen für wackelnde, stufige, nachziehende Schatten:
  - Refit der Kaskaden in jedem Bild (Kanten rutschen um Bruchteile eines Pixels);
  - flache 10°-Sonne zieht Texel lang;
  - kleine Karten auf dem iPhone;
  - verzögerte Aktualisierung.
- Gegenmittel: feste, pixelgenau eingerastete Karte, Slide statt Refit, nur den Randstreifen nachzeichnen, höhere Auflösung, Aktualisierung in jedem Bild.
- **Florian lehnt aufgelegte oder Decal-Schatten ab.** Die Sonne bleibt kameragebunden (10°/70°).
- **Bandsplitter** der Lichtstufen bei tiefer Sonne (Welt 14) sind keine Risse. Abhilfe: Kompositionssonne auf ~15° oder die Form runden.
- Windbäume ohne Schlagschatten, sonst entsteht bei tiefer Sonne ein Astnetz.
- Der Möwenschatten verschwindet unter Blobs, weil diese keine Schatten empfangen.

**Leistung und Draw Calls**
- Draw Calls per Hook auf `renderer.info` messen, nicht am Perf-Badge. Erst nach dem Brett-Warmup messen, das allein ≈ 20 Calls kostet; Median und Max über 10 Bilder.
- Culling über die Horizont-Formel `acos(R/(R+H))` pro großem Objekt. Ferne Helden und Schattenproxies abschalten. Jede neue Art kostet Hauptpass plus Kaskaden (z. B. `pillar` +3).
- Den Schatten-Fit auf Chunk-Dreiecken statt am Rauschfeld abbilden: 7 auf 1,1 ms pro Bild. Erstbefüllung und Chunk-Aufbau auf mehrere Bilder verteilen.
- Shader: Verzweigen statt `mix`, wenn ein Zweig teuer ist (Meer in Seen und Flüssen, ≈ 16 Hashes pro Fragment).
- Für das Wesen-System:
  - Draw Calls dürfen nicht mit der Vielfalt wachsen; deshalb Slot-Arena und Zustand als DataTexture.
  - `BatchedMesh` (r186) zeichnet pro Instanz.
  - Der Uniform-Block liegt an der 16-KB-Grenze.

**Werkzeuge und Arbeitsweise**
- JSON-Inhalte nicht per `json.dumps` neu schreiben, das formatiert die ganze Datei um. Gezielt Zeilen ersetzen.
- macOS:
  - BSD-`sed` (kein `\b`, `-i ''`) → Python verwenden;
  - case-insensitives Dateisystem: Dateinamen dürfen sich nicht nur in der Groß- und Kleinschreibung unterscheiden.
- Cloud:
  - die Playwright-Version passt nicht → `executablePath` auf das vorinstallierte Chromium;
  - Screenshot-Timeouts wegen Fonts → DPR 1;
  - alte Chromium-Prozesse beenden;
  - Node 22 reicht für `pnpm install --frozen-lockfile`.
- E2E nur auf ruhiger Maschine. SwiftShader unter Last führt zu Timeouts, Failsafes und Hängern. Während eines Laufs keine Dateien im Vite-Root ändern (Hot Reload). Echte GPU mit `EE_GPU=1` als Referenz.
- CI ist bewusst sparsam: pro Push nur Typen, Unit-Tests, Lint und Build; E2E wöchentlich oder auf Knopfdruck (`f36dfb4`).
- Vorschau-Tool: selbstsigniertes HTTPS geht nicht → HTTP-Konfiguration „game-dev-http“ auf 5174. Florians Server: `https://localhost:5173`, im LAN `https://192.168.1.55:5173`.
- iOS-Deploy: `IOS_TEAM_ID=R67BLW649H IOS_DEVICE="eyePhone (2)" pnpm --filter @ee/game ios:device`. Das iPhone muss entsperrt sein, sonst klappt nur die Installation, nicht der Start. Simulator vom Dev-Server: `CAP_SERVER_URL=… pnpm exec cap sync ios`.
- Ein Hash wie FNV `& 1` liefert schlechte Bits, deshalb mischen.

**Mehrere Sitzungen und Limits**
- Das 5-Stunden-Limit ist gemeinsam für alle Sitzungen und Unteragenten, und Agenten laufen nach der Limit-Meldung weiter. Bei ≈ 90–97 % eine Übergabedatei schreiben (Stand, Dateien, nächster Schritt, uncommittete Änderungen) und Agenten committen lassen.
- Das Wochenlimit gilt pro Konto; auch die Cloud verbraucht es.
- Parallele Sitzungen:
  - Bereiche sperren und Pausen bestätigen;
  - vor jedem Merge `git pull --ff-only`;
  - über einen eigenen Worktree mergen;
  - einen einzigen iPhone-Deploy am Ende abstimmen;
  - uncommittete Stände Datei für Datei melden.
- Florians Ansagen gelten über Sitzungen hinweg („alles fertig machen, dann alles aufs iPhone“). Sie sind in Memory-Dateien auf dem Mac festzuhalten.

**Florians Entscheidungen (Look, Gameplay, Plattform)**
- **Stil:** Earle-Siebdruck mit harten Lichtstufen, keinen Konturen und Verlauf nur innerhalb von Flächen.
- **Wesen:** Look „Brücke“. Kein Pilot, zuerst eine modulare Architektur, in der „jedes maul auch mit jedem fell und muster“ kombinierbar ist.
- **Schatten:** echte Schatten über das Gelände, scharf wie bei Earle, bei konstant 60 fps. Keine Decals, die Sonne bleibt.
- **Karte:** „Karte v5“ freigegeben (Route 15 + 1, 184 Level, Makroformen, Klippe/Aufzüge/Brücken). Welten 11–14 nach seinen Lieblingsbildern Ebene 20, 7, 45 und 29.
- **Iteration 4:** Loader mit Möwe und Blob-Fall, Möwe als Spawner, Intro direkt in Level 1, echter und freier Modus, Setzkasten mit 253 Wesen, Klassik-2048 mit 7 Formaten, Caprasimo, Lautlos-Schalter schaltet stumm.
- **Plattform:** iPhone-first (iPhone 16 „eyePhone (2)“, Mac M3). Tests mit Freundin und Nicole gewünscht (TestFlight erwogen).
