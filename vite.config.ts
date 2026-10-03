import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Deployed to GitHub Pages under https://<user>.github.io/workout-tracker/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/workout-tracker/',
})
