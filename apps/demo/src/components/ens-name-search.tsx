import type { FocusEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { Avatar } from "@thenamespace/uikit/avatar";
import { FieldError } from "@thenamespace/uikit/field-error";
import { SearchField } from "@thenamespace/uikit/search-field";
import { Spinner } from "@thenamespace/uikit/spinner";
import { normalize } from "viem/ens";

import type { EnsNameSuggestion } from "../data/ens-subgraph";
import { searchEnsNames } from "../data/ens-subgraph";
import { RelativeExpiry } from "./time-display";

const avatarUrl = (name: string) =>
  `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`;

const normalizeInput = (value: string) => {
  const input = value.trim();
  return normalize(input.includes(".") ? input : `${input}.eth`);
};

interface NameSuggestionProps {
  suggestion: EnsNameSuggestion;
  onSelect: (name: string) => void;
}

function NameSuggestion({ suggestion, onSelect }: NameSuggestionProps) {
  const handleClick = useCallback(
    () => onSelect(suggestion.name),
    [onSelect, suggestion.name],
  );

  return (
    <button
      className="hover:bg-default focus-visible:bg-default focus-visible:outline-focus flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
      data-name-suggestion
      type="button"
      onClick={handleClick}
    >
      <Avatar className="size-10 shrink-0 rounded-sm" size="md">
        <Avatar.Image alt="" src={avatarUrl(suggestion.name)} />
        <Avatar.Fallback className="bg-[#e8f6fb] text-xs font-semibold text-[#0080bc]">
          ENS
        </Avatar.Fallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate font-semibold">
        {suggestion.name}
      </span>
      <RelativeExpiry
        className="text-muted shrink-0 text-xs font-medium"
        timestampSeconds={suggestion.expiresAt}
      />
    </button>
  );
}

export function EnsNameSearch() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [isInvalid, setIsInvalid] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [input]);

  const search = useQuery<ReadonlyArray<EnsNameSuggestion>>({
    enabled: query.length >= 2,
    placeholderData: (previousData) => previousData,
    queryFn: ({ signal }) => searchEnsNames(query, signal),
    queryKey: ["ens-name-search", query],
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const byName = new Map<string, EnsNameSuggestion>();

    for (const suggestion of search.data ?? []) {
      try {
        const name = normalize(suggestion.name);
        const existing = byName.get(name);
        if (
          !existing ||
          (suggestion.expiresAt ?? 0) > (existing.expiresAt ?? 0)
        ) {
          byName.set(name, { ...suggestion, name });
        }
      } catch {
        continue;
      }
    }

    return [...byName.values()].slice(0, 6);
  }, [search.data]);

  const openName = useCallback(
    (value: string) => {
      try {
        const name = normalizeInput(value);
        setIsInvalid(false);
        setIsOpen(false);
        void navigate({ to: "/$name", params: { name } });
      } catch {
        setIsInvalid(true);
      }
    },
    [navigate],
  );

  const handleChange = useCallback((value: string) => {
    setInput(value);
    setIsInvalid(false);
    setIsOpen(value.trim().length >= 2);
  }, []);
  const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
  }, []);
  const handleFocus = useCallback(
    () => setIsOpen(input.trim().length >= 2),
    [input],
  );
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      containerRef.current
        ?.querySelector<HTMLButtonElement>("[data-name-suggestion]")
        ?.focus();
    },
    [],
  );

  return (
    <div ref={containerRef} className="relative w-full" onBlur={handleBlur}>
      <SearchField
        aria-label="Search ENS names"
        isInvalid={isInvalid}
        onChange={handleChange}
        onSubmit={openName}
        value={input}
      >
        <SearchField.Group className="h-16 bg-white shadow-[0_12px_40px_rgb(1_26_37/0.12)]">
          <SearchField.SearchIcon className="text-accent size-6" />
          <SearchField.Input
            className="w-full text-base sm:text-lg"
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search an ENS name"
          />
          <span className="mr-3 flex size-5 shrink-0 items-center justify-center">
            {search.isFetching ? <Spinner size="sm" /> : null}
          </span>
        </SearchField.Group>
        <FieldError>Enter a valid ENS name.</FieldError>
      </SearchField>

      {isOpen ? (
        <div className="border-border bg-surface absolute top-[calc(100%+0.625rem)] z-20 h-[19.75rem] w-full overflow-y-auto rounded-lg border p-2 text-left shadow-[0_20px_60px_rgb(1_26_37/0.16)]">
          {search.isError ? (
            <p className="text-muted flex h-full items-center justify-center px-4 text-sm">
              Search is unavailable. Press Enter to open the exact name.
            </p>
          ) : null}

          {search.isFetching && suggestions.length === 0 ? (
            <div className="text-muted flex h-full items-center justify-center text-sm">
              Searching names…
            </div>
          ) : null}

          {!search.isFetching && !search.isError && suggestions.length === 0 ? (
            <p className="text-muted flex h-full items-center justify-center px-4 text-sm">
              No indexed names found. Press Enter to open the exact name.
            </p>
          ) : null}

          {suggestions.map((suggestion) => (
            <NameSuggestion
              key={suggestion.id}
              suggestion={suggestion}
              onSelect={openName}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
