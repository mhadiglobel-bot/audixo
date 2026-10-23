import {useEffect,useRef,useState} from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import {VideoQualityRail,Mp3QualityRail,highestConfirmedQuality,confirmedVideoOptions,type Mp3Bitrate} from '../components/QualityRail'
import {downloadFile,verifyVideoOutput,explainMediaError,MediaServiceError,TERMINAL_JOB_CODES,mediaRequest,waitForJob,type MediaPreview,type MediaJob,type MediaKind} from '../services/media'

type Health={ready:boolean;authenticated?:boolean;maxConcurrent?:number;message?:string}
type SavedJob={id:string;title:string;format:MediaKind;quality:string;mp3Bitrate?:Mp3Bitrate;duration:number;createdAt?:number}
const KEY='audixo-conversion-job-v57'
const shortTime=(seconds:number)=>!Number.isFinite(seconds)||seconds<=0?'Duration unavailable':[Math.floor(seconds/3600),Math.floor(seconds/60)%60,Math.floor(seconds%60)].filter((_,i)=>i>0||seconds>=3600).map((v,i)=>i===0?String(v):String(v).padStart(2,'0')).join(':')
function savedJob():SavedJob|null{try{const value=JSON.parse(sessionStorage.getItem(KEY)||'null');return value&&/^[\w-]{1,128}$/.test(value.id)&&['mp3','mp4'].includes(value.format)&&Date.now()-Number(value.createdAt||0)<14*60_000?value:null}catch{return null}}
const turnstileSiteKey=import.meta.env.VITE_AUDIXO_TURNSTILE_SITE_KEY?.trim()||''
type TurnstileWidget={render:(container:HTMLElement,config:Record<string,unknown>)=>string;reset:(id:string)=>void;remove:(id:string)=>void}
function HumanCheck({onVerified,resetKey}:{onVerified:(token:string)=>void;resetKey:number}){
 const root=useRef<HTMLDivElement|null>(null),widget=useRef<string|null>(null)
 useEffect(()=>{
  if(!turnstileSiteKey||!root.current)return
  let cancelled=false
  const win=window as unknown as {turnstile?:TurnstileWidget}
  const render=()=>{
   if(cancelled||!root.current||!win.turnstile||widget.current!==null)return
   widget.current=win.turnstile.render(root.current,{
    sitekey:turnstileSiteKey,theme:'light',size:'compact',appearance:'always',
    callback:(token:string)=>onVerified(token),
    'expired-callback':()=>onVerified(''),
    'error-callback':()=>onVerified('')
   })
  }
  const existing=document.querySelector<HTMLScriptElement>('script[data-audixo-turnstile]')
  const script=existing||document.createElement('script')
  script.addEventListener('load',render)
  if(!existing){script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.audixoTurnstile='true';document.head.append(script)}
  render()
  return()=>{cancelled=true;script.removeEventListener('load',render);if(widget.current&&win.turnstile){win.turnstile.remove(widget.current);widget.current=null}}
 },[onVerified])
 useEffect(()=>{
  if(resetKey&&widget.current){const win=window as unknown as {turnstile?:TurnstileWidget};win.turnstile?.reset(widget.current)}
 },[resetKey])
 if(!turnstileSiteKey)return null
 return <div className="ax52-bot-row"><span>Security check</span><div ref={root}/></div>
}

const aborted=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError'

