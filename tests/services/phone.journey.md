# Counter phone, live 3D (written before the build)

The "One less call asking what's left" section shows a cream rotary phone on a counter in meadow light. The still
illustration stays as the fallback; the live phone is laid over it once it is ready. Built in Blender with the
AnyMachine method (`tools/rotary-phone/`); its two controls are baked into the GLB as `handset_lift` and `dial`.

Tests in `phone.test.mjs` run against `preview/services/websites/phone/demo.html`, a copy of the section's frame,
at 390 and 1440 wide. The page session drops the same element into `index.html`.

## Steps

1. Scroll the section into view. The still picture is there first; within a few seconds the live phone replaces it
   in exactly the same box (no jump in the page).
2. Hover the handset (desktop) or tap it (phone): it lifts off the cradle, the plungers rise, the cord stretches.
   Move away (desktop) or tap again (phone): it settles back.
3. Put a finger or the mouse in a dial hole and drag clockwise: the wheel follows, never past the finger stop.
   Let go: it runs back on its own, like a real dial.

## Rules
- The GLB with both controls is under 2 MB.
- Reduced motion: the still picture only. The 3D code and the model are never downloaded.
- No WebGL, or the model fails to load: the still picture stays, with no error on the page.
- The box keeps the picture's size before, during and after loading (no layout shift).
- Nothing loads from another site (three.js is served from this repo).
- No console errors.
