import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {soundPresets} from '../editor/project'

const mp3Rates=['64','192','240','320']
const videoRates=['240p','360p','480p','720p','1080p','1440p','2160p']
const stems=[{no:1,name:'Vocals'},{no:2,name:'Music'},{no:3,name:'Drums'},{no:4,name:'Bass'},{no:5,name:'Other'}]
const stemOrder=[2,4,0,3,1].map(i=>stems[i])
const orderedPresets=soundPresets.map((item,i)=>({...item,no:i+1})).sort((a,b)=>{
 const hash=(text:string)=>Array.from(text).reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,17)
 return hash(a.id)-hash(b.id)
})

type Cycle={value:string;detail:string}
function AnimatedMetric({items,offset=0,hold=5000}: {items:Cycle[];offset?:number;hold?:number}){
 const [index,setIndex]=useState(0)
 const [count,setCount]=useState(0)
 const [phase,setPhase]=useState<'typing'|'hold'|'burst'>('typing')
 const [ready,setReady]=useState(offset===0)
 const [reduced,setReduced]=useState(false)
 useEffect(()=>{
  const prefers=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setReduced(prefers)
  if(prefers){setReady(true);return}
  if(offset===0)return
  const id=window.setTimeout(()=>setReady(true),offset)
  return()=>window.clearTimeout(id)
 },[offset])
 const current=items[index%items.length]||{value:'',detail:''}
 useEffect(()=>{
  if(!ready||reduced||items.length<2)return
  let timeout:number
  if(phase==='typing'){
   timeout=window.setTimeout(()=>{
    if(count<current.value.length)setCount(n=>n+1)
    else setPhase('hold')
   },52)
  }else if(phase==='hold')timeout=window.setTimeout(()=>setPhase('burst'),hold)
  else timeout=window.setTimeout(()=>{setIndex(i=>(i+1)%items.length);setCount(0);setPhase('typing')},470)
  return()=>window.clearTimeout(timeout)
 },[items,index,count,phase,ready,reduced,hold,current.value.length])
 const visible=!ready?'':reduced?current.value:current.value.slice(0,count)
 return <div className={`ax44-metric-scene ${phase==='burst'?'is-burst':''}`} aria-label={`${current.value} ${current.detail}`}>
  <strong className="ax44-metric-value" aria-hidden="true">{visible}<span className="ax44-type-caret"/></strong>
  <span className="ax44-metric-detail" aria-hidden="true">{current.detail}</span>
 </div>
}

export default function TrustMetrics(){
 const presetItems=useMemo<Cycle[]>(()=>orderedPresets.map(x=>({value:`${String(x.no).padStart(2,'0')}/${soundPresets.length}`,detail:x.name})),[])
 const stemsItems=useMemo<Cycle[]>(()=>stemOrder.map(x=>({value:`0${x.no}/05`,detail:x.name})),[])
 return <section className="ax39-metrics ax44-metrics" aria-label="Audixo tools at a glance">
  <header><div className="ax25-kicker"><i/> AUDIXO / FAST FACTS</div><h2>Small steps. <em>Big sound.</em></h2><p>Find a tool for your next creative step.</p></header>
  <div className="ax39-metric-grid">
   <Link to="/tools/youtube-to-mp3" className="ax39-metric-card mp3"><span>01 / AUDIO</span><AnimatedMetric items={mp3Rates.map(v=>({value:v,detail:'kbps MP3'}))} hold={5000}/><p>Choose an audio bitrate for eligible, shorter media.</p><b>Open converter ↗</b></Link>
   <Link to="/tools/youtube-to-mp3" className="ax39-metric-card mp4"><span>02 / VIDEO</span><AnimatedMetric items={videoRates.map(v=>({value:v,detail:v==='2160p'?'4K video':v==='1440p'?'2K video':v==='1080p'?'Full HD video':'Video resolution'}))} offset={1200} hold={5200}/><p>Request a resolution supported by the video and API.</p><b>Open converter ↗</b></Link>
   <Link to="/tools/vocals" className="ax39-metric-card stems"><span>03 / SEPARATE</span><AnimatedMetric items={stemsItems} offset={2700} hold={5400}/><p>Five named stem groups, each on its own track.</p><b>Explore stems ↗</b></Link>
   <Link to="/editor" className="ax39-metric-card effects"><span>04 / PRESETS</span><AnimatedMetric items={presetItems} offset={3800} hold={5600}/><p>{soundPresets.length} real editor presets. Preview each name before editing.</p><b>Open studio ↗</b></Link>
  </div>
  <p className="ax39-metrics-foot">* These animated previews show choices, not guaranteed download quality. The server verifies requested MP4 resolutions.</p>
 </section>
}
