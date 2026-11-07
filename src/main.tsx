import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/app.css'
import './styles/premium-v65.css'
import './styles/v72-core.css'
import './styles/v72-editors.css'
import './styles/v72-stems.css'
import './styles/v73-workflow.css'
import './styles/v74-flow.css'
import './styles/v75-tools.css'
import './styles/v77-journey.css'
import './styles/v78-audio.css'
import './styles/v81-social-downloader.css'
import './styles/v82-production-refinements.css'
import './styles/v83-ui-recovery.css'
import './styles/v84-neon-rails-seo.css'
import './styles/v85-studio-vocals.css'
import './styles/v91-precision-polish.css'
import './styles/v92-ui-controls.css'
import './styles/v92-brand-pages.css'
import './styles/v92-pricing-page.css'
import './styles/v92-completion.css'

document.documentElement.classList.add('audixo-light')
ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>
)

// Short, unobtrusive branded intro. No fake wait screen or Skip control.
// Never block the actual React bundle or editor initialization on the animation.
const loader=document.getElementById('audixo-loader')
const label=document.getElementById('audixo-loader-slogan')
const count=document.getElementById('audixo-loader-count')
const progress=document.getElementById('audixo-loader-progress')
const phrases=['MAKE EVERY BEAT COUNT','SHAPE SOUND YOUR WAY','CREATE IN YOUR RHYTHM','YOUR STUDIO IS READY']
const start=performance.now()
let seenIntro=false
try{seenIntro=window.sessionStorage.getItem('audixo-intro-v48')==='1'}catch{}
const introDuration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?120:seenIntro?250:2350
let last=-1
let finished=false
const finish=()=>{
 if(finished)return
 finished=true
 try{window.sessionStorage.setItem('audixo-intro-v48','1')}catch{}
 loader?.classList.add('done')
 document.documentElement.dataset.audixoReady='true'
 window.dispatchEvent(new Event('audixo:loader-complete'))
 window.setTimeout(()=>loader?.remove(),560)
}
const render=(now:number)=>{
 if(finished)return
 const elapsed=Math.min(introDuration,now-start)
 const percent=Math.min(100,Math.round(elapsed/introDuration*100))
 if(count)count.textContent=`${percent}%`
 if(progress)progress.style.width=`${percent}%`
 const idx=Math.min(phrases.length-1,Math.floor(elapsed/(introDuration/phrases.length)))
 if(idx!==last){last=idx;if(label){label.classList.remove('is-active');label.textContent=phrases[idx];void label.offsetWidth;label.classList.add('is-active')}}
 if(elapsed>=introDuration){finish();return}
 window.requestAnimationFrame(render)
}
// If a device throttles animation frames, timer still guarantees completion.
window.requestAnimationFrame(render)
window.setTimeout(()=>{if(!finished)render(performance.now())},introDuration+50)

// PWA installation is optional; source editors require a network for hosted services.
if(import.meta.env.PROD&&'serviceWorker' in navigator){
 window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>reg.update().catch(()=>{})).catch(()=>{})})
}
