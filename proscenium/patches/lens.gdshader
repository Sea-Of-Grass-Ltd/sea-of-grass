// Post, layer 3 (Lens): what the glass does to the stage image.
shader_type canvas_item;
#include "res://patches/lib.gdshaderinc"

uniform sampler2D src : filter_linear, repeat_disable;
uniform float t = 0.0;
uniform float aspect = 1.7778;
uniform float distort = 0.0;     // + barrel, - pincushion
uniform float aberration = 0.0;
uniform float vignette = 0.3;
uniform float grain = 0.03;

void fragment() {
	vec2 c = UV - 0.5;
	c.x *= aspect;
	float r2 = dot(c, c);
	vec2 d = c * (1.0 + distort * r2) / (1.0 + max(distort, 0.0) * 0.25);
	d.x /= aspect;
	float ab = aberration * 0.012;
	vec3 col = vec3(
		texture(src, d * (1.0 + ab) + 0.5).r,
		texture(src, d + 0.5).g,
		texture(src, d * (1.0 - ab) + 0.5).b);
	col *= 1.0 - vignette * smoothstep(0.25, 0.95, length(UV - 0.5) * 1.41);
	col += (hash12(UV * 1543.0 + fract(t) * 91.0) - 0.5) * grain;
	COLOR = vec4(max(col, vec3(0.0)), 1.0);
}
