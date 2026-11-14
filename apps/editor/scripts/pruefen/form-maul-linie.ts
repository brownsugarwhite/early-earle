// Plan vom 12.11.2026, Schritt 6 (13.11. nachts): Beweis „das Maul aus nur einer Linie“.
// Florian: „Ein Maul soll auch nur eine Linie sein können. Wenn ich nur eine Linie einzeichne, ist das wie ein an den Mundwinkeln
// gefalteter Edgeloop, dessen Lippen exakt aufeinander liegen. Im geschlossenen Zustand kann ich dann nur die Linie bearbeiten,
// nicht beide Kiefer (also nur beide Lippen zusammen). Manche Wesen haben im geschlossenen Zustand kein Maul. Dann muss es quasi
// unsichtbar sein.“
//
// Der Entwurf, den die Probe prüft (im Plan zu Schritt 6 stand der Gedanke schon: „Gerechnet wird in leicht geöffneter Stellung;
// geschlossen zeigt der Kieferknochen die Lippen genau aufeinander“): Die eine Linie ist die Oberlippe. Die Unterlippe ist dieselbe
// Linie, um den Mundwinkel ein Stück aufgedreht (WINKEL0): Punkt für Punkt und Griff für Griff ihr gedrehtes Abbild. Beide zusammen
// sind der gefaltete Ring; daraus wird ein geformtes Maul wie bisher (`maulFormen`: die Kante trägt ihren Knick, die Tasche ist
// Haut). Gezeigt wird es zu: Der Kieferknochen dreht den Unterkiefer um denselben Winkel zurück (`maulGeformtAmLoop`, die Unterlippe
// dreht ganz mit); sie liegt dann genau auf der Oberlippe. In der Rechnung liegt nichts aufeinander.
//
// (Nicht weiterverfolgt: ein geformtes Maul in der Rechnung zudrücken, bis die Lippen aufeinanderliegen. Dann liegt Haut auf Haut,
// am gefalteten Mundwinkel hat die Linie keine Richtung mehr, und das Verdichten legt die Tasche zusammen; siehe Plan, Schritt 6.)
//
// Kriterien (vorher festgelegt, Halbmesser der Kugel 150):
// 1. zu: Die Lippen liegen aufeinander (Spalt höchstens 0,3).
// 2. zu: Nichts schlägt zusätzlich um, und die Tasche durchdringt sich nicht (Schnitte in fünf Tiefen ohne Kreuzung).
// 3. auf (AUF Grad von zu): Die Lippen sind vorn mindestens 30 auseinander, nichts schlägt zusätzlich um, keine Kreuzung.
// 4. Die Rechnung der leicht geöffneten Lage steht.
// Gemessen und gezeigt, ohne Kriterium: wie stark die Haut außen über die geschlossene Naht knickt („quasi unsichtbar“ entscheidet
// Florians Auge im Fenster).
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-maul-linie.ts
//   DREIECKE=2000   WINKEL0=20 (so weit ist die gerechnete Lage offen)   AUF=30   BOGEN=6 (Schwung der Linie)   AUS=<datei.html>
//   RINGE=-10,70 (Haltelinien: Ringe um den Körper an diesen Stellen x; ohne Angabe die Kugel allein)
import { einsetzenGrund, loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { knickBruecken, knickRahmen, knickReihe } from '../../../../packages/shape/src/dicht/kantenWinkel';
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, formAusZeichnung, griffeAnlegen, hautLagen, istSichtbar, kanteBei, mittlereKante, pfadLagen } from '../../../../packages/shape/src/dicht/loops';
import { maulFormen, maulFormenSchritte } from '../../../../packages/shape/src/dicht/maulFormen';
import { maulGeformtAmLoop } from '../../../../packages/shape/src/dicht/maulLoop';
import { knochenDrehen } from '../../../../packages/shape/src/dicht/poseLoop';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { nadelnZusammenlegen, verdichten } from '../../../../packages/shape/src/dicht/verdichten';
import { type BlattBild, type BlattLinie, type BlattSchnitt, blattSchreiben } from './form-direkt-blatt';
import { type Schnitt, mitSchnitten, verdichtenWieImFenster } from './form-direkt-faelle';

const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const WINKEL0 = Number(process.env.WINKEL0 ?? 20);
const AUF = Number(process.env.AUF ?? 30);
const BOGEN = Number(process.env.BOGEN ?? 6);
const AUS = process.env.AUS ?? '';
const RINGE = (process.env.RINGE ?? '')
  .split(',')
  .filter((x) => x.trim() !== '')
  .map(Number);
const R0 = 150;
/** die gezeichnete Linie in der Seite: vom Mundwinkel (XW, YC) nach vorn bis vor den Umriss (XA) */
const YC = -20;
const XW = -55;
const XA = -178;
const N = 48;
const RUHE = 0.02;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const bogen = (grad: number): number => (grad * Math.PI) / 180;

