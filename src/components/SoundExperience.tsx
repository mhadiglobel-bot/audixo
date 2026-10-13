import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {useLocation,Link} from 'react-router-dom'
import {soundPresets} from '../editor/project'
import type {ClipFx,SoundPreset} from '../editor/types'

/* All demo sounds are synthesized locally. No uploaded track is sent to a server. */
const AC = ()=>new window.AudioContext()
type FxName='Echo'|'Reverb'|'Pitch'|'Slowed'
const FX_NAMES:FxName[]=['Echo','Reverb','Pitch','Slowed']
type AudioGraph={ctx:AudioContext;sources:AudioBufferSourceNode[];gainDry:GainNode;gainWet:GainNode;analyser:AnalyserNode;master:GainNode;nodes:AudioNode[];delayReturn:GainNode|null;reverbReturn:GainNode|null}
let soundEnabled=false
let activeAmbient:{ctx:AudioContext;source:AudioBufferSourceNode;frame:number}|null=null
let playgroundActive=false

function toneBuffer(ctx:AudioContext){
 const len=Math.floor(ctx.sampleRate*7.5),buffer=ctx.createBuffer(2,len,ctx.sampleRate)
 for(let ch=0;ch<2;ch++){
  const data=buffer.getChannelData(ch)
  for(let i=0;i<len;i++){
   const t=i/ctx.sampleRate,section=Math.floor(t/1.875)%4
   const root=[164.81,146.83,174.61,130.81][section]
   const intro=Math.min(1,t*.7),out=Math.min(1,(7.5-t)*.7)
   const beat=t%(60/88),envelope=Math.exp(-beat*9)
   const pad=(Math.sin(2*Math.PI*root*t)+.43*Math.sin(2*Math.PI*(root*1.5)*t+.2*ch)+.28*Math.sin(2*Math.PI*(root*2.02)*t))*.16
   const bass=Math.sin(2*Math.PI*(root/2)*t)*.1
   const pulse=envelope*Math.sin(2*Math.PI*(root*3)*t)*.065
   const shimmer=.015*Math.sin(2*Math.PI*(880+Math.sin(t*.4)*23)*t)
   data[i]=Math.max(-.8,Math.min(.8,(pad+bass+pulse+shimmer)*intro*out))
  }
 }
 return buffer
}
function stopAmbient(){if(activeAmbient)cancelAnimationFrame(activeAmbient.frame);try{activeAmbient?.source.stop()}catch{}void activeAmbient?.ctx.close().catch(()=>{});activeAmbient=null;document.documentElement.style.removeProperty('--audixo-audio-pulse');document.documentElement.style.removeProperty('--audixo-disc-scale')}
async function startAmbient(){
 if(!soundEnabled||playgroundActive||activeAmbient)return
 try{const ctx=AC();await ctx.resume();if(!soundEnabled||playgroundActive){void ctx.close();return}const source=ctx.createBufferSource(),gain=ctx.createGain(),analyser=ctx.createAnalyser();source.buffer=toneBuffer(ctx);source.loop=true;gain.gain.value=.14;source.connect(gain);gain.connect(analyser);analyser.connect(ctx.destination);source.start();activeAmbient={ctx,source,frame:0};analyser.fftSize=64;const freq=new Uint8Array(analyser.frequencyBinCount);const draw=()=>{if(!activeAmbient||activeAmbient.source!==source)return;analyser.getByteFrequencyData(freq);const bass=freq.slice(1,9).reduce((n,v)=>n+v,0)/8;document.documentElement.style.setProperty('--audixo-audio-pulse',String(Math.min(1,bass/140)));document.documentElement.style.setProperty('--audixo-disc-scale',String(1+Math.min(1,bass/140)*.06));activeAmbient.frame=requestAnimationFrame(draw)};draw()}catch{stopAmbient()}
}
function shortChime(){if(!soundEnabled)return;try{const ctx=AC();void ctx.resume();const now=ctx.currentTime;[622.25,830.61].forEach((freq,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,now+i*.11);g.gain.linearRampToValueAtTime(.045,now+i*.11+.015);g.gain.exponentialRampToValueAtTime(.001,now+i*.11+.28);o.connect(g);g.connect(ctx.destination);o.start(now+i*.11);o.stop(now+i*.11+.3)});window.setTimeout(()=>void ctx.close().catch(()=>{}),1000)}catch{}}
export function emitAudixoSuccess(){window.dispatchEvent(new Event('audixo:export-success'))}
export function emitAudixoInteraction(){window.dispatchEvent(new Event('audixo:interaction'))}
let clickContext:AudioContext|null=null
function tinyClick(){if(!soundEnabled)return;try{const ctx=clickContext??(clickContext=AC());void ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;osc.type='sine';osc.frequency.setValueAtTime(680,t);osc.frequency.exponentialRampToValueAtTime(820,t+.06);gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.016,t+.007);gain.gain.exponentialRampToValueAtTime(.0001,t+.095);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.1)}catch{}}


