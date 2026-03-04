import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/app-react/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
      '/app/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
  },
})
