import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── shadcn tokens ──
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        // ── subject palette ──
        subject: {
          math:          '#3B82F6',
          'math-dark':   '#1D4ED8',
          science:       '#10B981',
          'science-dark':'#047857',
          english:       '#F59E0B',
          'english-dark':'#B45309',
          nepali:        '#F43F5E',
          'nepali-dark': '#BE123C',
          social:        '#EA580C',
          'social-dark': '#9A3412',
          computer:      '#6366F1',
          'computer-dark':'#4338CA',
          optmath:       '#8B5CF6',
          'optmath-dark':'#6D28D9',
          hpe:           '#14B8A6',
          'hpe-dark':    '#0F766E',
        },
        // ── quiz mode accents ──
        mode: {
          scholar:   '#3B82F6',
          storm:     '#F97316',
          sovereign: '#EAB308',
        },
      },

      fontFamily: {
        heading: ['var(--font-space-grotesk)', 'sans-serif'],
        body:    ['var(--font-plus-jakarta)',   'sans-serif'],
        nepali:  ['var(--font-noto-devanagari)','sans-serif'],
        mono:    ['var(--font-jetbrains-mono)', 'monospace'],
        sans:    ['var(--font-plus-jakarta)',   'sans-serif'],
      },

      borderRadius: {
        sm:  'calc(var(--radius) - 4px)',
        md:  'calc(var(--radius) - 2px)',
        lg:  'var(--radius)',
        xl:  'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 16px)',
      },

      keyframes: {
        // shadcn
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        // PadhaiSathi custom
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-left': {
          '0%':   { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'streak-flame': {
          '0%, 100%': { transform: 'scaleY(1) scaleX(1)' },
          '25%':  { transform: 'scaleY(1.1) scaleX(0.95)' },
          '75%':  { transform: 'scaleY(0.95) scaleX(1.05)' },
        },
        'progress-fill': {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        pop: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%':   { boxShadow: '0 0 0 0 rgba(99,102,241,0.4)' },
          '100%': { boxShadow: '0 0 0 12px rgba(99,102,241,0)' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        shimmer:          'shimmer 1.8s ease-in-out infinite',
        'fade-in':        'fade-in 0.3s ease-out',
        'fade-in-up':     'fade-in-up 0.4s ease-out',
        'scale-in':       'scale-in 0.25s ease-out',
        'slide-right':    'slide-right 0.3s ease-out',
        'slide-left':     'slide-left 0.3s ease-out',
        'bounce-soft':    'bounce-soft 2.5s ease-in-out infinite',
        float:            'float 4s ease-in-out infinite',
        'spin-slow':      'spin-slow 8s linear infinite',
        'streak-flame':   'streak-flame 0.8s ease-in-out infinite',
        'progress-fill':  'progress-fill 1s ease-out forwards',
        pop:              'pop 0.2s ease-out',
        'pulse-ring':     'pulse-ring 1.5s ease-out infinite',
      },

      boxShadow: {
        glass:          '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-hover':  '0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
        'subject-card': '0 2px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06)',
        'subject-hover':'0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
        'glow-math':    '0 0 24px rgba(59,130,246,0.4)',
        'glow-science': '0 0 24px rgba(16,185,129,0.4)',
        'glow-english': '0 0 24px rgba(245,158,11,0.4)',
        'glow-nepali':  '0 0 24px rgba(244,63,94,0.4)',
        'glow-social':  '0 0 24px rgba(234,88,12,0.4)',
        'glow-computer':'0 0 24px rgba(99,102,241,0.4)',
        'glow-optmath': '0 0 24px rgba(139,92,246,0.4)',
        'glow-hpe':     '0 0 24px rgba(20,184,166,0.4)',
      },

      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
      },

      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse at 60% 0%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 80%, rgba(20,184,166,0.12) 0%, transparent 60%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config