import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import domain from './config/audixo-domain.json'

export default defineConfig(({mode}) => {
 const env=loadEnv(mode,process.cwd(),'')
 // Canonical identity must not change with VERCEL_URL, preview host, or stale VITE_SITE_URL.
 const origin=domain.canonicalOrigin
 return {
  define:{'import.meta.env.VITE_SITE_URL':JSON.stringify(origin)},
  plugins:[react()],
  worker:{format:'es'},
  optimizeDeps:{include:['@breezystack/lamejs']},
  server:{port:5173,headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'},proxy:{'/api':{target:'http://127.0.0.1:8787'}}},
  preview:{port:4173,headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'}},
  build:{target:'es2020',sourcemap:false,cssCodeSplit:true,chunkSizeWarningLimit:900,rollupOptions:{output:{manualChunks(id){if(id.includes('@breezystack/lamejs'))return'mp3-encoder';if(id.includes('react')||id.includes('react-router-dom'))return'react-vendor'}}}}
 }
})
