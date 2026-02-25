/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-beaufort)', 'serif'],
        body: ['var(--font-spiegel)', 'sans-serif'],
      },
      colors: {
        gold: {
          100: '#f0e6d3',
          200: '#c89b3c',
          300: '#c8aa6e',
          400: '#a57c2e',
          500: '#785a28',
          600: '#4a3810',
        },
        lol: {
          dark: '#010a13',
          darker: '#0a1628',
          panel: '#0d1b2a',
          border: '#1e2d40',
          blue: '#0bc4e3',
          accent: '#c89b3c',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(200, 155, 60, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(200, 155, 60, 0.7)' },
        },
      },
    },
  },
  plugins: [],
}
