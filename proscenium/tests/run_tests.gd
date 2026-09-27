extends Node
## Headless checks for the parts that must not break in a show.
##
##   godot --headless --fixed-fps 60 --path . res://tests/run_tests.tscn
##
## Exits 0 if everything passed, 1 otherwise.

var _failures := 0
var _passes := 0


func _ready() -> void:
	await get_tree().process_frame
	_test_osc_codec()
	_test_bus()
	await _test_show()
	print("\n%d passed, %d failed" % [_passes, _failures])
	get_tree().quit(1 if _failures > 0 else 0)


func check(cond: bool, what: String) -> void:
	if cond:
		_passes += 1
		print("  ok   ", what)
	else:
		_failures += 1
		print("  FAIL ", what)


func near(a: float, b: float, eps := 0.01) -> bool:
	return absf(a - b) <= eps


func frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame


# ---------------------------------------------------------------------------

func _test_osc_codec() -> void:
	print("OSC codec")
	var packet := Osc.encode("/lens/orbit", [0.25, 3, "hi", true])
	check(packet.size() % 4 == 0, "packets are 4-byte aligned")
	var msgs := Osc.decode(packet)
	check(msgs.size() == 1 and msgs[0][0] == "/lens/orbit", "address round-trips")
	var args: Array = msgs[0][1]
	check(args.size() == 4 and near(args[0], 0.25) and args[1] == 3 and args[2] == "hi" and args[3] == true, "f i s T round-trip")

	# A bundle holding two messages, as TouchOSC / Max send them.
	var a := Osc.encode("/a", [1.0])
	var b := Osc.encode("/b", [0.5])
	var bundle := PackedByteArray()
	bundle.append_array("#bundle".to_utf8_buffer())
	bundle.append(0)
	bundle.resize(bundle.size() + 8) # timetag
	for m in [a, b]:
		var size := StreamPeerBuffer.new()
		size.big_endian = true
		size.put_32(m.size())
		bundle.append_array(size.data_array)
		bundle.append_array(m)
	var both := Osc.decode(bundle)
	check(both.size() == 2 and both[1][0] == "/b" and near(both[1][1][0], 0.5), "bundles flatten")
	check(Osc.decode(PackedByteArray([1, 2, 3])).is_empty(), "garbage is ignored, not fatal")


func _test_bus() -> void:
	print("Bus")
	Bus.define("/t/lin", {"min": 10.0, "max": 20.0, "default": 15.0, "smooth": 0.0})
	check(near(Bus.value("/t/lin"), 15.0), "default in real units")
	Bus.input("/t/lin", 1.5, "a")
	check(near(Bus.value("/t/lin"), 20.0), "input clamps to range")

	Bus.define("/t/exp", {"min": 1.0, "max": 100.0, "default": 10.0, "curve": "exp", "smooth": 0.0})
	check(near(Bus.norm("/t/exp"), 0.5), "exp curve: 10 is halfway between 1 and 100")

	# Soft takeover: B can't yank a control A is holding until B reaches it.
	Bus.define("/t/pick", {"smooth": 0.0})
	Bus.input("/t/pick", 0.8, "a")
	check(not Bus.input("/t/pick", 0.1, "b"), "soft takeover refuses a far value")
	check(near(Bus.norm("/t/pick"), 0.8), "value unchanged after refusal")
	check(Bus.input("/t/pick", 0.79, "b"), "soft takeover accepts once near")
	Bus.input("/t/pick", 0.5, "a")
	Bus.input("/t/pick", 0.3, "b") # b at 0.3 is far from 0.5: refused
	check(Bus.input("/t/pick", 0.7, "b"), "sweeping across the value also takes over")

	# Ownership.
	Bus.define("/t/own/x", {"smooth": 0.0})
	Bus.claim("/t/own", "cam-op")
	check(not Bus.input("/t/own/x", 0.9, "lights-op"), "owned prefix refuses other sources")
	check(Bus.input("/t/own/x", 0.9, "cam-op"), "owner can write")
	Bus.release("/t/own")
	check(Bus.input("/t/own/x", 0.88, "lights-op"), "released prefix is open again")

	# Toggle and trigger edges.
	Bus.define("/t/tog", {"kind": "toggle"})
	Bus.input("/t/tog", 1.0, "m")
	Bus.input("/t/tog", 1.0, "m")
	check(Bus.is_on("/t/tog"), "toggle flips on a rising edge only")
	Bus.input("/t/tog", 0.0, "m")
	Bus.input("/t/tog", 1.0, "m")
	check(not Bus.is_on("/t/tog"), "second press turns it off")
	var fired := [0]
	var cb := func(addr, _src): if addr == "/t/trig": fired[0] += 1
	Bus.triggered.connect(cb)
	Bus.define("/t/trig", {"kind": "trigger"})
	Bus.input("/t/trig", 1.0, "m")
	Bus.input("/t/trig", 1.0, "m")
	Bus.input("/t/trig", 0.0, "m")
	Bus.input("/t/trig", 1.0, "m")
	Bus.triggered.disconnect(cb)
	check(fired[0] == 2, "trigger fires once per press")

	# Select stepping wraps.
	Bus.define("/t/sel", {"kind": "select", "options": ["a", "b", "c"], "default": "c"})
	check(Bus.selected("/t/sel") == "c", "select default by name")
	Bus.step("/t/sel", 1)
	check(Bus.selected("/t/sel") == "a", "step wraps around")

	var snap := Bus.snapshot("/t/")
	Bus.input("/t/lin", 0.0, "a")
	Bus.recall(snap)
	check(near(Bus.value("/t/lin"), 20.0), "snapshot / recall")


