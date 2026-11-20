import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Old Android browsers (Vivo/Oppo/Samsung builds on Chromium 61-79) choke on
    // ?. and ?? syntax, so compile down to what Chrome 61 / Safari 12 understand.
    target: ['es2017', 'chrome61', 'safari12'],
    cssTarget: ['chrome61', 'safari12']
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
