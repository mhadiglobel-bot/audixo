import {useEffect,useRef,useState} from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import {VideoQualityRail,Mp3QualityRail,type Mp3Bitrate} from '../components/QualityRail'
import {mediaUiConfig} from '../config/site'
import {downloadFile,downloadMp3AtBitrate,verifyVideoOutput,explainMediaError,MediaServiceError,mediaRequest,waitForJob,type MediaPreview,type MediaJob,type MediaKind} from '../services/media'

type Health={ready:boolean;authenticated?:boolean;maxConcurrent?:number;message?:string}
type SavedJob={id:string;title:string;format:MediaKind;quality:string;mp3Bitrate?:Mp3Bitrate;duration:number}
const KEY='audixo-conversion-job-v51'
const shortTime=(seconds:number)=>!Number.isFinite(seconds)||seconds<=0?'Duration unavailable':[Math.floor(seconds/3600),Math.floor(seconds/60)%60,Math.floor(seconds%60)].filter((_,i)=>i>0||seconds>=3600).map((v,i)=>i===0?String(v):String(v).padStart(2,'0')).join(':')
function savedJob():SavedJob|null{try{const value=JSON.parse(sessionStorage.getItem(KEY)||'null');return value&&/^[\w-]{1,128}$/.test(value.id)&&['mp3','mp4'].includes(value.format)?value:null}catch{return null}}
function chooseDefaultMp4Quality(qualities:{value:string;label:string}[]=[]){
 const choices=new Set(qualities.map(item=>item.value.replace(/p$/i,'')))
 const preferred=mediaUiConfig.defaultMp4Quality
 return choices.has(preferred)?preferred:Array.from(choices).filter(v=>Number(v)<=Number(preferred)).sort((a,b)=>Number(b)-Number(a))[0]||Array.from(choices).sort((a,b)=>Number(a)-Number(b))[0]||preferred
}
const aborted=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError'

