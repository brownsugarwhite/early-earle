// P1-G opaque blob (jelly / liquid / fire). One MultiMesh draw call for 1..36 blobs.
// Per-instance data: INSTANCE_CUSTOM = (seed, squash, time phase, unused).
shader_type spatial;
render_mode unshaded, cull_back, depth_draw_opaque;

#include "res://shaders/blob_common.gdshaderinc"

uniform float u_displace = 1.0;   // 0 = mesh is driven externally (SoftBody3D), keep VERTEX
uniform vec3 u_center_ws = vec3(0.0, 0.0, 0.0);
uniform float u_radius_ws = 1.0;

varying vec3 v_pos_o;
varying vec3 v_nrm_o;
varying vec3 v_dir;
varying vec3 v_cam_o;
varying vec4 v_custom;

void vertex() {
	vec4 cd = INSTANCE_CUSTOM;
	v_custom = cd;
	float t = TIME + cd.z;
	if (u_displace > 0.5) {
		vec3 d = normalize(VERTEX);
		vec3 n;
		vec3 p = body_surface(d, cd.x, t, u_sphere_count, u_smin_k, u_noise_amp, u_noise_freq, n);
		float breath = 1.0 + 0.03 * sin(t * u_breath);
		p = vec3(p.x * breath, (p.y + BASE_Y) * breath - BASE_Y, p.z * breath);
		// volume-preserving squash about the base plane
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
	} else {
		// SoftBody3D: vertices arrive simulated in world space (MODEL_MATRIX = identity)
		vec3 p = (VERTEX - u_center_ws) / u_radius_ws;
		v_pos_o = p;
		v_nrm_o = NORMAL;
		v_dir = normalize(p);
		v_cam_o = (CAMERA_POSITION_WORLD - u_center_ws) / u_radius_ws;
	}
}

void fragment() {
	vec3 col = blob_shade(v_pos_o, normalize(v_nrm_o), normalize(NORMAL), normalize(VIEW), v_cam_o, normalize(v_dir), TIME + v_custom.z, v_custom.x);
	ALBEDO = col;
	if (u_material == 3) {
		EMISSION = col * 0.9;
	}
}
