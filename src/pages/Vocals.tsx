import {RotatingUploadLogo} from '../components/Logo'
import StemMixerStudio from '../components/StemMixerStudio'
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {useLocation} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import LibraryDrawer from '../editor/LibraryDrawer'
import {getLibraryMixes,type LibraryMix} from '../editor/library'
import {separateLocally,type LocalStem,type StemProgress} from '../services/localStems'
import {localMetadata} from '../services/media'
import {createSoundBankClip,soundBank,type SoundBankItem} from '../services/soundBank'

const layerNames=['Lyrics / Vocals','Music','Drums','Bass','Other instruments'] as const
const fmt=(s:number)=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')

export default function Vocals(){
 const [file,setFile]=useState<File|null>(null)
 const [busy,setBusy]=useState(false)
 const [status,setStatus]=useState<StemProgress|null>(null)
 const [message,setMessage]=useState('')
 const [stems,setStems]=useState<LocalStem[]>([])
 const [layers,setLayers]=useState<LocalStem[]>([])
 const [library,setLibrary]=useState(false)
 const [elapsed,setElapsed]=useState(0)
 const [bankFamily,setBankFamily]=useState('All')
 const [bankBusy,setBankBusy]=useState('')
 const [bankOpen,setBankOpen]=useState(false)
 const input=useRef<HTMLInputElement>(null)
 const abort=useRef<AbortController|null>(null)
 const demoAudio=useRef<HTMLAudioElement|null>(null)
 const demoUrl=useRef<string|null>(null)
 const location=useLocation()
 const webGpu=typeof navigator!=='undefined'&&Boolean((navigator as Navigator & {gpu?:unknown}).gpu)
 const threaded=typeof crossOriginIsolated!=='undefined'&&crossOriginIsolated
 const choose=(next:File)=>{abort.current?.abort();demoAudio.current?.pause();setFile(next);setStems([]);setLayers([]);setStatus(null);setMessage('')}
 const useSaved=(mix:LibraryMix)=>{choose(new File([mix.blob],mix.name+'.'+mix.format,{type:mix.blob.type}));setLibrary(false)}
 useEffect(()=>{
  const id=(location.state as {libraryId?:string}|null)?.libraryId
  if(id)void getLibraryMixes().then(items=>{const found=items.find(x=>x.id===id);if(found)useSaved(found);else setMessage('This saved mix is no longer available on this device.')})
  return()=>{abort.current?.abort();demoAudio.current?.pause();if(demoUrl.current)URL.revokeObjectURL(demoUrl.current)}
 },[])
 useEffect(()=>{if(!busy){setElapsed(0);return}const start=Date.now(),t=window.setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>window.clearInterval(t)},[busy])
 const analyze=async()=>{
  if(!file||busy)return
  setBusy(true);setMessage('');setLayers([]);setStems([])
  abort.current=new AbortController()
  try{
   if(file.size>120*1048576)throw Error('Choose audio smaller than 120 MB.')
   const length=await localMetadata(file)
   if(length>300)throw Error('Stem extraction supports recordings of up to five minutes. Trim a shorter selection first.')
   setStatus({phase:'read',message:'Reading your sound…',progress:0})
   const separated=await separateLocally(file,setStatus,abort.current.signal,'studio')
   setStems(separated);setLayers(separated)
   setMessage('Five AI-estimated layers are ready. Start the synchronized mixer below to combine or isolate them.')
  }catch(e){
   if((e as Error).name!=='AbortError'){
    const raw=e instanceof Error?e.message:'Stem processing failed.'
    const friendly=/MODEL_DOWNLOAD_TIMEOUT/.test(raw)?'AI model download timed out. Check your connection and try again.':/GPU_START_TIMEOUT|LOCAL_START_TIMEOUT/.test(raw)?'The device AI engine did not initialize. Try Chrome/Edge or a shorter song.':/SEPARATION_TIMEOUT/.test(raw)?'The device exceeded its AI processing window. Try a shorter recording.':raw
    setMessage(friendly+' No approximate tracks were substituted for real AI stems.')
   }
  }finally{setBusy(false);setStatus(null)}
 }
 const saveStem=(name:string)=>{
  const stem=layers.find(s=>s.name===name);if(!stem)return
  const url=URL.createObjectURL(stem.blob),a=document.createElement('a')
  const base=(file?.name||'Audio').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,' ').trim()||'Audio'
  a.href=url;a.download=base+' - '+name.replace(/[\\/:*?"<>|]/g,' ')+' (Audixo).wav'
  document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60_000)
 }
 const families=useMemo(()=>['All',...new Set(soundBank.map(s=>s.family))],[])
 const available=bankFamily==='All'?soundBank:soundBank.filter(s=>s.family===bankFamily)
 const useLoop=async(item:SoundBankItem,add:boolean)=>{
  if(bankBusy)return
  setBankBusy(item.id)
  try{
   const blob=await createSoundBankClip(item)
   if(add){
    const next:LocalStem={name:item.name,blob,mode:'quick',energy:0,peaks:[]}
    setLayers(prev=>[...prev,next]);setMessage(item.name+' added as an independent sound layer.')
   }else{
    demoAudio.current?.pause()
    if(demoUrl.current)URL.revokeObjectURL(demoUrl.current)
    const url=URL.createObjectURL(blob);demoUrl.current=url
    const node=new Audio(url);demoAudio.current=node
    node.onended=()=>{URL.revokeObjectURL(url);if(demoUrl.current===url)demoUrl.current=null}
    await node.play()
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to prepare that sound.')}
  finally{setBankBusy('')}
 }
 return <><SiteShell><Seo title="AUDIXO Vocal Extractor — Five-Stem Audio Mixer" description="Extract vocals, instrumental music, drums, bass and other instruments into independent synchronized tracks with mute, solo, EQ, echo, selection controls and WAV export." path="/tools/vocals"/>
  <main className="page-shell ax25-vocals ax32-vocals ax78-vocals">
   <section className="ax25-page-hero"><div className="ax25-kicker"><i/> VOCALS / MUSIC / STEMS</div><h1 className="ax47-marketing-hero">AUDIXO Vocal Extractor.<br/><em>Hear every layer.</em></h1><p>Extract the lead voice and instrument parts. Remix five distinct layers in one synchronized control deck.</p></section>
   {!stems.length&&<section className="ax25-stem-launch ax32-stem-launch ax75-stem-launch ax78-stem-launch ax83-stem-launch">
    <div className="ax78-stem-intro"><span className={'ax25-engine-badge '+(webGpu?'fast':'fallback')}><i/>{webGpu?'STUDIO AI · WEBGPU AVAILABLE':threaded?'STUDIO AI · MULTI-CORE WASM':'STUDIO AI · CPU MODE'}</span>
     <h2>Find the sound behind the sound.</h2><p>Upload a song to separate its singing voice, instrumental music, drums, bass and other sources. Processing uses the browser's AI engine; the first session may need to download a large model.</p>
     <div className="ax75-stem-mode-note"><span className="ax75-mode-dot"/><strong>Five-layer AI extraction</strong><small>True model separation — not a fake frequency-only split</small></div>
     <div className="ax25-upload-actions ax78-upload-actions"><button className="ax25-primary-button" disabled={busy} onClick={()=>input.current?.click()}>{file?'Replace audio':'Choose a song'} <span>↗</span></button><button disabled={busy} onClick={()=>setLibrary(true)}>Open Library</button></div>
     {file&&<div className="ax25-selected-audio ax75-selected-audio"><span className="ax75-mini-disc"><img src="/audixo-official-symbol.png" alt=""/></span><div><small>SELECTED AUDIO</small><strong>{file.name}</strong></div></div>}
    <button className="ax25-primary-button ax83-stem-extract" disabled={!file||busy} onClick={()=>void analyze()}>{busy?"Processing…":"Extract five layers"} <span>↗</span></button>
    </div>
    <div className="ax25-stem-visual ax32-stem-visual ax78-stem-visual"><RotatingUploadLogo small label="AUDIXO · STEM ENGINE"/>
     {layerNames.map((name,i)=><i key={name} style={{'--i':i} as CSSProperties}><small>{name}</small><b>∿</b></i>)}
     
    </div>
   </section>}
   {busy&&<section className="ax25-stem-progress ax75-stem-progress" role="status"><header><div><small>{status?.phase?.toUpperCase()||'PREPARING'}</small><strong>{status?.message||'Preparing your audio…'}</strong></div><b>{fmt(elapsed)}</b></header>
    <progress max="1" value={['read','init','engine'].includes(status?.phase||'read')?undefined:status?.progress||0}/>
    <p>First-time AI model loading and separation speed depend on the device and audio duration. This is real local processing, not an artificial progress timer.</p><button onClick={()=>abort.current?.abort()}>Cancel processing</button></section>}
   {message&&<div className="ax25-stem-message" role="status">{message}</div>}
   {stems.length>0&&<section className="ax25-stem-results ax72-stem-results ax78-results">
    <header className="ax78-results-heading"><div><small>SEPARATION COMPLETE</small><h2>Five sources. One synced mix.</h2><p>Turn on several stems simultaneously, solo one, change its level, or apply effects to a specific time range.</p></div><button type="button" onClick={()=>{setStems([]);setLayers([]);setFile(null);setBankOpen(false)}}>New extraction ↗</button></header>
    <StemMixerStudio stems={layers} sourceName={file?.name||'Audixo Audio'} onSave={saveStem}/>
   </section>}
   {stems.length>0&&<section className="ax78-sound-library"><header><div><small>SOUND & INSTRUMENT LIBRARY</small><h2>Add a beat. Keep full control.</h2><p>Optional sound layers appear below the extracted stems and can be adjusted independently. These generated loops are not AI-detected instruments.</p></div><button aria-expanded={bankOpen} onClick={()=>setBankOpen(v=>!v)}>{bankOpen?'Close sound library':'Browse 60 sounds'} <span>{bankOpen?'−':'+'}</span></button></header>
    {bankOpen&&<><nav role="group" aria-label="Sound bank categories">{families.map(f=><button key={f} className={bankFamily===f?'active':''} onClick={()=>setBankFamily(f)}>{f}</button>)}</nav><div className="ax78-loop-grid">{available.map(item=><article key={item.id}><div><small>{item.family}</small><strong>{item.name}</strong><p>{item.note}</p></div><div><button disabled={!!bankBusy} onClick={()=>void useLoop(item,false)}>{bankBusy===item.id?'Preparing…':'Preview'}</button><button disabled={!!bankBusy} onClick={()=>void useLoop(item,true)}>+ Add to mix</button></div></article>)}</div></>}
   </section>}
   <input ref={input} type="file" hidden accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" onChange={e=>{if(e.target.files?.[0])choose(e.target.files[0]);e.target.value=''}}/>
  </main>
 </SiteShell><LibraryDrawer open={library} onClose={()=>setLibrary(false)} onSelect={useSaved}/></>
}
