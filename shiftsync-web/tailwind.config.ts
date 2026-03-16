import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e'
        },
        premium: '#f59e0b',
        overtime: '#ef4444',
        warning: '#f97316',
        success: '#22c55e'
      }
    }
  },
  plugins: []
};

export default config;

