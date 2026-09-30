# iPhone-App (Capacitor) — Installation, Glas-HUD, Haptik, Werkstatt, Ton

Stand 2026-09-29 (Werkstatt, Labs und Editoren in der App: 2026-09-30, Abschnitt 7; Ton und Stummschalter: Abschnitt 8). Die App-Hülle liegt in `apps/game/ios` (Capacitor 8.5, SPM, iOS-27-SDK/Xcode 27). Das Spiel selbst ist das Web-Bundle aus `apps/game/dist`; es läuft in der WKWebView, darüber schwebt ein **natives SwiftUI-HUD in Liquid Glass** (eigenes Plugin `apps/game/plugins/liquid-glass`).

## 1. Auf Florians iPhone installieren (ohne Developer-Programm, mit Apple-ID)

Einmalig:

1. **Xcode 27** öffnen → `Xcode ▸ Settings… ▸ Accounts` → `+` → mit der Apple-ID anmelden. Es erscheint ein **Personal Team** (kostenlos; Apps laufen damit 7 Tage, dann neu installieren — TestFlight kommt später, siehe unten).
2. Im Terminal: `pnpm install` (einmalig), dann `pnpm --filter @ee/game ios:device`. Ohne `IOS_TEAM_ID` baut das Skript das Web-Bundle, synchronisiert (`cap sync ios`) und öffnet das Xcode-Projekt.
3. In Xcode links das Projekt **App** wählen → Target **App** → Tab **Signing & Capabilities** → „Automatically manage signing“ an → **Team** = das Personal Team. Die Bundle-ID `com.illudiy.earlyearle` ist frei; falls Xcode meckert, hinten eine Zahl anhängen (z. B. `com.illudiy.earlyearle2`) — nur im Personal Team nötig.
4. **iPhone per Kabel** anschließen, entsperren, „Diesem Computer vertrauen“ antippen. Auf dem iPhone `Einstellungen ▸ Datenschutz & Sicherheit ▸ Entwicklermodus` einschalten (Neustart).
5. In Xcode oben das iPhone als Ziel wählen und **▶ Run** (⌘R). Beim ersten Start blockt iOS: auf dem iPhone `Einstellungen ▸ Allgemein ▸ VPN & Geräteverwaltung ▸ <Apple-ID> ▸ Vertrauen`, dann die App erneut öffnen.

Danach jederzeit aktualisieren: `IOS_TEAM_ID=<10-stellige Team-ID> pnpm --filter @ee/game ios:device` baut signiert, installiert per `devicectl` auf dem gekoppelten iPhone und startet die App (Team-ID: Xcode ▸ Settings ▸ Accounts ▸ Team anklicken). Oder in Xcode einfach wieder ⌘R.

Simulator (ohne Apple-ID): `pnpm --filter @ee/game ios:sim` — baut Web-Bundle, `cap sync`, `xcodebuild` für „iPhone Air“ (andere: `IOS_SIM_DEVICE="iPhone 17 Pro"`), installiert und startet. `--skip-web` überspringt den Vite-Build.

Icons/Launch-Bild neu erzeugen (aus `assets/ref-florian/02-splashscreen-illudiy-i.png`): `pnpm --filter @ee/game ios:icons`.

**TestFlight (später):** braucht das Apple Developer Program (99 $/Jahr). Dann: Archive in Xcode (Product ▸ Archive) → Distribute → TestFlight; Uploads müssen mit Xcode 26+/iOS-26-SDK gebaut sein (erfüllt). Nicole bekommt dann eine Einladung per E-Mail und die App über die TestFlight-App, ohne Kabel, 90 Tage gültig.

## 2. Was das Plugin `LiquidGlass` macht

`apps/game/plugins/liquid-glass` (Swift, SPM, wird von `cap sync` automatisch in `ios/App/CapApp-SPM/Package.swift` eingetragen; JS-Name `LiquidGlass`, Swift-Klasse `LiquidGlassPlugin`).

