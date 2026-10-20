# Übergabe (Stand 20.10.2026 abends: Plan „Vektorillustration“ freigegeben, V0 gebaut)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix; CI grün.

## Einstieg

Maßgeblich ist der am 20.10. freigegebene Plan
**[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md)**: ehrliche
Bestandsaufnahme S0–S8a, Zielbild als Messlatte (Vektorillustration aus einem Liniennetz), Bauweise (Umrisse als
Käfigschleifen mit Silhouettenbedingung, Linien gleichzeitig, Härte = Rundungsbreite, Loops = Querschnittslinien), Bedienung
nach Blender (⌘R-Loops, G/S/R, proportional), Schritte V0–V9 mit Toren. Am Ende **„Stand“** mit allem, was V0 gebracht hat,
und den Korrekturen am Plan. Vorgeschichte: [`2026-10-16-liniennetz-zielform-kaefig.md`](plans/2026-10-16-liniennetz-zielform-kaefig.md)
(S0–S8a; Nachträge „Stand S6“ und „Stand S8a“ vom 20.10.). Offene Kritik:
[`2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md) (neu: „Befunde aus S7/S8a und der Prüfung vom 20.10.“,
„Bedienung 20.10.“).

Florians Entscheidungen 20.10.: Reihenfolge gemischt; G nach Kontext (Auswahl → Greifen, sonst Pinsel „Ziehen“; S wird
Skalieren, Spanten/Loops setzt ⌘R); ein Loop setzt echte, formneutrale Knoten in Seite und Top.

## Letzter Stand: V0 „Aufräumen, Fallen, Rückschritte“ gebaut (Abnahme offen)

Je Korrektur ein Test, der vorher rot war; Editor-Prüfungen mit echten Zügen auf dem eigenen Vite (5192). Commits
`155e07e0` … `8ce23fbe`.
- **Tasten:** ⌘R lädt nicht mehr neu (Menü „Neu laden“ = ⇧⌘R), Warnung beim Verlassen mit Ungespeichertem (Web); [ ] auch
  als ⌥5/⌥6.
- **Kopplung:** ⌘Z bringt eingefügte Punkte nicht zurück; höchstens zwei Punkte je Geste und Ansicht; überflüssige nimmt
  das Gestenende heraus; ein Punkt mit dem Stift gleicht alte Widersprüche nicht still an; hin und zurück = kein
  Undo-Schritt; Maulzüge behalten die Spant-Teilung.
- **Teile:** kein Klickfang der Wirbelsäulen an Teilspitzen; der Baum wird je Geste einmal gebaut; Seitenknoten an Beinen und
  Flügeln liegen am Teil; Reifen/Spanten auf „Teile“ geben einen Hinweis; Umschalten Röhre ↔ Teile sagt, was auf der anderen
  Art liegt; Δ/Saum am gepinselten Baum; toter S5-Geist entfernt.
- **Bau:** frische Ringwahl mit Rückfall (Stadionform 138 → 6°); „berühren“ stetig um × 1,35 auf der Röhre; Baum-Wachstum je
  Streifen; Löser ohne stilles „gegen 0“; Prüfwesen der Library wie ein neues Wesen (glatt + mittel).
- **P-Linien (S8a):** Kreuzungen schaukeln nicht mehr auf (24 → 1 px), kurze Linien werden scharf, Linien ohne Reihe/Ring
  behalten die Treppe; die Kantenliste zeigt je Linie „genau“ oder „Treppe“.
- **Tafel Körper:** „Körper: Röhre | Teile“ oben mit ehrlichem Text; Haut und Fülle eingeklappt unter „Versuche“ und
  ausgegraut, wo sie nicht wirken. „Neu ableiten“ ist ein Undo-Schritt.
- **Ehrlich:** verfehlte Tore als bekannt rot (`it.fails`): S5/S6 ≤ 20°, S3 einfache Form ≤ 2 px, S8a Kante ≤ 0,5 px;
  Klingenkanten zählen im Faltenmaß mit (131–164°); Selbstschnitte im Blatt-Titel („Umriss schneidet sich“).
- **Korrekturen am Plan:** Stadionform klappt in deinem Ablauf aus der Kugel nicht um (nur frische Ringwahl, behoben);
  Augen per Klick gehen auf dem Baum; die Kappe ist nicht die Ursache des Enten-Rückschritts (es ist die eingefrorene
  Ringverteilung der Kugel — „Neu ableiten“ hilft).

## Für Florian zum Ausprobieren (nach dem Pull den Dev-Server neu starten)

1. ⌘R im Editor: lädt nicht neu (Hinweis bzw. Reifen am Zeiger). [ und ] (⌥5/⌥6) ändern den Pinselradius.
2. Einen Umrissknoten so ziehen, dass die Kopplung der Front einen Punkt einfügt, dann ⌘Z und einen kleinen Zug: Der Punkt
   kommt nicht zurück. Zug hin und zurück: kein Undo-Schritt.
3. Körper „Teile“: mit dem Stift an einer Teilspitze (Kopf) auf die schwarze Linie klicken → neuer Punkt. Tafel Körper lesen
   (was wirkt, was nicht); Versuche aufklappen.
4. Eine Wurst/Hals-Form („Neu ableiten“): klappt nicht mehr um.
5. P-Linien: Kantenliste zeigt „genau“ bzw. „Treppe“; zwei gekreuzte Linien liegen jetzt auf ihren Kreuzungen.
6. Einen Seitenumriss über Kreuz ziehen: Blatt-Titel „Umriss schneidet sich“.

## Offen für Florian

- Abnahme V0 (oben); danach **V1 Prüfstand „Extremreihe“** (rund 30 Körper über deinen Ablauf, Kontaktbögen, Aufräumen
  bitgleich).
- Weiter offen (mit Vergleichsbild, wenn der Schritt sie braucht): Entenflügel flach oder Schale an der Glockenflanke (V7);
  dünne Kanten Klinge oder rund; einfache Form — Stacheln als Paar oder im Rumpf; Überhang (Kopf als Teil mit Kragen oder
  Y-Stück).

## Arbeitsregeln

- Ein Schritt nach dem anderen; nach jedem Schritt Kontaktbogen + Editor-Bild und Halt. Keine Meldung „fertig/bestanden“
  ohne Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten.
- Jede Korrektur mit einem Test, der vorher rot ist (Gegenprobe mit dem alten Code); verfehlte Tore als `it.fails` mit
  Registereintrag, nie still gelockert.
- Mit Florians Ablauf testen (Kugel → umformen → …): `mitStationenVon` im Kern, echte Züge im Editor. Immer sagen, was im
  Editor ist und was nur im Kern.
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180; neue Prüfskripte `v0-*.mjs`.
  Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
