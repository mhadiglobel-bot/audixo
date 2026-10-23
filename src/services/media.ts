export type MediaKind='mp3'|'mp4'
export type MediaQuality={value:string;label:string}
export type MediaPreview={url:string;title:string;author:string;duration:number;thumbnail:string;qualities:MediaQuality[]}
export type MediaFile={name?:string;url:string;fileName:string}
export type MediaJob={
 id:string;format?:MediaKind;state:'queued'|'processing'|'complete'|'failed';stage?:string;message?:string;error?:string;errorCode?:string;
 title?:string;duration?:number;progress?:number;downloadPercent?:number;downloadSpeed?:string;eta?:string;downloadPart?:number;downloadPartsTotal?:number;reportedKbps?:number;reportedWidth?:number;reportedHeight?:number;
 files?:MediaFile[]
}
export class MediaServiceError extends Error{
 constructor(message:string,public code='MEDIA_ERROR',public status=0,public terminal=false){super(message);this.name='MediaServiceError'}
}
export const TERMINAL_JOB_CODES=new Set(['QUALITY_UNAVAILABLE','QUALITY_MISMATCH','SOURCE_FORBIDDEN','SERVICE_AUTH','FILE_FORBIDDEN','FILE_UNAVAILABLE','WRONG_FILE_TYPE','QUALITY_UNVERIFIED','JOB_FAILED'])
const RETRYABLE_CODES=new Set(['ORIGIN_UNAVAILABLE','UPSTREAM_LIMIT','UPSTREAM_ERROR','NETWORK_ERROR'])
export async function mediaRequest<T=any>(action:string,body:Record<string,unknown>={},signal?:AbortSignal):Promise<T>{
 let response:Response
 try{response=await fetch(`/api/media?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'})}
 catch(error){if(signal?.aborted)throw error;throw new MediaServiceError('Could not reach the AUDIXO conversion API.','NETWORK_ERROR')}
 const data=await response.json().catch(()=>null)
 if(!data||typeof data!=='object')throw new MediaServiceError('The conversion server returned an unreadable response.',response.status>=520?'ORIGIN_UNAVAILABLE':'UPSTREAM_ERROR',response.status)
 if(!response.ok)throw new MediaServiceError(String(data.error||`Conversion server HTTP ${response.status}.`),String(data.code||'UPSTREAM_ERROR'),response.status,TERMINAL_JOB_CODES.has(data.code))
 if(data.error&&data.state!=='failed')throw new MediaServiceError(String(data.error),String(data.code||'UPSTREAM_ERROR'),response.status,TERMINAL_JOB_CODES.has(data.code))
 return data as T
}
export function explainMediaError(error:unknown){
 const message=error instanceof Error?error.message:String(error)
 const code=error instanceof MediaServiceError?error.code:''
 if(code==='ORIGIN_UNAVAILABLE'||/Cloudflare HTTP 52\d|origin.*unavailable|invalid or incomplete response/i.test(message))return 'The AUDIXO processing worker is offline or not configured. Check its hosting URL, Docker status and private token.'
 if(code==='QUALITY_UNAVAILABLE')return message||'The selected MP4 resolution is not available for this video. Analyze the video again.'
 if(code==='QUALITY_MISMATCH'||code==='QUALITY_UNVERIFIED')return message
 if(code==='BOT_CHECK_FAILED'||code==='BOT_CHECK_REQUIRED')return 'Human verification expired or failed. Complete the security check again.'
 if(code==='BOT_CHECK_CONFIG')return 'Cloudflare Turnstile setup is incomplete. Add the server secret or remove the site key until setup is finished.'
 if(code==='SOURCE_FORBIDDEN'||/unable to download (?:video |audio )?data.*403/i.test(message))return 'YouTube rejected source access. The private worker may need an updated YouTube-only session or yt-dlp update.'
 if(code==='SERVICE_AUTH')return 'The AUDIXO worker rejected authentication. Check its private token in the backend and Vercel settings.'
 if(code==='FILE_FORBIDDEN')return 'The conversion server denied access to the completed file.'
 if(code==='FILE_UNAVAILABLE')return 'The conversion output is not yet available. Check the AUDIXO private media job status and storage.'
 if(code==='WRONG_FILE_TYPE')return 'The conversion server returned the wrong media type rather than a valid MP3/MP4 file.'
 return message
}
/** Prefer SSE (the AUDIXO private media worker emits live progress).
 * Repeated status polling on a busy worker
 * can exhaust that limit. If SSE is blocked, fall back to slow 45-second polls.
 * The job expires after 15 minutes, so never keep polling for 90 minutes.
 */
export async function waitForJob(id:string,format:MediaKind,onUpdate:(job:MediaJob)=>void,signal?:AbortSignal,quality=''){
 const started=Date.now()
 const deadline=started+28*60_000
 const readStatus=async()=>{
  const job=await mediaRequest<MediaJob>('status',{id,format,...(format==='mp4'&&quality?{quality}:{})},signal)
  onUpdate(job)
  if(job.state==='complete'){
   if(!job.files?.length)throw new MediaServiceError('Ready job has no file endpoint.','JOB_FAILED',0,true)
   return job
  }
  if(job.state==='failed')throw new MediaServiceError(job.error||'The media worker reported a failed job.',job.errorCode||'JOB_FAILED',0,true)
  return null
 }
 const sleep=(ms:number)=>new Promise<void>((resolve,reject)=>{
  const timer=window.setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve()},ms)
  const stop=()=>{window.clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'))}
  signal?.addEventListener('abort',stop,{once:true})
 })
 const polling=async()=>{
  let consecutiveErrors=0
  for(;;){
   if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
   if(Date.now()>deadline)throw new MediaServiceError('The processing job took too long. Start a new conversion or check the worker status.','JOB_FAILED',0,true)
   try{
    const done=await readStatus();if(done)return done
    consecutiveErrors=0
   }catch(error){
    if(signal?.aborted)throw error
    if(error instanceof MediaServiceError&&(error.terminal||!RETRYABLE_CODES.has(error.code)))throw error
    if(++consecutiveErrors>=3)throw error
   }
   await sleep(45000)
  }
 }
 if(typeof EventSource==='undefined')return polling()
 return await new Promise<MediaJob>((resolve,reject)=>{
  const source=new EventSource(`/api/media?action=events&id=${encodeURIComponent(id)}`)
  let settled=false,seenEvent=false,checking=false
  const cleanup=()=>{source.close();clearTimeout(connectDeadline);signal?.removeEventListener('abort',cancel)}
  const finish=(error?:unknown,job?:MediaJob)=>{
   if(settled)return;settled=true;cleanup()
   if(error)reject(error);else if(job)resolve(job)
  }
  const fallback=()=>{
   if(settled)return;settled=true;cleanup()
   void polling().then(resolve,reject)
  }
  const cancel=()=>finish(new DOMException('Cancelled','AbortError'))
  const connectDeadline=window.setTimeout(()=>{if(!seenEvent)fallback()},16000)
  const confirm=async()=>{
   if(settled||checking)return
   checking=true
   try{
    const done=await readStatus()
    if(done)finish(undefined,done)
    else{checking=false}
   }catch(error){finish(error)}
  }
  const onEvent=(type:string,event:MessageEvent)=>{
   seenEvent=true
   if(type==='heartbeat'||type==='connected')return
   let payload:any=null
   try{payload=JSON.parse(String(event.data??''))}catch{}
   if(type==='error'||payload?.status==='failed'||payload?.state==='failed'){
    const code=String(payload?.code??payload?.error_code??'JOB_FAILED')
    finish(new MediaServiceError(String(payload?.error??payload?.message??'AUDIXO private media download failed.'),code,0,TERMINAL_JOB_CODES.has(code)))
    return
   }
   const pct=Number(payload?.progress??payload?.percent??payload?.download?.percent)
   const eventStage=String(payload?.stage??type)
   if(Number.isFinite(pct)||payload?.message){
    const state:MediaJob={id,format,state:'processing',stage:eventStage,
     progress:Number.isFinite(pct)?Math.max(0,Math.min(100,pct)):undefined,
     downloadSpeed:String(payload?.download?.speed??payload?.speed??''),
     eta:String(payload?.download?.eta??payload?.eta??''),
     message:String(payload?.message??'')}
    onUpdate(state)
   }
   if(type==='complete'||type==='file_delivered'||['complete','ready'].includes(String(payload?.status??payload?.state??'')))void confirm()
  }
  for(const name of ['connected','queued','stage','metadata','progress','retry','warning','complete','file_delivered','heartbeat']){
   source.addEventListener(name,event=>onEvent(name,event as MessageEvent))
  }
  source.addEventListener('error',event=>{
   const message=(event as MessageEvent).data
   if(typeof message==='string'&&message){onEvent('error',event as MessageEvent);return}
   // A dropped SSE connection may reconnect, but a slow poll is safer if
   // the Vercel relay cannot maintain EventSource for this deployment.
   fallback()
  })
  if(signal?.aborted){cancel();return}
  signal?.addEventListener('abort',cancel,{once:true})
  // Important: if the SSE endpoint is unavailable, slow polling starts on its
  // error. No rapid fallback polling that could hit 20 requests / 10 minutes.
 })
}
const cleanTitle=(s:string)=>s.replace(/[\\/<>|:*?"\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,145)||'YouTube video'
function fileUrl(file:MediaFile,title:string,format:MediaKind){
 const url=new URL(file.url,window.location.href)
 if(url.origin!==window.location.origin||url.pathname!=='/api/media'||url.searchParams.get('action')!=='file')throw new MediaServiceError('Invalid media download location.','INVALID_REQUEST')
 url.searchParams.set('format',format);url.searchParams.set('title',cleanTitle(title));return url
}
/** One-time AUDIXO worker file: never prefetch with HEAD or metadata GET.
 * Let the browser perform exactly one full GET. The worker deletes the temp
 * file after delivery. The click only starts a download; the browser owns it.
 */
export async function downloadFile(file:MediaFile,title:string,format:MediaKind,signal?:AbortSignal){
 const url=fileUrl(file,title,format)
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 const anchor=document.createElement('a')
 anchor.href=url.href
 anchor.download=`${cleanTitle(title)} (Audixo ${format.toUpperCase()}).${format}`
 anchor.rel='noreferrer'
 document.body.append(anchor);anchor.click();anchor.remove()
}
/** Verify only trusted output metadata supplied in job status. Never open the
 * one-time file in a hidden <video> just to check dimensions.
 */
export function assertVideoResolution(width:number,height:number,requested:string){
 const expected=Number(requested)
 if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)throw new MediaServiceError('The output MP4 dimensions could not be verified.','QUALITY_UNVERIFIED',0,true)
 if(height!==expected)throw new MediaServiceError(`The AUDIXO private media server produced ${width} x ${height}, not the requested ${expected}p. No download was started.`,'QUALITY_MISMATCH',0,true)
 return height
}
export async function verifyVideoOutput(_file:MediaFile,_title:string,quality:string,reported?:{reportedWidth?:number;reportedHeight?:number},_signal?:AbortSignal){
 if(reported?.reportedWidth&&reported.reportedHeight){
  const actual=assertVideoResolution(reported.reportedWidth,reported.reportedHeight,quality)
  return {width:reported.reportedWidth,height:reported.reportedHeight,actual,verified:true}
 }
 return {width:0,height:0,actual:Number(quality),verified:false}
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
