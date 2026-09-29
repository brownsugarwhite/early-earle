// Two-tone flat shading with one hard, re-sharpened directional shadow (plate / ground of the Blob-Lab).
shader_type spatial;
render_mode ambient_light_disabled, specular_disabled, cull_back, depth_draw_opaque;

uniform vec3 u_lit : source_color = vec3(0.70, 0.73, 0.43);
uniform vec3 u_shade : source_color = vec3(0.14, 0.17, 0.04);
uniform float u_term = 0.0;

float aa_step(float e, float x) {
	float w = max(fwidth(x), 1e-4);
	return smoothstep(e - w, e + w, x);
}

void fragment() {
	ALBEDO = vec3(1.0); // DIFFUSE_LIGHT is multiplied by ALBEDO after light()
	SPECULAR = 0.0;
	ROUGHNESS = 1.0;
}

void light() {
	if (LIGHT_IS_DIRECTIONAL) {
		float lit = min(aa_step(u_term, dot(NORMAL, LIGHT)), aa_step(0.5, ATTENUATION));
		DIFFUSE_LIGHT = mix(u_shade, u_lit, lit);
		SPECULAR_LIGHT = vec3(0.0);
	}
}
