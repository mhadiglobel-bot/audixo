import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes,timingSafeEqual,createHmac} from 'node:crypto';
import {createReadStream,existsSync} from 'node:fs';
import {mkdir,readFile,writeFile,readdir,rename,rm,stat,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeYoutubeUrl,discoverFormats,selectFormat,classifyDownloaderError,sanitizeFilename,allowedYoutubeCookieFile,WorkerError,BITRATES} from './lib.mjs';

const dataDir=path.resolve(process.env.AUDIXO_DATA_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'data'));
const privateDir=path.join(dataDir,'private');
const jobsDir=path.join(dataDir,'jobs');
const cookiePath=path.join(privateDir,'youtube-cookies.txt');
const workerToken=process.env.AUDIXO_WORKER_TOKEN||'';
const adminToken=process.env.AUDIXO_ADMIN_TOKEN||'';
const ytBinary=process.env.YT_DLP_BIN||'yt-dlp';
const ffmpegBinary=process.env.FFMPEG_BIN||'ffmpeg';
const ffprobeBinary=process.env.FFPROBE_BIN||'ffprobe';
const maxConcurrent=Math.max(1,Math.min(3,Number(process.env.AUDIXO_MAX_CONCURRENT)||2));
const port=Number(process.env.PORT)||8080;
const active=new Map();
const pending=[];
const readiness={yt:false,ffmpeg:false,ffprobe:false};
const cache=new Map();
const rateWindow=new Map();
const MAX_JOBS_PER_WINDOW=Math.max(1,Math.min(30,Number(process.env.AUDIXO_MAX_JOBS_PER_10MIN)||6));
let running=0;

if(workerToken.length<32)throw new Error('AUDIXO_WORKER_TOKEN must be at least 32 random characters. Never put it in the frontend or GitHub.');
if(adminToken.length<32||adminToken===workerToken)throw new Error('AUDIXO_ADMIN_TOKEN must be a distinct 32+ character secret.');
await mkdir(privateDir,{recursive:true,mode:0o700});
await mkdir(jobsDir,{recursive:true,mode:0o700});
const opaqueEqual=(expected,actual)=>{
  const a=Buffer.from(expected),b=Buffer.from(String(actual??''));
  return a.length===b.length&&timingSafeEqual(a,b);
};
const authorize=(request)=>opaqueEqual(`Bearer ${workerToken}`,request.headers.authorization);
const authorizeAdmin=(request)=>opaqueEqual(adminToken,request.headers['x-audixo-admin']);
// Short-lived one-time download URLs bypass the Vercel Function's 4.5 MB
// payload ceiling. The master worker token remains private.
const DOWNLOAD_TICKET_TTL=120_000;
const ticketSignature=(id,expires)=>createHmac('sha256',workerToken)
  .update(`audixo-download-v1:${id}:${expires}`).digest('hex');
const validTicket=(id,expiresText,signature)=>{
  if(typeof expiresText!=='string'||!/^[0-9]{13}$/.test(expiresText)||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return false;
  const expiry=Number(expiresText),now=Date.now();
  if(!Number.isSafeInteger(expiry)||expiry<now||expiry>now+DOWNLOAD_TICKET_TTL)return false;
  return opaqueEqual(ticketSignature(id,expiry),signature);
};
const json=(res,status,value)=>{if(res.headersSent)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'none'});res.end(JSON.stringify(value));};
const fail=(res,error)=>{
  const err=error instanceof WorkerError?error:new WorkerError('Unexpected media-worker error.','JOB_FAILED',500);
  // No cookie contents, raw authenticated URLs, yt-dlp stderr or signed media URLs.
  if(!(error instanceof WorkerError))console.error('Worker failure:',error?.name||'Error');
  json(res,err.status,{ok:false,code:err.code,error:err.message});
};
const inputJson=async(req,maxBytes=24_000)=>{
  let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size>maxBytes)throw new WorkerError('Request body too large.','INVALID_REQUEST',413);text+=chunk.toString('utf8');}
  try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('not object');return value;}catch{throw new WorkerError('Send a valid JSON object.','INVALID_REQUEST',400);}
};
const authFlag=()=>existsSync(cookiePath)?['--cookies',cookiePath]:[];
const commonYtArgs=()=>['--no-playlist','--no-warnings','--js-runtimes','node',...authFlag()];

