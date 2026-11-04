import {useEffect,useRef,useState} from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import {VideoQualityRail,Mp3QualityRail,highestConfirmedQuality,confirmedVideoOptions,type Mp3Bitrate} from '../components/QualityRail'
import {mediaRequest,youtubeId,explainMediaError,MediaServiceError,outputName,type MediaJob,type MediaPreview,type MediaKind} from '../services/media'
import {inspectLocalFile,downloadOriginalMp4,encodeMp3Local,triggerBlobDownload,type LocalInfo,type Progress} from '../services/browserMedia'

function shortTime(seconds:number){if(!Number.isFinite(seconds)||seconds<=0)return 'Duration unavailable';const hours=Math.floor(seconds/3600),mins=Math.floor(seconds/60)%60,secs=Math.floor(seconds%60);return hours?`${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${mins}:${String(secs).padStart(2,'0')}`}
const aborted=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError'
const STATUS_START='Vercel-native · direct MP3 & MP4 conversion'

export default function YouTubeConverter(){
 const [url,setUrl]=useState(''),[preview,setPreview]=useState<MediaPreview|null>(null),[workerState,setWorkerState]=useState<'checking'|'online'|'offline'>('checking')
 const [local,setLocal]=useState<LocalInfo|null>(null)
 const [format,setFormat]=useState<MediaKind>('mp3'),[quality,setQuality]=useState(''),[mp3Bitrate,setMp3Bitrate]=useState<Mp3Bitrate>(320)
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState<Progress|null>(null),[notice,setNotice]=useState(''),[completed,setCompleted]=useState(false),[downloadHref,setDownloadHref]=useState('')
 const picker=useRef<HTMLInputElement|null>(null),running=useRef<AbortController|null>(null),version=useRef(0)
 const downloadFrame=useRef<HTMLIFrameElement|null>(null)
 const clearDownloadFrame=()=>{downloadFrame.current?.remove();downloadFrame.current=null}
 const downloadOnThisPage=(href:string)=>{
  clearDownloadFrame()
  // The media endpoint sends Content-Disposition: attachment. Keep its response
  // inside an invisible same-origin frame so the visible AUDIXO page never navigates.
  const frame=document.createElement('iframe')
  frame.title='AUDIXO background download'
  frame.setAttribute('aria-hidden','true')
  frame.tabIndex=-1
  frame.style.display='none'
  frame.referrerPolicy='no-referrer'
  frame.addEventListener('load',()=>{
   if(downloadFrame.current!==frame)return
   // Server-side conversion errors are JSON, not media files. Surface them on
   // this page instead of displaying an error in a new tab.
   try{
    const body=frame.contentDocument?.body?.textContent?.trim()||''
    if(!body.startsWith('{'))return
    const data=JSON.parse(body) as {error?:unknown}
    if(typeof data.error==='string'&&data.error){
     setCompleted(false);setNotice(data.error)
    }
   }catch{/* A successful attachment usually does not fire frame load. */}
  })
  frame.addEventListener('error',()=>{
   if(downloadFrame.current===frame){setCompleted(false);setNotice('The download could not start. Please retry on this page.')}
  })
  document.body.appendChild(frame)
  downloadFrame.current=frame
  frame.src=href
 }
 useEffect(()=>{const controller=new AbortController();void mediaRequest<{ready:boolean}>('health',{},controller.signal).then(v=>setWorkerState(v.ready?'online':'offline')).catch(()=>{if(!controller.signal.aborted)setWorkerState('offline')});return()=>{controller.abort();running.current?.abort();downloadFrame.current?.remove();downloadFrame.current=null}},[])
 const available=local?local.qualities:(preview?.qualities||[])
 const active=!!(local||preview)
 const selectedQuality=confirmedVideoOptions(available).some(item=>item.value===quality)
 const audioReady=local?.audioAvailable||preview?.audioAvailable||false
 const mp4Ready=!!selectedQuality
 const canDownload=active&&(format==='mp3'?audioReady:mp4Ready)
 const target=local?.title||preview?.title||''
 const clear=()=>{version.current++;running.current?.abort();clearDownloadFrame();setUrl('');setPreview(null);setLocal(null);setQuality('');setBusy(false);setNotice('');setProgress(null);setCompleted(false);setDownloadHref('');if(picker.current)picker.current.value=''}
 const updateUrl=(value:string)=>{clearDownloadFrame();version.current++;setUrl(value);setPreview(null);setLocal(null);setQuality('');setNotice('');setProgress(null);setCompleted(false);setDownloadHref('');if(picker.current)picker.current.value=''}
 const analyze=async()=>{
  if(busy)return
  if(!youtubeId(url)){setNotice('Paste a valid HTTPS YouTube video link (watch, shorts, live or youtu.be).');return}
  const op=++version.current,controller=new AbortController();running.current?.abort();running.current=controller
  setBusy(true);setProgress({stage:'Analyzing public YouTube metadata…'});setNotice('');setPreview(null);setLocal(null);setQuality('');setCompleted(false);setDownloadHref('')
  try{const info=await mediaRequest<MediaPreview>('meta',{url:url.trim()},controller.signal)
   if(op!==version.current||controller.signal.aborted)return
   setPreview(info);setQuality(highestConfirmedQuality(info.qualities));setProgress(null)
   if(!info.audioAvailable&&!info.qualities?.length)setNotice('No usable video or audio formats were reported by YouTube.')
  }catch(e){if(op===version.current&&!aborted(e))setNotice(explainMediaError(e))}
  finally{if(op===version.current){setBusy(false);setProgress(null)}if(running.current===controller)running.current=null}
 }
 const chooseLocal=async(file?:File)=>{
  if(!file||busy)return
  const op=++version.current,controller=new AbortController();running.current?.abort();running.current=controller
  setBusy(true);setProgress({stage:'Reading local media metadata…'});setNotice('');setPreview(null);setLocal(null);setUrl('');setQuality('');setCompleted(false);setDownloadHref('')
  try{const info=await inspectLocalFile(file,controller.signal)
   if(op!==version.current)return
   setLocal(info);setQuality(highestConfirmedQuality(info.qualities));setProgress(null)
   if(!info.qualities.length)setFormat('mp3')
  }catch(e){if(op===version.current&&!aborted(e))setNotice(explainMediaError(e))}
  finally{if(op===version.current){setBusy(false);setProgress(null)}if(running.current===controller)running.current=null}
 }
 const start=async()=>{
  if(busy||!canDownload)return
  const controller=new AbortController();running.current?.abort();running.current=controller
  // Pre-open within the user's click gesture, before the async token request.
  // No popups, new tabs or top-level navigation for remote downloads.
  setBusy(true);setCompleted(false);setDownloadHref('');setNotice('');setProgress({stage:local?'Preparing local download…':'Preparing secure download link…'})
  try{
   if(local){
    if(format==='mp4'){if(!selectedQuality||local.qualities[0]?.value!==quality)throw new MediaServiceError('Only the original, confirmed MP4 resolution can be saved; browser upscaling is not supported.','QUALITY_UNAVAILABLE')
     downloadOriginalMp4(local);setProgress({stage:'Local MP4 save requested',percent:100})
    }else{
     const mp3=await encodeMp3Local(local.file,mp3Bitrate,controller.signal,setProgress)
     if(controller.signal.aborted)return
     triggerBlobDownload(mp3,outputName(local.title,'mp3'))
     setProgress({stage:'MP3 save requested',percent:100})
    }
   }else if(preview){
    const result=await mediaRequest<MediaJob>('start',{url:preview.url,format,quality:format==='mp4'?quality:undefined,bitrate:format==='mp3'?mp3Bitrate:undefined},controller.signal)
    if(!result.url||!result.url.startsWith('/api/media?action=file&token='))throw new MediaServiceError('This site did not provide a valid download link.','BAD_DOWNLOAD_LINK')
    setDownloadHref(result.url)
    downloadOnThisPage(result.url)
    setProgress({stage:'AUDIXO is preparing your browser download…'})
   }

   if(!controller.signal.aborted){setCompleted(true);setNotice(local?`${format.toUpperCase()} export requested. Check your browser downloads.`:'Download requested. Stay on AUDIXO while Vercel prepares your file; it will save through your browser without opening another page.')}
  }catch(e){if(!aborted(e)){setCompleted(false);setNotice(explainMediaError(e))}}
  finally{if(running.current===controller)running.current=null;setBusy(false);setProgress(null)}
 }
 const cancel=()=>{clearDownloadFrame();running.current?.abort();running.current=null;setBusy(false);setProgress(null);setNotice('The current browser operation was cancelled. The pending in-page download will also be stopped.')}
 const formats=[{id:'mp3' as const,title:'MP3 Audio',copy:'Convert with FFmpeg at your chosen bitrate',glyph:'♫'},{id:'mp4' as const,title:'MP4 Video',copy:'Download source-verified video resolution',glyph:'▶'}]
 const cta=format==='mp3'?`Download MP3 · ${mp3Bitrate} kbps`:`Download MP4${quality?` · ${quality}p`:''}`
 const cannotDownload=active&&!canDownload
 return <SiteShell><Seo title="YouTube to MP3 & MP4 | AUDIXO" description="Choose real available YouTube video resolutions or audio bitrate. YouTube extraction and media conversion run on this Vercel project; local files stay in the browser." path="/tools/youtube-to-mp3"/>
 <main className="page-shell ax39-converter ax59-converter">
  <div className="ax39-converter-hero"><div><div className="ax25-kicker"><i/> AUDIXO / MEDIA CONVERTER</div><h1>One link.<br/><em>Sound or video.</em></h1><p>Analyze a YouTube link, choose an available quality, then download MP3 or MP4. The downloader runs on this Vercel deployment. No additional API server or worker is needed.</p><div className={`ax39-server ${workerState==='offline'?'':'ready'}`}><i/>{workerState==='offline'?'Media function unavailable · local files still available':workerState==='checking'?'Checking Vercel media function…':STATUS_START}</div></div><div className="ax39-hero-art" aria-hidden="true"><span className="ax39-art-orbit a"/><span className="ax39-art-orbit b"/><div className="ax39-art-disc"><span>♫</span></div><div className="ax39-art-chip one">MP3 · server converted</div><div className="ax39-art-chip two">MP4 · source quality</div></div></div>
  <section className="ax39-converter-panel" aria-label="AUDIXO media converter">
   <div className="ax39-converter-top"><div><small>FORMAT</small><strong>What would you like to save?</strong></div><span>01 / 03</span></div>
   <div className="ax39-format-toggle" role="group" aria-label="Output format">{formats.map(item=><button type="button" key={item.id} className={format===item.id?'active':''} aria-pressed={format===item.id} disabled={busy} onClick={()=>{setFormat(item.id);setNotice('');setCompleted(false);if(item.id==='mp4')setQuality(highestConfirmedQuality(available))}}><span className="ax39-format-icon">{item.glyph}</span><span><strong>{item.title}</strong><small>{item.copy}</small></span><span className="ax46-format-switch" aria-hidden="true"><i/></span></button>)}</div>
   <div className="ax39-steps">
    <div className="ax39-step"><span className="ax39-step-num">01</span><div className="ax39-step-content"><h2>Paste your YouTube link</h2><p>This Vercel site checks YouTube metadata and reports available video resolutions.</p>
     <div className="ax39-urlbar"><div className="ax42-url-input"><span aria-hidden="true">↗</span><input aria-label="YouTube video URL" type="url" inputMode="url" placeholder="Paste a YouTube video link…" value={url} disabled={busy} onChange={e=>updateUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!busy)void analyze()}}/>{url&&<button className="ax39-clear" aria-label="Clear URL" title="Clear URL" type="button" onClick={clear}>×</button>}</div><button type="button" disabled={busy||!url.trim()} className="ax39-analyze" onClick={()=>void analyze()}>{busy&&progress?.stage.includes('Analyzing')?'Checking…':'Analyze'} <span>↗</span></button></div>
     <div className="ax59-local-row"><span>Or work entirely offline with media you own</span><input ref={picker} type="file" accept="audio/*,video/mp4,video/webm,.m4a,.wav,.flac,.mp3,.mp4,.webm" aria-label="Choose a local audio or MP4 video" hidden onChange={e=>void chooseLocal(e.currentTarget.files?.[0])}/><button type="button" disabled={busy} onClick={()=>picker.current?.click()}>+ Choose local file</button></div>
     {active&&<div className="ax39-preview">{preview?.thumbnail?<img src={preview.thumbnail} alt="Video thumbnail" loading="lazy" referrerPolicy="no-referrer"/>:<div className="ax59-local-icon" aria-hidden="true">♫</div>}<div><small>{local?'LOCAL FILE':'YOUTUBE / VERCEL'} · {shortTime(local?.duration||preview?.duration||0)}</small><strong title={target}>{target}</strong><span>{local?'Stored on this device':preview?.author||'Public YouTube video'}</span></div><b>✓</b></div>}
    </div></div>
    <div className="ax39-step"><span className="ax39-step-num">02</span><div className="ax39-step-content"><h2>{format==='mp3'?'Choose audio quality':'Choose video resolution'}</h2>{format==='mp3'?<Mp3QualityRail bitrate={mp3Bitrate} duration={local?.duration||preview?.duration||0} disabled={busy} onChange={setMp3Bitrate}/>:<VideoQualityRail quality={quality} onChange={setQuality} available={available} analyzed={active} disabled={busy}/>}</div></div>
    <div className="ax39-step"><span className="ax39-step-num">03</span><div className="ax39-step-content"><h2>Prepare &amp; download</h2><p>Remote downloads use the original YouTube title. Local exports add <b>(Audixo {format.toUpperCase()})</b>.</p><p className="ax52-usage-note">Only download content you own or are authorized to save. YouTube sometimes requires a valid admin-managed cookie session.</p>
     <button type="button" className="ax39-create ax42-download" disabled={!canDownload||busy} onClick={()=>void start()}><span>{busy?'Preparing download…':cta}</span><b>↓</b></button>
     {cannotDownload&&<div className="ax59-limitation" role="status">{format==='mp3'?'No audio stream is available. Try a different video or a local file.':'No source resolution is available; try another video or a local MP4.'}</div>}
     {busy&&progress&&<div className="ax39-progress ax59-progress" role="status"><div><strong>{progress.stage}</strong><button type="button" onClick={cancel}>Cancel</button></div>{typeof progress.percent==='number'?<progress max="100" value={progress.percent} aria-label="Media processing progress"/>:<span className="ax59-progress-indeterminate" aria-hidden="true"/>}<small>{typeof progress.percent==='number'?`${progress.percent}% · `:''}{typeof progress.bytes==='number'?`${(progress.bytes/1048576).toFixed(1)} MB processed · `:''}Direct media preparation on Vercel.</small></div>}
     {completed&&!busy&&<div className="ax59-complete" role="status">✓ Download requested in this browser. AUDIXO stays open.</div>}
     {downloadHref&&!busy&&<button type="button" className="ax39-analyze" onClick={()=>{setCompleted(true);setNotice('Retrying the download on this page. Check your browser downloads.');downloadOnThisPage(downloadHref)}} aria-label="Retry the download without leaving AUDIXO">↓ Retry download here</button>}
    </div></div>
   </div>
   <div className="ax39-converter-bottom"><span>Original source title</span><span>MP3 / MP4</span><span>Real quality · Vercel conversion</span></div>
  </section>
  {notice&&<div className="ax39-alert ax59-alert" role="status" data-type={completed?'success':'info'}>{notice}</div>}
  <p className="ax59-source-note">YouTube sessions can expire or be rejected by source-side anti-bot checks. Cookie management is available only to administrators. Audio transcoding cannot improve the source recording quality.</p>
 </main></SiteShell>
}
