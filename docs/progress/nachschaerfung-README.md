# Review-Harness der Zonen-Nachschärfung (A2)

Eine Spec, die je Welt eine Montage **Referenz | Lab quer | Lab hoch | Karte Handy** und ein Paar **Verlauf 0 / 1**
nach `docs/progress/` schreibt. Vorher- und Nachher-Bilder entstehen mit demselben Aufruf und nur anderem Tag, so lassen
sich die Montagen Welt für Welt nebeneinanderlegen.

Spec: `apps/game/e2e/nachschaerfung-shots.spec.ts` (Muster `progression-shots.spec.ts`; ohne `EE_SHOTS=1` überspringt sie alles).

## Aufruf

Vom Repo-Stamm, echte GPU (Mac, Metal), eigener Port:

```sh
# alle Welten (01–14, dazu 15/16 sobald content/zones/worlds/15.json, 16.json existieren), Tag „vorher“
EE_SHOTS=1 EE_SHOTS_TAG=vorher E2E_PORT=4341 node apps/game/scripts/e2e.mjs e2e/nachschaerfung-shots.spec.ts

# nur zwei Welten, ohne Tag (Dateien `nachschaerfung-w08.png` …) — oder mit Tag `nachher`
EE_SHOTS=1 EE_WORLDS=08,09 EE_SHOTS_TAG=nachher E2E_PORT=4341 node apps/game/scripts/e2e.mjs e2e/nachschaerfung-shots.spec.ts
```

`scripts/e2e.mjs` startet den Dev-Server selbst auf `E2E_PORT` und beendet ihn danach. Mit schon laufendem Dev-Server
(z. B. `NO_SSL=1 node node_modules/vite/bin/vite.js --port 4341` in `apps/game`) geht auch
`E2E_PORT=4341 PW_REUSE_SERVER=1 pnpm --filter @ee/game exec playwright test e2e/nachschaerfung-shots.spec.ts`.
Nie die Ports 5173/5174 nehmen (Florians Dev-Server).

Laufzeit: etwa 20 s je Welt, alle 14 Welten gut 4,5 Minuten (M3 Pro). Das Gesamtlimit von `playwright.config.ts` ist 25 Minuten.

## Parameter (Umgebungsvariablen)

| Variable | Wirkung | Standard |
|---|---|---|
| `EE_SHOTS=1` | Pflicht, sonst wird die Spec übersprungen | – |
| `EE_WORLDS=08,09` | nur diese Welten (`8` und `w08` gehen auch); unbekannte Nummern brechen ab | alle aus `content/zones/worlds/` |
| `EE_SHOTS_TAG=vorher` | Dateisuffix und Beschriftung (`nachschaerfung-w08-vorher.png`); ohne Tag kein Suffix | leer |
| `EE_NODE=first\|mid` | Karte am ersten Knoten der Welt oder an ihrer Mitte (dort steht meist das Fokus-Element) | `first` |
| `EE_KARTE_QUALITY=mobil\|hoch` | Qualität der Karte (Lab quer ist immer Hoch, Lab hoch immer Mobil) | `mobil` |
| `EE_MONTAGE_H=640` | Bildhöhe in der Montage (px); das Paar Verlauf zeigt das Lab quer in voller Höhe (760) | `640` |
| `EE_DPR=2` | Geräte-Pixelverhältnis der Aufnahmen (iPhone ≈ 2–3; mehr Pixel, größere Dateien) | `1` |
| `EE_ALLOW_WEBGL2=1` | auch ohne WebGPU-Adapter aufnehmen (sonst Fehler: solche Bilder sind nicht vergleichbar) | aus |

## Ausgabe (`docs/progress/`)

- `nachschaerfung-wNN[-TAG].png` — Montage, von links nach rechts:
  1. **Referenz NN** aus `apps/game/public/refs/NN.png` (Gemälde bzw. Feedback-Bild, auf 1600 px Kantenlänge verkleinert; fehlt es, steht ein Platzhalter da).
  2. **Lab quer** — `/lab/earle?world=NN&p=1&quality=hoch&verlauf=1` bei 1200×760.
  3. **Lab hoch** — dieselbe Seite mit `quality=mobil` bei 390×844.
  4. **Karte Handy** — `/play?mode=free` bei 393×852, Qualität Mobil, Ansicht am ersten Knoten der Welt (der Knoten steht im Bildtitel).
- `nachschaerfung-wNN-verlauf[-TAG].png` — Lab quer (Hoch) mit Verlauf **0** (nur Stufen, Siebdruck) neben Verlauf **1** (Stufen plus Verlauf innen), in voller Größe.

Die Kopfzeile jeder Montage nennt Welt, Tag, Commit-Hash (mit „+ Änderungen“, wenn tracked Dateien in `apps`, `packages`, `content` geändert sind), Datum und Backend (`webgpu`). Steht dort zusätzlich „nicht ruhig nach 120 s“ oder „Lab quer zeigt …“,
dann ist das Bild nicht verlässlich (siehe unten). Die Einzelbilder hängen außerdem als Anhänge am Playwright-Ergebnis (`apps/game/test-results/`).

