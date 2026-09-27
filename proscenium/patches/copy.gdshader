// Internal: copies a texture. Used for the "previous frame" of feedback passes.
shader_type canvas_item;

uniform sampler2D src : filter_nearest, repeat_disable;

void fragment() {
	COLOR = texture(src, UV);
}
