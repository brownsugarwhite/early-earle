# Übergabe (Stand 21.10.2026, zweite Sitzung: Teil A „Maul als Einsatz“, E1 — Haut als Standard erreicht, Mundwinkel 26 von 30)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix. **Diese Datei ist der Einstieg für eine frische Sitzung.** Alles zu Teil A
liegt bisher nur im Kern (`packages/shape/src/kern/einsatz/`); im Editor ist davon noch nichts zu sehen.

## Start der frischen Sitzung

Zum Einfügen (Florian):

> Lies `docs/UEBERGABE.md` und auf der Planseite `docs/plans/2026-10-21-maul-einsatz-weiter.md` den „Nachtrag E1 (zweite
> Sitzung)“. Weiter mit Teil A, E1: die Verdrehung an J-Linien aufnehmen (Übergangsreihe mit Polpaaren oder ausgeglichenes
> Feld), damit um c das Kissen liegen kann und das Mundwinkel-Tor auch an den vier J-Fällen hält; dann E2.

Lesereihenfolge für die Sitzung:
1. `CLAUDE.md` (lädt von selbst: Stand, Regeln, Fallen; Einträge „2026-10-21 …“ unten in der Liste).
2. Diese Datei.
3. Planseite [`docs/plans/2026-10-21-maul-einsatz-weiter.md`](plans/2026-10-21-maul-einsatz-weiter.md): „Ursache am Mundwinkel und
   die Entscheidung“, „Schritte“ (E1–E6), „Stand E1“, die Nachträge E1 (mittags, nachmittags) und vor allem **„Nachtrag E1
   (zweite Sitzung)“** (Ursachen, verworfene Wege, Vorschlag).
4. Register [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md), „Befunde aus E1“.
5. Grundlage Teil A: [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md)
   (Festlegungen, Schritte A1–A14).

## Worum es geht

Florian 21.10.: „Weiter mit Teil A ‚Maul als Einsatz‘: Damit sollen glatte Haut, Querschnitt aus der Hülle, Linien exakt und Loops
auch mit Maul wirken.“ Heute schaltet ein Maul den Körper auf den alten Maulbau um (`ableitenMitMaul`) — ohne all das. Der Einsatz
dreht es um: A0 ist der Körper ohne Maul mit allem, was der Körper kann; das Maul wird in die verfeinerte Fläche von A0 eingesetzt
(Feld um die Maullinie, Karte, Topologie, Lippe, Haut lösen = A3–A7), außerhalb des Felds bleibt der Körper bitgleich.

Reihenfolge: **E1 Gitter** (läuft) → E2 A0 wie im Editor → E3 Bau → E4 Editor, Maul zu (**Florians Blick**) → E5 Öffnen → E6 Rest
(Kiefer getrennt, Zähne, Augen, Rig, alter Maulbau raus, Abnahme).

Florians Auftrag dieser Sitzung: „zuerst die genaue Haut als Standard des Kernrings …, dann den Mundwinkel (Quadratgitter um c).
Es muss für alles eine elegante und saubere Lösung geben!“

## Stand E1

- **Standard des Kernrings** (`einsatzFall(art, anfang, form)` ohne Optionen, `einsatzAblauf(f)` in
  `kern/pruefen/einsatzFall.ts`): Feld auf **K2**, Schlitz genau auf der Linie (`schnittAufLinie`), Reihenzahl konform 10 … 16,
  Ausgleich außen 6 Runden, letzte Lippenspanne ¼ Feldkante (`eckeMin` 0,25 auf K2), **ohne Lippenwulst** (A7, `wulst` im
  Kernring 0). Dünn besetzte Normalgleichungen in Lage und A7; ein Fall ≈ 3–4 s. Das alte Schleifengitter und `FALL_ALT` (K1,
  Kantenpfad) bleiben bitgleich.
- **Haut-Tor erreicht** (ganze Reihe, 39 ausgeglichene Fälle): ≤ 0,25 px in 30 von 30 ohne Rex/Robbe (Median 0,12, max 0,22);
  außen bitgleich, Spiegel bitgenau in allen 39. Rex/Robbe 2–4 px: eigene Falten von A0 im Feld (E2).
- **Mundwinkel-Tor** (Knick im Umkreis von drei Feldkanten um die Lippenspitze ≤ A0 + 2°): 26 von 30 ohne Rex/Robbe, 31 von 39
  mit (vorher mit Lippenwulst 1 von 39). Verfehlt nur an J-Linien: Kugel mittel J 4,4° (A0 1,4°), Ei mittel J 3,9° (1,2°),
  Ei tief J 4,8° (1,4°), Langhals hoch J 8,0° (6,0°). Bild vorher/nachher:
  `docs/progress/editor/e1-mundwinkel-ohne-wulst-2026-10-21.jpg`.
