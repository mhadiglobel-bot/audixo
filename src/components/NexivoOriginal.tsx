/**
 * Exact supplied Nexivo symbol and original lettering, extracted once into
 * public/nexivo-original-clean.png with a transparent background.
 * Do not generate a substitute N glyph or manually redraw the brand.
 */
export default function NexivoOriginal({compact=false,stacked=false}:{compact?:boolean;stacked?:boolean}){
 return <span className={'ax95-nexivo-logo'+(compact?' is-compact':'')+(stacked?' is-stacked':'')} role="img" aria-label="NEXIVO original spiral symbol and wordmark">
  <img src="/nexivo-original-clean.png" alt="" draggable={false} decoding="async" />
 </span>
}
