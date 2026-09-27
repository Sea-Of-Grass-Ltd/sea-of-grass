extends Node
## MIDI controllers -> the bus, through config/midi_map.json.
##
## The map is data, not code: a performer re-patches a controller by editing
## JSON, the same way they'd re-patch a lighting desk. Keys are
## "channel:number", channel 1-16 or "*" for any channel.
##
##   "cc":    { "*:21": "/lens/orbit" }   knobs and faders, 0..127 -> 0..1
##   "notes": { "*:36": "/story/go" }     pads and keys; press = 1, release = 0
##   { "address": "/surface/wall/source", "step": 1 }
##                                        a button that steps a SELECT control
##
## Every connected device is read. Each device is its own source
## ("midi:0", "midi:1", ...), so a second performer on a second controller
## gets ownership and soft takeover for free.
##
## Anything that arrives unmapped is announced on `unmapped`, which the HUD
## shows - move a knob, read its number off the screen, add it to the map.
## Press F5 in the show to reload the map without restarting.

signal unmapped(description: String)
signal received(description: String)

const MAP_PATH := "res://config/midi_map.json"

var _cc := {}
var _notes := {}
var _held := {}   # step buttons, so a held button steps once


var _open := false


func _ready() -> void:
	reload_map()
	if DisplayServer.get_name() == "headless":
		# Headless runs (tests, CI) have no MIDI system to open; on some
		# Linux setups trying anyway crashes the engine.
		return
	OS.open_midi_inputs()
	_open = true
	if OS.get_connected_midi_inputs().is_empty():
		print("MIDI: no inputs connected (keyboard and OSC still work)")
	else:
		print("MIDI inputs: ", OS.get_connected_midi_inputs())


func _exit_tree() -> void:
	if _open:
		OS.close_midi_inputs()


func devices() -> PackedStringArray:
	return OS.get_connected_midi_inputs() if _open else PackedStringArray()


func reload_map() -> void:
	_cc.clear()
	_notes.clear()
	if not FileAccess.file_exists(MAP_PATH):
		push_warning("MIDI: no map at %s" % MAP_PATH)
		return
	var data = JSON.parse_string(FileAccess.get_file_as_string(MAP_PATH))
	if not data is Dictionary:
		push_warning("MIDI: %s is not valid JSON" % MAP_PATH)
		return
	_cc = data.get("cc", {})
	_notes = data.get("notes", {})


func _input(event: InputEvent) -> void:
	if not event is InputEventMIDI:
		return
	var e := event as InputEventMIDI
	var ch := e.channel + 1
	var source := "midi:%d" % e.device
	match e.message:
		MIDI_MESSAGE_CONTROL_CHANGE:
			_route(_cc, "cc", ch, e.controller_number, e.controller_value / 127.0, source)
		MIDI_MESSAGE_NOTE_ON:
			# Many controllers send note-on with velocity 0 as a release.
			_route(_notes, "note", ch, e.pitch, 1.0 if e.velocity > 0 else 0.0, source)
		MIDI_MESSAGE_NOTE_OFF:
			_route(_notes, "note", ch, e.pitch, 0.0, source)


func _route(table: Dictionary, kind: String, ch: int, number: int, v: float, source: String) -> void:
	var entry = table.get("%d:%d" % [ch, number], table.get("*:%d" % number, ""))
	var desc := "%s ch%d #%d = %.2f" % [kind, ch, number, v]
	if entry is Dictionary:
		var address := String(entry.get("address", ""))
		received.emit("%s -> %s" % [desc, address])
		if entry.has("step"):
			var pressed := v >= 0.5
			var key := "%s:%s" % [source, address]
			if pressed and not _held.get(key, false):
				Bus.step(address, int(entry["step"]), source)
			_held[key] = pressed
		return
	if String(entry) == "":
		unmapped.emit(desc)
		return
	received.emit("%s -> %s" % [desc, entry])
	Bus.input(String(entry), v, source)