func _test_show() -> void:
	print("Show")
	var show: Node = load("res://stage/stage.tscn").instantiate()
	add_child(show)
	await frames(2)

	var names := TexturePool.names()
	for n in ["noise", "bands", "feedback", "lens", "screen", "stage"]:
		check(n in names, "pool has '%s'" % n)
	var surf := TexturePool.surface_names()
	check(not ("stage" in surf or "lens" in surf or "screen" in surf), "post-only textures are not offered to surfaces")
	check(Bus.selected("/surface/wall/source") == "feedback", "wall starts on its default source")
	check(Bus.selected("/tex/feedback/source") == "noise", "feedback input defaults to noise")
	check(not ("feedback" in Bus._params["/tex/feedback/source"].options), "a pass can't select itself")

	var story: StoryPlayer = show.story
	var mara: Node3D = show.set_3d.actors["mara"].get_node("Blocking")
	check(story.index == 0 and story.beats.size() == 6, "story loaded at beat 1")

	# Beat 1 is Mara's 4s entrance. At 60fps, 2s in she should be mid-walk.
	await frames(120)
	check(story.index == 0 and near(story.beat_time, 2.0, 0.1), "story time follows the clock at rate 1")
	check(mara.position.x > -4.9 and mara.position.x < -2.5, "actor is mid-entrance (x=%.2f)" % mara.position.x)

	# Hold: story time stops, the actor stays put, and the idle blends in.
	Bus.set_value("/story/hold", 1.0, "test")
	var t_held := story.beat_time
	var x_held := mara.position.x
	await frames(90)
	check(near(story.beat_time, t_held, 0.001), "hold freezes story time")
	check(near(mara.position.x, x_held, 0.01), "held actor stays on their mark (x=%.3f vs %.3f)" % [mara.position.x, x_held])
	var weight: float = show.set_3d.actors["mara"]._idle_weight
	check(weight > 0.99, "idle has blended in while held (%.2f)" % weight)
	Bus.fire("/story/go", "test")
	check(not Bus.is_on("/story/hold"), "GO releases a hold")

	# Half speed: 1s of clock = 0.5s of story.
	await frames(30) # let the rate smoothing settle at 1.0 first
	Bus.set_value("/story/rate", 0.5, "test", 0.0)
	await frames(2)
	var t0 := story.beat_time
	await frames(60)
	check(near(story.beat_time - t0, 0.5, 0.05), "rate 0.5 plays story at half speed (%.2f)" % (story.beat_time - t0))
	Bus.set_value("/story/rate", 1.0, "test", 0.0)

	# Run to the end of beat 3 ("She asks", end: hold) and wait there.
	story.jump(2)
	await frames(2)
	check(story.index == 2, "jump to beat 3")
	await frames(int(story.beat_length() * 60) + 30)
	check(story.waiting and story.index == 2, "a 'hold' beat waits for GO at its end")
	check(near(mara.position.x, 0.3, 0.02), "Mara ends the beat on her mark (x=%.2f)" % mara.position.x)

	Bus.fire("/story/go", "test")
	await frames(10)
	check(story.index == 3 and not story.waiting, "GO moves on to beat 4")
	check(near(mara.position.x, 0.3, 0.02), "Mara, resting this beat, stays where 'cross' left her")

	# Jumping back re-poses everyone from story time alone.
	story.jump(0)
	await frames(5)
	check(mara.position.x < -4.0, "jumping back to beat 1 returns Mara to the wings (x=%.2f)" % mara.position.x)

	# Looping beat.
	story.jump(5)
	Bus.set_value("/story/rate", 2.0, "test", 0.0)
	await frames(int(8.0 / 2.0 * 60) + 30)
	check(story.index == 5, "the loop beat keeps looping")
	check(near(Bus.value("/screen/feedback"), 0.75, 0.05), "the beat's look was applied (/screen/feedback)")
	Bus.set_value("/story/rate", 1.0, "test", 0.0)

	await _test_osc_network()
	show.queue_free()
	await frames(2)


func _test_osc_network() -> void:
	print("OSC over UDP")
	check(OscIO.is_listening(), "listening on :%d" % OscIO.listen_port)
	var tx := PacketPeerUDP.new()
	tx.set_dest_address("127.0.0.1", OscIO.listen_port)

	tx.put_packet(Osc.encode("/proscenium/claim", ["/lens"]))
	tx.put_packet(Osc.encode("/lens/fov", [0.0]))
	await frames(3)
	var fov_now := Bus.norm("/lens/fov")
	tx.put_packet(Osc.encode("/lens/fov", [fov_now + 0.01]))
	await frames(3)
	tx.put_packet(Osc.encode("/lens/fov", [1.0]))
	await frames(60)
	check(near(Bus.value("/lens/fov"), 90.0, 0.5), "an OSC fader drives /lens/fov (%.1f)" % Bus.value("/lens/fov"))
	check(Bus.owner_of("/lens/fov").begins_with("osc:127.0.0.1"), "OSC claim gave this sender /lens")
	check(not Bus.input("/lens/fov", 0.99, "midi:0"), "...so MIDI can't grab the camera now")
	tx.put_packet(Osc.encode("/proscenium/release", ["/lens"]))

	# Mirroring out: listen where show.json sends (127.0.0.1:9001).
	var rx := PacketPeerUDP.new()
	check(rx.bind(9001, "127.0.0.1") == OK, "bound a test listener on :9001")
	await frames(2)
	Bus.set_value("/world/glow", 1.5, "test", 0.0)
	await frames(3)
	var seen := false
	while rx.get_available_packet_count() > 0:
		for m in Osc.decode(rx.get_packet()):
			if m[0] == "/world/glow":
				seen = true
	check(seen, "bus changes are mirrored out over OSC")
	rx.close()
	tx.close()
