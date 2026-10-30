import type { AudioClip, AudioProject, AudioTrack } from './types'
import { clamp, dbToGain, projectDuration, clipTimelineDuration, effectiveRate } from './utils'

const impulseCache=new WeakMap<BaseAudioContext,Map<string,AudioBuffer>>()
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

/** Diffuse stereo room response.  No isolated delay spikes or periodic taps. */
function makeImpulse(ctx:BaseAudioContext,size=.55,tone=.42){
  size=clamp(Number(size),0,1);tone=clamp(Number(tone),0,1)
  let cache=impulseCache.get(ctx)
  if(!cache){cache=new Map();impulseCache.set(ctx,cache)}
  const key=`${Math.round(size*20)}:${Math.round(tone*20)}`
  const old=cache.get(key);if(old)return old
  const seconds=0.85+size*2.8
  const length=Math.max(1,Math.floor(ctx.sampleRate*seconds))
  const impulse=ctx.createBuffer(2,length,ctx.sampleRate)
  let seed=(2166136261^(Math.round(size*1000)*7919)^(Math.round(tone*1000)*1297))>>>0
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1}
  const filterAmount=.085+.16*tone
  for(let ch=0;ch<2;ch+=1){
    const samples=impulse.getChannelData(ch)
    let low1=0,low2=0
    for(let i=0;i<length;i+=1){
      const t=i/length
      low1+=filterAmount*(noise()-low1)
      low2+=.36*(low1-low2)
      const softStart=Math.min(1,i/(ctx.sampleRate*.012))
      const tail=Math.pow(Math.max(0,1-t),1.65+(1-size)*1.25)
      samples[i]=low2*tail*softStart
    }
  }
  cache.set(key,impulse)
  return impulse
}

/**
 * Detect phrase endpoints from sustained quiet gaps in a waveform. This is
 * intentionally energy-based (not lyrics transcription): mixed drums/background
 * music may mask vocal pauses; a vocal stem yields more reliable results.
 * Returned seconds are relative to the inspected source window.
 */
export function detectPhraseEndings(buffer:AudioBuffer,offsetSeconds=0,durationSeconds=buffer.duration,pauseMs=450):number[]{
  if(!buffer || !buffer.length || !buffer.sampleRate)return []
  const sr=buffer.sampleRate,start=Math.max(0,Math.min(buffer.length,Math.round(offsetSeconds*sr)))
  const end=Math.min(buffer.length,start+Math.max(1,Math.round(Math.max(0,durationSeconds)*sr)))
  const hop=Math.max(1,Math.round(sr*.02)),sampleStride=Math.max(1,Math.floor(sr/1800)),frames=Math.ceil((end-start)/hop)
  if(frames<25)return []
  const rms=new Float32Array(frames)
  const channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,ch)=>buffer.getChannelData(ch))
  for(let frame=0;frame<frames;frame+=1){
    const a=start+frame*hop,b=Math.min(end,a+hop)
    let squares=0,count=0
    for(let i=a;i<b;i+=sampleStride){for(const samples of channels)squares+=samples[i]*samples[i];count+=channels.length}
    rms[frame]=Math.sqrt(squares/Math.max(1,count))
  }
  const sorted=Array.from(rms).sort((a,b)=>a-b),reference=sorted[Math.floor((sorted.length-1)*.88)]
  if(reference<.00035)return []
  const threshold=Math.max(.0002,reference*.135),minQuietFrames=Math.ceil(clamp(pauseMs,250,1200)/1000/.02)
  const points:number[]=[];let quietFrom=-1,lastActivityStart=0,lastPoint=-1e6,active=false
  for(let i=0;i<=frames;i+=1){
    const level=i===frames?0:(rms[Math.max(0,i-1)]+rms[i]+rms[Math.min(frames-1,i+1)])/3
    const isQuiet=i===frames || level<threshold
    if(!isQuiet){
      if(quietFrom>=0){
        const quietFrames=i-quietFrom
        if(active&&quietFrames>=minQuietFrames){
          const endAt=quietFrom*hop/sr
          if(endAt-lastActivityStart>=.55&&endAt-lastPoint>=1.05){points.push(endAt);lastPoint=endAt}
          lastActivityStart=i*hop/sr
        }
      }
      quietFrom=-1;active=true
    }else if(quietFrom<0)quietFrom=i
  }
  // Include a final sung phrase without trailing silence only when at least
  // half a second of content was heard after the last detected phrase.
  const ending=quietFrom>=0?Math.min(frames,quietFrom)*hop/sr:(end-start)/sr
  if(active && ending-lastActivityStart>=.65 && ending-lastPoint>=1.05){
    points.push(Math.min((end-start)/sr,ending))
  }
  return points.filter(v=>v>=.15&&v<=(end-start)/sr+.02)
}

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

