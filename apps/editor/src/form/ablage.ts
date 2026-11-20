// Form zuerst (10.11.2026, vor G5): der Stand eines Wesens als eine Datei. Bis dahin lebte ein Wesen nur im offenen Fenster; jedes
// Neuladen (auch das von selbst, wenn sich der Code ändert) begann wieder mit der Kugel. Der Stand ist, was Rückgängig auch festhält
// (`Schnappschuss` in `kurven.ts`): Haut, Loops, Maul, Pose, Grundform der Pose, dazu das Maß des Startnetzes.
//
// Datei: Kennung, Länge des Kopfs, Kopf (JSON), dann die großen Felder binär hintereinander (jedes an einer durch 8 teilbaren Stelle).
// Im Kopf steht an der Stelle jedes Felds ein Verweis. So bleibt jede Zahl Bit für Bit, und das Packen kostet im Fenster nur das JSON
// der Loops (als Text allein wären es bei 26 000 Punkten rund 3 MB Zahlen und 30 bis 40 ms im Hauptthread, nach jedem Zug).
// Ohne DOM: Das Fenster, die Tests und die Messskripte (`scripts/pruefen/form-netzguete.ts`) lesen dieselbe Datei.
import type { Loop, V3 } from '@ee/shape/dicht';
import type { FlacheHaut } from './verfeinern';
import type { BemalungDatei } from '../ozzy/farbe/bemalung';

/** eine Zahnreihe in der Datei (wie `ZahnReihe` im Werk; `eigen`: einzelne Zähne, wie `ZahnEigen`) */
export type ZahnReiheDatei = {
  anzahl: number;
  groesse: number;
  neigung: number;
  verlauf: number;
  bis: number;
  sitz: number;
  form: number;
  eigen?: Record<number, { ds?: number; dz?: number; form?: number; faktor?: number; weg?: true }>;
};
export type WesenStand = {
  /** mittlere Kante des Startnetzes: das Maß für Verdichten, Kreuzungen und die Genauigkeit der Linien */
  mk: number;
  haut: FlacheHaut;
  loops: Loop[];
  /** nächste Kennung für Loops und für Kreuzungen */
  ids: [number, number];
  /** `echt`: ein Maul als echte Form (seit dem 20.11.), auch mit getrennten Lippen; `ersteUnten`: welche Hälfte der Lippe die untere ist; `zaehne`: die zwei Zahnreihen (`werk.ZahnReihe`) und ihre Farbe */
  maul: {
    id: number;
    echt?: true;
    ersteUnten?: boolean;
    zaehne?: { oben: ZahnReiheDatei; unten: ZahnReiheDatei; farbe?: string };
    /** die Zunge (`werk.MaulZunge`) */
    zunge?: { laenge: number; breite: number; dicke: number; rille: number; farbe?: string };
  } | null;
  /**
   * `linien` (seit 14.11.): je Linie der Versatz ihrer Punkte und Griffe gegen die Grundform, in der Ruhe der Pose; dazu die Stelle
   * `s` jedes Punkts und die Länge der Linie, als der Versatz gemerkt wurde (daran findet die Pose ihre Punkte wieder, wenn die
   * Grundform inzwischen Punkte bekommen oder verloren hat)
   */
  pose: {
    kiefer: number;
    schaedel: number;
    delta: Float64Array | null;
    linien?: { id: number; laenge?: number; punkte: { s?: number; d: V3; ein: V3 | null; aus: V3 | null }[] }[] | null;
    /** in der Pose gesichert: `haut` und `loops` sind ihre Ruhe (fehlt: ein Stand von vor dem 14.11., dort die gedrehte Lage) */
    inRuhe?: boolean;
  };
  /** in der Pose: die Grundform dazu (`haut` und `loops` sind dann die Pose) */
  grund: { haut: FlacheHaut; loops: Loop[] } | null;
  /**
   * was der Hintergrund für den Stand noch tun sollte (setzen, aufräumen); `ziele`: um so viel bewegen sich Linien ohne Pfad dabei (je
   * Loop 3 je Probe, nach dem Löschen eines Punkts)
   */
  ruhe: { setzen: boolean; nurInRuhe: boolean; verdichten: boolean; ziele?: (Float64Array | null)[] | null } | null;
  /** Ausschnitt je Blatt (zur Bequemlichkeit) */
  sicht: Record<string, { cx: number; cy: number; zoom: number }> | null;
  /** wann und unter welcher Adresse (Schalter) gesichert, zur Auskunft */
  zeit: string;
  quelle: string;
  /**
   * Ozzy (18.11.2026): der Spiegel dieser Form, ihr Maß im Raum und die weiteren Objekte der Szene. Fehlt in älteren Dateien und in
   * denen des Prüffensters (dann: ein Objekt, Spiegel mit Clipping). Das Prüffenster liest davon nichts: Es lädt diese Form allein.
   */
  ozzy?: OzzySzene;
  /**
   * Ozzy, Paint-Modus (19.11.2026): die Bemalung dieser Form (Ebenen mit Farblinien und Füllungen, als Orte auf `haut`). Fehlt in
   * älteren Dateien und wenn nichts gemalt ist; das Prüffenster liest davon nichts.
   */
  farbe?: BemalungDatei;
};
/** ein Objekt in Ozzy: seine Kennung, sein Spiegel (`werk.G.clipping`, `werk.G.spiegelbild`) und sein Maß im Raum (Ort = Werk / f + mitte) */
export type OzzyObjekt = {
  id: number;
  spiegel: { clipping: boolean; spiegelbild: boolean };
  mass: { f: number; mitte: { x: number; y: number } };
  /** Etappe 5 (19.11.): Das Objekt verschmilzt mit dem, was es berührt, oder zieht davon ab; `rund`: die Naht gerundet, so breit (`breite`, an seiner Größe gemessen) */
  verbund?: { art: 'vereinen' | 'abziehen'; rund: boolean; breite: number };
};
export type OzzySzene = OzzyObjekt & { objekte: (OzzyObjekt & { stand: WesenStand })[] };

