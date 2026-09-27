extends Node
## Prints every control on the bus as a Markdown table (docs/CONTROLS.md is
## generated from this, so it can't drift from the code):
##
##   godot --headless --path . res://tools/dump_controls.tscn > table.md

func _ready() -> void:
	var show: Node = load("res://stage/stage.tscn").instantiate()
	add_child(show)
	await get_tree().process_frame
	await get_tree().process_frame
	var kinds := {Bus.Kind.VALUE: "value", Bus.Kind.TOGGLE: "toggle", Bus.Kind.TRIGGER: "trigger", Bus.Kind.SELECT: "select"}
	var groups := {}
	for a in Bus.addresses():
		var g := a.split("/")[1]
		if not groups.has(g):
			groups[g] = []
		groups[g].append(a)
	for g in ["story", "show", "lens", "world", "surface", "tex", "screen"]:
		if not groups.has(g):
			continue
		print("\n### /%s\n" % g)
		print("| Address | Kind | Range | Default |")
		print("|---|---|---|---|")
		for a in groups[g]:
			_row(a, kinds)
	get_tree().quit()


func _row(a: String, kinds: Dictionary) -> void:
	var p = Bus._params[a]
	var rng := ""
	var def := ""
	match p.kind:
		Bus.Kind.VALUE:
			rng = "%s – %s%s" % [_n(p.min_value), _n(p.max_value), " (exp)" if p.curve == "exp" else ""]
			var saved: float = p.norm
			p.norm = p.default_norm
			def = _n(p.mapped())
			p.norm = saved
		Bus.Kind.SELECT:
			rng = ", ".join(p.options.map(func(o): return str(o)))
			def = str(Bus.selected(a))
		Bus.Kind.TOGGLE:
			def = "on" if p.default_norm > 0.5 else "off"
	print("| `%s` | %s | %s | %s |" % [a, kinds[p.kind], rng, def])


func _n(v: float) -> String:
	var s := "%.3f" % v
	while s.ends_with("0"):
		s = s.left(-1)
	return s.trim_suffix(".")
