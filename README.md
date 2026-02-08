# Group Goki — Your Executive Advisory Team

<p align="center">
  <strong>Your MBB consulting team + FAANG tech team: Helping you build your 1-person unicorn.</strong>
</p>

<p align="center">
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/TypeScript-5.7+-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/Node-%E2%89%A520-green?style=for-the-badge&logo=node.js&logoColor=white" alt="Node"></a>
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/pnpm-monorepo-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="Apache 2.0 License"></a>
</p>

**Group Goki** is an AI advisory platform where specialized agents—your **gokis**—collaborate autonomously to help solo entrepreneurs build Fortune 500 companies. Think McKinsey strategists + Google engineers in a single room, debating and iterating on your challenges while you spectate, steer, and ultimately decide.

You're not managing a tournament. You're running a boardroom.

## Philosophy: Strategy is the vector

> **Direction matters more than speed.** If your strategy is wrong, every hour of execution compounds the error. Group Goki is **strategy-first**: your gokis ensure the foundation is sound before the technical work begins.

## How it works

```
User: "Build a B2B SaaS go-to-market strategy for developer tools"
        |
        v
+-------------------------+
|   Strategy Advisors      |  MBB-style business planning, market positioning, pricing
+-------------------------+
        |
        v
+-------------------------+
|   Tech Leads             |  FAANG-level architecture, scalability, infrastructure
+-------------------------+
        |
        v
+-------------------------+
|   Product Experts        |  Feature prioritization, user experience, roadmap
+-------------------------+
        |
        v
+-------------------------+
|   Execution Managers     |  Resource allocation, timeline planning, dependency mapping
+-------------------------+
        |
        v
   Autonomous Discussion
   (You spectate, steer, or let them work)
        |
        v
   Refined Recommendations
```

Each **goki** is a specialized AI advisor optimized for a specific domain (strategy, tech, product, execution). They debate amongst themselves, refine ideas through iteration, and present you with battle-tested recommendations.

You act as **HR/CPO**: hire (add) or fire (remove) gokis as your needs evolve. Strategy advisor too conservative? Bring in a risk-taker. Tech lead over-engineering? Swap for a pragmatist.

## Key features

- **Strategy-First Philosophy** — Direction before speed. Get the vector right, then execute with confidence.
- **Autonomous Collaboration** — Gokis discuss and iterate without constant prompting. You spectate their debates or jump in to steer.
- **Domain Specialization** — Each goki optimized for specific expertise: strategy, architecture, product, execution.
- **Self-Upgrading** — Gokis monitor the AI landscape and autonomously propose upgrades when superior models emerge.
- **HR Control** — You're the Chief People Officer. Hire, fire, and rotate specialists as your company's needs change.
- **Model Agnostic** — Uses 100+ LLMs via OpenRouter. Best-in-class models per domain, continuously evolving.

## Example scenarios

**Strategy**: "Map out our B2B SaaS pricing and packaging strategy for enterprise vs. SMB"

**Architecture**: "Design a scalable infrastructure to handle 100M daily active users on $50K/mo AWS budget"

**Product**: "Evaluate whether we should build a freemium tier or stay strictly paid-only"

**Market Analysis**: "Analyze competitive positioning against Stripe, Plaid, and Adyen in fintech payments"

**Execution**: "Create a 6-month roadmap to hit $1M ARR before Series A"

## Target: The solo unicorn founder

Group Goki is built for the **1-person unicorn** builder. You don't have a board of advisors. You don't have a CTO, CMO, or VP of Product. You have **gokis**.

This is your force multiplier: world-class strategic thinking + FAANG-level technical execution, in a package that scales from idea to IPO without hiring a single employee.

## Model selection: Autonomous Battle Royale

When establishing domain expertise (or when a powerful new model emerges), your gokis can autonomously run a **Battle Royale**:

1. Multiple models compete on representative tasks
2. Judge evaluates accuracy, depth, strategic thinking, execution clarity
3. Winner becomes the domain specialist
4. Gokis monitor the AI landscape and propose re-evaluation when better models arrive

You don't manage this process—**your gokis do**. They have full permissions to track new model releases, discuss upgrade paths, and recommend changes to the team composition.

After initial selection, the focus shifts to **collaboration over competition**. Proven specialists stay in their roles until demonstrably better options emerge.

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

**⚠️ IMPORTANT:** Never commit your `.env` file or use the default JWT_SECRET value in production.

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
│   ├── chat/       Conversation manager, goki orchestration, memory, discussion flow
│   ├── gateway/    Hono REST API + WebSocket server
│   └── web/        Next.js 14 dark-themed UI with real-time goki debates
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

### `@group-goki/shared`

Zero-dependency type foundation. Zod schemas for runtime validation, shared across all packages.

- **Types**: `Message`, `Conversation`, `ModelConfig`, `TaskAnalysis`, `EvaluationResult`, `WsEvent`
- **Constants**: Model categories, evaluation criteria, default configs

### `@group-goki/core`

The engine. Handles everything from model routing to autonomous Battle Royale evaluation.

- **Model Router** — OpenRouter adapter with streaming support, parallel execution, timeout/retry logic
- **Model Registry** — Tracks available models, capabilities, pricing from OpenRouter's 100+ model catalog
- **Task Analyzer** — Classifies challenges by domain (strategy, tech, product, execution) to route to the right goki
- **Battle Royale Engine** — Autonomous model evaluation when establishing domain expertise or upgrading specialists
- **Judge Engine** — Dedicated model evaluates responses on accuracy, depth, clarity, strategic soundness (1-10 each)
- **Goki Leaderboard** — Per-domain rankings with performance trends, specialization tracking, upgrade signals
- **Cost Tracker** — Per-model spend tracking with configurable monthly budget limits
- **Database** — Drizzle ORM + SQLite with 8 tables (conversations, messages, evaluations, model stats, costs, ...)

