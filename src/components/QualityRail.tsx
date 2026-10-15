import type {CSSProperties} from 'react'

export const bitrateSteps=[64,128,192,256,320] as const
export type Mp3Bitrate=(typeof bitrateSteps)[number]
const videoSteps=[
 {value:'240',title:'240p',quality:'SD'},
 {value:'360',title:'360p',quality:'SD'},
 {value:'480',title:'480p',quality:'SD'},
 {value:'720',title:'720p',quality:'HD'},
 {value:'1080',title:'1080p',quality:'Full HD'},
 {value:'1440',title:'1440p',quality:'QHD'},
 {value:'2160',title:'2160p',quality:'4K'},
] as const

type Selection={label:string;name:string;detail?:string}

function QualitySlider({items,index,onChange,disabled=false,ariaLabel}:{items:Selection[];index:number;onChange:(index:number)=>void;disabled?:boolean;ariaLabel:string}){
 const fill=items.length>1?index/(items.length-1)*100:0
 const css={'--ax46-progress':`${fill}%`} as CSSProperties
 return <div className={`ax46-slider ${disabled?'is-disabled':''}`} style={css}>
  <div className="ax46-slider-track" aria-hidden="true"><span className="ax46-slider-fill"/></div>
  <input className="ax46-slider-input" type="range" min={0} max={items.length-1} step={1} value={index} disabled={disabled} aria-label={ariaLabel} aria-valuetext={items[index]?.label||''} onChange={e=>onChange(Number(e.currentTarget.value))}/>
  <div className="ax46-slider-options" role="group" aria-label={`${ariaLabel} shortcuts`}>
   {items.map((item,i)=><button type="button" key={item.name} disabled={disabled} aria-pressed={index===i} className={index===i?'selected':''} title={item.detail||item.name} onClick={()=>onChange(i)}><strong>{item.label}</strong>{item.detail&&<small>{item.detail}</small>}</button>)}
  </div>
 </div>
}

export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:{value:string;label:string}[];analyzed:boolean;disabled?:boolean}){
 const index=Math.max(0,videoSteps.findIndex(step=>step.value===quality))
 const selected=videoSteps[index]
 const supported=new Set(available.map(q=>String(q.value).replace(/p$/i,'')))
 const hasMetadata=supported.size>0
 const supportedHere=supported.has(selected.value)
 const detail=!analyzed?'Analyze a link to choose resolution.':!hasMetadata?'The server will check this resolution.':supportedHere?'Available for this video.':'Not listed for this video. Select an available resolution.'
 return <section className="ax46-quality-panel" aria-label="MP4 video quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">VIDEO RESOLUTION</span><h3>{selected.title} <small>{selected.quality}</small></h3><p>{detail}</p></div><span className="ax46-quality-chip">MP4 VIDEO</span></div>
  <QualitySlider items={videoSteps.map(step=>({label:step.title,name:step.value,detail:step.quality}))} index={index} disabled={!analyzed||disabled} onChange={i=>onChange(videoSteps[i].value)} ariaLabel="Video resolution"/>
 </section>
}

export function Mp3QualityRail({bitrate,onChange,duration,disabled=false}:{bitrate:Mp3Bitrate;onChange:(v:Mp3Bitrate)=>void;duration:number;disabled?:boolean}){
 const index=Math.max(0,bitrateSteps.indexOf(bitrate))
 const local=duration>0&&duration<=300
 const detail=local?'Short clips are encoded on this device at the selected bitrate.':bitrate===320?'Long files use the server MP3 encoder.':'Local encoding supports clips up to five minutes.'
 return <section className="ax46-quality-panel" aria-label="MP3 audio quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">AUDIO BITRATE</span><h3>{bitrate} <small>kbps</small></h3><p>{detail}</p></div><span className="ax46-quality-chip">MP3 AUDIO</span></div>
  <QualitySlider items={bitrateSteps.map(value=>({label:String(value),name:String(value),detail:'kbps'}))} index={index} disabled={disabled} onChange={i=>onChange(bitrateSteps[i])} ariaLabel="MP3 bitrate"/>
 </section>
}
