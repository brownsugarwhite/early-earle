// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6 „Loops (⌘R)“: Ein Loop sind verknüpfte Knoten — Rücken und Bauch
// im Seitenumriss, einer im Top — und, auf der Röhre ohne Maul und Beine, ein eigener Käfigring genau durch Rücken- und
// Bauchknoten (Ableitung: `schleifenStationen`, `mitSchleifen` in `ableiten.ts`). Einfügen ist formneutral (de Casteljau in
// Seite und Top), Löschen die Umkehrung. Pinsel- und Posen-Deltas, Bezugs-Käfige und Augen hängen an Punkt- bzw.
// Ringnummern: Sie rücken topologisch mit (der neue Ring bekommt das Mittel seiner Nachbarn), nie nach Lage.
import type { V2 } from '../bezier';
import type { Dokument, KaefigDelta, Pose } from '../dokument';
import { type Profil, einfuegen, loeschen, naechsterAufProfil, segmente } from '../profil';
import { spantenPunktEinfuegen } from '../spanten';
import { type Ableitung, type SchleifenRing, kernLeiter, schleifenStationen, spineAnteile, stationenAusLeiter } from './ableiten';

/**
 * Ort eines neuen Loops: Sprosse in der Seitenansicht (Profil-Einheiten; Rücken o, Bauch u) und — wenn der Körper Loop-Ringe
 * baut — die Nummer, die sein Ring bekommt, mit Ringzahl R und Punkten je Ring N vor dem Einfügen.
 */
export type SchleifenOrt = { o: V2; u: V2; ring?: RingPlatz };
/** Nummer eines Loop-Rings in einem Käfig mit R Ringen (vor dem Einfügen bzw. mit ihm beim Löschen) und N Punkten je Ring. */
export type RingPlatz = { ring: number; R: number; N: number };

/** Neue Kennung (s1, s2, …), die das Dokument noch nicht hat. */
export function neueSchleifenKennung(dok: Dokument): string {
  const da = new Set((dok.schleifen ?? []).map((s) => s.id));
  let n = 1;
  while (da.has(`s${n}`)) n++;
  return `s${n}`;
}

/**
 * Was ⌘R im Editor braucht (der Hauptthread hat keine Ableitung; der Worker schickt es mit dem Netz): Rücken- und Bauchkette
 * der Leiter (Seitenansicht, Profil-Einheiten, x und y je Punkt), die Anteile a, b je Ring, die Loop-Ringe, R und N.
 */
export type RingGeruest = { R: number; N: number; ruecken: Float64Array; bauch: Float64Array; paare: Float64Array; stationen: Float64Array; schleifen: SchleifenRing[] };

const flach = (z: readonly V2[]) => Float64Array.from(z.flatMap((p) => [p.x, p.y]));

/** Gerüst einer Ableitung (Röhre). */
export function ringGeruest(abl: Ableitung): RingGeruest {
  return {
    R: abl.vorlage.R,
    N: abl.vorlage.N,
    ruecken: flach(abl.altLeiter.ruecken),
    bauch: flach(abl.altLeiter.bauch),
    paare: Float64Array.from(abl.altLeiter.paare.flatMap((p) => [p.a, p.b])),
    stationen: Float64Array.from(abl.stationen.flatMap((s) => [s.a, s.b])),
    schleifen: (abl.schleifenRinge ?? []).map((x) => ({ ...x })),
  };
}

/** Punkt bei Anteil t einer flachen Kette (x, y je Punkt; gleichmäßig abgetastet wie die Leiter). */
function kettenPunkt(z: Float64Array, t: number): V2 {
  const n = z.length / 2 - 1;
  const x = Math.min(n, Math.max(0, t * n));
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  return { x: z[2 * i]! + (z[2 * i + 2]! - z[2 * i]!) * f, y: z[2 * i + 1]! + (z[2 * i + 3]! - z[2 * i + 1]!) * f };
}

/** Sprosse von Ring i (Seitenansicht, Profil-Einheiten): Rücken o, Bauch u. */
export function ringSprosse(g: RingGeruest, i: number): { o: V2; u: V2 } {
  return { o: kettenPunkt(g.ruecken, g.stationen[2 * i]!), u: kettenPunkt(g.bauch, g.stationen[2 * i + 1]!) };
}

