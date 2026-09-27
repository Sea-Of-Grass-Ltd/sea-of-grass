class_name SurfaceBinding
extends Node
## Layer 1, Surface: puts a live pool texture onto things in the 3D world.
## One binding = one look shared by any number of meshes (a wall, a floor,
## every actor's costume), with its own controls:
##
##   /surface/<name>/source   which pool texture (SELECT)
##   /surface/<name>/amount   0 = plain base colour, 1 = fully the texture
##   /surface/<name>/glow     how much the texture emits light
##   /surface/<name>/tiling   texture repeats across the surface
##   /surface/<name>/scroll   texture drift speed

const SHADER := preload("res://materials/surface.gdshader")

var surface_name := ""
var material := ShaderMaterial.new()
var _prefix := ""
var _scroll := 0.0


static func create(binding_name: String, base_color: Color, default_source: String, defaults := {}) -> SurfaceBinding:
	var b := SurfaceBinding.new()
	b.name = "Surface" + binding_name.capitalize()
	b.surface_name = binding_name
	b._prefix = "/surface/%s/" % binding_name
	b.material.shader = SHADER
	b.material.set_shader_parameter("base_color", base_color)
	TexturePool.bind_select(b._prefix + "source", default_source, true)
	Bus.define(b._prefix + "amount", {"default": defaults.get("amount", 0.6)})
	Bus.define(b._prefix + "glow", {"min": 0.0, "max": 4.0, "default": defaults.get("glow", 0.4)})
	Bus.define(b._prefix + "tiling", {"min": 0.25, "max": 8.0, "default": defaults.get("tiling", 1.0), "curve": "exp"})
	Bus.define(b._prefix + "scroll", {"min": -0.2, "max": 0.2, "default": defaults.get("scroll", 0.0)})
	return b


func apply_to(mesh: GeometryInstance3D) -> void:
	mesh.material_override = material


func _process(delta: float) -> void:
	var tex := TexturePool.selected_texture(_prefix + "source")
	if tex:
		material.set_shader_parameter("live_tex", tex)
	material.set_shader_parameter("amount", Bus.value(_prefix + "amount"))
	material.set_shader_parameter("glow", Bus.value(_prefix + "glow"))
	material.set_shader_parameter("tiling", Bus.value(_prefix + "tiling"))
	# Integrated here rather than TIME * speed in the shader, so turning the
	# speed knob changes the drift without making the texture jump.
	_scroll = fmod(_scroll + delta * Bus.value(_prefix + "scroll"), 1000.0)
	material.set_shader_parameter("scroll", _scroll)
