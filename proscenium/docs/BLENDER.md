# Characters and sets from Blender

The placeholder figures in `stage/placeholder_actor.gd` show exactly what the story needs from
a character. A Blender character has to provide the same things.

## What a character needs

1. **One action per beat it performs**, named as the story uses them (`enter`, `cross`,
   `ask`...). Each action is the character's whole performance for that beat, **including
   where they stand**. The story may start any beat cold (jumping back, skipping ahead), so a
   beat must not depend on where the previous one left the character.
2. **An action called `idle`**, looping: breathing, weight shifts, blinks. It plays under the
   body whenever the story holds or the character isn't in the current beat.
3. **Root motion kept separate from the idle.** Whatever moves the character around the stage
   (the root bone, or an object parent) must not be in `idle`. If it has to be, list those
   tracks in the actor's `root_tracks` so the idle blend skips them. Otherwise a held character
   would slide back to the idle's position.

In Blender, the practical setup is one armature with an action per beat in the NLA or Action
editor, all sharing the same rest pose, and continuous at the joins (a beat's last frame
matches the next beat's first frame).

## Getting it into Godot

- **Export glTF 2.0 (`.glb`)** with *Animation → Actions* enabled, and *Group by NLA Track*
  if you use the NLA. Godot 4 can also import `.blend` files directly if Blender is installed
  and set in *Editor Settings → FileSystem → Import → Blender*.
- In the import dialog, set loop mode *Linear* for `idle` only (or name it `idle-loop`; Godot
  honours `-loop` suffixes).
- Instance the imported scene in the set, and attach `core/stage_actor.gd` to its root, or to a
  `Node3D` parent. `StageActor` finds the imported `AnimationPlayer`, takes its actions, and
  builds the blend tree itself.
- Register it with the story under the name the story file uses:
  `story.add_actor("mara", $Mara)`.

## Timing

- Author at **24 or 30 fps**. The story plays at any rate and samples the animation in
  between frames.
- A beat's length defaults to its longest action. Set `"length"` in the story to make a beat
  longer than its animation (the character finishes and then idles), or to trim it.

## Sets

A set is ordinary Godot scene work. Import set pieces from Blender as `.glb`. Any mesh that
should carry a live texture gets a `SurfaceBinding`'s material:

```gdscript
var sky := SurfaceBinding.create("sky", Color.BLACK, "noise", {"amount": 1.0, "glow": 2.0})
add_child(sky)
sky.apply_to($Cyclorama)   # /surface/sky/source, /amount, /glow, /tiling, /scroll now exist
```

Surfaces use the mesh's UVs, with mirrored tiling, so no generator ever shows a seam. Unwrap
the surfaces you want painted.
