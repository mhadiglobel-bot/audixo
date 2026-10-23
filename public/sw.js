/* AUDIXO V48: cache small app shell only. Never cache private jobs, API streams or uploaded media. */
const VERSION='audixo-shell-v57-direct-download';
const SHELL=['/','/favicon.png','/pwa/icon-192.png','/pwa/icon-512.png','/site.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>{}))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION&&key.startsWith('audixo-shell-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/models/')||url.pathname.endsWith('.mp3')||url.pathname.endsWith('.mp4'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match('/').then(page=>page||new Response('AUDIXO requires a connection to load this page.',{status:503,headers:{'Content-Type':'text/plain'}}))));
  return;
 }
 if(SHELL.includes(url.pathname))event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(VERSION).then(cache=>cache.put(request,copy)).catch(()=>{});}return response}).catch(()=>caches.match(request,{ignoreSearch:true})));
 else if(/^\/assets\/[^?]+\.(?:js|css)$/.test(url.pathname)){
  event.respondWith(caches.open(VERSION).then(async cache=>{
   const cached=await cache.match(request);
   if(cached)return cached;
   const response=await fetch(request);
   if(response.ok&&response.type==='basic'){await cache.put(request,response.clone()).catch(()=>{});}
   return response;
  }));
 }
});
