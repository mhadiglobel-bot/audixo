export type MotionMode = 'off' | '8d' | '16d'
export type EchoMode = 'classic' | 'pingpong' | 'wide'
export type EchoBehavior = 'continuous' | 'phrase'

export type ClipFx = {
  gainDb: number
  pan: number
  bassDb: number
  midDb: number
  trebleDb: number
  delayMs: number
  echoBehavior: EchoBehavior
  phrasePauseMs: number
  echoRepeats: number
  echoMode: EchoMode
  feedback: number
  delayWet: number
  reverb: number
  reverbSize: number
  reverbTone: number
  warmth: number
  harshness: number
  rumbleCut: boolean
  compressor: boolean
  limiter: boolean
  fadeIn: number
  fadeOut: number
  reverse: boolean
  speed: number
  preservePitch: boolean
  tapePitchSemitones: number
  motionMode: MotionMode
  motionDepth: number
  motionHz: number
}

export type AudioClip = {
  id: string
  sourceId?: string
  bufferId: string
  name: string
  start: number
  offset: number
  duration: number
  fx: ClipFx
}

export type AudioTrack = {
  id: string
  name: string
  color: string
  volumeDb: number
  pan: number
  muted: boolean
  solo: boolean
  clips: AudioClip[]
}

export type AudioProject = {
  id: string
  name: string
  tracks: AudioTrack[]
  sources?: AudioTrack[]
  edits?: AppliedEdit[]
  master: { gainDb: number; limiter: boolean; normalizeOnExport: boolean; stereoRepair: boolean }
}

export type EditTarget = { trackId: string; sourceId: string; start: number; end: number }
export type AppliedEdit = { id: string; kind: 'effect' | 'trim' | 'cut' | 'duplicate'; label: string; targets: EditTarget[]; scope?: EditTarget[]; patch?: Partial<ClipFx>; group?: string; copyIds?:string[] }

export type TimelineSelection = { start: number; end: number; trackId: string | null }

export type SoundPreset = {
  id: string
  name: string
  note: string
  group: string
  accent: string
  patch: Partial<ClipFx>
}
