export const DEFAULT_PAGE_SIZE = 20;

/** Single-entity tabs (customer payments, projects per customer) without pagination UI. */
export const SCOPED_LIST_LIMIT = 50;
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const MAX_PAGE_SIZE = 100;

export type PaginatedResponse<T> = {
  data: T[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export function normalizePaginated<T>(raw: unknown): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    return {
      data: raw as T[],
      totalCount: raw.length,
      page: 1,
      totalPages: 1,
      limit: raw.length,
      hasMore: false,
    };
  }
  const obj = raw as PaginatedResponse<T>;
  return {
    data: Array.isArray(obj?.data) ? obj.data : [],
    totalCount: obj?.totalCount ?? 0,
    page: obj?.page ?? 1,
    totalPages: obj?.totalPages ?? 1,
    limit: obj?.limit ?? DEFAULT_PAGE_SIZE,
    nextCursor: obj?.nextCursor ?? null,
    hasMore: obj?.hasMore ?? false,
  };
}
