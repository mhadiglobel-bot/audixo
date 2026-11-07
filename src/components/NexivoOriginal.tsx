import {useEffect,useState} from 'react'

/**
 * Render the supplied Nexivo spiral, not a substitute illustration.
 * The source image has a dark background; this small, client-only matte
 * extracts the symbol while preserving its original lilac / silver pixels.
 * The accompanying wordmark is live text so it stays crisp on white.
 */
export default function NexivoOriginal({compact=false,stacked=false}:{compact?:boolean;stacked?:boolean}){
 const [art,setArt]=useState<string>('')
 useEffect(()=>{
  let alive=true
  const source=new Image()
  source.decoding='async'
  source.onload=()=>{
   try{
    const base=document.createElement('canvas');base.width=150;base.height=150
    const ctx=base.getContext('2d',{willReadFrequently:true});if(!ctx)return
    ctx.drawImage(source,0,0,150,150)
    const input=ctx.getImageData(0,0,150,150).data
    const width=91,height=83,left=30,top=25
    const out=document.createElement('canvas');out.width=width;out.height=height
    const output=out.getContext('2d');if(!output)return
    const image=output.createImageData(width,height)
    const clamp=(value:number)=>Math.max(0,Math.min(1,value))
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
     const px=x+left,py=y+top,index=(py*150+px)*4,dest=(y*width+x)*4
     const r=input[index],g=input[index+1],b=input[index+2]
     const maximum=Math.max(r,g,b),minimum=Math.min(r,g,b)
     const softBackground=20+29*Math.exp(-Math.pow((px-75)/48,2)-Math.pow((py-15)/62,2))
     const boundary=Math.sqrt(Math.pow((px-75)/42,2)+Math.pow((py-65)/43,2))
     const edge=clamp((1.065-boundary)*10)
     let alpha=clamp((maximum-softBackground-11)/40)*edge
     if(maximum<75&&maximum-minimum<12)alpha*=.65
     image.data[dest]=r;image.data[dest+1]=g;image.data[dest+2]=b
     image.data[dest+3]=Math.round(alpha*255)
    }
    output.putImageData(image,0,0)
    if(alive)setArt(out.toDataURL('image/png'))
   }catch{/* The page remains readable even if image processing is blocked. */}
  }
  source.src='/nexivo-official-mark.jpg'
  return()=>{alive=false;source.onload=null}
 },[])
 return <span className={'ax94-nexivo-identity'+(compact?' is-compact':'')+(stacked?' is-stacked':'')} role="img" aria-label="Nexivo original spiral logo and Nexivo wordmark">
  <span className="ax94-nexivo-identity-mark">{art?<img src={art} alt="" draggable={false}/>:<span className="ax94-mark-placeholder" aria-hidden="true"/>}</span>
  <span className="ax94-nexivo-identity-name">NEXIVO</span>
 </span>
}
