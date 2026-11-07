import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import Icon from '../editor/Icons'
import {DixoMark} from '../components/BrandMarks'
import NexivoOriginal from '../components/NexivoOriginal'

const focus=[
 {n:'01',name:'Digital products',tag:'PRODUCT THINKING',copy:'Design useful web experiences around a well-defined user problem.'},
 {n:'02',name:'SEO & discovery',tag:'SEARCH INSIGHT',copy:'Research search intent and structure clear, helpful digital content.'},
 {n:'03',name:'Trading research',tag:'RESEARCH SYSTEMS',copy:'Explore structured market research and decision-support workflows; not investment advice.'},
 {n:'04',name:'Growth systems',tag:'SMARTER OPERATIONS',copy:'Make research, feedback and collaboration easier to act on.'},
 {n:'05',name:'Product experiments',tag:'BUILD & LEARN',copy:'Validate small prototypes before investing in larger systems.'},
 {n:'06',name:'Operations',tag:'CONSISTENT EXECUTION',copy:'Document clear processes and make complex handoffs simpler.'}
]
export default function NexivoV92(){
 return <SiteShell><Seo title="Nexivo — Independent Digital Products and Research" description="Meet Nexivo, parent of AUDIXO Studio and the digital family behind products, SEO research and thoughtful software experiments." path="/nexivo"/>
  <main className="page-shell ax92-page ax94-page ax94-nexivo">
   <header className="ax94-nexivo-hero"><div><span className="ax92-eyebrow">THE PEOPLE AND IDEAS BEHIND AUDIXO</span><h1>Meet <span>Nexivo.</span></h1><p>Independent digital products. Useful research. Simple systems that help people do more.</p><div className="ax94-inline-tags"><span>Build with purpose</span><span>Research what matters</span><span>Keep improving</span></div></div><div className="ax94-nexivo-hero-mark"><NexivoOriginal stacked /><span>THE PARENT COMPANY</span></div></header>
   <section className="ax94-brand-story" aria-label="Nexivo parent company and its brands"><div className="ax94-family-lead"><span className="ax92-eyebrow">ONE ORIGIN · DISTINCT IDENTITIES</span><h2>Different products.<br/><span>One way of thinking.</span></h2><p>Each project has its own purpose and audience, connected by the same commitment to clarity and iteration.</p></div>
    <div className="ax94-family-rail"><div className="ax94-family-origin"><NexivoOriginal compact /><small>PARENT COMPANY</small></div><div className="ax94-family-path" aria-hidden="true"><i/><i/><i/></div><div className="ax94-family-child"><img src="/audixo-official-wordmark.png" alt="AUDIXO Studio official wordmark"/><small>AUDIO STUDIO · FREE BROWSER TOOL</small></div><div className="ax94-family-child" id="dixo"><DixoMark size={54}/><strong>DIXO</strong><small>SEPARATE DIGITAL IDENTITY</small></div></div>
   </section>
   <section className="ax94-nexivo-manifesto"><article><span>01 / OUR MISSION</span><h2>Make digital ideas genuinely useful.</h2><p>Bring product design, research and disciplined execution together so good ideas become understandable and reliable experiences.</p></article><article><span>02 / OUR VISION</span><h2>Build a focused family of products.</h2><p>Let each product grow on its own terms while sharing a practical approach to learning, feedback and usability.</p></article></section>
   <section className="ax94-focus-section"><header className="ax94-section-heading"><span className="ax92-eyebrow">WHAT WE EXPLORE</span><h2>Six disciplines. <span>One clear mindset.</span></h2><p>Thoughtful work starts with understanding problems and building things that solve them.</p></header><div className="ax94-focus-list">{focus.map(item=><article key={item.n}><div className="ax94-focus-number">{item.n}</div><div><small>{item.tag}</small><h3>{item.name}</h3><p>{item.copy}</p></div></article>)}</div></section>
   <section className="ax94-product-note"><div><span className="ax92-eyebrow">THE NEXIVO PORTFOLIO</span><h2>AUDIXO is a useful example of what we build.</h2><p>Explore the audio workspace or follow how the experience continues to improve.</p></div><div className="ax94-product-actions"><Link to="/editor" className="ax92-primary-link">Open AUDIXO <Icon name="arrowUpRight" size={16}/></Link><Link to="/changelog" className="ax94-text-link">Explore changelog <Icon name="arrowUpRight" size={15}/></Link></div></section>
  </main>
 </SiteShell>
}
