// B7 (Plan Teil B, Entwurf Posen §6): Tafel „Posen & Leben“. Posenliste (Klick = bearbeiten, Regler = Vorschau, ⋯ =
// Duplizieren, Umbenennen, Zurücksetzen, Löschen, Spiel-Pose), „Neue Pose“, Knochen und Form der Pose, die bearbeitet
// wird. „Was ich bearbeite“ (Ziel) und „was ich sehe“ (Gewichte, `ui.vorschau`) sind getrennt: Die Regler zeigen und
// setzen die Gewichte der Anzeige; die Vorschau endet beim Bearbeiten, mit Esc, beim Ziel- oder Stufenwechsel.
import { POSEN, POSE_TITEL, type Pose } from '@ee/shape';
import { ankerVon, bezugAus, formAusFeld, kaefigNachbarn } from '@ee/shape/kern';
import { useState } from 'react';
import { anzeigeGewichte, kernMaulAktiv, useKernAnzeige } from '../kern/kernBau';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { type PoseKnochen, maulOptionenDok, poseKnochen, poseKnochenZuruecksetzen, poseSymmetrisch, setzeMaulOptionen, setzePoseKnochen } from '../kiefer/kieferOptionen';
import { type Modus, poseTitel, useEditor } from '../state/editorStore';
import { type MenueEintrag, useUi } from '../state/uiStore';
import { Regler, geste } from './bedienung';
import { abspielenUmschalten, anhalten, ueberblendenPaar, ueberblendenSetzen } from '../posen/ueberblenden';

/** Neue Id einer Pose („p_“ + Zeit, eindeutig im Dokument). */
function neueId(): string {
  const posen = useEditor.getState().dok.posen;
  let id = `p_${Date.now().toString(36)}`;
  for (let k = 2; posen.some((q) => q.id === id); k++) id = `p_${Date.now().toString(36)}${k}`;
  return id;
}

/** Freier Name „Basis“, „Basis 2“, … */
function freierName(basis: string): string {
  const posen = useEditor.getState().dok.posen;
  if (!posen.some((q) => q.name === basis)) return basis;
  let k = 2;
  while (posen.some((q) => q.name === `${basis} ${k}`)) k++;
  return `${basis} ${k}`;
}

/** Leere Pose „Pose n“ anlegen und hineinwechseln. */
export function leerePose(): void {
  const posen = useEditor.getState().dok.posen;
  let k = posen.length + 1;
  while (posen.some((q) => q.name === `Pose ${k}`)) k++;
  useEditor.getState().poseHinzu(neueId(), `Pose ${k}`);
}

/**
 * Pose duplizieren (eine freie Pose mit allen Daten). Fressen ohne eigene Stellung oder Haps nimmt seine Werte aus den
 * Maul-Optionen; die Kopie schreibt sie aus, sonst stünde sie in Ruhe.
 */
export function poseDuplizieren(id: string): void {
  const ed = useEditor.getState();
  const p = ed.dok.posen.find((q) => q.id === id);
  if (!p) return;
  const kopie: Pose = { ...p, id: neueId(), name: freierName(`${p.name} Kopie`), art: 'frei' };
  delete kopie.spiel;
  if (p.art === 'fressen' && kernMaulAktiv(ed.dok)) {
    const k = poseKnochen(ed.dok, useKernAnzeige.getState().maul, id);
    if (!p.stellung) kopie.stellung = { kiefer: { winkel: k.winkelUnten, zug: [k.kieferZug[0], k.kieferZug[1]], ziehen: k.zugWeite }, schaedel: { winkel: k.winkelOben } };
    if (p.saat?.haps === undefined) kopie.saat = { ...(p.saat ?? {}), haps: k.haps };
  }
  ed.poseEinfuegen(kopie, id);
}

