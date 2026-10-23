import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeYoutubeUrl,discoverFormats,selectFormat,classifyDownloaderError,sanitizeFilename,allowedYoutubeCookieFile,WorkerError} from '../lib.mjs';

const canonical={formats:[
 {format_id:'a1',vcodec:'none',acodec:'mp4a.40.2',ext:'m4a',tbr:128},
 {format_id:'v360',vcodec:'avc1.4d401e',acodec:'none',ext:'mp4',height:360,tbr:1200},
 {format_id:'v1080',vcodec:'vp09',acodec:'none',ext:'webm',height:1080,tbr:4500},
 {format_id:'v1080weak',vcodec:'avc1.640032',acodec:'none',ext:'mp4',height:1080,tbr:2000},
 {format_id:'noAudio',vcodec:'none',acodec:'opus',ext:'webm',height:2160},
 {format_id:'drm',vcodec:'avc1.640028',acodec:'none',ext:'mp4',height:720,has_drm:true},
 {format_id:'missingAudio',vcodec:'vp09',acodec:'none',ext:'webm',height:240,available:false},
]};

test('YouTube URL validation rejects SSRF and normalizes watch/short links',()=>{
 assert.equal(normalizeYoutubeUrl('https://youtu.be/abcdefghijk'),'https://www.youtube.com/watch?v=abcdefghijk');
 assert.equal(normalizeYoutubeUrl('https://www.youtube.com/shorts/abcdefghijk'),'https://www.youtube.com/watch?v=abcdefghijk');
 assert.equal(normalizeYoutubeUrl('abcdefghijk'),'https://www.youtube.com/watch?v=abcdefghijk');
 for(const v of ['http://youtube.com/watch?v=abcdefghijk','https://youtube.com.evil.example/watch?v=abcdefghijk','https://127.0.0.1/watch?v=abcdefghijk','https://youtube.com/watch?v=123','ftp://youtube.com/watch?v=abcdefghijk'])assert.throws(()=>normalizeYoutubeUrl(v),WorkerError);
});
test('preview only real audio+video qualities, deduplicates and sorts',()=>{
 const found=discoverFormats(canonical);
 assert.deepEqual(found.qualities.map(q=>q.value),['360','1080']);
 assert.equal(found.videoByQuality.get('1080').format_id,'v1080weak');
 assert.equal(found.audio.format_id,'a1');
});
test('video-only 1080 + separate audio is usable',()=>{
 assert.equal(selectFormat(canonical,'mp4','1080').formatId,'v1080weak+a1');
});
test('no audio returns empty resolutions',()=>{
 assert.deepEqual(discoverFormats({formats:canonical.formats.filter(f=>f.vcodec!=='none')}).qualities,[]);
});
test('unsupported resolution yields 422 and exact quality',()=>{
 assert.throws(()=>selectFormat(canonical,'mp4','720'),error=>error.code==='QUALITY_UNAVAILABLE'&&error.status===422);
 assert.equal(selectFormat(canonical,'mp4','360').quality,'360');
});
test('MP3 bitrate selector supports actual values',()=>{
 assert.equal(selectFormat(canonical,'mp3','',320).bitrate,320);
 assert.equal(selectFormat(canonical,'mp3','',64).bitrate,64);
 assert.throws(()=>selectFormat(canonical,'mp3','',144),error=>error.code==='INVALID_REQUEST');
});
test('source 403 and source quality errors stay distinct',()=>{
 assert.equal(classifyDownloaderError('ERROR: HTTP Error 403 Forbidden').code,'SOURCE_FORBIDDEN');
 assert.equal(classifyDownloaderError('ERROR: requested format is not available').code,'QUALITY_UNAVAILABLE');
});
test('cookies must be only YouTube sites, no secret values echoed',()=>{
 const good='# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1950000000\tPREF\topaque\n';
 assert.deepEqual(allowedYoutubeCookieFile(good),{records:1});
 assert.throws(()=>allowedYoutubeCookieFile(good+'.google.com\tTRUE\t/\tTRUE\t1950000000\tSID\tsecret\n'),error=>error.code==='INVALID_REQUEST'&&!error.message.includes('secret'));
});
test('filenames safe against header injection',()=>{
 assert.equal(sanitizeFilename('Nice: song / test\n.mp4'),'Nice song test .mp4');
});

