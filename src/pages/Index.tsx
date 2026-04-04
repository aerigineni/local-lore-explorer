import { useState, useCallback } from "react";
import { Globe, Compass } from "lucide-react";
import MapView from "@/components/MapView";
import InfoPanel from "@/components/InfoPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

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

      const { data, error } = await supabase.functions.invoke("fetchai-agent", {
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
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <MapView onLocationClick={handleLocationClick} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-[999] pointer-events-none">
        <div className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-10 h-10 rounded-xl bg-card/80 backdrop-blur-lg border border-border flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground drop-shadow-lg">
                CultureMap
              </h1>
              <p className="text-xs text-muted-foreground font-body drop-shadow-md">
                Click anywhere to discover
              </p>
            </div>
          </div>

          {!panelOpen && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-lg border border-border pointer-events-auto">
              <Compass className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-body text-secondary-foreground">
                Tap a location to explore its story
              </span>
            </div>
          )}
        </div>
      </div>

      <InfoPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        locationName={locationName}
        content={content}
        imageUrl={imageUrl}
        isLoading={isLoading}
        lat={lat}
        lng={lng}
      />
    </div>
  );
};

export default Index;
