// Shared helpers of the P2-G Earle-Lab: anti-aliased step and the stepped aerial fog
// (4 hard bands by view distance, Firewatch/Earle style, ~1 px blend at the borders).

uniform vec3 u_fog_c1 : source_color = vec3(0.56, 0.55, 0.47);
uniform vec3 u_fog_c2 : source_color = vec3(0.57, 0.52, 0.70);
uniform vec3 u_fog_c3 : source_color = vec3(0.49, 0.44, 0.69);
uniform vec3 u_fog_c4 : source_color = vec3(0.56, 0.76, 0.90);
uniform float u_fog_near = 22.0;
uniform float u_fog_far = 62.0;

float aa_step(float e, float x) {
	float w = max(fwidth(x), 1e-4);
	return smoothstep(e - w, e + w, x);
}

vec3 apply_fog(vec3 col, float dist) {
	float f = clamp((dist - u_fog_near) / (u_fog_far - u_fog_near), 0.0, 1.0) * 4.0;
	vec3 c = col;
	c = mix(c, mix(col, u_fog_c1, 0.45), aa_step(1.0, f));
	c = mix(c, mix(col, u_fog_c2, 0.70), aa_step(2.0, f));
	c = mix(c, u_fog_c3, aa_step(3.0, f));
	c = mix(c, u_fog_c4, aa_step(3.85, f));
	return c;
}
