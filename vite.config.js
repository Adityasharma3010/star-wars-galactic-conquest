import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], build:{rollupOptions:{output:{manualChunks:{'react-vendor':['react','react-dom','zustand'],'animation-vendor':['gsap','@gsap/react','motion/react'],'supabase-vendor':['@supabase/supabase-js']}}}}, test: { environment: 'jsdom', setupFiles: './tests/setup.js', include: ['tests/**/*.test.{js,jsx}'] } });
