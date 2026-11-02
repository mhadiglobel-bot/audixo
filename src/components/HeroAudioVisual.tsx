import {type CSSProperties} from 'react'
import Logo from './Logo'

const bars=Array.from({length:58},(_,i)=>18+((i*41)%72))

export default function HeroAudioVisual({front=false}:{front?:boolean}){
 if(!front)return <div className="ax47-hero-visual ax52-hero-visual" aria-label="Rotating AUDIXO logo and animated sound waveform" role="img">
   <div className="ax52-hero-mark"><img src="/audixo-official-symbol.png" alt="" width="430" height="430" draggable={false}/></div>
   <div className="ax47-hero-waveform ax52-hero-waveform" aria-hidden="true">{bars.slice(0,34).map((h,i)=><i key={i} style={{'--h':`${h}%`,'--delay':`${(i%7)*-.14}s`} as CSSProperties}/>)}</div>
  </div>
 return <div className="ax34-hero-machine front-view" aria-hidden="true">
   <div className="ax34-machine-aura"/>
   <div className="ax34-machine-shell">
    <header><Logo compact/><div><small>AUDIXO / LIVE AUDIO FLOW</small><strong>Bring in audio. Shape it. Finish and export.</strong></div><span>READY</span></header>
    <div className="ax34-machine-stage">
      <div className="ax34-source-disc"><i/><b>INPUT</b><span>SOURCE</span></div>
      <div className="ax34-flow-arrow one">→</div>
      <div className="ax34-wave-editor"><small>ACTIVE TIMELINE</small><div>{bars.map((h,i)=><i key={i} style={{'--h':`${h}%`,'--i':i} as CSSProperties}/>)}</div><b/><em/></div>
      <div className="ax34-flow-arrow two">→</div>
      <div className="ax34-export-node"><span>↓</span><b>EXPORT</b><small>MP3 / WAV</small></div>
    </div>
    <div className="ax34-machine-status"><span><i/>SOURCE KEPT</span><span><i/>SECTION EDITS</span><span><i/>PREVIEW READY</span><strong>320 KBPS</strong></div>
   </div>
   <div className="ax34-tool-chip chip-a"><small>01 / INPUT</small><strong>Bring in audio.</strong></div>
   <div className="ax34-tool-chip chip-b"><small>02 / SHAPE</small><strong>Shape the section.</strong></div>
   <div className="ax34-tool-chip chip-c"><small>03 / FINISH</small><strong>Finish and export.</strong></div>
  </div>
}
