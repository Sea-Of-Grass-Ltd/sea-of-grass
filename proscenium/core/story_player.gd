class_name StoryPlayer
extends Node
## Plays a scene as a sequence of beats on *story time*, which the performer
## can slow, speed up, hold, loop and step through. World time (the camera,
## lights, particles, textures) keeps running regardless: holding the story
## is a held moment on stage, not a paused video.
##
## A story is JSON (see stage/story.json):
##   { "scene": "...",
##     "beats": [
##       { "name": "She asks",
##         "length": 4.0,                       # optional; default = longest anim
##         "end": "continue" | "hold" | "loop", # what happens at the end
##         "actors": { "mara": "ask" },         # actor -> animation this beat
##         "lines":  [ { "at": 1.0, "who": "MARA", "text": "...", "dur": 2.5,
##                       "audio": "res://audio/mara_01.ogg" } ],
##         "look":   { "/world/fog/density": 0.05 },   # set on entry
##         "fade": 2.0 }                        # seconds the look takes
##     ] }
##
## Dialogue is per line, so stretching a beat lengthens the silences between
## lines rather than slowing the voices.

signal beat_changed(index: int, beat: Dictionary)
signal line_spoken(who: String, text: String, duration: float)

var scene_title := ""
var beats: Array = []
var actors := {}          # name -> StageActor
var index := 0
var beat_time := 0.0
var waiting := false      # reached a "hold" end; GO continues

var _audio: AudioStreamPlayer


func _ready() -> void:
	# Run before the actors' AnimationTrees, so they pose to *this* frame's
	# story time rather than trailing a frame behind it.
	process_priority = -10
	Bus.define("/story/rate", {"min": 0.0, "max": 2.0, "default": 1.0, "smooth": 0.25})
	Bus.define("/story/hold", {"kind": "toggle"})
	Bus.define("/story/loop", {"kind": "toggle"})
	for t in ["/story/go", "/story/next", "/story/prev", "/story/restart"]:
		Bus.define(t, {"kind": "trigger"})
	Bus.triggered.connect(_on_trigger)
	_audio = AudioStreamPlayer.new()
	add_child(_audio)


func load_story(path: String) -> bool:
	if not FileAccess.file_exists(path):
		push_error("Story: no file at %s" % path)
		return false
	var data = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not data is Dictionary:
		push_error("Story: %s is not valid JSON" % path)
		return false
	scene_title = String(data.get("scene", ""))
	beats = data.get("beats", [])
	if not beats.is_empty():
		_enter(0, 0.0)
	return true


func add_actor(actor_name: String, actor: StageActor) -> void:
	actors[actor_name] = actor


func current_beat() -> Dictionary:
	return beats[index] if index < beats.size() else {}


func beat_length(i := -1) -> float:
	var beat: Dictionary = beats[index if i < 0 else i]
	if beat.has("length"):
		return float(beat["length"])
	var longest := 0.0
	for actor_name in beat.get("actors", {}):
		var actor: StageActor = actors.get(actor_name)
		if actor:
			longest = maxf(longest, actor.animation_length(beat["actors"][actor_name]))
	return maxf(longest, 1.0)


func is_held() -> bool:
	return waiting or Bus.is_on("/story/hold") or Bus.value("/story/rate") < 0.02


## "GO" in the theatre sense: release whatever is holding the story, or,
## if nothing is, move on to the next beat.
func go() -> void:
	if waiting:
		waiting = false
		if index + 1 < beats.size():
			_enter(index + 1, 0.0)
	elif Bus.is_on("/story/hold"):
		Bus.set_value("/story/hold", 0.0, "story")
	else:
		jump(index + 1)


func jump(i: int) -> void:
	if beats.is_empty():
		return
	_enter(clampi(i, 0, beats.size() - 1), 0.0)


func _on_trigger(address: String, _source: String) -> void:
	match address:
		"/story/go": go()
		"/story/next": jump(index + 1)
		"/story/prev":
			# Like a media player: back to the top of this beat first.
			jump(index - 1 if beat_time < 1.0 else index)
		"/story/restart": jump(0)


func _enter(i: int, carry: float) -> void:
	index = i
	beat_time = carry
	waiting = false
	var beat := current_beat()
	var look: Dictionary = beat.get("look", {})
	var fade := float(beat.get("fade", 2.0))
	for address in look:
		Bus.set_value(address, float(look[address]), "story", fade)
	beat_changed.emit(index, beat)


func _process(delta: float) -> void:
	if beats.is_empty():
		return
	var held := is_held()
	if not held:
		var before := beat_time
		beat_time += delta * Bus.value("/story/rate")
		_speak(before, beat_time)
		var length := beat_length()
		if beat_time >= length:
			var end := "loop" if Bus.is_on("/story/loop") else String(current_beat().get("end", "continue"))
			match end:
				"loop":
					beat_time = fmod(beat_time, length)
					_speak(-0.001, beat_time)
				"hold":
					beat_time = length
					waiting = true
				_:
					if index + 1 < beats.size():
						_enter(index + 1, beat_time - length)
					else:
						beat_time = length
						waiting = true
	_update_actors(is_held())


func _update_actors(held: bool) -> void:
	var cast: Dictionary = current_beat().get("actors", {})
	for actor_name in actors:
		var actor: StageActor = actors[actor_name]
		if cast.has(actor_name):
			actor.perform(String(cast[actor_name]), beat_time, held)
		else:
			# Not in this beat: stay where their last action left them.
			var last := _last_action(actor_name)
			actor.perform(last, actor.animation_length(last), true)


func _last_action(actor_name: String) -> String:
	for i in range(index - 1, -1, -1):
		var cast: Dictionary = beats[i].get("actors", {})
		if cast.has(actor_name):
			return String(cast[actor_name])
	return ""


func _speak(from: float, to: float) -> void:
	for line in current_beat().get("lines", []):
		var at := float(line.get("at", 0.0))
		if at > from and at <= to:
			line_spoken.emit(String(line.get("who", "")), String(line.get("text", "")), float(line.get("dur", 3.0)))
			var audio := String(line.get("audio", ""))
			if audio != "" and ResourceLoader.exists(audio):
				_audio.stream = load(audio)
				_audio.play()
