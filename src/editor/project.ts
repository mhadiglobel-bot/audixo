import type { AudioClip, AudioProject, AudioTrack, ClipFx, SoundPreset } from './types'
import { uid, clamp, findClip, clipTimelineDuration, effectiveRate } from './utils'

export const trackColors = ['#39ff14','#43e8ed','#7aafff','#f098de','#b7d5cc','#8cf6ba']

export const defaultClipFx: ClipFx = {
  gainDb: 0, pan: 0, bassDb: 0, midDb: 0, trebleDb: 0,
  delayMs: 0, echoBehavior: 'continuous', phrasePauseMs: 450, echoRepeats: 3, echoMode: 'classic', feedback: 0.2, delayWet: 0, reverb: 0, reverbSize: .55, reverbTone: .42, warmth: 0, harshness: 0, rumbleCut: false,
  compressor: false, limiter: true, fadeIn: 0, fadeOut: 0,
  reverse: false, speed: 1, preservePitch: false, tapePitchSemitones: 0,
  motionMode: 'off', motionDepth: 0.78, motionHz: 0.16,
}

export const soundPresets: SoundPreset[] = [
 {id:'vocal-aura',name:'Vocal Aura',note:'smooth spacious voice · absolutely no delay repeats',group:'Vocals',accent:'violet',patch:{delayMs:0,delayWet:0,feedback:.2,reverb:.53,reverbSize:.73,reverbTone:.34,warmth:.35,harshness:.36,rumbleCut:true,compressor:true,limiter:true}},
 {id:'deep-clean-voice',name:'Deep Clean Voice',note:'body and warmth · reduced metallic bite',group:'Voice',accent:'green',patch:{bassDb:1,midDb:-.3,trebleDb:-1,warmth:.72,harshness:.75,rumbleCut:true,delayWet:0,reverb:.13,reverbSize:.34,reverbTone:.3,compressor:true,limiter:true}},
 {id:'silky-hall',name:'Silky Hall',note:'long diffuse air · warm smooth tail',group:'Space',accent:'violet',patch:{delayMs:0,delayWet:0,reverb:.66,reverbSize:.94,reverbTone:.25,warmth:.28,harshness:.52,compressor:true,limiter:true}},
 {id:'phrase-trail',name:'Phrase Trail',note:'automatic vocal pause echo · no word-by-word repeats',group:'Vocals',accent:'cyan',patch:{echoBehavior:'phrase',phrasePauseMs:450,echoRepeats:3,delayMs:355,delayWet:.47,feedback:.37,echoMode:'wide',reverb:.15,reverbTone:.34,harshness:.18,limiter:true}},
 {id:'soft-pause',name:'Soft Pause Echo',note:'one gentle repeat at longer pauses',group:'Song edit',accent:'blue',patch:{echoBehavior:'phrase',phrasePauseMs:700,echoRepeats:1,delayMs:380,delayWet:.28,feedback:.18,echoMode:'classic',reverb:.22,reverbSize:.55,limiter:true}},
 {id:'bass-smooth',name:'Bass + Smooth Voice',note:'round bass / less harsh metallic edge',group:'Tone',accent:'green',patch:{bassDb:3,trebleDb:-1.4,warmth:.48,harshness:.67,rumbleCut:true,compressor:true,limiter:true}},
 {id:'lofi-vocal',name:'Lo-fi Vocal',note:'warm vocals · smooth highs · no repeats',group:'Vocals',accent:'green',patch:{warmth:.6,harshness:.38,bassDb:2,midDb:1,trebleDb:-3,reverb:.18,reverbSize:.3,reverbTone:.25,delayWet:0,compressor:true,limiter:true}},
 {id:'echo-vocal',name:'Echo Vocal',note:'phrase-end repeats · skips gaps between words',group:'Vocals',accent:'orange',patch:{delayMs:320,echoBehavior:'phrase',phrasePauseMs:450,echoRepeats:3,echoMode:'classic',delayWet:.4,feedback:.34,reverb:.12,reverbSize:.42,limiter:true}},
  { id:'slowed-reverb', name:'Slowed + Reverb', note:'0.86x · tape-style slow', group:'Song edit', accent:'violet', patch:{ speed:.86, preservePitch:false, reverb:.34, delayMs:110, delayWet:.07, feedback:.15, bassDb:1.2, compressor:true } },
  { id:'slowed-reverb-pitch-lock', name:'Slowed + Reverb · Pitch Lock', note:'0.86x · vocal pitch stays close', group:'Song edit', accent:'green', patch:{ speed:.86, preservePitch:true, reverb:.32, delayMs:105, delayWet:.06, feedback:.12, compressor:true, limiter:true } },
  { id:'8d-orbit', name:'8D Orbit', note:'smooth left-right motion', group:'Spatial', accent:'cyan', patch:{ motionMode:'8d', motionDepth:.86, motionHz:.16, reverb:.12, limiter:true } },
  { id:'16d-motion', name:'16D Motion', note:'deeper moving stereo', group:'Spatial', accent:'blue', patch:{ motionMode:'16d', motionDepth:.96, motionHz:.22, reverb:.18, delayMs:90, delayWet:.05, limiter:true } },
  { id:'deep-voice', name:'Deep Voice', note:'lower tape pitch · warm', group:'Voice', accent:'pink', patch:{ tapePitchSemitones:-3, bassDb:2.8, midDb:.6, trebleDb:-1.2, compressor:true } },
  { id:'vocal-glow', name:'Vocal Glow', note:'clear · polished, naturally spacious vocal', group:'Voice', accent:'cyan', patch:{ warmth:.26, harshness:.36, bassDb:-1, midDb:1.5, trebleDb:.3, reverb:.22, reverbSize:.46, reverbTone:.55, delayWet:0, compressor:true } },
  { id:'dream-echo', name:'Dream Echo', note:'airy repeating space', group:'Song edit', accent:'blue', patch:{ reverb:.2, delayMs:360, delayWet:.2, feedback:.3, trebleDb:1.1, compressor:true } },
  { id:'deep-bass', name:'Deep Bass', note:'warm controlled low end', group:'Tone', accent:'pink', patch:{ gainDb:-1.2, bassDb:5, midDb:-.8, trebleDb:-.4, compressor:true, limiter:true } },
  { id:'reverse-dream', name:'Reverse Dream', note:'reversed transition texture', group:'Creative', accent:'orange', patch:{ reverse:true, reverb:.3, delayMs:160, delayWet:.08, feedback:.12 } },
  { id:'radio-voice', name:'Radio Voice', note:'mid-forward compact voice', group:'Voice', accent:'orange', patch:{ bassDb:-8, midDb:5, trebleDb:-5, compressor:true, limiter:true } },
  { id:'clean-punch', name:'Clean Punch', note:'tight present dynamics', group:'Tone', accent:'green', patch:{ gainDb:-.5, bassDb:2, midDb:1.2, trebleDb:1.2, compressor:true, limiter:true } },
  { id:'echo-slow-space', name:'Echo + Slow Space', note:'0.90x · echo · soft reverb', group:'Song edit', accent:'cyan', patch:{ speed:.90, reverb:.26, delayMs:300, delayWet:.18, feedback:.26, compressor:true, limiter:true } },
  { id:'pitch-safe-space', name:'Original Pitch Space', note:'normal speed · wider ambience', group:'Song edit', accent:'green', patch:{ speed:1, preservePitch:true, tapePitchSemitones:0, reverb:.28, delayMs:115, delayWet:.07, feedback:.12, compressor:true, limiter:true } },
  { id:'night-drive', name:'Night Drive', note:'0.92x · wide motion · glow', group:'Spatial', accent:'blue', patch:{ speed:.92, reverb:.20, motionMode:'8d', motionDepth:.72, motionHz:.12, delayMs:180, delayWet:.06, compressor:true, limiter:true } },
  { id:'soft-outro', name:'Soft Outro', note:'fade · reverb · clean ending', group:'Finish', accent:'violet', patch:{ fadeOut:3.2, reverb:.18, delayMs:130, delayWet:.04, feedback:.08, limiter:true } },
  {id:'wide-echo',name:'Wide Echo',note:'stereo bounce / controlled echoes',group:'Spatial',accent:'cyan',patch:{delayMs:340,echoMode:'pingpong',delayWet:.22,feedback:.29,motionMode:'8d',motionDepth:.64,motionHz:.10,reverb:.14,limiter:true }},
  { id:'velvet-room', name:'Velvet Room', note:'warm reverb · no rhythmic repeats', group:'Space', accent:'violet', patch:{ warmth:.58,harshness:.32,bassDb:1,trebleDb:-1,reverb:.45,reverbSize:.7,reverbTone:.23,delayWet:0,compressor:true,limiter:true } },
  { id:'neon-air', name:'Neon Air', note:'bright / airy / polished', group:'Tone', accent:'cyan', patch:{ bassDb:-1,midDb:1.2,trebleDb:4,reverb:.1,compressor:true } },
  { id:'pulse-bass', name:'Pulse Bass', note:'deep / punchy / clean', group:'Tone', accent:'green', patch:{ bassDb:5,midDb:1,gainDb:-1.5,compressor:true,limiter:true } },
  { id:'pink-haze', name:'Pink Haze', note:'soft echo / dreamy room', group:'Creative', accent:'pink', patch:{ reverb:.38,delayMs:410,delayWet:.15,feedback:.23,trebleDb:1 } },
  { id:'clear-stage', name:'Clear Stage', note:'wide / present / controlled', group:'Finish', accent:'blue', patch:{ midDb:1.5,trebleDb:1.8,reverb:.09,compressor:true,limiter:true } },
  { id:'midnight-slow', name:'Midnight Slow', note:'0.80x / pitch lock / dark room', group:'Song edit', accent:'violet', patch:{ speed:.8,preservePitch:true,reverb:.3,bassDb:1.5,trebleDb:-2,compressor:true } },
  { id:'soft-tape', name:'Soft Tape', note:'0.94x / warm / gentle', group:'Song edit', accent:'orange', patch:{ speed:.94,preservePitch:false,bassDb:1.8,trebleDb:-3,reverb:.12,compressor:true } },
  { id:'vocal-crystal', name:'Vocal Crystal', note:'clear consonants · smoother piercing frequencies', group:'Vocals', accent:'cyan', patch:{ bassDb:-2,midDb:1,trebleDb:1.2,harshness:.44,compressor:true,limiter:true } },
  { id:'deep-orbit', name:'Deep Orbit', note:'16D / slow orbit / deep room', group:'Spatial', accent:'blue', patch:{ motionMode:'16d',motionDepth:.9,motionHz:.08,reverb:.24,bassDb:1.5 } },
  { id:'quick-glow', name:'Quick Glow', note:'short echo / bright finish', group:'Creative', accent:'green', patch:{ delayMs:165,delayWet:.12,feedback:.1,trebleDb:2,reverb:.08,limiter:true } },
  { id:'ambient-lift', name:'Ambient Lift', note:'open reverb / airy lift', group:'Space', accent:'violet', patch:{ reverb:.48,delayMs:120,delayWet:.04,trebleDb:2 } },
  { id:'final-polish', name:'Final Polish', note:'balanced / limited / ready', group:'Finish', accent:'green', patch:{ bassDb:.6,midDb:.8,trebleDb:1,compressor:true,limiter:true } },
]


