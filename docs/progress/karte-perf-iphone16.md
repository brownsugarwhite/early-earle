# Karte · Leistung auf dem iPhone 16 — Messprotokoll (R4.1 „Messen zuerst“)

Vorlage für die Gerätemessung der Karte vor und nach R4.2–R4.7 (DPR-Deckel, Governor, Schatten-Slide, Punkte-Taps,
Instanz-Kulling, Depth16). Dieselbe Messung wie am Mac (`karte-perf-mac-baseline.md`), dieselben Spalten.
Werkzeug: `apps/game/src/flow/mapBench.ts` (`?bench=karte` oder `__flow.bench()`).

| | |
|---|---|
| Gerät | iPhone 16 („eyePhone (2)“), 393 × 852 pt @3, 60-Hz-Display |
| iOS / Safari | _eintragen_ |
| Weg | ☐ Safari (Dev-Server) ☐ App (WKWebView) |
| Stand vorher | `r4/messung` auf main 4bf845b (_Commit eintragen_) |
| Stand nachher | _Commit nach R4.2–R4.7_ |
| Ort | Level 1 (Welt w09, Start) — optional Level 66 (Welt w07) |

## Messen

### A · iPhone-Safari über den Dev-Server (mit Overlay)

1. **Florian** startet den Dev-Server `game-dev` (HTTPS, Port 5173, im WLAN erreichbar). Agenten starten ihn nicht.
2. iPhone im selben WLAN, Safari:
   `https://192.168.1.55:5173/play?mode=free&level=1&quality=mobil&bench=karte`
   (Zertifikatswarnung einmal bestätigen). Wie am Mac: freier Spielstand, Held auf Level 1 (Welt w09). `mode=free`
   schaltet nur den Spielstand-Slot um, der echte Stand bleibt unberührt (zurück mit `?mode=real`); ohne `mode=free`
   geht es auch (das Gummiband ist während der Messung aus), nur ein noch nicht gesehenes Intro würde die Messung
   blockieren. Welt 07: `level=66` statt `level=1`.
3. **Nicht berühren, nicht drehen**, Bildschirm an lassen (≈ 1,5–3 min; am Mac 60–100 s). Oben läuft „Karten-Bench · Reihe n/15 …“.
4. Am Ende steht die Tabelle im Overlay: **Bildschirmfoto** (Seitentaste + Lauter). Spalten: Bild med/p99, CPU, GPU
   (Replay), Draw Calls, Schattenpässe/s; darunter die Posten (A/B). „×“ schließt das Overlay.
5. Volles JSON (alle Teile, p99, Rückmeldezeit): Mac-Safari ▸ Entwickler ▸ eyePhone (2) ▸ Seite ▸ Konsole:
   `copy(JSON.stringify(__mapBench))` und als `docs/progress/karte-perf-iphone16-vorher.json` (bzw. `-nachher`)
   ablegen. Voraussetzung: iPhone ▸ Einstellungen ▸ Apps ▸ Safari ▸ Erweitert ▸ „Web-Inspektor“; Mac-Safari ▸
   Einstellungen ▸ Erweitert ▸ „Funktionen für Webentwickler“. Die Konsole zeigt auch beide `console.table`.
6. Nochmal messen: Seite neu laden oder in der Konsole `await __flow.bench()`.

### B · Native App (WKWebView, wie ausgeliefert) — nur beschrieben, nicht von Agenten ausgeführt

Das Telefon ist für Agenten nicht sicher erreichbar; Florian (oder die Leitung mit ihm) führt das aus.

1. Gebündelten Debug-Build installieren:
   `IOS_TEAM_ID=R67BLW649H IOS_DEVICE="eyePhone (2)" pnpm --filter @ee/game ios:device`
   (baut das Web-Bündel, `cap sync ios`, signiert, installiert, startet).
2. App öffnen, Splash antippen, auf der Karte warten. Qualität ist auf dem Telefon automatisch **Mobil** (Touch).
   Gemessen wird am aktuellen Knoten des aktiven Spielstands (im Bericht: `node`, `modus`).
