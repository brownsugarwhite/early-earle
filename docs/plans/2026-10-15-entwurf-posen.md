# Entwurf Teil B: Posen und Blendshapes (Anhang zum Plan, 15.10.2026)

> Ausführlicher Entwurf zum freigegebenen Plan [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md). Maßgeblich ist der Plan; wo dieser Entwurf abweicht oder Florian entschieden hat, gilt der Plan.

## Abgleich mit dem Plan und Florians Entscheidungen

- **Code-Stand:** Nach der Rücknahme von 7baee2d, 50c8976 und c10f695 (Commit 42ef353) entspricht der Code c97497b; Zeilenangaben „@c97“ bzw. „c97497b“ gelten weiter.
- **Pose-Deltas** liegen in der Zellbasis von A (gemeinsamer Baustein mit dem Pinsel-Relief aus Teil H) statt in eigenen Rahmen (betrifft D4, C3 in 2.1 und 3.3).
- **Dokument:** heißt v3 (auf v2 aus Teil H); wo dieser Entwurf „Version 2“ bzw. „v2“ schreibt, ist v3 gemeint.
- **Basis-Tab:** heißt weiter „Editor“ (intern Grundform).
- **B1** kommt als Sofortkorrektur vor Teil A (Florians Reihenfolge).
- **Rundmaul:** Die Ausnahme (2.5) gilt bis zum Einsatz.
- **Ankertabelle:** Für Einsatzpunkte gilt der Anker nach Teil A (Rolle, Kiefer, s, ρ) statt (rolle, reihe, u) in 3.2 und 3.8.
- **Migration ohne Undo-Schritt (3.6):** gilt in dieser Form nicht. Es gilt Teil H (I7): Die Umrechnung alter Fressen-Deltas geschieht beim Laden als Teil der Migration (mit Sicherungskopie), nicht als nachträglicher Schreibvorgang wie `setzeStationen`.
- **Verweis:** „Migrationsmarke (3.7)“ in 3.1 meint 3.6.

## Vorbemerkung

Der Kontext reicht aus; es folgt der vollständige Entwurf.

**Grundlage.** Alle Verweise beziehen sich auf Commit `c97497b`, also auf den Stand nach der Rücknahme von 7baee2d, 50c8976 und c10f695. Zeilennummern stammen aus `c97497b`, außer sie sind mit HEAD markiert. Teil A („Maul als Einsatz“) muss zuerst fertig sein. Abschnitt 3.8 listet genau, was Teil B davon braucht.

**Gelesene Quellen für diesen Entwurf:**
- der freigegebene Plan, der abgelöste Plan „Fressen wie Editor“, das Kritik-Register und die `CLAUDE.md` des Editors
- Florians Zeichnungen 04, 05 und 06
- der frühere Claude-Entwurf der Oberfläche in `/Users/bsw/Projekte/playground/early-earle/ref/editor/UI/early earle · Wesen-Werkstatt_Desktop.html` (nur lokal, nicht in Git). Er enthält die Regler „Fressen 0–100 %“, „Biegen −60…60°“ und „Stelle 0–100 %“, den Text „Gestrichelt in allen Ansichten: die gewählte Pose über der Grundform“, ein Rig „Schwanz → Kopf · 12 Wirbel · Kiefergelenk“, den Schalter „Knochen im 3D zeigen“ und „Jede Pose ist dieselbe Form, nur gebogen. Gespeichert wird nur die Abweichung.“

---

## 0. Die Entscheidungen auf einer Seite

| # | Entscheidung | Warum |
|---|---|---|
| D1 | **Ein Ruhekäfig A** (eingefrorene Topologie samt Maul-Einsatz) ist die einzige geometrische Wahrheit. Eine Pose speichert **keine Geometrie**, nur: Stellung θᵢ (Knochenwerte), Ruhe-Delta dᵢ, Linienversätze der Pose λᵢ, Saatparameter und Abweichungen je Pose. Das **Rig ρ ist gemeinsam**. | Der abgelöste Ansatz „Pose-Käfig B“ driftete in der Zuordnung, baute den zerbrechlichsten Teil (das Maul) für jede Pose neu und ließ Bearbeitungen über ein zweites Dokument durchsickern. |
| D2 | `X(w) = Skin_ρ(A + Σ wᵢ·Dᵢ ; Σ wᵢ·θᵢ)`, ausgewertet **auf dem Käfig**; die feine Fläche ist `G·X`. | Von der Bauart her glatt. Genau A bei w = 0 und genau die geformte Pose bei w = eᵢ. |
| D3 | Skin = **starre Transformationen je Punkt**. Der heutige Code für Kiefer, Schädel, Beutel und Beine arbeitet schon so. **LBS ist verboten.** Spätere 3D-Knochen nutzen DQS. | Exakt umkehrbar. Kein Zusammenfallen bei 90–120°. |
| D4 | **Ruhe-Deltas**, gespeichert in lokalen Ruherahmen, keine Korrekturen im posierten Raum. | Zwischenstufen drehen mit den Knochen; Korrekturen im posierten Raum liegen in der Mitte der Überblendung um 0,25–0,46·\|D\| daneben (2.3). Die geformte Pose übersteht spätere Änderungen an Knochen und Grundform. Entspricht der Reihenfolge in glTF (erst Morph, dann Skin). |
| D5 | **„Lippen exakt auf den roten/blauen Linien der Pose“ wird bei der Auswertung erzwungen.** Jede Auswertung von Pose i projiziert die Lippenketten mit einer kleinen zwischengespeicherten Lösung auf ihre Linien. Die Linien werden **relativ zu den Grundlinien** gespeichert. | Gilt automatisch nach Änderungen an Grundform, Rig und Knochen. Nichts Abgeleitetes wird gespeichert; Undo und Tabwechsel bleiben also stimmig. |
| D6 | In einer Pose sind schwarze Linien, Reifen und Lippenlinien **Griffe am posierten Körper** (Plan 4.1/4.2), gelöst im posierten Raum und in Ruhe-Deltas umgerechnet. Sie sind nie Eingaben einer zweiten Ableitung. | Front-/Top-Profile eines umgeklappten Drachenkopfs können keine Ringableitung steuern. |
| D7 | **Bearbeitungsziel (`ziel`) und Anzeige (Gewichte) sind getrennte Zustände.** Die Grundform zeigt A immer bitgleich. Vorschauen sind ausdrücklich, sichtbar und enden von selbst. | Behebt alle vier Ursachen des Tab-Fehlers an der Wurzel. |
| D8 | Haps und die Öffnung des Rundmauls sind keine Verformer bei der Auswertung mehr. Sie werden **parametrische Saatschichten** einer Pose. | Keines von beiden ist starr oder umkehrbar. Als Saat sind sie exakt und bearbeitbar. |
| D9 | **Jede Pose hat dieselbe Topologie.** Anker plus eine Topologie-Signatur rechnen Pose-Daten um, wenn sich die Topologie der Grundform ändert. | Morph-Ziele brauchen identische Punktmengen. Keine still verworfenen Posen mehr. |
| D10 | Export: beliebig viele angelegte Posen, eine Markierung „Spiel-Pose“, Morph-Ziele auf feiner Stufe, an den Endpunkten exakt, höchstens 3 aktiv je Instanz. | Löst den Widerspruch „nur 3 Morph-Ziele“ gegen unbegrenzte Posen auf. |

---

## 1. Was die Fehler lehren

1. **Alles hängt an `ui.oeffnung`, egal in welchem Modus.** In `/Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/wesen.ts`:
   - `maulLageBei` (:843, :1272) wendet Knochen und Fressen-Deltas bei der aktuellen Öffnung an;
   - Fressen-Deltas ohne Maul (:870–878) wirken, sobald die Öffnung > 0 ist;
   - andere Posen (:881) stapeln sich auf Fressen;
   - Szene3D baut bei einer Öffnungsänderung nur mit Maul neu (`Szene3D.tsx:331`).

   Das erklärt die Ursachen 1–3. Der Fehler besteht auch in `c97497b`: Eine Kugel ohne Maul mit Fressen-Deltas behält die Pose, nachdem „Editor“ geklickt wurde.
