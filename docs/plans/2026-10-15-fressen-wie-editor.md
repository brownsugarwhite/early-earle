# Fressen wie Editor (15.10.2026)

> Florian (15.10. vormittags): „Wenn ich auf Fressen-Pose klicke, konnte ich immer den Blendshape fürs Fressen einstellen. Jetzt kann ich da gar nichts mehr verschieben. Das war ja die Idee des ganzen Editors.“ — „Das Verformen des Shapes bei Fressen ist ganz buggy und die Shapes sind nicht synchron wie bei Editor.“ — „Sobald das Wesen ein Maul hat, kann ich bei Fressen gar nichts verschieben. Ich muss Mesh und Maul exakt wie bei Editor anpassen können.“ — „Wie konnte das wegfallen? Das war ein absolutes Grundkriterium!“

Grundkriterium aus dem Plan „Wesen-Editor 2“ (5.2): **Fressen-Pose = Knochen + Körper-Blendshape. Die Pose zeigt zuerst, was die Knochen ergeben; dann bearbeitet Florian alles in der Pose (Umriss, Spanten, Pinsel, Teile).** Abnahme Phase 2: „Fressen-Pose in allen Ansichten bearbeitbar“.

## Befund (gemessen bzw. im Code nachgesehen)

1. **Pinsel nur in der Stufe Körper** (seit den neun Stufen); Fressen liegt in „Posen & Leben“. Behoben in ac40aa5.
2. **Fressen-Deltas nur mit Schlitzmaul angewendet** (Kugel, Fisch, Beine: Pinsel schrieb Deltas, keiner wendete sie an). Behoben in ac40aa5.
3. **Kurven in Fressen:** Nur die Seite bearbeitet eine eigene Pose-Form (`posenProfile.fressen.seite`, Versuch 12.10. auf dem Loft). Front und Top bearbeiten in Fressen die **Grundform**. Der Kern nimmt die Pose-Seite nur ohne Maul und tauscht damit die ganze Seite aus (nicht überblendet, Front/Top passen nicht: Florians Bild, Front Δ 120,7 px, verzogene Muster).
4. **Mit Maul** ignoriert der Kern die Pose-Seite ganz; die Maullinien in Fressen schreiben `maul.auf` (Loft-Versuch), das der Kern nicht liest: In Fressen bewegt sich nichts.
5. Kein Test prüfte „in Fressen verschieben“; Phase 2 wurde gegen die Planseite statt gegen die Abnahme des Gesamtplans gemeldet.

## Bauweise

**Fressen ist der Editor auf einer zweiten Form.** Die Pose hat eigene Griffe mit derselben Punktstruktur wie die Grundform: drei Umrisse (Seite, Front, Top), Spanten und Maullinien (`dok.posenForm.fressen`). Im Fressen-Modus sehen **alle Werkzeuge** ein Pose-Dokument (Grundform mit den Griffen der Pose); was sie schreiben, landet in der Pose, alles andere (Augen, Zähne, Ausstattung, Knochen, Käfig-Stand) in der Grundform. Dadurch arbeiten Kopplung der Ansichten, Zeichenstift, Pfeiltasten, Rot/Blau mit eigenem Anfang, Reifen, Δ und Saum in Fressen **exakt wie im Editor** — es ist derselbe Code.

**Bau (Worker):** Grundform → Käfig A (wie heute). Pose-Griffe → Käfig B mit **denselben eingefrorenen Stationen und derselben Maullage** (gleiche Topologie). Blendshape D = B − A je Käfigpunkt. Bei Öffnung o: Käfig = Knochen(A + o·D, o) + o·Fressen-Pinsel-Deltas. Ohne Maul: A + o·D (+ Pinsel-Deltas). Passt die Topologie nicht (z. B. eine neue Ecke nur in der Pose), gilt die Pose nicht und die Tafel sagt es.

**Grundform ändern nach der Pose:** Die Pose behält ihren Unterschied. Ändert sich ein Griff der Grundform, wandert derselbe Griff der Pose um dieselbe Verschiebung mit; wird ein Punkt eingefügt oder gelöscht, wird die Pose über die Lage auf der Kurve übertragen.

**Anzeige in Fressen:** Die Blätter zeigen die Griffe der Pose (geschlossene Form der Pose) über dem geöffneten Körper, Δ und Saum gegen die Pose-Griffe. Editor-Tab und Öffnung 0 zeigen unverändert die Grundform.

## Schritte (je geprüft, committet, gepusht)

1. **Datenmodell:** `posenForm` im Dokument (Schema, Typ, Rundreise), Hilfen `poseDokument(dok, name)` (Sicht) und `poseZurueck(dok, sicht, name)` (Griffe der Pose aus der Sicht, alles andere in die Grundform), `poseMitfuehren(alt, neu)` (Grundform geändert → Pose wandert mit). Unit-Tests.
2. **Editor-Speicher:** Im Fressen-Modus ist `dok` die Pose-Sicht; jede Änderung geht über `poseZurueck` in das gespeicherte Dokument (`dokBasis`), Undo/Redo, Speichern und Bau lesen die Grundform mit Pose. Die Loft-Pose-Seite (`posenProfile`, `istPose`) wird in der Bauweise Kern nicht mehr benutzt.
3. **Kern:** Käfig B aus der Pose im Worker (gemerkt je Pose-Griffe), Topologie-Vergleich, Blendshape D, Überblendung vor den Knochen; Δ/Saum in Fressen gegen die Pose. Tests: Kugel ohne Maul, Kugel mit Überbiss, Rex, Tiger — Pose-Seite oben 20 px höher → offen 20 px höher, zu unverändert, halb offen halb; Topologie gleich; Maullinie der Pose verschoben → offener Mundwinkel wandert.
4. **Editor-Haken:** Bauplan bekommt die Maullinie der Pose; Szene3D baut aus der Grundform mit Pose; Tafel „Pose Fressen“ (Zustand: eigene Form / wie Grundform, „Pose = Grundform“ zum Zurücksetzen, Hinweis bei nicht passender Topologie).
5. **Prüfmatrix im Editor** (`scripts/pruefen/fressen-wie-editor.mjs`): Kugel, Kugel mit Maul, Rex, Tiger × (Seite-Punkt ziehen, Front-Punkt ziehen, roter Anfang ziehen, Reifen-Perle ziehen, Pinsel) in Fressen → 3D ändert sich, die anderen Blätter folgen (Δ ≤ 3 px wie im Editor), Editor-Tab unverändert, Undo ein Schritt; Bilder.
6. **Doku:** Kritik-Register (Grundkriterium „Fressen = Editor auf der Pose“, vor jeder Meldung prüfen), Planseite Phase 2, Übergabe, Gedächtnis.

## Offen danach

- Knochen gibt es nur mit Schlitzmaul; Körperhaltung ohne Maul nur über Pose-Griffe und Pinsel (Körper-Rig: eigener Plan).
- Weitere Posen (Ruhen, Laufen …) bekommen dieselbe Pose-Form (gleicher Code, Name statt „fressen“) — nach Fressen.
- Teile (Beine, Flügel) je Pose: mit den Teilen.
