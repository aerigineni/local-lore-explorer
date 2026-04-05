import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Compass, Search, MapPin, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExploreLocation {
  name: string;
  lat: number;
  lng: number;
  description: string;
}

export interface ExploreSidebarHandle {
  setQueryAndSearch: (q: string) => void;
}

interface ExploreSidebarProps {
  isOpen: boolean;
  hidden?: boolean;
  onToggle: () => void;
  onSelect: (location: ExploreLocation) => void;
  onResults: (locations: ExploreLocation[]) => void;
}

const ExploreSidebar = forwardRef<ExploreSidebarHandle, ExploreSidebarProps>(({ isOpen, hidden, onToggle, onSelect, onResults }, ref) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExploreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  useImperativeHandle(ref, () => ({
    setQueryAndSearch: (q: string) => {
      setQuery(q);
      setPendingSearch(q);
    },
  }));

  useEffect(() => {
    if (pendingSearch && isOpen) {
      setPendingSearch(null);
      doSearch(pendingSearch);
    }
  }, [pendingSearch, isOpen]);

  const doSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setResults([]);
    setExpandedIndex(null);
    setLastQuery(trimmed);
    onResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("explore-locations", {
        body: { query: trimmed },
      });

      if (error) throw error;

      const locations: ExploreLocation[] = data?.locations || [];
      setResults(locations);
      onResults(locations);

      if (locations.length === 0) {
        toast.info("No locations found for that query");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to explore locations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!lastQuery || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const exclude = results.map((r) => r.name);
      const { data, error } = await supabase.functions.invoke("explore-locations", {
        body: { query: lastQuery, exclude },
      });

      if (error) throw error;

      const newLocations: ExploreLocation[] = data?.locations || [];
      if (newLocations.length === 0) {
        toast.info("No more destinations to discover");
        return;
      }

      const combined = [...results, ...newLocations];
      setResults(combined);
      onResults(combined);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load more locations");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearch = async () => {
    doSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setExpandedIndex(null);
    setLastQuery("");
    onResults([]);
  };

  return (
    <>
      {/* Bookmark tab toggle */}
      {!hidden && (
        <button
          onClick={onToggle}
          className="bookmark-tab fixed z-[1001] flex items-center justify-center px-1.5 py-4 rounded-r-md bg-bookmark-red text-primary-foreground font-display text-xs tracking-wider hover:brightness-110 transition-all"
          style={{
            top: "220px",
            left: isOpen ? "320px" : "0px",
          }}
        >
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 rotate-90" />
            <span>Explore</span>
          </span>
        </button>
      )}

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 left-0 h-full w-[320px] bg-card journal-texture border-r-2 border-border z-[1000] flex flex-col"
            style={{ boxShadow: "4px 0 15px hsl(25 30% 20% / 0.15)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                <h2 className="font-display text-base font-bold text-foreground">Explore</h2>
              </div>
              {results.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-xs text-primary hover:text-destructive font-body italic transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search input */}
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ancient ruins, hidden temples..."
                  className="w-full h-9 pl-3 pr-9 rounded bg-secondary/50 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/70 placeholder:italic focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading || !query.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-primary hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-body italic">
                    Searching the atlas...
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <Compass className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground font-body italic">
                    Search for places, history, cuisine, legends...
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((loc, i) => {
                    const isExpanded = expandedIndex === i;
                    return (
                      <div
                        key={`${loc.name}-${i}`}
                        className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/40 last:border-b-0 ${isExpanded ? "bg-secondary/60" : "hover:bg-secondary/30"}`}
                        onClick={() => {
                          setExpandedIndex(isExpanded ? null : i);
                          onSelect(loc);
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3 h-3 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body font-semibold text-foreground truncate">
                            {loc.name}
                          </p>
                          <p className={`text-xs text-muted-foreground font-body italic mt-0.5 ${isExpanded ? "" : "line-clamp-2"}`}>
                            {loc.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {/* See more button */}
                  {results.length >= 5 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadMore();
                      }}
                      disabled={isLoadingMore}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-body italic text-primary hover:text-foreground transition-colors border-t border-border/40"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Discovering more...</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Discover more destinations</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <p className="text-xs text-muted-foreground font-body italic text-center">
                {results.length} destination{results.length !== 1 ? "s" : ""} discovered
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

ExploreSidebar.displayName = "ExploreSidebar";

export default ExploreSidebar;
