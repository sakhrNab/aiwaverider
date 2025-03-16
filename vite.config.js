// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/', // Replace with your repository name
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: ''
      }
    },
    postcss: {
      plugins: []
    }
  },
  server: {
    hmr: {
      overlay: false
    }
  }
})
