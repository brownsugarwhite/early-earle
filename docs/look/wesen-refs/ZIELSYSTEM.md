# Zielsystem der Wesen-Werkstatt — von Florians Bildern zur Form

> Stand 2026-10-08 früh. Antwort auf Florians Kritik: „Du brauchst ein ganz klares System, wie du alles aus meinen
> Referenzen und meinem Prompt umsetzt. Du musst genau wissen, was das Ziel ist.“ Dieses Dokument legt das Ziel je Wesen
> **gemessen** fest und beschreibt, wie die Konstruktion es trifft. Maßstab sind nur Florians Prompt und die 19 Bilder.

## 1. Was alle Bögen gemeinsam haben (Bild 3, 5, 6, 9, 12, 14)

1. **Eine durchgehende Masse.** Die Silhouette ist eine einzige fließende Linie: Schnauze → Schädel → Rücken → Schwanzwurzel.
   Es gibt keine aufgesetzten Teile, keine Nähte, keine Falten zwischen Kopf und Körper (höchstens eine weiche Kehlfalte
   unter dem Kiefer). → **Ein Loft für Schwanz, Rumpf, Hals und Kopf** entlang einer Wirbelsäule; Beine, Arme, Flügel,
   Ohren, Schwanzquaste sind die einzigen zusätzlichen Massen.
2. **Sitzende Säcke.** Fast alle Körper sind unten am breitesten, liegen flach auf dem Boden auf (Birne, Ei, Tropfen) und
   verjüngen sich nach oben. Beine sind kurze Säulen, die aus dem unteren Rumpf treten, mit breiten flachen Füßen/Pfoten;
   bei Katze und Löwe nur die Vorderpfoten vorn unten sichtbar.
3. **Der Kopf dominiert.** Rex, Hund, Katze: Kopf ≈ 45–55 % der Gesamthöhe; der Schädel sitzt vorn oben auf dem Rumpf,
   die Schädellinie geht in die Rückenlinie über. Giraffe/Flamingo: kleiner Kopf auf langem, sich verjüngendem Hals.
4. **Das Maul ist ein Schnitt mit zwei scharfen Kanten.** Die Kante Haut → Lippenband und die Kante Lippenband →
   Rachen sind pixelscharf. Das Lippenband (Zahnfleisch) ist beim Rex hell (Bild 11), bei der Giraffe nicht vorhanden
   (geschlossen unsichtbar). Der Rachen ist eine flache, satte Fläche (Maroon → dunkler nach hinten), nie schwarz.
5. **Zähne**: lange, leicht gebogene, cremefarbene Kegel mit warmem Ansatz; vorn/Eckzahn am längsten (≈ 30–40 % der
   Kopfhöhe beim Rex), nach hinten kürzer; sie stehen auf dem Lippenband und hängen senkrecht herab bzw. stehen senkrecht.
6. **Zunge**: groß, fleischig, rosa-rot mit Mittelrinne, füllt den Unterkiefer, runde Spitze.
7. **Augen**: klein (Ø 8–12 % der Kopfhöhe), bündig in der Fläche mit dunklem Ring oder tief unter einem harten
   Brauenwulst (Rex: orangerote Sklera, gelbe Iris); Lage seitlich am Schädel hinter der Schnauze, über dem Maulwinkel.
8. **Shading**: weiche Airbrush-Verläufe, Licht rechts oben, Schatten kühler und gesättigt, feines Korn, kein Glanz,
   harte Farbflächen (Bauch, Muster, Lippenband) mit sauberen Kanten.

## 2. Messen (Werkzeug `scripts/wesen/messen.mjs`)

Je Referenz: Silhouette (nicht-weiß), größte Komponente, Hüllquader, Flächenanteil, Schwerpunkt, Profilkurven
(oben/unten je Spalte, links/rechts je Zeile, normiert auf Höhe 1) und dominante Farben → `messung/<name>.json`
und `messung/<name>-maske.png`. Daraus die Zieltabelle unten (Werte als Anteil der Gesamthöhe H, von vorn gelesen).

