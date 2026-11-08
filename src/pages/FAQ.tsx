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
 return <SiteShell><Seo title="AUDIXO FAQ — Frequently Asked Questions About Audio Editing" description="Answers about AUDIXO's free audio studio, trimming, echo, pitch, 8D/16D effects, recording, exports and browser privacy." path="/faq" schema={schema}/>
 <main className="page-shell ax25-faq ax95-faq ax96-faq ax97-faq">
  <header className="ax95-faq-hero ax96-faq-hero"><span className="ax92-eyebrow">AUDIXO / FREQUENTLY ASKED QUESTIONS</span>
   <h1>Good questions.<br/><span>Clear answers.</span></h1>
   <p>Answers that help you focus on making something worth hearing, not hunting through settings.</p>
  </header>
  <section className="ax97-faq-layout" aria-label="Frequently asked questions">
   <aside className="ax97-faq-side">
    <h2 className="ax97-faq-vertical"><span>FIND WHAT YOU NEED.</span><span>KEEP CREATING.</span></h2>
    <p>Everything about your browser-based audio workspace in one place.</p>
   </aside>
   <div className="ax97-faq-main">
    <div className="ax97-faq-count"><strong>FREQUENTLY ASKED QUESTIONS</strong><span>{faqs.length} ANSWERS · ONE PLACE</span></div>
    <div className="ax97-faq-list">{faqs.map(([question,answer],i)=>{const expanded=open===i;return <article className={'ax97-faq-item'+(expanded?' is-open':'')} key={question}>
      <h3><button type="button" aria-expanded={expanded} aria-controls={'ax97-faq-answer-'+i} onClick={()=>setOpen(expanded?null:i)}>
       <span className="ax97-faq-index">{String(i+1).padStart(2,'0')}</span><span className="ax97-faq-question">{question}</span>
       <span className="ax97-faq-symbol" aria-hidden="true">{expanded?'−':'+'}</span>
      </button></h3>
      <div id={'ax97-faq-answer-'+i} className="ax97-faq-answer" aria-hidden={!expanded}><div><p>{answer}</p></div></div>
     </article>})}</div>
    <div className="ax97-faq-help"><span>Still have questions?</span><Link to="/help">Visit Help Center <Icon name="arrowUpRight" size={16}/></Link></div>
   </div>
  </section>
 </main></SiteShell>
}