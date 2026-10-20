/** Converter contract / adapter regression tests. Run with `npm run test:converter`. */
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import {Writable} from 'node:stream'
const require=createRequire(import.meta.url)
const ts=require('typescript')
let remoteFetch=async()=>{throw Error('Unexpected network request: test mock not configured.')}
function load(file,{jsx=false}={}){
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8')
 const compiled=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true})
 const diagnostics=compiled.diagnostics??[]
 assert.equal(diagnostics.length,0,`${file} TS parse errors: ${diagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`)
 const module={exports:{}}
 const fakeJSX={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}
 const fakeRequire=name=>name==='react/jsx-runtime'?fakeJSX:require(name)
 const environment={module,exports:module.exports,require:fakeRequire,process,URL,URLSearchParams,Buffer,AbortController,DOMException,Response,TextDecoder,setTimeout,clearTimeout,window:{location:{href:'https://audixo.vercel.app/'}},fetch:(...args)=>remoteFetch(...args)}
 vm.runInNewContext(compiled.outputText,environment,{filename:file,timeout:12000})
 return module.exports
}
const adapter=load('api/media.ts')
const rail=load('src/components/QualityRail.tsx',{jsx:true})
const client=load('src/services/media.ts')
process.env.AUDIXO_YTDL_BASE_URL='https://ytdl.tiers.rest'
const validUrl='https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const entry=(height,other={})=>({quality:String(height),width:Math.round(height*16/9),height,format_id:`v${height}`,container:'mp4',downloadable:true,vcodec:'avc1.640028',acodec:'none',...other})
const mkPreview=(items)=>({data:{title:'Authorized sample',author:'Test creator',duration:50,available_qualities:items}})
class MockRes extends Writable{
 constructor(){super();this.headers={};this.responseStatus=200;this.body=null;this.chunks=[];this.headersSent=false}
 setHeader(key,value){this.headers[key.toLowerCase()]=value;return this}
 status(code){this.responseStatus=code;return this}
 json(obj){this.body=obj;this.headersSent=true;this.end();return this}
 _write(chunk,_enc,cb){this.chunks.push(Buffer.from(chunk));this.headersSent=true;cb()}
 end(chunk){this.headersSent=true;return super.end(chunk)}
}
const apiResponse=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})
const fileHead=(length=200)=>new Response(null,{status:200,headers:{'content-type':'video/mp4','content-length':String(length),'accept-ranges':'bytes'}})
async function call(action,body={},method='POST',headers={}){
 const req={method,query:{action},body,headers},res=new MockRes()
 await adapter.default(req,res)
 return res
}
const mockRoutes=(routes)=>{remoteFetch=async(url,options={})=>{
 const path=new URL(String(url)).pathname
 const result=routes[path]
 if(typeof result==='function')return result(options)
 if(result)return result
 throw Error(`Unmocked API route ${path}`)
}}
function flatten(element,out=[]){
 if(element===null||element===undefined||typeof element==='boolean')return out
 if(typeof element==='string'||typeof element==='number'){out.push(String(element));return out}
 if(Array.isArray(element)){for(const x of element)flatten(x,out);return out}
 if(element?.props){flatten(element.props.children,out);return out}
 return out
}
function nodes(element,match,out=[]){
 if(Array.isArray(element)){element.forEach(x=>nodes(x,match,out));return out}
 if(!element||typeof element!=='object')return out
 if(match(element))out.push(element)
 if(element.props?.children)nodes(element.props.children,match,out)
 return out
}
function previewUI(options,selected){
 const el=rail.VideoQualityRail({quality:selected,onChange:()=>{},available:options,analyzed:true})
 // Invoke direct functional child to expand QualitySlider's JSX for a meaningful UI check.
 const component=nodes(el,node=>typeof node.type==='function')[0]
 const inner=component?component.type(component.props):null
 return {text:flatten([el,inner]).join(' '),buttons:nodes(inner,node=>node.type==='button')}
}

