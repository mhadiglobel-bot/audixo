import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/app.css'
import './styles/ax39.css'
import './styles/ax40.css'

document.documentElement.classList.add('audixo-light')
ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>
)

// One startup intro per full page load, not on each in-app navigation.
// The 7-second minimum is intentional per the studio owner's requested brand experience.
const loader=document.getElementById('audixo-loader')
const label=document.getElementById('audixo-loader-slogan')
const count=document.getElementById('audixo-loader-count')
const phrases=['MAKE EVERY BEAT COUNT','SHAPE SOUND YOUR WAY','CREATE IN YOUR RHYTHM','YOUR STUDIO IS READY']
const start=performance.now()
const sevenSeconds=7000
let last=-1
let finished=false
const render=(now:number)=>{
 if(finished)return
 const elapsed=Math.min(sevenSeconds,now-start)
 const percent=Math.min(100,Math.round(elapsed/sevenSeconds*100))
 if(count)count.textContent=`${percent}%`
 const idx=Math.min(phrases.length-1,Math.floor(elapsed/(sevenSeconds/phrases.length)))
 if(idx!==last){last=idx;if(label){label.classList.remove('is-active');label.textContent=phrases[idx];void label.offsetWidth;label.classList.add('is-active')}}
 if(elapsed>=sevenSeconds){
  finished=true
  loader?.classList.add('done')
  document.documentElement.dataset.audixoReady='true'
  window.dispatchEvent(new Event('audixo:loader-complete'))
  window.setTimeout(()=>loader?.remove(),560)
  return
 }
 window.requestAnimationFrame(render)
}
// If a device throttles animation frames, timer still guarantees completion.
window.requestAnimationFrame(render)
window.setTimeout(()=>{if(!finished)render(performance.now())},sevenSeconds+50)

// PWA installation is optional; source editors require a network for hosted services.
if(import.meta.env.PROD&&'serviceWorker' in navigator){
 window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>reg.update().catch(()=>{})).catch(()=>{})})
}