function execute(command,args,{timeoutMs=90000,onLine,limitBytes=12_000_000,onSpawn}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{shell:false,stdio:['ignore','pipe','pipe'],env:{...process.env,HOME:process.env.HOME||'/tmp'}});
  onSpawn?.(child);
  let stdout='',stderr='',size=0,done=false;
  const timer=setTimeout(()=>{child.kill('SIGKILL');close(new WorkerError('Media processing exceeded the time limit.','UPSTREAM_LIMIT',504))},timeoutMs);
  const close=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(result)};
  const feed=(chunk,which)=>{
   size+=chunk.length;
   if(size>limitBytes){child.kill('SIGKILL');return close(new WorkerError('Media command output exceeded the safety limit.','UPSTREAM_LIMIT',503));}
   const decoded=chunk.toString('utf8');
   if(which==='out')stdout+=decoded;else stderr+=decoded;
   if(onLine)onLine(decoded,which);
  };
  child.stdout.on('data',x=>feed(x,'out'));child.stderr.on('data',x=>feed(x,'err'));
  child.once('error',()=>close(new WorkerError('Media binaries are not installed. Check the worker image.','ORIGIN_UNAVAILABLE',503)));
  child.once('close',code=>code===0?close(null,{stdout,stderr}):close(new WorkerError(classifyDownloaderError(stderr||stdout).message,classifyDownloaderError(stderr||stdout).code,422)));
 });
}

async function inspectSource(url,fresh=false){
 const id=new URL(url).searchParams.get('v');
 const cached=cache.get(id);
 if(!fresh&&cached&&cached.expires>Date.now())return cached.data;
 let result;
 try{result=await execute(ytBinary,[...commonYtArgs(),'--dump-single-json','--skip-download',url],{timeoutMs:80000,limitBytes:14_000_000});}
 catch(error){if(error instanceof WorkerError)throw error;throw new WorkerError('Could not analyze this video.','SOURCE_FORBIDDEN',502);}
 let meta;
 try{meta=JSON.parse(result.stdout.trim());}catch{throw new WorkerError('Media discovery did not return valid metadata.','UPSTREAM_ERROR',502);}
 if(!meta||typeof meta!=='object'||meta.is_live||meta.live_status==='is_live')throw new WorkerError('Live streams are not supported.','INVALID_REQUEST',422);
 const found=discoverFormats(meta);
 const data={url,title:String(meta.title||'YouTube video').slice(0,250),author:String(meta.uploader||meta.channel||'').slice(0,130),duration:Number(meta.duration)||0,thumbnail:typeof meta.thumbnail==='string'&&meta.thumbnail.startsWith('https://')?meta.thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,qualities:found.qualities,formatData:meta};
 cache.set(id,{expires:Date.now()+240_000,data});
 if(cache.size>80){const oldest=cache.keys().next().value;cache.delete(oldest);}
 return data;
}

function display(job){
 return {ok:true,job_id:job.id,status:job.state,stage:job.stage,message:job.message||'',progress:Math.round(job.progress*10)/10,title:job.title,format:job.format,quality:job.quality||undefined,actual_width:job.width,actual_height:job.height,actual_audio_bitrate_kbps:job.kbps,error:job.error||null,code:job.errorCode||undefined,created_at:job.createdAt,updated_at:job.updatedAt,download:{percent:Math.round(job.downloadPercent*10)/10,speed:job.speed||'',eta:job.eta||''},download_url:job.state==='ready'&&!job.delivered?`/jobs/${job.id}/file`:null};
}
const broadcast=(job,type='progress')=>{
 job.updatedAt=Date.now();
 const message=`event: ${type}\ndata: ${JSON.stringify(display(job))}\n\n`;
 for(const r of job.listeners){try{r.write(message);}catch{job.listeners.delete(r)}};
};
const update=(job,stage,progress,message)=>{job.state='processing';job.stage=stage;job.progress=Math.max(job.progress,Math.min(98,progress));job.message=message;broadcast(job,stage==='merging'||stage==='converting'?'stage':'progress');};

