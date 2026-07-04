# Seller Dashboard Migration Blueprint

**Source:** `../../2017RAM1500` (Vite/Express SPA)  
**Target:** `sellbyownerlocal` (Astro 7 SSR multi-tenant platform)  
**Document date:** July 4, 2026  
**Status:** In progress — **Phase 1 complete**; **Phase 2 is next**

---

## Migration Progress

| Phase | Status | Summary |
|-------|--------|---------|
| **Phase 1 — Auth & Routing** | **Complete** | Firebase client/admin auth, session cookies, seller routes, dashboard shell |
| **Unified Marketplace Auth** | **Complete** | `/login`, `/account`, `AuthForm`, generic `/api/auth/*` (extension of Phase 1) |
| **Phase 2 — Read-Only UI (Inquiries)** | **Next** | SSR inquiries tab, `GET /api/seller/inquiries`, port `InquiriesPanel` |
| Phase 3 — Forms & Mutations | Pending | Details editor, document uploads, vehicle PATCH API |
| Phase 4 — Live Chat | Pending | Socket.io or alternative; wire `ChatPanel` + `ChatWidget` |
| Phase 5 — Multi-Vehicle UX & Hardening | Partial | Vehicle picker on `/seller` done; tests and health endpoint remain |

### Next Phase: Phase 2 — Read-Only UI (Inquiries Tab)

**Goal:** Dashboard displays real inquiry data SSR'd from Firestore.

**Entry criteria:** Phase 1 complete ✅

**Tasks:**
1. Add `InquiryRecordSchema` to `src/schemas/index.ts`
2. Implement `GET /api/seller/inquiries` with auth + optional `vehicleId` filter
3. Port `InquiriesPanel.tsx` to `src/islands/seller/InquiriesPanel.tsx`
4. Port `SellerDashboard.tsx` — wire Inquiries tab; accept `initialInquiries` prop
5. In `[vehicleId].astro` frontmatter: query inquiries, pass props to replace `SellerVehicleShell` placeholders
6. Wire inquiry count badge in `SellerLayout`

**Acceptance:** Submitting via public `ContactForm` on `/vehicles/seed-ram-1500` appears in seller dashboard after refresh; inquiry count badge reflects SSR data.

---

## Executive Summary

The old repository is a **single-listing** seller tool: one Firestore document (`truckDetails/main`), one implicit vehicle, and a monolithic Express process that serves REST, Socket.io, and the React SPA. The seller dashboard lives at `/seller` behind Firebase Auth and exposes three tabs: **Live Chat**, **Contact Forms**, and **Truck Details**.

The new platform is a **multi-tenant marketplace**: vehicles live in `vehicles/{id}` with a rich nested `VehicleSchema`, public listing pages are SSR-rendered in Astro, and interactive buyer features are React islands. **Auth, seller routing, and a dashboard shell are implemented.** Inquiries display, listing editing, chat backend, and document upload API remain outstanding.

This document defines exactly how to port the dashboard without copying the old architecture wholesale. The central design shift is:

| Concern | Old SPA | New Astro SSR |
|---------|---------|---------------|
| Routing | React Router (`/`, `/login`, `/seller`) | Astro file-based routes (`src/pages/…`) |
| Initial data | `useEffect` + `fetch` on mount | Astro frontmatter fetches Firestore; passes props to islands |
| Mutations | Client `fetch` with Firebase ID token | Same pattern via Astro API routes (`src/pages/api/…`) |
| Listing model | Flat `TruckDetails` on one doc | Nested `Vehicle` per listing, scoped by `sellerId` |
| Real-time chat | Socket.io on Express | **Not yet implemented** — requires an explicit architectural decision |

---

## 1. Current State vs. Future State

### 1.1 Old Architecture (2017RAM1500)

```
Browser (React SPA)
├── /              → LandingPage (client fetch truckDetails, useTruckDetails hook)
├── /login         → Login (Firebase Auth email/password)
└── /seller        → SellerDashboard (ProtectedRoute)
     ├── useEffect → GET /api/admin/inquiries
     ├── useEffect → GET /api/truck-details
     ├── ChatPanel  → GET /api/admin/conversations, Socket.io (join_admin)
     ├── InquiriesPanel → props only
     └── DetailsEditor → POST /api/truck-details, POST /api/upload

Express (server.ts)
├── REST /api/*
├── Socket.io (session rooms + admin_room)
└── Vite middleware (dev) / static (prod)

Firestore
├── truckDetails/main   ← single listing (flat string fields)
├── inquiries           ← { name, phone, email, message, timestamp }
└── messages            ← { sessionId, sender, content, timestamp, isRead }
```

**Key client modules analyzed:**

| File | Role |
|------|------|
| `src/components/SellerDashboard.tsx` | Tab shell; fetches inquiries + truck details on mount |
| `src/components/seller/SellerLayout.tsx` | Header, tab nav, sign-out (`react-router-dom`, Firebase Auth) |
| `src/components/seller/ChatPanel.tsx` | Admin chat UI; conversations + messages + Socket.io |
| `src/components/seller/InquiriesPanel.tsx` | Read-only inquiry list |
| `src/components/seller/DetailsEditor.tsx` | Full listing edit form + save |
| `src/components/seller/DocumentUploadFields.tsx` | Drag/drop upload → Firebase Storage via `/api/upload` |
| `src/components/Login.tsx` | Email/password login; redirects to `/seller` |
| `src/lib/api.ts` | Typed fetch wrappers (`getAuthToken`, `authRequest`) |
| `src/hooks/useSocket.ts` | Socket.io client; `join_admin` with Firebase token |
| `src/hooks/useTruckDetails.ts` | Client fetch for landing page (not used by dashboard directly) |
| `src/server/auth-middleware.ts` | Bearer token verification via Firebase Admin |
| `server.ts` | All Express routes + Socket.io handlers |

