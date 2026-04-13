/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'editor-bg': '#1a1a1a',
        'editor-surface': '#222222',
        'editor-panel': '#2a2a2a',
        'editor-accent': '#00d1b2',
        'editor-text': '#e8e8e8',
        'editor-muted': '#888888',
        'editor-border': '#333333',
        'editor-track': '#1f1f1f',
        'editor-clip-video': '#00b8a9',
        'editor-clip-audio': '#f8b500',
        'editor-clip-text': '#6c5ce7',
        'editor-clip-overlay': '#e17055',
        'editor-playhead': '#00d1b2',
      },
    },
  },
  plugins: [],
};