/** Leiter aus dem Gerüst (Ketten und Paare). */
function leiterAus(g: RingGeruest) {
  const zug = (z: Float64Array): V2[] => Array.from({ length: z.length / 2 }, (_, i) => ({ x: z[2 * i]!, y: z[2 * i + 1]! }));
  return { ruecken: zug(g.ruecken), bauch: zug(g.bauch), paare: Array.from({ length: g.paare.length / 2 }, (_, i) => ({ a: g.paare[2 * i]!, b: g.paare[2 * i + 1]! })) };
}

/**
 * Ort zwischen Ring k − 1 und Ring k bei s (0 … 1): die Sprosse der Leiter an der Stelle der Wirbelsäule, die zwischen den
 * beiden Ringen bei s liegt — der neue Loop liegt genau auf der Leiter (die Anteile linear zu mischen wich in Biegungen von
 * ihr ab, und das Festheften der Leiter an den Loops verzog dann den ganzen Körper).
 */
export function ortImGeruest(g: RingGeruest, k: number, s: number, ringe = true): SchleifenOrt | null {
  const R = g.stationen.length / 2;
  if (!(k >= 1 && k < R && s > 0 && s < 1)) return null;
  const l = leiterAus(g);
  const [f0, f1] = spineAnteile(l, [
    { a: g.stationen[2 * (k - 1)]!, b: g.stationen[2 * (k - 1) + 1]! },
    { a: g.stationen[2 * k]!, b: g.stationen[2 * k + 1]! },
  ]);
  const st = stationenAusLeiter(l, [f0! + (f1! - f0!) * s])[0]!;
  return { o: kettenPunkt(g.ruecken, st.a), u: kettenPunkt(g.bauch, st.b), ...(ringe ? { ring: { ring: k, R: g.R, N: g.N } } : {}) };
}

/**
 * n Loops gleichmäßig zwischen Ring k − 1 und Ring k (n = 1: bei s) einfügen, ein Dokument danach. Die Ringnummern rücken
 * mit jedem Loop (der zweite liegt hinter dem ersten). Null, wenn einer nicht passt.
 */
export function schleifenEinfuegen(dok: Dokument, g: RingGeruest, k: number, n: number, s = 0.5, ringe = true): { dok: Dokument; ids: string[] } | null {
  let d = dok;
  const ids: string[] = [];
  for (let i = 1; i <= n; i++) {
    const ort = ortImGeruest(g, k, n === 1 ? s : i / (n + 1), false);
    if (!ort) return null;
    const r = schleifeEinfuegen(d, ringe ? { ...ort, ring: { ring: k + i - 1, R: g.R + i - 1, N: g.N } } : ort);
    if (!r) return null;
    d = r.dok;
    ids.push(r.id);
  }
  return { dok: d, ids };
}

/** Ort zwischen Ring k − 1 und Ring k einer Ableitung bei s (0 … 1), wie `ortImGeruest`. */
export function schleifenOrt(abl: Ableitung, k: number, s: number, ringe = true): SchleifenOrt | null {
  return ortImGeruest(ringGeruest(abl), k, s, ringe);
}

/** Ort an Anteil f der Wirbelsäule (Prüfungen): das Ringintervall und der Anteil darin aus den Stationen. */
export function schleifenOrtBei(abl: Ableitung, f: number, ringe = true): SchleifenOrt | null {
  const fs = spineAnteile(abl.altLeiter, abl.stationen);
  if (!(f > fs[0]! && f < fs[fs.length - 1]!)) return null;
  let k = 1;
  while (k < fs.length - 1 && fs[k]! < f) k++;
  return schleifenOrt(abl, k, (f - fs[k - 1]!) / (fs[k]! - fs[k - 1]!), ringe);
}

