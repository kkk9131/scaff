import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neonBlue: '#30A0FF',
        neonGreen: '#39FF88',
        wallBlue: '#35a2ff',
        auxGray: '#9aa0a6'
      }
    },
  },
  plugins: [],
}

export default config
