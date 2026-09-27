class_name CameraRig
extends Node3D
## The live camera (layer 3, Lens - the physical part; the glass effects are
## the "lens" patch). An orbit around a look-at point that glides between
## targets, with drift, shake and depth of field - all on the bus.
##
##   /lens/orbit     degrees around the target
##   /lens/drift     continuous orbit speed (deg/s), for slow live moves
##   /lens/distance  metres from the target
##   /lens/height    metres above the stage floor
##   /lens/fov       field of view
##   /lens/shake     handheld feel
##   /lens/blur      background depth-of-field
##   /lens/target    which mark or actor to look at (SELECT)

var camera: Camera3D
var _targets := {}          # name -> [Node3D, offset]
var _look := Vector3.ZERO
var _drift_angle := 0.0
var _shake := FastNoiseLite.new()
var _time := 0.0
var _attributes := CameraAttributesPractical.new()


func _ready() -> void:
	camera = Camera3D.new()
	camera.name = "Camera"
	camera.current = true
	camera.attributes = _attributes
	add_child(camera)
	Bus.define("/lens/orbit", {"min": -180.0, "max": 180.0, "default": 0.0, "smooth": 0.3})
	Bus.define("/lens/drift", {"min": -30.0, "max": 30.0, "default": 0.0, "smooth": 0.5})
	Bus.define("/lens/distance", {"min": 1.5, "max": 16.0, "default": 7.5, "curve": "exp", "smooth": 0.4})
	Bus.define("/lens/height", {"min": 0.2, "max": 6.0, "default": 1.9, "smooth": 0.4})
	Bus.define("/lens/fov", {"min": 12.0, "max": 90.0, "default": 40.0, "smooth": 0.3})
	Bus.define("/lens/shake", {"min": 0.0, "max": 1.0, "default": 0.0})
	Bus.define("/lens/blur", {"min": 0.0, "max": 1.0, "default": 0.0})
	Bus.define("/lens/target", {"kind": "select", "options": [], "smooth": 0.0, "pickup": false})
	_shake.frequency = 0.6


## Something the camera can look at. `offset` is added to its position
## (e.g. head height for an actor).
func add_target(target_name: String, node: Node3D, offset := Vector3.ZERO) -> void:
	_targets[target_name] = [node, offset]
	var names: Array = _targets.keys()
	var current = Bus.selected("/lens/target")
	Bus.set_options("/lens/target", names)
	var keep: String = current if current != null else names[0]
	Bus.set_value("/lens/target", (names.find(keep) + 0.5) / names.size(), "local")


func _process(delta: float) -> void:
	_time += delta
	var target = Bus.selected("/lens/target")
	if target != null and _targets.has(target):
		var entry: Array = _targets[target]
		var node: Node3D = entry[0]
		var goal: Vector3 = node.global_position + entry[1]
		_look = _look.lerp(goal, 1.0 - exp(-delta * 2.0))

	_drift_angle = fmod(_drift_angle + Bus.value("/lens/drift") * delta, 360.0)
	var angle := deg_to_rad(Bus.value("/lens/orbit") + _drift_angle)
	var distance := Bus.value("/lens/distance")
	var pos := Vector3(_look.x + sin(angle) * distance, Bus.value("/lens/height"), _look.z + cos(angle) * distance)

	var shake := Bus.value("/lens/shake")
	if shake > 0.001:
		var s := _time * 1.7
		pos += Vector3(_shake.get_noise_2d(s, 0.0), _shake.get_noise_2d(0.0, s), _shake.get_noise_2d(s, s)) * shake * 0.35

	camera.global_position = pos
	if not pos.is_equal_approx(_look):
		camera.look_at(_look, Vector3.UP)
	camera.fov = Bus.value("/lens/fov")

	var blur := Bus.value("/lens/blur")
	_attributes.dof_blur_far_enabled = blur > 0.01
	_attributes.dof_blur_far_distance = distance + 1.0
	_attributes.dof_blur_far_transition = 3.0
	_attributes.dof_blur_amount = blur * 0.25
