# Cat-swing: handoff to a local session

Instructions for picking this project up on Tristan's Mac, in a local Claude Code
session (or by hand). Everything here is on the branch
`claude/beautiful-dijkstra-gnb1w9` of `Sea-Of-Grass-Ltd/sea-of-grass`.
The full story of how the piece was made is in `cat-swing-process.pdf` next to
this file.

## 1. Get set up

```sh
git clone https://github.com/Sea-Of-Grass-Ltd/sea-of-grass.git   # or: git fetch
cd sea-of-grass
git checkout claude/beautiful-dijkstra-gnb1w9
cd proscenium/art/cat-swing
sh fetch_assets.sh          # 3D models -> blender/models/, part sheets -> parts/sheets/
```

`fetch_assets.sh` downloads files the cloud session could not: its network
blocked Higgsfield's file host. On the Mac they download normally. The models
and sheets are not committed. Decide whether to commit them (the models are a
few MB each) or add `blender/models/` and `parts/sheets/` to `.gitignore`.

Install **Blender 4.2 or newer** (the script was developed against 5.0.1).
To let Claude drive it from the terminal, put it on the PATH:

```sh
alias blender=/Applications/Blender.app/Contents/MacOS/Blender
```

## 2. Where things stand

| | File |
|---|---|
| Finished still, no text | `cat-swing-nielsen-final.png` (1116 × 2000) |
| Finished still with "soon" | `cat-swing-soon.png` |
| Original composition (painted) | `cat-swing-paint-current.png` |
| Layout sketch and its generator | `cat-swing-sketch.svg`, `draw_sketch.py` |
| Style references (Kay Nielsen, 1913–14) | `refs/nielsen/*.jpg` |
| Part sheets, links and notes | `parts/README.md`, `parts/sheets/` after fetching |
| Blender scene builder | `blender/build_scene.py`, `blender/README.md` |
| Lettering generator | `soon/soon_gen_final.py`, `soon/bird_fix.py` |

The still is final. The work now is turning it into 3D parts that can be
posed and moved live in Fantasm (the Godot project in `proscenium/`).

## 3. The job, in order

1. **Build the scene.** `blender --python blender/build_scene.py`. Press
   Numpad 0 to look through the camera: the still is the camera's background
   image, and every blockout part sits over its place in the picture. Rerun
   the script after fetching the models so they're imported too.
2. **Check what wasn't testable in the cloud:**
   - **Generated models:** they arrive rotated arbitrarily. Rotate each to
     match the still by eye; the script only scales and centres them.
   - **Render:** render once in EEVEE (F12) to check the toon materials and
     the Freestyle outline. The cloud had no GPU, so it only tested layout,
     in Cycles with flat colours.
3. **Fix the known defects in the generated models:**
   - **Shrike:** its feet come out backwards or upside down. Delete them and
     model two short twig legs.
   - **Front leg:** the paw has a notch at the back. Sculpt mode → Fill, then
     Smooth.
4. **Model the parts properly**, using the blockouts and generated models as
   guides. This is the plan Tristan agreed to, because generated meshes are
   triangle soup and deform badly when rigged.
   - **Tail:** keep it a curve (it already matches the spiral). Convert to
     mesh only at export.
   - **Arm and front leg:** the Skin-modifier chains. Re-pose them, then apply
     the modifiers and sculpt the paws and claws.
   - **Haunch and chest:** sculpt from the ellipsoids.
   - **Whole cat:** `blender/models/full_cat.glb` (four views, quad
     topology) stands beside the frame. Use it for proportions, or as the
     base of a fully rigged cat for Fantasm that the oversized parts are
     posed from.
   - **Head:** keep the generated head if it holds up; otherwise sculpt it,
     with blank pale eyes and no pupils.
   - **String:** a curve. Redraw its loops around the finished shrike mesh,
     crossing over each other the way the still shows.
   - **Rug:** the generated rug (`blender/models/rug.glb`, which replaces
     the displaced grid), textured with the fur swatch from
     `parts/sheets/rug.png`.
   - **Feather:** a simple curved card.