3. Mac-Safari ▸ Entwickler ▸ eyePhone (2) ▸ early earle (Debug-Builds sind inspizierbar, siehe `docs/IOS.md` §5) ▸
   Konsole: `await __flow.bench()` — danach `copy(JSON.stringify(__mapBench))`. Das Overlay gibt es im Bündel nicht
   (der Perf-Badge sitzt im Dev-Streifen); die Tabellen stehen in der Konsole.
4. Variante mit Dev-Server-URL (wie im Plan): `CAP_SERVER_URL="https://192.168.1.55:5173/play?quality=mobil&bench=karte"`
   **vor denselben** `ios:device`-Befehl setzen (das Skript ruft `cap sync ios` selbst auf; ein getrenntes
   `pnpm exec cap sync ios` vorher würde überschrieben). Vorbehalt, nicht am Gerät geprüft: laut `docs/IOS.md` lädt
   HTTPS 5173 in der App nicht (selbst signiertes Zertifikat), und über HTTP (5174) ist die Seite kein sicherer
   Kontext → kein WebGPU → die Messung bricht mit „nur WebGPU“ ab. Zurück zum Bündel: `ios:device` ohne die Variable.

## Was die Zahlen bedeuten

- **Reihen** (je ≥ 120 Bilder): Leerlauf und Schwenken (0,8 Einheiten je Bild vorwärts, jede Reihe ab demselben
  Fokus über dieselbe Strecke; „kalt“ = erster Durchgang mit Chunk-Bau), je mit allem / ohne Schattenpässe / ohne
  Punkte / ohne Vegetation bei DPR 2, dazu „alles“ bei DPR 1,75 und 1,5 und eine Kontrollreihe (Drift: Wärme).
- **Bild** = Start → GPU fertig, seriell (CPU + GPU, ohne Überlappung zweier Bilder) — enthält die feste
  Rückmeldezeit `L` von `onSubmittedWorkDone` und den Hochlauf einer GPU, die zwischen den Bildern ruht. Konservativ.
- **CPU** = Hauptthread des Bildes; Teile: `update` (ohne Bau/Inhalt), **Bau** (Chunks), **Inhalt**
  (`rebuildContent`, mit Anteil der Bilder), **Fit** (Schatten-Kaskaden), **Encode** (`renderer.render` ohne Fit).
- **GPU** = Replay (dasselbe Bild 2 × und 8 × am Stück, Gerade `T(B) = B·g + L`) → Kosten je Bild bei voll
  getakteter GPU, ohne `L`. Liegt „Replay-Encode“ nahe an GPU, ist das Replay CPU-gebunden (dann ist GPU ≤ Wert).
- **Posten** = A/B-Differenz zur Reihe „alles“ (Mittel aus Start und Kontrolle). WebKit-WebGPU hat keine
  Timestamp-Queries; die Subtraktion ist die Methode.
- **Ziele (Plan R4, Mobil = iPhone 16 bei DPR 1,75)**: GPU ≤ 11 ms, Hauptthread ≤ 8 ms, p99 Bild ≤ 16 ms,
  Draw Calls beim Schwenken ≤ 80 (Median) / 100 (Max); Schatten amortisiert ≤ 1,5 ms.

## vorher (Stand R4.1)

Gemessen am _Datum_, Weg _A/B_, Ort _Level 1_.

### Reihen

| Szene | Variante | DPR | Canvas | Bild med / p99 | CPU med / p99 | GPU (Replay) | dc med / max | Schattenpässe/s |
|---|---|---|---|---|---|---|---|---|
| Leerlauf | alles | 2 | | | | | | |
| Leerlauf | ohne Schatten | 2 | | | | | | |
| Leerlauf | ohne Punkte | 2 | | | | | | |
| Leerlauf | ohne Vegetation | 2 | | | | | | |
| Leerlauf | alles | 1,75 | | | | | | |
| Leerlauf | alles | 1,5 | | | | | | |
| Schwenken kalt | alles | 2 | | | | | | |
| Schwenken | alles | 2 | | | | | | |
| Schwenken | ohne Schatten | 2 | | | | | | |
| Schwenken | ohne Punkte | 2 | | | | | | |
| Schwenken | ohne Vegetation | 2 | | | | | | |
| Schwenken | alles | 1,75 | | | | | | |
| Schwenken | alles | 1,5 | | | | | | |

