# Group Goki — AI Model Battle Royale

<p align="center">
  <strong>Let the models compete. Let the best one win.</strong>
</p>

<p align="center">
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/TypeScript-5.7+-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/Node-%E2%89%A520-green?style=for-the-badge&logo=node.js&logoColor=white" alt="Node"></a>
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/pnpm-monorepo-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="Apache 2.0 License"></a>
</p>

**Group Goki** is an AI group chat platform where LLM models don't role-play — they **compete**. Every user message triggers a Battle Royale: multiple models answer in parallel, a judge evaluates each response, and the best model wins that round. Over time, a live leaderboard tracks which models actually perform best per task category.

Think of it as a tournament arena for LLMs — a survival-of-the-fittest group chat where every model must prove its worth to stay in the conversation.

## How it works

```
User sends a message
        |
        v
+-------------------+
|   Task Analyzer    |  Classifies: coding / reasoning / creative / factual / ...
+-------------------+
        |
        v
+-------------------+
|  Parallel Runner   |  Sends the task to N models simultaneously via OpenRouter
+-------------------+
        |
        v
+-------------------+
|   Judge Engine     |  A dedicated judge model scores each response (accuracy,
|                    |  depth, clarity, relevance) and picks the winner
+-------------------+
        |
        v
+-------------------+
|   Leaderboard      |  Updates per-category rankings, win rates, trends
+-------------------+
        |
        v
+-------------------+
|   Turn Manager     |  Winner responds first, follow-ups from specialists,
|                    |  challengers get a chance to prove themselves
+-------------------+
        |
        v
   Group Chat UI
```

## Quick start

Runtime: **Node >= 20**, **pnpm >= 9**.

```bash
git clone https://github.com/raucvr/Group-Goki.git
cd Group-Goki

pnpm install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Set your OpenRouter API key (required):

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Security Setup

**Generate a JWT Secret** (required for authentication):

```bash
# Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the generated secret to your `.env` file:

```env
JWT_SECRET=your_generated_secret_here
```

**⚠️ IMPORTANT:** Never commit your `.env` file or use the default JWT_SECRET value in production. This would allow attackers to bypass authentication and forge valid tokens.

Build and run:

```bash
pnpm build

# Terminal 1: Gateway server (port 3100)
pnpm dev:gateway

# Terminal 2: Web UI (port 3000)
pnpm dev:web
```

Open `http://localhost:3000` in your browser.

## Project structure

```
group-goki/
├── packages/
│   ├── shared/     Zod schemas, types, constants (zero dependencies)
│   ├── core/       Model router, Battle Royale engine, database, budget tracking
│   ├── chat/       Conversation manager, turn logic, memory, discussion orchestrator
│   ├── gateway/    Hono REST API + WebSocket server
│   └── web/        Next.js 14 dark-themed UI with real-time updates
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

### `@group-goki/shared`

Zero-dependency type foundation. Zod schemas for runtime validation, shared across all packages.

- **Types**: `Message`, `Conversation`, `ModelConfig`, `TaskAnalysis`, `EvaluationResult`, `WsEvent`
- **Constants**: Model categories, evaluation criteria, default configs

### `@group-goki/core`

The engine. Handles everything from model routing to battle evaluation.

- **Model Router** — OpenRouter adapter with streaming support, parallel execution, timeout/retry logic
- **Model Registry** — Tracks available models, capabilities, pricing from OpenRouter's 100+ model catalog
- **Task Analyzer** — Classifies user messages by task type (coding, reasoning, creative, factual, math, translation) to select the right competitors
- **Battle Royale Engine** — Parallel runner + judge engine + leaderboard in a single orchestrated pipeline
- **Judge Engine** — Dedicated model evaluates responses on accuracy, depth, clarity, relevance (1-10 each)
- **Model Leaderboard** — Per-category rankings with Elo-style trends, win rates, and challenger slots for untested models
- **Cost Tracker** — Per-model spend tracking with configurable monthly budget limits
- **Database** — Drizzle ORM + SQLite with 8 tables (conversations, messages, evaluations, model stats, costs, ...)

### `@group-goki/chat`

Group chat intelligence layer.

- **Conversation Manager** — Immutable conversation state with message history and context windowing
- **Mention Parser** — `@claude` / `@gpt` mention syntax for directing questions to specific models
- **Turn Manager** — Priority-based turn decisions: mentioned > battle winner > specialist > follow-up > challenger
- **Discussion Orchestrator** — Full discussion flow: parse mentions -> run Battle Royale -> emit events -> manage turns -> build consensus
- **Memory System** — 3-layer hierarchical memory (Category > Item > Resource) with keyword search, importance/recency boosting
- **Memory Integrator** — Auto-learns from conversations and evaluation results
- **Model Agent** — Data-driven agent representation built from real leaderboard performance (no role-playing)

### `@group-goki/gateway`

HTTP + WebSocket server, the glue between core logic and the web UI.

- **REST API** (Hono) — `/api/conversations`, `/api/models`, `/api/health`
- **WebSocket** — Real-time events: `model_response`, `battle_progress`, `evaluation_result`, `error`
- **CORS** — Configured for local development (localhost:3000, 3001)

### `@group-goki/web`

Next.js 14 dark-themed UI.

- **Chat Panel** — Model-colored message bubbles (orange=Claude, green=GPT, blue=Gemini, purple=DeepSeek)
- **Battle Progress** — Animated phase indicator (analyzing -> competing -> judging -> discussing -> complete)
- **Leaderboard Panel** — Live evaluation results with ranked scores, criteria breakdown, winner badge
- **Conversation Sidebar** — Multi-conversation support with create/archive
- **State Management** — Zustand store with WebSocket event integration
- **Auto-reconnect WebSocket** — Seamless reconnection with status indicator

## Models

Group Goki connects to **100+ LLM models** through [OpenRouter](https://openrouter.ai), including:

| Provider | Models |
|----------|--------|
| Anthropic | Claude Opus 4.5, Claude Sonnet 4, Claude Haiku |
| OpenAI | GPT-4o, GPT-4 Turbo, o1, o3 |
| Google | Gemini 2.5 Pro, Gemini 2.5 Flash |
| Meta | Llama 3.3 70B, Llama 3.1 405B |
| DeepSeek | DeepSeek V3, DeepSeek R1 |
| Mistral | Mistral Large, Mixtral 8x22B |
| ... | And many more via OpenRouter |

Direct API keys for Anthropic, OpenAI, and Google are supported as fallbacks.

## Configuration

### Environment variables

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional: Direct provider keys (fallback)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# Database
DATABASE_URL=sqlite://./data/group-goki.db

# Server
GATEWAY_PORT=3100
WEB_PORT=3000

# Battle Royale
JUDGE_MODEL_ID=anthropic/claude-sonnet-4
MAX_PARALLEL_MODELS=5
MAX_MONTHLY_BUDGET_USD=100

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Battle Royale tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `JUDGE_MODEL_ID` | `anthropic/claude-sonnet-4` | Model used to evaluate responses |
| `MAX_PARALLEL_MODELS` | `5` | Max models competing per round |
| `MAX_MONTHLY_BUDGET_USD` | `100` | Monthly spend cap across all models |

## Development

```bash
# Build all packages (shared -> core -> chat -> gateway -> web)
pnpm build