5. **Restore the look.** The generators blur the pen linework, so the
   Nielsen-like quality comes from shading, not the models:
   - flat toon materials, as in the script;
   - texture painted from the part sheets, or the still projected from the
     camera (`PROJECT_STILL = True`), which you can bake to each part;
   - the Freestyle pen outline in dark brown-black, on a black background.
6. **Rig and export for Fantasm.** One armature per moving part (tail,
   arm, head, shrike wings, string). Export glTF `.glb` with actions, as
   `proscenium/docs/BLENDER.md` describes: an `idle` loop plus one action per
   story beat.

## 4. How Tristan works (read this before changing the picture)

These were learned the hard way in the cloud session.

- **Ask before guessing at anatomy.** "The other arm should come off the
  other side" took several wrong rounds. What finally worked was a labelled
  image (`A` raised arm, `B` front leg, `C` hind paw) and a direct question.
  When an instruction about a part is ambiguous, show which part you mean.
- **He points at crops.** He sends crops of what he likes and dislikes, often
  across several messages, and sometimes says "before you do anything" first.
  Wait until he says go.
- **Change images locally, not by re-rolling.** Every AI pass redraws the
  whole picture and drifts: limbs move, the head changes. What worked was
  compositing pixel-exact in Python (PIL), Tristan's own Photoshop edits, and
  local colour fixes, with AI used only to blend a seam. Type was set directly
  on the image, never generated.
- **Never describe an image you haven't looked at.** In the cloud session
  outputs couldn't be viewed, which caused misses. Locally you can open every
  render, so look before reporting.
- **Style rules he has set:**
  - minimal; no ornament doodles on anatomy (dots, spirals, bead bands and
    pseudo-script all read as "bad details");
  - fur is drawn with line only, as layered tufts that follow the form;
  - black ground;
  - blank, pale, uncanny eyes;
  - the shrike in cool greys and whites, not the cat's fawn;
  - lettering solid, never semi-transparent.
- **The composition is fixed.**
  - Tail: off the left edge, back over the top into a spiral.
  - Raised arm: from the top right, holding one string from one claw.
  - Front leg: tucked under the body, foreshortened.
  - Hind paw: bottom left, claws raised.
  - Shrike: wound in the string beside the chest.
  - Rug: of belly fur along the bottom.

## 5. Higgsfield, if more images or models are needed

- **Images:** model `nano_banana_2_1`, references with role
  `image_references`, 9:16 at 2k, thinking level high. Reference the finished
  still as a style and layout source, and keep prompts specific about what
  must not change.
- **3D:** `multi_image_to_3d` (Meshy) with 2–4 single views of one object,
  textured. It cost 30 credits per model; about 1,500 credits remained
  afterwards. Its safety filter falsely flagged the arm and the tail once:
  resubmitting with a new seed worked.
- **Uploading:** locally, upload files directly (`media_upload`). The cloud
  session had to route them through GitHub raw URLs instead.
- **Media IDs worth keeping:**
  - finished still: `3dbb84c7-871c-419a-a2a0-b402d05f896d`
  - original painting: `42e1fa1b-af2a-4103-9242-f468b83788b5`
  - Nielsen plates: `b62baab0…` (black court), `34394e80…` (white arch),
    `020dde47…` (moon window), `650e3bba…` (forest pool) and `4a7f29bd…`
    (cabbage garden)

## 6. Open items outside this piece

- Renaming Proscenium to **Fantasm**: discussed, never confirmed. Ask first.
- Casting characters with Tristan's GNM-based video-to-3D tool: needs to know
  whether it outputs parameters or meshes.
- The Fantasm logo files are in an old cloud scratchpad, not the repo. The
  chosen mark is an F made of a stem plus two rays from one point, on a 96 × 96
  grid: `rect 0,0,32,96`, `M32 32 L96 0 V32 Z`, `M32 32 L80 38 V64 Z`.
- No pull request has been opened for this branch. `main` deploys the public
  site on merge, and `proscenium/` is not part of the site, so merging it is
  harmless but should be Tristan's call.
