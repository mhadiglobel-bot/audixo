/** AUDIXO V53 — server-only YTDL bridge. Never expose YTDL credentials in VITE_*.
 * MP4 availability comes exclusively from the upstream /api/preview contract:
 * available_qualities: [{quality,width,height,format_id,container:'mp4',downloadable:true}].
 * Generic yt-dlp `formats` and bare resolution lists are NOT proof of downloadability.
 */
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'

const YT_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'])
const MP4_QUALITIES=['240','360','480','720','1080','1440','2160'] as const
const SUPPORTED=new Set<string>(MP4_QUALITIES)
const JOB_ID=/^[\w-]{1,128}$/
const CF_ORIGIN_STATUSES=new Set([520,521,522,523,524,525,526,530])
export const MEDIA_ERROR_CODES=[
 'INVALID_REQUEST','QUALITY_UNAVAILABLE','SOURCE_FORBIDDEN','SERVICE_AUTH','ORIGIN_UNAVAILABLE',
 'UPSTREAM_LIMIT','UPSTREAM_VALIDATION','FILE_FORBIDDEN','FILE_UNAVAILABLE','WRONG_FILE_TYPE',
 'QUALITY_MISMATCH','QUALITY_UNVERIFIED','JOB_FAILED','BOT_CHECK_CONFIG','BOT_CHECK_REQUIRED',
 'BOT_CHECK_FAILED','BOT_CHECK_UNAVAILABLE','SERVICE_CONFIG','UPSTREAM_ERROR'
] as const
export type MediaErrorCode=(typeof MEDIA_ERROR_CODES)[number]
const CODE_SET=new Set<string>(MEDIA_ERROR_CODES)
type Kind='mp3'|'mp4'
type Quality={value:string;label:string}
class UpstreamApiError extends Error{
 constructor(message:string,public status:number,public code:MediaErrorCode,public availableQualities?:string[]){super(message);this.name='UpstreamApiError'}
}
const text=(v:unknown,max=180)=>String(v??'').replace(/[\u0000-\u001f\u007f<>\\/|:*?"']/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
const kind=(v:unknown):Kind=>{if(v!==undefined&&v!==''&&v!=='mp3'&&v!=='mp4')throw new UpstreamApiError('Invalid media format.',400,'INVALID_REQUEST');return v==='mp4'?'mp4':'mp3'}
const niceName=(title:unknown,format:Kind)=>{
 const cleaned=text(title||'YouTube media',145).replace(/\s*\(Audixo (?:MP3|MP4)\)\s*$/i,'').replace(/\.(?:mp3|mp4)$/i,'').replace(/[. ]+$/,'')||'YouTube media'
 return `${cleaned} (Audixo ${format.toUpperCase()}).${format}`
}
const youtube=(raw:unknown)=>{
 let u:URL
 try{u=new URL(String(raw||''))}catch{throw new UpstreamApiError('Paste a valid YouTube video URL.',400,'INVALID_REQUEST')}
 if(u.protocol!=='https:'||!YT_HOSTS.has(u.hostname)||u.username||u.password)throw new UpstreamApiError('Paste a valid HTTPS YouTube URL.',400,'INVALID_REQUEST')
 const parts=u.pathname.split('/').filter(Boolean)
 const id=u.hostname==='youtu.be'?parts[0]:u.pathname==='/watch'?u.searchParams.get('v'):['shorts','live','embed'].includes(parts[0]||'')?parts[1]:''
 if(!id||!/^[-\w]{11}$/.test(id))throw new UpstreamApiError('Enter a YouTube video URL with a valid video ID.',400,'INVALID_REQUEST')
 return `https://www.youtube.com/watch?v=${id}`
}
function settings(){
 const raw=process.env.AUDIXO_YTDL_BASE_URL?.trim()
 if(!raw)throw new UpstreamApiError('AUDIXO_YTDL_BASE_URL is missing in Vercel.',503,'SERVICE_CONFIG')
 let url:URL
 try{url=new URL(raw)}catch{throw new UpstreamApiError('Invalid AUDIXO_YTDL_BASE_URL.',503,'SERVICE_CONFIG')}
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.port||/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname))throw new UpstreamApiError('The YTDL base URL must be a public HTTPS origin.',503,'SERVICE_CONFIG')
 const headers:Record<string,string>={Accept:'application/json'}
 if(process.env.AUDIXO_YTDL_AUTH_TOKEN?.trim()){
  const scheme=process.env.AUDIXO_YTDL_AUTH_SCHEME?.trim()||'Bearer'
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,25}$/.test(scheme))throw new UpstreamApiError('Invalid YTDL API auth scheme.',503,'SERVICE_CONFIG')
  headers.Authorization=`${scheme} ${process.env.AUDIXO_YTDL_AUTH_TOKEN.trim()}`
 }
 if(process.env.AUDIXO_YTDL_COOKIE?.trim())headers.Cookie=process.env.AUDIXO_YTDL_COOKIE.trim()
 return {origin:url.origin,headers}
}
async function request(path:string,options:RequestInit={},timeout=30000){
 const {origin,headers}=settings()
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout)
 try{
  const res=await fetch(origin+path,{...options,headers:{...headers,...options.headers},redirect:'manual',signal:controller.signal,cache:'no-store'})
  if(res.status>=300&&res.status<400){await res.body?.cancel().catch(()=>{});throw new UpstreamApiError('YTDL service redirected the request. Check private API authentication.',502,'SERVICE_AUTH')}
  return res
 }catch(error){
  if(error instanceof UpstreamApiError)throw error
  throw new UpstreamApiError(controller.signal.aborted?'YTDL server did not respond in time.':'Cannot reach the YTDL origin; check Cloudflare, DNS and the backend service.',503,'ORIGIN_UNAVAILABLE')
 }finally{clearTimeout(timer)}
}
export function classifyMediaError(message:string):{code:MediaErrorCode;status:number}{
 if(/requested format.*not available|quality.*not available|unsupported resolution|resolution.*not supported|format.*unavailable|QUALITY_UNAVAILABLE/i.test(message))return {code:'QUALITY_UNAVAILABLE',status:422}
 if(/YouTube rejected|unable to download (?:video |audio )?data|googlevideo.*403|n challenge|bot verification|page needs to be reloaded|expired.*cookie|source.*forbidden|SOURCE_FORBIDDEN/i.test(message))return {code:'SOURCE_FORBIDDEN',status:502}
 if(/quality mismatch|output.*resolution.*does not match/i.test(message))return {code:'QUALITY_MISMATCH',status:422}
 if(/Cloudflare|origin.*unavailable|incomplete response/i.test(message))return {code:'ORIGIN_UNAVAILABLE',status:503}
 if(/429|rate limit|too many requests|concurrent.*limit/i.test(message))return {code:'UPSTREAM_LIMIT',status:429}
 if(/401|403|forbidden|unauthorized|authentication|login page|redirected/i.test(message))return {code:'SERVICE_AUTH',status:502}
 if(/missing.*YTDL|base URL|public HTTPS/i.test(message))return {code:'SERVICE_CONFIG',status:503}
 if(/invalid|paste a valid|video URL|video ID/i.test(message))return {code:'INVALID_REQUEST',status:400}
 return {code:'UPSTREAM_ERROR',status:502}
}
function unwrap(v:any):any{return v?.data&&typeof v.data==='object'?v.data:v?.result&&typeof v.result==='object'?v.result:v}
const validCode=(raw:unknown):MediaErrorCode|null=>typeof raw==='string'&&CODE_SET.has(raw.toUpperCase())?raw.toUpperCase() as MediaErrorCode:null
const errorText=(value:any)=>{
 const raw=value?.error??value?.message??value?.detail
 if(typeof raw==='string')return raw.slice(0,600)
 if(raw&&typeof raw==='object')return String(raw.message??raw.error??'Remote API rejected the request.').slice(0,600)
 return 'Remote conversion API failed.'
}
const returnedQualities=(data:any):string[]|undefined=>{
 const raw=data?.available_qualities??data?.availableQualities??data?.details?.available_qualities
 if(!Array.isArray(raw))return undefined
 return raw.map((v:any)=>typeof v==='string'?v:String(v?.quality??v?.value??'')).filter((v:string)=>SUPPORTED.has(v))
}
async function json(path:string,body?:Record<string,unknown>,timeout=30000){
 const res=await request(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{method:'GET'},timeout)
 if(CF_ORIGIN_STATUSES.has(res.status)){
  await res.body?.cancel().catch(()=>{})
  throw new UpstreamApiError(`Cloudflare HTTP ${res.status}: YTDL origin is unavailable. Check origin health and logs.`,503,'ORIGIN_UNAVAILABLE')
 }
 const type=(res.headers.get('content-type')||'').toLowerCase()
 const data=type.includes('json')?await res.json().catch(()=>null):null
 if(!type.includes('json'))await res.body?.cancel().catch(()=>{})
 if(!res.ok||data?.ok===false){
  const message=errorText(data)
  const specific=validCode(data?.code??data?.error?.code??data?.detail?.code)
  const inferred=classifyMediaError(message)
  const generic:MediaErrorCode=res.status===429?'UPSTREAM_LIMIT':res.status===401||res.status===403?'SERVICE_AUTH':res.status===400||res.status===422?'UPSTREAM_VALIDATION':res.status===404?'FILE_UNAVAILABLE':'UPSTREAM_ERROR'
  const chosen=specific??(inferred.code!=='UPSTREAM_ERROR'?inferred.code:generic)
  const status=chosen==='QUALITY_UNAVAILABLE'||chosen==='QUALITY_MISMATCH'?422:chosen==='ORIGIN_UNAVAILABLE'?503:chosen==='UPSTREAM_LIMIT'?429:chosen==='INVALID_REQUEST'?400:chosen==='UPSTREAM_VALIDATION'?422:chosen==='SOURCE_FORBIDDEN'||chosen==='SERVICE_AUTH'?502:res.status>=400&&res.status<600?res.status:502
  throw new UpstreamApiError(message||`YTDL API HTTP ${res.status}`,status,chosen,returnedQualities(data))
 }
 if(!data||typeof data!=='object')throw new UpstreamApiError('The conversion service returned HTML/text instead of valid JSON.',503,'ORIGIN_UNAVAILABLE')
 return data
}
function duration(v:unknown){
 if(typeof v==='number')return Number.isFinite(v)?Math.max(0,v):0
 if(typeof v==='string'&&/^\d+(?::\d{1,2}){1,2}$/.test(v))return v.split(':').reduce((a,c)=>a*60+Number(c),0)
 return Number.isFinite(Number(v))?Math.max(0,Number(v)):0
}
const QUALITY_LABELS:Record<string,string>={'240':'SD','360':'SD','480':'SD','720':'HD','1080':'Full HD','1440':'QHD','2160':'4K'}
/** MP4 source availability is supplied only by /api/preview; never by
 * the application's global resolution scale or generic yt-dlp `formats`.
 *
 * New origin API: available_qualities entries with downloadable:true and
 * verified video/merge metadata. Older origin API: explicit `qualities` or
 * `supported_qualities` lists (e.g. ["360", "720"] or [{value:"720",label:"720p"}]).
 * The older shape is an upstream DECLARATION, not proof that a stream can be
 * fetched; /api/download still has to validate the exact requested height.
 * We don't infer availability from max_height, raw formats, or labels alone.
 */
