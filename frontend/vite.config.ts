import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // CRITICAL: Bind to all interfaces for container/remote access
    port: 3000,
    strictPort: true, // Fail if port is already in use
    open: false, // Don't try to open browser in container
    cors: true,
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
    host: '0.0.0.0', // CRITICAL: Same for preview mode
    port: 3000,
    strictPort: true,
  },
})
