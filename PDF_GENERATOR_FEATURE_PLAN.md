# PDF Generator Feature Plan

## Server-Side Storefront PDF Catalog

**Goal:** Allow independent reps to download a deterministic, branded PDF catalog of their storefront via an Astro API route, with zero impact on the client bundle.

**Decision:** Path B1 — programmatic PDF generation with `@react-pdf/renderer` on the server only. Do not use browser `window.print()`, Puppeteer/Playwright, or client-side PDF libraries.

**Branch:** `feature/convert-to-book-format`

---

## Architecture

| Layer | Choice |
|-------|--------|
| **API Route** | `src/pages/api/storefront/[slug]/catalog.pdf.ts` |
| **Generator** | `@react-pdf/renderer` using `renderToStream` or `renderToBuffer`, running exclusively on the server |
| **Data Layer** | Firebase Admin SDK — reuse `resolveSellerByStorefrontParam` and `getActiveApparelForSeller` |
| **PDF Document** | `src/components/pdf/StorefrontCatalogPDF.tsx` (server-only; no client hooks) |
| **UI** | A lightweight "Download PDF Catalog" anchor (`<a>`) on the public storefront |

### Security boundary (non-negotiable)

- Firebase Admin stays in Astro frontmatter / API routes only.
- No `firebase-client` imports in the PDF route or PDF component.
- No client islands required for PDF generation — the CTA is a plain `<a href>`.
- Images are fetched/embedded during server render (or passed as public HTTPS URLs that `@react-pdf` resolves server-side). Do not rely on browser CORS or lazy-loaded storefront `<img>` tags.

### Out of scope (v1)

- Merging per-listing uploaded line sheets (`pdfLineSheetUrl`) into the catalog
- Brand/search filter query params on the PDF (export full active catalog)
- Client-side preview UI beyond opening the PDF in a new tab
- Print CSS / `@media print` on the live storefront

### Related existing code (reuse, do not reinvent)

| Concern | Location |
|---------|----------|
| Storefront page | `src/pages/marketplace/clothing/[storefrontSlug]/index.astro` |
| Seller resolution | `src/lib/buyer-profile.ts` → `resolveSellerByStorefrontParam` |
| Active listings | `src/lib/clothing-api.ts` → `getActiveApparelForSeller` |
| Listing shape | `src/schemas/index.ts` → `ClothingListingSchema` / inferred types |
| Storage URL helpers | `src/lib/storage-url.ts` (`toDirectStorageObjectUrl`) |
| Per-item PDF proxy (different product) | `src/pages/api/clothing/[id]/catalog.ts` |

---

## Phases

### Phase 1: Scaffolding & Dependencies

Install `@react-pdf/renderer` and create the API route shell.

### Phase 2: The PDF Document Component

Create a server-only React component (`StorefrontCatalogPDF.tsx`) using `@react-pdf/renderer` primitives (`Document`, `Page`, `View`, `Text`, `Image`).

### Phase 3: Data Wiring & Buffer Streaming

Wire the Astro API route to fetch Firestore data, pass it to the PDF component, and return a `Response` with `Content-Type: application/pdf`.

### Phase 4: Storefront UI Integration

Add the download CTA to the actual storefront page; verify with `astro check` and `npm run build`.

---

## Execution Plan

Feed these exactly as written to your Cursor agent in Normal/Chat Mode. **Do not run them all at once; do them sequentially and verify the output.**

---

### [Cursor Prompt for Agent: Execute Phase 1 & 2 - Setup & PDF Component]

We are implementing Path B1 for the PDF Catalog feature based on your audit.

Step 1: Install `@react-pdf/renderer`.
Step 2: Create a new file: `src/components/pdf/StorefrontCatalogPDF.tsx`.

This is a server-only component. Do not use any client hooks.

Import `Document`, `Page`, `Text`, `View`, `StyleSheet`, `Image` from `@react-pdf/renderer`.

Define a clean, professional `StyleSheet.create({...})` matching our brand vibe (clean lines, readable sans-serif typography).

Define the component props to accept: `storefrontName` (string), `tagline` (string), `heroImageUrl` (string), and `items` (array of our standard storefront item objects including title, brand, price, primary image, and sizes).

Build the layout:

- **Cover/Header:** Storefront name, tagline, and hero image.
- **Grid:** A flexible grid layout mapping over the items. Each item should show the primary image, title, brand, and price.

Ensure strict TypeScript typing for the props. Use our existing Zod schemas or types from our clothing domain where applicable. Let me know when this component is ready.

---

### [Cursor Prompt for Agent: Execute Phase 3 - The Astro API Route]

Now, let's create the Astro API route that generates and serves this PDF.

Step 1: Create `src/pages/api/storefront/[slug]/catalog.pdf.ts`.
Step 2: In this file, export a `GET` function (type `APIRoute`).
Step 3: Use our existing server-side Firebase Admin helpers (`resolveSellerByStorefrontParam` and `getActiveApparelForSeller` or similar) to fetch the storefront data based on the slug param.
Step 4: Import `renderToStream` (or `renderToBuffer`) from `@react-pdf/renderer` and our `StorefrontCatalogPDF` component.
Step 5: Render the component with the fetched data.
Step 6: Return a new `Response` containing the PDF stream/buffer.

Set headers: `'Content-Type': 'application/pdf'`

Set headers: `'Content-Disposition': 'inline; filename="catalog.pdf"'` (Use `inline` so it opens in a new tab, letting the user preview it before saving).

**Crucial:** Ensure NO client-side Firebase SDKs leak into this file. This must run entirely on the server using Admin privileges. Add proper error handling (try/catch returning 404 or 500 Responses).

---

### [Cursor Prompt for Agent: Execute Phase 4 - Storefront UI & Cleanup]

Finally, let's connect the UI and do a cruft check.

Step 1: Open the main storefront Astro page (`src/pages/marketplace/clothing/[storefrontSlug]/index.astro`).
Step 2: Add a clean, Tailwind-styled "Download Catalog (PDF)" link/button near the storefront header or FAB area.

It should be a standard `<a>` tag pointing to `/api/storefront/${storefrontSlug}/catalog.pdf`.

Add `target="_blank"` so it opens in a new tab.
Step 3: Run `npx astro check` and `npm run build` in your terminal to ensure there are no TypeScript errors, unused imports, or route collisions.
Step 4: Review the codebase for any dangling `console.log`s related to this feature and remove them.

Output the final status of the build command.

---

## Verification checklist (after all phases)

- [ ] `GET /api/storefront/{slug}/catalog.pdf` returns `200` + `application/pdf` for a live storefront
- [ ] Unknown slug returns `404`
- [ ] PDF opens inline in a new tab from the storefront CTA
- [ ] Cover shows storefront name / tagline / hero (when present)
- [ ] Active listings appear with primary image, title, brand, price
- [ ] Draft/archived items are excluded (active-only query)
- [ ] No `@react-pdf` or Admin imports in buyer client islands
- [ ] `npx astro check` and `npm run build` succeed

---

## Notes for implementers

1. Prefer mapping `galleryPhotos[0]` → primary image for each item; omit image cell gracefully when empty.
2. Prefer `storefrontName` with fallback to `displayName` (same as storefront page).
3. Filename may stay `catalog.pdf` for v1; branded filenames can follow later.
4. If `@react-pdf` fails to load some Firebase download URLs, normalize with `toDirectStorageObjectUrl` before passing to `<Image>` — keep that fix server-side.
5. Do not add print CSS to the interactive storefront as part of this plan.
