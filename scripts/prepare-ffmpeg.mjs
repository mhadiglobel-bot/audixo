/** Copy ffmpeg-static's platform executable into the deployed function bundle. */
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const binary=require('ffmpeg-static')
if(!binary)throw Error('ffmpeg-static did not supply a platform binary')
const name=process.platform==='win32'?'ffmpeg.exe':'ffmpeg'
const target=path.join(process.cwd(),'bin',name)
await fs.mkdir(path.dirname(target),{recursive:true})
await fs.copyFile(binary,target)
if(process.platform!=='win32')await fs.chmod(target,0o755)
const st=await fs.stat(target)
if(st.size<1000000)throw Error('FFmpeg binary is unexpectedly small')
console.log('[AUDIXO] packaged FFmpeg binary ('+Math.round(st.size/1048576)+' MiB)')
