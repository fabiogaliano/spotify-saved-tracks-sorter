/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        '2xl': '1536px',  // Default Tailwind 2xl breakpoint
        '3xl': '1920px',  // Custom breakpoint for larger screens
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        }
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out forwards'
      }
    }
  },
  plugins: [],
} 