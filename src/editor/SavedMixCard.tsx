import { useEffect,useMemo,useRef,useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icons'
import { downloadBlob } from './encoder'
import { formatBytes,type LibraryMix } from './library'
import { formatTime } from './utils'

type Props={item:LibraryMix;onDelete:(id:string)=>void;compact?:boolean;onUse?:(item:LibraryMix)=>void}

export default function SavedMixCard({item,onDelete,compact=false,onUse}:Props){
 const audioRef=useRef<HTMLAudioElement|null>(null),[url,setUrl]=useState(''),[playing,setPlaying]=useState(false),[current,setCurrent]=useState(0),[volume,setVolume]=useState(1),[error,setError]=useState('')
 useEffect(()=>{const pause=(e:Event)=>{if((e as CustomEvent).detail!==item.id)audioRef.current?.pause()};window.addEventListener('audixo-library-play',pause);return()=>window.removeEventListener('audixo-library-play',pause)},[item.id])
 useEffect(()=>{const u=URL.createObjectURL(item.blob);setUrl(u);return()=>URL.revokeObjectURL(u)},[item.blob])
 const created=useMemo(()=>{try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.createdAt))}catch{return''}},[item.createdAt]),duration=Math.max(item.duration||0,audioRef.current?.duration||0)
 const toggle=async()=>{const el=audioRef.current;if(!el)return;if(el.paused){try{window.dispatchEvent(new CustomEvent('audixo-library-play',{detail:item.id}));await el.play();setPlaying(true);setError('')}catch{setError('This browser could not preview the saved format. Download it or reopen it in Studio.')}}else{el.pause();setPlaying(false)}}
 const seek=(v:number)=>{if(audioRef.current)audioRef.current.currentTime=v;setCurrent(v)},changeVolume=(v:number)=>{setVolume(v);if(audioRef.current)audioRef.current.volume=v}
 const safe=item.name.replace(/[\\/:*?"<>|]+/g,'-').trim()||'Audixo export'
 return <article className={`ax25-saved-card ax75-saved-strip ${compact?'compact':''} ${playing?'playing':''}`}>
  <header><div className="ax25-saved-disc ax75-saved-disc" aria-hidden="true"><img src="/audixo-official-symbol.png" alt="" width="49" height="49" decoding="async"/></div><div className="ax83-saved-identity"><small>SAVED MIX</small><h3 title={item.name}>{item.name}</h3><span>{created}</span></div><em>{item.format.toUpperCase()}</em></header>
  <div className="ax25-saved-meta"><span>{formatTime(item.duration,true)}</span><span>{item.format==='mp3'?`${item.kbps} kbps`:'Lossless WAV'}</span><span>{formatBytes(item.size)}</span></div>
  <div className="ax25-saved-player"><button className="ax75-liquid-play" onClick={toggle} aria-label={playing?'Pause':'Play'} aria-pressed={playing}>{playing?<Icon name="pause" size={16}/>:<Icon name="play" size={16}/>}</button><span>{formatTime(current)} / {formatTime(duration)}</span><input aria-label="Playback position" type="range" min="0" max={Math.max(.001,duration)} step=".01" value={Math.min(current,Math.max(.001,duration))} onChange={e=>seek(Number(e.target.value))}/><Icon name="volume" size={14}/><input className="volume" aria-label="Playback volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>changeVolume(Number(e.target.value))}/><audio ref={audioRef} src={url} preload="metadata" onTimeUpdate={e=>setCurrent(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);setCurrent(0)}}/></div>
  <div className="ax25-saved-actions ax75-saved-actions ax83-reveal-actions ax91-library-actions">{onUse?<button type="button" className="primary ax91-action" aria-label="Use this audio" onClick={()=>onUse(item)}><Icon name="waveform" size={16}/><span>Use audio</span></button>:<><Link className="primary ax91-action" to="/editor" state={{libraryId:item.id}} aria-label="Open in Studio"><Icon name="waveform" size={16}/><span>Open Studio</span></Link><Link className="ax91-action" to="/tools/vocals" state={{libraryId:item.id}} aria-label="Use in Vocals"><Icon name="waveform" size={16}/><span>Use in Vocals</span></Link></>}<button type="button" className="ax91-action" aria-label="Download saved mix" onClick={()=>downloadBlob(item.blob,`${safe}.${item.format}`)}><Icon name="download" size={16}/><span>Download</span></button><button type="button" className="danger ax91-action" aria-label="Remove saved mix" onClick={()=>onDelete(item.id)}><Icon name="trash" size={16}/><span>Remove</span></button></div>
  {error&&<p className="ax25-card-error" role="alert">{error}</p>}
 </article>
}
