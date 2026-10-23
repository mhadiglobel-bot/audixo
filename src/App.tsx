import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Logo from './components/Logo'
import {SoundExperienceProvider} from './components/SoundExperience'

const Vocals = lazy(() => import('./pages/Vocals'))
const Home = lazy(() => import('./pages/Home'))
const Editor = lazy(() => import('./pages/Editor'))
const Tool = lazy(() => import('./pages/Tool'))
const Features = lazy(() => import('./pages/Features'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Library = lazy(() => import('./pages/Library'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Help = lazy(() => import('./pages/Help'))
const Nexivo = lazy(()=>import('./pages/About').then(m=>({default:m.Nexivo})))
const Recording = lazy(()=>import('./pages/Editor').then(m=>({default:m.Recording})))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Privacy = lazy(() => import('./pages/Terms').then(m => ({default:m.Privacy})))
const Terms = lazy(() => import('./pages/Terms'))
const Copyright = lazy(() => import('./pages/Terms').then(m => ({default:m.Copyright})))
const MashupTool = lazy(() => import('./pages/MashupTool'))
const YouTubeConverter = lazy(() => import('./pages/YouTubeConverter'))
const QuickTrim = lazy(() => import('./pages/QuickTrim'))
const EchoTool = lazy(() => import('./pages/QuickTrim').then(m => ({default:m.EchoTool})))
const SlowedReverbTool = lazy(() => import('./pages/QuickTrim').then(m => ({default:m.SlowedReverbTool})))
const PitchTool = lazy(() => import('./pages/QuickTrim').then(m => ({default:m.PitchTool})))
const SpatialTool = lazy(() => import('./pages/QuickTrim').then(m => ({default:m.SpatialTool})))
const NotFound = lazy(() => import('./pages/Tool').then(m => ({default:m.NotFound})))

function RouteLoader(){return <div className="route-loader ax28-route-loader ax33-route-loader"><div className="ax28-route-aura"/><div className="ax28-route-logo"><div className="ax28-route-rings"><i/><i/><i/></div><Logo compact/></div><img className="ax39-route-name" src="/audixo-official-name.png" alt="AUDIXO"/><span>Opening your creative workspace…</span><div className="ax33-route-tools" aria-hidden="true"><i>↔</i><i>▦</i><i>◌</i><i>↓</i></div></div>}

export default function App(){return <SoundExperienceProvider><Suspense fallback={<RouteLoader/>}><Routes>
  <Route path="/" element={<Home/>}/>
  <Route path="/tools/vocals" element={<Vocals/>}/>
  <Route path="/editor" element={<Editor/>}/>
  <Route path="/tools/mashup" element={<MashupTool/>}/>
  <Route path="/tools/youtube-to-mp3" element={<YouTubeConverter/>}/>
  <Route path="/tools/trim-audio" element={<QuickTrim/>}/>
  <Route path="/tools/echo" element={<EchoTool/>}/>
  <Route path="/tools/slowed-reverb" element={<SlowedReverbTool/>}/>
  <Route path="/tools/pitch" element={<PitchTool/>}/>
  <Route path="/tools/spatial-motion" element={<SpatialTool/>}/>
  <Route path="/tool/:toolId" element={<Tool/>}/>
  <Route path="/features" element={<Features/>}/>
  <Route path="/how-it-works" element={<HowItWorks/>}/>
  <Route path="/library" element={<Library/>}/>
  <Route path="/blog" element={<Blog/>}/>
  <Route path="/blog/:slug" element={<BlogPost/>}/>
  <Route path="/faq" element={<FAQ/>}/>
  <Route path="/help" element={<Help/>}/>
  <Route path="/about" element={<About/>}/><Route path="/nexivo" element={<Nexivo/>}/><Route path="/tools/recorder" element={<Recording/>}/>
  <Route path="/contact" element={<Contact/>}/>
  <Route path="/privacy" element={<Privacy/>}/>
  <Route path="/terms" element={<Terms/>}/>
  <Route path="/copyright" element={<Copyright/>}/>
  <Route path="*" element={<NotFound/>}/>
</Routes></Suspense></SoundExperienceProvider>}
