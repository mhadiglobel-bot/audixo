import type {CSSProperties} from 'react'

export const bitrateSteps=[64,192,240,320] as const
export type Mp3Bitrate=(typeof bitrateSteps)[number]
const mp4Steps=[
 {value:'240',name:'240p',detail:'SD'},
 {value:'360',name:'360p',detail:'SD'},
 {value:'480',name:'480p',detail:'SD'},
 {value:'720',name:'720p',detail:'HD'},
 {value:'1080',name:'1080p',detail:'FHD'},
 {value:'1440',name:'1440p',detail:'2K'},
 {value:'2160',name:'2160p',detail:'4K'}
] as const

export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:{value:string;label:string}[];analyzed:boolean;disabled?:boolean}){
 const supported=new Set(available.map(a=>String(a.value).replace(/p$/i,'')))
 const known=supported.size>0
 const index=Math.max(0,mp4Steps.findIndex(s=>s.value===quality))
 const selected=mp4Steps[index]
 const reported=known&&supported.has(selected.value)
 const select=(v:string)=>{if(analyzed&&!disabled)onChange(v)}
 return <section className="ax42-quality-panel" aria-label="MP4 resolution selector">
  <div className="ax42-quality-head">
   <div><span className="ax42-eyebrow">VIDEO OUTPUT</span><h3>{selected.name} <small>{selected.detail}</small></h3><p>{!analyzed?'Analyze the video to unlock selections.':reported?'Reported by your conversion API.':'Custom request. The server will confirm this quality.'}</p></div>
   <span className="ax42-quality-status">{!analyzed?'AWAITING VIDEO':reported?'AVAILABLE':known?`${supported.size} VERIFIED`:'SERVER CHECK'}</span>
  </div>
  <div className="ax42-segmented-rail seven" role="group" aria-label="Choose MP4 resolution" style={{'--ax42-fill':`${(index/(mp4Steps.length-1))*100}%`} as CSSProperties}>
   <div className="ax42-rail-line" aria-hidden="true"><i/></div>
   {mp4Steps.map(item=><button type="button" key={item.value} aria-label={`${item.name}, ${supported.has(item.value)?'reported available by API':'server verification required'}`} aria-pressed={item.value===quality} disabled={!analyzed||disabled} className={`ax42-rail-choice${item.value===quality?' selected':''}${supported.has(item.value)?' verified':''}`} onClick={()=>select(item.value)}>
     <span className="ax42-rail-circle" aria-hidden="true"><i/></span><span className="ax42-rail-label">{item.name}</span><small>{item.detail}</small>
    </button>)}
  </div>
  <div className="ax42-quality-legend"><span><i className="verified"/> API-reported</span><span><i/> Unverified request</span></div>
  <p className="ax42-quality-foot">Every point is selectable. A selected resolution is a request, not a guarantee. Unsupported resolutions may be rejected by the server rather than substituted silently.</p>
 </section>
}

export function Mp3QualityRail({bitrate,onChange,duration,disabled=false}:{bitrate:Mp3Bitrate;onChange:(v:Mp3Bitrate)=>void;duration:number;disabled?:boolean}){
 const canEncode=duration>0&&duration<=300
 const actual=bitrate===320||!canEncode?320:bitrate
 const index=Math.max(0,bitrateSteps.findIndex(s=>s===bitrate))
 return <section className="ax42-quality-panel" aria-label="MP3 bitrate selector">
  <div className="ax42-quality-head">
   <div><span className="ax42-eyebrow">MP3 AUDIO OUTPUT</span><h3>{bitrate} <small>kbps selected</small></h3><p>{canEncode&&bitrate<320?`On-device ${bitrate} kbps encode for a short video.`:bitrate<320?'Selection preview — long or unknown videos are delivered at 320 kbps.':'The conversion server is asked for 320 kbps.'}</p></div>
   <span className="ax42-quality-status">{actual===320?'SERVER: 320':'LOCAL ENCODE'}</span>
  </div>
  <div className="ax42-segmented-rail four" role="group" aria-label="Choose MP3 bitrate" style={{'--ax42-fill':`${(index/(bitrateSteps.length-1))*100}%`} as CSSProperties}>
   <div className="ax42-rail-line" aria-hidden="true"><i/></div>
   {bitrateSteps.map(item=><button type="button" key={item} aria-label={`${item} kbps${!canEncode&&item<320?', visual selection only; output stays 320 kbps':''}`} aria-pressed={item===bitrate} disabled={disabled} className={`ax42-rail-choice${item===bitrate?' selected':''}`} onClick={()=>onChange(item)}><span className="ax42-rail-circle" aria-hidden="true"><i/></span><span className="ax42-rail-label">{item}</span><small>kbps</small></button>)}
  </div>
  <p className="ax42-quality-foot">{!canEncode&&bitrate<320?'Your chosen point changes the UI selection only. This video still downloads with the 320 kbps server encoding target.':'The displayed bitrate is an encoding target. Re-encoding cannot improve the fidelity of the original recording.'} Local re-encoding for lower bitrates requires a short, small file.</p>
 </section>
}
