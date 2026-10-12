import type { AudioClip, AudioProject, AudioTrack } from './types'
import { clamp, dbToGain, projectDuration, clipTimelineDuration, effectiveRate } from './utils'

const impulseCache=new WeakMap<BaseAudioContext,AudioBuffer>()
const reverseCache=new WeakMap<AudioBuffer,AudioBuffer>()
const pitchLockCache=new WeakMap<AudioBuffer,Map<string,AudioBuffer>>()

function sliceClipBuffer(source:AudioBuffer,offsetSeconds:number,durationSeconds:number,reverse=false){
  const start=Math.max(0,Math.floor(offsetSeconds*source.sampleRate))
  const requested=Math.max(1,Math.floor(durationSeconds*source.sampleRate))
  const length=Math.max(1,Math.min(requested,source.length-start))
  const out=new AudioBuffer({length,numberOfChannels:source.numberOfChannels,sampleRate:source.sampleRate})
  for(let ch=0;ch<source.numberOfChannels;ch+=1){
    const input=source.getChannelData(ch),target=out.getChannelData(ch)
    if(reverse){for(let i=0;i<length;i+=1)target[i]=input[start+length-1-i]||0}
    else target.set(input.subarray(start,start+length))
  }
  return out
}

/*
 * Lightweight granular overlap-add time stretch. This is intentionally browser-local
 * and dependency-free. It keeps vocal pitch much closer to the original than simply
 * lowering AudioBufferSourceNode.playbackRate, while remaining a creative effect rather
 * than a mastering-grade phase vocoder.
 */
function stretchPreservingPitch(input:AudioBuffer,speed:number){
  speed=clamp(speed,.5,1.6)
  if(Math.abs(speed-1)<.002)return input
  const windowSize=Math.min(4096,Math.max(512,2**Math.floor(Math.log2(Math.max(512,Math.min(4096,input.length))))))
  const analysisHop=Math.max(64,Math.floor(windowSize/4))
  const synthesisHop=analysisHop/speed
  const desiredLength=Math.max(1,Math.ceil(input.length/speed))
  const workLength=desiredLength+windowSize+4
  const out=new AudioBuffer({length:workLength,numberOfChannels:input.numberOfChannels,sampleRate:input.sampleRate})
  const weights=new Float32Array(workLength)
  const window=new Float32Array(windowSize)
  for(let i=0;i<windowSize;i+=1)window[i]=.5-.5*Math.cos((2*Math.PI*i)/Math.max(1,windowSize-1))
  let grain=0
  for(let inBase=0;inBase<input.length;inBase+=analysisHop,grain+=1){
    const outBase=Math.round(grain*synthesisHop)
    if(outBase>=workLength)break
    const count=Math.min(windowSize,input.length-inBase,workLength-outBase)
    for(let i=0;i<count;i+=1)weights[outBase+i]+=window[i]
    for(let ch=0;ch<input.numberOfChannels;ch+=1){
      const src=input.getChannelData(ch),dst=out.getChannelData(ch)
      for(let i=0;i<count;i+=1)dst[outBase+i]+=src[inBase+i]*window[i]
    }
  }
  const finalBuffer=new AudioBuffer({length:desiredLength,numberOfChannels:input.numberOfChannels,sampleRate:input.sampleRate})
  for(let ch=0;ch<input.numberOfChannels;ch+=1){
    const src=out.getChannelData(ch),dst=finalBuffer.getChannelData(ch)
    for(let i=0;i<desiredLength;i+=1){const w=weights[i];dst[i]=w>.0001?src[i]/w:src[i]}
  }
  return finalBuffer
}

function pitchLockedClipBuffer(source:AudioBuffer,clip:AudioClip){
  const speed=clamp(Number(clip.fx.speed||1),.5,1.6)
  let map=pitchLockCache.get(source);if(!map){map=new Map();pitchLockCache.set(source,map)}
  const key=`${clip.offset.toFixed(5)}:${clip.duration.toFixed(5)}:${clip.fx.reverse?'r':'f'}:${speed.toFixed(4)}`
  const cached=map.get(key);if(cached)return cached
  const segment=sliceClipBuffer(source,clip.offset,clip.duration,Boolean(clip.fx.reverse))
  const stretched=stretchPreservingPitch(segment,speed)
  map.set(key,stretched)
  return stretched
}

