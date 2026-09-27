class_name Hud
extends CanvasLayer
## The performer's view, drawn over the output. Hide it for the audience.
##
##   H        show / hide the HUD
##   C        show / hide captions
##   Tab      show / hide the control list
##   Up/Down  pick a control in the list      -/=  nudge it (no MIDI needed)
##
## The top panel shows where the story is and what's holding it. The bottom
## line shows the last MIDI message - move an unmapped knob and its channel
## and number appear here, ready to paste into config/midi_map.json.

var story: StoryPlayer

var _status: Label
var _midi: Label
var _captions: Label
var _flash: Label
var _list: Label
var _panel: PanelContainer
var _list_panel: PanelContainer
var _caption_until := 0.0
var _flash_until := 0.0
var _selected := 0
var _time := 0.0


func _ready() -> void:
	layer = 10
	_panel = _box(Vector2(16, 16))
	var col := VBoxContainer.new()
	_panel.add_child(col)
	_status = _label(15)
	col.add_child(_status)
	_midi = _label(12)
	_midi.modulate = Color(1, 1, 1, 0.6)
	col.add_child(_midi)

	_list_panel = _box(Vector2(16, 150))
	_list_panel.visible = false
	_list = _label(12)
	_list_panel.add_child(_list)

	_captions = _label(26)
	_captions.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_captions.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_captions.position.y -= 90
	_captions.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_captions.add_theme_constant_override("outline_size", 6)
	_captions.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	add_child(_captions)

	_flash = _label(18)
	_flash.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_flash.position.y += 20
	_flash.grow_horizontal = Control.GROW_DIRECTION_BOTH
	add_child(_flash)

	Midi.unmapped.connect(func(d): _midi.text = "MIDI (unmapped): " + d)
	Midi.received.connect(func(d): _midi.text = "MIDI: " + d)
	if story:
		story.line_spoken.connect(_on_line)
	_midi.text = _io_summary()


func flash(text: String) -> void:
	_flash.text = text
	_flash_until = _time + 2.0


func _on_line(who: String, text: String, duration: float) -> void:
	_captions.text = ("%s\n%s" % [who, text]) if who != "" else text
	_caption_until = _time + duration


func _process(delta: float) -> void:
	_time += delta
	if _time > _caption_until:
		_captions.text = ""
	if _time > _flash_until:
		_flash.text = ""
	if _panel.visible and story and not story.beats.is_empty():
		_status.text = _story_summary()
	if _list_panel.visible:
		_list.text = _control_list()


func _story_summary() -> String:
	var beat := story.current_beat()
	var length := story.beat_length()
	var state := "PLAYING"
	if story.waiting:
		state = "WAITING FOR GO"
	elif Bus.is_on("/story/hold"):
		state = "HELD"
	elif Bus.value("/story/rate") < 0.02:
		state = "STOPPED (rate 0)"
	if Bus.is_on("/story/loop"):
		state += "  · LOOP"
	var bar_len := 24
	var filled := int(clampf(story.beat_time / length, 0.0, 1.0) * bar_len)
	var bar := "█".repeat(filled) + "░".repeat(bar_len - filled)
	var lines := [
		story.scene_title,
		"Beat %d/%d  %s" % [story.index + 1, story.beats.size(), beat.get("name", "")],
		"%s  %4.1f / %4.1fs   rate ×%.2f" % [bar, story.beat_time, length, Bus.value("/story/rate")],
		state,
	]
	if Bus.is_on("/show/store"):
		lines.append("STORE ARMED - press a look to save it")
	var owners := Bus.owners()
	if not owners.is_empty():
		lines.append("Owners: " + ", ".join(owners.keys().map(func(k): return "%s=%s" % [k, owners[k]])))
	return "\n".join(lines)


func _control_list() -> String:
	var addresses := Bus.addresses()
	if addresses.is_empty():
		return ""
	_selected = clampi(_selected, 0, addresses.size() - 1)
	var start := clampi(_selected - 14, 0, maxi(addresses.size() - 30, 0))
	var out := PackedStringArray()
	for i in range(start, mini(start + 30, addresses.size())):
		var a := addresses[i]
		var marker := "▶ " if i == _selected else "  "
		var kind := Bus.kind_of(a)
		var shown := ""
		match kind:
			Bus.Kind.TRIGGER: shown = "(trigger)"
			Bus.Kind.TOGGLE: shown = "ON" if Bus.is_on(a) else "off"
			Bus.Kind.SELECT: shown = str(Bus.selected(a))
			_:
				var n := Bus.norm(a)
				shown = "%s %8.3f" % ["▮".repeat(int(n * 10)) + "·".repeat(10 - int(n * 10)), Bus.value(a)]
		out.append("%s%-30s %s" % [marker, a, shown])
	return "\n".join(out)


func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed):
		return
	var k := event as InputEventKey
	var addresses := Bus.addresses()
	match k.keycode:
		KEY_H: _panel.visible = not _panel.visible
		KEY_C: _captions.visible = not _captions.visible
		KEY_TAB: _list_panel.visible = not _list_panel.visible
		KEY_UP: _selected = maxi(_selected - 1, 0)
		KEY_DOWN: _selected = mini(_selected + 1, addresses.size() - 1)
		KEY_MINUS, KEY_EQUAL:
			if not _list_panel.visible or addresses.is_empty():
				return
			var a := addresses[_selected]
			var dir := 1 if k.keycode == KEY_EQUAL else -1
			match Bus.kind_of(a):
				Bus.Kind.SELECT: Bus.step(a, dir, "keys")
				Bus.Kind.TRIGGER: Bus.fire(a, "keys")
				Bus.Kind.TOGGLE: Bus.set_value(a, 1.0 if dir > 0 else 0.0, "keys")
				_: Bus.nudge(a, dir * 0.05, "keys")
		_:
			return
	get_viewport().set_input_as_handled()


func _io_summary() -> String:
	var devices := Midi.devices()
	var midi := "MIDI: %s" % (", ".join(devices) if not devices.is_empty() else "none connected")
	var osc := ("OSC in :%d" % OscIO.listen_port) if OscIO.is_listening() else "OSC: not listening"
	return "%s   ·   %s   ·   H hide · Tab controls" % [midi, osc]


func _box(pos: Vector2) -> PanelContainer:
	var p := PanelContainer.new()
	p.position = pos
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0, 0, 0, 0.55)
	sb.set_content_margin_all(10)
	sb.set_corner_radius_all(4)
	p.add_theme_stylebox_override("panel", sb)
	add_child(p)
	return p


func _label(font_size: int) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", font_size)
	return l
