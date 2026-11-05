/** AUDIXO V59: user-facing MP3 targets and source-verified MP4 formats.
 * No assumed MP4 resolutions, no silent upscaling or file transcoding.
 */
import type {CSSProperties, KeyboardEvent as ReactKeyboardEvent} from 'react'
export const bitrateSteps=[64,128,192,256,320] as const
export type Mp3Bitrate=(typeof bitrateSteps)[number]
export type AvailableVideoQuality={value:string;label:string}
const validVideo=(value:string)=>/^\d{2,4}$/.test(value)&&Number(value)>=144&&Number(value)<=4320
export function confirmedVideoOptions(available:AvailableVideoQuality[]):AvailableVideoQuality[]{
 if(!Array.isArray(available))return []
 const values=new Set<string>()
 for(const item of available){const value=String(item?.value||'').replace(/p$/i,'').trim();if(validVideo(value))values.add(value)}
 return [...values].sort((a,b)=>Number(a)-Number(b)).map(value=>({value,label:`${value}p`}))
}
export function highestConfirmedQuality(available:AvailableVideoQuality[]){return confirmedVideoOptions(available).at(-1)?.value||''}

/** AUDIXO quality controls: one elegant stepped rail for audio and video.
 * MP3 is a fixed 320 kbps output target, not a changeable slider.
 * MP4 shows standard resolution milestones; the range ends at the source maximum.
 * A selected resolution is an upper target: the extractor may use a lower available format.
 */
export function isSelectableVideoTarget(value:string,available:AvailableVideoQuality[]):boolean{return confirmedVideoOptions(available).some(o=>o.value===value)}

/* V82: truthful output bitrate, source-verified video quality. */
export function Mp3QualityRail({duration,disabled=false}:{bitrate:Mp3Bitrate;onChange:(v:Mp3Bitrate)=>void;duration:number;disabled?:boolean}){
 const [displayIndex,setDisplayIndex]=useState(4),progress=displayIndex*25
 return <section className="ax82-quality" aria-label="MP3 audio quality">
  <header><div><small>MP3 AUDIO</small><h3>320 <span>kbps output</span></h3><p>Final MP3 always uses a 320 kbps encoding target; the movable scale is a visual preview only.</p></div><b>AUDIO</b></header>
  <div className="ax82-rail" style={{'--ax82-progress':progress+'%'} as CSSProperties}>
   <input type="range" min="0" max="4" step="1" value={displayIndex} disabled={disabled} aria-label="Preview bitrate scale (output remains 320 kbps)" onChange={e=>setDisplayIndex(Number(e.target.value))}/>
   <div className="ax82-ticks" aria-hidden="true">{bitrateSteps.map((v,i)=><span key={v} className={i===displayIndex?'active':''}><i/><strong>{v}</strong></span>)}</div>
  </div>
  <footer>Maximum export quality: <strong>320 kbps</strong>{duration>0&&<span> · Approx. {(duration*320/8192).toFixed(1)} MB</span>}</footer>
 </section>
}
export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:AvailableVideoQuality[];analyzed:boolean;disabled?:boolean}){
 const options=confirmedVideoOptions(available),max=options.length-1
 const selected=Math.max(0,options.findIndex(o=>o.value===quality)),pct=max>0?selected/max*100:100
 return <section className="ax82-quality" aria-label="MP4 quality selector">
  <header><div><small>MP4 VIDEO</small><h3>{quality?quality+'p':'Analyze first'} <span>{quality?'exact resolution':'video quality'}</span></h3><p>Select an actual resolution verified in the available source formats.</p></div><b>VIDEO</b></header>
  {options.length>0&&<>
   <div className="ax82-rail" style={{'--ax82-progress':pct+'%'} as CSSProperties}>
    <input type="range" min="0" max={Math.max(0,max)} step="1" value={selected} disabled={disabled||max===0} aria-label="MP4 resolution" aria-valuetext={quality+'p selected; '+options[max]?.value+'p maximum'} onChange={e=>onChange(options[Number(e.target.value)].value)}/>
    <div className="ax82-ticks" aria-hidden="true">{options.map((o,i)=><span key={o.value} className={i===selected?'active':''}><i/><strong>{o.value}p</strong></span>)}</div>
   </div>
   <footer>Maximum source resolution: <strong>{options[max]?.value}p</strong></footer>
  </>}
  {analyzed&&!options.length&&<p>This source provided no usable MP4 resolution.</p>}
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
