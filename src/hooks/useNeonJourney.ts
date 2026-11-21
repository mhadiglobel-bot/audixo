import {useEffect,useState,type RefObject} from 'react'

/** A complete visible journey: forward steps, a traced return, then a soft reset. */
export type JourneyPhase='forward'|'return'|'rewind'|'settle'

export function useNeonJourney(total:number,stepMs=1650,returnMs=2200,hostRef?:RefObject<HTMLElement|null>){
 const [active,setActive]=useState(0)
 const [phase,setPhase]=useState<JourneyPhase>('forward')
 const [visible,setVisible]=useState(true)
 useEffect(()=>{
  if(typeof window==='undefined')return
  let inView=true
  const update=()=>setVisible(inView && document.visibilityState==='visible')
  const node=hostRef?.current
  const observer=node&&typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{inView=Boolean(entries[0]?.isIntersecting);update()},{rootMargin:'150px 0px',threshold:0}):null
  if(node)observer?.observe(node)
  document.addEventListener('visibilitychange',update)
  update()
  return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',update)}
 },[hostRef])
 useEffect(()=>{
  if(typeof window==='undefined'||!visible||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const wait=phase==='forward'?stepMs:phase==='return'?returnMs:phase==='rewind'?110:460
  const timer=window.setTimeout(()=>{
   if(phase==='forward'){
    if(active>=total-1)setPhase('return')
    else setActive(index=>index+1)
   }else if(phase==='return'){
    setPhase('rewind')
   }else if(phase==='rewind'){
    if(active<=0)setPhase('settle')
    else setActive(index=>index-1)
   }else{
    setPhase('forward')
   }
  },wait)
  return()=>window.clearTimeout(timer)
 },[active,phase,total,stepMs,returnMs,visible])
 const select=(index:number)=>{
  if(index<0||index>=total)return
  setActive(index)
  setPhase('forward')
 }
 return {active,phase,select}
}