- Ein **`UIHostingController` mit SwiftUI-HUD** wird als Child des Capacitor-`CAPBridgeViewController` über die WKWebView gelegt. Ein `PassthroughView` lässt nur Berührungen **innerhalb der Glas-Elemente** durch (Frames kommen per `onGeometryChange` aus SwiftUI); alles andere erreicht die WebView — Wischen auf dem Spielfeld und Planet-Drehen funktionieren wie im Browser.
- **iOS 26+:** `glassEffect(.regular.tint(zonenfarbe).interactive(), in: Capsule())` in einem `GlassEffectContainer`; die Pillen tragen `glassEffectID`s und **morphen** zwischen Map („Spielen“) und Level („Zurück / Neu / Map“). Tönung = Zonenfarbe (Map Himmel-Türkis, Level Khaki, Hauptaktion Pink), Schrift schwarz-fett, **keine Konturen**; Ziel-Chips und die REX-Zeile sind Papierkarten mit hartem Versatzschatten in Sonnenrichtung (wie das CSS-HUD).
- **iOS 16–18:** gleiches Layout mit `regularMaterial` (Blur, UIVisualEffectView).
- **Schrift:** Die große Zahl der Pille (Züge bzw. Punkte) und ein rein numerischer Titel (z. B. „2048“) stehen in **Caprasimo** (wie `--font-heavy`/'EE Heavy' im Web; OFL, im Paket unter `ios/Sources/LiquidGlassPlugin/Fonts/` mit `OFL.txt`, `resources: [.copy("Fonts")]` in `Package.swift`, registriert in `LiquidGlassPlugin.load()` per `CTFontManagerRegisterFontsForURL`, `Font.custom("Caprasimo-Regular", size:, relativeTo:)`, Dynamic Type bis XXL). Darunter die Beschriftung `movesLabel` (Vorgabe „ZÜGE“, Klassik „PUNKTE“). REX-Zeile, Ziele und Pillen bleiben in der Systemschrift.
- **Knopfleiste (eine Entscheidung für die ganze Reihe, nie „…“):** passen alle Beschriftungen, stehen sie da (`iconOnly`-Pillen sind Kreise). Sonst behält die Hauptaktion („Spielen“, „Nochmal“) ihre Beschriftung und alle anderen Pillen werden runde Symbol-Pillen; Innenabstand, Lücken (nie unter 11 pt, der Glas-Container verschmilzt ab 10 pt) und Kreise werden stufenweise enger (48 → 44 pt). Ohne Hauptaktion (die vier Level-Knöpfe) teilen sich gleich breite Symbol-Pillen die Reihe. Map auf 393 pt: „Spielen“ + Setzkasten + Klassik + Ton + Werkstatt in einer Reihe (46-pt-Kreise, 11 pt Lücke).
- **Web/Android:** `isAvailable()` → `available: false`; das CSS-Glas-HUD in `FlowHud.tsx` bleibt.

API (`apps/game/src/native/liquidGlass.ts` kapselt sie mit `useNativeGlass()`, `syncNativeGlass()`, `useNativeGlassActions()`, `useNativeGlassLayout()`):

| Methode / Event | Bedeutung |
|---|---|
| `isAvailable()` → `{ available, glass, platform, version }` | `glass: true` = echtes Liquid Glass (iOS 26+) |
| `show({ top: { title, subtitle, moves, movesLabel?, goals[] }, actions: [{ id, label, icon?, primary?, disabled?, tint?, iconOnly? }], rex?, tint?, accent? })` | Zustand setzen und einblenden; `movesLabel` = Beschriftung unter der großen Zahl (Vorgabe „ZÜGE“); `iconOnly` = runde Symbol-Pille (Label nur für VoiceOver), z. B. der Werkstatt-Schlüssel, Setzkasten, Klassik; `tint` = eigene Glastönung der Pille |
| `update({...})` | Teil-Update (nur vorhandene Schlüssel, `null` löscht), Pillen morphen |
| `hide()` | ausblenden (Splash/Hüpfer) |
| `setSafeInsets({ top, bottom })` | zusätzliche Ränder in CSS-px |
| Event `action` `{ id }` | Tipp auf eine Pille (`play`, `rewind`, `restart`, `map`, `sound`, `werkstatt`, Karten-Einstiege wie `collection`, `classic`); nativ mit leichtem Haptik-Tick; der Web-Teil entsperrt vorher den Ton und tinkt (Abschnitt 8) |
| Event `layout` `{ top, bottom, safeTop, safeBottom, glass, line, actions }` | Höhen in CSS-px, damit Web-Elemente ausweichen können; `line` (REX-Sprechblase) und `actions` (Knopfleiste) als Rechtecke, REX schaut über `line` (`nativeGlassLayout()` in `src/native/liquidGlass.ts`) |

