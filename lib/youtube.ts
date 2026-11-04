/** Direct YouTube extraction within the SAME Vercel deployment. No external worker. */
import { spawn } from 'node:child_process'
import { createHmac, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { cookieArgs } from './cookies.js'
const videoId=/^[A-Za-z0-9_-]{11}$/
const allowedHosts=new Set(['youtube.com','www.youtube.com','music.youtube.com','m.youtube.com','youtu.be','www.youtu.be'])
export function parseVideoUrl(input:unknown):string{
 if(typeof input!=='string'||input.length>2048)throw new Error('Enter a valid YouTube HTTPS link.')
 const raw=input.trim();if(videoId.test(raw))return raw
 let u:URL;try{u=new URL(raw)}catch{throw new Error('Enter a valid YouTube HTTPS link.')}
 if(u.protocol!=='https:'||!allowedHosts.has(u.hostname.toLowerCase())||u.port||u.username||u.password)throw new Error('Only YouTube HTTPS links are supported.')
 const id=u.hostname.toLowerCase().endsWith('youtu.be')?u.pathname.split('/')[1]:u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1]
 if(!id||!videoId.test(id))throw new Error('This YouTube URL has no valid video ID.')
 return id
}
export const canonicalUrl=(id:string)=>`https://www.youtube.com/watch?v=${id}`
const BIN=process.env.YTDLP_BIN||path.resolve(process.cwd(),'bin','yt-dlp')
export const extractorInstalled=()=>fs.existsSync(BIN)
export function extractorPath(){if(!extractorInstalled())throw new Error('yt-dlp binary not installed. Check Vercel build logs (prepare-ytdlp).');return BIN}
export class ExtractorError extends Error {constructor(message:string,public status=502){super(message)}}
function tidyError(text:string){
 const lines=String(text||'').split(/\r?\n/).filter(Boolean),message=lines.filter(x=>/ERROR:|WARNING:.*sign in|HTTP Error|timed out|403|not a bot|unavailable/i.test(x)).at(-1)||lines.at(-1)||'The YouTube extractor failed.'
 if(/sign in to confirm|not a bot|LOGIN_REQUIRED|403 Forbidden|HTTP Error 403/i.test(message))return 'YouTube rejected this Vercel server session or IP. Update cookies at /bhai-cookie-dalde; some datacenter IPs remain blocked.'
 if(/Private video|members-only|paid content/i.test(message))return 'This content needs an authorized YouTube session or is restricted.'
 return message.replace(/https?:\/\/[^\s]+/g,'[media URL hidden]').slice(0,430)
}
export async function extract(id:string,selector?:string):Promise<any>{
 const {args:cookieFlags,cleanup}=await cookieArgs()
 const flags=['--no-playlist','--no-warnings','--skip-download','--dump-single-json','--socket-timeout','20','--retries','2','--extractor-retries','2','--js-runtimes','node','--remote-components','ejs:github',...cookieFlags]
 if(selector)flags.push('--format',selector)
 flags.push('--',canonicalUrl(id))
 try{
  return await new Promise((resolve,reject)=>{
   let done=false,stdout='',stderr=''
   const p=spawn(extractorPath(),flags,{stdio:['ignore','pipe','pipe'],env:{...process.env,NO_COLOR:'1'}})
   const timer=setTimeout(()=>{p.kill('SIGKILL');if(!done){done=true;reject(new ExtractorError('YouTube analysis took too long. Retry later.',504))}},85000)
   p.stdout.on('data',v=>{stdout+=String(v);if(stdout.length>18000000)p.kill('SIGKILL')})
   p.stderr.on('data',v=>{stderr=(stderr+String(v)).slice(-18000)})
   p.on('error',e=>{if(done)return;done=true;clearTimeout(timer);reject(new ExtractorError('yt-dlp could not start: '+e.message,503))})
   p.on('close',code=>{if(done)return;done=true;clearTimeout(timer);if(code!==0)return reject(new ExtractorError(tidyError(stderr),502));try{resolve(JSON.parse(stdout))}catch{reject(new ExtractorError('Invalid response from yt-dlp.',502))}})
  })
 }finally{await cleanup()}
}
export type MediaFormat={url:string;ext:string;vcodec:string;acodec:string;height:number;http_headers?:Record<string,string>;format_id?:string}
export function mediaFormats(meta:any):MediaFormat[]{return Array.isArray(meta?.formats)?meta.formats:[]}
export function formatQualities(meta:any):{value:string;label:string}[]{
 const s=new Set<number>();for(const f of mediaFormats(meta)){const h=Number(f?.height||0);if(h>=144&&h<=4320&&f?.vcodec&&f.vcodec!=='none'&&/^https:\/\//.test(String(f.url||'')))s.add(h)}
 return [...s].sort((a,b)=>b-a).map(n=>({value:String(n),label:`${n}p`}))
}
export const audioAvailable=(meta:any)=>mediaFormats(meta).some(f=>f?.acodec&&f.acodec!=='none')
export function secureSource(f:MediaFormat):URL{
 let u:URL;try{u=new URL(f.url)}catch{throw new ExtractorError('Unsupported media source URL.')}
 const host=u.hostname.toLowerCase()
 if(u.protocol!=='https:'||u.username||u.password||!(host==='googlevideo.com'||host.endsWith('.googlevideo.com')||host==='youtube.com'||host.endsWith('.youtube.com'))){throw new ExtractorError('The media extractor returned an unsupported streaming host.')}
 return u
}
export function qualitySelector(quality:number){return `bv*[ext=mp4][height<=${quality}]+ba[ext=m4a]/b[ext=mp4][height<=${quality}]/bv*[height<=${quality}]+ba/b[height<=${quality}]`}
export function selectStreams(data:any,format:'mp3'|'mp4'):{video?:MediaFormat,audio:MediaFormat}{
 const arr=Array.isArray(data?.requested_formats)?data.requested_formats:[]
 const selected=arr.length?arr:Array.isArray(data?.formats)?data.formats.filter((f:any)=>f?.format_id===data?.format_id):[data]
 const video=selected.find((x:any)=>x?.vcodec&&x.vcodec!=='none')
 const audio=selected.find((x:any)=>x?.acodec&&x.acodec!=='none')
 if(!audio)throw new ExtractorError('An audio stream was not available for this video.')
 secureSource(audio)
 if(format==='mp4'){
  if(!video)throw new ExtractorError('A video stream was not available at this quality.')
  secureSource(video)
  return {video,audio}
 }
 return {audio}
}
export function safeFilename(s:string){return String(s||'AUDIXO Media').replace(/[\x00-\x1f\x80-\x9f]/g,' ').replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim().slice(0,145)||'AUDIXO Media'}
export function key(){return process.env.AUDIXO_SIGNING_SECRET||process.env.AUDIXO_COOKIE_PASSWORD||''}
export function sign(payload:string){if(!key())throw new Error('Set AUDIXO_SIGNING_SECRET in Vercel (private random value).');return createHmac('sha256',key()).update(payload).digest('base64url')}
export function verify(payload:string,mac:string){try{const a=Buffer.from(sign(payload)),b=Buffer.from(mac);return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}}
export function makeToken(input:{id:string;format:'mp3'|'mp4';quality?:string;bitrate?:number}){
 const json=JSON.stringify({...input,exp:Date.now()+8*60*1000})
 const data=Buffer.from(json).toString('base64url')
 return data+'.'+sign(data)
}
export function readToken(value:unknown){
 if(typeof value!=='string'||value.length>1600)throw new ExtractorError('Invalid or expired download link.',403)
 const [encoded,mac,extra]=value.split('.');if(!encoded||!mac||extra||!verify(encoded,mac))throw new ExtractorError('Invalid download authorization.',403)
 let p:any;try{p=JSON.parse(Buffer.from(encoded,'base64url').toString())}catch{throw new ExtractorError('Invalid download authorization.',403)}
 if(!p||!videoId.test(p.id)||!['mp3','mp4'].includes(p.format)||!Number.isSafeInteger(p.exp)||p.exp<Date.now()||p.exp>Date.now()+10*60*1000)throw new ExtractorError('This download link has expired. Analyze again.',403)
 if(p.format==='mp4'&&(!Number.isInteger(Number(p.quality))||Number(p.quality)<144||Number(p.quality)>4320))throw new ExtractorError('Invalid video resolution.',400)
 if(p.format==='mp3'&&![64,128,192,256,320].includes(Number(p.bitrate)))throw new ExtractorError('Invalid MP3 bitrate.',400)
 return p as {id:string,format:'mp3'|'mp4',quality?:string,bitrate?:number,exp:number}
}