/** Knoten an der Stelle p der Kurve einfügen (formneutral) und mit der Kennung versehen; `vorhanden`: lag p auf einem Knoten. */
function knotenBei(pr: Profil, p: V2, id: string): { profil: Profil; vorhanden?: V2 } {
  const tr = naechsterAufProfil(pr, p);
  if (!tr) return { profil: pr };
  // genau auf einem vorhandenen Knoten: diesen markieren (kein doppelter Knoten); Löschen nimmt ihm nur die Kennung
  if (tr.t < 1e-6 || tr.t > 1 - 1e-6) {
    const i = tr.t < 0.5 ? tr.segment : (tr.segment + 1) % pr.knoten.length;
    if (pr.knoten[i]!.schleife) return { profil: pr };
    const knoten = pr.knoten.slice();
    knoten[i] = { ...knoten[i]!, schleife: id };
    return { profil: { ...pr, knoten }, vorhanden: { ...knoten[i]!.p } };
  }
  const r = einfuegen(pr, tr.segment, tr.t);
  if (r.index < 0) return { profil: pr };
  const knoten = r.profil.knoten.slice();
  knoten[r.index] = { ...knoten[r.index]!, schleife: id };
  return { profil: { ...r.profil, knoten } };
}

/** Punkt auf der Top-Kurve (rechte Hälfte, z ≥ 0) bei x mit dem größten z; null, wenn die Kurve x nicht erreicht. */
function topPunktBei(top: Profil, x: number): V2 | null {
  let best: V2 | null = null;
  for (const seg of segmente(top)) {
    const [p0, p1, p2, p3] = seg;
    const bei = (t: number): V2 => {
      const u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      };
    };
    // Vorzeichenwechsel von x(t) − x suchen, dann halbieren
    const n = 32;
    let ta = 0;
    let fa = bei(0).x - x;
    for (let q = 1; q <= n; q++) {
      const tb = q / n;
      const fb = bei(tb).x - x;
      if (fa === 0 || fa * fb < 0) {
        let lo = ta;
        let hi = tb;
        let flo = fa;
        for (let it = 0; it < 50; it++) {
          const m = (lo + hi) / 2;
          const fm = bei(m).x - x;
          if (flo * fm <= 0) hi = m;
          else {
            lo = m;
            flo = fm;
          }
        }
        const p = bei((lo + hi) / 2);
        if (p.y >= 0 && (!best || p.y > best.y)) best = p;
      }
      ta = tb;
      fa = fb;
    }
  }
  return best;
}

/** Punkt auf der Front-Kurve (rechte Hälfte, x ≥ 0) auf Höhe y mit dem größten x; null, wenn die Kurve y nicht erreicht. */
function frontPunktBei(front: Profil, y: number): V2 | null {
  // dieselbe Suche wie im Top, mit vertauschten Achsen
  const tausch = (p: V2): V2 => ({ x: p.y, y: p.x });
  const t = topPunktBei({ ...front, knoten: front.knoten.map((k) => ({ ...k, p: tausch(k.p), ein: tausch(k.ein), aus: tausch(k.aus) })) }, y);
  return t ? tausch(t) : null;
}

/**
 * Stehender Ring: Die Sprosse liegt eher waagerecht (Hals, Bein) — seine Breite zeigt die Front auf seiner Höhe, nicht das Top
 * bei x (dort ist ein anderer Ring breiter). Dann sitzt der Breitenknoten des Loops in der Front.
 */
export function ringSteht(o: V2, u: V2): boolean {
  return Math.abs(o.x - u.x) > Math.abs(o.y - u.y);
}

/**
 * Loop einfügen: Knoten in der Seite an Rücken und Bauch der Sprosse (`ort.o`, `ort.u`) und ein Breitenknoten dort, wo der Ring
 * den Umriss berührt — im Top bei x ihrer Mitte (liegender Ring) bzw. in der Front auf ihrer Höhe (stehender Ring; dort auch in
 * allen Spanten, die die Punktstruktur der Front teilen), alle formneutral. Mit `ort.ring` (der Körper baut Loop-Ringe) rücken
 * Pinsel- und Posen-Deltas, Bezugs-Käfige und Augen um einen Ring. Null, wenn die Sprosse den Seitenumriss nicht an zwei
 * Stellen trifft.
 */