`FlowHud.tsx` spiegelt den Store (Levelname, Züge, Ziele, REX-Zeile, Aktionen) per JSON in das Overlay und blendet dabei die eigenen CSS-Pillen aus; `icon` sind SF-Symbol-Namen.

## 3. Haptik

`@capacitor/haptics`, verdrahtet in `apps/game/src/native/haptics.ts` (Store-Abonnement, `bus`-Ereignis `animationDone` optional): leichter Impact beim Ende des Rutschens (140 ms nach dem Zug, wie `LevelBoard`), mittlerer Impact beim Verschmelzen, Erfolgs-Notification bei Sieg, Warnung bei Niederlage, weicher Tick beim Rückspulen. Im Browser passiert nichts.

## 4. PWA-Fallback (Safari „Zum Home-Bildschirm“)

`apps/game/public/manifest.webmanifest` + Icons in `public/icons/` + `apple-mobile-web-app-*`-Metas in `index.html`. Auf dem iPhone `https://<Mac-IP>:5173` öffnen → Teilen → „Zum Home-Bildschirm“: läuft randlos mit Ink-Statusleiste, aber ohne natives Glas und ohne Haptik (WebGPU ja, weil HTTPS).

## 5. Stand der Verifikation (Simulator iPhone Air, iOS 27, 2026-09-29)

`pnpm --filter @ee/game ios:sim` baut und startet; Screenshots in `docs/progress/p6b-ios-home.png` (Splash), `p6b-ios-map-glass.png` (Map mit Glas-Pille, „Spielen“, REX) und `p6b-ios-level-glass.png` (Level: khaki Pille, „Zurück“ deaktiviert, „Neu“, „Map“). Geprüft: Tipp auf die native „Spielen“-Pille löst den Fly-in aus (`action`-Event), die Pillen morphen zwischen Map- und Level-Zustand, ein Wisch auf dem Brett geht durch das Overlay an die WebView (Level 1 wurde damit gewonnen, Aufbruch, Map bei Level 2). Bridge-Log der Sitzung: `LiquidGlass isAvailable → addListener → show → update…`, nach dem Wisch `Haptics impact` (Rutsch-Ende), `impact` (Verschmelzen), `notification` (Sieg). Das Web-Bundle läuft im Simulator über WebGL2.

Noch nicht geprüft (braucht das Gerät + Apple-ID): Signatur/Installation auf dem iPhone, WebGPU in der WKWebView, echte Haptik, 120-Hz-Glas über 60-fps-Canvas, Wärme/Langzeit.

## 6. Bekannte Grenzen

- **WKWebView ist auf dem iPhone auf 60 fps begrenzt** (WebKit-Bug 294338); das native Glas-Overlay animiert mit 120 Hz. Private Workarounds verstoßen gegen App-Review 2.5.1 — nicht vorgesehen.
- **WebGPU nur auf dem Gerät** (iOS 26+). Der Simulator meldet WebGL2 (Perf-Badge zeigt das Backend), Glas-HUD und Haptik lassen sich dort trotzdem prüfen (Haptik nur sichtbar in der Konsole, der Simulator vibriert nicht).
- **Schatten im WebGL2-Fallback von WebKit:** Vergleichs-Sampler (`sampler2DShadow`) liefern dort immer 0. Die Filter erkennen das beim Start (`packages/render/src/shadow/webglCompat.ts`) und lesen die Tiefe manuell (`texelFetch`, Vergleich im Shader). Im Browser erzwingt `?backend=webgl&shadowcompat=manual` diesen Pfad, `=hardware` den Vergleichs-Sampler. Der E2E-Test „WebKit-Schattenpfad“ in `e2e/shadow.spec.ts` hält ihn fehlerfrei.
- **Diagnose mit Live-Code im Simulator:** `CAP_SERVER_URL=http://127.0.0.1:5199/play pnpm exec cap sync ios` (in `apps/game`, Dev-Server auf diesem Port), danach nativ bauen und installieren. Die App lädt dann vom Dev-Server, mit HMR und URL-Parametern, die Konsole gibt `xcrun simctl launch --console-pty "iPhone 17e" com.illudiy.earlyearle` aus. Zurück zum Bundle: `pnpm exec cap sync ios` ohne die Variable (`ios:sim` und `ios:device` machen das ohnehin).
- Ein frisch gebooteter Simulator kann SpringBoard verlieren („The system shell probably crashed“) oder der WebView beim ersten Start den WebGL-Kontext („Device Lost“). Dann den Simulator neu booten und die App ein zweites Mal starten, der Fehler kommt dann nicht aus der App.
- Personal-Team-Builds laufen 7 Tage; danach neu installieren (⌘R). Maximal 3 Apps pro Personal Team, 10 Geräte.
- Das Overlay kennt keine Sheets/Booster-Leiste — kommen, sobald das Spiel sie hat (gleiches Plugin, weitere Elemente).
- Der Dev-Streifen unten links (nur `pnpm dev`) liegt im Web-Layer und kann die nativen Pillen auf sehr schmalen Geräten berühren; im Release-Bundle gibt es ihn nicht.
- Werkstatt-Grenzen: siehe Abschnitt 7.