2. **Fressen-Deltas werden nach den Knochen gespeichert und durch die Öffnung geteilt.** Siehe `/Users/bsw/Projekte/playground/early-earle/apps/editor/src/kern/pinsel.ts` `pinselZiel` und `maulLageBei` in wesen.ts:1272–1277. Folgen:
   - geformte Details drehen nicht mit dem Kiefer;
   - Zwischenstufen skalieren nur eine posierte Korrektur;
   - wird ein Knochen später bewegt, bleibt das Detail zurück.
3. **Die Zuordnung der Werkzeuge ist zusammengestückelt.** In `c97497b`, in Fressen:
   - die Seite schreibt `posenProfile.fressen.seite` (`editing/aktiv.ts`), das der Kern nie liest;
   - Front und Top schreiben die Grundform;
   - Maullinien schreiben `maul.auf`, das ignoriert wird.

   Florian sieht „nichts bewegt sich“, und Bearbeitungen sickern in die Grundform (Ursache 4).
4. **Der abgelöste B-Käfig scheiterte aus strukturellen Gründen:**
   - „Gleicher Ringindex beim gleichen Wirbelsäulenanteil einer anderen Wirbelsäule“ ist keine Zuordnung; Augen, Zähne und Muster gleiten also während der Überblendung.
   - Jede Pose leitete das zerbrechliche Maul mit erzwungener Topologie neu ab.
   - Zwei Dokumente (Ansicht `dok` und `basis`) zwangen jedes Werkzeug durch `poseZurueck`.

Daraus folgen direkt D1 und D5–D7.

---

## 2. Schichtenmodell und genaue Mathematik

### 2.1 Schichten (gegen den Code geprüft, mit Korrekturen)

```
P (Profile, Spanten, Kanten, eingefrorene Stationen)     ──ableiten──▶ C(P)
C(P) + D_form (Grundpinsel, Vorlagenpunkte)              ──▶ A0
A0 + Maul-Einsatz (rote/blaue Linien, gleich/getrennt; Teil A) ──▶ A          Ruhekäfig, Topologie 𝒯 (eingefroren)
A + ρ (gemeinsame Rig-Parameter)                         ──▶ 𝓡(A,ρ)    Gelenke, Gewichte je Punkt (nur aus A)
Pose i:  θᵢ (Stellung), dᵢ (Deltas im lokalen Rahmen), λᵢ (Linienversätze), σᵢ (Saatparameter)
Dᵢ = F(A)·dᵢ + Sᵢ(A,𝓡,θᵢ,σᵢ) + Cᵢ(A,𝓡,θᵢ,dᵢ,λᵢ)          Nutzer + Saat + Lippenprojektion (Sᵢ, Cᵢ abgeleitet)
X(w) = Skin_𝓡(A + Σ wᵢ·Dᵢ ; θ(w)),   θ(w) = Σ wᵢ·θᵢ
Y(w) = G·X(w)                                            feine Grenzfläche (abl.unterteilung.grenze)
feine Aufsätze (Augenhöhlen; Rundmaul, bis es ein Käfig-Einsatz wird), ausgewertet auf X(w)
```

Korrekturen am geplanten Modell:
- **C1. Gewichte kommen nur aus A (Bindepose).** Heute tut `kieferBasis.ruhe` in `kieferGewichteSetzen` (`/Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/maul.ts`:955) das schon. Hingen die Gewichte je von A + D ab, würde die geformte Pose nicht mehr exakt wiedergegeben.
- **C2. Skin auf dem Käfig, dann unterteilen.** Der Käfig ist die Wahrheit; die Folge für das Spiel steht in Abschnitt 8.
- **C3. Deltas werden in lokalen Ruherahmen F(A) gespeichert**, damit Änderungen an der Grundform, die einen Bereich drehen, die Pose mitnehmen. Weltrahmen bleiben als Rückfall-Schalter; die Wahl fällt am Tor von B2.
- **C4. Sᵢ und Cᵢ werden immer abgeleitet, nie gespeichert.**
- **C5. w = 0 muss abkürzen.** Eine Drehung um 0° ist in Gleitkomma keine bitgenaue Identität (`cx + (x − cx) ≠ x`). „Die Grundform zeigt A bitgleich“ ist ein Test.

### 2.2 Die Transformation je Punkt und wann sie umkehrbar ist

Das heutige `maulPose` (maul.ts:2567–2632), ausgeschrieben für einen Käfigpunkt.

Bezeichnungen:
- σ = `m.vorn`, L = `m.laenge`
- h = Gelenk (`kieferGelenk`), s = Schädelgelenk (`schaedelGelenk`)
- wu, wo, wb = Gewichte für Kiefer, Schädel und Beutel; r(v) = Beutelring; e_r = Plattenkante (`m.plattenKante`)

Die Teile:
- Kiefer, „kippen“: `J_v(p) = Rot_z(h, −σ·wu·α)·p + wu·τ`, mit `τ = (σ·τx·L, τy·L)` (das ist `kieferZug`).
- Kiefer, „ziehen“: `J_v(p) = p + wu·ζ·L·ẑ`, mit `ẑ = m.zug`.
- Beutel: `B_v(p) = p + wb·κ_r`, mit `κ_r = J_full(e_r) − e_r`.
- Schädel: `S_v(p) = Rot_z(s, σ·wo·β)·p`.
- Zusammen: `T_v = S_v ∘ B_v ∘ J_v`, also `R_v = Rot_z(σ·(wo·β − wu·α))` und det R_v = 1.
- Beine (`teil.ts:334`): `Rot_z(hip, g_v·γ)`.

Umkehrung: `T_v⁻¹(q) = R_vᵀ·(q − t_v)`. Der Auswerter liefert je Punkt den Winkel φ_v und t_v (später eine Quaternion).

Bedingungen für die Umkehrbarkeit:
- **I1.** Jede Transformation je Punkt muss starr sein. Gelenkverkettungen, Verschiebungen und normierte Dual-Quaternionen (mit Ausrichtung auf eine Hemisphäre) erfüllen das.
- **I2.** LBS erfüllt es nicht: `½·(Rot 90° + Rot −90°)` ist singulär. LBS wird nie benutzt.
- **I3.** Haps liest posierte Geometrie, und das Rundmaul skaliert radial mit r_zu → 0. Beides ist nicht umkehrbar; beides wird deshalb Saat (2.5).
- **I4.** T darf nicht von D abhängen (C1).
- **I5.** Globale Injektivität (keine Selbstdurchdringung) folgt nicht aus der Starrheit je Punkt. Sie wird gemessen (Abschnitt 9).

Spätere Knochenarten:
- **Scharnier** (feste Achse, exaktes Mischen der Winkel, wie heute Kiefer/Schädel/Beine);
- **Schub** (Verschiebung);
- **Kugel** (3D-Drehung über DQS).

„Biegen/Stelle“ aus dem Entwurf wird eine Scharnierkette auf der Wirbelsäule mit Ringgewichten.

**Gleichwertigkeitstest:** Mit Haps 0 muss der neue Skin dem alten `maulPose` bis ≤ 1e-12 gleichen.

### 2.3 Ruhe-Deltas gegen Korrekturen im posierten Raum

Für eine Pose beim Gewicht t, mit starrem R:
- **Ruheraum:** `X(t) = T(tθ)·A + t·R(tθ)·D`
- **Posierte Korrektur:** `X'(t) = T(tθ)·A + t·R(θ)·D`, weil die Korrektur `C = B − Skin(A; θ) = R(θ)·D` ist.
- **Unterschied:** `2t·|sin((1−t)·φ/2)|·|D|`.
  - Kiefer 58°, t = ½: 0,25·|D|. Ein großer Haps (|D| ≈ 0,15–0,2 H) liegt dann um etwa 10–20 px bei 461 px je Kachel daneben.
  - Drachenschädel 110°, t = ½: 0,46·|D|.

