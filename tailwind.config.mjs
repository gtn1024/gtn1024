/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            a: {
              color: theme('colors.accent.600'),
              '&:hover': {
                color: theme('colors.accent.800'),
              },
              textDecoration: 'none',
              fontWeight: 500,
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            code: {
              fontWeight: 400,
              backgroundColor: theme('colors.stone.100'),
              padding: '0.15em 0.4em',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            },
            blockquote: {
              borderLeftColor: theme('colors.accent.400'),
            },
          },
        },
        invert: {
          css: {
            a: {
              color: theme('colors.accent.400'),
              '&:hover': {
                color: theme('colors.accent.300'),
              },
            },
            code: {
              backgroundColor: theme('colors.stone.800'),
            },
            blockquote: {
              borderLeftColor: theme('colors.accent.500'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
