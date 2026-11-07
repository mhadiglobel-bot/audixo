import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {Link,useLocation} from 'react-router-dom'
import {defaultClipFx,soundPresets} from '../editor/project'
import type {ClipFx,SoundPreset} from '../editor/types'


// One persistent media element and one Web Audio graph. Effects change node
// parameters in place; React route changes never re-create the music player.
// Legacy demo cuts still live inside one seekable reel, while newer user-supplied
// phonk tracks use their own local files and dedicated cover art.
const REEL='/demo/audixo-sample-reel.mp3?v=51'
const PHONK_REEL='/demo/audixo-phonk-v61-reel.mp3'
const COVER_SPRITE='/demo/audixo-cover-sprite.webp?v=51'
export type DemoTrack={id:string;title:string;by:string;src:string;from:number;duration:number;coverIndex?:number;coverSrc?:string;tag:string}
const reelTrack=(id:string,title:string,by:string,from:number,duration:number,coverIndex:number,tag='USER CLIP'):DemoTrack=>({id,title,by,src:REEL,from,duration,coverIndex,tag})
export const DEMO_TRACKS:DemoTrack[]=[
 {id:'montagem-aghanim',title:'Montagem Aghanim',by:'Phonk Drop',src:PHONK_REEL,from:0.000000,duration:48.587755,coverSrc:'/demo/phonk-covers/montagem-aghanim.webp',tag:'NEW DROP'},
 {id:'montagem-elder',title:'Montagem Elder',by:'Phonk Drop',src:PHONK_REEL,from:48.767755,duration:69.955918,coverSrc:'/demo/phonk-covers/montagem-elder.webp',tag:'NEW DROP'},
 {id:'comeback-2',title:'Comeback 2',by:'Dark Phonk',src:PHONK_REEL,from:118.903673,duration:66.063673,coverSrc:'/demo/phonk-covers/comeback-2.webp',tag:'NEW DROP'},
 {id:'montagem-aghanim-slowed',title:'Montagem Aghanim Slowed',by:'LXNGVX',src:PHONK_REEL,from:185.147346,duration:67.500408,coverSrc:'/demo/phonk-covers/montagem-aghanim-slowed.webp',tag:'SLOWED'},
 {id:'montagem-tiktak',title:'Montagem Tiktak',by:'Phonk Drop',src:PHONK_REEL,from:252.827754,duration:96.026122,coverSrc:'/demo/phonk-covers/montagem-tiktak.webp',tag:'NEW DROP'},
 {id:'hero',title:'HERO!',by:'Night Drive',src:PHONK_REEL,from:349.033876,duration:56.111020,coverSrc:'/demo/phonk-covers/hero.webp',tag:'NEW DROP'},
 reelTrack('teu-perfume','Teu Perfume','Orch Mix',0,79.36106576,0),
 reelTrack('te-conoci','Te Conocí','bxkq x PXLWYSE - Remix',79.51106576,29.83290249,1),
 reelTrack('aura-farming','Aura Farming','Mustafa Saboori',109.49396825,34.73979592,2),
 reelTrack('montagem-ahora','Montagem Ahora','NUEKI x QMIIR',144.38376417,31.79698413,3),
 reelTrack('montagem-illuminal','Montagem Illuminal','Funk / Phonk',176.3307483,37.24099773,4),
 reelTrack('montagem-royal','Montagem Royal','Slowed',213.72174603,48.3929932,5),
 reelTrack('baila-lento','Baila Lento','Funk / Phonk',262.26473923,29.6129932,6),
 reelTrack('tiki-tiki','Tiki Tiki','Funk / Phonk',292.02773243,87.08501134,7),
 reelTrack('funk-sigilo','Funk Sigilo','Funk / Phonk',379.26274376,23.15800454,8),
 reelTrack('funk-power','Funk Power','Funk / Phonk',402.5707483,35.19501134,9),
 reelTrack('veki-veki','VEKI VEKI','DJZRX',437.91575964,42.9921542,10),
 reelTrack('siento-conmigo','SIENTO CONMIGO','Slowed TikTok',481.05791383,48.26356009,11),
 reelTrack('montagem-alquimia','MONTAGEM ALQUIMIA','Funk / Phonk',529.47147392,66.5476644,12),
]

type FxTab='Clip'|'Tone'|'Polish'|'Space'|'Echo'|'Motion'|'Style'
const FX_TABS:FxTab[]=['Clip','Tone','Polish','Space','Echo','Motion','Style']
const NEUTRAL:ClipFx={...defaultClipFx}
const LIMIT=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
const decibels=(db:number)=>Math.pow(10,db/20)
const formatTime=(v:number)=>`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`
const isEditorPath=(path:string)=>path==='/editor'||path==='/library'||path.startsWith('/tools/')||path.startsWith('/tool/')

