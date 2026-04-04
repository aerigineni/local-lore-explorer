import {
  X, MapPin, Loader2, Utensils, Landmark, Music,
  BookOpen, Newspaper, AlertTriangle, ChevronRight, ImageOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, Fragment } from "react";

interface InfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string | null;
  content: string | null;
  imageUrl: string | null;
  isLoading: boolean;
  lat: number | null;
  lng: number | null;
}

const tabs = [
  { key: "history", icon: Landmark, label: "History", color: "from-amber-500/20 to-amber-600/5" },
  { key: "food", icon: Utensils, label: "Food", color: "from-orange-500/20 to-orange-600/5" },
  { key: "culture", icon: Music, label: "Culture", color: "from-purple-500/20 to-purple-600/5" },
  { key: "stories", icon: BookOpen, label: "Stories", color: "from-emerald-500/20 to-emerald-600/5" },
  { key: "news", icon: Newspaper, label: "News", color: "from-blue-500/20 to-blue-600/5" },
  { key: "issues", icon: AlertTriangle, label: "Issues", color: "from-red-500/20 to-red-600/5" },
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
      currentKey =
        sectionMap[title] ||
        Object.entries(sectionMap).find(([k]) => title.includes(k))?.[1] ||
        currentKey;
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

/** Render a line of text, converting **bold** markers into <strong> tags. */
function RichLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-gray-900 font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

/** Render markdown-ish content into styled paragraphs and bullet lists. */
function RichContent({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const elements: JSX.Element[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed">
            <ChevronRight className="w-3.5 h-3.5 mt-1 shrink-0 text-primary/70" />
            <span><RichLine text={b} /></span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-•*]\s+(.+)/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm text-gray-800 leading-relaxed">
          <RichLine text={line} />
        </p>
      );
    }
  }
  flushBullets();

  return <div className="space-y-2.5">{elements}</div>;
}

const InfoPanel = ({
  isOpen,
  onClose,
  locationName,
  content,
  imageUrl,
  isLoading,
  lat,
  lng,
}: InfoPanelProps) => {
  const [activeTab, setActiveTab] = useState("history");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const sections = useMemo(() => (content ? parseSections(content) : {}), [content]);
  const activeContent = sections[activeTab];
  const activeTabMeta = tabs.find((t) => t.key === activeTab)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed top-0 right-0 h-full w-full max-w-[var(--panel-width)] bg-white backdrop-blur-2xl border-l border-gray-200 z-[1000] flex flex-col shadow-2xl"
        >
          {/* ─── Hero Image ─── */}
          <div className="relative w-full h-48 shrink-0 overflow-hidden bg-muted">
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={locationName || "Location"}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-muted flex items-center justify-center">
                <ImageOff className="w-10 h-10 text-muted-foreground/40" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-card/70 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Location info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-1.5 text-primary/90 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[11px] font-body uppercase tracking-wider font-medium">
                  {lat?.toFixed(4)}, {lng?.toFixed(4)}
                </span>
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground leading-tight">
                {locationName || (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Finding location…
                  </span>
                )}
              </h2>
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-gray-200 shrink-0">
            {tabs.map(({ key, icon: Icon, label }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* ─── Content ─── */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-gray-800 font-body text-sm font-medium">
                    Exploring this place…
                  </p>
                  <p className="text-gray-500 font-body text-xs mt-1">
                    Gathering history, culture & stories
                  </p>
                </div>
              </div>
            ) : activeContent ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                {/* Section header card */}
                <div className={`rounded-xl bg-gradient-to-r ${activeTabMeta.color} border border-gray-200 p-4 mb-4`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-card/80 flex items-center justify-center">
                      <activeTabMeta.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-gray-900">
                        {activeTabMeta.label}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-body">
                        {locationName}
                      </p>
                    </div>
                  </div>
                </div>

                <RichContent text={activeContent} />
              </motion.div>
            ) : content ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 text-sm px-6">
                <activeTabMeta.icon className="w-8 h-8 text-gray-300" />
                <p className="text-center">
                  No {activeTabMeta.label.toLowerCase()} information available for this location.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Click anywhere on the map to explore
              </div>
            )}
          </div>

          {/* ─── Footer ─── */}
          <div className="px-5 py-3 border-t border-gray-200 shrink-0">
            <p className="text-[11px] text-gray-400 font-body text-center">
              Powered by AI · Images via Wikipedia
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InfoPanel;