### `@group-goki/chat`

Goki orchestration and autonomous discussion layer.

- **Conversation Manager** — Immutable conversation state with message history and context windowing
- **Mention Parser** — `@strategy` / `@tech` / `@product` mention syntax for directing questions to specific gokis
- **Turn Manager** — Priority-based turn decisions: mentioned > domain expert > follow-up specialist > challenger
- **Discussion Orchestrator** — Full discussion flow: parse mentions -> route to specialists -> facilitate debate -> synthesize consensus
- **Memory System** — 3-layer hierarchical memory (Category > Item > Resource) with keyword search, importance/recency boosting
- **Memory Integrator** — Auto-learns from conversations and evaluation results
- **Goki Agent** — Data-driven agent representation built from real performance metrics (no role-playing)

### `@group-goki/gateway`

HTTP + WebSocket server, the glue between core logic and the web UI.

- **REST API** (Hono) — `/api/conversations`, `/api/models`, `/api/health`
- **WebSocket** — Real-time events: `model_response`, `goki_debate`, `evaluation_result`, `upgrade_proposal`
- **Authentication** — JWT tokens with first-message WebSocket auth (no query param leakage)
- **CORS** — Environment-configurable origins for production deployments

### `@group-goki/web`

Next.js 14 dark-themed UI.

- **Goki Debate Panel** — Watch your advisors discuss strategy, architecture, product decisions in real-time
- **Spectator Mode** — Observe autonomous goki discussions without interrupting
- **Steering Controls** — Jump into the conversation to redirect, challenge assumptions, or request deeper analysis
- **HR Dashboard** — Hire, fire, and rotate goki specialists as your company evolves
- **Model Performance** — Live evaluation results with ranked scores, criteria breakdown, specialization badges
- **Conversation Sidebar** — Multi-conversation support with create/archive
- **State Management** — Zustand store with WebSocket event integration
- **Auto-reconnect WebSocket** — Seamless reconnection with status indicator

## Models

Group Goki connects to **100+ LLM models** through [OpenRouter](https://openrouter.ai), including:

| Provider | Models |
|----------|--------|
| Anthropic | Claude Opus 4.5, Claude Sonnet 4, Claude Haiku |
| OpenAI | GPT-4o, GPT-4 Turbo, o1, o3-mini |
| Google | Gemini 2.0 Flash Thinking, Gemini 2.5 Pro |
| Meta | Llama 3.3 70B, Llama 3.1 405B |
| DeepSeek | DeepSeek V3, DeepSeek R1 |
| Mistral | Mistral Large, Mixtral 8x22B |
| ... | And many more via OpenRouter |

Your gokis autonomously track new model releases and propose upgrades when superior options become available.

Direct API keys for Anthropic, OpenAI, and Google are supported as fallbacks.

## Configuration

### Environment variables

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here
JWT_SECRET=your_randomly_generated_32_char_secret_here

# CORS Configuration (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Optional: Direct provider keys (fallback)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# Database
DATABASE_URL=sqlite://./data/group-goki.db

# Server
GATEWAY_PORT=3100
WEB_PORT=3000

# Goki Team Configuration
JUDGE_MODEL_ID=anthropic/claude-sonnet-4
MAX_PARALLEL_MODELS=5
MAX_MONTHLY_BUDGET_USD=100

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Goki team tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `JUDGE_MODEL_ID` | `anthropic/claude-sonnet-4` | Model used to evaluate goki performance |
| `MAX_PARALLEL_MODELS` | `5` | Max gokis debating per discussion |
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
| Authentication | JWT (HS256, first-message auth) |
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
- **Strategy-first** — Direction before execution. Gokis ensure the vector is correct before building.
- **Autonomous agents** — Gokis self-organize, self-upgrade, and self-optimize. User provides direction, not micromanagement.

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
| `GET` | `/api/models/active` | List active goki specialists |
| `GET` | `/api/models/leaderboard` | Get performance leaderboard |
| `GET` | `/api/models/:modelId/profile` | Get goki specialist profile |

### WebSocket events

Connect to `ws://localhost:3100/ws`.

**Client -> Server:**

```json
{ "type": "auth", "token": "your-jwt-token" }
{ "type": "subscribe", "conversationId": "abc123" }
{ "type": "unsubscribe", "conversationId": "abc123" }
{ "type": "send_message", "conversationId": "abc123", "content": "Evaluate our pricing strategy" }
```

**Server -> Client:**

```json
{ "type": "authenticated", "userId": "user-123" }
{ "type": "model_response", "message": { ... } }
{ "type": "stream", "chunk": "..." }
{ "type": "battle_progress", "phase": "evaluating", "candidates": ["claude-sonnet-4", "gpt-4o"] }
{ "type": "evaluation_result", "evaluations": [ ... ], "winner": "claude-sonnet-4" }
{ "type": "error", "message": "..." }
```

## Security

- **JWT Authentication** — HS256 tokens, 32+ character secrets required
- **WebSocket Auth** — First-message authentication (no query param token leakage)
- **Non-root Containers** — Docker images run as nodejs user (UID 1001)
- **Environment-based CORS** — Configurable origins, no hardcoded localhost
- **No secrets in repo** — .env files gitignored, examples provided

Full security audit completed February 2026. See commit history for details.

## License

Apache License 2.0