### 1.2 New Architecture (sellbyownerlocal)

```
Browser
├── /                        → index.astro (SSR: active vehicles)
├── /login                   → login.astro (AuthForm island — sign in / create account)
├── /account                 → account/index.astro (protected profile hub)
├── /seller                  → seller/index.astro (protected; vehicle picker or redirect)
├── /seller/login            → 301 redirect → /login (legacy URL)
└── /seller/vehicles/[vehicleId]  → protected dashboard shell (SellerVehicleShell)

Astro SSR (Node adapter, output: server)
├── .astro pages fetch Firestore in frontmatter
├── React islands (client:load) for interactivity
└── src/pages/api/* for mutations

Firestore (already in use)
├── users/{id}
├── vehicles/{id}     ← nested VehicleSchema (replaces truckDetails/main)
└── inquiries         ← already includes vehicleId + sellerId
```

**What exists in the new repo (as of Phase 1):**

| Asset | Status |
|-------|--------|
| `VehicleSchema` / nested content models | ✅ Used by SSR listing page |
| `POST /api/inquiries` | ✅ Multi-tenant (validates vehicleId + sellerId) |
| `GET /api/vehicles` | ✅ Public active listings |
| `GET /api/users/[id]` | ✅ Public seller profile |
| `ContactForm` island | ✅ Submits to `/api/inquiries` |
| `ChatWidget` island | ⚠️ **UI only** — optimistic local state, no persistence or socket |
| Firebase Admin (`src/lib/firebase-admin.ts`) | ✅ Firestore + `auth()` — **no Storage bucket helper yet** |
| Firebase Client (`src/lib/firebase-client.ts`) | ✅ Email/password auth |
| Auth utilities (`src/lib/auth.ts`) | ✅ `requireSeller`, session cookie, `assertVehicleOwner` |
| `POST /api/auth/session`, `POST /api/auth/logout` | ✅ Session cookie bridge for SSR |
| `AuthForm` island | ✅ Sign in, create account, password visibility, confirm password |
| `/login`, `/account` | ✅ Public login + protected account hub |
| `/seller`, `/seller/vehicles/[vehicleId]` | ✅ Protected seller routes + ownership checks |
| `SellerLayout`, `SellerVehicleShell` | ✅ Tab shell with Phase 2–4 placeholders |
| `AccountUidBanner` | ✅ UID display on `/account` and `/seller` |
| Dev seed (`/api/dev/seed`) | ✅ `USER_ID` aligned to real Firebase Auth UID |
| `SellerDashboard`, `InquiriesPanel`, `DetailsEditor`, `ChatPanel` | ❌ Not ported |
| Message/chat collections API | ❌ Not implemented |
| Document upload API | ❌ Not implemented |

### 1.3 Routing & Data-Fetching Translation

| Old pattern | New pattern |
|-------------|-------------|
| `BrowserRouter` + `ProtectedRoute` wrapping `/seller` | Astro pages use `requireSellerOrRedirect(Astro.request, Astro.cookies)`; unauthenticated users redirect to `/login` |
| `components/Login.tsx` | `src/islands/AuthForm.tsx` at `/login`; post-auth lands on `/account` |
| `useEffect(() => getInquiries(), [])` in `SellerDashboard` | Astro frontmatter: query `inquiries` where `sellerId == uid` (and optionally `vehicleId`), pass `initialInquiries` prop — **Phase 2** |
| `useEffect(() => getTruckDetails(), [])` | Astro frontmatter: load `vehicles/{vehicleId}`, map nested `Vehicle` → flat dashboard form DTO, pass `initialFormState` — **Phase 3** |
| Sign-out | `POST /api/auth/logout` → `signOut(auth)` → `window.location.href = '/login'` |
| `useTruckDetails` hook on landing page | **Already replaced** — `[id].astro` SSR-loads vehicle; no client fetch needed |
| Tab state (`useState<'messages' \| 'inquiries' \| 'details'>`) | Client-side in `SellerVehicleShell` (to become `SellerDashboard` in Phase 2) |
| Hard-coded "2017 Ram 1500 Night Edition" in `ChatPanel` | Pass `vehicleTitle` prop from SSR (`year make model`) — **Phase 4** |

### 1.4 Multi-Tenant Implications

The old dashboard assumed **one listing per deployment**. The new platform supports **many vehicles per seller** (`sellerId` on each vehicle doc; seed data uses `seed-justin-f` with two vehicles).

**Recommended v1 behavior:**

1. `/seller` — if seller has one vehicle, redirect to `/seller/vehicles/{id}`; if multiple, show a vehicle picker. ✅ Implemented
2. All dashboard API routes are scoped: `vehicleId` in path or body, and the authenticated user's UID must match `vehicle.sellerId`.
3. Inquiries are already stored with `vehicleId` — filter admin reads accordingly.
4. Messages must gain a `vehicleId` field (missing in old schema) so conversations don't bleed across listings.