// ---------- 1. die Kugel und die eine Linie; die Unterlippe als ihr gedrehtes Abbild ----------
const netz = rundAusSeite(
  [
    { x: R0, y: 0 },
    { x: 0, y: R0 },
    { x: -R0, y: 0 },
    { x: 0, y: -R0 },
  ],
  { dreiecke: DREIECKE },
);
let haut: Haut = hautAus(netz.positionen, netz.indizes);
const mk = mittlereKante(haut);
const opt = verdichtenWieImFenster(mk);
/** f = 0 am Mundwinkel, f = 1 vorn vor dem Umriss; dazwischen ein leichter Schwung, der am Umriss (f ≈ 0,76) ausläuft */
const linie = (f: number): [number, number] => [XW + f * (XA - XW), YC + BOGEN * Math.sin(Math.PI * Math.min(1, f / 0.76))];
/** in der Seite um den Mundwinkel drehen (gegen den Uhrzeigersinn: vorn nach unten) */
const dreh2 = (q: readonly [number, number], a: number): [number, number] => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [XW + c * (q[0] - XW) - s * (q[1] - YC), YC + s * (q[0] - XW) + c * (q[1] - YC)];
};
let loops: Loop[] = [];
if (RINGE.length) {
  const r = mitSchnitten(
    haut,
    RINGE.map((x): Schnitt => ['seite', [x, 200], [x, -200]]),
  );
  haut = r.h;
  loops = r.loops;
}
/** die Nummer der Maullinie (nach den Haltelinien) */
const MAUL = loops.length + 1;
{
  const uv: [number, number][] = [];
  for (let i = 0; i <= N; i++) uv.push(linie(i / N));
  for (let i = N; i >= 1; i--) uv.push(dreh2(linie(i / N), bogen(WINKEL0)));
  const iK = Math.round(0.45 * N);
  const form = formAusZeichnung(haut, 'seite', uv, [0, iK, 2 * N + 1 - iK], MAUL);
  if (!form) throw new Error('die Zeichnung ergibt keine Form');
  const r0 = loopEinsetzen(haut, [...loops, form], loops.length);
  if (!r0) throw new Error(`die Form lässt sich nicht einsetzen (${einsetzenGrund})`);
  // der Mundwinkel ist eine Ecke (dort kehrt die Linie um): vor dem Anlegen der Griffe, sonst werden sie dort wie an einem glatten
  // Punkt angepasst
  const l0 = r0.loops[r0.loops.length - 1]!;
  let w = l0.punkte[0]!;
  for (const p of l0.punkte) if (p.ref.x > w.ref.x) w = p;
  w.ecke = true;
  griffeAnlegen(l0, l0.ruhe, true);
  haut = r0.haut;
  loops = r0.loops;
  // wie das Fenster gleich nach dem Einsetzen: Nadeln an der neuen Linie zusammenlegen (an der Spitze des Keils liegen ihre Punkte dicht)
  if (process.env.NADELN !== '0') {
    const v = nadelnZusammenlegen(haut, loops, mk);
    if (v) {
      haut = v.haut;
      loops = v.loops;
    }
  }
}
const finde = (): Loop => loops.find((l) => l.id === MAUL)!;

