import {useEffect,useState,type CSSProperties} from 'react'
import {Link} from 'react-router-dom'

type SceneKind='import'|'trim'|'select'|'stems'|'pitch'|'speed'|'echo'|'motion'|'mashup'|'presets'|'library'|'export'
type Scene={id:SceneKind;name:string;label:string;description:string;link:string;action:string}
const scenes:Scene[]=[
 {id:'import',name:'Import',label:'Bring in the original',description:'Your source lands in the workspace ready to edit.',link:'/editor',action:'Open Studio'},
 {id:'trim',name:'Trim',label:'Make the precise cut',description:'Move both trim handles while the original waveform remains visible.',link:'/tools/trim-audio',action:'Try Trim Audio'},
 {id:'select',name:'Select',label:'Focus on one moment',description:'Choose a range before you apply or remove a change.',link:'/editor',action:'Open Timeline'},
 {id:'stems',name:'Stems',label:'Separate the layers',description:'Preview independent vocal, music, drum, bass and other lanes.',link:'/tools/vocals',action:'Explore Stems'},
 {id:'pitch',name:'Pitch',label:'Shift the tone',description:'Move notes up or down and preview the change.',link:'/tools/pitch',action:'Pitch Editor'},
 {id:'speed',name:'Speed',label:'Find the perfect pace',description:'Adjust the playback rate smoothly without losing control of the edit.',link:'/tools/slowed-reverb',action:'Speed & Reverb'},
 {id:'echo',name:'Echo',label:'Build repeating depth',description:'Set delay, reflection and feedback independently of reverb.',link:'/tools/echo',action:'Echo Editor'},
 {id:'motion',name:'Motion',label:'Move sound in space',description:'Orbit the stereo field with depth and controlled motion.',link:'/tools/spatial-motion',action:'Spatial Audio'},
 {id:'mashup',name:'Mashup',label:'Arrange your mix',description:'Move sections and layer multiple clips on a single timeline.',link:'/tools/mashup',action:'Mashup Editor'},
 {id:'presets',name:'Presets',label:'Shape your sound',description:'Preview a curated effect, then keep or remove it.',link:'/editor',action:'Browse Presets'},
 {id:'library',name:'Library',label:'Keep your takes close',description:'Save locally and reopen the tracks you want to revisit.',link:'/library',action:'Open Library'},
 {id:'export',name:'Export',label:'Take your sound with you',description:'Preview and render your final MP3 or WAV file.',link:'/editor',action:'Open Studio'},
]
const waves=Array.from({length:51},(_,i)=>({height:`${20+((i*31+i*i*9)%72)}%`,delay:`${(i%8)*-.13}s`}))
const stems=['VOCALS','MUSIC','DRUMS','BASS','OTHER']
const tools=['CLIP A','CLIP B','BEAT BED']

function Waveform({className=''}:{className?:string}){return <div className={`ax46-wave ${className}`} aria-hidden="true">{waves.map((bar,i)=><i key={i} style={{'--bar-height':bar.height,'--bar-delay':bar.delay} as CSSProperties}/>)}</div>}

