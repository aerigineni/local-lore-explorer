import { History, MapPin, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchHistoryEntry } from "@/hooks/use-search-history";
import { formatDistanceToNow } from "date-fns";

interface SearchHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const SearchHistorySidebar = ({
  isOpen,
  onToggle,
  history,
  onSelect,
  onRemove,
  onClear,
}: SearchHistorySidebarProps) => {
  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        className="fixed top-[120px] left-4 z-[1001] w-10 h-10 rounded-xl bg-card/80 backdrop-blur-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all"
        style={{ left: isOpen ? "calc(280px + 1rem)" : "1rem" }}
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <History className="w-5 h-5" />}
      </button>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 left-0 h-full w-[280px] bg-card/95 backdrop-blur-2xl border-r border-border z-[1000] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">
                  Search History
                </h2>
              </div>
              {history.length > 0 && (
                <button
                  onClick={onClear}
                  className="text-[11px] text-muted-foreground hover:text-destructive font-body transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground font-body">
                    Your explored locations will appear here
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onSelect(entry)}
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium text-foreground truncate">
                          {entry.locationName}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                          {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(entry.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <p className="text-[10px] text-muted-foreground font-body text-center">
                {history.length} location{history.length !== 1 ? "s" : ""} explored
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SearchHistorySidebar;
