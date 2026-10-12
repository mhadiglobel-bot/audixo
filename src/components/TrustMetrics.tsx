import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {soundPresets} from '../editor/project'
import {soundBank} from '../services/soundBank'

const videoResolutions=['240p','360p','480p','720p','1080p','1440p']
const mp3Rates=['64','192','240','320']
const stemItems=[
 ['5','vocals'],['4','drums'],['3','bass'],['2','other'],['5','stems'],['4','music'],['3','lead'],['2','fx']
]
const presetItems=[
 'Studio Clean','Vocal Air','Wide Echo','Deep Space','Neo Delay','Tape Glow','Club Punch','Night Drive','Bass Lift','Bright Vox',
 'Dream Wash','Radio Lite','Tape Flutter','Crystal Hall','Arena Push','Mono Snap','Future Pad','Street Echo','Smooth Tube','Pulse Gate',
 'Warm Chamber','Soft Boost','Glow Motion','Stereo Bloom','Hyper Chorus','Vocal Throw','Crisp Room','Orbit Verb','Sub Lift','Rush Delay'
]

function useCycler<T>(items:T[],interval:number){
 const [index,setIndex]=useState(0)
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||items.length<2)return
  const timer=window.setInterval(()=>setIndex(v=>(v+1)%items.length),interval)
  return()=>window.clearInterval(timer)
 },[items.length,interval])
 return items[index]
}

export default function TrustMetrics(){
 const mp3Rate=useCycler(mp3Rates,5200)
 const videoRes=useCycler(videoResolutions,5200)
 const stemItem=useCycler(stemItems,5000)
 const presetName=useCycler(presetItems,5000)
 const presetCount=useMemo(()=>Math.max(30,soundPresets.length+soundBank.length),[])
 const presetBadge=videoRes==='1080p'?'HD':videoRes==='1440p'?'QHD':''
 return <section className="ax39-metrics" aria-label="Audixo creative tool highlights">
  <header><div className="ax25-kicker"><i/> AUDIXO / FAST FACTS</div><h2>Small steps. <em>Big sound.</em></h2><p>Your tools at a glance. Choose what you want to make and start with one click.</p></header>
  <div className="ax39-metric-grid">
   <Link to="/tools/youtube-to-mp3" className="ax39-metric-card mp3"><span>01 / AUDIO</span><strong key={mp3Rate} className="ax42-burst-word">{mp3Rate} <small>kbps</small></strong><p>MP3 quality changes in the card preview before fading and switching again.</p><b>Open converter ↗</b></Link>
   <Link to="/tools/youtube-to-mp3" className="ax39-metric-card mp4"><span>02 / VIDEO</span><strong key={videoRes} className="ax42-burst-word">{videoRes}{presetBadge&&<sup>{presetBadge}</sup>}</strong><p>Video quality cycles through available targets with the same burst-style preview.</p><b>Open converter ↗</b></Link>
   <Link to="/tools/vocals" className="ax39-metric-card stems"><span>03 / SEPARATE</span><strong key={`${stemItem[0]}-${stemItem[1]}`} className="ax42-burst-word">{stemItem[0]} <small>{stemItem[1]}</small></strong><p>Shuffle preview shows changing stem counts and labels instead of a fixed sequence.</p><b>Explore stems ↗</b></Link>
   <Link to="/editor" className="ax39-metric-card effects"><span>04 / CREATE</span><strong>{presetCount}<small>+</small></strong><p key={presetName} className="ax42-burst-copy">Preset shuffle: <b>{presetName}</b></p><b>Open studio ↗</b></Link>
  </div>
  <p className="ax39-metrics-foot">* Available MP4 resolutions depend on the selected source and REST YTDL API response. The animated card previews highlight supported UI behavior, not a guaranteed quality for every source.</p>
 </section>
}
