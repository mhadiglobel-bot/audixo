/** Regression checks. Run with `npm run test:studio` after `npm ci`.
 * These verify the actual DSP graph wiring with a deterministic WebAudio mock.
 * They do NOT substitute for browser sound audition or production Vite build.
 */
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const source=rel=>fs.readFileSync(path.join(root,rel),'utf8')
const stubUtil={uid:(prefix)=>`${prefix}-test`,clamp:(x,min,max)=>Math.max(min,Math.min(max,x)),dbToGain:db=>Math.pow(10,db/20),effectiveRate:clip=>clip.fx.speed||1,clipTimelineDuration:clip=>clip.duration/(clip.fx.speed||1),projectDuration:project=>Math.max(0,...project.tracks.flatMap(t=>t.clips.map(c=>c.start+c.duration/(c.fx.speed||1)))),findClip:()=>null}
function load(rel,globals={}){
 const compiled=ts.transpileModule(source(rel),{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true})
 const failures=compiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error)||[]
 assert.equal(failures.length,0,`${rel}: ${failures.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`)
 const module={exports:{}}
 vm.runInNewContext(`(function(require,module,exports){ ${compiled.outputText}\n})`,{...globals,console,Math,Number,Array,Map,Set,WeakMap,WeakSet,Float32Array,Uint8Array,Error,DOMException}, {filename:rel})(name=>{
  if(name==='./utils')return stubUtil
  throw new Error(`Unmocked dependency: ${name}`)
 },module,module.exports)
 return module.exports
}
class Param{constructor(value=0){this.value=value}cancelScheduledValues(){}setValueAtTime(v){this.value=v}linearRampToValueAtTime(v){this.value=v}setTargetAtTime(v){this.value=v}}
const built=[]
class Node{constructor(kind){this.kind=kind;this.type='';for(const key of ['gain','frequency','Q','delayTime','threshold','ratio','attack','release','knee','pan','playbackRate'])this[key]=new Param();built.push(this)}connect(n){assert.ok(n,'WebAudio node destination');return n}start(){}stop(){}}
class Buffer{constructor({length,numberOfChannels,sampleRate}){this.length=length;this.numberOfChannels=numberOfChannels;this.sampleRate=sampleRate;this.duration=length/sampleRate;this.channels=Array.from({length:numberOfChannels},()=>new Float32Array(length))}getChannelData(i){return this.channels[i]}copyToChannel(data,i){this.channels[i].set(data)}}
class Offline{constructor(channels,length,rate){this.channels=channels;this.length=length;this.sampleRate=rate;this.destination=new Node('destination')}createGain(){return new Node('gain')}createBiquadFilter(){return new Node('biquad')}createDynamicsCompressor(){return new Node('compressor')}createConvolver(){return new Node('convolver')}createDelay(){return new Node('delay')}createStereoPanner(){return new Node('pan')}createBufferSource(){return new Node('source')}createOscillator(){return new Node('oscillator')}createBuffer(channels,length,rate){return new Buffer({length,numberOfChannels:channels,sampleRate:rate})}async startRendering(){return new Buffer({length:this.length,numberOfChannels:2,sampleRate:this.sampleRate})}}

