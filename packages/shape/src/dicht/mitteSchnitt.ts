// Über die Mitte gezogen (13.11.2026). Florian: „Der neue Loop soll nicht gleich rund sein, sondern wie vorher eine Kante. An den
// neuen Kreuzungen bilden sich Punkte, und der durch die Mitte gezogene Griff bleibt sichtbar, aber ist markiert. Ich kann ihn auch
// löschen, dann ist kein Rückführen mehr möglich. Wenn ich die Kante dann selektiere und ihre Kantigkeit auf 0 stelle, erhalte ich ja
// den runden Donut.“
//
// Lose: Ein Ring oder ein Paar gehört zur Hälfte z ≥ 0, sein Pfad darf aber durch die Mittelebene laufen (`pfadLagen`); die ganze Haut
// wird gerechnet, die Anzeige schneidet jede Hälfte an der Ebene ab. Dazu hier nur zwei Auskünfte: wo ein Pfad die Mitte kreuzt
// (`mitteKreuzungen`) und welche Punkte hinter ihr liegen (`hinterDerMitte`).
//
// Fest (`mitteFestmachen`): Die Hälfte der Haut wird an der Ebene abgeschnitten und mit ihrem Spiegelbild zu einer Haut verbunden
// (wieder eine ganze Haut mit Spiegelpaaren; die Punkte am Rand des Lochs sind ihr eigenes Spiegelbild). Der Pfad jeder Linie wird an
// der Ebene geteilt (de Casteljau): Was über der Ebene liegt, behält genau seine Form und wird ein Ring mit Enden auf der Ebene, was
// dahinter liegt, fällt weg. Ein neues Ende behält den Griff des geteilten Stücks, die Linie knickt an der Mitte wie vorher. Der Rand
// jedes Lochs wird ein Loop der Mittelebene mit Kante an, mit Punkten an den Kreuzungen mit diesen Enden; die Enden werden dadurch
// Ecken von selbst (`eckenAuto`). „Kante aus“ am Rand macht sie später glatt (`kantenKnicken`) und die Haut rund.
//
// Gemessen in der Probe `apps/editor/scripts/pruefen/form-donut-regel.ts` (`docs/UEBERGABE.md`, Abschnitt 7): Wird dicht neben einem
// Punkt des Netzes geschnitten, bleiben schmale Dreiecke, an denen die Rechnung auf einem feinen Netz nicht zur Ruhe kommt (152
// umgestülpte Dreiecke). Deshalb kommt ein Punkt, neben dem näher als `fangen` einer Kante geschnitten würde, selbst auf die Ebene.
import { type Haut, type V3, hautAus, hautSeiten } from './kurven';
import { type Loop, type LoopPunkt, eckenAuto, griffeAnlegen, hatPfad, pfadParameter } from './loops';

type Kubik = [V3, V3, V3, V3];
const plus = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const zwischen = (a: V3, b: V3, t: number): V3 => ({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) });
const gespiegelt = (v: V3): V3 => ({ x: v.x, y: v.y, z: -v.z });
const abstand = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** de Casteljau: das Stück bis t und das ab t; zusammen genau das alte */
function teilen(k: Kubik, t: number): [Kubik, Kubik] {
  const ab = zwischen(k[0], k[1], t);
  const bc = zwischen(k[1], k[2], t);
  const cd = zwischen(k[2], k[3], t);
  const abc = zwischen(ab, bc, t);
  const bcd = zwischen(bc, cd, t);
  const m = zwischen(abc, bcd, t);
  return [
    [k[0], ab, abc, m],
    [m, bcd, cd, k[3]],
  ];
}
const hoehe = (k: Kubik, t: number): number => {
  const u = 1 - t;
  return u * u * u * k[0].z + 3 * u * u * t * k[1].z + 3 * u * t * t * k[2].z + t * t * t * k[3].z;
};
const ortAuf = (k: Kubik, t: number): V3 => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * k[0].x + b * k[1].x + c * k[2].x + d * k[3].x, y: a * k[0].y + b * k[1].y + c * k[2].y + d * k[3].y, z: 0 };
};

