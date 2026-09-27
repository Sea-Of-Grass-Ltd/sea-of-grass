// Layer 2 (World): soft additive motes whose colour is read from a live pool
// texture at the particle's position on the stage floor - so the swarm
// carries the same weather as the walls.
shader_type spatial;
// fog_disabled: with additive blending, fog would otherwise be added across the
// whole quad - including its transparent corners - and draw visible squares.
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, fog_disabled;

uniform sampler2D live_tex : source_color, filter_linear, repeat_enable;
uniform float size = 1.0;
uniform float glow = 1.5;
uniform vec2 stage_extent = vec2(12.0, 8.0);

varying vec3 tint;

void vertex() {
	vec3 origin = MODEL_MATRIX[3].xyz;
	vec2 uv = origin.xz / stage_extent + 0.5;
	tint = texture(live_tex, uv).rgb;
	// Billboard, scaled by `size`.
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
		INV_VIEW_MATRIX[0] * size,
		INV_VIEW_MATRIX[1] * size,
		INV_VIEW_MATRIX[2] * size,
		MODEL_MATRIX[3]);
}

void fragment() {
	float d = length(UV - 0.5) * 2.0;
	float a = 1.0 - smoothstep(0.0, 1.0, d); // (reversed edges are undefined in GLSL)
	ALBEDO = (tint + 0.05) * glow * a * COLOR.a;
}
