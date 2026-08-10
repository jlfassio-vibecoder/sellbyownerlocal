# PLAN: Comparables as a First-Class Listing Section

**Status:** Draft — architectural assessment + phased execution plan  
**Scope:** Elevate public “Comparables” out of being a Market Valuation appendage into its own navigable listing section; optionally align the Seller Dashboard mental model.

---

## 1. Architectural Assessment & Gap Analysis

### 1.1 Current public architecture

Comparables live on `vehicle.marketValuation.comparables` (schema: max 5; optional `highlighted` flag). On the public listing they are **not** a first-class nav section today.

| Concern | Current behavior |
|---------|------------------|
| Data | Firestore `VehicleResponse.marketValuation.comparables` |
| Chart | [`MarketChart.tsx`](src/islands/MarketChart.tsx) owns `#market`, filters out `highlighted` comps for bars, always adds “This Listing” |
| Grid | [`MarketCompsGrid.tsx`](src/islands/MarketCompsGrid.tsx) filters `!highlighted`; returns `null` if none visible |
| Mount | [`VehicleListingContent.astro`](src/components/VehicleListingContent.astro) ~536–557: chart if `marketValuation`, grid if `comparables.length > 0` |
| Nav | [`vehicle-listing-view.ts`](src/lib/vehicle-listing-view.ts) adds `{ id: 'market', label: 'Market Value' }` when `marketValuation` exists — **no Comparables entry** |
| Anchor | Grid section has `aria-labelledby` / heading id `market-comps-heading` but **no `id="comparables"`** |

Page load path ([`vehicles/[id].astro`](src/pages/vehicles/[id].astro)): Zod-parse vehicle → `VehicleListingContent`. No comps-specific transform. Seller preview reuses the same content component.

### 1.2 Where MarketCompsGrid is mounted

Order in [`VehicleListingContent.astro`](src/components/VehicleListingContent.astro):

1. `#maintenance` (Astro `<section>`)
2. `MarketChart` (`client:only="react"`) — island owns `#market`
3. `MarketCompsGrid` (`client:visible`) — island owns section **without** a nav id
4. `#features` (Astro `<section>`)

There is **no Astro wrapper** around either market island (same pattern as Gallery / ContactForm: the island owns `<section className="mb-16 pt-8">`).

### 1.3 How other major sections are structured

Dominant public listing patterns:

| Pattern | Examples | Typography / spacing |
|---------|----------|----------------------|
| Astro `<section id="…">` | `#overview`, `#walkaround`, `#pitch`, `#upgrades`, `#maintenance`, `#features`, `#specs`, `#documents` | Usually `mb-16 pt-8`; h2 `mb-6 text-2xl font-bold text-slate-900` (some use `mb-2` + helper copy) |
| Island-owned `<section id="…">` | Gallery `#gallery`, ContactForm `#contact`, MarketChart `#market` | Same spacing classes inside the island |

Sticky / scroll-spy nav:

- Built in `buildVehicleListingView()` → `navSections`
- Consumed by [`VehicleSectionNav.tsx`](src/islands/VehicleSectionNav.tsx) (`getElementById` + `scrollY + 100`)
- Desktop top shortcuts: only `pitch`, `gallery`, `carfax` (`DESKTOP_SHORTCUT_IDS`); Market Value lives under **More** / mobile drawer
- Analytics: `ListingAnalytics` observes whatever ids are in `navSections`

**Implication:** A first-class Comparables section needs (1) a stable DOM `id` and (2) a matching `navSections` entry gated on visible comps.

### 1.4 Data / props routing

```
VehicleResponse.marketValuation
  ├── (chart copy, retailReady, deductions, etc.) → MarketChart via `valuation={vehicle.marketValuation}`
  ├── marketImageUrls (resolved in listing view) → MarketChart `images`
  └── comparables[] → MarketCompsGrid `comps={vehicle.marketValuation.comparables}`
```

No new Firestore fields are required for Phase 1–2. The public section wrapper continues to receive the same `comparables` array; visibility should use **non-highlighted** comps (same filter as the grid), not raw `length > 0`.

### 1.5 Empty-state gap

