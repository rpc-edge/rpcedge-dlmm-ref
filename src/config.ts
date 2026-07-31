/**
 * Runtime config for the DLMM paper-watch reference.
 * Secrets only from env - never commit .env.
 */

/** Meteora DLMM program (mainnet). */
export const DLMM_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";

/**
 * Demo pool only - a live mainnet Lb pair owned by the DLMM program.
 * Not an endorsement of that market or any strategy. Override with WATCH_POOL.
 */
export const DEFAULT_WATCH_POOL = "5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6";

export type RunMode = "paper" | "live";

export type AppConfig = {
  watchPool: string;
  /** Optional extra accounts (bin arrays, positions, token accounts). */
  watchAccounts: string[];
  mode: RunMode;
  liveSubmit: boolean;
  hasKey: boolean;
  heartbeatMs: number;
  dlmmProgram: string;
};

const PK = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function loadConfig(): AppConfig {
  const watchPool = (process.env.WATCH_POOL?.trim() || DEFAULT_WATCH_POOL).trim();
  if (!PK.test(watchPool)) {
    throw new Error(
      `WATCH_POOL looks invalid (expected base58 pubkey). got length=${watchPool.length}`,
    );
  }

  const extraRaw = process.env.WATCH_ACCOUNTS?.trim() ?? "";
  const watchAccounts = extraRaw
    ? extraRaw
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  for (const a of watchAccounts) {
    if (!PK.test(a)) {
      throw new Error(`WATCH_ACCOUNTS entry invalid: ${a.slice(0, 12)}…`);
    }
  }

  const modeRaw = (process.env.MODE ?? "paper").trim().toLowerCase();
  const mode: RunMode = modeRaw === "live" ? "live" : "paper";
  const liveSubmit =
    process.env.LIVE_SUBMIT === "1" || process.env.LIVE_SUBMIT === "true";
  const hasKey = Boolean(process.env.RPCEDGE_KEY?.trim());
  const heartbeatMs = clampInt(process.env.HEARTBEAT_MS, 30_000, 0, 300_000);

  if (mode === "live" && !liveSubmit) {
    console.warn(
      "[config] MODE=live but LIVE_SUBMIT is not 1 - staying paper-safe (log only).",
    );
  }

  return {
    watchPool,
    watchAccounts,
    mode: mode === "live" && liveSubmit ? "live" : "paper",
    liveSubmit: mode === "live" && liveSubmit,
    hasKey,
    heartbeatMs,
    dlmmProgram: DLMM_PROGRAM_ID,
  };
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
