/**
 * Terminal UI: professional header + pretty operator lines.
 * Set LOG_JSON=1 for machine-readable JSON events only.
 */

export const VERSION = "0.1.0";

const ACCENT = "\x1b[38;2;197;242;63m";
const DIM = "\x1b[90m";
const HI = "\x1b[97m";
const OK = "\x1b[38;2;120;220;140m";
const WARN = "\x1b[38;2;240;180;80m";
const ERR = "\x1b[38;2;240;100;100m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export function jsonMode(): boolean {
  const v = process.env.LOG_JSON?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || process.argv.includes("--json");
}

function useColor(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(process.stdout.isTTY);
}

function paint(code: string, s: string): string {
  return useColor() ? `${code}${s}${RESET}` : s;
}

export function shortAddr(pk: string, head = 4, tail = 4): string {
  if (pk.length < head + tail + 1) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}

export function shortSig(sig: string): string {
  if (sig.length < 16) return sig;
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
}

export type BannerInfo = {
  mode: string;
  hasKey: boolean;
  watchPool: string;
  usingDefaultPool: boolean;
};

export function printBanner(info: BannerInfo): void {
  if (jsonMode()) {
    emit({ type: "boot", project: "rpcedge-dlmm-ref", version: VERSION, ...info });
    return;
  }

  const rule = paint(DIM, "─".repeat(56));
  const auth = info.hasKey ? paint(OK, "key ok") : paint(WARN, "no key");
  const poolHint = info.usingDefaultPool
    ? `demo pool ${shortAddr(info.watchPool)}`
    : `pool ${shortAddr(info.watchPool)}`;

  console.log(
    [
      "",
      rule,
      `  ${paint(ACCENT, "›››")}  ${paint(BOLD + HI, "rpc edge")}${paint(DIM, " · ")}${paint(HI, "dlmm-ref")}${paint(DIM, `  v${VERSION}`)}`,
      `  ${paint(DIM, "run")}     ${info.mode}  ·  ${auth}  ·  ${paint(DIM, poolHint)}  ·  ${paint(DIM, "MIT · NFA")}`,
      `  ${paint(DIM, "site")}    ${paint(DIM, "rpcedge.com/for/dlmm-bots  ·  app.rpcedge.com/signup")}`,
      rule,
      "",
    ].join("\n"),
  );
}

export function printStep(n: number, total: number, label: string): void {
  if (jsonMode()) {
    emit({ type: "step", n, total, label });
    return;
  }
  console.log(`${paint(ACCENT, `[${n}/${total}]`)} ${paint(BOLD + HI, label)}`);
}

function row(label: string, value: string): void {
  console.log(`  ${paint(DIM, label.padEnd(8))} ${value}`);
}

export function printOk(msg: string): void {
  if (jsonMode()) {
    emit({ type: "ok", message: msg });
    return;
  }
  console.log(`  ${paint(OK, "✓")}  ${msg}`);
}

export function printInfo(msg: string): void {
  if (jsonMode()) {
    emit({ type: "info", message: msg });
    return;
  }
  console.log(`  ${paint(DIM, "·")}  ${msg}`);
}

export function printWarn(msg: string): void {
  if (jsonMode()) {
    emit({ type: "warn", message: msg });
    return;
  }
  console.warn(`  ${paint(WARN, "!")}  ${msg}`);
}

export function printErr(msg: string): void {
  if (jsonMode()) {
    emit({ type: "error", message: msg });
    return;
  }
  console.error(`  ${paint(ERR, "✗")}  ${msg}`);
}

export function printDoctorReport(report: {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
  config: {
    label: string;
    keySource: string;
    rpcUrlRedacted: string;
    grpcHost: string;
    relayBase: string;
    hasKey: boolean;
  };
}): void {
  if (jsonMode()) {
    emit({ type: "doctor", ok: report.ok, config: report.config, checks: report.checks });
    return;
  }

  const result = report.ok ? paint(OK, "OK") : paint(ERR, "FAIL");
  const keyBit = report.config.hasKey
    ? paint(OK, `key ${report.config.keySource}`)
    : paint(WARN, "key none");

  row("result", `${result}  ·  ${paint(HI, report.config.label)}  ·  ${keyBit}`);

  const health = report.checks.find(
    (c) => c.name === "rpc_health" || c.name.includes("health"),
  );
  if (health) {
    const mark = health.ok ? paint(OK, "ok") : paint(ERR, "fail");
    row("health", `${mark}  ${health.detail}`);
  }

  let relayHost = report.config.relayBase;
  try {
    relayHost = new URL(report.config.relayBase).host;
  } catch {
    /* keep */
  }
  row(
    "ends",
    paint(DIM, `grpc ${report.config.grpcHost}  ·  relay ${relayHost}`),
  );

  for (const ch of report.checks.filter((c) => !c.ok)) {
    row("fail", `${paint(ERR, ch.name)}  ${paint(DIM, ch.detail)}`);
  }

  if (report.ok) {
    row("next", paint(DIM, "doctor green → watch pool"));
  }
}

