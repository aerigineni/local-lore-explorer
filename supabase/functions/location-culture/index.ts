import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWikipediaImage(locationName: string): Promise<string | null> {
  try {
    const searchName = locationName.split(",")[0].trim();
    const searchRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`
    );
    if (!searchRes.ok) return null;
    const data = await searchRes.json();
    return data?.thumbnail?.source?.replace(/\/\d+px-/, "/800px-") || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationName, lat, lng } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch Wikipedia image in parallel with AI content
    const imagePromise = fetchWikipediaImage(locationName);

    const systemPrompt = `You are a cultural historian, journalist, and storyteller. When given a location, provide a rich, engaging summary with these EXACT section headers (use markdown ##):

## Historical Significance
Key events, civilizations, and figures tied to this place. Include specific dates and names.

## Food & Cuisine
Traditional dishes, ingredients, and culinary traditions. Mention specific dish names in bold.

## Culture & Arts
Music, art, festivals, and cultural practices. Mention specific festivals or art forms.

## Hidden Stories
Lesser-known facts, legends, or surprising connections that most people don't know.

## Current News
Recent notable events, developments, or changes happening in or around this area (within the last few years).

## Issues & Challenges
Current challenges — conflicts, poverty, environmental issues, political tensions, humanitarian concerns. Be factual and balanced.

FORMATTING RULES:
- Use **bold** for important names, dishes, places, and dates
- Use bullet points (- ) for lists of items
- Keep each section 60-120 words
- Be vivid and conversational — like a knowledgeable local guide
- If the location is in the ocean or remote, discuss the nearest significant cultural region`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Tell me about: ${locationName} (coordinates: ${lat}, ${lng})`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No information available.";
    const imageUrl = await imagePromise;

    return new Response(JSON.stringify({ content, imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