**Dev note:** Seed data `USER_ID` in [`src/pages/api/dev/seed.ts`](src/pages/api/dev/seed.ts) must match the seller's Firebase Auth UID for vehicles to appear on `/seller`. Re-seed via `POST /api/dev/seed` after updating `USER_ID`.

### 1.5 Real-Time Chat — Architectural Decision Required

The old app depends on **Socket.io co-located with Express**. Astro API routes are request/response only; they do not host a persistent WebSocket server out of the box.

**Options (pick one before Phase 4):**

| Option | Pros | Cons |
|--------|------|------|
| **A. Custom Node entry** wrapping Astro handler + Socket.io | Closest port of old code | Deviates from stock `@astrojs/node`; ops complexity |
| **B. Separate lightweight socket service** | Clean separation | Second deployable, CORS/auth wiring |
| **C. Firestore `onSnapshot` listeners** | No Socket.io; fits Firebase stack | Read costs; seller/buyer listener auth rules |
| **D. Defer chat to post-MVP** | Unblocks inquiries + details editor first | Feature gap vs old app |

**Recommendation:** Phase 4 implements chat. Start Phases 1–3 without Socket.io. Wire `ChatWidget` (buyer) and `ChatPanel` (seller) once the message API + transport layer is chosen. Until then, ship dashboard tabs for **Inquiries** and **Details** only, with Chat tab showing a "coming soon" state or hidden.

---

## 2. Component Mapping

All dashboard UI moves into `src/islands/`. Follow existing conventions (`ContactForm.tsx`, `ChatWidget.tsx`): default export, Tailwind classes, props typed inline or via `src/islands/types.ts`.

### 2.1 Components to Copy

| Old path | New path | Action |
|----------|----------|--------|
| `components/SellerDashboard.tsx` | `src/islands/SellerDashboard.tsx` | ⬜ Phase 2 |
| `components/seller/SellerLayout.tsx` | `src/islands/seller/SellerLayout.tsx` | ✅ Done |
| `components/seller/SellerVehicleShell.tsx` | `src/islands/seller/SellerVehicleShell.tsx` | ✅ Done (placeholder; Phase 2 replaces) |
| `components/seller/ChatPanel.tsx` | `src/islands/seller/ChatPanel.tsx` | Copy + refactor (Phase 4) |
| `components/seller/InquiriesPanel.tsx` | `src/islands/seller/InquiriesPanel.tsx` | Copy (minimal changes) |
| `components/seller/DetailsEditor.tsx` | `src/islands/seller/DetailsEditor.tsx` | Copy + refactor |
| `components/seller/DocumentUploadFields.tsx` | `src/islands/seller/DocumentUploadFields.tsx` | Copy + refactor |
| `components/Login.tsx` | `src/islands/AuthForm.tsx` | ✅ Done — at `/login`; sign in + create account; redirects to `/account` |

### 2.2 Components NOT to Copy (already migrated or N/A)

| Old component | New equivalent |
|---------------|----------------|
| `LandingPage.tsx` + landing sections | `src/pages/vehicles/[id].astro` (SSR) |
| `ContactForm.tsx` | `src/islands/ContactForm.tsx` ✅ |
| `ChatWidget.tsx` | `src/islands/ChatWidget.tsx` ✅ (needs backend wiring) |
| `Gallery.tsx`, `ImageCarousel.tsx`, `MarketChart` | Already in `src/islands/` |
| `App.tsx`, `main.tsx` | Replaced by Astro pages |

### 2.3 Hooks & Lib Utilities

| Old path | New path | Notes |
|----------|----------|-------|
| `hooks/useSocket.ts` | `src/islands/hooks/useSocket.ts` | Phase 4; update socket URL env var |
| `hooks/useTruckDetails.ts` | **Delete concept** | Replaced by SSR + optional client revalidation |
| `lib/api.ts` | `src/lib/seller-api.ts` | New typed client for dashboard endpoints only |
| `firebase.ts` | `src/lib/firebase-client.ts` | New — client SDK for Auth only |
| `types/index.ts` (dashboard types) | `src/islands/types.ts` | Extend existing `Message` interface |

### 2.4 Per-Component Prop & State Changes

#### `SellerDashboard.tsx`

**Old props:** none (self-fetching)

**New props:**
```typescript
interface SellerDashboardProps {
  vehicleId: string;
  vehicleTitle: string;           // e.g. "2017 RAM 1500"
  initialInquiries: InquiryRecord[];
  initialFormState: VehicleFormState;  // flat DTO — see §4
}
```

**Remove:**
- `useEffect` calls to `getInquiries()` and `getTruckDetails()`
- `DEFAULT_TRUCK_DETAILS` constant (move to mapper as fallback)

**Keep client-side:**
- `activeTab` state
- `inquiries` state initialized from `initialInquiries` (refresh after future mutations if needed)
- `formState` initialized from `initialFormState`, passed to `DetailsEditor`

---

#### `SellerLayout.tsx`

**Remove:**
- `useNavigate` from `react-router-dom`
- Import of `../../firebase` path (relocate to `src/lib/firebase-client.ts`)

**Change:**
- Sign-out handler: `POST /api/auth/logout` → `signOut(auth)` → `window.location.href = '/login'` ✅
- Optional new prop: `vehicleTitle: string` for header context
- Optional new prop: `sellerDisplayName?: string`

**Keep unchanged:** Tab UI, `inquiryCount` badge, layout structure

---

#### `InquiriesPanel.tsx`

**Old props:** `{ inquiries: Inquiry[] }`

