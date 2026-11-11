/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Voor GitHub Pages: BASE=/repo-naam/ bij de build.
const base = process.env.BASE ?? './';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Studieplanner',
        short_name: 'Planner',
        description: 'Week- en studieplanner',
        lang: 'nl-BE',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f6f5f0',
        theme_color: '#2f5d50',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: 'index.html' },
    }),
  ],
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
