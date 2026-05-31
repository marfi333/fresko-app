# REST API routes over Server Actions

We use standard Next.js API route handlers with TanStack Query instead of Server Actions for all data operations. The primary driver is the future PWA/offline requirement — service workers can intercept and queue standard HTTP requests but cannot intercept Server Action calls. Secondary benefits: consistent mental model (every operation is a fetch to a URL), TanStack Query's cache invalidation and optimistic updates work naturally with HTTP endpoints, and API routes are independently testable.

The trade-off is more boilerplate per endpoint compared to Server Actions, and no automatic form progressive enhancement. Acceptable for an app that requires JavaScript anyway (TanStack Query, offline sync).
