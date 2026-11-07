import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import Icon from '../editor/Icons'

const illustrative=[
 {name:'Starter',price:'$12',description:'The basics, usually locked into a tier.',benefits:['Trim and arrange','Quick audio effects','MP3 / WAV exports']},
 {name:'Creator',price:'$29',description:'Creative controls, typically sold as extras.',benefits:['Multitrack editing','Voice and instrument tools','Sound presets']},
 {name:'Studio',price:'$59',description:'A full workflow that sounds premium.',benefits:['In-browser editing','A local saved-mix library','Creator-friendly controls']}
]
export default function PricingV92(){
 const revealRef=useRef<HTMLElement|null>(null)
 const [progress,setProgress]=useState(0)
 useEffect(()=>{
  let frame=0
  const render=()=>{frame=0;const el=revealRef.current;if(!el)return;const rect=el.getBoundingClientRect();const start=window.innerHeight*.38;const end=-window.innerHeight*.30;const next=Math.max(0,Math.min(1,(start-rect.top)/(start-end)));setProgress(v=>Math.abs(v-next)>.012?next:v)}
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(render)}
  scroll();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll)
  return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);if(frame)cancelAnimationFrame(frame)}
 },[])
 return <SiteShell><Seo title="AUDIXO Pricing — Free Online Audio Studio, No Account Required" description="AUDIXO is free to use. No subscription, no paid plans and no login required to access the browser audio studio, editing tools and local exports." path="/pricing"/>
 <main className="page-shell ax92-page ax92-pricing">
  <header className="ax92-pricing-head"><span className="ax92-eyebrow">AUDIXO / PRICING REVEALED</span><h1>Great tools.<br/><span>Zero paywalls.</span></h1><p>See the kind of tiers you might expect from an audio platform. Then keep scrolling to see what AUDIXO actually costs.</p><div className="ax92-pricing-scroll-hint">SCROLL TO REVEAL <span aria-hidden="true">↓</span></div></header>
  <section className="ax92-pricing-stage" ref={revealRef} aria-label="Illustrative pricing comparison revealing AUDIXO is free">
   <div className="ax92-pricing-note">ILLUSTRATIVE COMPARISON ONLY · THESE ARE NOT REAL AUDIXO PLANS OR CHARGES</div>
   <div className="ax92-price-grid">{illustrative.map((p,i)=>{
    const flip=Math.max(0,Math.min(1,(progress-.12-i*.12)*2.25))
    return <article className="ax92-price-item" key={p.name}><div className="ax92-price-flipper" style={{transform:'rotateY('+(flip*180)+'deg)'}}>
     <div className="ax92-price-face ax92-price-front"><span className="ax92-price-overline">WHAT YOU MIGHT EXPECT</span><h2>{p.name}</h2><strong>{p.price}<small>/mo</small></strong><p>{p.description}</p><div className="ax92-price-rule"/>{p.benefits.map(b=><span className="ax92-price-benefit" key={b}><Icon name="magic" size={13}/>{b}</span>)}<span className="ax92-not-real">Illustrative price · not a paid plan</span></div>
     <div className="ax92-price-face ax92-price-back"><span>THE ACTUAL AUDIXO PRICE</span><h2>{p.name}</h2><strong>$0</strong><p>Completely free to use—no subscription or purchase required.</p><div className="ax92-free-check"><Icon name="magic" size={19}/> INCLUDED FOR FREE</div></div>
    </div></article>
   })}</div>
  </section>
  <section className="ax92-free-reveal ax92-animated-rim"><span className="ax92-eyebrow">THE REVEAL</span><h2>This tool is <span>totally free now.</span></h2><p>Not a trial. Not a hidden upgrade. AUDIXO is a free browser audio workspace. Jump in, work on your sound and export your result.</p><div className="ax92-free-badge"><span>100%</span><strong>FREE</strong></div><Link to="/editor" className="ax92-primary-link">Start creating for free <Icon name="arrowUpRight" size={17}/></Link></section>
  <section className="ax92-pricing-features">{[
   ['NO ACCOUNT','Start using the audio editor without signing up.'],
   ['NO SUBSCRIPTION','No recurring audio-studio membership fee.'],
   ['NO PURCHASE','No checkout or paid tier is required for the core tools.'],
   ['BROWSER-BASED','Edit, preview and export directly from a supported browser.']
  ].map(([h,p],i)=><article key={h}><span className="ax92-pricing-feature-symbol">{['✧','∞','✓','▷'][i]}</span><h3>{h}</h3><p>{p}</p></article>)}</section>
  <p className="ax92-pricing-footnote">AUDIXO does not sell the illustrative plans shown above. Processing capability depends on your browser, device and supported media formats. For downloaded media, you must have the necessary rights or permission.</p>
 </main></SiteShell>
}

