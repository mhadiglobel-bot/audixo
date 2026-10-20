import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises'
import path from 'node:path'

/** Count logical tracks separately from the visual clone used for the marquee.
 * The production build and --self-test call this exact same assertion function.
 */
export function checkTrackMarkup(html,tracks){
 const ids=tracks.map(t=>t.id)
 assert.ok(ids.length>0,'The demo catalog must not be empty')
 assert.equal(new Set(ids).size,ids.length,'Catalog track IDs must be unique')
 const audio=html.match(/<audio\b[^>]*src="\/demo\/audixo-sample-reel\.mp3(?:\?v=[\w.-]+)?"[^>]*>/g)||[]
 assert.equal(audio.length,1,'Home must render one persistent demo player')
 assert.ok(!/\bautoplay\b/i.test(audio[0]),'Initial audio autoplay is not permitted')
 const buttons=(html.match(/<button\b[^>]*data-demo-track-id="[^"]+"[^>]*>/g)||[])
 const attr=(tag,key)=>tag.match(new RegExp(key+'="([^"]*)"'))?.[1]
 for(const lane of ['primary','clone']){
  const items=buttons.filter(tag=>attr(tag,'data-demo-copy')===lane)
  assert.deepEqual(items.map(tag=>attr(tag,'data-demo-track-id')),ids,`${lane}: each catalog track must render once in order`)
  if(lane==='clone')assert.ok(items.every(tag=>attr(tag,'tabindex')==='-1'),'Clones must not enter keyboard tab order')
 }
 assert.equal(buttons.length,ids.length*2,'Only primary and clone rows may contain track buttons')
 assert.match(html,/<div\b[^>]*data-strip-lane="clone"[^>]*aria-hidden="true"/,'Clone lane must be hidden from assistive technology')
 return {uniqueTracks:ids.length,renderedTiles:buttons.length}
}
export function runTrackRegression(){
 const fixture=n=>{
  const tracks=Array.from({length:n},(_,i)=>({id:'track-'+i}))
  const lane=copy=>`<div data-strip-lane="${copy}"${copy==='clone'?' aria-hidden="true"':''}>`+tracks.map(t=>`<button data-demo-track-id="${t.id}" data-demo-copy="${copy}" tabindex="${copy==='clone'?-1:0}"></button>`).join('')+'</div>'
  return {tracks,html:'<audio src="/demo/audixo-sample-reel.mp3" preload="metadata"></audio>'+lane('primary')+lane('clone')}
 }
 let count=0
 for(const n of [1,10,13,20]){const f=fixture(n);assert.equal(checkTrackMarkup(f.html,f.tracks).renderedTiles,n*2);count++}
 const {html,tracks}=fixture(13)
 for(const bad of [html.replace('data-demo-track-id="track-0"','data-demo-track-id="wrong"'),html.replace('<audio ','<audio autoplay="" '),html.replace('tabindex="-1"','tabindex="0"'),html.replace('aria-hidden="true"','aria-hidden="false"'),html.replace('data-demo-copy="clone"','data-demo-copy="primary"')]){assert.throws(()=>checkTrackMarkup(bad,tracks));count++}
 assert.throws(()=>checkTrackMarkup(html,[...tracks,tracks[0]]));count++
 console.log(`Track-markup regression passed: ${count} cases (including 10/20 and 13/26).`)
}
if(process.argv.includes('--self-test')){runTrackRegression();process.exit(0)}

const {build}=await import('esbuild')
const {loadEnv}=await import('vite')
Object.assign(process.env,loadEnv('production',process.cwd(),''))
// A new Vercel project does not know its final production domain on its first build.
// Prefer Vercel's real system URL; otherwise let the FIRST build succeed and ask
// the owner to set VITE_SITE_URL for correct SEO before launch.
const configured=process.env.VITE_SITE_URL|| (process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:process.env.VERCEL?'https://audixo.invalid':'http://localhost:4173')
if(process.env.VERCEL&&configured==='https://audixo.invalid')console.warn('AUDIXO: Set VITE_SITE_URL to the real production domain after first deployment and redeploy for correct SEO URLs.')
const origin=new URL(configured).origin
if(!['http:','https:'].includes(new URL(origin).protocol))throw new Error('VITE_SITE_URL must be HTTP or HTTPS.')
if(process.env.VERCEL&&!origin.startsWith('https:'))throw new Error('Set VITE_SITE_URL to your production HTTPS domain.')
await mkdir('.build',{recursive:true})
await build({entryPoints:['scripts/prerender.tsx'],outfile:'.build/prerender.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',define:{'import.meta.env':JSON.stringify({VITE_SITE_URL:origin,VITE_SUPPORT_EMAIL:process.env.VITE_SUPPORT_EMAIL||'',VITE_SUPPORT_EMAIL_ENABLED:process.env.VITE_SUPPORT_EMAIL_ENABLED||'',VITE_AUDIXO_TURNSTILE_SITE_KEY:process.env.VITE_AUDIXO_TURNSTILE_SITE_KEY||''})}})
const {pageRoutes,pageHtml,blogs,faqs,audioTools,DEMO_TRACKS}=await import(path.resolve('.build/prerender.mjs'))
function renderPage(route){
 try{
  const html=pageHtml(route)
  assert.ok(typeof html==='string'&&html.length>100,`Empty HTML: ${route}`)
  return html
 }catch(error){
  throw new Error(`AUDIXO prerender failed for ${route}: ${error instanceof Error?error.message:String(error)}`,{cause:error})
 }
}
// Regression: the old standalone SEO tree omitted SoundExperienceProvider.
// This runs even on the normal production build; it cannot be bypassed silently.
function checkSoundProvider(){
 const html=renderPage('/')
 checkTrackMarkup(html,DEMO_TRACKS)
}

checkSoundProvider()
if(process.argv.includes('--check')){
 const routes=[...Object.keys(pageRoutes),...blogs.map(b=>'/blog/'+b.slug),...audioTools.map(t=>'/tool/'+t.id),'/__ssr-not-found-check__']
 for(const route of routes)renderPage(route)
 await rm('.build',{recursive:true,force:true})
 console.log(`SSR regression passed: ${routes.length} routes; one sound provider/player; ${DEMO_TRACKS.length} unique tracks and one hidden clone lane; no autoplay.`)
 process.exit(0)
}

const base=await readFile('dist/index.html','utf8'),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const pages={
 '/nexivo':['Nexivo — Digital Products, Research & Growth Systems','Learn about Nexivo, the entrepreneurial company backing Audixo Studio and investing in useful digital tools, SEO and lead discovery.'],
 '/tools/recorder':['Audixo Audio Recorder — Record and Edit Audio Online','Record microphone audio in your browser, pause and resume, preview the recording and open it in Audixo Studio.'],
 '/':['Free Online Audio Studio & Sound Playground','Try AUDIXO’s interactive sound playground with Echo, Reverb, Pitch and Slowed audio previews, then trim, mix, separate vocals and export your sound online.'],
 '/features':['Audixo Features — Trim, Mashup, Stems, Effects & Export','Explore direct audio trimming, AI stem separation, vocal effects, creative presets and MP3 export.'],
 '/how-it-works':['How Audixo Works — From Audio Import to Final Export','Follow the Audixo workflow from importing audio through trimming, vocal separation, effects and download.'],
 '/about':['About Audixo','Meet Audixo: a creative audio studio with focused tools, a full waveform editor and vocal stem workflows.'],
 '/contact':['Official Support Email Coming Soon','The official AUDIXO contact email is coming soon. Explore audio tools and help resources in the meantime.'],
 '/blog':['Audio Editing Guides','Practical guides to audio trimming, vocal separation, echo, reverb, MP3 quality and creative mixing.'],
 '/faq':['Audio Editing FAQ','Answers about direct trimming, middle cuts, AI vocal stems, mashups, export quality and long audio.'],
 '/help':['Audio Editor Help Center','Solve common audio import, preview, export, mashup and local AI problems.'],
 '/privacy':['Privacy Policy','How Audixo handles browser-local audio editing, AI model delivery and local Library storage.'],
 '/copyright':['Copyright & Media Rights','Copyright and permitted media use guidance for AUDIXO downloads, editing, conversion and intellectual property.'],
 '/terms':['Terms of Use','Terms for Audixo audio editing, mashups, AI separation, export and local Library.'],
 '/editor':['Audixo Studio — Full Audio Editor, Mixer & Export','Trim with integrated clip handles, remove middle sections, mix tracks and export your audio.'],
 '/library':['Your Audio Library','Your saved Audixo exports in this browser profile.'],
 '/tools/youtube-to-mp3':['YouTube MP3 and MP4 Downloader','Analyze a YouTube link where you have download rights. Request 320 kbps MP3 or select a supported MP4 video resolution.'],
 '/tools/vocals':['Audixo Vocal Extractor — Voice, Music, Drums & Bass','Separate vocals, drums, bass and other instruments into individual audio tracks. Mix, mute, trim and apply vocal effects.'],
 '/tools/mashup':['Audixo Mashup Studio — Multitrack Song & Verse Editor','Layer multiple audio files, trim each section, create crossfades and export one finished mashup.'],
 '/tools/trim-audio':['Audixo Trim Audio — Free Online Audio Cutter','Trim MP3 or WAV using drag handles and exact timestamps, add fades and export audio in your browser.'],
 '/tools/echo':['Audixo Echo — Add Echo and Delay to Audio Online','Add echo to voice and music online with delay time, feedback and wet mix. Preview and export your edited audio.'],
 '/tools/slowed-reverb':['Audixo Slowed + Reverb — Slow Audio Online','Slow music or vocal recordings online, preserve pitch when needed and add a controlled reverb tail.'],
 '/tools/pitch':['Audixo Pitch Shifter — Change Audio Pitch Online','Shift audio pitch in semitones, preview the tone and download your result as MP3 or WAV.'],
 '/tools/spatial-motion':['Audixo 8D / 16D Audio Motion — Spatial Sound Tool','Add stereo orbit and motion effects to audio, customize depth and speed and preview in headphones.']
}
for(const tool of audioTools)pages['/tool/'+tool.id]=[tool.name+' Audio Tool',tool.short]
const paths=[...Object.keys(pageRoutes),...blogs.map(b=>'/blog/'+b.slug),...audioTools.map(t=>'/tool/'+t.id)]
const originalError=console.error;console.error=(...args)=>{if(String(args[0]).includes('useLayoutEffect does nothing on the server'))return;originalError(...args)}
for(const route of paths){
 const article=blogs.find(b=>route==='/blog/'+b.slug),[title,description]=article?[article.title,article.excerpt]:pages[route],url=origin+route
 let schema=route==='/nexivo'?{'@context':'https://schema.org','@type':'Organization',name:'Nexivo',url,description}:article?{'@context':'https://schema.org','@type':'Article',headline:title,description,publisher:{'@type':'Organization',name:'Audixo Studio',parentOrganization:{'@type':'Organization',name:'Nexivo'}},mainEntityOfPage:url}:route==='/faq'?{'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}:{'@context':'https://schema.org','@type':'SoftwareApplication',name:'Audixo',applicationCategory:'MultimediaApplication',operatingSystem:'Web browser',url,description}
 const tags=`<title>${escape(title)} | Audixo</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${route==='/library'?'noindex,follow':'index,follow'}"><link rel="canonical" href="${escape(url)}"><meta property="og:title" content="${escape(title)} | Audixo"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:type" content="${article?'article':'website'}"><meta property="og:site_name" content="Audixo"><meta property="og:image" content="${origin}/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)} | Audixo"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${origin}/og-image.png"><script id="page-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`
 // Strip generic home-only metadata from the Vite shell first. Every pre-rendered
 // route gets one canonical, one OG set and one Twitter set rather than duplicates.
 const head=base
  .replace(/<title>[\s\S]*?<\/title>/,'')
  .replace(/<meta name="(?:description|robots|twitter:[^"]+)"[^>]*>/g,'')
  .replace(/<meta property="og:[^"]+"[^>]*>/g,'')
  .replace(/<link rel="canonical"[^>]*>/g,'')
  .replace('</head>',tags+'</head>')
 const html=head.replace('<div id="root"></div>',`<div id="root">${renderPage(route)}</div>`)
 const target=route==='/'?'dist/index.html':`dist${route}/index.html`;await mkdir(path.dirname(target),{recursive:true});await writeFile(target,html)
}
console.error=originalError
await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.filter(p=>p!=='/library').map(p=>`<url><loc>${escape(origin+p)}</loc></url>`).join('')+'</urlset>')
await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`)
await rm('.build',{recursive:true,force:true})
console.log(`Pre-rendered ${paths.length} pages with static sharing tags and searchable content. Canonical origin: ${origin}`)
