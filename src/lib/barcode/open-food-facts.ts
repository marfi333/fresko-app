import pkg from "../../../package.json" with { type: "json" };

export type OffLookupResult = {
  name: string;
  brands?: string;
  categoriesTags?: string[];
  quantity?: string;
};

const BASE_URL = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = "product_name,brands,categories_tags,quantity";

export const buildOffUrl = (code: string): string =>
  `${BASE_URL}/${encodeURIComponent(code)}.json?fields=${FIELDS}`;

export const buildOffUserAgent = (origin: string): string =>
  `Fresko - Web - ${pkg.version} - ${origin} - scan`;

type OffRawProduct = {
  product_name?: string;
  brands?: string;
  categories_tags?: unknown;
  quantity?: string;
};

type OffResponse = {
  status?: number;
  product?: OffRawProduct;
};

export const normalizeOffResponse = (raw: unknown): OffLookupResult | null => {
  const data = raw as OffResponse;
  if (data?.status !== 1 || !data.product) return null;

  const name = data.product.product_name?.trim();
  if (!name) return null;

  const result: OffLookupResult = { name };
  if (data.product.brands) result.brands = data.product.brands;
  if (Array.isArray(data.product.categories_tags)) {
    result.categoriesTags = data.product.categories_tags.filter(
      (t): t is string => typeof t === "string"
    );
  }
  if (data.product.quantity) result.quantity = data.product.quantity;

  return result;
};
