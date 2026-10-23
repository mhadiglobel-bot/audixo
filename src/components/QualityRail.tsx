import type {CSSProperties} from 'react'

export const bitrateSteps=[64,128,192,256,320] as const
export type Mp3Bitrate=(typeof bitrateSteps)[number]

/** Visual scale is NOT a list of downloadable formats. The authoritative set
 * always comes from /api/preview and is supplied via `available`.
 */
export const videoScale=[
 {value:'240',label:'240p',detail:'SD'},
 {value:'360',label:'360p',detail:'SD'},
 {value:'480',label:'480p',detail:'SD'},
 {value:'720',label:'720p',detail:'HD'},
 {value:'1080',label:'1080p',detail:'Full HD'},
 {value:'1440',label:'1440p',detail:'QHD'},
 {value:'2160',label:'2160p',detail:'4K'}
] as const
const LABELS:Record<string,string>=Object.fromEntries(videoScale.map(item=>[item.value,item.detail]))
export type AvailableVideoQuality={value:string;label:string}
export function confirmedVideoOptions(available:AvailableVideoQuality[]):AvailableVideoQuality[]{
 const set=new Set<string>()
 for(const item of Array.isArray(available)?available:[]){
  if(!item||typeof item.value!=='string')continue
  const value=item.value.trim().replace(/p$/i,'')
  if(Object.prototype.hasOwnProperty.call(LABELS,value))set.add(value)
 }
 return videoScale.filter(item=>set.has(item.value)).map(({value,label})=>({value,label}))
}
export function highestConfirmedQuality(available:AvailableVideoQuality[]):string{
 const options=confirmedVideoOptions(available)
 return options.length?options[options.length-1].value:''
}

type Selection={label:string;name:string;detail?:string}
function QualitySlider({items,index,onChange,disabled=false,ariaLabel}:{items:Selection[];index:number;onChange:(index:number)=>void;disabled?:boolean;ariaLabel:string}){
 if(!items.length)return null
 const chosen=index>=0&&index<items.length
 const fill=chosen&&items.length>1?index/(items.length-1)*100:0
 const css={'--ax46-progress':`${fill}%`} as CSSProperties
 return <div className={`ax46-slider ${disabled?'is-disabled':''} ${items.length===1?'is-single':''}`} style={css}>
  <div className="ax46-slider-track" aria-hidden="true"><span className="ax46-slider-fill"/></div>
  {chosen&&<input className="ax46-slider-input" type="range" min={0} max={items.length-1} step={1} value={index} disabled={disabled||items.length===1} aria-label={ariaLabel} aria-valuetext={items[index].label} onChange={(e:{currentTarget:{value:string}})=>{const i=Number(e.currentTarget.value);if(i>=0&&i<items.length)onChange(i)}}/>}
  <div className="ax46-slider-options" role="group" aria-label={`${ariaLabel} shortcuts`}>
   {items.map((item,i)=><button type="button" key={item.name} disabled={disabled} aria-pressed={index===i} className={index===i?'selected':''} title={item.detail||item.name} onClick={()=>onChange(i)}><strong>{item.label}</strong>{item.detail&&<small>{item.detail}</small>}</button>)}
  </div>
 </div>
}

/** Keep AUDIXO's familiar 7-mark, neon slider while restricting changes to
 * resolutions actually reported by the upstream preview. We NEVER assume that
 * 480p is downloadable just because the original reaches 1080p: the AUDIXO private
 * worker needs either an exact stream or explicit transcoding support.
 */
