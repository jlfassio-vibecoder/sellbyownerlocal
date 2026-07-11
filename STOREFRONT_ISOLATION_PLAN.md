# Storefront Traffic Isolation Blueprint

Architecture plan for keeping buyers who arrive via a seller’s custom storefront URL captive within that seller’s ecosystem. **Documentation only** — no application code in this change.

---

## 1. Goal and non-goals

### Goal

On storefront routes (`/marketplace/clothing/[storefrontSlug]` and `/marketplace/clothing/[storefrontSlug]/[id]`), remove in-page navigation that sends shoppers to the **global** apparel marketplace (`/marketplace/clothing`). The storefront should feel like an independent landing page when a seller shares their link.

### Non-goals (v1)

- Changing the global marketplace page itself (`/marketplace/clothing`)
- Hiding site-wide chrome that does not exist today (see Phase 3)
- Blocking typed/bookmarked access to `/marketplace/clothing` (buyers can still navigate there manually)
- Softening SEO/canonical rules or ownership 404s
- Changing seller dashboard “copy public link” or nested URL helpers

---

## 2. Current navigation inventory

### Detail page — [`src/pages/marketplace/clothing/[storefrontSlug]/[id].astro`](src/pages/marketplace/clothing/[storefrontSlug]/[id].astro)

| Location | Current UI | Target |
|----------|------------|--------|
| Header breadcrumb row | `← Back to Clothing` → `/marketplace/clothing` | **Remove** global link |
| Header breadcrumb row | `View all from {displayName}` → `storefrontPath` | **Keep** as primary back affordance; promote to sole/primary “Back to {Storefront Name}” |

`storefrontPath` is already computed via `getStorefrontPath(canonicalSegment)`.

### Storefront index — [`src/pages/marketplace/clothing/[storefrontSlug]/index.astro`](src/pages/marketplace/clothing/[storefrontSlug]/index.astro)

| Location | Current UI | Target |
|----------|------------|--------|
| Header | `← Browse all apparel` → `/marketplace/clothing` | **Remove** |
| Empty state copy | “Check back soon, or browse other apparel on the marketplace.” | **Replace** with captive message using seller display name |
| Empty state CTA | `Browse all apparel` button → `/marketplace/clothing` | **Remove** |

### Layout / navbar

[`src/layouts/Layout.astro`](src/layouts/Layout.astro) is a thin shell (meta + `<slot />`). It does **not** render a global marketplace nav. No layout prop is required for v1.

### Out of scope findings

- Legacy flat-URL 301 shim in the storefront index (param as listing ID) is routing, not buyer chrome — leave as-is.
- `ContactSellerFab` / favorites do not link to `/marketplace/clothing`.

---

## 3. Phase 1 — Detail page navigation

**File:** [`src/pages/marketplace/clothing/[storefrontSlug]/[id].astro`](src/pages/marketplace/clothing/[storefrontSlug]/[id].astro)

### Steps

1. Delete the global link block:
   - `href="/marketplace/clothing"`
   - Label `← Back to Clothing`
2. Keep a single primary back link to the seller storefront:
   - `href={storefrontPath}`
   - Label: `← Back to {resolvedSeller.displayName}` (or `← View all from {resolvedSeller.displayName}` if matching existing tone)
3. Simplify the header flex row if only one link remains (drop the dual-link gap layout if unused).

### Acceptance

- Detail page shows no in-page link to `/marketplace/clothing`
- Buyer can return to the seller’s catalog via the storefront back link
- Listing → storefront path still uses nested URLs (`getClothingListingPath` / `getStorefrontPath`)

---

## 4. Phase 2 — Storefront index empty states

**File:** [`src/pages/marketplace/clothing/[storefrontSlug]/index.astro`](src/pages/marketplace/clothing/[storefrontSlug]/index.astro)

### Steps

1. **Remove** header link `← Browse all apparel` → `/marketplace/clothing` (even when listings exist — captive chrome for all storefront visits).
2. When `listings.length === 0`, replace empty state:
   - **Headline:** `{seller.displayName} doesn't have any active items right now.`
   - **Supporting:** `Check back later.`
   - **Remove** the red `Browse all apparel` CTA and marketplace-pushing copy.
3. Keep `ContactSellerFab` on empty storefronts so quote/favorites still work if the buyer has saved items from elsewhere (no global marketplace link).

### Acceptance

- Empty storefront never links to `/marketplace/clothing`
- Populated storefront header no longer offers “Browse all apparel”
- Seller display name appears in the empty-state message

---

## 5. Phase 3 — Header / layout context

| Question | v1 answer |
|----------|-----------|
| Modify `Layout.astro`? | **No** — layout has no marketplace nav |
| Pass a `captive` / `hideGlobalNav` prop? | **Not needed** for v1 |
| Sufficient to update page bodies only? | **Yes** |

### Follow-up (not v1)

If a shared buyer chrome/nav is added later that links to `/marketplace/clothing`, introduce a layout or shell prop (e.g. `marketplaceContext: 'global' | 'storefront'`) so storefront routes can suppress that link. Document that as a future requirement when global nav ships.

---

## 6. Implementation checklist

- [ ] Detail: remove `Back to Clothing` → `/marketplace/clothing`
- [ ] Detail: single primary back link to `{displayName}` storefront
- [ ] Index: remove header `Browse all apparel`
- [ ] Index empty: captive copy + no marketplace CTA
- [ ] Grep storefront routes: no remaining `href="/marketplace/clothing"` in page chrome/empty states
- [ ] Manual QA: open storefront URL → detail → back lands on storefront, not global index
- [ ] Manual QA: empty storefront shows captive empty state only

---

## 7. Suggested implementation order

1. Phase 1 — detail page header links  
2. Phase 2 — storefront index header + empty state  
3. Phase 3 — confirm no layout changes; optional follow-up note only  

---

## 8. Out of scope reminders

| Item | Why |
|------|-----|
| Global `/marketplace/clothing` index | Still the discovery surface for non-storefront traffic |
| Seller dashboard links to public storefront | Unrelated to buyer captivity |
| Hard redirect away from global marketplace | Buyers may still discover it; isolation is in-page chrome only |
| Logo / brand mark in page headers | Current pages use text headers; logo home links are on the **global** clothing index, not storefront routes |
