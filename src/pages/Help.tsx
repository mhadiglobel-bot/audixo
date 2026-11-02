import { useMemo,useState } from 'react'
import type { CSSProperties,MouseEvent as ReactMouseEvent } from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'

type HelpItem={title:string;body:string;tag:string}
type Pin={item:HelpItem;rect:{left:number;top:number;width:number;height:number};closing?:boolean}|null
const help:HelpItem[]=[
 {tag:'AI',title:'Local AI will not start',body:'Use recent desktop Chrome or Edge. Audixo tries WebGPU first and then the free WASM path. A stalled engine is stopped instead of spinning forever.'},
 {tag:'TRIM',title:'Need original-quality long cuts',body:'Use Trim Audio for edge cuts and keep processing controls neutral when you only need a clean section.'},
 {tag:'REC',title:'Recording is unavailable',body:'Open Audixo over HTTPS and allow microphone access in both the browser and operating system.'},
 {tag:'IMPORT',title:'Audio will not import',body:'MP3 and PCM WAV are the most reliable. Some M4A, AAC, OGG and FLAC codecs vary by browser and device.'},
 {tag:'FX',title:'Preview changed after effects',body:'Render Preview again after changing speed, pitch, echo, reverb or motion. Those controls can change duration and loudness.'},
 {tag:'LEVEL',title:'Export is too loud',body:'Lower the selected section or track level, preview once more, then export again.'},
 {tag:'STEREO',title:'Only one ear has sound',body:'Check pan and stereo repair. Intentional 8D / 16D motion can move energy strongly between left and right.'},
 {tag:'STUDIO',title:'Need more controls',body:'Open the Full Studio when a focused tool no longer gives enough control. Presets remain removable after they are applied.'},
 {tag:'MASHUP',title:'Mashup preview is silent',body:'Make sure every retained section has audible gain, valid trim points and a start position inside the arrangement.'},
 {tag:'TOOLS',title:'Focused tool looks empty',body:'Upload audio first. The cinematic upload state then opens the waveform and only the controls for that task.'},
 {tag:'LIBRARY',title:'Library download missing',body:'Open Library and choose Download to save a finished local mix to the device again.'},
 {tag:'SOURCE',title:'Trimmed audio disappeared',body:'The Full Studio keeps the original source waveform visible behind the bright active trim range.'},
 {tag:'APP',title:'How do I install AUDIXO on mobile?',body:'On Android Chrome or Edge, use Install app when your browser offers it. On iPhone Safari, use Share → Add to Home Screen. Audio conversion and AI models need an internet connection and sufficient device memory.'},
 {tag:'VIDEO',title:'MP4 quality is not available',body:'Run Analyze, then select a resolution reported by the API. If the API returns no quality list, the selection is unverified; the backend may reject it. 2K is 1440p and 4K is 2160p.'},
 {tag:'ECHO',title:'How is Echo different from Reverb?',body:'Echo creates distinct repeated audio using timing, mix and feedback; Reverb creates a continuous spatial tail. They work independently in the Full Studio.'},
]

function HelpCard({item,onPin}:{item:HelpItem;onPin:(e:ReactMouseEvent<HTMLElement>,item:HelpItem)=>void}){return <article className="ax29-help-card" onMouseEnter={e=>onPin(e,item)}><small>{item.tag}</small><h2>{item.title}</h2><p>{item.body}</p></article>}
function Lane({items,reverse,onPin}:{items:HelpItem[];reverse?:boolean;onPin:(e:ReactMouseEvent<HTMLElement>,item:HelpItem)=>void}){return <div className={`ax29-help-lane ${reverse?'reverse':''}`}><div className="ax29-help-belt">{[0,1].map(copy=><div className="ax29-help-group" key={copy}>{items.map((item,i)=><HelpCard key={`${copy}-${i}`} item={item} onPin={onPin}/>)}</div>)}</div></div>}

export default function Help(){
 const [pin,setPin]=useState<Pin>(null),columns=useMemo(()=>[help.filter((_,i)=>i%3===0),help.filter((_,i)=>i%3===1),help.filter((_,i)=>i%3===2)],[])
 const onPin=(e:ReactMouseEvent<HTMLElement>,item:HelpItem)=>{const r=e.currentTarget.getBoundingClientRect();setPin({item,rect:{left:r.left,top:r.top,width:r.width,height:r.height}})}
 const release=()=>{setPin(p=>p?{...p,closing:true}:p);window.setTimeout(()=>setPin(p=>p?.closing?null:p),260)}
 return <SiteShell><Seo title="Help Center" path="/help"/><main className="page-shell ax29-help-page"><section className="v11-page-hero"><div className="eyebrow"><span/> HELP CENTER</div><h1>Common problems.<br/><em>Answers in motion.</em></h1><p>Browse these quick explanations. On desktop you can hover to focus an answer; on mobile every card stays still and easy to read.</p></section><section className="ax29-help-rails">{columns.map((items,i)=><Lane key={i} items={items} reverse={i%2===1} onPin={onPin}/>)}</section>{pin&&<article className={`ax29-help-pin ${pin.closing?'closing':''}`} style={{left:pin.rect.left,top:pin.rect.top,width:pin.rect.width,height:pin.rect.height} as CSSProperties} onMouseLeave={release}><small>{pin.item.tag}</small><h2>{pin.item.title}</h2><p>{pin.item.body}</p></article>}</main></SiteShell>
}
