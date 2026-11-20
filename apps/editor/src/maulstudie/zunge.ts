/**
 * Studie „Maul, Zähne, Zunge“ (20.11.2026): die Zunge als Gummi.
 *
 * Die Zunge ist eine Kette von Knoten auf dem Mundboden, von der Wurzel hinten am Scharnier bis zur Spitze hinter der Unterlippe.
 * Jeder Knoten will an seinen Platz auf dem Unterkiefer zurück (Feder), die Kette hält ihre Länge weich (Gummi: Sie dehnt sich,
 * wenn man zieht, und wird dabei dünner), Gaumen und Boden halten sie im Maul. Bewegt sich der Kiefer, kommt die Zunge mit
 * Verzögerung nach und schwingt aus. Zieht man sie über die Lippe hinaus, hängt sie dort.
 */
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import type { MaulSchnitt } from './schnitt';

const K = 11;
const M = 14;

export class Zunge {
  readonly geo = new BufferGeometry();
  readonly knoten = K;
  /** Lage der Knoten in Ruhe (bei geschlossenem Maul, im Maß der Form) */
  private readonly ruhe = new Float32Array(3 * K);
  private readonly pos = new Float32Array(3 * K);
  private readonly vel = new Float32Array(3 * K);
  private readonly breite = new Float32Array(K);
  private readonly dicke = new Float32Array(K);
  private readonly lang0 = new Float32Array(K - 1);
  private readonly punkte: Float32Array;
  /** +1, wenn die linke Normale der Linie vom Boden zum Gaumen zeigt */
  private readonly auf: number;
  private gegriffen = -1;
  private readonly ziel = new Vector3();
  /** Abstand der zwei Mauswände an der Stelle der Zunge (0 = zu): Danach richtet sich, wie dick sie sein darf */
  private platz = 0;
  bewegt = false;

