import { useState } from "react";
import { HelpCircle, ChevronLeft, Search, MapPin, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExploreLocation {
  name: string;
  lat: number;
  lng: number;
  description: string;
}

interface ExploreSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (location: ExploreLocation) => void;
  onResults: (locations: ExploreLocation[]) => void;
}

const ExploreSidebar = ({ isOpen, onToggle, onSelect, onResults }: ExploreSidebarProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExploreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setResults([]);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onResults([]);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-[220px] left-4 z-[1001] w-10 h-10 rounded-xl bg-card/80 backdrop-blur-lg border border-border flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-card transition-all"
        style={{ left: isOpen ? "calc(320px + 1rem)" : "1rem" }}
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </button>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 left-0 h-full w-[320px] bg-card/95 backdrop-blur-2xl border-r border-border z-[1000] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">Explore</h2>
              </div>
              {results.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-body transition-colors"
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
                  placeholder="e.g. Ancient Roman ruins..."
                  className="w-full h-9 pl-3 pr-9 rounded-lg bg-muted/50 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading || !query.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-blue-600 hover:text-blue-700 disabled:opacity-40 transition-colors"
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
                  <p className="text-xs text-muted-foreground font-body">
                    Finding locations...
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground font-body">
                    Search for anything — places, history, food, culture...
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((loc, i) => (
                    <div
                      key={`${loc.name}-${i}`}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onSelect(loc)}
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium text-foreground truncate">
                          {loc.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-body mt-0.5 line-clamp-2">
                          {loc.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <p className="text-[10px] text-muted-foreground font-body text-center">
                {results.length} location{results.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExploreSidebar;
