import { minifySync, type Plugin } from 'vite';
import { bootInline } from '../src/boot/bootInline.ts';
import { bootData, splashCss, splashMarkup } from '../src/splash/markup.ts';

/**
 * Loader ohne Wartezeit: setzt das Loader-Markup (#ee-splash, außerhalb von #root), sein kritisches CSS und das
 * Inline-Boot-Skript direkt in index.html. Das erste Bild (Stamm-Streifen, "0%", Schatten) steht damit, bevor das
 * Bündel geladen ist, und der Stamm wächst per CSS-Übergang weiter, auch während der Hauptthread blockiert.
 * Das Skript ist `bootInline` aus src/boot/bootInline.ts als Quelltext (in sich geschlossen), minifiziert.
 */
export function bootSplash(): Plugin {
  let script = '';
  const build = (): string => {
    const src = `(${bootInline.toString()})(${JSON.stringify(bootData())});`;
    try {
      const out = minifySync('ee-boot.js', src, { compress: true, mangle: true });
      return out.code || src;
    } catch {
      return src;
    }
  };
  return {
    name: 'ee-boot-splash',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        script ||= build();
        if (html.includes('id="ee-splash"')) return html;
        const head = `<style id="ee-splash-css">${splashCss()}</style>`;
        const body = `${splashMarkup()}<script>${script}</script>`;
        return html.replace('</head>', `${head}</head>`).replace(/<body([^>]*)>/, `<body$1>${body}`);
      },
    },
  };
}