type SourceWindow={buffer:AudioBuffer;offset:number;rate:number}
function buildClipChain(ctx:BaseAudioContext,clip:AudioClip,track:AudioTrack,destination:AudioNode,when:number,skipTimeline=0,playTimeline=clipTimelineDuration(clip),sourceWindow?:SourceWindow){
  const input=ctx.createGain()
  applyFade(input.gain,dbToGain((clip.fx.gainDb||0)+(track.volumeDb||0)),clip,when,skipTimeline,playTimeline)
  const rumble=ctx.createBiquadFilter();rumble.type='highpass';rumble.frequency.value=clip.fx.rumbleCut===true?78:18;rumble.Q.value=.71
  const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=180;bass.gain.value=clip.fx.bassDb||0
  const mid=ctx.createBiquadFilter();mid.type='peaking';mid.frequency.value=1200;mid.Q.value=.8;mid.gain.value=clip.fx.midDb||0
  const treble=ctx.createBiquadFilter();treble.type='highshelf';treble.frequency.value=5000;treble.gain.value=clip.fx.trebleDb||0
  input.connect(rumble);rumble.connect(bass);bass.connect(mid);mid.connect(treble)
  let processed:AudioNode=treble
  const warmth=clamp(Number(clip.fx.warmth??0),0,1),harshness=clamp(Number(clip.fx.harshness??0),0,1)
  if(warmth>0){
    const body=ctx.createBiquadFilter();body.type='lowshelf';body.frequency.value=240;body.gain.value=warmth*3.4
    const top=ctx.createBiquadFilter();top.type='highshelf';top.frequency.value=5500;top.gain.value=-warmth*2.6
    processed.connect(body);body.connect(top);processed=top
  }
  if(harshness>0){
    const metal=ctx.createBiquadFilter();metal.type='peaking';metal.frequency.value=3350;metal.Q.value=1.35;metal.gain.value=-harshness*8
    const hiss=ctx.createBiquadFilter();hiss.type='highshelf';hiss.frequency.value=7300;hiss.gain.value=-harshness*5.5
    processed.connect(metal);metal.connect(hiss);processed=hiss
  }
  if(clip.fx.compressor){const comp=makeCompressor(ctx);processed.connect(comp);processed=comp}
  const sum=ctx.createGain(),dry=ctx.createGain()
  const dw=clamp(Number(clip.fx.delayWet??0),0,1),rw=clamp(Number(clip.fx.reverb??0),0,1)
  // Actual 0..100% wet/dry balance (no hidden .55/.75 UI ceilings).
  dry.gain.value=Math.cos(rw*Math.PI/2)
  processed.connect(dry);dry.connect(sum)
  if((clip.fx.delayMs||0)>0&&dw>0){
    const seconds=clamp((clip.fx.delayMs||0)/1000,.035,1.2)
    const feedback=clamp(Number(clip.fx.feedback??.2),0,.8)
    const mode=clip.fx.echoMode||'classic'
    const delayWet=ctx.createGain();delayWet.gain.value=dw;delayWet.connect(sum)
    if(clip.fx.echoBehavior==='phrase' && sourceWindow){
      const pause=Number(clip.fx.phrasePauseMs??450)
      const endpoints=detectPhraseEndings(sourceWindow.buffer,sourceWindow.offset,playTimeline*sourceWindow.rate,pause)
      const phraseSend=ctx.createGain();phraseSend.gain.setValueAtTime(0,when)
      processed.connect(phraseSend)
      for(const endpoint of endpoints){
        const tailTime=when+endpoint/sourceWindow.rate
        // Keep the first audible repeat in the pause, not over a sung word.
        const captureWindow=Math.max(.015,Math.min(.35,seconds-.012))
        const openTime=Math.max(when,tailTime-captureWindow)
        const closeTime=tailTime+.015
        phraseSend.gain.setValueAtTime(0,openTime)
        phraseSend.gain.linearRampToValueAtTime(1,Math.min(openTime+.025,closeTime-.01))
        phraseSend.gain.setValueAtTime(1,Math.max(openTime+.025,closeTime-.018))
        phraseSend.gain.linearRampToValueAtTime(0,closeTime)
      }
      // FINITE taps, not an endless full-song feedback loop.
      const repeats=Math.round(clamp(Number(clip.fx.echoRepeats??3),1,5))
      for(let repeat=1;repeat<=repeats;repeat+=1){
        const delay=ctx.createDelay(7);delay.delayTime.value=seconds*repeat
        const level=ctx.createGain();level.gain.value=Math.pow(feedback,repeat-1)
        phraseSend.connect(delay);delay.connect(level)
        if(mode==='pingpong'||mode==='wide'){
          const pan=ctx.createStereoPanner();pan.pan.value=mode==='pingpong'?(repeat%2?-.86:.86):(repeat%2?-.54:.54)
          level.connect(pan);pan.connect(delayWet)
        }else level.connect(delayWet)
      }
    }else if(mode==='pingpong'){
      const left=ctx.createDelay(2),right=ctx.createDelay(2)
      left.delayTime.value=seconds;right.delayTime.value=seconds
      const leftPan=ctx.createStereoPanner(),rightPan=ctx.createStereoPanner()
      leftPan.pan.value=-.92;rightPan.pan.value=.92
      const lToR=ctx.createGain(),rToL=ctx.createGain()
      lToR.gain.value=feedback;rToL.gain.value=feedback
      processed.connect(left)
      left.connect(leftPan);leftPan.connect(delayWet)
      left.connect(lToR);lToR.connect(right)
      right.connect(rightPan);rightPan.connect(delayWet)
      right.connect(rToL);rToL.connect(left)
    }else if(mode==='wide'){
      for(const [factor,pan] of [[1,-.65],[1.28,.65]] as const){
        const delay=ctx.createDelay(2),back=ctx.createGain(),panner=ctx.createStereoPanner(),gain=ctx.createGain()
        delay.delayTime.value=clamp(seconds*factor,.035,1.8)
        back.gain.value=feedback*.76;panner.pan.value=pan;gain.gain.value=.65
        processed.connect(delay);delay.connect(back);back.connect(delay)
        delay.connect(panner);panner.connect(gain);gain.connect(delayWet)
      }
    }else{
      const delay=ctx.createDelay(2),back=ctx.createGain()
      delay.delayTime.value=seconds;back.gain.value=feedback
      processed.connect(delay);delay.connect(back);back.connect(delay);delay.connect(delayWet)
    }
  }
  if(rw>0){
    const size=clamp(Number(clip.fx.reverbSize??.55),0,1),tone=clamp(Number(clip.fx.reverbTone??.42),0,1)
    const roomHighpass=ctx.createBiquadFilter();roomHighpass.type='highpass';roomHighpass.frequency.value=140
    const conv=ctx.createConvolver();conv.normalize=true;conv.buffer=makeImpulse(ctx,size,tone)
    const damping=ctx.createBiquadFilter();damping.type='lowpass';damping.frequency.value=3100+tone*6500;damping.Q.value=.65
    const reverbWet=ctx.createGain();reverbWet.gain.value=Math.sin(rw*Math.PI/2)
    processed.connect(roomHighpass);roomHighpass.connect(conv);conv.connect(damping);damping.connect(reverbWet);reverbWet.connect(sum)
  }
  let post:AudioNode=sum;if(clip.fx.limiter){const limiter=makeLimiter(ctx,-1.5);post.connect(limiter);post=limiter}
  const oscillators:OscillatorNode[]=[]
  if(typeof (ctx as AudioContext).createStereoPanner==='function'){
    const panner=(ctx as AudioContext).createStereoPanner();const basePan=clamp((clip.fx.pan||0)+(track.pan||0),-1,1);panner.pan.value=basePan
    if(clip.fx.motionMode!=='off'&&(clip.fx.motionDepth||0)>0){const osc=ctx.createOscillator();const depth=ctx.createGain();const modeBoost=clip.fx.motionMode==='16d'?1.08:1;osc.type='sine';osc.frequency.value=clamp((clip.fx.motionHz||.16)*modeBoost,.03,1.5);depth.gain.value=clamp(clip.fx.motionDepth||.75,0,.98);osc.connect(depth);depth.connect(panner.pan);osc.start(when);osc.stop(when+playTimeline+.08);oscillators.push(osc)
      if(clip.fx.motionMode==='16d'){const trem=ctx.createGain();trem.gain.value=1;const lfo=ctx.createOscillator();const lfoDepth=ctx.createGain();lfo.type='sine';lfo.frequency.value=clamp((clip.fx.motionHz||.16)*2.04,.06,2.2);lfoDepth.gain.value=.055*clamp(clip.fx.motionDepth||.75,0,1);lfo.connect(lfoDepth);lfoDepth.connect(trem.gain);post.connect(trem);trem.connect(panner);lfo.start(when);lfo.stop(when+playTimeline+.08);oscillators.push(lfo);panner.connect(destination);return {input,oscillators}}
    }
    post.connect(panner);panner.connect(destination)
  }else post.connect(destination)
  return {input,oscillators}
}

