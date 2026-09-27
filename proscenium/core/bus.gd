extends Node
## The control bus: every live control in the show has an address here.
##
## Inputs (MIDI, OSC, keyboard, the story's own looks) never touch the scene
## directly. They write *normalized* values (0..1) to an address; the scene
## reads *mapped* values (in real units) back out. That indirection is what
## makes the show safe to play live and easy to hand to more performers:
##
##   - every value is clamped, so a wild input can't break a frame
##   - every value is smoothed, so knob steps don't read as jumps on screen
##   - an address can be owned by one performer, so two people can't fight
##   - a performer picking up a control someone else moved has to "catch" the
##     current value first (soft takeover), so nothing snaps
##
## Kinds:
##   VALUE   - a continuous control, mapped from 0..1 into [min, max]
##   TOGGLE  - on/off; an input above 0.5 flips it (rising edge)
##   TRIGGER - fires the `triggered` signal on a rising edge, holds no state
##   SELECT  - a continuous control read as an index into a list of options

signal defined(address: String)
signal changed(address: String, value: float)
signal triggered(address: String, source: String)

enum Kind { VALUE, TOGGLE, TRIGGER, SELECT }

## How close (in 0..1) an incoming value must be to the current one before a
## new source takes over a control someone else last moved.
const PICKUP_WINDOW := 0.04

var _params := {}          # address -> Param
var _owners := {}          # address prefix -> source id
var _order: Array[String] = []


class Param:
	var address: String
	var kind: int = Kind.VALUE
	var min_value := 0.0
	var max_value := 1.0
	var curve := "lin"      # "lin" or "exp" (exp suits rates, sizes, frequencies)
	var smooth := 0.08      # seconds to settle; 0 = immediate
	var options: Array = [] # SELECT only
	var norm := 0.0         # smoothed, what the scene sees
	var target := 0.0       # where norm is heading
	var default_norm := 0.0
	var pickup := true
	var fade := -1.0        # one-off smoothing for the current move (set_value)
	var last_source := ""
	var last_input := {}    # source -> last normalized value it sent

	func mapped() -> float:
		if kind != Kind.VALUE:
			return norm
		if curve == "exp" and min_value > 0.0 and max_value > 0.0:
			return min_value * pow(max_value / min_value, norm)
		return lerpf(min_value, max_value, norm)

	func unmap(v: float) -> float:
		if kind != Kind.VALUE:
			return clampf(v, 0.0, 1.0)
		if is_equal_approx(max_value, min_value):
			return 0.0
		if curve == "exp" and min_value > 0.0 and max_value > 0.0 and v > 0.0:
			return clampf(log(v / min_value) / log(max_value / min_value), 0.0, 1.0)
		return clampf(inverse_lerp(min_value, max_value, v), 0.0, 1.0)


## Declare a control. Safe to call twice; the second call is ignored so that a
## scene can declare what it needs without caring who declared it first.
##
## spec keys (all optional):
##   kind: "value" | "toggle" | "trigger" | "select"
##   min, max, default   - real units (VALUE); default is 0/1 for TOGGLE
##   curve: "lin" | "exp"
##   smooth: seconds
##   options: Array      - SELECT
##   pickup: bool        - soft takeover on (default true for VALUE)
func define(address: String, spec: Dictionary = {}) -> void:
	if _params.has(address):
		return
	var p := Param.new()
	p.address = address
	match String(spec.get("kind", "value")):
		"toggle": p.kind = Kind.TOGGLE
		"trigger": p.kind = Kind.TRIGGER
		"select": p.kind = Kind.SELECT
		_: p.kind = Kind.VALUE
	p.min_value = float(spec.get("min", 0.0))
	p.max_value = float(spec.get("max", 1.0))
	p.curve = String(spec.get("curve", "lin"))
	p.smooth = float(spec.get("smooth", 0.08 if p.kind == Kind.VALUE else 0.0))
	p.options = spec.get("options", [])
	p.pickup = bool(spec.get("pickup", p.kind == Kind.VALUE or p.kind == Kind.SELECT))
	p.default_norm = p.unmap(float(spec.get("default", p.min_value)))
	if p.kind == Kind.SELECT and spec.has("default"):
		p.default_norm = _select_norm(p, spec["default"])
	p.norm = p.default_norm
	p.target = p.default_norm
	_params[address] = p
	_order.append(address)
	defined.emit(address)


func has(address: String) -> bool:
	return _params.has(address)


func addresses() -> Array[String]:
	return _order


func kind_of(address: String) -> int:
	var p: Param = _params.get(address)
	return p.kind if p else -1


## The value in real units (VALUE), 0/1 (TOGGLE), or 0..1 (SELECT).
func value(address: String, fallback := 0.0) -> float:
	var p: Param = _params.get(address)
	return p.mapped() if p else fallback


## The smoothed 0..1 position of the control.
func norm(address: String) -> float:
	var p: Param = _params.get(address)
	return p.norm if p else 0.0


func is_on(address: String) -> bool:
	return value(address) > 0.5


## For SELECT: which option is chosen right now.
func selected(address: String) -> Variant:
	var p: Param = _params.get(address)
	if p == null or p.options.is_empty():
		return null
	var i := clampi(int(p.target * p.options.size()), 0, p.options.size() - 1)
	return p.options[i]


