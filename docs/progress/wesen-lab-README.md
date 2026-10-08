# Screenshot-Harness des Wesen-Labs (L1)

Eine Spec, die jede Vorlage des Grundformen-Labs (`apps/game/src/lab/wesen/presets.ts`) als Bild 900 × 700 nach
`docs/progress/wesen-lab-<id>.png` schreibt und alle zusammen als Kontaktbogen nach
`docs/progress/wesen-lab-kontaktbogen.png`. Vorher- und Nachher-Bilder entstehen mit demselben Aufruf und nur anderem Tag.

Spec: `apps/game/e2e/wesen-shots.spec.ts` (Muster `nachschaerfung-shots.spec.ts`; ohne `EE_SHOTS=1` überspringt sie alles).

## Aufruf

Vom Repo-Stamm, echte GPU (Mac, Metal), eigener Port:

```sh
# alle Vorlagen, ohne Tag
EE_SHOTS=1 E2E_PORT=4471 node apps/game/scripts/e2e.mjs e2e/wesen-shots.spec.ts

# nur zwei Vorlagen, mit Tag (Dateien wesen-lab-keil-vorher.png …, wesen-lab-kontaktbogen-vorher.png)
EE_SHOTS=1 EE_VORLAGEN=keil,loch EE_SHOTS_TAG=vorher E2E_PORT=4471 node apps/game/scripts/e2e.mjs e2e/wesen-shots.spec.ts
```

`scripts/e2e.mjs` startet den Dev-Server selbst auf `E2E_PORT` und beendet ihn danach. Nie die Ports 5173/5174 nehmen
(Florians Dev-Server). Laufzeit: etwa 30 s für alle zwölf Vorlagen bei 80³ (M3 Pro).

## Parameter (Umgebungsvariablen)

| Variable | Wirkung | Standard |
|---|---|---|
| `EE_SHOTS=1` | Pflicht, sonst wird die Spec übersprungen | – |
| `EE_VORLAGEN=keil,loch` | nur diese Vorlagen (Ids aus `presets.ts`); unbekannte Ids brechen ab | alle |
| `EE_SHOTS_TAG=vorher` | Dateisuffix und Beschriftung; ohne Tag kein Suffix | leer |
| `EE_ANSICHT=referenz\|held\|brett\|seite` | Kamera: Bögen-Ansicht (Referenzmodus), freie Ansicht, Spielsicht ≈ 65° von oben oder reine Seitenansicht | `referenz` |
| `EE_DPR=2` | Geräte-Pixelverhältnis der Aufnahmen | `1` |
| `EE_ALLOW_WEBGL2=1` | auch ohne WebGPU-Adapter aufnehmen (sonst Fehler: solche Bilder sind nicht vergleichbar) | aus |

## Ausgabe (`docs/progress/`)

- `wesen-lab-<id>[-TAG].png` — eine Vorlage, 900 × 700, weißer Grund, Bögen-Kamera (Dreiviertel von rechts vorn, leicht
  von oben, lange Brennweite), Wesen eng eingepasst (84 % der Bildhöhe bzw. -breite).
- `wesen-lab-kontaktbogen[-TAG].png` — alle Vorlagen im Raster (bis neun Vorlagen 3 Spalten, darüber 4); Kopfzeile mit Tag, Commit-Hash (mit
  „+ Änderungen“, wenn tracked Dateien in `apps`, `packages`, `content` geändert sind), Datum, Backend und Ansicht;
  unter jedem Bild Name, Id, Dreiecke, Zähne und Bauzeit der feinen Vermaschung.

## Wie die Bilder entstehen

- Adresse je Vorlage: `/lab/wesen?vorlage=<id>&panel=zu&sheet=zu&boden=weiss&ansicht=referenz&standbild=1`.
  `standbild=1` schaltet Atmen und Blinzeln ab (gleiches Bild bei jedem Lauf); der Kiefer zeigt die gebaute Öffnung.
