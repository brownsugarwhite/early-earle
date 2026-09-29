// P2-G trunks: thin vertical strips (MultiMesh), cylindrical billboards, ink coloured.
// Instance transform origin = tree base (rotation only), INSTANCE_CUSTOM = (height, width, 0, 0).
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, world_vertex_coords, depth_draw_opaque;

#include "res://shaders/earle_common.gdshaderinc"

uniform vec3 u_ink : source_color = vec3(0.08, 0.10, 0.04);
uniform float u_growth = 1.0;

varying float v_dist;

void vertex() {
	float g = mix(0.3, 1.0, u_growth);
	vec3 base = MODEL_MATRIX[3].xyz;
	vec3 up = normalize(mat3(MODEL_MATRIX) * vec3(0.0, 1.0, 0.0));
	vec3 to_cam = CAMERA_POSITION_WORLD - base;
	vec3 right = normalize(cross(up, to_cam));
	float h = INSTANCE_CUSTOM.x * g;
	float w = INSTANCE_CUSTOM.y;
	VERTEX = base + right * ((UV.x - 0.5) * w) + up * (UV.y * h);
	NORMAL = normalize(to_cam);
	v_dist = length((VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz);
}

void fragment() {
	ALBEDO = apply_fog(u_ink, v_dist);
}
