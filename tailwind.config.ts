import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Open Runde', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        // Surfaces (full color values — no opacity modifier support needed)
        base:         'var(--bg-base)',
        panel:        'var(--bg-panel)',
        // Overlay — solid + explicit opacity levels
        overlay:      'var(--overlay)',
        'overlay-30': 'var(--overlay-30)',
        'overlay-50': 'var(--overlay-50)',
        'overlay-60': 'var(--overlay-60)',
        // Borders
        edge:           'var(--edge)',
        'edge-60':      'var(--edge-60)',
        'edge-accent':  'var(--edge-accent)',
        // Text
        t1:           'var(--text-1)',
        t2:           'var(--text-2)',
        t3:           'var(--text-3)',
        t4:           'var(--text-4)',
        // Accent (per project)
        accent:         'var(--accent-hex)',
        'accent-10':    'var(--accent-10)',
        'icon-accent':  'var(--icon-accent)',
      },
    },
  },
  plugins: [],
} satisfies Config
