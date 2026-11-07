/**
 * Original, user-supplied Nexivo emblem. Mask only the dark source lettering
 * within the supplied transparent asset; set the name as crisp live text.
 */
export default function NexivoOriginal({compact=false,stacked=false}:{compact?:boolean;stacked?:boolean}){
 return <span className={'ax96-nexivo-identity'+(compact?' is-compact':'')+(stacked?' is-stacked':'')} role="img" aria-label="NEXIVO parent company original spiral emblem and wordmark">
   <span className="ax96-nexivo-emblem"><img src="/nexivo-symbol-v96.png" alt="" decoding="async" draggable={false}/></span>
   <span className="ax96-nexivo-type"><strong>NEXIVO</strong><small>PARENT COMPANY</small></span>
 </span>
}
