#!/usr/bin/env node
/**
 * rpcedge-dlmm-ref - Meteora DLMM paper-watch reference for rpc edge.
 *
 * 1) doctor (prove key)
 * 2) accountSubscribe WATCH_POOL (+ optional accounts)
 * 3) paper-log only - no rebalance / swap / submit
 */
import { loadEnvFile } from "./load-env.js";
loadEnvFile();

import { loadConfig, DEFAULT_WATCH_POOL, DLMM_PROGRAM_ID } from "./config.js";
import { runDoctor } from "./doctor-check.js";
import { watchPool, statsSnapshot } from "./watch.js";
import {
  printBanner,
  printStep,
  printWarn,
  printSessionSummary,
} from "./ui.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const isDemo = cfg.watchPool === DEFAULT_WATCH_POOL;

  printBanner({
    mode: cfg.mode,
    hasKey: cfg.hasKey,
    watchPool: cfg.watchPool,
    usingDefaultPool: isDemo,
  });

  if (!cfg.hasKey) {
    if (cfg.mode !== "paper") {
      console.error(
        [
          "",
          "RPCEDGE_KEY is required for non-paper runs.",
          "  1. Sign up: https://app.rpcedge.com/signup",
          "  2. export RPCEDGE_KEY=your-uuid-key",
          "  3. pnpm doctor && pnpm start",
          "",
        ].join("\n"),
      );
      process.exit(1);
    }
    printWarn("RPCEDGE_KEY unset - paper demo may use public RPC only");
  }

  printStep(1, 2, "doctor");
  const edge = await runDoctor();
  console.log("");

  printStep(2, 2, "watch");
  const connection = await edge.connection({ commitment: "confirmed" });

  const ac = new AbortController();
  const stop = () => ac.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  const stats = await watchPool(connection, cfg, {
    signal: ac.signal,
    ui: {
      isDemo,
      note: isDemo
        ? `demo Lb pair · owner should be ${DLMM_PROGRAM_ID.slice(0, 8)}… · NFA · set WATCH_POOL for your pool`
        : "custom WATCH_POOL · paper only · no rebalance/swap",
      explorerUrl: `https://solscan.io/account/${cfg.watchPool}`,
    },
  });
  printSessionSummary(statsSnapshot(stats));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
