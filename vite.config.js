import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: [
        '**/supabase/**',
        '**/.supabase/**',
        '**/.npm-cache/**',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'zustand'],
          'animation-vendor': ['gsap', '@gsap/react', 'motion/react'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    maxWorkers: 2,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
