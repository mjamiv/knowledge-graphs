import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress circular dependency warnings from three.js
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
    },
  },
  resolve: {
    dedupe: ['three'],
    alias: {
      // Redirect three/webgpu to our stub that provides WebGPURenderer fallback
      'three/webgpu': path.resolve(__dirname, 'src/stubs/three-webgpu.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
    include: ['three'],
  },
})