## 7. Werkstatt: Labs und Editoren in der App

Stand 2026-09-30. Die App hat keine Adresszeile — deshalb gibt es die **Werkstatt** (`/werkstatt`, auch unter `/lab`): alle Labs und Editoren mit deutschem Namen und einer Zeile Beschreibung, das Speicherziel und der Weg zurück ins Spiel.

**So kommst du hin**

- **Auf der Map** rechts neben „Spielen“ und „Ton“: die runde Glas-Pille mit dem **Schraubenschlüssel** (nativ, SF Symbol `wrench.and.screwdriver.fill`; im Browser ein gleich großer Glasknopf). Im Level ist sie ausgeblendet.
- **Direkt per Link** (Safari, Notizen, Kurzbefehle, Home-Bildschirm-Kurzbefehl): `earlyearle://werkstatt`, `earlyearle://lab/earle?world=08`, `earlyearle://editor/levels?file=003.json`, `earlyearle://play`. Im Simulator: `xcrun simctl openurl booted earlyearle://werkstatt`.
- **Zurück**: jede Lab-/Editor-Seite hat oben links **„◀ Werkstatt“** (pink) und daneben den **Planeten** = zurück ins Spiel (Map). In der Werkstatt ist „Zurück zum Spiel“ der erste, größte Knopf. Der Level-Editor hat oben links nur den Pfeil (zur Werkstatt), weil seine Kopfzeile schon voll ist.
- Ausblenden für einen späteren Store-Build: `VITE_WERKSTATT=0`. In einem statischen Web-Build ist sie aus, außer `VITE_WERKSTATT=1`.

**Labs auf dem iPhone (Regler als Bottom-Sheet)**

- Die Regler hängen nicht mehr über der Ansicht: unten liegt ein **Sheet mit Griff**, beim Öffnen eines Labs **zu**. Die Bühne (Canvas) endet immer über dem Sheet.
- **Tippen** auf „Regler ▴“ öffnet **halb** (die Bühne schrumpft auf die obere Hälfte, alles bleibt sichtbar), **Hochziehen** am Griff öffnet **voll** (überdeckt dann die Bühne, die Kopfzeile mit „Werkstatt“ bleibt frei), Runterziehen schließt. Tippen auf den Griff schaltet zu → halb → voll → zu. Der Zustand gilt pro Lab bis zum Schließen der App.
- In der Leiste daneben liegen die **Schnellaktionen** (wischbar), die auch bei geschlossenem Sheet erreichbar sind: Spielfeld-Lab „Zurück/Neu“, Blob-Lab „Squash/Ripple/Verschmelzen“, Genom-Lab „Zufall/Poke“, Schatten-Lab „Alt | Neu“, REX-Lab alle Animationen.
- Große Touch-Ziele (≥ 44 pt), eckige Schieber mit Papier-Griff, 16-px-Eingaben (kein Zoom beim Tippen), Safe Areas oben/unten.
- **Desktop** (≥ 900 px breit, auch Handy quer): die Regler sind eine **Seitenleiste rechts**, „ausblenden ▸“ klappt sie weg, „◂ Regler“ in der Kopfzeile holt sie zurück.
- Links für Screenshots: `?sheet=zu|halb|voll`, `?panel=zu`.

**Speichern: direkt auf den Mac oder lokal**

