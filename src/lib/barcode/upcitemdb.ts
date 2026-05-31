export type UpcLookupResult = {
  name: string;
  brands?: string;
  categoriesTags?: string[];
  quantity?: string;
};

const BASE_URL = "https://api.upcitemdb.com/prod/trial/lookup";

export const buildUpcUrl = (code: string): string => `${BASE_URL}?upc=${encodeURIComponent(code)}`;

type UpcRawItem = {
  title?: string;
  brand?: string;
  category?: string;
  size?: string;
};

type UpcResponse = {
  code?: string;
  items?: UpcRawItem[];
};

export const normalizeUpcResponse = (raw: unknown): UpcLookupResult | null => {
  const data = raw as UpcResponse;
  if (data?.code !== "OK") return null;

  const item = data.items?.[0];
  if (!item) return null;

  const name = item.title?.trim();
  if (!name) return null;

  const result: UpcLookupResult = { name };
  if (item.brand) result.brands = item.brand;
  if (item.category) result.categoriesTags = [item.category];
  if (item.size) result.quantity = item.size;
  return result;
};
