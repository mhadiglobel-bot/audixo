import { useEffect,useState } from 'react'
import { Link,useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import { blogs } from '../data/blogs'
import { site } from '../config/site'

function ArticleVisual(){return <div className="ax25-article-visual" aria-hidden="true"><div className="ax25-article-disc"><i/><b>au</b></div><div className="ax25-article-wave">{Array.from({length:58},(_,i)=><i key={i} style={{'--h':`${15+((i*37)%78)}%`} as React.CSSProperties}/>)}</div><span>PLAY / LEARN / CREATE</span></div>}

export default function BlogPost(){
 const {slug}=useParams(),post=blogs.find(p=>p.slug===slug),[progress,setProgress]=useState(0),[activeSection,setActiveSection]=useState(0)
 useEffect(()=>{const move=()=>{const doc=document.documentElement;setProgress(Math.max(0,Math.min(100,(doc.scrollTop/(doc.scrollHeight-doc.clientHeight||1))*100)))};window.addEventListener('scroll',move,{passive:true});move();return()=>window.removeEventListener('scroll',move)},[])
 useEffect(()=>{if(!post)return;const nodes=post.sections.map((_,i)=>document.getElementById(`section-${i}`)).filter(Boolean) as HTMLElement[];const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(visible){const i=Number((visible.target.id.match(/\d+/)||['0'])[0]);setActiveSection(i)}},{rootMargin:'-18% 0px -68% 0px',threshold:[0,.1,.5]});nodes.forEach(n=>observer.observe(n));return()=>observer.disconnect()},[post?.slug])
 if(!post)return <SiteShell><main className="page-shell ax25-not-found"><h1>Guide not found.</h1><Link to="/blog">← Back to Sound Journal</Link></main></SiteShell>
 const schema={'@context':'https://schema.org','@type':'Article',headline:post.title,description:post.excerpt,inLanguage:'en',isAccessibleForFree:true,mainEntityOfPage:`${site.url}/blog/${post.slug}`,author:{'@type':'Organization',name:site.name},publisher:{'@type':'Organization',name:site.name}}
 const related=blogs.filter(p=>p.slug!==post.slug).slice(0,3)
 return <SiteShell><Seo title={post.title} description={post.excerpt} path={`/blog/${post.slug}`} schema={schema}/><div className="ax25-reading-progress"><i style={{width:`${progress}%`}}/></div><main className="page-shell ax25-article-page">
  <section className="ax25-article-hero"><div><Link to="/blog" className="ax25-back-link">← Back to Sound Journal</Link><small>{post.category} · {post.readTime} read</small><h1>{post.title}</h1><p>{post.excerpt}</p></div><ArticleVisual/></section>
  <div className="ax25-article-layout"><aside className="ax25-article-sidebar"><div><small>IN THIS GUIDE</small>{post.sections.map((s,i)=><a className={activeSection===i?'active':''} key={s.heading} href={`#section-${i}`} aria-current={activeSection===i?'location':undefined}>{String(i+1).padStart(2,'0')} <span>{s.heading}</span></a>)}</div><Link to="/editor">Try it in Studio <b>↗</b></Link></aside><article className="ax25-article-body">{post.sections.map((section,i)=><section key={section.heading} id={`section-${i}`}><header><span>{String(i+1).padStart(2,'0')}</span><h2>{section.heading}</h2></header><p>{section.body}</p>{i===1&&<blockquote><b>Audixo note</b><span>Make one change, listen, then decide. Clear A/B decisions beat stacking effects blindly.</span></blockquote>}</section>)}<div className="ax25-article-finish"><small>END OF GUIDE</small><h2>Now make it yours.</h2><p>Bring a real recording into Audixo and use the workflow while it is still fresh.</p><Link to="/editor" className="ax25-primary-button">Open Studio <span>↗</span></Link></div></article></div>
  <section className="ax25-related"><header><small>KEEP EXPLORING</small><h2>More from the Sound Journal</h2></header><div>{related.map((p,i)=><Link to={`/blog/${p.slug}`} key={p.slug}><span>{String(i+1).padStart(2,'0')}</span><small>{p.category}</small><h3>{p.title}</h3><b>Read ↗</b></Link>)}</div></section>
 </main></SiteShell>
}