**New props:**
```typescript
interface InquiriesPanelProps {
  inquiries: InquiryRecord[];
  vehicleTitle?: string;  // optional subtitle
}
```

**Type change:** Old `Inquiry` lacked `vehicleId`. New `InquiryRecord` adds `vehicleId` (and keeps `id`, `timestamp`). Display logic unchanged.

**Remove:** Nothing significant — already presentational.

---

#### `DetailsEditor.tsx`

**Old props:** `{ truckDetails: TruckDetails; onChange: (d: TruckDetails) => void }`

**New props:**
```typescript
interface DetailsEditorProps {
  vehicleId: string;
  formState: VehicleFormState;
  onChange: (state: VehicleFormState) => void;
}
```

**Remove:**
- Import of `updateTruckDetails` from old `lib/api`
- Direct POST to `/api/truck-details`

**Change:**
- Submit handler calls `PATCH /api/seller/vehicles/${vehicleId}` (or equivalent) via `src/lib/seller-api.ts`
- Replace `alert()` with inline success/error UI (match `ContactForm` pattern)
- Field names stay flat in the form DTO for minimal UI churn; mapper converts to nested `Vehicle` server-side

**Document field renames in form DTO:**

| Old `TruckDetails` key | New form key (recommended) | Maps to `Vehicle` |
|------------------------|----------------------------|-------------------|
| `windowStickerUrl` | `windowStickerUrl` | `documents.windowSticker` |
| `carfaxReportUrl` | `carfaxReportUrl` | `documents.carfaxReport` |
| `kbbReportUrl` | `kbbReportUrl` | `documents.kbbReport` |
| `smogReportUrl` | `smogReportUrl` | `documents.smogReport` |

---

#### `DocumentUploadFields.tsx`

**Change:**
- `uploadDocument()` targets `POST /api/seller/uploads` with `vehicleId` query param or FormData field
- Storage path should include `vehicles/{vehicleId}/documents/…` for tenant isolation
- Keep 5 MB client-side check

---

#### `ChatPanel.tsx` (Phase 4)

**Add props:**
```typescript
interface ChatPanelProps {
  vehicleId: string;
  vehicleTitle: string;
  initialConversations?: ConversationRecord[];  // optional SSR prefetch
}
```

**Remove:**
- Hard-coded subtitle `"Interested in: 2017 Ram 1500 Night Edition"`

**Change:**
- `getConversations()` → `GET /api/seller/conversations?vehicleId={vehicleId}`
- Filter conversation list server-side by `vehicleId`
- `useSocket({ role: 'admin', … })` must pass token; socket server must validate seller owns `vehicleId`

---

#### `AuthForm.tsx` (replaces `SellerLogin.tsx`)

**Status:** ✅ Complete

- Sign in via `signInWithEmailAndPassword`; create account via `createUserWithEmailAndPassword`
- Password visibility toggle (Eye icon); confirm password on signup
- Session exchange via `POST /api/auth/session`; redirect to `/account`
- Lives at `/login` (`src/pages/login.astro`)

#### `SellerLogin.tsx` (from old `Login.tsx`) — superseded

Replaced by `AuthForm.tsx`. Legacy `/seller/login` redirects to `/login`.

---

#### Astro page wrapper (new — not copied from old repo)

**Create:** `src/pages/seller/vehicles/[vehicleId].astro`

```astro
---
// 1. Verify session (see Phase 1)
// 2. Load vehicle; 403 if vehicle.sellerId !== session.uid
// 3. Load inquiries where sellerId == uid AND vehicleId == params.vehicleId
// 4. Map vehicle → VehicleFormState
---
<SellerDashboard
  client:load
  vehicleId={vehicle.id}
  vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
  initialInquiries={inquiries}
  initialFormState={formState}
/>
```

This replaces both the old `ProtectedRoute` and the dashboard's mount-time fetches.

---

## 3. API Route Mapping

All new routes live under `src/pages/api/`. Implement shared helpers first:

| Helper | Path | Purpose |
|--------|------|---------|
| `requireSeller` | `src/lib/auth.ts` | ✅ Extract Bearer token or `__session` cookie; verify via Firebase Admin |
| `assertVehicleOwner` | `src/lib/auth.ts` | ✅ Verify `vehicles/{id}.sellerId === uid` |
| `getStorageBucket` | extend `src/lib/firebase-admin.ts` | Mirror old `adminBucket` for uploads — **Phase 3** |

### 3.1 Route Translation Table

| Old Express route | New Astro API route | Auth | Notes |
|-------------------|---------------------|------|-------|
| `GET /api/health` | `GET /api/health` | Public | Optional; useful for deploy probes — **Phase 5** |
| N/A (session bridge) | `POST /api/auth/session` | Public | ✅ Exchange Firebase ID token for `__session` httpOnly cookie |
| N/A (logout) | `POST /api/auth/logout` | Public | ✅ Clear session cookie |
| `GET /api/truck-details` | **Removed** | — | Replaced by SSR + `GET /api/seller/vehicles/[id]` — **Phase 3** |
| `POST /api/truck-details` | `PATCH /api/seller/vehicles/[vehicleId]` | Seller | Partial update; Zod-validated body — **Phase 3** |
| `POST /api/inquiries` | `POST /api/inquiries` | Public | ✅ Already exists |
| `GET /api/admin/inquiries` | `GET /api/seller/inquiries` | Seller | Query params: `?vehicleId=` optional — **Phase 2** |
| `POST /api/upload` | `POST /api/seller/uploads` | Seller | Multipart; requires Storage bucket — **Phase 3** |
| `GET /api/admin/conversations` | `GET /api/seller/conversations` | Seller | Requires `?vehicleId=` — **Phase 4** |
| `GET /api/messages/:sessionId` | `GET /api/messages/[sessionId]` | Public* | *Scope to session — **Phase 4** |
| `POST /api/admin/read/:sessionId` | `POST /api/seller/messages/[sessionId]/read` | Seller | Mark buyer messages read — **Phase 4** |
| Socket.io `join_admin` | TBD (Phase 4) | Seller token | See §1.5 |
| Socket.io `send_message` | TBD (Phase 4) | Buyer or seller | Persist to `messages` with `vehicleId` |

