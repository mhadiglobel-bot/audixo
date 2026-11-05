import { useEffect, useState } from 'react'
import Icon from './Icons'
import {AudixoSelect} from '../components/QualityRail'


type Settings={format:'mp3'|'wav';kbps:number;normalize:boolean;stereoRepair:boolean;saveToLibrary:boolean;downloadName:string}
type Props={open:boolean;onClose:()=>void;onExport:(settings:Settings)=>void;busy:boolean;projectName:string}

export default function ExportModal({open,onClose,onExport,busy,projectName}:Props){
  const [format,setFormat]=useState<'mp3'|'wav'>('mp3');const [kbps,setKbps]=useState(320);const [downloadName,setDownloadName]=useState(projectName);const normalize=true,stereoRepair=true,saveToLibrary=true
  useEffect(()=>{if(open)setDownloadName(projectName)},[open,projectName]);if(!open)return null
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="export-modal glass-panel ax82-export-modal" role="dialog" aria-modal="true" aria-label="Export audio"><button className="modal-close" onClick={onClose}>×</button><div className="modal-icon"><Icon name="download" size={21}/></div><span className="modal-kicker">FINAL MIX</span><h2>Export your audio</h2><p>Choose your format, quality, and exact download filename.</p>
    <div className="format-switch"><button className={format==='mp3'?'active':''} onClick={()=>setFormat('mp3')}><strong>MP3</strong><small>Portable delivery</small></button><button className={format==='wav'?'active':''} onClick={()=>setFormat('wav')}><strong>WAV</strong><small>Lossless PCM</small></button></div>
    {format==='mp3'&&<label className="export-row"><span><strong>MP3 bitrate</strong><small>Use 320 kbps for the highest option available here.</small></span><AudixoSelect ariaLabel="Final MP3 bitrate" value={String(kbps)} options={[64,128,192,256,320].map(v=>({value:String(v),label:`${v} kbps`}))} onChange={v=>setKbps(Number(v))}/></label>}
    <label className="export-row ax67-download-name"><span><strong>Download filename</strong><small>Exactly this name (with unsafe filename symbols removed), followed by (Audixo).{format}.</small></span><input className="export-name-input" aria-label="Download filename" value={downloadName} maxLength={100} onChange={e=>setDownloadName(e.target.value)} placeholder="My finished mix" /></label>
    <div className="export-summary"><span>44.1 kHz</span><span>Stereo</span><span>{format==='mp3'?`${kbps} kbps`:'16-bit PCM'}</span><span>Saved to Library</span></div>
    <div className="modal-actions"><button className="button button-glass" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy} onClick={()=>onExport({format,kbps,normalize,stereoRepair,saveToLibrary,downloadName})}>{busy?'Rendering…':`Export ${format.toUpperCase()}`}</button></div>
  </section></div>
}
