# Übergabe (Stand 04.11.2026: P1 abgeschlossen; P2 „Stücknetz im Maulfeld“ Tag 1–4 gebaut — alle zehn Fälle bauen, Haut 9 von 10, Mundwinkel 8 von 10, ein Drittel der Flächen des Kernrings, zwei Falten neben der Lippe offen; Abnahme offen)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix. **Diese Datei ist der Einstieg für eine frische Sitzung.** Der Kernring
bleibt eingefroren; alles Neue liegt hinter Schaltern (`stufen`, `umrissPlan`), ohne Schalter bitgleich.

## Was am 02.11. passiert ist (Schritt 2 des Vorgehens vom 21.10.)

1. **Florians Klarstellungen, Teil 1** wörtlich gespeichert: [`docs/plans/2026-10-22-klarstellungen.md`](plans/2026-10-22-klarstellungen.md).
   Kern: Die drei Ansichten sind **Outline-Illustrationen je Teil** (verdeckte Linien blass/gestrichelt und bearbeitbar; der
   Bauch läuft von oben unter dem Kopf durch, die zwei Zusatzpunkte der Vereinigungs-Silhouette entfallen), **Loops sind
   gezeichnete Linien** („die meisten Kanten Edgeloops“), Härte = Strich 0–3 px, ohne Kante **„so rund wie möglich“**, zu viel
   Fokus auf Spanten und Silhouetten → Werkzeuge prüfen, **Spielqualität von Anfang an umschaltbar**. Teil 2 (Bausteine) kommt
   später: Platzhalter [`docs/plans/2026-10-22-bausteine-wuensche.md`](plans/2026-10-22-bausteine-wuensche.md).
2. **Gegenprüfung** [`docs/plans/2026-11-02-gegenpruefung-liniennetz.md`](plans/2026-11-02-gegenpruefung-liniennetz.md):
   „Ein Liniennetz, ein Löser“ bleibt das Zielbild; die Klarstellungen machen es einfacher — Umrissschleifen je Teil statt einer
   Silhouette, Loops als Linien (Spant, Reifen, ⌘R werden eins), Fairness ohne Zielform statt Füllung aus der Sichthülle, der
   Käfig ist das Spielnetz. Zehn Lücken/Denkfehler (Abschnitt 4), Werkzeugtabelle (zwölf Dinge entfallen, Abschnitt 5),
   13 Ideen (Abschnitt 6), acht Entscheidungen für Florian (Abschnitt 10).
3. **Prüfplan P0–P3** [`docs/plans/2026-11-02-pruefplan-p0-p3.md`](plans/2026-11-02-pruefplan-p0-p3.md): P0a Spielstufe im
   Editor (1–2 Tage), P0b iPhone (mit Florian), P1 „Ansichten als Illustration“ (4–5 Tage), P2 „Stücknetz im Maulfeld“ mit
   Budget-Tor (3–5 Tage), P3 „Loops und Linien am ganzen Körper“ (4–5 Tage); je Fälle, Maße, Tore, Bilder, Abbruch, „Was du
   siehst“. Zusammen 14–19 Arbeitstage.
4. **Recherchen und Inventar:** [`docs/research/2026-11-02-recherche-linienzeichnung-3d.md`](research/2026-11-02-recherche-linienzeichnung-3d.md)
   (kein veröffentlichtes System deckt das Zielbild ganz ab; Zutaten belegt: Prasad/Cashman, Schaefer 2004, Monster Mash,
   Dual Strip Weaving, ConTesse), [`docs/research/2026-11-02-recherche-spielnetz.md`](research/2026-11-02-recherche-spielnetz.md)
   (Stufe 1 mit Grenzflächen-Lagen und -Normalen, Fehler gegen die Grenzfläche, Budgetregel 8 · Käfigflächen),
   [`docs/research/2026-11-02-inventar-editor.md`](research/2026-11-02-inventar-editor.md) (alle Werkzeuge, Chips, Linienstile).
5. **Messung Spielstufe** (heutiger Käfig auf Stufe 1): [`docs/progress/editor/spielstufe-2026-11-02.md`](progress/editor/spielstufe-2026-11-02.md),
   Skript `apps/editor/scripts/pruefen/spielstufe.ts` (+ `spielstufe-bild.mjs`); Zahlen in der Gegenprüfung, Abschnitt 8. Kern:
   Stufe 1 trägt das Budget nur ohne Maul (3 200–6 288 Dreiecke; der Einsatz auf K2 liegt beim 2,4–3,2-Fachen schon auf
   Stufe 0); der Spiel-Umriss ist auf der Grenzlage 0,4–2,8 px polygonal; die Facetten abseits der Falten (Rex 133°, Langhals
   53°) sind Käfigfehler, die Stufe 3 verdeckt; **flache Flanken kommen aus den gezeichneten Querschnitten, nicht aus
   „berühren mittel“** (≤ 3,2 Punkte) — Korrektur an der Recherche vom 21.10.
6. Nebenbei committet: die am 22.10. liegengebliebene Korrektur des Strahlrasters (V8-Fehler, `rasterZelle`,
   `raster-gleichlauf.ts`; Test grün).

## 03.11.: Freigabe und P0a gebaut (Abnahme offen)

Florian (03.11.): „Die Einordnung ist klar. Gegenprüfung und Prüfplan sind freigegeben, E1–E8 wie vorgeschlagen; starte
Schritt 3 mit P0a.“ Vorher kam der Abschnitt 0a in die Gegenprüfung (altes System wird ersetzt, Nebensession in der Richtung
richtig, Zielbild ist der neue Weg).

**P0a „Spielstufe im Editor“ ist gebaut** (Planseite „Stand P0a“ im Prüfplan, Register „Befunde aus P0a“):
- Kern `packages/shape/src/kern/spielstufe.ts`: Bauplan-Option `stufen` (1 = Spielnetz) — Eckenwerte der Stufe 3 auf die Ecken
  der Stufe 1 umsortiert (Punkte auf der Grenzfläche, Normalen der glatten Fläche; ohne Option bitgleich), `WesenInfo.spiel`;
  auch auf dem Baum; mit Augapfel-Höhle/Rundmaul noch Stufe 3 (Grund im Feld).
