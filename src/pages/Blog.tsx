import { useMemo,useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import { blogs } from '../data/blogs'

function JournalVisual({index=0,large=false}:{index?:number;large?:boolean}){return <div className={`ax25-journal-visual art-${index%4} ${large?'large':''}`} aria-hidden="true"><span className="ax25-art-code">AUDIO / {String(index+1).padStart(2,'0')}</span><div className="ax25-art-wave">{Array.from({length:38},(_,i)=><i key={i} style={{'--h':`${18+((i*29+index*13)%70)}%`} as React.CSSProperties}/>)}</div><div className="ax25-art-disc"><i/><b>au</b></div><small>{['CUT / CREATE','SPACE / SOUND','VOICE / LAYERS','MIX / FINISH'][index%4]}</small></div>}

export default function Blog(){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All')
 const categories=['All',...new Set(blogs.map(b=>b.category))]
 const filtered=useMemo(()=>blogs.filter(b=>(category==='All'||b.category===category)&&(b.title+' '+b.excerpt+' '+b.category).toLowerCase().includes(query.toLowerCase())),[query,category])
 const featured=blogs[0]
 return <SiteShell><Seo title="Sound Journal — Audio Editing Guides" description="Practical Audixo guides for recording, trimming, stems, effects, export and creative browser audio workflows." path="/blog"/><main className="ax25-journal page-shell">
  <section className="ax25-page-hero journal"><div><div className="ax25-kicker"><i/> THE SOUND JOURNAL</div><h1>Ideas you can hear.<br/><em>Skills you can use.</em></h1><p>Short, practical guides designed to be read and used in the same creative session.</p></div><div className="ax25-journal-orbit" aria-hidden="true"><i/><i/><i/><span>READ<br/>LISTEN<br/>MAKE</span></div></section>
  <Link to={`/blog/${featured.slug}`} className="ax25-featured-story"><JournalVisual large/><div><small>EDITOR'S PICK · {featured.category}</small><h2>{featured.title}</h2><p>{featured.excerpt}</p><div><span>{featured.readTime} read</span><b>Open the guide ↗</b></div></div></Link>
  <section className="ax25-journal-controls"><label><span>SEARCH THE JOURNAL</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try: trim, vocals, reverb…"/></label><div>{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div></section>
  <section className="ax25-journal-grid">{filtered.map((post,i)=><Link to={`/blog/${post.slug}`} key={post.slug} className="ax25-story-card"><JournalVisual index={i}/><div><small>{post.category}<span>{post.readTime}</span></small><h2>{post.title}</h2><p>{post.excerpt}</p><b>Read guide <span>↗</span></b></div></Link>)}</section>
  {!filtered.length&&<div className="ax25-empty-state"><strong>No guide matched that search.</strong><p>Try a tool name, effect or workflow.</p></div>}
  <section className="ax25-journal-cta"><div><small>MAKE THE IDEA REAL</small><h2>Read less.<br/><em>Try it in the Studio.</em></h2></div><Link to="/editor" className="ax25-primary-button">Open Studio <span>↗</span></Link></section>
 </main></SiteShell>
}
