import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import type {CSSProperties} from 'react'

const scenes=[
 {name:'Import',label:'Load the source',detail:'Bring your own recording into the studio. Source audio stays intact.',action:'Import audio',link:'/editor'},
 {name:'Trim',label:'Make the cut',detail:'Move in/out edges with the full waveform as reference.',action:'Trim a track',link:'/tools/trim-audio'},
 {name:'Stems',label:'Separate the layers',detail:'Work with vocals, music, drums, bass and other stems.',action:'Explore stems',link:'/tools/vocals'},
 {name:'Effects',label:'Shape the character',detail:'Control echo, delay and tone without overwhelming the workspace.',action:'Open effects',link:'/tools/echo'},
 {name:'Motion',label:'Move through space',detail:'Set controlled stereo movement, depth and orbit.',action:'Spatial editor',link:'/tools/spatial-motion'},
 {name:'Mix',label:'Build the arrangement',detail:'Align, move and balance sections on the same timeline.',action:'Build mashup',link:'/tools/mashup'},
 {name:'Export',label:'Finish with control',detail:'Preview the result and choose an export format before saving.',action:'Open studio',link:'/editor'},
]
export default function WorkflowCinema(){
 const [step,setStep]=useState(0)
 const [playing,setPlaying]=useState(true)
 const [reduced,setReduced]=useState(false)
 useEffect(()=>setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches),[])
 useEffect(()=>{
  if(!playing||reduced)return
  const id=window.setInterval(()=>setStep(n=>(n+1)%scenes.length),5600)
  return()=>window.clearInterval(id)
 },[playing,reduced])
 const current=scenes[step]
 return <section className="ax44-workflow" aria-label="How Audixo works">
  <div className="ax44-workflow-copy">
   <small>HOW AUDIXO MOVES</small><h2>Every step.<br/><em>One workspace.</em></h2>
   <p>See the workflow before you start. Focus on the audio—not decorative controls.</p>
   <div className="ax44-workflow-steps" role="group" aria-label="Explore audio-editing steps">
    {scenes.map((scene,i)=><button key={scene.name} className={step===i?'active':''} type="button" aria-pressed={step===i} onClick={()=>{setStep(i);setPlaying(false)}}><span>{String(i+1).padStart(2,'0')}</span><strong>{scene.name}</strong><span className="ax44-workflow-step-note">{scene.label}</span></button>)}
   </div>
  </div>
  <div className="ax44-workflow-stage">
   <header><div><i/> AUDIXO / STUDIO WALKTHROUGH</div><span>{String(step+1).padStart(2,'0')} / {String(scenes.length).padStart(2,'0')}</span></header>
   <div className="ax44-workflow-player">
    <button type="button" className="ax44-workflow-play" onClick={()=>setPlaying(v=>!v)} aria-label={playing?'Pause walkthrough':'Play walkthrough'}>{playing?'Ⅱ':'▶'}</button>
    <div><strong>{current.name.toUpperCase()}</strong><small>Interactive preview · no audio played</small></div>
    <span>00:{String(step*8).padStart(2,'0')} / 00:56</span>
   </div>
   <div className="ax44-workflow-timeline" aria-label={`${current.name}: audio workflow preview`}>
    <div className="ax44-workflow-ruler"><span>00:00</span><span>00:14</span><span>00:28</span><span>00:42</span><span>00:56</span></div>
    <div className="ax44-workflow-wave" style={{'--scene-offset':`${10+step*10}%`} as CSSProperties}>
      {Array.from({length:68},(_,i)=><i key={i} style={{'--wave-h':`${17+((i*29+i*i*7)%75)}%`,'--i':i} as CSSProperties}/>)}
      <div className="ax44-workflow-active" aria-hidden="true"/>
      <div className="ax44-workflow-playhead" aria-hidden="true"/>
    </div>
   </div>
   <div className="ax44-workflow-detail" key={step}>
    <div><span>STAGE {String(step+1).padStart(2,'0')}</span><h3>{current.label}</h3><p>{current.detail}</p></div>
    <Link to={current.link}>{current.action} <span aria-hidden="true">↗</span></Link>
   </div>
   <footer><span>Original source visible</span><span>Adjust → Preview → Export</span></footer>
  </div>
 </section>
}
