import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type QuerySnapshot = { queryKey: QueryKey; data: unknown };

export function snapshotQueries(
  client: QueryClient,
  keys: QueryKey[],
): QuerySnapshot[] {
  return keys.map((queryKey) => ({
    queryKey,
    data: client.getQueryData(queryKey),
  }));
}

export function restoreQueries(client: QueryClient, snapshots: QuerySnapshot[]) {
  for (const { queryKey, data } of snapshots) {
    if (data === undefined) {
      client.removeQueries({ queryKey, exact: true });
    } else {
      client.setQueryData(queryKey, data);
    }
  }
}

type ListPage<T> = { data?: T[]; items?: T[]; total?: number };

function getListItems<T>(data: unknown): T[] | null {
  if (!data) return null;
  if (Array.isArray(data)) return data as T[];
  const page = data as ListPage<T>;
  if (Array.isArray(page.data)) return page.data;
  if (Array.isArray(page.items)) return page.items;
  return null;
}

function setListData<T>(data: unknown, items: T[]): unknown {
  if (Array.isArray(data)) return items;
  const page = data as ListPage<T>;
  if (Array.isArray(page.data)) {
    return { ...page, data: items, total: (page.total ?? items.length) + (items.length - page.data.length) };
  }
  if (Array.isArray(page.items)) {
    return { ...page, items, total: (page.total ?? items.length) + (items.length - page.items.length) };
  }
  return items;
}

export function patchListItem<T extends { id: string | number } & Record<string, unknown>>(
  client: QueryClient,
  queryKey: QueryKey,
  id: string | number,
  patch: Partial<T>,
) {
  client.setQueryData(queryKey, (old: unknown) => {
    const items = getListItems<T>(old);
    if (!items) return old;
    const next = items.map((item) =>
      String(item.id) === String(id) ? { ...item, ...patch } : item,
    );
    return setListData(old, next);
  });
}

export function patchDetailItem<T extends Record<string, unknown>>(
  client: QueryClient,
  queryKey: QueryKey,
  patch: Partial<T>,
) {
  client.setQueryData(queryKey, (old: T | undefined) =>
    old ? { ...old, ...patch } : old,
  );
}

export function appendDetailListItem<T>(
  client: QueryClient,
  queryKey: QueryKey,
  listKey: string,
  item: T,
) {
  client.setQueryData(queryKey, (old: Record<string, unknown> | undefined) => {
    if (!old) return old;
    const list = old[listKey];
    const next = Array.isArray(list) ? [item, ...list] : [item];
    return { ...old, [listKey]: next };
  });
}

export function appendListItem<T extends { id: string | number }>(
  client: QueryClient,
  queryKey: QueryKey,
  item: T,
) {
  client.setQueryData(queryKey, (old: unknown) => {
    const items = getListItems<T>(old);
    if (!items) return old;
    return setListData(old, [item, ...items]);
  });
}

export function removeListItem<T extends { id: string | number }>(
  client: QueryClient,
  queryKey: QueryKey,
  id: string | number,
) {
  client.setQueryData(queryKey, (old: unknown) => {
    const items = getListItems<T>(old);
    if (!items) return old;
    return setListData(
      old,
      items.filter((item) => String(item.id) !== String(id)),
    );
  });
}

export function replaceListItemId<T extends { id: string | number }>(
  client: QueryClient,
  queryKey: QueryKey,
  tempId: string | number,
  item: T,
) {
  client.setQueryData(queryKey, (old: unknown) => {
    const items = getListItems<T>(old);
    if (!items) return old;
    const next = items.map((row) =>
      String(row.id) === String(tempId) ? item : row,
    );
    return setListData(old, next);
  });
}

export function moveKanbanCard<T extends { id: string | number }>(
  client: QueryClient,
  queryKey: QueryKey,
  cardId: string | number,
  fromStatus: string,
  toStatus: string,
  statuses: readonly string[],
) {
  client.setQueryData(queryKey, (old: Record<string, T[]> | undefined) => {
    if (!old) return old;
    const next: Record<string, T[]> = { ...old };
    for (const status of statuses) {
      next[status] = [...(old[status] ?? [])];
    }
    const fromList = next[fromStatus] ?? [];
    const card = fromList.find((c) => String(c.id) === String(cardId));
    if (!card) return old;
    next[fromStatus] = fromList.filter((c) => String(c.id) !== String(cardId));
    next[toStatus] = [{ ...card, status: toStatus } as T, ...(next[toStatus] ?? [])];
    return next;
  });
}

export const TEMP_ID_PREFIX = "optimistic-";

export function createTempId() {
  return `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isTempId(id: string | number) {
  return String(id).startsWith(TEMP_ID_PREFIX);
}

function forMatchingQueries(
  client: QueryClient,
  queryKeyPrefix: QueryKey,
  fn: (key: QueryKey) => void,
) {
  for (const query of client.getQueryCache().findAll({ queryKey: queryKeyPrefix })) {
    fn(query.queryKey);
  }
}

export function appendToMatchingLists<T extends { id: string | number }>(
  client: QueryClient,
  queryKeyPrefix: QueryKey,
  item: T,
) {
  forMatchingQueries(client, queryKeyPrefix, (key) => appendListItem(client, key, item));
}

export function patchMatchingListItems<T extends { id: string | number } & Record<string, unknown>>(
  client: QueryClient,
  queryKeyPrefix: QueryKey,
  id: string | number,
  patch: Partial<T>,
) {
  forMatchingQueries(client, queryKeyPrefix, (key) => patchListItem(client, key, id, patch));
}

export function replaceMatchingListItemId<T extends { id: string | number }>(
  client: QueryClient,
  queryKeyPrefix: QueryKey,
  tempId: string | number,
  item: T,
) {
  forMatchingQueries(client, queryKeyPrefix, (key) =>
    replaceListItemId(client, key, tempId, item),
  );
}
