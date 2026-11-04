/** Single-project Vercel media endpoints. No external REST YTDL server is called. */
import { spawn } from 'node:child_process'
import { extractorInstalled,extract,canonicalUrl,parseVideoUrl,formatQualities,audioAvailable,makeToken,readToken,qualitySelector,selectStreams,safeFilename,ExtractorError,secureSource } from '../lib/youtube.js'
import {cookiesConfigured,loadCookies} from '../lib/cookies.js'
import { existsSync } from 'node:fs'
import path from 'node:path'
const ffmpegStatic=path.resolve(process.cwd(),'bin','ffmpeg')
type Req={method?:string;body?:any;query?:Record<string,unknown>;headers?:Record<string,string|undefined>}
type Res={setHeader:(k:string,v:string)=>void;status:(n:number)=>Res;json:(o:unknown)=>void;end:(v?:unknown)=>void;write:(chunk:any)=>boolean;headersSent?:boolean;on:(event:string,cb:()=>void)=>void;destroy:(error?:Error)=>void}
const videoURL=(v:unknown)=>canonicalUrl(parseVideoUrl(v))
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
 const media=await extract(token.id,selector)
 if(media?.is_live)throw new HttpError(422,'Live streams cannot be converted by this Vercel-only downloader.')
 const {video,audio}=selectStreams(media,token.format)
 const seconds=Number(media?.duration||0)
 if(seconds>3600)throw new HttpError(422,'Videos over 60 minutes exceed the safe Vercel-only processing target. Use a shorter video.')
 const args=['-hide_banner','-loglevel','error','-nostdin','-y','-nostats','-reconnect','1','-reconnect_streamed','1','-reconnect_delay_max','5']
 const addInput=(f:typeof audio)=>{
  const headers=f.http_headers||media.http_headers||{}
  const ua=String(headers['User-Agent']||headers['user-agent']||'Mozilla/5.0')
  if(!/\r|\n/.test(ua))args.push('-user_agent',ua.slice(0,250))
  // YouTube CDN often validates Referer on signed stream URLs.
  const ref=String(headers.Referer||headers.referer||'https://www.youtube.com/')
  if(/^https:\/\/(?:www\.)?youtube\.com\//.test(ref))args.push('-referer',ref)
  args.push('-i',secureSource(f).toString())
 }
 if(token.format==='mp3'){
  addInput(audio)
  args.push('-map','0:a:0','-vn','-c:a','libmp3lame','-b:a',String(token.bitrate||192)+'k','-id3v2_version','3','-f','mp3','pipe:1')
 }else{
  addInput(video!)
  if(audio.url!==video!.url)addInput(audio)
  args.push('-map','0:v:0','-map',audio.url===video!.url?'0:a:0':'1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','pipe:1')
 }
 const name=String(media.title||token.id)
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
   const msg=/403|Forbidden|Server returned 403/.test(stderr)?'YouTube CDN rejected the signed stream (403). Updating cookies may not solve a blocked Vercel egress IP.':`FFmpeg conversion failed: ${stderr.replace(/https?:\/\/[^\s]+/g,'[media URL hidden]').split('\n').filter(Boolean).at(-1)?.slice(0,300)||'media unavailable'}`
   if(responseStarted){res.destroy(new Error(msg));resolve()}else reject(new HttpError(502,msg))
  })
 })
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex')
 try{
  const action=String(req.query?.action||'')
  if(action==='health'&&req.method==='GET'){
   let cookieInstalled=false
   if(cookiesConfigured()){try{cookieInstalled=!!(await loadCookies())}catch{}}
   return res.status(200).json({ready:extractorInstalled()&&existsSync(ffmpegStatic),mode:'vercel-native',cookieInstalled,storageConfigured:cookiesConfigured()})
  }
  if(action==='meta'&&req.method==='POST'){
   checkReady();const id=parseVideoUrl(req.body?.url),meta=await extract(id)
   return res.status(200).json({url:canonicalUrl(id),title:String(meta?.title||id).slice(0,240),author:String(meta?.uploader||meta?.channel||'YouTube').slice(0,160),duration:Number(meta?.duration||0),thumbnail:String(meta?.thumbnail||`https://i.ytimg.com/vi/${id}/hqdefault.jpg`).slice(0,2100),qualities:formatQualities(meta),audioAvailable:audioAvailable(meta),streams:[],sourceNote:'Formats checked directly on this Vercel function using yt-dlp. No external media worker.',remote:true})
  }
  if(action==='start'&&req.method==='POST'){
   checkReady();const id=parseVideoUrl(req.body?.url),format=req.body?.format
   if(format!=='mp3'&&format!=='mp4')throw new HttpError(400,'Choose MP3 or MP4.')
   const quality=String(req.body?.quality||'')
   const bitrate=Number(req.body?.bitrate||192)
   if(format==='mp4'&&(!/^\d{3,4}$/.test(quality)||Number(quality)<144||Number(quality)>4320))throw new HttpError(400,'Choose an available video resolution.')
   if(format==='mp3'&&![64,128,192,256,320].includes(bitrate))throw new HttpError(400,'Choose a valid MP3 bitrate.')
   // Token does not include media URLs or cookies and expires after eight minutes.
   const token=makeToken({id,format,quality:format==='mp4'?quality:undefined,bitrate:format==='mp3'?bitrate:undefined})
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
