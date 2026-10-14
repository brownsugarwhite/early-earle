# Übergabe (Stand 15.10.2026 mittags)

Branch `claude/editor-grundlayout`. Plan „Wesen-Editor 2“ freigegeben, Phase 1 nach [`docs/plans/2026-10-14-phase-1-kern.md`](plans/2026-10-14-phase-1-kern.md) (M1–M4 gebaut, Abnahme offen). Seit 15.10. morgens gilt die **Korrektur „Zeichnung ist Form“** [`docs/plans/2026-10-15-zeichnung-ist-form.md`](plans/2026-10-15-zeichnung-ist-form.md): Florians Kritik („Maul anders geformt als gezeichnet, Kerbe vorn; Tiger weicht von oben und von der Seite ab“) trifft den Vertrag von Phase 1, nicht einer späteren Phase. Abgenommen wird mit seinen drei Sätzen (Planseite Abschnitt 2), nicht mit meinen Zahlen. Blender ist nicht Teil des Plans.

## Was heute gebaut ist

1. **Schritt 1, Breite aus der Zeichnung** (Commit 12cf60d, `packages/shape/src/kern/ableiten.ts`): Sichthülle (Top bei x, Front nur auf der Höhe des breitesten Punkts, Rest je Stützstelle beschnitten) und Breitenpunkte im Ausgleichslöser (`breiteGewicht`, an den tatsächlichen Grenzlagen nachgerechnet, feine Ketten zwischen den Ringen). Top: Kugel 0,5 px, Rex 1,0 (vorher 1,7), Tiger 4,0 (21,6), Langhals 14,2 (17,5). Beweis 1 prüft Front und Top.
2. **Schritt 2, Lippe auf der gezeichneten Linie** (`packages/shape/src/kern/maul.ts`, Test `maullinie.test.ts`): Anfang auf der Kontur (Weltpunkt), Lippenhöhe je Ring aus der Kreuzung mit der Sprosse, Kappenzeile der Lippe auf dem Anfang, `unterSpitze` aus der Linie. Die Kerbe ist weg: Kugel 0,7 px, Rex 1,9–2,1 px (= Rille), 0 Durchdringungen. Alle Maul-Tests bestehen.

Messwerte und ehrliche Reste stehen im „Stand“ der Planseite.

## Offen (ehrlich)

- **Widersprüche der Zeichnungen** werden noch nicht angezeigt: Rex-Front 11 px (Florians Front ist breiter als sein Top), Langhals-Brust 14 px (Top will 0,13, Seite + Front lassen 0,125; dazu die Kreis-Vorlage schräger Sprossen am Hals-Rumpf-Übergang), Tiger-Frontplatte gegen runde Top-Nase (4 px). → Schritt 4: Δ-Zahl und Lichtsaum je Blatt (Plan 9.8).
- **Käfig als Wahrheit** (Schritt 3) ist nicht gebaut: Der Körper wird bei jeder Änderung neu aus den drei Shapes abgeleitet; Pinsel-Deltas liegen obendrauf. Großer Umbau (Käfig im Dokument, Ableitung nur beim Anlegen, Kurven als Griffe), eher eine eigene Woche.
- **Breitenpunkte und Kieferpose** vertragen sich nicht (welliger Käfig → Hautfalten beim Öffnen); der Maulbau nutzt deshalb nur die Sichthülle (Tiger mit Maul Top 7,5 px). Weg: Pose auf geglättetem Käfig oder Glättung im Ausgleich (4 hilft, kostet 1 px an der Kugel).
- Rille vorn 2–3 px in der Seitenansicht; scharfe Spitze → Überbiss statt Lippe durch die Spitze; Lippe an der Spitze hinter der Schnauze braucht Schnauzenringe (Ring 0 rückt zurück, Ecken davor verlieren ihren Ring).
- Register offener Kritik mit Phase je Punkt: [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md).

## Nächster Schritt

1. **Schritt 4:** je Blatt die Abweichung Körper ↔ Kurve als Zahl im Titel und als Saum (> 2 px), gerechnet im Worker (`umrissAusNetz` + Abstand zur Kurve), damit Florian die Widersprüche seiner drei Kurven sieht und der Kern nicht still entscheidet.
2. **Schritt 3:** Käfig als Wahrheit (Plan 4.1), Reihenfolge auf der Planseite.
3. Dann Florians Abnahme mit den drei Sätzen; Tiger-Kopf in ≤ 10 min (Phase-1-Plan).

## Prüfen

- `cd packages/shape && npx vitest run src/kern` (54 Tests; Laufzeit-Tests unter Last mit `-t` einzeln), Editor `cd apps/editor && npx vitest run`.
- Messskripte liegen im Scratchpad dieser Sitzung (`umriss-abweichung.ts`, `top-diagnose.ts`, `stern-check.ts`, `lippe-debug.ts`); bei Bedarf nach `apps/editor/scripts/` übernehmen.
- Florian testet im Web-Modus (`pnpm --filter @ee/editor dev:web`, Port 5180); nach dem Pull den Dev-Server neu starten (HMR-Falle). Harness-Bilder nur über die E2E-Spezifikationen (`E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e -- kern-ablauf`).
- Nie committen: `assets/fonts/Hippie Movement.otf` (unversioniert, Florians Datei).
