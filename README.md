# Build Your Solace Agent Mesh

An interactive, full-stack demo that lets prospects explore how Solace Agent Mesh can orchestrate their enterprise systems. Enter a company name, discover its core platforms via Perplexity AI, and watch agents emerge that weave those systems together with rich prompts and business cases.

https://github.com/raphaelsap/build-your-sam

## Features

- **Enterprise discovery** – `/api/solutions` queries the Perplexity API to surface the top platforms used by a company, complete with logos for rapid recognition.
- **Agent ideation** – `/api/agent` blends Perplexity research with an LLM (OpenAI by default) to draft agent names, business value blurbs, and ready-to-use prompts.
- **Immersive graph** – React + D3 render solutions as a circular mesh with animated Solace-flavoured threads and draggable interactions powered by Framer Motion.
- **On-demand agents** – Drag across 2–3 solutions to spawn new agent cards positioned where their data flows intersect, with collapsible prompts for sales demos.
- **Production ready** – Express backend serves both APIs and the static client. A Cloud Foundry `manifest.yml` is included for SAP BTP deployment.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, D3.js, Framer Motion
- **Backend:** Node.js (18+), Express, Axios
- **AI Providers:** Perplexity API for research, OpenAI API (configurable) for polished agent copy

## Getting Started

### 1. Prerequisites

- Node.js 18 or newer
- npm 9+
- Perplexity API key
- OpenAI API key (or adjust code to point at another compatible LLM provider)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your keys:

```
PERPLEXITY_API_KEY=your_perplexity_key
OPENAI_API_KEY=your_openai_key
# Optional overrides
PERPLEXITY_MODEL=pplx-70b-online
OPENAI_MODEL=gpt-4o-mini
PORT=3001
```

### 4. Run locally

- **Interactive dev mode:**
  ```bash
  npm run dev
  ```
  This launches the Express API on port `3001` (with nodemon) and the Vite dev server on `5173`, proxied to the backend.

- **Production build preview:**
  ```bash
  npm run build
  npm start
  ```
  `prestart` automatically rebuilds the frontend so the Express server can serve `dist/`.

## Key Endpoints

- `GET /api/solutions?company=NAME`
  - Returns up to 10 `{ name, logoUrl }` objects derived from Perplexity.
- `POST /api/agent`
  - Body: `{ "solutions": ["SAP", "Salesforce"] }`
  - Responds with `{ agentName, description, draftPrompt, context, solutions }` by combining Perplexity insights with OpenAI copywriting.

## Deploying to SAP BTP Cloud Foundry

1. Ensure you are logged into your target org/space:
   ```bash
   cf login
   ```
2. Push the app using the provided manifest:
   ```bash
   cf push
   ```
   The Node.js buildpack runs `npm install`, triggers the Vite build via `prestart`, and starts the Express server.
3. Retrieve the generated route from the deployment output (`random-route: true`).

### Environment Variables in Cloud Foundry

Use `cf set-env` or a `vars.yml` file to set the same variables defined in `.env.example` before restarting:

```bash
cf set-env build-your-solace-agent-mesh PERPLEXITY_API_KEY your_value
cf set-env build-your-solace-agent-mesh OPENAI_API_KEY your_value
cf restage build-your-solace-agent-mesh
```

## Project Structure

```
.
├── package.json
├── manifest.yml
├── server/
│   ├── index.js
│   ├── config.js
│   ├── clients/
│   ├── services/
│   └── utils/
├── src/
│   ├── components/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   └── favicon.svg
└── .env.example
```

## Notes & Next Steps

- The default agent-generation flow falls back to Perplexity if an OpenAI key is not supplied; customise `server/services/agentService.js` for other providers.
- Tailor the prompts inside `solutionService` and `agentService` to match your industry verticals or preferred tone.
- For production, consider persisting cached Perplexity/OpenAI responses to reduce latency and API spend.

Enjoy weaving Solace Agent Mesh stories!
