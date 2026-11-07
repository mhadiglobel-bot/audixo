import { Link } from 'react-router-dom'
import Logo from './Logo'
import Icon from '../editor/Icons'
import {DixoMark} from './BrandMarks'
import NexivoOriginal from './NexivoOriginal'
const cols=[
 {name:'Audio tools',links:[['Full Audio Studio','/editor'],['Trim Audio','/tools/trim-audio'],['Vocal Extractor','/tools/vocals'],['Echo & Delay','/tools/echo'],['Slowed + Reverb','/tools/slowed-reverb']]},
 {name:'More tools',links:[['Social Video Downloader','/tools/social-video-downloader'],['Pitch Editor','/tools/pitch'],['Spatial 8D / 16D','/tools/spatial-motion'],['Audio Recorder','/tools/recorder'],['Local Library','/library']]},
 {name:'Explore',links:[['All Features','/features'],['How it Works','/how-it-works'],['Sound Journal','/blog'],['About AUDIXO','/about'],['Nexivo','/nexivo'],['Changelog','/changelog'],['Pricing — Always Free','/pricing']]},
 {name:'Help & support',links:[['Help Center','/help'],['Frequently Asked Questions','/faq'],['Contact','/contact']]},
 {name:'Legal',links:[['Privacy Policy','/privacy'],['Terms of Use','/terms'],['Copyright & Media Rights','/copyright']]}
]
export default function Footer(){
 return <footer className="ax30-footer ax40-footer" data-audixo-release="v92-final"><div className="ax30-footer-glow" aria-hidden="true"/>
  <div className="page-shell ax40-footer-intro"><div className="ax25-kicker"><i/> AUDIXO / CREATE MORE</div><h2>Make sound your own.<br/><em>Everywhere.</em></h2><p>Your browser audio studio, at home or on the move.</p><Link to="/editor" className="ax40-footer-cta">Open the Studio <span aria-hidden="true"><Icon name="arrowUpRight" size={17}/></span></Link></div>
  <div className="page-shell ax40-footer-links"><div className="ax40-footer-brand"><Link to="/" aria-label="AUDIXO home"><Logo/></Link><p>Creative, direct audio tools for trimming, mixing and shaping sound. Media downloads require permission from the rights holder.</p><small>BUILT BY <Link to="/nexivo">NEXIVO ↗</Link></small></div>
   {cols.map(col=><section key={col.name}><h3>{col.name}</h3>{col.links.map(([label,href])=><Link key={href} to={href}>{label}</Link>)}</section>)}
  </div><div className="page-shell ax92-footer-brandline ax94-footer-brandline">
  <div className="ax94-footer-brand-family" aria-label="Nexivo and its associated product brands">
   <Link to="/nexivo" aria-label="Nexivo parent company original logo"><NexivoOriginal compact stacked/></Link>
   <Link to="/" aria-label="AUDIXO Studio original brand"><img className="ax94-footer-audixo-logo" src="/audixo-official-wordmark.png" alt="AUDIXO Studio official wordmark" loading="lazy"/></Link>
   <Link to="/nexivo#dixo" aria-label="DIXO identity"><span className="ax94-footer-dixo"><DixoMark size={43}/><span><strong>DIXO</strong><small>DIGITAL IDENTITY</small></span></span></Link>
  </div>
  <Link to="/changelog" className="ax92-footer-changelog-link ax94-footer-changelog" aria-label="See AUDIXO release history"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 11a8.5 8.5 0 1 1 2.7 6.4M3.5 4.7V11h6.4M12 7.5v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> Changelog <Icon name="arrowUpRight" size={14}/></Link>
 </div><div className="page-shell ax40-footer-bottom"><span className="ax40-footer-copy">© {new Date().getFullYear()} AUDIXO Studio · Built by Nexivo · All rights reserved.</span><div className="ax40-footer-bottom-links"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms</Link></div></div>
 </footer>
}
