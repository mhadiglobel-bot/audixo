import {Link} from 'react-router-dom'
import {useEffect,useRef,useState,type CSSProperties} from 'react'
import Seo from '../components/Seo'
import ToolGlyph from '../components/ToolGlyph'
import Icon from '../editor/Icons'
import SiteShell from '../components/SiteShell'
import {useNeonJourney} from '../hooks/useNeonJourney'

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
 {name:'Audio Recorder',url:'/tools/recorder',tag:'LOCAL RECORDING',description:'Capture a take and add it to Studio.',symbol:'◉'},
 {name:'Sound Playground',url:'/#audixo-playground',tag:'LIVE DEMOS',description:'Explore the rotating sound gallery and test live effects.',symbol:'∿'},
 {name:'Local Library',url:'/library',tag:'SAVED SOUNDS',description:'Find and reuse finished audio.',symbol:'♫'},
] as const


// Three rows of three. Every connector is a single consistent neon tone.
const TOOL_ICON_IDS=['quick-trim','echo','slowed-reverb','pitch','spatial','vocals','recorder','playground','library'] as const
const TOOL_COLORS=['#13e2a7','#16d9ed','#9855fa','#f23acd'] as const
const TOOL_POINTS=focusedTools.map((_,i)=>({x:150+(i%3)*300,y:150+Math.floor(i/3)*300}))
const TOOL_LINKS=TOOL_POINTS.slice(0,-1).map((from,index)=>{
 const to=TOOL_POINTS[index+1]
 if(index===2||index===5){
  const y=from.y
  return {index,color:TOOL_COLORS[index%4],
   d:'M 750 '+y+' C 832 '+y+' 850 '+(y+38)+' 850 '+(y+94)+
   ' C 850 '+(y+140)+' 817 '+(y+156)+' 756 '+(y+156)+
   ' L 177 '+(y+156)+' Q 150 '+(y+156)+' 150 '+(y+184)+
   ' L 150 '+(y+300)}
 }
 return {index,color:TOOL_COLORS[index%4],d:'M '+from.x+' '+from.y+' L '+to.x+' '+to.y}
})
const TOOL_RETURN='M 750 750 C 827 750 866 736 866 656 L 866 136 C 866 68 829 36 754 36 L 158 36 Q 110 36 110 90 L 110 110 Q 110 150 150 150'

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
 const {active:activeTool,phase,select:selectTool}=useNeonJourney(focusedTools.length,1650,2350)
 useEffect(()=>{const node=toolsRef.current;if(!node)return;if(!('IntersectionObserver' in window)){setToolsRevealed(true);return}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setToolsRevealed(true);observer.disconnect()}},{threshold:.12});observer.observe(node);return()=>observer.disconnect()},[])

 return <SiteShell><Seo title="AUDIXO Features — Trim, Stems, Echo, Mixing & Export" description="Explore real Audixo tools for trimming audio, adding echo effects, separating supported stems, and exporting edits from the browser." path="/features"/>
 <main className="ax25-features ax27-features ax44-features">
  <section className="page-shell ax25-page-hero ax44-features-hero"><div className="ax25-kicker"><i/> FEATURES / PURPOSEFUL TOOLS</div><h1>Power where it matters.<br/><em>Clarity everywhere else.</em></h1><p>Four clear workflows in one browser studio. No cluttered control panels.</p></section>
  <section className="page-shell ax44-feature-showcase">
   {featureGroups.map((f,index)=><article key={f.n} className={`ax44-feature-row ${index%2?'reverse':''}`}>
    <div className="ax44-feature-copy"><span>{f.n} / {f.tag}</span><h2>{f.title}</h2><p>{f.body}</p><ul>{f.points.map(point=><li key={point}>{point}</li>)}</ul><Link to={f.link}>{f.cta} <span aria-hidden="true"><Icon name="arrowUpRight" size={16}/></span></Link></div>
    <FeatureVisual kind={f.tag}/>
   </article>)}
  </section>
  <section className="page-shell ax44-feature-tools"><header><div className="ax25-kicker"><i/> FOCUSED TOOLS</div><h2>Every tool. <em>One creative flow.</em></h2><p>Go directly to a tool without sorting through a giant settings panel.</p></header>
   <div ref={toolsRef} className={'ax77-tool-orbit '+(toolsRevealed?'is-visible ':'')+(phase==='return'?'is-returning':phase==='rewind'?'is-rewinding':phase==='settle'?'is-settling':'')} aria-label="Nine AUDIXO tools connected in a continuous three-row journey">
    <svg className="ax77-tool-path" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
     {TOOL_LINKS.filter(link=>link.index<activeTool).map(link=><path
      key={link.index} className="ax77-tool-trace" d={link.d} pathLength={100} stroke={link.color}/>)}
     {(phase==='return'||phase==='rewind'||phase==='settle')&&<path className={phase==='return'?'ax77-tool-return':phase==='rewind'?'ax77-tool-return is-rewinding':'ax77-tool-return is-dissolving'}
       d={TOOL_RETURN} stroke="#19dce7" pathLength={100}/>}
    </svg>
    {focusedTools.map((tool,i)=><Link to={tool.url} key={tool.url}
     className={'ax77-tool-circle '+(i===activeTool?'is-active ':i<activeTool?'is-complete ':'')}
     aria-label={'Open '+tool.name}
     title={tool.tag+' — '+tool.description}
     style={{left:(TOOL_POINTS[i].x/9)+'%',top:(TOOL_POINTS[i].y/9)+'%'} as CSSProperties}
     onMouseEnter={()=>selectTool(i)} onFocus={()=>selectTool(i)}>
      <span className="ax77-tool-number">{String(i+1).padStart(2,'0')}</span>
      <span className="ax77-tool-icon" aria-hidden="true"><ToolGlyph id={TOOL_ICON_IDS[i]}/></span>
      <strong>{tool.name}</strong>
     </Link>)}
   </div>
  </section>
 </main></SiteShell>}
