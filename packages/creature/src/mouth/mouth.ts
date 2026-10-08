import type { Bauplan } from '../bauplan/schema';
import { add, clamp, clamp01, cross, dot, lerp, normalize, quatFromAxisAngle, rotate, scale, smoothstep, sub, type Vec3 } from '../math/vec';
import { evalScene, type SdfScene } from '../sdf/scene';

/**
 * Das Maul als **Maullinie auf dem Träger** (Körper oder Kopf): eine Kurve um den Träger herum von Mundwinkel zu
 * Mundwinkel, stufenlos in der Höhe (`hoehe`), gekippt (`neigung`), mit Winkeln nach hinten (`winkel`/`breite`).
 * Entlang dieser Kurve wird die geschlossen vermaschte Haut **aufgeschnitten** (mesh/mundschnitt.ts) — das Maul ist
 * geschlossen per Konstruktion perfekt und öffnet sich durch Drehung des Unterkiefers (und Heben des Oberkiefers) um
 * das Gelenk am Hinterkopf. `form` blendet beim Öffnen von radialer Weitung (Lochmaul) zu Kieferdrehung (Keilmaul);
 * `rundung` bestimmt, wie die Öffnung zu den Winkeln ausläuft (spitz … rund wie beim Aal).
 */

/** Träger des Mauls in einem lokalen Rahmen: Achse von `origin` entlang `up`, Azimut φ um `up` ab `forward`. */
export interface MouthHost {
  origin: Vec3;
  up: Vec3;
  forward: Vec3;
  right: Vec3;
  /** Höhe des Trägers entlang `up` (lokal 0 … height). */
  height: number;
  /** Charakteristische halbe Breite quer (für Lippen- und Zahnmaße). */
  halfWidth: number;
  /** Knochen des Trägers. */
  bone: number;
  /** Kiefergelenk: Abstand hinter dem Ursprung entlang −forward (auf Höhe der Mundwinkel). */
  jointBack: number;
  /** Höhe des Unterkiefers unter der Maullinie (Körperträger: Kinnband des Grundblobs); ohne Angabe 45 % der Trägerhöhe. */
  jawDepth?: number;
  /** Kopfhöhe (Kinn bis Scheitel) für Öffnungsweite, Linienschwung und Augengröße; ohne Angabe die Trägerhöhe. */
  headHeight?: number;
  /** Mittellinie des Trägers: Scheibenmitte auf Höhe h (Körperträger mit Neigung); ohne Angabe `origin + up · h`. */
  center?: (h: number) => Vec3;
  /** Szene nur mit den Trägerformen (zum Marschieren auf die Fläche). */
  scene: SdfScene;
}

export interface Tooth {
  pos: Vec3;
  /** Richtung der Spitze (Einheit). */
  dir: Vec3;
  /** Länge (Blob-Einheiten). */
  size: number;
  /** oben (Oberkiefer) oder unten (Unterkiefer, folgt dem Kieferknochen). */
  upper: boolean;
  /** Hauer: ragt über die Oberlippe. */
  hauer: boolean;
  /** Richtung in den Rachen (zur Trägerachse) am Ansatz — die Biegung des Zahns zeigt dorthin. */
  inward?: Vec3;
}