async function probe(file){
 let result;
 try{result=await execute(ffprobeBinary,['-v','error','-show_entries','stream=codec_type,codec_name,width,height,bit_rate:format=bit_rate,duration','-of','json',file],{timeoutMs:35000,limitBytes:500_000});}
 catch{throw new WorkerError('FFprobe could not inspect the output file.','JOB_FAILED',502);}
 try{return JSON.parse(result.stdout);}catch{throw new WorkerError('The media output could not be verified.','JOB_FAILED',502);}
}
const usableFiles=async(dir)=>{
 const list=await readdir(dir,{withFileTypes:true});
 const out=[];
 for(const item of list){if(!item.isFile()||!/\.(mp4|m4a|webm|mkv|opus|ogg|mp3|aac|mov)$/i.test(item.name))continue;const name=path.join(dir,item.name);const info=await stat(name);if(info.size>2048)out.push({name,size:info.size,mtimeMs:info.mtimeMs});}
 return out.sort((a,b)=>b.mtimeMs-a.mtimeMs);
};
const launch=async(job)=>{
 job.state='processing';job.stage='metadata';job.progress=1;broadcast(job,'stage');
 const source=await inspectSource(job.url,true);
 const plan=selectFormat(source.formatData,job.format,job.quality,job.bitrate);
 const directory=path.join(jobsDir,job.id);await mkdir(directory,{recursive:true,mode:0o700});
 job.directory=directory;
 const downloadTemplate=path.join(directory,'source.%(ext)s');
 let stdoutTail='';
 let pendingLine='';
 const progressCallback=(chunk)=>{
  pendingLine+=chunk;
  const split=pendingLine.split(/\r|\n/);pendingLine=split.pop()||'';
  for(const line of split){
   if(line.includes('%')){
    const match=line.match(/(\d+(?:\.\d+)?)\s*%/);
    if(match){const pct=Math.min(100,Number(match[1]));job.downloadPercent=pct;update(job,'downloading',Math.max(4,pct*.66),`Downloading audio/video: ${pct.toFixed(1)}%`);}
   }
  }
 };
 const args=[...commonYtArgs(),'--no-mtime','--newline','--no-simulate','--format',plan.formatId,'--merge-output-format','mkv','--output',downloadTemplate,'--progress-template','download:%(progress._percent_str)s','--max-filesize','750M',job.url];
 update(job,'preparing',3,'Preparing media streams');
 await execute(ytBinary,args,{timeoutMs:20*60_000,limitBytes:4_000_000,onLine:(text)=>{stdoutTail=(stdoutTail+text).slice(-800);progressCallback(text)}});
 const files=await usableFiles(directory);
 if(!files.length)throw new WorkerError('Download completed without a valid source file.','JOB_FAILED',502);
 const input=files[0].name;
 const output=path.join(directory,`output.${job.format}`);
 update(job,'converting',70,job.format==='mp4'?'Merging and preparing compatible MP4':'Encoding the selected MP3 bitrate');
 if(job.format==='mp3'){
  const ffArgs=['-hide_banner','-loglevel','error','-y','-i',input,'-map','0:a:0','-vn','-c:a','libmp3lame','-b:a',`${job.bitrate}k`,'-ar','44100','-id3v2_version','3',output];
  await execute(ffmpegBinary,ffArgs,{timeoutMs:12*60_000,limitBytes:200_000});
 }else{
  const copyVideo=/^(?:avc1|h264)/.test(plan.videoCodec);
  const ffArgs=['-hide_banner','-loglevel','error','-y','-i',input,'-map','0:v:0','-map','0:a:0',...(copyVideo?['-c:v','copy']:['-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p']),'-c:a','aac','-b:a','192k','-movflags','+faststart','-threads','2',output];
  await execute(ffmpegBinary,ffArgs,{timeoutMs:20*60_000,limitBytes:200_000});
 }
 const info=await stat(output).catch(()=>null);
 if(!info||info.size<2048)throw new WorkerError('Final media file is empty or missing.','JOB_FAILED',502);
 const inspection=await probe(output);
 if(job.format==='mp4'){
  const stream=(inspection.streams||[]).find(x=>x.codec_type==='video');
  if(!stream||Number(stream.height)!==Number(job.quality))throw new WorkerError('Output resolution did not match the requested quality.','QUALITY_MISMATCH',422);
  if(!(inspection.streams||[]).some(x=>x.codec_type==='audio'))throw new WorkerError('Output MP4 has no audio stream.','WRONG_FILE_TYPE',502);
  job.width=Number(stream.width);job.height=Number(stream.height);
 }else{
  const stream=(inspection.streams||[]).find(x=>x.codec_type==='audio');
  if(!stream||stream.codec_name!=='mp3')throw new WorkerError('MP3 encoder returned the wrong file type.','WRONG_FILE_TYPE',502);
  const rawBitrate=Number(stream.bit_rate||inspection.format?.bit_rate);
  if(!Number.isFinite(rawBitrate)||rawBitrate<job.bitrate*900)throw new WorkerError('Output MP3 bitrate could not be confirmed.','JOB_FAILED',502);
  job.kbps=Math.round(rawBitrate/1000);
 }
 job.file=output;
 job.size=info.size;
 job.state='ready';job.stage='ready';job.progress=100;job.message='File encoded and verified';job.updatedAt=Date.now();
 await persistJob(job);
 broadcast(job,'complete');
 // Source files can be safely removed after final MP3/MP4 is verified.
 for(const file of files){if(file.name!==job.file)await rm(file.name,{force:true}).catch(()=>{})}
};
const queueWork=()=>{
 while(running<maxConcurrent&&pending.length){
  const job=pending.shift();running++;
  void launch(job).catch(error=>{
   const result=error instanceof WorkerError?{code:error.code,message:error.message}:classifyDownloaderError(error?.message||'');
   job.state='failed';job.stage='failed';job.errorCode=result.code;job.error=result.message;job.updatedAt=Date.now();
   broadcast(job,'error');
   void persistJob(job).catch(()=>{});
   if(job.directory)void rm(job.directory,{recursive:true,force:true}).catch(()=>{});
  }).finally(()=>{running--;queueWork()});
 }
};
const manifestPath=(job)=>path.join(jobsDir,job.id,'job.json');
const persistJob=async(job)=>{
 const folder=path.join(jobsDir,job.id);await mkdir(folder,{recursive:true,mode:0o700});
 const manifest={id:job.id,url:job.url,title:job.title,format:job.format,quality:job.quality,bitrate:job.bitrate,progress:job.progress,downloadPercent:job.downloadPercent,state:job.state,stage:job.stage,createdAt:job.createdAt,updatedAt:job.updatedAt,delivered:job.delivered,error:job.error,errorCode:job.errorCode,width:job.width,height:job.height,kbps:job.kbps};
 const tmp=path.join(folder,`job-${randomBytes(6).toString('hex')}.tmp`);await writeFile(tmp,JSON.stringify(manifest),{mode:0o600});await rename(tmp,manifestPath(job));
};
const recoverJobs=async()=>{
 for(const folder of await readdir(jobsDir,{withFileTypes:true})){
  if(!folder.isDirectory()||!/^([a-f0-9]{32})$/.test(folder.name))continue;
  try{
   const data=JSON.parse(await readFile(path.join(jobsDir,folder.name,'job.json'),'utf8'));
   if(Date.now()-Number(data.createdAt)>55*60_000)continue;
   const recovered={...data,listeners:new Set(),inDelivery:false,directory:path.join(jobsDir,folder.name),message:'Worker restarted.'};
   if(data.state==='ready'&&!data.delivered){const target=path.join(recovered.directory,`output.${data.format}`);const file=await stat(target);if(file.size>2048){recovered.file=target;recovered.size=file.size}else{recovered.state='failed';recovered.errorCode='JOB_FAILED'}}
   else if(data.state==='processing'||data.state==='queued'){recovered.state='failed';recovered.stage='failed';recovered.errorCode='JOB_FAILED';recovered.error='Conversion interrupted by a worker restart; start a fresh job.'}
   active.set(folder.name,recovered);
  }catch{continue}
 }
};
const submitJob=async(input,source,format,quality,bitrate,clientKey='')=>{
 const identity=/^[a-f0-9]{64}$/.test(clientKey)?clientKey:'shared-worker-access';
 const now=Date.now();
 const previous=(rateWindow.get(identity)||[]).filter(time=>now-time<10*60_000);
 if(previous.length>=MAX_JOBS_PER_WINDOW)throw new WorkerError('Please wait before starting more conversions.','UPSTREAM_LIMIT',429);
 previous.push(now);rateWindow.set(identity,previous);
 if(pending.length>15)throw new WorkerError('Media queue is temporarily full. Please retry shortly.','UPSTREAM_LIMIT',429);
 const id=randomBytes(16).toString('hex');
 const job={id,url:input,title:source.title,format,quality,bitrate,progress:0,downloadPercent:0,state:'queued',stage:'queued',createdAt:Date.now(),updatedAt:Date.now(),listeners:new Set(),delivered:false,error:'',message:'Waiting in queue'};
 active.set(id,job);await persistJob(job);pending.push(job);queueWork();return job;
};
const jobById=(value)=>{
 if(!/^[a-f0-9]{32}$/.test(value||''))throw new WorkerError('Invalid job reference.','INVALID_REQUEST',400);
 const job=active.get(value);if(!job)throw new WorkerError('This job has expired or does not exist.','FILE_UNAVAILABLE',404);
 return job;
};

