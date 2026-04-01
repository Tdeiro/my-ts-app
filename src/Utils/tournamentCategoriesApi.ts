export type TournamentCategoryApiRecord = {
  id: number | string;
  eventId?: number | string;
  categoryId?: number | string;
  name?: string;
  level?: string;
  minAge?: number | string | null;
  maxAge?: number | string | null;
  gender?: string;
  teamsLimitSize?: number | string | null;
  price?: number | string | null;
  entryFee?: number | string | null;
  fee?: number | string | null;
  specialPrice?: number | string | null;
  currency?: string | null;
  structure?: unknown;
};

function toArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as { data?: unknown[] }).data)
  ) {
    return (body as { data: unknown[] }).data;
  }
  if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as { items?: unknown[] }).items)
  ) {
    return (body as { items: unknown[] }).items;
  }
  if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as { results?: unknown[] }).results)
  ) {
    return (body as { results: unknown[] }).results;
  }
  if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as { categories?: unknown[] }).categories)
  ) {
    return (body as { categories: unknown[] }).categories;
  }
  return [];
}

function normalizeCategoryItem(
  item: unknown,
): TournamentCategoryApiRecord | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const nested =
    raw.category && typeof raw.category === "object"
      ? (raw.category as Record<string, unknown>)
      : null;

  const source: Record<string, unknown> = nested ?? raw;
  const id = source.id ?? source.categoryId ?? raw.id ?? raw.categoryId;
  if (id == null) return null;

  const eventId = source.eventId ?? raw.eventId;
  const categoryId = source.categoryId ?? raw.categoryId;
  const name = source.name;
  const level = source.level;
  const minAge = source.minAge;
  const maxAge = source.maxAge;
  const gender = source.gender;
  const teamsLimitSize = source.teamsLimitSize;
  const price = source.price;
  const entryFee = source.entryFee;
  const fee = source.fee;
  const specialPrice = source.specialPrice;
  const currency = source.currency;

  return {
    id: id as number | string,
    eventId: eventId as number | string | undefined,
    categoryId: categoryId as number | string | undefined,
    name: typeof name === "string" ? name : undefined,
    level: typeof level === "string" ? level : undefined,
    minAge: minAge as number | string | null | undefined,
    maxAge: maxAge as number | string | null | undefined,
    gender: typeof gender === "string" ? gender : undefined,
    teamsLimitSize: teamsLimitSize as number | string | null | undefined,
    price: price as number | string | null | undefined,
    entryFee: entryFee as number | string | null | undefined,
    fee: fee as number | string | null | undefined,
    specialPrice: specialPrice as number | string | null | undefined,
    currency: (currency == null ? null : String(currency)) as
      | string
      | null
      | undefined,
    structure: source.structure,
  };
}

export function parseTournamentCategoriesResponse(
  body: unknown,
): TournamentCategoryApiRecord[] {
  return toArray(body)
    .map((item) => normalizeCategoryItem(item))
    .filter((item): item is TournamentCategoryApiRecord => Boolean(item));
}