const soundFlavors:Array<[string,string,string,Partial<ClipFx>]>= [
 ['Silk Vocal','Vocals','soft air and gentle compression',{bassDb:-1,trebleDb:3,reverb:.08,compressor:true}],
 ['Close Vocal','Vocals','dry and present',{midDb:2,trebleDb:1,reverb:0,delayWet:0,compressor:true}],
 ['Velvet Vocal','Vocals','warm lower tone',{bassDb:3,midDb:.8,trebleDb:-2,compressor:true}],
 ['Bright Lead','Vocals','lifted presence',{bassDb:-2,midDb:2,trebleDb:4,compressor:true}],
 ['Soft Harmony','Vocals','gentle supporting tone',{gainDb:-3,reverb:.18,trebleDb:-1}],
 ['Vocal Room','Vocals','a small natural space',{reverb:.12,delayWet:0,compressor:true}],
 ['Vocal Hall','Vocals','a deeper ambient tail',{reverb:.42,delayMs:90,delayWet:.05}],
 ['Whisper Air','Vocals','light highs and restrained level',{gainDb:-2,bassDb:-3,trebleDb:5,reverb:.1}],
 ['Warm Podcast','Voice','smooth spoken-word tone',{bassDb:2,midDb:1,compressor:true,reverb:0}],
 ['Crisp Narration','Voice','clear speech presence',{bassDb:-1,midDb:3,trebleDb:2,compressor:true}],
 ['Dark Narration','Voice','rounded low voice',{trebleDb:-4,bassDb:2,compressor:true}],
 ['Small Radio','Voice','narrower mid-focused tone',{bassDb:-9,midDb:5,trebleDb:-8,compressor:true}],
 ['Gentle Voice','Voice','softer level and space',{gainDb:-2,trebleDb:-2,reverb:.07}],
 ['Telephone Tone','Voice','a focused midrange texture',{bassDb:-12,midDb:7,trebleDb:-12,compressor:true}],
 ['Tight Slap','Echo','short repeat',{delayMs:85,delayWet:.14,feedback:.08}],
 ['Studio Slap','Echo','a fuller slapback',{delayMs:130,delayWet:.2,feedback:.12}],
 ['Quarter Echo','Echo','steady slower repeats',{delayMs:500,delayWet:.18,feedback:.24}],
 ['Quick Echo','Echo','a nimble repeating texture',{delayMs:175,delayWet:.16,feedback:.22}],
 ['Soft Repeat','Echo','subtle trailing detail',{delayMs:280,delayWet:.08,feedback:.16}],
 ['Long Repeat','Echo','long controlled repeats',{delayMs:700,delayWet:.22,feedback:.3}],
 ['Echo Bloom','Echo','repeats into reverb',{delayMs:330,delayWet:.22,reverb:.26,feedback:.28}],
 ['Dry Echo','Echo','defined repeats without reverb',{delayMs:250,delayWet:.2,reverb:0,feedback:.2}],
 ['Tiny Room','Space','a hint of ambience',{reverb:.06,delayWet:0}],
 ['Small Room','Space','light reverb around the sound',{reverb:.14,delayWet:0}],
 ['Open Hall','Space','a broad ambient tail',{reverb:.4,delayWet:.03,delayMs:120}],
 ['Cloud Tail','Space','deep atmospheric reverb',{reverb:.58,delayMs:220,delayWet:.08}],
 ['Bass Lift','Tone','a little extra low end',{bassDb:3,gainDb:-1,limiter:true}],
 ['Bass Focus','Tone','low end with softer highs',{bassDb:5,trebleDb:-3,gainDb:-2,limiter:true}],
 ['Beat Presence','Tone','definition around mids',{bassDb:1,midDb:3,trebleDb:2,compressor:true}],
 ['Soft Highs','Tone','a smoother top end',{trebleDb:-5,midDb:.5}],
 ['Air Lift','Tone','brighter upper detail',{bassDb:-1,trebleDb:4}],
 ['Warm Tape','Tone','a warmer balanced texture',{bassDb:2,midDb:1,trebleDb:-4,compressor:true}],
 ['Clean Balance','Tone','gentle control without added space',{bassDb:1,midDb:.5,trebleDb:1,compressor:true,reverb:0}],
 ['Slow Orbit','Motion','gentle headphone movement',{motionMode:'8d',motionHz:.06,motionDepth:.55}],
 ['Fast Orbit','Motion','faster headphone movement',{motionMode:'8d',motionHz:.35,motionDepth:.85}],
 ['Wide Drift','Motion','wide stereo movement and space',{motionMode:'16d',motionHz:.1,motionDepth:.95,reverb:.22}],
 ['Slow Clean','Speed','0.9× with pitch lock',{speed:.9,preservePitch:true,reverb:0,tapePitchSemitones:0}],
 ['Slow Velvet','Speed','0.8× and a warm tail',{speed:.8,preservePitch:true,reverb:.2,trebleDb:-2}],
 ['Bright Rush','Speed','1.12× tape-style lift',{speed:1.12,preservePitch:false,reverb:.04}],
 ['Soft Intro','Finish','two-second entrance',{fadeIn:2,limiter:true}],
 ['Long Goodbye','Finish','six-second ending',{fadeOut:6,reverb:.18,limiter:true}],
 ['Gentle Edges','Finish','smooth entrance and exit',{fadeIn:1.2,fadeOut:2.5,compressor:true,limiter:true}]
]
soundPresets.push(...soundFlavors.map(([name,group,note,patch],i)=>({id:'sound-'+i,name,group,note,patch,accent:i%3?'cyan':'green'})))
// Audixo keeps exactly 30 focused effect presets; the 60 music/beat layers live in the separate sound bank.
soundPresets.length=30

