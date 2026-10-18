#!/bin/sh
# Download the Higgsfield outputs that couldn't be fetched from the cloud
# session: the 3D models (into blender/models/, where build_scene.py looks)
# and the 11 part sheets (into parts/sheets/). Run from this folder:
#   sh fetch_assets.sh
set -e
cd "$(dirname "$0")"
B=https://d8j0ntlcm91z4.cloudfront.net/user_3JW7HGdIwMGN0sNijA1SaC53yFg
mkdir -p blender/models parts/sheets

get() { [ -s "$2" ] && echo "have $2" || { echo "get  $2"; curl -fsSL -o "$2" "$B/$1"; }; }

get hf_20261018_135656_b1307608-dffe-4936-803e-f0ec5cefcf9a.glb blender/models/shrike.glb
get hf_20261018_135657_d578e0a3-6de5-41b8-9f73-9017e57dac00.glb blender/models/head.glb
get hf_20261018_135752_0f376227-b0e0-4d69-b293-d2214842b572.glb blender/models/arm.glb
get hf_20261018_135701_4f26210f-49be-4029-b92c-f5a3995fded8.glb blender/models/leg.glb
get hf_20261018_135702_3d853733-fdf8-4453-8239-8a7badde91f9.glb blender/models/hind_paw.glb
get hf_20261018_135753_6ae31f03-af20-4f29-aea4-c2d0adcb766e.glb blender/models/tail.glb
get hf_20261018_135704_93eb1e03-abce-48cb-9f9a-9d9d2af76302.glb blender/models/haunch.glb

get hf_20261018_133901_9029bf53-7242-47da-86f3-9cd90c837203.png parts/sheets/string.png
get hf_20261018_133901_36acc831-9b51-4389-9533-302154ed2aa7.png parts/sheets/haunch.png
get hf_20261018_133902_69232eff-5332-4c45-acaf-c2b914a13b9b.png parts/sheets/full-cat.png
get hf_20261018_133902_8cfa496c-5a19-42b6-942e-ecbe2aa83f6e.png parts/sheets/front-leg.png
get hf_20261018_133902_d934ff1c-8c6d-4866-be9e-22906eb3e5be.png parts/sheets/raised-arm.png
get hf_20261018_133901_f157ce11-11cd-4ccf-a3f2-9d361d09d7ed.png parts/sheets/rug.png
get hf_20261018_133901_d0116a56-ce93-40e6-bd5e-554d0601a54f.png parts/sheets/feather.png
get hf_20261018_133902_61938e56-3e9e-4170-8f28-1dfc77eb9b26.png parts/sheets/shrike.png
get hf_20261018_133902_aa728fdc-df0f-469c-a9e3-574eaf132826.png parts/sheets/tail.png
get hf_20261018_133903_cad60226-276e-447b-b0b4-ad8dc8e323c6.png parts/sheets/head.png
get hf_20261018_133903_fd0ebe80-dc71-4bcf-9203-792ea6d8595a.png parts/sheets/hind-paw.png
echo done
