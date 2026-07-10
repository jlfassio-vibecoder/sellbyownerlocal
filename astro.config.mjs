// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
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

  adapter: vercel(),

  env: {
    schema: {
      FIREBASE_SERVICE_ACCOUNT_JSON: envField.string({ context: 'server', access: 'secret' }),
      FIREBASE_PROJECT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      FIRESTORE_DATABASE_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      FIREBASE_STORAGE_BUCKET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['recharts', 'react-is'],
    },
  },

  integrations: [react()],
});