/** die Punkte der Maullinie: Nummer des Mundwinkels, Paare (Punkt der ersten Lippe, sein Zwilling auf der zweiten), der Drehsinn */
function zwillinge(L: Loop): { iW: number; paare: [number, number][]; a: number; G: { x: number; y: number } } {
  const P = L.punkte;
  let iW = 0;
  for (let i = 1; i < P.length; i++) if (P[i]!.ref.x > P[iW]!.ref.x) iW = i;
  if (iW === 0 || iW === P.length - 1 || P.length - 1 - iW !== iW) throw new Error(`die Maullinie hat keine Zwillinge (${P.length} Punkte, Mundwinkel Nummer ${iW})`);
  const paare: [number, number][] = [];
  for (let d = 1; d <= iW; d++) paare.push([iW - d, iW + d]);
  // die erste Lippe oben: die zweite ist ihr Abbild nach unten (gegen den Uhrzeigersinn), sonst umgekehrt
  const obenZuerst = P[0]!.ref.y > P[P.length - 1]!.ref.y;
  return { iW, paare, a: (obenZuerst ? 1 : -1) * bogen(WINKEL0), G: { x: P[iW]!.ref.x, y: P[iW]!.ref.y } };
}
const rot = (p: V3, a: number, G: { x: number; y: number } | null): V3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const gx = G ? G.x : 0;
  const gy = G ? G.y : 0;
  return { x: gx + c * (p.x - gx) - s * (p.y - gy), y: gy + s * (p.x - gx) + c * (p.y - gy), z: p.z };
};
/** wie weit die zweite Lippe vom gedrehten Abbild der ersten abweicht (Punkte und Griffe, größter Wert) */
function zwillingsFehler(L: Loop): number {
  const { iW, paare, a, G } = zwillinge(L);
  const P = L.punkte;
  const ab = (u: V3 | undefined, v: V3 | undefined): number => (u && v ? Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z) : 0);
  let weit = ab(P[iW]!.aus, P[iW]!.ein ? rot(P[iW]!.ein!, a, null) : undefined);
  for (const [i, j] of paare) weit = Math.max(weit, ab(P[j]!.ref, rot(P[i]!.ref, a, G)), ab(P[j]!.ein, P[i]!.aus ? rot(P[i]!.aus!, a, null) : undefined), ab(P[j]!.aus, P[i]!.ein ? rot(P[i]!.ein!, a, null) : undefined));
  return weit;
}
/** die zweite Lippe genau auf das gedrehte Abbild der ersten setzen (Punkte und Griffe), in Schritten; die Haut folgt */
function zwillingeSetzen(schritte: number): { runden: number; steht: boolean } {
  const L = finde();
  const { iW, paare, a, G } = zwillinge(L);
  const P = L.punkte;
  P[iW]!.ecke = true;
  // die Maullinie ist von Anfang an eine Kante (wie „Maul formen“ sie gleich setzt): Als einzige runde Linie zöge der schmale Keil
  // die Kugel ohne Haltelinien zusammen (gemessen: hinten von 150 auf 58 bis 99)
  L.kante = true;
  for (const p of P) p.kante = true;
  type Z = { ort0: V3; ort1: V3; ein0?: V3; ein1?: V3; aus0?: V3; aus1?: V3 };
  const Zl = new Map<number, Z>();
  for (const [i, j] of paare) {
    const q = P[j]!;
    const p = P[i]!;
    Zl.set(j, {
      ort0: { ...q.ref },
      ort1: rot(p.ref, a, G),
      ...(q.ein && p.aus ? { ein0: { ...q.ein }, ein1: rot(p.aus, a, null) } : {}),
      ...(q.aus && p.ein ? { aus0: { ...q.aus }, aus1: rot(p.ein, a, null) } : {}),
    });
  }
  const w = P[iW]!;
  if (w.aus && w.ein) Zl.set(iW, { ort0: { ...w.ref }, ort1: { ...w.ref }, aus0: { ...w.aus }, aus1: rot(w.ein, a, null) });
  const zw = (u: V3, v: V3, f: number): V3 => ({ x: u.x + f * (v.x - u.x), y: u.y + f * (v.y - u.y), z: u.z + f * (v.z - u.z) });
  const z = new LoopZug(haut, loops, null, true, 'kurven', 'geometrie', { halb: true });
  const start = loops.map((l) => Float64Array.from(l.ruhe));
  const versch = (f: number): Float64Array[] => {
    for (const [j, zl] of Zl) {
      const p = P[j]!;
      p.cur = zw(zl.ort0, zl.ort1, f);
      if (zl.ein0 && zl.ein1) p.ein = zw(zl.ein0, zl.ein1, f);
      if (zl.aus0 && zl.aus1) p.aus = zw(zl.aus0, zl.aus1, f);
    }
    return loops.map((l, i) => Float64Array.from(pfadLagen(l, l.punkte.map((q) => q.cur)) ?? start[i]!, (x, k) => x - start[i]![k]!));
  };
  let runden = 0;
  for (let k = 1; k <= schritte; k++) {
    z.schritt(versch(k / schritte), 2);
    runden += 2;
  }
  const d = versch(1);
  let letzte = Infinity;
  const vor = new Float64Array(haut.pos.length);
  for (let r = 0; r < 200 && letzte > RUHE; r++) {
    vor.set(haut.pos);
    z.schritt(d, 1);
    runden++;
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
    if (!Number.isFinite(letzte)) throw new Error('die Lagen sind nicht endlich');
  }
  for (const l of loops) {
    l.ruhe = hautLagen(haut, l);
    for (const p of l.punkte) p.ref = { ...p.cur };
  }
  return { runden, steht: letzte <= RUHE };
}
function nachVerdichten(): void {
  for (let g = 0; g < 8; g++) {
    const v = verdichten(haut, loops, 1.75 * mk, opt);
    if (!v) break;
    haut = v.haut;
    loops = v.loops;
    for (const l of loops) for (const q of l.punkte) q.cur = { ...q.ref };
    if (v.gelegt === 0 && v.neu === 0) break;
  }
}
{
  const L = finde();
  console.log(`Kugel: ${haut.n} Punkte, mittlere Kante ${z1(mk)}; die Maullinie hat ${L.punkte.length} Punkte (${L.punkte.filter(istSichtbar).length} sichtbar), ${L.proben.length} Stellen`);
  console.log(`   gezeichnet: die zweite Lippe weicht bis ${z2(zwillingsFehler(L))} vom gedrehten Abbild der ersten ab (${WINKEL0}° um den Mundwinkel)`);
  const s = zwillingeSetzen(4);
  // (VOR=0: ohne das Verdichten vor dem Formen, zum Nachstellen des Ablaufs im Fenster)
  if (process.env.VOR !== '0') nachVerdichten();
  let breit = 0;
  for (let v = 0; v < haut.n; v++) breit = Math.max(breit, haut.pos[3 * v]!);
  console.log(`   als Abbild gesetzt: ${s.runden} Runden, ${s.steht ? 'steht' : 'STEHT NICHT'}; Abweichung ${z2(zwillingsFehler(finde()))}; ${haut.n} Punkte; die Form reicht hinten bis x ${z1(breit)} (vorher ${R0})`);
}

