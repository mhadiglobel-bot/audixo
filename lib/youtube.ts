
/** AUDIXO social-media extraction, same-origin Vercel only. */
import { spawn } from 'node:child_process'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import path from 'node:path'
import fs from 'node:fs'
import { cookieArgs } from './cookies.js'

const videoId=/^[A-Za-z0-9_-]{11}$/
const sources:ReadonlyArray<{name:string;hosts:string[]}>= [
 {name:'YouTube',hosts:['youtube.com','youtu.be']},
 {name:'Instagram',hosts:['instagram.com']},
 {name:'TikTok',hosts:['tiktok.com','tiktokv.com']},
 {name:'Facebook',hosts:['facebook.com','fb.watch','fb.com']},
 {name:'X / Twitter',hosts:['x.com','twitter.com']},
 {name:'Reddit',hosts:['reddit.com','redd.it','v.redd.it']},
 {name:'Vimeo',hosts:['vimeo.com']},
 {name:'Dailymotion',hosts:['dailymotion.com','dai.ly']},
 {name:'Twitch',hosts:['twitch.tv']},
 {name:'Threads',hosts:['threads.net','threads.com']},
 {name:'Pinterest',hosts:['pinterest.com','pin.it']},
 {name:'Snapchat',hosts:['snapchat.com']},
 {name:'LinkedIn',hosts:['linkedin.com']},
 {name:'Bilibili',hosts:['bilibili.com','b23.tv']},
 {name:'Bluesky',hosts:['bsky.app']},
 {name:'Tumblr',hosts:['tumblr.com']},
 {name:'Streamable',hosts:['streamable.com']},
 {name:'Rumble',hosts:['rumble.com']},
 {name:'Odysee',hosts:['odysee.com']},
 {name:'SoundCloud',hosts:['soundcloud.com']},
 {name:'Bandcamp',hosts:['bandcamp.com']},
 {name:'Mixcloud',hosts:['mixcloud.com']},
 {name:'Douyin',hosts:['douyin.com']}
]
const matchesHost=(host:string,domain:string)=>host===domain||host.endsWith('.'+domain)
const getSource=(host:string)=>sources.find(s=>s.hosts.some(d=>matchesHost(host,d)))
export const supportedSourceNames=()=>sources.map(s=>s.name)
export function sourceName(url:string):string{
 try{return getSource(new URL(url).hostname.toLowerCase())?.name||'Social video'}catch{return 'Social video'}
}
/** Only recognized public media platforms; never accept arbitrary URLs as a server-side proxy. */
export function parseVideoUrl(input:unknown):string{
 if(typeof input!=='string'||input.length>2048||input.length<10)throw new Error('Enter a supported public social-video HTTPS link.')
 let u:URL;try{u=new URL(input.trim())}catch{throw new Error('Enter a valid HTTPS social media link.')}
 const host=u.hostname.toLowerCase().replace(/\.$/,'')
 if(u.protocol!=='https:'||u.port||u.username||u.password||!getSource(host))throw new Error('This link must use HTTPS and come from a supported social media platform.')
 if(matchesHost(host,'youtube.com')||matchesHost(host,'youtu.be')){
  const id=matchesHost(host,'youtu.be')?u.pathname.split('/')[1]:u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1]
  if(!id||!videoId.test(id))throw new Error('Use a single YouTube video or Shorts link, not a channel or playlist.')
  return 'https://www.youtube.com/watch?v='+id
 }
 if(!u.pathname||u.pathname==='/')throw new Error('Paste a single video or post link, not a profile or homepage.')
 u.hash=''
 return u.toString()
}
export const canonicalUrl=(url:string)=>parseVideoUrl(url)
const BIN=process.env.YTDLP_BIN||path.resolve(process.cwd(),'bin','yt-dlp')
export const extractorInstalled=()=>fs.existsSync(BIN)
export function extractorPath(){if(!extractorInstalled())throw new Error('yt-dlp binary not installed. Check Vercel build logs (prepare-ytdlp).');return BIN}
export class ExtractorError extends Error {constructor(message:string,public status=502){super(message)}}
function tidyError(text:string){
 const lines=String(text||'').split(/\r?\n/).filter(Boolean),message=lines.filter(x=>/ERROR:|WARNING:.*sign in|HTTP Error|timed out|403|not a bot|unavailable/i.test(x)).at(-1)||lines.at(-1)||'The media extractor failed.'
 if(/sign in to confirm|not a bot|LOGIN_REQUIRED|403 Forbidden|HTTP Error 403/i.test(message))return 'The source rejected this server request. Public media can require a login or block Vercel IP addresses; YouTube cookies are managed at /bhai-cookie-dalde.'
 if(/Private video|members-only|paid content/i.test(message))return 'This content is private, restricted or requires an authorized session.'
 return message.replace(/https?:\/\/[^\s]+/g,'[media URL hidden]').slice(0,430)
}

