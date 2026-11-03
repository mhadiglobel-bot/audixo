/** Fetch the official standalone Linux yt-dlp at BUILD time, not per request.
 * Avoid relying on a Python executable being present in the Vercel Node runtime.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
const folder=path.join(process.cwd(),'bin'),binary=path.join(folder,'yt-dlp')
if(process.env.AUDIXO_SKIP_YTDLP_DOWNLOAD==='1'){console.log('[AUDIXO] yt-dlp preparation skipped by explicit local test flag');process.exit(0)}
if(process.platform!=='linux'||process.arch!=='x64'){
 console.log('[AUDIXO] standalone yt-dlp Linux binary prepared only on x64 Linux / Vercel')
 process.exit(0)
}
await fs.mkdir(folder,{recursive:true})
const root='https://github.com/yt-dlp/yt-dlp/releases/latest/download/'
async function fetchWithTimeout(url,timeout=100000){const a=new AbortController(),t=setTimeout(()=>a.abort(),timeout);try{const r=await fetch(url,{signal:a.signal,redirect:'follow',headers:{'User-Agent':'AUDIXO-YTDLP-Builder/1.0'}});if(!r.ok)throw Error('HTTP '+r.status+' for '+new URL(url).pathname);return r}finally{clearTimeout(t)}}
let lastError
for(let attempt=1;attempt<=2;attempt++){
 try{
  const hashText=await (await fetchWithTimeout(root+'SHA2-256SUMS')).text()
  const expected=hashText.match(/^([a-f0-9]{64})\s+\*?yt-dlp_linux\s*$/m)?.[1]
  if(!expected)throw Error('Could not parse official yt-dlp_linux SHA256 checksum')
  const response=await fetchWithTimeout(root+'yt-dlp_linux',150000)
  const bytes=Buffer.from(await response.arrayBuffer())
  if(bytes.length<1000000||bytes.length>100*1024*1024)throw Error('Unexpected yt-dlp binary size')
  const actual=createHash('sha256').update(bytes).digest('hex')
  if(actual!==expected)throw Error('Official yt-dlp binary failed SHA256 check')
  const tmp=binary+'.tmp';await fs.writeFile(tmp,bytes,{mode:0o755});await fs.rename(tmp,binary);await fs.chmod(binary,0o755)
  console.log('[AUDIXO] verified official standalone yt-dlp Linux binary ('+Math.round(bytes.length/1048576)+' MiB)')
  process.exit(0)
 }catch(e){lastError=e;console.warn('[AUDIXO] yt-dlp fetch attempt '+attempt+' failed:',e.message)}
}
throw new Error('Failed to prepare official yt-dlp: '+lastError?.message)
