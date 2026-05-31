"use client";

import { useMutation } from "@tanstack/react-query";
import type { Product } from "@/db/schema/products";

export type BarcodeLookupResult =
  | { kind: "existing"; barcode: string; product: Product }
  | {
      kind: "new-from-off";
      barcode: string;
      name: string;
      brands?: string;
      categoriesTags?: string[];
      quantity?: string;
    }
  | { kind: "new-blank"; barcode: string }
  | { kind: "error"; barcode: string };

type OffResponse = {
  name: string;
  brands?: string;
  categoriesTags?: string[];
  quantity?: string;
};

const lookup = async (barcode: string): Promise<BarcodeLookupResult> => {
  const local = await fetch(`/api/products/by-barcode?code=${encodeURIComponent(barcode)}`);
  if (local.ok) {
    const product = (await local.json()) as Product;
    return { kind: "existing", barcode, product };
  }
  if (local.status !== 404) {
    return { kind: "error", barcode };
  }

  const off = await fetch(`/api/barcode-lookup/${encodeURIComponent(barcode)}`);
  if (off.ok) {
    const data = (await off.json()) as OffResponse;
    return {
      kind: "new-from-off",
      barcode,
      name: data.name,
      brands: data.brands,
      categoriesTags: data.categoriesTags,
      quantity: data.quantity,
    };
  }
  if (off.status === 404) {
    return { kind: "new-blank", barcode };
  }
  return { kind: "error", barcode };
};

export const useBarcodeLookup = () =>
  useMutation<BarcodeLookupResult, Error, string>({
    mutationFn: lookup,
  });