export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:AvailableVideoQuality[];analyzed:boolean;disabled?:boolean}){
 const availableOptions=confirmedVideoOptions(available)
 const confirmed=new Set(availableOptions.map(item=>item.value))
 const maximum=highestConfirmedQuality(availableOptions)
 const maxIndex=videoScale.findIndex(item=>item.value===maximum)
 const selectedIndex=videoScale.findIndex(item=>item.value===quality&&confirmed.has(item.value))
 const selected=selectedIndex>=0?videoScale[selectedIndex]:null
 const progress=selectedIndex>=0?selectedIndex/(videoScale.length-1)*100:0
 const maximumPosition=maxIndex>=0?maxIndex/(videoScale.length-1)*100:0
 const showSlider=analyzed&&confirmed.size>0
 const note=!analyzed
  ?'Analyze a YouTube link to detect the video’s maximum downloadable quality.'
  :!confirmed.size
   ?'No downloadable MP4 resolutions were reported for this video. MP3 may still be available.'
   :`Maximum reported quality: ${maximum}p. Higher resolutions are locked; choose a lower highlighted quality if available.`
 const style={'--ax46-progress':`${progress}%`,'--ax54-maximum':`${maximumPosition}%`} as CSSProperties
 return <section className="ax46-quality-panel" aria-label="MP4 video quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">VIDEO RESOLUTION</span><h3>{selected?selected.label:analyzed?'No MP4 quality':'Analyze video'} {selected&&<small>{selected.detail}</small>}</h3><p role={!confirmed.size&&analyzed?'status':undefined}>{note}</p></div><span className="ax46-quality-chip">{maximum?`MAX ${maximum}p`:'MP4 VIDEO'}</span></div>
  <div className={`ax46-slider ax54-video-scale ${!showSlider||disabled?'is-disabled':''} ${!showSlider?'is-unavailable':''}`} style={style}>
   <div className="ax46-slider-track" aria-hidden="true"><span className="ax46-slider-fill"/><span className="ax54-unavailable-band"/></div>
   {showSlider&&selectedIndex>=0&&<input className="ax46-slider-input" type="range" min={0} max={videoScale.length-1} step={1} value={selectedIndex} disabled={disabled} aria-label="Video resolution" aria-valuetext={selected?`${selected.label}, max ${maximum}p`:'No quality available'} onChange={(e:{currentTarget:{value:string}})=>{
    const position=Number(e.currentTarget.value)
    const candidate=videoScale[position]
    if(candidate&&confirmed.has(candidate.value)&&!disabled)onChange(candidate.value)
   }}/> }
   <div className="ax46-slider-options" role="group" aria-label="MP4 resolutions">
    {videoScale.map((item,i)=>{
     const allowed=confirmed.has(item.value)&&showSlider&&!disabled
     const aboveMaximum=maxIndex>=0&&i>maxIndex
     return <button type="button" key={item.value} disabled={!allowed} aria-pressed={selectedIndex===i} className={`${selectedIndex===i?'selected ':''}${allowed?'is-offered ':''}${aboveMaximum?'is-over-limit ':' '}`} title={allowed?`Download at ${item.label}`:aboveMaximum?`${item.label} exceeds the reported maximum ${maximum}p`:`${item.label} not confirmed by the conversion server`} onClick={()=>{if(allowed)onChange(item.value)}}><strong>{item.label}</strong><small>{item.detail}</small></button>
    })}
   </div>
  </div>
  {showSlider&&<p className="ax54-quality-hint">Only highlighted resolutions are downloadable. Selecting a smaller resolution never increases the source quality.</p>}
 </section>
}
export function Mp3QualityRail({bitrate,onChange,duration,disabled=false}:{bitrate:Mp3Bitrate;onChange:(v:Mp3Bitrate)=>void;duration:number;disabled?:boolean}){
 const index=bitrateSteps.indexOf(bitrate)
 const detail='The AUDIXO media worker encodes the selected bitrate and verifies the final MP3 file.'
 return <section className="ax46-quality-panel" aria-label="MP3 audio quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">AUDIO BITRATE</span><h3>{bitrate} <small>kbps target</small></h3><p>{detail}</p></div><span className="ax46-quality-chip">MP3 AUDIO</span></div>
  <QualitySlider items={bitrateSteps.map(value=>({label:String(value),name:String(value),detail:'kbps'}))} index={index} disabled={disabled} onChange={i=>onChange(bitrateSteps[i])} ariaLabel="MP3 bitrate"/>
 </section>
}
