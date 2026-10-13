# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-14 abends, Branch `claude/editor-grundlayout`. **Phase 1 „Kern breit“ läuft** nach dem Fahrplan [`docs/plans/2026-10-14-phase-1-kern.md`](plans/2026-10-14-phase-1-kern.md) (Florian 14.10. nachts: „los mit Phase 1“). Phase 0 ist ganz gebaut (Beweise 1–5, Urteile zu 4 und 5 offen; offene Kritik im Register [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md)). Grundlage bleibt der Plan [`docs/plans/2026-10-13-wesen-editor-2.md`](plans/2026-10-13-wesen-editor-2.md): ein Subdivision-Käfig als einzige Wahrheit, Florians Kurven als Griffe, Earle-Look live, eine Szene mit vier Kameras.

## Was in Phase 1 steht

- **M1 Fundament (gebaut):** Wesen-Bau DOM-frei in `packages/shape/src/kern/wesen.ts` (`Bauplan` = Daten, `wesenBauen(dok, plan, stand, schnell)`, `wesenAnimieren`, Stand-Cache per Wert-Schlüssel), Editor-Worker (`apps/editor/src/kern/wesen.worker.ts`, `wesenClient.ts`: „neuester Auftrag gewinnt“), `kernBau.ts` nur Adapter; Dokument **Version 1** mit `ausstattung` (Maul, Beine, Stil, Kasten, Augen, Gesicht, Zonen) und Migration v0 → v1 beim Lesen. Der Käfig selbst kommt erst mit den Pinseln ins Dokument (sonst totes Feld).
- **M2 Bühne (gebaut):** Seite, Front, Top zeigen denselben Körper orthografisch hinter den Kurven (`Renderer3D.setzeBlaetter`; Top spiegelt statt Bottom, editierbare Hälfte unter der Achse); Picking `Renderer3D.treffen` + `trefferDeuten` (Dreieck → Käfigfläche, (u, v), nächster Käfigpunkt), Marke beim Hover, `window.__editor.treffen`. Verschoben: Layouts Papier/Nacht/Brett (mit der Tafel), Picking in den Blättern (mit den Griffen).
- **M3 Griffe und Werkzeuge, Teil 1 (gebaut, 14.10. abends):**
  - **Gezeichnete Maullinie baut den Kern.** Die Lippenlinie aus dem Maul-Tab (`dok.maul.zu.oben`, Stift ab Kontur oder Achse) wird in `bauplanAus` (kernBau) über `abtasten3` + `maulLinieAusPunkten` zur Maullinie des Kerns; die Prüfwesen-Linie (Tiger) ist nur noch Rückfall; Chip „aus“ wird „vorn“. Robust gemacht: Punkte in der Spitzenregion (Sprosse < 15 % der längsten) fallen am Anfang weg, die Lippenhöhe ist auf 0,1 … 0,9 begrenzt (eine Linie auf oder unter der Kontur ergab 2 Durchdringungen geschlossen, Lippe auf der Naht). Auf Kastenfronten erzwingt `maulLage` die Lippe durch die Spitze. Tests (`beweis2.test.ts`): Rex sauber gezeichnet und Rex schlampig (unter der Kontur entlang) je **0 Durchdringungen bei 0/25/50/75/100 %**, Lippe ≤ 1,5 px von der Zeichnung, Umbau 48 ms (Stufe 2).
  - **Augen per Klick.** Stufe „Augen“ (Tab-Knopf weiß): ein Klick ohne Bewegung auf den Körper der Bühne setzt das Auge aus dem Treffer (Käfigpunkt < R·N = Ringpunkt → Ring ⌊i/N⌋, Winkel rechts gespiegelt) in `ausstattung.augen` des Dokuments (`augeSetzen` in `Steuerung3D`); geänderte Ausstattung baut neu. E2E-Haken `window.__editor.wesen()` (Vorlage, Augen, Zähne, Lippenband, Ecken, Umbauzeit).
  - Bilder: `docs/progress/editor/kern-m3-rex-auge-klick.png` (Auge nach Klick, Ring 4), `kern-m3-rex-maul-gezeichnet.png` (Rex mit gezeichneter Dreipunkt-Linie, Haps 60 %, Umbau im Editor 130 ms auf Stufe 3).

## Ehrlich offen

- **M3 Rest:** Reifen (Spanten als Ringe mit Perlen, ⌃R), Breitenlinie (Top), Kantenlinie mit Härte → Falte, Pinsel auf Käfigpunkten (Ziehen G, Aufblasen, Glätten; dann Käfig ins Dokument), Kieferknopf (Öffnung heute als Regler), Augenrand = Größe, Taste T, Tafel/Stamm/Dock statt Seitenleiste, Layouts Papier/Nacht/Brett, Picking in den Blättern. Abnahme M3 = Abnahme der Phase: Florian baut den Tiger-Kopf (Kasten über zwei Reifen, Maullinie, Augen) in ≤ 10 min.
- **M4:** Bogen-Import (Pauspapier, Nachzeichnen nach TypeScript, Saum), Kerne aus `versuch/` herauslösen, alte Bauwege/View2D/Szene3D-Kaskade/Seitenleiste/`?versuch=` löschen, gemeinsame E2E-Fixture.
- **Aus Phase 0 (Register):** Beweis 1: Front/Top-Widersprüche still für die kleinere Breite, Ente nur mit Teilen, dichte LU. Beweis 2: Rachen-/Kieferlinie als Griffe, Kiefer getrennt/Überbiss (Florian wichtig, Phase 2), Zunge, sehr dünne Hälse. Beweis 4: Augen im Mesh, Kinn, Formen zeichnen (Zonen). Beweis 5: Feuer fehlen Verläufe, Gas weit von der Vorlage (Florian), Innenbänder, Locken als Kurve, Fell als Abstandsfeld.
- Florians Urteile zu Beweis 4 (Tiger-Kopf, `docs/progress/editor/vergleich-tiger-kopf.png`) und Beweis 5 (Runde 2) stehen aus.

## Nächster Schritt

M3 Teil 2: Reifen als Griffe auf dem Körper (Spanten → Ringe mit Perlen, ⌃R setzt einen neuen senkrecht zur örtlichen Achse; Front/Back zeigen den gewählten Reifen als Kurve; der Kasten des Tigers aus zwei Reifen mit Ecken), danach Pinsel auf Käfigpunkten mit Käfig im Dokument, dann Tafel/Stamm/Dock. Jeder Teil mit Tests (Durchdringungen, px, ms), Bildern, Push und dieser Datei.

## Bedienung des Tabs „kern“ (für Florians Test)

`pnpm editor` oder Web-Modus (`editor-web`, Port 5180), dann `?versuch=kern&wesen=kugel|rex|langhals|ueberhang|tiger|drache|zwiebel&bauweise=kern&look=earle&palette=tiger|rex|blob|giraffe`, dazu `&maul=vorn|unten|hals&oeffnung=0…1&kaefig=1`, `&beine=verschmolzen|angesteckt&schwung=35&zebra=1`, `&stil=feuer|gas|fell`, `&kamera=az°,el°,dist,zx,zy,zz`. Maul-Tab (blau): Stift zeichnet die Lippenlinie ab Kontur oder Achse → der Kern baut das Maul. Augen-Tab (weiß): Klick auf den Körper setzt das Auge. Nach dem Pull den Dev-Server neu starten (HMR-Falle).