# Dev mode with hot reload (all packages in parallel)
pnpm dev

# Gateway only
pnpm dev:gateway

# Web UI only
pnpm dev:web

# Type checking
pnpm typecheck

# Tests
pnpm test
pnpm test:coverage

# Clean build artifacts
pnpm clean
```

### Build order

Packages must build in dependency order:

```
shared (no deps)
   |
   v
  core (depends on shared)
   |
   v
  chat (depends on shared + core)
   |
   v
gateway (depends on shared + core + chat)

web (depends on shared, independent of gateway at build time)
```

`pnpm build` handles this automatically via workspace topology.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.7+ (strict, ESM) |
| Monorepo | pnpm workspaces |
| Build | tsup (ESM + DTS) |
| Validation | Zod |
| Database | Drizzle ORM + better-sqlite3 |
| HTTP Server | Hono + @hono/node-server |
| WebSocket | ws |
| Web Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS |
| State | Zustand |
| LLM Gateway | OpenRouter API |
| Logging | pino |
| Testing | Vitest |

## Architecture principles

- **Immutability** — All state managers return new instances on mutation. No side-effect data changes.
- **Factory functions** — No classes with `new`. Every module exports `createXxx()` factory functions that return interfaces.
- **Zod at the boundary** — Runtime validation for all external input (API requests, WebSocket messages, env vars).
- **Small files** — High cohesion, low coupling. Most files under 400 lines.
- **Zero role-playing** — Models are not assigned personas. Agent profiles are built entirely from real performance data on the leaderboard.

## API reference

### REST endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/conversations` | List conversations |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations/:id` | Get conversation |
| `GET` | `/api/conversations/:id/messages` | Get messages |
| `POST` | `/api/conversations/:id/archive` | Archive conversation |
| `GET` | `/api/models` | List all models |
| `GET` | `/api/models/active` | List active models |
| `GET` | `/api/models/leaderboard` | Get leaderboard |
| `GET` | `/api/models/:modelId/profile` | Get model profile |

### WebSocket events

Connect to `ws://localhost:3100/ws`.

**Client -> Server:**

```json
{ "type": "subscribe", "conversationId": "abc123" }
{ "type": "unsubscribe", "conversationId": "abc123" }
{ "type": "send_message", "conversationId": "abc123", "content": "Explain quicksort" }
```

**Server -> Client:**

```json
{ "type": "model_response", "message": { ... } }
{ "type": "battle_progress", "phase": "competing", "candidates": ["claude-sonnet-4", "gpt-4o"] }
{ "type": "evaluation_result", "evaluations": [ ... ], "consensus": "..." }
{ "type": "error", "message": "..." }
```

## License

Apache License 2.0