function connectMaster(ctx:BaseAudioContext,project:AudioProject,destination:AudioNode){const gain=ctx.createGain();gain.gain.value=dbToGain(project.master?.gainDb||0);if(project.master?.limiter!==false){const limiter=makeLimiter(ctx,-.8);gain.connect(limiter);limiter.connect(destination)}else gain.connect(destination);return gain}

export async function decodeAudio(arrayBuffer:ArrayBuffer){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio API is not supported.');const ctx=new AC();try{return await ctx.decodeAudioData(arrayBuffer.slice(0))}finally{await ctx.close().catch(()=>{})}}

function sourceBufferAndOffset(buffer:AudioBuffer,clip:AudioClip,sourceSkip:number){if(!clip.fx.reverse)return{buffer,offset:clip.offset+sourceSkip};const reversed=reversedBuffer(buffer);const segmentReverseOffset=Math.max(0,buffer.duration-(clip.offset+clip.duration));return{buffer:reversed,offset:segmentReverseOffset+sourceSkip}}

export async function playProject({project,buffers,fromTime=0,onEnded}:{project:AudioProject;buffers:Map<string,AudioBuffer>;fromTime?:number;onEnded?:()=>void}){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio API is not supported.');const ctx=new AC({latencyHint:'interactive'});await ctx.resume();const master=connectMaster(ctx,project,ctx.destination);const sources:AudioBufferSourceNode[]=[];const startAt=ctx.currentTime+.045;const total=projectDuration(project);const anySolo=project.tracks.some(t=>t.solo)
  for(const track of project.tracks){if(track.muted||(anySolo&&!track.solo))continue;for(const clip of track.clips){const raw=buffers.get(clip.bufferId);if(!raw)continue;const rate=effectiveRate(clip);const timelineDur=clipTimelineDuration(clip);const clipEnd=clip.start+timelineDur;if(clipEnd<=fromTime)continue;const skipTimeline=Math.max(0,fromTime-clip.start);const playTimeline=Math.max(0,timelineDur-skipTimeline);if(playTimeline<=.002)continue;const when=startAt+Math.max(0,clip.start-fromTime);const source=ctx.createBufferSource();const pitchRate=Math.pow(2,clamp(Number(clip.fx.tapePitchSemitones||0),-12,12)/12);const pitchLock=clip.fx.preservePitch===true&&Math.abs(Number(clip.fx.speed||1)-1)>.002;if(pitchLock){const prepared=pitchLockedClipBuffer(raw,clip);const preparedSkip=skipTimeline*pitchRate;const preparedDuration=Math.min(Math.max(0,prepared.duration-preparedSkip),playTimeline*pitchRate);if(preparedDuration<=.002)continue;source.buffer=prepared;source.playbackRate.value=pitchRate;const {input}=buildClipChain(ctx,clip,track,master,when,skipTimeline,playTimeline,{buffer:prepared,offset:preparedSkip,rate:pitchRate});source.connect(input);source.start(when,preparedSkip,preparedDuration)}else{const sourceSkip=skipTimeline*rate;const sourceDuration=Math.max(0,clip.duration-sourceSkip);const playable=sourceBufferAndOffset(raw,clip,sourceSkip);source.buffer=playable.buffer;source.playbackRate.value=rate;const {input}=buildClipChain(ctx,clip,track,master,when,skipTimeline,playTimeline,{buffer:playable.buffer,offset:playable.offset,rate});source.connect(input);source.start(when,playable.offset,sourceDuration)}sources.push(source)}}
  let stopped=false;const timer=window.setTimeout(()=>{if(!stopped)onEnded?.()},Math.max(0,(total-fromTime+tailSeconds(project))*1000+90));return{ctx,startCtxTime:startAt,stop:async()=>{stopped=true;clearTimeout(timer);for(const source of sources){try{source.stop()}catch{}}await ctx.close().catch(()=>{})}}
}

function tailSeconds(project:AudioProject){
  let tail=0
  for(const track of project.tracks)for(const clip of track.clips){
    if((clip.fx.reverb||0)>0)tail=Math.max(tail,1.15+clamp(Number(clip.fx.reverbSize??.55),0,1)*2.8)
    if((clip.fx.delayMs||0)>0&&(clip.fx.delayWet||0)>0){
      const delay=clamp(clip.fx.delayMs/1000,.035,1.2)
      const echoTail=clip.fx.echoBehavior==='phrase'
        ? delay*Math.round(clamp(Number(clip.fx.echoRepeats??3),1,5))+.35
        : Math.min(7,delay*Math.max(2,Math.ceil(Math.log(.035)/Math.log(Math.max(.06,Math.min(.8,Number(clip.fx.feedback??.2)))))))+.3
      tail=Math.max(tail,echoTail)
    }
  }
  return tail
}
function repairAndNormalize(buffer:AudioBuffer,{stereoRepair=true,normalize=true}={}){const left=buffer.getChannelData(0),right=buffer.numberOfChannels>1?buffer.getChannelData(1):left;let l2=0,r2=0,peak=0,samples=0;const stride=Math.max(1,Math.floor(left.length/250000));for(let i=0;i<left.length;i+=stride){l2+=left[i]*left[i];r2+=right[i]*right[i];samples+=1}const lRms=Math.sqrt(l2/Math.max(1,samples)),rRms=Math.sqrt(r2/Math.max(1,samples)),ratio=Math.min(lRms,rRms)/Math.max(lRms,rRms,.0000001);let repaired=false;if(stereoRepair&&ratio<.015&&Math.max(lRms,rRms)>.0005&&buffer.numberOfChannels>1){const src=lRms>=rRms?new Float32Array(left):new Float32Array(right);left.set(src);right.set(src);repaired=true}for(let ch=0;ch<buffer.numberOfChannels;ch+=1){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i+=1)peak=Math.max(peak,Math.abs(data[i]))}if(normalize&&peak>.00001){const scale=.965/peak;if(scale<.999||scale>1.03){for(let ch=0;ch<buffer.numberOfChannels;ch+=1){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i+=1)data[i]*=scale}}}return{peak,repaired,leftRms:lRms,rightRms:rRms}}