export type WatchPanelInfo = {
  watchPool: string;
  extraAccounts: number;
  isDemo: boolean;
  note?: string;
  explorerUrl?: string;
  mode: string;
  heartbeatMs: number;
  accountSubOk: boolean;
  logsSubOk: boolean;
  poolOwnerOk: boolean;
  dataLen?: number | null;
};

export function printWatchPanel(info: WatchPanelInfo): void {
  if (jsonMode()) {
    emit({ type: "watch_setup", ...info });
    return;
  }

  row("pool", paint(HI, info.watchPool));
  if (info.note) row("note", paint(DIM, info.note));
  if (info.explorerUrl) row("link", paint(DIM, info.explorerUrl));

  const owner = info.poolOwnerOk
    ? paint(OK, "owner dlmm program")
    : paint(WARN, "owner check failed");
  const len =
    info.dataLen != null ? paint(DIM, `data ${info.dataLen} B`) : paint(DIM, "no snapshot");
  row("acct", `${owner}  ·  ${len}`);

  const acc = info.accountSubOk
    ? paint(OK, "accountSubscribe")
    : paint(WARN, "accountSubscribe off");
  const logs = info.logsSubOk
    ? paint(OK, "logsSubscribe")
    : paint(WARN, "logsSubscribe off");
  row("live", `${acc}  ·  ${logs}`);

  if (info.extraAccounts > 0) {
    row("extra", paint(DIM, `${info.extraAccounts} additional account(s)`));
  }

  const opts = [
    `mode ${info.mode}`,
    info.heartbeatMs > 0 ? `hb ${Math.round(info.heartbeatMs / 1000)}s` : "hb off",
  ];
  row("opts", paint(DIM, opts.join("  ·  ")));
  row("ready", paint(OK, "listening  ·  paper only  ·  Ctrl+C stop"));
}

export type PaperEvent = {
  at: string;
  source: "seed" | "account" | "logs";
  address: string;
  slot?: number | null;
  signature?: string | null;
  lamports?: number | null;
  dataLen?: number | null;
  note?: string;
};

export function logPaper(event: PaperEvent): void {
  if (jsonMode()) {
    emit({ type: "paper", ...event });
    return;
  }

  const src =
    event.source === "seed"
      ? "seed snapshot"
      : event.source === "logs"
        ? "logs ws"
        : "account ws";

  console.log(
    `  ${paint(OK, "paper")}  ${paint(DIM, src)}  ·  ${paint(DIM, "no submit")}`,
  );
  const bits: string[] = [paint(HI, shortAddr(event.address, 6, 6))];
  if (event.slot != null) bits.push(paint(DIM, `slot ${event.slot}`));
  if (event.lamports != null) bits.push(paint(DIM, `${event.lamports} lamports`));
  if (event.dataLen != null) bits.push(paint(DIM, `${event.dataLen} B`));
  if (event.signature) bits.push(paint(HI, shortSig(event.signature)));
  console.log(`         ${bits.join("  ")}`);
  if (event.signature) {
    console.log(`         ${paint(DIM, `https://solscan.io/tx/${event.signature}`)}`);
  } else {
    console.log(
      `         ${paint(DIM, `https://solscan.io/account/${event.address}`)}`,
    );
  }
}

export function logStatus(
  kind: "retry" | "shutdown" | "stats" | "watch_listening",
  detail: string,
  extra?: Record<string, unknown>,
): void {
  if (jsonMode()) {
    emit({ type: kind, message: detail, ...extra });
    return;
  }
  const label =
    kind === "retry"
      ? "retry"
      : kind === "stats"
        ? "stats"
        : kind === "watch_listening"
          ? "live"
          : "done";
  console.log(`  ${paint(DIM, label.padEnd(6))}  ${detail}`);
}

export function printSessionSummary(snapshot: Record<string, unknown>): void {
  if (jsonMode()) {
    emit({ type: "session_summary", ...snapshot });
    return;
  }
  const paper = snapshot.paper as {
    total?: number;
    account?: number;
    logs?: number;
    seed?: number;
  };
  console.log("");
  logStatus(
    "stats",
    `session ${snapshot.elapsedSec ?? "?"}s  ·  paper ${paper?.total ?? 0}  (seed ${paper?.seed ?? 0} · acct ${paper?.account ?? 0} · logs ${paper?.logs ?? 0})`,
  );
  logStatus(
    "stats",
    `account updates ${snapshot.accountUpdates ?? 0}  ·  ws re-attach ${snapshot.wsResubscribes ?? 0}`,
  );
  logStatus("shutdown", "stopped  ·  paper only - nothing was submitted");
}

export function emit(obj: Record<string, unknown>): void {
  console.log(JSON.stringify(obj));
}
