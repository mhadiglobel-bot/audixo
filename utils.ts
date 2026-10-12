import type { AudioClip, AudioProject, AudioTrack } from './types'

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
export const dbToGain = (db: number) => Math.pow(10, db / 20)

export function formatTime(seconds: number, precise = false) {
  if (!Number.isFinite(seconds)) seconds = 0
  seconds = Math.max(0, seconds)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  const base = `${h ? `${String(h).padStart(2, '0')}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return precise ? `${base}.${String(ms).padStart(3, '0')}` : base
}

export function effectiveRate(clip: AudioClip) {
  const speed = clamp(Number(clip.fx?.speed || 1), 0.5, 2)
  const pitchRate = Math.pow(2, clamp(Number(clip.fx?.tapePitchSemitones || 0), -12, 12) / 12)
  return speed * pitchRate
}

export function clipTimelineDuration(clip: AudioClip) {
  return Math.max(0.001, clip.duration / effectiveRate(clip))
}

export function projectDuration(project: AudioProject) {
  let max = 0
  for (const track of project.tracks || []) {
    for (const clip of track.clips || []) max = Math.max(max, clip.start + clipTimelineDuration(clip))
  }
  return Math.max(max, 1)
}

export function cloneProject<T>(project: T): T {
  return structuredClone(project)
}

export function findClip(project: AudioProject, clipId: string | null | undefined): { track: AudioTrack; clip: AudioClip } | null {
  if (!clipId) return null
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === clipId)
    if (clip) return { track, clip }
  }
  return null
}

export function findTrack(project: AudioProject, trackId: string | null | undefined) {
  if (!trackId) return null
  return project.tracks.find((t) => t.id === trackId) || null
}

export function safeFileName(name: string) {
  return String(name || 'mix').replace(/\.[^/.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'mix'
}
