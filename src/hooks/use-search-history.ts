import { useState, useCallback, useEffect } from "react";

export interface SearchHistoryEntry {
  id: string;
  locationName: string;
  lat: number;
  lng: number;
  timestamp: number;
}

const STORAGE_KEY = "culturemap-search-history";
const MAX_ENTRIES = 50;

function loadHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadHistory);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addEntry = useCallback((locationName: string, lat: number, lng: number) => {
    setHistory((prev) => {
      const entry: SearchHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        locationName,
        lat,
        lng,
        timestamp: Date.now(),
      };
      return [entry, ...prev].slice(0, MAX_ENTRIES);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { history, addEntry, clearHistory, removeEntry };
}