export function schleifeEinfuegen(dok: Dokument, ort: SchleifenOrt, id = neueSchleifenKennung(dok)): { dok: Dokument; id: string } | null {
  const ro = knotenBei(dok.profile.seite, ort.o, id);
  const bu = knotenBei(ro.profil, ort.u, id);
  if (bu.profil.knoten.filter((k) => k.schleife === id).length !== 2) return null;
  const vorhanden = [ro.vorhanden, bu.vorhanden].filter((p): p is V2 => !!p);
  let neu: Dokument = { ...dok, profile: { ...dok.profile, seite: bu.profil } };
  if (ringSteht(ort.o, ort.u)) {
    const fp = frontPunktBei(dok.profile.front, (ort.o.y + ort.u.y) / 2);
    const tr = fp ? naechsterAufProfil(dok.profile.front, fp) : null;
    if (tr && (tr.t < 1e-6 || tr.t > 1 - 1e-6)) {
      // genau auf einem Front-Knoten: ihn markieren
      const fo = knotenBei(dok.profile.front, fp!, id);
      if (fo.vorhanden) vorhanden.push(fo.vorhanden);
      neu = { ...neu, profile: { ...neu.profile, front: fo.profil } };
    } else if (tr) {
      const r = spantenPunktEinfuegen(neu, tr.segment, tr.t);
      const knoten = r.dok.profile.front.knoten.slice();
      if (r.index >= 0) knoten[r.index] = { ...knoten[r.index]!, schleife: id };
      neu = { ...r.dok, profile: { ...r.dok.profile, front: { ...r.dok.profile.front, knoten } } };
    }
  } else {
    const tp = topPunktBei(dok.profile.top, (ort.o.x + ort.u.x) / 2);
    const to = tp ? knotenBei(dok.profile.top, tp, id) : { profil: dok.profile.top };
    if (to.vorhanden) vorhanden.push(to.vorhanden);
    neu = { ...neu, profile: { ...neu.profile, top: to.profil } };
  }
  const eintrag = vorhanden.length ? { id, vorhanden } : { id };
  neu = { ...neu, schleifen: [...(dok.schleifen ?? []), eintrag] };
  return { dok: ort.ring ? ringEinfuegen(neu, ort.ring) : neu, id };
}

/**
 * Loop löschen: seine Knoten formneutral entfernen (Umkehrung des Einfügens; Knoten, die schon vorher da waren, verlieren nur
 * die Kennung). Mit `ring` (Platz seines Rings im Käfig mit ihm) fallen Deltas und Bezüge dieses Rings weg, die übrigen rücken.
 */
export function schleifeLoeschen(dok: Dokument, id: string, ring?: RingPlatz): Dokument {
  const eintrag = (dok.schleifen ?? []).find((s) => s.id === id);
  const behalten = (p: V2) => (eintrag?.vorhanden ?? []).some((q) => Math.abs(q.x - p.x) <= 1e-12 && Math.abs(q.y - p.y) <= 1e-12);
  const ohne = (pr: Profil): Profil => {
    let p = pr;
    for (let guard = 0; guard < 4; guard++) {
      const i = p.knoten.findIndex((k) => k.schleife === id);
      if (i < 0) break;
      // Kennung lösen, dann wie einen formneutral eingefügten Punkt löschen
      const knoten = p.knoten.slice();
      const { schleife: _weg, ...rest } = knoten[i]!;
      void _weg;
      knoten[i] = rest;
      p = behalten(rest.p) ? { ...p, knoten } : loeschen({ ...p, knoten }, i);
    }
    return p;
  };
  // Front: derselbe Punkt auch in allen Spanten (sie teilen die Punktstruktur der Front)
  let front = dok.profile.front;
  let spanten = dok.spanten;
  const fi = front.knoten.findIndex((k) => k.schleife === id);
  if (fi >= 0) {
    const knoten = front.knoten.slice();
    const { schleife: _w, ...rest } = knoten[fi]!;
    void _w;
    knoten[fi] = rest;
    front = { ...front, knoten };
    if (!behalten(rest.p)) {
      front = loeschen(front, fi);
      spanten = spanten?.map((sp) => (sp.unten ? { ...sp, profil: loeschen(sp.profil, fi), unten: loeschen(sp.unten, fi) } : { ...sp, profil: loeschen(sp.profil, fi) }));
    }
  }
  const schleifen = (dok.schleifen ?? []).filter((s) => s.id !== id);
  const { schleifen: _alt, ...ohneListe } = dok;
  void _alt;
  const neu: Dokument = { ...ohneListe, profile: { ...dok.profile, seite: ohne(dok.profile.seite), top: ohne(dok.profile.top), front }, ...(spanten ? { spanten } : {}), ...(schleifen.length ? { schleifen } : {}) };
  return ring ? ringLoeschen(neu, ring) : neu;
}

