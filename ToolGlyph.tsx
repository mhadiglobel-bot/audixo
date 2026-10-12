type Props={id:string}
const common={fill:'none',stroke:'currentColor',strokeWidth:1.85,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}
export default function ToolGlyph({id}:Props){
 let body
 if(id==='youtube-mp3')body=<><path {...common} d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14"/><path {...common} d="M7 6h3"/></>
 else if(id==='mashup')body=<><path {...common} d="M5 7h7v4H5zM12 13h7v4h-7z"/><path {...common} d="M12 9h4v4M8 11v4h4"/></>
 else if(id==='recorder')body=<><rect {...common} x="9" y="4" width="6" height="10" rx="3"/><path {...common} d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"/></>
 else if(id==='vocals')body=<><path {...common} d="M5 6v12M19 6v12"/><path {...common} d="M8 9h8M8 15h8"/><circle {...common} cx="12" cy="12" r="2"/></>
 else if(id==='quick-trim')body=<><path {...common} d="M6 8h12M6 16h12"/><circle {...common} cx="9" cy="8" r="2"/><circle {...common} cx="15" cy="16" r="2"/></>
 else if(id==='echo')body=<><path {...common} d="M5 8c3-3 11-3 14 0M7 12c3-2 7-2 10 0M9 16c2-1 4-1 6 0"/></>
 else if(id==='slowed-reverb')body=<><circle {...common} cx="11" cy="12" r="6"/><path {...common} d="M11 8v4l3 2M17 6l2 2-2 2"/></>
 else if(id==='pitch')body=<><path {...common} d="M8 18V6m0 0L5 9m3-3 3 3M16 6v12m0 0-3-3m3 3 3-3"/></>
 else body=<><circle {...common} cx="12" cy="12" r="7"/><path {...common} d="M5 12h14M12 5c3 3 3 11 0 14M12 5c-3 3-3 11 0 14"/></>
 return <svg viewBox="0 0 24 24" aria-hidden="true">{body}</svg>
}
