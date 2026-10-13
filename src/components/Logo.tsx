import type {CSSProperties} from 'react'
/** Uses the owner's original AUDIXO artwork, without reconstructing its lettering. */
export default function Logo({compact=false}:{compact?:boolean}){
 return <span className={`ax-logo ax38-logo ${compact?'compact':''}`}>
  <img src={compact?'/audixo-official-symbol.png':'/audixo-official-wordmark.png'}
   width={compact?44:147} height={compact?44:53} alt={compact?'Audixo':'AUDIXO'} decoding="async" />
 </span>
}

export function RotatingUploadLogo({small=false,label='AUDIXO AUDIO STUDIO'}:{small?:boolean;label?:string}){
 return <div className={`ax48-upload-brand ${small?'small':''}`} aria-hidden="true"><div className="ax48-upload-orbit"><i/><i/><img src="/audixo-official-symbol.png" alt=""/></div><span className="ax48-upload-pulse">{Array.from({length:13},(_,i)=><i key={i} style={{'--n':i} as CSSProperties}/>)}</span><small>{label}</small></div>
}

