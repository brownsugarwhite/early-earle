# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-12 spätnachts. Die Versuchsphase am Wesen-Editor (11.–12.10.) ist abgeschlossen. Florian: „Alles bis jetzt waren nur Tests und Recherche!“

**Auftrag der großen Sitzung:** Aus allen Tests etwas Neues und Einzigartiges entwickeln, die **optimale Bauweise für unsere Wesen**, viel besser und schneller, als sie in Blender zu bauen.
- Alle bisherigen Festlegungen, auch Florians eigene zu Bauweise, Bedienung und UI, sind Tests und Bauchentscheidungen, nicht ausgetestet.
- Findet die Sitzung einen besseren Weg, setzt sie ihn um. Maßstab sind der Look der Bögen und Florians Urteil am Ergebnis.

**Einstieg für die große Sitzung ab 13.10.:** [`docs/plans/2026-10-13-grosse-sitzung-wesen-editor.md`](plans/2026-10-13-grosse-sitzung-wesen-editor.md), als Seite: https://claude.ai/artifact/FkS5WTabmUmeKUgSDiGTuw. Das Dokument enthält:
- Bilanz der Versuche seit dem 04.10.
- was gut funktioniert und was nicht (deutlich)
- Schwerpunkte und die Kernfrage „Wie entsteht ein Wesen?“
- Vorschläge für Beine und körperweite Strukturen (Büschel, Mähnen, Kämme, Stacheln, Federn, Flossen) mit Recherche
- Ideen für einen einzigartigen Editor; was „besser und schneller als Blender“ heißt (Abschnitt 0)
- Vorschlag für den Ablauf, offene Fragen, Prüfwesen, Landkarte

Zum Branch:
- Branch `claude/editor-grundlayout`, gepusht. Merge nach `main` erst nach Florians Abnahme.
- Nicht von uns: `assets/fonts/Hippie Movement.otf` (unverfolgt, nicht committen).

## Stand je Bereich

| Bereich | Stand |
|---|---|
| **Editor-Gerüst** | Im Test bewährt, darf durch Besseres ersetzt werden: Kurven wie Illustrator, Navigation wie Blender mit Trackpad, Layout nach Figma, Seitenleiste immer offen, Tab-Punkte, Library, Speichern, Dokument mit zod-Schema. 23 E2E-Tests grün. |
| **3D-Körper** | Versuch. Es gibt fünf Bauwege (Platzhalter-Loft, Kanten-, Maul-, Tiger-, Wirbelsäulen-Käfig), die sich nicht kombinieren lassen. Abweichung bis 16 px ohne und 24 px mit Maul. Weiß mit Matcap. |
| **Wirbelsäule** | Versuch, trägt: Hals hoch, Kopf drauf; selbst zeichnen; Biegen als Pose; Maul im gestreckten Raum (Behelf). |
| **Maul, Zähne, Rig** | Versuch, trägt im Prinzip: feste Topologie, Reißverschluss, Tasche, Kiefer als Knochen plus Korrektur, Zähne am Zahnfleisch, Maulspalt, Fressen-Form. Offen: Durchdringungen, Maul nur vorn an der Schnauze, eigener Käfig, Look. |
| **Kanten, Spanten** | Versuch. Die Faustregel „Eine Kante ist eine Ecke in einem Shape“ trug. Spanten sind auf Höhe × Breite normiert und wirken deshalb global. |
| **Beine, Flügel, Schwänze** | im neuen Editor nicht vorhanden (Werkstatt-Wissen vorhanden) |
| **Büschel, Mähnen, Kämme, Stacheln, Federn, Flossen** | nicht vorhanden |
| **Look** | Im Editor fehlt der Earle-Look. Muster, Zonen, Glimmer und Jelly liegen in `packages/render/src/creature2`. |

## Nächster Schritt

1. **Phase 0 mit Florian:** offene Fragen F1–F13 (Abschnitt 11 des Einstiegsdokuments), Maß „besser und schneller als Blender“, Prüfwesen, Reihenfolge.
2. **Phase 1, Entscheidungstest des Kerns** (Vorschlag; ein besserer Weg ist willkommen):
   - Käfig mit Kappe, Schnauzenringen und Maul in den Kopfringen
   - Spanten an Linien, ein Säulenbein, einfaches Earle-Material
   - Messung an Rex und Langhals

## Detail-Dokumente (11.–12.10.)

- Wirbelsäule und ein Netz: [`docs/plans/2026-10-12-wirbelsaeule-ein-netz.md`](plans/2026-10-12-wirbelsaeule-ein-netz.md)
- Wirbelsäule zeichnen, Pose-Form, Maul auf der Wirbelsäule, Maulloch: [`docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`](plans/2026-10-12-wirbelsaeule-maul-fressen.md)
- Maul, Zähne, Rig, Augen (Recherche B1–B4): [`docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`](research/2026-10-12-maul-kiefer-zaehne-augen.md), Seite https://claude.ai/artifact/WG3YJPn4SuL5acnY9yR9s1
- Kanten, Back/Bottom, Spanten, Kopplung: [`docs/research/2026-10-12-kanten-ansichten.md`](research/2026-10-12-kanten-ansichten.md), Pläne [`2026-10-12-kanten-ansichten.md`](plans/2026-10-12-kanten-ansichten.md), [`2026-10-12-spanten.md`](plans/2026-10-12-spanten.md)
- Machbarkeit Tiger-Konzept: [`docs/research/2026-10-11-silhouetten-kanten-machbarkeit.md`](research/2026-10-11-silhouetten-kanten-machbarkeit.md)
- Plan Maul, Zähne, Rig: [`docs/plans/2026-10-12-maul-zaehne-rig.md`](plans/2026-10-12-maul-zaehne-rig.md); Grundlayout: [`docs/plans/2026-10-11-editor-grundlayout.md`](plans/2026-10-11-editor-grundlayout.md)
- Editor-Gedächtnis und Fallen: [`apps/editor/CLAUDE.md`](../apps/editor/CLAUDE.md)
- Wesen-Werkstatt (07.–09.10.): `git show 6029362:docs/UEBERGABE.md`

## Prüfen

- `pnpm typecheck`, `pnpm test`, `pnpm lint`
- E2E mit echter GPU: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e` (schreibt Bilder nach `docs/progress/editor/`; zufällig neu geschriebene Bilder vor dem Commit zurücksetzen)
- Editor: `pnpm editor`, Web-Modus `editor-web` (Port 5180)
