import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {Link,useLocation} from 'react-router-dom'
import {defaultClipFx,soundPresets} from '../editor/project'
import type {ClipFx,SoundPreset} from '../editor/types'


// V49: One persistent media element and one Web Audio graph. Effects change node
// parameters in place; React route changes never re-create the music player.
// The supplied audio excerpts were combined into ONE seekable MP3 reel.
const REEL='/demo/audixo-sample-reel.mp3?v=51'
export type DemoTrack={id:string;title:string;by:string;from:number;duration:number;coverIndex:number;tag:string}
export const DEMO_TRACKS:DemoTrack[]=[
 {
  "id": "teu-perfume",
  "title": "Teu Perfume",
  "by": "Orch Mix",
  "from": 0.0,
  "duration": 79.36106576,
  "coverIndex": 0,
  "tag": "USER CLIP"
 },
 {
  "id": "te-conoci",
  "title": "Te Conoc\u00ed",
  "by": "bxkq x PXLWYSE - Remix",
  "from": 79.51106576,
  "duration": 29.83290249,
  "coverIndex": 1,
  "tag": "USER CLIP"
 },
 {
  "id": "aura-farming",
  "title": "Aura Farming",
  "by": "Mustafa Saboori",
  "from": 109.49396825,
  "duration": 34.73979592,
  "coverIndex": 2,
  "tag": "USER CLIP"
 },
 {
  "id": "montagem-ahora",
  "title": "Montagem Ahora",
  "by": "NUEKI x QMIIR",
  "from": 144.38376417,
  "duration": 31.79698413,
  "coverIndex": 3,
  "tag": "USER CLIP"
 },
 {
  "id": "montagem-illuminal",
  "title": "Montagem Illuminal",
  "by": "Funk / Phonk",
  "from": 176.3307483,
  "duration": 37.24099773,
  "coverIndex": 4,
  "tag": "USER CLIP"
 },
 {
  "id": "montagem-royal",
  "title": "Montagem Royal",
  "by": "Slowed",
  "from": 213.72174603,
  "duration": 48.3929932,
  "coverIndex": 5,
  "tag": "USER CLIP"
 },
 {
  "id": "baila-lento",
  "title": "Baila Lento",
  "by": "Funk / Phonk",
  "from": 262.26473923,
  "duration": 29.6129932,
  "coverIndex": 6,
  "tag": "USER CLIP"
 },
 {
  "id": "tiki-tiki",
  "title": "Tiki Tiki",
  "by": "Funk / Phonk",
  "from": 292.02773243,
  "duration": 87.08501134,
  "coverIndex": 7,
  "tag": "USER CLIP"
 },
 {
  "id": "funk-sigilo",
  "title": "Funk Sigilo",
  "by": "Funk / Phonk",
  "from": 379.26274376,
  "duration": 23.15800454,
  "coverIndex": 8,
  "tag": "USER CLIP"
 },
 {
  "id": "funk-power",
  "title": "Funk Power",
  "by": "Funk / Phonk",
  "from": 402.5707483,
  "duration": 35.19501134,
  "coverIndex": 9,
  "tag": "USER CLIP"
 },
 {
  "id": "veki-veki",
  "title": "VEKI VEKI",
  "by": "DJZRX",
  "from": 437.91575964,
  "duration": 42.9921542,
  "coverIndex": 10,
  "tag": "USER CLIP"
 },
 {
  "id": "siento-conmigo",
  "title": "SIENTO CONMIGO",
  "by": "Slowed TikTok",
  "from": 481.05791383,
  "duration": 48.26356009,
  "coverIndex": 11,
  "tag": "USER CLIP"
 },
 {
  "id": "montagem-alquimia",
  "title": "MONTAGEM ALQUIMIA",
  "by": "Funk / Phonk",
  "from": 529.47147392,
  "duration": 66.5476644,
  "coverIndex": 12,
  "tag": "USER CLIP"
 }
]

type FxTab='Clip'|'Tone'|'Space'|'Echo'|'Motion'|'Style'
const FX_TABS:FxTab[]=['Clip','Tone','Space','Echo','Motion','Style']
const NEUTRAL:ClipFx={...defaultClipFx}
const LIMIT=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
const decibels=(db:number)=>Math.pow(10,db/20)
const formatTime=(v:number)=>`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`
const isEditorPath=(path:string)=>path==='/editor'||path==='/library'||path.startsWith('/tools/')||path.startsWith('/tool/')

