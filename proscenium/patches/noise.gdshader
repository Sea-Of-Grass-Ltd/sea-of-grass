// Generator: domain-warped noise through a colour palette.
// Weather, water, smoke, marble, cloud - depending on the knobs.
shader_type canvas_item;
#include "res://patches/lib.gdshaderinc"

uniform float t = 0.0;
uniform float scale = 3.0;
uniform float warp = 1.0;
uniform float hue = 0.55;
uniform float spread = 0.4;
uniform float contrast = 1.0;
uniform float brightness = 1.0;

void fragment() {
	vec2 p = UV * scale;
	vec2 q = vec2(fbm(p + vec2(0.0, t * 0.3)), fbm(p + vec2(5.2, 1.3) - t * 0.2));
	float n = fbm(p + warp * 2.0 * q + t * 0.1);
	n = clamp((n - 0.5) * contrast + 0.5, 0.0, 1.0);
	COLOR = vec4(palette(n + length(q) * 0.3, hue, spread) * brightness * n * 1.6, 1.0);
}
