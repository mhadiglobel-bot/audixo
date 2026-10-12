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
 return <article className={`ax25-saved-card ${compact?'compact':''} ${playing?'playing':''}`}>
  <header><div className="ax25-saved-disc" aria-hidden="true"><i/><b>au</b></div><div><small>SAVED MIX</small><h3>{item.name}</h3><span>{created}</span></div><em>{item.format.toUpperCase()}</em></header>
  <div className="ax25-saved-meta"><span>{formatTime(item.duration,true)}</span><span>{item.format==='mp3'?`${item.kbps} kbps`:'Lossless WAV'}</span><span>{formatBytes(item.size)}</span></div>
  <div className="ax25-saved-player"><button onClick={toggle} aria-label={playing?'Pause':'Play'}>{playing?<Icon name="pause" size={16}/>:<Icon name="play" size={16}/>}</button><span>{formatTime(current)} / {formatTime(duration)}</span><input aria-label="Playback position" type="range" min="0" max={Math.max(.001,duration)} step=".01" value={Math.min(current,Math.max(.001,duration))} onChange={e=>seek(Number(e.target.value))}/><Icon name="volume" size={14}/><input className="volume" aria-label="Playback volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>changeVolume(Number(e.target.value))}/><audio ref={audioRef} src={url} preload="metadata" onTimeUpdate={e=>setCurrent(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);setCurrent(0)}}/></div>
  <div className="ax25-saved-actions">{onUse?<button className="primary" onClick={()=>onUse(item)}>Use this audio ↗</button>:<><Link className="primary" to="/editor" state={{libraryId:item.id}}>Open in Studio ↗</Link><Link to="/tools/vocals" state={{libraryId:item.id}}>Use in Vocals</Link></>}<button onClick={()=>downloadBlob(item.blob,`${safe}.${item.format}`)}><Icon name="download" size={13}/> Download</button><button className="danger" onClick={()=>onDelete(item.id)}><Icon name="trash" size={13}/> Remove</button></div>
  {error&&<p className="ax25-card-error" role="alert">{error}</p>}
 </article>
}