function makeImpulse(ctx:BaseAudioContext,seconds=1.85,decay=2.8){const cached=impulseCache.get(ctx);if(cached)return cached;const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));const impulse=ctx.createBuffer(2,length,ctx.sampleRate);for(let ch=0;ch<2;ch+=1){const data=impulse.getChannelData(ch);for(let i=0;i<length;i+=1)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,decay)}impulseCache.set(ctx,impulse);return impulse}
function makeLimiter(ctx:BaseAudioContext,threshold=-1){const n=ctx.createDynamicsCompressor();n.threshold.value=threshold;n.knee.value=0;n.ratio.value=20;n.attack.value=.003;n.release.value=.08;return n}
function makeCompressor(ctx:BaseAudioContext){const n=ctx.createDynamicsCompressor();n.threshold.value=-18;n.knee.value=10;n.ratio.value=4;n.attack.value=.008;n.release.value=.16;return n}
function reversedBuffer(source:AudioBuffer){const cached=reverseCache.get(source);if(cached)return cached;const out=new AudioBuffer({length:source.length,numberOfChannels:source.numberOfChannels,sampleRate:source.sampleRate});for(let ch=0;ch<source.numberOfChannels;ch+=1){const input=source.getChannelData(ch),target=out.getChannelData(ch);for(let i=0,j=input.length-1;i<input.length;i+=1,j-=1)target[i]=input[j]}reverseCache.set(source,out);return out}

function applyFade(param:AudioParam,baseGain:number,clip:AudioClip,when:number,skipTimeline=0,playTimeline=clipTimelineDuration(clip)){
  const total=clipTimelineDuration(clip);const fadeIn=Math.min(Math.max(0,clip.fx.fadeIn||0),total);const fadeOut=Math.min(Math.max(0,clip.fx.fadeOut||0),total);const end=skipTimeline+playTimeline
  const factor=(t:number)=>{let f=1;if(fadeIn>0&&t<fadeIn)f=Math.min(f,t/fadeIn);if(fadeOut>0&&t>total-fadeOut)f=Math.min(f,(total-t)/fadeOut);return clamp(f,0,1)}
  param.cancelScheduledValues(when);param.setValueAtTime(baseGain*factor(skipTimeline),when)
  if(fadeIn>0&&skipTimeline<fadeIn&&end>fadeIn)param.linearRampToValueAtTime(baseGain,when+(fadeIn-skipTimeline))
  if(fadeOut>0){const start=total-fadeOut;if(end>start){const at=Math.max(0,start-skipTimeline);param.setValueAtTime(baseGain*factor(Math.max(skipTimeline,start)),when+at);param.linearRampToValueAtTime(baseGain*factor(end),when+playTimeline)}}
}

