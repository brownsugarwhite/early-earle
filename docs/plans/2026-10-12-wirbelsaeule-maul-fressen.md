# Wirbelsäule selbst zeichnen, Maul mit Wirbelsäule, Form im Fressen-Tab (Plan 12.10.2026 nachts)

> Florian: „Kann ich die Wirbelsäule auch selbst einzeichnen, und kannst du es kombinieren, dass es auch mit dem Maul
> funktioniert? Und in der Fressenpose muss ich auch den Shape bearbeiten können!“

Grundlage: [`2026-10-12-wirbelsaeule-ein-netz.md`](2026-10-12-wirbelsaeule-ein-netz.md). Drei Schritte, nach jedem Commit und Push.

## 1. Wirbelsäule selbst zeichnen

- **Datenmodell:** `dok.wirbelsaeule?: Linie3` (Knoten in der Seite, z = 0). Fehlt sie, schlägt der Editor sie aus dem Umriss vor (wie bisher).
- **Bau:**
  - Die gezeichnete Linie wird an beiden Enden gerade bis zum Umriss verlängert; dort sitzen die Pole.
  - Der Umriss wird an diesen Punkten in Rücken- und Bauchlinie geteilt.
  - Die Ringe stehen senkrecht auf der gezeichneten Linie.
- **Bedienung** (Tab „wirbelsäule“, Form):
  - Seitenleiste mit „selbst zeichnen“ (Klicks in der Seite, Enter beendet, Esc bricht ab), „Vorschlag übernehmen“ (die automatische Wirbelsäule wird ziehbar) und „automatisch“.
  - In der Seite: Punkte ziehen. P auf der Linie fügt einen Punkt ein, P oder − auf einem Punkt löscht ihn.
  - Der Umriss bleibt dabei stehen; die Ringe verlegen sich.

## 2. Form im Fressen-Tab

- **Datenmodell:** `dok.posenProfile?.fressen?.seite?: Profil`, die Seitenform der Pose mit derselben Punktstruktur wie der geschlossene Umriss. Front und Top folgen im Fressen-Tab dem Kiefer (Anzeige).
- **Start:** Die Form, die der Fressen-Tab heute zeigt. Jeder Knoten wird über das 3D vom geschlossenen auf den offenen Körper abgebildet; die Griffe drehen und strecken sich mit.
  - Gespeichert wird beim ersten Bearbeiten.
  - Fehlt der zweite Maulanfang (Kiefer gleich), kommt ein Knoten an derselben Stelle dazu, damit sich das Maul öffnen kann.
- **Bearbeiten** wie im Form-Tab: Punkte, Griffe, ⌥, P, +, −, Pfeiltasten.
  - Punkt einfügen oder löschen im Editor-Tab tut dasselbe in der Pose.
  - Die offenen Maulanfänge folgen ihren Knoten.
- **Umriss mit offenem Maul:** wie geschlossen der Spalt, nur mit den offenen Lippen.
- **3D:**
  - Mit Maul legt sich die offene Haut an die bearbeitete Seitenform (ARAP, wie bei Florians nachgezogenen Bögen).
  - Ohne Maul ist der Fressen-Körper der Loft aus der Pose-Form.

## 3. Maul mit Wirbelsäule

- Der Maul-Käfig rechnet heute in x: Stationen, Projektion auf die Fläche, Stirn, Dichte. Er bekommt einen **Stationsraum** mit zwei Fassungen:
  - x (wie bisher, unverändert)
  - Wirbelsäule (Station = Lage entlang der Wirbelsäule, Ring = Wirbelsäulen-Ring an dieser Stelle, Projektion in der Ringebene)
- Im Tab „wirbelsäule“ baut das Maul dann auf den Ringen der Wirbelsäule: Hals hoch, Kopf drauf, Maul im Kopf.
- **Prüfen:** Die Maul-Tests mit Tiger, Rex, Robbe und Langhals bleiben in x unverändert; neu kommt der Langhals mit Maul auf der Wirbelsäule (Netz geschlossen, Lippen auf den Linien).

## Reihenfolge

1 (klein) → 2 (mittel) → 3 (groß). Nach jedem Schritt: Typecheck, Unit- und E2E-Tests, Bilder, Commit, Push.
