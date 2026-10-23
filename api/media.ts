/** AUDIXO V57 - private self-hosted media worker proxy.
 * No third-party YTDL API, authentication cookie, or yt-dlp subprocess is
 * shipped to the browser/Vercel. The worker performs source discovery,
 * conversion and final-file verification on a persistent Docker host.
 */
import {Readable} from 'node:stream'
import {createHmac} from 'node:crypto'
import {pipeline} from 'node:stream/promises'

type MediaKind='mp3'|'mp4'
const QUALITIES=new Set(['144','240','360','480','720','1080','1440','2160','4320'])
const BITRATES=new Set([64,128,192,256,320])
const JOB_ID=/^[a-f\d]{32}$/
const raw=(value:unknown,max=250)=>String(value??'').slice(0,max)
const filename=(value:unknown,format:MediaKind)=>raw(value||'YouTube video',180).replace(/[\\<>|:*?"\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,140).replace(/[. ]+$/,'')+`.${format}`

class ApiError extends Error{
 constructor(message:string,public code='UPSTREAM_ERROR',public status=502){super(message);this.name='ApiError'}
}
const classifyStatus=(status:number)=>status===401||status===403?'SERVICE_AUTH':status===422?'QUALITY_UNAVAILABLE':status===404||status===410?'FILE_UNAVAILABLE':status===429?'UPSTREAM_LIMIT':status>=500?'ORIGIN_UNAVAILABLE':'UPSTREAM_ERROR'

function workerConfig(){
 const candidate=process.env.AUDIXO_WORKER_URL?.trim()||''
 const token=process.env.AUDIXO_WORKER_TOKEN?.trim()||''
 if(!candidate||token.length<32)throw new ApiError('Media worker setup is incomplete. Deploy media-worker/ on a Docker host, then set AUDIXO_WORKER_URL and AUDIXO_WORKER_TOKEN in Vercel.','WORKER_NOT_CONFIGURED',503)
 let url:URL
 try{url=new URL(candidate)}catch{throw new ApiError('The private media worker URL is invalid.','ORIGIN_UNAVAILABLE',503)}
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol))throw new ApiError('The private media worker URL must be a plain HTTP(S) origin.','ORIGIN_UNAVAILABLE',503)
 if(process.env.VERCEL&&url.protocol!=='https:')throw new ApiError('Use HTTPS for the private media worker in production.','ORIGIN_UNAVAILABLE',503)
 return {origin:url.origin,token}
}
function youtube(rawUrl:unknown){
 if(typeof rawUrl!=='string'||rawUrl.length>2048)throw new ApiError('Paste a valid YouTube video URL.','INVALID_REQUEST',400)
 let u:URL
 try{u=new URL(rawUrl.trim())}catch{throw new ApiError('Paste a valid YouTube video URL.','INVALID_REQUEST',400)}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(u.hostname.toLowerCase()))throw new ApiError('Only HTTPS YouTube links are accepted.','INVALID_REQUEST',400)
 const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1]
 if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id))throw new ApiError('This link does not contain a valid YouTube video ID.','INVALID_REQUEST',400)
 return `https://www.youtube.com/watch?v=${id}`
}
async function worker(route:string,method:'GET'|'POST'='GET',body?:object,timeoutMs=50000,clientKey=''):Promise<Response>{
 const {origin,token}=workerConfig()
 let response:Response
 try{response=await fetch(`${origin}${route}`,{method,headers:{Authorization:`Bearer ${token}`,...(clientKey?{'X-Audixo-Client-Key':clientKey}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeoutMs),cache:'no-store',redirect:'error'})}
 catch{throw new ApiError('Private media worker cannot be reached. Verify that its Docker service is running and the HTTPS URL is correct.','ORIGIN_UNAVAILABLE',503)}
 if(!response.ok){
  const detail=await response.json().catch(()=>null)
  const code=typeof detail?.code==='string'&&/^[A-Z_]{3,40}$/.test(detail.code)?detail.code:classifyStatus(response.status)
  throw new ApiError(raw(detail?.error||`Media worker HTTP ${response.status}`,340),code,response.status)
 }
 return response
}
async function data(route:string,method:'GET'|'POST'='GET',body?:object,timeoutMs=50000,clientKey=''):Promise<any>{
 const result=await worker(route,method,body,timeoutMs,clientKey)
 const payload=await result.json().catch(()=>null)
 if(!payload||typeof payload!=='object')throw new ApiError('The private worker returned an invalid response.','UPSTREAM_ERROR',502)
 return payload
}
async function verifyHuman(token:unknown,req:any){
 const secret=process.env.AUDIXO_TURNSTILE_SECRET_KEY?.trim()
 if(!secret){if(token)throw new ApiError('Turnstile is enabled in the UI, but the private verification secret is missing.','BOT_CHECK_CONFIG',503);return}
 if(typeof token!=='string'||token.length<10||token.length>2100)throw new ApiError('Complete the security check before downloading.','BOT_CHECK_REQUIRED',400)
 const form=new URLSearchParams({secret,response:token})
 const ip=String(req.headers?.['x-forwarded-for']??'').split(',')[0].trim()
 if(ip&&ip.length<64)form.set('remoteip',ip)
 const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form,signal:AbortSignal.timeout(13000)}).catch(()=>null)
 const value=await result?.json().catch(()=>null)
 if(value?.success!==true)throw new ApiError('Security verification expired or failed.','BOT_CHECK_FAILED',400)
}
function jobShape(value:any,format:MediaKind,quality=''){
 const id=raw(value.job_id??value.id,90)
 if(!JOB_ID.test(id))throw new ApiError('The processing worker returned an invalid job ID.','JOB_FAILED',502)
 const status=raw(value.status??value.state,50).toLowerCase()
 const state=status==='ready'||status==='complete'?'complete':status==='failed'?'failed':status==='queued'?'queued':'processing'
 const progress=Number(value.progress??0)
 const height=Number(value.actual_height??value.output_height)
 const width=Number(value.actual_width??value.output_width)
 let errorCode=raw(value.code??value.error_code,70)
 let error=raw(value.error,250)
 let currentState=state
 if(format==='mp4'&&state==='complete'&&Number.isFinite(height)&&height>0&&quality&&height!==Number(quality)){
  errorCode='QUALITY_MISMATCH';error=`The output is ${height}p instead of ${quality}p.`;currentState='failed'
 }
 const dl=value.download??{}
 return {id,format,state:currentState,stage:raw(value.stage,60),message:raw(value.message,220),error,errorCode,title:raw(value.title,200),progress:Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):0,downloadPercent:Number(dl.percent)||undefined,downloadSpeed:raw(dl.speed,40),eta:raw(dl.eta,40),reportedWidth:Number.isFinite(width)&&width>0?width:undefined,reportedHeight:Number.isFinite(height)&&height>0?height:undefined,reportedKbps:Number(value.actual_audio_bitrate_kbps)||undefined,files:currentState==='complete'?[{name:format.toUpperCase(),url:`/api/media?action=ticket&id=${id}&format=${format}`,fileName:filename(value.title,format)}]:[]}
}
const sendFailure=(res:any,error:unknown)=>{
 if(res.headersSent){res.destroy?.();return}
 const e=error instanceof ApiError?error:new ApiError('Media service temporarily unavailable.','UPSTREAM_ERROR',503)
 res.status(e.status).json({ok:false,error:e.message,code:e.code})
}
const getId=(value:unknown)=>{const id=raw(value,90);if(!JOB_ID.test(id))throw new ApiError('Invalid job reference.','INVALID_REQUEST',400);return id}
const getKind=(value:unknown):MediaKind=>{if(value==='mp3'||value==='mp4')return value;throw new ApiError('Select MP3 or MP4.','INVALID_REQUEST',400)}

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','private, no-store, max-age=0')
 res.setHeader('X-Content-Type-Options','nosniff')
 res.setHeader('Referrer-Policy','no-referrer')
 const action=raw(req.query?.action,30)
 try{
  if(action==='events'){
   if(req.method!=='GET')throw new ApiError('Use GET for progress events.','INVALID_REQUEST',405)
   const id=getId(req.query?.id)
   const response=await worker(`/jobs/${id}/events`,'GET',undefined,70_000)
   if(!response.headers.get('content-type')?.includes('text/event-stream')||!response.body)throw new ApiError('Worker progress stream is unavailable.','ORIGIN_UNAVAILABLE',503)
   res.status(200)
   res.setHeader('Content-Type','text/event-stream; charset=utf-8')
   res.setHeader('Cache-Control','private, no-cache, no-transform')
   res.setHeader('X-Accel-Buffering','no')
   res.flushHeaders?.()
   const source=Readable.fromWeb(response.body as any)
   // The browser reconnects; frontend also implements status polling fallback.
   const timer=setTimeout(()=>source.destroy(),55_000)
   try{await pipeline(source,res)}catch{}finally{clearTimeout(timer)}
   return
  }
  if(action==='file')throw new ApiError('This version now issues secure direct downloads. Refresh AUDIXO and retry.','FILE_UNAVAILABLE',410)
  if(req.method!=='POST')throw new ApiError('Use POST for this action.','INVALID_REQUEST',405)
  if(action==='health'){
   const value=await data('/health','GET',undefined,16000)
   return res.status(200).json({ready:value.ok===true&&value.ready===true,authenticated:!!value.authenticated,maxConcurrent:Number(value.max_concurrent||2),message:raw(value.message,200)})
  }
  if(action==='meta'){
   const url=youtube(req.body?.url),value=await data('/preview','POST',{url},95000)
   const qualities=(Array.isArray(value.qualities)?value.qualities:[]).map((q:any)=>({value:raw(q.value??q.quality,10).replace(/p$/,''),label:raw(q.label,40)})).filter((q:any)=>QUALITIES.has(q.value))
   const unique=[...new Map(qualities.map((q:{value:string;label:string})=>[q.value,{value:q.value,label:q.label||`${q.value}p`}])).values()].sort((a:any,b:any)=>Number(a.value)-Number(b.value))
   return res.status(200).json({url,title:raw(value.title,230),author:raw(value.uploader??value.author,150),duration:Number(value.duration)||0,thumbnail:raw(value.thumbnail,600),qualities:unique})
  }
  if(action==='convert'){
   const url=youtube(req.body?.url),format=getKind(req.body?.format)
   const quality=raw(req.body?.quality,10)
   const bitrate=Number(req.body?.bitrate??320)
   if(format==='mp4'&&!QUALITIES.has(quality))throw new ApiError('Select a valid MP4 resolution.','INVALID_REQUEST',400)
   if(format==='mp3'&&!BITRATES.has(bitrate))throw new ApiError('Select a valid MP3 bitrate.','INVALID_REQUEST',400)
   await verifyHuman(req.body?.turnstileToken,req)
   const ip=raw(req.headers?.['x-forwarded-for']??req.headers?.['x-real-ip']??'anonymous',150).split(',')[0].trim()
   const clientKey=createHmac('sha256',workerConfig().token).update(ip).digest('hex')
   const value=await data('/jobs','POST',{url,format,...(format==='mp4'?{quality}:{bitrate})},95000,clientKey)
   return res.status(200).json(jobShape(value,format,quality))
  }
  if(action==='status'){
   const id=getId(req.body?.id),format=getKind(req.body?.format),quality=raw(req.body?.quality,10)
   const value=await data(`/jobs/${id}`,'GET',undefined,20000)
   return res.status(200).json(jobShape(value,format,quality))
  }
  if(action==='ticket'){
   // Exchanging a private worker request for a 2-minute, single-use URL
   // avoids proxying large audio/video files through Vercel Functions.
   const id=getId(req.body?.id),format=getKind(req.body?.format)
   const job=await data(`/jobs/${id}`,'GET',undefined,20000)
   if(job.format!==format||job.status!=='ready')throw new ApiError('Media file is not ready or its format does not match.','FILE_UNAVAILABLE',409)
   const ticket=await data(`/jobs/${id}/ticket`,'POST',{},15000)
   if(ticket.format!==format||typeof ticket.path!=='string'||ticket.path.length>260)
    throw new ApiError('Worker returned an invalid secure download ticket.','UPSTREAM_ERROR',502)
   const target=new URL(ticket.path,workerConfig().origin)
   const expires=target.searchParams.get('expires')||''
   const sig=target.searchParams.get('sig')||''
   const now=Date.now()
   if(target.origin!==workerConfig().origin||target.pathname!==`/download/${id}`||
      !/^[0-9]{13}$/.test(expires)||!/^[a-f0-9]{64}$/.test(sig)||
      Number(expires)<now||Number(expires)>now+150_000||target.searchParams.size!==2)
    throw new ApiError('Worker returned a malformed download ticket.','UPSTREAM_ERROR',502)
   return res.status(200).json({ok:true,url:target.href,expiresAt:Number(expires)})
  }
  throw new ApiError('Unknown media action.','INVALID_REQUEST',400)
 }catch(error){return sendFailure(res,error)}
}
