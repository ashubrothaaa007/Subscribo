import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/web': {
        target: 'http://127.0.0.1:8099',
        changeOrigin: true,
      },
      '/subscribo': {
        target: 'http://127.0.0.1:8099',
        changeOrigin: true,
      },
    },
  },
})
