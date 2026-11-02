import {NavLink} from 'react-router-dom'
import {useEffect,useState} from 'react'

type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
const links=[
 {url:'/',label:'Home',icon:'⌂'},
 {url:'/tools/youtube-to-mp3',label:'Download',icon:'↓'},
 {url:'/editor',label:'Studio',icon:'◈'},
 {url:'/tools/vocals',label:'Stems',icon:'♫'},
 {url:'/library',label:'Library',icon:'▤'},
]
export function MobileDock(){
 const [install,setInstall]=useState<InstallEvent|null>(null)
 const [installed,setInstalled]=useState(false)
 const [showGuide,setShowGuide]=useState(false)
 const [guideDismissed,setGuideDismissed]=useState(()=>{try{return sessionStorage.getItem('audixo-install-tip-dismissed')==='1'}catch{return false}})
 const [ios,setIos]=useState(false)
 useEffect(()=>{
  const onPrompt=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent)}
  const onInstalled=()=>{setInstall(null);setInstalled(true);setShowGuide(false)}
  const standalone=window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone)
  setInstalled(standalone)
  setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent))
  window.addEventListener('beforeinstallprompt',onPrompt)
  window.addEventListener('appinstalled',onInstalled)
  return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled)}
 },[])
 useEffect(()=>{
  if(!showGuide)return
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setShowGuide(false)}
  window.addEventListener('keydown',onKey)
  return()=>window.removeEventListener('keydown',onKey)
 },[showGuide])
 const requestInstall=async()=>{
  if(install){
   try{await install.prompt();const choice=await install.userChoice;if(choice.outcome==='accepted'){setInstall(null);return}}catch{}
  }
  setShowGuide(true)
 }
 return <>
  <nav className="ax40-mobile-dock" aria-label="Mobile quick navigation">{links.map(link=><NavLink key={link.url} end={link.url==='/'} to={link.url} className={({isActive})=>isActive?'active':''}><i aria-hidden="true">{link.icon}</i><span>{link.label}</span></NavLink>)}</nav>
  {!installed&&!guideDismissed&&<div className="ax44-mobile-install"><button type="button" className="ax44-install-action" onClick={()=>void requestInstall()} aria-label="Install AUDIXO app or get installation instructions">↧ Install app</button><button type="button" className="ax44-install-dismiss" aria-label="Dismiss installation tip" onClick={()=>{setGuideDismissed(true);try{sessionStorage.setItem('audixo-install-tip-dismissed','1')}catch{}}}>×</button></div>}
  {showGuide&&<div className="ax44-install-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowGuide(false)}}>
   <section role="dialog" aria-modal="true" aria-label="Install AUDIXO on your phone">
    <button className="ax44-install-close" type="button" onClick={()=>setShowGuide(false)} aria-label="Close installation help">×</button>
    <span className="ax44-install-kicker">AUDIXO / MOBILE APP</span><h2>Install AUDIXO</h2>
    {ios?<p>On iPhone, open this site in <strong>Safari</strong>, tap <strong>Share</strong> and select <strong>Add to Home Screen</strong>. The browser may not display a separate Install button.</p>
    :<p>In <strong>Chrome or Edge on Android</strong>, open the browser menu <strong>⋮</strong> and select <strong>Install app</strong> or <strong>Add to Home screen</strong>. If the native prompt is available, AUDIXO will offer it directly.</p>}
    <small>Installation availability is controlled by your browser. MP3/MP4 downloads still require the online conversion service.</small>
    <button type="button" className="ax44-install-done" onClick={()=>setShowGuide(false)}>Got it</button>
   </section>
  </div>}
 </>
}
