/** AUDIXO V59: user-facing MP3 targets and source-verified MP4 formats.
 * No assumed MP4 resolutions, no silent upscaling or file transcoding.
 */
import type {CSSProperties, KeyboardEvent as ReactKeyboardEvent} from 'react'
export const bitrateSteps=[64,128,192,256,320] as const
export type Mp3Bitrate=(typeof bitrateSteps)[number]
export type AvailableVideoQuality={value:string;label:string}
const validVideo=(value:string)=>/^\d{2,4}$/.test(value)&&Number(value)>=144&&Number(value)<=4320
const descriptor=(value:number)=>value>=4320?'8K UHD':value>=2160?'4K UHD':value>=1440?'QHD':value>=1080?'Full HD':value>=720?'HD':'Standard'
export function confirmedVideoOptions(available:AvailableVideoQuality[]):AvailableVideoQuality[]{
 if(!Array.isArray(available))return []
 const values=new Set<string>()
 for(const item of available){const value=String(item?.value||'').replace(/p$/i,'').trim();if(validVideo(value))values.add(value)}
 return [...values].sort((a,b)=>Number(a)-Number(b)).map(value=>({value,label:`${value}p`}))
}
export function highestConfirmedQuality(available:AvailableVideoQuality[]){return confirmedVideoOptions(available).at(-1)?.value||''}
const audioLabels:Record<Mp3Bitrate,{title:string;detail:string}>={
 64:{title:'Compact',detail:'Voice / small file'},128:{title:'Standard',detail:'Everyday listening'},192:{title:'Balanced',detail:'Music / sharing'},256:{title:'High',detail:'Detailed listening'},320:{title:'Maximum',detail:'Highest output target'}
}
export function Mp3QualityRail({bitrate,onChange,duration,disabled=false}:{bitrate:Mp3Bitrate;onChange:(v:Mp3Bitrate)=>void;duration:number;disabled?:boolean}){
 const index=Math.max(0,bitrateSteps.indexOf(bitrate))
 const percent=index/(bitrateSteps.length-1)*100
 const size=duration>0?(duration*bitrate/(8*1024)).toFixed(1):''
 return <section className="ax46-quality-panel ax59-audio-panel" aria-label="MP3 audio quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">AUDIO BITRATE</span><h3>{bitrate} <small>kbps target</small></h3><p>The MP3 encoder targets your selected bitrate. A higher output bitrate cannot restore lost source detail.</p></div><span className="ax46-quality-chip">MP3 AUDIO</span></div>
  <div className="ax59-quality-pick"><div className="ax59-quality-summary"><span>{audioLabels[bitrate].title} quality</span><span>{size?`Approx. ${size} MB · based on duration`:'Choose your output size & quality'}</span></div>
   <div className="ax59-bitrate-track" style={{'--ax59-fill':`${percent}%`} as CSSProperties}>
    <input type="range" min="0" max="4" step="1" value={index} disabled={disabled} aria-label="MP3 bitrate" aria-valuetext={`${bitrate} kilobits per second, ${audioLabels[bitrate].title}`} onChange={e=>onChange(bitrateSteps[Number(e.currentTarget.value)])}/>
   </div>
   <div className="ax59-bitrate-buttons" role="group" aria-label="Choose MP3 bitrate">{bitrateSteps.map(k=><button key={k} type="button" className={k===bitrate?'selected':''} aria-pressed={k===bitrate} disabled={disabled} onClick={()=>onChange(k)}><strong>{k} <small>kbps</small></strong><span>{audioLabels[k].title}</span></button>)}</div>
  </div>
 </section>
}
export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:AvailableVideoQuality[];analyzed:boolean;disabled?:boolean}){
 const options=confirmedVideoOptions(available),selected=options.find(q=>q.value===quality)
 const index=options.findIndex(q=>q.value===quality)
 const hint=!analyzed?'Analyze a video to load source-confirmed resolutions, or select a local MP4 file.':!options.length?'No MP4 source resolutions were confirmed.':'Only source-reported resolutions are shown. Final availability depends on the source platform and the Vercel runtime.'
 return <section className="ax46-quality-panel ax59-video-panel" aria-label="MP4 video quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">VIDEO RESOLUTION</span><h3>{selected?selected.label:analyzed?'No MP4 format':'Analyze video'} {selected&&<small>{descriptor(Number(selected.value))}</small>}</h3><p role={analyzed&&!options.length?'status':undefined}>{hint}</p></div><span className="ax46-quality-chip">{options.length?`${options.length} FORMAT${options.length===1?'':'S'}`:'MP4 VIDEO'}</span></div>
  {options.length>0&&<div className="ax59-quality-pick"><div className="ax59-quality-summary"><span>Confirmed resolutions</span><span>Max {options.at(-1)?.label}</span></div>
   {options.length>1&&<div className="ax59-bitrate-track" style={{'--ax59-fill':`${index/(options.length-1)*100}%`} as CSSProperties}><input type="range" min="0" max={options.length-1} step="1" value={Math.max(0,index)} disabled={disabled} aria-label="MP4 resolution" aria-valuetext={selected?.label||'No resolution'} onChange={e=>onChange(options[Number(e.currentTarget.value)].value)}/></div>}
   <div className="ax59-video-buttons" role="group" aria-label="Available MP4 resolutions">{options.map(o=><button key={o.value} type="button" className={o.value===quality?'selected':''} aria-pressed={o.value===quality} disabled={disabled} onClick={()=>onChange(o.value)}><strong>{o.label}</strong><span>{descriptor(Number(o.value))}</span></button>)}</div>
  </div>}
  {analyzed&&!options.length&&<div className="ax59-no-formats" role="status">No video resolutions were returned. Try another video or use a local MP4 file.</div>}
 </section>
}

