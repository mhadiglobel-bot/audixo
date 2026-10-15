/** AUDIXO V51 — Vercel Node.js server-only adapter for the owner's REST YTDL API.
 * Convert URLs only when the user has the right to download/transform the media.
 * Keep AUDIXO_YTDL_AUTH_TOKEN private; no VITE_ prefixed secret.
 */
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const YT_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'])
const MP4_QUALITIES=['240','360','480','720','1080','1440','2160'] as const
const SUPPORTED=new Set<string>(MP4_QUALITIES)
const JOB_ID=/^[\w-]{1,128}$/
type Kind='mp3'|'mp4'
const text=(v:unknown,max=150)=>String(v??'').replace(/[\u0000-\u001f\u007f<>\\/|:*?"']/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
const kind=(v:unknown):Kind=>{if(v!==undefined&&v!==''&&v!=='mp3'&&v!=='mp4')throw Error('Invalid media format.');return v==='mp4'?'mp4':'mp3'}
const niceName=(title:unknown,format:Kind)=>{
 const cleaned=text(title||'YouTube audio',145).replace(/\s*\(Audixo (?:MP3|MP4)\)\s*$/i,'').replace(/\.(?:mp3|mp4)$/i,'').replace(/[. ]+$/,'')||'YouTube audio'
 return `${cleaned} (Audixo ${format.toUpperCase()}).${format}`
}
const youtube=(raw:unknown)=>{
 let u:URL
 try{u=new URL(String(raw||''))}catch{throw Error('Paste a valid YouTube video URL.')}
 if(u.protocol!=='https:'||!YT_HOSTS.has(u.hostname)||u.username||u.password)throw Error('Paste a valid HTTPS YouTube URL.')
 const parts=u.pathname.split('/').filter(Boolean)
 const id=u.hostname==='youtu.be'?parts[0]:u.pathname==='/watch'?u.searchParams.get('v'):['shorts','live','embed'].includes(parts[0]||'')?parts[1]:''
 if(!id||!/^[-\w]{11}$/.test(id))throw Error('Enter a YouTube video URL with a valid video ID.')
 return `https://www.youtube.com/watch?v=${id}`
}
function settings(){
 const raw=process.env.AUDIXO_YTDL_BASE_URL?.trim()
 if(!raw)throw Error('AUDIXO_YTDL_BASE_URL is missing. Set it in Vercel Environment Variables.')
 let url:URL
 try{url=new URL(raw)}catch{throw Error('Invalid AUDIXO_YTDL_BASE_URL.')}
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.port||/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname))throw Error('The YTDL base URL must be a public HTTPS origin, without /download.')
 const headers:Record<string,string>={Accept:'application/json'}
 if(process.env.AUDIXO_YTDL_AUTH_TOKEN?.trim()){
  const scheme=process.env.AUDIXO_YTDL_AUTH_SCHEME?.trim()||'Bearer'
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,25}$/.test(scheme))throw Error('Invalid API auth scheme.')
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
  if(res.status>=300&&res.status<400)throw Error('Media API redirected to another page. Check authentication on the API server.')
  return res
 }finally{clearTimeout(timer)}
}
export function classifyMediaError(message:string){
 if(/403|forbidden/i.test(message)&&/unable to download (?:video |audio )?data|googlevideo|source/i.test(message))return {code:'SOURCE_FORBIDDEN',status:502}
 if(/requested format.*not available|quality.*not available|unsupported resolution/i.test(message))return {code:'QUALITY_UNAVAILABLE',status:422}
 if(/401|403|forbidden|unauthorized|authentication|login page|redirected/i.test(message))return {code:'SERVICE_AUTH',status:502}
 if(/missing|base URL|public HTTPS/i.test(message))return {code:'SERVICE_CONFIG',status:503}
 if(/invalid|paste a valid|select a valid|video URL|video ID/i.test(message))return {code:'INVALID_REQUEST',status:400}
 return {code:'UPSTREAM_ERROR',status:502}
}
export function buildDownloadBody(url:string,format:Kind,quality:string){
 if(format==='mp4'){
  if(!SUPPORTED.has(quality))throw Error('Select a valid MP4 resolution.')
  return {url,format:'mp4',quality}
 }
 // Documented MP3 contract. The owner's service sets its own default encoder rate.
 return {url,format:'mp3'}
}
function outputDimensions(value:any){
 const v=unwrap(value)||{}
 const output=v.output??v.output_info??v.file_info??v.ffprobe??{}
 const stream=Array.isArray(output.streams)?output.streams.find((x:any)=>x.codec_type==='video'):undefined
 const w=Number(v.actual_width??v.output_width??output.width??stream?.width)
 const h=Number(v.actual_height??v.output_height??output.height??stream?.height)
 return {reportedWidth:Number.isFinite(w)&&w>0?w:undefined,reportedHeight:Number.isFinite(h)&&h>0?h:undefined}
}
async function json(path:string,body?:Record<string,unknown>,timeout=30000){
 const res=await request(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{method:'GET'},timeout)
 const type=res.headers.get('content-type')||''
 const data=await res.json().catch(()=>null)
 if(!res.ok){const error=data?.detail??data?.error??data?.message;throw Error(typeof error==='string'?error:`REST YTDL API returned HTTP ${res.status}.`)}
 if(!type.includes('json')||!data||typeof data!=='object')throw Error('The API returned a login page or non-JSON response. Check server authentication.')
 if(data.ok===false)throw Error(String(data.error||data.message||'The conversion request was rejected.'))
 return data
}
const unwrap=(v:any)=>v?.data&&typeof v.data==='object'?v.data:v?.result&&typeof v.result==='object'?v.result:v
function duration(v:unknown){
 if(typeof v==='number')return Number.isFinite(v)?Math.max(0,v):0
 if(typeof v==='string'&&/^\d+(?::\d{1,2}){1,2}$/.test(v))return v.split(':').reduce((a,c)=>a*60+Number(c),0)
 return Number.isFinite(Number(v))?Math.max(0,Number(v)):0
}
function qualities(payload:any){
 // Several REST YTDL API releases return resolution lists in different places.
 // Read the original envelope AND its nested data/result/metadata wrappers.
 const views:any[]=[]
 const pending=[payload]
 const seen=new Set<any>()
 while(pending.length&&views.length<16){
  const item=pending.shift()
  if(!item||typeof item!=='object'||seen.has(item))continue
  seen.add(item);views.push(item)
  for(const key of ['data','result','metadata','video','info','details']){
   if(item[key]&&typeof item[key]==='object'&&!Array.isArray(item[key]))pending.push(item[key])
  }
 }
 const result:{value:string;label:string}[]=[]
 const add=(raw:unknown)=>{
  let candidate:string
  if(typeof raw==='string'||typeof raw==='number')candidate=String(raw)
  else if(raw&&typeof raw==='object'){
   const item=raw as Record<string,unknown>
   if(item.available===false||item.supported===false||item.vcodec==='none') return
   candidate=String(item.value??item.quality??item.resolution??(Number(item.width)>0&&Number(item.height)>0?Math.min(Number(item.width),Number(item.height)):item.height)??item.label??'')
  }else return
  // Recognize 1080, 1080p, 1920x1080; do not fabricate unreported qualities.
  const match=candidate.trim().match(/^(?:(?:\d{2,5}\s*[xX]\s*)?)(240|360|480|720|1080|1440|2160)(?:\s*p)?$/i)
  if(!match)return
  const value=match[1]
  if(SUPPORTED.has(value)&&!result.some(x=>x.value===value))result.push({value,label:`${value}p${value==='1080'?' - Full HD':value==='1440'?' - QHD':value==='2160'?' - 4K':''}`})
 }
 for(const view of views){
  for(const key of ['qualities','supported_qualities','video_qualities','videoQualities','available_qualities','availableQualities','resolutions','available_resolutions','video_formats','videoFormats','formats']){
   const value=view[key]
   if(Array.isArray(value))value.forEach(add)
   else if(value&&typeof value==='object'){
    const video=(value as any).mp4??(value as any).video
    if(Array.isArray(video))video.forEach(add)
    else if(video&&typeof video==='object')Object.entries(video).forEach(([key,entry]:[string,any])=>{if(entry!==false&&entry?.available!==false&&entry?.supported!==false)add(key)})
    // Quality maps can also be {"720": {...}, "1080": {...}}.
    Object.entries(value).forEach(([key,entry]:[string,any])=>{if(entry!==false&&entry?.available!==false&&entry?.supported!==false)add(key)})
   }
  }
 }
 return result.sort((a,b)=>Number(a.value)-Number(b.value))
}
function actualBitrate(v:any){
 const raw=v.actual_audio_bitrate_kbps??v.output_audio_bitrate_kbps??v.actual_bitrate_kbps??v.result?.audio_bitrate_kbps
 const number=Number(String(raw??'').replace(/\s*kbps/i,''))
 return Number.isFinite(number)&&number>=32&&number<=512?Math.round(number):undefined
}
function normalizeJob(value:any,idFallback='',format:Kind='mp3'){
 const v=unwrap(value)||{}, raw=String(v.status||v.state||v.phase||'queued').toLowerCase()
 const state=/^(completed|complete|done|ready|finished|success|succeeded)$/.test(raw)?'complete':/^(failed|failure|error|cancelled|canceled|rejected)$/.test(raw)?'failed':/^(processing|running|downloading|converting|working|in_progress)$/.test(raw)?'processing':'queued'
 const pathId=String(v.status_url||'').match(/\/api\/download\/status\/([\w-]+)(?:[?#]|$)/)?.[1]
 const id=String(v.job_id||v.jobId||v.id||pathId||idFallback)
 let p=Number(v.progress??v.percent??0);p=Number.isFinite(p)?Math.min(100,Math.max(0,p>0&&p<1?p*100:p)):0
 const requestedKind=format // Trust the requested mode, not inconsistent upstream format labels.
 return {id,format:requestedKind,state,progress:p,title:text(v.title||v.video_title||'',160),error:text(v.error||v.detail||'',240),message:text(v.message||'',180),errorCode:state==='failed'?classifyMediaError(String(v.error||v.detail||'')).code:undefined,...outputDimensions(value),reportedKbps:actualBitrate(v),files:state==='complete'&&JOB_ID.test(id)?[{name:requestedKind.toUpperCase(),url:`/api/media?action=file&id=${encodeURIComponent(id)}&format=${requestedKind}`,fileName:niceName(v.title,requestedKind)}]:[]}
}
const fail=(res:any,error:unknown)=>{
 const msg=error instanceof Error?error.message:'Media service unavailable.'
 const info=classifyMediaError(msg)
 return res.status(info.status).json({error:text(msg,360),code:info.code})
}

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','private, no-store, max-age=0')
 res.setHeader('X-Content-Type-Options','nosniff')
 res.setHeader('Referrer-Policy','no-referrer')
 const action=String(req.query?.action||'')
 try{
  if(action==='file'){
   if(!['GET','HEAD'].includes(req.method))return res.status(405).json({error:'Use GET or HEAD to download.'})
   const id=String(req.query?.id||'');if(!JOB_ID.test(id))return res.status(400).json({error:'Invalid job ID.'})
   const format=kind(req.query?.format),fileName=niceName(req.query?.title,format)
   const range=String(req.headers?.range||'')
   if(range&&!/^bytes=\d*-\d*$/.test(range))return res.status(416).json({error:'Invalid byte range.'})
   const accept=format==='mp4'?'video/mp4, application/octet-stream':'audio/mpeg, application/octet-stream'
   const headers:Record<string,string>={Accept:accept}
   if(range)headers.Range=range
   let upstream=await request(`/api/download/file/${encodeURIComponent(id)}`,{method:req.method==='HEAD'?'HEAD':'GET',headers},55000)
   if(req.method==='HEAD'&&[405,501].includes(upstream.status)){
    await upstream.body?.cancel()
    upstream=await request(`/api/download/file/${encodeURIComponent(id)}`,{method:'GET',headers:{Accept:accept,Range:'bytes=0-0'}},55000)
   }
   if(!upstream.ok){await upstream.body?.cancel();return res.status(upstream.status).json({error:`Conversion file endpoint returned HTTP ${upstream.status}.`,code:upstream.status===403?'FILE_FORBIDDEN':'FILE_UNAVAILABLE'})}
   const responseType=(upstream.headers.get('content-type')||'').toLowerCase()
   const rejectType=responseType.startsWith('text/')||/json|xml|html/.test(responseType)||(format==='mp4'&&responseType.startsWith('audio/'))||(format==='mp3'&&responseType.startsWith('video/'))
   if(rejectType){await upstream.body?.cancel();return res.status(502).json({error:'The conversion server returned the wrong file type.',code:'WRONG_FILE_TYPE'})}
   res.setHeader('Content-Type',format==='mp4'?'video/mp4':'audio/mpeg')
   const escaped=encodeURIComponent(fileName).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())
   res.setHeader('Content-Disposition',`attachment; filename="Audixo.${format}"; filename*=UTF-8''${escaped}`)
   for(const h of ['content-length','content-range','accept-ranges']){const value=upstream.headers.get(h);if(value)res.setHeader(h,value)}
   res.status(upstream.status)
   if(req.method==='HEAD'){await upstream.body?.cancel();return res.end()}
   if(!upstream.body)return res.status(502).json({error:'Empty conversion file.'})
   await pipeline(Readable.fromWeb(upstream.body as any),res)
   return
  }
  if(req.method!=='POST')return res.status(405).json({error:'Use POST.'})
  if(action==='health'){
   if(!process.env.AUDIXO_YTDL_BASE_URL)return res.status(200).json({ready:false,message:'Configure AUDIXO_YTDL_BASE_URL in Vercel.'})
   const v=unwrap(await json('/ytdl/status',undefined,12000))
   return res.status(200).json({ready:!!(v.ok&&v.authenticated!==false),authenticated:v.authenticated===true,maxConcurrent:Number(v.max_concurrent||0),message:v.ok?'':'REST YTDL service unavailable.'})
  }
  if(action==='meta'){
   const url=youtube(req.body?.url),raw=await json('/api/preview',{url},40000),v=unwrap(unwrap(raw))
   const id=new URL(url).searchParams.get('v')
   return res.status(200).json({url,title:text(v.title||v.video_title||v.video?.title||'YouTube video',180),author:text(v.author||v.channel||v.uploader||'',100),duration:duration(v.duration||v.length_seconds||v.video?.duration),thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,qualities:qualities(raw)})
  }
  if(action==='convert'){
   const url=youtube(req.body?.url),format=kind(req.body?.format)
   const quality=String(req.body?.quality||'')
   if(format==='mp4'&&!SUPPORTED.has(quality))return res.status(400).json({error:'Select a valid MP4 resolution.'})
   const body=buildDownloadBody(url,format,quality)
   const v=await json('/api/download',body,55000)
   const job=normalizeJob(v,'',format)
   if(!JOB_ID.test(job.id))return res.status(502).json({error:'Media API did not return a valid job_id.'})
   return res.status(200).json({...job,requestedQuality:format==='mp4'?quality:'320'})
  }
  if(action==='status'){
   const id=String(req.body?.id||'');if(!JOB_ID.test(id))return res.status(400).json({error:'Invalid job ID.'})
   return res.status(200).json(normalizeJob(await json(`/api/download/status/${encodeURIComponent(id)}`,undefined,24000),id,kind(req.body?.format)))
  }
  return res.status(400).json({error:'Unknown media action.'})
 }catch(e){if(res.headersSent){res.destroy?.(e instanceof Error?e:undefined);return}return fail(res,e)}
}