const adminPage=String.raw`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AUDIXO Private Cookie Setup</title><style>body{font:16px system-ui;background:#f7faff;color:#203454;max-width:640px;margin:9vh auto;padding:22px}section{background:white;border:1px solid #dce5f4;border-radius:22px;padding:26px;box-shadow:0 15px 40px #a6b6ce2a}label{display:block;margin:20px 0 8px}input{width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #c9d4e6}button{margin-top:22px;padding:14px 20px;border:0;border-radius:12px;background:linear-gradient(90deg,#dd39ee,#11cbea);font-weight:700}small{display:block;color:#677b97;margin:16px 0;line-height:1.5}</style><section><h1>🔒 AUDIXO / Session Setup</h1><p>Private worker administration. Never upload an export containing Google or other websites' cookies.</p><label>Administrator token</label><input type="password" id="secret" autocomplete="off"><label>YouTube-only Netscape cookies.txt</label><input type="file" id="cookie" accept=".txt,text/plain"><small>The file is validated; all domains must be YouTube domains. It is stored on the worker volume, not on Vercel or GitHub.</small><button id="upload">Install Private Cookies</button><p id="message" role="status"></p></section><script>document.getElementById('upload').onclick=async()=>{const secret=document.getElementById('secret').value;const file=document.getElementById('cookie').files[0];const out=document.getElementById('message');if(!secret||!file){out.textContent='Choose a file and enter the admin token.';return}if(file.size>120000){out.textContent='File too large';return}try{const response=await fetch('/admin/cookies',{method:'POST',headers:{'x-audixo-admin':secret,'Content-Type':'text/plain'},body:await file.text()});const data=await response.json();out.textContent=data.ok?'YouTube-only cookies installed successfully.':(data.error||'Upload rejected.')}catch{out.textContent='Worker could not be reached.'}};</script></html>`;

