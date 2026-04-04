

# Integrating Fetch.ai into CultureMap

## What is Fetch.ai?

Fetch.ai is a decentralized AI agent platform. The most practical ways to integrate it into CultureMap are:

1. **uAgents** — autonomous AI agents that can research locations, gather data, and respond to queries
2. **ASI-1 LLM** — Fetch.ai's own large language model (alternative to the current Gemini model)
3. **Agentverse** — a discovery platform where your agents can be found and used by others

## Recommended Integration: Location Research Agent

Deploy a Fetch.ai uAgent that handles cultural research for CultureMap. When a user clicks a location, instead of (or in addition to) the current Gemini call, a Fetch.ai agent gathers and returns cultural info.

---

## Setup on Fetch.ai's Side

### Step 1: Create a Fetch.ai Account
1. Go to **agentverse.ai** and sign up
2. Navigate to **API Keys** and generate an **Agentverse API key**
3. Optionally sign up at **asi1.ai** for ASI-1 LLM access and get an **ASI API key**

### Step 2: Create & Deploy a uAgent
You have two options:
- **Hosted agent** on Agentverse (no server needed — Agentverse runs it for you)
- **Local/external agent** deployed on Render, Railway, or any server, registered with Agentverse via mailbox

For simplicity, a **hosted agent on Agentverse** is recommended.

### Step 3: Get the Agent Address
Once deployed, the agent gets a unique address like `agent1q...`. This is used to send it messages from your app.

---

## Integration on CultureMap's Side

### Step 4: Store API Keys as Secrets
- `AGENTVERSE_API_KEY` — for communicating with Agentverse
- `ASI_API_KEY` (optional) — if using ASI-1 LLM instead of Gemini

### Step 5: Create/Update Edge Function
Create a new edge function `supabase/functions/fetchai-agent/index.ts` (or modify the existing `location-culture` function) that:
1. Receives location data from the frontend
2. Sends a query to the Fetch.ai agent via the Agentverse REST API or uAgent Client
3. Returns the agent's response to the frontend

### Step 6: Frontend Changes
Update `src/pages/Index.tsx` to call the new edge function endpoint, or add a toggle/option to choose between the current AI source and the Fetch.ai agent.

---

## Architecture

```text
User clicks map
      │
      ▼
  Frontend (Index.tsx)
      │
      ▼
  Edge Function (location-culture or fetchai-agent)
      │
      ├──► Fetch.ai Agentverse API ──► uAgent (research agent)
      │         │
      │         ▼
      │    ASI-1 LLM / external APIs
      │
      ├──► Wikipedia (image)
      │
      ▼
  Response returned to frontend
```

---

## Key Decision Needed

Before implementing, I need to know which direction you want:

- **Option A**: Replace the current Gemini AI call with Fetch.ai's ASI-1 LLM — simplest swap, just changes the model provider
- **Option B**: Deploy a full uAgent on Agentverse that does the research — more complex but leverages the agent framework properly
- **Option C**: Both — use a uAgent that internally calls ASI-1 and also does additional autonomous research

## What I'll Do

1. Walk you through Agentverse account setup step by step
2. Write the uAgent code for you to deploy on Agentverse
3. Store API keys as secrets in your project
4. Create/update the edge function to communicate with your agent
5. Update the frontend if needed

