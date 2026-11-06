import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { productTools } from '../data/tools'
import Logo from './Logo'
import ToolGlyph from './ToolGlyph'
import Icon from '../editor/Icons'

const mainNav=[
 ['Home','/'],['Features','/features'],['How It Works','/how-it-works'],['Blog','/blog'],['About','/about'],['Contact','/contact'],['Library','/library']
]

function Caret(){return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.25 8 10l4-3.75" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}

export default function Header(){
 const location=useLocation(),toolsActive=location.pathname.startsWith('/tools/')||location.pathname.startsWith('/tool/')
 const details=useRef<HTMLDetailsElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>>(),[mobile,setMobile]=useState(false)
 const closeTools=()=>{if(details.current)details.current.open=false}
 const openTools=()=>{clearTimeout(timer.current);if(details.current)details.current.open=true}
 useEffect(()=>{setMobile(false);closeTools()},[location.pathname])
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(details.current&&!details.current.contains(e.target as Node))closeTools()};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[])
 useEffect(()=>()=>clearTimeout(timer.current),[])
 return <header className="ax25-header-wrap">
  <div className="ax25-header">
   <Link to="/" className="ax25-brand" aria-label="Audixo home"><Logo/></Link>
   <nav className="ax25-nav" aria-label="Primary navigation">
    <NavLink to="/" end>Home</NavLink>
    <details ref={details} className={`ax25-tools ${toolsActive?'active':''}`} onMouseEnter={openTools} onMouseLeave={()=>{timer.current=setTimeout(closeTools,150)}} onFocus={openTools} onKeyDown={e=>{if(e.key==='Escape')closeTools()}}>
     <summary onClick={e=>{e.preventDefault();details.current!.open?closeTools():openTools()}}>Tools <Caret/></summary>
     <div className="ax25-tools-menu">
      <div className="ax25-tools-title ax68-tools-title"><div><small>AUDIXO / TOOLS</small><strong>Choose your workspace</strong></div><Link to="/editor" onClick={closeTools}>Full Studio <span aria-hidden="true">↗</span></Link></div>
      <div className="ax25-tools-grid ax68-tools-grid ax71-tools-grid">{productTools.map((tool,index)=><Link key={tool.id} to={tool.route} onClick={closeTools} style={{'--ax68-delay':`${index*85+60}ms`} as import('react').CSSProperties}><span className="ax25-tool-icon ax68-tool-icon" aria-hidden="true"><ToolGlyph id={tool.id}/></span><strong>{tool.name}</strong><b aria-hidden="true"><Icon name="arrowUpRight" size={17}/></b></Link>)}</div>
      <div className="ax25-tools-foot"><Link to="/library" onClick={closeTools}>Library</Link><Link to="/faq" onClick={closeTools}>FAQ</Link><Link to="/help" onClick={closeTools}>Help</Link></div>
     </div>
    </details>
    {mainNav.slice(1).map(([label,url])=><NavLink key={url} to={url}>{label}</NavLink>)}
   </nav>
   <div className="ax25-header-actions">
    <Link className="ax25-editor-cta" to="/editor"><span>Open Studio</span><b><Icon name="arrowUpRight" size={17}/></b></Link>
    <button className="ax25-menu-button" type="button" aria-label="Open navigation" aria-expanded={mobile} onClick={()=>setMobile(v=>!v)}><i/><i/><i/></button>
   </div>
  </div>
  {mobile&&<div className="ax25-mobile-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setMobile(false)}}><nav className="ax25-mobile-menu" aria-label="Mobile navigation"><div className="ax25-mobile-head"><Logo/><button onClick={()=>setMobile(false)} aria-label="Close navigation"><Icon name="close" size={20}/></button></div><div className="ax25-mobile-links">{mainNav.map(([label,url])=><Link key={url} to={url}>{label}<span><Icon name="arrowUpRight" size={16}/></span></Link>)}<Link to="/faq">FAQ<span><Icon name="arrowUpRight" size={16}/></span></Link></div><div className="ax25-mobile-tool-links"><small>TOOLS</small>{productTools.map(t=><Link key={t.id} to={t.route}><i><ToolGlyph id={t.id}/></i><span>{t.name}</span><b><Icon name="chevronRight" size={15}/></b></Link>)}</div><Link to="/editor" className="ax25-editor-cta mobile">Open Audixo Studio <b><Icon name="arrowUpRight" size={17}/></b></Link></nav></div>}
 </header>
}
