# Controls

Every live control in the show, by address. This table is generated from the running show
(`godot --headless --path . res://tools/dump_controls.tscn`), so it matches the code.

Conventions:

- **Inputs are normalized 0..1.** A MIDI CC (0–127), an OSC float, and a keyboard nudge all
  arrive as 0..1. The *Range* column is what that becomes in real units (degrees, metres,
  multipliers). `(exp)` means the knob is exponential: equal turns give equal *ratios*, which
  suits sizes, speeds and frequencies.
- **value**: continuous, clamped and smoothed. Soft takeover applies: a second source has to
  reach the current value before it takes over.
- **toggle**: flips on each press (a rising edge through 0.5).
- **trigger**: fires once per press and holds no state. Over OSC, a message with no argument
  counts as a press.
- **select**: picks one of a list. A knob sweeps through the list; a button mapped with
  `"step": 1` cycles through it. For texture sources, the list is the texture pool, and it
  grows as patches are added.

A story beat's `look` can set any **value** address. Looks (`/show/look/n`) save and recall
everything except `/story` and `/show`.

### /story

| Address | Kind | Range | Default |
|---|---|---|---|
| `/story/rate` | value | 0 – 2 | 1 |
| `/story/hold` | toggle |  | off |
| `/story/loop` | toggle |  | off |
| `/story/go` | trigger |  |  |
| `/story/next` | trigger |  |  |
| `/story/prev` | trigger |  |  |
| `/story/restart` | trigger |  |  |

### /show

| Address | Kind | Range | Default |
|---|---|---|---|
| `/show/look/1` | trigger |  |  |
| `/show/look/2` | trigger |  |  |
| `/show/look/3` | trigger |  |  |
| `/show/look/4` | trigger |  |  |
| `/show/store` | toggle |  | off |
| `/show/reset` | trigger |  |  |

### /lens

| Address | Kind | Range | Default |
|---|---|---|---|
| `/lens/distort` | value | -0.6 – 2 | 0 |
| `/lens/aberration` | value | 0 – 4 | 0.3 |
| `/lens/vignette` | value | 0 – 1 | 0.35 |
| `/lens/grain` | value | 0 – 0.3 | 0.03 |
| `/lens/orbit` | value | -180 – 180 | 0 |
| `/lens/drift` | value | -30 – 30 | 0 |
| `/lens/distance` | value | 1.5 – 16 (exp) | 7.5 |
| `/lens/height` | value | 0.2 – 6 | 1.9 |
| `/lens/fov` | value | 12 – 90 | 40 |
| `/lens/shake` | value | 0 – 1 | 0 |
| `/lens/blur` | value | 0 – 1 | 0 |
| `/lens/target` | select | stage, mara, tomas, wall | stage |

### /world

| Address | Kind | Range | Default |
|---|---|---|---|
| `/world/light/key/intensity` | value | 0 – 40 | 14 |
| `/world/light/key/hue` | value | 0 – 1 | 0.09 |
| `/world/light/key/sat` | value | 0 – 1 | 0.35 |
| `/world/light/key/angle` | value | 8 – 70 | 32 |
| `/world/ambient` | value | 0 – 1.5 | 0.25 |
| `/world/fog/density` | value | 0 – 0.12 | 0.02 |
| `/world/fog/hue` | value | 0 – 1 | 0.6 |
| `/world/glow` | value | 0 – 2 | 0.6 |
| `/world/particles/amount` | value | 0 – 1 | 0.4 |
| `/world/particles/speed` | value | 0 – 4 | 1 |
| `/world/particles/size` | value | 0.2 – 5 (exp) | 1 |
| `/world/particles/glow` | value | 0 – 6 | 1.5 |
| `/world/particles/source` | select | noise, bands, feedback | noise |

### /surface

| Address | Kind | Range | Default |
|---|---|---|---|
| `/surface/wall/source` | select | noise, bands, feedback | feedback |
| `/surface/wall/amount` | value | 0 – 1 | 0.85 |
| `/surface/wall/glow` | value | 0 – 4 | 0.9 |
| `/surface/wall/tiling` | value | 0.25 – 8 (exp) | 1 |
| `/surface/wall/scroll` | value | -0.2 – 0.2 | 0 |
| `/surface/floor/source` | select | noise, bands, feedback | noise |
| `/surface/floor/amount` | value | 0 – 1 | 0.3 |
| `/surface/floor/glow` | value | 0 – 4 | 0.1 |
| `/surface/floor/tiling` | value | 0.25 – 8 (exp) | 2 |
| `/surface/floor/scroll` | value | -0.2 – 0.2 | 0 |
| `/surface/costume/source` | select | noise, bands, feedback | bands |
| `/surface/costume/amount` | value | 0 – 1 | 0.35 |
| `/surface/costume/glow` | value | 0 – 4 | 0.2 |
| `/surface/costume/tiling` | value | 0.25 – 8 (exp) | 2 |
| `/surface/costume/scroll` | value | -0.2 – 0.2 | 0 |

### /tex

| Address | Kind | Range | Default |
|---|---|---|---|
| `/tex/noise/scale` | value | 0.5 – 12 (exp) | 3 |
| `/tex/noise/warp` | value | 0 – 4 | 1 |
| `/tex/noise/hue` | value | 0 – 1 | 0.55 |
| `/tex/noise/spread` | value | 0 – 1.5 | 0.4 |
| `/tex/noise/contrast` | value | 0.3 – 3 | 1 |
| `/tex/noise/speed` | value | 0 – 2 | 0.3 |
| `/tex/bands/count` | value | 1 – 40 (exp) | 6 |
| `/tex/bands/angle` | value | -3.142 – 3.142 | 0 |
| `/tex/bands/rings` | value | 0 – 1 | 0 |
| `/tex/bands/sharp` | value | 0 – 1 | 0.4 |
| `/tex/bands/hue` | value | 0 – 1 | 0.08 |
| `/tex/bands/speed` | value | 0 – 2 | 0.3 |
| `/tex/feedback/decay` | value | 0.8 – 0.999 | 0.96 |
| `/tex/feedback/zoom` | value | 0.95 – 1.08 | 1.01 |
| `/tex/feedback/turn` | value | -0.05 – 0.05 | 0.004 |
| `/tex/feedback/mix` | value | 0 – 1 | 0.08 |
| `/tex/feedback/displace` | value | 0 – 4 | 0.5 |
| `/tex/feedback/hue` | value | -0.2 – 0.2 | 0 |
| `/tex/feedback/source` | select | noise, bands, lens, screen, stage | noise |
| `/tex/feedback/speed` | value | 0 – 2 | 0.3 |

### /screen

| Address | Kind | Range | Default |
|---|---|---|---|
| `/screen/feedback` | value | 0 – 0.98 | 0 |
| `/screen/fb_zoom` | value | 0.96 – 1.06 | 1 |
| `/screen/fb_turn` | value | -0.04 – 0.04 | 0 |
| `/screen/kaleido` | value | 0 – 12 | 0 |
| `/screen/overlay` | value | 0 – 1 | 0 |
| `/screen/hue` | value | -0.5 – 0.5 | 0 |
| `/screen/saturation` | value | 0 – 2 | 1 |
| `/screen/contrast` | value | 0.5 – 1.8 | 1 |
| `/screen/exposure` | value | 0.2 – 3 (exp) | 1 |
| `/screen/fade` | value | 0 – 1 | 1 |
| `/screen/overlay_source` | select | noise, bands, feedback, lens, stage | bands |
