class_name ShaderPass
extends Node
## One "patch": a fragment shader rendered into its own texture every frame,
## with its uniforms wired to the bus and its texture inputs wired to the
## pool. Generators (noise, bands), processors (feedback) and the post chain
## (lens, screen) are all the same thing - only the shader and the wiring
## differ. They're declared in config/patches.json:
##
##   {
##     "name": "noise",                       # publishes TexturePool "noise"
##     "shader": "res://patches/noise.gdshader",
##     "size": [512, 512],                    # or "output" for full frame
##     "time": "/tex/noise/speed",            # optional: uniform `t` advances
##                                            #   at this rate (so speed changes
##                                            #   never make the image jump)
##     "feedback": "prev_tex",                # optional: this uniform receives
##                                            #   the pass's own previous frame
##     "post_only": false,                    # true if it depends on the stage
##     "params": {                            # uniform <- bus control
##       "scale": {"address": "/tex/noise/scale", "min": 1, "max": 8, "default": 3}
##     },
##     "textures": {                          # sampler uniform <- pool texture
##       "input_tex": "noise",                #   fixed source, or
##       "input_tex": {"select": "/tex/feedback/source", "default": "noise"}
##     },
##     "constants": { "aspect": 1.7778 }
##   }
##
## A new effect is a new .gdshader plus a new entry - no code.

var pass_name := ""
var output_size := Vector2i(512, 512)

var _viewport: SubViewport
var _material: ShaderMaterial
var _params := {}      # uniform -> bus address
var _textures := {}    # uniform -> pool name, or {"select": address}
var _time_address := ""
var _t := 0.0
var _has_time := false


static func from_spec(spec: Dictionary, full_frame: Vector2i) -> ShaderPass:
	var p := ShaderPass.new()
	p.pass_name = String(spec.get("name", "pass"))
	p.name = p.pass_name.capitalize().replace(" ", "")
	var size = spec.get("size", [512, 512])
	p.output_size = full_frame if size is String else Vector2i(int(size[0]), int(size[1]))
	p._build(spec)
	return p


func texture() -> Texture2D:
	return _viewport.get_texture()


func _build(spec: Dictionary) -> void:
	var shader: Shader = load(String(spec.get("shader", "")))
	if shader == null:
		push_error("ShaderPass %s: cannot load shader %s" % [pass_name, spec.get("shader")])
		shader = Shader.new()
		shader.code = "shader_type canvas_item; void fragment(){ COLOR = vec4(1.0, 0.0, 1.0, 1.0); }"
	_material = ShaderMaterial.new()
	_material.shader = shader
	_has_time = _shader_has_uniform(shader, "t")

	_viewport = _make_viewport(output_size, _material)
	add_child(_viewport)

	var feedback_uniform := String(spec.get("feedback", ""))
	if feedback_uniform != "":
		# Ping-pong: a second viewport copies this pass's output, and this pass
		# reads the copy - its own previous frame. A viewport can't sample its
		# own render target directly.
		var copy_mat := ShaderMaterial.new()
		copy_mat.shader = load("res://patches/copy.gdshader")
		copy_mat.set_shader_parameter("src", _viewport.get_texture())
		var copy := _make_viewport(output_size, copy_mat)
		copy.name = "Previous"
		add_child(copy)
		_material.set_shader_parameter(feedback_uniform, copy.get_texture())

	for uniform in spec.get("params", {}):
		var p = spec["params"][uniform]
		var address: String = p if p is String else String(p.get("address", ""))
		if p is Dictionary:
			Bus.define(address, p)
		_params[uniform] = address

	for uniform in spec.get("textures", {}):
		var src = spec["textures"][uniform]
		if src is Dictionary and src.has("select"):
			var address := String(src["select"])
			TexturePool.bind_select(address, String(src.get("default", "")), false, pass_name)
			_textures[uniform] = {"select": address}
		else:
			_textures[uniform] = String(src)

	if _shader_has_uniform(shader, "aspect"):
		_material.set_shader_parameter("aspect", float(output_size.x) / output_size.y)
	var consts: Dictionary = spec.get("constants", {})
	for uniform in consts:
		_material.set_shader_parameter(uniform, consts[uniform])

	_time_address = String(spec.get("time", ""))
	if _time_address != "":
		Bus.define(_time_address, {"min": 0.0, "max": 2.0, "default": 0.3})

	TexturePool.publish(pass_name, _viewport.get_texture(), bool(spec.get("post_only", false)))


func _make_viewport(size: Vector2i, mat: ShaderMaterial) -> SubViewport:
	var vp := SubViewport.new()
	vp.size = size
	vp.disable_3d = true
	vp.transparent_bg = false
	# Float render target: feedback needs values below 1/255 to decay to
	# black instead of sticking, and the post chain keeps highlights.
	vp.use_hdr_2d = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	var rect := ColorRect.new()
	rect.size = Vector2(size)
	rect.material = mat
	vp.add_child(rect)
	return vp


func _process(delta: float) -> void:
	if _has_time:
		var speed := Bus.value(_time_address, 1.0) if _time_address != "" else 1.0
		_t += delta * speed
		_material.set_shader_parameter("t", _t)
	for uniform in _params:
		_material.set_shader_parameter(uniform, Bus.value(_params[uniform]))
	for uniform in _textures:
		var src = _textures[uniform]
		var tex: Texture2D
		if src is Dictionary:
			tex = TexturePool.selected_texture(src["select"])
		elif src != pass_name: # a pass reading itself goes through "feedback"
			tex = TexturePool.fetch(src)
		if tex:
			_material.set_shader_parameter(uniform, tex)


static func _shader_has_uniform(shader: Shader, uniform: String) -> bool:
	for u in shader.get_shader_uniform_list():
		if u.get("name") == uniform:
			return true
	return false
