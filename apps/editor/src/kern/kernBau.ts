// Wesen-Editor 2, Tab „kern“ (Phase 0 → Phase 1 / M1): dünner Adapter zwischen Editor-Zustand und dem Wesen-Bau.
// Die Rechnung liegt DOM-frei in `packages/shape/src/kern/wesen.ts` und läuft im Worker (`wesen.worker.ts`,
// „neuester Auftrag gewinnt“); hier entsteht aus Dokument und Anzeige-Zustand nur der Bauplan.

import type { Dokument } from '@ee/shape';
import { type BeinArt, type Bauplan, type MaulArt, type MaulLinie, type PoseMischung, type Stencil, type StilArt, type WesenInfo, type WesenNetz, type ZahnMeldung, maulLinieAusDokument, pruefwesenBauplan } from '@ee/shape/kern';
import { create } from 'zustand';
import { poseTitel, setzeGesteEndeHaken, useEditor, vorschauBeenden, vorschauLaeuft } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { type Look, PALETTEN } from '../three/wesenLook';
import { WesenClient } from './wesenClient';
import { aktuellesNetz, setzeAktuellesNetz } from './netzStand';
import { ueberblendenGewichte, ueberblendenPaar } from '../posen/ueberblenden';

export type { BeinArt, MaulArt, StilArt };
export type KernInfo = WesenInfo;
export type KernNetz = WesenNetz;

const q = new URLSearchParams(location.search);
// Earle-Look von der ersten Sekunde an (Plan 9.1); `?look=matcap` zeigt die Prüfansicht, `?palette=` wählt die Farben
const startLook: Look = q.get('look') === 'matcap' ? 'matcap' : 'earle';
const startPalette = q.get('palette') && PALETTEN[q.get('palette')!] ? q.get('palette')! : 'blob';
const startMaul: MaulArt = (['vorn', 'unten', 'hals'] as const).find((a) => a === q.get('maul')) ?? 'aus';
const startBeine: BeinArt = (['verschmolzen', 'angesteckt'] as const).find((a) => a === q.get('beine')) ?? 'aus';
const startStil: StilArt = (['feuer', 'gas', 'fell'] as const).find((a) => a === q.get('stil')) ?? 'fest';
if (q.get('oeffnung')) useUi.getState().setzeOeffnung(Number(q.get('oeffnung')));
if (q.get('zebra') === '1') useUi.getState().setzeZebra(true);
/** Zonen-Atlas (Beweis 4) an, `&atlas=0` zeigt die prozeduralen Zonen */
const atlasAn = q.get('atlas') !== '0';
// Kamera für Bilder: `kamera=azimut°,elevation°,distanz[,zielX,zielY,zielZ]`
if (q.get('kamera')) {
  const [az, el, dist, zx, zy, zz] = q.get('kamera')!.split(',').map(Number);
  if (Number.isFinite(az) && Number.isFinite(el) && Number.isFinite(dist)) useUi.setState({ kamera: { azimut: (az! * Math.PI) / 180, elevation: (el! * Math.PI) / 180, distanz: dist!, ziel: [zx ?? 0, zy ?? 0.18, zz ?? 0] } });
}

export const useKernAnzeige = create<{
  info: KernInfo | null;
  look: Look;
  palette: string;
  /** Beweis 2: Maul an einer der drei Stellen (vorgefertigte Linie je Wesen) */
  maul: MaulArt;
  /** Käfig als Linien zeigen (Röntgen) */
  kaefig: boolean;
  /** Beweis 3: zwei Säulenbeine (Ring 15, Winkel 6, gespiegelt), Schwung in Grad */
  beine: BeinArt;
  schwung: number;
  /** Beweis 5: Stil fest · feuer · gas · fell (Klingen als Käfige, Feuer/Gas-Material) */
  stil: StilArt;
  setzeStil: (s: StilArt) => void;
  setzeLook: (l: Look) => void;
  setzePalette: (p: string) => void;
  setzeMaul: (m: MaulArt) => void;
  setzeKaefig: (an: boolean) => void;
  setzeBeine: (b: BeinArt) => void;
  setzeSchwung: (grad: number) => void;
}>((set) => ({
  info: null,
  look: startLook,
  palette: startPalette,
  maul: startMaul,
  kaefig: q.get('kaefig') === '1',
  beine: startBeine,
  schwung: q.get('schwung') ? Number(q.get('schwung')) : 0,
  stil: startStil,
  setzeStil: (stil) => set({ stil }),
  setzeLook: (look) => set({ look }),
  setzePalette: (palette) => set({ palette }),
  setzeMaul: (maul) => set({ maul }),
  setzeKaefig: (kaefig) => set({ kaefig }),
  setzeBeine: (beine) => set({ beine }),
  setzeSchwung: (schwung) => set({ schwung: Math.max(-60, Math.min(60, schwung)) }),
}));

