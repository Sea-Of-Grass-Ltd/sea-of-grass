class_name DemoSet
extends Node3D
## The test scene's physical world: floor, cyclorama wall, two actors,
## light, fog, particles and the camera - each wired to the bus. A real
## scene would be a .tscn built in the editor from Blender assets; this one
## is built in code so the whole prototype is readable top to bottom.
##
## Layer 2 (World) controls defined here:
##   /world/light/key/intensity  /world/light/key/hue  /world/light/key/sat
##   /world/light/key/angle      /world/ambient
##   /world/fog/density          /world/fog/hue
##   /world/glow
##   /world/particles/amount     /world/particles/speed
##   /world/particles/size       /world/particles/glow
##   /world/particles/source     (SELECT, a pool texture)

const STAGE_EXTENT := Vector2(12.0, 8.0)

var rig: CameraRig
var actors := {}          # name -> StageActor
var surfaces := {}        # name -> SurfaceBinding

var _key: SpotLight3D
var _env: Environment
var _particles: GPUParticles3D
var _particle_mat: ShaderMaterial


func _ready() -> void:
	_define_controls()
	_build_surfaces()
	_build_architecture()
	_build_actors()
	_build_light_and_air()
	_build_particles()
	rig = CameraRig.new()
	rig.name = "CameraRig"
	add_child(rig)
	rig.add_target("stage", self, Vector3(0, 1.0, 0))
	rig.add_target("mara", actors["mara"].get_node("Blocking"), Vector3(0, 1.5, 0))
	rig.add_target("tomas", actors["tomas"].get_node("Blocking"), Vector3(0, 1.5, 0))
	rig.add_target("wall", self, Vector3(0, 2.5, -3.5))


func _define_controls() -> void:
	Bus.define("/world/light/key/intensity", {"min": 0.0, "max": 40.0, "default": 14.0, "smooth": 0.3})
	Bus.define("/world/light/key/hue", {"min": 0.0, "max": 1.0, "default": 0.09, "smooth": 0.3})
	Bus.define("/world/light/key/sat", {"min": 0.0, "max": 1.0, "default": 0.35})
	Bus.define("/world/light/key/angle", {"min": 8.0, "max": 70.0, "default": 32.0})
	Bus.define("/world/ambient", {"min": 0.0, "max": 1.5, "default": 0.25})
	Bus.define("/world/fog/density", {"min": 0.0, "max": 0.12, "default": 0.02, "smooth": 0.5})
	Bus.define("/world/fog/hue", {"min": 0.0, "max": 1.0, "default": 0.6})
	Bus.define("/world/glow", {"min": 0.0, "max": 2.0, "default": 0.6})
	Bus.define("/world/particles/amount", {"min": 0.0, "max": 1.0, "default": 0.4})
	Bus.define("/world/particles/speed", {"min": 0.0, "max": 4.0, "default": 1.0})
	Bus.define("/world/particles/size", {"min": 0.2, "max": 5.0, "default": 1.0, "curve": "exp"})
	Bus.define("/world/particles/glow", {"min": 0.0, "max": 6.0, "default": 1.5})
	TexturePool.bind_select("/world/particles/source", "noise", true)


func _build_surfaces() -> void:
	surfaces["wall"] = SurfaceBinding.create("wall", Color(0.16, 0.16, 0.18), "feedback", {"amount": 0.85, "glow": 0.9})
	surfaces["floor"] = SurfaceBinding.create("floor", Color(0.12, 0.11, 0.1), "noise", {"amount": 0.3, "glow": 0.1, "tiling": 2.0})
	surfaces["costume"] = SurfaceBinding.create("costume", Color(0.55, 0.5, 0.45), "bands", {"amount": 0.35, "glow": 0.2, "tiling": 2.0})
	for s in surfaces.values():
		add_child(s)


func _build_architecture() -> void:
	var floor_mesh := MeshInstance3D.new()
	floor_mesh.name = "Floor"
	var plane := PlaneMesh.new()
	plane.size = STAGE_EXTENT
	floor_mesh.mesh = plane
	surfaces["floor"].apply_to(floor_mesh)
	add_child(floor_mesh)

	var wall := MeshInstance3D.new()
	wall.name = "Cyclorama"
	var quad := QuadMesh.new()
	quad.size = Vector2(STAGE_EXTENT.x, 7.0)
	wall.mesh = quad
	wall.position = Vector3(0, 3.5, -STAGE_EXTENT.y * 0.5 + 0.5)
	surfaces["wall"].apply_to(wall)
	add_child(wall)