| Eigenschaft | Ruheraum (vor dem Skin) | Posierte Korrektur |
|---|---|---|
| Exakt bei w = 0 und w = eᵢ | ja | ja |
| Die geformte Pose folgt einer späteren Knochenänderung in dieser Pose | ja | nein (das Detail bleibt, wo es war) |
| Mehrere Posen mit verschiedenen Knochen | stimmig | die Korrektur wird nicht mit den Knochen der anderen Pose gedreht |
| Zwischenstufe passt zum Knochenbogen | ja | nein (schlechter, je größer der Winkel) |
| Reihenfolge in glTF/Engine (Morph vor Skin) | identisch | braucht Umrechnung |
| Weltfeste Absicht (z. B. Robbenlippe, die gerade die Brust hinabgleitet) | bogenförmige Bahn | geradere Bahn |

**Entscheidung: Ruheraum.** Die eine Schwäche (letzte Zeile) bekommt eine wahlweise Abhilfe, Zwischenschlüssel (2.4), aber nur, wenn die Glättemaße in Abschnitt 9 scheitern.

### 2.4 Mehrere Posen, Pose → Pose, Zwischenstufen

- **Additiv.** Gewichte sind frei; Σw > 1 ist erlaubt (zum Beispiel „Fressen + Kopf hoch“).
- **θ(w) ist linear.** Gelenkwinkel und Verschiebungen sind lineare Koordinaten. Spätere Kugelknochen mischen Drehvektoren.
- **Morph A → B:** w_A = 1 − t, w_B = t. Die Grundform hat einfach kein Gewicht. Beide Endpunkte sind exakt.
- **Zwischenschlüssel (wahlweise, Schritt B8):** Dᵢ(w) und θᵢ(w) werden Hermite-Splines durch (0, 0), (w_k, D_k) und (1, Dᵢ). Sie werden im Pose-Tab über „Zwischenstufe 50 % formen“ geformt.

### 2.5 Teile ohne Knochen

- **Haps → Saatschicht `S_haps`.**
  - Die reine Knochenpose `Skin(A; θ_F)` nehmen.
  - Die heutige Mathematik von `hapsAnwenden` (maul.ts:2641) im posierten Raum anwenden.
  - Je Punkt umrechnen: `S = Rᵀ·h`.
  - Zwischenspeichern je (A, Rig, θ_F, Parameter).

  Bei w = 1 sieht das aus wie heute, und die Zwischenstufen werden besser. Der Regler „Haps“ bleibt als Saatmenge von Fressen; die vier Haps-Parameter werden Saatparameter. Der Aufruf `oeffnung·haps` verschwindet aus `maulPose`.
- **Rundmaul.** Heute ist es ein Aufsatz im feinen Netz, dessen Topologie bei zu = 0 und Öffnung 0 verschwindet (wesen.ts:903). Das bricht „gleiche Topologie in jeder Pose“.
  - Anforderung an Teil A: Das Rundmaul wird ein immer vorhandener Käfig-Einsatz mit nicht entartetem geschlossenem Zustand.
  - Seine Öffnung wird dann eine Saat `S_rund` (radial) von Fressen.
  - Bis dahin: Radius = lerp(zu, auf, w_F), und der Einsatz wird sichtbar erzwungen, sobald es irgendeine Pose gibt. Das ist eine dokumentierte Ausnahme.
- **Zähne.**
  - Die Wurzel sitzt auf dem posierten Zahnfleisch an ihrem Ruheparameter u.
  - Ausrichtung = der Ruherahmen des Zahns, gedreht um die bestpassende Drehung der Zahnfleischumgebung von Ruhe zu Pose (`starreAnpassung`, `/Users/bsw/Projekte/playground/early-earle/packages/shape/src/versuch/kiefer.ts`:61). Das hält die Zähne starr und senkrecht zum Zahnfleisch, auch wenn der Blendshape es biegt.
  - Zahn-Abweichungen je Pose verallgemeinern `ZahnEintrag.auf` und mischen sich mit wᵢ.
- **Augen.**
  - Glubschaugen sitzen am posierten Hautpunkt (das vorhandene `posiert`), ausgerichtet nach der posierten Normale plus mitgeführter Tangente.
  - Augapfel: Mitte = posierte Mitte der Höhle; Drehung = bestpassende Drehung des Höhlenrings.
  - Gemalte Augen und Muster folgen schon über das Ruhe-Attribut (`ruhe`/`eeRest`).
- **Beine.** Der Schwung gehört zur Stellung jeder Pose; verschmolzene Beine gehören zu D; angesteckte Beine bewegen sich starr mit ihrer Hüfte.

### 2.6 Extreme Posen: reicht das?

- **Drachenkopf umklappen (Schädel 90–120°).** Das Mischen der Winkel je Punkt berücksichtigt Drehungen und fällt deshalb nicht zusammen. Die gestauchte Seite des Halses wird Falten werfen; das wird mit Formen und der Bandbreite des Rigs behoben und gemessen.
- **Langhals / Robbe, Unterlippe den Hals bzw. die Brust hinab.** Das kann kein Knochen. Die blaue Linie der Pose wird dort hinunter gezeichnet, und die Lippenprojektion zieht die untere Lippenkette darauf.
  - Weil die Topologie unveränderlich ist, trennt die Lippenschleife in jeder Pose dieselben Punkte: Äußere Haut kann nie Mundinneres werden.
  - Die Taschenreihen des Einsatzes müssen sich also dehnen, und die Kinn-/Brusthaut unter der Lippe muss durch Formen gestaucht oder zurückgeschoben werden.
  - Das ist eine Anforderung an die Dehnreserve von Teil A (Maß M4).
- **Rundes Tigermaul.** Haps-Saat plus Pose-Linien, als zwei Halbkreise gezeichnet. Die Rundheit ist durch die Zahl der Punkte der Lippenkette begrenzt, eine weitere Anforderung an Teil A.
- **Reicht LBS?** Nein, und es wird nie benutzt. Ebene Scharniere mischen Winkel exakt. 3D-Ketten nutzen DQS. Ruhe-Deltas berücksichtigen Drehungen schon. Zwischenschlüssel nur, wenn gemessen nötig.

---

## 3. Datenmodell

### 3.1 Dokumentversion 2

Das zod-Schema kommt zuerst. Die Typen sind wegen `exactOptionalPropertyTypes` von Hand geschrieben. Datei: `/Users/bsw/Projekte/playground/early-earle/packages/shape/src/dokument.ts`.

```ts
type PoseId = string;                                   // 'fressen' ist fest; andere 'p_<base36>'
type KnochenWert = { winkel?: number; zug?: [number, number]; ziehen?: number };
type Stellung = Partial<Record<'kiefer' | 'schaedel' | `bein${number}` | `hals${number}`, KnochenWert>>;
type LinienVersatz = { dp: V3T; dein: V3T; daus: V3T }[]; // ein Eintrag je Knoten der Grundlinie, im Ruherahmen des Knotens
type Pose = {
  id: PoseId; name: string; art: 'fressen' | 'frei';
  stellung: Stellung;
  form: KaefigDelta[];                                  // Nutzer-Deltas, lokaler Ruherahmen (u, n, b), rechte Hälfte + Naht
  rahmen?: 'lokal' | 'welt';
  linien?: { oben: LinienVersatz; unten: LinienVersatz; ecke: V3T };
  saat?: { haps?: { staerke: number; tiefe: number; hoehe: number; weite: number; radius: number }; rund?: { auf: number } };
  zaehne?: Record<string, Partial<ZahnWerte>>;          // Schlüssel `${kiefer}:${index}`
  zwischen?: { w: number; form: KaefigDelta[]; stellung?: Stellung }[];   // später (B8)
  spiel?: boolean;
  formAlt?: 'nachKnochen';                              // Migrationsmarke (3.7)
};
type Rig = {
  kiefer?: { art: 'kippen' | 'ziehen'; gewichte: 'winkel' | 'ringe'; gelenk: [number, number]; winkel: [number, number]; reichweite: [number, number] };
  schaedel?: { gelenk: [number, number] };
};
// Dokument v2: `posen: Pose[]` (Reihenfolge = Reihenfolge in der Oberfläche, genau eine mit art 'fressen'), `rig?: Rig`,
// `kaefig: { deltas, stationen?, topologie?: { signatur: string; anker: AnkerTabelle } }`.
// Entfällt: posen: PoseName[], kaefig.posen, die Pose-Felder in maulOptionen, posenProfile (Kern), POSEN.
```

