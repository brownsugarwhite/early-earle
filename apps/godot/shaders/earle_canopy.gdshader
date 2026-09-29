// P2-G canopy primitives (dome / cone / stacked cones) as MultiMesh: normals copied from the
// hull centre so the crown lights as one mass; ink + 2 lit bands; casts the proxy shadow,
// receives none. INSTANCE_CUSTOM.x = crown height above ground in mesh units (growth pivot).
shader_type spatial;
render_mode ambient_light_disabled, specular_disabled, shadows_disabled, cull_back, depth_draw_opaque;

#include "res://shaders/earle_common.gdshaderinc"

uniform vec3 u_ink : source_color = vec3(0.08, 0.10, 0.04);
uniform vec3 u_lit1 : source_color = vec3(0.20, 0.25, 0.10);
uniform vec3 u_lit2 : source_color = vec3(0.28, 0.35, 0.16);
uniform float u_term = 0.05;
uniform float u_growth = 1.0;

varying float v_dist;

void vertex() {
	float g = mix(0.3, 1.0, u_growth);
	vec3 c = vec3(0.0, INSTANCE_CUSTOM.x * (g - 1.0), 0.0);
	VERTEX = VERTEX * g + c;
	NORMAL = normalize(VERTEX - c);
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
		float lit = aa_step(u_term, ndl);
		float x = smoothstep(0.0, 0.6, ndl);
		vec3 sunlit = mix(u_lit1, u_lit2, aa_step(0.5, x));
		vec3 col = mix(u_ink, sunlit, lit);
		DIFFUSE_LIGHT = apply_fog(col, v_dist);
		SPECULAR_LIGHT = vec3(0.0);
	}
}
