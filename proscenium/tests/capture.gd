extends Node
## Renders a few frames of the show to PNG, for checking the look without a
## screen. Needs a real renderer (not --headless):
##
##   godot --fixed-fps 30 --path . res://tests/capture.tscn -- /some/dir
##
## Each shot sets some controls (like a performer would), lets them settle,
## and saves the window.

var shots := [
	{"name": "01_dusk", "beat": 0, "wait": 75, "set": {}},
	{"name": "02_she_asks_close", "beat": 2, "wait": 60,
		"set": {"/lens/target": "mara", "/lens/distance": 3.2, "/lens/height": 1.7, "/lens/orbit": -40.0, "/lens/blur": 0.6}},
	{"name": "03_storm", "beat": 5, "wait": 150,
		"set": {"/lens/drift": 12.0, "/world/particles/amount": 1.0, "/world/particles/size": 2.0, "/surface/costume/amount": 0.9}},
	{"name": "04_kaleido_overlay", "beat": 4, "wait": 90,
		"set": {"/screen/kaleido": 6.0, "/screen/overlay": 0.5, "/screen/feedback": 0.85, "/screen/fb_zoom": 1.02, "/screen/hue": 0.1}},
	# The stage's own image, through the feedback patch, onto the stage wall:
	# a live infinity mirror. (Routing only - no code involved.)
	{"name": "05_mirror", "beat": 1, "wait": 120,
		"set": {"/tex/feedback/source": "stage", "/tex/feedback/mix": 0.35, "/tex/feedback/zoom": 1.03, "/surface/wall/source": "feedback"}},
]


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var out_dir: String = args[0] if args.size() > 0 else "user://captures"
	DirAccess.make_dir_recursive_absolute(out_dir)
	var show: Node = load("res://stage/stage.tscn").instantiate()
	add_child(show)
	show.hud.visible = false
	for shot in shots:
		Bus.reset("/")
		show.story.jump(shot["beat"])
		for a in shot["set"]:
			var v = shot["set"][a]
			if v is String:
				var opts: Array = Bus._params[a].options
				Bus.set_value(a, (opts.find(v) + 0.5) / opts.size(), "capture")
			else:
				Bus.set_value(a, v, "capture")
		for i in shot["wait"]:
			await get_tree().process_frame
		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		var path := out_dir.path_join(shot["name"] + ".png")
		img.save_png(path)
		print("saved ", path)
	get_tree().quit()
