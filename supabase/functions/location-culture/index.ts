import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWikipediaImage(locationName: string): Promise<string | null> {
  const candidates = [...new Set([
    locationName.split(",")[0].trim(),
    ...locationName.split(",").map(s => s.trim()),
    locationName,
  ])];

  for (const name of candidates) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const img = data?.thumbnail?.source?.replace(/\/\d+px-/, "/800px-") ||
                  data?.originalimage?.source;
      if (img) return img;
    } catch { /* try next */ }
  }
  return null;
}

function aiCall(apiKey: string, model: string, system: string, user: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationName, lat, lng, searchQuery } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a cultural historian, journalist, and storyteller. Provide a rich, engaging summary with these EXACT section headers (markdown ##):

## Historical Significance
Key events, civilizations, figures. Include dates and names.

## Food & Cuisine
Traditional dishes, ingredients, culinary traditions. Bold dish names.

## Culture & Arts
Music, art, festivals, cultural practices. Name specific ones.

## Hidden Stories
Lesser-known facts, legends, surprising connections.

## Current News
Recent notable events or developments (last few years).

## Issues & Challenges
Current challenges: conflicts, environment, politics, humanitarian. Be factual, balanced.

RULES:
- **Bold** important names, dishes, places, dates
- Bullet points (- ) for lists
- 40-80 words per section
- Vivid, conversational, like a knowledgeable local guide
- If remote/ocean, discuss nearest significant cultural region`;

    // Fire ALL requests in parallel: main content, wikipedia image, and explore context
    const promises: Record<string, Promise<any>> = {
      content: aiCall(
        LOVABLE_API_KEY,
        "google/gemini-2.5-flash",
        systemPrompt,
        `Tell me about: ${locationName} (${lat}, ${lng})`
      ),
      image: fetchWikipediaImage(locationName),
    };

    if (searchQuery?.trim()) {
      promises.context = aiCall(
        LOVABLE_API_KEY,
        "google/gemini-2.5-flash-lite",
        "Write one concise paragraph (2-3 sentences, max 50 words) explaining how a location relates to a search topic. Specific and vivid. No headers or bullets.",
        `How does "${locationName}" relate to "${searchQuery}"?`
      );
    }

    // Await all in parallel
    const [contentRes, imageUrl, ctxRes] = await Promise.all([
      promises.content,
      promises.image,
      promises.context ?? Promise.resolve(null),
    ]);

    // Handle main content response
    if (!contentRes.ok) {
      if (contentRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (contentRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await contentRes.text();
      console.error("AI error:", contentRes.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await contentRes.json();
    const content = data.choices?.[0]?.message?.content || "No information available.";

    // Extract explore context if available
    let exploreContext: string | null = null;
    if (ctxRes && ctxRes.ok) {
      try {
        const ctxData = await ctxRes.json();
        exploreContext = ctxData.choices?.[0]?.message?.content?.trim() || null;
      } catch { /* ignore */ }
    }

    return new Response(JSON.stringify({ content, imageUrl, exploreContext }), {
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