### 3.2 Anker, Topologie-Signatur, Umrechnen

**`AnkerTabelle`:** ein Eintrag je Punkt des Ruhekäfigs. Klassen und Koordinaten:

| Klasse | Koordinaten |
|---|---|
| Ring | s = eingefrorener Wirbelsäulenanteil, φ = j/N |
| vordere oder hintere Kappe | Gitter (a, b) |
| Maul-Einsatz | (rolle, reihe, u entlang der Lippenschleife) – aus Teil A |
| Teil | (teil, ring, φ) |
| Rückfall, alle Klassen | (Käfigfläche, u, v) auf der Ruhefläche |

**Signatur** = Hash aus Verbindungen, Falten und Ankertabelle.

**Gleiche Signatur:** Punktindizes direkt nutzen (bitgenau). Das ist der Normalfall: Stationen sind eingefroren, Profilzüge ändern also keine Indizes.

**Andere Signatur** (Neu ableiten, ein Reifen beansprucht einen anderen Ring, Maul neu gezeichnet oder gelöscht, Ringzahl geändert): `umhaengen(altAnker, altDeltas, neuAnker)`.

| Fall | Umrechnungsregel |
|---|---|
| Ringklasse | stückweise linear in s beim gleichen φ (bilinear, wenn sich N geändert hat) |
| Maulklasse | gleiche (rolle, reihe): linear in u; andere Reihenzahl: bilinear |
| Klasse kommt neu hinzu (Maul später gezeichnet) | Rückfall-Flächenkoordinaten, baryzentrische Interpolation des alten Körperfelds |
| Klasse verschwindet (Maul gelöscht) | verworfen, mit Hinweis; Undo stellt wieder her |
| Linien | Knoten eingefügt: de-Casteljau-Teilung von λ (formneutral). Knoten gelöscht (nur in der Grundform): jede Pose-Linie mit demselben Ausgleich wie `profil.ts loeschen` neu anpassen. |

Das vorhandene `/Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/posenAnker.ts` (`maulAnker`, `posenUmhaengen`) ist die Vorlage.

Regel: Umgerechnet wird bei Bedarf im Worker, nie als versteckter Schreibvorgang. **Wird irgendeine Pose geschrieben, werden alle Posen im selben Undo-Schritt auf die aktuelle Topologie umgerechnet.** Das Dokument hält eine einzige Ankertabelle.

### 3.3 Lokale Rahmen

`F_v = (u, n, b)`, berechnet auf der Ruhe-Grenzfläche:
- n = Normale der Grenzfläche;
- u = ∂/∂s (von Ring zu Ring), in die Tangentialebene projiziert; bei Einsatzpunkten die Lippentangente;
- b = n × u.

Die Rahmen sind spiegelstimmig, gehen innerhalb eines Rings um die Kappenpole in den Weltrahmen über und werden bei jedem Bau neu berechnet (billig). Der Export backt alles in Objektkoordinaten. Abbruchregel K6 (Abschnitt 10): auf Weltrahmen zurückfallen, wenn lokale Rahmen in den Ausbreitungstests verlieren.

### 3.4 Lippenlinien der Pose (relativ zu den Grundlinien)

- Knoten k einer Pose-Linie: `q_k = T_k(θ)·(p_k + F_k·dp_k)`. Griffe: `R_k·(e_k + F_k·de_k)`.
- T_k nutzt die Gewichte der Lippenkette, interpoliert am Lippenparameter des Knotens.
- Ist die Grundform „gleich“, beziehen sich beide Pose-Linien auf dieselbe (türkise) Grundlinie, haben aber unabhängige λ. **Eine Pose hat deshalb immer zwei Linien, Rot und Blau, jede mit eigenem Anfang**; das braucht Florians „im Fressen-Tab immer getrennt“.
- Der Mundwinkel (`ecke`) ist beiden Linien gemeinsam. Die Anfänge sind auf z = 0 festgelegt.

### 3.5 Rig und reiner UI-Zustand

- **Rig (`dok.rig`)** übernimmt die bisherigen Pose-Felder von `maulOptionen`: `gelenk`, `kieferWinkel`, `kieferReichweite`, `gewichte`, `oeffnungsart`, `schaedelGelenk`. Ihre Änderung baut A nie neu; sie lässt nur `kieferGewichteSetzen` neu laufen.
- **Bauoptionen bleiben in `ausstattung.maulOptionen`:** `band`, `bandOben`, `nackenGanz`, `platte`, `beutel`.
- **Nicht gespeichert:** `ziel`, `vorschau`-Gewichte, `morph {von, zu, t, spielt, dauer}`, `geist`, `anzeigeGeneration`.

### 3.6 Migration v1 → v2

In `dokumentLesen`:
- **Fressen.**
  - Stellung: `kiefer = {winkel: winkelUnten, zug: kieferZug, ziehen: zugWeite}`, `schaedel = {winkel: winkelOben}`, aus `maulOptionen`, sonst aus der Vorlage der Maulart.
  - `form = kaefig.posen.fressen`, markiert mit `formAlt: 'nachKnochen'`.
  - `saat.haps` aus den Haps-Parametern.
- **Ruhen/Laufen/Inklusion:** eine Pose je Name, `form = kaefig.posen[name]`. Diese hatten θ = 0; die Umrechnung ist also exakt.
- **Rig:** aus `maulOptionen` herausgelöst.
- **`formAlt` im Worker umrechnen:** `D_v = R_v(θ_F)ᵀ·(X_old,v(1) − t_v) − A_v`, wobei `X_old(1) = maulPose(A, 1) + D_old`.
  - Der Editor schreibt das Ergebnis zurück wie `setzeStationen`: ohne Undo-Schritt und nur, wenn `ed.dok === dok`.
- **Tests:** neues X(e_F) = altes X(1) bis ≤ 1e-9; zod hin und zurück.
- **Prüfwesen (`pruefwesenBauplan`)** liefern Rig + Fressen-Stellung. Tiger: 20°/26°, Haps-Saat 1.

### 3.7 (frei – die Nummerierung bleibt im Gleichschritt mit dem deutschen Plan)

### 3.8 Schnittstelle, die Teil A liefern muss

Der Einsatz muss bereitstellen:
- die Lippenketten (oben und unten, Käfigindizes rechts und links) und die Indizes der Mundwinkelzone;
- je Einsatzpunkt (rolle, reihe, u);
- feine Lippen-Abtastzeilen von G mit Ruhe-Linienparametern σ_k;
- eine Funktion, die die Lippenketten für einen gegebenen Käfig auf Linien legt (genutzt von der Grundform und von der Pose-Projektion mit θ = 0).

Dazu zwei Kapazitätsanforderungen, geprüft mit Maß M4:
- **Lippendichte:** genug Lippenpunkte je Seite für runde Öffnungen;
- **Taschenreihen:** genug, um sich auf etwa die 3-fache Maullänge zu dehnen (Robbe, Langhals).

