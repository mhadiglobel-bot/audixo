import {Link} from 'react-router-dom'
import {useEffect,useRef,useState,type CSSProperties} from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'

const featureGroups=[
 {n:'01',tag:'EDIT',title:'See the source while you shape it.',body:'Trim precise ranges while the full recording remains visible. Keep the original for confident editing.',points:['Large trim handles','Exact time fields','Remove or keep the middle'],link:'/tools/trim-audio',cta:'Open Trim Audio'},
 {n:'02',tag:'SOUND',title:'Presets that explain themselves.',body:'Choose a sound, inspect its controls and apply it only when it feels right.',points:['Independent echo and reverb','Only relevant controls','Undo or remove an edit'],link:'/editor',cta:'Explore Studio presets'},
 {n:'03',tag:'LAYERS',title:'Separate the source into stems.',body:'When separation succeeds, play vocals, music, drums, bass and other sources independently.',points:['Five named stems','Mute, solo and volume','Export individual parts'],link:'/tools/vocals',cta:'Open Vocal Extractor'},
 {n:'04',tag:'LIBRARY',title:'Finish it now. Find it again.',body:'Keep your exports available on this device without forcing a new account.',points:['Local saved recordings','Preview before download','Reopen in the editor'],link:'/library',cta:'Open Local Library'},
] as const


const focusedTools=[
 {name:'Trim Audio',url:'/tools/trim-audio',tag:'PRECISION EDIT',description:'Trim the beginning, ending or exact middle section.',symbol:'↔'},
 {name:'Echo & Delay',url:'/tools/echo',tag:'REFLECTION DESIGN',description:'Build repeating depth with timing and feedback.',symbol:'◉'},
 {name:'Slowed + Reverb',url:'/tools/slowed-reverb',tag:'ATMOSPHERE',description:'Slow the pace and add a controlled room tail.',symbol:'◌'},
 {name:'Pitch Editor',url:'/tools/pitch',tag:'TONAL SHAPING',description:'Shift the tone and preview before exporting.',symbol:'♫'},
 {name:'Spatial Motion',url:'/tools/spatial-motion',tag:'STEREO ORBIT',description:'Move sound through headphone-focused space.',symbol:'◎'},
 {name:'Vocal Extractor',url:'/tools/vocals',tag:'STEM SEPARATION',description:'Inspect vocals, drums, bass and music layers.',symbol:'☷'},
 {name:'Mashup Editor',url:'/tools/mashup',tag:'ARRANGEMENT',description:'Arrange and layer audio clips.',symbol:'▤'},
 {name:'Audio Recorder',url:'/tools/recorder',tag:'CAPTURE',description:'Record and refine a voice take.',symbol:'◉'},
 {name:'Local Library',url:'/library',tag:'SAVED SOUNDS',description:'Find and reuse finished audio.',symbol:'♫'},
] as const

function FeatureVisual({kind}:{kind:string}){
 return <div className={`ax44-feature-preview is-${kind.toLowerCase()}`} aria-label={`${kind.toLowerCase()} interface illustration`}>
  <header><div><i/><i/><i/></div><span>AUDIXO / {kind}</span></header>
  {kind==='EDIT'&&<div className="ax44-feature-trim">
   <div className="ax44-feature-ruler"><span>00:00</span><span>00:15</span><span>00:30</span></div>
   <div className="ax44-feature-wave">{Array.from({length:44},(_,i)=><i key={i} style={{height:`${20+(i*37%71)}%`} as CSSProperties}/>)}<div className="ax44-feature-selection"/></div>
   <div className="ax44-feature-caption"><span>ORIGINAL WAVEFORM</span><strong>Trim: 00:08 — 00:22</strong></div>
  </div>}
  {kind==='SOUND'&&<div className="ax44-feature-preset">
   <div className="ax44-feature-preset-name"><span>✦</span><div><small>SELECTED PRESET</small><strong>Echo Vocal</strong></div><b>Preview</b></div>
   {['Echo delay','Feedback','Wet mix'].map((name,i)=><div className="ax44-feature-setting" key={name}><span>{name}</span><div><i style={{width:`${[54,31,66][i]}%`}}/></div><b>{['260 ms','25%','22%'][i]}</b></div>)}
  </div>}
  {kind==='LAYERS'&&<div className="ax44-feature-stems">
   {['Vocals','Music','Drums','Bass','Other'].map((name,i)=><div key={name} className="ax44-feature-stem"><span>{String(i+1).padStart(2,'0')}</span><strong>{name}</strong><div>{Array.from({length:20},(_,j)=><i key={j} style={{height:`${14+(i*11+j*19)%73}%`} as CSSProperties}/>)}</div></div>)}
  </div>}
  {kind==='LIBRARY'&&<div className="ax44-feature-library">
   {['Original recording.wav','Session mix.mp3','Studio export.wav'].map((name,i)=><div key={name}><span>{i===1?'♫':'▤'}</span><div><strong>{name}</strong><small>{i===0?'Source audio':i===1?'Processed audio':'Finished mix'}</small></div><b>↗</b></div>)}
  </div>}
  <footer><small>WORKSPACE PREVIEW</small><span>CREATOR-FIRST DESIGN</span></footer>
 </div>
}

