// P1-G merge: box-raymarched smooth-min of two blob bodies for ~300 ms.
// The box (local space of blob A, unit-blob units) is placed over both blobs;
// u_t runs 0..1 while B's centre travels to A and the blend radius follows a viscosity curve.
shader_type spatial;
render_mode unshaded, cull_back, depth_draw_opaque;

#include "res://shaders/blob_common.gdshaderinc"

uniform float u_t = 0.0;
uniform vec3 u_b_offset = vec3(2.4, 0.0, 0.0);
uniform float u_seed_a = 1.0;
uniform float u_seed_b = 2.0;

varying vec3 v_pos_o;
varying vec3 v_cam_o;

void vertex() {
	v_pos_o = VERTEX;
	v_cam_o = (inverse(MODEL_MATRIX) * vec4(CAMERA_POSITION_WORLD, 1.0)).xyz;
}

float merge_field(vec3 p) {
	float visc = smoothstep(0.0, 1.0, u_t);
	vec3 b = u_b_offset * (1.0 - visc);
	float k = mix(u_smin_k, 0.9, sin(u_t * 3.14159));
	float da = body_field(p, u_seed_a, TIME, u_sphere_count, u_smin_k, u_noise_amp, u_noise_freq);
	float db = body_field(p - b, u_seed_b, TIME, u_sphere_count, u_smin_k, u_noise_amp, u_noise_freq);
	float d = smin(da, db, k);
	// drops that fly out and get re-absorbed
	float fly = sin(u_t * 3.14159);
	for (int i = 0; i < 4; i++) {
		vec3 h = hash31(float(i) * 3.7 + 11.0);
		vec3 c = b * 0.5 + (h - 0.5) * 2.4 * fly + vec3(0.0, 1.1 * fly, 0.0);
		d = smin(d, length(p - c) - 0.16 * fly, 0.25);
	}
	return d;
}

void fragment() {
	vec3 ro = v_cam_o;
	vec3 rd = normalize(v_pos_o - ro);
	float tt = 0.0;
	vec3 p = v_pos_o;
	bool hit = false;
	for (int i = 0; i < 48; i++) {
		float dist = merge_field(p);
		if (dist < 0.004) {
			hit = true;
			break;
		}
		tt += dist * 0.9;
		p = v_pos_o + rd * tt;
		if (tt > 9.0) {
			break;
		}
	}
	if (!hit) {
		discard;
	}
	vec2 e = vec2(0.012, -0.012);
	vec3 n = normalize(
		e.xyy * merge_field(p + e.xyy) + e.yyx * merge_field(p + e.yyx) +
		e.yxy * merge_field(p + e.yxy) + e.xxx * merge_field(p + e.xxx));
	vec3 n_v = normalize((VIEW_MATRIX * (MODEL_MATRIX * vec4(n, 0.0))).xyz);
	vec3 pos_v = (VIEW_MATRIX * (MODEL_MATRIX * vec4(p, 1.0))).xyz;
	vec3 view_v = normalize(-pos_v);
	ALBEDO = blob_shade(p, n, n_v, view_v, ro, normalize(p), TIME, u_seed_a);
}
