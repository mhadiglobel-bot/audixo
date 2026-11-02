import { encodeWav } from '../editor/encoder'
export type LocalStem={name:string;blob:Blob;energy:number;mode:'ai'|'quick'}
export type StemProgress={phase:string;message:string;progress:number;provider?:string}
type WorkerResult={result:any;accelerator:string}

function workerAttempt(left:Float32Array,right:Float32Array,provider:'auto'|'wasm',onProgress:(p:StemProgress)=>void,signal?:AbortSignal):Promise<WorkerResult>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./stems.worker.ts',import.meta.url),{type:'module'});let settled=false,startupTimer:ReturnType<typeof setTimeout>,overallTimer:ReturnType<typeof setTimeout>
  const clean=()=>{clearTimeout(startupTimer);clearTimeout(overallTimer);worker.terminate();signal?.removeEventListener('abort',cancel)}
  const fail=(err:Error)=>{if(settled)return;settled=true;clean();reject(err)},cancel=()=>fail(new DOMException('Cancelled','AbortError'))
  const armStartup=(ms:number,code=provider==='auto'?'GPU_START_TIMEOUT':'LOCAL_START_TIMEOUT')=>{clearTimeout(startupTimer);startupTimer=setTimeout(()=>fail(new Error(code)),ms)}
  // Model download is ~172 MB. A 20–30 second startup watchdog used to kill
  // perfectly healthy first runs on normal connections. Give download/engine
  // startup separate windows, then let actual separation report progress.
  armStartup(75_000)
  const seconds=left.length/44100
  const cap=provider==='auto'?Math.min(20*60_000,Math.max(10*60_000,seconds*2600)):Math.min(24*60_000,Math.max(12*60_000,seconds*3600))
  overallTimer=setTimeout(()=>fail(new Error('SEPARATION_TIMEOUT')),cap)
  signal?.addEventListener('abort',cancel,{once:true});worker.onerror=e=>fail(new Error(e.message||'The local stem engine could not start.'))
  worker.onmessage=({data})=>{if(data.phase==='done'){if(settled)return;settled=true;clean();resolve({result:data.result,accelerator:data.accelerator});return}if(data.phase==='error'){fail(new Error(data.message));return}if(data.phase==='separate')clearTimeout(startupTimer);else if(data.phase==='model')armStartup(330_000,'MODEL_DOWNLOAD_TIMEOUT');else if(data.phase==='engine')armStartup(75_000);else if(data.phase==='init')armStartup(90_000);onProgress(data)}
  const l=left.slice(),r=right.slice();worker.postMessage({left:l,right:r,provider},[l.buffer,r.buffer])
 })
}

function normalizePair(left:Float32Array,right:Float32Array){let peak=0;for(let i=0;i<left.length;i+=32)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));if(peak<=.99)return;const k=.98/peak;for(let i=0;i<left.length;i++){left[i]*=k;right[i]*=k}}
function buildStem(name:string,left:Float32Array,right:Float32Array,mode:'ai'|'quick'){
 normalizePair(left,right);const buffer=new AudioBuffer({numberOfChannels:2,length:left.length,sampleRate:44100});buffer.copyToChannel(left,0);buffer.copyToChannel(right,1);let sum=0;for(let i=0;i<left.length;i+=16)sum+=left[i]*left[i]+right[i]*right[i];return {name,blob:encodeWav(buffer),energy:sum,mode}
}
function lowpass(src:Float32Array,cutoff:number,sampleRate=44100){const out=new Float32Array(src.length),dt=1/sampleRate,rc=1/(2*Math.PI*cutoff),a=dt/(rc+dt);let y=0;for(let i=0;i<src.length;i++){y+=a*(src[i]-y);out[i]=y}return out}
function highpass(src:Float32Array,cutoff:number,sampleRate=44100){const lp=lowpass(src,cutoff,sampleRate),out=new Float32Array(src.length);for(let i=0;i<src.length;i++)out[i]=src[i]-lp[i];return out}
function quickFallback(left:Float32Array,right:Float32Array,onProgress:(p:StemProgress)=>void):LocalStem[]{
 onProgress({phase:'quick',message:'Using fast device split · creating playable vocal and music layers…',progress:.2,provider:'quick'})
 const n=left.length,center=new Float32Array(n),side=new Float32Array(n)
 for(let i=0;i<n;i++){center[i]=(left[i]+right[i])*.5;side[i]=(left[i]-right[i])*.5}
 const vocalBand=lowpass(highpass(center,120),9000),vocL=new Float32Array(n),vocR=new Float32Array(n),musicL=new Float32Array(n),musicR=new Float32Array(n)
 for(let i=0;i<n;i++){const v=vocalBand[i]*.92;vocL[i]=v;vocR[i]=v;musicL[i]=left[i]-v*.72;musicR[i]=right[i]-v*.72}
 onProgress({phase:'quick',message:'Building drums, bass and instrument views…',progress:.58,provider:'quick'})
 const bassMono=lowpass(center,180),highL=highpass(musicL,2200),highR=highpass(musicR,2200),bassL=new Float32Array(n),bassR=new Float32Array(n),drumL=new Float32Array(n),drumR=new Float32Array(n),otherL=new Float32Array(n),otherR=new Float32Array(n)
 for(let i=0;i<n;i++){const b=bassMono[i]*.9;bassL[i]=b;bassR[i]=b;drumL[i]=highL[i]*.55;drumR[i]=highR[i]*.55;otherL[i]=musicL[i]-bassL[i]-.55*highL[i];otherR[i]=musicR[i]-bassR[i]-.55*highR[i]}
 const parts=[buildStem('Lyrics / Vocals',vocL,vocR,'quick'),buildStem('Music',musicL,musicR,'quick'),buildStem('Drums',drumL,drumR,'quick'),buildStem('Bass',bassL,bassR,'quick'),buildStem('Other instruments',otherL,otherR,'quick')]
 const total=parts.reduce((sum,p)=>sum+p.energy,0)||1;onProgress({phase:'done',message:'Fast device split complete.',progress:1,provider:'quick'});return parts.map(p=>({...p,energy:Math.round(p.energy/total*100)}))
}

