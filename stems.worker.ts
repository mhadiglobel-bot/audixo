import { DemucsProcessor } from 'demucs-web'

const model='https://huggingface.co/timcsy/demucs-web-onnx/resolve/92e33df61cfc9eb820272aaa62d2ef6dcf4d950d/htdemucs_embedded.onnx'
const checksum='e5e425c17683f163a472462eb5f5a4ffcd11c31858d57fbd0833b012d8b88077'
const post=(message:any)=>self.postMessage(message)
type Job={left:Float32Array;right:Float32Array;provider?:'auto'|'wasm'}

async function verifyBytes(bytes:ArrayBuffer){
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))
 if(Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')!==checksum)throw new Error('The AI model download was incomplete. Clear the cached Audixo model and retry.')
 return bytes
}

async function modelBytes(){
 let cache:Cache|undefined
 try{cache=await caches.open('audixo-demucs-v33');const saved=await cache.match(model);if(saved){post({phase:'model',message:'Loading cached stem model…',progress:1});return verifyBytes(await saved.arrayBuffer())}}catch{}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),300_000)
 let response:Response
 try{response=await fetch(model,{signal:controller.signal})}finally{clearTimeout(timer)}
 if(!response.ok)throw new Error('The stem model could not download. Check the connection and retry.')
 const reader=response.body?.getReader();if(!reader)return verifyBytes(await response.arrayBuffer())
 const size=Number(response.headers.get('Content-Length'))||180_000_000,chunks:Uint8Array[]=[];let loaded=0
 while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;post({phase:'model',message:`Downloading local stem model · ${(loaded/1048576).toFixed(0)} MB`,progress:Math.min(.98,loaded/size)})}
 const all=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length}
 await verifyBytes(all.buffer);try{await cache?.put(model,new Response(all,{headers:{'Content-Type':'application/octet-stream'}}))}catch{}
 return all.buffer
}

async function loadOrt(provider:'webgpu'|'wasm'){
 const ort:any=provider==='webgpu'?await import('onnxruntime-web/webgpu'):await import('onnxruntime-web/wasm')
 const threaded=Boolean((self as any).crossOriginIsolated),cores=Number((self.navigator as any).hardwareConcurrency||2)
 // V33 ships the exact ORT companion files from the installed 1.24.3 package
 // under /ort. Keeping JS + WASM same-origin and version-matched avoids the
 // Vercel dynamic-module/path failures that previously stopped separation.
 ort.env.wasm.wasmPaths=provider==='webgpu'
  ?{wasm:'/ort/ort-wasm-simd-threaded.jsep.wasm',mjs:'/ort/ort-wasm-simd-threaded.jsep.mjs'}
  :{wasm:'/ort/ort-wasm-simd-threaded.wasm',mjs:'/ort/ort-wasm-simd-threaded.mjs'}
 ort.env.wasm.numThreads=threaded?Math.max(2,Math.min(8,cores-1)):1
 ort.env.wasm.proxy=false
 if(provider==='webgpu'&&ort.env.webgpu)ort.env.webgpu.powerPreference='high-performance'
 return {ort,threaded}
}

self.onmessage=async(e:MessageEvent<Job>)=>{
 let processor:any
 try{
  const hasWebGPU=Boolean((self.navigator as any).gpu)
  const provider:'webgpu'|'wasm'=e.data.provider==='wasm'?'wasm':hasWebGPU?'webgpu':'wasm'
  post({phase:'engine',message:provider==='webgpu'?'Preparing GPU stem engine…':'Preparing local compatibility engine…',progress:0,provider})
  const [{ort,threaded},bytes]=await Promise.all([loadOrt(provider),modelBytes()])
  post({phase:'init',message:provider==='webgpu'?'Starting GPU model…':threaded?'Starting multi-core WASM model…':'Starting WASM model…',progress:0,provider})
  processor=new DemucsProcessor({
   ort,
   sessionOptions:{executionProviders:[provider],graphOptimizationLevel:'all'},
   onProgress:({currentSegment,totalSegments,progress}:any)=>{
    const total=totalSegments||Math.ceil(e.data.left.length/(343980*.75)),done=Number.isFinite(progress)?progress:currentSegment/Math.max(1,total)
    post({phase:'separate',message:`Separating section ${Math.max(1,currentSegment||1)} of ${Math.max(1,total)} · ${provider==='webgpu'?'GPU':threaded?'multi-core':'CPU'}`,progress:Math.min(.99,done),provider})
   }
  })
  await processor.loadModel(bytes)
  post({phase:'separate',message:`Model ready · separating ${provider==='webgpu'?'with GPU acceleration':threaded?'with multi-core processing':'in compatibility mode'}…`,progress:.01,provider})
  const result:any=await processor.separate(e.data.left,e.data.right),transfers:ArrayBuffer[]=[]
  for(const part of Object.values(result) as any[])transfers.push(part.left.buffer,part.right.buffer)
  ;(self as any).postMessage({phase:'done',result,accelerator:provider},transfers)
 }catch(error){
  const detail=error instanceof Error?`${error.name}: ${error.message}`:''
  console.error('Audixo stem engine:',detail)
  post({phase:'error',message:detail||'The local stem engine could not start on this device.'})
 }finally{await processor?.session?.release?.()}
}
