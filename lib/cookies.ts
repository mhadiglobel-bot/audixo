/** Private cookie storage. No cookies are bundled with the frontend or written to source. */
import { get, put } from '@vercel/blob'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const COOKIE_KEY='audixo-auth/youtube-session.txt'
export class StorageUnavailable extends Error {constructor(){super('Private Vercel Blob is not connected. Create a PRIVATE Blob store and connect it to this project (BLOB_READ_WRITE_TOKEN).')}}
export const cookiesConfigured=()=>Boolean(process.env.BLOB_READ_WRITE_TOKEN)
export function parseCookieText(input:unknown):string{
 if(typeof input!=='string'||input.length<24||input.length>1_800_000)throw new Error('Upload Netscape-format cookies.txt (up to 1.8 MB).')
 const clean=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')
 if(clean.includes('\0'))throw new Error('Cookie file contains invalid binary data.')
 const rows=clean.split('\n')
 const values=rows.filter(row=>row.trim()&&(row.startsWith('#HttpOnly_')||!row.startsWith('#'))).map(row=>row.startsWith('#HttpOnly_')?row.slice(10):row)
 const parsed=values.filter(r=>r.split('\t').length===7)
 if(!parsed.length)throw new Error('Invalid file: export cookies as Netscape cookies.txt (not JSON).')
 if(!parsed.some(row=>{const host=row.split('\t')[0].toLowerCase().replace(/^\./,'');return host==='youtube.com'||host.endsWith('.youtube.com')||host==='google.com'||host.endsWith('.google.com')}))throw new Error('File does not contain any YouTube / Google cookies.')
 if(!/^#\s*(?:Netscape\s+)?HTTP Cookie File/im.test(clean)){
  return '# Netscape HTTP Cookie File\n'+clean
 }
 return clean
}
export async function saveCookies(text:string):Promise<void>{
 if(!cookiesConfigured())throw new StorageUnavailable()
 await put(COOKIE_KEY,text,{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'text/plain; charset=utf-8'})
}
export async function loadCookies():Promise<string|null>{
 if(!cookiesConfigured())return null
 const result=await get(COOKIE_KEY,{access:'private',useCache:false})
 if(!result||result.statusCode!==200||!result.stream)return null
 const text=await new Response(result.stream).text()
 return parseCookieText(text)
}
/** Each invocation uses its own /tmp path. No shared or persistent filesystem claims. */
export async function cookieArgs():Promise<{args:string[];cleanup:()=>Promise<void>}>{
 const text=await loadCookies()
 if(!text)return {args:[],cleanup:async()=>{}}
 const filename=path.join(os.tmpdir(),`audixo-${randomBytes(8).toString('hex')}-cookies.txt`)
 await fs.writeFile(filename,text,{mode:0o600})
 return {args:['--cookies',filename],cleanup:async()=>{await fs.unlink(filename).catch(()=>{})}}
}
