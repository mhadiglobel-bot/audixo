import {useEffect,useMemo,useState} from 'react'
import {soundPresets} from '../editor/project'
import {soundBank} from '../services/soundBank'

type CycleMetric={
 title:string
 value:string
 unit?:string
 copy:string
 href:string
 cta:string
 theme:'mp3'|'mp4'|'preset'|'vocal'
 pulse?:string
 sequence:{value:string;unit?:string;detail:string;label:string;tag?:string}[]
 hold?:number
}

const mp3Sequence=[
 {value:'64',unit:'kbps',detail:'Light preview encode for short audio.',label:'01 / AUDIO',tag:'LOW SIZE'},
 {value:'192',unit:'kbps',detail:'Balanced export target for everyday listening.',label:'01 / AUDIO',tag:'BALANCED'},
 {value:'240',unit:'kbps',detail:'High quality with smaller file weight.',label:'01 / AUDIO',tag:'CLEAN MIX'},
 {value:'320',unit:'kbps MP3',detail:'Server target for the main MP3 workflow.',label:'01 / AUDIO',tag:'FULL QUALITY'},
]

const mp4Sequence=[
 {value:'240p',unit:'SD',detail:'Fast fallback when the source is limited.',label:'02 / VIDEO',tag:'SD'},
 {value:'480p',unit:'SD',detail:'Cleaner playback with a smaller export size.',label:'02 / VIDEO',tag:'480'},
 {value:'720p',unit:'HD',detail:'HD request from the converter when available.',label:'02 / VIDEO',tag:'HD'},
 {value:'1080p',unit:'FHD',detail:'Full HD when the source and API both support it.',label:'02 / VIDEO',tag:'FHD'},
 {value:'2160p',unit:'4K video',detail:'Top-end request path for eligible videos.',label:'02 / VIDEO',tag:'4K'},
]

const presetSequence=soundPresets.slice(0,30).map((preset,index)=>({
 value:String(index+1).padStart(2,'0')+'/30',
 unit:preset.name,
 detail:'Preset preview opens only the controls that matter for this sound.',
 label:'03 / PRESETS',
 tag:preset.name.split(/\s+/).slice(0,2).join(' '),
}))

const vocalSequence=soundBank.slice(0,60).map((item,index)=>({
 value:String(index+1).padStart(2,'0')+'/60',
 unit:item.name.split(' · ')[0],
 detail:'Creative vocal-support sound bank slot ready for stems, layers and mashups.',
 label:'04 / VOCALS',
 tag:item.family.toUpperCase(),
}))

const metrics:CycleMetric[]=[
 {title:'Audio output',value:'320',unit:'kbps MP3',copy:'Choose an audio bitrate for eligible, shorter media.',href:'/tools/youtube-to-mp3',cta:'Open converter ↗',theme:'mp3',pulse:'64 · 192 · 240 · 320',sequence:mp3Sequence,hold:5600},
 {title:'Video output',value:'2160p',unit:'4K video',copy:'Request a resolution supported by the video and API.',href:'/tools/youtube-to-mp3',cta:'Open converter ↗',theme:'mp4',pulse:'240p → 2160p',sequence:mp4Sequence,hold:5600},
 {title:'Preset library',value:'20/30',unit:'Neon Air',copy:'Thirty real editor presets. Preview each name before editing.',href:'/editor',cta:'Open studio ↗',theme:'preset',pulse:'Preset cycle',sequence:presetSequence,hold:5200},
 {title:'Vocal sound bank',value:'04/60',unit:'Guitar',copy:'Creative sound layers for stem work, hooks and mashup sections.',href:'/tools/vocals',cta:'Explore vocals ↗',theme:'vocal',pulse:'60 entries',sequence:vocalSequence,hold:5200},
]

function useCyclingMetric(sequence:CycleMetric['sequence'],hold=5600){
 const [index,setIndex]=useState(0)
 useEffect(()=>{
  if(sequence.length<=1)return
  const timer=window.setInterval(()=>setIndex(current=>(current+1)%sequence.length),hold)
  return()=>window.clearInterval(timer)
 },[sequence,hold])
 return sequence[index]??sequence[0]
}

function AnimatedMetric({metric}:{metric:CycleMetric}){
 const active=useCyclingMetric(metric.sequence,metric.hold)
 const [burstKey,setBurstKey]=useState(0)
 useEffect(()=>{
  setBurstKey(value=>value+1)
 },[active])
 const digits=active.value.split('')
 return <article className={`ax39-metric-card ax44-metric-card is-${metric.theme}`}>
  <b>{active.label}</b>
  <div className="ax44-metric-head"><span>{metric.title}</span><i>{active.tag??metric.pulse}</i></div>
  <strong className="ax44-metric-value" aria-label={`${active.value} ${active.unit??''}`.trim()}>
   <span className="ax44-metric-scene" key={burstKey}>{digits.map((char,i)=><span key={`${char}-${i}-${burstKey}`} className={`ax44-type-char ${char==='/'?'slash':''}`}>{char}</span>)}</span>
   {active.unit&&<small>{active.unit}</small>}
  </strong>
  <p>{active.detail||metric.copy}</p>
  <div className="ax44-metric-mini-rail" aria-hidden="true">
   {metric.sequence.slice(0,Math.min(metric.sequence.length,6)).map((item,i)=><span key={`${metric.title}-${item.value}-${i}`} className={item.value===active.value?'active':''}>{item.value.replace('/','')}</span>)}
  </div>
  <a href={metric.href}>{metric.cta}</a>
 </article>
}

export default function TrustMetrics(){
 const note=useMemo(()=>'* Animated previews show choices, not guaranteed download quality. The converter API verifies video resolutions and keeps 320 kbps as the default server MP3 target.',[])
 return <section className="ax39-metric-grid ax44-metrics" aria-label="Audixo quick capability cards">
  {metrics.map(metric=><AnimatedMetric key={metric.title} metric={metric}/>)}
  <small className="ax39-metric-footnote">{note}</small>
 </section>
}
