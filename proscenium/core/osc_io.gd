extends Node
## OSC over UDP, in both directions.
##
## IN:  any message whose address is on the bus sets that control. Values are
##      normalized 0..1 (a TouchOSC fader, a Max [scale 0. 1.], a phone
##      slider). Each sender is its own source, so two performers on two
##      devices are two sources and ownership / soft takeover apply.
##
##      A few addresses talk to the show rather than a control:
##        /proscenium/claim   s:prefix   this sender owns everything under prefix
##        /proscenium/release s:prefix
##        /proscenium/dump               send every control's value back to me
##        /proscenium/hello   i:port     also mirror changes to me on this port
##
## OUT: every change on the bus is mirrored to the targets in config/show.json
##      (and to anyone who said hello), coalesced to one message per control
##      per frame. That feeds motorized faders, TouchOSC displays, Max, or a
##      second machine.

const CONFIG_PATH := "res://config/show.json"

var listen_port := 9000
var _rx := PacketPeerUDP.new()
var _targets: Array = []   # [{host, port, prefix}]
var _pending := {}         # address -> value, flushed once per frame
var _listening := false


func _ready() -> void:
	var cfg := _load_config()
	var osc: Dictionary = cfg.get("osc", {})
	listen_port = int(osc.get("listen_port", listen_port))
	for t in osc.get("send", []):
		_add_target(String(t.get("host", "127.0.0.1")), int(t.get("port", 9001)), String(t.get("prefix", "/")))
	var err := _rx.bind(listen_port, "*")
	_listening = err == OK
	if not _listening:
		push_warning("OSC: could not listen on port %d (error %d)" % [listen_port, err])
	Bus.changed.connect(_on_changed)


func is_listening() -> bool:
	return _listening


func send(address: String, args: Array = [], host := "", port := 0) -> void:
	var packet := Osc.encode(address, args)
	if host != "":
		_send_to(host, port, packet)
		return
	for t in _targets:
		if address.begins_with(t.prefix):
			_send_to(t.host, t.port, packet)


func _process(_delta: float) -> void:
	while _rx.get_available_packet_count() > 0:
		var packet := _rx.get_packet()
		var source := "osc:%s:%d" % [_rx.get_packet_ip(), _rx.get_packet_port()]
		var host := _rx.get_packet_ip()
		for msg in Osc.decode(packet):
			_handle(msg[0], msg[1], source, host)
	if not _pending.is_empty():
		for a in _pending:
			send(a, [float(_pending[a])])
		_pending.clear()


func _handle(address: String, args: Array, source: String, host: String) -> void:
	match address:
		"/proscenium/claim":
			if args.size() > 0:
				Bus.claim(String(args[0]), source)
			return
		"/proscenium/release":
			if args.size() > 0:
				Bus.release(String(args[0]))
			return
		"/proscenium/dump":
			var port := int(source.get_slice(":", 2))
			for a in Bus.addresses():
				send(a, [Bus.norm(a)], host, port)
			return
		"/proscenium/hello":
			var port := int(args[0]) if args.size() > 0 else int(source.get_slice(":", 2))
			_add_target(host, port, "/")
			return
	if not Bus.has(address):
		return
	var first: Variant = args[0] if args.size() > 0 else null
	var v := 1.0
	if first is bool:
		v = 1.0 if first else 0.0
	elif first is float or first is int:
		v = float(first)
	if Bus.kind_of(address) == Bus.Kind.TRIGGER and args.is_empty():
		# A bare "/story/go" with no argument is a press.
		Bus.input(address, 0.0, source)
	Bus.input(address, v, source)


func _on_changed(address: String, _value: float) -> void:
	if _targets.is_empty():
		return
	_pending[address] = Bus.norm(address)


func _add_target(host: String, port: int, prefix: String) -> void:
	for t in _targets:
		if t.host == host and t.port == port:
			return
	_targets.append({"host": host, "port": port, "prefix": prefix})


func _send_to(host: String, port: int, packet: PackedByteArray) -> void:
	var tx := PacketPeerUDP.new()
	tx.set_dest_address(host, port)
	tx.put_packet(packet)
	tx.close()


func _load_config() -> Dictionary:
	if not FileAccess.file_exists(CONFIG_PATH):
		return {}
	var data = JSON.parse_string(FileAccess.get_file_as_string(CONFIG_PATH))
	return data if data is Dictionary else {}
