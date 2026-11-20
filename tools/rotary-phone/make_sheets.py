"""Lay the rendered frames out as two sheets: turnaround and parameters.  python3 make_sheets.py <sheets dir>"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1]
F = os.path.join(D, "frames")
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
    big = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
except OSError:
    font = big = ImageFont.load_default()


def sheet(title, rows, out, cell=600):
    cols = max(len(r) for r in rows)
    W, H = cols * cell + (cols + 1) * 20, len(rows) * (cell + 50) + 110
    im = Image.new("RGB", (W, H), (236, 236, 230))
    d = ImageDraw.Draw(im)
    d.text((20, 25), title, fill=(30, 30, 30), font=big)
    y = 100
    for r in rows:
        x = 20
        for name, label in r:
            im.paste(Image.open(os.path.join(F, name + ".png")).convert("RGB").resize((cell, cell), Image.LANCZOS), (x, y))
            d.text((x + 4, y + cell + 8), label, fill=(40, 40, 40), font=font)
            x += cell + 20
        y += cell + 50
    im.save(out, quality=92)
    print(out, im.size)


sheet("Rotary phone · turnaround", [
    [("turn_3q", "three-quarter"), ("turn_front", "front"), ("turn_right", "right")],
    [("turn_back", "back"), ("turn_left", "left"), ("turn_top", "top")],
], os.path.join(D, "phone-turnaround.jpg"))
sheet("Rotary phone · controls", [
    [("lift_000", "handset lift 0"), ("lift_050", "handset lift 0.5"), ("lift_100", "handset lift 1")],
    [("dial_000", "dial 0"), ("dial_050", "dial 0.5"), ("dial_100", "dial 1 (wound to the stop)")],
], os.path.join(D, "phone-controls.jpg"))

if "--clips" in sys.argv:
    import subprocess
    C = os.path.join(D, "clips")
    for sub, fps in (("turntable", 16), ("lift", 20), ("dial", 20), ("ring", 24)):
        out = os.path.join(C, f"phone-{sub}.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(C, sub, "%03d.png"),
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", out], check=True)
        print(out)
