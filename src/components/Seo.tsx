import { useEffect } from 'react'
import { site } from '../config/site'

type Props={title?:string;description?:string;path?:string;schema?:Record<string,unknown>}
function meta(name:string,value:string,property=false){
 let el=document.head.querySelector(`meta[${property?'property':'name'}="${name}"]`) as HTMLMetaElement|null
 if(!el){el=document.createElement('meta');el.setAttribute(property?'property':'name',name);document.head.append(el)}
 el.content=value
}
const pageUrl=(path:string)=>new URL(path,site.url+'/').href

export default function Seo({title,description=site.description,path='/',schema}:Props){
 useEffect(()=>{
  const full=title?(title.toLowerCase().includes(site.name.toLowerCase())?title:`${title} | ${site.name}`):`${site.name} — Online Audio Studio`
  const url=pageUrl(path),image=site.url+'/og-image.png',article=path.startsWith('/blog/')
  document.title=full
  meta('description',description)
  meta('robots',path==='/library'?'noindex,follow':'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
  meta('og:title',full,true);meta('og:description',description,true)
  meta('og:type',article?'article':'website',true);meta('og:url',url,true)
  meta('og:site_name',site.name,true);meta('og:locale','en_US',true)
  meta('og:image',image,true);meta('og:image:width','1200',true);meta('og:image:height','630',true)
  meta('twitter:card','summary_large_image');meta('twitter:title',full)
  meta('twitter:description',description);meta('twitter:image',image);meta('twitter:image:alt','AUDIXO online audio studio')
  let canonical=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null
  if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical)}
  canonical.href=url
  const identity=document.getElementById('site-identity-schema')
  if(path==='/'){
   const website={'@context':'https://schema.org','@type':'WebSite','@id':site.url+'/#website',name:'AUDIXO',alternateName:['Audixo Studio','audixo.tiers.rest'],url:site.url+'/',description:'Free browser-based audio editor, recorder, vocal extractor and sound tools. No subscription required.'}
   const script=(identity as HTMLScriptElement|null)||document.createElement('script')
   script.id='site-identity-schema';script.type='application/ld+json'
   script.textContent=JSON.stringify(website)
   if(!identity)document.head.append(script)
  }else identity?.remove()
  document.getElementById('page-schema')?.remove()
  if(path!=='/library'){
   const generic={'@context':'https://schema.org','@type':path.startsWith('/tools/')?'SoftwareApplication':'WebPage',name:full,url,description,isPartOf:{'@type':'WebSite',name:site.name,url:site.url}}
   const script=document.createElement('script');script.id='page-schema';script.type='application/ld+json'
   script.textContent=JSON.stringify(schema||generic).replace(/</g,'\\u003c')
   document.head.append(script)
  }
 },[title,description,path,schema])
 return null
}