  constructor(private readonly m: MaulSchnitt) {
    this.auf = m.obenLinks ? 1 : -1;
    const breiteBei = (s: number): number => {
      const x = Math.max(0, Math.min(1, s / m.sVorn)) * (m.breite.length - 1);
      const i = Math.floor(x);
      return m.breite[i]! + (m.breite[Math.min(m.breite.length - 1, i + 1)]! - m.breite[i]!) * (x - i);
    };
    for (let k = 0; k < K; k++) {
      const u = k / (K - 1);
      const s = m.sVorn * (0.1 + 0.68 * u);
      const o = m.profil.ort(s);
      const t = m.profil.tangente(s);
      this.dicke[k] = 0.075 * m.lang * (0.75 + 0.4 * Math.sin(Math.PI * Math.pow(u, 0.7))) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 6)));
      this.breite[k] = Math.min(0.74 * breiteBei(s), 0.42 * m.lang) * (0.86 + 0.14 * Math.sin(Math.PI * u)) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 5)));
      // auf dem Boden: die halbe Dicke über der Linie
      const h = this.auf * this.dicke[k]! * 0.9;
      this.ruhe[3 * k] = o.x - t.y * h;
      this.ruhe[3 * k + 1] = o.y + t.x * h;
      this.ruhe[3 * k + 2] = 0;
    }
    this.pos.set(this.ruhe);
    for (let k = 0; k + 1 < K; k++) this.lang0[k] = Math.hypot(this.ruhe[3 * k + 3]! - this.ruhe[3 * k]!, this.ruhe[3 * k + 4]! - this.ruhe[3 * k + 1]!);
    this.punkte = new Float32Array(3 * (K * M + 1));
    this.geo.setAttribute('position', new BufferAttribute(this.punkte, 3));
    const idx: number[] = [];
    for (let k = 0; k + 1 < K; k++) {
      for (let j = 0; j < M; j++) {
        const a = k * M + j;
        const b = k * M + ((j + 1) % M);
        idx.push(a, b, a + M, b, b + M, a + M);
      }
    }
    const spitze = K * M;
    for (let j = 0; j < M; j++) idx.push((K - 1) * M + j, (K - 1) * M + ((j + 1) % M), spitze);
    this.geo.setIndex(idx);
  }

  private drehen(x: number, y: number, a: number): [number, number] {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = x - this.m.C.x;
    const dy = y - this.m.C.y;
    return [this.m.C.x + c * dx - s * dy, this.m.C.y + s * dx + c * dy];
  }

  /** der Knoten, der einem Ort am nächsten liegt (die Wurzel ist fest und zählt nicht) */
  naechster(p: Vector3): number {
    let best = 2;
    let d = Infinity;
    for (let k = 2; k < K; k++) {
      const q = Math.hypot(this.pos[3 * k]! - p.x, this.pos[3 * k + 1]! - p.y, this.pos[3 * k + 2]! - p.z);
      if (q < d) {
        d = q;
        best = k;
      }
    }
    return best;
  }
  ort(k: number): Vector3 {
    return new Vector3(this.pos[3 * k]!, this.pos[3 * k + 1]!, this.pos[3 * k + 2]!);
  }
  greifen(k: number): void {
    this.gegriffen = k;
    this.ziel.copy(this.ort(k));
  }
  ziehen(p: Vector3): void {
    this.ziel.copy(p);
  }
  lassen(): void {
    this.gegriffen = -1;
  }
  get greift(): boolean {
    return this.gegriffen >= 0;
  }

  /**
   * Ein Bild weiter. `links`, `rechts`: die Drehung der Seite links und rechts der Maullinie in Bogenmaß (mit Vorzeichen, wie
   * `kieferStellen` dreht). Zurück: ob sich die Zunge noch bewegt.
   */
  schritt(dt: number, links: number, rechts: number): boolean {
    const m = this.m;
    const aUnten = this.auf > 0 ? rechts : links;
    const aOben = this.auf > 0 ? links : rechts;
    const offen = Math.abs(links - rechts);
    this.platz = offen;
    const N = 4;
    const h = Math.min(dt, 1 / 30) / N;
    const OMEGA = 2 * Math.PI * 3.1;
    const DAEMPF = 2 * 0.2 * OMEGA;
    let weg = 0;
    for (let n = 0; n < N; n++) {
      for (let k = 0; k < K; k++) {
        const u = k / (K - 1);
        const [tx, ty] = this.drehen(this.ruhe[3 * k]!, this.ruhe[3 * k + 1]!, aUnten);
        // die Feder zum Platz auf dem Unterkiefer: hinten straff, vorn lose (die Spitze schwingt nach)
        const fed = OMEGA * OMEGA * (1.7 - 1.1 * u);
        const i = 3 * k;
        // hängt die Zunge über die Lippe hinaus, zieht sie ihr Gewicht nach unten
        const schwer = -m.lang * 6 * u;
        this.vel[i]! += (fed * (tx - this.pos[i]!) - DAEMPF * this.vel[i]!) * h;
        this.vel[i + 1]! += (fed * (ty - this.pos[i + 1]!) - DAEMPF * this.vel[i + 1]! + schwer) * h;
        this.vel[i + 2]! += (fed * (0 - this.pos[i + 2]!) - DAEMPF * this.vel[i + 2]!) * h;
      }
      const vor = this.pos.slice();
      for (let i = 0; i < 3 * K; i++) this.pos[i]! += this.vel[i]! * h;
      // Wurzel fest am Unterkiefer
      for (let k = 0; k < 2; k++) {
        const [tx, ty] = this.drehen(this.ruhe[3 * k]!, this.ruhe[3 * k + 1]!, aUnten);
        this.pos[3 * k] = tx;
        this.pos[3 * k + 1] = ty;
        this.pos[3 * k + 2] = 0;
      }
      if (this.gegriffen >= 0) {
        const g = 3 * this.gegriffen;
        this.pos[g] = this.ziel.x;
        this.pos[g + 1] = this.ziel.y;
        this.pos[g + 2] = this.ziel.z;
      }
      // Gummi: Die Kette hält ihre Länge weich (gedehnt zieht sie stärker zurück als gestaucht)
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k + 1 < K; k++) {
          const a = 3 * k;
          const b = a + 3;
          const dx = this.pos[b]! - this.pos[a]!;
          const dy = this.pos[b + 1]! - this.pos[a + 1]!;
          const dz = this.pos[b + 2]! - this.pos[a + 2]!;
          const l = Math.hypot(dx, dy, dz) || 1e-9;
          const f = ((l - this.lang0[k]!) / l) * (l > this.lang0[k]! ? 0.16 : 0.4);
          const wa = k < 2 || k === this.gegriffen ? 0 : 0.5;
          const wb = k + 1 < 2 || k + 1 === this.gegriffen ? 0 : 0.5;
          const sum = wa + wb || 1;
          this.pos[a]! += (dx * f * wa) / sum;
          this.pos[a + 1]! += (dy * f * wa) / sum;
          this.pos[a + 2]! += (dz * f * wa) / sum;
          this.pos[b]! -= (dx * f * wb) / sum;
          this.pos[b + 1]! -= (dy * f * wb) / sum;
          this.pos[b + 2]! -= (dz * f * wb) / sum;
        }
      }
      // Gaumen und Boden: nur wo das Maul ist und nur, wenn es offen ist
      if (offen > 0.02) {
        for (let k = 2; k < K; k++) {
          if (k === this.gegriffen) continue;
          const i = 3 * k;
          const d = this.dicke[k]! * this.dickeMass(k);
          for (const [a, sinn] of [
            [aUnten, 1],
            [aOben, -1],
          ] as const) {
            const [x, y] = this.drehen(this.pos[i]!, this.pos[i + 1]!, -a);
            const o = m.profil.naechster(x, y);
            if (o.hinten || o.s > m.sVorn * 1.02) continue;
            // Höhe über dem Boden (unter dem Gaumen), in der Ruhe des Kiefers
            const hoehe = sinn * this.auf * o.d;
            const fehlt = 0.8 * d - hoehe;
            if (fehlt <= 0) continue;
            const t = m.profil.tangente(o.s);
            const nx = -t.y * this.auf * sinn;
            const ny = t.x * this.auf * sinn;
            const [qx, qy] = this.drehen(x + nx * fehlt, y + ny * fehlt, a);
            this.pos[i] = qx;
            this.pos[i + 1] = qy;
          }
        }
      }
      for (let i = 0; i < 3 * K; i++) {
        this.vel[i] = (this.pos[i]! - vor[i]!) / h;
        weg = Math.max(weg, Math.abs(this.vel[i]!));
      }
    }
    this.bewegt = weg > m.lang * 0.004 || this.gegriffen >= 0;
    this.netz();
    return this.bewegt;
  }

  /** wie dick die Zunge an einem Knoten sein darf: Im fast geschlossenen Maul wird sie flach */
  private dickeMass(k: number): number {
    const r = Math.hypot(this.ruhe[3 * k]! - this.m.C.x, this.ruhe[3 * k + 1]! - this.m.C.y);
    const spalt = 2 * r * Math.sin(Math.min(Math.PI, this.platz) / 2);
    return Math.max(0.02, Math.min(1, spalt / (2.6 * this.dicke[k]! + 1e-9)));
  }

  private netz(): void {
    const P = this.punkte;
    const t = new Vector3();
    const B = new Vector3();
    const Nn = new Vector3();
    const z = new Vector3(0, 0, 1);
    for (let k = 0; k < K; k++) {
      const a = Math.max(0, k - 1);
      const b = Math.min(K - 1, k + 1);
      t.set(this.pos[3 * b]! - this.pos[3 * a]!, this.pos[3 * b + 1]! - this.pos[3 * a + 1]!, this.pos[3 * b + 2]! - this.pos[3 * a + 2]!).normalize();
      B.copy(z).addScaledVector(t, -z.dot(t));
      if (B.lengthSq() < 1e-6) B.set(0, 1, 0);
      B.normalize();
      Nn.crossVectors(t, B);
      // die Rille liegt oben: zur Seite des Gaumens (links der Laufrichtung, wenn der Oberkiefer links der Linie liegt)
      if ((-t.y * Nn.x + t.x * Nn.y) * this.auf < 0) Nn.negate();
      // gedehnt wird die Zunge dünner (der Rauminhalt bleibt)
      let dehn = 1;
      if (k > 0 && k < K - 1) {
        const l1 = Math.hypot(this.pos[3 * k]! - this.pos[3 * k - 3]!, this.pos[3 * k + 1]! - this.pos[3 * k - 2]!, this.pos[3 * k + 2]! - this.pos[3 * k - 1]!);
        const l2 = Math.hypot(this.pos[3 * k + 3]! - this.pos[3 * k]!, this.pos[3 * k + 4]! - this.pos[3 * k + 1]!, this.pos[3 * k + 5]! - this.pos[3 * k + 2]!);
        dehn = (l1 + l2) / (this.lang0[k - 1]! + this.lang0[k]!);
      }
      const q = 1 / Math.sqrt(Math.max(0.35, dehn));
      const w = this.breite[k]! * q;
      const d = this.dicke[k]! * q * this.dickeMass(k);
      for (let j = 0; j < M; j++) {
        const phi = (2 * Math.PI * j) / M;
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        // oben in der Mitte eine flache Rille
        const rille = s > 0 ? 1 - 0.3 * Math.exp(-(c * c) / 0.07) : 1;
        const i = 3 * (k * M + j);
        P[i] = this.pos[3 * k]! + B.x * c * w + Nn.x * s * d * rille;
        P[i + 1] = this.pos[3 * k + 1]! + B.y * c * w + Nn.y * s * d * rille;
        P[i + 2] = this.pos[3 * k + 2]! + B.z * c * w + Nn.z * s * d * rille;
      }
    }
    // die Spitze: ein Punkt ein Stück vor dem letzten Ring
    const e = 3 * (K - 1);
    t.set(this.pos[e]! - this.pos[e - 3]!, this.pos[e + 1]! - this.pos[e - 2]!, this.pos[e + 2]! - this.pos[e - 1]!).normalize();
    const v = 3 * K * M;
    const vor = 0.5 * this.dicke[K - 2]!;
    P[v] = this.pos[e]! + t.x * vor;
    P[v + 1] = this.pos[e + 1]! + t.y * vor;
    P[v + 2] = this.pos[e + 2]! + t.z * vor;
    (this.geo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }
}
