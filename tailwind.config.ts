import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 2026年トレンド：モダングレーベースの建築プロ仕様カラーパレット
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // アクセントカラー：建築図面に適した高彩度ブルー
        accent: {
          50: '#eff8ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // メインアクセント
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // セマンティックカラー
        surface: {
          DEFAULT: '#0f1113',  // キャンバス背景
          panel: '#18191b',    // パネル背景
          elevated: '#1f2023', // 浮上要素
          hover: '#2a2b2e',    // ホバー状態
        },
        border: {
          DEFAULT: '#2a2b2e',
          subtle: '#1a1b1e',
          accent: '#3b82f6',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          tertiary: '#94a3b8',
          muted: '#64748b',
        },
        // 機能別カラー
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        // レガシーカラー（下位互換）
        neonBlue: '#3b82f6',
        neonGreen: '#22c55e',
        wallBlue: '#3b82f6',
        auxGray: '#94a3b8'
      },
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono Variable',
          'JetBrains Mono',
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'monospace'
        ]
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
      },
      spacing: {
        '15': '3.75rem',
        '18': '4.5rem',
      },
      borderRadius: {
        'lg': '0.625rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'panel': '0 0 0 1px rgba(255, 255, 255, 0.05)',
        'panel-hover': '0 0 0 1px rgba(59, 130, 246, 0.3)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
      },
    },
  },
  plugins: [animate],
}

export default config
