export function encodeMp3(audioBuffer: AudioBuffer, kbps=320): Promise<Blob> {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./mp3.worker.ts',import.meta.url),{type:'module'})
    worker.onmessage=e=>{worker.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data.blob)}
    worker.onerror=e=>{worker.terminate();reject(new Error(e.message||'MP3 worker failed.'))}
    const channels=Array.from({length:Math.min(2,audioBuffer.numberOfChannels)},(_,i)=>new Float32Array(audioBuffer.getChannelData(i)))
    worker.postMessage({channels,sampleRate:audioBuffer.sampleRate,kbps},channels.map(c=>c.buffer))
  })
}

export function encodeWav(audioBuffer: AudioBuffer) {
  const channels=Math.min(2,audioBuffer.numberOfChannels); const sampleRate=audioBuffer.sampleRate; const length=audioBuffer.length; const bytesPerSample=2; const blockAlign=channels*bytesPerSample
  const buffer=new ArrayBuffer(44+length*blockAlign); const view=new DataView(buffer); let offset=0
  const writeString=(str:string)=>{for(let i=0;i<str.length;i+=1)view.setUint8(offset++,str.charCodeAt(i))}; const write16=(v:number)=>{view.setUint16(offset,v,true);offset+=2}; const write32=(v:number)=>{view.setUint32(offset,v,true);offset+=4}
  writeString('RIFF');write32(36+length*blockAlign);writeString('WAVE');writeString('fmt ');write32(16);write16(1);write16(channels);write32(sampleRate);write32(sampleRate*blockAlign);write16(blockAlign);write16(16);writeString('data');write32(length*blockAlign)
  const ch0=audioBuffer.getChannelData(0); const ch1=channels>1?audioBuffer.getChannelData(1):ch0
  for(let i=0;i<length;i+=1){for(let ch=0;ch<channels;ch+=1){const s=Math.max(-1,Math.min(1,ch===0?ch0[i]:ch1[i]));view.setInt16(offset,s<0?s*0x8000:s*0x7fff,true);offset+=2}}
  return new Blob([buffer],{type:'audio/wav'})
}

export function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500)}