type SoundGraph={
 ctx:AudioContext; source:MediaElementAudioSourceNode;
 dry:GainNode; wet:GainNode; inGain:GainNode;
 bass:BiquadFilterNode;mid:BiquadFilterNode;treble:BiquadFilterNode;
 rumble:BiquadFilterNode;warmBass:BiquadFilterNode;warmAir:BiquadFilterNode;metal:BiquadFilterNode;hiss:BiquadFilterNode;notch:BiquadFilterNode;lofi:BiquadFilterNode;soften:DynamicsCompressorNode;
 pan:StereoPannerNode; delay:DelayNode;feedback:GainNode;delayReturn:GainNode;
 phrasePreDelay:DelayNode;phraseGate:GainNode;phraseAnalyser:AnalyserNode;phraseTaps:{delay:DelayNode;send:GainNode}[];
 reverb:ConvolverNode;roomTone:BiquadFilterNode;reverbReturn:GainNode;mix:GainNode;
 analyser:AnalyserNode;compressor:DynamicsCompressorNode;master:GainNode;
}

function makeImpulse(ctx:AudioContext,seconds=1.2){
 const len=Math.max(256,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(2,len,ctx.sampleRate)
 // Diffuse/damped room tail. No tuned ringing, metallic plate impulse or synthetic percussion.
 let seed=8719
 for(let ch=0;ch<2;ch++){
  const a=b.getChannelData(ch);let damped=0
  for(let i=0;i<len;i++){
   seed=(Math.imul(seed,1664525)+1013904223)|0
   const white=seed/2147483648
   damped=damped*.78+white*.22
   const env=Math.pow(1-i/len,2.55)
   a[i]=(white*.35+damped*.65)*env*.5
  }
 }
 return b
}
function createGraph(media:HTMLAudioElement):SoundGraph{
 const ctx=new window.AudioContext()
 const source=ctx.createMediaElementSource(media)
 const dry=ctx.createGain(),wet=ctx.createGain(),inGain=ctx.createGain()
 const bass=ctx.createBiquadFilter(),mid=ctx.createBiquadFilter(),treble=ctx.createBiquadFilter()
 const rumble=ctx.createBiquadFilter(),warmBass=ctx.createBiquadFilter(),warmAir=ctx.createBiquadFilter()
 const metal=ctx.createBiquadFilter(),hiss=ctx.createBiquadFilter(),notch=ctx.createBiquadFilter(),lofi=ctx.createBiquadFilter(),soften=ctx.createDynamicsCompressor()
 rumble.type='highpass';rumble.frequency.value=18;rumble.Q.value=.71
 warmBass.type='lowshelf';warmBass.frequency.value=240
 warmAir.type='highshelf';warmAir.frequency.value=5500
 metal.type='peaking';metal.frequency.value=3350;metal.Q.value=1.35
 hiss.type='highshelf';hiss.frequency.value=7300
 notch.type='peaking';notch.frequency.value=4200;notch.Q.value=3.2
 lofi.type='lowpass';lofi.frequency.value=18000;lofi.Q.value=.65
 soften.threshold.value=0;soften.ratio.value=1;soften.attack.value=.0015;soften.release.value=.105;soften.knee.value=8
 const pan=ctx.createStereoPanner(),delay=ctx.createDelay(1.5),feedback=ctx.createGain(),delayReturn=ctx.createGain()
 const phrasePreDelay=ctx.createDelay(2),phraseGate=ctx.createGain(),phraseAnalyser=ctx.createAnalyser(),phraseSilent=ctx.createGain()
 phraseAnalyser.fftSize=512;phraseAnalyser.smoothingTimeConstant=.12;phraseSilent.gain.value=0
 const phraseTaps=Array.from({length:5},()=>({delay:ctx.createDelay(7),send:ctx.createGain()}))
 const reverb=ctx.createConvolver(),roomTone=ctx.createBiquadFilter(),reverbReturn=ctx.createGain(),mix=ctx.createGain(),analyser=ctx.createAnalyser(),compressor=ctx.createDynamicsCompressor(),master=ctx.createGain()
 bass.type='lowshelf';bass.frequency.value=170
 mid.type='peaking';mid.frequency.value=1050;mid.Q.value=.8
 treble.type='highshelf';treble.frequency.value=4000
 roomTone.type='lowpass';roomTone.frequency.value=6000;roomTone.Q.value=.7
 reverb.buffer=makeImpulse(ctx,1.2)
 source.connect(dry);dry.connect(mix)
 source.connect(inGain);inGain.connect(rumble);rumble.connect(bass);bass.connect(mid);mid.connect(treble);treble.connect(warmBass);warmBass.connect(warmAir);warmAir.connect(metal);metal.connect(hiss);hiss.connect(notch);notch.connect(lofi);lofi.connect(soften);soften.connect(pan);pan.connect(wet);wet.connect(mix)
 pan.connect(phraseAnalyser);phraseAnalyser.connect(phraseSilent);phraseSilent.connect(mix)
 pan.connect(phrasePreDelay);phrasePreDelay.connect(phraseGate)
 phraseGate.connect(delay);delay.connect(delayReturn);delayReturn.connect(wet);delay.connect(feedback);feedback.connect(delay)
 for(const tap of phraseTaps){phraseGate.connect(tap.delay);tap.delay.connect(tap.send);tap.send.connect(wet);tap.send.gain.value=0}
 pan.connect(reverb);reverb.connect(roomTone);roomTone.connect(reverbReturn);reverbReturn.connect(wet)
 mix.connect(compressor);compressor.connect(analyser);analyser.connect(master);master.connect(ctx.destination)
 compressor.threshold.value=-4;compressor.ratio.value=2.8;compressor.knee.value=8
 analyser.fftSize=256;analyser.smoothingTimeConstant=.79
 return {ctx,source,dry,wet,inGain,bass,mid,treble,rumble,warmBass,warmAir,metal,hiss,notch,lofi,soften,pan,delay,feedback,delayReturn,phrasePreDelay,phraseGate,phraseAnalyser,phraseTaps,reverb,roomTone,reverbReturn,mix,analyser,compressor,master}
}
function setAudioParams(graph:SoundGraph,media:HTMLAudioElement,p:ClipFx,compare:number,volume:number,nowMotion=0){
 const t=graph.ctx.currentTime,s=.025
 const set=(node:AudioParam,value:number)=>node.setTargetAtTime(value,t,s)
 const mix=LIMIT(compare/100,0,1)*LIMIT(p.fxBlend??1,0,1)
 // Equal-power compare, avoiding a volume hole at 50%.
 set(graph.dry.gain,1-mix)
 set(graph.wet.gain,mix)
 set(graph.inGain.gain,decibels(LIMIT(p.gainDb,-12,9)))
 set(graph.bass.gain,LIMIT(p.bassDb,-12,12));set(graph.mid.gain,LIMIT(p.midDb,-12,12));set(graph.treble.gain,LIMIT(p.trebleDb,-12,12))
 set(graph.rumble.frequency,p.rumbleCut?78:18)
 const warmth=LIMIT(p.warmth??0,0,1),harshness=LIMIT(p.harshness??0,0,1),metallic=LIMIT(p.metallicCut??0,0,1),lofi=LIMIT(p.lofiAmount??0,0,1),softness=LIMIT(p.transientSoftness??0,0,1)
 set(graph.warmBass.gain,warmth*3.4);set(graph.warmAir.gain,-warmth*2.6)
 set(graph.metal.gain,-harshness*8);set(graph.hiss.gain,-harshness*5.5)
 set(graph.notch.frequency,LIMIT(p.metallicFrequency??4200,1800,9000));set(graph.notch.gain,-metallic*15)
 set(graph.lofi.frequency,18000*Math.pow(.12,lofi))
 set(graph.soften.threshold,softness>0?-8-22*softness:0);set(graph.soften.ratio,1+7*softness)

 set(graph.pan.pan,LIMIT(p.pan+nowMotion,-1,1))
 const phraseMode=p.echoBehavior==='phrase'
 const tapGap=LIMIT(p.delayMs/1000,.06,1.35)
 set(graph.phrasePreDelay.delayTime,phraseMode?LIMIT(p.phrasePauseMs/1000+.31,.51,1.65):0)
 set(graph.delay.delayTime,tapGap)
 set(graph.feedback.gain,phraseMode?0:LIMIT(p.feedback,0,.8))
 set(graph.delayReturn.gain,phraseMode?0:LIMIT(p.delayWet,0,1))
 if(!phraseMode)set(graph.phraseGate.gain,1)
 else set(graph.phraseGate.gain,0)
 graph.phraseTaps.forEach((tap,i)=>{
  set(tap.delay.delayTime,Math.min(6.9,tapGap*(i+1)))
  const repetitions=Math.round(LIMIT(p.echoRepeats,1,5))
  set(tap.send.gain,phraseMode&&i<repetitions?LIMIT(p.delayWet,0,1)*Math.pow(LIMIT(p.feedback,.12,.8),i):0)
 })
 set(graph.reverbReturn.gain,Math.sin(LIMIT(p.reverb,0,1)*Math.PI/2))
 set(graph.roomTone.frequency,1000+LIMIT(p.reverbTone,0,1)*11000)
 const desiredRoom=.38+2.2*LIMIT(p.reverbSize,0,1)
 if(Math.abs((graph.reverb.buffer?.duration||0)-desiredRoom)>.025)graph.reverb.buffer=makeImpulse(graph.ctx,desiredRoom)
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
 // Detect genuine 250ms+ quiet sections instead of echoing every sung syllable.
 // This is audio-energy detection, not a lyrics transcription algorithm.
 const phraseState=useRef({wasLoud:false,lastLoud:0,speechStart:0,triggered:false,lastRead:0})
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
  phraseState.current={wasLoud:false,lastLoud:0,speechStart:0,triggered:false,lastRead:0}
  setParams({...NEUTRAL,...preset.patch})
  setCompare(100)
  setError(preset.patch.reverse?'Reverse playback requires the full Studio. Other preset settings are previewed live.':'')
 },[])
 const selectTrack=useCallback((i:number)=>{
  if(i<0||i>=DEMO_TRACKS.length||!mediaRef.current)return
  phraseState.current={wasLoud:false,lastLoud:0,speechStart:0,triggered:false,lastRead:0}
  setTrack(i);setParams({...NEUTRAL});setPresetId('');setCompare(100);setActiveTab('Clip');setError('')
  window.dispatchEvent(new Event('audixo:track-selected'))
  const media=mediaRef.current,track=DEMO_TRACKS[i],currentSource=media.dataset.demoSrc||REEL
  pendingStart.current=track.from
  try{
   if(currentSource!==track.src){
    media.dataset.demoSrc=track.src
    media.src=track.src
    media.load()
   }
   ensureGraph()
   if(media.readyState>=1&&currentSource===track.src){media.currentTime=track.from;pendingStart.current=null}
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
  phraseState.current={wasLoud:false,lastLoud:0,speechStart:0,triggered:false,lastRead:0}
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
    if(params.echoBehavior==='phrase'&&now-phraseState.current.lastRead>=64){
      const state=phraseState.current
      state.lastRead=now
      const samples=new Float32Array(g.phraseAnalyser.fftSize)
      g.phraseAnalyser.getFloatTimeDomainData(samples)
      let energy=0
      for(let i=0;i<samples.length;i++)energy+=samples[i]*samples[i]
      const rms=Math.sqrt(energy/samples.length)
      const moment=g.ctx.currentTime
      const audible=rms>.018
      if(audible){
       if(!state.wasLoud){state.speechStart=moment;state.triggered=false}
       state.wasLoud=true;state.lastLoud=moment
      }else if(state.wasLoud&&!state.triggered&&moment-state.lastLoud>=LIMIT(params.phrasePauseMs/1000,.25,1.25)&&state.lastLoud-state.speechStart>=.18){
       const gate=g.phraseGate.gain
       gate.cancelScheduledValues(moment)
       gate.setValueAtTime(0,moment)
       gate.linearRampToValueAtTime(1,moment+.015)
       gate.setValueAtTime(1,moment+.22)
       gate.linearRampToValueAtTime(0,moment+.29)
       state.triggered=true;state.wasLoud=false
      }
    }
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
 },[isPlaying,params.motionMode,params.motionDepth,params.motionHz,params.pan,params.echoBehavior,params.phrasePauseMs])
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
 if(track?.coverSrc)return <span className="ax49-track-art ax61-track-art is-direct-cover" data-cover-source="user-supplied" data-cover-id={track?.id} aria-hidden="true"><img src={track.coverSrc} alt="" loading="lazy" decoding="async"/></span>
 return <span className="ax49-track-art ax51-supplied-cover"
  data-cover-source="user-supplied" data-cover-id={track?.id}
  style={{'--cover-x':`${(cell%5)*25}%`,'--cover-y':`${Math.floor(cell/5)*50}%`,'--cover-image':`url(${COVER_SPRITE})`} as CSSProperties}
  aria-hidden="true"/>
}

