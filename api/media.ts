/** Single-project Vercel media endpoints. No external REST YTDL server is called. */
import { spawn } from 'node:child_process'
import { extractorInstalled,extract,parseVideoUrl,formatQualities,audioAvailable,makeToken,readToken,qualitySelector,selectStreams,safeFilename,ExtractorError,secureSource,sourceName,supportedSourceNames,type MediaFormat } from '../lib/youtube.js'
import {cookiesConfigured,loadCookies} from '../lib/cookies.js'
import { existsSync } from 'node:fs'
import path from 'node:path'
const ffmpegStatic=path.resolve(process.cwd(),'bin','ffmpeg')
type Req={method?:string;body?:any;query?:Record<string,unknown>;headers?:Record<string,string|undefined>}
type Res={setHeader:(k:string,v:string)=>void;status:(n:number)=>Res;json:(o:unknown)=>void;end:(v?:unknown)=>void;write:(chunk:any)=>boolean;headersSent?:boolean;on:(event:string,cb:()=>void)=>void;destroy:(error?:Error)=>void}
class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
function checkReady(){if(!extractorInstalled())throw new HttpError(503,'yt-dlp unavailable. Check Vercel build logs.');if(!existsSync(ffmpegStatic))throw new HttpError(503,'FFmpeg unavailable. Check npm install logs.')}
function mediaHeaders(format:'mp3'|'mp4',name:string,res:Res){
 res.setHeader('Content-Type',format==='mp3'?'audio/mpeg':'video/mp4')
 const filename=`${safeFilename(name)} (AUDIXO).${format}`
 const ascii=filename.replace(/[^\x20-\x7E]/g,'_').replace(/["\\]/g,'_')
 res.setHeader('Content-Disposition',`attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`)
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff')
}
async function streamMedia(req:Req,res:Res,rawToken:unknown){
 checkReady();const token=readToken(rawToken)
 const selector=token.format==='mp3'?'bestaudio/best':qualitySelector(Number(token.quality))
 const media=await extract(token.url,selector)
 if(media?.is_live)throw new HttpError(422,'Live streams cannot be converted by this Vercel-only downloader.')
 const {video,audio}=await selectStreams(media,token.format)
 const seconds=Number(media?.duration||0)
 if(seconds>3600)throw new HttpError(422,'Videos over 60 minutes exceed the safe Vercel-only processing target. Use a shorter video.')
 const args=['-hide_banner','-loglevel','error','-nostdin','-y','-nostats','-reconnect','1','-reconnect_streamed','1','-reconnect_delay_max','5']

 const addInput=async(f:MediaFormat)=>{
  const headers=f.http_headers||media.http_headers||{}
  const ua=String(headers['User-Agent']||headers['user-agent']||'Mozilla/5.0')
  if(!/[\r\n]/.test(ua))args.push('-user_agent',ua.slice(0,250))
  const ref=String(headers.Referer||headers.referer||token.url)
  try{
   const r=new URL(ref)
   if(r.protocol==='https:'&&!r.username&&!r.password&&!/[\r\n]/.test(ref))args.push('-referer',r.href.slice(0,2000))
  }catch{}
  args.push('-i',(await secureSource(f)).toString())
 }
 if(token.format==='mp3'){
  if(!audio)throw new HttpError(422,'This post does not contain a usable audio stream.')
  await addInput(audio)
  args.push('-map','0:a:0','-vn','-c:a','libmp3lame','-b:a',String(token.bitrate||192)+'k','-id3v2_version','3','-f','mp3','pipe:1')
 }else{
  if(!video)throw new HttpError(422,'This post has no usable MP4 video stream.')
  await addInput(video)
  if(audio&&audio.url!==video.url)await addInput(audio)
  args.push('-map','0:v:0')
  if(audio)args.push('-map',audio.url===video.url?'0:a:0?':'1:a:0?')
  args.push('-c:v','copy','-c:a','aac','-b:a','160k','-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','pipe:1')
 }
 const name=String(media.title||'Social video')
 return await new Promise<void>((resolve,reject)=>{
  let done=false,bytes=0,stderr='',responseStarted=false
  const proc=spawn(String(ffmpegStatic),args,{stdio:['ignore','pipe','pipe'],env:process.env})
  const timer=setTimeout(()=>proc.kill('SIGKILL'),250000)
  const cleanup=()=>{clearTimeout(timer);req;}
  const onClose=()=>{if(!proc.killed)proc.kill('SIGKILL')}
  res.on('close',onClose)
  proc.stderr.on('data',v=>{stderr=(stderr+String(v)).slice(-9000)})
  proc.on('error',e=>{if(done)return;done=true;cleanup();reject(new HttpError(503,'FFmpeg could not start: '+e.message))})
  proc.stdout.on('data',(chunk:Buffer)=>{
   if(done)return
   if(!responseStarted){mediaHeaders(token.format,name,res);res.status(200);responseStarted=true}
   bytes+=chunk.length
   if(!res.write(chunk))proc.stdout.pause()
  })
  // Drain backpressure: node HTTP response supports .on('drain').
  res.on('drain',()=>proc.stdout.resume())
  proc.on('close',code=>{
   if(done)return;done=true;cleanup()
   if(code===0&&bytes>0){res.end();resolve();return}
   const msg=/403|Forbidden|Server returned 403/.test(stderr)?'The source CDN rejected the media stream (403). The platform may block hosting-provider connections or require an authorized session.':`FFmpeg conversion failed: ${stderr.replace(/https?:\/\/[^\s]+/g,'[media URL hidden]').split('\n').filter(Boolean).at(-1)?.slice(0,300)||'media unavailable'}`
   if(responseStarted){res.destroy(new Error(msg));resolve()}else reject(new HttpError(502,msg))
  })
 })
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex')
 try{
  const action=String(req.query?.action||'')
  if(action==='probe'&&req.method==='GET'&&process.env.VERCEL_ENV==='preview'){
   const args=['--ignore-config','--no-playlist','--no-warnings','--skip-download','--dump-single-json','--socket-timeout','8','--retries','0','--extractor-retries','0','--js-runtimes','node','--remote-components','ejs:github','--','https://www.youtube.com/watch?v=e34Vx3K4zwo']
   const result=await new Promise<{code:number;message:string;title?:string}>(resolve=>{
    let output='',err='',done=false
    const p=spawn(path.resolve(process.cwd(),'bin','yt-dlp'),args,{stdio:['ignore','pipe','pipe']})
    const doneOnce=(code:number,message:string,title?:string)=>{if(done)return;done=true;clearTimeout(timer);resolve({code,message,title})}
    const timer=setTimeout(()=>{p.kill('SIGKILL');doneOnce(124,'Probe timed out after 25s')},25000)
    p.stdout.on('data',(d:Buffer)=>{output=(output+String(d)).slice(-100000)})
    p.stderr.on('data',(d:Buffer)=>{err=(err+String(d)).slice(-2500)})
    p.on('error',e=>doneOnce(126,e.message))
    p.on('close',c=>{let title;try{title=JSON.parse(output).title}catch{}doneOnce(c||0,err.replace(/https?:\/\/[^\s]+/g,'[url]').slice(-550),title)})
   })
   return res.status(200).json(result)
  }
  if(action==='health'&&req.method==='GET'){
   let cookieInstalled=false
   if(cookiesConfigured()){try{cookieInstalled=!!(await loadCookies())}catch{}}
   return res.status(200).json({ready:extractorInstalled()&&existsSync(ffmpegStatic),mode:'vercel-native',cookieInstalled,storageConfigured:cookiesConfigured(),sources:supportedSourceNames()})
  }
  if(action==='meta'&&req.method==='POST'){
   checkReady();const url=parseVideoUrl(req.body?.url),meta=await extract(url)
   return res.status(200).json({url,platform:sourceName(url),title:String(meta?.title||'Social video').slice(0,240),author:String(meta?.uploader||meta?.channel||sourceName(url)).slice(0,160),duration:Number(meta?.duration||0),thumbnail:String(meta?.thumbnail||'').slice(0,2100),qualities:formatQualities(meta),audioAvailable:audioAvailable(meta),streams:[],sourceNote:'Public source formats inspected by yt-dlp on AUDIXO Vercel. Platform availability varies.',remote:true})
  }
  if(action==='start'&&req.method==='POST'){
   checkReady();const url=parseVideoUrl(req.body?.url),format=req.body?.format
   if(format!=='mp3'&&format!=='mp4')throw new HttpError(400,'Choose MP3 or MP4.')
   const quality=String(req.body?.quality||'')
   const bitrate=Number(req.body?.bitrate||192)
   if(format==='mp4'&&(!/^\d{3,4}$/.test(quality)||Number(quality)<144||Number(quality)>4320))throw new HttpError(400,'Choose an available video resolution.')
   if(format==='mp3'&&![64,128,192,256,320].includes(bitrate))throw new HttpError(400,'Choose a valid MP3 bitrate.')
   // Token does not include media URLs or cookies and expires after eight minutes.
   const token=makeToken({url,format,quality:format==='mp4'?quality:undefined,bitrate:format==='mp3'?bitrate:undefined})
   return res.status(200).json({ok:true,url:`/api/media?action=file&token=${encodeURIComponent(token)}`})
  }
  if(action==='file'&&req.method==='GET')return await streamMedia(req,res,req.query?.token)
  throw new HttpError(405,'Unknown route or HTTP method.')
 }catch(e){
  const status=e instanceof HttpError?e.status:e instanceof ExtractorError?e.status:400
  const message=e instanceof Error?e.message:'Unknown media error'
  if(!res.headersSent){res.setHeader('Content-Type','application/json; charset=utf-8');return res.status(status).json({error:message,code:status===502?'EXTRACTION_FAILED':'MEDIA_ERROR'})}
  res.destroy(new Error(message))
 }
}