// Browser downloads directly from this HTTPS worker with a one-time,
// narrowly-scoped HMAC ticket. No authorization header or YouTube cookie is sent.
async function deliverFile(job,res){
  if(job.delivered)throw new WorkerError('This file has already been downloaded. Start a new conversion.','FILE_UNAVAILABLE',410);
  if(job.state!=='ready'||!job.file)throw new WorkerError('This conversion is not ready for download.','FILE_UNAVAILABLE',409);
  if(job.inDelivery)throw new WorkerError('A download is already in progress.','UPSTREAM_LIMIT',409);
  const info=await stat(job.file).catch(()=>null);
  if(!info||info.size<2048)throw new WorkerError('The final output file is missing.','FILE_UNAVAILABLE',404);
  job.inDelivery=true;
  const safe=sanitizeFilename(job.title)+'.'+job.format;
  res.writeHead(200,{'Content-Type':job.format==='mp4'?'video/mp4':'audio/mpeg','Content-Length':String(info.size),
    'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(safe)}`,
    'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Accept-Ranges':'none'});
  const source=createReadStream(job.file);
  let finished=false;
  res.once('finish',()=>{
    finished=true;job.delivered=true;job.inDelivery=false;
    job.message='File delivered. To download again, start a new job.';
    broadcast(job,'file_delivered');
    void rm(job.directory,{recursive:true,force:true}).catch(()=>{});
  });
  res.once('close',()=>{if(!finished){source.destroy();job.inDelivery=false;}});
  source.once('error',()=>{job.inDelivery=false;res.destroy();});
  source.pipe(res);
}