type SoundGraph={
 ctx:AudioContext; source:MediaElementAudioSourceNode;
 dry:GainNode; wet:GainNode; inGain:GainNode;
 bass:BiquadFilterNode;mid:BiquadFilterNode;treble:BiquadFilterNode;
 pan:StereoPannerNode; delay:DelayNode;feedback:GainNode;delayReturn:GainNode;
 reverb:ConvolverNode;reverbReturn:GainNode;mix:GainNode;
 analyser:AnalyserNode;compressor:DynamicsCompressorNode;master:GainNode;
}

function makeImpulse(ctx:AudioContext){
 const len=Math.floor(ctx.sampleRate*.9),b=ctx.createBuffer(2,len,ctx.sampleRate)
 let seed=8719
 for(let ch=0;ch<2;ch++){const a=b.getChannelData(ch);for(let i=0;i<len;i++){
  seed=(Math.imul(seed,1664525)+1013904223)|0
  a[i]=(seed/2147483648)*Math.pow(1-i/len,2.3)*.42
 }}return b
}
function createGraph(media:HTMLAudioElement):SoundGraph{
 const ctx=new window.AudioContext()
 const source=ctx.createMediaElementSource(media)
 const dry=ctx.createGain(),wet=ctx.createGain(),inGain=ctx.createGain()
 const bass=ctx.createBiquadFilter(),mid=ctx.createBiquadFilter(),treble=ctx.createBiquadFilter()
 const pan=ctx.createStereoPanner(),delay=ctx.createDelay(1.5),feedback=ctx.createGain(),delayReturn=ctx.createGain()
 const reverb=ctx.createConvolver(),reverbReturn=ctx.createGain(),mix=ctx.createGain(),analyser=ctx.createAnalyser(),compressor=ctx.createDynamicsCompressor(),master=ctx.createGain()
 bass.type='lowshelf';bass.frequency.value=170
 mid.type='peaking';mid.frequency.value=1050;mid.Q.value=.8
 treble.type='highshelf';treble.frequency.value=4000
 reverb.buffer=makeImpulse(ctx)
 source.connect(dry);dry.connect(mix)
 source.connect(inGain);inGain.connect(bass);bass.connect(mid);mid.connect(treble);treble.connect(pan);pan.connect(wet);wet.connect(mix)
 pan.connect(delay);delay.connect(delayReturn);delayReturn.connect(wet);delay.connect(feedback);feedback.connect(delay)
 pan.connect(reverb);reverb.connect(reverbReturn);reverbReturn.connect(wet)
 mix.connect(compressor);compressor.connect(analyser);analyser.connect(master);master.connect(ctx.destination)
 compressor.threshold.value=-4;compressor.ratio.value=2.8;compressor.knee.value=8
 analyser.fftSize=256;analyser.smoothingTimeConstant=.79
 return {ctx,source,dry,wet,inGain,bass,mid,treble,pan,delay,feedback,delayReturn,reverb,reverbReturn,mix,analyser,compressor,master}
}
function setAudioParams(graph:SoundGraph,media:HTMLAudioElement,p:ClipFx,compare:number,volume:number,nowMotion=0){
 const t=graph.ctx.currentTime,s=.025
 const set=(node:AudioParam,value:number)=>node.setTargetAtTime(value,t,s)
 const mix=LIMIT(compare/100,0,1)
 // Equal-power compare, avoiding a volume hole at 50%.
 set(graph.dry.gain,1-mix)
 set(graph.wet.gain,mix)
 set(graph.inGain.gain,decibels(LIMIT(p.gainDb,-12,9)))
 set(graph.bass.gain,LIMIT(p.bassDb,-12,12));set(graph.mid.gain,LIMIT(p.midDb,-12,12));set(graph.treble.gain,LIMIT(p.trebleDb,-12,12))
 set(graph.pan.pan,LIMIT(p.pan+nowMotion,-1,1))
 set(graph.delay.delayTime,LIMIT(p.delayMs/1000,.005,1.35))
 set(graph.feedback.gain,LIMIT(p.feedback,0,.68));set(graph.delayReturn.gain,LIMIT(p.delayWet,0,.58))
 set(graph.reverbReturn.gain,LIMIT(p.reverb,0,.70))
 set(graph.compressor.threshold,p.compressor?-18:0)
 set(graph.compressor.ratio,p.compressor?3.2:1)
 set(graph.master.gain,LIMIT(volume/100,0,1)*.82)
 let rate=LIMIT(p.speed,.55,1.55)
 // Audio-element pitch is a tape-style pitch/speed change in this live preview;
 // precise independent semitone shifting remains in the full editor.
 if(p.tapePitchSemitones)rate*=Math.pow(2,LIMIT(p.tapePitchSemitones,-8,8)/12)
 media.playbackRate=LIMIT(rate,.5,1.9)
 media.preservesPitch=!!p.preservePitch
}

