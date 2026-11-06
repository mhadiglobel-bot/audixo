import {readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
// Publish the existing official AUDIXO symbol as a conventional root favicon.
// ICO supports an embedded 256 x 256 PNG, retaining the original brand artwork.
const root=process.cwd()
const png=readFileSync(path.join(root,'public','favicon.png'))
if(png.length<40||png.toString('ascii',1,4)!=='PNG')throw new Error('Official AUDIXO favicon.png is invalid')
const ico=Buffer.alloc(22+png.length)
ico.writeUInt16LE(0,0);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4)
ico.writeUInt8(0,6);ico.writeUInt8(0,7)
ico.writeUInt8(0,8);ico.writeUInt8(0,9)
ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12)
ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18)
png.copy(ico,22)
writeFileSync(path.join(root,'public','favicon.ico'),ico)
console.log('Prepared stable AUDIXO favicon.ico from the official 256px symbol.')

