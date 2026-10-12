import { encodeWav } from '../editor/encoder'

export type SoundPattern='pad'|'arp'|'keys'|'bass'|'kick'|'perc'|'choir'|'fx'|'pluck'|'pulse'|'strings'|'lead'|'bell'|'guitar'|'groove'
export type SoundBankItem={id:string;name:string;family:string;note:string;root:number;tempo:number;pattern:SoundPattern;variation:number;duration:number}

// 20 distinct music/beat sources x 3 arrangements = 60 creative replacement layers.
// These are generated additions for mashups and stem replacement, not detected instruments.
const templates:[string,string,SoundPattern,number,number,string][]=[
 ['Keys','R&B Chords','keys',60,82,'Warm chord loop for verses and vocal beds'],
 ['Keys','Late Night Keys','keys',64,94,'Bright electric-key loop for hooks'],
 ['Guitar','Clean Pop Guitar','guitar',55,98,'Clean picked guitar groove'],
 ['Guitar','Ambient Guitar','pluck',59,86,'Wide delayed guitar melody'],
 ['Strings','Cinematic Bed','strings',52,72,'Slow cinematic chord lift'],
 ['Strings','Rhythm Strings','strings',57,104,'Rhythmic string pulse for transitions'],
 ['Synth','Neon Lead','lead',67,112,'Modern synth lead phrase'],
 ['Synth','Glass Arpeggio','arp',64,118,'Glassy repeating arpeggio'],
 ['Pads','Air Pad','pad',52,74,'Wide evolving ambient music bed'],
 ['Pads','Night Pad','pad',57,68,'Soft atmospheric backing layer'],
 ['Bass','Warm Bassline','bass',40,96,'Rounded musical bass groove'],
 ['Bass','Deep Sub Pulse','pulse',36,84,'Minimal sub-bass pulse'],
 ['Beats','House Beat','groove',48,108,'Four-on-floor kick, clap and hat groove'],
 ['Beats','Pop Beat','groove',45,100,'Tight pop groove for verses'],
 ['Beats','Half-Time Beat','groove',43,78,'Slow half-time beat for mashups'],
 ['Percussion','Air Hats','perc',50,112,'Light hi-hat and shaker texture'],
 ['Percussion','Organic Percussion','perc',45,94,'Textured percussion loop'],
 ['Beats','Lo-fi Beat','groove',48,82,'Soft lo-fi drum and texture bed'],
 ['Beats','Pop Pulse','pulse',52,118,'Clean rhythmic pulse for pop transitions'],
 ['FX','Transition Rise','fx',57,100,'Riser and impact for section changes'],
]
const arrangements=[
 ['Warm Verse','Open Hook','Late Bridge'],['Soft Verse','Bright Hook','After Hours'],['Verse Pick','Hook Lift','Bridge Air'],['Dream Verse','Wide Hook','Night Bridge'],['Intro Bed','Verse Lift','Final Rise'],['Pulse Verse','Driving Hook','Open Bridge'],['Clean Lead','Hook Spark','Final Lift'],['Glass Verse','Open Arp','Night Motion'],['Soft Bed','Wide Air','Afterglow'],['Low Night','Dream Bed','Late Air'],['Verse Groove','Hook Push','Deep Bridge'],['Low Pulse','Sub Motion','Night Drive'],['Club Verse','Main Hook','Late Drop'],['Pop Verse','Bright Hook','Clean Bridge'],['Half Verse','Deep Hook','Slow Break'],['Air Groove','Light Hook','Open Hats'],['Wood Verse','Hand Groove','Organic Break'],['Dust Verse','Tape Hook','Late Loop'],['Clean Pulse','Hook Drive','Bridge Motion'],['Soft Rise','Bright Lift','Final Impact']
] as const
export const soundBank:SoundBankItem[]=templates.flatMap((t,ti)=>arrangements[ti].map((label,i)=>({
 id:`bank-${ti}-${i}`,family:t[0],name:`${t[1]} · ${label}`,note:`${t[5]} · ${label.toLowerCase()}`,pattern:t[2],root:t[3]+(i===2?2:0),tempo:t[4]+(i-1)*4,variation:i,duration:4+(i*.35)
})))