const KENNUNG = 'EEKW1\n';
const ARTEN = {
  f64: Float64Array,
  f32: Float32Array,
  u32: Uint32Array,
  i32: Int32Array,
  u16: Uint16Array,
  i16: Int16Array,
  u8: Uint8Array,
} as const;
type Art = keyof typeof ARTEN;
type Feld = InstanceType<(typeof ARTEN)[Art]>;
type FeldEintrag = { art: Art; ab: number; laenge: number };
const artVon = (f: Feld): Art | null => (Object.keys(ARTEN) as Art[]).find((a) => f.constructor === ARTEN[a]) ?? null;
const istFeld = (x: unknown): x is Feld => ArrayBuffer.isView(x) && !(x instanceof DataView) && artVon(x as Feld) !== null;
const auf8 = (n: number): number => (n + 7) & ~7;

/**
 * Den Stand packen: die Teile der Datei in ihrer Reihenfolge (für `new Blob(teile)` oder aneinandergehängt). Die großen Felder werden
 * nicht kopiert; wer sie danach ändert, bevor die Datei geschrieben ist, ändert die Datei.
 */
export function packen(stand: WesenStand): Uint8Array[] {
  const felder: Feld[] = [];
  const eintraege: FeldEintrag[] = [];
  let ab = 0;
  const wandeln = (x: unknown): unknown => {
    if (istFeld(x)) {
      const art = artVon(x)!;
      eintraege.push({ art, ab, laenge: x.length });
      felder.push(x);
      ab = auf8(ab + x.byteLength);
      return { $feld: felder.length - 1 };
    }
    if (Array.isArray(x)) return x.map(wandeln);
    if (x !== null && typeof x === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(x)) if (v !== undefined) o[k] = wandeln(v);
      return o;
    }
    // Zahlen, die JSON nicht trägt (−0 verlöre sein Vorzeichen, nicht endliche würden null)
    if (typeof x === 'number' && (Object.is(x, -0) || !Number.isFinite(x))) return { $zahl: Object.is(x, -0) ? '-0' : String(x) };
    return x;
  };
  const kopf = new TextEncoder().encode(JSON.stringify({ format: 'ee-kurven-wesen', version: 1, stand: wandeln(stand), felder: eintraege }));
  // Kennung (6) + Länge des Kopfs (4) + Kopf, aufgefüllt auf ein Vielfaches von 8: Dort beginnen die Felder
  const anfang = auf8(KENNUNG.length + 4 + kopf.length);
  const vorn = new Uint8Array(anfang);
  vorn.set(new TextEncoder().encode(KENNUNG), 0);
  new DataView(vorn.buffer).setUint32(KENNUNG.length, kopf.length, true);
  vorn.set(kopf, KENNUNG.length + 4);
  const teile: Uint8Array[] = [vorn];
  for (const f of felder) {
    teile.push(new Uint8Array(f.buffer, f.byteOffset, f.byteLength));
    const rest = auf8(f.byteLength) - f.byteLength;
    if (rest) teile.push(new Uint8Array(rest));
  }
  return teile;
}