- Ohne Bedienflächen: Kopfzeile, Regler und Perf-Badge sind per CSS ausgeblendet, die Bühne füllt das Fenster.
- Jede Seite startet mit leerem `localStorage` (kein Entwurf, kein Stil aus früheren Läufen). Die Stil-Vorgabe kommt aus
  `content/creatures/stil.json`, falls vorhanden, sonst gilt der Standard des Materials.
- Aufgenommen wird erst, wenn die Info-Zeile (`[data-testid="wesen-lab-info"]`) kein „fein folgt“ mehr zeigt, die Szene
  keinen Bau mehr offen hat und die Kamera ihre feste Ansicht erreicht hat; danach noch 0,7 s für Kiefer und letzte Bilder.
- GPU- und Seitenfehler lassen den Test am Ende rot werden (`expect.soft`), die Bilder sind dann trotzdem geschrieben.


## Silhouetten-Editor (08.10.)

Tab **Körper** → „Silhouette zeichnen“: zwei Bézier-Kurven (vorn rechts, hinten links) über der Rumpfhöhe, Punkte waagerecht ziehen, Scheitel-Regler für die runde Kappe. Am besten in der Ansicht „Seite“ mit dem Referenzbild darüber. Harness-Werkzeuge: `scripts/wesen/seitenprofil.mjs` (Profil aus einer Vermessung), `EE_ANSICHT=seite`, `EE_REIHE`, `EE_STIL`, `EE_BLINK`, `EE_RES`.

**Maul‑Editor** (Tab Maul): Griffe auf zwei Schemazeichnungen (Seite: Höhe, Winkel, Neigung, Schwung; Vorn: W‑Form, Breite, Öffnung). **Vorderansicht** im Silhouetten‑Editor: Breite über der Höhe.

## Verben und Beine (08.10. abends)

- Knopf **Laufen** (Schnellaktionen, `?laufen=1`): Demo‑Gang — Hüfte schwingt verhalten (weniger bei hoher Hüfte), Knie knickt im Schwung, Becken dreht und kippt mit dem Schritt (Hüftschwung), Schultern halten dagegen, Körper wippt und pendelt; Zweibeiner gegenphasig, Vierbeiner diagonal, Achtbeiner wechselnd. Kein Bodenkontakt (das Wesen läuft auf der Stelle), nur zum Prüfen der Beinform in Bewegung.
- Regler **Verschmelzen** (Tab Beine, `unterkoerper.beine.verschmelzen`): 0 = Beine getrennt (Standard), 1 = Beine untereinander zu einem Sockel verschmolzen; mit dem Rumpf verschmelzen die Schenkel immer.
- Maul auf: der ganze Schädel (Stirn, Augen, Oberkiefer) kippt um ein Gelenk hinter dem Kopf, der Unterkiefer hängt am Schädel; Nacken und Kehle laufen in Hals und Rumpf aus.
- **Lefzen** (W‑Lippe, Tab Maul `wForm`): zwei Lappen des Oberkiefers hängen über die glatte Maullinie; Zähne, Tasche und Unterkiefer bleiben glatt. **Maulschwung** jetzt −1 … 1. **Kieferstufe**: bei ungleich breiten/langen Kiefern läuft die Maullinie am Fuß des kleineren Kiefers, der größere behält Plateau bzw. Sohle — Zähne/Hauer des größeren Kiefers stehen dort außen (`zaehne.aussen` schiebt sie weiter nach außen). Reihen zum Prüfen: `EE_REIHE="keil:maul.kieferbreite=-0.7,0,0.7"`, `EE_REIHE="aal:maul.form=0,0.3,0.6"`.
- **Zwei Maulränder** bei ungleich breiten Kiefern (`maul.oberkieferBreite` ≠ `unterkieferBreite`): das Maul schließt nicht bündig, der größere Rand liegt außen. **Getrennte Längen** (`oberkieferLaenge`/`unterkieferLaenge`): Nase über dem Maul, darunter schließt es. **Maullinie zeichnen**: im Maul‑Editor (Seite) die vier Linienpunkte senkrecht ziehen (Bézier), „Linie zurück auf Regler“ hebt sie auf.