// ---------- 2. „Maul formen“ wie bisher (die leicht geöffnete Lage ist die gerechnete) ----------
if (process.env.SCHRITTE_DIAG) {
  // Runde für Runde: wo sich die Haut am weitesten bewegt (zum Nachsehen, wenn das Formen davonläuft)
  const lauf = maulFormenSchritte(haut, loops, MAUL, { naechsteId: MAUL + 1, naechsteKreuzung: 100, verdichten: { maxKante: 1.75 * mk, opt } });
  let vor: Float64Array | null = null;
  let nr = 0;
  for (;;) {
    const st = lauf.next();
    if (st.done) {
      console.log(`   SCHRITTE Ende: ${'fehler' in st.value ? st.value.fehler : 'geformt'}`);
      break;
    }
    nr++;
    const P = st.value.haut.pos;
    if (nr === 1 || st.value.netzNeu) {
      // Punkte fast am selben Ort (unter 0,01) und Punkte ohne oder mit falschem Spiegelbild
      const H = st.value.haut;
      const nah: string[] = [];
      const idx = [...Array(H.n).keys()].sort((a, b) => P[3 * a]! - P[3 * b]!);
      for (let i = 0; i < idx.length; i++)
        for (let j = i + 1; j < idx.length && P[3 * idx[j]!]! - P[3 * idx[i]!]! < 0.01; j++) {
          const a = idx[i]!;
          const b = idx[j]!;
          if (Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!) < 0.01) nah.push(`${a}/${b} bei (${z1(P[3 * a]!)} ${z1(P[3 * a + 1]!)} ${z1(P[3 * a + 2]!)})`);
        }
      let falsch = 0;
      for (let v = 0; v < H.n; v++) {
        const sp = H.spiegel[v]!;
        if (sp < 0 || Math.abs(P[3 * v]! - P[3 * sp]!) + Math.abs(P[3 * v + 1]! - P[3 * sp + 1]!) + Math.abs(P[3 * v + 2]! + P[3 * sp + 2]!) > 1e-6) falsch++;
      }
      if (nah.length || falsch) console.log(`   SCHRITTE ${nr} (${st.value.was}), neues Netz mit ${H.n} Punkten: ${nah.length} Paare fast am selben Ort ${nah.slice(0, 6).join('; ')}; ${falsch} Punkte ohne oder mit falschem Spiegelbild`);
    }
    let weit = 0;
    let wo = -1;
    if (vor && vor.length === P.length)
      for (let v = 0; v < P.length / 3; v++) {
        const d = Math.hypot(P[3 * v]! - vor[3 * v]!, P[3 * v + 1]! - vor[3 * v + 1]!, P[3 * v + 2]! - vor[3 * v + 2]!);
        if (d > weit) {
          weit = d;
          wo = v;
        }
      }
    if (weit > Number(process.env.SCHRITTE_DIAG) || !Number.isFinite(weit)) {
      const L = st.value.loops.find((l) => l.id === MAUL)!;
      const auf = L.proben.findIndex((p) => p.ecken[0] === wo || st.value.haut.spiegel[p.ecken[0]] === wo);
      console.log(`   SCHRITTE ${nr} (${st.value.was}): Punkt ${wo} bewegt sich ${z2(weit)} nach (${z1(P[3 * wo]!)} ${z1(P[3 * wo + 1]!)} ${z1(P[3 * wo + 2]!)})${auf >= 0 ? `, Stelle ${auf} der Maullinie von ${L.proben.length}` : ''}; ${P.length / 3} Punkte`);
    }
    vor = Float64Array.from(P);
  }
  process.exit(0);
}
if (process.env.DIAG) {
  const l = finde();
  const R = knickReihe(haut, l);
  console.log(`   DIAG vor dem Formen: ${haut.n} Punkte, Kette ${l.proben.length}; innen ${R ? R.innen.reduce((a, b) => a + b, 0) : 'keine Reihe'}; erste Reihe ${R ? R.punkte.length : 0}; Brücken ${knickBruecken(haut, l).length}`);
}
const geformt = maulFormen(haut, loops, MAUL, {
  naechsteId: MAUL + 1,
  naechsteKreuzung: 100,
  verdichten: { maxKante: 1.75 * mk, opt },
  ...(process.env.UMKREIS !== undefined ? { umkreis: Number(process.env.UMKREIS) } : {}),
  ...(process.env.STUFEN ? { stufen: Number(process.env.STUFEN) } : {}),
  ...(process.env.DIAG
    ? {
        zwischen: (was: string, H: Haut) => {
          let hinten = -Infinity;
          let oben = -Infinity;
          let unten = Infinity;
          for (let v = 0; v < H.n; v++) {
            hinten = Math.max(hinten, H.pos[3 * v]!);
            oben = Math.max(oben, H.pos[3 * v + 1]!);
            unten = Math.min(unten, H.pos[3 * v + 1]!);
          }
          console.log(`   DIAG ${was}: ${H.n} Punkte; hinten bis x ${z1(hinten)}, y ${z1(unten)} bis ${z1(oben)}`);
          if (process.env.HALT_STUFE && was === `Stufe ${process.env.HALT_STUFE}` && AUS) {
            blattSchreiben(
              AUS,
              `Zwischenstand ${was}`,
              [
                {
                  titel: `${was}: ${H.n} Punkte`,
                  bilder: [{ name: was, h: { ...H, pos: Float64Array.from(H.pos) }, loops: [], fertig: { linien: [], punkte: [] } }],
                  blicke: [
                    ['Seite', 0, 0, 0.85],
                    ['schräg von vorn', 50, 12, 0.85],
                    ['von hinten', 180, 0, 0.85],
                  ],
                  mass: 520,
                  mitte: [0, 0, 0],
                },
              ],
              1640,
              'Zwischenstand beim Formen',
            );
            throw new Error(`angehalten nach ${was}: ${AUS}`);
          }
        },
      }
    : {}),
});
if ('fehler' in geformt) throw new Error(geformt.fehler);
haut = geformt.haut;
loops = geformt.loops;
const L = finde();
console.log(`Maul geformt: ${haut.n} Punkte, ${geformt.runden} Runden, ${geformt.steht ? 'steht' : 'STEHT NICHT'}; die zweite Lippe weicht danach ${z2(zwillingsFehler(L))} vom Abbild der ersten ab`);