export function SoundModeControl(){
 const {pathname}=useLocation(),[enabled,setEnabled]=useState(soundEnabled)
 useEffect(()=>{const onChime=()=>shortChime(),onClick=()=>tinyClick();const demoStart=()=>{playgroundActive=true;stopAmbient()},demoStop=()=>{playgroundActive=false;if(pathname==='/')void startAmbient()};window.addEventListener('audixo:export-success',onChime);window.addEventListener('audixo:interaction',onClick);window.addEventListener('audixo:demo-start',demoStart);window.addEventListener('audixo:demo-stop',demoStop);return()=>{window.removeEventListener('audixo:export-success',onChime);window.removeEventListener('audixo:interaction',onClick);window.removeEventListener('audixo:demo-start',demoStart);window.removeEventListener('audixo:demo-stop',demoStop)}},[pathname])
 useEffect(()=>{if(pathname!=='/')stopAmbient();else if(soundEnabled)void startAmbient()},[pathname])
 const toggle=()=>{soundEnabled=!soundEnabled;setEnabled(soundEnabled);if(soundEnabled&&pathname==='/')void startAmbient();else stopAmbient()}
 return <button type="button" className={`ax48-sound-toggle ${enabled?'is-on':''}`} aria-label={`Sound effects ${enabled?'on':'off'}`} aria-pressed={enabled} onClick={toggle}><span className="ax48-toggle-bars" aria-hidden="true"><i/><i/><i/><i/></span><strong>Sound {enabled?'On':'Off'}</strong><small>{pathname==='/'?'Ambient + cues':'Cues only'}</small></button>
}


