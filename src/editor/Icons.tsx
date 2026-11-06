import {useId} from 'react'
const paths: Record<string,string> = {
  play:'<path d="M8 5v14l11-7z"/>', pause:'<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>', stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  upload:'<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14"/>', download:'<path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5M5 20h14"/>',
  undo:'<path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"/>', redo:'<path d="m15 7 5 5-5 5m4-5h-8a6 6 0 0 0-6 6"/>',
  cut:'<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.6 8.5 10.4 7M8.6 15.5 19 8.5"/>',
  move:'<path d="M12 3v20M3 12h18M12 3l-3 3m3-3 3 3M12 21l-3-3m3 3 3-3M3 12l3-3m-3 3 3 3M21 12l-3-3m3 3-3 3"/>',
  select:'<path d="M5 3v20M19 3v20M8 7h8M8 17h8"/>', split:'<path d="M12 3v20M4 8h5M15 8h5M4 16h5M15 16h5"/>',
  copy:'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
  zoomIn:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15 15l5 5M10.5 7.5v6M7.5 10.5h6"/>', zoomOut:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15 15l5 5M7.5 10.5h6"/>',
  magic:'<path d="m4 20 10-10M13 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/>',
  arrowUpRight:'<path d="M6 18 18 6M8 6h10v10"/>',
  chevronRight:'<path d="m9 5 7 7-7 7"/>',
  video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  waveform:'<path d="M3 12h2l1-4 2 8 2-11 2 14 2-9 2 5 1-3h4"/>', home:'<path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.8 9.5a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1-1.4 2M12 17h.01"/>',
  volume:'<path d="M4 10v4h4l5 4V6L8 10H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  library:'<path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5"/>', reverse:'<path d="M9 7 4 12l5 5M5 12h7a6 6 0 0 1 6 6"/>',
  headphones:'<path d="M4 13v-2a8 8 0 0 1 16 0v2M4 13h3v7H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-2Zm16 0h-3v7h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-1-2Z"/>',
  spark:'<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Zm6 11 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/>',
}

export default function Icon({name,size=18,strokeWidth=2,className=''}:{name:string;size?:number;strokeWidth?:number;className?:string}){
 const gradient='ax84-editor-'+useId().replace(/:/g,'')
 const markup=paths[name]||paths.waveform
 const neon=name==='undo'?['#12dcb8','#32c6ef']:name==='redo'?['#ab6aff','#f46fd6']:name==='trash'?['#fc67b3','#ff9b8b']:['#14dcb8','#9864f8']
 return <svg className={'ax84-action-icon '+className} width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={neon[0]}/><stop offset="100%" stopColor={neon[1]}/></linearGradient></defs>
  <g stroke={`url(#${gradient})`} dangerouslySetInnerHTML={{__html:markup}}/>
 </svg>
}
