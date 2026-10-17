import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // With the Supabase env vars configured, the SDK adds ~215 kB (≈55 kB gzip)
    // to the main chunk. It is one vendor library, so a slightly higher warning
    // threshold is clearer than a noisy build.
    chunkSizeWarningLimit: 600,
  },
})
