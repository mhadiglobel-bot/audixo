import { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'

export const faqs=[
 ['Do I need an account?','No. Audixo editing, recording and the browser Library work without an Audixo account.'],
 ['How do I trim or remove middle seconds?','Drag either waveform edge for a direct trim. For a middle section, choose Select range, mark the start and end, then Remove & join. Keep selected seconds retains only the highlighted part.'],
 ['How does vocal separation work?','Audixo first checks for the accelerated browser path and falls back when the device cannot use it. The separation model estimates Vocals, Drums, Bass and Music/Other; every returned stem opens as its own track.'],
 ['Can it recover every original instrument?','No. A finished MP3 does not contain the original studio session. Source separation estimates supported groups and can include bleed or artifacts. Audixo keeps the separate 60-item Music & Beats library distinct from AI-detected stems.'],
 ['Can I mute a stem or add my own vocal?','Yes. Every returned stem has Mute, Solo and Level controls. You can also record another take, import another file, or add a creative layer.'],
 ['How do I remove an effect I applied by mistake?','Each preset, manual control, trim, cut or duplicate appears in Applied Edits. Remove one item and the rest of the mix stays intact.'],
 ['Can I duplicate audio or a selected phrase?','Yes. Duplicate the selected track, or switch to range mode and duplicate only the highlighted seconds.'],
 ['Can I record and pause my microphone?','Yes. Record in Studio, pause and resume the same take, preview it and then add it as a new layer. Microphone access requires HTTPS and browser permission.'],
 ['How many mixes can I save?','The local Library keeps up to 21 finished exports in this browser profile. You can preview, reopen, download again or remove them.'],
 ['How does Mashup Songs work?','Add two or more audio files or Library exports, trim each layer, place it on the arrangement, set gain and fades, preview the combined result, then export one MP3 or WAV. Mashup is a separate focused tool, not a Full Studio session.'],
 ['Does 320 kbps restore missing detail?','No. It controls the output bitrate. It cannot recreate detail that is already missing from the source. Choose WAV when you want to avoid another lossy encoding step.'],
 ['What about long recordings?','Long files use a streaming-oriented editor path instead of forcing the full recording through memory-heavy creative processing. Trim a shorter section before using heavier local AI features.'],
 ['Can I install AUDIXO on my phone?','On Android Chrome and Edge, choose Install app when it is offered. On iPhone Safari, tap Share and Add to Home Screen. The installed web app uses a touch-optimized layout; conversion still needs the network.'],
 ['Why is 4K not always selectable?','4K appears only when the original video has a usable 2160p video stream and audio for merging. The processing worker checks exact output dimensions before delivery.'],
 ['Is Echo different from Reverb?','Yes. Echo repeats a sound with adjustable delay, mix and feedback. Reverb adds a diffuse room tail. In the Full Studio, you can enable either independently in its dedicated tab.']
]

export default function FAQ(){
 const [open,setOpen]=useState(0)
 const schema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
 return <SiteShell><Seo title="Audixo FAQ" description="Answers about trimming, vocal separation, removable edits, recording, Library saves, export quality and long audio." path="/faq" schema={schema}/><main className="page-shell ax25-faq"><section className="ax25-page-hero"><div className="ax25-kicker"><i/> FAQ / CLEAR ANSWERS</div><h1>Questions in.<br/><em>Clarity out.</em></h1><p>No draggable gimmicks. Choose a question and get the answer immediately.</p></section><section className="ax25-faq-highlights"><article><span>↔</span><small>TRIM</small><h3>Original audio stays visible</h3><p>The active range sits over a faded source reference.</p></article><article><span>≋</span><small>LAYERS</small><h3>Real stems stay separate</h3><p>Vocals, drums, bass and music/other are treated as independent tracks.</p></article><article><span>↶</span><small>EDIT STACK</small><h3>One change at a time</h3><p>Remove one edit without destroying everything else.</p></article></section><section className="ax25-faq-list">{faqs.map(([q,a],i)=><article key={q} className={open===i?'open':''}><button type="button" aria-expanded={open===i} onClick={()=>setOpen(open===i?-1:i)}><span><b>{String(i+1).padStart(2,'0')}</b><strong>{q}</strong></span><i>{open===i?'−':'+'}</i></button><div className="ax25-faq-answer" aria-hidden={open!==i}><p>{a}</p></div></article>)}</section><section className="ax25-faq-end"><div><small>STILL NEED A HAND?</small><h2>Help is within reach.</h2><p>Browse troubleshooting notes while our official support inbox is being prepared.</p></div><Link to="/help" className="ax25-primary-button">Open Help Center <span>↗</span></Link></section></main></SiteShell>
}
