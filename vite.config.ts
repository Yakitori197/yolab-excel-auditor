/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// `base: './'` keeps every asset reference relative, so the built site works
// from any GitHub Pages sub-path (e.g. /yolab-excel-auditor/) without a custom
// domain and without hard-coding the repository name.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    // Keep the bundle transparent and reviewable; no minified name mangling of
    // license banners for the parsing libraries.
    sourcemap: false,
  },
  test: {
    // Core analysis logic is pure and framework-free, so the lightweight Node
    // environment is enough and keeps the dependency surface small.
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
  },
});
