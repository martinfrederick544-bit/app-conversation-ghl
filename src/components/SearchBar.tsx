"use client";

import { useEffect, useState } from "react";

export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(handle);
  }, [value, onSearch]);

  return (
    <div className="top-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "var(--text-faint)" }}>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher un contact…"
        aria-label="Rechercher un contact"
      />
      {value && (
        <button
          className="top-search-clear"
          onClick={() => setValue("")}
          aria-label="Effacer la recherche"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