| Wesen | Quelle | B/H | Fläche/H² | Landmarken (Anteil H) |
|---|---|---|---|---|
| **Rex** | Bild 5 links, 12 links, 11 | 1,35 (mit Flügel) | 0,79 | Kopf 0,55 lang · Schädel oben 1,0 · Maullinie vorn 0,62, am Winkel 0,72 · Winkel 0,65 der Kopflänge hinten · Auge (0,78 h, 0,7 hinten), Ø 0,06 · Oberkiefer 0,3 hoch · Unterkiefer 0,22 tief, Kinn rund · Rumpf hinten bis 0,55 h, Bauch 0,2 h · Beine ab 0,25 h, Dicke 0,16, Fuß 0,22 breit · Körperbreite 0,75 |
| **Rex-Kopf** | Bild 11 | 1,51 | 1,19 | Lippenband 0,12 der Kopfhöhe · Fänge bis 0,4 der Kopfhöhe · Braue mit harter Kante über dem Auge · Nasenloch oben auf der Schnauze |
| **Giraffe** | Bild 6 (1. und 2.) | 0,43 | 0,21 | Birne: Boden 0 … breiteste Stelle 0,42 bei 0,18 h · Halsansatz 0,55 h, Breite 0,12 · Hals bis 0,85 h, S-Bogen vor, Breite 0,12 → 0,09 · Kopf 0,22 lang, 0,12 hoch, waagerecht bzw. 30° hoch · Maul vorn an der Spitze, Bohne 0,09 hoch · Auge 60 % hinten, oberes Drittel · Ohren hinten unten, Hörnchen hinten oben |
| **Tiger (zu)** | Bild 9 rechts | 1,09 | 0,74 | Ei: Boden 0,9 breit, breiteste 0,95 bei 0,3 h, Rücken 0,95 h · Kopf Ø 0,42, Mitte (vorn, 0,72 h) · Schnauze breit, W-Lippe, Nase rosa · Augen 0,8 h, Schlitz · Ohren klein 0,95 h · Pfoten vorn unten 0,12 breit · Schwanz dünn, Bogen bis 1,1 h |
| **Tiger (offen)** | Bild 14 rechts | 1,08 | 0,84 | wie oben; Maul offen: Fänge oben 2 lang, unten kurz; Maulwinkel unter dem Auge |
| **Aal** | Bild 13 | 1,12 | 0,65 | Kopf 0,45 der Höhe, Maul rund-eckig offen, gleichmäßige Dreieckszähne rundum, Zunge rosa, Auge gelb mit Ring seitlich oben hinten, Schlangenkörper eingerollt, Flossenkamm |
| **Drache ohne UK** | Bild 5 rechts | 0,70 | 0,38 | aufrechter Sack, Öffnung senkrecht am Hals 0,45 … 0,9 h, Riesenzähne oben, untere Zähne aus Brust, Flügel, Kamm |
| **Kugelfisch** | Bild 4 (2.) | 1,60 | 1,08 | Kugel, O-Maul vorn mit flachem Lippenring, Auge klein rund mit Ring, Stacheln, heller Bauch |

Farben (dominante Cluster): Rex Haut `#403445`/`#493b48`, Lippenband `#bf8e6c`, Rachen `#2b0b10`…`#9b4e4c`, Zähne `#e6d8ba`;
Giraffe `#e4cca0` Grund, Flecken `#777a6a` (grüngrau!) bzw. `#9d9577`; Tiger Grund `#b56939`/`#8e603a`, Streifen `#392c24`,
Bauch `#ddbc96`; Aal `#304d68` Rücken, `#9eb79f` Bauch, Rachen `#302633`.

## 3. Konstruktion, die das trifft