test('1: [360,720,1080] renders exactly those quality choices',()=>{
 const options=adapter.confirmedMp4Qualities(mkPreview([entry(1080),entry(360),entry(720)]))
 const ui=previewUI(options,'1080')
 assert.equal(options.map(x=>x.value).join(','),'360,720,1080')
 assert.equal(ui.buttons.length,3)
 assert.ok(!ui.text.includes('1440p')&&!ui.text.includes('2160p'))
})
test('2: a single 360 quality selects 360',()=>{
 const options=adapter.confirmedMp4Qualities(mkPreview([entry(360)]))
 assert.equal(rail.highestConfirmedQuality(options),'360')
 assert.equal(previewUI(options,'360').buttons.length,1)
})
test('3/4: empty backend qualities -> empty UI, empty selection, no fake 720',()=>{
 const options=adapter.confirmedMp4Qualities(mkPreview([]))
 assert.equal(rail.highestConfirmedQuality(options),'')
 const ui=previewUI(options,'')
 assert.equal(ui.buttons.length,0)
 assert.ok(ui.text.includes('No downloadable MP4 resolutions were reported for this video.'))
})
test('5: duplicate 1080 formats reduce to one',()=>{
 assert.equal(adapter.confirmedMp4Qualities(mkPreview([entry(1080),entry(1080,{format_id:'other'})])).length,1)
})
test('6: audio-only formats are excluded',()=>{
 const items=[entry(1080,{vcodec:'none'}),entry(720,{type:'audio'}),entry(480,{height:0}),entry(360,{downloadable:false})]
 assert.deepEqual(Array.from(adapter.confirmedMp4Qualities(mkPreview(items))),[])
})
test('7: 1080 DASH video-only stream is valid if backend confirms it can merge audio',()=>{
 const items=[entry(1080,{acodec:'none',audio_downloadable:true,downloadable:true})]
 assert.equal(adapter.confirmedMp4Qualities(mkPreview(items))[0].value,'1080')
})
test('8: unavailable, DRM, unusable, unsupported and bare raw formats are rejected',()=>{
 assert.equal(adapter.confirmedMp4Qualities(mkPreview([entry(720,{available:false}),entry(1080,{has_drm:true}),entry(480,{supported:false}),entry(360,{audio_available:false})])).length,0)
 assert.equal(adapter.confirmedMp4Qualities({formats:[entry(1080)]}).length,0)
 assert.equal(adapter.confirmedMp4Qualities({qualities:['1080',{value:'720',label:'720p'}]}).length,0)
})
test('9: exact requested MP4 quality is sent unchanged after fresh preview validation',async()=>{
 let posted=null
 mockRoutes({'/api/preview':apiResponse(mkPreview([entry(720),entry(1080)])),
  '/api/download':opts=>{posted=JSON.parse(opts.body);return apiResponse({job_id:'job-1080',status:'queued'})}})
 const result=await call('convert',{url:validUrl,format:'mp4',quality:'1080'})
 assert.equal(result.responseStatus,200)
 assert.equal(posted.quality,'1080')
 assert.equal(result.body.requestedQuality,'1080')
})
test('10: 1440 not in fresh preview -> 422 QUALITY_UNAVAILABLE without creating job',async()=>{
 let posted=false
 mockRoutes({'/api/preview':apiResponse(mkPreview([entry(360),entry(720)])), '/api/download':()=>{posted=true;throw Error('must not call')}})
 const result=await call('convert',{url:validUrl,format:'mp4',quality:'1440'})
 assert.equal(result.responseStatus,422)
 assert.equal(result.body.code,'QUALITY_UNAVAILABLE')
 assert.equal(posted,false)
 assert.equal(result.body.available_qualities.join(','),'360,720')
})
test('11: actual 720p for requested 1080p -> QUALITY_MISMATCH and no file',()=>{
 const status=adapter.normalizeJob({job_id:'a-job',status:'complete',actual_width:1280,actual_height:720},'', 'mp4',true,'1080')
 assert.equal(status.state,'failed')
 assert.equal(status.errorCode,'QUALITY_MISMATCH')
 assert.equal(status.files.length,0)
 assert.throws(()=>client.assertVideoResolution(1280,720,'1080'),{code:'QUALITY_MISMATCH'})
})
test('12: structured SOURCE_FORBIDDEN survives adapter',async()=>{
 mockRoutes({'/api/download':apiResponse({code:'SOURCE_FORBIDDEN',error:'YouTube rejected source access.'},403)})
 const result=await call('convert',{url:validUrl,format:'mp3'})
 assert.equal(result.body.code,'SOURCE_FORBIDDEN')
 assert.equal(result.responseStatus,502)
})
test('13: quality errors do not become UPSTREAM_VALIDATION',async()=>{
 mockRoutes({'/api/preview':apiResponse(mkPreview([entry(720)])),
  '/api/download':apiResponse({error:'requested format is not available'},422)})
 const result=await call('convert',{url:validUrl,format:'mp4',quality:'720'})
 assert.equal(result.responseStatus,422)
 assert.equal(result.body.code,'QUALITY_UNAVAILABLE')
})
test('14: HTML response from upstream file endpoint is never passed through as MP4',async()=>{
 mockRoutes({'/api/download/file/a-job':new Response('<html>Denied</html>',{status:200,headers:{'content-type':'text/html','content-length':'19'}})})
 const req={method:'GET',query:{action:'file',id:'a-job',format:'mp4'},headers:{}}
 const res=new MockRes();await adapter.default(req,res)
 assert.equal(res.responseStatus,502)
 assert.equal(res.body.code,'WRONG_FILE_TYPE')
 assert.equal(res.chunks.length,0)
})
test('15: failed job never produces a synthetic file URL',()=>{
 const job=adapter.normalizeJob({job_id:'good-id',status:'failed',error:'Source rejected',code:'SOURCE_FORBIDDEN'},'','mp4',true,'720')
 assert.equal(job.state,'failed');assert.equal(job.files.length,0)
})
test('16: documented MP3 body and legacy {url} compatibility',async()=>{
 const payloads=[]
 mockRoutes({'/api/download':opts=>{
  const b=JSON.parse(opts.body);payloads.push(b)
  return payloads.length===1?apiResponse({code:'UPSTREAM_VALIDATION',error:'unknown field: format'},422):apiResponse({job_id:'old-api-job',status:'queued'})
 }})
 const result=await call('convert',{url:validUrl,format:'mp3'})
 assert.equal(result.responseStatus,200)
 assert.equal(payloads[0].format,'mp3')
 assert.deepEqual(Object.keys(payloads[1]),['url'])
})
test('17: permanent failures clear Resume; transient origin outage remains resumable',()=>{
 for(const code of ['QUALITY_UNAVAILABLE','QUALITY_MISMATCH','SOURCE_FORBIDDEN','SERVICE_AUTH','FILE_FORBIDDEN','FILE_UNAVAILABLE','JOB_FAILED'])assert.ok(client.TERMINAL_JOB_CODES.has(code))
 assert.ok(!client.TERMINAL_JOB_CODES.has('ORIGIN_UNAVAILABLE'))
 assert.ok(!client.TERMINAL_JOB_CODES.has('UPSTREAM_LIMIT'))
})
test('18a: HEAD file endpoint succeeds and forwards Content-Length',async()=>{
 mockRoutes({'/api/download/file/job-1':fileHead(1024)})
 const req={method:'HEAD',query:{action:'file',id:'job-1',format:'mp4'},headers:{}}
 const res=new MockRes();await adapter.default(req,res)
 assert.equal(res.responseStatus,200);assert.equal(res.headers['content-length'],'1024')
})
test('18b: HEAD falls back to 1-byte Range GET and preserves total length',async()=>{
 let observedRange=''
 mockRoutes({'/api/download/file/job-2':opts=>{
  if(opts.method==='HEAD')return new Response(null,{status:405})
  observedRange=opts.headers.Range
  return new Response(new Uint8Array([0]),{status:206,headers:{'content-type':'video/mp4','content-range':'bytes 0-0/2048','content-length':'1','accept-ranges':'bytes'}})
 }})
 const req={method:'HEAD',query:{action:'file',id:'job-2',format:'mp4'},headers:{}}
 const res=new MockRes();await adapter.default(req,res)
 assert.equal(observedRange,'bytes=0-0');assert.equal(res.responseStatus,200);assert.equal(res.headers['content-length'],'2048')
})
test('18c: ranged GET forwards 206 and exact Content-Range; streams without buffering',async()=>{
 mockRoutes({'/api/download/file/job-3':opts=>{
  assert.equal(opts.headers.Range,'bytes=4-7')
  return new Response(new Uint8Array([1,2,3,4]),{status:206,headers:{'content-type':'video/mp4','content-range':'bytes 4-7/100','content-length':'4','accept-ranges':'bytes'}})
 }})
 const req={method:'GET',query:{action:'file',id:'job-3',format:'mp4'},headers:{range:'bytes=4-7'}}
 const res=new MockRes();await adapter.default(req,res)
 assert.equal(res.responseStatus,206);assert.equal(res.headers['content-range'],'bytes 4-7/100')
 assert.deepEqual(Buffer.concat(res.chunks),Buffer.from([1,2,3,4]))
})
test('completed upstream job remains processing until file HEAD proves its existence',async()=>{
 mockRoutes({'/api/download/status/job4':apiResponse({job_id:'job4',status:'complete',actual_height:720,actual_width:1280}),
 '/api/download/file/job4':new Response(null,{status:404})})
 const res=await call('status',{id:'job4',format:'mp4',quality:'720'})
 assert.equal(res.body.state,'processing');assert.equal(res.body.files.length,0)
})
test('successful status with verified file becomes complete and gets one valid file URL',async()=>{
 mockRoutes({'/api/download/status/job5':apiResponse({job_id:'job5',status:'complete',actual_height:720,actual_width:1280}),
 '/api/download/file/job5':fileHead(400)})
 const res=await call('status',{id:'job5',format:'mp4',quality:'720'})
 assert.equal(res.body.state,'complete');assert.equal(res.body.files.length,1)
})

