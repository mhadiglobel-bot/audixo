const configured = import.meta.env.VITE_SITE_URL?.replace(/\/$/,'') || ''

// OFFICIAL SUPPORT EMAIL — EDIT HERE WHEN READY, THEN COMMIT TO GITHUB:
// const manualSupportEmail='support@your-domain.example'
// Leave the value empty until you have a real mailbox. The Contact page will display a
// "Coming Soon" message until configured. Once configured it shows a direct mailto link.
const manualSupportEmail=''

// Optional Vercel environment-variable route. It is disabled by default so an
// old/wrong VITE_SUPPORT_EMAIL can never appear accidentally. To use it, set
// VITE_SUPPORT_EMAIL_ENABLED=true together with VITE_SUPPORT_EMAIL.
const envEmailEnabled=import.meta.env.VITE_SUPPORT_EMAIL_ENABLED==='true'
const envEmail=envEmailEnabled?(import.meta.env.VITE_SUPPORT_EMAIL||''):''

const MP4_QUALITIES=['240','360','480','720','1080','1440','2160'] as const
const normalizeMp4Quality=(value:unknown)=>{
 const match=String(value??'').trim().match(/^(240|360|480|720|1080|1440|2160)(?:p)?$/i)
 return match?match[1]:''
}
const parseMp4Fallbacks=(raw:unknown,fallbacks:string[])=>{
 const unique:string[]=[]
 for(const piece of String(raw??'').split(/[\s,|>]+/)){
  const value=normalizeMp4Quality(piece)
  if(value&&!unique.includes(value))unique.push(value)
 }
 return unique.length?unique:fallbacks
}
const configuredDefaultQuality=normalizeMp4Quality(import.meta.env.VITE_AUDIXO_DEFAULT_MP4_QUALITY)||'1080'
const configuredFallbacks=parseMp4Fallbacks(import.meta.env.VITE_AUDIXO_MP4_FALLBACKS,['1080','720','480','360','240'])
if(!configuredFallbacks.includes(configuredDefaultQuality))configuredFallbacks.unshift(configuredDefaultQuality)

export const site = {
 name:'Audixo',shortName:'Audixo',
 url:configured || (typeof window!=='undefined'?window.location.origin:''),
 email:(manualSupportEmail||envEmail).trim(),
 company:'Nexivo',
 description:'AUDIXO is a free online audio studio with a hands-on sound playground, real-time echo and reverb previews, precision trimming, vocal separation, mixing and permitted MP3 or MP4 downloads.'
}
export const contactEmailReady=Boolean(site.email)
export const mediaUiConfig={defaultMp4Quality:configuredDefaultQuality,mp4Fallbacks:configuredFallbacks,allMp4Qualities:[...MP4_QUALITIES]}


// V50: paste the exact YouTube upload used for each cropped excerpt.
// Empty means NOT VERIFIED. Do not substitute a guessed video or unrelated art.
// The thumbnail renderer accepts watch, youtu.be, shorts, live and embed URLs.
export const demoYoutubeSources: Record<string,string> = {
  'teu-perfume': '',
  'te-conoci': '',
  'aura-farming': '',
  'montagem-ahora': '',
  'montagem-illuminal': '',
  'montagem-royal': '',
  'baila-lento': '',
  'tiki-tiki': '',
  'funk-sigilo': '',
  'funk-power': '',
}
