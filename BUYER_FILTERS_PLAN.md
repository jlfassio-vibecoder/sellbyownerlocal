# Buyer Apparel Filters Blueprint

Architecture plan for bringing seller-dashboard apparel filters to the public buyer marketplace and individual storefronts. **Documentation only** — no application code in this change.

---

## 1. Goal and non-goals

### Goal

Shoppers on the global clothing marketplace and on seller storefronts can filter listings with the same **search** and **brand** controls sellers already use, with filter state stored in **URL search parameters** so views are shareable and survive refresh.

### Non-goals (this blueprint / first implementation)

- Server-side Firestore query filters (filtering stays client-side over SSR-loaded listings)
- Size, color, category, or condition filters (not present on seller side today)
- Buyer-facing status filter (draft / archived) — marketplace already loads active listings only
- SEO canonicalization of filter query params
- Mounting seller `FilterableApparelGrid` (bulk edit / selection) on public pages

---

## 2. Seller filter inventory (current)

Source of truth:

- [`src/islands/shared/SearchAndFilterBar.tsx`](src/islands/shared/SearchAndFilterBar.tsx)
- [`src/islands/shared/FilterableApparelGrid.tsx`](src/islands/shared/FilterableApparelGrid.tsx)
- Wired for sellers via [`src/islands/seller/ApparelCatalogSection.tsx`](src/islands/seller/ApparelCatalogSection.tsx)

| Filter | Behavior | Buyer relevance |
|--------|----------|-----------------|
| **Search** | Case-insensitive match on `title`, `brand`, `description` | Yes |
| **Brand** | Dropdown of unique brands from loaded items; `"All"` = no filter | Yes |
| **Status** | draft / active / archived; gated by `showStatusFilter={isSellerView}` | No — hide on buyer (`showStatusFilter={false}`) |

There is **no** category, size, color, or condition filter on the seller dashboard today. Buyer parity means **search + brand** only.

Buyer marketplace today ([`src/islands/buyer/ClothingInventoryGrid.tsx`](src/islands/buyer/ClothingInventoryGrid.tsx)) renders an unfiltered card grid. Vehicle buyer filters in [`src/islands/buyer/InventoryGrid.tsx`](src/islands/buyer/InventoryGrid.tsx) already use URL `searchParams` + `history.pushState` / `popstate` — reuse that pattern.

---

## 3. Phase 1 — State management and URL sync

### URL contract

| Param | Example | Default |
|-------|---------|---------|
| `q` | `?q=hoodie` | empty (omit from URL) |
| `brand` | `?brand=ORIGINAL%20DELUX` | omit / treat as All |

Examples:

- Global: `/marketplace/clothing?q=flannel&brand=ORIGINAL%20DELUX`
- Storefront: `/marketplace/clothing/acme-apparel?q=zip&brand=HK`

### Client state shape

Inside the buyer grid island (`ClothingInventoryGrid`):

```ts
interface ApparelBuyerFilters {
  q: string;
  brand: string; // '' or 'All' means no brand filter
}
```

### Sync rules

Mirror [`InventoryGrid.tsx`](src/islands/buyer/InventoryGrid.tsx):

1. **On mount:** `parseFiltersFromSearch(window.location.search)` → hydrate React state
2. **On filter change:** `history.pushState(null, '', pathname + buildSearchFromFilters(filters))` — pathname unchanged so storefront slug is preserved
3. **On `popstate`:** re-parse `window.location.search` into state (browser Back/Forward)
4. **Omit** empty / `"All"` keys from the query string so clean URLs stay clean
5. **Filtering stays client-side** over SSR-loaded listings (same as seller apparel grid and vehicle inventory)

### Filter predicate (reuse seller logic)

- **Search:** `(title + brand + description).toLowerCase()` includes trimmed `q` (lowercase)
- **Brand:** exact string match when brand is set and not `"All"`

Suggested helpers (implementation follow-up):

```ts
function parseFiltersFromSearch(search: string): ApparelBuyerFilters
function buildSearchFromFilters(filters: ApparelBuyerFilters): string // '' or '?q=...&brand=...'
```

---

## 4. Phase 2 — Component refactor

### Chosen approach

Extend buyer [`ClothingInventoryGrid.tsx`](src/islands/buyer/ClothingInventoryGrid.tsx) rather than mounting seller `FilterableApparelGrid` (avoids bulk-edit / selection UI on public pages).