function impulse(ctx:AudioContext,seconds=1.6){const count=Math.floor(ctx.sampleRate*seconds),buffer=ctx.createBuffer(2,count,ctx.sampleRate);let seed=78231;for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<count;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=(seed/2147483648)*Math.pow(1-i/count,2.6)*.42}}return buffer}
function stopGraph(graph:AudioGraph|null){if(!graph)return;for(const s of graph.sources){try{s.stop()}catch{}}for(const n of graph.nodes){try{n.disconnect()}catch{}}void graph.ctx.close().catch(()=>{})}
function makeGraph(buffer:AudioBuffer,effect:FxName,preset:SoundPreset|null,intensity:number,morph:number):AudioGraph{
 const ctx=AC()
 const nodes:AudioNode[]=[],master=ctx.createGain(),analyser=ctx.createAnalyser(),dry=ctx.createGain(),wet=ctx.createGain()
 nodes.push(master,analyser,dry,wet)
 analyser.fftSize=128;analyser.smoothingTimeConstant=.76
 master.gain.value=.67;master.connect(analyser);analyser.connect(ctx.destination)
 dry.gain.value=Math.cos((morph/100)*Math.PI/2);wet.gain.value=Math.sin((morph/100)*Math.PI/2)
 dry.connect(master);wet.connect(master)
 const patch:Partial<ClipFx>=preset?.patch||{}
 const isEcho=effect==='Echo',isReverb=effect==='Reverb',isPitch=effect==='Pitch',isSlowed=effect==='Slowed'
 const strength=Math.max(.1,intensity/100)
 const rate=(patch.speed??(isSlowed?.78:1))*Math.pow(2,(patch.tapePitchSemitones??(isPitch?4*strength:0))/12)
 const sourceDry=ctx.createBufferSource(),sourceFx=ctx.createBufferSource()
 sourceDry.buffer=buffer;
 if(patch.reverse){const reversed=ctx.createBuffer(buffer.numberOfChannels,buffer.length,buffer.sampleRate);for(let ch=0;ch<buffer.numberOfChannels;ch++)reversed.getChannelData(ch).set(buffer.getChannelData(ch).slice().reverse());sourceFx.buffer=reversed}
 else sourceFx.buffer=buffer;
 sourceDry.loop=true;sourceFx.loop=true;sourceFx.playbackRate.value=Math.max(.5,Math.min(1.6,rate))
 sourceDry.connect(dry)
 const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=180;bass.gain.value=patch.bassDb||0
 const mid=ctx.createBiquadFilter();mid.type='peaking';mid.frequency.value=1800;mid.Q.value=.85;mid.gain.value=patch.midDb||0
 const treble=ctx.createBiquadFilter();treble.type='highshelf';treble.frequency.value=4200;treble.gain.value=patch.trebleDb||0
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=2.4
 nodes.push(sourceDry,sourceFx,bass,mid,treble,compressor)
 sourceFx.connect(bass);bass.connect(mid);mid.connect(treble)
 const fxOut=ctx.createGain();nodes.push(fxOut)
 if(patch.compressor){treble.connect(compressor);compressor.connect(fxOut)}else treble.connect(fxOut)
 if(patch.motionMode&&patch.motionMode!=='off'&&typeof ctx.createStereoPanner==='function'){
  const pan=ctx.createStereoPanner(),lfo=ctx.createOscillator(),depth=ctx.createGain();nodes.push(pan,lfo,depth);lfo.type='sine';lfo.frequency.value=Math.min(2,Math.max(.02,patch.motionHz||.15));depth.gain.value=Math.min(.9,Math.max(.05,patch.motionDepth||.65));lfo.connect(depth);depth.connect(pan.pan);fxOut.connect(pan);pan.connect(wet);lfo.start()
 }else fxOut.connect(wet)
 let delayReturn:GainNode|null=null,reverbReturn:GainNode|null=null
 const delayMs=patch.delayMs??(isEcho?230+intensity*2:0),delayWet=patch.delayWet??(isEcho?(0.12+0.27*strength):0)
 if(delayMs>0&&delayWet>0){const d=ctx.createDelay(1.2),feedback=ctx.createGain(),returnGain=ctx.createGain();nodes.push(d,feedback,returnGain);d.delayTime.value=Math.min(1.1,delayMs/1000);feedback.gain.value=Math.min(.65,patch.feedback??.22);returnGain.gain.value=Math.min(.7,delayWet);fxOut.connect(d);d.connect(feedback);feedback.connect(d);d.connect(returnGain);returnGain.connect(wet);delayReturn=returnGain}
 const reverbMix=patch.reverb??(isReverb?(0.15+0.45*strength):0)
 if(reverbMix>.02){const convolver=ctx.createConvolver(),returnGain=ctx.createGain();nodes.push(convolver,returnGain);convolver.buffer=impulse(ctx,1.2+strength);returnGain.gain.value=Math.min(.65,reverbMix);fxOut.connect(convolver);convolver.connect(returnGain);returnGain.connect(wet);reverbReturn=returnGain}
 // Real audio effects, including EQ and delays, use the selected preset's ClipFx fields.
 sourceDry.start(0);sourceFx.start(0)
 return {ctx,sources:[sourceDry,sourceFx],gainDry:dry,gainWet:wet,analyser,master,nodes,delayReturn,reverbReturn}
}

