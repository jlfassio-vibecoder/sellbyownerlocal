# Storefront Architecture Blueprint

> **Status:** Draft — planning only. No code changes from this document yet.  
> **Goal:** Transition apparel from flat URLs (`/marketplace/clothing/[id]`) to a Storefront model (`/marketplace/clothing/[storefrontSlug]/[id]`), including a seller landing page at `/marketplace/clothing/[storefrontSlug]`.  
> **Stack note:** Persistence is **Firebase/Firestore** (Zod schemas in `src/schemas/index.ts`). There is no Supabase schema for apparel. Vehicle hybrid slugs in `src/utils/url-helpers.ts` are the closest existing pattern to mirror.

---

## Current State (baseline)

| Concern | Today |
|--------|--------|
| Listing URL | `/marketplace/clothing/{firestoreDocId}` |
| Listing page | `src/pages/marketplace/clothing/[id].astro` |
| Browse index | `src/pages/marketplace/clothing/index.astro` |
| Seller profile fields | `displayName`, `stats`, `verificationTier`, optional `phone` / `kyc` — **no slug** |
| Listing → seller link | `sellerId` (Firebase Auth UID) on `clothing_listings`; no public storefront |
| Link builders | `ClothingCard.tsx`, `FilterableApparelGrid.tsx` (href + copy-link) |
| SEO | `buildClothingSeoTitle` / `buildClothingSeoDescription` / `resolveClothingOgImage` in `src/lib/seo.ts` |
| 404s | Inline `new Response(..., { status: 404 })` on missing/inactive listings |

**Target URL map**

| Route | Purpose |
|-------|---------|
| `/marketplace/clothing` | Global apparel browse (unchanged) |
| `/marketplace/clothing/[storefrontSlug]` | Seller storefront landing |
| `/marketplace/clothing/[storefrontSlug]/[id]` | Listing detail under that storefront |
| `/marketplace/clothing/[id]` (legacy) | Temporary 301 → storefront URL (Phase 4) |

---

## Phase 1: Data Layer & Seller Schema

### 1.1 Add `storefrontSlug` to the user profile

Extend the Firestore `users/{uid}` document and Zod contracts so every apparel seller can own a URL-safe, unique storefront identifier.

**Schema rules (proposed)**

| Rule | Detail |
|------|--------|
| Format | Lowercase alphanumeric + hyphens only: `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| Length | 3–48 characters |
| Reserved | Block system paths / brand terms: `new`, `index`, `api`, `admin`, `clothing`, `seller`, `account`, `login`, etc. |
| Uniqueness | Globally unique across `users` (enforced at write time) |
| Optional | Field is optional on the document; absence triggers fallback (below) |

**Suggested fields on `UserSchema`**

```ts
storefrontSlug: z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .min(3)
  .max(48)
  .optional(),
