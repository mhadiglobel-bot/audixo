/* AUDIXO quick editor: regression coverage for truthful fade waveforms.
 * Exercises the actual drawWave() implementation with a deterministic Canvas2D
 * double, so this test can run in the Vercel build without a browser.
 */
const fs=require('node:fs')
const vm=require('node:vm')
const assert=require('node:assert/strict')
const path=require('node:path')
const ts=require('typescript')
const file=fs.readFileSync(path.join(__dirname,'..','src','quick','QuickAudioWorkbench.tsx'),'utf8')
const start=file.indexOf('function drawWave('),end=file.indexOf('/** Custom A/B transport',start)
assert.ok(start>=0&&end>start,'Quick editor waveform implementation must be present')
const raw=file.slice(start,end)
const js=ts.transpileModule(raw,{fileName:'draw-wave.ts',compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
const sandbox={module:{exports:null},window:{devicePixelRatio:2}}
vm.runInNewContext(js+'\nmodule.exports=drawWave',sandbox,{filename:'draw-wave.js'})
const drawWave=sandbox.module.exports
function fakeCanvas(){
 const strokes=[];let path=[]
 const ctx={
  setTransform(){},clearRect(){},createLinearGradient(){return {addColorStop(){}}},
  beginPath(){path=[]},moveTo(x,y){path.push({x,y,command:'M'})},
  lineTo(x,y){path.push({x,y,command:'L'})},
  stroke(){strokes.push(path.slice())},
 }
 return {canvas:{getBoundingClientRect(){return{width:200,height:100}},getContext(){return ctx}},strokes}
}
const samples=new Float32Array(20*16000).fill(.8)
const source={duration:20,sampleRate:16000,length:samples.length,numberOfChannels:1,getChannelData(){return samples}}
function peaks(stroke){
 const cols=[]
 for(let i=0;i<stroke.length;i+=2)if(stroke[i]?.command==='M'&&stroke[i+1]?.command==='L')cols.push({x:stroke[i].x,height:Math.abs(stroke[i+1].y-stroke[i].y)})
 return cols
}
const full=fakeCanvas();drawWave(full.canvas,source,0,20,8,8)
assert.equal(full.strokes.length,3,'source, processed envelope and centerline must each be drawn once')
assert.equal(full.strokes[0].length,0,'faded source must not leave a visible ghost behind the processed envelope')
const bars=peaks(full.strokes[1])
assert.ok(bars.length>=190,'complete source waveform remains visible')
const near=x=>bars.reduce((a,b)=>Math.abs(b.x-x)<Math.abs(a.x-x)?b:a)
assert.ok(near(10).height>50,'center of the sound remains at full amplitude')
assert.ok(near(0).height<1,'fade-in begins at almost zero waveform height')
assert.ok(near(200).height<1,'fade-out ends at almost zero waveform height')
assert.ok(near(4).height<near(10).height*.65,'the beginning tapers over the selected fade duration')
assert.ok(near(196).height<near(10).height*.65,'the ending tapers over the selected fade duration')
const trimmed=fakeCanvas();drawWave(trimmed.canvas,source,5,15,4,4)
assert.ok(trimmed.strokes[0].length>0,'original is faintly visible outside the selected range')
const active=peaks(trimmed.strokes[1])
assert.ok(active.every(b=>b.x>=49&&b.x<=151),'processed peaks stay inside the selected region')
assert.ok(file.includes('Math.min(22,selectedDuration/2)'),'both sliders must allow up to 22 seconds within the safe selected-range limit')
assert.ok(!file.includes('Math.min(8,selectedDuration/2)'),'old 8-second limitation must not return')
assert.ok(!file.includes('className="v13-fade-zone fade-in"'),'decorative fade overlay must not obscure the true canvas envelope')
assert.ok(file.includes('role="switch"')&&file.includes('aria-checked={value}'),'fade/echo switches must expose accessible state')
console.log('PASSED: truthful waveform fades, no ghost envelope, accurate trim, 22s cap, accessible switches')
