/**
 * Custom creatures (Blender round trip, `content/genome/custom/*.json`): schema, roles/names of the
 * spheres, builder (→ CreatureSpec) and the inverse (CreatureSpec → custom JSON). See docs/BLENDER.md.
 */
export * from './schema';
export * from './roles';
export * from './build';
export * from './fromSpec';
