import {useState} from 'react'
import {Link} from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import Icon from '../editor/Icons'

/* Answers are also used by the SEO prerender and structured-data script. */
export const faqs=[
 ['Is AUDIXO completely free to use?','Yes. You can trim, edit, record, preview audio effects and export supported audio files without purchasing a subscription or creating an AUDIXO account. Some operations depend on browser capabilities and device performance.'],
 ['Do I need to sign in or install a heavy program?','No. Open AUDIXO in a supported modern browser and start editing. Local files can be imported without uploading them to an AUDIXO account. Your browser may request microphone permission when recording.'],
 ['How can I make a quick edit in a few clicks?','Choose a tool, import your audio, adjust the waveform or the dedicated effect slider, preview the result and download the finished MP3 or WAV. Open Full Studio only when you need multitrack work.'],
 ['How do I trim audio or remove a middle section?','Drag the waveform handles to keep a section. In Full Studio, select a middle range and choose Remove & join or Keep selected seconds. The original source remains visible as a faded reference.'],
 ['What is the difference between Echo and Reverb?','Echo creates repeat taps with adjustable timing, wet mix and feedback. Reverb creates a diffuse room tail. They have separate controls so you can shape one without forcing the other.'],
 ['Can I slow a track down and add fade-in or fade-out?','Yes. The Slowed + Reverb tool includes speed and reverb controls plus fades. Fade-in gradually increases volume at the start; fade-out gradually lowers it at the end. Their shape appears on the waveform.'],
 ['Can I shift pitch or make 8D and 16D audio?','The Pitch Editor offers semitone changes. The Spatial Motion tool offers 8D and 16D-style moving stereo effects for headphones. These are creative effects, not new audio channels in the original recording.'],
 ['How does vocal and instrument separation work?','Compatible devices can run local separation to estimate vocals and several instrument groups. These outputs are not the original studio masters and may contain bleed or artifacts. Separation can be resource-intensive.'],
 ['Can I mute a separated stem or add my own vocals?','Yes. Full Studio provides track level, mute and solo controls. You can also import a new recording or create another layer, then preview the result before export.'],
 ['Can I undo a preset or remove an applied effect?','Yes. The Applied Edits area lists changes individually. You can remove an edit or use undo controls without having to rebuild the full project from scratch.'],
 ['Do you support recording and a local Library?','You can record using your microphone with browser permission. Finished mixes may be stored in the local browser Library, which currently keeps up to 21 saved exports in the same browser profile.'],
 ['Which audio formats and output qualities are supported?','MP3 and WAV export are offered in the audio tools. Choose WAV to avoid a further lossy compression stage. A high MP3 bitrate does not recreate detail that is absent from the original source.'],
 ['What happens with very long recordings?','Long recordings can follow a streaming-oriented workflow to avoid loading every effect into memory. For computationally heavy effects, trim a shorter section first and check your device capabilities.'],
 ['Can AUDIXO work on mobile devices?','Responsive browser controls support common tasks on compatible phones. An install-to-home-screen option may appear depending on your browser and device. Some intensive workflows are more practical on a desktop.'],
 ['Can I download media from third-party websites?','Only when you own the media or have the necessary permission and the source service supports the request. Available video qualities depend on the actual source files; a 4K option cannot be promised for every video.']
]

export default function FAQ(){
 const [open,setOpen]=useState<number|null>(0)
 const schema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
 return <SiteShell><Seo title="AUDIXO FAQ — Audio Editing, Effects and Free Access" description="Clear answers about free browser audio editing, trimming, echo, reverb, pitch, 8D audio, recording and export." path="/faq" schema={schema}/>
  <main className="page-shell ax25-faq ax95-faq">
   <header className="ax95-faq-hero"><div className="ax25-kicker"><i/> ANSWERS / AUDIXO STUDIO</div><h1>Good questions.<br/><em>Clear answers.</em></h1><p>Everything you need to know before making your next sound—without technical overload.</p><div className="ax95-faq-pills"><span>Free browser tools</span><span>No account</span><span>Real editing controls</span></div></header>
   <section className="ax95-faq-layout"><aside className="ax95-faq-aside"><span>01 / QUICK ANSWERS</span><h2>Find what you need.<br/>Keep creating.</h2><p>Start with a question. The answer opens smoothly, and the next one is only a click away.</p><Link to="/editor">Open Studio <Icon name="arrowUpRight" size={16}/></Link></aside>
    <div className="ax95-faq-list">{faqs.map(([q,a],i)=>{const expanded=open===i;return <article key={q} className={'ax95-faq-item'+(expanded?' is-open':'')}>
     <button type="button" aria-expanded={expanded} aria-controls={'ax95-faq-answer-'+i} onClick={()=>setOpen(expanded?null:i)}><span>{q}</span><i aria-hidden="true">{expanded?'−':'+'}</i></button>
     <div id={'ax95-faq-answer-'+i} className="ax95-faq-answer" aria-hidden={!expanded}><div><p>{a}</p></div></div>
    </article>})}</div>
   </section>
   <section className="ax95-faq-bottom"><div><span>NEED MORE HELP?</span><h2>We're here to make things clearer.</h2></div><Link to="/help">Explore Help Center <Icon name="arrowUpRight" size={16}/></Link></section>
  </main>
 </SiteShell>
}
