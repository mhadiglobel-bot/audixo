import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const apiSource=fs.readFileSync(new URL('../api/media.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(apiSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const {default:handler}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const originalFetch=globalThis.fetch
const id=(n)=>String(n).repeat(11)
const url=(n)=>`https://www.youtube.com/watch?v=${id(n)}`
const res=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(o){this.body=o;return this}})
async function invoke(action,body){const response=res();await handler({method:'POST',query:{action},body},response);return response}
const play=(formats=[],status='OK')=>`<html><script>var ytInitialPlayerResponse = ${JSON.stringify({playabilityStatus:{status},videoDetails:{title:'Real video',author:'Singer',lengthSeconds:'134'},streamingData:{formats,adaptiveFormats:[]}})};</script></html>`
const native=(height,urlValue,kind='mp4')=>({height,mimeType:kind==='mp4'?'video/mp4; codecs="avc1,mp4a"':'audio/mp4; codecs="mp4a"',audioQuality:'AUDIO_QUALITY_MEDIUM',bitrate:128000,url:urlValue})
const goodMedia=(n)=>`https://rr${n}---sn-xyz.googlevideo.com/videoplayback?expire=1234567890&sig=ok`
function withMock(scenario){const calls=[];globalThis.fetch=async(input,init={})=>{
 const target=String(input),method=init.method||'GET';calls.push({target,method,headers:init.headers||{},init})
 if(target.includes('/oembed?'))return new Response(JSON.stringify(scenario.embed||{title:'Title from YouTube',author_name:'Artist'}),{status:scenario.oembedStatus||200,headers:{'content-type':'application/json'}})
 if(target.startsWith('https://www.youtube.com/watch'))return new Response(scenario.html||play(scenario.formats||[]),{status:200})
 if(target.includes('googlevideo.com')&&method==='HEAD')return new Response(null,{status:200,headers:{'access-control-allow-origin':scenario.corsOrigin??'https://audixo.tiers.rest'}})
 throw Error('Unexpected request '+target)
 };return {calls,restore(){globalThis.fetch=originalFetch}}
}
async function runMock(scenario,fn){const m=withMock(scenario);try{return await fn(m.calls)}finally{m.restore()}}
test('health succeeds without worker/Docker/credentials',async()=>{const v=await invoke('health',{});assert.equal(v.statusCode,200);assert.equal(v.body.ready,true);assert.equal(v.body.mode,'browser')})
test('SSRF checks block arbitrary domains, HTTP and malformed IDs without network calls',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unwanted')};try{
 for(const u of ['http://www.youtube.com/watch?v=aaaaaaaaaaa','https://youtube.com.attacker.dev/watch?v=aaaaaaaaaaa','https://127.0.0.1/watch?v=aaaaaaaaaaa','https://www.youtube.com/watch?v=no','https://user:pass@youtube.com/watch?v=aaaaaaaaaaa','https://localhost:3000/']){
  const r=await invoke('meta',{url:u});assert.equal(r.statusCode,400,u);assert.equal(r.body.code,'INVALID_URL')
 }
 assert.equal(calls,0)
 }finally{globalThis.fetch=originalFetch}
})
test('oEmbed title and video details are real, not fabricated',async()=>runMock({},async calls=>{
 const r=await invoke('meta',{url:url('a')});assert.equal(r.statusCode,200)
 assert.equal(r.body.title,'Title from YouTube');assert.equal(r.body.duration,134)
 assert.deepEqual(r.body.qualities,[]);assert.equal(r.body.audioAvailable,false)
 assert.equal(calls.filter(c=>c.target.includes('/oembed?')).length,1)
}))
test('direct CORS-approved progressive MP4 and audio formats only',async()=>runMock({formats:[native(360,goodMedia(1)),native(720,goodMedia(2)),native(0,goodMedia(3),'audio'),{height:1080,mimeType:'video/mp4',url:goodMedia(4)}]},async calls=>{
 const r=await invoke('meta',{url:url('b')});assert.equal(r.statusCode,200)
 assert.deepEqual(r.body.qualities.map(x=>x.value),['360','720'])
 assert.equal(r.body.audioAvailable,true);assert.equal(r.body.streams.length,3)
 assert.ok(calls.filter(c=>c.method==='HEAD').length<=8)
 assert.ok(!JSON.stringify(r.body).includes('private token'))
}))
test('CORS restriction disables streams rather than advertising fake resolutions',async()=>runMock({formats:[native(1080,goodMedia(5))],corsOrigin:'https://www.youtube.com'},async()=>{
 const r=await invoke('meta',{url:url('c')});assert.equal(r.statusCode,200)
 assert.equal(r.body.qualities.length,0);assert.equal(r.body.audioAvailable,false)
}))
test('signatureCipher and unsigned arbitrary hosts never become usable URLs',async()=>runMock({formats:[{mimeType:'video/mp4',height:720,audioQuality:'yes',signatureCipher:'encrypted'},native(720,'https://evil.invalid/video.mp4')]},async()=>{
 const r=await invoke('meta',{url:url('d')});assert.deepEqual(r.body.streams,[])
}))
test('simultaneous same-video metadata is deduplicated, short-term cache is reused',async()=>runMock({},async calls=>{
 const [a,b,c]=await Promise.all([invoke('meta',{url:url('e')}),invoke('meta',{url:url('e')}),invoke('meta',{url:url('e')})]);assert.equal(a.statusCode,200);assert.equal(b.statusCode,200);assert.equal(c.statusCode,200)
 assert.equal(calls.filter(c=>c.target.includes('/oembed?')).length,1)
 await invoke('meta',{url:url('e')});assert.equal(calls.filter(c=>c.target.includes('/oembed?')).length,1)
}))
test('old conversion and proxy actions fail closed and cannot download media from Vercel',async()=>{
 for(const action of ['convert','ticket','status','file','events']){const r=await invoke(action,{url:url('f')});assert.equal(r.statusCode,410);assert.equal(r.body.code,'SERVER_CONVERSION_REMOVED')}
})
test('private video oEmbed error is reported clearly',async()=>runMock({embed:null,oembedStatus:404,html:'<html>unavailable</html>'},async()=>{
 const r=await invoke('meta',{url:url('g')});assert.equal(r.statusCode,404);assert.equal(r.body.code,'VIDEO_UNAVAILABLE')
}))
test('API never sends authorization headers, cookies, or large media GET requests',async()=>runMock({formats:[native(360,goodMedia(6))]},async calls=>{
 await invoke('meta',{url:url('h')})
 assert.ok(calls.every(c=>c.method==='HEAD'||c.method==='GET'))
 assert.ok(calls.filter(c=>c.target.includes('googlevideo.com')).every(c=>c.method==='HEAD'))
 assert.ok(calls.every(c=>!('Authorization' in c.headers)&&!('Cookie' in c.headers)))
}))
test('MP3 choices and MP4 available qualities preserve intended controls',()=>{
 const source=fs.readFileSync(new URL('../src/components/QualityRail.tsx',import.meta.url),'utf8')
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
 const mod={exports:{}}
 Function('require','module','exports',js)(name=>{if(name==='react/jsx-runtime')return {jsx(){},jsxs(){}};throw Error(name)},mod,mod.exports)
 const q=mod.exports
 assert.deepEqual(Array.from(q.bitrateSteps),[64,128,192,256,320])
 assert.deepEqual(q.confirmedVideoOptions([{value:'1080',label:'1080p'},{value:'360',label:'360p'},{value:'1080',label:'1080p'},{value:'9999',label:'fake'}]),[{value:'360',label:'360p'},{value:'1080',label:'1080p'}])
 assert.equal(q.highestConfirmedQuality([{value:'240',label:'240p'}]),'240')
 assert.deepEqual(q.confirmedVideoOptions([]),[])
})
test('no obsolete worker files or instructions ship',()=>{
 assert.equal(fs.existsSync(new URL('../media-worker',import.meta.url)),false)
 assert.equal(fs.existsSync(new URL('../render.yaml',import.meta.url)),false)
 for(const relative of ['../src/pages/YouTubeConverter.tsx','../src/services/media.ts','../api/media.ts']){
  const source=fs.readFileSync(new URL(relative,import.meta.url),'utf8')
  assert.ok(!source.includes('AUDIXO_WORKER_URL'));assert.ok(!source.includes('AUDIXO_WORKER_TOKEN'))
 }
})