export function SoundPlayground(){
 const [effect,setEffect]=useState<FxName>('Echo'),[intensity,setIntensity]=useState(48),[morph,setMorph]=useState(55),[presetId,setPresetId]=useState(''),[active,setActive]=useState(false),[status,setStatus]=useState('Choose Play Demo to hear an original AUDIXO sample.'),[uploaded,setUploaded]=useState('')
 const [presetSearch,setPresetSearch]=useState(''),[galleryOpen,setGalleryOpen]=useState(false)
 const sourceBuffer=useRef<AudioBuffer|null>(null),demoBuffer=useRef<AudioBuffer|null>(null),graph=useRef<AudioGraph|null>(null),raf=useRef(0),bars=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null)
 const chosenPreset=useMemo(()=>soundPresets.find(p=>p.id===presetId)||null,[presetId]);const filteredPresets=useMemo(()=>soundPresets.filter(p=>`${p.name} ${p.group}`.toLowerCase().includes(presetSearch.toLowerCase())),[presetSearch])
 const endAudio=useCallback((announce=true)=>{cancelAnimationFrame(raf.current);stopGraph(graph.current);graph.current=null;setActive(false);document.documentElement.style.removeProperty('--audixo-audio-pulse');document.documentElement.style.removeProperty('--audixo-disc-scale');if(announce)window.dispatchEvent(new Event('audixo:demo-stop'))},[])
 const paint=(analyser:AnalyserNode)=>{if(!bars.current)return;const arr=new Uint8Array(analyser.frequencyBinCount);let last=0;const tick=(now:number)=>{if(now-last>38&&!document.hidden){last=now;analyser.getByteFrequencyData(arr);if(bars.current){for(let i=0;i<bars.current.children.length;i++){const bin=arr[Math.min(arr.length-1,i*2)],el=bars.current.children[i] as HTMLElement;el.style.transform=`scaleY(${.24+bin/300})`;if(i===4){document.documentElement.style.setProperty('--audixo-audio-pulse',String(Math.min(1,bin/165)));document.documentElement.style.setProperty('--audixo-disc-scale',String(1+Math.min(1,bin/165)*.06))}}}}raf.current=requestAnimationFrame(tick)};raf.current=requestAnimationFrame(tick)}
 const play=async(override?:{fx?:FxName;id?:string})=>{
  if(active&&!override){endAudio();setStatus('Demo paused. Play again to continue exploring.');return}
  endAudio(false)
  try{
   if(!sourceBuffer.current&&!demoBuffer.current){const sourceCtx=AC();demoBuffer.current=toneBuffer(sourceCtx);void sourceCtx.close().catch(()=>{})}
   const audio=sourceBuffer.current||demoBuffer.current!
   const selectedFx=override?.fx||effect
   const selectedPreset=(override?.id!==undefined?soundPresets.find(p=>p.id===override.id):chosenPreset)||null
   const next=makeGraph(audio,selectedFx,selectedPreset,intensity,morph)
   graph.current=next;await next.ctx.resume();paint(next.analyser);setActive(true);setStatus(uploaded?`Playing ${uploaded} locally — ${selectedPreset?.name||selectedFx} preview.`:`Playing original AUDIXO demo — ${selectedPreset?.name||selectedFx} preview.`);window.dispatchEvent(new Event('audixo:demo-start'))
  }catch{stopGraph(graph.current);graph.current=null;setStatus('Playback is blocked by this browser. Press Play again or use current Chrome/Edge.');setActive(false)}
 }
 const update=(m:number)=>{setMorph(m);if(graph.current){graph.current.gainDry.gain.setTargetAtTime(Math.cos((m/100)*Math.PI/2),graph.current.ctx.currentTime,.025);graph.current.gainWet.gain.setTargetAtTime(Math.sin((m/100)*Math.PI/2),graph.current.ctx.currentTime,.025)}}
 const chooseFx=(fx:FxName)=>{emitAudixoInteraction();setEffect(fx);setPresetId('');if(active)void play({fx,id:''})}
 const choosePreset=(preset:SoundPreset)=>{emitAudixoInteraction();setPresetId(preset.id);setGalleryOpen(true);void play({id:preset.id})}
 const upload=async(file?:File)=>{if(!file)return;if(file.size>18*1024*1024){setStatus('Choose an audio sample under 18 MB to keep the demo responsive.');return}endAudio();setStatus('Decoding your audio locally…');try{const ctx=AC();const buffer=await ctx.decodeAudioData(await file.arrayBuffer());void ctx.close();if(buffer.duration>120){setStatus('Use a recording under 2 minutes for this interactive comparison.');return}sourceBuffer.current=buffer;setUploaded(file.name);setStatus(`${file.name} loaded locally. Press Play to compare.`)}catch{setStatus('Unable to decode this file. Try MP3 or WAV.')}}
 useEffect(()=>()=>{cancelAnimationFrame(raf.current);stopGraph(graph.current);graph.current=null;playgroundActive=false;document.documentElement.style.removeProperty('--audixo-audio-pulse');document.documentElement.style.removeProperty('--audixo-disc-scale');window.dispatchEvent(new Event('audixo:demo-stop'))},[])
 return <section className="ax48-playground" aria-labelledby="audixo-playground-title">
  <div className="ax48-play-head"><div><div className="ax25-kicker"><i/> AUDIXO / SOUND PLAYGROUND</div><h2 id="audixo-playground-title">Hear the difference.<br/><em>Shape it live.</em></h2><p>Try real echo, reverb, pitch and slowed effects before importing a project. An original synthesized demo plays only when you choose.</p></div><span className="ax48-play-chip">NO UPLOAD REQUIRED</span></div>
  <div className="ax48-play-layout">
   <div className="ax48-play-visual"><div className={`ax48-play-disc ${active?'playing':''}`}><i/><img src="/audixo-official-symbol.png" alt=""/></div><div className={`ax48-play-bars ${active?'playing':''}`} ref={bars} aria-hidden="true">{Array.from({length:28},(_,i)=><i key={i} style={{'--n':i} as CSSProperties}/>)}</div><div className="ax48-play-player"><button type="button" className="ax48-play-main" onClick={()=>void play()} aria-label={active?'Stop demo':'Play demo'}>{active?'■':'▶'}</button><span><strong>{uploaded||'Original AUDIXO demo'}</strong><small>{active?'Playing · Live effects':'Original sound · Browser audio'}</small></span><button type="button" className="ax48-play-upload" onClick={()=>input.current?.click()}>Your audio ↗</button><input hidden ref={input} type="file" accept="audio/*,.mp3,.wav,.m4a" onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/></div></div>
   <div className="ax48-play-controls"><header><small>LIVE FX ENGINE</small><strong>One click. Real sound.</strong></header><div className="ax48-fx-choices" role="group" aria-label="Live sound effect">{FX_NAMES.map(fx=><button type="button" key={fx} className={effect===fx&&!presetId?'active':''} onClick={()=>chooseFx(fx)} aria-pressed={effect===fx&&!presetId}>{fx}</button>)}</div><label className="ax48-play-range"><span><b>Effect intensity</b><output>{intensity}%</output></span><input type="range" min="10" max="100" step="5" value={intensity} onChange={e=>{const v=+e.target.value;setIntensity(v);const g=graph.current;if(g){const t=g.ctx.currentTime,k=v/100;if(g.delayReturn)g.delayReturn.gain.setTargetAtTime((chosenPreset?.patch.delayWet??(.12+.27*k))*(.35+.65*k),t,.035);if(g.reverbReturn)g.reverbReturn.gain.setTargetAtTime((chosenPreset?.patch.reverb??(.15+.45*k))*(.4+.6*k),t,.035);if(!chosenPreset&&(effect==='Pitch'||effect==='Slowed'))g.sources[1].playbackRate.setTargetAtTime(effect==='Pitch'?Math.pow(2,(4*k)/12):(.94-.24*k),t,.04)}}}/></label><label className="ax48-play-range ax48-compare-range"><span><b>Before / After</b><output>{morph===0?'Original':morph===100?'Processed':`${morph}% processed`}</output></span><input type="range" min="0" max="100" value={morph} onChange={e=>update(+e.target.value)} style={{'--progress':`${morph}%`} as CSSProperties}/><div className="ax48-compare-label"><span>ORIGINAL</span><span>BLEND</span><span>FX RESULT</span></div></label><p className="ax48-play-status" role="status">{status}</p><button className="ax48-preset-toggle" type="button" aria-expanded={galleryOpen} onClick={()=>setGalleryOpen(v=>!v)}><span>Explore {soundPresets.length} studio presets</span><b>{galleryOpen?'Hide −':'Open ↗'}</b></button></div>
  </div>
  {galleryOpen&&<div className="ax48-play-presets"><header><div><strong>Preview a preset</strong><p>Short demo applied with each preset's supported audio parameters. Fine-tune the full preset inside Studio.</p></div><input aria-label="Find a studio preset" value={presetSearch} onChange={e=>setPresetSearch(e.target.value)} placeholder="Find a sound…" type="search"/></header><div className="ax48-preset-grid">{filteredPresets.map((p,i)=><button key={p.id} type="button" className={presetId===p.id?'active':''} onClick={()=>choosePreset(p)}><span>{String(soundPresets.indexOf(p)+1).padStart(2,'0')} / {p.group.toUpperCase()}</span><strong>{p.name}</strong><small>{p.note}</small><b>{presetId===p.id&&active?'▶ Playing':'▷ Try sample'}</b></button>)}</div></div>}
  <div className="ax48-play-foot"><span>Played only with your consent · Original demo composition · Processed locally</span><Link to="/editor">Open full editor ↗</Link></div>
 </section>
}
