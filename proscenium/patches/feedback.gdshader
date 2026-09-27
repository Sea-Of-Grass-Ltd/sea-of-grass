// Processor: video feedback. Its previous frame is zoomed, turned, pushed by
// the input's brightness, and faded; the input is mixed back in. Trails,
// tunnels, blooms, smears.
shader_type canvas_item;
#include "res://patches/lib.gdshaderinc"

uniform sampler2D prev_tex : filter_linear, repeat_disable;
uniform sampler2D input_tex : filter_linear, repeat_enable;
uniform float t = 0.0;
uniform float decay = 0.96;
uniform float zoom = 1.01;
uniform float turn = 0.0;
uniform float input_mix = 0.1;
uniform float displace = 0.0;
uniform float hue_shift = 0.0;

void fragment() {
	vec4 inp = texture(input_tex, UV);
	float lum = luma(inp.rgb);
	float a = turn + displace * (lum - 0.5) * 0.1;
	vec2 c = UV - 0.5;
	c = vec2(cos(a) * c.x - sin(a) * c.y, sin(a) * c.x + cos(a) * c.y) / zoom;
	vec2 push = displace * 0.01 * vec2(cos(lum * 6.28318 + t), sin(lum * 6.28318 + t));
	vec3 prev = texture(prev_tex, c + 0.5 + push).rgb;
	prev = hue_rotate(prev, hue_shift);
	// Subtracting a floor as well as multiplying lets trails reach true black.
	prev = max(prev * decay - 0.002, vec3(0.0));
	COLOR = vec4(min(mix(prev, inp.rgb, input_mix), vec3(4.0)), 1.0);
}
