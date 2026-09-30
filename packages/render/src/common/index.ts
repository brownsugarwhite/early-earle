/** Gemeinsame Render-Bausteine (TSL-Helfer, Farb-Cache). Wird von blob/ und earle/ genutzt. */
export const RENDER_COMMON = true;
export * from './tsl';
// Side effect: per-pipeline TSL function code (see the file) — must run before the first pipeline builds.
export { installTslFunctionCacheFix } from './tslFunctionCache';
