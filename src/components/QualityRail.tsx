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

/** AUDIXO quality controls: one elegant stepped rail for audio and video.
 * MP3 is a fixed 320 kbps output target, not a changeable slider.
 * MP4 shows standard resolution milestones; the range ends at the source maximum.
 * A selected resolution is an upper target: the extractor may use a lower available format.
 */
const standardResolutions=[144,240,360,480,720,1080,1440,2160] as const
export function isSelectableVideoTarget(value:string,available:AvailableVideoQuality[]):boolean{
 const n=Number(value),formats=confirmedVideoOptions(available).map(q=>Number(q.value))
 return Number.isFinite(n)&&formats.length>0&&n<=Math.max(...formats)&&formats.some(h=>h<=n)
}
export function Mp3QualityRail({duration}:{bitrate:Mp3Bitrate;onChange:(v:Mp3Bitrate)=>void;duration:number;disabled?:boolean}){
 const bitrate=320
 const approx=duration>0?(duration*bitrate/(8*1024)).toFixed(1):''
 return <section className="ax81-quality-shell" aria-label="MP3 audio quality fixed to 320 kbps">
  <header className="ax81-quality-head"><div><span className="ax81-quality-eyebrow">AUDIO BITRATE</span><h3>320 <small>kbps target</small></h3><p>Maximum MP3 output setting. Encoding at 320 kbps cannot improve low-quality source audio.</p></div><span className="ax81-quality-pill">MP3 AUDIO</span></header>
  <div className="ax81-quality-note"><span>Maximum quality</span><span>{approx?'Approx. '+approx+' MB':'Fixed output · 320 kbps'}</span></div>
  <div className="ax81-slider-shell"><div className="ax81-track" style={{'--ax81-progress':'100%','--ax81-limit':'100%'} as CSSProperties}><span className="ax81-thumb" style={{left:'100%'}}/></div></div>
  <div className="ax81-bitrate-grid" aria-label="Supported MP3 bitrate scale">{bitrateSteps.map(step=><div className={'ax81-choice '+(step===320?'selected':'inactive')} key={step}><strong>{step} <small>kbps</small></strong><span>{audioLabels[step].title}</span></div>)}</div>
 </section>
}
export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:AvailableVideoQuality[];analyzed:boolean;disabled?:boolean}){
 const found=confirmedVideoOptions(available).map(item=>Number(item.value))
 const maxHeight=found.length?Math.max(...found):0
 const ticks=[...new Set<number>([...standardResolutions,...(maxHeight&&!standardResolutions.includes(maxHeight as typeof standardResolutions[number])?[maxHeight]:[])])].sort((a,b)=>a-b)
 const maxIndex=ticks.findIndex(t=>t===maxHeight)
 const index=ticks.findIndex(t=>t===Number(quality))
 const limit=maxIndex>=0?maxIndex/(ticks.length-1)*100:0
 const progress=index>=0?index/(ticks.length-1)*100:0
 const actual=found.filter(h=>h<=Number(quality)).at(-1)
 const accessibleMax=found.length>0&&maxIndex>=0
 return <section className="ax81-quality-shell" aria-label="Source-confirmed MP4 video quality">
  <header className="ax81-quality-head"><div><span className="ax81-quality-eyebrow">VIDEO RESOLUTION</span><h3>{quality?quality+'p':'Select resolution'} <small>{quality?'quality target':'source quality'}</small></h3><p>Choose up to the source’s available quality. Lower source formats are used when the exact target is unavailable.</p></div><span className="ax81-quality-pill">MP4 VIDEO</span></header>
  <div className="ax81-quality-note"><span>Source-verified resolutions</span><span>{maxHeight?'Maximum video quality: '+maxHeight+'p':'Analyze a link first'}</span></div>
  {accessibleMax&&<div className="ax81-slider-shell">
   <div className="ax81-track" style={{'--ax81-progress':progress+'%','--ax81-limit':limit+'%'} as CSSProperties}>
    <span className="ax81-thumb" style={{left:progress+'%'}}/>
    <input type="range" aria-label="MP4 video resolution" aria-valuetext={quality+'p target; maximum '+maxHeight+'p'} min={0} max={maxIndex} step={1} value={index>=0?Math.min(index,maxIndex):maxIndex} disabled={disabled||maxIndex===0}
     style={{width:(limit||0)+'%'}} onChange={e=>onChange(String(ticks[Number(e.currentTarget.value)]))}/>
   </div>
  </div>}
  {accessibleMax&&<div className="ax81-resolution-grid" role="group" aria-label="Available quality targets">{ticks.map(h=>{
    const allowed=h<=maxHeight&&found.some(a=>a<=h)
    const chosen=h===Number(quality)
    return <button type="button" key={h} className={'ax81-choice '+(chosen?'selected':'')+(allowed?'':' unavailable')} aria-pressed={chosen} disabled={disabled||!allowed} onClick={()=>onChange(String(h))}><strong>{h}p</strong><span>{h===maxHeight?'Source max':descriptor(h)}</span></button>
   })}</div>}
  {accessibleMax&&<div className="ax81-quality-foot">{actual&&actual<Number(quality)?'Selected target: '+quality+'p · available stream: '+actual+'p':'Maximum video quality available: '+maxHeight+'p'}</div>}
  {!accessibleMax&&analyzed&&<p className="ax81-quality-empty">This source did not return a playable MP4 resolution.</p>}
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
