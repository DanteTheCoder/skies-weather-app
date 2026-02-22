import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  // Optimize large image assets
  build: {
    assetsInlineLimit: 0, // Never inline frames as base64
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
      }
    }
  }
})
