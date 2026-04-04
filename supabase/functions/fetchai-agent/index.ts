import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
const LOCATION_RESPONSE_DIGEST =
  "model:652a872eadaa6a228b20b6f92a84ca917213a6a9605f64ced69cc8dca89353f1";
const PROTOCOL_DIGEST =
  "04bc47540913fdf3e83534c5e1b218b77ec114a4adfe4cb4577a2227607ec0de";
const ENVELOPE_VERSION = 1;

// ── Bech32 Helpers ──
function encodeBech32(prefix: string, data: Uint8Array): string {
  const words = bech32.toWords(data);
  return bech32.encode(prefix, words, 256);
}

function decodeBech32(value: string): { prefix: string; data: Uint8Array } {
  const { prefix, words } = bech32.decode(value, 256);
  return { prefix, data: new Uint8Array(bech32.fromWords(words)) };
}

// ── Identity ──
function createIdentity(seed: string) {
  // Derive private key from seed (same as fetchai: sha256(sha256("agent" + chr(0)) + sha256(seed)))
  const prefixHash = sha256(new TextEncoder().encode("agent\x00"));
  const seedHash = sha256(new TextEncoder().encode(seed));
  const combined = new Uint8Array(prefixHash.length + seedHash.length);
  combined.set(prefixHash);
  combined.set(seedHash, prefixHash.length);
  const privateKey = sha256(combined);

  // Get compressed public key
  const publicKey = secp.getPublicKey(privateKey, true);
  const address = encodeBech32("agent", publicKey);

  return { privateKey, publicKey, address };
}

// ── Envelope ──
function buildEnvelopeDigest(envelope: {
  sender: string;
  target: string;
  session: string;
  schema_digest: string;
  payload?: string;
  expires?: number;
  nonce?: number;
}): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [
    encoder.encode(envelope.sender),
    encoder.encode(envelope.target),
    encoder.encode(envelope.session),
    encoder.encode(envelope.schema_digest),
  ];

  if (envelope.payload !== undefined) {
    parts.push(encoder.encode(envelope.payload));
  }

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

  // SHA256 of all concatenated parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return sha256(combined);
}

function signEnvelope(
  digest: Uint8Array,
  privateKey: Uint8Array
): string {
  const sig = secp.sign(digest, privateKey);
  // Get the compact signature (64 bytes: r + s)
  const sigBytes = sig.toCompactRawBytes();
  return encodeBech32("sig", sigBytes);
}

function generateUUID(): string {
  return crypto.randomUUID();
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
  } catch {
    return null;
  }
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

    // Create our sender identity from a deterministic seed
    const senderSeed = "culturemap-bridge-agent-" + (Deno.env.get("AGENTVERSE_API_KEY") || "").slice(-8);
    const sender = createIdentity(senderSeed);
    console.log("Sender address:", sender.address);

    // Build the payload
    const payload = JSON.stringify({
      location_name: locationName,
      lat,
      lng,
    });
    const payloadB64 = btoa(payload);

    // Build envelope
    const session = generateUUID();
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

    // Compute digest and sign
    const digest = buildEnvelopeDigest(envelopeData);
    const signature = signEnvelope(digest, sender.privateKey);

    const envelope = {
      version: ENVELOPE_VERSION,
      ...envelopeData,
      signature,
    };

    console.log("Submitting envelope to Agentverse hosting...");

    // Fetch Wikipedia image in parallel
    const imagePromise = fetchWikipediaImage(locationName);

    // Submit to Agentverse hosting endpoint (for hosted agents)
    const submitRes = await fetch("https://agentverse.ai/v1/hosting/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelope),
    });

    const submitText = await submitRes.text();
    console.log("Submit response:", submitRes.status, submitText);

    if (!submitRes.ok) {
      console.error("Hosting submit failed:", submitRes.status, submitText);
      throw new Error(`Agentverse hosting submit error: ${submitRes.status}`);
    }

    // Poll the sender's mailbox for the response from the agent
    let responseContent: string | null = null;
    const maxAttempts = 15;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      try {
        const mailboxRes = await fetch(
          `https://agentverse.ai/v2/agents/${sender.address}/mailbox`,
          {
            headers: {
              Authorization: `Bearer ${AGENTVERSE_API_KEY}`,
            },
          }
        );

        if (mailboxRes.ok) {
          const mailboxData = await mailboxRes.json();
          console.log(`Mailbox poll ${attempt + 1}:`, JSON.stringify(mailboxData).slice(0, 200));

          // Look for response messages
          const messages = Array.isArray(mailboxData) ? mailboxData : mailboxData?.items || [];
          for (const msg of messages) {
            if (
              msg.schema_digest === LOCATION_RESPONSE_DIGEST ||
              msg.sender === AGENT_ADDRESS
            ) {
              // Decode payload
              try {
                const decoded = atob(msg.payload || "");
                const parsed = JSON.parse(decoded);
                responseContent = parsed.content || parsed.text || null;
                console.log("Got response from agent!");
                break;
              } catch (e) {
                console.error("Failed to decode response payload:", e);
              }
            }
          }

          if (responseContent) break;
        } else {
          const errText = await mailboxRes.text();
          console.log(`Mailbox poll ${attempt + 1} failed:`, mailboxRes.status, errText);
        }
      } catch (pollErr) {
        console.error(`Mailbox poll ${attempt + 1} error:`, pollErr);
      }
    }

    const imageUrl = await imagePromise;

    if (responseContent) {
      return new Response(
        JSON.stringify({ content: responseContent, imageUrl, source: "fetchai" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: if agent didn't respond, use Lovable AI
    console.log("Agent did not respond in time, falling back to Lovable AI...");
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
