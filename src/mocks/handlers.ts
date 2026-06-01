import { HttpResponse, http } from "msw";
import type { Category } from "@/db/schema/categories";
import type { Entry } from "@/db/schema/entries";
import type { ProductHint } from "@/db/schema/product-hints";
import type { Product } from "@/db/schema/products";

export const mockProducts: Product[] = [
  {
    id: 1,
    name: "Whole Milk",
    unit: "L",
    categoryId: 1,
    householdId: "hh-1",
    barcode: null,
    createdAt: new Date("2026-05-01"),
  },
  {
    id: 2,
    name: "Chicken Breast",
    unit: "kg",
    categoryId: 2,
    householdId: "hh-1",
    barcode: null,
    createdAt: new Date("2026-05-01"),
  },
  {
    id: 3,
    name: "Bananas",
    unit: "pieces",
    categoryId: 3,
    householdId: "hh-1",
    barcode: null,
    createdAt: new Date("2026-05-01"),
  },
];

export const mockEntries: Entry[] = [
  {
    id: 1,
    productId: 1,
    quantity: 2,
    compartment: "fridge",
    expiryDate: new Date("2026-06-05"),
    createdBy: "user-1",
    householdId: "hh-1",
    createdAt: new Date("2026-05-20"),
    updatedAt: new Date("2026-05-20"),
  },
  {
    id: 2,
    productId: 2,
    quantity: 0.5,
    compartment: "freezer",
    expiryDate: new Date("2026-07-15"),
    createdBy: "user-1",
    householdId: "hh-1",
    createdAt: new Date("2026-05-21"),
    updatedAt: new Date("2026-05-21"),
  },
  {
    id: 3,
    productId: 3,
    quantity: 6,
    compartment: "pantry",
    expiryDate: null,
    createdBy: "user-1",
    householdId: "hh-1",
    createdAt: new Date("2026-05-22"),
    updatedAt: new Date("2026-05-22"),
  },
];

export const mockCategories: Category[] = [
  {
    id: 1,
    name: "Dairy",
    householdId: "hh-1",
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
  },
  {
    id: 2,
    name: "Meat & Fish",
    householdId: "hh-1",
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
  },
  {
    id: 3,
    name: "Fruits",
    householdId: "hh-1",
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
  },
];

export const mockProductHints: ProductHint[] = [
  { id: 1, namePattern: "milk", suggestedUnit: "L", suggestedCategory: "Dairy" },
  { id: 2, namePattern: "chicken", suggestedUnit: "kg", suggestedCategory: "Meat & Fish" },
];

export const handlers = [
  http.get("/api/products", ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    if (search) {
      const filtered = mockProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
      return HttpResponse.json(filtered);
    }
    return HttpResponse.json(mockProducts);
  }),

  http.post("/api/products", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const product: Product = {
      id: mockProducts.length + 1,
      name: body.name as string,
      unit: body.unit as Product["unit"],
      categoryId: (body.categoryId as number) ?? null,
      householdId: "hh-1",
      barcode: (body.barcode as string | undefined) ?? null,
      createdAt: new Date(),
    };
    return HttpResponse.json(product, { status: 201 });
  }),

  http.patch("/api/products/:id", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(params.id);
    const existing = mockProducts.find((p) => p.id === id) ?? mockProducts[0];
    return HttpResponse.json({ ...existing, ...body });
  }),

  http.get("/api/entries", ({ request }) => {
    const url = new URL(request.url);
    const compartment = url.searchParams.get("compartment");
    if (compartment) {
      const filtered = mockEntries.filter((e) => e.compartment === compartment);
      return HttpResponse.json(filtered);
    }
    return HttpResponse.json(mockEntries);
  }),

  http.post("/api/entries", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date();
    const entry: Entry = {
      id: mockEntries.length + 1,
      productId: body.productId as number,
      quantity: body.quantity as number,
      compartment: body.compartment as Entry["compartment"],
      expiryDate: body.expiryDate ? new Date(body.expiryDate as string) : null,
      createdBy: "user-1",
      householdId: "hh-1",
      createdAt: now,
      updatedAt: now,
    };
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.patch("/api/entries/:id", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const entry = { ...mockEntries[0], ...body };
    return HttpResponse.json(entry);
  }),

  http.delete("/api/entries/:id", () => {
    return HttpResponse.json({ success: true });
  }),

  http.post("/api/entries/decrease", async ({ request }) => {
    const body = (await request.json()) as { amount: number };
    return HttpResponse.json({ decreasedTotal: body.amount });
  }),

  http.get("/api/categories", () => {
    return HttpResponse.json(mockCategories);
  }),

  http.post("/api/categories", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const now = new Date();
    const category: Category = {
      id: mockCategories.length + 1,
      name: body.name,
      householdId: "hh-1",
      createdAt: now,
      updatedAt: now,
    };
    return HttpResponse.json(category, { status: 201 });
  }),

  http.get("/api/product-hints", ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    if (!name) {
      return HttpResponse.json({ error: "name query parameter is required" }, { status: 400 });
    }
    const filtered = mockProductHints.filter((h) => h.namePattern.includes(name.toLowerCase()));
    return HttpResponse.json(filtered);
  }),
];