- Editor: Eckknopf „Spiel“ auf der Bühne (Schachbrett), Tafel Spiel (Chips Editor | Spiel, Normalen Grenzfläche | roh,
  Dreiecke, Umriss in Gerätepixeln), Bühnentitel „Spiel · 3 200 / 8 000 Dreiecke · Umriss ≤ x px“; `?spiel=1`; Haken
  `__editor.spiel()`.
- Tore als Tests `kern/spielstufe.test.ts` (Budget überall ✓; Umriss- und Facetten-Tor an Rex, Langhals, Robbe, Tigerkopf,
  Kegel verfehlt → `it.fails`, Ursache 16 Punkte je Ring und Käfigfehler unter Stufe 3; Pose-Tor am Rex verfehlt).
- Bilder `docs/progress/editor/p0a-spielstufe-{roehre,teile,maul}-2026-11-03.jpg`, `p0a-spielgroesse-2026-11-03.jpg`
  (Skript `apps/editor/scripts/pruefen/p0a-spielstufe.mjs`): bei 300 px Höhe ist Stufe 1 mit Grenznormalen von Stufe 3 nicht
  zu unterscheiden, auch mit offenem Maul.

Florian (03.11.): „Die P0a-Bögen passen so weit. Weiter mit P1 „Ansichten als Illustration“ nach dem Prüfplan.“ (P0b auf
dem iPhone, sobald er da ist.)

## 03.11.: P1 Tag 1 „Umrissschleifen geplant“ gebaut (Abnahme offen)

Planseite „Stand P1 Tag 1“ im Prüfplan, Register „Befunde aus P1 Tag 1“.
- **Kern `packages/shape/src/kern/umrissPlan.ts`** (hinter `Bauplan.umrissPlan`, ohne Option bitgleich): Umrissschleifen je
  Ansicht allein aus den drei Zeichnungen — Tiefe je Probe aus der Sichthülle (2 px innen abgetastet), Intervallwahl per
  Viterbi, Tiefe mit kleinster Biegung in den Intervallen (aktive Menge, pentadiagonal), **T-Stöße = konkave Ecken**, Sehnen
  zerlegen die Zeichnung in einen Flächenbaum, jede Fläche eine geschlossene Schleife mit Vorschlägen über die Sehnen
  (verdeckte Fortsetzung des ferneren Teils, sichtbare Schlusskontur des näheren; Seite: alles verdeckt). Keine Zusatzpunkte.
- **Liniennetz und Editor:** Züge `plan-*` in `netzSicht`; Chip „umrisse geplant“ (Tafel Körper, `ui.netzUmrisse`); eigenes
  Blatt zeigt die Vorschläge (blass / dünn), fremde Blätter die Schleifen; `umrissSvg` = dasselbe Bild als SVG (Tor d im
  Editor 0,008–0,012 px); Haken `__editor.umrissPlan()`, `__editor.umrissSvg(blatt)`. Der Körper ist noch der heutige.
- **Tore** (`kern/umrissPlan.test.ts`, 16 Tests grün): (a) 0 px (V2 heute: 20 % der Punkte über 0,2 px, max 26 px), (b) 10 von
  11 Körpern, Robbe Top von der Zeichnung erzwungen, (c) Langhals/Ente/Pilz schließen ohne Teilerkennung, (d) ≤ 0,012 px,
  (e) 1,3–4,7 ms Kern, 8,5–13 ms Editor.
- **Bild** `docs/progress/editor/p1-umrissschleifen-2026-11-03.jpg` (Langhals, Ente, Kegel, Robbe: heute | geplant je Blatt);
  Skripte `apps/editor/scripts/pruefen/p1-plan.mjs`, `umriss-plan-diag.ts`.
- **Offen:** Tiefe aus Vereinigungs-Intervallen (Hals liegt in der Mitte der Vereinigung), Schlusskontur nur interpoliert,
  keine ganz verdeckten Schleifen, jede konkave Ecke ein T-Stoß, Umschalten 0,7–0,9 s (ganzes Liniennetz neu).

## 03.11.: P1 Tag 2–3 „Körper aus den Schleifen“ gebaut — Tore verfehlt, Abbruchkriterium trifft (Entscheidung offen)

Planseite „Stand P1 Tag 2–3“ im Prüfplan (mit der Entscheidung A/B/C), Register „Befunde aus P1 Tag 2–3“.
- **Kern `packages/shape/src/kern/schleifenKoerper.ts`** (hinter `Bauplan.schleifenKoerper`, ohne Option bitgleich): ein
  gekoppelter 3n-Löser — Naht (z = 0, quer zur Kurve), Top- und Front-Schleifen über die nächsten feinen Punkte (Lage längs der
  Umrissnormale, P·w stationär quer zur Schleife; längs und Tiefe frei), schrittweise Ziele, ferne Proben weich, Zielform
  des heutigen Baus als Füllung (Abweichung vom Plan: ohne Zielform keine Form). Planer: Front-Tiefe aus der berührenden
  elliptischen Station (`frontSoll`), nicht mehr Intervallmitte.
- **Editor:** Tafel Körper → „Körper heute | aus den Schleifen (P1)“ (`?schleifen=1`) mit Rest/Überstand/Lösezeit; Worker
  merkt den Körper je Form, Pinsel und Plan; Haken `__editor.schleifenKoerper()`.
- **Ergebnis:** nur die Kugel hält alle Tore; Kegel Front 7,3 → 3,9 px, Robbe Front 6,2 → 1,0 und Top 12,5 → 5,1, Vase Top
  13,8 → 6,5 — aber umgeklappte Flächen an sieben Körpern (Flossen, Hut, Brust, Kasten-Kappen: was die Röhre nicht hat),
  Seite an Robbe/Rex/Langhals schlechter, Lösen 400–670 ms (Tor 50). Tests `kern/schleifenKoerper.test.ts` (Kugel `it`,
  neun `it.fails`), `umrissPlan.test.ts` (Front-Tor b als `it.fails`).