export function createProject(name = 'Untitled Mix'): AudioProject {
  return { id: uid('project'), name, tracks: [], master: { gainDb:0, limiter:true, normalizeOnExport:true, stereoRepair:true } }
}

export function createTrack(name: string, index = 0): AudioTrack {
  return { id:uid('track'), name:name || `Track ${index+1}`, color:trackColors[index % trackColors.length], volumeDb:0, pan:0, muted:false, solo:false, clips:[] }
}

export function createClip({ bufferId, fileName, start = 0, duration, offset = 0 }: { bufferId:string; fileName:string; start?:number; duration:number; offset?:number }): AudioClip {
  return { id:uid('clip'), bufferId, name:fileName || 'Audio clip', start, offset, duration, fx:{ ...defaultClipFx } }
}

export function splitClip(project: AudioProject, clipId: string, time: number) {
  const hit = findClip(project, clipId); if (!hit) return null
  const { track, clip } = hit
  const rate = effectiveRate(clip)
  const timelineLocal = time - clip.start
  const timelineDuration = clipTimelineDuration(clip)
  if (timelineLocal <= .005 || timelineLocal >= timelineDuration - .005) return null
  const sourceLocal = timelineLocal * rate
  const left: AudioClip = clip.fx.reverse
    ? { ...clip, id:uid('clip'), offset:clip.offset + clip.duration - sourceLocal, duration:sourceLocal, fx:{...clip.fx, fadeOut:Math.min(clip.fx.fadeOut,timelineLocal)} }
    : { ...clip, id:uid('clip'), duration:sourceLocal, fx:{...clip.fx, fadeOut:Math.min(clip.fx.fadeOut,timelineLocal)} }
  const right: AudioClip = clip.fx.reverse
    ? { ...clip, id:uid('clip'), start:time, offset:clip.offset, duration:clip.duration-sourceLocal, fx:{...clip.fx, fadeIn:Math.min(clip.fx.fadeIn,timelineDuration-timelineLocal)} }
    : { ...clip, id:uid('clip'), start:time, offset:clip.offset+sourceLocal, duration:clip.duration-sourceLocal, fx:{...clip.fx, fadeIn:Math.min(clip.fx.fadeIn,timelineDuration-timelineLocal)} }
  const idx=track.clips.findIndex(c=>c.id===clipId); track.clips.splice(idx,1,left,right)
  return { leftId:left.id, rightId:right.id }
}