/** Stellen im Inneren eines Stücks, an denen es die Ebene z = 0 kreuzt (aufsteigend; Berühren ohne Seitenwechsel zählt nicht) */
function kreuztEbene(k: Kubik): number[] {
  const aus: number[] = [];
  // ein Stück ganz auf einer Seite (alle Kontrollpunkte) kreuzt nicht
  if ((k[0].z >= 0 && k[1].z >= 0 && k[2].z >= 0 && k[3].z >= 0) || (k[0].z <= 0 && k[1].z <= 0 && k[2].z <= 0 && k[3].z <= 0)) return aus;
  const N = 96;
  let t0 = 1e-6;
  let h0 = hoehe(k, t0);
  for (let i = 1; i <= N; i++) {
    const t1 = i === N ? 1 - 1e-6 : i / N;
    const h1 = hoehe(k, t1);
    if (h0 > 0 !== h1 > 0) {
      let a = t0;
      let b = t1;
      for (let r = 0; r < 50; r++) {
        const m = (a + b) / 2;
        if (hoehe(k, m) > 0 === h0 > 0) a = m;
        else b = m;
      }
      aus.push((a + b) / 2);
    }
    t0 = t1;
    h0 = h1;
  }
  return aus;
}

/** Die Stücke des Pfads eines Loops: je Stück die Punkte an seinen Enden (Index) und seine Kontrollpunkte */
function pfadStuecke(l: Loop, P?: readonly V3[], G?: readonly ({ ein: V3; aus: V3 } | undefined)[]): { a: number; b: number; k: Kubik }[] {
  const m = l.punkte.length;
  if (!hatPfad(l)) return [];
  const ort = (i: number): V3 => P?.[i] ?? l.punkte[i]!.ref;
  const aus: { a: number; b: number; k: Kubik }[] = [];
  for (let a = 0; a < (l.art === 'ring' ? m - 1 : m); a++) {
    const b = (a + 1) % m;
    const A = ort(a);
    const B = ort(b);
    aus.push({ a, b, k: [A, plus(A, G?.[a]?.aus ?? l.punkte[a]!.aus!), plus(B, G?.[b]?.ein ?? l.punkte[b]!.ein!), B] });
  }
  return aus;
}

/**
 * Wo der Pfad eines Rings oder Paars die Mittelebene kreuzt (im Inneren seiner Stücke; die Enden eines Rings liegen ohnehin auf ihr):
 * `stueck` = der Punkt, an dem das Stück beginnt, `t` die Stelle darin, `ort` der Ort auf der Ebene. `P`, `G`: Orte und Griffe der
 * Punkte, wie sie gerade sind (während eines Zugs), sonst die gespeicherten. Leer ohne Pfad und für einen Loop der Mittelebene.
 */
export function mitteKreuzungen(l: Loop, P?: readonly V3[], G?: readonly ({ ein: V3; aus: V3 } | undefined)[]): { stueck: number; t: number; ort: V3 }[] {
  if (l.art === 'mitte') return [];
  const aus: { stueck: number; t: number; ort: V3 }[] = [];
  for (const st of pfadStuecke(l, P, G)) for (const t of kreuztEbene(st.k)) aus.push({ stueck: st.a, t, ort: ortAuf(st.k, t) });
  return aus;
}

/** Punkte eines Rings oder Paars, die hinter der Mittelebene liegen (Index): Sie gehören zur Hälfte z ≥ 0 und sind über die Mitte gezogen */
export function hinterDerMitte(l: Loop, P?: readonly V3[]): number[] {
  if (l.art === 'mitte') return [];
  const aus: number[] = [];
  l.punkte.forEach((p, i) => {
    if ((P?.[i] ?? p.ref).z < -1e-6) aus.push(i);
  });
  return aus;
}

type Teil = { k: Kubik; von: number | null; bis: number | null; oben: boolean };

/**
 * Die Teile des Pfads eines Loops über der Ebene: je Teil seine Punkte mit Griffen, Anfang und Ende auf der Ebene. `neu`: die Enden,
 * die beim Teilen entstanden sind. Ein Punkt hinter der Ebene fällt weg. null: Der Pfad kreuzt die Ebene nicht.
 */