- **Bilder:** `docs/progress/editor/p1-koerper-2026-11-03.jpg` (Blätter mit Δ, Bühne, Zebra; heute | neu),
  `p1-koerper-draht-{kegel,robbe,langhals,pilz}-2026-11-03.jpg` (Drahtgitter); Skripte `p1-koerper.ts` (Messreihe),
  `p1-koerper-bild.ts` + `html-shot.mjs` (Drahtgitter), `p1-koerper-editor.mjs` (Editor-Bogen).

**Nächster Schritt: Florians Entscheidung** (Planseite, Ende von „Stand P1 Tag 2–3“): **A** Kandidat B (Umrisse wie heute,
Stücknetz nur für Einsätze, Schleifen als ruhige Anzeige und Griffe), **B** weiter in P1 mit „Struktur folgt den Schleifen“
(Ringe und Teile aus den Schleifen, 3–5 Tage, Ausgang offen), **C** Mischform (weiche Bindung als Standard, sichtbare
Δ-Verbesserung ohne exakte Umrisse). Bis dahin ist der Chip ein Versuch (Standard „Körper heute“). Danach je nach Wahl P1 Tag
4–5, P2 oder P3. Start-Prompt für eine frische Sitzung:

> Lies `CLAUDE.md`, `docs/UEBERGABE.md` und den Prüfplan `docs/plans/2026-11-02-pruefplan-p0-p3.md` (Stand P1 Tag 1 und Tag
> 2–3 mit der Entscheidung A/B/C). Meine Entscheidung: […]. Arbeite danach streng nach Plan: im Kern hinter Schaltern, ohne
> Schalter bitgleich, der Kernring bleibt eingefroren; Tore als Tests (verfehlte als `it.fails` mit Registereintrag),
> Kontaktbögen, Planseite „Stand“, Register, Übergabe, Commit und Push. Nichts als bestanden melden; nach jedem Beweis anhalten
> und mir die Bilder zeigen.

## 03.11. abends: P1 Tag 2–3, zweiter Anlauf — Schleifen-Käfig gebaut (Abnahme offen)

Florian zur Entscheidung A/B/C: „Die Linie und das Modell sind doch exakt das selbe … die aktuell gelbe Linie sollte eigentlich die
schwarze Linie sein.“ Antwort (steht auf der Planseite): Er hat recht — mit Umrissen je Teil und gekoppelten Kreuzungen gibt es
praktisch keine Widersprüche; die Lücken kamen aus dem Bau (Schlauch aus der Seite). Seine Entscheidung: „ok, dann machen wir es
so!“ — das Netz direkt aus den Schleifen, zuerst für ein Teil. Planseite „Stand P1 Tag 2–3, zweiter Anlauf“, Register „Befunde aus
P1 Tag 2–3, zweiter Anlauf“.
- **Kern `packages/shape/src/kern/schleifenKaefig.ts`** (hinter `Bauplan.schleifenKaefig`, ohne Option bitgleich): die drei
  Umrissschleifen sind Käfigreihen (Naht, Reihe N/4 samt Kappenmitte, ein Ring), sechs Kreuzungen (flache Läufe → Mitte), Anker beim
  gleichen Bogenanteil, Inneres = die auf die Anker gestreckte Ringschleife (Kippen nach Ringbreite), Achse x oder y nach der
  längeren Ausdehnung, Falten aus Ecken-Knoten (Ring, Reihe + Kappendiagonale, Spitze; gebündelt je Seite), Schleifentiefe neu mit
  kleinster Biegung, ein gekoppelter Löser (Schleifen und Falten hart, Silhouettenbedingung, Inneres weich, Glättung der
  Abweichung). Planer-Korrekturen: Winkelhalbierende an Ecken, Sehne an grifflosen Knoten.
- **Editor:** Tafel Körper → „Körper heute | Löser (P1) | Schleifen-Käfig (P1)“ (`?schleifen=2`) mit Achse, Ring, Rest,
  Silhouette, Innen, Überstand, Kippung, Falten, Bauzeit; Worker merkt den Käfig je Form; Haken `__editor.schleifenKaefig()`.
- **Prüfkörper `kern/pruefen/einteiler.ts`:** Kugel, Ei, scharfer Würfel, Zylinder, runde Vase (saubere Einteiler), Kegel, Stift-Würfel,
  Vase aus der Kugel. **Ergebnis:** Kugel 0,1, Ei 0,1/0,4/0,1, scharfer Würfel 0,3 px (Falten 0°, Knicke 0°) halten alle Tore;
  Zylinder 0,7/1,0 und runde Vase 1,3 px (Randecken, enge Rundungen bei 16 Punkten je Ring) halten die Glätte; Kegel (Kippung 84 px,
  Kappe faltet, Knicke 38°), Stift-Würfel (Rundung gegen Falte 1,7–2,2 px) und Vase aus der Kugel (Messerkante, Front 6,3) nicht.
  Tests `kern/schleifenKaefig.test.ts` (11 grün, 8 `it.fails`), `umrissPlan.test.ts` und `schleifenKoerper.test.ts` weiter grün.
- **Bilder:** `docs/progress/editor/p1-kaefig-2026-11-03.jpg` (acht Fälle, Blätter mit Δ, Bühne, Zebra; heute | Käfig),
  `p1-kaefig-draht-<fall>-2026-11-03.jpg` (Drahtgitter); Skripte `p1-kaefig.ts` (Messreihe), `p1-koerper-bild.ts` mit `BAU=kaefig`,
  `p1-kaefig-editor.mjs` (Editor-Bogen).

**Nächster Schritt: Teile an der Naht** (Langhals, Ente, Robbe, Pilz) — der Flächenbaum von Tag 1 gibt Teile und Nähte, das
Kind-Teil hängt über ein Fenster im Eltern-Gitter (Beweis 3, S6/S7), seine Schleifen enden an der Naht; Tor wie hier je Teil,
Abbruch, wenn eine Naht nicht glatt wird. Danach P2 (Maul). Vorher Florians Blick auf die Bögen. Daneben offen (Register): Dichte
je Ring, gekippte Ringe (Kegel), Pinsel-Deltas im Käfig, Tag 4 (Griffe an den Schleifen) und Tag 5. Start-Prompt:

