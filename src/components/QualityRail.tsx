import type {CSSProperties} from 'react'

export const bitrateSteps=[64,128,192,256,320] as const
export type Mp3Bitrate=(typeof bitrateSteps)[number]
const LABELS:Record<string,string>={
 '240':'SD','360':'SD','480':'SD','720':'HD','1080':'Full HD','1440':'QHD','2160':'4K'
}
export type AvailableVideoQuality={value:string;label:string}
export function confirmedVideoOptions(available:AvailableVideoQuality[]):AvailableVideoQuality[]{
 const result=new Set<string>()
 for(const item of available){
  if(!item||typeof item.value!=='string')continue
  const value=item.value.trim().replace(/p$/i,'')
  if(Object.prototype.hasOwnProperty.call(LABELS,value))result.add(value)
 }
 return [...result].sort((a,b)=>Number(a)-Number(b)).map(value=>({value,label:`${value}p`}))
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
export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:AvailableVideoQuality[];analyzed:boolean;disabled?:boolean}){
 const options=confirmedVideoOptions(available)
 const index=options.findIndex(item=>item.value===quality)
 const selected=index>=0?options[index]:null
 const detail=!analyzed?'Analyze a link to see confirmed video resolutions.':!options.length?'No downloadable MP4 resolutions were reported for this video.':selected?'Only resolutions confirmed by the conversion server are shown.':'Select one of the confirmed resolutions.'
 return <section className="ax46-quality-panel" aria-label="MP4 video quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">VIDEO RESOLUTION</span><h3>{selected?selected.label:'No MP4 quality'} {selected&&<small>{LABELS[selected.value]}</small>}</h3><p role={!options.length&&analyzed?'status':undefined}>{detail}</p></div><span className="ax46-quality-chip">MP4 VIDEO</span></div>
  {analyzed&&options.length>0&&<QualitySlider items={options.map(item=>({label:item.label,name:item.value,detail:LABELS[item.value]}))} index={index} disabled={disabled} onChange={i=>onChange(options[i].value)} ariaLabel="Video resolution"/>}
 </section>
}
export function Mp3QualityRail({bitrate,onChange,duration,disabled=false}:{bitrate:Mp3Bitrate;onChange:(v:Mp3Bitrate)=>void;duration:number;disabled?:boolean}){
 const index=bitrateSteps.indexOf(bitrate)
 const local=duration>0&&duration<=300
 const detail=local?'Short clips are encoded on this device at the selected bitrate.':bitrate===320?'Server MP3 rate is confirmed only after conversion.':'Local bitrate encoding supports clips up to five minutes.'
 return <section className="ax46-quality-panel" aria-label="MP3 audio quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">AUDIO BITRATE</span><h3>{bitrate} <small>kbps target</small></h3><p>{detail}</p></div><span className="ax46-quality-chip">MP3 AUDIO</span></div>
  <QualitySlider items={bitrateSteps.map(value=>({label:String(value),name:String(value),detail:'kbps'}))} index={index} disabled={disabled} onChange={i=>onChange(bitrateSteps[i])} ariaLabel="MP3 bitrate"/>
 </section>
}
