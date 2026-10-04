# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben** (nicht angehängt): Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie steht in Git und in `docs/PRODUCTION.md`.

**Stand:** 2026-10-04, Ende der Cloud-Session „GPT-Bilder in 3D-Modelle“.

## Wo wir stehen

- **Prototyp 1 ist abgeschlossen** und als Archiv-Branch `prototyp-1` eingefroren (Commit `0b0122c`, CI grün). Abschluss, Entscheidungen, Lehren und offene Punkte: [`prototyp/README.md`](prototyp/README.md).
- Die Dokumente sind auf „Prototyp abgeschlossen, Produktion beginnt“ umgestellt: `CLAUDE.md` (neu, Projektgedächtnis), `README.md`, `PRODUCTION.md`, `GDD.md`, `STYLE.md`, ADR-0001/0002 tragen Status-Hinweise.
- Neu im Repo: Recherche KI-3D-Werkzeuge (`research/ki-3d-tools-2026-10.md`), unbestätigter Plan „Wesen-Baukasten v4“ (`prototyp/wesen-v4-plan-unbestaetigt.md`), Quelltext des prozeduralen Wesen-Baukastens mit Florians GPT-Vorlagen (`prototyp/wesen-baukasten/`), Vergleichsbilder (`progress/wesen-baukasten-v2-*.png`).

## Was Florian als Nächstes macht

- Eigene Tests (KI-3D-Werkzeuge in der Cloud, Meshy/Tripo/Rodin), Informationen sammeln.
- Neuen Plan und Hauptprompt schreiben; Story, Charaktere und Map genauer ausarbeiten; alles in Dokumenten und Screenshots zusammentragen.
- Meshy-Screenshots und neue Referenzen unter `assets/ref-florian/` ablegen.

## Nächster Schritt für die nächste Session

1. `CLAUDE.md`, `prototyp/README.md` und diese Datei lesen.
2. Auf Florians neuen Plan warten bzw. ihn mit ihm durchgehen. **Nicht** auf Basis der alten Pläne weiterbauen.
3. Mit dem neuen Plan: Startcheckliste in `prototyp/README.md` §8 abarbeiten (Wesen-Pipeline, finaler Look, Stack-Gate, Übernahme aus dem Prototyp), neuen Produktionsplan als Datei ins Repo.

## Offen

Siehe [`prototyp/README.md`](prototyp/README.md) §7 (offene Aufgaben aus den letzten Sessions, lokal liegende Arbeit, Regel- und Designfragen).