// ---------- 3. die Knochen: zu, wie gerechnet, auf ----------
const W = L.punkte.find((p) => p.mundwinkel)!;
let ecke = 1;
for (let j = 1; j < L.proben.length - 1; j++) if (Math.abs(L.s[j]! - W.s) < Math.abs(L.s[ecke]! - W.s)) ecke = j;
const m = maulGeformtAmLoop(haut, L, ecke, { zelle: mk / 2 });
if (!m) throw new Error('das Maul lässt sich an der Linie nicht anlegen');
const { G } = zwillinge(L);
console.log(`Kiefer: Gelenk ${z2(Math.hypot(m.gelenk.x - G.x, m.gelenk.y - G.y))} neben dem Mundwinkel der Linie, Drehsinn ${m.drehsinn}`);
/** die Haut mit dem Unterkiefer um `grad` gegen die gerechnete Lage gedreht (negativ: zu) */
const pose = (grad: number): Haut => ({ ...haut, pos: knochenDrehen(haut.pos, Float64Array.from(m.gewicht, (g) => m.drehsinn * bogen(grad) * g), m.gelenk) });

// ---------- messen ----------
const strecke = (q: V3, a: V3, b: V3): number => {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const l2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z || 1;
  const t = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y + (q.z - a.z) * ab.z) / l2));
  return Math.hypot(q.x - a.x - t * ab.x, q.y - a.y - t * ab.y, q.z - a.z - t * ab.z);
};
/** der größte Abstand zwischen den beiden Lippen (jeder Netzpunkt der einen zur anderen als Streckenzug) und wo */
function spalt(H: Haut): { weit: number; wo: V3 } {
  const K = L.proben.map((p) => lage(H.pos, p.ecken[0]));
  const eine = K.slice(0, ecke + 1);
  const andere = K.slice(ecke);
  const zur = (q: V3, Z: readonly V3[]): number => {
    let best = Infinity;
    for (let i = 0; i + 1 < Z.length; i++) best = Math.min(best, strecke(q, Z[i]!, Z[i + 1]!));
    return best;
  };
  let weit = 0;
  let wo = K[0]!;
  for (const [von, zu] of [
    [eine, andere],
    [andere, eine],
  ] as const)
    for (const q of von) {
      const d = zur(q, zu);
      if (d > weit) {
        weit = d;
        wo = q;
      }
    }
  return { weit, wo };
}
const vorn = (H: Haut): number => {
  const a = lage(H.pos, L.proben[0]!.ecken[0]);
  const b = lage(H.pos, L.proben[L.proben.length - 1]!.ecken[0]);
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
};
/** außen über die Naht: der Winkel zwischen der Haut außen an der einen Lippe und der an der anderen (Normalen nach außen), Grad */
function nahtKnick(H: Haut): { max: number; mittel: number } {
  const R = knickReihe(H, L);
  if (!R) return { max: NaN, mittel: NaN };
  const n = L.proben.length;
  const nor = L.proben.map((_, j) => (Math.abs(j - ecke) <= 2 ? null : (knickRahmen(H, R, j)?.nAussen ?? null)));
  let max = 0;
  let summe = 0;
  let zahl = 0;
  for (let j = 0; j < ecke; j++) {
    if (!nor[j]) continue;
    const p = lage(H.pos, L.proben[j]!.ecken[0]);
    let best = -1;
    let d = Infinity;
    for (let k = ecke + 1; k < n; k++) {
      if (!nor[k]) continue;
      const q = lage(H.pos, L.proben[k]!.ecken[0]);
      const dd = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      if (dd < d) {
        d = dd;
        best = k;
      }
    }
    if (best < 0) continue;
    const a = nor[j]!;
    const b = nor[best]!;
    const w = (Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z))) * 180) / Math.PI;
    max = Math.max(max, w);
    summe += w;
    zahl++;
  }
  return { max, mittel: zahl ? summe / zahl : NaN };
}
/** innen: was die Maullinie umschließt (die Tasche); je Dreieck 1, wenn es dazugehört */
const reiheInnen = knickReihe(haut, L);
const taschenDreieck = new Uint8Array(haut.tri.length / 3);
if (reiheInnen)
  for (let t = 0; t < taschenDreieck.length; t++) {
    const e = [haut.tri[3 * t]!, haut.tri[3 * t + 1]!, haut.tri[3 * t + 2]!];
    if (e.some((v) => reiheInnen.innen[v]) || e.every((v) => reiheInnen.aufKette[v]! >= 0)) taschenDreieck[t] = 1;
  }