### 3.2 New Route Specifications

#### `GET /api/seller/inquiries`

- **Auth:** Required (Bearer Firebase ID token)
- **Query:** `vehicleId` (optional; if omitted return all inquiries for seller's vehicles)
- **Logic:** `inquiries.where('sellerId', '==', uid)` [`.where('vehicleId', '==', vehicleId)`]
- **Response:** `InquiryRecord[]` sorted by `timestamp` desc
- **Replaces:** `GET /api/admin/inquiries`

#### `PATCH /api/seller/vehicles/[vehicleId]`

- **Auth:** Required + `assertVehicleOwner`
- **Body:** `VehicleDashboardUpdateSchema` (flat or partial nested — see §4)
- **Logic:** Map DTO → nested Firestore fields; `merge: true` update on `vehicles/{vehicleId}`
- **Response:** `{ success: true }` or updated vehicle
- **Replaces:** `POST /api/truck-details`
- **Does NOT allow changing:** `sellerId`, `createdAt`, `id`

#### `GET /api/seller/vehicles/[vehicleId]`

- **Auth:** Required + owner check
- **Response:** Full `VehicleResponse` or dashboard form DTO
- **Use case:** Client-side revalidation after save (optional if SSR-only)

#### `GET /api/seller/vehicles`

- **Auth:** Required
- **Response:** List of seller's vehicles (for `/seller` picker page)
- **Logic:** `vehicles.where('sellerId', '==', uid)`

#### `POST /api/seller/uploads`

- **Auth:** Required + owner check via `vehicleId` in FormData
- **Body:** `multipart/form-data` field `file`; max 5 MB; PDF/PNG/JPEG/WebP
- **Logic:** Upload to `documents/{vehicleId}/{timestamp}-{uuid}.{ext}`; return `{ url }`
- **Replaces:** `POST /api/upload`
- **Requires:** Firebase Storage bucket in Admin SDK init (copy pattern from old `src/server/firebase-admin.ts`)

#### `GET /api/seller/conversations`

- **Auth:** Required
- **Query:** `vehicleId` (required)
- **Logic:** Aggregate latest message per `sessionId` where `vehicleId` matches; compute `unreadCount`
- **Replaces:** `GET /api/admin/conversations`

#### `GET /api/messages/[sessionId]`

- **Auth:** Public for buyer session continuity; validate session belongs to known vehicle
- **Logic:** `messages.where('sessionId', '==', sessionId).orderBy('timestamp')`
- **Replaces:** `GET /api/messages/:sessionId`
- **Index required:** composite on `(sessionId, timestamp)`

#### `POST /api/seller/messages/[sessionId]/read`

- **Auth:** Required + seller owns the vehicle tied to session
- **Replaces:** `POST /api/admin/read/:sessionId`

#### `POST /api/messages` (new — if not using Socket.io)

- **Auth:** Public (buyer) or seller
- **Body:** `SocketMessageSchema` + `vehicleId`
- **Alternative to** Socket.io `send_message` for polling/SSE approach

### 3.3 Firestore Collection Changes

| Collection | Old shape | New shape |
|------------|-----------|-----------|
| `truckDetails` | Single doc `main` | **Deprecated** — data lives on `vehicles/{id}` |
| `inquiries` | No vehicle scope | Already has `vehicleId`, `sellerId` ✅ |
| `messages` | No vehicle scope | **Add** `vehicleId: string` on every message |

### 3.4 Dependencies to Add (`package.json`)

| Package | Purpose | Phase |
|---------|---------|-------|
| `firebase` | Client Auth SDK | 1 |
| `socket.io`, `socket.io-client` | Live chat (if Option A/B) | 4 |
| — | Multipart parsing via Astro `Request.formData()` | 3 (no multer needed) |

---

## 4. Schema Updates

Existing `src/schemas/index.ts` defines the **public listing model** (`VehicleSchema`). The dashboard needs additional schemas for **form editing**, **API responses**, and **chat** — without loosening the public vehicle contract.

### 4.1 Schemas to Add

#### `InquiryRecordSchema`

```typescript
// Extends persisted inquiry with document id
InquiryRecordSchema = InquirySchema.extend({
  id: z.string(),
  timestamp: z.string().datetime(),
});
```

Already partially covered — `InquirySchema` exists but lacks `id`/`timestamp` response shape.

#### `VehicleFormStateSchema` (flat dashboard DTO)

Port of old `truckDetailsSchema` with intentional string fields for form inputs:

| Field | Type | Maps to |
|-------|------|---------|
| `mileage` | string | `vehicle.mileage` (parse int, strip commas) |
| `price` | string | `vehicle.price` (parse number) |
| `subtitle` | string? | `sellersNote.subtitle` |
| `msrp` | string? | `sellersNote.originalMsrp` (parse currency) |
| `sellersNoteIntro` | string? | `sellersNote.intro` |
| `peaceOfMindText` | string? | `sellersNote.blocks[0].body` (title/icon preserved) |
| `maintenanceText` | string? | `sellersNote.blocks[1].body` |
| `utilityTowingText` | string? | `sellersNote.blocks[2].body` |
| `luxuryOptionsText` | string? | `sellersNote.blocks[3].body` |
| `ctaText` | string? | `sellersNote.ctaText` |
| `mechanicalIntegrityIntro` | string? | `mechanicalIntegrity.intro` |
| `mechanicalItem{1-3}Title/Text` | string? | `mechanicalIntegrity.items[n]` |
| `marketValuationIntro` | string? | `marketValuation.intro` |
| `marketDealerReality` | string? | `marketValuation.dealerReality` |
| `marketKbbValue` | string? | `marketValuation.kbbValue` |
| `marketThisTruck` | string? | `marketValuation.thisTruck` |
| `highlight{1-4}Title/Text` | string? | **Gap — see §4.2** |
| `videoUrl`, `videoPosterUrl` | string? | top-level vehicle fields |
| `windowStickerUrl`, etc. | string? | `documents.*` |

#### `VehicleDashboardUpdateSchema`

Partial version of mapped nested fields for `PATCH` handler. Validate what the dashboard can edit; reject unknown keys.

#### `MessageSchema` / `ConversationSchema`

```typescript
MessageSchema = z.object({
  id: z.string(),
  sessionId: z.string().min(1).max(100),
  vehicleId: z.string().min(1),       // NEW — required in multi-tenant
  sender: z.enum(['buyer', 'seller']),
  content: z.string().min(1).max(2000),
  timestamp: z.string().datetime(),
  isRead: z.number().int().min(0).max(1).optional(),
});

ConversationSchema = MessageSchema.extend({
  unreadCount: z.number().int().nonnegative(),
});
```

#### `SocketMessageSchema`

Port from old repo unchanged, plus `vehicleId`:

```typescript
SocketMessageSchema = z.object({
  sessionId: z.string().min(1).max(100),
  vehicleId: z.string().min(1),
  sender: z.enum(['buyer', 'seller']),
  content: z.string().min(1).max(2000),
});
```

#### `UploadResponseSchema`

```typescript
UploadResponseSchema = z.object({ url: documentUrl });
```

### 4.2 Schema Gaps & Field Mapping Issues

These old dashboard fields **do not have a direct home** in the current `VehicleSchema`:

| Old field | Issue | Recommended resolution |
|-----------|-------|------------------------|
| `highlight1Title` … `highlight4Text` | New platform uses `features: string[]` (title only, no body) on the listing page | **Option A (preferred):** Add `VehicleHighlightSchema = { title, text }` and `highlights: VehicleHighlightSchema[]` optional on `VehicleSchema`. **Option B:** Map to extra `sellersNote.blocks` (overloads pitch section). **Option C:** Drop highlight bodies in v1 |
| `marketValuation.comparisons[]` | Dashboard editor has no UI for chart data points | Keep seeded/static for v1; add read-only note in editor or separate "Market Chart Data" sub-form in Phase 5 |
| `maintenance[]` records | Dashboard editor has no UI (only free-text maintenance block) | Out of scope for initial port; edit via Firebase console or future phase |
| `galleryPhotos`, `images[]`, `specs`, `features[]`, `tags`, `location` | Not in old dashboard | Add "Listing Basics" editor phase later |
| `windowStickerBreakdown` | Not in old dashboard editor | Seed-only for now; future editor phase |

### 4.3 Mapper Functions (new `src/lib/vehicle-form-mapper.ts`)

Implement bidirectional conversion:

- `vehicleToFormState(vehicle: VehicleResponse): VehicleFormState`
- `formStateToVehiclePatch(state: VehicleFormState): Partial<Vehicle>`

**Parsing rules:**
- `mileage`: strip `,`, parse integer
- `price` / `msrp`: strip `$` and `,`, parse number
- Pitch blocks: preserve existing `icon` and `title` when updating `body` from form fields; use default titles from seed if missing
- Documents: map URL fields to `documents.windowSticker`, etc.

### 4.4 Schemas NOT in `index.ts` Today (summary checklist)

- [ ] `InquiryRecordSchema`
- [ ] `VehicleFormStateSchema`
- [ ] `VehicleDashboardUpdateSchema`
- [ ] `MessageSchema`
- [ ] `ConversationSchema`
- [ ] `SocketMessageSchema`
- [ ] `UploadResponseSchema`
- [ ] `VehicleHighlightSchema` + extend `VehicleSchema` (if Option A chosen)

---

## 5. Phased Execution Plan

Execute in order. Each phase has entry criteria, deliverables, and acceptance checks. **Do not skip Phase 1** — later phases assume auth and ownership checks exist.

---

### Phase 1 — Auth & Routing

**Goal:** Seller can log in and reach a protected dashboard shell; no editing yet.

**Status:** ✅ **Complete** (2026-07-04)

**Entry criteria:** None

**Tasks:**

- [x] Add `firebase` client SDK; create `src/lib/firebase-client.ts` (env: `PUBLIC_FIREBASE_*` vars).
- [x] Extend `src/lib/firebase-admin.ts` with `auth()` export for token verification.
- [x] Create `src/lib/auth.ts` with `requireSeller(request)` → `{ uid, email? }` or 401 Response.
- [x] Create session API: `POST /api/auth/session`, `POST /api/auth/logout` (httpOnly `__session` cookie).
- [x] Create `src/pages/login.astro` mounting `AuthForm` island (sign in + create account).
- [x] Create `src/pages/account/index.astro` (protected account hub).
- [x] Create `src/pages/seller/index.astro` — vehicle picker, empty state, single-vehicle redirect.
- [x] Create `src/pages/seller/vehicles/[vehicleId].astro` — ownership check, `SellerVehicleShell`.
- [x] Port `SellerLayout.tsx` (sign-out via `/api/auth/logout` → `/login`).
- [x] Add `.env.example` entries for Firebase client + admin config.
- [x] Legacy `/seller/login` → 301 redirect to `/login`.
- [x] `AccountUidBanner` on `/account` and `/seller` for Firestore `sellerId` linking.
- [x] Dev seed `USER_ID` aligned to real Firebase Auth UID.

**Deliverables:**
- `/login`, `/account`, `/seller`, `/seller/vehicles/[vehicleId]` routes
- Session cookie auth for SSR-protected pages

**Acceptance:**
- [x] Unauthenticated visit to `/seller/vehicles/seed-ram-1500` redirects to `/login`
- [x] After login, user lands on `/account`; seller dashboard reachable from account hub
- [x] Non-owner token cannot access another seller's vehicle (403)
- [x] `npm run build` passes

#### Completion Record

| Field | Value |
|-------|-------|
| Completed by | Agent + user (seed UID alignment) |
| Date | 2026-07-04 |
| Notes | Unified marketplace auth added beyond original Phase 1 scope: `AuthForm`, `/account`, `/api/auth/*`. Dashboard tabs are placeholders in `SellerVehicleShell` pending Phases 2–4. |

---

### Phase 2 — Read-Only UI (Inquiries Tab)

**Goal:** Dashboard displays real inquiry data SSR'd from Firestore.

**Status:** 🔜 **Next**

**Entry criteria:** Phase 1 complete ✅

**Tasks:**

1. Add `InquiryRecordSchema` to `src/schemas/index.ts`.
2. Implement `GET /api/seller/inquiries` with auth + optional `vehicleId` filter.
3. Port `InquiriesPanel.tsx` to `src/islands/seller/InquiriesPanel.tsx`.
4. Port `SellerDashboard.tsx` — wire Inquiries tab only; accept `initialInquiries` prop.
5. In `[vehicleId].astro` frontmatter: query inquiries, pass props.
6. Remove client `useEffect` fetch for inquiries.

**Deliverables:**
- Inquiries tab shows seeded contact form submissions for the vehicle
- Empty state matches old UI

**Acceptance:**
- Submitting via public `ContactForm` on `/vehicles/seed-ram-1500` appears in seller dashboard after refresh
- Inquiry count badge in header reflects SSR data

---

### Phase 3 — Forms & Mutations (Details Tab)

**Goal:** Seller can edit listing content and upload documents.

**Entry criteria:** Phase 2 complete

**Tasks:**

1. Add `VehicleFormStateSchema`, `VehicleDashboardUpdateSchema`, `UploadResponseSchema`.
2. Resolve highlight field gap (§4.2 Option A recommended).
3. Create `src/lib/vehicle-form-mapper.ts` bidirectional mappers.
4. Extend Firebase Admin with Storage bucket (`FIREBASE_STORAGE_BUCKET` env).
5. Implement `PATCH /api/seller/vehicles/[vehicleId]`.
6. Implement `POST /api/seller/uploads`.
7. Port `DetailsEditor.tsx` and `DocumentUploadFields.tsx`.
8. Create `src/lib/seller-api.ts` (`updateVehicle`, `uploadDocument`).
9. SSR: map vehicle → `initialFormState` in Astro frontmatter.
10. Verify public `/vehicles/[id]` reflects saved changes on reload.

**Deliverables:**
- Full Details tab functional
- Documents upload to Storage; URLs persist on vehicle doc

**Acceptance:**
- Changing price/mileage/seller's note text updates the public listing page
- PDF upload ≤ 5 MB succeeds; document section renders on listing
- Invalid payloads return 400 with Zod field errors
- PATCH rejected if `sellerId` doesn't match token

---

### Phase 4 — Live Chat

**Goal:** Parity with old `ChatPanel` + `ChatWidget` messaging.

**Entry criteria:** Phase 3 complete; transport decision made (§1.5)

**Tasks:**

1. Add `MessageSchema`, `ConversationSchema`, `SocketMessageSchema`.
2. Add `vehicleId` to all new messages (migration script for any legacy data optional).
3. Deploy Firestore composite index: `messages` — `sessionId ASC, timestamp ASC`.
4. Implement conversation + message REST endpoints (§3.2).
5. Port `useSocket.ts` and `ChatPanel.tsx`; wire seller admin room with auth.
6. Update `ChatWidget.tsx`: persist messages, connect socket, pass `vehicleId`.
7. Hide or enable Chat tab based on transport readiness.

**Deliverances:**
- Buyer message appears in seller ChatPanel in real time
- Seller reply appears in buyer ChatWidget
- Unread counts update; mark-read works

**Acceptance:**
- End-to-end chat works across two browser sessions
- Conversations scoped per `vehicleId` (seller with two listings sees separate inboxes)

---

### Phase 5 — Multi-Vehicle UX & Hardening

**Goal:** Production-ready seller experience across listings.

**Entry criteria:** Phase 4 complete (or Phase 3 if chat deferred)

**Tasks:**

1. `/seller` vehicle picker UI (cards linking to `/seller/vehicles/[id]`). ✅ Done in Phase 1
2. Optional: edit fields not in old dashboard (`images`, `specs`, `features`, `status`).
3. Optional: market chart comparison point editor.
4. Add `GET /api/health`.
5. Rate-limit seller mutations if needed.
6. Vitest/Playwright: login → view inquiries → save details smoke test.
7. Document env vars and deploy steps in README.

**Acceptance:**
- Seller with two seeded vehicles can manage each independently
- CI smoke test passes

---

## 6. Environment Variables

Consolidate from old `.env.example` and new platform needs:

| Variable | Used by | Notes |
|----------|---------|-------|
| `FIREBASE_PROJECT_ID` | Admin | Existing |
| `FIRESTORE_DATABASE_ID` | Admin | Existing |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin | Existing |
| `GOOGLE_APPLICATION_CREDENTIALS` | Admin | Local dev |
| `FIREBASE_STORAGE_BUCKET` | Admin uploads | **New** — copy from old repo pattern |
| `PUBLIC_FIREBASE_API_KEY` | Client Auth | **New** |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Client Auth | **New** |
| `PUBLIC_FIREBASE_PROJECT_ID` | Client Auth | **New** |
| `PUBLIC_FIREBASE_APP_ID` | Client Auth | **New** |
| `PUBLIC_SOCKET_URL` | Client socket | Phase 4, if separate service |

---

## 7. Risk Register

| Risk | Mitigation |
|------|------------|
| Flat `TruckDetails` → nested `Vehicle` mapping loses data | Write unit tests for mapper using seed RAM vehicle |
| Astro has no native Socket.io | Decide transport in Phase 4 kickoff; defer chat tab if blocked |
| `features[]` vs `highlight` title/body mismatch | Add `highlights` schema (§4.2 Option A) before Phase 3 |
| Firebase Storage not init'd in new Admin SDK | Phase 3 prerequisite; copy old `getStorage` setup |
| Dashboard edits break `VehicleSchema` validation on public page | Validate patch against partial schema; run full schema on read |
| Single-instance rate limiter | Accept for dev; document Redis need for multi-instance prod |

---

## 8. Out of Scope (This Migration)

- Migrating `truckDetails/main` production data automatically (write one-off script separately)
- Buyer-facing landing page changes (already on Astro SSR)
- PostgreSQL/Drizzle remnants (already absent from new repo)
- Admin super-user role across all sellers
- Payment, listing creation wizard

---

## 9. File Checklist (Target State)

**Legend:** ✅ exists · ⬜ not yet built

```
src/
├── islands/
│   ├── AuthForm.tsx                 ✅ (replaces SellerLogin)
│   ├── SellerDashboard.tsx          ⬜ Phase 2
│   ├── seller/
│   │   ├── SellerLayout.tsx         ✅
│   │   ├── SellerVehicleShell.tsx   ✅ (placeholder tabs; replace in Phase 2)
│   │   ├── ChatPanel.tsx            ⬜ Phase 4
│   │   ├── InquiriesPanel.tsx       ⬜ Phase 2
│   │   ├── DetailsEditor.tsx        ⬜ Phase 3
│   │   └── DocumentUploadFields.tsx ⬜ Phase 3
│   ├── hooks/
│   │   └── useSocket.ts             ⬜ Phase 4
│   └── types.ts
├── components/
│   └── AccountUidBanner.astro       ✅
├── lib/
│   ├── auth.ts                      ✅
│   ├── firebase-client.ts           ✅
│   ├── firebase-admin.ts            ✅ auth(); Storage ⬜ Phase 3
│   ├── seller-api.ts                ⬜ Phase 3
│   └── vehicle-form-mapper.ts       ⬜ Phase 3
├── pages/
│   ├── login.astro                  ✅
│   ├── account/
│   │   └── index.astro              ✅
│   ├── seller/
│   │   ├── login.astro              ✅ (301 → /login)
│   │   ├── index.astro              ✅
│   │   └── vehicles/
│   │       └── [vehicleId].astro    ✅
│   └── api/
│       ├── auth/
│       │   ├── session.ts           ✅
│       │   └── logout.ts            ✅
│       ├── health.ts                ⬜ Phase 5
│       ├── messages/
│       │   └── [sessionId].ts       ⬜ Phase 4
│       └── seller/
│           ├── inquiries.ts         ⬜ Phase 2
│           ├── uploads.ts           ⬜ Phase 3
│           ├── conversations.ts     ⬜ Phase 4
│           ├── vehicles/
│           │   ├── index.ts
│           │   └── [vehicleId].ts   ⬜ Phase 3
│           └── messages/
│               └── [sessionId]/
│                   └── read.ts      ⬜ Phase 4
└── schemas/
    └── index.ts                     ⬜ InquiryRecordSchema Phase 2; form schemas Phase 3
```

---

## 10. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-04 | Initial migration blueprint from 2017RAM1500 analysis |
| 1.1 | 2026-07-04 | Phase 1 complete; unified marketplace auth (`/login`, `/account`, `AuthForm`, `/api/auth/*`); seed UID alignment; Phase 2 marked as next |

---

*This document is the source of truth for the seller dashboard port. Update it when architectural decisions (especially chat transport and highlight schema) are finalized.*