> Lies `CLAUDE.md`, `docs/UEBERGABE.md` und den Prüfplan `docs/plans/2026-11-02-pruefplan-p0-p3.md` („Stand P1 Tag 2–3, zweiter
> Anlauf“). Baue den nächsten Beweis „Teile an der Naht“ (Langhals, Ente, Robbe, Pilz) auf dem Schleifen-Käfig: im Kern hinter
> dem Schalter `schleifenKaefig`, ohne Schalter bitgleich, der Kernring bleibt eingefroren; Tore als Tests (verfehlte als `it.fails`
> mit Registereintrag), Kontaktbögen, Planseite „Stand“, Register, Übergabe, Commit und Push. Nichts als bestanden melden; nach dem
> Beweis anhalten und mir die Bilder zeigen.

## 03.11. nachts: P1 Tag 4–5 „Teile an der Naht“ gebaut (Abnahme offen; Abbruchkriterium trifft an drei von vier Körpern)

Florian: „Ja, bau den nächsten Beweis „Teile an der Naht“ (Langhals, Ente, Robbe, Pilz) auf dem Schleifen-Käfig, hinter dem
Schalter, ohne Schalter bitgleich.“ Planseite „Stand P1 Tag 4–5“, Register „Befunde aus P1 Tag 4–5“.
- **Kern `packages/shape/src/kern/schleifenTeile.ts`** (Einstieg `schleifenKaefig.ts` entscheidet Einteiler | Teile; die Stücke des
  Einteil-Baus liegen jetzt in `schleifenKern.ts`): Kinder aus Teilbaum (Mitte-Teile der Seite auf liegendem Rumpf) und Planer
  (konkave Ecken); Rumpf = Einteiler aus Seite mit Sehnen und Front/Top aus der Hülle über dem Rumpfpolygon, ebene Ringe
  (`eben`); Kinder als Röhren über ein Fenster — Streifen längs der Naht (auch über die Kappe) oder Fortsetzung über eine Kappe
  (Pilz-Stiel, Achse y); Kindringe aus der kürzesten monotonen Zuordnung der beiden Bogenseiten, seitlich die Hülle; ein Löser;
  Bericht `teile`. Ohne Option bitgleich, Einteiler unverändert (Tests).
- **Ergebnis:** alle vier bauen. Seite Pilz 0,7 und Langhals 1,3 px; Robbe 4,6, Ente 15,5 px (Schnabel). Front/Top 2–9 px (Breite der
  Kinder aus der Hülle; Pilz Front 31 px = flache Hutunterseite als Messkante; Ente Top 58 px = Flügel fehlen). Naht-Tor (≤ 30°) nur
  Langhals (29°); Robbe 58°, Ente 41°, Pilz 85°. Nach innen je Kind 122–1 214. Tests `kern/schleifenTeile.test.ts`: 8 grün, 14
  `it.fails`; `schleifenKaefig.test.ts` weiter 11 grün / 8 `it.fails`.
- **Bilder:** `docs/progress/editor/p1-teile-2026-11-03.jpg` (Editor: Blätter mit Δ, Bühne, Zebra; heute | Teile),
  `p1-teile-draht-<fall>-2026-11-03.jpg` (Drahtgitter, vier Fälle). Editor: Tafel Körper → Chip „Schleifen-Käfig (P1)“ zeigt
  „Teile an der Naht“ (Kinder, Fenster, Nahtknick, ausgelassene).
- **Verworfen (gemessen):** beschnittene Zeichnungsschleifen für den Rumpf (Robbe 178 px Kippung), Kinder-Paarung nach Bogenanteil
  (Ente 35 px) / Höhe (Ente 58 px) / Innennormale (Pilz 12, Robbe 29 px), ebene Ringe für Einteiler (Würfel, Zylinder 180°),
  Knick-Kriterium an den Sehnenenden (trennt Vase und Langhals nicht), Band-/Sehnen-Ausdehnung (ebenso).

## 03.11. abends: Tag 4–5 weitergeführt — Naht weich, Hülle als Obergrenze, Flügel, Röhrenende (Abnahme offen)

Florian zum Stand nachts: „Also geht es nicht? ich verstehe deine erklärungen nicht …“ → Klarstellung (es geht; der Stopp war die
Regel des Prüfplans) und Empfehlung Naht → Breite → Flügel; Florian: „dann gerne weitere wie du empfiehlst.“ Planseite „Nachtrag
03.11. abends“ unter „Stand P1 Tag 4–5“, Register „Nachtrag 03.11. abends“. Alles im Kern hinter dem Schalter, bitgleich ohne.
- **Gebaut:** Naht weich (absolute Glättung am Fensterrand und an den Schulterringen, `nahtGlatt`); Hülle als Obergrenze für alle
  Zielpunkte (`huelleKlemmt`) und Hüllenringe statt Ellipsen (`huellenRing`); **Flügel als seitliches Paar** (Kinder der Top-Ebene
  mit Spiegel, Fenster auf der Flanke, Höhenschnitte, Dicke aus Front bei z und Seite bei x, Klemme der Dicke statt der
  seitlichen Lage); **Röhrenende = Ende der Wirbelsäule** (die Ente trägt den Kopf quer: Schnabel statt Scheitel, Robbe Nase);
  **Silhouettenbedingung je Ring** in der Ansicht, die ihn von der Kante sieht (Langhals-Kopfscheiben laufen längs x → Top);
  Nahtknick getrennt frei / an gezeichneten Ecken, „nach innen“ mit Flächenanteil.