| Layer | Today |
|-------|--------|
| Astro mount | Mounts grid when any comparable exists (including all-highlighted) |
| MarketCompsGrid | Returns `null` if every comp is `highlighted` |
| Nav | No Comparables link; Market Value still shows if `marketValuation` exists |

Risk: hydrate a client island that paints nothing; no `#comparables` for deep links / analytics.

### 1.6 Seller Dashboard alignment

[`DetailsEditor.tsx`](src/islands/seller/DetailsEditor.tsx): single section id `market` → label “Market Valuation”. Completeness checks only the four valuation **text** fields — comps do not affect the green check.

[`MarketValuationSection.tsx`](src/islands/seller/components/MarketValuationSection.tsx): one scrollable panel — analysis CTA → adjusted price → market photos → text fields → **Comparable Vehicles** (`useFieldArray('marketValuation.comparables')`, max 5, `ComparableRow`).

Helper copy frames comps as chart inputs, while the public page shows a separate “Market Comparables” card grid → mild mental-model mismatch.

**Verdict:** Public extraction does **not** require splitting the seller form in Phase 1–2. Keep form path `marketValuation.comparables`. Optional Phase 3: stronger sub-block framing or a dedicated DetailsEditor section for parity with public nav.

---

## 2. Goals & Non-Goals

### Goals

- Public listing treats Comparables as its own major section (heading, spacing, `#comparables` anchor).
- Sticky nav / scroll-spy / analytics can target Comparables when visible comps exist.
- Empty / all-highlighted listings hide the section cleanly (no phantom nav, no useless hydrate).

### Non-Goals (this plan)

- Changing Firestore schema or rename of `marketValuation.comparables`.
- Moving chart bars out of Market Value.
- Making dealer source URLs clickable (already site-name only on public).
- Forced seller dashboard section split (optional Phase 3).

---

## 3. Phased Execution Plan

### Phase 1 — Public layout extraction

**Intent:** Give Comparables first-class section identity without changing data shape.

1. **Anchor on the island (preferred, matches Gallery/Contact)**  
   In [`MarketCompsGrid.tsx`](src/islands/MarketCompsGrid.tsx):
   - Add `id="comparables"` to the outer `<section>` (keep `mb-16 pt-8`).
   - Optionally rename visible heading from “Market Comparables” → **“Comparables”** for nav/heading parity (product call; default recommendation: **Comparables**).
   - Keep existing helper sentence and card grid.

2. **Keep mount order** in [`VehicleListingContent.astro`](src/components/VehicleListingContent.astro): MarketChart → MarketCompsGrid → `#features`. Do not nest the grid inside `#market` (would break independent scroll-spy).

3. **Optional Astro wrapper** — only if product wants SSR-visible heading before hydrate. Default: island-owned section (current pattern). If wrapping in Astro, avoid duplicate h2 (either move heading to Astro or leave heading in island).

4. **Props** — continue `comps={vehicle.marketValuation.comparables}`; no new props unless introducing a shared `hasVisibleComparables` helper (Phase 4 / Phase 2).

**Exit criteria:** Page source / DOM has `<section id="comparables">` with the comps grid when visible comps exist; visual spacing matches adjacent major sections.

---

### Phase 2 — Navigation & anchors

**Intent:** Sticky nav, More menu, deep links, and analytics treat Comparables as a peer of Market Value.

1. In [`vehicle-listing-view.ts`](src/lib/vehicle-listing-view.ts), immediately after the `market` push (~172–173):

   ```ts
   if (hasVisibleMarketComparables(vehicle)) {
     navSections.push({ id: 'comparables', label: 'Comparables' });
   }
   ```

2. Implement `hasVisibleMarketComparables` (same file or tiny `src/lib/` helper):

   ```ts
   (vehicle.marketValuation?.comparables ?? []).some((c) => !c.highlighted)
   ```

3. Use that helper for the Astro mount gate in `VehicleListingContent.astro` (replace raw `comparables.length > 0`).

4. [`VehicleSectionNav.tsx`](src/islands/VehicleSectionNav.tsx): no structural change required for More/drawer. **Do not** add to `DESKTOP_SHORTCUT_IDS` unless product wants a top-bar shortcut (default: leave under More).

