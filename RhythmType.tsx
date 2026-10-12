import {useEffect,useMemo,useState,type CSSProperties} from 'react'

type Phase='typing'|'hold'|'burst'
type Props={lines:string[];className?:string;requiresLoader?:boolean;holdMs?:number}
// Brand colors flow continuously pink -> purple -> cobalt -> cyan -> neon green.
const RGB=['#f40bbf','#7523e5','#193af9','#00cdea','#10e578'].map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)))
function colorFor(index:number,length:number){
 const p=length<=1?0:index/(length-1),scaled=p*(RGB.length-1),a=Math.min(RGB.length-2,Math.floor(scaled)),t=scaled-a
 return `rgb(${RGB[a].map((n,i)=>Math.round(n+(RGB[a+1][i]-n)*t)).join(',')})`
}
export default function RhythmType({lines,className='',requiresLoader=false,holdMs=2350}:Props){
 const [ready,setReady]=useState(()=>!requiresLoader||(typeof document!=='undefined'&&document.documentElement.dataset.audixoReady==='true'))
 const [index,setIndex]=useState(0),[count,setCount]=useState(0),[phase,setPhase]=useState<Phase>('typing')
 const prefersReduced=useMemo(()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches,[])
 useEffect(()=>{
  if(ready)return
  const onReady=()=>setReady(true)
  window.addEventListener('audixo:loader-complete',onReady)
  if(document.documentElement.dataset.audixoReady==='true')setReady(true)
  return()=>window.removeEventListener('audixo:loader-complete',onReady)
 },[ready])
 useEffect(()=>{
  if(!ready||prefersReduced||lines.length===0)return
  const phrase=lines[index]||lines[0]||''
  const delay=phase==='typing'?31:phase==='hold'?holdMs:400
  const timer=window.setTimeout(()=>{
   if(phase==='typing'){
    if(count<phrase.length){setCount(c=>c+1);return}
    setPhase('hold');return
   }
   if(phase==='hold'){setPhase('burst');return}
   setCount(0);setIndex(i=>(i+1)%lines.length);setPhase('typing')
  },delay)
  return()=>window.clearTimeout(timer)
 },[ready,index,count,phase,lines,prefersReduced,holdMs])
 const line=lines[index]||lines[0]||''
 const words=line.split(' ')
 let position=0
 return <span className={`ax37-rhythm ax38-rhythm ${className} ${phase==='burst'?'is-burst':''}`} aria-hidden="true">
  <span className="ax37-rhythm-words">{words.map((word,wordIndex)=>{
   const first=position;position+=word.length+1
   return <span className="ax37-rhythm-word" key={`${index}-word-${wordIndex}`}>
    {Array.from(word).map((char,j)=>{const i=first+j;const shown=ready&&(prefersReduced||i<count)
     return <span className={`ax37-rhythm-letter ${shown?'is-shown':'is-future'}`} key={`${index}-${i}`}
      style={{'--i':i,'--fly':`${(i%7-3)*4}px`,color:colorFor(i,line.length)} as CSSProperties}>{char}</span>})}
   </span>
  })}</span>
 </span>
}