- **Ergebnis:** Ente Seite 15,5 → 2,9, Top 57,7 → 2,7 px (Hals, Kopf, Schnabel, Flügel); Robbe Top 12,5 → 5,4, nach innen 176 → 0;
  Langhals 1,0/4,6/2,9 px, nach innen 888 → 26; Pilz 0,9/0,8/2,0. Naht frei: Langhals 17,9°, Ente 20,2° ✓, Robbe 37,0° (Falte an den
  Fensterflanken, echter Befund), Pilz ohne freie Kante (gezeichnete Kante ringsum, 33,9°). Front/Top hält nur der Pilz. Tests
  `schleifenTeile.test.ts` 10 grün / 12 `it.fails`; `schleifenKaefig.test.ts` unverändert (bitgleich).
- **Bilder:** `docs/progress/editor/p1-teile-2026-11-03.jpg` (Editor-Bogen), `p1-teile-draht-<fall>-2026-11-03.jpg` (Drahtgitter,
  vier Fälle, heute | Teile) — beide überschrieben mit dem Abendstand.
- **Verworfen (gemessen):** Scheitelschub (Robbe 1,5 → 4,7 px), Klemme in z für Paare (787 Flächen je Flügel), flacher Lauf um das
  Wirbelsäulenende (Spitze lief zurück in den Scheitel), Silhouettenbedingung je Kind in einer Ansicht (888 Flächen).

## 03.11. nachts: Robbenkopf als Endstück (Abnahme offen)

Florian: „Mach weiter mit der Robbe-Falte an den Fensterflanken (Kopf als Fortsetzung über die Brustkappe oder breiteres Fenster),
dann Breite der Kinder aus eigenen Front-/Top-Schleifen.“ Planseite „Nachtrag 03.11. nachts“, Register „Nachtrag 03.11. nachts“.
- **Befund:** Die Robbe hat in keiner Ansicht eine gezeichnete Ecke; der Kopf ist das Ende der Körperröhre (vorderes Sehnenende an der
  Brustspitze). Als Streifen schlossen die Rumpfringe unter der Sehne zur Kuppel → Kopfwand 37° auf der Rumpfhaut; ein breiteres
  Fenster hilft nicht (40°).
- **Gebaut — Endstück** (Option `endstueck`, Standard an): Rand = Ring durch das hintere Sehnenende, Kappe und Ringe davor laufen als
  freie Kopfringe weiter; Seite am Vorderende am Rumpfumriss entlang verlängert; Paarung beider Seiten im gleichen Bogenanteil;
  alle Ringpunkte hart, keine Silhouettenbänder, keine Kappenmaske; Höhentest Ring ≤ 1,5 Sehnen (sonst wird der Langhals-Hals zum
  Endstück). Tafel „Endstück ab Ring k“. Messfehler „nach innen“ am Rumpf behoben (Mitte aus den Rumpfflächen).
- **Ergebnis:** Robbe Naht 37,0 → 27,6° (hält), Knicke max 141 → 68°, nach innen 0 / 6, Rest 0,2, Überstand 1,1 px; aber Front/Top
  12,4/9,6 px (vorher 7,4/5,4): Bauchecken und breiteste Stelle fallen zwischen die 16 Ringpunkte. Langhals, Ente, Pilz unverändert.
  Tests 11 grün / 11 `it.fails`.
- **„Breite der Kinder aus eigenen Front-/Top-Schleifen“ bringt nichts:** Planer-Flächen gibt es nur an T-Stößen, dort misst die Hülle
  schon die Schleife des Teils; die Front-/Top-Fehler liegen am Rumpfboden (Abtastung). Befund auf der Planseite und im Register.
- **Verworfen (gemessen):** kürzeste Zuordnung fürs Endstück (Fächer an der Kehle, Front 13 px), Röhrenringe als Pfad (Seite 8, Top
  15 px), weiche Ringpunkte (36 px über die Schulter), Silhouettenbänder an Hüllenringen (Rest 13 px), breiteres Streifenfenster.
- **Bilder:** `docs/progress/editor/p1-teile-2026-11-03.jpg`, `p1-teile-draht-<fall>-2026-11-03.jpg` (überschrieben).

## 03.11. spätabends: Dichte je Ring — Bauchecken und breiteste Stelle (Abnahme offen)

Florian: „Mach weiter mit der Dichte je Ring (Bauchecken und breiteste Stelle: Front/Top von Robbe, Langhals, Ente).“ Planseite
„Nachtrag 03.11. spätabends“, Register „Nachtrag 03.11. spätabends“.
- **Befund:** Die Ziele selbst lagen innen (Ziele gegen Grenzlagen je Ring gemessen), je Körper anders: Langhals — die Tiefe der
  Top-Schleife lag auf dem Plateau zu hoch und streckte die Ringvorlage senkrecht (Bauchecke rutscht hinauf); Robbe — die
  Endstück-Ringe waren Hüllenschnitt-Ellipsen (sin θ · Hülle: Bauchecke 12 px, Top-Breite 10 px innen) und die Rumpfecke fiel
  zwischen zwei Abtastpunkte; Ente — die Rumpf-Front unter den Flügeln kommt aus der Lobbenschnitt-Sehne (Planer, keine Dichte).
- **Gebaut (Optionen, Standard an, ohne Schalter bitgleich):** `rumpfTiefe: 'vorlage'` (Tiefe der Rumpf-Reihenschleife aus der Höhe
  der breitesten Front-Stelle je x, ins Plateau geklemmt), `ringDichteRumpf: 'kruemmung'` (`dichteKruemmung`, nur Rümpfe mit Kindern:
  Ringvorlage je Viertel nach √κ, Grunddichte 0,5, Kappe 4×, in der Schleifenebene, Ecken und scharfe Rundungen ausgenommen,
  Endzonen höchstens Kreiskrümmung; Einteiler bleiben nach Bogenlänge, `ringDichte: 'bogen'`, weil der Kegel 2,0 → 7,3 px verlor;
  `'spline'` als Versuch), `vorlagenRing` (Endstück-Ringe aus der Vorlage längs der Sehne: Bauchhälfte Vorlage × Seitenbreite, auf
  dem Bauch zur Hülle geblendet; Rückenhälfte Vorlage → Halbellipse); Wendepunkt-Maß mit 1-px-Schwelle.