1. Auf dem Mac den HTTP-Dev-Server starten: `pnpm --filter @ee/game dev:http` (Port 5174, im ganzen WLAN erreichbar; HTTPS auf 5173 geht aus der App nicht — selbst signiertes Zertifikat).
2. iPhone im **gleichen WLAN**. Fragt iOS beim ersten Verbinden nach **„Lokales Netzwerk“** → erlauben (später: `Einstellungen ▸ early earle ▸ Lokales Netzwerk`).
3. In der Werkstatt steht oben das **Speicherziel**: „Mac verbunden · <Mac-Name>“ (grün) oder „Mac nicht erreichbar“ (rost). Die **Mac-Adresse** ist dort einstellbar (Standard `http://192.168.1.55:5174`, nur IP reicht: Port 5174 wird ergänzt; „Übernehmen“). **„Testen“** pingt den Mac und schreibt und löscht eine Wegwerfdatei (`content/genome/_werkstatt-test.json`) — „✓ Schreiben geht“ heißt: Speichern klappt. `earlyearle://werkstatt?test=1` macht das beim Öffnen.
4. **Verbunden:** Level-, Wesen- und Map-Editor schreiben direkt nach `content/` auf dem Mac (gleicher Dev-Endpunkt `/__content/...` wie im Browser, mit Validierung). Hinweis „Gespeichert auf dem Mac“.
5. **Nicht erreichbar:** gespeichert wird **lokal auf dem iPhone** („Lokal gespeichert“, der Speicher-Knopf ist dann khaki statt türkis/pink). Lokale Stände überstehen Neustarts. **„Teilen“** öffnet das iOS-Teilen-Blatt mit der JSON-Datei (AirDrop an den Mac, Dateien, Mail). Sobald der Mac wieder erreichbar ist, lädt der Editor den lokalen Stand als „ungesichert“ — **Sichern** bringt ihn auf den Mac (bei abweichendem Stand auf dem Mac mit Rückfrage).

Technik: `apps/game/src/editor/content/` (`target.ts` Speicherziel + Verbindungstest, `local.ts` lokale Stände, `share.ts` Teilen über `@capacitor/share` + `@capacitor/filesystem`), der Dev-Endpunkt `apps/game/vite-plugins/contentApi.ts` antwortet mit CORS für `capacitor://localhost` (nur App-Origins, keine fremden Seiten), `GET /__content` ist der Ping, Unterordner wie `zones/worlds` sind erlaubt. `Info.plist`: `NSAppTransportSecurity ▸ NSAllowsLocalNetworking` (HTTP im LAN), `NSLocalNetworkUsageDescription`, URL-Schema `earlyearle` (`CFBundleURLTypes`, `@capacitor/app`).

**Die Editoren auf dem iPhone**

- **Level-Editor** (schon iPhone-first): Status unter dem Levelnamen zeigt das Ziel („Auf dem Mac“ / „Lokal gespeichert“ / „Stand der App“), Reiter „Datei“: „Auf den Mac sichern“ bzw. „Lokal sichern“, „Teilen“.
- **Wesen-Editor**: Vorschau oben mit wischbarer Vorschau-Leiste (Galerie/Einzeln/Vergleichen/Bewegung, Stufen als Auswahl), darunter eine Aktionszeile (Rückgängig, Wiederholen, Speichern, Teilen), Zonen und Bereiche als je eine wischbare Zeile.
- **Map-Editor** (neu): die zehn Welten (`content/zones/worlds/NN.json`) und vier Zonen als Liste mit Farbstreifen; pro Datei ein flaches **Serigrafie-Plakat** der Palette (Himmelsbänder, Sonne, Hügel, Nebelstreifen, Kuppelbäume mit Sonnenpunkten), Reiter **Farben** (Antippen öffnet die iOS-Farbwahl), **Werte** (Hügel, Bäume, Nebel, Kamera), **Text**, **JSON**. Ungesicherte Änderungen bleiben auf dem Gerät; „Im Earle-Lab“ öffnet die Welt im Lab.

**Geprüft im Simulator (iPhone Air, iOS 27, 2026-09-30)**