export default function YouTubeConverter(){
 const [url,setUrl]=useState(''),[preview,setPreview]=useState<MediaPreview|null>(null)
 const [format,setFormat]=useState<MediaKind>('mp3'),[quality,setQuality]=useState(mediaUiConfig.defaultMp4Quality),[mp3Bitrate,setMp3Bitrate]=useState<Mp3Bitrate>(320)
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[job,setJob]=useState<MediaJob|null>(null)
 const [permission,setPermission]=useState(false),[health,setHealth]=useState<Health|null>(null)
 const [saved,setSaved]=useState<SavedJob|null>(savedJob),[completed,setCompleted]=useState<SavedJob|null>(null)
 const change=useRef(0),running=useRef<AbortController|null>(null)
 const effectiveMp3Bitrate=mp3Bitrate
 useEffect(()=>{
  const controller=new AbortController()
  mediaRequest<Health>('health',{},controller.signal).then(setHealth).catch(e=>{if(!controller.signal.aborted)setHealth({ready:false,message:explainMediaError(e)})})
  return()=>{controller.abort();running.current?.abort()}
 },[])
 const clear=()=>{change.current++;running.current?.abort();running.current=null;setUrl('');setPreview(null);setQuality(mediaUiConfig.defaultMp4Quality);setBusy('');setNotice('');setJob(null);setCompleted(null)}
 const updateUrl=(value:string)=>{change.current++;setUrl(value);setPreview(null);setQuality(mediaUiConfig.defaultMp4Quality);setJob(null);setCompleted(null);setNotice('')}
 const analyze=async()=>{
  const version=++change.current
  setBusy('Analyzing video...');setNotice('');setPreview(null);setCompleted(null);setJob(null)
  try{const info=await mediaRequest<MediaPreview>('meta',{url:url.trim()});if(version!==change.current)return;setPreview(info);setQuality(chooseDefaultMp4Quality(info.qualities||[]));setMp3Bitrate(320)}
  catch(e){if(version===change.current)setNotice(explainMediaError(e))}
  finally{if(version===change.current)setBusy('')}
 }
 const save=(record:SavedJob)=>{setSaved(record);try{sessionStorage.setItem(KEY,JSON.stringify(record))}catch{}}
 const dropSaved=()=>{setSaved(null);try{sessionStorage.removeItem(KEY)}catch{}}
 const finish=async(record:SavedJob,controller:AbortController)=>{
  setBusy(`Preparing ${record.format.toUpperCase()}...`)
  const finished=await waitForJob(record.id,record.format,item=>{
   setJob(item);setBusy(item.state==='queued'?'Queued...':`Processing ${record.format.toUpperCase()}${item.progress?` - ${Math.round(item.progress)}%`:''}...`)
  },controller.signal)
  const file=finished.files?.[0];if(!file)throw new Error('Conversion completed without a downloadable file.')
  setJob(finished)
  let detail=''
  if(record.format==='mp4'){
   setBusy('Checking the actual MP4 resolution...')
   const output=await verifyVideoOutput(file,record.title,record.quality,controller.signal)
   await downloadFile(file,record.title,'mp4',controller.signal)
   detail=`MP4 ${output.actual}p (${output.width} x ${output.height}).`
  }else{
   const target=record.mp3Bitrate||320
   if(record.duration>0&&record.duration<=300){
    setBusy(`Encoding ${target} kbps MP3 on this device...`)
    await downloadMp3AtBitrate(file,record.title,target,controller.signal)
    detail=`MP3 encoded at ${target} kbps.`
   }else{
    if(target!==320)throw new Error('For files longer than five minutes, select 320 kbps or configure server-side bitrate encoding.')
    if(finished.reportedKbps&&finished.reportedKbps!==target)throw new Error(`The server reported ${finished.reportedKbps} kbps, not ${target} kbps. Fix the backend MP3 encoder before downloading.`)
    await downloadFile(file,record.title,'mp3',controller.signal)
    detail=finished.reportedKbps?`MP3; server reports ${finished.reportedKbps} kbps.`:'MP3; the backend did not report an output bitrate.'
   }
  }
  if(controller.signal.aborted)return
  dropSaved();setCompleted(record);setNotice(`Download started. ${detail}`)
 }
 const start=async()=>{
  if(!preview||!permission||busy)return
  const recordFormat=format,recordQuality=quality
  if(recordFormat==='mp4'&&preview.qualities?.length&&!preview.qualities.some(item=>item.value.replace(/p$/i,'')===recordQuality)){
   setNotice(`${recordQuality}p is not listed for this video. Select one of: ${preview.qualities.map(item=>item.value+'p').join(', ')}.`);return
  }
  if(recordFormat==='mp3'&&mp3Bitrate!==320&&(!(preview.duration>0)||preview.duration>300)){
   setNotice('Local bitrate encoding supports clips up to five minutes. Select 320 kbps for the server file.');return
  }
  running.current?.abort();const controller=new AbortController();running.current=controller
  setNotice('');setCompleted(null);setJob(null);setBusy(`Starting ${recordFormat.toUpperCase()}...`)
  try{
   // Exactly the selected quality; never silently create a lower-quality job.
   const created=await mediaRequest<MediaJob>('convert',{url:preview.url,format:recordFormat,...(recordFormat==='mp4'?{quality:recordQuality}:{})},controller.signal)
   if(created.state==='failed')throw new MediaServiceError(created.error||'Conversion rejected.',created.errorCode||'JOB_FAILED')
   if(!created.id)throw new Error('The API did not return a job ID.')
   const record:SavedJob={id:created.id,title:preview.title,format:recordFormat,quality:recordFormat==='mp3'?'320':recordQuality,mp3Bitrate:recordFormat==='mp3'?mp3Bitrate:undefined,duration:preview.duration}
   save(record);setJob(created);await finish(record,controller)
  }catch(e){if(!aborted(e)){setNotice(explainMediaError(e));setCompleted(null);if(e instanceof MediaServiceError&&['JOB_FAILED','SOURCE_FORBIDDEN','SERVICE_AUTH'].includes(e.code))dropSaved()}}
  finally{if(running.current===controller){running.current=null;setBusy('')}}
 }
 const continueRecord=async(record:SavedJob)=>{
  if(busy)return
  const controller=new AbortController();running.current=controller;setNotice('')
  try{await finish(record,controller)}catch(e){if(!aborted(e))setNotice(explainMediaError(e))}
  finally{if(running.current===controller){running.current=null;setBusy('')}}
 }
 const resume=()=>{if(saved)void continueRecord(saved)}
 const downloadAgain=()=>{if(completed)void continueRecord(completed)}
 const stop=()=>{running.current?.abort();running.current=null;setBusy('');setNotice('Stopped checking. The remote job may continue; Resume checks the same job.')}
 const formats=[{id:'mp3' as const,title:'MP3 Audio',copy:'Choose a bitrate for short clips',glyph:'\u266b'},{id:'mp4' as const,title:'MP4 Video',copy:'Download at the selected resolution',glyph:'\u25b6'}]
 return <SiteShell><Seo title="YouTube to MP3 & MP4 Downloader | AUDIXO" description="Analyze an authorized YouTube video and request an MP3 audio file at a 320 kbps encoding target, or select an API-supported MP4 video resolution." path="/tools/youtube-to-mp3"/>
  <main className="page-shell ax39-converter">
   <div className="ax39-converter-hero"><div><div className="ax25-kicker"><i/> AUDIXO / MEDIA CONVERTER</div><h1>One link.<br/><em>Sound or video.</em></h1><p>Choose MP3 audio or MP4 video in one clear workspace. Analyze the original title, select a supported format and let your conversion server handle the rest.</p><div className={`ax39-server ${health?.ready?'ready':health?'not-ready':'loading'}`}><i/>{health?.ready?'Conversion API connected':health?'Connection requires attention':'Checking API connection'}{health?.ready&&health.maxConcurrent?` · ${health.maxConcurrent} concurrent jobs`:''}</div></div><div className="ax39-hero-art" aria-hidden="true"><span className="ax39-art-orbit a"/><span className="ax39-art-orbit b"/><div className="ax39-art-disc"><span>♫</span></div><div className="ax39-art-chip one">MP3 · 320 kbps</div><div className="ax39-art-chip two">MP4 · source resolution</div></div></div>
   <section className="ax39-converter-panel" aria-label="YouTube media converter">
    <div className="ax39-converter-top"><div><small>FORMAT</small><strong>What would you like to save?</strong></div><span>01 / 03</span></div>
    <div className="ax39-format-toggle" role="group" aria-label="Output file format">{formats.map(item=><button type="button" key={item.id} className={format===item.id?'active':''} aria-pressed={format===item.id} disabled={!!busy} onClick={()=>{setFormat(item.id);setNotice('');setCompleted(null);setJob(null)}}><span className="ax39-format-icon">{item.glyph}</span><span><strong>{item.title}</strong><small>{item.copy}</small></span><span className="ax46-format-switch" aria-hidden="true"><i/></span></button>)}</div>
    <div className="ax39-steps">
     <div className="ax39-step"><span className="ax39-step-num">01</span><div className="ax39-step-content"><h2>Paste your YouTube link</h2><p>A clean source preview appears after Analyze. Use × to clear the field instantly.</p><div className="ax39-urlbar"><div className="ax42-url-input"><span aria-hidden="true">↗</span><input aria-label="YouTube video URL" type="url" placeholder="Paste a YouTube video link…" value={url} disabled={!!busy} onChange={e=>updateUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!busy&&url.trim())void analyze()}}/>{url&&<button className="ax39-clear" aria-label="Clear YouTube URL" title="Clear URL" type="button" onClick={clear}>×</button>}</div><button type="button" disabled={!!busy||!url.trim()} className="ax39-analyze" onClick={analyze}>{busy.startsWith('Analyzing')?'Checking…':'Analyze'} <span>↗</span></button></div>
       {preview&&<div className="ax39-preview"><img src={preview.thumbnail} alt="Video thumbnail" loading="lazy" referrerPolicy="no-referrer"/><div><small>VIDEO IDENTIFIED · {shortTime(preview.duration)}</small><strong title={preview.title}>{preview.title}</strong><span>{preview.author||'YouTube source'}</span></div><b>✓</b></div>}
      </div></div>
     <div className="ax39-step"><span className="ax39-step-num">02</span><div className="ax39-step-content"><h2>{format==='mp3'?'Choose audio quality':'Set video resolution'}</h2>{format==='mp3'?<Mp3QualityRail bitrate={mp3Bitrate} duration={preview?.duration||0} disabled={!!busy} onChange={setMp3Bitrate}/>:<VideoQualityRail quality={quality} onChange={setQuality} available={preview?.qualities||[]} analyzed={!!preview} disabled={!!busy}/>}
      </div></div>
     <div className="ax39-step"><span className="ax39-step-num">03</span><div className="ax39-step-content"><h2>Prepare & download</h2><p>File name keeps the analyzed video title, followed by <b>(Audixo {format.toUpperCase()})</b>.</p><label className="ax39-permission"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/><span>I own this video or have permission to download or transform it.</span></label><button type="button" className="ax39-create ax42-download" disabled={!preview||!permission||!!busy||(format==='mp4'&&!quality)} onClick={start}><span>{busy||`Download ${format.toUpperCase()}${format==='mp4'&&quality?` · ${quality}p`:format==='mp3'?` · ${effectiveMp3Bitrate} kbps${effectiveMp3Bitrate!==mp3Bitrate?' server':''}`:''}`}</span><b>↓</b></button>
       {busy&&!busy.startsWith('Analyzing')&&<div className="ax39-progress" role="status"><div><strong>{busy}</strong><button onClick={stop}>Stop checking</button></div><span><i style={{width:`${Math.min(99,Math.max(0,Number(job?.progress)||0))}%`}}/></span><small>Conversion continues on the remote server. Long videos depend on backend capacity and serverless download limits.</small></div>}
       {saved&&!busy&&<button className="ax39-resume" onClick={resume}>↻ Resume earlier {saved.format.toUpperCase()} job</button>}
       {completed&&!busy&&<button className="ax39-resume" onClick={downloadAgain}>Download again</button>}
      </div></div>
    </div>
    <div className="ax39-converter-bottom"><span>Original video title</span><span>MP3 or MP4</span><span>Download progress</span></div>
   </section>
   {health&&!health.ready&&<div role="status" className="ax39-alert">{health.message||'Check the conversion server connection and service credentials.'}</div>}
   {notice&&<div role="status" className="ax39-alert" data-type={/Download started/i.test(notice)?'success':'info'}>{notice}</div>}
  </main>
 </SiteShell>
}
