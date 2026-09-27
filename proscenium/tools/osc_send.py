#!/usr/bin/env python3
"""Poke the show over OSC without a controller. Standard library only.

  python3 tools/osc_send.py /lens/orbit 0.8          set a control (0..1)
  python3 tools/osc_send.py /story/go                press a trigger
  python3 tools/osc_send.py --sweep /lens/orbit 6    sweep 0 -> 1 -> 0 over 6s
  python3 tools/osc_send.py --claim /lens            own /lens from this sender
  python3 tools/osc_send.py --dump                   print every control's value

Values are normalized 0..1, as from a fader. --host/--port pick the show
(default 127.0.0.1:9000). Note: each run is a new sender, so --claim only
lasts as long as a single process - use it from your own tool, not per call.
"""
import argparse
import math
import socket
import struct
import time


def pad(b: bytes) -> bytes:
    b += b"\0"
    return b + b"\0" * ((4 - len(b) % 4) % 4)


def message(address: str, *args) -> bytes:
    tags, body = ",", b""
    for a in args:
        if isinstance(a, float):
            tags, body = tags + "f", body + struct.pack(">f", a)
        elif isinstance(a, int):
            tags, body = tags + "i", body + struct.pack(">i", a)
        else:
            tags, body = tags + "s", body + pad(str(a).encode())
    return pad(address.encode()) + pad(tags.encode()) + body


def read_str(data: bytes, i: int):
    end = data.index(b"\0", i)
    return data[i:end].decode(), (end + 4) & ~3


def parse(data: bytes):
    address, i = read_str(data, 0)
    tags, i = read_str(data, i)
    args = []
    for t in tags[1:]:
        if t == "f":
            args.append(struct.unpack(">f", data[i:i + 4])[0]); i += 4
        elif t == "i":
            args.append(struct.unpack(">i", data[i:i + 4])[0]); i += 4
        elif t == "s":
            s, i = read_str(data, i); args.append(s)
    return address, args


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("address", nargs="?")
    ap.add_argument("value", nargs="?", type=float)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=9000)
    ap.add_argument("--sweep", type=float, metavar="SECONDS", nargs="?", const=4.0)
    ap.add_argument("--claim", metavar="PREFIX")
    ap.add_argument("--dump", action="store_true")
    a = ap.parse_args()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    dest = (a.host, a.port)

    if a.dump:
        sock.bind(("0.0.0.0", 0))
        sock.settimeout(0.5)
        sock.sendto(message("/proscenium/dump"), dest)
        try:
            while True:
                addr, args = parse(sock.recv(4096))
                print(f"{addr:36s} {args[0]:.3f}" if args else addr)
        except socket.timeout:
            pass
        return

    if a.claim:
        sock.sendto(message("/proscenium/claim", a.claim), dest)
        print(f"claimed {a.claim}")
        if not a.address:
            return

    if not a.address:
        ap.print_help()
        return

    if a.sweep is not None:
        start = time.time()
        while (t := time.time() - start) < a.sweep:
            v = 0.5 - 0.5 * math.cos(2 * math.pi * t / a.sweep)
            sock.sendto(message(a.address, float(v)), dest)
            time.sleep(1 / 60)
        return

    if a.value is None:
        sock.sendto(message(a.address), dest)  # a bare message = a press
    else:
        sock.sendto(message(a.address, float(a.value)), dest)


if __name__ == "__main__":
    main()
