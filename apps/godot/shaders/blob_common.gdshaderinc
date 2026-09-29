// Shared body + look of the P1-G blobs. Mirrors the three.js SdfProgram idea:
// smooth-min union of a few spheres + noise, breathing, flat base (mound like
// pezenpez), volume-preserving squash. The look follows Florian's reference
// 03-pezenpez: diagonal mint->teal gradient, hard crescent highlight top-left,
// hard-edged translucent inner "organs", flat light bubbles, vesica eye slit,
// soft rim and NO outline.

const float BASE_Y = 0.95; // flat base of the unit blob (keep in sync with blob_lab.gd)

uniform vec3 u_col_light : source_color = vec3(0.65, 0.96, 0.90);
uniform vec3 u_col_base : source_color = vec3(0.486, 0.902, 0.835);
uniform vec3 u_col_deep : source_color = vec3(0.133, 0.729, 0.663);
uniform vec3 u_col_organ : source_color = vec3(0.184, 0.498, 0.478);
uniform vec3 u_col_eye : source_color = vec3(0.059, 0.110, 0.133);
uniform vec3 u_col_bubble : source_color = vec3(0.37, 0.84, 0.79);
uniform vec3 u_col_fire_a : source_color = vec3(0.784, 0.329, 0.165);
uniform vec3 u_col_fire_b : source_color = vec3(1.0, 0.83, 0.25);
uniform int u_material = 0; // 0 jelly, 1 liquid, 2 gas, 3 fire
uniform int u_sphere_count : hint_range(2, 8) = 5;
uniform float u_smin_k = 0.35;
uniform float u_noise_amp = 0.04;
uniform float u_noise_freq = 2.2;
uniform float u_breath = 1.5;

float hash13(vec3 p3) {
	p3 = fract(p3 * 0.1031);
	p3 += dot(p3, p3.zyx + 31.32);
	return fract((p3.x + p3.y) * p3.z);
}

vec3 hash31(float p) {
	vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.xxy + p3.yzz) * p3.zyx);
}

