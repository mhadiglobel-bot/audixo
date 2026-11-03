/** AUDIXO browser client. All routes are SAME ORIGIN on this Vercel project.
 * No independent YTDL API, worker, or proxy server.
 */
export type MediaKind='mp3'|'mp4'
export type MediaQuality={value:string;label:string}
export type DirectStream={kind:'audio'|'mp4';url:string;mimeType:string;quality?:string;bitrate?:number;contentLength?:number}
export type MediaPreview={url:string;title:string;author:string;duration:number;thumbnail:string;qualities:MediaQuality[];streams:DirectStream[];audioAvailable:boolean;sourceNote:string;remote?:boolean}
export type MediaJob={ok:boolean;url?:string;status?:string;error?:string}
export class MediaServiceError extends Error{constructor(message:string,public code='MEDIA_ERROR',public status=0){super(message);this.name='MediaServiceError'}}
export function youtubeId(raw:string){
 try{const u=new URL(raw.trim()),hosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'])
  if(u.protocol!=='https:'||!hosts.has(u.hostname.toLowerCase())||u.username||u.password||u.port)return null
  const id=u.hostname.endsWith('youtu.be')?u.pathname.split('/')[1]:u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/)?.[1]
  return id&&/^[\w-]{11}$/.test(id)?id:null
 }catch{return null}
}
export async function mediaRequest<T>(action:'health'|'meta'|'start',body:Record<string,unknown>={},signal?:AbortSignal):Promise<T>{
 const method=action==='health'?'GET':'POST'
 let response:Response
 try{response=await fetch(`/api/media?action=${action}`,{method,headers:method==='POST'?{'Content-Type':'application/json'}:undefined,body:method==='POST'?JSON.stringify(body):undefined,cache:'no-store',signal})}
 catch(error){if(signal?.aborted)throw error;throw new MediaServiceError('This Vercel media function is unreachable. Try again.','NETWORK_ERROR')}
 const data=await response.json().catch(()=>null)
 if(!data||typeof data!=='object')throw new MediaServiceError('Media function returned an unexpected response.','INVALID_RESPONSE',response.status)
 if(!response.ok)throw new MediaServiceError(String(data.error||'Unable to process video.'),String(data.code||'MEDIA_ERROR'),response.status)
 return data as T
}
export function explainMediaError(error:unknown):string{
 if(error instanceof DOMException&&error.name==='AbortError')return 'Operation cancelled.'
 if(error instanceof MediaServiceError){
  if(error.code==='MEMORY_LIMIT')return 'This file exceeds the safe browser processing limit. Try a shorter file on desktop.'
  if(error.status===503)return 'Media function or converter is unavailable on Vercel. Check deployment function logs.'
  if(error.status===504)return 'YouTube analysis timed out. Try again shortly.'
 }
 return error instanceof Error?error.message:'Media conversion failed. Please try again.'
}
export const sanitizeFilename=(s:string)=>s.replace(/[\\/<>|:*?"\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,145)||'AUDIXO media'
export const outputName=(title:string,format:MediaKind)=>`${sanitizeFilename(title)} (AUDIXO ${format.toUpperCase()}).${format}`
export function localMetadata(file:File):Promise<number>{
 return new Promise((resolve,reject)=>{
  const audio=document.createElement('audio'),objectUrl=URL.createObjectURL(file)
  let settled=false
  const done=(error?:Error)=>{
   if(settled)return;settled=true;clearTimeout(timer)
   const duration=audio.duration;audio.onloadedmetadata=null;audio.onerror=null
   audio.removeAttribute('src');audio.load();URL.revokeObjectURL(objectUrl)
   if(error)reject(error);else resolve(duration)
  }
  const timer=window.setTimeout(()=>done(new Error('Local metadata timed out')),15000)
  audio.preload='metadata';audio.onloadedmetadata=()=>Number.isFinite(audio.duration)&&audio.duration>0?done():done(new Error('Audio duration unavailable'))
  audio.onerror=()=>done(new Error('Unsupported local audio format'));audio.src=objectUrl
 })
}
