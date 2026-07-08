# Tier 0 Public Surface

Routes and APIs that must remain accessible **without authentication** (Verification Roadmap Phase 1).

See also: [`VERIFICATION_ROADMAP.md`](../VERIFICATION_ROADMAP.md) Phase 1.

## Public pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage, inventory grid, embedded auth |
| `/login` | Email/password sign-in |
| `/vehicles/{slug}` | Public vehicle listing (SSR) |

## Public API routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/vehicles` | Active inventory list |
| GET | `/api/vehicles/{vehicleId}/original-sticker` | Document proxy |
| GET | `/api/vehicles/{vehicleId}/kbb-report` | Document proxy |
| GET | `/api/vehicles/{vehicleId}/history-report` | Document proxy |
| GET | `/api/vehicles/{vehicleId}/smog-certificate` | Document proxy |
| GET | `/api/users/{id}` | Public seller profile |
| POST | `/api/inquiries` | Contact form (IP rate limited) |
| POST | `/api/messages` | Buyer chat send (IP rate limited) |
| GET | `/api/messages/{sessionId}` | Chat history (session capability token) |
| POST | `/api/analytics/events` | Anonymous listing engagement telemetry |
| POST | `/api/auth/session` | Create session cookie after Firebase sign-in |
| POST | `/api/auth/logout` | Clear session cookie |

## Analytics exclusions

- **Seller preview** (`/seller/vehicles/{id}/preview`) uses `VehicleListingContent` with `analyticsEnabled={false}` so seller views do not inflate buyer metrics.

## Follow-ups (not Phase 1)

- Firestore security rules for `listing_events` (write via Admin SDK only today)
- Durable rate limiting (Redis / Firestore) for multi-instance production
- BigQuery export for dealer analytics (Phase 8)