function buildClipChain(ctx:BaseAudioContext,clip:AudioClip,track:AudioTrack,destination:AudioNode,when:number,skipTimeline=0,playTimeline=clipTimelineDuration(clip)){
  const input=ctx.createGain();applyFade(input.gain,dbToGain((clip.fx.gainDb||0)+(track.volumeDb||0)),clip,when,skipTimeline,playTimeline)
  const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=180;bass.gain.value=clip.fx.bassDb||0
  const mid=ctx.createBiquadFilter();mid.type='peaking';mid.frequency.value=1200;mid.Q.value=.8;mid.gain.value=clip.fx.midDb||0
  const treble=ctx.createBiquadFilter();treble.type='highshelf';treble.frequency.value=5000;treble.gain.value=clip.fx.trebleDb||0
  input.connect(bass);bass.connect(mid);mid.connect(treble);let processed:AudioNode=treble
  if(clip.fx.compressor){const c=makeCompressor(ctx);processed.connect(c);processed=c}
  const sum=ctx.createGain(),dry=ctx.createGain(),delayWet=ctx.createGain(),reverbWet=ctx.createGain();const dw=clamp(clip.fx.delayWet||0,0,1),rw=clamp(clip.fx.reverb||0,0,1)
  dry.gain.value=clamp(1-Math.max(dw,rw)*.42,.28,1);delayWet.gain.value=dw;reverbWet.gain.value=rw;processed.connect(dry);dry.connect(sum)
  if((clip.fx.delayMs||0)>0&&dw>0){
    const seconds=clamp((clip.fx.delayMs||0)/1000,.035,1.2)
    const amount=clamp(clip.fx.feedback||0,0,.72)
    const mode=clip.fx.echoMode||'classic'
    if(mode==='pingpong'){
      // Actual alternating LEFT / RIGHT delayed repeats in the live and offline paths.
      const left=ctx.createDelay(2),right=ctx.createDelay(2)
      left.delayTime.value=seconds;right.delayTime.value=seconds
      const leftPan=ctx.createStereoPanner(),rightPan=ctx.createStereoPanner()
      leftPan.pan.value=-.92;rightPan.pan.value=.92
      const lToR=ctx.createGain(),rToL=ctx.createGain()
      lToR.gain.value=amount;rToL.gain.value=amount
      processed.connect(left)
      left.connect(leftPan);leftPan.connect(delayWet)
      left.connect(lToR);lToR.connect(right)
      right.connect(rightPan);rightPan.connect(delayWet)
      right.connect(rToL);rToL.connect(left)
    }else if(mode==='wide'){
      // Two independent echoes at staggered times create a wider halo, not reverb.
      for(const [factor,pan] of [[1,-.65],[1.28,.65]] as const){
        const delay=ctx.createDelay(2),feedback=ctx.createGain(),panner=ctx.createStereoPanner(),gain=ctx.createGain()
        delay.delayTime.value=clamp(seconds*factor,.035,1.8)
        feedback.gain.value=amount*.76;panner.pan.value=pan;gain.gain.value=.65
        processed.connect(delay);delay.connect(feedback);feedback.connect(delay)
        delay.connect(panner);panner.connect(gain);gain.connect(delayWet)
      }
    }else{
      const delay=ctx.createDelay(2),feedback=ctx.createGain()
      delay.delayTime.value=seconds;feedback.gain.value=amount
      processed.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(delayWet)
    }
    delayWet.connect(sum)
  }
  if(rw>0){const conv=ctx.createConvolver();conv.buffer=makeImpulse(ctx);processed.connect(conv);conv.connect(reverbWet);reverbWet.connect(sum)}
  let post:AudioNode=sum;if(clip.fx.limiter){const limiter=makeLimiter(ctx,-1.5);post.connect(limiter);post=limiter}
  const oscillators:OscillatorNode[]=[]
  if(typeof (ctx as AudioContext).createStereoPanner==='function'){
    const panner=(ctx as AudioContext).createStereoPanner();const basePan=clamp((clip.fx.pan||0)+(track.pan||0),-1,1);panner.pan.value=basePan
    if(clip.fx.motionMode!=='off'&&(clip.fx.motionDepth||0)>0){const osc=ctx.createOscillator();const depth=ctx.createGain();const modeBoost=clip.fx.motionMode==='16d'?1.08:1;osc.type='sine';osc.frequency.value=clamp((clip.fx.motionHz||.16)*modeBoost,.03,1.5);depth.gain.value=clamp(clip.fx.motionDepth||.75,0,.98);osc.connect(depth);depth.connect(panner.pan);osc.start(when);osc.stop(when+playTimeline+.08);oscillators.push(osc)
      if(clip.fx.motionMode==='16d'){const trem=ctx.createGain();trem.gain.value=1;const lfo=ctx.createOscillator();const lfoDepth=ctx.createGain();lfo.type='sine';lfo.frequency.value=clamp((clip.fx.motionHz||.16)*2.04,.06,2.2);lfoDepth.gain.value=.055*clamp(clip.fx.motionDepth||.75,0,1);lfo.connect(lfoDepth);lfoDepth.connect(trem.gain);post.connect(trem);trem.connect(panner);lfo.start(when);lfo.stop(when+playTimeline+.08);oscillators.push(lfo);panner.connect(destination);return {input,oscillators}}
    }
    post.connect(panner);panner.connect(destination)
  } else post.connect(destination)
  return {input,oscillators}
}