---

## 4. WYSIWYG-Bearbeitung in einer Pose

### 4.1 Griffe im posierten Raum

Alle Griffe wirken auf den posierten Körper, und **jeder Schreibvorgang geht in die Pose**.

| Griff | Ansichten | Schreibt |
|---|---|---|
| Schwarze Linie in der Seite = posierte Naht (äußerer Hautteil, endet an den Lippenanfängen) als Bézier-Kurve | Seite, Bühne | `form` über den Löser |
| Schwarze Linien in Front/Top = posierte Silhouette | Front, Top | `form` über den Löser, beim Loslassen neu linearisiert |
| Rote/blaue Linien, Anfänge, Mundwinkel | alle Ansichten + Bühne (2 Koordinaten je Ansicht, wie in der Grundform) | `linien` (λ), dann die Projektion |
| Reifen-Perlen = posierte Grenzkurve des Rings | Bühne; Front, wenn die Ringebene höchstens 30° von der Front abweicht | `form` über den Löser |
| Pinsel: ziehen, aufblasen, ⇧ glätten | Bühne | `form` direkt; danach folgen die Linien (4.6) |
| Knochen: Unterkiefer drehen/ziehen, Schädel drehen (später Hals, Beine) | Seite, Bühne | `stellung` |
| Zahn-Abweichungen | Stufe Zähne | `zaehne` |
| Rig-Gelenke und -Gewichte | Posen & Leben → Rig | `rig` (alle Posen) |

**Woher die Knoten der schwarzen Linien kommen:**
- **Seite:** Grundknoten k wird auf den Bogenlängenparameter σ_k der Ruhenaht abgebildet (nächster Punkt der Ruhenaht), dann auf den posierten Nahtpunkt bei σ_k. Die Griffe werden mit `fitSegment` (`/Users/bsw/Projekte/playground/early-earle/packages/shape/src/fit.ts`:163) an die posierte Naht zwischen den Knoten angepasst, mit posierten Tangenten. Die Abweichung der Anpassung wird gezeigt.
- **Front/Top:** Ein Grundknoten wird auf seinen Ruhepunkt auf der Konturerzeugenden abgebildet (die Δ/`saum`-Mechanik in `kern/abweichung.ts`), dann in die Pose. Er bleibt nur, wenn er höchstens 2 px von der posierten Silhouette entfernt liegt; die Griffe werden angepasst.
- **Knoten nur in der Pose** (Stift auf der Kurve) sind zusätzliche σ-Werte, die nur im UI-Zustand gehalten werden. Sie ändern die Form nicht.

### 4.2 Der Löser im posierten Raum

Neue Dateien: `/Users/bsw/Projekte/playground/early-earle/packages/shape/src/loeser/posenLoeser.ts` und `cholesky.ts`.

**Unbekannte.** ΔX in einem Einflussbereich (ROI), nur rechte Hälfte + Naht; bei Nahtpunkten ist z fest.

**Energie.** `Σ_a ‖L·ΔX_a‖² + ε‖ΔX_a‖² + Σ_soft w_k·(g_k·ΔX_a − r_k,a)²`, mit harten Bedingungen `g_k·ΔX_a = r_k,a`.
- g_k = Zeilen der Grenzmatrix G (`abl.unterteilung.grenze`).
- L = gleichförmiger Laplace-Operator auf dem ganzen gespiegelten Käfig, auf die Unbekannten der rechten Hälfte umgelegt (Vorzeichenwechsel für z). Faltenpunkte nutzen nur Faltennachbarn, und Ecken sind frei, wie im `glaettung`-Term von `ausgleichsLoeser` (`/Users/bsw/Projekte/playground/early-earle/packages/shape/src/loeser/grenzflaeche.ts`:55).

**Zerlegung.**
- `Q_a = LᵀL + εI + Σ_soft w·gᵀg`, zerlegt mit RCM-Ordnung plus Hüllen-Cholesky. Ein Röhrennetz hat eine Bandbreite von etwa einem Ring; das dauert also ≤ 5 ms bei n ≤ 1500.
- Harte Bedingungen nutzen das Schur-Komplement `S_a = C·Q_a⁻¹·Cᵀ` (dicht, m ≤ ~200).
- **Einmal zerlegen je (Topologie-Signatur, ROI, Menge der Bedingungszeilen, Achse); jeder Zugschritt ist nur Rückwärtseinsetzen (< 1 ms).**

**Bedingungen je Achse und Ansicht.** Sie entsprechen der Regel der Grundform „zwei Koordinaten je Ansicht“:
- Seite bindet x und y;
- Front bindet z und y;
- Top bindet x und z;
- Züge auf der Bühne binden alle drei Achsen, das Tiefenziel bleibt auf der aktuellen Tiefe.

**Örtlichkeit.** Der ROI ist die Menge der Ringe im Käfiggraphen innerhalb des Radius r. Der Standardwert von r hängt von der Griffart ab; F passt ihn an wie beim Pinsel. Zwei feste Randringe ergeben einen C1-stetigen Auslauf auf exakt null außerhalb.

**Silhouetten.** Die gebundenen Zeilen bleiben während eines Zugs fest. Beim Loslassen werden sie einmal neu linearisiert (eine neue Zerlegung).

**Wiederverwendung.** Die Helfer für Zeilenaufbau und Glättungsterm aus `ausgleichsLoeser` herauslösen. Die Ableitung der Grundform behält ihren dichten Löser, der auch als Test-Orakel dient.

### 4.3 Lippenprojektion (bei jeder Auswertung erzwungen)

Für jede Pose P an ihrem Endpunkt:
1. `X̃ = Skin(A + F·d_P + S_P ; θ_P)`.
2. Ziele: Die feinen Lippen-Abtastpunkte k (aus Teil A) gehen auf `L_P(σ_k)`. Die Bedingungen sind hart an Knotenparametern (Anfänge, Mundwinkel, innere Knoten) und weich dazwischen.
3. ROI = Einsatz + 2 Körperringe. Das Ergebnis ΔX ergibt `C_P = Rᵀ·ΔX`.
4. Die Zerlegung wird je Topologie und Knotenstruktur der Linien zwischengespeichert. Jede Auswertung ist nur Rückwärtseinsetzen.
5. Wahlweise: tangentiale Entspannung am Gestenende (eine gekoppelte 3D-Lösung), nur wenn Messungen es verlangen.

Ein Linienzug ändert also nur λ; die Projektion in der Auswertung ist die Antwort darauf. Die Züge an schwarzen Linien und Reifen (4.2) sind es, die ΔD speichern.

### 4.4 Bearbeitungen in Ruhe-Deltas umrechnen

`ΔD_v = R_v(θ_P)ᵀ·ΔX_v`, dann `Δd_v = F_vᵀ·ΔD_v`. Ein Undo-Schritt je Geste.

Für den Pinsel arbeitet das vorhandene `pinselZeiger` auf dem posierten `treffer.kaefig.xyz`. Das Netzergebnis muss zusätzlich `treffer.kaefig.dreh` (φ_v) und `rahmen` (F_v) für die angezeigte Pose tragen, damit die Umrechnung im Hauptthread geschehen kann.

### 4.5 Änderungen an der Grundform erreichen jede Pose

- **Automatisch durch die Darstellung:** X_P wird aus dem neuen A neu berechnet, und das Rig folgt A.
- **Linien** sind relativ, und die **Lippen** werden bei jeder Auswertung neu projiziert.
- **Strukturelle Änderungen der Grundform** laufen über die Anker (3.2).
- Undo braucht nichts Besonderes, weil nichts Abgeleitetes gespeichert wird.

### 4.6 Strukturoperationen und was in einer Pose verboten ist