export function isolateSelection(project: AudioProject, clipId: string, start: number, end: number) {
  if (!(end > start)) return clipId
  let targetId = clipId
  let hit=findClip(project,targetId); if(!hit) return null
  let cs=hit.clip.start; let ce=cs+clipTimelineDuration(hit.clip)
  const a=clamp(start,cs,ce); const b=clamp(end,cs,ce)
  if (b-a<.005) return targetId
  if (a>cs+.005) { const r=splitClip(project,targetId,a); if(!r) return null; targetId=r.rightId }
  hit=findClip(project,targetId); if(!hit) return null
  ce=hit.clip.start+clipTimelineDuration(hit.clip)
  if (b<ce-.005) { const r=splitClip(project,targetId,b); if(r) targetId=r.leftId }
  return targetId
}

export function findClipAtTime(project: AudioProject, trackId: string, start: number, end = start) {
  const track=project.tracks.find(t=>t.id===trackId); if(!track) return null
  return track.clips.find(clip=>{ const cs=clip.start, ce=cs+clipTimelineDuration(clip); return Math.max(cs,start)<Math.min(ce,end||start+.001)||(start>=cs&&start<=ce) }) || null
}

export function applyPresetToSelection(project: AudioProject, trackId:string, clipId:string|null, start:number, end:number, patch:Partial<ClipFx>) {
  let targetId=clipId
  const hit=findClip(project,targetId)
  const hitOverlaps=hit&&hit.track.id===trackId&&Math.max(hit.clip.start,start)<Math.min(hit.clip.start+clipTimelineDuration(hit.clip),end>start?end:start+.001)
  if(!hitOverlaps){ const clip=findClipAtTime(project,trackId,start,end); targetId=clip?.id || null }
  if(!targetId) return null
  if(end>start+.005) targetId=isolateSelection(project,targetId,start,end)
  const target=findClip(project,targetId); if(!target) return null
  target.clip.fx={...target.clip.fx,...patch}
  return targetId
}