export function emitAudixoSuccess(){if(typeof window!=='undefined')window.dispatchEvent(new Event('audixo:export-success'))}
export function emitAudixoInteraction(){if(typeof window!=='undefined')window.dispatchEvent(new Event('audixo:interaction'))}

type SoundContextValue={
 trackIndex:number|null;isPlaying:boolean;activeTab:FxTab;setActiveTab:(t:FxTab)=>void
 params:ClipFx;change:(patch:Partial<ClipFx>)=>void; compare:number;setCompare:(v:number)=>void
 volume:number;setVolume:(v:number)=>void;progress:number;seek:(v:number)=>void
 presetId:string;applyPreset:(p:SoundPreset)=>void;selectTrack:(i:number)=>void;toggle:()=>void
 error:string;meterRef:(el:HTMLDivElement|null)=>void;cueEnabled:boolean;setCueEnabled:(b:boolean)=>void
}
const SoundContext=createContext<SoundContextValue|null>(null)
function useSound(){const val=useContext(SoundContext);if(!val)throw new Error('AUDIXO sound provider missing');return val}

export function SoundExperienceProvider({children}:{children:ReactNode}){
 const {pathname}=useLocation()
 const mediaRef=useRef<HTMLAudioElement>(null),graphRef=useRef<SoundGraph|null>(null)
 const [trackIndex,setTrackIndex]=useState<number|null>(null),[isPlaying,setPlaying]=useState(false),[activeTab,setActiveTab]=useState<FxTab>('Clip')
 const [params,setParams]=useState<ClipFx>({...NEUTRAL}),[compare,setCompare]=useState(100),[volume,setVolume]=useState(62),[progress,setProgress]=useState(0)
 const [presetId,setPresetId]=useState(''),[error,setError]=useState(''),[cueEnabled,setCueEnabled]=useState(false)
 const meterDom=useRef<HTMLDivElement|null>(null),selected=useRef<number|null>(null),pendingStart=useRef<number|null>(null),lastMeterFrame=useRef(0)
 const trackPlaying=useRef(false),lastFrame=useRef(0),lastMotion=useRef(0)
 const contextRef=useRef<AudioContext|null>(null)
  const setTrack=(v:number|null)=>{selected.current=v;setTrackIndex(v)}
 const ensureGraph=()=>{
  if(!mediaRef.current)return null
  if(!graphRef.current){graphRef.current=createGraph(mediaRef.current);contextRef.current=graphRef.current.ctx;setAudioParams(graphRef.current,mediaRef.current,NEUTRAL,100,62)}
  void graphRef.current.ctx.resume().catch(()=>setError('Browser audio is blocked. Tap Play again.'))
  return graphRef.current
 }
 const change=useCallback((patch:Partial<ClipFx>)=>{setParams(p=>{
  const next={...p,...patch}
  if(patch.delayMs!==undefined&&patch.delayMs>0&&p.delayWet===0)next.delayWet=.18
  if(patch.feedback!==undefined&&p.delayWet===0){next.delayWet=.17;next.delayMs=next.delayMs||260}
  if(patch.delayWet!==undefined&&patch.delayWet>0&&next.delayMs<20)next.delayMs=260
  return next
 })},[])
 const applyPreset=useCallback((preset:SoundPreset)=>{
  setPresetId(preset.id)
  setParams({...NEUTRAL,...preset.patch})
  setCompare(100)
  setError(preset.patch.reverse?'Reverse playback requires the full Studio. Other preset settings are previewed live.':'')
 },[])
 const selectTrack=useCallback((i:number)=>{
  if(i<0||i>=DEMO_TRACKS.length||!mediaRef.current)return
  setTrack(i);setParams({...NEUTRAL});setPresetId('');setCompare(100);setActiveTab('Clip');setError('')
  const media=mediaRef.current,track=DEMO_TRACKS[i]
  pendingStart.current=track.from
  try{
   ensureGraph()
   if(media.readyState>=1){media.currentTime=track.from;pendingStart.current=null}
   // play() is intentionally invoked INSIDE the actual click handler for browser consent.
   const p=media.play()
   void p.then(()=>{if(!media.paused){trackPlaying.current=true;setPlaying(true)}}).catch(()=>{setPlaying(false);setError('Playback needs a user gesture. Tap Play again.')})
  }catch{setError('Audio is unavailable in this browser. Please try Chrome, Edge or Safari.')}
 },[])
 const toggle=useCallback(()=>{
  const media=mediaRef.current;if(!media)return
  if(!media.paused){media.pause();trackPlaying.current=false;setPlaying(false);if(graphRef.current)void graphRef.current.ctx.suspend().catch(()=>{});return}
  if(selected.current===null){selectTrack(0);return}
  try{ensureGraph();void media.play().then(()=>{if(!media.paused){trackPlaying.current=true;setPlaying(true)}}).catch(()=>setError('Tap Play again to enable sound.'))}catch{setError('Audio is unavailable in this browser.')}
 },[selectTrack])
 const seek=useCallback((v:number)=>{
  const i=selected.current,media=mediaRef.current;if(i===null||!media)return
  const track=DEMO_TRACKS[i],position=track.from+LIMIT(v,0,Math.max(0,track.duration-.12))
  if(media.readyState>=1)media.currentTime=position;else pendingStart.current=position
  setProgress(LIMIT(v,0,track.duration))
 },[])
 useEffect(()=>{
  const media=mediaRef.current;if(!media)return
  const metadata=()=>{if(pendingStart.current!==null){try{media.currentTime=pendingStart.current;pendingStart.current=null}catch{}}}
  const onPlay=()=>{trackPlaying.current=true;setPlaying(true)}
  const onPause=()=>{trackPlaying.current=false;setPlaying(false)}
  const onError=()=>setError('This audio could not load. Please check the network connection.')
  const onTimeUpdate=()=>{
   const idx=selected.current;if(idx===null||media.paused)return
   const track=DEMO_TRACKS[idx]
   const pos=media.currentTime-track.from
   if(pos>=track.duration-.09){try{media.currentTime=track.from}catch{}}
  }
  const onEnded=()=>{
   const idx=selected.current
   if(idx===null)return
   media.currentTime=DEMO_TRACKS[idx].from
   void media.play().catch(()=>setError('Tap Play again to continue this song.'))
  }
  media.addEventListener('ended',onEnded)
  media.addEventListener('timeupdate',onTimeUpdate)
  media.addEventListener('loadedmetadata',metadata);media.addEventListener('play',onPlay);media.addEventListener('pause',onPause);media.addEventListener('error',onError)
  return()=>{media.removeEventListener('ended',onEnded);media.removeEventListener('timeupdate',onTimeUpdate);media.removeEventListener('loadedmetadata',metadata);media.removeEventListener('play',onPlay);media.removeEventListener('pause',onPause);media.removeEventListener('error',onError)}
 },[])
 useEffect(()=>{const graph=graphRef.current,media=mediaRef.current;if(graph&&media)setAudioParams(graph,media,params,compare,volume)},[params,compare,volume,trackIndex])
 useEffect(()=>{
  if(!isEditorPath(pathname))return
  mediaRef.current?.pause();setPlaying(false);trackPlaying.current=false
  if(graphRef.current)void graphRef.current.ctx.suspend().catch(()=>{})
 },[pathname])
 useEffect(()=>{
  if(!isPlaying)return
  let frame=0
  const draw=(now:number)=>{
   const g=graphRef.current,media=mediaRef.current,idx=selected.current
   if(media&&idx!==null&&!media.paused){
    const tr=DEMO_TRACKS[idx],pos=media.currentTime-tr.from
    // Stay inside the selected user's excerpt; do not fall through into the next song.
    if(pos>=tr.duration-.08){try{media.currentTime=tr.from}catch{}}
    if(now-lastFrame.current>225){lastFrame.current=now;setProgress(LIMIT(pos,0,tr.duration))}
   }
   if(g&&media&&!media.paused){
    if(params.motionMode!=='off'&&now-lastMotion.current>42){lastMotion.current=now;const depth=LIMIT(params.motionDepth,0,1),freq=LIMIT(params.motionHz,.03,.8)
      const m=Math.sin(g.ctx.currentTime*Math.PI*2*freq)*depth*(params.motionMode==='16d'?.98:.82)
      g.pan.pan.setTargetAtTime(LIMIT(params.pan+m,-1,1),g.ctx.currentTime,.03)
    }
    if(now-lastMeterFrame.current>46){
      lastMeterFrame.current=now
      const arr=new Uint8Array(g.analyser.frequencyBinCount);g.analyser.getByteFrequencyData(arr)
      const bass=(arr[1]+arr[2]+arr[3]+arr[4])/4/255
      document.documentElement.style.setProperty('--audixo-audio-pulse',bass.toFixed(3))
      document.documentElement.style.setProperty('--audixo-disc-scale',(1+bass*.065).toFixed(3))
      const meter=meterDom.current
      if(meter&&!document.hidden){const children=meter.children;for(let i=0;i<children.length;i++){
       const bin=arr[Math.min(arr.length-1,Math.floor(i*2.2))]
       ;(children[i] as HTMLElement).style.transform=`scaleY(${(.18+bin/230).toFixed(2)})`
      }}
    }
   }
   frame=requestAnimationFrame(draw)
  }
  frame=requestAnimationFrame(draw)
  return()=>{cancelAnimationFrame(frame);document.documentElement.style.removeProperty('--audixo-audio-pulse');document.documentElement.style.removeProperty('--audixo-disc-scale')}
 },[isPlaying,params.motionMode,params.motionDepth,params.motionHz,params.pan])
 useEffect(()=>{
  const onSuccess=()=>{if(cueEnabled&&!trackPlaying.current)playChime()}
  window.addEventListener('audixo:export-success',onSuccess)
  return()=>window.removeEventListener('audixo:export-success',onSuccess)
 },[cueEnabled])
 useEffect(()=>()=>{mediaRef.current?.pause();if(contextRef.current)void contextRef.current.close().catch(()=>{})},[])
 const state=useMemo<SoundContextValue>(()=>({trackIndex,isPlaying,activeTab,setActiveTab,params,change,compare,setCompare,volume,setVolume,progress,seek,presetId,applyPreset,selectTrack,toggle,error,meterRef:(el)=>{meterDom.current=el},cueEnabled,setCueEnabled}),[trackIndex,isPlaying,activeTab,params,change,compare,volume,progress,seek,presetId,applyPreset,selectTrack,toggle,error,cueEnabled])
 return <SoundContext.Provider value={state}><audio ref={mediaRef} src={REEL} preload="metadata" playsInline style={{display:'none'}}/>{children}</SoundContext.Provider>
}
function playChime(){try{const a=new AudioContext(),t=a.currentTime;[740,950].forEach((freq,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.0001,t+i*.095);g.gain.exponentialRampToValueAtTime(.028,t+i*.095+.012);g.gain.exponentialRampToValueAtTime(.0001,t+i*.095+.21);o.connect(g);g.connect(a.destination);o.start(t+i*.095);o.stop(t+i*.095+.24)});window.setTimeout(()=>void a.close().catch(()=>{}),700)}catch{}}