export interface MouthGeometry {
  host: MouthHost;
  /** Lokale Höhe der Maullinie vorn. */
  hLip: number;
  /** Halber Winkel der Mundwinkel (rad). */
  theta: number;
  /** Abtastungen der geschlossenen Maullinie von −θ nach +θ. */
  lipLine: Vec3[];
  lipH: number[];
  lipR: number[];
  phis: number[];
  center: Vec3;
  corners: [Vec3, Vec3];
  /** Maulrahmen am Zentrum: z vorn (Flächennormale), y oben, x rechts. */
  frame: { x: Vec3; y: Vec3; z: Vec3 };
  /** Maximale Öffnungshöhe vorn (Körpereinheiten), aus `oeffnung`. */
  gapeMax: number;
  /** Rachentiefe als Anteil. */
  tiefe: number;
  jawHinge: { point: Vec3; axis: Vec3 };
  local(p: Readonly<Vec3>): { h: number; phi: number; r: number };
  lipHAt(phi: number): number;
  lipRAt(phi: number): number;
  /** Öffnungsprofil 0…1 je Azimut (1 vorn, 0 an den Winkeln): spitz (Rex) … rund (Aal). */
  profilAt(phi: number): number;
  /**
   * 0…1: wie stark ein Punkt zum Unterkiefer gehört. `side` (−1 unten, +1 oben) kommt aus dem Lippenschnitt: die Haut ist
   * dort getrennt, die Zugehörigkeit springt hart an der Maullinie (sonst zerfasert der Rand beim Öffnen); ohne `side`
   * weich über die Linie.
   */
  jawWeight(p: Readonly<Vec3>, bodyScale: number, side?: number): number;
  /** 0…1: wie stark ein Punkt zum Oberkiefer (Oberkopf, klappt beim Öffnen zurück) gehört. */
  upperWeight(p: Readonly<Vec3>, bodyScale: number, side?: number): number;
  /** Unterkiefer in zwei Teilen: `a` = Zugehörigkeit (Seite), `f` = starrer Anteil (1 Kiefer … 0 Rumpf: Tiefe unter dem Kinn und Lage hinter den Mundwinkeln); die Kehlkette biegt dazwischen. */
  jawParts(p: Readonly<Vec3>, bodyScale: number, side?: number): { a: number; f: number };
  /** Oberkiefer in zwei Teilen: `a` = Zugehörigkeit (Seite), `f` = starrer Anteil (1 vor den Mundwinkeln … 0 weit dahinter); die Nackenkette biegt dazwischen. */
  upperParts(p: Readonly<Vec3>, bodyScale: number, side?: number): { a: number; f: number };
  /** Höhe des starren Unterkiefers unter der Maullinie und Länge der Biegezone darunter (Kehlsack). */
  jawDepth: number;
  fadeLen: number;
  /** Auslauf der Kieferbewegung vom Mundwinkel (1) zum Gelenk (0) über die Vorn-Koordinate. */
  wToJoint(zLocal: number): number;
  /** Vorn-Koordinate der Mundwinkel (lokal). */
  zCorner: number;
  /** Hebel Gelenk → Maulzentrum (Körpereinheiten). */
  jawLever: number;
  /** Größter Drehwinkel des Unterkiefers, bei dem der Rand über dem Boden bleibt (rad). */
  lowerAngleMax: number;
}

/** Scheibenmitte des Trägers auf Höhe h (Mittellinie oder gerade Achse). */
export function hostCenter(host: MouthHost, h: number): Vec3 {
  return host.center ? host.center(h) : add(host.origin, scale(host.up, h));
}

/** Marschiert von der Mittellinie auf Höhe h in Richtung φ bis zur Fläche; liefert Punkt und Radialabstand. */
export function surfacePoint(host: MouthHost, h: number, phi: number, maxR: number): { p: Vec3; r: number } {
  const a = hostCenter(host, h);
  const dir = add(scale(host.forward, Math.cos(phi)), scale(host.right, Math.sin(phi)));
  let r = 0;
  let p: Vec3 = a;
  for (let i = 0; i < 48; i++) {
    p = add(a, scale(dir, r));
    const d = evalScene(host.scene, p);
    if (Math.abs(d) < 1e-4) break;
    const step = d < 0 ? Math.max(-d, 0.004) : -d;
    r += step;
    if (r > maxR) {
      r = maxR;
      p = add(a, scale(dir, r));
      break;
    }
    if (r < 0) {
      r = 0;
      break;
    }
  }
  return { p, r };
}

