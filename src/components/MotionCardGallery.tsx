import { useMemo,useState } from 'react'
import { Link } from 'react-router-dom'
import type { CSSProperties,MouseEvent as ReactMouseEvent,ReactNode } from 'react'

type Item={tag:string;title:string;note:string;metric:string;glyph:string}
type Pin={item:Item;key:string;rect:{left:number;top:number;width:number;height:number};closing?:boolean}|null

const top:Item[]=[
 {tag:'EDIT',title:'Trim Audio',note:'Keep the exact seconds you want while the original source stays visible.',metric:'Edge handles + exact time',glyph:'trim'},
 {tag:'SPACE',title:'Echo & Delay',note:'Shape repeats with separate delay, wet mix and feedback.',metric:'Delay · wet · feedback',glyph:'echo'},
 {tag:'STYLE',title:'Slowed + Reverb',note:'Slow the moment, preserve pitch when needed and add controlled space.',metric:'Speed · pitch lock · room',glyph:'slow'},
 {tag:'LAYERS',title:'Vocal Stems',note:'Split vocals, music, drums, bass and other into playable layers.',metric:'5 source views',glyph:'layers'},
 {tag:'TONE',title:'Pitch',note:'Move the voice or music deeper or brighter in semitone steps.',metric:'−12 to +12 semitones',glyph:'pitch'},
 {tag:'VOICE',title:'Voice Polish',note:'Add warmth, clarity and control without opening a plugin wall.',metric:'Tone · dynamics',glyph:'voice'},
]
const bottom:Item[]=[
 {tag:'MOTION',title:'8D / 16D Motion',note:'Move sound across the stereo field with adjustable depth and orbit speed.',metric:'Depth · orbit',glyph:'motion'},
 {tag:'TONE',title:'EQ & Bass',note:'Shape lows, mids and highs with controls that read like plain language.',metric:'3-band tone',glyph:'eq'},
 {tag:'MIX',title:'Fade Designer',note:'Create clean entrances and exits while seeing exactly where the fade lives.',metric:'Fade in · fade out',glyph:'fade'},
 {tag:'TIME',title:'Speed Control',note:'Slow down or speed up playback with optional pitch lock.',metric:'0.50×–1.60×',glyph:'speed'},
 {tag:'EXPORT',title:'MP3 / WAV',note:'Finish at the quality you choose and keep a local library copy.',metric:'Up to 320 kbps',glyph:'export'},
 {tag:'LIBRARY',title:'Saved Mixes',note:'Preview, reopen, remove or download finished audio again.',metric:'Local browser library',glyph:'library'},
]

const routes:Record<string,string>={
 'Trim Audio':'/tools/trim-audio','Echo & Delay':'/tools/echo','Slowed + Reverb':'/tools/slowed-reverb',
 'Vocal Stems':'/tools/vocals','Pitch':'/tools/pitch','Voice Polish':'/editor',
 '8D / 16D Motion':'/tools/spatial-motion','EQ & Bass':'/editor','Fade Designer':'/editor',
 'Speed Control':'/editor','MP3 / WAV':'/editor','Saved Mixes':'/library'
}
function toolUrl(item:Item){return routes[item.title]||'/editor'}