Reuse [`SearchAndFilterBar.tsx`](src/islands/shared/SearchAndFilterBar.tsx) with `showStatusFilter={false}`.

### Implementation steps

1. Add filter state + URL parse/build helpers inside `ClothingInventoryGrid`
2. Derive `brands` from `initialListings` via `useMemo` (unique, sorted)
3. Compute `filteredListings` with the same search/brand rules as seller `FilterableApparelGrid`
4. Render `SearchAndFilterBar` above the card grid
5. Update count copy to reflect filtered length (e.g. `3 of 12 items`, or `3 items` when unfiltered)
6. Keep `ClothingCard` + `BuyerMarketplaceShell` / favorites FAB unchanged
7. Empty **filtered** state: dashed empty panel — “No items found matching your criteria” / “Try adjusting your search or filters.”

### Wiring `SearchAndFilterBar`

```tsx
<SearchAndFilterBar
  searchTerm={filters.q}
  setSearchTerm={(q) => updateFilters({ ...filters, q })}
  selectedBrand={filters.brand || 'All'}
  setSelectedBrand={(brand) => updateFilters({ ...filters, brand })}
  selectedStatus="All"
  setSelectedStatus={() => {}}
  brands={brands}
  showStatusFilter={false}
/>
```

(`selectedStatus` / `setSelectedStatus` remain required by the shared bar props but are unused when status is hidden.)

### Optional follow-up (not required for v1)

Extract `matchesApparelSearch` / brand filter into [`src/lib/apparel.ts`](src/lib/apparel.ts) so seller and buyer predicates cannot drift. Do **not** route public pages through `FilterableApparelGrid` unless that shared helper extraction lands first.

---

## 5. Phase 3 — Integration

No Astro page API changes beyond existing SSR data. Both pages already mount `ClothingInventoryGrid` with `client:load`; Phase 2 island changes apply automatically.

| Page | Role |
|------|------|
| [`src/pages/marketplace/clothing/index.astro`](src/pages/marketplace/clothing/index.astro) | Global marketplace — passes `initialListings`, `storefrontSegmentsBySellerId`, `buyerContext` |
| [`src/pages/marketplace/clothing/[storefrontSlug]/index.astro`](src/pages/marketplace/clothing/[storefrontSlug]/index.astro) | Storefront — same grid; URL sync keeps `pathname` as the storefront path |

### Empty-listing branches

When SSR returns **zero** listings, pages already show a dashed empty state **without** the grid. Keep that behavior: do not render the filter bar when there is nothing to filter.

When listings exist but filters match nothing, show the Phase 2 filtered-empty panel inside the grid island.

### Integration checklist

- [ ] Global marketplace: filters update `?q=` / `?brand=` without changing `/marketplace/clothing`
- [ ] Storefront: filters update query only; path stays `/marketplace/clothing/[storefrontSlug]`
- [ ] Refresh with query params restores filter UI and result set
- [ ] Shared link opens the same filtered view
- [ ] Browser Back/Forward restores prior filter state
- [ ] Status dropdown never appears for buyers
- [ ] Favorites FAB / `BuyerMarketplaceShell` still wrap the grid
- [ ] Zero-listing SSR empty states unchanged

---

## 6. Acceptance criteria

1. **Shareable URL** — copying `/marketplace/clothing?q=…&brand=…` (or storefront equivalent) reproduces the filtered grid for another user/session
2. **Refresh-safe** — reload keeps search and brand selection and filtered results
3. **Global + storefront** — same filter UX on both pages
4. **Status hidden** — no draft/active/archived control on buyer surfaces
5. **Parity** — search matches title/brand/description; brand is exact match from listing brands
6. **Empty states** — distinct copy for “no listings at all” vs “no matches for filters”

---

## 7. Follow-ups

| Item | Notes |
|------|--------|
| Shared filter helpers in `src/lib/apparel.ts` | Avoid seller/buyer predicate drift |
| Size / color filters | Only if product data quality supports useful dropdowns |
| Featured / Sale toggles | Optional shopper shortcuts; not on seller `SearchAndFilterBar` today |
| Server-side filtering | Needed only if inventory grows beyond comfortable full SSR payloads |
| Debounced search URL updates | Optional UX polish if `pushState` on every keystroke feels noisy |

---

## Implementation order (when coding)

1. Phase 1 helpers + state in `ClothingInventoryGrid`
2. Phase 2 UI (`SearchAndFilterBar` + filtered cards)
3. Phase 3 manual QA on global + storefront pages (no page rewrites expected)
