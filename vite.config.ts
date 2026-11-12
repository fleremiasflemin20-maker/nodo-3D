import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, /api/* va al Worker de `wrangler dev` (puerto 8787).
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, proxy: { '/api': 'http://127.0.0.1:8787' } },
})
