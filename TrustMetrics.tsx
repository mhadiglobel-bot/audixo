import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {soundPresets} from '../editor/project'
import {soundBank} from '../services/soundBank'
const resolutions=['240p','360p','480p','720p','1080p','1440p']
export default function TrustMetrics(){
 const [current,setCurrent]=useState(3)
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const timer=window.setInterval(()=>setCurrent(v=>(v+1)%resolutions.length),2700)
  return()=>window.clearInterval(timer)
 },[])
 return <section className="ax39-metrics" aria-label="Audixo creative tool highlights">
  <header><div className="ax25-kicker"><i/> AUDIXO / FAST FACTS</div><h2>Small steps. <em>Big sound.</em></h2><p>Your tools at a glance. Choose what you want to make and start with one click.</p></header>
  <div className="ax39-metric-grid">
   <Link to="/tools/youtube-to-mp3" className="ax39-metric-card mp3"><span>01 / AUDIO</span><strong>320 <small>kbps</small></strong><p>MP3 download · fixed encoding target</p><b>Open converter ↗</b></Link>
   <Link to="/tools/youtube-to-mp3" className="ax39-metric-card mp4"><span>02 / VIDEO</span><strong key={current} className="ax39-stat-bounce">{resolutions[current]}{resolutions[current]==='1080p'&&<sup>HD</sup>}{resolutions[current]==='1440p'&&<sup>QHD</sup>}</strong><p>MP4 · source-dependent quality</p><b>Open converter ↗</b></Link>
   <Link to="/tools/vocals" className="ax39-metric-card stems"><span>03 / SEPARATE</span><strong>5 <small>stems</small></strong><p>Vocals · music · drums · bass · other</p><b>Explore stems ↗</b></Link>
   <Link to="/editor" className="ax39-metric-card effects"><span>04 / CREATE</span><strong>{soundPresets.length+soundBank.length}<small>+</small></strong><p>Audio presets and beat layers</p><b>Open studio ↗</b></Link>
  </div>
  <p className="ax39-metrics-foot">* Available MP4 resolutions depend on the selected source and REST YTDL API response. The sequence above illustrates supported interface choices, not a promise for every video.</p>
 </section>
}