/** Pose umbenennen (Dialog mit Eingabe). */
export function poseUmbenennen(id: string): void {
  const p = useEditor.getState().dok.posen.find((q) => q.id === id);
  if (!p) return;
  useUi.getState().oeffneDialog({
    titel: 'Pose umbenennen',
    eingabe: p.name,
    knoepfe: [
      { label: 'Abbrechen', aktion: () => useUi.getState().oeffneDialog(null) },
      {
        label: 'Umbenennen',
        primaer: true,
        aktion: (wert) => {
          const name = wert.trim();
          useUi.getState().oeffneDialog(null);
          if (name) useEditor.getState().poseSetzen(id, (q) => (q.name === name ? q : { ...q, name }));
        },
      },
    ],
  });
}

export type ZuruecksetzenArt = 'form' | 'knochen' | 'linien' | 'alles';

/** Teile einer Pose zurücksetzen: Form (Ruhe-Deltas), Knochen (Stellung, Haps), Rot/Blau, alles. Ein Undo-Schritt. */
export function poseZuruecksetzen(id: string, was: ZuruecksetzenArt): void {
  useEditor.getState().poseSetzen(id, (p) => {
    const neu: Pose = { ...p };
    if (was === 'form' || was === 'alles') {
      neu.form = [];
      delete neu.bezug;
      delete neu.formAlt;
    }
    if (was === 'knochen' || was === 'alles') {
      delete neu.stellung;
      delete neu.saat;
    }
    if (was === 'linien' || was === 'alles') delete neu.linien;
    const form = (was === 'form' || was === 'alles') && (p.form.length > 0 || p.bezug !== undefined || p.formAlt !== undefined);
    const knochen = (was === 'knochen' || was === 'alles') && (p.stellung !== undefined || p.saat !== undefined);
    const linien = (was === 'linien' || was === 'alles') && p.linien !== undefined;
    return form || knochen || linien ? neu : p;
  });
}

/** Spiel-Pose an/aus (Export: im Spiel benutzt). */
export function poseSpielUmschalten(id: string): void {
  useEditor.getState().poseSetzen(id, (p) => {
    const neu = { ...p };
    if (p.spiel) delete neu.spiel;
    else neu.spiel = true;
    return neu;
  });
}

/** Einträge des Fächers einer Pose (⋯ in der Tafel, Rechtsklick auf die Pille der Kopfzeile). */
export function poseMenueEintraege(id: string): MenueEintrag[] {
  const ed = useEditor.getState();
  const p = ed.dok.posen.find((q) => q.id === id);
  if (!p) return [];
  const fest = id === 'idle' || id === 'fressen';
  return [
    { label: ed.modus === id ? 'Wird bearbeitet' : 'Bearbeiten', aus: ed.modus === id, aktion: () => useEditor.getState().setzeZiel(id) },
    { label: 'Duplizieren', aktion: () => poseDuplizieren(id) },
    { label: 'Umbenennen …', aktion: () => poseUmbenennen(id) },
    'trenner',
    { label: 'Form zurücksetzen', aus: !p.form.length, aktion: () => poseZuruecksetzen(id, 'form') },
    { label: 'Knochen zurücksetzen', aus: !p.stellung && !p.saat, aktion: () => poseZuruecksetzen(id, 'knochen') },
    { label: 'Rot/Blau zurücksetzen', aus: !p.linien, aktion: () => poseZuruecksetzen(id, 'linien') },
    { label: 'Alles zurücksetzen', aus: !p.form.length && !p.stellung && !p.saat && !p.linien, aktion: () => poseZuruecksetzen(id, 'alles') },
    'trenner',
    { label: p.spiel ? 'Spiel-Pose ✓' : 'Als Spiel-Pose markieren', aktion: () => poseSpielUmschalten(id) },
    { label: fest ? 'Löschen (Idle und Fressen bleiben)' : 'Löschen', aus: fest, aktion: () => useEditor.getState().poseEntfernen(id) },
  ];
}

/** Vorschau-Gewicht einer Pose setzen (Regler der Posenliste): die übrigen gezeigten Gewichte bleiben. */
function vorschauSetzen(id: string, w: number): void {
  useUi.getState().setzeVorschau({ ...anzeigeGewichte(), [id]: w });
}

