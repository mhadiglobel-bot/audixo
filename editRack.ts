import type { AppliedEdit, AudioClip, AudioProject, ClipFx, EditTarget, TimelineSelection } from './types'
import { cloneProject, clipTimelineDuration, effectiveRate, findClip, uid } from './utils'
import { defaultClipFx } from './project'

const sourceId = (clip: AudioClip) => clip.sourceId || clip.id
export function retainSources(project: AudioProject) {
  if (!project.sources) project.sources = cloneProject(project).tracks
  project.edits ||= []
}
export function targetsFor(project: AudioProject, clipId: string, selection?: TimelineSelection): EditTarget[] {
  const hit = findClip(project, clipId)
  if (!hit) return []
  const ranged = selection && selection.trackId === hit.track.id && selection.end > selection.start + .005
  const targets = hit.track.clips.filter(c => ranged || sourceId(c) === sourceId(hit.clip)).flatMap(c => {
    const a = ranged ? Math.max(c.start, selection!.start) : c.start
    const b = ranged ? Math.min(c.start + clipTimelineDuration(c), selection!.end) : c.start + clipTimelineDuration(c)
    if (b <= a + .005) return []
    const rate = effectiveRate(c)
    const start = c.fx.reverse ? c.offset + c.duration - (b-c.start)*rate : c.offset + (a-c.start)*rate
    const end = c.fx.reverse ? c.offset + c.duration - (a-c.start)*rate : c.offset + (b-c.start)*rate
    return [{trackId:hit.track.id, sourceId:sourceId(c), start, end}]
  })
  const merged:EditTarget[]=[]
  targets.sort((a,b)=>a.sourceId.localeCompare(b.sourceId)||a.start-b.start).forEach(t=>{const last=merged[merged.length-1];if(last&&last.sourceId===t.sourceId&&last.trackId===t.trackId&&Math.abs(last.end-t.start)<.00001)last.end=t.end;else merged.push({...t})})
  return merged
}
// All edit ranges refer to original source seconds. Removing an earlier cut does
// not move a later effect onto different audio, and source buffers are never lost.
export function rebuildEdits(project: AudioProject) {
  if (!project.sources) return
  const edits = project.edits || []
  project.tracks = project.sources.map(track => {
    let cursor = 0
    const clips: AudioClip[] = []
    for (const source of track.clips) {
      const id = sourceId(source), end = source.offset + source.duration
      const relevant = edits.filter(op => op.targets.some(t => t.trackId === track.id && t.sourceId === id))
      const bounds = new Set([source.offset, end])
      relevant.forEach(op => [...op.targets,...(op.scope||[])].filter(t => t.trackId === track.id && t.sourceId === id).forEach(t => { bounds.add(Math.max(source.offset, Math.min(end,t.start))); bounds.add(Math.max(source.offset,Math.min(end,t.end))) }))
      const points = [...bounds].sort((a,b)=>a-b), segments: AudioClip[] = []
      for (let i=0;i<points.length-1;i++) {
        const a=points[i], b=points[i+1], middle=(a+b)/2
        if (b-a<.0001) continue
        const contains=(op:AppliedEdit)=>op.targets.some(t=>t.trackId===track.id&&t.sourceId===id&&middle>=t.start-.00001&&middle<=t.end+.00001)
        const inScope=(op:AppliedEdit)=>!op.scope||op.scope.some(t=>t.trackId===track.id&&t.sourceId===id&&middle>=t.start-.00001&&middle<=t.end+.00001)
        if (relevant.some(op=>op.kind==='trim'&&inScope(op)&&!contains(op)) || relevant.some(op=>op.kind==='cut'&&contains(op))) continue
        const fx={...source.fx}
        relevant.forEach(op=>{if(op.kind==='effect'&&contains(op))Object.assign(fx,op.patch)})
        const previous=segments[segments.length-1]
        if(previous && Math.abs(previous.offset+previous.duration-a)<.00001 && JSON.stringify(previous.fx)===JSON.stringify(fx)) previous.duration+=b-a
        else segments.push({...source,id:`${id}:${a.toFixed(6)}`,sourceId:id,offset:a,duration:b-a,fx})
      }
      if(segments.length && segments.every(c=>c.fx.reverse))segments.reverse()
      for(const c of segments){c.start=cursor;cursor+=clipTimelineDuration(c);clips.push(c)}
    }
    return {...track,clips}
  })
}
export function addEffect(project:AudioProject,targets:EditTarget[],patch:Partial<ClipFx>,label:string,group?:string) {
  if(!targets.length)return
  retainSources(project)
  const existing=group && project.edits!.find(op=>op.kind==='effect'&&op.group===group&&JSON.stringify(op.targets)===JSON.stringify(targets))
  if(existing){existing.patch={...existing.patch,...patch};existing.label=label;project.edits=project.edits!.filter(op=>op.id!==existing.id);project.edits.push(existing)}
  else project.edits!.push({id:uid('edit'),kind:'effect',targets,patch:{...patch},label,group})
  rebuildEdits(project)
}
export function addTrim(project:AudioProject,clipId:string,start:number,end:number,sourceDuration:number) {
  const hit=findClip(project,clipId)
  if(!hit || ![start,end].every(Number.isFinite) || end-start<.01)return
  retainSources(project)
  const id=sourceId(hit.clip),target={trackId:hit.track.id,sourceId:id,start:Math.max(0,start),end:Math.min(sourceDuration,end)}
  const previous=project.edits!.find(op=>op.kind==='trim'&&op.targets.some(t=>t.trackId===target.trackId&&t.sourceId===id&&Math.abs(t.start-hit.clip.offset)<.00001&&Math.abs(t.end-hit.clip.offset-hit.clip.duration)<.00001))
  const scope=previous?.scope||[{...target,start:hit.clip.offset,end:hit.clip.offset+hit.clip.duration}]
  project.edits=project.edits!.filter(op=>op.id!==previous?.id)
  if(target.start>scope[0].start+.00001||target.end<scope[0].end-.00001)project.edits.push({id:previous?.id||uid('trim'),kind:'trim',label:`Trim · ${target.start.toFixed(2)}–${target.end.toFixed(2)} s`,targets:[target],scope})
  rebuildEdits(project)
}
export function addCut(project:AudioProject,selection:TimelineSelection,allTracks=false) {
  if(selection.end<=selection.start || !selection.trackId)return
  retainSources(project)
  const targets=project.tracks.filter(t=>allTracks||t.id===selection.trackId).flatMap(t=>t.clips.length?targetsFor(project,t.clips[0].id,{...selection,trackId:t.id}):[])
  if(targets.length)project.edits!.push({id:uid('cut'),kind:'cut',label:`Middle cut · ${(selection.end-selection.start).toFixed(2)} s`,targets})
  rebuildEdits(project)
}
export function removeEdit(project:AudioProject,id:string) {
 const copies=project.edits?.find(op=>op.id===id)?.copyIds||[]
 if(copies.length){project.sources?.forEach(track=>{track.clips=track.clips.filter(c=>!copies.includes(sourceId(c)))});project.edits=project.edits?.map(op=>({...op,targets:op.targets.filter(t=>!copies.includes(t.sourceId))})).filter(op=>op.targets.length)}
 project.edits=(project.edits||[]).filter(op=>op.id!==id);rebuildEdits(project)
}
export function clearEdits(project:AudioProject){for(const op of [...(project.edits||[])])if(op.kind==='duplicate')removeEdit(project,op.id);project.edits=[];rebuildEdits(project)}
export function duplicateAudio(project:AudioProject,clipId:string,selection?:TimelineSelection){
 const hit=findClip(project,clipId);if(!hit)return null
 retainSources(project);const source=project.sources!.find(t=>t.id===hit.track.id)!
 const ranged=selection?.trackId===hit.track.id&&selection.end>selection.start+.005
 const originals=hit.track.clips.filter(c=>!ranged||Math.min(c.start+clipTimelineDuration(c),selection!.end)>Math.max(c.start,selection!.start)+.005)
 const copies:AudioClip[]=originals.map(c=>{
  const a=ranged?Math.max(c.start,selection!.start):c.start,b=ranged?Math.min(c.start+clipTimelineDuration(c),selection!.end):c.start+clipTimelineDuration(c)
  const rate=effectiveRate(c),offset=c.fx.reverse?c.offset+c.duration-(b-c.start)*rate:c.offset+(a-c.start)*rate,id=uid('copy')
  return {...c,id,sourceId:id,name:`${c.name} · copy`,start:0,offset,duration:(b-a)*rate,fx:{...defaultClipFx}}
 })
 if(!copies.length)return null
 source.clips.push(...copies)
 const targets=copies.map(c=>({trackId:hit.track.id,sourceId:c.id,start:c.offset,end:c.offset+c.duration}))
 const id=uid('duplicate');project.edits!.push({id,kind:'duplicate',label:ranged?'Duplicate selected range':`Duplicate · ${hit.track.name}`,targets,copyIds:copies.map(c=>c.id)})
 originals.forEach((original,n)=>{if(JSON.stringify(original.fx)!==JSON.stringify(defaultClipFx))project.edits!.push({id:uid('copyfx'),kind:'effect',label:'Copied sound',targets:[targets[n]],patch:{...original.fx},group:`copied:${copies[n].id}`})})
 rebuildEdits(project);return copies[0].id
}
export function manualGroup(patch:Partial<ClipFx>):string {
  const key=Object.keys(patch)[0]
  return ({
    gainDb:'Gain',pan:'Pan',bassDb:'Bass',midDb:'Mid',trebleDb:'Treble',delayMs:'Delay time',delayWet:'Delay wet',feedback:'Feedback',reverb:'Reverb',compressor:'Compressor',limiter:'Limiter',fadeIn:'Fade in',fadeOut:'Fade out',reverse:'Reverse',speed:'Speed',preservePitch:'Pitch lock',tapePitchSemitones:'Tape pitch',motionMode:'Stereo motion mode',motionDepth:'Motion depth',motionHz:'Motion speed'
  } as Record<string,string>)[key] || 'Sound control'
}
