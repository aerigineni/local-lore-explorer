import { useState, useCallback, useRef } from "react";
import { Compass, Search, Loader2, Dices, HelpCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MapView from "@/components/MapView";
import InfoPanel from "@/components/InfoPanel";
import SearchHistorySidebar from "@/components/SearchHistorySidebar";
import ExploreSidebar, { ExploreSidebarHandle } from "@/components/ExploreSidebar";
import { ExploreLocation } from "@/components/ExploreSidebar";
import { useSearchHistory } from "@/hooks/use-search-history";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SURPRISE_LOCATIONS = [
  { name: "Machu Picchu, Peru", lat: -13.1631, lng: -72.545 },
  { name: "Petra, Jordan", lat: 30.3285, lng: 35.4444 },
  { name: "Angkor Wat, Cambodia", lat: 13.4125, lng: 103.867 },
  { name: "Santorini, Greece", lat: 36.3932, lng: 25.4615 },
  { name: "Kyoto, Japan", lat: 35.0116, lng: 135.768 },
  { name: "Marrakech, Morocco", lat: 31.6295, lng: -7.9811 },
  { name: "Galápagos Islands, Ecuador", lat: -0.9538, lng: -90.9656 },
  { name: "Dubrovnik, Croatia", lat: 42.6507, lng: 18.0944 },
  { name: "Varanasi, India", lat: 25.3176, lng: 83.0068 },
  { name: "Hallstatt, Austria", lat: 47.5622, lng: 13.6493 },
  { name: "Cappadocia, Turkey", lat: 38.6431, lng: 34.8289 },
  { name: "Havana, Cuba", lat: 23.1136, lng: -82.3666 },
  { name: "Bagan, Myanmar", lat: 21.1717, lng: 94.8585 },
  { name: "Reykjavik, Iceland", lat: 64.1466, lng: -21.9426 },
  { name: "Zanzibar, Tanzania", lat: -6.1659, lng: 39.1989 },
  { name: "Cusco, Peru", lat: -13.532, lng: -71.9675 },
  { name: "Fez, Morocco", lat: 34.0331, lng: -5.0003 },
  { name: "Luang Prabang, Laos", lat: 19.8856, lng: 102.1347 },
  { name: "Easter Island, Chile", lat: -27.1127, lng: -109.3497 },
  { name: "Samarkand, Uzbekistan", lat: 39.6542, lng: 66.9597 },
];

const Index = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [exploreMarkers, setExploreMarkers] = useState<ExploreLocation[]>([]);
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [isSurprising, setIsSurprising] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const exploreRef = useRef<ExploreSidebarHandle>(null);

  const { history, addEntry, clearHistory, removeEntry } = useSearchHistory();

  const handleLocationClick = useCallback(async (clickLat: number, clickLng: number) => {
    setLat(clickLat);
    setLng(clickLng);
    setPanelOpen(true);
    setIsLoading(true);
    setContent(null);
    setImageUrl(null);
    setLocationName(null);

    const fallbackLocationName = `${Math.abs(clickLat).toFixed(2)}°${clickLat >= 0 ? "N" : "S"}, ${Math.abs(clickLng).toFixed(2)}°${clickLng >= 0 ? "E" : "W"}`;

    try {
      let geoData: any = null;

      for (const zoom of [10, 6, 3]) {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLng}&format=json&zoom=${zoom}&accept-language=en`
        );
        if (!geoRes.ok) continue;
        const nextGeoData = await geoRes.json();
        if (!nextGeoData?.error) {
          geoData = nextGeoData;
          break;
        }
      }

      const name =
        geoData?.name ||
        geoData?.address?.city ||
        geoData?.address?.town ||
        geoData?.address?.village ||
        geoData?.address?.county ||
        geoData?.address?.state ||
        geoData?.address?.country ||
        geoData?.display_name?.split(",").slice(0, 2).join(",").trim() ||
        `Remote area near ${fallbackLocationName}`;

      const country = geoData?.address?.country || "";
      const fullName = country && name !== country ? `${name}, ${country}` : name;
      setLocationName(fullName);

      addEntry(fullName, clickLat, clickLng);

      const { data, error } = await supabase.functions.invoke("location-culture", {
        body: { locationName: fullName, lat: clickLat, lng: clickLng },
      });

      if (error) throw error;
      setContent(data.content);
      setImageUrl(data.imageUrl || null);
      if (data.source) {
        console.log(`[CultureMap] Response source: ${data.source}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to fetch info about this location");
      setLocationName(`Remote area near ${fallbackLocationName}`);
      setContent("Unable to retrieve cultural information for this location. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [addEntry]);

  const handleSurpriseMe = useCallback(async () => {
    if (isSurprising) return;
    setIsSurprising(true);
    const loc = SURPRISE_LOCATIONS[Math.floor(Math.random() * SURPRISE_LOCATIONS.length)];
    toast(`✨ Whisking you away to ${loc.name}...`);
    await handleLocationClick(loc.lat, loc.lng);
    setIsSurprising(false);
  }, [handleLocationClick, isSurprising]);

  const handleHistorySelect = useCallback((entry: { locationName: string; lat: number; lng: number }) => {
    handleLocationClick(entry.lat, entry.lng);
    setSidebarOpen(false);
  }, [handleLocationClick]);

  const handleExploreSelect = useCallback((location: ExploreLocation) => {
    handleLocationClick(location.lat, location.lng);
  }, [handleLocationClick]);

  const handleExploreResults = useCallback((locations: ExploreLocation[]) => {
    setExploreMarkers(locations);
  }, []);

  const handleMarkerClick = useCallback((marker: { lat: number; lng: number; name: string }) => {
    handleLocationClick(marker.lat, marker.lng);
  }, [handleLocationClick]);

  const mapMarkers = exploreMarkers.map((loc) => ({
    lat: loc.lat,
    lng: loc.lng,
    name: loc.name,
  }));

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <MapView
        onLocationClick={handleLocationClick}
        markers={mapMarkers}
        onMarkerClick={handleMarkerClick}
      />

      {/* Search history sidebar */}
      <SearchHistorySidebar
        isOpen={sidebarOpen}
        hidden={exploreOpen}
        onToggle={() => { setSidebarOpen((o) => !o); setExploreOpen(false); }}
        history={history}
        onSelect={handleHistorySelect}
        onRemove={removeEntry}
        onClear={clearHistory}
      />

      {/* Explore sidebar */}
      <ExploreSidebar
        ref={exploreRef}
        isOpen={exploreOpen}
        hidden={sidebarOpen}
        onToggle={() => { setExploreOpen((o) => !o); setSidebarOpen(false); }}
        onSelect={handleExploreSelect}
        onResults={handleExploreResults}
      />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-[999] pointer-events-none">
        <div className="flex items-center justify-between p-4 md:p-6 gap-3">
          <div className="flex items-center gap-3 pointer-events-auto ml-14">
            <div className="w-10 h-10 rounded bg-card/90 border-2 border-border flex items-center justify-center"
                 style={{ boxShadow: "2px 2px 6px hsl(25 30% 20% / 0.15)" }}>
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-xl font-bold text-foreground drop-shadow-md tracking-wide">
                WorldTour
              </h1>
              <p className="text-xs text-muted-foreground font-body italic drop-shadow-sm">
                A traveller's journal
              </p>
            </div>
          </div>

          {/* Search bar with animation */}
          <motion.form
            className="pointer-events-auto flex-1 max-w-md mx-auto"
            animate={{
              scale: searchFocused ? 1.03 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onSubmit={(e) => {
              e.preventDefault();
              const q = topSearchQuery.trim();
              if (!q) return;
              setSidebarOpen(false);
              if (!exploreOpen) setExploreOpen(true);
              exploreRef.current?.setQueryAndSearch(q);
              setTopSearchQuery("");
            }}
          >
            <div className="relative">
              <input
                type="text"
                value={topSearchQuery}
                onChange={(e) => setTopSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Chart a course across the world..."
                className="w-full h-10 pl-4 pr-10 rounded bg-card/90 border-2 border-border text-sm font-body text-foreground placeholder:text-muted-foreground/60 placeholder:italic focus:outline-none focus:border-primary/60 backdrop-blur-sm transition-all duration-300"
                style={{
                  boxShadow: searchFocused
                    ? "0 4px 20px hsl(25 55% 35% / 0.25), inset 0 1px 2px hsl(25 30% 20% / 0.08)"
                    : "2px 2px 6px hsl(25 30% 20% / 0.12)",
                }}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded flex items-center justify-center text-primary hover:text-foreground transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </motion.form>

          <div className="w-10 shrink-0" />
        </div>
      </div>

      {/* Bottom-left floating buttons */}
      <div className="fixed bottom-6 left-4 z-[999] flex flex-col gap-3 pointer-events-auto">
        <button
          onClick={handleSurpriseMe}
          disabled={isSurprising}
          className="w-12 h-12 rounded-full bg-card/95 border-2 border-border flex items-center justify-center hover:bg-secondary/80 transition-all hover:scale-105 active:scale-95"
          style={{ boxShadow: "2px 2px 8px hsl(25 30% 20% / 0.2)" }}
          title="Surprise Me!"
        >
          {isSurprising ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Dices className="w-5 h-5 text-primary" />
          )}
        </button>
        <button
          onClick={() => setHelpOpen(true)}
          className="w-12 h-12 rounded-full bg-card/95 border-2 border-border flex items-center justify-center hover:bg-secondary/80 transition-all hover:scale-105 active:scale-95"
          style={{ boxShadow: "2px 2px 8px hsl(25 30% 20% / 0.2)" }}
          title="Help"
        >
          <HelpCircle className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Help modal */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
            onClick={() => setHelpOpen(false)}
          >
            <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-card journal-texture border-2 border-border rounded-lg max-w-md w-full p-6"
              style={{ boxShadow: "4px 4px 20px hsl(25 30% 20% / 0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setHelpOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="font-display text-xl font-bold text-foreground mb-4">
                Your Travel Companion
              </h2>
              <div className="space-y-3 text-sm font-body text-foreground/85 leading-relaxed">
                <p>
                  <strong className="text-primary">🗺 Tap the map</strong> — Click anywhere on the map to discover the culture, history, and stories of that place.
                </p>
                <p>
                  <strong className="text-primary">🔍 Search bar</strong> — Type any theme, cuisine, era, or wonder to explore matching destinations worldwide.
                </p>
                <p>
                  <strong className="text-primary">📑 Explore tab</strong> — Browse and expand results to read about each destination, then click to fly there.
                </p>
                <p>
                  <strong className="text-primary">📗 History tab</strong> — Revisit any place you've already explored from your journey log.
                </p>
                <p>
                  <strong className="text-primary">🎲 Surprise Me</strong> — Feeling adventurous? Roll the dice and let fate pick your next destination.
                </p>
              </div>
              <p className="mt-4 text-xs font-body italic text-muted-foreground text-center">
                The world is a book — start turning its pages.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <InfoPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        locationName={locationName}
        content={content}
        isLoading={isLoading}
        lat={lat}
        lng={lng}
      />
    </div>
  );
};

export default Index;
