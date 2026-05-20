import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary palette
        primary: {
          DEFAULT: '#1a73e8',
          dark: '#0d47a1',
          light: '#4285f4',
        },
        // Semantic colors
        success: {
          DEFAULT: '#00C853',
          dark: '#2e7d32',
        },
        danger: {
          DEFAULT: '#FF5252',
          dark: '#c62828',
        },
        warning: '#FFB300',
        neutral: '#9E9E9E',
        // Dark theme colors (GitHub-inspired)
        dark: {
          bg: '#0D1117',
          surface: '#161B22',
          card: '#21262D',
          border: '#30363D',
          text: '#E6EDF3',
          'text-secondary': '#8B949E',
        },
        // Light theme colors
        light: {
          bg: '#F6F8FA',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          border: '#D0D7DE',
          text: '#1F2328',
          'text-secondary': '#656D76',
        },
        // Chart colors
        chart: {
          line: '#4285f4',
          fill: 'rgba(66, 133, 244, 0.2)',
          green: '#00C853',
          red: '#FF5252',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
        '4xl': ['32px', { lineHeight: '40px' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
