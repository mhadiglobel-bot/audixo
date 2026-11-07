import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import Icon from '../editor/Icons'
import {NexivoMark} from '../components/BrandMarks'

const steps=[
 {number:'01',name:'Import',detail:'Bring in your own audio',icon:'upload',note:'Start with the original file intact.'},
 {number:'02',name:'Shape',detail:'Edit exactly what matters',icon:'waveform',note:'Trim, split, arrange and refine.'},
 {number:'03',name:'Listen',detail:'Preview before committing',icon:'play',note:'Hear each change as you work.'},
 {number:'04',name:'Finish',detail:'Export the sound you want',icon:'download',note:'Save MP3 or WAV locally.'}
] as const
const principles=[
 {n:'01',name:'Creator-first workflow',detail:'Reach the tools you need without hunting through dense menus. A clear starting point keeps your creative decisions moving.'},
 {n:'02',name:'Original-aware editing',detail:'Waveforms make the source and selected ranges visible together, so you understand what remains in the final export.'},
 {n:'03',name:'Controls with context',detail:'Change voice tone, bass, space or echo on the chosen material. Each applied edit stays understandable and removable.'},
 {n:'04',name:'Built for real browsers',detail:'Record, arrange, preview and export from a responsive workspace without installing a desktop audio application.'}
]
export default function AboutV92(){
 return <SiteShell>
  <Seo title="About AUDIXO — A Simpler, More Creative Audio Studio" description="Discover how free AUDIXO browser audio tools make recording, waveform editing, vocal separation, previewing and MP3/WAV export clearer for creators." path="/about"/>
  <main className="page-shell ax92-page ax92-about">
   <section className="ax92-about-hero ax92-animated-rim">
    <div className="ax92-about-hero-copy">
     <span className="ax92-eyebrow">ABOUT THE AUDIXO EXPERIENCE</span>
     <h1>Audio tools that stay<br/><span>clear while you create.</span></h1>
     <p>Not another wall of switches. AUDIXO keeps the source, your edits and the result in view—so you can record, shape and export at your own pace.</p>
     <div className="ax92-actions"><Link className="ax92-primary-link" to="/editor">Open the Studio <Icon name="arrowUpRight" size={17}/></Link><Link className="ax92-secondary-link" to="/how-it-works">See how it works <Icon name="chevronRight" size={15}/></Link></div>
    </div>
    <div className="ax92-about-visual" aria-label="AUDIXO editing workflow illustration">
     <div className="ax92-audio-orb"><img src="/audixo-official-symbol.png" alt="AUDIXO official symbol"/></div>
     <div className="ax92-visual-wave" aria-hidden="true">{Array.from({length:31},(_,i)=><i key={i} style={{height:(16+Math.abs(Math.sin(i*1.39)*66))+'%'}}/>)}</div>
     <span className="ax92-floating-chip is-first"><Icon name="waveform" size={14}/> Visual editing</span>
     <span className="ax92-floating-chip is-second"><Icon name="magic" size={14}/> Live effects</span>
     <span className="ax92-floating-chip is-third"><Icon name="download" size={14}/> MP3 · WAV</span>
    </div>
   </section>
   <section className="ax92-story">
    <div className="ax92-story-copy"><span className="ax92-eyebrow">WHY AUDIXO</span><h2>Less interface noise.<br/><span>More audible control.</span></h2><p>Traditional tools can show every setting at once. AUDIXO brings the right controls into focus, lets you preview changes and keeps the path to export clear.</p><span className="ax92-story-mark">A clear route from your first import to your final mix.</span></div>
    <div className="ax92-process" aria-label="The four-stage AUDIXO creative workflow">
     {steps.map((s,i)=><article key={s.number} className="ax92-process-card" style={{'--ax92-index':i} as React.CSSProperties}><span className="ax92-step-icon"><Icon name={s.icon} size={18}/></span><div className="ax92-step-text"><small>STEP {s.number}</small><h3>{s.name}</h3><strong>{s.detail}</strong><p>{s.note}</p></div></article>)}
    </div>
   </section>
   <section className="ax92-about-highlight ax92-animated-rim"><div className="ax92-highlight-head"><span className="ax92-eyebrow">FOCUSED CREATIVE POWER</span><h2>Power where it matters.<br/><span>Clarity everywhere else.</span></h2><p>Work with the waveform, open a dedicated effect, hear the difference and decide what to keep. Nothing important should get lost beneath a busy interface.</p></div><div className="ax92-highlight-tags"><span>Original source stays visible</span><span>Reversible applied edits</span><span>Real-time audio preview</span><span>Local export and library</span></div></section>
   <section className="ax92-principles"><header><span className="ax92-eyebrow">OUR DESIGN PRINCIPLES</span><h2>Built around your <span>creative flow.</span></h2><p>Four practical choices make the workspace feel lighter without taking away the tools you need.</p></header><div className="ax92-principle-grid">{principles.map(p=><article key={p.n} className="ax92-principle-card"><span>{p.n}</span><h3>{p.name}</h3><p>{p.detail}</p><i aria-hidden="true"/></article>)}</div></section>
   <section className="ax92-parent-card ax92-animated-rim"><div className="ax92-parent-symbol"><NexivoMark size={87}/></div><div><span className="ax92-eyebrow">THE PARENT COMPANY</span><h2>Powered by <span>Nexivo.</span></h2><p>Nexivo brings product design, research and repeatable execution together. AUDIXO is one of the digital tools built within that broader creative ecosystem.</p></div><Link to="/nexivo" className="ax92-secondary-link">Meet Nexivo <Icon name="arrowUpRight" size={16}/></Link></section>
  </main>
 </SiteShell>
}