export default function YouTubeConverter(){
 const [url,setUrl]=useState(''),[preview,setPreview]=useState<MediaPreview|null>(null)
 const [format,setFormat]=useState<MediaKind>('mp3'),[quality,setQuality]=useState(''),[mp3Bitrate,setMp3Bitrate]=useState<Mp3Bitrate>(320)
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[job,setJob]=useState<MediaJob|null>(null),[manualDownload,setManualDownload]=useState('')
 const [humanToken,setHumanToken]=useState(''),[humanReset,setHumanReset]=useState(0),[health,setHealth]=useState<Health|null>(null)
 const [saved,setSaved]=useState<SavedJob|null>(savedJob),[completed,setCompleted]=useState<SavedJob|null>(null)
 const change=useRef(0),running=useRef<AbortController|null>(null)
 const effectiveMp3Bitrate=mp3Bitrate
 const downloadButtonText=busy||(format==='mp4'?(quality?`Download MP4 · ${quality}p`:preview?'MP4 not available for this video':'Analyze video for MP4'):`Download MP3 · ${effectiveMp3Bitrate} kbps`)
 useEffect(()=>{
  const controller=new AbortController()
  mediaRequest<Health>('health',{},controller.signal).then(setHealth).catch(e=>{if(!controller.signal.aborted)setHealth({ready:false,message:explainMediaError(e)})})
  return()=>{controller.abort();running.current?.abort()}
 },[])
 const retryConnection=async()=>{
  setHealth(null);setNotice('')
  try{setHealth(await mediaRequest<Health>('health'))}
  catch(error){setHealth({ready:false,message:explainMediaError(error)})}
 }
 const clear=()=>{change.current++;running.current?.abort();running.current=null;setUrl('');setPreview(null);setQuality('');setBusy('');setNotice('');setJob(null);setCompleted(null);setManualDownload('')}
 const updateUrl=(value:string)=>{change.current++;setUrl(value);setPreview(null);setQuality('');setJob(null);setCompleted(null);setManualDownload('');setNotice('')}
 const analyze=async()=>{
  if(!health?.ready)return
  const version=++change.current
  setBusy('Analyzing video...');setNotice('');setPreview(null);setQuality('');setCompleted(null);setJob(null);setManualDownload('')
  try{const info=await mediaRequest<MediaPreview>('meta',{url:url.trim()});if(version!==change.current)return;setPreview(info);setQuality(highestConfirmedQuality(info.qualities||[]));setMp3Bitrate(320)}
  catch(e){if(version===change.current)setNotice(explainMediaError(e))}
  finally{if(version===change.current)setBusy('')}
 }
 const save=(record:SavedJob)=>{setSaved(record);try{sessionStorage.setItem(KEY,JSON.stringify(record))}catch{}}
 const dropSaved=()=>{setSaved(null);try{sessionStorage.removeItem(KEY)}catch{}}
 const finish=async(record:SavedJob,controller:AbortController)=>{
  setBusy(`Preparing ${record.format.toUpperCase()}...`)
  const finished=await waitForJob(record.id,record.format,item=>{
   setJob(item);setBusy(item.state==='queued'?'Queued on AUDIXO worker...':`${item.stage||'Processing'} ${record.format.toUpperCase()}${Number.isFinite(item.progress)?` · ${Math.round(item.progress||0)}%`:''}${item.downloadSpeed?` · ${item.downloadSpeed}`:''}${item.eta?` · ETA ${item.eta}`:''}`)
  },controller.signal,record.format==='mp4'?record.quality:'')
  const file=finished.files?.[0];if(!file)throw new Error('Conversion completed without a downloadable file.')
  setJob(finished)
  let detail=''
  if(record.format==='mp4'){
   setBusy('Preparing the one-time MP4 delivery...')
   const output=await verifyVideoOutput(file,record.title,record.quality,finished,controller.signal)
   // Origin removes each file after ONE GET; do not HEAD or metadata-preview it.
   setManualDownload(await downloadFile(file,record.title,'mp4',controller.signal))
   detail=output.verified?`Verified MP4 ${output.actual}p (${output.width} x ${output.height}) from AUDIXO worker status.`:`Requested ${record.quality}p MP4. The worker did not supply final dimensions; inspect the downloaded file to confirm actual resolution.`
  }else{
   const target=record.mp3Bitrate||320
   const actual=finished.reportedKbps
   if(actual&&Math.abs(actual-target)>8)throw new MediaServiceError(`The MP3 output is ${actual} kbps instead of the selected ${target} kbps. The incorrect file was not downloaded.`,'QUALITY_MISMATCH',422,true)
   // AUDIXO V56 private worker encodes MP3 at the selected bitrate itself.
   // One full GET only; do not consume one-time output for local re-encoding.
   setManualDownload(await downloadFile(file,record.title,'mp3',controller.signal))
   detail=actual?`MP3 encoded at ${actual} kbps (worker-verified).`:`MP3 requested at ${target} kbps. The server did not provide final bitrate metadata.`

  }
  if(controller.signal.aborted)return
  // A one-time file cannot be fetched twice. A new download creates a new job.
  dropSaved();setCompleted(record);setNotice(`Secure download link opened. Check your browser's downloads. ${detail}`)
 }
 const start=async()=>{
  if(!health?.ready||!preview||busy||(turnstileSiteKey&&!humanToken))return
  const recordFormat=format,recordQuality=quality
  if(recordFormat==='mp4'){
   const confirmed=confirmedVideoOptions(preview.qualities||[])
   if(!recordQuality||!confirmed.some(item=>item.value===recordQuality)){
    setNotice(!confirmed.length?'No downloadable MP4 resolutions were reported for this video.':`The selected resolution is not available. Choose one of: ${confirmed.map(item=>item.label).join(', ')}.`)
    return
   }
  }
  running.current?.abort();const controller=new AbortController();running.current=controller
  setNotice('');setCompleted(null);setJob(null);setManualDownload('');setBusy(`Starting ${recordFormat.toUpperCase()}...`)
  let createdHere=false
  try{
   // Exactly the selected quality; never silently create a lower-quality job.
   const created=await mediaRequest<MediaJob>('convert',{url:preview.url,format:recordFormat,...(recordFormat==='mp4'?{quality:recordQuality}:{bitrate:mp3Bitrate}),...(turnstileSiteKey?{turnstileToken:humanToken}:{})},controller.signal)
   if(created.state==='failed')throw new MediaServiceError(created.error||'Conversion rejected.',created.errorCode||'JOB_FAILED')
   if(!created.id)throw new Error('The API did not return a job ID.')
   const record:SavedJob={id:created.id,title:preview.title,format:recordFormat,quality:recordFormat==='mp3'?'':recordQuality,mp3Bitrate:recordFormat==='mp3'?mp3Bitrate:undefined,duration:preview.duration,createdAt:Date.now()}
   save(record);createdHere=true;setJob(created);await finish(record,controller)
  }catch(e){if(!aborted(e)){setNotice(explainMediaError(e));setCompleted(null);if(createdHere&&e instanceof MediaServiceError&&TERMINAL_JOB_CODES.has(e.code))dropSaved()}}
  finally{if(turnstileSiteKey){setHumanToken('');setHumanReset(n=>n+1)}if(running.current===controller){running.current=null;setBusy('')}}
 }
 const continueRecord=async(record:SavedJob)=>{
  if(busy)return
  const controller=new AbortController();running.current=controller;setNotice('')
  try{await finish(record,controller)}catch(e){if(!aborted(e)){setNotice(explainMediaError(e));if(e instanceof MediaServiceError&&TERMINAL_JOB_CODES.has(e.code))dropSaved()}}
  finally{if(running.current===controller){running.current=null;setBusy('')}}
 }
 const resume=()=>{if(saved)void continueRecord(saved)}
 const downloadAgain=()=>{if(completed)void start()}
 const stop=()=>{running.current?.abort();running.current=null;setBusy('');setNotice('Stopped checking. The remote job may continue; Resume checks the same job.')}
 const formats=[{id:'mp3' as const,title:'MP3 Audio',copy:'Choose your MP3 bitrate',glyph:'\u266b'},{id:'mp4' as const,title:'MP4 Video',copy:'Download at the selected resolution',glyph:'\u25b6'}]
 return <SiteShell><Seo title="YouTube to MP3 & MP4 Downloader | AUDIXO" description="Analyze an authorized YouTube video, request MP3 audio, or choose only the MP4 resolutions verified by the conversion server." path="/tools/youtube-to-mp3"/>
  <main className="page-shell ax39-converter">
   <div className="ax39-converter-hero"><div><div className="ax25-kicker"><i/> AUDIXO / MEDIA CONVERTER</div><h1>One link.<br/><em>Sound or video.</em></h1><p>Choose MP3 audio or MP4 video in one clear workspace. Analyze the original title, select a supported format and let your conversion server handle the rest.</p><div className={`ax39-server ${health?.ready?'ready':health?'not-ready':'loading'}`}><i/>{health?.ready?'Media worker connected':health?'Worker setup or connection required':'Checking media worker'}{health?.ready&&health.maxConcurrent?` · ${health.maxConcurrent} concurrent jobs`:''}</div></div><div className="ax39-hero-art" aria-hidden="true"><span className="ax39-art-orbit a"/><span className="ax39-art-orbit b"/><div className="ax39-art-disc"><span>♫</span></div><div className="ax39-art-chip one">MP3 · server encoded</div><div className="ax39-art-chip two">MP4 · source resolution</div></div></div>
   <section className="ax39-converter-panel" aria-label="YouTube media converter">
    <div className="ax39-converter-top"><div><small>FORMAT</small><strong>What would you like to save?</strong></div><span>01 / 03</span></div>
    <div className="ax39-format-toggle" role="group" aria-label="Output file format">{formats.map(item=><button type="button" key={item.id} className={format===item.id?'active':''} aria-pressed={format===item.id} disabled={!!busy} onClick={()=>{setFormat(item.id);setNotice('');setCompleted(null);setJob(null)}}><span className="ax39-format-icon">{item.glyph}</span><span><strong>{item.title}</strong><small>{item.copy}</small></span><span className="ax46-format-switch" aria-hidden="true"><i/></span></button>)}</div>
    <div className="ax39-steps">
     <div className="ax39-step"><span className="ax39-step-num">01</span><div className="ax39-step-content"><h2>Paste your YouTube link</h2><p>A clean source preview appears after Analyze. Use × to clear the field instantly.</p><div className="ax39-urlbar"><div className="ax42-url-input"><span aria-hidden="true">↗</span><input aria-label="YouTube video URL" type="url" placeholder="Paste a YouTube video link…" value={url} disabled={!!busy} onChange={e=>updateUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!busy&&url.trim())void analyze()}}/>{url&&<button className="ax39-clear" aria-label="Clear YouTube URL" title="Clear URL" type="button" onClick={clear}>×</button>}</div><button type="button" disabled={!health?.ready||!!busy||!url.trim()} className="ax39-analyze" onClick={analyze}>{busy.startsWith('Analyzing')?'Checking…':'Analyze'} <span>↗</span></button></div>
       {preview&&<div className="ax39-preview"><img src={preview.thumbnail} alt="Video thumbnail" loading="lazy" referrerPolicy="no-referrer"/><div><small>VIDEO IDENTIFIED · {shortTime(preview.duration)}</small><strong title={preview.title}>{preview.title}</strong><span>{preview.author||'YouTube source'}</span></div><b>✓</b></div>}
      </div></div>
     <div className="ax39-step"><span className="ax39-step-num">02</span><div className="ax39-step-content"><h2>{format==='mp3'?'Choose audio quality':'Set video resolution'}</h2>{format==='mp3'?<Mp3QualityRail bitrate={mp3Bitrate} duration={preview?.duration||0} disabled={!!busy} onChange={setMp3Bitrate}/>:<VideoQualityRail quality={quality} onChange={setQuality} available={preview?.qualities||[]} analyzed={!!preview} disabled={!!busy}/>}
      </div></div>
     <div className="ax39-step"><span className="ax39-step-num">03</span><div className="ax39-step-content"><h2>Prepare & download</h2><p>File name keeps the analyzed video title, followed by <b>(Audixo {format.toUpperCase()})</b>.</p><HumanCheck onVerified={setHumanToken} resetKey={humanReset}/><p className="ax52-usage-note">Use media you are permitted to download or transform.</p><button type="button" className="ax39-create ax42-download" disabled={!health?.ready||!preview||!!busy||(turnstileSiteKey&&!humanToken)||(format==='mp4'&&(!quality||!confirmedVideoOptions(preview.qualities||[]).some(item=>item.value===quality)))} onClick={start}><span>{downloadButtonText}</span><b>↓</b></button>
       {busy&&!busy.startsWith('Analyzing')&&<div className="ax39-progress" role="status"><div><strong>{busy}</strong><button onClick={stop}>Stop checking</button></div><span><i style={{width:`${Math.min(99,Math.max(0,Number(job?.progress)||0))}%`}}/></span><small>{job?.message||'Live processing progress appears as your audio/video is prepared; the server cleans up the file after a single download.'}{job?.downloadPart&&job.downloadPartsTotal?` · Stream ${job.downloadPart}/${job.downloadPartsTotal}`:''}</small></div>}
       {saved&&!busy&&health?.ready&&<button className="ax39-resume" onClick={resume}>↻ Resume earlier {saved.format.toUpperCase()} job</button>}
       {completed&&!busy&&<button className="ax39-resume" onClick={downloadAgain}>Start a new download job</button>}
       {completed&&!busy&&manualDownload&&<a className="ax57-manual-download" href={manualDownload} rel="noreferrer">Download didn't start? Click here within 2 minutes ↗</a>}
      </div></div>
    </div>
    <div className="ax39-converter-bottom"><span>Original video title</span><span>MP3 or MP4</span><span>Download progress</span></div>
   </section>
   {health&&!health.ready&&<div role="status" className="ax39-alert ax57-worker-alert"><span>{health.message||'Media worker is not connected. Deploy its Docker service and configure Vercel backend variables.'}</span><button type="button" onClick={()=>void retryConnection()}>Retry connection ↻</button></div>}
   {notice&&(!health||health.ready)&&<div role="status" className="ax39-alert" data-type={/Secure download link opened/i.test(notice)?'success':'info'}>{notice}</div>}
  </main>
 </SiteShell>
}
