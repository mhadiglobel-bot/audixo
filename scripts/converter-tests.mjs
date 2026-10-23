import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require(process.env.AUDIXO_TEST_TYPESCRIPT_PATH||'typescript');;

// The tests transpile only this lightweight Vercel adapter, without npm deps.
// Production project typecheck/build still run as separate release gates.
const source=fs.readFileSync(new URL('../api/media.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {default:handler}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const actualFetch=globalThis.fetch;
process.env.AUDIXO_WORKER_TOKEN='unit-test-worker-token-longer-than-32-characters';
process.env.AUDIXO_WORKER_URL='http://127.0.0.1:8080';
process.env.VERCEL='';
function res(){return {code:200,headers:{},headersSent:false,status(n){this.code=n;return this},setHeader(k,v){this.headers[k]=v;return this},json(v){this.body=v;return this}}}
async function invoke(action,body,server){
 const calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push({url:String(url),method:opts?.method,headers:opts?.headers,body:opts?.body&&JSON.parse(String(opts.body))});
  const result=await server(String(url),opts);
  return Response.json(result.body,{status:result.status||200});
 };
 const response=res();
 try{await handler({method:'POST',query:{action},body:body||{},headers:{}},response);return {response,calls}}finally{globalThis.fetch=actualFetch}
}
const example='https://www.youtube.com/watch?v=abcdefghijk';

test('health checks new private worker, not any old external API',async()=>{
 const {response,calls}=await invoke('health',{},()=>({body:{ok:true,ready:true,authenticated:false,max_concurrent:2,message:'Public videos available'}}));
 assert.equal(calls[0].url,'http://127.0.0.1:8080/health');
 assert.equal(response.body.ready,true);
 assert.equal(response.body.maxConcurrent,2);
});
test('preview maps only actual reported qualities and sorts ascending',async()=>{
 const {response,calls}=await invoke('meta',{url:example},()=>({body:{title:'My Video',uploader:'Creator',duration:30,thumbnail:'https://img.youtube.test/item.jpg',qualities:[{value:'1080',label:'1080p'},{value:'360',label:'360p'},{value:'1080',label:'1080p'}]}}));
 assert.deepEqual(response.body.qualities.map(q=>q.value),['360','1080']);
 assert.equal(calls[0].body.url,example);
});
test('preview with empty qualities never inserts 720p',async()=>{
 const {response}=await invoke('meta',{url:example},()=>({body:{qualities:[],duration:30}}));
 assert.deepEqual(response.body.qualities,[]);
});
test('MP4 forwards precisely selected 1080p without silent fallback',async()=>{
 const {response,calls}=await invoke('convert',{url:example,format:'mp4',quality:'1080'},()=>({body:{job_id:'a'.repeat(32),status:'queued',format:'mp4'}}));
 assert.equal(calls[0].body.quality,'1080');
 assert.equal(response.body.state,'queued');
});
test('MP3 forwards selected real bitrate to private worker',async()=>{
 const {response,calls}=await invoke('convert',{url:example,format:'mp3',bitrate:192},()=>({body:{job_id:'a'.repeat(32),status:'queued'}}));
 assert.equal(calls[0].body.bitrate,192);
 assert.equal(response.body.format,'mp3');
});
test('legacy MP3 requests default to 320 kbps worker encoding',async()=>{
 const {calls}=await invoke('convert',{url:example,format:'mp3'},()=>({body:{job_id:'a'.repeat(32),status:'queued'}}));
 assert.equal(calls[0].body.bitrate,320);
});
test('backend structured 422 QUALITY_UNAVAILABLE remains specific',async()=>{
 const {response}=await invoke('convert',{url:example,format:'mp4',quality:'2160'},()=>({status:422,body:{code:'QUALITY_UNAVAILABLE',error:'2160p not available'}}));
 assert.equal(response.code,422);assert.equal(response.body.code,'QUALITY_UNAVAILABLE');
});
test('URL validation blocks non-YouTube and insecure SSRF',async()=>{
 for(const url of ['https://evil.com/watch?v=abcdefghijk','http://youtube.com/watch?v=abcdefghijk','https://youtube.com.evil.org/watch?v=abcdefghijk']){
  const {response,calls}=await invoke('meta',{url},()=>{throw Error('should not fetch')});
  assert.equal(response.code,400);assert.equal(calls.length,0);
 }
});
test('job completion includes verified dimensions and file link',async()=>{
 const {response}=await invoke('status',{id:'a'.repeat(32),format:'mp4',quality:'720'},()=>({body:{job_id:'a'.repeat(32),status:'ready',title:'Test',actual_width:1280,actual_height:720,progress:100}}));
 assert.equal(response.body.state,'complete');assert.equal(response.body.reportedHeight,720);assert.equal(response.body.files.length,1);
 assert.match(response.body.files[0].url,/action=ticket/);
});
test('MP4 quality mismatch fails closed, no fake file link',async()=>{
 const {response}=await invoke('status',{id:'a'.repeat(32),format:'mp4',quality:'1080'},()=>({body:{job_id:'a'.repeat(32),status:'ready',actual_width:1280,actual_height:720}}));
 assert.equal(response.body.state,'failed');assert.equal(response.body.errorCode,'QUALITY_MISMATCH');assert.deepEqual(response.body.files,[]);
});
test('failed job cannot produce downloadable file',async()=>{
 const {response}=await invoke('status',{id:'a'.repeat(32),format:'mp3'},()=>({body:{job_id:'a'.repeat(32),status:'failed',code:'SOURCE_FORBIDDEN',error:'Access refused'}}));
 assert.equal(response.body.state,'failed');assert.deepEqual(response.body.files,[]);
});
test('private worker authentication never appears in JSON',async()=>{
 const {response,calls}=await invoke('meta',{url:example},()=>({body:{qualities:[]}}));
 assert.equal(calls[0].headers.Authorization,'Bearer '+process.env.AUDIXO_WORKER_TOKEN);
 assert.ok(!JSON.stringify(response.body).includes(process.env.AUDIXO_WORKER_TOKEN));
});
test('missing worker config yields clear error',async()=>{
 const old=process.env.AUDIXO_WORKER_URL;delete process.env.AUDIXO_WORKER_URL;
 try{const {response}=await invoke('health',{},()=>{throw Error('should not fetch')});assert.equal(response.code,503);assert.equal(response.body.code,'WORKER_NOT_CONFIGURED')}
 finally{process.env.AUDIXO_WORKER_URL=old}
});

test('signed worker ticket lets the browser download directly without exposing the master token',async()=>{
 const id='a'.repeat(32),expires=Date.now()+60_000;
 const {response,calls}=await invoke('ticket',{id,format:'mp3'},url=>{
  if(url.endsWith(`/jobs/${id}`))return {body:{job_id:id,status:'ready',format:'mp3'}};
  if(url.endsWith(`/jobs/${id}/ticket`))return {body:{format:'mp3',path:`/download/${id}?expires=${expires}&sig=${'b'.repeat(64)}`}};
  throw Error('unexpected '+url);
 });
 assert.equal(response.code,200);
 assert.equal(response.body.url,`http://127.0.0.1:8080/download/${id}?expires=${expires}&sig=${'b'.repeat(64)}`);
 assert.ok(!JSON.stringify(response.body).includes(process.env.AUDIXO_WORKER_TOKEN));
 assert.equal(calls.length,2);
 assert.equal(calls[1].headers.Authorization,'Bearer '+process.env.AUDIXO_WORKER_TOKEN);
});
test('worker tickets reject different hosts, invalid signatures and wrong formats',async()=>{
 const id='b'.repeat(32),expires=Date.now()+60_000;
 for(const path of [
  `https://evil.example/download/${id}?expires=${expires}&sig=${'c'.repeat(64)}`,
  `/download/${id}?expires=${expires}&sig=bad`,
  `/download/${id}?expires=${expires}&sig=${'c'.repeat(64)}&extra=1`
 ]){
  const {response}=await invoke('ticket',{id,format:'mp4'},url=>url.endsWith('/ticket')?
   {body:{format:'mp4',path}}:{body:{status:'ready',format:'mp4'}});
  assert.equal(response.code,502,path);
 }
 const {response}=await invoke('ticket',{id,format:'mp4'},()=>({body:{status:'ready',format:'mp3'}}));
 assert.equal(response.code,409);
});
test('old Vercel large-file response endpoint is disabled',async()=>{
 globalThis.fetch=async()=>{throw Error('Should not contact worker for old downloads')};
 const response=res();
 try{await handler({method:'GET',query:{action:'file',id:'a'.repeat(32),format:'mp4'},headers:{}},response);assert.equal(response.code,410)}
 finally{globalThis.fetch=actualFetch}
});
