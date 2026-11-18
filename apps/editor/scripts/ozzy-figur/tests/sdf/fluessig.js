// Distanzfeld-Renderer für Ozzy (Test 4): jedes Teil eigenes Abstandsfeld mit Vorzeichen (bis 20 Kanäle),
// Gruppen werden im Bildpass vereinigt: Schwarz weich (smin), Weiß in seinem Träger mit Mindestrand, Ohrspalt verjüngt
// Gruppen: 0 Bohne, 1 Beine nah, 2 Beine fern (+Keile), 3 Kopfmasken, 4 OhrA, 5 OhrB, 6 Schwanz, 8 Weiß Gesicht, 9 Weiß Beine, 10 Weiß Schwanz, 11 Nase
window.Fluessig = function (canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, stencil: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('kein WebGL2');
  const halbFloat = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
  const R = halbFloat ? 64 : 24; // Bandbreite in Bildpunkten
  const NT = 5; // Texturen à 4 Kanäle
  function sh(typ, src) { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + src); return s; }
  function prog(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  const KOPF = '#version 300 es\nprecision highp float;\nprecision highp int;\n';
  const OUT = [0, 1, 2, 3, 4].map(i => `layout(location=${i}) out vec4 o${i};`).join('\n') + '\n';
  const SETZE = `void setze(int ch, float wert, float sonst){ vec4 s = vec4(sonst); o0 = s; o1 = s; o2 = s; o3 = s; o4 = s;
    int i = ch / 4, c = ch - i * 4; vec4 v = vec4(c == 0 ? wert : sonst, c == 1 ? wert : sonst, c == 2 ? wert : sonst, c == 3 ? wert : sonst);
    if (i == 0) o0 = v; else if (i == 1) o1 = v; else if (i == 2) o2 = v; else if (i == 3) o3 = v; else o4 = v; }\n`;
  const pFan = prog(KOPF + 'in vec2 a; uniform vec2 gr; void main(){ gl_Position = vec4(a / gr * 2.0 - 1.0, 0.0, 1.0); }',
    KOPF + OUT + 'void main(){ vec4 z = vec4(0); o0 = z; o1 = z; o2 = z; o3 = z; o4 = z; }');
  const pKippe = prog(KOPF + 'in vec2 a; uniform vec4 kasten; uniform vec2 gr; void main(){ vec2 p = mix(kasten.xy, kasten.zw, a * 0.5 + 0.5); gl_Position = vec4(p / gr * 2.0 - 1.0, 0.0, 1.0); }',
    KOPF + OUT + SETZE + 'uniform int ch; void main(){ setze(ch, 1.0, 0.0); }');
  const pStrecke = prog(KOPF + `in vec2 ecke; in vec2 pa; in vec2 pb; in float kanal; uniform vec2 gr; uniform float R;
    out vec2 va; out vec2 vb; flat out int vk;
    void main(){ vec2 d = pb - pa; float l = length(d); vec2 t = l > 1e-6 ? d / l : vec2(1, 0); vec2 n = vec2(-t.y, t.x);
      vec2 p = (ecke.x < 0.0 ? pa - t * R : pb + t * R) + n * R * ecke.y; va = pa; vb = pb; vk = int(kanal + 0.5);
      gl_Position = vec4(p / gr * 2.0 - 1.0, 0.0, 1.0); }`,
    KOPF + OUT + SETZE + `in vec2 va; in vec2 vb; flat in int vk; uniform float R;
    void main(){ vec2 p = gl_FragCoord.xy; vec2 ab = vb - va; float h = clamp(dot(p - va, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
      float d = min(length(p - va - ab * h) / R, 1.0); setze(vk, 0.5 + 0.5 * d, 1.0); }`);
  const pBild = prog(KOPF + 'in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }',
    KOPF + `uniform sampler2D t0, t1, t2, t3, t4; uniform float R; uniform int gruppe[20]; uniform int anzahl;
    uniform float kBein, kKopf, kOhr, kSchwanz, rand, kKlemm, spaltB, spaltL, nahA, mitSpalt, nurSchwarz, fernRand; uniform vec2 kopfMitte; uniform vec2 fernRichtung; uniform float kopfRadius;
    out vec4 farbe;
    float smin(float a, float b, float k){ if (k < 1e-4) return min(a, b); float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
    float smax(float a, float b, float k){ return -smin(-a, -b, k); }
    float dick(float d){ return clamp(0.5 - d, 0.0, 1.0); }
    void main(){ ivec2 p = ivec2(gl_FragCoord.xy);
      vec4 T[5]; T[0] = texelFetch(t0, p, 0); T[1] = texelFetch(t1, p, 0); T[2] = texelFetch(t2, p, 0); T[3] = texelFetch(t3, p, 0); T[4] = texelFetch(t4, p, 0);
      float g[12]; for (int i = 0; i < 12; i++) g[i] = 1e5;
      for (int c = 0; c < 20; c++) { if (c >= anzahl) break; vec4 v = T[c / 4]; int k = c - (c / 4) * 4; float e = k == 0 ? v.x : k == 1 ? v.y : k == 2 ? v.z : v.w;
        float d = (e - 0.5) * 2.0 * R; int gi = gruppe[c]; g[gi] = min(g[gi], d); }
      float beine = min(g[1], g[2]);
      float schwarz = smin(g[0], beine, kBein);
      schwarz = smin(schwarz, g[6], kSchwanz);
      float kopf = smin(g[3], min(g[4], g[5]), kOhr);
      schwarz = smin(schwarz, kopf, kKopf);
      // Abstand zum äußeren Umriss: Kanal 'sil' (nur Außenkanten), Vorzeichen aus der Vereinigung
      float aussen = g[7]; bool drin = min(schwarz, 0.0) < 0.0;
      float sil = drin ? -abs(aussen) : abs(aussen);
      // Verdecken auf der abgewandten Seite: Rand wächst, je weiter der Punkt zur fernen Seite des Kopfs liegt
      vec2 q = (vec2(p) - kopfMitte) / kopfRadius;
      float fern = clamp(dot(q, fernRichtung), 0.0, 1.0);
      float r = rand + fernRand * smoothstep(0.15, 0.85, fern);
      // Klemme nur, wo ein Rand verlangt ist (abgewandte Seite); an den gezeichneten Posen bleibt Weiß genau wie gezeichnet
      float wG = r > 0.05 ? smax(g[8], sil + r, min(kKlemm, r)) : g[8];
      float wB = rand > 0.05 ? smax(g[9], sil + rand, min(kKlemm, rand)) : g[9];
      float wS = rand > 0.05 ? smax(g[10], sil + rand, min(kKlemm, rand)) : g[10];
      float weiss = min(wG, min(wB, wS));
      vec3 c = vec3(1.0);
      c = mix(c, vec3(0.0), dick(schwarz));
      if (nurSchwarz < 0.5) {
        c = mix(c, vec3(1.0), dick(weiss));
        if (mitSpalt > 0.5) {
          float nah = nahA > 0.5 ? g[4] : g[5], fe = nahA > 0.5 ? g[5] : g[4];
          float w = spaltB * smoothstep(0.0, spaltL, -fe);
          float band = clamp(dick(nah - w) - dick(nah), 0.0, 1.0);
          c = mix(c, vec3(1.0), band);
        }
        c = mix(c, vec3(0.0), dick(g[11]));
      }
      farbe = vec4(c, 1.0); }`);

  function tex(intern) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texStorage2D(gl.TEXTURE_2D, 1, intern, W, H); return t; }
  let W = 0, H = 0, fb, texe = [];
  function groesse(w, h) {
    W = w; H = h; canvas.width = w; canvas.height = h;
    texe = Array.from({ length: NT }, () => tex(halbFloat ? gl.RGBA16F : gl.RGBA8));
    const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, W, H);
    fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    texe.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer ' + st);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  const vao = gl.createVertexArray();
  const bufFan = gl.createBuffer(), bufQuad = gl.createBuffer(), bufStr = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  function abflachen(A, abb) {
    const pts = []; const n = A.length;
    for (let k = 0; k < n; k++) {
      const a = A[k], b = A[(k + 1) % n];
      const P0 = abb(a.p), P1 = abb(a.o), P2 = abb(b.i), P3 = abb(b.p);
      const len = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) + Math.hypot(P2[0] - P1[0], P2[1] - P1[1]) + Math.hypot(P3[0] - P2[0], P3[1] - P2[1]);
      const chord = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
      const m = len - chord < 0.05 ? 1 : Math.max(2, Math.min(64, Math.ceil(Math.sqrt(len) * 1.5)));
      for (let j = 0; j < m; j++) { const t = j / m, u = 1 - t; pts.push(u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]); }
    }
    return pts;
  }
  let letzteStrecken = 0;
  const attr = (p, name, buf, n, stride, off, div) => { const l = gl.getAttribLocation(p, name); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, stride, off); gl.vertexAttribDivisor(l, div); return l; };
  function zeichne(teile, ansicht, par) {
    const { s, x0, y0 } = ansicht;
    const abb = (q) => [(q[0] - x0) * s, H - (q[1] - y0) * s];
    const SCHWARZ = new Set([0, 1, 2, 3, 4, 5, 6]);
    const polys = teile.map((t, i) => { const pts = abflachen(t.f, abb); let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let j = 0; j < pts.length; j += 2) { a = Math.min(a, pts[j]); b = Math.min(b, pts[j + 1]); c = Math.max(c, pts[j]); d = Math.max(d, pts[j + 1]); } return { ch: i, g: t.k, pts, kasten: [a - 1, b - 1, c + 1, d + 1] }; });
    gl.bindVertexArray(vao); gl.viewport(0, 0, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.drawBuffers(texe.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    // 1) unsigned Abstand je Teil-Kanal (MIN)
    const str = []; for (const p of polys) { const v = p.pts, n = v.length / 2; for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; str.push(v[2 * j], v[2 * j + 1], v[2 * j2], v[2 * j2 + 1], p.ch); } }
    // Außenkanten der schwarzen Vereinigung (für Weiß-Klemme), Kanal 19
    const schwarzPolys = polys.filter(p => SCHWARZ.has(p.g));
    const innen = (v, x, y) => { let w = 0; const n = v.length / 2; for (let i = 0, j = n - 1; i < n; j = i++) { const ax = v[2 * j], ay = v[2 * j + 1], bx = v[2 * i], by = v[2 * i + 1]; if (ay <= y) { if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) w++; } else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) w--; } return w !== 0; };
    if (!window.OHNE_UMRISS) for (const p of schwarzPolys) { const v = p.pts, n = v.length / 2; for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; const ax = v[2 * j], ay = v[2 * j + 1], bx = v[2 * j2], by = v[2 * j2 + 1]; const mx = (ax + bx) / 2, my = (ay + by) / 2; const l = Math.hypot(bx - ax, by - ay) || 1; const e = 2.0; let ox = mx + (by - ay) / l * e, oy = my - (bx - ax) / l * e; if (innen(v, ox, oy)) { ox = mx - (by - ay) / l * e; oy = my + (bx - ax) / l * e; }
      if (!schwarzPolys.some(q => q !== p && (innen(q.pts, mx, my) || innen(q.pts, ox, oy)))) str.push(ax, ay, bx, by, 19); } }
    letzteStrecken = str.length / 5;
    gl.useProgram(pStrecke); gl.uniform2f(gl.getUniformLocation(pStrecke, 'gr'), W, H); gl.uniform1f(gl.getUniformLocation(pStrecke, 'R'), R);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufStr); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(str), gl.STREAM_DRAW);
    const ls = [attr(pStrecke, 'ecke', bufQuad, 2, 0, 0, 0), attr(pStrecke, 'pa', bufStr, 2, 20, 0, 1), attr(pStrecke, 'pb', bufStr, 2, 20, 8, 1), attr(pStrecke, 'kanal', bufStr, 1, 20, 16, 1)];
    gl.enable(gl.BLEND); gl.blendEquation(gl.MIN); gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, letzteStrecken);
    for (const l of ls) gl.vertexAttribDivisor(l, 0);
    // 2) Vorzeichen: innen e → 1 − e (Schablone je Teil)
    gl.enable(gl.STENCIL_TEST);
    for (const p of polys) {
      gl.clear(gl.STENCIL_BUFFER_BIT);
      const v = p.pts, arr = []; for (let j = 2; j + 3 < v.length; j += 2) arr.push(v[0], v[1], v[j], v[j + 1], v[j + 2], v[j + 3]);
      gl.useProgram(pFan); gl.uniform2f(gl.getUniformLocation(pFan, 'gr'), W, H);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufFan); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STREAM_DRAW);
      attr(pFan, 'a', bufFan, 2, 0, 0, 0);
      gl.disable(gl.BLEND); gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff); gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP); gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
      gl.drawArrays(gl.TRIANGLES, 0, arr.length / 2);
      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.NOTEQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR);
      gl.useProgram(pKippe); gl.uniform1i(gl.getUniformLocation(pKippe, 'ch'), p.ch); gl.uniform4fv(gl.getUniformLocation(pKippe, 'kasten'), p.kasten); gl.uniform2f(gl.getUniformLocation(pKippe, 'gr'), W, H);
      attr(pKippe, 'a', bufQuad, 2, 0, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disable(gl.STENCIL_TEST); gl.disable(gl.BLEND);
    // 3) Bild
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(pBild);
    texe.forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(pBild, 't' + i), i); });
    gl.uniform1f(gl.getUniformLocation(pBild, 'R'), R);
    const gr = new Int32Array(20).fill(7); polys.forEach(p => { gr[p.ch] = p.g; }); gr[19] = 7; gl.uniform1iv(gl.getUniformLocation(pBild, 'gruppe'), gr); gl.uniform1i(gl.getUniformLocation(pBild, 'anzahl'), 20);
    const km = par.kopfMitte ? abb(par.kopfMitte) : [0, 0]; gl.uniform2f(gl.getUniformLocation(pBild, 'kopfMitte'), km[0], km[1]);
    const fr = par.fernRichtung ?? [1, 0]; gl.uniform2f(gl.getUniformLocation(pBild, 'fernRichtung'), fr[0], -fr[1]);
    gl.uniform1f(gl.getUniformLocation(pBild, 'kopfRadius'), (par.kopfRadius ?? 140) * s);
    for (const [n, v] of Object.entries(par)) { if (typeof v !== 'number') continue; const l = gl.getUniformLocation(pBild, n); if (l) gl.uniform1f(l, v); }
    attr(pBild, 'a', bufQuad, 2, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function warte() { const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  return { groesse, zeichne, warte, info: () => ({ halbFloat, R, strecken: letzteStrecken, renderer: gl.getParameter(gl.RENDERER), maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS) }) };
};
