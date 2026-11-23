export const MP3_BITRATES=[32,40,48,56,64,80,96,112,128,160,192,224,256,320] as const
export const MP3_DURATIONS:number[]=[15,30,45,...Array.from({length:147},(_,i)=>(i+1)*60)]
export const MP3_ROOT='/reference/mp3-file-size'
export function durationLabel(s:number){const m=Math.floor(s/60),r=s%60;return !m?s+' seconds':!r?m+(m===1?' minute':' minutes'):m+' min '+r+' sec'}
export function mp3SizeMB(kbps:number,seconds:number){return kbps*seconds/8000}
export function mp3Url(kbps:number,seconds?:number){return MP3_ROOT+'/'+kbps+'-kbps'+(seconds===undefined?'':'/'+seconds+'-seconds')}
export type Reference={path:string;title:string;description:string;bitrate?:number;seconds?:number}
export const mp3References:Reference[]=[
 {path:MP3_ROOT,title:'MP3 File Size Reference',description:'Browse accurate constant-bit-rate MP3 size calculations by duration and bitrate, with audio quality guidance and links to AUDIXO editors.'},
 ...MP3_BITRATES.flatMap(bitrate=>[
  {path:mp3Url(bitrate),title:bitrate+' kbps MP3 File Size by Duration',description:'Find '+bitrate+' kbps MP3 size estimates for 150 recording lengths from 15 seconds to 147 minutes, with quality guidance from AUDIXO.',bitrate},
  ...MP3_DURATIONS.map(seconds=>({
   path:mp3Url(bitrate,seconds),title:durationLabel(seconds)+' MP3 File Size at '+bitrate+' kbps',
   description:'A '+durationLabel(seconds)+' MP3 at '+bitrate+' kbps is approximately '+mp3SizeMB(bitrate,seconds).toFixed(2)+' MB using constant bitrate. Calculate and compare MP3 sizes with AUDIXO.',
   bitrate,seconds
  }))
 ])
]
const map=new Map(mp3References.map(p=>[p.path,p]))
export function getMp3Reference(path:string){return map.get(path)}
