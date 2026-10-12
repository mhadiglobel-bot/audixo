import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Timeline from './Timeline'
import Transport from './Transport'
import Inspector from './Inspector'
import ExportModal from './ExportModal'
import LibraryDrawer from './LibraryDrawer'
import StreamingStudio from './StreamingStudio'
import type { AudioProject, EditTarget, TimelineSelection } from './types'
import { createClip, createProject, createTrack, defaultClipFx, isolateSelection } from './project'
import { cloneProject, findClip, projectDuration, safeFileName, uid, clipTimelineDuration } from './utils'
import { fitScale } from './editing'
import { addCut, addEffect, addTrim, manualGroup, rebuildEdits, removeEdit, retainSources, targetsFor,duplicateAudio,clearEdits } from './editRack'
import AppliedEdits from './AppliedEdits'
import Recorder from './Recorder'
import { decodeAudio, playProject, renderProject } from './audioEngine'
import { downloadBlob, encodeMp3, encodeWav } from './encoder'
import { saveMixToLibrary } from './library'
import { localMetadata } from '../services/media'

type Settings={format:'mp3'|'wav';kbps:number;normalize:boolean;stereoRepair:boolean;saveToLibrary:boolean;libraryName:string}
export type InitialAudio={name:string;blob:Blob;muted?:boolean}
export default function AudioStudio({initialAudio=[],focusToolId=null,recordOnOpen=false}:{initialAudio?:InitialAudio[];focusToolId?:string|null;recordOnOpen?:boolean}){
 const [project,setProject]=useState<AudioProject>(()=>createProject()),projectRef=useRef(project),buffers=useRef(new Map<string,AudioBuffer>())
 const history=useRef<{past:AudioProject[];future:AudioProject[]}>({past:[],future:[]}),[revision,setRevision]=useState(0)
 const [selectedId,setSelectedId]=useState<string|null>(null),[selection,setSelection]=useState<TimelineSelection>({start:0,end:0,trackId:null})
 const [cutMode,setCutMode]=useState(false),[allTracks,setAllTracks]=useState(false),[scale,setScale]=useState(6),[time,setTime]=useState(0),[playing,setPlaying]=useState(false)
 const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[controls,setControls]=useState(true),[exportOpen,setExportOpen]=useState(false),[libraryOpen,setLibraryOpen]=useState(false)
 const [streamFile,setStreamFile]=useState<File|null>(null),[streamDuration,setStreamDuration]=useState(0)
 const [recordOpen,setRecordOpen]=useState(recordOnOpen)
 const input=useRef<HTMLInputElement>(null),timelineHost=useRef<HTMLDivElement>(null),controller=useRef<any>(null),frame=useRef(0),initialized=useRef(false),messageTimer=useRef(0)
 const toast=(m:string)=>{setMessage(m);clearTimeout(messageTimer.current);messageTimer.current=window.setTimeout(()=>setMessage(''),6000)}
 const update=(next:AudioProject)=>{const before=findClip(projectRef.current,selectedId);projectRef.current=next;setProject(next);if(before){const source=before.clip.sourceId||before.clip.id;const matching=next.tracks.find(t=>t.id===before.track.id)?.clips;const chosen=matching?.find(c=>(c.sourceId||c.id)===source&&c.offset<=before.clip.offset+.001&&c.offset+c.duration>before.clip.offset+.001)||matching?.find(c=>(c.sourceId||c.id)===source);setSelectedId(chosen?.id||null)}}
 const checkpoint=()=>{history.current.past.push(cloneProject(projectRef.current));if(history.current.past.length>40)history.current.past.shift();history.current.future=[];setRevision(v=>v+1)}
 const commit=(fn:(p:AudioProject)=>void)=>{checkpoint();const next=cloneProject(projectRef.current);fn(next);update(next)}
 const stop=useCallback(async()=>{cancelAnimationFrame(frame.current);const c=controller.current;controller.current=null;setPlaying(false);if(c)await c.stop().catch(()=>{})},[])
 const fit=(seconds?:number)=>{
  const fullSource=Math.max(30,projectDuration(projectRef.current),...Array.from(buffers.current.values(),b=>b.duration))
  setScale(fitScale(seconds??fullSource,(timelineHost.current?.clientWidth||window.innerWidth-48)-190))
 }
 const hit=useMemo(()=>findClip(project,selectedId),[project,selectedId]),duration=project.tracks.some(t=>t.clips.length)?projectDuration(project):0
 const select=(trackId:string,id:string)=>{setSelectedId(id);setSelection(s=>({...s,trackId}))}
 const changeRange=(id:string,a:number,b:number)=>{stop();const h=findClip(projectRef.current,id),source=h&&buffers.current.get(h.clip.bufferId);if(source)commit(p=>addTrim(p,id,a,b,source.duration));setTime(0)}
 const importFiles=async(files:File[],initialMutes:Set<string>=new Set())=>{
  if(busy)return;await stop();setBusy('Reading audio…')
  try{
   for(const file of files){
    const seconds=await localMetadata(file).catch(()=>0)
    if(!seconds && !file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(file.name)){toast('Choose a supported audio file.');continue}
    if(seconds>600||file.size>70*1024*1024){if(!seconds)throw new Error('Your browser could not read this recording’s full duration. Try an MP3 or WAV source.');if(projectRef.current.tracks.length){toast('Long files use the streaming workspace. Open a fresh editor to import this file.');continue}setStreamFile(file);setStreamDuration(seconds);return}
    const decoded=await decodeAudio(await file.arrayBuffer()),id=uid('audio');buffers.current.set(id,decoded)
    const track=createTrack(file.name.replace(/\.[^.]+$/,''),projectRef.current.tracks.length),clip=createClip({bufferId:id,fileName:file.name,duration:decoded.duration});track.clips=[clip];track.muted=initialMutes.has(file.name)
    commit(p=>{retainSources(p);p.sources!.push(track);rebuildEdits(p);if(p.name.startsWith('Untitled'))p.name=track.name});select(track.id,`${clip.id}:${clip.offset.toFixed(6)}`)
   }
   fit();setTime(0)
  }catch(e){toast(e instanceof Error?e.message:'Audio could not be imported.')}finally{setBusy('')}
 }
 useEffect(()=>{if(initialized.current||!initialAudio.length)return;initialized.current=true;const files=initialAudio.map(a=>new File([a.blob],a.name,{type:a.blob.type||'audio/wav'})),mutes=new Set(initialAudio.filter(a=>a.muted).map(a=>a.name));importFiles(files,mutes);setAllTracks(initialAudio.length>1)},[initialAudio])
 useEffect(()=>{const receive=(event:Event)=>{const detail=(event as CustomEvent<{name:string;blob:Blob}>).detail;if(!detail?.blob)return;importFiles([new File([detail.blob],detail.name||'New layer.wav',{type:detail.blob.type||'audio/wav'})])};window.addEventListener('audixo-import-audio',receive);return()=>window.removeEventListener('audixo-import-audio',receive)},[])
 const togglePlay=async()=>{
  if(playing){await stop();return}if(!duration)return
  try{const from=time>=duration-.02?0:time,c=await playProject({project:projectRef.current,buffers:buffers.current,fromTime:from,onEnded:()=>{stop();setTime(duration)}});controller.current=c;setPlaying(true);let last=0;const tick=(now:number)=>{if(controller.current!==c)return;if(now-last>50){setTime(Math.min(duration,from+Math.max(0,c.ctx.currentTime-c.startCtxTime)));last=now}frame.current=requestAnimationFrame(tick)};frame.current=requestAnimationFrame(tick)}catch(e){toast(e instanceof Error?e.message:'Playback failed.')}
 }
 const travel=(direction:'past'|'future')=>{const h=history.current,stack=h[direction];if(!stack.length)return;stop();h[direction==='past'?'future':'past'].push(cloneProject(projectRef.current));update(stack.pop()!);setSelectedId(null);setRevision(v=>v+1);setTime(0)}
 const applyCut=()=>{if(!selection.trackId||selection.end<=selection.start)return;stop();commit(p=>addCut(p,selection,allTracks));setCutMode(false);setTime(0);fit();toast('Middle section removed. The remaining audio is joined.')}
 const keepRange=()=>{if(!selection.trackId||selection.end<=selection.start)return;stop();commit(p=>{const end=projectDuration(p);if(selection.end<end)addCut(p,{...selection,start:selection.end,end},allTracks);if(selection.start>0)addCut(p,{...selection,start:0,end:selection.start},allTracks)});setCutMode(false);fit();setTime(0);toast('Selected seconds retained. Restore either cut from Applied edits.')}
 const duplicate=()=>{if(!hit)return;stop();let id:string|null=null;commit(p=>{id=duplicateAudio(p,selectedId!,cutMode?selection:undefined)});const copy=projectRef.current.tracks.find(t=>t.id===hit.track.id)?.clips.find(c=>c.sourceId===id);if(copy)select(hit.track.id,copy.id);fit();toast('Audio duplicated after the existing track. Remove Duplicate from Applied edits to restore it.')}
 const gestureTargets=useRef<EditTarget[]|null>(null)
 const activeTargets=()=>selectedId?targetsFor(projectRef.current,selectedId,cutMode?selection:undefined):[]
 const patchFx=(patch:any)=>{if(!selectedId)return;stop();const targets=gestureTargets.current||activeTargets(),group=manualGroup(patch),next=cloneProject(projectRef.current);addEffect(next,targets,patch,group,`manual:${group}`);update(next)}
 const applyPreset=(preset:any)=>{if(!selectedId)return;stop();const targets=activeTargets();commit(p=>addEffect(p,targets,preset.patch,preset.name,`preset:${preset.id||preset.name}`))}
 const isolate=()=>toast('Your selected range is already the effect target. Choose a sound to apply it.')
 const patchTrack=(id:string,patch:any)=>{stop();commit(p=>{retainSources(p);Object.assign(p.sources!.find(t=>t.id===id)||{},patch);rebuildEdits(p)})}
 useEffect(()=>{
  const handler=(event:Event)=>{
   const mode=(event as CustomEvent<{mode:string}>).detail?.mode
   if(!['voice','instrumental','blend'].includes(mode))return
   stop()
   commit(project=>{
    retainSources(project)
    for(const track of project.sources||[]){
     if(track.name==='Lyrics / Vocals')track.muted=mode==='instrumental'
     else if(track.name==='Music')track.muted=mode==='voice'
     else if(['Drums','Bass','Other instruments'].includes(track.name))track.muted=true
    }
    rebuildEdits(project)
   })
   toast(mode==='voice'?'Vocal-only listening enabled.':mode==='instrumental'?'Instrumental-only listening enabled.':'Vocal and instrumental mix enabled.')
  }
  window.addEventListener('audixo-stem-mix',handler)
  return()=>window.removeEventListener('audixo-stem-mix',handler)
 },[])

 const resetSound=()=>{if(!hit)return;stop();const origin=hit.clip.sourceId||hit.clip.id;commit(p=>{p.edits=(p.edits||[]).filter(op=>!(op.kind==='effect'&&op.targets.some(t=>t.trackId===hit.track.id&&t.sourceId===origin)));rebuildEdits(p)})}
 const exportAudio=async(s:Settings)=>{if(!duration)return;await stop();setBusy('Rendering your mix…');try{const {buffer}=await renderProject(projectRef.current,buffers.current,{normalize:s.normalize,stereoRepair:s.stereoRepair});setBusy(`Encoding ${s.format.toUpperCase()}…`);const blob=s.format==='mp3'?await encodeMp3(buffer,s.kbps):encodeWav(buffer);downloadBlob(blob,`${safeFileName(project.name)}.${s.format}`);if(s.saveToLibrary)await saveMixToLibrary({name:s.libraryName||project.name,blob,format:s.format,kbps:s.kbps,duration:buffer.duration});setExportOpen(false);toast('Your audio download is ready.')}catch(e){toast(e instanceof Error?e.message:'Export failed.')}finally{setBusy('')}}
 useEffect(()=>()=>{stop();clearTimeout(messageTimer.current)},[stop])
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes((e.target as HTMLElement)?.tagName))return;if(e.code==='Space'){e.preventDefault();togglePlay()}if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();travel(e.shiftKey?'future':'past')}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)})
 void revision;void focusToolId
 if(streamFile)return <StreamingStudio file={streamFile} duration={streamDuration} onBack={()=>{setStreamFile(null);setStreamDuration(0)}}/>
 return <div className="ax-studio" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();importFiles(Array.from(e.dataTransfer.files))}}>
  <Transport name={project.name} playing={playing} time={time} duration={duration} onPlay={togglePlay} onImport={()=>input.current?.click()} onExport={()=>duration&&setExportOpen(true)} onLibrary={()=>setLibraryOpen(true)} onRecord={()=>setRecordOpen(v=>!v)} onDuplicate={duplicate} onKeepRange={keepRange} onUndo={()=>travel('past')} onRedo={()=>travel('future')} canUndo={!!history.current.past.length} canRedo={!!history.current.future.length} sourceStart={hit?.clip.offset||0} sourceEnd={hit?hit.clip.offset+hit.clip.duration:0} sourceDuration={hit?buffers.current.get(hit.clip.bufferId)?.duration||0:0} onSource={(a,b)=>hit&&changeRange(hit.clip.id,a,b)} selected={!!hit} cutMode={cutMode} onCutMode={v=>{setCutMode(v);if(hit)setSelection({start:hit.clip.start+clipTimelineDuration(hit.clip)*.35,end:hit.clip.start+clipTimelineDuration(hit.clip)*.65,trackId:hit.track.id})}} selection={selection} onSelection={setSelection} onCut={applyCut} allTracks={allTracks} onAllTracks={setAllTracks} onFit={()=>fit()} scale={scale} onScale={setScale}/>
  {recordOpen&&<Recorder onFinish={file=>importFiles([file])} onClose={()=>setRecordOpen(false)}/>}
  <div className="ax25-studio-context"><div><span className="ax25-context-dot"/><strong>{hit?.track.name||'Choose a track to edit'}</strong><small>{hit?(cutMode?'Changes target the highlighted range.':'Changes target the selected track.'):'Import audio or select a waveform to open its controls.'}</small></div><span>CONTROL DOCK <b>→</b></span></div>
  <div className={`ax-studio-body ${controls?'with-controls':''}`}><div ref={timelineHost}><Timeline project={project} buffers={buffers.current} pxPerSec={scale} selectedClipId={selectedId} playhead={time} selection={selection} cutMode={cutMode} onSelect={select} onRange={changeRange} onSelection={setSelection} onSeek={v=>{stop();setTime(v)}} onPatchTrack={patchTrack} onRemoveTrack={id=>{stop();commit(p=>{retainSources(p);p.sources=p.sources!.filter(t=>t.id!==id);p.edits=(p.edits||[]).map(op=>({...op,targets:op.targets.filter(t=>t.trackId!==id)})).filter(op=>op.targets.length);rebuildEdits(p)});setSelectedId(null)}} onImport={()=>input.current?.click()}/></div>{controls&&<Inspector clip={hit?.clip||null} track={hit?.track||null} selection={cutMode?selection:{start:0,end:0,trackId:null}} onPatchClipFx={patchFx} onCheckpoint={()=>{checkpoint();gestureTargets.current=activeTargets()}} onEditEnd={()=>{gestureTargets.current=null}} onPreset={applyPreset} onMakeRegion={isolate} onReset={resetSound}/>}</div>
  <AppliedEdits project={project} selectedTrack={hit?.track.id} onRemove={id=>{stop();commit(p=>removeEdit(p,id));fit();setTime(0)}} onReset={()=>{stop();commit(p=>{clearEdits(p)});fit();setTime(0)}} onUnmute={id=>patchTrack(id,{muted:false})}/>
  <footer className="ax-studio-footer"><span>Your mix · {project.tracks.length} tracks</span><span>Space to preview · Ctrl / ⌘ Z to undo</span></footer>
  <input ref={input} type="file" hidden multiple accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg" onChange={e=>{importFiles(Array.from(e.target.files||[]));e.target.value=''}}/>
  <ExportModal open={exportOpen} onClose={()=>setExportOpen(false)} onExport={exportAudio} busy={!!busy} projectName={project.name}/><LibraryDrawer open={libraryOpen} onClose={()=>setLibraryOpen(false)} refreshKey={revision} onSelect={mix=>{setLibraryOpen(false);importFiles([new File([mix.blob],`${mix.name}.${mix.format}`,{type:mix.blob.type})])}}/>
  {(busy||message)&&<div className="ax-status" role="status">{busy||message}</div>}
 </div>
}
