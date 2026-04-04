import { X, MapPin, Loader2, Utensils, Landmark, Music, BookOpen, Newspaper, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";

interface InfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string | null;
  content: string | null;
  isLoading: boolean;
  lat: number | null;
  lng: number | null;
}

const tabs = [
  { key: "history", icon: Landmark, label: "History" },
  { key: "food", icon: Utensils, label: "Food" },
  { key: "culture", icon: Music, label: "Culture" },
  { key: "stories", icon: BookOpen, label: "Stories" },
  { key: "news", icon: Newspaper, label: "News" },
  { key: "issues", icon: AlertTriangle, label: "Issues" },
];

function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionMap: Record<string, string> = {
    "historical significance": "history",
    "history": "history",
    "food & cuisine": "food",
    "food": "food",
    "cuisine": "food",
    "culture & arts": "culture",
    "culture": "culture",
    "arts": "culture",
    "hidden stories": "stories",
    "stories": "stories",
    "legends": "stories",
    "current news": "news",
    "news": "news",
    "recent developments": "news",
    "current issues": "issues",
    "issues & challenges": "issues",
    "issues": "issues",
    "challenges": "issues",
    "conflicts": "issues",
  };

  let currentKey = "history";
  let currentLines: string[] = [];

  for (const line of content.split("\n")) {
    const headerMatch = line.match(/^#+\s*\**\s*(.+?)\s*\**\s*$/);
    if (headerMatch) {
      if (currentLines.length) {
        sections[currentKey] = (sections[currentKey] || "") + currentLines.join("\n").trim() + "\n";
      }
      const title = headerMatch[1].toLowerCase().replace(/[*#]/g, "").trim();
      currentKey = sectionMap[title] || Object.entries(sectionMap).find(([k]) => title.includes(k))?.[1] || currentKey;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length) {
    sections[currentKey] = (sections[currentKey] || "") + currentLines.join("\n").trim();
  }

  return sections;
}

const InfoPanel = ({ isOpen, onClose, locationName, content, isLoading, lat, lng }: InfoPanelProps) => {
  const [activeTab, setActiveTab] = useState("history");

  const sections = useMemo(() => (content ? parseSections(content) : {}), [content]);

  const activeContent = sections[activeTab];

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
          <div className="flex items-start justify-between p-5 border-b border-border">
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

          {/* Tabs */}
          <div className="flex gap-1 px-4 py-3 overflow-x-auto border-b border-border scrollbar-none">
            {tabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body whitespace-nowrap transition-all ${
                  activeTab === key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-body text-sm">
                  Uncovering stories about this place...
                </p>
              </div>
            ) : activeContent ? (
              <div className="prose prose-invert max-w-none font-body text-secondary-foreground leading-relaxed text-sm space-y-3 animate-fade-in">
                {activeContent.split("\n").map((paragraph, i) =>
                  paragraph.trim() ? (
                    <p key={i}>{paragraph.replace(/\*\*/g, "")}</p>
                  ) : null
                )}
              </div>
            ) : content ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground text-sm">
                <p>No {tabs.find(t => t.key === activeTab)?.label.toLowerCase()} information available for this location.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Click anywhere on the map to explore
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border">
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
