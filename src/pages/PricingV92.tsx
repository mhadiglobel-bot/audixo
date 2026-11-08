import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import Icon from '../editor/Icons'

/* Fictional competitor-style tiers for scroll storytelling, not offers for sale. */
const imagined=[
 {name:'Starter',cost:'$12',label:'THE BASICS',summary:'A simple edit should never be a premium feature.',
  yes:['Trim and arrange','Basic sound effects','MP3 exports'],no:['Advanced control','Multitrack workflow','Local library']},
 {name:'Creator',cost:'$29',label:'MORE CONTROL',summary:'Creative tools often become individual add-ons.',
  yes:['Effects and fades','Pitch and tempo','Track previews'],no:['Full studio freedom','Premium stem controls','All export options']},
 {name:'Studio',cost:'$59',label:'THE FULL PACKAGE',summary:'A complete workflow commonly comes at a cost.',
  yes:['Multitrack editing','Live sound shaping','Audio tool collection'],no:['No-account workflow','Zero monthly charges','Paywall-free access']}
]
const real=[
 ['TRIM & FADE','Cut precise ranges and smoothly shape the start or finish.'],
 ['SOUND EFFECTS','Make echo, reverb, pitch and spatial edits.'],
 ['FULL STUDIO','Layer audio, adjust tracks and export your mix.'],
 ['SAVE & EXPORT','Keep supported finished mixes in the local browser Library.']
]
const cap=(n:number)=>Math.max(0,Math.min(1,n))
const ease=(n:number)=>{const x=cap(n);return x*x*(3-2*x)}
export default function PricingV92(){
 const stageRef=useRef<HTMLElement|null>(null)
 const [progress,setProgress]=useState(0)
 useEffect(()=>{
  let frame=0
  const update=()=>{frame=0;const stage=stageRef.current;if(!stage)return;const rect=stage.getBoundingClientRect();const travel=Math.max(1,rect.height-window.innerHeight);const n=cap(-rect.top/travel);setProgress(previous=>Math.abs(previous-n)>.003?n:previous)}
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(update)}
  scroll();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll)
  return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);if(frame)cancelAnimationFrame(frame)}
 },[])
 const tierOut=ease((progress-.32)/.20)
 const sikeIn=ease((progress-.41)/.11)
 const sikeOut=1-ease((progress-.62)/.13)
 const sikeVisible=sikeIn*sikeOut
 const freeIn=ease((progress-.72)/.18)
 return <SiteShell><Seo title="AUDIXO Pricing — Browser Audio Editing Without Paywalls" description="See how illustrated audio editing tiers compare with AUDIXO's actual free browser editing experience." path="/pricing"/>
  <main className="ax96-pricing ax97-pricing">
   <header className="page-shell ax96-pricing-heading">
    <div className="ax92-eyebrow">AUDIXO / PRICING</div><h1>Big creativity.<br/><span>What should it cost?</span></h1>
    <p>Imagine your sound split across subscription tiers. Take a closer look, then scroll to find out what AUDIXO actually costs.</p>
    <span className="ax96-pricing-scroll">SCROLL TO DISCOVER <i aria-hidden="true">↓</i></span>
   </header>
   <section ref={stageRef} className="ax96-pricing-stage" aria-label="Interactive scroll pricing reveal">
    <div className="ax96-pricing-sticky">
     <div className="ax96-plan-world" aria-hidden={tierOut>.96} style={{opacity:1-tierOut,transform:'translate3d(0,'+(-tierOut*55)+'px,0) scale('+(1-.08*tierOut)+')',pointerEvents:tierOut>.95?'none':'auto'}}>
      <div className="ax96-plan-intro"><div><span>AN ILLUSTRATIVE COMPARISON</span><h2>Choose your level.</h2></div><p>These example plans are imaginary. AUDIXO does not sell them.</p></div>
      <div className="ax96-pricing-cards">{imagined.map((tier,i)=><article className={'ax96-plan-card plan-'+i} key={tier.name}>
       <span className="ax96-plan-index">0{i+1} / {tier.label}</span>
       <h3>{tier.name}</h3><div className="ax96-plan-amount">{tier.cost}<small>/month*</small></div>
       <p>{tier.summary}</p><div className="ax96-plan-line"/>
       <strong className="ax96-plan-list-title">YOU MIGHT GET</strong>
       <ul>{tier.yes.map(x=><li key={x}><i className="yes" aria-hidden="true">✓</i>{x}</li>)}{tier.no.map(x=><li key={x} className="unavailable"><i className="no" aria-hidden="true">×</i>{x}</li>)}</ul>
       <small className="ax96-plan-disclaimer">*Illustrative only, not a real AUDIXO plan</small>
      </article>)}</div>
      <p className="ax96-plan-finish">THE FEATURES ARE REAL. THE PRICES ABOVE AREN'T.</p>
     </div>
     <div className="ax96-sike-stage" style={{opacity:sikeVisible,transform:'scale('+(0.78+.22*sikeIn)+')',pointerEvents:'none'}} aria-hidden={sikeVisible<.4}>
      <span className="ax96-sike-rays" aria-hidden="true"/><span className="ax96-sike-kicker">HERE IS THE DIFFERENCE</span><strong>PLOT TWIST.</strong><p>All that creative power. No subscription.</p>
     </div>
     <div className="ax96-pricing-free" style={{opacity:freeIn,transform:'translateY('+((1-freeIn)*34)+'px) scale('+(0.84+.16*freeIn)+')',pointerEvents:freeIn>.95?'auto':'none'}} aria-hidden={freeIn<.5}>
      <span className="ax96-free-eyebrow">THE ACTUAL AUDIXO PRICE</span>
      <div className="ax96-free-orbit"><i/><i/><strong>$0</strong></div>
      <h2>Fully featured.<br/><span>Totally free.</span></h2>
      <p>Not a trial or a limited membership. The browser audio workspace, its supported editing tools and local exports are free to use.</p>
      <div className="ax96-free-chips"><span>NO LOGIN</span><span>NO SUBSCRIPTION</span><span>NO PURCHASE</span></div>
      <Link to="/editor" className="ax96-free-cta">Open Studio <Icon name="arrowUpRight" size={19}/></Link>
     </div>
     <div className="ax96-price-progress" aria-hidden="true"><span style={{width:(progress*100)+'%'}}/></div>
    </div>
   </section>
   <section className="page-shell ax96-pricing-included"><header><div className="ax92-eyebrow">YOUR CREATIVE TOOLKIT</div><h2>One complete studio.<br/><span>No extra tiers.</span></h2><p>Available features depend on your browser and device, not a paid plan.</p></header>
    <div className="ax96-included-grid">{real.map(([head,copy],i)=><article key={head}><div>0{i+1} <span aria-hidden="true">✓</span></div><h3>{head}</h3><p>{copy}</p></article>)}</div>
   </section>
   <p className="page-shell ax96-pricing-note">The $12, $29 and $59 examples are fictional comparisons, not AUDIXO offers or actual charges. Processing performance varies by browser, device and file type. For third-party media, you must have the necessary rights or permission.</p>
  </main>
 </SiteShell>
}
