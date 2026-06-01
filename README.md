# Argos — x402-Native On-Chain Intelligence Agent

> **AI-powered analysis for Arc Testnet wallets, tokens, and contracts. Pay-per-query via x402 micropayments — no subscription needed.**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?logo=vercel)](https://argos-olive-theta.vercel.app)
[![Arc Testnet](https://img.shields.io/badge/Arc-Testnet-6366f1)](https://explorer.arc-testnet.usdc.com)
[![Circle](https://img.shields.io/badge/Powered%20by-Circle-00D09C)](https://console.circle.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Demo

**Live URL:** [https://argos-olive-theta.vercel.app](https://argos-olive-theta.vercel.app)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                           │
│  (Dashboard UI — Next.js 15 + Tailwind CSS v4)          │
└─────────────────────┬───────────────────────────────────┘
                      │ x402 HTTP 402 Payment Protocol
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Serverless)                    │
│                                                          │
│  POST /api/analyze   ──→  requireX402Payment()           │
│    ├── 402 (unpaid)  ──→  PAYMENT-REQUIRED header        │
│    └── 201 (paid)    ──→  createJobOnChain()             │
│                           ↓ runAnalysis() background      │
│                                                          │
│  GET  /api/jobs      ──→  List 10 latest jobs            │
│  GET  /api/jobs/:id  ──→  Job detail + result            │
│  GET  /api/agent/stats  →  Earnings, spending, count     │
└─────────────────────┬───────────────────────────────────┘
                      │ SQL (service_role)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase (Postgres)                    │
│  ┌──────────────┐   ┌──────────────┐                    │
│  │    jobs      │   │ agent_state  │                    │
│  ├──────────────┤   ├──────────────┤                    │
│  │ id UUID      │   │ total_earned │                    │
│  │ query TEXT   │   │ total_spent  │                    │
│  │ query_type   │   │ job_count    │                    │
│  │ target       │   │ arc_agent_id │                    │
│  │ status       │   └──────────────┘                    │
│  │ result JSONB │                                         │
│  │ payment_in   │     Poll: status=QUEUED                  │
│  │ arc_tx_hash  │     ▲ every 5s                          │
│  └──────────────┘     │                                   │
└───────────────────────┼───────────────────────────────────┘
                        │ tsx agent/worker.ts
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    VPS Worker                             │
│                                                          │
│  STEP 1  collectData()    →  Arc RPC + CoinGecko + ETH   │
│  STEP 2  reasonAboutData() →  Groq AI (Llama 3.1 8B)     │
│  STEP 3  validateResult()  →  Schema + confidence check   │
│  STEP 4  storeResultHash() →  settleJob() on Arc         │
│                                                          │
│  Circle SDK used:                                         │
│    ├── Developer-Controlled Wallets (tx signing)          │
│    ├── Gateway / x402 (payment)                           │
│    └── BatchFacilitator (settlement)                      │
└─────────────────────┬───────────────────────────────────┘
                      │ keccak256 result hash
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Arc Testnet (Chain 5042002)                  │
│                                                          │
│  ArgosJobManager: 0xe19b55...42bac                       │
│    ├── createJob(bytes32 jobId, uint256 fee)             │
│    ├── settleJob(bytes32 jobId, bytes32 resultHash)      │
│    └── failJob(bytes32 jobId, string reason)             │
│                                                          │
│  Owner:     0x6fa0422642...069e3                         │
│  Validator: 0xfef84f14fa...8886e                         │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 + TypeScript |
| **Styling** | Tailwind CSS v4 (dark theme) |
| **AI** | Groq SDK (llama-3.1-8b-instant) |
| **Blockchain** | Arc Testnet via viem |
| **Wallets** | Circle Developer-Controlled Wallets SDK |
| **Payments** | Circle Gateway + x402 batching |
| **Database** | Supabase (PostgreSQL) |
| **Deploy** | Vercel (frontend + API) + VPS (worker) |

## Circle Resources Used

- **[Developer-Controlled Wallets](https://developers.circle.com/developer-controlled-wallets)** — Create and manage agent wallets (owner + validator), sign and broadcast contract transactions.
- **[Gateway](https://developers.circle.com/gateway)** — Gasless USDC payments via Gateway balance. Users deposit USDC once, then pay for queries without per-transaction gas fees.
- **[x402 Batching](https://www.npmjs.com/package/@circle-fin/x402-batching)** — HTTP 402 Payment Required protocol implementation. Server generates payment requirements; client signs EIP-3009 TransferWithAuthorization.
- **[Smart Contract Platform](https://developers.circle.com/smart-contract-platform)** — Deploy and manage the ArgosJobManager contract on Arc Testnet.
- **[Arc Testnet](https://docs.arc.io)** — L2 blockchain with USDC as native gas token. Chain ID 5042002, RPC at `https://rpc.testnet.arc.network`.

## Setup

### Prerequisites

- Node.js 20+
- A Circle account with API key (https://console.circle.com)
- A Supabase project
- A Groq API key (https://console.groq.com)
- Arc Testnet USDC for gas (faucet: https://faucet.arc-testnet.usdc.com)

### Environment Variables

Copy `.env.example` to `.env.local` and fill all values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `CIRCLE_API_KEY` | Circle API key (format: `TEST_API_KEY:...`) |
| `ENTITY_SECRET` | 32-byte hex secret for wallet encryption |
| `CIRCLE_WALLET_SET_ID` | Wallet set UUID |
| `CIRCLE_OWNER_WALLET_ID` | Owner wallet UUID |
| `CIRCLE_VALIDATOR_WALLET_ID` | Validator wallet UUID |
| `ARC_RPC_URL` | Arc Testnet RPC URL |
| `ARGOS_CONTRACT_ADDRESS` | Deployed ArgosJobManager address |
| `PRICE_PER_ANALYSIS` | Price in USDC (default: 0.50) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GROQ_API_KEY` | Groq AI API key |

### Install & Run

```bash
npm install
npm run dev        # Start dev server at localhost:3000
```

### Run Background Worker

```bash
bash agent/worker.sh    # Polls for QUEUED jobs every 5s
```

### Apply Database Migrations

Run the SQL in `supabase/migrations/001_initial_schema.sql` via Supabase SQL Editor.

### Deploy to Vercel

```bash
vercel --prod
vercel env add CIRCLE_API_KEY production  # repeat for all env vars
vercel --prod                              # redeploy with env vars
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Submit analysis (x402 payment required) |
| `GET` | `/api/jobs` | List 10 latest jobs (`?status=` filter) |
| `GET` | `/api/jobs/[id]` | Get job detail + result |
| `GET` | `/api/agent/stats` | Get agent treasury stats |

## Contract

**ArgosJobManager** deployed on Arc Testnet:

```
Address:  0xe19b55f5f8da0af5ecdbf351ba3e672698242bac
Explorer: https://explorer.arc-testnet.usdc.com/address/0xe19b55f5f8da0af5ecdbf351ba3e672698242bac
```

### Job Lifecycle

```
QUEUED → PROCESSING → VALIDATING → COMPLETED
                                       ↓ (on failure)
                                     FAILED
```

- `createJob(jobId, fee)` — Called by Owner Wallet when a paid query is submitted
- `settleJob(jobId, resultHash)` — Called by Validator Wallet after AI analysis + validation
- `failJob(jobId, reason)` — Called by Validator Wallet on validation failure or pipeline error

## License

MIT