function connectMaster(ctx:BaseAudioContext,project:AudioProject,destination:AudioNode){const gain=ctx.createGain();gain.gain.value=dbToGain(project.master?.gainDb||0);if(project.master?.limiter!==false){const limiter=makeLimiter(ctx,-.8);gain.connect(limiter);limiter.connect(destination)}else gain.connect(destination);return gain}

export async function decodeAudio(arrayBuffer:ArrayBuffer){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio API is not supported.');const ctx=new AC();try{return await ctx.decodeAudioData(arrayBuffer.slice(0))}finally{await ctx.close().catch(()=>{})}}

function sourceBufferAndOffset(buffer:AudioBuffer,clip:AudioClip,sourceSkip:number){if(!clip.fx.reverse)return{buffer,offset:clip.offset+sourceSkip};const reversed=reversedBuffer(buffer);const segmentReverseOffset=Math.max(0,buffer.duration-(clip.offset+clip.duration));return{buffer:reversed,offset:segmentReverseOffset+sourceSkip}}

export async function playProject({project,buffers,fromTime=0,onEnded}:{project:AudioProject;buffers:Map<string,AudioBuffer>;fromTime?:number;onEnded?:()=>void}){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio API is not supported.');const ctx=new AC({latencyHint:'interactive'});await ctx.resume();const master=connectMaster(ctx,project,ctx.destination);const sources:AudioBufferSourceNode[]=[];const startAt=ctx.currentTime+.045;const total=projectDuration(project);const anySolo=project.tracks.some(t=>t.solo)
  for(const track of project.tracks){if(track.muted||(anySolo&&!track.solo))continue;for(const clip of track.clips){const raw=buffers.get(clip.bufferId);if(!raw)continue;const rate=effectiveRate(clip);const timelineDur=clipTimelineDuration(clip);const clipEnd=clip.start+timelineDur;if(clipEnd<=fromTime)continue;const skipTimeline=Math.max(0,fromTime-clip.start);const playTimeline=Math.max(0,timelineDur-skipTimeline);if(playTimeline<=.002)continue;const when=startAt+Math.max(0,clip.start-fromTime);const source=ctx.createBufferSource();const pitchRate=Math.pow(2,clamp(Number(clip.fx.tapePitchSemitones||0),-12,12)/12);const pitchLock=clip.fx.preservePitch===true&&Math.abs(Number(clip.fx.speed||1)-1)>.002;if(pitchLock){const prepared=pitchLockedClipBuffer(raw,clip);const preparedSkip=skipTimeline*pitchRate;const preparedDuration=Math.min(Math.max(0,prepared.duration-preparedSkip),playTimeline*pitchRate);if(preparedDuration<=.002)continue;source.buffer=prepared;source.playbackRate.value=pitchRate;const {input}=buildClipChain(ctx,clip,track,master,when,skipTimeline,playTimeline);source.connect(input);source.start(when,preparedSkip,preparedDuration)}else{const sourceSkip=skipTimeline*rate;const sourceDuration=Math.max(0,clip.duration-sourceSkip);const playable=sourceBufferAndOffset(raw,clip,sourceSkip);source.buffer=playable.buffer;source.playbackRate.value=rate;const {input}=buildClipChain(ctx,clip,track,master,when,skipTimeline,playTimeline);source.connect(input);source.start(when,playable.offset,sourceDuration)}sources.push(source)}}
  let stopped=false;const timer=window.setTimeout(()=>{if(!stopped)onEnded?.()},Math.max(0,(total-fromTime+(hasTail(project)?2.1:0))*1000+90));return{ctx,startCtxTime:startAt,stop:async()=>{stopped=true;clearTimeout(timer);for(const source of sources){try{source.stop()}catch{}}await ctx.close().catch(()=>{})}}
}

function hasTail(project:AudioProject){return project.tracks.some(t=>t.clips.some(c=>(c.fx.reverb||0)>0||((c.fx.delayMs||0)>0&&(c.fx.delayWet||0)>0)))}
function repairAndNormalize(buffer:AudioBuffer,{stereoRepair=true,normalize=true}={}){const left=buffer.getChannelData(0),right=buffer.numberOfChannels>1?buffer.getChannelData(1):left;let l2=0,r2=0,peak=0,samples=0;const stride=Math.max(1,Math.floor(left.length/250000));for(let i=0;i<left.length;i+=stride){l2+=left[i]*left[i];r2+=right[i]*right[i];samples+=1}const lRms=Math.sqrt(l2/Math.max(1,samples)),rRms=Math.sqrt(r2/Math.max(1,samples)),ratio=Math.min(lRms,rRms)/Math.max(lRms,rRms,.0000001);let repaired=false;if(stereoRepair&&ratio<.015&&Math.max(lRms,rRms)>.0005&&buffer.numberOfChannels>1){const src=lRms>=rRms?new Float32Array(left):new Float32Array(right);left.set(src);right.set(src);repaired=true}for(let ch=0;ch<buffer.numberOfChannels;ch+=1){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i+=1)peak=Math.max(peak,Math.abs(data[i]))}if(normalize&&peak>.00001){const scale=.965/peak;if(scale<.999||scale>1.03){for(let ch=0;ch<buffer.numberOfChannels;ch+=1){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i+=1)data[i]*=scale}}}return{peak,repaired,leftRms:lRms,rightRms:rRms}}

