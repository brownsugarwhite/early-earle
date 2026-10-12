# Kanten, Rück- und Untersicht, verbundene Kiefer (12.10.2026 mittags)

> Antwort auf Florians Rückmeldung vom 12.10. mittags (Plan [`docs/plans/2026-10-12-kanten-ansichten.md`](../plans/2026-10-12-kanten-ansichten.md)).
> Alles hier ist **Versuch** im Editor: Es zeigt die Bedienung und die Geometrie, es ist nicht die fertige Bauweise.

## Kurzfassung

1. **Kiefer verbunden:**
   - Ober- und Unterlinie teilen jetzt immer den schwarzen Mundwinkel, im geschlossenen und im offenen Zustand. Vorher drehte der offene Vorschlag die Unterlinie um einen Punkt hinter dem Mundwinkel, deshalb gab es zwei schwarze Punkte.
   - Der Maulanfang klebt an der Seitenkontur, wenn sich die Form ändert.
   - Im Tab Fressen zeigen alle Ansichten den **geöffneten Körper**: Der Umriss läuft an Ober- und Unterlippe entlang bis zum Mundwinkel, die Grundform liegt blass dahinter.
2. **Kantenlinien wie vorgeschlagen:**
   - Der Zeichenstift auf freier Fläche setzt eine Linie, die auf der Fläche liegt.
   - 1 px gestrichelt = mögliche Kante, ganz glatt. Je härter, desto breiter und dunkler; schwarz 3 px = scharf. Die Härte verläuft entlang der Linie.
   - Einstellen über den Regler, die Stufen glatt/weich/fest/scharf, „weich auslaufen“ und das Breitenwerkzeug ⇧W wie in Illustrator.
3. **Ecken der Silhouetten sind Kanten:**
   - Ein Eckpunkt hat eine Härte (Standard 100 %, über Regler oder ⇧W).
   - Im 3D wird er zur Kante, in den anderen Ansichten erscheint er als Linie (Abschnitt 3).
4. **Back und Bottom** als Tab am Viewport-Titel („front · back“, „top · bottom“).
   - Echte Rückansichten: Back ist waagerecht gespiegelt (links/rechts getauscht), Bottom senkrecht.
   - Die Silhouette ist dieselbe. Neu ist, welche Fläche man trifft: Linien auf Rücken, Schwanz oder Bauch zeichnet man dort, Linien der anderen Seite erscheinen blass.
5. **Antworten auf deine Fragen** stehen in Abschnitt 1, die Recherche in Abschnitt 5.

## 1. Deine Fragen

### Lässt sich damit alles darstellen?

**Fast alles, mit drei Ergänzungen.** Was jede Zutat liefert:

| Zutat | liefert | liefert nicht |
|---|---|---|
| Silhouetten (Seite, Front, Top) | die äußere Hülle (visuelle Hülle): alles, was man im Umriss sieht | Mulden, Sattel, eingefallene Wangen, Augenhöhlen, Nüstern: Was nach innen geht, sieht man in keinem Umriss |
| Back, Bottom | **dieselben** Silhouetten (ein Umriss ist von vorn und hinten gleich) | keine neue Form, aber die Rück- und Unterseite als Zeichenfläche für Linien |
| Kantenlinien mit Härte | wo die Fläche knickt und wie scharf, verlaufend | Linien auf der Fläche verschieben die Fläche nicht in die Tiefe; eine Rille oder ein Wulst braucht mehr |
| Ecken in Silhouetten | Kanten genau dort, wo die Form sie zeichnet | – |

Die drei Ergänzungen, damit es wirklich alles wird:

1. **Querschnitte (Spanten)** an gewählten Stellen.
   - Heute gilt ein Front-Querschnitt für den ganzen Körper. Ein kastiger Kopf auf einem runden Bauch geht damit nicht.
   - Im Schiffbau löst das der Spantenriss. Er zeigt die vorderen Spanten auf der einen Seite und die hinteren auf der anderen, genau wie dein Front ↔ Back.
   - Vorschlag: In der Seite eine senkrechte Spantlinie setzen; ihr Querschnitt erscheint in Front (vordere Hälfte) bzw. Back (hintere Hälfte) und lässt sich dort wie ein Profil ziehen. Der Loft läuft dann durch alle Spanten.
2. **Formlinien mit eigener Tiefe.** Eine Linie, die in zwei Ansichten gezogen wird, hat eine echte 3D-Lage. Die Fläche wird durch sie hindurch gelegt (FiberMesh: glatte oder scharfe Kurven als Bedingung). Damit gehen Mulden, Wülste und Rillen.
3. **Wirbelsäule** für Überhänge (Langhals, eingerollter Schwanz), siehe die Recherche vom Vormittag.

