import {type CSSProperties} from 'react'
import RhythmType from '../components/RhythmType'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import HeroAudioVisual from '../components/HeroAudioVisual'
import {SoundPlayground} from '../components/SoundExperience'
import TrustMetrics from '../components/TrustMetrics'
import WorkflowCinema from '../components/WorkflowCinema'
import MotionCardGallery from '../components/MotionCardGallery'
import { site } from '../config/site'

const heroLines=[
 'Make Every Beat Count.',
 'Shape Your Sound.',
 'Turn Noise Into Art.',
 'Your Mix. Your Rules.',
 'Create Without Limits.'
]


const answerCards=[
 {title:'What is AUDIXO?',tag:'ONLINE STUDIO',copy:'AUDIXO is an online audio editor for trimming, mixing and shaping sound directly in your web browser. Use focused effects or open the full multitrack studio.'},
 {title:'Can I use AUDIXO on mobile?',tag:'MOBILE READY',copy:'Yes. The mobile layout supports import, playback, basic editing and export, and compatible browsers can install AUDIXO as a web app. Large tracks and AI stems may need more memory.'},
 {title:'Does AUDIXO support echo?',tag:'FX CONTROL',copy:'Yes. A dedicated Echo dock controls delay time, echo mix and feedback independently of reverb. You can apply echo to individual clips or as part of a preset.'},
 {title:'Which MP3 and MP4 formats are available?',tag:'EXPORT MODES',copy:'MP3 defaults to 320 kbps, with selectable encoder bitrates. Video resolutions depend on the source formats found by the private processing worker.'},
]

function AnswerPreview({title,tag,copy,index}:{title:string;tag:string;copy:string;index:number}){
 return <article><small>{String(index+1).padStart(2,'0')} · {tag}</small><h3>{title}</h3><p>{copy}</p><div className="ax40-answer-pulse" aria-hidden="true"><i/><i/><i/></div></article>
}


