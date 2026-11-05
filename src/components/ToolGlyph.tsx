type Props={id:string}
const common={fill:'none',stroke:'currentColor',strokeWidth:1.85,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}
export default function ToolGlyph({id}:Props){
 let body
 if(id==='youtube-mp3')body=<><path {...common} d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14"/><path {...common} d="M7 6h3"/></>
 else if(id==='mashup')body=<><path {...common} d="M5 7h7v4H5zM12 13h7v4h-7z"/><path {...common} d="M12 9h4v4M8 11v4h4"/></>
 else if(id==='recorder')body=<><rect {...common} x="9" y="4" width="6" height="10" rx="3"/><path {...common} d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"/></>
 else if(id==='vocals')body=<><path {...common} d="M5 7v10M8 4v16M11 9v6M14 3v18M17 7v10M20 10v4"/></>
 else if(id==='quick-trim')body=<><circle {...common} cx="7" cy="17" r="2.6"/><circle {...common} cx="17" cy="17" r="2.6"/><path {...common} d="M8.8 15.1 18 5M15.2 15.1 6 5"/></>
 else if(id==='echo')body=<><path {...common} d="M4 10h3l3-3v10l-3-3H4z"/><path {...common} d="M13 8c2 2 2 6 0 8M16 5c4 4 4 10 0 14"/><path {...common} d="M19 4v3m-1.5-1.5h3"/></>
 else if(id==='slowed-reverb')body=<><circle {...common} cx="11" cy="12" r="6"/><path {...common} d="M11 8v4l3 2M17 6l2 2-2 2"/></>
 else if(id==='pitch')body=<><path {...common} d="M8 18V6m0 0L5 9m3-3 3 3M16 6v12m0 0-3-3m3 3 3-3"/></>
 else body=<><circle {...common} cx="12" cy="12" r="7"/><path {...common} d="M5 12h14M12 5c3 3 3 11 0 14M12 5c-3 3-3 11 0 14"/></>
 return <svg viewBox="0 0 24 24" aria-hidden="true">{body}</svg>
}