// Integration coverage retained from integration.test.mjs.
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const workerRoot=new URL('../',import.meta.url).pathname;
const ffmpeg=(args)=>new Promise((resolve,reject)=>{
 const child=spawn('ffmpeg',args,{stdio:'ignore'});
 child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`ffmpeg exited ${code}`)));
});
const getPort=async()=>await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))})});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// These test tools use a synthetic 1.4 second video + sine wave. NO YouTube
// URLs are contacted, NO customer cookie exports are read, no external auth.
test('worker handles preview, 422, MP3 encode, MP4 exact quality and one-time file delivery', {timeout:70000}, async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'audixo-local-integration-'));
 const fixture=path.join(temp,'fixture.mkv');
 const mock=path.join(temp,'mock-ytdlp.mjs');
 const port=await getPort();
 const secret='test-worker-token-012345678901234567890';
 const admin='test-admin-token-012345678901234567890';
 let worker;
 try{
  await ffmpeg(['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=24:duration=1.4','-f','lavfi','-i','sine=frequency=330:duration=1.4','-c:v','mpeg4','-q:v','4','-c:a','aac','-shortest',fixture]);
  const mockSource=String.raw`#!/usr/bin/env node
import {copyFile} from 'node:fs/promises';
import process from 'node:process';
const args=process.argv.slice(2);
if(args.includes('--version')){console.log('2026.10');process.exit(0)}
if(args.includes('--dump-single-json')){
 console.log(JSON.stringify({title:'Audixo Fixture: Safe/Test',uploader:'AUDIXO Test',duration:1.4,thumbnail:'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',formats:[
  {format_id:'a128',acodec:'mp4a.40.2',vcodec:'none',ext:'m4a',tbr:128},
  {format_id:'v360',vcodec:'avc1.4d401e',acodec:'none',ext:'mp4',height:360,tbr:990},
  {format_id:'v720bad',vcodec:'avc1.4d401f',acodec:'none',ext:'mp4',height:720,available:false}
 ]}));process.exit(0);
}
const template=args[args.indexOf('--output')+1];
if(!template)process.exit(5);
await copyFile(process.env.MOCK_MEDIA_FIXTURE,template.replace('%(ext)s','mkv'));
console.log('download: 50.0%');
console.log('download: 100.0%');
`;
  await writeFile(mock,mockSource,{mode:0o700});await chmod(mock,0o700);
  worker=spawn('node',['server.mjs'],{cwd:workerRoot,env:{...process.env,PORT:String(port),AUDIXO_DATA_DIR:path.join(temp,'data'),AUDIXO_WORKER_TOKEN:secret,AUDIXO_ADMIN_TOKEN:admin,YT_DLP_BIN:mock,MOCK_MEDIA_FIXTURE:fixture},stdio:['ignore','pipe','pipe']});
  let workerErr='';worker.stderr.on('data',chunk=>{workerErr+=String(chunk)});
  const base=`http://127.0.0.1:${port}`;
  async function request(route,method='GET',body,headers={}){
   const options={method,headers:{Authorization:`Bearer ${secret}`,...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})};
   return fetch(base+route,options);
  }
  let launched=false;for(let i=0;i<75;i++){if(worker.exitCode!==null)throw new Error('Worker exited early '+workerErr);try{const h=await request('/health');if(h.ok){launched=true;break}}catch{}await sleep(90)}
  assert.equal(launched,true,'worker started');
  const live=await fetch(base+'/live');assert.equal(live.status,200);
  assert.equal((await live.json()).ok,true);
  const deny=await fetch(base+'/health');assert.equal(deny.status,401);
  const preview=await request('/preview','POST',{url:'https://www.youtube.com/watch?v=abcdefghijk'});
  assert.equal(preview.status,200);const previewData=await preview.json();
  assert.deepEqual(previewData.qualities.map(item=>item.value),['360']);
  const bad=await request('/jobs','POST',{url:'https://www.youtube.com/watch?v=abcdefghijk',format:'mp4',quality:'1080'});
  assert.equal(bad.status,422);assert.equal((await bad.json()).code,'QUALITY_UNAVAILABLE');
  const rejected=await fetch(base+'/admin/cookies',{method:'POST',headers:{'x-audixo-admin':admin},body:'# Netscape HTTP Cookie File\n.google.com\tTRUE\t/\tTRUE\t1950000000\tSID\tfake\n'});
  assert.equal(rejected.status,400);
  async function run(kind){
   const created=await request('/jobs','POST',{url:'https://www.youtube.com/watch?v=abcdefghijk',format:kind,...(kind==='mp4'?{quality:'360'}:{bitrate:128})});
   assert.equal(created.status,202);const {job_id}=await created.json();assert.match(job_id,/^[a-f\d]{32}$/);
   let end;
   for(let i=0;i<200;i++){
    const snap=await request(`/jobs/${job_id}`);end=await snap.json();
    if(end.status==='ready'||end.status==='failed')break;
    await sleep(80);
   }
   assert.equal(end.status,'ready',JSON.stringify(end));
   assert.equal(end.progress,100);
   // Ticket creation remains private. The file itself is served directly
   // from the worker without credentials, so large downloads bypass Vercel.
   const noTicket=await fetch(`${base}/download/${job_id}`);
   assert.equal(noTicket.status,403);
   const issue=await request(`/jobs/${job_id}/ticket`,'POST',{});
   assert.equal(issue.status,200);
   const ticket=await issue.json();
   assert.match(ticket.path,new RegExp(`^/download/${job_id}\\?expires=\\d{13}&sig=[a-f0-9]{64}$`));
   const stale=await fetch(base+ticket.path.replace(/sig=[a-f0-9]{64}/, 'sig='+'0'.repeat(64)));
   if(ticket.path.endsWith('0'.repeat(64)))assert.equal(stale.status,200);else assert.equal(stale.status,403);
   const file=await fetch(base+ticket.path);
   assert.equal(file.status,200);
   assert.equal(file.headers.get('content-type'),kind==='mp4'?'video/mp4':'audio/mpeg');
   const data=new Uint8Array(await file.arrayBuffer());assert.ok(data.length>2048);
   if(kind==='mp4'){
    assert.equal(end.actual_height,360);
    assert.equal(new TextDecoder().decode(data.subarray(4,8)),'ftyp');
   }else{
    assert.ok(Math.abs(end.actual_audio_bitrate_kbps-128)<10);
    assert.equal(new TextDecoder().decode(data.subarray(0,3)),'ID3');
   }
   const second=await fetch(base+ticket.path);
   assert.equal(second.status,410,'single-use signed ticket cannot redownload the same job');
  }
  await run('mp3');await run('mp4');
 }finally{
  if(worker){worker.kill('SIGTERM');await Promise.race([new Promise(r=>worker.once('exit',r)),sleep(1000)])}
  await rm(temp,{recursive:true,force:true});
 }
});
