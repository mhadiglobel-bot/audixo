/** AUDIXO protected same-project cookie manager (private Vercel Blob). */
import { timingSafeEqual } from 'node:crypto'
import { parseCookieText, saveCookies, loadCookies, cookiesConfigured } from '../lib/cookies.js'
type Req={method?:string;body?:any;headers?:Record<string,string|undefined>}
type Res={setHeader:(k:string,v:string)=>void;status:(n:number)=>Res;json:(x:unknown)=>void;type:(v:string)=>Res;send:(v:string)=>void}
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
const failures=new Map<string,number[]>()
function remoteIp(req:Req){return String(req.headers?.['x-real-ip']||req.headers?.['x-forwarded-for']||'unknown').split(',')[0].slice(0,96)}
const PAGE=`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>AUDIXO · Session Management</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 15% 10%,#30211a,#080a0f 52%);color:#f2f3f5;font:15px system-ui,sans-serif}.box{width:min(560px,94vw);padding:32px;border:1px solid #303542;border-radius:22px;background:#10151df0;box-shadow:0 24px 90px #0008}small{color:#ffc66f;letter-spacing:.26em;font-weight:900}h1{font-size:30px;letter-spacing:-.04em}p{color:#a9b3c0;line-height:1.7}label{display:block;margin:18px 0 6px;font-size:12px;font-weight:800}input,textarea{width:100%;border:1px solid #384253;background:#090e15;border-radius:9px;padding:13px;color:white;font:inherit}textarea{min-height:150px;resize:vertical}button{width:100%;margin-top:22px;border:0;border-radius:10px;background:#e9b54d;padding:15px;color:#0b1015;font-weight:900;cursor:pointer}button:disabled{opacity:.6}#msg{white-space:pre-wrap;padding-top:14px;min-height:28px;color:#a8edbb}.hint{font-size:12px}a{color:#e9b54d}</style></head><body><main class="box"><small>AUDIXO · PRIVATE ADMIN</small><h1>YouTube cookie session</h1><p>Upload your own Netscape-format <code>cookies.txt</code> securely into this Vercel project's private Blob storage. Cookie content is never placed in the public website bundle.</p><form id="f"><label for="p">Admin password</label><input id="p" type="password" autocomplete="off" required/><label for="file">Upload cookies.txt</label><input id="file" type="file" accept=".txt,text/plain"/><label for="cookie">Or paste cookies.txt contents</label><textarea id="cookie" placeholder="# Netscape HTTP Cookie File ..."></textarea><button id="btn">Save cookie session</button></form><p class="hint">Use only session cookies you are authorized to provide. Uploaded cookies can expire or be rejected by the source.</p><div id="msg" role="status" aria-live="polite"></div></main><script>const f=document.getElementById('f'),msg=document.getElementById('msg'),btn=document.getElementById('btn');f.addEventListener('submit',async e=>{e.preventDefault();btn.disabled=true;msg.textContent='Validating session file…';try{const file=document.getElementById('file').files[0];const cookiesText=file?await file.text():document.getElementById('cookie').value;const password=document.getElementById('p').value;const r=await fetch('/bhai-cookie-dalde',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password,cookiesText}),cache:'no-store'});const j=await r.json();msg.textContent=j.message||j.error||'Unknown response';if(r.ok){document.getElementById('cookie').value='';document.getElementById('file').value='';}}catch(e){msg.textContent='Connection failed: '+e.message}finally{btn.disabled=false}})</script></body></html>`
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex,nofollow');res.setHeader('Referrer-Policy','no-referrer')
 if(req.method==='GET'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(200).send(PAGE)}
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST only.'})
 const expected=process.env.AUDIXO_COOKIE_PASSWORD
 if(!expected||expected.length<8)return res.status(503).json({ok:false,error:'Configure AUDIXO_COOKIE_PASSWORD in Vercel Environment Variables.'})
 const ip=remoteIp(req),now=Date.now(),recent=(failures.get(ip)||[]).filter(t=>now-t<10*60*1000)
 if(recent.length>=8)return res.status(429).json({ok:false,error:'Too many password attempts. Retry after 10 minutes.'})
 const password=typeof req.body?.password==='string'?req.body.password:''
 if(!equal(password,expected)){
  recent.push(now);failures.set(ip,recent)
  return res.status(403).json({ok:false,error:'Wrong admin password.'})
 }
 if(!cookiesConfigured())return res.status(503).json({ok:false,error:'Cookie storage is not configured. Connect a PRIVATE Vercel Blob store to this project.'})
 try{
  const normalized=parseCookieText(req.body?.cookiesText)
  await saveCookies(normalized)
  // Verify the saved cookie is readable before reporting success.
  if(!(await loadCookies()))throw new Error('Storage readback failed.')
  return res.status(200).json({ok:true,message:'Cookie session saved to private storage. Analyze a video to verify access. YouTube may still block Vercel IPs.'})
 }catch(e){const message=e instanceof Error?e.message:'Cookie upload failed.';const status=/Invalid|cookies\.txt|missing|contain|File does not/i.test(message)?400:502;return res.status(status).json({ok:false,error:message.slice(0,260)})}
}
