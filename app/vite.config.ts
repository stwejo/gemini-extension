import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// `VITE_BASE` permet de deployer dans un sous-chemin (GitHub Pages).
// Exemple : VITE_BASE=/mon-repo/ npm run build
const base = process.env.VITE_BASE ?? '/';
// Le service worker peut etre desactive pour une simple previsualisation.
const withPwa = process.env.VITE_PWA !== 'false';

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    ...(withPwa ? [VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Nederlands - apprendre le neerlandais',
        short_name: 'Nederlands',
        description:
          "Apprendre le neerlandais du niveau A0 au niveau B1 : ecoute, repetition orale, vocabulaire et grammaire. Interface en francais.",
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#174eac',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
      },
    })] : []),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
