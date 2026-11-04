import {useEffect,useState} from 'react'

/** A complete visible journey: forward steps, a traced return, then a soft reset. */
export type JourneyPhase='forward'|'return'|'rewind'|'settle'

export function useNeonJourney(total:number,stepMs=1650,returnMs=2200){
 const [active,setActive]=useState(0)
 const [phase,setPhase]=useState<JourneyPhase>('forward')
 useEffect(()=>{
  if(typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
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
 },[active,phase,total,stepMs,returnMs])
 const select=(index:number)=>{
  if(index<0||index>=total)return
  setActive(index)
  setPhase('forward')
 }
 return {active,phase,select}
}