export function deleteRangeOnTrack(project:AudioProject, trackId:string, start:number, end:number, ripple=false) {
  if(!(end>start)) return
  const track=project.tracks.find(t=>t.id===trackId); if(!track) return
  const cut=end-start; const out:AudioClip[]=[]
  for(const clip of track.clips){
    const rate=effectiveRate(clip); const cs=clip.start; const ce=cs+clipTimelineDuration(clip)
    if(ce<=start||cs>=end){ out.push(ripple&&cs>=end?{...clip,start:Math.max(0,cs-cut)}:clip); continue }
    if(cs<start){
      const leftTimeline=start-cs
      const leftSource=leftTimeline*rate
      out.push(clip.fx.reverse
        ? {...clip,id:uid('clip'),offset:clip.offset+clip.duration-leftSource,duration:leftSource}
        : {...clip,id:uid('clip'),duration:leftSource})
    }
    if(ce>end){
      const consumedTimeline=Math.max(0,end-cs)
      const consumedSource=consumedTimeline*rate
      out.push(clip.fx.reverse
        ? {...clip,id:uid('clip'),start:ripple?start:end,offset:clip.offset,duration:Math.max(.001,clip.duration-consumedSource)}
        : {...clip,id:uid('clip'),start:ripple?start:end,offset:clip.offset+consumedSource,duration:Math.max(.001,clip.duration-consumedSource)})
    }
  }
  track.clips=out.sort((a,b)=>a.start-b.start)
}