export function confirmedMp4Qualities(payload:any):Quality[]{
 const candidates:any[]=[payload,unwrap(payload),unwrap(unwrap(payload))]
 let entries:any[]|undefined
 let authoritative=false
 // If canonical list exists, it wins even if it is empty. No fallback to a
 // stale, generic legacy field when the origin reports zero real formats.
 for(const obj of candidates){
  if(!obj||typeof obj!=='object')continue
  if(Array.isArray(obj.available_qualities)){entries=obj.available_qualities;authoritative=true;break}
  if(Array.isArray(obj.availableQualities)){entries=obj.availableQualities;authoritative=true;break}
 }
 if(!entries){
  for(const obj of candidates){
   if(!obj||typeof obj!=='object')continue
   for(const field of ['qualities','supported_qualities','video_qualities','available_resolutions']){
    if(Array.isArray(obj[field])){entries=obj[field];break}
    if(Array.isArray(obj[field]?.mp4)){entries=obj[field].mp4;break}
   }
   if(entries)break
  }
 }
 if(!entries)return []
 const found=new Set<string>()
 for(const raw of entries){
  if(raw===null||raw===undefined)continue
  if(typeof raw==='string'||typeof raw==='number'){
   const value=String(raw).trim().replace(/p$/i,'')
   // A value from the origin's declared resolutions IS a format claim;
   // a number in generic yt-dlp metadata is NOT, and isn't scanned here.
   if(SUPPORTED.has(value))found.add(value)
   continue
  }
  if(typeof raw!=='object'||Array.isArray(raw))continue
  if(raw.downloadable===false||raw.available===false||raw.supported===false||raw.drm===true||raw.has_drm===true||raw.is_drm===true||raw.unusable===true||raw.audio_downloadable===false||raw.audio_available===false)continue
  if(String(raw.vcodec??'').toLowerCase()==='none'||String(raw.type??raw.stream_type??'').toLowerCase()==='audio')continue
  const field=raw.quality??raw.value??raw.resolution??raw.height
  const value=String(field??'').trim().replace(/p$/i,'')
  if(!SUPPORTED.has(value))continue
  const hasRawHeight=raw.height!==undefined&&raw.height!==null&&raw.height!==''
  const hasRawWidth=raw.width!==undefined&&raw.width!==null&&raw.width!==''
  const height=Number(raw.height),width=Number(raw.width)
  if(hasRawHeight&&(!Number.isInteger(height)||height!==Number(value)))continue
  if(hasRawWidth&&(!Number.isInteger(width)||width<=0))continue
  const container=String(raw.output_container??raw.container??raw.ext??'').toLowerCase()
  if(container&&!['mp4','video/mp4'].includes(container))continue
  if(authoritative){
   // Detailed canonical formats MUST explicitly guarantee usability, but
   // compact old-style {value,label} canonical lists are kept compatible.
   const hasFormatEvidence=hasRawHeight||hasRawWidth||Boolean(raw.format_id??raw.formatId??raw.vcodec??raw.type)
   if(hasFormatEvidence){
    if(raw.downloadable!==true||!hasRawHeight||!hasRawWidth||!container)continue
    if(!String(raw.format_id??raw.formatId??raw.vcodec??'').trim()&&String(raw.type??'').toLowerCase()!=='video')continue
   }
  }else{
   // A raw extractor format object lacking a confirmed downloadable flag
   // is not a selectable quality. A short {value,label} preview entry is.
   const looksLikeExtractorFormat=hasRawHeight||hasRawWidth||Boolean(raw.format_id??raw.formatId??raw.vcodec??raw.acodec??raw.type)
   if(looksLikeExtractorFormat){
    if(raw.downloadable!==true||!hasRawHeight||!hasRawWidth||!container)continue
    if(!String(raw.format_id??raw.formatId??raw.vcodec??'').trim()&&String(raw.type??'').toLowerCase()!=='video')continue
   }
  }
  found.add(value)
 }
 return [...found].sort((a,b)=>Number(a)-Number(b)).map(value=>({value,label:`${value}p${Number(value)>=720?` - ${QUALITY_LABELS[value]}`:''}`}))
}
export function buildDownloadBody(url:string,format:Kind,quality:string){
 if(format==='mp4'){
  if(!SUPPORTED.has(quality))throw new UpstreamApiError('Select an available MP4 resolution.',400,'INVALID_REQUEST')
  return {url,format:'mp4',quality}
 }
 return {url,format:'mp3'} // Legacy {url} retry remains supported.
}
function outputDimensions(value:any){
 const v=unwrap(value)||{}
 const output=v.output??v.output_info??v.file_info??v.ffprobe??{}
 const stream=Array.isArray(output.streams)?output.streams.find((x:any)=>x.codec_type==='video'):undefined
 const width=Number(v.actual_width??v.output_width??output.width??stream?.width)
 const height=Number(v.actual_height??v.output_height??output.height??stream?.height)
 return {reportedWidth:Number.isInteger(width)&&width>0?width:undefined,reportedHeight:Number.isInteger(height)&&height>0?height:undefined}
}
const actualBitrate=(value:any)=>{
 const v=unwrap(value)||{}
 const raw=v.actual_audio_bitrate_kbps??v.output_audio_bitrate_kbps??v.actual_bitrate_kbps??v.result?.audio_bitrate_kbps
 const num=Number(String(raw??'').replace(/\s*kbps/i,''))
 return Number.isFinite(num)&&num>=32&&num<=512?Math.round(num):undefined
}
export function normalizeJob(value:any,idFallback='',format:Kind='mp3',fileVerified=false,requestedQuality=''){
 const v=unwrap(value)||{},raw=String(v.status??v.state??v.phase??'queued').toLowerCase()
 let state:'queued'|'processing'|'complete'|'failed'=/^(completed|complete|done|ready|finished|success|succeeded)$/.test(raw)?'complete':/^(failed|failure|error|cancelled|canceled|rejected)$/.test(raw)?'failed':/^(processing|running|downloading|converting|working|in_progress)$/.test(raw)?'processing':'queued'
 const pathId=String(v.status_url??'').match(/\/api\/download\/status\/([\w-]+)(?:[?#]|$)/)?.[1]
 const id=String(v.job_id??v.jobId??v.id??pathId??idFallback)
 const rawProgress=Number(v.progress??v.percent??0)
 const progress=Number.isFinite(rawProgress)?Math.min(100,Math.max(0,rawProgress>0&&rawProgress<1?rawProgress*100:rawProgress)):0
 const dims=outputDimensions(value)
 let errorCode:MediaErrorCode|undefined=state==='failed'?(validCode(v.code??v.error_code)??(classifyMediaError(String(v.error??v.detail??'')).code==='UPSTREAM_ERROR'?'JOB_FAILED':classifyMediaError(String(v.error??v.detail??'')).code)):undefined
 let error=text(v.error??v.detail??'',300)
 if(format==='mp4'&&state==='complete'&&requestedQuality&&dims.reportedHeight&&dims.reportedHeight!==Number(requestedQuality)){
  state='failed';errorCode='QUALITY_MISMATCH';error=`The API produced ${dims.reportedHeight}p instead of ${requestedQuality}p.`
 }
 if(state==='complete'&&!JOB_ID.test(id)){state='failed';errorCode='JOB_FAILED';error='The conversion finished without a valid job ID.'}
 if(state==='complete'&&!fileVerified)state='processing'
 const message=state==='processing'&&/^(complete|completed|ready|done|finished|success|succeeded)$/.test(raw)&&!fileVerified?'Finalizing output file...':text(v.message??'',180)
 return {id,format,state,progress,title:text(v.title??v.video_title??'',160),error,errorCode,message,...dims,reportedKbps:actualBitrate(value),files:state==='complete'&&JOB_ID.test(id)?[{name:format.toUpperCase(),url:`/api/media?action=file&id=${encodeURIComponent(id)}&format=${format}`,fileName:niceName(v.title,format)}]:[]}
}
function validateFileType(response:Response,format:Kind){
 const type=(response.headers.get('content-type')??'').toLowerCase().split(';')[0].trim()
 if(!type||type.startsWith('text/')||/json|html|xml/.test(type)||format==='mp4'&&type.startsWith('audio/')||format==='mp3'&&type.startsWith('video/'))throw new UpstreamApiError('YTDL returned a non-media or incorrect file type.',502,'WRONG_FILE_TYPE')
 const valid=type==='application/octet-stream'||type==='application/binary'||type==='binary/octet-stream'||(format==='mp4'?type==='video/mp4':['audio/mpeg','audio/mp3','audio/x-mpeg','audio/x-mp3'].includes(type))
 if(!valid)throw new UpstreamApiError(`YTDL returned a ${type||'missing'} content type instead of a compatible ${format.toUpperCase()} file.`,502,'WRONG_FILE_TYPE')
}
function remoteFileFailure(status:number){
 if(CF_ORIGIN_STATUSES.has(status))return new UpstreamApiError(`Cloudflare HTTP ${status}: the remote file origin is unavailable.`,503,'ORIGIN_UNAVAILABLE')
 if(status===401||status===403)return new UpstreamApiError(`File endpoint access denied (HTTP ${status}).`,502,'FILE_FORBIDDEN')
 return new UpstreamApiError(`Conversion output file not available (HTTP ${status}).`,status===404?404:502,'FILE_UNAVAILABLE')
}
/** Probe a completed job without downloading/buffering its full media file.
 * Falls back to a 1-byte GET if upstream HEAD is not implemented.
 */
export async function probeOutput(id:string,format:Kind){
 const path=`/api/download/file/${encodeURIComponent(id)}`
 let response=await request(path,{method:'HEAD',headers:{Accept:format==='mp4'?'video/mp4, application/octet-stream':'audio/mpeg, application/octet-stream'}},18000)
 let rangeFallback=false
 const headSize=Number(response.headers.get('content-length')??NaN)
 // Some older YTDL servers expose GET files but respond 404/403 to HEAD.
 // Confirm with a tiny Range GET before concluding that a completed job is gone.
 if([403,404,405,501].includes(response.status)||(response.ok&&(!Number.isFinite(headSize)||headSize<=0))){
  await response.body?.cancel().catch(()=>{})
  response=await request(path,{method:'GET',headers:{Range:'bytes=0-0',Accept:format==='mp4'?'video/mp4, application/octet-stream':'audio/mpeg, application/octet-stream'}},18000)
  rangeFallback=true
 }
 try{
  if(!response.ok)throw remoteFileFailure(response.status)
  validateFileType(response,format)
  const range=response.headers.get('content-range')??''
  const length=Number(response.headers.get('content-length')??NaN)
  const total=rangeFallback?Number(range.match(/\/(\d+)$/)?.[1]??NaN):length
  if(!Number.isFinite(total)||total<=0)throw new UpstreamApiError('The completed media file has no confirmed non-zero size.',502,'FILE_UNAVAILABLE')
  // A 200 response to the 1-byte probe can be accepted only when a known finite
  // size is available; the body is cancelled immediately and never buffered.
  return {size:total,contentType:response.headers.get('content-type')??''}
 }finally{await response.body?.cancel().catch(()=>{})}
}
async function verifiedJob(value:any,idFallback:string,format:Kind,requestedQuality=''){
 let current=normalizeJob(value,idFallback,format,false,requestedQuality)
 if(current.state!=='processing'||current.message!=='Finalizing output file...')return current
 try{await probeOutput(current.id,format);return normalizeJob(value,idFallback,format,true,requestedQuality)}
 catch(error){
  if(error instanceof UpstreamApiError&&['FILE_FORBIDDEN','WRONG_FILE_TYPE'].includes(error.code))return {...current,state:'failed' as const,error:error.message,errorCode:error.code,message:'',files:[]}
  // A not-yet-readable file remains processing; never report fake completion.
  return current
 }
}
async function verifyHuman(token:unknown,req:any){
 const secret=process.env.AUDIXO_TURNSTILE_SECRET_KEY?.trim()
 if(!secret){if(token)throw new UpstreamApiError('Turnstile is enabled in the UI but the backend secret is missing.',503,'BOT_CHECK_CONFIG');return}
 if(typeof token!=='string'||token.length<10||token.length>2100)throw new UpstreamApiError('Complete the security check before downloading.',400,'BOT_CHECK_REQUIRED')
 const form=new URLSearchParams({secret,response:token})
 const ip=String(req.headers?.['x-forwarded-for']??'').split(',')[0].trim()
 if(ip&&ip.length<64)form.set('remoteip',ip)
 let response:Response
 try{response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form,signal:AbortSignal.timeout(13000),cache:'no-store'})}
 catch{throw new UpstreamApiError('Human verification service is temporarily unavailable.',503,'BOT_CHECK_UNAVAILABLE')}
 const answer=await response.json().catch(()=>null)
 if(!response.ok||answer?.success!==true)throw new UpstreamApiError('Human verification expired or failed.',400,'BOT_CHECK_FAILED')
}
const httpCodeStatus=(code:MediaErrorCode,status:number)=>{
 if(code==='QUALITY_UNAVAILABLE'||code==='QUALITY_MISMATCH'||code==='UPSTREAM_VALIDATION')return 422
 if(code==='INVALID_REQUEST'||code==='BOT_CHECK_REQUIRED'||code==='BOT_CHECK_FAILED')return 400
 if(code==='ORIGIN_UNAVAILABLE'||code==='SERVICE_CONFIG'||code==='BOT_CHECK_CONFIG'||code==='BOT_CHECK_UNAVAILABLE')return 503
 if(code==='UPSTREAM_LIMIT')return 429
 if(code==='FILE_UNAVAILABLE')return 404
 return status>=500&&status<=599?status:502
}
function fail(res:any,error:unknown){
 const message=error instanceof Error?error.message:'Media service unavailable.'
 const info=error instanceof UpstreamApiError?{code:error.code,status:error.status,available_qualities:error.availableQualities}:classifyMediaError(message)
 return res.status(httpCodeStatus(info.code,info.status)).json({error:text(message,500),code:info.code,...('available_qualities' in info&&info.available_qualities?{available_qualities:info.available_qualities}:{})})
}
function setFileHeaders(res:any,response:Response,format:Kind,fileName:string,headRangeFallback=false){
 const escaped=encodeURIComponent(fileName).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())
 res.setHeader('Content-Type',format==='mp4'?'video/mp4':'audio/mpeg')
 res.setHeader('Content-Disposition',`attachment; filename="Audixo.${format}"; filename*=UTF-8''${escaped}`)
 const range=response.headers.get('content-range')
 const total=headRangeFallback?range?.match(/\/(\d+)$/)?.[1]:undefined
 const length=total??response.headers.get('content-length')
 if(length&&/^\d+$/.test(length))res.setHeader('Content-Length',length)
 if(!headRangeFallback&&range)res.setHeader('Content-Range',range)
 const accepts=response.headers.get('accept-ranges');if(accepts)res.setHeader('Accept-Ranges',accepts)
}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','private, no-store, max-age=0')
 res.setHeader('X-Content-Type-Options','nosniff')
 res.setHeader('Referrer-Policy','no-referrer')
 const action=String(req.query?.action??'')
 try{
  if(action==='file'){
   if(!['GET','HEAD'].includes(req.method))return res.status(405).json({error:'Use GET or HEAD to download.',code:'INVALID_REQUEST'})
   const id=String(req.query?.id??'');if(!JOB_ID.test(id))throw new UpstreamApiError('Invalid job ID.',400,'INVALID_REQUEST')
   const format=kind(req.query?.format),fileName=niceName(req.query?.title,format)
   const range=String(req.headers?.range??'')
   if(range&&!/^bytes=\d*-\d*$/.test(range))return res.status(416).json({error:'Invalid byte range.',code:'INVALID_REQUEST'})
   const accept=format==='mp4'?'video/mp4, application/octet-stream':'audio/mpeg, application/octet-stream'
   let upstream=await request(`/api/download/file/${encodeURIComponent(id)}`,{method:req.method==='HEAD'?'HEAD':'GET',headers:{Accept:accept,...(range?{Range:range}:{})}},55000)
   let headRangeFallback=false
   const knownHeadSize=Number(upstream.headers.get('content-length')??NaN)
   if(req.method==='HEAD'&&([403,404,405,501].includes(upstream.status)||(upstream.ok&&(!Number.isFinite(knownHeadSize)||knownHeadSize<=0)))){
    await upstream.body?.cancel().catch(()=>{})
    upstream=await request(`/api/download/file/${encodeURIComponent(id)}`,{method:'GET',headers:{Accept:accept,Range:'bytes=0-0'}},55000)
    headRangeFallback=true
   }
   if(!upstream.ok){await upstream.body?.cancel().catch(()=>{});throw remoteFileFailure(upstream.status)}
   try{validateFileType(upstream,format)}catch(error){await upstream.body?.cancel().catch(()=>{});throw error}
   const n=Number(upstream.headers.get('content-length')??NaN)
   const rangeTotal=Number(upstream.headers.get('content-range')?.match(/\/(\d+)$/)?.[1]??NaN)
   if(req.method==='HEAD'&&!(headRangeFallback?rangeTotal>0:n>0)){
    await upstream.body?.cancel().catch(()=>{});throw new UpstreamApiError('The media output does not have a verified non-zero length.',502,'FILE_UNAVAILABLE')
   }
   if(req.method!=='HEAD'&&!upstream.body){throw new UpstreamApiError('The output media response was empty.',502,'FILE_UNAVAILABLE')}
   if(req.method==='HEAD'){
    setFileHeaders(res,upstream,format,fileName,headRangeFallback)
    res.status(headRangeFallback?200:upstream.status)
    await upstream.body?.cancel().catch(()=>{})
    return res.end()
   }
   // Sniff the FIRST streamed chunk to reject an HTML/JSON error page even if
   // the upstream mislabels it as application/octet-stream. Never buffer the file.
   const body=upstream.body!
   if(!range){
    const reader=body.getReader()
    const first=await reader.read()
    if(first.done||!first.value?.byteLength){await reader.cancel().catch(()=>{});throw new UpstreamApiError('Output media stream was empty.',502,'FILE_UNAVAILABLE')}
    const leading=Buffer.from(first.value)
    const prefix=leading.subarray(0,96).toString('utf8').trimStart()
    const disguisedText=/^(?:<!doctype|<html|<\?xml|\{|\[)/i.test(prefix)
    const isMp4=leading.length>=8&&['ftyp','styp','moof','moov','free','wide'].includes(leading.subarray(4,8).toString('latin1'))
    const isMp3=(leading.length>=3&&leading.subarray(0,3).toString('latin1')==='ID3')||(leading.length>=2&&leading[0]===255&&(leading[1]&224)===224)
    if(disguisedText||leading.length>=8&&!(format==='mp4'?isMp4:isMp3)){
     await reader.cancel().catch(()=>{})
     throw new UpstreamApiError('YTDL sent invalid MP3/MP4 bytes or an HTML/JSON error page instead of the requested media.',502,'WRONG_FILE_TYPE')
    }
    setFileHeaders(res,upstream,format,fileName,false)
    res.status(upstream.status)
    async function* chunks(){
     try{
      yield Buffer.from(first.value)
      for(;;){const item=await reader.read();if(item.done)break;yield Buffer.from(item.value)}
     }finally{reader.releaseLock()}
    }
    await pipeline(Readable.from(chunks()),res)
   }else{
    setFileHeaders(res,upstream,format,fileName,false)
    res.status(upstream.status)
    await pipeline(Readable.fromWeb(body as any),res)
   }
   return
  }
  if(req.method!=='POST')return res.status(405).json({error:'Use POST.',code:'INVALID_REQUEST'})
  if(action==='health'){
   if(!process.env.AUDIXO_YTDL_BASE_URL)return res.status(200).json({ready:false,message:'Configure AUDIXO_YTDL_BASE_URL in Vercel.'})
   const v=unwrap(await json('/ytdl/status',undefined,12000))
   const operational=v.ok===true||v.ready===true||v.status==='ready'||v.status==='ok'
   return res.status(200).json({ready:!!(operational&&v.authenticated!==false),authenticated:v.authenticated===true,maxConcurrent:Number(v.max_concurrent??v.maxConcurrent??0),message:operational?'':'YTDL service reports it is not ready.'})
  }
  if(action==='meta'){
   const url=youtube(req.body?.url),raw=await json('/api/preview',{url},40000),v=unwrap(unwrap(raw))
   const id=new URL(url).searchParams.get('v')
   return res.status(200).json({url,title:text(v.title??v.video_title??v.video?.title??'YouTube video',180),author:text(v.author??v.channel??v.uploader??'',100),duration:duration(v.duration??v.length_seconds??v.video?.duration),thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,qualities:confirmedMp4Qualities(raw)})
  }
  if(action==='convert'){
   const url=youtube(req.body?.url),format=kind(req.body?.format),quality=String(req.body?.quality??'')
   if(format==='mp4'){
    if(!SUPPORTED.has(quality))throw new UpstreamApiError('Select a valid MP4 resolution.',400,'INVALID_REQUEST')
    // Server-side revalidation on every MP4 request; no trust in a client slider.
    const fresh=confirmedMp4Qualities(await json('/api/preview',{url},40000))
    if(!fresh.some(q=>q.value===quality))throw new UpstreamApiError(`${quality}p is not available for this video.`,422,'QUALITY_UNAVAILABLE',fresh.map(q=>q.value))
   }
   await verifyHuman(req.body?.turnstileToken,req)
   const body=buildDownloadBody(url,format,quality)
   let value:any
   try{value=await json('/api/download',body,55000)}
   catch(error){
    // Legacy MP3-only servers accept {url}. Never retry auth, 403, or origin errors.
    if(format==='mp3'&&error instanceof UpstreamApiError&&error.code==='UPSTREAM_VALIDATION'&&/format|unexpected|extra|field|parameter|schema|input|unknown/i.test(error.message))value=await json('/api/download',{url},55000)
    else throw error
   }
   const record=normalizeJob(value,'',format,false,quality)
   if(!JOB_ID.test(record.id))throw new UpstreamApiError('YTDL server did not return a valid job ID.',502,'JOB_FAILED')
   return res.status(200).json({...record,requestedQuality:format==='mp4'?quality:undefined})
  }
  if(action==='status'){
   const id=String(req.body?.id??'');if(!JOB_ID.test(id))throw new UpstreamApiError('Invalid job ID.',400,'INVALID_REQUEST')
   const format=kind(req.body?.format)
   const quality=format==='mp4'?String(req.body?.quality??''):''
   if(quality&&!SUPPORTED.has(quality))throw new UpstreamApiError('Invalid requested quality for job.',400,'INVALID_REQUEST')
   return res.status(200).json(await verifiedJob(await json(`/api/download/status/${encodeURIComponent(id)}`,undefined,24000),id,format,quality))
  }
  return res.status(400).json({error:'Unknown media action.',code:'INVALID_REQUEST'})
 }catch(error){if(res.headersSent){res.destroy?.(error instanceof Error?error:undefined);return}return fail(res,error)}
}
