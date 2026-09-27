extends Node
## The texture pool: every live image in the show, by name.
##
## This is the Jitter-matrix / TouchDesigner-TOP idea inside the engine. A
## generator publishes a texture here ("noise", "feedback", "stage"); anything
## on any layer - a wall's material, the particles, a screen overlay - asks
## for a texture by name. Because consumers look up by name every frame,
## re-routing is just changing a name, and a SELECT control on the bus can
## switch a surface between sources live.
##
## Later, a Syphon receiver is one more `publish()` call.

signal published(pool_name: String)

var _textures := {}
var _order: Array[String] = []
## Pool names that should not be offered to surfaces (they depend on the
## rendered stage, so using them *on* the stage makes a loop). They still
## work as inputs to the post chain.
var _post_only := {}
var _selects := {}   # bus address -> {default, surfaces_only, exclude}


func publish(pool_name: String, texture: Texture2D, post_only := false) -> void:
	if not _textures.has(pool_name):
		_order.append(pool_name)
	_textures[pool_name] = texture
	if post_only:
		_post_only[pool_name] = true
	for address in _selects:
		_refresh_select(address)
	published.emit(pool_name)


func fetch(pool_name: String) -> Texture2D:
	return _textures.get(pool_name)


func names() -> Array[String]:
	return _order


## Names safe to put on things inside the 3D world.
func surface_names() -> Array[String]:
	var out: Array[String] = []
	for n in _order:
		if not _post_only.has(n):
			out.append(n)
	return out


## Make `address` a SELECT control on the bus whose options are the pool's
## names, kept current as new sources are published. The chosen source is
## remembered by name, so adding a source never changes what's on screen.
func bind_select(address: String, default_name: String, surfaces_only := false, exclude := "") -> void:
	Bus.define(address, {"kind": "select", "options": [], "smooth": 0.0, "pickup": false})
	_selects[address] = {"default": default_name, "surfaces_only": surfaces_only, "exclude": exclude}
	_refresh_select(address)


## The texture a SELECT control currently points at (or null).
func selected_texture(address: String) -> Texture2D:
	var chosen = Bus.selected(address)
	return fetch(chosen) if chosen != null else null


func _refresh_select(address: String) -> void:
	var cfg: Dictionary = _selects[address]
	var source_names := surface_names() if cfg.surfaces_only else names()
	var options: Array = source_names.filter(func(n): return n != cfg.exclude)
	var previous = Bus.selected(address)
	Bus.set_options(address, options)
	var keep = previous if previous != null and previous in options else cfg.default
	var i := options.find(keep)
	if i >= 0:
		Bus.set_value(address, (i + 0.5) / options.size(), "local")
