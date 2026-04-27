import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE ?? '/phone-mask/',
  plugins: [vue()],
  build: {
    outDir: 'dist-pages',
    emptyOutDir: true,
  },
});
