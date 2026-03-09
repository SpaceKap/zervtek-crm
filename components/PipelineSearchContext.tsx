"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PipelineSearchContext = createContext<{
  searchQuery: string;
  setSearchQuery: (value: string) => void;
} | null>(null);

const DEBOUNCE_MS = 300;

export function PipelineSearchProvider({
  initialQuery = "",
  children,
}: {
  initialQuery?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = searchQuery.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const url = `/dashboard/kanban?${params.toString()}`;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      router.replace(url);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, router, searchParams]);

  const setSearchQueryStable = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  return (
    <PipelineSearchContext.Provider
      value={{ searchQuery, setSearchQuery: setSearchQueryStable }}
    >
      {children}
    </PipelineSearchContext.Provider>
  );
}

export function usePipelineSearch() {
  const ctx = useContext(PipelineSearchContext);
  return ctx;
}