- **Formneutrales Einfügen von Knoten** in einer Pose fügt per de Casteljau in die Grundform und in jede Pose ein. Die Tests verlangen, dass jede Form bitgleich bleibt.
- **In einer Pose nicht erlaubt** (ein Hinweis verweist auf die Grundform):
  - Knoten löschen;
  - eine neue Maullinie zeichnen oder das Maul löschen;
  - gleich/getrennt;
  - neue Reifen, Kanten oder Spanten;
  - Neu ableiten;
  - Augen setzen;
  - Verteilung der Zähne oder ihre u-Lage.

  Das ersetzt die alten Lecks (`maulKnoten.ts` fügt Punkte ins Seitenprofil ein, Punktkopien aus Pose-Kurven).
- **Linien folgen dem Pinsel.** Nach einem Pinselstrich in der Pose, der die Lippen berührt, passt ein Worker-Auftrag `linienFolgen(poseId)` λ mit festen Knotenparametern an die posierte Lippenkurve an, im selben Undo-Schritt (dasselbe Hook-Muster wie `kernFolgen`). Ohne ihn würde die Projektion den Strich rückgängig machen.

---

## 5. Bedeutung von Modus und Tab, Auslöser für den Neubau

### Zustand

| Store | Neues Feld | Ersetzt |
|---|---|---|
| `editorStore` | `ziel: 'grundform' \| PoseId` | `modus` |
| `uiStore` | `vorschau`, `morph`, `geist`, `anzeigeGeneration` | `oeffnung`, `poseStaerke` |

`anzeigeGewichte()`:
- `ziel = grundform` → `{}` (plus eine eventuelle Vorschau);
- `ziel = P` → `{P: 1}` (die Vorschau überschreibt);
- Morph aktiv → `{A: 1 − t, B: t}`.

### Kern

Der Kern wertet nur `plan.gewichte` aus. Eine leere Menge liefert A (Abkürzung, bitgleich). `modus` und `oeffnung` verschwinden ganz aus dem Kern.

### Abhilfe für die Ursachen 1–4

1. **Eine atomare Aktion, `setzeZiel(z)`.** Pillen, Chips, Q und der Doppelklick auf den Kieferknopf rufen sie alle auf. Sie setzt `ziel`, beendet die Vorschau und erhöht `anzeigeGeneration`; das ergibt genau einen Bau. Auslöser für den Neubau ist `anzeigeGeneration`, **mit oder ohne Maul** (entfernt die Sperre bei `Szene3D.tsx:331`).
2. **Keine Öffnungsregler, die Zustand schreiben.**
   - Die Öffnungsregler in Maul, Rundmaul, ZahnFeld und FressenFeld entfallen.
   - Der **Kieferknopf wird eine Vorschau**:
     - Ziehen zeigt das Fressen-Gewicht live;
     - die Vorschau endet bei der nächsten Bearbeitung, bei Esc, bei einem Wechsel von `ziel` oder bei einem Stufenwechsel;
     - Doppelklick wechselt Grundform ↔ Fressen („rastet“).
   - Knochengriffe gibt es nur, wenn `ziel` eine Pose ist, und Greifen ändert nie Gewichte. Das beseitigt „Knochen greifen setzt Öffnung = 1“ (HEAD `KieferEbene.tsx:157`, `knochen3d.ts:106`).
3. **Jeder Rücksetzweg läuft über `setzeZiel` / `vorschauAus`:** `poseLoeschen`, `poseNeu`, `neu`, `laden`, Stufenwechsel.
4. **Werkzeug-Router.** Neue Datei `/Users/bsw/Projekte/playground/early-earle/apps/editor/src/werkzeuge/ziel.ts`. Jedes Werkzeug erklärt `{grundform: handler, pose: handler | 'verboten'}`. Pose-Handler schreiben nur über `poseSetzen(id, f)`. Test je Werkzeug: Die Grundform bleibt bitgleich.

### Bedienregeln

- **Bearbeiten während einer Vorschau:** Pointerdown ruft zuerst `vorschauAus()` auf. Eingaben bleiben gesperrt, bis `aktuellesNetz().generation === anzeigeGeneration` gilt.
- **Erstes Bild:** Das Netz trägt seine Generation. Szene3D und die View2D-Überlagerungen (Pose-Linien gegen Grundlinien) zeichnen nur eine passende Generation, und die Überlagerungen leiten sich aus dem Netz ab, nicht aus dem Store.
- **Undo/Redo:** Verlaufseinträge sind `{dok, ziel, name}`. Undo stellt das Dokument wieder her **und wechselt `ziel` dorthin, wo der Schritt geschah**, mit einem Hinweis wie „↶ Fressen: Unterlippe“.
- **Speichern/Laden:** Gewichte werden nicht gespeichert. `laden` startet in der Grundform ohne Vorschau.
- **Zahnprüfung:** läuft auf eigenen Zuständen, unabhängig von der Anzeige: Fressen bei 0/0,25/0,5/1 und jede andere Pose bei 0,5 und 1.

---

## 6. Oberfläche für „Posen & Leben“

Der Rahmen bleibt wie im großen Plan: Stamm mit neun Stufen (Stufe 8, Pink `#FF2E9A`), Tafel 300 px, Glas-Dock, Standard-Layout „Bühne“ mit dem Seiten-Blatt in doppelter Höhe (dort leben die Knochen).

### Kopf

Pillen **„Grundform · Fressen · Brüllen · ＋“** (die Benennung entscheidet Florian, Abschnitt 11):
- die aktive Pille ist in der Posenfarbe gefüllt;
- eine Pille in der Vorschau zeigt einen dünnen Gewichtsbogen;
- Q / ⇧Q schalten der Reihe nach durch;
- Rechtsklick öffnet den Fächer: Duplizieren · Umbenennen · Zurücksetzen ▸ (Form/Knochen/Linien/Alles) · Löschen · Spiel-Pose.

### Bühne

- Ein Chip **„✎ Fressen“** (oder „✎ Grundform“) färbt den Rahmen – das ist die „Pose ohne Modus“ des Plans.
- Während einer Vorschau: **„Vorschau · Brüllen 40 % ×“**.
- **Geist:** ein gestrichelter Umriss in allen Blättern – die Grundform, solange eine Pose das Ziel ist, die gewählte Pose, solange die Grundform das Ziel ist – und wahlweise ein zu 15 % durchscheinendes Netz auf der Bühne.
- **Knochen** (weiß) und der Kieferknopf.

### Tafel (`ziel = Fressen`)

```
POSEN & LEBEN                              ✎ Fressen
Posen   ○ Grundform                         (Klick = bearbeiten)
        ● Fressen   ━━━━━━●━━ 100 %   ⋯     (Regler = Vorschau)
        ○ Brüllen   ●━━━━━━━━   0 %   ⋯
        + Neue Pose ▾  (Leer · Kopie von Fressen · Aus der Vorschau · Namensvorschläge)
Überblenden [Grundform ▾] → [Fressen ▾]  ▶ ━━━●━━ 45 %  1,2 s ↔  ☐ Zwischenbilder
Knochen · Fressen   Unterkiefer 58° · Zug 0/0 · Schädel 15°  [zurücksetzen] ☑ im 3D
Form · Fressen      212 Punkte · max 34 px   Haps ━━●━ [Form glätten] [zurücksetzen]
Rig · für alle Posen  Kiefergelenk · Schädelgelenk · Gewichte [Winkel|Ringe] ☐ zeigen [Automatik]
Hinweis: „Unterlippe 0,2 px auf der blauen Linie“                    Weiter → Spiel
```

- Wenn `ziel = Grundform`, sind die Abschnitte Knochen und Form ausgeblendet.
- **Zwischenbilder** = Zwiebelschale bei t = 0,2/0,4/0,6/0,8.
- **⇧Space** spielt im Pingpong ab; Abspielen und Schieben enden, sobald ein Griff gegriffen wird.
- **Dock:** Pose Q · Neue Pose · Auswahl A · Stift P (nur Einfügen) · Ziehen G · Aufblasen I · Knochen.
- **„alle Werkzeuge der Stufen 1–5“** wörtlich: Ein Stufenwechsel behält das Pose-Ziel, und die Werkzeuge jeder Stufe folgen dem Router (Körper → posierte Griffe, Maul → Pose-Linien, Zähne → Abweichungen).

