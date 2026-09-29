import { SRGBColorSpace, Sprite, SpriteNodeMaterial, TextureLoader } from 'three/webgpu';
import type { Texture } from 'three/webgpu';
import { float, pow, smoothstep, texture, uniform, uv, vec3 } from 'three/tsl';
import { hexToLinear } from '@ee/render';

/** Baked background of the logo PNG (opaque #17131b) — keyed out in the shader. */
const LOGO_BACKGROUND = '#17131b';

/**
 * REX placeholder: the illudiy logo as a bobbing billboard peeking in at the map edge (the scene anchors it
 * in camera space so it sits at the same screen corner on every aspect ratio). The real REX (rigged
 * Blender asset) replaces this in P4/P6; the placement and the bob stay.
 */
export class Rex {
  readonly sprite: Sprite;
  private texture: Texture | null = null;
  private targetOpacity = 1;
  /** Vertical bob offset of the current frame (world units), added by the scene to the anchor. */
  bob = 0;
  readonly material: SpriteNodeMaterial;
  private readonly opacity = uniform(0);

  constructor(url: string, size = 3.2) {
    this.material = new SpriteNodeMaterial({ transparent: true, depthWrite: false, depthTest: false });
    this.sprite = new Sprite(this.material);
    this.sprite.name = 'rex';
    // 1512 × 1674 px logo → keep the aspect
    this.sprite.scale.set(size, size * (1674 / 1512), 1);
    this.sprite.renderOrder = 20;
    new TextureLoader().load(url, (tex) => {
      tex.colorSpace = SRGBColorSpace;
      this.texture = tex;
      const sample = texture(tex, uv());
      // Compare in (approximate) sRGB so the dark navy of the dino stays far from the background.
      const srgb = pow(sample.rgb.max(0), vec3(1 / 2.2));
      const [br, bgG, bb] = hexToLinear(LOGO_BACKGROUND);
      const bg = pow(vec3(br, bgG, bb), vec3(1 / 2.2));
      const key = smoothstep(float(0.05), float(0.12), srgb.sub(bg).length());
      this.material.colorNode = sample.rgb;
      this.material.opacityNode = key.mul(this.opacity);
      this.material.needsUpdate = true;
    });
  }

  /** 1 = on the map, 0 = hidden (faded during the level). */
  setVisible(visible: boolean): void {
    this.targetOpacity = visible ? 1 : 0;
  }

  update(dt: number, elapsed: number): void {
    // Bob and a slight sway; opacity eases toward its target (no cuts).
    this.bob = 0.18 * Math.sin(elapsed * 1.9) + 0.05 * Math.sin(elapsed * 5.3);
    const o = this.opacity.value;
    const k = 1 - Math.exp(-dt * 6);
    const next = o + (this.targetOpacity - o) * k;
    this.opacity.value = Math.abs(next - this.targetOpacity) < 0.002 ? this.targetOpacity : next;
    this.sprite.visible = this.opacity.value > 0.002 && this.texture !== null;
  }

  dispose(): void {
    this.texture?.dispose();
    this.material.dispose();
    this.sprite.removeFromParent();
  }
}