const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Cache-Control','no-store');
 const url=new URL(req.url||'/',`http://localhost:${port}`);
 try{
  if(req.method==='GET'&&url.pathname==='/live'){
   // Public, non-sensitive readiness endpoint for Render/other host probes.
   const ready=Object.values(readiness).every(Boolean);
   json(res,ready?200:503,{ok:ready,service:'audixo-media-worker'});return;
  }
  const direct=url.pathname.match(/^\/download\/([a-f0-9]{32})$/);
  if(req.method==='GET'&&direct){
   if(!validTicket(direct[1],url.searchParams.get('expires'),url.searchParams.get('sig')))
     throw new WorkerError('This secure download link has expired or is invalid.','FILE_FORBIDDEN',403);
   await deliverFile(jobById(direct[1]),res);return;
  }
  if(req.method==='GET'&&url.pathname==='/admin'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none';style-src 'unsafe-inline';script-src 'unsafe-inline';connect-src 'self';base-uri 'none';frame-ancestors 'none'"});res.end(adminPage);return;
  }
  if(url.pathname==='/admin/cookies'){
   if(req.method!=='POST')throw new WorkerError('Use POST.','INVALID_REQUEST',405);
   if(!authorizeAdmin(req))throw new WorkerError('Administrator authentication required.','SERVICE_AUTH',401);
   let text='',length=0;for await(const chunk of req){length+=chunk.length;if(length>120000)throw new WorkerError('Cookie export is too large.','INVALID_REQUEST',413);text+=chunk.toString('utf8');}
   const accepted=allowedYoutubeCookieFile(text);
   const tmp=path.join(privateDir,`cookie-${randomBytes(6).toString('hex')}.tmp`);
   await writeFile(tmp,text,{mode:0o600,flag:'wx'});await chmod(tmp,0o600);await rename(tmp,cookiePath);
   cache.clear();json(res,200,{ok:true,message:'YouTube-only session installed privately.',records:accepted.records});return;
  }
  if(!authorize(req))throw new WorkerError('Worker authentication required.','SERVICE_AUTH',401);
  if(!Object.values(readiness).every(Boolean))throw new WorkerError('Required media binaries are not healthy.','ORIGIN_UNAVAILABLE',503);
  if(req.method==='GET'&&url.pathname==='/health'){
   json(res,200,{ok:true,ready:true,authenticated:existsSync(cookiePath),max_concurrent:maxConcurrent,active_downloads:running,queued:pending.length,message:existsSync(cookiePath)?'Private YouTube session configured':'Public YouTube videos can be attempted without a session; cookies are optional.'});return;
  }
  if(req.method==='POST'&&url.pathname==='/preview'){
   const data=await inputJson(req);const video=normalizeYoutubeUrl(data.url);const result=await inspectSource(video);
   json(res,200,{ok:true,url:video,title:result.title,uploader:result.author,duration:result.duration,thumbnail:result.thumbnail,qualities:result.qualities});return;
  }
  if(req.method==='POST'&&url.pathname==='/jobs'){
   const data=await inputJson(req);const video=normalizeYoutubeUrl(data.url);
   const format=data.format??'mp3';if(!['mp3','mp4'].includes(format))throw new WorkerError('Only MP3 and MP4 are available.','INVALID_REQUEST',400);
   const quality=String(data.quality??'');const bitrate=Number(data.bitrate??320);
   const source=await inspectSource(video,true);
   try{selectFormat(source.formatData,format,quality,bitrate)}catch(err){if(err instanceof WorkerError&&err.code==='QUALITY_UNAVAILABLE'){
    const qualities=source.qualities.map(q=>q.value);
    json(res,422,{ok:false,code:err.code,error:err.message,available_qualities:qualities});return;
   }throw err;}
   const clientKey=String(req.headers['x-audixo-client-key']||'');
   const job=await submitJob(video,source,format,quality,bitrate,clientKey);json(res,202,display(job));return;
  }
  const status=url.pathname.match(/^\/jobs\/([a-f0-9]{32})$/);
  if(req.method==='GET'&&status){json(res,200,display(jobById(status[1])));return;}
  const events=url.pathname.match(/^\/jobs\/([a-f0-9]{32})\/events$/);
  if(req.method==='GET'&&events){
   const job=jobById(events[1]);
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
   job.listeners.add(res);res.write(`event: connected\ndata: ${JSON.stringify(display(job))}\n\n`);
   if(job.state==='ready'||job.state==='failed')res.write(`event: ${job.state==='ready'?'complete':'error'}\ndata: ${JSON.stringify(display(job))}\n\n`);
   const pulse=setInterval(()=>{if(!res.destroyed)res.write('event: heartbeat\ndata: {}\n\n')},12000);
   req.once('close',()=>{clearInterval(pulse);job.listeners.delete(res)});return;
  }
  const ticket=url.pathname.match(/^\/jobs\/([a-f0-9]{32})\/ticket$/);
  if(req.method==='POST'&&ticket){
   const job=jobById(ticket[1]);
   if(job.delivered||job.inDelivery||job.state!=='ready'||!job.file)
     throw new WorkerError('The requested file is not ready or has already been downloaded.','FILE_UNAVAILABLE',409);
   const expires=Date.now()+DOWNLOAD_TICKET_TTL;
   json(res,200,{ok:true,path:`/download/${job.id}?expires=${expires}&sig=${ticketSignature(job.id,expires)}`,expires_at:expires,format:job.format});return;
  }
  const deprecated=url.pathname.match(/^\/jobs\/([a-f0-9]{32})\/file$/);
  if(req.method==='GET'&&deprecated){
   throw new WorkerError('Update the AUDIXO website to use secure direct downloads.','FILE_UNAVAILABLE',410);
  }
  json(res,404,{ok:false,error:'Unknown worker endpoint.',code:'INVALID_REQUEST'});
 }catch(error){fail(res,error);}
});

