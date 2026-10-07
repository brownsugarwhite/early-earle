# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-08 früh, Sitzung „Wesen-Werkstatt“ (Florians Mac, Branch `main`). Pläne: [`docs/plans/2026-10-07-wesen-werkstatt.md`](plans/2026-10-07-wesen-werkstatt.md) (v1, freigegeben) und [`docs/plans/2026-10-07-wesen-werkstatt-v2.md`](plans/2026-10-07-wesen-werkstatt-v2.md) (**v2 nach Florians Urteil: Lückenliste, Formen aus Profilkurven, Gesicht als gestaltete Teile, Shading nach den Bögen, Held zuerst — zur Freigabe**). **Maßstab sind nur Florians Prompt und seine 19 Bilder** (`docs/look/wesen-refs/`, Katalog mit Befund in der README dort; keine anderen Bilder, keine Dateien von seinem Mac als Referenz).

## Was in der Nacht passiert ist

- **Florians Urteil (07.10. spät):** „Nur die Maulöffnung war vielversprechend, sonst erreicht nichts die Vorgaben; der Plan war zu schnell fertig; es muss der technisch beste und eleganteste Weg sein, kein Flicken.“ Dazu der große Fehler meinerseits: seine 19 Bilder waren nach dem Kontextwechsel nicht mehr vor Augen (nie als Dateien gesichert) — jetzt liegen alle 19 in Reihenfolge im Repo, mit Ausschnitten je Vorlage (`crops/`), und der Harness stellt jedes Render **neben** seine Referenz (`docs/progress/wesen-vergleich-<id>[-zu|-auf].png`).
- **Architekturentscheidung (Plan v2):** Distanzfeld → Dual Contouring → gemaltes Material bleibt (nur so wachsen Beine, Hals, Schwanz nahtlos aus einem Blob). Die **Formschicht** wurde ersetzt: statt Ellipsoid-/Rotationskörper-Summen gibt es das **Profil-Loft** (`sdf/scene.ts`: `LoftPrim`, `makeLoft`, `sdLoft`) — Mittellinie mit Stationen, **Ei-Querschnitte** (Breite, Höhe oben/unten getrennt, Superellipse), Knochen je Station, runde oder flache Kappen. Körper **und Hals sind ein Loft** (Tropfen ohne Schulterstufe, Bild 6; kurze Hälse sitzen auf der Rumpfachse und übernehmen den Rumpfradius), Kopf = Haube/Löffel-Loft entlang der Blickrichtung (Stirn flach, Braue, Schnauze fällt gerade ab; Unterkiefer als Löffel), Beine = Lofts mit Saugnapf-Fuß und flacher Standfläche, Schwanz und Schlange = je ein Loft.
- **Stetigkeit** (Risse behoben): Lofts mit gerader Bezugsachse (`axis`) wählen die Station nach Höhe und verschieben nur die Scheibe — stetig per Konstruktion; nur Schwanz/Schlange nutzen die Nächster-Punkt-Suche. Zwei echte Fehler gefunden: (1) das Hüllquader-Culling übersprang **innerhalb** des Quaders bei negativem d tiefer liegende Teile (Schwanz im Rumpf) — jetzt nur noch außerhalb; (2) Maulhöhle und Kinnschnitt waren radial unbegrenzt und schnitten quer durch Rumpf und Beine. Regressionstest `sdf/stetig.test.ts` (Sprünge entlang Linien durch Rex und Giraffe).
- **Maul:** ein einheitliches Öffnungsprofil (`maul.rundung`: spitz ↔ rund wie der Aal, Lochmaul immer rund), Schnitt enger (1,25 Zellen), Zähne 35 % größer und gebogen, Zähne am geschlossenen Zustand verankert (`zaehne.aussen`), Oberkiefer-Knochen (Öffnen klappt den Oberkopf samt Augen), Verschluss v2 gemessen (`mouth/verschluss.test.ts`). Der Rex wird **fast geschlossen gebaut** (Öffnung 0,22), die Gape kommt aus der Kieferdrehung — so bleibt der Unterkiefer ein Löffel.
- **Harness:** `EE_MAUL=bau|zu|auf`, Referenzspalte, Vergleichsbilder; Vorlagen-Schema-Test (`regler.test.ts`: jede Vorlage muss parsen — eine Kopfgröße über dem Limit hatte das Lab stumm geschaltet).

## Wo der Rex steht (Bild 5 links, offen)

Kopf aus der Brust, flache Stirn, großes Gape mit Zahnreihen, Zunge, Auge seitlich unter der Braue, dicke kurze Beine, Schwanz. **Noch weit weg:** Rumpf ist ein Findling statt gedrungener Bohne mit Brust; Schnauze noch zu rund/kurz; Zähne zu klein und zu kegelig (Bild 5: lange gebogene Fänge, vorn groß); Auge ohne eingetiefte Höhle/Brauenschatten; Farbe zu blaugrau (Bild: violettgrau mit warmem Bauch); Flügel/Stummelarme fehlen (K5); Shading glatt statt Airbrush. Bauzeit Held 88³ ≈ 3,5 s (vor den Lofts 0,9 s) — Profilsuche jetzt mit Abbruch nach Bogenabstand, Messung ausstehend.

## Nächste Schritte (Reihenfolge)

1. Rex weiter nach Bild 5/11/12/14: Rumpfprofil (Bohne, Brust), Schnauze, Zähne (Länge, Kurve, Verteilung), Augenhöhle + Brauenschatten, Farben; Bauzeit zurück unter 1,5 s.
2. Giraffe (Bild 6): Hals dünner zum Kopf, Kopf waagerecht mit Schnauze nach vorn, Maul vorn unten, Flecken (Muster `platten` ist gerade nicht sichtbar — prüfen), Ohren/Hörnchen (K5).
3. Drache ohne Unterkiefer (Bild 5 rechts): Rachenöffnung bis zur Brust als eigener Schnitt entlang der Halsachse, große Haube, Zähne aus der Brust.
4. Fische (Bild 4): Kugelfisch-Loch größer und bündig (Lippenring flacher), Augen rund mit Ring.
5. Shading nach Bild 5/11/18 (Airbrush, kein Glanz, Lippenband hell), Silhouettenmaß im Harness.
6. Florians offene Punkte: Glubschaugen bei Maul oben, Schlangen-Mundwinkel, PezenPez als Ur-Blob, Grundblob-Dreieckszahl (Brett-LOD), Zwischenformen Aal.

## Fallen / Hinweise

- **Nur Florians 19 Bilder** sind Referenz; nichts anderes öffnen oder suchen.
- Lofts: Mittellinien mit starker Krümmung relativ zur Dicke brauchen den Achsenmodus (sonst Sprünge am Medialbereich). Fast doppelte Nachbarpunkte werden in `makeLoft` verschmolzen; offene Enden ohne Kappe werden rund geschlossen.
- Culling nur außerhalb des Hüllquaders (`bd > 0`), sonst Risse.
- Maulhöhle/Kinnschnitt sind auf den Kopfbereich begrenzt (`dOut`, `dHost`).
- Deskriptor „Rachen“ ist schmal (Farbe); Verformungsgewichte nur aus geometrischer Tiefe (`closing.ts`).
- Lab per Browser-Klicks ist unzuverlässig (Referenzen veralten); Bilder immer über den Harness.
- Vorschau der Leitung: `game-dev-http` (5174); Florians Server 5173 nicht anfassen.