function NeonGlyph({name}:{name:string}){
 const common={fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}
 let body:ReactNode
 if(name==='trim')body=<><path {...common} d="M6 9h12M6 15h12"/><circle {...common} cx="9" cy="9" r="2"/><circle {...common} cx="15" cy="15" r="2"/></>
 else if(name==='echo')body=<><path {...common} d="M6 8c3-3 9-3 12 0M8 12c2-2 6-2 8 0M10 16c1-1 3-1 4 0"/><path {...common} d="M5 18h14"/></>
 else if(name==='slow')body=<><circle {...common} cx="12" cy="12" r="7"/><path {...common} d="M12 8v5l3 2M5 7l2-2"/></>
 else if(name==='layers')body=<><path {...common} d="m5 8 7-4 7 4-7 4-7-4Zm0 4 7 4 7-4M5 16l7 4 7-4"/></>
 else if(name==='pitch')body=<><path {...common} d="M8 18V6m0 0L5 9m3-3 3 3M16 6v12m0 0-3-3m3 3 3-3"/></>
 else if(name==='voice')body=<><rect {...common} x="9" y="4" width="6" height="10" rx="3"/><path {...common} d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"/></>
 else if(name==='motion')body=<path {...common} d="M5 12c2.5-5 5.5-5 7 0s4.5 5 7 0-2.5-5-7 0-4.5 5-7 0Z"/>
 else if(name==='eq')body=<><path {...common} d="M7 5v14M12 5v14M17 5v14"/><circle {...common} cx="7" cy="10" r="2"/><circle {...common} cx="12" cy="15" r="2"/><circle {...common} cx="17" cy="8" r="2"/></>
 else if(name==='fade')body=<><path {...common} d="M5 18h14V6L5 18Z"/><path {...common} d="M6 15h3m-2-3h5m-3-3h6"/></>
 else if(name==='speed')body=<><path d="m9 7 8 5-8 5V7Z" fill="currentColor"/><path {...common} d="M5 7v10"/></>
 else if(name==='export')body=<><path {...common} d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/></>
 else body=<><rect {...common} x="5" y="6" width="14" height="12" rx="2"/><path {...common} d="M8 9h8M8 13h5"/></>
 return <svg viewBox="0 0 24 24" aria-hidden="true">{body}</svg>
}

function Card({item,cardKey,pinnedKey,onPin}:{item:Item;cardKey:string;pinnedKey?:string;onPin:(event:ReactMouseEvent<HTMLElement>,item:Item,key:string)=>void}){
 const index=Number(cardKey.split('-').pop())||0
 const style={'--accent-index':index%4,'--card-w':`${326+(index%3)*34}px`,'--card-h':`${238+(index%3)*14}px`} as CSSProperties
 return <article className={`ax27-motion-card ${pinnedKey===cardKey?'is-pin-source':''}`} style={style} onMouseEnter={e=>onPin(e,item,cardKey)}>
  <Link to={toolUrl(item)} className="ax40-motion-link" aria-label={`Open ${item.title} in AUDIXO`}>
   <div className="ax27-motion-card-inner"><div className="ax27-motion-glyph ax33-neon-glyph"><NeonGlyph name={item.glyph}/></div><small>{item.tag}</small><h3>{item.title}</h3><p>{item.note}</p><span>{item.metric}</span></div>
  </Link>
 </article>
}
function Lane({items,reverse=false,pin,onPin}:{items:Item[];reverse?:boolean;pin:Pin;onPin:(event:ReactMouseEvent<HTMLElement>,item:Item,key:string)=>void}){
 const copies=useMemo(()=>[0,1],[])
 return <div className={`ax27-motion-lane ${reverse?'reverse':''}`}><div className="ax27-motion-belt">{copies.map(copy=><div className="ax27-motion-group" key={copy}>{items.map((item,i)=><Card key={`${copy}-${i}`} cardKey={`${reverse?'r':'f'}-${copy}-${i}`} item={item} pinnedKey={pin?.key} onPin={onPin}/>)}</div>)}</div></div>
}

export default function MotionCardGallery(){
 const [pin,setPin]=useState<Pin>(null)
 const onPin=(event:ReactMouseEvent<HTMLElement>,item:Item,key:string)=>{const r=event.currentTarget.getBoundingClientRect();setPin({item,key,rect:{left:r.left,top:r.top,width:r.width,height:r.height}})}
 const release=()=>{setPin(current=>current?{...current,closing:true}:current);window.setTimeout(()=>setPin(current=>current?.closing?null:current),360)}
 return <section className="ax27-motion-gallery ax33-motion-gallery" aria-label="Audixo tools in motion"><Lane items={top} pin={pin} onPin={onPin}/><Lane items={bottom} reverse pin={pin} onPin={onPin}/>{pin&&<article className={`ax27-pinned-card ${pin.closing?'is-closing':''}`} style={{left:pin.rect.left,top:pin.rect.top,width:pin.rect.width,height:pin.rect.height} as CSSProperties} onMouseLeave={release}><div className="ax27-motion-card-inner"><div className="ax27-motion-glyph ax33-neon-glyph"><NeonGlyph name={pin.item.glyph}/></div><small>{pin.item.tag}</small><h3>{pin.item.title}</h3><p>{pin.item.note}</p><span>{pin.item.metric}</span><Link to={toolUrl(pin.item)} className="ax40-pin-link">Open tool ↗</Link></div></article>}</section>
}
