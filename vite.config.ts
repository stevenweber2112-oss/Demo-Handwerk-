import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Zwei eigenständige Seiten im selben Projekt (Multi-Page-Build).
      // Pfade sind relativ zum Projekt-Stammverzeichnis:
      //   index.html            -> Tischler-Demo   (/)
      //   elektriker/index.html -> Elektriker-Demo (/elektriker/)
      input: {
        main: 'index.html',
        elektriker: 'elektriker/index.html',
      },
    },
  },
})
