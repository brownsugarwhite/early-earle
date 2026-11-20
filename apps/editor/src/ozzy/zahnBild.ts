// Ozzy, die Farbe der Zähne (Plan „Maul, Zähne, Zunge“, Etappe 5, vierte Scheibe, 20.11.2026).
//
// Auf den festen Materialien (Wachs, Solid, Zebra) stehen die Zähne nicht im Netz des Körpers: Sie werden danach als eigenes Netz in
// dasselbe Ziel gezeichnet (mit dessen Tiefe: Die Form verdeckt sie, wo sie davorliegt), mit dem Kugelbild des Wachses ohne seine
// Farbe (nur Hell, Dunkel und Glanz) mal ihrer eigenen Farbe. So tragen sie nicht mehr die Farbe der Form.
// Die Seifenhaut und die Materialien auf eigener Fläche (Jelly, helles Solid, Grün) zeigen die Zähne weiter als Teil des Körpers.
import { BufferAttribute, BufferGeometry, type Camera, Color, type DataTexture, DoubleSide, Mesh, MeshMatcapMaterial, Plane, Scene, Vector3, type WebGLRenderer } from 'three';
import type { HautNetz } from '../anfang/haut';

/** die Farbe der Zähne, solange das Maul keine eigene trägt: Elfenbein (wie in der Studie) */
export const ZAHN_FARBE = '#f3e8cc';

export class ZahnBild {
  private readonly szene = new Scene();
  private readonly material: MeshMatcapMaterial;
  private readonly ebene = new Plane(new Vector3(0, 0, 1), 1e9);
  private geo: BufferGeometry | null = null;
  private netz: Mesh | null = null;
  private gezeigt: HautNetz | null = null;

  constructor(kugelbild: DataTexture) {
    this.material = new MeshMatcapMaterial({ matcap: kugelbild, color: new Color(ZAHN_FARBE), side: DoubleSide });
    this.material.clippingPlanes = [this.ebene];
  }

  /**
   * Das Netz der Zähne übernehmen (Lagen im Raum, wie die Haut). Ein neues Netz mit gleich vielen Punkten und Dreiecken füllt die
   * vorhandenen Puffer; nur wenn sich die Zahl ändert, werden sie neu angelegt (und die alten freigegeben).
   */
  setzen(n: HautNetz | null): void {
    if (n === this.gezeigt) return;
    this.gezeigt = n;
    if (!n) {
      if (this.netz) this.netz.visible = false;
      return;
    }
    const lage = this.geo?.getAttribute('position') as BufferAttribute | undefined;
    const index = this.geo?.getIndex();
    if (this.geo && lage && index && lage.array.length === n.pos.length && index.array.length === n.index.length) {
      (lage.array as Float32Array).set(n.pos);
      lage.needsUpdate = true;
      const normale = this.geo.getAttribute('normal') as BufferAttribute;
      (normale.array as Float32Array).set(n.normal);
      normale.needsUpdate = true;
      (index.array as Uint32Array).set(n.index);
      index.needsUpdate = true;
    } else {
      this.geo?.dispose();
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(Float32Array.from(n.pos), 3));
      g.setAttribute('normal', new BufferAttribute(Float32Array.from(n.normal), 3));
      g.setIndex(new BufferAttribute(Uint32Array.from(n.index), 1));
      this.geo = g;
      if (this.netz) this.netz.geometry = g;
      else {
        this.netz = new Mesh(g, this.material);
        // (die Zähne wandern mit der Haut; ihr Kasten wird nicht nachgeführt)
        this.netz.frustumCulled = false;
        this.szene.add(this.netz);
      }
    }
    if (this.netz) this.netz.visible = true;
  }

  /**
   * Die Zähne in das Ziel zeichnen, das gerade gilt (nach dem Körper, ohne es zu leeren). `schnitt`: das Blatt, das sich beim
   * Einrasten durch die Form schiebt (Welt: n · p ≥ w bleibt), wie bei den festen Materialien.
   */
  zeichnen(r: WebGLRenderer, kamera: Camera, farbe: string, schnitt: readonly [number, number, number, number] | null): void {
    if (!this.netz?.visible) return;
    this.material.color.set(farbe);
    if (schnitt && Math.hypot(schnitt[0], schnitt[1], schnitt[2]) > 1e-9) this.ebene.set(new Vector3(schnitt[0], schnitt[1], schnitt[2]), -schnitt[3]);
    else this.ebene.set(new Vector3(0, 0, 1), 1e9);
    r.render(this.szene, kamera);
  }
}
