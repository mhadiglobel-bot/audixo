/** AUDIXO V61 — deterministic packaging and interaction regression checks.
 * This intentionally avoids network calls and external runtime dependencies.
 */
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'..')
const source=(rel)=>fs.readFileSync(path.join(root,rel),'utf8')
const live=source('src/components/SoundExperience.tsx')
const css=source('src/styles/app.css')
const reel=path.join(root,'public/demo/audixo-phonk-v61-reel.mp3')
const covers=path.join(root,'public/demo/audixo-phonk-v61-covers.webp')
const names=['montagem-aghanim','montagem-elder','comeback-2','montagem-aghanim-slowed','montagem-tiktak','hero']
const timestamps=[0,48.767755,118.903673,185.147346,252.827754,349.033876]
const durations=[48.587755,69.955918,66.063673,67.500408,96.026122,56.111020]

test('six uploaded songs are added to the existing thirteen tracks with a unique ID per track',()=>{
 const ids=[...live.matchAll(/\{id:'([^']+)',title:'[^']+',by:'[^']+',src:PHONK_REEL/g)].map(m=>m[1])
 assert.deepEqual(ids,names)
 assert.equal((live.match(/reelTrack\('/g)||[]).length,13)
 assert.equal(new Set(ids).size,6)
})
test('new phonk tracks have distinct seek windows, fixed matching cover indices, and local assets',()=>{
 for(let i=0;i<names.length;i++){
  const slice=live.match(new RegExp(`\\{id:'${names[i]}',[^\\n]*`))?.[0]
  assert.ok(slice,`missing ${names[i]}`)
  assert.ok(slice.includes(`from:${timestamps[i].toFixed(6)}`),`start of ${names[i]}`)
  assert.ok(slice.includes(`duration:${durations[i].toFixed(6)}`),`duration of ${names[i]}`)
  assert.ok(slice.includes(`coverIndex:${i}`),`art tile of ${names[i]}`)
  if(i)assert.ok(timestamps[i]>timestamps[i-1]+durations[i-1],`segment ${i} overlaps`)
 }
 assert.ok(fs.statSync(reel).size>7_000_000,'reel is a real audio asset')
 assert.ok(fs.statSync(covers).size>20_000,'cover atlas is a real image asset')
 const webp=fs.readFileSync(covers).subarray(0,12)
 assert.equal(webp.toString('ascii',0,4),'RIFF')
 assert.equal(webp.toString('ascii',8,12),'WEBP')
})
test('audio stays on one persistent media element and switches between two packaged reels',()=>{
 assert.match(live,/const REEL='\/demo\/audixo-sample-reel\.mp3\?v=51'/)
 assert.match(live,/const PHONK_REEL='\/demo\/audixo-phonk-v61-reel\.mp3'/)
 assert.match(live,/const PHONK_COVERS='\/demo\/audixo-phonk-v61-covers\.webp'/)
 assert.ok(live.includes('media.dataset.demoSrc=track.src'))
 assert.ok(live.includes('media.load()'))
 assert.equal((live.match(/<audio ref=\{mediaRef\}/g)||[]).length,1)
})
test('glass crate is static at rest, draggable, reduced-motion aware and responsive',()=>{
 const start=live.indexOf('function MusicStrip(){')
 const end=live.indexOf('function LiveRange(',start)
 const crate=live.slice(start,end)
 for(const token of ['ax61-track-bin','ax61-track-card','IntersectionObserver','onPointerDown','onPointerMove','scrollLeft=d.scroll-delta','setPointerCapture','onClickCapture','aria-label'])assert.ok(crate.includes(token),token)
 for(const token of ['onPointerEnter','onPointerLeave','requestAnimationFrame','position=(position+delta'])assert.ok(!crate.includes(token),`unexpected automatic strip animation: ${token}`)
 for(const token of ['@keyframes ax61-card-drop','prefers-reduced-motion:reduce','ax61-new-cover','background-size:300% 200%','ax61-track-lane-clone{display:none'])assert.ok(css.includes(token),token)
})
test('Studio FX and other application features are still included',()=>{
 for(const token of ['Lo-fi Better','Echo Vibe Clean','Cave Smooth','Smart pauses','Room brightness','Vocal warmth'])assert.ok(live.includes(token),token)
 for(const rel of ['src/editor/AudioStudio.tsx','src/pages/YouTubeConverter.tsx','src/pages/Home.tsx','src/services/media.ts'])assert.ok(fs.existsSync(path.join(root,rel)),rel)
})
test('package contains no dependencies, session cookies or secrets and stays under 100 files',()=>{
 const list=[]
 function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name==='node_modules'||entry.name==='.git')throw Error(`unsafe folder: ${entry.name}`);const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else list.push(path.relative(root,full))}}
 walk(root)
 assert.ok(list.length<100,`GitHub upload count ${list.length} must be <100`)
 for(const f of list)assert.ok(!/(^|\/)(?:cookies.*\.txt|\.env(?:\.|$)|[^/]+\.pem)$/i.test(f),`private file: ${f}`)
})
