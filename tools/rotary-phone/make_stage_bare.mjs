// Builds preview/services/websites/stage/stage-bare.glb from stage.glb for the bare (live) Websites page: drops the meadow,
// sky, stars and the old toy register (the till replaces it), keeps the rigs, the sign and the counter. Needs
// @gltf-transform/core, /extensions, /functions and meshoptimizer.  node make_stage_bare.mjs stage.glb stage-bare.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const [src,dst]=process.argv.slice(2); const doc=await io.read(src);
const drop=/^(grass|flowers|meadow|sky|moon|star|side_felt|stage_floor|stage_apron|backdrop)/;
const reg=doc.getRoot().listNodes().find(n=>n.getName()==='register_rig');
const kill=new Set();
for(const n of doc.getRoot().listNodes()) if(drop.test(n.getName())) kill.add(n);
const walk=n=>{for(const c of n.listChildren()){kill.add(c);walk(c);}}; if(reg) walk(reg);   // the old toy register: the till replaces it
for(const n of kill) n.dispose();
await doc.transform(prune({keepLeaves:true}), meshopt({encoder:MeshoptEncoder,level:'medium'}));
await io.write(dst,doc);
console.log('names left',doc.getRoot().listNodes().map(n=>n.getName()).join(' ').slice(0,600));
const src2=await io.read(src);
console.log('skins before',src2.getRoot().listSkins().map(s=>s.getName()+':'+s.listJoints().length),'after',doc.getRoot().listSkins().map(s=>s.getName()+':'+s.listJoints().length));
console.log('cord skinned', !!doc.getRoot().listNodes().find(n=>n.getName()==='coiled_cord')?.getSkin(), 'register_rig', !!doc.getRoot().listNodes().find(n=>n.getName()==='register_rig'));
