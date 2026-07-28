import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // escuchar en IPv4 e IPv6 (localhost, 127.0.0.1 y red local)
    port: 5173,
  },
})
