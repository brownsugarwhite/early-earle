// P2-G sky: five hard bands (neon top -> pale cyan horizon, after Florian's Tjorizo draft)
// and a flat sun disc. No blur anywhere.
shader_type sky;

uniform vec3 u_c0 : source_color = vec3(0.72, 1.0, 0.16);
uniform vec3 u_c1 : source_color = vec3(0.86, 0.96, 0.54);
uniform vec3 u_c2 : source_color = vec3(0.77, 0.93, 0.88);
uniform vec3 u_c3 : source_color = vec3(0.66, 0.87, 0.94);
uniform vec3 u_c4 : source_color = vec3(0.56, 0.76, 0.90);
uniform vec3 u_sun_col : source_color = vec3(0.96, 1.0, 0.82);
uniform vec3 u_sun_dir = vec3(0.0, 1.0, 0.0);

void sky() {
	float h = EYEDIR.y;
	vec3 c = u_c4;
	c = mix(c, u_c3, step(0.035, h));
	c = mix(c, u_c2, step(0.11, h));
	c = mix(c, u_c1, step(0.22, h));
	c = mix(c, u_c0, step(0.40, h));
	float sd = dot(normalize(EYEDIR), normalize(u_sun_dir));
	c = mix(c, u_sun_col, step(0.9992, sd));
	COLOR = c;
}
