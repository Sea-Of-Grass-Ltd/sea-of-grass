class_name StageActor
extends Node3D
## A character whose performance is driven by story time, not wall-clock time.
##
## Each beat plays one authored animation (from Blender, or built in code).
## The story player tells the actor *where in that animation* to be every
## frame, so slowing, holding, looping and jumping back all come for free and
## always agree with each other.
##
## When the story holds, the actor doesn't freeze like a paused video: an
## idle animation (breathing, weight shifts, blinks) blends in over the body.
## Root motion / blocking is excluded from that blend, so a held actor
## stays exactly where the beat put them.
##
## For a character imported from Blender: put this script on the imported
## scene's root (or a parent), make sure it has an "idle" action, and list
## its root-motion tracks in `root_tracks` (e.g. "Armature/Skeleton3D:root").

@export var idle_animation := "idle"
## Track paths the idle blend must never touch - usually the root bone or
## whatever node carries the character's position on stage.
@export var root_tracks: PackedStringArray = []
## Seconds to breathe into / out of the idle when the story holds or resumes.
@export var hold_blend_time := 0.6

var _tree: AnimationTree
var _beat_node: AnimationNodeAnimation
var _idle_weight := 0.0
var _idle_target := 0.0
var _current := ""


func _ready() -> void:
	if _tree != null:
		return
	var player := _find_player(self)
	if player:
		setup_from_player(player)


## Use the libraries of an existing AnimationPlayer (the Blender import path).
func setup_from_player(player: AnimationPlayer) -> void:
	var libs := {}
	for lib_name in player.get_animation_library_list():
		libs[lib_name] = player.get_animation_library(lib_name)
	var root := player.get_node(player.root_node)
	player.active = false
	_build(libs, root)


## Use a library built in code (placeholder characters).
func setup_from_library(lib: AnimationLibrary, root: Node) -> void:
	_build({"": lib}, root)


func has_animation(anim: String) -> bool:
	return _tree != null and _tree.has_animation(anim)


func animation_length(anim: String) -> float:
	if not has_animation(anim):
		return 0.0
	return _tree.get_animation(anim).length


## Called by the story player every frame.
##   anim  - the beat's animation for this actor
##   time  - seconds into it (story time)
##   rest  - true if the story is held, or this actor has nothing to do
func perform(anim: String, time: float, rest: bool) -> void:
	if _tree == null:
		return
	if anim != "" and anim != _current and has_animation(anim):
		_current = anim
		_beat_node.animation = anim
	if _current == "":
		return
	var a := _tree.get_animation(_current)
	var t := time
	if a.loop_mode != Animation.LOOP_NONE and a.length > 0.0:
		t = fmod(time, a.length)
	else:
		t = clampf(time, 0.0, a.length)
	_tree.set("parameters/seek/seek_request", t)
	_idle_target = 1.0 if rest else 0.0


func _process(delta: float) -> void:
	if _tree == null:
		return
	_idle_weight = move_toward(_idle_weight, _idle_target, delta / maxf(hold_blend_time, 0.01))
	_tree.set("parameters/blend/blend_amount", smoothstep(0.0, 1.0, _idle_weight))


func _build(libs: Dictionary, root: Node) -> void:
	_tree = AnimationTree.new()
	_tree.name = "Performance"
	add_child(_tree)
	for lib_name in libs:
		_tree.add_animation_library(lib_name, libs[lib_name])
	_tree.root_node = _tree.get_path_to(root)

	# beat -> seek -> blend(a)        output
	#                 blend(b) <- idle
	var bt := AnimationNodeBlendTree.new()
	_beat_node = AnimationNodeAnimation.new()
	_beat_node.animation = idle_animation
	var seek := AnimationNodeTimeSeek.new()
	var idle := AnimationNodeAnimation.new()
	idle.animation = idle_animation
	var blend := AnimationNodeBlend2.new()
	# Only the tracks the idle animates are blended, minus root motion.
	# Everything else passes straight through from the beat.
	blend.filter_enabled = true
	if _tree.has_animation(idle_animation):
		var idle_anim := _tree.get_animation(idle_animation)
		for i in idle_anim.get_track_count():
			var path := idle_anim.track_get_path(i)
			if not String(path) in root_tracks:
				blend.set_filter_path(path, true)
	bt.add_node("beat", _beat_node, Vector2(0, 0))
	bt.add_node("seek", seek, Vector2(200, 0))
	bt.add_node("idle", idle, Vector2(200, 150))
	bt.add_node("blend", blend, Vector2(400, 0))
	bt.connect_node("seek", 0, "beat")
	bt.connect_node("blend", 0, "seek")
	bt.connect_node("blend", 1, "idle")
	bt.connect_node("output", 0, "blend")
	_tree.tree_root = bt
	_tree.active = true


func _find_player(node: Node) -> AnimationPlayer:
	for child in node.get_children():
		if child is AnimationPlayer:
			return child
		var found := _find_player(child)
		if found:
			return found
	return null
