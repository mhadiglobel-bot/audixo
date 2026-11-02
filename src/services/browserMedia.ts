import {MediaServiceError,outputName,type DirectStream,type MediaKind} from './media'

export type Progress={stage:string;percent?:number;bytes?:number}
export type LocalInfo={file:File;title:string;duration:number;height:number;mimeType:string;qualities:{value:string;label:string}[];audioAvailable:boolean}
const mobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
export const mp3MemoryCap=()=>mobile()?20*1024*1024:48*1024*1024
export const mp3DurationCap=()=>mobile()?160:420
export const mp4MemoryCap=()=>mobile()?80*1024*1024:220*1024*1024
export function localFileSupported(file:File){return /^(audio\/|video\/)/.test(file.type)||/\.(mp3|wav|m4a|aac|ogg|flac|webm|mp4)$/i.test(file.name)}
export function inspectLocalFile(file:File,signal?:AbortSignal):Promise<LocalInfo>{
 if(!localFileSupported(file))return Promise.reject(new MediaServiceError('Choose a supported audio or video file.','UNSUPPORTED_FILE'))
 const isVideo=file.type.startsWith('video/')||/\.(mp4|webm)$/i.test(file.name)
 const title=file.name.replace(/\.[^/.]+$/,'').trim()||'Local media'
 return new Promise((resolve,reject)=>{
  const media=document.createElement(isVideo?'video':'audio') as HTMLMediaElement
  const blobUrl=URL.createObjectURL(file)
  let settled=false
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);media.removeAttribute('src');media.load();URL.revokeObjectURL(blobUrl)}
  const finish=(error?:Error)=>{if(settled)return;settled=true;const duration=Number.isFinite(media.duration)?media.duration:0
   const height=media instanceof HTMLVideoElement?media.videoHeight:0;cleanup()
   if(error){reject(error);return}
   const validMp4=/\.mp4$/i.test(file.name)||file.type==='video/mp4'
   resolve({file,title,duration,height,mimeType:file.type,qualities:validMp4&&height>0?[{value:String(height),label:`${height}p`}]:[],audioAvailable:true})
  }
  const cancel=()=>finish(new DOMException('Cancelled','AbortError'))
  const timer=setTimeout(()=>finish(new MediaServiceError('Could not read media metadata. Try a different file.','UNSUPPORTED_FILE')),12000)
  media.preload='metadata';media.onloadedmetadata=()=>finish();media.onerror=()=>finish(new MediaServiceError('Your browser cannot decode this file type.','UNSUPPORTED_FILE'))
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();return}
  media.src=blobUrl
 })
}
export function triggerBlobDownload(blob:Blob,filename:string){
 const href=URL.createObjectURL(blob),a=document.createElement('a');a.download=filename;a.href=href;a.style.display='none';document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(href),60_000)
}
export function downloadOriginalMp4(local:LocalInfo){
 if(!local.qualities.length)throw new MediaServiceError('This file has no confirmed MP4 video resolution.','QUALITY_UNAVAILABLE')
 triggerBlobDownload(local.file,outputName(local.title,'mp4'))
}
function safeDirect(stream:DirectStream){
 try{const u=new URL(stream.url);return u.protocol==='https:'&&u.pathname.startsWith('/videoplayback')&&(u.hostname==='googlevideo.com'||u.hostname.endsWith('.googlevideo.com'))&&!u.username&&!u.password&&!u.port}
 catch{return false}
}
function validatePayload(chunk:Uint8Array,mime:string,kind:MediaKind){
 if(chunk.length<12)return
 if(kind==='mp4'&&!Array.from(chunk.subarray(4,8)).every((n,i)=>n===[102,116,121,112][i]))throw new MediaServiceError('Source returned something other than an MP4 file.','WRONG_FILE_TYPE')
 if(kind==='mp3'&&/text\/html|application\/json/i.test(mime))throw new MediaServiceError('Source returned a webpage, not audio.','WRONG_FILE_TYPE')
}
export async function readDirectSource(stream:DirectStream,kind:MediaKind,signal:AbortSignal,onProgress:(p:Progress)=>void,filename:string):Promise<Blob|null>{
 if(!safeDirect(stream))throw new MediaServiceError('An invalid direct-media source was refused.','UNSAFE_SOURCE')
 const isMp4=kind==='mp4';const cap=isMp4?mp4MemoryCap():mp3MemoryCap()
 let handle:FileSystemFileHandle|null=null
 // Selecting the file destination MUST happen before the first await on the
 // click activation path. Keeps videos out of browser RAM on desktop Chrome.
 if(isMp4&&'showSaveFilePicker' in window){
  try{handle=await (window as any).showSaveFilePicker({suggestedName:filename,types:[{description:'MP4 video',accept:{'video/mp4':['.mp4']}}]}) as FileSystemFileHandle}
  catch(e){if((e as DOMException)?.name==='AbortError')throw new DOMException('Cancelled','AbortError')}
 }
 let response:Response
 onProgress({stage:'Connecting to original media source…'})
 try{response=await fetch(stream.url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',signal})}
 catch(e){if(signal.aborted)throw e;throw new MediaServiceError('YouTube did not allow direct browser access to this media (CORS, IP restrictions, or expired source).','CORS_BLOCKED')}
 if(!response.ok||!response.body)throw new MediaServiceError(`Source returned HTTP ${response.status}. Analyze the video again.`,'SOURCE_UNAVAILABLE',response.status)
 const mime=response.headers.get('content-type')||stream.mimeType
 if(/text\/html|application\/json/i.test(mime))throw new MediaServiceError('The media source returned a page rather than audio or video.','WRONG_FILE_TYPE')
 const reported=Number(response.headers.get('content-length')||stream.contentLength||0)
 if(!handle&&reported>cap)throw new MediaServiceError(`This media exceeds the browser memory cap (${Math.floor(cap/1024/1024)} MB).`,'MEMORY_LIMIT')
 const reader=response.body.getReader();let destination:FileSystemWritableFileStream|null=null;const chunks:Uint8Array[]=[];let received=0;let signature=new Uint8Array(0)
 try{
  if(handle)destination=await handle.createWritable()
  let checked=false
  for(;;){if(signal.aborted)throw new DOMException('Cancelled','AbortError')
   const {value,done}=await reader.read();if(done)break;if(!value?.length)continue
   if(!checked){const prefix=value.subarray(0,Math.max(0,12-signature.length));const merged=new Uint8Array(signature.length+prefix.length);merged.set(signature);merged.set(prefix,signature.length);signature=merged;if(signature.length>=12){validatePayload(signature,mime,kind);checked=true}}
   received+=value.byteLength
   if(!destination&&received>cap)throw new MediaServiceError(`This file exceeds the browser memory cap (${Math.floor(cap/1024/1024)} MB).`,'MEMORY_LIMIT')
   if(destination)await destination.write(value);else chunks.push(value)
   onProgress({stage:isMp4?'Downloading direct MP4…':'Downloading audio to browser…',...(reported>0?{percent:Math.min(99,Math.round(received/reported*100))}:{}),bytes:received})
  }
  if(received===0)throw new MediaServiceError('No media bytes were received.','SOURCE_UNAVAILABLE')
  if(isMp4&&!checked)throw new MediaServiceError('Source output was not a valid MP4 file.','WRONG_FILE_TYPE')
  if(destination){await destination.close();destination=null;onProgress({stage:'Saved MP4 to your device',percent:100,bytes:received});return null}
  onProgress({stage:'Downloaded to browser',percent:100,bytes:received})
  return new Blob(chunks as BlobPart[],{type:kind==='mp4'?'video/mp4':stream.mimeType})
 }catch(e){if(destination){try{await destination.abort()}catch{}}throw e}
 finally{void reader.cancel().catch(()=>{})}
}
export async function encodeMp3Local(blob:Blob,kbps:number,signal:AbortSignal,onProgress:(p:Progress)=>void):Promise<Blob>{
 if(blob.size>mp3MemoryCap())throw new MediaServiceError(`MP3 input is too large for safe browser encoding. Limit: ${Math.floor(mp3MemoryCap()/1048576)} MB.`,'MEMORY_LIMIT')
 if(![64,128,192,256,320].includes(kbps))throw new MediaServiceError('Choose a supported MP3 bitrate.','INVALID_BITRATE')
 if(signal.aborted)throw new DOMException('Cancelled','AbortError')
 onProgress({stage:'Decoding audio locally…'})
 const ctx=new AudioContext()
 let buffer:AudioBuffer
 try{buffer=await ctx.decodeAudioData(await blob.arrayBuffer())}
 catch{throw new MediaServiceError('Your browser cannot decode this audio codec. Try a supported MP3, M4A, WAV or WebM file.','UNSUPPORTED_CODEC')}
 finally{void ctx.close()}
 if(signal.aborted)throw new DOMException('Cancelled','AbortError')
 if(buffer.duration>mp3DurationCap())throw new MediaServiceError(`Audio exceeds the safe ${Math.floor(mp3DurationCap()/60)}-minute browser encoding limit.`,'MEMORY_LIMIT')
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./converter.worker.ts',import.meta.url),{type:'module'})
  let done=false
  const cleanup=()=>{worker.terminate();signal.removeEventListener('abort',cancel)}
  const fail=(e:Error)=>{if(done)return;done=true;cleanup();reject(e)}
  const cancel=()=>fail(new DOMException('Cancelled','AbortError'))
  signal.addEventListener('abort',cancel,{once:true})
  worker.onmessage=(event:MessageEvent<{type:'progress'|'done'|'error';percent?:number;blob?:Blob;message?:string}>)=>{
   const v=event.data
   if(v.type==='progress')onProgress({stage:`Encoding MP3 · ${kbps} kbps`,percent:v.percent})
   else if(v.type==='error')fail(new MediaServiceError(v.message||'MP3 encoding failed.','ENCODING_ERROR'))
   else if(v.type==='done'&&v.blob){done=true;cleanup();resolve(v.blob)}
  }
  worker.onerror=()=>fail(new MediaServiceError('MP3 encoder crashed. Try a shorter clip.','ENCODING_ERROR'))
  const channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,i)=>new Float32Array(buffer.getChannelData(i)))
  worker.postMessage({type:'encode',channels,sampleRate:buffer.sampleRate,kbps},channels.map(c=>c.buffer))
  if(signal.aborted)cancel()
 })
}
