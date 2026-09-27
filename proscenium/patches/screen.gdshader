// Post, layer 4 (Screen): the whole frame. Feedback on the final image,
// kaleidoscope, an overlay from any pool texture, grade, and a master fade.
shader_type canvas_item;
#include "res://patches/lib.gdshaderinc"

uniform sampler2D src : filter_linear, repeat_disable;
uniform sampler2D prev_tex : filter_linear, repeat_disable;
uniform sampler2D overlay_tex : filter_linear, repeat_enable;
uniform float aspect = 1.7778;
uniform float feedback = 0.0;
uniform float fb_zoom = 1.0;
uniform float fb_turn = 0.0;
uniform float kaleido = 0.0;     // segments; below 2 is off
uniform float overlay = 0.0;
uniform float hue = 0.0;         // 0..1 = once round the wheel
uniform float saturation = 1.0;
uniform float contrast = 1.0;
uniform float exposure = 1.0;
uniform float fade = 1.0;

vec2 fold(vec2 uv, float segments) {
	vec2 c = uv - 0.5;
	c.x *= aspect;
	float seg = 6.28318 / segments;
	float a = mod(atan(c.y, c.x), seg);
	a = abs(a - seg * 0.5);
	c = vec2(cos(a), sin(a)) * length(c);
	c.x /= aspect;
	return c + 0.5;
}

void fragment() {
	vec2 uv = UV;
	float n = floor(kaleido);
	if (n >= 2.0) {
		uv = fold(uv, n);
	}
	vec3 col = texture(src, uv).rgb;

	vec2 c = UV - 0.5;
	c = vec2(cos(fb_turn) * c.x - sin(fb_turn) * c.y, sin(fb_turn) * c.x + cos(fb_turn) * c.y) / fb_zoom;
	vec3 prev = texture(prev_tex, c + 0.5).rgb;
	col = max(col, prev * feedback);

	vec3 o = texture(overlay_tex, UV).rgb * overlay;
	col = 1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - clamp(o, 0.0, 1.0)); // screen blend

	col *= exposure;
	col = hue_rotate(col, hue * 6.28318);
	col = mix(vec3(luma(col)), col, saturation);
	col = (col - 0.5) * contrast + 0.5;
	COLOR = vec4(clamp(col, 0.0, 1.0) * fade, 1.0);
}