1. **Zwei Kopfarten, ein Grundblob** (Stand 08.10.): *Kopf im Rumpf* (`hals.laenge` = 0 — Grundblob, Fisch, Aal, Drache): der Kopf ist das obere Vorderteil des Domes, Landmarken um die Maullinie formen das Profil (`kopfImRumpf`: Schnauze, Kinn, Kehle, Kopfband, Ei-Verjüngung des Gesichts). *Eigener Kopf* (`hals.laenge` > 0 — Rex, Katze, Hund, Giraffe): Kopf-Loft mit Schädel-/Kieferprofil am Halsende; bei kurzem Hals sitzt er mit der Mitte knapp über den Schultern, vorn über der Brust (`hals.ansatz`), weit verschmolzen (Rückenlinie Schulter → Hinterkopf, Kinn hängt frei). Rumpf und Hals bleiben **ein** Loft (Tropfen), die Neigung verschiebt waagerechte Scheiben (Standfläche bleibt flach, Rücken wird zur Schräge, Bild 2). Der Rumpf darf klein sein (`koerper.hoehe` ab 0,3): Rex = Kopf 0,6 H auf Rumpf 0,42 H und Beinen 0,18 H.
2. **Kopfprofil** aus Landmarken: Schädelhöhe, Brauenlage, Schnauzenabfall, Schnauzenlänge, Nasenknubbel, Kieferhöhe,
   Kinnrundung, Schnauzenbreite. Die Maullinie ist eine Kurve auf diesem Kopf (Höhe vorn, Höhe am Winkel, Winkellage).
3. **Beine** als Säulen-Lofts (Hüfte im Rumpf, Fuß als flacher Saugnapf/Pfote), Vereinigung mit großem k (Kehlfalte-Logik:
   weiche Mulde, keine Naht). Arme, Flügel, Ohren, Hörner, Kamm = Anbauten (K5), als eigene kleine Lofts/Ellipsoide.
4a. **Kiefer** (Stand 08.10. mittags): Gelenk auf der Linie der Mundwinkel; davor beide Kiefer starr, dahinter Ketten
   (Kehle unter dem Kinn, Nacken hinter dem Oberkopf) mit ⅔/⅓ des Winkels — Dehnung bleibt unter ≈ 2 (Test
   `mouth/kette.test.ts`). Öffnung = Randabstand vorn, 1 = 1,6 Kopfhöhen („ein anderes Tier mit einem Haps“); der
   Unterkiefer dreht nur so weit, wie Boden, starrer Rumpf und Biegezone es zulassen (Abtastung + Faltbudget), den Rest
   übernimmt der Oberkiefer; `maul.kehle` verlängert die Biegezone (langer Unterkiefer am Hals, Drache), `maul.bohne`
   rollt den Oberkiefer seitlich (Bohne).
4. **Maulschnitt hart** (k ≈ ½ Zelle am feinen Gitter), Kantenvertices exakt auf der Kante (QEF), **gespalten** mit zwei
   Normalen (Haut / Rachen); Regionen als **Abstandsfelder** (Abstand zur Maulkante, Lippenbandbreite, Augenring) → der
   Shader zieht pixelscharfe Grenzen unabhängig von der Netzdichte.
5. **Feineres Gitter um Kopf und Maul**: rechtwinkliges Gitter mit variabler Teilung je Achse ist gebaut (`contourDual`, Option `refine`, im Bau `verfeinerung`), aber **standardmäßig aus** — es verfeinert ganze Achsenstreifen; bei Kopf ≈ Körperbreite kostet Faktor 1,8 etwa 2,5 × Vertices und Bauzeit (Rex 88³: 1,6 s → 4,4 s) für kaum sichtbaren Gewinn, weil die Maulkanten ohnehin durch den Lippenschnitt scharf sind. Für Standbilder zuschaltbar.
6. **Zähne** als gebogene Fangkegel mit Größenprofil entlang der Lippe (Eckzahn-Spitze, vorn mittel, hinten klein),
   Ansatz im Lippenband; **Zunge** als parametrischer Körper (Rinne, runde Spitze, flache Unterseite) auf dem Kieferboden.
7. **Augen**: Lage längs des Kopfs (`augen.lage`: Schnauze ↔ Hinterkopf) und Höhe, bündig mit Ring oder unter der Braue.
8. **Prüfung**: Harness rendert jede Vorlage in der Bildkamera und misst die Silhouetten-Überdeckung (IoU) gegen die
   Maske der Referenz; Ziel ≥ 0,85 je Vorlage, dazu Florians Blick.

## 4. Reihenfolge

Rex (Bild 5/11/12/14) → Tiger (Bild 9/14) → Giraffe (Bild 6) → Aal (Bild 13) → Drache (Bild 5 rechts) → Kugelfisch
(Bild 4) → Dackel/Retriever (Bild 6/8). Erst wenn der Rex die Überdeckung und Florians „ja“ hat, der nächste.
