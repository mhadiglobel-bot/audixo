import { formatTime } from './utils'
export default function StudioDisc({playing,name,time}:{playing:boolean;name:string;time:number}){return <div className={`ax-disc-console ${playing?'playing':''}`}><div className="ax-mini-disc" aria-hidden="true"><i/><b>AU</b></div><div><small>NOW IN THE STUDIO</small><strong>{name}</strong><span>{formatTime(time,true)}</span></div></div>}