- **Ergebnis:** Robbe 1,5/12,4/9,6 → 2,5/4,4/3,3 px (Naht 27,6 → 14,2°, 0 nach innen, Knicke 95 % 19,9°: Glätte hält; neu Seite 2,5
  am Rand und Überstand 4,7), Langhals 1,0/4,6/2,9 → 1,0/4,1/2,9 (Bauchecke 4,5 → 1,9, Rest 0,6: Form Seite hält; 4,1 an der
  Kopfkrone des Hals-Kinds), Ente 2,9/3,7/2,7 → 2,9/4,5/2,7 (Naht 25,3°), Pilz 0,7/0,8/2,0. Front/Top ≤ 2 px hält keiner. Tests
  13 grün / 9 `it.fails`; Einteiler 11 / 8 unverändert.
- **Verworfen (gemessen):** Vorlage × Hülle je Stelle (doppelte Front-Breite), steifes Inneres (`innen` 10/100: Naht 29–44°),
  Endzonen ohne Drehung, Dichte ohne Kappe, Krümmung in 3D, Glocke über eine halbe Spanne, Spline-Fehlermaß als Standard,
  Krümmungsdichte für Einteiler (Kegel).
- **Offen:** Kopfkrone und Rückengrat unter dem Kopf (Front-Umriss = Vereinigung von Rumpf und Kopf → Schleifen je Teil mit verdeckter
  Fortsetzung), Bauchecke 4,4 (N 24 im Spielbudget), Überstand 4,7, Ente unter den Flügeln und Halsfenster an den Spalten neben der
  Naht, Langhals-Krone, Kegel-Flanke unter der Krümmungsdichte (ungeklärt).
- **Bilder:** `docs/progress/editor/p1-teile-dichte-2026-11-03.jpg` (Editor-Bogen), `p1-teile-dichte-draht-<fall>-2026-11-03.jpg`.

## 03.11. nachts: P1 abgeschlossen, Schalter abgeräumt, P2 beginnt

Florian: „Bauen wir gerade wieder viele Sonderregeln? Ist der Beweis erbracht oder nicht?“ → ehrliche Bilanz auf der Planseite
(„P1 — Abschluss“): Prinzip bewiesen (Schleifen als Käfigreihen, ein Löser, Teile ohne Nahtfalte, Spielumschalter), Genauigkeit
der Mehrteiler nicht (Front/Top ≤ 2 px hält keiner). Die Restfehler sind strukturell: verdeckte Fortsetzung je Teil (Front und
Top sind die Vereinigung von Rumpf und Kopf — gehört zu P3 als bearbeitbare Linie im Editor) und N je Ring aus dem Spielbudget.
Seine Entscheidung: „Räum die gemessen schlechten Schalter ab, schließ P1 ehrlich auf der Planseite ab und starte P2.“
- **Abgeräumt:** Scheitelschub, Rumpfkippen, feste Spaltenzahl, Spline-Dichte, Krümmungsdichte für Einteiler, Krümmungsgewicht,
  Planer-Tiefe; die Alternativen zu Naht glatt, Hülle als Obergrenze, Hüllenringen, Endstück, harten Endstück-Punkten,
  Vorlagentiefe und Vorlagenring sind keine Schalter mehr (Verhalten fest). `KaefigOptionen`: zwölf Felder. Tests und Messreihe
  bitgleich (24 grün / 17 `it.fails`).
- **Lehre (Gedächtnis):** nächster Schritt nie aus dem Register ableiten; nach jedem Block Regeln zählen, ab der dritten „Struktur
  prüfen“; strukturelle Ursachen bekommen keine Regel.

**P2 „Stücknetz im Maulfeld“** läuft nach dem Prüfplan (Fälle, Bauplan, Tore, Budget-Tor, Abbruch nach fünf Arbeitstagen) und der
Recherche `docs/research/2026-10-21-feldnetz-oder-kernring.md` (Abschnitt 2 und 6); Stand auf der Planseite unter „P2 — Start“.

## 03.11. nachts: P2 Tag 1 „Linien → Stücke“ gebaut (Abnahme offen)

Kern `packages/shape/src/kern/einsatz/stuecke.ts` (eigener Schritt, am Bau nichts geändert, Kernring-Wächter 7/7 grün): Linien in
der Karte (Feldrand, Naht, Schlitz beide Ufer, Verlängerung c → Feldrand, Falten von A0, Schnitte) → Stücke (Dreiecke geflutet,
Umlauf, Löcher) → Ecken nach drei Regeln: Zusammenstöße verschiedener Linien (nicht Lippe → Verlängerung am Mundwinkel); der
Feldrand hat keine Ecken — er ist eine Treppe auf dem Käfiggitter, je Stück eine gerade Seite, seine Stufen werden Fünfer-/Dreierpole,
wie das Gitter außen es vorgibt (Kernring ebenso); Biegungen gezeichneter Linien in der Tangentialebene (ab 45° Gesamtdrehung:
Innenseite Ecke, Außenseite ein Schnitt — der Arm nach der Biegung läuft als Geodäte gerade durch den Knick bis zur nächsten Linie).
Seiten mit Feldkanten, Polen, Ufer und `frei`. Alle zehn Fälle: Dreiecke je ein Stück, 2–5 Seiten, keine konkave Ecke, Mundwinkel
glatt, Feldkanten und Pole stimmen; J-Fälle = Viereck vorn oben, Viereck unten mit Hakenecke, Zweieck hinter dem Haken; Bau 32–86 ms.
Tests `stuecke.test.ts` 4 grün, Tabelle `apps/editor/scripts/pruefen/p2-stuecke.ts`, Bild `docs/progress/editor/p2-stuecke-2026-11-03.jpg`.
Verworfen (gemessen): Winkelecken auf dem Feldrand, Gitterecken als Stückecken, kürzerer Arm, Wahl nach der Luft. Offen (Register
„Befunde aus P2 Tag 1“): Zweiecke, Robbe-hoch-Keil (Biegung verworfen), S-Schnitt neben der Nahtecke, Feldrand-Pole als Preis des
Einsatzes, Zahnfleischreihe, Tigerkopf, Bildkarte.