export async function extract(source:string,selector?:string):Promise<any>{
 const url=parseVideoUrl(source),isYoutube=sourceName(url)==='YouTube'
 const cookieSession=isYoutube?await cookieArgs():{args:[],cleanup:async()=>{}}
 const flags=['--no-playlist','--no-warnings','--no-default-search','--skip-download','--dump-single-json','--socket-timeout','20','--retries','2','--extractor-retries','2',...(isYoutube?['--js-runtimes','node','--remote-components','ejs:github']:[]),...cookieSession.args]
 if(selector)flags.push('--format',selector)
 flags.push('--',url)
 try{
  return await new Promise((resolve,reject)=>{
   let done=false,stdout='',stderr=''
   const p=spawn(extractorPath(),flags,{stdio:['ignore','pipe','pipe'],env:{...process.env,NO_COLOR:'1'}})
   const timer=setTimeout(()=>{p.kill('SIGKILL');if(!done){done=true;reject(new ExtractorError('Media analysis timed out. Try again with a public video URL.',504))}},85000)
   p.stdout.on('data',v=>{stdout+=String(v);if(stdout.length>18000000)p.kill('SIGKILL')})
   p.stderr.on('data',v=>{stderr=(stderr+String(v)).slice(-18000)})
   p.on('error',e=>{if(done)return;done=true;clearTimeout(timer);reject(new ExtractorError('yt-dlp could not start: '+e.message,503))})
   p.on('close',code=>{if(done)return;done=true;clearTimeout(timer);if(code!==0)return reject(new ExtractorError(tidyError(stderr),502));try{resolve(JSON.parse(stdout))}catch{reject(new ExtractorError('Invalid response from the media extractor.',502))}})
  })
 }finally{await cookieSession.cleanup()}
}
export type MediaFormat={url:string;ext:string;vcodec:string;acodec:string;height:number;http_headers?:Record<string,string>;format_id?:string}
export function mediaFormats(meta:any):MediaFormat[]{return Array.isArray(meta?.formats)&&meta.formats.length?meta.formats:meta?.url?[meta]:[]}
export function formatQualities(meta:any):{value:string;label:string}[]{
 const s=new Set<number>();for(const f of mediaFormats(meta)){const h=Number(f?.height||0);if(h>=144&&h<=4320&&f?.vcodec&&f.vcodec!=='none'&&/^https:\/\//.test(String(f.url||'')))s.add(h)}
 return [...s].sort((a,b)=>b-a).map(n=>({value:String(n),label:`${n}p`}))
}
export const audioAvailable=(meta:any)=>mediaFormats(meta).some(f=>f?.acodec&&f.acodec!=='none')

const publicAddress=(address:string):boolean=>{
 if(isIP(address)===4){
  const n=address.split('.').map(Number),a=n[0],b=n[1],c=n[2]
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||(b===0&&c===0)||(b===0&&c===2)))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113))
 }
 if(isIP(address)===6){
  if(address.toLowerCase().includes('::ffff:'))return false
  const first=parseInt(address.split(':')[0],16)
  return first>=0x2000&&first<=0x3fff
 }
 return false
}
export async function secureSource(f:MediaFormat):Promise<URL>{
 let u:URL;try{u=new URL(f.url)}catch{throw new ExtractorError('Unsupported media source URL.')}
 const host=u.hostname.toLowerCase()
 if(u.protocol!=='https:'||u.username||u.password||u.port||isIP(host)||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||!host.includes('.'))throw new ExtractorError('The media extractor returned an unsafe streaming host.',400)
 // Existing Googlevideo hosts are allowed in offline tests; third-party CDNs are checked against public DNS.
 if(!matchesHost(host,'googlevideo.com')&&!matchesHost(host,'youtube.com')){
  let records:{address:string;family:number}[]=[]
  try{records=await lookup(host,{all:true})}catch{throw new ExtractorError('The source CDN cannot be resolved. Try another public post.',502)}
  if(!records.length||records.some(record=>!publicAddress(record.address)))throw new ExtractorError('The source CDN resolved to a blocked network.',400)
 }
 return u
}
export function qualitySelector(quality:number){return `bv*[ext=mp4][height<=${quality}]+ba[ext=m4a]/b[ext=mp4][height<=${quality}]/bv*[height<=${quality}]+ba/b[height<=${quality}]`}
export async function selectStreams(data:any,format:'mp3'|'mp4'):Promise<{video?:MediaFormat,audio?:MediaFormat}>{
 const arr=Array.isArray(data?.requested_formats)?data.requested_formats:[]
 const selected=arr.length?arr:Array.isArray(data?.formats)?data.formats.filter((f:any)=>f?.format_id===data?.format_id):[data]
 const video=selected.find((x:any)=>x?.vcodec&&x.vcodec!=='none')
 const audio=selected.find((x:any)=>x?.acodec&&x.acodec!=='none')
 if(format==='mp3'&&!audio)throw new ExtractorError('This post has no usable audio track.')
 if(audio)await secureSource(audio)
 if(format==='mp4'){
  if(!video)throw new ExtractorError('A video stream was not available at this quality.')
  await secureSource(video)
  return {video,audio}
 }
 return {audio}
}
export function safeFilename(s:string){return String(s||'AUDIXO Media').replace(/[\x00-\x1f\x80-\x9f]/g,' ').replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim().slice(0,145)||'AUDIXO Media'}
export function key(){return process.env.AUDIXO_SIGNING_SECRET||process.env.AUDIXO_COOKIE_PASSWORD||''}
export function sign(payload:string){if(!key())throw new Error('Set AUDIXO_SIGNING_SECRET in Vercel (private random value).');return createHmac('sha256',key()).update(payload).digest('base64url')}
export function verify(payload:string,mac:string){try{const a=Buffer.from(sign(payload)),b=Buffer.from(mac);return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}}

