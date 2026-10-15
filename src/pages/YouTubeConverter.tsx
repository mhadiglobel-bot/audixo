import {useEffect,useRef,useState} from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import {VideoQualityRail,Mp3QualityRail,type Mp3Bitrate} from '../components/QualityRail'
import {mediaUiConfig} from '../config/site'
import {downloadFile,downloadMp3AtBitrate,mediaRequest,waitForJob,type MediaPreview,type MediaJob,type MediaKind} from '../services/media'

type Health={ready:boolean;authenticated?:boolean;maxConcurrent?:number;message?:string}
type SavedJob={id:string;title:string;format:MediaKind;quality:string;mp3Bitrate?:Mp3Bitrate}
const KEY='audixo-conversion-job-v50'
const MP4_DESC=['2160','1440','1080','720','480','360','240'] as const
const shortTime=(seconds:number)=>!Number.isFinite(seconds)||seconds<=0?'Duration unavailable':[Math.floor(seconds/3600),Math.floor(seconds/60)%60,Math.floor(seconds%60)].filter((_,i)=>i>0||seconds>=3600).map((v,i)=>i===0?String(v):String(v).padStart(2,'0')).join(':')
function savedJob():SavedJob|null{try{const value=JSON.parse(sessionStorage.getItem(KEY)||'null');return value&&/^[\w-]{1,128}$/.test(value.id)&&['mp3','mp4'].includes(value.format)?value:null}catch{return null}}
const normalizeMp4Quality=(value:unknown)=>String(value??'').trim().replace(/p$/i,'')
const supportedQualities=(qualities:{value:string;label:string}[]=[])=>new Set(qualities.map(item=>normalizeMp4Quality(item.value)).filter(Boolean))
function chooseDefaultMp4Quality(qualities:{value:string;label:string}[]=[]){
 const supported=supportedQualities(qualities)
 const preferred=Array.from(new Set([mediaUiConfig.defaultMp4Quality,...mediaUiConfig.mp4Fallbacks,'1080','720','480','360','240','1440','2160']))
 if(supported.size)return preferred.find(item=>supported.has(item))||Array.from(supported).sort((a,b)=>Number(b)-Number(a))[0]||mediaUiConfig.defaultMp4Quality
 return mediaUiConfig.defaultMp4Quality
}
function mp4AttemptOrder(selected:string,qualities:{value:string;label:string}[]=[]){
 const supported=supportedQualities(qualities)
 const requested=normalizeMp4Quality(selected)||mediaUiConfig.defaultMp4Quality
 const start=Math.max(0,MP4_DESC.indexOf(requested as typeof MP4_DESC[number]))
 const lowerOrEqual=MP4_DESC.slice(start)
 const configured=mediaUiConfig.mp4Fallbacks.filter(item=>!Number.isNaN(Number(item))&&Number(item)<=Number(requested))
 const planned=Array.from(new Set([requested,...configured,...lowerOrEqual]))
 const filtered=supported.size?planned.filter(item=>supported.has(item)):planned
 return filtered.length?filtered:[requested]
}
const isRetryableMp4Failure=(error:unknown)=>/403|forbidden|unable to download video data|video data|this resolution may not be available|source rejects|returned audio|not available/i.test(error instanceof Error?error.message:String(error))
const toNotice=(error:unknown,format:MediaKind)=>{
 const message=error instanceof Error?error.message:'Conversion failed.'
 if(format==='mp4'&&/403|forbidden|unable to download video data|video data/i.test(message))return 'Conversion failed because the remote API could not fetch the YouTube video source (HTTP 403 Forbidden). Check AUDIXO_YTDL_COOKIE / auth on the backend or let AUDIXO retry lower resolutions.'
 return message
}

