import { useEffect, useState } from 'react'
import Icon from './Icons'
import {AudixoSelect} from '../components/QualityRail'
import { libraryLimit } from './library'

type Settings={format:'mp3'|'wav';kbps:number;normalize:boolean;stereoRepair:boolean;saveToLibrary:boolean;downloadName:string}
type Props={open:boolean;onClose:()=>void;onExport:(settings:Settings)=>void;busy:boolean;projectName:string}

export default function ExportModal({open,onClose,onExport,busy,projectName}:Props){
  const [format,setFormat]=useState<'mp3'|'wav'>('mp3');const [kbps,setKbps]=useState(320);const [normalize,setNormalize]=useState(true);const [stereoRepair,setStereoRepair]=useState(true);const [saveToLibrary,setSaveToLibrary]=useState(true);const [downloadName,setDownloadName]=useState(projectName)
  useEffect(()=>{if(open)setDownloadName(projectName)},[open,projectName]);if(!open)return null
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="export-modal glass-panel" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose}>×</button><div className="modal-icon"><Icon name="download" size={21}/></div><span className="modal-kicker">FINAL MIX</span><h2>Export your audio</h2><p>Render the timeline with effects, motion, peak protection and optional browser-library storage.</p>
    <div className="format-switch"><button className={format==='mp3'?'active':''} onClick={()=>setFormat('mp3')}><strong>MP3</strong><small>Portable delivery</small></button><button className={format==='wav'?'active':''} onClick={()=>setFormat('wav')}><strong>WAV</strong><small>Lossless PCM</small></button></div>
    {format==='mp3'&&<label className="export-row"><span><strong>MP3 bitrate</strong><small>Use 320 kbps for the highest option available here.</small></span><AudixoSelect ariaLabel="Final MP3 bitrate" value={String(kbps)} options={[64,128,192,256,320].map(v=>({value:String(v),label:`${v} kbps`}))} onChange={v=>setKbps(Number(v))}/></label>}
    <label className="export-check"><input type="checkbox" checked={normalize} onChange={e=>setNormalize(e.target.checked)}/><span><strong>Normalize final peak</strong><small>Bring the render to safe headroom without intentionally maximizing loudness.</small></span></label>
    <label className="export-check"><input type="checkbox" checked={stereoRepair} onChange={e=>setStereoRepair(e.target.checked)}/><span><strong>Repair effectively one-sided audio</strong><small>If one channel is nearly silent, copy the audible side to both channels. Disable for intentional hard panning.</small></span></label>
    <label className="export-check"><input type="checkbox" checked={saveToLibrary} onChange={e=>setSaveToLibrary(e.target.checked)}/><span><strong>Save to browser library</strong><small>Keep a local copy. Maximum {libraryLimit} saved exports.</small></span></label>
    <label className="export-row ax67-download-name"><span><strong>Download filename</strong><small>Exactly this name (with unsafe filename symbols removed), followed by (Audixo).{format}.</small></span><input className="export-name-input" aria-label="Download filename" value={downloadName} maxLength={100} onChange={e=>setDownloadName(e.target.value)} placeholder="My finished mix" /></label>
    <div className="export-summary"><span>44.1 kHz</span><span>Stereo</span><span>{format==='mp3'?`${kbps} kbps`:'16-bit PCM'}</span><span>Master limiter</span><span>{saveToLibrary?'Library save on':'Download only'}</span></div>
    <div className="modal-actions"><button className="button button-glass" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy} onClick={()=>onExport({format,kbps,normalize,stereoRepair,saveToLibrary,downloadName})}>{busy?'Rendering…':`Export ${format.toUpperCase()}`}</button></div>
  </section></div>
}