export function makeToken(input:{url:string;format:'mp3'|'mp4';quality?:string;bitrate?:number}){
 const url=parseVideoUrl(input.url)
 const json=JSON.stringify({...input,url,exp:Date.now()+8*60*1000})
 const data=Buffer.from(json).toString('base64url')
 return data+'.'+sign(data)
}
export function readToken(value:unknown){
 if(typeof value!=='string'||value.length>3500)throw new ExtractorError('Invalid or expired download link.',403)
 const [encoded,mac,extra]=value.split('.');if(!encoded||!mac||extra||!verify(encoded,mac))throw new ExtractorError('Invalid download authorization.',403)
 let p:any;try{p=JSON.parse(Buffer.from(encoded,'base64url').toString())}catch{throw new ExtractorError('Invalid download authorization.',403)}
 if(!p||typeof p.url!=='string'||!['mp3','mp4'].includes(p.format)||!Number.isSafeInteger(p.exp)||p.exp<Date.now()||p.exp>Date.now()+10*60*1000)throw new ExtractorError('This download link has expired. Analyze again.',403)
 try{if(parseVideoUrl(p.url)!==p.url)throw new Error('invalid')}catch{throw new ExtractorError('Invalid media link in download authorization.',403)}
 if(p.format==='mp4'&&(!Number.isInteger(Number(p.quality))||Number(p.quality)<144||Number(p.quality)>4320))throw new ExtractorError('Invalid video resolution.',400)
 if(p.format==='mp3'&&![64,128,192,256,320].includes(Number(p.bitrate)))throw new ExtractorError('Invalid MP3 bitrate.',400)
 return p as {url:string,format:'mp3'|'mp4',quality?:string,bitrate?:number,exp:number}
}