function pfadUeberDerEbene(l: Loop): { teile: LoopPunkt[][]; neu: Set<LoopPunkt> } | null {
  const teile: Teil[] = [];
  let kreuzt = false;
  for (const st of pfadStuecke(l)) {
    const ts = kreuztEbene(st.k);
    if (ts.length) kreuzt = true;
    let rest = st.k;
    let t0 = 0;
    let von: number | null = st.a;
    for (const t of ts) {
      const [vorn, hinten] = teilen(rest, (t - t0) / (1 - t0));
      teile.push({ k: vorn, von, bis: null, oben: hoehe(vorn, 0.5) > 0 });
      rest = hinten;
      t0 = t;
      von = null;
    }
    teile.push({ k: rest, von, bis: st.b, oben: hoehe(rest, 0.5) > 0 });
  }
  if (!kreuzt) return null;
  // Läufe aufeinanderfolgender Teile über der Ebene; ein geschlossener Loop läuft über sein Ende hinaus weiter
  const laeufe: Teil[][] = [];
  let jetzt: Teil[] = [];
  for (const t of teile) {
    if (t.oben) jetzt.push(t);
    else if (jetzt.length) {
      laeufe.push(jetzt);
      jetzt = [];
    }
  }
  if (jetzt.length) {
    if (l.art !== 'ring' && laeufe.length && teile[0]!.oben) laeufe[0] = [...jetzt, ...laeufe[0]!];
    else laeufe.push(jetzt);
  }
  const neu = new Set<LoopPunkt>();
  const alter = (i: number): LoopPunkt => {
    const p = l.punkte[i]!;
    return { ...p, ref: { ...p.ref }, cur: { ...p.ref }, s: 0 };
  };
  const schnittPunkt = (q: V3): LoopPunkt => {
    const p: LoopPunkt = { s: 0, ref: { x: q.x, y: q.y, z: 0 }, cur: { x: q.x, y: q.y, z: 0 } };
    neu.add(p);
    return p;
  };
  const aus = laeufe.map((lauf) => {
    const P: LoopPunkt[] = [];
    lauf.forEach((t, i) => {
      if (i === 0) P.push(t.von !== null ? alter(t.von) : schnittPunkt(t.k[0]));
      P[P.length - 1]!.aus = minus(t.k[1], t.k[0]);
      const q = t.bis !== null ? alter(t.bis) : schnittPunkt(t.k[3]);
      q.ein = minus(t.k[2], t.k[3]);
      P.push(q);
    });
    // beide Enden liegen auf der Ebene: Der Griff nach außen ist das Spiegelbild des inneren (so knickt die Linie dort, wie sie kam)
    const erster = P[0]!;
    const letzter = P[P.length - 1]!;
    erster.ref.z = 0;
    erster.cur.z = 0;
    letzter.ref.z = 0;
    letzter.cur.z = 0;
    erster.ein = gespiegelt(erster.aus!);
    letzter.aus = gespiegelt(letzter.ein!);
    return P;
  });
  return { teile: aus, neu };
}

/** Was `mitteFestmachen` zurückgibt */
export type MitteSchnitt = {
  haut: Haut;
  loops: Loop[];
  /** je Punkt der neuen Haut seine Nummer in der alten (−1: neu, am Rand eines Lochs); die gebliebenen stehen vorn */
  alt: Int32Array;
  /** die Loops am Rand der Löcher (Kennungen) */
  rand: number[];
  naechsteId: number;
  naechsteKreuzung: number;
  /** so viele Punkte der Loops lagen hinter der Mitte und sind weggefallen */
  wegPunkte: number;
};

/**
 * Fest machen, was über die Mitte gezogen ist (siehe oben). `fangen`: Anteil einer Kante, unter dem neben einem Punkt nicht
 * geschnitten wird (der Punkt kommt selbst auf die Ebene). Ergebnis: die neue Haut und die neuen Loops, oder `fehler` mit dem Grund,
 * warum es nicht geht (dann ist nichts geändert).
 */
