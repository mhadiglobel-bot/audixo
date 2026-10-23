import {randomUUID} from 'node:crypto';

export const QUALITY_VALUES = Object.freeze(['144','240','360','480','720','1080','1440','2160','4320']);
export const BITRATES = Object.freeze([64,128,192,256,320]);

export class WorkerError extends Error {
  constructor(message,code='UPSTREAM_ERROR',status=500){super(message);this.name='WorkerError';this.code=code;this.status=status;}
}

/** Accept only ordinary YouTube video URLs, shorts, live, and exact 11-char IDs.
 * Never hand arbitrary user-provided URLs to yt-dlp. */
export function normalizeYoutubeUrl(value){
  if(typeof value!=='string'||value.length>2048)throw new WorkerError('Enter a valid YouTube video URL.','INVALID_REQUEST',400);
  const input=value.trim();
  if(/^[A-Za-z0-9_-]{11}$/.test(input))return `https://www.youtube.com/watch?v=${input}`;
  let url;try{url=new URL(input);}catch{throw new WorkerError('Enter a valid YouTube video URL.','INVALID_REQUEST',400);}
  if(url.protocol!=='https:')throw new WorkerError('YouTube URL must use HTTPS.','INVALID_REQUEST',400);
  if(url.username||url.password||url.port)throw new WorkerError('Unexpected YouTube URL components.','INVALID_REQUEST',400);
  const host=url.hostname.toLowerCase();
  if(!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(host))throw new WorkerError('Only YouTube video links are allowed.','INVALID_REQUEST',400);
  let id='';
  if(host==='youtu.be')id=url.pathname.slice(1);
  else if(url.pathname==='/watch')id=url.searchParams.get('v')??'';
  else if(/^\/(?:shorts|live|embed)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname))id=url.pathname.split('/')[2];
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new WorkerError('This link does not contain a valid video ID.','INVALID_REQUEST',400);
  return `https://www.youtube.com/watch?v=${id}`;
}

const isDrm=(f)=>f.has_drm===true||f.drm===true||f.is_drm===true||f.unusable===true;
const isUsable=(f)=>f&&typeof f==='object'&&!isDrm(f)&&f.available!==false&&f.downloadable!==false&&f.protocol!=='m3u8_native'&&f.protocol!=='m3u8'&&!/storyboard|mhtml|images/i.test(String(f.format_note??''))&&typeof f.format_id==='string'&&f.format_id.length>0&&f.format_id.length<100;
const isAudio=(f)=>isUsable(f)&&typeof f.acodec==='string'&&f.acodec!=='none'&&(!f.vcodec||f.vcodec==='none');
const isVideo=(f)=>isUsable(f)&&typeof f.vcodec==='string'&&f.vcodec!=='none'&&Number.isInteger(Number(f.height))&&Number(f.height)>0;
const bitrate=(f)=>Number(f.tbr??f.abr??f.vbr??0)||0;
const videoScore=(f)=>{
  const codec=String(f.vcodec||'');
  const browserBonus=codec.startsWith('avc1')||codec.startsWith('h264')?2e6:0;
  const extBonus=f.ext==='mp4'?1e6:0;
  return browserBonus+extBonus+Math.min(5000,bitrate(f));
};
export function discoverFormats(meta){
  const formats=Array.isArray(meta?.formats)?meta.formats:[];
  const audios=formats.filter(isAudio).sort((a,b)=>{
    const aPref=String(a.acodec).startsWith('mp4a')?5000:0;
    const bPref=String(b.acodec).startsWith('mp4a')?5000:0;
    return (bPref+bitrate(b))-(aPref+bitrate(a));
  });
  if(audios.length===0)return {qualities:[],audio:null,videoByQuality:new Map()};
  const videoByQuality=new Map();
  for(const format of formats.filter(isVideo)){
    const value=String(Number(format.height));
    if(!QUALITY_VALUES.includes(value))continue;
    const old=videoByQuality.get(value);
    if(!old||videoScore(format)>videoScore(old))videoByQuality.set(value,format);
  }
  const qualities=[...videoByQuality.keys()].sort((a,b)=>Number(a)-Number(b)).map(value=>({value,label:`${value}p`}));
  return {qualities,audio:audios[0],videoByQuality};
}
export function selectFormat(meta,format,quality='',mp3Bitrate=320){
  const found=discoverFormats(meta);
  if(!found.audio)throw new WorkerError('No usable audio stream is available for this video.','QUALITY_UNAVAILABLE',422);
  if(format==='mp3'){
    if(!BITRATES.includes(mp3Bitrate))throw new WorkerError('Unsupported MP3 bitrate.','INVALID_REQUEST',400);
    return {formatId:found.audio.format_id,bitrate:mp3Bitrate,kind:'mp3'};
  }
  if(format!=='mp4'||!QUALITY_VALUES.includes(String(quality)))throw new WorkerError('Choose a supported MP4 quality.','INVALID_REQUEST',400);
  const video=found.videoByQuality.get(String(quality));
  if(!video)throw new WorkerError(`${quality}p is not available for this video.`, 'QUALITY_UNAVAILABLE',422);
  return {formatId:`${video.format_id}+${found.audio.format_id}`,quality:String(quality),videoCodec:String(video.vcodec),kind:'mp4'};
}
export function classifyDownloaderError(message){
  const raw=String(message??'').toLowerCase();
  if(/requested format is not available|no video formats found|format is not available|does not have any formats|quality unavailable/.test(raw))return {code:'QUALITY_UNAVAILABLE',message:'The requested video resolution is not available.'};
  if(/sign in to confirm|not a bot|http error 403|forbidden|po token|challenge solving|n challenge|cookies.*expired|login required|sign in to youtube/.test(raw))return {code:'SOURCE_FORBIDDEN',message:'YouTube refused source access. An administrator may need to refresh a YouTube-only session; availability is not guaranteed.'};
  if(/private video|video unavailable|video has been removed|copyright/.test(raw))return {code:'SOURCE_FORBIDDEN',message:'This video is unavailable or access-restricted.'};
  if(/429|too many requests|rate limit/.test(raw))return {code:'UPSTREAM_LIMIT',message:'The video source is temporarily rate-limiting requests.'};
  return {code:'JOB_FAILED',message:'Media processing failed. Check server logs without exposing cookies.'};
}
export function sanitizeFilename(title){
  const value=String(title??'YouTube video').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120).replace(/[. ]+$/,'');
  return value||`Audixo-${randomUUID().slice(0,8)}`;
}
export function allowedYoutubeCookieFile(text){
  if(typeof text!=='string'||!/^# (?:Netscape HTTP Cookie File|HTTP Cookie File)/.test(text.slice(0,100)))throw new WorkerError('Cookie file must be in Netscape cookies.txt format.','INVALID_REQUEST',400);
  const records=text.split(/\r?\n/).filter(x=>x.trim()&&!x.startsWith('#'));
  if(!records.length||records.length>1000)throw new WorkerError('YouTube cookie file is empty or too large.','INVALID_REQUEST',400);
  for(const record of records){
    const parts=record.split('\t');
    if(parts.length!==7)throw new WorkerError('Invalid cookie-file record.','INVALID_REQUEST',400);
    const domain=parts[0].replace(/^#HttpOnly_/,'').replace(/^\./,'').toLowerCase();
    if(!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(domain))throw new WorkerError('This file contains non-YouTube cookies. Export only YouTube cookies; never upload an all-sites browser export.','INVALID_REQUEST',400);
  }
  return {records:records.length};
}