/** die Teile zu einem Stück (für Tests und Skripte; das Fenster gibt die Teile einem Blob) */
export function zusammen(teile: readonly Uint8Array[]): Uint8Array {
  const aus = new Uint8Array(teile.reduce((s, t) => s + t.length, 0));
  let ab = 0;
  for (const t of teile) {
    aus.set(t, ab);
    ab += t.length;
  }
  return aus;
}

/** Eine Datei entpacken; wirft mit einem lesbaren Grund, wenn sie keine ist oder nicht stimmig */
export function entpacken(datei: ArrayBuffer | Uint8Array): WesenStand {
  const bytes = datei instanceof Uint8Array ? datei : new Uint8Array(datei);
  const kennung = new TextDecoder().decode(bytes.subarray(0, KENNUNG.length));
  if (kennung !== KENNUNG) throw new Error('keine Wesen-Datei (Kennung fehlt)');
  const kopfLaenge = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(KENNUNG.length, true);
  const kopfAb = KENNUNG.length + 4;
  if (kopfAb + kopfLaenge > bytes.length) throw new Error('Wesen-Datei ist abgeschnitten (Kopf)');
  let kopf: { format?: string; version?: number; stand?: unknown; felder?: FeldEintrag[] };
  try {
    kopf = JSON.parse(new TextDecoder().decode(bytes.subarray(kopfAb, kopfAb + kopfLaenge))) as typeof kopf;
  } catch {
    throw new Error('Wesen-Datei ist beschädigt (Kopf nicht lesbar)');
  }
  if (kopf.format !== 'ee-kurven-wesen' || kopf.version !== 1 || !Array.isArray(kopf.felder)) throw new Error('Wesen-Datei in einem unbekannten Format');
  const anfang = auf8(kopfAb + kopfLaenge);
  const felder = kopf.felder.map((e): Feld => {
    const Typ = ARTEN[e.art];
    if (!Typ) throw new Error(`Wesen-Datei mit unbekanntem Feld (${String(e.art)})`);
    const von = anfang + e.ab;
    const bis = von + e.laenge * Typ.BYTES_PER_ELEMENT;
    if (!(e.laenge >= 0) || bis > bytes.length) throw new Error('Wesen-Datei ist abgeschnitten (Felder)');
    // eigener Speicher je Feld (ausgerichtet, unabhängig von der Datei)
    return new Typ(bytes.slice(von, bis).buffer) as Feld;
  });
  const wandeln = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(wandeln);
    if (x !== null && typeof x === 'object') {
      const nr = (x as { $feld?: unknown }).$feld;
      if (typeof nr === 'number') {
        const f = felder[nr];
        if (!f) throw new Error('Wesen-Datei ist beschädigt (Feld fehlt)');
        return f;
      }
      const zahl = (x as { $zahl?: unknown }).$zahl;
      if (typeof zahl === 'string') return zahl === '-0' ? -0 : Number(zahl);
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(x)) o[k] = wandeln(v);
      return o;
    }
    return x;
  };
  const stand = wandeln(kopf.stand) as WesenStand;
  const fehler = pruefen(stand);
  if (fehler) throw new Error(`Wesen-Datei ist nicht stimmig: ${fehler}`);
  return stand;
}