- Native Map-Leiste „Spielen · Ton · 🔧“ (runde Glas-Pille, die Beschriftungen bleiben), Werkstatt, Labs mit Sheet (zu/halb/voll, Safe Areas), alle drei Editoren; die Editoren laden vom Mac („Auf dem Mac“).
- Von `capacitor://localhost` zum Dev-Server: Ping, CORS-Preflight, `PUT` und `DELETE` — gegen `127.0.0.1:5186` und gegen eine LAN-IP (`192.168.1.55`, Test-Server): „Mac verbunden · ✓ Schreiben geht“, also ATS mit `NSAllowsLocalNetworking` in Ordnung. Auf dem echten iPhone kommt ggf. noch die Frage nach „Lokales Netzwerk“ dazu (nicht im Simulator prüfbar).
- Screenshots: `docs/progress/werkstatt-app-*.png` (Simulator), `werkstatt-handy-*.png` (393 × 852), `werkstatt-desktop-*.png`.
- Test-Builds ohne Tippen: `VITE_START_ROUTE="/werkstatt?test=1|/lab/earle?sheet=halb"` (mehrere Routen im Wechsel, `VITE_START_TOUR_MS`) und `VITE_MAC_URL=http://127.0.0.1:5186` vor `ios:sim` — `xcrun simctl openurl` fragt im Simulator erst „In ‚early earle‘ öffnen?“.

**Bekannte Grenzen**

- Die Labs und Editoren im App-Bundle zeigen den **Stand der letzten Installation**; was du auf dem Mac speicherst, sieht die App erst nach dem nächsten `ios:device` (die Editoren selbst laden die Dateien aber frisch vom Mac, solange er erreichbar ist). Im Browser gegen den Dev-Server lädt Vite sofort neu.
- Ohne Verbindung sieht das Earle-Lab lokale Änderungen aus dem Map-Editor nicht (es liest die gebündelten Welten).
- Lokale Stände liegen im Web-Speicher der App (localStorage). Er übersteht Neustarts und Updates, gilt aber nicht als Backup (iOS kann ihn bei Speichermangel leeren, Löschen der App löscht ihn) — Wichtiges per „Teilen“ auf den Mac schicken oder mit Verbindung sichern.
- Der Dev-Endpunkt existiert nur, solange `pnpm dev`/`dev:http` auf dem Mac läuft; Florians laufender Server braucht nach dem Merge einen **Neustart** (CORS für die App kommt aus der Vite-Konfiguration des Plugins).
- Das REX-Lab zeigt seine iPhone-Vorschau (393 × 852) in echter Größe; auf dem iPhone selbst scrollt die Bühne dafür.

## 8. Ton

Stand 2026-09-30 (Iteration 4). Alle Klänge sind prozedural (Web Audio in der WebView, keine Aufnahmen); Übersicht und Hörproben: `/lab/audio` (in der App: Werkstatt ▸ Audio-Lab), `docs/progress/audio/*.m4a`.

**Der Stummschalter schaltet das Spiel stumm — mit Absicht.** Die App benutzt die Audiosession **ambient** (`AppDelegate.swift`: `AVAudioSession.setCategory(.ambient, options: [.mixWithOthers])`, im Web-Code zusätzlich `navigator.audioSession.type = 'ambient'`). Das ist das Verhalten der meisten Spiele und so von Apple vorgesehen: Steht das iPhone auf Stumm (Seitenschalter bzw. Aktionstaste „Stumm“), ist das Spiel still; Musik oder Podcasts aus anderen Apps laufen unter dem Spiel weiter. Entscheidung Florian (2026-09-30): so bleibt es, keine eigene Einstellung.

**„Kein Ton auf dem iPhone“ — so prüfen**

1. **Stumm?** Kontrollzentrum bzw. Seitenschalter: steht das iPhone auf Stumm, ist das Spiel still (gewollt, siehe oben).
2. **Lautstärke**: im Spiel die Lautstärketasten drücken (regeln die Medienlautstärke). Bluetooth-Kopfhörer verbunden? Dann kommt der Ton dort.
3. **Ton-Pille** im Spiel: Lautsprecher ohne Schrägstrich (der Zustand bleibt gespeichert, `localStorage` `ee.audio.v1`).
4. **Audio-Lab** (Werkstatt ▸ Audio-Lab), Statuszeile **„Kontext …“**:
   - `running` → die Engine läuft. Ist trotzdem nichts zu hören, liegt es an Stumm, Lautstärke oder Ausgabegerät (Web Audio kann den Stummschalter nicht abfragen: iOS schaltet nur die Ausgabe ab, der Kontext meldet weiter `running`).
   - `suspended`, `interrupted` oder `none` → einmal irgendwo tippen (die Engine wartet dann auf den nächsten Tipp). Bleibt es dabei, ist es ein Fehler: mit dem Web Inspector nachsehen (unten).
   - Daneben: Abtastrate und Latenz, Stimmen, gestartete/gestohlene/verworfene Klänge, Musik und Ambiente der Szene. „Pegel prüfen“ (Abschnitt „Iteration 4“) rendert die neuen Klänge offline und vergleicht sie mit dem Soll-Pegel.