export function mitteFestmachen(
  h: Haut,
  loops: readonly Loop[],
  opt: { naechsteId: number; naechsteKreuzung: number; fangen?: number },
): MitteSchnitt | { fehler: string } {
  const fangen = opt.fangen ?? 0.25;
  const n = h.n;
  const seite = hautSeiten(h);
  if (!seite) return { fehler: 'die Mittellinie trennt das Netz nicht' };
  for (let v = 0; v < n; v++) if (h.spiegel[v]! < 0) return { fehler: 'die Haut ist nicht spiegelgleich' };
  const Z = (v: number): number => h.pos[3 * v + 2]!;
  let hinter = false;
  for (let v = 0; v < n && !hinter; v++) if (seite[v]! > 0 && Z(v) < 0) hinter = true;
  if (!hinter) return { fehler: 'nichts liegt hinter der Mitte' };

  // Punkte der Hälfte, neben denen dicht geschnitten würde, kommen selbst auf die Ebene; kein Dreieck darf dabei ganz in ihr liegen
  const gefangen = new Uint8Array(n);
  if (fangen > 0) {
    for (let v = 0; v < n; v++) {
      if (!(seite[v]! > 0)) continue;
      const z = Z(v);
      if (h.nachbarn[v]!.some((j) => seite[j]! > 0 && (z > 0 ? Z(j) < 0 : Z(j) > 0) && Math.abs(z) < fangen * (Math.abs(z) + Math.abs(Z(j))))) gefangen[v] = 1;
    }
    for (let nochmal = true; nochmal; ) {
      nochmal = false;
      for (let t = 0; t < h.tri.length; t += 3) {
        const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
        if (!e.every((v) => h.spiegel[v] === v || gefangen[v]) || !e.some((v) => gefangen[v])) continue;
        let weit = -1;
        for (const v of e) if (gefangen[v] && (weit < 0 || Math.abs(Z(v)) > Math.abs(Z(weit)))) weit = v;
        gefangen[weit] = 0;
        nochmal = true;
      }
    }
  }
  const aufEbene = (v: number): boolean => h.spiegel[v] === v || gefangen[v] === 1;
  /** der Punkt der Hälfte bleibt: auf der Ebene oder über ihr */
  const oben = (v: number): boolean => seite[v]! >= 0 && (aufEbene(v) || Z(v) > 0);

  // die Dreiecke der Hälfte über der Ebene; Ecken vorläufig: alte Nummer, Schnittpunkte ab n
  const schnittVon: [number, number, number][] = [];
  const schnittNr = new Map<number, number>();
  const schnitt = (a: number, b: number): number => {
    // a über der Ebene, b dahinter
    const key = Math.min(a, b) * n + Math.max(a, b);
    const da = schnittNr.get(key);
    if (da !== undefined) return da;
    const nr = n + schnittVon.length;
    schnittVon.push([a, b, Z(a) / (Z(a) - Z(b))]);
    schnittNr.set(key, nr);
    return nr;
  };
  const halb: number[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const e = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    if (e.some((v) => seite[v]! < 0)) continue;
    const zahl = e.filter(oben).length;
    if (zahl === 0) continue;
    if (zahl === 3) {
      halb.push(e[0]!, e[1]!, e[2]!);
      continue;
    }
    const vieleck: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = e[k]!;
      const b = e[(k + 1) % 3]!;
      if (oben(a)) vieleck.push(a);
      if (oben(a) === oben(b)) continue;
      // ein Punkt auf der Ebene ist selbst der Schnittpunkt
      if ((oben(a) && aufEbene(a)) || (oben(b) && aufEbene(b))) continue;
      vieleck.push(oben(a) ? schnitt(a, b) : schnitt(b, a));
    }
    for (let k = 1; k + 1 < vieleck.length; k++) if (vieleck[0] !== vieleck[k] && vieleck[k] !== vieleck[k + 1] && vieleck[0] !== vieleck[k + 1]) halb.push(vieleck[0]!, vieleck[k]!, vieleck[k + 1]!);
  }
  // neue Nummern: erst die gebliebenen Punkte der Hälfte, dann ihre Spiegelbilder, dann die Schnittpunkte (nur was ein Dreieck trägt)
  const benutzt = new Uint8Array(n + schnittVon.length);
  for (const v of halb) benutzt[v] = 1;
  const nrPlus = new Int32Array(n + schnittVon.length).fill(-1);
  const nrMinus = new Int32Array(n).fill(-1);
  const pos: number[] = [];
  const alt: number[] = [];
  for (let v = 0; v < n; v++) {
    if (!benutzt[v]) continue;
    nrPlus[v] = alt.length;
    alt.push(v);
    pos.push(h.pos[3 * v]!, h.pos[3 * v + 1]!, aufEbene(v) ? 0 : Z(v));
  }
  for (let v = 0; v < n; v++) {
    if (!benutzt[v] || aufEbene(v)) continue;
    nrMinus[v] = alt.length;
    alt.push(h.spiegel[v]!);
    pos.push(h.pos[3 * v]!, h.pos[3 * v + 1]!, -Z(v));
  }
  for (let c = 0; c < schnittVon.length; c++) {
    if (!benutzt[n + c]) continue;
    const [a, b, t] = schnittVon[c]!;
    nrPlus[n + c] = alt.length;
    alt.push(-1);
    pos.push(h.pos[3 * a]! + t * (h.pos[3 * b]! - h.pos[3 * a]!), h.pos[3 * a + 1]! + t * (h.pos[3 * b + 1]! - h.pos[3 * a + 1]!), 0);
  }
  const gegen = (v: number): number => (v < n && nrMinus[v]! >= 0 ? nrMinus[v]! : nrPlus[v]!);
  const tri: number[] = [];
  for (let t = 0; t < halb.length; t += 3) tri.push(nrPlus[halb[t]!]!, nrPlus[halb[t + 1]!]!, nrPlus[halb[t + 2]!]!);
  for (let t = 0; t < halb.length; t += 3) tri.push(gegen(halb[t]!), gegen(halb[t + 2]!), gegen(halb[t + 1]!));
  const haut = hautAus(pos, tri);
  for (let v = 0; v < haut.n; v++) if (haut.spiegel[v]! < 0) return { fehler: 'die geschnittene Haut ist nicht spiegelgleich' };

  /** der Punkt der Hälfte ist in der neuen Haut */
  const bleibt = (v: number): boolean => oben(v) && nrPlus[v]! >= 0;

  // der Rand der Löcher: die neuen Punkte auf der Ebene (Schnittpunkte und auf die Ebene gelegte), der Reihe nach über die Kanten der
  // Hälfte, an denen nur ein Dreieck liegt
  const randPunkte = new Set<number>();
  for (let v = 0; v < n; v++) if (gefangen[v] && nrPlus[v]! >= 0) randPunkte.add(nrPlus[v]!);
  for (let c = 0; c < schnittVon.length; c++) if (nrPlus[n + c]! >= 0) randPunkte.add(nrPlus[n + c]!);
  const kantenZahl = new Map<number, number>();
  for (let t = 0; t < halb.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = tri[t + k]!;
      const b = tri[t + ((k + 1) % 3)]!;
      if (!randPunkte.has(a) || !randPunkte.has(b)) continue;
      const key = Math.min(a, b) * haut.n + Math.max(a, b);
      kantenZahl.set(key, (kantenZahl.get(key) ?? 0) + 1);
    }
  const neben = new Map<number, number[]>();
  for (const [key, z] of kantenZahl) {
    if (z !== 1) continue;
    const a = Math.floor(key / haut.n);
    const b = key % haut.n;
    neben.set(a, [...(neben.get(a) ?? []), b]);
    neben.set(b, [...(neben.get(b) ?? []), a]);
  }
  for (const v of randPunkte) if ((neben.get(v) ?? []).length !== 2) return { fehler: 'der Rand eines Lochs ist nicht geschlossen (er berührt die Mittellinie oder sich selbst)' };
  const raender: number[][] = [];
  const besucht = new Set<number>();
  for (const anfang of randPunkte) {
    if (besucht.has(anfang)) continue;
    const kette = [anfang];
    besucht.add(anfang);
    for (;;) {
      const weiter = neben.get(kette[kette.length - 1]!)!.find((u) => !besucht.has(u));
      if (weiter === undefined) break;
      kette.push(weiter);
      besucht.add(weiter);
    }
    if (kette.length < 3) return { fehler: 'ein Loch ist kleiner als ein Dreieck' };
    raender.push(kette);
  }

  // die Loops
  let id = opt.naechsteId;
  let kreuzung = opt.naechsteKreuzung;
  const lage = (v: number): V3 => ({ x: haut.pos[3 * v]!, y: haut.pos[3 * v + 1]!, z: haut.pos[3 * v + 2]! });
  const ausKette = (art: Loop['art'], kette: readonly number[]): Pick<Loop, 'proben' | 's' | 'laenge' | 'ruhe'> => {
    const ruhe = new Float64Array(3 * kette.length);
    const s = new Float64Array(kette.length);
    kette.forEach((v, i) => {
      const q = lage(v);
      ruhe[3 * i] = q.x;
      ruhe[3 * i + 1] = q.y;
      ruhe[3 * i + 2] = q.z;
      if (i > 0) s[i] = s[i - 1]! + abstand(q, lage(kette[i - 1]!));
    });
    let laenge = s[kette.length - 1]!;
    if (art !== 'ring') laenge += abstand(lage(kette[0]!), lage(kette[kette.length - 1]!));
    return { proben: kette.map((v) => ({ ecken: [v, v, v], b: [1, 0, 0] })), s, laenge, ruhe };
  };
  const aus: Loop[] = [];
  /** ein Loop, der bleibt, wie er ist: eigene Punkte und Lagen (was hier an den Punkten gesetzt wird, trifft den alten nicht) */
  const kopie = (l: Loop, proben: Loop['proben']): Loop => ({
    ...l,
    proben,
    s: Float64Array.from(l.s),
    ruhe: Float64Array.from(l.ruhe),
    punkte: l.punkte.map((p) => {
      const q: LoopPunkt = { ...p, ref: { ...p.ref }, cur: { ...p.cur } };
      if (p.ein) q.ein = { ...p.ein };
      if (p.aus) q.aus = { ...p.aus };
      return q;
    }),
  });
  /** neue Enden der Linien auf der Ebene: Punkt der neuen Haut → sein Punkt im Loop */
  const enden: { v: number; l: Loop; p: LoopPunkt }[] = [];
  let wegPunkte = 0;
  for (const l of loops) {
    if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) {
      if (l.proben.some((p) => p.ecken.some((v) => !bleibt(v)))) return { fehler: 'ein Loop über der Mitte liegt nur auf der Haut (nicht ins Netz eingesetzt)' };
      aus.push(
        kopie(
          l,
          l.proben.map((p) => ({ ecken: [nrPlus[p.ecken[0]]!, nrPlus[p.ecken[1]]!, nrPlus[p.ecken[2]]!], b: [...p.b] })),
        ),
      );
      continue;
    }
    const kette = l.proben.map((p) => p.ecken[0]);
    if (kette.every(bleibt)) {
      // der Loop liegt ganz diesseits: Er bleibt, wie er ist (auf den neuen Nummern)
      aus.push(
        kopie(
          l,
          kette.map((v) => ({ ecken: [nrPlus[v]!, nrPlus[v]!, nrPlus[v]!], b: [1, 0, 0] })),
        ),
      );
      continue;
    }
    if (l.art === 'mitte') return { fehler: 'ein Loch reicht bis an eine Linie der Mitte' };
    if (!hatPfad(l)) return { fehler: 'eine Linie über der Mitte hat keinen Pfad' };
    // die Kette an der Ebene geteilt: Stücke über der Ebene, an ihren Enden der Schnittpunkt der Kante (oder der Punkt auf der Ebene)
    const zu = l.art !== 'ring';
    const m = kette.length;
    const stuecke: number[][] = [];
    let jetzt: number[] | null = null;
    for (let i = 0; i < m; i++) {
      const a = kette[i]!;
      if (bleibt(a)) (jetzt ??= []).push(nrPlus[a]!);
      const j = i + 1 < m ? i + 1 : zu ? 0 : -1;
      if (j < 0) break;
      const b = kette[j]!;
      if (bleibt(a) === bleibt(b)) continue;
      const sp = schnittNr.get(Math.min(a, b) * n + Math.max(a, b));
      const nr = sp === undefined ? -1 : nrPlus[sp]!;
      if (bleibt(a)) {
        if (nr >= 0) jetzt!.push(nr);
        stuecke.push(jetzt!);
        jetzt = null;
      } else jetzt = nr >= 0 ? [nr] : [];
    }
    if (jetzt && jetzt.length) {
      if (zu && stuecke.length && bleibt(kette[0]!)) stuecke[0] = [...jetzt, ...stuecke[0]!];
      else stuecke.push(jetzt);
    }
    const ketten = stuecke.filter((k) => k.length >= 2);
    const pfad = pfadUeberDerEbene(l);
    wegPunkte += hinterDerMitte(l).length;
    if (!pfad) {
      if (ketten.length === 0) continue;
      return { fehler: 'eine Linie und die Haut kreuzen die Mitte nicht an denselben Stellen' };
    }
    if (pfad.teile.length !== ketten.length) return { fehler: 'eine Linie und die Haut kreuzen die Mitte nicht an denselben Stellen' };
    // jedem Stück der Kette der Teil des Pfads mit den nächsten Enden
    const frei = pfad.teile.map((_, i) => i);
    for (const k of ketten) {
      const a = lage(k[0]!);
      const b = lage(k[k.length - 1]!);
      let best = -1;
      let weit = Infinity;
      for (const i of frei) {
        const T = pfad.teile[i]!;
        const d = abstand(a, T[0]!.ref) + abstand(b, T[T.length - 1]!.ref);
        if (d < weit) {
          weit = d;
          best = i;
        }
      }
      frei.splice(frei.indexOf(best), 1);
      const teil = pfad.teile[best]!;
      const stueck: Loop = { id: id++, art: 'ring', ...ausKette('ring', k), punkte: teil, pfad: true };
      if (l.kante !== undefined) stueck.kante = l.kante;
      const laenge = stueck.laenge;
      teil.forEach((p, pi) => {
        if (pi === 0) p.s = 0;
        else if (pi === teil.length - 1) p.s = laenge;
        else {
          // ein Punkt im Inneren: an die Stelle der nächsten Probe
          let nah = 0;
          for (let j = 1; j < k.length; j++) if (abstand(lage(k[j]!), p.ref) < abstand(lage(k[nah]!), p.ref)) nah = j;
          p.s = stueck.s[nah]!;
        }
        if (pfad.neu.has(p)) enden.push({ v: pi === 0 ? k[0]! : k[k.length - 1]!, l: stueck, p });
      });
      pfadParameter(stueck, stueck.ruhe);
      aus.push(stueck);
    }
  }
  // der Rand jedes Lochs: ein Loop der Mittelebene mit Kante an, mit Punkten an den Kreuzungen mit den neuen Enden
  const rand: number[] = [];
  for (const kette of raender) {
    const r: Loop = { id: id++, art: 'mitte', ...ausKette('mitte', kette), punkte: [], kante: true };
    const stelle = new Map<number, number>();
    kette.forEach((v, i) => stelle.set(v, i));
    for (const e of enden) {
      const i = stelle.get(e.v);
      if (i === undefined) continue;
      e.p.kreuzung = kreuzung;
      delete e.p.vonSelbst;
      r.punkte.push({ s: r.s[i]!, ref: { ...e.p.ref }, cur: { ...e.p.ref }, kreuzung });
      kreuzung++;
    }
    r.punkte.sort((a, b) => a.s - b.s);
    griffeAnlegen(r, r.ruhe, true);
    rand.push(r.id);
    aus.push(r);
  }
  if (enden.some((e) => e.p.kreuzung === undefined)) return { fehler: 'ein neues Ende einer Linie liegt nicht auf dem Rand eines Lochs' };
  // eine Kreuzung, deren anderer Punkt weggefallen ist, ist keine mehr
  const zahl = new Map<number, number>();
  for (const l of aus) for (const p of l.punkte) if (p.kreuzung !== undefined) zahl.set(p.kreuzung, (zahl.get(p.kreuzung) ?? 0) + 1);
  for (const l of aus) for (const p of l.punkte) if (p.kreuzung !== undefined && zahl.get(p.kreuzung)! < 2) delete p.kreuzung;
  eckenAuto(aus);
  return { haut, loops: aus, alt: Int32Array.from(alt), rand, naechsteId: id, naechsteKreuzung: kreuzung, wegPunkte };
}
