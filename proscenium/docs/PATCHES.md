# Patches: adding live images

A **patch** is a fragment shader rendered into its own texture every frame. Its uniforms are
wired to the bus, and its texture inputs are wired to the texture pool. The generators
(`noise`, `bands`), the processor (`feedback`) and the post chain (`lens`, `screen`) are all
patches. Each is a `.gdshader` in `patches/` plus an entry in `config/patches.json`. No
GDScript is involved.

## A new generator in two steps

**1. The shader.** Write `patches/rings.gdshader`:

```glsl
shader_type canvas_item;
#include "res://patches/lib.gdshaderinc"   // fbm, palette, hue_rotate, luma...

uniform float t = 0.0;        // advances at the patch's "time" rate, if it has one
uniform float count = 8.0;
uniform float hue = 0.1;

void fragment() {
	float r = length(UV - 0.5) * count - t;
	float v = pow(0.5 + 0.5 * sin(6.28318 * r), 6.0);
	COLOR = vec4(palette(r * 0.05, hue, 0.5) * v, 1.0);
}
```

**2. The entry.** Add it to `passes` in `config/patches.json`:

```json
{
  "name": "rings",
  "shader": "res://patches/rings.gdshader",
  "size": [512, 512],
  "time": "/tex/rings/speed",
  "params": {
    "count": {"address": "/tex/rings/count", "min": 1, "max": 40, "default": 8, "curve": "exp"},
    "hue":   {"address": "/tex/rings/hue",   "min": 0, "max": 1,  "default": 0.1}
  }
}
```

Restart the show. `rings` is now in the pool, so it appears as an option for every wall, floor,
costume, particle swarm, feedback input and screen overlay. Its controls are on the bus: map
them in `midi_map.json`, drive them over OSC, or set them in a beat's `look`.

## Entry reference

| Key | Meaning |
|---|---|
| `name` | Pool name the output is published under. |
| `shader` | A `canvas_item` shader. Write to `COLOR`; `UV` covers the texture. |
| `size` | `[w, h]`, or `"output"` for the show's full frame (from `show.json`). |
| `time` | Bus address for a speed. The patch integrates it into uniform `t`, so turning speed never makes the image jump. |
| `params` | `uniform: {address, min, max, default, curve, smooth}` defines a control and wires it. `uniform: "/existing/address"` wires to a control defined elsewhere. |
| `textures` | `uniform: "pool-name"` for a fixed input; `uniform: {"select": "/address", "default": "pool-name"}` for an input chosen live. |
| `feedback` | Name of a sampler uniform that receives this patch's own **previous frame** (via an internal ping-pong viewport). This is how trails, smears, tunnels and reaction-diffusion work. |
| `post_only` | `true` if the patch depends on the rendered stage. It's kept out of the source lists for surfaces, so the stage never samples its own frame directly. |
| `constants` | Uniforms set once. A uniform named `aspect` is filled in automatically. |

## Notes

- **Render targets are floating point.** This lets feedback decay all the way to black (8-bit
  targets get stuck at faint values) and keeps highlights above 1.0 through the chain.
- **Order in the file doesn't matter.** Consumers look textures up by name every frame, so a
  patch can use a texture published later.
- **Loops are allowed through feedback.** Feeding `stage` into `feedback` and putting
  `feedback` on a wall makes a live infinity mirror: each frame shows the previous one.
- **Cost:** each patch is one full-screen draw per frame at its `size`, plus one for
  `feedback`. 512² generators are cheap. Watch `"output"`-sized patches on older Macs.
