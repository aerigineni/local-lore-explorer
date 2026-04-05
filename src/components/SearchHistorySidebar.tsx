import { History, MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchHistoryEntry } from "@/hooks/use-search-history";
import { formatDistanceToNow } from "date-fns";

interface SearchHistorySidebarProps {
  isOpen: boolean;
  hidden?: boolean;
  onToggle: () => void;
  history: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const SearchHistorySidebar = ({
  isOpen,
  hidden,
  onToggle,
  history,
  onSelect,
  onRemove,
  onClear,
}: SearchHistorySidebarProps) => {
  return (
    <>
      {/* Bookmark tab toggle */}
      {!hidden && (
        <button
          onClick={onToggle}
          className="bookmark-tab fixed z-[1001] flex items-center justify-center px-1.5 py-4 rounded-r-md bg-bookmark-green text-primary-foreground font-display text-xs tracking-wider hover:brightness-110 transition-all"
          style={{
            top: "120px",
            left: isOpen ? "280px" : "0px",
          }}
        >
          <span className="flex items-center gap-1">
            <History className="w-3.5 h-3.5 rotate-90" />
            <span>History</span>
          </span>
        </button>
      )}

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 left-0 h-full w-[280px] bg-card journal-texture border-r-2 border-border z-[1000] flex flex-col"
            style={{ boxShadow: "4px 0 15px hsl(25 30% 20% / 0.15)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="font-display text-base font-bold text-foreground">
                  Journey Log
                </h2>
              </div>
              {history.length > 0 && (
                <button
                  onClick={onClear}
                  className="text-xs text-primary hover:text-destructive font-body italic transition-colors"
                >
                  Erase all
                </button>
              )}
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground font-body italic">
                    Your adventures will be recorded here...
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors border-b border-border/40 last:border-b-0"
                      onClick={() => onSelect(entry)}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-semibold text-foreground truncate">
                          {entry.locationName}
                        </p>
                        <p className="text-xs text-muted-foreground font-body italic mt-0.5">
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
              <p className="text-xs text-muted-foreground font-body italic text-center">
                {history.length} destination{history.length !== 1 ? "s" : ""} visited
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SearchHistorySidebar;
