/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Deep CampusQuest blue — the anchor of the brand
        brand: {
          50: '#eef4fb',
          100: '#d6e4f6',
          200: '#b0c9ed',
          300: '#7fa6e0',
          400: '#4a7fce',
          500: '#2a5fbf',
          600: '#1c4a9e',
          700: '#152f6b',
          800: '#0f2050',
          900: '#0a1638',
          950: '#060e26',
        },
        // Off-white / cool neutral surfaces
        cream: {
          50: '#fbfcfd',
          100: '#f5f7fa',
          200: '#eaeef4',
          300: '#d8dee8',
          400: '#b9c2d1',
        },
        // Gold accent — used sparingly for premium feel
        gold: {
          400: '#e8c468',
          500: '#d4af37',
          600: '#b8932a',
        },
        // Near-black navy for text
        ink: '#0a1638',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(10, 22, 56, 0.06), 0 8px 24px rgba(10, 22, 56, 0.05)',
        lift: '0 4px 12px rgba(10, 22, 56, 0.08), 0 24px 48px rgba(10, 22, 56, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
