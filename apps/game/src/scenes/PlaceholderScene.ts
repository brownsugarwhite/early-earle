import { Scene, PerspectiveCamera, Mesh, IcosahedronGeometry, Color } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { normalWorld, mix, color, float } from 'three/tsl';
import type { SceneController, SceneContext } from '../canvas/SceneController';

/** Beweist nur, dass Renderer, TSL und der Frame-Loop laufen. Wird von den Prototypen ersetzt. */
export class PlaceholderScene implements SceneController {
  private scene = new Scene();
  private camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private mesh: Mesh | null = null;

  constructor(private tint = '#22baa9') {}

  mount(ctx: SceneContext) {
    this.scene.background = new Color('#0f1c22');
    const mat = new MeshBasicNodeMaterial();
    // Gebänderte Schattierung aus der Weltnormale: kein Licht, keine Kontur, nur Wertstufen.
    const up = normalWorld.y.mul(0.5).add(0.5);
    const band = up.mul(3).floor().div(3);
    mat.colorNode = mix(color('#0f3f65'), color(this.tint), band.add(float(0.15)));
    this.mesh = new Mesh(new IcosahedronGeometry(1, 1), mat);
    this.scene.add(this.mesh);
    this.camera.position.set(0, 0.6, 3.2);
    this.camera.lookAt(0, 0, 0);
    this.resize(ctx);
  }

  resize(ctx: SceneContext) {
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext) {
    if (this.mesh) this.mesh.rotation.y += dt * 0.6;
    ctx.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.mesh?.geometry.dispose();
    (this.mesh?.material as { dispose?: () => void } | undefined)?.dispose?.();
    this.scene.clear();
  }
}
