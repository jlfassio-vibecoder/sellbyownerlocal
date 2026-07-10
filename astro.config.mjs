// @ts-check
import { defineConfig } from 'astro/config';
import apphosting from '@apphosting/astro-adapter';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: 'server',

  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },

  adapter: apphosting({
    mode: 'standalone',
  }),

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['recharts', 'react-is'],
    },
  },

  integrations: [react()],
});
