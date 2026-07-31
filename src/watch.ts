/**
 * DLMM paper watcher.
 *
 * Primary: accountSubscribe on WATCH_POOL (+ optional WATCH_ACCOUNTS).
 * Secondary: logsSubscribe for mentions of the pool (dense activity signal).
 * Paper only - no rebalance / swap construction.
 */
import type { AccountInfo, Connection, Context, Logs } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import type { AppConfig } from "./config.js";
import { DLMM_PROGRAM_ID } from "./config.js";
import {
  logPaper,
  logStatus,
  printErr,
  printWarn,
  printWatchPanel,
} from "./ui.js";
import {
  createStats,
  statsSnapshot,
  type SessionStats,
} from "./stats.js";

const MAX_WS_RETRIES = 5;

export type WatchUiMeta = {
  isDemo: boolean;
  note?: string;
  explorerUrl?: string;
};

export async function watchPool(
  connection: Connection,
  cfg: AppConfig,
  opts: { signal?: AbortSignal; ui?: WatchUiMeta } = {},
): Promise<SessionStats> {
  const stats = createStats();
  const ui = opts.ui ?? { isDemo: false };
  const poolPk = new PublicKey(cfg.watchPool);
  const programPk = new PublicKey(cfg.dlmmProgram);
  const extra = cfg.watchAccounts.map((a) => new PublicKey(a));

  // Snapshot + owner check
  let dataLen: number | null = null;
  let poolOwnerOk = false;
  let seedLamports: number | null = null;
  try {
    const info = await connection.getAccountInfo(poolPk, "confirmed");
    if (!info) {
      throw new Error(
        `WATCH_POOL ${cfg.watchPool} has no account on this cluster - pick a live Meteora DLMM pool`,
      );
    }
    dataLen = info.data.length;
    seedLamports = info.lamports;
    poolOwnerOk = info.owner.equals(programPk);
    if (!poolOwnerOk) {
      printWarn(
        `pool owner is ${info.owner.toBase58()} - expected DLMM program ${DLMM_PROGRAM_ID}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("WATCH_POOL")) throw e;
    printWarn(
      `pool snapshot failed: ${e instanceof Error ? e.message : e}`,
    );
  }

  const accountSubIds: number[] = [];
  let logsSubId = -1;
  let wsRetries = 0;

  const onAccount = (
    address: string,
    accountInfo: AccountInfo<Buffer>,
    context: Context,
    source: "seed" | "account",
  ) => {
    if (opts.signal?.aborted) return;
    if (source === "account") {
      stats.accountUpdates += 1;
      stats.paper.account += 1;
    } else {
      stats.paper.seed += 1;
    }
    logPaper({
      at: new Date().toISOString(),
      source,
      address,
      slot: context.slot,
      lamports: accountInfo.lamports,
      dataLen: accountInfo.data.length,
      note:
        source === "seed"
          ? "initial pool snapshot - paper only"
          : "pool/account write - paper only; no rebalance",
    });
  };

  const attachAccount = (pk: PublicKey): number => {
    return connection.onAccountChange(
      pk,
      (accountInfo, context) => {
        onAccount(pk.toBase58(), accountInfo, context, "account");
      },
      "confirmed",
    );
  };

  const attachLogs = (): number => {
    return connection.onLogs(
      poolPk,
      (logs: Logs, ctx) => {
        if (opts.signal?.aborted) return;
        stats.paper.logs += 1;
        logPaper({
          at: new Date().toISOString(),
          source: "logs",
          address: cfg.watchPool,
          slot: ctx.slot,
          signature: logs.signature,
          note: logs.err
            ? "tx mentioned pool but failed on-chain - paper only"
            : "tx mentioned pool - paper only",
        });
      },
      "confirmed",
    );
  };

  let accountSubOk = false;
  let logsSubOk = false;

  try {
    accountSubIds.push(attachAccount(poolPk));
    for (const pk of extra) {
      accountSubIds.push(attachAccount(pk));
    }
    accountSubOk = true;
  } catch (e) {
    printWarn(
      `accountSubscribe failed: ${e instanceof Error ? e.message : e}`,
    );
  }

  try {
    logsSubId = attachLogs();
    logsSubOk = true;
  } catch (e) {
    printWarn(
      `logsSubscribe failed: ${e instanceof Error ? e.message : e}`,
    );
  }

  printWatchPanel({
    watchPool: cfg.watchPool,
    extraAccounts: extra.length,
    isDemo: ui.isDemo,
    note: ui.note,
    explorerUrl: ui.explorerUrl,
    mode: cfg.mode,
    heartbeatMs: cfg.heartbeatMs,
    accountSubOk,
    logsSubOk,
    poolOwnerOk,
    dataLen,
  });

  // Seed paper event from snapshot
  if (dataLen != null) {
    stats.paper.seed += 1;
    logPaper({
      at: new Date().toISOString(),
      source: "seed",
      address: cfg.watchPool,
      slot: null,
      lamports: seedLamports,
      dataLen,
      note: "initial pool snapshot - paper only",
    });
  }

  const resubscribe = async (reason: string) => {
    if (opts.signal?.aborted) return;
    if (wsRetries >= MAX_WS_RETRIES) {
      printWarn(`ws re-attach capped at ${MAX_WS_RETRIES}`);
      return;
    }
    wsRetries += 1;
    stats.wsResubscribes += 1;
    logStatus("retry", `re-attach ${wsRetries}/${MAX_WS_RETRIES}  ·  ${reason}`, {
      attempt: wsRetries,
      reason,
    });
    try {
      for (const id of accountSubIds.splice(0)) {
        try {
          await connection.removeAccountChangeListener(id);
        } catch {
          /* ignore */
        }
      }
      if (logsSubId >= 0) {
        try {
          await connection.removeOnLogsListener(logsSubId);
        } catch {
          /* ignore */
        }
        logsSubId = -1;
      }
      accountSubIds.push(attachAccount(poolPk));
      for (const pk of extra) accountSubIds.push(attachAccount(pk));
      logsSubId = attachLogs();
      logStatus("watch_listening", "subscriptions re-attached");
    } catch (e) {
      printErr(e instanceof Error ? e.message : String(e));
    }
  };

  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  if (cfg.heartbeatMs > 0) {
    heartbeatTimer = setInterval(() => {
      void (async () => {
        if (opts.signal?.aborted) return;
        try {
          await connection.getSlot("processed");
        } catch (e) {
          printWarn(
            `edge heartbeat failed - ${e instanceof Error ? e.message : e}`,
          );
          await resubscribe("edge heartbeat failed");
        }
      })();
    }, cfg.heartbeatMs);
  }

  if (!accountSubOk && !logsSubOk) {
    printErr("no live subscriptions - cannot watch");
  }

  try {
    await waitUntilAbort(opts.signal);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    for (const id of accountSubIds) {
      try {
        await connection.removeAccountChangeListener(id);
      } catch {
        /* ignore */
      }
    }
    if (logsSubId >= 0) {
      try {
        await connection.removeOnLogsListener(logsSubId);
      } catch {
        /* ignore */
      }
    }
  }

  return stats;
}

function waitUntilAbort(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    if (!signal) return;
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

export { statsSnapshot };
