/**
 * SVG-Filter für Liquid Glass: Der Hintergrund hinter Panels und Menüs wird weich verflüssigt und
 * leicht verzerrt (Chromium unterstützt url() in backdrop-filter). Ohne Kontur, nur Glanz und Brechung.
 */
export function Glasfilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="glas-fluessig" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves={2} seed={7} result="rauschen" />
        <feGaussianBlur in="rauschen" stdDeviation={3} result="weich" />
        <feDisplacementMap in="SourceGraphic" in2="weich" scale={38} xChannelSelector="R" yChannelSelector="G" result="verzerrt" />
        <feGaussianBlur in="verzerrt" stdDeviation={9} />
      </filter>
    </svg>
  );
}