export function buildMouth(b: Bauplan, host: MouthHost, bodyScale: number): MouthGeometry {
  const m = b.maul;
  const H = host.height;
  const hLip = clamp(m.hoehe, 0.02, 0.98) * H;
  // Kopfhöhe: beim Kopfträger die Trägerhöhe, beim Körperträger Kinn bis Scheitel — Öffnung und Schwung sind Kopfmaße
  const Hk = host.headHeight ?? H;
  const maxR = host.halfWidth * 3 + bodyScale;
  // Öffnungshöhe vorn bei voller Öffnung
  // Florian: alle Tiere sollen das Maul so weit aufreißen, dass sie ein anderes mit einem Haps verschlingen — 1 = 1,6 Kopfhöhen
  const gapeMax = Math.max(0.004, clamp01(m.oeffnung) * 1.6 * Hk);
  // Weite der Öffnung: Keil bis weit zu den Mundwinkeln; Loch so breit wie hoch
  const thetaKeil = clamp(m.breite * (Math.PI / 2 + m.winkel * (Math.PI * 0.45)), 0.15, Math.PI * 0.95);
  const rLipFront = Math.max(0.02, surfacePoint(host, hLip, 0, maxR).r);
  const thetaRund = clamp((gapeMax * 0.6) / rLipFront, 0.12, thetaKeil);
  const fForm = clamp01(m.form);
  const theta = lerp(thetaRund, thetaKeil, fForm);
  const rundung = lerp(1, clamp01(m.rundung), fForm);
  const profA = lerp(2, 5, rundung);
  const profB = lerp(1, 0.5, rundung);
  const n = 65;
  const phis: number[] = [];
  const lipH: number[] = [];
  const lipR: number[] = [];
  const lipLine: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const phi = -theta + 2 * theta * t;
    // Maullinie wie gezeichnet (Bild 3/5): vorn an der Schnauze, hinter ihr leicht abgesenkt (`schwung`), zu den Winkeln
    // ansteigend (`neigung`) — eine geschwungene Linie, keine Gerade
    const u = Math.abs(phi) / theta;
    const rise = m.neigung * 0.22 * Hk * u * u;
    const dip = clamp01(m.schwung) * 0.12 * Hk * Math.pow(Math.sin(Math.PI * clamp01(u / 0.72)), 1.5) * (u < 0.72 ? 1 : 0);
    // W-Lippe (Katze, Hund — Bild 8/9): Mitte unter der Nase angehoben, beidseits hängende Lappen, dann zum Winkel
    const wF = clamp01(m.wForm) * fForm;
    // ω: schmale Spitze unter der Nase (Philtrum), dicht daneben hängen die Lefzen tief, zum Winkel steigt die Linie
    // (Lächeln) — Bild 8 (Retriever) und Bild 9 (Tiger)
    const wLippe = wF * Hk * (0.15 * Math.exp(-Math.pow(u / 0.08, 2)) - 0.1 * Math.exp(-Math.pow((u - 0.24) / 0.14, 2)) + 0.05 * smoothstep(0.45, 1, u));
    const h = clamp(hLip + rise - dip + wLippe, 0.01, H - 0.01);
    const sp = surfacePoint(host, h, phi, maxR);
    phis.push(phi);
    lipH.push(h);
    lipR.push(sp.r);
    lipLine.push(sp.p);
  }
  const mid = (n - 1) / 2;
  const center = lipLine[mid]!;
  const corners: [Vec3, Vec3] = [lipLine[0]!, lipLine[n - 1]!];
  const e = 0.01 * bodyScale;
  const grad: Vec3 = [
    evalScene(host.scene, [center[0] + e, center[1], center[2]]) - evalScene(host.scene, [center[0] - e, center[1], center[2]]),
    evalScene(host.scene, [center[0], center[1] + e, center[2]]) - evalScene(host.scene, [center[0], center[1] - e, center[2]]),
    evalScene(host.scene, [center[0], center[1], center[2] + e]) - evalScene(host.scene, [center[0], center[1], center[2] - e]),
  ];
  let fz = normalize(grad);
  if (dot(fz, host.forward) < 0.2) fz = host.forward;
  let fx = normalize(cross(host.up, fz));
  const fy = normalize(cross(fz, fx));
  fx = normalize(cross(fy, fz));
  const frame = { x: fx, y: fy, z: fz };
  const tiefe = clamp(m.tiefe, 0.2, 1);

  const interp = (arr: number[], phi: number): number => {
    const t = clamp((phi + theta) / (2 * theta), 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(t));
    const f = t - i;
    const p0 = arr[Math.max(0, i - 1)]!, p1 = arr[i]!, p2 = arr[i + 1]!, p3 = arr[Math.min(n - 1, i + 2)]!;
    const f2 = f * f, f3 = f2 * f;
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f3);
  };
  const lipHAt = (phi: number): number => interp(lipH, phi);
  const lipRAt = (phi: number): number => interp(lipR, phi);
  const profilAt = (phi: number): number => {
    const u = clamp(Math.abs(phi) / theta, 0, 1);
    const profil = Math.pow(Math.max(0, 1 - Math.pow(u, profA)), profB);
    const w = 1 + m.wForm * 0.25 * Math.cos(phi * (Math.PI / Math.max(theta, 0.3)) * 1.5);
    return clamp01(profil * w);
  };
  const local = (p: Readonly<Vec3>): { h: number; phi: number; r: number } => {
    const h = dot(sub(p, host.origin), host.up);
    const v = sub(p, hostCenter(host, h));
    const vx = dot(v, host.right);
    const vz = dot(v, host.forward);
    return { h, phi: Math.atan2(vx, vz), r: Math.hypot(vx, vz) };
  };

  // Gelenk: die Linie der Mundwinkel (eine Spur dahinter), Achse quer — wie ein echtes Kiefergelenk. Davor sind Ober- und
  // Unterkiefer starr, dahinter laufen beide über die Nacken- bzw. Kehlkette aus (weiche Biegung statt Riss): am Winkel
  // selbst ist der Hebel null, deshalb reißt dort nichts, auch wenn die Seiten hart getrennt sind
  const hCorner = lipHAt(theta);
  const zCorner = lipRAt(theta) * Math.cos(theta);
  const zHinge = zCorner - 0.03 * H;
  const hingeMid: Vec3 = add(hostCenter(host, hCorner), scale(host.forward, zHinge));
  const jawLever = Math.max(0.05, Math.hypot(center[0] - hingeMid[0], center[1] - hingeMid[1], center[2] - hingeMid[2]));
  const hingeAxis: Vec3 = normalize(host.right);
  const rampBack = Math.max(0.3 * H, host.jointBack);
  const wToJoint = (zLocal: number): number => smoothstep(zHinge - rampBack, zHinge, zLocal);

  // Unterkiefer als starrer Löffel: volle Zugehörigkeit bis zur Kiefertiefe (Unterkieferhöhe unter der Maullinie, beim
  // Körperträger höchstens 45 % der Trägerhöhe), dann weich zum Hals/Körper auslaufend
  const jawDepth = host.jawDepth ?? Math.min(hLip, 0.45 * H) * 1.05;
  // Biegezone unter dem starren Kiefer: kurz (Kinn → Hals) oder als Kehlsack bis zur Brust (`maul.kehle`, Drache: der
  // Unterkiefer wird beim Öffnen lang); die Kehlkette (zwei Knochen mit ⅔ und ⅓ des Winkels) biegt sie weich
  const kehle = clamp01(m.kehle ?? 0);
  const fadeLen = 0.6 * jawDepth + kehle * Math.max(0.25 * H, hLip - jawDepth - 0.06 * H);
  // Lippenhöhe als Bezug für Punkte nahe der Trägerachse (Azimut dort unbestimmt — Brust unter dem Kopf): zur Achse hin
  // auf die Höhe der Maulmitte blenden, sonst springt der Tiefenanteil zwischen Nachbarn
  const lipRef = (phiC: number, r: number): number => lerp(hLip, lipHAt(phiC), smoothstep(0, 0.35 * host.halfWidth, r));
  const jawParts = (p: Readonly<Vec3>, bs: number, side?: number): { a: number; f: number } => {
    if (m.unterkiefer < 0.05) return { a: 0, f: 0 };
    const { h, phi, r } = local(p);
    const aphi = Math.abs(phi);
    const phiC = clamp(phi, -theta, theta);
    const hl = lipRef(phiC, r);
    const below = hl - h;
    void aphi;
    const band = Math.max(0.09 * bs, 0.12 * H);
    // Seite aus dem Lippenschnitt (±1 Haut, dazwischen die Taschenwand) oder nach Höhe
    const wBelow = side !== undefined && Math.abs(side) > 1e-3 ? clamp01((1 - side) / 2) : smoothstep(-0.2 * band, band, below) * smoothstep(0, 0.5 * band, below + 0.3 * band);
    const fz = wToJoint(r * Math.cos(phi));
    const fd = 1 - smoothstep(jawDepth * 0.95, jawDepth * 0.95 + fadeLen, below);
    return { a: clamp01(wBelow), f: fz * fd };
  };
  const jawWeight = (p: Readonly<Vec3>, bs: number, side?: number): number => {
    const { a, f } = jawParts(p, bs, side);
    return a * f;
  };
  const upperParts = (p: Readonly<Vec3>, bs: number, side?: number): { a: number; f: number } => {
    const { h, phi, r } = local(p);
    const phiC = clamp(phi, -theta, theta);
    const hl = lipRef(phiC, r);
    const above = h - hl;
    const band = Math.max(0.09 * bs, 0.12 * H);
    const wAbove = side !== undefined && Math.abs(side) > 1e-3 ? clamp01((1 + side) / 2) : smoothstep(-0.2 * band, band, above) * smoothstep(0, 0.5 * band, above + 0.3 * band);
    return { a: clamp01(wAbove), f: wToJoint(r * Math.cos(phi)) };
  };
  const upperWeight = (p: Readonly<Vec3>, bs: number, side?: number): number => {
    const { a, f } = upperParts(p, bs, side);
    return a * f;
  };

  // Schranke des Unterkiefers aus der Geometrie darunter (Florian: der Kiefer darf nicht durch den Körper fahren): Rand und
  // Kinnboden werden um das Gelenk gedreht, bis ein Punkt den Boden erreicht oder in den **starren** Teil des Körpers
  // (unter der Biegezone) eintaucht — bis dahin dreht der Unterkiefer, den Rest übernimmt der Oberkiefer
  const lowerAngleMax = (() => {
    if (m.unterkiefer < 0.05) return 0;
    // Abtastpunkte nur auf der Fläche und über der Standfläche (unterhalb des Trägers gibt es keine Haut mehr)
    const hMin = 0.05 * H;
    const aufFlaeche = (h: number, phi: number): Vec3 | null => {
      if (h < hMin) return null;
      const sp = surfacePoint(host, h, phi, maxR);
      return sp.r >= maxR - 1e-6 || sp.r <= 1e-6 ? null : sp.p;
    };
    const samples: Array<{ p: Vec3; hStatic: number }> = [];
    for (let i = 0; i <= 6; i++) {
      const phi = -theta + (2 * theta * i) / 6;
      const hl = lipHAt(phi);
      const hStatic = hl - jawDepth * 0.95 - fadeLen;
      for (const h of [hl, hl - jawDepth]) {
        const q = aufFlaeche(h, phi);
        if (q) samples.push({ p: q, hStatic });
      }
    }
    // Biegezone (Kehlkette): Punkte unter dem Kinn drehen nur anteilig — auch sie dürfen nicht in den Boden
    const kette: Array<{ p: Vec3; anteil: number }> = [];
    for (let i = 0; i <= 4; i++) {
      const phi = -theta + (2 * theta * i) / 4;
      const hl = lipHAt(phi);
      for (let k = 1; k <= 3; k++) {
        const q = aufFlaeche(hl - jawDepth - (fadeLen * k) / 4, phi);
        if (q) kette.push({ p: q, anteil: 1 - k / 4 });
      }
    }
    const floor = 0.04 * bodyScale;
    // Drehsinn: positiver Winkel senkt die Front (wie im Rig); sonst spiegeln
    const probe = add(hingeMid, rotate(quatFromAxisAngle(hingeAxis, 0.1), sub(center, hingeMid)));
    const sign = dot(sub(probe, center), host.up) < 0 ? 1 : -1;
    const step = (2 * Math.PI) / 180;
    let ok = 0;
    for (let k = 1; k <= 36; k++) {
      const ang = k * step;
      const q = quatFromAxisAngle(hingeAxis, sign * ang);
      let frei = true;
      for (const sm of kette) {
        const pr = add(hingeMid, rotate(quatFromAxisAngle(hingeAxis, sign * ang * sm.anteil), sub(sm.p, hingeMid)));
        if (pr[1] < floor * 0.5) { frei = false; break; }
      }
      if (!frei) break;
      for (const sm of samples) {
        const pr = add(hingeMid, rotate(q, sub(sm.p, hingeMid)));
        if (pr[1] < floor) { frei = false; break; }
        // starrer Teil: unter der Biegezone oder hinter dem Gelenk (ein Kinn, das nach hinten in den Rumpf schwenkt)
        const hr = dot(sub(pr, host.origin), host.up);
        const zr = dot(sub(pr, hostCenter(host, hr)), host.forward);
        if ((hr < sm.hStatic + 0.02 * H || zr < zHinge - 0.02 * H) && evalScene(host.scene, pr) < -0.025 * bodyScale) { frei = false; break; }
      }
      if (!frei) break;
      ok = ang;
    }
    // Faltbudget: die Biegezone unter dem Kinn kann höchstens ≈ 60 % ihrer Länge an Verschiebung aufnehmen, sonst
    // schiebt sich der Kiefer durch die Haut darunter (Florian: „fährt durch das Mesh“); mehr Weg → Kehlsack (`maul.kehle`)
    const chin = surfacePoint(host, hLip - jawDepth, 0, maxR).p;
    const lChin = Math.max(0.05, Math.hypot(chin[0] - hingeMid[0], chin[1] - hingeMid[1], chin[2] - hingeMid[2]));
    const thetaFold = 2 * Math.asin(clamp((1.1 * fadeLen) / lChin, 0, 1));
    return Math.min(ok, thetaFold, Math.asin(0.95));
  })();
  return { host, hLip, theta, lipLine, lipH, lipR, phis, center, corners, frame, gapeMax, tiefe, jawHinge: { point: hingeMid, axis: hingeAxis }, local, lipHAt, lipRAt, profilAt, jawWeight, upperWeight, jawParts, upperParts, jawDepth, fadeLen, wToJoint, zCorner, jawLever, lowerAngleMax };
}