export default function YouTubeConverter(){
 const [url,setUrl]=useState(''),[preview,setPreview]=useState<MediaPreview|null>(null)
 const [format,setFormat]=useState<MediaKind>('mp3'),[quality,setQuality]=useState(mediaUiConfig.defaultMp4Quality),[mp3Bitrate,setMp3Bitrate]=useState<Mp3Bitrate>(320)
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[job,setJob]=useState<MediaJob|null>(null)
 const [permission,setPermission]=useState(false),[health,setHealth]=useState<Health|null>(null)
 const [saved,setSaved]=useState<SavedJob|null>(savedJob)
 const change=useRef(0),running=useRef<AbortController|null>(null)
 const effectiveMp3Bitrate=mp3Bitrate===320||(preview?.duration||0)>300||!(preview?.duration)?320:mp3Bitrate

 useEffect(()=>{
  let alive=true
  mediaRequest<Health>('health').then(h=>{if(alive)setHealth(h)}).catch(e=>{if(alive)setHealth({ready:false,message:e instanceof Error?e.message:'API health check failed.'})})
  return()=>{alive=false;running.current?.abort()}
 },[])

 const clear=()=>{change.current++;running.current?.abort();running.current=null;setUrl('');setPreview(null);setQuality(mediaUiConfig.defaultMp4Quality);setBusy('');setNotice('');setJob(null)}
 const updateUrl=(value:string)=>{change.current++;setUrl(value);setPreview(null);setQuality(mediaUiConfig.defaultMp4Quality);setJob(null);setNotice('')}
 const analyze=async()=>{
  const v=++change.current
  setBusy('Analyzing video…');setNotice('');setPreview(null);setQuality(mediaUiConfig.defaultMp4Quality);setJob(null)
  try{
   const info=await mediaRequest<MediaPreview>('meta',{url:url.trim()})
   if(v!==change.current)return
   setPreview(info)
   setQuality(chooseDefaultMp4Quality(info.qualities||[]))
   setMp3Bitrate(320)
  }catch(e){if(v===change.current)setNotice(e instanceof Error?e.message:'Could not analyze video.')}
  finally{if(v===change.current)setBusy('')}
 }
 const save=(row:SavedJob)=>{setSaved(row);try{sessionStorage.setItem(KEY,JSON.stringify(row))}catch{}}
 const dropSaved=()=>{setSaved(null);try{sessionStorage.removeItem(KEY)}catch{}}
 const finish=async(record:SavedJob,controller:AbortController)=>{
  setBusy(`Preparing ${record.format.toUpperCase()}…`)
  const finished=await waitForJob(record.id,record.format,item=>{
   setJob(item)
   const percent=item.progress&&item.progress>0?` · ${Math.round(item.progress)}%`:''
   setBusy(item.state==='queued'?'Queued — waiting for the server…':`Processing ${record.format.toUpperCase()}${percent}…`)
  },controller.signal)
  setJob(finished)
  const file=finished.files?.[0]
  if(!file)throw Error('The API marked this job complete but returned no downloadable file.')
  if(record.format==='mp3'&&record.mp3Bitrate&&record.mp3Bitrate<320){
   setBusy(`Encoding ${record.mp3Bitrate} kbps MP3 on your device…`)
   await downloadMp3AtBitrate(file,record.title,record.mp3Bitrate)
  }else downloadFile(file,record.title,record.format)
  dropSaved()
  setNotice(`${record.format.toUpperCase()} download requested. ${record.format==='mp3'&&record.mp3Bitrate&&record.mp3Bitrate<320?`Re-encoded locally to ${record.mp3Bitrate} kbps.`:'Check the saved file for its actual encoding details.'}`)
 }

 const start=async()=>{
  if(!preview||!permission||busy||(format==='mp4'&&!quality))return
  running.current?.abort();const controller=new AbortController();running.current=controller
  setNotice('');setJob(null)
  try{
   if(format==='mp4'){
    const attempts=mp4AttemptOrder(quality,preview.qualities||[])
    let lastError:unknown=null
    for(let i=0;i<attempts.length;i++){
     const attemptQuality=attempts[i]
     const retry=i>0
     setBusy(retry?`Retrying MP4 at ${attemptQuality}p…`:`Starting MP4 ${attemptQuality}p job…`)
     if(retry){setNotice(`Selected MP4 quality could not be completed. Retrying automatically at ${attemptQuality}p…`);setQuality(attemptQuality)}
     try{
      const created=await mediaRequest<MediaJob>('convert',{url:preview.url,format:'mp4',quality:attemptQuality},controller.signal)
      if(!created.id)throw Error('API did not return a job ID.')
      if(created.state==='failed')throw Error(created.error||'The server rejected this conversion.')
      setJob(created)
      const record:SavedJob={id:created.id,title:preview.title,format:'mp4',quality:attemptQuality}
      save(record)
      await finish(record,controller)
      if(retry)setNotice(`MP4 download requested after automatic fallback to ${attemptQuality}p. Check the saved file for the actual encoding details.`)
      return
     }catch(error){
      dropSaved();setJob(null);lastError=error
      if(i<attempts.length-1&&isRetryableMp4Failure(error))continue
      throw error
     }
    }
    if(lastError)throw lastError
    return
   }

   setBusy(`Starting ${format.toUpperCase()} job…`)
   const created=await mediaRequest<MediaJob>('convert',{url:preview.url,format},controller.signal)
   if(!created.id)throw Error('API did not return a job ID.')
   if(created.state==='failed')throw Error(created.error||'The server rejected this conversion.')
   setJob(created)
   const record:SavedJob={id:created.id,title:preview.title,format,quality:'320',mp3Bitrate:effectiveMp3Bitrate}
   save(record)
   await finish(record,controller)
  }catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setNotice(toNotice(e,format))}
  finally{if(running.current===controller){running.current=null;setBusy('')}}
 }

 const resume=async()=>{
  if(!saved||busy)return
  running.current?.abort();const controller=new AbortController();running.current=controller
  setNotice('')
  try{await finish(saved,controller)}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setNotice(toNotice(e,saved.format))}
  finally{if(running.current===controller){running.current=null;setBusy('')}}
 }

 const stop=()=>{running.current?.abort();running.current=null;setBusy('');setNotice('Stopped checking progress. Your remote job may continue; use Resume previous job to check it later.')}
 const formats=[{id:'mp3' as const,title:'MP3 Audio',copy:'320 kbps default · optional local re-encode',glyph:'♫'},{id:'mp4' as const,title:'MP4 Video',copy:'Auto-fallback resolution support',glyph:'▶'}]
 return <SiteShell><Seo title="YouTube to MP3 & MP4 Downloader | AUDIXO" description="Analyze an authorized YouTube video and request an MP3 audio file at a 320 kbps encoding target, or select an API-supported MP4 video resolution." path="/tools/youtube-to-mp3"/>
  <main className="page-shell ax39-converter">
   <div className="ax39-converter-hero"><div><div className="ax25-kicker"><i/> AUDIXO / MEDIA CONVERTER</div><h1>One link.<br/><em>Sound or video.</em></h1><p>Choose MP3 audio or MP4 video in one clear workspace. Analyze the original title, select a supported format and let your conversion server handle the rest.</p><div className={`ax39-server ${health?.ready?'ready':health?'not-ready':'loading'}`}><i/>{health?.ready?'Conversion API connected':health?'Connection requires attention':'Checking API connection'}{health?.ready&&health.maxConcurrent?` · ${health.maxConcurrent} concurrent jobs`:''}</div></div><div className="ax39-hero-art" aria-hidden="true"><span className="ax39-art-orbit a"/><span className="ax39-art-orbit b"/><div className="ax39-art-disc"><span>♫</span></div><div className="ax39-art-chip one">MP3 · 320 kbps</div><div className="ax39-art-chip two">MP4 · smart fallback</div></div></div>
   <section className="ax39-converter-panel" aria-label="YouTube media converter">
    <div className="ax39-converter-top"><div><small>FORMAT</small><strong>What would you like to save?</strong></div><span>01 / 03</span></div>
    <div className="ax39-format-toggle" role="group" aria-label="Output file format">{formats.map(item=><button type="button" key={item.id} className={format===item.id?'active':''} aria-pressed={format===item.id} disabled={!!busy} onClick={()=>{setFormat(item.id);setNotice('')}}><span className="ax39-format-icon">{item.glyph}</span><span><strong>{item.title}</strong><small>{item.copy}</small></span><span className="ax46-format-switch" aria-hidden="true"><i/></span></button>)}</div>
    <div className="ax39-steps">
     <div className="ax39-step"><span className="ax39-step-num">01</span><div className="ax39-step-content"><h2>Paste your YouTube link</h2><p>A clean source preview appears after Analyze. Use × to clear the field instantly.</p><div className="ax39-urlbar"><div className="ax42-url-input"><span aria-hidden="true">↗</span><input aria-label="YouTube video URL" type="url" placeholder="Paste a YouTube video link…" value={url} disabled={!!busy} onChange={e=>updateUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!busy&&url.trim())void analyze()}}/>{url&&<button className="ax39-clear" aria-label="Clear YouTube URL" title="Clear URL" type="button" onClick={clear}>×</button>}</div><button type="button" disabled={!!busy||!url.trim()} className="ax39-analyze" onClick={analyze}>{busy.startsWith('Analyzing')?'Checking…':'Analyze'} <span>↗</span></button></div>
       {preview&&<div className="ax39-preview"><img src={preview.thumbnail} alt="Video thumbnail" loading="lazy" referrerPolicy="no-referrer"/><div><small>VIDEO IDENTIFIED · {shortTime(preview.duration)}</small><strong title={preview.title}>{preview.title}</strong><span>{preview.author||'YouTube source'}</span></div><b>✓</b></div>}
      </div></div>
     <div className="ax39-step"><span className="ax39-step-num">02</span><div className="ax39-step-content"><h2>{format==='mp3'?'Choose audio quality':'Set video resolution'}</h2>{format==='mp3'?<Mp3QualityRail bitrate={mp3Bitrate} duration={preview?.duration||0} disabled={!!busy} onChange={setMp3Bitrate}/>:<VideoQualityRail quality={quality} onChange={setQuality} available={preview?.qualities||[]} analyzed={!!preview} disabled={!!busy}/>}
      </div></div>
     <div className="ax39-step"><span className="ax39-step-num">03</span><div className="ax39-step-content"><h2>Prepare & download</h2><p>File name keeps the analyzed video title, followed by <b>(Audixo {format.toUpperCase()})</b>.</p><label className="ax39-permission"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/><span>I own this video or have permission to download or transform it.</span></label><button type="button" className="ax39-create ax42-download" disabled={!preview||!permission||!!busy||(format==='mp4'&&!quality)} onClick={start}><span>{busy||`Download ${format.toUpperCase()}${format==='mp4'&&quality?` · ${quality}p`:format==='mp3'?` · ${effectiveMp3Bitrate} kbps${effectiveMp3Bitrate!==mp3Bitrate?' server':''}`:''}`}</span><b>↓</b></button>
       {busy&&!busy.startsWith('Analyzing')&&<div className="ax39-progress" role="status"><div><strong>{busy}</strong><button onClick={stop}>Stop checking</button></div><span><i style={{width:`${Math.min(99,Math.max(3,Number(job?.progress)||3))}%`}}/></span><small>Conversion continues on the remote server. Long videos depend on backend capacity and serverless download limits.</small></div>}
       {saved&&!busy&&<button className="ax39-resume" onClick={resume}>↻ Resume earlier {saved.format.toUpperCase()} job</button>}
       {job?.files?.[0]&&!busy&&<button className="ax39-resume" onClick={()=>{if((job.format||format)==='mp3'&&mp3Bitrate<320){setBusy(`Encoding ${mp3Bitrate} kbps MP3…`);void downloadMp3AtBitrate(job.files![0],preview?.title||saved?.title||job.title||'YouTube video',mp3Bitrate).catch(e=>setNotice(String(e))).finally(()=>setBusy(''))}else downloadFile(job.files![0],preview?.title||saved?.title||job.title||'YouTube video',job.format||format)}}>↓ Download again</button>}
      </div></div>
    </div>
    <div className="ax39-converter-bottom"><span>Original video title</span><span>MP3 or MP4</span><span>Download progress</span></div>
   </section>
   {health&&!health.ready&&<div role="status" className="ax39-alert">{health.message||'API connection is unavailable. Check your Vercel environment variables, AUDIXO_YTDL_COOKIE and API server authentication.'}</div>}
   {notice&&<div role="status" className="ax39-alert" data-type={/download requested|automatic fallback|Re-encoded locally/i.test(notice)?'success':'info'}>{notice}</div>}
  </main>
 </SiteShell>
}