export async function renderProject(project:AudioProject,buffers:Map<string,AudioBuffer>,options:{normalize?:boolean;stereoRepair?:boolean;sampleRate?:number}={}){
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OAC)throw new Error('OfflineAudioContext is not supported.');const sampleRate=options.sampleRate||44100;const baseDuration=projectDuration(project);const tail=tailSeconds(project);const length=Math.max(1,Math.ceil((baseDuration+tail)*sampleRate));const offline=new OAC(2,length,sampleRate);const master=connectMaster(offline,project,offline.destination);const anySolo=project.tracks.some(t=>t.solo)
  for(const track of project.tracks){if(track.muted||(anySolo&&!track.solo))continue;for(const clip of track.clips){const raw=buffers.get(clip.bufferId);if(!raw||clip.duration<=.002)continue;const rate=effectiveRate(clip);const timelineDur=clipTimelineDuration(clip);const source=offline.createBufferSource();const pitchRate=Math.pow(2,clamp(Number(clip.fx.tapePitchSemitones||0),-12,12)/12);const pitchLock=clip.fx.preservePitch===true&&Math.abs(Number(clip.fx.speed||1)-1)>.002;if(pitchLock){const prepared=pitchLockedClipBuffer(raw,clip);source.buffer=prepared;source.playbackRate.value=pitchRate;const {input}=buildClipChain(offline,clip,track,master,clip.start,0,timelineDur,{buffer:prepared,offset:0,rate:pitchRate});source.connect(input);source.start(clip.start,0,prepared.duration)}else{const playable=sourceBufferAndOffset(raw,clip,0);source.buffer=playable.buffer;source.playbackRate.value=rate;const {input}=buildClipChain(offline,clip,track,master,clip.start,0,timelineDur,{buffer:playable.buffer,offset:playable.offset,rate});source.connect(input);source.start(clip.start,playable.offset,clip.duration)}}}
  const rendered=await offline.startRendering();const analysis=repairAndNormalize(rendered,{stereoRepair:options.stereoRepair??project.master.stereoRepair,normalize:options.normalize??project.master.normalizeOnExport});return{buffer:rendered,analysis}
}

declare global { interface Window { webkitAudioContext?: typeof AudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext } }
