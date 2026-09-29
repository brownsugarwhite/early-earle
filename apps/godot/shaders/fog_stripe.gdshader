// P2-G fog stripes: hard-edged translucent horizontal bands lying over the hills (depth tested,
// so they vanish behind ridges), soft ends along X.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, shadows_disabled;

uniform vec3 u_col : source_color = vec3(0.89, 0.97, 0.93);
uniform float u_alpha = 0.6;

void fragment() {
	float ends = smoothstep(0.0, 0.18, UV.x) * smoothstep(1.0, 0.82, UV.x);
	ALBEDO = u_col;
	ALPHA = u_alpha * ends;
}
