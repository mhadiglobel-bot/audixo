/** AUDIXO V59 metadata-only Vercel control plane.
 * Never downloads, proxies, or stores media bytes. No private cookies.
 * Browser-direct streams are exposed only when a public source reports a
 * straightforward URL AND its server advertises CORS access to AUDIXO.
 */
type Quality={value:string;label:string}
type DirectStream={kind:'audio'|'mp4';url:string;mimeType:string;quality?:string;bitrate?:number;contentLength?:number}
type Preview={url:string;title:string;author:string;duration:number;thumbnail:string;qualities:Quality[];streams:DirectStream[];audioAvailable:boolean;sourceNote:string}
const ALLOWED_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'])
const AUDIXO_ORIGIN='https://audixo.vercel.app'
const MEDIA_HOST=(host:string)=>host==='googlevideo.com'||host.endsWith('.googlevideo.com')
const cache=new Map<string,{until:number;value:Preview}>()
const inflight=new Map<string,Promise<Preview>>()
class ApiError extends Error{constructor(message:string,public code='ANALYZE_FAILED',public status=400){super(message)}}
function asYoutubeUrl(input:unknown):{url:string;id:string}{
 if(typeof input!=='string'||input.length>2048)throw new ApiError('Paste a valid HTTPS YouTube video link.','INVALID_URL')
 let u:URL
 try{u=new URL(input.trim())}catch{throw new ApiError('Paste a valid HTTPS YouTube video link.','INVALID_URL')}
 if(u.protocol!=='https:'||!ALLOWED_HOSTS.has(u.hostname.toLowerCase())||u.port||u.username||u.password)throw new ApiError('Only HTTPS YouTube video links are accepted.','INVALID_URL')
 const id=(u.hostname==='youtu.be'||u.hostname==='www.youtu.be')?u.pathname.split('/')[1]:u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1]
 if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id))throw new ApiError('This link does not contain a valid YouTube video ID.','INVALID_URL')
 return {id,url:`https://www.youtube.com/watch?v=${id}`}
}
function safeMediaUrl(input:unknown):string|null{
 if(typeof input!=='string'||input.length>4000)return null
 try{const u=new URL(input);if(u.protocol!=='https:'||!MEDIA_HOST(u.hostname.toLowerCase())||u.username||u.password||u.port||!u.pathname.startsWith('/videoplayback'))return null;return u.href}catch{return null}
}
function jsonObjectAfter(haystack:string,marker:string):any|null{
 const at=haystack.indexOf(marker);if(at<0)return null
 const start=haystack.indexOf('{',at+marker.length);if(start<0||start-at>400)return null
 let depth=0,inString=false,escaped=false
 for(let i=start;i<Math.min(haystack.length,start+650_000);i++){
  const c=haystack[i]
  if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue}
  if(c==='"'){inString=true;continue}
  if(c==='{')depth++;else if(c==='}'&&!--depth){try{return JSON.parse(haystack.slice(start,i+1))}catch{return null}}
 }
 return null
}
async function fetchTiny(url:string,limit:number,timeout:number):Promise<{status:number;body:string}|null>{
 try{const response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(timeout),headers:{'Accept':'application/json,text/html;q=0.8','User-Agent':'AUDIXO/59 metadata-only'}})
  if(!response.ok||!response.body)return {status:response.status,body:''}
  const reader=response.body.getReader();let length=0;const pieces:Uint8Array[]=[]
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit)return {status:413,body:''};pieces.push(value)}}finally{void reader.cancel().catch(()=>{})}
  const merged=new Uint8Array(length);let offset=0;for(const p of pieces){merged.set(p,offset);offset+=p.length}
  return {status:response.status,body:new TextDecoder().decode(merged)}
 }catch{return null}
}
function streamsFromResponse(player:any):DirectStream[]{
 const all=[...(Array.isArray(player?.streamingData?.formats)?player.streamingData.formats:[]),...(Array.isArray(player?.streamingData?.adaptiveFormats)?player.streamingData.adaptiveFormats:[])]
 const result:DirectStream[]=[];const seen=new Set<string>()
 for(const f of all){
  const url=safeMediaUrl(f?.url)
  if(!url)continue // Never decipher signatureCipher, authenticate, or bypass source access.
  const mimeType=String(f?.mimeType||'').split(';')[0].toLowerCase()
  const audio=mimeType==='audio/mp4'||mimeType==='audio/webm'
  const mp4=mimeType==='video/mp4'&&!!f?.audioQuality&&Number.isInteger(Number(f?.height))&&Number(f.height)>0
  if(!audio&&!mp4)continue // Video-only DASH needs a muxer; do not advertise it.
  const quality=mp4?String(f.height):undefined
  const id=`${audio?'audio':quality}:${mimeType}`
  if(seen.has(id))continue
  seen.add(id)
  result.push({kind:audio?'audio':'mp4',url,mimeType,quality,bitrate:Number(f?.bitrate)||undefined,contentLength:Number(f?.contentLength)||undefined})
 }
 return result.slice(0,16)
}
/** HEAD verifies CORS advertised by the media origin, without transferring media bytes.
 * CORS success is not a guarantee: player URLs may be IP-bound and expire.
 */
