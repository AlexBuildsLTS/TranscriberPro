/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',

  // PROTCOL: Only scan source logic. Prevents interop from choking on node_modules.
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        background: '#020205',
        void: '#000002',
        surface: 'rgba(255, 255, 255, 0.03)',
        card: 'rgba(255, 255, 255, 0.05)',
        cardHover: 'rgba(255, 255, 255, 0.08)',
        cardBorder: 'rgba(255, 255, 255, 0.10)',
        cardBorderHover: 'rgba(255, 255, 255, 0.18)',
        overlay: 'rgba(2, 2, 5, 0.85)',
        neon: {
          cyan: '#00F0FF',
          pink: '#FF007F',
          purple: '#8A2BE2',
          orange: '#FF4500',
          lime: '#32FF00',
          white: '#E0F7FF',
        },
        'neon-cyan': '#00F0FF',
        'neon-purple': '#8A2BE2',
        'neon-pink': '#FF007F',
        'neon-lime': '#32FF00',
        'neon-orange': '#FF4500',
        glow: {
          cyan: 'rgba(0, 240, 255, 0.12)',
          pink: 'rgba(255, 0, 127, 0.12)',
          purple: 'rgba(138, 43, 226, 0.12)',
          orange: 'rgba(255, 69, 0, 0.12)',
          lime: 'rgba(50, 255, 0, 0.12)',
        },
        border: {
          cyan: 'rgba(0, 240, 255, 0.35)',
          pink: 'rgba(255, 0, 127, 0.35)',
          purple: 'rgba(138, 43, 226, 0.35)',
          subtle: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.18)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          muted: '#71717A',
          disabled: '#3F3F46',
          inverse: '#020205',
          cyan: '#00F0FF',
          pink: '#FF007F',
          purple: '#C084FC',
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#00F0FF',
          successMuted: 'rgba(34, 197, 94, 0.12)',
          warningMuted: 'rgba(245, 158, 11, 0.12)',
          errorMuted: 'rgba(239, 68, 68, 0.12)',
          infoMuted: 'rgba(0, 240, 255, 0.12)',
        },
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.05em' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.01em' }],
        '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
        '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.03em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0em',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.25em',
        'ultra-wide': '0.5em',
      },
      spacing: {
        4.5: '18px',
        13: '52px',
        15: '60px',
        18: '72px',
        22: '88px',
        26: '104px',
        30: '120px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      blur: {
        '2xs': '2px',
        xs: '4px',
        '3xl': '64px',
        '4xl': '100px',
        '5xl': '150px',
      },
      opacity: {
        2: '0.02',
        3: '0.03',
        7: '0.07',
        12: '0.12',
        15: '0.15',
        35: '0.35',
        85: '0.85',
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-xslow': 'pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        breathe: 'breathe 8s ease-in-out infinite',
        'glow-cyan': 'glow-cyan 3s ease-in-out infinite',
        'glow-pink': 'glow-pink 3s ease-in-out infinite',
        'glow-purple': 'glow-purple 4s ease-in-out infinite',
        'neural-flow': 'neural-flow 10s linear infinite',
        'neural-drift': 'neural-drift 18s ease-in-out infinite alternate',
        'orb-float': 'orb-float 12s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.35s ease-out forwards',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.04', transform: 'scale(1)' },
          '50%': { opacity: '0.10', transform: 'scale(1.25)' },
        },
        'glow-cyan': {
          '0%, 100%': { opacity: '0.6', textShadow: '0 0 8px #00F0FF' },
          '50%': {
            opacity: '1',
            textShadow: '0 0 24px #00F0FF, 0 0 48px #00F0FF',
          },
        },
        'glow-pink': {
          '0%, 100%': { opacity: '0.6', textShadow: '0 0 8px #FF007F' },
          '50%': {
            opacity: '1',
            textShadow: '0 0 24px #FF007F, 0 0 48px #FF007F',
          },
        },
        'orb-float': {
          '0%, 100%': {
            transform: 'translateY(0px) scale(1)',
            opacity: '0.06',
          },
          '25%': {
            transform: 'translateY(-18px) scale(1.08)',
            opacity: '0.10',
          },
          '75%': { transform: 'translateY(12px) scale(0.94)', opacity: '0.04' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],

  // ─── THE WEAPON: DISABLE BROKEN ASPECT RATIO PARSER ───
  corePlugins: {
    aspectRatio: false,
  },
};
