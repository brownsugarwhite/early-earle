# Plan: Genauer Zug — der gegriffene Hautpunkt landet unter dem Zeiger (20.10.2026)

> Florian (20.10.): „ok, versuchen wir's mit deinem Vorschlag“ — gemeint ist die Antwort vom 17.10. auf seine Frage, ob
> Vektorformen 1:1 ins 3D gehen und ob Punkte wie in Blender (Subdivision-Objekt) genauer wären. Eigene Sitzung, Branch
> `claude/sweet-newton-w3ao60` auf dem Stand von `claude/editor-grundlayout` (d1103876). Ins Repo gelegt vor dem ersten Code.

## Abgrenzung

Der Vorschlag hatte drei Teile. Zwei davon stecken schon im freigegebenen Plan
[`2026-10-20-vektorillustration-bedienung.md`](2026-10-20-vektorillustration-bedienung.md), den eine andere Sitzung gerade
baut (V0):

| Vorschlag | Wo |
|---|---|
| 1. Bei den Bézier-Punkten bleiben, der Käfig bleibt innen die Wahrheit | gilt schon (Illustrator-Teil bleibt, 4.1) |
| 2. Jede Linie fest binden, auch die Umrisse von Front und Top; Käfig an der Linie verdichten | V4 „Exakte Umrisse“ (Käfigschleifen mit Silhouettenbedingung), V5 „Linien exakt“, Ringe nach der Krümmung, V6 Loops |
| 3a. Käfig einblendbar | auf der Röhre schon da (Tafel Körper → Darstellung → „Käfig“); auf dem Körper aus Teilen fehlt er |
| 3b. **Genauer Zug:** der gegriffene Hautpunkt landet genau unter dem Zeiger | **nirgends — das baut diese Sitzung** |

Damit nichts doppelt entsteht, fasst diese Sitzung V0–V9 nicht an. Berührt werden nur der Pinsel (`kern/pinsel.ts` im
Editor), ein neues Kernmodul, ein Feld im Worker-Stand und eine Nachricht im Worker.

## Befund heute

Der Pinsel „Ziehen“ (G auf der Bühne ohne Auswahl, Florians Wahl vom 20.10.) verschiebt Käfigpunkte mit dem Abfall
(1 − (d/r)²)² um den Zeigerweg. Die Haut folgt nur zum Teil: Ein Käfigpunkt bewegt seine eigene Grenzlage nur zu 16/36
(glatt) bzw. 4/6 (auf einer scharfen Kante), und die Punkte, die den Hautpunkt tragen, liegen bis zu zwei Käfigkanten weit
— oft schon außerhalb des Radius. Der gegriffene Punkt bleibt deshalb hinter dem Zeiger zurück, umso mehr, je kleiner der
Radius im Verhältnis zum Käfig ist. Das ist genau die Ungenauigkeit „Blender-Käfigpunkte schweben neben der Fläche“.

## Bauweise

Die Haut ist linear im Käfig (feine Lagen = Grenzmatrix · Käfig). Daraus:

1. **Treffer als Mischung der Käfigpunkte:** Das getroffene Dreieck gehört zu einer feinen Fläche (Fächer wie
   `zuDreiecken`); seine drei Ecken sind Zeilen der Grenzmatrix. Mit den baryzentrischen Gewichten des Treffers ergibt das
   den Hautpunkt p = Σ cᵢ·Xᵢ (Stencil, typisch 16–40 Käfigpunkte). Der Worker kennt die Matrix des gezeigten Körpers
   (Röhre, Maul, Beine, S8a-Linien, Baum) und merkt sie im Stand; der Editor fragt beim Druck einmal nach.
2. **Verstärkung:** Der gespiegelte Pinsel verschiebt jeden Punkt um ΔXᵢ = wᵢ·D + wsᵢ·M·D (M spiegelt z). Der Hautpunkt
   wandert damit um Δp = A·D mit A = Σ cᵢ (wᵢ·I + wsᵢ·M) = diag(a + b, a + b, a − b). In einer Pose kommen die Drehungen je
   Punkt dazu (A bleibt 3 × 3).
3. **Genauer Versatz:** D = A⁻¹·d (d = Zeigerweg in der Ebene zur Kamera). Damit liegt der Hautpunkt exakt dort, wohin
   der Zeiger zieht, und die Form des Pinsels (Radius, Abfall) bleibt dieselbe — nur die Stärke stimmt. Richtungen, die der
   gespiegelte Körper nicht kann (z auf der Mittelnaht), und zu schwache Richtungen (Radius viel kleiner als der Käfig)
   werden begrenzt und gemeldet, nie still übertrieben.
4. **Schalter:** Tafel „Pinsel“ → Ziehen „weich | genau“ (`ui.pinselGenau`), Standard weich = bitgleich wie heute. Ohne
   Antwort des Workers (Körperteile wie Wangen, Ohren, Klingen, Augapfel-Höhle, Rundmaul) zieht der Pinsel wie heute und
   sagt es.
5. **Käfig auf dem Körper aus Teilen:** Der Chip „Käfig“ zeigt künftig auch dort die Käfigkanten (heute leer).

## Tore

- Kern: Hautpunkt am Ziel ≤ 0,1 px (bei 461 px je Kachel) auf Kugel, Ei/Rex-Röhre und Ente (Teile), für Radien 5–50 % der
  Höhe, mit Zug in x, y, z; in einer Pose ebenso.