storefrontSlugUpdatedAt: z.coerce.date().optional(), // for lock / cooldown policy
previousStorefrontSlugs: z.array(z.string()).optional(), // for redirects (Phase 4)
```

Also extend:

- `PublicUserResponseSchema` — expose `storefrontSlug` (and `id`) to public consumers
- `UserProfileUpdateSchema` — allow claiming/updating `storefrontSlug` with the same validation

### 1.2 Fallback logic (no slug yet)

Until a seller claims a slug, public URLs must still resolve.

| Situation | Behavior |
|-----------|----------|
| Seller has `storefrontSlug` | Use it in all public apparel paths |
| Seller has no slug | Fall back to **`sellerId`** (Firebase UID) as the path segment |
| Listing link generation | Always resolve via helper: `getClothingListingPath(listing, sellerSlugOrId)` |
| Storefront landing | `/marketplace/clothing/{sellerId}` works if no custom slug; prefer redirecting to claimed slug once set (Phase 4) |

**Canonical helper (new)** — add to `src/utils/url-helpers.ts` (alongside vehicle helpers):

```ts
slugifyStorefrontPart(value: string): string
isValidStorefrontSlug(value: string): boolean
resolveStorefrontSegment(seller: { storefrontSlug?: string; id: string }): string
getClothingListingPath(listingId: string, storefrontSegment: string): string
getStorefrontPath(storefrontSegment: string): string
```

Fallback formula:

```ts
resolveStorefrontSegment(seller) === seller.storefrontSlug ?? seller.id
```

### 1.3 Uniqueness & write path

Firestore has no native unique constraints. Enforce uniqueness with a dedicated lookup collection:

| Collection | Doc ID | Fields |
|------------|--------|--------|
| `storefront_slugs` | `{storefrontSlug}` | `sellerId`, `createdAt`, `updatedAt` |

**Claim / update transaction (Admin SDK)**

1. Validate format + reserved list.
2. In a transaction: if `storefront_slugs/{slug}` exists and `sellerId !== caller` → conflict (409).
3. Write/update `users/{uid}.storefrontSlug`.
4. Create `storefront_slugs/{slug}`; if renaming, delete old slug doc (or keep for redirects — see Phase 4).
5. Optionally append old slug to `previousStorefrontSlugs`.

**Lookup helpers (new in data layer)**

| Function | Purpose |
|----------|---------|
| `getSellerByStorefrontSlug(slug)` | Resolve slug → user profile (via `storefront_slugs` then `users`) |
| `getStorefrontSegmentForSeller(sellerId)` | Read user; return slug or UID fallback |
| `claimOrUpdateStorefrontSlug(uid, slug)` | Transactional claim/rename |
| `isStorefrontSlugAvailable(slug)` | Pre-check for UI |

### 1.4 Seller UI: claim / edit slug

**Primary surface:** extend account profile editor (already edits `displayName` via `PATCH /api/users/{id}`).

**Secondary surface (recommended):** apparel seller shell — sellers already see a UID badge; surface the public storefront URL and a “Claim storefront URL” control next to it.

**UI requirements**

- Input with live slugify preview (`My Brand` → `my-brand`)
- Availability check (debounced) before save
- Show full public URL: `{origin}/marketplace/clothing/{slug}`
- Copy-link control for the storefront URL
- Clear error states: taken, reserved, invalid format
- If rename policy locks after first claim (Phase 4), disable input and explain

### 1.5 Files touched — Phase 1

| File | Change |
|------|--------|
| `src/schemas/index.ts` | Add `storefrontSlug` (+ related fields) to `UserSchema`, `PublicUserResponseSchema`, `UserProfileUpdateSchema` |
| `src/lib/buyer-profile.ts` | Read/write slug; uniqueness transaction helpers |
| `src/utils/url-helpers.ts` | Storefront slugify, resolve, path builders |
| `src/pages/api/users/[id].ts` | Accept slug on PATCH; return slug on GET; 409 on conflict |
| `src/islands/buyer/ProfileEditor.tsx` | Slug claim/edit field + availability UX |
| `src/pages/account/index.astro` | Pass current slug into `ProfileEditor` |
| `src/islands/seller/ApparelSellerLayout.tsx` | Show storefront URL / claim CTA beside UID badge |
| `src/lib/clothing-api.ts` | Optional: `getActiveApparelForSeller(sellerId)` public variant (status == active only) — used heavily in Phase 3 |
| `firestore.indexes.json` | Only if a query-by-slug on `users` is preferred over the lookup collection (lookup collection is recommended; index may be unnecessary) |
| `scripts/seed-clothing.ts` | Seed a demo `storefrontSlug` for local testing |

---

## Phase 2: Routing Refactor & Link Updates

### 2.1 Move the listing detail route

| From | To |
|------|----|
| `src/pages/marketplace/clothing/[id].astro` | `src/pages/marketplace/clothing/[storefrontSlug]/[id].astro` |

**Page responsibilities (updated)**

1. Read `Astro.params.storefrontSlug` and `Astro.params.id`.
2. Load listing via `getClothingListingById(id)`.
3. Resolve listing owner’s canonical storefront segment (`storefrontSlug ?? sellerId`).
4. If param slug ≠ canonical segment → **301** to canonical path (Phase 4 details).
5. If listing missing / inactive → 404.
6. Update `canonicalUrl`, login `next` param, and “Back” links to use storefront paths.
7. Optionally fetch seller public profile for breadcrumb / “View storefront” link.

### 2.2 Keep the global browse index

`src/pages/marketplace/clothing/index.astro` stays at `/marketplace/clothing`. Cards must emit nested listing URLs (requires seller segment on each card).

**Data implication:** `getClothingInventory()` returns listings with `sellerId` only. Options:

1. **Batch-resolve** seller segments for unique `sellerId`s after inventory fetch (preferred for SSR).
2. **Denormalize** `storefrontSlug` onto `clothing_listings` at write time (faster reads; must stay in sync on rename).

**Recommendation:** start with batch-resolve in Phase 2; consider denormalization later if inventory grows large.

### 2.3 Centralize path building

All hrefs and clipboard URLs must go through helpers — no raw string templates.

```ts
getClothingListingPath(listingId, storefrontSegment)
// → /marketplace/clothing/{storefrontSegment}/{listingId}