## 04.11.: P2 Tag 2–4 „Ganzzahlen, Muster, Käfig, Haut“ gebaut (Abnahme offen)

Florian: „ja zieh durch.“ Kern `kern/einsatz/muster.ts` (kanonische Seiten — die Schlitzufer sind eine Seite, die Lippe eine
scharfe Falte mit gemeinsamen Punkten; Ganzzahlen: Feldrand fest, Dichte, Polygonungleichung, Parität, ±; Muster Dreieck/Fünfeck
mit Mittelpol, Viereck als Gitter, sonst eine Teilung von Seite zu Seite) und `kern/einsatz/stuecknetz.ts` (Tutte je Stück auf ein
Vieleck mit den Eckwinkeln des Stücks, Lage auf der Haut, Käfig mit Spiegel und Lippenfalte, `EinsatzTopologie` für den Löser und
die Messung des Kernrings). **Biegungen sind keine Ecken mehr** (gemessen: mit Schnitt Fünfeck-Streifen ohne Muster und Zweiecke
mit zwei Polen am Mundwinkel; ohne: jedes Stück ein Dreieck mit einem Pol) — Tag 1 hat zwei Regeln. Ergebnis K2 (Planseite „P2 —
Stand Tag 2–4“, Bogen `docs/progress/editor/p2-stuecknetz-2026-11-04.jpg`): alle zehn Fälle bauen, Käfig geschlossen, außen
bitgleich, Lippe ≤ 0,26 px, Haut ≤ 0,25 px 9 von 10 (Robbe hoch gerade 0,46), Mundwinkel ≤ A0 + 2° 8 von 10 (Kugel, Langhals),
Flächen ein Drittel des Kernrings, 4 Pole je Feld; zwei Fälle (Robbe hoch J, Birne S) falten je eine bis zwei Zellen von 1 px²
neben der Lippe — Ursache: das Vieleck hat gerade Seiten, die Lippe dort nicht (Weg: formtreues Abflachen, keine Regel). Budget
≤ 300 hält auf K2 nirgends, auf K1 fällt die Genauigkeit (0,2–3 px) — Entscheidung für Florian. Tests `stuecknetz.test.ts` (2 grün,
3 `it.fails`), Messreihe `p2-stuecknetz.ts` (`STUFE=1`, `KERNRING=0`, `H`), Bogen `p2-bogen.ts`.

**Nächster Schritt:** Florians Blick. Dann formtreues Abflachen (zwei Falten), Budget-Entscheidung, Tasche/Rachen/Öffnen,
Zahnfleischreihe, Stabilität ±2 px, ganze Reihe. Start-Prompt für eine frische Sitzung:

> Lies `CLAUDE.md`, `docs/UEBERGABE.md` und den Prüfplan `docs/plans/2026-11-02-pruefplan-p0-p3.md` („P2 — Stand Tag 2–4“, davor
> „P2 — Start, Tag 1“). Arbeite an P2 weiter: zuerst das formtreue Abflachen je Stück (`stuecknetz.ts`, statt Tutte auf das Vieleck)
> gegen die zwei Falten, dann nach Florians Entscheidung zum Budget. Im Kern neben dem eingefrorenen Kernring, nichts am Bau
> geändert; keine Regel, die einen Körper oder eine Lage nennt; Tore als Tests (`stuecknetz.test.ts`, verfehlte als `it.fails` mit
> Registereintrag), Bogen `p2-bogen.ts` je Fall, Planseite „Stand“, Register, Übergabe, Commit und Push. Nach jedem Block die neuen
> Regeln zählen; ab der dritten anhalten und die Struktur prüfen. Nichts als bestanden melden; Florian bekommt drei Zeilen.

## Entscheidungen, die Florian treffen muss (Gegenprüfung, Abschnitt 10)

E1 verdeckt = blass (gestrichelt = weich) · E2 verdeckte Umrissstücke und Ansatzlinien als Vorschlagslinie, gebaut wird nur, was
im Dokument steht · E3 Spanten/Reifen entfallen zugunsten gezeichneter Loops · E4 kantig nur durch harte Linien, sonst rund und
Widerspruch rot · E5 Spielstufe 1, Budget 8 000 Dreiecke samt Maul, Dreieckszahl sichtbar · E6 seine Wesen als Prüfwesen zuerst ·
E7 Loops in Front/Back als Projektion bearbeitbar · E8 Strichbreite = Rundung (nicht Winkel). Ohne Antwort gelten die Vorschläge.

## Vorgehen (Schritt 3, seit 03.11. in Arbeit)

Die Beweise streng nach Prüfplan: P0a ✓ (angesehen), P1 Tag 1 ✓ (Abnahme offen), P1 Tag 2–3 ✓ als Schleifen-Käfig für ein Teil
(Abnahme offen), dann Teile an der Naht, P2, P3. Ursprünglicher Start-Prompt (gilt weiter):

> Lies `CLAUDE.md`, `docs/UEBERGABE.md`, die Gegenprüfung `docs/plans/2026-11-02-gegenpruefung-liniennetz.md` und den
> freigegebenen Prüfplan `docs/plans/2026-11-02-pruefplan-p0-p3.md`. Meine Entscheidungen E1–E8: […]. Führe P0a aus, dann
> P1, P2, P3 — streng nach Plan: im Kern hinter Schaltern, ohne Schalter bitgleich, der Kernring bleibt eingefroren, im Editor
> nur neue Anzeigen hinter Schaltern; am ersten Tag jedes Beweises ein Bild aus dem Editor, nach jedem Beweis Kontaktbögen,
> Zahlen, Planseite „Stand“, Register, Übergabe, Commit und Push; Abbruchkriterien strikt; nichts als bestanden melden. Nach
> jedem Beweis anhalten und mir die Bilder zeigen.

Falls Florian Teil 2 (Bausteine) schickt: wörtlich nach `docs/plans/2026-10-22-bausteine-wuensche.md`, nicht planen; nur prüfen,
was das Fundament bereitstellen muss (Anker im Prüfplan: Zahnfleischreihe in P2, Augenschleife mit Brauenwulst in P3).

