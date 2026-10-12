import { Link } from 'react-router-dom'
import Logo from './Logo'
const cols=[
 {name:'Audio tools',links:[['Full Audio Studio','/editor'],['Trim Audio','/tools/trim-audio'],['Vocal Extractor','/tools/vocals'],['Echo & Delay','/tools/echo'],['Slowed + Reverb','/tools/slowed-reverb'],['Mashup Editor','/tools/mashup']]},
 {name:'More tools',links:[['MP3 / MP4 Downloader','/tools/youtube-to-mp3'],['Pitch Editor','/tools/pitch'],['Spatial 8D / 16D','/tools/spatial-motion'],['Audio Recorder','/tools/recorder'],['Local Library','/library']]},
 {name:'Explore',links:[['All Features','/features'],['How it Works','/how-it-works'],['Sound Journal','/blog'],['About AUDIXO','/about'],['Nexivo','/nexivo']]},
 {name:'Help & support',links:[['Help Center','/help'],['Frequently Asked Questions','/faq'],['Contact','/contact']]},
 {name:'Legal',links:[['Privacy Policy','/privacy'],['Terms of Use','/terms'],['Copyright & Media Rights','/copyright']]}
]
export default function Footer(){
 return <footer className="ax30-footer ax40-footer" data-audixo-release="v44.0"><div className="ax30-footer-glow" aria-hidden="true"/>
  <div className="page-shell ax40-footer-intro"><div className="ax25-kicker"><i/> AUDIXO / CREATE MORE</div><h2>Make sound your own.<br/><em>Everywhere.</em></h2><p>Your browser audio studio, at home or on the move.</p><Link to="/editor" className="ax40-footer-cta">Open the Studio <span aria-hidden="true">↗</span></Link></div>
  <div className="page-shell ax40-footer-links"><div className="ax40-footer-brand"><Link to="/" aria-label="AUDIXO home"><Logo/></Link><p>Creative, direct audio tools for trimming, mixing and shaping sound. Media downloads require permission from the rights holder.</p><small>BUILT BY <Link to="/nexivo">NEXIVO ↗</Link></small></div>
   {cols.map(col=><section key={col.name}><h3>{col.name}</h3>{col.links.map(([label,href])=><Link key={href} to={href}>{label}</Link>)}</section>)}
  </div><div className="page-shell ax40-footer-bottom"><span className="ax40-footer-copy">© {new Date().getFullYear()} AUDIXO Studio · Built by Nexivo · All rights reserved.</span><div className="ax40-footer-bottom-links"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms</Link></div></div>
 </footer>
}
