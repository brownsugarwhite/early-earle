# Gesicherte Wesen aus `kurven.html`

Hier legt der Knopf **Sichern** (oder ⌘S) im Fenster „Kurven als Wahrheit“ die Wesen ab, je Wesen eine Datei `<Name>.eewesen`;
**Laden** liest sie von hier. Das geht über den Dev-Server (`apps/editor/vite.config.ts`, Adresse `/__wesen/`).

- Eine Datei enthält den ganzen Stand: das dichte Netz, alle Loops mit Punkten, Griffen und Kanten, das Maul, die Fressen-Pose
  samt Grundform und den Ausschnitt der Blätter. Nicht enthalten ist die Liste der Schritte für ⌘Z.
- Format und Prüfung: `apps/editor/src/form/ablage.ts` (Kennung `EEKW1`, Kopf als JSON, die großen Felder binär; jede Zahl bleibt
  Bit für Bit).
- Die Messskripte lesen dieselben Dateien, zum Beispiel die Güte des Netzes:
  `cd packages/shape && npx vite-node ../../apps/editor/scripts/pruefen/form-netzguete.ts` (alle Wesen im Ordner; `WESEN="Name"`
  nur eines, `BILD=<ordner>` schreibt dazu ein Bild).
- Probewesen der Messskripte (`form-probewesen.mjs`) liegen nicht hier, sondern in `apps/editor/pruefen-ausgabe/probewesen/`:
  Die Liste von „Laden“ zeigt nur, was von Hand gesichert wurde.
- Löschen oder Umbenennen: einfach die Datei hier löschen oder umbenennen.

Unabhängig davon behält der Browser das Wesen, das gerade offen ist (es ist nach dem Neuladen wieder da), und das Wesen, das
„Laden“ oder „Neu“ zuletzt ersetzt hat. Das liegt nur im Browser, nicht in diesem Ordner.