---

## 7. Worker und Zwischenspeicher

### Schichten des Zwischenspeichers

| Schicht | Schlüssel |
|---|---|
| A | Daten der Grundform (heutiger Schlüssel) |
| Rig-Gewichte | A + Rig |
| je Pose: umgerechnetes d, Saat S, Zerlegung und Projektion C | (Pose-Revision, A, Rig) |
| Zerlegungen des Lösers | (Signatur, ROI, Zeilen, Achse) |

Der Editor führt eine Revision je Pose-Objekt (WeakMap auf die Objektidentität) und schickt `{id, rev}`, weil Worker-Nachrichten Kopien sind.

### Nachrichten

| Nachricht | Zweck |
|---|---|
| `bauen` (wie heute, plus `gewichte` und `generation`) | voller Bau |
| neu: `posieren` (nur Gewichte) | schnelle Auswertung |
| neu: `zugStart`, `zugSchritt` (der neueste gewinnt), `zugEnde` | Löser-Sitzung; liefert Δd |
| neu: `linienFolgen` | Pose-Linien nach einem Pinselstrich neu anpassen |
| `pruefen` | Zahnprüfung über ihre eigenen Zustände |

### `posieren`

1. `Y = A + Σ w·D` (dünn besetzt);
2. Skin (µs);
3. `G·X` (etwa 380 000 Einträge, etwa 1–2 ms);
4. Normalen über typisierte Arrays auf einer zwischengespeicherten Dreieckstopologie;
5. Zähne und Augen.

Es liefert nur Lagen und Normalen; Deskriptoren, Atlas, Ruhe-Attribut und Treffer-Topologie werden einmal je A geschickt.

**Ziele:** `posieren` ≤ 8 ms; Klick auf eine Pille bis zum richtigen Bild ≤ 50 ms bei einer zwischengespeicherten Pose (≤ 150 ms beim ersten Mal).

Das heutige objektbasierte `zuDreiecken` (`versuch/catmullClark.ts`:138) ist zum Schieben zu langsam und braucht einen Weg über typisierte Arrays mit zwischengespeicherter Topologie.

---

## 8. Export

- **Backen je Spiel-Pose:** `D_fine,i = T_fine(θᵢ)⁻¹·(G_L·X(eᵢ)) − G_L·A`.
  - Das ist an den Endpunkten exakt, obwohl das Spiel das feine Netz skinnt und nicht den Käfig.
  - Dünn besetzt halten (|D| > ε), dazu Knochen (Gelenke, Freiheitsgrade), feine Gewichte `G_L·w` und dieselbe Skin-Formel in TSL (der Plan sieht schon einen eigenen Weg vor).
- **Datentextur:** Alle Spiel-Posen gehen in eine Morph-Datentextur; **≤ 3 aktiv je Instanz**.
  - Fressen ist Pflicht.
  - Das Blinzeln macht das Material, kein Morph.
  - Der Rest wird auf der „Waage“ in Stufe 9 budgetiert.
- **Messen:** Zwischenstufen im Editor gegen das Spiel (Skin auf dem Käfig und Skin auf dem feinen Netz sind nicht vertauschbar): ≤ 0,5 px im Brettmaßstab, ≤ 1,5 px in Nahaufnahme. Scheitert das, einen Zwischenschlüssel je Spiel-Pose hinzufügen.

---

## 9. Prüfung

### Maße (px bei 461 je Kachel)

| ID | Definition | Schwelle |
|---|---|---|
| R0 | FNV-Hash von A (`xyz` als Float64) und Y(0) vor/nach jeder Folge von Pose-Bearbeitungen, Wechseln, Vorschauen | identisch |
| R1 | Dokument-JSON ohne `posen` vor/nach jeder Pose-Bearbeitung | identisch |
| P0 | Hash von X(eᵢ) nach Wechseln, Vorschauen, Laden | identisch |
| L1 | Größter Abstand der Lippen-Grenzabtastpunkte (feine Kette + Mittelpunkte) zur Pose-Linie, in Seite und Front, je Kette, je Pose | ≤ 1 px (Ziel ≤ 0,25) |
| L2 | Anfänge bei \|z\| ≤ 1e-9; Mundwinkel gemeinsam | exakt |
| M1 | Sichtbare Durchdringungen (`selbstDurchdringungen`, Stufe 2, Einordnung „sichtbar“) bei t = 0…1 in Schritten von 0,1, für jedes Paar Grundform→Pᵢ und Pᵢ→Pⱼ | 0 |
| M2 | Neue Falten (benachbarte Flächen > 150°, die an keinem Endpunkt vorhanden sind), Flächen mit Flächenverhältnis < 0,05 | 0 |
| M3 | Bahn ρ = max\|p₍ⱼ₊₁₎ − 2pⱼ + p₍ⱼ₋₁₎\| / max(\|p₁₀ − p₀\|/10, 1 px) | ≤ 0,35; keine Umkehr (cos < −0,2) bei Punkten, die sich > 2 px bewegen |
| M4 | Flächenverhältnis und Seitenverhältnis der Vierecke in der Pose | melden; ≤ 12× und ≤ 6 (Vorgabe für Teil A) |
| M5 | Verschiebung außerhalb des ROI | exakt 0 |
| T1–T4 | `posieren` ≤ 8 ms; Zugschritt ≤ 16 ms; Zugbeginn ≤ 50 ms; Loslassen ≤ 100 ms | — |

### Unit-Tests

Neuer Ordner `packages/shape/src/kern/posen/`, vitest:
- **Skin:** Identität bei θ = 0; Hin- und Rücktransformation ≤ 1e-12; det = 1; Gleichwertigkeit mit dem alten `maulPose`.
- **Auswertung:** X(eᵢ) = geformte Pose; Linearität; Morph-Endpunkte exakt; additive Posen.
- **Anker:** Identität bei unveränderter Topologie; verschobener Ring; Maul neu gezeichnet oder gelöscht.
- **Migration.**
- **Löser:** Hüllen-Cholesky gegen dichte LU; KKT-Residuum ≤ 1e-10; Örtlichkeit; Umlegen der Spiegelhälfte.
- **Linien:** L1 nach Zügen an Knoten, Mundwinkel und Anfang, nach Änderungen an Knochen, Rig und Grundform (Profil, Grundlinie, Wechsel Über-/Unterbiss, Pinsel); formneutrales Einfügen.
- **R0/R1 je Werkzeug.**
- **Schließt heutige Testlücken:** getrennte Pose über bündiger Grundform; Unterbiss-Pose über Überbiss-Grundform; Fressen bei Gewicht 0; mehrere Posen; Knochen je Pose.

### E2E (`EE_GPU=1`, echte `page.mouse`-Züge mit Schritten, Prüfungen über `window.__editor.wesen()`, das Hashes, Generation und Lippen-px liefert)

- **`posen-wechsel.spec.ts`:** Kugel, Rex, Tiger, Langhals. 20× Grundform ↔ Fressen mit je einer Bearbeitung (ein Knoten in der Seite der Grundform; dann abwechselnd roter Knoten, Pinsel, Knochen, Reifen-Perle).
  - Nach jedem Schritt R0, P0, Generation und L1 prüfen, dazu ein Bildvergleich des ersten Bilds.
  - Dann alles bis zum Ausgangsdokument rückgängig machen (tiefe Gleichheit) und alles wiederherstellen.