async function allowsBrowserSource(stream:DirectStream):Promise<boolean>{
 try{const response=await fetch(stream.url,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(2800),headers:{Origin:AUDIXO_ORIGIN}})
  if(!response.ok)return false
  const allow=response.headers.get('access-control-allow-origin')?.trim()||''
  return allow==='*'||allow===AUDIXO_ORIGIN
 }catch{return false}
}
async function resolveMetadata(id:string,url:string):Promise<Preview>{
 const oembedUrl=`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
 const [oembed,watch]=await Promise.all([
  fetchTiny(oembedUrl,24_000,6500),
  fetchTiny(url+'&hl=en',2_800_000,7200)
 ])
 const embed=oembed?.status===200?(()=>{try{return JSON.parse(oembed.body)}catch{return null}})():null
 const player=watch?.status===200?(jsonObjectAfter(watch.body,'ytInitialPlayerResponse = ')||jsonObjectAfter(watch.body,'"playerResponse":')):null
 const details=player?.videoDetails||{}
 if(player?.playabilityStatus?.status==='LOGIN_REQUIRED')throw new ApiError('This video needs a signed-in YouTube session. AUDIXO does not access private cookies.','AUTH_REQUIRED',403)
 const title=String(embed?.title||details.title||'').trim().slice(0,220)
 if(!title){const status=oembed?.status||watch?.status||503
  if(status===404||status===401||status===403)throw new ApiError('Video metadata is private, unavailable, or restricted by YouTube.','VIDEO_UNAVAILABLE',404)
  throw new ApiError('YouTube metadata is unavailable right now. Please try another public link.','ANALYZE_FAILED',503)
 }
 const candidates=streamsFromResponse(player)
 // Limit concurrency and metadata work; only HEAD requests are issued.
 const checked=await Promise.all(candidates.slice(0,8).map(async s=>({stream:s,ok:await allowsBrowserSource(s)})))
 const streams=checked.filter(x=>x.ok).map(x=>x.stream)
 const videoHeights=[...new Set(streams.filter(s=>s.kind==='mp4').map(s=>s.quality!).filter(Boolean))].sort((a,b)=>Number(a)-Number(b))
 return {url,title,author:String(embed?.author_name||details.author||'').slice(0,140),duration:Math.max(0,Number(details.lengthSeconds)||0),
  thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,qualities:videoHeights.map(value=>({value,label:`${value}p`})),streams,
  audioAvailable:streams.some(s=>s.kind==='audio'||s.kind==='mp4'),
  sourceNote:streams.length?'Browser-direct source detected. Final access depends on your browser and YouTube.':'YouTube did not expose a browser-accessible audio or MP4 file. Direct conversion is unavailable without a source that permits CORS.'}
}
async function metadata(input:unknown):Promise<Preview>{
 const {url,id}=asYoutubeUrl(input),now=Date.now()
 const cached=cache.get(id);if(cached&&cached.until>now)return cached.value
 const current=inflight.get(id);if(current)return current
 const promise=resolveMetadata(id,url).then(value=>{
  cache.set(id,{value,until:Date.now()+35_000});if(cache.size>110){for(const [key,entry] of cache)if(entry.until<Date.now()||cache.size>100)cache.delete(key)}
  return value
 }).finally(()=>inflight.delete(id))
 inflight.set(id,promise);return promise
}
export default async function handler(req:any,res:any){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8')
 try{
  if(req.method!=='POST')throw new ApiError('Use POST for metadata operations.','METHOD_NOT_ALLOWED',405)
  const action=String(req.query?.action||'').slice(0,40)
  if(action==='health')return res.status(200).json({ready:true,mode:'browser',message:'Browser-first processing; external media access depends on source permissions.'})
  if(action==='meta'){const data=await metadata(req.body?.url);return res.status(200).json(data)}
  if(['convert','status','ticket','events','file'].includes(action))throw new ApiError('Server-side conversion has been removed. Use browser-direct formats or a local file.','SERVER_CONVERSION_REMOVED',410)
  throw new ApiError('Unknown media action.','INVALID_REQUEST',400)
 }catch(e){const error=e instanceof ApiError?e:new ApiError('Could not analyze this video. Please try again.','ANALYZE_FAILED',503);return res.status(error.status).json({ok:false,error:error.message,code:error.code})}
}
