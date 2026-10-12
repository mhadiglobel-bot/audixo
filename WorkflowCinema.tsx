import { useEffect,useState } from 'react'
import type { CSSProperties } from 'react'

const scenes=[
 {name:'Import',note:'Bring in a recording',mode:'import'},
 {name:'Trim',note:'Shape the clean edges',mode:'trim'},
 {name:'Select',note:'Mark the exact phrase',mode:'select'},
 {name:'Layer',note:'Open vocals and stems',mode:'layers'},
 {name:'Pitch',note:'Move the tone deliberately',mode:'pitch'},
 {name:'Lo-fi',note:'Shape warmth and texture',mode:'lofi'},
 {name:'Space',note:'Add echo and reverb',mode:'space'},
 {name:'Motion',note:'Move the stereo field',mode:'motion'},
 {name:'Mashup',note:'Stack and crossfade layers',mode:'mashup'},
 {name:'Shape',note:'Tune the final feel',mode:'fx'},
 {name:'Export',note:'Keep the finished take',mode:'export'},
]

function Bars({count=62}:{count?:number}){return <div className="ax26-flow-wave">{Array.from({length:count},(_,i)=><i key={i} style={{'--h':`${18+((i*31)%70)}%`,'--i':i} as CSSProperties}/>)}</div>}
function Timeline({select=false}:{select?:boolean}){return <div className={`ax28-flow-timeline ${select?'select':''}`}><div className="ax28-flow-ruler"><span>00:00</span><span>00:15</span><span>00:30</span><span>00:45</span><span>01:00</span></div><div className="ax28-flow-source"><Bars count={74}/><span>ORIGINAL SOURCE</span></div>{select?<div className="ax28-flow-selection"><b>KEEP THIS RANGE</b></div>:<><div className="ax28-flow-dim left"/><div className="ax28-flow-dim right"/><i className="ax28-flow-handle start"/><i className="ax28-flow-handle end"/></>}<i className="ax28-flow-playhead"/></div>}
function MiniTransport({step}:{step:number}){return <div className="ax29-stage-transport"><button aria-hidden="true">▶</button><div>{Array.from({length:34},(_,i)=><i key={i} style={{'--h':`${18+((i*23+step*7)%70)}%`,'--i':i} as CSSProperties}/>)}</div><span>00:{String(step*7).padStart(2,'0')} / 01:30</span></div>}
function StageVisual({mode}:{mode:string}){
 if(mode==='import')return <div className="ax28-flow-import"><div className="ax28-file-chip"><span>MP3</span><strong>MY SONG</strong><small>dragged from device</small></div><div className="ax28-flight"><i/><i/><i/></div><div className="ax28-import-zone"><b>+</b><strong>Importing audio</strong><small>decode - waveform - ready</small><em><i/></em></div></div>
 if(mode==='trim')return <Timeline/>
 if(mode==='select')return <Timeline select/>
 if(mode==='layers')return <div className="ax28-layer-stack">{['LYRICS / VOCALS','MUSIC','DRUMS','BASS','OTHER'].map((x,i)=><div key={x} style={{'--i':i} as CSSProperties}><span>{x}</span><Bars count={48}/><b/></div>)}</div>
 if(mode==='pitch')return <div className="ax28-pitch-stage"><div className="ax28-pitch-dial"><b>0</b><small>SEMITONES</small><i/></div><div className="ax28-pitch-line"><span>-12</span><i><b/></i><span>+12</span></div><strong>Deep to Natural to Bright</strong></div>
 if(mode==='lofi')return <div className="ax28-lofi-stage"><div className="ax28-lofi-bars">{Array.from({length:11},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}/>)}</div><div className="ax28-eq-stage"><label><span>LOW</span><i><b/></i></label><label><span>MID</span><i><b/></i></label><label><span>HIGH</span><i><b/></i></label></div><strong>Warmth - texture - air</strong></div>
 if(mode==='space')return <div className="ax28-space-stage"><div className="ax28-space-core">AUDIO</div>{Array.from({length:4},(_,i)=><i key={i}/>) }<div className="ax28-space-sliders"><label>ECHO<b><i/></b></label><label>REVERB<b><i/></b></label><label>FEEDBACK<b><i/></b></label></div></div>
 if(mode==='motion')return <div className="ax28-motion-stage"><div className="ax28-motion-head">L</div><div className="ax28-motion-orbit"><i/><i/><b>AU</b></div><div className="ax28-motion-head">R</div><div className="ax28-motion-meter"><span>DEPTH</span><i><b/></i><span>ORBIT</span><i><b/></i></div></div>
 if(mode==='mashup')return <div className="ax28-mashup-stage"><div className="ax28-mashup-mini-ruler"><span>00:00</span><span>00:30</span><span>01:00</span></div>{['SONG A','SONG B','MUSIC BED'].map((x,i)=><div className="ax28-mashup-mini-lane" key={x}><span>{x}</span><i style={{'--w':`${64-i*8}%`,'--l':`${i*14}%`,'--i':i} as CSSProperties}><b/><b/></i></div>)}<strong>Trim - place - crossfade - mix</strong></div>
 if(mode==='fx')return <div className="ax28-fx-stage"><div><span>SPACE</span><i><b/></i></div><div><span>TONE</span><i><b/></i></div><div><span>MOTION</span><i><b/></i></div><div className="ax30-reverse-control"><span>REVERSE</span><i><b/></i></div><strong>Shape, reverse or move only the active section.</strong></div>
 return <div className="ax28-export-stage"><div className="ax28-export-disc">AU</div><div><small>EXPORT READY</small><strong>audixo-final.mp3</strong><p>320 kbps - MP3</p><div className="ax28-export-progress"><i/></div></div><b>DOWNLOAD</b></div>
}

export default function WorkflowCinema(){
 const [step,setStep]=useState(0)
 useEffect(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=window.setInterval(()=>setStep(s=>(s+1)%scenes.length),4800);return()=>window.clearInterval(t)},[])
 const scene=scenes[step]
 return <section className="ax26-cinema ax27-cinema ax28-cinema">
  <div className="ax26-cinema-copy"><small>HOW AUDIXO MOVES</small><h2>See every step.<br/><em>Before you touch it.</em></h2><p>Every stage animates the actual job: import, trim, select, layers, pitch, lo-fi, space, motion, mashup, shape and export.</p><div className="ax26-scene-list ax27-scene-list ax28-scene-list">{scenes.map((s,i)=><button key={s.name} onClick={()=>setStep(i)} className={i===step?'active':''}><b>{String(i+1).padStart(2,'0')}</b><span><strong>{s.name}</strong><small>{s.note}</small></span></button>)}</div></div>
  <div className={`ax26-cinema-stage ax27-cinema-stage ax28-cinema-stage ax29-cinema-stage mode-${scene.mode}`} aria-live="polite"><header><span>AUDIXO / LIVE WORKFLOW</span><b>{String(step+1).padStart(2,'0')} - {scene.name.toUpperCase()}</b></header><MiniTransport step={step}/><div className="ax29-stage-body" key={scene.mode}><StageVisual mode={scene.mode}/></div><footer><span>{scene.note}</span><div>{scenes.map((_,i)=><i key={i} className={i===step?'active':''}/>)}</div></footer></div>
 </section>
}
