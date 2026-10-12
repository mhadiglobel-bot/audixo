export type ToolNavItem = {
  id: string
  name: string
  short: string
  group: string
  icon: string
  editorLabel: string
}

export type ProductTool = {
  id: string
  name: string
  route: string
  short: string
  group: string
  icon: string
  bullets: string[]
}

/*
 * Public Tools menu. These are intentionally simpler than the full editor.
 * Each task gets its own interface instead of dropping users into the full DAW.
 */
export const productTools: ProductTool[] = [
  {
    id: 'youtube-mp3',
    name: 'YouTube MP3 / MP4',
    route: '/tools/youtube-to-mp3',
    short: 'One converter for audio MP3 and video MP4, with original titles and available resolutions.',
    group: 'Convert',
    icon: '↓',
    bullets: ['Original video title', '320 kbps MP3 encoding target', '240p–1440p MP4 where supported'],
  },
  {
    id: 'mashup',
    name: 'Mashup Songs',
    route: '/tools/mashup',
    short: 'Layer two or more songs, trim each part, crossfade the sections and export one finished mix.',
    group: 'Mashup',
    icon: 'M',
    bullets: ['Multi-audio layers', 'Per-layer trim and fades', 'Preview, export and Library save'],
  },
  {id:"recorder",name:"Audio Recorder",route:"/tools/recorder",short:"Capture a microphone take, preview it and add it to your mix.",group:"Record",icon:"●",bullets:["Local microphone recording","Pause and resume","Add directly to Studio"]},
  {id:'vocals',name:'Vocals & Music',route:'/tools/vocals',short:'Separate lyrics/vocals from music, drums, bass and other instruments, then rebuild the mix.',group:'AI Stems',icon:'▥',bullets:['Studio AI separation','Five editable stem tracks','Music & beat replacement library']},
  {
    id: 'quick-trim',
    name: 'Trim Audio',
    route: '/tools/trim-audio',
    short: 'Trim by handles or exact time, then adjust volume, speed and visible fades before export.',
    group: 'Edit',
    icon: '✂',
    bullets: ['Drag + exact time trim', 'Volume + speed', 'Fade in / fade out'],
  },
  {
    id: 'echo',
    name: 'Echo',
    route: '/tools/echo',
    short: 'Add a simple echo with clear repeat time, amount and feedback controls.',
    group: 'Space',
    icon: '◌',
    bullets: ['Delay time', 'Wet mix', 'Feedback control'],
  },
  {
    id: 'slowed-reverb',
    name: 'Slowed + Reverb',
    route: '/tools/slowed-reverb',
    short: 'Choose a slowed preset or set speed and reverb yourself, then preview before download.',
    group: 'Style',
    icon: '✦',
    bullets: ['0.50×–1.00× speed', 'Reverb amount', 'Optional soft echo'],
  },
  {
    id: 'pitch',
    name: 'Pitch',
    route: '/tools/pitch',
    short: 'Move pitch deeper or brighter with beginner presets and a clear semitone control.',
    group: 'Tone',
    icon: '↕',
    bullets: ['−12 to +12 semitones', 'Output gain', 'Fast preview + export'],
  },
  {
    id: 'spatial',
    name: '8D / 16D Motion',
    route: '/tools/spatial-motion',
    short: 'Move sound left and right in headphones with simple 8D/16D depth and speed controls.',
    group: 'Motion',
    icon: '∞',
    bullets: ['8D / 16D modes', 'Motion depth', 'Orbit speed'],
  },
]

export const getProductTool = (id?: string | null) => productTools.find(tool => tool.id === id) || null

/*
 * Full-editor focused workspaces retained for backwards-compatible deep links.
 * They are no longer used as the public marketing card system.
 */
export const audioTools: ToolNavItem[] = [
  { id: 'precision-cutter', name: 'Precision Cutter', short: 'Trim edges, keep selected seconds or remove a middle section.', group: 'Edit', icon: '✂', editorLabel: 'Cutter workspace' },
  { id: 'reverb-delay', name: 'Reverb & Delay', short: 'Space, echo, feedback and wet mix.', group: 'Space', icon: '◌', editorLabel: 'Reverb & echo workspace' },
  { id: 'slowed-reverb', name: 'Slowed + Reverb', short: 'Slow the clip and add spacious reverb in one focused tool.', group: 'Style', icon: '✦', editorLabel: 'Slowed + Reverb workspace' },
  { id: 'voice-effects', name: 'Voice FX', short: 'Warm, deep, bright, radio and vocal polish.', group: 'Voice', icon: '◉', editorLabel: 'Voice workspace' },
  { id: 'speed-tempo', name: 'Speed Control', short: 'Slow down or speed up creative playback.', group: 'Time', icon: '↯', editorLabel: 'Speed workspace' },
  { id: 'pitch-tone', name: 'Pitch & Tone', short: 'Tape pitch plus tonal shaping.', group: 'Tone', icon: '⌁', editorLabel: 'Pitch workspace' },
  { id: 'reverse-audio', name: 'Reverse Audio', short: 'Flip a full clip or isolated region backward.', group: 'Creative', icon: '↶', editorLabel: 'Reverse workspace' },
  { id: 'spatial-motion', name: '8D / 16D Motion', short: 'Automated headphone left-right movement.', group: 'Motion', icon: '∞', editorLabel: 'Spatial motion workspace' },
  { id: 'eq-bass', name: 'EQ & Bass', short: 'Shape low, mid and high frequency energy.', group: 'Tone', icon: '≋', editorLabel: 'EQ workspace' },
  { id: 'fades-dynamics', name: 'Fades & Dynamics', short: 'Fade, compress and limit the selected clip.', group: 'Mix', icon: '⌁', editorLabel: 'Dynamics workspace' },
  { id: 'export-library', name: 'Export & Library', short: 'MP3/WAV export plus local saved mixes.', group: 'Finish', icon: '↓', editorLabel: 'Export workspace' },
]

export const getAudioTool = (id?: string | null) => audioTools.find((tool) => tool.id === id) || null
export const toolRoute = (id: string) => `/tool/${id}`
