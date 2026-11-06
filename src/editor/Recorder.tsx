import { useEffect,useRef,useState,type CSSProperties } from 'react'
import { formatTime } from './utils'
import Icon from './Icons'
export default function Recorder({onFinish,onClose}:{onFinish:(file:File)=>void;onClose:()=>void}){
 const [state,setState]=useState<'idle'|'recording'|'paused'|'ready'>('idle'),[seconds,setSeconds]=useState(0),[message,setMessage]=useState(''),[file,setFile]=useState<File|null>(null),[url,setUrl]=useState(''),[starting,setStarting]=useState(false),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(0)
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),chunks=useRef<Blob[]>([]),timer=useRef<ReturnType<typeof setInterval>>(),elapsed=useRef(0),mounted=useRef(true),player=useRef<HTMLAudioElement|null>(null)
 const stop=()=>{clearInterval(timer.current);if(recorder.current&&recorder.current.state!=='inactive')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop())}
 const start=async()=>{setStarting(true);setMessage('');try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Microphone recording needs a supported browser and HTTPS.');const source=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(!mounted.current){source.getTracks().forEach(t=>t.stop());return}stream.current=source;const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));const r=new MediaRecorder(source,mime?{mimeType:mime}:undefined);recorder.current=r;chunks.current=[];elapsed.current=0;setSeconds(0);setFile(null);r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};r.onstop=()=>{source.getTracks().forEach(t=>t.stop());if(!mounted.current)return;const type=r.mimeType||'audio/webm',extension=type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm',take=new File(chunks.current,`Audixo-take-${Date.now()}.${extension}`,{type});setFile(take);setState('ready')};r.start(1000);setState('recording');timer.current=setInterval(()=>{if(r.state==='recording'){elapsed.current++;setSeconds(elapsed.current);if(elapsed.current>=600)stop()}},1000)}catch(e){setMessage((e as Error).message||'Microphone access was not granted. You can still import an audio file.')}finally{setStarting(false)}}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop()}},[])
 useEffect(()=>{if(!file)return;const u=URL.createObjectURL(file);setUrl(u);setPlaying(false);setPosition(0);setDuration(0);return()=>URL.revokeObjectURL(u)},[file])
 const playPreview=async()=>{const a=player.current;if(!a)return;if(a.paused){try{await a.play();setPlaying(true)}catch{setMessage("Preview playback was blocked.")}}else{a.pause();setPlaying(false)}}
 return <section className={'nx-recorder nx-glass ax82-recorder ax85-recorder '+(state==='recording'?'is-recording':'')} aria-label="Microphone recorder">
 <header className="ax85-recorder-header"><div className="ax85-recorder-heading">
  <small><Icon name="mic" size={15}/> RECORDER / NEW TAKE</small>
  <h2>Capture your sound.</h2><p>Record, pause, preview and send a take to your Studio timeline.</p>
 </div><button type="button" className="ax85-close" onClick={onClose} aria-label="Close recorder"><Icon name="close" size={20}/></button></header>
 <div className="ax85-recorder-panel">
  <div className="ax85-recorder-clock">
   <span className={'ax85-recorder-state '+(state==='recording'?'is-live':'')}>{state==='recording'?'● Recording':state==='paused'?'❚❚ Paused':state==='ready'?'✓ Take ready':'● Mic ready'}</span>
   <output aria-label="Recording duration">{formatTime(seconds,true)}</output><small>MAX 10 MINUTES · LOCAL AUDIO</small>
  </div>
  <div className="ax85-recorder-wave" aria-hidden="true">{Array.from({length:46},(_,i)=><i key={i} style={{height:(14+((i*17+i*i*9)%62))+'%','--ax85-bar-delay':(i%12)*-.09+'s'} as CSSProperties}/>)}</div>
 </div>
 <div className="ax85-recorder-bottom">
  <p><Icon name="headphones" size={16}/> Audio stays on this device. Microphone permission is requested only when you select Record.</p>
  <div className="nx-record-actions ax85-recorder-actions">
   {(state==='idle'||state==='ready')&&<button type="button" className="button button-primary ax85-record-primary" disabled={starting} onClick={start}><Icon name="mic" size={17}/>{starting?'Opening microphone…':state==='ready'?'Record another take':'Start recording'}</button>}
   {(state==='recording'||state==='paused')&&<>
    <button type="button" className="button button-glass" onClick={()=>{const r=recorder.current;if(!r)return;if(r.state==='recording'){r.pause();setState('paused')}else{r.resume();setState('recording')}}}><Icon name={state==='paused'?'play':'pause'} size={17}/>{state==='paused'?'Resume':'Pause'}</button>
    <button type="button" className="button button-primary ax85-stop" onClick={stop}><Icon name="stop" size={17}/> Stop & preview</button>
   </>}
   {state==='ready'&&file&&<button type="button" className="button button-primary ax85-add-take" onClick={()=>{onFinish(file);onClose()}}><Icon name="plus" size={18}/> Add take to timeline</button>}
  </div>
 </div>
 {file&&<div className="ax82-recorder-preview ax85-recorder-preview">
  <div className="ax82-player-label"><strong>Your recorded take</strong><small title={file.name}>{file.name}</small></div>
  <div className="ax82-player">
   <button type="button" aria-label={playing?'Pause recorded audio':'Play recorded audio'} onClick={()=>void playPreview()}>{playing?<Icon name="pause" size={19}/>:<Icon name="play" size={19}/>}</button>
   <span>{formatTime(position,true)}</span>
   <input type="range" min="0" max={Math.max(.01,duration)} step=".01" value={Math.min(position,Math.max(.01,duration))} aria-label="Recorded audio seek" onChange={e=>{const a=player.current;if(a){a.currentTime=Number(e.target.value);setPosition(a.currentTime)}}}/>
   <span>{formatTime(duration,true)}</span>
  </div>
  <audio ref={player} src={url} preload="metadata" onLoadedMetadata={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)} onTimeUpdate={e=>setPosition(e.currentTarget.currentTime)} onEnded={()=>{setPlaying(false);setPosition(0)}}/>
 </div>}
 {message&&<p className="ax85-recorder-alert" role="alert">{message}</p>}
 </section>
}
