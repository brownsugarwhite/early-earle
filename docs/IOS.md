# iPhone-App (Capacitor) — Installation, Glas-HUD, Haptik

Stand 2026-09-29. Die App-Hülle liegt in `apps/game/ios` (Capacitor 8.5, SPM, iOS-27-SDK/Xcode 27). Das Spiel selbst ist das Web-Bundle aus `apps/game/dist`; es läuft in der WKWebView, darüber schwebt ein **natives SwiftUI-HUD in Liquid Glass** (eigenes Plugin `apps/game/plugins/liquid-glass`).

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
- **Web/Android:** `isAvailable()` → `available: false`; das CSS-Glas-HUD in `FlowHud.tsx` bleibt.

API (`apps/game/src/native/liquidGlass.ts` kapselt sie mit `useNativeGlass()`, `syncNativeGlass()`, `useNativeGlassActions()`, `useNativeGlassLayout()`):

| Methode / Event | Bedeutung |
|---|---|
| `isAvailable()` → `{ available, glass, platform, version }` | `glass: true` = echtes Liquid Glass (iOS 26+) |
| `show({ top: { title, subtitle, moves, goals[] }, actions: [{ id, label, icon?, primary?, disabled?, tint? }], rex?, tint?, accent? })` | Zustand setzen und einblenden |
| `update({...})` | Teil-Update (nur vorhandene Schlüssel, `null` löscht), Pillen morphen |
| `hide()` | ausblenden (Splash/Hüpfer) |
| `setSafeInsets({ top, bottom })` | zusätzliche Ränder in CSS-px |
| Event `action` `{ id }` | Tipp auf eine Pille (`play`, `rewind`, `restart`, `map`); nativ mit leichtem Haptik-Tick |
| Event `layout` `{ top, bottom, safeTop, safeBottom, glass }` | Höhen in CSS-px, damit Web-Elemente ausweichen können |

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
- Personal-Team-Builds laufen 7 Tage; danach neu installieren (⌘R). Maximal 3 Apps pro Personal Team, 10 Geräte.
- Das Overlay kennt keine Sheets/Booster-Leiste — kommen, sobald das Spiel sie hat (gleiches Plugin, weitere Elemente).
- Der Dev-Streifen unten links (nur `pnpm dev`) liegt im Web-Layer und kann die nativen Pillen auf sehr schmalen Geräten berühren; im Release-Bundle gibt es ihn nicht.