/**
 * Bauplan: Prüfwesen-Anteile nach Namen, darüber die Ausstattung des Dokuments (Version 1), darüber der Anzeige-Zustand.
 * Eine im Maul-Tab gezeichnete Lippenlinie (`dok.maul.zu.oben`, Florians Ablauf vom 12.10.: ab Kontur oder Achse zum
 * Mundwinkel) wird die Maullinie des Kerns (M3); fehlt eine Lage, gilt „vorn“ (Kippen).
 */
/** Baut der Kern ein Maul? (gezeichnete Linie, Maullinie der Ausstattung bzw. des Prüfwesens oder gewählter Chip) */
export function kernMaulAktiv(dok: Dokument): boolean {
  if (useKernAnzeige.getState().maul !== 'aus') return true;
  if (dok.maul && dok.maul.zu.oben.knoten.length >= 2) return true;
  return !!(dok.ausstattung?.maulLinie ?? pruefwesenBauplan(dok.name).maulLinie);
}

/** Rundmaul (Phase 2 M6) aus der Ausstattung oder dem Prüfwesen: Die Öffnung ist dann eine Pose wie beim Schlitzmaul. */
export function kernRundmaul(dok: Dokument): boolean {
  return !!(dok.ausstattung?.rundmaul ?? pruefwesenBauplan(dok.name).rundmaul);
}

/** Aktive weitere Pose (nicht Editor, nicht Fressen) oder null: ihr Gewicht ist `ui.poseStaerke`. */
export function weiterePose(): string | null {
  const m = useEditor.getState().modus;
  return m !== 'editor' && m !== 'fressen' ? m : null;
}

/** Gewicht der gezeigten Pose (Knochen zeichnen): das Gewicht des Ziels in der Anzeige (Editor-Tab: Fressen). */
export function gezeigtesGewicht(): number {
  const m = useEditor.getState().modus;
  return anzeigeGewichte()[m === 'editor' ? 'fressen' : m] ?? 0;
}

/**
 * Gewichte des Ziels ohne Vorschau der Tafel (B3, Plan Teil B): Editor-Tab = Grundpose (leer; eine Vorschau von Fressen
 * über den Kieferknopf zeigt `ui.oeffnung`), Fressen = `ui.oeffnung`, jede weitere Pose (Idle, …) = `ui.poseStaerke`.
 */
export function zielGewichte(): Record<string, number> {
  const m = useEditor.getState().modus;
  const ui = useUi.getState();
  if (m === 'editor' || m === 'fressen') return ui.oeffnung > 0 ? { fressen: ui.oeffnung } : {};
  return ui.poseStaerke > 0 ? { [m]: ui.poseStaerke } : {};
}

/** Gewichte der Posen für den Bau: die Vorschau (B7, Regler der Posenliste, Überblenden), sonst die des Ziels. */
export function anzeigeGewichte(): Record<string, number> {
  const v = useUi.getState().vorschau;
  if (!v) return zielGewichte();
  const g: Record<string, number> = {};
  for (const [id, w] of Object.entries(v)) if (w > 0) g[id] = w;
  return g;
}

