/** @type {import('tailwindcss').Config} */
// Nodo 3D: oscuro y técnico, como un plano o un visor CAD.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#0A0D12',
        panel: '#10151C',
        panel2: '#151B24',
        linea: '#222B37',
        texto: '#E7ECF2',
        tenue: '#8A97A6',
        acento: '#4DA3FF',
        nodo: '#FF7A1A',
        ok: '#3DD68C',
        aviso: '#F5B83D',
        mal: '#FF5D5D',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