## Move a control by `amount` of its 0..1 range, skipping soft takeover -
## for keyboard nudges, where there's no physical position to catch up.
func nudge(address: String, amount: float, source := "local") -> void:
	var p: Param = _params.get(address)
	if p and _may_write(address, source):
		_set_target(p, p.target + amount, source)


## For SELECT: move to the next (+1) or previous (-1) option, wrapping.
## Lets a button cycle through sources where a knob would be too fiddly.
func step(address: String, direction: int, source := "local") -> void:
	var p: Param = _params.get(address)
	if p == null or p.kind != Kind.SELECT or p.options.is_empty() or not _may_write(address, source):
		return
	var n := p.options.size()
	var i := clampi(int(p.target * n), 0, n - 1)
	i = posmod(i + direction, n)
	_set_target(p, (i + 0.5) / n, source)


func set_options(address: String, options: Array) -> void:
	var p: Param = _params.get(address)
	if p:
		p.options = options


## The one way values get in. `source` names who is writing: "midi",
## "osc:192.168.1.20:9000", "keys", "story". Returns false if the write was
## refused (owned by someone else, or waiting for soft takeover).
func input(address: String, normalized: float, source := "local") -> bool:
	var p: Param = _params.get(address)
	if p == null:
		return false
	if not _may_write(address, source):
		return false
	var v := clampf(normalized, 0.0, 1.0)
	var prev: float = p.last_input.get(source, -1.0)
	p.last_input[source] = v

	match p.kind:
		Kind.TRIGGER:
			if v >= 0.5 and prev < 0.5:
				triggered.emit(address, source)
			return true
		Kind.TOGGLE:
			if v >= 0.5 and prev < 0.5:
				_set_target(p, 0.0 if p.target > 0.5 else 1.0, source)
			return true
		_:
			if p.pickup and p.last_source != "" and p.last_source != source:
				# Soft takeover: accept once this source is near the current
				# value, or has swept across it since its last message.
				var near := absf(v - p.target) <= PICKUP_WINDOW
				var crossed := prev >= 0.0 and signf(prev - p.target) != signf(v - p.target)
				if not (near or crossed):
					return false
			_set_target(p, v, source)
			return true


## Set a control directly in real units, bypassing soft takeover. For the
## story's authored looks and for recalling snapshots. `fade` overrides the
## control's smoothing for this one move.
func set_value(address: String, real_value: float, source := "local", fade := -1.0) -> void:
	var p: Param = _params.get(address)
	if p == null:
		return
	_set_target(p, p.unmap(real_value), source, fade)


## Fire a trigger from code (keyboard shortcuts, the story player).
func fire(address: String, source := "local") -> void:
	if _params.has(address) and _may_write(address, source):
		triggered.emit(address, source)


## Everyone's current positions, normalized. Enough to rebuild a look.
func snapshot(prefix := "/") -> Dictionary:
	var out := {}
	for a in _order:
		var p: Param = _params[a]
		if a.begins_with(prefix) and p.kind != Kind.TRIGGER:
			out[a] = p.target
	return out


func recall(snap: Dictionary, source := "recall") -> void:
	for a in snap:
		var p: Param = _params.get(a)
		if p:
			_set_target(p, float(snap[a]), source)


func reset(prefix := "/") -> void:
	for a in _order:
		var p: Param = _params[a]
		if a.begins_with(prefix):
			_set_target(p, p.default_norm, "reset")


# --- ownership -------------------------------------------------------------

## Give `source` exclusive control of every address under `prefix`
## (e.g. "/lens" for a camera operator). Longest matching prefix wins.
func claim(prefix: String, source: String) -> void:
	_owners[prefix] = source


func release(prefix: String) -> void:
	_owners.erase(prefix)


func owner_of(address: String) -> String:
	var best := ""
	var who := ""
	for prefix in _owners:
		if address.begins_with(prefix) and prefix.length() > best.length():
			best = prefix
			who = _owners[prefix]
	return who


func owners() -> Dictionary:
	return _owners.duplicate()


func _may_write(address: String, source: String) -> bool:
	# The show itself (story looks, resets, recalls) always gets through;
	# ownership is about performers not colliding with each other.
	if source in ["story", "reset", "recall", "local"]:
		return true
	var who := owner_of(address)
	return who == "" or who == source


# --- internals -------------------------------------------------------------

func _set_target(p: Param, v: float, source: String, fade := -1.0) -> void:
	p.target = clampf(v, 0.0, 1.0)
	p.last_source = source
	p.fade = fade
	if _smoothing(p) <= 0.0 or p.kind != Kind.VALUE:
		if not is_equal_approx(p.norm, p.target):
			p.norm = p.target
			changed.emit(p.address, p.mapped())


func _smoothing(p: Param) -> float:
	return p.fade if p.fade >= 0.0 else p.smooth


func _select_norm(p: Param, option: Variant) -> float:
	var i := p.options.find(option)
	if i < 0 or p.options.is_empty():
		return 0.0
	return (i + 0.5) / p.options.size()


func _process(delta: float) -> void:
	for a in _order:
		var p: Param = _params[a]
		if is_equal_approx(p.norm, p.target):
			continue
		var s := _smoothing(p)
		if s <= 0.0:
			p.norm = p.target
		else:
			# Frame-rate independent exponential approach.
			p.norm = lerpf(p.norm, p.target, 1.0 - exp(-delta * 4.0 / s))
			if absf(p.norm - p.target) < 0.0005:
				p.norm = p.target
		if p.norm == p.target:
			p.fade = -1.0
		changed.emit(a, p.mapped())