### Posten (A/B bei DPR 2, ms)

| Posten | Leerlauf Δ GPU | Leerlauf Δ CPU | Schwenken Δ GPU | Schwenken Δ CPU |
|---|---|---|---|---|
| gesamt (alles) | | | | |
| Schattenpässe | | | | |
| Punkte | | | | |
| Vegetation ohne Punkte | | | | |
| Rest (Gelände, Himmel, Nebel, Weg, Held …) | | | | |
| DPR 2 → 1,75 (Ersparnis) | | | | |
| DPR 2 → 1,5 (Ersparnis) | | | | |
| Drift (Kontrolle − Start) | | | | |

### Hauptthread beim Schwenken (DPR 2, med / p99 ms)

| update | Chunk-Bau (kalt: max) | Inhalt (Anteil der Bilder) | Fit | Encode | Szene |
|---|---|---|---|---|---|
| | | | | | |

## nachher (nach R4.2–R4.7)

Gemessen am _Datum_, Weg _A/B_, Ort _Level 1_, Governor-Stufe _…_, DPR-Deckel _…_.

### Reihen

| Szene | Variante | DPR | Canvas | Bild med / p99 | CPU med / p99 | GPU (Replay) | dc med / max | Schattenpässe/s |
|---|---|---|---|---|---|---|---|---|
| Leerlauf | alles | 2 | | | | | | |
| Leerlauf | ohne Schatten | 2 | | | | | | |
| Leerlauf | ohne Punkte | 2 | | | | | | |
| Leerlauf | ohne Vegetation | 2 | | | | | | |
| Leerlauf | alles | 1,75 | | | | | | |
| Leerlauf | alles | 1,5 | | | | | | |
| Schwenken kalt | alles | 2 | | | | | | |
| Schwenken | alles | 2 | | | | | | |
| Schwenken | ohne Schatten | 2 | | | | | | |
| Schwenken | ohne Punkte | 2 | | | | | | |
| Schwenken | ohne Vegetation | 2 | | | | | | |
| Schwenken | alles | 1,75 | | | | | | |
| Schwenken | alles | 1,5 | | | | | | |

### Posten (A/B bei DPR 2, ms)

| Posten | Leerlauf Δ GPU | Leerlauf Δ CPU | Schwenken Δ GPU | Schwenken Δ CPU |
|---|---|---|---|---|
| gesamt (alles) | | | | |
| Schattenpässe | | | | |
| Punkte | | | | |
| Vegetation ohne Punkte | | | | |
| Rest (Gelände, Himmel, Nebel, Weg, Held …) | | | | |
| DPR 2 → 1,75 (Ersparnis) | | | | |
| DPR 2 → 1,5 (Ersparnis) | | | | |
| Drift (Kontrolle − Start) | | | | |

### Hauptthread beim Schwenken (DPR 2, med / p99 ms)

| update | Chunk-Bau (kalt: max) | Inhalt (Anteil der Bilder) | Fit | Encode | Szene |
|---|---|---|---|---|---|
| | | | | | |

## Dauertest (nachher)

60 fps über 10 min: Karte von Hand schwenken (Safari mit Perf-Badge oder App mit Web-Inspector), Perf-Badge
`fps` / `p99` alle 2 min notieren; Wärme (Gerät handwarm/heiß) dazuschreiben.

| Minute | 0 | 2 | 4 | 6 | 8 | 10 |
|---|---|---|---|---|---|---|
| fps / p99 | | | | | | |