func _build_actors() -> void:
	var costume: Material = surfaces["costume"].material
	# Blocking: [x, z, yaw°]. yaw -90 faces stage right (+x), +90 stage left.
	actors["mara"] = PlaceholderActor.build("mara", costume, Color(0.85, 0.7, 0.6), {
		"enter": {"length": 4.0, "from": [-5.0, 1.4, -70], "to": [-2.4, 0.6, -90],
			"head": [[0.0, 0, 20], [2.0, -5, -15], [4.0, 0, 0]]},
		"cross": {"length": 4.0, "from": [-2.4, 0.6, -90], "to": [0.3, 0.4, -65]},
		"ask": {"length": 4.0, "from": [0.3, 0.4, -65], "to": [0.3, 0.4, -65],
			"arm": [[0.0, 0], [1.2, -95], [3.0, -95], [4.0, -10]],
			"head": [[0.0, 0, 0], [1.2, 8, 0], [4.0, 3, 0]]},
	})
	actors["tomas"] = PlaceholderActor.build("tomas", costume, Color(0.55, 0.42, 0.34), {
		"wait": {"length": 4.0, "from": [2.2, -0.5, -90], "to": [2.2, -0.5, -90],
			"head": [[0.0, 0, 0], [2.5, -10, 10], [4.0, 0, 0]]},
		"turn": {"length": 3.0, "from": [2.2, -0.5, -90], "to": [2.2, -0.5, 90],
			"turn": [[1.5, -180]]},
		"answer": {"length": 4.0, "from": [2.2, -0.5, 90], "to": [2.2, -0.5, 90],
			"head": [[0.0, 0, 0], [0.6, 12, 0], [1.0, -2, 0], [1.4, 10, 0], [2.0, 0, 0]],
			"arm": [[0.0, 0], [2.0, -40], [4.0, 0]]},
	})
	for n in actors:
		add_child(actors[n])


func _build_light_and_air() -> void:
	_key = SpotLight3D.new()
	_key.name = "Key"
	_key.position = Vector3(-3.5, 6.0, 4.0)
	_key.spot_range = 20.0
	_key.shadow_enabled = true
	_key.light_volumetric_fog_energy = 2.0
	add_child(_key)
	_key.look_at(Vector3(0.5, 0.8, 0.0))

	var rim := OmniLight3D.new()
	rim.name = "Rim"
	rim.position = Vector3(3.0, 3.0, -2.5)
	rim.light_color = Color(0.5, 0.6, 1.0)
	rim.light_energy = 1.5
	rim.omni_range = 9.0
	add_child(rim)

	_env = Environment.new()
	_env.background_mode = Environment.BG_COLOR
	_env.background_color = Color(0.01, 0.01, 0.015)
	_env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	_env.glow_enabled = true
	_env.volumetric_fog_enabled = true
	_env.volumetric_fog_length = 30.0
	var world := WorldEnvironment.new()
	world.environment = _env
	add_child(world)


func _build_particles() -> void:
	_particles = GPUParticles3D.new()
	_particles.name = "Motes"
	_particles.amount = 1500
	_particles.lifetime = 9.0
	_particles.preprocess = 9.0
	_particles.visibility_aabb = AABB(Vector3(-8, -1, -6), Vector3(16, 10, 12))
	var process := ParticleProcessMaterial.new()
	process.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	process.emission_box_extents = Vector3(STAGE_EXTENT.x * 0.5, 0.2, STAGE_EXTENT.y * 0.5)
	process.direction = Vector3.UP
	process.spread = 25.0
	process.initial_velocity_min = 0.1
	process.initial_velocity_max = 0.45
	process.gravity = Vector3(0, 0.03, 0)
	process.turbulence_enabled = true
	process.turbulence_noise_strength = 0.6
	process.turbulence_noise_scale = 3.0
	var fade := Gradient.new()
	fade.set_color(0, Color(1, 1, 1, 0))
	fade.set_color(1, Color(1, 1, 1, 0))
	fade.add_point(0.2, Color(1, 1, 1, 1))
	fade.add_point(0.75, Color(1, 1, 1, 0.8))
	var ramp := GradientTexture1D.new()
	ramp.gradient = fade
	process.color_ramp = ramp
	_particles.process_material = process

	var quad := QuadMesh.new()
	quad.size = Vector2(0.06, 0.06)
	_particle_mat = ShaderMaterial.new()
	_particle_mat.shader = preload("res://materials/particles.gdshader")
	_particle_mat.set_shader_parameter("stage_extent", STAGE_EXTENT)
	quad.material = _particle_mat
	_particles.draw_pass_1 = quad
	add_child(_particles)


func _process(_delta: float) -> void:
	var hue := Bus.value("/world/light/key/hue")
	_key.light_color = Color.from_hsv(hue, Bus.value("/world/light/key/sat"), 1.0)
	_key.light_energy = Bus.value("/world/light/key/intensity")
	_key.spot_angle = Bus.value("/world/light/key/angle")

	var ambient := Bus.value("/world/ambient")
	_env.ambient_light_color = Color.from_hsv(Bus.value("/world/fog/hue"), 0.3, 1.0)
	_env.ambient_light_energy = ambient
	_env.volumetric_fog_density = Bus.value("/world/fog/density")
	_env.volumetric_fog_albedo = Color.from_hsv(Bus.value("/world/fog/hue"), 0.25, 1.0)
	_env.glow_intensity = Bus.value("/world/glow")

	_particles.amount_ratio = Bus.value("/world/particles/amount")
	_particles.speed_scale = Bus.value("/world/particles/speed")
	_particle_mat.set_shader_parameter("size", Bus.value("/world/particles/size"))
	_particle_mat.set_shader_parameter("glow", Bus.value("/world/particles/glow"))
	var tex := TexturePool.selected_texture("/world/particles/source")
	if tex:
		_particle_mat.set_shader_parameter("live_tex", tex)
