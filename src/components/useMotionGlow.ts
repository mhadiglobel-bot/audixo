import {useEffect} from 'react'
/** One passive shared cursor/scroll listener with RAF coalescing; no React rerenders. */
export function useMotionGlow(){
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer:coarse)').matches)return
  let frame=0, x=-100,y=-100,scroll=0
  const paint=()=>{
   frame=0
   document.documentElement.style.setProperty('--ax40-pointer-x',`${x}px`)
   document.documentElement.style.setProperty('--ax40-pointer-y',`${y}px`)
   document.documentElement.style.setProperty('--ax40-scroll-ratio',`${scroll}%`)
  }
  const request=()=>{if(!frame)frame=requestAnimationFrame(paint)}
  const mouse=(e:PointerEvent)=>{if(e.pointerType==='touch')return;x=e.clientX;y=e.clientY;request()}
  const update=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);scroll=Math.min(100,Math.max(0,window.scrollY/max*100));request()}
  window.addEventListener('pointermove',mouse,{passive:true})
  window.addEventListener('scroll',update,{passive:true})
  window.addEventListener('resize',update,{passive:true})
  update()
  return()=>{window.removeEventListener('pointermove',mouse);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);if(frame)cancelAnimationFrame(frame)}
 },[])
}
