// P2-G dots: opaque hexagon billboards (MultiMesh, one draw call per tree type).
// Instance transform = tree frame at the crown centre (basis carries rotation + scale),
// INSTANCE_CUSTOM.xyz = offset from the crown centre on the hull (mesh units),
// INSTANCE_CUSTOM.w = crown height in mesh units (growth pivot). Tint by dot(N_hull, sun):
// lit side gets the two brightest steps, shade side is sparse and dark. Dots under
// u_min_px collapse in the vertex shader. Unshaded, no shadow sampling, no shadow casting.
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, world_vertex_coords, depth_draw_opaque;

#include "res://shaders/earle_common.gdshaderinc"

uniform vec3 u_sun_dir = vec3(0.0, 1.0, 0.0);
uniform float u_growth = 1.0;
uniform float u_size = 0.07;
uniform float u_min_px = 0.75;
uniform float u_viewport_h = 1600.0;
uniform vec3 u_lit_a : source_color = vec3(0.72, 1.0, 0.16);
uniform vec3 u_lit_b : source_color = vec3(0.85, 0.91, 0.48);
uniform vec3 u_shade : source_color = vec3(0.31, 0.36, 0.23);

varying vec3 v_col;
varying float v_dist;

float hash11(float p) {
	p = fract(p * 0.1031);
	p *= p + 33.33;
	p *= p + p;
	return fract(p);
}

void vertex() {
	float g = mix(0.3, 1.0, u_growth);
	float h = hash11(float(INSTANCE_ID) + 0.5);
	vec3 off = INSTANCE_CUSTOM.xyz;
	mat3 basis = mat3(MODEL_MATRIX);
	vec3 crown = MODEL_MATRIX[3].xyz + basis * vec3(0.0, INSTANCE_CUSTOM.w * (g - 1.0), 0.0);
	vec3 center = crown + basis * (off * g);
	vec3 n_hull = normalize(basis * off);
	float ndl = dot(n_hull, u_sun_dir);
	float lit = step(0.15, ndl);
	float keep = mix(step(h, 0.35), 1.0, lit);
	vec3 col = mix(u_shade, mix(u_lit_a, u_lit_b, step(0.5, h)), lit);
	float s = u_size * (0.7 + 0.6 * hash11(h * 91.7)) * g * keep;
	vec3 right = INV_VIEW_MATRIX[0].xyz;
	vec3 up = INV_VIEW_MATRIX[1].xyz;
	vec4 clip = PROJECTION_MATRIX * (VIEW_MATRIX * vec4(center, 1.0));
	float px = s * abs(PROJECTION_MATRIX[1][1]) / max(clip.w, 0.01) * 0.5 * u_viewport_h;
	if (px < u_min_px) {
		s = 0.0;
	}
	VERTEX = center + right * (UV.x * s) + up * (UV.y * s);
	NORMAL = normalize(CAMERA_POSITION_WORLD - center);
	v_col = col;
	v_dist = length((VIEW_MATRIX * vec4(center, 1.0)).xyz);
}

void fragment() {
	ALBEDO = apply_fog(v_col, v_dist);
}
