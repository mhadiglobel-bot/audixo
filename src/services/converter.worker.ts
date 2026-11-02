import * as lame from '@breezystack/lamejs'

type Input={type:'encode';channels:Float32Array[];sampleRate:number;kbps:number}
self.onmessage=(event:MessageEvent<Input>)=>{
 try{
  const {channels,sampleRate,kbps}=event.data
  const encoder=new lame.Mp3Encoder(Math.min(2,channels.length),sampleRate,kbps)
  const chunks:Uint8Array[]=[]
  const total=channels[0].length
  function toInt16(data:Float32Array,start:number){const len=Math.min(1152,data.length-start),out=new Int16Array(len);for(let i=0;i<len;i++){const v=Math.max(-1,Math.min(1,data[start+i]));out[i]=v<0?v*32768:v*32767}return out}
  for(let offset=0;offset<total;offset+=1152){
   const l=toInt16(channels[0],offset),r=channels.length>1?toInt16(channels[1],offset):undefined
   const bytes=r?encoder.encodeBuffer(l,r):encoder.encodeBuffer(l)
   if(bytes.length)chunks.push(new Uint8Array(bytes))
   if(offset%(1152*100)===0)self.postMessage({type:'progress',percent:Math.min(99,Math.floor(offset/total*100))})
  }
  const last=encoder.flush();if(last.length)chunks.push(new Uint8Array(last))
  self.postMessage({type:'done',blob:new Blob(chunks as BlobPart[],{type:'audio/mpeg'})})
 }catch(e){self.postMessage({type:'error',message:e instanceof Error?e.message:'MP3 encoding failed'})}
}
