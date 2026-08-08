import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // VS Code theme tokens mapped to CSS variables
        vscode: {
          bg: 'var(--vscode-editor-background)',
          fg: 'var(--vscode-editor-foreground)',
          border: 'var(--vscode-panel-border)',
          input: 'var(--vscode-input-background)',
          'input-fg': 'var(--vscode-input-foreground)',
          button: 'var(--vscode-button-background)',
          'button-fg': 'var(--vscode-button-foreground)',
          accent: 'var(--vscode-focusBorder)',
          sidebar: 'var(--vscode-sideBar-background)',
          'sidebar-fg': 'var(--vscode-sideBar-foreground)',
        },
        omni: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#06b6d4',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          dark: '#0f0f23',
          glass: 'rgba(99,102,241,0.1)',
        },
      },
      fontFamily: {
        sans: ['var(--vscode-font-family)', 'system-ui', 'sans-serif'],
        mono: ['var(--vscode-editor-font-family)', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        typing: 'typing 1.5s steps(3) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        typing: {
          '0%, 100%': { content: '.' },
          '33%': { content: '..' },
          '66%': { content: '...' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
