import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as secp from "npm:@noble/secp256k1@2.1.0";
import { sha256 } from "npm:@noble/hashes@1.4.0/sha256";
import { hmac } from "npm:@noble/hashes@1.4.0/hmac";
import { bech32 } from "npm:bech32@2.0.0";

// Required setup for @noble/secp256k1 v2
secp.etc.hmacSha256Sync = (k: Uint8Array, ...m: Uint8Array[]) => {
  const h = hmac.create(sha256, k);
  for (const msg of m) h.update(msg);
  return h.digest();
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Constants ──
const AGENT_ADDRESS =
  "agent1qvg8vk9u0g2cy0rzp35sc7mdz06lg5y8a6knxxt99yhjcxytwze82pplplu";
const LOCATION_REQUEST_DIGEST =
  "model:5b386b181d3e51ea295d6472b1b782e87231c41bc7cf2f6a3b4ddff0c0a3e710";
const PROTOCOL_DIGEST =
  "04bc47540913fdf3e83534c5e1b218b77ec114a4adfe4cb4577a2227607ec0de";
const ENVELOPE_VERSION = 1;

// ── Bech32 Helpers ──
function encodeBech32(prefix: string, data: Uint8Array): string {
  return bech32.encode(prefix, bech32.toWords(data), 256);
}

// ── Identity ──
function createIdentity(seed: string) {
  const prefixHash = sha256(new TextEncoder().encode("agent\x00"));
  const seedHash = sha256(new TextEncoder().encode(seed));
  const combined = new Uint8Array(prefixHash.length + seedHash.length);
  combined.set(prefixHash);
  combined.set(seedHash, prefixHash.length);
  const privateKey = sha256(combined);
  const publicKey = secp.getPublicKey(privateKey, true);
  const address = encodeBech32("agent", publicKey);
  return { privateKey, publicKey, address };
}

// ── Envelope ──
function buildEnvelopeDigest(envelope: {
  sender: string; target: string; session: string;
  schema_digest: string; payload?: string; expires?: number; nonce?: number;
}): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [
    encoder.encode(envelope.sender),
    encoder.encode(envelope.target),
    encoder.encode(envelope.session),
    encoder.encode(envelope.schema_digest),
  ];
  if (envelope.payload !== undefined) parts.push(encoder.encode(envelope.payload));
  if (envelope.expires !== undefined) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, BigInt(envelope.expires), false);
    parts.push(new Uint8Array(buf));
  }
  if (envelope.nonce !== undefined) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, BigInt(envelope.nonce), false);
    parts.push(new Uint8Array(buf));
  }
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const all = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) { all.set(part, offset); offset += part.length; }
  return sha256(all);
}

function signEnvelope(digest: Uint8Array, privateKey: Uint8Array): string {
  return encodeBech32("sig", secp.sign(digest, privateKey).toCompactRawBytes());
}

// ── Wikipedia Image ──
async function fetchWikipediaImage(locationName: string): Promise<string | null> {
  try {
    const searchName = locationName.split(",")[0].trim();
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail?.source?.replace(/\/\d+px-/, "/800px-") || null;
  } catch { return null; }
}

// ── Poll for webhook response ──
async function pollForResponse(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  maxWaitMs = 15000,
  intervalMs = 1500
): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const { data } = await supabase
      .from("agent_responses")
      .select("response_content, status")
      .eq("request_id", requestId)
      .single();

    if (data?.status === "completed" && data?.response_content) {
      return data.response_content;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationName, lat, lng } = await req.json();
    const AGENTVERSE_API_KEY = Deno.env.get("AGENTVERSE_API_KEY");
    if (!AGENTVERSE_API_KEY) throw new Error("AGENTVERSE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate a unique request ID
    const requestId = crypto.randomUUID();

    // Store pending request in DB
    await supabase.from("agent_responses").insert({
      request_id: requestId,
      location_name: locationName,
      status: "pending",
    });

    // Create sender identity
    const senderSeed = "culturemap-bridge-agent-" + AGENTVERSE_API_KEY.slice(-8);
    const sender = createIdentity(senderSeed);
    console.log("Sender address:", sender.address);

    // Original 3-field payload — no modifications to the model
    const payload = JSON.stringify({
      location_name: locationName,
      lat,
      lng,
    });
    const payloadB64 = btoa(payload);

    const session = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expires = now + 120;
    const nonce = Math.floor(Math.random() * 1e15);

    const envelopeData = {
      sender: sender.address,
      target: AGENT_ADDRESS,
      session,
      schema_digest: LOCATION_REQUEST_DIGEST,
      protocol_digest: PROTOCOL_DIGEST,
      payload: payloadB64,
      expires,
      nonce,
    };

    const digest = buildEnvelopeDigest(envelopeData);
    const signature = signEnvelope(digest, sender.privateKey);
    const envelope = { version: ENVELOPE_VERSION, ...envelopeData, signature };

    console.log("Submitting envelope to Agentverse...");

    // Fire off envelope + image fetch in parallel
    const [submitRes, imageUrl] = await Promise.all([
      fetch("https://agentverse.ai/v1/hosting/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      }),
      fetchWikipediaImage(locationName),
    ]);

    const submitText = await submitRes.text();
    console.log("Submit response:", submitRes.status, submitText);

    if (!submitRes.ok) {
      console.error("Hosting submit failed:", submitRes.status, submitText);
    }

    // Poll for Rooted's webhook response (wait up to 15 seconds)
    console.log(`Polling for Rooted response (request: ${requestId})...`);
    const rootedResponse = await pollForResponse(supabase, requestId);

    if (rootedResponse) {
      console.log("Got response from Rooted agent via webhook!");
      return new Response(
        JSON.stringify({ content: rootedResponse, imageUrl, source: "rooted-agent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to Lovable AI (Gemini)
    console.log("No Rooted response within timeout. Using AI fallback.");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("No fallback AI available");

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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Tell me about: ${locationName} (coordinates: ${lat}, ${lng})` },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI fallback error");
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "No information available.";

    return new Response(
      JSON.stringify({ content, imageUrl, source: "lovable-ai-fallback" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
