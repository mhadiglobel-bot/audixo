import type { AudioClip, AudioProject } from './types'
import { clamp, effectiveRate, findClip } from './utils'
import { deleteRangeOnTrack } from './project'

// Source times are always seconds in the original file; edits preserve its buffer.
export function setClipSourceRange(project: AudioProject, clipId: string, a: number, b: number, sourceDuration: number) {
  const hit = findClip(project, clipId)
  if (!hit || ![a,b,sourceDuration].every(Number.isFinite)) return false
  const start = clamp(a, 0, Math.max(0, sourceDuration - .01))
  const end = clamp(b, start + .01, sourceDuration)
  hit.clip.offset = start
  hit.clip.duration = end - start
  return true
}
export function edgeRange(clip: AudioClip, edge: 'start'|'end', deltaSeconds: number, sourceDuration: number) {
  const delta = deltaSeconds * effectiveRate(clip)
  if (clip.fx.reverse) return edge === 'start'
    ? {start:clip.offset,end:clamp(clip.offset+clip.duration-delta,clip.offset+.01,sourceDuration)}
    : {start:clamp(clip.offset-delta,0,clip.offset+clip.duration-.01),end:clip.offset+clip.duration}
  return edge === 'start'
    ? { start: clamp(clip.offset + delta, 0, clip.offset + clip.duration - .01), end: clip.offset + clip.duration }
    : { start: clip.offset, end: clamp(clip.offset + clip.duration + delta, clip.offset + .01, sourceDuration) }
}
export function cutMiddle(project: AudioProject, trackId: string, a: number, b: number, allTracks = false) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b <= a) return false
  for (const track of project.tracks) if (allTracks || track.id === trackId) deleteRangeOnTrack(project, track.id, a, b, true)
  return true
}
export function fitScale(seconds: number, viewport: number) {
  return Math.min(180, Math.max(.0001, Math.max(240, viewport) / Math.max(12, seconds + Math.min(8, seconds * .012))))
}
