import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server.js'
import { Routes, Route } from 'react-router-dom'
import {SoundExperienceProvider} from '../src/components/SoundExperience'
import Home from '../src/pages/Home'
import Features from '../src/pages/Features'
import HowItWorks from '../src/pages/HowItWorks'
import About,{Nexivo} from '../src/pages/About'
import Contact from '../src/pages/Contact'
import Blog from '../src/pages/Blog'
import BlogPost from '../src/pages/BlogPost'
import FAQ, {faqs} from '../src/pages/FAQ'
import Help from '../src/pages/Help'
import Terms, {Privacy, Copyright} from '../src/pages/Terms'
import Editor,{Recording} from '../src/pages/Editor'
import Library from '../src/pages/Library'
import Vocals from '../src/pages/Vocals'
import Mashup from '../src/pages/MashupTool'
import QuickTrim, {EchoTool as Echo, SlowedReverbTool as Slowed, PitchTool as Pitch, SpatialTool as Spatial} from '../src/pages/QuickTrim'
import Tool, {NotFound} from '../src/pages/Tool'
import YouTubeConverter from '../src/pages/YouTubeConverter'
import {audioTools} from '../src/data/tools'
import {blogs} from '../src/data/blogs'
export {blogs,faqs,audioTools}
export {DEMO_TRACKS} from '../src/components/SoundExperience'
export const pageRoutes:Record<string,React.ComponentType>={'/':Home,'/features':Features,'/how-it-works':HowItWorks,'/about':About,'/nexivo':Nexivo,'/tools/recorder':Recording,'/contact':Contact,'/blog':Blog,'/faq':FAQ,'/help':Help,'/privacy':Privacy,'/terms':Terms,'/copyright':Copyright,'/editor':Editor,'/library':Library,'/tools/vocals':Vocals,'/tools/mashup':Mashup,'/tools/trim-audio':QuickTrim,'/tools/echo':Echo,'/tools/slowed-reverb':Slowed,'/tools/pitch':Pitch,'/tools/spatial-motion':Spatial,'/tools/youtube-to-mp3':YouTubeConverter}
// Keep the same sound-provider boundary as src/App.tsx. This entry renders
// pages without App during SEO generation, so App's provider is not inherited.
// The provider must also stay INSIDE StaticRouter because it reads useLocation.
export function pageHtml(path:string){
 return renderToString(
  <StaticRouter location={path}>
   <SoundExperienceProvider>
    <Routes>
     {Object.entries(pageRoutes).map(([p,C])=><Route key={p} path={p} element={<C/>}/>)}
     <Route path="/tool/:toolId" element={<Tool/>}/>
     <Route path="/blog/:slug" element={<BlogPost/>}/>
     <Route path="*" element={<NotFound/>}/>
    </Routes>
   </SoundExperienceProvider>
  </StaticRouter>
 )
}

