/** Uses the owner's original AUDIXO artwork, without reconstructing its lettering. */
export default function Logo({compact=false}:{compact?:boolean}){
 return <span className={`ax-logo ax38-logo ${compact?'compact':''}`}>
  <img src={compact?'/audixo-official-symbol.png':'/audixo-official-wordmark.png'}
   width={compact?44:147} height={compact?44:53} alt={compact?'Audixo':'AUDIXO'} decoding="async" />
 </span>
}
