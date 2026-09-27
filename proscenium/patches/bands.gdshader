// Generator: travelling bands, linear to radial. Light through blinds,
// ripples, a pulse, a horizon line.
shader_type canvas_item;
#include "res://patches/lib.gdshaderinc"

uniform float t = 0.0;
uniform float bands = 6.0;
uniform float angle = 0.0;
uniform float rings = 0.0;      // 0 = straight bands, 1 = rings from the centre
uniform float sharpness = 0.4;
uniform float hue = 0.08;
uniform float spread = 0.5;

void fragment() {
	vec2 c = UV - 0.5;
	float ca = cos(angle);
	float sa = sin(angle);
	c = vec2(ca * c.x - sa * c.y, sa * c.x + ca * c.y);
	float x = mix(c.x, length(c) * 1.4, rings) * bands - t;
	float v = 0.5 + 0.5 * sin(6.28318 * x);
	v = pow(v, 1.0 + sharpness * 12.0);
	vec3 col = palette(x * 0.05 + v * 0.25, hue, spread);
	COLOR = vec4(col * mix(0.05, 1.2, v), 1.0);
}
