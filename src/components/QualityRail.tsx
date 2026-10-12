import {useMemo} from 'react'

const readyLabel=(available:{value:string;label:string}[],value:string)=>available.some(v=>v.value===value)
const mp4Steps=[{value:'240',name:'240p'},{value:'360',name:'360p'},{value:'480',name:'480p'},{value:'720',name:'720p'},{value:'1080',name:'1080p'},{value:'1440',name:'1440p'},{value:'2160',name:'2160p'}]
export const bitrateSteps=[128,192,256,320] as const
export function VideoQualityRail({quality,onChange,available,analyzed,disabled=false}:{quality:string;onChange:(v:string)=>void;available:{value:string;label:string}[];analyzed:boolean;disabled?:boolean}){
 const known=available.length>0
 const labels=useMemo(()=>new Set(available.map(item=>item.value)),[available])
 const candidate=(value:string)=>!known||labels.has(value)
 const currentIndex=Math.max(0,mp4Steps.findIndex(s=>s.value===quality))
 const choose=(index:number)=>{
  if(!analyzed||disabled)return
  const requested=mp4Steps[Math.max(0,Math.min(mp4Steps.length-1,index))]
  onChange(requested.value)
 }
 return <div className="ax40-quality-panel">
  <div className="ax40-quality-panel-head"><div><small>VIDEO QUALITY</small><strong>{quality?`${quality}p${quality==='2160'?' · 4K':quality==='1440'?' · 2K':quality==='1080'?' · Full HD':''}`:'Choose resolution'}</strong></div><span>{!analyzed?'ANALYZE FIRST':!known?'SERVER WILL VERIFY':`${available.length} REPORTED`}</span></div>
  <div className="ax40-video-slider">
   <div className="ax40-video-rail-track" aria-hidden="true"><div className="ax40-video-rail-active" style={{width:`${100*currentIndex/(mp4Steps.length-1)}%`}}/></div>
   <input aria-label="MP4 video quality" type="range" aria-valuetext={`${quality||'720'}p${known?' · reported':' · unverified'}`} min="0" max={mp4Steps.length-1} step="1" value={currentIndex} disabled={!analyzed||disabled} onChange={e=>choose(Number(e.target.value))}/>
   <div className="ax40-video-ticks" role="group" aria-label="Select a video resolution">{mp4Steps.map((q,i)=>{
    const reported=analyzed&&candidate(q.value)
    return <button type="button" key={q.value} aria-label={`Select ${q.name}${known?(readyLabel(available,q.value)?' · reported by API':' · requested manually'):' · unverified'}`} title={!analyzed?'Analyze first':reported?(known?'Reported by API':'Request this quality — server will verify'):'Request this quality — server will verify'} aria-pressed={quality===q.value} disabled={!analyzed||disabled} className={`${quality===q.value?'active':''} ${reported?'reported':'requested'}`.trim()} onClick={()=>choose(i)}><i/><span>{q.name}</span></button>
   })}</div>
  </div>
  <p className="ax40-quality-explain">{!analyzed?'Analyze the video to check its available formats.':known?'Every resolution point can be selected. Qualities reported by the API are highlighted, while any other point is treated as a request for the server to verify.':'Your API did not return a usable quality list. Any selected resolution is treated as a request and your server will confirm availability.'}</p>
 </div>
}
export function Mp3QualityRail({bitrate,onChange,duration,disabled=false}:{bitrate:number;onChange:(v:number)=>void;duration:number;disabled?:boolean}){
 const localAllowed=duration>0&&duration<=300
 return <div className="ax40-quality-panel ax40-mp3-panel">
  <div className="ax40-quality-panel-head"><div><small>MP3 QUALITY</small><strong>{bitrate} kbps</strong></div><span>{bitrate===320?'SERVER ENCODED':'LOCAL RE-ENCODE'}</span></div>
  <div className="ax40-mp3-ticks" role="group" aria-label="Select MP3 output bitrate">{bitrateSteps.map(value=><button type="button" key={value} aria-pressed={bitrate===value} className={bitrate===value?'active':''} disabled={disabled} onClick={()=>onChange(value)}><i/><strong>{value}</strong><span>kbps</span></button>)}</div>
  <p className="ax40-quality-explain">{bitrate===320?'Default: the server is asked for 320 kbps. Actual source quality cannot be increased by re-encoding.':`Real ${bitrate} kbps output is re-encoded on this device after download; slower and more memory-intensive than the default.`} {localAllowed?'All bitrate points stay selectable for the UI.':'All bitrate points remain selectable for the UI, while 320 kbps stays the official server target for reliability.'}</p>
 </div>
}
