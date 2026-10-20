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
 if(code==='ORIGIN_UNAVAILABLE'||/Cloudflare HTTP 52\d|origin.*unavailable|invalid or incomplete response/i.test(message))return 'The YTDL server could not be reached through Cloudflare. Check the origin server and its logs; changing MP4 quality will not fix a down server.'
 if(code==='QUALITY_UNAVAILABLE')return message||'The selected MP4 resolution is not available for this video. Analyze the video again.'
 if(code==='QUALITY_MISMATCH'||code==='QUALITY_UNVERIFIED')return message
 if(code==='BOT_CHECK_FAILED'||code==='BOT_CHECK_REQUIRED')return 'Human verification expired or failed. Complete the security check again.'
 if(code==='BOT_CHECK_CONFIG')return 'Cloudflare Turnstile setup is incomplete. Add the server secret or remove the site key until setup is finished.'
 if(code==='SOURCE_FORBIDDEN'||/unable to download (?:video |audio )?data.*403/i.test(message))return 'YouTube rejected source access. Refresh the YTDL server authentication/cookies and check yt-dlp challenge solving.'
 if(code==='SERVICE_AUTH')return 'The YTDL API rejected authentication. Check the private service token/session on the backend.'
 if(code==='FILE_FORBIDDEN')return 'The conversion server denied access to the completed file.'
 if(code==='FILE_UNAVAILABLE')return 'The conversion output is not yet available. Check the YTDL job status and storage.'
 if(code==='WRONG_FILE_TYPE')return 'The conversion server returned the wrong media type rather than a valid MP3/MP4 file.'
 return message
}
export async function waitForJob(id:string,format:MediaKind,onUpdate:(job:MediaJob)=>void,signal?:AbortSignal,quality=''){
 const started=Date.now();let failures=0
 for(;;){
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
  if(Date.now()-started>90*60_000)throw new MediaServiceError('Conversion is still running. Use Resume to check the same job later.','UPSTREAM_LIMIT')
  try{
   const job=await mediaRequest<MediaJob>('status',{id,format,...(format==='mp4'&&quality?{quality}:{})},signal)
   failures=0;onUpdate(job)
   if(job.state==='complete'){
    if(!job.files?.length)throw new MediaServiceError('Completed job is missing its final media file.','JOB_FAILED',0,true)
    return job
   }
   if(job.state==='failed')throw new MediaServiceError(job.error||'The conversion server reported an error.',job.errorCode||'JOB_FAILED',0,true)
  }catch(error){
   if(signal?.aborted)throw error
   if(error instanceof MediaServiceError&&(error.terminal||!RETRYABLE_CODES.has(error.code)))throw error
   if(++failures>=4)throw error
  }
  const interval=failures?6000:Date.now()-started<20_000?2100:Date.now()-started<100_000?3500:6000
  await new Promise<void>((resolve,reject)=>{
   const timer=window.setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve()},interval)
   const stop=()=>{window.clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'))}
   signal?.addEventListener('abort',stop,{once:true})
  })
 }
}
const cleanTitle=(s:string)=>s.replace(/[\\/<>|:*?"\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,145)||'YouTube video'
function fileUrl(file:MediaFile,title:string,format:MediaKind){
 const url=new URL(file.url,window.location.href)
 if(url.origin!==window.location.origin||url.pathname!=='/api/media'||url.searchParams.get('action')!=='file')throw new MediaServiceError('Invalid media download location.','INVALID_REQUEST')
 url.searchParams.set('format',format);url.searchParams.set('title',cleanTitle(title));return url
}
async function checkFile(file:MediaFile,title:string,format:MediaKind,signal?:AbortSignal){
 const url=fileUrl(file,title,format)
 const res=await fetch(url.href,{method:'HEAD',cache:'no-store',signal})
 if(!res.ok){
  const data=await res.json().catch(()=>null)
  throw new MediaServiceError(String(data?.error||`Media output is not available (HTTP ${res.status}).`),String(data?.code||'FILE_UNAVAILABLE'),res.status,TERMINAL_JOB_CODES.has(data?.code))
 }
 const type=(res.headers.get('content-type')||'').toLowerCase()
 const mime=type.split(';')[0].trim()
 const valid=['application/octet-stream','application/binary','binary/octet-stream'].includes(mime)||(format==='mp4'?mime==='video/mp4':['audio/mpeg','audio/mp3','audio/x-mpeg','audio/x-mp3'].includes(mime))
 if(!valid)throw new MediaServiceError('The server returned a non-media or incompatible file.','WRONG_FILE_TYPE',0,true)
 const size=Number(res.headers.get('content-length')||NaN)
 if(!Number.isFinite(size)||size<=0)throw new MediaServiceError('The finished file has no confirmed non-zero size.','FILE_UNAVAILABLE',0,true)
 return url
}
export async function downloadFile(file:MediaFile,title:string,format:MediaKind,signal?:AbortSignal){
 const url=await checkFile(file,title,format,signal)
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 const anchor=document.createElement('a');anchor.href=url.href;anchor.download=`${cleanTitle(title)} (Audixo ${format.toUpperCase()}).${format}`;anchor.rel='noreferrer';document.body.append(anchor);anchor.click();anchor.remove()
}
/** Height must equal the requested exact output resolution, never assume a slider value is proof. */
export function assertVideoResolution(width:number,height:number,requested:string){
 const expected=Number(requested)
 if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)throw new MediaServiceError('The output MP4 dimensions could not be verified.','QUALITY_UNVERIFIED',0,true)
 if(height!==expected)throw new MediaServiceError(`The YTDL server produced ${width} x ${height}, not the requested ${expected}p. No download was started.`,'QUALITY_MISMATCH',0,true)
 return height
}
export async function verifyVideoOutput(file:MediaFile,title:string,quality:string,reported?:{reportedWidth?:number;reportedHeight?:number},signal?:AbortSignal){
 if(reported?.reportedWidth&&reported.reportedHeight){
  const actual=assertVideoResolution(reported.reportedWidth,reported.reportedHeight,quality)
  await checkFile(file,title,'mp4',signal)
  return {width:reported.reportedWidth,height:reported.reportedHeight,actual}
 }
 const url=await checkFile(file,title,'mp4',signal)
 const dims=await new Promise<{width:number;height:number}>((resolve,reject)=>{
  const video=document.createElement('video');video.muted=true;video.preload='metadata';video.playsInline=true
  let done=false
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);video.onloadedmetadata=null;video.onerror=null;video.removeAttribute('src');video.load()}
  const finish=(error?:Error)=>{if(done)return;done=true;const result={width:video.videoWidth,height:video.videoHeight};cleanup();error?reject(error):resolve(result)}
  const abort=()=>finish(new DOMException('Cancelled','AbortError'))
  const timer=window.setTimeout(()=>finish(new MediaServiceError('Could not verify MP4 dimensions. The YTDL server must serve a browser-readable MP4 with Range support.','QUALITY_UNVERIFIED',0,true)),25000)
  video.onloadedmetadata=()=>finish()
  video.onerror=()=>finish(new MediaServiceError('The browser could not open this MP4. Check its codec and file endpoint.','QUALITY_UNVERIFIED',0,true))
  if(signal?.aborted){abort();return}
  signal?.addEventListener('abort',abort,{once:true});video.src=url.href
 })
 const actual=assertVideoResolution(dims.width,dims.height,quality)
 return {...dims,actual}
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
