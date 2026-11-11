import {useEffect,useMemo,useRef,useState,type ChangeEvent} from 'react'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import {activeLineIndex,downloadBlob,drawLyrics,editLine,fromWordCues,parseLyricText,romanize,renderLyricMp4,stamp,wordsText,type Aspect,type LyricLine,type Theme} from '../services/lyricsVideo'
import '../styles/lyrics-video.css'

const limitSeconds=10*60
const errorText=(e:unknown)=>e instanceof Error?e.message:'This operation could not be completed.'
async function downsample(buffer:AudioBuffer):Promise<Float32Array>{
 const offline=new OfflineAudioContext(1,Math.ceil(buffer.duration*16000),16000)
 const source=offline.createBufferSource(),mono=offline.createBuffer(1,buffer.length,buffer.sampleRate),data=mono.getChannelData(0)
 for(let ch=0;ch<buffer.numberOfChannels;ch++){const channel=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]+=channel[i]/buffer.numberOfChannels}
 source.buffer=mono;source.connect(offline.destination);source.start()
 return (await offline.startRendering()).getChannelData(0)
}
export default function LyricsVideoMaker(){
 const [file,setFile]=useState<File|null>(null),[buffer,setBuffer]=useState<AudioBuffer|null>(null),[url,setUrl]=useState('')
 const [title,setTitle]=useState(''),[lines,setLines]=useState<LyricLine[]>([]),[plain,setPlain]=useState('')
 const [theme,setTheme]=useState<Theme>('midnight'),[aspect,setAspect]=useState<Aspect>('landscape'),[offset,setOffset]=useState(0)
 const [time,setTime]=useState(0),[playing,setPlaying]=useState(false),[status,setStatus]=useState(''),[warning,setWarning]=useState('')
 const [busy,setBusy]=useState<'load'|'ai'|'render'|null>(null),[percent,setPercent]=useState(0),[estimated,setEstimated]=useState(false)
 const canvasRef=useRef<HTMLCanvasElement>(null),audioRef=useRef<HTMLAudioElement>(null),cancelRef=useRef<AbortController|null>(null)
 const duration=buffer?.duration||0,current=useMemo(()=>activeLineIndex(lines,time+offset),[lines,time,offset])
 useEffect(()=>{const canvas=canvasRef.current;if(canvas)drawLyrics(canvas,lines,time,{title,theme,offset})},[lines,time,title,theme,offset,aspect])
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url])
 const load=async(event:ChangeEvent<HTMLInputElement>)=>{
  const chosen=event.target.files?.[0];if(!chosen)return
  if(chosen.size>85*1024*1024){setWarning('Choose a file below 85 MB for browser processing.');return}
  cancelRef.current?.abort();setBusy('load');setWarning('');setStatus('Decoding audio locally…');setLines([]);setTime(0);setPlain('')
  try{
   const ctx=new AudioContext();let decoded:AudioBuffer
   try{decoded=await ctx.decodeAudioData(await chosen.arrayBuffer())}finally{await ctx.close()}
   if(decoded.duration>limitSeconds)throw Error('This browser version supports audio up to 10 minutes.')
   if(!decoded.duration||!Number.isFinite(decoded.duration))throw Error('Unable to read the audio duration.')
   setBuffer(decoded);setFile(chosen);setTitle(chosen.name.replace(/\.[^.]+$/,'').slice(0,100));setUrl(URL.createObjectURL(chosen))
   setStatus('Audio ready. Generate lyrics with AI or paste lyrics / LRC.')
  }catch(e){setBuffer(null);setFile(null);setStatus('');setWarning(errorText(e))}
  finally{setBusy(null)}
 }
 const paste=()=>{if(!buffer)return;const result=parseLyricText(plain,duration);setLines(result.lines);setEstimated(true);setStatus('Lyric lines added. Word timings are estimated; preview and correct them before export.');setWarning('')}
 const ai=async()=>{
  if(!buffer||busy)return
  const c=new AbortController();cancelRef.current=c;setBusy('ai');setWarning('');setStatus('Preparing local AI model. The first download can be large and transcription may take several minutes.')
  try{
   const audio=await downsample(buffer);if(c.signal.aborted)return
   const modelLibraryUrl='https://esm.sh/@huggingface/transformers@3.7.6'
   const module:any=await import(/* @vite-ignore */ modelLibraryUrl)
   if(c.signal.aborted)return
   const transcriber=await module.pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{device:'wasm',progress_callback:(p:{status?:string;progress?:number})=>{
    if(!c.signal.aborted&&p.status==='progress'&&Number.isFinite(p.progress))setStatus('Downloading AI model: '+Math.round(p.progress||0)+'%')
   }})
   if(c.signal.aborted){transcriber.dispose?.();return}
   setStatus('Transcribing song locally. Layered vocals and background music can make lyrics inaccurate.')
   const result=await transcriber(audio,{return_timestamps:'word',chunk_length_s:25,stride_length_s:5,task:'transcribe'})
   transcriber.dispose?.();if(c.signal.aborted)return
   const generated=fromWordCues(Array.isArray(result.chunks)?result.chunks:[],duration)
   if(!generated.length)throw Error('No usable timed words found. Paste lyrics or import an LRC file.')
   setLines(generated);setEstimated(false);setPlain(generated.map(wordsText).join('\n'))
   setStatus('AI draft ready. Review and correct lyric words and timing before exporting.')
  }catch(e){if(!c.signal.aborted)setWarning('AI unavailable: '+errorText(e)+'. Paste lyrics or import an LRC file instead.')}
  finally{if(cancelRef.current===c)cancelRef.current=null;setBusy(null)}
 }
 const importLrc=async(e:ChangeEvent<HTMLInputElement>)=>{const chosen=e.target.files?.[0];if(chosen&&buffer){const text=await chosen.text();setPlain(text);const result=parseLyricText(text,duration);setLines(result.lines);setEstimated(true);setStatus('LRC imported. Line times retained; individual word timings are estimated.');setWarning('')}}
 const changeLine=(index:number,patch:{start?:number;end?:number;text?:string})=>setLines(old=>old.map((l,i)=>i===index?editLine(l,patch,duration):l))
 const roman=()=>{setLines(old=>old.map(l=>({...l,words:l.words.map(w=>({...w,text:romanize(w.text)}))})));setStatus('Approximate Latin transliteration applied. Review spellings, especially Urdu and Punjabi.')}
 const startExport=async()=>{
  if(!buffer||!lines.length||busy)return
  const c=new AbortController();cancelRef.current=c;setBusy('render');setPercent(0);setWarning('');setStatus('Encoding H.264 MP4 with AAC audio locally…')
  try{
   const blob=await renderLyricMp4({audio:buffer,lines,title,theme,aspect,offset,onProgress:setPercent,signal:c.signal})
   if(c.signal.aborted)return
   downloadBlob(blob,(title||'AUDIXO Lyrics')+' - Lyrics Video');setStatus('MP4 created. Check your browser Downloads folder.')
  }catch(e){if(!c.signal.aborted)setWarning('MP4 export failed: '+errorText(e))}
  finally{if(cancelRef.current===c)cancelRef.current=null;setBusy(null)}
 }
 const toggle=()=>{const audio=audioRef.current;if(!audio)return;if(audio.paused){audio.play().catch(e=>setWarning('Playback failed: '+errorText(e)))}else audio.pause()}
 return <SiteShell><Seo title="AI Lyrics Video Maker — Roman Lyrics to MP4" description="Create a lyrical MP4 from your own audio. Transcribe lyrics locally, edit Roman text and timing, preview word highlighting and export MP4." path="/tools/lyrics-video-maker"/>
 <main className="page-shell ax-lyrics">
  <header className="ax-lyrics-hero"><div><span className="ax-lyrics-kicker">AUDIXO / CREATIVE TOOLS</span><h1>Turn your sound into<br/><em>a lyric video.</em></h1><p>Upload a song, create or import timed Roman lyrics, watch the words light up with the music, and export an elegant MP4. No account required.</p></div><span className="ax-lyrics-hint">AUDIO → WORDS → MOTION → MP4</span></header>
  <div className="ax-lyrics-grid">
   <section className="ax-lyrics-work" aria-label="Lyrics video setup">
    <section className="ax-lyrics-panel"><div className="ax-lyrics-heading"><b>01</b><div><h2>Your audio</h2><p>MP3, WAV or another browser-supported audio file · Up to 10 minutes</p></div></div>
     <label className="ax-lyrics-upload"><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={e=>void load(e)} disabled={busy!==null}/><span>♫</span><strong>{file?.name||'Choose an audio file'}</strong><small>{file?stamp(duration)+' · audio stays on this device':'Select a song from your device'}</small></label>
     {file&&<label className="ax-lyrics-field">Video title<input value={title} onChange={e=>setTitle(e.target.value.slice(0,100))}/></label>}
    </section>
    <section className="ax-lyrics-panel"><div className="ax-lyrics-heading"><b>02</b><div><h2>Lyrics &amp; timing</h2><p>AI draft, editable Roman text and line controls</p></div></div>
     <div className="ax-lyrics-actions"><button disabled={!buffer||busy!==null} onClick={()=>void ai()}>✦ Generate with AI</button><label className={'ax-lyrics-pick'+(!buffer?' disabled':'')}>Import .LRC<input type="file" accept=".lrc,.txt,text/plain" disabled={!buffer||busy!==null} onChange={e=>void importLrc(e)}/></label><button disabled={!lines.length||busy!==null} onClick={roman}>Romanize text</button></div>
     <label className="ax-lyrics-field">Or paste lyrics (one line per row; optional [mm:ss.xx] timestamps)<textarea rows={5} placeholder={'Dil diyan gallan\nKarange naal naal beh ke\n\nOr paste timed [00:12.40] lines…'} value={plain} onChange={e=>setPlain(e.target.value)} disabled={!buffer||busy!==null}/></label>
     <div className="ax-lyrics-actions"><button onClick={paste} disabled={!plain.trim()||!buffer||busy!==null}>Apply pasted lyrics</button><small>AI recognition and transliteration are approximate. Singing and mixed-language songs may need manual correction.</small></div>
     {lines.length>0&&<><div className="ax-lyrics-subhead"><h3>Edit synced lines</h3><span>{lines.length} lines · {estimated?'estimated word timing':'AI timing draft'}</span></div>
      <div className="ax-lyrics-lines">{lines.map((line,i)=><div key={line.id} className={'ax-lyrics-row'+(i===current?' active':'')}>
       <button className="ax-lyrics-jump" onClick={()=>{if(audioRef.current){audioRef.current.currentTime=line.start;setTime(line.start)}}} title="Seek to this line">▶</button>
       <label>Start <input aria-label={'Line '+(i+1)+' start seconds'} type="number" min="0" max={duration} step=".1" value={Number(line.start.toFixed(2))} onChange={e=>changeLine(i,{start:Number(e.target.value)})}/></label>
       <label>End <input aria-label={'Line '+(i+1)+' end seconds'} type="number" min="0" max={duration} step=".1" value={Number(line.end.toFixed(2))} onChange={e=>changeLine(i,{end:Number(e.target.value)})}/></label>
       <input aria-label={'Line '+(i+1)+' text'} value={wordsText(line)} onChange={e=>changeLine(i,{text:e.target.value})}/>
       <button aria-label={'Delete line '+(i+1)} title="Delete line" onClick={()=>setLines(old=>old.filter((_,j)=>j!==i))}>×</button>
      </div>)}</div></>}
    </section>
    <section className="ax-lyrics-panel"><div className="ax-lyrics-heading"><b>03</b><div><h2>Export settings</h2><p>Choose your cinematic background and format</p></div></div>
     <div className="ax-lyrics-options"><div><strong>Background</strong><div className="ax-lyrics-actions">{(['midnight','aurora','rose'] as Theme[]).map(t=><button key={t} className={theme===t?'selected':''} onClick={()=>setTheme(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div></div><div><strong>Aspect ratio</strong><div className="ax-lyrics-actions"><button className={aspect==='landscape'?'selected':''} onClick={()=>setAspect('landscape')}>16:9 · YouTube</button><button className={aspect==='portrait'?'selected':''} onClick={()=>setAspect('portrait')}>9:16 · Reels</button></div></div>
      <label className="ax-lyrics-field">Lyric sync offset <span>{offset.toFixed(1)}s</span><input type="range" min="-5" max="5" step=".1" value={offset} onChange={e=>setOffset(Number(e.target.value))}/></label></div>
     <button className="ax-lyrics-export" disabled={!buffer||!lines.length||busy!==null} onClick={()=>void startExport()}>↓ {busy==='render'?'Rendering MP4 · '+percent+'%':'Download lyric video · MP4'}</button>
     <small className="ax-lyrics-note">Rendering is local and can be demanding for long tracks. MP4 requires WebCodecs H.264/AAC and internet access for the encoder library. Only use music you own or have rights to reproduce.</small>
    </section>
    {(status||warning||busy)&&<div className="ax-lyrics-status" role="status">{busy&&<span className="ax-lyrics-spinner"/>}{status&&<p>{status}</p>}{warning&&<p className="error">{warning}</p>}{busy==='render'&&<progress max="100" value={percent}/>}
    {busy==='render'&&<button onClick={()=>cancelRef.current?.abort()}>Cancel export</button>}</div>}
   </section>
   <aside className="ax-lyrics-preview" aria-label="Live video preview"><div className="ax-lyrics-preview-top"><span>LIVE PREVIEW</span><strong>{aspect==='landscape'?'16:9':'9:16'} · Roman lyrics</strong></div>
    <div className={'ax-lyrics-screen '+aspect}><canvas width={aspect==='landscape'?1280:720} height={aspect==='landscape'?720:1280} ref={canvasRef}/></div>
    <audio ref={audioRef} src={url||undefined} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} preload="metadata"/>
    <div className="ax-lyrics-transport"><button onClick={toggle} disabled={!buffer}>{playing?'❚❚':'▶'}</button><span>{stamp(time)}</span><input aria-label="Seek song" type="range" min="0" max={Math.max(.1,duration)} step=".05" value={time} onChange={e=>{if(audioRef.current){audioRef.current.currentTime=Number(e.target.value);setTime(Number(e.target.value))}}} disabled={!buffer}/><span>{stamp(duration)}</span></div>
    <p className="ax-lyrics-preview-note">Active words light up in the preview. Adjust lyrics, start/end times and the sync offset before export.</p>
   </aside>
  </div>
 </main></SiteShell>
}