- Haut weiter als Radius + zwei Käfigkanten vom Treffer: bitgleich wie vorher (Käfigpunkte außerhalb des Radius bewegen
  sich nicht). Zwischen Radius und dieser Grenze: Änderung gemessen und berichtet (genau gegen weich).
- Spiegel bleibt exakt; ein Treffer auf der Naht bewegt sich nicht aus der Spiegelebene (Hinweis statt Ausbrechen).
- Schalter aus: Pinsel und Netz bitgleich wie vorher.
- Editor mit echten Mauszügen (eigener Vite 5192): Abstand Hautpunkt → Zeiger nach dem Zug, weich gegen genau; Bilder.
- `pnpm typecheck`, Tests `@ee/shape` und `@ee/editor`, `pnpm lint` grün.

## Stand

- 20.10.: Plan ins Repo.
- **20.10. Kern gebaut** (`packages/shape/src/kern/genauerZug.ts`, Test `genauerZug.test.ts`; Stand merkt `zugGrundlage`
  in `kern/wesen.ts`, Röhre und Baum; ohne Grundlage mit Augapfel-Höhle und offenem Rundmaul):
  - Stencil des Treffers gibt den Hautpunkt aus den Käfiglagen wieder (< 0,01 px), Summe der Gewichte 1, typisch
    16–40 Käfigpunkte; ein veralteter Stand (falsche Fläche) liefert keinen.
  - **Kugel, Zug wie im Editor** (Gewichte auf den Käfiglagen der Trefferdaten, Deltas der rechten Hälfte, gespiegelt
    angewendet; Treffer seitlich rechts auf halber Höhe, Zug 14–18 px):

    | Radius (Anteil der Höhe) | weich: Hautpunkt folgt | weich: Rest | genau: Rest | außerhalb des Radius weich / genau |
    |---|---|---|---|---|
    | 5 % | 39 % | 8,5–11,3 px | 0,000 px | 5,0–6,6 / 12,8–17,1 px |
    | 10 % | 57 % | 5,9–7,9 px | 0,000 px | 5,8–7,7 / 10,0–13,4 px |
    | 25 % (Standard) | 71 % | 4,1–5,4 px | 0,000 px | 2,1–2,7 / 2,9–3,9 px |
    | 50 % | 91 % | 1,3–1,8 px | 0,000 px | 0,8–1,1 / 0,9–1,2 px |

    Gleich für Züge in x, y und z. Weiter als Radius + 0,45 Höhen bleibt die Haut bei beiden bitgleich.
  - **Ente** (Körper aus Teilen, Brust, Radius 15 %): weich 9,0 px Rest, genau 0,000 px (Verstärkung 3,2).
  - **Naht:** Ein Treffer auf der Mittelebene bleibt in ihr (z gesperrt, Hinweis), x/y genau.
  - **Pose** (Drehung je Punkt, auch schief): Die 3 × 3-Verstärkung stimmt mit dem Weg des Editors (Rückdrehen, Spiegeln
    in der Ruhe, Posieren) auf 1e-9 überein; ein Ziel wird genau getroffen. Geprüft algebraisch, nicht mit Kieferknochen im
    Editor.
  - **Ehrlicher Befund (Tor „außerhalb des Radius“):** Die Haut bewegt sich auch außerhalb des Pinselradius — schon heute
    beim weichen Pinsel, beim genauen um die Verstärkung mehr. Ursache ist der Käfig: Ein Käfigpunkt bewegt die Haut bis zu
    zwei Käfigkanten weit, auf der Startkugel sind das ≈ 0,4 Höhen. Kleiner als das wird eine Beule nicht, egal wie klein der
    Pinsel ist. Mein Satz vom 17.10. („außerhalb des Radius ≤ 0,5 px“) gilt so nicht; er gilt erst, wenn der Käfig dort
    feiner ist (mehr Ringe, ⌘R-Loops aus V6). Gemessen und verworfen: eine Verteilung nach kleinster Norm (hält die Haut
    außerhalb bei großem Radius ruhig, macht aber immer dieselbe kleine Beule und ignoriert den Radius).
- **20.10. Editor gebaut:**
  - Tafel Körper/Posen → Pinsel → Ziehen „weich | genau“ (`ui.pinselGenau`, Adresse `?genau=1`; Standard weich =
    bitgleich wie vorher).
  - Beim Druck fragt der Pinsel den Worker einmal nach dem Stencil (`kernStencil` → `WesenClient.stencil`, Nachricht
    `stencil`, läuft vor allen wartenden Aufträgen); bis die Antwort da ist, zieht er weich, danach rechnet der letzte Zug
    genau nach.
  - Der Stencil nimmt die Matrix ohne S8a-Kanten, weil der Editor während eines Strichs schnell und ohne die eingepassten
    Kanten baut.
  - Grundform (Röhre und Teile) und Posen (Verstärkung mit den Drehungen je Punkt). Hinweise statt stiller Fehler:
    angesetzte Teile/Höhle („zieht weich“), Mittelnaht („geht nicht zur Seite“), zu kleiner Radius („folgt nur zum Teil“).
  - Chip „Käfig“ zeigt jetzt auch auf dem Körper aus Teilen die Käfigkanten (`BaumKoerperNetz.kanten`,
    `baumKaefigSegmente`).
  - Prüfung `apps/editor/scripts/pruefen/genauer-zug.mjs` (echte Mauszüge auf eigenem Vite, Abstand Hautpunkt → Zeiger in
    Feldpixeln der Bühne, vor und nach „Formen folgen“, Bilder mit Marken und Käfig).
