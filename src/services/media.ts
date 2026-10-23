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
 if(code==='WORKER_NOT_CONFIGURED')return 'Media worker setup required: deploy the Docker media-worker service, then add its HTTPS URL and the shared private token to Vercel environment variables.'
 if(code==='ORIGIN_UNAVAILABLE'||/Cloudflare HTTP 52\d|origin.*unavailable|invalid or incomplete response/i.test(message))return 'The AUDIXO media worker is unreachable. Confirm that the Docker host is live and AUDIXO_WORKER_URL points to its HTTPS domain.'
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
 * The job expires after ~55 minutes; the UI deadline is 28 minutes.
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
function jobIdFromTicketLink(file:MediaFile){
 const url=new URL(file.url,window.location.href)
 const id=url.searchParams.get('id')||''
 if(url.origin!==window.location.origin||url.pathname!=='/api/media'||url.searchParams.get('action')!=='ticket'||!/^[a-f0-9]{32}$/.test(id))
  throw new MediaServiceError('Invalid media job download reference.','INVALID_REQUEST')
 return id
}
/** Request a short-lived worker-signed download ticket through the Vercel proxy.
 * The MP3/MP4 bytes then come directly from the HTTPS worker, not from Vercel
 * (whose function response size limit is far too small for video downloads).
 * The worker sends Content-Disposition: attachment and enforces one-time GET.
 */
export async function downloadFile(file:MediaFile,title:string,format:MediaKind,signal?:AbortSignal){
 const id=jobIdFromTicketLink(file)
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 const ticket=await mediaRequest<{ok:boolean;url:string;expiresAt:number}>('ticket',{id,format},signal)
 let url:URL
 try{url=new URL(ticket.url)}catch{throw new MediaServiceError('The worker returned an invalid download URL.','UPSTREAM_ERROR')}
 const secure=url.protocol==='https:'||(url.hostname==='127.0.0.1'||url.hostname==='localhost')&&url.protocol==='http:'
 if(!secure||url.username||url.password||url.pathname!==`/download/${id}`||
   !/^[0-9]{13}$/.test(url.searchParams.get('expires')||'')||!/^[a-f0-9]{64}$/.test(url.searchParams.get('sig')||''))
  throw new MediaServiceError('The worker returned an unsafe download ticket.','UPSTREAM_ERROR')
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 const anchor=document.createElement('a')
 anchor.href=url.href
 // File name is set by the backend's attachment header (not anchor.download,
 // which browsers may ignore for cross-origin URLs).
 anchor.rel='noreferrer noopener'
 anchor.style.display='none'
 anchor.setAttribute('aria-label',`Download ${cleanTitle(title)} as ${format.toUpperCase()}`)
 document.body.append(anchor);anchor.click();anchor.remove()
 return url.href
}
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
