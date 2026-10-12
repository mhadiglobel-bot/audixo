import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import StreamingStudio from '../editor/StreamingStudio'
import { localMetadata } from '../services/media'
import { decodeAudio, renderProject } from '../editor/audioEngine'
import { downloadBlob, encodeMp3, encodeWav } from '../editor/encoder'
import { saveMixToLibrary } from '../editor/library'
import { createClip, createProject, createTrack, defaultClipFx } from '../editor/project'
import { formatTime, safeFileName } from '../editor/utils'
import type { ClipFx } from '../editor/types'

type QuickMode='trim'|'echo'|'slowed'|'pitch'|'spatial'
type Props={mode:QuickMode;title:string;eyebrow:string;description:string}
type QuickPreset={name:string;note:string;apply:()=>void}

const defaults={gainDb:0,speed:1,fadeIn:0,fadeOut:0,delayMs:240,delayWet:.18,feedback:.24,reverb:.28,pitch:0,motionMode:'8d' as '8d'|'16d',motionDepth:.78,motionHz:.18}

const modeGuide:Record<QuickMode,{plain:string;result:string;tip:string}>={
  trim:{plain:'Keep exactly the section you want with two large handles, exact time fields and visible fade zones.',result:'A clean trimmed file with optional fades.',tip:'Drag the two edge handles first. Use START / END only when you need exact millisecond timing.'},
  echo:{plain:'Add controlled repeats without opening a full mixing desk.',result:'Adjustable delay, wet mix and repeat tail.',tip:'Start with Vocal Echo, preview, then reduce Feedback if repeats feel too long.'},
  slowed:{plain:'Slow the song, optionally lock vocal pitch, then add reverb or a controlled echo tail.',result:'Slower song edits with either pitch-lock or tape-style depth.',tip:'Start with Pitch-lock dream for a slower feel without intentionally dropping the voice pitch.'},
  pitch:{plain:'Move the audio lower or higher in semitone steps.',result:'Deeper or brighter tape-style pitch.',tip:'Negative values sound deeper. Positive values sound brighter.'},
  spatial:{plain:'Move sound left and right automatically for headphones.',result:'Stylized 8D or wider 16D stereo movement.',tip:'Use headphones. Lower orbit speed feels smoother and less distracting.'},
}

function Slider({label,value,min,max,step,onChange,display,help,active=false}:{label:string;value:number;min:number;max:number;step:number;onChange:(v:number)=>void;display?:string;help?:string;active?:boolean}){
  const percent=((value-min)/(max-min))*100
  return <label className={`v13-slider ${active?'is-active':''}`}><div><span><b>{label}</b>{help&&<small>{help}</small>}</span><strong>{display ?? value}</strong></div><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{'--quick-range':`${Math.max(0,Math.min(100,percent))}%`} as CSSProperties}/></label>
}

function drawWave(canvas:HTMLCanvasElement,buffer:AudioBuffer){
  const rect=canvas.getBoundingClientRect();if(rect.width<2||rect.height<2)return
  const dpr=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr)
  const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height)
  const channels=Array.from({length:Math.max(1,buffer.numberOfChannels)},(_,i)=>buffer.getChannelData(i))
  const center=rect.height/2;const amp=rect.height*.39;const cols=Math.max(160,Math.floor(rect.width));const sampleStep=Math.max(1,Math.floor(buffer.length/cols))
  const gradient=ctx.createLinearGradient(0,0,rect.width,0);gradient.addColorStop(0,'#16df72');gradient.addColorStop(.48,'#20dff6');gradient.addColorStop(.78,'#8a63ff');gradient.addColorStop(1,'#ff50d3')
  ctx.strokeStyle=gradient;ctx.lineWidth=1.45;ctx.globalAlpha=.94;ctx.beginPath()
  for(let x=0;x<cols;x+=1){
    const a=x*sampleStep,b=Math.min(buffer.length,a+sampleStep);let min=1,max=-1;const stride=Math.max(1,Math.floor((b-a)/18))
    for(let i=a;i<b;i+=stride){let v=0;for(const ch of channels)v+=ch[i]||0;v/=channels.length;if(v<min)min=v;if(v>max)max=v}
    const px=(x/Math.max(1,cols-1))*rect.width;ctx.moveTo(px,center+min*amp);ctx.lineTo(px,center+max*amp)
  }
  ctx.stroke();ctx.globalAlpha=1
  ctx.strokeStyle='rgba(10,26,18,.08)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,center+.5);ctx.lineTo(rect.width,center+.5);ctx.stroke()
}

