"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InquirySource } from "@prisma/client";
import {
  ALL_INQUIRY_SOURCES_SORTED,
  applyPipelineViewPrefsToParams,
  prefsFromSearchParams,
  serializePipelineViewPrefs,
  type PipelineGroupMode,
  type PipelineSortMode,
  type PipelineViewPrefs,
} from "@/lib/kanban-pipeline-view";

const DEBOUNCE_MS = 300;

type PipelineSearchContextValue = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  prefs: PipelineViewPrefs;
  setSortMode: (v: PipelineSortMode) => void;
  setGroupMode: (v: PipelineGroupMode) => void;
  setHideEmpty: (v: boolean) => void;
  toggleSource: (source: InquirySource, checked: boolean) => void;
};

const PipelineSearchContext = createContext<PipelineSearchContextValue | null>(
  null,
);

export function PipelineSearchProvider({
  initialQuery = "",
  children,
}: {
  initialQuery?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [prefs, setPrefs] = useState<PipelineViewPrefs>(() =>
    prefsFromSearchParams(searchParams),
  );

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const spRef = useRef(searchParams.toString());
  spRef.current = searchParams.toString();

  const replaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const buildAndReplace = useCallback(() => {
    const params = new URLSearchParams(spRef.current);
    const trimmed = searchQueryRef.current.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    applyPipelineViewPrefsToParams(params, prefsRef.current);
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  }, [pathname, router]);

  const armReplaceDebounce = useCallback(() => {
    if (replaceTimerRef.current) clearTimeout(replaceTimerRef.current);
    replaceTimerRef.current = setTimeout(() => {
      replaceTimerRef.current = null;
      buildAndReplace();
    }, DEBOUNCE_MS);
  }, [buildAndReplace]);

  const replaceNow = useCallback(() => {
    if (replaceTimerRef.current) {
      clearTimeout(replaceTimerRef.current);
      replaceTimerRef.current = null;
    }
    buildAndReplace();
  }, [buildAndReplace]);

  useEffect(
    () => () => {
      if (replaceTimerRef.current) clearTimeout(replaceTimerRef.current);
    },
    [],
  );

  // Typing in search shares the same debounced URL writer as source checkboxes.
  useEffect(() => {
    armReplaceDebounce();
    return () => {
      if (replaceTimerRef.current) {
        clearTimeout(replaceTimerRef.current);
        replaceTimerRef.current = null;
      }
    };
  }, [searchQuery, armReplaceDebounce]);

  // Adopt pipeline prefs from URL when userId, k*, q, etc. change outside this provider’s pending state.
  useEffect(() => {
    const fromUrl = prefsFromSearchParams(searchParams);
    setPrefs((prev) =>
      serializePipelineViewPrefs(fromUrl) === serializePipelineViewPrefs(prev)
        ? prev
        : fromUrl,
    );
  }, [searchParams]);

  const setSearchQueryStable = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const setSortMode = useCallback(
    (v: PipelineSortMode) => {
      setPrefs((prev) => {
        const next = { ...prev, sortMode: v };
        prefsRef.current = next;
        return next;
      });
      queueMicrotask(replaceNow);
    },
    [replaceNow],
  );

  const setGroupMode = useCallback(
    (v: PipelineGroupMode) => {
      setPrefs((prev) => {
        const next = { ...prev, groupMode: v };
        prefsRef.current = next;
        return next;
      });
      queueMicrotask(replaceNow);
    },
    [replaceNow],
  );

  const setHideEmpty = useCallback(
    (v: boolean) => {
      setPrefs((prev) => {
        const next = { ...prev, hideEmpty: v };
        prefsRef.current = next;
        return next;
      });
      queueMicrotask(replaceNow);
    },
    [replaceNow],
  );

  const toggleSource = useCallback(
    (source: InquirySource, checked: boolean) => {
      setPrefs((prev) => {
        const base =
          prev.sourcesAllowlist == null
            ? new Set<InquirySource>(ALL_INQUIRY_SOURCES_SORTED)
            : new Set(prev.sourcesAllowlist);
        if (checked) base.add(source);
        else base.delete(source);
        if (base.size === 0) return prev;
        const allow: Set<InquirySource> | null =
          base.size === ALL_INQUIRY_SOURCES_SORTED.length ? null : base;
        const next = { ...prev, sourcesAllowlist: allow };
        prefsRef.current = next;
        return next;
      });
      armReplaceDebounce();
    },
    [armReplaceDebounce],
  );

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery: setSearchQueryStable,
      prefs,
      setSortMode,
      setGroupMode,
      setHideEmpty,
      toggleSource,
    }),
    [
      searchQuery,
      setSearchQueryStable,
      prefs,
      setSortMode,
      setGroupMode,
      setHideEmpty,
      toggleSource,
    ],
  );

  return (
    <PipelineSearchContext.Provider value={value}>
      {children}
    </PipelineSearchContext.Provider>
  );
}

export function usePipelineSearch() {
  const ctx = useContext(PipelineSearchContext);
  if (!ctx) return null;
  return { searchQuery: ctx.searchQuery, setSearchQuery: ctx.setSearchQuery };
}

export function usePipelineViewPreferences(): Pick<
  PipelineSearchContextValue,
  "prefs" | "setSortMode" | "setGroupMode" | "setHideEmpty" | "toggleSource"
> | null {
  const ctx = useContext(PipelineSearchContext);
  if (!ctx) return null;
  return {
    prefs: ctx.prefs,
    setSortMode: ctx.setSortMode,
    setGroupMode: ctx.setGroupMode,
    setHideEmpty: ctx.setHideEmpty,
    toggleSource: ctx.toggleSource,
  };
}