5. **Safari Web Inspector**: Die Builds von `ios:sim` und `ios:device` sind Debug-Builds (`CAPACITOR_DEBUG = true` in `ios/debug.xcconfig` → Capacitor macht die WebView inspizierbar). Mac-Safari ▸ Einstellungen ▸ Erweitert ▸ „Funktionen für Webentwickler“; iPhone: Einstellungen ▸ Apps ▸ Safari ▸ Erweitert ▸ „Web-Inspektor“; dann Safari ▸ Entwickler ▸ ‹iPhone oder Simulator› ▸ early earle. In der Konsole: `__eeAudio.stats()` (Zustand, Stimmen, Warteschlange, Musik/Ambiente) und `__eeAudio.ctx.state`.

**Wie der Ton in der App startet**

- Die WebView der App braucht **keine Geste** (Capacitor setzt `mediaTypesRequiringUserActionForPlayback = []`): die Engine startet den Audio-Kontext, sobald sie geladen ist (`audio.arm(true)` in `src/audio/engine.ts`, nur in der App, also vor dem ersten Klang des Splashs) — der Splash klingt ohne Tippen. Im Browser (Safari, Chrome) bleibt es bei der Regel „erster Tipp startet den Ton“.
- **Native Glas-Pillen** (Spielen, Setzkasten, Klassik, Ton, Werkstatt …) sind Berührungen, die die WebView nie sieht: jeder Tipp ruft vor der Aktion `audio.unlock()` und spielt den Glas-Tink (`dispatchNativeAction` in `src/native/liquidGlass.ts`).
- **Wachhund**: WebKit lässt ein `resume()` ohne Geste unendlich hängen (es lehnt nie ab). Ist der Kontext 400 ms nach `resume()` (Start, Ton wieder an, Rückkehr in den Vordergrund) nicht `running`, hängt die Engine die Tipp-Entsperrung wieder ein; der nächste Tipp startet den Ton.
- Hintergrund und Unterbrechungen: beim Verlassen der App pausiert die Engine (`suspend`), beim Zurückkommen läuft sie weiter; nach Anruf/Siri/Wecker (`interrupted`) startet sie beim nächsten Tipp oder beim nächsten Wechsel in den Vordergrund.

**Geprüft im Simulator (iPhone 17e, 390 × 844 pt, iOS 27, Debug-Build, 2026-09-30)**

- Ohne einen einzigen Tipp: Audio-Lab zeigt „Kontext running · 48000 Hz“ und über 100 gestartete Klänge aus Karte und Level (`docs/progress/iter4-native-audiolab-running.png`).
- Karte mit fünf Pillen in einer Reihe, nichts abgeschnitten: „▶ SPIELEN“ + Setzkasten (Akzent-Tönung) + Klassik + Ton + Werkstatt als Kreise (`iter4-native-map-pills.png`; Setzkasten/Klassik für das Bild als Platzhalter registriert, die echten Einträge kommen aus den Baustellen Sammlung und Klassik). Auf 390 pt greift die vierte Stufe (44-pt-Kreise), auf 393 pt die dritte (46 pt).
- Level 2 „30 ZÜGE“ in Caprasimo (`iter4-native-level-zuege.png`), Klassik-Überschreibung „2048 · 12480 PUNKTE“ (`iter4-native-klassik-punkte.png`). Level 1 ohne Zuglimit zeigt „∞“ in der Systemschrift: Caprasimos ∞ ist ein leeres Kästchen (`GlassFonts.covers`).

**Bekannte Grenzen**

- Stumm = still, auch für REX und die Möwe; im Spiel gibt es dafür keinen Hinweis.
- Der Simulator spielt über den Mac und hat keinen Stummschalter — Stumm und Lautstärketasten nur auf dem Gerät prüfbar.
- Bluetooth-Kopfhörer bringen ≈ 150–250 ms Verzögerung (Klänge kommen nach der Animation).
- Der erste Klang nach dem Start kann ≈ 0,1 s später kommen, weil der Kontext erst anläuft; die Engine hält Klänge bis 1,5 s in der Warteschlange und spielt sie dann ab.