const hautFehler = (h: FlacheHaut | undefined, name: string): string | null => {
  if (!h || !(h.pos instanceof Float64Array) || !(h.tri instanceof Uint32Array) || !(h.spiegel instanceof Int32Array)) return `${name}: Felder fehlen`;
  if (!(h.nbStart instanceof Int32Array) || !(h.nb instanceof Int32Array)) return `${name}: Nachbarn fehlen`;
  const n = h.n;
  if (!Number.isInteger(n) || n < 4 || h.pos.length !== 3 * n || h.spiegel.length !== n || h.nbStart.length !== n + 1) return `${name}: Längen passen nicht zu ${n} Punkten`;
  if (h.tri.length % 3 !== 0 || h.nbStart[n] !== h.nb.length) return `${name}: Dreiecke oder Nachbarn unvollständig`;
  for (let i = 0; i < h.pos.length; i++) if (!Number.isFinite(h.pos[i]!)) return `${name}: Lagen nicht endlich`;
  for (let i = 0; i < h.tri.length; i++) if (h.tri[i]! >= n) return `${name}: Dreieck zeigt auf einen Punkt, den es nicht gibt`;
  for (let i = 0; i < h.nb.length; i++) if (h.nb[i]! < 0 || h.nb[i]! >= n) return `${name}: Nachbar, den es nicht gibt`;
  // −1 heißt: ohne Spiegelbild. Der Kern legt solche Punkte beim Verdichten nahe der Mitte an und rechnet mit ihnen weiter; der Stand
  // lässt sich dann sichern und laden wie jeder andere (Florian, 16.11.: „Ja, lockern“). Abgewiesen wird nur ein Verweis ins Leere.
  for (let v = 0; v < n; v++) if (h.spiegel[v]! < -1 || h.spiegel[v]! >= n) return `${name}: Spiegelpartner, den es nicht gibt`;
  return null;
};
const loopsFehler = (loops: Loop[] | undefined, h: FlacheHaut, name: string): string | null => {
  if (!Array.isArray(loops)) return `${name}: Loops fehlen`;
  for (const l of loops) {
    if (typeof l.id !== 'number' || !Array.isArray(l.proben) || !Array.isArray(l.punkte)) return `${name}: Loop unvollständig`;
    if (!(l.s instanceof Float64Array) || !(l.ruhe instanceof Float64Array)) return `${name}: Loop ${l.id} ohne Stellen`;
    if (l.s.length !== l.proben.length || l.ruhe.length !== 3 * l.proben.length) return `${name}: Loop ${l.id} mit unpassenden Längen`;
    for (const p of l.proben) for (const e of p.ecken) if (!(e >= 0 && e < h.n)) return `${name}: Loop ${l.id} liegt auf einem Punkt, den es nicht gibt`;
  }
  return null;
};

/** Ist der Stand stimmig genug, um ihn ins Fenster zu übernehmen? Zurück der Grund, warum nicht, oder null */
export function pruefen(st: WesenStand): string | null {
  if (!st || typeof st !== 'object') return 'kein Stand';
  if (!(st.mk > 0) || !Number.isFinite(st.mk)) return 'Maß des Startnetzes fehlt';
  const hf = hautFehler(st.haut, 'Haut') ?? loopsFehler(st.loops, st.haut, 'Haut');
  if (hf) return hf;
  if (!Array.isArray(st.ids) || st.ids.length !== 2 || !st.ids.every((x) => Number.isInteger(x) && x >= 1)) return 'Kennungen fehlen';
  if (!st.pose || typeof st.pose.kiefer !== 'number' || typeof st.pose.schaedel !== 'number') return 'Pose fehlt';
  if (st.pose.delta && !(st.pose.delta instanceof Float64Array)) return 'Pose: Blendshape ist kein Feld';
  if (st.grund) {
    const gf = hautFehler(st.grund.haut, 'Grundform') ?? loopsFehler(st.grund.loops, st.grund.haut, 'Grundform');
    if (gf) return gf;
    if (st.grund.haut.n !== st.haut.n) return 'Grundform und Pose haben verschiedene Netze';
  }
  if (st.maul && typeof st.maul.id !== 'number') return 'Maul ohne Loop';
  return null;
}

/** Kurze Auskunft über einen Stand (für Listen und Meldungen) */
export function auskunft(st: WesenStand): string {
  const punkte = st.loops.reduce((s, l) => s + l.punkte.filter((p) => !p.vonSelbst).length, 0);
  return `${st.haut.n} Punkte im Netz, ${st.loops.length} Loops mit ${punkte} Punkten${st.maul ? ', Maul' : ''}${st.grund ? ', in der Pose' : ''}`;
}