/** Punktnummer nach dem Einfügen eines Rings an Stelle `ring` (R Ringe vorher, N Punkte je Ring; Kappen hinter R·N). */
export function punktMitRing(p: number, R: number, N: number, ring: number): number {
  if (p >= R * N) return p + N;
  return Math.floor(p / N) >= ring ? p + N : p;
}

/**
 * Käfig bekommt Ring `platz.ring` dazu: Deltas (Pinsel, Posen) und Bezugs-Käfige rücken, der neue Ring bekommt das Mittel
 * seiner Nachbarn; Augen auf Ringen dahinter rücken mit (Augen an einem 3D-Punkt hängen nicht an Ringen).
 */
export function ringEinfuegen(dok: Dokument, platz: RingPlatz): Dokument {
  const { ring, R, N } = platz;
  const deltas = (d: readonly KaefigDelta[]) => deltasMitRing(d, R, N, ring);
  const pose = (p: Pose): Pose => ({ ...p, form: deltas(p.form), ...(p.bezug ? { bezug: bezugMitRing(p.bezug, R, N, ring) } : {}) });
  const augen = dok.ausstattung?.augen;
  return {
    ...dok,
    ...(dok.kaefig ? { kaefig: { ...dok.kaefig, deltas: deltas(dok.kaefig.deltas) } } : {}),
    posen: dok.posen.map(pose),
    ...(augen && !augen.punkt && augen.ring >= ring ? { ausstattung: { ...dok.ausstattung, augen: { ...augen, ring: augen.ring + 1 } } } : {}),
  };
}

/** Umkehrung von `ringEinfuegen`: Ring `platz.ring` (im Käfig mit R Ringen) fällt weg. */
export function ringLoeschen(dok: Dokument, platz: RingPlatz): Dokument {
  const { ring, R, N } = platz;
  const deltas = (d: readonly KaefigDelta[]) => deltasOhneRing(d, R, N, ring);
  const pose = (p: Pose): Pose => ({ ...p, form: deltas(p.form), ...(p.bezug ? { bezug: bezugOhneRing(p.bezug, R, N, ring) } : {}) });
  const augen = dok.ausstattung?.augen;
  return {
    ...dok,
    ...(dok.kaefig ? { kaefig: { ...dok.kaefig, deltas: deltas(dok.kaefig.deltas) } } : {}),
    posen: dok.posen.map(pose),
    ...(augen && !augen.punkt && augen.ring > ring ? { ausstattung: { ...dok.ausstattung, augen: { ...augen, ring: augen.ring - 1 } } } : {}),
  };
}

function deltasMitRing(deltas: readonly KaefigDelta[], R: number, N: number, ring: number): KaefigDelta[] {
  if (!deltas.length) return deltas.slice();
  const out = deltas.map((d) => ({ ...d, punkt: punktMitRing(d.punkt, R, N, ring) }));
  // der neue Ring: Mittel der Nachbarringe (alte Nummern ring − 1 und ring)
  const bei = new Map(deltas.map((d) => [d.punkt, d.d] as const));
  for (let j = 0; j < N; j++) {
    const a = ring > 0 ? bei.get((ring - 1) * N + j) : undefined;
    const b = ring < R ? bei.get(ring * N + j) : undefined;
    if (!a && !b) continue;
    const da = a ?? [0, 0, 0];
    const db = b ?? [0, 0, 0];
    out.push({ punkt: ring * N + j, d: [(da[0] + db[0]) / 2, (da[1] + db[1]) / 2, (da[2] + db[2]) / 2] });
  }
  return out.sort((x, y) => x.punkt - y.punkt);
}