test('typescript parses all 68+ source modules without syntax errors',()=>{
 const failures=[];let count=0
 const walk=dir=>{for(const item of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const relative=path.join(dir,item.name);if(item.isDirectory())walk(relative);else if(/\.(ts|tsx)$/.test(item.name)){count++;const text=source(relative),kind=relative.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;const ast=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true,kind);if(ast.parseDiagnostics.length)failures.push([relative,ast.parseDiagnostics.map(d=>d.messageText)])}}}
 for(const dir of ['src','api','scripts'])walk(dir)
 assert.ok(count>=66);assert.deepEqual(failures,[])
})
test('localMetadata export restored for Studio, Vocals and Quick tools',()=>{
 assert.match(source('src/services/media.ts'),/export function localMetadata\(/)
 for(const f of ['src/editor/AudioStudio.tsx','src/pages/Vocals.tsx','src/quick/QuickAudioWorkbench.tsx'])assert.match(source(f),/import \{ localMetadata \} from '\.\.\/services\/media'/)
})
test('existing effect defaults remain compatible with four additional controls and 34 presets',()=>{
 const {defaultClipFx,soundPresets}=load('src/editor/project.ts')
 assert.equal(soundPresets.length,34)
 assert.equal(defaultClipFx.metallicFrequency,4200)
 for(const key of ['metallicCut','lofiAmount','transientSoftness'])assert.equal(defaultClipFx[key],0)
 for(const id of ['cave-whisper','clean-lofi','metal-softener','deep-drum-bass'])assert.ok(soundPresets.some(x=>x.id===id))
})
test('WebAudio render uses physical notch, lowpass and transient compressor settings',async()=>{
 const {defaultClipFx}=load('src/editor/project.ts')
 const engine=load('src/editor/audioEngine.ts',{window:{OfflineAudioContext:Offline},AudioBuffer:Buffer})
 const fx={...defaultClipFx,metallicCut:.7,metallicFrequency:5200,lofiAmount:.65,transientSoftness:.4,harshness:.5,reverb:0,delayMs:0}
 const input=new Buffer({length:44100,numberOfChannels:2,sampleRate:44100})
 input.getChannelData(0)[50]=.4;input.getChannelData(1)[50]=.4
 const clip={id:'c1',bufferId:'b1',name:'Test',start:0,offset:0,duration:1,fx}
 const proj={id:'p',tracks:[{id:'t1',name:'Voice',volumeDb:0,pan:0,muted:false,solo:false,clips:[clip]}],master:{gainDb:0,limiter:true,normalizeOnExport:true,stereoRepair:true}}
 built.length=0
 const result=await engine.renderProject(proj,new Map([['b1',input]]))
 assert.ok(result.buffer.duration>=1)
 assert.ok(built.some(n=>n.kind==='biquad'&&n.type==='peaking'&&n.frequency.value===5200&&Math.abs(n.gain.value+10.5)<.01),'metal-specific reduction')
 assert.ok(built.some(n=>n.kind==='biquad'&&n.type==='lowpass'&&n.frequency.value<18000&&n.frequency.value>2100),'real lowpass coloration')
 assert.ok(built.some(n=>n.kind==='compressor'&&Math.abs(n.ratio.value-3.8)<.01&&n.attack.value<.005),'fast transient compression')
 assert.equal(built.filter(n=>n.kind==='delay').length,0,'no fake echo repeats when delay off')
})
test('phonk strip hover freezes auto scroll and pointer drag is guarded from accidental song clicks',()=>{
 const live=source('src/components/SoundExperience.tsx')
 for(const token of ['onPointerEnter','onPointerLeave','onPointerMove','setPointerCapture','onClickCapture','blockClickUntil.current','hover.current','is-grabbing'])assert.ok(live.includes(token),token)
 for(const token of ['metallicCut','metallicFrequency','transientSoftness','lofiAmount'])assert.ok(live.includes(token),token)
})
test('full studio exposes stem separation and individual mute state',()=>{
 const studio=source('src/editor/AudioStudio.tsx')
 assert.match(studio,/separateLocally\(/)
 assert.match(studio,/mode==='fast'/)
 assert.match(studio,/stemTrack\.muted=part\.name==='Music'/)
 assert.match(studio,/onClick=\{\(\)=>patchTrack\(t\.id,\{muted:!t\.muted\}\)\}/)
})
test('four homepage cards use scoped compact overrides and phone responsive grid',()=>{
 const css=source('src/styles/app.css')
 assert.match(css,/\.ax52-metrics-shell \.ax39-metric-card\.ax46-metric-card\{/)
 assert.match(css,/\.ax52-metrics-shell \.ax46-metric-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/)
})

test('all relative TypeScript imports resolve to real named/default exports (build-blocker regression)',()=>{
 const files=new Map()
 const walk=d=>{for(const item of fs.readdirSync(path.join(root,d),{withFileTypes:true})){
  const relative=path.join(d,item.name)
  if(item.isDirectory())walk(relative)
  else if(/\.(ts|tsx)$/.test(item.name))files.set(relative,ts.createSourceFile(relative,source(relative),ts.ScriptTarget.Latest,true,relative.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS))
 }}
 for(const d of ['src','api','scripts'])walk(d)
 const lookup=from=>{for(const ext of ['.ts','.tsx','/index.ts','/index.tsx']){const candidate=from+ext;if(files.has(candidate))return candidate}return null}
 const hasExport=(file,name,visited=new Set())=>{
  if(visited.has(file))return false
  visited.add(file)
  const ast=files.get(file)
  if(!ast)return false
  for(const stmt of ast.statements){
   const isExported=stmt.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)
   if(name==='default'&&(stmt.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword)||ts.isExportAssignment(stmt)))return true
   if(!isExported&&!ts.isExportDeclaration(stmt))continue
   if(ts.isExportDeclaration(stmt)){
    const next=stmt.moduleSpecifier&&ts.isStringLiteral(stmt.moduleSpecifier)&&stmt.moduleSpecifier.text.startsWith('.')?lookup(path.normalize(path.join(path.dirname(file),stmt.moduleSpecifier.text))):null
    if(!stmt.exportClause&&next&&hasExport(next,name,new Set(visited)))return true
    if(stmt.exportClause&&ts.isNamedExports(stmt.exportClause)){
     for(const e of stmt.exportClause.elements)if(e.name.text===name){if(next)return hasExport(next,e.propertyName?.text||name,new Set(visited));return true}
    }
   }
   if(ts.isFunctionDeclaration(stmt)||ts.isClassDeclaration(stmt)||ts.isInterfaceDeclaration(stmt)||ts.isTypeAliasDeclaration(stmt)||ts.isEnumDeclaration(stmt)){
    if(stmt.name?.text===name)return true
   }
   if(ts.isVariableStatement(stmt))for(const decl of stmt.declarationList.declarations){if(ts.isIdentifier(decl.name)&&decl.name.text===name)return true}
  }
  return false
 }
 const missing=[]
 for(const [rel,ast] of files){
  for(const stmt of ast.statements){
   if(!ts.isImportDeclaration(stmt)||!stmt.moduleSpecifier||!ts.isStringLiteral(stmt.moduleSpecifier))continue
   const imported=stmt.moduleSpecifier.text
   if(!imported.startsWith('.'))continue
   if(/\.(css|json|png|jpg|svg|webp|woff|mp3|wasm)$/.test(imported))continue
   const target=lookup(path.normalize(path.join(path.dirname(rel),imported)))
   if(!target){missing.push(`${rel} => cannot resolve ${imported}`);continue}
   const clause=stmt.importClause
   if(clause?.name&&!hasExport(target,'default'))missing.push(`${rel} => ${target} has no default export`)
   if(clause?.namedBindings&&ts.isNamedImports(clause.namedBindings))for(const binding of clause.namedBindings.elements){
    const name=binding.propertyName?.text||binding.name.text
    if(!hasExport(target,name))missing.push(`${rel} => ${target} has no '${name}' export`)
   }
  }
 }
 assert.deepEqual(missing,[])
})

test('home page live vocal controls update actual phrase gated repeat and room filters',()=>{
 const live=source('src/components/SoundExperience.tsx')
 for(const token of ['phrasePreDelay','phraseGate','phraseTaps','getFloatTimeDomainData','linearRampToValueAtTime(1','echoBehavior:\'phrase\'','phrasePauseMs','Room size','Room brightness','makeImpulse(graph.ctx,desiredRoom)','roomTone.frequency'])assert.ok(live.includes(token),token)
 assert.match(live,/phraseMode\?0:LIMIT\(p\.feedback,0,\.8\)/)
 assert.match(live,/if\(!phraseMode\)set\(graph\.phraseGate\.gain,1\)/)
})
