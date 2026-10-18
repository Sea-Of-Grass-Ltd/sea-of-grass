# Cat-swing in Blender

`build_scene.py` builds the scene lined up with the finished still
(`../cat-swing-nielsen-final.png`), as a starting point for modelling each
part properly.

## Run it

In Blender (4.2 or newer; developed against 5.0): **Scripting** tab → **Open**
→ `build_scene.py` → **Run Script**. It clears the current scene first.

Or from a terminal:

```sh
blender --python build_scene.py                        # open with the scene built
blender -b --python build_scene.py -- --save cat-swing.blend
```

## What you get

| Collection | Contents |
|---|---|
| Camera | 9:16 camera with the still as its background image; key light |
| Cat | tail (Bézier curve), haunch, chest, head and ears, raised arm and front leg (Skin modifier chains), hind paw with four claws |
| Shrike | stand-in body, feather |
| String | NURBS curve from the claw, three crossing loops round the bird, loose end |
| Rug | tilted grid with a Displace modifier for the rolling belly fur |
| Reference (generated) | the Higgsfield models, if present |

- **Look through the camera** (Numpad 0) to see the still behind the parts.
  Every part is placed in image pixels, so the numbers in the script read
  straight off the picture.
- **The limbs are Skin-modifier chains:** in Edit Mode, move the chain's
  vertices to re-pose them, Ctrl+A to change thickness. Apply the modifiers
  when you're ready to sculpt.
- **The tail and string are curves:** edit their points, or change
  *Geometry → Bevel → Depth* for thickness.
- **Rendering:** EEVEE, flat two-tone toon materials, Freestyle pen outline.
  The toon materials use *Shader to RGB*, which only works in EEVEE.
- Set `PROJECT_STILL = True` at the top of the script to paint the still onto
  every part from the camera: the render then matches the picture exactly.

## The generated models

Download any of these into a `models/` folder next to the script, with these
names, and rerun it. Each is sized and placed over its part. The head and
shrike come in as solid models (and hide their stand-ins); the rest come in as
wireframe guides that don't render, to model over.

| File | Download |
|---|---|
| `models/shrike.glb` | [shrike](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_135656_b1307608-dffe-4936-803e-f0ec5cefcf9a.glb) |
| `models/head.glb` | [head](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_135657_d578e0a3-6de5-41b8-9f73-9017e57dac00.glb) |
| `models/arm.glb` | [arm](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_135752_0f376227-b0e0-4d69-b293-d2214842b572.glb) |
| `models/leg.glb` | [leg](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_135701_4f26210f-49be-4029-b92c-f5a3995fded8.glb) |
| `models/hind_paw.glb` | [hind paw](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_135702_3d853733-fdf8-4453-8239-8a7badde91f9.glb) |
| `models/tail.glb` | [tail](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_135753_6ae31f03-af20-4f29-aea4-c2d0adcb766e.glb) |
| `models/haunch.glb` | [haunch](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_135704_93eb1e03-abce-48cb-9f9a-9d9d2af76302.glb) |
| `models/full_cat.glb` | [whole cat](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_150521_5446582b-7b77-4ad7-9ad8-f49911679b28.glb) |
| `models/rug.glb` | [rug](https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg/hf_20261018_150636_6f2b7008-48e9-4799-8d5e-66ce5e885cd8.glb) |

The rug replaces the displaced grid, tilted to match. The whole cat stands just
outside the frame as a proportion reference (visible, not rendered).

Generated models usually arrive rotated arbitrarily: rotate each one by eye to
match the still. Known defects: the shrike's feet face backwards, and the
front leg's paw has a notch at the back (Sculpt mode → Fill and Smooth).

## Into Godot

Export each finished part as glTF (`.glb`) for Fantasm; see
[../../../docs/BLENDER.md](../../../docs/BLENDER.md).
