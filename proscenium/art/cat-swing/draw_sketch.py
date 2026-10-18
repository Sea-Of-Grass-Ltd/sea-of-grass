import math, sys
W, H = 1080, 1920
L, LM, M, DK = "#f1e6cf", "#d9c6a2", "#a88d66", "#5b4934"
HEAD, INK, PINK, ROPE, BIRD = "#c9b48e", "#2b231a", "#c0705a", "#8a6a44", "#cfcdc8"
o = []
def add(s): o.append(s)
def shape(d, fill, extra=""):
    if "stroke=" not in extra:
        extra += f' stroke="{INK}" stroke-width="5" stroke-linejoin="round"'
    add(f'<path d="{d}" fill="{fill}" {extra}/>')
def band(d, op=".55"): shape(d, DK, f'fill-opacity="{op}" stroke="none"')

def catmull(pts, n=24):
    """Smooth curve through pts (Catmull-Rom), sampled n times per segment."""
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1])
    return out

def limb(pts, widths):
    """A tapered limb along a smooth centreline, with a rounded end. Returns (outline path, samples, normals, half-widths)."""
    c = catmull(pts)
    n = len(c)
    # widths interpolated along the samples
    hw = []
    for i in range(n):
        f = i / (n - 1) * (len(widths) - 1)
        a, b = int(f), min(int(f) + 1, len(widths) - 1)
        hw.append((widths[a] + (widths[b] - widths[a]) * (f - a)) / 2)
    nrm = []
    for i in range(n):
        x0, y0 = c[max(i - 1, 0)]; x1, y1 = c[min(i + 1, n - 1)]
        dx, dy = x1 - x0, y1 - y0; l = math.hypot(dx, dy) or 1
        nrm.append((-dy / l, dx / l))
    left = [(c[i][0] + nrm[i][0] * hw[i], c[i][1] + nrm[i][1] * hw[i]) for i in range(n)]
    right = [(c[i][0] - nrm[i][0] * hw[i], c[i][1] - nrm[i][1] * hw[i]) for i in range(n)]
    d = "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in left)
    d += f" A{hw[-1]:.0f} {hw[-1]:.0f} 0 0 1 {right[-1][0]:.0f} {right[-1][1]:.0f}"
    d += " L" + " L".join(f"{x:.0f} {y:.0f}" for x, y in reversed(right)) + " Z"
    return d, c, nrm, hw

def limb_bands(c, nrm, hw, ts, thick=26):
    for t in ts:
        i = int(t * (len(c) - 1))
        j = min(i + 3, len(c) - 1)
        (x, y), (nx, ny), h = c[i], nrm[i], hw[i] * 1.1
        tx, ty = c[j][0] - x, c[j][1] - y; l = math.hypot(tx, ty) or 1; tx, ty = tx / l * thick, ty / l * thick
        band(f"M{x + nx*h:.0f} {y + ny*h:.0f} Q{x + tx*0.6:.0f} {y + ty*0.6:.0f} {x - nx*h:.0f} {y - ny*h:.0f} "
             f"L{x - nx*h + tx:.0f} {y - ny*h + ty:.0f} Q{x + tx*1.6:.0f} {y + ty*1.6:.0f} {x + nx*h + tx:.0f} {y + ny*h + ty:.0f} Z")
def claws(points, length=72):
    for x, y, a in points:
        ex, ey = x + math.cos(a) * length, y + math.sin(a) * length
        mx, my = x + math.cos(a - .45) * length * .6, y + math.sin(a - .45) * length * .6
        add(f'<path d="M{x-9:.0f} {y:.0f} Q{mx:.0f} {my:.0f} {ex:.0f} {ey:.0f} Q{mx+8:.0f} {my+8:.0f} {x+9:.0f} {y:.0f} Z" fill="{L}" stroke="{INK}" stroke-width="3"/>')