- **Ursache der vier:** die **Verdrehung** an J-Linien (außen am Haken ist der Feldrand länger, Speiche k muss trotzdem zu
  Randpunkt k, rund zehn Speichen Versatz): Harmonisch dreht sie den Fächer um c, die zwei Stufen der Kartenlage knicken dafür an
  der festen Reihe J_i. Dazu zeigt die Karte am Linienende 1–52° neben die Verlängerung (Fächer um c gekippt).
- **Versuch „Band“** (`einsatzTopologie(…, { lage: 'band', feldDreiecke })`, `einsatz/band.ts`, `einsatz/lage.ts`): Kissen in zwei
  Ringen um die Lippe, Rest in eigener Karte. Wo es nicht faltet, ist der Mundwinkel hervorragend (Langhals hoch J 6,6° bei A0
  6,0°); es faltet, solange die Verdrehung dicht hinter dem Band aufgenommen wird.

## Nächste Schritte (in dieser Reihenfolge)

1. **Verdrehung aufnehmen** (E1-Rest, Mundwinkel-Tor an den vier J-Fällen): Übergangsreihe mit Polpaaren (5er außen am Haken,
   3er innen), sodass außen mehr Speichen zum Feldrand laufen als innen — dann kann um c das Kissen liegen (Band oder
   Quadratgitter), und die Naht der beiden Stufen entfällt. Alternative: ausgeglichenes Feld (Randpunkte oben und unten gleich
   verteilt). Erst an den vier Fällen und Kugel/Ei/Birne gerade/S beweisen, dann ganze Reihe; das Tor in `kernring.extrem.ts`
   (`it.fails`) muss danach bestehen.
2. Lippenstellen für verwickelte Linien (Rex mittel: Lippe 2,3–2,7 px; Bogenlänge/Krümmung statt konform) — mit E2.
3. **E2** (A0 wie im Editor: glatt, berühren, Hülle, Linien, Loops; Florians Ablauf Kugel → umformen → Maul; Falten von A0 im
   Feld laufen auf einer Spalte weiter — Rex/Robbe), **E3** (`maulEinsatzBauen`, eingefrorene Topologie im Dokument, schneller
   Zugweg), **E4** (Schalter „Maul: Einsatz“ im Editor, Maul zu → Florians Blick), E5, E6.

**Nicht wiederholen** (gemessen und verworfen, Planseite „Nachtrag E1“ und „Nachtrag E1 (zweite Sitzung)“): Gewichte nach Hautlänge
am Mundwinkel, radiale Umparametrisierung, fester Fächer, innere Stufe in W', Polarkoordinaten um c, Ideallage nur innen;
Normalenbindung in A7, Zellform als Quadrate (MIPS: logarithmisch-polare Spirale um c), Zellform zur Kissen-Vorlage über das ganze
Feld, Reihen nach Hautlänge auf den Kartenspeichen, Naht der Stufen glätten, Karte auf feinerem Netz, Feld verlängern.

Je Schritt: Planseite „Stand …“ nachtragen, Register, Bilder, commit + push; nichts als „bestanden“ melden ohne Florian.

## Werkzeuge

- **Tests:** `packages/shape/src/kern/einsatz/kernring.test.ts` (Lippe als Falte, Topologie an 54 Fällen auf K2, drei Wächter der
  genauen Haut), `kernring.extrem.ts` (ganze Reihe: Haut-Tor, Mundwinkel-Tor als `it.fails`; `pnpm --filter @ee/shape test:extrem`,
  ≈ 3 min), dazu die übrigen `einsatz/*.test.ts` (`FALL_ALT`, bitgleich). Lauf: `pnpm --filter @ee/shape test`.
