import {mkdir,copyFile,access} from 'node:fs/promises'
import path from 'node:path'

const source=path.resolve('node_modules/onnxruntime-web/dist')
const target=path.resolve('public/ort')
const files=[
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm'
]
await mkdir(target,{recursive:true})
for(const file of files){
  const from=path.join(source,file),to=path.join(target,file)
  try{await access(from);await copyFile(from,to)}catch(error){throw new Error(`Missing ONNX runtime asset: ${file}. Run npm ci with onnxruntime-web 1.24.3 installed.`,{cause:error})}
}
console.log(`Prepared ${files.length} same-origin ONNX runtime assets.`)
