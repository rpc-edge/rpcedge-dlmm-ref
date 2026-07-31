<p align="center">
  <img src="docs/brand/rpcedge-chevron-accent-512.png" alt="rpc edge" width="72" />
</p>

<h1 align="center">rpcedge-dlmm-ref</h1>

<p align="center">
  <strong>Paper DLMM pool-watch reference for <a href="https://rpcedge.com">rpc edge</a></strong><br />
  Prove a key · <code>accountSubscribe</code> a Meteora Lb pool · log state writes · never rebalance
</p>

<p align="center">
  <a href="https://github.com/rpc-edge/rpcedge-dlmm-ref/actions/workflows/ci.yml"><img src="https://github.com/rpc-edge/rpcedge-dlmm-ref/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/rpc-edge/rpcedge-dlmm-ref/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" /></a>
  <a href="https://rpcedge.com/for/dlmm-bots"><img src="https://img.shields.io/badge/workload-dlmm--bots-111?labelColor=08090A" alt="dlmm" /></a>
  <a href="https://rpcedge.com/toolkit"><img src="https://img.shields.io/badge/docs-toolkit-C5F23F?labelColor=08090A" alt="toolkit" /></a>
</p>

<p align="center">
  <em>Not a strategy. Not financial advice. Default mode never submits transactions.</em>
</p>

---

## 60-second start

```bash
git clone https://github.com/rpc-edge/rpcedge-dlmm-ref.git
cd rpcedge-dlmm-ref
pnpm install
cp .env.example .env
# edit .env → RPCEDGE_KEY=… from https://app.rpcedge.com/signup
# optional: WATCH_POOL=<your Meteora DLMM pool pubkey>

pnpm doctor
pnpm start
```

| Link | URL |
|---|---|
| Get a key | https://app.rpcedge.com/signup |
| DLMM workload guide | https://rpcedge.com/for/dlmm-bots |
| Toolkit | https://rpcedge.com/toolkit |
| Meteora DLMM SDK | https://github.com/MeteoraAg/dlmm-sdk |
| Paper copy-watch twin | https://github.com/rpc-edge/rpcedge-copy-ref |

---

## What it does

| Step | Behavior |
|---|---|
| **Header** | Compact CLI banner (mode, auth, demo/custom pool) |
| **Doctor** | Proves `RPCEDGE_KEY` against rpc edge (`rpcedge-sdk`) |
| **Snapshot** | `getAccountInfo` on `WATCH_POOL` - owner should be the DLMM program |
| **Watch** | `accountSubscribe` on the pool (+ optional `WATCH_ACCOUNTS`) |
| **Logs** | `logsSubscribe` for txs that mention the pool |
| **Paper** | Pretty / JSON log only - no rebalance, swap, or submit |

Production DLMM bots add the official Meteora SDK for instruction build, bin-array filters, simulation, size caps, and kill-switches. This repo is the **activation reference**: real key, real account stream, honest paper path.

**Program (mainnet):** `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`

---

## Env

| Variable | Default | Notes |
|---|---|---|
| `RPCEDGE_KEY` | required for production path | https://app.rpcedge.com/signup |
| `WATCH_POOL` | demo Lb pair | Your Meteora DLMM pool account |
| `WATCH_ACCOUNTS` | empty | Comma-separated bin arrays / positions / token accounts |
| `MODE` | `paper` | `live` alone still paper-safe |
| `LIVE_SUBMIT` | `0` | Must be `1` **and** MODE=live for non-paper branch (still no auto-trade) |
| `HEARTBEAT_MS` | `30000` | Edge `getSlot` probe; `0` = off |
| `LOG_JSON` | off | `1` for machine-readable events |

---

## Example output

```text
────────────────────────────────────────────────────────
  ›››  rpc edge · dlmm-ref  v0.1.0
  run     paper  ·  key ok  ·  demo pool 5rCf…HAS6  ·  MIT · NFA
  site    rpcedge.com/for/dlmm-bots  ·  app.rpcedge.com/signup
────────────────────────────────────────────────────────

[1/2] doctor
  result   OK  ·  rpc.rpcedge.com  ·  key env:RPCEDGE_KEY
  health   ok  slot …, getSlot … ms, solana-core …
  next     doctor green → watch pool

[2/2] watch
  pool     5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6
  note     demo Lb pair · NFA · set WATCH_POOL for your pool
  acct     owner dlmm program  ·  data … B
  live     accountSubscribe  ·  logsSubscribe
  ready    listening  ·  paper only  ·  Ctrl+C stop
  paper    seed snapshot  ·  no submit
           5rCf1D…YHAS6  … lamports  … B
```

---

## Develop

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm start
```

---

## Safety

- Paper by default  
- No private keys; no Meteora instruction building in this ref  
- NFA - DLMM liquidity management can lose money  
- Demo pool is for stream density / owner-check demos only  

---

## License

MIT - see [LICENSE](./LICENSE).
