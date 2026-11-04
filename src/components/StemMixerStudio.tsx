import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {LocalStem} from '../services/localStems'
import {encodeWav,downloadBlob} from '../editor/encoder'
import {saveMixToLibrary} from '../editor/library'

type Channel={enabled:boolean;gain:number;pan:number;bass:number;mid:number;treble:number;echo:number;delay:number;scope:'all'|'range';from:number;to:number}
type Graph={low:BiquadFilterNode;mid:BiquadFilterNode;high:BiquadFilterNode;pan:StereoPannerNode;gain:GainNode;wet:GainNode;delay:DelayNode}
const names=['Lyrics / Vocals','Music','Drums','Bass','Other instruments']
const blank=(i:number):Channel=>({enabled:i<2||i>=5,gain:0,pan:0,bass:0,mid:0,treble:0,echo:0,delay:250,scope:'all',from:0,to:0})
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n))
const hh=(seconds:number)=>{const n=Math.floor(seconds||0);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
const db=(n:number)=>Math.pow(10,n/20)
function weights(channels:Channel[],i:number){
 if(i===0||i>4)return 1
 const sub=channels.slice(2,5).filter(c=>c?.enabled).length
 return channels[1]?.enabled&&sub>0?1/(1+sub/3):1
}

function FxSlider({name,value,min,max,step,unit='',onChange}:{name:string;value:number;min:number;max:number;step:number;unit?:string;onChange:(n:number)=>void}){
 return <label className="ax78-fx-slider"><span><strong>{name}</strong><b>{step<1?value.toFixed(2):Math.round(value)}{unit}</b></span>
  <input aria-label={name} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
 </label>
}

export default function StemMixerStudio({stems,sourceName,onSave}:{stems:LocalStem[];sourceName:string;onSave:(name:string)=>void}){
 const [channels,setChannels]=useState<Channel[]>(()=>stems.map((_,i)=>blank(i)))
 const [selected,setSelected]=useState(0)
 const [urls,setUrls]=useState<string[]>([])
 const [playing,setPlaying]=useState(false)
 const [duration,setDuration]=useState(0)
 const [position,setPosition]=useState(0)
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const media=useRef<(HTMLAudioElement|null)[]>([])
 const context=useRef<AudioContext|null>(null)
 const graph=useRef<(Graph|undefined)[]>([])
 const currentChannels=useRef(channels)
 const selectedStem=stems[selected]
 useEffect(()=>{setChannels(v=>stems.map((_,i)=>v[i]??blank(i)))},[stems.length])
 useEffect(()=>{
  const next=stems.map(stem=>URL.createObjectURL(stem.blob))
  setUrls(next)
  return()=>next.forEach(url=>URL.revokeObjectURL(url))
 },[stems])
 useEffect(()=>()=>{media.current.forEach(a=>a?.pause());void context.current?.close()},[])
 const applyGraph=useCallback((list:Channel[],time:number)=>{
  const ctx=context.current;if(!ctx)return
  list.forEach((c,i)=>{
   const g=graph.current[i];if(!g)return
   const active=c.scope==='all'||(time>=c.from&&time<=Math.max(c.from+.01,c.to))
   const multiplier=weights(list,i)
   const volume=(c.enabled?clamp(db(c.gain)*multiplier,0,1.8):0)
   g.gain.gain.setTargetAtTime(volume,ctx.currentTime,.018)
   g.pan.pan.setTargetAtTime(clamp(c.pan,-1,1),ctx.currentTime,.025)
   g.low.gain.setTargetAtTime(active?c.bass:0,ctx.currentTime,.03)
   g.mid.gain.setTargetAtTime(active?c.mid:0,ctx.currentTime,.03)
   g.high.gain.setTargetAtTime(active?c.treble:0,ctx.currentTime,.03)
   g.delay.delayTime.setTargetAtTime(clamp(c.delay/1000,.05,.85),ctx.currentTime,.02)
   g.wet.gain.setTargetAtTime(active?c.echo/100*volume:0,ctx.currentTime,.04)
  })
 },[])
 useEffect(()=>{currentChannels.current=channels;applyGraph(channels,position)},[channels,position,applyGraph])
 const ensureGraph=async()=>{
  let ctx=context.current
  if(!ctx){ctx=new AudioContext();context.current=ctx}
  media.current.forEach((el,i)=>{
   if(!el||graph.current[i])return
   const src=ctx!.createMediaElementSource(el)
   const low=ctx!.createBiquadFilter();low.type='lowshelf';low.frequency.value=170
   const mid=ctx!.createBiquadFilter();mid.type='peaking';mid.frequency.value=1150;mid.Q.value=.85
   const high=ctx!.createBiquadFilter();high.type='highshelf';high.frequency.value=4800
   const pan=ctx!.createStereoPanner(),gain=ctx!.createGain(),delay=ctx!.createDelay(1),wet=ctx!.createGain()
   const feedback=ctx!.createGain();feedback.gain.value=.17
   src.connect(low).connect(mid).connect(high).connect(pan)
   pan.connect(gain).connect(ctx!.destination)
   pan.connect(delay);delay.connect(wet).connect(ctx!.destination);delay.connect(feedback).connect(delay)
   graph.current[i]={low,mid,high,pan,gain,wet,delay}
  })
  await ctx.resume()
  applyGraph(currentChannels.current,position)
 }
 const stop=()=>{
  media.current.forEach(a=>a?.pause());setPlaying(false)
 }
 const toggle=async()=>{
  if(playing){stop();return}
  setNotice('')
  try{
   await ensureGraph()
   const items=media.current.filter((a):a is HTMLAudioElement=>Boolean(a))
   if(!items.length)throw new Error('Audio is still loading.')
   for(const a of items){a.currentTime=clamp(position,0,Math.max(0,(Number.isFinite(a.duration)?a.duration:duration)-.02))}
   const results=await Promise.allSettled(items.map(a=>a.play()))
   if(results.some(x=>x.status==='rejected'))throw new Error('Playback was blocked. Select Play again after the files finish loading.')
   setPlaying(true)
  }catch(e){stop();setNotice(e instanceof Error?e.message:'Cannot start the mixer.')}
 }
 const patch=(index:number,change:Partial<Channel>)=>setChannels(prev=>prev.map((c,i)=>i===index?{...c,...change}:c))
 const setMode=(mode:'full'|'vocals'|'instrumental'|'parts')=>setChannels(prev=>prev.map((c,i)=>({...c,enabled:mode==='full'?i<2:mode==='vocals'?i===0:mode==='instrumental'?i===1:i>=2&&i<=4})))
 const seek=(time:number)=>{
  const t=clamp(time,0,Math.max(0,duration))
  media.current.forEach(a=>{if(a&&Number.isFinite(a.duration))a.currentTime=Math.min(t,Math.max(0,a.duration-.01))})
  setPosition(t);applyGraph(currentChannels.current,t)
 }
 const onTick=(i:number,element:HTMLAudioElement)=>{
  if(i!==0)return
  const t=element.currentTime
  setPosition(t)
  if(playing){media.current.slice(1).forEach(a=>{if(a&&Number.isFinite(a.duration)&&Math.abs(a.currentTime-t)>.13)a.currentTime=Math.min(t,Math.max(0,a.duration-.01))})}
 }
 const exportMix=async()=>{
  if(busy||!channels.some(x=>x.enabled))return
  setBusy(true);setNotice('Rendering your selected layers and track effects…')
  try{
   const Context=window.AudioContext||(window as typeof window & {webkitAudioContext:typeof AudioContext}).webkitAudioContext
   const decoder=new Context({sampleRate:44100})
   let decoded:({index:number;buffer:AudioBuffer}|null)[]=[]
   try{decoded=await Promise.all(stems.map(async(stem,i)=>{
    if(!channels[i]?.enabled)return null
    const buffer=await decoder.decodeAudioData(await stem.blob.arrayBuffer())
    return {index:i,buffer}
   }))}finally{await decoder.close()}
   const active=decoded.filter((x):x is {index:number;buffer:AudioBuffer}=>x!==null)
   if(!active.length)throw new Error('Turn on at least one layer.')
   const len=Math.max(...active.map(x=>x.buffer.duration)),rate=44100
   const offline=new OfflineAudioContext(2,Math.ceil((len+.8)*rate),rate)
   for(const {index,buffer} of active){
    const c=channels[index],source=offline.createBufferSource();source.buffer=buffer
    const low=offline.createBiquadFilter();low.type='lowshelf';low.frequency.value=170
    const mid=offline.createBiquadFilter();mid.type='peaking';mid.frequency.value=1150;mid.Q.value=.85
    const high=offline.createBiquadFilter();high.type='highshelf';high.frequency.value=4800
    const pan=offline.createStereoPanner();pan.pan.value=c.pan
    const gain=offline.createGain();gain.gain.value=clamp(db(c.gain)*weights(channels,index),0,1.8)
    const automate=(param:AudioParam,value:number)=>{
     if(c.scope==='all'){param.value=value;return}
     const start=clamp(c.from,0,len),end=clamp(Math.max(c.from+.01,c.to),start,len)
     param.setValueAtTime(0,0)
     param.setValueAtTime(0,start)
     param.linearRampToValueAtTime(value,Math.min(len,start+.015))
     param.setValueAtTime(value,Math.max(start+.015,end-.015))
     param.linearRampToValueAtTime(0,end)
    }
    automate(low.gain,c.bass);automate(mid.gain,c.mid);automate(high.gain,c.treble)
    source.connect(low).connect(mid).connect(high).connect(pan).connect(gain).connect(offline.destination)
    if(c.echo>0){
     const delay=offline.createDelay(1),wet=offline.createGain(),feedback=offline.createGain()
     delay.delayTime.value=c.delay/1000;feedback.gain.value=.17
     automate(wet.gain,c.echo/100*gain.gain.value)
     pan.connect(delay);delay.connect(wet).connect(offline.destination);delay.connect(feedback).connect(delay)
    }
    source.start(0)
   }
   const rendered=await offline.startRendering()
   const blob=encodeWav(rendered)
   const base=(sourceName.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,' ').trim()||'Audixo Mix').slice(0,100)
   downloadBlob(blob,base+' (Audixo Stems).wav')
   await saveMixToLibrary({name:base+' - Stem Mix',blob,format:'wav',kbps:0,duration:rendered.duration})
   setNotice('Mix exported as WAV and saved to your Local Library.')
  }catch(e){setNotice(e instanceof Error?e.message:'Mix export was unsuccessful. Try fewer active tracks.')}
  finally{setBusy(false)}
 }
 const edits=useMemo(()=>channels.flatMap((c,i)=>{
  const updates=[c.gain!==0?'Level '+c.gain+' dB':'',c.pan!==0?'Pan '+c.pan:'',c.bass!==0?'Bass '+c.bass:'',c.mid!==0?'Mid '+c.mid:'',c.treble!==0?'Treble '+c.treble:'',c.echo>0?'Echo '+c.echo+'%':'',c.scope==='range'?'Range '+hh(c.from)+'–'+hh(c.to):''].filter(Boolean)
  return updates.length?[{name:stems[i]?.name||'Track',items:updates}]:[]
 }),[channels,stems])
 const c=channels[selected]||blank(selected)
 return <div className="ax78-mixer">
  <div className="ax78-mixer-toolbar"><div className="ax78-mixer-identity"><span className="ax78-live-dot"/><div><small>STEM MIXER / FIVE INDEPENDENT TRACKS</small><strong>Hear every layer together.</strong></div></div>
   <div className="ax78-mixer-controls"><button type="button" className="ax78-master-play" onClick={()=>void toggle()} aria-label={playing?'Pause all layers':'Play active layers'}>{playing?'Ⅱ':'▶'}</button>
    <span>{hh(position)} / {hh(duration)}</span><input aria-label="Mix playback position" type="range" min="0" max={Math.max(.1,duration)} step=".05" value={Math.min(position,Math.max(.1,duration))} onChange={e=>seek(Number(e.target.value))}/>
    <button type="button" onClick={stop}>Stop</button></div>
  </div>
  <div className="ax78-modes" role="group" aria-label="Quick layer combinations">
   <button onClick={()=>setMode('full')}>Full mix</button><button onClick={()=>setMode('vocals')}>Vocals only</button>
   <button onClick={()=>setMode('instrumental')}>Instrumental</button><button onClick={()=>setMode('parts')}>Drums + Bass + Other</button>
  </div>
  <div className="ax78-stem-lanes" role="group" aria-label="Independent stem layers">
   {stems.map((stem,i)=>{const k=channels[i]||blank(i);const peaks=stem.peaks?.length?stem.peaks:Array.from({length:80},(_,n)=>.15+.5*Math.abs(Math.sin(n*5.17+i)))
    return <article key={i+'-'+stem.name} className={'ax78-stem-lane '+(selected===i?'is-selected ':'')+(k.enabled?'is-on':'is-off')} onClick={()=>setSelected(i)}>
     <div className="ax78-lane-id"><span>{String(i+1).padStart(2,'0')}</span><div><strong>{stem.name}</strong><small>{i===1?'Instrumental bus':i>1&&i<5?'Independent instrument layer':'Source stem'}</small></div></div>
     <div className="ax78-lane-wave" aria-label={'Waveform overview for '+stem.name}>{peaks.map((peak,j)=><i key={j} style={{height:(12+clamp(peak,0,1)*82)+'%'}}/>)}</div>
     <div className="ax78-lane-actions">
      <button type="button" aria-pressed={k.enabled} className={k.enabled?'is-enabled':''} onClick={e=>{e.stopPropagation();patch(i,{enabled:!k.enabled})}}>{k.enabled?'On':'Muted'}</button>
      <button type="button" onClick={e=>{e.stopPropagation();setChannels(v=>v.map((x,j)=>({...x,enabled:j===i})))}}>Solo</button>
      <input aria-label={stem.name+' level in dB'} type="range" min="-18" max="6" step=".5" value={k.gain} onClick={e=>e.stopPropagation()} onChange={e=>patch(i,{gain:Number(e.target.value)})}/>
      <button type="button" className="ax78-lane-save" onClick={e=>{e.stopPropagation();onSave(stem.name)}}>WAV ↓</button>
     </div>
     <audio src={urls[i]} ref={node=>{media.current[i]=node}} preload="metadata"
      onLoadedMetadata={e=>{if(i===0)setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)}}
      onTimeUpdate={e=>onTick(i,e.currentTarget)}
      onEnded={()=>{if(i===0){stop();setPosition(0);media.current.forEach(a=>{if(a)a.currentTime=0})}}}
     />
    </article>})}
  </div>
  <div className="ax78-inspector">
   <header><div><small>TRACK-SPECIFIC CONTROLS</small><h3>{selectedStem?.name||'Select a layer'}</h3><p>These changes affect this track only. Multiple enabled tracks play simultaneously.</p></div><button onClick={()=>patch(selected,blank(selected))}>Reset this track</button></header>
   <div className="ax78-scope"><button className={c.scope==='all'?'active':''} onClick={()=>patch(selected,{scope:'all'})}>Entire track</button><button className={c.scope==='range'?'active':''} onClick={()=>patch(selected,{scope:'range',to:c.to||duration})}>Selected section</button></div>
   {c.scope==='range'&&<div className="ax78-range">
    <label>From (seconds)<input type="number" min="0" max={duration} step=".1" value={c.from} onChange={e=>patch(selected,{from:clamp(Number(e.target.value)||0,0,duration)})}/></label>
    <label>To (seconds)<input type="number" min={c.from} max={duration} step=".1" value={c.to} onChange={e=>patch(selected,{to:clamp(Number(e.target.value)||0,c.from,duration)})}/></label>
    <button onClick={()=>patch(selected,{from:position,to:Math.min(duration,position+5)})}>Use next 5s</button>
   </div>}
   <div className="ax78-fx-grid">
    <FxSlider name="Gain" min={-18} max={6} step={.5} unit=" dB" value={c.gain} onChange={v=>patch(selected,{gain:v})}/>
    <FxSlider name="Pan" min={-1} max={1} step={.05} value={c.pan} onChange={v=>patch(selected,{pan:v})}/>
    <FxSlider name="Bass" min={-12} max={12} step={.5} unit=" dB" value={c.bass} onChange={v=>patch(selected,{bass:v})}/>
    <FxSlider name="Mid" min={-12} max={12} step={.5} unit=" dB" value={c.mid} onChange={v=>patch(selected,{mid:v})}/>
    <FxSlider name="Treble" min={-12} max={12} step={.5} unit=" dB" value={c.treble} onChange={v=>patch(selected,{treble:v})}/>
    <FxSlider name="Echo amount" min={0} max={55} step={1} unit="%" value={c.echo} onChange={v=>patch(selected,{echo:v})}/>
    <FxSlider name="Echo delay" min={80} max={850} step={5} unit=" ms" value={c.delay} onChange={v=>patch(selected,{delay:v})}/>
   </div>
  </div>
  <div className="ax78-applied"><header><div><small>APPLIED EDITS</small><h3>{edits.length} track{edits.length===1?'':'s'} customized</h3></div><button type="button" onClick={()=>setChannels(stems.map((_,i)=>blank(i)))}>Clear edits</button></header>
   {edits.length?<div>{edits.map(x=><p key={x.name}><strong>{x.name}</strong><span>{x.items.join(' · ')}</span></p>)}</div>:<p className="ax78-applied-empty">All tracks are in their original state. Select a layer above to shape it.</p>}
  </div>
  <footer className="ax78-mixer-export"><p>Music is a bus built from Drums, Bass and Other. When both are enabled, AUDIXO balances overlapping sources to reduce doubling. AI separation may still leave some bleed.</p><button disabled={busy||!channels.some(x=>x.enabled)} onClick={()=>void exportMix()}>{busy?'Rendering…':'Export mixed WAV ↗'}</button></footer>
  {notice&&<p className="ax78-notice" role="status">{notice}</p>}
 </div>
}