// Resolve only explicit YouTube links. Never search by title at runtime: remixes
// and different uploads can share a name but use completely different cover art.
export function youtubeVideoId(source:string):string|null{
 try{
  const url=new URL(source.trim())
  if(url.protocol!=='https:'&&url.protocol!=='http:')return null
  if(url.username||url.password)return null
  const host=url.hostname.toLowerCase()
  const parts=url.pathname.split('/').filter(Boolean)
  let id:string|null=null
  if(host==='youtu.be')id=parts[0]||null
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(host)){
   if(url.pathname==='/watch')id=url.searchParams.get('v')
   else if(['shorts','embed','live'].includes(parts[0]))id=parts[1]||null
  }
  return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null
 }catch{return null}
}

function TrackArt({index}:{index:number}){
 const track=DEMO_TRACKS[index]
 const cell=track?.coverIndex??0
 // Locally bundled, user-supplied original cover art. No external lookup/hotlink.
 return <span className="ax49-track-art ax51-supplied-cover"
  data-cover-source="user-supplied" data-cover-id={track?.id}
  style={{'--cover-x':`${(cell%5)*25}%`,'--cover-y':`${Math.floor(cell/5)*50}%`} as CSSProperties}
  aria-hidden="true"/>
}

function MusicStrip(){
 const {trackIndex,isPlaying,selectTrack}=useSound()
 const stripRef=useRef<HTMLDivElement|null>(null)
 useEffect(()=>{
  const node=stripRef.current
  if(!node||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  let frame=0,last=0,position=0,cycle=0
  const measure=()=>{
   const primary=node.querySelector<HTMLElement>('[data-strip-lane="primary"]')
   const clone=node.querySelector<HTMLElement>('[data-strip-lane="clone"]')
   if(primary&&clone)cycle=clone.offsetLeft-primary.offsetLeft
  }
  measure()
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null
  observer?.observe(node)
  const step=(now:number)=>{
   const delta=last?Math.min((now-last)/1000,.05):0;last=now
   // Accumulate sub-pixel movement instead of losing it to scrollLeft rounding.
   // Do not move a focused control out from under keyboard users.
   if(cycle>0&&!document.hidden&&!node.contains(document.activeElement)){
    position=(position+delta*(window.innerWidth<820?22:30))%cycle
    node.scrollLeft=position
   }else position=node.scrollLeft
   frame=window.requestAnimationFrame(step)
  }
  const manual=()=>{position=node.scrollLeft}
  node.addEventListener('touchend',manual,{passive:true})
  node.addEventListener('wheel',manual,{passive:true})
  frame=window.requestAnimationFrame(step)
  return()=>{window.cancelAnimationFrame(frame);observer?.disconnect();node.removeEventListener('touchend',manual);node.removeEventListener('wheel',manual)}
 },[])
 const renderLane=(copy:'primary'|'clone')=><div className="ax49-track-lane" data-strip-lane={copy} aria-hidden={copy==='clone'||undefined}>
  {DEMO_TRACKS.map((track,i)=><button key={`${copy}-${track.id}`} data-demo-track-id={track.id} data-demo-copy={copy}
   className={`ax49-track-item ${trackIndex===i?'active':''}`} type="button" aria-pressed={trackIndex===i}
   aria-label={`Play ${track.title}`} tabIndex={copy==='clone'?-1:0}
   onClick={event=>{selectTrack(i);if(event.detail>0)event.currentTarget.blur()}}>
   <TrackArt index={i}/><span className="ax49-track-label"><strong>{track.title}</strong><small>{track.by}</small></span>
   <i className="ax49-track-pulse" aria-hidden="true">{trackIndex===i&&isPlaying?'♫':'↗'}</i>
  </button>)}
 </div>
 return <div className="ax49-strip-section"><div className="ax49-strip-head"><span><i/> YOUR SOUND SELECTION</span><small>{DEMO_TRACKS.length} TRACKS · TAP TO PREVIEW</small></div>
  <div ref={stripRef} className="ax49-track-marquee" role="group" aria-label="Choose a track to preview">{renderLane('primary')}{renderLane('clone')}</div>
 </div>
}

function LiveRange({name,value,min,max,step=1,unit='',onChange}:{name:string;value:number;min:number;max:number;step?:number;unit?:string;onChange:(v:number)=>void}){
 return <label className="ax49-range"><span><strong>{name}</strong><output>{step<1?value.toFixed(2):value}{unit}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>
}
function LivePanel(){
 const {activeTab,setActiveTab,params,change,compare,setCompare,presetId,applyPreset,trackIndex}=useSound()
 const chosen=useMemo(()=>soundPresets.find(p=>p.id===presetId),[presetId])
 const [filter,setFilter]=useState('')
 const visible=useMemo(()=>soundPresets.filter(p=>`${p.name} ${p.group}`.toLowerCase().includes(filter.toLowerCase())),[filter])
 return <div className="ax49-panel">
  <div className="ax49-panel-title"><span>LIVE FX / NON-STOP EDITING</span><strong>Shape every second.</strong><small>Every slider updates the playing track instantly.</small></div>
  <div className="ax49-tabs" role="tablist" aria-label="Live sound controls">{FX_TABS.map((tab,i)=><button key={tab} role="tab" type="button" aria-selected={activeTab===tab} className={activeTab===tab?'active':''} onClick={()=>setActiveTab(tab)}><span aria-hidden="true">{['◫','♫','◌','↝','◎','✦'][i]}</span>{tab}</button>)}</div>
  <div className="ax49-tab-body" role="tabpanel">
  {activeTab==='Clip'&&<><p>Control the song's speed and level while it plays.</p><LiveRange name="Speed" value={params.speed} min={.65} max={1.4} step={.05} unit="×" onChange={speed=>change({speed})}/><LiveRange name="Gain" value={params.gainDb} min={-9} max={8} unit=" dB" onChange={gainDb=>change({gainDb})}/><div className="ax49-toggle-row"><span><strong>Keep pitch on speed changes</strong><small>Works on supported browsers</small></span><button type="button" role="switch" aria-checked={params.preservePitch} onClick={()=>change({preservePitch:!params.preservePitch})} className={params.preservePitch?'on':''}><i/></button></div></>}
  {activeTab==='Tone'&&<><p>Fine-tune the lows, mids and highs without interrupting playback.</p><LiveRange name="Bass" value={params.bassDb} min={-12} max={12} unit=" dB" onChange={bassDb=>change({bassDb})}/><LiveRange name="Mid" value={params.midDb} min={-12} max={12} unit=" dB" onChange={midDb=>change({midDb})}/><LiveRange name="Treble" value={params.trebleDb} min={-12} max={12} unit=" dB" onChange={trebleDb=>change({trebleDb})}/><LiveRange name="Tape pitch" value={params.tapePitchSemitones} min={-6} max={6} unit=" st" onChange={tapePitchSemitones=>change({tapePitchSemitones,preservePitch:false})}/></>}
  {activeTab==='Space'&&<><p>Add depth and room reflections; the dry audio remains available.</p><LiveRange name="Reverb" value={Math.round(params.reverb*100)} min={0} max={65} unit="%" onChange={v=>change({reverb:v/100})}/><LiveRange name="Stereo balance" value={Math.round(params.pan*100)} min={-100} max={100} unit="%" onChange={v=>change({pan:v/100})}/></>}
  {activeTab==='Echo'&&<><p>Control the repeat time, intensity and decay live.</p><LiveRange name="Delay time" value={params.delayMs} min={40} max={750} step={10} unit=" ms" onChange={delayMs=>change({delayMs})}/><LiveRange name="Echo mix" value={Math.round(params.delayWet*100)} min={0} max={55} unit="%" onChange={v=>change({delayWet:v/100})}/><LiveRange name="Feedback" value={Math.round(params.feedback*100)} min={0} max={65} unit="%" onChange={v=>change({feedback:v/100})}/></>}
  {activeTab==='Motion'&&<><p>Animate the stereo field for headphones. Try 8D or 16D.</p><div className="ax49-motion-options" role="group" aria-label="Spatial audio mode">{(['off','8d','16d'] as const).map(mode=><button type="button" key={mode} aria-pressed={params.motionMode===mode} onClick={()=>change({motionMode:mode})} className={params.motionMode===mode?'active':''}>{mode==='off'?'Off':mode.toUpperCase()}</button>)}</div><LiveRange name="Orbit depth" value={Math.round(params.motionDepth*100)} min={0} max={100} unit="%" onChange={v=>change({motionDepth:v/100})}/><LiveRange name="Orbit speed" value={params.motionHz} min={.06} max={.6} step={.02} unit=" Hz" onChange={motionHz=>change({motionHz})}/></>}
  {activeTab==='Style'&&<><div className="ax49-preset-bar"><span><strong>30 studio presets</strong><small>{chosen?`Now using: ${chosen.name}`:'Tap a preset to apply it live'}</small></span><input aria-label="Search audio presets" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Find preset..." type="search"/></div><div className="ax49-preset-list">{visible.map(p=><button type="button" key={p.id} className={presetId===p.id?'active':''} aria-pressed={presetId===p.id} onClick={()=>applyPreset(p)}><span>{String(soundPresets.indexOf(p)+1).padStart(2,'0')}</span><span><strong>{p.name}</strong><small>{p.group} · {p.note}</small></span><b>{presetId===p.id?'✓':'↗'}</b></button>)}</div></>}
  </div>
  {activeTab!=='Style'&&<button type="button" className="ax49-see-presets" onClick={()=>setActiveTab('Style')}>Try all 30 Studio presets <span>↗</span></button>}
  {trackIndex!==null&&<div className="ax49-applied"><i/><span>{chosen?`Preset: ${chosen.name}`:'Custom live settings'}{chosen&&' · You can adjust any control without stopping the song.'}</span></div>}
 </div>
}

export function SoundPlayground(){
 const {trackIndex,isPlaying,toggle,volume,setVolume,progress,seek,compare,setCompare,error,meterRef}=useSound()
 const track=trackIndex!==null?DEMO_TRACKS[trackIndex]:null
 return <section className="ax49-sound-playground" aria-labelledby="audixo-playground-title">
  <header className="ax49-play-head"><div className="ax25-kicker"><i/> AUDIXO / LIVE SOUND LAB</div><h2 id="audixo-playground-title">Hear the beat.<br/><em>Shape it live.</em></h2><p>Choose a track and shape its sound while it plays.</p></header>
  <MusicStrip/>
  <div className="ax49-workspace">
   <div className="ax49-player-card">
    <div className="ax49-record-zone"><div className={`ax49-record ${isPlaying?'playing':''}`}><div className="ax49-record-ring"/><img src="/audixo-official-symbol.png" alt="AUDIXO audio disc"/></div><div className="ax49-live-meter" ref={meterRef} aria-hidden="true">{Array.from({length:38},(_,i)=><i key={i}/>)}</div></div>
    <div className="ax49-player-info"><span>NOW PLAYING <i/></span><strong>{track?.title??'Pick a song above'}</strong><small>{track?.by??`${DEMO_TRACKS.length} hand-picked clips`}</small></div>
    <div className="ax49-transport"><button type="button" className="ax49-main-play" onClick={toggle} aria-label={isPlaying?'Pause music':'Play music'}>{isPlaying?'Ⅱ':'▶'}</button><div className="ax49-progress"><input type="range" aria-label="Seek within the selected audio clip" min={0} max={Math.max(1,track?.duration??1)} value={Math.min(progress,track?.duration??1)} step={.1} onChange={e=>seek(+e.target.value)} disabled={!track}/><span>{formatTime(progress)} <b>/</b> {formatTime(track?.duration??0)}</span></div></div>
    <LiveRange name="Volume" value={volume} min={0} max={100} unit="%" onChange={setVolume}/>
    <div className="ax49-player-hint">Click any song above—even the same one—to replay its clean, unfiltered original.</div>
   </div>
   <LivePanel/>
  </div>
  <div className="ax49-compare"><span><strong>Original ↔ Processed</strong><small>Compare your edits with the source in real time</small></span><input type="range" min="0" max="100" value={compare} onChange={e=>setCompare(Number(e.target.value))} aria-label="Original to processed sound blend"/><output>{compare===0?'Original':compare===100?'Full effect':`${compare}% processed`}</output></div>
  {error&&<p className="ax49-warning" role="status">{error}</p>}
  <footer className="ax49-lab-foot"><span>Audio stays playing across information pages · Studio tools pause the demo</span><Link to="/editor">Open full Studio ↗</Link></footer>
 </section>
}

export function SoundModeControl(){
 const {pathname}=useLocation()
 const {trackIndex,isPlaying,toggle,progress,volume,setVolume,cueEnabled,setCueEnabled}=useSound()
 const isEditor=isEditorPath(pathname),track=trackIndex!==null?DEMO_TRACKS[trackIndex]:null
 return <>
  {!isEditor&&track&&<div className="ax49-floating-player" role="group" aria-label="Persistent Audixo music player"><button className="ax49-floating-cover" type="button" aria-label="Play or pause music" onClick={toggle}><TrackArt index={trackIndex!}/></button><span><strong>{track.title}</strong><small>{isPlaying?'Playing across AUDIXO':'Paused'} · {formatTime(progress)}</small></span><button type="button" className="ax49-floating-toggle" onClick={toggle} aria-label={isPlaying?'Pause music':'Play music'}>{isPlaying?'Ⅱ':'▶'}</button><label className="ax49-floating-volume">Volume <input type="range" min="0" max="100" value={volume} onChange={e=>setVolume(+e.target.value)} aria-label="Music volume"/></label></div>}
  {!isEditor&&<button type="button" className={`ax49-cues-toggle ${cueEnabled?'active':''}`} aria-pressed={cueEnabled} onClick={()=>setCueEnabled(!cueEnabled)} title="Optional AUDIXO success chimes">{cueEnabled?'♫':'♪'} <span>UI cues {cueEnabled?'On':'Off'}</span></button>}
 </>
}
