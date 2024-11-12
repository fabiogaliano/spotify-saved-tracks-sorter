/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        '2xl': '1536px',  // Default Tailwind 2xl breakpoint
        '3xl': '1920px',  // Custom breakpoint for larger screens
      }
    }
  },
  plugins: [],
} 