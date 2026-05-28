# Plan: MVP - Project Scaffolding & Core Inventory

## Phase 1: Project Foundation

<!-- execution: sequential -->

- [x] Task 1: Initialize Next.js 16 project with TypeScript, Tailwind CSS, pnpm
<!-- files: package.json, tsconfig.json, tailwind.config.ts, next.config.ts, src/app/layout.tsx, src/app/page.tsx -->
- [x] Task 2: Smoke-test Cloudflare Workers deployment (hello world via @opennextjs/cloudflare + wrangler)
<!-- files: wrangler.toml, open-next.config.ts -->
- [x] Task 3: Set up shadcn/ui with warm & organic theme (custom colors, typography, earth tones)
<!-- files: components.json, src/lib/utils.ts, src/app/globals.css, tailwind.config.ts -->
- [x] Task 4: Configure path aliases, ESLint, Prettier, Vitest
<!-- files: tsconfig.json, eslint.config.js, .prettierrc, vitest.config.ts, package.json -->
- [x] Task: Conductor - User Manual Verification 'Phase 1: Project Foundation' (Protocol in workflow.md)

## Phase 2: Database & ORM Setup

<!-- execution: sequential -->

- [x] Task 1: Install and configure Drizzle ORM with D1 bindings
<!-- files: src/db/index.ts, drizzle.config.ts, package.json -->
- [x] Task 2: Create database schema — products table (name, unit, category_id, household_id)
<!-- files: src/db/schema/products.ts, src/db/schema/index.ts -->
- [x] Task 3: Create database schema — entries table (product_id, quantity, compartment, expiry_date, created_by, household_id)
<!-- files: src/db/schema/entries.ts -->
- [x] Task 4: Create database schema — categories table (name, household_id) with seed script for predefined defaults
<!-- files: src/db/schema/categories.ts, src/db/seed.ts -->
- [x] Task 5: Create database schema — usage_events table (entry_id, product_id, quantity_delta, reason, user_id, timestamp, household_id)
<!-- files: src/db/schema/usage-events.ts -->
- [x] Task 6: Create database schema — product_hints table (name_pattern, suggested_unit, suggested_category) with seed data
<!-- files: src/db/schema/product-hints.ts, src/db/seed-hints.ts -->
- [x] Task 7: Define Drizzle relations between all tables
<!-- files: src/db/schema/relations.ts -->
- [x] Task 8: Generate and apply initial migration
<!-- files: drizzle/ -->
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Database & ORM Setup' (Protocol in workflow.md)

## Phase 3: Authentication

<!-- execution: sequential -->

- [x] Task 1: Install and configure Better Auth with D1 adapter and organization plugin (Household = Organization)
<!-- files: src/lib/auth.ts, src/lib/auth-client.ts, package.json -->
- [x] Task 2: Create auth API route handler
<!-- files: src/app/api/auth/[...all]/route.ts -->
- [x] Task 3: Build sign-up page (email/password) — atomically creates User + Household + seeds default categories
<!-- files: src/app/(auth)/sign-up/page.tsx, src/app/(auth)/sign-up/_components/sign-up-form.tsx -->
- [x] Task 4: Build sign-in page (email/password)
<!-- files: src/app/(auth)/sign-in/page.tsx, src/app/(auth)/sign-in/_components/sign-in-form.tsx -->
- [x] Task 5: Implement route protection via middleware.ts and session checks
<!-- files: src/middleware.ts -->
- [x] Task 6: Create auth hooks (useSession) and auth context provider
<!-- files: src/hooks/use-session.ts, src/providers/auth-provider.tsx -->
- [x] Task 7: Write integration tests for auth flow (sign-up creates household, session management)
<!-- files: src/lib/__tests__/auth.test.ts -->
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Authentication' (Protocol in workflow.md)

## Phase 4: App Shell & Layout

<!-- execution: sequential -->

- [x] Task 1: Create authenticated app layout with bottom navigation (mobile) and sidebar (desktop)
<!-- files: src/app/(app)/layout.tsx, src/app/(app)/_components/nav-bar.tsx, src/app/(app)/_components/sidebar.tsx -->
- [x] Task 2: Create navigation items (Inventory active, Shopping List placeholder, Analytics placeholder)
<!-- files: src/app/(app)/_components/nav-items.tsx -->
- [x] Task 3: Create shared UI components (page header, empty state, loading skeleton)
<!-- files: src/components/ui/page-header.tsx, src/components/ui/empty-state.tsx, src/components/ui/skeleton-list.tsx -->
- [ ] Task: Conductor - User Manual Verification 'Phase 4: App Shell & Layout' (Protocol in workflow.md)