function MusicStrip(){
 const {trackIndex,isPlaying,selectTrack}=useSound()
 const viewport=useRef<HTMLDivElement|null>(null)
 const middleLane=useRef<HTMLDivElement|null>(null)
 const laneWidth=useRef(0)
 const hovered=useRef(false),dragging=useRef<{id:number;start:number;offset:number;moved:boolean}|null>(null)
 const suppressClickUntil=useRef(0)
 const [grabbing,setGrabbing]=useState(false),[visible,setVisible]=useState(false)
 const [ready,setReady]=useState(false)
 useEffect(()=>{
  const node=viewport.current,lane=middleLane.current
  if(!node||!lane)return
  const measure=()=>{
   const next=lane.getBoundingClientRect().width
   if(next>0){
    const old=laneWidth.current
    laneWidth.current=next
    if(!old)node.scrollLeft=next
    else if(Math.abs(old-next)>2)node.scrollLeft+=next-old
   }
  }
  measure()
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure)
  resize?.observe(lane)
  window.addEventListener('resize',measure)
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting)){setVisible(true);setReady(true)}
   else setVisible(false)
  },{threshold:.08})
  observer?.observe(node)
  if(!observer){setVisible(true);setReady(true)}
  return()=>{resize?.disconnect();observer?.disconnect();window.removeEventListener('resize',measure)}
 },[])
 useEffect(()=>{
  const el=viewport.current
  if(!el||!visible)return
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if(reduced)return
  let frame=0,last=0
  const tick=(time:number)=>{
   if(last&&!hovered.current&&!dragging.current&&document.visibilityState==='visible'){
    const w=laneWidth.current
    if(w>0){
     el.scrollLeft+=(Math.min(40,time-last)*34)/1000
     if(el.scrollLeft>=w*2)el.scrollLeft-=w
     if(el.scrollLeft<w)el.scrollLeft+=w
    }
   }
   last=time;frame=requestAnimationFrame(tick)
  }
  frame=requestAnimationFrame(tick)
  return()=>cancelAnimationFrame(frame)
 },[visible])
 const normalize=()=>{
  const el=viewport.current,w=laneWidth.current
  if(!el||!w)return
  if(el.scrollLeft>=2*w)el.scrollLeft-=w
  else if(el.scrollLeft<w)el.scrollLeft+=w
 }
 useEffect(()=>{
  const el=viewport.current
  if(!el)return
  // React delegates wheel as passive in some browsers; a native, non-passive
  // listener allows horizontal browsing with Shift/wheel or held mouse button.
  const wheel=(event:WheelEvent)=>{
   if(!(event.shiftKey||event.buttons===1||Math.abs(event.deltaX)>Math.abs(event.deltaY)))return
   event.preventDefault()
   el.scrollLeft+=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY
   const w=laneWidth.current
   if(w&&el.scrollLeft>=2*w)el.scrollLeft-=w
   else if(w&&el.scrollLeft<w)el.scrollLeft+=w
  }
  el.addEventListener('wheel',wheel,{passive:false})
  return()=>el.removeEventListener('wheel',wheel)
 },[])
 const lane=(which:'left'|'primary'|'right')=><div ref={which==='primary'?middleLane:undefined} className="ax67-songs-lane" data-strip-lane={which} aria-hidden={which!=='primary'||undefined}>
  {DEMO_TRACKS.map((track,i)=><button key={`${which}-${track.id}`} data-demo-track-id={track.id} data-demo-copy={which}
   className={`ax67-song-card ${trackIndex===i?'active':''}`} type="button" aria-pressed={trackIndex===i}
   aria-label={`Play ${track.title}`} tabIndex={which==='primary'?0:-1}
   style={{'--ax67-drop-delay':`${Math.min(i*.036,.52)}s`} as CSSProperties}
   onClick={()=>selectTrack(i)}>
   <TrackArt index={i}/><span className="ax67-song-label"><strong>{track.title}</strong><small>{track.by}</small></span>
   <i className="ax67-song-action" aria-hidden="true">{trackIndex===i&&isPlaying?'♫':'↗'}</i>
  </button>)}
 </div>
 return <div className="ax49-strip-section ax67-songs-section">
  <div className="ax49-strip-head"><span><i/> PHONK SOUND LAB</span><small>{DEMO_TRACKS.length} SONGS · HOVER TO PAUSE · GRAB TO BROWSE</small></div>
  <p className="ax67-song-help">Click to play a track. Hover to pause the moving deck, drag left or right, or hold the mouse button and use the wheel to browse.</p>
  <div ref={viewport} data-demo-bin="marquee" role="group" aria-label="Phonk song carousel"
   className={`ax67-songs-viewport ${grabbing?'is-grabbing':''} ${ready?'is-ready':''}`}
   onPointerEnter={()=>{hovered.current=true}}
   onPointerLeave={()=>{hovered.current=false}}
   onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;dragging.current={id:e.pointerId,start:e.clientX,offset:e.currentTarget.scrollLeft,moved:false}}}
   onPointerMove={e=>{const d=dragging.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.start;if(Math.abs(dx)>5||d.moved){
    d.moved=true;setGrabbing(true)
    if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.scrollLeft=d.offset-dx;normalize()
   }}}
   onPointerUp={e=>{const d=dragging.current;if(d?.moved)suppressClickUntil.current=performance.now()+300;dragging.current=null;setGrabbing(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}
   onPointerCancel={()=>{dragging.current=null;setGrabbing(false)}}
   onClickCapture={e=>{if(performance.now()<suppressClickUntil.current){e.preventDefault();e.stopPropagation()}}}
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.currentTarget.scrollLeft+=e.key==='ArrowRight'?210:-210;normalize()}}}
   tabIndex={0}>
    {lane('left')}{lane('primary')}{lane('right')}
  </div>
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
  <div className="ax49-tabs" role="tablist" aria-label="Live sound controls">{FX_TABS.map((tab,i)=><button key={tab} role="tab" type="button" aria-selected={activeTab===tab} className={activeTab===tab?'active':''} onClick={()=>setActiveTab(tab)}><span aria-hidden="true">{['◫','♫','✧','◌','↝','◎','✦'][i]}</span>{tab}</button>)}</div>
  <div className="ax49-tab-body" role="tabpanel">
  {activeTab==='Clip'&&<><p>Control the song's speed and level while it plays.</p><LiveRange name="Speed" value={params.speed} min={.65} max={1.4} step={.05} unit="×" onChange={speed=>change({speed})}/><LiveRange name="Gain" value={params.gainDb} min={-9} max={8} unit=" dB" onChange={gainDb=>change({gainDb})}/><div className="ax49-toggle-row"><span><strong>Keep pitch on speed changes</strong><small>Works on supported browsers</small></span><button type="button" role="switch" aria-checked={params.preservePitch} onClick={()=>change({preservePitch:!params.preservePitch})} className={params.preservePitch?'on':''}><i/></button></div></>}
  {activeTab==='Tone'&&<><p>Fine-tune lows, mids and highs with a natural/processed blend.</p><LiveRange name="Natural / studio mix" value={Math.round((params.fxBlend??1)*100)} min={0} max={100} unit="%" onChange={v=>change({fxBlend:v/100})}/><LiveRange name="Bass" value={params.bassDb} min={-12} max={12} unit=" dB" onChange={bassDb=>change({bassDb})}/><LiveRange name="Mid" value={params.midDb} min={-12} max={12} unit=" dB" onChange={midDb=>change({midDb})}/><LiveRange name="Treble" value={params.trebleDb} min={-12} max={12} unit=" dB" onChange={trebleDb=>change({trebleDb})}/><LiveRange name="Tape pitch" value={params.tapePitchSemitones} min={-6} max={6} unit=" st" onChange={tapePitchSemitones=>change({tapePitchSemitones,preservePitch:false})}/></>}
  {activeTab==='Polish'&&<><p>Clean lo-fi texture and ringing reduction, with no artificial hiss or added drum sounds. For actual drum removal, separate stems in Full Studio.</p><div className="ax60-polish-quick"><button type="button" onClick={()=>change({lofiAmount:.44,warmth:.42,harshness:.18,metallicCut:.2,transientSoftness:.18})}>Lo-fi Better</button><button type="button" onClick={()=>change({lofiAmount:.26,warmth:.54,harshness:.38,metallicCut:.62,metallicFrequency:3900,transientSoftness:.3})}>Echo Vibe Clean</button><button type="button" onClick={()=>change({lofiAmount:.18,warmth:.58,harshness:.45,metallicCut:.72,metallicFrequency:3400,transientSoftness:.4})}>Cave Smooth</button></div><LiveRange name="Lo-fi warmth" value={Math.round((params.lofiAmount??0)*100)} min={0} max={100} unit="%" onChange={v=>change({lofiAmount:v/100})}/><LiveRange name="Vocal warmth" value={Math.round((params.warmth??0)*100)} min={0} max={100} unit="%" onChange={v=>change({warmth:v/100})}/><LiveRange name="Metallic ring reduction" value={Math.round((params.metallicCut??0)*100)} min={0} max={100} unit="%" onChange={v=>change({metallicCut:v/100})}/><LiveRange name="Ring frequency" value={params.metallicFrequency??4200} min={1800} max={9000} step={100} unit=" Hz" onChange={metallicFrequency=>change({metallicFrequency})}/><LiveRange name="Percussion peak softening" value={Math.round((params.transientSoftness??0)*100)} min={0} max={100} unit="%" onChange={v=>change({transientSoftness:v/100})}/><LiveRange name="Harshness reduction" value={Math.round((params.harshness??0)*100)} min={0} max={100} unit="%" onChange={v=>change({harshness:v/100})}/></>}
  {activeTab==='Space'&&<><p>Add smooth, damped room depth without metallic plate ringing or syllable repeats.</p><LiveRange name="Reverb" value={Math.round(params.reverb*100)} min={0} max={100} unit="%" onChange={v=>change({reverb:v/100})}/><LiveRange name="Room size" value={Math.round(params.reverbSize*100)} min={0} max={100} unit="%" onChange={v=>change({reverbSize:v/100})}/><LiveRange name="Room brightness" value={Math.round(params.reverbTone*100)} min={0} max={100} unit="%" onChange={v=>change({reverbTone:v/100})}/><LiveRange name="Stereo balance" value={Math.round(params.pan*100)} min={-100} max={100} unit="%" onChange={v=>change({pan:v/100})}/></>}
  {activeTab==='Echo'&&<><p>Choose continuous echo or pause-triggered phrase tails. Smart mode detects quiet gaps, not exact written lyrics.</p><div className="ax49-motion-options" role="group" aria-label="Repeat timing"><button type="button" aria-pressed={params.echoBehavior==='continuous'} className={params.echoBehavior==='continuous'?'active':''} onClick={()=>change({echoBehavior:'continuous'})}>Continuous</button><button type="button" aria-pressed={params.echoBehavior==='phrase'} className={params.echoBehavior==='phrase'?'active':''} onClick={()=>change({echoBehavior:'phrase',delayMs:params.delayMs||355,delayWet:params.delayWet||.35})}>Smart pauses</button></div><LiveRange name="Delay time" value={params.delayMs} min={40} max={750} step={10} unit=" ms" onChange={delayMs=>change({delayMs})}/><LiveRange name="Echo mix" value={Math.round(params.delayWet*100)} min={0} max={100} unit="%" onChange={v=>change({delayWet:v/100})}/><LiveRange name="Feedback / tail decay" value={Math.round(params.feedback*100)} min={0} max={80} unit="%" onChange={v=>change({feedback:v/100})}/>{params.echoBehavior==='phrase'&&<><LiveRange name="Minimum pause" value={params.phrasePauseMs} min={250} max={1200} step={50} unit=" ms" onChange={phrasePauseMs=>change({phrasePauseMs})}/><LiveRange name="Repeat taps" value={params.echoRepeats} min={1} max={5} unit="" onChange={echoRepeats=>change({echoRepeats})}/><small className="ax60-phrase-notice">Smart repeats are triggered only when a sustained quiet gap follows an audible phrase. Dense percussion can reduce detection accuracy.</small></>}</>}
  {activeTab==='Motion'&&<><p>Animate the stereo field for headphones. Try 8D or 16D.</p><div className="ax49-motion-options" role="group" aria-label="Spatial audio mode">{(['off','8d','16d'] as const).map(mode=><button type="button" key={mode} aria-pressed={params.motionMode===mode} onClick={()=>change({motionMode:mode})} className={params.motionMode===mode?'active':''}>{mode==='off'?'Off':mode.toUpperCase()}</button>)}</div><LiveRange name="Orbit depth" value={Math.round(params.motionDepth*100)} min={0} max={100} unit="%" onChange={v=>change({motionDepth:v/100})}/><LiveRange name="Orbit speed" value={params.motionHz} min={.06} max={.6} step={.02} unit=" Hz" onChange={motionHz=>change({motionHz})}/></>}
  {activeTab==='Style'&&<><div className="ax49-preset-bar"><span><strong>{soundPresets.length} studio presets</strong><small>{chosen?`Now using: ${chosen.name}`:'Tap a preset to apply it live'}</small></span><input aria-label="Search audio presets" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Find preset..." type="search"/></div><div className="ax49-preset-list">{visible.map(p=><button type="button" key={p.id} className={presetId===p.id?'active':''} aria-pressed={presetId===p.id} onClick={()=>applyPreset(p)}><span>{String(soundPresets.indexOf(p)+1).padStart(2,'0')}</span><span><strong>{p.name}</strong><small>{p.group} · {p.note}</small></span><b>{presetId===p.id?'✓':'↗'}</b></button>)}</div></>}
  </div>
  {activeTab!=='Style'&&<button type="button" className="ax49-see-presets" onClick={()=>setActiveTab('Style')}>Try all {soundPresets.length} Studio presets <span>↗</span></button>}
  {trackIndex!==null&&<div className="ax49-applied"><i/><span>{chosen?`Preset: ${chosen.name}`:'Custom live settings'}{chosen&&' · You can adjust any control without stopping the song.'}</span></div>}
 </div>
}

export function SoundPlayground(){
 const {trackIndex,isPlaying,toggle,volume,setVolume,progress,seek,compare,setCompare,error,meterRef}=useSound()
 const track=trackIndex!==null?DEMO_TRACKS[trackIndex]:null
 return <section className="ax49-sound-playground" aria-labelledby="audixo-playground-title">
  <header className="ax49-play-head"><div className="ax25-kicker"><i/> AUDIXO / LIVE SOUND LAB</div><h2 id="audixo-playground-title">Hear the beat.<br/><em>Shape it live.</em></h2><p>Browse the glass sound crate, play a track, and fine-tune every effect live.</p></header>
  <MusicStrip/>
  <div className="ax49-workspace">
   <div className="ax49-player-card">
    <div className="ax49-record-zone"><div className={`ax49-record ${isPlaying?'playing':''}`}><div className="ax49-record-ring"/>{trackIndex!==null?<span className="ax91-record-cover" aria-label={track?.title||"Selected song artwork"}><TrackArt index={trackIndex}/></span>:<img src="/audixo-official-symbol.png" alt="AUDIXO audio disc"/>}</div><div className="ax49-live-meter" ref={meterRef} aria-hidden="true">{Array.from({length:38},(_,i)=><i key={i}/>)}</div></div>
    <div className="ax49-player-info"><span>NOW PLAYING <i/></span><strong>{track?.title??'Pick a song above'}</strong><small>{track?.by??`${DEMO_TRACKS.length} hand-picked clips`}</small></div>
    <div className="ax49-transport"><button type="button" className="ax49-main-play" onClick={toggle} aria-label={isPlaying?'Pause music':'Play music'}>{isPlaying?'Ⅱ':'▶'}</button><div className="ax49-progress"><input type="range" aria-label="Seek within the selected audio clip" min={0} max={Math.max(1,track?.duration??1)} value={Math.min(progress,track?.duration??1)} step={.1} onChange={e=>seek(+e.target.value)} disabled={!track}/><span>{formatTime(progress)} <b>/</b> {formatTime(track?.duration??0)}</span></div></div>
    <LiveRange name="Volume" value={volume} min={0} max={100} unit="%" onChange={setVolume}/>
    <div className="ax49-player-hint">Tap any card in the glass crate above—even the same one—to replay its clean, unfiltered original.</div>
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
 const [dismissed,setDismissed]=useState(false)
 useEffect(()=>{setDismissed(false)},[trackIndex])
 useEffect(()=>{const reopen=()=>setDismissed(false);window.addEventListener('audixo:track-selected',reopen);return()=>window.removeEventListener('audixo:track-selected',reopen)},[])
 const isEditor=isEditorPath(pathname),track=trackIndex!==null?DEMO_TRACKS[trackIndex]:null
 const closePlayer=()=>{if(isPlaying)toggle();setDismissed(true)}
 return <>
  {!isEditor&&track&&!dismissed&&<div className={`ax49-floating-player ax70-floating-dock ${isPlaying?'is-playing':'is-paused'}`} role="group" aria-label="Persistent AUDIXO music player">
    <button className="ax49-floating-cover ax70-floating-disc" type="button" aria-label={`${isPlaying?'Pause':'Play'} ${track.title}`} onClick={toggle}><TrackArt index={trackIndex!}/></button>
    <div className="ax70-floating-details">
     <div className="ax70-floating-track"><strong title={track.title}>{track.title}</strong><small>{isPlaying?'Now playing':'Paused'} · {formatTime(progress)}</small></div>
     <button className="ax70-floating-transport" type="button" onClick={toggle} aria-label={isPlaying?'Pause music':'Play music'}>{isPlaying?'Ⅱ':'▶'}</button>
     <label className="ax70-floating-volume"><span>VOL</span><input type="range" min="0" max="100" value={volume} onChange={e=>setVolume(+e.target.value)} aria-label="Music volume"/></label>
     <button type="button" className="ax70-floating-close" aria-label="Pause and close floating player" title="Pause and close" onClick={closePlayer}>×</button>
    </div>
   </div>}
  {!isEditor&&<button type="button" className={`ax49-cues-toggle ${cueEnabled?'active':''}`} aria-pressed={cueEnabled} onClick={()=>setCueEnabled(!cueEnabled)} title="Optional AUDIXO success chimes">{cueEnabled?'♫':'♪'} <span>UI cues {cueEnabled?'On':'Off'}</span></button>}
 </>
}