/** Größter Versatz der Form einer Pose in px (bei 461 je Kachel). */
function groessterVersatz(p: Pose, skalierung: number): number {
  let m = 0;
  for (const { d } of p.form) m = Math.max(m, Math.hypot(d[0], d[1], d[2]));
  return m * skalierung * 461;
}

/**
 * Form der Pose glätten (Laplace auf dem Käfig, drei Schritte, halbe Stärke): aus den Bearbeitungsdaten des Baus (Ruhe-
 * Käfig, Form als Ruhe-Deltas); die Pose muss dazu ganz gezeigt sein.
 */
export function poseFormGlaetten(id: string): boolean {
  const n = aktuellesNetz();
  const b = n?.netz.pose;
  const tr = n?.netz.treffer;
  if (!n || !b || b.id !== id || !tr) {
    useUi.getState().zeigeHinweis('Glätten: die Pose ganz zeigen (Tab wählen) und noch einmal');
    return false;
  }
  const N = b.ruhe.length / 3;
  const nb = kaefigNachbarn(tr.kaefig.fStart, tr.kaefig.fVerts, N);
  let D = new Float64Array(b.form);
  for (let s = 0; s < 3; s++) {
    const E = new Float64Array(D);
    for (let i = 0; i < N; i++) {
      const q = nb[i]!.filter((j) => j < N);
      if (!q.length) continue;
      for (let k = 0; k < 3; k++) {
        let m = 0;
        for (const j of q) m += D[3 * j + k]!;
        m /= q.length;
        E[3 * i + k] = D[3 * i + k]! + 0.5 * (m - D[3 * i + k]!);
      }
    }
    D = E;
  }
  const deltas = formAusFeld(b.ruhe, N, D).map((d) => {
    const a = ankerVon(n.netz.anker, d.punkt);
    return a ? { ...d, anker: a } : d;
  });
  const bezug = bezugAus(b.ruhe);
  useEditor.getState().poseSetzen(id, (p) => {
    const neu: Pose = { ...p, form: deltas, bezug };
    delete neu.formAlt;
    return neu;
  });
  return true;
}

/** Fächer an einer Stelle öffnen. */
function menueBei(e: { clientX: number; clientY: number }, id: string): void {
  useUi.getState().oeffneMenue({ x: e.clientX, y: e.clientY, eintraege: poseMenueEintraege(id) });
}

