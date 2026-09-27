extends Node
## The show. Builds the chain and runs the keyboard:
##
##   patches (generators) ──┐
##                          ├─► TexturePool ◄── surfaces, particles, overlays
##   Stage (3D SubViewport) ┘        │
##        └► "stage" ─► lens ─► screen (feedback) ─► window
##
## Looks: /show/look/1..4 recall a saved state of every control; arm
## /show/store first to save into a slot instead. Saved to user://looks.json.

const LOOKS_PATH := "user://looks.json"
const LOOK_SLOTS := 4

var output_size := Vector2i(1280, 720)
var story: StoryPlayer
var set_3d: DemoSet
var hud: Hud

var _stage_viewport: SubViewport
var _output: TextureRect
var _looks := {}


func _ready() -> void:
	var cfg := _load_json("res://config/show.json")
	var size: Array = cfg.get("output_size", [1280, 720])
	output_size = Vector2i(int(size[0]), int(size[1]))

	_build_patches()
	_build_stage()
	_build_story(String(cfg.get("story", "res://stage/story.json")))
	_build_output()
	_define_show_controls()
	_load_looks()

	hud = Hud.new()
	hud.story = story
	add_child(hud)


func _build_patches() -> void:
	var holder := Node.new()
	holder.name = "Patches"
	add_child(holder)
	var spec := _load_json("res://config/patches.json")
	for p in spec.get("passes", []):
		holder.add_child(ShaderPass.from_spec(p, output_size))


func _build_stage() -> void:
	_stage_viewport = SubViewport.new()
	_stage_viewport.name = "Stage"
	_stage_viewport.size = output_size
	_stage_viewport.own_world_3d = true
	_stage_viewport.msaa_3d = Viewport.MSAA_4X
	_stage_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(_stage_viewport)
	set_3d = DemoSet.new()
	set_3d.name = "Set"
	_stage_viewport.add_child(set_3d)
	TexturePool.publish("stage", _stage_viewport.get_texture(), true)


func _build_story(path: String) -> void:
	story = StoryPlayer.new()
	story.name = "Story"
	add_child(story)
	for actor_name in set_3d.actors:
		story.add_actor(actor_name, set_3d.actors[actor_name])
	story.load_story(path)


func _build_output() -> void:
	var layer := CanvasLayer.new()
	layer.name = "Output"
	layer.layer = 0
	add_child(layer)
	var black := ColorRect.new()
	black.color = Color.BLACK
	black.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(black)
	_output = TextureRect.new()
	_output.name = "Final"
	_output.set_anchors_preset(Control.PRESET_FULL_RECT)
	_output.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_output.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_output.texture = TexturePool.fetch("screen")
	layer.add_child(_output)


func _define_show_controls() -> void:
	for i in range(1, LOOK_SLOTS + 1):
		Bus.define("/show/look/%d" % i, {"kind": "trigger"})
	Bus.define("/show/store", {"kind": "toggle"})
	Bus.define("/show/reset", {"kind": "trigger"})
	Bus.triggered.connect(_on_trigger)


func _on_trigger(address: String, _source: String) -> void:
	if address == "/show/reset":
		_reset_look()
	elif address.begins_with("/show/look/"):
		var slot := address.get_file()
		if Bus.is_on("/show/store"):
			store_look(slot)
			Bus.set_value("/show/store", 0.0, "local")
		else:
			recall_look(slot)


## A look is every control except the story's own and the show's.
func store_look(slot: String) -> void:
	var snap := Bus.snapshot()
	for a in snap.keys():
		if a.begins_with("/story/") or a.begins_with("/show/"):
			snap.erase(a)
	_looks[slot] = snap
	var f := FileAccess.open(LOOKS_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(_looks, "  "))
	hud.flash("Stored look %s" % slot)


func recall_look(slot: String) -> void:
	if not _looks.has(slot):
		hud.flash("Look %s is empty (arm STORE, then press it to save)" % slot)
		return
	Bus.recall(_looks[slot])
	hud.flash("Look %s" % slot)


func _reset_look() -> void:
	for prefix in ["/lens/", "/world/", "/surface/", "/tex/", "/screen/"]:
		Bus.reset(prefix)
	hud.flash("Reset to defaults")


func _load_looks() -> void:
	if FileAccess.file_exists(LOOKS_PATH):
		var data = JSON.parse_string(FileAccess.get_file_as_string(LOOKS_PATH))
		if data is Dictionary:
			_looks = data


func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	var k := event as InputEventKey
	match k.keycode:
		KEY_SPACE: Bus.fire("/story/go", "keys")
		KEY_RIGHT: Bus.fire("/story/next", "keys")
		KEY_LEFT: Bus.fire("/story/prev", "keys")
		KEY_HOME: Bus.fire("/story/restart", "keys")
		KEY_P: _toggle("/story/hold")
		KEY_L: _toggle("/story/loop")
		KEY_R: _reset_look()
		KEY_F: _toggle_fullscreen()
		KEY_F5:
			Midi.reload_map()
			hud.flash("Reloaded MIDI map")
		KEY_1, KEY_2, KEY_3, KEY_4:
			var slot := str(k.keycode - KEY_0)
			if k.shift_pressed:
				store_look(slot)
			else:
				recall_look(slot)
		_:
			return
	get_viewport().set_input_as_handled()


func _toggle(address: String) -> void:
	Bus.set_value(address, 0.0 if Bus.is_on(address) else 1.0, "keys")


func _toggle_fullscreen() -> void:
	var mode := DisplayServer.window_get_mode()
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if mode == DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN)


func _load_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("Missing %s" % path)
		return {}
	var data = JSON.parse_string(FileAccess.get_file_as_string(path))
	return data if data is Dictionary else {}
