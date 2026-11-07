import {useId} from 'react'

/** Scalable white-background redraw of the supplied Nexivo spiral / N mark. */
export function NexivoMark({size=112}:{size?:number}){
 const id=useId().replace(/:/g,'')
 return <svg className="ax92-nexivo-mark" width={size} height={size} viewBox="0 0 120 120" fill="none" role="img" aria-label="Nexivo spiral N symbol">
  <defs>
   <linearGradient id={id+'outer'} x1="12" y1="14" x2="109" y2="104" gradientUnits="userSpaceOnUse"><stop stopColor="#e9b6ee"/><stop offset=".26" stopColor="#8560a3"/><stop offset=".51" stopColor="#f0eaf6"/><stop offset=".73" stopColor="#4d355e"/><stop offset="1" stopColor="#a64bba"/></linearGradient>
   <linearGradient id={id+'metal'} x1="32" y1="36" x2="94" y2="91" gradientUnits="userSpaceOnUse"><stop stopColor="#f6effa"/><stop offset=".28" stopColor="#8b779b"/><stop offset=".57" stopColor="#fbf7fd"/><stop offset="1" stopColor="#6e547e"/></linearGradient>
   <linearGradient id={id+'violet'} x1="7" y1="100" x2="107" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#66327f"/><stop offset=".48" stopColor="#c977d3"/><stop offset="1" stopColor="#e8c9f2"/></linearGradient>
   <filter id={id+'shadow'} x="-22%" y="-22%" width="144%" height="144%"><feDropShadow dx="0" dy="2" stdDeviation="1.1" floodColor="#4d355e" floodOpacity=".18"/></filter>
  </defs>
  <g filter={`url(#${id}shadow)`}>
   <path d="M60 11C80 8 99 19 107 37C104 24 93 14 80 10C62 3 42 9 30 23C41 15 51 12 60 11Z" fill={`url(#${id}outer)`}/>
   <path d="M91 19C108 33 114 56 106 75C116 61 117 44 109 30C99 13 82 8 65 11C77 11 84 14 91 19Z" fill={`url(#${id}metal)`}/>
   <path d="M104 72C94 93 75 103 54 101C70 108 91 104 103 91C116 76 116 59 108 45C111 58 109 65 104 72Z" fill={`url(#${id}violet)`}/>
   <path d="M57 104C34 108 16 94 10 75C12 89 20 100 33 107C52 117 74 109 88 96C77 102 68 104 57 104Z" fill={`url(#${id}metal)`}/>
   <path d="M14 84C3 65 8 43 23 30C8 37 2 52 4 68C6 87 20 101 39 105C27 100 20 94 14 84Z" fill={`url(#${id}violet)`}/>
   <path d="M24 30C38 15 58 14 75 20C61 10 42 11 28 19C13 27 6 43 8 60C10 47 16 38 24 30Z" fill={`url(#${id}outer)`}/>
   <path d="M33 40C40 31 47 30 53 35L79 62V36C79 30 84 27 90 29C95 32 96 38 94 43V79C94 87 86 91 80 86L44 51V78C44 85 40 89 34 88C29 87 26 82 27 77V48C27 45 29 42 33 40Z" fill="#342b43"/>
   <path d="M35 75V45C35 41 39 38 43 42L83 81C85 83 89 81 89 77V37" stroke={`url(#${id}metal)`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="M34 47L41 41L86 83" stroke={`url(#${id}violet)`} strokeWidth="2.4" strokeLinecap="round" opacity=".8"/>
  </g>
 </svg>
}

/** Clean, editable DIXO display mark; separate from the Nexivo master symbol. */
export function DixoMark({size=72}:{size?:number}){
 const id=useId().replace(/:/g,'')
 return <svg className="ax92-dixo-mark" width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label="DIXO stylized D symbol">
  <defs><linearGradient id={id} x1="14" y1="12" x2="91" y2="89" gradientUnits="userSpaceOnUse"><stop stopColor="#d86de0"/><stop offset=".48" stopColor="#8057d0"/><stop offset="1" stopColor="#3c5499"/></linearGradient></defs>
  <rect x="9" y="9" width="82" height="82" rx="24" fill="#f5f1ff" stroke="#e5dbf8" strokeWidth="2"/>
  <path d="M29 27H48C69 27 79 36 79 50C79 64 69 73 48 73H29V27Z" stroke={`url(#${id})`} strokeWidth="9" strokeLinejoin="round"/>
  <path d="M47 39V61" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round"/>
 </svg>
}
