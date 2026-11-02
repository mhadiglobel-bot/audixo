/** AUDIXO V59: user-facing MP3 targets and source-verified MP4 formats.
 * No assumed MP4 resolutions, no silent upscaling or file transcoding.
 */
import type {CSSProperties} from 'react'
export const bitrateSteps=[64,128,192,256,320] as const
export type Mp3Bitrate=(typeof bitrateSteps)[number]
export type AvailableVideoQuality={value:string;label:string}
const allowedVideo=new Set(['144','240','360','480','720','1080','1440','2160','4320'])
const descriptor=(value:number)=>value>=2160?'4K UHD':value>=1440?'QHD':value>=1080?'Full HD':value>=720?'HD':'Standard'
export function confirmedVideoOptions(available:AvailableVideoQuality[]):AvailableVideoQuality[]{
 if(!Array.isArray(available))return []
 const values=new Set<string>()
 for(const item of available){const value=String(item?.value||'').replace(/p$/i,'').trim();if(allowedVideo.has(value))values.add(value)}
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
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">AUDIO BITRATE</span><h3>{bitrate} <small>kbps target</small></h3><p>Actual browser MP3 encoding uses your selected bitrate. A higher output bitrate cannot restore lost source detail.</p></div><span className="ax46-quality-chip">MP3 AUDIO</span></div>
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
 const hint=!analyzed?'Analyze a video to check browser-accessible MP4 formats, or select a local MP4 file.':!options.length?'No browser-accessible MP4 resolution is confirmed. YouTube may block direct downloads.':'These are the exact MP4 formats available to the browser. No artificial 720p / 4K quality is added.'
 return <section className="ax46-quality-panel ax59-video-panel" aria-label="MP4 video quality">
  <div className="ax46-quality-heading"><div><span className="ax46-eyebrow">VIDEO RESOLUTION</span><h3>{selected?selected.label:analyzed?'No direct MP4':'Analyze video'} {selected&&<small>{descriptor(Number(selected.value))}</small>}</h3><p role={analyzed&&!options.length?'status':undefined}>{hint}</p></div><span className="ax46-quality-chip">{options.length?`${options.length} FORMAT${options.length===1?'':'S'}`:'MP4 VIDEO'}</span></div>
  {options.length>0&&<div className="ax59-quality-pick"><div className="ax59-quality-summary"><span>Confirmed resolutions</span><span>Max {options.at(-1)?.label}</span></div>
   {options.length>1&&<div className="ax59-bitrate-track" style={{'--ax59-fill':`${index/(options.length-1)*100}%`} as CSSProperties}><input type="range" min="0" max={options.length-1} step="1" value={Math.max(0,index)} disabled={disabled} aria-label="MP4 resolution" aria-valuetext={selected?.label||'No resolution'} onChange={e=>onChange(options[Number(e.currentTarget.value)].value)}/></div>}
   <div className="ax59-video-buttons" role="group" aria-label="Available MP4 resolutions">{options.map(o=><button key={o.value} type="button" className={o.value===quality?'selected':''} aria-pressed={o.value===quality} disabled={disabled} onClick={()=>onChange(o.value)}><strong>{o.label}</strong><span>{descriptor(Number(o.value))}</span></button>)}</div>
  </div>}
  {analyzed&&!options.length&&<div className="ax59-no-formats" role="status">No verified browser-direct MP4 streams. Import a local MP4 below for a direct, quality-preserving save.</div>}
 </section>
}
