# Rotary phone (Websites page, "One less call asking what's left")

A rigged desk phone built part by part in Blender. The method follows AnyMachine
(https://github.com/apekshik/anymachine, MIT, © 2026 Apekshik Panigrahi): a parts list first, real
mechanisms, one 0–1 control per glTF action, and an overlap sweep check. `check_phone.py` adapts AnyMachine's
`laptop/scripts/check.py`, and keeps its MIT notice.

Run each script live in Blender through the Blender MCP, in this order, sharing one globals dict:
1. `build_phone.py`: builds 22 parts and the rig (`handset_lift`, `dial`, `ring`).
2. `check_phone.py`: sweeps every control 0→1 in 51 steps. It fails on any triangle overlap between parts on
   different bones, on anything below the counter, and on the cord crossing itself. It writes `check.json`.
3. `render_sheets.py` and `make_sheets.py`: render the turnaround, the controls sheet and the clips.
4. `export_phone.py`: bakes the actions and writes `preview/services/websites/phone/phone.glb`.

The working file is `~/Desktop/Sea Of Grass/Rotary Phone/rotary-phone.blend`.
The viewer is `preview/services/websites/phone/phone.js` (`<sog-phone>`), and three.js r160 (MIT) is
vendored next to it.