const semitone=(m:number)=>440*Math.pow(2,(m-69)/12)
function env(g:GainNode,start:number,end:number,peak=.22,attack=.025){g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.001,peak),start+attack);g.gain.exponentialRampToValueAtTime(.0001,Math.max(start+attack+.01,end))}
function note(ctx:OfflineAudioContext,dest:AudioNode,midi:number,start:number,len:number,type:OscillatorType='sine',gain=.18,pan=0,detune=0){const osc=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner();osc.type=type;osc.frequency.value=semitone(midi);osc.detune.value=detune;env(g,start,start+len,gain,Math.min(.08,len*.15));p.pan.value=pan;osc.connect(g).connect(p).connect(dest);osc.start(start);osc.stop(start+len+.02)}
function noiseBurst(ctx:OfflineAudioContext,dest:AudioNode,start:number,len:number,gain=.14,highpass=1200){const rate=ctx.sampleRate,buffer=ctx.createBuffer(1,Math.ceil(len*rate),rate),data=buffer.getChannelData(0);let seed=Math.floor((start+1)*100000)%2147483647||1;for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=seed/1073741823.5-1}const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buffer;filter.type='highpass';filter.frequency.value=highpass;env(g,start,start+len,gain,.005);src.connect(filter).connect(g).connect(dest);src.start(start);src.stop(start+len+.02)}
function kick(ctx:OfflineAudioContext,dest:AudioNode,start:number,power=.5){const osc=ctx.createOscillator(),g=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(118,start);osc.frequency.exponentialRampToValueAtTime(44,start+.15);env(g,start,start+.3,power,.004);osc.connect(g).connect(dest);osc.start(start);osc.stop(start+.34)}

