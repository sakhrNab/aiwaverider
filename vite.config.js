import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: {
      '.js': 'jsx', // Tells esbuild to treat .js files as JSX
    },
  },
})