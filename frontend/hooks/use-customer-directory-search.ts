import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchCustomersDirectory } from "@/lib/customers-directory";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export type CustomerSearchRow = {
  id: string;
  companyName?: string;
  phone?: string;
  email?: string;
  ownerName?: string;
};

const SEARCH_LIMIT = 50;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

export function useCustomerDirectorySearch(query: string, enabled = true) {
  const debounced = useDebouncedValue(query, DEBOUNCE_MS);
  const term = debounced.trim();
  const canFetch = enabled && term.length >= MIN_CHARS;

  const result = useQuery({
    queryKey: ["customers-directory-search", term],
    queryFn: async () => {
      const data = await fetchCustomersDirectory<CustomerSearchRow>({
        q: term,
        limit: SEARCH_LIMIT,
        page: 1,
      });
      return data;
    },
    enabled: canFetch,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  return {
    ...result,
    debouncedTerm: term,
    minChars: MIN_CHARS,
    needsMoreChars: enabled && term.length > 0 && term.length < MIN_CHARS,
    isSearchReady: canFetch,
  };
}

export function customerToOption(c: CustomerSearchRow) {
  return {
    value: String(c.id),
    label: String(c.companyName ?? c.ownerName ?? "Unnamed customer"),
    sublabel: [c.phone, c.email].filter(Boolean).join(" · ") || undefined,
  };
}
