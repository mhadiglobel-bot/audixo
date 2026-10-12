import {NavLink,useLocation} from 'react-router-dom'
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
 const location=useLocation()
 const [install,setInstall]=useState<InstallEvent|null>(null)
 const [installed,setInstalled]=useState(false)
 useEffect(()=>{
  const onPrompt=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent)}
  const onInstalled=()=>{setInstall(null);setInstalled(true)}
  window.addEventListener('beforeinstallprompt',onPrompt)
  window.addEventListener('appinstalled',onInstalled)
  setInstalled(window.matchMedia('(display-mode: standalone)').matches)
  return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled)}
 },[])
 const installApp=async()=>{if(!install)return;await install.prompt();const result=await install.userChoice;if(result?.outcome==='accepted')setInstall(null)}
 return <>
  <nav className="ax40-mobile-dock" aria-label="Mobile quick navigation">{links.map(link=><NavLink key={link.url} end={link.url==='/'} to={link.url} className={({isActive})=>isActive?'active':''}><i aria-hidden="true">{link.icon}</i><span>{link.label}</span></NavLink>)}</nav>
  {install&&!installed&&location.pathname==='/'&&<button type="button" className="ax40-install-app" onClick={()=>void installApp()}>↓ Install AUDIXO app</button>}
 </>
}
