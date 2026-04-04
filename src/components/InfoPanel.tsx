import { X, MapPin, Loader2, Utensils, Landmark, Music, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string | null;
  content: string | null;
  isLoading: boolean;
  lat: number | null;
  lng: number | null;
}

const categoryIcons = [
  { icon: Landmark, label: "History" },
  { icon: Utensils, label: "Food" },
  { icon: Music, label: "Culture" },
  { icon: BookOpen, label: "Stories" },
];

const InfoPanel = ({ isOpen, onClose, locationName, content, isLoading, lat, lng }: InfoPanelProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full max-w-[var(--panel-width)] bg-card/95 backdrop-blur-xl border-l border-border z-[1000] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-primary mb-1">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-xs font-body uppercase tracking-widest">
                  {lat?.toFixed(4)}, {lng?.toFixed(4)}
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground truncate">
                {locationName || "Loading..."}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 px-6 py-4">
            {categoryIcons.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-body"
              >
                <Icon className="w-3 h-3" />
                {label}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-body text-sm">
                  Uncovering the history of this place...
                </p>
              </div>
            ) : content ? (
              <div className="prose prose-invert max-w-none font-body text-secondary-foreground leading-relaxed text-sm space-y-4 animate-fade-in">
                {content.split("\n").map((paragraph, i) =>
                  paragraph.trim() ? (
                    <p key={i} className={paragraph.startsWith("#") ? "text-foreground font-display text-lg font-semibold mt-6" : ""}>
                      {paragraph.startsWith("#") ? paragraph.replace(/^#+\s*/, "") : paragraph}
                    </p>
                  ) : null
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Click anywhere on the map to explore
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground font-body text-center">
              Powered by AI · Click anywhere on the map to explore
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InfoPanel;