export default function QuickAudioWorkbench({mode,title,eyebrow,description}:Props){
  const inputRef=useRef<HTMLInputElement|null>(null);const canvasRef=useRef<HTMLCanvasElement|null>(null);const waveRef=useRef<HTMLDivElement|null>(null);const workbenchRef=useRef<HTMLElement|null>(null)
  const bufferRef=useRef<AudioBuffer|null>(null);const [fileName,setFileName]=useState('');const [duration,setDuration]=useState(0);const [trimStart,setTrimStart]=useState(0);const [trimEnd,setTrimEnd]=useState(0)
  const [gainDb,setGainDb]=useState(defaults.gainDb);const [speed,setSpeed]=useState(defaults.speed);const [fadeIn,setFadeIn]=useState(defaults.fadeIn);const [fadeOut,setFadeOut]=useState(defaults.fadeOut)
  const [delayMs,setDelayMs]=useState(mode==='slowed'?140:defaults.delayMs);const [delayWet,setDelayWet]=useState(mode==='slowed'?.04:defaults.delayWet);const [feedback,setFeedback]=useState(mode==='slowed'?.12:defaults.feedback);const [reverb,setReverb]=useState(defaults.reverb);const [pitch,setPitch]=useState(defaults.pitch);const [preservePitch,setPreservePitch]=useState(mode==='slowed')
  const [motionMode,setMotionMode]=useState<'8d'|'16d'>(defaults.motionMode);const [motionDepth,setMotionDepth]=useState(defaults.motionDepth);const [motionHz,setMotionHz]=useState(defaults.motionHz)
  const [format,setFormat]=useState<'mp3'|'wav'>('mp3');const [kbps,setKbps]=useState(320);const [saveLibrary,setSaveLibrary]=useState(true);const [busy,setBusy]=useState('');const [message,setMessage]=useState('')
  const [previewUrl,setPreviewUrl]=useState('');const [sourceUrl,setSourceUrl]=useState('');const [previewDirty,setPreviewDirty]=useState(false);const [controlsCollapsed,setControlsCollapsed]=useState(false);const [isFullscreen,setIsFullscreen]=useState(false);const [isPseudoFullscreen,setIsPseudoFullscreen]=useState(false)
  const [longFile,setLongFile]=useState<File|null>(null);const [longDuration,setLongDuration]=useState(0)
  const guide=modeGuide[mode]

  useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);if(sourceUrl)URL.revokeObjectURL(sourceUrl)},[previewUrl,sourceUrl])
  useEffect(()=>{const canvas=canvasRef.current,buffer=bufferRef.current;if(!canvas||!buffer)return;const draw=()=>drawWave(canvas,buffer);draw();const ro=new ResizeObserver(draw);ro.observe(canvas);return()=>ro.disconnect()},[duration])
  useEffect(()=>{const on=()=>{const active=Boolean(document.fullscreenElement);setIsFullscreen(active);if(active)setIsPseudoFullscreen(false)};document.addEventListener('fullscreenchange',on);return()=>document.removeEventListener('fullscreenchange',on)},[])
  useEffect(()=>{if(!isPseudoFullscreen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[isPseudoFullscreen])
  useEffect(()=>{if(bufferRef.current)setPreviewDirty(true)},[trimStart,trimEnd,gainDb,speed,fadeIn,fadeOut,delayMs,delayWet,feedback,reverb,pitch,preservePitch,motionMode,motionDepth,motionHz])

  const selectedDuration=Math.max(.001,trimEnd-trimStart)
  const selectionStyle=useMemo(()=>({left:`${duration?trimStart/duration*100:0}%`,width:`${duration?(trimEnd-trimStart)/duration*100:0}%`}),[duration,trimStart,trimEnd])
  const fadeInPct=Math.min(50,Math.max(0,(fadeIn/selectedDuration)*100));const fadeOutPct=Math.min(50,Math.max(0,(fadeOut/selectedDuration)*100))

  const resetFx=()=>{setGainDb(0);setSpeed(1);setFadeIn(0);setFadeOut(0);setDelayMs(mode==='slowed'?140:defaults.delayMs);setDelayWet(mode==='slowed'?.04:defaults.delayWet);setFeedback(mode==='slowed'?.12:defaults.feedback);setReverb(defaults.reverb);setPitch(0);setPreservePitch(mode==='slowed');setMotionMode('8d');setMotionDepth(defaults.motionDepth);setMotionHz(defaults.motionHz);setMessage('Settings reset to a clean edit.')}
  const toggleFullscreen=async()=>{if(isPseudoFullscreen){setIsPseudoFullscreen(false);return}try{if(document.fullscreenElement){await document.exitFullscreen();return}const el=workbenchRef.current;if(el?.requestFullscreen){try{await el.requestFullscreen();return}catch(error){console.warn('Native fullscreen unavailable, using in-page maximize.',error)}}setIsPseudoFullscreen(true)}catch{setIsPseudoFullscreen(true)}}

  const loadFile=async(file?:File)=>{if(!file)return;setBusy('Reading audio…');setMessage('');try{const seconds=await localMetadata(file).catch(()=>0);if(seconds>600||file.size>70*1024*1024){if(!seconds)throw new Error('Your browser could not read the full duration. Try an MP3 or WAV source.');if(mode==='trim'){setLongFile(file);setLongDuration(seconds);return}throw new Error('Use a recording under 10 minutes for browser effects, or trim it in the Full Editor first.')}const buffer=await decodeAudio(await file.arrayBuffer());bufferRef.current=buffer;setFileName(file.name);setDuration(buffer.duration);setTrimStart(0);setTrimEnd(buffer.duration);resetFx();if(sourceUrl)URL.revokeObjectURL(sourceUrl);setSourceUrl(URL.createObjectURL(file));if(previewUrl){URL.revokeObjectURL(previewUrl);setPreviewUrl('')}setPreviewDirty(false);setMessage('Audio ready. Start with the green and cyan trim handles, then preview before downloading.')}catch(error){console.error(error);setMessage(error instanceof Error?error.message:'This file could not be decoded in the current browser.')}finally{setBusy('')}}

  const setHandleFromX=(kind:'start'|'end',clientX:number)=>{const host=waveRef.current;if(!host||!duration)return;const r=host.getBoundingClientRect();const t=Math.max(0,Math.min(duration,((clientX-r.left)/r.width)*duration));if(kind==='start')setTrimStart(Math.min(t,trimEnd-.02));else setTrimEnd(Math.max(t,trimStart+.02))}
  const startHandle=(kind:'start'|'end',e:ReactPointerEvent)=>{e.preventDefault();e.stopPropagation();const move=(ev:PointerEvent)=>setHandleFromX(kind,ev.clientX);const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})}

  const makeProject=()=>{const raw=bufferRef.current;if(!raw)throw new Error('No audio loaded');const project=createProject(fileName.replace(/\.[^/.]+$/,'')||'Audixo Quick Edit');const track=createTrack('Audio',0);const clip=createClip({bufferId:'quick-buffer',fileName,start:0,offset:trimStart,duration:selectedDuration});const fx:ClipFx={...defaultClipFx,gainDb,fadeIn:Math.min(fadeIn,selectedDuration/2),fadeOut:Math.min(fadeOut,selectedDuration/2)}
    if(mode==='trim')fx.speed=speed
    if(mode==='echo'){fx.delayMs=delayMs;fx.delayWet=delayWet;fx.feedback=feedback;fx.limiter=true}
    if(mode==='slowed'){fx.speed=speed;fx.preservePitch=preservePitch;fx.reverb=reverb;fx.delayMs=delayMs;fx.delayWet=delayWet;fx.feedback=feedback;fx.compressor=true;fx.limiter=true}
    if(mode==='pitch'){fx.tapePitchSemitones=pitch;fx.gainDb=gainDb;fx.limiter=true}
    if(mode==='spatial'){fx.motionMode=motionMode;fx.motionDepth=motionDepth;fx.motionHz=motionHz;fx.reverb=.08;fx.limiter=true}
    clip.fx=fx;track.clips.push(clip);project.tracks.push(track);return{project,buffers:new Map([['quick-buffer',raw]])}}

  const render=async()=>{const {project,buffers}=makeProject();return renderProject(project,buffers,{normalize:true,stereoRepair:true,sampleRate:44100})}
  const preview=async()=>{if(!bufferRef.current)return;setBusy('Building preview…');try{const {buffer}=await render();const blob=encodeWav(buffer);if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl(URL.createObjectURL(blob));setPreviewDirty(false);setMessage('Preview ready. Listen once, then download if it sounds right.')}catch(error){console.error(error);setMessage('Preview failed in this browser.')}finally{setBusy('')}}
  const exportAudio=async()=>{if(!bufferRef.current)return;setBusy('Preparing download…');try{const {buffer}=await render();const blob=format==='mp3'?await encodeMp3(buffer,kbps):encodeWav(buffer);const base=safeFileName(fileName.replace(/\.[^/.]+$/,'')||'audiox-audio');downloadBlob(blob,`${base}-${mode}.${format}`);if(saveLibrary)await saveMixToLibrary({name:`${base} · ${title}`,blob,format,kbps,duration:buffer.duration});setPreviewDirty(false);setMessage(`${format.toUpperCase()} downloaded${saveLibrary?' and saved to your local Library':''}.`)}catch(error){console.error(error);setMessage('Export failed in this browser. Try MP3/WAV source audio or another current browser.')}finally{setBusy('')}}

  const presets:QuickPreset[]=mode==='trim'?
    [
      {name:'Clean cut',note:'Normal volume · no fades',apply:()=>{setGainDb(0);setSpeed(1);setFadeIn(0);setFadeOut(0)}},
      {name:'Smooth edges',note:'Gentle 0.8 sec fades',apply:()=>{setGainDb(0);setSpeed(1);setFadeIn(Math.min(.8,selectedDuration/4));setFadeOut(Math.min(.8,selectedDuration/4))}},
      {name:'Voice clip',note:'Small lift + soft edges',apply:()=>{setGainDb(1.5);setSpeed(1);setFadeIn(Math.min(.15,selectedDuration/4));setFadeOut(Math.min(.25,selectedDuration/4))}},
      {name:'Soft intro',note:'1.2 sec fade-in',apply:()=>{setFadeIn(Math.min(1.2,selectedDuration/3));setFadeOut(0)}},
      {name:'Soft outro',note:'1.5 sec fade-out',apply:()=>{setFadeIn(0);setFadeOut(Math.min(1.5,selectedDuration/3))}},
    ]
    :mode==='echo'?
    [
      {name:'Light echo',note:'Short and subtle',apply:()=>{setDelayMs(170);setDelayWet(.12);setFeedback(.10)}},
      {name:'Vocal echo',note:'Balanced repeat',apply:()=>{setDelayMs(280);setDelayWet(.22);setFeedback(.24)}},
      {name:'Deep echo',note:'Longer repeat tail',apply:()=>{setDelayMs(480);setDelayWet(.34);setFeedback(.42)}},
      {name:'Tight slap',note:'Fast single-repeat feel',apply:()=>{setDelayMs(95);setDelayWet(.18);setFeedback(.07)}},
      {name:'Wide repeat',note:'Long airy repeats',apply:()=>{setDelayMs(390);setDelayWet(.26);setFeedback(.31)}},
    ]
    :mode==='slowed'?
    [
      {name:'Pitch-lock soft',note:'0.92× · voice stays close',apply:()=>{setSpeed(.92);setPreservePitch(true);setReverb(.18);setDelayMs(135);setDelayWet(.03);setFeedback(.08)}},
      {name:'Pitch-lock dream',note:'0.82× · wide reverb',apply:()=>{setSpeed(.82);setPreservePitch(true);setReverb(.36);setDelayMs(155);setDelayWet(.04);setFeedback(.10)}},
      {name:'Tape slowed',note:'0.78× · naturally deeper',apply:()=>{setSpeed(.78);setPreservePitch(false);setReverb(.34);setDelayMs(145);setDelayWet(.04);setFeedback(.12)}},
      {name:'Original pitch space',note:'1.00× · reverb only',apply:()=>{setSpeed(1);setPreservePitch(true);setReverb(.30);setDelayMs(120);setDelayWet(.02);setFeedback(.06)}},
      {name:'Echo + pitch lock',note:'0.88× · soft spacious tail',apply:()=>{setSpeed(.88);setPreservePitch(true);setReverb(.28);setDelayMs(290);setDelayWet(.18);setFeedback(.24)}},
      {name:'Gentle slowed',note:'0.95× · subtle reverb',apply:()=>{setSpeed(.95);setPreservePitch(true);setReverb(.14);setDelayMs(115);setDelayWet(.02);setFeedback(.05)}},
    ]
    :mode==='pitch'?
    [
      {name:'Deep',note:'−6 semitones',apply:()=>setPitch(-6)},
      {name:'Natural low',note:'−3 semitones',apply:()=>setPitch(-3)},
      {name:'Bright',note:'+4 semitones',apply:()=>setPitch(4)},
      {name:'Light lift',note:'+2 semitones',apply:()=>setPitch(2)},
      {name:'Very deep',note:'−9 semitones',apply:()=>setPitch(-9)},
    ]
    :[
      {name:'Smooth orbit',note:'8D · slow movement',apply:()=>{setMotionMode('8d');setMotionDepth(.76);setMotionHz(.14)}},
      {name:'Wide orbit',note:'8D · stronger movement',apply:()=>{setMotionMode('8d');setMotionDepth(.92);setMotionHz(.2)}},
      {name:'16D motion',note:'Wider layered movement',apply:()=>{setMotionMode('16d');setMotionDepth(.96);setMotionHz(.23)}},
      {name:'Slow headphone sweep',note:'8D · very gentle orbit',apply:()=>{setMotionMode('8d');setMotionDepth(.64);setMotionHz(.08)}},
      {name:'Fast orbit',note:'16D · energetic movement',apply:()=>{setMotionMode('16d');setMotionDepth(.86);setMotionHz(.36)}},
    ]

  const applied=useMemo(()=>{
    const items=[`Keep ${formatTime(trimStart,true)} → ${formatTime(trimEnd,true)}`]
    if(mode==='trim'){if(fadeIn>.01)items.push(`Fade in ON · ${fadeIn.toFixed(2)}s`);if(fadeOut>.01)items.push(`Fade out ON · ${fadeOut.toFixed(2)}s`)}
    if(mode==='echo')items.push(`Delay ${Math.round(delayMs)} ms`,`Echo ${Math.round(delayWet*100)}%`,`Feedback ${Math.round(feedback*100)}%`)
    if(mode==='slowed'){items.push(`Speed ${speed.toFixed(2)}×`,preservePitch?'Pitch Lock ON':'Tape Pitch feel',`Reverb ${Math.round(reverb*100)}%`);if(delayWet>.045)items.push(`Echo ${Math.round(delayWet*100)}% · ${Math.round(delayMs)}ms`);if(fadeIn>.01)items.push(`Fade in ON · ${fadeIn.toFixed(2)}s`);if(fadeOut>.01)items.push(`Fade out ON · ${fadeOut.toFixed(2)}s`)}
    if(mode==='pitch')items.push(`Pitch ${pitch>0?'+':''}${pitch} st`)
    if(mode==='spatial')items.push(`${motionMode.toUpperCase()} mode`,`Depth ${Math.round(motionDepth*100)}%`,`Orbit ${motionHz.toFixed(2)} Hz`)
    return items
  },[trimStart,trimEnd,mode,gainDb,speed,fadeIn,fadeOut,delayMs,delayWet,feedback,reverb,pitch,preservePitch,motionMode,motionDepth,motionHz])

  if(longFile)return <StreamingStudio file={longFile} duration={longDuration} onBack={()=>setLongFile(null)}/>
  const ruler=[0,.25,.5,.75,1]
  return <div className={`v13-quick-page ax27-quick-page mode-${mode}`}>
    <section className="page-shell v13-tool-hero ax27-tool-hero"><div><div className="eyebrow"><span/> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="v13-beginner-flow ax27-beginner-flow"><span><b>01 · Upload</b><small>choose audio</small></span><i>→</i><span><b>02 · Adjust</b><small>{title} only</small></span><i>→</i><span><b>03 · Preview</b><small>listen first</small></span><i>→</i><span><b>04 · Download</b><small>MP3 / WAV</small></span></div></section>

    <section ref={workbenchRef} className={`page-shell v13-workbench v13-neon-frame ax27-workbench ${controlsCollapsed?'is-controls-collapsed':''} ${isFullscreen?'is-fullscreen':''} ${isPseudoFullscreen?'is-pseudo-fullscreen':''}`}>
      <div className="ax27-workbench-intro"><div><span>FOCUSED WORKSPACE</span><strong>{guide.plain}</strong><p>{guide.tip}</p></div><aside><small>RESULT</small><b>{guide.result}</b></aside></div>
      <div className="v13-workbench-bar ax27-source-bar"><div><span className="v13-status-dot"/><strong>{fileName||'No audio loaded yet'}</strong><small>{duration?`${formatTime(duration,true)} source audio`:'Upload an MP3 or WAV to open the timeline.'}</small></div><div><button className="button button-glass" onClick={()=>inputRef.current?.click()}>{fileName?'Replace audio':'Upload audio'}</button>{bufferRef.current&&<button className="button button-glass" onClick={()=>setControlsCollapsed(v=>!v)}>{controlsCollapsed?'Show settings':'Hide settings'}</button>}<button className="button button-glass" onClick={toggleFullscreen}>{isFullscreen||isPseudoFullscreen?'Exit maximized':'Maximize'}</button></div></div>
      <input ref={inputRef} type="file" hidden accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/>

      {!bufferRef.current?<button className="v13-empty-upload ax27-empty-upload ax28-cinematic-upload" onClick={()=>inputRef.current?.click()}>
        <div className="ax28-upload-orbit" aria-hidden="true"><i/><i/><i/><span>+</span></div>
        <div className="ax28-upload-wave" aria-hidden="true">{Array.from({length:38},(_,i)=><i key={i} style={{'--i':i,'--h':`${24+((i*29)%66)}%`} as CSSProperties}/>)}</div>
        <strong>Bring in your audio.</strong><span>Drop a file here or click to choose. The focused {title} workspace opens immediately after import.</span>
        <div className="ax28-upload-formats"><b>MP3</b><b>WAV</b><b>M4A</b><b>FLAC</b><b>OGG</b></div>
        <em>Upload to shape to preview to download</em>
      </button>:<>
        <div className="v13-progress-strip ax27-progress-strip"><span className="done">✓ Audio ready</span><span className={!controlsCollapsed?'active':''}>Adjust {title}</span><span className={previewUrl&&!previewDirty?'done':''}>Preview</span><span>Download</span></div>
        <div className={`ax27-quick-grid ${controlsCollapsed?'single':''}`}>
          <section className="v13-wave-card ax27-timeline-card">
            <header className="ax27-timeline-head"><div><small>YOUR TIMELINE</small><strong>{fileName}</strong></div><div><span>ACTIVE RANGE</span><b>{formatTime(trimStart,true)} → {formatTime(trimEnd,true)}</b></div></header>
            <div className="ax27-ruler">{ruler.map(v=><span key={v}>{formatTime(duration*v)}</span>)}</div>
            <div className="v13-wave ax27-wave" ref={waveRef} onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;const r=e.currentTarget.getBoundingClientRect();const t=Math.max(0,Math.min(duration,((e.clientX-r.left)/r.width)*duration));const d1=Math.abs(t-trimStart),d2=Math.abs(t-trimEnd);if(d1<d2)setTrimStart(Math.min(t,trimEnd-.02));else setTrimEnd(Math.max(t,trimStart+.02))}}>
              <canvas ref={canvasRef}/><div className="ax27-wave-grid"/>
              <div className="v13-wave-dim left" style={{width:`${duration?trimStart/duration*100:0}%`}}/><div className="v13-wave-dim right" style={{width:`${duration?(duration-trimEnd)/duration*100:0}%`}}/>
              <div className="v13-wave-selection" style={selectionStyle}><button className="start" aria-label="Trim start" onPointerDown={e=>startHandle('start',e)}/><button className="end" aria-label="Trim end" onPointerDown={e=>startHandle('end',e)}/>{fadeIn>.01&&<div className="v13-fade-zone fade-in" style={{width:`${fadeInPct}%`}}><span>FADE IN</span></div>}{fadeOut>.01&&<div className="v13-fade-zone fade-out" style={{width:`${fadeOutPct}%`}}><span>FADE OUT</span></div>}<span className="v13-duration-chip">{formatTime(selectedDuration,true)}</span></div>
            </div>
            <div className="v13-time-fields ax27-time-fields"><label><span>START</span><input type="number" min="0" max={trimEnd-.02} step=".001" value={trimStart.toFixed(3)} onChange={e=>setTrimStart(Math.max(0,Math.min(Number(e.target.value)||0,trimEnd-.02)))}/></label><label><span>END</span><input type="number" min={trimStart+.02} max={duration} step=".001" value={trimEnd.toFixed(3)} onChange={e=>setTrimEnd(Math.min(duration,Math.max(Number(e.target.value)||duration,trimStart+.02)))}/></label><div><span>SELECTED</span><strong>{formatTime(selectedDuration,true)}</strong></div><button onClick={()=>{setTrimStart(0);setTrimEnd(duration)}}>Use full audio</button></div>
            {mode==='trim'&&<div className="v13-fade-status ax27-fade-status"><button className={fadeIn>.01?'active':''} onClick={()=>setFadeIn(fadeIn>.01?0:Math.min(.8,selectedDuration/4))}><i/> <span><strong>Fade in {fadeIn>.01?'ON':'OFF'}</strong><small>{fadeIn>.01?`${fadeIn.toFixed(2)} sec applied`:'Add a smooth entrance'}</small></span></button><button className={fadeOut>.01?'active red':''} onClick={()=>setFadeOut(fadeOut>.01?0:Math.min(.8,selectedDuration/4))}><i/> <span><strong>Fade out {fadeOut>.01?'ON':'OFF'}</strong><small>{fadeOut>.01?`${fadeOut.toFixed(2)} sec applied`:'Add a smooth ending'}</small></span></button></div>}
            {sourceUrl&&<div className="v13-audio-player ax27-source-player"><span>ORIGINAL SOURCE</span><audio controls src={sourceUrl}/></div>}
          </section>

          {!controlsCollapsed&&<aside className="v13-controls-card ax27-control-dock">
            <div className="v13-controls-head ax27-controls-head"><div><small>DEDICATED SETTINGS</small><strong>{title}</strong><p>Only the controls needed for this tool are shown here.</p></div><button onClick={resetFx}>Reset</button></div>
            <div className="v13-preset-row ax27-preset-row">{presets.map(p=><button key={p.name} onClick={()=>{p.apply();setMessage(`${p.name} preset applied. Preview it before downloading.`)}}><strong>{p.name}</strong><small>{p.note}</small></button>)}</div>
            {mode==='trim'&&<div className="v13-slider-grid"><Slider label="Fade in" help="Smooth beginning" value={fadeIn} min={0} max={Math.min(8,selectedDuration/2)} step={.05} display={`${fadeIn.toFixed(2)} s`} active={fadeIn>.01} onChange={setFadeIn}/><Slider label="Fade out" help="Smooth ending" value={fadeOut} min={0} max={Math.min(8,selectedDuration/2)} step={.05} display={`${fadeOut.toFixed(2)} s`} active={fadeOut>.01} onChange={setFadeOut}/></div>}
            {mode==='echo'&&<div className="v13-slider-grid"><Slider label="Delay time" help="Space between repeats" value={delayMs} min={40} max={900} step={5} display={`${Math.round(delayMs)} ms`} active onChange={setDelayMs}/><Slider label="Echo amount" help="How much repeat you hear" value={delayWet} min={0} max={.6} step={.01} display={`${Math.round(delayWet*100)}%`} active={delayWet>.01} onChange={setDelayWet}/><Slider label="Feedback" help="How long repeats continue" value={feedback} min={0} max={.7} step={.01} display={`${Math.round(feedback*100)}%`} active={feedback>.01} onChange={setFeedback}/><Slider label="Output volume" help="Final loudness" value={gainDb} min={-18} max={6} step={.5} display={`${gainDb>0?'+':''}${gainDb.toFixed(1)} dB`} active={Math.abs(gainDb)>.01} onChange={setGainDb}/></div>}
            {mode==='slowed'&&<><div className="v14-pitch-lock"><button type="button" className={preservePitch?'active':''} onClick={()=>setPreservePitch(v=>!v)}><span>Pitch Lock</span><strong>{preservePitch?'ON':'OFF'}</strong></button><p>{preservePitch?'Keep the voice closer to its original pitch while the audio slows.':'Tape-style slowdown lowers the perceived pitch as speed decreases.'}</p></div><div className="v13-slider-grid"><Slider label="Slow speed" help="Lower number = slower" value={speed} min={.5} max={1} step={.01} display={`${speed.toFixed(2)}×`} active={Math.abs(speed-1)>.01} onChange={setSpeed}/><Slider label="Reverb" help="Room / space amount" value={reverb} min={0} max={.7} step={.01} display={`${Math.round(reverb*100)}%`} active={reverb>.01} onChange={setReverb}/><Slider label="Echo amount" help="Repeat mixed into slowed audio" value={delayWet} min={0} max={.45} step={.01} display={`${Math.round(delayWet*100)}%`} active={delayWet>.045} onChange={setDelayWet}/><Slider label="Echo delay" help="Time between repeats" value={delayMs} min={60} max={600} step={5} display={`${Math.round(delayMs)} ms`} active={delayWet>.045} onChange={setDelayMs}/><Slider label="Fade in" help="Smooth the beginning" value={fadeIn} min={0} max={Math.min(8,selectedDuration/2)} step={.05} display={`${fadeIn.toFixed(2)} s`} active={fadeIn>.01} onChange={setFadeIn}/><Slider label="Fade out" help="Smooth the ending" value={fadeOut} min={0} max={Math.min(8,selectedDuration/2)} step={.05} display={`${fadeOut.toFixed(2)} s`} active={fadeOut>.01} onChange={setFadeOut}/></div></>}
            {mode==='pitch'&&<div className="v13-slider-grid"><Slider label="Pitch" help="Deep ↔ bright" value={pitch} min={-12} max={12} step={1} display={`${pitch>0?'+':''}${pitch} st`} active={pitch!==0} onChange={setPitch}/><Slider label="Output volume" help="Final loudness" value={gainDb} min={-18} max={6} step={.5} display={`${gainDb>0?'+':''}${gainDb.toFixed(1)} dB`} active={Math.abs(gainDb)>.01} onChange={setGainDb}/></div>}
            {mode==='spatial'&&<><div className="v13-motion-switch"><button className={motionMode==='8d'?'active':''} onClick={()=>setMotionMode('8d')}>8D · smooth orbit</button><button className={motionMode==='16d'?'active':''} onClick={()=>setMotionMode('16d')}>16D · wider motion</button></div><div className="v13-slider-grid"><Slider label="Motion depth" help="How far left/right" value={motionDepth} min={0} max={.98} step={.01} display={`${Math.round(motionDepth*100)}%`} active={motionDepth>.01} onChange={setMotionDepth}/><Slider label="Orbit speed" help="How quickly sound moves" value={motionHz} min={.03} max={.8} step={.01} display={`${motionHz.toFixed(2)} Hz`} active onChange={setMotionHz}/></div></>}
            <div className="v13-applied-panel ax27-applied-panel"><span>ACTIVE ON EXPORT</span><div>{applied.map(item=><b key={item}>✓ {item}</b>)}</div></div>
          </aside>}
        </div>
        <section className="ax27-export-dock"><div><label>FORMAT<select value={format} onChange={e=>setFormat(e.target.value as 'mp3'|'wav')}><option value="mp3">MP3</option><option value="wav">WAV</option></select></label>{format==='mp3'&&<label>QUALITY<select value={kbps} onChange={e=>setKbps(Number(e.target.value))}>{[96,128,192,256,320].map(v=><option value={v} key={v}>{v} kbps</option>)}</select></label>}<label className="v13-check"><input type="checkbox" checked={saveLibrary} onChange={e=>setSaveLibrary(e.target.checked)}/><span>Save to Library</span></label></div><div><button className="button button-glass" disabled={Boolean(busy)} onClick={preview}>{previewDirty&&previewUrl?'Refresh Preview':'Preview Edit'}</button><button className="button button-primary" disabled={Boolean(busy)} onClick={exportAudio}>{busy||`Download ${format.toUpperCase()}`}</button></div></section>
        {previewUrl&&<div className={`v13-preview-card ax27-preview-card ${previewDirty?'is-stale':''}`}><div><span>EDITED PREVIEW</span>{previewDirty&&<b>Settings changed · refresh preview</b>}</div><audio controls src={previewUrl}/></div>}
        {message&&<div className="v13-tool-message ax27-tool-message">{message}</div>}
      </>}
    </section>
  </div>
}
