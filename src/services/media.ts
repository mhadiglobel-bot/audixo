export type MediaKind='mp3'|'mp4'
export type MediaQuality={value:string;label:string}
export type MediaPreview={url:string;title:string;author:string;duration:number;thumbnail:string;qualities:MediaQuality[]}
export type MediaFile={name?:string;url:string;fileName:string}
export type MediaJob={
 id:string;format?:MediaKind;state:'queued'|'processing'|'complete'|'failed';message?:string;error?:string;errorCode?:string;
 title?:string;duration?:number;progress?:number;reportedKbps?:number;reportedWidth?:number;reportedHeight?:number;
 files?:MediaFile[]
}
export class MediaServiceError extends Error{
 constructor(message:string,public code='MEDIA_ERROR',public status=0,public terminal=false){super(message);this.name='MediaServiceError'}
}
export async function mediaRequest<T=any>(action:string,body:Record<string,unknown>={},signal?:AbortSignal):Promise<T>{
 const res=await fetch(`/api/media?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'})
 const data=await res.json().catch(()=>({error:'The conversion server returned an unreadable response.',code:'INVALID_RESPONSE'}))
 if(!data||typeof data!=='object')throw new MediaServiceError('Invalid conversion response.','INVALID_RESPONSE')
 if(!res.ok||data.error&&data.state!=='failed')throw new MediaServiceError(data.error||`Media API failed (${res.status}).`,data.code,res.status)
 return data
}
export function explainMediaError(error:unknown){
 const message=error instanceof Error?error.message:String(error)
 const code=error instanceof MediaServiceError?error.code:''
 if(code==='SOURCE_FORBIDDEN'||/unable to download (?:video |audio )?data.*403/i.test(message))return 'YouTube refused the conversion server (403). The server owner must repair source access; changing resolution or a Vercel quality setting will not fix this.'
 if(code==='SERVICE_AUTH')return 'The conversion API rejected access. Check the service token or service login on the backend.'
 if(code==='FILE_FORBIDDEN')return 'The conversion finished, but its file endpoint denied access. Check the backend file-download permissions.'
 return message
}
export async function waitForJob(id:string,format:MediaKind,onUpdate:(job:MediaJob)=>void,signal?:AbortSignal){
 const started=Date.now();let failures=0
 for(;;){
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
  if(Date.now()-started>90*60_000)throw new Error('Conversion is still running. Use Resume to check the same job later.')
  try{
   const job=await mediaRequest<MediaJob>('status',{id,format},signal)
   failures=0;onUpdate(job)
   if(job.state==='complete')return job
   if(job.state==='failed')throw new MediaServiceError(job.error||'The conversion server reported an error.',job.errorCode||'JOB_FAILED',0,true)
  }catch(e){
   if(signal?.aborted)throw e
   if(e instanceof MediaServiceError&&(e.terminal||e.code!=='UPSTREAM_ERROR'))throw e
   if(++failures>=4)throw e
  }
  const interval=failures?6000:Date.now()-started<20_000?2100:Date.now()-started<100_000?3500:6000
  await new Promise<void>((resolve,reject)=>{
   const stop=()=>{window.clearTimeout(timer);signal?.removeEventListener('abort',stop);reject(new DOMException('Cancelled','AbortError'))}
   const timer=window.setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve()},interval)
   signal?.addEventListener('abort',stop,{once:true})
  })
 }
}
const cleanTitle=(s:string)=>s.replace(/[\\/<>|:*?"\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,145)||'YouTube video'
function fileUrl(file:MediaFile,title:string,format:MediaKind){
 const url=new URL(file.url,window.location.href)
 if(url.origin!==window.location.origin||url.pathname!=='/api/media'||url.searchParams.get('action')!=='file')throw new Error('Invalid media download location.')
 url.searchParams.set('format',format);url.searchParams.set('title',cleanTitle(title));return url
}
async function checkFile(file:MediaFile,title:string,format:MediaKind,signal?:AbortSignal){
 const url=fileUrl(file,title,format)
 const res=await fetch(url.href,{method:'HEAD',cache:'no-store',signal})
 if(!res.ok)throw new MediaServiceError(`File download is not available (HTTP ${res.status}).`,res.status===403?'FILE_FORBIDDEN':'FILE_UNAVAILABLE',res.status)
 const type=res.headers.get('content-type')||''
 if(/text\/|json|html|xml/i.test(type))throw new Error('The API returned a message instead of a media file.')
 return url
}
export async function downloadFile(file:MediaFile,title:string,format:MediaKind,signal?:AbortSignal){
 const url=await checkFile(file,title,format,signal)
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 const a=document.createElement('a');a.href=url.href;a.download=`${cleanTitle(title)} (Audixo ${format.toUpperCase()}).${format}`;a.rel='noreferrer';document.body.append(a);a.click();a.remove()
}
/** Use encoded file dimensions, not the selected slider or source preview label. */
export function assertVideoResolution(width:number,height:number,requested:string){
 const actual=Math.round(Math.min(width,height)),expected=Number(requested)
 if(!Number.isFinite(actual)||actual<=0)throw new MediaServiceError('The MP4 resolution could not be verified.','QUALITY_UNVERIFIED')
 if(actual!==expected)throw new MediaServiceError(`Server returned ${width} x ${height} (${actual}p), not ${expected}p. No download was started. Choose that available size or ask the server owner to fix format selection.`,'QUALITY_MISMATCH')
 return actual
}
export async function verifyVideoOutput(file:MediaFile,title:string,quality:string,signal?:AbortSignal){
 const url=await checkFile(file,title,'mp4',signal)
 const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>{
  const video=document.createElement('video');video.muted=true;video.preload='metadata';video.playsInline=true
  let done=false
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);video.onloadedmetadata=null;video.onerror=null;video.removeAttribute('src');video.load()}
  const finish=(error?:Error)=>{if(done)return;done=true;const result={width:video.videoWidth,height:video.videoHeight};cleanup();error?reject(error):resolve(result)}
  const abort=()=>finish(new DOMException('Cancelled','AbortError'))
  const timer=window.setTimeout(()=>finish(new MediaServiceError('Could not read the MP4 dimensions. The server must support metadata/range requests or report a browser-readable MP4.','QUALITY_UNVERIFIED')),25000)
  video.onloadedmetadata=()=>finish()
  video.onerror=()=>finish(new MediaServiceError('This browser could not verify the MP4. Check the backend file codec and access permissions.','QUALITY_UNVERIFIED'))
  if(signal?.aborted){abort();return}
  signal?.addEventListener('abort',abort,{once:true});video.src=url.href
 })
 const actual=assertVideoResolution(dimensions.width,dimensions.height,quality)
 return {...dimensions,actual}
}
export function localMetadata(file:File):Promise<number>{return new Promise((resolve,reject)=>{
 const a=document.createElement('audio'),url=URL.createObjectURL(file),timer=setTimeout(()=>finish(new Error('Metadata timeout')),15000)
 const finish=(error?:Error)=>{clearTimeout(timer);const duration=a.duration;a.onloadedmetadata=null;a.onerror=null;a.removeAttribute('src');a.load();URL.revokeObjectURL(url);error?reject(error):resolve(duration)}
 a.preload='metadata';a.onloadedmetadata=()=>Number.isFinite(a.duration)?finish():finish(new Error('Unknown duration'));a.onerror=()=>finish(new Error('Unsupported audio format'));a.src=url
})}
/** Standard MP3 CBR choices; 240 kbps is deliberately not accepted. */
export async function downloadMp3AtBitrate(file:MediaFile,title:string,kbps:number,signal?:AbortSignal){
 if(![64,128,192,256,320].includes(kbps))throw new Error('Choose a supported MP3 bitrate.')
 const url=fileUrl(file,title,'mp3')
 const response=await fetch(url.href,{credentials:'same-origin',cache:'no-store',signal})
 if(!response.ok)throw new MediaServiceError(`MP3 file download failed (${response.status}).`,response.status===403?'FILE_FORBIDDEN':'FILE_UNAVAILABLE',response.status)
 if(/text\/|json|html|xml/i.test(response.headers.get('content-type')||''))throw new Error('The API returned a message instead of MP3 audio.')
 const limit=24_000_000,announced=Number(response.headers.get('content-length')||0)
 if(announced>limit){await response.body?.cancel();throw new Error('This file is too large for local MP3 encoding. The backend must encode it at the requested bitrate.')}
 const reader=response.body?.getReader();if(!reader)throw new Error('Empty MP3 download.')
 const parts:Uint8Array[]=[];let size=0
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('Local MP3 encoding is limited to 24 MB.');parts.push(value)}}catch(error){await reader.cancel();throw error}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
 const audio=new AudioContext();let pcm:AudioBuffer
 try{pcm=await audio.decodeAudioData(bytes.buffer as ArrayBuffer)}finally{await audio.close()}
 if(pcm.duration>300)throw new Error('Local MP3 encoding is limited to five-minute media. Longer files require the correct server encoder bitrate.')
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 const {encodeMp3,downloadBlob}=await import('../editor/encoder')
 const result=await encodeMp3(pcm,kbps)
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 downloadBlob(result,`${cleanTitle(title)} (Audixo MP3 ${kbps}kbps).mp3`)
}