5. Confirm `ListingAnalytics` receives `comparables` via `navSections` and that the element exists when analytics runs (`client:visible` on the grid is fine if nav is gated on the same visibility predicate).

**Exit criteria:** With visible comps, nav lists Comparables after Market Value; click scrolls to `#comparables`; active state updates on scroll. Without visible comps, no nav item.

---

### Phase 3 — Seller UI alignment (optional)

**Default recommendation:** Stay nested under Market Valuation; improve framing only.

**3A — Framing (minimal, preferred first)**  
In `MarketValuationSection.tsx` Comparable Vehicles helper copy, state that these rows power:

- the public **Comparables** card section, and  
- bars on the Market Value chart  

(not “chart only”).

**3B — Dedicated Seller section (only if editors still confuse chart vs comps)**  
- Add `comparables` to `SECTION_IDS` / `SECTION_LABELS` in `DetailsEditor.tsx` (after `market`).  
- Completeness: e.g. at least one row with label + price (product-defined).  
- Extract comps field-array UI into `ComparablesSection.tsx` (or pass through from a thin wrapper).  
- Keep RHF paths as `marketValuation.comparables` (no schema migration).  
- Rail / pill nav pick up the new section automatically via `SECTION_LABELS`.

**Exit criteria (3A):** Seller copy matches public mental model.  
**Exit criteria (3B):** Sellers edit comps in a dedicated Details rail item without changing persistence shape.

---

### Phase 4 — Validation

1. **Empty states**
   - No `marketValuation` → no `#market`, no `#comparables`.
   - `marketValuation` with empty comps → `#market` only.
   - Only `highlighted` comps → no `#comparables`, no nav item, no grid hydrate.
   - Mixed / all visible → section + nav.

2. **Responsive**
   - Grid already: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — verify mobile stacking and card image aspect.
   - Sticky nav More drawer includes Comparables when present.

3. **Dealer-comp listings**
   - Promoted dealer_comp vehicles typically omit contact; comps section behavior unchanged (still driven by parent listing’s `marketValuation` when viewing a **native** listing). Confirm dealer_comp **public** pages are not expected to show a comps grid unless that vehicle doc itself has comps.

4. **Regression**
   - Market chart still renders with comps-only-highlighted (listing bar only).
   - Promote-from-comparable + PATCH sync of promoted cards still works.
   - Preview page shows the same section/nav behavior.

5. **Checks**
   - `npx astro check`
   - Manual smoke on seed RAM listing with comps.

---

## 4. Recommended File Touch List

| Phase | File | Change |
|-------|------|--------|
| 1 | `src/islands/MarketCompsGrid.tsx` | `id="comparables"`; optional heading rename |
| 1–2 | `src/components/VehicleListingContent.astro` | Mount gate → visible comps helper |
| 2 | `src/lib/vehicle-listing-view.ts` | Nav entry + helper |
| 2 | (optional) `src/lib/market-comparables.ts` | Shared `hasVisibleMarketComparables` if reused |
| 3A | `src/islands/seller/components/MarketValuationSection.tsx` | Helper copy |
| 3B | `DetailsEditor.tsx` + new section component | Only if product chooses split |
| 4 | Manual / check | Empty + responsive + preview |

---

## 5. Risks & Decisions

| Decision | Recommendation |
|----------|----------------|
| Heading text “Market Comparables” vs “Comparables” | Use **Comparables** to match nav label |
| Astro wrapper vs island-owned section | Island-owned + `id` (matches Gallery) |
| Seller section split | Defer; do 3A first |
| Desktop top shortcut | Keep under More |
| `highlighted` comps | Never surface in public section or nav |

---

## 6. Success Definition

A buyer on a listing with dealer comps can:

1. Open **More** (or mobile nav) and jump to **Comparables**.
2. Land on a clearly separated section immediately after Market Value.
3. See cards for non-highlighted comps only.
4. Never see a blank section or a nav link to missing content.

Sellers continue editing comps under Market Valuation (unless Phase 3B is approved), with copy that names the public Comparables section.
