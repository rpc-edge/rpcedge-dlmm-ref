export type SessionStats = {
  startedAt: number;
  paper: { account: number; logs: number; seed: number };
  accountUpdates: number;
  wsResubscribes: number;
};

export function createStats(): SessionStats {
  return {
    startedAt: Date.now(),
    paper: { account: 0, logs: 0, seed: 0 },
    accountUpdates: 0,
    wsResubscribes: 0,
  };
}

export function totalPaper(stats: SessionStats): number {
  return stats.paper.account + stats.paper.logs + stats.paper.seed;
}

export function statsSnapshot(stats: SessionStats): Record<string, unknown> {
  const elapsedSec = Math.max(0, Math.round((Date.now() - stats.startedAt) / 1000));
  return {
    elapsedSec,
    paper: { ...stats.paper, total: totalPaper(stats) },
    accountUpdates: stats.accountUpdates,
    wsResubscribes: stats.wsResubscribes,
  };
}