function SceneDemo({id}:{id:SceneKind}){
 switch(id){
  case 'import':return <div className="ax46-scene ax46-scene-import"><div className="ax46-file-float"><span>♫</span><strong>your_audio.wav</strong><small>Original recording</small></div><div className="ax46-upload-target"><div>↓</div><b>DRAG INTO STUDIO</b><span><i/></span></div></div>
  case 'trim':return <div className="ax46-scene ax46-scene-trim"><div className="ax46-scene-ruler"><span>00:00</span><span>00:15</span><span>00:30</span><span>00:45</span></div><Waveform/><div className="ax46-trim-window"><i/><i/></div><div className="ax46-demo-caption">TRIM · START AND END HANDLES</div></div>
  case 'select':return <div className="ax46-scene ax46-scene-select"><div className="ax46-scene-ruler"><span>00:00</span><span>00:15</span><span>00:30</span></div><Waveform/><div className="ax46-select-window"/><div className="ax46-demo-caption">SELECT A PHRASE · KEEP THE ORIGINAL</div></div>
  case 'stems':return <div className="ax46-scene ax46-scene-stems">{stems.map((stem,i)=><div className="ax46-stem-lane" key={stem}><span>{stem}</span><div className="ax46-stem-wave">{Array.from({length:21},(_,j)=><i key={j} style={{height:`${19+(i*19+j*17)%74}%`,'--bar-delay':`${((i+j)%7)*-.2}s`} as CSSProperties}/>)}</div><b>↗</b></div>)}</div>
  case 'pitch':return <div className="ax46-scene ax46-scene-pitch"><span className="ax46-scene-overline">PITCH CONTROL</span><div className="ax46-pitch-wheel"><div><b>+3</b><small>SEMITONES</small></div></div><div className="ax46-pitch-notes"><span>LOW</span><i/><i/><i/><i/><i/><i/><span>HIGH</span></div></div>
  case 'speed':return <div className="ax46-scene ax46-scene-speed"><span className="ax46-scene-overline">SPEED CONTROL</span><div className="ax46-speed-readout">1.00<small>×</small></div><div className="ax46-speed-line"><i/></div><div className="ax46-speed-options"><span>0.75×</span><span>1.00×</span><span>1.25×</span><span>1.50×</span></div></div>
  case 'echo':return <div className="ax46-scene ax46-scene-echo"><div className="ax46-echo-orb"><i/><i/><i/><b>♫</b></div><div className="ax46-echo-sliders"><span><b>DELAY</b><i/></span><span><b>FEEDBACK</b><i/></span><span><b>WET</b><i/></span></div></div>
  case 'motion':return <div className="ax46-scene ax46-scene-motion"><div className="ax46-motion-orbit"><i/><i/><b>♫</b><span/></div><div className="ax46-demo-caption">STEREO ORBIT · 8D / 16D</div></div>
  case 'mashup':return <div className="ax46-scene ax46-scene-mashup">{tools.map((tool,i)=><div className="ax46-mashup-track" key={tool}><span>{tool}</span><div><i style={{'--track-index':i} as CSSProperties}/><i/></div></div>)}</div>
  case 'presets':return <div className="ax46-scene ax46-scene-presets"><div className="ax46-preset-title"><span>✦</span><div><b>NEON AIR</b><small>PRESET PREVIEW</small></div><i>✓</i></div>{['SPACE','TONE','ECHO'].map((label,i)=><div className="ax46-preset-control" key={label}><span>{label}</span><div><i style={{'--preset-index':i} as CSSProperties}/></div></div>)}</div>
  case 'library':return <div className="ax46-scene ax46-scene-library">{['Source.wav','Verse Edit.mp3','Final Mix.wav'].map((name,i)=><div key={name}><span>♫</span><strong>{name}</strong><small>{i===0?'ORIGINAL':i===1?'WORKING':'EXPORTED'}</small><b>↗</b></div>)}</div>
  case 'export':return <div className="ax46-scene ax46-scene-export"><div className="ax46-export-disc">↓</div><div className="ax46-export-header"><b>Final Mix.mp3</b><small>MP3 / WAV</small></div><div className="ax46-export-bar"><i/></div><span>PREPARING YOUR SOUND</span></div>
 }
}

export default function WorkflowCinema(){
 const [step,setStep]=useState(0)
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const id=window.setInterval(()=>setStep(n=>(n+1)%scenes.length),6200)
  return()=>window.clearInterval(id)
 },[])
 const current=scenes[step]
 return <section className="ax46-workflow" aria-label="Animated Audixo workflow">
  <div className="ax46-workflow-sidebar"><span className="ax46-eyebrow">HOW AUDIXO MOVES</span><h2>Every step.<br/><em>One workspace.</em></h2><p>See how your audio goes from raw recording to finished track.</p>
   <div className="ax46-workflow-list" role="group" aria-label="Editing stages">{scenes.map((scene,i)=><button key={scene.id} type="button" aria-pressed={step===i} className={step===i?'active':''} onClick={()=>setStep(i)}><span className="ax46-step-number">{String(i+1).padStart(2,'0')}</span><span className="ax46-step-text"><strong>{scene.name}</strong><small>{scene.label}</small></span><span className="ax46-step-chevron">↗</span></button>)}</div>
  </div>
  <div className="ax46-workflow-stage"><header><div><i/> AUDIXO / LIVE WORKFLOW</div><span>{String(step+1).padStart(2,'0')} / {String(scenes.length).padStart(2,'0')}</span></header>
   <div className="ax46-workflow-screen"><div className="ax46-screen-top"><div><span/><span/><span/></div><strong>{current.name.toUpperCase()} / STUDIO VIEW</strong><small>LIVE PREVIEW</small></div><SceneDemo key={current.id} id={current.id}/></div>
   <div className="ax46-stage-info" key={`info-${current.id}`}><span>STAGE {String(step+1).padStart(2,'0')}</span><h3>{current.label}</h3><p>{current.description}</p><Link to={current.link}>{current.action} ↗</Link></div>
   <div className="ax46-workflow-progress" aria-hidden="true"><span key={current.id}/></div>
   <footer><small>Import</small><small>Edit</small><small>Preview</small><small>Export</small></footer>
  </div>
 </section>
}
