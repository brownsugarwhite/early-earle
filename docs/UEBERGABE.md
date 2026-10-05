# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben** (nicht angehängt): Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie steht in Git und in `docs/PRODUCTION.md`.

**Stand:** 2026-10-05, Cloud-Session „Grundblobs und Mischwesen“ (Branch `claude/grundblobs`).

## Wo wir stehen

- **Prototyp 1 ist abgeschlossen** (Archiv-Branch `prototyp-1`). Die Produktion wartet auf Florians neuen Plan und Hauptprompt; bis dahin nur Look-Beweise, kein Spielcode.
- **Look-Beweis Grundblobs** fertig als Artefakt: https://claude.ai/artifact/JfvK1CAf11oqfJXAiLyf5p. 13 Grundformen × Jelly/fest/Fell aus Florians Vorlage, Wischvergleich, Bühne, Brett (36 Blobs), Mischwesen aus zerlegten Meshy-Modellen. Details, Werkzeuge und Lücken: [`look/grundblobs/README.md`](look/grundblobs/README.md).
- Meshy-Testmodelle (Aal, Drache ohne Flügel, Giraffe, Goldie, Rex, Spinne) liegen auf Branch `meshy-test`.

## Wartet auf Florian

1. Urteil zum Look der Grundblobs (Vergleich-Tab) und zu den Mischwesen.
2. **fps auf dem iPhone** im Brett-Tab ablesen (Cloud hat keine GPU).
3. Branch `brownsugarwhite-wesenstest-meshy` löschen (Proxy blockt das Löschen aus der Cloud).
4. Drachenflügel als eigenes Meshy-Modell nachliefern, wenn gewünscht.
5. Weiterhin: lokale Mac-Commits (`b116346`) sichern, neuer Plan und Hauptprompt.

## Nächster Schritt

- Nach Florians Rückmeldung: Fell und Jelly-Innenformen nachschärfen; Gelenke der Module mit Knochen und Gewichten (Knie, Kiefer mit Kehle), Kragen an den Nähten; Leistungsmessung iPhone; danach Port nach TSL.
- Sonst offen: siehe `prototyp/README.md` §7.
