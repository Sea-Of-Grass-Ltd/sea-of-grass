class_name PlaceholderActor
extends RefCounted
## Stand-in characters built from primitives, with animations built in code,
## so the pipeline can be played before any Blender work exists. A Blender
## character replaces one of these by being imported with the same action
## names ("idle", "enter", "cross", ...) - see docs/BLENDER.md.
##
## The node layout mirrors what the story needs from any character:
##   <Actor>              StageActor
##     Blocking           position/rotation on stage - the beat animations
##       Body             breathing scale             - the idle animation
##         Torso, Head, ArmR
## The idle only animates Body and below, so holding the story never moves
## an actor off their mark.


## `beats`: action name -> {length, from: [x, z, yaw], to: [x, z, yaw],
##                          arm: [[t, degrees]...], head: [[t, pitch, yaw]...]}
static func build(actor_name: String, costume: Material, skin: Color, beats: Dictionary) -> StageActor:
	var actor := StageActor.new()
	actor.name = actor_name.capitalize()

	var blocking := Node3D.new()
	blocking.name = "Blocking"
	actor.add_child(blocking)
	var body := Node3D.new()
	body.name = "Body"
	blocking.add_child(body)

	var torso := MeshInstance3D.new()
	torso.name = "Torso"
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.28
	capsule.height = 1.5
	torso.mesh = capsule
	torso.position.y = 0.75
	torso.material_override = costume
	body.add_child(torso)

	var skin_mat := StandardMaterial3D.new()
	skin_mat.albedo_color = skin
	skin_mat.roughness = 0.6

	var head := Node3D.new()
	head.name = "Head"
	head.position.y = 1.52
	body.add_child(head)
	var skull := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.19
	sphere.height = 0.4
	skull.mesh = sphere
	skull.position.y = 0.16
	skull.material_override = skin_mat
	head.add_child(skull)
	var nose := MeshInstance3D.new() # which way they face
	var box := BoxMesh.new()
	box.size = Vector3(0.05, 0.06, 0.1)
	nose.mesh = box
	nose.position = Vector3(0, 0.14, -0.2)
	nose.material_override = skin_mat
	head.add_child(nose)

	var arm := Node3D.new()
	arm.name = "ArmR"
	arm.position = Vector3(0.32, 1.3, 0)
	body.add_child(arm)
	var limb := MeshInstance3D.new()
	var arm_mesh := CapsuleMesh.new()
	arm_mesh.radius = 0.07
	arm_mesh.height = 0.7
	limb.mesh = arm_mesh
	limb.position.y = -0.33
	limb.material_override = costume
	arm.add_child(limb)

	var lib := AnimationLibrary.new()
	lib.add_animation("idle", _idle())
	for action in beats:
		lib.add_animation(action, _action(beats[action]))
	actor.setup_from_library(lib, actor)
	return actor


static func _idle() -> Animation:
	var a := Animation.new()
	a.length = 3.6
	a.loop_mode = Animation.LOOP_LINEAR
	var breath := a.add_track(Animation.TYPE_SCALE_3D)
	a.track_set_path(breath, "Blocking/Body")
	a.scale_track_insert_key(breath, 0.0, Vector3.ONE)
	a.scale_track_insert_key(breath, 1.5, Vector3(1.025, 1.03, 1.025))
	a.scale_track_insert_key(breath, 3.6, Vector3.ONE)
	var head := a.add_track(Animation.TYPE_ROTATION_3D)
	a.track_set_path(head, "Blocking/Body/Head")
	a.rotation_track_insert_key(head, 0.0, _euler(0, 0))
	a.rotation_track_insert_key(head, 1.2, _euler(-4, 6))
	a.rotation_track_insert_key(head, 2.6, _euler(2, -4))
	a.rotation_track_insert_key(head, 3.6, _euler(0, 0))
	var arm := a.add_track(Animation.TYPE_ROTATION_3D)
	a.track_set_path(arm, "Blocking/Body/ArmR")
	a.rotation_track_insert_key(arm, 0.0, _euler(0, 0, 4))
	a.rotation_track_insert_key(arm, 1.8, _euler(3, 0, 7))
	a.rotation_track_insert_key(arm, 3.6, _euler(0, 0, 4))
	return a


static func _action(spec: Dictionary) -> Animation:
	var a := Animation.new()
	a.length = float(spec.get("length", 4.0))
	var from: Array = spec.get("from", [0, 0, 0])
	var to: Array = spec.get("to", from)

	var pos := a.add_track(Animation.TYPE_POSITION_3D)
	a.track_set_path(pos, "Blocking")
	a.position_track_insert_key(pos, 0.0, Vector3(from[0], 0, from[1]))
	a.position_track_insert_key(pos, a.length, Vector3(to[0], 0, to[1]))
	var rot := a.add_track(Animation.TYPE_ROTATION_3D)
	a.track_set_path(rot, "Blocking")
	a.rotation_track_insert_key(rot, 0.0, _euler(0, from[2]))
	for k in spec.get("turn", []): # [[t, yaw]...] for turns that need a path
		a.rotation_track_insert_key(rot, k[0], _euler(0, k[1]))
	a.rotation_track_insert_key(rot, a.length, _euler(0, to[2]))

	if spec.has("arm"):
		var arm := a.add_track(Animation.TYPE_ROTATION_3D)
		a.track_set_path(arm, "Blocking/Body/ArmR")
		for k in spec["arm"]:
			a.rotation_track_insert_key(arm, k[0], _euler(k[1], 0, 4))
	if spec.has("head"):
		var head := a.add_track(Animation.TYPE_ROTATION_3D)
		a.track_set_path(head, "Blocking/Body/Head")
		for k in spec["head"]:
			a.rotation_track_insert_key(head, k[0], _euler(k[1], k[2]))
	return a


static func _euler(pitch_deg: float, yaw_deg: float, roll_deg := 0.0) -> Quaternion:
	return Quaternion.from_euler(Vector3(deg_to_rad(pitch_deg), deg_to_rad(yaw_deg), deg_to_rad(roll_deg)))
