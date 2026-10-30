import {useEffect,useRef,useState} from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import {VideoQualityRail,Mp3QualityRail,highestConfirmedQuality,confirmedVideoOptions,type Mp3Bitrate} from '../components/QualityRail'
import {mediaRequest,youtubeId,explainMediaError,MediaServiceError,outputName,type MediaPreview,type MediaKind,type DirectStream} from '../services/media'
import {inspectLocalFile,downloadOriginalMp4,readDirectSource,encodeMp3Local,triggerBlobDownload,type LocalInfo,type Progress} from '../services/browserMedia'

function shortTime(seconds:number){if(!Number.isFinite(seconds)||seconds<=0)return 'Duration unavailable';const hours=Math.floor(seconds/3600),mins=Math.floor(seconds/60)%60,secs=Math.floor(seconds%60);return hours?`${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${mins}:${String(secs).padStart(2,'0')}`}
const aborted=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError'
const STATUS_START='Browser-first · no external conversion worker'

export default function YouTubeConverter(){
 const [url,setUrl]=useState(''),[preview,setPreview]=useState<MediaPreview|null>(null)
 const [local,setLocal]=useState<LocalInfo|null>(null)
 const [format,setFormat]=useState<MediaKind>('mp3'),[quality,setQuality]=useState(''),[mp3Bitrate,setMp3Bitrate]=useState<Mp3Bitrate>(320)
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState<Progress|null>(null),[notice,setNotice]=useState(''),[completed,setCompleted]=useState(false)
 const picker=useRef<HTMLInputElement|null>(null),running=useRef<AbortController|null>(null),version=useRef(0)
 useEffect(()=>()=>{running.current?.abort()},[])
 const available=local?local.qualities:(preview?.qualities||[])
 const active=!!(local||preview)
 const selectedQuality=confirmedVideoOptions(available).some(item=>item.value===quality)
 const audioReady=local?.audioAvailable||preview?.audioAvailable||false
 const mp4Ready=!!selectedQuality
 const canDownload=active&&(format==='mp3'?audioReady:mp4Ready)
 const target=local?.title||preview?.title||''
 const clear=()=>{version.current++;running.current?.abort();setUrl('');setPreview(null);setLocal(null);setQuality('');setBusy(false);setNotice('');setProgress(null);setCompleted(false);if(picker.current)picker.current.value=''}
 const updateUrl=(value:string)=>{version.current++;setUrl(value);setPreview(null);setLocal(null);setQuality('');setNotice('');setProgress(null);setCompleted(false);if(picker.current)picker.current.value=''}
 const analyze=async()=>{
  if(busy)return
  if(!youtubeId(url)){setNotice('Paste a valid HTTPS YouTube video link (watch, shorts, live or youtu.be).');return}
  const op=++version.current,controller=new AbortController();running.current?.abort();running.current=controller
  setBusy(true);setProgress({stage:'Analyzing public YouTube metadata…'});setNotice('');setPreview(null);setLocal(null);setQuality('');setCompleted(false)
  try{const info=await mediaRequest<MediaPreview>('meta',{url:url.trim()},controller.signal)
   if(op!==version.current||controller.signal.aborted)return
   setPreview(info);setQuality(highestConfirmedQuality(info.qualities));setProgress(null)
   if(!info.audioAvailable&&!info.qualities?.length)setNotice('Title identified, but no browser-accessible MP3/MP4 source was confirmed. YouTube can restrict cross-origin downloads. You can use a local file instead.')
  }catch(e){if(op===version.current&&!aborted(e))setNotice(explainMediaError(e))}
  finally{if(op===version.current){setBusy(false);setProgress(null)}if(running.current===controller)running.current=null}
 }
 const chooseLocal=async(file?:File)=>{
  if(!file||busy)return
  const op=++version.current,controller=new AbortController();running.current?.abort();running.current=controller
  setBusy(true);setProgress({stage:'Reading local media metadata…'});setNotice('');setPreview(null);setLocal(null);setUrl('');setQuality('');setCompleted(false)
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
  setBusy(true);setCompleted(false);setNotice('');setProgress({stage:'Preparing browser-only download…'})
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
    let stream:DirectStream|undefined
    if(format==='mp4')stream=preview.streams.find(s=>s.kind==='mp4'&&s.quality===quality)
    else stream=preview.streams.filter(s=>s.kind==='audio'||s.kind==='mp4').sort((a,b)=>((a.mimeType==='audio/mp4'?3:a.kind==='audio'?2:1)-(b.mimeType==='audio/mp4'?3:b.kind==='audio'?2:1))||((b.bitrate||0)-(a.bitrate||0)))[0]
    if(!stream)throw new MediaServiceError('No browser-accessible source format was confirmed for this choice.','NO_BROWSER_STREAM')
    const filename=outputName(preview.title,format)
    const bytes=await readDirectSource(stream,format,controller.signal,setProgress,filename)
    if(controller.signal.aborted)return
    if(format==='mp4'){if(bytes)triggerBlobDownload(bytes,filename)}
    else{
     if(!bytes)throw new MediaServiceError('Audio stream was empty.','SOURCE_UNAVAILABLE')
     const encoded=await encodeMp3Local(bytes,mp3Bitrate,controller.signal,setProgress)
     if(controller.signal.aborted)return
     triggerBlobDownload(encoded,filename)
    }
   }
   if(!controller.signal.aborted){setCompleted(true);setNotice(`${format.toUpperCase()} file prepared. Check your browser's download/save prompt. Conversion stayed in your browser; no media bytes were routed through Vercel.`)}
  }catch(e){if(!aborted(e))setNotice(explainMediaError(e))}
  finally{if(running.current===controller)running.current=null;setBusy(false);setProgress(null)}
 }
 const cancel=()=>{running.current?.abort();running.current=null;setBusy(false);setProgress(null);setNotice('Operation cancelled. No media was uploaded to AUDIXO.')}
 const formats=[{id:'mp3' as const,title:'MP3 Audio',copy:'Encode in your browser at your chosen bitrate',glyph:'♫'},{id:'mp4' as const,title:'MP4 Video',copy:'Save only the source-confirmed resolution',glyph:'▶'}]
 const cta=format==='mp3'?`Download MP3 · ${mp3Bitrate} kbps`:`Download MP4${quality?` · ${quality}p`:''}`
 const cannotDownload=active&&!canDownload
 return <SiteShell><Seo title="YouTube to MP3 & MP4 | AUDIXO" description="Inspect public YouTube metadata, choose verified browser-direct formats where permitted, or convert a local audio file to MP3 in your browser." path="/tools/youtube-to-mp3"/>
 <main className="page-shell ax39-converter ax59-converter">
  <div className="ax39-converter-hero"><div><div className="ax25-kicker"><i/> AUDIXO / MEDIA CONVERTER</div><h1>One link.<br/><em>Sound or video.</em></h1><p>Analyze a public video, choose a source-verified format, or use a local file. Files are processed in your browser where source access permits it.</p><div className="ax39-server ready"><i/>{STATUS_START}</div></div><div className="ax39-hero-art" aria-hidden="true"><span className="ax39-art-orbit a"/><span className="ax39-art-orbit b"/><div className="ax39-art-disc"><span>♫</span></div><div className="ax39-art-chip one">MP3 · browser encoded</div><div className="ax39-art-chip two">MP4 · source quality</div></div></div>
  <section className="ax39-converter-panel" aria-label="AUDIXO media converter">
   <div className="ax39-converter-top"><div><small>FORMAT</small><strong>What would you like to save?</strong></div><span>01 / 03</span></div>
   <div className="ax39-format-toggle" role="group" aria-label="Output format">{formats.map(item=><button type="button" key={item.id} className={format===item.id?'active':''} aria-pressed={format===item.id} disabled={busy} onClick={()=>{setFormat(item.id);setNotice('');setCompleted(false);if(item.id==='mp4')setQuality(highestConfirmedQuality(available))}}><span className="ax39-format-icon">{item.glyph}</span><span><strong>{item.title}</strong><small>{item.copy}</small></span><span className="ax46-format-switch" aria-hidden="true"><i/></span></button>)}</div>
   <div className="ax39-steps">
    <div className="ax39-step"><span className="ax39-step-num">01</span><div className="ax39-step-content"><h2>Paste your YouTube link</h2><p>We analyze public metadata, then check whether media permits direct browser access.</p>
     <div className="ax39-urlbar"><div className="ax42-url-input"><span aria-hidden="true">↗</span><input aria-label="YouTube video URL" type="url" inputMode="url" placeholder="Paste a YouTube video link…" value={url} disabled={busy} onChange={e=>updateUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!busy)void analyze()}}/>{url&&<button className="ax39-clear" aria-label="Clear URL" title="Clear URL" type="button" onClick={clear}>×</button>}</div><button type="button" disabled={busy||!url.trim()} className="ax39-analyze" onClick={()=>void analyze()}>{busy&&progress?.stage.includes('Analyzing')?'Checking…':'Analyze'} <span>↗</span></button></div>
     <div className="ax59-local-row"><span>Or work entirely offline with media you own</span><input ref={picker} type="file" accept="audio/*,video/mp4,video/webm,.m4a,.wav,.flac,.mp3,.mp4,.webm" aria-label="Choose a local audio or MP4 video" hidden onChange={e=>void chooseLocal(e.currentTarget.files?.[0])}/><button type="button" disabled={busy} onClick={()=>picker.current?.click()}>+ Choose local file</button></div>
     {active&&<div className="ax39-preview">{preview?.thumbnail?<img src={preview.thumbnail} alt="Video thumbnail" loading="lazy" referrerPolicy="no-referrer"/>:<div className="ax59-local-icon" aria-hidden="true">♫</div>}<div><small>{local?'LOCAL FILE':'YOUTUBE METADATA'} · {shortTime(local?.duration||preview?.duration||0)}</small><strong title={target}>{target}</strong><span>{local?'Stored on this device':preview?.author||'Public YouTube video'}</span></div><b>✓</b></div>}
    </div></div>
    <div className="ax39-step"><span className="ax39-step-num">02</span><div className="ax39-step-content"><h2>{format==='mp3'?'Choose audio quality':'Choose video resolution'}</h2>{format==='mp3'?<Mp3QualityRail bitrate={mp3Bitrate} duration={local?.duration||preview?.duration||0} disabled={busy} onChange={setMp3Bitrate}/>:<VideoQualityRail quality={quality} onChange={setQuality} available={available} analyzed={active} disabled={busy}/>}</div></div>
    <div className="ax39-step"><span className="ax39-step-num">03</span><div className="ax39-step-content"><h2>Prepare &amp; download</h2><p>The file name uses the original title plus <b>(Audixo {format.toUpperCase()})</b>.</p><p className="ax52-usage-note">Only download or transform content you own or have permission to use. No browser extension, account cookies, or download server required.</p>
     <button type="button" className="ax39-create ax42-download" disabled={!canDownload||busy} onClick={()=>void start()}><span>{busy?'Working in your browser…':cta}</span><b>↓</b></button>
     {cannotDownload&&<div className="ax59-limitation" role="status">{format==='mp3'?'No direct audio stream was confirmed. YouTube may block access from independent websites. You can still choose a local file and encode real MP3 at the selected bitrate.':'No source-verified MP4 format available. Changing resolution cannot unlock a stream; try an authorized local MP4 file.'}</div>}
     {busy&&progress&&<div className="ax39-progress ax59-progress" role="status"><div><strong>{progress.stage}</strong><button type="button" onClick={cancel}>Cancel</button></div>{typeof progress.percent==='number'?<progress max="100" value={progress.percent} aria-label="Media processing progress"/>:<span className="ax59-progress-indeterminate" aria-hidden="true"/>}<small>{typeof progress.percent==='number'?`${progress.percent}% · `:''}{typeof progress.bytes==='number'?`${(progress.bytes/1048576).toFixed(1)} MB transferred directly · `:''}No large file passes through Vercel.</small></div>}
     {completed&&!busy&&<div className="ax59-complete" role="status">✓ Save requested. Check your device downloads.</div>}
    </div></div>
   </div>
   <div className="ax39-converter-bottom"><span>Original source title</span><span>MP3 / MP4</span><span>Browser-first delivery</span></div>
  </section>
  {notice&&<div className="ax39-alert ax59-alert" role="status" data-type={completed?'success':'info'}>{notice}</div>}
  <p className="ax59-source-note">Browser privacy controls may prevent YouTube media downloads. AUDIXO never bypasses authentication, relays full media through Vercel, or claims unavailable formats are supported.</p>
 </main></SiteShell>
}