export function trimClipToSelection(project:AudioProject, clipId:string, start:number, end:number){
  const hit=findClip(project,clipId); if(!hit||!(end>start)) return null
  const {track,clip}=hit; const rate=effectiveRate(clip); const cs=clip.start; const ce=cs+clipTimelineDuration(clip)
  const a=clamp(start,cs,ce); const b=clamp(end,cs,ce); if(b<=a)return null
  const sourceDuration=(b-a)*rate
  const trimmed:AudioClip=clip.fx.reverse
    ? {...clip,id:uid('clip'),start:cs,offset:clip.offset+clip.duration-(b-cs)*rate,duration:sourceDuration}
    : {...clip,id:uid('clip'),start:cs,offset:clip.offset+(a-cs)*rate,duration:sourceDuration}
  const idx=track.clips.findIndex(c=>c.id===clipId); track.clips.splice(idx,1,trimmed); return trimmed.id
}

export function duplicateClip(project:AudioProject,clipId:string){ const hit=findClip(project,clipId); if(!hit)return null; const copy={...hit.clip,id:uid('clip'),start:hit.clip.start+clipTimelineDuration(hit.clip)+.05,fx:{...hit.clip.fx}}; hit.track.clips.push(copy); return copy.id }
export function moveClip(project:AudioProject,clipId:string,start:number){ const hit=findClip(project,clipId); if(!hit)return; hit.clip.start=Math.max(0,start); hit.track.clips.sort((a,b)=>a.start-b.start) }
export function removeTrack(project:AudioProject,trackId:string){ project.tracks=project.tracks.filter(t=>t.id!==trackId) }