// No forgotten temp data: ready jobs expire; active jobs never get deleted.
setInterval(()=>{
 const threshold=Date.now()-55*60_000;
 for(const [id,job] of active){
  if(job.state==='queued'||job.state==='processing'||job.inDelivery)continue;
  if(job.updatedAt>threshold)continue;
  active.delete(id);for(const listener of job.listeners)listener.end();
  if(job.directory)void rm(job.directory,{recursive:true,force:true}).catch(()=>{});
 }
 for(const [id,entry] of cache){if(entry.expires<Date.now())cache.delete(id)}
 for(const [key,entries] of rateWindow){const fresh=entries.filter(t=>Date.now()-t<10*60_000);if(fresh.length)rateWindow.set(key,fresh);else rateWindow.delete(key)}
},60_000).unref();

for(const [key,command] of [['yt',ytBinary],['ffmpeg',ffmpegBinary],['ffprobe',ffprobeBinary]]){
 try{await execute(command,[key==='yt'?'--version':'-version'],{timeoutMs:9000,limitBytes:150_000});readiness[key]=true;}catch{readiness[key]=false;}
}
await recoverJobs();
server.listen(port,'0.0.0.0',()=>console.log(`AUDIXO private media worker on :${port}; binaries ${JSON.stringify(readiness)}; no credentials logged.`));
