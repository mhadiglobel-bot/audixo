/** Browser-local lyric cue utilities and H.264/AAC MP4 generation.
 * No user audio is uploaded to AUDIXO servers by this module. The MP4 encoder
 * is loaded on demand and runs locally using WebCodecs.
 */
export type WordCue={text:string;start:number;end:number}
export type LyricLine={id:string;start:number;end:number;words:WordCue[]}
export type Aspect='landscape'|'portrait'
export type Theme='midnight'|'aurora'|'rose'
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n))
const clean=(s:string)=>String(s||'').replace(/\s+/g,' ').trim()
const letters:Record<string,string>={
 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
 'ا':'a','آ':'aa','أ':'a','إ':'i','ب':'b','پ':'p','ت':'t','ٹ':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh','د':'d','ڈ':'d','ذ':'z','ر':'r','ڑ':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ک':'k','ك':'k','گ':'g','ل':'l','م':'m','ن':'n','ں':'n','و':'o','ؤ':'o','ہ':'h','ھ':'h','ه':'h','ء':'','ی':'i','ي':'i','ے':'e','ئ':'i','ِ':'i','ُ':'u','َ':'a','ْ':'',
 'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au','क':'k','ख':'kh','ग':'g','घ':'gh','च':'ch','छ':'chh','ज':'j','झ':'jh','ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n','प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h','ा':'aa','ि':'i','ी':'ee','ु':'u','ू':'oo','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'n','ः':'h','्':'',
 'ਅ':'a','ਆ':'aa','ਇ':'i','ਈ':'ee','ਉ':'u','ਊ':'oo','ਏ':'e','ਐ':'ai','ਓ':'o','ਔ':'au','ਕ':'k','ਖ':'kh','ਗ':'g','ਘ':'gh','ਚ':'ch','ਛ':'chh','ਜ':'j','ਝ':'jh','ਟ':'t','ਠ':'th','ਡ':'d','ਢ':'dh','ਣ':'n','ਤ':'t','ਥ':'th','ਦ':'d','ਧ':'dh','ਨ':'n','ਪ':'p','ਫ':'ph','ਬ':'b','ਭ':'bh','ਮ':'m','ਯ':'y','ਰ':'r','ਲ':'l','ਵ':'v','ਸ਼':'sh','ਸ':'s','ਹ':'h','ੜ':'r','ਾ':'aa','ਿ':'i','ੀ':'ee','ੁ':'u','ੂ':'oo','ੇ':'e','ੈ':'ai','ੋ':'o','ੌ':'au','ੰ':'n','ਂ':'n','੍':''
}
/** Approximate readable Latin transliteration, NOT a certified linguistic romanization. */
export function romanize(input:string):string{
 return Array.from(input).map(ch=>{
  const lower=ch.toLowerCase(),mapped=letters[lower]
  if(mapped===undefined)return ch
  return ch!==lower&&mapped?mapped[0].toUpperCase()+mapped.slice(1):mapped
 }).join('').normalize('NFKC')
}
const split=(s:string)=>clean(s).split(/\s+/).filter(Boolean)
const arrange=(text:string,start:number,end:number):WordCue[]=>{
 const words=split(romanize(text)),len=Math.max(.08,end-start)
 const weights=words.map(w=>Math.max(1,w.length)),sum=weights.reduce((a,b)=>a+b,0)||1
 let pos=start
 return words.map((word,i)=>{const span=i===words.length-1?end-pos:len*weights[i]/sum;const cue={text:word,start:pos,end:pos+span};pos+=span;return cue})
}
export function fromWordCues(chunks:{text:string;timestamp:[number,number]}[],duration:number):LyricLine[]{
 const words:WordCue[]=[]
 for(const c of chunks){
  const start=clamp(Number(c.timestamp?.[0])||0,0,duration),end=clamp(Number(c.timestamp?.[1])||start+.18,start+.05,duration)
  if(!clean(c.text)||end<=start)continue
  // Some models return multi-word segments despite a word timestamp request.
  words.push(...arrange(c.text,start,end))
 }
 words.sort((a,b)=>a.start-b.start)
 const lines:LyricLine[]=[]
 let group:WordCue[]=[]
 const flush=()=>{if(!group.length)return;const first=group[0],last=group[group.length-1];lines.push({id:'line-'+lines.length,start:first.start,end:last.end,words:group});group=[]}
 for(const word of words){
  if(group.length&&(group.length>=7||word.start-group[group.length-1].end>1||word.end-group[0].start>4.8))flush()
  group.push(word)
 }flush()
 return lines
}
const lrc=/^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/
export function parseLyricText(raw:string,duration:number):{lines:LyricLine[];estimated:boolean}{
 const entries:{start:number;text:string}[]=[]
 const plain:string[]=[]
 for(const line of raw.split(/\r?\n/)){
  const match=line.match(lrc)
  if(match){
   const fraction=match[3]?(Number(match[3])/Math.pow(10,match[3].length)):0
   const t=Number(match[1])*60+Number(match[2])+fraction
   if(clean(match[4])&&t>=0&&t<duration)entries.push({start:t,text:match[4]})
  }else if(clean(line)&&!line.trim().startsWith('['))plain.push(clean(line))
 }
 if(entries.length){
  entries.sort((a,b)=>a.start-b.start)
  const lines=entries.map((entry,i)=>{
   const next=entries[i+1]?.start??duration
   const end=clamp(Math.max(entry.start+.2,next-.06),entry.start+.05,duration)
   return {id:'lrc-'+i,start:entry.start,end,words:arrange(entry.text,entry.start,end)}
  })
  return {lines,estimated:true} // LRC line times are known, individual word timings are estimated.
 }
 const nonEmpty=plain.length?plain:raw.split(/\r?\n/).map(clean).filter(Boolean)
 const lines=nonEmpty.map((text,i)=>{
  const start=duration*i/nonEmpty.length,end=duration*(i+1)/nonEmpty.length
  return {id:'manual-'+i,start,end,words:arrange(text,start,end)}
 })
 return {lines,estimated:true}
}
export function editLine(line:LyricLine,patch:{start?:number;end?:number;text?:string},duration:number):LyricLine{
 const start=clamp(Number(patch.start??line.start),0,Math.max(0,duration-.06))
 const end=clamp(Math.max(start+.06,Number(patch.end??line.end)),start+.06,duration)
 const text=patch.text??line.words.map(w=>w.text).join(' ')
 return {...line,start,end,words:arrange(text,start,end)}
}
export function activeLineIndex(lines:LyricLine[],time:number):number{
 for(let i=0;i<lines.length;i++)if(time>=lines[i].start&&time<lines[i].end)return i
 return -1
}
export const stamp=(time:number)=>{const t=Math.max(0,time);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0')}
export function downloadBlob(blob:Blob,name:string){
 const a=document.createElement('a'),url=URL.createObjectURL(blob)
 a.href=url;a.download=name.replace(/[\\/:*?"<>|]/g,' ').slice(0,115)+'.mp4'
 document.body.append(a);a.click();a.remove()
 setTimeout(()=>URL.revokeObjectURL(url),60000)
}
export function drawLyrics(canvas:HTMLCanvasElement,lines:LyricLine[],time:number,opts:{title:string;theme:Theme;offset:number}){
 const ctx=canvas.getContext('2d');if(!ctx)return
 const w=canvas.width,h=canvas.height,s=Math.min(w/1280,h/720),portrait=h>w
 const colors:Record<Theme,[string,string,string]>={midnight:['#09152a','#202149','#25dbbc'],aurora:['#061e29','#113a45','#08e9d5'],rose:['#1a1030','#3a1941','#f45dbf']}
 const [a,b,accent]=colors[opts.theme],bg=ctx.createLinearGradient(0,0,w,h)
 bg.addColorStop(0,a);bg.addColorStop(1,b);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)
 const orb=ctx.createRadialGradient(w*.73,h*.3,0,w*.73,h*.3,w*.6)
 orb.addColorStop(0,accent+'35');orb.addColorStop(1,'#00000000')
 ctx.fillStyle=orb;ctx.fillRect(0,0,w,h)
 ctx.textAlign='center';ctx.textBaseline='middle'
 const small=Math.round(clamp(w*.022,15,30)),major=Math.round(clamp(w*(portrait?.063:.046),28,72))
 ctx.font='800 '+small+'px Nunito, sans-serif';ctx.fillStyle='#a7b4c8'
 ctx.fillText('AUDIXO  /  LYRICS VIDEO',w/2,Math.max(52,h*.11))
 ctx.font='800 '+Math.round(clamp(w*.032,18,42))+'px Nunito, sans-serif'
 ctx.fillStyle='#e9edfa';ctx.fillText(opts.title.slice(0,46),w/2,h*.19,w*.88)
 const i=activeLineIndex(lines,time+opts.offset),line=i>=0?lines[i]:null
 const text=wordsText(line)
 const display=text||(time+opts.offset<(lines[0]?.start??0)?'♫  YOUR SOUND  ♫':'')
 const maxWidth=w*.84,maxFont=major
 const parts=display.split(' '),rows:string[]=[]
 let row=''
 ctx.font='900 '+maxFont+'px Nunito, sans-serif'
 for(const part of parts){
  const candidate=row?row+' '+part:part
  if(row&&ctx.measureText(candidate).width>maxWidth){rows.push(row);row=part}else row=candidate
 }if(row)rows.push(row)
 const visible=rows.slice(0,portrait?5:3),lineHeight=major*1.35
 const firstY=h*.52-(visible.length-1)*lineHeight/2
 let cursor=0
 visible.forEach((row,r)=>{
  const tokens=row.split(' '),widths=tokens.map(t=>ctx.measureText(t).width),space=ctx.measureText(' ').width
  const total=widths.reduce((a,v)=>a+v,0)+space*(tokens.length-1)
  let x=(w-total)/2
  tokens.forEach((token,k)=>{
   const word=line?.words[cursor];const lit=word&&time+opts.offset>=word.start&&time+opts.offset<word.end
   const past=word&&time+opts.offset>=word.end
   ctx.fillStyle=lit?'#ffffff':past?accent:'#a5b1c9'
   ctx.shadowColor=lit?accent:'transparent';ctx.shadowBlur=lit?major*.46:0
   ctx.textAlign='left';ctx.fillText(token,x,firstY+r*lineHeight)
   ctx.shadowBlur=0;x+=widths[k]+space;cursor++
  })
 })
 ctx.textAlign='center';ctx.font='700 '+small+'px Nunito, sans-serif';ctx.fillStyle='#93a7bb'
 if(i>=0&&lines[i+1])ctx.fillText(wordsText(lines[i+1]).slice(0,75),w/2,Math.min(h*.85,firstY+(visible.length+1)*lineHeight),w*.82)
 ctx.fillStyle=accent;ctx.fillRect(w*.12,h*.927,w*.76*clamp(time/Math.max(.1,lines[lines.length-1]?.end||time+1),0,1),Math.max(3,4*s))
}
export const wordsText=(line:LyricLine|null|undefined)=>line?.words.map(w=>w.text).join(' ')||''
export async function renderLyricMp4(options:{
 audio:AudioBuffer;lines:LyricLine[];title:string;theme:Theme;offset:number;aspect:Aspect;
 onProgress:(value:number)=>void;signal:AbortSignal
}):Promise<Blob>{
 if(typeof VideoEncoder==='undefined'||typeof AudioEncoder==='undefined')throw Error('MP4 export needs a current desktop Chrome/Edge browser with WebCodecs H.264 and AAC support.')
 const url='https://esm.sh/mediabunny@1.65.2'
 const m:any=await import(/* @vite-ignore */ url)
 if(options.signal.aborted)throw new DOMException('Cancelled','AbortError')
 const canvas=document.createElement('canvas')
 canvas.width=options.aspect==='portrait'?720:1280;canvas.height=options.aspect==='portrait'?1280:720
 const target=new m.BufferTarget()
 const output=new m.Output({format:new m.Mp4OutputFormat({fastStart:'in-memory'}),target})
 const video=new m.CanvasSource(canvas,{codec:'avc',quality:new m.Quality({bitrate:2_400_000}),keyFrameInterval:2})
 const audio=new m.AudioBufferSource({codec:'aac',quality:new m.Quality({bitrate:160_000})})
 output.addVideoTrack(video);output.addAudioTrack(audio)
 try{
  await output.start()
  await audio.add(options.audio)
  audio.close()
  const fps=15,total=Math.max(1,Math.ceil(options.audio.duration*fps))
  for(let frame=0;frame<total;frame++){
   if(options.signal.aborted)throw new DOMException('Cancelled','AbortError')
   const time=frame/fps
   drawLyrics(canvas,options.lines,time,{title:options.title,theme:options.theme,offset:options.offset})
   await video.add(time,Math.min(1/fps,options.audio.duration-time))
   if(frame%15===0)options.onProgress(Math.round(frame/total*100))
  }
  video.close()
  await output.finalize()
  if(!target.buffer||target.buffer.byteLength<1024)throw Error('The MP4 encoder returned an empty file.')
  options.onProgress(100)
  return new Blob([target.buffer],{type:'video/mp4'})
 }catch(error){try{video.close();audio.close()}catch{};throw error}
}