export async function renderProject(project:AudioProject,buffers:Map<string,AudioBuffer>,options:{normalize?:boolean;stereoRepair?:boolean;sampleRate?:number}={}){
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OAC)throw new Error('OfflineAudioContext is not supported.');const sampleRate=options.sampleRate||44100;const baseDuration=projectDuration(project);const tail=hasTail(project)?2.1:0;const length=Math.max(1,Math.ceil((baseDuration+tail)*sampleRate));const offline=new OAC(2,length,sampleRate);const master=connectMaster(offline,project,offline.destination);const anySolo=project.tracks.some(t=>t.solo)
  for(const track of project.tracks){if(track.muted||(anySolo&&!track.solo))continue;for(const clip of track.clips){const raw=buffers.get(clip.bufferId);if(!raw||clip.duration<=.002)continue;const rate=effectiveRate(clip);const timelineDur=clipTimelineDuration(clip);const source=offline.createBufferSource();const pitchRate=Math.pow(2,clamp(Number(clip.fx.tapePitchSemitones||0),-12,12)/12);const pitchLock=clip.fx.preservePitch===true&&Math.abs(Number(clip.fx.speed||1)-1)>.002;if(pitchLock){const prepared=pitchLockedClipBuffer(raw,clip);source.buffer=prepared;source.playbackRate.value=pitchRate;const {input}=buildClipChain(offline,clip,track,master,clip.start,0,timelineDur);source.connect(input);source.start(clip.start,0,prepared.duration)}else{const playable=sourceBufferAndOffset(raw,clip,0);source.buffer=playable.buffer;source.playbackRate.value=rate;const {input}=buildClipChain(offline,clip,track,master,clip.start,0,timelineDur);source.connect(input);source.start(clip.start,playable.offset,clip.duration)}}}
  const rendered=await offline.startRendering();const analysis=repairAndNormalize(rendered,{stereoRepair:options.stereoRepair??project.master.stereoRepair,normalize:options.normalize??project.master.normalizeOnExport});return{buffer:rendered,analysis}
}

declare global { interface Window { webkitAudioContext?: typeof AudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext } }
