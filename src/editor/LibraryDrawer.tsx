import { useEffect, useState } from 'react'
import Icon from './Icons'
import SavedMixCard from './SavedMixCard'
import { deleteLibraryMix, getLibraryMixes, libraryLimit, type LibraryMix } from './library'

export default function LibraryDrawer({open,onClose,refreshKey=0,onSelect}:{open:boolean;onClose:()=>void;refreshKey?:number;onSelect?:(item:LibraryMix)=>void}){
  const [items,setItems]=useState<LibraryMix[]>([])
  const [loading,setLoading]=useState(false)
  useEffect(()=>{if(!open)return;let active=true;setLoading(true);getLibraryMixes().then(rows=>{if(active)setItems(rows)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[open,refreshKey])
  const remove=async(id:string)=>{await deleteLibraryMix(id);setItems(cur=>cur.filter(x=>x.id!==id))}
  if(!open)return null
  return <div className="modal-backdrop library-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="library-drawer glass-panel v11-library-drawer" role="dialog" aria-modal="true" aria-label="Saved audio library">
      <button className="modal-close" onClick={onClose} aria-label="Close library">×</button>
      <div className="library-head"><div className="library-icon"><Icon name="library" size={19}/></div><div><span className="modal-kicker">LOCAL LIBRARY</span><h2>Saved audio exports</h2><p>Play a saved mix or bring it back into your workspace. Up to {libraryLimit} finished mixes stay in this browser profile.</p></div></div>
      <div className="library-stats"><span><b>{items.length}</b> / {libraryLimit} saved</span><span>Browser-only storage</span><span>No account required</span></div>
      <div className="library-scroll">{loading?<div className="library-empty glass-panel"><div className="empty-orb-v5">∿</div><h3>Loading library</h3></div>:items.length?items.map(item=><SavedMixCard compact key={item.id} item={item} onDelete={remove} onUse={onSelect}/>):<div className="library-empty glass-panel"><div className="empty-orb-v5">♫</div><h3>No saved exports yet</h3><p>Export a mix and enable “Save to browser library.”</p></div>}</div>
    </section>
  </div>
}
