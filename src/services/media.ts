/** Browser-first AUDIXO media types and lightweight analysis API.
 * The large media payload NEVER travels through Vercel.
 */
export type MediaKind='mp3'|'mp4'
export type MediaQuality={value:string;label:string}
export type DirectStream={kind:'audio'|'mp4';url:string;mimeType:string;quality?:string;bitrate?:number;contentLength?:number}
export type MediaPreview={url:string;title:string;author:string;duration:number;thumbnail:string;qualities:MediaQuality[];streams:DirectStream[];audioAvailable:boolean;sourceNote:string}
export class MediaServiceError extends Error{constructor(message:string,public code='MEDIA_ERROR',public status=0){super(message);this.name='MediaServiceError'}}
export function youtubeId(raw:string){
 try{const u=new URL(raw.trim()),hosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'])
  if(u.protocol!=='https:'||!hosts.has(u.hostname.toLowerCase())||u.username||u.password||u.port)return null
  const id=u.hostname.endsWith('youtu.be')?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/)?.[1]
  return id&&/^[\w-]{11}$/.test(id)?id:null
 }catch{return null}
}
export async function mediaRequest<T>(action:'health'|'meta',body:Record<string,unknown>={},signal?:AbortSignal):Promise<T>{
 let response:Response
 try{response=await fetch(`/api/media?action=${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal})}
 catch(error){if(signal?.aborted)throw error;throw new MediaServiceError('The metadata connection is unavailable. Try again.','NETWORK_ERROR')}
 const data=await response.json().catch(()=>null)
 if(!data||typeof data!=='object')throw new MediaServiceError('The metadata server returned an invalid response.','INVALID_RESPONSE',response.status)
 if(!response.ok)throw new MediaServiceError(String(data.error||'Unable to analyze this video.'),String(data.code||'ANALYZE_FAILED'),response.status)
 return data as T
}
export function explainMediaError(error:unknown):string{
 if(error instanceof DOMException&&error.name==='AbortError')return 'Operation cancelled.'
 if(error instanceof MediaServiceError){
  if(error.code==='CORS_BLOCKED')return 'This source does not permit browser-direct media access (CORS). Nothing was uploaded or proxied through Vercel.'
  if(error.code==='MEMORY_LIMIT')return 'This file exceeds the safe browser processing limit. Try a shorter file on desktop.'
  if(error.code==='SOURCE_UNAVAILABLE')return 'The direct media URL expired or is restricted. Analyze again.'
  if(error.code==='NO_BROWSER_STREAM')return 'No browser-accessible media formats were reported. This is a source/browser restriction, not a bitrate setting.'
 }
 return error instanceof Error?error.message:'Something went wrong. Please try again.'
}
export const sanitizeFilename=(s:string)=>s.replace(/[\\/<>|:*?"\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,145)||'AUDIXO media'
export const outputName=(title:string,format:MediaKind)=>`${sanitizeFilename(title)} (Audixo ${format.toUpperCase()}).${format}`
