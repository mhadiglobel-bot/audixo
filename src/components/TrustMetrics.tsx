import {useEffect,useRef,useState,type CSSProperties} from 'react'
import {Link} from 'react-router-dom'
import {soundPresets} from '../editor/project'
import {soundBank} from '../services/soundBank'

type MetricOption={value:string;unit:string;description:string}
type Metric={label:string;category:string;href:string;action:string;options:MetricOption[];delay:number;offset:number}

const bitrateOptions:MetricOption[]=[64,128,192,256,320].map(n=>({value:String(n),unit:'kbps',description:n===320?'Maximum MP3 encoding target':n===64?'Compact audio':n===192?'Balanced listening':'Detailed sound'}))
const videoOptions:MetricOption[]=[
 ['240p','Compact video'],['360p','Quick preview'],['480p','Smooth mobile'],['720p','HD clarity'],['1080p','Full HD'],['1440p','QHD clarity'],['2160p','Ultra HD'],
].map(([value,unit])=>({value,unit,description:'Video quality preview'}))
const presetOptions:MetricOption[]=soundPresets.map((preset,i)=>({value:String(i+1).padStart(2,'0'),unit:preset.name,description:'Shape your sound'}))
const soundOptions:MetricOption[]=soundBank.map((sound,i)=>({value:String(i+1).padStart(2,'0'),unit:sound.name,description:`${sound.family} · layer into your mix`}))

const metrics:Metric[]=[
 {label:'01 / AUDIO',category:'MP3 bitrate',href:'/tools/youtube-to-mp3',action:'Open converter',options:bitrateOptions,delay:7500,offset:0},
 {label:'02 / VIDEO',category:'MP4 resolution',href:'/tools/youtube-to-mp3',action:'Open converter',options:videoOptions,delay:7700,offset:900},
 {label:'03 / PRESETS',category:'Studio presets',href:'/editor',action:'Explore presets',options:presetOptions,delay:7900,offset:1500},
 {label:'04 / SOUNDS',category:'Sound library',href:'/tools/vocals',action:'Explore layers',options:soundOptions,delay:8100,offset:2250},
]

function shuffled(values:number[]):number[]{
 const result=[...values]
 for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result
}

function MetricCard({metric}:{metric:Metric}){
 const [index,setIndex]=useState(0)
 const shuffledQueue=useRef<number[]>([])
 const current=metric.options[index]||metric.options[0]
 useEffect(()=>{
  if(metric.options.length<2)return
  shuffledQueue.current=shuffled(Array.from({length:metric.options.length-1},(_,i)=>i+1))
  const step=()=>{
   if(!shuffledQueue.current.length){shuffledQueue.current=shuffled(Array.from({length:metric.options.length},(_,i)=>i))}
   const next=shuffledQueue.current.shift()
   if(next!==undefined)setIndex(next)
  }
  let repeat:number|undefined
  const begin=window.setTimeout(()=>{step();repeat=window.setInterval(step,metric.delay)},metric.delay+metric.offset)
  return()=>{window.clearTimeout(begin);if(repeat!==undefined)window.clearInterval(repeat)}
 },[metric])
 return <article className={`ax39-metric-card ax46-metric-card is-${metric.label.slice(5).toLowerCase()}`}>
  <header><span>{metric.label}</span><span className="ax46-card-spark" aria-hidden="true"><i/><i/><i/></span></header>
  <div className="ax46-metric-content">
   <small className="ax46-metric-category">{metric.category}</small>
   <strong className="ax46-metric-value" key={`${metric.label}-${index}`} style={{'--ax46-scene-time':`${metric.delay}ms`,'--ax46-characters':current.value.length} as CSSProperties}><span>{current.value}</span></strong>
   <div className="ax46-metric-subtitle" key={`subtitle-${metric.label}-${index}`}>{current.unit}</div>
   <p>{current.description}</p>
  </div>
  <Link to={metric.href}>{metric.action} <span aria-hidden="true">↗</span></Link>
 </article>
}

export default function TrustMetrics(){return <section className="ax39-metric-grid ax46-metric-grid" aria-label="Audixo tools and creative previews">{metrics.map(m=><MetricCard key={m.label} metric={m}/>)}</section>}
