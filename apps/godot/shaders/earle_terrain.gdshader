// P2-G terrain: lit = min(aaStep(N.L), shadow) -> one ink shape for self + cast shadow,
// 3-4 palette bands for the sunlit side, stepped fog. No ambient, no specular.
shader_type spatial;
render_mode ambient_light_disabled, specular_disabled, cull_disabled, depth_draw_opaque;

#include "res://shaders/earle_common.gdshaderinc"

uniform vec3 u_ink : source_color = vec3(0.08, 0.10, 0.04);
uniform vec3 u_b0 : source_color = vec3(0.435, 0.45, 0.31);
uniform vec3 u_b1 : source_color = vec3(0.60, 0.60, 0.43);
uniform vec3 u_b2 : source_color = vec3(0.70, 0.71, 0.49);
uniform vec3 u_b3 : source_color = vec3(0.83, 0.81, 0.62);
uniform float u_term = 0.06;
uniform float u_growth = 1.0;

varying float v_dist;

vec3 bands(float x) {
	float i = floor(x);
	float t = smoothstep(1.0 - fwidth(x) * 1.5, 1.0, fract(x));
	vec3 c0 = (i < 0.5) ? u_b0 : ((i < 1.5) ? u_b1 : u_b2);
	vec3 c1 = (i < 0.5) ? u_b1 : ((i < 1.5) ? u_b2 : u_b3);
	return mix(c0, c1, t);
}

void vertex() {
	v_dist = length((MODELVIEW_MATRIX * vec4(VERTEX, 1.0)).xyz);
}

void fragment() {
	ALBEDO = vec3(0.0);
	SPECULAR = 0.0;
	ROUGHNESS = 1.0;
}

void light() {
	if (LIGHT_IS_DIRECTIONAL) {
		float ndl = dot(NORMAL, LIGHT);
		float shadow = aa_step(0.5, ATTENUATION);
		float lit = min(aa_step(u_term, ndl), shadow);
		vec3 sunlit = bands(clamp(smoothstep(0.0, 0.5, ndl), 0.0, 0.999) * 3.0);
		vec3 col = mix(u_ink, sunlit, lit);
		float grey = dot(col, vec3(0.333));
		col = mix(col, vec3(grey) * 0.9, (1.0 - u_growth) * 0.45);
		DIFFUSE_LIGHT = apply_fog(col, v_dist);
		SPECULAR_LIGHT = vec3(0.0);
	}
}