getStorefrontPath(storefrontSegment)
// → /marketplace/clothing/{storefrontSegment}
```

### 2.4 Component / link map

| Location | Current | Required update |
|----------|---------|-----------------|
| `src/components/buyer/ClothingCard.tsx` | `` `/marketplace/clothing/${listing.id}` `` | Accept `storefrontSegment` (or resolve from props); use `getClothingListingPath` |
| `src/islands/shared/FilterableApparelGrid.tsx` | Public href + copy-link use flat ID | Public href + clipboard → nested path; seller view edit links stay `/seller/apparel/{id}` |
| `src/islands/buyer/ClothingInventoryGrid.tsx` | Passes listings into `ClothingCard` | Pass storefront segment map or enriched listings |
| `src/pages/marketplace/clothing/[storefrontSlug]/[id].astro` | N/A (new path) | Canonical URL, back link, login `next` |
| `src/pages/marketplace/clothing/index.astro` | Feeds grid | Enrich listings with seller segments before render |
| `src/islands/seller/ApparelSellerLayout.tsx` | “View Marketplace” → `/marketplace/clothing` | Keep browse link; add “View my storefront” → `/marketplace/clothing/{segment}` |
| `scripts/seed-clothing.ts` | Logs flat URL | Log nested URL |

**Out of scope for href updates (IDs only, not page URLs):**

- `src/lib/use-save-favorite.ts` — `/api/clothing/{id}/save`
- `src/pages/api/clothing/[id]/catalog.ts`
- `src/pages/api/clothing-inquiries.ts`
- Seller CRUD under `/seller/apparel/*` and `/api/seller/apparel/*`

### 2.5 Seller dashboard copy-link

In seller view, “Copy Link” currently builds:

```ts
`${origin}/marketplace/clothing/${id}`
```

Update to nested public URL using the logged-in seller’s storefront segment (available from session/profile on the apparel seller pages).

### 2.6 Files touched — Phase 2

| File | Change |
|------|--------|
| `src/pages/marketplace/clothing/[id].astro` | **Delete** after move (or leave as thin legacy redirect shim — see Phase 4) |
| `src/pages/marketplace/clothing/[storefrontSlug]/[id].astro` | **Create** — moved detail page with slug validation |
| `src/utils/url-helpers.ts` | Path helpers (if not fully done in Phase 1) |
| `src/components/buyer/ClothingCard.tsx` | Nested listing `href` |
| `src/islands/shared/FilterableApparelGrid.tsx` | Public href + copy-link |
| `src/islands/buyer/ClothingInventoryGrid.tsx` | Plumb storefront segments into cards |
| `src/pages/marketplace/clothing/index.astro` | Batch-resolve seller segments for inventory |
| `src/lib/clothing-api.ts` and/or `src/lib/buyer-profile.ts` | `resolveStorefrontSegmentsForSellerIds(ids: string[])` |
| `src/islands/seller/ApparelSellerLayout.tsx` | Storefront nav link |
| `src/pages/seller/apparel/index.astro` | Pass seller segment into catalog/grid for copy-link |
| `src/islands/seller/ApparelCatalogSection.tsx` | Forward segment into `FilterableApparelGrid` |
| `scripts/seed-clothing.ts` | Nested URL in console output |

---

## Phase 3: The Storefront Landing Page

### 3.1 New route

**Create:** `src/pages/marketplace/clothing/[storefrontSlug]/index.astro`  
**URL:** `/marketplace/clothing/{storefrontSlug}`

Astro serves `index.astro` inside `[storefrontSlug]/` for the storefront root, while `[id].astro` handles listing detail. Ensure listing IDs cannot collide with reserved child segments (Firestore IDs are opaque; reserved words are only a concern for the slug itself).

### 3.2 Page composition (one job)

1. Resolve seller from `storefrontSlug` (custom slug **or** UID fallback).
2. 404 if no matching seller.
3. Load that seller’s **active** apparel inventory.
4. Render: brand/display name as hero signal, short supporting line, inventory grid, CTA back to global marketplace.
5. SEO/OG for the storefront (Phase 4).

Avoid stuffing stats, schedules, or secondary promos into the first viewport; keep the storefront as a single composition: seller identity + inventory.

### 3.3 Database queries

| Step | Query | Source |
|------|-------|--------|
| 1. Resolve slug | `storefront_slugs/{slug}` → `sellerId`, **or** if slug looks like a UID and no lookup hit, treat as `sellerId` fallback | New helper |
| 2. Load profile | `users/{sellerId}` → `displayName`, `storefrontSlug`, verification | `getUserProfile` / public projection |
| 3. Load inventory | `clothing_listings` where `sellerId == sellerId` and `status == 'active'`, order by `createdAt` desc | New public helper or filtered `getApparelCatalogForSeller` |
| 4. Canonical check | If URL used UID but seller has a claimed slug → 301 to `/marketplace/clothing/{storefrontSlug}` | Phase 4 |

**Reuse / extend**

- Existing seller catalog query: `getApparelCatalogForSeller(sellerId)` in `src/lib/clothing-api.ts` (returns all statuses). Prefer a public variant:

```ts
getActiveApparelForSeller(sellerId: string): Promise<ClothingListing[]>
```

- Existing composite index already supports `sellerId` + `createdAt` (`firestore.indexes.json`).

### 3.4 UI building blocks

| Piece | Approach |
|-------|----------|
| Inventory grid | Reuse `ClothingInventoryGrid` / `ClothingCard` with storefront segment known from the route |
| Empty state | “This storefront has no active listings” + link to `/marketplace/clothing` |
| Seller chrome | Display name as primary brand signal; optional verification badge from `verificationTier` |
| Listing cards | `href` = `/marketplace/clothing/{storefrontSlug}/{id}` |

### 3.5 Cross-links from listing detail

On `[storefrontSlug]/[id].astro`, add a clear link back to the storefront (`View all from {displayName}`) in addition to “Back to Clothing” (global browse).

### 3.6 Files touched — Phase 3

| File | Change |
|------|--------|
| `src/pages/marketplace/clothing/[storefrontSlug]/index.astro` | **Create** storefront landing page |
| `src/lib/clothing-api.ts` | `getActiveApparelForSeller` |
| `src/lib/buyer-profile.ts` | `getSellerByStorefrontSlug` / UID fallback resolution |
| `src/lib/seo.ts` | `buildStorefrontSeoTitle`, `buildStorefrontSeoDescription`, optional OG image helper |
| `src/components/buyer/ClothingCard.tsx` | Already updated in Phase 2; verify storefront context |
| `src/islands/buyer/ClothingInventoryGrid.tsx` | Accept optional storefront-scoped props if needed |
| `src/pages/marketplace/clothing/[storefrontSlug]/[id].astro` | Link to parent storefront |
| `src/layouts/Layout.astro` | Only if new OG props are required (likely reuse existing) |

---

## Phase 4: Edge Cases & SEO

### 4.1 404 behavior

| Case | Response |
|------|----------|
| Unknown `storefrontSlug` (not in `storefront_slugs`, not a valid user UID) | **404** — prefer rendering `src/pages/404.astro` patterns or `Astro.rewrite('/404')` / status 404 with shared Layout, instead of bare `Response` text |
| Valid storefront, but listing `id` missing or not `active` | **404** |
| Listing exists but `listing.sellerId` ≠ resolved storefront owner | **404** (do not leak cross-seller IDs under the wrong storefront) |
| Seller exists via UID fallback but has zero active listings | **200** on storefront index with empty state (not 404) |

### 4.2 Slug changes: redirects vs locking

**Recommended policy (production-safe default)**

1. **First claim:** free, immediate.
2. **Renames:** allowed with cooldown (e.g. once per 30 days) **or** locked after first claim for v1 simplicity.
3. **Always keep redirects** for previous slugs for a retention window (e.g. 90 days) or indefinitely for v1.

| Event | Behavior |
|-------|----------|
| Seller claims slug `acme-apparel` | Write `storefront_slugs/acme-apparel`; public URLs use it |
| Seller renames to `acme` | Update user doc; create `storefront_slugs/acme`; keep `storefront_slugs/acme-apparel` pointing at same `sellerId` with `redirectTo: 'acme'` **or** rely on `previousStorefrontSlugs` + lookup |
| Request hits old slug | **301** → `/marketplace/clothing/acme` or `/marketplace/clothing/acme/{id}` |
| Request hits UID while claimed slug exists | **301** → claimed slug path |
| Listing under wrong slug | **301** to canonical storefront + id, or 404 if ownership mismatch |

**Legacy flat URLs**

Keep a temporary shim at `src/pages/marketplace/clothing/[id].astro`:

1. Load listing by `id`.
2. Resolve owner storefront segment.
3. **301** → `/marketplace/clothing/{segment}/{id}`.
4. If listing not found → 404.

Remove the shim only after analytics show negligible legacy traffic.

### 4.3 Open Graph & canonical metadata

**Listing detail** (`[storefrontSlug]/[id].astro`)

| Meta | Update |
|------|--------|
| `canonical` / `og:url` | `/marketplace/clothing/{canonicalSlug}/{id}` |
| `og:title` / description / image | Keep `buildClothingSeoTitle`, `buildClothingSeoDescription`, `resolveClothingOgImage` |
| `og:type` | `product` (unchanged) |
| Login `next` | Encode nested canonical path |

**Storefront landing** (`[storefrontSlug]/index.astro`)

| Meta | Proposed |
|------|----------|
| Title | `{displayName} · Apparel Storefront · Sell By Owner Local` |
| Description | `Shop active wholesale apparel from {displayName} on Sell By Owner Local.` |
| `og:image` | First active listing’s gallery image, else `/og-default.jpg` |
| `og:type` | `website` |
| `og:url` / canonical | `/marketplace/clothing/{canonicalSlug}` |

Implement helpers in `src/lib/seo.ts`; continue rendering through `src/layouts/Layout.astro`.

### 4.4 Sitemap / robots (follow-up)

If a sitemap exists or is added later, include:

- `/marketplace/clothing`
- Each claimed storefront index
- Each active listing nested URL  

Omit UID-fallback URLs when a custom slug exists (canonical only).

### 4.5 Files touched — Phase 4

| File | Change |
|------|--------|
| `src/pages/marketplace/clothing/[id].astro` | Legacy **301** shim (or delete once traffic is migrated) |
| `src/pages/marketplace/clothing/[storefrontSlug]/[id].astro` | Ownership check, canonical 301, OG/canonical URLs |
| `src/pages/marketplace/clothing/[storefrontSlug]/index.astro` | Slug→seller 404, UID→slug 301, storefront OG |
| `src/lib/seo.ts` | Storefront SEO helpers; ensure absolute `og:url` via existing `resolveAbsoluteUrl` |
| `src/layouts/Layout.astro` | Only if storefront needs extra meta hooks |
| `src/pages/404.astro` | Optionally share copy/layout with marketplace 404s |
| `src/lib/buyer-profile.ts` | Previous-slug redirect resolution |
| `src/schemas/index.ts` | `previousStorefrontSlugs` / redirect metadata if not added in Phase 1 |

---

## Suggested Implementation Order

```mermaid
flowchart LR
  P1[Phase 1: Schema + slug UI] --> P2[Phase 2: Nested routes + links]
  P2 --> P3[Phase 3: Storefront index]
  P3 --> P4[Phase 4: Redirects + SEO + 404s]
```

1. **Phase 1** can ship behind the existing flat URLs (slug stored but unused in paths).
2. **Phase 2** flips public listing URLs; deploy with the legacy 301 shim the same release.
3. **Phase 3** adds the storefront landing once nested paths are live.
4. **Phase 4** hardens redirects, ownership checks, and OG — can overlap late Phase 2/3 but should be complete before calling the refactor production-ready.

---

## Testing Checklist (pre-production)

- [ ] Claim slug: valid, reserved, taken, too short
- [ ] Fallback: seller without slug reachable via UID segment
- [ ] Listing cards on global browse open nested URLs
- [ ] Seller “Copy Link” copies nested public URL
- [ ] Storefront index lists only that seller’s **active** items
- [ ] Wrong seller slug + valid listing id → 404 (or 301 only when same owner / old slug)
- [ ] Legacy `/marketplace/clothing/{id}` → 301 to nested URL
- [ ] Rename (if allowed) → old slug 301s to new slug
- [ ] OG debugger shows correct `og:url` / image for listing and storefront
- [ ] Mobile + desktop: storefront and listing pages render correctly

---

## Explicit non-goals (this refactor)

- Changing `/seller/apparel/*` management routes to use storefront slugs
- Vehicle marketplace URL changes
- Denormalizing full seller profiles onto every listing (optional later)
- Multi-category storefronts beyond apparel

---

## Quick reference — all files in scope

**Create**

- `src/pages/marketplace/clothing/[storefrontSlug]/index.astro`
- `src/pages/marketplace/clothing/[storefrontSlug]/[id].astro`

**Modify**

- `src/schemas/index.ts`
- `src/lib/buyer-profile.ts`
- `src/lib/clothing-api.ts`
- `src/lib/seo.ts`
- `src/utils/url-helpers.ts`
- `src/pages/api/users/[id].ts`
- `src/pages/account/index.astro`
- `src/pages/marketplace/clothing/index.astro`
- `src/pages/marketplace/clothing/[id].astro` (shim or remove)
- `src/pages/seller/apparel/index.astro`
- `src/components/buyer/ClothingCard.tsx`
- `src/islands/buyer/ClothingInventoryGrid.tsx`
- `src/islands/buyer/ProfileEditor.tsx`
- `src/islands/shared/FilterableApparelGrid.tsx`
- `src/islands/seller/ApparelSellerLayout.tsx`
- `src/islands/seller/ApparelCatalogSection.tsx`
- `src/layouts/Layout.astro` (if needed)
- `src/pages/404.astro` (if needed)
- `firestore.indexes.json` (only if query strategy requires it)
- `scripts/seed-clothing.ts`

**Reference only (patterns to mirror, not necessarily edit)**

- `src/pages/vehicles/[id].astro` — hybrid slug resolve + 301 canonical
- `src/utils/url-helpers.ts` — existing vehicle slug helpers
