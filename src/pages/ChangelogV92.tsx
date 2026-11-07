import {useEffect,useRef} from 'react'
import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import Icon from '../editor/Icons'

const releases=[
 {version:'V72',date:'04 NOV 2026',title:'A better Studio foundation',detail:'A Studio interface update focused on clearer audio controls and more dependable stem workflows.',tags:['Studio UI','Stem reliability'],commit:'a519c59'},
 {version:'V83',date:'05 NOV 2026',title:'Control and workspace recovery',detail:'Restored the core editing controls, local Library, vocal tools and recorder alongside motion-based homepage metrics.',tags:['Editor controls','Library','Recorder'],commit:'5bc05b5'},
 {version:'V85',date:'06 NOV 2026',title:'Precision meets identity',detail:'Refined the Studio layout, recording flow and local stem processing, with additional brand consistency and regression checks.',tags:['Studio layout','Brand QA'],commit:'bc7b1984'},
 {version:'V87',date:'06 NOV 2026',title:'One home for AUDIXO',detail:'Aligned the canonical production domain across website metadata, site indexing, social previews and PWA behavior.',tags:['Production domain','SEO & PWA'],commit:'8647690'},
 {version:'V91',date:'07 NOV 2026',title:'A more considered interface',detail:'Improved sequential homepage metrics and the visual finish of the Studio, Library, About page and live sound lab.',tags:['UX polish','Sound Lab'],commit:'9225b10'},
 {version:'V92',date:'07 NOV 2026',title:'Brand, controls and completely free',detail:'Brought the Nexivo family into focus, clarified the About experience, polished audio controls and introduced the completely free pricing reveal.',tags:['Nexivo','Free pricing','Live controls'],commit:'706a86d'}
]
export default function ChangelogV92(){
 const root=useRef<HTMLElement|null>(null)
 useEffect(()=>{
  const host=root.current;if(!host)return
  const nodes=Array.from(host.querySelectorAll<HTMLElement>('.ax92-change-entry'))
  if(!('IntersectionObserver' in window)){nodes.forEach(n=>n.classList.add('is-visible'));return}
  const obs=new IntersectionObserver(items=>items.forEach(i=>{if(i.isIntersecting){i.target.classList.add('is-visible');obs.unobserve(i.target)}}),{threshold:.15,rootMargin:'0px 0px -5% 0px'})
  nodes.forEach(n=>obs.observe(n));return()=>obs.disconnect()
 },[])
 return <SiteShell><Seo title="AUDIXO Changelog — Every Step in the Studio's Evolution" description="Explore six verified AUDIXO release milestones from V72 to V92, including Studio improvements, brand updates, sound lab changes and free access." path="/changelog"/>
  <main className="page-shell ax92-page ax92-changelog" ref={root}>
   <header className="ax92-changelog-head"><span className="ax92-eyebrow">AUDIXO / RELEASE HISTORY</span><h1>Every version.<br/><span>A sharper sound.</span></h1><p>Follow the meaningful steps behind the Studio. These milestones come from the AUDIXO project release history—not invented features or fictional versions.</p><div className="ax92-changelog-head-actions"><Link to="/editor" className="ax92-primary-link">Open the latest Studio <Icon name="arrowUpRight" size={17}/></Link><span className="ax92-version-tag">CURRENT · V92</span></div></header>
   <section className="ax92-changelog-list" aria-label="AUDIXO chronological release milestones">
    {releases.map((r,i)=><article className={`ax92-change-entry ${i===releases.length-1?'is-latest':''}`} key={r.version} style={{'--ax92-step':i} as React.CSSProperties}>
     <div className="ax92-change-pin" aria-hidden="true"><span/><i/></div>
     <div className="ax92-change-version"><strong>{r.version}</strong><small>{r.date}</small></div>
     <div className="ax92-change-card"><div className="ax92-change-card-head"><span>{r.version==='V92'?'CURRENT RELEASE':'RELEASE MILESTONE'}</span><a href={`https://github.com/mhadiglobel-bot/audixo/commit/${r.commit}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${r.version} source commit`}>Source ↗</a></div><h2>{r.title}</h2><p>{r.detail}</p><div className="ax92-change-tags">{r.tags.map(t=><span key={t}>{t}</span>)}</div></div>
    </article>)}
   </section>
   <section className="ax92-changelog-next ax92-animated-rim"><div><span className="ax92-eyebrow">WHAT'S NEXT?</span><h2>The next useful update starts with real feedback.</h2><p>AUDIXO keeps improving the workflow rather than hiding essential features behind a paid tier.</p></div><Link className="ax92-secondary-link" to="/contact">Send feedback <Icon name="arrowUpRight" size={16}/></Link></section>
  </main>
 </SiteShell>
}
