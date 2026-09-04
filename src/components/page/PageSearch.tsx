"use client";

import { useState } from "react";
import { searchPages, type PageRow } from "@/lib/actions/pages";

interface SearchResult {
  page: PageRow;
  snippet: string;
}

export function PageSearch({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  return (
    <div>
      <input
        placeholder="Search pages..."
        value={query}
        onChange={async (e) => {
          setQuery(e.target.value);
          if (e.target.value.length > 1) {
            const res = await searchPages(eventId, e.target.value);
            setResults(res);
            setShowResults(true);
          } else {
            setResults([]);
            setShowResults(false);
          }
        }}
        className="w-full rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-primary placeholder:text-text-tertiary"
      />
      {showResults && results.length > 0 && (
        <div className="mt-1 space-y-1">
          {results.map((result) => (
            <a
              key={result.page.id}
              href={`/app/events/${eventId}/pages/${result.page.id}`}
              className="block rounded-md bg-bg-tertiary px-2 py-1 hover:bg-bg-card"
            >
              <div className="text-xs font-medium text-text-primary">{result.page.title}</div>
              <div className="text-[10px] text-text-tertiary">{result.snippet}</div>
            </a>
          ))}
        </div>
      )}
      {showResults && results.length === 0 && query.length > 1 && (
        <p className="mt-1 text-[10px] text-text-tertiary">No results found</p>
      )}
    </div>
  );
}