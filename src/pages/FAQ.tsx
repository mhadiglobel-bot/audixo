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
 const [open,setOpen]=useState<number|null>(null)
 const [category,setCategory]=useState<'Essentials'|'Editing & effects'|'Export & access'>('Essentials')
 const groups={
  'Essentials':[0,1,2,3,4,5],
  'Editing & effects':[6,7,8,9,10],
  'Export & access':[11,12,13,14]
 }
 const visible=groups[category]
 const schema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
 return <SiteShell><Seo title="AUDIXO FAQ — Easy Audio Editing Answers" description="Frequently asked questions about AUDIXO's audio tools, free editing, exports and sound effects." path="/faq" schema={schema}/>
  <main className="page-shell ax25-faq ax95-faq ax96-faq">
   <header className="ax95-faq-hero ax96-faq-hero"><span className="ax92-eyebrow">QUESTIONS / ANSWERS</span>
    <h1>Questions, answered.<br/><span>Without the noise.</span></h1>
    <p>Clear, practical answers about what AUDIXO does and how to make great edits in your browser.</p>
    <div className="ax96-faq-highlights"><span>JUST THE ESSENTIALS</span><span>EASY TO EXPLORE</span><span>CREATOR FIRST</span></div>
   </header>
   <div className="ax96-faq-main">
    <aside className="ax96-faq-aside"><div className="ax96-faq-vertical" aria-hidden="true">FIND WHAT YOU NEED · KEEP CREATING</div>
     <div className="ax96-faq-aside-copy"><small>QUICK ANSWERS</small><h2>Everything in one place.</h2><p>Choose a topic. Open a question. Return to your music.</p><Link to="/editor">Open Studio <Icon name="arrowUpRight" size={16}/></Link></div>
    </aside>
    <section className="ax96-faq-content">
     <nav className="ax96-faq-categories" aria-label="Frequently asked question topics">
      {(['Essentials','Editing & effects','Export & access'] as const).map(cat=><button key={cat} type="button" aria-pressed={category===cat} className={category===cat?'active':''} onClick={()=>{setCategory(cat);setOpen(null)}}>{cat}</button>)}
     </nav>
     <div className="ax95-faq-list ax96-faq-list" key={category}>
      {visible.map(i=>{const [question,answer]=faqs[i],expanded=open===i;return <article key={question} className={'ax95-faq-item ax96-faq-item'+(expanded?' is-open':'')}>
        <button type="button" aria-expanded={expanded} aria-controls={'ax96-answer-'+i} onClick={()=>setOpen(expanded?null:i)}>
         <span className="ax96-faq-question-num">{String(i+1).padStart(2,'0')}</span><strong>{question}</strong><i aria-hidden="true">{expanded?'−':'+'}</i>
        </button>
        <div id={'ax96-answer-'+i} className="ax95-faq-answer" aria-hidden={!expanded}><div><p>{answer}</p></div></div>
       </article>})}
     </div>
     <div className="ax96-faq-count"><span>{visible.length} answers in this topic</span><span>MORE QUESTIONS? CHOOSE ANOTHER CATEGORY</span></div>
    </section>
   </div>
   <div className="ax96-faq-help"><div><small>NEED A HAND?</small><h2>More answers are one click away.</h2></div><Link to="/help">Help Center <Icon name="arrowUpRight" size={16}/></Link></div>
  </main></SiteShell>
}
