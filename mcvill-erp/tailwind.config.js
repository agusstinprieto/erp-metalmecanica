/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        control: {
          dark: '#020617', // slate-950
          deep: '#0F172A', // slate-900
          accent: '#FF4F00', // Control Orange (Legacy Forge)
          cyber: '#00D1FF', // Cyber Blue
          steel: '#475569', // slate-600
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
      },
      boxShadow: {
        'control-glow': '0 0 15px rgba(255, 79, 0, 0.3)',
        'cyber-glow': '0 0 15px rgba(0, 209, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