labels = "--labels" in sys.argv
add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
add(f'<defs><radialGradient id="glow" cx="0.32" cy="0.47" r="0.55"><stop offset="0" stop-color="#fff6df"/><stop offset=".45" stop-color="{L}"/><stop offset="1" stop-color="{LM}"/></radialGradient></defs>')
# The lit space the cat curls around.
add(f'<rect width="{W}" height="{H}" fill="url(#glow)"/>')
add(f'<g transform="translate({W} {H}) scale({W / 1052:.4f}) translate({-W} {-H})">')

# ---- TAIL: rooted in the haunch on the left, sweeping up and over the top, ending in a curl ----
tail = ("M0 900 C30 700 40 470 150 320 C270 160 470 90 610 150 C720 200 730 330 640 370 C570 400 510 350 540 300 "
        "C560 270 600 280 600 310 C620 280 600 225 550 215 C460 195 320 250 240 360 C150 490 110 700 100 900 Z")
add('<g transform="translate(-28 0)">')
shape(tail, DK)
for (x1, y1, x2, y2) in ((20, 640, 110, 660), (60, 470, 150, 510), (150, 330, 220, 400), (300, 170, 330, 260), (450, 120, 450, 215)):
    add(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{INK}" stroke-width="16" stroke-opacity=".5"/>')   # tail rings
add('</g>')

# ---- HAUNCH (left) and BODY curling along the bottom to the right ----
body = ("M0 820 C170 800 380 900 440 1120 C480 1290 420 1450 330 1540 C420 1600 560 1630 700 1610 "
        "C800 1600 920 1540 1000 1440 L1080 1400 L1080 1920 L0 1920 Z")
shape(body, M)
# haunch bands (curving across the thigh), body bands (across the flow, along the bottom)
for d in ("M0 900 C140 900 300 960 380 1050 L350 1085 C270 1010 130 960 0 960 Z",
          "M0 1040 C130 1040 260 1100 330 1190 L300 1220 C240 1150 120 1100 0 1100 Z",
          "M0 1190 C110 1200 210 1250 270 1320 L240 1350 C190 1290 100 1255 0 1250 Z",
          "M560 1625 C575 1700 575 1800 560 1920 L620 1920 C632 1800 630 1700 615 1620 Z",
          "M760 1595 C790 1680 800 1800 790 1920 L850 1920 C858 1800 850 1680 820 1580 Z"):
    band(d)
# belly fur: a fringe of pointed tufts along the curve of the belly, lighter toward the bottom
def fringe(p0, pc, p1, n, h, fill, base_y=1920):
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append(((1-t)**2*p0[0] + 2*(1-t)*t*pc[0] + t*t*p1[0], (1-t)**2*p0[1] + 2*(1-t)*t*pc[1] + t*t*p1[1]))
    d = f"M{pts[0][0]:.0f} {base_y} L{pts[0][0]:.0f} {pts[0][1]:.0f}"
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        tx, ty = (x0 + x1) / 2 + (x1 - x0) * 0.25, min(y0, y1) - h * (0.8 + 0.4 * ((i * 7) % 3) / 2)   # tips lean right
        d += (f" C{x0 + (x1 - x0) * 0.05:.0f} {y0 - h * 0.7:.0f} {tx - (x1 - x0) * 0.25:.0f} {ty - h * 0.15:.0f} {tx:.0f} {ty:.0f}"
              f" C{tx + (x1 - x0) * 0.05:.0f} {ty + h * 0.35:.0f} {x1 - (x1 - x0) * 0.1:.0f} {y1 - h * 0.2:.0f} {x1:.0f} {y1:.0f}")
    d += f" L{pts[-1][0]:.0f} {base_y} Z"
    shape(d, fill)
fringe((-10, 1790), (560, 1610), (1090, 1720), 9, 50, LM)
fringe((-10, 1885), (620, 1760), (1090, 1835), 8, 42, L)

# ---- HIND FOOT at the bottom of the haunch: claws open UP under the bird ----
shape("M90 1700 C150 1600 320 1580 400 1640 C450 1690 420 1790 320 1810 C220 1830 120 1810 80 1770 C65 1745 70 1720 90 1700 Z", M, f'stroke="{DK}" stroke-width="4"')
for tx, ty in ((175, 1650), (245, 1630), (315, 1640), (375, 1675)):
    add(f'<ellipse cx="{tx}" cy="{ty}" rx="26" ry="20" fill="{LM}"/>')
claws([(175, 1640, -1.75), (245, 1620, -1.55), (315, 1630, -1.35), (378, 1665, -1.1)])

# ---- SECOND FORELEG: down from the chest, paw resting at the bottom ----
shape("M790 1230 C730 1370 700 1490 700 1590 C700 1660 740 1705 800 1705 C870 1705 905 1665 895 1605 "
      "C885 1510 905 1410 990 1310 Z", M, f'stroke="{DK}" stroke-width="4"')
for y0 in (1540,):   # band across the visible part of the foreleg
    band(f"M{752 - (y0 - 1330) // 8} {y0} C800 {y0 + 10} 880 {y0 + 5} {955 - (y0 - 1330) // 4} {y0 - 15} "
         f"L{945 - (y0 - 1330) // 4} {y0 + 22} C880 {y0 + 40} 800 {y0 + 45} {746 - (y0 - 1330) // 8} {y0 + 35} Z")
for tx, ty in ((735, 1690), (785, 1705), (838, 1702), (882, 1680)):   # toe pads along the resting paw
    add(f'<ellipse cx="{tx}" cy="{ty}" rx="22" ry="15" fill="{LM}"/>')
claws([(735, 1700, 2.2), (785, 1712, 1.9), (838, 1710, 1.6), (882, 1690, 1.3)], length=40)

# ---- NECK and SHOULDER on the right, joining head to body ----
shape("M640 1040 C610 1200 650 1340 740 1420 C820 1500 960 1570 1080 1570 L1080 900 L900 880 Z", M)
band("M690 1250 C780 1240 880 1230 1080 1200 L1080 1250 C880 1280 780 1290 700 1300 Z")
band("M780 1390 C860 1385 960 1370 1080 1340 L1080 1385 C960 1415 860 1430 800 1432 Z")

# ---- RAISED FORELEG: shoulder behind the head, up to the elbow near the top, forearm bending down to the paw ----
# Drawn as two thick strokes (upper arm, forearm) with round joins: an outline pass, then a fill pass.
def polyline(pts):
    c = catmull(pts, 16)
    return "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in c), c
upper_d, upper_c = polyline([(1140, 820), (1115, 560), (1090, 300), (1068, 60), (1055, -55)])
fore_d, fore_c = polyline([(1055, -55), (990, 25), (905, 150), (828, 295), (782, 395)])
UW, FW = 195, 145
for d_, w_ in ((upper_d, UW), (fore_d, FW)):
    add(f'<path d="{d_}" fill="none" stroke="{INK}" stroke-width="{w_ + 10}" stroke-linecap="round" stroke-linejoin="round"/>')
for d_, w_ in ((upper_d, UW), (fore_d, FW)):
    add(f'<path d="{d_}" fill="none" stroke="{M}" stroke-width="{w_}" stroke-linecap="round" stroke-linejoin="round"/>')
# stripes across the arm, masked to the arm's shape
add(f'<mask id="armmask"><path d="{upper_d}" fill="none" stroke="#fff" stroke-width="{UW}" stroke-linecap="round" stroke-linejoin="round"/>'
    f'<path d="{fore_d}" fill="none" stroke="#fff" stroke-width="{FW}" stroke-linecap="round" stroke-linejoin="round"/></mask>')
add('<g mask="url(#armmask)">')
def across(c, t, w, thick=26):
    i = int(t * (len(c) - 1)); j = min(i + 2, len(c) - 1)
    (x, y), (x2, y2) = c[i], c[j]
    tx, ty = x2 - x, y2 - y; l = math.hypot(tx, ty) or 1; tx, ty = tx / l, ty / l
    nx, ny = -ty, tx; h = w * 0.6
    band(f"M{x + nx*h:.0f} {y + ny*h:.0f} Q{x + tx*thick*0.7:.0f} {y + ty*thick*0.7:.0f} {x - nx*h:.0f} {y - ny*h:.0f} "
         f"L{x - nx*h + tx*thick:.0f} {y - ny*h + ty*thick:.0f} Q{x + tx*thick*1.7:.0f} {y + ty*thick*1.7:.0f} {x + nx*h + tx*thick:.0f} {y + ny*h + ty*thick:.0f} Z")
for t in (0.3, 0.5, 0.7):
    across(upper_c, t, UW)
for t in (0.25, 0.45, 0.65):
    across(fore_c, t, FW)
add('</g>')

# toe pads and claws at the end of the forearm, hooked down round the rope
for tx, ty in ((748, 448), (782, 466), (816, 450)):
    add(f'<ellipse cx="{tx}" cy="{ty}" rx="17" ry="13" fill="{LM}" stroke="{INK}" stroke-width="3"/>')
claws([(748, 456, 2.0), (782, 474, 1.75), (818, 458, 1.5)], length=66)

# ---- HEAD (in front of the arm and neck) ----
add('<g transform="translate(50 130)">')
shape("M600 650 L650 430 L770 560 Z", HEAD); shape("M630 610 L655 490 L725 565 Z", DK, 'fill-opacity=".5"')
shape("M920 545 L1030 420 L1050 640 Z", HEAD); shape("M950 550 L1020 470 L1030 590 Z", DK, 'fill-opacity=".5"')
shape("M560 760 C560 600 640 520 700 540 C780 500 900 500 960 530 C1060 560 1110 720 1090 900 C1070 1020 980 1090 860 1110 C740 1125 640 1090 600 1020 C560 950 550 860 560 760 Z", HEAD)
shape("M610 800 C620 660 720 600 800 600 C900 600 990 660 1000 800 C1010 960 930 1060 800 1070 C680 1070 600 960 610 800 Z", L)
for x in (765, 805, 845):
    shape(f"M{x-9} 560 L{x+9} 560 L{x+4} 650 L{x-4} 650 Z", M)
for ex in (715, 895):
    for r, f in ((84, INK), (72, L), (58, INK), (46, L), (32, INK), (20, L), (8, INK)):
        add(f'<circle cx="{ex}" cy="780" r="{r}" fill="{f}"/>')
shape("M785 880 L825 880 L805 905 Z", PINK)
shape("M690 930 Q805 990 925 925 Q900 1050 805 1065 Q710 1050 690 930 Z", DK)
shape("M745 1010 Q805 980 865 1010 Q850 1055 805 1060 Q760 1055 745 1010 Z", PINK)
for fx, top, l in ((712, 945, 52), (898, 945, 52), (760, 960, 30), (850, 960, 30)):
    shape(f"M{fx-10} {top} L{fx} {top + l} L{fx+10} {top} Z", L)
add('</g>')

# ---- ROPE from the hanging paw's claws, the seat, the bound shrike ----
bx, by = 530, 1400
shape(f"M{bx+10} {by-30} C{bx+20} {by-120} {bx+70} {by-190} {bx+140} {by-215} C{bx+130} {by-170} {bx+150} {by-150} {bx+165} {by-140} L{bx+128} {by-120} L{bx+140} {by-95} L{bx+102} {by-80} L{bx+108} {by-52} L{bx+60} {by-35} Z", DK)
shape(f"M{bx+52} {by-110} L{bx+92} {by-150} L{bx+102} {by-128} L{bx+64} {by-92} Z", L)
shape(f"M{bx+40} {by+20} L{bx+200} {by+110} L{bx+186} {by+140} L{bx+30} {by+52} Z", DK)
add(f'<ellipse cx="{bx}" cy="{by}" rx="70" ry="55" fill="{BIRD}" stroke="{INK}" stroke-width="4"/>')
add(f'<circle cx="{bx-70}" cy="{by-40}" r="34" fill="{BIRD}" stroke="{INK}" stroke-width="4"/>')
shape(f"M{bx-104} {by-46} Q{bx-70} {by-58} {bx-38} {by-48} L{bx-38} {by-34} Q{bx-70} {by-44} {bx-104} {by-32} Z", INK)
shape(f"M{bx-102} {by-44} L{bx-135} {by-38} L{bx-102} {by-30} Z", INK)
add(f'<circle cx="{bx-72}" cy="{by-42}" r="4" fill="{L}"/>')
# ---- ONE STRING from the middle claw, winding into neat wraps round the bird's body ----
def cord(d_):
    add(f'<path d="{d_}" fill="none" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>')   # outline
    add(f'<path d="{d_}" fill="none" stroke="{ROPE}" stroke-width="6" stroke-linecap="round"/>')   # cord
cord(f"M770 540 C745 820 650 1120 {bx-46} {by-48}")                                                # from the claw to the first wrap
for k in range(-3, 4):                                                                              # parcel wraps, all the way round
    cord(f"M{bx + k*18 - 10} {by-52} Q{bx + k*18 + 10} {by} {bx + k*18 - 6} {by+52}")
# the head pokes out of the bundle, over the wraps
add(f'<circle cx="{bx-70}" cy="{by-40}" r="34" fill="{BIRD}" stroke="{INK}" stroke-width="4"/>')
shape(f"M{bx-104} {by-46} Q{bx-70} {by-58} {bx-38} {by-48} L{bx-38} {by-34} Q{bx-70} {by-44} {bx-104} {by-32} Z", INK)
shape(f"M{bx-102} {by-44} L{bx-135} {by-38} L{bx-102} {by-30} Z", INK)
add(f'<circle cx="{bx-72}" cy="{by-42}" r="4" fill="{L}"/>')
add(f'<g transform="rotate(-70 470 1590)"><path d="M470 1555 Q485 1590 470 1625 Q455 1590 470 1555 Z" fill="{BIRD}" stroke="{INK}" stroke-width="2.5"/></g>')

add('</g>')   # end of the scaled picture

if labels:
    R = "#b4432a"
    def lab(x, y, t, tx, ty, anchor="start"):
        add(f'<path d="M{tx} {ty+8} L{x} {y}" stroke="{R}" stroke-width="2.5" fill="none"/><circle cx="{x}" cy="{y}" r="6" fill="{R}"/>')
        add(f'<text x="{tx}" y="{ty}" font-family="Georgia, serif" font-style="italic" font-size="34" fill="{R}" text-anchor="{anchor}" paint-order="stroke" stroke="{L}" stroke-width="8">{t}</text>')
    lab(300, 180, "tail, from the haunch, over the top", 60, 70)
    lab(1040, 620, "raised foreleg, elbow just out of frame", 1040, 40, "end")
    lab(770, 540, "one claw holds the string", 640, 640, "end")
    lab(560, 1380, "the string wound round the bird", 560, 1260)
    lab(980, 1300, "neck and shoulder", 1050, 1180, "end")
    lab(800, 1500, "other foreleg, paw resting", 1050, 1600, "end")
    lab(200, 1100, "haunch", 60, 760)
    lab(240, 1700, "hind foot, claws up", 60, 1560)
    lab(700, 1760, "belly fur", 1050, 1880, "end")
    lab(330, 900, "the light, inside the curl", 120, 1000)

add("</svg>")
print("\n".join(o))