## Phase 5: Inventory CRUD - Backend (API Routes + Tests)

<!-- execution: sequential -->

- [x] Task 1: Create Products API routes — GET /api/products (list, autocomplete search), POST /api/products (create)
<!-- files: src/app/api/products/route.ts, src/app/api/products/__tests__/route.test.ts -->
- [x] Task 2: Create Product Hints API route — GET /api/product-hints?name=X (lookup suggestions)
<!-- files: src/app/api/product-hints/route.ts, src/app/api/product-hints/__tests__/route.test.ts -->
- [x] Task 3: Create Entries API routes — GET /api/entries (list with compartment/category filters, aggregation), POST /api/entries (create entry, optionally create product in same request)
<!-- files: src/app/api/entries/route.ts, src/app/api/entries/__tests__/route.test.ts -->
- [x] Task 4: Create Entry mutation routes — PATCH /api/entries/[id] (update), DELETE /api/entries/[id] (delete + usage event)
<!-- files: src/app/api/entries/[id]/route.ts, src/app/api/entries/[id]/__tests__/route.test.ts -->
- [x] Task 5: Create quick-decrease route — POST /api/entries/decrease (product_id, amount → FEFO deduction + usage events)
<!-- files: src/app/api/entries/decrease/route.ts, src/app/api/entries/decrease/__tests__/route.test.ts -->
- [x] Task 6: Create Categories API routes — GET /api/categories, POST /api/categories, PATCH/DELETE /api/categories/[id]
<!-- files: src/app/api/categories/route.ts, src/app/api/categories/[id]/route.ts, src/app/api/categories/__tests__/route.test.ts -->
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Inventory CRUD - Backend' (Protocol in workflow.md)

## Phase 6: Inventory CRUD - Frontend

<!-- execution: sequential -->

- [x] Task 1: Create TanStack Query hooks — useProducts, useEntries, useCategories, useProductHints
<!-- files: src/hooks/use-products.ts, src/hooks/use-entries.ts, src/hooks/use-categories.ts, src/hooks/use-product-hints.ts -->
- [x] Task 2: Create mutation hooks — useCreateEntry, useDecreaseQuantity, useUpdateEntry, useDeleteEntry, useMarkAsWasted
<!-- files: src/hooks/use-entry-mutations.ts -->
- [x] Task 3: Set up MSW handlers for component tests
<!-- files: src/mocks/handlers.ts, src/mocks/server.ts -->
- [ ] Task 4: Build inventory list page with compartment tabs (All, Pantry, Fridge, Freezer) — aggregated Product rows with subtotals
<!-- files: src/app/(app)/inventory/page.tsx, src/app/(app)/inventory/_components/inventory-list.tsx, src/app/(app)/inventory/_components/compartment-tabs.tsx -->
- [ ] Task 5: Build Product row component (name, aggregated quantity, unit, compartment indicators on All tab, expiry warning badge)
<!-- files: src/app/(app)/inventory/_components/product-row.tsx -->
- [ ] Task 6: Build Product detail view — list of individual Entries (quantity, compartment, expiry, created_by)
<!-- files: src/app/(app)/inventory/[productId]/page.tsx, src/app/(app)/inventory/[productId]/_components/entry-list.tsx -->
- [ ] Task 7: Build Add Entry flow — autocomplete Product search, adaptive form (existing: locked unit/category; new: editable with Product Hint pre-fill), compartment selector, expiry date picker
<!-- files: src/app/(app)/inventory/_components/add-entry-dialog.tsx, src/app/(app)/inventory/_components/product-autocomplete.tsx, src/app/(app)/inventory/_components/entry-form.tsx -->
- [ ] Task 8: Build quick-decrease flow — tap minus → amount prompt bottom sheet → confirm
<!-- files: src/app/(app)/inventory/_components/decrease-sheet.tsx -->
- [ ] Task 9: Build Edit Entry dialog (quantity, compartment, expiry) in detail view
<!-- files: src/app/(app)/inventory/[productId]/_components/edit-entry-dialog.tsx -->
- [ ] Task 10: Build Delete Entry with confirmation + "Mark as wasted" action on expired entries
<!-- files: src/app/(app)/inventory/[productId]/_components/entry-actions.tsx -->
- [ ] Task 11: Add category filter (dropdown/chips alongside compartment tabs)
<!-- files: src/app/(app)/inventory/_components/category-filter.tsx -->
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Inventory CRUD - Frontend' (Protocol in workflow.md)