/** „Neue Pose ▾“ der Tafel: leer, Kopie der bearbeiteten Pose, Namensvorschläge. */
function NeuePoseFeld() {
  const [offen, setOffen] = useState(false);
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  const frei = POSEN.filter((p) => !dok.posen.some((q) => q.id === p));
  return (
    <div className="neue-pose">
      <button className={offen ? 'chip aktiv' : 'chip'} data-neue-pose="" onClick={() => setOffen(!offen)}>
        + Neue Pose ▾
      </button>
      {offen && (
        <div className="umschalter neue-pose-wahl">
          <button
            className="chip"
            data-neue-pose-art="leer"
            onClick={() => {
              setOffen(false);
              leerePose();
            }}
          >
            Leer
          </button>
          {modus !== 'editor' && (
            <button
              className="chip"
              data-neue-pose-art="kopie"
              onClick={() => {
                setOffen(false);
                poseDuplizieren(modus);
              }}
            >
              Kopie von {poseTitel(dok, modus)}
            </button>
          )}
          {frei.map((p) => (
            <button
              key={p}
              className="chip"
              data-pose-neu={p}
              onClick={() => {
                setOffen(false);
                useEditor.getState().poseHinzu(p);
              }}
            >
              {POSE_TITEL[p] ?? p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Posenliste: Grundform (Editor) und alle Posen. Klick auf den Namen = bearbeiten (Ziel), Regler = Gewicht in der
 * Anzeige (Vorschau, mehrere Posen zugleich möglich), ⋯ = Fächer.
 */
export function PosenListe() {
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  useUi((s) => s.vorschau);
  useUi((s) => s.oeffnung);
  useUi((s) => s.poseStaerke);
  const g = anzeigeGewichte();
  const sk = dok.skalierung;
  return (
    <>
      <h3 className="leiste-titel" data-abschnitt="posen">
        Posen
      </h3>
      <div className="posen-liste" data-posen-liste="">
        <div className="pose-zeile" data-pose-zeile="editor">
          <button className={modus === 'editor' ? 'chip aktiv' : 'chip'} data-pose="editor" title="Grundform bearbeiten (Editor-Tab)" onClick={() => useEditor.getState().setzeZiel('editor')}>
            Grundform
          </button>
          <span className="pose-zeile-hilfe">Editor</span>
        </div>
        {dok.posen.map((p) => {
          const w = g[p.id] ?? 0;
          return (
            <div key={p.id} className="pose-zeile" data-pose-zeile={p.id} onContextMenu={(e) => (e.preventDefault(), menueBei(e, p.id))}>
              <button className={modus === p.id ? 'chip aktiv' : 'chip'} data-pose={p.id} title={`${p.name} bearbeiten${p.form.length ? ` · geformt (${p.form.length} Käfigpunkte, bis ${groessterVersatz(p, sk).toFixed(0)} px)` : ''}`} onClick={() => useEditor.getState().setzeZiel(p.id)}>
                {p.name}
                {p.form.length ? ' •' : ''}
                {p.spiel ? ' ★' : ''}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={w} data-pose-regler={p.id} title="Vorschau: so stark wird die Pose gezeigt" onChange={(e) => vorschauSetzen(p.id, Number(e.target.value))} />
              <b data-pose-gewicht={p.id}>{Math.round(w * 100)} %</b>
              <button className="chip klein" data-pose-menue={p.id} title="Duplizieren, Umbenennen, Zurücksetzen, Löschen, Spiel-Pose" onClick={(e) => menueBei(e, p.id)}>
                ⋯
              </button>
            </div>
          );
        })}
      </div>
      <NeuePoseFeld />
      <p className="hilfe">Klick auf den Namen bearbeitet die Pose (Grundform = Editor-Tab). Die Regler zeigen Posen nur an, auch mehrere zugleich; die Vorschau endet beim Bearbeiten, mit Esc oder × auf der Bühne. ⋯ oder Rechtsklick: Duplizieren, Umbenennen, Zurücksetzen, Spiel-Pose, Löschen. Q/⇧Q schalten durch.</p>
    </>
  );
}

const grad = (x: number) => `${Math.round(x)}°`;
function dreiDUnten(k: PoseKnochen): string {
  const t = [k.gierenUnten ? `gieren ${grad(k.gierenUnten)}` : '', k.rollenUnten ? `rollen ${grad(k.rollenUnten)}` : '', k.seitUnten ? `seitlich ${Math.round(k.seitUnten * 100)} %` : ''].filter(Boolean);
  return t.length ? ` · ${t.join(' · ')}` : '';
}
function dreiDOben(k: PoseKnochen): string {
  const t = [k.gierenOben ? `gieren ${grad(k.gierenOben)}` : '', k.rollenOben ? `rollen ${grad(k.rollenOben)}` : ''].filter(Boolean);
  return t.length ? ` · ${t.join(' · ')}` : '';
}
const schief = (k: PoseKnochen) => !!(k.gierenUnten || k.rollenUnten || k.seitUnten || k.gierenOben || k.rollenOben);

/** Knochen der bearbeiteten Pose (Werte, Symmetrisch, zurücksetzen); greifen auf der Bühne und in der Seite. */
export function KnochenFeld({ id }: { id: Modus }) {
  const dok = useEditor((s) => s.dok);
  const chip = useKernAnzeige((s) => s.maul);
  const name = poseTitel(dok, id);
  if (!kernMaulAktiv(dok))
    return (
      <>
        <h3 className="leiste-titel" data-abschnitt="knochen">
          Knochen · {name}
        </h3>
        <p className="hilfe">Knochen (Kiefer, Schädel) gibt es mit Schlitzmaul: zuerst in der Stufe Maul die Maullinie zeichnen. Ohne Maul formen die Pinsel G und I die Pose frei.</p>
      </>
    );
  const mo = maulOptionenDok(dok, chip);
  const k = poseKnochen(dok, chip, id);
  const pz = (x: number) => `${x >= 0 ? '' : '−'}${Math.abs(Math.round(x * 100))} %`;
  return (
    <>
      <h3 className="leiste-titel" data-abschnitt="knochen">
        Knochen · {name}
      </h3>
      {mo.oeffnungsart === 'ziehen' ? (
        <>
          <div className="feld">
            <span>Kiefer</span>
            <b>zieht wie ein Vorhang (Vorlage Hals)</b>
          </div>
          <button className="chip" data-auf-knochen="" onClick={() => setzeMaulOptionen({ oeffnungsart: 'kippen' })}>
            Auf Knochen umstellen
          </button>
        </>
      ) : (
        <>
          <div className="feld">
            <span>Unterkiefer</span>
            <b data-knochen-unten="">
              {Math.round(k.winkelUnten)}° · Zug {pz(k.kieferZug[0])} vor, {pz(k.kieferZug[1])} hoch{dreiDUnten(k)}
            </b>
          </div>
          <div className="feld">
            <span>Schädel</span>
            <b data-knochen-oben="">
              {Math.round(k.winkelOben)}°{dreiDOben(k)}
            </b>
          </div>
        </>
      )}
      <div className="umschalter">
        {schief(k) && (
          <button className="chip" data-pose-symmetrisch={id} onClick={() => poseSymmetrisch(id)}>
            Symmetrisch
          </button>
        )}
        <button className="chip" data-pose-zuruecksetzen="" data-pose-knochen-zurueck="" onClick={() => poseKnochenZuruecksetzen(id)}>
          Knochen zurücksetzen
        </button>
      </div>
      <p className="hilfe">Knochen auf der Bühne (Auswahlwerkzeug A): Spitze ziehen schwenkt den Knochen hoch, runter und seitlich; der türkise Griff rollt ihn um seine Achse; die Mitte verschiebt den Unterkiefer. In der Seite drehst du eben. Greifen beendet eine Vorschau und zeigt die Pose ganz.</p>
    </>
  );
}

/** Form der bearbeiteten Pose: Käfigpunkte, größter Versatz, Haps (mit Maul), glätten, zurücksetzen. */
export function FormFeld({ id }: { id: Modus }) {
  const dok = useEditor((s) => s.dok);
  const chip = useKernAnzeige((s) => s.maul);
  useNetzStand((s) => s.version);
  const p = dok.posen.find((q) => q.id === id);
  if (!p) return null;
  const k = kernMaulAktiv(dok) ? poseKnochen(dok, chip, id) : null;
  const versatz = groessterVersatz(p, dok.skalierung);
  return (
    <>
      <h3 className="leiste-titel" data-abschnitt="form">
        Form · {p.name}
      </h3>
      <div className="feld">
        <span>Geformt</span>
        <b data-pose-deltas={p.form.length}>{p.form.length ? `${p.form.length} Käfigpunkte · bis ${versatz.toFixed(0)} px` : 'noch nicht'}</b>
      </div>
      {k && (p.art === 'fressen' || p.saat?.haps !== undefined) && <Regler label="Haps" wert={k.haps} min={0} max={1} schritt={0.05} anzeige={`${Math.round(k.haps * 100)} %`} onChange={(v) => setzePoseKnochen(id, { haps: v }, k)} {...geste()} />}
      <div className="umschalter">
        <button className="chip" data-pose-glaetten="" disabled={!p.form.length} onClick={() => poseFormGlaetten(id)}>
          Form glätten
        </button>
        <button className="chip" data-pose-leeren="" disabled={!p.form.length} onClick={() => poseZuruecksetzen(id, 'form')}>
          Form zurücksetzen
        </button>
      </div>
      <p className="hilfe">Die Pinsel G (ziehen) und I (aufblasen, ⇧ glättet örtlich), die schwarzen Linien und Rot/Blau formen die Pose; sie folgt späteren Änderungen der Grundform.</p>
    </>
  );
}

/**
 * Überblenden „von → nach“ (Entwurf §6): Schieber t (Vorschau w_von = 1 − t, w_nach = t), ▶ spielt im Pingpong
 * (⇧Leertaste), Dauer eines Durchlaufs, Zwischenbilder als Umrisse in den Blättern. Standard: von Idle aus.
 */
export function UeberblendenFeld() {
  const dok = useEditor((s) => s.dok);
  const u = useUi((s) => s.ueberblenden);
  const { von, nach } = ueberblendenPaar();
  const wahl = ['editor', ...dok.posen.map((p) => p.id)];
  const titel = (id: string) => (id === 'editor' ? 'Grundform' : poseTitel(dok, id));
  const waehle = (patch: { von?: string; nach?: string }) => {
    useUi.getState().setzeUeberblenden(patch);
    if (useUi.getState().vorschau) ueberblendenSetzen(useUi.getState().ueberblenden.t);
  };
  return (
    <>
      <h3 className="leiste-titel" data-abschnitt="ueberblenden">
        Überblenden
      </h3>
      <div className="ueberblenden-zeile">
        <select data-ueberblenden-von="" value={von} onChange={(e) => waehle({ von: e.target.value })}>
          {wahl.map((id) => (
            <option key={id} value={id}>
              {titel(id)}
            </option>
          ))}
        </select>
        <span>→</span>
        <select data-ueberblenden-nach="" value={nach} onChange={(e) => waehle({ nach: e.target.value })}>
          {wahl.map((id) => (
            <option key={id} value={id}>
              {titel(id)}
            </option>
          ))}
        </select>
      </div>
      <div className="ueberblenden-zeile">
        <button className={u.spielt ? 'chip aktiv' : 'chip'} data-ueberblenden-spielen={u.spielt ? 'an' : 'aus'} title="Abspielen im Pingpong (⇧Leertaste)" onClick={() => abspielenUmschalten()}>
          {u.spielt ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={u.t}
          data-ueberblenden-t=""
          title="Stelle der Überblendung (Vorschau)"
          onChange={(e) => {
            anhalten();
            ueberblendenSetzen(Number(e.target.value));
          }}
        />
        <b data-ueberblenden-wert="">{Math.round(u.t * 100)} %</b>
      </div>
      <Regler label="Dauer" wert={u.dauer} min={0.3} max={4} schritt={0.1} anzeige={`${u.dauer.toFixed(1).replace('.', ',')} s`} onChange={(v) => useUi.getState().setzeUeberblenden({ dauer: v })} />
      <label className="haken">
        <input type="checkbox" data-zwischenbilder="" checked={u.zwischenbilder} onChange={(e) => useUi.getState().setzeUeberblenden({ zwischenbilder: e.target.checked })} />
        Zwischenbilder (Umrisse bei 20, 40, 60, 80 %)
      </label>
      <GeistFeld />
    </>
  );
}

/** Geist im Editor-Tab: Umriss der gewählten Pose gestrichelt in allen Blättern (in einer Pose: die Grundlinie). */
function GeistFeld() {
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  const geist = useUi((s) => s.geist);
  const pose = useUi((s) => s.geistPose);
  return (
    <div className="ueberblenden-zeile geist-zeile">
      <label className="haken">
        <input type="checkbox" data-geist-an="" checked={geist} onChange={(e) => useUi.getState().setzeGeist(e.target.checked)} />
        Geist
      </label>
      <span />
      <select data-geist-pose="" value={dok.posen.some((p) => p.id === pose) ? pose : 'fressen'} disabled={!geist} title={modus === 'editor' ? 'Diese Pose erscheint gestrichelt in allen Blättern' : 'In einer Pose zeigen die Blätter die Grundlinie gestrichelt'} onChange={(e) => useUi.getState().setzeGeist(true, e.target.value)}>
        {dok.posen.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