## Falls Florian beim Kernring bleibt (unwahrscheinlich)

Der Stand von Teil A (E1–E2.6, Haut-Tor 41 von 43, Mundwinkel 43 von 43) steht auf der Planseite
[`docs/plans/2026-10-21-maul-einsatz-weiter.md`](plans/2026-10-21-maul-einsatz-weiter.md) („E2.6 Leiter — Bauplan“, „Stand
E2.6“, Nachträge E1), im Register „Befunde aus E1/E2“ und in der Übergabe vom 21.10. (Git-Verlauf, Commit 772b5c27). Offen dort:
Rex mittel gerade (Knick an der Kreuzung), Robbe hoch J (Engstelle), E2.4, E3–E6. Der Kernring passt in kein Spiel-Budget
(Stufe 1: 76 000–104 000 Dreiecke); das müsste zuerst gelöst werden.

## Werkzeuge und Prüfskripte (Auswahl)

- Kern-Tests `pnpm --filter @ee/shape test`; Extremreihe `pnpm --filter @ee/shape test:extrem` (wöchentlich in CI);
  Kernring-Reihe `npx vitest run -c vitest.extrem.config.ts src/kern/einsatz/kernring.extrem.ts` aus `packages/shape` (≈ 5 min).
- Messskripte aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<datei>.ts` — `dreieck-budget.ts`
  (Dreiecke je Stufe, Maul-Einsatz), `spielstufe.ts` (Stufe 1 gegen Grenzfläche, Facettierung, flache Bänder),
  `teilA/e1-reihe-k2.ts` (Kernring-Reihe), `einsatz-loesen.ts` (Mundwinkel nah), `raster-gleichlauf.ts` (V8-Gegenprobe unter Last).
- P1: `kern/umrissPlan.test.ts` (Tore Tag 1, `--reporter=verbose` für die Zahlen), Diagnose
  `npx vite-node ../../apps/editor/scripts/pruefen/umriss-plan-diag.ts <körper> [ansicht]`, Editor `p1-plan.mjs` (Bogen + Tor d).
- P1 Tag 2–3: `kern/schleifenKoerper.test.ts` (Tore je Körper), Messreihe `npx vite-node ../../apps/editor/scripts/pruefen/p1-koerper.ts`
  (`FAELLE`, Optionen `FAIR GEWICHT TANGENTE RUNDEN ZIEL NUR …`), Drahtgitter `p1-koerper-bild.ts` → HTML, dann aus `apps/editor`
  `node scripts/pruefen/html-shot.mjs [--jpg] <datei.html>`; Editor-Bogen `p1-koerper-editor.mjs` (run-check.sh).
- P1 Tag 2–3, zweiter Anlauf: `kern/schleifenKaefig.test.ts` (Form und Glätte je Einteiler, `--reporter=verbose`), Messreihe
  `npx vite-node ../../apps/editor/scripts/pruefen/p1-kaefig.ts` (`FAELLE ACHSE FAIR INNEN TANGENTE GEWICHT KIPPEN KRUEMMUNG TIEFE EBEN`),
  Drahtgitter `p1-koerper-bild.ts` mit `BAU=kaefig`, Editor-Bogen `p1-kaefig-editor.mjs` (run-check.sh).
- P1 Tag 4–5: `kern/schleifenTeile.test.ts` (je Körper gebaut, Form Seite, Form Front/Top, Naht, Glätte; bitgleich; Einteiler
  bleiben Einteiler), Messreihe `npx vite-node ../../apps/editor/scripts/pruefen/p1-teile.ts` (`FAELLE FAIR INNEN TANGENTE GEWICHT`),
  Drahtgitter `BAU=kaefig FAELLE=langhals,robbe,ente,pilz p1-koerper-bild.ts` + `html-shot.mjs --jpg`, Editor-Bogen
  `MODUL=extremreihe FAELLE=langhals,robbe,ente,pilz BOGEN=p1-teile p1-kaefig-editor.mjs` (run-check.sh). Schalter der Messreihe:
  `NAHTGLATT=0` (Naht nicht absolut glätten), `KLEMME=0` (Hülle nicht als Obergrenze), `HRING=0` (Ellipsen statt Hüllenringe),
  `SCHUB`, `RUMPFKIPPEN`, `ENDSTUECK`, `ENDHART`, `SPALTEN`, `RINGDICHTE`, `BODEN`, `RUMPFTIEFE`, `VORLAGENRING` gibt es seit dem
  Abräumen am 03.11. nachts nicht mehr (Verhalten fest, Alternativen gemessen schlechter). Die Tabelle zeigt auch Δ der
  Spielstufe (Polygon der Stufe 1).
- Editor-Prüfungen (Playwright, eigener Vite auf 5192): `apps/editor/scripts/pruefen/run-check.sh <skript.mjs>`; Liste in
  `apps/editor/scripts/pruefen/README.md`.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen nicht
  stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und
  begründet auf die Planseite schreiben. Maßstab: Netz immer glatt und schön außer an gewollten Kanten.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert. Neue
  Wege hinter Schaltern, ohne sie bitgleich.
- Mit Florians Ablauf testen (Kugel → umformen → Linien → Loops). Immer sagen, was im Editor ist und was nur im Kern.
- Eigener Vite auf 5192 (`run-check.sh`), nie Florians 5180, seinen Dev-Server nicht starten. Während eines E2E-Laufs keine Dateien
  unter `apps/editor/src` oder `packages/shape` ändern; E2E-Läufe überschreiben Bilder in `docs/progress/editor/` — vor dem Commit
  zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen; nie in `~/Documents/early earle Editor/Bibliothek` schreiben.
- macOS hat kein `timeout`: lange Läufe im Hintergrund mit Ausgabe in eine Datei; ein `timeout …`-Aufruf scheitert still mit
  Exit 127 (am 02.11. passiert — Testlauf war gar nicht gelaufen).
- Keine Modellnamen in Commits, Docs oder Code. Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks
  überschreiben.
