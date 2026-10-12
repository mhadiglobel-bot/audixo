import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import WorkflowCinema from '../components/WorkflowCinema'

const steps=[
 ['Import','Bring in MP3, WAV, M4A, FLAC or OGG audio, reopen a Library export, or record a fresh take.','START HERE · DEVICE / LIBRARY / MIC'],
 ['Trim','Drag the active start and end handles while the complete original source stays visible behind the edit.','CLEAN THE EDGES FIRST'],
 ['Select','Mark the exact phrase you want to isolate, repeat, process, remove or keep.','FOCUS ONE MOMENT'],
 ['Layer','Open vocals, music, drums, bass and other returned stem groups as separate controllable layers.','OPEN THE MIX'],
 ['Pitch','Move tone deeper or brighter with a clear semitone control and hear the change before export.','MOVE THE TONE'],
 ['Lo-fi','Shape warmth, mids, highs and texture without opening unrelated controls.','ADD TEXTURE'],
 ['Space','Add echo and reverb with visible delay, wet mix, feedback and room controls.','BUILD DEPTH'],
 ['Motion','Move audio through 8D or 16D headphone motion with depth and orbit speed controls.','MOVE THE STEREO FIELD'],
 ['Mashup','Stack songs or music beds, split sections at the playhead, move them in time and shape every section independently.','ARRANGE VERSE BY VERSE'],
 ['Shape','Open a preset or manual control, adjust only what you need, then keep every edit removable.','TUNE THE FEEL'],
 ['Export','Preview the final sound, choose MP3 or WAV, download it and optionally keep a local Library copy.','KEEP THE FINISHED TAKE'],
]

export default function HowItWorks(){return <SiteShell><Seo title="How Audixo Works — From Audio Import to Final Export" description="An 11-step animated workflow for importing, trimming, selecting, layering, shaping, mashing up and exporting audio in Audixo Studio." path="/how-it-works"/><main className="ax25-how ax27-how ax28-how ax29-how"><section className="page-shell ax25-page-hero"><div className="ax25-kicker"><i/> HOW IT WORKS</div><h1>Every move visible.<br/>Every step <em>under control.</em></h1><p>Watch the interface perform the job itself. No fake cursor and no hidden step between importing audio and keeping the finished take.</p></section><section className="page-shell"><WorkflowCinema/></section><section className="page-shell ax29-step-editorial"><header><small>THE COMPLETE FLOW</small><h2>Eleven clear moves.<br/><em>Nothing hidden.</em></h2><p>The animation shows what moves. These cards explain why each step exists and when you use it.</p></header><div className="ax29-step-grid">{steps.map(([title,body,use],index)=><article key={title} className="ax29-step-card"><div><b>{String(index+1).padStart(2,'0')}</b><small>{use}</small></div><h3>{title}</h3><p>{body}</p><i>↗</i></article>)}</div></section></main></SiteShell>}