Teile mit eigener Topologie bleiben eigene Tabs: Maul, Zähne, Augen, später Ohren, Beine, Flügel.

### Konturen im eigenen Tab oder im Form-Tab?

**Im Form-Tab, ohne eigene Farbe.** Gründe:

- In deinen Bögen sind Umriss und Kanten eine Zeichnung. Eine Kante gehört zur Form wie ein Umriss.
- Wie in Illustrator liegen alle Pfade auf einer Zeichenfläche. Der Zeichenstift auf dem Umriss setzt einen Punkt, auf freier Fläche beginnt er eine Kante. Ein zweiter Tab hieße ständiges Umschalten.
- Ein Farbton würde „dunkler = härter“ stören. Grau → Schwarz **ist** die Information.
- Eigene Tabs bleiben für Teile mit eigener Bedeutung (Maul, Zähne, Rig, Augen).
- Später sinnvoll: ein Schalter „Kanten ausblenden“, falls es voll wird.

### Ist Dicke plus Strichelung gut, oder geht es besser?

**Gut, mit vier Ergänzungen, die eingebaut sind.**

- **Doppelt kodiert:** Breite (1 → 3 px) und Helligkeit (Grau → Schwarz) zusammen. Eine Breite allein unterscheidet man nur in wenigen Stufen.
- **Verlauf entlang der Linie:** Jeder Knoten hat seine Härte, dazwischen fließend. So läuft eine Kante in die runde Form aus (Verjüngung aus deinem Tiger-Konzept).
- **Breitenwerkzeug ⇧W:** Punkt greifen und ziehen; der Abstand ist die Härte, ein Kreis zeigt sie (0 % am Punkt, 100 % am gestrichelten Rand). Ein Klick zwischen Knoten setzt einen neuen.
- **Zahl auf Wunsch:** Gewählte Punkte zeigen die Härte in Prozent, die Seitenleiste eine Strichvorschau.

**Grenze der Strichelung:** Im technischen Zeichnen heißt gestrichelt „verdeckte Kante“. Deshalb sind verdeckte Linien hier **blass**, nicht gestrichelt. Gestrichelt bleibt allein „möglich, glatt“. In CAD gibt es dafür ein Vorbild, siehe Abschnitt 5.

## 2. Was im Editor steht (zum Ausprobieren)

Web-Modus `pnpm --filter @ee/editor dev:web` (Port 5180) oder `pnpm editor`.

- **Kante zeichnen:** P drücken und auf freie Fläche klicken. Jeder Klick ist ein Punkt auf der Fläche, Enter oder Doppelklick beendet, Esc bricht ab.
- **Bearbeiten:** A (Direktauswahl).
  - Punkt ziehen: Er bleibt auf der Fläche, in jeder Ansicht.
  - Linie anklicken: ganze Linie gewählt.
  - Entf: Punkte löschen.
  - P auf der Linie: Punkt einfügen; P auf einem Punkt: löschen.
- **Härte:** Seitenleiste (Regler, Stufen, „weich auslaufen“) oder ⇧W direkt an der Linie.
- **Ecken:** Eckpunkt wählen, dann Härte über Regler oder ⇧W.
- **Back/Bottom:** auf „back“ bzw. „bottom“ über dem Viewport klicken.
- **Fressen mit Maul:** Der Umriss folgt dem Kiefer.
- **Bilder:**
  - `docs/progress/editor/kanten-tab.png` (Kante mit Verlauf)
  - `kanten-back.png` (Kante auf der Rückseite)
  - `maul-tab-offen.png` (geöffneter Umriss)
- **Tests:** E2E `apps/editor/e2e/kanten.spec.ts` und `maul.spec.ts`; Unit-Tests `linie3d.test.ts` (Mundwinkel, Kontur) und `umriss3d.test.ts`.

## 3. 3D: wie die Kanten entstehen

_(folgt mit dem Geometrie-Versuch `packages/shape/src/versuch/kanten.ts`)_

## 4. Offene Punkte

- Am Übergang Schädel/Oberkiefer knickt der offene Umriss leicht. Das ist die Grenze der Kiefergewichte im 3D; die Abhilfe gehört zur Mundwinkel-Zone und Kehlkette der großen Sitzung.
- Eigene Pose-Profile (Fressen mit selbst gezogenem Umriss) fehlen. Heute folgt der Körper dem Kiefer automatisch.

## 5. Recherche

_(folgt)_