export async function createSoundBankClip(item:SoundBankItem){
 const rate=44100,length=Math.ceil(item.duration*rate),ctx=new OfflineAudioContext(2,length,rate),master=ctx.createGain(),comp=ctx.createDynamicsCompressor(),tone=ctx.createBiquadFilter();master.gain.value=.78;tone.type='lowpass';tone.frequency.value=15500;master.connect(tone).connect(comp).connect(ctx.destination)
 const beat=60/item.tempo,root=item.root,v=item.variation
 if(item.pattern==='pad'||item.pattern==='choir'){
  const chord=v===1?[0,3,7,10]:v===2?[0,5,7,12]:[0,4,7,11]
  for(const interval of chord){note(ctx,master,root+interval,0,item.duration,'sine',item.pattern==='choir'?.105:.125,(interval-5)/26,-4);note(ctx,master,root+interval+12,.06,item.duration-.12,'triangle',.035,(5-interval)/26,5)}
  if(item.pattern==='choir')noiseBurst(ctx,master,.05,item.duration-.1,.018,2800)
 }else if(item.pattern==='strings'){
  const chord=v===1?[0,3,7,10]:[0,4,7,12];for(const interval of chord){note(ctx,master,root+interval,0,item.duration,'sawtooth',.045,(interval-5)/32,-7);note(ctx,master,root+interval,.05,item.duration-.1,'triangle',.07,(5-interval)/32,7)}
  for(let i=0;i<8;i++)note(ctx,master,root+[0,7,4,9][i%4]+12,i*beat/2,beat*.32,'triangle',.035,(i%2?1:-1)*.25)
 }else if(item.pattern==='keys'){
  const seq=v===1?[0,7,3,10,7,3,0,7]:v===2?[0,5,9,12,9,5,2,7]:[0,4,7,11,7,4,2,9]
  seq.forEach((n,i)=>{note(ctx,master,root+n,i*beat/2,beat*.68,'triangle',.13,(i%2?1:-1)*.12);note(ctx,master,root+n+12,i*beat/2,beat*.24,'sine',.035,0)})
 }else if(item.pattern==='arp'||item.pattern==='pluck'||item.pattern==='guitar'){
  const seq=v===1?[0,7,12,10,7,3,10,12]:v===2?[0,5,9,14,9,5,12,14]:[0,4,7,12,7,4,9,12]
  seq.forEach((n,i)=>{const short=item.pattern==='guitar'?.24:item.pattern==='pluck'?.3:.42;const type:OscillatorType=item.pattern==='arp'?'square':'triangle';note(ctx,master,root+n,i*beat/2,beat*short,type,item.pattern==='arp'?.07:.115,Math.sin(i)*.28);if(item.pattern==='guitar')note(ctx,master,root+n+12,i*beat/2+.015,beat*.12,'sine',.03,-Math.sin(i)*.15)})
 }else if(item.pattern==='lead'){
  const seq=v===1?[0,2,7,5,9,7,5,2]:v===2?[0,4,9,7,12,9,7,4]:[0,4,7,9,7,4,2,7]
  seq.forEach((n,i)=>{note(ctx,master,root+n,i*beat/2,beat*.38,'sawtooth',.07,Math.sin(i*.8)*.25,-5);note(ctx,master,root+n,i*beat/2,beat*.38,'square',.025,-Math.sin(i*.8)*.2,5)})
 }else if(item.pattern==='bell'){
  const seq=v===1?[0,7,12,7,10,12,14,10]:v===2?[0,5,9,12,14,9,5,12]:[0,4,7,12,11,7,4,9]
  seq.forEach((n,i)=>{note(ctx,master,root+n,i*beat/2,beat*.55,'sine',.12,Math.sin(i)*.24);note(ctx,master,root+n+19,i*beat/2,beat*.22,'sine',.025,-Math.sin(i)*.2)})
 }else if(item.pattern==='bass'||item.pattern==='pulse'){
  const seq=v===1?[0,0,7,5,0,3,7,5]:v===2?[0,5,10,7,3,5,7,10]:[0,7,0,5,3,0,7,10]
  seq.forEach((n,i)=>note(ctx,master,root+n,i*beat/2,beat*(item.pattern==='pulse'?.3:.54),'sine',item.pattern==='pulse'?.22:.27,(i%2?-.05:.05)))
 }else if(item.pattern==='kick'){
  for(let i=0;i<8;i++){const start=i*beat/2;kick(ctx,master,start,.5);if(i%2===1)noiseBurst(ctx,master,start+.02,.1,.045,2200)}
 }else if(item.pattern==='groove'){
  for(let i=0;i<16;i++){const start=i*beat/4;if(i%4===0)kick(ctx,master,start,.46);if(i%8===4)noiseBurst(ctx,master,start,.12,.12,1200);if(i%2===1)noiseBurst(ctx,master,start,.04,.035,6800)}
 }else if(item.pattern==='perc'){
  for(let i=0;i<16;i++){const start=i*beat/4;if((i+v)%4===0)noiseBurst(ctx,master,start,.09,.1,2400);else if((i+v)%2===0)noiseBurst(ctx,master,start,.045,.045,6200)}
 }else if(item.pattern==='fx'){
  const osc=ctx.createOscillator(),g=ctx.createGain(),pan=ctx.createStereoPanner();osc.type=v===2?'square':'sawtooth';osc.frequency.setValueAtTime(semitone(root-12),0);osc.frequency.exponentialRampToValueAtTime(semitone(root+(v===1?19:12)),item.duration*.86);env(g,0,item.duration,.075,.35);pan.pan.setValueAtTime(-.72,0);pan.pan.linearRampToValueAtTime(.72,item.duration);osc.connect(g).connect(pan).connect(master);osc.start(0);osc.stop(item.duration);for(let i=0;i<10;i++)noiseBurst(ctx,master,i*item.duration/10,item.duration/7,.014+i*.004,2500+i*250);if(v===2)kick(ctx,master,item.duration*.78,.5)
 }
 const rendered=await ctx.startRendering();return encodeWav(rendered)
}