Eine Montage ist etwa 1–2 MB, ein Verlaufspaar 0,5–1,6 MB (14 Welten × 2 ≈ 31 MB).

## Wie die Bilder entstehen

- **Ohne Bedienflächen**: Kopfzeile, Regler, Welt-Schild, Perf-Badge, Dev-Leiste und HUD sind per CSS ausgeblendet, die Lab-Bühne füllt das ganze Fenster (Bild = reine Welt).
- **Warten bis ruhig** (statt fester Zeit): das Bild wird erst aufgenommen, wenn über 1,5 s und mindestens acht Bilder keine Chunks mehr gebaut werden und Draw Calls, geladene Chunks, Bäume, Punkte, Requisiten und die Kamera unverändert sind. Lab: `window.__earleLab.getStats()`; Karte: `window.__flow.stats()` und `view()` (Gleitfahrt zu Ende, Pipelines des Bretts aufgewärmt). Wird es in 120 s nicht ruhig, steht das in der Montage, im Testlauf als Annotation „unruhig“ und in der Konsolenzeile der Welt.
- **Knoten je Welt** kommen aus dem Code, nicht aus der Spec: die Spec lädt `AUTHORED_ROUTE` aus `src/lab/earle/zones.ts` über den Dev-Server und summiert die Level je Routeneintrag. Ändert sich die Route (W1), stimmen die Bilder ohne Anpassung. Welten, die nicht auf der Route liegen, bekommen an der Stelle einen Platzhalter.
- **Karte**: Freier Modus, Fortschritt über `localStorage` gesetzt (Level 100 erreicht, Held am Knoten, für künftige Level ab 101 am letzten Autorenlevel); liegt der Knoten dahinter, gleitet die Ansicht per `__flow.goToNode(Knoten)` hin. Der Held und sein Wesen stehen im Bild.
- **Verlauf**: Die Lab-Adresse kennt `?verlauf=` (noch) nicht (der Regler „Verläufe“ startet auf 1); die Spec stellt ihn deshalb über den Regler (`data-testid="earle-verlauf"`) und prüft die Anzeige („Stufen“ bzw. „100 %“). Liest das Lab den Parameter später selbst, bleibt die Spec richtig.
- **Fehler**: GPU-Fehler (WGSL, Pipeline, BindGroup …) und Seitenfehler lassen den Test am Ende rot werden (`expect.soft`), die Bilder sind dann trotzdem geschrieben.

## Referenzbilder einrichten (einmalig je Checkout)

`apps/game/public/refs/` ist gitignoriert (urheberrechtlich geschützt, nur lokal). Die Lab-Referenz-Schaltfläche verwendet dieselben Dateien. Aus dem Repo-Stamm, wenn `ref/` vorhanden ist:

```sh
mkdir -p apps/game/public/refs
for i in 01 02 03 04 05 06 07 08 09 10; do
  sips -s format png -Z 1600 ref/feedback-2026-09-29/$i.webp --out apps/game/public/refs/$i.png
done
cp "ref/eyvind earle/Ebene 20 Kopie.png" apps/game/public/refs/11.png   # Welt 11 Nebelweide
cp "ref/eyvind earle/Ebene 7.png"        apps/game/public/refs/12.png   # Welt 12 Goldnebelhang
cp "ref/eyvind earle/Ebene 45.png"       apps/game/public/refs/13.png   # Welt 13 Roter Monolith
cp "ref/eyvind earle/Ebene 29.png"       apps/game/public/refs/14.png   # Welt 14 Stille Bucht
cp "ref/eyvind earle/Ebene 12.png"       apps/game/public/refs/15.png   # Welt 15 Blaue Terrassen
cp "ref/eyvind earle/Bildschirmfoto 2025-10-15 um 16.55.57.png" apps/game/public/refs/16.png   # Welt 16
sips -Z 1600 apps/game/public/refs/1[1-6].png
```

Im Hauptverzeichnis liegen unter `apps/game/public/refs/01–10.png` noch 200-px-Vorschauen aus dem Lab; für die Montage zählt die große Fassung (sie steht dort auch im Lab-Vergleich).

## Vorher/Nachher-Ablauf

1. Vor den Änderungen: `EE_SHOTS_TAG=vorher` für alle Welten (die Bilder liegen im Repo, Stand 4bf845b).
2. Nach den Änderungen einer Welt: `EE_WORLDS=NN EE_SHOTS_TAG=nachher …`, dann `nachschaerfung-wNN-vorher.png` und `nachschaerfung-wNN-nachher.png` untereinander lesen. Die Kopfzeile zeigt den Commit.
3. Verlaufspaare (`…-verlauf-…`) prüfen, ob bei Verlauf 0 noch klare Stufen stehen und bei Verlauf 1 der Verlauf nur innerhalb der Stufen läuft.
