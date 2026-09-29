import { DoubleSide } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Fn, attribute, cameraPosition, dot, float, max, mix, normalize, normalWorld, positionWorld, pow, smoothstep, vec3 } from 'three/tsl';
import type { BlobShadingUniforms } from '../blob/blobShading';
import type { Vec3Node, Vec4Node } from '../common/tsl';

/** Per-instance vec3 tint (linear RGB). */
export const PART_TINT_ATTR = 'partTint';
/** Per-instance vec4: x = gloss dot strength, y = flat ink (0..1), z = rim strength, w = spare. */
export const PART_ANIM_ATTR = 'partAnim';

/**
 * One material for every accessory pool: flat, banded wrap-diffuse like the blob bodies (value steps,
 * no outlines), a Fresnel rim that bleeds the tint lighter, one crisp highlight dot on glossy parts
 * (eyes). Double-sided because mirror pairs use reflected instance matrices; the normal is flipped by
 * the view direction rather than by winding so reflected instances light correctly.
 */
export function createPartMaterial(uniforms: BlobShadingUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.colorNode = Fn(() => {
    const tint = attribute(PART_TINT_ATTR, 'vec3') as Vec3Node;
    const anim = attribute(PART_ANIM_ATTR, 'vec4') as Vec4Node;
    const V = normalize(cameraPosition.sub(positionWorld));
    const n0 = normalize(normalWorld);
    const n = dot(n0, V).lessThan(0).select(n0.negate(), n0);
    const L = uniforms.lightDir;
    const wrap = dot(n, L).mul(0.5).add(0.5);
    const lit = smoothstep(0.35, 0.9, wrap).mul(0.72).add(smoothstep(0.58, 0.66, wrap).mul(0.28));
    const shadow = tint.mul(vec3(0.5, 0.56, 0.62));
    const banded = mix(shadow, tint, lit);
    // Ink parts stay almost flat (a faint shade keeps them readable against ink backgrounds).
    const flat = mix(tint.mul(0.82), tint, lit);
    const col = mix(banded, flat, anim.y).toVar();
    const fres = pow(float(1).sub(max(dot(n, V), 0)), 2.5);
    const rimCol = tint.mul(1.35).add(0.05);
    col.assign(mix(col, rimCol, fres.mul(anim.z).mul(float(1).sub(anim.y.mul(0.75)))));
    const H = normalize(L.add(V));
    const hi = smoothstep(0.972, 0.984, max(dot(n, H), 0)).mul(anim.x);
    col.assign(mix(col, vec3(1, 1, 1), hi));
    return col;
  })();
  material.side = DoubleSide;
  material.transparent = false;
  material.depthWrite = true;
  material.name = 'ee-creature-part';
  return material;
}
