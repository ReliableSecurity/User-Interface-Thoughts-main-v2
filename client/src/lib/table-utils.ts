import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState<T extends string> {
  field: T;
  direction: SortDirection;
}

export interface UseTableSortResult<T extends string> {
  sortField: T;
  sortDirection: SortDirection;
  toggleSort: (field: T) => void;
  getSortIcon: (field: T) => "asc" | "desc" | null;
}

export function useTableSort<T extends string>(
  defaultField: T,
  defaultDirection: SortDirection = "asc"
): UseTableSortResult<T> {
  const [sortField, setSortField] = useState<T>(defaultField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const toggleSort = useCallback((field: T) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  const getSortIcon = useCallback((field: T): "asc" | "desc" | null => {
    if (sortField !== field) return null;
    return sortDirection;
  }, [sortField, sortDirection]);

  return { sortField, sortDirection, toggleSort, getSortIcon };
}

export interface FilterState {
  [key: string]: string;
}

export interface UseTableFiltersResult {
  filters: FilterState;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useTableFilters(initialFilters: FilterState = {}): UseTableFiltersResult {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    const cleared: FilterState = {};
    Object.keys(filters).forEach(key => { cleared[key] = "all"; });
    setFilters(cleared);
  }, [filters]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v !== "all" && v !== "");
  }, [filters]);

  return { filters, setFilter, clearFilters, hasActiveFilters };
}

export function useTableSearch(debounceMs = 0) {
  const [search, setSearch] = useState("");
  
  return { search, setSearch };
}

export function getUniqueValues<T, K extends keyof T>(
  items: T[],
  key: K
): string[] {
  const values = new Set(
    items.map(item => item[key]).filter(Boolean) as string[]
  );
  return Array.from(values).sort();
}

export function sortItems<T>(
  items: T[],
  field: keyof T,
  direction: SortDirection,
  customComparator?: (a: T, b: T, field: keyof T) => number
): T[] {
  return [...items].sort((a, b) => {
    if (customComparator) {
      const result = customComparator(a, b, field);
      return direction === "desc" ? -result : result;
    }
    
    const aVal = a[field];
    const bVal = b[field];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    let comparison = 0;
    if (typeof aVal === "string" && typeof bVal === "string") {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return direction === "desc" ? -comparison : comparison;
  });
}

export function filterItems<T>(
  items: T[],
  search: string,
  searchFields: (keyof T)[],
  filters: Record<string, { field: keyof T; value: string }>
): T[] {
  let result = items;

  if (search) {
    const lowerSearch = search.toLowerCase();
    result = result.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(lowerSearch);
      })
    );
  }

  Object.entries(filters).forEach(([, config]) => {
    if (config.value && config.value !== "all") {
      result = result.filter(item => String(item[config.field]) === config.value);
    }
  });

  return result;
}
