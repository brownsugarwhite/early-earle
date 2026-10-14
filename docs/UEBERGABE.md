# Übergabe (Stand 15.10.2026 später Nachmittag)

Branch `claude/editor-grundlayout`. Plan „Wesen-Editor 2“ freigegeben, Phase 1 nach [`docs/plans/2026-10-14-phase-1-kern.md`](plans/2026-10-14-phase-1-kern.md) (M1–M4 gebaut, Abnahme offen). Seit 15.10. morgens gilt die **Korrektur „Zeichnung ist Form“** [`docs/plans/2026-10-15-zeichnung-ist-form.md`](plans/2026-10-15-zeichnung-ist-form.md): Florians Kritik („Maul anders geformt als gezeichnet, Kerbe vorn; Tiger weicht von oben und von der Seite ab“) trifft den Vertrag von Phase 1, nicht einer späteren Phase. Abgenommen wird mit seinen drei Sätzen (Planseite Abschnitt 2), nicht mit meinen Zahlen. Blender ist nicht Teil des Plans.

## Was heute gebaut ist

1. **Schritt 1, Breite aus der Zeichnung** (Commit 12cf60d, `packages/shape/src/kern/ableiten.ts`): Sichthülle (Top bei x, Front nur auf der Höhe des breitesten Punkts, Rest je Stützstelle beschnitten) und Breitenpunkte im Ausgleichslöser (`breiteGewicht`, an den tatsächlichen Grenzlagen nachgerechnet, feine Ketten zwischen den Ringen). Top: Kugel 0,5 px, Rex 1,0 (vorher 1,7), Tiger 4,0 (21,6), Langhals 14,2 (17,5). Beweis 1 prüft Front und Top.
2. **Schritt 2, Lippe auf der gezeichneten Linie** (`packages/shape/src/kern/maul.ts`, Test `maullinie.test.ts`): Anfang auf der Kontur (Weltpunkt), Lippenhöhe je Ring aus der Kreuzung mit der Sprosse, Kappenzeile der Lippe auf dem Anfang, `unterSpitze` aus der Linie. Die Kerbe ist weg: Kugel 0,7 px, Rex 1,9–2,1 px (= Rille), 0 Durchdringungen. Alle Maul-Tests bestehen.

3. **Schritt 4, Δ und Saum je Blatt** (`packages/shape/src/kern/abweichung.ts`, Worker, `Viewport.tsx`, `View2D.tsx`): Nach jeder Ableitung steht im Blatt-Titel „Δ x,x px“ (grün ≤ 2, ocker ≤ 6, sonst pink), im Blatt leuchtet der Saum, wo der Körper > 2 px von der Kurve abweicht; Tafel Spiel zeigt alle drei Zahlen. Kugel 0,4/0,5/0,5, Tiger 2,5/3,0/4,8 (Bilder `docs/progress/editor/zeichnung-ist-form-delta-*.png`).

4. **Schritt 3, Stationen einfrieren** (`stationenNachfuehren` in `ableiten.ts`, `kaefig.stationen` im Dokument, Worker, Tafel-Knopf „Neu ableiten“, Test `stationen.test.ts`): Nach dem ersten Ableiten friert das Dokument die Ringverteilung ein; jede Kurvenänderung zieht denselben Käfig nach (keine Neuwahl der Ringe, nichts springt, Pinsel-Deltas bleiben am Ort). Ecken und Reifen werden nachgeführt. Langhals, Hals +0,08: Naht 2,2 px wie frei abgeleitet, Ringe unverändert (frei: Sprünge bis 11,7 % der Wirbelsäule). Bild `docs/progress/editor/zeichnung-ist-form-stationen-langhals.png`.

Messwerte und ehrliche Reste stehen im „Stand“ der Planseite.

## Offen (ehrlich)

- **Widersprüche der Zeichnungen** sind jetzt sichtbar (Δ und Saum), aber nicht gelöst: Rex-Front 11 px (Florians Front ist breiter als sein Top), Langhals-Brust 14 px (Top will 0,13, Seite + Front lassen 0,125; dazu die Kreis-Vorlage schräger Sprossen am Hals-Rumpf-Übergang), Tiger-Frontplatte gegen runde Top-Nase (4 px). Der Saum zeigt noch nicht, ob der Körper zu breit oder zu schmal ist.
- **Käfig als Wahrheit** ist im Zuschnitt „Stationen einfrieren“ gebaut. Vom vollen Plan 4.1 fehlt: der Käfig selbst im Dokument (heute: Kurven + eingefrorene Stationen + Deltas → Körper, deterministisch), Front/Top-Kurven folgen dem Körper nach einer Seite-Änderung nicht automatisch (sie bleiben, Δ zeigt es: Langhals-Hals hoch → Front 53 px, Top 20 px), Maul und Beine leiten weiter mit den eingefrorenen Stationen ab.
- **Breitenpunkte und Kieferpose** vertragen sich nicht (welliger Käfig → Hautfalten beim Öffnen); der Maulbau nutzt deshalb nur die Sichthülle (Tiger mit Maul Top 7,5 px). Weg: Pose auf geglättetem Käfig oder Glättung im Ausgleich (4 hilft, kostet 1 px an der Kugel).
- Rille vorn 2–3 px in der Seitenansicht; scharfe Spitze → Überbiss statt Lippe durch die Spitze; Lippe an der Spitze hinter der Schnauze braucht Schnauzenringe (Ring 0 rückt zurück, Ecken davor verlieren ihren Ring).
- Register offener Kritik mit Phase je Punkt: [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md).

## Nächster Schritt

1. **Florians Abnahme der drei Sätze** im Web-Modus (nach dem Pull Dev-Server neu starten): gerade Maullinie → gerades Maul; Umriss von oben = seine Kurve (Δ im Titel, Saum zeigt, wo nicht); Giraffenhals hochziehen → bleibt, Ringe springen nicht („Neu ableiten“ nur auf Wunsch).
2. Je nach Urteil: Kurven aus der Silhouette nachziehen (Front/Top folgen einer Seite-Änderung), Breitenpunkte mit Maul (Glättung), Langhals-Brust (Vorlage schräger Sprossen).
3. Tiger-Kopf in ≤ 10 min (Phase-1-Plan), dann Phase 2 (Maul: Plattenmaul, Überbiss getrennt).

## Prüfen

- `cd packages/shape && npx vitest run src/kern` (54 Tests; Laufzeit-Tests unter Last mit `-t` einzeln), Editor `cd apps/editor && npx vitest run`.
- Messskripte liegen im Scratchpad dieser Sitzung (`umriss-abweichung.ts`, `top-diagnose.ts`, `stern-check.ts`, `lippe-debug.ts`, `delta-check.mjs`, `stationen-check.mjs` mit `run-check.sh` = eigener Vite auf 5192); bei Bedarf nach `apps/editor/scripts/` übernehmen.
- Florian testet im Web-Modus (`pnpm --filter @ee/editor dev:web`, Port 5180); nach dem Pull den Dev-Server neu starten (HMR-Falle). Harness-Bilder nur über die E2E-Spezifikationen (`E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e -- kern-ablauf`).
- Nie committen: `assets/fonts/Hippie Movement.otf` (unversioniert, Florians Datei).
