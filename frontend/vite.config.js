// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // process.cwd() is /app in the container
  const CWD = process.cwd();
  console.log(`Vite config CWD: ${CWD}, Mode: ${mode}`);

  // Load environment variables.
  // loadEnv will check for .env, .env.development, etc. in CWD
  // AND it will also pick up variables already in process.env.
  const viteEnv = loadEnv(mode, CWD, ''); // Loads all, not just VITE_ for its own use

  // For the proxy target, prioritize what's in process.env (set by docker-compose env_file)
  const proxyTarget = process.env.VITE_PROXY_TARGET || viteEnv.VITE_PROXY_TARGET || 'http://host.docker.internal:4000';
  console.log(`Proxy target: ${proxyTarget}`);

  // Check if essential VITE_ variables are loaded (for client-side)
  // These come from process.env (via env_file) and Vite makes them import.meta.env
  console.log(`VITE_API_URL from process.env for Vite: ${process.env.VITE_API_URL}`);
  // console.log(`VITE_API_URL from loadEnv result: ${viteEnv.VITE_API_URL}`); // Should be the same

  return {
    base: '/',
    plugins: [react()],
    // If you have a root option, ensure it's correct, e.g., root: CWD,
    // But default is fine if index.html is in /app
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      fs: {
        // Might help with file system sensitivity in Docker, especially with Windows hosts
        strict: false, // Try adding this
        // allow: ['search-params', CWD], // By default Vite allows serving from root and .vite cache.
      },
      hmr: {
        host: 'localhost',
        port: 5173,
      },
      watch: {
        usePolling: true, // Good for Docker volumes
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        }
      }
    },
  }
})