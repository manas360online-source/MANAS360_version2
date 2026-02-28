import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true, // ✅ CORRECT: Must be boolean true, not 'all'
    open: false,
    cors: true,
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['react-helmet-async'],
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true, // ✅ CORRECT: Must be boolean true, not 'all'
    cors: true,
  },
})
