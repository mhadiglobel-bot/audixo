import {useEffect,useRef} from 'react'
import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'

type Milestone={id:string,date:string,title:string,detail:string,tags:string[],commit?:string}
const milestones:Milestone[]=[
 {id:'START',date:'10 OCT 2026',title:'The first AUDIXO source files',detail:'The repository begins with the first uploaded AUDIXO files—the early foundation for a browser-based audio workspace.',tags:['Repository start','Foundation']},
 {id:'EARLY',date:'15 OCT 2026',title:'From idea to working interface',detail:'Further repository uploads mark the initial period of iteration, before the detailed numbered release notes.',tags:['Early builds','Iteration']},

 {id:'V22',date:'EARLY PHASE',title:'The early AUDIXO journey',detail:'A starting marker requested for the historical timeline. Detailed V22 release notes are not available in the present repository archive.',tags:['Early beginnings','Archive note']},
 {id:'V72',date:'04 NOV 2026',title:'A stronger Studio foundation',detail:'A focused Studio interface update with more dependable stem processing and editing controls.',tags:['Studio layout','Audio workflow'],commit:'a519c59'},
 {id:'V83',date:'05 NOV 2026',title:'The workspace comes together',detail:'Recovered Studio controls, the local Library, recording and vocal workflows with improved visual metrics.',tags:['Controls','Library','Recorder'],commit:'5bc05b5'},
 {id:'V85',date:'06 NOV 2026',title:'Precision and reliability',detail:'Refined the editing layout, recording experience and stem processing with additional regression checks.',tags:['Accuracy','Audio engine'],commit:'bc7b1984'},
 {id:'V91',date:'07 NOV 2026',title:'A calmer interface',detail:'A more cohesive experience across Studio, Library, About and the live sound lab.',tags:['Design system','Live sound'],commit:'9225b10'},
 {id:'V92',date:'07 NOV 2026',title:'A clearer, completely free experience',detail:'Nexivo branding, live controls, the Studio workflow and a transparent free-pricing reveal came together.',tags:['Brand clarity','Free access'],commit:'706a86d'}
]
export default function ChangelogV92(){
 const path=useRef<HTMLElement|null>(null)
 useEffect(()=>{
  const host=path.current;if(!host)return
  const milestones=Array.from(host.querySelectorAll<HTMLElement>('.ax94-release'))
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if(!('IntersectionObserver' in window)||reduced)milestones.forEach(m=>m.classList.add('is-visible'))
  let observer:IntersectionObserver|null=null
  if('IntersectionObserver' in window&&!reduced){
   observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer?.unobserve(entry.target)}}),{threshold:.15,rootMargin:'0px 0px -7% 0px'})
   milestones.forEach(item=>observer?.observe(item))
  }
  let frame=0
  const update=()=>{
   frame=0
   const r=host.getBoundingClientRect()
   const p=Math.max(0,Math.min(1,(window.innerHeight*.56-r.top)/Math.max(1,r.height)))
   host.style.setProperty('--ax94-progress',String(p))
  }
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update)}
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll)
  return()=>{observer?.disconnect();window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);if(frame)cancelAnimationFrame(frame)}
 },[])
 return <SiteShell><Seo title="AUDIXO Changelog — From Early Builds to V92" description="Explore the AUDIXO timeline from the early V22 marker through documented Studio updates, audio reliability improvements and free browser tools." path="/changelog"/>
 <main className="page-shell ax92-page ax94-page ax94-changelog ax96-changelog">
  <header className="ax94-changelog-hero"><span className="ax92-eyebrow">AUDIXO · THE BUILD JOURNEY</span><h1>From first ideas.<br/><span>To better sound.</span></h1><p>A visual journey from early development to the latest AUDIXO Studio. Each glowing stop represents a documented stage or clearly labeled historical marker.</p><div className="ax94-inline-tags"><span>8 milestones</span><span>Historical starting point: V22</span><span>Latest recorded: V92</span></div></header>
  <section className="ax94-release-path" ref={path} aria-label="AUDIXO release timeline from V22 to V92">
   {milestones.map((milestone,index)=><article key={milestone.id} className={'ax94-release '+(index%2===0?'is-left':'is-right')+(index===milestones.length-1?' is-current':'')}>
    <span className="ax94-release-dot" aria-hidden="true"><i/></span>
    <div className="ax94-release-card"><div className="ax94-release-head"><strong>{milestone.id}</strong><small>{milestone.date}</small></div><h2>{milestone.title}</h2><p>{milestone.detail}</p><div className="ax94-release-bottom"><div className="ax94-release-tags">{milestone.tags.map(t=><span key={t}>{t}</span>)}</div></div></div>
   </article>)}
  </section>
  <section className="ax94-changelog-end ax96-changelog-end"><div><span className="ax92-eyebrow">KEEP CREATING</span><h2>Built to keep moving forward.</h2></div></section>
 </main></SiteShell>
}