- **Messskripte** (aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<datei>`):
  - `teilA/e1-reihe-k2.ts` — ganze Reihe nach dem Standard (≈ 4 min, im Hintergrund): je Fall Haut, Knick, Mundwinkel (je gegen
    A0), umgeklappt, Güte, Lippe; Summe am Ende. Umgebung `FAELLE`, `LAGE` (karte/band), `J`, `ECKE`, `WULST`, `VERL`, `AUS`
    (JSON-Zeilen).
  - `einsatz-loesen.ts` — Nahaufnahme des Mundwinkels (A0 · Einsatz · Abstand · Zebra): `NEU=1 NAH=3` (NAH in Feldkanten, fester
    Ausschnitt), optional `J`, `ECKE`, `WULST`, `LAGE`, `AUSGABE`; Bild mit `node scripts/pruefen/html-shot.mjs` (aus
    `apps/editor`).
  - `teilA/e1-gitterbild.ts` — Gitter als SVG (`AUSGABE=<datei.html>`, `NAH`, `LAGE`, `ECKE`), Bild wie oben.
  - `teilA/e1-haut.ts`, `teilA/e1-reihe.ts`, `teilA/e1-faecher.ts`, Kissen-Vorversuche wie bisher.
- **Fälle:** `<körper>/<anfang>/<form>` (z. B. `kugel/mittel/gerade`, `ei/tief/j`, `langhals/hoch/j`), Liste `einsatzFaelle()`;
  „ausgeglichen“ = Linie ≤ 1 px auf der Haut (`hautAbstand`), das sind 39 von 54.

## Fallen aus E1

- **Mundwinkel nicht in Lippenspannen messen:** Ein Messbereich, der an der letzten Lippenspanne hängt, schrumpft mit ihr und
  schönt jede Verkleinerung der Spanne (eckeMin 0,25 sah nach 5 von 7 aus, ehrlich waren es 3 von 7). Fester Umkreis (drei
  Feldkanten) für Maß und Bilder.
- **Lippenwulst und K2 vertragen sich nicht:** Ein schmales Band mit 0,4 px Höhe löst der feinere Käfig auf (Steigung bis 12°) —
  3–5° Knick längs der Lippe. Wer Abstand zwischen geschlossenen Lippen will: in der Tasche (A8), nicht in der Haut.
- **Schlitz und Linie müssen aufeinander liegen:** Ein Kantenpfad bis 2,8 px neben der Linie gibt am Mundwinkel 160–179°.
- **Konforme Lagen sind um c gestaucht** (Kissen ist nicht konform: bei festem Fächer wachsen die Ringzellen tangential), und die
  Karte zeigt am Linienende nicht in die Verlängerung — Lagen, die Richtungen der Karte an c übernehmen, falten (Reihen nach
  Hautlänge: 179°).
- Nachbarlisten für `normalSystem` ohne doppelte Einträge übergeben: Cuthill–McKee reiht sonst Punkte doppelt ein, die Zerlegung
  bricht mit „nicht positiv definit in Zeile 0 (0)“ ab.
- Rex/Robbe 2–4 px in der Haut-Messung sind A0-Falten im Feld (E2), nicht die Auflösung.
- Tests an der Naht: −0 gegen 0 scheitert an `toBe` — Fehler sammeln und vergleichen, nicht je Wert `toBe`.

## Davor (V0–V6, Abnahme offen)

Maßgeblich bleibt der am 20.10. freigegebene Plan
[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md) (Stände V0–V6.4 am
Ende der Seite); Teil A ist der Block, den Florian am 21.10. früh davor gezogen hat. Gebaut und im Editor (Abnahme offen): V0
Fallen und Bedienfehler, V1 Prüfstand „Extremreihe“, V3 G/S/R und proportional in den Blättern, V4 Querschnitt aus der Sichthülle,
V5 P-Linien als Käfigschleifen, V6 ⌘R-Loops (Bühne und Blätter, G/S/R, mehrere Loops); V2-Linien nicht abgenommen („sehr sehr
wild“, standardmäßig aus). Offen danach: V6-Rest (jeden Käfigring als Loop, Loops auf „Teile“/mit Maul), V5-Rest (Lage 0,3 px,
Grat), V7 ein Körper, V8 Vektor-Ausgabe, V9 Abnahme.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen nicht
  stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und begründet
  auf die Planseite schreiben. Maßstab: Netz immer glatt und schön außer an gewollten Kanten.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert. Neue
  Wege hinter Schaltern, ohne sie bitgleich.
- Mit Florians Ablauf testen (Kugel → umformen → Maul). Immer sagen, was im Editor ist und was nur im Kern (Teil A: bisher nur
  Kern).
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180, seinen Dev-Server nicht starten. Während
  eines E2E-Laufs keine Dateien unter `apps/editor/src` oder `packages/shape` ändern; E2E-Läufe überschreiben Bilder in
  `docs/progress/editor/` — vor dem Commit zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen; nie in
  `~/Documents/early earle Editor/Bibliothek` schreiben.
- Keine Modellnamen in Commits, Docs oder Code. Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks
  überschreiben.