export default function Home(){
 const schema={'@context':'https://schema.org','@type':'SoftwareApplication',name:site.name,applicationCategory:'MultimediaApplication',operatingSystem:'Web browser',description:site.description,featureList:['Multitrack mashup editor','Vocal and music stem separation','YouTube MP3 and MP4 download','Precision audio trimming','Creative audio effects','MP3 and WAV export','Local audio library']}
 return <SiteShell><Seo title="AUDIXO — Online Audio Studio & MP3/MP4 Downloader" description="Make sound your own with AUDIXO. Trim, remix, separate vocals and instruments, edit audio and download eligible YouTube MP3 or MP4 media." path="/" schema={schema}/><main className="ax25-home ax33-home">
  <section className="page-shell ax25-hero ax33-hero"><div className="ax25-hero-copy"><div className="ax25-kicker"><i/> AUDIXO / ONLINE AUDIO EDITOR</div><h1 className="ax33-seo-hero ax37-seo-hero"><span className="ax33-seo-line">AUDIXO · ONLINE AUDIO STUDIO</span><span className="ax38-sr-only">Edit audio online. Trim tracks, separate vocals, remix music and export your sound.</span><RhythmType lines={heroLines} requiresLoader className="ax37-hero-heading"/></h1><p>Trim with precision, separate vocals and instruments, move mashup sections on a clean timeline, shape effects and export finished audio from one focused browser workspace.</p><div className="ax25-hero-actions"><Link to="/editor" className="ax25-primary-button">Open Audixo Studio <span>↗</span></Link><a href="#audixo-playground" className="ax25-text-action">Try the live sound lab <span>↓</span></a></div><div className="ax25-hero-signature"><span>TRIM & EFFECTS</span><i/><span>VOCAL SPLIT</span><i/><span>MP3 DOWNLOAD</span><i/><span>MP4 VIDEO</span></div></div><HeroAudioVisual/></section>
  <section className="page-shell ax52-metrics-shell"><TrustMetrics/></section>
  <section id="audixo-playground" className="page-shell ax48-playground-shell"><SoundPlayground/></section>
  <section className="page-shell ax25-home-cinema"><WorkflowCinema/></section>
  <section className="page-shell ax25-section-title"><div className="ax25-kicker"><i/> SOUND IN MOTION</div><h2>Big tools.<br/><em>Clear moves.</em></h2><p>Focused audio tools with visible timelines, direct controls and a clear path to export.</p></section>
  <MotionCardGallery/>
  <section className="page-shell ax25-three-paths"><header><div className="ax25-kicker"><i/> START WHERE YOU ARE</div><h2>Simple first.<br/><em>Depth when you need it.</em></h2></header><div className="ax25-path-grid"><article><span>01</span><div className="ax25-path-art trim"><i/><i/><i/><i/><i/></div><h3>Cut with confidence</h3><p>Trim edges or remove a middle section while the original waveform stays visible as your reference.</p><Link to="/tools/trim-audio">Trim audio <b>↗</b></Link></article><article><span>02</span><div className="ax25-path-art feel"><i/><i/><i/><i/><i/></div><h3>Shape the sound</h3><p>Open a focused preset, adjust the controls that belong to it, then preview before applying or exporting.</p><Link to="/editor">Explore presets <b>↗</b></Link></article><article><span>03</span><div className="ax25-path-art layers"><i/><i/><i/><i/></div><h3>Open up the mix</h3><p>Separate vocal audio, music, drums, bass and other stems, then rebuild the mix with your own music or beats.</p><Link to="/tools/vocals">Explore stems <b>↗</b></Link></article></div></section>
  <section className="page-shell ax25-edit-story ax33-edit-story"><div className="ax25-edit-copy"><div className="ax25-kicker"><i/> EDIT WITHOUT FEAR</div><h2>Change one thing.<br/><em>Keep the rest.</em></h2><p>Audixo keeps important changes visible. Remove a preset, restore a cut, split a mashup section, or return to the source without rebuilding the project.</p><ul><li><b>Original view</b><span>Trimmed-away audio remains visible behind the active range.</span></li><li><b>Section-level control</b><span>Mashup clips can be split, moved and processed independently.</span></li><li><b>Independent edits</b><span>Applied presets and manual controls remain removable.</span></li></ul><Link to="/editor" className="ax25-text-action">Meet your studio <span>↗</span></Link></div><div className="ax25-stack-demo ax33-stack-demo"><div className="ax25-stack-wave">{Array.from({length:48},(_,i)=><i key={i} style={{'--h':`${18+((i*29)%72)}%`} as CSSProperties}/>)}</div><article className="pink"><span>✦</span><div><strong>Dream Echo</strong><small>Selected clip only</small></div><span className="ax40-demo-remove" aria-hidden="true">×</span></article><article className="cyan"><span>↔</span><div><strong>Trim · 02.50–42.00</strong><small>Original source retained</small></div><span className="ax40-demo-remove" aria-hidden="true">×</span></article><article className="green"><span>◌</span><div><strong>Reverb · 18%</strong><small>Manual control</small></div><span className="ax40-demo-remove" aria-hidden="true">×</span></article><small>REMOVE ONE EDIT. KEEP THE REST.</small></div></section>
  <section className="page-shell ax34-source-story"><div className="ax34-source-copy"><div className="ax25-kicker"><i/> SOURCE AWARE EDITING</div><h2>See the full song.<br/><em>Shape only the moment.</em></h2><p>Audixo keeps the original source visible while the active range, section or stem stays editable. That means fewer blind edits and faster A/B decisions.</p><div className="ax34-source-points"><span><b>01</b><strong>Keep context</strong><small>The full waveform remains your reference.</small></span><span><b>02</b><strong>Edit precisely</strong><small>Work on one clip, track or full mix.</small></span><span><b>03</b><strong>Preview first</strong><small>Hear the change before you keep it.</small></span></div></div><div className="ax34-source-visual"><header><small>ORIGINAL SOURCE</small><strong>02:14.680</strong></header><div className="ax34-reference-wave">{Array.from({length:74},(_,i)=><i key={i} style={{'--h':`${14+((i*47)%78)}%`,'--i':i} as CSSProperties}/>)}</div><div className="ax34-active-window"><span>ACTIVE SECTION</span></div><footer><span>ORIGINAL</span><b>→</b><span>SELECT</span><b>→</b><span>SHAPE</span><b>→</b><span>EXPORT</span></footer></div></section>
  <section className="page-shell ax34-home-lab"><header><div className="ax25-kicker"><i/> BUILT FOR REAL CREATIVE WORK</div><h2>One browser.<br/><em>Four clear jobs.</em></h2><p>Start small or go deeper without switching visual language.</p></header><div><article><span>01</span><h3>Trim precisely</h3><p>Edge handles, exact time fields and visible fades.</p><Link to="/tools/trim-audio">Open trim ↗</Link></article><article><span>02</span><h3>Separate the mix</h3><p>Vocal audio, music, drums, bass and instrument groups.</p><Link to="/tools/vocals">Open stems ↗</Link></article><article><span>03</span><h3>Build mashups</h3><p>Move and split sections independently across tracks.</p><Link to="/tools/mashup">Open mashup ↗</Link></article><article><span>04</span><h3>Finish clean</h3><p>Preview, export MP3/WAV and keep a local Library copy.</p><Link to="/editor">Open studio ↗</Link></article></div></section>
  <section className="page-shell ax40-answer-block" aria-label="Questions about Audixo"><div className="ax25-kicker"><i/> THE BASICS</div><h2>Answers before you start.</h2><div>{answerCards.map((item,index)=><AnswerPreview key={item.title} {...item} index={index}/>)}</div><Link to="/faq">More answers in the FAQ →</Link></section>
  <section className="page-shell ax25-final-cta ax33-final-cta"><div><div className="ax25-kicker"><i/> YOUR NEXT TAKE</div><h2>Bring the audio.<br/><em>Leave with your sound.</em></h2><p>No account wall. No confusing control maze.</p></div><Link to="/editor" className="ax25-primary-button">Start creating <span>↗</span></Link></section>
 </main></SiteShell>
}
