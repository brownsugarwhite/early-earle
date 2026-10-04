# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben** (nicht angehängt): Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie steht in Git und in `docs/PRODUCTION.md`.

**Stand:** 2026-10-04, Ende der Cloud-Session „GPT-Bilder in 3D-Modelle“.

## Wo wir stehen

- **Prototyp 1 ist abgeschlossen** und als Archiv-Branch `prototyp-1` eingefroren (Commit `0b0122c`, CI grün). Abschluss, Entscheidungen, Lehren und offene Punkte: [`prototyp/README.md`](prototyp/README.md).
- Die Dokumente sind auf „Prototyp abgeschlossen, Produktion beginnt“ umgestellt: `CLAUDE.md` (neu, Projektgedächtnis), `README.md`, `PRODUCTION.md`, `GDD.md`, `STYLE.md`, ADR-0001/0002 tragen Status-Hinweise.
- Neu im Repo: Recherche KI-3D-Werkzeuge (`research/ki-3d-tools-2026-10.md`), unbestätigter Plan „Wesen-Baukasten v4“ (`prototyp/wesen-v4-plan-unbestaetigt.md`), Quelltext des prozeduralen Wesen-Baukastens mit Florians GPT-Vorlagen (`prototyp/wesen-baukasten/`), Vergleichsbilder (`progress/wesen-baukasten-v2-*.png`).

## Dringend für Florian (vor dem Produktionsstart)

1. **Lokale Commits auf dem Mac sichern:** Der Haupt-Checkout stand am 01.10. auf `main` mit HEAD `b116346` und **6 nicht gepushten Commits** plus ungesicherten Änderungen. GitHub kennt nur `0b0122c`. Auf dem Mac `git log origin/main..main` und `git status` prüfen, dann auf einen eigenen Branch pushen oder bewusst verwerfen (Details: `prototyp/README.md` §7.1).
2. Pläne und Memory, die nur auf dem Mac liegen (`~/.claude/plans/hi-wir-haben-in-tender-yao.md` = Karte v5, `…/ich-habe-noch-einige-distributed-summit.md` = Iteration 4, Memory `handoff-karte-v5`, `handoff-loader-intro.md`), bei Bedarf nach `docs/prototyp/` kopieren.
3. Wochenlimit: laut Sitzungsdaten zurückgesetzt am **06.10.2026, 10:00 MESZ**.

## Was Florian als Nächstes macht

- Eigene Tests (KI-3D-Werkzeuge in der Cloud, Meshy/Tripo/Rodin), Informationen sammeln.
- Neuen Plan und Hauptprompt schreiben; Story, Charaktere und Map genauer ausarbeiten; alles in Dokumenten und Screenshots zusammentragen.
- Meshy-Screenshots und neue Referenzen unter `assets/ref-florian/` ablegen.

## Nächster Schritt für die nächste Session

1. `CLAUDE.md`, `prototyp/README.md` und diese Datei lesen.
2. Auf Florians neuen Plan warten bzw. ihn mit ihm durchgehen. **Nicht** auf Basis der alten Pläne weiterbauen.
3. Mit dem neuen Plan: Startcheckliste in `prototyp/README.md` §8 abarbeiten (Wesen-Pipeline, finaler Look, Stack-Gate, Übernahme aus dem Prototyp), neuen Produktionsplan als Datei ins Repo.

## Offen

Siehe [`prototyp/README.md`](prototyp/README.md) §7. Kurz:
- ungelöst: Kartenboden fehlte nur in der nativen iOS-App (WebGL2/WebKit-Pfad vermutet; Lehre: App ≠ Safari, Fehleranzeige im Spiel einplanen);
- nicht mehr ausgeführt: iPhone-Messung der Karte und R4.2–R4.7, Riesenbaum-Meshes zusammenlegen, Wasser-Shader-Zweig, Mobil-Hänger 1,2–1,4 s, Nachschärfen der Welten;
- offene Entscheidungen aus Iteration 4 (Möwenschatten, Setzkasten quer, Map-Wesen-Größe, „Tippen“, Loader-Zahl, 3D-Held, Logo-Farben) und Tester-App (Apple-ID oder TestFlight);
- Wesen: Plan v4 nie freigegeben, Werkzeugwahl offen.
