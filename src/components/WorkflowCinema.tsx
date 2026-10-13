import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import type {CSSProperties} from 'react'

type Scene={name:string;label:string;detail:string;action:string;link:string;token:string;color:string}

const scenes:Scene[]=[
 {name:'Import',label:'Load the source',detail:'Bring your recording, reopen a Library file or start from a local media source without losing the original context.',action:'Import audio',link:'/editor',token:'DEVICE / LIBRARY / MIC',color:'#20d9a5'},
 {name:'Trim',label:'Make the cut',detail:'Move precise in and out points while the complete waveform stays visible behind the active edit range.',action:'Trim a track',link:'/tools/trim-audio',token:'EDGE CONTROL',color:'#18cfe0'},
 {name:'Select',label:'Focus the moment',detail:'Mark the exact phrase you want to keep, remove, repeat, isolate or process before changing anything else.',action:'Select a range',link:'/editor',token:'RANGE PICK',color:'#6b86f0'},
 {name:'Stems',label:'Separate the layers',detail:'Work with vocals, music, drums, bass and other returned stem groups as their own controllable lanes.',action:'Explore stems',link:'/tools/vocals',token:'VOCAL SPLIT',color:'#8e67e9'},
 {name:'Pitch',label:'Move the tone',detail:'Shift tone deeper or brighter in semitone steps and preview the tonal change before you commit.',action:'Open pitch',link:'/tools/pitch',token:'SEMITONE MOVE',color:'#a468eb'},
 {name:'Echo',label:'Build the space',detail:'Shape echo timing, wet mix and feedback independently, then add reverb only when the track needs it.',action:'Open echo',link:'/tools/echo',token:'SPACE DESIGN',color:'#db64dc'},
 {name:'Motion',label:'Move through space',detail:'Place audio in 8D or 16D movement with depth and orbit control for headphones-first motion design.',action:'Spatial editor',link:'/tools/spatial-motion',token:'8D / 16D',color:'#f55bc8'},
 {name:'Mashup',label:'Build the arrangement',detail:'Split sections at the playhead, move them in time and shape each clip independently inside the same project.',action:'Build mashup',link:'/tools/mashup',token:'SECTION STACK',color:'#27d2da'},
 {name:'Presets',label:'Apply only what you need',detail:'Open a preset, inspect its exact controls and keep every sound treatment removable or editable later.',action:'Preview presets',link:'/editor',token:'CURATED FX',color:'#25d58e'},
 {name:'Library',label:'Keep it on this device',detail:'Save finished takes locally so you can reopen them without creating an account or repeating the workflow.',action:'Open library',link:'/library',token:'LOCAL KEEP',color:'#22c1ff'},
 {name:'Export',label:'Finish with control',detail:'Preview the final sound, choose MP3 or WAV and download the result once the timeline feels right.',action:'Export from studio',link:'/editor',token:'FINAL OUTPUT',color:'#8f63ea'},
]

export default function WorkflowCinema(){
 const [step,setStep]=useState(0)
 const [playing,setPlaying]=useState(true)
 const [reduced,setReduced]=useState(false)
 useEffect(()=>setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches),[])
 useEffect(()=>{
  if(!playing||reduced)return
  const id=window.setInterval(()=>setStep(n=>(n+1)%scenes.length),4800)
  return()=>window.clearInterval(id)
 },[playing,reduced])
 const current=scenes[step]
 const activeProgress=((step+1)/scenes.length)*100
 const waveBars=useMemo(()=>Array.from({length:84},(_,i)=>({
  h:`${18+((i*17+i*i*5)%74)}%`,
  delay:`${(i%9)*.08}s`
 })),[])
 return <section className="ax44-workflow" aria-label="How Audixo works">
  <div className="ax44-workflow-copy">
   <small>HOW AUDIXO MOVES</small><h2>Every step.<br/><em>One workspace.</em></h2>
   <p>See the workflow before you start. Smooth looped motion, a visible timeline and focused stages instead of decorative filler.</p>
   <div className="ax44-workflow-steps" role="group" aria-label="Explore audio-editing steps">
    {scenes.map((scene,i)=><button key={scene.name} className={step===i?'active':''} type="button" aria-pressed={step===i} onClick={()=>{setStep(i);setPlaying(false)}}><span>{String(i+1).padStart(2,'0')}</span><strong>{scene.name}</strong><span className="ax44-workflow-step-note">{scene.label}</span></button>)}
   </div>
  </div>
  <div className="ax44-workflow-stage">
   <header><div><i/> AUDIXO / STUDIO WALKTHROUGH</div><span>{String(step+1).padStart(2,'0')} / {String(scenes.length).padStart(2,'0')}</span></header>
   <div className="ax44-workflow-player">
    <button type="button" className="ax44-workflow-play" onClick={()=>setPlaying(v=>!v)} aria-label={playing?'Pause walkthrough':'Play walkthrough'}>{playing?'Ⅱ':'▶'}</button>
    <div><strong>{current.name.toUpperCase()}</strong><small>{current.token} · smooth preview · no audio played</small></div>
    <span>00:{String(step*5).padStart(2,'0')} / 00:55</span>
   </div>
   <div className="ax44-workflow-timeline" aria-label={`${current.name}: audio workflow preview`}>
    <div className="ax44-workflow-ruler"><span>00:00</span><span>00:14</span><span>00:28</span><span>00:42</span><span>00:55</span></div>
    <div className="ax44-workflow-hero-line" style={{'--workflow-progress':`${activeProgress}%`} as CSSProperties} aria-hidden="true"><i/></div>
    <div className="ax44-workflow-wave" style={{'--scene-offset':`${8+step*8.3}%`,'--scene-color':current.color} as CSSProperties}>
      {waveBars.map((item,i)=><i key={i} style={{'--wave-h':item.h,'--wave-delay':item.delay,'--i':i} as CSSProperties}/>)}
      <div className="ax44-workflow-active" aria-hidden="true"/>
      <div className="ax44-workflow-playhead" aria-hidden="true"/>
    </div>
    <div className="ax44-workflow-tracklist" aria-hidden="true">
      {['SOURCE','EDIT','FX','STEMS','EXPORT'].map((lane,i)=><span key={lane} className={i===step%5?'active':''}>{lane}</span>)}
    </div>
   </div>
   <div className="ax44-workflow-detail" key={step}>
    <div><span>STAGE {String(step+1).padStart(2,'0')}</span><h3>{current.label}</h3><p>{current.detail}</p></div>
    <Link to={current.link}>{current.action} <span aria-hidden="true">↗</span></Link>
   </div>
   <footer><span>Original source visible</span><span>Import → Edit → Shape → Keep</span></footer>
  </div>
 </section>
}
