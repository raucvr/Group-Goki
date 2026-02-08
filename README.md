# Group Goki — Multi-Agent Discussion Platform

<p align="center">
  <strong>Multiple AI agents collaborate on complex problems. You spectate, steer, and decide.</strong>
</p>

<p align="center">
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/TypeScript-5.7+-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/Node-%E2%89%A520-green?style=for-the-badge&logo=node.js&logoColor=white" alt="Node"></a>
  <a href="https://github.com/raucvr/Group-Goki"><img src="https://img.shields.io/badge/pnpm-monorepo-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="Apache 2.0 License"></a>
</p>

---

## Philosophy

**Direction matters more than speed.** When facing complex decisions, multiple perspectives lead to better outcomes than a single voice. Group Goki creates a discussion room where specialized AI agents—your **gokis**—debate and refine ideas together.

You're not prompting a single AI. You're convening a boardroom.

## How it works

```
User: "How should we approach Series A fundraising?"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Goki Discussion Room                      │
│                                                              │
│  @strategy: "Focus on ARR and net retention metrics..."     │
│  @tech: "Our infrastructure can scale to 10x current..."    │
│  @product: "Key differentiators are X, Y, Z..."             │
│  @execution: "Timeline to hit milestones: Q1 launch..."     │
│                                                              │
│  [Discussion continues until consensus forms...]             │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
   Unified Recommendation (synthesized from all perspectives)
```

Each **goki** is a specialized AI advisor:
- **@strategy** — Business planning, market positioning, pricing
- **@tech** — Architecture, scalability, infrastructure
- **@product** — User experience, feature prioritization, roadmap
- **@execution** — Resource allocation, timeline planning, dependencies

They discuss autonomously, building on each other's insights until reaching consensus.

## Key features

- **Multi-Agent Discussion** — Gokis discuss and iterate without constant prompting
- **Spectator Mode** — Watch the debate unfold in real-time
- **Steering Controls** — Jump in to redirect, challenge, or request deeper analysis
- **Config-Driven Roster** — Assign models to roles via configuration
- **Consensus Synthesis** — Automatic detection of agreement areas
- **Model Agnostic** — Uses 100+ LLMs via OpenRouter

## Example scenarios

**Strategy**: "Map out our B2B SaaS pricing and packaging strategy for enterprise vs. SMB"

**Architecture**: "Design a scalable infrastructure to handle 100M daily active users on $50K/mo AWS budget"

**Product**: "Evaluate whether we should build a freemium tier or stay strictly paid-only"

**Market Analysis**: "Analyze competitive positioning against Stripe, Plaid, and Adyen in fintech payments"

**Execution**: "Create a 6-month roadmap to hit $1M ARR before Series A"

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

Set your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
JWT_SECRET=your_generated_32_char_secret
```

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
│   ├── core/       Model router, debate engine, roster service, database
│   ├── chat/       Conversation manager, discussion orchestrator, memory
│   ├── gateway/    Hono REST API + WebSocket server
│   └── web/        Next.js 14 dark-themed UI with real-time discussions
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

### Packages

| Package | Description |
|---------|-------------|
| `@group-goki/shared` | Zero-dependency type foundation. Zod schemas, constants. |
| `@group-goki/core` | Debate engine, roster service, consensus detection, model router. |
| `@group-goki/chat` | Discussion orchestrator, conversation manager, memory system. |
| `@group-goki/gateway` | HTTP + WebSocket server, real-time event streaming. |
| `@group-goki/web` | Next.js UI with discussion panel and steering controls. |

## Goki roster configuration

Assign models to goki roles via the roster service:

```typescript
// Example: Assign Claude Opus to strategy role
rosterService.assign('strategy', 'anthropic/claude-opus-4-5')
rosterService.assign('tech', 'anthropic/claude-sonnet-4')
rosterService.assign('product', 'openai/gpt-4o')
rosterService.assign('execution', 'google/gemini-2.0-flash')
```

## Models

Group Goki connects to **100+ LLM models** through [OpenRouter](https://openrouter.ai):

| Provider | Models |
|----------|--------|
| Anthropic | Claude Opus 4.5, Claude Sonnet 4, Claude Haiku |
| OpenAI | GPT-4o, GPT-4 Turbo, o1, o3-mini |
| Google | Gemini 2.0 Flash, Gemini 2.5 Pro |
| Meta | Llama 3.3 70B, Llama 3.1 405B |
| DeepSeek | DeepSeek V3, DeepSeek R1 |
| Mistral | Mistral Large, Mixtral 8x22B |

## Configuration

### Environment variables

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here
JWT_SECRET=your_randomly_generated_32_char_secret

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Database
DATABASE_URL=./data/group-goki.db

# Server
GATEWAY_PORT=3100
WEB_PORT=3000

# Discussion Settings
JUDGE_MODEL_ID=anthropic/claude-sonnet-4
MAX_DEBATE_ROUNDS=5
CONSENSUS_THRESHOLD=0.8
```

## API reference

### REST endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/conversations` | List conversations |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations/:id/messages` | Get messages |
| `GET` | `/api/models` | List all models |
| `GET` | `/api/models/active` | List active goki assignments |

### WebSocket events

Connect to `ws://localhost:3100/ws`.

**Client -> Server:**

```json
{ "type": "auth", "token": "your-jwt-token" }
{ "type": "subscribe", "conversationId": "abc123" }
{ "type": "send_message", "conversationId": "abc123", "content": "Evaluate our pricing strategy" }
```

**Server -> Client:**

```json
{ "type": "debate_started", "participants": [...], "maxRounds": 5 }
{ "type": "goki_response", "message": { "role": "strategy", ... } }
{ "type": "debate_round_complete", "roundNumber": 1 }
{ "type": "consensus_reached", "recommendation": "..." }
```

## Development

```bash
# Build all packages
pnpm build

# Dev mode with hot reload
pnpm dev

# Type checking
pnpm typecheck

# Tests
pnpm test
pnpm test:coverage
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.7+ (strict, ESM) |
| Monorepo | pnpm workspaces |
| Validation | Zod |
| Database | Drizzle ORM + better-sqlite3 |
| HTTP Server | Hono |
| WebSocket | ws |
| Web Framework | Next.js 14 |
| State | Zustand |
| LLM Gateway | OpenRouter API |
| Testing | Vitest |

## Architecture principles

- **Immutability** — All state managers return new instances on mutation
- **Factory functions** — No classes with `new`, every module exports `createXxx()`
- **Zod at the boundary** — Runtime validation for all external input
- **Small files** — High cohesion, low coupling
- **Collaborative focus** — Gokis discuss and debate, not compete

## License

Apache License 2.0