export default function Features(){
 const toolsRef=useRef<HTMLDivElement|null>(null)
 const [toolsRevealed,setToolsRevealed]=useState(false)
 const [activeTool,setActiveTool]=useState(0)
 useEffect(()=>{const node=toolsRef.current;if(!node)return;if(!('IntersectionObserver' in window)){setToolsRevealed(true);return}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setToolsRevealed(true);observer.disconnect()}},{threshold:.12});observer.observe(node);return()=>observer.disconnect()},[])
 useEffect(()=>{if(!toolsRevealed||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=window.setInterval(()=>setActiveTool(v=>(v+1)%focusedTools.length),1900);return()=>window.clearInterval(timer)},[toolsRevealed])
 return <SiteShell><Seo title="AUDIXO Features — Trim, Stems, Echo, Mixing & Export" description="Explore real Audixo tools for trimming audio, adding echo effects, separating supported stems, and exporting edits from the browser." path="/features"/>
 <main className="ax25-features ax27-features ax44-features">
  <section className="page-shell ax25-page-hero ax44-features-hero"><div className="ax25-kicker"><i/> FEATURES / PURPOSEFUL TOOLS</div><h1>Power where it matters.<br/><em>Clarity everywhere else.</em></h1><p>Four clear workflows in one browser studio. No cluttered control panels.</p></section>
  <section className="page-shell ax44-feature-showcase">
   {featureGroups.map((f,index)=><article key={f.n} className={`ax44-feature-row ${index%2?'reverse':''}`}>
    <div className="ax44-feature-copy"><span>{f.n} / {f.tag}</span><h2>{f.title}</h2><p>{f.body}</p><ul>{f.points.map(point=><li key={point}>{point}</li>)}</ul><Link to={f.link}>{f.cta} <span aria-hidden="true">↗</span></Link></div>
    <FeatureVisual kind={f.tag}/>
   </article>)}
  </section>
  <section className="page-shell ax44-feature-tools"><header><div className="ax25-kicker"><i/> FOCUSED TOOLS</div><h2>Every tool. <em>One creative flow.</em></h2><p>Go directly to a tool without sorting through a giant settings panel.</p></header>
   <div ref={toolsRef} className={'ax75-tool-orbit '+(toolsRevealed?'is-visible':'')} aria-label="Nine Audixo tools connected in one creative flow">
    <svg className="ax75-tool-connections" viewBox="0 0 900 900" aria-hidden="true" focusable="false">
     <defs><linearGradient id="ax75-tool-neon" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="900" y2="900"><stop offset="0" stopColor="#16e7a9"/><stop offset=".32" stopColor="#10d8ef"/><stop offset=".68" stopColor="#8f4eff"/><stop offset="1" stopColor="#f43ed2"/></linearGradient></defs>
     {focusedTools.slice(0,-1).map((tool,i)=>{
      const from={x:150+(i%3)*300,y:150+Math.floor(i/3)*300}
      const to={x:150+((i+1)%3)*300,y:150+Math.floor((i+1)/3)*300}
      return i<activeTool?<path key={tool.url} d={'M '+from.x+' '+from.y+' L '+to.x+' '+to.y} pathLength="100" className="ax75-tool-connector" stroke="url(#ax75-tool-neon)"/>:null
     })}
    </svg>
    {focusedTools.map((tool,i)=><Link to={tool.url} key={tool.url}
     className={'ax75-tool-circle '+(i===activeTool?'is-active ':i<activeTool?'is-complete ':'')}
     aria-label={'Open '+tool.name}
     style={{left:((i%3)*300+150)/9+'%',top:((Math.floor(i/3))*300+150)/9+'%'} as CSSProperties}
     onMouseEnter={()=>setActiveTool(i)} onFocus={()=>setActiveTool(i)}>
      <span className="ax75-tool-number">{String(i+1).padStart(2,'0')}</span>
      <span className="ax75-tool-symbol" aria-hidden="true">{tool.symbol}</span>
      <strong>{tool.name}</strong>
      <small>{tool.description}</small>
     </Link>)}
   </div>
  </section>
 </main></SiteShell>}