/** Schnitt der Haut mit der Ebene z = z0, nur vorn am Maul: Strecken in der Seite, dazu ob die Strecke zur Tasche gehört */
function schnittStrecken(H: Haut, z0: number): [number, number, number, number, number, number][] {
  const out: [number, number, number, number, number, number][] = [];
  for (let k = 0; k < H.tri.length; k += 3) {
    const pkt: [number, number][] = [];
    for (let e = 0; e < 3; e++) {
      const a = lage(H.pos, H.tri[k + e]!);
      const b = lage(H.pos, H.tri[k + ((e + 1) % 3)]!);
      if (a.z - z0 < 0 === b.z - z0 < 0) continue;
      const g = (a.z - z0) / (a.z - b.z);
      pkt.push([a.x + g * (b.x - a.x), a.y + g * (b.y - a.y)]);
    }
    if (pkt.length === 2 && Math.max(pkt[0]![0], pkt[1]![0]) < -20) out.push([pkt[0]![0], pkt[0]![1], pkt[1]![0], pkt[1]![1], taschenDreieck[k / 3]!, k / 3]);
  }
  return out;
}
/** wo die Lippe (eine Kette von Netzpunkten) die Ebene z = z0 trifft, in der Seite */
function nahtBei(H: Haut, z0: number): [number, number][] {
  const out: [number, number][] = [];
  for (let j = 0; j + 1 < L.proben.length; j++) {
    const a = lage(H.pos, L.proben[j]!.ecken[0]);
    const b = lage(H.pos, L.proben[j + 1]!.ecken[0]);
    if (a.z - z0 < 0 === b.z - z0 < 0) continue;
    const g = (a.z - z0) / (a.z - b.z);
    out.push([a.x + g * (b.x - a.x), a.y + g * (b.y - a.y)]);
  }
  return out;
}
/** die Tiefen der Schnitte: von der Mitte bis kurz vor den Mundwinkel, dort dichter */
const SCHNITTE = [0.01, 0.3, 0.55, 0.72, 0.8, 0.87, 0.92, 0.96, 0.985].map((f) => (f < 0.02 ? f : f * W.ref.z));
/**
 * Durchdringt sich die Haut am Maul? Über alle Schnittebenen die Zahl der Stellen, an denen sich zwei Strecken des Schnitts kreuzen
 * (ohne gemeinsame Enden; Stellen näher als 1 an der Naht zählen nicht: Dort liegen die Lippen aufeinander). `aussen`: Haut außen
 * mit Haut außen; `durch`: die Tasche tritt durch die Haut außen; `innen`: die Tasche mit sich selbst.
 */