float vnoise(vec3 p) {
	vec3 i = floor(p);
	vec3 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float n000 = hash13(i);
	float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
	float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
	float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
	float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
	float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
	float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
	float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
	return mix(
		mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
		mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

float smin(float a, float b, float k) {
	float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
	return mix(b, a, h) - k * h * (1.0 - h);
}

// Sphere i of the body (centre.xyz, radius.w). 0/1 form the mound, the rest are seeded lobes.
vec4 body_sphere(int i, float seed, float t) {
	if (i == 0) {
		return vec4(0.0, 0.12, 0.0, 0.78);
	}
	if (i == 1) {
		return vec4(0.0, -0.32, 0.0, 0.86);
	}
	vec3 h = hash31(seed * 17.0 + float(i) * 3.1);
	vec3 c = (h - 0.5) * vec3(0.9, 0.7, 0.9) + vec3(0.0, -0.05, 0.0);
	c += 0.07 * sin(t * (0.5 + 0.35 * h.x) + float(i) * 1.7 + seed);
	float r = 0.30 + 0.28 * hash13(vec3(seed, float(i), 2.0));
	return vec4(c, r);
}

float body_sdf(vec3 p, float seed, float t, int count, float k) {
	vec4 s0 = body_sphere(0, seed, t);
	float d = length(p - s0.xyz) - s0.w;
	for (int i = 1; i < count; i++) {
		vec4 s = body_sphere(i, seed, t);
		d = smin(d, length(p - s.xyz) - s.w, k);
	}
	return d;
}

// Full field: smooth-min body, flat base, surface noise.
float body_field(vec3 p, float seed, float t, int count, float k, float amp, float freq) {
	float d = body_sdf(p, seed, t, count, k);
	d = max(d, -(p.y + BASE_Y));
	float n = vnoise(p * freq + vec3(0.0, t * 0.35, 0.0) + seed) - 0.5;
	return d - amp * 2.0 * n;
}

// Trace from the centre along direction d to the surface (6 steps), normal from a 4-tap gradient.
vec3 body_surface(vec3 d, float seed, float t, int count, float k, float amp, float freq, out vec3 n) {
	float r = 0.6;
	for (int i = 0; i < 6; i++) {
		r -= body_field(d * r, seed, t, count, k, amp, freq);
	}
	vec3 p = d * r;
	vec2 e = vec2(0.02, -0.02);
	n = normalize(
		e.xyy * body_field(p + e.xyy, seed, t, count, k, amp, freq) +
		e.yyx * body_field(p + e.yyx, seed, t, count, k, amp, freq) +
		e.yxy * body_field(p + e.yxy, seed, t, count, k, amp, freq) +
		e.xxx * body_field(p + e.xxx, seed, t, count, k, amp, freq));
	return p;
}

// Ray (o, rd) against an ellipsoid (centre c, radii rad): hard anti-aliased edge, fades with depth.
float ell_hit(vec3 o, vec3 rd, vec3 c, vec3 rad) {
	vec3 oo = (o - c) / rad;
	vec3 dd = normalize(rd / rad);
	float tca = max(-dot(oo, dd), 0.0);
	float dist = length(oo + dd * tca);
	float w = max(fwidth(dist), 0.01);
	return (1.0 - smoothstep(1.0 - w, 1.0 + w, dist)) * (0.55 + 0.45 * exp(-tca * 0.8));
}

// Flat disc "sticker" on the unit sphere around direction e with angular radius r.
float disc_on_sphere(vec3 d, vec3 e, float r) {
	float x = 1.0 - dot(d, e);
	float rr = 1.0 - cos(r);
	float w = max(fwidth(x), 0.0015);
	return 1.0 - smoothstep(rr - w, rr + w, x);
}

// The bad eye: a vertical vesica slit right of centre, with a rare blink.
vec3 blob_eye(vec3 col, vec3 d, float t, float seed) {
	vec3 e = normalize(vec3(0.40, 0.02, 0.92));
	float front = dot(d, e);
	if (front < 0.55) {
		return col;
	}
	vec3 ex = normalize(cross(vec3(0.0, 1.0, 0.0), e));
	vec3 ey = cross(e, ex);
	vec3 q = d / front - e;
	vec2 uv = vec2(dot(q, ex), dot(q, ey));
	float blink = 1.0 - 0.92 * smoothstep(0.965, 1.0, sin(t * 0.9 + seed * 5.0));
	uv.y /= max(blink, 0.08);
	float sd = max(length(uv - vec2(0.42, 0.0)) - 0.5, length(uv + vec2(0.42, 0.0)) - 0.5);
	float w = max(fwidth(sd), 0.003);
	float slit = 1.0 - smoothstep(-w, w, sd);
	float halo = 1.0 - smoothstep(0.0, 0.12, sd);
	col = mix(col, u_col_organ, halo * 0.3);
	return mix(col, u_col_eye, slit);
}

// p: position in unit-blob space, n_o: normal in unit-blob space, n_v/view_v: view space,
// cam_o: camera in unit-blob space, d: unit direction from the blob centre.
vec3 blob_shade(vec3 p, vec3 n_o, vec3 n_v, vec3 view_v, vec3 cam_o, vec3 d, float t, float seed) {
	float facing = clamp(dot(n_v, view_v), 0.0, 1.0);
	// diagonal gradient top-left light -> bottom-right deep (normal + position, like the vector art)
	vec3 L = normalize(vec3(-0.55, 0.7, 0.45));
	float g_n = clamp(dot(n_v, L) * 0.5 + 0.5, 0.0, 1.0);
	float g_p = clamp((-p.x * 0.5 + p.y * 0.6) * 0.5 + 0.5, 0.0, 1.0);
	float g = clamp(g_n * 0.55 + g_p * 0.45, 0.0, 1.0);
	vec3 col = mix(u_col_deep, u_col_base, smoothstep(0.15, 0.7, g));
	col = mix(col, u_col_light, smoothstep(0.7, 1.0, g));

	if (u_material == 3) {
		float fn = vnoise(p * 2.6 + vec3(0.0, -t * 1.6, 0.0) + seed);
		float fn2 = vnoise(p * 5.5 + vec3(0.0, -t * 2.4, 0.0));
		float heat = clamp(0.85 - (p.y + 0.9) * 0.45 + (fn - 0.5) * 0.7 + (fn2 - 0.5) * 0.3, 0.0, 1.0);
		vec3 c = mix(u_col_fire_a * 0.35, u_col_fire_a, smoothstep(0.1, 0.5, heat));
		c = mix(c, u_col_fire_b, smoothstep(0.55, 0.95, heat));
		c = mix(c, u_col_fire_b, pow(1.0 - facing, 2.0) * 0.3);
		return blob_eye(c, d, t, seed);
	}

	// translucent inner organs: hard-edged ellipsoids seen along the refracted view ray
	vec3 view_o = normalize(cam_o - p);
	vec3 rd = refract(-view_o, n_o, 0.78);
	if (dot(rd, rd) < 0.25) {
		rd = -view_o;
	}
	float o1 = ell_hit(p, rd, vec3(0.06, -0.42, 0.10), vec3(0.68, 0.30, 0.50));
	float o2 = ell_hit(p, rd, vec3(0.12, 0.18, 0.22), vec3(0.40, 0.28, 0.32));
	float o3 = ell_hit(p, rd, vec3(-0.22, 0.30, 0.30), vec3(0.24, 0.18, 0.22));
	col = mix(col, u_col_organ, o1 * 0.62);
	col = mix(col, u_col_organ, o2 * 0.55);
	col = mix(col, u_col_light, o3 * 0.35);

	// shade side wedge (bottom-right), view dependent
	float side = smoothstep(0.1, 0.9, dot(n_v, normalize(vec3(0.75, -0.35, 0.2))));
	col = mix(col, u_col_deep, side * 0.35);

	// flat light bubbles on the surface
	float bub = 0.0;
	for (int i = 0; i < 4; i++) {
		vec3 h = hash31(seed * 3.1 + float(i) * 7.7 + 5.0);
		vec3 e = normalize(vec3(h.x * 1.6 - 0.8, h.y * 1.0 - 0.75, 0.8));
		bub = max(bub, disc_on_sphere(d, e, 0.045 + 0.03 * h.z));
	}
	col = mix(col, u_col_bubble, bub);

	col = blob_eye(col, d, t, seed);

	// soft fresnel rim: edges come from value contrast, never from an outline
	float fres = pow(1.0 - facing, 3.0);
	col = mix(col, u_col_light, fres * 0.35);

	// one big hard-edged crescent highlight top-left + a small comma below it
	vec3 H1 = normalize(vec3(-0.55, 0.72, 0.42));
	vec3 H2 = normalize(vec3(-0.50, 0.68, 0.53));
	float a1 = dot(n_v, H1);
	float a2 = dot(n_v, H2);
	float w1 = max(fwidth(a1), 0.004);
	float w2 = max(fwidth(a2), 0.004);
	float thr = (u_material == 1) ? 0.88 : 0.84;
	float cres = smoothstep(thr - w1, thr + w1, a1) * (1.0 - smoothstep(0.866 - w2, 0.866 + w2, a2));
	vec3 H3 = normalize(vec3(-0.78, 0.30, 0.55));
	float a3 = dot(n_v, H3);
	float w3 = max(fwidth(a3), 0.004);
	float comma = smoothstep(0.988 - w3, 0.988 + w3, a3);
	col = mix(col, vec3(1.0), max(cres, comma) * 0.95);
	if (u_material == 1) {
		// liquid: extra glossy sparkle
		vec3 refl = reflect(-view_v, n_v);
		float spec = pow(max(dot(refl, normalize(vec3(-0.3, 0.9, 0.3))), 0.0), 60.0);
		col = mix(col, vec3(1.0), spec * 0.7);
	}
	return col;
}