- **`posen-mischen.spec.ts`:** Regler (mit dem Trick über den nativen Setter), Morph schieben und abspielen, Bearbeiten während einer Vorschau springt zurück.
- **`posen-anlegen.spec.ts`:** neu, Kopie, aus der Vorschau, umbenennen, umsortieren, löschen + Undo, Speichern/Laden.
- **Ersetzen** der Fressen-Tests aus der Loft-Zeit in `e2e/maul.spec.ts`.

### Bilder

- **Kontaktbögen** (`apps/editor/scripts/pruefen/posen-kontakt.mjs`): je Wesen Zeilen = Seite/Front/Top/Bühne/Nahaufnahme Maul, Spalten = t = 0…1, mit eingeblendeten Linien und einer Tafel der Maße.
- **Zufallsreihe** mit festem Startwert: Körper × Maullinien × Kieferart × zufällige Stellung/Linie/Pinsel × anschließende Änderungen an der Grundform. Schlechteste Fälle zuerst.
- **Extremsatz:** Langhals (Blau den Hals hinab, Zeichnung 04, Zeile 1), Robbe (Blau bis zum Boden, 04, Zeile 2), Drache (Kopf umklappen, 04, Zeile 3), rundes Tigermaul (bild14). Jeder Fall wird per Skript mit echten Zügen gebaut.

---

## 10. Umsetzungsreihenfolge (jeder Schritt endet mit Bildern + Zahlen für Florian)

| Schritt | Inhalt | Tor | Abbruch-/Halteregel |
|---|---|---|---|
| **B1** | Tab-Bedeutung auf den alten Posendaten: `setzeZiel`, der Kern nutzt nur Gewichte, Abkürzung, Neubau mit oder ohne Maul, Rücksetzwege, ein Router, der lecke Werkzeuge in Posen sperrt. (Kann als Sofortkorrektur vor Teil A gezogen werden.) | E2E mit 20× Wechseln grün; Florian probiert es | — |
| **B2** | Kern `kern/posen/{typen,skin,auswerten,anker,rahmen,saat,migration}.ts`; lokale Rahmen gegen Weltrahmen an 5 Fällen von Grundform-Änderungen | alt ≡ neu bei 1 (≤ 1e-9); Kontaktbogen der Zwischenstufen alt gegen neu | **K6:** lokale Rahmen verlieren in ≥ 1 von 5 Fällen → Welt. Die Gleichwertigkeit scheitert → anhalten und den versteckten nicht starren Effekt finden |
| **B3** | Dokument v2 + Store + Worker-Anbindung (`gewichte`, Generation, Zwischenspeicher, `posieren`); Pillen; der Pinsel schreibt Ruhe-Deltas; Knochengriffe je Pose, gezeichnet vom posierten Skelett; gemeinsamer Rig-Abschnitt | Florian: Fressen an Rex/Tiger/Kugel/Fisch; T1 | **K5:** Verwirrung (≥ 3 Bearbeitungen am falschen Ziel in 20 min) → strenges Modell ohne Vorschauen außerhalb von Posen & Leben |
| **B4** | Löser: RCM + Hüllen-Cholesky, KKT, ROI, je Achse, Spiegel | Residuen, Örtlichkeit, T2/T3 | **K2:** Schritt > 16 ms bei n = 1500 → Lösen beim Loslassen, mit einer Vorschau wie beim Pinsel |
| **B5** | Lippenlinien der Pose + Projektion + „Linien folgen“; formneutrales Einfügen | Zufallsreihe L1 ≤ 1 px | **K3:** L1 nicht erreichbar, weil die Lippendichte zu gering ist → zurück zu Teil A, keine Korrektur an den Posen |
| **B6** | Schwarze Linien (Nahtkurve in der Seite, Silhouetten in Front/Top) und Reifen in Posen; Matrix „jedes Werkzeug × jede Pose“ mit echten Zügen | Matrix grün, Bilder | — |
| **B7** | Ganze Oberfläche Posen & Leben, Geister, Morph/Abspielen, Undo mit Zielwechsel | Florians Bedienaufgaben, mit Zeitmessung | — |
| **B8** | Extreme Posen + Glätte; Zwischenschlüssel nur, wenn M1–M3 scheitern | Kontaktbögen, Florians Urteil | **K4:** ≥ 2 von 4 scheitern auch mit Schlüsseln → eine hybride, weltverankerte Korrekturmaske als Prototyp bauen und vergleichen |
| **B9** | Zähne/Augen/Beine/Rundmaul in Posen; wahlweise eine Scharnierkette am Hals („Biegen/Stelle“) | Bilder, Zahnprüfung je Pose | — |
| **B10** | Export-Prototyp + Budget | E1-Zahlen | **K7:** > 1 px im Brettmaßstab → Zwischenschlüssel je Spiel-Pose |

**Risiken:**
- Qualität des Umrechnens nach großen Topologieänderungen;
- Dehnreserve des Einsatzes (Robbe, Langhals);
- lokale Rahmen nahe den Kappenpolen;
- die Lücke zwischen Skin auf Käfigstufe und Skin auf feiner Stufe (Export);
- Tempo mit 10+ Posen (Auswertung nur bei Bedarf, nur Posen mit Gewicht > 0);
- Rig-Änderungen ändern jede Pose – das ist gewollt und sichtbar, überrascht aber, wenn die Tafel es nicht erklärt.

---

## 11. Selbstkritik und Entscheidungen für Florian

**Schwachstellen dieses Entwurfs:**
- (a) Zwischenstufen im Ruheraum folgen Bögen; das passt womöglich nicht zu „weltgeraden“ Absichten wie der Robbenlippe.
- (b) Silhouetten der Pose in Front/Top sind nur neu linearisierte Griffe; Knoten kommen und gehen, wenn die Silhouette ihren Charakter ändert.
- (c) Die Exaktheit der Lippen ist durch die in Teil A gewählte Dichte der Lippenkette begrenzt.
- (d) Die Projektion bei der Auswertung bindet die Ergebnisse an die Version des Lösers. Das Dokument braucht ein Feld `projektionVersion`.
- (e) Die Naht in der Seite gleicht der Seitensilhouette nur, solange die Knochen in der Ebene bleiben; spätere 3D-Knochen brauchen die Silhouette als eigenen Griff.
- (f) Unveränderliche Topologie heißt, dass äußere Haut nie Mundinneres werden kann; extreme Mäuler sind durch die Gestaltung des Einsatzes begrenzt, nicht durch das Posen-System.

**Entscheidungen für Florian:**
1. Name des Grund-Tabs: „Grundform“ (vorgeschlagen) oder „Editor“.
2. Kieferknopf: eine Vorschau, die bis zur nächsten Bearbeitung bleibt (vorgeschlagen), oder eine, die immer zurückfedert.
3. Rig-Änderungen ändern jede Pose (vorgeschlagen) oder behalten die posierte Form.
4. Haps als parametrische Saat in Fressen (vorgeschlagen) statt als automatischer Verformer.
5. Knoten löschen nur in der Grundform (vorgeschlagen).
6. Größe des Budgets für Spiel-Posen.
7. Zwischenschlüssel nur nach Messung (vorgeschlagen).

### Wichtige Dateien für die Umsetzung
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/wesen.ts (Auswertungskette, Schichten des Zwischenspeichers, Ersatz für `maulLageBei`)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/maul.ts (`maulPose` → starrer Skin je Punkt, `MAUL_POSE_OPTIONEN` aufgeteilt in Rig/Stellung, `hapsAnwenden` → Saat)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/dokument.ts (Schema v2, Typen Pose/Rig, Migration)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/loeser/grenzflaeche.ts (gemeinsame Helfer für Zeilen und Glättung; daneben die neuen `posenLoeser.ts` und `cholesky.ts`)
- /Users/bsw/Projekte/playground/early-earle/apps/editor/src/state/editorStore.ts (`ziel`, Pose-Aktionen, Undo mit Ziel; zusammen mit den Auslösern in `three/Szene3D.tsx` und `kern/kernBau.ts`)