/** Schlüssel eines Gewichte-Satzes (sortiert, ohne Nullen): ein Netz passt zur Anzeige, wenn die Schlüssel gleich sind. */
export function gewichteSchluessel(g: Readonly<Record<string, number>>): string {
  return JSON.stringify(
    Object.entries(g)
      .filter(([, w]) => w > 0)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/** Zeigt das zuletzt gebaute Netz, was gerade gezeigt werden soll? (B7: sonst ist ein Bau unterwegs) */
export function netzZeigtAnzeige(): boolean {
  const n = aktuellesNetz();
  return !!n && n.gewichte === gewichteSchluessel(anzeigeGewichte());
}

/**
 * Sperre für Werkzeuge, die auf dem gezeigten Körper greifen (Pinsel, Reifen, Augen; B7, Entwurf §5): Läuft eine
 * Vorschau, beendet der Druck nur sie (mit Hinweis); solange danach der Bau läuft, greift das Werkzeug ebenfalls nicht —
 * sonst rechnete es auf dem Körper der Vorschau. true = nicht greifen.
 */
/**
 * Reifen und Spanten wirken auf den Körper aus Teilen noch nicht (Plan 20.10.: kommen dort mit den Loops, V6–V7). Ist der
 * Baum der Körper, sagt ein Hinweis das, statt still einen Spant ohne sichtbare Wirkung zu setzen; true = nichts tun.
 */
export function reifenAufTeilen(): boolean {
  const baum = aktuellesNetz()?.netz.koerperBaum;
  if (!baum || baum.fehler) return false;
  useUi.getState().zeigeHinweis('Reifen und Spanten wirken auf „Teile“ noch nicht (kommen mit den Loops) — für Reifen in der Tafel Körper „Röhre“ wählen');
  return true;
}

export function werkzeugGesperrt(): boolean {
  const ed = useEditor.getState();
  const m = ed.modus;
  if (vorschauLaeuft(m)) {
    vorschauBeenden(m);
    useUi.getState().zeigeHinweis(m === 'editor' ? 'Vorschau beendet: die Grundform ist wieder zu sehen — jetzt bearbeiten' : `Vorschau beendet: ${poseTitel(ed.dok, m)} wieder ganz zu sehen — jetzt bearbeiten`);
    return true;
  }
  return !netzZeigtAnzeige();
}

export function bauplanAus(dok: Dokument): Partial<Bauplan> {
  const s = useKernAnzeige.getState();
  const pw = pruefwesenBauplan(dok.name);
  const aus = { ...pw, ...(dok.ausstattung ?? {}) };
  // Maul-Optionen Schlüssel für Schlüssel (wie die Tafeln): flach gemischt warf der erste Rig-Zug am Tiger dessen Winkel,
  // Band und Rille aus dem Bau, während die Tafel sie noch zeigte
  if (pw.maulOptionen && dok.ausstattung?.maulOptionen) aus.maulOptionen = { ...pw.maulOptionen, ...dok.ausstattung.maulOptionen };
  // Kern-Typ: die gezeichneten 3D-Punkte (punkte, untenPunkte, obenPunkte) gehören nur in den Bauplan, nicht ins Dokument
  let maulLinie: MaulLinie | undefined = aus.maulLinie;
  let maul: MaulArt = s.maul;
  // Eine Maullinie aus der Ausstattung (Prüfwesen Tiger aus der Library) baut das Maul auch ohne gewählten Chip
  // (die Tafel zeigt dann „aus der Ausstattung“); die Lage der Ausstattung bestimmt nur die Vorlagen-Optionen (hals = ziehen)
  if (maul === 'aus' && aus.maulLinie) maul = aus.maul && aus.maul !== 'aus' ? aus.maul : 'vorn';
  if (!dok.ausstattung?.maulLinie && dok.maul?.zu.oben && dok.maul.zu.oben.knoten.length >= 2) {
    // gezeichnete Linien (Maul-Tab) → Kern-Maullinie (`maulLinieAusDokument`, Rollen rot/blau nach der Lage längs x)
    try {
      const gezeichnet = maulLinieAusDokument(dok, (e) => console.warn('[kern] Kieferkante nicht übersetzbar:', e));
      if (gezeichnet) {
        maulLinie = gezeichnet;
        if (maul === 'aus') maul = 'vorn';
      }
    } catch (e) {
      console.warn('[kern] Maullinie aus Zeichnung nicht übersetzbar:', e);
    }
  }
  // Kein führendes Blatt während Gesten (14.10.): Die führende Front ließ einzelne Ringe bis zur Frontbreite wachsen und
  // drückte ihren Querschnitt flach — am hochgezogenen Schwanz (Florians Komma) Falten bis 34° und Sägezahn; weil
  // `fuehrend` nicht im Cache-Schlüssel stand, blieb dieser Bau nach dem Loslassen stehen. Es gilt die Sichthülle; die
  // Kern-Option `Bauplan.fuehrend` bleibt für eine glatte Fassung (Planseite „Ruhiges Netz und Maulschlitz“, Block 1).
  return {
    ...aus,
    ...(maulLinie ? { maulLinie } : {}),
    maul,
    gewichte: anzeigeGewichte(),
    beine: s.beine,
    schwung: s.schwung,
    stil: s.stil,
    earle: s.look === 'earle',
    kaefigLinien: s.kaefig,
    atlas: atlasAn,
    // Rig (Plan 5.2): Unterkiefergewichte als Farbe, nur in der Stufe „Posen & Leben“
    gewichteZeigen: useUi.getState().gewichteZeigen && useUi.getState().ebene === 'posen',
    ...umrisseAnfrage(dok),
  };
}

/**
 * B7: Zusatz-Umrisse für die Blätter in „Posen & Leben“ — im Editor-Tab der Geist der gewählten Pose, mit Zwischenbildern
 * das Überblenden bei 20/40/60/80 %. Der Worker merkt sie; Abspielen rechnet sie nicht neu.
 */
function umrisseAnfrage(dok: Dokument): { umrisse?: { id: string; gewichte: Record<string, number> }[] } {
  const ui = useUi.getState();
  if (ui.ebene !== 'posen') return {};
  const liste: { id: string; gewichte: Record<string, number> }[] = [];
  const modus = useEditor.getState().modus;
  if (modus === 'editor' && ui.geist && dok.posen.some((p) => p.id === ui.geistPose)) liste.push({ id: 'geist', gewichte: { [ui.geistPose]: 1 } });
  if (ui.ueberblenden.zwischenbilder) {
    const { von, nach } = ueberblendenPaar();
    for (const t of [0.2, 0.4, 0.6, 0.8]) liste.push({ id: `t${t}`, gewichte: ueberblendenGewichte(von, nach, t) });
  }
  return liste.length ? { umrisse: liste } : {};
}

let client: WesenClient | null = null;
function derClient(): WesenClient {
  client ??= new WesenClient();
  return client;
}

export { aktuellesNetz } from './netzStand';

/** Feines Netz der Bauweise „kern“ im Worker bauen; während Gesten nur Zug, sonst Ableitung. Der neueste Auftrag gewinnt. */
export function kernBauen(dok: Dokument, schnell: boolean, cb: (netz: KernNetz) => void): void {
  const plan = bauplanAus(dok);
  const gewichte = gewichteSchluessel(plan.gewichte ?? {});
  derClient().bauen(dok, plan, schnell, (netz) => {
    // erst das Netz merken, dann der Stand: Abonnenten (Saum in den Blättern) lesen `aktuellesNetz()` beim Wechsel
    setzeAktuellesNetz({ netz, skalierung: dok.skalierung, gewichte });
    useKernAnzeige.setState({ info: netz.info });
    cb(netz);
    // Schritt 3 („Käfig als Wahrheit“): Der Kern meldet die wirksame Ringverteilung, das Dokument friert sie ein; ab dann
    // zieht jede Kurvenänderung nur noch nach (keine Neuwahl der Ringe, kein Springen, Pinsel-Deltas bleiben gültig)
    // Nur, wenn der Bau zum aktuellen Dokument gehört (14.10. spätnachts): Ein Bau, der beim Laden eines anderen Wesens
    // noch lief, schrieb sonst dessen Ringverteilung in das neue Dokument (geladener Unterbiss mit den Ringen der
    // Startkugel); die Änderung löste einen Bau mit diesen Stationen aus und verdrängte den frischen.
    // Plan 20.10., V0: auch nur, wenn der eingefrorene Stand noch derselbe ist wie beim Auftrag — „Neu ableiten“ und gleich
    // danach ⌘Z schrieb sonst die neue Ringverteilung in das wiederhergestellte Dokument (Rückgängig ohne Wirkung)
    const g = netz.info.stationen;
    const ed = useEditor.getState();
    if (g && !schnell && ed.dok.profile === dok.profile && (ed.dok.kaefig?.stationen ?? null) === (dok.kaefig?.stationen ?? null)) {
      if (JSON.stringify(ed.dok.kaefig?.stationen ?? null) !== JSON.stringify(g)) ed.setzeStationen(g);
    }
  });
}

/** B7 „Aus der Vorschau“: die gezeigte Mischung (Gewichte der Anzeige) als Daten einer neuen Pose; null bei Fehler. */
export function kernMischen(dok: Dokument, cb: (m: PoseMischung | null) => void): void {
  derClient().mischen(dok, bauplanAus(dok), cb);
}

/** Zahnprüfung (Phase 2 M4) im Worker auf dem gemerkten Stand; null bei Fehler oder wenn ein neuer Bau sie verdrängt. */
export function kernZahnPruefen(dok: Dokument, cb: (meldungen: ZahnMeldung[] | null) => void): void {
  derClient().pruefen(dok, bauplanAus(dok), cb);
}

/**
 * Formen folgen (Plan „Zeichnung ist Form“ 4.1; Florian 15.10. nachts: „sollte sich nicht die echte Umrisslinie an diese
 * Form anpassen?“, „Gelbe Linie ist immer gleich der schwarzen Linie!“): nach jeder Formgeste (Kurve, Spant, Maullinie,
 * Pinsel) die Profile an die Silhouette des Körpers legen und die Deltas so nachführen, dass der Körper exakt bleibt.
 * Wird im Dokument angewendet, solange es sich seit dem Auftrag nicht geändert hat; `fertig` wird immer gerufen (auch
 * bei Fehler oder verworfenem Ergebnis).
 */
export function kernFolgen(fertig: () => void): void {
  const ed = useEditor.getState();
  const dok = ed.dok;
  derClient().folgen(dok, bauplanAus(dok), (r) => {
    const s = useEditor.getState();
    if (r && s.dok.profile === dok.profile && s.dok.kaefig?.deltas === dok.kaefig?.deltas) {
      const kaefig = { ...(s.dok.kaefig ?? { deltas: [] }), deltas: r.deltas };
      s.setzeDokument({ ...s.dok, profile: r.profile, ...(r.spanten ? { spanten: r.spanten } : {}), kaefig });
    }
    fertig();
  });
}

// Pinselgesten der Grundform enden mit „Formen folgen“ (derselbe Undo-Schritt). Kurven-, Spant- und Maulgesten folgen
// noch nicht automatisch: Mit neu angepassten Profilen wanderten Stationen (Ecken an den Lippenanfängen) und Maul-
// Topologie, die Form sprang (15.10. nachts, Florian: „es entstehen willkürlich Punkte und die Form springt“).
setzeGesteEndeHaken((start, jetzt, abschliessen) => {
  if (useUi.getState().bauweise !== 'kern') return false;
  if (start.kaefig?.deltas === jetzt.kaefig?.deltas) return false;
  // Mit Maul kein Folgen (14.10., Florian: „während des Glättens sieht es gut aus, beim Loslassen springt das Mesh“):
  // Die neu angepassten Profile bauen das Maul neu, seine Punkte haben keine Ausgleichs-Deltas — gemessen sprang der
  // Körper 7,5 px (Kiefer gleich) bzw. 59 px (Überbiss). Bis das Folgen fürs Maul exakt ist, bleibt der Strich, wie er ist.
  if (kernMaulAktiv(jetzt)) return false;
  kernFolgen(abschliessen);
  return true;
});

/** Genauer Zug (Plan 2026-10-20): Stencil des Hautpunkts im gezeigten Körperdreieck (Worker-Stand des letzten Baus). */
export function kernStencil(dreieck: number, flaeche: number, bary: [number, number, number], cb: (s: Stencil | null) => void): void {
  derClient().stencil(dreieck, flaeche, bary, cb);
}

/** Animation (Beweis 5): Klingen für die Zeit t; false, wenn der Worker beschäftigt ist. */
export function kernAnimieren(zeit: number, cb: (a: { positionen: Float32Array; normalen: Float32Array } | null) => void): boolean {
  return derClient().animieren(zeit, cb);
}
