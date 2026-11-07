import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import Icon from '../editor/Icons'
import NexivoOriginal from '../components/NexivoOriginal'

const journey=[
 {n:'01',title:'Import',copy:'Bring your audio in without losing the original source.'},
 {n:'02',title:'Shape',copy:'Trim, layer and apply the changes you actually want.'},
 {n:'03',title:'Listen',copy:'Hear the result before making the final decision.'},
 {n:'04',title:'Export',copy:'Save your finished audio in a supported format.'}
]
const principles=[
 {n:'01',title:'A clearer workspace',copy:'Your source, timeline and control dock stay easy to find.'},
 {n:'02',title:'Changes in context',copy:'Applied edits can be reviewed and removed individually.'},
 {n:'03',title:'Real-time experimentation',copy:'Preview a change and decide what belongs in your sound.'},
 {n:'04',title:'Built for the browser',copy:'Work without a desktop installation or paid account.'}
]
export default function AboutV92(){
 return <SiteShell><Seo title="About AUDIXO — A Simpler, More Creative Audio Studio" description="See why AUDIXO offers a focused, free browser audio workspace with trimming, live effects, previewing and MP3/WAV export." path="/about"/>
  <main className="page-shell ax92-page ax94-page ax94-about">
   <header className="ax94-about-hero">
    <div className="ax94-about-copy"><span className="ax92-eyebrow">ABOUT AUDIXO STUDIO</span><h1>Shape your sound.<br/><span>Keep your flow.</span></h1><p>AUDIO editing should feel clear, not crowded. Keep the source in view, adjust what matters and hear every change before you finish.</p>
      <div className="ax94-actions"><Link to="/editor" className="ax92-primary-link">Open Studio <Icon name="arrowUpRight" size={16}/></Link><Link to="/how-it-works" className="ax94-text-link">How it works <Icon name="arrowUpRight" size={15}/></Link></div>
      <div className="ax94-inline-tags"><span>Free to use</span><span>No login needed</span><span>Original-aware editing</span></div>
    </div>
    <div className="ax94-about-visual" aria-label="AUDIXO brand symbol with live audio waveform"><div className="ax94-wavefield" aria-hidden="true">{Array.from({length:38},(_,i)=><i key={i} style={{height:(15+Math.abs(Math.sin(i*1.49)*70))+'%','--ax94-i':i} as React.CSSProperties}/>)}</div><div className="ax94-visual-identity"><img src="/audixo-official-symbol.png" alt="AUDIXO official symbol" /></div><small>IMPORT <b>·</b> SHAPE <b>·</b> LISTEN <b>·</b> EXPORT</small></div>
   </header>
   <section className="ax94-about-statement"><div><span className="ax92-eyebrow">WHY AUDIXO EXISTS</span><h2>Less interface noise.<br/><span>More creative control.</span></h2></div><p>Audio tools become easier to use when the workflow is obvious. AUDIXO brings waveform editing, live sound controls and local export into a focused workspace, without adding unnecessary steps.</p></section>
   <section className="ax94-journey-section"><div className="ax94-section-heading"><span className="ax92-eyebrow">THE CREATIVE FLOW</span><h2>Four steps. <span>One uninterrupted idea.</span></h2></div><ol className="ax94-journey">{journey.map((s,i)=><li key={s.n} style={{'--ax94-index':i} as React.CSSProperties}><span className="ax94-journey-number">{s.n}</span><h3>{s.title}</h3><p>{s.copy}</p></li>)}</ol></section>
   <section className="ax94-about-clarity"><div><span className="ax92-eyebrow">FOCUSED POWER</span><h2>Everything necessary.<br/><span>Nothing in the way.</span></h2><p>See your original, apply the effect, preview the difference and export when you're ready.</p></div><div className="ax94-feature-tags"><span>Original waveform</span><span>Removable edits</span><span>Live audio preview</span><span>Local export</span></div></section>
   <section className="ax94-principles"><div className="ax94-section-heading"><span className="ax92-eyebrow">DESIGN PRINCIPLES</span><h2>Built around <span>your workflow.</span></h2></div><div className="ax94-principle-list">{principles.map(p=><article key={p.n}><span>{p.n}</span><div><h3>{p.title}</h3><p>{p.copy}</p></div></article>)}</div></section>
   <footer className="ax94-parent-signature"><Link to="/nexivo" aria-label="Explore Nexivo"><NexivoOriginal compact /></Link><div><span className="ax92-eyebrow">THE PARENT COMPANY</span><h2>Powered by Nexivo.</h2><p>AUDIXO is part of Nexivo's approach to practical digital products and creative research.</p></div><Link className="ax94-text-link" to="/nexivo">Meet Nexivo <Icon name="arrowUpRight" size={16}/></Link></footer>
  </main>
 </SiteShell>
}
