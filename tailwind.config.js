/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind durchsucht diese Dateien nach genutzten Utility-Klassen.
  content: ['./index.html', './elektriker/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Markenfarben der Demo. Hier zentral anpassbar, falls der Betrieb
      // eigene Farben verwenden möchte. "brand" = warmer Holz-/Amber-Ton.
      colors: {
        brand: {
          50: '#fdf8f3',
          100: '#f8ecdd',
          200: '#efd5b8',
          300: '#e3b888',
          400: '#d59456',
          500: '#c97a35',
          600: '#b4632a',
          700: '#964c25',
          800: '#7a3f25',
          900: '#653621',
        },
      },
      fontFamily: {
        // Klare, seriöse Schrift. System-Stack -> kein zusätzlicher Download.
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
