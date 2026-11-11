import {useId} from 'react'
type Props={id:string;size?:number}
const palette:Record<string,[string,string]>={
 'lyrics-video':['#24deaf','#d65af4'],'youtube-mp3':['#00e9be','#27a7f9'],'recorder':['#fc50bd','#a65aff'],
 'vocals':['#a45aff','#2ed9fc'],'quick-trim':['#2ad9f5','#13df99'],
 'echo':['#8f64fa','#f15fc8'],'slowed-reverb':['#28d6ec','#8463ee'],
 'pitch':['#e85ed5','#19d7ed'],'spatial':['#18dda6','#aa63ed'],
 'playground':['#15e4ba','#b35cfa'],'library':['#f55db5','#32c9ed'],
}
export default function ToolGlyph({id,size=24}:Props){
 const idGradient='audixo-glyph-'+useId().replace(/:/g,'')
 const [start,end]=palette[id]||['#18d8ba','#9962ea']
 let lines
 if(id==='lyrics-video')lines=<><rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M8 9h8M8 12h8M8 15h4M16 14l3-1.4v4.3a1.5 1.5 0 1 1-1-1.4"/></>
 else if(id==='youtube-mp3')lines=<><rect x="3" y="4.5" width="18" height="12.5" rx="3"/><path d="m10 8.3 4.6 2.45L10 13.2zM8 21h8m-4-4v4"/></>
 else if(id==='recorder')lines=<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21m-4 0h8"/><path d="M10 7h4M10 10h4" strokeWidth="1.2"/></>
 else if(id==='vocals')lines=<><path d="M3 9v6M6 6v12M9 10v4M12 3v18M15 8v8M18 5v14M21 10v4"/><path d="M4.5 19.5h15" opacity=".45"/></>
 else if(id==='quick-trim')lines=<><circle cx="6.5" cy="17.5" r="2.7"/><circle cx="17.5" cy="17.5" r="2.7"/><path d="M8.5 15.5 19 5M15.5 15.5 5 5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></>
 else if(id==='echo')lines=<><path d="M3 10h4l4-3v10l-4-3H3zM14 8a5.5 5.5 0 0 1 0 8M17 5a9 9 0 0 1 0 14M20 3a12 12 0 0 1 0 18"/></>
 else if(id==='slowed-reverb')lines=<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2.5M6 5l-2 1.5M18 19l2 1.5"/><path d="M5.5 16.7c1.1 1.5 2.6 2.6 4.3 3.1" opacity=".65"/></>
 else if(id==='pitch')lines=<><path d="M5 19V6m0 0-3 3m3-3 3 3M19 5v13m0 0-3-3m3 3 3-3M10 10v5m4-9v13"/><circle cx="10" cy="8" r=".7" fill="currentColor" stroke="none"/></>
 else if(id==='spatial')lines=<><circle cx="12" cy="12" r="8.7"/><ellipse cx="12" cy="12" rx="8.3" ry="3.4" transform="rotate(-35 12 12)"/><circle cx="18" cy="6.9" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2.1"/></>
 else if(id==='library')lines=<><rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M9 5v14m4-10h4m-4 4h4M13 16h2"/></>
 else lines=<><path d="M2.5 12h2l2-5 2.5 10 2.5-12 2.5 15 2.5-10 2 5 1.5-3H22"/><circle cx="12" cy="12" r="9" opacity=".38"/></>
 return <svg className="ax84-neon-svg" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="" aria-hidden="true">
  <defs><linearGradient id={idGradient} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={start}/><stop offset="100%" stopColor={end}/></linearGradient></defs>
  <g fill="none" stroke={`url(#${idGradient})`} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">{lines}</g>
 </svg>
}
