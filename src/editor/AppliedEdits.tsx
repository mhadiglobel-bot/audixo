import type { AppliedEdit,AudioProject } from './types'

function describeValue(op:AppliedEdit):string {
 const p=op.patch
 if(!p)return op.kind==='trim'?'Trim range':op.kind==='duplicate'?'Duplicated':op.kind==='cut'?'Section removed':'Applied'
 const keys=['gainDb','bassDb','midDb','trebleDb','fxBlend','warmth','metallicCut','harshness','lofiAmount','delayWet','reverb','motionDepth','speed'] as const
 const key=keys.find(k=>typeof p[k]==='number')
 if(!key)return 'Active'
 const n=Number(p[key])
 if(key==='gainDb'||key==='bassDb'||key==='midDb'||key==='trebleDb')return (n>0?'+':'')+n.toFixed(1)+' dB'
 if(key==='speed')return n.toFixed(2)+'x'
 return Math.round(n*100)+'%'
}


export default function AppliedEdits({project,selectedTrack,onRemove,onReset,onUnmute}:{project:AudioProject;selectedTrack?:string;onRemove:(id:string)=>void;onReset:()=>void;onUnmute:(id:string)=>void}){
 const edits=project.edits||[],muted=project.tracks.filter(t=>t.muted),count=edits.length+muted.length
 return <section className="ax25-applied ax82-applied"><header><div><small>YOUR EDIT STACK</small><h3>Applied edits <span>{count}</span></h3><p>Every important change stays removable.</p></div>{edits.length>0&&<button onClick={onReset}>Clear all edits</button>}</header><div className="ax25-edit-list ax93-wrapped-edit-list">{!count&&<div className="ax25-edit-empty"><span>✦</span><div><strong>No edits applied yet.</strong><p>Choose a preset or manual control. Each change will appear here with its own remove button.</p></div></div>}{edits.map(op=><article key={op.id} className={op.targets.some(t=>t.trackId===selectedTrack)?'selected':''}><i>{op.kind==='effect'?'✦':op.kind==='trim'?'↔':op.kind==='duplicate'?'⧉':'⋈'}</i><div><strong>{op.label}</strong><output className="ax91-edit-value">{describeValue(op)}</output><small>{[...new Set(op.targets.map(t=>project.sources?.find(s=>s.id===t.trackId)?.name||'Audio'))].join(' + ')} · {op.kind==='effect'?'sound control':op.kind==='trim'?'trim range':op.kind==='duplicate'?'duplicate':'middle cut'}</small></div><button aria-label={`Remove ${op.label}`} onClick={()=>onRemove(op.id)}>×</button></article>)}{muted.map(t=><article key={t.id}><i>◌</i><div><strong>{t.name} muted</strong><small>Hidden from playback and export</small></div><button aria-label={`Unmute ${t.name}`} onClick={()=>onUnmute(t.id)}>×</button></article>)}</div></section>
}
