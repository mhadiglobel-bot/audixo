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
    <div className="ax94-about-copy"><span className="ax92-eyebrow">ABOUT AUDIXO STUDIO</span><h1>Shape your sound.<br/><span>Keep your flow.</span></h1><p>We built AUDIXO because editing audio should not require a heavy desktop application or a complicated workflow. Import your track, make changes in a few clicks, listen and export—without a login or subscription.</p>
      <div className="ax94-actions"><Link to="/editor" className="ax92-primary-link">Open Studio <Icon name="arrowUpRight" size={16}/></Link><Link to="/how-it-works" className="ax94-text-link">How it works <Icon name="arrowUpRight" size={15}/></Link></div>
      <div className="ax94-inline-tags"><span>100% free tools</span><span>No account required</span><span>Edit in a few clicks</span></div>
    </div>
    <div className="ax94-about-visual ax95-about-visual" aria-label="Animated AUDIXO orbit, sound waves and creative tools"><div className="ax95-spectrum-ring" aria-hidden="true"><i/><i/><i/></div><span className="ax95-orbit-chip chip-one">QUICK EDITS</span><span className="ax95-orbit-chip chip-two">LIVE FX</span><span className="ax95-orbit-chip chip-three">EXPORT</span><div className="ax94-wavefield ax95-wavefield" aria-hidden="true">{Array.from({length:38},(_,i)=><i key={i} style={{height:(15+Math.abs(Math.sin(i*1.49)*70))+'%','--ax94-i':i} as React.CSSProperties}/>)}</div><div className="ax94-visual-identity ax95-visual-identity"><img src="/audixo-official-symbol.png" alt="AUDIXO official symbol" /></div><small>IMPORT <b>·</b> SHAPE <b>·</b> LISTEN <b>·</b> EXPORT</small></div>
   </header>
   <section className="ax94-about-statement"><div><span className="ax92-eyebrow">WHY AUDIXO EXISTS</span><h2>Less interface noise.<br/><span>More creative control.</span></h2></div><p>Our goal is simple: make everyday audio editing accessible to everyone. AUDIXO keeps the waveform visible and the most useful tools within reach, so creators can work in a few clicks instead of learning a complex production suite.</p></section>
   <section className="ax94-journey-section"><div className="ax94-section-heading"><span className="ax92-eyebrow">THE CREATIVE FLOW</span><h2>Four steps. <span>One uninterrupted idea.</span></h2></div><ol className="ax94-journey">{journey.map((s,i)=><li key={s.n} style={{'--ax94-index':i} as React.CSSProperties}><span className="ax94-journey-number">{s.n}</span><h3>{s.title}</h3><p>{s.copy}</p></li>)}</ol></section>
   <section className="ax94-about-clarity"><div><span className="ax92-eyebrow">FOCUSED POWER</span><h2>Powerful effects.<br/><span>Only a few clicks away.</span></h2><p>From quick trims and fades to reverb, pitch and spatial sound, AUDIXO puts creative control directly in your browser. No bloated setup or account needed.</p></div><div className="ax94-feature-tags"><span>Original waveform</span><span>Removable edits</span><span>Live audio preview</span><span>Local export</span></div></section>
   <section className="ax94-principles"><div className="ax94-section-heading"><span className="ax92-eyebrow">DESIGN PRINCIPLES</span><h2>Built around <span>your workflow.</span></h2></div><div className="ax94-principle-list">{principles.map(p=><article key={p.n}><span>{p.n}</span><div><h3>{p.title}</h3><p>{p.copy}</p></div></article>)}</div></section>
   <footer className="ax94-parent-signature"><Link to="/nexivo" aria-label="Explore Nexivo"><NexivoOriginal compact /></Link><div><span className="ax92-eyebrow">THE PARENT COMPANY</span><h2>Powered by Nexivo.</h2><p>AUDIXO is part of Nexivo's approach to practical digital products and creative research.</p></div><Link className="ax94-text-link" to="/nexivo">Meet Nexivo <Icon name="arrowUpRight" size={16}/></Link></footer>
  </main>
 </SiteShell>
}
