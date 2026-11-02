import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import QuickAudioWorkbench from '../quick/QuickAudioWorkbench'
export default function QuickTrim(){return <SiteShell><Seo title="Audixo Trim Audio — Precision Online Audio Cutter" path="/tools/trim-audio"/><QuickAudioWorkbench mode="trim" eyebrow="TOOLS · QUICK EDIT" title="Audixo Trim Audio" description="Trim audio precisely with draggable handles, source-aware waveforms, fades and an MP3 or WAV export." tagline="Keep the moment. Cut the rest."/></SiteShell>}

// Bundled from src/pages/EchoTool.tsx to keep GitHub browser uploads below 100 files.
export function EchoTool(){return <SiteShell><Seo title="Audixo Echo & Delay — Online Audio Effect Tool" path="/tools/echo"/><QuickAudioWorkbench mode="echo" eyebrow="TOOLS · SPACE" title="Audixo Echo" description="Give vocals and music controlled repeats with delay, feedback and wet-mix controls." tagline="Let every sound resonate."/></SiteShell>}

// Bundled from src/pages/SlowedReverbTool.tsx to keep GitHub browser uploads below 100 files.
export function SlowedReverbTool(){return <SiteShell><Seo title="Audixo Slowed + Reverb — Online Audio Effect Tool" path="/tools/slowed-reverb"/><QuickAudioWorkbench mode="slowed" eyebrow="TOOLS · STYLE" title="Audixo Slowed + Reverb" description="Set playback speed, add a softer room tail and preview the result before downloading." tagline="Slow the pace. Expand the space."/></SiteShell>}

// Bundled from src/pages/PitchTool.tsx to keep GitHub browser uploads below 100 files.
export function PitchTool(){return <SiteShell><Seo title="Audixo Pitch — Online Audio Pitch Shifter" path="/tools/pitch"/><QuickAudioWorkbench mode="pitch" eyebrow="TOOLS · TONE" title="Audixo Pitch" description="Adjust semitones, preview the difference and export a deeper or brighter audio track." tagline="Shift the tone. Keep the feel."/></SiteShell>}

// Bundled from src/pages/SpatialTool.tsx to keep GitHub browser uploads below 100 files.
export function SpatialTool(){return <SiteShell><Seo title="Audixo 8D / 16D Motion — Spatial Audio Tool" path="/tools/spatial-motion"/><QuickAudioWorkbench mode="spatial" eyebrow="TOOLS · MOTION" title="Audixo 8D / 16D Motion" description="Bring motion to your headphones with stereo orbit speed, depth and smooth spatial effects." tagline="Sound that moves with you."/></SiteShell>}
