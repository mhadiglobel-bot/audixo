import { useEffect, type ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import {MobileDock} from './MobileDock'
import {useMotionGlow} from './useMotionGlow'
import {SoundModeControl} from './SoundExperience'

export default function SiteShell({children}:{children:ReactNode}){
 useMotionGlow()
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
  }),{threshold:.1,rootMargin:'0px 0px -6% 0px'})
  const seen=new WeakSet<Element>()
  const register=(el:Element)=>{if(seen.has(el))return;seen.add(el);el.classList.add('ax25-reveal');if(reduced)el.classList.add('is-visible');else observer.observe(el)}
  document.querySelectorAll('main h1,main h2,main .ax25-reveal-me').forEach(register)
  const mutations=new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(node=>{if(!(node instanceof Element))return;if(node.matches('main h1,main h2,main .ax25-reveal-me'))register(node);node.querySelectorAll?.('main h1,main h2,main .ax25-reveal-me').forEach(register)})))
  mutations.observe(document.body,{subtree:true,childList:true})
  return()=>{observer.disconnect();mutations.disconnect()}
 },[])
 return <>
  <div className="ax25-page-aura" aria-hidden="true"><i/><i/><i/></div>
  <Header/>{children}<Footer/><MobileDock/><SoundModeControl/><div className="ax40-scroll-progress" aria-hidden="true"/>
 </>
}
