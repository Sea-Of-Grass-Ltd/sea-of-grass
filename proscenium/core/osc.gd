class_name Osc
extends RefCounted
## Minimal OSC 1.0 encoder/decoder: messages and bundles, with the argument
## types every live tool actually sends (f, i, s, T, F, d, h). Nothing here
## touches the network; see osc_io.gd for that.


static func encode(address: String, args: Array = []) -> PackedByteArray:
	var tags := ","
	var body := StreamPeerBuffer.new()
	body.big_endian = true
	for a in args:
		match typeof(a):
			TYPE_FLOAT:
				tags += "f"
				body.put_float(a)
			TYPE_INT:
				tags += "i"
				body.put_32(a)
			TYPE_BOOL:
				tags += "T" if a else "F"
			_:
				tags += "s"
				body.put_data(_padded(String(a)))
	var out := PackedByteArray()
	out.append_array(_padded(address))
	out.append_array(_padded(tags))
	out.append_array(body.data_array)
	return out


## Returns an Array of [address: String, args: Array] pairs. Bundles are
## flattened (timetags ignored - everything is played "now"). Malformed
## packets return what could be read so far rather than raising.
static func decode(packet: PackedByteArray) -> Array:
	var out := []
	_decode_into(packet, out, 0)
	return out


static func _decode_into(packet: PackedByteArray, out: Array, depth: int) -> void:
	if packet.is_empty() or depth > 8:
		return
	var buf := StreamPeerBuffer.new()
	buf.big_endian = true
	buf.data_array = packet
	var head := _read_string(buf)
	if head == "#bundle":
		buf.seek(buf.get_position() + 8) # timetag
		while buf.get_available_bytes() >= 4:
			var size := buf.get_32()
			if size <= 0 or size > buf.get_available_bytes():
				return
			var start := buf.get_position()
			_decode_into(packet.slice(start, start + size), out, depth + 1)
			buf.seek(start + size)
		return
	if not head.begins_with("/"):
		return
	var args := []
	if buf.get_available_bytes() > 0:
		var tags := _read_string(buf)
		for i in range(1, tags.length()):
			if buf.get_available_bytes() <= 0 and not tags[i] in ["T", "F", "N", "I"]:
				break
			match tags[i]:
				"f": args.append(buf.get_float())
				"d": args.append(buf.get_double())
				"i": args.append(buf.get_32())
				"h": args.append(buf.get_64())
				"s", "S": args.append(_read_string(buf))
				"T": args.append(true)
				"F": args.append(false)
				"N", "I": args.append(null)
				"b":
					var n := buf.get_32()
					var blob := buf.get_data(n)
					args.append(blob[1])
					buf.seek(buf.get_position() + (4 - n % 4) % 4)
				_:
					break # unknown tag: stop rather than misread the rest
	out.append([head, args])


static func _padded(s: String) -> PackedByteArray:
	var b := s.to_utf8_buffer()
	b.append(0)
	while b.size() % 4 != 0:
		b.append(0)
	return b


static func _read_string(buf: StreamPeerBuffer) -> String:
	var start := buf.get_position()
	var arr := buf.data_array
	var end := start
	while end < arr.size() and arr[end] != 0:
		end += 1
	var s := arr.slice(start, end).get_string_from_utf8()
	var next := end + 1
	next += (4 - next % 4) % 4
	buf.seek(mini(next, arr.size()))
	return s
