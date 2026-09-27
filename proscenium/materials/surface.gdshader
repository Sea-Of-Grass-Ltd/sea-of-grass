// Layer 1 (Surface): a lit material whose colour and glow come from a live
// pool texture. Driven by SurfaceBinding.
shader_type spatial;

uniform sampler2D live_tex : source_color, filter_linear, repeat_disable;
uniform vec4 base_color : source_color = vec4(0.25, 0.25, 0.27, 1.0);
uniform float amount = 0.6;
uniform float glow = 0.4;
uniform float tiling = 1.0;
uniform float scroll = 0.0;
uniform float roughness = 0.85;

void fragment() {
	// Mirrored repeat: any generator tiles without seams, even ones that
	// were never designed to wrap.
	vec2 uv = UV * tiling + vec2(scroll, scroll * 0.37);
	uv = 1.0 - abs(mod(uv, 2.0) - 1.0);
	vec3 t = texture(live_tex, uv).rgb;
	ALBEDO = mix(base_color.rgb, t, amount);
	EMISSION = t * glow * amount;
	ROUGHNESS = roughness;
}