export async function separateLocally(file:Blob,onProgress:(p:StemProgress)=>void,signal?:AbortSignal,mode:'studio'|'fast'='studio'):Promise<LocalStem[]>{
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const Context=window.AudioContext||(window as any).webkitAudioContext,ctx=new Context({sampleRate:44100});let decoded:AudioBuffer
 try{decoded=await ctx.decodeAudioData(await file.arrayBuffer())}finally{await ctx.close()}
 if(decoded.duration>300)throw new Error('For stem separation, choose up to 5 minutes. Trim a shorter section first.')
 if(decoded.sampleRate!==44100){const offline=new OfflineAudioContext(2,Math.ceil(decoded.duration*44100),44100),node=offline.createBufferSource();node.buffer=decoded;node.connect(offline.destination);node.start();decoded=await offline.startRendering()}
 const left=new Float32Array(decoded.getChannelData(0)),right=new Float32Array(decoded.getChannelData(Math.min(1,decoded.numberOfChannels-1)));if(signal?.aborted)throw new DOMException('Cancelled','AbortError')
 if(mode==='fast')return quickFallback(left,right,onProgress)
 const hasWebGPU=Boolean((navigator as any).gpu),cores=Number((navigator as any).hardwareConcurrency||2),memory=Number((navigator as any).deviceMemory||0),mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),lowPower=cores<=4||(memory>0&&memory<=4)
 // Prefer real Demucs separation whenever WebGPU is available, including on
 // capable mobile browsers. Only use the fast spectral preview when a device
 // has no GPU path and a long full-song WASM job would be impractical.
 // Studio mode deliberately keeps the real Demucs path active. The UI offers
 // Fast Preview separately for devices where full AI is too heavy.
 let job:WorkerResult
 try{
  if(hasWebGPU){try{job=await workerAttempt(left,right,'auto',onProgress,signal)}catch(error){if(signal?.aborted||(error instanceof DOMException&&error.name==='AbortError'))throw error;onProgress({phase:'fallback',message:'GPU path paused · trying local compatibility mode…',progress:0,provider:'wasm'});job=await workerAttempt(left,right,'wasm',onProgress,signal)}}else job=await workerAttempt(left,right,'wasm',onProgress,signal)
 }catch(error){if(signal?.aborted||(error instanceof DOMException&&error.name==='AbortError'))throw error;throw error}
 const r=job.result,v=r.vocals,d=r.drums,b=r.bass,o=r.other,n=v.left.length,mL=new Float32Array(n),mR=new Float32Array(n)
 for(let i=0;i<n;i++){mL[i]=(d.left[i]||0)+(b.left[i]||0)+(o.left[i]||0);mR[i]=(d.right[i]||0)+(b.right[i]||0)+(o.right[i]||0)}
 const parts=[buildStem('Lyrics / Vocals',v.left,v.right,'ai'),buildStem('Music',mL,mR,'ai'),buildStem('Drums',d.left,d.right,'ai'),buildStem('Bass',b.left,b.right,'ai'),buildStem('Other instruments',o.left,o.right,'ai')]
 const total=parts.reduce((sum,p)=>sum+p.energy,0)||1;return parts.map(p=>({...p,energy:Math.round(p.energy/total*100)}))
}