function kreuzungen(H: Haut): { aussen: number; durch: number; innen: number; wo: string } {
  const zahl = { aussen: 0, durch: 0, innen: 0, wo: '' };
  const orte: string[] = [];
  const o = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const gleich = (x1: number, y1: number, x2: number, y2: number): boolean => Math.hypot(x1 - x2, y1 - y2) < 1e-6;
  for (const z0 of SCHNITTE) {
    const S = schnittStrecken(H, z0);
    const naht = nahtBei(H, z0);
    for (let i = 0; i < S.length; i++)
      for (let j = i + 1; j < S.length; j++) {
        const a = S[i]!;
        const b = S[j]!;
        if (gleich(a[0], a[1], b[0], b[1]) || gleich(a[0], a[1], b[2], b[3]) || gleich(a[2], a[3], b[0], b[1]) || gleich(a[2], a[3], b[2], b[3])) continue;
        const d1 = o(a[0], a[1], a[2], a[3], b[0], b[1]);
        const d2 = o(a[0], a[1], a[2], a[3], b[2], b[3]);
        const d3 = o(b[0], b[1], b[2], b[3], a[0], a[1]);
        const d4 = o(b[0], b[1], b[2], b[3], a[2], a[3]);
        if (!(d1 * d2 < 0 && d3 * d4 < 0)) continue;
        const t = d1 / (d1 - d2);
        const x = b[0] + t * (b[2] - b[0]);
        const y = b[1] + t * (b[3] - b[1]);
        if (naht.some((q) => Math.hypot(q[0] - x, q[1] - y) < 1)) continue;
        if (a[4] && b[4]) zahl.innen++;
        else if (a[4] || b[4]) zahl.durch++;
        else zahl.aussen++;
        if (!(a[4] && b[4])) orte.push(`x ${z1(x)}, y ${z1(y)}, z ${z1(z0)}`);
        if (process.env.DIAG && !(a[4] && b[4])) {
          const art = (v: number): string => (!reiheInnen ? '?' : reiheInnen.aufKette[v]! >= 0 ? `L${reiheInnen.aufKette[v]}` : reiheInnen.innen[v] ? 'i' : 'a');
          const dr = (t: number): string =>
            [0, 1, 2]
              .map((e) => {
                const v = H.tri[3 * t + e]!;
                return `${art(v)}#${v}(${z1(H.pos[3 * v]!)} ${z1(H.pos[3 * v + 1]!)} ${z1(H.pos[3 * v + 2]!)})`;
              })
              .join(' ');
          console.log(`      DIAG z ${z1(z0)}: ${a[4] ? 'Tasche' : 'außen'} [${dr(a[5])}]  ×  ${b[4] ? 'Tasche' : 'außen'} [${dr(b[5])}]`);
        }
      }
  }
  zahl.wo = orte.join('; ');
  return zahl;
}
/** umgeschlagene Dreiecke der Haut außen (gegen die Normalen ihrer Ecken, aus der Haut außen allein) und der Tasche (ebenso) */
function umgeschlagen(H: Haut): { aussen: number; tasche: number } {
  const T = H.tri.length / 3;
  const zahl = { aussen: 0, tasche: 0 };
  for (const teil of [0, 1]) {
    const nor = new Float64Array(3 * H.n);
    const fl: number[][] = [];
    for (let t = 0; t < T; t++) {
      if (taschenDreieck[t] !== teil) {
        fl.push([0, 0, 0]);
        continue;
      }
      const a = lage(H.pos, H.tri[3 * t]!);
      const b = lage(H.pos, H.tri[3 * t + 1]!);
      const c = lage(H.pos, H.tri[3 * t + 2]!);
      const n = [(b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)];
      fl.push(n);
      for (let e = 0; e < 3; e++) for (let k = 0; k < 3; k++) nor[3 * H.tri[3 * t + e]! + k] = nor[3 * H.tri[3 * t + e]! + k]! + n[k]!;
    }
    for (let t = 0; t < T; t++) {
      if (taschenDreieck[t] !== teil) continue;
      let s = 0;
      for (let e = 0; e < 3; e++) for (let k = 0; k < 3; k++) s += fl[t]![k]! * nor[3 * H.tri[3 * t + e]! + k]!;
      if (s < 0) zahl[teil ? 'tasche' : 'aussen']++;
    }
  }
  return zahl;
}
/** wie weit die Haut außen von der Kugel abweicht: vorn am Maul und fern davon */
function nebenDerKugel(H: Haut): { nah: number; fern: number } {
  const R = knickReihe(haut, L);
  let nah = 0;
  let fern = 0;
  for (let v = 0; v < H.n; v++) {
    if (R && (R.innen[v] || R.aufKette[v]! >= 0)) continue;
    const p = lage(H.pos, v);
    const d = Math.abs(Math.hypot(p.x, p.y, p.z) - R0);
    if (p.x < -40 && Math.abs(p.y - YC) < 70) nah = Math.max(nah, d);
    else if (p.x > 0) fern = Math.max(fern, d);
  }
  return { nah, fern };
}
type Messung = { name: string; H: Haut; text: string; spalt: number; vorn: number; um: { aussen: number; tasche: number }; kreuz: ReturnType<typeof kreuzungen>; naht: { max: number; mittel: number } };
function messen(name: string, grad: number): Messung {
  const H = pose(grad);
  const um = umgeschlagen(H);
  const sp = spalt(H);
  const nk = nahtKnick(H);
  const kr = kreuzungen(H);
  const text =
    `Lippen vorn ${z2(vorn(H))} auseinander, größter Spalt ${z2(sp.weit)} (bei x ${z1(sp.wo.x)}, z ${z1(sp.wo.z)}); umgeschlagen außen ${um.aussen}, in der Tasche ${um.tasche}; ` +
    `Kreuzungen in ${SCHNITTE.length} Schnitten: außen ${kr.aussen}, Tasche durch die Haut ${kr.durch}${kr.wo ? ` (${kr.wo})` : ''}, Tasche mit sich ${kr.innen}; außen über die Naht im Mittel ${z1(nk.mittel)}° (größter Wert ${z1(nk.max)}°)`;
  console.log(`   ${name.padEnd(22)} ${text}`);
  return { name, H, text, spalt: sp.weit, vorn: vorn(H), um, kreuz: kr, naht: nk };
}
{
  const nb = nebenDerKugel(haut);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < haut.n; v++) for (let k = 0; k < 3; k++) {
    lo[k] = Math.min(lo[k]!, haut.pos[3 * v + k]!);
    hi[k] = Math.max(hi[k]!, haut.pos[3 * v + k]!);
  }
  console.log(`Die Kugel ${RINGE.length ? `mit ${RINGE.length} Haltelinien` : 'ohne Haltelinien'} nach dem Formen: außen am Maul bis ${z1(nb.nah)}, fern bis ${z1(nb.fern)} neben der Kugel von vorher; Ausdehnung x ${z1(lo[0]!)} bis ${z1(hi[0]!)}, y ${z1(lo[1]!)} bis ${z1(hi[1]!)}, z bis ${z1(hi[2]!)}`);
}
console.log(`Über die ganze Haut gezählt wie im Fenster (jedes Dreieck gegen die Normalen seiner Ecken, außen und Tasche gemischt): umgeschlagen ${falten(haut).umgeklappt}`);
console.log(`Die drei Lagen (gerechnet ist die mittlere; ${haut.n} Punkte, ${taschenDreieck.reduce((a, b) => a + b, 0)} Dreiecke in der Tasche):`);
const zu = messen('zu', -WINKEL0);
const gerechnet = messen(`wie gerechnet (${WINKEL0}°)`, 0);
const auf = messen(`auf (${AUF}° von zu)`, AUF - WINKEL0);
const GENAU = mk / 40;
const k1 = zu.spalt <= GENAU;
const k2 = zu.um.aussen <= gerechnet.um.aussen && zu.kreuz.aussen === 0 && zu.kreuz.durch === 0;
const k3 = auf.vorn >= 30 && auf.um.aussen <= gerechnet.um.aussen && auf.um.tasche <= gerechnet.um.tasche && auf.kreuz.aussen + auf.kreuz.durch + auf.kreuz.innen === 0;
const k4 = geformt.steht;
console.log(
  `Kriterien: 1 Lippen aufeinander ${k1 ? 'hält' : 'HÄLT NICHT'} (Spalt ${z2(zu.spalt)}; so genau gibt das Netz jede Linie wieder: ${z2(GENAU)}); ` +
    `2 zu: außen nichts umgeschlagen, nichts tritt durch die Haut ${k2 ? 'hält' : 'HÄLT NICHT'}; 3 auf ${k3 ? 'hält' : 'HÄLT NICHT'}; 4 die Rechnung steht ${k4 ? 'hält' : 'HÄLT NICHT'}`,
);

