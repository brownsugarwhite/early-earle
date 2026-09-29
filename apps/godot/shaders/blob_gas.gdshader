// P1-G gas variant: same body, translucent with a fresnel-driven alpha and drifting density.
shader_type spatial;
render_mode unshaded, cull_back, depth_draw_always, blend_mix;

#include "res://shaders/blob_common.gdshaderinc"

varying vec3 v_pos_o;
varying vec3 v_nrm_o;
varying vec3 v_dir;
varying vec3 v_cam_o;
varying vec4 v_custom;

void vertex() {
	vec4 cd = INSTANCE_CUSTOM;
	v_custom = cd;
	float t = TIME + cd.z;
	vec3 d = normalize(VERTEX);
	vec3 n;
	vec3 p = body_surface(d, cd.x, t, u_sphere_count, u_smin_k, u_noise_amp, u_noise_freq, n);
	float breath = 1.0 + 0.05 * sin(t * u_breath);
	p = vec3(p.x * breath, (p.y + BASE_Y) * breath - BASE_Y, p.z * breath);
	float s = max(cd.y, 0.2);
	float sxz = 1.0 / sqrt(s);
	p = vec3(p.x * sxz, (p.y + BASE_Y) * s - BASE_Y, p.z * sxz);
	n = normalize(vec3(n.x / sxz, n.y / s, n.z / sxz));
	VERTEX = p;
	NORMAL = n;
	v_pos_o = p;
	v_nrm_o = n;
	v_dir = d;
	float inst_scale = length(MODEL_MATRIX[0].xyz);
	v_cam_o = (CAMERA_POSITION_WORLD - MODEL_MATRIX[3].xyz) / inst_scale;
}

void fragment() {
	float t = TIME + v_custom.z;
	vec3 col = blob_shade(v_pos_o, normalize(v_nrm_o), normalize(NORMAL), normalize(VIEW), v_cam_o, normalize(v_dir), t, v_custom.x);
	float facing = clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0);
	float fres = pow(1.0 - facing, 2.0);
	float swirl = vnoise(v_pos_o * 2.5 + vec3(0.0, -t * 0.6, 0.0) + v_custom.x) - 0.5;
	ALBEDO = mix(col, u_col_light, 0.25);
	ALPHA = clamp(0.30 + 0.55 * fres + swirl * 0.35, 0.12, 0.92);
}
