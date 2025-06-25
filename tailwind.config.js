/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0fc6c6',
          light: '#3dd9d9',
          dark: '#0aa3a3',
          50: '#e6fafa',
          100: '#ccf5f5',
          200: '#99ebeb',
          300: '#66e0e0',
          400: '#33d6d6',
          500: '#0fc6c6',
          600: '#0ca3a3',
          700: '#097f7f',
          800: '#065c5c',
          900: '#033838',
        },
        secondary: {
          DEFAULT: '#272d41',
          light: '#3a4158',
          dark: '#1a1f2e',
          50: '#e8e9ec',
          100: '#d1d3d9',
          200: '#a3a7b3',
          300: '#757b8d',
          400: '#474f67',
          500: '#272d41',
          600: '#1f2434',
          700: '#171b27',
          800: '#0f121a',
          900: '#07090d',
        },
        tertiary: '#ffffff',
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(39, 45, 65, 0.1)',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'glass-shine': 'glass-shine 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'glass-shine': {
          '0%, 100%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(15, 198, 198, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(15, 198, 198, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}