/** AUDIXO V70 branded, accessible select menu. No operating-system blue menu. */
import {useEffect,useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
export type AudixoChoice={value:string;label:string}
export function AudixoSelect({value,options,onChange,ariaLabel,className='',disabled=false}:{value:string;options:AudixoChoice[];onChange:(value:string)=>void;ariaLabel:string;className?:string;disabled?:boolean}){
 const [open,setOpen]=useState(false),[place,setPlace]=useState({top:0,left:0,width:120,maxHeight:260})
 const anchor=useRef<HTMLButtonElement|null>(null),popup=useRef<HTMLDivElement|null>(null)
 const listId=useId(),selected=options.find(o=>o.value===value)
 const show=()=>{
  if(disabled)return
  const b=anchor.current?.getBoundingClientRect();if(!b)return
  const maxHeight=Math.min(280,Math.max(112,window.innerHeight-32))
  const estimated=Math.min(maxHeight,options.length*43+14)
  const above=(window.innerHeight-b.bottom<estimated+10)&&(b.top>estimated+10)
  const width=Math.max(146,Math.ceil(b.width))
  setPlace({top:Math.max(8,Math.min(window.innerHeight-estimated-8,above?b.top-estimated-7:b.bottom+7)),left:Math.max(8,Math.min(window.innerWidth-width-8,b.left)),width,maxHeight})
  setOpen(true)
  window.requestAnimationFrame(()=>popup.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus())
 }
 useEffect(()=>{
  if(!open)return
  const onPointer=(e:PointerEvent)=>{const target=e.target as Node;if(!anchor.current?.contains(target)&&!popup.current?.contains(target))setOpen(false)}
  const onScroll=(e:Event)=>{if(popup.current?.contains(e.target as Node))return;setOpen(false)}
  const onResize=()=>setOpen(false)
  document.addEventListener('pointerdown',onPointer,true);window.addEventListener('scroll',onScroll,true);window.addEventListener('resize',onResize)
  return()=>{document.removeEventListener('pointerdown',onPointer,true);window.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',onResize)}
 },[open])
 const choose=(next:string)=>{onChange(next);setOpen(false);anchor.current?.focus()}
 const keyboard=(e:ReactKeyboardEvent)=>{
  if(e.key==='Escape'){setOpen(false);anchor.current?.focus();e.preventDefault();return}
  if((e.key==='ArrowDown'||e.key==='ArrowUp')&&options.length){
   e.preventDefault();if(!open){show();return}
   const current=options.findIndex(o=>o.value===value)
   choose(options[(current+(e.key==='ArrowDown'?1:options.length-1))%options.length]?.value??value)
  }
  if(e.key==='Enter'&&open){e.preventDefault();setOpen(false)}
 }
 return <span className={`ax70-select ${open?'is-open':''} ${className}`}>
  <button ref={anchor} type="button" className="ax70-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-controls={open?listId:undefined} aria-expanded={open} disabled={disabled} onClick={()=>open?setOpen(false):show()} onKeyDown={keyboard}>
   <span>{selected?.label??value}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </button>
  {open&&typeof document!=='undefined'&&createPortal(<div ref={popup} id={listId} className="ax70-select-popup" role="listbox" aria-label={ariaLabel} style={{position:'fixed',top:place.top,left:place.left,minWidth:place.width,maxHeight:place.maxHeight}} onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();setOpen(false);anchor.current?.focus();return}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){
    e.preventDefault();const opts=Array.from(popup.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')??[])
    if(!opts.length)return;const current=opts.indexOf(document.activeElement as HTMLButtonElement)
    const next=e.key==='Home'?0:e.key==='End'?opts.length-1:(current+(e.key==='ArrowDown'?1:opts.length-1))%opts.length
    opts[next]?.focus()
   }
  }}>
   {options.map(o=><button type="button" key={o.value} role="option" aria-selected={o.value===value} className={o.value===value?'selected':''} onClick={()=>choose(o.value)}><span>{o.label}</span><i aria-hidden="true">{o.value===value?'✓':''}</i></button>)}
  </div>,document.body)}
 </span>
}