function deltasOhneRing(deltas: readonly KaefigDelta[], R: number, N: number, ring: number): KaefigDelta[] {
  const out: KaefigDelta[] = [];
  for (const d of deltas) {
    const p = d.punkt;
    if (p < R * N && Math.floor(p / N) === ring) continue;
    out.push({ ...d, punkt: p >= R * N || Math.floor(p / N) > ring ? p - N : p });
  }
  return out;
}

/** Bezugs-Käfig (3 Werte je Punkt) mit einem Ring mehr: der neue Ring als Mittel seiner Nachbarn. */
function bezugMitRing(b: readonly number[], R: number, N: number, ring: number): number[] {
  const out = b.slice(0, 3 * ring * N);
  for (let j = 0; j < N; j++) {
    const a = 3 * ((ring - 1) * N + j);
    const c = 3 * (ring * N + j);
    for (let k = 0; k < 3; k++) out.push((b[a + k]! + b[c + k]!) / 2);
  }
  for (let i = 3 * ring * N; i < b.length; i++) out.push(b[i]!);
  // ein Bezug passt nur zum Käfig mit R Ringen; sonst bleibt er unverändert und fällt beim Bau weg (wie bisher)
  return b.length >= 3 * R * N ? out : b.slice();
}

function bezugOhneRing(b: readonly number[], R: number, N: number, ring: number): number[] {
  if (b.length < 3 * R * N) return b.slice();
  return [...b.slice(0, 3 * ring * N), ...b.slice(3 * (ring + 1) * N)];
}

/**
 * Nummern der Loop-Ringe eines Dokuments ohne Ableitung (Hauptthread): wie `mitSchleifen` aus den eingefrorenen Anteilen der
 * übrigen Ringe und der Stelle jedes Loops auf der Wirbelsäule. Null ohne eingefrorene Stationen.
 */
export function schleifenRingeAusDokument(dok: Dokument): { ringe: SchleifenRing[]; R: number } | null {
  const g = dok.kaefig?.stationen;
  if (!g?.ringe.length || !dok.schleifen?.length) return null;
  const l = kernLeiter(dok);
  const fs = spineAnteile(l, stationenAusLeiter(l, g.ringe));
  const liste = fs.slice();
  const ringe: SchleifenRing[] = [];
  for (const sc of schleifenStationen(dok, l)) {
    if (!(sc.f > liste[0]! && sc.f < liste[liste.length - 1]!)) continue;
    let k = 0;
    while (k < liste.length && liste[k]! < sc.f) k++;
    liste.splice(k, 0, sc.f);
    for (const r of ringe) if (r.ring >= k) r.ring++;
    ringe.push({ id: sc.id, ring: k });
  }
  return { ringe, R: liste.length };
}

/**
 * Loops auflösen (Maul oder Beine kommen dazu — dort baut der Körper keine Loop-Ringe): ihre Ringe fallen aus Pinsel- und
 * Posen-Deltas, Bezugs-Käfigen und Augen (`ringLoeschen`, von hinten nach vorn), ihre Knoten bleiben als gewöhnliche Knoten
 * (die Form der Zeichnung bleibt). N = Punkte je Ring.
 */
export function schleifenAufloesen(dok: Dokument, N: number): Dokument {
  const nr = schleifenRingeAusDokument(dok);
  let d = dok;
  if (nr) {
    let R = nr.R;
    for (const r of nr.ringe.slice().sort((a, b) => b.ring - a.ring)) {
      d = ringLoeschen(d, { ring: r.ring, R, N });
      R--;
    }
  }
  const ohne = (pr: Profil): Profil => ({
    ...pr,
    knoten: pr.knoten.map((k) => {
      if (!k.schleife) return k;
      const { schleife: _w, ...rest } = k;
      void _w;
      return rest;
    }),
  });
  const { schleifen: _alt, ...ohneListe } = d;
  void _alt;
  return { ...ohneListe, profile: { ...d.profile, seite: ohne(d.profile.seite), top: ohne(d.profile.top), front: ohne(d.profile.front) } };
}
