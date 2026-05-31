export type Range = "7d" | "30d" | "90d" | "12mo";
export type Granularity = "day" | "week" | "month";

export type ParsedRange = {
  range: Range;
  since: Date;
  granularity: Granularity;
  bucketCount: number;
};

export type BucketPoint = {
  bucket: string;
  total: number;
};

export const VALID_RANGES: readonly Range[] = ["7d", "30d", "90d", "12mo"] as const;
export const DEFAULT_RANGE: Range = "30d";

const isRange = (v: string): v is Range => (VALID_RANGES as readonly string[]).includes(v);

const subtractDays = (d: Date, days: number) => {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() - days);
  return out;
};

const subtractMonths = (d: Date, months: number) => {
  // Anchor to day=1 to avoid month-overflow (e.g. Mar 31 - 1mo → Mar 3).
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1));
  return out;
};

export const parseRange = (raw: string | null | undefined, now: Date): ParsedRange => {
  const range: Range = raw && isRange(raw) ? raw : DEFAULT_RANGE;

  switch (range) {
    case "7d":
      return { range, since: subtractDays(now, 7), granularity: "day", bucketCount: 7 };
    case "30d":
      return { range, since: subtractDays(now, 30), granularity: "day", bucketCount: 30 };
    case "90d":
      return { range, since: subtractDays(now, 90), granularity: "week", bucketCount: 13 };
    case "12mo":
      return { range, since: subtractMonths(now, 12), granularity: "month", bucketCount: 12 };
  }
};

const pad2 = (n: number) => n.toString().padStart(2, "0");

const isoWeek = (d: Date): { year: number; week: number } => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
};

const startOfIsoWeek = (d: Date): Date => {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = out.getUTCDay() || 7;
  out.setUTCDate(out.getUTCDate() - (dayNum - 1));
  return out;
};

export const bucketKey = (d: Date, granularity: Granularity): string => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  switch (granularity) {
    case "day":
      return `${y}-${pad2(m)}-${pad2(day)}`;
    case "week": {
      const { year, week } = isoWeek(d);
      return `${year}-W${pad2(week)}`;
    }
    case "month":
      return `${y}-${pad2(m)}`;
  }
};

export const fillBuckets = (
  partial: Map<string, number>,
  range: ParsedRange,
  now: Date
): BucketPoint[] => {
  const points: BucketPoint[] = [];

  if (range.granularity === "day") {
    for (let i = range.bucketCount - 1; i >= 0; i--) {
      const day = subtractDays(now, i);
      const key = bucketKey(day, "day");
      points.push({ bucket: key, total: partial.get(key) ?? 0 });
    }
    return points;
  }

  if (range.granularity === "week") {
    const start = startOfIsoWeek(subtractDays(now, 7 * (range.bucketCount - 1)));
    for (let i = 0; i < range.bucketCount; i++) {
      const cursor = new Date(start);
      cursor.setUTCDate(cursor.getUTCDate() + i * 7);
      const key = bucketKey(cursor, "week");
      points.push({ bucket: key, total: partial.get(key) ?? 0 });
    }
    return points;
  }

  for (let i = range.bucketCount - 1; i >= 0; i--) {
    const cursor = subtractMonths(now, i);
    const key = bucketKey(cursor, "month");
    points.push({ bucket: key, total: partial.get(key) ?? 0 });
  }
  return points;
};
