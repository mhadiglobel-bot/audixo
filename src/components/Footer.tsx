import { Link } from 'react-router-dom'
import Logo from './Logo'
import Icon from '../editor/Icons'

const cols=[
 {name:'Tools',links:[
  ['Open Studio','/editor'],['Trim Audio','/tools/trim-audio'],['Vocal Extractor','/tools/vocals'],
  ['Echo & Delay','/tools/echo'],['Slowed + Reverb','/tools/slowed-reverb'],
  ['Pitch Editor','/tools/pitch'],['8D / 16D Motion','/tools/spatial-motion'],
  ['Audio Recorder','/tools/recorder'],['Lyrics Video Maker','/tools/lyrics-video-maker'],['Social Video Downloader','/tools/social-video-downloader'],['Local Library','/library']
 ]},
 {name:'Explore',links:[
  ['Home','/'],['Features','/features'],['How It Works','/how-it-works'],['About AUDIXO','/about'],
  ['Nexivo','/nexivo'],['Changelog','/changelog'],['Pricing','/pricing'],['Sound Journal','/blog']
 ]},
 {name:'Help & Support',links:[['Help Center','/help'],['FAQ','/faq'],['Contact','/contact']]},
 {name:'Legal',links:[['Privacy Policy','/privacy'],['Terms of Use','/terms'],['Copyright & Media Rights','/copyright']]}
]
export default function Footer(){
 return <footer className="ax30-footer ax40-footer ax96-footer ax97-footer" data-audixo-release="v97-refinement">
  <div className="ax30-footer-glow" aria-hidden="true"/>
  <div className="page-shell ax96-footer-top">
   <div><span className="ax25-kicker"><i/> AUDIXO / CREATE MORE</span><h2>Make sound your own.<br/><em>Everywhere.</em></h2><p>Powerful sound editing. Without the noise.</p></div>
   <Link className="ax40-footer-cta ax96-footer-cta" to="/editor">Open Studio <Icon name="arrowUpRight" size={17}/></Link>
  </div>
  <div className="page-shell ax96-footer-directory">
   <div className="ax96-footer-brand ax97-footer-brand">
    <Link to="/" className="ax96-audixo-brand" aria-label="AUDIXO Studio home"><Logo/></Link>
    <p>Creative, direct audio tools for trimming, mixing and shaping sound. Media downloads require permission from the rights holder.</p>
    <small>FREE BROWSER AUDIO STUDIO</small>
   </div>
   {cols.map(col=><nav key={col.name} aria-label={col.name} className="ax96-footer-col">
    <h3>{col.name}</h3>
    {col.links.map(([label,to])=><Link key={to} to={to}>{label}</Link>)}
   </nav>)}
  </div>
  <div className="page-shell ax96-footer-bottom"><span>© {new Date().getFullYear()} AUDIXO Studio · A Nexivo product.</span><span>Created for the freedom to make sound.</span></div>
 </footer>
}
