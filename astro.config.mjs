// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

/** Astro `site` must be an absolute URL; empty Vercel env vars become "" and fail the build. */
function resolveSite() {
  const configured = process.env.PUBLIC_SITE_URL?.trim();
  if (configured && URL.canParse(configured)) {
    return configured;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const withProtocol = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    if (URL.canParse(withProtocol)) {
      return withProtocol;
    }
  }
  return undefined;
}

// https://astro.build/config
export default defineConfig({
  site: resolveSite(),
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