if (AUS) {
  const schnitt = (H: Haut): BlattSchnitt => ({
    titel: 'Schnitt durch die Mitte (das Maul von der Seite, vergrößert)',
    strecken: schnittStrecken(H, 0.01).flatMap((s) => [s[0] + 100, s[1] + 20, s[2] + 100, s[3] + 20]),
    mass: 200,
    hoch: 0.6,
  });
  const bild = (name: string, H: Haut, notiz: string, mitLinien = true): BlattBild => {
    const linien: BlattLinie[] = !mitLinien
      ? []
      : loops.flatMap((l) => {
          const p = Array.from(hautLagen(H, l));
          const zuL = l.art !== 'ring';
          const K = kanteBei(l, loops);
          const hart = K.reduce((a, b) => a + b, 0) > K.length / 2 ? 1 : 0;
          return l.art === 'mitte' ? [{ p, zu: zuL, hart }] : [{ p, zu: zuL, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu: zuL, hart }];
        });
    const punkte = !mitLinien
      ? []
      : loops.flatMap((l) =>
          l.punkte.filter(istSichtbar).flatMap((p) => {
            let j = 0;
            for (let i = 1; i < l.s.length; i++) if (Math.abs(l.s[i]! - p.s) < Math.abs(l.s[j]! - p.s)) j = i;
            const q = lage(H.pos, l.proben[j]!.ecken[0]);
            return Math.abs(q.z) < 1e-6 ? [[q.x, q.y, q.z]] : [[q.x, q.y, q.z], [q.x, q.y, -q.z]];
          }),
        );
    return { name, h: H, loops: [], notiz, fertig: { linien, punkte }, schnitt: schnitt(H) };
  };
  blattSchreiben(
    AUS,
    'Schritt 6, Beweis „das Maul aus nur einer Linie“ (13.11.2026)',
    [
      {
        titel: `Die eine Linie ist die Oberlippe, die Unterlippe ihr um ${WINKEL0}° gedrehtes Abbild; gerechnet wird leicht geöffnet, „zu“ dreht der Kieferknochen`,
        bilder: [
          bild('zu: das Maul ist eine Linie', zu.H, `Spalt zwischen den Lippen höchstens ${z2(zu.spalt)}; außen umgeschlagen ${zu.um.aussen}; die Tasche tritt ${zu.kreuz.durch}-mal durch die Haut; außen über die Naht im Mittel ${z1(zu.naht.mittel)}°`),
          bild('zu, ohne Linien: nur die Haut', zu.H, 'dieselbe Lage; so viel sieht man vom geschlossenen Maul an der Haut (flach schattiert: übertrieben)', false),
          bild(`wie gerechnet: ${WINKEL0}° offen`, gerechnet.H, `${haut.n} Punkte; ${geformt.steht ? 'die Rechnung steht' : 'die Rechnung steht nicht'}; umgeschlagen außen ${gerechnet.um.aussen}, in der Tasche ${gerechnet.um.tasche}`),
          bild(`auf: ${AUF}° von zu`, auf.H, `Lippen vorn ${z1(auf.vorn)} auseinander; umgeschlagen außen ${auf.um.aussen}, in der Tasche ${auf.um.tasche}; Kreuzungen ${auf.kreuz.aussen + auf.kreuz.durch + auf.kreuz.innen}`),
        ],
        blicke: [
          ['Seite', 0, 0, 0.85],
          ['schräg von vorn', 50, 12, 0.85],
        ],
        mass: 430,
        mitte: [0, 0, 0],
      },
      ...(process.env.NAH
        ? [
            {
              titel: 'Der Mundwinkel, vergrößert',
              bilder: [
                bild('zu', zu.H, ''),
                bild('zu, ohne Linien', zu.H, '', false),
                bild('wie gerechnet', gerechnet.H, ''),
                bild('auf', auf.H, ''),
              ].map((b) => ({ ...b, schnitt: [] })),
              blicke: [
                ['Seite', 0, 0, 0.85],
                ['von hinten oben', -60, 35, 0.85],
              ] as const,
              mass: 70,
              mitte: [W.ref.x - 12, W.ref.y - 4, W.ref.z] as const,
            },
          ]
        : []),
    ],
    1640,
    'Schwarze Linien: Kante an (die Lippen). Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist (das übertreibt gegenüber dem Fenster). Unter jedem Bild der Schnitt durch die Mitte.',
  );
  console.log(`Bildblatt: ${AUS}`);
}