test('canonical preview requires explicit downloadable video evidence and compatible MP4 output',()=>{
 const list=[entry(720,{format_id:'',vcodec:'',type:''}),entry(1080,{container:'webm'}),entry(480,{downloadable:false}),entry(360)]
 assert.equal(adapter.confirmedMp4Qualities(mkPreview(list)).map(x=>x.value).join(','),'360')
})
test('MP3 conversion stays independent when preview contains no usable MP4 quality',async()=>{
 let previewCalls=0
 mockRoutes({'/api/preview':()=>{previewCalls++;throw Error('MP3 must not check MP4 formats')},'/api/download':apiResponse({job_id:'audio-job',status:'queued'})})
 const result=await call('convert',{url:validUrl,format:'mp3'})
 assert.equal(result.responseStatus,200)
 assert.equal(result.body.format,'mp3')
 assert.equal(previewCalls,0)
})
test('octet-stream HTML masquerading as media is rejected before a download streams',async()=>{
 mockRoutes({'/api/download/file/evil-file':new Response('<html>access denied</html>',{status:200,headers:{'content-type':'application/octet-stream','content-length':'26'}})})
 const req={method:'GET',query:{action:'file',id:'evil-file',format:'mp4'},headers:{}}
 const res=new MockRes();await adapter.default(req,res)
 assert.equal(res.responseStatus,502)
 assert.equal(res.body.code,'WRONG_FILE_TYPE')
 assert.equal(res.chunks.length,0)
})
test('valid MP4 ftyp bytes stream under the requested type',async()=>{
 const bytes=Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,0,0,0,0,0,0,0,0])
 mockRoutes({'/api/download/file/good-file':new Response(bytes,{status:200,headers:{'content-type':'application/octet-stream','content-length':String(bytes.length)}})})
 const req={method:'GET',query:{action:'file',id:'good-file',format:'mp4'},headers:{}}
 const res=new MockRes();await adapter.default(req,res)
 assert.equal(res.responseStatus,200)
 assert.deepEqual(Buffer.concat(res.chunks),bytes)
})
test('server-reported output mismatch fails status before handing out any URL',async()=>{
 let probeCount=0
 mockRoutes({'/api/download/status/mismatch':apiResponse({job_id:'mismatch',status:'complete',output_width:1280,output_height:720}),'/api/download/file/mismatch':()=>{probeCount++;return fileHead()}})
 const res=await call('status',{id:'mismatch',format:'mp4',quality:'1080'})
 assert.equal(res.body.state,'failed');assert.equal(res.body.errorCode,'QUALITY_MISMATCH')
 assert.equal(res.body.files.length,0);assert.equal(probeCount,0)
})
test('Cloudflare origin HTTP 522 becomes ORIGIN_UNAVAILABLE',async()=>{
 mockRoutes({'/api/download':new Response('<html>Cloudflare</html>',{status:522,headers:{'content-type':'text/html'}})})
 const res=await call('convert',{url:validUrl,format:'mp3'})
 assert.equal(res.responseStatus,503);assert.equal(res.body.code,'ORIGIN_UNAVAILABLE')
})
test('HEAD without a reliable Content-Length retries a 1-byte Range GET',async()=>{
 let observedRange=''
 mockRoutes({'/api/download/file/no-head-size':opts=>{
  if(opts.method==='HEAD')return new Response(null,{status:200,headers:{'content-type':'audio/mpeg'}})
  observedRange=opts.headers.Range
  return new Response(new Uint8Array([0]),{status:206,headers:{'content-type':'audio/mpeg','content-range':'bytes 0-0/987','content-length':'1','accept-ranges':'bytes'}})
 }})
 const req={method:'HEAD',query:{action:'file',id:'no-head-size',format:'mp3'},headers:{}}
 const res=new MockRes();await adapter.default(req,res)
 assert.equal(res.responseStatus,200);assert.equal(observedRange,'bytes=0-0');assert.equal(res.headers['content-length'],'987')
})
