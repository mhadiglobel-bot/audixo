export type AudioRange={start:number;end:number}
type Frame={offset:number;bytes:number;time:number;seconds:number;metadata:boolean}
export function retainedRanges(range:AudioRange,cuts:AudioRange[]):AudioRange[]{
 if(!Number.isFinite(range.start)||!Number.isFinite(range.end)||range.start<0||range.end<=range.start)throw new Error('Choose valid start and end seconds.')
 const out:AudioRange[]=[];let cursor=range.start
 for(const cut of [...cuts].sort((a,b)=>a.start-b.start)){const start=Math.max(range.start,cut.start),end=Math.min(range.end,cut.end);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=cursor)continue;if(start>cursor)out.push({start:cursor,end:start});cursor=Math.max(cursor,end)}
 if(cursor<range.end)out.push({start:cursor,end:range.end});if(!out.length)throw new Error('Keep at least some audio before exporting.');return out
}
function header(b:Uint8Array,i:number){
 if(b[i]!==255||(b[i+1]&224)!==224)return null
 const version=(b[i+1]>>3)&3,layer=(b[i+1]>>1)&3,bitrate=(b[i+2]>>4)&15,rate=(b[i+2]>>2)&3
 if(version===1||layer!==1||!bitrate||bitrate===15||rate===3)return null
 const kbps=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrate]
 const hz=[44100,48000,32000][rate]/(version===3?1:version===2?2:4)
 return {bytes:Math.floor((version===3?144000:72000)*kbps/hz)+((b[i+2]>>1)&1),seconds:(version===3?1152:576)/hz}
}
const indexes=new WeakMap<Blob,Promise<Frame[]>>()
async function indexMp3(file:Blob,onProgress?:(progress:number)=>void){
 const frames:Frame[]=[];let position=0,time=0,first=true
 const prefix=new Uint8Array(await file.slice(0,10).arrayBuffer())
 if(String.fromCharCode(...prefix.subarray(0,3))==='ID3')position=10+((prefix[6]&127)*2097152+(prefix[7]&127)*16384+(prefix[8]&127)*128+(prefix[9]&127))+((prefix[5]&16)?10:0)
 while(position+4<file.size){const bytes=new Uint8Array(await file.slice(position,Math.min(file.size,position+2*1024*1024)).arrayBuffer());let i=0
  while(i+4<=bytes.length){const h=header(bytes,i);if(!h){i++;continue}if(i+h.bytes>bytes.length)break
   if(first&&position+i+h.bytes+4<file.size&&i+h.bytes+4<=bytes.length&&!header(bytes,i+h.bytes)){i++;continue}
   const tag=first?String.fromCharCode(...bytes.subarray(i+4,Math.min(i+h.bytes,i+180))):''
   const metadata=first&&(/Xing|Info|VBRI/.test(tag));frames.push({offset:position+i,...h,time,metadata});if(!metadata)time+=h.seconds;first=false;i+=h.bytes
  }
  if(!i){if(bytes.length<2048)break;i=bytes.length-4}position+=i;onProgress?.(Math.min(1,position/file.size))
 }
 if(frames.length<2)throw new Error('This MP3 could not be indexed. Choose another file or a short WAV export.');return frames
}
export async function sliceAudio(file:Blob,ranges:AudioRange[],onProgress?:(progress:number)=>void):Promise<{blob:Blob;format:'mp3'|'wav';duration:number}>{
 const prefix=new Uint8Array(await file.slice(0,64*1024).arrayBuffer()),ascii=(start:number,length:number)=>String.fromCharCode(...prefix.subarray(start,start+length))
 if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WAVE'){
  const view=new DataView(prefix.buffer);let fmt=0,data=0,size=0
  for(let pos=12;pos+8<=prefix.length;){const length=view.getUint32(pos+4,true),kind=ascii(pos,4);if(kind==='fmt ')fmt=pos+8;if(kind==='data'){data=pos+8;size=Math.min(length,file.size-data);break}pos+=8+length+(length%2)}
  if(!fmt||!data||![1,3].includes(view.getUint16(fmt,true)))throw new Error('Use a standard PCM WAV file for local long-audio trimming.')
  const block=view.getUint16(fmt+12,true),rate=view.getUint32(fmt+4,true);if(!block||!rate)throw new Error('Invalid WAV format.')
  const chunks=ranges.map(r=>file.slice(data+Math.min(size,Math.floor(r.start*rate)*block),data+Math.min(size,Math.ceil(r.end*rate)*block)))
  const total=chunks.reduce((n,b)=>n+b.size,0);if(!total)throw new Error('The selection contains no audio.');const head=prefix.slice(0,data);const hv=new DataView(head.buffer);hv.setUint32(4,data-8+total,true);hv.setUint32(data-4,total,true)
  return {blob:new Blob([head,...chunks],{type:'audio/wav'}),format:'wav',duration:total/block/rate}
 }
 if(ascii(0,3)!=='ID3'&&!header(prefix,0)&&!/^audio\/(mpeg|mp3)$/.test(file.type))throw new Error('For local long-file cuts, use standard MP3 or PCM WAV. Convert this format before importing.')
 let pending=indexes.get(file);if(!pending){pending=indexMp3(file,onProgress);indexes.set(file,pending);pending.catch(()=>indexes.delete(file))}const frames=(await pending).filter(f=>!f.metadata),chunks:Blob[]=[];let duration=0
 for(const r of ranges){const selected=frames.filter(f=>f.time+f.seconds>r.start&&f.time<r.end);if(!selected.length)continue;const first=selected[0],last=selected[selected.length-1];chunks.push(file.slice(first.offset,last.offset+last.bytes));duration+=selected.reduce((n,f)=>n+f.seconds,0)}
 if(!chunks.length)throw new Error('The selection contains no MP3 frames.');return {blob:new Blob(chunks,{type:'audio/mpeg'}),format:'mp3',duration}
}
